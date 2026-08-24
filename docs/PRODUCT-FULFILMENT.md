# AstroPrecise Studio v901 — product fulfilment procedure

Updated: 2026-08-24

## Purpose

This is the operator procedure for the three personalised Studio commissions only:

- `natal-sky-print-pack` — £18
- `personal-sky-keepsake` — £29
- `whole-sky-edition` — £39

It separates watermarked proof generation from the currently disabled unwatermarked-final path, keeps birth data outside source control and requires a future seller-authenticated paid-in-full adapter rather than trusting a locally authored flag.

Each SKU accepts `purchaseIntent: self` or `purchaseIntent: gift`; gift is not a fourth SKU. Gift mode is birthday-only at launch and is limited to an adult recipient who is present, directly enters their own data, receives the privacy information and confirms the request before work. The recipient pays nothing and is the default file recipient. Surprise gifts, delayed vouchers, buyer-entered recipient data and recipients under 18 are hard rejects.

## Launch-level stop condition

Do not accept a live order until a signed-in Gumroad Commission test proves the sequence for:

1. proposed 50% deposit, with the exact account-visible payment state verified rather than assumed;
2. private buyer inputs;
3. optional early-start consent;
4. seller completion action;
5. proposed remaining 50% charge, with the exact completion/charge event verified rather than assumed;
6. paid-in-full dashboard evidence; and
7. upload/replacement of the final unwatermarked files.

For gift mode, the same unpublished test must also prove:

8. adult recipient self-entry and just-in-time privacy notice;
9. recipient confirmation stored separately from buyer acceptance;
10. recipient-default delivery with no buyer access to birth fields/files;
11. optional buyer-copy authorisation is separate, initially unticked, attributed to the recipient and withdrawable at any time, with every not-yet-sent copy or replacement stopped;
12. recipient objection/stopping, under-18 rejection and no-surprise rejection; and
13. deletion of recipient working data without deleting required buyer accounting evidence.

Gumroad's published Commission flow says the balance is charged after the seller marks the project complete. The local generator refuses to make an unwatermarked final before a seller-authenticated adapter verifies paid-in-full evidence. If Gumroad requires final files before the seller can trigger the balance and will not permit secure replacement afterwards, the workflows conflict. Stop and redesign/test the gate; never weaken it ad hoc for a live buyer.

## Private storage rule

