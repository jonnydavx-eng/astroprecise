import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = 'http://127.0.0.1:8790';
const outDir = 'tools/visual-check/out/v682';
fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({
  args: ['--disable-gpu', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
});
const results = [];

async function shot(label, url, viewport) {
  const ctx = await browser.newContext({
    viewport,
    isMobile: viewport.width < 500,
    hasTouch: viewport.width < 500,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(2000);
  await page.evaluate(async () => {
    try {
      for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister();
    } catch (_) {}
  });
  const m = await page.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const r = (el) => (el ? el.getBoundingClientRect() : null);
    const hero = r(q('.mom-hero'));
    const form = r(q('.mom-studio, #mom-studio'));
    const gallery = r(q('#mom-gallery-teaser, .mom-gallery-teaser'));
    const shopHero = r(q('.shop-hero'));
    const featured = r(q('#shopc-featured, .shop-live-section'));
    const deep = r(q('#deep-reading, .shopc-featured__card--hero'));
    const tools = r(q('#ap-engine-visuals'));
    return {
      momHeroH: hero && Math.round(hero.height),
      formTop: form && Math.round(form.top),
      formInView: form ? form.top < innerHeight * 0.75 : null,
      galleryAfterForm: gallery && form ? gallery.top >= form.bottom - 2 : null,
      galleryTop: gallery && Math.round(gallery.top),
      shopHeroH: shopHero && Math.round(shopHero.height),
      featuredTop: featured && Math.round(featured.top),
      deepTop: deep && Math.round(deep.top),
      deepInView: deep ? deep.top < innerHeight * 0.95 : null,
      toolsAfterForm: tools && form ? tools.top >= form.bottom - 4 : null,
      bodyPad: getComputedStyle(document.body).paddingBottom,
    };
  });
  await page.screenshot({ path: path.join(outDir, label + '.png'), fullPage: false });
  results.push({ label, m, errors: errors.slice(0, 6) });
  await ctx.close();
}

await shot('moment-d', BASE + '/moment.html', { width: 1440, height: 900 });
await shot('moment-m', BASE + '/moment.html', { width: 390, height: 844 });
await shot('shop-d', BASE + '/shop.html', { width: 1440, height: 900 });
await shot('shop-m', BASE + '/shop.html', { width: 390, height: 844 });
await browser.close();
fs.writeFileSync(path.join(outDir, 'metrics.json'), JSON.stringify(results, null, 2));
for (const r of results) {
  console.log(r.label, JSON.stringify(r.m), 'errs', r.errors.length);
  if (r.errors.length) console.log(r.errors.slice(0, 2));
}
const md = results.find((x) => x.label === 'moment-d');
const mm = results.find((x) => x.label === 'moment-m');
const sd = results.find((x) => x.label === 'shop-d');
const sm = results.find((x) => x.label === 'shop-m');
const pass =
  md.m.formInView &&
  md.m.galleryAfterForm &&
  mm.m.formInView &&
  mm.m.galleryAfterForm &&
  md.m.momHeroH < 420 &&
  sd.m.deepInView &&
  sm.m.featuredTop != null &&
  sm.m.featuredTop < 520;
console.log(pass ? 'PASS v682' : 'FAIL v682');
process.exit(pass ? 0 : 1);
