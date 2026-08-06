// Minimal service worker for Trébrat.
//
// IMPORTANT: this SW intentionally has NO 'fetch' handler. It never intercepts
// network requests, so it can never break login or any Supabase/Google call.
// (A previous cache-first fetch handler caused "Load failed" errors.)
// It only enables PWA install + push notifications, and cleans up old caches.

const CACHE_NAME = 'trebrat-v3';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Remove every cache left over from older versions that intercepted fetches.
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      await self.clients.claim();
    })()
  );
});

// Push notification handler
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? { title: 'Trébrat', body: 'Nouvelle notification' };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow('/'));
});

// Reference CACHE_NAME so linters don't flag it; kept for clarity/versioning.
void CACHE_NAME;
