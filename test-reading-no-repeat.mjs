// Guard: a deep reading must never repeat a sentence, and never print "A Aquarius"-style articles.
// Charts below are fictional; longitudes are illustrative, not anyone's birth data.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildDeepReading } from './website/js/deep-reading.js';

const base = JSON.parse(readFileSync(new URL('./website/js/reading-templates.json', import.meta.url), 'utf8'));
const deep = JSON.parse(readFileSync(new URL('./website/js/deep-templates.json', import.meta.url), 'utf8'));

const charts = [
  { name: 'fictional A (Gemini Sun, Aquarius Moon, Gemini rising)',
    natal: { sun: 83.2, moon: 327.1, mercury: 70.4, venus: 47.1, mars: 10.0, jupiter: 95.3, saturn: 294.1, uranus: 278.0, neptune: 284.0, pluto: 225.6, asc: 63.5 },
    transits: { sun: 209, moon: 346.4, mercury: 228, venus: 196, mars: 10.5, jupiter: 112, saturn: 10.2, uranus: 60, neptune: 1, pluto: 303 } },
  { name: 'fictional B (Leo Sun on the ascendant)',
    natal: { sun: 140.133, moon: 20, mercury: 30, venus: 40, mars: 50, jupiter: 80, saturn: 200, uranus: 10, neptune: 300, pluto: 250, asc: 141 },
    transits: { sun: 140.1, moon: 10, mercury: 20, venus: 30, mars: 40, jupiter: 80, saturn: 200, uranus: 10, neptune: 300, pluto: 250 } },
  { name: 'fictional C (Aries Sun, Aquarius rising)',
    natal: { sun: 10, moon: 305, mercury: 20, venus: 340, mars: 190, jupiter: 120, saturn: 200, uranus: 250, neptune: 300, pluto: 330, asc: 315 },
    transits: { sun: 11, moon: 125, mercury: 22, venus: 341, mars: 191, jupiter: 121, saturn: 201, uranus: 251, neptune: 301, pluto: 331 } },
  { name: 'fictional D (Scorpio Sun, Aries Moon, untimed)',
    natal: { sun: 220, moon: 5, mercury: 230, venus: 250, mars: 100, jupiter: 160, saturn: 280, uranus: 290, neptune: 285, pluto: 225 },
    transits: { sun: 221, moon: 6, mercury: 231, venus: 251, mars: 101, jupiter: 161, saturn: 281, uranus: 291, neptune: 286, pluto: 226 },
    untimed: true },
];

