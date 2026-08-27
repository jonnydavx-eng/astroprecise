#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { PDFDocument, PDFName } from 'pdf-lib';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import sharp from 'sharp';
import { DURABLE_CONFIRMATION_VERSION, GIFT_CONSENT_HASHES, GIFT_CONSENT_RECORDS, giftRecipientBirthInputHash, giftRecipientConfirmationEvidenceHash, sha256 } from './fulfil-shared.mjs';

const recipientConfirmedAt = '2026-08-24T12:01:00.000Z';
const recipientPrivacyNoticeVersion = 'fictional-gift-privacy-notice-v1-2026-08-24';
const recipientPrivacyNoticeHash = sha256('FICTIONAL GIFT PRIVACY NOTICE V1');
const recipientBirthInputHash = giftRecipientBirthInputHash({
  name: 'Aurora Vale', place: 'Whitby, England',
  y: 1990, mo: 6, d: 14, h: 3, mi: 42,
  lat: 54.486, lon: -0.613, tz: 'Europe/London', timeAccuracy: 'exact', house: 'placidus',
});
const recipientConfirmationEvidenceHash = giftRecipientConfirmationEvidenceHash({
  orderId: 'FICTIONAL-RENDER-901',
  product: 'whole-sky-edition',
  recipientEmail: 'aurora@example.test',
  recipientBirthInputHash,
  typedName: 'Aurora Vale', recipientConfirmedAt, recipientPrivacyNoticeVersion, recipientPrivacyNoticeHash,
});
const order = {
  orderId: 'FICTIONAL-RENDER-901', product: 'whole-sky-edition', email: 'sample@example.test',
  name: 'Aurora Vale', place: 'Whitby, England',
  y: 1990, mo: 6, d: 14, h: 3, mi: 42,
  lat: 54.486, lon: -0.613, tz: 'Europe/London', timeAccuracy: 'exact', house: 'placidus',
  purchaseIntent: 'gift',
  recipientDisplayName: 'Aurora Vale',
  giverDisplayName: 'Rowan Vale',
  occasion: 'birthday',
  giftMessage: 'A sky kept for you.',
  recipientEmail: 'aurora@example.test',
  recipientDeclaration: {
    typedName: 'Aurora Vale',
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
  buyerAttestationRecordedAt: '2026-08-24T12:02:00.000Z',
  buyerDurableConfirmationSentAt: '2026-08-24T12:05:00.000Z',
  buyerDurableConfirmationVersion: DURABLE_CONFIRMATION_VERSION,
  buyerDurableConfirmationFile: 'buyer-confirmation.eml',
  buyerDurableConfirmationHash: sha256('FICTIONAL BUYER DURABLE CONFIRMATION'),
  recipientDurableConfirmationSentAt: '2026-08-24T12:05:00.000Z',
  recipientDurableConfirmationVersion: DURABLE_CONFIRMATION_VERSION,
  recipientDurableConfirmationFile: 'recipient-confirmation.eml',
  recipientDurableConfirmationHash: sha256('FICTIONAL RECIPIENT DURABLE CONFIRMATION'),
  deliveryTo: 'recipient',
  recipientDisclosureAuthorized: true,
  recipientDisclosureAuthorizedAt: '2026-08-24T12:02:30.000Z',
  recipientDisclosureAuthorizedBy: 'recipient',
  recipientDisclosureWithdrawnAt: null,
  recipientDisclosureWithdrawnBy: null,
  recipientDisclosureWordingVersion: GIFT_CONSENT_RECORDS.recipientDisclosureWordingVersion,
  recipientDisclosureWordingHash: GIFT_CONSENT_HASHES.recipientDisclosureWordingHash,
  contractAt: '2026-08-24T12:00:00.000Z',
  termsAccepted: true,
  termsAcceptedAt: '2026-08-24T12:00:00.000Z',
  termsAcceptedActor: 'buyer',
  termsVersion: 'fictional-render-terms-v1',
  termsHash: sha256('FICTIONAL RENDER TERMS'),
  earlyStartConsent: true,
  earlyStartConsentRecordedAt: '2026-08-24T12:03:00.000Z',
  earlyStartConsentActor: 'buyer',
  earlyStartNoticeVersion: GIFT_CONSENT_RECORDS.earlyStartNoticeVersion,
  earlyStartNoticeHash: GIFT_CONSENT_HASHES.earlyStartNoticeHash,
  digitalSupplyConsent: true,
  digitalSupplyConsentRecordedAt: '2026-08-24T12:04:00.000Z',
  digitalSupplyConsentActor: 'buyer',
  digitalSupplyNoticeVersion: GIFT_CONSENT_RECORDS.digitalSupplyNoticeVersion,
  digitalSupplyNoticeHash: GIFT_CONSENT_HASHES.digitalSupplyNoticeHash,
};
const expected = {
  '01-natal-print-4960x7016.png': [4960, 7016],
  '02-natal-square-2160x2160.png': [2160, 2160],
  '03-natal-story-2160x3840.png': [2160, 3840],
  '04-phone-wallpaper-1080x1920.png': [1080, 1920],
  '05-big-three-1080x1080.png': [1080, 1080],
  '06-observatory-birth-hour-schematic-4800x3600.png': [4800, 3600],
  'birthday-reveal-1080x1920.png': [1080, 1920],
  'birthday-moon-plate-2160x2160.png': [2160, 2160],
};

async function compositionStats(path) {
  const metadata = await sharp(path).metadata();
  const contentHeight = Math.floor(metadata.height * .92);
  const { data, info } = await sharp(path)
    .extract({ left: 0, top: 0, width: metadata.width, height: contentHeight })
    .resize({ width: 128, height: 128, fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const luma = new Float32Array(info.width * info.height);
  let mean = 0;
  for (let pixel = 0, offset = 0; pixel < luma.length; pixel++, offset += info.channels) {
    luma[pixel] = .2126 * data[offset] + .7152 * data[offset + 1] + .0722 * data[offset + 2];
    mean += luma[pixel];
  }
  mean /= luma.length;
  let total = 0;
  let upper = 0;
  const cells = new Float64Array(9);
  const record = (value, x, y) => {
    total += value;
    if (y < info.height / 3) upper += value;
    const cellX = Math.min(2, Math.floor(x / info.width * 3));
    const cellY = Math.min(2, Math.floor(y / info.height * 3));
    cells[cellY * 3 + cellX] += value;
  };
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const at = y * info.width + x;
      if (x + 1 < info.width) record(Math.abs(luma[at] - luma[at + 1]), x + .5, y);
      if (y + 1 < info.height) record(Math.abs(luma[at] - luma[at + info.width]), x, y + .5);
    }
  }
  return {
    mean,
    upperEdgeFraction: upper / total,
    activeEdgeCells: [...cells].filter((value) => value / total >= .04).length,
  };
}

const root = mkdtempSync(join(tmpdir(), 'ap-product-render-v901-'));
try {
  const input = join(root, 'fictional-order.json');
  writeFileSync(input, JSON.stringify(order));
  const provenanceRef = 'AP-0123456789ABCDEF';
  const renderEnv = {
    ...process.env,
    AP_STUDIO_INPUT_HASH: sha256(JSON.stringify(order)),
    AP_STUDIO_PROVENANCE_REF: provenanceRef,
    AP_STUDIO_MODE: 'proof',
  };
  for (const [script, args] of [
    ['tools/generate-natal-print-pack.mjs', ['--in', input, '--out', root]],
    ['tools/capture-observatory-still.mjs', ['--in', input, '--out', root]],
    ['tools/generate-birthday-gift-assets.mjs', ['--in', input, '--out', root]],
  ]) {
    const result = spawnSync(process.execPath, [script, ...args], { cwd: process.cwd(), encoding: 'utf8', timeout: 120_000, env: renderEnv });
    assert.equal(result.status, 0, `${script}\n${result.stdout}\n${result.stderr}`);
  }
  for (const [script, args] of [
    ['tools/generate-reading.mjs', ['--in', input, '--out', root]],
    ['tools/render-product-pdfs.mjs', ['--dir', root]],
  ]) {
    const result = spawnSync(process.execPath, [script, ...args], { cwd: process.cwd(), encoding: 'utf8', timeout: 120_000, env: renderEnv });
    assert.equal(result.status, 0, `${script}\n${result.stdout}\n${result.stderr}`);
  }
  const renderManifest = JSON.parse(readFileSync(join(root, 'render-manifest.json'), 'utf8'));
  assert.ok(renderManifest.artifacts.every((artifact) => artifact.tagged === true), 'every rendered PDF must preserve a tag tree');
  assert.ok(
    renderManifest.artifacts.every((artifact) =>
      ['AstroGlyph', 'Cinzel', 'Cormorant Garamond', 'IBM Plex Mono'].every((family) => artifact.fontFamilies?.includes(family))),
    'every rendered PDF must prove the actual brand font faces loaded',
  );
  const a4Artifact = renderManifest.artifacts.find((artifact) => artifact.file === 'natal-sky-home-print-a4.pdf');
  assert.equal(a4Artifact?.variant, 'ink-light', 'A4 must be rendered directly from source HTML, not embedded from A3');
  const a4Pdf = await PDFDocument.load(readFileSync(join(root, 'natal-sky-home-print-a4.pdf')));
  assert.ok(a4Pdf.catalog.has(PDFName.of('StructTreeRoot')), 'derived A4 must expose a logical PDF tag tree');
  assert.ok(a4Pdf.catalog.has(PDFName.of('MarkInfo')), 'derived A4 must declare marked content');
  const jacketPath = join(root, 'birthday-gift-jacket-a4.pdf');
  const jacket = await PDFDocument.load(readFileSync(jacketPath));
  assert.equal(jacket.getPageCount(), 1, 'gift jacket must be one A4 page');
  const [jacketPage] = jacket.getPages();
  assert.ok(Math.abs(jacketPage.getWidth() - 595.28) < 1 && Math.abs(jacketPage.getHeight() - 841.89) < 1, 'gift jacket must be A4 portrait');
  assert.ok(jacket.catalog.has(PDFName.of('StructTreeRoot')), 'gift jacket must expose a logical PDF tag tree');
  assert.ok(jacket.catalog.has(PDFName.of('MarkInfo')), 'gift jacket must declare marked content');
  const loadingTask = getDocument({ data: new Uint8Array(readFileSync(jacketPath)), disableWorker: true, useSystemFonts: true });
  const renderedPdf = await loadingTask.promise;
  const textContent = await (await renderedPdf.getPage(1)).getTextContent();
  const jacketText = textContent.items.map((item) => item.str).join(' ').replace(/\s+/g, ' ');
  await loadingTask.destroy();
  assert.match(jacketText, /Birthday Orbit Edition/i);
  assert.match(jacketText, /FICTIONAL SAMPLE/i);
  assert.match(jacketText, /Aurora Vale/i);
  assert.doesNotMatch(jacketText, /aurora@example\.test|1990-06-14|GUMROAD/i);
  const giftControl = JSON.parse(readFileSync(join(root, '_private', 'gift-asset-control.json'), 'utf8'));
  const jacketControl = giftControl.artifacts.find((artifact) => artifact.file === 'birthday-gift-jacket-a4.pdf');
  assert.deepEqual(
    [jacketControl.sourceWidthPx, jacketControl.sourceHeightPx, jacketControl.effectiveDpi, jacketControl.tagged],
    [2480, 3508, 300, true],
    'gift jacket must use a tagged 300 ppi A4 source',
  );
  const retiredVoucher = spawnSync(process.execPath, ['tools/generate-gift-voucher.mjs', '--in', input], { cwd: process.cwd(), encoding: 'utf8' });
  assert.notEqual(retiredVoucher.status, 0, 'legacy gift voucher generator must remain disabled');
  assert.match(`${retiredVoucher.stdout}${retiredVoucher.stderr}`, /retired|disabled|unsafe/i);
  for (const [file, dims] of Object.entries(expected)) {
    const meta = await sharp(join(root, file)).metadata();
    assert.deepEqual([meta.width, meta.height, meta.format], [...dims, 'png'], file);
    const { data } = await sharp(join(root, file))
      .extract({ left: 0, top: dims[1] - 1, width: 1, height: 1 })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    assert.deepEqual([...data.slice(0, 3)], [0x8B, 0xA9, 0xFF], `${file} proof watermark marker`);
    const strip = await sharp(join(root, file))
      .extract({ left: 16, top: dims[1] - 28, width: 96 * 8, height: 8 })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const bits = [];
    for (let bit = 0; bit < 96; bit++) {
      const offset = (4 * strip.info.width + bit * 8 + 4) * strip.info.channels;
      const blue = strip.data[offset + 2];
      bits.push(blue > 0x80 ? '1' : '0');
    }
    const decoded = bits.join('').match(/.{4}/g).map((chunk) => Number.parseInt(chunk, 2).toString(16).toUpperCase()).join('');
    assert.equal(decoded, `A57A901E${provenanceRef.slice(3)}`, `${file} provenance strip`);
  }
  const observatoryStats = await compositionStats(join(root, '06-observatory-birth-hour-schematic-4800x3600.png'));
  assert.ok(observatoryStats.mean >= 26, `Observatory mean luminance ${observatoryStats.mean.toFixed(2)} must be >= 26`);
  assert.ok(observatoryStats.upperEdgeFraction >= .09, `Observatory upper-third edge share ${observatoryStats.upperEdgeFraction.toFixed(3)} must be >= 0.09`);
  assert.ok(observatoryStats.activeEdgeCells >= 6, `Observatory must activate at least 6/9 composition cells, got ${observatoryStats.activeEdgeCells}`);
  const stillSource = readFileSync('tools/capture-observatory-still.mjs', 'utf8');
  assert.match(stillSource, /captureBirthHourStill\(\{ jd: captureJd, timeKnown: true, scale: 3 \}\)/);
  assert.match(stillSource, /captureSeed = Number\.parseInt\(sha256\(JSON\.stringify\(order\)\)/);
  assert.match(stillSource, /window\.__AP_STUDIO_CAPTURE__ = true/);
  assert.match(stillSource, /Object\.defineProperty\(Math, 'random'/);
  assert.match(stillSource, /stampSurfaceA\(canvas, stampContext\)/);
  assert.match(stillSource, /brightness\(1\.18\) contrast\(1\.16\) saturate\(1\.08\)/);
  assert.match(stillSource, /createRadialGradient/);
  assert.match(stillSource, /AUTHORED WHOLE-SYSTEM VIEW/);
  const orrerySource = readFileSync('website/js/orrery-webgl.js', 'utf8');
  assert.match(orrerySource, /deterministicStudioCapture \? 'low' : getPerfTier\(\)/);
  assert.match(orrerySource, /\['uTime', 'uTimeSlow', 'uTimeFast'\]/);
  const shopAssetSource = readFileSync('tools/generate-shop-assets.mjs', 'utf8');
  assert.match(shopAssetSource, /OBSERVATORY_MASTER = join\(COVER_DIR, 'whole-sky-edition-1920\.webp'\)/);
  assert.match(shopAssetSource, /verifyObservatoryMaster\(observatoryCandidate, OBSERVATORY_MASTER\)/);
  assert.doesNotMatch(shopAssetSource, /writeFileSync\(OBSERVATORY_MASTER/);
  assert.match(shopAssetSource, /env: personalSampleEnv/);
  const observatoryMaster = await sharp('website/img/shop/v901/whole-sky-edition-1920.webp').metadata();
  assert.deepEqual(
    [observatoryMaster.width, observatoryMaster.height, observatoryMaster.format],
    [1920, 923, 'webp'],
    'reviewed Observatory release master must be present and exact',
  );
  const chartSource = readFileSync('tools/generate-natal-print-pack.mjs', 'utf8');
  assert.match(chartSource, /ap-chart-restore/);
  assert.match(chartSource, /Chart-page UTC\/JD mismatch/);
  assert.match(chartSource, /FICTIONAL SAMPLE · NOT A CUSTOMER FILE/);
  assert.match(chartSource, /P L A N E T A R Y   P L A C E M E N T S/);
  assert.match(chartSource, /chart wheel or any degree geometry/i);
  assert.match(chartSource, /drawX = x - 44 \* scale/);
  const giftSource = readFileSync('tools/generate-birthday-gift-assets.mjs', 'utf8');
  assert.match(giftSource, /function deterministicMoonRelief/);
  assert.match(giftSource, /clip-path="url\(#moonPhaseClip\)"/);
  const repeatGift = join(root, 'repeat-gift');
  const repeatGiftResult = spawnSync(process.execPath, ['tools/generate-birthday-gift-assets.mjs', '--in', input, '--out', repeatGift], {
    cwd: process.cwd(), encoding: 'utf8', timeout: 120_000, env: renderEnv,
  });
  assert.equal(repeatGiftResult.status, 0, `repeat gift render must succeed\n${repeatGiftResult.stdout}\n${repeatGiftResult.stderr}`);
  for (const file of ['birthday-reveal-1080x1920.png', 'birthday-moon-plate-2160x2160.png']) {
    assert.equal(
      sha256(readFileSync(join(root, file))),
      sha256(readFileSync(join(repeatGift, file))),
      `${file} deterministic relief must be byte-identical`,
    );
  }

  const stressName = 'W'.repeat(80);
  const stressBirthInputHash = giftRecipientBirthInputHash({ ...order, name: stressName });
  const stressOrder = {
    ...order,
    orderId: 'FICTIONAL-STRESS-901',
    name: stressName,
    recipientDisplayName: stressName,
    giverDisplayName: stressName,
    giftMessage: 'W'.repeat(240),
    recipientDeclaration: { ...order.recipientDeclaration, typedName: stressName },
    recipientBirthInputHash: stressBirthInputHash,
    recipientConfirmationEvidenceHash: giftRecipientConfirmationEvidenceHash({
      ...order,
      orderId: 'FICTIONAL-STRESS-901',
      recipientBirthInputHash: stressBirthInputHash,
      typedName: stressName,
    }),
  };
  const stressInput = join(root, 'stress-order.json');
  const stressOutput = join(root, 'stress-output');
  writeFileSync(stressInput, JSON.stringify(stressOrder));
  const stressResult = spawnSync(process.execPath, ['tools/generate-birthday-gift-assets.mjs', '--in', stressInput, '--out', stressOutput], {
    cwd: process.cwd(), encoding: 'utf8', timeout: 120_000,
    env: { ...renderEnv, AP_STUDIO_INPUT_HASH: sha256(JSON.stringify(stressOrder)), AP_STUDIO_PROVENANCE_REF: 'AP-FEDCBA9876543210' },
  });
  assert.equal(stressResult.status, 0, `maximum-length gift typography must fit\n${stressResult.stdout}\n${stressResult.stderr}`);
  for (const [file, dimensions] of [
    ['birthday-reveal-1080x1920.png', [1080, 1920]],
    ['birthday-moon-plate-2160x2160.png', [2160, 2160]],
  ]) {
    const metadata = await sharp(join(stressOutput, file)).metadata();
    assert.deepEqual([metadata.width, metadata.height], dimensions, `${file} stress dimensions`);
  }
  const stressPdf = await PDFDocument.load(readFileSync(join(stressOutput, 'birthday-gift-jacket-a4.pdf')));
  assert.ok(stressPdf.catalog.has(PDFName.of('StructTreeRoot')), 'maximum-length gift jacket must stay tagged');
} finally {
  if (process.env.AP_KEEP_RENDER_TEST_OUTPUT === '1') console.log(`QA output retained: ${root}`);
  else rmSync(root, { recursive: true, force: true });
}
console.log('PASS authentic product renders: chart pack, SCHEMATIC still and deterministic Birthday Orbit gift set');
