/**
 * v642 — verify hero HUD does not overlap copy when orrery-full lands.
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dir, 'out');
mkdirSync(OUT, { recursive: true });

const BASE = process.env.AP_PREVIEW || 'http://127.0.0.1:8790';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const results = [];
function ok(msg) { results.push({ pass: true, msg }); console.log('OK', msg); }
function fail(msg) { results.push({ pass: false, msg }); console.log('FAIL', msg); }

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(() => {
  try { sessionStorage.setItem('ap_intro_complete', '1'); } catch (_) {}
  try { localStorage.setItem('ap_privacy_ack', '1'); } catch (_) {}
});

const page = await ctx.newPage();
await page.goto(`${BASE}/index.html`, { waitUntil: 'domcontentloaded', timeout: 60000 });

await page.waitForFunction(
  () => document.documentElement.classList.contains('orrery-full'),
  { timeout: 45000 },
);
await sleep(800);

const metrics = await page.evaluate(() => {
  function rect(sel) {
    const el = document.querySelector(sel);
    return el ? el.getBoundingClientRect() : null;
  }
  function overlap(a, b) {
    if (!a || !b) return 0;
    const x = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
    const y = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    return x * y;
  }
  const deck = rect('#orrery-lite-deck');
  const hero = rect('#heroChapter');
  const chips = rect('#heroChapter .hero-action-chips');
  const today = rect('#heroTodayChip:not([hidden])');
  const spineEl = document.querySelector('#heroChapter .hero-spine-bridge');
  const spine = spineEl ? spineEl.getBoundingClientRect() : null;
  const trust = rect('#heroChapter .hero-solar-trust');
  const fab = rect('.ap-finder-fab');
  const strip = rect('#ap-scale-strip');
  const pills = rect('#orrery-lite-deck .lite-vp-controls');
  const orbits = rect('#ap-orbits-toggle:not([hidden])');

  return {
    orreryFull: document.documentElement.classList.contains('orrery-full'),
    deckBottom: deck?.bottom,
    heroBottom: hero?.bottom,
    deckInHero: deck && hero ? deck.bottom <= hero.bottom + 2 : false,
    overlapChips: overlap(deck, chips),
    overlapToday: today ? overlap(deck, today) : 0,
    overlapSpine: spineEl && window.getComputedStyle(spineEl).display !== 'none' ? overlap(deck, spine) : 0,
    overlapTrust: overlap(deck, trust),
    overlapFab: overlap(deck, fab),
    overlapStripPills: overlap(strip, pills),
    deckHeight: deck?.height,
    orbitsLeft: orbits?.left,
    stripCenter: strip ? (strip.left + strip.right) / 2 : null,
    paddingBottom: (() => {
      const h = document.querySelector('#heroChapter');
      return h ? window.getComputedStyle(h).paddingBottom : '';
    })(),
    deckPosition: (() => {
      const d = document.getElementById('orrery-lite-deck');
      return d ? window.getComputedStyle(d).bottom : '';
    })(),
  };
});

if (metrics.orreryFull) ok('orrery-full landed');
else fail('orrery-full missing');

if (metrics.deckInHero) ok(`deck inside hero (bottom ${Math.round(metrics.deckBottom)} ≤ ${Math.round(metrics.heroBottom)})`);
else fail(`deck bleeds past hero (${Math.round(metrics.deckBottom)} > ${Math.round(metrics.heroBottom)})`);

for (const [name, px] of [
  ['chips', metrics.overlapChips],
  ['today', metrics.overlapToday],
  ['spine', metrics.overlapSpine],
  ['trust', metrics.overlapTrust],
  ['fab', metrics.overlapFab],
  ['strip↔pills', metrics.overlapStripPills],
]) {
  if (px <= 4) ok(`${name}: no overlap (${Math.round(px)}px²)`);
  else fail(`${name}: OVERLAP ${Math.round(px)}px²`);
}

if (metrics.overlapSpine === 0) ok('spine bridge hidden or clear');
if (metrics.overlapFab <= 4) ok('Tools FAB clear of deck');

await page.screenshot({ path: join(OUT, 'hud-v642-orrery-full.png'), fullPage: false });

writeFileSync(join(OUT, 'hud-v642-overlap.json'), JSON.stringify({ metrics, results }, null, 2));

const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
await browser.close();
process.exit(failed ? 1 : 0);