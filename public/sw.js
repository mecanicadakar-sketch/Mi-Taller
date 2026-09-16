const CACHE_NAME = 'tallerya-pwa-v3';
const ASSETS_TO_CACHE = [
  '/',
  '/?portal=cliente',
  '/index.html',
  '/manifest.json',
  '/manifest-cliente.json',
  '/pwa-192.png',
  '/pwa-512.png',
  '/apple-touch-icon.png',
  '/icon.png',
  '/icon.jpg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
