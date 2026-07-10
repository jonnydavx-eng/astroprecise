import { chromium } from 'playwright';
const MOB_UA = 'Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader-webgl', '--disable-blink-features=AutomationControlled'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, userAgent: MOB_UA, serviceWorkers: 'block' });
const p = await ctx.newPage();
await p.addInitScript(() => { try { localStorage.setItem('ap_intro_complete', '1'); } catch (e) {} if (typeof window.chrome === 'undefined') window.chrome = { runtime: {} }; });
await p.goto('http://127.0.0.1:8790/index-next.html', { waitUntil: 'load', timeout: 60000 });
await p.waitForTimeout(6000);
const out = await p.evaluate(() => {
  const res = [];
  for (const [x, y] of [[175, 832], [195, 838], [330, 838], [90, 838], [260, 838]]) {
    const els = document.elementsFromPoint(x, y).slice(0, 4).map((e) => e.tagName + (e.id ? '#' + e.id : '.' + String(e.className).slice(0, 40)));
    res.push({ x, y, els });
  }
  // any round-ish fixed/absolute element intersecting the bar band
  const bar = document.querySelector('.bottom-nav');
  const br = bar.getBoundingClientRect();
  const weird = [];
  document.querySelectorAll('body *').forEach((el) => {
    if (bar.contains(el) || el === bar) return;
    const cs = getComputedStyle(el);
    if (cs.position !== 'fixed' && cs.position !== 'absolute') return;
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return;
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return;
    if (r.bottom > br.top && r.top < 844) weird.push({ el: el.tagName + (el.id ? '#' + el.id : '.' + String(el.className).slice(0, 44)), rect: { t: Math.round(r.top), b: Math.round(r.bottom), l: Math.round(r.left), rgt: Math.round(r.right) }, z: cs.zIndex, pos: cs.position, radius: cs.borderRadius });
  });
  return { res, weird: weird.slice(0, 15), barTop: Math.round(br.top) };
});
console.log(JSON.stringify(out, null, 1));
await b.close();
