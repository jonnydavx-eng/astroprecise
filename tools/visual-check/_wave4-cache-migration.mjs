/**
 * Explore v814 -> v826 first-response migration proof.
 *
 * Runs a private local origin under a synthetic worker that reproduces the
 * live v814 failure mode: queries are canonicalized and ordinary assets are
 * cache-first. It seeds stale canonical Explore CSS, boot and nav responses,
 * proves those stale bytes win even with ?v=826, then loads the candidate and
 * proves its filename-versioned assets all miss that cache and execute.
 */
import http from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from './node_modules/playwright/index.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEBSITE = path.resolve(HERE, '..', '..', 'website');
const WINDOWS_CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const MARKERS = {
  css: '__WAVE4_STALE_CSS__',
  boot: '__WAVE4_STALE_BOOT__',
  nav: '__WAVE4_STALE_NAV__',
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function staleAssetBodies() {
  const css = readFileSync(path.join(WEBSITE, 'css', 'explore-page.css'), 'utf8');
  const boot = readFileSync(path.join(WEBSITE, 'js', 'explore-boot.js'), 'utf8');
  const nav = readFileSync(path.join(WEBSITE, 'js', 'ap-nav-model.js'), 'utf8')
    .replace("['explore.html', 'Sky Explorer']", "['explore.html', 'Sky Explorer', { badge: 'Live' }]");
  return {
    '/css/explore-page.css': {
      type: 'text/css; charset=utf-8',
      body: `/* ${MARKERS.css} */\n${css}`,
    },
    '/js/explore-boot.js': {
      type: 'text/javascript; charset=utf-8',
      body: `window.${MARKERS.boot} = true;\n${boot}`,
    },
    '/js/ap-nav-model.js': {
      type: 'text/javascript; charset=utf-8',
      body: `window.${MARKERS.nav} = true;\n${nav}`,
    },
  };
}

function legacyWorkerSource() {
  const seeded = JSON.stringify(staleAssetBodies());
  return `
const V = 'ap-v814';
const SEEDED = ${seeded};
function canonical(value) {
  const raw = value && value.url ? value.url : value;
  const url = new URL(raw, self.location.origin);
  url.search = '';
  url.hash = '';
  return new Request(url.href);
}
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(V).then(cache => Promise.all(Object.entries(SEEDED).map(([assetPath, asset]) =>
      cache.put(canonical(assetPath), new Response(asset.body, {
        status: 200,
        headers: { 'Content-Type': asset.type, 'X-Wave4-Seed': 'v814' }
      }))
    ))).then(() => self.skipWaiting())
  );
});
self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  const key = canonical(event.request);
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match(key)));
    return;
  }
  event.respondWith(caches.match(key).then(cached => cached || fetch(event.request)));
});
`;
}

const MIME = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};

function createServer(requestCounts) {
  const worker = legacyWorkerSource();
  return http.createServer((request, response) => {
    const url = new URL(request.url || '/', 'http://127.0.0.1');
    const pathname = decodeURIComponent(url.pathname);
    requestCounts.set(pathname, (requestCounts.get(pathname) || 0) + 1);

    if (pathname === '/__wave4-seed.html') {
      response.writeHead(200, {
        'Cache-Control': 'no-store',
        'Content-Type': 'text/html; charset=utf-8',
      });
      response.end('<!doctype html><meta charset="utf-8"><title>v814 seed</title>');
      return;
    }
    if (pathname === '/__wave4-old-sw.js') {
      response.writeHead(200, {
        'Cache-Control': 'no-store',
        'Content-Type': 'text/javascript; charset=utf-8',
        'Service-Worker-Allowed': '/',
      });
      response.end(worker);
      return;
    }

    const relative = pathname.replace(/^\/+/, '') || 'index.html';
    const resolved = path.resolve(WEBSITE, relative);
    if (resolved !== WEBSITE && !resolved.startsWith(WEBSITE + path.sep)) {
      response.writeHead(403).end('Forbidden');
      return;
    }
    if (!existsSync(resolved) || !statSync(resolved).isFile()) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
      return;
    }
    response.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Type': MIME[path.extname(resolved).toLowerCase()] || 'application/octet-stream',
    });
    response.end(readFileSync(resolved));
  });
}

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  assert(address && typeof address === 'object', 'migration server did not expose an address');
  return `http://127.0.0.1:${address.port}`;
}

