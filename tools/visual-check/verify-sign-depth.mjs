/**
 * Verify the layered sign-model depth blocks on 3 regenerated sign pages.
 * Checks: Layer-2 astronomy, Layer-3 Sun/Moon/Rising, Layer-4 closer,
 * element accents, seals (not glyphs), CTA targets, JSON-LD parse,
 * unified 6-label nav, zero console errors, no honesty violations.
 * Usage: node verify-sign-depth.mjs [baseUrl]
 */
import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = process.argv[2] || 'http://localhost:8790';
const OUT = join(__dirname, 'out', 'redesign');
const PAGES = ['aries', 'scorpio', 'pisces'];
const EXPECT_ELEMENT = { aries: 'fire', scorpio: 'water', pisces: 'water' };

let failures = 0;
const ok = (cond, msg) => { console.log((cond ? '  OK  ' : ' FAIL ') + msg); if (!cond) failures++; };

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  for (const sign of PAGES) {
    console.log(`\n=== ${sign}.html ===`);
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'dark' });
    const page = await context.newPage();
    const consoleErrors = [];
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', e => consoleErrors.push('pageerror: ' + e.message));

    await page.goto(`${BASE}/${sign}.html`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2500);

    // Layer 2 — astronomy
    ok(await page.locator('#astronomy-heading').count() === 1, 'Layer-2 astronomy heading present');
    const astroText = (await page.locator('.sign-astro').innerText().catch(() => '')) || '';
    ok(/longitude/i.test(astroText), 'Layer-2 shows ecliptic longitude band');
    ok(/around/i.test(astroText), 'Layer-2 date band softened with "around"');
    ok(/Element[\s\S]*Modality[\s\S]*Ruling Planet[\s\S]*Ecliptic/i.test(astroText), 'Layer-2 has element/modality/ruler/ecliptic');

    // Layer 3 — Sun / Moon / Rising
    const inchartText = (await page.locator('.sign-inchart').innerText().catch(() => '')) || '';
    ok(new RegExp(`Sun in ${sign}`, 'i').test(inchartText), 'Layer-3 Sun placement present');
    ok(new RegExp(`Moon in ${sign}`, 'i').test(inchartText), 'Layer-3 Moon placement present');
    ok(/Rising \(Ascendant\)/i.test(inchartText), 'Layer-3 Rising/Ascendant present');

    // Layer 4 — closer
    const bridgeText = (await page.locator('#bridge-heading').innerText().catch(() => '')) || '';
    ok(/third of the picture/i.test(bridgeText), 'Layer-4 closer heading present');
    ok(await page.locator('.sign-bridge__secondary a[href="shop.html#deep-reading"]').count() === 1, 'Layer-4 Deep Reading → shop.html#deep-reading');
    ok(await page.locator('a.btn--primary.btn--lg[href="chart.html"]').count() >= 1, 'Layer-4 primary CTA → chart.html');

    // Seals not glyphs — engraved marks = .ap-seal SVG imgs (planet/zodiac)
    // + inline engraved <use> icons (element/modality). Every mark must be drawn art.
    const astroSealImgs = await page.locator('.sign-astro .sign-astro__seal .ap-seal img').count();
    const astroEngIcons = await page.locator('.sign-astro .sign-astro__seal svg.eng-i use').count();
    const inchartSeals = await page.locator('.sign-inchart .sign-inchart__seal .ap-seal img').count();
    ok(astroSealImgs >= 2, `Layer-2 planet+zodiac seals rendered as SVG imgs (${astroSealImgs})`);
    ok(astroEngIcons >= 2, `Layer-2 element+modality as engraved <use> icons (${astroEngIcons})`);
    ok(inchartSeals >= 3, `Layer-3 Sun/Moon/zodiac seals rendered as SVG imgs (${inchartSeals})`);
    // No raw unicode zodiac/planet glyphs in the new blocks
    const glyphHit = /[♈♉♊♋♌♍♎♏♐♑♒♓☉☽☿♀♂♃♄♅♆♇]/.test(astroText + inchartText);
    ok(!glyphHit, 'No raw unicode glyphs in Layer-2/3 blocks');

    // Element accent — body data-element correct + accent var resolves
    const bodyElem = await page.getAttribute('body', 'data-element');
    ok(bodyElem === EXPECT_ELEMENT[sign], `body[data-element="${EXPECT_ELEMENT[sign]}"] (got "${bodyElem}")`);
    const accent = await page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--sign-elem').trim());
    ok(/#|rgb/.test(accent), `--sign-elem accent resolves (${accent})`);

    // Nav — unified 6 labels
    const navLabels = await page.locator('.navbar__nav a.navbar__link').allInnerTexts();
    const set = navLabels.map(t => t.trim().toLowerCase());
    const wanted = ['chart', 'sky', 'daily', 'readings', 'library', 'shop'];
    const hasAll = wanted.every(w => set.includes(w));
    ok(hasAll, `Nav has unified 6 labels (${wanted.join('/')} present: ${hasAll})`);

    // JSON-LD parse
    const ldOk = await page.evaluate(() => {
      const s = [...document.querySelectorAll('script[type="application/ld+json"]')];
      try { s.forEach(x => JSON.parse(x.textContent)); return s.length; } catch (e) { return -1; }
    });
    ok(ldOk >= 3, `JSON-LD blocks parse (${ldOk})`);

    // Honesty — rendered page text
    const pageText = await page.evaluate(() => document.body.innerText);
    ok(!/arcsecond/i.test(pageText), 'No "arcsecond" in rendered text');
    ok(!/\bdozens\b/i.test(pageText), 'No "dozens" in rendered text');

    // Console
    ok(consoleErrors.length === 0, `Zero console errors (${consoleErrors.length})` + (consoleErrors.length ? ': ' + consoleErrors.slice(0, 3).join(' | ') : ''));

    // Screenshot the depth blocks
    const file = join(OUT, `sign-depth-${sign}.png`);
    await page.locator('#astronomy-heading').scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(400);
    await page.screenshot({ path: file, fullPage: true });
    console.log(`  shot: ${file}`);
    await context.close();
  }
  await browser.close();
  console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'}`);
  process.exit(failures === 0 ? 0 : 1);
}
main().catch(e => { console.error(e); process.exit(1); });
