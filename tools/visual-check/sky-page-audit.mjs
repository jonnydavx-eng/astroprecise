/** Sky page beginner UX spot-check (ap-v613). */
import { chromium } from 'playwright';

const BASE = (process.argv[2] || 'http://localhost:8790').replace(/\/$/, '');
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
await ctx.addInitScript(() => {
  try { sessionStorage.setItem('ap_intro_complete', '1'); } catch (_) {}
  try { localStorage.removeItem('ap_instrument_event'); } catch (_) {}
});

const page = await ctx.newPage();
const checks = [];
function rec(id, ok, detail) {
  checks.push({ id, ok, detail });
  console.log((ok ? '✓' : '✗') + ' ' + id + ' — ' + detail);
}

await page.goto(BASE + '/ephemeris.html', { waitUntil: 'domcontentloaded', timeout: 35000 });
await page.waitForTimeout(3500);

const cold = await page.evaluate(() => ({
  stripLive: !!document.querySelector('#sky-tonight-strip .sky-card:not(.sky-card--skeleton)'),
  planets: (document.getElementById('sky-tonight-planets') || {}).textContent.length > 20,
  jumpLabel: (document.getElementById('sky-jump-your') || {}).textContent,
  jumpHref: (document.getElementById('sky-jump-your') || {}).getAttribute('href'),
  yourHidden: document.getElementById('sky-your')?.hasAttribute('hidden'),
  clockInExplore: !!document.querySelector('#sky-explore #sec-clock-wrap'),
  clockClosed: document.getElementById('sec-clock-wrap') && !document.getElementById('sec-clock-wrap').open,
  moodGloss: !!document.querySelector('.sky-card__gloss'),
  birthPanelHidden: document.getElementById('sky-birth-panel')?.hasAttribute('hidden'),
}));

rec('tonight:strip-resolves', cold.stripLive, JSON.stringify(cold.stripLive));
rec('tonight:planets-table', cold.planets, JSON.stringify(cold.planets));
rec('nav:add-your-sky', cold.jumpLabel === 'Add your sky' && cold.jumpHref === '#ev-personalize-toggle', JSON.stringify(cold));
rec('your:hidden-until-birth', cold.yourHidden === true, JSON.stringify(cold.yourHidden));
rec('spine:clock-in-explore', cold.clockInExplore && cold.clockClosed, JSON.stringify(cold));
rec('tonight:mood-gloss', cold.moodGloss, JSON.stringify(cold.moodGloss));
rec('birth:panel-collapsed', cold.birthPanelHidden === true, JSON.stringify(cold.birthPanelHidden));

await page.click('#ev-example');
await page.waitForTimeout(2500);
const warm = await page.evaluate(() => ({
  jumpLabel: (document.getElementById('sky-jump-your') || {}).textContent,
  yourVisible: !document.getElementById('sky-your')?.hasAttribute('hidden'),
  bigThree: (document.getElementById('natal-big-three') || {}).children.length >= 3,
  aiMounted: !!(document.getElementById('ephemeris-ai-panel')?.classList.contains('ap-ai-panel')),
  apInstrument: typeof window.APInstrument?.chartForAI === 'function',
  chartForAI: !!(window.APInstrument?.chartForAI?.()?.positions?.Sun),
}));

rec('personalize:jump-updates', warm.jumpLabel === 'Your sky', warm.jumpLabel);
rec('personalize:your-visible', warm.yourVisible, JSON.stringify(warm.yourVisible));
rec('personalize:big-three', warm.bigThree, JSON.stringify(warm.bigThree));
rec('ai:panel-mounted', warm.aiMounted, JSON.stringify(warm.aiMounted));
rec('ai:instrument-chart', warm.apInstrument && warm.chartForAI, JSON.stringify(warm));

await browser.close();
const passed = checks.filter((c) => c.ok).length;
console.log('\n' + passed + '/' + checks.length + ' sky checks passed');
process.exit(passed === checks.length ? 0 : 1);