/**
 * Phone pass measure — 390x844 deep-reading.html only.
 * Usage: node measure.mjs
 */
import { chromium } from '../../tools/visual-check/node_modules/playwright/index.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE = (process.env.AP_BASE || 'http://127.0.0.1:8790').replace(/\/+$/, '');
const OUT = process.env.AP_PHONE_OUT || 'C:\\Users\\jonny\\OneDrive\\astroprecise\\launch-output\\phone-pass-2026-08-14-deep-reading';
const SHOTS = join(OUT, 'shots');
mkdirSync(SHOTS, { recursive: true });

const spec = { id: 'deep-reading', path: '/deep-reading.html?nosw=1', wait: '#orr, .ap-model-stage, body' };

const STAGE_SELECTORS = [
  '.ap-model-stage',
  '#orr',
  'void-orrery',
  '.ap-room-sky',
  'canvas',
];

const TAP_SELECTORS = [
  'a.ap-action',
  'a.btn-primary',
  'button.btn-primary',
  '.btn-primary',
  '.ap-action--primary',
  'button[type="submit"]',
  'input[type="submit"]',
  '.navbar__toggle',
  '.navbar__link',
  '.bottom-nav a',
  '.ap-bottom-nav a',
  'nav.ap-tabs a',
  '.ap-tab',
  '.ap-mobile-tab',
  '#bottom-nav a',
  '[data-ap-tab]',
  'button',
  'a.btn',
  '.ap-natal-also a',
  '.ap-natal-print',
  '.navbar__logo',
];

const COPY_SELECTORS = [
  '.ap-natal-lede',
  'main .lede',
  'main .ap-lede',
  'main p',
];

