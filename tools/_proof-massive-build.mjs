/**
 * Static proof: massive build vertical (sky news, natal sphere, honest checkout).
 * Exit 0 only if all gates pass.
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
  'js/ap-sky-news.js',
  'css/ap-sky-news.css',
  'js/ap-natal-sphere.js',
  'css/ap-natal-sphere.css',
  'js/ap-checkout-honest.js',
  'img/eclipse-geometry.svg',
  'img/plate-enhanced.svg',
  'js/eclipse-reading.js',
  'js/deep-reading.js',
  'js/plate-fingerprint.js',
];
for (const f of mustExist) {
  ok(fs.existsSync(path.join(web, f)), `exists ${f}`);
}

const index = fs.readFileSync(path.join(web, 'index.html'), 'utf8');
ok(/THE REAL SKY NEWS/i.test(index), 'index brand line');
ok(/ap-sky-news\.js/.test(index), 'index loads sky news');
ok(/id="ap-sky-news-band"/.test(index), 'index has sky news band host (hero mount removed 2026-07-31 per expert audit)');

const chart = fs.readFileSync(path.join(web, 'chart.html'), 'utf8');
ok(/ap-natal-sphere/.test(chart), 'chart has natal sphere host');
ok(/ap-natal-sphere\.js/.test(chart), 'chart loads natal sphere');

const skyNews = fs.readFileSync(path.join(web, 'js/ap-sky-news.js'), 'utf8');
ok(/buildNews|APSkyNews/.test(skyNews), 'sky news API');
ok(/weather report|not prophecy/i.test(skyNews), 'sky news honesty');

const sphere = fs.readFileSync(path.join(web, 'js/ap-natal-sphere.js'), 'utf8');
ok(/APNatalSphere|project\(/.test(sphere), 'natal sphere projection');

const honest = fs.readFileSync(path.join(web, 'js/ap-checkout-honest.js'), 'utf8');
ok(/hardenAllDeadGumroad|REPLACE_ME/.test(honest), 'checkout honest module');

const gum = fs.readFileSync(path.join(web, 'js/gumroad-unlock.js'), 'utf8');
ok(/deep-reading/.test(gum) && /resolveProductSlug/.test(gum), 'deep-reading slug alias');

const sw = fs.readFileSync(path.join(web, 'sw.js'), 'utf8');
const m = sw.match(/const V\s*=\s*"([^"]+)"/);
ok(m && m[1] && /ap-v(7[6-9]|8\d{2})/.test(m[1]), `SW tip ${m && m[1]}`);

const pages = ['eclipse.html', 'deep-reading.html', 'natal-plate.html'];
for (const p of pages) {
  const html = fs.readFileSync(path.join(web, p), 'utf8');
  ok(/ap-checkout-honest/.test(html), `${p} loads checkout honest`);
  ok(!/gumroad\.com\/l\/REPLACE/i.test(html), `${p} no dead gumroad buy href`);
}

const verify = fs.readFileSync(path.join(web, 'verify.html'), 'utf8');
ok(/plate-fingerprint\.js/.test(verify), 'verify imports plate-fingerprint');
ok(!/inlined copy of plate-fingerprint/.test(verify), 'verify not inlined fingerprint');
ok(/plate-register\.jsonl/.test(verify), 'verify loads public register');

console.log(fails ? `\n${fails} FAIL(s)` : '\nALL GATES PASS');
process.exit(fails ? 1 : 0);
