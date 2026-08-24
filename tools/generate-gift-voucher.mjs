/**
 * RETIRED SECURITY STOP.
 *
 * The former voucher flow embedded recipient data and an order-derived code in
 * a redemption URL. It is intentionally non-runnable. Gift commissions now use
 * the adult recipient's direct, recorded consent and deterministic gift assets
 * generated only through fulfil-order.mjs.
 */
console.error('Gift voucher generation is retired and blocked. Use the three Studio SKUs with canonical purchaseIntent "gift" through fulfil-order.mjs.');
process.exit(1);
