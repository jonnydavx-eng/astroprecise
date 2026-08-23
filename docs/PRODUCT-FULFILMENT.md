# AstroPrecise Studio v901 — product fulfilment procedure

Updated: 2026-08-23

## Purpose

This is the operator procedure for the three personalised Studio commissions only:

- `natal-sky-print-pack` — £18
- `personal-sky-keepsake` — £29
- `whole-sky-edition` — £39

It separates watermarked proof generation from the currently disabled unwatermarked-final path, keeps birth data outside source control and requires a future seller-authenticated paid-in-full adapter rather than trusting a locally authored flag.

## Launch-level stop condition

Do not accept a live order until a signed-in Gumroad Commission test proves the sequence for:

1. 50% deposit;
2. private buyer inputs;
3. optional early-start consent;
4. seller completion action;
5. remaining 50% charge;
6. paid-in-full dashboard evidence; and
7. upload/replacement of the final unwatermarked files.

Gumroad's published Commission flow says the balance is charged after the seller marks the project complete. The local generator refuses to make an unwatermarked final before a seller-authenticated adapter verifies paid-in-full evidence. If Gumroad requires final files before the seller can trigger the balance and will not permit secure replacement afterwards, the workflows conflict. Stop and redesign/test the gate; never weaken it ad hoc for a live buyer.

## Private storage rule

