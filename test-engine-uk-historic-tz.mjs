/**
 * Historic UK time-zone regression test.
 * Run: node test-engine-uk-historic-tz.mjs   (exit 0 = pass)
 *
 * A British birth time is only meaningful once it is pinned to the offset the
 * clocks actually showed that day, and the UK clocks have not simply alternated
 * GMT/BST. This file locks the Europe/London offsets the tz database records for
 * the four periods most likely to be got wrong:
 *
 *   British Standard Time   27 Oct 1968 – 31 Oct 1971 — UTC+1 all year, no
 *                           winter change, so a January 1970 birth is NOT GMT.
 *   GMT restored            from 31 Oct 1971 — January is UTC+0 again.
 *   British Double Summer   1941–1945 and 1947 — UTC+2 in high summer.
 *   Wartime winters         1940–1945 — clocks stayed on UTC+1 through winter.
 *
 * INTEGRITY: every expected offset is the documented civil history of the
 * United Kingdom, NEVER read back from engine output. The conversion itself is
 * not modified here; this file only asserts what it must produce.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

// The live calculator resolves a civil birth time in an IANA zone by probing
// the offsets around the date and round-tripping each candidate instant through
// Intl.DateTimeFormat. Those helpers are closure-private to the page
// controller, so this file keeps a copy and asserts the source still works that
// way — a rewrite of the converter fails here rather than passing silently.
const chartNext = readFileSync(join(here, 'website/js/ap-chart-next.js'), 'utf8');
assert.ok(
  chartNext.includes('function civilParts(ms, zone)'),
  'ap-chart-next.js still resolves civil time through a zone-aware formatter',
);
assert.ok(
  chartNext.includes("new Intl.DateTimeFormat('en-GB',{timeZone:zone"),
  'ap-chart-next.js still asks the IANA zone for the offset (no hardcoded offsets)',
);
assert.ok(
  chartNext.includes('function civilCandidates(date, time, zone)'),
  'ap-chart-next.js still round-trips candidate instants back to civil time',
);

// Copy of ap-chart-next.js civilParts / civilCandidates.
function civilParts(ms, zone) {
  const p = {};
  new Intl.DateTimeFormat('en-GB', {
    timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(ms)).forEach(part => {
    if (part.type !== 'literal') p[part.type] = Number(part.value);
  });
  return p;
}

function civilCandidates(date, time, zone) {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const naive = Date.UTC(y, m - 1, d, hh, mm);
  const offsets = new Set();
  for (let hours = -48; hours <= 48; hours += 6) {
    const probe = naive + hours * 3600000, p = civilParts(probe, zone);
    offsets.add(Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - probe);
  }
  const candidates = [];
  for (const offset of offsets) {
    const ms = naive - offset, p = civilParts(ms, zone);
    if (p.year === y && p.month === m && p.day === d && p.hour === hh && p.minute === mm) candidates.push(ms);
  }
  return [...new Set(candidates)].sort((a, b) => a - b);
}

let pass = 0, fail = 0;
const ok = (name, cond, got) => {
  if (cond) { pass++; console.log(`ok - ${name}`); }
  else { fail++; console.log(`not ok - ${name}${got !== undefined ? ' — got ' + got : ''}`); }
};

const ZONE = 'Europe/London';

// [date, local time, expected offset in hours ahead of UTC, why]
const CASES = [
  ['1970-01-15', '12:00', 1, 'British Standard Time — UTC+1 in winter, 1968-71'],
  ['1970-07-15', '12:00', 1, 'British Standard Time — UTC+1 in summer, 1968-71'],
  ['1972-01-15', '12:00', 0, 'GMT restored after 31 Oct 1971'],
  ['1975-07-15', '12:00', 1, 'ordinary British Summer Time'],
  ['1943-06-15', '12:00', 2, 'British Double Summer Time, 1943'],
  ['1944-01-15', '12:00', 1, 'wartime winter — clocks kept on UTC+1'],
  ['1947-06-15', '12:00', 2, 'British Double Summer Time, 1947'],
  ['1946-06-15', '12:00', 1, 'single summer time — 1946 had no double hour'],
];

for (const [date, time, expected, why] of CASES) {
  const candidates = civilCandidates(date, time, ZONE);
  ok(`${date} ${time} is an unambiguous clock time (${why})`, candidates.length === 1, candidates.length);
  if (candidates.length !== 1) continue;

  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const offsetHours = (Date.UTC(y, m - 1, d, hh, mm) - candidates[0]) / 3600000;
  ok(`${date} ${time} London = UTC+${expected} (${why})`, offsetHours === expected, `UTC+${offsetHours}`);

  // The resolved instant must read back as the requested wall-clock time in UTC
  // minus the offset — i.e. the conversion moved the hour, not the date alone.
  const utc = new Date(candidates[0]);
  const expectedUtcHour = ((hh - expected) + 24) % 24;
  ok(`${date} ${time} London converts to ${String(expectedUtcHour).padStart(2, '0')}:${String(mm).padStart(2, '0')} UT`,
    utc.getUTCHours() === expectedUtcHour && utc.getUTCMinutes() === mm,
    `${utc.getUTCHours()}:${String(utc.getUTCMinutes()).padStart(2, '0')}`);
}

// A naive GMT/BST rule would make January 1970 UTC+0 and January 1972 UTC+1
// alike. They must differ by exactly one hour, in that direction.
const jan1970 = civilCandidates('1970-01-15', '12:00', ZONE)[0];
const jan1972 = civilCandidates('1972-01-15', '12:00', ZONE)[0];
ok('January 1970 noon is one hour earlier in UT than January 1972 noon',
  (jan1972 - jan1970) % 3600000 === 0 && (Date.UTC(1972, 0, 15, 12, 0) - jan1972) === 0 && (Date.UTC(1970, 0, 15, 12, 0) - jan1970) === 3600000);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
