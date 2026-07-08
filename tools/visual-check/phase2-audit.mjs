/** External audit — phase 2 features (chart AI, horoscope bridge, shop dormant). */
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:8790';
const results = [];

function rec(name, pass, detail) {
  results.push({ name, pass, detail });
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await ctx.addInitScript(() => {
  try { sessionStorage.setItem('ap_intro_complete', '1'); } catch (_) {}
  try { localStorage.setItem('ap_privacy_ack', '1'); } catch (_) {}
});

// Horoscope sky bridge
{
  const page = await ctx.newPage();
  await page.goto(`${BASE}/horoscope.html`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);
  const bridge = await page.evaluate(() => ({
    exists: !!document.getElementById('ap-horoscope-sky-bridge'),
    hasContent: (document.getElementById('ap-horoscope-sky-bridge') || {}).innerText?.length > 20,
  }));
  rec('horoscope:sky-bridge', bridge.exists && bridge.hasContent, JSON.stringify(bridge));
  await page.close();
}

// Shop dormant catalogue
{
  const page = await ctx.newPage();
  await page.goto(`${BASE}/shop.html`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2500);
  const shop = await page.evaluate(() => {
    const grid = document.getElementById('shopc-grid');
    const text = grid ? grid.innerText : '';
    return {
      dormantTitle: /opening soon/i.test((document.querySelector('.shop-section-title') || {}).innerText || ''),
      dormantBody: document.body.classList.contains('shop--dormant'),
      noLiveInGrid: !/Add to basket/i.test(text),
      noTrending: !document.querySelector('.shop-trending') || getComputedStyle(document.querySelector('.shop-trending')).display === 'none',
      artHidden: !document.querySelector('.shop-art-section') || getComputedStyle(document.querySelector('.shop-art-section')).display === 'none',
      affiliateHidden: !document.querySelector('#shop-affiliate-editorial') || getComputedStyle(document.querySelector('#shop-affiliate-editorial')).display === 'none',
      howDormant: (() => {
        const live = document.querySelector('.shop-how__step [data-when-live]');
        const dorm = document.querySelector('.shop-how__step [data-when-dormant]');
        return dorm ? !dorm.hidden : false;
      })(),
      sticky: !!document.querySelector('.ap-email-cta--sticky.is-visible'),
      pdfOnly: document.body.classList.contains('shop--pdf-only'),
      featuredCount: document.querySelectorAll('#shopc-featured [data-product-id]').length,
      noBundle: !document.querySelector('[data-product-id="reading-poster-bundle"]'),
      hasCompare: !!document.getElementById('shop-compare'),
    };
  });
  rec('shop:dormant-catalogue', shop.dormantTitle && shop.dormantBody && shop.noLiveInGrid && shop.noTrending && shop.artHidden && shop.affiliateHidden && shop.howDormant, JSON.stringify(shop));
  rec('shop:pdf-only', shop.pdfOnly && shop.featuredCount === 2 && shop.noBundle && shop.hasCompare, JSON.stringify(shop));
  rec('shop:no-sticky-cta', !shop.sticky, `stickyVisible=${shop.sticky}`);
  await page.close();
}

// Cosmic story nav clearance
{
  const page = await ctx.newPage();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/cosmic-story.html`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1200);
  const overlap = await page.evaluate(() => {
    const eyebrow = document.querySelector('.cstory-hero__eyebrow');
    const logo = document.querySelector('.navbar__logo, .footer-logo');
    if (!eyebrow) return { ok: false, reason: 'no eyebrow' };
    const e = eyebrow.getBoundingClientRect();
    const nav = document.querySelector('.site-header, .navbar');
    const n = nav ? nav.getBoundingClientRect() : null;
    return { ok: n ? e.top >= n.bottom - 2 : e.top > 60, eyebrowTop: e.top, navBottom: n?.bottom };
  });
  rec('cosmic-story:nav-clearance', overlap.ok, JSON.stringify(overlap));
  await page.close();
}

// ap-enchanted on inner page via ap-page-boot
{
  const page = await ctx.newPage();
  await page.goto(`${BASE}/cosmic-story.html`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(800);
  const enchanted = await page.evaluate(() => document.documentElement.classList.contains('ap-enchanted'));
  rec('inner:ap-enchanted', enchanted, `class=${enchanted}`);
  await page.close();
}

// Unified nav on tool pages (renderNav rebuilds from NAV_PRIMARY)
{
  const page = await ctx.newPage();
  await page.goto(`${BASE}/chart.html`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1500);
  const nav = await page.evaluate(() => {
    const links = [...document.querySelectorAll('.navbar__nav .navbar__link')]
      .map((a) => a.textContent.trim());
    return {
      labels: links,
      hasReadings: links.includes('Readings'),
      hasLibrary: links.includes('Library'),
      noHome: !links.includes('Home'),
      noMatch: !links.includes('Match'),
    };
  });
  rec(
    'nav:unified-vocab',
    nav.hasReadings && nav.hasLibrary && nav.noHome && nav.noMatch,
    JSON.stringify(nav),
  );
  await page.close();
}

// AI panels on transits, horoscope, ephemeris, cosmic-story
for (const spec of [
  { id: 'transits', path: '/transits.html', host: 'transits-ai-panel', wait: 6000, titleRe: /transit/i },
  { id: 'horoscope', path: '/horoscope.html', host: 'horoscope-ai-panel', wait: 3000, titleRe: /sky|horoscope|plain/i },
  { id: 'ephemeris', path: '/ephemeris.html', host: 'ephemeris-ai-panel', wait: 4000, titleRe: /sky|tonight/i },
  { id: 'cosmic-story', path: '/cosmic-story.html', host: 'cosmic-story-ai-panel', wait: 3500, titleRe: /story|deeper/i },
  { id: 'compatibility', path: '/compatibility.html', host: 'compatibility-ai-panel', wait: 4000, titleRe: /match/i },
  { id: 'synastry', path: '/synastry.html', host: 'synastry-ai-panel', wait: 4000, titleRe: /synastry/i },
  { id: 'lifepath', path: '/lifepath.html', host: 'lifepath-ai-panel', wait: 4500, titleRe: /numbers|context/i },
  { id: 'profile', path: '/profile.html', host: 'profile-ai-panel', wait: 4500, titleRe: /dashboard|cosmic/i },
  { id: 'moonphase', path: '/moonphase.html', host: 'moonphase-ai-panel', wait: 4500, titleRe: /moon/i },
]) {
  const page = await ctx.newPage();
  await page.goto(`${BASE}${spec.path}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(spec.wait);
  const ai = await page.evaluate((hostId) => {
    const el = document.getElementById(hostId);
    const title = el ? (el.querySelector('.ap-ai-panel__title') || {}).textContent || '' : '';
    return {
      host: !!el,
      mounted: !!(el && el.classList.contains('ap-ai-panel')),
      chips: el ? el.querySelectorAll('.ap-ai-chip').length : 0,
      title,
    };
  }, spec.host);
  const pageAware = spec.titleRe.test(ai.title || '');
  rec(`${spec.id}:ai-panel`, ai.host && ai.mounted && ai.chips >= 3 && pageAware, JSON.stringify(ai));
  await page.close();
}

await browser.close();

const fails = results.filter((r) => !r.pass).length;
for (const r of results) console.log(`${r.pass ? '✓' : '✗'} ${r.name} — ${r.detail}`);
console.log(`\n${results.length - fails}/${results.length} checks passed`);
process.exit(fails ? 1 : 0);