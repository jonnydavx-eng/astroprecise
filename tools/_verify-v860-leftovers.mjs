import { readFileSync, existsSync, readdirSync } from 'node:fs';
const pages = [
  'accuracy.html','charts.html','ephemeris.html','cosmic-story.html','guides.html','moonphase.html','moment.html','saturn-return.html','solar-return.html','this-weeks-sky.html','retrograde.html','terms.html','refunds.html','verify.html','transits.html','profile.html','why.html','sky-events.html','privacy.html','what-is-my-rising-sign.html'
];
for (const p of pages) {
  const t = readFileSync('website/' + p, 'utf8');
  const n = (t.match(/Astro Precise/g) || []).length;
  if (n) console.log('SPACED STILL', p, n);
}
console.log('wordmark scan done');
const sw = readFileSync('website/sw.js','utf8');
console.log('SW', (sw.match(/const V = "([^"]+)"/) || [])[1]);
console.log('ASSET', readFileSync('website/js/ap-asset-v.js','utf8').match(/AP_ASSET_V = '(\d+)'/)[1]);
const chart = readFileSync('website/chart.html','utf8');
console.log('chart-page', (chart.match(/chart-page\.js\?v=(\d+)/) || [])[1]);
console.log('chart 837', /chart-page\.js\?v=837/.test(chart));
console.log('phone-pass queries', [...chart.matchAll(/ap-phone-pass\.css\?v=(\d+)/g)].map(m=>m[1]).join(','));
const man = JSON.parse(readFileSync('website/manifest.json','utf8'));
console.log('manifest theme', man.theme_color, man.background_color, man.name);
const backups = readdirSync('website').filter(n => n.includes('.pre-shell') || n.includes('.pre-redirect'));
console.log('backups on disk', backups.length, backups.slice(0,8).join(', '));
const build = readFileSync('tools/build.mjs','utf8');
console.log('build excludes pre-shell', build.includes(".pre-shell") && build.includes(".pre-redirect"));
const two = existsSync('website/two-people-in-one-sky.html') || existsSync('website/guides/two-people-in-one-sky.html');
console.log('two-people exists', two);
