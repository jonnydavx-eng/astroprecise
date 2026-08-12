import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildDeepReading } from './website/js/deep-reading.js';

const base = JSON.parse(readFileSync(new URL('./website/js/reading-templates.json', import.meta.url), 'utf8'));
const deep = JSON.parse(readFileSync(new URL('./website/js/deep-templates.json', import.meta.url), 'utf8'));

const natal = {
  sun: 140.133, moon: 20, mercury: 30, venus: 40, mars: 50,
  jupiter: 80, saturn: 200, uranus: 10, neptune: 300, pluto: 250, asc: 141,
};
const reading = buildDeepReading(natal, base, deep, {
  birth: { dateText: '1990-08-12', timeText: '12:00', place: 'London' },
  transits: { sun: 140.1, moon: 10, mercury: 20, venus: 30, mars: 40, jupiter: 80, saturn: 200, uranus: 10, neptune: 300, pluto: 250 },
  transitDateText: '2026-08-12 UTC',
});

assert.equal(reading.chapters.length, 7, 'deep reading must return seven chapters');
assert.ok(reading.wordCount > 200, 'deep reading must be a real essay, not a stub');
assert.ok(reading.legal);
assert.equal(reading.chapters[0].mono.some((line) => line.includes('1990-08-12')), true);
assert.equal(/\b1th\b/.test(JSON.stringify(reading)), false, 'house ordinal must not print 1th');
assert.ok(/\b1st\b/.test(JSON.stringify(reading)), 'Sun on the rising sign must name the 1st house');

const untimed = buildDeepReading(
  { sun: 10, moon: 20, mercury: 20, venus: 40, mars: 80, jupiter: 120, saturn: 200, uranus: 250, neptune: 300, pluto: 330 },
  base,
  deep,
  { birth: { dateText: '1991-03-14' } },
);
assert.equal(untimed.chapters.length, 7);
assert.ok(/approximate/i.test(JSON.stringify(untimed)), 'untimed chart must label the Moon as approximate');
assert.equal(/Moon and angles withheld/.test(JSON.stringify(untimed)), false, 'engine must not claim the Moon was withheld');
assert.ok(reading.chapters[6].serif[0].includes('Leo'), 'timed letter must name the Sun sign');
assert.ok(untimed.chapters[6].serif[0].includes('Aries'), 'untimed letter must name the Sun sign');
assert.ok(untimed.chapters[6].serif[0].includes('rising sign'), 'untimed letter must say the rising sign is missing');
assert.equal(JSON.stringify(untimed.chapters).includes('1st house') || JSON.stringify(untimed).includes('rising sign needs'), true);

console.log('PASS deep-reading seven chapters + untimed Moon approximate');
