/**
 * Golden-value regression test for the AstroPrecise ephemeris engine.
 * Run: node test-engine.mjs   (exit 0 = pass)
 * Loads website/js/ephemeris.js in a window shim and asserts known sky facts,
 * so future edits can't silently reintroduce the Ascendant flip, the crude
 * planet path, the Pluto error, or broken houses.
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
let pass = 0, fail = 0;
const ok = (name, cond, got) => { if (cond) { pass++; } else { fail++; console.log(`  ✗ ${name}${got !== undefined ? ' — got ' + got : ''}`); } };

// ── Planet signs for a known chart (1990-06-14 02:42 UT, Skinningrove) ──
const c = E.calculateNatalChart(1990, 6, 14, 2, 42, 54.57, -0.9, 'placidus');
ok('Sun 1990 = Gemini',   sign(c.positions.sun.longitude) === 'Gemini', sign(c.positions.sun.longitude));
ok('Moon 1990 = Aquarius',sign(c.positions.moon.longitude) === 'Aquarius', sign(c.positions.moon.longitude));
ok('Pluto 1990 = Scorpio',sign(c.positions.pluto.longitude) === 'Scorpio', sign(c.positions.pluto.longitude));
ok('Mars 1990 = Aries',   sign(c.positions.mars.longitude) === 'Aries', sign(c.positions.mars.longitude));
ok('Saturn 1990 retro',   c.positions.saturn.retrograde === true);

// ── Pluto sign timeline (the linear-formula bug made these wrong) ──
const plutoOn = (y,m,d) => sign(E.plutoPosition(E.julianDay(y,m,d,0,0,0)).lon);
ok('Pluto 1945 = Leo',         plutoOn(1945,6,1) === 'Leo', plutoOn(1945,6,1));
ok('Pluto 2001 = Sagittarius', plutoOn(2001,6,1) === 'Sagittarius', plutoOn(2001,6,1));
ok('Pluto 2015 = Capricorn',   plutoOn(2015,6,1) === 'Capricorn', plutoOn(2015,6,1));
ok('Pluto 2026 = Aquarius',    plutoOn(2026,6,1) === 'Aquarius', plutoOn(2026,6,1));

// ── Ascendant must sit just behind a rising Sun (pre-dawn) — catches the 180° flip ──
ok('pre-dawn ASC = Gemini',    sign(c.ascendant) === 'Gemini', sign(c.ascendant));

// ── Equinox: Sun ~0° Aries on 20 Mar ──
ok('equinox Sun ≈ 0° Aries',   (() => { const l = E.sunPosition(E.julianDay(2025,3,20,12,0,0)).lon; return l > 358 || l < 2; })());

// ── Houses monotonic + angles consistent ──
ok('Placidus cusps monotonic', (() => { for (let i=0;i<12;i++){ const g=(((c.houses[(i+1)%12]-c.houses[i])%360)+360)%360; if (g<0.5||g>175) return false; } return true; })());
ok('H1 == ASC',                Math.abs(c.houses[0] - c.ascendant) < 0.01);

// ── Validation throws on impossible input ──
const throws = fn => { try { fn(); return false; } catch { return true; } };
ok('rejects latitude 130',     throws(() => E.calculateNatalChart(1990,6,15,12,0,130,0)));
ok('rejects NaN date',         throws(() => E.calculateNatalChart(NaN,6,15,12,0,51,0)));

// ── Dead crude path stays gone ──
ok('geocentricPlanetLongitude removed', E.geocentricPlanetLongitude === undefined);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
