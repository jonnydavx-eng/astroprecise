/** Lightweight gates/packaging only: synthetic bytes are NOT rendered evidence. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import JSZip from 'jszip';
import {
  assertExactFictionalStudioFixture, canonicalizeStudioOrder, deliverablesForProduct, sha256,
} from './fulfil-shared.mjs';
import {
  NATAL_FIXTURE_ID, assertExactFictionalNatalFixture, assertFictionalFixtureSelection,
  assertNatalFixtureControlSelection, assertNormalizedFictionalNatalFixture,
} from './fictional-natal-fixture.mjs';

const tools = dirname(fileURLToPath(import.meta.url));
const runtime = join(tools, '..');
const evidence = join(runtime, 'output', 'natal-source-checks');
mkdirSync(evidence, { recursive: true });
const baseline = join(tools, 'test-fixtures', 'natal-baseline');
const natal = JSON.parse(readFileSync(join(tools, 'order-template-natal.json'), 'utf8'));
const whole = JSON.parse(readFileSync(join(tools, 'order-template.json'), 'utf8'));
const wholeSource = readFileSync(join(tools, 'fulfil-shared.mjs'));
const qaSource = readFileSync(join(tools, 'fulfil-quality.mjs'), 'utf8');
const testsDir = mkdtempSync(join(evidence, 'packaging-only-tests-'));
writeFileSync(join(testsDir, 'NOT-RENDERED-EVIDENCE.txt'), 'Synthetic placeholder packaging fixtures only. Not usable artwork, not render/visual acceptance, not a customer delivery.\n');
const time = '2026-09-28T00:00:00.000Z';
const normalizedCase = () => ({
  original: structuredClone(natal),
  order: JSON.parse(JSON.stringify({ ...canonicalizeStudioOrder(natal), generatedAt: time })),
  control: { generatedAt: time, fictionalFixture: NATAL_FIXTURE_ID, product: natal.product, mode: 'proof' },
  render: { generatedAt: '2026-09-28T00:01:00.000Z' },
});
const assertNatalCase = (c) => assertNormalizedFictionalNatalFixture(c.original, c.order, c.control, c.render);
const stableValue = (v) => Array.isArray(v) ? v.map(stableValue) : v && typeof v === 'object'
  ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, stableValue(v[k])])) : v;

// The Devin correction changes the wheel and degree display. Compare every other byte,
// including all authority, consent, payment and normalization controls.
function withoutPresentation(source) {
  const degreeStart = source.indexOf('export const sd =');
  const degreeEnd = source.indexOf('export const fmt =', degreeStart);
  assert.ok(degreeStart >= 0 && degreeEnd > degreeStart, 'degree-display boundaries must be present');
  source = source.slice(0, degreeStart) + '<degree-display>' + source.slice(degreeEnd);
  const start = source.indexOf('export function natalWheelSvg({');
  const end = source.indexOf('/** Which artefacts each live SKU should emit. */', start);
  assert.ok(start >= 0 && end > start, 'wheel boundaries must be present');
  return source.slice(0, start) + '<wheel-renderer>' + source.slice(end);
}
const legacyShared = readFileSync(join(baseline, 'fulfil-shared.mjs'), 'utf8');

test('legacy Whole Sky fixture and shared source outside presentation are unchanged', () => {
  assert.equal(sha256(legacyShared), 'b45aa60e606261a2b85953718c654aa316fea7d41cfe9d5ee624bf729b246506');
  assert.equal(withoutPresentation(wholeSource.toString('utf8')), withoutPresentation(legacyShared));
  for (const [file, hash] of [
    ['order-template.json', '61f1ef7aeb029c92914c66189b4f9a83f3208612f1117bdf8b7d50c8fad4086b'],
  ]) {
    const bytes = readFileSync(join(tools, file));
    assert.equal(sha256(bytes), hash);
    assert.deepEqual(bytes, readFileSync(join(baseline, file)));
  }
  assert.equal(assertExactFictionalStudioFixture(whole), true);
  assert.equal(assertExactFictionalStudioFixture({ sampleMode: 'real' }), false);
});

test('exact Natal fixture is separate from Whole Sky and only selects posters', () => {
  assert.equal(assertExactFictionalNatalFixture(natal), true);
  assert.notEqual(natal.orderId, whole.orderId);
  assert.notEqual(sha256(natal.orderId), sha256(whole.orderId));
  assert.deepEqual(deliverablesForProduct(natal.product), { reading: false, poster: true });
  assert.throws(() => assertExactFictionalNatalFixture(whole), /Natal fixture mismatch/);
  assert.throws(() => assertExactFictionalStudioFixture(natal), /fixture mismatch/);
});

