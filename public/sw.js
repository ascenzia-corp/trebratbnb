const CACHE_NAME = 'trebrat-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Only handle same-origin GET requests.
  // Everything else (Supabase, Google APIs, POST, etc.) goes straight to the network
  // without interception — avoids "FetchEvent.respondWith received an error".
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // Navigation requests: network-first, fall back to cached index.html when offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match('/index.html').then((cached) => cached || Response.error())
      )
    );
    return;
  }

  // Static assets: network-first with cache fallback, cache successful responses
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then((cached) => cached || Response.error())
      )
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
  event.waitUntil(
    self.clients.openWindow('/')
  );
});
