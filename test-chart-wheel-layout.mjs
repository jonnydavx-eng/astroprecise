import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('./website/js/chart-render.js', import.meta.url), 'utf8');
const chartPageSource = readFileSync(new URL('./website/js/chart-page.js', import.meta.url), 'utf8');
const chartCssSource = readFileSync(new URL('./website/css/ap-chart-v835.css', import.meta.url), 'utf8');
const canvasSealSource = readFileSync(new URL('./website/js/ap-canvas-seals.js', import.meta.url), 'utf8');
const sandbox = { console, window: {} };
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: 'chart-render.js' });

const layout = sandbox.window.AstroChartRender.layoutPlanetAngles;

function circularGaps(result) {
  const angles = Object.values(result).sort((a, b) => a - b);
  return angles.map((angle, index) => {
    const next = angles[(index + 1) % angles.length];
    return ((next - angle) + 360) % 360;
  });
}

const exactTie = [
  { name: 'Sun', angle: 42 },
  { name: 'Moon', angle: 42 },
  { name: 'Mercury', angle: 42 },
];
const tied = layout(exactTie, 10);
assert.equal(Object.keys(tied).length, 3, 'exact conjunction lost a body');
assert.ok(Math.min(...circularGaps(tied)) >= 9.99, 'exact conjunction was not separated');
assert.deepEqual(
  tied,
  layout(exactTie.slice().reverse(), 10),
  'exact-tie layout depends on input order'
);

const acrossZero = layout([
  { name: 'Sun', angle: 355 },
  { name: 'Moon', angle: 0 },
  { name: 'Mercury', angle: 5 },
  { name: 'Venus', angle: 180 },
], 10);
assert.ok(
  circularGaps(acrossZero).filter(gap => gap < 100).every(gap => gap >= 9.99),
  'cluster crossing 0° did not keep minimum spacing'
);
assert.deepEqual(
  acrossZero,
  layout([
    { name: 'Venus', angle: 180 },
    { name: 'Mercury', angle: 5 },
    { name: 'Moon', angle: 0 },
    { name: 'Sun', angle: 355 },
  ], 10),
  'wrap-cluster layout depends on input order'
);

const paletteSurface = [source, chartPageSource, chartCssSource, canvasSealSource].join('\n');
assert.doesNotMatch(
  paletteSurface,
  /#(?:B86B4A|FF5A1F|D8B46A|FF6428|A8725C|C25A4E|B0703E)|rgba\(\s*(?:184\s*,\s*107\s*,\s*74|216\s*,\s*180\s*,\s*106|255\s*,\s*100\s*,\s*40)/i,
  'legacy warm brand color leaked into a chart UI or renderer path'
);

const aspectRadius = Number(source.match(/const R_ASPECT\s*=\s*([0-9.]+)/)?.[1]);
const centerRadius = Number(source.match(/const R_CENTER_FILL\s*=\s*([0-9.]+)/)?.[1]);
assert.ok(
  aspectRadius > centerRadius + 40,
  `aspect chords must remain visibly outside the center disc (${aspectRadius} vs ${centerRadius})`
);
assert.match(
  source,
  /drawZodiacWheel\([^;]+;\s*drawHouseBackdrop\([^;]+;\s*if \(showAsp\) drawAspectLines\([^;]+;\s*drawHouseGrid\(/,
  'aspect field must sit above the opaque house backdrop and below the house grid'
);
assert.match(source, /function drawHouseBackdrop[\s\S]*?class: 'house-wheel house-wheel--backdrop'[\s\S]*?fill: `url\(#\$\{idPrefix\}cgrad\)`/,
  'the opaque house disc must remain isolated in the backdrop layer');
assert.match(source, /function drawHouseGrid[\s\S]*?class: 'house-wheel house-wheel--grid'[\s\S]*?ANGLE_LABELS/,
  'house lines and labels must remain in a foreground grid layer');

const aspectCues = [
  ['Conjunction', '#EEF4FA', '2.4', 'null'],
  ['Opposition', '#FF8EA8', '1.8', "'10,4'"],
  ['Trine', '#6FD0B3', '1.6', 'null'],
  ['Square', '#A897FF', '1.8', "'6,2'"],
  ['Sextile', '#79C7F2', '1.2', "'2,2'"],
  ['Quincunx', '#93A8BF', '0.6', "'3,3'"],
];

assert.equal(
  new Set(aspectCues.slice(0, 5).map(([, , width, dash]) => `${width}/${dash}`)).size,
  5,
  'major and sextile aspect cues must remain distinguishable without colour'
);
assert.match(source, /styleKey !== 'Opposition'/,
  'dense opposition dashes must stay crisp instead of merging through the major-aspect glow');

for (const [aspect, color, width, dash] of aspectCues) {
  assert.match(
    source,
    new RegExp(`${aspect}:\\s*\\{\\s*color:'${color}',\\s*width:${width.replace('.', '\\.')},\\s*dash:${dash.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}`),
    `${aspect} lost its Midnight Meridian color or redundant line-style cue`
  );
}

assert.match(chartCssSource, /result-time-chip\[data-level="exact"\][\s\S]*?var\(--chart-proof\)/, 'exact state is not proof mint');
assert.match(chartCssSource, /result-time-chip\[data-level="approximate"\][\s\S]*?var\(--chart-violet\)/, 'approximate state is not lavender');
assert.match(chartCssSource, /result-time-chip\[data-level="unknown"\][\s\S]*?var\(--chart-danger\)/, 'unknown state is not rose');
assert.match(chartCssSource, /\.aspect-line--draw[\s\S]*?animation:\s*ap-chart-aspect-draw/, 'loaded chart CSS must reveal solid aspect lines');
assert.match(chartCssSource, /prefers-reduced-motion[\s\S]*?\.aspect-line--draw[\s\S]*?stroke-dashoffset:\s*0\s*!important/, 'reduced motion must leave solid aspects visible');

console.log('PASS chart wheel: collision layout and Midnight Meridian semantic colors are deterministic');
