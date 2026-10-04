import {
  buildPushPayload,
  type PushSubscription,
  type VapidKeys,
} from "@block65/webcrypto-web-push";

interface Env {
  DB: D1Database;
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY: string;
  VAPID_SUBJECT: string;
}

type VoteSeries = "motogp" | "wec" | "nascar" | "gt" | "wrc";

interface VotePayload {
  installationId: string;
  platform: "android" | "ios" | "web";
  deviceModel: string | null;
  deviceName: string | null;
  platformIdentifier: string | null;
  osVersion: string;
  deviceTimezone: string;
  deviceUtcOffsetMinutes: number;
  deviceLocale: string;
  deviceRegionCode: string | null;
  choices: VoteSeries[];
  clientSubmittedAt: string;
}

interface VoteRow {
  id: number;
  choices_json: string;
  submitted_at: string;
}

interface CloudflareLocation {
  country?: string | null;
  region?: string | null;
  regionCode?: string | null;
  timezone?: string | null;
}

interface PushSubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  manage_token_hash: string;
}

interface PendingNotificationRow {
  id: number;
  subscription_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  title: string;
  body: string;
  tag: string;
  attempts: number;
}

interface PushScheduleItem {
  triggerAtEpochMillis: number;
  title: string;
  body: string;
  id?: number;
}

const ALLOWED_SERIES = ["motogp", "wec", "nascar", "gt", "wrc"] as const;
const ALLOWED_SERIES_SET = new Set<string>(ALLOWED_SERIES);
const INSTALLATION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const MAX_BODY_BYTES = 64 * 1024;
const MAX_NOTIFICATIONS = 240;

export default {
  async fetch(request, env): Promise<Response> {
    if (request.method === "OPTIONS") return corsPreflight(request);

    let response: Response;
    try {
      response = await route(request, env);
    } catch (error) {
      if (error instanceof HttpError) {
        response = json({ error: error.code }, error.status);
      } else {
        console.error("Racera API request failed", error);
        response = json({ error: "internal_error" }, 500);
      }
    }
    return withCors(request, response);
  },

  async scheduled(_controller, env, context): Promise<void> {
    context.waitUntil(deliverDueNotifications(env));
  },
} satisfies ExportedHandler<Env>;

async function route(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  if (url.pathname === "/health" && request.method === "GET") {
    const schema = await env.DB.prepare(
      "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'votes' LIMIT 1",
    ).first<{ sql: string }>();
    if (!schema?.sql) throw new HttpError(503, "votes_schema_missing");
    if (!schema.sql.includes("'web'")) {
      throw new HttpError(503, "votes_schema_migration_required");
    }
    return json({ ok: true });
  }
  if (url.pathname === "/v1/votes") return handleVote(request, env);
  if (url.pathname === "/v1/push/config" && request.method === "GET") {
    if (!env.VAPID_PUBLIC_KEY) throw new HttpError(503, "push_not_configured");
    return json({ publicKey: env.VAPID_PUBLIC_KEY });
  }
  if (url.pathname === "/v1/push/subscriptions" && request.method === "POST") {
    return createPushSubscription(request, env);
  }
  if (url.pathname === "/v1/push/schedule" && request.method === "PUT") {
    return replacePushSchedule(request, env);
  }
  return json({ error: "not_found" }, 404);
}

