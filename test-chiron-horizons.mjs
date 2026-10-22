/**
 * Chiron against NASA/JPL Horizons itself (not Swiss Ephemeris).
 * Fixtures: test-chiron-horizons.fixtures.json, 80 seeded UT moments 1850-2149,
 * Horizons quantity 31 (geocentric apparent ecliptic-of-date longitude) and the
 * apparent motion half a day either side (tools/accuracy/gen-chiron-horizons-fixtures.py).
 * Tolerance: 0.01 deg (the bound the shipped comment states), the same sign, and the same retrograde flag away from stations.
 * Also checks that the shipped table names Horizons as its source and that the
 * recorded provenance matches the fixtures' solution.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('./website/js/ephemeris.js', import.meta.url), 'utf8');
const win = {}; new Function('window', 'console', src)(win, console);
const E = win.AstroEphemeris;
const fx = JSON.parse(readFileSync(new URL('./test-chiron-horizons.fixtures.json', import.meta.url), 'utf8'));
const meta = JSON.parse(readFileSync(new URL('./tools/accuracy/chiron-horizons-source.json', import.meta.url), 'utf8'));

assert.match(meta.source, /JPL Horizons/);
assert.equal(meta.solution, fx.solution, 'table and fixtures come from the same Horizons solution');
assert.ok(meta.fetched_utc && meta.solution_date, 'source date recorded');
const comment = src.slice(src.indexOf('// Chiron table 1850-2150'), src.indexOf('const CHIRON_T0'));
const cm = comment.match(/NASA\/JPL Horizons \(solution (JPL#\d+), fetched (\d{4}-\d\d-\d\d)\)/);
assert.ok(cm, 'table comment names its Horizons solution and fetch date');
assert.equal(cm[1], meta.solution, 'comment solution matches recorded provenance');
assert.equal(cm[2], meta.fetched_utc.slice(0, 10), 'comment fetch date matches recorded provenance');
assert.match(meta.target, /2060 Chiron/);
const tab = src.match(/const CHIRON_TAB = '([^']+)'/)[1];
assert.equal(tab.split(';').length, meta.rows, 'row count matches provenance');
const pkg = readFileSync(new URL('./ephemeris-package/ephemeris.cjs', import.meta.url), 'utf8');
assert.ok(pkg.includes(tab), 'ephemeris-package copy ships the same Horizons table');
assert.doesNotMatch(comment, /seas_18|taken\s+from Swiss/i, 'the shipped table no longer comes from Swiss Ephemeris');
assert.equal(fx.moments.length, 80);

const diff = (a, b) => Math.abs((((a - b) % 360) + 540) % 360 - 180);
const fails = []; let worst = 0, sum = 0;
for (const r of fx.moments) {
  const [y, m, d, hh, mm] = r.ut;
  const c = E.calculateNatalChart(y, m, d, hh, mm, 51.5, 0, 'whole');
  const got = c.positions.chiron.longitude;
  assert.ok(Number.isFinite(r.chiron) && Number.isFinite(r.speed) && typeof r.chironRetro === 'boolean', `bad fixture row ${r.ut}`);
  assert.ok(Number.isFinite(got), `engine gave no Chiron for ${r.ut}`);
  const e = diff(got, r.chiron); worst = Math.max(worst, e); sum += e;
  if (e > 0.01) fails.push(`${r.ut.join('-')} chiron off ${e.toFixed(4)} deg`);
  if (Math.floor(got / 30) !== Math.floor(r.chiron / 30) && e > 0) fails.push(`${r.ut.join('-')} chiron SIGN`);
  if (Math.abs(r.speed) > 0.002 && c.positions.chiron.retrograde !== r.chironRetro) fails.push(`${r.ut.join('-')} chiron retrograde flag`);
}
console.log(`Chiron vs JPL Horizons ${fx.solution}: max ${worst.toFixed(4)} deg, mean ${(sum / fx.moments.length).toFixed(4)} deg`);
assert.deepEqual(fails, [], fails.join('\n'));
console.log(`ok - ${fx.moments.length} Chiron moments within 0.01 deg of JPL Horizons`);
