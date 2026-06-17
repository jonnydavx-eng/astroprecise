/**
 * Generates hand-drawn gold line-art orb SVGs for planets + elements.
 * Run: node tools/generate-orb-art.mjs
 */
import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PLANETS = join(__dirname, '..', 'assets', 'images', 'orbs', 'planets');
/** Element art moved to tools/generate-element-seals.mjs */

const GOLD = '#c9a227';
const GOLD_LIGHT = '#efe3c0';
const INK = '#1a1208';

function wrap(title, inner) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-label="${title}">
  <defs>
    <radialGradient id="bg" cx="38%" cy="30%" r="72%">
      <stop offset="0%" stop-color="#2a2218"/>
      <stop offset="55%" stop-color="#120e0a"/>
      <stop offset="100%" stop-color="#050406"/>
    </radialGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="70%" stop-color="transparent"/>
      <stop offset="100%" stop-color="${GOLD}" stop-opacity="0.18"/>
    </radialGradient>
  </defs>
  <circle cx="64" cy="64" r="62" fill="url(#bg)" stroke="${GOLD}" stroke-width="1.2" opacity="0.85"/>
  <circle cx="64" cy="64" r="62" fill="url(#glow)"/>
  <g fill="none" stroke-linecap="round" stroke-linejoin="round" stroke="${GOLD}" vector-effect="non-scaling-stroke">
    ${inner}
  </g>
</svg>`;
}

const PLANETS = {
  sun: `<circle cx="64" cy="64" r="18" stroke-width="2.2" fill="${INK}" fill-opacity="0.35"/>
    <circle cx="64" cy="64" r="10" stroke="${GOLD_LIGHT}" stroke-width="1.4" opacity="0.7"/>
    <g stroke-width="1.6" opacity="0.95">
      <line x1="64" y1="30" x2="64" y2="40"/><line x1="64" y1="88" x2="64" y2="98"/>
      <line x1="30" y1="64" x2="40" y2="64"/><line x1="88" y1="64" x2="98" y2="64"/>
      <line x1="40" y1="40" x2="47" y2="47"/><line x1="88" y1="88" x2="81" y2="81"/>
      <line x1="88" y1="40" x2="81" y2="47"/><line x1="40" y1="88" x2="47" y2="81"/>
    </g>
    <path d="M58 62c2-6 10-6 12 0s-6 10-12 0" stroke-width="1.3" stroke="${GOLD_LIGHT}" opacity="0.65"/>`,
  moon: `<path d="M78 38c-16 4-24 18-20 34s18 28 34 24c-10 2-22-2-30-12s-10-24-2-36c6-8 14-12 18-10z" stroke-width="2.2" fill="${INK}" fill-opacity="0.4"/>
    <path d="M52 58c1 6 6 12 14 14" stroke-width="1.2" stroke="${GOLD_LIGHT}" opacity="0.55"/>
    <circle cx="46" cy="50" r="1.2" fill="${GOLD_LIGHT}" stroke="none"/>
    <circle cx="42" cy="62" r="0.9" fill="${GOLD_LIGHT}" stroke="none" opacity="0.7"/>`,
  mercury: `<path d="M64 34v18M52 52h24" stroke-width="2"/>
    <circle cx="64" cy="64" r="14" stroke-width="2.2" fill="${INK}" fill-opacity="0.35"/>
    <path d="M50 78c4 10 12 16 22 16" stroke-width="1.8"/>
    <path d="M58 40c-8 4-12 10-10 16" stroke-width="1.3" stroke="${GOLD_LIGHT}" opacity="0.6"/>
    <path d="M70 40c8 4 12 10 10 16" stroke-width="1.3" stroke="${GOLD_LIGHT}" opacity="0.6"/>`,
  venus: `<circle cx="64" cy="58" r="16" stroke-width="2.2" fill="${INK}" fill-opacity="0.35"/>
    <path d="M64 74v18M56 86h16" stroke-width="2"/>
    <path d="M58 54c3-4 10-4 12 0s-2 8-6 8-6-4-6-8z" stroke-width="1.2" stroke="${GOLD_LIGHT}" opacity="0.55"/>
    <path d="M52 48c2-6 8-8 12-6" stroke-width="1" opacity="0.5"/>`,
  mars: `<circle cx="64" cy="60" r="15" stroke-width="2.2" fill="${INK}" fill-opacity="0.35"/>
    <path d="M72 48l14-10M86 38v14" stroke-width="2.4"/>
    <path d="M58 56l-10 14h8l-4 10" stroke-width="1.8"/>
    <line x1="58" y1="56" x2="70" y2="68" stroke-width="1.2" opacity="0.45"/>`,
  jupiter: `<path d="M48 78c0-18 8-30 16-34s18-2 22 8 2 24-8 32-18 8-30-6z" stroke-width="2.2" fill="${INK}" fill-opacity="0.3"/>
    <path d="M52 58c8-2 16 0 22 6" stroke-width="1.4" stroke="${GOLD_LIGHT}" opacity="0.6"/>
    <path d="M50 68c10 4 20 2 28-4" stroke-width="1.2" opacity="0.5"/>
    <path d="M70 44l6-8 4 2-2 6" stroke-width="1.3"/>`,
  saturn: `<ellipse cx="64" cy="66" rx="20" ry="16" stroke-width="2" fill="${INK}" fill-opacity="0.3"/>
    <ellipse cx="64" cy="66" rx="32" ry="10" stroke-width="1.8" transform="rotate(-18 64 66)"/>
    <path d="M58 58c2-8 10-12 16-8" stroke-width="1.2" stroke="${GOLD_LIGHT}" opacity="0.55"/>`,
  uranus: `<circle cx="64" cy="64" r="16" stroke-width="2.2" fill="${INK}" fill-opacity="0.35"/>
    <path d="M52 48h24M64 48v32" stroke-width="2"/>
    <circle cx="52" cy="48" r="4" stroke-width="1.4"/>
    <circle cx="76" cy="48" r="4" stroke-width="1.4"/>
    <path d="M58 72c4 6 8 6 12 0" stroke-width="1.2" opacity="0.5"/>`,
  neptune: `<path d="M64 36v44" stroke-width="2.2"/>
    <path d="M52 44c6-6 14-6 20 0M52 52c8 4 16 4 24 0" stroke-width="1.6"/>
    <path d="M48 80c8 8 24 8 32 0" stroke-width="1.8"/>
    <path d="M54 72c6 4 14 4 20 0" stroke-width="1.2" opacity="0.55"/>`,
  pluto: `<circle cx="64" cy="58" r="14" stroke-width="2.2" fill="${INK}" fill-opacity="0.35"/>
    <path d="M64 72v16M56 84h16" stroke-width="2"/>
    <path d="M58 54c-6-2-8 4-4 8s10 2 12-4" stroke-width="1.4" stroke="${GOLD_LIGHT}" opacity="0.6"/>
    <path d="M72 46l8-6" stroke-width="1.3" opacity="0.55"/>`,
};

const TITLES = {
  sun: 'Sun', moon: 'Moon', mercury: 'Mercury', venus: 'Venus', mars: 'Mars',
  jupiter: 'Jupiter', saturn: 'Saturn', uranus: 'Uranus', neptune: 'Neptune', pluto: 'Pluto',
};

await mkdir(OUT_PLANETS, { recursive: true });

for (const [k, art] of Object.entries(PLANETS)) {
  await writeFile(join(OUT_PLANETS, `${k}.svg`), wrap(TITLES[k], art));
}

console.log(`Wrote ${Object.keys(PLANETS).length} planet orb SVGs (elements → generate-element-seals.mjs)`);