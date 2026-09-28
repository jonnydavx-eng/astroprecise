/**
 * Append-only Studio transaction ledger and crash-safe final promotion.
 *
 * A transaction directory is created atomically and is never removed. Each
 * state is a separately-created, hash-chained event; replaying a provider
 * transaction therefore fails even after an interrupted render.
 */
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmdirSync,
  statSync,
  unlinkSync,
} from 'node:fs';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { hostname } from 'node:os';
import { basename, join, relative, resolve } from 'node:path';
import {
  assertNoReparsePath,
  assertTreeHasNoReparsePoints,
  ensureContainedDirectory,
  resolveContainedPath,
  writeNewFileSync,
} from './fulfil-security.mjs';
import { verifyEvidenceBundle } from './fulfil-evidence.mjs';
import {
  canonicalPaymentEvidence,
  canonicalPaymentIdentity,
  canonicalSignedPaymentReceipt,
  verifyPaymentEvidence,
} from './fulfil-shared.mjs';

export const LEDGER_SCHEMA = 'astroprecise-studio-ledger-v902';
const EVENT_SCHEMA = 'astroprecise-studio-ledger-event-v902';
const TRANSITIONS = Object.freeze({
  null: ['reserved'],
  reserved: ['staging'],
  staging: ['ready', 'retrying'],
  retrying: ['staging'],
  ready: ['promoting'],
  promoting: ['promoted'],
  promoted: [],
});

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

function ledgerKey(value = process.env.AP_STUDIO_LEDGER_SECRET) {
  const text = String(value || '').trim();
  if (!/^(?:[a-f0-9]{2}){32,64}$/i.test(text)) {
    throw new Error('AP_STUDIO_LEDGER_SECRET must be a private 32-64 byte hexadecimal HMAC key');
  }
  return Buffer.from(text, 'hex');
}

function eventMac(event, key) {
  return createHmac('sha256', key).update(JSON.stringify(event)).digest('hex');
}

function nowIso(clock = Date.now) {
  const raw = typeof clock === 'function' ? clock() : clock?.now ? clock.now() : clock;
  const value = raw instanceof Date ? raw.getTime() : Number(raw);
  if (!Number.isFinite(value)) throw new Error('Ledger clock did not return a finite time');
  return new Date(value).toISOString();
}

function assertHash(value, length, label) {
  const text = String(value || '').toLowerCase();
  if (!new RegExp(`^[a-f0-9]{${length}}$`).test(text)) throw new Error(`${label} must be a ${length}-hex digest`);
  return text;
}

function assertOnlyKeys(value, allowed, label) {
  const unexpected = Object.keys(value || {}).filter((key) => !allowed.includes(key));
  if (unexpected.length) throw new Error(`${label} contains unsupported fields`);
}

