import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const count = (text, pattern) => (text.match(pattern) || []).length;

const chartPage = read('./website/js/chart-page.js');
assert.ok(chartPage.includes('Career point'));
assert.ok(chartPage.includes("fs.orb.toFixed(1) + '° from exact'"));
assert.ok(!chartPage.includes('}° orb ·'));
assert.ok(!chartPage.includes('Rising, Ascendant, Midheaven, houses'));
assert.ok(!chartPage.includes('within orb for this chart'));

const chartHtml = read('./website/chart.html');
const chartCss = read('./website/css/ap-chart-v835.css');
const interpretationsLoader = read('./website/js/ap-load-interpretations.js');
const readingFormat = read('./website/js/reading-format.js');
const chartRender = read('./website/js/chart-render.js');
assert.ok(chartPage.includes("name:'Semi-sextile'"));
assert.equal(chartPage.includes("name:'Slight angle'"), false);
assert.ok(chartCss.includes('.ap-reading-card > .ap-reading-card__content:only-child'));
assert.ok(chartCss.includes('scroll-margin-top:'));
assert.ok(chartHtml.includes('ap-chart-v835.css?v=837'));
assert.ok(chartHtml.includes('ap-load-interpretations.js?v=837') && chartHtml.includes('chart-page.js?v=837'));
assert.ok(chartHtml.includes('reading-format.js?v=837') && chartHtml.includes('chart-render.js?v=837'));
assert.ok(readingFormat.includes('if (leadHtml) inner += leadHtml;') && !readingFormat.includes('leadHtml && !collapsed'));
assert.ok(interpretationsLoader.includes('interpretations.js?v='));
assert.ok(chartPage.includes('degree withheld') && chartPage.includes('Date-reference angle'));
assert.ok(chartPage.includes('Secondary contacts · minor aspects and calculated points'));
assert.ok(chartPage.includes('resultNameEl.focus') && !chartPage.includes('firstTab = wrapEl'));
assert.ok(chartPage.includes("document.body.classList.add('ap-chart-has-results')"));
assert.ok(chartCss.includes('.page-chart.ap-chart-has-results .chart-method-ledger'));
assert.ok(!chartPage.includes('catch (e) { a = null; }'));
assert.ok(chartRender.includes('displayBodyName(p1name)') && chartRender.includes('displayBodyName(p2name)'));
assert.equal(chartHtml.includes('Robust even when your birth time is approximate'), false);

for (const path of ['./website/index-full.html', './website/deep-time.html', './website/terms.html']) {
  assert.equal(/arcminute/i.test(read(path)), false, `${path} must not make an arcminute claim`);
}
const home = read('./website/index.html');
const orreryAdapter = read('./website/js/void-orrery-adapter.js');
assert.ok(home.includes('Preparing 3D'));
assert.ok(orreryAdapter.includes('No substitute model has been shown.') && orreryAdapter.includes('Retry 3D'));
const deepTime = read('./website/deep-time.html');
assert.ok(deepTime.includes('duplicate Deep-Time model has been retired') && deepTime.includes('Open the Observatory'));
assert.equal(/minute you were born/i.test(deepTime), false);

for (const path of ['./website/transits.html', './website/this-weeks-sky.html']) {
  assert.equal(count(read(path), /js\/ephemeris\.js/g), 1, `${path} must load the ephemeris once`);
}

const privacy = read('./website/privacy.html');
assert.equal(/refine on map|if you use the map|OpenStreetMap\/Carto/i.test(privacy), false);
assert.equal(/optional map tiles/i.test(read('./website/terms.html')), false);

const serviceWorker = read('./website/sw.js');
assert.ok(serviceWorker.includes('app|chart-page|horoscope-page'), 'chart-page.js must remain release-critical');
assert.ok(serviceWorker.includes('if (isCritical ||') && serviceWorker.includes('if (network) return network;'), 'release-critical code must remain network-first');

const runbook = read('./ECLIPSE-RUNBOOK.md');
assert.ok(runbook.includes('23 suites, must be 23/23'));
assert.equal(/19 suites|19\/19/.test(runbook), false);

const mergeNote = read('./MERGE-2026-07-17-COWORK.md');
assert.equal(/£2\.99[^\n]*£4 archive|£14→£19|prices only rise/i.test(mergeNote), false);

for (const path of [
  './website/js/gumroad-unlock.js',
  './ECLIPSE-RUNBOOK.md',
  './marketing/ECLIPSE-LAUNCH-PACK-2026-08-12.md',
  './marketing/social-2026-08-12/tiktok/PLAN.md',
]) {
  const text = read(path).toLowerCase();
  for (const staleClaim of ['£19 later', 'rises to £4', '£4 after 12 aug', '£2.99 → £4', 'pre-eclipse prices', 'price flip']) {
    assert.equal(text.includes(staleClaim), false, `${path} retains stale claim: ${staleClaim}`);
  }
}

const launchPack = read('./marketing/ECLIPSE-LAUNCH-PACK-2026-08-12.md');
assert.equal(/arcminute|ephemeris/i.test(launchPack), false);

console.log('PASS pre-deploy truth and runtime regression checks');
