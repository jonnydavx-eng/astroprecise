/** Post-audit functional verification for chart.html. Exits non-zero on failure. */
import { chromium } from 'playwright';

const BASE = process.argv[2] || 'http://localhost:8790';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const ok = (name, cond, extra) => { results.push({ name, pass: !!cond, extra }); };

const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'dark' });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));

// 1) Date handoff acknowledgement + focus-forward
await page.goto(BASE + '/chart.html?date=1990-05-15', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForFunction(() => typeof window.AstroEphemeris !== 'undefined', null, { timeout: 30000 });
await sleep(900);
ok('handoff note shown', await page.$('#chart-handoff-note') !== null);
ok('date prefilled', (await page.inputValue('#date-input')) === '1990-05-15');
const focusedId = await page.evaluate(() => document.activeElement && document.activeElement.id);
ok('focus moved off the date field (to city/time)', ['city-input', 'time-input'].includes(focusedId), focusedId);
ok('time hint mentions the noon fallback', /assume noon/i.test(await page.textContent('#time-hint')));
ok('"don\'t know your time" affordance present', await page.$('#time-unknown-btn') !== null);

// 2) Cast the sample → results checks
await page.click('#sample-btn');
await sleep(8000);
ok('results visible', !(await page.evaluate(() => document.getElementById('chart-result')?.classList.contains('hidden'))));
ok('wheel svg rendered', await page.$('#natal-wheel svg') !== null);
ok('sky backdrop canvas present', await page.$('.chart-wheel-stage__sky') !== null);

// Rising card now shows a degree (all three big-three cards carry ' · ')
const bigThreeDescs = await page.$$eval('.big-three-card__desc', (els) => els.map((e) => e.textContent.trim()));
ok('all 3 big-three cards show a degree (°)', bigThreeDescs.length === 3 && bigThreeDescs.every((t) => /°/.test(t)), JSON.stringify(bigThreeDescs));

// Action row: 4 primary buttons + a "More options" overflow
const visibleActions = await page.$$eval('#result-actions-row > .action-btn', (els) => els.map((e) => e.id));
ok('4 primary action buttons', visibleActions.length === 4, JSON.stringify(visibleActions));
ok('overflow <details> present', await page.$('#result-actions-row details.result-actions__more') !== null);

// 3) House-system label + live switcher
await page.click('#tab-houses-btn');
await sleep(500);
ok('house-system label shown', /switchable/i.test(await page.textContent('.house-system-switch')));
const beforeCusps = await page.evaluate(() => [...document.querySelectorAll('#houses-table .ap-reading-card--placement')].map((c) => c.querySelector('.ap-reading-card__meta,.ap-reading-card__sub')?.textContent || c.textContent).slice(0, 3));
const activeBefore = await page.textContent('.house-system-switch__btn.is-active');
await page.click('.house-system-switch__btn[data-house-system="placidus"]');
await sleep(2500);
const activeAfter = await page.textContent('.house-system-switch__btn.is-active');
const afterCusps = await page.evaluate(() => [...document.querySelectorAll('#houses-table .ap-reading-card--placement')].map((c) => c.querySelector('.ap-reading-card__meta,.ap-reading-card__sub')?.textContent || c.textContent).slice(0, 3));
ok('switcher active state → Placidus', /placidus/i.test(activeAfter || ''), `${activeBefore} → ${activeAfter}`);
ok('house cusps recomputed (changed)', JSON.stringify(beforeCusps) !== JSON.stringify(afterCusps));

ok('no console/page errors', errors.length === 0, errors.slice(0, 4).join(' | '));

await browser.close();

const failed = results.filter((r) => !r.pass);
for (const r of results) console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}${r.extra ? '  — ' + r.extra : ''}`);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
