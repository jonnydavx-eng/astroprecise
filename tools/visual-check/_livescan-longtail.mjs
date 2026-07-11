/* LONG-TAIL + REST live scan of astroprecise.app (ap-v705).
   Real-user mode: AutomationControlled off, real UA, window.chrome shim,
   pointerdown, service workers BLOCKED, cache bypassed. Settle >=1600ms.
   Screenshots -> out/livescan-2026-07-11/. JSON -> livescan-report.json */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dir, 'out', 'livescan-2026-07-11');
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'https://astroprecise.app';
const DESK_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const MOB_UA = 'Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';

// path, label, settle(ms), heavy(3D)
const PAGES = [
  ['/', 'home', 3800, true],
  ['/aries.html', 'aries', 2000, false],
  ['/leo.html', 'leo', 2000, false],
  ['/pisces.html', 'pisces', 2000, false],
  ['/compatibility.html', 'compatibility', 2200, false],
  ['/ephemeris.html', 'ephemeris', 3500, true],
  ['/lifepath.html', 'lifepath', 2000, false],
  ['/angel-numbers.html', 'angel-numbers', 2000, false],
  ['/guides.html', 'guides', 2000, false],
  ['/accuracy.html', 'accuracy', 2000, false],
  ['/why.html', 'why', 2000, false],
  ['/mysky.html', 'mysky', 2200, false],
  ['/moonphase.html', 'moonphase', 2200, false],
  ['/this-weeks-sky.html', 'this-weeks-sky', 2200, false],
  ['/sky.html', 'sky', 2200, false],
  ['/privacy.html', 'privacy', 1800, false],
  ['/terms.html', 'terms', 1800, false],
  ['/this-page-does-not-exist-xyz.html', '404', 1800, false],
];

const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader-webgl', '--disable-blink-features=AutomationControlled'] });

