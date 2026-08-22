# PayPal product setup — retired for v900

Updated: 2026-08-22

## Do not follow the old product-link instructions

The former 13-SKU PayPal plan is not the v900 offer. Do not paste payment links into `AP_MON`, enable dormant catalogue entries, restore email-capture fallbacks or describe the old catalogue as ready for sale. Those instructions predated the archived Eclipse Edition and the v900 commerce reset.

AstroPrecise v900 has:

- free sky, chart and seven-chapter reading tools;
- one external voluntary-support link to Ko-fi;
- no product checkout, subscription, paid unlock or active SKU;
- an archived Gumroad entitlement path for existing buyers only.

## Owner checklist for voluntary support

Before deploying the Ko-fi support surface:

1. Sign in to the intended Ko-fi creator account and verify the public identity is AstroPrecise.
2. Confirm the payout destination and the connected PayPal or Stripe account.
3. Confirm Ko-fi presents the transaction as voluntary support, not a product, subscription or feature unlock.
4. Supply the required business/service address and review the current Privacy, Terms, Refunds and Contact pages.
5. Deploy v900 only after explicit owner authorization, then test one real low-value support journey and verify the payout appears in the intended account.

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

GitHub Pages does not apply the repository's `_headers` file. Before any paid product launches, use a host or edge layer that can enforce the intended CSP, HSTS, frame, referrer and permissions headers, then verify those headers on the public response. Meta tags alone cannot provide the full policy.

No seller-account mutation, payment-link creation, push or deployment is authorized by this file.
