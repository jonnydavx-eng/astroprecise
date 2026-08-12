import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildEclipseReading5 } from './website/js/eclipse-reading.js';
import {
  ARTWORK_HEIGHT,
  ARTWORK_WIDTH,
  buildEclipsePlateModel,
} from './website/js/ap-eclipse-edition-v841.js';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const templates = JSON.parse(read('./website/js/reading-templates.json'));
const eclipseLongitude = 140.133;
const quietNatal = {
  sun: 100, moon: 102, mercury: 104, venus: 106, mars: 108,
  jupiter: 110, saturn: 112, uranus: 114, neptune: 116, pluto: 118,
};
const directNatal = {
  sun: eclipseLongitude, moon: 10, mercury: 20, venus: 30, mars: 40,
  jupiter: 50, saturn: 60, uranus: 70, neptune: 80, pluto: 90,
};

const quiet = buildEclipseReading5(eclipseLongitude, quietNatal, templates, { quietGateDeg: 5 });
assert.equal(quiet.gateSale, true, 'quiet chart must gate the paid edition');
assert.equal(buildEclipsePlateModel({ reading: quiet, natal: quietNatal, eclipseLongitude }), null,
  'quiet chart must never create paid artwork');

const direct = buildEclipseReading5(eclipseLongitude, directNatal, templates, { quietGateDeg: 5 });
assert.equal(direct.gateSale, false, 'exact solar conjunction must be a direct contact');
const first = buildEclipsePlateModel({ reading: direct, natal: directNatal, eclipseLongitude });
const repeat = buildEclipsePlateModel({ reading: direct, natal: directNatal, eclipseLongitude });
const changed = buildEclipsePlateModel({
  reading: direct,
  natal: { ...directNatal, venus: 31 },
  eclipseLongitude,
});

assert.equal(first.width, ARTWORK_WIDTH);
assert.equal(first.height, ARTWORK_HEIGHT);
assert.equal(first.width, 2400);
assert.equal(first.height, 3000);
assert.equal(first.beats.length, 5, 'paid edition must contain exactly five authored beats');
assert.deepEqual(first.beats.map(({ title }) => title),
  ['Anchor', 'Contact', 'What it touches', 'Reflection', 'Close']);
assert.ok(first.beats.every(({ text }) => text.length > 20), 'every paid beat must have useful copy');
assert.equal(first.fingerprint, repeat.fingerprint, 'same computed chart must produce the same artwork ID');
assert.notEqual(first.fingerprint, changed.fingerprint, 'changed placements must produce different artwork');
assert.match(first.fingerprint, /^AP26-[0-9A-F]{8}$/);

const serialised = JSON.stringify(first);
for (const privateValue of ['1990-08-12', '12:00', 'Europe/London', 'dateOfBirth', 'birthTime']) {
  assert.equal(serialised.includes(privateValue), false, `artwork model leaked ${privateValue}`);
}

const editionSource = read('./website/js/ap-eclipse-edition-v841.js');
for (const contract of [
  "reading.gateSale || reading.quiet",
  "isCheckoutReady(EDITION_PRODUCT)",
  "canvas.toBlob",
  "link.download",
  "window.open('', '_blank')",
  "print()",
  "No manual review and no birth data leaves this browser",
]) {
  assert.ok(editionSource.includes(contract), `edition runtime missing contract: ${contract}`);
}
assert.equal(/searchParams|getParameterByName|[?&]license=/.test(editionSource), false,
  'edition must not unlock from a query-string licence');

const contactSource = read('./website/js/ap-eclipse-contact-v835.js');
assert.ok(contactSource.includes("import { mountEclipseEdition } from './ap-eclipse-edition-v841.js'"));
assert.ok(contactSource.includes("['Anchor', reading.anchor]") && contactSource.includes("['Contact', reading.contact]"));
assert.ok(contactSource.includes("mountEclipseEdition(byId('eclipseEdition')"));

console.log('PASS quiet-sale gate + deterministic five-beat Eclipse Edition + private artwork contract');