Real order and payment JSON must live outside this repository, for example in an access-restricted directory under `C:\private\astroprecise-orders\`. Do not use OneDrive, Google Drive, source control, public temp sharing or a customer ZIP for raw order files unless the owner has explicitly approved a secure data-processing setup.

Never place birth data in:

- a command-line argument;
- a URL/query/hash;
- a public form or public support ticket;
- a filename;
- source control;
- a public sample;
- a general application log;
- analytics or marketing tools.

Use the private Gumroad order conversation for necessary buyer clarification.

## 1. Intake from Gumroad

In the signed-in Sales drawer, match:

- exact product/SKU;
- total GBP price;
- order ID;
- buyer email;
- payment/deposit state;
- display name;
- birth date in `YYYY-MM-DD`;
- exact recorded local time in `HH:MM`;
- city/town and country;
- exact-time acknowledgement;
- house-system choice;
- early-start checkbox state and timestamp;
- contract/acceptance timestamp.

Reject or pause:

- unknown, approximate or rectified times;
- invalid calendar dates;
- ambiguous city/country;
- missing exact-time acknowledgement;
- changed SKU/price/email;
- another person's birth data;
- special-category or irrelevant personal information;
- a daylight-saving gap/fold that cannot be disambiguated;
- any unsupported product.

Derive latitude, longitude and the IANA timezone from the exact place using a controlled source. Verify them independently; do not guess.

## 2. Create the private canonical order

`tools/order-template.json` is deliberately the exact runnable Aurora Vale fictional fixture used by `npm run product:proof`. For a real order, copy it into the private order directory, replace every buyer/chart field, replace the order reference/email, and remove `sampleMode`. A real proof or final also needs either a valid early-start record or a contract time old enough for the 14-day period to have ended.

Private order structure (values shown are fictional):

```json
{
  "schema": "astroprecise-studio-order-v901",
  "orderId": "FICTIONAL-ORDER-001",
  "product": "whole-sky-edition",
  "sampleMode": "fictional",
  "email": "buyer@example.test",
  "name": "Aurora Vale",
  "place": "Whitby, England",
  "y": 1990,
  "mo": 6,
  "d": 14,
  "h": 3,
  "mi": 42,
  "lat": 54.486,
  "lon": -0.613,
  "tz": "Europe/London",
  "timeAccuracy": "exact",
  "house": "placidus",
  "contractAt": "2026-08-01T10:00:00.000Z",
  "earlyStartConsent": false,
  "earlyStartConsentRecordedAt": null
}
```

If early performance was genuinely requested, set `earlyStartConsent` to `true` and record the actual durable-consent timestamp in `earlyStartConsentRecordedAt`. Never infer consent from purchase, general terms acceptance or urgency.

## 3. Generate a proof

Proof output is watermarked and cannot become the customer final. A real commissioned proof is subject to the same contract/early-start gate as other commissioned work. The only consent-free fictional mode is the exact built-in Aurora Vale fixture using an `FICTIONAL-` order reference and `example.test` email.

```powershell
node tools/fulfil-order.mjs --in C:\private\astroprecise-orders\order.json --proof --out C:\private\astroprecise-orders\proof
```

The orchestrator:

1. validates the three-SKU allowlist and canonical birth inputs;
2. converts civil time to an unambiguous UTC instant;
3. writes private control files;
4. generates reading/plate HTML;
5. renders and validates PDFs;
6. generates the product's exact PNG set;
7. captures the Whole Sky Observatory still where required;
8. packages generic-filename customer files;
9. validates dimensions, page counts, metadata, watermark state, privacy and hashes.

An order ID alone never enables final mode. The legacy `--final` switch is disabled.

## 4. Review the proof

Even when the automated quality gate passes, visually inspect:

- every reading page in both screen and ink-light PDFs;
- A3 and A4 plate cropping, labels and legibility;
- all five print/social PNGs at full resolution;
- the Whole Sky Observatory still and visible `SCHEMATIC` label;
- exact display name, place and recorded-moment details;
- no missing glyph, collision, overflow, orphan page or warm retired palette;
- sample/proof watermark on every proof artifact where required;
- the visible `AP REF` on every PDF page and the matching machine-decoded provenance strip on every PNG;
- no buyer email, order ID, coordinates, payment data or raw JSON in customer manifests, ZIP inventory or filenames.

Reconfirm the calculated UTC instant against the accepted civil time/timezone. Do not continue when a daylight-saving ambiguity exists.

## 5. Cancellation/work-start gate

- If early-start consent is false, do not start or create a final before the 14-day period ends.
- If it is true, preserve the separate unticked-control wording, affirmative state and timestamp.
- The orchestrator retains the normalized contract/consent timestamps in the private canonical input and binds the same values into `order-control.workStart`; the quality gate rechecks them before approval.
- If the buyer cancels after requested work begins but before full performance, stop work, record what was supplied and apply only a lawful proportionate charge/refund through Gumroad.
- If the commission is rejected, refund the deposit promptly.
- Never state “all sales final.”

## 6. Verify paid-in-full evidence

After the tested Gumroad completion/final-charge sequence shows the full service price paid and not refunded, the future authenticated adapter must create and HMAC-sign the private receipt. The current implementation still refuses final generation because no authenticated Gumroad adapter or adapter secret is connected.

Fictional structure:

```json
{
  "provider": "gumroad",
  "adapterReceiptId": "FICTIONAL-ADAPTER-RECEIPT-001",
  "transactionId": "FICTIONAL-TRANSACTION-001",
  "orderId": "FICTIONAL-ORDER-001",
  "productSku": "whole-sky-edition",
  "currency": "GBP",
  "amountMinor": 3900,
  "status": "paid-in-full",
  "refunded": false,
  "buyerEmail": "buyer@example.test",
  "verifiedAt": "2026-08-23T16:30:00.000Z",
  "verifiedBy": "gumroad-adapter-v1",
  "verificationMethod": "gumroad-authenticated-adapter-v1",
  "adapterSignature": "0000000000000000000000000000000000000000000000000000000000000000"
}
```

Exact `amountMinor` values:

- Natal Sky Print Pack: `1800`
- Personal Sky Keepsake: `2900`
- Whole Sky Edition: `3900`

The structure above is illustrative only: its zero signature is invalid. A manually written or copied JSON file cannot enable final generation. The authenticated adapter must bind the exact receipt fields with the private `AP_PAYMENT_ADAPTER_SECRET`; that secret must stay outside the repository and order package. Do not fabricate or reuse a receipt, and do not change `checkoutVerified` merely to make a command pass.

## 7. Generate and inspect the final

```powershell
# This command is expected to fail while checkoutVerified is false.
# A future verified flow must not add --out; finals use one canonical directory.
node tools/fulfil-order.mjs --in C:\private\astroprecise-orders\order.json --payment C:\private\astroprecise-orders\verified-payment.json
```

The final must fail unless:

- the signed-in checkout and authenticated payment adapter have been implemented, tested and deliberately enabled;
- work may lawfully start;
- payment status is exactly `paid-in-full`;
- refund state is false;
- order ID, SKU, email, GBP currency and full amount match;
- authenticated adapter receipt ID, verifier, timestamp and valid HMAC are recorded;
- the private fulfilment lock is available;
- no immutable prior final already exists;
- the payment transaction has not already been reserved or used for another order;
- all render/package/quality gates pass.

The eventual verified route reserves a hash of the transaction ID atomically in `output/orders/_transaction-ledger/` and fixes the output to `output/orders/order-<order-reference-hash>`. It never accepts a caller-selected final directory. A private 32-byte per-run provenance key binds the canonical input, order reference, SKU and mode to a non-identifying `AP REF`; that reference is present on every PDF page and encoded in every PNG. The quality gate independently recomputes the chart, decodes those references, raster-checks every PDF page and rejects visually flattened PDFs/PNGs. A reserved transaction is fail-closed after an interrupted run; investigate the private evidence and document recovery rather than deleting or rewriting ledger evidence casually.

Repeat the complete visual review. Confirm that no proof/sample watermark remains in a final and that the final ZIP contains only the SKU's promised files plus delivery notes, licence, print guide and customer manifest.

## 8. Deliver

Use the tested private Gumroad Commission route. Confirm the buyer receives a durable completion message and can download the files.

Record:

- completion and final-charge evidence;
- final manifest hashes;
- delivery timestamp;
- terms/listing version;
- early-start state;
- correction deadline;
- private-file deletion due date.

Do not attach raw order/payment JSON. Do not include the private `_private` directory, HTML render sources, payment hashes or internal control files.

## 9. Corrections and adjustment

Correct AstroPrecise calculation, transcription, rendering and missing-file errors without charge. Re-run the full quality gate and issue a new manifest.

Whole Sky includes one reasonable layout adjustment requested within seven calendar days after delivery. Keep the same accepted birth inputs and deliverable scope. A changed birth record, different chart, new written brief, extra product or commercial licence is a new agreement, not the included adjustment.

Do not overwrite an audited final silently. Preserve a private change record and deliver a clearly versioned replacement while keeping customer filenames generic.

## 10. Retention and deletion

Proposed owner-confirmation rule:

- local raw birth inputs and working files: delete within 30 days after final delivery or final agreed correction, whichever is later;
- Gumroad order/accounting evidence: retain only as required by the confirmed legal/tax schedule;
- public samples: fictional only;
- fulfilment logs: retain hashes/status without unnecessary birth data.

Record deletion completion without copying the deleted personal data into the deletion log. Do not delete buyer access or the customer-facing Gumroad order when removing local working data.

## 11. Failure handling

If any generator, renderer or quality command fails:

1. do not upload or mark the commission complete;
2. preserve the private error context without publishing personal data;
3. identify whether the fault is input, calculation, render, packaging, payment or platform flow;
4. fix through the normal project workflow and rerun a proof from a clean private proof directory; for an interrupted final, investigate the canonical order and transaction reservation before any controlled recovery;
5. visually inspect again;
6. tell the buyer promptly if the agreed timing is at risk.

Never bypass page-count, dimension, font, overflow, watermark, payment or privacy checks to meet a deadline.

## 12. Local regression checks

Run against fictional fixtures:

```powershell
npm run test:fulfil
node tools/test-product-render.mjs
npm run test:shop
npm test
npm run build
```

No command result authorises a seller mutation, product publication or deployment.
