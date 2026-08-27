#!/usr/bin/env node
/** Reconcile or atomically promote a transaction already recorded as ready. */
import { ROOT, STUDIO_SKUS, parseArgs } from './fulfil-shared.mjs';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { assertSecurePrivateRoot, resolveContainedPath } from './fulfil-security.mjs';
import { promoteReadyTransaction, readTransactionLedger } from './fulfil-ledger.mjs';

export function recoverStudioOrder({ root, transactionHash, paymentPath = null, statusOnly = false, clock = Date.now }) {
  const privateRoot = assertSecurePrivateRoot(root, { repositoryRoot: ROOT });
  if (!/^[a-f0-9]{64}$/i.test(String(transactionHash || ''))) throw new Error('transactionHash must be a 64-hex replay-protection digest');
  const hash = String(transactionHash).toLowerCase();
  const ledger = readTransactionLedger(privateRoot, hash);
  if (statusOnly) {
    return { state: ledger.state, transactionHash: hash, finalPath: ledger.latest.details.finalPath || null, statusOnly: true };
  }
  let promotionOptions = { clock };
  if (ledger.state !== 'promoted') {
    const reservation = ledger.events[0].details;
    const receipt = reservation.reservationReceipt;
    const sku = reservation.product;
    if (!STUDIO_SKUS.includes(sku) || receipt?.productSku !== sku || receipt?.currency !== 'GBP' ||
        !Number.isInteger(receipt?.amountMinor) || receipt.amountMinor <= 0) {
      throw new Error('Recovery reservation lacks a supported immutable product-price snapshot');
    }
    promotionOptions = {
      ...promotionOptions,
      product: { sku, currency: receipt.currency, priceGbp: receipt.amountMinor / 100 },
    };
    if (ledger.state === 'ready') {
      if (!paymentPath) throw new Error('Recovery promotion requires a freshly queried authenticated --payment receipt');
      const receiptPath = resolveContainedPath(privateRoot, paymentPath, {
        label: 'Recovery payment receipt', mustExist: true, kind: 'file',
      });
      promotionOptions.paymentEvidence = JSON.parse(readFileSync(receiptPath, 'utf8'));
    } else if (ledger.state !== 'promoting') {
      throw new Error(`Recovery cannot promote a transaction from ${ledger.state}`);
    }
  }
  const result = promoteReadyTransaction(privateRoot, hash, promotionOptions);
  return {
    state: result.ledger.state,
    transactionHash: hash,
    recovered: result.recovered,
    alreadyPromoted: result.alreadyPromoted,
    finalPath: result.finalPath,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.root || !args['transaction-hash']) {
    throw new Error('Usage: recover-studio-order.mjs --root <private orders root> --transaction-hash <64-hex digest> (--payment <fresh authenticated receipt> | --status); a committed promoting state resumes without another receipt');
  }
  const result = recoverStudioOrder({
    root: args.root,
    transactionHash: args['transaction-hash'],
    paymentPath: args.payment || null,
    statusOnly: args.status === true,
  });
  if (result.statusOnly) {
    console.log(`Studio transaction ${result.state} · transaction ${result.transactionHash.slice(0, 12)} · status only`);
  } else {
    console.log(`Studio recovery ${result.state} · transaction ${result.transactionHash.slice(0, 12)} · ${result.alreadyPromoted ? 'already reconciled' : result.recovered ? 'promotion reconciled' : 'promotion completed'}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    main();
  } catch (error) {
    console.error(`Recovery blocked: ${error.message}`);
    process.exitCode = 1;
  }
}
