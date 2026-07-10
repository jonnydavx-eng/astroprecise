/* Footer landing-vs-engaged states on transits desktop + home mobile (real-user shim). */
import { chromium } from 'playwright';
const OUT = 'out/polish-2026-07-10';
const DESK_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader-webgl', '--disable-blink-features=AutomationControlled'] });

const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, userAgent: DESK_UA, serviceWorkers: 'block' });
const p = await ctx.newPage();
await p.addInitScript(() => {
  try { localStorage.setItem('ap_intro_complete', '1'); } catch (e) {}
  if (typeof window.chrome === 'undefined') window.chrome = { runtime: {} };
});
await p.goto('http://127.0.0.1:8790/transits.html', { waitUntil: 'load', timeout: 60000 });
await p.waitForTimeout(2500);

const state = async () => p.evaluate(() => {
  const foot = document.querySelector('footer');
  const wrap = foot ? foot.querySelector('.footer-nav, .footer-links, .footer-grid, [class*="footer"] > div') : null;
  const col = foot ? foot.querySelector('.footer-nav-col') : null;
  return {
    mainCss: !!document.getElementById('ap-css-main'),
    wrapCls: wrap ? wrap.className : null,
    wrapDisplay: wrap ? getComputedStyle(wrap).display : null,
    colDisplay: col ? getComputedStyle(col).display : null,
    footerH: foot ? Math.round(foot.getBoundingClientRect().height) : null,
    bodyH: document.body.scrollHeight,
  };
});

const before = await state();
// wheel-scroll to footer WITHOUT any pointerdown (desktop reader behavior)
await p.evaluate(() => { document.querySelector('footer').scrollIntoView(); });
await p.waitForTimeout(1200);
await p.screenshot({ path: `${OUT}/footer-transits-LANDING-noclick.png` });
// now click (pointerdown) → main.css should arrive
await p.mouse.move(700, 300); await p.mouse.down(); await p.mouse.up();
await p.waitForTimeout(2000);
const after = await state();
await p.evaluate(() => { document.querySelector('footer').scrollIntoView(); });
await p.waitForTimeout(800);
await p.screenshot({ path: `${OUT}/footer-transits-ENGAGED-maincss.png` });
console.log('before:', JSON.stringify(before));
console.log('after :', JSON.stringify(after));
await ctx.close();
await b.close();
