/**
 * Horoscope engine regression tests — transit-based readings must match live sky.
 * Run: node test-horoscope.mjs
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const here = dirname(fileURLToPath(import.meta.url));
const win = {};
new Function('window', readFileSync(join(here, 'website/js/ephemeris.js'), 'utf8'))(win);
new Function('window', readFileSync(join(here, 'website/js/horoscope-engine.js'), 'utf8'))(win);

const H = win.HoroscopeEngine;
const E = win.AstroEphemeris;
const SIGNS = H.SIGNS;

let pass = 0, fail = 0;
const ok = (name, cond, got) => {
  if (cond) pass++;
  else { fail++; console.log(`  ✗ ${name}${got !== undefined ? ' — got ' + got : ''}`); }
};

const sign = lon => SIGNS[Math.floor(((lon % 360) + 360) % 360 / 30)];
const today = new Date(2026, 5, 14); // 14 Jun 2026 local
const jd = E.julianDay(2026, 6, 14, 12, 0, 0);
const moonSign = sign(E.moonPosition(jd).lon);

const aries = H.getDailyHoroscope('Aries', today);
const taurus = H.getDailyHoroscope('Taurus', today);

ok('returns daily reading', !!aries && !!aries.overview);
ok('overview cites real Moon sign', aries.overview.includes('Moon in ' + moonSign), moonSign);
ok('skyFacts include Moon', (aries.skyFacts || []).some(f => f.indexOf('Moon in ' + moonSign) >= 0));
ok('different signs differ same day', aries.overview !== taurus.overview);
ok('deterministic same sign+date', H.getDailyHoroscope('Aries', today).overview === aries.overview);
ok('no fake static aspect filler', !aries.overview.includes('your ruling planet, forms a dynamic trine'));
ok('method note present', typeof aries.methodNote === 'string' && aries.methodNote.includes('VSOP87'));
ok('moodScore in range', aries.moodScore >= 12 && aries.moodScore <= 94, aries.moodScore);

const monthly = H.getMonthlyHoroscope('Leo', today);
ok('monthly overview uses ephemeris', monthly.overview.includes('Sun in') || monthly.overview.includes('Jupiter'));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);