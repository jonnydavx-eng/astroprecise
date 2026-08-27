import assert from 'node:assert/strict';
import { createHash, createHmac } from 'node:crypto';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { captureEvidenceBundle, verifyEvidenceBundle } from './tools/fulfil-evidence.mjs';
import {
  acquireTransactionLock,
  createTransactionStaging,
  paymentTransactionHash,
  promoteReadyTransaction,
  readTransactionLedger,
  recordTransactionReady,
  reservePaymentTransaction,
  retryTransactionStaging,
} from './tools/fulfil-ledger.mjs';
import { recoverStudioOrder } from './tools/recover-studio-order.mjs';
import { canonicalPaymentEvidence, canonicalSignedPaymentReceipt, verifyPaymentEvidence } from './tools/fulfil-shared.mjs';

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const CLOCK = Date.parse('2026-08-24T20:30:00.000Z');
const PAYMENT_SECRET = 'a'.repeat(64);
process.env.AP_STUDIO_LEDGER_SECRET = 'c'.repeat(64);
process.env.AP_PAYMENT_ADAPTER_SECRET = PAYMENT_SECRET;
const PRODUCT = { sku: 'personal-sky-keepsake', priceGbp: 29, currency: 'GBP' };

function treeInventory(root) {
  const records = [];
  const visit = (directory, relative = '') => {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const relativePath = relative ? `${relative}/${entry.name}` : entry.name;
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        records.push(`d:${relativePath}`);
        visit(path, relativePath);
      } else {
        records.push(`f:${relativePath}:${sha256(readFileSync(path))}`);
      }
    }
  };
  visit(root);
  return records;
}

function signedPayment(suffix, order, overrides = {}) {
  const unsigned = {
    provider: 'gumroad',
    adapterReceiptId: `ADAPTER-RECOVERY-${suffix}`,
    transactionId: `TX-RECOVERY-${suffix}`,
    orderId: order.orderId,
    productSku: order.product,
    currency: 'GBP',
    amountMinor: 2900,
    status: 'paid-in-full',
    refunded: false,
    refundedAmountMinor: 0,
    disputed: false,
    chargeback: false,
    revoked: false,
    buyerEmail: order.email,
    providerAuthentication: 'gumroad-seller-api',
    providerRecordHash: sha256(`PROVIDER-${suffix}`),
    providerObservedAt: new Date(CLOCK - 30_000).toISOString(),
    commissionState: 'completed',
    finalChargeState: 'settled',
    verifiedAt: new Date(CLOCK - 20_000).toISOString(),
    verifiedBy: 'gumroad-adapter:recovery-test',
    verificationMethod: 'gumroad-authenticated-adapter-v2',
    verificationNonce: sha256(`NONCE-${suffix}`).slice(0, 32),
    ...overrides,
  };
  return {
    ...unsigned,
    adapterSignature: createHmac('sha256', Buffer.from(PAYMENT_SECRET, 'hex'))
      .update(JSON.stringify(canonicalPaymentEvidence(unsigned)))
      .digest('hex'),
  };
}

