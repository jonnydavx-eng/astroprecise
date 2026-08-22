# Eclipse Edition — archived entitlement runbook

Updated: 2026-08-22 for `ap-v900`

## Status

The 12 August 2026 Eclipse Edition is archived. AstroPrecise does not link or open a checkout for it, and this file must not be used to restart sales. The current product/release truth is in `STATUS.md` and `AGENT-HANDOFF.md`.

The legacy Gumroad listing `your-eclipse-reading` is still externally reachable. The owner must unpublish it without deleting the product or past-buyer entitlements. Do not change the product ID while legitimate buyers still need licence recovery.

## Existing-buyer recovery only

1. The buyer opens `eclipse.html` and recomputes the eclipse contact locally.
2. The buyer pastes the licence key from the Gumroad receipt into the on-page password field.
3. AstroPrecise verifies the key against Gumroad's licence API and rejects refunded, disputed or chargebacked purchases.
4. Licence keys must never be accepted from query strings, URL fragments, referrers, analytics or support links.
5. Refund or licence problems go through the Gumroad receipt route or `contact@astroprecise.app`.

Birth date, time and chart data stay on the visitor's device and are not sent to Gumroad.

## Required release checks

Run from the repository root:

```powershell
npm test
npm run check:syntax
npm run test:launch
npm run test:ui
node test-release-honesty.mjs
npm audit --audit-level=high
npm --prefix tools/visual-check audit --audit-level=high
```

The root `npm test` chain currently contains 26 commands, must be 26/26. The launch and UI suites are separate and must also exit zero.

The release gates must continue to prove:

- checkout is disabled and no Gumroad product link appears on the public site;
- archived licence verification remains available;
- licence keys cannot enter through an address;
- refunded, disputed and chargebacked purchases fail closed;
- Eclipse owns one dedicated simulation and no duplicate general Observatory;
- the field guide remains free;
- legal copy describes the archived listing honestly until it is unpublished.

## If a future paid eclipse product is proposed

Treat it as a new product, not a switch on this archive. It requires a fresh SKU, offer, price, fulfilment contract, Merchant-of-Record decision, service address, privacy/legal review, refund path, signed-in seller verification and a new correctly scoped release wave. Never reuse the archived permalink, product ID, entitlement or campaign copy.

No seller-account mutation, push or deployment is authorized by this runbook.
