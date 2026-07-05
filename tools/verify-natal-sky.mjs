/**
 * verify-natal-sky.mjs — headless HONESTY proof for the NATAL "show me in the sky"
 * button on the personalised daily card (modelled on verify-focus-aspect.mjs).
 *
 * Seeds localStorage with a fake saved chart via the light path daily-transit.js
 * reads (ap_natal_pins { name, sunSign, points: { sun: 142.3, moon: 80 } }),
 * loads the homepage under SwiftShader, then:
 *   (a) confirms home-daily.js mounts the PERSONALISED DailyTransit card (.dt-card)
 *       with the new natal sky button,
 *   (b) asserts the button's bLon is the chart's REAL seeded longitude for the
 *       natal planet it targets (142.3 for Sun / 80 for Moon) — NOT the 135°
 *       Leo sign-midpoint a solar chart would use — and that the label says
 *       'natal' (never 'solar chart'),
 *   (c) clicks it and asserts window.__apLastAspect carries that same real bLon,
 *       natalMode 'natal', and an internally-consistent angle,
 *   (d) confirms the "Save this view" affordance appears while the aspect view is
 *       active, produces a nonzero PNG via captureFrame (window.__apLastCapture
 *       hook), and disappears once the aspect view retires,
 *   (e) reports any page/console errors.
 *
 * Run:  node tools/verify-natal-sky.mjs [http://localhost:8790]
 */
import { chromium } from './visual-check/node_modules/playwright/index.mjs';

const BASE = process.argv[2] || 'http://localhost:8790';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SEED = { name: 'Test', sunSign: 'Leo', points: { sun: 142.3, moon: 80 }, savedAt: 1 };
const SEEDED = { Sun: 142.3, Moon: 80 };

async function waitForEngine(page) {
  await page.waitForFunction(
    () => window.Orrery3D && window.Orrery3D.isWebGL === true &&
      typeof window.Orrery3D.focusAspect === 'function' &&
      typeof window.Orrery3D.captureFrame === 'function' &&
      document.documentElement.classList.contains('orrery-full'),
    null, { timeout: 45000 }
  );
  await page.evaluate(() => window.Orrery3D.whenEarthReady && window.Orrery3D.whenEarthReady());
}