for (const [name, mutate] of [
  ['name', o => { o.name = 'Different person'; }],
  ['SKU', o => { o.product = 'whole-sky-edition'; }],
  ['sample mode', o => { o.sampleMode = 'real'; }],
  ['missing sample mode', o => { delete o.sampleMode; }],
  ['added top-level field', o => { o.notes = 'not permitted'; }],
  ['added nested declaration field', o => { o.buyerDeclaration.extra = true; }],
  ['missing nested declaration field', o => { delete o.buyerDeclaration.confirmedAdult; }],
  ['changed nested declaration', o => { o.buyerDeclaration.confirmedAdult = false; }],
  ['payment capability', o => { o.fulfilmentAuthorization = { state: 'paid-in-full' }; }],
  ['precomputed timestamp', o => { o.generatedAt = time; }],
  ['birth coordinate', o => { o.lon = -0.612; }],
  ['type coercion', o => { o.y = '1990'; }],
]) test(`Natal fixture rejects ${name}`, () => {
  const candidate = structuredClone(natal);
  mutate(candidate);
  assert.throws(() => assertExactFictionalNatalFixture(candidate), /Natal fixture mismatch/);
});

test('explicit selection accepts proof only and rejects missing/unknown/mixed modes', () => {
  assert.equal(assertFictionalFixtureSelection({ proof: true }), null);
  assert.equal(assertFictionalFixtureSelection({ proof: true, 'fictional-fixture': NATAL_FIXTURE_ID }), NATAL_FIXTURE_ID);
  for (const args of [
    { 'fictional-fixture': true, proof: true },
    { 'fictional-fixture': 'whole-sky-edition', proof: true },
    { 'fictional-fixture': NATAL_FIXTURE_ID },
    { 'fictional-fixture': NATAL_FIXTURE_ID, proof: 'false' },
    { 'fictional-fixture': NATAL_FIXTURE_ID, proof: true, payment: 'receipt.json' },
    { 'fictional-fixture': NATAL_FIXTURE_ID, proof: true, payment: '' },
    { 'fictional-fixture': NATAL_FIXTURE_ID, proof: true, final: true },
    { 'fictional-fixture': NATAL_FIXTURE_ID, final: true },
  ]) assert.throws(() => assertFictionalFixtureSelection(args));
});

test('QA control requires exact selector, SKU and proof mode', () => {
  const { control } = normalizedCase();
  assertNatalFixtureControlSelection(NATAL_FIXTURE_ID, control);
  assertNatalFixtureControlSelection(null, { mode: 'proof', product: 'whole-sky-edition' });
  assert.throws(() => assertNatalFixtureControlSelection(null, control), /explicit proof selector/);
  for (const mutated of [
    { ...control, fictionalFixture: undefined },
    { ...control, fictionalFixture: 'whole-sky-edition' },
    { ...control, product: 'whole-sky-edition' },
    { ...control, mode: 'final' },
  ]) assert.throws(() => assertNatalFixtureControlSelection(NATAL_FIXTURE_ID, mutated), /order-control binding/);
});

test('normalized Natal accepts exact deterministic canonical form only', () => assertNatalCase(normalizedCase()));
for (const [name, mutate] of [
  ['name', c => { c.order.name = 'Changed'; }],
  ['UTC offset', c => { c.order.utcOffsetMinutes = 0; }],
  ['extra field', c => { c.order.unapproved = true; }],
  ['nested extra field', c => { c.order.buyerDeclaration.extra = true; }],
  ['consent', c => { c.order.earlyStartConsent = true; }],
  ['timestamp control mismatch', c => { c.control.generatedAt = '2026-09-27T00:00:00.000Z'; }],
  ['timestamp after render', c => { c.render.generatedAt = '2026-09-27T00:00:00.000Z'; }],
  ['altered original', c => { c.original.place = 'Changed'; }],
  ['Whole Sky canonical data', c => { c.order = { ...canonicalizeStudioOrder(whole), generatedAt: time }; }],
  ['final authority', c => { c.order.fulfilmentAuthorization = { state: 'paid-in-full' }; }],
]) test(`normalized Natal rejects ${name}`, () => {
  const c = normalizedCase(); mutate(c); assert.throws(() => assertNatalCase(c));
});

