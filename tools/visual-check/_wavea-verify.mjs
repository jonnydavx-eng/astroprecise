/* Wave-A verification — real-user mode (AutomationControlled disabled, chrome
   shim, clean UA). Re-measures every wave-A fix. Outputs JSON + screenshots to
   out/wavea-2026-07-10/. */
import { chromium } from 'playwright';
import fs from 'fs';

const OUT = 'out/wavea-2026-07-10';
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://127.0.0.1:8790';
const DESK_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const MOB_UA = 'Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';

const report = { checks: [], consoleErrors: {} };
function gate(name, ok, detail) {
  report.checks.push({ name, ok: !!ok, detail: detail == null ? '' : String(detail) });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail != null ? ' — ' + detail : ''}`);
}

const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader-webgl', '--disable-blink-features=AutomationControlled'] });

async function open(path, { mobile = false, shimChrome = true, ua = null, hash = '' } = {}) {
  const ctx = await b.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1,
    userAgent: ua || (mobile ? MOB_UA : DESK_UA),
    serviceWorkers: 'block',
  });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push('pageerror: ' + String(e).slice(0, 200)));
  p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
  await p.addInitScript((shim) => {
    try { localStorage.setItem('ap_intro_complete', '1'); } catch (e) {}
    if (shim && typeof window.chrome === 'undefined') window.chrome = { runtime: {} };
  }, shimChrome);
  await p.goto(BASE + '/' + path + hash, { waitUntil: 'load', timeout: 60000 });
  return { ctx, p, errs };
}

/* ── 1a. Footer P0: transits — scroll-only (NO click) must pull main.css ── */
{
  const { ctx, p, errs } = await open('transits.html');
  await p.waitForTimeout(2500);
  const before = await p.evaluate(() => !!document.getElementById('ap-css-main'));
  await p.mouse.wheel(0, 30000);
  await p.waitForTimeout(2000);
  const r = await p.evaluate(() => {
    const link = document.getElementById('ap-css-main');
    const foot = document.querySelector('footer');
    const title = foot && foot.querySelector('.footer-nav-col__title');
    const cs = title && getComputedStyle(title);
    return {
      mainCss: !!link, footerLinks: foot ? foot.querySelectorAll('a').length : 0,
      colTitleSize: cs ? cs.fontSize : null, colDisplay: foot ? getComputedStyle(foot.querySelector('.footer-inner') || foot).display : null,
    };
  });
  gate('footer: main.css NOT loaded before interaction', before === false, `before=${before}`);
  gate('footer: scroll alone loads main.css (no click)', r.mainCss, JSON.stringify(r));
  await p.screenshot({ path: `${OUT}/footer-transits-scrollonly.png` });
  report.consoleErrors['transits-scroll'] = errs;
  await ctx.close();
}

/* ── 1b. Firefox-shaped browser (no window.chrome): pointerdown loads CSS ── */
{
  const { ctx, p } = await open('transits.html', { shimChrome: false });
  await p.waitForTimeout(2000);
  const audit = await p.evaluate(() => ({ chromeObj: typeof window.chrome !== 'undefined', webdriver: navigator.webdriver === true }));
  await p.mouse.move(300, 300); await p.mouse.down(); await p.mouse.up();
  await p.waitForTimeout(1500);
  const main = await p.evaluate(() => !!document.getElementById('ap-css-main'));
  gate('no-chrome-global browser still gets CSS on pointerdown', main, JSON.stringify(audit));
  await ctx.close();
}

/* ── 2. Home mobile bottom nav: fixed bar, 48px targets; desktop hidden ── */
{
  const { ctx, p, errs } = await open('', { mobile: true });
  await p.waitForTimeout(5500);
  const r = await p.evaluate(() => {
    const bn = document.querySelector('.bottom-nav');
    if (!bn) return null;
    const cs = getComputedStyle(bn);
    const rect = bn.getBoundingClientRect();
    return {
      position: cs.position, display: cs.display, zIndex: cs.zIndex,
      top: Math.round(rect.top), bottom: Math.round(rect.bottom), h: Math.round(rect.height), vh: innerHeight,
      items: [...bn.querySelectorAll('.bottom-nav__item')].map(i => {
        const ir = i.getBoundingClientRect();
        return { label: (i.textContent || '').trim(), w: Math.round(ir.width), h: Math.round(ir.height) };
      }),
      barAtBottom: Math.abs(rect.bottom - innerHeight) < 3,
    };
  });
  gate('home mobile: bottom-nav exists', !!r);
  if (r) {
    gate('home mobile: bottom-nav position fixed at viewport bottom', r.position === 'fixed' && r.barAtBottom, `pos=${r.position} bottom=${r.bottom}/${r.vh}`);
    gate('home mobile: all tab targets ≥48px', r.items.length >= 4 && r.items.every(i => i.h >= 48), JSON.stringify(r.items));
  }
  await p.screenshot({ path: `${OUT}/home-mobile-bottomnav.png` });
  report.consoleErrors['home-mobile'] = errs;
  await ctx.close();

  const d = await open('');
  await d.p.waitForTimeout(4000);
  const desk = await d.p.evaluate(() => {
    const bn = document.querySelector('.bottom-nav');
    return bn ? getComputedStyle(bn).display : 'absent';
  });
  gate('home desktop: bottom-nav hidden', desk === 'none' || desk === 'absent', desk);
  report.consoleErrors['home-desktop'] = d.errs;
  await d.ctx.close();
}

/* ── 3. Explore CTA contrast ≥4.5:1 (rest + hover) ── */
{
  const { ctx, p, errs } = await open('explore.html');
  await p.waitForTimeout(4000);
  const lum = ([r, g, bl]) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(bl);
  };
  /* skip fully transparent colors (rgba(...,0)) — they are not painted */
  const parse = (s) => [...s.matchAll(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/g)]
    .filter(m => m[4] === undefined || parseFloat(m[4]) > 0.05)
    .map(m => [+m[1], +m[2], +m[3]]);
  const read = await p.evaluate(() => {
    const el = document.querySelector('.explore-return__primary');
    if (!el) return null;
    const cs = getComputedStyle(el);
    return { color: cs.color, bgImage: cs.backgroundImage, bgColor: cs.backgroundColor };
  });
  if (!read) gate('explore CTA present', false);
  else {
    const ink = parse(read.color)[0];
    const bgs = parse(read.bgImage).concat(parse(read.bgColor));
    const ratios = bgs.map(bg => {
      const [a, b2] = [lum(ink), lum(bg)].sort((x, y) => y - x);
      return +(((a + 0.05) / (b2 + 0.05)).toFixed(2));
    });
    const min = Math.min(...ratios);
    gate('explore CTA rest contrast ≥4.5 vs every gradient stop', min >= 4.5, `ink=${read.color} ratios=${JSON.stringify(ratios)}`);
    await p.hover('.explore-return__primary');
    await p.waitForTimeout(400);
    const hcolor = await p.evaluate(() => getComputedStyle(document.querySelector('.explore-return__primary')).color);
    const hink = parse(hcolor)[0];
    const hmin = Math.min(...bgs.map(bg => {
      const [a, b2] = [lum(hink), lum(bg)].sort((x, y) => y - x);
      return (a + 0.05) / (b2 + 0.05);
    }));
    gate('explore CTA hover contrast ≥4.5', hmin >= 4.5, `hover ink=${hcolor} min=${hmin.toFixed(2)}`);
    const pill = await p.$('.explore-return__primary');
    if (pill) await pill.screenshot({ path: `${OUT}/explore-cta-pill.png` });
  }
  report.consoleErrors['explore'] = errs;
  await ctx.close();
}

/* ── 4. moment + compat scrollWidth ≤391 at 390 ── */
for (const path of ['moment.html', 'compatibility.html']) {
  const { ctx, p, errs } = await open(path, { mobile: true });
  await p.waitForTimeout(2500);
  await p.mouse.move(200, 400); await p.mouse.down(); await p.mouse.up();
  await p.waitForTimeout(1500);
  const r = await p.evaluate(() => ({
    scrollW: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
    chips: [...document.querySelectorAll('.mom-chip')].map(c => Math.round(c.getBoundingClientRect().right)),
    sidebarOverflow: (() => { const el = document.querySelector('.synastry-sidebar-card'); return el ? getComputedStyle(el).overflowX : null; })(),
  }));
  gate(`${path} mobile scrollWidth ≤391`, r.scrollW <= 391, JSON.stringify(r));
  await p.screenshot({ path: `${OUT}/overflow-${path.replace('.html', '')}.png` });
  report.consoleErrors[path] = errs;
  await ctx.close();
}

/* ── 5. UTC deep-link shim: bare == Z ── */
{
  const offs = {};
  for (const h of ['#m=2026-08-12T17:46', '#m=2026-08-12T17:46Z']) {
    const { ctx, p } = await open('explore.html', { hash: h });
    await p.waitForTimeout(5000);
    offs[h] = await p.evaluate(() => {
      try {
        if (window.LiteOrrery && typeof LiteOrrery.getDayOffset === 'function') return LiteOrrery.getDayOffset();
      } catch (e) {}
      return null;
    });
    await ctx.close();
  }
  const a = offs['#m=2026-08-12T17:46'], z = offs['#m=2026-08-12T17:46Z'];
  const ok = a != null && z != null && Math.abs(a - z) < 0.005;
  gate('deep link bare time === Z time (UTC shim)', ok, `bare=${a} z=${z} diff=${a != null && z != null ? Math.abs(a - z).toFixed(6) : 'n/a'}`);
}

/* ── 6. Legal/404 chrome: masthead + footer system ── */
for (const path of ['privacy.html', 'terms.html', '404.html']) {
  const { ctx, p, errs } = await open(path);
  await p.waitForTimeout(3500);
  const r = await p.evaluate(() => {
    const mh = document.querySelector('.site-header .navbar');
    const mhr = mh && mh.getBoundingClientRect();
    const navLinks = document.querySelectorAll('.navbar__nav a').length;
    const cols = document.querySelectorAll('footer .footer-nav-col').length;
    const social = !!document.querySelector('footer .ap-social-row');
    const footLinks = document.querySelectorAll('footer a').length;
    return { masthead: !!mh, mhH: mhr ? Math.round(mhr.height) : 0, navLinks, cols, social, footLinks, title: document.title.slice(0, 40) };
  });
  gate(`${path}: masthead present + visible`, r.masthead && r.mhH > 30, JSON.stringify(r));
  gate(`${path}: footer system injected (nav cols ≥3)`, r.cols >= 3, `cols=${r.cols} links=${r.footLinks} social=${r.social}`);
  await p.screenshot({ path: `${OUT}/legal-${path.replace('.html', '')}.png`, fullPage: false });
  report.consoleErrors[path] = errs;
  await ctx.close();
}

/* ── 7. index.html: no visible link to a hidden anchor target ── */
{
  const { ctx, p, errs } = await open('');
  await p.waitForTimeout(4500);
  const bad = await p.evaluate(() => {
    const out = [];
    const vis = (el) => {
      if (!el) return false;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };
    /* a zero-size in-flow anchor span is a VALID jump target — judge the
       target by its display/visibility chain, not its own rect */
    const chainVisible = (el) => {
      let cur = el;
      while (cur && cur !== document.documentElement) {
        const cs = getComputedStyle(cur);
        if (cs.display === 'none' || cs.visibility === 'hidden') return false;
        cur = cur.parentElement;
      }
      return true;
    };
    for (const a of document.querySelectorAll('a[href^="#"]')) {
      if (!vis(a)) continue;
      const id = a.getAttribute('href').slice(1);
      if (!id) continue;
      const t = document.getElementById(id);
      if (!t || !chainVisible(t)) out.push({ href: '#' + id, text: (a.textContent || '').trim().slice(0, 40), target: t ? 'hidden' : 'missing' });
    }
    return out;
  });
  gate('home: zero visible links to hidden/missing anchors', bad.length === 0, JSON.stringify(bad));
  report.consoleErrors['home-anchors'] = errs;
  await ctx.close();
}

fs.writeFileSync(`${OUT}/wavea-report.json`, JSON.stringify(report, null, 2));
const fails = report.checks.filter(c => !c.ok);
console.log(`\n${report.checks.length - fails.length}/${report.checks.length} PASS${fails.length ? ' — FAILURES: ' + fails.map(f => f.name).join(' | ') : ''}`);
const errPages = Object.entries(report.consoleErrors).filter(([, v]) => v.length);
console.log('console errors:', errPages.length ? JSON.stringify(Object.fromEntries(errPages), null, 1) : 'none');
await b.close();
