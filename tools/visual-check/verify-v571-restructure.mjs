/**
 * v571 restructure verification: load homepage at 1440x900 + 390x844,
 * scroll through, assert zero console/page errors, measure scrollHeight,
 * check float-nav anchors resolve, count teaser .sg-card, full-page shots.
 * Usage: node verify-v571-restructure.mjs [baseUrl]
 */
import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = process.argv[2] || 'http://localhost:8790';
const OUT = join(__dirname, 'out', 'redesign');

const RUNS = [
  { id: 'home-restructured', vp: { width: 1440, height: 900 } },
  { id: 'home-restructured-mobile', vp: { width: 390, height: 844 } },
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
    await page.waitForTimeout(3000);

    // Scroll through the full page (triggers lazy loads + .ap-reveal observer)
    await page.evaluate(async () => {
      const step = window.innerHeight;
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 300));
      }
      window.scrollTo(0, document.body.scrollHeight);
      await new Promise((r) => setTimeout(r, 600));
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(1800);

    const report = await page.evaluate(() => {
      const navLinks = [...document.querySelectorAll('#apFloatNav [data-ap-jump]')].map((a) => {
        const id = a.dataset.apJump;
        return { id, resolves: !!document.getElementById(id) };
      });
      const revealTotal = document.querySelectorAll('.ap-reveal').length;
      const revealed = document.querySelectorAll('.ap-reveal.ap-revealed').length;
      return {
        scrollHeight: document.body.scrollHeight,
        navLinks,
        deletedIds: ['trustChapter', 'whyChapter', 'readingChapter'].filter((id) => document.getElementById(id)),
        keptIds: ['heroChapter', 'skyChapter', 'compareChapter', 'methodChapter', 'instrumentsChapter',
          'skyGuidesWrap', 'libraryChapter', 'qaChapter', 'shopChapter'].filter((id) => !document.getElementById(id)),
        sgMode: document.getElementById('skyGuidesWrap')?.dataset.sgMode || '(none)',
        sgCards: document.querySelectorAll('#skyGuidesOut .sg-card').length,
        sgHero: document.querySelectorAll('#skyGuidesHero .sg-hero, #skyGuidesHero [class*="sg-hero"]').length,
        signTiles: document.querySelectorAll('.sign-tile').length,
        qaItems: document.querySelectorAll('.qa-item').length,
        miniTrust: document.querySelectorAll('.ap-mini-trust').length,
        shopTrust: document.querySelectorAll('.ap-shop-trust').length,
        chipLabels: ['cs-label-moon', 'cs-label-sun', 'cs-label-venus', 'cs-label-mars']
          .map((id) => document.getElementById(id)?.textContent?.trim() || '(missing)'),
        revealTotal,
        revealed,
      };
    });

    const shot = join(OUT, `${run.id}.png`);
    await page.screenshot({ path: shot, fullPage: true });

    const badNav = report.navLinks.filter((l) => !l.resolves);
    const errs = [...pageErrors, ...consoleErrors];
    console.log(`\n=== ${run.id} (${run.vp.width}x${run.vp.height}) ===`);
    console.log(`scrollHeight: ${report.scrollHeight}`);
    console.log(`float-nav anchors: ${report.navLinks.map((l) => l.id + (l.resolves ? '' : ' [MISSING]')).join(', ')}`);
    console.log(`deleted ids still present: ${report.deletedIds.length ? report.deletedIds.join(',') : 'none (good)'}`);
    console.log(`kept ids missing: ${report.keptIds.length ? report.keptIds.join(',') : 'none (good)'}`);
    console.log(`sg-mode: ${report.sgMode} | sg-cards: ${report.sgCards} | hero slot nodes: ${report.sgHero}`);
    console.log(`sign tiles: ${report.signTiles} | qa items: ${report.qaItems} | mini-trust: ${report.miniTrust} | shop-trust: ${report.shopTrust}`);
    console.log(`planet chips: ${report.chipLabels.join(' | ')}`);
    console.log(`reveals: ${report.revealed}/${report.revealTotal} revealed after scroll`);
    console.log(`console errors: ${consoleErrors.length} | page errors: ${pageErrors.length}`);
    if (errs.length) { errs.slice(0, 6).forEach((e) => console.log('  ERR: ' + e.slice(0, 200))); failures++; }
    if (badNav.length || report.deletedIds.length || report.keptIds.length) failures++;
    console.log(`screenshot: ${shot}`);
    await context.close();
  }

  await browser.close();
  console.log(failures ? `\nFAILURES: ${failures}` : '\nALL CHECKS PASSED');
  process.exit(failures ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
