/* WOW Slice 1 verification — real-user mode (AutomationControlled off, chrome
   shim). Gates: frame in stage bounds, one-shot curtain-raise, LIVE honesty,
   caption piggyback, mobile plinth tray BELOW the canvas, DESIGN LAW disc
   clearance (controls/caption never intersect the disc circle), desktop
   formTop/overlapY identical to BEFORE, mobile form fully in viewport 1,
   PRM instant, WebGL-blocked fail-open, zero console errors.
   Outputs JSON + screenshots to out/slice1-2026-07-10/. */
import { chromium } from 'playwright';
import fs from 'fs';

const OUT = 'out/slice1-2026-07-10';
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://127.0.0.1:8790';
const DESK_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const MOB_UA = 'Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';
const BEFORE = JSON.parse(fs.readFileSync(`${OUT}/before-metrics.json`, 'utf8'));

const report = { checks: [], consoleErrors: {}, discClearance: {} };
function gate(name, ok, detail) {
  report.checks.push({ name, ok: !!ok, detail: detail == null ? '' : String(detail) });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail != null ? ' — ' + detail : ''}`);
}

const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader-webgl', '--disable-blink-features=AutomationControlled'] });

async function open(path, { mobile = false, prm = false, blockWebGL = false } = {}) {
  const ctx = await b.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1,
    userAgent: mobile ? MOB_UA : DESK_UA,
    serviceWorkers: 'block',
    reducedMotion: prm ? 'reduce' : 'no-preference',
  });
  const p = await ctx.newPage();
  if (blockWebGL) await p.route('**/orrery-webgl.js*', (r) => r.abort());
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
  const stageR = r(stage), copyR = r(copy);
  return {
    formTop: form ? r(form).top : null,
    submitBottom: submit ? r(submit).bottom : null,
    stage: stageR,
    overlapY: stageR && copyR ? stageR.bottom - copyR.top : null,
    scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
  };
};

const windowJs = () => {
  const w = document.getElementById('apModelWindow');
  const stage = document.querySelector('.hero-solar-stage') || document.querySelector('.explore-stage');
  if (!w || !stage) return null;
  const cs = getComputedStyle(w);
  const wr = w.getBoundingClientRect(), sr = stage.getBoundingClientRect();
  const plate = w.querySelector('.ap-mw-plate');
  const live = w.querySelector('.ap-mw-live');
  const dot = w.querySelector('.ap-mw-dot');
  const cap = document.getElementById('apModelCaption');
  return {
    opacity: cs.opacity, visibility: cs.visibility,
    insideStageX: wr.left >= sr.left - 1 && wr.right <= sr.right + 1,
    topInStage: wr.top >= sr.top - 1,
    plateFont: plate ? getComputedStyle(plate).fontFamily.slice(0, 60) : null,
    plateWeight: plate ? getComputedStyle(plate).fontWeight : null,
    liveOpacity: live ? getComputedStyle(live).opacity : null,
    dotAnim: dot ? getComputedStyle(dot).animationName : null,
    caption: cap ? cap.textContent : null,
    revealed: document.documentElement.classList.contains('ap-model-revealed'),
    full: document.documentElement.classList.contains('orrery-full'),
  };
};

/* DESIGN LAW — disc bounding circle vs every control/caption rect.
   Home: disc circle from the orrery wrap box (center + wrapWidth/2 — the disc
   never exceeds its wrap). Explore: proxy per owner's gate — canvas center,
   radius 0.42*min(stageW,stageH) (deliberately larger than any Earth-rest
   framing). Returns per-element distance minus radius (negative = intersect). */
const discClearanceJs = (isExplore) => {
  const stage = document.querySelector('.hero-solar-stage') || document.querySelector('.explore-stage');
  const wrap = document.getElementById('apAwardOrreryWrap');
  if (!stage || !wrap) return null;
  const sr = stage.getBoundingClientRect();
  let cx, cy, r;
  if (isExplore) {
    cx = sr.left + sr.width / 2; cy = sr.top + sr.height / 2;
    r = 0.42 * Math.min(sr.width, sr.height);
  } else {
    const wr = wrap.getBoundingClientRect();
    cx = wr.left + wr.width / 2; cy = wr.top + wr.height / 2;
    r = wr.width / 2;
  }
  const sels = [
    ['plate', '.ap-mw-plate'],
    ['deck', '#orrery-lite-deck'],
    ['pill', '.lite-vp-btn'],
    ['scrub', '#lite-scrub'],
    ['now', '.ap-orrery-now'],
    ['date', '#lite-date-display'],
    ['scaleStrip', '.ap-scale-strip'],
    ['stepper', '.ap-scale-stepper'],
  ];
  const out = [];
  for (const [label, sel] of sels) {
    document.querySelectorAll(sel).forEach((el, i) => {
      const cs2 = getComputedStyle(el);
      const q = el.getBoundingClientRect();
      if (cs2.display === 'none' || cs2.visibility === 'hidden' || q.width <= 0 || q.height <= 0) return;
      const nx = Math.max(q.left, Math.min(cx, q.right));
      const ny = Math.max(q.top, Math.min(cy, q.bottom));
      const dist = Math.hypot(cx - nx, cy - ny);
      out.push({ el: label + (i ? '#' + i : ''), clearancePx: Math.round(dist - r) });
    });
  }
  return { cx: Math.round(cx), cy: Math.round(cy), r: Math.round(r), elements: out, worst: out.length ? Math.min(...out.map((o) => o.clearancePx)) : null };
};

/* ── 1. HOME DESKTOP — frame, curtain-raise, honesty, metrics identical ── */
{
  const { ctx, p, errs } = await open('');
  await p.waitForTimeout(1200);
  const early = await p.evaluate(windowJs);
  const earlyM = await p.evaluate(measureJs);
  gate('home desk: LIVE hidden + no reveal in poster state', early && early.liveOpacity === '0' && !early.revealed, JSON.stringify({ live: early && early.liveOpacity, revealed: early && early.revealed }));
  const gotFull = await p.waitForFunction(() => document.documentElement.classList.contains('orrery-full'), null, { timeout: 25000 }).then(() => true).catch(() => false);
  await p.waitForTimeout(1600);
  const liveW = await p.evaluate(windowJs);
  const liveM = await p.evaluate(measureJs);
  const disc = await p.evaluate(discClearanceJs, false);
  report.discClearance['home-desktop'] = disc;
  gate('home desk: engine reached orrery-full', gotFull);
  gate('home desk: curtain-raise fired (ap-model-revealed) after live', liveW.revealed && liveW.full);
  gate('home desk: frame visible + anchored in stage', liveW.opacity === '1' && liveW.insideStageX && liveW.topInStage, JSON.stringify({ op: liveW.opacity, x: liveW.insideStageX, top: liveW.topInStage }));
  gate('home desk: LIVE tag lit after orrery-full', liveW.liveOpacity === '1', liveW.liveOpacity);
  gate('home desk: caption is IBM Plex Mono weight 400', /IBM Plex Mono|monospace/i.test(liveW.plateFont || '') && liveW.plateWeight === '400', `${liveW.plateFont} w=${liveW.plateWeight}`);
  gate('home desk: caption text VSOP87·SCALE·date shape', /^VSOP87 · [A-Z]+ · \d{2} [A-Z]{3} \d{4}$/.test(liveW.caption || ''), liveW.caption);
  gate('home desk: DESIGN LAW — zero control/caption over the disc', disc && disc.worst >= 0, JSON.stringify(disc));
  const B = BEFORE.desktop;
  gate('home desk: formTop IDENTICAL (poster)', earlyM.formTop === B.poster.formTop, `now=${earlyM.formTop} before=${B.poster.formTop}`);
  gate('home desk: formTop IDENTICAL (live)', liveM.formTop === B.live.formTop, `now=${liveM.formTop} before=${B.live.formTop}`);
  gate('home desk: overlapY IDENTICAL (live)', liveM.overlapY === B.live.overlapY, `now=${liveM.overlapY} before=${B.live.overlapY}`);
  gate('home desk: submitBottom IDENTICAL (live)', liveM.submitBottom === B.live.submitBottom, `now=${liveM.submitBottom} before=${B.live.submitBottom}`);
  gate('home desk: zero console errors', errs.length === 0, errs.join(' | ') || 'none');
  await p.screenshot({ path: `${OUT}/after-home-desktop-live.png` });
  report.consoleErrors['home-desktop'] = errs;
  await ctx.close();
}

/* ── 2. HOME 390x844 — plinth tray BELOW canvas, disc untouched, form in vp1 ── */
{
  const { ctx, p, errs } = await open('', { mobile: true });
  await p.waitForTimeout(1200);
  const earlyM = await p.evaluate(measureJs);
  const gotFull = await p.waitForFunction(() => document.documentElement.classList.contains('orrery-full'), null, { timeout: 25000 }).then(() => true).catch(() => false);
  await p.waitForTimeout(1600);
  const liveM = await p.evaluate(measureJs);
  const disc = await p.evaluate(discClearanceJs, false);
  report.discClearance['home-mobile'] = disc;
  const deck = await p.evaluate(() => {
    const d = document.getElementById('orrery-lite-deck');
    const stage = document.querySelector('.hero-solar-stage');
    if (!d || !stage) return null;
    const cs = getComputedStyle(d);
    const dr = d.getBoundingClientRect(), sr = stage.getBoundingClientRect();
    const pills = [...d.querySelectorAll('.lite-vp-btn')].map((x) => {
      const r2 = x.getBoundingClientRect();
      return { w: Math.round(r2.width), h: Math.round(r2.height) };
    });
    const row = d.querySelector('.lite-vp-controls');
    const scrub = d.querySelector('.ap-orrery-scrub');
    const now = d.querySelector('.ap-orrery-now');
    const plate = document.querySelector('.ap-mw-plate');
    const pr = plate && plate.getBoundingClientRect();
    return {
      display: cs.display,
      trayBelowCanvas: dr.top >= sr.bottom - 1,
      plateBelowCanvas: pr ? pr.top >= sr.bottom - 1 : null,
      rect: { top: Math.round(dr.top + scrollY), bottom: Math.round(dr.bottom + scrollY), h: Math.round(dr.height) },
      stageBottom: Math.round(sr.bottom + scrollY),
      pills, pillsScrollable: row ? row.scrollWidth >= row.clientWidth : false,
      rowDisplay: row ? getComputedStyle(row).display : null,
      scrubVisible: scrub ? scrub.getBoundingClientRect().width > 100 : false,
      nowH: now ? Math.round(now.getBoundingClientRect().height) : 0,
      scaleStrip: (() => { const s = d.querySelector('.ap-scale-strip'); return s ? getComputedStyle(s).display : 'absent'; })(),
    };
  });
  const B = BEFORE.mobile;
  gate('home 390: engine reached orrery-full', gotFull);
  gate('home 390: compact tray visible (display grid)', deck && deck.display === 'grid', deck && deck.display);
  gate('home 390: DESIGN LAW — tray + plaque BELOW the canvas viewport', deck && deck.trayBelowCanvas && deck.plateBelowCanvas, JSON.stringify(deck && { tray: deck.rect, stageBottom: deck.stageBottom, plateBelow: deck.plateBelowCanvas }));
  gate('home 390: DESIGN LAW — zero control/caption over the disc', disc && disc.worst >= 0, JSON.stringify(disc));
  gate('home 390: planet pills present + ≥44px targets', deck && deck.pills.length >= 10 && deck.pills.every((x) => x.h >= 44 && x.w >= 44), JSON.stringify(deck && deck.pills.slice(0, 4)));
  gate('home 390: pills row horizontal scroll', deck && deck.rowDisplay === 'flex' && deck.pillsScrollable, `row=${deck && deck.rowDisplay} scrollable=${deck && deck.pillsScrollable}`);
  gate('home 390: time scrub visible', deck && deck.scrubVisible);
  gate('home 390: Now button ≥44px', deck && deck.nowH >= 44, deck && deck.nowH);
  gate('home 390: scale strip hidden this slice (documented)', deck && deck.scaleStrip === 'none', deck && deck.scaleStrip);
  gate('home 390: layout stable poster→live (no CLS)', earlyM.formTop === liveM.formTop && earlyM.submitBottom === liveM.submitBottom, `poster=${earlyM.formTop}/${earlyM.submitBottom} live=${liveM.formTop}/${liveM.submitBottom}`);
  gate('home 390: cast form fully in viewport 1 (submit ≤844)', liveM.submitBottom <= 844, `submitBottom=${liveM.submitBottom} (before=${B.live.submitBottom}; tray funded by stage shrink per owner law)`);
  gate('home 390: scrollWidth ≤391', liveM.scrollWidth <= 391, liveM.scrollWidth);
  gate('home 390: zero console errors', errs.length === 0, errs.join(' | ') || 'none');
  report.mobileFormDelta = { formTopBefore: B.live.formTop, formTopAfter: liveM.formTop, submitBottomBefore: B.live.submitBottom, submitBottomAfter: liveM.submitBottom };
  await p.screenshot({ path: `${OUT}/after-home-mobile-live.png` });
  const sunActive = await p.evaluate(async () => {
    const sun = document.querySelector('.lite-vp-btn[data-lite-planet="sun"]');
    if (!sun) return 'missing';
    sun.click();
    await new Promise((res) => setTimeout(res, 700));
    return sun.classList.contains('active') ? 'active' : 'clicked-no-active';
  });
  gate('home 390: pill tap responds (Sun focus)', sunActive === 'active', sunActive);
  report.consoleErrors['home-mobile'] = errs;
  await ctx.close();
}

/* ── 3. EXPLORE — frame + caption; scale change updates caption; plate clear ── */
{
  const { ctx, p, errs } = await open('explore.html');
  const gotFull = await p.waitForFunction(() => document.documentElement.classList.contains('orrery-full'), null, { timeout: 30000 }).then(() => true).catch(() => false);
  await p.waitForTimeout(2000);
  const w = await p.evaluate(windowJs);
  const disc = await p.evaluate(discClearanceJs, true);
  report.discClearance['explore-desktop'] = disc;
  gate('explore: engine reached orrery-full', gotFull);
  gate('explore: frame visible + anchored in stage', w && w.opacity === '1' && w.insideStageX && w.topInStage, JSON.stringify(w && { op: w.opacity, x: w.insideStageX, top: w.topInStage }));
  gate('explore: LIVE lit + caption shape', w && w.liveOpacity === '1' && /^VSOP87 · [A-Z]+ · \d{2} [A-Z]{3} \d{4}$/.test(w.caption || ''), w && w.caption);
  const plateClear = disc && disc.elements.filter((e) => e.el === 'plate').every((e) => e.clearancePx >= 0);
  gate('explore: caption plate clear of disc (0.42·minDim proxy)', plateClear, JSON.stringify(disc && disc.elements.filter((e) => e.el === 'plate')));
  const capBefore = w && w.caption;
  const clicked = await p.evaluate(() => {
    const btn = document.querySelector('.orrery-scale-btn[data-scale="5"]');
    if (!btn) return false;
    btn.click();
    return true;
  });
  await p.waitForTimeout(2600);
  const capAfter = await p.evaluate(() => (document.getElementById('apModelCaption') || {}).textContent);
  gate('explore: scale change updates caption (→ GALAXY)', clicked && capAfter !== capBefore && /GALAXY/.test(capAfter || ''), `before="${capBefore}" after="${capAfter}"`);
  gate('explore: zero console errors', errs.length === 0, errs.join(' | ') || 'none');
  await p.screenshot({ path: `${OUT}/after-explore-galaxy.png` });
  report.consoleErrors['explore'] = errs;
  await ctx.close();

  // explore 390 — plate position + clearance report (pre-existing deck chrome measured, reported)
  const m = await open('explore.html', { mobile: true });
  await m.p.waitForFunction(() => document.documentElement.classList.contains('orrery-full'), null, { timeout: 30000 }).then(() => true).catch(() => false);
  await m.p.waitForTimeout(1800);
  const md = await m.p.evaluate(discClearanceJs, true);
  report.discClearance['explore-mobile'] = md;
  const mPlateClear = md && md.elements.filter((e) => e.el === 'plate').every((e) => e.clearancePx >= 0);
  gate('explore 390: caption plate clear of disc (proxy)', mPlateClear !== false, JSON.stringify(md && md.elements.filter((e) => e.el === 'plate')));
  await m.p.screenshot({ path: `${OUT}/after-explore-mobile.png` });
  await m.ctx.close();
}

/* ── 4. PRM — home: no frame, wheel path; explore: instant reveal, no pulse ── */
{
  const { ctx, p, errs } = await open('', { prm: true });
  await p.waitForTimeout(4000);
  const r = await p.evaluate(() => ({
    revealed: document.documentElement.classList.contains('ap-model-revealed'),
    liteHero: document.documentElement.classList.contains('ap-lite-hero'),
    awaitWebgl: document.documentElement.classList.contains('ap-await-webgl'),
    frameOpacity: (() => { const w = document.getElementById('apModelWindow'); return w ? getComputedStyle(w).opacity : null; })(),
    wheelVisible: (() => { const f = document.getElementById('apHeroWheelFallback'); if (!f) return false; const cs = getComputedStyle(f); return cs.display !== 'none' && !f.classList.contains('ap-hero-wheel-fallback--hidden'); })(),
  }));
  gate('home PRM: no boot, no reveal, frame hidden', !r.liteHero && !r.awaitWebgl && !r.revealed && r.frameOpacity === '0', JSON.stringify(r));
  gate('home PRM: engraved wheel visible', r.wheelVisible);
  report.consoleErrors['home-prm'] = errs;
  await ctx.close();

  const m = await open('', { mobile: true, prm: true });
  await m.p.waitForTimeout(3000);
  const md = await m.p.evaluate(() => {
    const d = document.getElementById('orrery-lite-deck');
    return d ? getComputedStyle(d).display : null;
  });
  gate('home PRM 390: deck stays hidden (no dead chrome)', md === 'none', md);
  await m.ctx.close();

  const e = await open('explore.html', { prm: true });
  const eFull = await e.p.waitForFunction(() => document.documentElement.classList.contains('orrery-full'), null, { timeout: 30000 }).then(() => true).catch(() => false);
  await e.p.waitForTimeout(1500);
  const er = await e.p.evaluate(() => ({
    revealed: document.documentElement.classList.contains('ap-model-revealed'),
    frameOpacity: (() => { const w = document.getElementById('apModelWindow'); return w ? getComputedStyle(w).opacity : null; })(),
    hairlineAnim: (() => { const w = document.getElementById('apModelWindow'); return w ? getComputedStyle(w, '::before').animationName : null; })(),
    dotAnim: (() => { const d = document.querySelector('.ap-mw-dot'); return d ? getComputedStyle(d).animationName : null; })(),
  }));
  if (eFull) {
    gate('explore PRM: instant reveal (frame on, no entry animation)', er.revealed && er.frameOpacity === '1' && er.hairlineAnim === 'none', JSON.stringify(er));
    gate('explore PRM: no dot pulse', er.dotAnim === 'none', er.dotAnim);
  } else {
    gate('explore PRM: engine did not go full — frame stayed hidden (honest)', !er.revealed && er.frameOpacity === '0', JSON.stringify(er));
  }
  report.consoleErrors['explore-prm'] = e.errs;
  await e.ctx.close();
}

/* ── 5. FAIL-OPEN — WebGL module blocked: wheel restored, NO LIVE badge ── */
{
  const { ctx, p, errs } = await open('', { blockWebGL: true });
  await p.waitForTimeout(11000); // past the 9s fail-open timer
  const r = await p.evaluate(() => ({
    full: document.documentElement.classList.contains('orrery-full'),
    revealed: document.documentElement.classList.contains('ap-model-revealed'),
    frameOpacity: (() => { const w = document.getElementById('apModelWindow'); return w ? getComputedStyle(w).opacity : null; })(),
    liveOpacity: (() => { const l = document.querySelector('.ap-mw-live'); return l ? getComputedStyle(l).opacity : null; })(),
    posterOrWheel: (() => {
      const poster = document.getElementById('orrery-lite-poster');
      const wheel = document.getElementById('apHeroWheelFallback');
      const pReady = poster && poster.classList.contains('lite-poster-ready');
      const wheelShown = wheel && !wheel.classList.contains('ap-hero-wheel-fallback--hidden') && getComputedStyle(wheel).display !== 'none';
      return { pReady, wheelShown };
    })(),
  }));
  gate('fail-open: never orrery-full, never revealed, frame hidden', !r.full && !r.revealed && r.frameOpacity === '0', JSON.stringify(r));
  gate('fail-open: NO LIVE badge', r.liveOpacity === '0', r.liveOpacity);
  gate('fail-open: 2D poster or engraved wheel carries the hero', r.posterOrWheel.pReady || r.posterOrWheel.wheelShown, JSON.stringify(r.posterOrWheel));
  await p.screenshot({ path: `${OUT}/after-home-failopen.png` });
  report.consoleErrors['home-failopen'] = errs.filter((x) => !/orrery-webgl|Failed to fetch|net::ERR_FAILED|dynamically imported/i.test(x));
  gate('fail-open: no unrelated console errors', report.consoleErrors['home-failopen'].length === 0, report.consoleErrors['home-failopen'].join(' | ') || 'none (blocked-module errors excluded)');
  await ctx.close();
}

fs.writeFileSync(`${OUT}/after-report.json`, JSON.stringify(report, null, 2));
const fails = report.checks.filter((c) => !c.ok);
console.log(`\n${report.checks.length - fails.length}/${report.checks.length} PASS${fails.length ? ' — FAILURES: ' + fails.map((f) => f.name).join(' | ') : ''}`);
console.log('disc clearance:', JSON.stringify(report.discClearance, null, 1));
await b.close();
process.exit(fails.length ? 1 : 0);
