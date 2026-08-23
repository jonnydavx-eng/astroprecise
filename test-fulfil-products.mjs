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
  assertWorkMayStart, canonicalPaymentEvidence, canonicalizeStudioOrder, civilTimeToUtc, cleanDisplayText, isPaidOrder, sha256, verifyPaymentEvidence,
} from './tools/fulfil-shared.mjs';

const base = {
  orderId: 'GUMROAD-TEST-901', product: 'personal-sky-keepsake', email: 'buyer@example.test',
  name: 'Ada & Eve', place: 'London, England',
  y: 1990, mo: 7, d: 15, h: 14, mi: 30,
  lat: 51.5074, lon: -0.1278, tz: 'Europe/London', timeAccuracy: 'exact', house: 'placidus',
};

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
assert.throws(() => civilTimeToUtc({ ...base, y: 2026, mo: 3, d: 29, h: 1, mi: 30 }), /does not exist/i, 'spring DST gap must fail closed');
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
assert.doesNotThrow(() => assertWorkMayStart({ contractAt: timingContract, earlyStartConsent: true, earlyStartConsentRecordedAt: '2026-08-23T11:00:00.000Z' }, timingNow));
assert.throws(() => assertWorkMayStart({ contractAt: timingContract, earlyStartConsent: true, earlyStartConsentRecordedAt: '2026-08-23T09:00:00.000Z' }, timingNow), /pre-date/i);
assert.throws(() => assertWorkMayStart({ contractAt: timingContract, earlyStartConsent: true, earlyStartConsentRecordedAt: '2026-08-23T13:00:00.000Z' }, timingNow), /future/i);
assert.throws(() => assertWorkMayStart({ contractAt: '2026-08-10T12:00:00.000Z' }, timingNow), /14-day/i);
assert.doesNotThrow(() => assertWorkMayStart({ contractAt: '2026-08-09T12:00:00.000Z' }, timingNow));

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
  const orderPath = join(dir, 'order.json');
  const out = join(dir, 'private-output');
  const proofOrder = {
    ...base,
    product: 'whole-sky-edition',
    contractAt: new Date(Date.now() - 120_000).toISOString(),
    earlyStartConsent: true,
    earlyStartConsentRecordedAt: new Date(Date.now() - 60_000).toISOString(),
  };
  writeFileSync(orderPath, JSON.stringify(proofOrder));
  const blocked = spawnSync(process.execPath, ['tools/fulfil-order.mjs', '--in', orderPath], { cwd: process.cwd(), encoding: 'utf8' });
  assert.notEqual(blocked.status, 0);
  assert.match(`${blocked.stdout}${blocked.stderr}`, /Choose --proof or supply --payment/i);
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
  for (const file of ['personal-sky-keepsake-screen.pdf', 'personal-sky-keepsake-print.pdf', 'natal-sky-home-print-a3.pdf', 'natal-sky-home-print-a4.pdf', '01-natal-print-4960x7016.png', '06-observatory-birth-hour-schematic-4800x3600.png', 'CUSTOMER-MANIFEST.json', 'astroprecise-whole-sky-edition.zip']) {
    assert.ok(existsSync(join(out, file)), `missing proof artifact ${file}`);
  }
  const html = readFileSync(join(out, readdirSync(out).find((name) => name.startsWith('reading-') && name.endsWith('.html'))), 'utf8');
  assert.ok(html.includes('Ada &amp; Eve'), 'buyer display field must be HTML-escaped');
  assert.doesNotMatch(html, /money, values|health routines/i, 'paid narrative must use the bounded house-language set');
  const control = JSON.parse(readFileSync(join(out, '_private', 'order-control.json'), 'utf8'));
  const canonical = JSON.parse(readFileSync(join(out, '_private', 'canonical-order.json'), 'utf8'));
  assert.equal(canonical.contractAt, proofOrder.contractAt, 'private canonical order must retain the contract timestamp');
  assert.equal(canonical.earlyStartConsentRecordedAt, proofOrder.earlyStartConsentRecordedAt, 'private canonical order must retain durable early-start timing');
  assert.deepEqual(control.workStart, {
    contractAt: proofOrder.contractAt,
    earlyStartConsent: true,
    earlyStartConsentRecordedAt: proofOrder.earlyStartConsentRecordedAt,
  }, 'control record must bind the authorised work-start state');
  assert.match(control.provenanceRef, /^AP-[A-F0-9]{16}$/);
  assert.match(html, new RegExp(`AP REF ${control.provenanceRef}`));
  assert.equal(/reading-ada|ada-&-eve|1990-07-15/i.test(readdirSync(out).join('\n')), false, 'PII must not enter filenames');
  const manifest = JSON.parse(readFileSync(join(out, 'fulfilment-manifest.json'), 'utf8'));
  assert.equal(manifest.mode, 'proof');
  assert.equal(manifest.product, 'whole-sky-edition');

  const canonicalPath = join(out, '_private', 'canonical-order.json');
  const controlPath = join(out, '_private', 'order-control.json');
  const manifestPath = join(out, 'fulfilment-manifest.json');
  const originalCanonical = readFileSync(canonicalPath, 'utf8');
  const originalControl = readFileSync(controlPath, 'utf8');
  const originalManifest = readFileSync(manifestPath, 'utf8');
  const rebound = canonicalizeStudioOrder({ ...JSON.parse(originalCanonical), mi: JSON.parse(originalCanonical).mi + 1 });
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
