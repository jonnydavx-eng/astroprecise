/**
 * AstroPrecise — automated 0–100 page scores (25 core pages).
 * Run: node tools/visual-check/site-score.mjs [baseUrl]
 */
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = process.argv[2] || process.env.BASE || 'http://localhost:8790';
const OUT = join(__dirname, 'out', 'site-score');

const PAGES = [
  { id: 'index', path: '/', weight: 1.3, ai: false },
  { id: 'chart', path: '/chart.html', weight: 1.2, ai: true },
  { id: 'horoscope', path: '/horoscope.html', weight: 1.1, ai: true },
  { id: 'transits', path: '/transits.html', weight: 1.0, ai: true },
  { id: 'ephemeris', path: '/ephemeris.html', weight: 1.0, ai: true },
  { id: 'compatibility', path: '/compatibility.html', weight: 1.0, ai: true },
  { id: 'synastry', path: '/synastry.html', weight: 0.9, ai: true },
  { id: 'shop', path: '/shop.html', weight: 1.1, ai: false, shop: true },
  { id: 'cosmic-story', path: '/cosmic-story.html', weight: 0.95, ai: true },
  { id: 'lifepath', path: '/lifepath.html', weight: 0.85, ai: true },
  { id: 'profile', path: '/profile.html', weight: 0.8, ai: true },
  { id: 'charts', path: '/charts.html', weight: 0.75, ai: false },
  { id: 'guides', path: '/guides.html', weight: 0.75, ai: false },
  { id: 'moonphase', path: '/moonphase.html', weight: 0.8, ai: true },
  { id: 'retrograde', path: '/retrograde.html', weight: 0.75, ai: false },
  { id: 'saturn-return', path: '/saturn-return.html', weight: 0.8, ai: false },
  { id: 'solar-return', path: '/solar-return.html', weight: 0.75, ai: false },
  { id: 'name-numerology', path: '/name-numerology.html', weight: 0.7, ai: false },
  { id: 'angel-numbers', path: '/angel-numbers.html', weight: 0.7, ai: false },
  { id: 'this-weeks-sky', path: '/this-weeks-sky.html', weight: 0.75, ai: false },
  { id: 'tonight', path: '/tonight.html', weight: 0.8, ai: false },
  { id: 'accuracy', path: '/accuracy.html', weight: 0.7, ai: false },
  { id: 'rising-sign', path: '/what-is-my-rising-sign.html', weight: 0.75, ai: false },
  { id: 'why', path: '/why.html', weight: 0.75, ai: false },
  { id: 'quiz', path: '/quiz.html', weight: 0.65, ai: false },
  { id: 'leo', path: '/leo.html', weight: 0.7, ai: false, signPage: true },
];

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function scorePage(metrics, spec) {
  let s = 100;
  if (!metrics.hasMain) s -= 12;
  if (!metrics.hasH1) s -= 8;
  if (!metrics.hasMetaDesc) s -= 4;
  if (!metrics.hasNav) s -= 10;
  if (metrics.navUnified === false) s -= 8;
  if (metrics.consoleErrors > 0) s -= clamp(metrics.consoleErrors * 4, 4, 20);
  if (metrics.axeSerious > 0) s -= clamp(metrics.axeSerious * 3, 3, 24);
  if (metrics.axeModerate > 0) s -= clamp(metrics.axeModerate * 1.5, 2, 12);
  if (metrics.footerStripBroken) s -= 6;
  if (spec.ai && !metrics.aiMounted && !metrics.aiHost) s -= 10;
  if (spec.ai && !metrics.aiMounted && metrics.aiHost) s -= 2;
  if (spec.ai && metrics.aiMounted && !metrics.aiPageAware) s -= 3;
  if (spec.shop && metrics.shopDormantLie) s -= 18;
  if (spec.shop && metrics.shopTrendingWhenDormant) s -= 4;
  if (spec.shop && metrics.shopAffiliateWhenDormant) s -= 6;
  if (!metrics.apEnchanted && !spec.signPage) s -= 3;
  if (!metrics.hasPolish && !spec.signPage) s -= 2;
  return clamp(Math.round(s), 0, 100);
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await ctx.addInitScript(() => {
  try {
    sessionStorage.setItem('ap_intro_complete', '1');
    localStorage.setItem('ap_privacy_ack', '1');
  } catch (_) {}
});

const rows = [];

for (const spec of PAGES) {
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  const metrics = {
    hasMain: false,
    hasH1: false,
    hasMetaDesc: false,
    hasNav: false,
    navUnified: null,
    consoleErrors: 0,
    axeSerious: 0,
    axeModerate: 0,
    footerStripBroken: false,
    aiMounted: false,
    aiPageAware: false,
    aiHost: false,
    shopDormantLie: false,
    shopTrendingWhenDormant: false,
    shopAffiliateWhenDormant: false,
    apEnchanted: false,
    hasPolish: false,
    aiTitle: '',
  };

  try {
    await page.goto(`${BASE}${spec.path}`, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(spec.ai ? 5000 : 2200);

    const dom = await page.evaluate((pageId) => {
      const strip = document.querySelector('.footer-zodiac-strip');
      const stripRect = strip ? strip.getBoundingClientRect() : null;
      const navLinks = [...document.querySelectorAll('.navbar__nav .navbar__link')].map((a) => a.textContent.trim());
      const homeNav = [...document.querySelectorAll('.contents-nav a, .masthead .contents-nav a')].map((a) => a.textContent.trim());
      const aiEl = document.querySelector('.ap-ai-panel');
      const aiTitle = aiEl ? (aiEl.querySelector('.ap-ai-panel__title') || {}).textContent || '' : '';
      const hostIds = [
        'chart-ai-panel', 'transits-ai-panel', 'horoscope-ai-panel', 'ephemeris-ai-panel',
        'cosmic-story-ai-panel', 'compatibility-ai-panel', 'synastry-ai-panel',
      ];
      const aiHost = hostIds.some((id) => !!document.getElementById(id));
      const grid = document.getElementById('shopc-grid');
      const gridText = grid ? grid.innerText : '';
      const dormant = document.body.classList.contains('shop--dormant');
      const trending = document.querySelector('.shop-trending');
      const affiliate = document.querySelector('#shop-affiliate-editorial');
      const polish = document.getElementById('ap-css-site-polish') || [...document.styleSheets].some((s) => (s.href || '').includes('ap-site-polish'));
      return {
        hasMain: !!document.querySelector('main, #main-content'),
        hasH1: !!document.querySelector('h1'),
        hasMetaDesc: !!document.querySelector('meta[name="description"]')?.content,
        hasNav: navLinks.length >= 4 || homeNav.length >= 4,
        navUnified: navLinks.length
          ? navLinks.includes('Readings') && navLinks.includes('Library') && !navLinks.includes('Home')
          : homeNav.length >= 4,
        footerStripBroken: stripRect ? stripRect.height > 400 : false,
        apEnchanted: document.documentElement.classList.contains('ap-enchanted') || document.body.classList.contains('ap-enchanted'),
        hasPolish: !!polish,
        aiMounted: !!aiEl,
        aiHost,
        aiTitle,
        shopDormant: dormant,
        shopDormantLie: dormant && /Add to basket/i.test(gridText),
        shopTrendingWhenDormant: dormant && trending && trending.offsetParent !== null,
        shopAffiliateWhenDormant: dormant && affiliate && getComputedStyle(affiliate).display !== 'none',
        pageId,
      };
    }, spec.id);

    Object.assign(metrics, dom);
    metrics.consoleErrors = errors.filter((e) => !/favicon|404.*texture|noaa|swpc/i.test(e)).length;

    if (metrics.aiMounted && metrics.aiTitle) {
      const expected = {
        chart: /chart/i,
        horoscope: /sky|horoscope|plain/i,
        transits: /transit/i,
        ephemeris: /sky|tonight/i,
        'cosmic-story': /story|deeper/i,
        compatibility: /match/i,
        synastry: /synastry/i,
      };
      const re = expected[spec.id];
      metrics.aiPageAware = re ? re.test(metrics.aiTitle) : true;
    }

    try {
      const axe = await new AxeBuilder({ page }).withTags(['wcag2aa']).analyze();
      metrics.axeSerious = axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').length;
      metrics.axeModerate = axe.violations.filter((v) => v.impact === 'moderate').length;
    } catch (_) {}
  } catch (e) {
    metrics.consoleErrors += 1;
    metrics.error = e.message;
  }

  rows.push({
    id: spec.id,
    path: spec.path,
    weight: spec.weight,
    score: scorePage(metrics, spec),
    metrics,
  });
  await page.close();
}

await browser.close();

rows.sort((a, b) => a.score - b.score);
const weighted = rows.reduce((acc, r) => acc + r.score * r.weight, 0) / rows.reduce((a, r) => a + r.weight, 0);

await mkdir(OUT, { recursive: true });
const report = {
  base: BASE,
  capturedAt: new Date().toISOString(),
  siteAverage: Math.round(weighted),
  pageCount: rows.length,
  pages: rows,
};
await writeFile(join(OUT, 'scores.json'), JSON.stringify(report, null, 2));

console.log('\nAstroPrecise site scores (/100) — ' + rows.length + ' pages\n');
for (const r of rows) {
  const flags = [];
  if (r.metrics.shopDormantLie) flags.push('shop-lie');
  if (r.metrics.shopAffiliateWhenDormant) flags.push('affiliate');
  if (specAiMissing(r)) flags.push('no-ai');
  if (r.metrics.axeSerious) flags.push(`axe:${r.metrics.axeSerious}`);
  if (r.metrics.footerStripBroken) flags.push('footer-strip');
  if (!r.metrics.hasPolish) flags.push('no-polish');
  console.log(`${String(r.score).padStart(3)}  ${r.id.padEnd(18)} ${flags.join(' ') || 'ok'}`);
}
console.log(`\nSite average (weighted): ${report.siteAverage}/100`);
console.log(`Report: ${join(OUT, 'scores.json')}`);

function specAiMissing(r) {
  const spec = PAGES.find((p) => p.id === r.id);
  return spec?.ai && !r.metrics.aiMounted && !r.metrics.aiHost;
}

const low = rows.filter((r) => r.score < 85);
process.exit(low.length > 2 ? 1 : 0);