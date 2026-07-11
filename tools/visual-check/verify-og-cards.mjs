#!/usr/bin/env node
/**
 * verify-og-cards.mjs — verify the new per-sign OG share cards are wired live.
 * For 2 sign pages (aries, leo):
 *   1. og:image + twitter:image point at /img/og/sign-<slug>.jpg
 *   2. that URL resolves HTTP 200 (fetched from the running preview)
 *   3. no page console errors
 *   4. the hero still shows the engine still (img[src*="img/engine/"] visible)
 * Screenshots (page + card) → out/redesign/og-card-*.png
 *
 * Run (preview must be up on :8790):  node tools/visual-check/verify-og-cards.mjs
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const BASE = 'http://localhost:8790';
const OUT = join(dirname(fileURLToPath(import.meta.url)), 'out', 'redesign');
mkdirSync(OUT, { recursive: true });

const SIGNS = ['aries', 'leo'];
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
let failures = 0;

for (const slug of SIGNS) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 820 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto(`${BASE}/${slug}.html`, { waitUntil: 'load', timeout: 45000 });

  const og = await page.getAttribute('meta[property="og:image"]', 'content');
  const tw = await page.getAttribute('meta[name="twitter:image"]', 'content');
  const w = await page.getAttribute('meta[property="og:image:width"]', 'content');
  const h = await page.getAttribute('meta[property="og:image:height"]', 'content');
  const alt = await page.getAttribute('meta[property="og:image:alt"]', 'content');

  const expected = `/img/og/sign-${slug}.jpg`;
  const ogOk = og && og.endsWith(expected);
  const twOk = tw && tw.endsWith(expected);
  const dimOk = w === '1200' && h === '630';

  // Fetch the card URL through the browser context → real HTTP status.
  const cardUrl = og.startsWith('http') ? og.replace(/^https:\/\/astroprecise\.app/, BASE) : `${BASE}${og}`;
  const resp = await page.request.get(cardUrl);
  const status = resp.status();
  const ctype = resp.headers()['content-type'] || '';

  // Hero engine still present + visible.
  const heroImg = page.locator('img[src*="img/engine/"]').first();
  const heroCount = await heroImg.count();
  const heroVisible = heroCount ? await heroImg.isVisible() : false;
  const heroSrc = heroCount ? await heroImg.getAttribute('src') : '(none)';

  await page.screenshot({ path: join(OUT, `og-card-page-${slug}.png`) });

  const pass = ogOk && twOk && dimOk && status === 200 && ctype.startsWith('image/') && errors.length === 0 && heroVisible;
  if (!pass) failures++;
  console.log(`\n[${slug}] ${pass ? 'PASS' : 'FAIL'}`);
  console.log(`  og:image        = ${og}   ${ogOk ? 'ok' : 'MISMATCH'}`);
  console.log(`  twitter:image   = ${tw}   ${twOk ? 'ok' : 'MISMATCH'}`);
  console.log(`  og dimensions   = ${w}x${h}   ${dimOk ? 'ok' : 'MISMATCH (want 1200x630)'}`);
  console.log(`  og:image:alt    = ${alt}`);
  console.log(`  card HTTP       = ${status} ${ctype}   ${status === 200 ? 'ok' : 'NOT 200'}`);
  console.log(`  hero engine img = ${heroSrc}   visible=${heroVisible}`);
  console.log(`  console errors  = ${errors.length}${errors.length ? ' :: ' + errors.join(' | ') : ''}`);

  await page.close();
}

await browser.close();
console.log(`\n${failures === 0 ? 'ALL PASS' : failures + ' FAILURE(S)'}`);
process.exit(failures === 0 ? 0 : 1);
