import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader-webgl', '--disable-blink-features=AutomationControlled'] });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
const p = await ctx.newPage();
await p.addInitScript(() => { try { localStorage.setItem('ap_intro_complete', '1'); } catch (e) {} if (typeof window.chrome === 'undefined') window.chrome = { runtime: {} }; });
await p.goto('http://127.0.0.1:8790/index-next.html', { waitUntil: 'load', timeout: 60000 });
await p.waitForFunction(() => document.documentElement.classList.contains('orrery-full'), null, { timeout: 30000 }).catch(() => {});
await p.waitForTimeout(1800);
const out = await p.evaluate(() => {
  const info = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      sel, display: cs.display, position: cs.position, gridRow: cs.gridRowStart + '/' + cs.gridRowEnd,
      gridCol: cs.gridColumnStart + '/' + cs.gridColumnEnd, flexWrap: cs.flexWrap, flex: cs.flex,
      width: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), left: Math.round(r.left),
      hidden: el.hidden,
    };
  };
  const deck = document.getElementById('orrery-lite-deck');
  const dcs = getComputedStyle(deck);
  return {
    deck: { display: dcs.display, cols: dcs.gridTemplateColumns, rows: dcs.gridTemplateRows, rect: deck.getBoundingClientRect().toJSON() },
    strip: info('.ap-scale-strip'),
    track: info('.ap-scale-strip__track'),
    caption: info('.ap-scale-strip__caption'),
    orbits: info('#ap-orbits-toggle'),
    pills: info('.lite-vp-controls'),
    time: info('.ap-orrery-time'),
    scrub: info('#lite-scrub'),
    journey: info('#ap-cosmic-journey'),
    flight: info('#ap-cosmic-flight-launch'),
    sheetLast: (() => { const links = [...document.querySelectorAll('link[rel="stylesheet"]')]; return links.slice(-3).map((l) => l.href.split('/').pop()); })(),
  };
});
console.log(JSON.stringify(out, null, 1));
await b.close();
