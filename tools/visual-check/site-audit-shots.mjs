/** Capture every core page (styled — deferred CSS force-injected) for the
 *  site-wide design audit. Desktop full-page + mobile hero. */
import { chromium } from 'playwright';
import { readFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = 'http://localhost:8790';
const SITE = join(__dirname, '..', '..', 'website');
const OUT = join(__dirname, 'out', 'site-audit');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SIGN_BOOT = ['css/ap-motion.css', 'css/ap-cinematic-2026.css', 'css/ap-micro-2026.css',
  'css/main.css', 'css/ap-page-bridge.css', 'css/sign-page.css', 'css/celestial-seals.css'];

const PAGES = [
  'index.html', 'horoscope.html', 'compatibility.html', 'synastry.html', 'transits.html',
  'ephemeris.html', 'shop.html', 'lifepath.html', 'profile.html', 'charts.html',
  'guides.html', 'moonphase.html', 'retrograde.html', 'saturn-return.html', 'solar-return.html',
  'name-numerology.html', 'angel-numbers.html', 'this-weeks-sky.html', 'tonight.html',
  'accuracy.html', 'what-is-my-rising-sign.html', 'why.html', 'quiz.html', 'cosmic-story.html',
  'leo.html',
];

async function deferredList(pageName) {
  try {
    const html = await readFile(join(SITE, pageName), 'utf8');
    const list = [];
    for (const m of html.matchAll(/deferPageCss\(\s*'([^']+)'/g)) list.push(m[1]);
    for (const m of html.matchAll(/loadPageCssNow\(\s*'([^']+)'/g)) list.push(m[1]);
    if (/deferMainCss\(\)/.test(html)) list.push('css/main.css');
    if (/ap-sign-defer-boot\.js/.test(html)) list.push(...SIGN_BOOT);
    if (/l\.href\s*=\s*'css\/fonts\.css'/.test(html)) list.push('css/fonts.css');
    return [...new Set(list)];
  } catch (e) { return []; }
}

async function shoot(browser, pg, vp, name, fullPage) {
  const id = pg.replace('.html', '');
  const deferred = await deferredList(pg);
  const ctx = await browser.newContext({ viewport: vp, colorScheme: 'dark', deviceScaleFactor: 1 });
  await ctx.addInitScript(() => {
    try { localStorage.setItem('ap_intro_complete', '1'); sessionStorage.setItem('ap_intro_complete', '1'); localStorage.setItem('ap_privacy_ack', '1'); } catch (e) {}
  });
  const p = await ctx.newPage();
  try {
    await p.goto(`${BASE}/${pg}`, { waitUntil: 'load', timeout: 45000 });
    for (const href of deferred) { await p.addStyleTag({ url: `${BASE}/${href}` }).catch(() => {}); }
    await p.evaluate(() => document.querySelectorAll('.ap-reveal').forEach((el) => { el.classList.add('is-visible', 'ap-revealed'); el.style.opacity = '1'; }));
    await sleep(1600);
    await p.screenshot({ path: join(OUT, `${id}-${name}.png`), fullPage });
    console.log(name, id);
  } catch (e) { console.log('ERR', name, id, e.message); }
  await ctx.close();
}

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
for (const pg of PAGES) {
  await shoot(browser, pg, { width: 1440, height: 900 }, 'desktop', true);
  await shoot(browser, pg, { width: 390, height: 844 }, 'mobile', false);
}
await browser.close();
console.log('\nDONE', PAGES.length, 'pages');