async function main() {
  const report = { base: BASE, steps: {} };
  const checks = [];
  const check = (name, ok, detail) => {
    checks.push({ name, ok: !!ok, detail });
    console.log(`  [${ok ? 'OK  ' : 'FAIL'}] ${name}${detail != null ? ' — ' + detail : ''}`);
    return !!ok;
  };

  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark', deviceScaleFactor: 1 });
  await ctx.addInitScript((seed) => {
    try { localStorage.setItem('ap_natal_pins', JSON.stringify(seed)); } catch (e) {}
  }, SEED);
  const page = await ctx.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (e) => { pageErrors.push(e.message); console.error('pageerror:', e.message); });
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('download', (d) => { d.cancel().catch(() => {}); }); // a[download] data-URL click

  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForEngine(page);
  await sleep(9000); // intro finish + textures + settle (matches verify-focus-aspect)

  // ── (a) the personalised card + natal sky button render ─────────────────────
  await page.evaluate(() => {
    const el = document.getElementById('dailyChapter');
    if (el) el.scrollIntoView();
  });
  await page.waitForSelector('#daily-transit-card .dt-card', { timeout: 30000 });
  console.log('── PERSONALISED CARD ───────────────────────────────────────');
  const btn = await page.waitForSelector('#daily-transit-card .home-daily__sky-btn', { timeout: 15000 })
    .then(() => page.evaluate(() => {
      const b = document.querySelector('#daily-transit-card .home-daily__sky-btn');
      return {
        planet: b.getAttribute('data-sky-planet'),
        aspect: b.getAttribute('data-sky-aspect'),
        blon: parseFloat(b.getAttribute('data-sky-blon')),
        blabel: b.getAttribute('data-sky-blabel'),
        text: (b.textContent || '').replace(/\s+/g, ' ').trim(),
      };
    }))
    .catch(() => null);
  report.steps.button = btn;
  check('personalised card rendered with natal sky button', !!btn, btn && btn.text);
  if (!btn) { await browser.close(); process.exit(3); }

  // ── (b) bLon is the REAL seeded natal longitude, labelled natal ─────────────
  const m = /your (\w+) · natal/.exec(btn.blabel || '');
  const target = m ? m[1] : null;
  const expected = target ? SEEDED[target] : null;
  console.log('── BUTTON HONESTY ──────────────────────────────────────────');
  check('label names a natal target', !!target, btn.blabel);
  check('label says natal, never solar', /natal/.test(btn.blabel) && !/solar/i.test(btn.blabel), btn.blabel);
  check('bLon === seeded real longitude for ' + target, expected != null && Math.abs(btn.blon - expected) < 1e-9,
    `bLon=${btn.blon} expected=${expected}`);
  check('bLon is NOT the 135° Leo sign-midpoint', btn.blon !== 135, `bLon=${btn.blon}`);
  check('bLon is not any sign midpoint', Math.abs((btn.blon % 30) - 15) > 1e-9, `deg-in-sign=${(btn.blon % 30).toFixed(2)}`);

  // ── (c) click → engine draws the aspect with that real longitude ────────────
  await page.evaluate(() => document.querySelector('#daily-transit-card .home-daily__sky-btn').click());
  await sleep(2600); // scroll + camera swing + settle
  const stash = await page.evaluate(() => window.__apLastAspect || null);
  report.steps.stash = stash;
  console.log('── ENGINE STASH (__apLastAspect) ───────────────────────────');
  check('__apLastAspect present after click', !!stash);
  if (stash) {
    const sep = (x, y) => { let d = Math.abs(x - y) % 360; if (d > 180) d = 360 - d; return d; };
    check('stash.bLon ≈ ' + expected + ' (real natal longitude)', Math.abs(stash.bLon - expected) < 1e-6,
      `bLon=${stash.bLon}`);
    check('stash.natalMode === "natal"', stash.natalMode === 'natal', String(stash.natalMode));
    check('stash.bLabel says natal', /natal/.test(stash.bLabel || '') && !/solar/i.test(stash.bLabel || ''), stash.bLabel);
    check('stash.idA matches button planet', stash.idA === btn.planet, `${stash.idA} vs ${btn.planet}`);
    check('stash.angle internally consistent', stash.angle === Math.round(sep(stash.aLon, stash.bLon)),
      `angle=${stash.angle} sep=${sep(stash.aLon, stash.bLon).toFixed(3)}`);
  }

  // ── (d) "Save this view" appears, captures a nonzero PNG, then retires ──────
  console.log('── SAVE THIS VIEW ──────────────────────────────────────────');
  const saveBtn = await page.waitForSelector('#ap-save-sky-view', { timeout: 5000 }).catch(() => null);
  check('save-view button visible while aspect active', !!saveBtn);
  if (saveBtn) {
    await page.evaluate(() => document.getElementById('ap-save-sky-view').click());
    const cap = await page.evaluate(() => window.__apLastCapture || null);
    report.steps.capture = cap;
    check('capture produced a nonzero PNG', !!cap && cap.bytes > 20000,
      cap ? `${cap.bytes} data-URL chars → ${cap.name}` : 'no __apLastCapture');
    check('capture filename astroprecise-sky-YYYY-MM-DD.png',
      !!cap && /^astroprecise-sky-\d{4}-\d{2}-\d{2}\.png$/.test(cap.name), cap && cap.name);
  }
  // aspect auto-retires ~9s after focus; we are ~3s in — wait it out
  await sleep(8500);
  const after = await page.evaluate(() => ({
    saveBtnGone: !document.getElementById('ap-save-sky-view'),
    aspectGone: window.__apLastAspect === undefined,
  }));
  report.steps.after = after;
  check('aspect view auto-retired', after.aspectGone);
  check('save-view button removed with the aspect view', after.saveBtnGone);

  report.pageErrors = pageErrors;
  report.consoleErrors = consoleErrors;
  report.cleanConsole = pageErrors.length === 0 && consoleErrors.length === 0;
  check('zero console/page errors', report.cleanConsole,
    report.cleanConsole ? '' : JSON.stringify({ pageErrors, consoleErrors }));

  const PASS = checks.every((c) => c.ok);
  report.checks = checks;
  report.PASS = PASS;
  await browser.close();
  console.log('\nRESULT →', PASS ? `PASS (${checks.length}/${checks.length} assertions)` : 'FAIL');
  console.log('\nFULL REPORT:\n' + JSON.stringify(report, null, 2));
  process.exit(PASS ? 0 : 3);
}
main().catch((e) => { console.error(e); process.exit(2); });
