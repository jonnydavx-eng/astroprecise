import assert from 'node:assert/strict';
import { createHash, createHmac } from 'node:crypto';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { canonicalPaymentEvidence, canonicalSignedPaymentReceipt, verifyPaymentEvidence } from './tools/fulfil-shared.mjs';
import { acquireTransactionLock, paymentTransactionHash, readTransactionLedger, reservePaymentTransaction } from './tools/fulfil-ledger.mjs';
import { assertGumroadCommissionAdapterReady } from './tools/gumroad-commission-payment-adapter.mjs';

const NOW = Date.parse('2026-08-24T20:00:00.000Z');
const secret = '9'.repeat(64);
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
process.env.AP_STUDIO_LEDGER_SECRET = 'b'.repeat(64);
const order = { orderId: 'ORDER-SECURITY-1', product: 'personal-sky-keepsake', email: 'buyer@example.test' };
const product = { sku: order.product, priceGbp: 29, currency: 'GBP' };

function restrictTestRoot(path) {
  if (process.platform === 'win32') {
    execFileSync('icacls.exe', [path, '/inheritance:r', '/grant:r', `${process.env.USERNAME}:(OI)(CI)F`, '/grant:r', 'SYSTEM:(OI)(CI)F'], { stdio: 'pipe' });
  } else {
    chmodSync(path, 0o700);
  }
}

function signed(overrides = {}) {
  const unsigned = {
    provider: 'gumroad',
    adapterReceiptId: 'ADAPTER-SECURITY-1',
    transactionId: 'GUMROAD-TX-SECURITY-1',
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
    providerRecordHash: '7'.repeat(64),
    providerObservedAt: '2026-08-24T19:59:30.000Z',
    commissionState: 'completed',
    finalChargeState: 'settled',
    verifiedAt: '2026-08-24T19:59:40.000Z',
    verifiedBy: 'gumroad-adapter:test',
    verificationMethod: 'gumroad-authenticated-adapter-v2',
    verificationNonce: '8'.repeat(32),
    ...overrides,
  };
  return {
    ...unsigned,
    adapterSignature: createHmac('sha256', Buffer.from(secret, 'hex'))
      .update(JSON.stringify(canonicalPaymentEvidence(unsigned)))
      .digest('hex'),
  };
}

const verify = (payment, options = {}) => verifyPaymentEvidence(order, payment, product, {
  adapterSecret: secret,
  now: () => NOW,
  requireAuthenticatedProviderFields: true,
  ...options,
});

const valid = signed();
assert.equal(verify(valid).ok, true, 'fresh authenticated paid-in-full evidence should pass');
for (const [field, value] of [['refunded', true], ['disputed', true], ['chargeback', true], ['revoked', true]]) {
  const result = verify(signed({ [field]: value }));
  assert.equal(result.ok, false, `${field} must revoke fulfilment authorisation`);
}
assert.equal(verify(signed({ refundedAmountMinor: 1 })).ok, false);
assert.equal(verify(signed({ finalChargeState: 'pending' })).ok, false);
assert.equal(verify(signed({ commissionState: 'in-progress' })).ok, false);
assert.equal(verify(signed({ providerObservedAt: '2026-08-24T19:30:00.000Z' })).ok, false, 'stale provider state must be re-queried');
assert.equal(verify(signed({ verifiedAt: '2026-08-24T19:30:00.000Z' })).ok, false, 'stale adapter evidence must be re-queried');
assert.equal(verify({ ...valid, amountMinor: 1 }).ok, false, 'mutated evidence must fail its HMAC and price checks');
assert.equal(verify({ ...valid, adapterSignature: '0'.repeat(64) }).ok, false);
assert.equal(verifyPaymentEvidence(order, valid, product, { adapterSecret: secret, now: NOW + 11 * 60_000, requireAuthenticatedProviderFields: true }).ok, false);

const legacy = signed({
  verificationMethod: 'gumroad-authenticated-adapter-v1',
  providerAuthentication: null,
  providerRecordHash: null,
  providerObservedAt: null,
  commissionState: null,
  finalChargeState: null,
  refundedAmountMinor: null,
  disputed: null,
  chargeback: null,
  revoked: null,
  verificationNonce: null,
});
assert.equal(verifyPaymentEvidence(order, legacy, product, { adapterSecret: secret, now: NOW }).ok, true, 'legacy evidence remains test-compatible outside the live boundary');
assert.equal(verify(legacy).ok, false, 'legacy evidence can never authorise live fulfilment');

assert.throws(() => assertGumroadCommissionAdapterReady(), /disabled/i);
const adapterCli = spawnSync(process.execPath, ['tools/gumroad-commission-payment-adapter.mjs'], { cwd: process.cwd(), encoding: 'utf8' });
assert.notEqual(adapterCli.status, 0);
assert.match(`${adapterCli.stdout}${adapterCli.stderr}`, /adapter is disabled/i);

const temp = mkdtempSync(join(tmpdir(), 'ap-payment-ledger-v902-'));
try {
  const privateRoot = join(temp, 'private');
  mkdirSync(privateRoot);
  restrictTestRoot(privateRoot);
  const accepted = verify(valid);
  const transactionHash = paymentTransactionHash(valid.provider, valid.transactionId);
  const transactionLock = acquireTransactionLock(privateRoot, transactionHash, { clock: () => NOW });
  let first;
  try {
    first = reservePaymentTransaction(privateRoot, {
      provider: valid.provider,
      transactionId: valid.transactionId,
      orderRefHash: sha256(order.orderId).slice(0, 16),
      product: order.product,
      paymentIdentityHash: accepted.identityHash,
      reservationEvidenceHash: accepted.evidenceHash,
      reservationNonceHash: sha256(valid.verificationNonce),
      reservationReceipt: canonicalSignedPaymentReceipt(valid),
    }, { clock: () => NOW, lockToken: transactionLock.token });
    assert.equal(first.state, 'reserved');
    assert.equal(readTransactionLedger(privateRoot, first.transactionHash).state, 'reserved');
    assert.throws(() => reservePaymentTransaction(privateRoot, {
      provider: valid.provider,
      transactionId: valid.transactionId,
      orderRefHash: 'b'.repeat(16),
      product: 'whole-sky-edition',
      paymentIdentityHash: accepted.identityHash,
      reservationEvidenceHash: accepted.evidenceHash,
      reservationNonceHash: sha256(valid.verificationNonce),
      reservationReceipt: canonicalSignedPaymentReceipt(valid),
    }, { clock: () => NOW, lockToken: transactionLock.token }), /already been used or reserved/i, 'one provider transaction cannot be replayed for another order');
  } finally {
    transactionLock.release();
  }
  const reservationEventPath = join(first.transactionDirectory, '0001-reserved.json');
  chmodSync(reservationEventPath, 0o600); // simulate a privileged/offline rewrite
  const reservationEvent = JSON.parse(readFileSync(reservationEventPath, 'utf8'));
  reservationEvent.details.orderRefHash = 'c'.repeat(16);
  const forgedEvent = { ...reservationEvent };
  delete forgedEvent.eventHash;
  reservationEvent.eventHash = sha256(JSON.stringify(forgedEvent));
  writeFileSync(reservationEventPath, JSON.stringify(reservationEvent, null, 2) + '\n');
  assert.throws(() => readTransactionLedger(privateRoot, first.transactionHash), /HMAC|hash/i, 'an attacker cannot bless an offline rewrite by recomputing an unkeyed hash');
} finally {
  rmSync(temp, { recursive: true, force: true });
}

console.log('PASS payment evidence: fresh HMAC state, revocation checks, fail-closed adapter and replay guard');
