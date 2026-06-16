/**
 * AstroPrecise Service Worker — cache-first offline support.
 * Shell + assets go to a versioned static cache on install.
 * Runtime requests use stale-while-revalidate for HTML, cache-first for assets.
 */

const V = 'ap-v219';

const PRECACHE = [
  './',
  './index.html',
  './chart.html',
  './horoscope.html',
  './compatibility.html',
  './transits.html',
  './ephemeris.html',
  './lifepath.html',
  './shop.html',
  './accuracy.html',
  './why.html',
  './links.html',
  './outreach.html',
  './js/outreach-content.js',
  './js/horoscope-engine.js',
  './charts.html',
  './retrograde.html',
  './moonphase.html',
  './what-is-my-rising-sign.html',
  './synastry.html',
  './solar-return.html',
  './saturn-return.html',
  './quiz.html',
  './angel-numbers.html',
  './tonight.html',
  './name-numerology.html',
  './privacy.html',
  './terms.html',
  './profile.html',
  './sample-reading.html',
  './404.html',
  './aries.html',
  './taurus.html',
  './gemini.html',
  './cancer.html',
  './leo.html',
  './virgo.html',
  './libra.html',
  './scorpio.html',
  './sagittarius.html',
  './capricorn.html',
  './aquarius.html',
  './pisces.html',
  './manifest.json',
  './css/main.css',
  './css/orrery-visual.css',
  './css/landing-gate.css',
  './css/fonts.css',
  './fonts/astro-glyphs.woff2',
  './fonts/cinzel-normal-400.woff2',
  './fonts/cinzel-normal-600.woff2',
  './fonts/cinzel-normal-700.woff2',
  './fonts/cormorant-garamond-normal-400.woff2',
  './fonts/cormorant-garamond-normal-500.woff2',
  './fonts/cormorant-garamond-normal-600.woff2',
  './fonts/cormorant-garamond-italic-400.woff2',
  './fonts/cormorant-garamond-italic-500.woff2',
  './fonts/inter-normal-300.woff2',
  './fonts/inter-normal-400.woff2',
  './fonts/inter-normal-500.woff2',
  './fonts/inter-normal-600.woff2',
  './fonts/ibm-plex-mono-normal-400.woff2',
  './js/raf-core.js',
  './js/cosmos.js',
  './js/ephemeris.js',
  './js/orrery-loader.js',
  './js/chart-render.js',
  './js/sign-daily.js',
  './js/horoscope-subscribe.js',
  './js/element-orbs.js',
  './js/home-sign-picker.js',
  './js/oracle.js',
  './js/profile.js',
  './js/app.js',
  './js/effects.js',
  './js/hero-instrument.js',
  './js/scale-journey-chapters.js',
  './js/scale-journey.js',
  './js/chart-page.js',
  './js/lightcone.js',
  './js/echoes.js',
  './js/daimon.js',
  './js/fieldweather.js',
  './js/instrument.js',
  './js/journey.js',
  './js/zodiac-sphere.js',
  './js/icons.js',
  './js/daily-transit.js',
  './js/charts-dashboard.js',
  './js/retrograde.js',
  './js/saturn-return.js',
  './js/moonphase.js',
  './js/seo-tools.js',
  './js/art-theme-library.js',
  './js/shop-commerce.js',
  './js/shop-art-themes.js',
  './js/shop-curated.js',
  './data/art-themes.json',
  './js/tool-cards.js',
  './css/shop.css',
  './css/chart.css',
  './js/affiliate-social.js',
  './js/quiz.js',
  './js/angel-numbers.js',
  './js/tonight.js',
  './js/name-numerology.js',
  './img/logo.svg',
  './img/favicon.svg',
  './img/icon-192.png',
  './img/icon-512.png',
  './img/icon-maskable-512.png',
  './img/og-banner-improved.jpg',
  './img/hero-cosmic-ref.jpg',
  './img/shop-product-cover.jpg',
  './img/shop/hero-banner.jpg',
  './img/shop/product-deep-reading.jpg',
  './img/shop/product-poster-pdf.jpg',
  './img/shop/product-bundle.jpg',
  './img/shop/product-two-skies.jpg',
  './img/shop/product-gift-reading.jpg',
  './img/shop/product-gift-box.jpg',
  './img/shop/product-natal-poster.jpg',
  './img/shop/product-big-three.jpg',
  './img/shop/product-sky-tee.jpg',
  './img/shop/product-sky-hoodie.jpg',
  './img/shop/product-mug.jpg',
  './img/shop/product-year-ahead.jpg',
  './img/shop/product-solar-return.jpg',
  './img/shop/cat-books.jpg',
  './img/shop/cat-crystals.jpg',
  './img/shop/cat-oracle.jpg',
  './img/shop/cat-jewelry.jpg',
  './img/shop/cat-prints.jpg',
  './img/zodiac-glyphs-all.jpg',
  './img/zodiac-glyphs-row.jpg',
  './img/zodiac-glyphs-grid.jpg',
  './assets/textures/earth_sm.jpg',
  './assets/textures/earth_clouds_sm.jpg',
  './assets/textures/earth_specular_sm.jpg',
  './assets/textures/earth_normal_sm.jpg',
  './assets/textures/earth_lights_sm.png',
  './assets/textures/moon_sm.jpg',
  './assets/textures/mercury_sm.jpg',
  './assets/textures/venus_sm.jpg',
  './assets/textures/mars_sm.jpg',
  './assets/textures/jupiter_sm.jpg',
  './assets/textures/saturn_sm.jpg',
  './assets/textures/saturn_ring_sm.png',
  './assets/textures/uranus_sm.jpg',
  './assets/textures/neptune_sm.jpg',
  './assets/images/zodiac-cards/aries.jpg',
  './assets/images/zodiac-cards/taurus.jpg',
  './assets/images/zodiac-cards/gemini.jpg',
  './assets/images/zodiac-cards/cancer.jpg',
  './assets/images/zodiac-cards/leo.jpg',
  './assets/images/zodiac-cards/virgo.jpg',
  './assets/images/zodiac-cards/libra.jpg',
  './assets/images/zodiac-cards/scorpio.jpg',
  './assets/images/zodiac-cards/sagittarius.jpg',
  './assets/images/zodiac-cards/capricorn.jpg',
  './assets/images/zodiac-cards/aquarius.jpg',
  './assets/images/zodiac-cards/pisces.jpg',
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
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const isCritical = /\/(js\/app\.js|css\/main\.css)$/.test(path);

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
      if (isCritical) {
        // app.js + main.css: network-first so email/intro fixes reach users promptly
        return networkFetch.then(res => res || cached);
      }
      // Other assets: cache-first, revalidate in background
      return cached || networkFetch;
    })
  );
});
