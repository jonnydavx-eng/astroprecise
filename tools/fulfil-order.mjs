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
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import {
  ROOT, assertWorkMayStart, canonicalizeStudioOrder, parseArgs, sha256, verifyPaymentEvidence,
} from './fulfil-shared.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const CATALOGUE_PATH = join(ROOT, 'website', 'data', 'products-v901.json');
const ALLOWED = new Set(['natal-sky-print-pack', 'personal-sky-keepsake', 'whole-sky-edition']);

function run(script, args, extraEnv = {}) {
  const result = spawnSync(process.execPath, [join(HERE, script), ...args], {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, AP_PRIVATE_FULFILMENT: '1', ...extraEnv },
  });
  if (result.status !== 0) throw new Error(`${script} failed with exit code ${result.status ?? 'unknown'}`);
}

function customerInput(order, sourceOrder) {
  const contractAt = Number.isFinite(Date.parse(sourceOrder.contractAt))
    ? new Date(Date.parse(sourceOrder.contractAt)).toISOString()
    : undefined;
  const earlyStartConsentRecordedAt = Number.isFinite(Date.parse(sourceOrder.earlyStartConsentRecordedAt))
    ? new Date(Date.parse(sourceOrder.earlyStartConsentRecordedAt)).toISOString()
    : null;
  return {
    schema: 'astroprecise-studio-order-v901',
    orderId: order.orderId,
    product: order.product,
    name: order.name,
    place: order.place,
    y: order.y, mo: order.mo, d: order.d, h: order.h, mi: order.mi,
    lat: order.lat, lon: order.lon, tz: order.tz,
    timeAccuracy: order.timeAccuracy,
    house: order.house || 'placidus',
    utc: order.utc,
    contractAt,
    earlyStartConsent: sourceOrder.earlyStartConsent === true,
    earlyStartConsentRecordedAt,
    generatedAt: order.generatedAt,
    sampleMode: order.sampleMode === 'fictional' ? 'fictional' : undefined,
    fulfilmentAuthorization: order.fulfilmentAuthorization,
  };
}

function assertFictionalProof(order) {
  if (order.sampleMode !== 'fictional') return false;
  if (!/^FICTIONAL[-_]/i.test(String(order.orderId || ''))) throw new Error('fictional proof orderId must begin FICTIONAL-');
  if (order.email && !/@example\.test$/i.test(String(order.email))) throw new Error('fictional proofs must use an example.test email');
  const fixture = {
    name: 'Aurora Vale', place: 'Whitby, England',
    y: 1990, mo: 6, d: 14, h: 3, mi: 42,
    lat: 54.486, lon: -0.613, tz: 'Europe/London', timeAccuracy: 'exact', house: 'placidus',
  };
  for (const [key, value] of Object.entries(fixture)) {
    if (order[key] !== value) throw new Error(`fictional proof fixture mismatch: ${key}`);
  }
  return true;
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
  if (args.proof && !assertFictionalProof(sourceOrder)) assertWorkMayStart(sourceOrder);
  let order = canonicalizeStudioOrder(sourceOrder);
  order.product = sourceOrder.product;
  order.orderId = String(sourceOrder.orderId || (args.proof ? 'FICTIONAL-PROOF' : '')).trim();
  if (!order.orderId) throw new Error('orderId is required');
  order.generatedAt = new Date().toISOString();

  let final = false;
  let paymentResult = null;
  let renderCapability = '';
  let transactionLedgerPath = null;
  if (args.payment) {
    assertWorkMayStart(sourceOrder);
    const payment = JSON.parse(readFileSync(resolve(args.payment), 'utf8'));
    paymentResult = verifyPaymentEvidence(sourceOrder, payment, { ...product, currency: catalogue.currency });
    if (!paymentResult.ok) throw new Error(`Payment evidence rejected: ${paymentResult.errors.join('; ')}`);
    const transactionHash = sha256(String(payment.transactionId).trim());
    const ledgerDir = join(ROOT, 'output', 'orders', '_transaction-ledger');
    mkdirSync(ledgerDir, { recursive: true });
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
  const defaultRoot = join(ROOT, 'output', final ? 'orders' : 'proofs');
  const outDir = final ? join(defaultRoot, `order-${refHash}`) : (args.out ? resolve(args.out) : join(defaultRoot, `order-${refHash}`));
  mkdirSync(outDir, { recursive: true });
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
    const generatorOrder = customerInput(order, sourceOrder);
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
        earlyStartConsent: generatorOrder.earlyStartConsent,
        earlyStartConsentRecordedAt: generatorOrder.earlyStartConsentRecordedAt,
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
    if (order.product === 'natal-sky-print-pack' || order.product === 'whole-sky-edition') {
      run('generate-natal-print-pack.mjs', ['--in', privateOrderPath, '--out', outDir], renderEnv);
    }
    if (order.product === 'whole-sky-edition') {
      run('capture-observatory-still.mjs', ['--in', privateOrderPath, '--out', outDir], renderEnv);
    }
    run('package-studio-order.mjs', ['--dir', outDir, '--product', order.product, '--mode', final ? 'final' : 'proof', '--input-hash', inputHash]);
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
