"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import styles from "./racera-app.module.css";
import {
  BUNDLES,
  buildWeekends,
  formatDuration,
  isMainRace,
  loadBundle,
  loadCoreData,
  resultStatus,
  safeHex,
  type ConstructorProfile,
  type DriverProfile,
  type RaceResult,
  type Session,
  type SessionResult,
  type Weekend,
} from "./lib/racera-data";
import { flushAnalytics, initializeAnalytics, track } from "./lib/analytics";
import {
  buildNotificationSchedule,
  isIos,
  isStandalone,
  registerServiceWorker,
  replacePushSchedule,
  requestPushPermission,
  type InstallPromptEvent,
} from "./lib/pwa";
import { Icon } from "./components/icons";
import { AppHeader, Asset, ErrorState, LoadingState, Modal, SettingsPanel, Toast } from "./components/shared";

type CoreData = Awaited<ReturnType<typeof loadCoreData>>;
type Tab = "home" | "calendar" | "standings" | "settings";
type VoteSeriesId = "motogp" | "wec" | "nascar" | "gt" | "wrc";

const VOTE_API_URL =
  process.env.NEXT_PUBLIC_VOTE_API_URL ||
  "https://racera-vote-api.amin-asgari-work.workers.dev/v1/votes";

const SERIES: Array<{ id: VoteSeriesId; name: string; icon: string }> = [
  { id: "motogp", name: "MotoGP", icon: "assets/icons/MotoGP.svg" },
  { id: "wec", name: "WEC", icon: "assets/icons/WEC.svg" },
  { id: "nascar", name: "NASCAR", icon: "assets/icons/nascar.svg" },
  { id: "gt", name: "GT", icon: "assets/icons/GT.svg" },
  { id: "wrc", name: "WRC", icon: "assets/icons/WRC.svg" },
];

const PRIMARY_TABS: Array<{ id: Tab; label: string; route: string; icon: string }> = [
  { id: "home", label: "Home", route: "/home", icon: "home" },
  { id: "calendar", label: "Calendar", route: "/calendar", icon: "calendar" },
  { id: "standings", label: "Standings", route: "/standings", icon: "standing" },
  { id: "settings", label: "Settings", route: "/settings", icon: "setting" },
];

function readRoute() {
  if (typeof window === "undefined") return "/home";
  const route = window.location.hash.replace(/^#/, "");
  return route.startsWith("/") ? route : "/home";
}

function navigate(path: string) {
  if (window.location.hash === `#${path}`) window.scrollTo({ top: 0, behavior: "smooth" });
  else window.location.hash = path;
}

function goBack() {
  if (window.history.length > 1) window.history.back();
  else navigate("/home");
}

function useHashRoute() {
  const [route, setRoute] = useState("/home");
  useEffect(() => {
    const update = () => setRoute(readRoute());
    if (!window.location.hash) {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#/home`);
    }
    update();
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [route]);
  return route;
}

function useNow(interval = 1_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), interval);
    return () => window.clearInterval(id);
  }, [interval]);
  return now;
}

function useAsyncBundle<T>(path: (typeof BUNDLES)[keyof typeof BUNDLES] | null) {
  const [state, setState] = useState<{ path: string | null; data: T | null; error: string | null }>({
    path: null,
    data: null,
    error: null,
  });
  useEffect(() => {
    let active = true;
    if (!path) return;
    loadBundle<T>(path)
      .then((data) => active && setState({ path, data, error: null }))
      .catch((reason: unknown) => active && setState({
        path,
        data: null,
        error: reason instanceof Error ? reason.message : "Unable to load data.",
      }));
    return () => { active = false; };
  }, [path]);
  return {
    data: path && state.path === path ? state.data : null,
    error: path && state.path === path ? state.error : null,
    loading: Boolean(path && state.path !== path),
  };
}

function useProfileEngagement(profileType: string, profileId: string | null, profileName: string, sessionsAvailable: number) {
  useEffect(() => {
    if (!profileId) return;
    let maxScrollPercent = 0;
    const update = () => {
      const extent = document.documentElement.scrollHeight - window.innerHeight;
      if (extent > 0) maxScrollPercent = Math.max(maxScrollPercent, Math.min(100, (window.scrollY / extent) * 100));
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      window.removeEventListener("scroll", update);
      track("Profile Engagement Summary", {
        profile_type: profileType,
        profile_id: profileId,
        profile_name: profileName,
        max_scroll_percent: Number(maxScrollPercent.toFixed(1)),
        sessions_available_count: sessionsAvailable,
      });
    };
  }, [profileId, profileName, profileType, sessionsAvailable]);
}

function pageTitle(route: string) {
  if (route === "/home") return "Home";
  if (route === "/calendar") return "Calendar";
  if (route === "/standings") return "Standings";
  if (route === "/settings") return "Settings";
  return "Racera";
}

function tabForRoute(route: string): Tab {
  if (route === "/calendar") return "calendar";
  if (route === "/standings") return "standings";
  if (route === "/settings") return "settings";
  return "home";
}

function isShellRoute(route: string) {
  return PRIMARY_TABS.some((item) => item.route === route);
}

export function RaceraApp() {
  const route = useHashRoute();
  const [core, setCore] = useState<CoreData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [installOpen, setInstallOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [navVisible, setNavVisible] = useState(true);
  const sectionStart = useRef<number | null>(null);
  const previousRoute = useRef(route);

  useEffect(() => {
    sectionStart.current = Date.now();
    const standalone = isStandalone();
    initializeAnalytics(standalone);
    if (!['localhost', '127.0.0.1'].includes(window.location.hostname)) {
      registerServiceWorker().catch(() => undefined);
    }
    if (new URLSearchParams(window.location.search).get("install") === "1" && !standalone) {
      queueMicrotask(() => setInstallOpen(true));
    }
    const capture = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", capture);
    return () => window.removeEventListener("beforeinstallprompt", capture);
  }, []);

  useEffect(() => {
    let active = true;
    loadCoreData()
      .then((data) => active && setCore(data))
      .catch((reason: unknown) => active && setError(reason instanceof Error ? reason.message : "Could not load race data."));
    return () => { active = false; };
  }, [reloadKey]);

  useEffect(() => {
    const elapsedSeconds = sectionStart.current === null ? 0 : Math.round((Date.now() - sectionStart.current) / 1000);
    if (previousRoute.current !== route && elapsedSeconds > 0) {
      track("Section Time Spent", { section: pageTitle(previousRoute.current).toLowerCase(), duration_seconds: elapsedSeconds });
    }
    previousRoute.current = route;
    sectionStart.current = Date.now();
    document.title = `${pageTitle(route)} — Racera`;
    queueMicrotask(() => setNavVisible(true));
    if (route.startsWith("/settings/") && route !== "/settings") {
      track("Settings Section Opened", { section: route.replace("/settings/", ""), source: "settings" });
    }
  }, [route]);

  useEffect(() => {
    if (!isShellRoute(route)) return;
    let previousY = window.scrollY;
    const onScroll = () => {
      const currentY = window.scrollY;
      if (currentY > previousY + 8 && currentY > 60) setNavVisible(false);
      else if (currentY < previousY - 8) setNavVisible(true);
      previousY = currentY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [route]);

  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState !== "hidden") return;
      track("Section Time Spent", {
        section: pageTitle(previousRoute.current).toLowerCase(),
        duration_seconds: sectionStart.current === null ? 0 : Math.round((Date.now() - sectionStart.current) / 1000),
      });
      flushAnalytics();
    };
    document.addEventListener("visibilitychange", onHidden);
    return () => document.removeEventListener("visibilitychange", onHidden);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(id);
  }, [toast]);

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    track("Web App Install Result", { result: choice.outcome });
    setInstallPrompt(null);
    setInstallOpen(false);
  };

  if (!core) {
    return (
      <div className={styles.appRoot}>
        {error
          ? <ErrorState message={error} retry={() => { setError(null); setReloadKey((value) => value + 1); }} />
          : <SplashScreen />}
      </div>
    );
  }

  const shell = isShellRoute(route);
  const tab = tabForRoute(route);
  return (
    <div className={`${styles.appRoot} ${shell ? styles.shellActive : styles.detailActive}`}>
      <a className={styles.skipLink} href="#racera-main">Skip to content</a>
      {shell && <DesktopNavigation active={tab} />}
      <main id="racera-main" className={styles.appMain}>
        <RouteView route={route} core={core} showToast={setToast} openInstall={() => setInstallOpen(true)} />
      </main>
      {shell && <BottomNavigation active={tab} visible={navVisible} />}
      {installOpen && (
        <InstallModal hasPrompt={Boolean(installPrompt)} onInstall={handleInstall} onClose={() => setInstallOpen(false)} />
      )}
      {toast && <Toast message={toast} />}
    </div>
  );
}

