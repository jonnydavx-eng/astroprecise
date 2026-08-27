# PayPal product setup — retired for v902

Updated: 2026-08-24

## Do not follow the old product-link instructions

The former 13-SKU PayPal plan is not the v902 offer. Do not paste payment links into `AP_MON`, enable dormant catalogue entries, restore email-capture fallbacks or describe the old catalogue as ready for sale. The only launch offer is the checkout-closed three-product Gumroad Commission catalogue in `website/data/products-v901.json`.

The current public v895 site and checkout-closed v902 candidate have:

- free sky, chart and seven-chapter reading tools;
- one external voluntary-support link to Ko-fi;
- no product checkout linked from AstroPrecise and no current Studio SKU; Ko-fi currently offers one-time and optional monthly support, with no AstroPrecise product or feature entitlement;
- a legacy Gumroad Eclipse listing that is still externally reachable and marked in stock, plus its entitlement path for existing buyers. It is not archived until the owner makes it unavailable and the direct URL is rechecked.

## Owner checklist for voluntary support

Before deploying the Ko-fi support surface:

1. Sign in to the intended Ko-fi creator account and verify the public identity is AstroPrecise.
2. Confirm the payout destination and which PayPal and/or Stripe account is connected; the public site must not guess this owner-only fact.
3. Confirm the public one-time and monthly options, displayed amount and currency, recurring-payment notice and cancellation controls.
4. Confirm neither option promises a product, feature unlock, membership tier or supporter-only entitlement.
5. Supply the required business/service address and review the current Privacy, Terms, Refunds and Contact pages.
6. Deploy only an independently verified, owner-authorised release, then test one real low-value support journey, verify the payout appears in the intended account and cancel any test recurrence immediately.

Never place account credentials, API keys, webhook secrets, payment emails or licence keys in this repository.

## A future paid product is a separate launch

A paid chart, reading, art file or physical item needs a fresh commercial scope with:

- a named product and deliverable that already exists;
- an approved price and currency;
- fulfilment, refund, tax/VAT and customer-support ownership;
- an appropriate Merchant of Record or seller-account review;
- a service address and current legal copy;
- privacy-safe checkout and return behavior;
- end-to-end purchase, fulfilment, refund and accessibility tests;
- a new correctly scoped release wave.

Do not reactivate the dormant 13-SKU code as a shortcut.

## Hosting caveat

The v902 release path uses Cloudflare Pages, which applies the repository's `_headers` file. The protected build stamps the exact candidate SHA into `dist/_headers`; verify CSP, HSTS, frame, referrer, permissions and candidate-identity headers on the immutable deployment URL and both custom domains before launch. Meta tags alone cannot provide the full policy.

No seller-account mutation, payment-link creation, push or deployment is authorized by this file.
