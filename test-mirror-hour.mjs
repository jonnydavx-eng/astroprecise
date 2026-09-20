import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

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
const sittingHtml = readFileSync(new URL('./website/deep-reading.html', import.meta.url), 'utf8');
const skyHtml = readFileSync(new URL('./website/sky-card.html', import.meta.url), 'utf8');
const natalJs = readFileSync(new URL('./website/js/ap-natal-reading.js', import.meta.url), 'utf8');
const chartJs = readFileSync(new URL('./website/js/chart-page.js', import.meta.url), 'utf8');
const skyJs = readFileSync(new URL('./website/js/ap-sky-card.js', import.meta.url), 'utf8');
const sw = readFileSync(new URL('./website/sw.js', import.meta.url), 'utf8');
assert.ok(sw.includes('./js/ap-mirror-hour.js') && sw.includes('./js/ap-mirror-presence.js'));
assert.ok(sw.includes('./css/ap-mirror-hour.css'));

assert.ok(chartHtml.includes('id="mirror-hour-badge"'));
assert.ok(chartHtml.includes('ap-mirror-hour.js'));
assert.ok(chartJs.includes('renderMirrorBadge') && chartJs.includes('APMirrorHour'));
assert.ok(indexHtml.includes('id="ap-presence-banner"'));
assert.ok(indexHtml.includes('ap-mirror-presence.js'));
assert.ok(indexHtml.includes('href="sky-card.html" data-ap-keep-minute'));
assert.ok(sittingHtml.includes('ap-mirror-hour.js'));
assert.ok(natalJs.includes('sittingBeat') && natalJs.includes('natal-sync-beat'));
assert.ok(skyHtml.includes('ap-mirror-hour.js'));
assert.ok(skyJs.includes('paintSyncMark') || skyJs.includes('APMirrorHour'));
assert.ok(skyHtml.includes('id="skySyncPanel"') || skyJs.includes('skySyncPanel'));

console.log('PASS mirror-hour detector, copy, presence override, and surface wiring');