function sentences(text) {
  return String(text).replace(/\s+/g, ' ').split(/(?<=[.!?])\s+(?=[A-Z“"‘'])/).map((s) => s.trim()).filter((s) => /[.!?]$/.test(s) && s.split(' ').length >= 6); // prose only; data labels such as 'Sun — 23°12′ Gemini' may recur
}

for (const c of charts) {
  const birth = c.untimed
    ? { dateText: '1994-11-12', zone: 'Europe/London', utcText: '12:00 UT', noonReference: true }
    : { dateText: '1990-06-14', timeText: '03:42', place: 'Whitby', zone: 'Europe/London', utcText: '02:42 UT', coordsKnown: true };
  const r = buildDeepReading(c.natal, base, deep, { birth, transits: c.transits, transitDateText: '2026-10-22 UTC' });
  const all = [];
  assert.ok(r.chapters.length >= 7, `${c.name}: expected 7 chapters, got ${r.chapters.length}`);
  for (const ch of r.chapters) {
    all.push(...sentences(ch.lead || ''));
    for (const key of ['mono', 'serif']) for (const line of (ch[key] || [])) all.push(...sentences(line));
  }
  assert.ok(all.length >= 20, `${c.name}: only ${all.length} prose sentences rendered; the guard would pass vacuously`);
  const seen = new Map();
  for (const s of all) seen.set(s, (seen.get(s) || 0) + 1);
  const dups = [...seen].filter(([, n]) => n > 1);
  assert.deepEqual(dups, [], `${c.name}: repeated sentences:\n` + dups.map(([s, n]) => `  ${n}× ${s}`).join('\n'));
  const blob = JSON.stringify(r.chapters);
  assert.equal(/\b[Aa] (?:Aries|Aquarius|Aries)\b/.test(blob), false, `${c.name}: "a Aries/Aquarius" article slip`);
  assert.equal(/\b(?:sitting|in easy flow|at a helpful angle) your natal\b/.test(blob), false, `${c.name}: missing preposition before "your natal"`);
  assert.equal(/Right now today's/.test(blob), false, `${c.name}: "Right now today's" is malformed`);
  assert.equal(/Right now your (?:Sun|Moon|Mercury|Venus|Mars|Jupiter|Saturn|Uranus|Neptune|Pluto)\b/.test(blob), false, `${c.name}: transit planet called "your"`);
}

const chartNext = readFileSync(new URL('./website/js/ap-chart-next.js', import.meta.url), 'utf8');
const anASrc = chartNext.match(/const anA=(w=>[^,]+?'an':'a')/);
assert.ok(anASrc, 'chart copy must choose a/an by sign');
const anA = new Function('return ' + anASrc[1])();
for (const [sign, art] of [['Aries', 'an'], ['Aquarius', 'an'], ['Taurus', 'a'], ['Leo', 'a'], ['Scorpio', 'a']]) assert.equal(anA(sign), art, `a/an for ${sign}`);
assert.ok(/'In astrology, '\+anA\(sun\)/.test(chartNext) && /cap\(anA\(moon\)\)/.test(chartNext), 'Sun and Moon copy must use the a/an helper');

// UK display formats: no US-ordered display dates on the reading, transit and sky pages.
for (const rel of ['website/transits.html', 'website/js/daily-transit.js', 'website/js/retrograde.js', 'website/js/horoscope-engine.js', 'website/js/interpretations.js', 'website/js/moonphase.js', 'website/js/horoscope-subscribe.js', 'website/js/ap-today-next.js']) {
  const src = readFileSync(new URL('./' + rel, import.meta.url), 'utf8');
  assert.equal(/toLocale(?:Date|Time)?String\(\s*['"]en-US['"]/.test(src), false, `${rel}: display dates must use en-GB`);
  assert.equal(/DateTimeFormat\(\s*['"]en-US['"]/.test(src), false, `${rel}: Intl formatters must use en-GB`);
  assert.equal(/hour12\s*:\s*true/.test(src), false, `${rel}: UK times are 24-hour`);
}
const todayNext = readFileSync(new URL('./website/js/ap-today-next.js', import.meta.url), 'utf8');
assert.equal(/\+' UTC'/.test(todayNext), false, 'sky-events must show local time, not UTC-only');
// Zone label: Chrome's en-GB gives BST in summer; a zero offset may come back as "GMT+0" in winter.
const tidy = (str) => str.replace(/GMT\+0(?![\d:])/, 'GMT');
const fmt = (iso) => tidy(new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZoneName: 'short', timeZone: 'Europe/London' }).format(new Date(iso)));
assert.match(fmt('2026-07-01T23:05:00Z'), /^2 Jul, 00:05 (BST|GMT\+1)$/);
assert.match(fmt('2026-01-15T00:30:00Z'), /^15 Jan, 00:30 GMT$/);
assert.equal(tidy('10:00 GMT+0:30'), '10:00 GMT+0:30', 'fractional offsets are left alone');
for (const rel of ['website/js/ap-today-next.js', 'website/js/retrograde.js', 'website/transits.html']) {
  const src = readFileSync(new URL('./' + rel, import.meta.url), 'utf8');
  assert.ok(src.includes("hourCycle:'h23'") || src.includes("hourCycle: 'h23'"), `${rel}: 24-hour clock`);
}
console.log(`PASS reading no-repeat (${charts.length} fictional charts, no duplicate sentences, no article slips, UK formats)`);
