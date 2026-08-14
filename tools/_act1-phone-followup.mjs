#!/usr/bin/env node
/**
 * Overnight follow-up: home → chart → couples → deep-reading at 390×844.
 * Gift / sky-card is PR 18 — not in this pass.
 */
import { chromium } from './visual-check/node_modules/playwright/index.mjs';
import { mkdirSync } from 'node:fs';

const BASE = process.env.AP_BASE || 'http://127.0.0.1:8790';
const W = 390;
const H = 844;
const SHOT = '/tmp/ap-phone-followup';
mkdirSync(SHOT, { recursive: true });

const PAGES = [
  { id: 'home', path: '/index.html' },
  { id: 'chart', path: '/chart.html' },
  { id: 'couples', path: '/compatibility.html' },
  { id: 'deep-reading', path: '/deep-reading.html' },
];

function q(url) {
  return url.includes('?') ? `${url}&nosw=1` : `${url}?nosw=1`;
}

const browser = await chromium.launch({
  channel: 'chrome',
  args: ['--use-gl=angle', '--use-angle=swiftshader-webgl', '--enable-webgl', '--ignore-gpu-blocklist'],
});

const out = [];

for (const pageDef of PAGES) {
  const context = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  const url = q(`${BASE}${pageDef.path}`);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(pageDef.id === 'home' || pageDef.id === 'couples' ? 2800 : 1800);
  await page.screenshot({ path: `${SHOT}/${pageDef.id}-top.png`, fullPage: false });
  if (pageDef.id !== 'home') {
    await page.evaluate(() => window.scrollTo(0, 520));
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${SHOT}/${pageDef.id}-mid.png`, fullPage: false });
    await page.evaluate(() => window.scrollTo(0, 0));
  }

  const m = await page.evaluate(async () => {
    const rgb = (el, prop) => {
      if (!el) return null;
      return getComputedStyle(el)[prop];
    };
    const hexish = (c) => {
      if (!c) return null;
      const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (!m) return c;
      const [r, g, b] = [+m[1], +m[2], +m[3]];
      const toHex = (n) => n.toString(16).padStart(2, '0');
      return `#${toHex(r)}${toHex(g)}${toHex(b)} ${c}`;
    };
    const looksBluePurple = (c) => {
      if (!c) return false;
      const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (!m) return false;
      const [r, g, b] = [+m[1], +m[2], +m[3]];
      if (r + g + b < 40) return false;
      return (b > r + 25 && b > g + 10) || (b > 140 && r > 80 && r < 180 && g < 120);
    };

    const h1 = document.querySelector('h1');
    const hs = h1 ? getComputedStyle(h1) : null;
    const copyEls = [...document.querySelectorAll('p, .ap-live-copy, .standfirst, .chart-hero__subtitle, .ap-natal-lede')]
      .filter((el) => el.offsetParent !== null && (el.textContent || '').trim().length > 40)
      .slice(0, 4)
      .map((el) => ({
        cls: (el.className || '').toString().slice(0, 40),
        fs: parseFloat(getComputedStyle(el).fontSize),
        text: (el.textContent || '').trim().slice(0, 70),
      }));
    const labelSpans = [...document.querySelectorAll('.ap-natal-form label span, .form-label, .ap-field-label')]
      .slice(0, 8)
      .map((el) => ({
        fs: parseFloat(getComputedStyle(el).fontSize),
        text: (el.textContent || '').trim().slice(0, 36),
      }));

    const taps = [];
    document.querySelectorAll('a, button, [role="button"], input[type="submit"]').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return;
      if (r.bottom < 0 || r.top > 2400) return;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return;
      taps.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.className || '').toString().slice(0, 48),
        x: Math.round(r.x),
        y: Math.round(r.y),
        w: Math.round(r.width),
        h: Math.round(r.height),
        text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 40),
      });
    });
    const smallTaps = taps.filter((t) => t.h < 44);
    let closePairs = 0;
    for (let i = 0; i < taps.length; i++) {
      for (let j = i + 1; j < taps.length; j++) {
        const a = taps[i];
        const b = taps[j];
        const dx = Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w));
        const dy = Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.h, b.y + b.h));
        const gap = Math.hypot(dx, dy);
        if (gap > 0 && gap < 8) closePairs += 1;
      }
    }

    const stage = document.querySelector('.ap-hero-stage, .ap-room-sky, .ap-compat-stage, .ap-model-stage, .ap-live-stage');
    const sr = stage ? stage.getBoundingClientRect() : null;
    const canvas = document.querySelector('canvas');
    const cr = canvas ? canvas.getBoundingClientRect() : null;
    const orr = document.querySelector('void-orrery, #orr, [data-renderer]');
    const renderer = (orr && (orr.getAttribute('data-renderer') || orr.getAttribute('renderer')))
      || document.documentElement.getAttribute('data-renderer')
      || '';
    const glOk = !!(canvas && canvas.getContext && (canvas.getContext('webgl2') || canvas.getContext('webgl')));

    const word = (document.querySelector('.logo-text') || document.querySelector('.navbar__logo'))?.textContent?.replace(/\s+/g, '') || '';

    const toggle = document.querySelector('.navbar__toggle');
    const menu = document.querySelector('.navbar__mobile-menu, #nav-mobile-menu');
    let drawer = { found: !!toggle };
    if (toggle) {
      const openState = () => ({
        expanded: toggle.getAttribute('aria-expanded'),
        hidden: menu ? menu.getAttribute('aria-hidden') : null,
        openClass: document.body.classList.contains('nav-drawer-open')
          || document.documentElement.classList.contains('nav-drawer-open')
          || (menu && menu.classList.contains('is-open')),
        menuH: menu ? Math.round(menu.getBoundingClientRect().height) : 0,
      });
      const before = openState();
      toggle.click();
      await new Promise((r) => setTimeout(r, 200));
      const afterClick = openState();
      await new Promise((r) => setTimeout(r, 600));
      const stayed = openState();
      drawer = {
        found: true,
        before,
        afterClick,
        stayed,
        stayedOpen: stayed.expanded === 'true' || stayed.openClass === true || stayed.menuH > 40,
      };
    }

    const aBtn = document.querySelector('#ab-a, [data-person="a"]');
    const bBtn = document.querySelector('#ab-b, [data-person="b"]');
    if (aBtn) aBtn.setAttribute('aria-pressed', 'true');
    if (bBtn) bBtn.setAttribute('aria-pressed', 'false');
    const pairA = aBtn ? hexish(rgb(aBtn, 'borderColor')) : null;
    if (aBtn) aBtn.setAttribute('aria-pressed', 'false');
    if (bBtn) bBtn.setAttribute('aria-pressed', 'true');
    const pairB = bBtn ? hexish(rgb(bBtn, 'borderColor')) : null;
    const pair = { aPressedBorder: pairA, bPressedBorder: pairB };

    const primaries = [...document.querySelectorAll('.btn-primary, .btn--primary, [type="submit"], .ap-action--primary, .tn-btn--primary')]
      .slice(0, 6)
      .map((el) => {
        const bg = rgb(el, 'backgroundColor');
        return {
          text: (el.textContent || '').trim().slice(0, 32),
          bg: hexish(bg),
          bluePurple: looksBluePurple(bg),
        };
      });

    const overflowKids = [...document.querySelectorAll('body *')].filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 392 && r.left < 2;
    }).slice(0, 6).map((el) => ({
      tag: el.tagName.toLowerCase(),
      cls: (el.className || '').toString().slice(0, 40),
      w: Math.round(el.getBoundingClientRect().width),
    }));

    return {
      title: document.title,
      scrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth,
      h1: hs ? { fs: parseFloat(hs.fontSize), lh: parseFloat(hs.lineHeight), text: (h1.textContent || '').trim().slice(0, 60) } : null,
      copyEls,
      labelSpans,
      smallTaps: smallTaps.slice(0, 12),
      tapCount: taps.length,
      minTapH: taps.length ? Math.min(...taps.map((t) => t.h)) : null,
      closePairs,
      stage: sr ? { w: Math.round(sr.width), h: Math.round(sr.height), top: Math.round(sr.top) } : null,
      canvas: cr ? { w: Math.round(cr.width), h: Math.round(cr.height) } : null,
      renderer,
      glOk,
      word,
      drawer,
      pair,
      primaries,
      overflowKids,
    };
  });

  out.push({ id: pageDef.id, url, ...m });
  await context.close();
}