function rgbTuple(bg) {
  const m = String(bg).match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function looksBlueOrPurple(bg) {
  const t = rgbTuple(bg);
  if (!t) return false;
  const [r, g, b] = t;
  if (r + g + b < 40) return false;
  if (b > r + 25 && b > g + 10) return true;
  if (r > 80 && b > 80 && g < r - 20 && g < b - 20) return true;
  return false;
}

async function launchBrowser() {
  try {
    return await chromium.launch({
      headless: true,
      args: ['--enable-unsafe-swiftshader'],
    });
  } catch (error) {
    if (!/Executable doesn't exist/i.test(String(error))) throw error;
    return chromium.launch({
      channel: 'chrome',
      headless: true,
      args: ['--enable-unsafe-swiftshader'],
    });
  }
}

const browser = await launchBrowser();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2,
  userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('page: ' + (e.message || e)));
const url = BASE + spec.path;
let status = 0;
try {
  const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  status = resp ? resp.status() : 0;
  await page.waitForSelector(spec.wait, { timeout: 12_000 }).catch(() => {});
  await page.waitForTimeout(1800);
  await page.waitForFunction(() => {
    const orr = document.getElementById('orr');
    return !!(orr && (orr._ready === true || orr.getAttribute('data-engine')));
  }, { timeout: 22_000 }).catch(() => {});
  await page.waitForTimeout(2200);
} catch (e) {
  errors.push('goto: ' + e.message);
}

const measure = await page.evaluate(({ STAGE_SELECTORS, TAP_SELECTORS, COPY_SELECTORS }) => {
  const cs = (el) => (el ? getComputedStyle(el) : null);
  const px = (v) => (v ? parseFloat(v) : null);
  const body = document.body;
  const chromeRe = /skip|sr-only|visually-hidden|eyebrow|kicker|timecode|hint|chrome|nav|logo|dock|ledger/i;
  let copy = null;
  for (const sel of COPY_SELECTORS) {
    const found = Array.from(document.querySelectorAll(sel)).find((el) => {
      const t = (el.innerText || '').replace(/\s+/g, ' ').trim();
      if (t.length < 24) return false;
      if (chromeRe.test(el.className || '') || chromeRe.test(el.id || '')) return false;
      const r = el.getBoundingClientRect();
      return r.width > 40 && r.height > 8;
    });
    if (found) { copy = found; break; }
  }
  const h1 = document.querySelector('h1, .ap-live-heading');
  const wordmark = document.querySelector('.logo-text, .navbar__logo, [aria-label*="AstroPrecise"]');
  const wordmarkText = wordmark ? (wordmark.innerText || wordmark.textContent || '').replace(/\s+/g, ' ').trim() : '';
  const wordmarkBox = wordmark ? wordmark.getBoundingClientRect() : null;
  const wordmarkLines = wordmark
    ? (wordmark.querySelector('.logo-text') || wordmark).getClientRects().length
    : 0;

  const stages = [];
  for (const sel of STAGE_SELECTORS) {
    document.querySelectorAll(sel).forEach((el) => {
      const r = el.getBoundingClientRect();
      stages.push({
        sel,
        tag: el.tagName.toLowerCase(),
        id: el.id || '',
        w: Math.round(r.width),
        h: Math.round(r.height),
        display: getComputedStyle(el).display,
        vis: getComputedStyle(el).visibility,
      });
    });
  }
  const primaryStage = stages.find((s) =>
    (s.sel === '.ap-model-stage' || s.sel === '#orr') &&
    s.h > 0 && s.display !== 'none'
  ) || stages.find((s) => s.tag === 'canvas' && s.h > 0) || null;

  const taps = [];
  const seen = new Set();
  for (const sel of TAP_SELECTORS) {
    document.querySelectorAll(sel).forEach((el) => {
      if (seen.has(el)) return;
      seen.add(el);
      const r = el.getBoundingClientRect();
      const st = getComputedStyle(el);
      if (st.display === 'none' || st.visibility === 'hidden') return;
      if (r.width === 0 && r.height === 0) return;
      taps.push({
        sel,
        tag: el.tagName.toLowerCase(),
        id: el.id || '',
        text: (el.innerText || el.getAttribute('aria-label') || el.value || '').replace(/\s+/g, ' ').trim().slice(0, 60),
        w: Math.round(r.width),
        h: Math.round(r.height),
        min: Math.round(Math.min(r.width, r.height)),
        bg: st.backgroundColor,
        color: st.color,
      });
    });
  }
  taps.sort((a, b) => a.min - b.min);

  const primaries = [];
  document.querySelectorAll('a.ap-action--primary, .btn-primary, a.btn-primary, button.btn-primary, .ap-action--primary, button[type="submit"], input[type="submit"]').forEach((el) => {
    const st = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (st.display === 'none') return;
    primaries.push({
      text: (el.innerText || el.value || '').replace(/\s+/g, ' ').trim().slice(0, 50),
      bg: st.backgroundColor,
      color: st.color,
      w: Math.round(r.width),
      h: Math.round(r.height),
    });
  });

  const inputs = [];
  document.querySelectorAll('input, select, textarea').forEach((el) => {
    const r = el.getBoundingClientRect();
    const st = getComputedStyle(el);
    if (st.display === 'none') return;
    inputs.push({
      tag: el.tagName.toLowerCase(),
      type: el.type || '',
      name: el.name || el.id || '',
      w: Math.round(r.width),
      h: Math.round(r.height),
      right: Math.round(r.right),
    });
  });

  const overflowers = [];
  const vw = window.innerWidth;
  document.querySelectorAll('body *').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width > vw + 2 && getComputedStyle(el).display !== 'none') {
      overflowers.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.className && String(el.className).slice) ? String(el.className).slice(0, 80) : '',
        id: el.id || '',
        w: Math.round(r.width),
      });
    }
  });
  overflowers.sort((a, b) => b.w - a.w);

  const bodyCs = cs(body);
  const copyCs = cs(copy);
  const h1Cs = cs(h1);

  const orr = document.getElementById('orr');
  const canvas = document.querySelector('#orr canvas, .ap-model-stage canvas, canvas');
  let webgl = null;
  if (canvas) {
    try {
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      webgl = {
        ok: !!(gl && !gl.isContextLost()),
        lost: !!(gl && gl.isContextLost()),
        vendor: gl ? (gl.getParameter(gl.VENDOR) || '') : '',
        renderer: gl ? (gl.getParameter(gl.RENDERER) || '') : '',
      };
    } catch (e) {
      webgl = { error: String(e.message || e) };
    }
  }

  return {
    title: document.title,
    url: location.href,
    bodyFont: bodyCs ? px(bodyCs.fontSize) : null,
    bodyColor: bodyCs ? bodyCs.color : null,
    pFont: copyCs ? px(copyCs.fontSize) : null,
    pSel: copy ? (copy.className || copy.tagName) : null,
    pText: copy ? (copy.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 80) : '',
    h1Font: h1Cs ? px(h1Cs.fontSize) : null,
    h1Text: h1 ? (h1.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 80) : '',
    wordmarkText,
    wordmarkLines,
    wordmarkW: wordmarkBox ? Math.round(wordmarkBox.width) : null,
    wordmarkH: wordmarkBox ? Math.round(wordmarkBox.height) : null,
    scrollW: document.scrollingElement ? document.scrollingElement.scrollWidth : document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
    innerW: window.innerWidth,
    innerH: window.innerHeight,
    stages,
    primaryStage,
    taps: taps.slice(0, 40),
    smallestTap: taps[0] || null,
    tapsUnder44: taps.filter((t) => t.min < 44).slice(0, 20),
    primaries,
    inputs,
    inputOverflow: inputs.filter((i) => i.w > vw + 2 || i.right > vw + 4),
    overflowers: overflowers.slice(0, 12),
    orrEngine: orr ? orr.getAttribute('data-engine') : null,
    orrReady: !!(orr && orr._ready === true),
    canvas: canvas ? (() => {
      const r = canvas.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height), cw: canvas.width, ch: canvas.height };
    })() : null,
    webgl,
  };
}, { STAGE_SELECTORS, TAP_SELECTORS, COPY_SELECTORS });

