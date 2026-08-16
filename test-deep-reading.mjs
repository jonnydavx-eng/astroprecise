import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { buildDeepReading } from './website/js/deep-reading.js';

const base = JSON.parse(readFileSync(new URL('./website/js/reading-templates.json', import.meta.url), 'utf8'));
const deep = JSON.parse(readFileSync(new URL('./website/js/deep-templates.json', import.meta.url), 'utf8'));

const natal = {
  sun: 140.133, moon: 20, mercury: 30, venus: 40, mars: 50,
  jupiter: 80, saturn: 200, uranus: 10, neptune: 300, pluto: 250, asc: 141,
};
const reading = buildDeepReading(natal, base, deep, {
  birth: {
    dateText: '1990-08-12', timeText: '12:00', place: 'London',
    zone: 'Europe/London', utcText: '11:00 UT', coordsKnown: true,
  },
  transits: { sun: 140.1, moon: 10, mercury: 20, venus: 30, mars: 40, jupiter: 80, saturn: 200, uranus: 10, neptune: 300, pluto: 250 },
  transitDateText: '2026-08-12 UTC',
});

assert.equal(reading.chapters.length, 7, 'deep reading must return seven chapters');
assert.ok(reading.wordCount > 200, 'deep reading must be a real essay, not a stub');
assert.ok(reading.legal);
assert.equal(reading.chapters[0].mono.some((line) => line.includes('1990-08-12')), true);
assert.ok(reading.chapters[0].mono.some((line) => line.includes('Europe/London') && line.includes('11:00 UT')));
assert.equal(/\b1th\b/.test(JSON.stringify(reading)), false, 'house ordinal must not print 1th');
assert.ok(/\b1st\b/.test(JSON.stringify(reading)), 'Sun on the rising sign must name the 1st house');
assert.ok(reading.chapters[0].title.toLowerCase().includes('night you were born'));

const untimed = buildDeepReading(
  { sun: 10, moon: 20, mercury: 20, venus: 40, mars: 80, jupiter: 120, saturn: 200, uranus: 250, neptune: 300, pluto: 330 },
  base,
  deep,
  { birth: { dateText: '1991-03-14', zone: 'Europe/London', utcText: '12:00 UT', noonReference: true } },
);
assert.equal(untimed.chapters.length, 7);
assert.ok(/approximate/i.test(JSON.stringify(untimed)), 'untimed chart must label the Moon as approximate');
assert.equal(/exact moment/.test(JSON.stringify(untimed.chapters[0])), false, 'untimed chapter 1 must not claim an exact moment');
assert.equal(/Moon and angles withheld/.test(JSON.stringify(untimed)), false, 'engine must not claim the Moon was withheld');
assert.ok(/date reference, not a birth hour/.test(JSON.stringify(untimed.chapters[0])), 'untimed chapter 1 must name noon as a date reference');
assert.ok(reading.chapters[6].serif[0].includes('Leo'), 'timed letter must name the Sun sign');
assert.ok(untimed.chapters[6].serif[0].includes('Aries'), 'untimed letter must name the Sun sign');
assert.ok(untimed.chapters[6].serif[0].includes('rising sign'), 'untimed letter must say the rising sign is missing');
assert.equal(JSON.stringify(untimed.chapters).includes('1st house') || JSON.stringify(untimed).includes('rising sign needs'), true);

const timedNoCoords = buildDeepReading(natal, base, deep, {
  birth: { dateText: '1990-08-12', timeText: '14:30', place: 'London', zone: 'Europe/London', utcText: '13:30 UT', coordsKnown: false },
});
assert.ok(timedNoCoords.chapters[0].mono.some((line) => /no usable town coordinates/i.test(line)));

