/**
 * R.6 — Handler push notifications injecté dans le Service Worker Workbox.
 *
 * Importé via `workbox.importScripts: ['webpush-handler.js']` dans
 * `vite.config.ts`. Tourne dans le même SW que Workbox, donc les push
 * subscriptions sont liées au SW principal `/sw.js`.
 */

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch (_) {
    payload = { title: 'Webisafe', body: event.data.text() };
  }

  const title = payload.title || 'Webisafe';
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/logo.svg',
    badge: payload.badge || '/logo.svg',
    data: {
      url: payload.url || '/dashboard',
      ...(payload.data || {}),
    },
    tag: payload.tag || 'webisafe-default',
    requireInteraction: payload.requireInteraction === true,
    actions: Array.isArray(payload.actions) ? payload.actions.slice(0, 2) : undefined,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      for (const win of windows) {
        if (win.url.includes(targetUrl) && 'focus' in win) {
          return win.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return null;
    })
  );
});