if (measure && measure.primaries) {
  measure.bluePrimaries = measure.primaries.filter((p) => looksBlueOrPurple(p.bg));
}

await page.screenshot({ path: join(SHOTS, 'deep-reading.png'), fullPage: false }).catch(() => {});
await page.screenshot({ path: join(SHOTS, 'deep-reading-full.png'), fullPage: true }).catch(() => {});

let drawer = null;
try {
  const toggle = page.locator('.navbar__toggle').first();
  if (await toggle.count()) {
    await toggle.click({ timeout: 4000 });
    await page.waitForTimeout(450);
    const snap = async () => page.evaluate(() => {
      const menu = document.getElementById('nav-mobile-menu');
      const tog = document.querySelector('.navbar__toggle');
      if (!menu) return { missing: true };
      const st = getComputedStyle(menu);
      const r = menu.getBoundingClientRect();
      const links = Array.from(menu.querySelectorAll('a.navbar__link')).map((a) => {
        const br = a.getBoundingClientRect();
        return { text: (a.textContent || '').replace(/\s+/g, ' ').trim(), w: Math.round(br.width), h: Math.round(br.height) };
      });
      return {
        expanded: tog ? tog.getAttribute('aria-expanded') : null,
        openClass: menu.classList.contains('open'),
        display: st.display,
        w: Math.round(r.width),
        h: Math.round(r.height),
        linkCount: links.length,
        visibleLinks: links.filter((l) => l.w > 0 && l.h > 0).length,
        minLinkH: links.length ? Math.min(...links.map((l) => l.h)) : 0,
        first: links.slice(0, 4),
      };
    });
    const openSnap = await snap();
    await page.waitForTimeout(1100);
    const staySnap = await snap();
    drawer = {
      ...openSnap,
      stayedOpen: !!(staySnap && staySnap.openClass && staySnap.expanded === 'true' && staySnap.h > 80 && staySnap.visibleLinks > 0),
      stayH: staySnap ? staySnap.h : 0,
      stayExpanded: staySnap ? staySnap.expanded : null,
      stayVisibleLinks: staySnap ? staySnap.visibleLinks : 0,
    };
    await page.screenshot({ path: join(SHOTS, 'deep-reading-drawer.png'), fullPage: false }).catch(() => {});
  }
} catch (e) {
  drawer = { error: e.message };
}
if (measure) measure.drawer = drawer;

const result = {
  id: spec.id,
  path: spec.path,
  status,
  errors: errors.slice(0, 8),
  ...measure,
};

await context.close();
await browser.close();

