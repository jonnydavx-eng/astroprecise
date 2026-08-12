/**
 * Proof: dedicated 2026 eclipse instrument, contact engine and launch honesty.
 */
import { existsSync, readFileSync } from 'node:fs';
import { buildEclipseReading5 } from '../website/js/eclipse-reading.js';
import { buildEclipsePlateModel } from '../website/js/ap-eclipse-edition-v841.js';

const templates = JSON.parse(readFileSync('website/js/reading-templates.json', 'utf8'));
const eclipseHtml = readFileSync('website/eclipse.html', 'utf8');
const eclipseCss = readFileSync('website/css/ap-eclipse-v835.css', 'utf8');
const liveJs = readFileSync('website/js/ap-eclipse-live-v834.js', 'utf8');
const geometryJs = readFileSync('website/js/ap-eclipse-geometry-v834.js', 'utf8');
const editionJs = readFileSync('website/js/ap-eclipse-edition-v841.js', 'utf8');
const contactJs = readFileSync('website/js/ap-eclipse-contact-v835.js', 'utf8');
const sw = readFileSync('website/sw.js', 'utf8');

const fails = [];
if (!/ap-eclipse-live-v834\.js\?v=842/.test(eclipseHtml)) fails.push('eclipse missing dedicated 3D module');
if (!/class="ap-eclipse-live__canvas"/.test(eclipseHtml)) fails.push('eclipse missing dedicated canvas');
if (!/data-eclipse-now/.test(eclipseHtml) || !/data-eclipse-event/.test(eclipseHtml)) {
  fails.push('eclipse missing live/greatest controls');
}
for (const probe of ['data-eclipse-play', 'data-eclipse-lens="system"', 'data-eclipse-lens="shadow"',
  'data-eclipse-lens="earth"', 'data-eclipse-share']) {
  if (!eclipseHtml.includes(probe)) fails.push('eclipse missing enhanced 3D control: ' + probe);
}
if (!/ap-eclipse-contact-v835\.js\?v=842/.test(eclipseHtml)) fails.push('eclipse missing contact controller');
if (!/id="eclipseContactForm"/.test(eclipseHtml)) fails.push('eclipse missing chart-contact form');
if (!/id="eclipseEdition"[^>]+hidden/.test(eclipseHtml)) fails.push('eclipse missing gated paid-edition host');
if (!eclipseHtml.includes('eclipse-geometry.svg')) fails.push('eclipse missing authored geometry plate');
if (!/Watch the shadow arrive/i.test(eclipseHtml)) fails.push('eclipse missing launch brand line');
if (/(?:gumroad|ap-checkout-honest)/i.test(eclipseHtml)) fails.push('eclipse contains a dead checkout path');
if (!/var\(--ap-brass\)/.test(eclipseCss)) fails.push('eclipse does not consume the shared launch brass token');
if (!/new THREE\.WebGLRenderer/.test(liveJs)) fails.push('eclipse live module missing WebGL renderer');
if (!/function setDisplayDate/.test(liveJs)) fails.push('eclipse live module missing time-travel state');
for (const probe of ['const PASSAGE_START_MS', 'function playPassage()', 'function setLens(key',
  'const activePointers = new Map()', "url.searchParams.set('moment'"]) {
  if (!liveJs.includes(probe)) fails.push('eclipse live module missing feature: ' + probe);
}
if (!eclipseHtml.includes('downloads/astroprecise-eclipse-field-guide-2026.pdf')) {
  fails.push('eclipse missing field-guide download');
}
for (const file of [
  'website/downloads/astroprecise-eclipse-field-guide-2026.pdf',
  'website/guides/eclipse-field-guide-2026.html',
  'website/img/editorial/eclipse-field-guide-cover-final-v836.png',
  'website/img/editorial/eclipse-edition-art-v841.png',
  'website/js/ap-eclipse-edition-v841.js',
]) {
  if (!existsSync(file)) fails.push('eclipse guide asset missing: ' + file);
}
if (!/Date\.UTC\(2026, 7, 12, 17, 45, 51\)/.test(geometryJs)) {
  fails.push('eclipse geometry maximum is not 17:45:51 UTC');
}
if (!/const V\s*=\s*["']ap-v845["']/.test(sw)) fails.push('SW tip is not exactly v845');

// Quiet chart: bodies clustered away from aspect angles to 140.133°.
const quiet = buildEclipseReading5(140.133, {
  sun: 100, moon: 102, mercury: 104, venus: 106, mars: 108,
  jupiter: 110, saturn: 112, uranus: 114, neptune: 116, pluto: 118,
}, templates, { quietGateDeg: 5 });
if (!quiet.gateSale) fails.push('expected quiet gate on a no-contact chart');

// Hot chart: Sun on the eclipse degree.
const hot = buildEclipseReading5(140.133, {
  sun: 140.133, moon: 10, mercury: 20, venus: 30, mars: 40,
  jupiter: 50, saturn: 60, uranus: 70, neptune: 80, pluto: 90,
}, templates, { quietGateDeg: 5 });
if (hot.gateSale) fails.push('expected contact reading on Sun conjunction');
if (!hot.anchor || !hot.contact) fails.push('contact reading missing authored beats');
const paidModel = buildEclipsePlateModel({
  reading: hot,
  natal: {
    sun: 140.133, moon: 10, mercury: 20, venus: 30, mars: 40,
    jupiter: 50, saturn: 60, uranus: 70, neptune: 80, pluto: 90,
  },
  eclipseLongitude: 140.133,
});
if (!paidModel || paidModel.beats.length !== 5) fails.push('direct contact does not build a five-beat paid edition');
if (buildEclipsePlateModel({
  reading: quiet,
  natal: { sun: 100 },
  eclipseLongitude: 140.133,
}) !== null) fails.push('quiet chart can still build a paid edition');
for (const probe of ['canvas.toBlob', 'link.download', "window.open('', '_blank')", 'isCheckoutReady(EDITION_PRODUCT)']) {
  if (!editionJs.includes(probe)) fails.push('paid edition runtime missing: ' + probe);
}
if (!contactJs.includes("mountEclipseEdition(byId('eclipseEdition')")) fails.push('contact result does not mount paid edition');
if (/handleUnlockOnLoad|searchParams\.get\(['"]license|[?&]license=/.test(editionJs)) {
  fails.push('paid edition accepts a licence key from the URL');
}

if (fails.length) {
  console.error('FAIL', fails);
  process.exit(1);
}
console.log('PASS eclipse 3D replay + guide + quiet-sale gate + five-beat private paid edition');
