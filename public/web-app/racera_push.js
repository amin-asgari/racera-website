(function () {
  const subscriptionIdKey = "racera.push.subscriptionId";
  const manageTokenKey = "racera.push.manageToken";
  let deferredInstallPrompt = null;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    window.dispatchEvent(new CustomEvent("racera-install-available"));
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    window.dispatchEvent(new CustomEvent("racera-app-installed"));
  });

  function isIos() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  }

  function isStandalone() {
    return window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
  }

  function base64UrlToUint8Array(value) {
    const padding = "=".repeat((4 - (value.length % 4)) % 4);
    const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(base64);
    return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
  }

  async function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) {
      throw new Error("Service workers are not supported by this browser.");
    }
    await navigator.serviceWorker.register("racera-sw.js", { scope: "./" });
    return navigator.serviceWorker.ready;
  }

  async function ensureSubscription(apiBase) {
    const registration = await registerServiceWorker();
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      const response = await fetch(`${apiBase}/config`, {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error("Push configuration is unavailable.");
      const config = await response.json();
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToUint8Array(config.publicKey),
      });
    }

    const response = await fetch(`${apiBase}/subscriptions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        locale: navigator.language || "en",
      }),
    });
    if (!response.ok) throw new Error("The notification subscription could not be saved.");
    const result = await response.json();
    localStorage.setItem(subscriptionIdKey, result.id);
    localStorage.setItem(manageTokenKey, result.manageToken);
    return result;
  }

  window.raceraWebApp = {
    isIos,
    isStandalone,
    isInstallPromptAvailable() {
      return deferredInstallPrompt !== null;
    },
    notificationSupported() {
      return "Notification" in window && "PushManager" in window && "serviceWorker" in navigator;
    },
    notificationPermission() {
      return "Notification" in window ? Notification.permission : "unsupported";
    },
    async promptInstall() {
      if (isStandalone()) return JSON.stringify({ status: "installed" });
      if (!deferredInstallPrompt) {
        return JSON.stringify({ status: isIos() ? "ios_instructions" : "unavailable" });
      }
      const prompt = deferredInstallPrompt;
      deferredInstallPrompt = null;
      await prompt.prompt();
      const choice = await prompt.userChoice;
      return JSON.stringify({ status: choice.outcome });
    },
    async requestNotificationPermission(apiBase) {
      if (!("Notification" in window && "PushManager" in window && "serviceWorker" in navigator)) {
        return JSON.stringify({ status: "unsupported" });
      }
      if (isIos() && !isStandalone()) {
        return JSON.stringify({ status: "requires_install" });
      }
      const permission = Notification.permission === "granted"
        ? "granted"
        : await Notification.requestPermission();
      if (permission !== "granted") return JSON.stringify({ status: permission });
      await ensureSubscription(apiBase);
      return JSON.stringify({ status: "granted" });
    },
    async replaceSchedule(apiBase, scheduleJson) {
      if (Notification.permission !== "granted") return false;
      let id = localStorage.getItem(subscriptionIdKey);
      let token = localStorage.getItem(manageTokenKey);
      if (!id || !token) {
        await ensureSubscription(apiBase);
        id = localStorage.getItem(subscriptionIdKey);
        token = localStorage.getItem(manageTokenKey);
      }
      const response = await fetch(`${apiBase}/schedule`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Racera-Subscription": id,
          "X-Racera-Manage-Token": token,
        },
        body: scheduleJson,
      });
      if (!response.ok) throw new Error("The notification schedule could not be saved.");
      return true;
    },
    async cancelNotifications(apiBase) {
      const id = localStorage.getItem(subscriptionIdKey);
      const token = localStorage.getItem(manageTokenKey);
      if (!id || !token) return true;
      const response = await fetch(`${apiBase}/schedule`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Racera-Subscription": id,
          "X-Racera-Manage-Token": token,
        },
        body: JSON.stringify({ notifications: [] }),
      });
      return response.ok;
    },
    async showTestNotification() {
      if (Notification.permission !== "granted") return false;
      const registration = await registerServiceWorker();
      await registration.showNotification("Racera notifications are on", {
        body: "Session reminders will appear here.",
        icon: "icons/Icon-192.png",
        badge: "icons/Badge-96.png",
        tag: "racera-test",
        data: { url: "./#/settings/notifications" },
      });
      return true;
    },
  };

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("racera-sw.js", { scope: "./" }).catch(() => {});
    });
  }
})();
