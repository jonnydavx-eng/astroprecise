/* Wave-1 gate — sample-reading.html must not overflow a 390px phone.
 * Run from repo root: node tools/visual-check/_wave1-mobile-check.mjs
 */
import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:8790';
const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 390, height: 844 } });
await page.goto(BASE + '/sample-reading.html', { waitUntil: 'load' });
await page.waitForTimeout(600);
const sw = await page.evaluate(() => document.scrollingElement.scrollWidth);
const ok = sw <= 391;
console.log(`${ok ? 'PASS' : 'FAIL'}  sample-reading 390px scrollWidth = ${sw}`);
// bonus: CTA band visible on screen media
const cta = await page.locator('.sample-cta').count();
console.log(`${cta === 1 ? 'PASS' : 'FAIL'}  .sample-cta present (count=${cta})`);
await b.close();
process.exit(ok && cta === 1 ? 0 : 1);
