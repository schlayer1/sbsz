// Self-healing Service Worker for SBSZ IHK-Prüfungsportal
// Cleans up legacy caches to prevent Safari white-screen hangs on new deployments.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((key) => caches.delete(key)));
    }).then(() => self.clients.claim())
  );
});

// We do NOT intercept fetch calls with aggressive cache-first or stale-while-revalidate,
// allowing Vite module imports and Vercel CDN deployments to load reliably on all browsers (especially Safari).

