/**
 * Deep hero structure audit — pre/post orrery-full, multiple viewports.
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dir, 'out', 'hero-structure-v643');
mkdirSync(OUT, { recursive: true });

const BASE = process.env.AP_PREVIEW || 'http://127.0.0.1:8790';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function overlap(a, b) {
  if (!a || !b) return 0;
  const x = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
  const y = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  return Math.round(x * y);
}

async function measure(page) {
  return page.evaluate(() => {
    const r = (sel) => {
      const el = typeof sel === 'string' ? document.querySelector(sel) : sel;
      return el ? el.getBoundingClientRect() : null;
    };
    const cs = (el) => (el ? window.getComputedStyle(el) : null);
    const hero = document.querySelector('#heroChapter');
    const wrap = document.querySelector('#heroChapter .page-wrap');
    const copy = document.querySelector('#heroChapter .hero-copy');
    const deck = document.getElementById('orrery-lite-deck');
    const globe = document.getElementById('apAwardOrreryWrap');
    const form = document.getElementById('hero-chart-form');
    const chips = document.querySelector('#heroChapter .hero-action-chips');
    const pills = document.querySelector('#orrery-lite-deck .lite-vp-controls');
    const strip = document.getElementById('ap-scale-strip');
    const fab = document.querySelector('.ap-finder-fab');
    const masthead = document.getElementById('apMasthead');

    const deckCs = cs(deck);
    const pillsCs = cs(pills);

    return {
      classes: [...document.documentElement.classList],
      viewport: { w: window.innerWidth, h: window.innerHeight },
      hero: { ...r(hero), paddingBottom: cs(hero)?.paddingBottom, minHeight: cs(hero)?.minHeight },
      wrap: { ...r(wrap), paddingBottom: cs(wrap)?.paddingBottom, height: cs(wrap)?.height },
      copy: r(copy),
      deck: {
        ...r(deck),
        position: deckCs?.position,
        top: deckCs?.top,
        bottom: deckCs?.bottom,
        height: deckCs?.height,
        display: deckCs?.display,
        gridTemplate: deckCs?.gridTemplateColumns,
      },
      globe: { ...r(globe), display: cs(globe)?.display },
      form: r(form),
      chips: r(chips),
      pills: {
        ...r(pills),
        position: pillsCs?.position,
        top: pillsCs?.top,
        flexWrap: pillsCs?.flexWrap,
      },
      strip: { ...r(strip), hidden: strip?.hidden, display: cs(strip)?.display },
      fab: r(fab),
      mastheadBottom: r(masthead)?.bottom,
      heroOverflow: cs(hero)?.overflow,
      deckOverflow: deckCs?.overflow,
      fold: {
        formVisible: form ? form.getBoundingClientRect().bottom < window.innerHeight : false,
        ctaBottom: form?.querySelector('.btn-press')?.getBoundingClientRect().bottom,
      },
    };
  });
}

async function checkOverlaps(page, tag) {
  const pairs = await page.evaluate(() => {
    const r = (sel) => {
      const el = document.querySelector(sel);
      return el && el.getBoundingClientRect().width > 0 ? el.getBoundingClientRect() : null;
    };
    const items = {
      deck: r('#orrery-lite-deck'),
      copy: r('#heroChapter .hero-copy'),
      form: r('#hero-chart-form'),
      chips: r('#heroChapter .hero-action-chips'),
      today: r('#heroTodayChip:not([hidden])'),
      spine: r('#heroChapter .hero-spine-bridge'),
      trust: r('#heroChapter .hero-solar-trust'),
      globe: r('#apAwardOrreryWrap'),
      pills: r('#orrery-lite-deck .lite-vp-controls'),
      strip: r('#ap-scale-strip'),
      fab: r('.ap-finder-fab'),
      h1: r('#heroChapter h1'),
    };
    return items;
  });

  const issues = [];
  const deck = pairs.deck;
  if (!deck) return { tag, issues: ['deck missing'] };

  /* Deck-internal controls (pills, strip) are supposed to sit inside the deck box */
  const external = ['copy', 'form', 'chips', 'today', 'spine', 'trust', 'fab', 'h1', 'globe'];
  for (const name of external) {
    const rect = pairs[name];
    if (!rect) continue;
    const px = overlap(deck, rect);
    if (px > 16) issues.push({ with: name, px });
  }

  if (pairs.globe && pairs.form) {
    const px = overlap(pairs.globe, pairs.form);
    if (px > 16) issues.push({ with: 'globe↔form', px });
  }
  if (pairs.globe && pairs.chips) {
    const px = overlap(pairs.globe, pairs.chips);
    if (px > 16) issues.push({ with: 'globe↔chips', px });
  }
  /* pills + strip are intentional siblings inside the deck grid — skip */

  const deckInHero = await page.evaluate(() => {
    const h = document.querySelector('#heroChapter')?.getBoundingClientRect();
    const d = document.getElementById('orrery-lite-deck')?.getBoundingClientRect();
    return h && d ? d.bottom <= h.bottom + 2 : true;
  });
  if (!deckInHero) issues.push({ with: 'deck-bleed', px: -1 });

  return { tag, issues, deckBottom: deck.bottom, deckHeight: deck.height };
}

const viewports = [
  { name: 'desktop-1440', w: 1440, h: 900 },
  { name: 'laptop-1280', w: 1280, h: 800 },
  { name: 'tablet-1024', w: 1024, h: 768 },
  { name: 'mobile-390', w: 390, h: 844 },
];

const report = { viewports: [], summary: [] };

const browser = await chromium.launch({ headless: true });

for (const vp of viewports) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
  await ctx.addInitScript(() => {
    try { sessionStorage.setItem('ap_intro_complete', '1'); } catch (_) {}
    try { localStorage.setItem('ap_privacy_ack', '1'); } catch (_) {}
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/index.html`, { waitUntil: 'domcontentloaded', timeout: 60000 });

  await page.waitForFunction(
    () => document.documentElement.classList.contains('orrery-full'),
    { timeout: 50000 },
  ).catch(() => {});
  await sleep(900);

  const metrics = await measure(page);
  const overlaps = await checkOverlaps(page, vp.name);
  await page.screenshot({ path: join(OUT, `${vp.name}-orrery-full.png`) });

  report.viewports.push({ viewport: vp.name, metrics, overlaps });
  if (overlaps.issues.length) {
    report.summary.push({ viewport: vp.name, issues: overlaps.issues });
  }

  await ctx.close();
}

writeFileSync(join(OUT, 'audit.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.summary, null, 2));
console.log(`\nWrote ${OUT}/audit.json and screenshots`);
await browser.close();
process.exit(report.summary.length ? 1 : 0);