/**
 * Content bank build + parity tests.
 * Run: node test-content-bank.mjs
 */
import { readFileSync, existsSync, readdirSync } from 'fs';
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

/* No money advice in the served daily/monthly bank. The bank is read before
 * HoroscopeEngine, so a stale bank would keep showing advice the engine no
 * longer writes. Same pattern as the guard in tools/build-content-bank.mjs. */
const builder = readFileSync(join(ROOT, 'tools/build-content-bank.mjs'), 'utf8');
const reSrc = builder.match(/const MONEY_ADVICE = \/(.+)\/i;/);
ok('builder has a MONEY_ADVICE guard', !!reSrc);
const MONEY_ADVICE = new RegExp(reSrc ? reSrc[1] : 'price your', 'i');
for (const s of ['price your work fairly', 'Negotiate scope and worth early', 'a keep-or-spend choice', 'pay down debts']) {
  ok(`guard catches "${s}"`, MONEY_ADVICE.test(s));
}
for (const s of ['money, values, and what you choose to keep', 'pitch, write, negotiate, and follow up', 'notice which work feels worth your effort']) {
  ok(`guard allows "${s}"`, !MONEY_ADVICE.test(s));
}
let scanned = 0;
const moneyHits = [];
const usDates = [];
for (const sub of ['daily', 'monthly']) {
  for (const name of readdirSync(join(BANK, sub)).filter((n) => n.endsWith('.json'))) {
    const text = readFileSync(join(BANK, sub, name), 'utf8');
    scanned++;
    const m = text.match(MONEY_ADVICE);
    if (m) moneyHits.push(`${sub}/${name}: "${m[0]}"`);
    if (sub === 'daily' && /"date":"[A-Z][a-z]+day, [A-Z][a-z]+ \d{1,2}, \d{4}"/.test(text)) usDates.push(name);
  }
}
ok('scanned daily + monthly files', scanned >= 100, scanned);
ok('no money advice in daily/monthly bank', moneyHits.length === 0, moneyHits.slice(0, 5).join('; '));
ok('daily bank dates are en-GB like the engine', usDates.length === 0, usDates.slice(0, 5).join(', '));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);