function RouteView({ route, core, showToast, openInstall }: {
  route: string;
  core: CoreData;
  showToast: (message: string) => void;
  openInstall: () => void;
}) {
  if (route === "/home") return <Home core={core} />;
  if (route === "/calendar") return <Calendar core={core} />;
  if (route === "/standings") return <Standings core={core} />;
  if (route === "/settings") return <Settings />;
  if (route.startsWith("/driver/")) return <DriverDetail number={Number(route.split("/")[2])} core={core} />;
  if (route.startsWith("/constructor/")) return <ConstructorDetail slug={decodeURIComponent(route.split("/")[2] || "")} core={core} />;
  if (route.startsWith("/circuit/")) return <CircuitDetail keyValue={Number(route.split("/")[2])} core={core} />;
  if (route === "/settings/racing-series") return <RacingSeries />;
  if (route === "/settings/racing-series/vote") return <VotePage showToast={showToast} />;
  if (route === "/settings/notifications") return <Notifications sessions={core.sessions} showToast={showToast} openInstall={openInstall} />;
  if (route === "/settings/theme") return <ThemePage />;
  if (route === "/settings/language") return <LanguagePage />;
  if (route === "/settings/help-feedback") return <HelpFeedback />;
  if (route === "/settings/about") return <About />;
  return <NotFound />;
}

function DesktopNavigation({ active }: { active: Tab }) {
  return (
    <aside className={styles.desktopNav} aria-label="Primary navigation">
      <Asset src="assets/icons/racera.svg" alt="Racera" className={styles.desktopLogo} eager />
      <nav>
        {PRIMARY_TABS.map((item) => {
          const selected = active === item.id;
          return (
            <button key={item.id} type="button" className={selected ? styles.desktopNavActive : ""} onClick={() => navigate(item.route)} aria-current={selected ? "page" : undefined}>
              <Asset src={`assets/icons/${item.icon}_${selected ? "fill" : "outline"}.svg`} alt="" />
              <span>{item.label}</span>
              {selected && <i />}
            </button>
          );
        })}
      </nav>
      <small>v1.0.0&nbsp; • &nbsp;WEB APP</small>
    </aside>
  );
}

function BottomNavigation({ active, visible }: { active: Tab; visible: boolean }) {
  return (
    <nav className={`${styles.bottomNav} ${visible ? "" : styles.bottomNavHidden}`} aria-label="Primary navigation">
      {PRIMARY_TABS.map((item) => {
        const selected = active === item.id;
        return (
          <button key={item.id} type="button" className={selected ? styles.navActive : ""} onClick={() => navigate(item.route)} aria-label={item.label} aria-current={selected ? "page" : undefined}>
            <span><Asset src={`assets/icons/${item.icon}_${selected ? "fill" : "outline"}.svg`} alt="" /></span>
            {selected && <small>{item.label}</small>}
          </button>
        );
      })}
    </nav>
  );
}

function SeriesFilterButton() {
  const [open, setOpen] = useState(false);
  return (
    <span className={styles.seriesFilter}>
      <button type="button" className={styles.headerIconButton} aria-label="Filter racing series" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <Asset src="assets/icons/filter.svg" alt="" />
      </button>
      {open && <button type="button" className={styles.seriesFilterMenu} role="menuitemradio" aria-checked="true" onClick={() => setOpen(false)}><Icon name="check" /><strong>F1</strong></button>}
    </span>
  );
}

function SplashScreen() {
  return (
    <div className={styles.splashScreen} role="status" aria-label="Loading Racera">
      <Asset src="assets/icons/icon_foreground.png" alt="Racera" className={styles.splashLogo} eager />
    </div>
  );
}

function Home({ core }: { core: CoreData }) {
  const now = useNow();
  const resultsState = useAsyncBundle<Record<string, SessionResult[]>>(BUNDLES.sessionResults);
  const statusSession = useMemo(() => {
    const eligible = core.sessions.filter((session) => !session.is_cancelled && !(session.meeting_name || "").toLowerCase().includes("testing"));
    const ongoing = eligible
      .filter((session) => Date.parse(session.date_start) <= now.getTime() && now.getTime() < Date.parse(session.date_end))
      .sort((a, b) => Date.parse(b.date_start) - Date.parse(a.date_start))[0];
    return ongoing
      || eligible.filter((session) => Date.parse(session.date_start) > now.getTime()).sort((a, b) => Date.parse(a.date_start) - Date.parse(b.date_start))[0]
      || null;
  }, [core.sessions, now]);
  const completed = useMemo(() => core.sessions
    .filter((session) => !session.is_cancelled && Date.parse(session.date_end) <= now.getTime())
    .sort((a, b) => Date.parse(b.date_start) - Date.parse(a.date_start)), [core.sessions, now]);
  const teamLogos = useMemo(() => Object.fromEntries(core.teams.map((team) => [team.team_name, team.team_logo])), [core.teams]);

  return (
    <>
      <AppHeader
        title={<Asset src="assets/icons/racera.svg" alt="Racera" className={styles.headerLogo} eager />}
        action={<button className={styles.headerIconButton} type="button" onClick={() => navigate("/settings/help-feedback")} aria-label="Tickets"><Asset src="assets/icons/ticket.svg" alt="" /></button>}
      />
      <div className={styles.homeFeed}>
        {statusSession && <HomeStatusCard session={statusSession} now={now} />}
        {resultsState.loading && <LoadingState label="Loading session results" />}
        {!resultsState.loading && completed.map((session) => {
          const results = resultsState.data?.[String(session.session_key)] || [];
          return (
            <div key={session.session_key} className={styles.feedGroup}>
              {isMainRace(session) && results.length > 0 && <WinnerPost session={session} results={results} />}
              {results.length > 0 && <SessionResultPost session={session} results={results} teamLogos={teamLogos} />}
            </div>
          );
        })}
      </div>
    </>
  );
}

function HomeStatusCard({ session, now }: { session: Session; now: Date }) {
  const ongoing = Date.parse(session.date_start) <= now.getTime() && now.getTime() < Date.parse(session.date_end);
  const remaining = countdownParts(new Date(session.date_start), now);
  return (
    <section className={styles.homeStatusCard} aria-label={`${ongoing ? "The Session is Ongoing" : "Upcoming Session"}: ${session.meeting_name || session.country_name}`}>
      <Asset src={session.country_banner} alt="" className={styles.statusCountryBackdrop} eager />
      <div className={styles.statusPattern} />
      <div className={styles.statusGradient} />
      {ongoing ? (
        <div className={styles.ongoingStatus}><h2>The Session is Ongoing:</h2><strong>{(session.meeting_name || session.country_name).toUpperCase()}</strong></div>
      ) : (
        <div className={styles.upcomingStatus}><h2>Upcoming Session:</h2><strong>{(session.meeting_name || session.country_name).toUpperCase()}</strong><CountdownRow parts={remaining} /></div>
      )}
    </section>
  );
}

