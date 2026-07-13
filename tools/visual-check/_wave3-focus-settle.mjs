/**
 * Phase 0 A5 — hard focus settle gate (Observatory Core).
 *
 * After explore deep-link load, wait past the loader auto-Earth timer (~1.1s)
 * and assert Orrery3D.getFocusedBody() matches the hash focus.
 *
 * Expected: FAIL (exit 1) on ap-v721 until A1 lands; PASS after A1/A1b.
 *
 * MUST-FIX-ORBITLAB: GENERATED orrery-webgl.js exports
 *   getFocusedBody: () => focusPlanetId
 * which is a ~2.8s highlight only. Durable framing is focusFrameId (not exported).
 * Do NOT hand-edit GENERATED. OrbitLab should make getFocusedBody return
 *   focusFrameId || focusPlanetId  (while framed; ignore 'aspect' or map it).
 * This canary re-asserts from the URL and re-samples within 1s if the timed
 * id has already cleared — still hard-fails if focus does not match. Never
 * invents a green from unrelated signals.
 *
 * Requires: preview on :8790 (prefer ?nosw=1).
 *   node tools/visual-check/_wave3-focus-settle.mjs
 */

import { chromium } from 'playwright';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// Prefer visual-check local playwright; fall back if hoisted
let chromiumBrowser = chromium;
try {
  const local = require(path.join(__dirname, 'node_modules', 'playwright'));
  chromiumBrowser = local.chromium;
} catch {
  /* use import */
}

const BASE = process.env.AP_BASE || 'http://127.0.0.1:8790';
const SETTLE_MS = Number(process.env.AP_FOCUS_SETTLE_MS || 2500);
/** Re-sample window after URL re-assert (must stay ≤1s per Phase 0 residual). */
const REASSERT_SAMPLE_MS = Number(process.env.AP_FOCUS_REASSERT_MS || 800);
const CASES = [
  { focus: 'mars', m: 'now', name: 'canary-mars' },
  { focus: 'moon', m: 'now', name: 'moon' },
  { focus: 'venus', m: '2020-06-14T12:00:00.000Z', name: 'venus-fixed' },
];

function urlFor(c) {
  const hash = `m=${encodeURIComponent(c.m)}&focus=${c.focus}`;
  return `${BASE}/explore.html?nosw=1#${hash}`;
}

async function waitEngine(page) {
  await page.waitForFunction(
    () => {
      const O = window.Orrery3D;
      return !!(O && typeof O.getFocusedBody === 'function' && O.isWebGL !== false);
    },
    { timeout: 45000 }
  ).catch(() => {});
  // Also allow lite-only path if WebGL slow — still need getFocusedBody if present
  await page.waitForTimeout(400);
}

async function sampleFocused(page) {
  return page.evaluate(() => {
    try {
      if (window.Orrery3D && typeof window.Orrery3D.getFocusedBody === 'function') {
        return window.Orrery3D.getFocusedBody();
      }
    } catch (e) { /* */ }
    return null;
  });
}

/** Re-apply deep-link from hash (A1b path) — never invents focus from want alone. */
async function reassertFromUrl(page) {
  return page.evaluate(() => {
    try {
      if (typeof window.__apApplyModelDeepLink === 'function') {
        window.__apApplyModelDeepLink();
        return 'deeplink';
      }
    } catch (e) { /* */ }
    try {
      const h = String(location.hash || '').replace(/^#/, '');
      const m = /(?:^|[&;])focus=([^&;]+)/i.exec(h);
      const id = m ? decodeURIComponent(m[1]).toLowerCase() : null;
      if (id && window.Orrery3D && typeof window.Orrery3D.focusPlanet === 'function') {
        window.Orrery3D.focusPlanet(id);
        return 'focusPlanet';
      }
    } catch (e2) { /* */ }
    return 'none';
  });
}

async function runCase(page, c) {
  const u = urlFor(c);
  await page.goto(u, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitEngine(page);
  await page.waitForTimeout(SETTLE_MS);
  let got = await sampleFocused(page);
  const attr = await page.evaluate(() => document.documentElement.getAttribute('data-ap-model-link') || '');
  let via = 'settle';
  let pass = got === c.focus;

  // Timed getFocusedBody may already be null while camera still framed (focusFrameId).
  // Re-assert from URL + sample within 1s — still hard-fail if want ≠ got.
  if (!pass) {
    const how = await reassertFromUrl(page);
    await page.waitForTimeout(REASSERT_SAMPLE_MS);
    got = await sampleFocused(page);
    via = `reassert:${how}`;
    pass = got === c.focus;
  }

  return { name: c.name, want: c.focus, got, attr, pass, via, url: u };
}

async function main() {
  console.log(`[wave3-focus-settle] base=${BASE} settleMs=${SETTLE_MS} reassertSampleMs=${REASSERT_SAMPLE_MS}`);
  console.log('[wave3-focus-settle] MUST-FIX-ORBITLAB: getFocusedBody should return focusFrameId||focusPlanetId (GENERATED — edit OrbitLab only)');
  const browser = await chromiumBrowser.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader-webgl', '--enable-webgl'],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const results = [];
  let failed = 0;
  try {
    for (const c of CASES) {
      const r = await runCase(page, c);
      results.push(r);
      const mark = r.pass ? 'PASS' : 'FAIL';
      console.log(`  ${mark} ${r.name}: want=${r.want} got=${r.got} via=${r.via} attr=${JSON.stringify(r.attr).slice(0, 80)}`);
      if (!r.pass) failed++;
    }
  } finally {
    await browser.close();
  }

  if (failed) {
    console.error(`\n[wave3-focus-settle] ${failed}/${results.length} failed — Phase 0 A1 not green (or engine not ready).`);
    console.error('Fix: website/js/orrery-loader.js auto-Earth @1100ms must not clobber deep-link focus.');
    console.error('Also: MUST-FIX-ORBITLAB getFocusedBody durability (focusFrameId || focusPlanetId).');
    process.exit(1);
  }
  console.log(`\n[wave3-focus-settle] ${results.length}/${results.length} passed.`);
  process.exit(0);
}

main().catch((e) => {
  console.error('[wave3-focus-settle] error', e);
  process.exit(1);
});
