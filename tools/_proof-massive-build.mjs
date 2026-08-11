/**
 * Static proof: AstroPrecise v835 launch architecture.
 * Exit 0 only when the flagship 3D, truthful commerce, shared chrome and
 * verification surfaces are wired to the current release contract.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const web = path.join(root, 'website');
let fails = 0;
function ok(cond, msg) {
  if (cond) console.log('PASS', msg);
  else { console.error('FAIL', msg); fails++; }
}

const mustExist = [
  'js/orrery-webgl.js',
  'js/void-orrery-adapter.js',
  'js/ap-eclipse-live-v834.js',
  'js/ap-eclipse-geometry-v834.js',
  'js/ap-mystic-cards-v835.js',
  'css/ap-living-sky-v834.css',
  'css/ap-eclipse-live-v834.css',
  'css/ap-footer-v835.css',
  'css/ap-numerology-v835.css',
  'img/editorial/eclipse-launch-2026-v835.webp',
  'img/shop/numbered-sky-plate-v835.webp',
  'img/eclipse-geometry.svg',
  'js/eclipse-reading.js',
  'js/plate-fingerprint.js',
  'assets/textures/earth_md.webp',
  'assets/textures/saturn_md.webp',
];
for (const file of mustExist) {
  ok(fs.existsSync(path.join(web, file)), 'exists ' + file);
}

const index = fs.readFileSync(path.join(web, 'index.html'), 'utf8');
ok(/The sky is alive\./i.test(index), 'index launch brand line');
ok(/<void-orrery[^>]+data-renderer="webgl-only"/i.test(index), 'index requires the real WebGL Observatory');
ok(/id="mladder"/.test(index) && /id="dock"/.test(index), 'index exposes scale and world controls');
ok(/ap-mystic-cards-v835\.js/.test(index), 'index loads art-only spectral interaction');
ok(!/ap-sky-news\.js/.test(index), 'index excludes retired sky-news band');
ok(/js\/ap-nav-model\.js\?v=835/.test(index) && !/ap-nav-model-v834/.test(index), 'index uses the one canonical navigation model');

const chart = fs.readFileSync(path.join(web, 'chart.html'), 'utf8');
ok(/id="chart-form"/.test(chart), 'chart keeps the birth-chart calculation form');
ok(/js\/chart-page\.js\?v=835/.test(chart), 'chart loads the v835 calculation controller');
ok(!/ap-natal-sphere/.test(chart), 'chart excludes retired natal-sphere decoration');

const shop = fs.readFileSync(path.join(web, 'shop.html'), 'utf8');
ok(/Not for sale today/i.test(shop), 'shop states availability truthfully');
ok(/Planned £/.test(shop), 'shop labels planned prices');
ok(!/(?:gumroad|ap-checkout-honest)/i.test(shop), 'shop exposes no dead checkout path');
ok(/ap-mystic-cards-v835\.js/.test(shop), 'shop loads art-only spectral interaction');

const numerology = fs.readFileSync(path.join(web, 'numerology.html'), 'utf8');
ok(/class="page-numerology"/.test(numerology) && /class="site-header"/.test(numerology),
  'numerology uses the shared launch shell');
ok(/ap-numerology-v835\.css\?v=835/.test(numerology) && /ap-nav-model\.js\?v=835/.test(numerology),
  'numerology loads the v835 visual and navigation systems');
ok(!/#6fd8c6|Space Grotesk|class="wrap"/.test(numerology), 'numerology excludes the retired teal mini-site');
ok((numerology.match(/class="ap-number-route"/g) || []).length === 3, 'numerology exposes three clearly labelled traditions');
const mysticCards = fs.readFileSync(path.join(web, 'js/ap-mystic-cards-v835.js'), 'utf8');
ok(/page-numerology \.ap-number-route__visual/.test(mysticCards), 'numerology cards use the shared spectral interaction');

const footerJs = fs.readFileSync(path.join(web, 'js/ap-footer-inject.js'), 'utf8');
ok(/ap-footer-v835\.css\?v=835/.test(footerJs), 'shared footer self-loads its standalone styles');
ok(/Astronomy computed locally/.test(footerJs), 'shared footer carries the concise launch colophon');
const footerCss = fs.readFileSync(path.join(web, 'css/ap-footer-v835.css'), 'utf8');
ok(/@media\s*\(max-width:\s*700px\)[\s\S]*grid-template-columns:\s*1fr/.test(footerCss), 'standalone footer collapses to one column on phones');
const signGenerator = fs.readFileSync(path.join(web, 'tools/generate-sign-pages.mjs'), 'utf8');
ok(/ap-footer-inject\.js\?v=835/.test(signGenerator), 'zodiac generator preserves the compact footer');

const sitemap = fs.readFileSync(path.join(web, 'sitemap.xml'), 'utf8');
const sitemapPages = [...sitemap.matchAll(/https:\/\/astroprecise\.app\/([^<]*\.html)/g)].map((match) => match[1]);
const missingFooters = sitemapPages.filter((page) => {
  const html = fs.readFileSync(path.join(web, page), 'utf8');
  return !/ap-footer-inject\.js/.test(html);
});
ok(missingFooters.length === 0, 'all sitemap HTML routes load the compact footer'
  + (missingFooters.length ? ': ' + missingFooters.join(', ') : ''));

const eclipse = fs.readFileSync(path.join(web, 'eclipse.html'), 'utf8');
ok(/ap-eclipse-live-v834\.js\?v=835/.test(eclipse), 'eclipse loads the dedicated v835 3D instrument');
ok(/class="ap-eclipse-live__canvas"/.test(eclipse), 'eclipse owns one dedicated 3D canvas');
ok(/data-eclipse-event/.test(eclipse) && /data-eclipse-now/.test(eclipse), 'eclipse exposes live and greatest-event controls');
ok(!/(?:gumroad|ap-checkout-honest)/i.test(eclipse), 'eclipse exposes no dead checkout path');

const deep = fs.readFileSync(path.join(web, 'deep-reading.html'), 'utf8');
ok(/shop\.html#deep-reading/.test(deep), 'deep-reading legacy route points to its Shop edition');
ok(!/(?:gumroad|ap-checkout-honest)/i.test(deep), 'deep-reading exposes no dead checkout path');

const plate = fs.readFileSync(path.join(web, 'natal-plate.html'), 'utf8');
ok(/numbered-sky-plate-v835\.webp/.test(plate), 'natal plate uses the authored product artwork');
ok(!/(?:gumroad|ap-checkout-honest)/i.test(plate), 'natal plate exposes no dead checkout path');

const sw = fs.readFileSync(path.join(web, 'sw.js'), 'utf8');
const versionMatch = sw.match(/const V\s*=\s*"([^"]+)"/);
ok(versionMatch && versionMatch[1] === 'ap-v835', 'SW release tip ' + (versionMatch && versionMatch[1]));

const verify = fs.readFileSync(path.join(web, 'verify.html'), 'utf8');
ok(/plate-fingerprint\.js/.test(verify), 'verify imports plate-fingerprint');
ok(!/inlined copy of plate-fingerprint/.test(verify), 'verify does not inline the fingerprint algorithm');
ok(/plate-register\.jsonl/.test(verify), 'verify loads the public register');

console.log(fails ? '\n' + fails + ' FAIL(s)' : '\nALL GATES PASS');
process.exit(fails ? 1 : 0);
