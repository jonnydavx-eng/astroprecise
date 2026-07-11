import { chromium } from 'playwright';
import fs from 'fs';
const OUT = 'out/observatory-2026-07-10';
const MOB_UA = 'Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader-webgl', '--disable-blink-features=AutomationControlled'] });
for (const vp of [{ w: 640, h: 900, mobile: true }, { w: 1024, h: 768, mobile: false }]) {
  const ctx = await b.newContext({
    viewport: { width: vp.w, height: vp.h }, isMobile: vp.mobile, hasTouch: vp.mobile,
    deviceScaleFactor: vp.mobile ? 2 : 1, userAgent: vp.mobile ? MOB_UA : undefined, serviceWorkers: 'block',
  });
  const p = await ctx.newPage();
  await p.addInitScript(() => { try { localStorage.setItem('ap_intro_complete', '1'); } catch (e) {} if (typeof window.chrome === 'undefined') window.chrome = { runtime: {} }; });
  await p.goto('http://127.0.0.1:8790/index-next.html', { waitUntil: 'load', timeout: 60000 });
  await p.waitForFunction(() => document.documentElement.classList.contains('orrery-full'), null, { timeout: 30000 }).catch(() => {});
  await p.waitForTimeout(1800);
  const state = await p.evaluate(() => ({
    scale: window.Orrery3D && window.Orrery3D.getScaleLevel ? window.Orrery3D.getScaleLevel() : null,
    intro: window.Orrery3D && window.Orrery3D.isIntroActive ? window.Orrery3D.isIntroActive() : null,
  }));
  console.log(`${vp.w}x${vp.h}: scale=${state.scale} intro=${state.intro}`);
  const stage = await p.evaluate(() => {
    ['.masthead', '.explore-legend', '#apModelWindow', '#heroChapter .hero-copy'].forEach((sel) =>
      document.querySelectorAll(sel).forEach((el) => { el.style.opacity = '0'; }));
    const r = document.querySelector('.hero-solar-stage').getBoundingClientRect();
    return { x: Math.max(0, r.left), y: Math.max(0, r.top), width: r.width, height: r.height };
  });
  await p.waitForTimeout(150);
  await p.screenshot({ path: `${OUT}/debug-stage-${vp.w}.png`, clip: stage, scale: 'css' });
  await ctx.close();
}
await b.close();
