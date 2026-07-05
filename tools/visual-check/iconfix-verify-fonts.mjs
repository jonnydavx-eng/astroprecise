/** Verify computed font-family on glyph elements resolves to AstroGlyph (real path). */
import { chromium } from 'playwright';
const BASE = 'http://localhost:8790';
const REAL_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

const TARGETS = [
  { page: '/horoscope.html', sels: ['.planet-weather-card__symbol', '.planet-pill__symbol', '.pl-dot', '.ecliptic-sky-headline'] },
  { page: '/ephemeris.html', sels: ['.sig-cell__glyph', '#ph-readout'] },
  { page: '/transits.html', sels: ['.ap-orb__glyph', '.dt-aspect__rel', '.transit-pill__pos'] },
  { page: '/this-weeks-sky.html', sels: ['.wk-hero__eyebrow', '.wk-privacy-seal__glyph'] },
  { page: '/tonight.html', sels: ['.tn-hero__eyebrow', '.tn-privacy-seal__glyph'] },
];

async function main() {
  const browser = await chromium.launch({ headless: true });
  for (const t of TARGETS) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, userAgent: REAL_UA, colorScheme: 'dark' });
    await ctx.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      window.chrome = window.chrome || { runtime: {} };
    });
    const page = await ctx.newPage();
    await page.goto(BASE + t.page, { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      try { window.dispatchEvent(new Event('pointerdown')); } catch (e) {}
      if (!document.getElementById('ap-css-main')) {
        const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'css/main.css'; l.id = 'ap-css-main-forced'; document.head.appendChild(l);
      }
    });
    await page.waitForTimeout(1500);
    const res = await page.evaluate((sels) => {
      return sels.map((s) => {
        const el = document.querySelector(s);
        if (!el) return { sel: s, found: false };
        const cs = getComputedStyle(el);
        return { sel: s, found: true, ff: cs.fontFamily, fve: cs.fontVariantEmoji || cs.getPropertyValue('font-variant-emoji') };
      });
    }, t.sels);
    console.log(`\n${t.page}`);
    for (const r of res) {
      const ok = r.found && /AstroGlyph/i.test(r.ff || '');
      console.log(`  ${ok ? 'OK ' : (r.found ? 'XX ' : '-- ')} ${r.sel} :: ${r.found ? r.ff : 'NOT FOUND'} | fve=${r.fve || ''}`);
    }
    await ctx.close();
  }
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
