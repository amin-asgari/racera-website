export const CDN_ORIGIN = (
  process.env.NEXT_PUBLIC_RACERA_CDN_URL || "https://cdn.racera.online"
).replace(/\/$/, "");

export const BUNDLES = {
  standings: "f1/standings.json",
  constructorStandings: "f1/constructor-standings.json",
  sessions: "f1/sessions.json",
  driverProfiles: "f1/driver-profiles.json",
  constructorProfiles: "f1/constructor-profiles.json",
  sessionResults: "f1/session-results.json",
  driverResults: "f1/driver-results.json",
  constructorResults: "f1/constructor-results.json",
  startingGrids: "f1/starting-grids.json",
} as const;

export type BundlePath = (typeof BUNDLES)[keyof typeof BUNDLES];

export interface Session {
  session_key: number;
  meeting_key: number;
  circuit_key: number;
  year: number;
  session_name: string;
  session_type: string;
  circuit_short_name: string;
  country_name: string;
  location?: string | null;
  date_start: string;
  date_end: string;
  gmt_offset?: string | null;
  is_cancelled?: boolean;
  meeting_name?: string | null;
  circuit_length?: string | null;
  race_distance?: string | null;
  laps_count?: number | null;
  pit_count?: number | null;
  first_grandprix?: number | null;
  fastest_lap?: string | null;
  circuit_path?: string | null;
  circuit_image?: string | null;
  country_flag?: string | null;
  country_banner?: string | null;
}

export interface DriverStanding {
  rank: number;
  points: number;
  driver_number?: number | null;
  first_name: string;
  last_name: string;
  name_acronym?: string | null;
  team_name: string;
  country_name?: string | null;
  background_colour?: string | null;
  primary_colour?: string | null;
  headshot_pic?: string | null;
  number_logo?: string | null;
  country_flag?: string | null;
}

export interface TeamStanding {
  rank: number;
  points: number;
  team_name: string;
  slug_name: string;
  name_acronym?: string | null;
  driver_acronyms?: string[];
  team_colour?: string | null;
  team_logo?: string | null;
  team_monochrome_logo?: string | null;
  car_pic?: string | null;
  half_car_pic?: string | null;
  background_colour?: string | null;
  primary_colour?: string | null;
  country_name?: string | null;
  country_flag?: string | null;
}

export interface SeasonStats {
  season_position: string;
  season_points: number;
  grand_prix_races: number;
  grand_prix_points: number;
  grand_prix_wins: number;
  grand_prix_podiums: number;
  grand_prix_poles: number;
  grand_prix_top_10s: number;
  dhl_fastest_laps: number;
  dnfs: number;
  sprint_races: number;
  sprint_points: number;
  sprint_wins: number;
  sprint_podiums: number;
  sprint_poles: number;
  sprint_top_10s: number;
}

export interface DriverProfile {
  profile: {
    year: number;
    driver_number: number;
    full_name: string;
    team_name: string;
    primary_colour?: string | null;
    background_colour?: string | null;
    country_name?: string | null;
    country_flag?: string | null;
    headshot_pic?: string | null;
    profile_pic?: string | null;
    number_logo?: string | null;
  };
  season_stats: SeasonStats;
  career_stats: Record<string, string | number>;
}

export interface ConstructorProfile {
  profile: {
    year: number;
    slug_name: string;
    team_name: string;
    primary_colour?: string | null;
    background_colour?: string | null;
    country_name?: string | null;
    country_flag?: string | null;
    team_logo?: string | null;
    car_pic?: string | null;
    driver_acronyms?: string[];
  };
  season_stats: SeasonStats;
  team_summary: Record<string, string | number>;
}

export interface SessionResult {
  session_key: number;
  driver_number: number;
  position?: number | null;
  number_of_laps: number;
  dnf: boolean;
  dns: boolean;
  dsq: boolean;
  duration?: number | null;
  gap_to_leader?: string | null;
  points?: number | null;
  q1_duration?: number | null;
  q1_position?: number | null;
  q1_gap_to_leader?: number | null;
  q2_duration?: number | null;
  q2_position?: number | null;
  q2_gap_to_leader?: number | null;
  q3_duration?: number | null;
  q3_position?: number | null;
  q3_gap_to_leader?: number | null;
  first_name: string;
  last_name: string;
  name_acronym: string;
  team_name: string;
  country_name?: string | null;
  background_colour?: string | null;
  primary_colour?: string | null;
  headshot_pic?: string | null;
  profile_pic?: string | null;
  number_logo?: string | null;
  country_flag?: string | null;
}

