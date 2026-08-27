/** Proof: dedicated Eclipse simulation, contact engine, and archived recovery. */
import { existsSync, readFileSync } from 'node:fs';
import { buildEclipseReading5 } from '../website/js/eclipse-reading.js';
import { buildEclipsePlateModel } from '../website/js/ap-eclipse-edition-v841.js';

const templates = JSON.parse(readFileSync('website/js/reading-templates.json', 'utf8'));
const html = readFileSync('website/eclipse.html', 'utf8');
const live = readFileSync('website/js/ap-eclipse-live-v834.js', 'utf8');
const geometry = readFileSync('website/js/ap-eclipse-geometry-v834.js', 'utf8');
const edition = readFileSync('website/js/ap-eclipse-edition-v841.js', 'utf8');
const contact = readFileSync('website/js/ap-eclipse-contact-v835.js', 'utf8');
const unlock = readFileSync('website/js/gumroad-unlock.js', 'utf8');
const sw = readFileSync('website/sw.js', 'utf8');
const RELEASE = '902';
const fails = [];

if (!new RegExp(`ap-eclipse-live-v834\\.js\\?v=${RELEASE}`).test(html)) fails.push(`dedicated simulation is not pinned to v${RELEASE}`);
if (!new RegExp(`ap-eclipse-contact-v835\\.js\\?v=${RELEASE}`).test(html)) fails.push(`contact controller is not pinned to v${RELEASE}`);
if ((html.match(/class="ap-eclipse-live__canvas"/g) || []).length !== 1 || /<void-orrery\b/.test(html)) {
  fails.push('Eclipse must own one dedicated canvas and no general model');
}
for (const probe of ['data-eclipse-now', 'data-eclipse-event', 'data-eclipse-play',
  'data-eclipse-lens="system"', 'data-eclipse-lens="shadow"', 'data-eclipse-lens="earth"',
  'data-eclipse-share']) if (!html.includes(probe)) fails.push('missing simulation control ' + probe);
if (!/id="eclipseContactForm"/.test(html) || !/aria-describedby="eclipseContactStatus"/.test(html)) {
  fails.push('contact form/status contract missing');
}
if (!/id="eclipseEdition"[^>]+hidden/.test(html)) fails.push('result-gated archive recovery host missing');
if (/(?:Buy now|£7|Checkout is live)/i.test(html)) fails.push('Eclipse HTML still markets the archived checkout');
if (!html.includes('downloads/astroprecise-eclipse-field-guide-2026.pdf')) fails.push('free field guide missing');

for (const file of [
  'website/downloads/astroprecise-eclipse-field-guide-2026.pdf',
  'website/guides/eclipse-field-guide-2026.html',
  'website/img/editorial/eclipse-field-guide-cover-final-v836.png',
  'website/img/editorial/eclipse-edition-art-v841.png',
]) if (!existsSync(file)) fails.push('missing eclipse asset ' + file);

if (!/new THREE\.WebGLRenderer/.test(live) || !/function setDisplayDate/.test(live) ||
    !/const PASSAGE_START_MS/.test(live) || !/function playPassage\(\)/.test(live) ||
    !/function setLens\(key/.test(live) || !/const activePointers = new Map\(\)/.test(live)) {
  fails.push('dedicated simulation lost renderer/time/lens/pointer capability');
}
if (!/Date\.UTC\(2026, 7, 12, 17, 45, 51\)/.test(geometry)) {
  fails.push('geometry maximum is not 17:45:51 UTC');
}
if (!new RegExp(`const V\\s*=\\s*["']ap-v${RELEASE}["']`).test(sw)) fails.push(`SW tip is not ap-v${RELEASE}`);
if (/openCheckout\s*\(/.test(edition)) fails.push('archived edition still calls checkout');
if (!/event edition is closed|past buyer/i.test(edition)) fails.push('archive recovery copy missing');
if (!/verifyLicense/.test(unlock) || !/checkoutEnabled:\s*false/.test(unlock)) {
  fails.push('past-buyer verification or checkout-disable state missing');
}
if (/handleUnlockOnLoad|searchParams\.get\(['"]license|[?&]license=/.test(edition)) {
  fails.push('licence key can arrive through a URL');
}
if (!contact.includes("mountEclipseEdition(byId('eclipseEdition')")) {
  fails.push('contact result does not mount edition recovery');
}

const quiet = buildEclipseReading5(140.133, {
  sun: 100, moon: 102, mercury: 104, venus: 106, mars: 108,
  jupiter: 110, saturn: 112, uranus: 114, neptune: 116, pluto: 118,
}, templates, { quietGateDeg: 5 });
const hot = buildEclipseReading5(140.133, {
  sun: 140.133, moon: 10, mercury: 20, venus: 30, mars: 40,
  jupiter: 50, saturn: 60, uranus: 70, neptune: 80, pluto: 90,
}, templates, { quietGateDeg: 5 });
if (!quiet.gateSale || hot.gateSale || !hot.anchor || !hot.contact) {
  fails.push('contact/quiet deterministic gate changed');
}
const plate = buildEclipsePlateModel({
  reading: hot,
  natal: { sun: 140.133, moon: 10, mercury: 20, venus: 30, mars: 40,
    jupiter: 50, saturn: 60, uranus: 70, neptune: 80, pluto: 90 },
  eclipseLongitude: 140.133,
});
if (!plate || plate.beats.length !== 5) fails.push('past-buyer plate is not the deterministic five-beat artifact');
if (buildEclipsePlateModel({ reading: quiet, natal: { sun: 100 }, eclipseLongitude: 140.133 }) !== null) {
  fails.push('quiet chart can build a plate');
}

if (fails.length) {
  console.error('FAIL', fails);
  process.exit(1);
}
console.log('PASS Eclipse simulation + free guide + contact + archived recovery');
