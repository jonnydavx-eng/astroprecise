#!/usr/bin/env node
/**
 * Fail-closed boundary for the future Gumroad Commission payment adapter.
 *
 * Gumroad's public documentation is not an authenticated sale-state API
 * contract. No manual JSON/dashboard transcription is signed here. Enabling
 * this adapter requires a later governed change that pins the observed seller
 * API schema and implements a fresh authenticated fetch plus revocation query.
 */
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const GUMROAD_COMMISSION_ADAPTER = Object.freeze({
  schema: 'astroprecise-gumroad-commission-adapter-v2',
  enabled: false,
  authenticatedProviderContractHash: null,
  reason: 'authenticated Gumroad Commission fields and final-charge/file-access sequence are not yet proven',
});

export function assertGumroadCommissionAdapterReady() {
  if (GUMROAD_COMMISSION_ADAPTER.enabled !== true ||
      !/^[a-f0-9]{64}$/.test(String(GUMROAD_COMMISSION_ADAPTER.authenticatedProviderContractHash || ''))) {
    throw new Error(`Gumroad Commission payment adapter is disabled: ${GUMROAD_COMMISSION_ADAPTER.reason}`);
  }
  return true;
}

/**
 * Deliberately unreachable until the pinned provider contract above is filled
 * by a later independently-reviewed implementation. This function exists so
 * callers have one narrow integration point and cannot substitute a handwritten
 * receipt for an authenticated provider query.
 */
export async function createGumroadCommissionPaymentEvidence() {
  assertGumroadCommissionAdapterReady();
  throw new Error('Authenticated Gumroad provider retrieval is not implemented');
}

function main() {
  assertGumroadCommissionAdapterReady();
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    main();
  } catch (error) {
    console.error(`Payment adapter blocked: ${error.message}`);
    process.exitCode = 1;
  }
}
