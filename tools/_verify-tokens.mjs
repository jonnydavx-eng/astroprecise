import { readFileSync } from 'node:fs';
const files = [
  'website/css/moonphase-page.css',
  'website/css/retrograde-page.css',
  'website/css/transits-page.css',
  'website/guides.html',
  'website/css/main.css',
  'website/css/main-lite.css',
];
for (const f of files) {
  const t = readFileSync(f, 'utf8');
  const purpleHex = [...t.matchAll(/#4a3a5c|#6AB0FF|#6a5a52|92,\s*74,\s*110|122,\s*100,\s*150/g)];
  const aliases = [...t.matchAll(/--purple:[^;]+/g)].map(m => m[0]);
  const indigo = [...t.matchAll(/--indigo:[^;]+/g)].map(m => m[0]);
  const night = (t.match(/#08080b/gi) || []).length;
  console.log(f);
  console.log('  leftover purple hex', purpleHex.length ? purpleHex.map(m=>m[0]).join('|') : 'none');
  console.log('  --purple', aliases.join(' | ') || '-');
  console.log('  --indigo', indigo.join(' | ') || '-');
  console.log('  #08080b', night);
}
const uranus = readFileSync('website/css/main.css','utf8');
console.log('uranus teal kept', uranus.includes('#7de8e8'));
console.log('neptune blue kept', uranus.includes('#6686ff'));
const deep = readFileSync('website/deep-reading.html','utf8');
console.log('deep UTC option', /option value="UTC"/.test(deep));
console.log('deep city', deep.includes('natal-city'));
console.log('deep hidden tz', /<input type="hidden" id="tz">/.test(deep));
const natal = readFileSync('website/js/ap-natal-reading.js','utf8');
console.log('natal refuse UTC', natal.includes("zone === 'UTC'") && natal.includes('validTimeZone(city.tz)'));
