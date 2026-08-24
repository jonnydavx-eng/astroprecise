import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { PDFDocument, rgb } from 'pdf-lib';
import JSZip from 'jszip';
import sharp from 'sharp';
import {
  DURABLE_CONFIRMATION_VERSION, GIFT_CONSENT_HASHES, GIFT_CONSENT_RECORDS, assertDigitalSupplyMayBegin, assertExactFictionalStudioFixture, assertWorkMayStart, canonicalPaymentEvidence, canonicalizeStudioOrder, civilTimeToUtc, cleanDisplayText, giftRecipientBirthInputHash, giftRecipientConfirmationEvidenceHash, isPaidOrder, sha256, verifyPaymentEvidence,
} from './tools/fulfil-shared.mjs';

const base = {
  orderId: 'GUMROAD-TEST-901', product: 'personal-sky-keepsake', email: 'buyer@example.test',
  name: 'Ada & Eve', place: 'London, England',
  y: 1990, mo: 7, d: 15, h: 14, mi: 30,
  lat: 51.5074, lon: -0.1278, tz: 'Europe/London', timeAccuracy: 'exact', house: 'placidus',
};
const exactFictionalFixture = JSON.parse(readFileSync('tools/order-template.json', 'utf8'));
assert.equal(assertExactFictionalStudioFixture(exactFictionalFixture), true, 'the runnable Aurora Vale template must be the sole consent-free fixture');
assert.throws(
  () => assertExactFictionalStudioFixture({ ...exactFictionalFixture, recipientEmail: 'real-recipient@example.com' }),
  /fixture mismatch: recipientEmail/i,
  'shared orchestration/QA fixture validation must reject real recipient PII',
);

function fileRecord(path, file) {
  const bytes = readFileSync(join(path, file));
  return { bytes: bytes.length, sha256: sha256(bytes) };
}

async function refreshTamperedPackage(path, product, changedFile) {
  const renderPath = join(path, 'render-manifest.json');
  const render = JSON.parse(readFileSync(renderPath, 'utf8'));
  const rendered = render.artifacts.find((entry) => entry.file === changedFile);
  if (rendered) Object.assign(rendered, fileRecord(path, changedFile));
  writeFileSync(renderPath, JSON.stringify(render, null, 2) + '\n');

  const rasterPath = join(path, 'raster-manifest.json');
  if (existsSync(rasterPath)) {
    const raster = JSON.parse(readFileSync(rasterPath, 'utf8'));
    const image = raster.artifacts.find((entry) => entry.file === changedFile);
    if (image) Object.assign(image, fileRecord(path, changedFile));
    writeFileSync(rasterPath, JSON.stringify(raster, null, 2) + '\n');
  }

  const customerPath = join(path, 'CUSTOMER-MANIFEST.json');
  const customer = JSON.parse(readFileSync(customerPath, 'utf8'));
  const customerFile = customer.files.find((entry) => entry.file === changedFile);
  if (customerFile) Object.assign(customerFile, fileRecord(path, changedFile));
  writeFileSync(customerPath, JSON.stringify(customer, null, 2) + '\n');

  const zipName = `astroprecise-${product}.zip`;
  const zip = new JSZip();
  for (const entry of [...customer.files.map((item) => item.file), 'CUSTOMER-MANIFEST.json']) {
    zip.file(entry, readFileSync(join(path, entry)));
  }
  writeFileSync(join(path, zipName), await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } }));

  const fulfilmentPath = join(path, 'fulfilment-manifest.json');
  const fulfilment = JSON.parse(readFileSync(fulfilmentPath, 'utf8'));
  for (const file of [changedFile, 'CUSTOMER-MANIFEST.json', zipName]) {
    const entry = fulfilment.artifacts.find((item) => item.file === file);
    if (entry) Object.assign(entry, fileRecord(path, file));
  }
  fulfilment.customerManifestHash = sha256(readFileSync(customerPath));
  writeFileSync(fulfilmentPath, JSON.stringify(fulfilment, null, 2) + '\n');
}

