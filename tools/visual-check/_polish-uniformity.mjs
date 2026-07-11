/* Polish 2026-07-10 — sitewide uniformity sweep (read-only measurement).
   Real-user mode: AutomationControlled disabled + clean UA so auditPath=false.
   Outputs: out/polish-2026-07-10/uniformity.json + viewport screenshots. */
import { chromium } from 'playwright';
import fs from 'fs';

const OUT = 'out/polish-2026-07-10';
fs.mkdirSync(OUT, { recursive: true });

const DESK_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const MOB_UA = 'Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';

const PAGES = [
  '/', 'chart.html', 'horoscope.html', 'explore.html', 'moment.html',
  'transits.html', 'shop.html', 'ephemeris.html', 'compatibility.html',
  'this-weeks-sky.html', 'aries.html', 'profile.html',
];

const b = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader-webgl', '--disable-blink-features=AutomationControlled'],
});

function slug(p) { return p === '/' ? 'home' : p.replace('.html', ''); }

async function measure(path, mobile) {
  const ctx = await b.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1,
    userAgent: mobile ? MOB_UA : DESK_UA,
    serviceWorkers: 'block',
  });
  const p = await ctx.newPage();
  await p.addInitScript(() => {
    try { localStorage.setItem('ap_intro_complete', '1'); } catch (e) {}
    // defeat the 4th audit heuristic (typeof window.chrome === 'undefined')
    if (typeof window.chrome === 'undefined') window.chrome = { runtime: {} };
  });
  await p.goto('http://127.0.0.1:8790' + (path === '/' ? '/' : '/' + path), { waitUntil: 'load', timeout: 60000 });
  await p.waitForTimeout(path === '/' ? 5500 : 2500);
  // real-user engagement: pointerdown pulls deferred CSS (defer-page-css.js)
  try { await p.mouse.move(200, 400); await p.mouse.down(); await p.mouse.up(); } catch (e) {}
  await p.waitForTimeout(1200);

  const m = await p.evaluate(() => {
    const vw = innerWidth, vh = innerHeight;
    const vis = (el) => {
      if (!el) return false;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false;
      const r = el.getBoundingClientRect();
      return r.width > 1 && r.height > 1;
    };
    const pick = (sels) => { for (const s of sels) { const el = document.querySelector(s); if (el && vis(el)) return { el, sel: s }; } return null; };

    // ── masthead / nav signature ──
    const mh = pick(['.navbar', '#apMasthead', '.masthead', '.site-header', 'body > header', 'header']);
    let navLinks = null, drawerLinks = null, mastheadRect = null, mastheadPos = null;
    if (mh) {
      const r = mh.el.getBoundingClientRect();
      mastheadRect = { h: Math.round(r.height), top: Math.round(r.top) };
      mastheadPos = getComputedStyle(mh.el).position;
      const nav = document.querySelector('.navbar__nav') || mh.el.querySelector('nav') || document.querySelector('header nav');
      if (nav) navLinks = [...nav.querySelectorAll('a, button')].filter(vis).map(a => ((a.textContent || '').trim().replace(/\s+/g, ' ') + '|' + (a.getAttribute('href') || 'btn')));
      const dr = document.querySelector('.navbar__mobile-menu');
      if (dr) drawerLinks = [...dr.querySelectorAll('a')].map(a => ((a.textContent || '').trim().replace(/\s+/g, ' ') + '|' + (a.getAttribute('href') || '')));
    }

    // ── footer ──
    const foot = document.querySelector('footer, .footer, .site-footer');
    let footer = null;
    if (foot) {
      footer = {
        visible: vis(foot),
        aroundTheModel: /Around the model/i.test(foot.textContent || ''),
        colTitles: [...foot.querySelectorAll('h2, h3, .footer-nav-col__title')].map(h => (h.textContent || '').trim()).slice(0, 12),
        linkCount: foot.querySelectorAll('a').length,
      };
    }

    // ── bottom nav ──
    const bn = document.querySelector('.bottom-nav');
    let bottomNav = null;
    if (bn) {
      const cs = getComputedStyle(bn);
      const r = bn.getBoundingClientRect();
      bottomNav = {
        display: cs.display, visible: vis(bn), h: Math.round(r.height),
        items: [...bn.querySelectorAll('.bottom-nav__item')].map(i => {
          const ir = i.getBoundingClientRect();
          return { label: (i.textContent || '').trim(), w: Math.round(ir.width), h: Math.round(ir.height) };
        }),
      };
    }

    // ── legacy chrome ──
    const legacy = {};
    for (const s of ['.float-nav', '.contents-nav', '.page-contents', '.ap-float-nav', '.tools-fab', '.ap-tools-fab', '[data-tools-fab]']) {
      const el = document.querySelector(s);
      if (el) legacy[s] = vis(el);
    }

    // ── fixed/sticky chrome coverage (mobile stacking) ──
    let topChrome = 0, botChrome = 0;
    const fixedEls = [];
    for (const el of document.querySelectorAll('body *')) {
      const cs = getComputedStyle(el);
      if (cs.position !== 'fixed' && cs.position !== 'sticky') continue;
      if (!vis(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.width < vw * 0.5 || r.height < 8) continue;
      fixedEls.push({ sel: el.className ? '.' + String(el.className).split(' ')[0] : el.tagName, top: Math.round(r.top), h: Math.round(r.height) });
      if (r.top < 120) topChrome = Math.max(topChrome, r.bottom);
      if (r.bottom > vh - 160 && r.top > vh * 0.5) botChrome = Math.max(botChrome, vh - r.top);
    }

    // ── typography ──
    const h1 = [...document.querySelectorAll('h1')].find(vis);
    let h1s = null;
    if (h1) {
      const cs = getComputedStyle(h1);
      h1s = { text: (h1.textContent || '').trim().slice(0, 60), size: cs.fontSize, family: cs.fontFamily.split(',')[0].replace(/"/g, ''), weight: cs.fontWeight, ls: cs.letterSpacing, tt: cs.textTransform, color: cs.color };
    }
    const h2 = [...document.querySelectorAll('h2')].find(vis);
    let h2s = null;
    if (h2) { const cs = getComputedStyle(h2); h2s = { size: cs.fontSize, family: cs.fontFamily.split(',')[0].replace(/"/g, ''), ls: cs.letterSpacing, tt: cs.textTransform }; }
    const para = [...document.querySelectorAll('main p, section p, .chapter p')].find(el => vis(el) && (el.textContent || '').trim().length > 40);
    let paraS = null;
    if (para) { const cs = getComputedStyle(para); paraS = { color: cs.color, size: cs.fontSize, lh: cs.lineHeight }; }
    const bodyCs = getComputedStyle(document.body);

    // ── sections / rhythm / containers ──
    const secEls = [...document.querySelectorAll('main > section, body > section, main > .chapter')].filter(vis);
    const rects = secEls.map(s => ({ id: s.id || s.className.split(' ')[0], r: s.getBoundingClientRect() }))
      .sort((a, b2) => a.r.top - b2.r.top);
    const gaps = [];
    for (let i = 1; i < rects.length; i++) gaps.push(Math.round(rects[i].r.top - rects[i - 1].r.bottom));
    const widths = new Set();
    for (const s of secEls) {
      const c = s.firstElementChild;
      if (c && vis(c)) widths.add(Math.round(c.getBoundingClientRect().width / 10) * 10);
    }
    for (const sel of ['.container', '.wrap', '.section-inner', '.shell']) {
      for (const el of document.querySelectorAll(sel)) if (vis(el)) widths.add(Math.round(el.getBoundingClientRect().width / 10) * 10);
    }

    // ── primary CTA in first viewport ──
    const cta = document.querySelector('.hero-form button[type="submit"], .hero-form button, #calculate-btn, #mom-freeze, .shop-hero .btn--primary');
    let ctaS = null;
    if (cta) { const r = cta.getBoundingClientRect(); ctaS = { top: Math.round(r.top), bottom: Math.round(r.bottom), inView: r.top >= 0 && r.bottom <= vh - 8 }; }

    // ── horizontal overflow ──
    const scrollW = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
    let overflowers = [];
    if (scrollW > vw + 1) {
      for (const el of document.querySelectorAll('body *')) {
        const r = el.getBoundingClientRect();
        if (r.right > vw + 2 && r.width > 40 && vis(el)) {
          overflowers.push({ sel: (el.className ? '.' + String(el.className).split(' ')[0] : el.tagName) + (el.id ? '#' + el.id : ''), right: Math.round(r.right), w: Math.round(r.width) });
          if (overflowers.length >= 5) break;
        }
      }
    }

    // ── audit-mode sanity ──
    const env = {
      webdriver: navigator.webdriver === true,
      chromeObj: typeof window.chrome !== 'undefined',
      mainCss: !!document.getElementById('ap-css-main') || [...document.styleSheets].some(s => /\/main\.css/.test(s.href || '')),
      stylesheets: [...document.styleSheets].map(s => (s.href || 'inline').split('/').pop()),
      deferredCssLoaded: [...document.querySelectorAll('link[id^="ap-css-"]')].map(l => l.id),
      privacyBanner: !!document.querySelector('.privacy-banner, .ap-privacy-banner, [class*="privacy"]') && vis(document.querySelector('.privacy-banner, .ap-privacy-banner, [class*="privacy"]')),
    };

    return {
      bodyH: document.body.scrollHeight, vh, vw, scrollW, overflowers,
      masthead: mh ? mh.sel : null, mastheadRect, mastheadPos, navLinks, drawerLinks,
      footer, bottomNav, legacy, topChrome: Math.round(topChrome), botChrome: Math.round(botChrome), fixedEls,
      h1: h1s, h2: h2s, para: paraS, bodyColor: bodyCs.color, bodyBg: bodyCs.backgroundColor, bodyFont: bodyCs.fontFamily.split(',')[0],
      sections: rects.map(x => x.id), sectionGaps: gaps, containerWidths: [...widths].sort((a, b2) => a - b2),
      cta: ctaS, env,
    };
  });

  // keyboard focus test (desktop only)
  if (!mobile) {
    for (let i = 0; i < 4; i++) await p.keyboard.press('Tab');
    m.focus = await p.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return { el: 'body', ring: false };
      const cs = getComputedStyle(el);
      const ring = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || (cs.boxShadow && cs.boxShadow !== 'none');
      return { el: el.tagName + '.' + String(el.className).split(' ')[0], ring, outline: cs.outlineStyle + ' ' + cs.outlineWidth, boxShadow: (cs.boxShadow || '').slice(0, 60) };
    });
  }

  await p.screenshot({ path: `${OUT}/${mobile ? 'm' : 'd'}-${slug(path)}.png` });
  if (path === '/' || path === 'chart.html') {
    try { await p.screenshot({ path: `${OUT}/${mobile ? 'm' : 'd'}-${slug(path)}-full.png`, fullPage: true }); } catch (e) {}
  }
  await ctx.close();
  return m;
}

const results = {};
for (const path of PAGES) {
  results[slug(path)] = { desktop: await measure(path, false), mobile: await measure(path, true) };
  console.log('done', slug(path));
}
fs.writeFileSync(`${OUT}/uniformity-real.json`, JSON.stringify(results, null, 2));
console.log('WROTE', `${OUT}/uniformity-real.json`);
await b.close();
