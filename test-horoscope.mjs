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
ok('method note present', typeof aries.methodNote === 'string' && aries.methodNote.includes('reflection, not as fact'));
// Step 10e: the page says "12:00 UT" once (hero); the panel note must not repeat it,
// and reader copy uses plain words, not model shorthand.
ok('method note does not repeat 12:00 UT', !/12:00\s*UT/i.test(aries.methodNote), aries.methodNote);
ok('method note has no model shorthand', !/VSOP87|ELP2000|J2000/.test(aries.methodNote), aries.methodNote);
ok('lunar phase is sentence case', !/Waxing Gibbous|Waning Gibbous|Waxing Crescent|Waning Crescent|First Quarter|Last Quarter/.test(aries.overview + (aries.skyFacts || []).join(' ')));

// Step 10e: PEOPLE / WORK / PACE (and the today line and "use this") never repeat a
// sentence word for word across two or more signs on the same day. Checked for all
// 12 signs over 120 consecutive days plus fixed dates around retrogrades.
const splitSentences = (t) => String(t || '').split(/(?<=[.!?])\s+/).map((x) => x.trim()).filter(Boolean);
const OLD_TEMPLATES = ['lead with sincerity over spectacle', 'direct drive wisely, not impatiently', 'Build energy gradually', 'body-mind balance'];
let dupDays = 0, dupExample = '', oldHits = 0, daysChecked = 0;
const start = new Date(2026, 9, 23);
const extra = [new Date(2026, 1, 26), new Date(2026, 6, 10), new Date(2027, 2, 20), new Date(2030, 5, 1)];
const days = [...Array.from({ length: 120 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)), ...extra];
for (const day of days) {
  daysChecked++;
  const seen = new Map();
  let dup = false;
  for (const s of SIGNS) {
    const r = H.getDailyHoroscope(s, day);
    for (const field of ['love', 'career', 'health', 'todayLine', 'useThis']) {
      for (const sentence of splitSentences(r[field])) {
        if (OLD_TEMPLATES.some((t) => sentence.includes(t))) oldHits++;
        const prev = seen.get(sentence);
        if (prev && prev !== s) { dup = true; if (!dupExample) dupExample = `${day.toDateString()} ${prev}/${s} ${field}: "${sentence}"`; }
        else seen.set(sentence, s);
      }
    }
  }
  if (dup) dupDays++;
}
ok(`no PEOPLE/WORK/PACE sentence shared by 2+ signs on the same day (${daysChecked} days × 12 signs)`, dupDays === 0, dupExample);
ok('old template sentences are gone', oldHits === 0, oldHits);
const pace = H.getDailyHoroscope('Leo', today).health;
ok('pace is one plain sentence', splitSentences(pace).length === 1 && !/body-mind/.test(pace), pace);
ok('moodScore in range', aries.moodScore >= 12 && aries.moodScore <= 94, aries.moodScore);

const monthly = H.getMonthlyHoroscope('Leo', today);
ok('monthly overview uses ephemeris', monthly.overview.includes('Sun in') || monthly.overview.includes('Jupiter'));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);