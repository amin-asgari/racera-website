import type { Session } from "./racera-data";

export const PUSH_API_BASE = (
  process.env.NEXT_PUBLIC_WEB_PUSH_API_URL ||
  "https://racera-vote-api.amin-asgari-work.workers.dev/v1/push"
).replace(/\/$/, "");

const subscriptionIdKey = "racera.push.subscriptionId";
const manageTokenKey = "racera.push.manageToken";

export interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function pushSupported() {
  return "Notification" in window && "PushManager" in window && "serviceWorker" in navigator;
}

export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) throw new Error("Service workers are not supported.");
  await navigator.serviceWorker.register("/racera-sw.js", { scope: "/web-app/" });
  return navigator.serviceWorker.ready;
}

function base64UrlToBytes(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

async function ensureSubscription() {
  const registration = await registerServiceWorker();
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    const configResponse = await fetch(`${PUSH_API_BASE}/config`, {
      headers: { Accept: "application/json" },
    });
    if (!configResponse.ok) throw new Error("Push configuration is unavailable.");
    const config = (await configResponse.json()) as { publicKey?: string };
    if (!config.publicKey) throw new Error("The VAPID public key is missing on the push worker.");
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToBytes(config.publicKey),
    });
  }

  const response = await fetch(`${PUSH_API_BASE}/subscriptions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subscription: subscription.toJSON(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      locale: navigator.language || "en",
    }),
  });
  if (!response.ok) throw new Error("The notification subscription could not be saved.");
  const credentials = (await response.json()) as { id: string; manageToken: string };
  localStorage.setItem(subscriptionIdKey, credentials.id);
  localStorage.setItem(manageTokenKey, credentials.manageToken);
  return credentials;
}

export async function requestPushPermission() {
  if (!pushSupported()) return "unsupported" as const;
  if (isIos() && !isStandalone()) return "requires_install" as const;
  const permission = Notification.permission === "granted"
    ? "granted"
    : await Notification.requestPermission();
  if (permission !== "granted") return permission;
  await ensureSubscription();
  return "granted" as const;
}

export async function replacePushSchedule(notifications: Array<Record<string, string | number>>) {
  if (Notification.permission !== "granted") return false;
  let id = localStorage.getItem(subscriptionIdKey);
  let token = localStorage.getItem(manageTokenKey);
  if (!id || !token) {
    const credentials = await ensureSubscription();
    id = credentials.id;
    token = credentials.manageToken;
  }
  const response = await fetch(`${PUSH_API_BASE}/schedule`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Racera-Subscription": id,
      "X-Racera-Manage-Token": token,
    },
    body: JSON.stringify({ notifications }),
  });
  if (!response.ok) throw new Error("The notification schedule could not be saved.");
  return true;
}

export function buildNotificationSchedule(sessions: Session[], reminderMinutes: number[]) {
  const now = Date.now();
  const notifications: Array<Record<string, string | number>> = [];
  sessions.forEach((session) => {
    if (session.is_cancelled) return;
    const start = Date.parse(session.date_start);
    if (start <= now) return;
    reminderMinutes.forEach((minutes, index) => {
      const trigger = start - minutes * 60_000;
      if (trigger <= now) return;
      const eventName = session.meeting_name || session.circuit_short_name || "Formula 1";
      notifications.push({
        id: Math.abs(session.session_key) * 10 + index,
        triggerAtEpochMillis: trigger,
        title: `F1 • ${session.session_name}`,
        body: minutes === 0
          ? `${eventName} • ${session.session_name} is starting now.`
          : `${eventName} • ${session.session_name} starts in ${minutes >= 60 ? `${minutes / 60} hour` : `${minutes} minutes`}.`,
      });
    });
  });
  return notifications.slice(0, 240);
}

export async function showTestNotification() {
  if (Notification.permission !== "granted") throw new Error("Notifications are not enabled.");
  const registration = await registerServiceWorker();
  await registration.showNotification("Racera notifications are on", {
    body: "Session reminders will appear here.",
    icon: "/web-app/icons/icon-192.png",
    badge: "/web-app/icons/badge-96.png",
    tag: "racera-test",
    data: { url: "/web-app/#/settings/notifications" },
  });
}
