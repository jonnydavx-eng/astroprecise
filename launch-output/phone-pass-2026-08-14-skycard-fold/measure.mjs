/**
 * Phone pass measure — 390x844 website/sky-card.html fold check.
 * House gift / PR-18 sky-card. Findings only. Do not bump. Do not edit shipping.
 * Usage: node measure.mjs
 */
import { chromium } from '../../tools/visual-check/node_modules/playwright/index.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE = (process.env.AP_BASE || 'http://127.0.0.1:8790').replace(/\/+$/, '');
const OUT = process.env.AP_PHONE_OUT || 'C:\\Users\\jonny\\OneDrive\\astroprecise\\launch-output\\phone-pass-2026-08-14-skycard-fold';
const SHOTS = join(OUT, 'shots');
mkdirSync(SHOTS, { recursive: true });

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
    return await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
  } catch (error) {
    if (!/Executable doesn't exist/i.test(String(error))) throw error;
    return chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
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
const url = BASE + '/sky-card.html?nosw=1';
let status = 0;
try {
  const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  status = resp ? resp.status() : 0;
  await page.waitForSelector('#skyCard, canvas, h1, body', { timeout: 12_000 }).catch(() => {});
  await page.waitForTimeout(2400);
} catch (e) {
  errors.push('goto: ' + e.message);
}

const measure = await page.evaluate(() => {
  const px = (v) => (v ? parseFloat(v) : null);
  const box = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const st = getComputedStyle(el);
    return {
      tag: el.tagName.toLowerCase(),
      id: el.id || '',
      cls: (el.className && String(el.className).slice) ? String(el.className).slice(0, 80) : '',
      text: (el.innerText || el.getAttribute('aria-label') || el.value || el.placeholder || '').replace(/\s+/g, ' ').trim().slice(0, 100),
      href: el.getAttribute && (el.getAttribute('href') || ''),
      w: Math.round(r.width),
      h: Math.round(r.height),
      min: Math.round(Math.min(r.width, r.height)),
      top: Math.round(r.top),
      bottom: Math.round(r.bottom),
      left: Math.round(r.left),
      right: Math.round(r.right),
      display: st.display,
      vis: st.visibility,
      bg: st.backgroundColor,
      color: st.color,
      fontSize: px(st.fontSize),
      fontWeight: st.fontWeight,
      fontFamily: (st.fontFamily || '').split(',')[0].replace(/['"]/g, '').trim(),
      lineHeight: st.lineHeight,
      inFirst844: r.top < 844 && r.bottom > 0 && st.display !== 'none',
    };
  };

  const title = document.title;
  const h1 = document.querySelector('h1');
  const lede = document.querySelector('.ap-card-lede, main p.ap-card-lede, #sky-card-main > p.ap-card-lede');
  const kicker = document.querySelector('.ap-card-kicker');
  const copy = lede || Array.from(document.querySelectorAll('main p')).find((el) => {
    const t = (el.innerText || '').replace(/\s+/g, ' ').trim();
    return t.length >= 24 && !/kicker|eyebrow/i.test(el.className || '');
  });
  const wordmark = document.querySelector('.logo-text, .navbar__logo');
  const wordmarkText = wordmark ? (wordmark.innerText || wordmark.textContent || '').replace(/\s+/g, ' ').trim() : '';
  const wordmarkRaw = wordmark ? (wordmark.textContent || '').replace(/\s+/g, '') : '';
  const canvas = document.querySelector('#skyCard, .ap-card-canvas canvas, canvas');
  const canvasWrap = document.querySelector('.ap-card-canvas');
  const drawBtn = document.querySelector('#skyCardDraw, button[type="submit"]');
  const dlBtn = document.querySelector('#skyCardDownload');
  const place = document.querySelector('#sky-card-city, input[type="text"]');
  const dob = document.querySelector('#dob, input[type="date"]');
  const tob = document.querySelector('#tob, input[type="time"]');
  const toggle = document.querySelector('.navbar__toggle');
  const navbar = document.querySelector('.navbar, header.navbar, header.site-header');
  const footer = document.querySelector('.ap-site-footer, footer');

  const namedTaps = {
    drawMyCard: box(drawBtn),
    downloadPng: box(dlBtn),
    placeInput: box(place),
    dob: box(dob),
    tob: box(tob),
    navToggle: box(toggle),
    wordmark: box(wordmark),
  };

  const linkHits = [];
  document.querySelectorAll('a').forEach((a) => {
    const href = (a.getAttribute('href') || '').toLowerCase();
    const text = (a.innerText || a.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();
    const isObs = /index\.html|^\/$|observatory/i.test(href) || /observatory/i.test(text);
    const isChart = /chart\.html/i.test(href) || /^chart$/i.test(text);
    const isDeep = /deep-reading/i.test(href);
    if (isObs || isChart || isDeep || /skip/i.test(a.className || '')) {
      const b = box(a);
      if (b) linkHits.push({ kind: isChart ? 'chart' : isDeep ? 'deep-reading' : isObs ? 'observatory' : 'other', ...b });
    }
  });

  const taps = [];
  const seen = new Set();
  const TAP_SELS = [
    'button', 'a.navbar__link', 'a.navbar__logo', '.navbar__toggle',
    'a.ap-card-btn', '.ap-card-btn', 'input[type="date"]', 'input[type="time"]',
    'input[type="text"]', 'a.btn', '.btn', '.ap-site-footer a', 'main a',
    '.skip-link',
  ];
  for (const sel of TAP_SELS) {
    document.querySelectorAll(sel).forEach((el) => {
      if (seen.has(el)) return;
      seen.add(el);
      const st = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      if (st.display === 'none' || st.visibility === 'hidden') return;
      if (r.width === 0 && r.height === 0) return;
      taps.push({
        sel,
        tag: el.tagName.toLowerCase(),
        id: el.id || '',
        text: (el.innerText || el.getAttribute('aria-label') || el.placeholder || el.value || '').replace(/\s+/g, ' ').trim().slice(0, 80),
        href: el.getAttribute && (el.getAttribute('href') || ''),
        w: Math.round(r.width),
        h: Math.round(r.height),
        min: Math.round(Math.min(r.width, r.height)),
        top: Math.round(r.top),
        bg: st.backgroundColor,
        color: st.color,
      });
    });
  }
  taps.sort((a, b) => a.min - b.min);

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

  const astroHits = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walker.nextNode())) {
    const t = (n.nodeValue || '').replace(/\s+/g, ' ').trim();
    if (/astro\s*precise/i.test(t)) {
      const el = n.parentElement;
      astroHits.push({
        text: t.slice(0, 120),
        tag: el ? el.tagName.toLowerCase() : '',
        twoWords: /astro\s+precise/i.test(t),
        oneWord: /astroprecise/i.test(t.replace(/\s+/g, '')),
      });
    }
  }

  const bodyText = (document.body.innerText || '').replace(/\s+/g, ' ');
  const h1Text = h1 ? (h1.innerText || '').replace(/\s+/g, ' ').trim() : '';
  const oldNews = /real sky news/i.test(title) || /The sky when you arrived/i.test(h1Text);
  const houseGift = /the minute you arrived/i.test(title) || /the minute you arrived/i.test(h1Text);
  const identity = oldNews ? 'old-news-card' : (houseGift ? 'house-gift-sky-card' : 'unknown');

  const canvasBox = box(canvas);
  const wrapBox = box(canvasWrap);

  return {
    title,
    url: location.href,
    identity,
    h1: box(h1),
    h1Text,
    h1Font: h1 ? px(getComputedStyle(h1).fontSize) : null,
    h1Lines: h1 ? h1.getClientRects().length : 0,
    kicker: box(kicker),
    copy: box(copy),
    copyPx: copy ? px(getComputedStyle(copy).fontSize) : null,
    copyText: copy ? (copy.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 220) : '',
    wordmarkText,
    wordmarkRaw,
    wordmarkOneWord: /astroprecise/i.test(wordmarkRaw) && !/astro\s+precise/i.test(wordmarkText),
    wordmarkTwoWords: /astro\s+precise/i.test(wordmarkText),
    wordmarkLines: wordmark ? (wordmark.querySelector('.logo-text') || wordmark).getClientRects().length : 0,
    wordmarkBox: box(wordmark),
    titleHasOneWord: /AstroPrecise/.test(title),
    titleHasTwoWords: /Astro Precise/.test(title) && !/AstroPrecise/.test(title),
    astroHits,
    chrome: {
      navbar: !!navbar,
      toggle: !!toggle,
      mobileMenu: !!document.querySelector('#nav-mobile-menu'),
      bottomNav: !!document.querySelector('.bottom-nav, .ap-bottom-nav, #bottom-nav'),
      footer: !!footer,
      logo: !!wordmark,
    },
    namedTaps,
    linkHits,
    taps: taps.slice(0, 50),
    tapsUnder44: taps.filter((t) => t.min < 44),
    smallestTap: taps[0] || null,
    canvas: canvasBox,
    canvasWrap: wrapBox,
    canvasIntrinsic: canvas ? { w: canvas.width, h: canvas.height, id: canvas.id || '' } : null,
    canvasInFirst844: !!(canvasBox && canvasBox.inFirst844),
    canvasFullyInFirst844: !!(canvasBox && canvasBox.top >= 0 && canvasBox.bottom <= 844 && canvasBox.h > 0),
    primaries: [drawBtn, dlBtn].filter(Boolean).map(box),
    scrollW: document.scrollingElement ? document.scrollingElement.scrollWidth : document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
    innerW: window.innerWidth,
    innerH: window.innerHeight,
    overflowers: overflowers.slice(0, 12),
    bodyTextSample: bodyText.slice(0, 280),
    hasDrawMyCard: /draw my card/i.test(bodyText),
    hasRealSkyNews: /real sky news/i.test(title + ' ' + bodyText),
    hasOldH1: /The sky when you arrived/i.test(h1Text),
  };
});

if (measure && measure.primaries) {
  measure.bluePrimaries = measure.primaries.filter((p) => p && looksBlueOrPurple(p.bg));
}

await page.screenshot({ path: join(SHOTS, 'sky-card.png'), fullPage: false }).catch(() => {});
await page.screenshot({ path: join(SHOTS, 'sky-card-full.png'), fullPage: true }).catch(() => {});

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
      const links = Array.from(menu.querySelectorAll('a')).map((a) => {
        const br = a.getBoundingClientRect();
        return {
          text: (a.textContent || '').replace(/\s+/g, ' ').trim(),
          href: a.getAttribute('href') || '',
          w: Math.round(br.width),
          h: Math.round(br.height),
          min: Math.round(Math.min(br.width, br.height)),
        };
      });
      return {
        expanded: tog ? tog.getAttribute('aria-expanded') : null,
        openClass: menu.classList.contains('open') || menu.classList.contains('is-open'),
        ariaHidden: menu.getAttribute('aria-hidden'),
        display: st.display,
        w: Math.round(r.width),
        h: Math.round(r.height),
        linkCount: links.length,
        visibleLinks: links.filter((l) => l.w > 0 && l.h > 0),
        minLinkH: links.length ? Math.min(...links.map((l) => l.h)) : 0,
        linksUnder44: links.filter((l) => l.min > 0 && l.min < 44),
      };
    });
    const openSnap = await snap();
    await page.waitForTimeout(1100);
    const staySnap = await snap();
    drawer = {
      ...openSnap,
      stayedOpen: !!(staySnap && staySnap.h > 80 && staySnap.visibleLinks && staySnap.visibleLinks.length > 0 && staySnap.expanded === 'true'),
      stayH: staySnap ? staySnap.h : 0,
      stayExpanded: staySnap ? staySnap.expanded : null,
      stayVisibleLinks: staySnap && staySnap.visibleLinks ? staySnap.visibleLinks.length : 0,
    };
    await page.screenshot({ path: join(SHOTS, 'sky-card-drawer.png'), fullPage: false }).catch(() => {});
  } else {
    drawer = { missing: true, reason: 'no .navbar__toggle' };
  }
} catch (e) {
  drawer = { error: e.message };
}
if (measure) measure.drawer = drawer;

