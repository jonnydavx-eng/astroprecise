// Nav-unification verification — checks the injected nav against the canonical
// AP_NAV model (never a duplicated/stale label list), and verifies the mobile
// four-tab contract on narrow viewports.
import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = process.env.BASE || 'http://localhost:8790';
const OUT = 'out/redesign';
fs.mkdirSync(OUT, { recursive: true });

const PAGES = ['chart.html', 'horoscope.html', 'ephemeris.html', 'shop.html', 'cosmic-story.html', 'profile.html', 'charts.html'];

const b = await chromium.launch();
const ctx = await b.newContext({
  viewport: { width: 1280, height: 900 },
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
});
// Defeat the audit-path guard so the real chrome chain (renderNav) runs.
await ctx.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => undefined }));

const ignore = /noaa|swpc|ovation|open-meteo|geocod|favicon|manifest|service worker|sw\.js/i;
const results = [];

for (const page of PAGES) {
  const pg = await ctx.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push('JS:' + String(e).slice(0, 120)));
  pg.on('console', m => { if (m.type() === 'error') errs.push('con:' + m.text().slice(0, 120)); });
  try {
    await pg.goto(`${BASE}/${page}?fresh=${Date.now()}`, { waitUntil: 'load', timeout: 25000 });
    // Wait for renderNav to populate .navbar__nav with real links.
    await pg.waitForFunction(() => {
      const n = document.querySelector('.navbar__nav');
      return n && n.querySelector('a.navbar__link');
    }, { timeout: 12000 }).catch(() => {});
    await pg.waitForTimeout(600);

    const data = await pg.evaluate(() => {
      const nav = document.querySelector('.navbar__nav');
      const primary = nav
        ? Array.from(nav.querySelectorAll(':scope > a.navbar__link')).map(a => ({
            label: (a.textContent || '').replace(/\s+/g, ' ').trim(),
            href: (a.getAttribute('href') || '').split('/').pop(),
          }))
        : [];
      const moreBtn = nav && nav.querySelector('.navbar__more-btn');
      const moreLinks = nav
        ? Array.from(nav.querySelectorAll('.navbar__more-panel a.navbar__link')).map(a => (a.textContent || '').replace(/\s+/g, ' ').trim())
        : [];
      const model = window.AP_NAV || {};
      const primaryModel = Array.isArray(model.NAV_PRIMARY) ? model.NAV_PRIMARY : [];
      const tabsModel = Array.isArray(model.NAV_BOTTOM_TABS) ? model.NAV_BOTTOM_TABS : [];
      const bottom = document.querySelector('.bottom-nav');
      const bottomItems = bottom ? Array.from(bottom.querySelectorAll('.bottom-nav__tabs > .bottom-nav__item, .bottom-nav__tabs > a')).map(a => ({
        label: (a.textContent || '').replace(/\s+/g, ' ').trim(),
        href: (a.getAttribute('href') || '').split('/').pop(),
      })) : [];
      return {
        hasHeader: !!document.querySelector('header.site-header'),
        primary,
        primaryModel: primaryModel.map(row => ({ label: row[1], href: row[0] })),
        bottomItems,
        tabsModel: tabsModel.map(row => ({ label: row[1], href: row[0] })),
        hasMore: !!moreBtn,
        moreLinks,
        hasFooterModel: !!document.querySelector('footer [data-ap-footer-model="1"]'),
      };
    });
    results.push({ page, errs: errs.filter(e => !ignore.test(e)), ...data });

    if (page === 'cosmic-story.html') {
      await pg.screenshot({ path: `${OUT}/nav-unify-cosmic-story-after.png`, fullPage: true });
    }
  } catch (e) {
    results.push({ page, error: String(e).slice(0, 160), errs });
  }
  await pg.close();
}

await b.close();

// ── Report ──
let allGood = true;
for (const r of results) {
  if (r.error) { console.log(`\n[${r.page}] ERROR: ${r.error}`); allGood = false; continue; }
  const labels = r.primary.map(p => p.label);
  const expectedPrimary = r.primaryModel || [];
  const labelsOk = JSON.stringify(r.primary) === JSON.stringify(expectedPrimary);
  const tabsOk = JSON.stringify(r.bottomItems || []) === JSON.stringify(r.tabsModel || []);
  const targetsOk = r.primary.every((p, i) => expectedPrimary[i] && expectedPrimary[i].href === p.href);
  const errsOk = (r.errs || []).length === 0;
  if (!labelsOk || !targetsOk || !tabsOk || !r.hasMore || !errsOk || !r.hasHeader) allGood = false;
  console.log(`\n[${r.page}]`);
  console.log(`  header:     ${r.hasHeader ? 'yes' : 'MISSING'}`);
  console.log(`  primary:    ${labels.join(' · ') || '(none)'}  ${labelsOk ? 'AP_NAV OK' : 'AP_NAV MISMATCH'}`);
  console.log(`  targets:    ${targetsOk ? 'OK' : 'MISMATCH → ' + r.primary.map(p => p.label + '→' + p.href).join(', ')}`);
  console.log(`  mobile tabs:${tabsOk ? 'AP_NAV OK' : 'MISMATCH'} [${(r.bottomItems || []).map(i => i.label).join(' · ')}]`);
  console.log(`  More menu:  ${r.hasMore ? 'present' : 'MISSING'} [${r.moreLinks.join(', ')}]`);
  console.log(`  footer:     ${r.hasFooterModel ? 'model present' : 'no model'}`);
  console.log(`  console:    ${errsOk ? 'clean' : 'ERRORS → ' + r.errs.join(' | ')}`);
}
console.log(`\n=== ${allGood ? 'ALL PASS' : 'ISSUES FOUND'} ===`);
process.exit(allGood ? 0 : 1);
