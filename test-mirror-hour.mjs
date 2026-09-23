import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const src = readFileSync(new URL('./website/js/ap-mirror-hour.js', import.meta.url), 'utf8');
const module = { exports: {} };
const window = {};
new Function('module', 'window', src)(module, window);
const APMirrorHour = module.exports;
assert.ok(APMirrorHour && APMirrorHour.detect, 'classic script must export APMirrorHour');

const { detect, detectFromClock, detectNow, badgeCopy, sittingBeat, cardLabel, HONESTY } = APMirrorHour;

assert.ok(HONESTY.includes('Not predictive science'));
assert.ok(HONESTY.includes('does not invent or own angel numbers'));
assert.equal(/destin|prophec|guardian angel|medical/i.test(HONESTY), false);

const portal = detect(11, 11);
assert.ok(portal);
assert.equal(portal.label, '11:11');
assert.equal(portal.kind, 'portal');
assert.equal(portal.family, '1111');
assert.match(portal.folk, /wish|wake-up|alignment/i);
assert.equal(portal.honesty, HONESTY);

assert.equal(detectFromClock('11:11').label, '11:11');
assert.equal(detectFromClock('11:11:00').label, '11:11');
assert.equal(detectFromClock('22:22').family, '222');
assert.equal(detectFromClock('00:00').family, '000');
assert.equal(detectFromClock('01:01').label, '01:01');
assert.equal(detectFromClock('02:02').kind, 'mirror');
assert.equal(detectFromClock('23:23').label, '23:23');
assert.equal(detectFromClock('12:12').family, '1212');
assert.equal(detectFromClock('02:22').kind, 'repeat');
assert.equal(detectFromClock('03:33').family, '333');
assert.equal(detectFromClock('04:44').family, '444');
assert.equal(detectFromClock('05:55').family, '555');

assert.equal(detect(10, 15), null);
assert.equal(detectFromClock(''), null);
assert.equal(detectFromClock('25:00'), null);
assert.equal(detectFromClock('noon'), null);
assert.equal(detect(11, 12), null);

const badge = badgeCopy(portal);
assert.equal(badge.label, 'Your birth minute is a mirror hour');
assert.equal(badge.time, '11:11');
assert.ok(badge.honesty.includes('entertainment'));

const natalBeat = sittingBeat(portal, { source: 'natal' });
assert.equal(natalBeat.title, 'When the numbers lined up');
assert.match(natalBeat.mono, /Birth clock 11:11/);
assert.match(natalBeat.serif, /not a destiny claim/i);

const liveBeat = sittingBeat(detectFromClock('22:22'), { source: 'live' });
assert.match(liveBeat.title, /rhymed on the clock/i);
assert.match(liveBeat.mono, /Device clock 22:22/);

assert.equal(cardLabel(portal, '2026-09-20'), '11:11 · 2026-09-20');
assert.equal(cardLabel(portal, ''), '11:11');

const spoofed = detectNow(new Date('2026-09-20T08:00:00'), '?ap-mirror=11:11');
assert.equal(spoofed.label, '11:11');
assert.equal(detectNow(new Date('2026-09-20T08:00:00'), '?ap-presence=1').label, '11:11');
assert.equal(detectNow(new Date('2026-09-20T08:00:00'), ''), null);

assert.equal(APMirrorHour.presenceForced('?ap-presence=1'), true);
assert.equal(APMirrorHour.presenceForced('?ap-mirror=22:22'), true);
assert.equal(APMirrorHour.presenceForced(''), false);

const presence = readFileSync(new URL('./website/js/ap-mirror-presence.js', import.meta.url), 'utf8');
assert.equal(/Notification|pushManager|serviceWorker\.register/.test(presence), false);
assert.equal(/gumroad|checkout|sku|adsEnabled/i.test(src + presence), false);
assert.equal(/angel numbers as fact|messages from angels/i.test(src), false);

const chartHtml = readFileSync(new URL('./website/chart.html', import.meta.url), 'utf8');
const indexHtml = readFileSync(new URL('./website/index.html', import.meta.url), 'utf8');
const observatoryHtml = readFileSync(new URL('./website/observatory.html', import.meta.url), 'utf8');
const sittingHtml = readFileSync(new URL('./website/deep-reading.html', import.meta.url), 'utf8');
const skyHtml = readFileSync(new URL('./website/sky-card.html', import.meta.url), 'utf8');
const syncHtml = readFileSync(new URL('./website/synchronicity-card.html', import.meta.url), 'utf8');
const natalJs = readFileSync(new URL('./website/js/ap-reading-next.js', import.meta.url), 'utf8');
const chartJs = readFileSync(new URL('./website/js/ap-chart-next.js', import.meta.url), 'utf8');
const skyJs = readFileSync(new URL('./website/js/ap-keepsake-next.js', import.meta.url), 'utf8');
const syncJs = readFileSync(new URL('./website/js/ap-sky-card.js', import.meta.url), 'utf8');
const sw = readFileSync(new URL('./website/sw.js', import.meta.url), 'utf8');
const precache = sw.slice(sw.indexOf('const PRECACHE = ['), sw.indexOf('/* PRECACHE_END */'));
assert.ok(precache.includes('./js/ap-mirror-hour.js'), 'natal mirror helper must work with the offline chart and reading');
for (const asset of ['js/ap-mirror-presence.js', 'css/ap-mirror-hour.css']) {
  assert.ok(existsSync(new URL('./website/' + asset, import.meta.url)), 'optional Observatory asset exists: ' + asset);
}

