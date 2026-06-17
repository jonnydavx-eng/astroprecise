/**
 * Generates engraved hex element seal SVGs (observatory instrument plates).
 * Run: node tools/generate-element-seals.mjs
 */
import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'assets', 'images', 'seals', 'elements');

const GOLD = '#c9a227';
const GOLD_LIGHT = '#efe3c0';
const INK = '#1a1208';

const ACCENTS = {
  fire: '#e05a3a',
  earth: '#5e8a4a',
  air: '#a78bba',
  water: '#3f7d76',
  all: '#c9a227',
};

/** Flat-top hex plate path (viewBox 0 0 96 112). */
const HEX =
  'M48 6 L86 28 L86 84 L48 106 L10 84 L10 28 Z';
const HEX_INNER =
  'M48 14 L78 32 L78 80 L48 98 L18 80 L18 32 Z';

function wrapHex(title, accent, inner) {
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

const ELEMENTS = {
  fire: `<g stroke="${GOLD}" stroke-width="2">
    <path d="M48 78c-8-12-2-24 0-34 5 8 12 5 15-2 3 14-6 26-15 36z" fill="${INK}" fill-opacity="0.38"/>
    <path d="M48 62c-2 7 2 12 6 16" stroke-width="1.2" stroke="${GOLD_LIGHT}" opacity="0.65"/>
  </g>
  <g id="accent" stroke="${ACCENTS.fire}" stroke-width="1.1" opacity="0.85">
    <path d="M38 76c3-6 8-9 12-7"/><path d="M58 76c-3-6-8-9-12-7"/>
    <circle cx="42" cy="52" r="1.3" fill="${ACCENTS.fire}" stroke="none" class="seal-ember"/>
    <circle cx="54" cy="48" r="1" fill="${GOLD_LIGHT}" stroke="none" class="seal-ember" opacity="0.7"/>
  </g>`,
  earth: `<g stroke="${GOLD}" stroke-width="2">
    <path d="M30 72c6-14 16-22 18-22s12 8 18 22" fill="${INK}" fill-opacity="0.35"/>
    <path d="M34 72h28" stroke-width="1.6"/>
    <path d="M38 72v8c4 5 16 5 20 0v-8" stroke-width="1.3"/>
  </g>
  <g id="accent" stroke="${ACCENTS.earth}" stroke-width="1.1" opacity="0.8">
    <path d="M40 80c0 6-3 9-6 8"/><path d="M56 80c0 6 3 9 6 8"/>
    <line x1="28" y1="66" x2="68" y2="66" opacity="0.5"/>
  </g>`,
  air: `<g stroke="${GOLD}" stroke-width="1.6">
    <path d="M28 54c14-8 30-4 38 6s2 20-10 26" class="seal-wind-1"/>
    <path d="M30 66c16-6 32-2 42 10" stroke-width="1.3" opacity="0.75" class="seal-wind-2"/>
    <path d="M32 46c12-10 28-8 36 4" stroke-width="1.2" opacity="0.55" class="seal-wind-3"/>
  </g>
  <g fill="${GOLD_LIGHT}" stroke="none" opacity="0.75">
    <circle cx="34" cy="44" r="1.2"/><circle cx="62" cy="50" r="1"/>
  </g>
  <g id="accent" stroke="${ACCENTS.air}" stroke-width="1" opacity="0.65">
    <path d="M26 58c8-4 14-3 18 0" class="seal-wind-1"/>
  </g>`,
  water: `<g stroke="${GOLD}" stroke-width="2">
    <path d="M48 38c-10 14-10 28 0 42 10-14 10-28 0-42z" fill="${INK}" fill-opacity="0.32"/>
    <path d="M40 62c4 6 8 8 12 6" stroke-width="1.2" stroke="${GOLD_LIGHT}" opacity="0.6"/>
    <path d="M56 62c-4 6-8 8-12 6" stroke-width="1.2" stroke="${GOLD_LIGHT}" opacity="0.6"/>
  </g>
  <g id="accent" stroke="${ACCENTS.water}" stroke-width="1.2" opacity="0.75" class="seal-ripple">
    <path d="M32 74c8 4 24 4 32 0"/><path d="M36 82c6 3 18 3 24 0" opacity="0.55"/>
  </g>`,
  all: `<g stroke="${GOLD}" stroke-width="1.2">
    <rect x="26" y="38" width="44" height="44" rx="2" fill="${INK}" fill-opacity="0.28"/>
    <line x1="48" y1="38" x2="48" y2="82"/><line x1="26" y1="60" x2="70" y2="60"/>
  </g>
  <g stroke-width="1.4" class="seal-quadrant">
    <path d="M26 38h22v22H26z" fill="${ACCENTS.fire}" fill-opacity="0.22" stroke="${GOLD}" opacity="0.9"/>
    <path d="M48 38h22v22H48z" fill="${ACCENTS.air}" fill-opacity="0.18" stroke="${GOLD}" opacity="0.85"/>
    <path d="M26 60h22v22H26z" fill="${ACCENTS.earth}" fill-opacity="0.2" stroke="${GOLD}" opacity="0.85"/>
    <path d="M48 60h22v22H48z" fill="${ACCENTS.water}" fill-opacity="0.2" stroke="${GOLD}" opacity="0.85"/>
  </g>
  <g stroke="${GOLD_LIGHT}" stroke-width="1.6" fill="none" opacity="0.7">
    <line x1="48" y1="52" x2="48" y2="68"/><line x1="40" y1="60" x2="56" y2="60"/>
  </g>`,
};

const TITLES = {
  fire: 'Fire element seal',
  earth: 'Earth element seal',
  air: 'Air element seal',
  water: 'Water element seal',
  all: 'All elements seal',
};

await mkdir(OUT, { recursive: true });
for (const [k, art] of Object.entries(ELEMENTS)) {
  await writeFile(join(OUT, `${k}.svg`), wrapHex(TITLES[k], ACCENTS[k], art));
}
console.log(`Wrote ${Object.keys(ELEMENTS).length} element seals → assets/images/seals/elements/`);