const natalCss = readFileSync(new URL('./website/css/ap-natal-reading.css', import.meta.url), 'utf8');
assert.equal(/position:\s*sticky/.test(natalCss), false, 'natal submit must not be sticky over the bottom nav');
assert.ok(natalCss.includes('#020307') && natalCss.includes('#F2ECDF') && natalCss.includes('#A89C84'));
assert.ok(natalCss.includes('#FF6428') && natalCss.includes('#D8B46A'));
assert.equal(/#c2a05e|#cdae6a|#b9c8dc|#8b919c/i.test(natalCss), false, 'natal CSS must not keep retired palette fallbacks');

console.log('PASS deep-reading seven chapters + untimed Moon approximate');

const natalJs = readFileSync(new URL('./website/js/ap-natal-reading.js', import.meta.url), 'utf8');
assert.ok(natalJs.includes("zone === 'UTC'") && natalJs.includes("zone === 'GMT'"), 'natal reading must refuse UTC/GMT');
assert.ok(natalJs.includes("zone === 'Etc/UTC'") && natalJs.includes('Etc\\/'), 'natal reading must refuse Etc/* offsets as a birth zone');
assert.ok(natalJs.includes('UK summer is not GMT'), 'natal reading must say UK summer is not GMT');
assert.ok(natalJs.includes('calculateNatalChart'), 'timed charts with coordinates must use the natal engine, not planets-only');
assert.ok(natalJs.includes('12:00') && natalJs.includes('date reference'), 'unknown hour must use noon as a stated date reference');
assert.equal(/reviewUnlock|ap_natal_print_review/.test(natalJs), false, 'paid unlock must stay closed — no review-unlock wiring');
assert.equal(/openCheckout|gumroad\.com|GUMROAD_PRODUCTS|fulfilUrl/.test(natalJs), false, 'natal page must not open live checkout');
assert.equal(/£\d|\$\d|price:\s*['"]/.test(natalJs), false, 'natal page must not invent a price');
assert.equal(/handleUnlockOnLoad|searchParams\.get\(['"]license|[?&]license=/.test(natalJs), false, 'licence keys must not arrive through a URL');
assert.equal(/option value="UTC"/.test(readFileSync(new URL('./website/deep-reading.html', import.meta.url), 'utf8')), false, 'deep-reading must not offer UTC/GMT');
assert.ok(readFileSync(new URL('./website/deep-reading.html', import.meta.url), 'utf8').includes('natal-city'), 'deep-reading must collect a city for IANA');
const natalHtml = readFileSync(new URL('./website/deep-reading.html', import.meta.url), 'utf8');
assert.equal(/never leaves the browser/i.test(natalHtml), false, 'deep-reading must not claim nothing leaves the browser');
assert.ok(/Place search sends only the town name/i.test(natalHtml), 'deep-reading must disclose the public geocoder');
assert.equal(/Nothing was uploaded/.test(natalJs), false, 'natal status must not claim a total upload blackout');
assert.ok(/Place search sent only the town name/.test(natalJs), 'natal status must name the geocoder exception');
assert.ok(natalHtml.includes('class="logo-text">AstroPrecise</span>'), 'wordmark is one word: AstroPrecise');
assert.equal(/Astro <i|Astro Precise/.test(natalHtml), false, 'wordmark must not split into two words');
assert.ok(natalHtml.includes('href="sky-card.html"') && natalHtml.includes('href="chart.html"'), 'reading may link to existing keep pages');
assert.equal(/sky-card\.html\?|chart\.html\?/.test(natalHtml), false, 'keep-path links must not carry a birth minute');
// Real keep engines now ship on this branch (gift keep path: ap-keep-minute.js).
// The page may load them, but it must never reference a keep engine that does not exist.
const keepScripts = [...natalHtml.matchAll(/src="(js\/[^"?]+\.js)/g)].map((m) => m[1]);
assert.ok(keepScripts.length > 0, 'deep-reading must declare its page scripts');
for (const src of keepScripts) {
  assert.ok(existsSync(new URL(`./website/${src}`, import.meta.url)), `deep-reading loads a keep engine that does not exist: ${src}`);
}
assert.equal(/captureStill/.test(natalHtml + natalJs), false, 'this page must not call a captureStill keep helper that does not exist');
assert.equal(/sign up|log in|create an account|chatbot|ask the oracle/i.test(natalHtml), false, 'no account and no AI-chat theatre');
assert.ok(natalHtml.includes('ap-room-sky') && natalHtml.includes('void-orrery'), 'live sky stays on the page');
assert.ok(/not behind a paywall/i.test(natalHtml), 'the live sky must be named as free');
assert.equal(/unlock the sky|buy to see the sky/i.test(natalHtml), false, 'the live sky must not be gated');
assert.ok(/Paid print unlock is not open/.test(natalHtml), 'paid print stays closed');
assert.equal(/£\d|\$\d/.test(natalHtml), false, 'page must not invent a price');
assert.ok(natalHtml.includes('natal-lat') && natalHtml.includes('natal-lon'), 'town pick must keep coordinates for a real rising sign');
assert.ok(/date reference, not a birth hour/.test(natalHtml), 'unknown time must be disclosed on the page, not only in the engine');
console.log('PASS deep-reading seven chapters + untimed Moon approximate + IANA TZ + house look');
