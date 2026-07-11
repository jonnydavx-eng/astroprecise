/**
 * v581 home-story verification: load homepage at 1440x900 + 390x844, scroll
 * through, assert zero console/page errors, then check the story-spine work:
 *   - masthead contents-nav = the 6 unified labels → correct hrefs
 *   - #instrumentsChapter is an <ol> path (Sky→Signs→Chart→Daily→Deep Reading)
 *     with a .dept-list-next step line on every row
 *   - spine bridge lines present (.ap-spine-bridge)
 *   - NO "Bestseller" / rating / user-count badge anywhere
 *   - no firm price implies immediate purchase (shop prices say "opening soon")
 *   - beginner glosses (abbr.ap-gloss) present and have titles
 *   - contract structure intact (.ap-chapter, #skyChapter plate, .ap-shop-trust)
 * Shots → out/redesign/home-story-*.png
 * Usage: node verify-home-story.mjs [baseUrl]
 */
import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = process.argv[2] || 'http://localhost:8790';
const OUT = join(__dirname, 'out', 'redesign');

const EXPECTED_NAV = [
  { label: 'Chart', href: 'chart.html' },
  { label: 'Sky', href: 'ephemeris.html' },
  { label: 'Daily', href: 'horoscope.html' },
  { label: 'Readings', href: 'cosmic-story.html' },
  { label: 'Library', href: 'aries.html' },
  { label: 'Shop', href: 'shop.html' },
];

