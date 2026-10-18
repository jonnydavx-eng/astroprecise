/**
 * Chiron, lunar nodes and mean Lilith against Swiss Ephemeris 2.10 (seas_18.se1).
 * Fixtures: test-chiron-swiss.fixtures.json (tools/accuracy/gen-chiron-fixtures.py).
 * Tolerances: Chiron 0.02 deg with the same sign and retrograde flag (away from
 * stations), mean node 0.02, true node 0.15, mean Lilith 0.2 deg.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('./website/js/ephemeris.js', import.meta.url), 'utf8');
const win = {}; new Function('window', 'console', src)(win, console);
const E = win.AstroEphemeris;
const rows = JSON.parse(readFileSync(new URL('./test-chiron-swiss.fixtures.json', import.meta.url), 'utf8'));
const diff = (a, b) => Math.abs((((a - b) % 360) + 540) % 360 - 180);
const fails = []; const worst = { chiron: 0, meanNode: 0, trueNode: 0, lilith: 0 };
for (const r of rows) {
  const [y, m, d, hh, mm] = r.ut;
  const c = E.calculateNatalChart(y, m, d, hh, mm, 51.5, 0, 'whole');
  const t = E.calculateNatalChart(y, m, d, hh, mm, 51.5, 0, 'whole', 'true');
  const got = { chiron: c.positions.chiron.longitude, meanNode: c.positions.northNode.longitude,
                trueNode: t.positions.northNode.longitude, lilith: c.positions.lilith.longitude };
  const tol = { chiron: 0.02, meanNode: 0.02, trueNode: 0.15, lilith: 0.2 };
  for (const k of Object.keys(tol)) {
    const e = diff(got[k], r[k]); worst[k] = Math.max(worst[k], e);
    if (e > tol[k]) fails.push(`${r.ut.join('-')} ${k} off ${e.toFixed(4)}`);
  }
  if (Math.floor(got.chiron / 30) !== Math.floor(r.chiron / 30)) fails.push(`${r.ut.join('-')} chiron SIGN`);
  const before = E.chironPosition(c.jd - 0.5), after = E.chironPosition(c.jd + 0.5);
  const speed = ((((after - before) % 360) + 540) % 360) - 180;
  if (Math.abs(speed) > 0.002 && c.positions.chiron.retrograde !== r.chironRetro) fails.push(`${r.ut.join('-')} chiron retrograde flag`);
}
console.log('max error (deg):', Object.fromEntries(Object.entries(worst).map(([k, v]) => [k, +v.toFixed(4)])));
assert.deepEqual(fails, [], fails.join('\n'));
console.log(`ok - ${rows.length} Chiron/node/Lilith moments within tolerance`);
