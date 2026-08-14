import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

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
assert.ok(chartHtml.includes('ap-chart-v835.css?v=867'));
assert.ok(chartHtml.includes('ap-load-interpretations.js?v=867') && chartHtml.includes('chart-page.js?v=867'));
assert.ok(chartHtml.includes('reading-format.js?v=867') && chartHtml.includes('chart-render.js?v=867'));
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
assert.ok(privacy.includes('does not create or accept chart links containing birth details'));

const chartView = read('./website/chart-view.html');
const chartShare = read('./website/js/ap-chart-share.js');
const compatibilityHtml = read('./website/compatibility.html');
assert.equal(/location\.(?:search|hash)|new URLSearchParams/.test(chartView), false,
  'retired shared-chart route must not consume birth data from an address');
assert.equal(/location\.(?:search|hash)|chart-view\.html|birth details \(name/.test(chartShare), false,
  'chart share helper must emit a clean public URL only');
assert.equal(compatibilityHtml.includes('compatibility-page.js'), false,
  'retired compatibility-page.js must stay deleted');
assert.equal(/location\.hash|new URLSearchParams\(location\.search\)[\s\S]{0,120}(?:get\(['"](?:d|date|time|city|lat|lon)|birth)/.test(chartPage), false,
  'chart page must not restore birth details from an address');

const serviceWorker = read('./website/sw.js');
assert.ok(serviceWorker.includes('app|chart-page|horoscope-page'), 'chart-page.js must remain release-critical');
assert.ok(serviceWorker.includes('if (isCritical ||') && serviceWorker.includes('if (network) return network;'), 'release-critical code must remain network-first');

const runbook = read('./ECLIPSE-RUNBOOK.md');
assert.ok(runbook.includes('25 suites, must be 25/25'));
assert.equal(/19 suites|19\/19|23 suites|23\/23|24 suites|24\/24/.test(runbook), false);

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

const shop = read('./website/shop.html');
const eclipse = read('./website/eclipse.html');
const productConfig = read('./website/js/app.js');
const edition = read('./website/js/ap-eclipse-edition-v841.js');
const gumroad = read('./website/js/gumroad-unlock.js');
const gumroadBridge = read('./website/js/ap-gumroad-bridge.js');
assert.equal((shop.match(/<article class="ap-product/g) || []).length, 2,
  'shop must show only the free guide and one paid edition');
assert.ok(shop.includes('Eight-page PDF · ready now') && shop.includes('Personalised eclipse edition · £7'));
assert.ok(eclipse.includes('id="eclipseEdition"') && eclipse.includes('id="eclipseContactForm"'));
assert.match(productConfig, /catalogueSkus:\s*\['eclipse-edition'\]/);
assert.match(productConfig, /id:\s*'eclipse-edition'[\s\S]{0,260}price:\s*7\.00/);
assert.ok(edition.includes('reading.gateSale || reading.quiet'));
assert.ok(edition.includes('No manual review and no birth data leaves this browser'));
assert.ok(eclipse.includes('5.1 MB PDF'));
assert.equal(/2\.7 MB PDF/.test(eclipse), false);
assert.equal(/personally\s+reviewed|reviewed before they(?:'|&rsquo;)re sent|a human pass/i.test(read('./website/why.html')), false);

const moment = read('./website/moment.html');
const saturnReturn = read('./website/saturn-return.html');
assert.equal(/£8|moment-pack|optional pack|pack later|paid keepsakes/i.test(moment), false);
assert.equal(/full personalised reading|printable PDF|gift readings|written natal reports/i.test(saturnReturn), false);
for (const source of [gumroad, gumroadBridge, edition]) {
  assert.equal(/handleUnlockOnLoad|searchParams\.get\(['"]license|[?&]license=/.test(source), false,
    'licence key must never be accepted through a URL');
}

const htmlFiles = readdirSync(new URL('./website/', import.meta.url)).filter((name) => name.endsWith('.html'));
for (const file of htmlFiles) {
  const html = read('./website/' + file);
  assert.equal(/shop\.html#(?:deep-reading|eclipse-reading|eclipse-set)/.test(html), false,
    `${file} links to a retired product funnel`);
}

// ── Sky card: one keepable minute, honest about zone, hour and light ────────
const skyCard = read('./website/sky-card.html');
const skyCardJs = read('./website/js/ap-sky-card.js');
const keepMinute = read('./website/js/ap-keep-minute.js');
assert.ok(skyCard.includes("window.AP_ASSET_V='867'"), 'sky card must declare the release tip');
assert.equal(/\?v=(?!867\b)\d+/.test(skyCard), false, 'sky card must pin exactly one release tip');
assert.ok(skyCard.includes('data-ap-static-nav') && skyCard.includes('sky-events.html'),
  'sky card must carry the one house navigation');
assert.ok(skyCard.includes('Astro<i class="logo-text__precise">Precise</i>'),
  'the wordmark is one word');
assert.equal(/#0a0908/i.test(skyCard), false, 'sky card must leave the retired warm surface behind');
assert.equal(/never rounded|placed exactly/i.test(skyCard), false,
  'sky card must not claim an exactness it cannot prove');
assert.equal(/TIME \(UTC\)|clock time read as UTC/i.test(skyCard), false,
  'a birth clock time is not UTC');
assert.ok(skyCard.includes("Open-Meteo's public geocoder"),
  'sky card must say that only the town text is sent');
assert.equal(/quiz\.html|angel-numbers\.html|name-numerology\.html|lifepath\.html|moment\.html/.test(skyCard), false,
  'retired rooms stay retired');
assert.ok(skyCardJs.includes("zone === 'UTC'") && skyCardJs.includes("zone === 'GMT'")
  && skyCardJs.includes("zone === 'Etc/UTC'") && skyCardJs.includes('Etc\\/'),
  'sky card must refuse UTC, GMT and Etc/* as a birth zone');
assert.ok(skyCardJs.includes('sunAltitude('), 'day or night must be computed, never guessed');
assert.ok(skyCardJs.includes('DAY OR NIGHT NOT STATED') && skyCardJs.includes('NO BIRTH HOUR'),
  'an unknown hour must withhold the rising sign and the light state');
assert.ok(skyCardJs.includes("' (ASSUMED)'") && skyCardJs.includes('MOON PLACED FROM '),
  'an assumed hour must be printed on the card, not applied silently');
assert.ok(skyCardJs.includes('NOT A CLAIM ABOUT YOUR LIFE'), 'the card must not claim to be true');
assert.equal(/location\.(?:search|hash)|URLSearchParams/.test(skyCardJs), false,
  'sky card must not accept a birth minute from an address');
assert.equal(/location\.(?:search|hash)|URLSearchParams|location\.href\s*=/.test(keepMinute), false,
  'the keep path must not move a birth minute through a link');
assert.ok(keepMinute.includes('sessionStorage.setItem'), 'the keep path hands off in this tab only');
for (const path of ['./website/index.html', './website/chart.html', './website/deep-reading.html']) {
  const page = read(path);
  assert.ok(page.includes('href="sky-card.html" data-ap-keep-minute'),
    `${path} must reach the keep path`);
  assert.equal(/sky-card\.html\?/.test(page), false,
    `${path} must not put a birth minute in the keep link`);
  assert.ok(page.includes('ap-keep-minute.js?v=867'), `${path} must load the keep-path helper`);
}

const outreach = read('./website/js/outreach-content.js');
for (const stale of ['Deep Reading £12', 'posters from £6', 'shop.html#deep-reading', '{{deepReadingPrice}}']) {
  assert.equal(outreach.includes(stale), false, `outreach content retains stale launch offer: ${stale}`);
}

console.log('PASS pre-deploy truth and runtime regression checks');