function prepareReady(privateRoot, suffix) {
  const incoming = join(privateRoot, 'incoming');
  mkdirSync(incoming, { recursive: true });
  const source = join(incoming, `confirmation-${suffix}.eml`);
  writeFileSync(source, `immutable confirmation ${suffix}`);
  const order = { orderId: `ORDER-${suffix}`, product: PRODUCT.sku, email: `buyer-${suffix.toLowerCase()}@example.test` };
  const payment = signedPayment(suffix, order);
  const verified = verifyPaymentEvidence(order, payment, PRODUCT, {
    adapterSecret: PAYMENT_SECRET,
    now: () => CLOCK,
    requireAuthenticatedProviderFields: true,
  });
  assert.equal(verified.ok, true);
  const paymentPath = join(incoming, `payment-${suffix}.json`);
  writeFileSync(paymentPath, JSON.stringify(payment, null, 2) + '\n');
  const transactionHash = paymentTransactionHash('gumroad', `TX-RECOVERY-${suffix}`);
  const transactionLock = acquireTransactionLock(privateRoot, transactionHash, { clock: () => CLOCK });
  let reservation;
  let stage;
  try {
    reservation = reservePaymentTransaction(privateRoot, {
      provider: 'gumroad',
      transactionId: `TX-RECOVERY-${suffix}`,
      orderRefHash: sha256(order.orderId).slice(0, 16),
      product: 'personal-sky-keepsake',
      paymentIdentityHash: verified.identityHash,
      reservationEvidenceHash: verified.evidenceHash,
      reservationNonceHash: sha256(payment.verificationNonce),
      reservationReceipt: canonicalSignedPaymentReceipt(payment),
    }, { clock: () => CLOCK, lockToken: transactionLock.token });
    stage = createTransactionStaging(privateRoot, reservation.transactionHash, {
      clock: () => CLOCK + 1_000,
      lockToken: transactionLock.token,
    });
  const privateDir = join(stage.stagingPath, '_private');
  mkdirSync(privateDir);
  const inputHash = sha256(JSON.stringify(order));
  const orderRefHash = sha256(order.orderId).slice(0, 16);
  const provenanceKey = Buffer.alloc(32, suffix.charCodeAt(0));
  const provenanceRef = `AP-${createHmac('sha256', provenanceKey)
    .update(`${inputHash}\0${orderRefHash}\0${PRODUCT.sku}\0final`)
    .digest('hex').slice(0, 16).toUpperCase()}`;
  writeFileSync(join(privateDir, 'canonical-order.json'), JSON.stringify(order, null, 2) + '\n');
  writeFileSync(join(privateDir, 'provenance-key.bin'), provenanceKey);
  writeFileSync(join(privateDir, 'order-control.json'), JSON.stringify({
    schema: 'astroprecise-studio-control-v901',
    orderRefHash,
    product: PRODUCT.sku,
    inputHash,
    provenanceRef,
    paymentEvidenceHash: verified.evidenceHash,
    mode: 'final',
  }, null, 2) + '\n');
  const evidence = captureEvidenceBundle(privateDir, [
    {
      kind: 'buyer-durable-confirmation',
      root: incoming,
      path: source,
      expectedHash: sha256(readFileSync(source)),
    },
    {
      kind: 'payment-receipt',
      root: incoming,
      path: paymentPath,
      expectedHash: sha256(readFileSync(paymentPath)),
    },
  ], { clock: () => CLOCK + 2_000 });
  const artifactPath = join(stage.stagingPath, 'deliverable.zip');
  writeFileSync(artifactPath, `customer bytes ${suffix}`);
  const artifactBytes = readFileSync(artifactPath);
  const fulfilmentManifestPath = join(stage.stagingPath, 'fulfilment-manifest.json');
  writeFileSync(fulfilmentManifestPath, JSON.stringify({
    schema: 'astroprecise-studio-fulfilment-manifest-v901',
    mode: 'final',
    product: 'personal-sky-keepsake',
    inputHash,
    suffix,
    artifacts: [{ file: 'deliverable.zip', bytes: artifactBytes.length, sha256: sha256(artifactBytes) }],
  }) + '\n');
  const fulfilmentManifestHash = sha256(readFileSync(fulfilmentManifestPath));
    recordTransactionReady(privateRoot, reservation.transactionHash, {
      fulfilmentManifestHash,
      evidenceManifestHash: evidence.manifestHash,
    }, { clock: () => CLOCK + 3_000, lockToken: transactionLock.token });
    return { reservation, stage, evidence, fulfilmentManifestHash, order, payment, paymentPath };
  } finally {
    transactionLock.release();
  }
}

function restrictTestRoot(path) {
  if (process.platform === 'win32') {
    execFileSync('icacls.exe', [path, '/inheritance:r', '/grant:r', `${process.env.USERNAME}:(OI)(CI)F`, '/grant:r', 'SYSTEM:(OI)(CI)F'], { stdio: 'pipe' });
  } else {
    chmodSync(path, 0o700);
  }
}

function freshPromotionPayment(prepared, label, {
  observedAt = CLOCK + 3_500,
  verifiedAt = CLOCK + 3_700,
  ...overrides
} = {}) {
  return signedPayment(`${label}-PROMOTION`, prepared.order, {
    transactionId: prepared.payment.transactionId,
    providerObservedAt: new Date(observedAt).toISOString(),
    verifiedAt: new Date(verifiedAt).toISOString(),
    ...overrides,
  });
}

