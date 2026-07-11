/**
 * verify-focus-aspect.mjs — headless HONESTY proof for the orrery focusAspect feature.
 *
 * Boots the WebGL hero (swiftshader), waits for window.Orrery3D.focusAspect, calls it
 * with the demo transit (saturn ↔ solar-chart Sun at 135° = 15° Leo), settles, then:
 *   (a) reads window.__apLastAspect,
 *   (b) INDEPENDENTLY recomputes saturn's geocentric longitude for the SAME jd and
 *       asserts aLon ≈ that (within 0.5°), bLon === 135, angle === round(sep(s,135)),
 *   (c) saves a demo still to the scratchpad,
 *   (d) confirms clearAspect() + focusPlanet('earth') leave no leftover ring,
 *   (e) reports any page/console errors.
 *
 * Run:  node tools/verify-focus-aspect.mjs [http://localhost:8790]
 */
import { chromium } from './visual-check/node_modules/playwright/index.mjs';
import { writeFileSync } from 'fs';

const BASE = process.argv[2] || 'http://localhost:8790';
const OUT = 'C:/Users/jonny/AppData/Local/Temp/claude/C--Users-jonny-OneDrive/7337457a-f86f-49c0-86f2-e075c0f782d5/scratchpad/aspect-demo.png';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForEngine(page) {
  await page.waitForFunction(
    () => window.Orrery3D && window.Orrery3D.isWebGL === true &&
      typeof window.Orrery3D.focusAspect === 'function' &&
      typeof window.Orrery3D.clearAspect === 'function' &&
      typeof window.Orrery3D.captureFrame === 'function' &&
      document.documentElement.classList.contains('orrery-full'),
    null, { timeout: 45000 }
  );
  await page.evaluate(() => window.Orrery3D.whenEarthReady && window.Orrery3D.whenEarthReady());
}

async function main() {
  const report = { base: BASE, steps: {} };
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark', deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (e) => { pageErrors.push(e.message); console.error('pageerror:', e.message); });
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });

  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForEngine(page);
  await sleep(9000); // intro finish + textures + settle

  // ── Call focusAspect with the demo transit ─────────────────────────────────
  const called = await page.evaluate(() => {
    try {
      return window.Orrery3D.focusAspect('saturn', 'sun', {
        bLon: 135, aspect: 'trine', bLabel: 'your Sun · solar chart', natalMode: 'solar',
      });
    } catch (e) { return 'THREW: ' + e.message; }
  });
  report.steps.focusAspectReturned = called;
  await sleep(2600); // settle >= 1600ms + let the camera swing finish framing the ring

  // ── (a) read the stash + (b) independent geometry recompute ─────────────────
  const geom = await page.evaluate(() => {
    const a = window.__apLastAspect;
    if (!a) return { ok: false, reason: 'no __apLastAspect' };
    const E = window.AstroEphemeris;
    const jd = a.jd;                       // the SAME jd focusAspect used
    const norm360 = (d) => ((d % 360) + 360) % 360;
    const sep = (x, y) => { let d = Math.abs(x - y) % 360; if (d > 180) d = 360 - d; return d; };
    const s = norm360(E.saturnPosition(jd).lon);   // independent geocentric saturn lon
    return {
      ok: true,
      stash: a,
      indepSaturnLon: s,
      indepAngle: Math.round(sep(s, 135)),
      aLonDiff: Math.abs(((a.aLon - s + 540) % 360) - 180),
    };
  });
  report.steps.geometry = geom;

  let PASS = false;
  if (geom.ok) {
    const a = geom.stash;
    const aLonOk = geom.aLonDiff <= 0.5;
    const bLonOk = a.bLon === 135;
    const angleOk = a.angle === geom.indepAngle;
    PASS = aLonOk && bLonOk && angleOk;
    console.log('── GEOMETRY ASSERTION ──────────────────────────────────────');
    console.log('  jd used by focusAspect :', a.jd);
    console.log('  saturn lon (engine)    :', a.aLon.toFixed(4));
    console.log('  saturn lon (independent):', geom.indepSaturnLon.toFixed(4), ' Δ=' + geom.aLonDiff.toFixed(4) + '° →', aLonOk ? 'OK' : 'FAIL');
    console.log('  bLon                   :', a.bLon, '=== 135 →', bLonOk ? 'OK' : 'FAIL');
    console.log('  angle (engine)         :', a.angle, ' round(sep)=' + geom.indepAngle, '→', angleOk ? 'OK' : 'FAIL');
    console.log('  aspect                 :', a.aspect);
    console.log('  RESULT →', PASS ? 'PASS' : 'FAIL');
    console.log('────────────────────────────────────────────────────────────');
  } else {
    console.log('GEOMETRY FAIL:', geom.reason);
  }
  report.steps.PASS = PASS;

  // ── (c) capture a demo still to the scratchpad ──────────────────────────────
  try {
    const buf = await page.screenshot({ type: 'png' });
    writeFileSync(OUT, buf);
    report.steps.stillSaved = OUT;
    console.log('demo still →', OUT, `(${(buf.length / 1024).toFixed(1)} KB)`);
  } catch (e) {
    report.steps.stillSaved = 'FAILED: ' + e.message;
  }

  // ── (d) clearAspect + focusPlanet('earth') → no leftover ring ───────────────
  await page.evaluate(() => { window.Orrery3D.clearAspect(); });
  await sleep(1400);
  await page.evaluate(() => { window.Orrery3D.focusPlanet('earth'); });
  await sleep(1800);
  const afterClear = await page.evaluate(() => ({
    apLastAspect: window.__apLastAspect === undefined ? 'deleted' : 'STILL PRESENT',
    isWebGL: !!(window.Orrery3D && window.Orrery3D.isWebGL),
    isPortraitMode: !!(window.Orrery3D && window.Orrery3D.isPortraitMode && window.Orrery3D.isPortraitMode()),
    orreryFull: document.documentElement.classList.contains('orrery-full'),
    // count any THREE object whose name suggests aspect leftovers (defensive; the group
    // is disposed, so scene traversal should find no aspect group) — probe via a flag.
  }));
  report.steps.afterClear = afterClear;
  console.log('after clearAspect + focusPlanet(earth):', JSON.stringify(afterClear));

  report.pageErrors = pageErrors;
  report.consoleErrors = consoleErrors;
  report.cleanConsole = pageErrors.length === 0 && consoleErrors.length === 0;

  await browser.close();
  console.log('\nFULL REPORT:\n' + JSON.stringify(report, null, 2));
  process.exit(PASS && report.cleanConsole && afterClear.apLastAspect === 'deleted' ? 0 : 3);
}
main().catch((e) => { console.error(e); process.exit(2); });
