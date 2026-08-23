import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));

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

function walk(directory, extension) {
  const paths = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) paths.push(...walk(absolute, extension));
    else if (entry.name.toLowerCase().endsWith(extension)) {
      paths.push(`./${relative(ROOT, absolute).replace(/\\/g, '/')}`);
    }
  }
  return paths;
}

const brandSurfaces = [
  ...walk(join(ROOT, 'website', 'css'), '.css'),
  ...walk(join(ROOT, 'website'), '.html'),
  './website/js/orrery-webgl.js',
  './website/js/void-orrery-adapter.js',
  './website/js/ap-sky-time.js',
  './website/js/ap-observatory-controls-v835.js',
  './website/js/chart-page.js',
  './website/js/chart-render.js',
  './website/js/ap-canvas-seals.js',
  './website/js/quiz.js',
  './website/js/home-daily.js',
  './website/js/home-match.js',
  './website/js/daily-transit.js',
  './website/js/ap-daily-bridge.js',
  './website/js/footer-chrome.js',
  './website/js/sky-guides.js',
  './website/js/lazy-zodiac-cards.js',
  './website/js/tool-cards.js',
  './website/js/ap-chart-share.js',
  './website/js/angel-numbers.js',
  './website/js/ap-eclipse-edition-v841.js',
  './website/js/ap-keep-sky.js',
  './website/js/ap-natal-sphere.js',
  './website/js/ap-moment-share.js',
  './website/js/horoscope-page.js',
  './website/js/horoscope-wheel-poster.js',
  './website/js/saturn-return.js',
  './website/js/zodiac-sphere.js',
  './website/favicon.svg',
  './website/img/favicon.svg',
  './website/img/logo.svg',
  './website/img/logo-mark.svg',
  './website/tools/generate-celestial-seals.mjs',
  './website/tools/generate-element-seals.mjs',
];

const retiredHex = /#(?:b86b4a|c87d5c|ff6428|ff5a1f|ff7a45|e4996f|d8b46a|e8c96a|c4920a|e6c24a|c2a05e|8c6a2f|d9bc5c|d4b87a|f0e8d8|e8e0d0|e6ddc8|ece6d8|c8b88f|f2dfa7)\b/i;
const retiredRgb = /rgba?\(\s*(?:184\s*,\s*107\s*,\s*74|255\s*,\s*(?:90|100|122)\s*,\s*(?:31|40|69)|216\s*,\s*180\s*,\s*106|232\s*,\s*201\s*,\s*106|196\s*,\s*146\s*,\s*10|240\s*,\s*232\s*,\s*216|232\s*,\s*224\s*,\s*208|242\s*,\s*236\s*,\s*223)\b/i;

function withoutPhysicalColour(source, path) {
  let audited = source;
  // Star temperatures and constellation artwork are observations, not brand
  // chrome. The rendered audit separately refuses warm interactive controls.
  if (path.endsWith('.html')) audited = audited.replace(/<svg\b[\s\S]*?<\/svg>/gi, '');
  return audited
    .split(/\r?\n/)
    .filter((line) => !/(?:palette-physical|planet|stellar|star-temperature|ap-orb--|\bsun\b|\bmars\b|\bjupiter\b|\bsaturn\b|\bvenus\b|\bmercury\b|\beclipse-geometry\b)/i.test(line))
    .join('\n');
}

for (const path of brandSurfaces) {
  const source = withoutPhysicalColour(read(path), path);
  check(!retiredHex.test(source), `${path} still contains a retired orange/copper hex`);
  check(!retiredRgb.test(source), `${path} still contains a retired orange/copper RGB value`);
  if (path.endsWith('.html')) {
    check(
      !/<link\b[^>]*\brel=["'][^"']*icon[^"']*["'][^>]*\bhref=["'][^"']*logo-mark\.svg["']/i.test(source),
      `${path} uses the transparent logo mark instead of the contained favicon`,
    );
  }
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
