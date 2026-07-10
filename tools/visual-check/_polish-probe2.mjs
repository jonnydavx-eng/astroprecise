/* Focused probe: footer styling reality + home bottom-nav anomaly. */
import { chromium } from 'playwright';
import fs from 'fs';
const OUT = 'out/polish-2026-07-10';
const DESK_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const MOB_UA = 'Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader-webgl', '--disable-blink-features=AutomationControlled'] });

async function probe(path, mobile, extra) {
  const ctx = await b.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1,
    userAgent: mobile ? MOB_UA : DESK_UA, serviceWorkers: 'block',
  });
  const p = await ctx.newPage();
  await p.addInitScript(() => { try { localStorage.setItem('ap_intro_complete', '1'); } catch (e) {} });
  await p.goto('http://127.0.0.1:8790/' + (path === '/' ? '' : path), { waitUntil: 'load', timeout: 60000 });
  await p.waitForTimeout(path === '/' ? 5500 : 2500);
  try { await p.mouse.move(200, 400); await p.mouse.down(); await p.mouse.up(); } catch (e) {}
  await p.waitForTimeout(1500);

  const m = await p.evaluate(() => {
    const out = {};
    const foot = document.querySelector('footer, .footer, .site-footer');
    if (foot) {
      const a = foot.querySelector('a');
      const cs = a ? getComputedStyle(a) : null;
      const cols = foot.querySelector('.footer-nav, .footer-nav-cols, [class*="footer-nav"]');
      out.footer = {
        cls: foot.className, linkColor: cs ? cs.color : null,
        linkDecoration: cs ? cs.textDecorationLine : null,
        colsCls: cols ? cols.className : null,
        colsDisplay: cols ? getComputedStyle(cols).display : null,
        ulStyle: (() => { const u = foot.querySelector('ul'); return u ? getComputedStyle(u).listStyleType + '/' + getComputedStyle(u).paddingLeft : null; })(),
        stylesheets: [...document.styleSheets].map(s => (s.href || 'inline').split('/').pop()).slice(0, 40),
      };
      const fr = foot.getBoundingClientRect();
      out.footerTopAbs = Math.round(fr.top + scrollY);
    }
    const bn = document.querySelector('.bottom-nav');
    if (bn) {
      const cs = getComputedStyle(bn);
      const r2 = bn.getBoundingClientRect();
      out.bottomNav = {
        pos: cs.position, display: cs.display, bottom: cs.bottom, zIndex: cs.zIndex,
        rect: { top: Math.round(r2.top), h: Math.round(r2.height), w: Math.round(r2.width) },
        parent: bn.parentElement.tagName + '.' + String(bn.parentElement.className).split(' ')[0],
        html: bn.outerHTML.slice(0, 500),
      };
    }
    const cn = document.querySelector('.contents-nav');
    if (cn) {
      const cs = getComputedStyle(cn);
      const r3 = cn.getBoundingClientRect();
      out.contentsNav = { pos: cs.position, display: cs.display, rect: { top: Math.round(r3.top + scrollY), h: Math.round(r3.height) }, cls: cn.className, text: (cn.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 120) };
    }
    return out;
  });

  if (extra === 'footerShot') {
    await p.evaluate(() => { const f = document.querySelector('footer, .site-footer'); if (f) f.scrollIntoView(); });
    await p.waitForTimeout(1400);
    await p.screenshot({ path: `${OUT}/probe-footer-${mobile ? 'm' : 'd'}-${path === '/' ? 'home' : path.replace('.html', '')}.png` });
  }
  if (extra === 'bottomShot') {
    await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await p.waitForTimeout(1400);
    await p.screenshot({ path: `${OUT}/probe-bottom-${mobile ? 'm' : 'd'}-${path === '/' ? 'home' : path.replace('.html', '')}.png` });
  }
  await ctx.close();
  return m;
}

const res = {};
res['chart-d'] = await probe('chart.html', false, 'footerShot');
res['transits-d'] = await probe('transits.html', false, 'footerShot');
res['horoscope-d'] = await probe('horoscope.html', false, 'footerShot');
res['home-m'] = await probe('/', true, 'bottomShot');
res['home-d'] = await probe('/', false, 'bottomShot');
res['aries-m'] = await probe('aries.html', true, 'footerShot');
fs.writeFileSync(`${OUT}/probe2.json`, JSON.stringify(res, null, 2));
console.log(JSON.stringify(res, null, 1).slice(0, 6000));
await b.close();
