#!/usr/bin/env node
/**
 * Pre-generate AstroPrecise content bank (static JSON served from website/data/).
 *
 *   node tools/build-content-bank.mjs [--days 90] [--months 6] [--keep-days 7]
 *
 * Outputs:
 *   website/data/content-bank/manifest.json
 *   website/data/content-bank/daily/YYYY-MM-DD.json  (12 signs/day)
 *   website/data/content-bank/monthly/YYYY-MM.json   (12 signs/month)
 *   website/data/content-bank/core/*.json            (natal corpus)
 *
 * Anchor semantics (fixed 2026-07-10): daily file YYYY-MM-DD.json contains
 * readings computed at 12:00 UT of that calendar date, on ANY build machine.
 * The engine (horoscope-engine.js jdAtLocalNoon) reads the LOCAL calendar
 * components of the Date it is given and anchors at hour 12 of Meeus
 * julianDay — which is UT — so we (a) derive the date range in UTC and
 * (b) hand the engine a Date constructed from local components equal to the
 * target UTC calendar date. The per-reading methodNote emitted into the bank
 * is corrected to say "12:00 UT" (the engine's own string still says "local
 * noon" — engine files are owned by the engine sync; the bank must not
 * repeat the mislabel meanwhile). Guarded: the build fails loudly if a
 * "local noon" claim survives into the bank.
 *
 * Idempotency (fixed 2026-07-10): a file is rewritten ONLY when its content
 * (ignoring the volatile `generated` stamp) actually changed; unchanged days
 * stay byte-identical across runs, so a rerun produces zero diffs and the
 * service-worker precache never churns on no-op refreshes. `generated` is
 * refreshed only when real content changes.
 *
 * Pruning: daily files older than (today UTC − keep-days) and monthly files
 * older than the previous month are deleted. Manifest ranges/counts reflect
 * what is on disk AFTER the run, not just what this run generated.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'website/data/content-bank');
const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];
const PLANETS = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'Chiron',
];
const DAY_MS = 86400000;

function parseArgs(argv) {
  const a = { days: 90, months: 6, keepDays: 7 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--days' && argv[i + 1]) { a.days = Number(argv[++i]); }
    if (argv[i] === '--months' && argv[i + 1]) { a.months = Number(argv[++i]); }
    if (argv[i] === '--keep-days' && argv[i + 1]) { a.keepDays = Number(argv[++i]); }
  }
  return a;
}

function loadEngines() {
  const win = {};
  new Function('window', readFileSync(join(ROOT, 'website/js/ephemeris.js'), 'utf8'))(win);
  new Function('window', readFileSync(join(ROOT, 'website/js/horoscope-engine.js'), 'utf8'))(win);
  new Function('window', 'console', 'document', readFileSync(join(ROOT, 'website/js/interpretations.js'), 'utf8'))(win, console, undefined);
  return {
    H: win.HoroscopeEngine,
    I: win.Interpretations || win.AstroInterpretations,
  };
}

/* ---------- UTC date helpers (build-machine timezone must not matter) ---------- */

const NOW = new Date();
const TODAY_UTC_MS = Date.UTC(NOW.getUTCFullYear(), NOW.getUTCMonth(), NOW.getUTCDate());

function utcDay(offsetDays) { return new Date(TODAY_UTC_MS + offsetDays * DAY_MS); }
function isoOfUTC(d) { return d.toISOString().slice(0, 10); }
function monthKeyOf(y, mZeroBased) {
  return `${y}-${String(mZeroBased + 1).padStart(2, '0')}`;
}
/** Date whose LOCAL calendar components equal the target UTC calendar date —
 *  the engine anchors at 12:00 UT of those components (see header). */
function engineDateFor(dUTC, dayOfMonth) {
  return new Date(dUTC.getUTCFullYear(), dUTC.getUTCMonth(), dayOfMonth ?? dUTC.getUTCDate(), 12, 0, 0, 0);
}

function ensureDir(p) {
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
}

/* ---------- methodNote honesty guard ---------- */

