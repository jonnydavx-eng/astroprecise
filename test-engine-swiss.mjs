/**
 * Apparent tropical longitudes against Swiss Ephemeris 2.10 (Moshier).
 * Run: node test-engine-swiss.mjs
 *
 * Reference values were computed with pyswisseph 2.10.3 (Moshier, apparent
 * geocentric ecliptic longitude of date, swe.houses Placidus for the angles).
 * Skyfield DE421 agrees with that ephemeris at the 0.1′ level. Tolerance is
 * 1 arcminute. Moments are invented instants at public city coordinates —
 * this repository is public, so none of these is a real person's birth.
 *
 * The civil-time cases go through the same two-iteration zone conversion as
 * chart-page.js. That conversion is not modified here; the expected UT values
 * lock it, including the 1968–71 all-year British Standard Time, India's
 * wartime +6:30, and the nonexistent spring-forward minute.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, 'website/js/ephemeris.js'), 'utf8');
const win = {};
new Function('window', 'console', src)(win, console);
const E = win.AstroEphemeris;

const chartPage = readFileSync(join(here, 'website/js/chart-page.js'), 'utf8');
assert.ok(chartPage.includes('for (let i = 0; i < 2; i++)'), 'zone conversion stays two-pass');
assert.ok(
  chartPage.includes('Date.UTC(y, m - 1, d, hh, mm, 0) - off * 60000'),
  'zone conversion still subtracts the IANA offset from the civil time',
);

// Copy of chart-page.js localToUT / tzOffsetMinutes. Kept in step with the
// assertions above so a rewrite of the converter fails this file.
function tzOffsetMinutes(tz, utcDate) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
  const p = {};
  dtf.formatToParts(utcDate).forEach(x => { p[x.type] = x.value; });
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  return (asUTC - utcDate.getTime()) / 60000;
}
function localToUT(y, m, d, hh, mm, tz) {
  let utc = new Date(Date.UTC(y, m - 1, d, hh, mm, 0));
  for (let i = 0; i < 2; i++) {
    const off = tzOffsetMinutes(tz, utc);
    utc = new Date(Date.UTC(y, m - 1, d, hh, mm, 0) - off * 60000);
  }
  return [utc.getUTCFullYear(), utc.getUTCMonth() + 1, utc.getUTCDate(), utc.getUTCHours(), utc.getUTCMinutes()];
}

const arcmin = (a, b) => {
  let d = ((a - b) % 360 + 360) % 360;
  if (d > 180) d = 360 - d;
  return d * 60;
};

const BODIES = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

// ut is [y, m, d, hh, mm]. civil, when set, is the clock time the converter must turn into that UT.
const FIXTURES = [
  { name: 'Greenwich 1900 noon', ut: [1900, 1, 1, 12, 0], lat: 51.4769, lon: -0.0005,
    ref: { sun: 280.66329, moon: 279.61641, mercury: 259.63935, venus: 306.99616, mars: 284.25303, jupiter: 241.23358, saturn: 267.77496, uranus: 250.16683, neptune: 85.20517, asc: 24.77325, mc: 279.81629 } },
  { name: 'Mercury on the Capricorn cusp, 1960-01-04 12:00 UT', ut: [1960, 1, 4, 12, 0], lat: 51.48, lon: 0,
    ref: { sun: 283.14351, moon: 358.20591, mercury: 270.22747, venus: 242.55441, mars: 262.86392, jupiter: 259.49996, saturn: 279.86987, uranus: 140.43117, neptune: 218.76427, asc: 29.94137, mc: 282.06072 } },
  { name: '1943 August, 06:00 UT', ut: [1943, 8, 15, 6, 0], lat: 51.48, lon: 0,
    ref: { sun: 141.54415, moon: 313.50693, mercury: 165.29239, venus: 170.54860, mars: 54.91801, jupiter: 129.94852, saturn: 83.98331, uranus: 68.45159, neptune: 180.35209, asc: 153.81767, mc: 55.12355 } },
  { name: '1970 March equinox, 00:00 UT', ut: [1970, 3, 21, 0, 0], lat: 51.48, lon: 0,
    ref: { sun: 359.96118, moon: 156.73132, mercury: 357.38259, venus: 13.39315, mars: 39.92263, jupiter: 214.67834, saturn: 36.84842, uranus: 187.05455, neptune: 240.80479, asc: 242.04958, mc: 177.92618 } },
  { name: '1975 November, 12:00 UT', ut: [1975, 11, 20, 12, 0], lat: 51.48, lon: 0,
    ref: { sun: 237.53832, moon: 75.69184, mercury: 232.73670, venus: 191.51602, mars: 91.24917, jupiter: 15.43741, saturn: 122.94580, uranus: 214.33933, neptune: 250.99609, asc: 298.93507, mc: 241.02001 } },
  { name: '1985 July, 18:00 UT', ut: [1985, 7, 4, 18, 0], lat: 51.48, lon: 0,
    ref: { sun: 102.68434, moon: 311.54505, mercury: 127.23110, venus: 58.30794, mars: 106.71893, jupiter: 315.58913, saturn: 231.82226, uranus: 254.90012, neptune: 271.94696, asc: 252.99873, mc: 193.78664 } },
  { name: '1990 January, 00:00 UT', ut: [1990, 1, 1, 0, 0], lat: 51.48, lon: 0,
    ref: { sun: 280.30451, moon: 326.55738, mercury: 295.79543, venus: 306.28172, mars: 249.64828, jupiter: 95.21603, saturn: 285.59840, uranus: 275.75546, neptune: 282.01916, asc: 187.32666, mc: 99.54580 } },
  { name: '1995 June solstice, 12:00 UT', ut: [1995, 6, 21, 12, 0], lat: 51.48, lon: 0,
    ref: { sun: 89.65913, moon: 18.02125, mercury: 70.49214, venus: 73.17658, mars: 163.23257, jupiter: 248.07649, saturn: 354.56780, uranus: 299.63267, neptune: 294.82922, asc: 179.44724, mc: 89.28126 } },
  { name: '2001 June, 12:00 UT', ut: [2001, 6, 15, 12, 0], lat: 51.48, lon: 0,
    ref: { sun: 84.44405, moon: 9.68295, mercury: 86.05650, venus: 38.84550, mars: 262.19174, jupiter: 83.73848, saturn: 67.05108, uranus: 324.72446, neptune: 308.45287, asc: 175.65024, mc: 84.34018 } },
  { name: '2019 July, 12:00 UT', ut: [2019, 7, 1, 12, 0], lat: 51.48, lon: 0,
    ref: { sun: 99.38325, moon: 82.14807, mercury: 122.85802, venus: 87.38375, mars: 119.69979, jupiter: 256.94524, saturn: 287.81814, uranus: 35.92271, neptune: 348.69779, asc: 186.52665, mc: 98.49984 } },
  { name: '2026 October, 12:00 UT', ut: [2026, 10, 3, 12, 0], lat: 51.48, lon: 0,
    ref: { sun: 190.29745, moon: 99.51911, mercury: 213.92358, venus: 218.49038, mars: 123.13924, jupiter: 140.03470, saturn: 11.38225, uranus: 65.48186, neptune: 2.79317, asc: 252.63359, mc: 193.26948 } },
  { name: '2050 January, 00:00 UT', ut: [2050, 1, 1, 0, 0], lat: 51.48, lon: 0,
    ref: { sun: 280.74845, moon: 18.67653, mercury: 270.05943, venus: 281.24813, mars: 227.71474, jupiter: 121.69150, saturn: 297.57430, uranus: 170.73264, neptune: 53.60311, asc: 187.65343, mc: 99.97315 } },
  { name: '2100 June, 12:00 UT', ut: [2100, 6, 15, 12, 0], lat: 51.48, lon: 0,
    ref: { sun: 84.52785, moon: 175.76484, mercury: 76.77972, venus: 46.48525, mars: 123.42407, jupiter: 193.35353, saturn: 199.94820, uranus: 24.85078, neptune: 164.66502, asc: 175.67003, mc: 84.36607 } },
  { name: 'London after the 2024 spring-forward, 02:30 BST', ut: [2024, 3, 31, 1, 30], civil: [2024, 3, 31, 2, 30, 'Europe/London'], lat: 51.5074, lon: -0.1278,
    ref: { sun: 10.82692, moon: 255.61355, mercury: 27.00967, venus: 353.69109, mars: 336.28112, jupiter: 47.15279, saturn: 343.49323, uranus: 50.74101, neptune: 357.87153, asc: 268.41574, mc: 213.52517 } },
  { name: 'London repeated autumn hour, 01:30 GMT on 27 Oct 2024', ut: [2024, 10, 27, 1, 30], civil: [2024, 10, 27, 1, 30, 'Europe/London'], lat: 51.5074, lon: -0.1278,
    ref: { sun: 214.12182, moon: 154.84946, mercury: 230.34499, venus: 251.16446, mars: 116.99687, jupiter: 80.81180, saturn: 343.02284, uranus: 56.09115, neptune: 357.59986, asc: 157.67921, mc: 60.44268 } },
  { name: 'London just after midnight BST, 00:20 on 21 Jun 2024', ut: [2024, 6, 20, 23, 20], civil: [2024, 6, 21, 0, 20, 'Europe/London'], lat: 51.5074, lon: -0.1278,
    ref: { sun: 90.09871, moon: 256.71289, mercury: 97.71373, venus: 94.55548, mars: 38.68541, jupiter: 66.00405, saturn: 349.36305, uranus: 55.24088, neptune: 359.89614, asc: 335.67166, mc: 260.37508 } },
  { name: 'Sydney 21:40 AEDT, 21 Dec 1975', ut: [1975, 12, 21, 10, 40], civil: [1975, 12, 21, 21, 40, 'Australia/Sydney'], lat: -33.8688, lon: 151.2093,
    ref: { sun: 268.93552, moon: 124.48266, mercury: 281.42570, venus: 226.81515, mars: 80.74749, jupiter: 14.95340, saturn: 121.77785, uranus: 215.95923, neptune: 252.15205, asc: 113.48669, mc: 43.04322 } },
  { name: 'Unknown time, noon assumed, London 12 Apr 1988', ut: [1988, 4, 12, 11, 0], civil: [1988, 4, 12, 12, 0, 'Europe/London'], lat: 51.5074, lon: -0.1278,
    ref: { sun: 22.75169, moon: 327.94461, mercury: 14.03886, venus: 68.24193, mars: 303.73268, jupiter: 37.80296, saturn: 272.55215, uranus: 271.02246, neptune: 280.19403, asc: 120.75104, mc: 6.24803 } },
  { name: 'London during all-year BST, 08:15 on 20 Jan 1969', ut: [1969, 1, 20, 7, 15], civil: [1969, 1, 20, 8, 15, 'Europe/London'], lat: 51.5074, lon: -0.1278,
    ref: { sun: 300.06845, moon: 328.75591, mercury: 316.04162, venus: 346.90938, mars: 221.91353, jupiter: 186.05699, saturn: 19.50380, uranus: 183.94169, neptune: 238.27488, asc: 285.30380, mc: 230.55539 } },
  { name: 'Kolkata 06:40 local, India wartime +6:30, 2 Nov 1943', ut: [1943, 11, 2, 0, 10], civil: [1943, 11, 2, 6, 40, 'Asia/Kolkata'], lat: 22.5726, lon: 88.3639,
    ref: { sun: 218.70028, moon: 268.01010, mercury: 213.36624, venus: 172.91529, mars: 82.06409, jupiter: 144.37576, saturn: 86.14047, uranus: 67.93473, neptune: 183.11541, asc: 217.64617, mc: 128.83401 } },
  { name: 'Sydney 09:15 AEDT, 20 Nov 1975', ut: [1975, 11, 19, 22, 15], civil: [1975, 11, 20, 9, 15, 'Australia/Sydney'], lat: -33.8688, lon: 151.2093,
    ref: { sun: 236.96022, moon: 68.40228, mercury: 231.82196, venus: 190.89558, mars: 91.36230, jupiter: 15.47663, saturn: 122.95156, uranus: 214.30543, neptune: 250.97499, asc: 287.74234, mc: 183.57035 } },
];

assert.ok(FIXTURES.length >= 20, 'about twenty reference births');

let worst = 0;
let worstLabel = '';
for (const fx of FIXTURES) {
  if (fx.civil) {
    const got = localToUT(...fx.civil);
    assert.deepEqual(got, fx.ut, `${fx.name} civil time must still convert to the same UT`);
  }
  const [y, m, d, hh, mm] = fx.ut;
  const chart = E.calculateNatalChart(y, m, d, hh, mm, fx.lat, fx.lon, 'placidus');
  for (const body of BODIES) {
    const err = arcmin(chart.positions[body].longitude, fx.ref[body]);
    if (err > worst) { worst = err; worstLabel = `${fx.name} ${body}`; }
    assert.ok(err <= 1, `${fx.name} ${body} is ${err.toFixed(3)}′ from Swiss Ephemeris (limit 1′)`);
  }
  const ascErr = arcmin(chart.ascendant, fx.ref.asc);
  const mcErr = arcmin(chart.midheaven, fx.ref.mc);
  if (ascErr > worst) { worst = ascErr; worstLabel = `${fx.name} asc`; }
  if (mcErr > worst) { worst = mcErr; worstLabel = `${fx.name} mc`; }
  assert.ok(ascErr <= 1, `${fx.name} Ascendant is ${ascErr.toFixed(3)}′ off`);
  assert.ok(mcErr <= 1, `${fx.name} Midheaven is ${mcErr.toFixed(3)}′ off`);
}

const cusp = FIXTURES.find(fx => fx.name.startsWith('Mercury on the Capricorn'));
const cuspChart = E.calculateNatalChart(...cusp.ut, cusp.lat, cusp.lon, 'placidus');
assert.equal(cuspChart.positions.mercury.sign, 'Capricorn');
assert.ok(cuspChart.positions.mercury.degree < 1, 'Mercury is in the first degree of Capricorn, not the last of Sagittarius');

// The 2024 spring gap has no 01:30. The converter's current result is locked
// so a zone "fix" cannot move the chart without this test noticing.
assert.deepEqual(
  localToUT(2024, 3, 31, 1, 30, 'Europe/London'),
  [2024, 3, 31, 1, 30],
  'the nonexistent 01:30 on spring-forward morning stays on its current UT',
);

console.log(`PASS ${FIXTURES.length} Swiss Ephemeris fixtures, worst ${worst.toFixed(3)}′ (${worstLabel})`);
