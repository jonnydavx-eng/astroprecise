import assert from 'node:assert/strict';
import {
  julianDay,
  sunPosition,
  allPlanetPositions,
  calculateNatalChart,
} from '../index.mjs';

// --- julianDay -------------------------------------------------------------
assert.equal(julianDay(2000, 1, 1, 12, 0, 0), 2451545.0, 'J2000.0 epoch');
assert.equal(julianDay(1987, 1, 27, 0, 0, 0), 2446822.5, 'Meeus example 7.a');

// --- sunPosition (Meeus example 25.a: 1992 Oct 13.0 TD) ---------------------
const sun = sunPosition(2448908.5);
assert.equal(typeof sun, 'object', 'sunPosition returns an object');
assert.ok(Number.isFinite(sun.lon), 'sun.lon is finite');
assert.ok(
  Math.abs(sun.lon - 199.906) < 0.05,
  `apparent solar longitude ${sun.lon} not within 0.05 deg of 199.906`
);

// --- allPlanetPositions ------------------------------------------------------
const BODIES = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter',
  'Saturn', 'Uranus', 'Neptune', 'Pluto', 'Chiron', 'NorthNode',
];
const all = allPlanetPositions(2451545.0);
assert.deepEqual(
  Object.keys(all).sort(), [...BODIES].sort(),
  'allPlanetPositions returns exactly the 12 expected bodies'
);
for (const body of BODIES) {
  const { lon } = all[body];
  assert.ok(
    Number.isFinite(lon) && lon >= 0 && lon < 360,
    `${body}.lon = ${lon} is not a finite degree in [0, 360)`
  );
}
assert.ok(Number.isFinite(all.Moon.distance), 'Moon entry preserves distance');

// --- calculateNatalChart ------------------------------------------------------
const chart = calculateNatalChart(1990, 6, 15, 12, 0, 51.5074, -0.1278);
assert.ok(chart.positions && typeof chart.positions === 'object', 'chart has positions');
for (const [name, pos] of Object.entries(chart.positions)) {
  assert.equal(typeof pos.sign, 'string', `${name}.sign is a string`);
  assert.ok(pos.sign.length > 0, `${name}.sign is non-empty`);
  assert.ok(Number.isFinite(pos.longitude), `${name}.longitude is finite`);
}
assert.equal(chart.positions.sun.sign, 'Gemini', 'Sun in Gemini on 1990-06-15');
assert.ok(Array.isArray(chart.houses), 'houses is an array');
assert.equal(chart.houses.length, 12, 'exactly 12 house cusps');
for (const cusp of chart.houses) {
  assert.ok(Number.isFinite(cusp) && cusp >= 0 && cusp < 360, `cusp ${cusp} in [0, 360)`);
}

console.log('all tests passed');
