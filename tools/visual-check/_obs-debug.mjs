/* Observatory debug probe: disc pixels, LCP entries, scrollWidth offenders,
   bottom-nav geometry, stage-top offset. */
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import fs from 'fs';

const OUT = 'out/observatory-2026-07-10';
const BASE = 'http://127.0.0.1:8790';
const PAGE = 'index-next.html';
const MOB_UA = 'Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader-webgl', '--disable-blink-features=AutomationControlled'] });

async function open(w, h, mobile) {
  const ctx = await b.newContext({
    viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile,
    deviceScaleFactor: mobile ? 2 : 1, userAgent: mobile ? MOB_UA : undefined, serviceWorkers: 'block',
  });
  const p = await ctx.newPage();
  await p.addInitScript(() => {
    try { localStorage.setItem('ap_intro_complete', '1'); } catch (e) {}
    if (typeof window.chrome === 'undefined') window.chrome = { runtime: {} };
    window.__lcpAll = [];
    try {
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) window.__lcpAll.push({ tag: e.element ? e.element.tagName + (e.element.id ? '#' + e.element.id : '.' + String(e.element.className).slice(0, 40)) : String(e.url || ''), size: e.size, ms: Math.round(e.startTime) });
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (e) {}
  });
  await p.goto(BASE + '/' + PAGE, { waitUntil: 'load', timeout: 60000 });
  return { ctx, p };
}

/* desktop: stage screenshot with overlays hidden + luma histogram + stage top cause */
{
  const { ctx, p } = await open(1440, 900, false);
  await p.waitForFunction(() => document.documentElement.classList.contains('orrery-full'), null, { timeout: 30000 }).catch(() => {});
  await p.waitForTimeout(1800);
  const info = await p.evaluate(() => {
    const s = document.querySelector('.hero-solar-stage');
    const r = s.getBoundingClientRect();
    ['.masthead', '.explore-legend', '#apModelWindow', '#heroChapter .hero-copy'].forEach((sel) =>
      document.querySelectorAll(sel).forEach((el) => { el.style.opacity = '0'; }));
    const hero = document.getElementById('heroChapter').getBoundingClientRect();
    const main = document.getElementById('main-content').getBoundingClientRect();
    const skips = [...document.querySelectorAll('.skip-link')].map((a) => { const q = a.getBoundingClientRect(); return { t: Math.round(q.top), h: Math.round(q.height), pos: getComputedStyle(a).position }; });
    return { stage: { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }, heroTop: Math.round(hero.top), mainTop: Math.round(main.top), skips };
  });
  console.log('DESK stage/top:', JSON.stringify(info));
  await p.waitForTimeout(150);
  const buf = await p.screenshot({ clip: { x: info.stage.x, y: Math.max(0, info.stage.y), width: info.stage.w, height: info.stage.h }, scale: 'css' });
  fs.writeFileSync(`${OUT}/debug-stage-desk.png`, buf);
  const png = PNG.sync.read(buf);
  const W = png.width, H = png.height;
  // radial profile from canvas center: bright fraction per 20px ring at two thresholds
  const cx = W / 2, cy = H / 2;
  const rings = [];
  for (let r0 = 0; r0 < Math.min(W, H) / 2 + 100; r0 += 20) {
    let n = 0, b40 = 0, b80 = 0, b140 = 0;
    for (let a = 0; a < 360; a += 2) {
      const x = Math.round(cx + (r0 + 10) * Math.cos(a * Math.PI / 180));
      const y = Math.round(cy + (r0 + 10) * Math.sin(a * Math.PI / 180));
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const i = (y * W + x) * 4;
      const luma = 0.2126 * png.data[i] + 0.7152 * png.data[i + 1] + 0.0722 * png.data[i + 2];
      n++;
      if (luma > 40) b40++;
      if (luma > 80) b80++;
      if (luma > 140) b140++;
    }
    rings.push({ r: r0 + 10, f40: +(b40 / n).toFixed(2), f80: +(b80 / n).toFixed(2), f140: +(b140 / n).toFixed(2) });
  }
  console.log('DESK rings:', JSON.stringify(rings));
  await ctx.close();
}

/* mobile: LCP entries + scrollWidth offenders + bottom-nav */
{
  const { ctx, p } = await open(390, 844, true);
  await p.waitForFunction(() => document.documentElement.classList.contains('orrery-full'), null, { timeout: 30000 }).catch(() => {});
  await p.waitForTimeout(1800);
  const m = await p.evaluate(() => {
    const wide = [];
    document.querySelectorAll('body *').forEach((el) => {
      const q = el.getBoundingClientRect();
      if (q.right > 391 && q.width > 0) wide.push({ el: el.tagName + (el.id ? '#' + el.id : '.' + String(el.className).slice(0, 40)), right: Math.round(q.right), left: Math.round(q.left) });
    });
    const bar = document.querySelector('.bottom-nav');
    const bcs = bar ? getComputedStyle(bar) : null;
    const br = bar ? bar.getBoundingClientRect() : null;
    const stage = document.querySelector('.hero-solar-stage').getBoundingClientRect();
    const copy = document.querySelector('#heroChapter .hero-copy').getBoundingClientRect();
    const deck = document.getElementById('orrery-lite-deck').getBoundingClientRect();
    return {
      lcpAll: window.__lcpAll,
      scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
      wide: wide.slice(0, 20),
      bar: bar ? { pos: bcs.position, disp: bcs.display, top: Math.round(br.top), h: Math.round(br.height), parent: bar.parentElement.tagName } : null,
      vars: {
        trayHm: getComputedStyle(document.documentElement).getPropertyValue('--ap-tray-h-m'),
        bottomNavH: getComputedStyle(document.documentElement).getPropertyValue('--bottom-nav-h'),
      },
      stage: { top: Math.round(stage.top), h: Math.round(stage.height) },
      copy: { top: Math.round(copy.top), h: Math.round(copy.height) },
      deck: { top: Math.round(deck.top), h: Math.round(deck.height), bottom: Math.round(deck.bottom) },
      obsBooted: !!document.body.classList.contains('ap-observatory-home'),
    };
  });
  console.log('MOB:', JSON.stringify(m, null, 1));
  const info = m.stage;
  const buf = await p.screenshot({ clip: { x: 0, y: Math.max(0, info.top), width: 390, height: info.h }, scale: 'css' });
  fs.writeFileSync(`${OUT}/debug-stage-mob.png`, buf);
  await ctx.close();
}

await b.close();