const utc = civilTimeToUtc(base);
assert.deepEqual([utc.y, utc.mo, utc.d, utc.h, utc.mi, utc.offsetMinutes], [1990, 7, 15, 13, 30, 60], 'BST civil time must convert to UTC before calculation');
let dstGapError;
try {
  civilTimeToUtc({ ...base, y: 2026, mo: 3, d: 29, h: 1, mi: 30 });
} catch (error) {
  dstGapError = error;
}
assert.match(dstGapError?.message || '', /does not exist/i, 'spring DST gap must fail closed');
assert.doesNotMatch(dstGapError?.message || '', /2026|01:30|Europe\/London/i, 'general error output must not repeat exact birth date, time or timezone');
assert.throws(() => civilTimeToUtc({ ...base, y: 2026, mo: 10, d: 25, h: 1, mi: 30 }), /ambiguous/i, 'autumn DST fold must fail closed');
assert.throws(() => canonicalizeStudioOrder({ ...base, mo: 99 }), /valid calendar/i);
assert.throws(() => canonicalizeStudioOrder({ ...base, h: 99 }), /valid 24-hour/i);
assert.throws(() => canonicalizeStudioOrder({ ...base, timeAccuracy: 'unknown' }), /require timeAccuracy "exact"/i);
assert.throws(() => canonicalizeStudioOrder({ ...base, house: 'p--><script>x' }), /only the Placidus house system/i);
const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
assert.throws(() => canonicalizeStudioOrder({
  ...base, y: future.getUTCFullYear(), mo: future.getUTCMonth() + 1, d: future.getUTCDate(),
  h: future.getUTCHours(), mi: future.getUTCMinutes(), tz: 'UTC',
}), /future|between/i, 'future birth moments must fail closed');
assert.throws(() => cleanDisplayText('a\u0000b'), /control characters/i);
assert.equal(canonicalizeStudioOrder(base).utc.h, 13);

const timingNow = Date.parse('2026-08-23T12:00:00.000Z');
const timingContract = '2026-08-23T10:00:00.000Z';
const buyerDurableConfirmationHash = sha256('FICTIONAL BUYER DURABLE CONFIRMATION');
const recipientDurableConfirmationHash = sha256('FICTIONAL RECIPIENT DURABLE CONFIRMATION');
const earlyStartRecord = {
  contractAt: timingContract,
  buyerDurableConfirmationSentAt: '2026-08-23T11:05:00.000Z',
  buyerDurableConfirmationVersion: DURABLE_CONFIRMATION_VERSION,
  buyerDurableConfirmationFile: 'buyer-confirmation.eml',
  buyerDurableConfirmationHash,
  earlyStartConsent: true,
  earlyStartConsentRecordedAt: '2026-08-23T11:00:00.000Z',
  earlyStartConsentActor: 'buyer',
  earlyStartNoticeVersion: GIFT_CONSENT_RECORDS.earlyStartNoticeVersion,
  earlyStartNoticeHash: GIFT_CONSENT_HASHES.earlyStartNoticeHash,
};
assert.doesNotThrow(() => assertWorkMayStart(earlyStartRecord, timingNow));
assert.throws(() => assertWorkMayStart({ ...earlyStartRecord, earlyStartConsentRecordedAt: '2026-08-23T09:00:00.000Z' }, timingNow), /pre-date/i);
assert.throws(() => assertWorkMayStart({ ...earlyStartRecord, earlyStartConsentRecordedAt: '2026-08-23T13:00:00.000Z' }, timingNow), /future|follow the recorded early-start choice/i);
assert.throws(() => assertWorkMayStart({ ...earlyStartRecord, earlyStartNoticeHash: '0'.repeat(64) }, timingNow), /wording record/i);
assert.throws(() => assertWorkMayStart({ ...earlyStartRecord, buyerDurableConfirmationHash: null }, timingNow), /durable confirmation/i);
assert.throws(() => assertWorkMayStart({ ...earlyStartRecord, buyerDurableConfirmationSentAt: '2026-08-23T10:59:00.000Z' }, timingNow), /follow the recorded early-start choice/i);
const endedCancellationRecord = { buyerDurableConfirmationVersion: DURABLE_CONFIRMATION_VERSION, buyerDurableConfirmationFile: 'buyer-confirmation.eml', buyerDurableConfirmationHash };
assert.throws(() => assertWorkMayStart({ ...endedCancellationRecord, contractAt: '2026-08-10T12:00:00.000Z', buyerDurableConfirmationSentAt: '2026-08-10T12:01:00.000Z' }, timingNow), /14-day/i);
assert.doesNotThrow(() => assertWorkMayStart({ ...endedCancellationRecord, contractAt: '2026-08-09T12:00:00.000Z', buyerDurableConfirmationSentAt: '2026-08-09T12:01:00.000Z' }, timingNow));
const digitalSupplyRecord = {
  contractAt: timingContract,
  digitalSupplyConsent: true,
  digitalSupplyConsentRecordedAt: '2026-08-23T11:01:00.000Z',
  digitalSupplyConsentActor: 'buyer',
  digitalSupplyNoticeVersion: GIFT_CONSENT_RECORDS.digitalSupplyNoticeVersion,
  digitalSupplyNoticeHash: GIFT_CONSENT_HASHES.digitalSupplyNoticeHash,
};
assert.doesNotThrow(() => assertDigitalSupplyMayBegin(digitalSupplyRecord, timingNow));
assert.throws(() => assertDigitalSupplyMayBegin({ contractAt: timingContract, digitalSupplyConsent: false }, timingNow), /14-day/i);
assert.doesNotThrow(() => assertDigitalSupplyMayBegin({ contractAt: '2026-08-09T12:00:00.000Z', digitalSupplyConsent: false }, timingNow));
assert.throws(() => assertDigitalSupplyMayBegin({ ...digitalSupplyRecord, digitalSupplyNoticeVersion: 'stale' }, timingNow), /wording record/i);

