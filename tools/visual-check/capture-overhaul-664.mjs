import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(__dirname, 'out/overhaul-665');
fs.mkdirSync(out, { recursive: true });
const base = process.env.AP_BASE || 'http://localhost:8790';
const pages = [
  { name: 'home', url: '/?v=665' },
  { name: 'chart', url: '/chart.html?v=665' },
  { name: 'mysky', url: '/mysky.html?v=665' },
  { name: 'shop', url: '/shop.html?v=665' },
];

const browser = await chromium.launch({ headless: true });
const results = [];

for (const p of pages) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.addInitScript(() => {
    try {
      localStorage.setItem('ap_intro_complete', '1');
    } catch (_) {}
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message || e)));
  try {
    await page.goto(base + p.url, { waitUntil: 'networkidle', timeout: 60000 });
  } catch (e) {
    errors.push('nav:' + e.message);
  }
  await page.waitForTimeout(2800);
  const metrics = await page.evaluate(() => {
    const cs = getComputedStyle(document.body);
    const h1 = document.querySelector('h1');
    const btn = document.querySelector(
      '.btn-press, .btn--primary, button[type=submit], .mysky-cta--primary, a.btn-primary'
    );
    const threeScripts = [...document.scripts]
      .filter((s) => /three/i.test(s.src || ''))
      .map((s) => s.src);
    const umdThree = threeScripts.some((s) => /three\.min\.js/i.test(s));
    const orrery = document.querySelector('.ap-award-orrery-wrap, canvas');
    let orreryBox = null;
    if (orrery) {
      const r = orrery.getBoundingClientRect();
      orreryBox = {
        w: Math.round(r.width),
        h: Math.round(r.height),
        left: Math.round(r.left),
      };
    }
    const root = getComputedStyle(document.documentElement);
    const heroCopy = document.querySelector('#heroChapter .hero-copy');
    let glass = null;
    if (heroCopy) {
      const g = getComputedStyle(heroCopy);
      glass = {
        bg: g.backgroundImage || g.backgroundColor,
        border: g.borderColor,
        blur: g.backdropFilter || g.webkitBackdropFilter,
      };
    }
    return {
      bg: cs.backgroundColor,
      color: cs.color,
      h1c: h1 ? getComputedStyle(h1).color : null,
      btnBg: btn
        ? getComputedStyle(btn).backgroundImage || getComputedStyle(btn).backgroundColor
        : null,
      voidDeep: root.getPropertyValue('--ap-void-deep').trim(),
      cyan: root.getPropertyValue('--ap-cyan').trim(),
      cta: root.getPropertyValue('--ap-cta').trim(),
      threeScripts,
      umdThree,
      threeGlobal: typeof window.THREE !== 'undefined',
      importMap: !!document.querySelector('script[type=importmap]'),
      stageLink: !!document.querySelector('link[href*="ap-model-stage"]'),
      paletteLink: !!document.querySelector('link[href*="ap-palette-2026"]'),
      clarityLink: !!document.querySelector('link[href*="ap-visual-clarity"]'),
      orreryBox,
      glass,
      title: document.title,
    };
  });
  await page.screenshot({ path: path.join(out, p.name + '.png'), fullPage: false });
  results.push({ page: p.name, errors: errors.slice(0, 6), ...metrics });
  await page.close();
}

await browser.close();
fs.writeFileSync(path.join(out, 'metrics.json'), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