function fixMethodNote(note) {
  if (typeof note !== 'string') return note;
  // The engine used to claim "local noon"; it anchors at 12:00 UT and now says so
  // (horoscope-engine.js, 2026-08-09). The guard stays: if the mislabel ever comes
  // back, the build fails rather than shipping it.
  if (/local noon/i.test(note)) {
    throw new Error(
      'methodNote claims "local noon" — the engine anchors at 12:00 UT. Fix the wording in website/js/horoscope-engine.js.',
    );
  }
  return note;
}

/* ---------- reader-vocabulary guard ----------
 * Words the audience does not use and that this brand does not put in front of a
 * visitor. Every string the bank emits is prose that gets rendered, so the guard
 * runs over the whole reading. Machine keys (transits[].aspect) are exempt by
 * name — they are never printed raw; the page prints aspectLabel / aspectPhrase.
 * If this throws, fix the WORDING IN THE ENGINE, never the 200 output files.
 */
const BANNED_WORDS = /\b(sextiles?|ephemeri(?:s|des)|orbs?|midheavens?|arcminutes?)\b/i;
const MACHINE_KEYS = new Set(['aspect', 'planet', 'sign', 'orb']);

function assertReaderSafe(value, where) {
  if (typeof value === 'string') {
    const hit = value.match(BANNED_WORDS);
    if (hit) {
      throw new Error(
        `Banned reader vocabulary "${hit[0]}" in ${where}: ${JSON.stringify(value.slice(0, 160))}\n` +
        '  → fix the wording in website/js/horoscope-engine.js or website/js/interpretations.js, then rebuild.',
      );
    }
    return;
  }
  if (Array.isArray(value)) { value.forEach((v, i) => assertReaderSafe(v, `${where}[${i}]`)); return; }
  if (value && typeof value === 'object') {
    for (const k of Object.keys(value)) {
      if (MACHINE_KEYS.has(k)) continue;
      assertReaderSafe(value[k], `${where}.${k}`);
    }
  }
}

function stripReading(r) {
  if (!r) return null;
  const out = {
    sign: r.sign,
    date: r.date,
    overview: r.overview,
    love: r.love,
    career: r.career,
    health: r.health,
    weekly: r.weekly,
    luckyNumber: r.luckyNumber,
    luckyColor: r.luckyColor,
    bestDay: r.bestDay,
    moodScore: r.moodScore,
    skyFacts: r.skyFacts,
    methodNote: fixMethodNote(r.methodNote),
    transits: r.transits,
  };
  assertReaderSafe(out, `daily/${r.sign}`);
  return out;
}

/* ---------- idempotent writers ---------- */

const stats = { written: 0, skipped: 0, pruned: 0 };

/**
 * Write `payload` (which must contain a `generated` key, value ignored) only
 * if it differs from the file on disk when both are compared with
 * `generated` neutralised. Unchanged content keeps its old bytes (and old
 * `generated` stamp); changed/new content gets a fresh ISO stamp.
 */
function writeJsonIdempotent(path, payload, spacing) {
  if (existsSync(path)) {
    let old = null;
    try { old = JSON.parse(readFileSync(path, 'utf8')); } catch { old = null; }
    if (old && JSON.stringify({ ...payload, generated: null }) === JSON.stringify({ ...old, generated: null })) {
      stats.skipped++;
      return false;
    }
  }
  payload.generated = new Date().toISOString();
  writeFileSync(path, JSON.stringify(payload, null, spacing), 'utf8');
  stats.written++;
  return true;
}

/** Plain content files (no `generated` field): write only when bytes differ. */
function writeIfChanged(path, text) {
  if (existsSync(path) && readFileSync(path, 'utf8') === text) {
    stats.skipped++;
    return false;
  }
  writeFileSync(path, text, 'utf8');
  stats.written++;
  return true;
}

function pruneDir(dir, pattern, cutoffKey) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const m = name.match(pattern);
    if (m && m[1] < cutoffKey) {
      unlinkSync(join(dir, name));
      stats.pruned++;
    }
  }
}

function listKeys(dir, pattern) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .map((n) => n.match(pattern))
    .filter(Boolean)
    .map((m) => m[1])
    .sort();
}

/* ---------- build ---------- */

const args = parseArgs(process.argv.slice(2));
const { H, I } = loadEngines();
if (!H || !I) {
  console.error('Failed to load HoroscopeEngine / Interpretations');
  process.exit(1);
}

