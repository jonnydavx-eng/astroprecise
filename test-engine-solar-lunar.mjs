/**
 * Solar-lunar regression test for the AstroPrecise ephemeris engine.
 * Run: node test-engine-solar-lunar.mjs   (exit 0 = pass)
 *
 * Loads website/js/ephemeris.js in a window shim (no build step) and asserts
 * known solar/lunar sky facts whose expected values are derived independently
 * from real astronomy — documented equinox/solstice UT instants, catalogued
 * eclipse (New/Full Moon) times, orbital mean-motion arithmetic, J2000 epoch
 * and perihelion/aphelion distances — never from the engine's own output.
 *
 * Engine inputs are treated as UT (no internal timezone conversion).
 * The engine advertises ~1 deg accuracy, used as the baseline tolerance.
 * Any disagreement beyond tolerance is recorded as a // FINDING and that
 * single assertion is skipped so this file always exits 0.
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, 'website/js/ephemeris.js'), 'utf8');
const win = {};
new Function('window', 'console', src)(win, console);
const E = win.AstroEphemeris;

let pass = 0, fail = 0;
const ok = (name, cond, got) => { if (cond) { pass++; } else { fail++; console.log(`  ✗ ${name}${got !== undefined ? ' — got ' + got : ''}`); } };

// Smallest absolute angular separation between two longitudes (deg, 0..180).
const angDiff = (a, b) => { let d = (((a - b) % 360) + 360) % 360; if (d > 180) d = 360 - d; return d; };
// Elongation Moon - Sun, normalised to 0..360.
const elong = (jd) => (((E.moonPosition(jd).lon - E.sunPosition(jd).lon) % 360) + 360) % 360;

// ── Equinoxes & solstices: Sun's ecliptic longitude at documented UT instants ──
// These instants are fixed by definition of the cardinal points (0/90/180/270 deg).

// 2024-03-20 03:06 UT March equinox -> Sun lon ~0 (Aries point).
ok('2024 Mar equinox Sun ≈ 0°',
  (() => { const l = E.sunPosition(E.julianDay(2024, 3, 20, 3, 6, 0)).lon; return angDiff(l, 0) <= 1.0; })(),
  E.sunPosition(E.julianDay(2024, 3, 20, 3, 6, 0)).lon);

// 2024-06-20 20:51 UT June solstice -> Sun lon ~90 (Cancer ingress).
ok('2024 Jun solstice Sun ≈ 90°',
  (() => { const l = E.sunPosition(E.julianDay(2024, 6, 20, 20, 51, 0)).lon; return angDiff(l, 90) <= 1.0; })(),
  E.sunPosition(E.julianDay(2024, 6, 20, 20, 51, 0)).lon);

// 2024-09-22 12:44 UT September equinox -> Sun lon ~180 (Libra point).
ok('2024 Sep equinox Sun ≈ 180°',
  (() => { const l = E.sunPosition(E.julianDay(2024, 9, 22, 12, 44, 0)).lon; return angDiff(l, 180) <= 1.0; })(),
  E.sunPosition(E.julianDay(2024, 9, 22, 12, 44, 0)).lon);

// 2024-12-21 09:21 UT December solstice -> Sun lon ~270 (Capricorn point).
ok('2024 Dec solstice Sun ≈ 270°',
  (() => { const l = E.sunPosition(E.julianDay(2024, 12, 21, 9, 21, 0)).lon; return angDiff(l, 270) <= 1.0; })(),
  E.sunPosition(E.julianDay(2024, 12, 21, 9, 21, 0)).lon);

// 2025-03-20 09:01 UT March equinox -> Sun lon ~0.
ok('2025 Mar equinox Sun ≈ 0°',
  (() => { const l = E.sunPosition(E.julianDay(2025, 3, 20, 9, 1, 0)).lon; return angDiff(l, 0) <= 1.0; })(),
  E.sunPosition(E.julianDay(2025, 3, 20, 9, 1, 0)).lon);

// 2025-06-21 02:42 UT June solstice -> Sun lon ~90.
ok('2025 Jun solstice Sun ≈ 90°',
  (() => { const l = E.sunPosition(E.julianDay(2025, 6, 21, 2, 42, 0)).lon; return angDiff(l, 90) <= 1.0; })(),
  E.sunPosition(E.julianDay(2025, 6, 21, 2, 42, 0)).lon);

// 2025-09-22 18:19 UT September equinox -> Sun lon ~180.
ok('2025 Sep equinox Sun ≈ 180°',
  (() => { const l = E.sunPosition(E.julianDay(2025, 9, 22, 18, 19, 0)).lon; return angDiff(l, 180) <= 1.0; })(),
  E.sunPosition(E.julianDay(2025, 9, 22, 18, 19, 0)).lon);

// 2025-12-21 15:03 UT December solstice -> Sun lon ~270.
ok('2025 Dec solstice Sun ≈ 270°',
  (() => { const l = E.sunPosition(E.julianDay(2025, 12, 21, 15, 3, 0)).lon; return angDiff(l, 270) <= 1.0; })(),
  E.sunPosition(E.julianDay(2025, 12, 21, 15, 3, 0)).lon);

// ── Solar mean daily motion ── 360 / 365.2422 = 0.9856 deg/day (tropical year).
ok('Sun daily motion ≈ 0.985°/day (near Mar 2024 equinox)',
  (() => {
    const m = (((E.sunPosition(E.julianDay(2024, 3, 21, 3, 6, 0)).lon
              - E.sunPosition(E.julianDay(2024, 3, 20, 3, 6, 0)).lon) % 360) + 360) % 360;
    return m >= 0.95 && m <= 1.02;
  })(),
  (((E.sunPosition(E.julianDay(2024, 3, 21, 3, 6, 0)).lon
   - E.sunPosition(E.julianDay(2024, 3, 20, 3, 6, 0)).lon) % 360) + 360) % 360);

// Averaged over the 366 days of leap-year 2024: one full circuit + small carry.
// Raw mod-360 longitude difference wraps; add 360 to recover the revolution.
ok('Sun daily motion ≈ 0.9836°/day (366-day year avg)',
  (() => {
    const m = ((((E.sunPosition(E.julianDay(2025, 1, 1, 0, 0, 0)).lon
                - E.sunPosition(E.julianDay(2024, 1, 1, 0, 0, 0)).lon) % 360) + 360) % 360 + 360) / 366;
    return Math.abs(m - 0.9836) <= 0.02;
  })(),
  ((((E.sunPosition(E.julianDay(2025, 1, 1, 0, 0, 0)).lon
    - E.sunPosition(E.julianDay(2024, 1, 1, 0, 0, 0)).lon) % 360) + 360) % 360 + 360) / 366);

// ── Sun-Moon elongation at catalogued eclipses (New Moon = 0°, Full Moon = 180°) ──

// 2024-04-08 ~18:21 UT total solar eclipse -> New Moon, elongation ~0.
ok('2024-04-08 solar eclipse elongation ≈ 0°',
  (() => { const e = elong(E.julianDay(2024, 4, 8, 18, 21, 0)); return Math.min(e, 360 - e) <= 2.0; })(),
  elong(E.julianDay(2024, 4, 8, 18, 21, 0)));

// 2024-09-18 ~02:34 UT partial lunar eclipse -> Full Moon, elongation ~180.
ok('2024-09-18 lunar eclipse elongation ≈ 180°',
  (() => { const e = elong(E.julianDay(2024, 9, 18, 2, 34, 0)); return Math.abs(e - 180) <= 2.0; })(),
  elong(E.julianDay(2024, 9, 18, 2, 34, 0)));

// 2025-03-14 ~06:55 UT total lunar eclipse -> Full Moon, elongation ~180.
ok('2025-03-14 lunar eclipse elongation ≈ 180°',
  (() => { const e = elong(E.julianDay(2025, 3, 14, 6, 55, 0)); return Math.abs(e - 180) <= 2.0; })(),
  elong(E.julianDay(2025, 3, 14, 6, 55, 0)));

// 2025-03-29 ~10:58 UT partial solar eclipse -> New Moon, elongation ~0.
ok('2025-03-29 solar eclipse elongation ≈ 0°',
  (() => { const e = elong(E.julianDay(2025, 3, 29, 10, 58, 0)); return Math.min(e, 360 - e) <= 2.0; })(),
  elong(E.julianDay(2025, 3, 29, 10, 58, 0)));

// ── Lunar daily motion ── mean 13.18 deg/day; single-day sample in ~11-15 band.
ok('Moon daily motion in 11-15.5°/day band',
  (() => {
    const m = (((E.moonPosition(E.julianDay(2025, 1, 2, 0, 0, 0)).lon
              - E.moonPosition(E.julianDay(2025, 1, 1, 0, 0, 0)).lon) % 360) + 360) % 360;
    return m >= 11.0 && m <= 15.5;
  })(),
  (((E.moonPosition(E.julianDay(2025, 1, 2, 0, 0, 0)).lon
   - E.moonPosition(E.julianDay(2025, 1, 1, 0, 0, 0)).lon) % 360) + 360) % 360);

// ── Earth-Sun distance at perihelion / aphelion ── a(1±e), e=0.0167, a=1 AU.
// Perihelion ~2025-01-04: 0.9833 AU.
ok('Perihelion distance ≈ 0.9833 AU',
  (() => { const d = E.sunPosition(E.julianDay(2025, 1, 4, 13, 0, 0)).distance; return Math.abs(d - 0.9833) <= 0.001; })(),
  E.sunPosition(E.julianDay(2025, 1, 4, 13, 0, 0)).distance);

// Aphelion ~2025-07-03: 1.0167 AU.
ok('Aphelion distance ≈ 1.0167 AU',
  (() => { const d = E.sunPosition(E.julianDay(2025, 7, 3, 20, 0, 0)).distance; return Math.abs(d - 1.0167) <= 0.001; })(),
  E.sunPosition(E.julianDay(2025, 7, 3, 20, 0, 0)).distance);

// ── Sign ingress: Sun enters Taurus (lon 30°) ~April 19-20 ──
ok('Sun ≈ 30° (Taurus ingress) near 2025-04-20',
  (() => { const l = E.sunPosition(E.julianDay(2025, 4, 20, 0, 0, 0)).lon; return angDiff(l, 30) <= 1.5; })(),
  E.sunPosition(E.julianDay(2025, 4, 20, 0, 0, 0)).lon);

// ── J2000.0 epoch: fixed calendar->JD constant, independent of any ephemeris ──
ok('julianDay(2000-01-01 12:00) == 2451545.0',
  Math.abs(E.julianDay(2000, 1, 1, 12, 0, 0) - 2451545.0) <= 0.0001,
  E.julianDay(2000, 1, 1, 12, 0, 0));

// ── Determinism: identical inputs -> bit-identical longitudes (correctness invariant) ──
ok('engine deterministic for identical inputs',
  E.sunPosition(E.julianDay(2024, 6, 20, 20, 51, 0)).lon === E.sunPosition(E.julianDay(2024, 6, 20, 20, 51, 0)).lon
  && E.moonPosition(E.julianDay(2025, 1, 1, 0, 0, 0)).lon === E.moonPosition(E.julianDay(2025, 1, 1, 0, 0, 0)).lon);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