const result = {
  id: 'sky-card',
  path: '/sky-card.html?nosw=1',
  status,
  errors: errors.slice(0, 8),
  swV_expected: 'ap-v874',
  ...measure,
};

await context.close();
await browser.close();

const named = (measure && measure.namedTaps) || {};
const specialUnder44 = [];
for (const [k, v] of Object.entries(named)) {
  if (v && v.min < 44) specialUnder44.push({ key: k, ...v });
}
const linkUnder44 = (measure && measure.linkHits || []).filter((l) => l.min < 44);
const canvas = measure && measure.canvas;

const summary = {
  viewport: [390, 844],
  swV: 'ap-v874',
  identity: measure && measure.identity,
  title: measure && measure.title,
  h1Text: measure && measure.h1Text,
  h1Font: measure && measure.h1Font,
  h1Lines: measure && measure.h1Lines,
  copyPx: measure && measure.copyPx,
  copyText: measure && measure.copyText,
  namedTaps: named,
  specialUnder44,
  linkHits: measure && measure.linkHits,
  linkUnder44,
  tapsUnder44: measure && measure.tapsUnder44,
  tapsUnder44Count: measure && measure.tapsUnder44 ? measure.tapsUnder44.length : null,
  canvas,
  canvasIntrinsic: measure && measure.canvasIntrinsic,
  canvasInFirst844: measure && measure.canvasInFirst844,
  canvasFullyInFirst844: measure && measure.canvasFullyInFirst844,
  scrollW: measure && measure.scrollW,
  innerW: measure && measure.innerW,
  overflowers: measure && measure.overflowers,
  chrome: measure && measure.chrome,
  drawer,
  wordmarkText: measure && measure.wordmarkText,
  wordmarkOneWord: measure && measure.wordmarkOneWord,
  wordmarkTwoWords: measure && measure.wordmarkTwoWords,
  titleHasOneWord: measure && measure.titleHasOneWord,
  titleHasTwoWords: measure && measure.titleHasTwoWords,
  primaries: measure && measure.primaries,
  bluePurplePrimaries: measure && measure.bluePrimaries,
  hasRealSkyNews: measure && measure.hasRealSkyNews,
  hasOldH1: measure && measure.hasOldH1,
  shippingFilesChanged: false,
  bumped: false,
  pushed: false,
  committed: false,
};

