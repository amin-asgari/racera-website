import * as amplitude from "@amplitude/analytics-browser";

const apiKey = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY?.trim() || "";
let initialized = false;

function deviceProperties() {
  const locale = navigator.language || "en";
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  let installationDate = localStorage.getItem("racera.analytics.installationDate");
  if (!installationDate) {
    installationDate = new Date().toISOString();
    localStorage.setItem("racera.analytics.installationDate", installationDate);
  }
  return {
    device_os: /iphone|ipad|ipod/i.test(navigator.userAgent)
      ? "ios"
      : /android/i.test(navigator.userAgent)
        ? "android"
        : "web",
    device_os_version: navigator.userAgent,
    phone_model: navigator.platform || "web",
    phone_name: (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform || navigator.platform || "web",
    device_region_code: locale.split("-")[1] || null,
    device_timezone: timezone,
    device_utc_offset_minutes: -new Date().getTimezoneOffset(),
    device_locale: locale,
    app_variant: "web_app",
    web_app_version: "1.0.0",
    installation_date_utc: installationDate,
  };
}

export async function initializeAnalytics(installed: boolean) {
  if (!apiKey || initialized || typeof window === "undefined") return;
  try {
    await amplitude.init(apiKey, {
      // Network blockers and offline previews must not surface SDK transport
      // failures through Next's development error overlay.
      logLevel: amplitude.Types.LogLevel.None,
      flushMaxRetries: 0,
      fetchRemoteConfig: false,
      enableDiagnostics: false,
      defaultTracking: {
        sessions: true,
        pageViews: false,
        formInteractions: false,
        fileDownloads: false,
      },
    }).promise;
    initialized = true;
    const identify = new amplitude.Identify();
    for (const [key, value] of Object.entries(deviceProperties())) {
      if (value !== null) identify.set(key, value);
    }
    identify.set("uses_web_app", true);
    identify.set("web_app_installed_mode", installed);
    void amplitude.identify(identify).promise.catch(() => undefined);
    void amplitude.track("Web App Opened", { installed_mode: installed, version: "1.0.0" }).promise.catch(() => undefined);
  } catch {
    // Analytics is optional and must never block the app.
  }
}

export function track(eventType: string, properties: Record<string, unknown> = {}) {
  if (!initialized) return;
  try {
    void amplitude.track(eventType, properties).promise.catch(() => undefined);
  } catch {
    // Analytics is best-effort.
  }
}

export function identify(properties: Record<string, string | number | boolean | string[]>) {
  if (!initialized) return;
  try {
    const event = new amplitude.Identify();
    for (const [key, value] of Object.entries(properties)) event.set(key, value);
    void amplitude.identify(event).promise.catch(() => undefined);
  } catch {
    // Analytics is best-effort.
  }
}

export function flushAnalytics() {
  if (!initialized) return;
  try {
    void amplitude.flush().promise.catch(() => undefined);
  } catch {
    // Analytics is best-effort.
  }
}
