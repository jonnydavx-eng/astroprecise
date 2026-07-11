// Full-audit capture: home + observatory, desktop + mobile, with error capture.
// Run from tools/visual-check:  node _audit-shot.mjs
import { chromium } from 'playwright';
import fs from 'fs';

const BASE = process.env.BASE || 'http://127.0.0.1:8790';
const OUT = 'out/audit-2026-07-11';
fs.mkdirSync(OUT, { recursive: true });
const MOB_UA = 'Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';

const b = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader-webgl', '--disable-blink-features=AutomationControlled'],
});

const report = {};

async function grab(name, url, vp, opts = {}) {
  const ctx = await b.newContext({
    viewport: { width: vp.w, height: vp.h },
    isMobile: vp.mobile, hasTouch: vp.mobile,
    deviceScaleFactor: vp.mobile ? 2 : 1,
    userAgent: vp.mobile ? MOB_UA : undefined,
    serviceWorkers: 'block',
    colorScheme: 'dark',
  });
  const p = await ctx.newPage();
  const errs = [];
  const warns = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 240)); else if (m.type() === 'warning') warns.push(m.text().slice(0, 160)); });
  p.on('pageerror', (e) => errs.push('PAGEERROR: ' + String(e).slice(0, 240)));
  p.on('requestfailed', (r) => errs.push('REQFAIL: ' + r.url().slice(0, 120) + ' ' + (r.failure()?.errorText || '')));
  await p.addInitScript(() => { try { localStorage.setItem('ap_intro_complete', '1'); } catch (e) {} });
  try {
    await p.goto(url, { waitUntil: 'load', timeout: 60000 });
  } catch (e) { errs.push('GOTO: ' + String(e).slice(0, 160)); }
  await p.waitForTimeout(opts.settle || 3200);
  if (opts.pre) { try { await opts.pre(p); } catch (e) { errs.push('PRE: ' + String(e).slice(0, 160)); } }
  await p.waitForTimeout(opts.after || 600);
  const metrics = await p.evaluate(() => {
    const long = performance.getEntriesByType('resource').filter(r => /\.(js|css|webp|png|woff2)$/.test(r.name));
    const totalKB = Math.round(long.reduce((s, r) => s + (r.transferSize || r.encodedBodySize || 0), 0) / 1024);
    return {
      canvases: [...document.querySelectorAll('canvas')].map(c => ({ id: c.id || c.className, w: c.width, h: c.height })).slice(0, 6),
      reqCount: performance.getEntriesByType('resource').length,
      transferKB: totalKB,
      dcl: Math.round(performance.timing ? (performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart) : 0),
      heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null,
    };
  }).catch(() => ({}));
  await p.screenshot({ path: `${OUT}/${name}.png`, fullPage: !!opts.fullPage });
  report[name] = { url, vp, errs, warns: warns.slice(0, 6), metrics };
  await ctx.close();
}

const D = { w: 1280, h: 800, mobile: false };
const M = { w: 390, h: 844, mobile: true };

// Home
await grab('home-desktop', `${BASE}/index.html`, D, { settle: 4200 });
await grab('home-mobile', `${BASE}/index.html`, M, { settle: 4200 });
await grab('home-desktop-full', `${BASE}/index.html`, D, { settle: 4200, fullPage: true });

// Observatory — intro state
await grab('obs-desktop-intro', `${BASE}/observatory.html`, D, { settle: 2600 });
await grab('obs-mobile-intro', `${BASE}/observatory.html`, M, { settle: 2600 });
// Observatory — looked-through (click "Look through the lens")
const lookThrough = async (p) => {
  await p.click('#obs-look', { timeout: 4000 }).catch(async () => { await p.click('#obs-eyepiece', { timeout: 4000 }); });
  await p.waitForTimeout(2600);
};
await grab('obs-desktop-open', `${BASE}/observatory.html`, D, { settle: 2200, pre: lookThrough, after: 400 });
await grab('obs-mobile-open', `${BASE}/observatory.html`, M, { settle: 2200, pre: lookThrough, after: 400 });

await b.close();
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
// compact console summary
for (const [k, v] of Object.entries(report)) {
  console.log(`\n== ${k} ==  reqs=${v.metrics.reqCount} transfer=${v.metrics.transferKB}KB heap=${v.metrics.heapMB}MB canvases=${JSON.stringify(v.metrics.canvases)}`);
  if (v.errs.length) console.log('  ERRORS:', v.errs.slice(0, 8).join(' | '));
  else console.log('  (no console errors)');
}
console.log('\nSaved to', OUT);