writeFileSync(join(OUT, 'measure.json'), JSON.stringify(result, null, 2));
writeFileSync(join(OUT, 'summary.json'), JSON.stringify(summary, null, 2));

console.log(JSON.stringify({
  status,
  identity: measure && measure.identity,
  title: measure && measure.title,
  h1: measure && measure.h1Text,
  h1Font: measure && measure.h1Font,
  copyPx: measure && measure.copyPx,
  scrollW: measure && measure.scrollW,
  canvas: canvas ? (canvas.w + 'x' + canvas.h + ' top=' + canvas.top + ' bot=' + canvas.bottom) : null,
  inFold: measure && measure.canvasInFirst844,
  fullyInFold: measure && measure.canvasFullyInFirst844,
  tapsUnder44: measure && measure.tapsUnder44 && measure.tapsUnder44.length,
  specialUnder44: specialUnder44.map((t) => t.key + ':' + t.min),
  wordmark: measure && measure.wordmarkText,
  oneWord: measure && measure.wordmarkOneWord,
  drawer: drawer && (drawer.missing ? 'missing' : ('open=' + drawer.stayedOpen + ' h=' + drawer.h)),
  blueP: measure && measure.bluePrimaries && measure.bluePrimaries.length,
  chrome: measure && measure.chrome,
}, null, 2));
console.log('WROTE', join(OUT, 'measure.json'));
