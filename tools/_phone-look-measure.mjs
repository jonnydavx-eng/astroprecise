/**
 * Live 390×844 measure for the phone look pass.
 * Usage: node tools/_phone-look-measure.mjs [base-url]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(here, 'visual-check/package.json'));
const { chromium } = require('playwright');

const BASE = (process.env.AP_BASE || process.argv[2] || 'http://127.0.0.1:8790').replace(/\/+$/, '');
const OUT = process.env.AP_PHONE_OUT || '/tmp/phone-look-pass';
mkdirSync(OUT, { recursive: true });

const PAGES = [
  { id: 'home', path: '/index.html?nosw=1', wait: '#orr, .ap-model-stage, body' },
  { id: 'chart', path: '/chart.html?nosw=1', wait: 'body' },
  { id: 'compatibility', path: '/compatibility.html?nosw=1', wait: 'body' },
  { id: 'tonight', path: '/tonight.html?nosw=1', wait: 'body' },
  { id: 'events', path: '/sky-events.html?nosw=1', wait: 'body' },
  { id: 'sky-card', path: '/sky-card.html?nosw=1', wait: 'body' },
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
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message || e)));
  const resp = await page.goto(BASE + spec.path, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  await page.waitForSelector(spec.wait, { timeout: 12_000 }).catch(() => {});
  await page.waitForTimeout(1600);

  const measure = await page.evaluate(() => {
    const px = (v) => (v ? parseFloat(v) : null);
    const h1 = document.querySelector('h1');
    const copy = document.querySelector('.ap-live-copy, .chart-hero__subtitle, .tn-hero__sub, .ap-events-hero__lede, .sky-card-lede, .standfirst');
    const stage = document.querySelector('.ap-model-stage, .ap-eclipse-live__stage, #cv');
    const bodyBg = getComputedStyle(document.body).backgroundColor;
    const taps = [];
    document.querySelectorAll('a.ap-action, .btn-primary, .btn--primary, button[type="submit"], .navbar__toggle, .tn-btn, #keep-sky, .btn-invite, .page-sky-card .btn, .ap-events-feature a').forEach((el) => {
      const r = el.getBoundingClientRect();
      const st = getComputedStyle(el);
      if (st.display === 'none' || r.width === 0) return;
      taps.push({
        text: (el.innerText || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 40),
        w: Math.round(r.width),
        h: Math.round(r.height),
        min: Math.round(Math.min(r.width, r.height)),
      });
    });
    const stageBox = stage ? stage.getBoundingClientRect() : null;
    const canvas = document.querySelector('#orr canvas, .ap-model-stage canvas, #cv');
    return {
      title: document.title,
      bodyBg,
      h1: h1 ? px(getComputedStyle(h1).fontSize) : null,
      h1Text: h1 ? h1.innerText.trim().slice(0, 60) : '',
      copy: copy ? px(getComputedStyle(copy).fontSize) : null,
      scrollW: document.scrollingElement.scrollWidth,
      clientW: document.documentElement.clientWidth,
      stage: stageBox ? { w: Math.round(stageBox.width), h: Math.round(stageBox.height) } : null,
      renderer: document.getElementById('orr')?.getAttribute('data-renderer') || null,
      canvas: canvas ? { w: Math.round(canvas.getBoundingClientRect().width), h: Math.round(canvas.getBoundingClientRect().height) } : null,
      tapsUnder44: taps.filter((t) => t.min < 44),
      smallestTap: taps.sort((a, b) => a.min - b.min)[0] || null,
    };
  });

  await page.screenshot({ path: join(OUT, spec.id + '.png'), fullPage: false }).catch(() => {});
  results.push({ id: spec.id, status: resp ? resp.status() : 0, errors: errors.slice(0, 6), ...measure });

  const fail = (msg) => { console.error('FAIL', spec.id, msg); fails++; };
  if (!measure) fail('no measure');
  else {
    if (measure.scrollW > 392) fail('horizontal overflow ' + measure.scrollW);
    if (measure.copy && measure.copy < 15.5) fail('copy ' + measure.copy + 'px');
    if (measure.h1 && measure.h1 < 36) fail('headline too small ' + measure.h1);
    if (measure.h1 && measure.h1 > 52) fail('headline too large ' + measure.h1);
    if (measure.tapsUnder44.length) fail('taps <44 ' + JSON.stringify(measure.tapsUnder44));
    if (spec.id !== 'events' && spec.id !== 'sky-card') {
      if (!measure.stage || measure.stage.h < 360) fail('stage short ' + JSON.stringify(measure.stage));
    }
    if (spec.id === 'home' || spec.id === 'compatibility') {
      if (measure.renderer && measure.renderer !== 'webgl-only') fail('renderer ' + measure.renderer);
    }
    const voidBg = /rgb\(\s*2,\s*3,\s*7\s*\)/.test(measure.bodyBg || '') || /rgba\(\s*0,\s*0,\s*0,\s*0\s*\)/.test(measure.bodyBg || '');
    if (!voidBg && spec.id !== 'tonight') fail('body not void ' + measure.bodyBg);
    if (spec.id === 'tonight' && !/rgb\(\s*(2,\s*3,\s*7|0,\s*0,\s*0)\s*\)/.test(measure.bodyBg || '')) {
      fail('tonight body not dark ' + measure.bodyBg);
    }
    console.log('measured', spec.id, 'h1=' + measure.h1, 'copy=' + measure.copy, 'stage=' + (measure.stage ? measure.stage.w + 'x' + measure.stage.h : 'none'), 'scrollW=' + measure.scrollW, 'taps<44=' + measure.tapsUnder44.length);
  }
  await context.close();
}

await browser.close();
writeFileSync(join(OUT, 'measure.json'), JSON.stringify(results, null, 2));
if (fails) {
  console.error('FAIL phone look measure', fails);
  process.exit(1);
}
console.log('PASS phone look measure →', OUT);
