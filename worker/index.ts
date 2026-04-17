/// <reference lib="webworker" />
// Custom service-worker code injected by @ducanh2912/next-pwa into the
// generated sw.js. Handles Web Push events so CashFlow can notify the user
// about savings reminders while the PWA isn't open.

declare const self: ServiceWorkerGlobalScope;

type PushPayload = {
  title?: string;
  body?: string;
  url?: string;
  tag?: string;
};

self.addEventListener("push", (event: PushEvent) => {
  let payload: PushPayload = {};
  try {
    payload = event.data?.json() ?? {};
  } catch {
    payload = { body: event.data?.text() ?? "" };
  }

  const title = payload.title ?? "CashFlow";
  const options: NotificationOptions = {
    body: payload.body ?? "You have a new CashFlow reminder.",
    icon: "/logo.png",
    badge: "/logo.png",
    tag: payload.tag ?? "cashflow-reminder",
    data: { url: payload.url ?? "/goals" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener(
  "notificationclick",
  (event: NotificationEvent) => {
    event.notification.close();
    const target =
      ((event.notification.data as { url?: string } | undefined)?.url) ?? "/";
    event.waitUntil(
      (async () => {
        const all = await self.clients.matchAll({
          type: "window",
          includeUncontrolled: true,
        });
        for (const client of all) {
          if ("focus" in client) {
            await client.focus();
            if ("navigate" in client) {
              try {
                await (client as WindowClient).navigate(target);
              } catch {
                /* ignore */
              }
            }
            return;
          }
        }
        if (self.clients.openWindow) {
          await self.clients.openWindow(target);
        }
      })(),
    );
  },
);

export {};
