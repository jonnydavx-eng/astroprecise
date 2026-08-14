import { readFileSync, writeFileSync } from 'fs';

{
  let s = readFileSync('test-release-honesty.mjs', 'utf8');
  s = s.replace(
    "const compatibility = read('./website/js/compatibility-page.js');\n",
    "const compatibility = read('./website/compatibility.html');\n"
  );
  s = s.replace(
    "assert.equal(/location\\.hash|new URLSearchParams\\(window\\.location\\.search\\)/.test(compatibility), false,\n  'compatibility must not restore a birth pair from an address');\n",
    "assert.equal(/location\\.hash|new URLSearchParams\\(window\\.location\\.search\\)/.test(compatibility), false,\n  'compatibility page must not restore a birth pair from an address');\n"
  );
  writeFileSync('test-release-honesty.mjs', s);
  console.log('honesty test updated');
}

{
  let s = readFileSync('test-orrery-adapter.mjs', 'utf8');
  s = s.replace(
    `if (modelOwners.length !== 1 || modelOwners[0] !== 'index.html') {
  fail('general orrery owners must be index.html only: ' + modelOwners.join(', '));
}`,
    `const expectedOwners = ['chart.html', 'compatibility.html', 'deep-reading.html', 'index.html', 'shop.html', 'tonight.html'];
const got = [...modelOwners].sort();
if (got.join() !== expectedOwners.join()) {
  fail('live orrery owners drifted: ' + modelOwners.join(', '));
}`
  );
  s = s.replace(
    `for (const probe of [
  "['index.html', 'Observatory']",
  "['chart.html', 'Chart']",
  "['horoscope.html', 'Daily']",
  "['sky-events.html', 'Events'",
  "['shop.html', 'Shop']",
]) {
  if (!navModel.includes(probe)) fail('launch navigation contract missing: ' + probe);
}
for (const probe of ["['sky-events.html', 'Events', 'eclipse']", '(min-width: 981px)', 'renderStaticBottomNav();']) {
  if (!navModel.includes(probe)) fail('five-route mobile navigation missing: ' + probe);
}
if (!livingCss.includes('repeat(5, minmax(0, 1fr))')) fail('mobile navigation is not five equal tabs');
if (!livingCss.includes('touch-action: pan-y !important')) fail('Home phone canvas can still trap vertical scrolling');
if (!sw.includes('const V = "ap-v862"')) fail('service worker release identity is not ap-v862');
ok('shared shell exposes five routes and releases vertical phone scrolling');
if (navModel.includes("['explore.html'")) fail('retired Explore destination remains in navigation');`,
    `for (const probe of [
  "['index.html', 'Observatory']",
  "['chart.html', 'Chart']",
  "['sky-events.html', 'Events'",
  "['shop.html', 'Shop']",
]) {
  if (!navModel.includes(probe)) fail('launch navigation contract missing: ' + probe);
}
if (navModel.includes("['horoscope.html', 'Daily']")) fail('Daily must not be a launch route');
if (navModel.includes("['lifepath.html'")) fail('Life Path must not leak into nav extras');
if (navModel.includes("['synastry.html'")) fail('Synastry must not leak into nav extras');
for (const probe of ["['sky-events.html', 'Events', 'eclipse']", '(min-width: 981px)', 'renderStaticBottomNav();']) {
  if (!navModel.includes(probe)) fail('four-route mobile navigation missing: ' + probe);
}
if (!livingCss.includes('repeat(4, minmax(0, 1fr))')) fail('mobile navigation is not four equal tabs');
if (!livingCss.includes('touch-action: pan-y !important')) fail('Home phone canvas can still trap vertical scrolling');
if (!sw.includes('const V = "ap-v862"')) fail('service worker release identity is not ap-v862');
ok('shared shell exposes four primary routes and releases vertical phone scrolling');
if (navModel.includes("['explore.html'")) fail('retired Explore destination remains in navigation');`
  );
  writeFileSync('test-orrery-adapter.mjs', s);
  console.log('orrery test updated');
}