ensureDir(join(OUT, 'daily'));
ensureDir(join(OUT, 'monthly'));
ensureDir(join(OUT, 'core'));

console.log(`Building daily files: today−${args.keepDays} … today+${args.days - 1} (UTC) × 12 signs…`);

for (let i = -args.keepDays; i < args.days; i++) {
  const dU = utcDay(i);
  const iso = isoOfUTC(dU);
  const readings = {};
  for (const sign of SIGNS) {
    readings[sign] = stripReading(H.getDailyHoroscope(sign, engineDateFor(dU)));
  }
  writeJsonIdempotent(join(OUT, 'daily', `${iso}.json`), { date: iso, generated: null, readings }, 0);
}

pruneDir(join(OUT, 'daily'), /^(\d{4}-\d{2}-\d{2})\.json$/, isoOfUTC(utcDay(-args.keepDays)));

console.log(`Building ${args.months} monthly files × 12 signs (plus the retained previous month)…`);

// Starts at m = −1, not 0. The previous month is deliberately KEPT on disk (visitors
// west of UTC straddle the boundary) but the old loop never rewrote it, so it froze
// with whatever wording shipped when it was first written — that is how a month file
// was still serving retired wording six weeks later. Regenerating it is free: the
// content is a pure function of the mid-month date, so only the wording can differ.
// On-disk count is unchanged (prune keeps exactly one past month either way).
for (let m = -1; m < args.months; m++) {
  const y = NOW.getUTCFullYear();
  const mo = NOW.getUTCMonth() + m;
  const key = monthKeyOf(new Date(Date.UTC(y, mo, 1)).getUTCFullYear(), new Date(Date.UTC(y, mo, 1)).getUTCMonth());
  const dU = new Date(Date.UTC(y, mo, 15));
  const readings = {};
  for (const sign of SIGNS) {
    const raw = H.getMonthlyHoroscope(sign, engineDateFor(dU, 15));
    if (raw) assertReaderSafe(raw, `monthly/${sign}`);
    readings[sign] = raw ? {
      sign: raw.sign,
      month: raw.month,
      overview: raw.overview,
      love: raw.love,
      career: raw.career,
      health: raw.health,
      luckyNumber: raw.luckyNumber,
      luckyColor: raw.luckyColor,
      skyFacts: raw.skyFacts,
      methodNote: fixMethodNote(raw.methodNote),
    } : null;
  }
  writeJsonIdempotent(join(OUT, 'monthly', `${key}.json`), { month: key, generated: null, readings }, 0);
}

/* keep the previous month (west-of-UTC visitors straddle the boundary), prune older */
const prevMonth = new Date(Date.UTC(NOW.getUTCFullYear(), NOW.getUTCMonth() - 1, 1));
pruneDir(join(OUT, 'monthly'), /^(\d{4}-\d{2})\.json$/, monthKeyOf(prevMonth.getUTCFullYear(), prevMonth.getUTCMonth()));

console.log('Extracting natal interpretation corpus…');
const planetInSign = {};
for (const planet of PLANETS) {
  planetInSign[planet] = {};
  for (const sign of SIGNS) {
    planetInSign[planet][sign] = I.getPlanetInterpretation(planet, sign);
  }
}
assertReaderSafe(planetInSign, 'core/planet-in-sign');
writeIfChanged(join(OUT, 'core', 'planet-in-sign.json'), JSON.stringify(planetInSign));

const houses = [];
for (let n = 1; n <= 12; n++) {
  houses.push(I.getHouseMeaning(n));
}
assertReaderSafe(houses, 'core/houses');
writeIfChanged(join(OUT, 'core', 'houses.json'), JSON.stringify(houses));

// Object keys here are the machine aspect names; only the interpretation text is
// read by a visitor, and assertReaderSafe checks values, not keys.
const aspectTypes = ['Conjunction', 'Trine', 'Sextile', 'Square', 'Opposition'];
const aspects = {};
for (const type of aspectTypes) {
  aspects[type] = I.getAspectMeaning(type, 'Sun', 'Moon');
}
assertReaderSafe(aspects, 'core/aspects');
writeIfChanged(join(OUT, 'core', 'aspects.json'), JSON.stringify(aspects));

