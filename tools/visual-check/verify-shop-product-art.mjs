/**
 * Verify the three AstroPrecise Studio v901 self-commission covers in the
 * rendered shop. Captures proof crops and rejects missing, dim, flat, wrongly
 * sized or gift-only artwork.
 * Usage: node verify-shop-product-art.mjs [baseUrl]
 */
import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const BASE = process.argv[2] || 'http://localhost:8790';
const OUT = join(__dirname, 'out', 'studio-v901');
const PRODUCTS = [
  { file: 'natal-sky-print-pack.webp', alt: /fictional sample.*Natal Sky Print Pack/i },
  { file: 'personal-sky-keepsake.webp', alt: /fictional sample.*Personal Sky Keepsake/i },
  { file: 'whole-sky-edition.webp', alt: /fictional sample.*Whole Sky Edition/i },
];

async function localMetrics(file) {
  const path = join(ROOT, 'website', 'img', 'shop', 'v901', file);
  const { data, info } = await sharp(path)
    .resize({ width: 256, height: 144, fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let sum = 0;
  let sumSquares = 0;
  let chroma = 0;
  const histogram = new Uint32Array(256);
  for (let offset = 0; offset < data.length; offset += info.channels) {
    const red = data[offset];
    const green = data[offset + 1];
    const blue = data[offset + 2];
    const luma = Math.round(.2126 * red + .7152 * green + .0722 * blue);
    sum += luma;
    sumSquares += luma * luma;
    chroma += Math.max(red, green, blue) - Math.min(red, green, blue);
    histogram[luma]++;
  }
  const pixels = info.width * info.height;
  const percentile = (fraction) => {
    const target = Math.ceil(pixels * fraction) - 1;
    let seen = 0;
    for (let index = 0; index < histogram.length; index++) {
      seen += histogram[index];
      if (seen > target) return index;
    }
    return 255;
  };
  const mean = sum / pixels;
  return {
    mean,
    stdev: Math.sqrt(sumSquares / pixels - mean * mean),
    range: percentile(.95) - percentile(.05),
    chroma: chroma / pixels,
  };
}

async function main() {
  await mkdir(OUT, { recursive: true });
  for (const product of PRODUCTS) {
    const metadata = await sharp(join(ROOT, 'website', 'img', 'shop', 'v901', product.file)).metadata();
    if (metadata.format !== 'webp' || metadata.width !== 1280 || metadata.height !== 720) {
      throw new Error(`${product.file} must be an exact 1280x720 WebP`);
    }
    const metrics = await localMetrics(product.file);
    if (metrics.mean < 14 || metrics.mean > 120 || metrics.stdev < 18 || metrics.range < 35 || metrics.chroma < 14) {
      throw new Error(`${product.file} is visually flat or illegible: ${JSON.stringify(metrics)}`);
    }
    console.log(`${product.file}: mean=${metrics.mean.toFixed(2)} stdev=${metrics.stdev.toFixed(2)} range=${metrics.range} chroma=${metrics.chroma.toFixed(2)}`);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: 'dark', serviceWorkers: 'block' });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const badImages = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => pageErrors.push(String(error)));
  page.on('response', (response) => {
    if (response.url().includes('/img/shop/v901/') && response.status() >= 400) badImages.push(`${response.status()} ${response.url()}`);
  });

  try {
    await page.goto(`${BASE}/shop.html?nosw=1`, { waitUntil: 'networkidle', timeout: 60_000 });
    const report = [];
    for (const product of PRODUCTS) {
      const locator = page.locator(`img[src$="img/shop/v901/${product.file}"]`).first();
      if (await locator.count() !== 1) throw new Error(`shop.html does not render ${product.file}`);
      await locator.scrollIntoViewIfNeeded();
      await locator.evaluate((image) => image.decode());
      const state = await locator.evaluate((image) => ({
        src: image.getAttribute('src'), alt: image.getAttribute('alt') || '',
        width: image.naturalWidth, height: image.naturalHeight, complete: image.complete,
      }));
      if (!state.complete || state.width !== 1280 || state.height !== 720 || !product.alt.test(state.alt)) {
        throw new Error(`${product.file} rendered contract failed: ${JSON.stringify(state)}`);
      }
      await locator.screenshot({ path: join(OUT, product.file.replace('.webp', '.png')) });
      report.push(state);
    }
    await page.screenshot({ path: join(OUT, 'shop-studio-full.png'), fullPage: true });
    const visibleGiftArt = await page.locator('img[src*="/v901/gift-"], img[src*="birthday-orbit-detail"]').evaluateAll((nodes) => nodes.filter((node) => {
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    }).length);
    if (visibleGiftArt) throw new Error(`self-only shop renders ${visibleGiftArt} gift-art image(s)`);
    if (consoleErrors.length || pageErrors.length || badImages.length) {
      throw new Error(`render errors: console=${consoleErrors.length} page=${pageErrors.length} image-http=${badImages.length}`);
    }
    console.log(`PASS Studio art: ${report.length}/3 exact covers, truthful alts, self-only surface, zero render errors`);
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error) => { console.error(error); process.exit(1); });
