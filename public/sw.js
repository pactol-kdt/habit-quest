/* HabitQuest service worker — push reminders when the tab is closed. */

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  /** @type {{ title?: string; body?: string; tag?: string; url?: string }} */
  let payload = {
    title: "HabitQuest reminder",
    body: "Check HabitQuest and keep your streak alive.",
    tag: "habitquest-daily-reminder",
    url: "/",
  };

  try {
    if (event.data) {
      const parsed = event.data.json();
      payload = { ...payload, ...parsed };
    }
  } catch {
    try {
      const text = event.data?.text();
      if (text) {
        payload.body = text;
      }
    } catch {
      // Keep defaults.
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || "HabitQuest reminder", {
      body: payload.body,
      tag: payload.tag || "habitquest-daily-reminder",
      icon: "/brand/habitquest-logo.png",
      badge: "/brand/habitquest-logo.png",
      data: { url: payload.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          if ("navigate" in client) {
            return client.navigate(targetUrl).then((navigated) => navigated?.focus?.() ?? client.focus());
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    }),
  );
});
