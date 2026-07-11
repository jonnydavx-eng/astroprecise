/* LIVE production deep-scan — Observatory homepage width sweep + disc-overlap law.
   Target: https://astroprecise.app/  (SW ap-v705). REAL-USER mode:
   AutomationControlled off, real UA, window.chrome shim, pointerdown, SW blocked,
   fresh context per width (cache-clean). Settle >=1600ms before every measure/shot.
   Saves shots -> out/livescan-2026-07-11/ ; JSON report to same dir. */
import { chromium } from 'playwright';
import fs from 'fs';

const OUT = 'out/livescan-2026-07-11';
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'https://astroprecise.app';
const DESK_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const MOB_UA  = 'Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';

// realistic device-like heights per width
const WIDTHS = [
  [360, 780], [390, 844], [414, 896], [459, 920], [540, 960],
  [640, 900], [768, 1024], [900, 1000], [1024, 768], [1280, 800], [1440, 900],
];
const SHOT_WIDTHS = new Set([360, 390, 459, 768, 1024, 1280, 1440]);

const b = await chromium.launch({ args: [
  '--use-gl=angle', '--use-angle=swiftshader-webgl',
  '--disable-blink-features=AutomationControlled',
] });

const report = { base: BASE, ts: new Date().toISOString(), widths: {} };

