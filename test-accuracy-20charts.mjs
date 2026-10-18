/**
 * 20-chart accuracy gate against Swiss Ephemeris 2.10 (pyswisseph, Moshier).
 * Fixtures: test-accuracy-20charts.fixtures.json (regenerate with
 * tools/accuracy/gen-swiss-fixtures.py). Moments are UT, invented, at public
 * city coordinates. Tolerances: planets 0.05 deg (Pluto 0.05), ASC/MC 0.1 deg,
 * Placidus cusps 0.1 deg (outside polar circles), and zero sign mismatches.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('./website/js/ephemeris.js', import.meta.url), 'utf8');
const win = {}; new Function('window', 'console', src)(win, console);
const E = win.AstroEphemeris;
const rows = JSON.parse(readFileSync(new URL('./test-accuracy-20charts.fixtures.json', import.meta.url), 'utf8'));
const diff = (a, b) => Math.abs((((a - b) % 360) + 540) % 360 - 180);
const PL = ['sun','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto'];
let worst = {}, fails = [];
for (const r of rows) {
  const [y, m, d, hh, mm] = r.ut;
  const c = E.calculateNatalChart(y, m, d, hh, mm, r.lat, r.lon, 'placidus');
  for (const k of [...PL, 'asc', 'mc']) {
    const got = c.positions[k].longitude, ref = r.ref[k], e = diff(got, ref);
    const tol = PL.includes(k) ? 0.05 : 0.1;
    worst[k] = Math.max(worst[k] || 0, e);
    if (e > tol) fails.push(`${r.name} ${k} off ${e.toFixed(4)} deg`);
    if (Math.floor(got / 30) !== Math.floor(ref / 30)) fails.push(`${r.name} ${k} SIGN ${E.signOf(got)} vs ${E.signOf(ref)}`);
  }
  if (r.placidus) {
    const cusps = (c.houses.cusps || c.houses).map(x => (typeof x === 'object' ? x.longitude : x));
    r.placidus.forEach((ref, i) => { const e = diff(cusps[i], ref); worst.cusp = Math.max(worst.cusp || 0, e); if (e > 0.1) fails.push(`${r.name} cusp ${i + 1} off ${e.toFixed(4)}`); });
  }
}
console.log('max error (deg):', Object.fromEntries(Object.entries(worst).map(([k, v]) => [k, +v.toFixed(4)])));
assert.deepEqual(fails, [], fails.join('\n'));
console.log(`ok - ${rows.length} charts within tolerance, 0 sign mismatches`);
