/**
 * AstroPrecise Service Worker — cache-first offline support.
 * Shell + assets go to a versioned static cache on install.
 * Runtime requests use stale-while-revalidate for HTML, cache-first for assets.
 */

const V = 'ap-v2';

const PRECACHE = [
  './',
  './index.html',
  './chart.html',
  './horoscope.html',
  './compatibility.html',
  './transits.html',
  './ephemeris.html',
  './manifest.json',
  './css/main.css',
  './js/cosmos.js',
  './js/ephemeris.js',
  './js/orrery3d.js',
  './js/chart-render.js',
  './js/interpretations.js',
  './js/oracle.js',
  './js/profile.js',
  './js/app.js',
  './js/effects.js',
  './js/chart-page.js',
  './js/starcatalog.js',
  './js/lightcone.js',
  './js/echoes.js',
  './js/daimon.js',
  './js/fieldweather.js',
  './js/instrument.js',
  './img/logo.svg',
  './img/favicon.svg',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(V).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== V).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Only intercept same-origin GET requests
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  // External APIs (SWPC, ANU) — network-only, never cache
  if (url.hostname !== self.location.hostname) return;

  const isNav = e.request.mode === 'navigate';

  e.respondWith(
    caches.match(e.request).then(cached => {
      const networkFetch = fetch(e.request).then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(V).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => null);

      if (isNav) {
        // HTML: prefer network, fall back to cache
        return networkFetch.then(res => res || cached || caches.match('./index.html'));
      }
      // Assets: serve from cache immediately, revalidate in background
      return cached || networkFetch;
    })
  );
});