// Execute the unchanged Whole Sky block from the updated QA file. Never import
// the CLI or overwrite the prior eight-case evidence under evidence/.
const start = qaSource.indexOf('    // Validate the original approved fixture');
const end = qaSource.indexOf('\n  } else {', start);
assert.ok(start >= 0 && end > start);
const wholeGuard = new Function('privateOrder', 'control', 'render', 'readFileSync', 'join', 'ROOT', 'assertExactFictionalStudioFixture', 'canonicalizeStudioOrder', 'stableValue', qaSource.slice(start, end));
for (const [name, mutate, rejects] of [
  ['exact normalized fixture', () => {}, false],
  ['changed name', c => { c.order.name = 'Different person'; }, true],
  ['changed UTC offset', c => { c.order.utcOffsetMinutes = 0; }, true],
  ['extra field', c => { c.order.unapproved = true; }, true],
  ['changed consent', c => { c.order.earlyStartConsent = true; }, true],
  ['unbound generation time', c => { c.control.generatedAt = '2026-09-27T00:00:00.000Z'; }, true],
  ['future generation time', c => { c.render.generatedAt = '2026-09-27T00:00:00.000Z'; }, true],
  ['altered original fixture', c => { c.fixture.place = 'Different place'; }, true],
]) test(`retained Whole Sky QA: ${name}`, () => {
  const c = { order: { ...canonicalizeStudioOrder(whole), generatedAt: time }, control: { generatedAt: time }, render: { generatedAt: '2026-09-28T00:01:00.000Z' }, fixture: structuredClone(whole) };
  mutate(c);
  const run = () => wholeGuard(c.order, c.control, c.render, () => JSON.stringify(c.fixture), join, runtime, assertExactFictionalStudioFixture, canonicalizeStudioOrder, stableValue);
  if (rejects) assert.throws(run); else run();
});

test('orchestrator rejects selector/payment/final/cross-fixture before generating anything', () => {
  const unbornOutput = join(testsDir, 'MUST-NOT-BE-CREATED');
  const natalInput = join(tools, 'order-template-natal.json');
  const base = ['--in', natalInput, '--out', unbornOutput];
  for (const [args, message] of [
    [[...base, '--proof'], /fixture mismatch/],
    [[...base, '--proof', '--fictional-fixture', 'unknown'], /Unknown explicit/],
    [[...base, '--proof', '--fictional-fixture', NATAL_FIXTURE_ID, '--payment', 'MUST-NOT-BE-READ.json'], /forbids/],
    [[...base, '--proof', '--fictional-fixture', NATAL_FIXTURE_ID, '--final'], /forbids/],
    [[...base, '--fictional-fixture', NATAL_FIXTURE_ID], /requires --proof/],
    [['--in', natalInput, '--proof', '--fictional-fixture', NATAL_FIXTURE_ID], /fresh directory/],
    [['--in', join(tools, 'order-template.json'), '--out', unbornOutput, '--proof', '--fictional-fixture', NATAL_FIXTURE_ID], /Natal fixture mismatch/],
    [['--in', natalInput, '--payment', 'MUST-NOT-BE-READ.json'], /Final fulfilment is disabled/],
    [[...base, '--final'], /--final is disabled/],
  ]) {
    const result = spawnSync(process.execPath, [join(tools, 'fulfil-order.mjs'), ...args], { cwd: runtime, encoding: 'utf8', timeout: 10000 });
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, message);
    assert.equal(existsSync(unbornOutput), false);
  }
  // Completed or partial output is never overwritten by the new path.
  const occupied = join(testsDir, 'occupied-output');
  mkdirSync(occupied); writeFileSync(join(occupied, 'PRESERVE.txt'), 'existing proof evidence');
  const result = spawnSync(process.execPath, [join(tools, 'fulfil-order.mjs'), '--in', natalInput, '--proof', '--fictional-fixture', NATAL_FIXTURE_ID, '--out', occupied], { cwd: runtime, encoding: 'utf8', timeout: 10000 });
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /output already exists/);
  assert.deepEqual(readdirSync(occupied), ['PRESERVE.txt']);
  assert.equal(readFileSync(join(occupied, 'PRESERVE.txt'), 'utf8'), 'existing proof evidence');
});

