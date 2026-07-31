const CACHE_NAME = 'qrvault-cache-v12';
const PRECACHE_URLS = [
  './',
  './index.html',
  './products.html',
  './manifest.json',
  './css/styles.css',
  './js/error-handler.js',
  './js/app.js',
  './js/db.js',
  './js/products-data.js',
  './js/products.js',
  './js/sw-update.js',
  './icons/icon.svg',
  './vendor/qrcode.min.js',
  './vendor/html5-qrcode.min.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  // No self.skipWaiting() here on purpose: the new worker stays in
  // "waiting" state until the page asks it to take over (see
  // js/sw-update.js), so users get an "Actualizar" prompt instead of
  // silently running mixed old/new assets mid-session.
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
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
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return; // no interceptar CDNs externos

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
    })
  );
});
