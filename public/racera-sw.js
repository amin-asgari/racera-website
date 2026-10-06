const CACHE_PREFIX = "racera-next-";
// Bump this value whenever a deployed asset changes without changing its URL.
const CACHE_VERSION = "v3";
const CACHE_NAME = `${CACHE_PREFIX}${CACHE_VERSION}`;
const APP_SHELL = [
  "/web-app/",
  "/web-app/manifest.webmanifest",
  "/web-app/offline.html",
  "/web-app/icons/icon-192.png",
  "/web-app/icons/icon-512.png",
  "/web-app/icons/apple-touch-icon.png",
];
const STATIC_PATH_PREFIXES = [
  "/_next/static/",
  "/assets/",
  "/brand/",
  "/screens/",
  "/web-app/icons/",
];

function isStaticAsset(request, url) {
  return !request.headers.has("range") &&
    STATIC_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));
}

function isCacheableResponse(response) {
  return response.ok &&
    response.status === 200 &&
    (response.type === "basic" || response.type === "default");
}

async function cacheFirst(request, event) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;

  // A cache miss means this is the first request for the active release. Bypass
  // the HTTP cache so a newly activated worker cannot repopulate from an older
  // browser entry that happens to use the same public URL.
  const response = await fetch(request, { cache: "reload" });
  if (isCacheableResponse(response)) {
    event.waitUntil(cache.put(request, response.clone()).catch(() => undefined));
  }
  return response;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      ),
      self.clients.claim(),
    ]),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate" && url.pathname.startsWith("/web-app")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          event.waitUntil(
            caches.open(CACHE_NAME)
              .then((cache) => cache.put("/web-app/", copy))
              .catch(() => undefined),
          );
          return response;
        })
        .catch(async () =>
          (await caches.match("/web-app/")) || (await caches.match("/web-app/offline.html")),
        ),
    );
    return;
  }

  if (isStaticAsset(request, url)) {
    event.respondWith(cacheFirst(request, event));
  }
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : "" };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || "Racera", {
      body: payload.body || "A racing session is about to begin.",
      icon: payload.icon || "/web-app/icons/icon-192.png",
      badge: payload.badge || "/web-app/icons/badge-96.png",
      tag: payload.tag || "racera-session",
      renotify: false,
      data: { url: payload.url || "/web-app/#/calendar" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/web-app/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (windows) => {
      for (const client of windows) {
        if ("focus" in client) {
          await client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
