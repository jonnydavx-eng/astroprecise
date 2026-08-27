#!/usr/bin/env node
/**
 * Fail-closed AstroPrecise Studio fulfilment orchestrator.
 *
 * Proofs are always watermarked. Final, unwatermarked generation requires a
 * separate seller-dashboard payment attestation that matches the order and the
 * v901 catalogue. No birth fields are accepted on the command line.
 */
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHmac, randomBytes } from 'node:crypto';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DURABLE_CONFIRMATION_VERSION, ROOT, STUDIO_SKUS, assertDigitalSupplyMayBegin, assertExactFictionalStudioFixture, assertWorkMayStart, canonicalSignedPaymentReceipt, canonicalizeStudioOrder, cleanDisplayText, parseArgs, sha256, verifyPaymentEvidence,
} from './fulfil-shared.mjs';
import {
  assertNoReparsePath,
  assertSecureExternalFile,
  assertSecurePrivateRoot,
  assertTreeHasNoReparsePoints,
  buildFulfilChildEnv,
  ensureContainedDirectory,
  ensureSecureExternalDirectory,
  isPathWithin,
  resolveContainedPath,
  writeNewFileSync,
} from './fulfil-security.mjs';
import { captureEvidenceBundle } from './fulfil-evidence.mjs';
import {
  createTransactionStaging,
  acquireTransactionLock,
  paymentTransactionHash,
  readTransactionLedger,
  recordTransactionReady,
  reservePaymentTransaction,
  resumeEmptyTransactionStaging,
  retryTransactionStaging,
} from './fulfil-ledger.mjs';
import {
  canonicalSellerContractConfig,
  validateBuyerDurableConfirmationBytes,
} from './render-studio-confirmations.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const CATALOGUE_PATH = join(ROOT, 'website', 'data', 'products-v901.json');
const ALLOWED = new Set(STUDIO_SKUS);

function run(script, args, extraEnv = {}) {
  const result = spawnSync(process.execPath, [join(HERE, script), ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    env: buildFulfilChildEnv(extraEnv),
  });
  if (result.status !== 0) {
    const visualDiagnostic = script === 'fulfil-quality.mjs'
      ? String(result.stderr || '').split(/\r?\n/).find((line) =>
          /^QUALITY FAIL: [A-Za-z0-9._-]+ page \d+ is visually flat\/covered:/.test(line))
      : null;
    throw new Error(`${script} failed with exit code ${result.status ?? 'unknown'}${visualDiagnostic ? `; ${visualDiagnostic}` : ''}`);
  }
  console.log(script === 'fulfil-quality.mjs' ? 'QUALITY PASS (private details suppressed)' : `${script} completed`);
}

