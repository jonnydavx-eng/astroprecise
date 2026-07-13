/**
 * Phase 0 A5 — hard focus settle gate (Observatory Core).
 *
 * After explore deep-link load, wait past the loader auto-Earth timer (~1.1s)
 * and assert Orrery3D.getFocusedBody() matches the hash focus.
 *
 * Expected: FAIL (exit 1) on ap-v721 until A1 lands; PASS after A1/A1b.
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

async function runCase(page, c) {
  const u = urlFor(c);
  await page.goto(u, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitEngine(page);
  await page.waitForTimeout(SETTLE_MS);
  const got = await page.evaluate(() => {
    try {
      if (window.Orrery3D && typeof window.Orrery3D.getFocusedBody === 'function') {
        return window.Orrery3D.getFocusedBody();
      }
    } catch (e) { /* */ }
    return null;
  });
  const attr = await page.evaluate(() => document.documentElement.getAttribute('data-ap-model-link') || '');
  const pass = got === c.focus;
  return { name: c.name, want: c.focus, got, attr, pass, url: u };
}

async function main() {
  console.log(`[wave3-focus-settle] base=${BASE} settleMs=${SETTLE_MS}`);
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
      console.log(`  ${mark} ${r.name}: want=${r.want} got=${r.got} attr=${JSON.stringify(r.attr).slice(0, 80)}`);
      if (!r.pass) failed++;
    }
  } finally {
    await browser.close();
  }

  if (failed) {
    console.error(`\n[wave3-focus-settle] ${failed}/${results.length} failed — Phase 0 A1 not green (or engine not ready).`);
    console.error('Fix: website/js/orrery-loader.js auto-Earth @1100ms must not clobber deep-link focus.');
    process.exit(1);
  }
  console.log(`\n[wave3-focus-settle] ${results.length}/${results.length} passed.`);
  process.exit(0);
}

main().catch((e) => {
  console.error('[wave3-focus-settle] error', e);
  process.exit(1);
});