export interface RaceResult {
  session_key: number;
  year: number;
  country_name: string;
  meeting_name: string;
  session_date: string;
  meeting_key: number;
  circuit_key: number;
  session_name: string;
  country_flag?: string | null;
  driver_number?: number;
  team_name: string;
  slug_name?: string;
  position?: number | null;
  points: number;
  dnf?: boolean;
  dns?: boolean;
  dsq?: boolean;
}

export interface Weekend {
  meetingKey: number;
  circuitKey: number;
  round: number;
  sessions: Session[];
  start: Date;
  end: Date;
  nextSession: Session | null;
  status: "completed" | "cancelled" | "ongoing" | "upcoming";
  hasSprint: boolean;
  representative: Session;
}

interface ManifestFile {
  sha256: string;
  updated_at: string;
}

interface Manifest {
  schema_version: number;
  latest_year: number;
  generated_at: string;
  files: Record<BundlePath, ManifestFile>;
}

interface CachedBundle<T> {
  path: BundlePath;
  hash: string;
  storedAt: string;
  data: T;
}

const memory = new Map<BundlePath, unknown>();
let manifestPromise: Promise<Manifest> | null = null;
let dbPromise: Promise<IDBDatabase> | null = null;

function timeoutSignal(milliseconds: number) {
  if (typeof AbortSignal.timeout === "function") return AbortSignal.timeout(milliseconds);
  const controller = new AbortController();
  window.setTimeout(() => controller.abort(), milliseconds);
  return controller.signal;
}

