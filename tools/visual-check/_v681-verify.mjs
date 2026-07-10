import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = process.env.AP_BASE || 'http://127.0.0.1:8790';
const outDir = 'tools/visual-check/out/v681';
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  args: ['--disable-gpu', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
});
const results = [];

async function measure(label, url, viewport) {
  const ctx = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    isMobile: viewport.width < 500,
    hasTouch: viewport.width < 500,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(2200);
  // unregister SW noise
  await page.evaluate(async () => {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const r of regs) await r.unregister();
    } catch (_) {}
  });
  const metrics = await page.evaluate(() => {
    const hero = document.querySelector('.mom-hero');
    const form = document.querySelector('.mom-studio, #mom-studio, #mom-form-title');
    const plate = document.querySelector('.mom-plate');
    const gallery = document.querySelector('.mom-hero__gallery img');
    const tools = document.getElementById('ap-engine-visuals');
    const bottomNav = document.querySelector('.bottom-nav');
    const floatNav = document.getElementById('apFloatNav');
    const hr = hero ? hero.getBoundingClientRect() : null;
    const fr = form ? form.getBoundingClientRect() : null;
    const tr = tools ? tools.getBoundingClientRect() : null;
    const bn = bottomNav ? bottomNav.getBoundingClientRect() : null;
    const fn = floatNav && !floatNav.hidden ? floatNav.getBoundingClientRect() : null;
    return {
      heroH: hr ? Math.round(hr.height) : null,
      heroBottom: hr ? Math.round(hr.bottom) : null,
      formTop: fr ? Math.round(fr.top) : null,
      formInView: fr ? fr.top < window.innerHeight * 0.92 : false,
      galleryH: gallery ? Math.round(gallery.getBoundingClientRect().height) : null,
      toolsAfterForm: tr && fr ? tr.top >= fr.bottom - 4 : null,
      toolsH: tr ? Math.round(tr.height) : null,
      toolsMode: tools ? tools.className : null,
      bottomNav: !!bottomNav && getComputedStyle(bottomNav).display !== 'none',
      floatAboveBottom:
        fn && bn
          ? Math.round(fn.bottom) <= Math.round(bn.top) + 2
          : fn
            ? true
            : null,
      dualThree: !!document.querySelector('script[src*="three.min"]') && !!document.querySelector('canvas.webgl, #orrery-canvas'),
      sw: document.querySelector('script[src*="sw"]') ? true : true,
      bodyPad: getComputedStyle(document.body).paddingBottom,
    };
  });
  const shot = path.join(outDir, `${label}.png`);
  await page.screenshot({ path: shot, fullPage: false });
  results.push({ label, url, viewport, metrics, errors: errors.slice(0, 8), shot });
  await ctx.close();
}

await measure('moment-d', `${BASE}/moment.html`, { width: 1440, height: 900 });
await measure('moment-m', `${BASE}/moment.html`, { width: 390, height: 844 });
await measure('home-m', `${BASE}/`, { width: 390, height: 844 });
await measure('chart-d', `${BASE}/chart.html`, { width: 1440, height: 900 });

await browser.close();
fs.writeFileSync(path.join(outDir, 'metrics.json'), JSON.stringify(results, null, 2));
for (const r of results) {
  console.log(
    r.label,
    'heroH=',
    r.metrics.heroH,
    'formInView=',
    r.metrics.formInView,
    'galleryH=',
    r.metrics.galleryH,
    'toolsAfterForm=',
    r.metrics.toolsAfterForm,
    'floatAboveBottom=',
    r.metrics.floatAboveBottom,
    'bottomNav=',
    r.metrics.bottomNav,
    'errs=',
    r.errors.length
  );
  if (r.errors.length) console.log('  ', r.errors.slice(0, 3));
}
const mom = results.find((r) => r.label === 'moment-d');
const pass =
  mom &&
  mom.metrics.heroH != null &&
  mom.metrics.heroH < 900 &&
  mom.metrics.formInView &&
  mom.metrics.toolsAfterForm !== false;
console.log(pass ? 'PASS v681 structure' : 'FAIL v681 structure');
process.exit(pass ? 0 : 1);