function customerInput(order) {
  const canonical = {
    schema: 'astroprecise-studio-order-v901',
    orderId: order.orderId,
    product: order.product,
    email: order.email,
    purchaseIntent: order.purchaseIntent,
    buyerDeclaration: order.buyerDeclaration,
    name: order.name,
    place: order.place,
    y: order.y, mo: order.mo, d: order.d, h: order.h, mi: order.mi,
    lat: order.lat, lon: order.lon, tz: order.tz,
    utcOffsetMinutes: order.utcOffsetMinutes,
    timeAccuracy: order.timeAccuracy,
    house: order.house || 'placidus',
    utc: order.utc,
    contractAt: order.contractAt,
    termsAccepted: order.termsAccepted,
    termsAcceptedAt: order.termsAcceptedAt,
    termsAcceptedActor: order.termsAcceptedActor,
    termsVersion: order.termsVersion,
    termsHash: order.termsHash,
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
  return assertSecurePrivateRoot(process.env.AP_STUDIO_PRIVATE_ORDERS_ROOT, {
    repositoryRoot: ROOT,
    label: 'AP_STUDIO_PRIVATE_ORDERS_ROOT',
  });
}

function configuredSellerContractConfig() {
  const configPath = assertSecureExternalFile(process.env.AP_STUDIO_SELLER_CONTRACT_CONFIG, {
    repositoryRoot: ROOT,
    label: 'AP_STUDIO_SELLER_CONTRACT_CONFIG',
  });
  return canonicalSellerContractConfig(JSON.parse(readFileSync(configPath, 'utf8')));
}

function assertDurableConfirmationFiles(order, orderDirectory, sellerConfig) {
  if (order.purchaseIntent !== 'self') throw new Error('v902 durable-confirmation validation supports the adult self-order launch only');
  if (order.buyerDurableConfirmationVersion !== DURABLE_CONFIRMATION_VERSION) throw new Error('buyer durable confirmation version is not approved');
  let confirmationPath;
  try {
    confirmationPath = resolveContainedPath(orderDirectory, order.buyerDurableConfirmationFile || '', {
      label: 'Buyer durable confirmation', mustExist: true, kind: 'file',
    });
  } catch {
    throw new Error('buyer durable confirmation file is missing from the private order directory');
  }
  const confirmationBytes = readFileSync(confirmationPath);
  const confirmation = validateBuyerDurableConfirmationBytes({ bytes: confirmationBytes, order, sellerConfig });
  const termsPath = resolveContainedPath(orderDirectory, confirmation.terms.file, {
    label: 'Immutable contract terms attachment', mustExist: true, kind: 'file',
  });
  if (sha256(readFileSync(termsPath)) !== confirmation.terms.sha256) {
    throw new Error('immutable contract terms attachment does not match the approved confirmation record');
  }
  return [
    {
      kind: 'buyer-durable-confirmation',
      root: orderDirectory,
      path: order.buyerDurableConfirmationFile,
      expectedHash: order.buyerDurableConfirmationHash,
    },
    {
      kind: 'buyer-contract-terms',
      root: orderDirectory,
      path: confirmation.terms.file,
      expectedHash: confirmation.terms.sha256,
    },
  ];
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.final) throw new Error('--final is disabled; use a matching --payment record for final fulfilment');
  if (!args.in) throw new Error('Usage: fulfil-order.mjs --in <private order.json> (--proof | --payment <verified-payment.json>) [--out <private dir>]');
  if (!args.proof && !args.payment) throw new Error('Choose --proof or supply --payment; final state is never inferred from orderId');
  if (args.proof && args.payment) throw new Error('--proof and --payment are mutually exclusive');

  const catalogue = JSON.parse(readFileSync(CATALOGUE_PATH, 'utf8'));
  if (args.payment && args.out) throw new Error('Final fulfilment uses the canonical private order directory; --out is not allowed with --payment');
  if (args.payment && catalogue.platform?.checkoutVerified !== true) {
    throw new Error('Final fulfilment is disabled until the signed-in checkout and payment adapter are verified');
  }

  let privateOrdersRoot = null;
  let inputPath;
  if (args.payment) {
    privateOrdersRoot = configuredPrivateOrdersRoot();
    inputPath = resolveContainedPath(privateOrdersRoot, args.in, { label: 'Final order input', mustExist: true, kind: 'file' });
  } else {
    inputPath = assertNoReparsePath(resolve(args.in), { label: 'Proof order input' });
  }
  const sourceOrderBytes = readFileSync(inputPath);
  const sourceOrder = JSON.parse(sourceOrderBytes.toString('utf8'));
  if (!ALLOWED.has(sourceOrder.product)) throw new Error(`Unsupported launch SKU: ${sourceOrder.product || '(missing)'}`);
  const catalogueProduct = catalogue.products.find((entry) => entry.sku === sourceOrder.product);
  const requestedPurchaseMode = sourceOrder.purchaseIntent || 'self';
  if (catalogue.launchMode !== 'self-only' ||
      !catalogue.sharedRules?.purchaseModes?.includes(requestedPurchaseMode) ||
      (catalogueProduct && !catalogueProduct.purchaseModes?.includes(requestedPurchaseMode))) {
    throw new Error(`Catalogue rejects purchaseIntent "${requestedPurchaseMode}"; v902 launch is adult self-order only`);
  }
  if (args.proof && !catalogueProduct) throw new Error('Proof order SKU is absent from products-v901.json');
  const fictionalProof = args.proof ? assertExactFictionalStudioFixture(sourceOrder) : false;
  if (args.proof && !fictionalProof) {
    inputPath = assertSecureExternalFile(inputPath, { repositoryRoot: ROOT, label: 'Non-fictional proof input' });
    assertWorkMayStart(sourceOrder);
  }
  let order = canonicalizeStudioOrder(sourceOrder);
  const sellerConfig = fictionalProof ? null : configuredSellerContractConfig();
  const confirmationEvidenceSources = fictionalProof
    ? []
    : assertDurableConfirmationFiles(order, dirname(inputPath), sellerConfig);
  const contractProductSnapshot = sellerConfig?.products.find((entry) => entry.sku === order.product) || null;
  let paymentProduct = contractProductSnapshot
    ? {
        sku: contractProductSnapshot.sku,
        name: contractProductSnapshot.name,
        currency: contractProductSnapshot.currency,
        priceGbp: contractProductSnapshot.totalMinor / 100,
      }
    : catalogueProduct ? { ...catalogueProduct, currency: catalogue.currency } : null;
  if (args.payment && order.purchaseIntent === 'gift') {
    if (catalogue.platform?.giftCheckoutVerified !== true) throw new Error('Gift final fulfilment is disabled until the signed-in two-person recipient flow is verified');
    if (order.recipientPrivacyNoticeVersion !== catalogue.platform.giftPrivacyNoticeVersion || order.recipientPrivacyNoticeHash !== catalogue.platform.giftPrivacyNoticeHash) {
      throw new Error('Gift final fulfilment requires the owner-approved recipient privacy notice version and hash');
    }
  }
  order.orderId = cleanDisplayText(order.orderId || (args.proof ? 'FICTIONAL-PROOF' : ''), { label: 'orderId', max: 128 });
  if (!order.orderId) throw new Error('orderId is required');
  order.generatedAt = new Date().toISOString();
  const refHash = sha256(order.orderId).slice(0, 16);

  let final = false;
  let paymentResult = null;
  let payment = null;
  let paymentPath = null;
  let paymentEvidenceBytes = null;
  let renderCapability = '';
  let transactionHash = null;
  let transactionStage = null;
  let transactionLock = null;
  try {
    if (args.payment) {
      assertWorkMayStart(order);
      assertDigitalSupplyMayBegin(order);
      paymentPath = resolveContainedPath(privateOrdersRoot, args.payment, { label: 'Payment receipt', mustExist: true, kind: 'file' });
      const suppliedPaymentBytes = readFileSync(paymentPath);
      const suppliedPayment = JSON.parse(suppliedPaymentBytes.toString('utf8'));
      transactionHash = paymentTransactionHash(suppliedPayment.provider, suppliedPayment.transactionId);
      transactionLock = acquireTransactionLock(privateOrdersRoot, transactionHash);
      const transactionPath = join(privateOrdersRoot, '_transaction-ledger', 'transactions', `tx-${transactionHash}`);
      let existing = existsSync(transactionPath) ? readTransactionLedger(privateOrdersRoot, transactionHash) : null;
      if (existing) {
        const reservedReceipt = existing.events[0].details.reservationReceipt;
        paymentProduct = {
          sku: reservedReceipt.productSku,
          currency: reservedReceipt.currency,
          priceGbp: reservedReceipt.amountMinor / 100,
        };
      }
      let freshPaymentResult = null;
      const verifyFreshSuppliedPayment = () => {
        const verified = verifyPaymentEvidence(order, suppliedPayment, paymentProduct, {
          requireAuthenticatedProviderFields: true,
        });
        if (!verified.ok) throw new Error(`Payment evidence rejected: ${verified.errors.join('; ')}`);
        return verified;
      };

      if (!existing) {
        if (!catalogueProduct) throw new Error('A new payment reservation requires the SKU to remain in the current catalogue');
        if (catalogueProduct.name !== contractProductSnapshot.name ||
            Math.round(Number(catalogueProduct.priceGbp) * 100) !== contractProductSnapshot.totalMinor ||
            catalogue.currency !== contractProductSnapshot.currency ||
            catalogue.sharedRules?.productionWorkingDays !== sellerConfig.productionWorkingDays ||
            catalogue.sharedRules?.productionClock !== sellerConfig.productionClock) {
          throw new Error('Approved durable-confirmation contract snapshot does not match the current checkout catalogue');
        }
        freshPaymentResult = verifyFreshSuppliedPayment();
        reservePaymentTransaction(privateOrdersRoot, {
          provider: freshPaymentResult.canonical.provider,
          transactionId: freshPaymentResult.canonical.transactionId,
          orderRefHash: refHash,
          product: order.product,
          paymentIdentityHash: freshPaymentResult.identityHash,
          reservationEvidenceHash: freshPaymentResult.evidenceHash,
          reservationNonceHash: sha256(freshPaymentResult.canonical.verificationNonce),
          reservationReceipt: canonicalSignedPaymentReceipt(suppliedPayment),
        }, { lockToken: transactionLock.token });
        transactionStage = createTransactionStaging(privateOrdersRoot, transactionHash, { lockToken: transactionLock.token });
      } else {
        const reservation = existing.events[0].details;
        if (reservation.orderRefHash !== refHash || reservation.product !== order.product) {
          throw new Error('Existing transaction reservation does not match this order');
        }
        if (existing.state === 'reserved') {
          transactionStage = createTransactionStaging(privateOrdersRoot, transactionHash, { lockToken: transactionLock.token });
        } else if (existing.state === 'retrying') {
          transactionStage = retryTransactionStaging(privateOrdersRoot, transactionHash, {}, { lockToken: transactionLock.token });
        } else if (existing.state === 'staging') {
          try {
            transactionStage = resumeEmptyTransactionStaging(privateOrdersRoot, transactionHash, { lockToken: transactionLock.token });
          } catch (error) {
            if (!/partial output and requires a fresh authenticated retry/i.test(String(error?.message || ''))) throw error;
            freshPaymentResult = verifyFreshSuppliedPayment();
            if (freshPaymentResult.identityHash !== reservation.paymentIdentityHash) {
              throw new Error('Retry payment identity does not match the reserved transaction');
            }
            transactionStage = retryTransactionStaging(privateOrdersRoot, transactionHash, {
              orderRefHash: refHash,
              product: order.product,
              paymentIdentityHash: freshPaymentResult.identityHash,
              retryEvidenceHash: freshPaymentResult.evidenceHash,
              retryNonceHash: sha256(freshPaymentResult.canonical.verificationNonce),
              providerObservedAt: freshPaymentResult.canonical.providerObservedAt,
              retryReceipt: canonicalSignedPaymentReceipt(suppliedPayment),
            }, { lockToken: transactionLock.token });
          }
        } else {
          throw new Error(`Existing transaction is ${existing.state}; use controlled READY recovery instead of rendering again`);
        }
      }

      payment = transactionStage.authorisingReceipt;
      paymentResult = verifyPaymentEvidence(order, payment, paymentProduct, {
        now: () => Date.parse(transactionStage.authorisingRecordedAt),
        requireAuthenticatedProviderFields: true,
      });
      existing = readTransactionLedger(privateOrdersRoot, transactionHash);
      if (!paymentResult.ok || paymentResult.evidenceHash !== transactionStage.authorisingEvidenceHash ||
          paymentResult.identityHash !== existing.events[0].details.paymentIdentityHash) {
        throw new Error(`Committed render authorisation failed verification: ${paymentResult.errors.join('; ')}`);
      }
      paymentEvidenceBytes = Buffer.from(`${JSON.stringify(canonicalSignedPaymentReceipt(payment), null, 2)}\n`);
      final = true;
      renderCapability = randomBytes(32).toString('hex');
      order.fulfilmentAuthorization = {
        state: 'paid-in-full',
        paymentEvidenceHash: paymentResult.evidenceHash,
        renderCapabilityHash: sha256(renderCapability),
      };
    }

    let outDir;
  if (final) {
    if (!transactionStage) throw new Error('Final transaction has no locked staging attempt');
    outDir = transactionStage.stagingPath;
  } else if (fictionalProof) {
    const requested = args.out ? resolve(args.out) : join(ROOT, 'output', 'proofs', `order-${refHash}`);
    outDir = isPathWithin(ROOT, requested)
      ? ensureContainedDirectory(ROOT, requested, { label: 'Fictional proof output' })
      : ensureSecureExternalDirectory(requested, { repositoryRoot: ROOT, label: 'Fictional proof output' });
  } else {
    if (!args.out) throw new Error('Non-fictional proofs require an explicit access-restricted --out directory outside the repository');
    outDir = ensureSecureExternalDirectory(args.out, { repositoryRoot: ROOT, label: 'Non-fictional proof output' });
  }
  const lockPath = join(outDir, '.fulfilment.lock');
  const fulfilmentLockToken = randomBytes(32).toString('hex');
  try {
    writeNewFileSync(lockPath, `${fulfilmentLockToken}\n`, { label: 'Fulfilment render lock' });
  } catch {
    throw new Error('This order is already being processed');
  }
  let lockReleased = false;
  const releaseLock = () => {
    if (lockReleased) return;
    if (existsSync(lockPath)) {
      if (readFileSync(lockPath, 'utf8') !== `${fulfilmentLockToken}\n`) {
        throw new Error('Fulfilment render lock ownership changed; refusing to remove another owner lock');
      }
      unlinkSync(lockPath);
    }
    lockReleased = true;
  };

  try {
    const completionPath = join(outDir, 'fulfilment-manifest.json');
    if (final && existsSync(completionPath)) throw new Error('Final fulfilment already exists; immutable duplicate rejected');
    const privateDir = ensureContainedDirectory(outDir, '_private', { label: 'Private fulfilment records' });
    const generatorOrder = customerInput(order);
    const inputHash = sha256(JSON.stringify(generatorOrder));
    const mode = final ? 'final' : 'proof';
    const provenanceKey = randomBytes(32);
    const provenanceRef = `AP-${createHmac('sha256', provenanceKey)
      .update(`${inputHash}\0${refHash}\0${order.product}\0${mode}`)
      .digest('hex').slice(0, 16).toUpperCase()}`;
    const privateOrderPath = join(privateDir, 'canonical-order.json');
    const writePrivate = (path, bytes, options = {}) => final
      ? writeNewFileSync(path, bytes, { label: 'Private fulfilment record', mode: options.mode || 0o600 })
      : writeFileSync(path, bytes, options);
    writePrivate(privateOrderPath, JSON.stringify(generatorOrder, null, 2) + '\n');
    writePrivate(join(privateDir, 'provenance-key.bin'), provenanceKey, { mode: 0o600 });
    writePrivate(join(privateDir, 'order-control.json'), JSON.stringify({
      schema: 'astroprecise-studio-control-v901',
      orderRefHash: refHash,
      product: order.product,
      inputHash,
      provenanceRef,
      paymentEvidenceHash: paymentResult?.evidenceHash || null,
      mode,
      workStart: {
        contractAt: generatorOrder.contractAt || null,
        termsAccepted: generatorOrder.termsAccepted === true,
        termsAcceptedAt: generatorOrder.termsAcceptedAt || null,
        termsAcceptedActor: generatorOrder.termsAcceptedActor || null,
        termsVersion: generatorOrder.termsVersion || null,
        termsHash: generatorOrder.termsHash || null,
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

    let evidenceResult = null;
    if (!fictionalProof) {
      const evidenceSources = [
        { kind: 'order-intake', bytes: sourceOrderBytes, expectedHash: sha256(sourceOrderBytes) },
        ...confirmationEvidenceSources,
      ];
      if (final) evidenceSources.push({ kind: 'payment-receipt', bytes: paymentEvidenceBytes, expectedHash: sha256(paymentEvidenceBytes) });
      evidenceResult = captureEvidenceBundle(privateDir, evidenceSources);
    }

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
    assertTreeHasNoReparsePoints(outDir, {
      label: 'Fulfilment output',
      requirePrivateAccess: final || !fictionalProof,
    });
    if (final) {
      if (!evidenceResult) throw new Error('Final fulfilment has no immutable evidence bundle');
      releaseLock();
      const fulfilmentManifestHash = sha256(readFileSync(completionPath));
      const evidenceManifestHash = sha256(readFileSync(evidenceResult.manifestPath));
      if (evidenceManifestHash !== evidenceResult.manifestHash) throw new Error('Evidence manifest changed during fulfilment');
      recordTransactionReady(privateOrdersRoot, transactionHash, { fulfilmentManifestHash, evidenceManifestHash }, {
        lockToken: transactionLock.token,
      });
      console.log(`fulfilment READY · transaction ${transactionHash.slice(0, 12)} · re-query provider state, then use controlled recovery with the new receipt`);
    } else {
      console.log(`fulfilment PROOF complete · order-ref ${refHash} · ${order.product}`);
    }
  } finally {
    releaseLock();
  }
  } finally {
    transactionLock?.release();
  }
}

try {
  main();
} catch (error) {
  console.error(`Fulfilment blocked: ${error.message}`);
  process.exit(1);
}