async function fetchManifest() {
  if (!manifestPromise) {
    manifestPromise = fetch(`${CDN_ORIGIN}/manifest.json`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: timeoutSignal(8000),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Manifest returned HTTP ${response.status}.`);
        const value = (await response.json()) as Manifest;
        if (value.schema_version !== 2 || !value.files) {
          throw new Error("The CDN manifest has an unsupported shape.");
        }
        return value;
      })
      .catch((error) => {
        manifestPromise = null;
        throw error;
      });
  }
  return manifestPromise;
}

function openDatabase() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("racera-next-cache", 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains("bundles")) {
        request.result.createObjectStore("bundles", { keyPath: "path" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

async function readCache<T>(path: BundlePath) {
  try {
    const database = await openDatabase();
    return await new Promise<CachedBundle<T> | null>((resolve, reject) => {
      const request = database.transaction("bundles", "readonly").objectStore("bundles").get(path);
      request.onsuccess = () => resolve((request.result as CachedBundle<T>) || null);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
}

async function writeCache<T>(record: CachedBundle<T>) {
  try {
    const database = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction("bundles", "readwrite");
      transaction.objectStore("bundles").put(record);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch {
    // Offline caching must never prevent fresh data from rendering.
  }
}

async function sha256(text: string) {
  const bytes = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function validateShape(path: BundlePath, value: unknown) {
  const objectPaths: BundlePath[] = [
    BUNDLES.sessionResults,
    BUNDLES.driverResults,
    BUNDLES.constructorResults,
    BUNDLES.startingGrids,
  ];
  if (objectPaths.includes(path)) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error(`${path} must contain an object.`);
    }
  } else if (!Array.isArray(value)) {
    throw new Error(`${path} must contain an array.`);
  }
}

export async function loadBundle<T>(path: BundlePath, force = false): Promise<T> {
  if (!force && memory.has(path)) return memory.get(path) as T;
  const cached = await readCache<T>(path);

  try {
    const manifest = await fetchManifest();
    const descriptor = manifest.files[path];
    if (!descriptor) throw new Error(`${path} is not in the CDN manifest.`);
    if (!force && cached?.hash === descriptor.sha256) {
      memory.set(path, cached.data);
      return cached.data;
    }

    const response = await fetch(
      `${CDN_ORIGIN}/${path}?v=${encodeURIComponent(descriptor.sha256)}`,
      {
        cache: "force-cache",
        headers: { Accept: "application/json" },
        signal: timeoutSignal(12000),
      },
    );
    if (!response.ok) throw new Error(`${path} returned HTTP ${response.status}.`);
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("application/json")) {
      throw new Error(`${path} did not return JSON.`);
    }
    const raw = await response.text();
    if ((await sha256(raw)) !== descriptor.sha256) {
      throw new Error(`${path} failed integrity validation.`);
    }
    const value = JSON.parse(raw) as T;
    validateShape(path, value);
    memory.set(path, value);
    await writeCache({ path, hash: descriptor.sha256, storedAt: new Date().toISOString(), data: value });
    return value;
  } catch (error) {
    if (cached) {
      memory.set(path, cached.data);
      return cached.data;
    }
    throw error;
  }
}

export async function loadCoreData() {
  const [sessions, drivers, teams] = await Promise.all([
    loadBundle<Session[]>(BUNDLES.sessions),
    loadBundle<DriverStanding[]>(BUNDLES.standings),
    loadBundle<TeamStanding[]>(BUNDLES.constructorStandings),
  ]);
  return { sessions, drivers, teams };
}

export function buildWeekends(sessions: Session[], now = new Date()): Weekend[] {
  const latestYear = sessions.reduce((year, session) => Math.max(year, session.year), 0);
  const grouped = new Map<number, Session[]>();
  for (const session of sessions) {
    if (session.year !== latestYear) continue;
    if ((session.meeting_name || "").toLowerCase().includes("pre-season testing")) continue;
    const bucket = grouped.get(session.meeting_key) || [];
    bucket.push(session);
    grouped.set(session.meeting_key, bucket);
  }

  return Array.from(grouped.values())
    .map((items) => items.sort((a, b) => Date.parse(a.date_start) - Date.parse(b.date_start)))
    .sort((a, b) => Date.parse(a[0].date_start) - Date.parse(b[0].date_start))
    .map((items, index) => {
      const start = new Date(items[0].date_start);
      const end = new Date(items.reduce((latest, session) =>
        Date.parse(session.date_end) > Date.parse(latest.date_end) ? session : latest,
      ).date_end);
      const cancelled = items.every((session) => session.is_cancelled === true);
      const ongoing = !cancelled && start <= now && now <= end;
      const nextSession = cancelled
        ? null
        : items.find((session) => {
            const sessionStart = new Date(session.date_start);
            const sessionEnd = new Date(session.date_end);
            return (sessionStart <= now && now <= sessionEnd) || sessionStart > now;
          }) || null;
      return {
        meetingKey: items[0].meeting_key,
        circuitKey: items[0].circuit_key,
        round: index + 1,
        sessions: items,
        start,
        end,
        nextSession,
        status: cancelled ? "cancelled" : ongoing ? "ongoing" : end < now ? "completed" : "upcoming",
        hasSprint: items.some((session) => session.session_name.toLowerCase().includes("sprint")),
        representative: items.find((session) => session.session_name === "Race") || items[0],
      } as Weekend;
    });
}

export function assetUrl(value?: string | null) {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  const clean = value.replace(/^\/+/, "");
  const match = clean.match(/^([^?#]+)([?#].*)?$/);
  const pathname = match?.[1] || clean;
  const suffix = match?.[2] || "";
  const halfCarMatch = pathname.match(/^assets\/cars_image\/([^/]+_half)\.png$/i);
  if (halfCarMatch) return `/assets/half_car_images/${halfCarMatch[1]}.webp${suffix}`;
  const usesWebpAsset = /^assets\/(?:cars_image|drivers_headshot|drivers_number|drivers_profile_pic|half_car_images|track_info_images)\//i.test(pathname);
  const resolvedPath = usesWebpAsset ? pathname.replace(/\.png$/i, ".webp") : pathname;
  return `/${resolvedPath}${suffix}`;
}

export function safeHex(value?: string | null, fallback = "#ff3b30") {
  const normalized = (value || "").replace(/^#/, "");
  return /^[0-9a-f]{6}$/i.test(normalized) ? `#${normalized}` : fallback;
}

export function isMainRace(session: Session) {
  return session.session_type.trim().toLowerCase() === "race" &&
    session.session_name.trim().toLowerCase() === "race";
}

export function formatDuration(seconds?: number | null) {
  if (seconds == null) return "—";
  const milliseconds = Math.round(seconds * 1000);
  const hours = Math.floor(milliseconds / 3_600_000);
  const minutes = Math.floor((milliseconds % 3_600_000) / 60_000);
  const secs = Math.floor((milliseconds % 60_000) / 1000);
  const millis = milliseconds % 1000;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${String(millis).padStart(3, "0")}`
    : `${minutes}:${String(secs).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

export function resultStatus(result: SessionResult | RaceResult) {
  if (result.dsq) return "DSQ";
  if (result.dns) return "DNS";
  if (result.dnf) return "DNF";
  return result.position == null ? "—" : String(result.position);
}