async function handleVote(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405, { Allow: "POST" });
  }

  const payload = await parseVotePayload(request);
  const existing = await findVote(env.DB, payload.installationId);
  if (existing) return receiptResponse(existing, true);

  const submittedAt = new Date().toISOString();
  const cf = (request as Request & { cf?: CloudflareLocation }).cf;
  try {
    const result = await env.DB.prepare(
      `INSERT INTO votes (
        installation_id, platform, device_model, device_name,
        platform_identifier, os_version, device_timezone,
        device_utc_offset_minutes, device_locale, device_region_code,
        edge_country_code, edge_region, edge_region_code, edge_timezone,
        choices_json, client_submitted_at, submitted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        payload.installationId,
        payload.platform,
        payload.deviceModel,
        payload.deviceName,
        payload.platformIdentifier,
        payload.osVersion,
        payload.deviceTimezone,
        payload.deviceUtcOffsetMinutes,
        payload.deviceLocale,
        payload.deviceRegionCode,
        cleanEdgeValue(cf?.country, 8),
        cleanEdgeValue(cf?.region, 100),
        cleanEdgeValue(cf?.regionCode, 32),
        cleanEdgeValue(cf?.timezone, 80),
        JSON.stringify(payload.choices),
        payload.clientSubmittedAt,
        submittedAt,
      )
      .run();

    return json(
      {
        voterNumber: Number(result.meta.last_row_id),
        choices: payload.choices,
        submittedAt,
        alreadySubmitted: false,
      },
      201,
    );
  } catch (error) {
    const vote = await findVote(env.DB, payload.installationId);
    if (vote) return receiptResponse(vote, true);
    throw error;
  }
}

async function createPushSubscription(request: Request, env: Env): Promise<Response> {
  const value = await parseJsonObject(request);
  if (!isObject(value.subscription) || !isObject(value.subscription.keys)) {
    throw new HttpError(400, "invalid_subscription");
  }
  const endpoint = requiredUrl(value.subscription.endpoint, 2048);
  const p256dh = requiredString(value.subscription.keys.p256dh, 256, "invalid_subscription");
  const auth = requiredString(value.subscription.keys.auth, 128, "invalid_subscription");
  const timezone = optionalString(value.timezone, 80) ?? "UTC";
  const locale = optionalString(value.locale, 40) ?? "en";
  const existing = await env.DB.prepare(
    "SELECT id FROM push_subscriptions WHERE endpoint = ? LIMIT 1",
  )
    .bind(endpoint)
    .first<{ id: string }>();
  const id = existing?.id ?? crypto.randomUUID();
  const manageToken = randomToken();
  const manageTokenHash = await sha256(manageToken);
  const now = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO push_subscriptions (
      id, endpoint, p256dh, auth, manage_token_hash, timezone, locale,
      enabled, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    ON CONFLICT(endpoint) DO UPDATE SET
      p256dh = excluded.p256dh,
      auth = excluded.auth,
      manage_token_hash = excluded.manage_token_hash,
      timezone = excluded.timezone,
      locale = excluded.locale,
      enabled = 1,
      updated_at = excluded.updated_at`,
  )
    .bind(id, endpoint, p256dh, auth, manageTokenHash, timezone, locale, now, now)
    .run();

  return json({ id, manageToken }, 201);
}

async function replacePushSchedule(request: Request, env: Env): Promise<Response> {
  const subscription = await authenticateSubscription(request, env.DB);
  const value = await parseJsonObject(request);
  if (!Array.isArray(value.notifications) || value.notifications.length > MAX_NOTIFICATIONS) {
    throw new HttpError(400, "invalid_schedule");
  }
  const now = Date.now();
  const latest = now + 370 * 24 * 60 * 60 * 1000;
  const notifications = value.notifications.map((item): PushScheduleItem => {
    if (!isObject(item)) throw new HttpError(400, "invalid_schedule");
    const triggerAtEpochMillis = item.triggerAtEpochMillis;
    if (
      typeof triggerAtEpochMillis !== "number" ||
      !Number.isSafeInteger(triggerAtEpochMillis) ||
      triggerAtEpochMillis <= now ||
      triggerAtEpochMillis > latest
    ) {
      throw new HttpError(400, "invalid_schedule");
    }
    return {
      triggerAtEpochMillis,
      title: requiredString(item.title, 100, "invalid_schedule"),
      body: requiredString(item.body, 240, "invalid_schedule"),
      id: typeof item.id === "number" && Number.isSafeInteger(item.id) ? item.id : undefined,
    };
  });

  const statements = [
    env.DB.prepare(
      "DELETE FROM push_notifications WHERE subscription_id = ? AND sent_at IS NULL",
    ).bind(subscription.id),
    ...notifications.map((notification) =>
      env.DB.prepare(
        `INSERT INTO push_notifications (
          subscription_id, trigger_at_epoch_ms, title, body, tag, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)`,
      ).bind(
        subscription.id,
        notification.triggerAtEpochMillis,
        notification.title,
        notification.body,
        `racera-session-${notification.id ?? notification.triggerAtEpochMillis}`,
        new Date().toISOString(),
      ),
    ),
  ];
  await env.DB.batch(statements);
  return json({ ok: true, scheduled: notifications.length });
}