async function main() {
  const requestCounts = new Map();
  const server = createServer(requestCounts);
  const origin = await listen(server);
  const launch = { headless: true, args: ['--enable-unsafe-swiftshader'] };
  const requestedChrome = process.env.AP_CHROME || WINDOWS_CHROME;
  if (existsSync(requestedChrome)) launch.executablePath = requestedChrome;

  let browser;
  try {
    browser = await chromium.launch(launch);
    const context = await browser.newContext({ serviceWorkers: 'allow' });
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message || String(error)));

    await page.goto(`${origin}/__wave4-seed.html`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(async () => {
      await navigator.serviceWorker.register('/__wave4-old-sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => navigator.serviceWorker.controller?.scriptURL.includes('__wave4-old-sw.js'));

    const stale = await page.evaluate(async () => {
      const paths = [
        '/css/explore-page.css?v=826',
        '/js/explore-boot.js?v=826',
        '/js/ap-nav-model.js?v=826',
      ];
      return Promise.all(paths.map(assetPath => fetch(assetPath).then(response => response.text())));
    });
    assert(stale[0].includes(MARKERS.css), 'seeded v814 worker did not return stale canonical CSS');
    assert(stale[1].includes(MARKERS.boot), 'seeded v814 worker did not return stale canonical boot JS');
    assert(stale[2].includes(MARKERS.nav), 'seeded v814 worker did not return stale canonical nav JS');

    requestCounts.clear();
    await page.goto(`${origin}/explore.html?wave4-migration=1`, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });
    await page.waitForFunction(() => window.AP_NAV && typeof window.__apParseModelHash === 'function');

    const state = await page.evaluate(() => {
      const pathOf = value => value ? new URL(value, document.baseURI).pathname : '';
      const explorer = window.AP_NAV.NAV_MORE_EXPLORE.find(item => item[0] === 'explore.html');
      return {
        controller: navigator.serviceWorker.controller?.scriptURL || '',
        cssPath: pathOf(document.querySelector('link[href*="explore-page-v"]')?.href),
        bootPath: pathOf(document.querySelector('script[src*="explore-boot-v"]')?.src),
        navPath: pathOf(document.querySelector('script[src*="ap-nav-model-v"]')?.src),
        staleBootExecuted: window.__WAVE4_STALE_BOOT__ === true,
        staleNavExecuted: window.__WAVE4_STALE_NAV__ === true,
        explorerBadge: explorer?.[2]?.badge || '',
        resources: performance.getEntriesByType('resource').map(entry => pathOf(entry.name)),
      };
    });

    const expected = [
      '/css/explore-page-v826.css',
      '/js/explore-boot-v826.js',
      '/js/ap-nav-model-v826.js',
    ];
    assert(state.controller.includes('__wave4-old-sw.js'), 'candidate was not controlled by the seeded v814 worker');
    assert(state.cssPath === expected[0], `candidate linked ${state.cssPath || 'no'} Explore CSS`);
    assert(state.bootPath === expected[1], `candidate linked ${state.bootPath || 'no'} Explore boot`);
    assert(state.navPath === expected[2], `candidate linked ${state.navPath || 'no'} nav model`);
    assert(!state.staleBootExecuted, 'candidate executed stale canonical Explore boot JS');
    assert(!state.staleNavExecuted, 'candidate executed stale canonical nav JS');
    assert(state.explorerBadge !== 'Live', 'candidate retained the pre-entry Live navigation claim');
    for (const assetPath of expected) {
      assert(state.resources.includes(assetPath), `candidate did not load ${assetPath} during navigation`);
      assert((requestCounts.get(assetPath) || 0) >= 1, `v814 cache prevented a network response for ${assetPath}`);
    }

    const delivered = await page.evaluate(async () => {
      const paths = [
        '/css/explore-page-v826.css?v=826',
        '/js/explore-boot-v826.js?v=826',
        '/js/ap-nav-model-v826.js?v=826',
      ];
      return Promise.all(paths.map(assetPath => fetch(assetPath).then(response => response.text())));
    });
    assert(!delivered[0].includes(MARKERS.css), 'versioned Explore CSS returned stale bytes');
    assert(!delivered[1].includes(MARKERS.boot), 'versioned Explore boot returned stale bytes');
    assert(!delivered[2].includes(MARKERS.nav), 'versioned nav model returned stale bytes');
    assert(delivered[0].includes('(max-height: 520px)'), 'delivered CSS lacks the phone-landscape fix');
    assert(delivered[1].includes('var webglIntent = !!resolveIntent();'), 'delivered boot lacks the Explore gate contract');
    assert(delivered[2].includes("['explore.html', 'Sky Explorer']"), 'delivered nav lacks Sky Explorer');
    assert(!delivered[2].includes("['explore.html', 'Sky Explorer', { badge: 'Live' }]"), 'delivered nav still claims Live');
    assert(pageErrors.length === 0, `candidate raised page errors: ${pageErrors.join(' | ')}`);

    console.log('PASS v814 migration: stale canonical cache reproduced; v826 CSS, boot and nav arrived from new paths');
    await context.close();
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}

main().catch(error => {
  console.error('[wave4-cache-migration]', error);
  process.exit(1);
});
