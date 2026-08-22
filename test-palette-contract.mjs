import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};

const palette = read('./website/css/ap-palette-2026.css');
const atlas = read('./website/css/ap-atlas-tokens.css');

const requiredPaletteTokens = {
  '--ap-void': '#040812',
  '--ap-paper': '#EEF4FA',
  '--ap-silver': '#93A8BF',
  '--ap-ion': '#8BA9FF',
  '--ap-ion-hover': '#A5BCFF',
  '--ap-violet': '#A897FF',
  '--ap-proof': '#6FD0B3',
  '--ap-danger': '#FF8EA8',
  '--ap-cta-ink': '#07101E',
};

for (const [token, value] of Object.entries(requiredPaletteTokens)) {
  const pattern = new RegExp(`${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:\\s*${value}`, 'i');
  check(pattern.test(palette), `palette is missing ${token}: ${value}`);
  check(pattern.test(atlas) || ['--ap-void', '--ap-paper', '--ap-cta-ink'].includes(token),
    `atlas is missing the ${token} mirror`);
}

const brandSurfaces = [
  './website/css/ap-palette-2026.css',
  './website/css/ap-atlas-tokens.css',
  './website/css/ap-living-sky-v834.css',
  './website/css/ap-home-v835.css',
  './website/css/ap-phone-pass.css',
  './website/css/ap-chart-v835.css',
  './website/css/ap-shop-v835.css',
  './website/css/ap-couples-v858.css',
  './website/css/ap-daily-v835.css',
  './website/css/ap-eclipse-live-v834.css',
  './website/css/ap-eclipse-v835.css',
  './website/css/ap-keep-sky.css',
  './website/css/ap-mystic-cards-v835.css',
  './website/css/ap-natal-reading.css',
  './website/css/ap-overhaul-s8.css',
  './website/css/celestial-seals.css',
  './website/css/tonight-page.css',
  './website/js/orrery-webgl.js',
  './website/js/void-orrery-adapter.js',
  './website/js/ap-sky-time.js',
  './website/js/ap-observatory-controls-v835.js',
  './website/js/chart-page.js',
  './website/js/chart-render.js',
  './website/js/ap-canvas-seals.js',
  './website/js/quiz.js',
  './website/favicon.svg',
  './website/img/logo-mark.svg',
  './website/cosmic-story.html',
  './website/sample-reading.html',
  './website/profile.html',
  './website/sky-events.html',
  './website/sky-card.html',
  './website/explore.html',
  './website/deep-time.html',
  './website/tonight.html',
  './website/quiz.html',
];

const retiredHex = /#(?:b86b4a|c87d5c|ff6428|ff5a1f|ff7a45|d8b46a)\b/i;
const retiredRgb = /rgba?\(\s*(?:184\s*,\s*107\s*,\s*74|255\s*,\s*(?:90|100)\s*,\s*(?:31|40)|216\s*,\s*180\s*,\s*106)\b/i;

for (const path of brandSurfaces) {
  const source = read(path);
  check(!retiredHex.test(source), `${path} still contains a retired orange/copper hex`);
  check(!retiredRgb.test(source), `${path} still contains a retired orange/copper RGB value`);
}

function linearChannel(channel) {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const rgb = hex.match(/[0-9a-f]{2}/gi).map((part) => Number.parseInt(part, 16));
  return 0.2126 * linearChannel(rgb[0]) + 0.7152 * linearChannel(rgb[1]) + 0.0722 * linearChannel(rgb[2]);
}

function contrast(a, b) {
  const hi = Math.max(luminance(a), luminance(b));
  const lo = Math.min(luminance(a), luminance(b));
  return (hi + 0.05) / (lo + 0.05);
}

check(contrast('8BA9FF', '040812') >= 4.5, 'ion text/action fails AA contrast on lunar void');
check(contrast('07101E', '8BA9FF') >= 4.5, 'CTA ink fails AA contrast on ion fill');
check(contrast('EEF4FA', '040812') >= 7, 'primary paper fails the intended AAA contrast floor');

if (failures.length) {
  console.error(`Midnight Meridian palette contract failed (${failures.length})`);
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log(`Midnight Meridian palette contract OK (${brandSurfaces.length} surfaces)`);
