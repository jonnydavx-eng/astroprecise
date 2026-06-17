/**
 * Generates hand-drawn engraved celestial seal SVGs:
 *   assets/images/seals/zodiac/*.svg   (12 signs)
 *   assets/images/seals/planets/*.svg  (10 bodies)
 *   assets/images/seals/instruments/*.svg (8 homepage tools)
 * Run: node tools/generate-celestial-seals.mjs
 */
import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', 'assets', 'images', 'seals');

const GOLD = '#c9a227';
const GOLD_LIGHT = '#efe3c0';
const INK = '#1a1208';

const ELEMENT_ACCENTS = {
  fire: '#e05a3a',
  earth: '#5e8a4a',
  air: '#a78bba',
  water: '#3f7d76',
};

const SIGN_ELEMENT = {
  aries: 'fire', leo: 'fire', sagittarius: 'fire',
  taurus: 'earth', virgo: 'earth', capricorn: 'earth',
  gemini: 'air', libra: 'air', aquarius: 'air',
  cancer: 'water', scorpio: 'water', pisces: 'water',
};

const HEX = 'M48 6 L86 28 L86 84 L48 106 L10 84 L10 28 Z';
const HEX_INNER = 'M48 14 L78 32 L78 80 L48 98 L18 80 L18 32 Z';