const risingBlurbs = {};
const risingTemplates = {
  Aries: 'First impressions read as direct, energetic, and ready to move — you meet the world head-on.',
  Taurus: 'You arrive with calm steadiness; others sense reliability and unhurried presence before you speak.',
  Gemini: 'Curiosity shows in your manner — quick eyes, easy conversation, and an approachable wit.',
  Cancer: 'A protective, attentive quality colours first meetings; people feel you are listening beneath the surface.',
  Leo: 'Warm confidence is visible immediately — you occupy space as though the room expects your light.',
  Virgo: 'Precision and care show in how you present — composed, observant, and quietly competent.',
  Libra: 'Grace and social ease lead; others experience you as fair-minded and aesthetically attuned.',
  Scorpio: 'Intensity sits behind the eyes — magnetic, private, and impossible to skim past.',
  Sagittarius: 'Openness and forward motion define your entrance; optimism reads as invitation.',
  Capricorn: 'Composed authority — you seem older than your years, purposeful, and hard to fluster.',
  Aquarius: 'Distinctive and slightly detached, you signal originality before explaining it.',
  Pisces: 'Soft permeability — empathic, imaginative, and difficult to pin to a single category.',
};
for (const sign of SIGNS) risingBlurbs[sign] = risingTemplates[sign];
writeIfChanged(join(OUT, 'core', 'rising-by-sign.json'), JSON.stringify(risingBlurbs));

const deepSections = {
  bigThree: 'Your Sun, Moon, and Rising are the three signatures most people feel first — identity, inner weather, and the face you show the world.',
  love: 'Venus and the 7th house describe how you give and receive affection; Mars adds desire, pace, and the courage to pursue.',
  career: 'Saturn, the 10th house, and the very top of your chart frame public reputation — what you build slowly and what the world remembers.',
  challenges: 'Saturn, squares, and oppositions mark the curriculum — friction that becomes craft when met honestly.',
  purpose: 'The North Node and stelliums point toward growth edges — unfamiliar qualities that feel strangely like home when practiced.',
};
assertReaderSafe(deepSections, 'core/deep-reading-sections');
writeIfChanged(join(OUT, 'core', 'deep-reading-sections.json'), JSON.stringify(deepSections));

/* ---------- manifest reflects on-disk truth after generate + prune ---------- */

const dailyKeys = listKeys(join(OUT, 'daily'), /^(\d{4}-\d{2}-\d{2})\.json$/);
const monthlyKeys = listKeys(join(OUT, 'monthly'), /^(\d{4}-\d{2})\.json$/);

const manifest = {
  version: 1,
  generated: null,
  engine: 'VSOP87 solar-chart horoscope + interpretations.js corpus',
  anchor: 'Daily readings computed at 12:00 UT of each calendar date',
  counts: {
    dailyReadings: dailyKeys.length * SIGNS.length,
    monthlyReadings: monthlyKeys.length * SIGNS.length,
    planetInSign: PLANETS.length * SIGNS.length,
    houses: 12,
  },
  daily: { start: dailyKeys[0] || null, end: dailyKeys[dailyKeys.length - 1] || null },
  monthly: { start: monthlyKeys[0] || null, end: monthlyKeys[monthlyKeys.length - 1] || null },
  core: [
    'planet-in-sign.json',
    'houses.json',
    'aspects.json',
    'rising-by-sign.json',
    'deep-reading-sections.json',
  ],
  usage: 'Fetched by website/js/content-service.js — static backend for GitHub Pages.',
};
writeJsonIdempotent(join(OUT, 'manifest.json'), manifest, 2);

console.log('');
console.log('Content bank built:');
console.log(`  Daily:   ${dailyKeys.length} files on disk (${manifest.counts.dailyReadings} readings) — ${manifest.daily.start} → ${manifest.daily.end}`);
console.log(`  Monthly: ${monthlyKeys.length} files on disk (${manifest.counts.monthlyReadings} readings) — ${manifest.monthly.start} → ${manifest.monthly.end}`);
console.log(`  Natal:   ${manifest.counts.planetInSign} planet-in-sign texts`);
console.log(`  Files:   ${stats.written} written, ${stats.skipped} unchanged (skipped), ${stats.pruned} pruned`);
console.log(`  → ${OUT}`);
