/* Wave-A regression sweep — one styled bottom bar everywhere, no overflow. */
import { chromium } from 'playwright';

const MOB_UA = 'Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';
const b = await chromium.launch({ args: ['--disable-blink-features=AutomationControlled'] });

for (const path of ['chart.html', 'horoscope.html', 'shop.html', 'moment.html', 'privacy.html', 'terms.html', '404.html', 'transits.html']) {
  const ctx = await b.newContext({
    viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2,
    userAgent: MOB_UA, serviceWorkers: 'block',
  });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e).slice(0, 120)));
  await p.addInitScript(() => {
    try { localStorage.setItem('ap_intro_complete', '1'); } catch (e) {}
    if (typeof window.chrome === 'undefined') window.chrome = { runtime: {} };
  });
  await p.goto('http://127.0.0.1:8790/' + path, { waitUntil: 'load', timeout: 60000 });
  await p.waitForTimeout(2500);
  await p.mouse.move(200, 400); await p.mouse.down(); await p.mouse.up();
  await p.waitForTimeout(1500);
  const r = await p.evaluate(() => {
    const bars = [...document.querySelectorAll('.bottom-nav')];
    const info = bars.map(bn => {
      const cs = getComputedStyle(bn);
      const rect = bn.getBoundingClientRect();
      return { pos: cs.position, display: cs.display, bottom: Math.round(rect.bottom), h: Math.round(rect.height) };
    });
    return {
      bars: bars.length, info,
      scrollW: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
      oneFixedBar: bars.filter(bn => getComputedStyle(bn).position === 'fixed' && getComputedStyle(bn).display !== 'none').length,
    };
  });
  const ok = r.bars <= 1 && r.scrollW <= 391 && (r.bars === 0 || (r.oneFixedBar === 1 && Math.abs(r.info[0].bottom - 844) < 4));
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${path} — ${JSON.stringify(r)}${errs.length ? ' ERRS: ' + errs.join('|') : ''}`);
  await ctx.close();
}
await b.close();
