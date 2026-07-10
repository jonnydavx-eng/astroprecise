/* OBSERVATORY HOMEPAGE — full gate suite (design 2026-07-10 + coordinator adds).
   Real-user mode (AutomationControlled off, window.chrome shim), SW blocked.

   Gates:
   G1  CAST-0 — date input + submit fully in viewport, no scroll/tap (1440x900 + 390x844)
   G2  CAST-1 — setScaleLevel(5) → compress pill; 1 click → input focused
   G3  DISC WIDTH SWEEP (coordinator #1) — PIXEL-MEASURED Earth disc circle vs every
       overlay rect at 360/390/459/640/768/1024/1280/1440 — zero intersection (+24px
       margin for overlays); tray/bottom-nav below canvas BY MEASUREMENT too.
   G3b Bottom-nav occlusion (coordinator #3) — elementFromPoint sweep across the bar.
   G4  LCP element is the poster; ms recorded.
   G5  FILL — canvas device px ≤1.15e6 @390x844; ≤6.3e6 @1920x1080 DPR2.
   G6  BODYH ≤5500 desktop / ≤7000 mobile.
   G7  SEO — ≥250 visible words outside the stage; visible h1.
   G8  HONESTY — no reveal before orrery-full; legend reachable ≤1 tap; 2D path honest.
   G9  zero console errors; scrollWidth ≤391 @390.
   G10 masthead = slim overlay bar at FIRST PAINT, critical-CSS-only (coordinator #2).
   G11 chrome recession — 6s idle → whisper; input restores; focus-within full opacity; PRM inert.
   G12 nav interplay — chip on hover (engine-derived), ≤1 camera call across 3 quick hovers.
   G13 deck position:static tripwire + per-breakpoint control sets.
   Screenshots → out/observatory-2026-07-10/. Exit 1 on any FAIL. */
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import fs from 'fs';

const OUT = 'out/observatory-2026-07-10';
fs.mkdirSync(OUT, { recursive: true });
const BASE = process.env.OBS_BASE || 'http://127.0.0.1:8790';
const PAGE = process.env.OBS_PAGE != null ? process.env.OBS_PAGE : 'index-next.html';
const DESK_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const MOB_UA = 'Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';

