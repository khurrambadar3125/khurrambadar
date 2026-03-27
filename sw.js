// KRM Service Worker — enables PWA install + offline caching
const CACHE_NAME = 'krm-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/news.html',
  '/signals.html',
  '/manifest.json',
];

// Install: cache core assets
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for HTML/API, cache-first for static
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // API calls: always network, never cache
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // HTML pages: network first, fall back to cache
  if (e.request.mode === 'navigate' || e.request.headers.get('accept')?.includes('text/html')) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Everything else: cache first, fall back to network
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});