function writePromotionPayment(privateRoot, prepared, label, options = {}) {
  const payment = freshPromotionPayment(prepared, label, options);
  const path = join(privateRoot, 'incoming', `promotion-${label}.json`);
  writeFileSync(path, JSON.stringify(payment, null, 2) + '\n');
  return { payment, path };
}

const temp = mkdtempSync(join(tmpdir(), 'ap-recovery-v902-'));
try {
  const privateRoot = join(temp, 'private');
  mkdirSync(privateRoot, { mode: 0o700 });
  restrictTestRoot(privateRoot);

  const contentionHash = sha256('LOCK-CONTENTION');
  const firstLock = acquireTransactionLock(privateRoot, contentionHash, { clock: () => CLOCK });
  assert.throws(
    () => acquireTransactionLock(privateRoot, contentionHash, { clock: () => CLOCK + 1_000 }),
    /lock|active|already being processed/i,
    'a second writer must not acquire the same live transaction lock',
  );
  firstLock.release();
  const reacquiredLock = acquireTransactionLock(privateRoot, contentionHash, { clock: () => CLOCK + 2_000 });
  reacquiredLock.release();

  const first = prepareReady(privateRoot, 'A');
  assert.equal(readTransactionLedger(privateRoot, first.reservation.transactionHash).state, 'ready');
  const beforeBogusLock = treeInventory(privateRoot);
  assert.throws(
    () => promoteReadyTransaction(privateRoot, first.reservation.transactionHash, {
      clock: () => CLOCK + 4_000,
      lockToken: 'f'.repeat(64),
      paymentEvidence: freshPromotionPayment(first, 'A-BOGUS-LOCK'),
      product: PRODUCT,
      adapterSecret: PAYMENT_SECRET,
    }),
    /lock/i,
    'a fabricated caller token must be rejected before promotion reads or writes durable state',
  );
  assert.deepEqual(
    treeInventory(privateRoot),
    beforeBogusLock,
    'bogus lock rejection must leave receipt, staging, final and event inventory byte-for-byte unchanged',
  );
  assert.throws(
    () => promoteReadyTransaction(privateRoot, first.reservation.transactionHash, { clock: () => CLOCK + 4_000 }),
    /freshly authenticated provider payment evidence/i,
    'a ready transaction cannot promote without a fresh provider re-query',
  );
  assert.throws(
    () => promoteReadyTransaction(privateRoot, first.reservation.transactionHash, {
      clock: () => CLOCK + 4_000,
      paymentEvidence: first.payment,
      product: PRODUCT,
      adapterSecret: PAYMENT_SECRET,
    }),
    /new post-render provider observation|at or after the ready state/i,
    'the pre-render reservation receipt cannot promote a ready final',
  );
  const firstPromotion = freshPromotionPayment(first, 'A');
  const promoted = promoteReadyTransaction(privateRoot, first.reservation.transactionHash, {
    clock: () => CLOCK + 4_000,
    paymentEvidence: firstPromotion,
    product: PRODUCT,
    adapterSecret: PAYMENT_SECRET,
  });
  assert.equal(promoted.ledger.state, 'promoted');
  assert.equal(promoted.recovered, false);
  assert.equal(existsSync(first.stage.stagingPath), false);
  assert.equal(existsSync(promoted.finalPath), true);
  assert.equal(verifyEvidenceBundle(join(promoted.finalPath, '_private')).manifestHash, first.evidence.manifestHash);
  const idempotent = recoverStudioOrder({ root: privateRoot, transactionHash: first.reservation.transactionHash, clock: () => CLOCK + 5_000 });
  assert.equal(idempotent.alreadyPromoted, true, 'a completed transaction may be safely reconciled without a second promotion');
  const receiptPath = join(
    promoted.ledger.transactionDirectory,
    promoted.ledger.latest.details.promotionReceiptObject,
  );
  const receiptBytes = readFileSync(receiptPath, 'utf8');
  const tamperedReceipt = JSON.parse(receiptBytes);
  tamperedReceipt.adapterSignature = '0'.repeat(64);
  chmodSync(receiptPath, 0o600); // simulate a privileged/offline mutation attempt
  writeFileSync(receiptPath, JSON.stringify(tamperedReceipt, null, 2) + '\n');
  assert.throws(
    () => readTransactionLedger(privateRoot, first.reservation.transactionHash),
    /signed-byte integrity|receipt object failed/i,
    'post-promotion adapter-signature tampering must invalidate the HMAC-bound ledger state',
  );
  writeFileSync(receiptPath, receiptBytes);
  chmodSync(receiptPath, 0o400);
  const extraReceiptPath = join(
    promoted.ledger.transactionDirectory,
    `promotion-payment-${'f'.repeat(64)}.json`,
  );
  writeFileSync(extraReceiptPath, '{}\n');
  assert.throws(
    () => readTransactionLedger(privateRoot, first.reservation.transactionHash),
    /unexpected promotion payment receipt|exactly the recorded promotion payment receipt/i,
    'a promoted transaction must reject every extra receipt-shaped ledger object',
  );
  unlinkSync(extraReceiptPath);
  const backwardsLock = acquireTransactionLock(privateRoot, first.reservation.transactionHash, { clock: () => CLOCK + 5_500 });
  try {
    assert.throws(() => recordTransactionReady(privateRoot, first.reservation.transactionHash, {
      fulfilmentManifestHash: first.fulfilmentManifestHash,
      evidenceManifestHash: first.evidence.manifestHash,
    }, { lockToken: backwardsLock.token }), /not in staging|transition/i, 'append-only state cannot move backwards');
  } finally {
    backwardsLock.release();
  }

  const second = prepareReady(privateRoot, 'B');
  renameSync(second.stage.stagingPath, second.stage.finalPath); // simulate crash after atomic rename, before ledger append
  const revokedPromotion = writePromotionPayment(privateRoot, second, 'B-revoked', { revoked: true });
  assert.throws(() => recoverStudioOrder({
    root: privateRoot,
    transactionHash: second.reservation.transactionHash,
    paymentPath: revokedPromotion.path,
    clock: () => CLOCK + 6_000,
  }), /revoked|rejected/i, 'a revocation observed during the crash window must block recovery promotion');
  const secondPromotion = writePromotionPayment(privateRoot, second, 'B-valid', { observedAt: CLOCK + 4_500, verifiedAt: CLOCK + 4_700 });
  const recovered = recoverStudioOrder({
    root: privateRoot,
    transactionHash: second.reservation.transactionHash,
    paymentPath: secondPromotion.path,
    clock: () => CLOCK + 6_000,
  });
  assert.equal(recovered.recovered, true);
  assert.equal(recovered.state, 'promoted');

  const stale = prepareReady(privateRoot, 'C');
  const stalePromotion = writePromotionPayment(privateRoot, stale, 'C-valid');
  assert.throws(() => recoverStudioOrder({
    root: privateRoot,
    transactionHash: stale.reservation.transactionHash,
    paymentPath: stalePromotion.path,
    clock: () => CLOCK + 11 * 60_000,
  }), /stale|re-query/i, 'a delayed recovery must not promote against an old provider-state observation');
  const delayedFreshPromotion = writePromotionPayment(privateRoot, stale, 'C-delayed-fresh', {
    observedAt: CLOCK + 11 * 60_000 - 2_000,
    verifiedAt: CLOCK + 11 * 60_000 - 1_000,
  });
  const delayedRecovered = recoverStudioOrder({
    root: privateRoot,
    transactionHash: stale.reservation.transactionHash,
    paymentPath: delayedFreshPromotion.path,
    clock: () => CLOCK + 11 * 60_000,
  });
  assert.equal(delayedRecovered.state, 'promoted', 'a later fresh provider re-query must recover an older hash-valid READY order');

  const promotionCrash = prepareReady(privateRoot, 'E');
  const promotionCrashPayment = freshPromotionPayment(promotionCrash, 'E-FAULTS');
  const crashAt = (expected) => (boundary) => {
    if (boundary === expected) throw new Error(`SIMULATED CRASH ${expected}`);
  };
  const promoteCrash = (boundary) => promoteReadyTransaction(privateRoot, promotionCrash.reservation.transactionHash, {
    clock: () => CLOCK + 4_000,
    paymentEvidence: promotionCrashPayment,
    product: PRODUCT,
    adapterSecret: PAYMENT_SECRET,
    fault: crashAt(boundary),
  });
  assert.throws(() => promoteCrash('after-promoting-event'), /SIMULATED CRASH after-promoting-event/);
  let promotionCrashLedger = readTransactionLedger(privateRoot, promotionCrash.reservation.transactionHash);
  assert.equal(promotionCrashLedger.state, 'promoting');
  assert.equal(existsSync(promotionCrash.stage.stagingPath), true);
  assert.equal(existsSync(promotionCrash.stage.finalPath), false);

  assert.throws(() => promoteCrash('after-promotion-receipt-object'), /SIMULATED CRASH after-promotion-receipt-object/);
  promotionCrashLedger = readTransactionLedger(privateRoot, promotionCrash.reservation.transactionHash);
  const promotionReceiptObject = `promotion-payment-${promotionCrashLedger.latest.details.promotionReceiptHash}.json`;
  assert.equal(existsSync(join(promotionCrashLedger.transactionDirectory, promotionReceiptObject)), true);
  assert.equal(promotionCrashLedger.state, 'promoting');

  assert.throws(() => promoteCrash('after-final-tree-rename'), /SIMULATED CRASH after-final-tree-rename/);
  promotionCrashLedger = readTransactionLedger(privateRoot, promotionCrash.reservation.transactionHash);
  assert.equal(promotionCrashLedger.state, 'promoting');
  assert.equal(existsSync(promotionCrash.stage.stagingPath), false);
  assert.equal(existsSync(promotionCrash.stage.finalPath), true);

  assert.throws(() => promoteCrash('after-promoted-event'), /SIMULATED CRASH after-promoted-event/);
  promotionCrashLedger = readTransactionLedger(privateRoot, promotionCrash.reservation.transactionHash);
  assert.equal(promotionCrashLedger.state, 'promoted');
  const promotionCrashReconciled = promoteReadyTransaction(privateRoot, promotionCrash.reservation.transactionHash, {
    clock: () => CLOCK + 5_000,
  });
  assert.equal(promotionCrashReconciled.alreadyPromoted, true, 'every promotion fault boundary must converge idempotently');

  const retryOrder = { orderId: 'ORDER-RETRY', product: PRODUCT.sku, email: 'buyer-retry@example.test' };
  const retryReservationPayment = signedPayment('RETRY', retryOrder);
  const retryReservationVerified = verifyPaymentEvidence(retryOrder, retryReservationPayment, PRODUCT, {
    adapterSecret: PAYMENT_SECRET,
    now: () => CLOCK,
    requireAuthenticatedProviderFields: true,
  });
  const retryTransactionHash = paymentTransactionHash('gumroad', retryReservationPayment.transactionId);
  const retryLock = acquireTransactionLock(privateRoot, retryTransactionHash, { clock: () => CLOCK });
  let retryReservation;
  let failedStage;
  try {
    retryReservation = reservePaymentTransaction(privateRoot, {
      provider: 'gumroad',
      transactionId: retryReservationPayment.transactionId,
      orderRefHash: sha256(retryOrder.orderId).slice(0, 16),
      product: PRODUCT.sku,
      paymentIdentityHash: retryReservationVerified.identityHash,
      reservationEvidenceHash: retryReservationVerified.evidenceHash,
      reservationNonceHash: sha256(retryReservationPayment.verificationNonce),
      reservationReceipt: canonicalSignedPaymentReceipt(retryReservationPayment),
    }, { clock: () => CLOCK, lockToken: retryLock.token });
    failedStage = createTransactionStaging(privateRoot, retryReservation.transactionHash, {
      clock: () => CLOCK - 1_000,
      lockToken: retryLock.token,
    });
    assert.equal(
      failedStage.ledger.latest.recordedAt,
      new Date(CLOCK).toISOString(),
      'a backwards wall clock must clamp the new event to the prior durable timestamp',
    );
    writeFileSync(join(failedStage.stagingPath, 'partial-render.bin'), 'partial paid output');
  const retryPayment = signedPayment('RETRY-QUERY', retryOrder, {
    transactionId: retryReservationPayment.transactionId,
    providerObservedAt: new Date(CLOCK + 2_000).toISOString(),
    verifiedAt: new Date(CLOCK + 2_500).toISOString(),
  });
  const retryVerified = verifyPaymentEvidence(retryOrder, retryPayment, PRODUCT, {
    adapterSecret: PAYMENT_SECRET,
    now: () => CLOCK + 3_000,
    requireAuthenticatedProviderFields: true,
  });
    const retryDetails = {
      orderRefHash: sha256(retryOrder.orderId).slice(0, 16),
      product: PRODUCT.sku,
      paymentIdentityHash: retryVerified.identityHash,
      retryEvidenceHash: retryVerified.evidenceHash,
      retryNonceHash: sha256(retryPayment.verificationNonce),
      providerObservedAt: retryPayment.providerObservedAt,
      retryReceipt: canonicalSignedPaymentReceipt(retryPayment),
    };
    const retryCrash = (boundary) => retryTransactionStaging(
      privateRoot,
      retryReservation.transactionHash,
      retryDetails,
      { clock: () => CLOCK + 3_000, lockToken: retryLock.token, fault: crashAt(boundary) },
    );
    assert.throws(() => retryCrash('after-retrying-event'), /SIMULATED CRASH after-retrying-event/);
    assert.equal(readTransactionLedger(privateRoot, retryReservation.transactionHash).state, 'retrying');
    assert.equal(existsSync(failedStage.stagingPath), true);

    assert.throws(() => retryCrash('after-failed-tree-rename'), /SIMULATED CRASH after-failed-tree-rename/);
    let retryLedger = readTransactionLedger(privateRoot, retryReservation.transactionHash);
    const retrying = retryLedger.latest.details;
    const retryQuarantinePath = join(privateRoot, retrying.quarantinePath);
    assert.equal(existsSync(failedStage.stagingPath), false);
    assert.equal(readFileSync(join(retryQuarantinePath, 'partial-render.bin'), 'utf8'), 'partial paid output');

    assert.throws(() => retryCrash('after-clean-staging-create'), /SIMULATED CRASH after-clean-staging-create/);
    assert.equal(existsSync(failedStage.stagingPath), true);
    assert.equal(readdirSync(failedStage.stagingPath).length, 0, 'resumed retry must create only an empty ACL-hardened staging tree');

    assert.throws(() => retryCrash('after-replacement-staging-event'), /SIMULATED CRASH after-replacement-staging-event/);
    retryLedger = readTransactionLedger(privateRoot, retryReservation.transactionHash);
    assert.equal(retryLedger.state, 'staging');
    assert.equal(readdirSync(failedStage.stagingPath).length, 0, 'authenticated retry must converge on a clean staging tree');
  } finally {
    retryLock.release();
  }

  const privateTamper = prepareReady(privateRoot, 'D');
  const privateOrderPath = join(privateTamper.stage.stagingPath, '_private', 'canonical-order.json');
  const alteredPrivateOrder = JSON.parse(readFileSync(privateOrderPath, 'utf8'));
  alteredPrivateOrder.email = 'redirected@example.test';
  writeFileSync(privateOrderPath, JSON.stringify(alteredPrivateOrder, null, 2) + '\n');
  assert.throws(
    () => promoteReadyTransaction(privateRoot, privateTamper.reservation.transactionHash, {
      clock: () => CLOCK + 4_000,
      paymentEvidence: freshPromotionPayment(privateTamper, 'D'),
      product: PRODUCT,
      adapterSecret: PAYMENT_SECRET,
    }),
    /tree hash|canonical order|private order-control/i,
    'post-READY private order mutation must block promotion even when customer bytes are unchanged',
  );

  const evidenceObject = join(recovered.finalPath, '_private', 'evidence', second.evidence.manifest.records[0].object);
  chmodSync(evidenceObject, 0o600); // simulate a privileged/offline mutation attempt
  writeFileSync(evidenceObject, 'tampered');
  assert.throws(() => verifyEvidenceBundle(join(recovered.finalPath, '_private')), /integrity/i, 'content-addressed evidence must detect later mutation');
  assert.throws(() => promoteReadyTransaction(privateRoot, second.reservation.transactionHash), /integrity|hash/i, 'recovery must not bless tampered promoted evidence');
} finally {
  rmSync(temp, { recursive: true, force: true });
}

console.log('PASS fulfil recovery: immutable tree/evidence, HMAC ledger, authenticated staging retry and post-ready provider re-query');
