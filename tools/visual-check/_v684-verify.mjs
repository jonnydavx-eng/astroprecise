/* v684 — OrbitLab engine sync (masterplan Phase 1) verification.
 * Run from repo root: node tools/visual-check/_v684-verify.mjs
 * Gates:
 *  1. Homepage poster → live WebGL boot, html.orrery-full lands, zero console errors.
 *  2. Deck buttons revealed (scale strip / orbits / journey) — loader feature-detect.
 *  3. getBodyReadout detected + readout panel actually renders sign text.
 *  4. Scale walk 0–6 — zero console errors at every level; Milky Way/Cosmos must not
 *     throw with window.GaiaSample absent (no page loads gaia-sample.js yet).
 *  5. Time-scrub (#lite-scrub → setTimelineDays) moves the engine date.
 *  6. whenEarthReady present + resolves (poster cross-fade path, no 1400ms pop).
 *  7. explore.html boots clean (zero console errors).
 *  8. 390px phone emulation: IS_PHONE DPR clamp — canvas backing/CSS ratio ≤ 1.6.
 */
import { chromium } from 'playwright';
import fs from 'fs';

const out = 'tools/visual-check/out/v684';
fs.mkdirSync(out, { recursive: true });
const BASE = 'http://127.0.0.1:8790';
const b = await chromium.launch({ args: ['--disable-gpu', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });

const failures = [];
function gate(name, ok, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failures.push(name);
}

function watch(page, errors) {
  page.on('pageerror', (e) => errors.push('pageerror: ' + String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
}

async function freshPage(ctx, url) {
  const p = await ctx.newPage();
  const errors = [];
  watch(p, errors);
  await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await p.evaluate(async () => {
    try { for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister(); } catch (e) {}
    try { for (const k of await caches.keys()) await caches.delete(k); } catch (e) {}
  });
  errors.length = 0; // only count errors from the clean reload onward
  await p.reload({ waitUntil: 'domcontentloaded' });
  return { p, errors };
}

/* ── 1–6: homepage desktop ────────────────────────────────────────────── */
{
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const { p, errors } = await freshPage(ctx, BASE + '/');

  let booted = true;
  try {
    await p.waitForFunction(
      () => window.Orrery3D && document.documentElement.classList.contains('orrery-full'),
      null, { timeout: 60000 },
    );
  } catch (e) { booted = false; }
  gate('home: WebGL boot + html.orrery-full', booted);
  await p.waitForTimeout(1200);

  const boot = await p.evaluate(() => {
    const O = window.Orrery3D || {};
    const c = document.getElementById('orrery-canvas');
    return {
      isWebGL: O.isWebGL !== false,
      canvas: !!c,
      stripShown: !document.getElementById('ap-scale-strip')?.hidden,
      journeyShown: !document.getElementById('ap-cosmic-journey')?.hidden,
      orbitsShown: !document.getElementById('ap-orbits-toggle')?.hidden,
      hasReadoutApi: typeof O.getBodyReadout === 'function',
      hasScaleApi: typeof O.setScaleLevel === 'function' && typeof O.getScaleLevel === 'function',
      hasJourneyApi: typeof O.startScaleJourney === 'function',
      hasEarthReady: typeof O.whenEarthReady === 'function',
      hasTimeline: typeof O.setTimelineDays === 'function',
      gaiaGlobal: typeof window.GaiaSample,
    };
  });
  gate('home: engine is WebGL (not 2D fallback)', boot.isWebGL && boot.canvas);
  gate('home: deck buttons revealed (strip/journey/orbits)', boot.stripShown && boot.journeyShown && boot.orbitsShown,
    JSON.stringify({ strip: boot.stripShown, journey: boot.journeyShown, orbits: boot.orbitsShown }));
  gate('home: feature-detect APIs (scale/journey/readout/earthReady/timeline)',
    boot.hasScaleApi && boot.hasJourneyApi && boot.hasReadoutApi && boot.hasEarthReady && boot.hasTimeline);
  gate('home: window.GaiaSample deliberately absent', boot.gaiaGlobal === 'undefined', boot.gaiaGlobal);

  const earthReady = await p.evaluate(() =>
    Promise.race([
      window.Orrery3D.whenEarthReady().then(() => true),
      new Promise((r) => setTimeout(() => r(false), 8000)),
    ]),
  );
  gate('home: whenEarthReady resolves (cross-fade, no 1400ms pop)', earthReady === true);

  // Readout panel renders real sign text
  const readout = await p.evaluate(() => {
    try { window.Orrery3D.setScaleLevel(1); } catch (e) {}
    document.dispatchEvent(new CustomEvent('orrery-planet-focus', { detail: { id: 'mars' } }));
    const el = document.getElementById('ap-orrery-readout');
    const r = window.Orrery3D.getBodyReadout('mars');
    return {
      apiSign: r && r.sign, apiDeg: r && r.degreeWhole,
      panelShown: !!el && !el.hidden,
      panelText: el ? el.textContent.replace(/\s+/g, ' ').trim() : '',
    };
  });
  gate('home: getBodyReadout returns sign', !!readout.apiSign, `mars in ${readout.apiSign} ${readout.apiDeg}°`);
  gate('home: readout panel renders', readout.panelShown && /in /.test(readout.panelText), readout.panelText);

  // Scale walk 0–6
  const perLevel = [];
  for (let lv = 0; lv <= 6; lv++) {
    const before = errors.length;
    await p.evaluate((l) => window.Orrery3D.setScaleLevel(l), lv);
    await p.waitForTimeout(1600); // idle-scheduled galaxy builds fire in here
    const got = await p.evaluate(() => window.Orrery3D.getScaleLevel());
    const newErrs = errors.slice(before);
    perLevel.push({ lv, got, errs: newErrs });
    gate(`home: scale level ${lv} (engine says ${got})`, got === lv && newErrs.length === 0,
      newErrs.length ? newErrs[0] : '');
  }
  const gaiaCount = await p.evaluate(() =>
    typeof window.Orrery3D.getGaiaSampleCount === 'function' ? window.Orrery3D.getGaiaSampleCount() : 'n/a');
  gate('home: gaia layer degraded cleanly at 5/6 (count 0, no worker)', gaiaCount === 0 || gaiaCount === 'n/a', `count=${gaiaCount}`);
  await p.screenshot({ path: `${out}/home-scale6.png` });

  // Time-scrub through the real UI control
  await p.evaluate(() => window.Orrery3D.setScaleLevel(1));
  await p.waitForTimeout(600);
  const scrub = await p.evaluate(async () => {
    const O = window.Orrery3D;
    const el = document.getElementById('lite-scrub');
    const d0 = +O.getDate();
    if (el) {
      el.value = '400';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      O.setTimelineDays(400);
    }
    await new Promise((r) => setTimeout(r, 900));
    const d1 = +O.getDate();
    return { hasEl: !!el, deltaDays: (d1 - d0) / 86400000 };
  });
  gate('home: time-scrub moves engine date (~+400d)', scrub.deltaDays > 300 && scrub.deltaDays < 500,
    `via ${scrub.hasEl ? '#lite-scrub' : 'API'}, delta ${Math.round(scrub.deltaDays)}d`);

  gate('home: zero console errors end-to-end', errors.length === 0, errors.slice(0, 3).join(' | '));
  await p.screenshot({ path: `${out}/home-final.png` });
  fs.writeFileSync(`${out}/home-levels.json`, JSON.stringify({ perLevel, errors }, null, 2));
  await ctx.close();
}

/* ── 7: explore.html ──────────────────────────────────────────────────── */
{
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const { p, errors } = await freshPage(ctx, BASE + '/explore.html');
  let booted = true;
  try {
    await p.waitForFunction(() => !!window.Orrery3D, null, { timeout: 30000 });
  } catch (e) {
    // webdriver audit-gate can suppress lite auto-boot — drive the loader directly
    try {
      await p.evaluate(() => window.__loadOrreryEngine && window.__loadOrreryEngine());
      await p.waitForFunction(() => !!window.Orrery3D, null, { timeout: 30000 });
    } catch (e2) { booted = false; }
  }
  await p.waitForTimeout(2500);
  const ex = await p.evaluate(() => ({
    webgl: window.Orrery3D && window.Orrery3D.isWebGL !== false,
    canvas: !!document.getElementById('orrery-canvas'),
  }));
  gate('explore: engine boots', booted && ex.canvas, JSON.stringify(ex));
  gate('explore: zero console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await p.screenshot({ path: `${out}/explore.png` });
  await ctx.close();
}

/* ── 8: 390px phone — IS_PHONE DPR ≤ 1.6 clamp ───────────────────────── */
{
  const ctx = await b.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2.75, // S24-class
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36',
  });
  const { p, errors } = await freshPage(ctx, BASE + '/');
  let booted = true;
  try {
    await p.waitForFunction(
      () => window.Orrery3D && document.documentElement.classList.contains('orrery-full'),
      null, { timeout: 60000 },
    );
  } catch (e) {
    try {
      await p.evaluate(() => window.__loadOrreryEngine && window.__loadOrreryEngine());
      await p.waitForFunction(() => window.Orrery3D && !!document.getElementById('orrery-canvas'), null, { timeout: 30000 });
    } catch (e2) { booted = false; }
  }
  await p.waitForTimeout(1500);
  const m = booted ? await p.evaluate(() => {
    const c = document.getElementById('orrery-canvas');
    const r = c && c.getBoundingClientRect();
    return {
      isPhone: matchMedia('(pointer: coarse)').matches && matchMedia('(max-width: 820px)').matches,
      dpr: window.devicePixelRatio,
      backingW: c && c.width, cssW: r && Math.round(r.width),
      ratio: c && r && r.width ? +(c.width / r.width).toFixed(3) : null,
      webgl: window.Orrery3D && window.Orrery3D.isWebGL !== false,
    };
  }) : {};
  gate('mobile390: booted', booted, JSON.stringify(m));
  gate('mobile390: IS_PHONE media conditions hold', m.isPhone === true, `dpr=${m.dpr}`);
  gate('mobile390: DPR clamp ≤ 1.6 (backing/CSS)', m.ratio != null && m.ratio <= 1.61 && m.ratio < m.dpr,
    `canvas ${m.backingW}px backing / ${m.cssW}px css = ${m.ratio} (device dpr ${m.dpr})`);
  gate('mobile390: zero console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await p.screenshot({ path: `${out}/mobile-390.png` });
  fs.writeFileSync(`${out}/mobile-390.json`, JSON.stringify({ m, errors }, null, 2));
  await ctx.close();
}

await b.close();
console.log(failures.length ? `\nFAIL v684 verify — ${failures.length} gate(s): ${failures.join('; ')}` : '\nPASS v684 verify — all gates');
process.exit(failures.length ? 1 : 0);
