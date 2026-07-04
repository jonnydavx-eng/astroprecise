/**
 * Product-graphics overhaul verification.
 * Loads shop.html + the homepage shop chapter, asserts zero console/page errors,
 * confirms the regenerated product images actually load (naturalWidth > 0), and
 * writes cropped screenshots of the new hero art to out/redesign/product-*.png.
 * Usage: node verify-shop-product-art.mjs [baseUrl]
 */
import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = process.argv[2] || 'http://localhost:8790';
const OUT = join(__dirname, 'out', 'redesign');

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: 'dark' });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const badImages = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  page.on('response', (r) => {
    const u = r.url();
    if (u.includes('/img/shop/') && r.status() >= 400) badImages.push(`${r.status()} ${u}`);
  });

  // ---- SHOP PAGE ----
  await page.goto(`${BASE}/shop.html`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1200);
  // force lazy images to load
  await page.evaluate(async () => {
    for (const img of document.querySelectorAll('img[data-src]')) {
      if (img.dataset.src) img.src = img.dataset.src;
    }
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise((r) => setTimeout(r, 400));
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(1500);

  // Collect load state of every shop product/cat image
  const imgReport = await page.evaluate(() => {
    const out = [];
    for (const img of document.querySelectorAll('img[src*="/img/shop/"]')) {
      out.push({
        src: img.getAttribute('src'),
        nw: img.naturalWidth,
        nh: img.naturalHeight,
        complete: img.complete,
      });
    }
    return out;
  });
  const broken = imgReport.filter((i) => !i.complete || i.nw === 0);
  console.log(`shop.html: ${imgReport.length} shop images, ${broken.length} not-loaded`);
  for (const b of broken) console.log('   BROKEN:', b.src, b.nw);

  // Full-page + targeted crops of the new hero art
  await page.screenshot({ path: join(OUT, 'product-shop-full.png'), fullPage: true });

  const targets = [
    'img[src*="product-deep-reading"]',
    'img[src*="product-natal-poster"]',
    'img[src*="product-sky-tee"]',
    'img[src*="product-mug"]',
    'img[src*="cat-prints"]',
  ];
  for (const sel of targets) {
    const el = page.locator(sel).first();
    try {
      await el.scrollIntoViewIfNeeded({ timeout: 4000 });
      await page.waitForTimeout(300);
      const name = sel.match(/product-[\w-]+|cat-[\w-]+/)[0];
      await el.screenshot({ path: join(OUT, `product-${name}.png`) });
      console.log('   shot:', name);
    } catch (e) {
      console.log('   (skip crop)', sel, String(e).split('\n')[0]);
    }
  }

  // ---- HOMEPAGE SHOP CHAPTER ----
  await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1000);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1500);
  const homeShopImgs = await page.evaluate(() => {
    const out = [];
    for (const img of document.querySelectorAll('img[src*="/img/shop/"]')) {
      out.push({ src: img.getAttribute('src'), nw: img.naturalWidth, complete: img.complete });
    }
    return out;
  });
  const homeBroken = homeShopImgs.filter((i) => !i.complete || i.nw === 0);
  console.log(`index.html shop chapter: ${homeShopImgs.length} shop images, ${homeBroken.length} not-loaded`);
  for (const b of homeBroken) console.log('   BROKEN:', b.src);
  // shot of the shop chapter region
  const shopChapter = page.locator('#shopChapter, .ap-shop-trust, [id*="shop" i]').first();
  try {
    await shopChapter.scrollIntoViewIfNeeded({ timeout: 4000 });
    await page.waitForTimeout(400);
    await shopChapter.screenshot({ path: join(OUT, 'product-home-shop-chapter.png') });
    console.log('   shot: home-shop-chapter');
  } catch (e) {
    await page.screenshot({ path: join(OUT, 'product-home-shop-chapter.png') });
    console.log('   (fallback full) home shop chapter');
  }

  await browser.close();

  console.log('\n=== SUMMARY ===');
  console.log('console errors:', consoleErrors.length);
  consoleErrors.slice(0, 10).forEach((e) => console.log('   E:', e));
  console.log('page errors:', pageErrors.length);
  pageErrors.slice(0, 10).forEach((e) => console.log('   P:', e));
  console.log('http >=400 on shop imgs:', badImages.length);
  badImages.slice(0, 10).forEach((e) => console.log('   H:', e));

  const ok = consoleErrors.length === 0 && pageErrors.length === 0 &&
             broken.length === 0 && homeBroken.length === 0 && badImages.length === 0;
  console.log('\nRESULT:', ok ? 'PASS' : 'FAIL');
  process.exit(ok ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(2); });
