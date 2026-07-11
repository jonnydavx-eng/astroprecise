import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'out', 'redesign');
const BASE = process.env.BASE || 'http://localhost:8790';

const PAGES = [
  { name: 'shop', url: `${BASE}/shop.html` },
  { name: 'catalogue', url: `${BASE}/catalogue.html` },
];
const VIEWPORTS = [
  { tag: 'desktop', width: 1440, height: 900 },
  { tag: 'mobile', width: 390, height: 844 },
];

const results = [];

const browser = await chromium.launch();
for (const p of PAGES) {
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const consoleErrors = [];
    const failed = [];
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', e => consoleErrors.push('pageerror: ' + e.message));
    page.on('response', r => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });
    page.on('requestfailed', r => failed.push(`FAILED ${r.url()} ${r.failure()?.errorText || ''}`));

    await page.goto(p.url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1200);
    // scroll through to trigger lazy images
    await page.evaluate(async () => {
      await new Promise(res => {
        let y = 0; const step = () => { window.scrollBy(0, 900); y += 900;
          if (y < document.body.scrollHeight) setTimeout(step, 90); else res(); }; step();
      });
    });
    await page.waitForTimeout(1200);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);

    // count product images that resolved (naturalWidth>0) vs broken
    const imgStats = await page.evaluate(() => {
      const imgs = [...document.querySelectorAll('img')].filter(i => /\/img\/shop\//.test(i.currentSrc || i.src));
      const broken = imgs.filter(i => i.complete && i.naturalWidth === 0).map(i => i.currentSrc || i.src);
      return { total: imgs.length, broken };
    });

    const file = path.join(OUT, `${p.name}-${vp.tag}.png`);
    await page.screenshot({ path: file, fullPage: true });

    results.push({ page: p.name, vp: vp.tag, consoleErrors, http4xx: failed, shopImgs: imgStats.total, brokenImgs: imgStats.broken, screenshot: file });
    await ctx.close();
  }
}
await browser.close();

for (const r of results) {
  console.log(`\n=== ${r.page} @ ${r.vp} ===`);
  console.log(`  shop images: ${r.shopImgs} · broken: ${r.brokenImgs.length}`);
  if (r.brokenImgs.length) r.brokenImgs.forEach(u => console.log('    BROKEN', u));
  console.log(`  console errors: ${r.consoleErrors.length}`);
  r.consoleErrors.slice(0, 12).forEach(e => console.log('    CE', e));
  console.log(`  4xx/failed responses: ${r.http4xx.length}`);
  r.http4xx.slice(0, 20).forEach(u => console.log('    ', u));
  console.log('  shot:', r.screenshot);
}
const anyBad = results.some(r => r.consoleErrors.length || r.brokenImgs.length || r.http4xx.length);
console.log('\nSUMMARY:', anyBad ? 'ISSUES FOUND' : 'ALL CLEAN');