function CountdownRow({ parts, compact = false }: { parts: ReturnType<typeof countdownParts>; compact?: boolean }) {
  const units: Array<[string, number]> = [["D", parts.days], ["H", parts.hours], ["M", parts.minutes], ["S", parts.seconds]];
  return <div className={`${styles.countdownRow} ${compact ? styles.countdownCompact : ""}`}>{units.map(([label, value]) => <span key={label}><i>{label}</i><b>{String(value).padStart(2, "0")}</b></span>)}</div>;
}

function HomeFeedPost({ session, title, children }: { session: Session; title: string; children: ReactNode }) {
  return (
    <article className={styles.homePost}>
      <h2>{title}</h2>
      <div className={styles.postCircuit}><Asset src={session.country_flag} alt="" /><strong>{session.circuit_short_name || session.country_name}</strong></div>
      <time>{formatPostDate(session.date_start)}</time>
      <hr />
      {children}
    </article>
  );
}

function WinnerPost({ session, results }: { session: Session; results: SessionResult[] }) {
  const podium = [1, 2, 3].map((position) => results.find((result) => result.position === position)).filter(Boolean) as SessionResult[];
  return (
    <HomeFeedPost session={session} title={`${session.session_name.toUpperCase()} WINNER`}>
      <div className={styles.winnerBanner}>
        <div className={styles.winnerPattern} />
        <strong className={styles.winnerWord}>WINNER</strong>
        {podium.map((result) => <div key={result.driver_number} className={`${styles.podiumDriver} ${styles[`podium${result.position}` as keyof typeof styles]}`}><Asset src={result.profile_pic || result.headshot_pic} alt="" /><p><b style={{ color: safeHex(result.primary_colour) }}>{result.position}<sup>{ordinalSuffix(result.position || 0)}</sup></b><span style={{ backgroundColor: safeHex(result.primary_colour) }}>{result.last_name.toUpperCase()}</span></p></div>)}
        <div className={styles.winnerFade} />
      </div>
    </HomeFeedPost>
  );
}

function SessionResultPost({ session, results, teamLogos }: { session: Session; results: SessionResult[]; teamLogos: Record<string, string | null | undefined> }) {
  return (
    <HomeFeedPost session={session} title={`${session.session_name.toUpperCase()} RESULT`}>
      <ResultTable session={session} results={results} teamLogos={teamLogos} />
    </HomeFeedPost>
  );
}

function ResultTable({ session, results, teamLogos }: { session: Session; results: SessionResult[]; teamLogos: Record<string, string | null | undefined> }) {
  const showPoints = ["race", "sprint"].includes(session.session_type.toLowerCase());
  return (
    <div className={styles.resultTable}>
      <div className={styles.resultTableHeader}><span>POS.</span><span>DRIVER</span><span>TIME</span>{showPoints && <span>POINTS</span>}</div>
      {results.slice().sort((a, b) => (a.position ?? 99) - (b.position ?? 99)).map((result) => (
        <button type="button" key={result.driver_number} className={showPoints ? styles.withPoints : ""} onClick={() => navigate(`/driver/${result.driver_number}`)}>
          <span>{resultStatus(result)}</span>
          <span><i><Asset src={teamLogos[result.team_name]} alt="" /></i>{result.name_acronym}</span>
          <span>{result.dsq ? "DSQ" : result.dnf ? "DNF" : result.dns ? "DNS" : result.position === 1 ? formatDuration(result.duration) : result.gap_to_leader || "—"}</span>
          {showPoints && <span>{result.points == null ? "—" : Math.round(result.points)}</span>}
        </button>
      ))}
    </div>
  );
}

function Calendar({ core }: { core: CoreData }) {
  const [localTime, setLocalTime] = useState(false);
  useEffect(() => {
    queueMicrotask(() => setLocalTime(localStorage.getItem("racera.localTime") === "1"));
  }, []);
  const now = useNow();
  const weekends = useMemo(() => buildWeekends(core.sessions, now), [core.sessions, now]);
  const featuredIndex = weekends.findIndex((weekend) => weekend.status === "upcoming" || weekend.status === "ongoing");
  useEffect(() => {
    if (featuredIndex < 0) return;
    // Flutter's CalendarPage keeps round order intact and only moves the
    // initial viewport to the current/next weekend. Reproduce that behavior
    // without reordering the data used by the cards.
    const itemTop = featuredIndex * 105 + 10;
    const id = window.setTimeout(() => {
      // Keep the card just below the 75px sticky app header, matching the
      // Flutter scroll view's content viewport rather than hiding its title.
      window.scrollTo({ top: Math.max(0, itemTop - 75), behavior: "auto" });
    }, 40);
    return () => window.clearTimeout(id);
  }, [featuredIndex]);
  const changeTime = (value: boolean) => {
    setLocalTime(value);
    localStorage.setItem("racera.localTime", value ? "1" : "0");
  };
  return (
    <>
      <AppHeader title={localTime ? "Local Time" : "Host Time"} action={<div className={styles.headerControls}><button type="button" className={`${styles.toggle} ${localTime ? styles.toggleOn : ""}`} onClick={() => changeTime(!localTime)} aria-label="Use local time" aria-pressed={localTime}><i /></button><SeriesFilterButton /></div>} />
      <div className={styles.calendarList}>
        {weekends.map((weekend, index) => <CircuitCard key={weekend.meetingKey} weekend={weekend} localTime={localTime} featured={index === featuredIndex} now={now} />)}
      </div>
    </>
  );
}

function CircuitCard({ weekend, localTime, featured, now }: { weekend: Weekend; localTime: boolean; featured: boolean; now: Date }) {
  const session = weekend.representative;
  const next = weekend.nextSession;
  const remaining = countdownParts(next ? new Date(next.date_start) : now, now);
  const disabled = weekend.status === "completed" || weekend.status === "cancelled";
  return (
    <button type="button" className={`${styles.circuitCard} ${featured ? styles.circuitCardFeatured : ""} ${disabled ? styles.cardDesaturated : ""}`} onClick={() => navigate(`/circuit/${weekend.circuitKey}`)}>
      <span className={styles.cardPattern} />
      <span className={styles.cardGradient} />
      <Asset src={session.circuit_path} alt="" className={styles.calendarTrack} />
      <span className={styles.roundPanel}><small>RND</small><b>{weekend.round}</b></span>
      <span className={styles.circuitIdentity}><span className={styles.circuitTitleRow}><strong>{session.circuit_short_name}</strong>{weekend.hasSprint && <span className={styles.sprintBadge}>SPRINT</span>}</span><small>Formula 1</small></span>
      <time className={styles.dateBadge}>{formatWeekendRange(weekend, localTime)}</time>
      {featured && next && <span className={styles.nextSessionBlock}><small>Next Session:</small><strong>{next.session_name.toUpperCase()}</strong><time>{formatTimeRange(next, localTime)}</time></span>}
      {featured && next && <CountdownRow parts={remaining} compact />}
      <span className={styles.countryRow}><Asset src={session.country_flag} alt="" /><i /><strong>{session.country_name}</strong></span>
      <span className={styles.cardStatus}>{capitalize(weekend.status)}<i /></span>
    </button>
  );
}

