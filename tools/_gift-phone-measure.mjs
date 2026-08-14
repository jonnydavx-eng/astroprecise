/**
 * Live 390×844 measure for the gift path only.
 * Usage: node tools/_gift-phone-measure.mjs [base-url]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(here, 'visual-check/package.json'));
const { chromium } = require('playwright');

const BASE = (process.env.AP_BASE || process.argv[2] || 'http://127.0.0.1:8790').replace(/\/+$/, '');
const OUT = process.env.AP_PHONE_OUT || '/tmp/gift-phone-pass';
mkdirSync(OUT, { recursive: true });

const PAGES = [
  { id: 'chart-keep', path: '/chart.html?nosw=1', wait: '#keep-sky, body' },
  { id: 'couples-keep', path: '/compatibility.html?nosw=1', wait: '#keep-sky, body' },
];

async function launchBrowser() {
  try {
    return await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
  } catch (error) {
    if (!/Executable doesn't exist/i.test(String(error))) throw error;
    return chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
  }
}

const browser = await launchBrowser();
const results = [];
let fails = 0;

for (const spec of PAGES) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
    userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
  });
  const page = await context.newPage();
  await page.goto(BASE + spec.path, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  await page.waitForSelector(spec.wait, { timeout: 12_000 }).catch(() => {});
  await page.waitForTimeout(1400);

  const measure = await page.evaluate(() => {
    const px = (v) => (v ? parseFloat(v) : null);
    const copy = document.querySelector('.sky-card-lede, .ap-keep-row .action-note, #keep-sky-caption');
    const h1 = document.querySelector('h1');
    const fieldLabel = document.querySelector('.page-sky-card .field span');
    const word = document.querySelector('.sky-card-word, .logo-text');
    const keep = document.querySelector('#keep-sky, .page-sky-card .btn--draw');
    const stage = document.querySelector('.ap-room-sky:has(.ap-keep-row) .ap-model-stage, .ap-live-home .ap-model-stage, #cv');
    const taps = [];
    document.querySelectorAll('#keep-sky, .ap-keep-row .btn-invite, .page-sky-card .btn, .page-sky-card a:not(.skip)').forEach((el) => {
      const r = el.getBoundingClientRect();
      const st = getComputedStyle(el);
      if (st.display === 'none' || r.width === 0) return;
      taps.push({
        text: (el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 40),
        min: Math.round(Math.min(r.width, r.height)),
        h: Math.round(r.height),
      });
    });
    const stageBox = stage ? stage.getBoundingClientRect() : null;
    const keepBox = keep ? keep.getBoundingClientRect() : null;
    const overlap = stageBox && keepBox
      ? !(keepBox.bottom <= stageBox.top + 1 || keepBox.top >= stageBox.bottom - 1)
      : false;
    return {
      copy: copy ? px(getComputedStyle(copy).fontSize) : null,
      h1: h1 ? px(getComputedStyle(h1).fontSize) : null,
      fieldLabel: fieldLabel ? px(getComputedStyle(fieldLabel).fontSize) : null,
      word: word ? (word.textContent || '').replace(/\s+/g, '') : '',
      keepH: keepBox ? Math.round(keepBox.height) : null,
      scrollW: document.scrollingElement.scrollWidth,
      stage: stageBox ? { w: Math.round(stageBox.width), h: Math.round(stageBox.height) } : null,
      renderer: document.getElementById('orr')?.getAttribute('data-renderer') || null,
      overlap,
      tapsUnder44: taps.filter((t) => t.min < 44),
    };
  });

  await page.screenshot({ path: join(OUT, spec.id + '.png'), fullPage: false }).catch(() => {});
  results.push({ id: spec.id, ...measure });

  const fail = (msg) => { console.error('FAIL', spec.id, msg); fails++; };
  if (measure.scrollW > 392) fail('horizontal overflow ' + measure.scrollW);
  if (measure.copy && measure.copy < 15.5) fail('copy ' + measure.copy + 'px');
  if (measure.h1 && (measure.h1 < 32 || measure.h1 > 42.5)) fail('H1 ' + measure.h1 + 'px');
  if (measure.fieldLabel && measure.fieldLabel < 15.5) fail('field label ' + measure.fieldLabel + 'px');
  if (measure.word && measure.word !== 'AstroPrecise') fail('wordmark ' + measure.word);
  if (measure.tapsUnder44.length) fail('taps <44 ' + JSON.stringify(measure.tapsUnder44));
  if (spec.id === 'chart-keep' || spec.id === 'couples-keep') {
    if (!measure.stage || measure.stage.h < 360) fail('stage short ' + JSON.stringify(measure.stage));
    if (measure.overlap) fail('keep row covers the 3D stage');
    if (measure.renderer && measure.renderer !== 'webgl-only') fail('renderer ' + measure.renderer);
  }
  console.log('measured', spec.id, JSON.stringify(measure));
  await context.close();
}

await browser.close();
writeFileSync(join(OUT, 'measure.json'), JSON.stringify(results, null, 2));
if (fails) {
  console.error('FAIL gift-path phone measure', fails);
  process.exit(1);
}
console.log('PASS gift-path phone measure →', OUT);
