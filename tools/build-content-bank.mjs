#!/usr/bin/env node
/**
 * Pre-generate AstroPrecise content bank (static JSON served from website/data/).
 *
 *   node tools/build-content-bank.mjs [--days 90] [--months 6]
 *
 * Outputs:
 *   website/data/content-bank/manifest.json
 *   website/data/content-bank/daily/YYYY-MM-DD.json  (12 signs/day)
 *   website/data/content-bank/monthly/YYYY-MM.json   (12 signs/month)
 *   website/data/content-bank/core/*.json            (natal corpus)
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
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

function parseArgs(argv) {
  const a = { days: 90, months: 6 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--days' && argv[i + 1]) { a.days = Number(argv[++i]); }
    if (argv[i] === '--months' && argv[i + 1]) { a.months = Number(argv[++i]); }
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

function isoDate(d) {
  const x = d instanceof Date ? d : new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}

function monthKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function ensureDir(p) {
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
}

function stripReading(r) {
  if (!r) return null;
  return {
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
    methodNote: r.methodNote,
    transits: r.transits,
  };
}

const args = parseArgs(process.argv.slice(2));
const { H, I } = loadEngines();
if (!H || !I) {
  console.error('Failed to load HoroscopeEngine / Interpretations');
  process.exit(1);
}

const start = new Date();
start.setHours(12, 0, 0, 0);

ensureDir(join(OUT, 'daily'));
ensureDir(join(OUT, 'monthly'));
ensureDir(join(OUT, 'core'));

console.log(`Building ${args.days} daily files × 12 signs…`);
const dailyRange = { start: isoDate(start), end: null };
let dailyCount = 0;

for (let i = 0; i < args.days; i++) {
  const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
  const iso = isoDate(d);
  const readings = {};
  for (const sign of SIGNS) {
    readings[sign] = stripReading(H.getDailyHoroscope(sign, d));
  }
  writeFileSync(
    join(OUT, 'daily', `${iso}.json`),
    JSON.stringify({ date: iso, generated: new Date().toISOString(), readings }, null, 0),
    'utf8',
  );
  dailyCount++;
  dailyRange.end = iso;
}

console.log(`Building ${args.months} monthly files × 12 signs…`);
const monthlyRange = { start: null, end: null };
let monthlyCount = 0;

for (let m = 0; m < args.months; m++) {
  const d = new Date(start.getFullYear(), start.getMonth() + m, 15);
  const key = monthKey(d);
  const readings = {};
  for (const sign of SIGNS) {
    const raw = H.getMonthlyHoroscope(sign, d);
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
      methodNote: raw.methodNote,
    } : null;
  }
  writeFileSync(
    join(OUT, 'monthly', `${key}.json`),
    JSON.stringify({ month: key, generated: new Date().toISOString(), readings }, null, 0),
    'utf8',
  );
  monthlyCount++;
  if (!monthlyRange.start) monthlyRange.start = key;
  monthlyRange.end = key;
}

console.log('Extracting natal interpretation corpus…');
const planetInSign = {};
for (const planet of PLANETS) {
  planetInSign[planet] = {};
  for (const sign of SIGNS) {
    planetInSign[planet][sign] = I.getPlanetInterpretation(planet, sign);
  }
}
writeFileSync(join(OUT, 'core', 'planet-in-sign.json'), JSON.stringify(planetInSign), 'utf8');

const houses = [];
for (let n = 1; n <= 12; n++) {
  houses.push(I.getHouseMeaning(n));
}
writeFileSync(join(OUT, 'core', 'houses.json'), JSON.stringify(houses), 'utf8');

const aspectTypes = ['Conjunction', 'Trine', 'Sextile', 'Square', 'Opposition'];
const aspects = {};
for (const type of aspectTypes) {
  aspects[type] = I.getAspectMeaning(type, 'Sun', 'Moon');
}
writeFileSync(join(OUT, 'core', 'aspects.json'), JSON.stringify(aspects), 'utf8');

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
writeFileSync(join(OUT, 'core', 'rising-by-sign.json'), JSON.stringify(risingBlurbs), 'utf8');

const deepSections = {
  bigThree: 'Your Sun, Moon, and Rising are the three signatures most people feel first — identity, inner weather, and the face you show the world.',
  love: 'Venus and the 7th house describe how you give and receive affection; Mars adds desire, pace, and the courage to pursue.',
  career: 'The Midheaven, Saturn, and the 10th house frame public reputation — what you build slowly and what the world remembers.',
  challenges: 'Saturn, squares, and oppositions mark the curriculum — friction that becomes craft when met honestly.',
  purpose: 'The North Node and stelliums point toward growth edges — unfamiliar qualities that feel strangely like home when practiced.',
};
writeFileSync(join(OUT, 'core', 'deep-reading-sections.json'), JSON.stringify(deepSections), 'utf8');

const manifest = {
  version: 1,
  generated: new Date().toISOString(),
  engine: 'VSOP87 solar-chart horoscope + interpretations.js corpus',
  counts: {
    dailyReadings: dailyCount * SIGNS.length,
    monthlyReadings: monthlyCount * SIGNS.length,
    planetInSign: PLANETS.length * SIGNS.length,
    houses: 12,
  },
  daily: dailyRange,
  monthly: monthlyRange,
  core: [
    'planet-in-sign.json',
    'houses.json',
    'aspects.json',
    'rising-by-sign.json',
    'deep-reading-sections.json',
  ],
  usage: 'Fetched by website/js/content-service.js — static backend for GitHub Pages.',
};
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

console.log('');
console.log('Content bank built:');
console.log(`  Daily:   ${dailyCount} files (${manifest.counts.dailyReadings} readings)`);
console.log(`  Monthly: ${monthlyCount} files (${manifest.counts.monthlyReadings} readings)`);
console.log(`  Natal:   ${manifest.counts.planetInSign} planet-in-sign texts`);
console.log(`  → ${OUT}`);