function normaliseSignedReceipt(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object`);
  const receipt = canonicalSignedPaymentReceipt(value);
  assertOnlyKeys(value, Object.keys(receipt), label);
  if (!/^[a-f0-9]{64}$/.test(receipt.adapterSignature)) throw new Error(`${label} adapter signature is invalid`);
  const bytes = `${JSON.stringify(receipt, null, 2)}\n`;
  return {
    receipt,
    receiptHash: sha256(bytes),
    evidenceHash: sha256(JSON.stringify(canonicalPaymentEvidence(receipt))),
    identityHash: sha256(JSON.stringify(canonicalPaymentIdentity(receipt))),
    nonceHash: sha256(String(receipt.verificationNonce || '')),
  };
}

function transactionDirectory(privateRoot, transactionHash) {
  const hash = assertHash(transactionHash, 64, 'transactionHash');
  return join(privateRoot, '_transaction-ledger', 'transactions', `tx-${hash}`);
}

const LOCK_SCHEMA = 'astroprecise-studio-transaction-lock-v902';

function canonicalLockOwner(value) {
  return {
    schema: String(value?.schema || ''),
    transactionHash: assertHash(value?.transactionHash, 64, 'Lock transactionHash'),
    machine: String(value?.machine || ''),
    pid: Number(value?.pid),
    processStartFingerprint: String(value?.processStartFingerprint || ''),
    createdAt: String(value?.createdAt || ''),
    token: assertHash(value?.token, 64, 'Lock token'),
  };
}

function readProcessStartFingerprint(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 0) return null;
  if (process.platform === 'win32') {
    const powershell = join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
    const command = `$p=Get-Process -Id ${pid} -ErrorAction SilentlyContinue; if ($null -ne $p) { $p.StartTime.ToUniversalTime().Ticks.ToString() }`;
    const result = spawnSync(powershell, ['-NoProfile', '-NonInteractive', '-Command', command], {
      encoding: 'utf8',
      timeout: 5_000,
      windowsHide: true,
    });
    const ticks = String(result.stdout || '').trim();
    return result.status === 0 && /^\d{12,20}$/.test(ticks) ? `win32-start-ticks:${ticks}` : null;
  }
  if (process.platform === 'linux') {
    try {
      const stat = readFileSync(`/proc/${pid}/stat`, 'utf8');
      const fields = stat.slice(stat.lastIndexOf(')') + 2).trim().split(/\s+/);
      const startTicks = fields[19];
      return /^\d+$/.test(startTicks || '') ? `linux-proc-start-ticks:${startTicks}` : null;
    } catch {
      return null;
    }
  }
  const result = spawnSync('ps', ['-o', 'lstart=', '-p', String(pid)], { encoding: 'utf8', timeout: 5_000 });
  const started = String(result.stdout || '').trim().replace(/\s+/g, ' ');
  return result.status === 0 && started ? `ps-lstart:${started}` : null;
}

const LOCAL_PROCESS_START_FINGERPRINT = readProcessStartFingerprint(process.pid);
if (!LOCAL_PROCESS_START_FINGERPRINT) {
  throw new Error('Cannot establish the fulfilment process-start fingerprint');
}

function lockOwnerMac(owner, integrityKey) {
  return createHmac('sha256', ledgerKey(integrityKey)).update(JSON.stringify(owner)).digest('hex');
}

function transactionLockPath(privateRoot, transactionHash) {
  const locksRoot = ensureContainedDirectory(privateRoot, '_transaction-ledger/locks', { label: 'Transaction locks' });
  return join(locksRoot, `tx-${assertHash(transactionHash, 64, 'transactionHash')}.lock`);
}

function readTransactionLock(privateRoot, transactionHash, { integrityKey = process.env.AP_STUDIO_LEDGER_SECRET } = {}) {
  const lockPath = resolveContainedPath(privateRoot, transactionLockPath(privateRoot, transactionHash), {
    label: 'Transaction lock', mustExist: true, kind: 'directory',
  });
  const names = readdirSync(lockPath).sort();
  if (names.length !== 1 || names[0] !== 'owner.json') throw new Error('Transaction lock inventory is invalid');
  const ownerPath = resolveContainedPath(lockPath, 'owner.json', {
    label: 'Transaction lock owner', mustExist: true, kind: 'file',
  });
  const stored = JSON.parse(readFileSync(ownerPath, 'utf8'));
  assertOnlyKeys(stored, ['schema', 'transactionHash', 'machine', 'pid', 'processStartFingerprint', 'createdAt', 'token', 'ownerMac'], 'Transaction lock owner');
  const owner = canonicalLockOwner(stored);
  if (owner.schema !== LOCK_SCHEMA || owner.transactionHash !== transactionHash || !owner.machine ||
      !Number.isSafeInteger(owner.pid) || owner.pid <= 0 ||
      !/^[A-Za-z0-9_.:-]{8,160}$/.test(owner.processStartFingerprint)) {
    throw new Error('Transaction lock owner identity is invalid');
  }
  const createdAt = Date.parse(owner.createdAt);
  if (!Number.isFinite(createdAt) || new Date(createdAt).toISOString() !== owner.createdAt) {
    throw new Error('Transaction lock timestamp is invalid');
  }
  const expectedMac = lockOwnerMac(owner, integrityKey);
  const receivedMac = String(stored.ownerMac || '');
  if (!/^[a-f0-9]{64}$/.test(receivedMac) ||
      !timingSafeEqual(Buffer.from(receivedMac, 'hex'), Buffer.from(expectedMac, 'hex'))) {
    throw new Error('Transaction lock owner HMAC is invalid');
  }
  return { lockPath, ownerPath, owner };
}

function localProcessIsAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error?.code === 'ESRCH') return false;
    return true;
  }
}

function localProcessMatchesOwner(owner) {
  if (!localProcessIsAlive(owner.pid)) return false;
  const actual = owner.pid === process.pid
    ? LOCAL_PROCESS_START_FINGERPRINT
    : readProcessStartFingerprint(owner.pid);
  // An unavailable start time is not authority to take over a possibly-live
  // process. A different proved start time is safe evidence of PID reuse.
  return actual == null || actual === owner.processStartFingerprint;
}

/**
 * Acquire a stable per-transaction mutex outside the renamable staging tree.
 * A dead local owner's lock is preserved under _stale-locks before takeover;
 * cross-machine or unverifiable ownership always fails closed.
 */
export function acquireTransactionLock(privateRoot, transactionHash, {
  clock = Date.now,
  integrityKey = process.env.AP_STUDIO_LEDGER_SECRET,
} = {}) {
  transactionHash = assertHash(transactionHash, 64, 'transactionHash');
  const lockPath = transactionLockPath(privateRoot, transactionHash);
  const candidatesRoot = ensureContainedDirectory(privateRoot, '_transaction-ledger/_lock-candidates', { label: 'Transaction lock candidates' });
  const staleRoot = ensureContainedDirectory(privateRoot, '_transaction-ledger/_stale-locks', { label: 'Stale transaction locks' });
  const releasedRoot = ensureContainedDirectory(privateRoot, '_transaction-ledger/_released-locks', { label: 'Released transaction locks' });
  const token = randomBytes(32).toString('hex');
  const candidatePath = join(candidatesRoot, `tx-${transactionHash}-${token}`);
  mkdirSync(candidatePath, { mode: 0o700 });
  const owner = canonicalLockOwner({
    schema: LOCK_SCHEMA,
    transactionHash,
    machine: hostname(),
    pid: process.pid,
    processStartFingerprint: LOCAL_PROCESS_START_FINGERPRINT,
    createdAt: nowIso(clock),
    token,
  });
  writeNewFileSync(join(candidatePath, 'owner.json'), `${JSON.stringify({
    ...owner,
    ownerMac: lockOwnerMac(owner, integrityKey),
  }, null, 2)}\n`, { label: 'Transaction lock owner' });

  let candidateConsumed = false;
  try {
    for (;;) {
      try {
        renameSync(candidatePath, lockPath);
        candidateConsumed = true;
        break;
      } catch (error) {
        if (!['EEXIST', 'ENOTEMPTY', 'EPERM', 'EACCES'].includes(error?.code)) throw error;
        const existing = readTransactionLock(privateRoot, transactionHash, { integrityKey });
        if (existing.owner.machine !== hostname() || localProcessMatchesOwner(existing.owner)) {
          throw new Error(`Transaction is already being processed by ${existing.owner.machine} pid ${existing.owner.pid}`);
        }
        const staleId = sha256(JSON.stringify(existing.owner)).slice(0, 32);
        const stalePath = join(staleRoot, `stale-${staleId}`);
        renameSync(existing.lockPath, stalePath);
      }
    }
  } finally {
    if (!candidateConsumed && existsSync(candidatePath)) {
      try { unlinkSync(join(candidatePath, 'owner.json')); } catch { /* candidate remains as fail-closed evidence */ }
      try { rmdirSync(candidatePath); } catch { /* candidate remains as fail-closed evidence */ }
    }
  }

  let released = false;
  return {
    transactionHash,
    token,
    lockPath,
    release() {
      if (released) return;
      const current = readTransactionLock(privateRoot, transactionHash, { integrityKey });
      if (current.owner.token !== token || current.owner.pid !== process.pid || current.owner.machine !== hostname()) {
        throw new Error('Transaction lock ownership changed; refusing to release another process lock');
      }
      if (current.owner.processStartFingerprint !== LOCAL_PROCESS_START_FINGERPRINT) {
        throw new Error('Transaction lock process identity changed; refusing to release another process lock');
      }
      // The directory rename is the release linearisation point. The signed
      // owner remains intact, so a crash cannot leave an empty canonical lock.
      const releasedId = sha256(JSON.stringify(current.owner)).slice(0, 32);
      const releasedPath = join(releasedRoot, `released-${releasedId}`);
      renameSync(current.lockPath, releasedPath);
      released = true;
    },
  };
}

function assertTransactionLock(privateRoot, transactionHash, lockToken, {
  integrityKey = process.env.AP_STUDIO_LEDGER_SECRET,
} = {}) {
  const current = readTransactionLock(privateRoot, transactionHash, { integrityKey });
  const token = assertHash(lockToken, 64, 'Transaction lock token');
  if (current.owner.token !== token || current.owner.pid !== process.pid || current.owner.machine !== hostname() ||
      current.owner.processStartFingerprint !== LOCAL_PROCESS_START_FINGERPRINT) {
    throw new Error('A matching live transaction lock is required for this ledger mutation');
  }
  return current;
}

function canonicalEvent(event) {
  return {
    schema: EVENT_SCHEMA,
    sequence: event.sequence,
    transactionHash: event.transactionHash,
    state: event.state,
    recordedAt: event.recordedAt,
    previousEventHash: event.previousEventHash,
    details: event.details,
  };
}

function normalisePrivateRelativePath(path, label) {
  const text = String(path || '').replace(/\\/g, '/');
  if (!text || text.startsWith('/') || /^[A-Za-z]:/.test(text) || text.split('/').some((part) => !part || part === '.' || part === '..')) {
    throw new Error(`${label} must be a safe private-root-relative path`);
  }
  return text;
}

function normaliseDetails(state, details = {}) {
  if (!details || typeof details !== 'object' || Array.isArray(details)) throw new Error('Ledger event details must be an object');
  if (state === 'reserved') {
    assertOnlyKeys(details, ['orderRefHash', 'product', 'paymentIdentityHash', 'reservationEvidenceHash', 'reservationNonceHash', 'reservationReceiptHash', 'reservationReceipt'], 'Reserved ledger details');
    const product = String(details.product || '').trim();
    if (!['natal-sky-print-pack', 'personal-sky-keepsake', 'whole-sky-edition'].includes(product)) throw new Error('Ledger product is not an approved Studio SKU');
    const signed = normaliseSignedReceipt(details.reservationReceipt, 'Reservation payment receipt');
    const paymentIdentityHash = assertHash(details.paymentIdentityHash, 64, 'paymentIdentityHash');
    const reservationEvidenceHash = assertHash(details.reservationEvidenceHash, 64, 'reservationEvidenceHash');
    const reservationNonceHash = assertHash(details.reservationNonceHash, 64, 'reservationNonceHash');
    const reservationReceiptHash = assertHash(details.reservationReceiptHash, 64, 'reservationReceiptHash');
    if (signed.identityHash !== paymentIdentityHash || signed.evidenceHash !== reservationEvidenceHash ||
        signed.nonceHash !== reservationNonceHash || signed.receiptHash !== reservationReceiptHash) {
      throw new Error('Reservation payment receipt bindings are inconsistent');
    }
    return {
      orderRefHash: assertHash(details.orderRefHash, 16, 'orderRefHash'),
      product,
      paymentIdentityHash,
      reservationEvidenceHash,
      reservationNonceHash,
      reservationReceiptHash,
      reservationReceipt: signed.receipt,
    };
  }
  if (state === 'staging') {
    assertOnlyKeys(details, ['stagingPath', 'finalPath', 'authorisingEventSequence', 'authorisingEvidenceHash', 'authorisingNonceHash', 'providerObservedAt'], 'Staging ledger details');
    const providerObservedAt = Date.parse(details.providerObservedAt);
    if (!Number.isSafeInteger(details.authorisingEventSequence) || details.authorisingEventSequence <= 0 ||
        !Number.isFinite(providerObservedAt) || new Date(providerObservedAt).toISOString() !== details.providerObservedAt) {
      throw new Error('Staging authorisation metadata is invalid');
    }
    return {
      stagingPath: normalisePrivateRelativePath(details.stagingPath, 'stagingPath'),
      finalPath: normalisePrivateRelativePath(details.finalPath, 'finalPath'),
      authorisingEventSequence: details.authorisingEventSequence,
      authorisingEvidenceHash: assertHash(details.authorisingEvidenceHash, 64, 'authorisingEvidenceHash'),
      authorisingNonceHash: assertHash(details.authorisingNonceHash, 64, 'authorisingNonceHash'),
      providerObservedAt: details.providerObservedAt,
    };
  }
  if (state === 'ready') {
    assertOnlyKeys(details, ['finalPath', 'fulfilmentManifestHash', 'evidenceManifestHash', 'fulfilmentTreeHash', 'authorisingEventSequence', 'authorisingEvidenceHash'], 'ready ledger details');
    if (!Number.isSafeInteger(details.authorisingEventSequence) || details.authorisingEventSequence <= 0) {
      throw new Error('ready authorisingEventSequence is invalid');
    }
    return {
      finalPath: normalisePrivateRelativePath(details.finalPath, 'finalPath'),
      fulfilmentManifestHash: assertHash(details.fulfilmentManifestHash, 64, 'fulfilmentManifestHash'),
      evidenceManifestHash: assertHash(details.evidenceManifestHash, 64, 'evidenceManifestHash'),
      fulfilmentTreeHash: assertHash(details.fulfilmentTreeHash, 64, 'fulfilmentTreeHash'),
      authorisingEventSequence: details.authorisingEventSequence,
      authorisingEvidenceHash: assertHash(details.authorisingEvidenceHash, 64, 'authorisingEvidenceHash'),
    };
  }
  if (state === 'retrying') {
    assertOnlyKeys(details, ['stagingPath', 'finalPath', 'quarantinePath', 'paymentIdentityHash', 'retryEvidenceHash', 'retryNonceHash', 'providerObservedAt', 'retryReceiptHash', 'retryReceipt'], 'retrying ledger details');
    const providerObservedAt = Date.parse(details.providerObservedAt);
    if (!Number.isFinite(providerObservedAt) || new Date(providerObservedAt).toISOString() !== details.providerObservedAt) {
      throw new Error('retrying providerObservedAt must be a canonical UTC timestamp');
    }
    const signed = normaliseSignedReceipt(details.retryReceipt, 'Retry payment receipt');
    const paymentIdentityHash = assertHash(details.paymentIdentityHash, 64, 'paymentIdentityHash');
    const retryEvidenceHash = assertHash(details.retryEvidenceHash, 64, 'retryEvidenceHash');
    const retryNonceHash = assertHash(details.retryNonceHash, 64, 'retryNonceHash');
    const retryReceiptHash = assertHash(details.retryReceiptHash, 64, 'retryReceiptHash');
    if (signed.identityHash !== paymentIdentityHash || signed.evidenceHash !== retryEvidenceHash ||
        signed.nonceHash !== retryNonceHash || signed.receiptHash !== retryReceiptHash ||
        signed.receipt.providerObservedAt !== details.providerObservedAt) {
      throw new Error('Retry payment receipt bindings are inconsistent');
    }
    return {
      stagingPath: normalisePrivateRelativePath(details.stagingPath, 'stagingPath'),
      finalPath: normalisePrivateRelativePath(details.finalPath, 'finalPath'),
      quarantinePath: normalisePrivateRelativePath(details.quarantinePath, 'quarantinePath'),
      paymentIdentityHash,
      retryEvidenceHash,
      retryNonceHash,
      providerObservedAt: details.providerObservedAt,
      retryReceiptHash,
      retryReceipt: signed.receipt,
    };
  }
  if (state === 'promoting') {
    assertOnlyKeys(details, ['finalPath', 'fulfilmentManifestHash', 'evidenceManifestHash', 'fulfilmentTreeHash', 'promotionEvidenceHash', 'promotionIdentityHash', 'promotionNonceHash', 'providerObservedAt', 'promotionReceiptHash', 'promotionReceipt'], 'promoting ledger details');
    const providerObservedAt = Date.parse(details.providerObservedAt);
    if (!Number.isFinite(providerObservedAt) || new Date(providerObservedAt).toISOString() !== details.providerObservedAt) {
      throw new Error('promoting providerObservedAt must be a canonical UTC timestamp');
    }
    const signed = normaliseSignedReceipt(details.promotionReceipt, 'Promotion payment receipt');
    const promotionEvidenceHash = assertHash(details.promotionEvidenceHash, 64, 'promotionEvidenceHash');
    const promotionIdentityHash = assertHash(details.promotionIdentityHash, 64, 'promotionIdentityHash');
    const promotionNonceHash = assertHash(details.promotionNonceHash, 64, 'promotionNonceHash');
    const promotionReceiptHash = assertHash(details.promotionReceiptHash, 64, 'promotionReceiptHash');
    if (signed.evidenceHash !== promotionEvidenceHash || signed.identityHash !== promotionIdentityHash ||
        signed.nonceHash !== promotionNonceHash || signed.receiptHash !== promotionReceiptHash ||
        signed.receipt.providerObservedAt !== details.providerObservedAt) {
      throw new Error('Promotion payment receipt bindings are inconsistent');
    }
    return {
      finalPath: normalisePrivateRelativePath(details.finalPath, 'finalPath'),
      fulfilmentManifestHash: assertHash(details.fulfilmentManifestHash, 64, 'fulfilmentManifestHash'),
      evidenceManifestHash: assertHash(details.evidenceManifestHash, 64, 'evidenceManifestHash'),
      fulfilmentTreeHash: assertHash(details.fulfilmentTreeHash, 64, 'fulfilmentTreeHash'),
      promotionEvidenceHash,
      promotionIdentityHash,
      promotionNonceHash,
      providerObservedAt: details.providerObservedAt,
      promotionReceiptHash,
      promotionReceipt: signed.receipt,
    };
  }
  if (state === 'promoted') {
    assertOnlyKeys(details, ['finalPath', 'fulfilmentManifestHash', 'evidenceManifestHash', 'promotionEvidenceHash', 'promotionIdentityHash', 'promotionNonceHash', 'providerObservedAt', 'promotionReceiptHash', 'promotionReceiptObject', 'promotingEventHash'], 'promoted ledger details');
    const providerObservedAt = Date.parse(details.providerObservedAt);
    if (!Number.isFinite(providerObservedAt) || new Date(providerObservedAt).toISOString() !== details.providerObservedAt) {
      throw new Error('providerObservedAt must be a canonical UTC timestamp');
    }
    const promotionEvidenceHash = assertHash(details.promotionEvidenceHash, 64, 'promotionEvidenceHash');
    const promotionReceiptHash = assertHash(details.promotionReceiptHash, 64, 'promotionReceiptHash');
    const promotionReceiptObject = String(details.promotionReceiptObject || '');
    if (promotionReceiptObject !== `promotion-payment-${promotionReceiptHash}.json`) {
      throw new Error('promotionReceiptObject must be content addressed by promotionReceiptHash');
    }
    return {
      finalPath: normalisePrivateRelativePath(details.finalPath, 'finalPath'),
      fulfilmentManifestHash: assertHash(details.fulfilmentManifestHash, 64, 'fulfilmentManifestHash'),
      evidenceManifestHash: assertHash(details.evidenceManifestHash, 64, 'evidenceManifestHash'),
      promotionEvidenceHash,
      promotionIdentityHash: assertHash(details.promotionIdentityHash, 64, 'promotionIdentityHash'),
      promotionNonceHash: assertHash(details.promotionNonceHash, 64, 'promotionNonceHash'),
      providerObservedAt: details.providerObservedAt,
      promotionReceiptHash,
      promotionReceiptObject,
      promotingEventHash: assertHash(details.promotingEventHash, 64, 'promotingEventHash'),
    };
  }
  throw new Error(`Unsupported ledger state: ${state}`);
}

function eventFileName(sequence, state) {
  return `${String(sequence).padStart(4, '0')}-${state}.json`;
}

export function paymentTransactionHash(provider, transactionId) {
  const providerName = String(provider || '').trim().toLowerCase();
  const id = String(transactionId || '').trim();
  if (!providerName || !id) throw new Error('Provider and transactionId are required for replay protection');
  return sha256(`${providerName}\0${id}`);
}

export function readTransactionLedger(privateRoot, transactionHash, {
  integrityKey = process.env.AP_STUDIO_LEDGER_SECRET,
} = {}) {
  const hash = assertHash(transactionHash, 64, 'transactionHash');
  const key = ledgerKey(integrityKey);
  const txDir = resolveContainedPath(privateRoot, transactionDirectory(privateRoot, hash), {
    label: 'Transaction ledger', mustExist: true, kind: 'directory',
  });
  const allNames = readdirSync(txDir).sort();
  const names = allNames.filter((name) => /^\d{4}-(reserved|staging|retrying|ready|promoting|promoted)\.json$/.test(name));
  const receiptNames = allNames.filter((name) => /^promotion-payment-[a-f0-9]{64}\.json$/.test(name));
  if (names.length + receiptNames.length !== allNames.length) throw new Error('Transaction ledger contains an unexpected entry');
  if (!names.length) throw new Error('Transaction ledger is incomplete; replay remains blocked');
  const events = [];
  let previousState = null;
  let previousEventHash = null;
  let previousRecordedAt = -Infinity;
  for (let index = 0; index < names.length; index++) {
    const expectedSequence = index + 1;
    const eventPath = resolveContainedPath(txDir, names[index], { label: 'Ledger event', mustExist: true, kind: 'file' });
    const event = JSON.parse(readFileSync(eventPath, 'utf8'));
    assertOnlyKeys(event, ['schema', 'sequence', 'transactionHash', 'state', 'recordedAt', 'previousEventHash', 'details', 'eventHash'], 'Ledger event');
    if (event.schema !== EVENT_SCHEMA || event.sequence !== expectedSequence || event.transactionHash !== hash) {
      throw new Error('Transaction ledger event identity is invalid');
    }
    const recordedAt = Date.parse(event.recordedAt);
    if (!Number.isFinite(recordedAt) || new Date(recordedAt).toISOString() !== event.recordedAt) throw new Error('Transaction ledger event timestamp is invalid');
    if (recordedAt < previousRecordedAt) throw new Error('Transaction ledger event timestamps move backwards');
    if (!TRANSITIONS[String(previousState)]?.includes(event.state)) throw new Error('Transaction ledger state transition is invalid');
    if (event.previousEventHash !== previousEventHash) throw new Error('Transaction ledger hash chain is broken');
    const normalisedDetails = normaliseDetails(event.state, event.details);
    const expectedHash = eventMac(canonicalEvent({ ...event, details: normalisedDetails }), key);
    const receivedHash = String(event.eventHash || '');
    if (!/^[a-f0-9]{64}$/.test(receivedHash) ||
        !timingSafeEqual(Buffer.from(receivedHash, 'hex'), Buffer.from(expectedHash, 'hex'))) {
      throw new Error('Transaction ledger event HMAC is invalid');
    }
    if (names[index] !== eventFileName(expectedSequence, event.state)) throw new Error('Transaction ledger event filename is invalid');
    events.push({ ...event, details: normalisedDetails });
    previousState = event.state;
    previousEventHash = event.eventHash;
    previousRecordedAt = recordedAt;
  }
  const reservation = events[0];
  if (reservation.state !== 'reserved' ||
      paymentTransactionHash(reservation.details.reservationReceipt.provider, reservation.details.reservationReceipt.transactionId) !== hash ||
      reservation.details.reservationReceipt.productSku !== reservation.details.product ||
      sha256(String(reservation.details.reservationReceipt.orderId || '')).slice(0, 16) !== reservation.details.orderRefHash) {
    throw new Error('Reservation receipt does not identify the immutable transaction and order');
  }
  for (const event of events) {
    if (event.state === 'retrying') {
      if (event.details.paymentIdentityHash !== reservation.details.paymentIdentityHash ||
          paymentTransactionHash(event.details.retryReceipt.provider, event.details.retryReceipt.transactionId) !== hash ||
          event.details.retryReceipt.productSku !== reservation.details.product ||
          sha256(String(event.details.retryReceipt.orderId || '')).slice(0, 16) !== reservation.details.orderRefHash) {
        throw new Error('Retry receipt does not identify the reserved transaction and order');
      }
    }
    if (event.state === 'staging') {
      const authorising = events.find((candidate) => candidate.sequence === event.details.authorisingEventSequence);
      const expectedEvidenceHash = authorising?.state === 'reserved'
        ? authorising.details.reservationEvidenceHash
        : authorising?.state === 'retrying' ? authorising.details.retryEvidenceHash : null;
      const expectedNonceHash = authorising?.state === 'reserved'
        ? authorising.details.reservationNonceHash
        : authorising?.state === 'retrying' ? authorising.details.retryNonceHash : null;
      const expectedObservedAt = authorising?.state === 'reserved'
        ? authorising.details.reservationReceipt.providerObservedAt
        : authorising?.state === 'retrying' ? authorising.details.providerObservedAt : null;
      if (!authorising || authorising.sequence >= event.sequence || expectedEvidenceHash !== event.details.authorisingEvidenceHash ||
          expectedNonceHash !== event.details.authorisingNonceHash || expectedObservedAt !== event.details.providerObservedAt) {
        throw new Error('Staging event is not bound to its authenticated payment authorisation');
      }
    }
    if (event.state === 'ready') {
      const staging = events.slice(0, event.sequence - 1).reverse().find((candidate) => candidate.state === 'staging');
      if (!staging || staging.sequence !== event.details.authorisingEventSequence ||
          staging.details.authorisingEvidenceHash !== event.details.authorisingEvidenceHash ||
          staging.details.finalPath !== event.details.finalPath) {
        throw new Error('Ready event is not bound to the latest authorised staging attempt');
      }
    }
  }
  const readyEvent = events.find((event) => event.state === 'ready');
  const promoting = events.find((event) => event.state === 'promoting');
  const promoted = events.find((event) => event.state === 'promoted');
  if (promoting) {
    if (!readyEvent || promoting.details.finalPath !== readyEvent.details.finalPath ||
        promoting.details.fulfilmentManifestHash !== readyEvent.details.fulfilmentManifestHash ||
        promoting.details.evidenceManifestHash !== readyEvent.details.evidenceManifestHash ||
        promoting.details.fulfilmentTreeHash !== readyEvent.details.fulfilmentTreeHash ||
        promoting.details.promotionIdentityHash !== reservation.details.paymentIdentityHash ||
        paymentTransactionHash(promoting.details.promotionReceipt.provider, promoting.details.promotionReceipt.transactionId) !== hash) {
      throw new Error('Promoting event is not bound to the ready order and payment reservation');
    }
    const expectedReceiptObject = `promotion-payment-${promoting.details.promotionReceiptHash}.json`;
    if (receiptNames.length > 1 || (receiptNames.length === 1 && receiptNames[0] !== expectedReceiptObject)) {
      throw new Error('Transaction ledger contains an unexpected promotion payment receipt object');
    }
    if (receiptNames.length === 1) {
      const receiptPath = resolveContainedPath(txDir, expectedReceiptObject, {
        label: 'Promotion payment receipt', mustExist: true, kind: 'file',
      });
      const expectedBytes = `${JSON.stringify(promoting.details.promotionReceipt, null, 2)}\n`;
      const receiptBytes = readFileSync(receiptPath, 'utf8');
      if (receiptBytes !== expectedBytes || sha256(receiptBytes) !== promoting.details.promotionReceiptHash) {
        throw new Error('Promotion payment receipt object failed committed signed-byte integrity verification');
      }
    }
  } else if (receiptNames.length) {
    throw new Error('Transaction ledger contains a promotion receipt without a promoting event');
  }
  if (promoted) {
    if (!promoting || promoted.details.promotingEventHash !== promoting.eventHash ||
        promoted.details.finalPath !== promoting.details.finalPath ||
        promoted.details.fulfilmentManifestHash !== promoting.details.fulfilmentManifestHash ||
        promoted.details.evidenceManifestHash !== promoting.details.evidenceManifestHash ||
        promoted.details.promotionEvidenceHash !== promoting.details.promotionEvidenceHash ||
        promoted.details.promotionIdentityHash !== promoting.details.promotionIdentityHash ||
        promoted.details.promotionNonceHash !== promoting.details.promotionNonceHash ||
        promoted.details.providerObservedAt !== promoting.details.providerObservedAt ||
        promoted.details.promotionReceiptHash !== promoting.details.promotionReceiptHash) {
      throw new Error('Promoted event is not bound to the committed promotion event');
    }
    if (receiptNames.length !== 1 || receiptNames[0] !== promoted.details.promotionReceiptObject) {
      throw new Error('Transaction ledger must contain exactly the recorded promotion payment receipt object');
    }
  }
  return {
    schema: LEDGER_SCHEMA,
    transactionHash: hash,
    transactionDirectory: txDir,
    state: previousState,
    events,
    latest: events.at(-1),
  };
}

function appendEvent(privateRoot, transactionHash, state, details, {
  clock = Date.now,
  integrityKey = process.env.AP_STUDIO_LEDGER_SECRET,
  lockToken = null,
} = {}) {
  transactionHash = assertHash(transactionHash, 64, 'transactionHash');
  if (state !== 'reserved') assertTransactionLock(privateRoot, transactionHash, lockToken, { integrityKey });
  const key = ledgerKey(integrityKey);
  const txDir = transactionDirectory(privateRoot, transactionHash);
  const existing = state === 'reserved' ? null : readTransactionLedger(privateRoot, transactionHash, { integrityKey });
  const previousState = existing?.state ?? null;
  if (!TRANSITIONS[String(previousState)]?.includes(state)) {
    throw new Error(`Ledger transition ${previousState || 'none'} -> ${state} is not allowed`);
  }
  const proposedRecordedAt = Date.parse(nowIso(clock));
  const previousRecordedAt = existing ? Date.parse(existing.latest.recordedAt) : -Infinity;
  const recordedAt = new Date(Math.max(proposedRecordedAt, previousRecordedAt)).toISOString();
  const event = canonicalEvent({
    sequence: (existing?.events.length || 0) + 1,
    transactionHash,
    state,
    recordedAt,
    previousEventHash: existing?.latest.eventHash || null,
    details: normaliseDetails(state, details),
  });
  const stored = { ...event, eventHash: eventMac(event, key) };
  const path = join(txDir, eventFileName(event.sequence, state));
  const atomicRoot = ensureContainedDirectory(privateRoot, '_transaction-ledger/_atomic-write-temp', { label: 'Ledger atomic-write staging' });
  writeNewFileSync(path, JSON.stringify(stored, null, 2) + '\n', {
    label: 'Ledger event', tempDirectory: atomicRoot,
  });
  try { chmodSync(path, 0o400); } catch { /* Windows ACLs require separate owner proof. */ }
  return stored;
}

export function reservePaymentTransaction(privateRoot, {
  provider,
  transactionId,
  orderRefHash,
  product,
  paymentIdentityHash,
  reservationEvidenceHash,
  reservationNonceHash,
  reservationReceipt,
}, {
  clock = Date.now,
  integrityKey = process.env.AP_STUDIO_LEDGER_SECRET,
  lockToken = null,
} = {}) {
  const transactionHash = paymentTransactionHash(provider, transactionId);
  assertTransactionLock(privateRoot, transactionHash, lockToken, { integrityKey });
  const transactionsRoot = ensureContainedDirectory(privateRoot, '_transaction-ledger/transactions', { label: 'Transaction ledger' });
  const txDir = transactionDirectory(privateRoot, transactionHash);
  if (existsSync(txDir)) throw new Error('Payment transaction has already been used or reserved for fulfilment');
  const signed = normaliseSignedReceipt(reservationReceipt, 'Reservation payment receipt');
  if (signed.receipt.provider !== String(provider || '').trim().toLowerCase() || signed.receipt.transactionId !== String(transactionId || '').trim()) {
    throw new Error('Reservation payment receipt does not match the requested provider transaction');
  }
  const details = normaliseDetails('reserved', {
    orderRefHash,
    product,
    paymentIdentityHash,
    reservationEvidenceHash,
    reservationNonceHash,
    reservationReceiptHash: signed.receiptHash,
    reservationReceipt: signed.receipt,
  });
  const event = canonicalEvent({
    sequence: 1,
    transactionHash,
    state: 'reserved',
    recordedAt: nowIso(clock),
    previousEventHash: null,
    details,
  });
  const stored = { ...event, eventHash: eventMac(event, ledgerKey(integrityKey)) };
  const candidatesRoot = ensureContainedDirectory(privateRoot, '_transaction-ledger/_reservation-candidates', { label: 'Reservation candidates' });
  const candidatePath = join(candidatesRoot, `tx-${transactionHash}-${randomBytes(32).toString('hex')}`);
  mkdirSync(candidatePath, { mode: 0o700 });
  const candidateEventPath = join(candidatePath, eventFileName(1, 'reserved'));
  try {
    writeNewFileSync(candidateEventPath, `${JSON.stringify(stored, null, 2)}\n`, { label: 'Reservation ledger event' });
    try { chmodSync(candidateEventPath, 0o400); } catch { /* Windows ACLs require separate owner proof. */ }
    renameSync(candidatePath, txDir);
  } catch (error) {
    if (existsSync(txDir)) throw new Error('Payment transaction has already been used or reserved for fulfilment');
    throw new Error(`Payment reservation could not be durably recorded: ${error.message}`);
  }
  assertNoReparsePath(transactionsRoot, { label: 'Transaction ledger root' });
  return readTransactionLedger(privateRoot, transactionHash, { integrityKey });
}

export function createTransactionStaging(privateRoot, transactionHash, {
  clock = Date.now,
  integrityKey = process.env.AP_STUDIO_LEDGER_SECRET,
  lockToken = null,
} = {}) {
  assertTransactionLock(privateRoot, transactionHash, lockToken, { integrityKey });
  const ledger = readTransactionLedger(privateRoot, transactionHash, { integrityKey });
  if (ledger.state !== 'reserved') throw new Error('Transaction is not reserved for staging');
  const orderRefHash = ledger.events[0].details.orderRefHash;
  const stagingRoot = ensureContainedDirectory(privateRoot, '_staging', { label: 'Fulfilment staging root' });
  const ordersRoot = ensureContainedDirectory(privateRoot, 'orders', { label: 'Fulfilment orders root' });
  const stagingPath = join(stagingRoot, `tx-${transactionHash}`);
  const finalPath = join(ordersRoot, `order-${orderRefHash}`);
  if (existsSync(finalPath)) throw new Error('Final fulfilment already exists; immutable duplicate rejected');
  if (existsSync(stagingPath)) {
    const existing = resolveContainedPath(privateRoot, stagingPath, {
      label: 'Transaction staging directory', mustExist: true, kind: 'directory',
    });
    if (readdirSync(existing).length) throw new Error('Reserved transaction has a non-empty unjournalled staging directory');
  } else {
    mkdirSync(stagingPath, { mode: 0o700 });
  }
  assertNoReparsePath(stagingPath, { label: 'Transaction staging directory' });
  const reservation = ledger.events[0];
  appendEvent(privateRoot, transactionHash, 'staging', {
    stagingPath: relative(privateRoot, stagingPath),
    finalPath: relative(privateRoot, finalPath),
    authorisingEventSequence: reservation.sequence,
    authorisingEvidenceHash: reservation.details.reservationEvidenceHash,
    authorisingNonceHash: reservation.details.reservationNonceHash,
    providerObservedAt: reservation.details.reservationReceipt.providerObservedAt,
  }, { clock, integrityKey, lockToken });
  const stagedLedger = readTransactionLedger(privateRoot, transactionHash, { integrityKey });
  return {
    transactionHash,
    stagingPath,
    finalPath,
    authorisingReceipt: reservation.details.reservationReceipt,
    authorisingEvidenceHash: reservation.details.reservationEvidenceHash,
    authorisingRecordedAt: reservation.recordedAt,
    ledger: stagedLedger,
  };
}

/**
 * Preserve a failed/partial render and open a clean retry attempt only after a
 * fresh authenticated provider observation re-confirms the same reservation.
 */
export function retryTransactionStaging(privateRoot, transactionHash, {
  orderRefHash,
  product,
  paymentIdentityHash,
  retryEvidenceHash,
  retryNonceHash,
  providerObservedAt,
  retryReceipt,
} = {}, {
  clock = Date.now,
  integrityKey = process.env.AP_STUDIO_LEDGER_SECRET,
  lockToken = null,
  fault = null,
} = {}) {
  if (fault != null && typeof fault !== 'function') throw new Error('Retry fault hook must be a function');
  const checkpoint = (name) => { if (fault) fault(name); };
  assertTransactionLock(privateRoot, transactionHash, lockToken, { integrityKey });
  let ledger = readTransactionLedger(privateRoot, transactionHash, { integrityKey });
  const reservation = ledger.events[0].details;
  if (!['staging', 'retrying'].includes(ledger.state)) {
    throw new Error(`Transaction cannot retry rendering from ${ledger.state}`);
  }
  if (ledger.state === 'staging') {
    if (reservation.orderRefHash !== assertHash(orderRefHash, 16, 'orderRefHash') ||
        reservation.product !== product ||
        reservation.paymentIdentityHash !== assertHash(paymentIdentityHash, 64, 'paymentIdentityHash')) {
      throw new Error('Retry payment/order identity does not match the reserved transaction');
    }
    const observed = Date.parse(providerObservedAt);
    if (!Number.isFinite(observed) || new Date(observed).toISOString() !== providerObservedAt) {
      throw new Error('Retry provider observation must be a canonical UTC timestamp');
    }
    const evidenceHash = assertHash(retryEvidenceHash, 64, 'retryEvidenceHash');
    const nonceHash = assertHash(retryNonceHash, 64, 'retryNonceHash');
    const signed = normaliseSignedReceipt(retryReceipt, 'Retry payment receipt');
    if (signed.identityHash !== paymentIdentityHash || signed.evidenceHash !== evidenceHash ||
        signed.nonceHash !== nonceHash || signed.receipt.providerObservedAt !== providerObservedAt) {
      throw new Error('Retry payment receipt does not match its authenticated verification result');
    }
    const previousRetry = [...ledger.events].reverse().find((event) => event.state === 'retrying');
    const previousEvidenceHash = previousRetry?.details.retryEvidenceHash || reservation.reservationEvidenceHash;
    const previousNonceHash = previousRetry?.details.retryNonceHash || reservation.reservationNonceHash;
    if (evidenceHash === previousEvidenceHash || nonceHash === previousNonceHash) {
      throw new Error('Staging retry requires a new authenticated provider receipt and nonce');
    }
    if (observed < Date.parse(ledger.latest.recordedAt)) {
      throw new Error('Staging retry provider observation must follow the failed render attempt');
    }
    const staging = ledger.latest.details;
    const failedRoot = ensureContainedDirectory(privateRoot, '_failed', { label: 'Failed fulfilment archive' });
    const attempt = ledger.events.filter((event) => event.state === 'retrying').length + 1;
    const quarantinePath = join(failedRoot, `tx-${transactionHash}-attempt-${String(attempt).padStart(2, '0')}`);
    if (existsSync(quarantinePath)) throw new Error('Retry quarantine target already exists before its ledger intent');
    appendEvent(privateRoot, transactionHash, 'retrying', {
      stagingPath: staging.stagingPath,
      finalPath: staging.finalPath,
      quarantinePath: relative(privateRoot, quarantinePath),
      paymentIdentityHash,
      retryEvidenceHash: evidenceHash,
      retryNonceHash: nonceHash,
      providerObservedAt,
      retryReceiptHash: signed.receiptHash,
      retryReceipt: signed.receipt,
    }, { clock, integrityKey, lockToken });
    checkpoint('after-retrying-event');
    ledger = readTransactionLedger(privateRoot, transactionHash, { integrityKey });
  }

  // The retrying event is the durable linearisation point. Every operation
  // below is mechanically resumable from that HMAC-bound intent without asking
  // an already authenticated receipt to remain fresh across a crash.
  const retryingEvent = ledger.latest;
  const retrying = retryingEvent.details;
  const stagingPath = resolveContainedPath(privateRoot, retrying.stagingPath, {
    label: 'Retry staging path', mustExist: false,
  });
  const quarantinePath = resolveContainedPath(privateRoot, retrying.quarantinePath, {
    label: 'Retry quarantine path', mustExist: false,
  });
  const stagingExists = existsSync(stagingPath);
  const quarantineExists = existsSync(quarantinePath);
  if (!stagingExists && !quarantineExists) throw new Error('Retry intent has neither failed staging nor preserved quarantine output');
  if (stagingExists && !quarantineExists) {
    renameSync(stagingPath, quarantinePath);
    checkpoint('after-failed-tree-rename');
  } else if (stagingExists && quarantineExists && readdirSync(stagingPath).length) {
    throw new Error('Retry crash state is ambiguous; both failed archive and non-empty staging exist');
  }
  if (!existsSync(stagingPath)) {
    ensureContainedDirectory(privateRoot, retrying.stagingPath, { label: 'Retry staging path' });
  }
  assertNoReparsePath(stagingPath, { label: 'Retry staging path' });
  if (readdirSync(stagingPath).length) throw new Error('Interrupted retry staging path is not empty');
  checkpoint('after-clean-staging-create');
  appendEvent(privateRoot, transactionHash, 'staging', {
    stagingPath: retrying.stagingPath,
    finalPath: retrying.finalPath,
    authorisingEventSequence: retryingEvent.sequence,
    authorisingEvidenceHash: retrying.retryEvidenceHash,
    authorisingNonceHash: retrying.retryNonceHash,
    providerObservedAt: retrying.providerObservedAt,
  }, { clock, integrityKey, lockToken });
  checkpoint('after-replacement-staging-event');
  ledger = readTransactionLedger(privateRoot, transactionHash, { integrityKey });
  return {
    transactionHash,
    stagingPath,
    finalPath: resolveContainedPath(privateRoot, retrying.finalPath, { label: 'Retry final path' }),
    quarantinePath,
    ledger,
    authorisingReceipt: retrying.retryReceipt,
    authorisingEvidenceHash: retrying.retryEvidenceHash,
    authorisingRecordedAt: retryingEvent.recordedAt,
  };
}

/** Resume only an empty, already journalled staging attempt under its lock. */
export function resumeEmptyTransactionStaging(privateRoot, transactionHash, {
  integrityKey = process.env.AP_STUDIO_LEDGER_SECRET,
  lockToken = null,
} = {}) {
  assertTransactionLock(privateRoot, transactionHash, lockToken, { integrityKey });
  const ledger = readTransactionLedger(privateRoot, transactionHash, { integrityKey });
  if (ledger.state !== 'staging') throw new Error('Transaction is not in staging');
  const staging = ledger.latest.details;
  const stagingPath = resolveContainedPath(privateRoot, staging.stagingPath, {
    label: 'Resumable staging path', mustExist: true, kind: 'directory',
  });
  if (readdirSync(stagingPath).length) throw new Error('Existing staging contains partial output and requires a fresh authenticated retry');
  const authorising = ledger.events.find((event) => event.sequence === staging.authorisingEventSequence);
  const authorisingReceipt = authorising.state === 'reserved'
    ? authorising.details.reservationReceipt
    : authorising.details.retryReceipt;
  return {
    transactionHash,
    stagingPath,
    finalPath: resolveContainedPath(privateRoot, staging.finalPath, { label: 'Staging final path' }),
    ledger,
    authorisingReceipt,
    authorisingEvidenceHash: staging.authorisingEvidenceHash,
    authorisingRecordedAt: authorising.recordedAt,
  };
}

function hashFulfilmentTree(directory) {
  const root = assertTreeHasNoReparsePoints(directory, {
    label: 'Fulfilment tree',
    requirePrivateAccess: true,
  });
  const records = [];
  const visit = (current, prefix = '') => {
    for (const entry of readdirSync(current, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name))) {
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      const path = join(current, entry.name);
      if (entry.isDirectory()) {
        records.push({ type: 'directory', path: relativePath });
        visit(path, relativePath);
      } else if (entry.isFile()) {
        const bytes = readFileSync(path);
        records.push({ type: 'file', path: relativePath, bytes: bytes.length, sha256: sha256(bytes) });
      } else {
        throw new Error(`Fulfilment tree contains an unsupported entry: ${relativePath}`);
      }
    }
  };
  visit(root);
  return sha256(JSON.stringify(records));
}

export function recordTransactionReady(privateRoot, transactionHash, {
  fulfilmentManifestHash,
  evidenceManifestHash,
}, {
  clock = Date.now,
  integrityKey = process.env.AP_STUDIO_LEDGER_SECRET,
  lockToken = null,
} = {}) {
  assertTransactionLock(privateRoot, transactionHash, lockToken, { integrityKey });
  const ledger = readTransactionLedger(privateRoot, transactionHash, { integrityKey });
  if (ledger.state !== 'staging') throw new Error('Transaction is not in staging');
  const stagingPath = resolveContainedPath(privateRoot, ledger.latest.details.stagingPath, {
    label: 'Ready fulfilment staging', mustExist: true, kind: 'directory',
  });
  appendEvent(privateRoot, transactionHash, 'ready', {
    finalPath: ledger.latest.details.finalPath,
    fulfilmentManifestHash,
    evidenceManifestHash,
    fulfilmentTreeHash: hashFulfilmentTree(stagingPath),
    authorisingEventSequence: ledger.latest.sequence,
    authorisingEvidenceHash: ledger.latest.details.authorisingEvidenceHash,
  }, { clock, integrityKey, lockToken });
  return readTransactionLedger(privateRoot, transactionHash, { integrityKey });
}

function verifyPromotableDirectory(privateRoot, path, ready, reservation) {
  const directory = resolveContainedPath(privateRoot, path, { label: 'Promotable fulfilment', mustExist: true, kind: 'directory' });
  if (hashFulfilmentTree(directory) !== ready.fulfilmentTreeHash) {
    throw new Error('Ready fulfilment tree hash changed after quality approval');
  }
  const fulfilmentManifest = resolveContainedPath(directory, 'fulfilment-manifest.json', { label: 'Fulfilment manifest', mustExist: true, kind: 'file' });
  const evidenceManifest = resolveContainedPath(directory, '_private/evidence/evidence-manifest.json', { label: 'Evidence manifest', mustExist: true, kind: 'file' });
  const fulfilmentBytes = readFileSync(fulfilmentManifest);
  if (sha256(fulfilmentBytes) !== ready.fulfilmentManifestHash) throw new Error('Ready fulfilment manifest hash does not match the staged output');
  const fulfilment = JSON.parse(fulfilmentBytes.toString('utf8'));
  if (fulfilment.schema !== 'astroprecise-studio-fulfilment-manifest-v901' || fulfilment.mode !== 'final' || fulfilment.product !== reservation.product) {
    throw new Error('Ready fulfilment manifest is not the reserved final Studio product');
  }
  if (!Array.isArray(fulfilment.artifacts) || !fulfilment.artifacts.length) throw new Error('Ready fulfilment manifest has no auditable artifacts');
  const canonicalOrderPath = resolveContainedPath(directory, '_private/canonical-order.json', {
    label: 'Canonical order record', mustExist: true, kind: 'file',
  });
  const controlPath = resolveContainedPath(directory, '_private/order-control.json', {
    label: 'Order control record', mustExist: true, kind: 'file',
  });
  const provenanceKeyPath = resolveContainedPath(directory, '_private/provenance-key.bin', {
    label: 'Provenance key', mustExist: true, kind: 'file',
  });
  const canonicalOrder = JSON.parse(readFileSync(canonicalOrderPath, 'utf8'));
  const inputHash = sha256(JSON.stringify(canonicalOrder));
  const orderRefHash = sha256(String(canonicalOrder.orderId || '')).slice(0, 16);
  const control = JSON.parse(readFileSync(controlPath, 'utf8'));
  const provenanceKey = readFileSync(provenanceKeyPath);
  if (fulfilment.inputHash !== inputHash || canonicalOrder.product !== reservation.product ||
      orderRefHash !== reservation.orderRefHash) {
    throw new Error('Ready canonical order no longer matches the immutable manifest or payment reservation');
  }
  if (control.schema !== 'astroprecise-studio-control-v901' || control.mode !== 'final' ||
      control.product !== reservation.product || control.inputHash !== inputHash ||
      control.orderRefHash !== orderRefHash ||
      control.paymentEvidenceHash !== ready.authorisingEvidenceHash) {
    throw new Error('Ready private order-control record is not bound to the reserved final order');
  }
  if (provenanceKey.length !== 32) throw new Error('Ready private provenance key has an invalid length');
  const expectedProvenanceRef = `AP-${createHmac('sha256', provenanceKey)
    .update(`${inputHash}\0${orderRefHash}\0${reservation.product}\0final`)
    .digest('hex').slice(0, 16).toUpperCase()}`;
  if (control.provenanceRef !== expectedProvenanceRef) {
    throw new Error('Ready private provenance binding is invalid');
  }
  const artifactNames = new Set();
  for (const artifact of fulfilment.artifacts) {
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,191}$/.test(String(artifact.file || '')) ||
        !Number.isInteger(artifact.bytes) || artifact.bytes < 0 ||
        !/^[a-f0-9]{64}$/.test(String(artifact.sha256 || ''))) {
      throw new Error('Ready fulfilment manifest contains an invalid artifact record');
    }
    if (artifactNames.has(artifact.file)) throw new Error('Ready fulfilment manifest contains duplicate artifact names');
    artifactNames.add(artifact.file);
    const artifactPath = resolveContainedPath(directory, artifact.file, { label: 'Fulfilment artifact', mustExist: true, kind: 'file' });
    const artifactBytes = readFileSync(artifactPath);
    if (artifactBytes.length !== artifact.bytes || sha256(artifactBytes) !== artifact.sha256) {
      throw new Error(`Fulfilment artifact integrity failed: ${artifact.file}`);
    }
  }
  if (sha256(readFileSync(evidenceManifest)) !== ready.evidenceManifestHash) throw new Error('Ready evidence manifest hash does not match the staged output');
  const evidence = verifyEvidenceBundle(join(directory, '_private'));
  if (evidence.manifestHash !== ready.evidenceManifestHash) throw new Error('Ready evidence bundle integrity hash does not match the staged output');
  return directory;
}

function assertFreshPromotionPayment(directory, ledger, transactionHash, {
  paymentEvidence,
  product,
  adapterSecret,
  clock,
}) {
  if (!paymentEvidence || typeof paymentEvidence !== 'object' || Array.isArray(paymentEvidence)) {
    throw new Error('Ready promotion requires freshly authenticated provider payment evidence');
  }
  if (!product || typeof product !== 'object' || product.sku !== ledger.events[0].details.product) {
    throw new Error('Ready promotion product does not match the reserved Studio SKU');
  }
  const orderPath = resolveContainedPath(directory, '_private/canonical-order.json', {
    label: 'Canonical promotion order', mustExist: true, kind: 'file',
  });
  const order = JSON.parse(readFileSync(orderPath, 'utf8'));
  const reservation = ledger.events[0].details;
  if (order.product !== reservation.product || sha256(String(order.orderId || '')).slice(0, 16) !== reservation.orderRefHash) {
    throw new Error('Ready promotion order does not match the payment reservation');
  }
  const verified = verifyPaymentEvidence(order, paymentEvidence, product, {
    adapterSecret,
    now: clock,
    requireAuthenticatedProviderFields: true,
  });
  if (!verified.ok) throw new Error(`Ready promotion payment evidence rejected: ${verified.errors.join('; ')}`);
  if (verified.identityHash !== reservation.paymentIdentityHash) {
    throw new Error('Ready promotion payment identity differs from the reserved payment');
  }
  if (verified.evidenceHash === reservation.reservationEvidenceHash) {
    throw new Error('Ready promotion requires a new post-render provider observation, not the reservation receipt');
  }
  const promotionNonceHash = sha256(String(verified.canonical.verificationNonce || ''));
  if (promotionNonceHash === reservation.reservationNonceHash) {
    throw new Error('Ready promotion requires a new adapter verification nonce');
  }
  const readyAt = Date.parse(ledger.latest.recordedAt);
  const providerObservedAt = Date.parse(verified.canonical.providerObservedAt);
  if (!Number.isFinite(providerObservedAt) || providerObservedAt < readyAt) {
    throw new Error('Ready promotion provider observation must be captured at or after the ready state');
  }
  if (paymentTransactionHash(verified.canonical.provider, verified.canonical.transactionId) !== transactionHash) {
    throw new Error('Ready promotion payment transaction does not match the reserved transaction');
  }
  return { verified, promotionNonceHash };
}

function immutableReservationProduct(reservation) {
  const receipt = reservation?.reservationReceipt;
  if (!receipt || receipt.productSku !== reservation.product || receipt.currency !== 'GBP' ||
      !Number.isInteger(receipt.amountMinor) || receipt.amountMinor <= 0) {
    throw new Error('Reservation does not contain a valid immutable product-price snapshot');
  }
  return {
    sku: receipt.productSku,
    currency: receipt.currency,
    priceGbp: receipt.amountMinor / 100,
  };
}

export function promoteReadyTransaction(privateRoot, transactionHash, {
  clock = Date.now,
  paymentEvidence = null,
  product = null,
  adapterSecret = process.env.AP_PAYMENT_ADAPTER_SECRET,
  integrityKey = process.env.AP_STUDIO_LEDGER_SECRET,
  lockToken = null,
  fault = null,
} = {}) {
  if (fault != null && typeof fault !== 'function') throw new Error('Promotion fault hook must be a function');
  const checkpoint = (name) => { if (fault) fault(name); };
  const ownedLock = lockToken ? null : acquireTransactionLock(privateRoot, transactionHash, { clock, integrityKey });
  lockToken ||= ownedLock.token;
  try {
    // A caller-supplied token is untrusted until it has been matched against the
    // signed live lock. Prove ownership before even reading the ledger so no
    // stale or fabricated token can authorize promotion side effects.
    assertTransactionLock(privateRoot, transactionHash, lockToken, { integrityKey });
    let ledger = readTransactionLedger(privateRoot, transactionHash, { integrityKey });
    const reservation = ledger.events[0].details;
    const reservedProduct = immutableReservationProduct(reservation);
    if (product == null) product = reservedProduct;
    const readyEvent = ledger.events.find((event) => event.state === 'ready');
    const ready = readyEvent?.details;
    if (ledger.state === 'promoted') {
      if (!ready) throw new Error('Promoted transaction has no ready-state integrity record');
      const finalPath = verifyPromotableDirectory(privateRoot, ledger.latest.details.finalPath, ready, reservation);
      return { recovered: false, alreadyPromoted: true, finalPath, ledger };
    }
    if (!['ready', 'promoting'].includes(ledger.state)) {
      throw new Error(`Transaction cannot be recovered from ${ledger.state}; only a verified ready or committed promoting output may be promoted`);
    }
    const stagingEvent = [...ledger.events].reverse().find((event) => event.state === 'staging');
    if (!stagingEvent) throw new Error('Transaction ledger has no staging event');
    const staging = stagingEvent.details;
    const stagingPath = resolveContainedPath(privateRoot, staging.stagingPath, { label: 'Promotion staging path', mustExist: false });
    const intendedFinalPath = resolveContainedPath(privateRoot, staging.finalPath, { label: 'Promotion final path', mustExist: false });
    const stageExists = existsSync(stagingPath);
    const finalExists = existsSync(intendedFinalPath);
    if (stageExists === finalExists) {
      throw new Error('Promotion state is ambiguous; expected exactly one of staging or final output');
    }
    const promotableRelativePath = stageExists ? staging.stagingPath : staging.finalPath;
    const promotablePath = verifyPromotableDirectory(privateRoot, promotableRelativePath, ready, reservation);

    if (ledger.state === 'ready') {
      const promotion = assertFreshPromotionPayment(promotablePath, ledger, transactionHash, {
        paymentEvidence,
        product,
        adapterSecret,
        clock,
      });
      const signed = normaliseSignedReceipt(paymentEvidence, 'Promotion payment receipt');
      appendEvent(privateRoot, transactionHash, 'promoting', {
        finalPath: staging.finalPath,
        fulfilmentManifestHash: ready.fulfilmentManifestHash,
        evidenceManifestHash: ready.evidenceManifestHash,
        fulfilmentTreeHash: ready.fulfilmentTreeHash,
        promotionEvidenceHash: promotion.verified.evidenceHash,
        promotionIdentityHash: promotion.verified.identityHash,
        promotionNonceHash: promotion.promotionNonceHash,
        providerObservedAt: promotion.verified.canonical.providerObservedAt,
        promotionReceiptHash: signed.receiptHash,
        promotionReceipt: signed.receipt,
      }, { clock, integrityKey, lockToken });
      checkpoint('after-promoting-event');
      ledger = readTransactionLedger(privateRoot, transactionHash, { integrityKey });
    }

    const promotingEvent = ledger.latest;
    const promoting = promotingEvent.details;
    const canonicalOrderPath = resolveContainedPath(promotablePath, '_private/canonical-order.json', {
      label: 'Committed promotion order', mustExist: true, kind: 'file',
    });
    const canonicalOrder = JSON.parse(readFileSync(canonicalOrderPath, 'utf8'));
    const committedVerification = verifyPaymentEvidence(canonicalOrder, promoting.promotionReceipt, reservedProduct, {
      adapterSecret,
      now: () => Date.parse(promotingEvent.recordedAt),
      requireAuthenticatedProviderFields: true,
    });
    if (!committedVerification.ok || committedVerification.evidenceHash !== promoting.promotionEvidenceHash ||
        committedVerification.identityHash !== promoting.promotionIdentityHash) {
      throw new Error(`Committed promotion receipt failed authentication: ${committedVerification.errors.join('; ')}`);
    }

    const promotionReceiptBytes = `${JSON.stringify(promoting.promotionReceipt, null, 2)}\n`;
    const promotionReceiptObject = `promotion-payment-${promoting.promotionReceiptHash}.json`;
    const promotionReceiptPath = join(ledger.transactionDirectory, promotionReceiptObject);
    if (existsSync(promotionReceiptPath)) {
      if (readFileSync(promotionReceiptPath, 'utf8') !== promotionReceiptBytes) {
        throw new Error('Existing committed promotion payment receipt object is inconsistent');
      }
    } else {
      const atomicRoot = ensureContainedDirectory(privateRoot, '_transaction-ledger/_atomic-write-temp', { label: 'Ledger atomic-write staging' });
      writeNewFileSync(promotionReceiptPath, promotionReceiptBytes, {
        label: 'Promotion payment receipt', tempDirectory: atomicRoot,
      });
      try { chmodSync(promotionReceiptPath, 0o400); } catch { /* Windows ACLs require separate owner proof. */ }
    }
    checkpoint('after-promotion-receipt-object');

    let finalPath;
    let recovered = false;
    if (stageExists && !finalExists) {
      renameSync(promotablePath, intendedFinalPath); // Same private root/filesystem: atomic directory promotion.
      checkpoint('after-final-tree-rename');
      finalPath = verifyPromotableDirectory(privateRoot, staging.finalPath, ready, reservation);
    } else {
      finalPath = promotablePath;
      recovered = true;
    }
    appendEvent(privateRoot, transactionHash, 'promoted', {
      finalPath: staging.finalPath,
      fulfilmentManifestHash: ready.fulfilmentManifestHash,
      evidenceManifestHash: ready.evidenceManifestHash,
      promotionEvidenceHash: promoting.promotionEvidenceHash,
      promotionIdentityHash: promoting.promotionIdentityHash,
      promotionNonceHash: promoting.promotionNonceHash,
      providerObservedAt: promoting.providerObservedAt,
      promotionReceiptHash: promoting.promotionReceiptHash,
      promotionReceiptObject,
      promotingEventHash: promotingEvent.eventHash,
    }, { clock, integrityKey, lockToken });
    checkpoint('after-promoted-event');
    return { recovered, alreadyPromoted: false, finalPath, ledger: readTransactionLedger(privateRoot, transactionHash, { integrityKey }) };
  } finally {
    ownedLock?.release();
  }
}

export function transactionHashFromDirectoryName(value) {
  const match = /^tx-([a-f0-9]{64})$/i.exec(basename(String(value || '')));
  if (!match) throw new Error('Transaction directory name is invalid');
  return match[1].toLowerCase();
}
