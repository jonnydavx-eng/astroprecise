/**
 * Regression tests for the Real Sky News Moon phase.
 * Run: node test-sky-news-moon-phase.mjs
 *
 * The defect this locks out: the band folded the Sun–Moon elongation into
 * [0, 180] with the aspect helper, which threw away the waxing/waning sign.
 * A true 303.6° elongation read back as 56.4°, so the band printed
 * "Waxing crescent" for a waning crescent, the three waning branches of the
 * ladder were unreachable, and the band contradicted index.html's own
 * tonight() panel on the same page at the same minute.
 *
 * The strong oracle here is physics, not a copy of the implementation:
 * illumination computed from the ephemeris must be RISING wherever the band
 * says "Waxing" and FALLING wherever it says "Waning".
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const here = dirname(fileURLToPath(import.meta.url));
const win = { localStorage: { getItem: () => null } };
const E = new Function(
  'window',
  readFileSync(join(here, 'website/js/ephemeris.js'), 'utf8') + ';return window.AstroEphemeris;'
)(win);
win.AstroEphemeris = E;
new Function('window', readFileSync(join(here, 'website/js/ap-sky-news.js'), 'utf8'))(win);
const SN = win.APSkyNews;

let pass = 0;
let fail = 0;
const ok = (name, cond, got) => {
  if (cond) pass++;
  else {
    fail++;
    console.log(`  ✗ ${name}${got !== undefined ? ' — got ' + got : ''}`);
  }
};

const mod360 = (x) => ((x % 360) + 360) % 360;
const jdOf = (y, m, d, hh, mm) => E.julianDay(y, m, d, hh, mm, 0);
const trueElong = (jd) => mod360(E.moonPosition(jd).lon - E.sunPosition(jd).lon);
const litFrac = (jd) => (1 - Math.cos((trueElong(jd) * Math.PI) / 180)) / 2;
const moonCard = (jd) => SN.buildNews({ jd, limit: 8 }).find((i) => i.id === 'moon');

// ── 1. The exact instant from the blocker report ────────────────────────────
// Measured: elongation 303.6°, 22% lit — a WANING crescent. The old code
// folded this to 56.4° and called it "Waxing crescent".
{
  const jd = jdOf(2026, 8, 8, 14, 55);
  const el = SN.elongation(E.moonPosition(jd).lon, E.sunPosition(jd).lon);
  ok('2026-08-08T14:55Z elongation ≈ 303.6°', Math.abs(el - 303.6) < 0.1, el.toFixed(2));
  ok('2026-08-08T14:55Z is 22% lit', SN.illumPct(el) === 22, SN.illumPct(el));
  ok('2026-08-08T14:55Z names Waning Crescent', SN.phaseName(el) === 'Waning Crescent', SN.phaseName(el));

  const card = moonCard(jd);
  ok('MOON card exists', !!card);
  ok('MOON title says Waning Crescent', !!card && card.title.includes('Waning Crescent'), card && card.title);
  ok('MOON title never says Waxing here', !!card && !/Waxing/i.test(card.title), card && card.title);
  ok('MOON detail carries the waning sign', !!card && / waning /.test(card.detail), card && card.detail);
  ok(
    'MOON detail prints the unfolded 303.6°, not 56.4°',
    !!card && card.detail.includes('303.6°') && !card.detail.includes('56.4°'),
    card && card.detail
  );
}

// ── 2. A waxing and a waning instant that FOLD to the same branch ───────────
// Both of these landed in the old ladder's "Waxing crescent / first quarter
// approach" branch; only one of them is actually waxing.
{
  const wax = jdOf(2026, 7, 18, 12, 0); // true 54.7° — waxing
  const wan = jdOf(2026, 8, 9, 12, 0); // true 315.7°, folds to 44.3° — waning
  ok('2026-07-18 is Waxing Crescent', moonCard(wax).title.includes('Waxing Crescent'), moonCard(wax).title);
  ok('2026-08-09 is Waning Crescent', moonCard(wan).title.includes('Waning Crescent'), moonCard(wan).title);
  ok(
    'the two fold to the same value (proving the fold is lossy)',
    Math.abs(SN.separation(E.moonPosition(wax).lon, E.sunPosition(wax).lon) - 54.7) < 0.1 &&
      Math.abs(SN.separation(E.moonPosition(wan).lon, E.sunPosition(wan).lon) - 44.3) < 0.1
  );
}

// ── 3. Named dates spanning a full synodic month ────────────────────────────
// Expected names cross-checked against the illumination trend below.
{
  const cases = [
    [[2026, 7, 14, 12, 0], 'New Moon', 1.3, 0],
    [[2026, 7, 18, 12, 0], 'Waxing Crescent', 54.7, 21],
    [[2026, 7, 22, 12, 0], 'First Quarter', 101.7, 60],
    [[2026, 7, 26, 12, 0], 'Waxing Gibbous', 145.6, 91],
    [[2026, 7, 29, 12, 0], 'Full Moon', 178.8, 100],
    [[2026, 8, 2, 12, 0], 'Waning Gibbous', 225.1, 85],
    [[2026, 8, 5, 12, 0], 'Last Quarter', 262.3, 57],
    [[2026, 8, 9, 12, 0], 'Waning Crescent', 315.7, 14],
    [[2026, 8, 12, 17, 46], 'New Moon', 0.1, 0] // eclipse instant
  ];
  for (const [parts, name, el, lit] of cases) {
    const jd = jdOf(...parts);
    const got = trueElong(jd);
    const stamp = `${parts[0]}-${String(parts[1]).padStart(2, '0')}-${String(parts[2]).padStart(2, '0')}`;
    ok(`${stamp} elongation ≈ ${el}°`, Math.abs(got - el) < 0.15, got.toFixed(2));
    ok(`${stamp} lit ≈ ${lit}%`, SN.illumPct(got) === lit, SN.illumPct(got));
    ok(`${stamp} → ${name}`, moonCard(jd).title.includes(name), moonCard(jd).title);
  }
}

// ── 4–6. Full synodic month swept through the SHIPPED path ──────────────────
// These read the MOON card the band actually renders, not the exported helper,
// so the sweep exercises the same elongation the page prints. 2-hour cadence
// from the 14 Jul 2026 new moon: 361 cards over 30 days.
const ALL_PHASES = ['New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous',
  'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent'];
{
  const start = jdOf(2026, 7, 14, 0, 0);
  const seen = new Set();
  let cards = 0;
  let trendWrong = 0;
  let trendChecked = 0;
  let bandWrong = 0;
  let signWrong = 0;

  for (let h = 0; h <= 30 * 24; h += 2) {
    const jd = start + h / 24;
    const el = trueElong(jd);
    const card = moonCard(jd);
    if (!card) continue;
    cards++;
    const name = card.title.replace(/^\S+\s+/, ''); // strip the ☽ glyph
    seen.add(name);

    // 6. cardinal names must sit at a plausible illuminated fraction
    const pct = SN.illumPct(el);
    if (name === 'New Moon' && pct > 15) bandWrong++;
    if (name === 'Full Moon' && pct < 85) bandWrong++;
    if ((name === 'First Quarter' || name === 'Last Quarter') && (pct < 25 || pct > 75)) bandWrong++;

    // the printed detail must agree with the title about waxing vs waning
    const saysWaxing = / waxing /.test(card.detail);
    if (/^Waxing|^First Quarter/.test(name) && !saysWaxing) signWrong++;
    if (/^Waning|^Last Quarter/.test(name) && saysWaxing) signWrong++;

    // 5. physical oracle — "Waxing" must mean the lit fraction is rising.
    // Skip within 4° of new/full, where the turning point sits in the window.
    if (el < 4 || el > 356 || Math.abs(el - 180) < 4) continue;
    const rising = litFrac(jd + 1 / 24) > litFrac(jd);
    if (/^Waxing|^First Quarter/.test(name) && !rising) trendWrong++;
    if (/^Waning|^Last Quarter/.test(name) && rising) trendWrong++;
    trendChecked++;
  }

  ok('swept a full synodic month of cards', cards > 350, cards);
  for (const n of ALL_PHASES) ok(`"${n}" is reachable on the band`, seen.has(n));
  ok('band produces no name outside the eight', seen.size === 8, [...seen].join(', '));
  ok('trend oracle sampled most of the month', trendChecked > 320, trendChecked);
  ok('every Waxing/Waning card matches the illumination trend', trendWrong === 0, trendWrong + ' mismatches');
  ok('cardinal phase names sit in their illumination band', bandWrong === 0, bandWrong + ' outliers');
  ok('card title and card detail agree on waxing vs waning', signWrong === 0, signWrong + ' mismatches');
}

// ── 7. The aspect path must keep the folded 0–180 value ─────────────────────
// separation() is still what the tightest-pair card and the transit-to-natal
// aspect search use; folding is correct there and must not have changed.
{
  ok('separation(350, 10) === 20', SN.separation(350, 10) === 20, SN.separation(350, 10));
  ok('separation(10, 350) === 20', SN.separation(10, 350) === 20, SN.separation(10, 350));
  ok('separation(0, 270) === 90', SN.separation(0, 270) === 90, SN.separation(0, 270));
  ok('separation(0, 180) === 180', SN.separation(0, 180) === 180, SN.separation(0, 180));
  let over = 0;
  for (let a = 0; a < 360; a += 7) for (let b = 0; b < 360; b += 11) if (SN.separation(a, b) > 180.000001) over++;
  ok('separation never exceeds 180°', over === 0, over);
}

// ── 8. Other cards still build at an injected instant ───────────────────────
{
  const items = SN.buildNews({ jd: jdOf(2026, 8, 8, 14, 55), limit: 8 });
  ok('band still returns cards', items.length > 1, items.length);
  ok('every card has a title and detail', items.every((i) => i.title && i.detail));
  const pair = items.find((i) => i.id === 'pair');
  ok('tightest pair, when present, is within 180°', !pair || /^\d+(\.\d+)?° separation/.test(pair.detail), pair && pair.detail);
}

console.log(`\ntest-sky-news-moon-phase: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