function Standings({ core }: { core: CoreData }) {
  const [mode, setMode] = useState<"drivers" | "teams">("drivers");
  useEffect(() => {
    queueMicrotask(() => {
      if (localStorage.getItem("racera.standings.mode") === "teams") setMode("teams");
    });
  }, []);
  const switchMode = () => {
    setMode((value) => {
      const next = value === "drivers" ? "teams" : "drivers";
      localStorage.setItem("racera.standings.mode", next);
      return next;
    });
  };
  return (
    <>
      <AppHeader title={mode === "drivers" ? "F1 | Drivers" : "F1 | Teams"} action={<div className={styles.headerControls}><button type="button" className={styles.headerIconButton} onClick={switchMode} aria-label="Switch standings"><Asset src="assets/icons/switch.svg" alt="" /></button><SeriesFilterButton /></div>} />
      <div className={styles.standingsList}>
        {mode === "drivers" ? core.drivers.map((driver) => (
          <button type="button" key={driver.driver_number ?? driver.rank} className={`${styles.standingCard} ${driver.rank === 1 ? styles.firstStanding : ""}`} onClick={() => driver.driver_number && navigate(`/driver/${driver.driver_number}`)} style={{ "--card-bg": safeHex(driver.background_colour, "#0c0c0c"), "--accent": safeHex(driver.primary_colour, "#777777") } as CSSProperties}>
            <span className={styles.standingPattern} /><Asset src={driver.number_logo} alt="" className={styles.numberLogo} eager={driver.rank <= 5} /><Asset src={driver.headshot_pic} alt="" className={styles.standingHeadshot} eager={driver.rank <= 5} />
            <b className={styles.rankPanel}>{driver.rank}</b>
            <span className={styles.standingCopy}><strong><i>{driver.first_name}</i> {driver.last_name}</strong><small>{driver.team_name}</small><em><b>{Math.round(driver.points)}</b><small>Pts</small></em><span><Asset src={driver.country_flag} alt="" eager={driver.rank <= 5} /><i />{driver.country_name}</span></span>
          </button>
        )) : core.teams.map((team) => (
          <button type="button" key={team.slug_name} className={`${styles.standingCard} ${styles.teamStandingCard} ${team.rank === 1 ? styles.firstStanding : ""}`} onClick={() => navigate(`/constructor/${team.slug_name}`)} style={{ "--card-bg": safeHex(team.background_colour, "#0c0c0c"), "--accent": safeHex(team.primary_colour, "#777777") } as CSSProperties}>
            <Asset src={team.team_monochrome_logo} alt="" className={styles.monoLogo} eager={team.rank <= 5} /><span className={styles.standingPattern} /><Asset src={team.half_car_pic} alt="" className={styles.halfCar} eager={team.rank <= 5} />
            <b className={styles.rankPanel}>{team.rank}</b>
            <span className={styles.standingCopy}><strong>{team.team_name}</strong><small>{team.driver_acronyms?.join(" | ")}</small><em><b>{Math.round(team.points)}</b><small>Pts</small></em><span><Asset src={team.country_flag} alt="" eager={team.rank <= 5} /><i />{team.country_name}</span></span>
          </button>
        ))}
      </div>
    </>
  );
}

function DriverDetail({ number, core }: { number: number; core: CoreData }) {
  const profile = core.driverProfiles.find((item) => item.profile.driver_number === number);
  const resultsState = useAsyncBundle<Record<string, RaceResult[]>>(profile ? BUNDLES.driverResults : null);
  if (!profile) return <NotFound />;
  return <ProfileDetail type="driver" profile={profile} results={resultsState.data?.[String(number)] || []} loading={resultsState.loading} />;
}

function ConstructorDetail({ slug, core }: { slug: string; core: CoreData }) {
  const profile = core.constructorProfiles.find((item) => item.profile.slug_name === slug);
  const resultsState = useAsyncBundle<Record<string, RaceResult[]>>(profile ? BUNDLES.constructorResults : null);
  if (!profile) return <NotFound />;
  return <ProfileDetail type="team" profile={profile} results={resultsState.data?.[slug] || []} loading={resultsState.loading} />;
}

function ProfileDetail({ type, profile, results, loading }: {
  type: "driver" | "team";
  profile: DriverProfile | ConstructorProfile;
  results: RaceResult[];
  loading: boolean;
}) {
  const isDriver = type === "driver";
  const details = profile.profile;
  const title = isDriver ? (details as DriverProfile["profile"]).full_name : (details as ConstructorProfile["profile"]).team_name;
  const stats = profile.season_stats;
  const summary = isDriver ? (profile as DriverProfile).career_stats : (profile as ConstructorProfile).team_summary;
  const id = isDriver ? String((details as DriverProfile["profile"]).driver_number) : (details as ConstructorProfile["profile"]).slug_name;
  useProfileEngagement(isDriver ? "driver" : "constructor", id, title, stats.grand_prix_races);
  return (
    <>
      <AppHeader title={isDriver ? lastName(title) : title} back={goBack} />
      <div className={styles.profilePage}>
        {isDriver ? <DriverProfileBanner profile={profile as DriverProfile} /> : <ConstructorProfileBanner profile={profile as ConstructorProfile} />}
        <div className={styles.profileCards}>
          <SeasonStatsCard stats={stats} />
          <StatsCard title="CAREER STATS" dark={false} rows={Object.entries(summary).map(([key, value]) => [careerLabel(key, isDriver), value])} />
          <RaceResultCard title={`${details.year} ${isDriver ? "DRIVER" : "TEAM"} STANDINGS`} results={results} loading={loading} showPosition={isDriver} />
        </div>
      </div>
    </>
  );
}

function DriverProfileBanner({ profile }: { profile: DriverProfile }) {
  const data = profile.profile;
  const [first, ...rest] = data.full_name.trim().split(/\s+/);
  const family = rest.join(" ") || first;
  return (
    <section className={styles.driverBanner} style={{ "--card-bg": safeHex(data.background_colour, "#0c0c0c"), "--accent": safeHex(data.primary_colour, "#777777") } as CSSProperties}>
      <Asset src={data.number_logo} alt="" className={styles.profileNumber} />
      <span className={styles.profilePattern} />
      <Asset src={data.headshot_pic} alt={data.full_name} className={styles.driverPortrait} eager />
      <Asset src="assets/backgrounds/line2.svg" alt="" className={styles.bannerLineTop} />
      <Asset src="assets/backgrounds/line1.svg" alt="" className={styles.bannerLineBottom} />
      <div className={styles.driverBannerName}><span>{first}</span><strong>{family.toUpperCase()}</strong><p><Asset src={data.country_flag} alt="" />{data.country_name}<i />{data.team_name}<i />{data.driver_number}</p></div>
    </section>
  );
}

function ConstructorProfileBanner({ profile }: { profile: ConstructorProfile }) {
  const data = profile.profile;
  return (
    <section className={styles.constructorBanner} style={{ "--card-bg": safeHex(data.background_colour, "#0c0c0c"), "--accent": safeHex(data.primary_colour, "#777777") } as CSSProperties}>
      <span className={styles.constructorPattern} />
      <Asset src={data.car_pic} alt={`${data.team_name} car`} className={styles.constructorCar} eager />
      <div className={styles.constructorNameBand}><Asset src="assets/backgrounds/line3.svg" alt="" /><strong>{data.team_name.toUpperCase()}</strong><Asset src="assets/backgrounds/line4.svg" alt="" /></div>
      <p className={styles.constructorDetails}><Asset src={data.country_flag} alt="" />{data.country_name}{data.driver_acronyms?.map((acronym) => <span key={acronym}><i />{acronym.toUpperCase()}</span>)}</p>
      <Asset src={data.team_logo} alt="" className={styles.constructorLogo} />
    </section>
  );
}

