import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const changed = [];

function edit(rel, fn) {
  const path = join(root, rel);
  if (!existsSync(path)) {
    console.log('MISSING: ' + rel);
    return;
  }
  const before = readFileSync(path, 'utf8');
  const after = fn(before);
  if (after === before) {
    console.log('NO CHANGE: ' + rel);
    return;
  }
  writeFileSync(path, after, 'utf8');
  changed.push(rel);
  console.log('UPDATED: ' + rel);
}

function count(hay, needle) {
  return hay.split(needle).length - 1;
}

// 1. Phone Look query must stay on the 860 lock, not 861.
for (const page of [
  'website/chart.html',
  'website/compatibility.html',
  'website/eclipse.html',
  'website/index.html',
  'website/shop.html',
  'website/tonight.html',
]) {
  edit(page, (t) => t.replace(/ap-phone-pass\.css\?v=861/g, 'ap-phone-pass.css?v=860'));
}

// 2. One-word AstroPrecise on shipping long-tail pages.
const wordmarkPages = [
  'website/accuracy.html',
  'website/charts.html',
  'website/ephemeris.html',
  'website/cosmic-story.html',
  'website/guides.html',
  'website/moonphase.html',
  'website/moment.html',
  'website/saturn-return.html',
  'website/solar-return.html',
  'website/this-weeks-sky.html',
  'website/retrograde.html',
  'website/terms.html',
  'website/refunds.html',
  'website/verify.html',
  'website/transits.html',
  'website/profile.html',
  'website/why.html',
  'website/sky-events.html',
  'website/privacy.html',
  'website/what-is-my-rising-sign.html',
];
for (const page of wordmarkPages) {
  edit(page, (t) => t.replace(/Astro Precise/g, 'AstroPrecise'));
}

// 3. Night #08080b -> void on shipping first-paint / theme-color.
edit('website/manifest.json', (t) => t
  .replace(/"background_color": "#08080b"/, '"background_color": "#020307"')
  .replace(/"theme_color": "#08080b"/, '"theme_color": "#020307"')
  .replace(/Astro Precise/g, 'AstroPrecise')
);

for (const icon of ['website/favicon.svg', 'website/img/favicon.svg']) {
  edit(icon, (t) => t.replace(/fill="#08080b"/g, 'fill="#020307"'));
}

// Page-background / first-paint leftovers in named shipping sheets.
// Text-on-gold #08080b in those sheets becomes void ink so night does not remain.
for (const sheet of [
  'website/css/main.css',
  'website/css/main-lite.css',
  'website/css/lite-critical.css',
  'website/css/ephemeris.css',
  'website/css/transits-page.css',
  'website/css/why-page.css',
  'website/css/horoscope-critical.css',
  'website/css/chart-page-deferred.css',
]) {
  edit(sheet, (t) => t.replace(/#08080b/gi, '#020307'));
}

// 4. Leftover purple/blue tokens -> house lock. No new colours.
function mapPurpleBlue(t) {
  return t
    .replace(/--indigo:\s*#4a3a5c/g, '--indigo:        #020307')
    .replace(/--blue:\s*#6a5a52;(\s*\/\* warmed off slate-blue \*\/)?/g, '--blue:          #A89C84;     /* house mute */')
    .replace(/#6AB0FF/g, '#FF6428')
    .replace(/rgba\(92,\s*74,\s*110,/g, 'rgba(216, 180, 106,')
    .replace(/rgba\(122,\s*100,\s*150,/g, 'rgba(216, 180, 106,')
    .replace(/rgba\(126,\s*107,\s*176,/g, 'rgba(216, 180, 106,');
}

for (const sheet of [
  'website/css/moonphase-page.css',
  'website/css/retrograde-page.css',
  'website/css/transits-page.css',
  'website/guides.html',
  'website/css/main.css',
  'website/css/main-lite.css',
]) {
  edit(sheet, mapPurpleBlue);
}

edit('website/guides.html', (t) => t.replace(/--brass:#A8B0BC/g, '--brass:#D8B46A'));

// 5. Launch proof fail copy still says v858.
for (const proof of [
  'tools/_proof-eclipse-wire.mjs',
  'tools/_proof-shop-cowork-wire.mjs',
]) {
  edit(proof, (t) => t.replace(/SW tip is not exactly v858/g, 'SW tip is not exactly v860'));
}

// 6. Natal city pick must write a real IANA zone, never UTC/GMT.
edit('website/js/ap-natal-reading.js', (t) => {
  const old = `  function pick(city) {
    input.value = city.name + (city.admin ? ', ' + city.admin : '');
    tzEl.value = city.tz || '';
    if (note) note.textContent = city.tz || 'Pick a place for a real zone. UK summer is not GMT.';
    drop.hidden = true;
    drop.innerHTML = '';
  }`;
  const next = `  function pick(city) {
    if (!validTimeZone(city.tz)) {
      tzEl.value = '';
      if (note) note.textContent = 'Pick a place for a real zone. UK summer is not GMT.';
      drop.hidden = true;
      drop.innerHTML = '';
      return;
    }
    input.value = city.name + (city.admin ? ', ' + city.admin : '');
    tzEl.value = city.tz;
    if (note) note.textContent = city.tz;
    drop.hidden = true;
    drop.innerHTML = '';
  }`;
  if (!t.includes(old)) {
    console.log('PICK BLOCK MISSING expected shape');
    return t;
  }
  return t.replace(old, next);
});

console.log('\\nChanged ' + changed.length + ' files');
for (const rel of changed) console.log(' - ' + rel);
