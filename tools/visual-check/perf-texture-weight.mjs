/**
 * perf-texture-weight.mjs — homepage transfer-weight + LCP measurement for the
 * texture-diet work. Runs a throttled MOBILE pass (390x844, CPU 4x, Fast-3G net)
 * and a DESKTOP pass. Records per-request transfer bytes (grouped by texture/JS/
 * other), total homepage weight, LCP, console errors, and any 404s.
 *
 * Usage: node perf-texture-weight.mjs <label>   (label e.g. "before" / "after")
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = 'http://localhost:8790';
const LABEL = process.argv[2] || 'run';
const OUT = join(__dirname, 'out', 'redesign');

// Fast-3G-ish profile (Chrome DevTools "Fast 3G")
const FAST3G = {
  offline: false,
  downloadThroughput: (1.6 * 1024 * 1024) / 8, // 1.6 Mbps
  uploadThroughput: (750 * 1024) / 8,
  latency: 150,
};

function fmtKB(b) { return (b / 1024).toFixed(1); }

async function measure({ label, mobile }) {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    deviceScaleFactor: mobile ? 3 : 1,
    isMobile: mobile,
    hasTouch: mobile,
    userAgent: mobile
      ? 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36'
      : undefined,
  });
  const page = await ctx.newPage();
  const client = await ctx.newCDPSession(page);
  await client.send('Network.enable');
  if (mobile) {
    await client.send('Network.emulateNetworkConditions', FAST3G);
    await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  }

  const reqs = new Map(); // requestId -> {url, type}
  const results = [];
  const errors = [];
  const notFound = [];

  client.on('Network.requestWillBeSent', (e) => {
    reqs.set(e.requestId, { url: e.request.url, type: e.type });
  });
  client.on('Network.responseReceived', (e) => {
    const r = reqs.get(e.requestId);
    if (r) { r.status = e.response.status; r.mimeType = e.response.mimeType; }
    if (e.response.status === 404) notFound.push(e.response.url);
  });
  client.on('Network.loadingFinished', (e) => {
    const r = reqs.get(e.requestId);
    if (r) { r.encodedDataLength = e.encodedDataLength; results.push(r); }
  });

  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
  page.on('requestfailed', (req) => {
    const f = req.failure();
    // ignore benign aborts
    if (f && !/ERR_ABORTED/.test(f.errorText)) errors.push('REQFAIL ' + req.url() + ' ' + f.errorText);
  });

  const t0 = Date.now();
  await page.goto(`${BASE}/`, { waitUntil: 'load', timeout: 120000 });
  // Let textures stream + intro settle
  await page.waitForTimeout(mobile ? 12000 : 9000);
  const wallMs = Date.now() - t0;

  const lcp = await page.evaluate(() => new Promise((res) => {
    let last = null;
    try {
      const po = new PerformanceObserver((list) => {
        for (const e of list.getEntries()) last = e.startTime;
      });
      po.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (_) {}
    // also grab any already-buffered
    setTimeout(() => {
      try {
        const es = performance.getEntriesByType('largest-contentful-paint');
        if (es.length) last = es[es.length - 1].startTime;
      } catch (_) {}
      res(last);
    }, 400);
  }));

  const fcp = await page.evaluate(() => {
    const p = performance.getEntriesByType('paint').find((x) => x.name === 'first-contentful-paint');
    return p ? Math.round(p.startTime) : null;
  });

  // Categorise weight
  let total = 0;
  const byCat = { texture: 0, js: 0, css: 0, image: 0, other: 0 };
  const textureRows = [];
  for (const r of results) {
    const bytes = r.encodedDataLength || 0;
    total += bytes;
    const u = r.url;
    if (/\/assets\/textures\//.test(u)) {
      byCat.texture += bytes;
      textureRows.push({ file: u.split('/').pop(), kb: +fmtKB(bytes), status: r.status });
    } else if (/\.js(\?|$)/.test(u)) byCat.js += bytes;
    else if (/\.css(\?|$)/.test(u)) byCat.css += bytes;
    else if (/\.(png|jpe?g|webp|gif|svg)(\?|$)/.test(u)) byCat.image += bytes;
    else byCat.other += bytes;
  }

  await browser.close();
  return {
    label, mobile, wallMs,
    lcp: lcp ? Math.round(lcp) : null,
    fcp,
    totalKB: +fmtKB(total),
    byCatKB: Object.fromEntries(Object.entries(byCat).map(([k, v]) => [k, +fmtKB(v)])),
    textureRows: textureRows.sort((a, b) => b.kb - a.kb),
    errors,
    notFound,
    reqCount: results.length,
  };
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const mobile = await measure({ label: `${LABEL}-mobile`, mobile: true });
  const desktop = await measure({ label: `${LABEL}-desktop`, mobile: false });
  const out = { capturedAt: new Date().toISOString(), mobile, desktop };
  const path = join(OUT, `perf-weight-${LABEL}.json`);
  await writeFile(path, JSON.stringify(out, null, 2));
  console.log('\n===== MOBILE (390x844, CPU4x, Fast-3G) =====');
  console.log(`total=${mobile.totalKB}KB  textures=${mobile.byCatKB.texture}KB  js=${mobile.byCatKB.js}KB  LCP=${mobile.lcp}ms  FCP=${mobile.fcp}ms  reqs=${mobile.reqCount}`);
  console.log('top textures:', mobile.textureRows.slice(0, 14).map((t) => `${t.file}=${t.kb}KB(${t.status})`).join(', '));
  console.log('errors:', mobile.errors.length, mobile.errors.slice(0, 8));
  console.log('404s:', mobile.notFound);
  console.log('\n===== DESKTOP (1440x900) =====');
  console.log(`total=${desktop.totalKB}KB  textures=${desktop.byCatKB.texture}KB  LCP=${desktop.lcp}ms  reqs=${desktop.reqCount}`);
  console.log('top textures:', desktop.textureRows.slice(0, 14).map((t) => `${t.file}=${t.kb}KB(${t.status})`).join(', '));
  console.log('errors:', desktop.errors.length, desktop.errors.slice(0, 8));
  console.log('404s:', desktop.notFound);
  console.log('\nwrote', path);
}

main();
