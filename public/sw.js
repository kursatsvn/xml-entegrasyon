// Sopyo Pro PWA Service Worker (Network-first for pages, Network-only for /api/*)
const CACHE_NAME = 'sopyo-pro-static-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(['/manifest.webmanifest']).catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Canlı stok, fiyat ve pazaryeri API verilerini asla önbellekten dönme
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Sadece statik ikon/manifest/next-static varlıkları ağ öncelikli önbellekle
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/pwa-icon') ||
    url.pathname === '/manifest.webmanifest'
  ) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, clone)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(request))
    );
  }
});