const RUNS = [
  { id: 'home-story-desktop', vp: { width: 1440, height: 900 } },
  { id: 'home-story-mobile', vp: { width: 390, height: 844 } },
];

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  let failures = 0;

  for (const run of RUNS) {
    const context = await browser.newContext({ viewport: run.vp, colorScheme: 'dark' });
    const page = await context.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    const url = `${BASE}/?nocache=${Date.now()}`;
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    } catch (e) {
      console.log(`${run.id}: goto fallback (${String(e.message).slice(0, 70)})`);
    }
    await page.waitForTimeout(2500);

    await page.evaluate(async () => {
      const step = window.innerHeight;
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 260));
      }
      window.scrollTo(0, document.body.scrollHeight);
      await new Promise((r) => setTimeout(r, 500));
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(1500);

    const report = await page.evaluate(() => {
      const nav = [...document.querySelectorAll('.masthead .contents-nav a')].map((a) => ({
        label: a.textContent.trim(),
        href: a.getAttribute('href'),
      }));

      const ol = document.querySelector('#instrumentsChapter ol.dept-list');
      const steps = [...document.querySelectorAll('#instrumentsChapter .dept-list-item')].map((a) => ({
        title: a.querySelector('.dept-title')?.textContent.trim() || '',
        href: a.getAttribute('href'),
        hasNext: !!a.querySelector('.dept-list-next'),
        badge: a.querySelector('.dept-badge')?.textContent.trim() || '',
      }));

      const bridges = [...document.querySelectorAll('.ap-spine-bridge')].map((p) => p.textContent.trim().slice(0, 60));

      const bodyText = document.body.innerText;
      const bestseller = /bestseller/i.test(bodyText);
      const ratingWords = /\b(\d[\d,.]*\s*(reviews|ratings|users|customers|sold)|★|out of 5|\d\.\d\s*stars)\b/i.test(bodyText);

      const shopPrices = [...document.querySelectorAll('#shopChapter .ap-shop-featured__price')].map((s) => s.textContent.trim());

      const glosses = [...document.querySelectorAll('abbr.ap-gloss')].map((a) => ({
        term: a.textContent.trim(),
        hasTitle: !!a.getAttribute('title') && a.getAttribute('title').length > 8,
      }));
      const glossTermsMissingTitle = glosses.filter((g) => !g.hasTitle).map((g) => g.term);

      return {
        nav,
        instrumentsIsOl: !!ol,
        steps,
        bridges,
        bestseller,
        ratingWords,
        shopPrices,
        glossCount: glosses.length,
        glossTerms: [...new Set(glosses.map((g) => g.term))],
        glossTermsMissingTitle,
        // contract structure
        apChapters: document.querySelectorAll('.ap-chapter').length,
        skyPlate: document.querySelectorAll('#skyChapter .plate').length,
        shopTrust: document.querySelectorAll('.ap-shop-trust').length,
        signTiles: document.querySelectorAll('.sign-tile').length,
        revealTotal: document.querySelectorAll('.ap-reveal').length,
        revealed: document.querySelectorAll('.ap-reveal.ap-revealed').length,
      };
    });

    const shot = join(OUT, `${run.id}.png`);
    await page.screenshot({ path: shot, fullPage: true });

    console.log(`\n=== ${run.id} (${run.vp.width}x${run.vp.height}) ===`);

    // Nav
    const navOk = report.nav.length === EXPECTED_NAV.length &&
      EXPECTED_NAV.every((e, i) => report.nav[i] && report.nav[i].label === e.label && report.nav[i].href === e.href);
    console.log(`nav (${report.nav.length}): ${report.nav.map((n) => n.label + '→' + n.href).join(' · ')}`);
    if (!navOk) { console.log('  NAV MISMATCH — expected: ' + EXPECTED_NAV.map((e) => e.label + '→' + e.href).join(' · ')); failures++; }

    // Instruments path
    const expectedTitles = ["Tonight's sky", 'The twelve signs', 'Your chart', 'Your daily sky', 'The Deep Reading'];
    const titlesOk = report.steps.length === 5 && expectedTitles.every((t, i) => report.steps[i]?.title === t);
    const allHaveNext = report.steps.every((s) => s.hasNext);
    console.log(`instruments <ol>: ${report.instrumentsIsOl ? 'yes' : 'NO'} | steps: ${report.steps.map((s) => s.title + (s.hasNext ? '' : ' [no-next]')).join(' → ')}`);
    console.log(`  step hrefs: ${report.steps.map((s) => s.href).join(', ')}`);
    if (!report.instrumentsIsOl || !titlesOk) { console.log('  INSTRUMENTS ORDER WRONG — expected ' + expectedTitles.join(' → ')); failures++; }
    if (!allHaveNext) { console.log('  SOME STEPS MISSING .dept-list-next'); failures++; }
    // Deep Reading step must point to shop.html#deep-reading
    const deepStep = report.steps.find((s) => s.title === 'The Deep Reading');
    if (deepStep && deepStep.href !== 'shop.html#deep-reading') { console.log('  DEEP READING href wrong: ' + deepStep.href); failures++; }

    // Bridges
    console.log(`spine bridges (${report.bridges.length}): ${report.bridges.map((b) => '“' + b + '…”').join(' | ')}`);
    if (report.bridges.length < 4) { console.log('  EXPECTED >=4 spine bridges'); failures++; }

    // Honesty
    console.log(`bestseller present: ${report.bestseller} | rating/count words: ${report.ratingWords}`);
    if (report.bestseller) { console.log('  FAIL: "Bestseller" still present'); failures++; }
    if (report.ratingWords) { console.log('  FAIL: rating/user-count language present'); failures++; }

    // Prices — every visible shop price must be gated ("opening soon"), never a bare buyable price
    console.log(`shop prices: ${report.shopPrices.join(' | ')}`);
    const barePrice = report.shopPrices.filter((p) => /£\d/.test(p) && !/opening soon/i.test(p));
    if (barePrice.length) { console.log('  FAIL: firm price implies purchase: ' + barePrice.join(', ')); failures++; }

    // Glosses
    console.log(`glosses (${report.glossCount}): ${report.glossTerms.join(', ')}`);
    if (report.glossTermsMissingTitle.length) { console.log('  FAIL: glosses missing title: ' + report.glossTermsMissingTitle.join(', ')); failures++; }
    if (report.glossCount < 8) { console.log('  WARN: fewer glosses than expected'); }

    // Contract structure
    console.log(`ap-chapters: ${report.apChapters} | #skyChapter plate: ${report.skyPlate} | .ap-shop-trust: ${report.shopTrust} | sign tiles: ${report.signTiles}`);
    if (report.apChapters < 8 || report.skyPlate < 1 || report.shopTrust < 1 || report.signTiles !== 12) { console.log('  FAIL: contract structure incomplete'); failures++; }

    console.log(`reveals: ${report.revealed}/${report.revealTotal} | console errors: ${consoleErrors.length} | page errors: ${pageErrors.length}`);
    const errs = [...pageErrors, ...consoleErrors];
    if (errs.length) { errs.slice(0, 6).forEach((e) => console.log('  ERR: ' + e.slice(0, 200))); failures++; }
    console.log(`screenshot: ${shot}`);
    await context.close();
  }

  await browser.close();
  console.log(failures ? `\nFAILURES: ${failures}` : '\nALL CHECKS PASSED');
  process.exit(failures ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