Real order and payment JSON must live outside this repository, for example in an access-restricted directory under `C:\private\astroprecise-orders\`. Do not use OneDrive, Google Drive, source control, public temp sharing or a customer ZIP for raw order files unless the owner has explicitly approved a secure data-processing setup.

Before any future final run, set `AP_STUDIO_PRIVATE_ORDERS_ROOT` to that absolute, access-restricted directory. The orchestrator now rejects a missing, relative or repository-contained final root and stores both final orders and the transaction ledger beneath the configured private root. This path check is not an ACL or encryption guarantee: verify the Windows ACL, device encryption, backup boundary and deletion procedure separately before accepting a real order.

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
For a gift-order birth or delivery question, communicate directly with the recipient through the tested private recipient route. Do not ask the buyer to relay, verify or correct the recipient's data.

## 1. Intake from Gumroad

In the signed-in Sales drawer, match:

- exact product/SKU;
- purchase intent exactly `self` or `gift`;
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

For `gift`, also match:

- adult-recipient/self-entry confirmation and timestamp;
- the privacy-notice version shown to the recipient;
- recipient delivery email entered by the recipient;
- optional birthday from-name/message, with no hidden buyer note and `giftMessage` limited to 240 characters;
- a conspicuous instruction beside the message field not to include health, beliefs, sexual-life data or information about anyone other than the recipient;
- separate buyer-copy authorisation wording/state/timestamp, default false;
- any pre-dispatch withdrawal or recipient objection.

Reject or pause:

- unknown, approximate or rectified times;
- invalid calendar dates;
- ambiguous city/country;
- missing exact-time acknowledgement;
- changed SKU/price/email;
- for `self`, another person's birth data;
- for `gift`, any indication that the buyer entered, forwarded or dictated the recipient's details;
- a recipient under 18, absent recipient, surprise gift or delayed voucher/redemption request;
- buyer-copy authorisation that is preselected, bundled, completed by the buyer or missing its durable record;
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
  "purchaseIntent": "self",
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

`tools/order-template.json` is the exact runnable fixture and field-contract source of truth. Do not copy a stale prose example over it. A canonical gift order uses these exact additional controls:

- `recipientEmail`, `recipientDisplayName`, `giverDisplayName`, `occasion` and optional `giftMessage`;
- `recipientDeclaration.typedName`, `confirmedAdult: true` and `confirmedPersonalDataEntry: true`; typed name is direct recipient evidence and need not equal the display name;
- `recipientConfirmedAt`, `recipientProcessingNoticeVersion`, `recipientProcessingNoticeHash`, `recipientConfirmationMethod`, the exact attached `recipientPrivacyNoticeVersion`/`recipientPrivacyNoticeHash`, `recipientBirthInputHash`, and `recipientConfirmationEvidenceHash` binding the order ID, SKU, recipient account and accepted birth-input digest as well as those notice records;
- `recipientConfirmationMethod` exactly `recipient-self-entry-v1`;
- `buyerAttestation`, `buyerAttestationVersion`, `buyerAttestationHash`, `buyerAttestationActor: buyer` and `buyerAttestationRecordedAt`, binding the buyer's acknowledgement that they did not enter, upload, forward or dictate the recipient's personal data;
- `deliveryTo`, always exactly `recipient`;
- `recipientDisclosureAuthorized`, `recipientDisclosureAuthorizedAt`, `recipientDisclosureAuthorizedBy`, optional `recipientDisclosureWithdrawnAt`/`recipientDisclosureWithdrawnBy`, and the wording version/hash; canonical output derives `recipientDisclosureState` and `recipientDisclosureActive`;
- `earlyStartConsent` and, only when true, its time, `buyer` actor and notice version/hash;
- `digitalSupplyConsent` and, only when true, its time, `buyer` actor and notice version/hash.
- `buyerDurableConfirmationSentAt`/`buyerDurableConfirmationVersion`/`buyerDurableConfirmationFile`/`buyerDurableConfirmationHash` for every commission and the corresponding `recipient...` quartet for gifts. Version must be `ap-durable-confirmation-bundle-v1-2026-08-24`; the basename identifies the immutable saved message/attachment bundle and the hash must match its bytes before work.

`deliveryTo` is invariantly `recipient`. Buyer copy is an additional permission, never an alternative delivery target. When `recipientDisclosureAuthorized` is false, its timestamp and actor must be null or absent. When true, the actor must be `recipient`, its timestamp cannot pre-date recipient confirmation, and its version/hash must match the approved wording. A withdrawal requires its own recipient actor/time after authorisation and makes `recipientDisclosureActive` false, blocking every later buyer copy or replacement. The recipient still receives the files. The same fail-closed null-or-complete rule applies independently to early start and digital supply. Do not invent a hash in operator notes; generate and verify it through the canonical intake path.

The order-level privacy-notice version/hash must identify the exact dated, immutable notice attached to the recipient's durable confirmation—not merely a mutable webpage or the short acknowledgement text. Gift final fulfilment remains independently disabled while catalogue `giftCheckoutVerified` is false or the catalogue has no owner-approved matching notice version/hash.

## 3. Generate a proof

Proof output is watermarked and cannot become the customer final. A real commissioned proof is subject to the same contract, durable-confirmation and early-start gate as other commissioned work, requires an explicit `--out` directory outside the repository, and never defaults to `output/proofs`. Put each immutable confirmation bundle beside the private input order using its recorded safe basename; the orchestrator recomputes the SHA-256 and rejects a missing file, a path escape or any mismatch. The only consent-free repository-local fictional mode is the exact built-in Aurora Vale fixture: every identifying/free-text field must match the fixture, every email must use `example.test`, and the order reference must begin `FICTIONAL-`.

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

For `gift`, the orchestrator also creates and validates:

- `birthday-gift-jacket-a4.pdf` — personalised A4 dedication jacket;
- `birthday-reveal-1080x1920.png` — phone/private-share birthday reveal;
- `birthday-moon-plate-2160x2160.png` — lunar phase computed for the exact accepted UTC instant and visibly identified as calculated artwork, not a photograph.

For Personal Sky Keepsake and Whole Sky, the gift jacket is a standalone A4 file. It does not alter the reading PDF or its exactly 20-page contract.

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

For gift proofs, also inspect:

- recipient display name, from-name and message exactly as accepted, with no unrequested copy;
- all three gift assets at their promised size/page format;
- Moon phase against independently recomputed UTC and a visible calculated/not-a-photograph label;
- reading page count remains exactly 20 and the gift jacket is packaged separately;
- no recipient email, buyer email, buyer-copy state or confirmation text appears in delivered artwork/metadata;
- no warm orange, gold, brass ribbon, physical box or voucher/redemption claim.

Reconfirm the calculated UTC instant against the accepted civil time/timezone. Do not continue when a daylight-saving ambiguity exists.

## 5. Cancellation/work-start gate

- If early-start consent is false, do not start or create a final before the 14-day period ends.
- If it is true, preserve the separate unticked-control wording, affirmative state, buyer actor, timestamp, version and hash.
- If completed digital files are generated or supplied during the cancellation period, require the distinct `digitalSupplyConsent` record and its buyer actor, time, notice version and hash. Never infer it from early start, general terms or recipient buyer-copy authorisation. The final orchestrator and quality gate now fail closed on this rule.
- The orchestrator retains the normalized contract/consent records in the private canonical input and binds the same values into `order-control.workStart` and `order-control.digitalSupply`; the quality gate rechecks them before approval.
- If the buyer cancels after requested work begins but before full performance, stop work, record what was supplied and apply only a lawful proportionate charge/refund through Gumroad.
- If the commission is rejected, refund the deposit promptly.
- Never state “all sales final.”
- A recipient refusal/objection stops gift-data work. It does not erase the buyer's cancellation rights or authorise the buyer to replace the recipient's data.

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

The eventual verified route requires `AP_STUDIO_PRIVATE_ORDERS_ROOT`, reserves a hash of the transaction ID atomically beneath `<private-root>\_transaction-ledger\` and fixes the final output beneath `<private-root>\orders\order-<order-reference-hash>`. It rejects a final root inside the repository and never accepts a caller-selected final directory. A private 32-byte per-run provenance key binds the canonical input, order reference, SKU and mode to a non-identifying `AP REF`; that reference is present on every PDF page and encoded in every PNG. The quality gate independently recomputes the chart, decodes those references, raster-checks every PDF page and rejects visually flattened PDFs/PNGs. A reserved transaction is fail-closed after an interrupted run; investigate the private evidence and document recovery rather than deleting or rewriting ledger evidence casually.

Repeat the complete visual review. Confirm that no proof/sample watermark remains in a final and that the final ZIP contains only the SKU's promised files plus delivery notes, licence, print guide and customer manifest.

## 8. Deliver

Use the tested private Gumroad Commission route. For `self`, confirm the buyer receives the durable completion message and files. For `gift`, confirm the recipient receives a separate durable confirmation and the files by default; the buyer receives a confirmation without birth details and receives the files only when recipient buyer-copy authorisation is true and still valid at the dispatch check.

Record:

- completion and final-charge evidence;
- final manifest hashes;
- delivery timestamp;
- terms/listing version;
- early-start state;
- correction deadline;
- private-file deletion due date.
- for gift orders, recipient delivery evidence and buyer-copy authorisation/withdrawal state at dispatch.

Do not attach raw order/payment JSON. Do not include the private `_private` directory, HTML render sources, payment hashes or internal control files.
Do not CC/BCC the buyer on a recipient message or use a shared download link as a shortcut around the buyer-copy control.

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

For gifts, treat recipient delivery/contact and authorisation records separately from the buyer's tax/accounting evidence. Deleting raw birth working data must not silently erase a still-needed rights/objection or buyer-copy withdrawal record; retaining an accounting receipt is not a reason to retain the recipient's raw birth data or generated working files.

Record deletion completion without copying the deleted personal data into the deletion log. Do not delete buyer access or the customer-facing Gumroad order when removing local working data.

No live order may be accepted until a non-identifying scheduled purge and deletion-completion record have been implemented and exercised on a fictional order. The proposed 30-day rule in this candidate is policy drafting, not proof that deletion automation exists.

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