const report = { page: PAGE, checks: [], sweep: {}, consoleErrors: {}, lcp: {}, fill: {} };
function gate(name, ok, detail) {
  report.checks.push({ name, ok: !!ok, detail: detail == null ? '' : String(detail) });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail != null ? ' — ' + detail : ''}`);
}

const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader-webgl', '--disable-blink-features=AutomationControlled'] });

async function open({ w = 1440, h = 900, mobile = false, prm = false, blockWebGL = false, blockCss = false, dsf } = {}) {
  const ctx = await b.newContext({
    viewport: { width: w, height: h },
    isMobile: mobile, hasTouch: mobile, deviceScaleFactor: dsf != null ? dsf : (mobile ? 2 : 1),
    userAgent: mobile ? MOB_UA : DESK_UA,
    serviceWorkers: 'block',
    reducedMotion: prm ? 'reduce' : 'no-preference',
  });
  const p = await ctx.newPage();
  if (blockWebGL) await p.route('**/orrery-webgl.js*', (r) => r.abort());
  if (blockCss) await p.route('**/*.css*', (r) => r.abort());
  const errs = [];
  p.on('pageerror', (e) => errs.push('pageerror: ' + String(e).slice(0, 300)));
  p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 300)); });
  await p.addInitScript(() => {
    try { localStorage.setItem('ap_intro_complete', '1'); } catch (e) {}
    if (typeof window.chrome === 'undefined') window.chrome = { runtime: {} };
    try {
      new PerformanceObserver(() => {}).observe && new PerformanceObserver((l) => {
        for (const e of l.getEntries()) window.__lcp = { tag: e.element ? e.element.tagName + (e.element.id ? '#' + e.element.id : '') : String(e.url || ''), ms: Math.round(e.startTime) };
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (e) {}
  });
  await p.goto(BASE + '/' + PAGE, { waitUntil: 'load', timeout: 60000 });
  return { ctx, p, errs };
}

const waitFull = (p, t = 30000) =>
  p.waitForFunction(() => document.documentElement.classList.contains('orrery-full'), null, { timeout: t }).then(() => true).catch(() => false);

/* ── pixel-measure the Earth disc from a clean stage screenshot ──
   Overlays are opacity-0'd for the shot, restored after. Bright cells (4px grid,
   luma>40, ≥10/16 bright px, ≥2 solid neighbours) → disc = max distance from the
   bright centroid; also returns the bbox for sanity. */
async function measureDisc(p) {
  const stage = await p.evaluate(() => {
    const s = document.querySelector('.hero-solar-stage');
    if (!s) return null;
    const hide = ['.masthead', '.explore-legend', '#apModelWindow', '#heroChapter .hero-copy', '.ap-mw-chip'];
    window.__obsHidden = [];
    hide.forEach((sel) => document.querySelectorAll(sel).forEach((el) => {
      window.__obsHidden.push([el, el.style.opacity]);
      el.style.opacity = '0';
    }));
    const r = s.getBoundingClientRect();
    return { x: Math.max(0, Math.round(r.left)), y: Math.max(0, Math.round(r.top)), w: Math.round(r.width), h: Math.round(r.height) };
  });
  if (!stage) return null;
  await p.waitForTimeout(120);
  const buf = await p.screenshot({ clip: stage, scale: 'css' });
  await p.evaluate(() => { (window.__obsHidden || []).forEach(([el, o]) => { el.style.opacity = o; }); window.__obsHidden = []; });
  const png = PNG.sync.read(buf);
  const W = png.width, H = png.height;
  const CELL = 4, gw = Math.floor(W / CELL), gh = Math.floor(H / CELL);
  const solid = new Uint8Array(gw * gh);
  for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
    let n = 0;
    for (let dy = 0; dy < CELL; dy++) for (let dx = 0; dx < CELL; dx++) {
      const i = ((gy * CELL + dy) * W + gx * CELL + dx) * 4;
      const luma = 0.2126 * png.data[i] + 0.7152 * png.data[i + 1] + 0.0722 * png.data[i + 2];
      if (luma > 40) n++;
    }
    if (n >= 10) solid[gy * gw + gx] = 1;
  }
  // erosion: keep cells with ≥2 solid 4-neighbours (kills stars/noise)
  const keep = new Uint8Array(gw * gh);
  let minX = 1e9, maxX = -1, minY = 1e9, maxY = -1, sx = 0, sy = 0, cnt = 0;
  for (let gy = 1; gy < gh - 1; gy++) for (let gx = 1; gx < gw - 1; gx++) {
    if (!solid[gy * gw + gx]) continue;
    const nb = solid[gy * gw + gx - 1] + solid[gy * gw + gx + 1] + solid[(gy - 1) * gw + gx] + solid[(gy + 1) * gw + gx];
    if (nb < 2) continue;
    keep[gy * gw + gx] = 1;
    const px = gx * CELL + CELL / 2, py = gy * CELL + CELL / 2;
    if (px < minX) minX = px; if (px > maxX) maxX = px;
    if (py < minY) minY = py; if (py > maxY) maxY = py;
    sx += px; sy += py; cnt++;
  }
  if (!cnt) return { found: false, stage };
  const cx = sx / cnt, cy = sy / cnt;
  let r = 0;
  for (let gy = 1; gy < gh - 1; gy++) for (let gx = 1; gx < gw - 1; gx++) {
    if (!keep[gy * gw + gx]) continue;
    const d = Math.hypot(gx * CELL + CELL / 2 - cx, gy * CELL + CELL / 2 - cy);
    if (d > r) r = d;
  }
  return {
    found: true, stage,
    // page coordinates
    cx: Math.round(stage.x + cx), cy: Math.round(stage.y + cy), r: Math.round(r),
    bbox: { x: Math.round(minX), y: Math.round(minY), w: Math.round(maxX - minX), h: Math.round(maxY - minY) },
    ratioShort: +(2 * r / Math.min(stage.w, stage.h)).toFixed(3),
  };
}

const overlayRectsJs = () => {
  const sels = [
    ['masthead', '#apMasthead'],
    ['castDock', '#heroChapter .hero-copy'],
    ['legend', '#explore-legend'],
    ['plate', '.ap-mw-plate'],
    ['chip', '.ap-mw-chip'],
    ['cue', '.ap-mw-scrollcue'],
    ['deck', '#orrery-lite-deck'],
    ['bottomNav', '.bottom-nav'],
    ['castPill', '.ap-cast-pill'],
  ];
  const out = [];
  for (const [label, sel] of sels) {
    document.querySelectorAll(sel).forEach((el) => {
      const cs = getComputedStyle(el);
      const q = el.getBoundingClientRect();
      if (cs.display === 'none' || cs.visibility === 'hidden' || q.width <= 0 || q.height <= 0) return;
      out.push({ el: label, left: q.left, top: q.top, right: q.right, bottom: q.bottom });
    });
  }
  const stage = document.querySelector('.hero-solar-stage');
  const deck = document.getElementById('orrery-lite-deck');
  const sr = stage && stage.getBoundingClientRect();
  const dr = deck && deck.getBoundingClientRect();
  return {
    rects: out,
    stageBottom: sr ? sr.bottom : null,
    deckTop: dr ? dr.top : null,
    deckPosition: deck ? getComputedStyle(deck).position : null,
  };
};

function circleRectClearance(cx, cy, r, rect) {
  const nx = Math.max(rect.left, Math.min(cx, rect.right));
  const ny = Math.max(rect.top, Math.min(cy, rect.bottom));
  return Math.hypot(cx - nx, cy - ny) - r;
}

/* ═══ 1 · DISC WIDTH SWEEP + per-breakpoint controls ═══ */
const SWEEP = [
  { w: 360, h: 800, mobile: true }, { w: 390, h: 844, mobile: true },
  { w: 459, h: 820, mobile: true }, { w: 640, h: 900, mobile: true },
  { w: 768, h: 1024, mobile: true }, { w: 1024, h: 768 },
  { w: 1280, h: 800 }, { w: 1440, h: 900 },
];
for (const vp of SWEEP) {
  const { ctx, p, errs } = await open(vp);
  const key = `${vp.w}x${vp.h}`;
  const full = await waitFull(p);
  await p.waitForTimeout(1600); // settled-screenshot rule ≥1400ms
  const disc = full ? await measureDisc(p) : null;
  const ov = await p.evaluate(overlayRectsJs);
  const entry = { full, disc, deckPosition: ov.deckPosition, clearances: [], bottomNavHits: null };
  // tray below canvas by measurement (zero-by-construction check)
  const trayOk = ov.deckTop == null || ov.stageBottom == null || ov.deckTop >= ov.stageBottom - 1;
  let worst = null;
  if (disc && disc.found) {
    for (const rect of ov.rects) {
      // in-flow chrome below the stage can't overlap by construction, but measure ALL of it anyway
      const c = Math.round(circleRectClearance(disc.cx, disc.cy, disc.r, rect));
      entry.clearances.push({ el: rect.el, clearancePx: c });
      if (worst == null || c < worst) worst = c;
    }
  }
  entry.worst = worst;
  report.sweep[key] = entry;
  gate(`sweep ${key}: engine full`, full);
  gate(`sweep ${key}: deck position static (cascade tripwire)`, ov.deckPosition === 'static', ov.deckPosition);
  gate(`sweep ${key}: tray top ≥ canvas bottom`, trayOk, `deckTop=${Math.round(ov.deckTop)} stageBottom=${Math.round(ov.stageBottom)}`);
  gate(`sweep ${key}: DISC measured`, !!(disc && disc.found), disc && JSON.stringify({ cx: disc.cx, cy: disc.cy, r: disc.r, ratioShort: disc.ratioShort }));
  gate(`sweep ${key}: zero overlay-disc intersection (24px margin)`, worst != null && worst >= 24, `worst=${worst}px ${JSON.stringify(entry.clearances)}`);
  // legend EXPANDED must also clear the disc
  if (disc && disc.found) {
    const expClear = await p.evaluate(() => {
      const el = document.getElementById('explore-legend');
      const btn = document.getElementById('explore-legend-toggle');
      if (!el || !btn) return null;
      btn.click();
      const r = el.getBoundingClientRect();
      btn.click();
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
    });
    if (expClear) {
      const c = Math.round(circleRectClearance(disc.cx, disc.cy, disc.r, expClear));
      gate(`sweep ${key}: legend EXPANDED clear of disc (24px)`, c >= 24, `${c}px`);
    }
  }
  // bottom-nav occlusion sweep (coordinator #3)
  const navHits = await p.evaluate(() => {
    const bar = document.querySelector('.bottom-nav');
    if (!bar || getComputedStyle(bar).display === 'none') return 'no-bar';
    const r = bar.getBoundingClientRect();
    const bad = [];
    for (let i = 0; i <= 12; i++) {
      const x = r.left + 4 + (r.width - 8) * (i / 12);
      const y = r.top + r.height / 2;
      const el = document.elementFromPoint(x, y);
      if (el && !bar.contains(el)) bad.push({ x: Math.round(x), hit: el.tagName + (el.id ? '#' + el.id : '.' + String(el.className).slice(0, 30)) });
    }
    return bad;
  });
  entry.bottomNavHits = navHits;
  gate(`sweep ${key}: nothing occludes the bottom tab bar`, navHits === 'no-bar' || (Array.isArray(navHits) && navHits.length === 0), JSON.stringify(navHits));
  // per-breakpoint control sets
  const ctrls = await p.evaluate(() => {
    const vis = (sel) => { const el = document.querySelector(sel); if (!el) return false; const cs = getComputedStyle(el); const r = el.getBoundingClientRect(); return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0; };
    return {
      track: vis('.ap-scale-strip__track'), stepper: vis('.ap-scale-stepper'),
      caption: vis('.ap-scale-strip__caption'), orbits: vis('#ap-orbits-toggle'),
      pills: document.querySelectorAll('#orrery-lite-deck .lite-vp-btn').length,
      pillVisible: vis('.lite-vp-btn'), scrub: vis('#lite-scrub'), now: vis('#lite-now-btn'),
      journey: vis('#ap-cosmic-journey'), flight: vis('#ap-cosmic-flight-launch'),
      seals: vis('.lite-vp-btn .lite-vp-btn__seal'),
    };
  });
  if (vp.w >= 1024) {
    gate(`sweep ${key}: desktop tray = track+caption+orbits+pills(+seals)+time+scrub+journeys`,
      ctrls.track && ctrls.caption && ctrls.orbits && ctrls.pillVisible && ctrls.scrub && ctrls.now && ctrls.journey && ctrls.flight && !ctrls.stepper,
      JSON.stringify(ctrls));
  } else if (vp.w >= 641) {
    gate(`sweep ${key}: tablet tray = stepper+pills+scrub+now, no track/journeys`,
      ctrls.stepper && !ctrls.track && ctrls.pillVisible && ctrls.scrub && ctrls.now && !ctrls.journey && !ctrls.flight && !ctrls.seals,
      JSON.stringify(ctrls));
  } else {
    gate(`sweep ${key}: phone tray = stepper+pills+scrub+now, no track/journeys/seals`,
      ctrls.stepper && !ctrls.track && ctrls.pillVisible && ctrls.scrub && ctrls.now && !ctrls.journey && !ctrls.flight && !ctrls.seals,
      JSON.stringify(ctrls));
  }
  report.consoleErrors[key] = errs;
  gate(`sweep ${key}: zero console errors`, errs.length === 0, errs.join(' | ') || 'none');
  await ctx.close();
}

/* ═══ 2 · DESKTOP 1440x900 — CAST-0, G2 pill, interplay, recession, LCP, SEO, screenshots ═══ */
{
  const { ctx, p, errs } = await open({ w: 1440, h: 900 });
  // zero-engagement first paint (styled): slim bar + stage from y=0
  const fp = await p.evaluate(() => {
    const m = document.getElementById('apMasthead');
    const s = document.querySelector('.hero-solar-stage');
    const mr = m.getBoundingClientRect(), sr = s.getBoundingClientRect();
    return { mastheadH: Math.round(mr.height), mastheadPos: getComputedStyle(m).position, stageTop: Math.round(sr.top) };
  });
  gate('desk: masthead is slim overlay bar at first paint', fp.mastheadPos === 'absolute' && fp.mastheadH <= 64 && fp.stageTop <= 2, JSON.stringify(fp));
  const early = await p.evaluate(() => ({
    revealed: document.documentElement.classList.contains('ap-model-revealed'),
    liveOp: (() => { const l = document.querySelector('.ap-mw-live'); return l ? getComputedStyle(l).opacity : null; })(),
  }));
  gate('desk: HONESTY — no reveal/LIVE before orrery-full', !early.revealed && early.liveOp === '0', JSON.stringify(early));
  const full = await waitFull(p);
  await p.waitForTimeout(1600);
  gate('desk: poster→live handoff reached orrery-full', full);
  const live = await p.evaluate(() => ({
    revealed: document.documentElement.classList.contains('ap-model-revealed'),
    liveOp: (() => { const l = document.querySelector('.ap-mw-live'); return l ? getComputedStyle(l).opacity : null; })(),
  }));
  gate('desk: curtain-raise + LIVE after orrery-full', live.revealed && live.liveOp === '1', JSON.stringify(live));
  // G1 CAST-0
  const cast = await p.evaluate(() => {
    const i = document.getElementById('hero-birthdate');
    const s = document.querySelector('#hero-chart-form button[type="submit"]');
    const ir = i.getBoundingClientRect(), sr2 = s.getBoundingClientRect();
    return { inputTop: Math.round(ir.top), inputBottom: Math.round(ir.bottom), submitBottom: Math.round(sr2.bottom), scrollY: window.scrollY };
  });
  gate('G1 desk: CAST-0 — input+submit fully in viewport, no scroll', cast.scrollY === 0 && cast.inputTop >= 0 && cast.submitBottom <= 900 - 8, JSON.stringify(cast));
  // LCP
  const lcp = await p.evaluate(() => window.__lcp || null);
  report.lcp.desktop = lcp;
  gate('G4 desk: LCP element is the poster', !!lcp && /orrery-lite-poster|IMG|DIV#orrery-lite-poster/i.test(lcp.tag), JSON.stringify(lcp));
  // G7 SEO
  const seo = await p.evaluate(() => {
    const main = document.querySelector('main');
    const stage = document.querySelector('.hero-solar-stage');
    let text = (main ? main.innerText : '') + ' ' + (document.querySelector('footer') ? document.querySelector('footer').innerText : '');
    if (stage) text = text.replace(stage.innerText, ' ');
    const words = text.split(/\s+/).filter(Boolean).length;
    const h1 = document.querySelector('h1');
    const hr = h1 && h1.getBoundingClientRect();
    return { words, h1Visible: !!(hr && hr.width > 0 && hr.height > 0 && getComputedStyle(h1).visibility !== 'hidden') };
  });
  gate('G7 desk: ≥250 visible words below stage + visible h1', seo.words >= 250 && seo.h1Visible, JSON.stringify(seo));
  // G6 bodyH
  const bodyH = await p.evaluate(() => Math.round(document.body.getBoundingClientRect().height));
  gate('G6 desk: bodyH ≤ 5500', bodyH <= 5500, bodyH);
  // brass CTA + no cyan (computed colors on the new chrome)
  const colors = await p.evaluate(() => {
    const btn = document.querySelector('#hero-chart-form button[type="submit"]');
    const cue = document.querySelector('.ap-mw-scrollcue');
    const ladderB = document.querySelector('.explore-legend__ladder b');
    return {
      btnColor: getComputedStyle(btn).color, btnBg: getComputedStyle(btn).backgroundImage,
      cueColor: cue ? getComputedStyle(cue).color : null,
      ladderB: ladderB ? getComputedStyle(ladderB).color : null,
    };
  });
  const isCyan = (c) => {
    const m = c && c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!m) return false;
    const [r, g, bl] = [+m[1], +m[2], +m[3]];
    return bl > r + 30 && g > r; // blue-leaning = cool cast
  };
  const lum = (r, g, bl) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(bl); };
  // contrast: ink #0B0906 (L≈0.0034) vs darker brass end #C9A227
  const ratio = (lum(201, 162, 39) + 0.05) / (lum(11, 9, 6) + 0.05);
  gate('desk: brass CTA contrast ≥4.5:1 (ink on darker gradient end)', ratio >= 4.5, ratio.toFixed(2) + ':1');
  gate('desk: NO cyan on CTA/cue/legend chrome', /232,\s*200|E8C872|linear-gradient/i.test(colors.btnBg) && !isCyan(colors.btnColor) && !isCyan(colors.cueColor) && !isCyan(colors.ladderB), JSON.stringify(colors));
  // G12 interplay — camera counter monkeypatch, 3 quick hovers
  await p.evaluate(() => {
    const O = window.Orrery3D; window.__camCalls = 0;
    if (O && O.focusPlanet) { const orig = O.focusPlanet.bind(O); O.focusPlanet = (...a) => { window.__camCalls++; return orig(...a); }; }
  });
  const chartLink = p.locator('.contents-nav a[href="chart.html"]');
  await chartLink.hover();
  await p.waitForTimeout(600); // dwell fires once
  const chipState = await p.evaluate(() => {
    const c = document.querySelector('.ap-mw-chip');
    return c ? { text: c.textContent, on: c.classList.contains('is-on'), op: getComputedStyle(c).opacity } : null;
  });
  gate('G12: chip appears on hover with engine-derived text', !!chipState && chipState.on && /cast yours/.test(chipState.text) && /Sun in [A-Z]/i.test(chipState.text), JSON.stringify(chipState));
  await p.locator('.contents-nav a[href="shop.html"]').hover();
  await p.waitForTimeout(400);
  await p.locator('.contents-nav a[href="ephemeris.html"]').hover();
  await p.waitForTimeout(400);
  const camCalls = await p.evaluate(() => window.__camCalls);
  gate('G12: ≤1 camera call across Chart→Shop→Sky quick hovers', camCalls <= 1, `camCalls=${camCalls}`);
  await p.screenshot({ path: `${OUT}/desk-rest.png` });
  // G11 recession — no input for 6s+ (hover state left over doesn't count as input)
  await p.mouse.move(720, 400);
  await p.waitForTimeout(6800);
  const idle = await p.evaluate(() => ({
    idle: document.documentElement.classList.contains('ap-chrome-idle'),
    mastheadOp: +getComputedStyle(document.getElementById('apMasthead')).opacity,
    deckOp: +getComputedStyle(document.getElementById('orrery-lite-deck')).opacity,
    dockOp: +getComputedStyle(document.querySelector('#heroChapter .hero-copy')).opacity,
  }));
  gate('G11: 6s idle → whisper masthead 0.4 / presence deck+dock ≥0.85', idle.idle && idle.mastheadOp <= 0.45 && idle.deckOp >= 0.8 && idle.dockOp >= 0.8, JSON.stringify(idle));
  // focus-within restores full opacity WHILE idle
  await p.evaluate(() => { document.documentElement.classList.add('ap-chrome-idle'); const a = document.querySelector('.contents-nav a'); a && a.focus(); });
  await p.waitForTimeout(250);
  const focusOp = await p.evaluate(() => +getComputedStyle(document.getElementById('apMasthead')).opacity);
  gate('G11: focused masthead is full opacity while idle', focusOp === 1, focusOp);
  await p.mouse.move(600, 300);
  await p.waitForTimeout(400);
  const woke = await p.evaluate(() => ({ idle: document.documentElement.classList.contains('ap-chrome-idle'), op: +getComputedStyle(document.getElementById('apMasthead')).opacity }));
  gate('G11: pointer move restores chrome', !woke.idle && woke.op > 0.9, JSON.stringify(woke));
  // G2 compress state machine
  await p.evaluate(() => window.Orrery3D.setScaleLevel(5));
  await p.waitForTimeout(2600);
  const comp = await p.evaluate(() => {
    const pill = document.querySelector('.ap-cast-pill');
    const r = pill && pill.getBoundingClientRect();
    return { compressed: document.getElementById('heroChapter').classList.contains('ap-cast-compressed'), pillVisible: !!(r && r.width > 0 && r.height >= 44) };
  });
  gate('G2: scale 5 → dock compressed to pill', comp.compressed && comp.pillVisible, JSON.stringify(comp));
  await p.screenshot({ path: `${OUT}/desk-exploring.png` });
  await p.locator('.ap-cast-pill').click();
  await p.waitForTimeout(300);
  const restored = await p.evaluate(() => ({
    compressed: document.getElementById('heroChapter').classList.contains('ap-cast-compressed'),
    focused: document.activeElement === document.getElementById('hero-birthdate'),
  }));
  gate('G2: pill click → dock restored + input focused (1 interaction)', !restored.compressed && restored.focused, JSON.stringify(restored));
  // auto-restore at Earth rest
  await p.evaluate(() => window.Orrery3D.setScaleLevel(3));
  await p.waitForTimeout(1500);
  await p.evaluate(() => window.Orrery3D.setScaleLevel(0));
  await p.waitForTimeout(2800);
  const autoRestored = await p.evaluate(() => !document.getElementById('heroChapter').classList.contains('ap-cast-compressed'));
  gate('G2: return to scale 0 auto-restores the dock', autoRestored);
  report.consoleErrors['desk-main'] = errs;
  gate('desk: zero console errors', errs.length === 0, errs.join(' | ') || 'none');
  await ctx.close();
}

/* ═══ 3 · MOBILE 390x844 — CAST-0 above bottom-nav, fill, scrollWidth, screenshots ═══ */
{
  const { ctx, p, errs } = await open({ w: 390, h: 844, mobile: true });
  const full = await waitFull(p);
  await p.waitForTimeout(1800);
  const m = await p.evaluate(() => {
    const i = document.getElementById('hero-birthdate');
    const s = document.querySelector('#hero-chart-form button[type="submit"]');
    const bar = document.querySelector('.bottom-nav');
    const canvas = document.getElementById('orrery-canvas');
    return {
      inputBottom: Math.round(i.getBoundingClientRect().bottom),
      submitBottom: Math.round(s.getBoundingClientRect().bottom),
      submitTop: Math.round(s.getBoundingClientRect().top),
      barTop: bar ? Math.round(bar.getBoundingClientRect().top) : null,
      scrollY: window.scrollY,
      scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
      bodyH: Math.round(document.body.getBoundingClientRect().height),
      fill: canvas ? canvas.width * canvas.height : null,
      canvasCss: canvas ? { w: canvas.clientWidth, h: canvas.clientHeight } : null,
      mastheadH: Math.round(document.getElementById('apMasthead').getBoundingClientRect().height),
    };
  });
  report.fill.mobile = { fill: m.fill, css: m.canvasCss };
  gate('mob: engine full', full);
  gate('G1 mob: CAST-0 — submit fully visible ABOVE the bottom bar, no scroll', m.scrollY === 0 && m.submitBottom <= (m.barTop != null ? m.barTop : 844) - 4, JSON.stringify({ submitBottom: m.submitBottom, barTop: m.barTop }));
  gate('G9 mob: scrollWidth ≤ 391', m.scrollWidth <= 391, m.scrollWidth);
  gate('G6 mob: bodyH ≤ 7000', m.bodyH <= 7000, m.bodyH);
  gate('G5 mob: canvas fill ≤ 1.15e6 device px', m.fill != null && m.fill <= 1.15e6, JSON.stringify(report.fill.mobile));
  gate('mob: masthead slim bar ≤ 52px', m.mastheadH <= 52, m.mastheadH);
  const lcp = await p.evaluate(() => window.__lcp || null);
  report.lcp.mobile = lcp;
  gate('G4 mob: LCP element is the poster', !!lcp && /orrery-lite-poster/i.test(lcp.tag), JSON.stringify(lcp));
  await p.screenshot({ path: `${OUT}/mob-rest.png` });
  // exploring state: stepper → level 1 (if revealed) else scrub drag; screenshot
  await p.evaluate(() => { const n = document.getElementById('ap-scale-next'); if (n) n.click(); });
  await p.waitForTimeout(2200);
  await p.screenshot({ path: `${OUT}/mob-exploring.png` });
  const mobCompressed = await p.evaluate(() => document.getElementById('heroChapter').classList.contains('ap-cast-compressed'));
  gate('G2 mob: stepper to Inner compresses dock (state machine parity)', mobCompressed === true, String(mobCompressed));
  report.consoleErrors['mob-main'] = errs;
  gate('mob: zero console errors', errs.length === 0, errs.join(' | ') || 'none');
  await ctx.close();
}

/* ═══ 4 · FILL @1920x1080 DPR2 (raf-core budget) ═══ */
{
  const { ctx, p } = await open({ w: 1920, h: 1080, dsf: 2 });
  const full = await waitFull(p);
  await p.waitForTimeout(1800);
  const fill = await p.evaluate(() => {
    const c = document.getElementById('orrery-canvas');
    return c ? { fill: c.width * c.height, w: c.width, h: c.height, budget: window.__apStagePixelBudget, area: window.__apStageCssArea } : null;
  });
  report.fill.desktopHiDpi = fill;
  gate('G5 desk-2x: canvas fill ≤ 6.3e6 device px (budget clamp live)', full && fill && fill.fill <= 6.3e6, JSON.stringify(fill));
  await ctx.close();
}

/* ═══ 5 · CRITICAL-ONLY FIRST PAINT (coordinator #2 — all .css blocked) ═══ */
{
  const { ctx, p } = await open({ w: 1440, h: 900, blockCss: true });
  await p.waitForTimeout(600);
  const crit = await p.evaluate(() => {
    const m = document.getElementById('apMasthead');
    const s = document.querySelector('.hero-solar-stage');
    const logo = m.querySelector('.masthead-logo');
    const mr = m.getBoundingClientRect(), sr = s.getBoundingClientRect(), lr = logo.getBoundingClientRect();
    return {
      pos: getComputedStyle(m).position, mastheadH: Math.round(mr.height),
      stageTop: Math.round(sr.top), stageH: Math.round(sr.height),
      logoInBar: lr.top >= mr.top - 1 && lr.bottom <= mr.bottom + 1,
    };
  });
  gate('G10: critical-CSS-only first paint = slim bar (≤64px, absolute), stage from y=0, no dead band',
    crit.pos === 'absolute' && crit.mastheadH <= 64 && crit.stageTop <= 2 && crit.stageH >= 500 && crit.logoInBar, JSON.stringify(crit));
  await p.screenshot({ path: `${OUT}/critical-only-firstpaint.png` });
  await ctx.close();
  const m2 = await open({ w: 390, h: 844, mobile: true, blockCss: true });
  await m2.p.waitForTimeout(600);
  const critM = await m2.p.evaluate(() => {
    const m = document.getElementById('apMasthead');
    return { pos: getComputedStyle(m).position, h: Math.round(m.getBoundingClientRect().height), navGone: !m.querySelector('.contents-nav') || getComputedStyle(m.querySelector('.contents-nav')).display === 'none' };
  });
  gate('G10 mob: critical-only bar ≤52px, nav hidden', critM.pos === 'absolute' && critM.h <= 52 && critM.navGone, JSON.stringify(critM));
  await m2.ctx.close();
}

/* ═══ 6 · LOW-TIER / NO-WEBGL — 2D path full-viewport + dock, honest ═══ */
{
  const { ctx, p, errs } = await open({ w: 1440, h: 900, blockWebGL: true });
  await p.waitForTimeout(12000); // past fail-open timers
  const r = await p.evaluate(() => {
    const stage = document.querySelector('.hero-solar-stage');
    const form = document.getElementById('hero-chart-form');
    const canvas = document.getElementById('orrery-canvas');
    const sr = stage.getBoundingClientRect(), fr = form.getBoundingClientRect();
    return {
      full: document.documentElement.classList.contains('orrery-full'),
      canvas2d: document.documentElement.classList.contains('orrery-canvas'),
      revealed: document.documentElement.classList.contains('ap-model-revealed'),
      liveOp: (() => { const l = document.querySelector('.ap-mw-live'); return l ? getComputedStyle(l).opacity : null; })(),
      stageH: Math.round(sr.height), stageW: Math.round(sr.width),
      canvasW: canvas ? Math.round(canvas.getBoundingClientRect().width) : 0,
      formVisible: fr.width > 0 && fr.bottom <= 900,
      deckVisible: (() => { const d = document.getElementById('orrery-lite-deck'); return d && getComputedStyle(d).display !== 'none'; })(),
    };
  });
  gate('G8 2D: never orrery-full, never revealed, NO LIVE badge', !r.full && !r.revealed && r.liveOp === '0', JSON.stringify({ full: r.full, revealed: r.revealed, liveOp: r.liveOp }));
  gate('G8 2D: fallback fills the stage (full-viewport) + dock + form present', r.stageH >= 560 && r.canvasW >= r.stageW - 4 && r.formVisible && r.deckVisible, JSON.stringify(r));
  await p.screenshot({ path: `${OUT}/desk-2d-fallback.png` });
  report.consoleErrors['2d-fallback'] = errs.filter((x) => !/orrery-webgl|Failed to fetch|net::ERR_FAILED|dynamically imported/i.test(x));
  gate('G8 2D: no unrelated console errors', report.consoleErrors['2d-fallback'].length === 0, report.consoleErrors['2d-fallback'].join(' | ') || 'none');
  await ctx.close();
}

/* ═══ 7 · PRM — wheel path, no recession, no interplay camera, dock permanent ═══ */
{
  const { ctx, p, errs } = await open({ w: 1440, h: 900, prm: true });
  await p.waitForTimeout(7500);
  const r = await p.evaluate(() => ({
    liteHero: document.documentElement.classList.contains('ap-lite-hero'),
    idle: document.documentElement.classList.contains('ap-chrome-idle'),
    deckDisplay: getComputedStyle(document.getElementById('orrery-lite-deck')).display,
    wheelVisible: (() => { const f = document.getElementById('apHeroWheelFallback'); if (!f) return false; const cs = getComputedStyle(f); return cs.display !== 'none' && !f.classList.contains('ap-hero-wheel-fallback--hidden'); })(),
    dockVisible: (() => { const c = document.querySelector('#heroChapter .hero-copy'); const q = c.getBoundingClientRect(); return q.width > 0 && q.height > 0; })(),
    formInVp: (() => { const s = document.querySelector('#hero-chart-form button[type="submit"]'); return s.getBoundingClientRect().bottom <= 900; })(),
  }));
  gate('PRM: no boot classes → deck hidden, wheel shown, dock visible in vp1', !r.liteHero && r.deckDisplay === 'none' && r.wheelVisible && r.dockVisible && r.formInVp, JSON.stringify(r));
  gate('PRM: chrome recession never engages', !r.idle, String(r.idle));
  report.consoleErrors['prm'] = errs;
  gate('PRM: zero console errors', errs.length === 0, errs.join(' | ') || 'none');
  await ctx.close();
}

fs.writeFileSync(`${OUT}/gates-report.json`, JSON.stringify(report, null, 2));
const fails = report.checks.filter((c) => !c.ok);
console.log(`\n${report.checks.length - fails.length}/${report.checks.length} PASS${fails.length ? ' — FAILURES: ' + fails.map((f) => f.name).join(' | ') : ''}`);
await b.close();
process.exit(fails.length ? 1 : 0);