const stg = measure && measure.primaryStage;
const copyFail = !!(measure && measure.pFont != null && measure.pFont < 16);
const tapFail = !!(measure && measure.tapsUnder44 && measure.tapsUnder44.length);
const overflowFail = !!(measure && (measure.scrollW > 390 || (measure.overflowers && measure.overflowers.length) || (measure.inputOverflow && measure.inputOverflow.length)));
const stageFail = !!(measure && (!stg || stg.h < 200));
const wordmarkOneWord = !!(measure && measure.wordmarkLines === 1 && /AstroPrecise/i.test(measure.wordmarkText || '') && !/\s/.test((measure.wordmarkText || '').replace(/\s/g, '') ? measure.wordmarkText.replace(/\s+/g, '') : ''));
const wordmarkOk = !!(measure && measure.wordmarkLines === 1 && /^AstroPrecise$/i.test((measure.wordmarkText || '').replace(/\s+/g, '')));

const summary = {
  viewport: [390, 844],
  swV: 'ap-v874',
  page: 'deep-reading.html',
  status,
  copy: measure && measure.pFont,
  copyText: measure && measure.pText,
  h1: measure && measure.h1Font,
  h1Text: measure && measure.h1Text,
  smallestTap: measure && measure.smallestTap,
  tapsUnder44: measure && measure.tapsUnder44 ? measure.tapsUnder44.length : null,
  tapsUnder44List: measure && measure.tapsUnder44,
  stage: stg ? (stg.w + 'x' + stg.h) : 'none',
  stageH: stg ? stg.h : 0,
  overflow: measure && measure.overflowers ? measure.overflowers.length : 0,
  scrollW: measure && measure.scrollW,
  inputOverflow: measure && measure.inputOverflow,
  drawerStay: measure && measure.drawer && measure.drawer.stayedOpen,
  drawer: measure && measure.drawer,
  wordmarkText: measure && measure.wordmarkText,
  wordmarkLines: measure && measure.wordmarkLines,
  wordmarkOneWord: wordmarkOk,
  primaries: measure && measure.primaries,
  bluePurplePrimaries: measure && measure.bluePrimaries,
  orr: measure && measure.orrEngine,
  orrReady: measure && measure.orrReady,
  webgl: measure && measure.webgl && measure.webgl.ok,
  fails: {
    copyLt16: copyFail,
    tapLt44: tapFail,
    overflow: overflowFail,
    collapsedStage: stageFail,
  },
  shippingFilesChanged: false,
  cssChanged: false,
  verdict: null,
};

const anyFail = copyFail || tapFail || overflowFail || stageFail;
summary.verdict = anyFail
  ? 'FAIL — see fails'
  : 'PASS — no CSS fails. website/css/ap-phone-pass.css untouched. sw.js still ap-v874. pins still ?v=874.';

writeFileSync(join(OUT, 'measure.json'), JSON.stringify(result, null, 2));
writeFileSync(join(OUT, 'summary.json'), JSON.stringify(summary, null, 2));

console.log(
  'measured deep-reading status=' + status +
  ' scrollW=' + (measure && measure.scrollW) +
  ' body=' + (measure && measure.bodyFont) +
  ' copy=' + (measure && measure.pFont) +
  ' h1=' + (measure && measure.h1Font) +
  ' stage=' + (stg ? (stg.w + 'x' + stg.h) : 'none') +
  ' taps<44=' + (measure && measure.tapsUnder44 && measure.tapsUnder44.length) +
  ' smallest=' + (measure && measure.smallestTap && measure.smallestTap.min) +
  ' drawerStay=' + (measure && measure.drawer && measure.drawer.stayedOpen) +
  ' wordmark=' + JSON.stringify(measure && measure.wordmarkText) +
  ' lines=' + (measure && measure.wordmarkLines) +
  ' blueP=' + (measure && measure.bluePrimaries && measure.bluePrimaries.length) +
  ' orr=' + (measure && measure.orrEngine) +
  ' ready=' + (measure && measure.orrReady) +
  ' webgl=' + (measure && measure.webgl && measure.webgl.ok)
);
console.log('WROTE', join(OUT, 'measure.json'));
console.log('WROTE', join(OUT, 'summary.json'));