function SeasonStatsCard({ stats }: { stats: DriverProfile["season_stats"] }) {
  const pairs: Array<[string, string | number]> = [
    ["Season Position", stats.season_position], ["Season Points", stats.season_points],
    ["Grand Prix Races", stats.grand_prix_races], ["Grand Prix Points", stats.grand_prix_points],
    ["Grand Prix Wins", stats.grand_prix_wins], ["Grand Prix Podiums", stats.grand_prix_podiums],
    ["Grand Prix Poles", stats.grand_prix_poles], ["Grand Prix Top 10s", stats.grand_prix_top_10s],
    ["DHL Fastest Laps", stats.dhl_fastest_laps], ["DNFs", stats.dnfs],
    ["Sprint Races", stats.sprint_races], ["Sprint Points", stats.sprint_points],
    ["Sprint Wins", stats.sprint_wins], ["Sprint Podiums", stats.sprint_podiums],
    ["Sprint Poles", stats.sprint_poles], ["Sprint Top 10s", stats.sprint_top_10s],
  ];
  const rows = Array.from({ length: pairs.length / 2 }, (_, index) => pairs.slice(index * 2, index * 2 + 2));
  return <section className={`${styles.statsCard} ${styles.seasonStats}`}><h2>2026 SEASON</h2><div>{rows.map((row, index) => <div key={row[0][0]} className={`${styles.statRow} ${index === 1 || index === 4 ? styles.statDivider : ""}`}>{row.map(([label, value]) => <div className={styles.statItem} key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>)}</div></section>;
}

function StatsCard({ title, rows, dark = true }: { title: string; rows: Array<[string, string | number]>; dark?: boolean }) {
  return <section className={`${styles.statsCard} ${dark ? "" : styles.statsCardRaised}`}><h2>{title}</h2><div className={styles.singleStats}>{rows.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div></section>;
}

function RaceResultCard({ title, results, loading, showPosition }: { title: string; results: RaceResult[]; loading: boolean; showPosition: boolean }) {
  const races = results.filter((result) => result.session_name === "Race").sort((a, b) => Date.parse(a.session_date) - Date.parse(b.session_date));
  return (
    <section className={styles.raceResultsCard}>
      <h2>{title}</h2>
      {loading ? <LoadingState /> : <div className={styles.raceResultsTable}>
        <div className={styles.raceHeader}><span>GRAND PRIX</span>{showPosition && <span>RACE POS.</span>}<span>PTS.</span></div>
        {races.map((result) => <button type="button" key={`${result.session_key}-${result.driver_number || result.slug_name}`} onClick={() => navigate(`/circuit/${result.circuit_key}`)} className={showPosition ? "" : styles.noRacePosition}><span><Asset src={result.country_flag} alt="" />{shortMeetingName(result.meeting_name || result.country_name)}</span>{showPosition && <span>{resultStatus(result)}</span>}<span>{Math.round(result.points)}</span></button>)}
        {!races.length && <p className={styles.emptyCopy}>No race results are available yet.</p>}
      </div>}
    </section>
  );
}

function CircuitDetail({ keyValue, core }: { keyValue: number; core: CoreData }) {
  const weekend = useMemo(() => buildWeekends(core.sessions).find((item) => item.circuitKey === keyValue), [core.sessions, keyValue]);
  const resultsState = useAsyncBundle<Record<string, SessionResult[]>>(weekend ? BUNDLES.sessionResults : null);
  const [localTime, setLocalTime] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  useProfileEngagement("circuit", weekend ? String(weekend.circuitKey) : null, weekend?.representative.circuit_short_name || "Circuit", weekend?.sessions.length || 0);
  if (!weekend) return <NotFound />;
  const data = weekend.representative;
  const teamLogos = Object.fromEntries(core.teams.map((team) => [team.team_name, team.team_logo]));
  return (
    <>
      <AppHeader title={data.circuit_short_name} back={goBack} action={<button type="button" className={`${styles.toggle} ${localTime ? styles.toggleOn : ""}`} onClick={() => setLocalTime((value) => !value)} aria-label="Use local time" aria-pressed={localTime}><i /></button>} />
      <div className={styles.circuitDetail}>
        <CircuitHero weekend={weekend} localTime={localTime} />
        <CircuitStatus weekend={weekend} results={resultsState.data} />
        <section className={styles.sessionsCard}>
          <h2>SESSIONS</h2>
          {weekend.sessions.map((session) => {
            const isExpanded = expanded === session.session_key;
            const start = displayDate(session.date_start, session.gmt_offset, localTime);
            const isRaceType = session.session_type.trim().toLowerCase() === "race";
            const sessionResults = resultsState.data?.[String(session.session_key)] || [];
            const resultsId = `session-results-${session.session_key}`;
            return (
              <div className={styles.sessionRowWrap} key={session.session_key}>
                <button
                  type="button"
                  className={`${styles.sessionRow} ${isRaceType ? styles.raceSessionRow : ""}`}
                  disabled={session.is_cancelled}
                  aria-expanded={isExpanded}
                  aria-controls={resultsId}
                  onClick={() => setExpanded(isExpanded ? null : session.session_key)}
                >
                  <span><b>{String(start.getDate()).padStart(2, "0")}</b><small>{monthName(start.getMonth())}</small></span>
                  <i />
                  <span><strong>{session.session_name.toUpperCase()}</strong><small>{formatTimeRange(session, localTime)}</small></span>
                  {!session.is_cancelled && <b className={`${styles.sessionChevron} ${isExpanded ? styles.sessionChevronOpen : ""}`} aria-hidden="true" />}
                </button>
                {isExpanded && (
                  <div id={resultsId} className={styles.expandedResults}>
                    {resultsState.loading
                      ? <LoadingState />
                      : sessionResults.length
                        ? <ResultTable session={session} results={sessionResults} teamLogos={teamLogos} />
                        : <p className={styles.emptySessionResult}>Result not published yet.</p>}
                  </div>
                )}
              </div>
            );
          })}
        </section>
        <CircuitInfoCard session={data} />
      </div>
    </>
  );
}

function CircuitHero({ weekend, localTime }: { weekend: Weekend; localTime: boolean }) {
  const data = weekend.representative;
  return (
    <section className={styles.circuitHeroExact}>
      <Asset src={data.country_banner} alt="" className={styles.circuitBackdrop} eager /><span className={styles.circuitHeroGradient} />
      <span className={styles.heroFlag}><Asset src={data.country_flag} alt="" /></span>
      <strong>{(data.meeting_name || data.country_name).toUpperCase()}</strong><h1>{data.circuit_short_name}</h1>
      <div>{weekend.hasSprint && <span className={styles.heroSprint}>SPRINT</span>}<time className={styles.heroDate}>{formatWeekendRange(weekend, localTime)}</time><span className={styles.heroRound}>RND | {weekend.round}</span><span className={styles.heroSport}>Formula 1</span></div>
    </section>
  );
}

function CircuitStatus({ weekend, results }: { weekend: Weekend; results: Record<string, SessionResult[]> | null }) {
  const now = useNow();
  const allCancelled = weekend.sessions.every((session) => session.is_cancelled);
  const race = weekend.sessions.find(isMainRace);
  const completed = Boolean(race && Date.parse(race.date_end) <= now.getTime());
  if (allCancelled) return <section className={`${styles.circuitStatus} ${styles.circuitCancelled}`}><span className={styles.statusPattern} /><h2>The Session Has Been Canceled</h2></section>;
  if (completed && race) {
    const raceResults = results?.[String(race.session_key)] || [];
    return <section className={`${styles.circuitStatus} ${styles.circuitWinner}`}><WinnerPostBare results={raceResults} /></section>;
  }
  const next = weekend.sessions.find((session) => !session.is_cancelled && Date.parse(session.date_start) > now.getTime());
  return <section className={styles.circuitStatus}><span className={styles.statusPattern} /><h2>Session Starts in:</h2><CountdownRow parts={countdownParts(next ? new Date(next.date_start) : now, now)} /></section>;
}

function WinnerPostBare({ results }: { results: SessionResult[] }) {
  const podium = [1, 2, 3].map((position) => results.find((result) => result.position === position)).filter(Boolean) as SessionResult[];
  return <div className={styles.winnerBanner}><div className={styles.winnerPattern} /><strong className={styles.winnerWord}>WINNER</strong>{podium.map((result) => <div key={result.driver_number} className={`${styles.podiumDriver} ${styles[`podium${result.position}` as keyof typeof styles]}`}><Asset src={result.profile_pic || result.headshot_pic} alt="" /><p><b style={{ color: safeHex(result.primary_colour) }}>{result.position}<sup>{ordinalSuffix(result.position || 0)}</sup></b><span style={{ backgroundColor: safeHex(result.primary_colour) }}>{result.last_name.toUpperCase()}</span></p></div>)}<div className={styles.winnerFade} /></div>;
}

function CircuitInfoCard({ session }: { session: Session }) {
  const fastestLap = session.fastest_lap?.match(/^(.+?)-(\d{4})-(.+)$/);
  const fields: Array<[string, ReactNode]> = [
    ["Location", session.location || "—"], ["Country", session.country_name],
    ["Circuit Length", session.circuit_length ? `${session.circuit_length} km` : "—"], ["Race Distance", session.race_distance ? `${session.race_distance} km` : "—"],
    ["Number of Laps", session.laps_count || "—"], ["Pit Stops", session.pit_count == null ? "—" : `+${session.pit_count}`],
    ["First Grand Prix", session.first_grandprix || "—"],
    ["Fastest Lap", fastestLap ? <span className={styles.fastestLapValue}><strong>{fastestLap[3]}</strong><small>{fastestLap[1]} · {fastestLap[2]}</small></span> : session.fastest_lap || "—"],
  ];
  return <section className={styles.circuitInfoCard}><h2>CIRCUIT INFO</h2><div className={styles.circuitImageBox}><Asset src={session.circuit_image} alt={`${session.circuit_short_name} circuit`} /></div><div className={styles.circuitNameField}><span>Circuit Name</span><strong>{session.circuit_short_name}</strong></div><div className={styles.circuitFields}>{fields.map(([label, value]) => <div key={label}><span>{label}</span>{typeof value === "string" || typeof value === "number" ? <strong>{value}</strong> : value}</div>)}</div></section>;
}

function Settings() {
  return (
    <>
      <AppHeader title="SETTINGS" />
      <div className={styles.settingsPage}>
        <SettingsSection title="PREFERENCES" icon="assets/icons/preferences.svg">
          <SettingsTile title="Racing Series" onClick={() => navigate("/settings/racing-series")} />
          <SettingsTile title="Notifications" onClick={() => navigate("/settings/notifications")} />
          <SettingsTile title="Theme" onClick={() => navigate("/settings/theme")} />
        </SettingsSection>
        <SettingsSection title="SUPPORT" icon="assets/icons/help.svg"><SettingsTile title="Help & Feedback" onClick={() => navigate("/settings/help-feedback")} /></SettingsSection>
        <SettingsSection title="GENERAL" icon="assets/icons/info.svg">
          <SettingsTile title="Language" onClick={() => navigate("/settings/language")} />
          <SettingsTile title="About" onClick={() => navigate("/settings/about")} />
        </SettingsSection>
        <p className={styles.version}>v1.0.0 Web App</p>
      </div>
    </>
  );
}

function SettingsHeader({ title }: { title: string }) {
  return <AppHeader title={title} back={goBack} />;
}

function SettingsSection({ title, icon, children }: { title: string; icon: string; children: ReactNode }) {
  return <section className={styles.settingsSection}><h2><span><Asset src={icon} alt="" /></span>{title}</h2><SettingsPanel>{children}</SettingsPanel></section>;
}

function SettingsTile({ title, onClick, external = false }: { title: string; onClick?: () => void; external?: boolean }) {
  return <button type="button" className={styles.settingsTile} onClick={onClick}><span>{title}</span>{external ? <Icon name="external" /> : <Icon name="chevron" />}</button>;
}

function Availability({ icon, title, message }: { icon: "trophy" | "palette" | "language" | "vote" | "bell" | "support" | "check" | "info"; title: string; message: string }) {
  return <SettingsPanel raised><div className={styles.availability}><span><Icon name={icon} /></span><div><strong>{title}</strong><p>{message}</p></div></div></SettingsPanel>;
}

function RacingSeries() {
  const [receipt, setReceipt] = useState<VoteReceipt | null>(null);
  useEffect(() => {
    queueMicrotask(() => setReceipt(readVoteReceipt()));
  }, []);
  const options = [
    { id: "f1", name: "F1", icon: "assets/icons/f1_icon.svg", selected: true },
    ...SERIES.map((series) => ({ ...series, selected: false })),
  ];
  return (
    <><SettingsHeader title="Racing Series" /><div className={styles.settingsDetail}>
      <Availability icon="trophy" title="More championships are coming" message="MotoGP, WEC, NASCAR, GT and WRC will be added in future updates." />
      <ChoiceSection title="CHOOSE A SERIES">{options.map((series) => <ChoiceCard key={series.id} title={series.name} icon={series.icon} selected={series.selected} locked={!series.selected} whiteIcon={!series.selected} />)}</ChoiceSection>
      <section className={styles.settingsSection}><h2>{receipt ? "YOUR VOTE" : "HELP CHOOSE WHAT'S NEXT"}</h2><SettingsPanel raised>{receipt ? <div className={styles.submittedVoteCallout}><span><Icon name="check" /></span><div><strong>Vote submitted</strong><p>{receipt.choices.map((id) => SERIES.find((series) => series.id === id)?.name).filter(Boolean).join(", ")} · Voter #{receipt.voterNumber}</p></div></div> : <button className={styles.voteCallout} type="button" onClick={() => { track("Vote CTA Tapped", { source: "racing_series" }); navigate("/settings/racing-series/vote"); }}><span><Icon name="vote" /></span><div><strong>Vote for the next series</strong><p>Pick 1 to 3 championships you want in a future update.</p></div><Icon name="chevron" /></button>}</SettingsPanel></section>
    </div></>
  );
}

function ChoiceSection({ title, children, badge }: { title: string; children: ReactNode; badge?: ReactNode }) {
  return <section className={styles.choiceSection}><header><h2>{title}</h2>{badge}</header><div className={styles.choiceGrid}>{children}</div></section>;
}

function ChoiceCard({ title, icon, selected = false, locked = false, whiteIcon = false, onClick, visual }: { title: string; icon?: string; selected?: boolean; locked?: boolean; whiteIcon?: boolean; onClick?: () => void; visual?: ReactNode }) {
  return <button type="button" className={`${styles.choiceCard} ${selected ? styles.choiceSelected : ""} ${whiteIcon ? styles.choiceIconWhite : ""}`} disabled={locked && !onClick} onClick={onClick} aria-pressed={selected}><span>{visual || <Asset src={icon} alt="" />}</span><strong>{title}</strong>{(selected || locked) && <i><Icon name={selected ? "check" : "lock"} /></i>}</button>;
}

interface VoteReceipt { voterNumber: number; choices: VoteSeriesId[]; submittedAt: string; alreadySubmitted?: boolean }

function readVoteReceipt(): VoteReceipt | null {
  try {
    const saved = localStorage.getItem("racera.vote.receipt.v1");
    if (!saved) return null;
    const value = JSON.parse(saved) as Partial<VoteReceipt>;
    if (typeof value.voterNumber !== "number" || !Array.isArray(value.choices) || typeof value.submittedAt !== "string") throw new Error("invalid receipt");
    return value as VoteReceipt;
  } catch {
    localStorage.removeItem("racera.vote.receipt.v1");
    return null;
  }
}

function VotePage({ showToast }: { showToast: (message: string) => void }) {
  const [selected, setSelected] = useState<VoteSeriesId[]>([]);
  const [receipt, setReceipt] = useState<VoteReceipt | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    queueMicrotask(() => setReceipt(readVoteReceipt()));
  }, []);
  const toggle = (id: VoteSeriesId) => {
    if (receipt) return;
    if (selected.includes(id)) setSelected((values) => values.filter((value) => value !== id));
    else if (selected.length < 3) setSelected((values) => [...values, id]);
    else showToast("You can select up to 3 racing series.");
  };
  const submit = async () => {
    setSubmitting(true);
    setError(null);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15_000);
    try {
      let installationId = localStorage.getItem("racera.vote.installationId.v1");
      if (!installationId) {
        installationId = crypto.randomUUID();
        localStorage.setItem("racera.vote.installationId.v1", installationId);
      }
      const locale = navigator.language || "en";
      const response = await fetch(VOTE_API_URL, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json; charset=utf-8" },
        signal: controller.signal,
        body: JSON.stringify({
          schemaVersion: 1,
          installationId,
          choices: selected,
          clientSubmittedAt: new Date().toISOString(),
          platform: "web",
          deviceModel: navigator.platform || null,
          deviceName: "browser",
          platformIdentifier: null,
          osVersion: navigator.userAgent.slice(0, 160),
          deviceTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
          deviceUtcOffsetMinutes: -new Date().getTimezoneOffset(),
          deviceLocale: locale,
          deviceRegionCode: locale.split("-")[1] || null,
        }),
      });
      const value = await response.json() as VoteReceipt & { error?: string };
      if (!response.ok || !value.voterNumber || !Array.isArray(value.choices)) {
        const message = value.error === "internal_error"
          ? "The voting database needs an update. Please try again after the API migration is applied."
          : response.status >= 500
            ? "The voting service is temporarily unavailable."
            : "Your vote could not be submitted. Please try again.";
        throw new Error(message);
      }
      localStorage.setItem("racera.vote.receipt.v1", JSON.stringify(value));
      setReceipt(value);
      setConfirm(false);
      track("Series Vote Submitted", { choices: value.choices, voter_number: value.voterNumber });
    } catch (reason) {
      setError(
        reason instanceof DOMException && reason.name === "AbortError"
          ? "The request timed out. Check your connection and try again."
          : reason instanceof TypeError
            ? "Could not reach the voting service. Please try again."
            : reason instanceof Error
              ? reason.message
              : "Your vote could not be submitted.",
      );
      setConfirm(false);
    } finally {
      window.clearTimeout(timeout);
      setSubmitting(false);
    }
  };
  return (
    <><SettingsHeader title="Vote" /><div className={styles.settingsDetail}>
      {receipt ? <SubmittedVote receipt={receipt} /> : <>
        <Availability icon="vote" title="Shape the next update" message="Choose at least 1 and up to 3 racing series you want to see in Racera." />
        <ChoiceSection title="CHOOSE YOUR SERIES" badge={<span className={`${styles.selectionBadge} ${selected.length ? styles.selectionBadgeActive : ""}`}>{selected.length} / 3 selected</span>}>
          {SERIES.map((series) => <ChoiceCard key={series.id} title={series.name} icon={series.icon} selected={selected.includes(series.id)} whiteIcon onClick={() => toggle(series.id)} />)}
        </ChoiceSection>
        {error && <p className={styles.inlineError} role="alert"><Icon name="info" />{error}</p>}
        <button className={styles.submitVote} type="button" disabled={!selected.length || submitting} onClick={() => setConfirm(true)}>{selected.length ? `SUBMIT ${selected.length} ${selected.length === 1 ? "VOTE" : "VOTES"}` : "SELECT AT LEAST 1 SERIES"}</button>
        <p className={styles.votePrivacy}>Submitting records your choices, app-install ID, device and OS details, timezone/locale, and Cloudflare&apos;s approximate country/region. No location permission is requested.</p>
      </>}
    </div>
    {confirm && <Modal title="Submit your vote?" onClose={() => setConfirm(false)} actions={<><button type="button" className={styles.secondaryButton} onClick={() => setConfirm(false)}>CANCEL</button><button type="button" className={styles.primaryButton} disabled={submitting} onClick={submit}>{submitting ? "SUBMITTING…" : "SUBMIT VOTE"}</button></>}><p>You selected {selected.map((id) => SERIES.find((series) => series.id === id)?.name).join(", ")}. You cannot change this vote after it is submitted.</p></Modal>}
    </>
  );
}

