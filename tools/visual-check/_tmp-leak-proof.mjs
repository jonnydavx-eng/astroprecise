/* BLOCKER 1 proof harness — AstroPrecise homepage coupon.
 *
 * Serves website/ from a local origin that logs the RAW HTTP request line —
 * the exact bytes GitHub Pages and Cloudflare write into their access logs —
 * then drives a real Chromium through the homepage cast and reports:
 *
 *   1. every request line the server saw            (the origin/CDN log view)
 *   2. every request URL the browser sent           (the network-tab view)
 *   3. the address bar after the cast               (history / screenshot view)
 *   4. every Cache Storage key on the chart page    (sw.js:515 view)
 *   5. whether chart.html actually received date, time and city
 *
 * Run:  node leak-proof.mjs <label>
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const ROOT = 'C:\\Users\\jonny\\OneDrive\\astroprecise\\website';
const PORT = 8792;
const LABEL = process.argv[2] || 'run';

const DATE = '1901-02-03';
const TIME = '04:05';
const CITY = 'Testtown';
// Anything that could betray the birth details in a log line.
const NEEDLES = [DATE, '1901', TIME, '04%3A05', '04:05', CITY, 'Testtown'];

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.glb': 'model/gltf-binary', '.ico': 'image/x-icon', '.txt': 'text/plain',
  '.webmanifest': 'application/manifest+json',
};

const serverLog = [];
const server = http.createServer((req, res) => {
  serverLog.push(`${req.method} ${req.url}`);           // the request line
  const u = new URL(req.url, 'http://localhost');
  let p = decodeURIComponent(u.pathname);
  if (p.endsWith('/')) p += 'index.html';
  const file = path.join(ROOT, p);
  if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404, { 'content-type': 'text/plain' }).end('404'); return; }
    res.writeHead(200, {
      'content-type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'cache-control': 'no-store',
    });
    res.end(buf);
  });
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));

const browser = await chromium.launch({ channel: 'msedge' });
const ctx = await browser.newContext({ serviceWorkers: 'allow' });
const browserLog = [];
ctx.on('request', r => browserLog.push(`${r.method()} ${r.url()}`));
const page = await ctx.newPage();

await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'load', timeout: 60000 });
await page.waitForSelector('#f-date', { timeout: 20000 });

// Fill exactly as a visitor does.
await page.fill('#f-date', DATE);
await page.fill('#f-time', TIME);
await page.fill('#f-place', CITY);

const submit = page.locator('.coupon__card button[type="submit"]');
await Promise.all([
  page.waitForURL(/chart\.html/, { timeout: 30000 }).catch(() => {}),
  submit.click(),
]);
await page.waitForLoadState('load', { timeout: 60000 }).catch(() => {});
await page.waitForTimeout(3500);   // let chart-page.js boot + prefill run

const addressBar = page.url();

const filled = await page.evaluate(() => {
  const v = id => (document.getElementById(id) || {}).value ?? null;
  const note = document.getElementById('chart-handoff-note');
  return {
    date: v('date-input'), time: v('time-input'), city: v('city-input'),
    accuracy: v('time-accuracy-input'),
    note: note ? note.textContent.replace(/\s+/g, ' ').trim() : null,
    focused: document.activeElement ? document.activeElement.id : null,
  };
});

/* Give the service worker time to install and take control, then reload once —
   a return visit — so sw.js's navigation branch actually runs and writes its
   Cache Storage entry. That entry's KEY is the URL, which is the sw.js:515
   half of the leak. */
const swReady = await page.evaluate(() => Promise.race([
  navigator.serviceWorker ? navigator.serviceWorker.ready.then(() => 'active') : 'none',
  new Promise(r => setTimeout(() => r('timeout'), 45000)),
]).catch(e => 'error:' + e)).catch(() => 'eval-failed');
await page.waitForTimeout(1500);
await page.reload({ waitUntil: 'load', timeout: 60000 }).catch(() => {});
await page.waitForTimeout(3000);

const cacheKeys = await page.evaluate(async () => {
  if (!('caches' in window)) return [];
  const out = [];
  for (const n of await caches.keys()) {
    for (const req of await (await caches.open(n)).keys()) out.push(req.url);
  }
  return out;
});

await browser.close();
server.close();

const hit = s => NEEDLES.some(n => s.includes(n));
const chartLines = serverLog.filter(l => l.includes('chart.html'));
const leakyServer = serverLog.filter(hit);
const leakyBrowser = browserLog.filter(hit);
const leakyCache = cacheKeys.filter(hit);

const report = [
  `=========== ${LABEL} ===========`,
  `input: date=${DATE} time=${TIME} city=${CITY}`,
  ``,
  `--- 1. REQUEST LINES THE SERVER SAW for chart.html (origin + CDN access log) ---`,
  ...(chartLines.length ? chartLines.map(l => '    ' + l) : ['    (none)']),
  ``,
  `--- 2. request lines containing ANY birth detail (server side): ${leakyServer.length} ---`,
  ...leakyServer.map(l => '    ' + l),
  ``,
  `--- 3. browser requests containing ANY birth detail (network tab): ${leakyBrowser.length} ---`,
  ...leakyBrowser.map(l => '    ' + l),
  ``,
  `--- 4. address bar after the cast ---`,
  `    ${addressBar}`,
  ``,
  `--- 5. Cache Storage keys containing ANY birth detail (sw.js, serviceWorker=${swReady}): ${leakyCache.length} ---`,
  ...leakyCache.map(l => '    ' + l),
  `    (total cache keys: ${cacheKeys.length})`,
  ``,
  `--- 6. did chart.html receive the handoff? ---`,
  `    date-input  = ${JSON.stringify(filled.date)}`,
  `    time-input  = ${JSON.stringify(filled.time)}`,
  `    city-input  = ${JSON.stringify(filled.city)}`,
  `    accuracy    = ${JSON.stringify(filled.accuracy)}`,
  `    focus       = ${JSON.stringify(filled.focused)}`,
  `    note        = ${JSON.stringify(filled.note)}`,
  ``,
  `VERDICT: server-side leak=${leakyServer.length > 0} · browser-side leak=${leakyBrowser.length > 0} · cache leak=${leakyCache.length > 0}`,
  `         handoff intact=${filled.date === DATE && filled.time === TIME && filled.city === CITY}`,
  ``,
].join('\n');

console.log(report);
fs.writeFileSync(path.join(process.env.PROOF_OUT || '.', `proof-${LABEL}.txt`), report);
