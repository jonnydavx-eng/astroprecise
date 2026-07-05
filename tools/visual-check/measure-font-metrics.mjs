// Measure rendered box height of the sign-hero h1 in Cormorant vs the serif
// fallback, to derive a size-adjust that neutralises the font-swap reflow.
import { chromium } from 'playwright';

const BASE = 'http://localhost:8790';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.goto(`${BASE}/capricorn.html`, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready).catch(() => {});
await page.waitForTimeout(500);

const r = await page.evaluate(async () => {
  const h1 = document.querySelector('.sign-hero h1');
  const cs = getComputedStyle(h1);
  const fontSize = cs.fontSize;
  const lineHeight = cs.lineHeight;
  // Measure with Cormorant (loaded)
  await document.fonts.ready;
  const withFont = h1.getBoundingClientRect().height;
  // Force fallback: temporarily strip Cormorant
  const prev = h1.style.fontFamily;
  h1.style.fontFamily = "Georgia, 'Times New Roman', serif";
  const fallback = h1.getBoundingClientRect().height;
  h1.style.fontFamily = prev;
  return { fontSize, lineHeight, withFontH: +withFont.toFixed(2), fallbackH: +fallback.toFixed(2) };
});
console.log(JSON.stringify(r, null, 2));
console.log('height ratio (cormorant/fallback):', (r.withFontH / r.fallbackH).toFixed(4));
await b.close();