function SubmittedVote({ receipt }: { receipt: VoteReceipt }) {
  return <><Availability icon="check" title="Vote submitted" message={`Thank you — you are voter #${receipt.voterNumber}. This ballot is now locked on this app installation.`} /><section className={styles.settingsSection}><h2>YOUR PICKS</h2><SettingsPanel><div className={styles.submittedPicks}>{receipt.choices.map((id) => { const series = SERIES.find((item) => item.id === id); return series ? <span key={id}><Asset src={series.icon} alt="" />{series.name}<Icon name="check" /></span> : null; })}</div></SettingsPanel></section><p className={styles.votePrivacy}>Submitted {new Date(receipt.submittedAt).toLocaleString()}</p></>;
}

function Notifications({ sessions, showToast, openInstall }: { sessions: Session[]; showToast: (message: string) => void; openInstall: () => void }) {
  const reminders = [{ value: 60, label: "1 hour before" }, { value: 30, label: "30 minutes before" }, { value: 15, label: "15 minutes before" }, { value: 5, label: "5 minutes before" }, { value: 0, label: "At session start" }];
  const [minutes, setMinutes] = useState<number[]>([15]);
  const [permission, setPermission] = useState("default");
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    queueMicrotask(() => {
      const currentPermission = "Notification" in window ? Notification.permission : "unsupported";
      setPermission(currentPermission);
      setEnabled(localStorage.getItem("racera.push.enabled") !== "0");
      try { setMinutes(JSON.parse(localStorage.getItem("racera.push.reminders") || "[15]") as number[]); } catch { setMinutes([15]); }
    });
  }, []);
  const setMaster = async (value: boolean) => {
    setEnabled(value);
    localStorage.setItem("racera.push.enabled", value ? "1" : "0");
    if (!value) {
      await replacePushSchedule([]).catch(() => undefined);
      showToast("Session notifications are off.");
      return;
    }
    setSaving(true);
    try {
      const result = await requestPushPermission();
      setPermission(result);
      if (result === "requires_install") openInstall();
      else if (result === "granted") {
        const schedule = buildNotificationSchedule(sessions, minutes);
        await replacePushSchedule(schedule);
        showToast("Notifications are enabled.");
      } else showToast("Notification permission is off. Enable it in your browser or device settings.");
    } catch (reason) { showToast(reason instanceof Error ? reason.message : "Notifications could not be enabled."); }
    finally { setSaving(false); }
  };
  const toggleReminder = async (value: number) => {
    const next = minutes.includes(value) ? minutes.filter((item) => item !== value) : [...minutes, value].sort((a, b) => b - a);
    if (!next.length) { showToast("Keep at least one reminder selected, or turn notifications off."); return; }
    setMinutes(next);
    localStorage.setItem("racera.push.reminders", JSON.stringify(next));
    if (enabled && permission === "granted") {
      setSaving(true);
      try { await replacePushSchedule(buildNotificationSchedule(sessions, next)); } catch { showToast("Saved. The reminder schedule will sync when calendar data is available."); }
      finally { setSaving(false); }
    }
  };
  return (
    <><SettingsHeader title="Notifications" /><div className={styles.settingsDetail}>
      <SettingsPanel raised><div className={styles.notificationMaster}><span><Icon name="bell" /></span><div><strong>Session notifications</strong><p>{saving ? "Updating your session reminders…" : enabled ? "Alerts are enabled for upcoming F1 sessions." : "All scheduled session alerts are paused."}</p></div><button type="button" className={`${styles.toggle} ${enabled ? styles.toggleOn : ""}`} onClick={() => setMaster(!enabled)} aria-pressed={enabled}><i /></button></div></SettingsPanel>
      <section className={styles.reminderSection}><h2>REMIND ME</h2><p>Choose when Racera should alert you before every session.</p><SettingsPanel>{reminders.map((reminder) => <button type="button" key={reminder.value} disabled={!enabled} onClick={() => toggleReminder(reminder.value)}><span>{reminder.label}</span><i className={`${styles.toggle} ${minutes.includes(reminder.value) ? styles.toggleOn : ""}`}><b /></i></button>)}</SettingsPanel><small>At least one reminder must stay selected while notifications are on.</small></section>
      {isIos() && <p className={styles.settingsHint}><Icon name="info" /> On iPhone and iPad, web push works after Racera is added to the Home Screen.</p>}
    </div></>
  );
}