assert.equal(isPaidOrder({ orderId: 'forged' }), false, 'orderId alone must never remove a watermark');
const renderToken = 'b'.repeat(64);
const authorised = {
  orderId: 'x',
  fulfilmentAuthorization: {
    state: 'paid-in-full',
    paymentEvidenceHash: 'a'.repeat(64),
    renderCapabilityHash: sha256(renderToken),
  },
};
assert.equal(isPaidOrder(authorised), false, 'a forged order file alone must never remove a watermark');
assert.equal(isPaidOrder(authorised, { capability: renderToken, privateFulfilment: true }), false, 'capability alone must not bypass the unverified checkout gate');
assert.equal(isPaidOrder(authorised, { capability: renderToken, privateFulfilment: true, checkoutVerified: true }), true, 'a verified adapter plus private capability can satisfy the internal predicate');
const product = { sku: 'personal-sky-keepsake', priceGbp: 29, currency: 'GBP' };
const adapterSecret = 'c'.repeat(64);
const unsignedPayment = {
  provider: 'gumroad', verificationMethod: 'gumroad-authenticated-adapter-v1', adapterReceiptId: 'ADAPTER-RECEIPT-901', status: 'paid-in-full', refunded: false,
  transactionId: 'TX-901', orderId: base.orderId, productSku: base.product, currency: 'GBP', amountMinor: 2900,
  buyerEmail: base.email, verifiedAt: new Date(Date.now() - 60_000).toISOString(), verifiedBy: 'operator-test',
};
const payment = {
  ...unsignedPayment,
  adapterSignature: createHmac('sha256', Buffer.from(adapterSecret, 'hex'))
    .update(JSON.stringify(canonicalPaymentEvidence(unsignedPayment))).digest('hex'),
};
assert.equal(verifyPaymentEvidence(base, payment, product, { adapterSecret }).ok, true);
assert.equal(verifyPaymentEvidence(base, payment, product, { adapterSecret: '' }).ok, false, 'a receipt without the private adapter secret must fail closed');
assert.equal(verifyPaymentEvidence(base, { ...payment, amountMinor: 1 }, product, { adapterSecret }).ok, false);
assert.equal(verifyPaymentEvidence(base, { ...payment, status: 'refunded', refunded: true }, product, { adapterSecret }).ok, false);
assert.equal(verifyPaymentEvidence(base, { ...payment, productSku: 'whole-sky-edition' }, product, { adapterSecret }).ok, false);
assert.equal(verifyPaymentEvidence(base, { ...payment, adapterSignature: '0'.repeat(64) }, product, { adapterSecret }).ok, false);