for (const [W, H] of WIDTHS) {
  const mobile = W < 768;
  const ctx = await b.newContext({
    viewport: { width: W, height: H },
    isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1,
    userAgent: mobile ? MOB_UA : DESK_UA,
    serviceWorkers: 'block',
    bypassCSP: false,
  });
  const p = await ctx.newPage();
  const errs = [];
  const failed = [];
  p.on('pageerror', (e) => errs.push('pageerror: ' + String(e).slice(0, 220)));
  p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 220)); });
  p.on('requestfailed', (r) => failed.push(r.url().slice(0, 160) + ' :: ' + (r.failure()?.errorText || '')));
  p.on('response', (r) => { if (r.status() >= 400) failed.push(r.status() + ' ' + r.url().slice(0, 150)); });
  await p.addInitScript(() => {
    try { localStorage.setItem('ap_intro_complete', '1'); } catch (e) {}
    if (typeof window.chrome === 'undefined') window.chrome = { runtime: {} };
    // webdriver already false-able via AutomationControlled; re-assert defensively
    try { Object.defineProperty(navigator, 'webdriver', { get: () => false }); } catch (e) {}
  });

  const rec = { W, H, mobile };
  try {
    await p.goto(BASE + '/', { waitUntil: 'load', timeout: 70000 });

    // ── FIRST-PAINT masthead snapshot (before any engagement) ──
    await p.waitForTimeout(700);
    rec.mastheadFirstPaint = await p.evaluate(() => {
      const mh = document.querySelector('#apMasthead, .masthead');
      if (!mh) return null;
      const r = mh.getBoundingClientRect();
      const cs = getComputedStyle(mh);
      return { top: Math.round(r.top), h: Math.round(r.height), pos: cs.position, display: cs.display };
    });
    if (SHOT_WIDTHS.has(W)) {
      await p.screenshot({ path: `${OUT}/firstpaint-${W}.png` });
    }

    // real-user engagement: pointerdown to trip any interaction gates
    await p.mouse.move(Math.round(W / 2), Math.round(H / 2));
    await p.mouse.down(); await p.mouse.up();

    // wait for the 3D engine to take over (orrery-full), then settle hard
    await p.waitForFunction(() => document.documentElement.classList.contains('orrery-full'), null, { timeout: 22000 }).catch(() => {});
    await p.waitForTimeout(1800);

    rec.htmlClasses = await p.evaluate(() => document.documentElement.className);

    // ── measurements ──
    const M = await p.evaluate(() => {
      const R = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), cx: Math.round(r.x + r.width / 2), cy: Math.round(r.y + r.height / 2) }; };
      const vis = (el) => {
        if (!el) return false;
        if (el.hasAttribute && el.hasAttribute('hidden')) return false;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.05) return false;
        const r = el.getBoundingClientRect();
        return r.width > 1 && r.height > 1;
      };

      // Disc geometry: prefer canvas; fall back to viewport wrap
      const canvas = document.querySelector('#orrery-canvas');
      const vp = document.querySelector('#orrery-viewport');
      const stage = document.querySelector('.hero-solar-stage');
      const discSrc = (canvas && vis(canvas)) ? canvas : (vp && vis(vp)) ? vp : stage;
      const dr = discSrc ? discSrc.getBoundingClientRect() : null;
      const disc = dr ? { srcId: discSrc.id || discSrc.className, cx: dr.x + dr.width / 2, cy: dr.y + dr.height / 2, radius: 0.31 * dr.height, rectH: Math.round(dr.height), rectW: Math.round(dr.width) } : null;

      // circle-rect intersection depth (px the rect pushes inside the circle)
      const overlap = (rect) => {
        if (!disc || !rect) return null;
        const nx = Math.max(rect.left, Math.min(disc.cx, rect.right));
        const ny = Math.max(rect.top, Math.min(disc.cy, rect.bottom));
        const d = Math.hypot(disc.cx - nx, disc.cy - ny);
        return +(disc.radius - d).toFixed(1); // >0 means intersects
      };

      const targets = {
        masthead: document.querySelector('#apMasthead, .masthead'),
        castDock: document.querySelector('#castDock'),
        heroForm: document.querySelector('#hero-chart-form'),
        birthInput: document.querySelector('#hero-birthdate'),
        submitBtn: document.querySelector('#hero-chart-form button[type=submit]'),
        tray: document.querySelector('#orrery-lite-deck'),
        pillRow: document.querySelector('.lite-vp-controls'),
        scrub: document.querySelector('#lite-scrub'),
        legend: document.querySelector('#explore-legend'),
        bottomNav: document.querySelector('.bottom-nav'),
        toast: document.querySelector('#apToast'),
        interplay: document.querySelector('.ap-nav-interplay, [class*="interplay"]'),
        liveChip: document.querySelector('.ap-orrery-chip'),
      };
      const rects = {}; const overlaps = {}; const visible = {};
      for (const [k, el] of Object.entries(targets)) {
        visible[k] = vis(el);
        rects[k] = R(el);
        overlaps[k] = (visible[k] && disc) ? overlap(el.getBoundingClientRect()) : null;
      }

      // horizontal overflow
      const scrollW = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);

      // wide element offenders (right > width+1)
      const wideEls = [];
      document.querySelectorAll('body *').forEach((el) => {
        const q = el.getBoundingClientRect();
        if (q.right > window.innerWidth + 1 && q.width > 0) {
          const cs = getComputedStyle(el);
          if (cs.display === 'none' || cs.visibility === 'hidden') return;
          wideEls.push({ el: el.tagName + (el.id ? '#' + el.id : '.' + String(el.className || '').slice(0, 40)), right: Math.round(q.right), w: Math.round(q.width) });
        }
      });

      // tray clipping: does the tray or pill row overflow its own box?
      const trayEl = targets.tray;
      const trayClip = trayEl ? { scrollW: trayEl.scrollWidth, clientW: trayEl.clientWidth, overflowX: getComputedStyle(trayEl).overflowX } : null;
      const pillEl = targets.pillRow;
      const pillClip = pillEl ? { scrollW: pillEl.scrollWidth, clientW: pillEl.clientWidth, overflowX: getComputedStyle(pillEl).overflowX } : null;

      // masthead stacked test: a slim bar should be < ~70px; a stacked pile is taller
      const mh = targets.masthead;
      const mhCs = mh ? getComputedStyle(mh) : null;

      return {
        innerWidth: window.innerWidth, innerHeight: window.innerHeight,
        disc: disc ? { srcId: disc.srcId, cx: Math.round(disc.cx), cy: Math.round(disc.cy), radius: Math.round(disc.radius), rectH: disc.rectH, rectW: disc.rectW } : null,
        visible, rects, overlaps,
        scrollW, wideEls: wideEls.slice(0, 12),
        trayClip, pillClip,
        mastheadNow: mh ? { h: Math.round(mh.getBoundingClientRect().height), pos: mhCs.position } : null,
      };
    });
    rec.m = M;

    // derive verdicts
    const overlapHits = Object.entries(M.overlaps || {})
      .filter(([k, v]) => v != null && v > 1 && !['liveChip'].includes(k))
      .map(([k, v]) => ({ el: k, overlapPx: v, rect: M.rects[k] }));
    rec.discOverlapHits = overlapHits;
    rec.overflow = { scrollW: M.scrollW, ok: M.scrollW <= M.innerWidth + 1, offenders: M.wideEls };
    // cast form fully in viewport-1 (input + submit bottom <= viewport height, top >= 0)
    const inp = M.rects.birthInput, sub = M.rects.submitBtn;
    rec.castVisible = {
      inputVisible: M.visible.birthInput, submitVisible: M.visible.submitBtn,
      inputBottom: inp?.bottom, submitBottom: sub?.bottom, vh: M.innerHeight,
      ok: !!(inp && sub && inp.top >= 0 && sub.bottom <= M.innerHeight + 1),
    };
    rec.masthead = { firstPaint: rec.mastheadFirstPaint, now: M.mastheadNow, slimOK: (rec.mastheadFirstPaint?.h || 999) <= 72 };
    rec.trayClip = { tray: M.trayClip, pill: M.pillClip };

    if (SHOT_WIDTHS.has(W)) {
      await p.screenshot({ path: `${OUT}/rest-${W}.png` });
    }

    rec.console = errs.slice(0, 20);
    rec.failed = [...new Set(failed)].slice(0, 20);
  } catch (e) {
    rec.error = String(e).slice(0, 300);
  }
  report.widths[W] = rec;

  // compact console line
  const oh = (rec.discOverlapHits || []).map(h => `${h.el}+${h.overlapPx}`).join(',') || 'none';
  console.log(`W${W}x${H}  disc r=${rec.m?.disc?.radius ?? '?'} @${rec.m?.disc?.cx},${rec.m?.disc?.cy}  overlap:[${oh}]  scrollW=${rec.overflow?.scrollW}(${rec.overflow?.ok ? 'ok' : 'OVERFLOW'})  cast:${rec.castVisible?.ok ? 'ok' : 'CLIP'}(sub@${rec.castVisible?.submitBottom}/${rec.castVisible?.vh})  mhFP=${rec.mastheadFirstPaint?.h}px${rec.masthead?.slimOK ? '' : ' STACKED'}  err=${rec.console?.length || 0}`);

  await ctx.close();
}

fs.writeFileSync(`${OUT}/sweep-report.json`, JSON.stringify(report, null, 2));
console.log('\nWROTE ' + OUT + '/sweep-report.json');
await b.close();
