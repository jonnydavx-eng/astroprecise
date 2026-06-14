/**
 * Content bank build + parity tests.
 * Run: node test-content-bank.mjs
 */
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)));
const BANK = join(ROOT, 'website/data/content-bank');
const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

let pass = 0;
let fail = 0;
const ok = (name, cond, got) => {
  if (cond) pass++;
  else { fail++; console.log(`  ✗ ${name}${got !== undefined ? ' — ' + got : ''}`); }
};

const manifest = JSON.parse(readFileSync(join(BANK, 'manifest.json'), 'utf8'));
ok('manifest exists', !!manifest.version);
ok('100+ daily readings', manifest.counts.dailyReadings >= 100, manifest.counts.dailyReadings);
ok('planet-in-sign corpus', manifest.counts.planetInSign === 132, manifest.counts.planetInSign);

const today = manifest.daily.start;
const daily = JSON.parse(readFileSync(join(BANK, 'daily', `${today}.json`), 'utf8'));
ok('daily file has 12 signs', SIGNS.every((s) => daily.readings[s]?.overview));
ok('Aries overview cites Moon', daily.readings.Aries.overview.includes('Moon in'));

const win = {};
new Function('window', readFileSync(join(ROOT, 'website/js/ephemeris.js'), 'utf8'))(win);
new Function('window', readFileSync(join(ROOT, 'website/js/horoscope-engine.js'), 'utf8'))(win);
const live = win.HoroscopeEngine.getDailyHoroscope('Aries', new Date(today + 'T12:00:00'));
ok('bank matches live engine overview', daily.readings.Aries.overview === live.overview);

const pis = JSON.parse(readFileSync(join(BANK, 'core/planet-in-sign.json'), 'utf8'));
ok('Sun in Aries text', pis.Sun.Aries.length > 80);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);