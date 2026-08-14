import { readFileSync, writeFileSync } from 'fs';

const act1 = [
  'website/index.html',
  'website/chart.html',
  'website/shop.html',
  'website/eclipse.html',
  'website/sky-events.html',
  'website/compatibility.html',
  'website/deep-reading.html',
  'website/tonight.html',
  'website/js/ap-natal-reading.js',
];
for (const p of act1) {
  let s = readFileSync(p, 'utf8');
  const next = s.replace(/\?v=861/g, '?v=862').replace(/AP_ASSET_V='861'/g, "AP_ASSET_V='862'");
  if (next === s) console.log('no 861 in', p);
  writeFileSync(p, next);
  console.log('bumped', p);
}

{
  let s = readFileSync('website/js/ap-asset-v.js', 'utf8');
  s = s.replace("g.AP_ASSET_V = '861';", "g.AP_ASSET_V = '862';");
  writeFileSync('website/js/ap-asset-v.js', s);
  console.log('bumped ap-asset-v.js');
}

{
  let s = readFileSync('website/sw.js', 'utf8');
  s = s.replace('const V = "ap-v861";', 'const V = "ap-v862";');
  s = s.replace(
    /\/js\/\(\?:app\|chart-page\|horoscope-page\|cosmos\|orrery\|orrery-loader\|orrery-webgl\|void-orrery-adapter\|ambience\|eclipse-reading\|deep-reading\|ap-natal-reading\|plate-fingerprint\|ap-sky-news\|ap-natal-sphere\|ap-checkout-honest\|ap-gumroad-bridge\|gumroad-unlock\|ap-award-orrery\|ap-home-bootstrap\|hero-instrument\|effects\|ephemeris\|lite-orrery\|lite-shell-boot\|ap-footer-inject\|ap-page-boot\|ap-asset-v\)\\\.js\$/,
    String.raw`/js/(?:app|chart-page|horoscope-page|cosmos|orrery|orrery-loader|orrery-webgl|void-orrery-adapter|ambience|eclipse-reading|deep-reading|ap-natal-reading|plate-fingerprint|ap-sky-news|ap-natal-sphere|ap-checkout-honest|ap-gumroad-bridge|gumroad-unlock|hero-instrument|effects|ephemeris|lite-orrery|ap-footer-inject|ap-page-boot|ap-asset-v)\.js$`
  );
  s = s.replace(
    /\/js\/\(\?:explore-boot\|ap-nav-model\|ap-observatory\|ap-observatory-controls\|ap-eclipse-geometry\|ap-eclipse-live\|ap-eclipse-contact\)\(\?:-v\\d\+\)\?\\\.js\$/,
    String.raw`/js/(?:ap-nav-model|ap-observatory|ap-observatory-controls|ap-eclipse-geometry|ap-eclipse-live|ap-eclipse-contact)(?:-v\d+)?\.js$`
  );
  s = s.replace(
    /\/css\/\(\?:main\|main-lite\|ap-model-window\|ap-observatory-home\|ap-brand-nebula\|ap-sky-news\|ap-natal-sphere\|ap-palette-2026\)\\\.css\$/,
    String.raw`/css/(?:main|main-lite|ap-model-window|ap-brand-nebula|ap-sky-news|ap-natal-sphere|ap-palette-2026)\.css$`
  );
  s = s.replace(
    /\/css\/\(\?:explore-page\|ap-living-sky\|ap-home\|ap-shop\|ap-eclipse\|ap-chart\|ap-daily\)\(\?:-v\\d\+\)\?\\\.css\$/,
    String.raw`/css/(?:ap-living-sky|ap-home|ap-shop|ap-eclipse|ap-chart|ap-daily)(?:-v\d+)?\.css$`
  );
  writeFileSync('website/sw.js', s);
  console.log('bumped sw.js');
}

// tests + proofs
const tests = [
  'test-orrery-adapter.mjs',
  'test-release-honesty.mjs',
  'tools/_proof-massive-build.mjs',
  'tools/_proof-eclipse-wire.mjs',
  'tools/_proof-shop-cowork-wire.mjs',
  'tools/_proof-sky-events.mjs',
];
for (const p of tests) {
  let s = readFileSync(p, 'utf8');
  s = s.replace(/\?v=861/g, '?v=862');
  s = s.replace(/ap-v861/g, 'ap-v862');
  s = s.replace(/v861/g, 'v862');
  writeFileSync(p, s);
  console.log('bumped', p);
}

console.log('version bump done');
