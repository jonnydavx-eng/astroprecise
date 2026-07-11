/**
 * Multi-page visual score for Jet · Silver · Aurora overhaul.
 * Scores 0–100 from computed styles + residual brass heuristics.
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(__dirname, 'out/score-jet-670');
fs.mkdirSync(out, { recursive: true });
const base = process.env.AP_BASE || 'http://localhost:8790';

const PAGES = [
  { name: 'home', url: '/?v=670' },
  { name: 'chart', url: '/chart.html?v=670' },
  { name: 'mysky', url: '/mysky.html?v=670' },
  { name: 'shop', url: '/shop.html?v=670' },
  { name: 'horoscope', url: '/horoscope.html?v=670' },
  { name: 'explore', url: '/explore.html?v=670' },
  { name: 'aries', url: '/aries.html?v=670' },
  { name: 'ephemeris', url: '/ephemeris.html?v=670' },
  { name: 'compatibility', url: '/compatibility.html?v=670' },
  { name: 'moment', url: '/moment.html?v=670' },
];

function scorePage(m) {
  let s = 100;
  const notes = [];

  // Background jet-ish (black or near-black)
  const bg = m.bg || '';
  const bgMatch = bg.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (bgMatch) {
    const [r, g, b] = bgMatch.slice(1).map(Number);
    const lum = (r + g + b) / 3;
    if (lum > 40) {
      s -= 20;
      notes.push(`bg too light lum=${lum.toFixed(0)}`);
    } else if (lum > 18) {
      s -= 8;
      notes.push(`bg not jet lum=${lum.toFixed(0)}`);
    }
    // warm brown-black penalty
    if (r > g + 8 && r > b + 8 && lum < 40) {
      s -= 12;
      notes.push('warm brown void');
    }
  }

  // Text silver (cool, high)
  const col = m.color || '';
  const cm = col.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (cm) {
    const [r, g, b] = cm.slice(1).map(Number);
    if (r > 200 && g < 180) {
      s -= 10;
      notes.push('warm body text');
    }
    if ((r + g + b) / 3 < 140) {
      s -= 8;
      notes.push('body text too dim');
    }
  }

  // Accent / tokens
  if (m.voidDeep && !/#0[0-7]|#000/.test(m.voidDeep.replace(/\s/g, ''))) {
    // allow 07070A
    if (!/^#0[0-9A-Fa-f]{5}$/.test(m.voidDeep)) {
      s -= 5;
      notes.push(`voidDeep ${m.voidDeep}`);
    }
  }
  if (m.cyan && !/7EC8E8|5EC8E8|A8DCF2/i.test(m.cyan)) {
    s -= 4;
    notes.push(`accent ${m.cyan}`);
  }

  // Brass residual in page HTML styles
  if (m.brassHits > 0) {
    s -= Math.min(25, m.brassHits * 3);
    notes.push(`brassHits ${m.brassHits}`);
  }

  // CTA gradient presence on pages that should have primary
  if (m.btnBg && /217,\s*123|D97B|terracotta|194,\s*160/i.test(m.btnBg)) {
    s -= 15;
    notes.push('warm CTA');
  }
  if (m.btnBg && /linear-gradient/i.test(m.btnBg) && /126,\s*200,\s*232|74,\s*144,\s*224|106,\s*176/i.test(m.btnBg)) {
    s += 0; // good
  }

  // Dual three
  if (m.umdThree) {
    s -= 30;
    notes.push('umdThree');
  }
  if (m.errors && m.errors.length) {
    s -= Math.min(15, m.errors.length * 5);
    notes.push(`errors ${m.errors.length}`);
  }

  // Stage layers present
  if (!m.stageLink) {
    s -= 8;
    notes.push('no model-stage');
  }
  if (!m.paletteLink) {
    s -= 6;
    notes.push('no palette');
  }

  // Home: large orrery
  if (m.name === 'home') {
    if (!m.orreryBox || m.orreryBox.w < 500) {
      s -= 15;
      notes.push('orrery small');
    } else if (m.orreryBox.w >= 650) {
      // bonus already at 100
    }
    if (!m.glass) {
      s -= 8;
      notes.push('no glass form');
    }
  }

  return { score: Math.max(0, Math.min(100, Math.round(s))), notes };
}

const browser = await chromium.launch({ headless: true });
const results = [];

for (const p of PAGES) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.addInitScript(() => {
    try {
      localStorage.setItem('ap_intro_complete', '1');
    } catch (_) {}
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message || e).slice(0, 120)));
  try {
    await page.goto(base + p.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(2200);
  } catch (e) {
    errors.push('nav:' + e.message.slice(0, 80));
  }

  const metrics = await page.evaluate(() => {
    const cs = getComputedStyle(document.body);
    const h1 = document.querySelector('h1');
    const btn = document.querySelector(
      '.btn-press, .btn--primary, button[type=submit], .mysky-cta--primary, a.btn-primary, .shopc-card__cta'
    );
    const root = getComputedStyle(document.documentElement);
    const html = document.documentElement.outerHTML;
    const brassHits =
      (html.match(/#C2A05E|#CDAE6A|#D97B52|#D4B06A|194,\s*160,\s*94/gi) || []).length;
    const threeScripts = [...document.scripts]
      .filter((s) => /three\.min\.js/i.test(s.src || ''))
      .map((s) => s.src);
    const orrery = document.querySelector('.ap-award-orrery-wrap, .explore-orrery-wrap, canvas');
    let orreryBox = null;
    if (orrery) {
      const r = orrery.getBoundingClientRect();
      orreryBox = { w: Math.round(r.width), h: Math.round(r.height) };
    }
    const heroCopy = document.querySelector('#heroChapter .hero-copy');
    let glass = null;
    if (heroCopy) {
      const g = getComputedStyle(heroCopy);
      glass = { border: g.borderColor, blur: g.backdropFilter || '' };
    }
    return {
      bg: cs.backgroundColor,
      color: cs.color,
      h1c: h1 ? getComputedStyle(h1).color : null,
      btnBg: btn
        ? getComputedStyle(btn).backgroundImage || getComputedStyle(btn).backgroundColor
        : null,
      voidDeep: root.getPropertyValue('--ap-void-deep').trim(),
      cyan: root.getPropertyValue('--ap-cyan').trim() || root.getPropertyValue('--ap-aurora').trim(),
      brassHits,
      umdThree: threeScripts.length > 0,
      stageLink: !!document.querySelector('link[href*="ap-model-stage"]'),
      paletteLink: !!document.querySelector('link[href*="ap-palette-2026"]'),
      logoLink: !!document.querySelector('link[href*="ap-logo-aurora"]'),
      orreryBox,
      glass,
    };
  });

  await page.screenshot({ path: path.join(out, p.name + '.png'), fullPage: false });
  const scored = scorePage({ name: p.name, errors, ...metrics });
  results.push({ page: p.name, ...scored, ...metrics, errors: errors.slice(0, 4) });
  await page.close();
}

await browser.close();

const avg = results.reduce((a, r) => a + r.score, 0) / results.length;
const min = Math.min(...results.map((r) => r.score));
const report = {
  avg: Math.round(avg * 10) / 10,
  min,
  target: 80,
  pass: avg >= 80 && min >= 70,
  results,
};
fs.writeFileSync(path.join(out, 'score.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
console.log(`\n=== AVG ${report.avg}  MIN ${report.min}  PASS ${report.pass} ===`);
