import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const count = (text, pattern) => (text.match(pattern) || []).length;

const chartPage = read('./website/js/chart-page.js');
assert.ok(chartPage.includes('Career point'));
assert.ok(chartPage.includes('° from exact ·'));
assert.ok(!chartPage.includes('}° orb ·'));
assert.ok(!chartPage.includes('Rising, Ascendant, Midheaven, houses'));
assert.ok(!chartPage.includes('within orb for this chart'));

for (const path of ['./website/index-full.html', './website/deep-time.html', './website/terms.html']) {
  assert.equal(/arcminute/i.test(read(path)), false, `${path} must not make an arcminute claim`);
}
assert.ok(read('./website/index-full.html').includes('Sky model warming in your browser.'));
const deepTime = read('./website/deep-time.html');
assert.ok(deepTime.includes('FOR THE MOMENT SHOWN'));
assert.equal(/minute you were born/i.test(deepTime), false);

for (const path of ['./website/transits.html', './website/this-weeks-sky.html']) {
  assert.equal(count(read(path), /js\/ephemeris\.js/g), 1, `${path} must load the ephemeris once`);
}

const privacy = read('./website/privacy.html');
assert.equal(/refine on map|if you use the map|OpenStreetMap\/Carto/i.test(privacy), false);
assert.equal(/optional map tiles/i.test(read('./website/terms.html')), false);

const serviceWorker = read('./website/sw.js');
assert.ok(serviceWorker.includes('js\\/chart-page\\.js'), 'chart-page.js must be network-first');

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
