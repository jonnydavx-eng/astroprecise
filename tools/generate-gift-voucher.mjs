/**
 * RETIRED SECURITY STOP.
 *
 * The former voucher flow embedded recipient data and an order-derived code in
 * a redemption URL. It is intentionally non-runnable. Gift and voucher flows
 * are deferred: v902 accepts only adult self-orders through fulfil-order.mjs.
 * Do not use this script or dormant gift scaffolding for customer work.
 */
console.error('Gift voucher generation is retired and blocked. v902 accepts only canonical purchaseIntent "self" through fulfil-order.mjs.');
process.exit(1);
