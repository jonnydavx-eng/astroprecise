// Sign-hero planet rebuild verification.
// For each audited sign: the hero anchors on the correct RULING-PLANET engine still
// (img/engine/<ruler>.webp), the painterly zodiac-card JPG is GONE from the hero,
// the void plate + label are intact, JSON-LD parses, the injected nav = 6 locked
// labels, and there are ZERO page/console errors. Shots at 1440x900 + 390x844.
import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = process.env.BASE || 'http://localhost:8790';
const OUT = 'out/redesign';
fs.mkdirSync(OUT, { recursive: true });

const EXPECTED_NAV = ['Chart', 'Sky', 'Daily', 'Readings', 'Library', 'Shop'];
// sign -> expected hero engine still id (Scorpio anchors on Mars, its stronger render).
const EXPECT_STILL = {
  aries: 'mars', cancer: 'moon', leo: 'sun', scorpio: 'mars', capricorn: 'saturn',
  // extra coverage across the wheel:
  taurus: 'venus', gemini: 'mercury', libra: 'venus', sagittarius: 'jupiter',
  aquarius: 'uranus', pisces: 'neptune', virgo: 'mercury',
};
const SIGNS = Object.keys(EXPECT_STILL);
const SHOT_SIGNS = ['aries', 'cancer', 'leo', 'scorpio', 'capricorn'];

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

const ignore = /noaa|swpc|ovation|open-meteo|geocod|favicon|manifest|service worker|sw\.js/i;

const b = await chromium.launch();
let pass = 0, fail = 0;
const rows = [];

for (const vp of VIEWPORTS) {
  const ctx = await b.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 2,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  });
  await ctx.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => undefined }));

  for (const sign of SIGNS) {
    const pg = await ctx.newPage();
    const errs = [];
    pg.on('pageerror', e => errs.push('JS:' + String(e).slice(0, 140)));
    pg.on('console', m => { if (m.type() === 'error' && !ignore.test(m.text())) errs.push('con:' + m.text().slice(0, 140)); });
    pg.on('requestfailed', r => { const u = r.url(); if (!ignore.test(u)) errs.push('net:' + u.split('/').pop()); });

    const url = `${BASE}/${sign}.html?fresh=${Date.now()}`;
    let ok = true; const notes = [];
    try {
      await pg.goto(url, { waitUntil: 'load', timeout: 25000 });
      await pg.waitForFunction(() => {
        const n = document.querySelector('.navbar__nav');
        return n && n.querySelector('a.navbar__link');
      }, { timeout: 12000 }).catch(() => {});
      await pg.waitForTimeout(500);

      const data = await pg.evaluate(() => {
        const img = document.querySelector('.sign-hero__planet-img');
        const heroHtml = document.querySelector('.sign-hero')?.outerHTML || '';
        const nav = document.querySelector('.navbar__nav');
        const primary = nav
          ? Array.from(nav.querySelectorAll(':scope > a.navbar__link')).map(a => (a.textContent || '').replace(/\s+/g, ' ').trim())
          : [];
        // JSON-LD parse
        let jsonLdOk = true, jsonLdCount = 0;
        for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
          jsonLdCount++;
          try { JSON.parse(s.textContent); } catch { jsonLdOk = false; }
        }
        const plate = document.querySelector('.sign-hero__planet');
        const plateBox = plate ? plate.getBoundingClientRect() : null;
        return {
          heroImgSrc: img ? (img.getAttribute('src') || '') : null,
          heroImgNatural: img ? { w: img.naturalWidth, h: img.naturalHeight } : null,
          heroImgAlt: img ? img.getAttribute('alt') : null,
          heroHasPainterly: /zodiac-cards\//.test(heroHtml),
          heroHasFigcaption: !!document.querySelector('.sign-hero__planet-caption'),
          primary, jsonLdOk, jsonLdCount,
          plateW: plateBox ? Math.round(plateBox.width) : 0,
          plateH: plateBox ? Math.round(plateBox.height) : 0,
        };
      });

      const wantStill = EXPECT_STILL[sign];
      if (!data.heroImgSrc || !data.heroImgSrc.includes(`img/engine/${wantStill}.webp`)) {
        ok = false; notes.push(`hero src=${data.heroImgSrc} expected img/engine/${wantStill}.webp`);
      }
      if (!data.heroImgNatural || data.heroImgNatural.w < 400) {
        ok = false; notes.push(`hero still did not decode (${JSON.stringify(data.heroImgNatural)})`);
      }
      if (data.heroHasPainterly) { ok = false; notes.push('painterly zodiac-cards JPG still in hero'); }
      if (!data.heroHasFigcaption) { ok = false; notes.push('missing engine-render caption'); }
      if (!data.jsonLdOk || data.jsonLdCount < 3) { ok = false; notes.push(`JSON-LD parse fail (count=${data.jsonLdCount})`); }
      const navJoin = data.primary.join(',');
      if (navJoin !== EXPECTED_NAV.join(',')) { ok = false; notes.push(`nav=[${navJoin}]`); }
      if (data.plateW < 120 || data.plateH < 120) { ok = false; notes.push(`plate box too small ${data.plateW}x${data.plateH}`); }
      if (errs.length) { ok = false; notes.push('errs:' + errs.join('|')); }

      if (SHOT_SIGNS.includes(sign)) {
        await pg.evaluate(() => window.scrollTo(0, 0));
        await pg.waitForTimeout(200);
        await pg.screenshot({ path: `${OUT}/sign-hero-${sign}-${vp.name}.png`,
          clip: { x: 0, y: 0, width: vp.width, height: Math.min(vp.height, 900) } });
      }
    } catch (e) {
      ok = false; notes.push('EXC:' + String(e).slice(0, 140));
    }

    rows.push({ vp: vp.name, sign, ok, notes: notes.join(' ; ') });
    ok ? pass++ : fail++;
    await pg.close();
  }
  await ctx.close();
}

await b.close();

console.log('\n=== SIGN-HERO VERIFY ===');
for (const r of rows) {
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.vp.padEnd(7)} ${r.sign.padEnd(12)} ${r.notes}`);
}
console.log(`\n${pass} pass / ${fail} fail  (${rows.length} checks across ${VIEWPORTS.length} viewports)`);
process.exit(fail ? 1 : 0);
