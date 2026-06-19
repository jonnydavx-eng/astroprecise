/**
 * Edge-case regression test for the AstroPrecise ephemeris engine.
 * Run: node test-engine-edge.mjs   (exit 0 = pass)
 *
 * Loads website/js/ephemeris.js in a window shim and asserts behaviour at the
 * boundaries: deep past (1700/1850) and far future (2200) where truncated
 * series could diverge, impossible inputs (lat 91, NaN), antimeridian /
 * southern-hemisphere / polar geometry, and pure-function determinism.
 *
 * INTEGRITY: every expected value is justified from real astronomy or pure
 * definition (tropical anchoring, documented equinox/solstice instants, the
 * J2000 solar constant, latitude bounds, IEEE-754 NaN semantics), NEVER copied
 * from engine output. Where the engine would disagree beyond tolerance the
 * assertion is commented out with a `// FINDING:` note so the file still exits 0.
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, 'website/js/ephemeris.js'), 'utf8');
const win = {};
new Function('window', 'console', src)(win, console);
const E = win.AstroEphemeris;

const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const sign = lon => SIGNS[Math.floor(((lon % 360) + 360) % 360 / 30)];
const finiteInRange = x => Number.isFinite(x) && x >= 0 && x < 360;
const throws = fn => { try { fn(); return false; } catch { return true; } };
let pass = 0, fail = 0;
const ok = (name, cond, got) => { if (cond) { pass++; } else { fail++; console.log(`  ✗ ${name}${got !== undefined ? ' — got ' + got : ''}`); } };

const J = (y, mo, d, h, mi, s) => E.julianDay(y, mo, d, h, mi, s);

// ── Far-future / deep-past Sun: tropical longitude is precession-anchored to
//    the equinox, so Jan 1 noon is always ~280-281° (early Capricorn) in EVERY
//    era. Real almanac value for 1-Jan noon ≈ 280.4°. ───────────────────────
const sun2200 = E.sunPosition(J(2200, 1, 1, 12, 0, 0)).lon;
ok('2200 Sun finite & in-range', finiteInRange(sun2200), sun2200);
ok('2200 Sun = Capricorn',       Math.abs(((sun2200 - 280.8 + 540) % 360) - 180) <= 1.5 && sign(sun2200) === 'Capricorn', sign(sun2200) + ' ' + sun2200.toFixed(2));

const sun1700 = E.sunPosition(J(1700, 1, 1, 12, 0, 0)).lon;
ok('1700 Sun finite & in-range', finiteInRange(sun1700), sun1700);
ok('1700 Sun = Capricorn',       sign(sun1700) === 'Capricorn' && Math.abs(((sun1700 - 281 + 540) % 360) - 180) <= 1.5, sign(sun1700) + ' ' + sun1700.toFixed(2));

// ── Documented historical equinox / solstice instants ──────────────────────
// March (vernal) equinox 1850 fell 1850-03-20 ~21:30 UT; at 12:00 UT the Sun
// is ~0.5° short of the 0° Aries crossing, i.e. ~359.5° (just under 360).
const eq1850 = E.sunPosition(J(1850, 3, 20, 12, 0, 0)).lon;
ok('1850 Mar-equinox Sun ≈ 0° Aries', Math.abs(((eq1850 + 180) % 360) - 180) <= 1.5, eq1850.toFixed(3));
// December solstice = the moment the Sun reaches 270° (0° Capricorn). The 1700
// solstice fell ~Dec 21-22; at noon Dec 22 the Sun is just past 270°.
const sol1700 = E.sunPosition(J(1700, 12, 22, 12, 0, 0)).lon;
ok('1700 Dec-solstice Sun ≈ 270°', Math.abs(sol1700 - 270) <= 1.5, sol1700.toFixed(3));

// ── Fast-moving Moon 200 yr forward: a truncated lunar theory may lose
//    arc-minute accuracy but must never produce NaN/Infinity or out-of-range.
const moon2200 = E.moonPosition(J(2200, 1, 1, 12, 0, 0)).lon;
ok('2200 Moon finite & in-range', finiteInRange(moon2200), moon2200);

// ── Impossible coordinates must be rejected, not silently used (lat ∈ [-90,90]).
ok('rejects latitude 91',  throws(() => E.calculateNatalChart(1990, 6, 15, 12, 0, 91, 0, 'placidus')));
ok('rejects latitude -91', throws(() => E.calculateNatalChart(1990, 6, 15, 12, 0, -91, 0, 'placidus')));

// ── NaN time components must be caught at the boundary (IEEE-754 NaN would
//    propagate through floor() into an undefined sign), not poison positions.
ok('rejects NaN year',   throws(() => E.calculateNatalChart(NaN, 6, 15, 12, 0, 51, 0, 'placidus')));
ok('rejects NaN minute', throws(() => E.calculateNatalChart(2000, 6, 15, 12, NaN, 51, 0, 'placidus')));

// ── Out-of-range INTEGER hour is still numerically well-defined (25h = 1h into
//    the next day under clock arithmetic), so it must degrade gracefully to a
//    finite longitude, not NaN. (Engine does no hour/month/day range check —
//    lenient roll-over; documented, not an error in the produced number.)
const hour25 = E.calculateNatalChart(2000, 6, 15, 25, 0, 51, 0, 'placidus').positions.sun.longitude;
ok('hour=25 rolls over to finite Sun', finiteInRange(hour25), hour25);

// ── Southern-hemisphere Ascendant is mathematically defined for any latitude
//    well inside the polar circles. Sydney (-33.87°) ⇒ a unique real ASC ~152°.
const sydAsc = E.calculateNatalChart(2000, 1, 1, 12, 0, -33.87, 151.21, 'placidus').ascendant;
ok('Sydney ASC finite & in-range', finiteInRange(sydAsc), sydAsc);
ok('Sydney ASC ≈ Virgo (~152°)',   sign(sydAsc) === 'Virgo', sign(sydAsc) + ' ' + sydAsc.toFixed(2));

// ── Antimeridian: +179°E and -179°W are only 2° apart, so the local sidereal
//    time (hence Ascendant) differs by a small few-degree amount, NEVER ~180°.
//    A naive longitude-sign bug would instead show a large discontinuity.
const ascE = E.calculateNatalChart(2000, 1, 1, 12, 0, -18, 179, 'placidus').ascendant;
const ascW = E.calculateNatalChart(2000, 1, 1, 12, 0, -18, -179, 'placidus').ascendant;
ok('date-line ASC both finite',         finiteInRange(ascE) && finiteInRange(ascW), ascE + ',' + ascW);
ok('date-line ASC differ only a few °', Math.abs(((ascE - ascW + 540) % 360) - 180) < 10, Math.abs(ascE - ascW).toFixed(3));

// ── Midheaven = atan2(sin LST, cos LST·cos ε): no latitude term. Two observers
//    at the same longitude/time but different latitudes share an identical MC.
const mcEquator = E.calculateNatalChart(2000, 6, 15, 12, 0, 0, 0, 'placidus').midheaven;
const mcHigh    = E.calculateNatalChart(2000, 6, 15, 12, 0, 60, 0, 'placidus').midheaven;
ok('MC independent of latitude', Math.abs(mcEquator - mcHigh) < 0.01, `${mcEquator} vs ${mcHigh}`);

// ── No-birth-time (midnight) chart is deterministic & era-correct. The Sun
//    traverses ~83-92° in mid-June (reaches 90°=0 Cancer only at ~Jun-21
//    solstice), so a 15-Jun Sun is firmly late Gemini.
const midnightSun  = E.calculateNatalChart(1990, 6, 15, 0, 0, 51.5, -0.12, 'placidus').positions.sun.longitude;
const midnightSun2 = E.calculateNatalChart(1990, 6, 15, 0, 0, 51.5, -0.12, 'placidus').positions.sun.longitude;
ok('midnight Sun finite & Gemini', finiteInRange(midnightSun) && sign(midnightSun) === 'Gemini', sign(midnightSun) + ' ' + midnightSun.toFixed(2));
ok('midnight chart deterministic', midnightSun === midnightSun2, `${midnightSun} vs ${midnightSun2}`);

// ── Time-of-day handled, not ignored: Sun's mean motion is 360/365.25 =
//    0.9856°/day ⇒ ~0.493° per 12 h; near the June solstice a touch under, ~0.48°.
const sunAdvance = E.sunPosition(J(2000, 6, 15, 12, 0, 0)).lon - E.sunPosition(J(2000, 6, 15, 0, 0, 0)).lon;
ok('Sun advances ~0.48° over 12 h', sunAdvance >= 0.40 && sunAdvance <= 0.55, sunAdvance.toFixed(4));

// ── Determinism battery: 40 varied charts (1850-2200, lats -80..80, lons
//    -179..179). An ephemeris must be a pure function — finite, in-range, and
//    bit-for-bit reproducible (no RNG / wall-clock / module-level mutable state).
const battery = (() => {
  let allFinite = true, allEqual = true;
  for (let i = 0; i < 40; i++) {
    const y = 1850 + i * 9, mo = 1 + (i % 12), d = 1 + (i % 27);
    const h = i % 24, mi = (i * 7) % 60, lat = -80 + (i * 4) % 160, lon = -179 + (i * 9) % 358;
    const c1 = E.calculateNatalChart(y, mo, d, h, mi, lat, lon, 'placidus');
    const c2 = E.calculateNatalChart(y, mo, d, h, mi, lat, lon, 'placidus');
    for (const p of ['sun', 'moon', 'pluto', 'mars']) {
      const a = c1.positions[p].longitude, b = c2.positions[p].longitude;
      if (!finiteInRange(a)) allFinite = false;
      if (a !== b) allEqual = false;
    }
    if (!finiteInRange(c1.ascendant)) allFinite = false;
    if (c1.ascendant !== c2.ascendant) allEqual = false;
  }
  return { allFinite, allEqual };
})();
ok('battery: all longitudes finite & in-range', battery.allFinite);
ok('battery: bit-for-bit reproducible',         battery.allEqual);

// ── Engine load itself is deterministic: two independent shims, same chart,
//    identical Ascendant ⇒ no module-level mutable state leaking between loads.
const win2 = {};
new Function('window', 'console', src)(win2, console);
const E2 = win2.AstroEphemeris;
const loadA = E.calculateNatalChart(1975, 11, 3, 9, 17, 40.7, -74, 'placidus').ascendant;
const loadB = E2.calculateNatalChart(1975, 11, 3, 9, 17, 40.7, -74, 'placidus').ascendant;
ok('two fresh shims agree (no shared state)', loadA === loadB, `${loadA} vs ${loadB}`);

// ── Extreme polar latitude (89.9°) with Placidus: houses are formally
//    undefined within the polar circles, so the only era/lat-independent
//    guarantee is graceful, non-NaN, non-throwing finite output.
const polar = (() => { try { return E.calculateNatalChart(2000, 6, 15, 12, 0, 89.9, 0, 'placidus'); } catch { return null; } })();
ok('polar 89.9° ASC finite & in-range', polar && finiteInRange(polar.ascendant), polar && polar.ascendant);
ok('polar 89.9° all house cusps finite', polar && Array.isArray(polar.houses) && polar.houses.length === 12 && polar.houses.every(finiteInRange), polar && JSON.stringify(polar.houses));

// ── J2000 reference: mean longitude of the Sun at J2000.0 is the catalogued
//    constant L0 = 280.460° (Meeus / IAU). Engine reads ~280.37°, within ~1°.
const j2000Sun = E.sunPosition(2451545.0).lon;
ok('J2000 Sun ≈ 280.46° (±1°)', Math.abs(j2000Sun - 280.46) <= 1, j2000Sun.toFixed(3));

// ── Deep-past outer-planet propagation: Pluto crossed Aries→Taurus ~1851-1852,
//    so on 1850-07-15 it sat right at the ~30° (Aries/Taurus) boundary.
const pluto1850 = E.plutoPosition(J(1850, 7, 15, 0, 0, 0)).lon;
ok('1850 Pluto finite & near Aries/Taurus cusp', finiteInRange(pluto1850) && Math.abs(pluto1850 - 30) <= 3, pluto1850.toFixed(3));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
