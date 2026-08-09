/**
 * Remit-4 proof — run from repo root with a static server on website/:
 *   node tools/serve-website.mjs &   (or any static server)
 *   node tools/visual-check/_remit4-check.mjs http://127.0.0.1:8791
 *
 * Checks, in a real browser, the four things that are only true at runtime:
 *   1. the homepage sky-news band no longer repeats the Moon / tightest-pair /
 *      retrograde cards the receipt below it already prints,
 *   2. exactly one eclipse day count appears on the homepage,
 *   3. no debug plural ("N body(ies)", "~N day(s)") survives in rendered copy,
 *   4. no page requests a font from a third party.
 */
import { chromium } from 'playwright';

const BASE = process.argv[2] || 'http://127.0.0.1:8791';
const FONT_PAGES = [
  'index.html', 'privacy.html', 'cosmic-calendar.html', 'deep-reading.html',
  'deep-time.html', 'journey.html', 'natal-plate.html', 'sky-card.html',
  'sky-events.html', 'verify.html'
];

let pass = 0;
const fails = [];
const ok = (name, cond, got) => {
  if (cond) { pass++; console.log('  ok ' + name); }
  else { fails.push(name + (got === undefined ? '' : ' — got ' + got)); console.log('  FAIL ' + name + (got === undefined ? '' : ' — ' + got)); }
};

// This checkout's Playwright browser cache points at a drive that is not on
// this machine, so fall back to whatever Chromium-family browser is installed.
// AP_BROWSER=<path to exe> overrides.
const { existsSync } = await import('node:fs');
const INSTALLED = [
  process.env.AP_BROWSER,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
].filter((p) => p && existsSync(p));

let browser;
try {
  browser = await chromium.launch();
} catch (e) {
  if (!INSTALLED.length) throw e;
  browser = await chromium.launch({ executablePath: INSTALLED[0] });
  console.log('(using installed browser: ' + INSTALLED[0] + ')');
}
const ctx = await browser.newContext();
const thirdPartyFonts = [];
ctx.on('request', (r) => {
  const u = r.url();
  if (/fonts\.googleapis\.com|fonts\.gstatic\.com|use\.typekit|fonts\.bunny\.net/.test(u)) thirdPartyFonts.push(u);
});

const page = await ctx.newPage();
await page.goto(BASE + '/index.html', { waitUntil: 'networkidle' });
await page.waitForSelector('#ap-sky-news-band .ap-sky-news__card', { timeout: 15000 });

const kickers = await page.$$eval('#ap-sky-news-band .ap-sky-news__kicker', (els) => els.map((e) => e.textContent.trim()));
ok('band drops the Moon card the receipt prints', !kickers.includes('MOON'), kickers.join(' | '));
ok('band drops the tightest-pair card', !kickers.includes('TIGHTEST PAIR'), kickers.join(' | '));
ok('band drops the retrograde card', !kickers.includes('RETROGRADE'), kickers.join(' | '));
ok('band still has cards to show', kickers.length >= 2, kickers.length);

const body = await page.evaluate(() => document.body.innerText);
const dayCounts = body.match(/·\s*in\s+\d+\s+days|T−\d+d/g) || [];
ok('exactly one eclipse day count on the page', dayCounts.length === 1, JSON.stringify(dayCounts));
ok('no "body(ies)" debug plural rendered', !/body\(ies\)/.test(body));
ok('no "day(s)" debug plural rendered', !/day\(s\)/.test(body));
ok('no "See Your\'s sky" possessive', !/Your's/.test(body));

const placeRequired = await page.$eval('#f-place', (el) => el.required);
const hint = await page.$eval('#coupon-hint', (el) => el.textContent.replace(/\s+/g, ' ').trim());
ok('hero birth place is required, like chart.html', placeRequired === true, placeRequired);
ok('hero no longer calls place optional', !/place[^.]*optional/i.test(hint), hint);

// chart.html, cast with the optional name left blank — the case that used to
// render "See Your's sky in the 3D model".
await page.goto(BASE + '/chart.html', { waitUntil: 'networkidle' });
await page.fill('#date-input', '1990-06-14');
await page.fill('#city-input', 'Manchester');
await page.waitForSelector('#city-autocomplete .autocomplete-option', { timeout: 10000 });
await page.click('#city-autocomplete .autocomplete-option');
await page.click('#calculate-btn');
await page.waitForSelector('#ap-chart-sky-bridge .ap-sky-bridge__title', { timeout: 20000 });
const ctaTitle = (await page.$eval('#ap-chart-sky-bridge .ap-sky-bridge__title', (el) => el.textContent)).trim();
ok('unnamed chart CTA reads as English', ctaTitle === 'See your sky in the 3D model', ctaTitle);
ok('no stray possessive in the CTA', !/Your['’]s/i.test(ctaTitle), ctaTitle);

for (const p of FONT_PAGES) {
  await page.goto(BASE + '/' + p, { waitUntil: 'networkidle' });
}
ok('no third-party font request on any of ' + FONT_PAGES.length + ' pages',
  thirdPartyFonts.length === 0, thirdPartyFonts.slice(0, 3).join(', '));

await browser.close();
console.log('\nremit4: ' + pass + ' passed, ' + fails.length + ' failed');
if (fails.length) { console.error(fails.join('\n')); process.exit(1); }
