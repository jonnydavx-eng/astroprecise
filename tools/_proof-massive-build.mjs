/**
 * Static proof: AstroPrecise Act 1 launch architecture.
 * Exit 0 only when the flagship 3D, truthful commerce, shared chrome and
 * verification surfaces are wired to the current release contract.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const web = path.join(root, 'website');
const RELEASE = '874';
const ACT_ONE_PAGES = [
  'index.html',
  'chart.html',
  'compatibility.html',
  'tonight.html',
  'sky-events.html',
  'eclipse.html',
  'shop.html',
  'deep-reading.html',
];
const PINNED_RELEASE_PAGES = ACT_ONE_PAGES.concat([
  'privacy.html',
  'terms.html',
  'refunds.html',
  'verify.html',
  'contact.html',
  'sample-reading.html',
  'natal-plate.html',
]);
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
  'img/editorial/eclipse-launch-2026-v835.webp',
  'img/editorial/eclipse-edition-art-v841.png',
  'img/editorial/eclipse-field-guide-cover-final-v836.png',
  'img/shop/numbered-sky-plate-v835.webp',
  'img/eclipse-geometry.svg',
  'downloads/astroprecise-eclipse-field-guide-2026.pdf',
  'guides/eclipse-field-guide-2026.html',
  'js/eclipse-reading.js',
  'js/ap-eclipse-edition-v841.js',
  'js/plate-fingerprint.js',
  'assets/textures/earth_md.webp',
  'assets/textures/saturn_md.webp',
];
for (const file of mustExist) {
  ok(fs.existsSync(path.join(web, file)), 'exists ' + file);
}

const retiredAssets = [
  'css/ap-launch-unified-v832.css',
  'css/ap-living-sky-v833.css',
  'css/ap-observatory-home.css',
  'css/compatibility-critical.css',
  'css/compatibility-page-deferred.css',
  'css/explore-page-v832.css',
  'css/explore-page.css',
  'css/horoscope-critical.css',
  'css/horoscope-page-deferred.css',
  'css/horoscope-personal.css',
  'css/index-home.css',
  'css/landing-gate.css',
  'css/lite-critical.css',
  'css/synastry-page.css',
  'css/ap-cosmic-flight.css',
  'css/ap-sky-news.css',
  'css/ap-shop-enchanted.css',
  'js/ap-award-orrery.js',
  'js/ap-cosmic-flight-tool.js',
  'js/ap-sky-news.js',
  'js/ap-home-bootstrap.js',
  'js/ap-nav-model-v832.js',
  'js/ap-responsive-nav.js',
  'js/compatibility-page.js',
  'js/explore-boot-v832.js',
  'js/explore-boot.js',
  'js/home-daily.js',
  'js/home-match.js',
  'js/home-sign-picker.js',
  'js/lite-shell-boot.js',
  'js/shop-page-boot.js',
  'js/scale-journey-chapters.js',
  'js/scale-journey.js',
  'js/synastry-shared.js',
  'js/tool-cards.js',
];
const shippingSources = [];
function collectShippingSources(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) collectShippingSources(file);
    else if (file.endsWith('.html') || (file.startsWith(path.join(web, 'js') + path.sep) && file.endsWith('.js'))) {
      shippingSources.push(file);
    }
  }
}
collectShippingSources(web);
for (const asset of retiredAssets) {
  const leaf = path.basename(asset);
  const references = shippingSources.filter((file) => fs.readFileSync(file, 'utf8').includes(leaf));
  ok(!fs.existsSync(path.join(web, asset)) && references.length === 0,
    'retired asset is absent and unreferenced: ' + asset);
}

const index = fs.readFileSync(path.join(web, 'index.html'), 'utf8');
ok(/The sky is moving\./i.test(index), 'index launch brand line');
ok(/<void-orrery[^>]+data-renderer="webgl-only"/i.test(index), 'index requires the real WebGL Observatory');
ok(/id="mladder"/.test(index) && /id="dock"/.test(index), 'index exposes scale and world controls');
ok(/id="ap-cosmic-flight-launch"/.test(index) && /if \(orrery\.flight\)/.test(index),
  'index exposes the opt-in same-model journey without an auto-opening overlay');
ok(/ap-mystic-cards-v835\.js/.test(index), 'index loads art-only spectral interaction');
ok(!/ap-sky-news\.js/.test(index), 'index excludes retired sky-news band');
ok(new RegExp('js/ap-nav-model\\.js\\?v=' + RELEASE).test(index) && !/ap-nav-model-v834/.test(index), 'index uses the one canonical navigation model');
ok(!/horoscope\.html|quiz\.html|angel-numbers\.html|name-numerology\.html/.test(index), 'index keeps retired rooms off the front path');

const navPrefetch = fs.readFileSync(path.join(web, 'js/ap-nav-prefetch.js'), 'utf8');
const pageBridge = fs.readFileSync(path.join(web, 'js/ap-page-bridge.js'), 'utf8');
const appJs = fs.readFileSync(path.join(web, 'js/app.js'), 'utf8');
ok(/index\|chart\|sky-events\|shop/.test(navPrefetch) && !/horoscope/.test(navPrefetch),
  'prefetch targets only the four Act 1 destinations');
ok(!/Daily|Life Path|Quiz|horoscope\.html|lifepath\.html|quiz\.html/.test(pageBridge),
  'continue toast cannot advertise retired rooms');
ok(!/\(index\|chart\|horoscope\|shop\|eclipse\)/.test(appJs)
    && /\(index\|chart\|sky-events\|shop\|eclipse\)/.test(appJs),
  'runtime launch classification uses Events instead of Daily');

const chart = fs.readFileSync(path.join(web, 'chart.html'), 'utf8');
ok(/id="chart-form"/.test(chart), 'chart keeps the birth-chart calculation form');
ok(new RegExp('js/chart-page\\.js\\?v=' + RELEASE).test(chart), 'chart loads the current calculation controller');
ok(!/ap-natal-sphere/.test(chart), 'chart excludes retired natal-sphere decoration');
ok(!/horoscope\.html|quiz\.html/.test(chart), 'chart keeps Daily and quiz off the front path');

const shop = fs.readFileSync(path.join(web, 'shop.html'), 'utf8');
ok(/(?:12 Aug edition · £7|Buy the £7 edition|your-eclipse-reading)/i.test(shop), 'shop states £7 edition availability truthfully');
ok(/£7|Free\b/.test(shop), 'shop labels edition prices');
ok(/https:\/\/davxplorer3\.gumroad\.com\/l\/your-eclipse-reading/.test(shop), 'shop exposes the verified Gumroad checkout path');
ok(/ap-mystic-cards-v835\.js/.test(shop), 'shop loads art-only spectral interaction');

const mysticCards = fs.readFileSync(path.join(web, 'js/ap-mystic-cards-v835.js'), 'utf8');
ok(/page-shop/.test(mysticCards), 'shop cards use the shared spectral interaction');

const footerJs = fs.readFileSync(path.join(web, 'js/ap-footer-inject.js'), 'utf8');
ok(new RegExp('ap-footer-v835\\.css\\?v=' + RELEASE).test(footerJs), 'shared footer self-loads its standalone styles');
ok(/Astronomy computed locally/.test(footerJs), 'shared footer carries the concise launch colophon');
ok(!/Daily|Life Path|Quiz|Mission Control|horoscope\.html|lifepath\.html|quiz\.html|angel-numbers\.html/i.test(footerJs),
  'shared footer keeps retired rooms out of site chrome');
const footerCss = fs.readFileSync(path.join(web, 'css/ap-footer-v835.css'), 'utf8');
ok(/@media\s*\(max-width:\s*700px\)[\s\S]*grid-template-columns:\s*1fr/.test(footerCss), 'standalone footer collapses to one column on phones');
const phoneCss = fs.readFileSync(path.join(web, 'css/ap-phone-pass.css'), 'utf8');
ok(/\.ap-events-feature p[\s\S]*\.event__ledger p[\s\S]*font-size:\s*16px\s*!important/.test(phoneCss),
  'Events narrative copy keeps the 16px phone floor');
ok(/page-chart \.form-label[\s\S]*page-compat label[\s\S]*font-size:\s*16px\s*!important/.test(phoneCss),
  'Act 1 form labels keep the 16px phone floor');
ok(/\.ap-context__chart[\s\S]*\.ap-site-footer__legal a[\s\S]*\.ap-product__foot a[\s\S]*min-height:\s*44px\s*!important/.test(phoneCss),
  'Act 1 secondary links keep 44px phone targets');
ok(/html body\.ap-live-home \.ap-model-stage[\s\S]*min-height:\s*420px/.test(phoneCss),
  'Observatory phone stage keeps a 420px WebGL floor');
ok(/html body\.page-sky-card/.test(phoneCss) && /background:\s*#020307/.test(phoneCss),
  'sky-card phone restyle stays on the house void');
for (const page of ['index.html', 'chart.html', 'compatibility.html', 'tonight.html', 'sky-events.html']) {
  const html = fs.readFileSync(path.join(web, page), 'utf8');
  const sheets = [...html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi)].map((match) => match[0]);
  ok(sheets.length > 0 && /ap-phone-pass\.css/.test(sheets[sheets.length - 1]),
    page + ' loads the phone pass last');
}
const skyCard = fs.readFileSync(path.join(web, 'sky-card.html'), 'utf8');
ok(/background:#020307/.test(skyCard) && /page-sky-card/.test(skyCard),
  'sky-card chrome uses the house void');
ok(/dob'\)\.value \+ 'T' \+ \(\$\('tob'\)\.value \|\| '12:00'\) \+ ':00Z'/.test(skyCard),
  'sky-card keep/time path is unchanged');
ok(/data-renderer="webgl-only"/.test(index) && /data-renderer="webgl-only"/.test(chart),
  'phone pass does not swap the 3D instrument to 2D');
const signGenerator = fs.readFileSync(path.join(web, 'tools/generate-sign-pages.mjs'), 'utf8');
ok(new RegExp('ap-footer-inject\\.js\\?v=' + RELEASE).test(signGenerator), 'zodiac generator preserves the compact footer');

const htmlFiles = fs.readdirSync(web).filter((name) => name.endsWith('.html'));
const staleNoscriptPages = htmlFiles.filter((name) => {
  const html = fs.readFileSync(path.join(web, name), 'utf8');
  const navFallbacks = [...html.matchAll(/<noscript[\s\S]*?<\/noscript>/gi)]
    .map((match) => match[0])
    .filter((block) => /navbar__link/.test(block));
  return navFallbacks.some((block) =>
    /Daily|Life Path|Quiz|Mission Control|horoscope\.html|lifepath\.html|quiz\.html|angel-numbers\.html/i.test(block));
});
ok(staleNoscriptPages.length === 0, 'no-script navigation keeps retired rooms off the front path'
  + (staleNoscriptPages.length ? ': ' + staleNoscriptPages.join(', ') : ''));

const sitemap = fs.readFileSync(path.join(web, 'sitemap.xml'), 'utf8');
const sitemapPages = [...sitemap.matchAll(/https:\/\/astroprecise\.app\/([^<]*\.html)/g)].map((match) => match[1]);
const standaloneSitemapPages = new Set(['guides/eclipse-field-guide-2026.html', 'synastry.html']);
const missingFooters = sitemapPages.filter((page) => {
  if (standaloneSitemapPages.has(page)) return false;
  const html = fs.readFileSync(path.join(web, page), 'utf8');
  return !/ap-footer-inject\.js/.test(html);
});
ok(missingFooters.length === 0, 'all sitemap HTML routes load the compact footer'
  + (missingFooters.length ? ': ' + missingFooters.join(', ') : ''));
ok(sitemapPages.includes('guides/eclipse-field-guide-2026.html'), 'finished eclipse field guide is discoverable in sitemap');
for (const retired of ['horoscope.html', 'quiz.html', 'angel-numbers.html', 'name-numerology.html', 'numerology.html']) {
  ok(!sitemapPages.includes(retired), 'retired room stays off sitemap: ' + retired);
}
const manifest = fs.readFileSync(path.join(web, 'manifest.json'), 'utf8');
ok(!/horoscope\.html/.test(manifest), 'PWA shortcuts must not reopen Daily');
const shortcutNames = JSON.parse(manifest).shortcuts.map((shortcut) => shortcut.name);
ok(JSON.stringify(shortcutNames) === JSON.stringify(['Observatory', 'Chart', 'Events', 'Shop']),
  'PWA shortcuts stay on the named Act 1 spine');

for (const page of PINNED_RELEASE_PAGES) {
  const html = fs.readFileSync(path.join(web, page), 'utf8');
  const pins = [...html.matchAll(/[?&]v=(\d+)/g)].map((match) => match[1]);
  ok(pins.length > 0 && pins.every((pin) => pin === RELEASE),
    page + ' uses only cache tip ' + RELEASE);
  if (ACT_ONE_PAGES.includes(page)) {
    const inlineVersion = html.match(/AP_ASSET_V\s*=\s*['"](\d+)['"]/);
    ok(inlineVersion && inlineVersion[1] === RELEASE,
      page + ' exposes runtime cache tip ' + RELEASE);
  }
}

const indexLite = fs.readFileSync(path.join(web, 'index-lite.html'), 'utf8');
ok(/<meta\s+name="robots"\s+content="noindex, follow"\s*\/?>/.test(indexLite), 'legacy lite redirect cannot compete with the canonical home page');

const eclipse = fs.readFileSync(path.join(web, 'eclipse.html'), 'utf8');
ok(new RegExp('ap-eclipse-live-v834\\.js\\?v=' + RELEASE).test(eclipse), 'eclipse loads the dedicated 3D instrument');
ok(/class="ap-eclipse-live__canvas"/.test(eclipse), 'eclipse owns one dedicated 3D canvas');
ok(/data-eclipse-event/.test(eclipse) && /data-eclipse-now/.test(eclipse), 'eclipse exposes live and greatest-event controls');
ok(/data-eclipse-play/.test(eclipse) && (eclipse.match(/data-eclipse-lens=/g) || []).length === 3,
  'eclipse exposes a computed passage replay and three camera lenses');
ok(/data-eclipse-share/.test(eclipse), 'eclipse exposes shareable computed moments');
ok(/astroprecise-eclipse-field-guide-2026\.pdf/.test(eclipse), 'eclipse exposes the free field guide');
ok(/id="eclipseEdition"[^>]+hidden/.test(eclipse), 'eclipse exposes a result-gated paid edition host');
ok(!/(?:gumroad|ap-checkout-honest)/i.test(eclipse), 'eclipse exposes no dead checkout path');

const deep = fs.readFileSync(path.join(web, 'deep-reading.html'), 'utf8');
ok(/eclipse\.html#contact/.test(deep), 'deep-reading legacy route points to the free eclipse contact first');
ok(!/(?:gumroad|ap-checkout-honest)/i.test(deep), 'deep-reading exposes no dead checkout path');

const plate = fs.readFileSync(path.join(web, 'natal-plate.html'), 'utf8');
ok(/numbered-sky-plate-v835\.webp/.test(plate), 'natal plate uses the authored product artwork');
ok(!/(?:gumroad|ap-checkout-honest)/i.test(plate), 'natal plate exposes no dead checkout path');

const sw = fs.readFileSync(path.join(web, 'sw.js'), 'utf8');
const versionMatch = sw.match(/const V\s*=\s*"([^"]+)"/);
ok(versionMatch && versionMatch[1] === 'ap-v' + RELEASE, 'SW release tip ' + (versionMatch && versionMatch[1]));

const verify = fs.readFileSync(path.join(web, 'verify.html'), 'utf8');
ok(/plate-fingerprint\.js/.test(verify), 'verify imports plate-fingerprint');
ok(!/inlined copy of plate-fingerprint/.test(verify), 'verify does not inline the fingerprint algorithm');
ok(/plate-register\.jsonl/.test(verify), 'verify loads the public register');

console.log(fails ? '\n' + fails + ' FAIL(s)' : '\nALL GATES PASS');
process.exit(fails ? 1 : 0);
