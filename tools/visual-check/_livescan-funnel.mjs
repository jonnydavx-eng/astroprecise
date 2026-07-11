/* LIVE production funnel scan — astroprecise.app (ap-v705 Observatory).
   Real-user mode: AutomationControlled disabled, window.chrome shim, clean UA,
   pointerdown, SW blocked, no-cache. Scans core funnel at 1440 + 390.
   Output: JSON to stdout + screenshots to out/livescan-2026-07-11/. */
import { chromium } from 'playwright';
import fs from 'fs';

const OUT = 'out/livescan-2026-07-11';
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'https://astroprecise.app';
const DESK_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const MOB_UA = 'Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';

const PAGES = ['chart.html', 'horoscope.html', 'shop.html', 'explore.html', 'moment.html', 'transits.html'];

const b = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader-webgl', '--disable-blink-features=AutomationControlled'],
});

async function open(path, { mobile = false } = {}) {
  const ctx = await b.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1,
    userAgent: mobile ? MOB_UA : DESK_UA,
    serviceWorkers: 'block',
    extraHTTPHeaders: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
  });
  const p = await ctx.newPage();
  const errs = [];
  const failed = [];
  p.on('pageerror', (e) => errs.push('pageerror: ' + String(e).slice(0, 220)));
  p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 220)); });
  p.on('requestfailed', (r) => failed.push(`FAIL ${r.failure()?.errorText || ''} ${r.url()}`.slice(0, 220)));
  p.on('response', (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.request().method()} ${r.url()}`.slice(0, 220)); });
  await p.addInitScript(() => {
    try { localStorage.setItem('ap_intro_complete', '1'); } catch (e) {}
    if (typeof window.chrome === 'undefined') window.chrome = { runtime: {} };
  });
  await p.goto(BASE + '/' + path, { waitUntil: 'load', timeout: 60000 });
  // real-user pointerdown to trip lazy CSS loader
  try { await p.mouse.move(200, 300); await p.mouse.down(); await p.mouse.up(); } catch (e) {}
  return { ctx, p, errs, failed };
}

const layoutProbe = () => {
  const round = (n) => (n == null ? null : Math.round(n));
  // masthead: fixed navbar
  const mast = document.querySelector('.navbar, header .navbar, header[class*="site"], .site-header, header') ||
    [...document.querySelectorAll('header, nav')].find((e) => { const cs = getComputedStyle(e); return cs.position === 'fixed' || cs.position === 'sticky'; });
  const mastCs = mast ? getComputedStyle(mast) : null;
  const mastRect = mast ? mast.getBoundingClientRect() : null;
  // first meaningful heading in main content
  const h1 = document.querySelector('main h1, main h2, h1');
  const h1Rect = h1 ? h1.getBoundingClientRect() : null;
  const foot = document.querySelector('footer');
  const footCs = foot ? getComputedStyle(foot) : null;
  const footTitle = foot && foot.querySelector('.footer-nav-col__title, .footer-col__title, h3, h4');
  const footTitleCs = footTitle ? getComputedStyle(footTitle) : null;
  const bn = document.querySelector('.bottom-nav');
  const bnCs = bn ? getComputedStyle(bn) : null;
  const bnRect = bn ? bn.getBoundingClientRect() : null;
  // floating elems that could occlude bottom nav (toast/FAB)
  const floaters = [...document.querySelectorAll('*')].filter((el) => {
    const cs = getComputedStyle(el);
    if (cs.position !== 'fixed') return false;
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.05) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 10 || r.height < 10) return false;
    // near bottom of viewport
    return r.bottom > innerHeight - 90 && r.top < innerHeight && el !== bn && !(bn && bn.contains(el)) && !(el.contains(bn));
  }).map((el) => {
    const r = el.getBoundingClientRect();
    return { cls: (el.className || '').toString().slice(0, 40), tag: el.tagName, top: round(r.top), bottom: round(r.bottom), left: round(r.left), right: round(r.right), z: getComputedStyle(el).zIndex };
  }).slice(0, 8);
  return {
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: innerWidth,
    overflowX: document.documentElement.scrollWidth - innerWidth,
    mast: mast ? { cls: (mast.className || '').toString().slice(0, 50), pos: mastCs.position, bottom: round(mastRect.bottom), h: round(mastRect.height), z: mastCs.zIndex } : null,
    h1: h1 ? { text: (h1.textContent || '').trim().slice(0, 40), top: round(h1Rect.top), bottom: round(h1Rect.bottom) } : null,
    h1ClippedUnderMast: mastRect && h1Rect ? (h1Rect.top < mastRect.bottom - 2 && h1Rect.bottom > 0 && h1Rect.top < innerHeight) : null,
    footer: foot ? { display: footCs.display, links: foot.querySelectorAll('a').length, titleSize: footTitleCs ? footTitleCs.fontSize : null, styled: footCs.display !== 'block' || (footTitleCs && parseFloat(footTitleCs.fontSize) > 0) } : null,
    bottomNav: bn ? { display: bnCs.display, pos: bnCs.position, bottom: round(bnRect.bottom), top: round(bnRect.top), h: round(bnRect.height), z: bnCs.zIndex, atBottom: Math.abs(bnRect.bottom - innerHeight) < 4 } : null,
    floatersNearBottom: floaters,
  };
};

const report = { generated: new Date().toISOString(), base: BASE, pages: {} };

for (const path of PAGES) {
  for (const mobile of [false, true]) {
    const key = `${path}@${mobile ? 390 : 1440}`;
    const rec = { console: [], failed: [], layout: null, extra: {} };
    try {
      const { ctx, p, errs, failed } = await open(path, { mobile });
      await p.waitForTimeout(1600);
      // scroll through to trigger lazy footer + settle
      await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await p.waitForTimeout(1600);
      await p.evaluate(() => window.scrollTo(0, 0));
      await p.waitForTimeout(900);
      rec.layout = await p.evaluate(layoutProbe);
      // screenshot top
      await p.screenshot({ path: `${OUT}/${path.replace('.html', '')}-${mobile ? 'm390' : 'd1440'}-top.png` });
      // full page screenshot
      await p.screenshot({ path: `${OUT}/${path.replace('.html', '')}-${mobile ? 'm390' : 'd1440'}-full.png`, fullPage: true });
      // footer screenshot (scroll to bottom)
      await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await p.waitForTimeout(1400);
      await p.screenshot({ path: `${OUT}/${path.replace('.html', '')}-${mobile ? 'm390' : 'd1440'}-bottom.png` });
      await p.evaluate(() => window.scrollTo(0, 0));
      await p.waitForTimeout(500);

      // ── page-specific graphics ──
      if (path === 'chart.html') {
        // cast chart via sample button (fills date/place/time; same wheel path)
        const hasSample = await p.evaluate(() => !!document.getElementById('sample-btn'));
        rec.extra.hasSampleBtn = hasSample;
        // also fill the date field to honor 1990-06-15
        await p.evaluate(() => { const d = document.getElementById('date-input'); if (d) { d.value = '1990-06-15'; d.dispatchEvent(new Event('input', { bubbles: true })); d.dispatchEvent(new Event('change', { bubbles: true })); } });
        if (hasSample) {
          await p.click('#sample-btn').catch(() => {});
          await p.waitForTimeout(9000);
          rec.extra.chart = await p.evaluate(() => {
            const wheel = document.getElementById('natal-wheel');
            const svg = wheel && wheel.querySelector('svg');
            const bbox = svg ? svg.getBoundingClientRect() : null;
            const html = wheel ? wheel.innerHTML : '';
            const nanCount = (html.match(/NaN/g) || []).length;
            const aspectsTbl = document.getElementById('aspects-table');
            const planetsTbl = document.getElementById('planets-table');
            // aspects drawn inside svg = lines/paths in center
            const aspectLines = svg ? svg.querySelectorAll('[class*="aspect"], line, path[class*="asp"]').length : 0;
            const resultHidden = document.getElementById('chart-result')?.classList.contains('hidden');
            const loadingHidden = document.getElementById('chart-loading')?.classList.contains('hidden');
            // white-blob artifact: any large white/near-white filled rect/circle covering wheel
            let whiteBlob = null;
            if (svg) {
              const shapes = [...svg.querySelectorAll('rect,circle,ellipse,path')];
              for (const s of shapes) {
                const f = getComputedStyle(s).fill;
                const r = s.getBoundingClientRect();
                if (/rgb\(2[45][0-9], 2[45][0-9], 2[45][0-9]\)|rgb\(255, 255, 255\)|white/.test(f) && r.width > bbox?.width * 0.4 && r.height > bbox?.height * 0.4) {
                  whiteBlob = { fill: f, w: Math.round(r.width), h: Math.round(r.height) }; break;
                }
              }
            }
            return {
              wheelSvg: !!svg,
              svgSize: bbox ? { w: Math.round(bbox.width), h: Math.round(bbox.height) } : null,
              svgChildren: svg ? svg.querySelectorAll('*').length : 0,
              aspectLines,
              nanCount,
              planetsRows: planetsTbl ? planetsTbl.querySelectorAll('tr').length : 0,
              aspectsRows: aspectsTbl ? aspectsTbl.querySelectorAll('tr').length : 0,
              resultHidden, loadingHidden,
              whiteBlob,
              placeholder: !!(wheel && wheel.querySelector('.ap-wheel-placeholder')),
            };
          });
          await p.evaluate(() => document.getElementById('natal-wheel')?.scrollIntoView());
          await p.waitForTimeout(1500);
          await p.screenshot({ path: `${OUT}/chart-wheel-${mobile ? 'm390' : 'd1440'}.png` });
        }
      }

      if (path === 'shop.html') {
        rec.extra.shop = await p.evaluate(() => {
          const imgs = [...document.querySelectorAll('img')].filter((i) => i.width > 40 && i.height > 40);
          const productImgs = [...document.querySelectorAll('.product img, .product-card img, [class*="product"] img, .shop-item img, [class*="card"] img')];
          const brokenImgs = [...document.querySelectorAll('img')].filter((i) => i.complete && i.naturalWidth === 0 && (i.getBoundingClientRect().width > 10)).map((i) => (i.currentSrc || i.src || '').slice(-70));
          // fake badges = elements with text like "BESTSELLER" "SALE" "★★★★★" hardcoded
          const badgeTexts = [...document.querySelectorAll('[class*="badge"], [class*="tag"], [class*="rating"], [class*="star"]')].map((e) => (e.textContent || '').trim()).filter((t) => t && t.length < 30).slice(0, 15);
          return {
            totalImgs: imgs.length,
            productImgCount: productImgs.length,
            productImgOk: productImgs.filter((i) => i.naturalWidth > 0).length,
            brokenImgs: brokenImgs.slice(0, 10),
            badgeTexts,
          };
        });
      }

      if (path === 'explore.html') {
        rec.extra.explore = await p.evaluate(() => {
          const round = (n) => Math.round(n);
          const canvas = document.querySelector('canvas');
          const cRect = canvas ? canvas.getBoundingClientRect() : null;
          // the "disc"/model container
          const disc = document.querySelector('[class*="orrery"], [class*="model"], [class*="disc"], .explore-stage, #explore-canvas, canvas');
          const dRect = disc ? disc.getBoundingClientRect() : null;
          // the deck (cards)
          const deck = document.querySelector('[class*="deck"], .explore-deck, [class*="card-rail"], [class*="carousel"]');
          const deckRect = deck ? deck.getBoundingClientRect() : null;
          let overlap = null;
          if (dRect && deckRect) {
            const ox = Math.max(0, Math.min(dRect.right, deckRect.right) - Math.max(dRect.left, deckRect.left));
            const oy = Math.max(0, Math.min(dRect.bottom, deckRect.bottom) - Math.max(dRect.top, deckRect.top));
            overlap = { ox: round(ox), oy: round(oy), overlapArea: round(ox * oy) };
          }
          return {
            hasCanvas: !!canvas,
            canvasSize: cRect ? { w: round(cRect.width), h: round(cRect.height) } : null,
            deck: deck ? { cls: (deck.className || '').toString().slice(0, 40), top: round(deckRect.top), bottom: round(deckRect.bottom) } : null,
            discRect: dRect ? { top: round(dRect.top), bottom: round(dRect.bottom) } : null,
            deckOverDisc: overlap,
          };
        });
      }

      // engine stills on all non-chart pages: <img> naturalWidth>0
      rec.extra.stills = await p.evaluate(() => {
        const stills = [...document.querySelectorAll('img[src*="engine"], img[src*="still"], img[class*="engine"], .engine-still img, [class*="engine"] img, figure img')];
        return stills.slice(0, 12).map((i) => ({ src: (i.currentSrc || i.src || '').slice(-55), nw: i.naturalWidth, nh: i.naturalHeight, ok: i.naturalWidth > 0, caption: (i.closest('figure')?.querySelector('figcaption')?.textContent || '').trim().slice(0, 50) }));
      });

      // aurora/cyan CTA remnants
      rec.extra.auroraCtas = await p.evaluate(() => {
        const isCyan = (c) => {
          const m = c.match(/rgба?\(?(\d+),\s*(\d+),\s*(\d+)/i) || c.match(/rgb\((\d+),\s*(\d+),\s*(\d+)/);
          if (!m) return false;
          const r = +m[1], g = +m[2], bl = +m[3];
          return bl > 150 && g > 140 && r < 120 && (bl - r) > 60; // cyan-ish
        };
        const out = [];
        for (const el of document.querySelectorAll('a,button,[class*="cta"],[class*="btn"]')) {
          const cs = getComputedStyle(el);
          const r = el.getBoundingClientRect();
          if (r.width < 20 || r.height < 12) continue;
          if (isCyan(cs.backgroundColor) || (el.className || '').toString().toLowerCase().includes('aurora')) {
            out.push({ txt: (el.textContent || '').trim().slice(0, 30), cls: (el.className || '').toString().slice(0, 40), bg: cs.backgroundColor });
          }
          if (out.length >= 8) break;
        }
        return out;
      });

      rec.console = [...new Set(errs)];
      rec.failed = [...new Set(failed)];
      await ctx.close();
    } catch (e) {
      rec.error = String(e).slice(0, 300);
    }
    report.pages[key] = rec;
    console.error(`done ${key}  console=${rec.console.length} failed=${rec.failed.length}`);
  }
}

await b.close();
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
