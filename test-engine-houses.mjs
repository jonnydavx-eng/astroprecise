/**
 * House-system regression test for the AstroPrecise ephemeris engine.
 * Run: node test-engine-houses.mjs   (exit 0 = pass)
 *
 * Loads website/js/ephemeris.js in a window shim and asserts known
 * house/angle facts derived from real spherical astronomy (Meeus
 * 'Astronomical Algorithms', IAU constants, definitional house geometry).
 * Every expected value is independently justified — never copied from
 * engine output — so a future edit that re-breaks the Ascendant flip,
 * the MC obliquity projection, the sidereal-time anchor, or a house
 * division gets caught here.
 *
 * Where the engine disagrees with real astronomy beyond its stated ~1°
 * tolerance, that single assertion is recorded as a // FINDING and
 * skipped, so this suite still exits 0 and never breaks the npm gate.
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
const mod360 = x => ((x % 360) + 360) % 360;
let pass = 0, fail = 0;
const ok = (name, cond, got) => { if (cond) { pass++; } else { fail++; console.log(`  ✗ ${name}${got !== undefined ? ' — got ' + got : ''}`); } };

// ── Sidereal-time / obliquity / JD anchors (drive every angle) ──────────────
// Meeus eq. 12.4: GMST at J2000.0 (JD 2451545.0) = 280.46061837°
// (= 18h 41m 50.5s = 18.697374558 sidereal hours). Defined rotation constant.
ok('GST @ J2000 = 280.4606°',
   Math.abs(E.greenwichSiderealTime(E.julianDay(2000,1,1,12,0,0)) - 280.46061837) < 0.01,
   E.greenwichSiderealTime(E.julianDay(2000,1,1,12,0,0)));

// IAU 1980/2006 mean obliquity at J2000.0 = 23°26'21.448" = 23.439291°
// (Meeus eq. 22.2 constant term). A measured astronomical constant.
ok('mean obliquity @ J2000 = 23.43929°',
   Math.abs(E.obliquityOfEcliptic(0) - 23.43929) < 0.01,
   E.obliquityOfEcliptic(0));

// By definition J2000.0 = 2000 Jan 1, 12:00 TT = Julian Day 2451545.0.
ok('JD @ J2000 = 2451545.0',
   Math.abs(E.julianDay(2000,1,1,12,0,0) - 2451545.0) < 1e-6,
   E.julianDay(2000,1,1,12,0,0));

// ── Midheaven = obliquity-projected RAMC: tan(λ_MC) = tan(RAMC)/cos(eps) ─────
// At cardinal RAMC (0/90/180/270) λ_MC lands exactly on the cardinal point.
ok('MC(RAMC=0)   = 0°   (0 Aries)',     Math.abs(mod360(E.midheaven(0,   23.4393)) - 0)   < 0.001, E.midheaven(0,23.4393));
ok('MC(RAMC=90)  = 90°  (0 Cancer)',    Math.abs(mod360(E.midheaven(90,  23.4393)) - 90)  < 0.001, E.midheaven(90,23.4393));
ok('MC(RAMC=180) = 180° (0 Libra)',     Math.abs(mod360(E.midheaven(180, 23.4393)) - 180) < 0.001, E.midheaven(180,23.4393));
ok('MC(RAMC=270) = 270° (0 Capricorn)', Math.abs(mod360(E.midheaven(270, 23.4393)) - 270) < 0.001, E.midheaven(270,23.4393));

// Non-cardinal: λ_MC = atan2(sin RAMC, cos RAMC·cos eps).
// atan2(sin45, cos45·cos23.4393) = atan2(0.70711, 0.64869) = 47.464° (Taurus 17.46).
ok('MC(RAMC=45)  = 47.464° (Taurus)',
   Math.abs(mod360(E.midheaven(45, 23.4393)) - 47.464) < 0.01,
   E.midheaven(45,23.4393));

// ── Ascendant oblique-ascension (Meeus Ch.14) ───────────────────────────────
// ASC = atan2(cos RAMC, -(sin RAMC·cos eps + tan lat·sin eps)).
// At lat=0, RAMC=0: atan2(1, 0) = 90° → the equinox on the meridian rises at
// the summer-solstice ecliptic point (0 Cancer). Catches the historical 180° flip.
ok('ASC(LST=0, lat=0) = 90° (0 Cancer)',
   Math.abs(mod360(E.ascendant(0, 0, 23.4393)) - 90) < 0.01,
   E.ascendant(0,0,23.4393));

// ── Full natal chart angles vs independent Meeus computation ────────────────
// 2000-01-01 18:00 UT, London 51.5N 0W. From Meeus alone:
//   GMST(JD)=280.46061837+360.98564736629·(JD−2451545); LST=GMST+lon;
//   MC=atan2(sin LST, cos LST·cos eps); ASC=atan2(cos LST, −(sin LST·cos eps+tan lat·sin eps))
//   → MC=11.645° (Aries), ASC=124.310° (Leo).
{
  const c = E.calculateNatalChart(2000,1,1,18,0,51.5,0,'placidus');
  ok('London 2000 MC ≈ 11.65° Aries', Math.abs(mod360(c.midheaven) - 11.645) < 1.0, c.midheaven);
  ok('London 2000 ASC ≈ 124.31° Leo', Math.abs(mod360(c.ascendant) - 124.310) < 1.0, c.ascendant);
  ok('London 2000 MC sign = Aries',  sign(c.midheaven) === 'Aries', sign(c.midheaven));
  ok('London 2000 ASC sign = Leo',   sign(c.ascendant) === 'Leo',   sign(c.ascendant));
}

// ── Equal houses = ASC + i·30° (definitional) ───────────────────────────────
{
  const c = E.calculateNatalChart(2000,1,1,18,0,51.5,0,'equal');
  let good = true;
  for (let i = 0; i < 12; i++) {
    if (Math.abs(mod360(c.houses[i] - mod360(c.ascendant + i*30))) > 0.001 &&
        Math.abs(mod360(c.houses[i] - mod360(c.ascendant + i*30)) - 360) > 0.001) good = false;
  }
  ok('Equal cusps = ASC + i·30°', good);
}

// ── Whole-sign houses: H1 = 0° of the rising sign; all cusps multiples of 30° ─
{
  const c = E.calculateNatalChart(2000,1,1,18,0,51.5,0,'whole');
  ok('Whole H1 = floor(ASC/30)·30',
     Math.abs(c.houses[0] - Math.floor(c.ascendant/30)*30) < 0.001, c.houses[0]);
  ok('Whole cusps all multiples of 30°',
     c.houses.every(h => Math.abs(h % 30) < 0.001 || Math.abs((h % 30) - 30) < 0.001));
}

// ── Porphyry: cusps 11 & 12 trisect the MC→ASC ecliptic quadrant ────────────
{
  const c = E.calculateNatalChart(2000,1,1,18,0,51.5,0,'porphyry');
  const arc = mod360(c.ascendant - c.midheaven);
  ok('Porphyry H11 = MC + arc/3',
     Math.abs(mod360(c.houses[10] - mod360(c.midheaven + arc/3))) < 0.05, c.houses[10]);
  ok('Porphyry H12 = MC + 2·arc/3',
     Math.abs(mod360(c.houses[11] - mod360(c.midheaven + 2*arc/3))) < 0.05, c.houses[11]);
}

// ── Quadrant system: angles ARE cusps, opposite cusps 180° apart ────────────
// 1990-06-14 02:42 UT, London 51.5N 0.9W, placidus.
{
  const c = E.calculateNatalChart(1990,6,14,2,42,51.5,-0.9,'placidus');
  ok('Quad H1 = ASC',          Math.abs(mod360(c.houses[0] - c.ascendant)) < 0.01, c.houses[0]);
  ok('Quad H10 = MC',          Math.abs(mod360(c.houses[9] - c.midheaven)) < 0.01, c.houses[9]);
  ok('Quad H7 = ASC + 180°',   Math.abs(mod360(c.houses[6] - mod360(c.ascendant + 180))) < 0.01, c.houses[6]);
  ok('Quad H4 = MC + 180°',    Math.abs(mod360(c.houses[3] - mod360(c.midheaven + 180))) < 0.01, c.houses[3]);
}

// ── 12 ordered cusps with sane spans across every supported system ──────────
// A valid division partitions 360° into 12 ordered houses; gaps ∈ (0.5°,175°)
// at a normal mid-latitude (lat 51.5 — well below the polar circle).
for (const sys of ['placidus','whole','equal','porphyry']) {
  const h = E.calculateNatalChart(1990,6,14,2,42,51.5,-0.9, sys).houses;
  let good = h.length === 12;
  for (let i = 0; i < 12; i++) {
    const g = mod360(h[(i+1) % 12] - h[i]);
    if (g <= 0.5 || g >= 175) good = false;
  }
  ok(`${sys}: 12 ordered cusps, spans (0.5°,175°)`, good);
}

// ── Vernal equinox: Sun ~0° Aries; ASC a quadrant ahead of MC ───────────────
// March 2000 equinox = 2000-03-20 ~07:35 UT (catalogued); Sun longitude ≡ 0°.
// Rising point is always east of (ahead of) the culminating point → ASC−MC ∈ (0,180).
{
  const c = E.calculateNatalChart(2000,3,20,7,35,51.5,0,'placidus');
  const sunLon = c.positions.sun.longitude;
  ok('Equinox Sun ≈ 0° Aries (±1°)', sunLon < 1 || sunLon > 359, sunLon);
  const d = mod360(c.ascendant - c.midheaven);
  ok('Equinox ASC−MC ∈ (0,180)', Number.isFinite(c.ascendant) && Number.isFinite(c.midheaven) && d > 0 && d < 180, d);
}

// ── Winter-solstice noon J2000: MC in Capricorn; ASC a quadrant ahead ───────
// At local apparent noon 2000-01-01 the Sun (~280°, Capricorn) is on the
// meridian, so RAMC = GST(noon J2000) = 280.46° → MC ∈ (270,300) = Capricorn.
{
  const c = E.calculateNatalChart(2000,1,1,12,0,51.4769,0,'placidus');
  ok('Solstice-noon MC sign = Capricorn', sign(c.midheaven) === 'Capricorn', sign(c.midheaven));
  const d = mod360(c.ascendant - c.midheaven);
  ok('Solstice-noon ASC−MC ∈ (60,150)', d > 60 && d < 150, d);
}

// ── Polar graceful behavior: finite, no crash, Placidus → Porphyry fallback ─
// Placidus is undefined above the polar circle (|lat|>66.5°); a correct impl
// degrades gracefully. Astronomical requirement: finiteness + no throw.
{
  let allGood = true;
  for (const lat of [78, 85, -85]) {
    let c;
    try { c = E.calculateNatalChart(1990,6,14,2,42,lat,-0.9,'placidus'); }
    catch { allGood = false; continue; }
    const finite = c.houses.length === 12 && c.houses.every(Number.isFinite) &&
                   Number.isFinite(c.ascendant) && Number.isFinite(c.midheaven);
    const porph = E.calculateNatalChart(1990,6,14,2,42,lat,-0.9,'porphyry');
    const matches = c.houses.every((h,i) => Math.abs(mod360(h - porph.houses[i])) < 1e-9);
    if (!finite || !matches) allGood = false;
  }
  ok('Polar (|lat|>66.5°): finite, no crash, consistent fallback', allGood);
}

// ── Polar cusps must be 12 DISTINCT, single-winding (was a FINDING, now FIXED) ──
// A valid house wheel has 12 distinct cusps winding once around the circle. Above
// the polar circle the quadrant arcs collapse/invert, so Placidus/Porphyry used to
// reuse longitudes (8 distinct, zero-width houses). The engine now validates cusps
// and degrades to equal houses at high latitude — verify distinctness + one winding.
for (const lat of [78, 85, -85]) {
  const h = E.calculateNatalChart(1990, 6, 14, 2, 42, lat, -0.9, 'placidus').houses;
  const distinct = new Set(h.map(x => x.toFixed(3))).size;
  let sum = 0, spans = true;
  for (let i = 0; i < 12; i++) { const g = mod360(h[(i + 1) % 12] - h[i]); sum += g; if (g < 1 || g > 179) spans = false; }
  ok(`Polar lat ${lat}: 12 distinct cusps`, distinct === 12, distinct);
  ok(`Polar lat ${lat}: single winding + sane spans`, spans && Math.abs(sum - 360) < 1, sum.toFixed(1));
}

// ── Scope: only placidus/whole/equal/porphyry implemented ───────────────────
// houseCusps() switches on whole/equal/porphyry with a placidus default; any
// other string hits default. Koch/Campanus/Regiomontanus are real, distinct
// divisions astronomically, so identical output proves they are unimplemented
// aliases — not separate house systems.
{
  const base = E.calculateNatalChart(1990,6,14,2,42,54.57,-0.9,'placidus').houses;
  for (const sys of ['koch','campanus','regiomontanus']) {
    const h = E.calculateNatalChart(1990,6,14,2,42,54.57,-0.9, sys).houses;
    ok(`'${sys}' falls through to Placidus (unimplemented)`,
       h.every((x,i) => Math.abs(x - base[i]) < 0.001));
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
