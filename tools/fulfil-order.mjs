#!/usr/bin/env node
/**
 * Fail-closed AstroPrecise Studio fulfilment orchestrator.
 *
 * Proofs are always watermarked. Final, unwatermarked generation requires a
 * separate seller-dashboard payment attestation that matches the order and the
 * v901 catalogue. No birth fields are accepted on the command line.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, openSync, closeSync, unlinkSync } from 'fs';
import { spawnSync } from 'child_process';
import { createHmac, randomBytes } from 'crypto';
import { dirname, isAbsolute, join, relative, resolve } from 'path';
import { fileURLToPath } from 'url';
import {
  DURABLE_CONFIRMATION_VERSION, ROOT, STUDIO_SKUS, assertDigitalSupplyMayBegin, assertExactFictionalStudioFixture, assertWorkMayStart, canonicalizeStudioOrder, cleanDisplayText, parseArgs, sha256, verifyPaymentEvidence,
} from './fulfil-shared.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const CATALOGUE_PATH = join(ROOT, 'website', 'data', 'products-v901.json');
const ALLOWED = new Set(STUDIO_SKUS);

function run(script, args, extraEnv = {}) {
  const result = spawnSync(process.execPath, [join(HERE, script), ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, AP_PRIVATE_FULFILMENT: '1', ...extraEnv },
  });
  if (result.status !== 0) throw new Error(`${script} failed with exit code ${result.status ?? 'unknown'}`);
  console.log(script === 'fulfil-quality.mjs' ? 'QUALITY PASS (private details suppressed)' : `${script} completed`);
}

function customerInput(order) {
  const canonical = {
    schema: 'astroprecise-studio-order-v901',
    orderId: order.orderId,
    product: order.product,
    email: order.email,
    purchaseIntent: order.purchaseIntent,
    name: order.name,
    place: order.place,
    y: order.y, mo: order.mo, d: order.d, h: order.h, mi: order.mi,
    lat: order.lat, lon: order.lon, tz: order.tz,
    utcOffsetMinutes: order.utcOffsetMinutes,
    timeAccuracy: order.timeAccuracy,
    house: order.house || 'placidus',
    utc: order.utc,
    contractAt: order.contractAt,
    buyerDurableConfirmationSentAt: order.buyerDurableConfirmationSentAt,
    buyerDurableConfirmationVersion: order.buyerDurableConfirmationVersion,
    buyerDurableConfirmationFile: order.buyerDurableConfirmationFile,
    buyerDurableConfirmationHash: order.buyerDurableConfirmationHash,
    earlyStartConsent: order.earlyStartConsent,
    earlyStartConsentRecordedAt: order.earlyStartConsentRecordedAt,
    earlyStartConsentActor: order.earlyStartConsentActor,
    earlyStartNoticeVersion: order.earlyStartNoticeVersion,
    earlyStartNoticeHash: order.earlyStartNoticeHash,
    digitalSupplyConsent: order.digitalSupplyConsent,
    digitalSupplyConsentRecordedAt: order.digitalSupplyConsentRecordedAt,
    digitalSupplyConsentActor: order.digitalSupplyConsentActor,
    digitalSupplyNoticeVersion: order.digitalSupplyNoticeVersion,
    digitalSupplyNoticeHash: order.digitalSupplyNoticeHash,
    generatedAt: order.generatedAt,
    sampleMode: order.sampleMode === 'fictional' ? 'fictional' : undefined,
    fulfilmentAuthorization: order.fulfilmentAuthorization,
  };
  if (order.purchaseIntent === 'gift') {
    Object.assign(canonical, {
      recipientDisplayName: order.recipientDisplayName,
      giverDisplayName: order.giverDisplayName,
      occasion: order.occasion,
      giftMessage: order.giftMessage,
      recipientEmail: order.recipientEmail,
      recipientDeclaration: order.recipientDeclaration,
      recipientConfirmedAt: order.recipientConfirmedAt,
      recipientProcessingNoticeVersion: order.recipientProcessingNoticeVersion,
      recipientProcessingNoticeHash: order.recipientProcessingNoticeHash,
      recipientConfirmationMethod: order.recipientConfirmationMethod,
      recipientPrivacyNoticeVersion: order.recipientPrivacyNoticeVersion,
      recipientPrivacyNoticeHash: order.recipientPrivacyNoticeHash,
      recipientBirthInputHash: order.recipientBirthInputHash,
      recipientConfirmationEvidenceHash: order.recipientConfirmationEvidenceHash,
      recipientDurableConfirmationSentAt: order.recipientDurableConfirmationSentAt,
      recipientDurableConfirmationVersion: order.recipientDurableConfirmationVersion,
      recipientDurableConfirmationFile: order.recipientDurableConfirmationFile,
      recipientDurableConfirmationHash: order.recipientDurableConfirmationHash,
      buyerAttestation: order.buyerAttestation,
      buyerAttestationVersion: order.buyerAttestationVersion,
      buyerAttestationHash: order.buyerAttestationHash,
      buyerAttestationActor: order.buyerAttestationActor,
      buyerAttestationRecordedAt: order.buyerAttestationRecordedAt,
      deliveryTo: order.deliveryTo,
      recipientDisclosureAuthorized: order.recipientDisclosureAuthorized,
      recipientDisclosureAuthorizedAt: order.recipientDisclosureAuthorizedAt,
      recipientDisclosureAuthorizedBy: order.recipientDisclosureAuthorizedBy,
      recipientDisclosureWithdrawnAt: order.recipientDisclosureWithdrawnAt,
      recipientDisclosureWithdrawnBy: order.recipientDisclosureWithdrawnBy,
      recipientDisclosureState: order.recipientDisclosureState,
      recipientDisclosureActive: order.recipientDisclosureActive,
      recipientDisclosureWordingVersion: order.recipientDisclosureWordingVersion,
      recipientDisclosureWordingHash: order.recipientDisclosureWordingHash,
    });
  }
  return canonical;
}

function configuredPrivateOrdersRoot() {
  const configured = String(process.env.AP_STUDIO_PRIVATE_ORDERS_ROOT || '').trim();
  if (!configured || !isAbsolute(configured)) throw new Error('AP_STUDIO_PRIVATE_ORDERS_ROOT must name an absolute access-restricted directory outside the repository');
  const privateRoot = resolve(configured);
  const fromRepo = relative(resolve(ROOT), privateRoot);
  if (!fromRepo || (!fromRepo.startsWith('..') && !isAbsolute(fromRepo))) {
    throw new Error('AP_STUDIO_PRIVATE_ORDERS_ROOT must be outside the repository');
  }
  return privateRoot;
}

function assertOutsideRepository(path, label) {
  const candidate = resolve(path);
  const fromRepo = relative(resolve(ROOT), candidate);
  if (!fromRepo || (!fromRepo.startsWith('..') && !isAbsolute(fromRepo))) {
    throw new Error(`${label} must be outside the repository`);
  }
  return candidate;
}

function assertDurableConfirmationFiles(order, orderDirectory) {
  const records = [
    ['buyer', order.buyerDurableConfirmationFile, order.buyerDurableConfirmationHash],
    ...(order.purchaseIntent === 'gift' ? [['recipient', order.recipientDurableConfirmationFile, order.recipientDurableConfirmationHash]] : []),
  ];
  for (const [actor, file, expectedHash] of records) {
    if (order[`${actor}DurableConfirmationVersion`] !== DURABLE_CONFIRMATION_VERSION) throw new Error(`${actor} durable confirmation version is not approved`);
    const path = resolve(orderDirectory, file || '');
    if (dirname(path) !== resolve(orderDirectory) || !existsSync(path)) throw new Error(`${actor} durable confirmation file is missing from the private order directory`);
    if (sha256(readFileSync(path)) !== expectedHash) throw new Error(`${actor} durable confirmation file hash does not match the order record`);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.final) throw new Error('--final is disabled; use a matching --payment record for final fulfilment');
  if (!args.in) throw new Error('Usage: fulfil-order.mjs --in <private order.json> (--proof | --payment <verified-payment.json>) [--out <private dir>]');
  if (!args.proof && !args.payment) throw new Error('Choose --proof or supply --payment; final state is never inferred from orderId');
  if (args.proof && args.payment) throw new Error('--proof and --payment are mutually exclusive');

  const sourceOrder = JSON.parse(readFileSync(resolve(args.in), 'utf8'));
  if (!ALLOWED.has(sourceOrder.product)) throw new Error(`Unsupported launch SKU: ${sourceOrder.product || '(missing)'}`);
  const catalogue = JSON.parse(readFileSync(CATALOGUE_PATH, 'utf8'));
  const product = catalogue.products.find((entry) => entry.sku === sourceOrder.product);
  if (!product) throw new Error('Order SKU is absent from products-v901.json');
  if (args.payment && args.out) throw new Error('Final fulfilment uses the canonical private order directory; --out is not allowed with --payment');
  if (args.payment && catalogue.platform?.checkoutVerified !== true) {
    throw new Error('Final fulfilment is disabled until the signed-in checkout and payment adapter are verified');
  }
  const fictionalProof = args.proof ? assertExactFictionalStudioFixture(sourceOrder) : false;
  if (args.proof && !fictionalProof) assertWorkMayStart(sourceOrder);
  let order = canonicalizeStudioOrder(sourceOrder);
  if (!fictionalProof) assertDurableConfirmationFiles(order, dirname(resolve(args.in)));
  if (args.payment && order.purchaseIntent === 'gift') {
    if (catalogue.platform?.giftCheckoutVerified !== true) throw new Error('Gift final fulfilment is disabled until the signed-in two-person recipient flow is verified');
    if (order.recipientPrivacyNoticeVersion !== catalogue.platform.giftPrivacyNoticeVersion || order.recipientPrivacyNoticeHash !== catalogue.platform.giftPrivacyNoticeHash) {
      throw new Error('Gift final fulfilment requires the owner-approved recipient privacy notice version and hash');
    }
  }
  order.orderId = cleanDisplayText(order.orderId || (args.proof ? 'FICTIONAL-PROOF' : ''), { label: 'orderId', max: 128 });
  if (!order.orderId) throw new Error('orderId is required');
  order.generatedAt = new Date().toISOString();

  let final = false;
  let paymentResult = null;
  let renderCapability = '';
  let transactionLedgerPath = null;
  let privateOrdersRoot = null;
  if (args.payment) {
    assertWorkMayStart(order);
    assertDigitalSupplyMayBegin(order);
    privateOrdersRoot = configuredPrivateOrdersRoot();
    const payment = JSON.parse(readFileSync(resolve(args.payment), 'utf8'));
    paymentResult = verifyPaymentEvidence(sourceOrder, payment, { ...product, currency: catalogue.currency });
    if (!paymentResult.ok) throw new Error(`Payment evidence rejected: ${paymentResult.errors.join('; ')}`);
    const transactionHash = sha256(String(payment.transactionId).trim());
    const ledgerDir = join(privateOrdersRoot, '_transaction-ledger');
    mkdirSync(ledgerDir, { recursive: true, mode: 0o700 });
    transactionLedgerPath = join(ledgerDir, `tx-${transactionHash}.json`);
    let ledger;
    try {
      ledger = openSync(transactionLedgerPath, 'wx');
    } catch {
      throw new Error('Payment transaction has already been used or reserved for fulfilment');
    }
    try {
      writeFileSync(ledger, JSON.stringify({
        schema: 'astroprecise-studio-transaction-ledger-v901',
        transactionHash,
        orderRefHash: sha256(String(sourceOrder.orderId)).slice(0, 16),
        product: sourceOrder.product,
        paymentEvidenceHash: paymentResult.evidenceHash,
        state: 'reserved',
        reservedAt: new Date().toISOString(),
      }, null, 2) + '\n');
    } finally {
      closeSync(ledger);
    }
    final = true;
    renderCapability = randomBytes(32).toString('hex');
    order.fulfilmentAuthorization = {
      state: 'paid-in-full',
      paymentEvidenceHash: paymentResult.evidenceHash,
      renderCapabilityHash: sha256(renderCapability),
    };
  }

  const refHash = sha256(order.orderId).slice(0, 16);
  const defaultRoot = final ? join(privateOrdersRoot, 'orders') : join(ROOT, 'output', 'proofs');
  let outDir;
  if (final) {
    outDir = join(defaultRoot, `order-${refHash}`);
  } else if (fictionalProof) {
    outDir = args.out ? resolve(args.out) : join(defaultRoot, `order-${refHash}`);
  } else {
    if (!args.out) throw new Error('Non-fictional proofs require an explicit access-restricted --out directory outside the repository');
    outDir = assertOutsideRepository(args.out, 'Non-fictional proof output');
  }
  mkdirSync(outDir, { recursive: true, mode: 0o700 });
  const lockPath = join(outDir, '.fulfilment.lock');
  let lock;
  try {
    lock = openSync(lockPath, 'wx');
  } catch {
    throw new Error('This order is already being processed');
  }

  try {
    const completionPath = join(outDir, 'fulfilment-manifest.json');
    if (final && existsSync(completionPath)) throw new Error('Final fulfilment already exists; immutable duplicate rejected');
    const privateDir = join(outDir, '_private');
    mkdirSync(privateDir, { recursive: true });
    const generatorOrder = customerInput(order);
    const inputHash = sha256(JSON.stringify(generatorOrder));
    const mode = final ? 'final' : 'proof';
    const provenanceKey = randomBytes(32);
    const provenanceRef = `AP-${createHmac('sha256', provenanceKey)
      .update(`${inputHash}\0${refHash}\0${order.product}\0${mode}`)
      .digest('hex').slice(0, 16).toUpperCase()}`;
    const privateOrderPath = join(privateDir, 'canonical-order.json');
    writeFileSync(privateOrderPath, JSON.stringify(generatorOrder, null, 2) + '\n');
    writeFileSync(join(privateDir, 'provenance-key.bin'), provenanceKey, { mode: 0o600 });
    writeFileSync(join(privateDir, 'order-control.json'), JSON.stringify({
      schema: 'astroprecise-studio-control-v901',
      orderRefHash: refHash,
      product: order.product,
      inputHash,
      provenanceRef,
      paymentEvidenceHash: paymentResult?.evidenceHash || null,
      mode,
      workStart: {
        contractAt: generatorOrder.contractAt || null,
        buyerDurableConfirmationSentAt: generatorOrder.buyerDurableConfirmationSentAt || null,
        buyerDurableConfirmationVersion: generatorOrder.buyerDurableConfirmationVersion || null,
        buyerDurableConfirmationFile: generatorOrder.buyerDurableConfirmationFile || null,
        buyerDurableConfirmationHash: generatorOrder.buyerDurableConfirmationHash || null,
        recipientDurableConfirmationSentAt: generatorOrder.recipientDurableConfirmationSentAt || null,
        recipientDurableConfirmationVersion: generatorOrder.recipientDurableConfirmationVersion || null,
        recipientDurableConfirmationFile: generatorOrder.recipientDurableConfirmationFile || null,
        recipientDurableConfirmationHash: generatorOrder.recipientDurableConfirmationHash || null,
        earlyStartConsent: generatorOrder.earlyStartConsent,
        earlyStartConsentRecordedAt: generatorOrder.earlyStartConsentRecordedAt,
        earlyStartConsentActor: generatorOrder.earlyStartConsentActor || null,
        earlyStartNoticeVersion: generatorOrder.earlyStartNoticeVersion || null,
        earlyStartNoticeHash: generatorOrder.earlyStartNoticeHash || null,
      },
      digitalSupply: {
        digitalSupplyConsent: generatorOrder.digitalSupplyConsent,
        digitalSupplyConsentRecordedAt: generatorOrder.digitalSupplyConsentRecordedAt,
        digitalSupplyConsentActor: generatorOrder.digitalSupplyConsentActor || null,
        digitalSupplyNoticeVersion: generatorOrder.digitalSupplyNoticeVersion || null,
        digitalSupplyNoticeHash: generatorOrder.digitalSupplyNoticeHash || null,
      },
      generatedAt: order.generatedAt,
    }, null, 2) + '\n');

    const renderEnv = {
      AP_FULFILMENT_CAPABILITY: renderCapability || '',
      AP_CHECKOUT_VERIFIED: catalogue.platform?.checkoutVerified === true ? '1' : '',
      AP_STUDIO_INPUT_HASH: inputHash,
      AP_STUDIO_PROVENANCE_REF: provenanceRef,
      AP_STUDIO_MODE: mode,
    };
    run('generate-reading.mjs', ['--in', privateOrderPath, '--out', outDir], renderEnv);
    run('render-product-pdfs.mjs', ['--dir', outDir]);
    if (order.purchaseIntent === 'gift') {
      run('generate-birthday-gift-assets.mjs', ['--in', privateOrderPath, '--out', outDir], renderEnv);
    }
    if (order.product === 'natal-sky-print-pack' || order.product === 'whole-sky-edition') {
      run('generate-natal-print-pack.mjs', ['--in', privateOrderPath, '--out', outDir], renderEnv);
    }
    if (order.product === 'whole-sky-edition') {
      run('capture-observatory-still.mjs', ['--in', privateOrderPath, '--out', outDir], renderEnv);
    }
    run('package-studio-order.mjs', ['--dir', outDir, '--in', privateOrderPath, '--product', order.product, '--mode', final ? 'final' : 'proof', '--input-hash', inputHash]);
    run('fulfil-quality.mjs', ['--dir', outDir, '--product', order.product, final ? '--final' : '--proof']);
    if (transactionLedgerPath) {
      const ledger = JSON.parse(readFileSync(transactionLedgerPath, 'utf8'));
      writeFileSync(transactionLedgerPath, JSON.stringify({ ...ledger, state: 'complete', completedAt: new Date().toISOString() }, null, 2) + '\n');
    }
    console.log(`fulfilment ${final ? 'FINAL' : 'PROOF'} complete · order-ref ${refHash} · ${order.product}`);
  } finally {
    if (lock !== undefined) closeSync(lock);
    if (existsSync(lockPath)) unlinkSync(lockPath);
  }
}

try {
  main();
} catch (error) {
  console.error(`Fulfilment blocked: ${error.message}`);
  process.exit(1);
}
