import { chromium } from 'playwright';
const MOB_UA = 'Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader-webgl', '--disable-blink-features=AutomationControlled'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, userAgent: MOB_UA, serviceWorkers: 'block' });
const p = await ctx.newPage();
await p.addInitScript(() => { try { localStorage.setItem('ap_intro_complete', '1'); } catch (e) {} if (typeof window.chrome === 'undefined') window.chrome = { runtime: {} }; });
await p.goto('http://127.0.0.1:8790/index-next.html', { waitUntil: 'load', timeout: 60000 });
await p.waitForFunction(() => document.documentElement.classList.contains('orrery-full'), null, { timeout: 30000 }).catch(() => {});
await p.waitForTimeout(1800);
const m = await p.evaluate(() => {
  const wide = [];
  document.querySelectorAll('body *').forEach((el) => {
    const q = el.getBoundingClientRect();
    if (q.right > 391 && q.width > 0 && getComputedStyle(el).display !== 'none') {
      let path = el.tagName + (el.id ? '#' + el.id : '.' + String(el.className).slice(0, 44));
      wide.push({ el: path, right: Math.round(q.right), left: Math.round(q.left), w: Math.round(q.width) });
    }
  });
  return {
    scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
    innerWidth: window.innerWidth,
    wide: wide.slice(0, 24),
  };
});
console.log(JSON.stringify(m, null, 1));
await b.close();
