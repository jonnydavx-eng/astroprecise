/* WOW Slice 1 — BEFORE/AFTER structural baseline (real-user mode).
   Measures formTop / overlapY / submitBottom / scrollWidth on home desktop +
   390x844, in BOTH poster state (early) and live state (post orrery-full,
   settled). Run before and after the Model Window change — numbers must match.
   Usage: node _slice1-baseline.mjs <label>   (label = before | after) */
import { chromium } from 'playwright';
import fs from 'fs';

const LABEL = process.argv[2] || 'before';
const OUT = 'out/slice1-2026-07-10';
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://127.0.0.1:8790';
const DESK_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const MOB_UA = 'Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';

const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader-webgl', '--disable-blink-features=AutomationControlled'] });

async function open(path, { mobile = false } = {}) {
  const ctx = await b.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1,
    userAgent: mobile ? MOB_UA : DESK_UA,
    serviceWorkers: 'block',
  });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push('pageerror: ' + String(e).slice(0, 300)));
  p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 300)); });
  await p.addInitScript(() => {
    try { localStorage.setItem('ap_intro_complete', '1'); } catch (e) {}
    if (typeof window.chrome === 'undefined') window.chrome = { runtime: {} };
  });
  await p.goto(BASE + '/' + path, { waitUntil: 'load', timeout: 60000 });
  return { ctx, p, errs };
}

const measureJs = () => {
  const r = (el) => { const q = el && el.getBoundingClientRect(); return q ? { top: Math.round(q.top + scrollY), bottom: Math.round(q.bottom + scrollY), h: Math.round(q.height) } : null; };
  const form = document.getElementById('hero-chart-form');
  const submit = form && form.querySelector('button[type="submit"]');
  const stage = document.querySelector('.hero-solar-stage');
  const copy = document.querySelector('#heroChapter .hero-copy');
  const deck = document.getElementById('orrery-lite-deck');
  const deckCs = deck && getComputedStyle(deck);
  const stageR = r(stage), copyR = r(copy);
  return {
    formTop: form ? r(form).top : null,
    submitBottom: submit ? r(submit).bottom : null,
    stage: stageR, copy: copyR,
    overlapY: stageR && copyR ? stageR.bottom - copyR.top : null,
    deck: deck ? { display: deckCs.display, rect: r(deck) } : null,
    scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
    htmlClass: document.documentElement.className,
  };
};

const report = { label: LABEL, when: new Date().toISOString() };

for (const mode of ['desktop', 'mobile']) {
  const { ctx, p, errs } = await open('', { mobile: mode === 'mobile' });
  await p.waitForTimeout(1200);
  const poster = await p.evaluate(measureJs);
  // wait for orrery-full (live state), up to 25s, then settle 1600ms
  const gotFull = await p.waitForFunction(() => document.documentElement.classList.contains('orrery-full'), null, { timeout: 25000 }).then(() => true).catch(() => false);
  await p.waitForTimeout(1600);
  const live = await p.evaluate(measureJs);
  report[mode] = { poster, live, gotFull, consoleErrors: errs };
  await p.screenshot({ path: `${OUT}/${LABEL}-home-${mode}-live.png` });
  console.log(`${mode}: gotFull=${gotFull} poster.formTop=${poster.formTop} live.formTop=${live.formTop} live.overlapY=${live.overlapY} scrollW=${live.scrollWidth} errs=${errs.length}`);
  await ctx.close();
}

fs.writeFileSync(`${OUT}/${LABEL}-metrics.json`, JSON.stringify(report, null, 2));
console.log('wrote', `${OUT}/${LABEL}-metrics.json`);
await b.close();