assert.ok(chartHtml.includes('id="birth-mirror-badge"'));
assert.ok(chartHtml.includes('ap-mirror-hour.js'));
assert.ok(chartJs.includes('detectFromClock') && chartJs.includes('badgeCopy'));
assert.ok(observatoryHtml.includes('id="ap-presence-banner"'));
assert.ok(observatoryHtml.includes('ap-mirror-presence.js'));
assert.ok(observatoryHtml.includes('href="synchronicity-card.html"'));
assert.equal(indexHtml.includes('ap-mirror-presence.js'), false, 'the guided homepage must not run the optional live-clock presence feature');
assert.ok(sittingHtml.includes('ap-mirror-hour.js'));
assert.ok(natalJs.includes('sittingBeat') && natalJs.includes("source:'natal'"));
assert.ok(skyHtml.includes('ap-mirror-hour.js'));
assert.ok(skyJs.includes('detectFromClock') && skyJs.includes('APMirrorHour'));
assert.ok(syncHtml.includes('ap-mirror-hour.js'));
assert.ok(syncJs.includes('paintSyncMark') || syncJs.includes('APMirrorHour'));
assert.ok(syncHtml.includes('id="skySyncPanel"') || syncJs.includes('skySyncPanel'));

// Exercise the actual surface helpers so a guessed/default clock cannot become
// a birth-minute claim, including on saved charts with no accuracy metadata.
const helpers = [
  ['chart', chartJs.match(/function birthMirrorMatch\(data\) \{[\s\S]*?\n  \}/)?.[0], 'birthMirrorMatch'],
  ['reading', natalJs.match(/function natalMirrorBeat\(row\)\{[\s\S]*?\n\}/)?.[0], 'natalMirrorBeat'],
  ['keepsake', skyJs.match(/function keepsakeMirror\(row,includeBirth\)\{[^\n]+\}/)?.[0], 'keepsakeMirror'],
];
for (const [surface, source, name] of helpers) {
  assert.ok(source, surface + ' exposes its birth-minute decision helper');
  let detectorCalls = 0;
  const api = { ...APMirrorHour, detectFromClock(clock) { detectorCalls++; return detectFromClock(clock); } };
  const helper = runInNewContext(source + '\n' + name, { window: { APMirrorHour: api } });
  const exact = { birthTime: '11:11', timeKnown: true, timeAccuracy: 'exact' };
  const result = helper(exact, true);
  assert.ok(result, surface + ' recognises an explicitly exact mirror birth minute');
  if (surface === 'reading') {
    assert.match(result.mono, /Birth clock 11:11/);
    assert.ok(result.serif.includes(HONESTY), 'reading preserves the folk-pattern disclosure');
  } else {
    assert.equal(result.label, '11:11');
  }
  assert.equal(helper({ ...exact, birthTime: '10:15' }, true), null, surface + ' rejects non-pattern clocks');
  for (const overrides of [{ timeAccuracy: 'approximate' }, { timeAccuracy: 'unknown' },
    { timeAccuracy: undefined }, { timeKnown: false }, { timeKnown: 'true' }]) {
    const before = detectorCalls;
    assert.equal(helper({ ...exact, ...overrides }, true), null, surface + ' suppresses uncertain birth minutes');
    assert.equal(detectorCalls, before, surface + ' never sends uncertain birth times to the detector');
  }
  if (surface === 'keepsake') {
    const before = detectorCalls;
    assert.equal(helper(exact, false), null, 'keepsake omits the birth minute without explicit disclosure');
    assert.equal(detectorCalls, before, 'private keepsake does not inspect the birth minute');
  }
  const withoutModule = runInNewContext(source + '\n' + name, { window: {} });
  assert.equal(withoutModule(exact, true), null, surface + ' degrades safely without the optional copy helper');
}

// Execute the live-presence handoff: it must preserve a device-clock source,
// never turn that clock into a natal claim, and use its separate card surface.
const elements = new Map();
const listeners = new Map();
for (const id of ['ap-presence-banner', 'ap-presence-title', 'ap-presence-folk', 'ap-presence-note',
  'ap-presence-dismiss', 'ap-presence-keep', 'ap-presence-wish']) {
  elements.set(id, { hidden: true, dataset: {}, addEventListener(type, listener) { listeners.set(id + ':' + type, listener); } });
}
const handoffs = new Map();
const presenceWindow = {
  APMirrorHour: { ...APMirrorHour, detectNow: () => portal, isDismissed: () => false, rememberLive() {} },
  location: { href: '' }, setInterval: () => 1,
};
runInNewContext(presence, {
  window: presenceWindow,
  document: { readyState: 'complete', body: { classList: { toggle() {} } }, getElementById: id => elements.get(id), addEventListener() {} },
  sessionStorage: { setItem: (key, value) => handoffs.set(key, value) },
});
listeners.get('ap-presence-keep:click')({ preventDefault() {} });
assert.equal(presenceWindow.location.href, 'synchronicity-card.html');
const liveHandoff = JSON.parse(handoffs.get('ap-sky-card-handoff'));
assert.equal(liveHandoff.source, 'live-clock');
assert.equal(liveHandoff.livePattern, true);
assert.equal(liveHandoff.time, '11:11');
assert.equal(Object.hasOwn(liveHandoff, 'birthDate'), false);

console.log('PASS mirror-hour detector, honest natal precision gates, private keepsake, and live-clock handoff');