async function authenticateSubscription(
  request: Request,
  database: D1Database,
): Promise<PushSubscriptionRow> {
  const id = request.headers.get("x-racera-subscription")?.trim();
  const token = request.headers.get("x-racera-manage-token")?.trim();
  if (!id || !token) throw new HttpError(401, "subscription_auth_required");
  const row = await database
    .prepare(
      `SELECT id, endpoint, p256dh, auth, manage_token_hash
       FROM push_subscriptions WHERE id = ? AND enabled = 1 LIMIT 1`,
    )
    .bind(id)
    .first<PushSubscriptionRow>();
  if (!row || row.manage_token_hash !== (await sha256(token))) {
    throw new HttpError(403, "invalid_subscription_auth");
  }
  return row;
}

async function deliverDueNotifications(env: Env): Promise<void> {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY || !env.VAPID_SUBJECT) {
    console.error("Web Push skipped: VAPID secrets are not configured.");
    return;
  }
  const rows = await env.DB.prepare(
    `SELECT n.id, n.subscription_id, n.title, n.body, n.tag, n.attempts,
            s.endpoint, s.p256dh, s.auth
     FROM push_notifications n
     JOIN push_subscriptions s ON s.id = n.subscription_id
     WHERE n.sent_at IS NULL AND s.enabled = 1 AND n.trigger_at_epoch_ms <= ?
     ORDER BY n.trigger_at_epoch_ms ASC
     LIMIT 50`,
  )
    .bind(Date.now())
    .all<PendingNotificationRow>();

  const vapid: VapidKeys = {
    subject: env.VAPID_SUBJECT,
    publicKey: env.VAPID_PUBLIC_KEY,
    privateKey: env.VAPID_PRIVATE_KEY,
  };
  await Promise.all(rows.results.map((row) => deliverNotification(env.DB, row, vapid)));
}

async function deliverNotification(
  database: D1Database,
  row: PendingNotificationRow,
  vapid: VapidKeys,
): Promise<void> {
  const subscription: PushSubscription = {
    endpoint: row.endpoint,
    expirationTime: null,
    keys: { p256dh: row.p256dh, auth: row.auth },
  };
  try {
    const payload = await buildPushPayload(
      {
        data: JSON.stringify({
          title: row.title,
          body: row.body,
          tag: row.tag,
          icon: "icons/Icon-192.png",
          badge: "icons/Badge-96.png",
          url: "./#/calendar",
        }),
        options: { ttl: 3600, urgency: "normal" },
      },
      subscription,
      vapid,
    );
    const response = await fetch(row.endpoint, payload);
    if (response.ok) {
      await database
        .prepare("UPDATE push_notifications SET sent_at = ?, last_error = NULL WHERE id = ?")
        .bind(new Date().toISOString(), row.id)
        .run();
      return;
    }
    if (response.status === 404 || response.status === 410) {
      await database.batch([
        database.prepare("UPDATE push_subscriptions SET enabled = 0 WHERE id = ?").bind(row.subscription_id),
        database.prepare("DELETE FROM push_notifications WHERE subscription_id = ? AND sent_at IS NULL").bind(row.subscription_id),
      ]);
      return;
    }
    throw new Error(`Push service returned ${response.status}.`);
  } catch (error) {
    const attempts = row.attempts + 1;
    const message = error instanceof Error ? error.message.slice(0, 400) : "unknown_error";
    const statement = attempts >= 5
      ? database.prepare(
          "UPDATE push_notifications SET sent_at = ?, attempts = ?, last_error = ? WHERE id = ?",
        ).bind(new Date().toISOString(), attempts, message, row.id)
      : database.prepare(
          "UPDATE push_notifications SET attempts = ?, last_error = ? WHERE id = ?",
        ).bind(attempts, message, row.id);
    await statement.run();
  }
}