await browser.close();
console.log(JSON.stringify(out, null, 2));
console.log('SHOTS', SHOT);

let fail = 0;
for (const row of out) {
  const h1ok = row.h1 && row.h1.fs >= 32 && row.h1.fs <= 42.5;
  const copyOk = (row.copyEls || []).filter((c) => !/kicker|eyebrow|timecode|hint|hint|mono/.test(c.cls)).every((c) => c.fs >= 15.5 || /kicker|eyebrow|timecode|hint|control-note|model-hint/.test(c.cls));
  const labelsOk = (row.labelSpans || []).every((l) => l.fs >= 15.5);
  const tapsOk = !row.smallTaps.length && row.minTapH >= 44;
  const stageH = row.canvas?.h || 0;
  const stageOk = stageH >= 360 && row.glOk && row.renderer === 'webgl-only';
  const overflowOk = row.scrollW === 390 && !(row.overflowKids || []).length;
  const drawerOk = row.drawer && row.drawer.stayedOpen;
  const wordOk = row.word === 'AstroPrecise';
  const primaryOk = (row.primaries || []).every((p) => !p.bluePurple);
  const pairOk = row.id !== 'couples' || (
    /d8b46a/i.test(row.pair?.aPressedBorder || '') && /ff6428/i.test(row.pair?.bPressedBorder || '')
  );
  const ok = h1ok && labelsOk && tapsOk && stageOk && overflowOk && drawerOk && wordOk && primaryOk && pairOk;
  if (!ok) fail += 1;
  console.log(row.id, {
    h1: row.h1?.fs, h1ok, labelsOk, tapsOk, stageH, stageOk, overflowOk, drawerOk, wordOk, primaryOk, pairOk, copyOk,
  });
}
if (fail) {
  console.error('PHONE BAR FAIL', fail);
  process.exit(1);
}
console.log('PHONE BAR HOLD');