function ThemePage() {
  const previews = [
    { title: "Dark", selected: true, className: styles.previewDark },
    { title: "Light", className: styles.previewLight },
    { title: "Glass", className: styles.previewGlass },
  ];
  return <><SettingsHeader title="Theme" /><div className={styles.settingsDetail}><Availability icon="palette" title="More visual styles are coming" message="Light and Glass themes are planned for future updates. Dark is currently active." /><ChoiceSection title="APP APPEARANCE">{previews.map((item) => <ChoiceCard key={item.title} title={item.title} selected={item.selected} locked={!item.selected} visual={<div className={`${styles.themePreview} ${item.className}`}><div className={styles.themePreviewTop}><i /><b /></div><span><em /><em /></span></div>} />)}</ChoiceSection></div></>;
}

function LanguagePage() {
  return <><SettingsHeader title="Language" /><div className={styles.settingsDetail}><Availability icon="language" title="More languages are coming" message="Additional languages will become available in future updates." /><section className={styles.settingsSection}><h2>CURRENT LANGUAGE</h2><SettingsPanel raised><div className={styles.currentLanguage}><span><Icon name="language" /></span><div><strong>English</strong><p>App language</p></div><i><Icon name="check" /></i></div></SettingsPanel></section></div></>;
}

function HelpFeedback() {
  const email = "mailto:racera.support@gmail.com?subject=Racera%20Support";
  return <><SettingsHeader title="Help & Feedback" /><div className={styles.settingsDetail}><Availability icon="support" title="Help shape Racera" message="Contact support or choose what should come next." /><a className={styles.supportCard} href={email} onClick={() => track("Support Tapped", { source: "help_feedback", action: "email" })}><span><Icon name="mail" /></span><div><strong>Support</strong><p>Compose a support email directly in Gmail.</p></div><Icon name="chevron" /></a><button type="button" className={styles.supportCard} onClick={() => navigate("/settings/racing-series/vote")}><span><Icon name="vote" /></span><div><strong>Vote</strong><p>Vote for the racing series you want added next.</p></div><Icon name="chevron" /></button></div></>;
}

