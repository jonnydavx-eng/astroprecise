/**
 * First-paint audit: pages that defer page CSS via js/defer-page-css.js.
 * For each page: screenshot under webdriver (deferred CSS NEVER loads — what
 * search engines + first-paint users see) and with deferred CSS force-injected.
 * Collect layout metrics to classify OK vs BROKEN.
 *
 * Usage: node firstpaint-audit.mjs [pageName ...]   (default: all)
 */
import { chromium } from 'playwright';
import { mkdir, writeFile, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = 'http://localhost:8790';
const SITE = join(__dirname, '..', '..', 'website');
const OUT = join(__dirname, 'out', 'firstpaint');

const ALL_PAGES = [
  'accuracy.html','angel-numbers.html','aquarius.html','aries.html','cancer.html',
  'capricorn.html','chart.html','charts.html','compatibility.html','ephemeris.html',
  'gemini.html','guides.html','horoscope.html','leo.html','libra.html','lifepath.html',
  'links.html','moonphase.html','name-numerology.html','outreach.html','pisces.html',
  'profile.html','quiz.html','retrograde.html','sagittarius.html','saturn-return.html',
  'scorpio.html','shop.html','solar-return.html','synastry.html','taurus.html',
  'this-weeks-sky.html','tonight.html','transits.html','virgo.html',
  'what-is-my-rising-sign.html','why.html',
];

const SIGN_BOOT_LIST = [
  'css/ap-motion.css','css/ap-cinematic-2026.css','css/ap-micro-2026.css',
  'css/main.css','css/ap-page-bridge.css','css/sign-page.css','css/celestial-seals.css',
];

async function deferredListFor(pageName) {
  const html = await readFile(join(SITE, pageName), 'utf8');
  const list = [];
  for (const m of html.matchAll(/deferPageCss\(\s*'([^']+)'/g)) list.push(m[1]);
  if (/deferMainCss\(\)/.test(html)) list.push('css/main.css');
  if (/ap-sign-defer-boot\.js/.test(html)) list.push(...SIGN_BOOT_LIST);
  // inline defer*Fonts snippets: l.href='css/fonts.css'
  if (/l\.href='css\/fonts\.css'/.test(html)) list.push('css/fonts.css');
  return [...new Set(list)];
}

async function metrics(page) {
  return page.evaluate(() => {
    const vis = (el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none';
    };
    // header / masthead
    const header = document.querySelector('header, .navbar, nav[class*="nav"], [class*="masthead"]');
    const hr = header && vis(header) ? header.getBoundingClientRect() : null;
    // first main heading not inside header
    let h1 = null;
    for (const h of document.querySelectorAll('h1, main h2')) {
      if (header && header.contains(h)) continue;
      if (vis(h)) { h1 = h; break; }
    }
    const h1r = h1 ? h1.getBoundingClientRect() : null;
    let headerOverlap = false;
    if (hr && h1r) {
      const ix = Math.max(0, Math.min(hr.right, h1r.right) - Math.max(hr.left, h1r.left));
      const iy = Math.max(0, Math.min(hr.bottom, h1r.bottom) - Math.max(hr.top, h1r.top));
      headerOverlap = ix > 10 && iy > 10;
    }
    // naked native form controls in main/body (UA-default appearance)
    let naked = 0; const nakedSamples = [];
    for (const c of document.querySelectorAll('main input:not([type=hidden]), main select, main button, body > input, form input:not([type=hidden]), form select, form button')) {
      if (!vis(c)) continue;
      const cs = getComputedStyle(c);
      const r = c.getBoundingClientRect();
      if (r.top > innerHeight * 2) continue; // far below fold — less critical
      const uaButton = c.tagName === 'BUTTON' && (cs.backgroundColor === 'rgb(239, 239, 239)' || cs.backgroundColor === 'rgb(240, 240, 240)' || cs.backgroundColor === 'buttonface');
      const uaInput = (c.tagName === 'INPUT' || c.tagName === 'SELECT') && (cs.backgroundColor === 'rgb(255, 255, 255)' || cs.borderTopStyle === 'inset') && cs.borderRadius === '0px';
      if (uaButton || uaInput) { naked++; if (nakedSamples.length < 5) nakedSamples.push(`${c.tagName}#${c.id || ''}.${(c.className || '').toString().slice(0, 40)}@${Math.round(r.left)},${Math.round(r.top)}`); }
    }
    // full-bleed text at far-left edge (x < 20) in main
    let leftBleed = 0; const leftSamples = [];
    for (const el of document.querySelectorAll('main h1, main h2, main h3, main p, main label, main li, main button, main input:not([type=hidden])')) {
      if (!vis(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.top > innerHeight * 2) continue;
      if (r.left < 20 && r.width > 100) { leftBleed++; if (leftSamples.length < 5) leftSamples.push(`${el.tagName}.${(el.className || '').toString().slice(0, 40)}@${Math.round(r.left)},${Math.round(r.top)}`); }
    }
    const bodyBg = getComputedStyle(document.body).backgroundColor;
    const htmlBg = getComputedStyle(document.documentElement).backgroundColor;
    return {
      title: document.title.slice(0, 60),
      headerRect: hr ? { t: Math.round(hr.top), b: Math.round(hr.bottom), h: Math.round(hr.height) } : null,
      h1Text: h1 ? h1.textContent.trim().slice(0, 50) : null,
      h1Rect: h1r ? { t: Math.round(h1r.top), l: Math.round(h1r.left) } : null,
      headerOverlap, naked, nakedSamples, leftBleed, leftSamples, bodyBg, htmlBg,
      stylesheets: [...document.styleSheets].map(s => (s.href || 'inline').split('/').pop().split('?')[0]),
    };
  });
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const targets = process.argv.slice(2).length ? process.argv.slice(2) : ALL_PAGES;
  const browser = await chromium.launch({ headless: true });
  const report = [];

  for (const pageName of targets) {
    const id = pageName.replace('.html', '');
    const deferred = await deferredListFor(pageName);
    const entry = { page: pageName, deferred };
    const consoleErrs = [];

    // PASS 1: webdriver, deferred CSS never loads (worst case / SEO view)
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'dark' });
    await ctx.addInitScript(() => {
      try { sessionStorage.setItem('ap_intro_complete', '1'); } catch (_) {}
      try { localStorage.setItem('ap_privacy_ack', '1'); } catch (_) {}
    });
    const p1 = await ctx.newPage();
    p1.on('console', (m) => { if (m.type() === 'error') consoleErrs.push(m.text().slice(0, 200)); });
    try {
      await p1.goto(`${BASE}/${pageName}`, { waitUntil: 'load', timeout: 30000 });
      await p1.waitForTimeout(1200);
      entry.bare = await metrics(p1);
      await p1.screenshot({ path: join(OUT, `${id}-bare.png`) });
    } catch (e) { entry.bareError = String(e).slice(0, 200); }
    await p1.close();

    // PASS 2: same context, force-inject every deferred stylesheet (intended final look)
    const p2 = await ctx.newPage();
    try {
      await p2.goto(`${BASE}/${pageName}`, { waitUntil: 'load', timeout: 30000 });
      for (const href of deferred) {
        await p2.addStyleTag({ url: `${BASE}/${href}` }).catch(() => {});
      }
      await p2.waitForTimeout(1200);
      entry.styled = await metrics(p2);
      await p2.screenshot({ path: join(OUT, `${id}-styled.png`) });
    } catch (e) { entry.styledError = String(e).slice(0, 200); }
    await p2.close();
    await ctx.close();

    entry.consoleErrors = consoleErrs;
    // classification heuristic
    const b = entry.bare || {};
    const flags = [];
    if (b.headerOverlap) flags.push('h1-overlaps-header');
    if ((b.naked || 0) > 0) flags.push(`naked-controls:${b.naked}`);
    if ((b.leftBleed || 0) > 0) flags.push(`left-bleed:${b.leftBleed}`);
    entry.flags = flags;
    entry.suspect = flags.length > 0;
    report.push(entry);
    console.log(`${pageName}: ${flags.length ? 'SUSPECT [' + flags.join(', ') + ']' : 'clean'}  deferred=${deferred.length}`);
  }

  await writeFile(join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  await browser.close();
  const suspects = report.filter(r => r.suspect).map(r => r.page);
  console.log('\nSUSPECTS:', suspects.join(', ') || 'none');
}

main();