async function scan(pagePath, label, settle, heavy, mobile) {
  const ctx = await b.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1,
    userAgent: mobile ? MOB_UA : DESK_UA,
    serviceWorkers: 'block',
  });
  await ctx.addInitScript(() => {
    try { localStorage.setItem('ap_intro_complete', '1'); localStorage.setItem('ap_privacy_ack', '1'); } catch (e) {}
    if (typeof window.chrome === 'undefined') window.chrome = { runtime: {} };
  });
  const p = await ctx.newPage();
  const consoleErrs = [], pageErrs = [], failedReq = [];
  p.on('pageerror', e => pageErrs.push(String(e).slice(0, 220)));
  p.on('console', m => { if (m.type() === 'error') consoleErrs.push(m.text().slice(0, 220)); });
  p.on('requestfailed', r => failedReq.push({ url: r.url().slice(0, 160), err: r.failure()?.errorText || 'failed' }));
  p.on('response', r => { const s = r.status(); if (s >= 400) failedReq.push({ url: r.url().slice(0, 160), status: s }); });

  let httpStatus = null;
  try {
    const resp = await p.goto(BASE + pagePath, { waitUntil: 'load', timeout: 60000 });
    httpStatus = resp ? resp.status() : null;
  } catch (e) {
    pageErrs.push('GOTO: ' + String(e).slice(0, 160));
  }
  // real-user pointerdown to trip lazy-CSS/nav loaders
  try { await p.mouse.move(mobile ? 200 : 300, 300); await p.mouse.down(); await p.mouse.up(); } catch (e) {}
  if (heavy) { try { await p.waitForFunction(() => document.documentElement.classList.contains('orrery-full') || document.documentElement.classList.contains('orrery-poster-ready'), { timeout: 12000 }); } catch (e) {} }
  await p.waitForTimeout(settle);

  const m = await p.evaluate(() => {
    const q = s => document.querySelector(s);
    const rect = el => el ? el.getBoundingClientRect() : null;
    const cs = el => el ? getComputedStyle(el) : null;

    // masthead
    const mh = q('#apMasthead') || q('.masthead') || q('.site-header') || q('header');
    const mhr = rect(mh);
    const mhStyled = mh ? (cs(mh).position !== 'static' || cs(mh).backgroundColor !== 'rgba(0, 0, 0, 0)') : false;
    const mhLinks = mh ? [...mh.querySelectorAll('a')].map(a => ({ t: (a.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 20), href: a.getAttribute('href') })).filter(x => x.t) : [];

    // bottom-nav
    const bn = q('.bottom-nav');
    const bnr = rect(bn);
    const bnItems = bn ? [...bn.querySelectorAll('a,.bottom-nav__item')].map(i => (i.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 16)).filter(Boolean) : [];
    const bnDisplay = bn ? cs(bn).display : 'absent';

    // footer
    const ft = q('footer') || q('.site-footer');
    const ftr = rect(ft);
    const ftLinks = ft ? ft.querySelectorAll('a').length : 0;
    const ftCols = ft ? ft.querySelectorAll('.footer-nav-col, .footer-col, [class*="footer"][class*="col"]').length : 0;
    const ftStyled = ft ? cs(ft).backgroundColor : null;

    // h1 / title clip
    const h1 = q('h1');
    const h1r = rect(h1);
    const h1Text = h1 ? (h1.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60) : null;

    // overflow
    const scrollW = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
    const docH = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);

    // broken imgs (rendered, natural width 0)
    const imgs = [...document.querySelectorAll('img')];
    const broken = imgs.filter(i => {
      const r = i.getBoundingClientRect();
      return (r.width > 2 && r.height > 2) && i.complete && i.naturalWidth === 0;
    }).map(i => (i.currentSrc || i.src || i.getAttribute('src') || '').slice(0, 120));

    // palette sample
    const bodyBg = cs(document.body).backgroundColor;
    const htmlBg = cs(document.documentElement).backgroundColor;
    const bodyColor = cs(document.body).color;
    const mhBg = mh ? cs(mh).backgroundColor : null;

    // giant void heuristic: largest vertical gap between consecutive top-level section rects
    const secs = [...document.querySelectorAll('body > *, main > section, main > div, .page-wrap > section')]
      .map(el => el.getBoundingClientRect())
      .filter(r => r.height > 4 && r.width > 4 && r.bottom > 0 && r.top < docH)
      .sort((a, bb) => a.top - bb.top);
    let maxGap = 0, gapAt = 0;
    for (let i = 1; i < secs.length; i++) {
      const g = secs[i].top - secs[i - 1].bottom;
      if (g > maxGap) { maxGap = g; gapAt = Math.round(secs[i - 1].bottom); }
    }

    // meta
    const meta = {};
    document.querySelectorAll('meta').forEach(mm => { const k = mm.getAttribute('name') || mm.getAttribute('property'); if (k) meta[k] = mm.getAttribute('content'); });
    const iconHref = (q('link[rel~="icon"]') || {}).getAttribute ? q('link[rel~="icon"]').getAttribute('href') : null;

    return {
      title: document.title.slice(0, 70),
      htmlClasses: [...document.documentElement.classList].slice(0, 8),
      bodyClasses: [...document.body.classList].slice(0, 8),
      masthead: mh ? { h: Math.round(mhr.height), top: Math.round(mhr.top), styled: mhStyled, position: cs(mh).position, links: mhLinks.slice(0, 24) } : null,
      bottomNav: bn ? { display: bnDisplay, h: bnr ? Math.round(bnr.height) : 0, bottom: bnr ? Math.round(bnr.bottom) : 0, items: bnItems } : { display: 'absent' },
      footer: ft ? { links: ftLinks, cols: ftCols, bg: ftStyled, h: Math.round(ftr.height), bottom: Math.round(ftr.bottom) } : null,
      h1: h1 ? { text: h1Text, top: Math.round(h1r.top), bottom: Math.round(h1r.bottom), visible: h1r.height > 0 } : null,
      h1ClippedUnderMasthead: (h1 && mh) ? (h1r.top < mhr.bottom - 4 && h1r.top >= 0) : null,
      scrollW, docH, viewportW: innerWidth,
      overflow: scrollW > innerWidth + 1,
      brokenImgs: broken,
      imgCount: imgs.length,
      palette: { bodyBg, htmlBg, bodyColor, mhBg },
      maxVoidGap: Math.round(maxGap), voidAt: gapAt,
      ogImage: meta['og:image'] || null,
      themeColor: meta['theme-color'] || null,
      iconHref,
    };
  });

  // Probe OG image + favicon reachability (not auto-loaded)
  const probes = {};
  for (const [key, url] of [['ogImage', m.ogImage], ['favicon', m.iconHref]]) {
    if (!url) { probes[key] = 'none'; continue; }
    const abs = url.startsWith('http') ? url : (url.startsWith('/') ? BASE + url : BASE + '/' + url.replace(/^\.?\//, ''));
    try { const r = await p.request.get(abs, { timeout: 15000 }); probes[key] = r.status(); }
    catch (e) { probes[key] = 'ERR'; }
  }

  const shotName = `${label}-${mobile ? '390' : '1440'}`;
  try { await p.screenshot({ path: path.join(OUT, shotName + '.png'), fullPage: false }); } catch (e) {}
  // full-page for non-heavy (heavy 3D fullPage can hang/huge)
  if (!heavy) { try { await p.screenshot({ path: path.join(OUT, shotName + '-full.png'), fullPage: true }); } catch (e) {} }

  await ctx.close();
  return { label, mobile, pagePath, httpStatus, metrics: m, probes, consoleErrs, pageErrs, failedReq };
}

const report = [];
for (const [pp, label, settle, heavy] of PAGES) {
  for (const mobile of [false, true]) {
    process.stdout.write(`scan ${label} ${mobile ? '390' : '1440'} ... `);
    try {
      const r = await scan(pp, label, settle, heavy, mobile);
      report.push(r);
      const m = r.metrics;
      console.log(`http=${r.httpStatus} ovf=${m.overflow} void=${m.maxVoidGap} broken=${m.brokenImgs.length} cerr=${r.consoleErrs.length} 4xx=${r.failedReq.length}`);
    } catch (e) {
      console.log('SCAN-ERR ' + String(e).slice(0, 120));
      report.push({ label, mobile, pagePath: pp, error: String(e).slice(0, 200) });
    }
  }
}

fs.writeFileSync(path.join(OUT, 'livescan-report.json'), JSON.stringify(report, null, 2));
console.log('\nWrote ' + path.join(OUT, 'livescan-report.json'));
await b.close();