function About() {
  const links = [{ section: "LINKS", items: [{ label: "Website", url: "https://racera.online" }, { label: "LinkedIn", url: "https://linkedin.com/in/amin-asgari" }] }, { section: "LEGAL", items: [{ label: "Privacy Policy", url: "https://racera.online/privacy/" }, { label: "Terms of Use", url: "https://racera.online/terms/" }, { label: "Open Source Licenses", url: "https://racera.online/license/" }] }];
  return <><SettingsHeader title="About" /><div className={`${styles.settingsDetail} ${styles.aboutPage}`}><div className={styles.appIdentity}><Asset src="assets/icons/app_icon.png" alt="Racera" eager /><strong>Racera</strong><span>Version 1.0.0</span></div>{links.map((group) => <section className={styles.settingsSection} key={group.section}><h2>{group.section}</h2><SettingsPanel>{group.items.map((link) => <a className={styles.aboutLink} href={link.url} target="_blank" rel="noopener noreferrer" key={link.url}><span>{link.label}</span><Icon name="external" /></a>)}</SettingsPanel></section>)}<p className={styles.copyright}>© 2026 Amin Asgari</p></div></>;
}

function InstallModal({ hasPrompt, onInstall, onClose }: { hasPrompt: boolean; onInstall: () => void; onClose: () => void }) {
  const ios = isIos();
  return <Modal title="Install Racera" onClose={onClose} actions={hasPrompt ? <><button type="button" className={styles.secondaryButton} onClick={onClose}>Not now</button><button type="button" className={styles.primaryButton} onClick={onInstall}><Icon name="install" />Install</button></> : <button type="button" className={styles.primaryButton} onClick={onClose}>Got it</button>}><div className={styles.installGuide}><Asset src="assets/icons/app_icon.png" alt="Racera" />{hasPrompt ? <p>Install the lightweight Racera web app for a full-screen experience and race reminders.</p> : ios ? <ol><li>Tap the <strong>Share</strong> button in Safari.</li><li>Choose <strong>Add to Home Screen</strong>.</li><li>Confirm by tapping <strong>Add</strong>.</li></ol> : <p>Open your browser menu and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</p>}</div></Modal>;
}

function NotFound() {
  return <><AppHeader title="Racera" back={goBack} /><ErrorState message="This page could not be found." retry={() => navigate("/home")} /></>;
}

function countdownParts(target: Date, now: Date) {
  const total = Math.max(0, target.getTime() - now.getTime());
  return {
    days: Math.floor(total / 86_400_000),
    hours: Math.floor((total % 86_400_000) / 3_600_000),
    minutes: Math.floor((total % 3_600_000) / 60_000),
    seconds: Math.floor((total % 60_000) / 1_000),
  };
}

function displayDate(value: string, offsetRaw: string | null | undefined, local: boolean) {
  const date = new Date(value);
  if (local || !offsetRaw) return date;
  const match = offsetRaw.match(/^(-?)(\d{2}):(\d{2})/);
  if (!match) return date;
  const offset = (match[1] === "-" ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3]));
  return new Date(date.getTime() + offset * 60_000);
}

function formatTime(date: Date, utc = false) {
  const hours = utc ? date.getUTCHours() : date.getHours();
  const minutes = utc ? date.getUTCMinutes() : date.getMinutes();
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function formatTimeRange(session: Session, local: boolean) {
  const start = displayDate(session.date_start, session.gmt_offset, local);
  const end = displayDate(session.date_end, session.gmt_offset, local);
  return `${formatTime(start, !local)} - ${formatTime(end, !local)}`;
}

function formatWeekendRange(weekend: Weekend, local: boolean) {
  const first = displayDate(weekend.sessions[0].date_start, weekend.sessions[0].gmt_offset, local);
  const lastSession = weekend.sessions[weekend.sessions.length - 1];
  const last = displayDate(lastSession.date_end, lastSession.gmt_offset, local);
  return `${local ? first.getDate() : first.getUTCDate()} - ${local ? last.getDate() : last.getUTCDate()}  ${monthName(local ? last.getMonth() : last.getUTCMonth())}`;
}

function formatPostDate(value: string) {
  const date = new Date(value);
  return `${date.getDate()} ${monthName(date.getMonth(), true)} ${date.getFullYear()}`;
}

function monthName(index: number, full = false) {
  const months = full ? ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"] : ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  return months[index] || "";
}

function ordinalSuffix(value: number) {
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 13) return "th";
  return value % 10 === 1 ? "st" : value % 10 === 2 ? "nd" : value % 10 === 3 ? "rd" : "th";
}

function capitalize(value: string) { return value.charAt(0).toUpperCase() + value.slice(1); }
function lastName(value: string) { return value.trim().split(/\s+/).at(-1) || value; }
function shortMeetingName(value: string) { return value.replace(/ Grand Prix$/i, ""); }
function careerLabel(key: string, isDriver: boolean) {
  if (!isDriver && key === "team_points") return "Team Points";
  return key.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