function wrapHex(title, accent, inner, extraDefs = '') {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 112" role="img" aria-label="${title}">
  <defs>
    <radialGradient id="plate" cx="38%" cy="26%" r="78%">
      <stop offset="0%" stop-color="#2a2218"/>
      <stop offset="55%" stop-color="#120e0a"/>
      <stop offset="100%" stop-color="#050406"/>
    </radialGradient>
    <radialGradient id="sheen" cx="32%" cy="22%" r="55%">
      <stop offset="0%" stop-color="#fff" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
    ${extraDefs}
  </defs>
  <path d="${HEX}" fill="url(#plate)"/>
  <path d="${HEX}" fill="url(#sheen)"/>
  <path d="${HEX}" fill="none" stroke="${GOLD}" stroke-width="1.4" opacity="0.9"/>
  <path d="${HEX_INNER}" fill="none" stroke="${GOLD}" stroke-width="0.8" opacity="0.38"/>
  <g stroke="${GOLD}" stroke-width="0.9" opacity="0.55" stroke-linecap="round">
    <line x1="48" y1="6" x2="48" y2="14"/><line x1="86" y1="28" x2="78" y2="32"/>
    <line x1="86" y1="84" x2="78" y2="80"/><line x1="48" y1="106" x2="48" y2="98"/>
    <line x1="10" y1="84" x2="18" y2="80"/><line x1="10" y1="28" x2="18" y2="32"/>
  </g>
  <g fill="none" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke">
    ${inner}
  </g>
</svg>`;
}

const ZODIAC = {
  aries: `<g stroke="${GOLD}" stroke-width="2">
    <path d="M34 72c8-18 20-28 14-42 8 6 14 2 18-6 4 16-6 30-16 42z" fill="${INK}" fill-opacity="0.38"/>
    <path d="M54 72c-8-18-20-28-14-42-8 6-14 2-18-6-4 16 6 30 16 42z" fill="${INK}" fill-opacity="0.32"/>
    <path d="M42 58c4-8 8-10 12-8" stroke-width="1.2" stroke="${GOLD_LIGHT}" opacity="0.65"/>
  </g>`,
  taurus: `<g stroke="${GOLD}" stroke-width="2">
    <ellipse cx="48" cy="58" rx="16" ry="14" fill="${INK}" fill-opacity="0.35"/>
    <path d="M34 52c-6-10-2-22 6-24 4 8 10 6 14-2" stroke-width="1.6"/>
    <path d="M62 52c6-10 2-22-6-24-4 8-10 6-14-2" stroke-width="1.6"/>
    <circle cx="42" cy="56" r="2" fill="${GOLD_LIGHT}" stroke="none" opacity="0.7"/>
    <circle cx="54" cy="56" r="2" fill="${GOLD_LIGHT}" stroke="none" opacity="0.7"/>
    <path d="M40 68c4 8 16 8 20 0" stroke-width="1.3"/>
  </g>`,
  gemini: `<g stroke="${GOLD}" stroke-width="1.8">
    <circle cx="38" cy="44" r="9" fill="${INK}" fill-opacity="0.32"/>
    <circle cx="58" cy="44" r="9" fill="${INK}" fill-opacity="0.32"/>
    <path d="M38 53v28M58 53v28" stroke-width="1.6"/>
    <path d="M34 78h8M54 78h8" stroke-width="1.4"/>
    <path d="M48 36v12" stroke-width="1" opacity="0.55" stroke-dasharray="2 3"/>
    <circle cx="35" cy="42" r="1.2" fill="${GOLD_LIGHT}" stroke="none"/>
    <circle cx="61" cy="42" r="1.2" fill="${GOLD_LIGHT}" stroke="none"/>
  </g>`,
  cancer: `<g stroke="${GOLD}" stroke-width="2">
    <path d="M30 64c10-8 18-4 22 6 2-12 10-18 20-14-8 10-4 22 8 28-14-2-24-8-30-20z" fill="${INK}" fill-opacity="0.34"/>
    <path d="M66 64c-10-8-18-4-22 6-2-12-10-18-20-14 8 10 4 22-8 28 14-2 24-8 30-20z" fill="${INK}" fill-opacity="0.28"/>
    <path d="M42 58c2 4 6 5 10 2" stroke-width="1.1" stroke="${GOLD_LIGHT}" opacity="0.6"/>
  </g>`,
  leo: `<g stroke="${GOLD}" stroke-width="2">
    <circle cx="48" cy="54" r="14" fill="${INK}" fill-opacity="0.35"/>
    <path d="M34 48c-8-6-6-18 4-20 2 8 8 10 14 6" stroke-width="1.5"/>
    <path d="M62 48c8-6 6-18-4-20-2 8-8 10-14 6" stroke-width="1.5"/>
    <path d="M36 68c6 10 24 10 30 0" stroke-width="1.4"/>
    <path d="M40 42c8-6 16-6 24 0" stroke-width="1.1" stroke="${GOLD_LIGHT}" opacity="0.55"/>
  </g>`,
  virgo: `<g stroke="${GOLD}" stroke-width="1.8">
    <path d="M48 34v44" stroke-width="1.6"/>
    <path d="M36 46c6-8 14-8 20 0M36 58c6-8 14-8 20 0M36 70c6-8 14-8 20 0" stroke-width="1.4"/>
    <path d="M48 78c-6 8-2 14 6 12" stroke-width="1.5"/>
    <line x1="30" y1="82" x2="66" y2="82" stroke-width="1.2" opacity="0.5"/>
    <circle cx="48" cy="34" r="3" fill="${GOLD_LIGHT}" stroke="none" opacity="0.65"/>
  </g>`,
  libra: `<g stroke="${GOLD}" stroke-width="2">
    <line x1="48" y1="36" x2="48" y2="54" stroke-width="1.6"/>
    <line x1="30" y1="54" x2="66" y2="54" stroke-width="1.8"/>
    <path d="M30 54v6c0 8 8 14 18 14s18-6 18-14v-6" stroke-width="1.5"/>
    <path d="M34 78h28" stroke-width="1.3" opacity="0.55"/>
    <circle cx="48" cy="36" r="2.5" fill="${GOLD_LIGHT}" stroke="none" opacity="0.7"/>
  </g>`,
  scorpio: `<g stroke="${GOLD}" stroke-width="2">
    <path d="M32 44c8-6 16-4 20 4 4-10 14-14 24-8-10 8-8 20 2 28-6 10-14 14-24 10" fill="${INK}" fill-opacity="0.32"/>
    <path d="M58 72c4 8 10 10 16 6" stroke-width="1.8"/>
    <path d="M70 74c4 2 6 6 4 10" stroke-width="1.4" stroke="${GOLD_LIGHT}" opacity="0.7"/>
    <circle cx="36" cy="46" r="1.5" fill="${GOLD_LIGHT}" stroke="none"/>
  </g>`,
  sagittarius: `<g stroke="${GOLD}" stroke-width="2">
    <line x1="34" y1="78" x2="62" y2="38" stroke-width="2.2"/>
    <path d="M54 38h12v12" stroke-width="1.8"/>
    <path d="M30 72c6 4 12 6 18 4" stroke-width="1.3" opacity="0.55"/>
    <circle cx="62" cy="38" r="2" fill="${GOLD_LIGHT}" stroke="none" opacity="0.75"/>
    <path d="M36 76l-4 6 8-2z" fill="${INK}" fill-opacity="0.4" stroke="${GOLD}" stroke-width="1.2"/>
  </g>`,
  capricorn: `<g stroke="${GOLD}" stroke-width="2">
    <path d="M34 44c0 20 8 32 14 36 6-12 10-24 8-38 6 4 12 0 14-8-8 2-14 8-16 16" fill="${INK}" fill-opacity="0.32"/>
    <path d="M48 80c-8 4-14 2-18-4" stroke-width="1.4"/>
    <path d="M58 42c4-6 10-8 16-4" stroke-width="1.3" stroke="${GOLD_LIGHT}" opacity="0.6"/>
  </g>`,
  aquarius: `<g stroke="${GOLD}" stroke-width="1.8">
    <path d="M28 50c10-6 18-2 22 8M30 62c12-6 20-2 24 8" stroke-width="1.6"/>
    <path d="M28 74c10-6 18-2 22 8" stroke-width="1.6" opacity="0.75"/>
    <circle cx="34" cy="48" r="1.3" fill="${GOLD_LIGHT}" stroke="none"/>
    <circle cx="58" cy="60" r="1.3" fill="${GOLD_LIGHT}" stroke="none"/>
    <circle cx="40" cy="72" r="1.3" fill="${GOLD_LIGHT}" stroke="none" opacity="0.7"/>
  </g>`,
  pisces: `<g stroke="${GOLD}" stroke-width="2">
    <path d="M34 56c-10 0-14 12-8 20 6 8 18 6 22-4-8-4-10-12-4-18 4-4 10-4 14 0" fill="${INK}" fill-opacity="0.3"/>
    <path d="M62 56c10 0 14 12 8 20-6 8-18 6-22-4 8-4 10-12 4-18-4-4-10-4-14 0" fill="${INK}" fill-opacity="0.26"/>
    <line x1="48" y1="40" x2="48" y2="84" stroke-width="1" opacity="0.45" stroke-dasharray="3 4"/>
  </g>`,
};

const PLANETS = {
  sun: `<g stroke="${GOLD}" stroke-width="2">
    <circle cx="48" cy="56" r="16" fill="${INK}" fill-opacity="0.35"/>
    <circle cx="48" cy="56" r="9" stroke="${GOLD_LIGHT}" stroke-width="1.4" opacity="0.7"/>
    <g stroke-width="1.5" opacity="0.9">
      <line x1="48" y1="30" x2="48" y2="38"/><line x1="48" y1="74" x2="48" y2="82"/>
      <line x1="22" y1="56" x2="30" y2="56"/><line x1="66" y1="56" x2="74" y2="56"/>
      <line x1="30" y1="38" x2="36" y2="44"/><line x1="66" y1="74" x2="60" y2="68"/>
      <line x1="66" y1="38" x2="60" y2="44"/><line x1="30" y1="74" x2="36" y2="68"/>
    </g>
  </g>`,
  moon: `<g stroke="${GOLD}" stroke-width="2">
    <path d="M48 34c-14 0-22 12-22 24s8 24 22 24c-10-6-14-16-10-26 4-10 14-16 24-14-6-4-12-6-14-8z" fill="${INK}" fill-opacity="0.38"/>
    <circle cx="56" cy="48" r="2" fill="${GOLD_LIGHT}" stroke="none" opacity="0.55"/>
  </g>`,
  mercury: `<g stroke="${GOLD}" stroke-width="2">
    <circle cx="48" cy="52" r="12" fill="${INK}" fill-opacity="0.32"/>
    <line x1="48" y1="36" x2="48" y2="28" stroke-width="1.8"/>
    <path d="M42 28h12" stroke-width="1.6"/>
    <path d="M40 72c4 6 16 6 20 0" stroke-width="1.4"/>
    <path d="M36 68h24" stroke-width="1.2" opacity="0.55"/>
  </g>`,
  venus: `<g stroke="${GOLD}" stroke-width="2">
    <circle cx="48" cy="50" r="13" fill="${INK}" fill-opacity="0.32"/>
    <line x1="48" y1="34" x2="48" y2="26" stroke-width="1.8"/>
    <path d="M42 26h12" stroke-width="1.6"/>
    <path d="M40 72c4 6 16 6 20 0" stroke-width="1.5"/>
  </g>`,
  mars: `<g stroke="${GOLD}" stroke-width="2">
    <circle cx="48" cy="54" r="13" fill="${INK}" fill-opacity="0.32"/>
    <line x1="48" y1="38" x2="48" y2="28" stroke-width="1.8"/>
    <path d="M42 28l12 12" stroke-width="1.6"/>
    <path d="M54 28l-12 12" stroke-width="1.6"/>
    <path d="M38 72c5 7 17 7 22 0" stroke-width="1.4"/>
  </g>`,
  jupiter: `<g stroke="${GOLD}" stroke-width="2">
    <path d="M36 44c0-10 8-16 18-14 10 2 16 12 12 22-4 10-16 14-26 8-6-4-8-10-4-16z" fill="${INK}" fill-opacity="0.34"/>
    <path d="M40 58c8-2 14-8 16-16" stroke-width="1.2" stroke="${GOLD_LIGHT}" opacity="0.6"/>
    <line x1="34" y1="72" x2="62" y2="72" stroke-width="1.2" opacity="0.45"/>
  </g>`,
  saturn: `<g stroke="${GOLD}" stroke-width="2">
    <ellipse cx="48" cy="54" rx="14" ry="12" fill="${INK}" fill-opacity="0.32"/>
    <ellipse cx="48" cy="54" rx="22" ry="5" stroke-width="1.4" opacity="0.85"/>
    <path d="M30 54c0-3 6-5 18-5s18 2 18 5" stroke-width="1.1" opacity="0.5"/>
  </g>`,
  uranus: `<g stroke="${GOLD}" stroke-width="2">
    <circle cx="48" cy="56" r="12" fill="${INK}" fill-opacity="0.32"/>
    <line x1="48" y1="40" x2="48" y2="30" stroke-width="1.6"/>
    <path d="M42 30h12" stroke-width="1.4"/>
    <path d="M36 72c6 6 18 6 24 0" stroke-width="1.4"/>
    <circle cx="48" cy="30" r="2" fill="${GOLD_LIGHT}" stroke="none" opacity="0.65"/>
  </g>`,
  neptune: `<g stroke="${GOLD}" stroke-width="2">
    <circle cx="48" cy="52" r="12" fill="${INK}" fill-opacity="0.32"/>
    <path d="M40 72c4 6 16 6 20 0" stroke-width="1.5"/>
    <path d="M36 68c6 4 18 4 24 0" stroke-width="1.2" opacity="0.55"/>
    <path d="M42 44c4-6 10-6 14 0" stroke-width="1.2" stroke="${GOLD_LIGHT}" opacity="0.6"/>
  </g>`,
  pluto: `<g stroke="${GOLD}" stroke-width="2">
    <circle cx="48" cy="52" r="11" fill="${INK}" fill-opacity="0.32"/>
    <path d="M48 36v-8M44 32h8" stroke-width="1.5"/>
    <path d="M40 72c4 6 16 6 20 0" stroke-width="1.4"/>
    <circle cx="48" cy="28" r="2.5" fill="${GOLD_LIGHT}" stroke="none" opacity="0.55"/>
  </g>`,
};

const INSTRUMENTS = {
  chart: `<g stroke="${GOLD}" stroke-width="1.8">
    <circle cx="48" cy="56" r="22" fill="${INK}" fill-opacity="0.28"/>
    <circle cx="48" cy="56" r="22" stroke-width="1.2" opacity="0.7"/>
    <line x1="48" y1="34" x2="48" y2="78"/><line x1="26" y1="56" x2="70" y2="56"/>
    <line x1="34" y1="42" x2="62" y2="70" opacity="0.55"/><line x1="62" y1="42" x2="34" y2="70" opacity="0.55"/>
    <circle cx="48" cy="56" r="3" fill="${GOLD_LIGHT}" stroke="none" opacity="0.75"/>
  </g>`,
  horoscope: `<g stroke="${GOLD}" stroke-width="2">
    <path d="M48 34c-14 0-22 12-22 24s8 24 22 24c-10-6-14-16-10-26 4-10 14-16 24-14-6-4-12-6-14-8z" fill="${INK}" fill-opacity="0.34"/>
    <path d="M30 78h36" stroke-width="1.4" opacity="0.55"/>
    <path d="M34 82c6 4 22 4 28 0" stroke-width="1.2" opacity="0.45"/>
  </g>`,
  compatibility: `<g stroke="${GOLD}" stroke-width="1.8">
    <circle cx="38" cy="54" r="12" fill="${INK}" fill-opacity="0.28"/>
    <circle cx="58" cy="54" r="12" fill="${INK}" fill-opacity="0.28"/>
    <path d="M48 66c-4 8-12 12-18 8 6-2 10-8 10-14" stroke-width="1.5"/>
    <path d="M48 66c4 8 12 12 18 8-6-2-10-8-10-14" stroke-width="1.5"/>
  </g>`,
  transits: `<g stroke="${GOLD}" stroke-width="1.6">
    <ellipse cx="48" cy="58" rx="24" ry="10" stroke-width="1.4"/>
    <ellipse cx="48" cy="58" rx="16" ry="6" opacity="0.55"/>
    <circle cx="34" cy="52" r="4" fill="${GOLD_LIGHT}" stroke="${GOLD}" stroke-width="1.2"/>
    <circle cx="62" cy="62" r="3" fill="${INK}" fill-opacity="0.4" stroke="${GOLD}" stroke-width="1.2"/>
    <path d="M48 34v8M48 74v8" stroke-width="1.2" opacity="0.45"/>
  </g>`,
  lifepath: `<g stroke="${GOLD}" stroke-width="1.8">
    <path d="M48 30c-12 14-12 32 0 46 12-14 12-32 0-46z" fill="${INK}" fill-opacity="0.3"/>
    <path d="M40 56h16M44 48h8M42 64h12" stroke-width="1.3" stroke="${GOLD_LIGHT}" opacity="0.65"/>
    <text x="48" y="60" text-anchor="middle" fill="${GOLD_LIGHT}" font-family="Cinzel,serif" font-size="14" opacity="0.85">∞</text>
  </g>`,
  instrument: `<g stroke="${GOLD}" stroke-width="1.8">
    <path d="M32 78V42l16-12 16 12v36" fill="${INK}" fill-opacity="0.25"/>
    <circle cx="48" cy="52" r="8" stroke-width="1.4"/>
    <line x1="48" y1="44" x2="48" y2="36" stroke-width="1.3"/>
    <path d="M40 78h16" stroke-width="1.4"/>
    <circle cx="48" cy="52" r="2" fill="${GOLD_LIGHT}" stroke="none"/>
  </g>`,
  shop: `<g stroke="${GOLD}" stroke-width="1.8">
    <rect x="30" y="44" width="36" height="28" rx="2" fill="${INK}" fill-opacity="0.3"/>
    <path d="M30 44l6-10h24l6 10" stroke-width="1.5"/>
    <path d="M38 58h20" stroke-width="1.2" opacity="0.55"/>
    <path d="M48 36l-4 6h8z" fill="${GOLD_LIGHT}" fill-opacity="0.35" stroke="${GOLD}" stroke-width="1.2"/>
  </g>`,
  oracle: `<g stroke="${GOLD}" stroke-width="1.8">
    <circle cx="48" cy="54" r="16" fill="${INK}" fill-opacity="0.28"/>
    <ellipse cx="48" cy="58" rx="18" ry="6" stroke-width="1.3" opacity="0.65"/>
    <path d="M36 72h24" stroke-width="1.4"/>
    <circle cx="48" cy="50" r="4" fill="none" stroke="${GOLD_LIGHT}" stroke-width="1.2" opacity="0.7"/>
    <circle cx="44" cy="48" r="1.2" fill="${GOLD_LIGHT}" stroke="none" opacity="0.55"/>
  </g>`,
};

function accentForSign(slug) {
  return ELEMENT_ACCENTS[SIGN_ELEMENT[slug]] || GOLD;
}

function accentInner(slug, art) {
  const accent = accentForSign(slug);
  return `${art}
  <g stroke="${accent}" stroke-width="1.1" opacity="0.72" fill="none">
    <path d="M20 56c4-8 10-12 16-10"/><path d="M76 56c-4-8-10-12-16-10"/>
  </g>`;
}

const dirs = ['zodiac', 'planets', 'instruments'];
for (const d of dirs) await mkdir(join(ROOT, d), { recursive: true });

for (const [slug, art] of Object.entries(ZODIAC)) {
  const title = slug.charAt(0).toUpperCase() + slug.slice(1) + ' zodiac seal';
  await writeFile(join(ROOT, 'zodiac', `${slug}.svg`), wrapHex(title, accentForSign(slug), accentInner(slug, art)));
}

for (const [slug, art] of Object.entries(PLANETS)) {
  const title = slug.charAt(0).toUpperCase() + slug.slice(1) + ' planet seal';
  await writeFile(join(ROOT, 'planets', `${slug}.svg`), wrapHex(title, GOLD, art));
}

for (const [slug, art] of Object.entries(INSTRUMENTS)) {
  const title = slug.charAt(0).toUpperCase() + slug.slice(1) + ' instrument seal';
  await writeFile(join(ROOT, 'instruments', `${slug}.svg`), wrapHex(title, GOLD, art));
}

console.log(`Wrote ${Object.keys(ZODIAC).length} zodiac + ${Object.keys(PLANETS).length} planet + ${Object.keys(INSTRUMENTS).length} instrument seals`);