async function parseVotePayload(request: Request): Promise<VotePayload> {
  const value = await parseJsonObject(request);
  if (value.schemaVersion !== 1) throw new HttpError(400, "invalid_vote");

  const installationId = requiredString(value.installationId, 36).toLowerCase();
  if (!INSTALLATION_ID_PATTERN.test(installationId)) throw new HttpError(400, "invalid_vote");
  const platform = requiredString(value.platform, 16);
  if (platform !== "android" && platform !== "ios" && platform !== "web") {
    throw new HttpError(400, "invalid_vote");
  }
  if (!Array.isArray(value.choices) || value.choices.length < 1 || value.choices.length > 3) {
    throw new HttpError(400, "invalid_vote");
  }
  const choiceSet = new Set(value.choices);
  if (
    choiceSet.size !== value.choices.length ||
    value.choices.some(
      (choice) => typeof choice !== "string" || !ALLOWED_SERIES_SET.has(choice),
    )
  ) {
    throw new HttpError(400, "invalid_vote");
  }
  const choices = ALLOWED_SERIES.filter((series) => choiceSet.has(series));
  const offset = value.deviceUtcOffsetMinutes;
  if (!Number.isInteger(offset) || (offset as number) < -840 || (offset as number) > 840) {
    throw new HttpError(400, "invalid_vote");
  }
  const clientSubmittedAt = requiredString(value.clientSubmittedAt, 40);
  if (!Number.isFinite(Date.parse(clientSubmittedAt))) throw new HttpError(400, "invalid_vote");
  return {
    installationId,
    platform,
    deviceModel: optionalString(value.deviceModel, 120),
    deviceName: optionalString(value.deviceName, 120),
    platformIdentifier: optionalString(value.platformIdentifier, 128),
    osVersion: requiredString(value.osVersion, 160),
    deviceTimezone: requiredString(value.deviceTimezone, 80),
    deviceUtcOffsetMinutes: offset as number,
    deviceLocale: requiredString(value.deviceLocale, 40),
    deviceRegionCode: optionalString(value.deviceRegionCode, 16),
    choices,
    clientSubmittedAt: new Date(clientSubmittedAt).toISOString(),
  };
}

async function parseJsonObject(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    throw new HttpError(415, "json_required");
  }
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    throw new HttpError(413, "payload_too_large");
  }
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
    throw new HttpError(413, "payload_too_large");
  }
  try {
    const decoded: unknown = JSON.parse(raw);
    if (!isObject(decoded)) throw new Error("not an object");
    return decoded;
  } catch {
    throw new HttpError(400, "invalid_json");
  }
}

async function findVote(database: D1Database, installationId: string): Promise<VoteRow | null> {
  return database
    .prepare("SELECT id, choices_json, submitted_at FROM votes WHERE installation_id = ? LIMIT 1")
    .bind(installationId)
    .first<VoteRow>();
}

function receiptResponse(row: VoteRow, alreadySubmitted: boolean): Response {
  return json({
    voterNumber: row.id,
    choices: JSON.parse(row.choices_json) as VoteSeries[],
    submittedAt: row.submitted_at,
    alreadySubmitted,
  });
}

function requiredString(value: unknown, maxLength: number, code = "invalid_vote"): string {
  if (typeof value !== "string") throw new HttpError(400, code);
  const cleaned = value.trim();
  if (cleaned.length === 0 || cleaned.length > maxLength) throw new HttpError(400, code);
  return cleaned;
}

function requiredUrl(value: unknown, maxLength: number): string {
  const cleaned = requiredString(value, maxLength, "invalid_subscription");
  try {
    const url = new URL(cleaned);
    if (url.protocol !== "https:") throw new Error("not https");
    return url.href;
  } catch {
    throw new HttpError(400, "invalid_subscription");
  }
}

function optionalString(value: unknown, maxLength: number): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") throw new HttpError(400, "invalid_vote");
  const cleaned = value.trim();
  if (cleaned.length > maxLength) throw new HttpError(400, "invalid_vote");
  return cleaned.length === 0 ? null : cleaned;
}

function cleanEdgeValue(value: string | null | undefined, maxLength: number): string | null {
  if (!value) return null;
  return value.trim().slice(0, maxLength) || null;
}

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return base64Url(bytes);
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return base64Url(new Uint8Array(digest));
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return true;
  if (origin === "https://racera.online" || origin === "https://www.racera.online") return true;
  if (/^https:\/\/[a-z0-9-]+\.pages\.dev$/i.test(origin)) return true;
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
}

function corsPreflight(request: Request): Response {
  const origin = request.headers.get("origin");
  if (!isAllowedOrigin(origin)) return json({ error: "origin_not_allowed" }, 403);
  return withCors(
    request,
    new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
        "Access-Control-Allow-Headers":
          "Content-Type, X-Racera-Subscription, X-Racera-Manage-Token",
        "Access-Control-Max-Age": "86400",
      },
    }),
  );
}

function withCors(request: Request, response: Response): Response {
  const origin = request.headers.get("origin");
  if (!origin || !isAllowedOrigin(origin)) return response;
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Vary", "Origin");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...extraHeaders,
    },
  });
}

class HttpError extends Error {
  constructor(readonly status: number, readonly code: string) {
    super(code);
  }
}