const dir = mkdtempSync(join(tmpdir(), 'ap-fulfil-v901-'));
try {
  writeFileSync(join(dir, 'buyer-confirmation.eml'), 'FICTIONAL BUYER DURABLE CONFIRMATION');
  writeFileSync(join(dir, 'recipient-confirmation.eml'), 'FICTIONAL RECIPIENT DURABLE CONFIRMATION');
  const orderPath = join(dir, 'order.json');
  const out = join(dir, 'private-output');
  const recipientConfirmedAt = new Date(Date.now() - 90_000).toISOString();
  const recipientPrivacyNoticeVersion = 'fictional-gift-privacy-notice-v1-2026-08-24';
  const recipientPrivacyNoticeHash = sha256('FICTIONAL GIFT PRIVACY NOTICE V1');
  const recipientBirthInputHash = giftRecipientBirthInputHash(base);
  const recipientConfirmationEvidenceHash = giftRecipientConfirmationEvidenceHash({
    orderId: base.orderId,
    product: 'whole-sky-edition',
    recipientEmail: 'recipient@example.test',
    recipientBirthInputHash,
    typedName: base.name,
    recipientConfirmedAt,
    recipientPrivacyNoticeVersion,
    recipientPrivacyNoticeHash,
  });
  const proofOrder = {
    ...base,
    product: 'whole-sky-edition',
    purchaseIntent: 'gift',
    recipientDisplayName: base.name,
    giverDisplayName: 'Rowan Example',
    occasion: 'birthday',
    giftMessage: 'A sky kept for you.',
    recipientEmail: 'recipient@example.test',
    recipientDeclaration: {
      typedName: base.name,
      confirmedAdult: true,
      confirmedPersonalDataEntry: true,
    },
    recipientConfirmedAt,
    recipientProcessingNoticeVersion: GIFT_CONSENT_RECORDS.recipientProcessingNoticeVersion,
    recipientProcessingNoticeHash: GIFT_CONSENT_HASHES.recipientProcessingNoticeHash,
    recipientConfirmationMethod: GIFT_CONSENT_RECORDS.recipientConfirmationMethod,
    recipientPrivacyNoticeVersion,
    recipientPrivacyNoticeHash,
    recipientBirthInputHash,
    recipientConfirmationEvidenceHash,
    buyerAttestation: true,
    buyerAttestationVersion: GIFT_CONSENT_RECORDS.buyerAttestationVersion,
    buyerAttestationHash: GIFT_CONSENT_HASHES.buyerAttestationHash,
    buyerAttestationActor: 'buyer',
    buyerAttestationRecordedAt: new Date(Date.now() - 70_000).toISOString(),
    buyerDurableConfirmationSentAt: new Date(Date.now() - 10_000).toISOString(),
    buyerDurableConfirmationVersion: DURABLE_CONFIRMATION_VERSION,
    buyerDurableConfirmationFile: 'buyer-confirmation.eml',
    buyerDurableConfirmationHash,
    recipientDurableConfirmationSentAt: new Date(Date.now() - 10_000).toISOString(),
    recipientDurableConfirmationVersion: DURABLE_CONFIRMATION_VERSION,
    recipientDurableConfirmationFile: 'recipient-confirmation.eml',
    recipientDurableConfirmationHash,
    deliveryTo: 'recipient',
    recipientDisclosureAuthorized: false,
    recipientDisclosureAuthorizedAt: null,
    recipientDisclosureAuthorizedBy: null,
    recipientDisclosureWithdrawnAt: null,
    recipientDisclosureWithdrawnBy: null,
    recipientDisclosureWordingVersion: GIFT_CONSENT_RECORDS.recipientDisclosureWordingVersion,
    recipientDisclosureWordingHash: GIFT_CONSENT_HASHES.recipientDisclosureWordingHash,
    contractAt: new Date(Date.now() - 120_000).toISOString(),
    earlyStartConsent: true,
    earlyStartConsentRecordedAt: new Date(Date.now() - 60_000).toISOString(),
    earlyStartConsentActor: 'buyer',
    earlyStartNoticeVersion: GIFT_CONSENT_RECORDS.earlyStartNoticeVersion,
    earlyStartNoticeHash: GIFT_CONSENT_HASHES.earlyStartNoticeHash,
    digitalSupplyConsent: true,
    digitalSupplyConsentRecordedAt: new Date(Date.now() - 50_000).toISOString(),
    digitalSupplyConsentActor: 'buyer',
    digitalSupplyNoticeVersion: GIFT_CONSENT_RECORDS.digitalSupplyNoticeVersion,
    digitalSupplyNoticeHash: GIFT_CONSENT_HASHES.digitalSupplyNoticeHash,
  };
  assert.throws(() => canonicalizeStudioOrder({ ...proofOrder, orderId: 'REPLAYED-ORDER' }), /declaration record/i, 'recipient confirmation evidence must not replay across order IDs');
  assert.throws(() => canonicalizeStudioOrder({ ...proofOrder, recipientEmail: 'different@example.test' }), /declaration record/i, 'recipient confirmation evidence must not replay across recipient accounts');
  assert.throws(() => canonicalizeStudioOrder({ ...proofOrder, place: 'York, England' }), /bind|declaration record/i, 'recipient confirmation evidence must bind the accepted birth inputs');
  assert.throws(() => canonicalizeStudioOrder({ ...proofOrder, deliveryTo: 'buyer-with-recipient-authorization' }), /delivery target/i, 'recipient delivery must be invariant even when a buyer copy is authorised');
  writeFileSync(orderPath, JSON.stringify(proofOrder));
  const blocked = spawnSync(process.execPath, ['tools/fulfil-order.mjs', '--in', orderPath], { cwd: process.cwd(), encoding: 'utf8' });
  assert.notEqual(blocked.status, 0);
  assert.match(`${blocked.stdout}${blocked.stderr}`, /Choose --proof or supply --payment/i);
  const leakedFictionalPath = join(dir, 'leaked-fictional-order.json');
  writeFileSync(leakedFictionalPath, JSON.stringify({
    ...proofOrder,
    orderId: 'FICTIONAL-PII-LEAK-901',
    sampleMode: 'fictional',
    email: 'buyer@example.test',
    name: 'Aurora Vale',
    place: 'Whitby, England',
    y: 1990, mo: 6, d: 14, h: 3, mi: 42,
    lat: 54.486, lon: -0.613, tz: 'Europe/London', timeAccuracy: 'exact', house: 'placidus',
    recipientDisplayName: 'Aurora Vale',
    giverDisplayName: 'Someone who loves you',
    giftMessage: 'May this new orbit bring you wonder, courage and a sky full of possibility.',
    recipientEmail: 'real-recipient@example.com',
    recipientDeclaration: { typedName: 'Aurora Vale', confirmedAdult: true, confirmedPersonalDataEntry: true },
  }));
  const leakedFictional = spawnSync(process.execPath, ['tools/fulfil-order.mjs', '--in', leakedFictionalPath, '--proof', '--out', join(dir, 'leaked-fictional-output')], { cwd: process.cwd(), encoding: 'utf8' });
  assert.notEqual(leakedFictional.status, 0);
  assert.match(`${leakedFictional.stdout}${leakedFictional.stderr}`, /fictional proof fixture mismatch: recipientEmail/i, 'fictional proof mode must reject non-fixture recipient PII');
  const privateProofPath = join(dir, 'private-proof-order.json');
  writeFileSync(privateProofPath, JSON.stringify({
    ...base,
    orderId: 'PRIVATE-PROOF-901',
    purchaseIntent: 'self',
    contractAt: timingContract,
    buyerDurableConfirmationSentAt: '2026-08-23T11:05:00.000Z',
    buyerDurableConfirmationVersion: DURABLE_CONFIRMATION_VERSION,
    buyerDurableConfirmationFile: 'buyer-confirmation.eml',
    buyerDurableConfirmationHash,
    earlyStartConsent: true,
    earlyStartConsentRecordedAt: '2026-08-23T11:00:00.000Z',
    earlyStartConsentActor: 'buyer',
    earlyStartNoticeVersion: GIFT_CONSENT_RECORDS.earlyStartNoticeVersion,
    earlyStartNoticeHash: GIFT_CONSENT_HASHES.earlyStartNoticeHash,
    digitalSupplyConsent: false,
  }));
  const repoDefaultProof = spawnSync(process.execPath, ['tools/fulfil-order.mjs', '--in', privateProofPath, '--proof'], { cwd: process.cwd(), encoding: 'utf8' });
  assert.notEqual(repoDefaultProof.status, 0);
  assert.match(`${repoDefaultProof.stdout}${repoDefaultProof.stderr}`, /explicit access-restricted --out directory outside the repository/i, 'non-fictional proofs must never default to repository storage');
  const falseDigestPath = join(dir, 'false-digest-order.json');
  writeFileSync(falseDigestPath, JSON.stringify({ ...JSON.parse(readFileSync(privateProofPath, 'utf8')), buyerDurableConfirmationHash: '0'.repeat(64) }));
  const falseDigest = spawnSync(process.execPath, ['tools/fulfil-order.mjs', '--in', falseDigestPath, '--proof', '--out', join(dir, 'false-digest-output')], { cwd: process.cwd(), encoding: 'utf8' });
  assert.notEqual(falseDigest.status, 0);
  assert.match(`${falseDigest.stdout}${falseDigest.stderr}`, /file hash does not match/i, 'an arbitrary 64-hex durable-confirmation digest must not pass without the matching immutable file');
  const bypass = spawnSync(process.execPath, ['tools/fulfil-order.mjs', '--in', orderPath, '--final'], { cwd: process.cwd(), encoding: 'utf8' });
  assert.notEqual(bypass.status, 0);
  assert.match(`${bypass.stdout}${bypass.stderr}`, /--final is disabled/i);

  const forgedPath = join(dir, 'forged-order.json');
  const forgedOut = join(dir, 'forged-direct-output');
  writeFileSync(forgedPath, JSON.stringify({ ...base, fulfilmentAuthorization: authorised.fulfilmentAuthorization }));
  const forgedDirect = spawnSync(process.execPath, ['tools/generate-reading.mjs', '--in', forgedPath, '--out', forgedOut], {
    cwd: process.cwd(), encoding: 'utf8', env: { ...process.env, AP_PRIVATE_FULFILMENT: '', AP_FULFILMENT_CAPABILITY: '' },
  });
  assert.equal(forgedDirect.status, 0, `${forgedDirect.stdout}\n${forgedDirect.stderr}`);
  assert.match(forgedDirect.stdout, /watermark: DRAFT/i, 'direct forged authorisation must remain watermarked');
  const forgedHtml = readFileSync(join(forgedOut, readdirSync(forgedOut).find((name) => name.startsWith('reading-') && name.endsWith('.html'))), 'utf8');
  assert.match(forgedHtml, />DRAFT</, 'direct forged authorisation must retain the visible watermark');
  const selfIssuedOut = join(dir, 'self-issued-output');
  const selfIssued = spawnSync(process.execPath, ['tools/generate-reading.mjs', '--in', forgedPath, '--out', selfIssuedOut], {
    cwd: process.cwd(), encoding: 'utf8', env: { ...process.env, AP_PRIVATE_FULFILMENT: '1', AP_FULFILMENT_CAPABILITY: renderToken },
  });
  assert.equal(selfIssued.status, 0, `${selfIssued.stdout}\n${selfIssued.stderr}`);
  assert.match(selfIssued.stdout, /watermark: DRAFT/i, 'self-issued local capability must remain watermarked while checkout is unverified');
  const verifiedGeneratorOut = join(dir, 'verified-generator-output');
  const verifiedGenerator = spawnSync(process.execPath, ['tools/generate-reading.mjs', '--in', forgedPath, '--out', verifiedGeneratorOut], {
    cwd: process.cwd(), encoding: 'utf8',
    env: { ...process.env, AP_PRIVATE_FULFILMENT: '1', AP_FULFILMENT_CAPABILITY: renderToken, AP_CHECKOUT_VERIFIED: '1' },
  });
  assert.equal(verifiedGenerator.status, 0, `${verifiedGenerator.stdout}\n${verifiedGenerator.stderr}`);
  assert.match(verifiedGenerator.stdout, /watermark: \(none — FINAL \/ paid\)/i, 'the authenticated future generator route must remain live');
  const verifiedGeneratorHtml = readFileSync(join(verifiedGeneratorOut, readdirSync(verifiedGeneratorOut).find((name) => name.startsWith('reading-') && name.endsWith('.html'))), 'utf8');
  assert.doesNotMatch(verifiedGeneratorHtml, /class="watermark">(?:DRAFT|FICTIONAL SAMPLE)</i, 'verified future generator output must remove proof markers');

  const proof = spawnSync(process.execPath, ['tools/fulfil-order.mjs', '--in', orderPath, '--proof', '--out', out], {
    cwd: process.cwd(), encoding: 'utf8', timeout: 120_000,
  });
  assert.equal(proof.status, 0, `${proof.stdout}\n${proof.stderr}`);
  assert.match(proof.stdout, /QUALITY PASS/);
  assert.doesNotMatch(`${proof.stdout}${proof.stderr}`, /\bJD\s+\d|2448088|1990-07-15|14:30|Europe\/London/i, 'orchestrator logs must not disclose raw or reversible birth-time data');
  for (const file of ['personal-sky-keepsake-screen.pdf', 'personal-sky-keepsake-print.pdf', 'natal-sky-home-print-a3.pdf', 'natal-sky-home-print-a4.pdf', '01-natal-print-4960x7016.png', '06-observatory-birth-hour-schematic-4800x3600.png', 'birthday-gift-jacket-a4.pdf', 'birthday-reveal-1080x1920.png', 'birthday-moon-plate-2160x2160.png', 'CUSTOMER-MANIFEST.json', 'astroprecise-whole-sky-edition.zip']) {
    assert.ok(existsSync(join(out, file)), `missing proof artifact ${file}`);
  }
  const html = readFileSync(join(out, readdirSync(out).find((name) => name.startsWith('reading-') && name.endsWith('.html'))), 'utf8');
  assert.ok(html.includes('Ada &amp; Eve'), 'buyer display field must be HTML-escaped');
  assert.doesNotMatch(html, /money, values|health routines/i, 'paid narrative must use the bounded house-language set');
  const control = JSON.parse(readFileSync(join(out, '_private', 'order-control.json'), 'utf8'));
  const canonical = JSON.parse(readFileSync(join(out, '_private', 'canonical-order.json'), 'utf8'));
  assert.equal(canonical.purchaseIntent, 'gift');
  assert.equal(canonical.recipientEmail, 'recipient@example.test');
  assert.equal(canonical.recipientPrivacyNoticeHash, recipientPrivacyNoticeHash, 'canonical gift order must bind the immutable recipient privacy notice');
  assert.equal(canonical.deliveryTo, 'recipient');
  assert.equal(canonical.recipientDisclosureAuthorized, false);
  assert.equal(canonical.recipientDisclosureState, 'not-authorized');
  assert.equal(canonical.recipientDisclosureActive, false);
  assert.equal(canonical.giftMessage, 'A sky kept for you.');
  assert.equal(canonical.contractAt, proofOrder.contractAt, 'private canonical order must retain the contract timestamp');
  assert.equal(canonical.earlyStartConsentRecordedAt, proofOrder.earlyStartConsentRecordedAt, 'private canonical order must retain durable early-start timing');
  assert.deepEqual(control.workStart, {
    contractAt: proofOrder.contractAt,
    buyerDurableConfirmationSentAt: proofOrder.buyerDurableConfirmationSentAt,
    buyerDurableConfirmationVersion: DURABLE_CONFIRMATION_VERSION,
    buyerDurableConfirmationFile: 'buyer-confirmation.eml',
    buyerDurableConfirmationHash,
    recipientDurableConfirmationSentAt: proofOrder.recipientDurableConfirmationSentAt,
    recipientDurableConfirmationVersion: DURABLE_CONFIRMATION_VERSION,
    recipientDurableConfirmationFile: 'recipient-confirmation.eml',
    recipientDurableConfirmationHash,
    earlyStartConsent: true,
    earlyStartConsentRecordedAt: proofOrder.earlyStartConsentRecordedAt,
    earlyStartConsentActor: 'buyer',
    earlyStartNoticeVersion: GIFT_CONSENT_RECORDS.earlyStartNoticeVersion,
    earlyStartNoticeHash: GIFT_CONSENT_HASHES.earlyStartNoticeHash,
  }, 'control record must bind the authorised work-start state');
  assert.match(readFileSync(join(out, 'PERSONAL-USE-LICENCE.txt'), 'utf8'), /buyer is not authorised to receive/i, 'recipient-only gift package must not license a buyer copy');
  const authorisedAt = new Date(Date.now() - 40_000).toISOString();
  const withdrawnAt = new Date(Date.now() - 30_000).toISOString();
  const activeDisclosureOrder = canonicalizeStudioOrder({
    ...proofOrder,
    recipientDisclosureAuthorized: true,
    recipientDisclosureAuthorizedAt: authorisedAt,
    recipientDisclosureAuthorizedBy: 'recipient',
  });
  assert.equal(activeDisclosureOrder.deliveryTo, 'recipient');
  assert.equal(activeDisclosureOrder.recipientDisclosureState, 'authorized');
  assert.equal(activeDisclosureOrder.recipientDisclosureActive, true);
  const withdrawn = canonicalizeStudioOrder({
    ...proofOrder,
    recipientDisclosureAuthorized: true,
    recipientDisclosureAuthorizedAt: authorisedAt,
    recipientDisclosureAuthorizedBy: 'recipient',
    recipientDisclosureWithdrawnAt: withdrawnAt,
    recipientDisclosureWithdrawnBy: 'recipient',
  });
  assert.equal(withdrawn.recipientDisclosureState, 'withdrawn');
  assert.equal(withdrawn.recipientDisclosureActive, false, 'withdrawal must block every later buyer copy or replacement');
  const orchestratorSource = readFileSync('tools/fulfil-order.mjs', 'utf8');
  assert.match(orchestratorSource, /AP_STUDIO_PRIVATE_ORDERS_ROOT/);
  assert.doesNotMatch(orchestratorSource, /join\(ROOT,\s*['"]output['"],\s*['"]orders['"]/, 'future live final storage must not fall back inside the repository');
  assert.match(control.provenanceRef, /^AP-[A-F0-9]{16}$/);
  assert.match(html, new RegExp(`AP REF ${control.provenanceRef}`));
  assert.equal(/reading-ada|ada-&-eve|1990-07-15/i.test(readdirSync(out).join('\n')), false, 'PII must not enter filenames');
  const manifest = JSON.parse(readFileSync(join(out, 'fulfilment-manifest.json'), 'utf8'));
  assert.equal(manifest.mode, 'proof');
  assert.equal(manifest.product, 'whole-sky-edition');
  const customerManifestText = readFileSync(join(out, 'CUSTOMER-MANIFEST.json'), 'utf8');
  for (const privateGiftValue of [proofOrder.recipientEmail, proofOrder.giverDisplayName, proofOrder.giftMessage]) {
    assert.equal(customerManifestText.includes(privateGiftValue), false, `customer manifest leaked ${privateGiftValue}`);
  }

  const canonicalPath = join(out, '_private', 'canonical-order.json');
  const controlPath = join(out, '_private', 'order-control.json');
  const manifestPath = join(out, 'fulfilment-manifest.json');
  const originalCanonical = readFileSync(canonicalPath, 'utf8');
  const originalControl = readFileSync(controlPath, 'utf8');
  const originalManifest = readFileSync(manifestPath, 'utf8');
  const reboundInput = { ...JSON.parse(originalCanonical), mi: JSON.parse(originalCanonical).mi + 1 };
  reboundInput.recipientBirthInputHash = giftRecipientBirthInputHash(reboundInput);
  reboundInput.recipientConfirmationEvidenceHash = giftRecipientConfirmationEvidenceHash({
    ...reboundInput,
    typedName: reboundInput.recipientDeclaration.typedName,
  });
  const rebound = canonicalizeStudioOrder(reboundInput);
  const reboundHash = sha256(JSON.stringify(rebound));
  writeFileSync(canonicalPath, JSON.stringify(rebound, null, 2) + '\n');
  writeFileSync(controlPath, JSON.stringify({ ...JSON.parse(originalControl), inputHash: reboundHash }, null, 2) + '\n');
  writeFileSync(manifestPath, JSON.stringify({ ...JSON.parse(originalManifest), inputHash: reboundHash }, null, 2) + '\n');
  const reboundAudit = spawnSync(process.execPath, ['tools/fulfil-quality.mjs', '--dir', out, '--product', 'whole-sky-edition', '--proof'], {
    cwd: process.cwd(), encoding: 'utf8', timeout: 120_000,
  });
  assert.notEqual(reboundAudit.status, 0, 'retargeted canonical birth data must not pass against old customer bytes');
  assert.match(`${reboundAudit.stdout}${reboundAudit.stderr}`, /provenance|binding|input hash|paid-meta/i);
  writeFileSync(canonicalPath, originalCanonical);
  writeFileSync(controlPath, originalControl);
  writeFileSync(manifestPath, originalManifest);

  const coveredOut = join(dir, 'covered-pdf-output');
  cpSync(out, coveredOut, { recursive: true });
  const coveredPdfName = 'personal-sky-keepsake-screen.pdf';
  const coveredPdfPath = join(coveredOut, coveredPdfName);
  const coveredPdf = await PDFDocument.load(readFileSync(coveredPdfPath));
  for (const page of coveredPdf.getPages()) {
    page.drawRectangle({ x: 0, y: 0, width: page.getWidth(), height: page.getHeight(), color: rgb(1, 1, 1), opacity: 1 });
  }
  writeFileSync(coveredPdfPath, await coveredPdf.save({ useObjectStreams: false }));
  await refreshTamperedPackage(coveredOut, 'whole-sky-edition', coveredPdfName);
  const coveredAudit = spawnSync(process.execPath, ['tools/fulfil-quality.mjs', '--dir', coveredOut, '--product', 'whole-sky-edition', '--proof'], {
    cwd: process.cwd(), encoding: 'utf8', timeout: 120_000,
  });
  assert.notEqual(coveredAudit.status, 0, 'opaque PDF overlays must not pass on hidden extractable text');
  assert.match(`${coveredAudit.stdout}${coveredAudit.stderr}`, /visually flat|visually.*covered/i);

  const blackedOut = join(dir, 'blacked-png-output');
  cpSync(out, blackedOut, { recursive: true });
  const blackPngName = '02-natal-square-2160x2160.png';
  const blackPngPath = join(blackedOut, blackPngName);
  const blackWidth = 2160;
  const blackHeight = 2160;
  const retainedBand = Math.ceil(blackHeight * 0.08);
  const retained = await sharp(blackPngPath)
    .extract({ left: 0, top: blackHeight - retainedBand, width: blackWidth, height: retainedBand })
    .png().toBuffer();
  await sharp({ create: { width: blackWidth, height: blackHeight, channels: 3, background: '#000000' } })
    .composite([{ input: retained, left: 0, top: blackHeight - retainedBand }])
    .png().toFile(`${blackPngPath}.tampered.png`);
  writeFileSync(blackPngPath, readFileSync(`${blackPngPath}.tampered.png`));
  rmSync(`${blackPngPath}.tampered.png`);
  await refreshTamperedPackage(blackedOut, 'whole-sky-edition', blackPngName);
  const blackAudit = spawnSync(process.execPath, ['tools/fulfil-quality.mjs', '--dir', blackedOut, '--product', 'whole-sky-edition', '--proof'], {
    cwd: process.cwd(), encoding: 'utf8', timeout: 120_000,
  });
  assert.notEqual(blackAudit.status, 0, 'a black PNG with intact footer/provenance bands must not pass');
  assert.match(`${blackAudit.stdout}${blackAudit.stderr}`, /perceptual artwork|lacks.*content|mean luma|non-black/i);

  const finalOrderPath = join(dir, 'final-order.json');
  const paymentPath = join(dir, 'verified-payment.json');
  writeFileSync(finalOrderPath, JSON.stringify({
    ...base,
    contractAt: new Date(Date.now() - 120_000).toISOString(),
    earlyStartConsent: true,
    earlyStartConsentRecordedAt: new Date(Date.now() - 60_000).toISOString(),
  }));
  writeFileSync(paymentPath, JSON.stringify(payment));
  const customFinal = spawnSync(process.execPath, ['tools/fulfil-order.mjs', '--in', finalOrderPath, '--payment', paymentPath, '--out', join(dir, 'forbidden-final')], {
    cwd: process.cwd(), encoding: 'utf8', timeout: 30_000,
  });
  assert.notEqual(customFinal.status, 0);
  assert.match(`${customFinal.stdout}${customFinal.stderr}`, /--out is not allowed/i);
  const finalRun = spawnSync(process.execPath, ['tools/fulfil-order.mjs', '--in', finalOrderPath, '--payment', paymentPath], {
    cwd: process.cwd(), encoding: 'utf8', timeout: 30_000,
  });
  assert.notEqual(finalRun.status, 0);
  assert.match(`${finalRun.stdout}${finalRun.stderr}`, /Final fulfilment is disabled until the signed-in checkout and payment adapter are verified/i);
} finally {
  rmSync(dir, { recursive: true, force: true });
}

console.log('PASS Studio fulfilment: UTC, payment gating, rendered PDFs, escaping, packaging and private filenames');