const natalAssets = ['natal-sky-home-print-a3.pdf', 'natal-sky-home-print-a4.pdf', '01-natal-print-4960x7016.png', '02-natal-square-2160x2160.png', '03-natal-story-2160x3840.png', '04-phone-wallpaper-1080x1920.png', '05-big-three-1080x1080.png'];
test('synthetic packaging produces exact seven assets + four docs + manifest; no internal/other-product files', async () => {
  const dir = join(testsDir, 'natal-packaging-only'); mkdirSync(dir);
  for (const name of [...natalAssets, 'personal-sky-keepsake-screen.pdf', '06-observatory-birth-hour-schematic-4800x3600.png']) {
    writeFileSync(join(dir, name), `SYNTHETIC PACKAGING TEST ONLY; NOT RENDERED ARTWORK: ${name}\n`);
  }
  mkdirSync(join(dir, '_private')); writeFileSync(join(dir, '_private', 'NOT-CUSTOMER.txt'), 'must never be in ZIP');
  const input = join(dir, 'synthetic-order.json'); writeFileSync(input, JSON.stringify(natal));
  const result = spawnSync(process.execPath, [join(tools, 'package-studio-order.mjs'), '--dir', dir, '--in', input, '--product', natal.product, '--mode', 'proof', '--input-hash', sha256(JSON.stringify(natal))], { cwd: runtime, encoding: 'utf8', timeout: 10000 });
  assert.equal(result.status, 0, result.stderr);
  const zip = await JSZip.loadAsync(readFileSync(join(dir, `astroprecise-${natal.product}.zip`)));
  const expected = [...natalAssets, 'README.txt', 'PRINT-GUIDE.txt', 'PERSONAL-USE-LICENCE.txt', 'THIRD-PARTY-CREDITS.txt', 'CUSTOMER-MANIFEST.json'].sort();
  assert.equal(expected.length, 12);
  assert.deepEqual(Object.keys(zip.files).sort(), expected);
  const manifest = JSON.parse(readFileSync(join(dir, 'CUSTOMER-MANIFEST.json'), 'utf8'));
  assert.equal(manifest.files.length, 11);
  assert.equal(manifest.mode, 'proof'); assert.equal(manifest.product, natal.product);
  for (const entry of manifest.files) {
    const bytes = await zip.file(entry.file).async('nodebuffer');
    assert.equal(entry.bytes, bytes.length); assert.equal(entry.sha256, sha256(bytes));
    assert.deepEqual(bytes, readFileSync(join(dir, entry.file)));
  }
  const readme = await zip.file('README.txt').async('string');
  const guide = await zip.file('PRINT-GUIDE.txt').async('string');
  const licence = await zip.file('PERSONAL-USE-LICENCE.txt').async('string');
  assert.match(readme, /PROOF · NOT A CUSTOMER DELIVERY/);
  assert.match(readme, /two home-print PDFs/); assert.match(readme, /Big Three/);
  assert.match(guide, /ink-light A4 plate for more economical printing/);
  assert.match(guide, /Five PNG layouts/);
  const scope = 'The personal-use licence permits private display and self-printing for personal, non-commercial use. It does not include printing by a third-party print service, public redistribution or resale.';
  assert.ok(guide.includes(scope));
  assert.ok(licence.includes(scope));
  assert.match(readme, /whole arcminutes, truncating smaller fractions/);
  assert.doesNotMatch(readme + guide, /reading edition|keepsake|observatory|Whole Sky/i);
  writeFileSync(join(testsDir, 'packaging-inventory.json'), JSON.stringify({ evidenceKind: 'synthetic packaging only; not render acceptance', entries: expected, zipSha256: sha256(readFileSync(join(dir, `astroprecise-${natal.product}.zip`))) }, null, 2) + '\n');
});

test('other SKU README and print-guide constants remain byte-identical', () => {
  const before = readFileSync(join(baseline, 'package-studio-order.mjs'), 'utf8');
  const after = readFileSync(join(tools, 'package-studio-order.mjs'), 'utf8');
  for (const constant of ['README', 'PRINT_GUIDE', 'SELF_LICENCE', 'GIFT_RECIPIENT_ONLY_LICENCE', 'GIFT_AUTHORISED_BUYER_COPY_LICENCE']) {
    const pattern = new RegExp(`const ${constant} = \x60[\\s\\S]*?\x60;`);
    assert.equal(after.match(pattern)?.[0], before.match(pattern)?.[0]);
  }
  assert.equal(withoutPresentation(wholeSource.toString('utf8')), withoutPresentation(legacyShared));
});
