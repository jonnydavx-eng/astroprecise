# AstroPrecise Studio v902 — product fulfilment procedure

Updated: 2026-08-24

## Purpose and release boundary

This is the operator procedure for the proposed first release of exactly three personalised Studio commissions:

- `natal-sky-print-pack` — £18
- `personal-sky-keepsake` — £29
- `whole-sky-edition` — £39

The first release is digital-only, adult-only and `purchaseIntent: self` only. The buyer must be at least 18, must be the chart subject and must provide only their own birth and contact data. Buying for another person, gifts, surprise gifts, vouchers, recipient flows, third-party birth data and any order involving a minor are not offered and must be rejected before work starts.

The catalogue remains named `website/data/products-v901.json` for compatibility, but its current launch contract is `launchMode: self-only`, `purchaseModes: ["self"]`, three draft products, null checkout URLs and `checkoutVerified: false`. Older gift-oriented source, fixtures or research documents are dormant internal material. Their presence does not enable or approve a gift order, a third-party order or a minor's order.

This procedure separates watermarked proof generation from the disabled unwatermarked-final path. It keeps birth data outside source control and requires fresh seller-authenticated payment evidence. A locally authored flag, dashboard transcription or hand-written receipt is never enough.

## Launch stop condition

Checkout is closed and final fulfilment is disabled. Do not accept a live Studio order until all of the following have been separately completed and evidenced:

1. the owner has confirmed the legal/trading identity, geographic address, monitored contact route, territories, tax/VAT treatment, retention decision, complaint route and service terms;
2. the seller account, payout account and Gumroad Commission eligibility have been verified by the owner in the signed-in native session;
3. an unpublished self-order test has proved the exact deposit, order acceptance, private input, optional-consent, completion, final-charge, paid-in-full, refund and file-delivery sequence;
4. the authenticated provider field map has been pinned from the real signed-in flow and independently reviewed;
5. the private root's Windows ACL, device encryption, backup exclusion and purge procedure have been configured and tested;
6. the disabled Gumroad adapter has been replaced through a governed change with fresh authenticated retrieval and revocation checks;
7. one complete fictional self-order has exercised receipt, cancellation/refund, proof, final staging, recovery, delivery and deletion without weakening a gate; and
8. the exact authorised release has passed governance and been deployed, and the owner has separately authorised listing publication and checkout wiring.

Do not claim any of those owner, seller, checkout, listing, deployment or publication facts are complete merely because local tests pass.

## Private storage and process boundary

Use `tools/fulfil-order.mjs`; never invoke lower-level generators directly on real customer input.

Real order, durable-confirmation and payment files must live outside this repository in a dedicated access-restricted directory. Before any future final run, set `AP_STUDIO_PRIVATE_ORDERS_ROOT` to an existing absolute private directory outside the repository. Do not use OneDrive, Google Drive, source control, public temporary sharing or a customer ZIP for raw inputs.

The implementation now:

- rejects a missing, relative or repository-contained private root;
- rejects symbolic links, junctions, reparse points and filesystem aliases;
- proves both lexical and real-path containment for private inputs, evidence, staging, ledger and final paths;
- creates contained directories conservatively and rechecks them after creation;
- refuses caller-selected final directories; and
- rejects reparse points anywhere in a completed fulfilment tree before promotion.

On Windows, the root check also rejects any allow ACE for a principal other than the current user/owner, SYSTEM, Administrators or owner-only inheritance identities; shared locations such as `C:\Users\Public` therefore fail closed. On Unix-like systems it requires the fulfilment user to own the directory with no group/other permissions. This code-level access check is not proof of device encryption, backup exclusion or a working purge schedule; those remain owner-gated setup and test work.

Never place birth data in:

- a command-line argument;
- a URL, query string or fragment;
- a public form, public support ticket or filename;
- source control or a public sample;
- a general application log; or
- analytics or marketing tools.

Use the tested private order conversation only after the provider flow and privacy disclosures have been approved. If a buyer submits another person's data or data about a minor, stop. Do not copy it into an order, proof or operator note; follow the approved deletion/incident process once that process exists.

## 1. Intake eligibility

In the future signed-in Sales view, match every field against the approved self-order checkout and durable contract record:

- one of the three exact SKUs and its tax-inclusive GBP total;
- `purchaseIntent` exactly `self`;
- `buyerDeclaration` with a typed name matching the chart name and explicit
  confirmation that the buyer is at least 18, is the chart subject and entered
  only their own data; the recorded birth date must also calculate to age 18 or
  older at the contract time;
- order ID and buyer email;
- display name;
- the buyer's own birth date in `YYYY-MM-DD`;
- the buyer's own exact recorded local clock time in `HH:MM`;
- city/town and country;
- exact-time acknowledgement;
- house-system choice;
- order/contract acceptance timestamp;
- separate early-start choice and, when selected, its actor, timestamp, wording version and hash; and
- separate digital-supply choice and, when selected, its actor, timestamp, wording version and hash.

Reject or pause:

- any gift, voucher, recipient or buy-for-someone request;
- any third-party birth/contact data or any indication that the buyer is not the chart subject;
- a buyer under 18 or an order concerning a minor;
- unknown, approximate or rectified times;
- an invalid date, ambiguous place or unresolved daylight-saving gap/fold;
- a missing exact-time acknowledgement;
- a changed or unsupported SKU, price, currency, email or order reference;
- preselected, bundled, missing or contradictory consent records; or
- special-category or irrelevant personal information.

Derive latitude, longitude and the IANA timezone from the exact place using a controlled source and verify them independently. Do not guess.

## 2. Create the private canonical self-order

The live-source schema string remains `astroprecise-studio-order-v901`; do not rename it casually. A future real order must be stored beneath the configured private root, use one of the three SKUs and contain `purchaseIntent: "self"`.

Illustrative self-order shape:

```json
{
  "schema": "astroprecise-studio-order-v901",
  "orderId": "PRIVATE-PROVIDER-ORDER-ID",
  "product": "whole-sky-edition",
  "purchaseIntent": "self",
  "buyerDeclaration": {
    "typedName": "Customer display name",
    "confirmedAdult": true,
    "confirmedChartSubject": true,
    "confirmedPersonalDataEntry": true
  },
  "email": "buyer-address-from-provider",
  "name": "buyer display name",
  "place": "accepted town, country",
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
  "contractAt": "provider-recorded canonical UTC timestamp",
  "earlyStartConsent": false,
  "earlyStartConsentRecordedAt": null,
  "digitalSupplyConsent": false,
  "digitalSupplyConsentRecordedAt": null
}
```

Do not copy those placeholders into a real order. The exact accepted provider values and approved consent records must be used.

Before commissioned work starts, save the immutable buyer confirmation bundle beside the private order. Record its safe basename, sent timestamp, approved version and SHA-256 hash. The orchestrator resolves it inside the private order directory, re-hashes its bytes and captures it as immutable evidence. A mutable terms webpage or an operator note is not a durable contract record.

The repository's exact Aurora Vale fixture and any gift-shaped test data are fictional regression material only. They may be used by automated tests but must not be adapted into a live order or treated as launch approval.

## 3. Generate a watermarked proof

Proof output cannot become the unwatermarked final. A real commissioned proof is subject to the contract, durable-confirmation and work-start gates, requires an explicit access-restricted `--out` directory outside the repository and must use an adult self-order.

```powershell
node tools/fulfil-order.mjs --in C:\private\astroprecise-orders\order.json --proof --out C:\private\astroprecise-orders\proof
```

The orchestrator:

1. validates the three-SKU allowlist and canonical chart inputs;
2. converts the civil time to an unambiguous UTC instant;
3. verifies the work-start and durable-confirmation records;
4. writes private control files and content-addressed evidence;
5. generates the required reading, plate and Observatory sources;
6. renders and validates PDFs and PNGs;
7. packages generic-filename customer files;
8. includes `THIRD-PARTY-CREDITS.txt` generated from the controlled third-party credits source; and
9. validates dimensions, page counts, metadata, watermark state, privacy, provenance and hashes.

Renderer child processes receive only an allowlisted set of necessary operating-system values plus the explicit non-secret AstroPrecise render contract. Payment/API secrets and unrelated parent environment variables are not passed to renderer children.

An order ID never enables final mode. The legacy `--final` switch is disabled.

## 4. Review the proof

Even after the automated quality gate passes, visually inspect:

- every reading page in screen and ink-light PDFs;
- A3 and A4 plate cropping, labels and legibility;
- every promised print/social PNG at full resolution;
- the Whole Sky Observatory still and visible `SCHEMATIC` label;
- exact display name, place and recorded-moment details;
- no missing glyph, collision, overflow, orphan page or retired warm palette;
- proof/sample watermarking wherever required;
- visible `AP REF` on every PDF page and matching machine-decoded provenance on every PNG;
- no buyer email, order ID, coordinates, payment data or raw JSON in customer filenames, manifest inventory or ZIP; and
- the included third-party credit and licence material.

Recompute the accepted civil-time/timezone conversion independently. Do not continue when the UTC instant or daylight-saving interpretation is uncertain.

## 5. Cancellation and work-start gate

- The buyer must receive the immutable durable confirmation before work starts.
- If early-start consent is false, do not begin commissioned work until the 14-day cancellation period has ended.
- If early-start consent is true, preserve the separate initially unticked choice, buyer actor, timestamp, approved wording version and hash. Never infer it from urgency, purchase or general terms acceptance.
- If completed digital files will be supplied during the cancellation period, require the distinct digital-supply consent and its buyer actor, timestamp, wording version and hash. Do not infer it from early-start consent.
- If the buyer cancels after requested work begins but before full performance, stop, record what was supplied and apply only a lawful proportionate charge/refund through the tested provider route.
- If AstroPrecise rejects the commission, return any payment promptly through the tested provider route.
- Never state “all sales final” or treat platform mechanics as replacing statutory rights.

The private canonical order and `order-control.json` preserve the normalized contract, durable-confirmation, early-start and digital-supply records. The quality gate rechecks them before approval.

## 6. Fresh authenticated payment evidence

Unwatermarked final generation requires HMAC-authenticated Gumroad adapter v2 evidence. The implemented verifier binds the provider receipt to the exact order ID, SKU, buyer email, GBP currency and catalogue amount. It also requires:

- provider `gumroad` and verification method `gumroad-authenticated-adapter-v2` for live fulfilment;
- `providerAuthentication: gumroad-seller-api`;
- a SHA-256 `providerRecordHash` and canonical `providerObservedAt`;
- `status: paid-in-full`, `commissionState: completed` and `finalChargeState: settled`;
- `refunded: false`, zero refunded amount, and explicit false dispute, chargeback and revocation states;
- a unique verification nonce;
- canonical `verifiedAt` and provider-observation times no more than 10 minutes old, with no more than one minute future skew; and
- a valid SHA-256 HMAC over the complete canonical receipt using the private `AP_PAYMENT_ADAPTER_SECRET`.

The adapter secret must be 32–64 bytes represented as hex, remain outside the repository and customer/order package, and never enter a renderer child process.

One receipt is checked before reservation. After rendering reaches `ready`, that receipt cannot authorize even private promotion: the adapter must perform a new provider query with a new nonce and an observation time at or after the `ready` event. The `ready` to `promoting` commit accepts the new receipt only when its stable provider/transaction/order/SKU/amount/currency/buyer identity matches the reservation and its point-in-time state remains settled, paid in full, unrefunded, undisputed, uncharged-back and unrevoked. Any stale, replayed, mismatched or incorrectly signed state fails closed.

These receipts are point-in-time payment observations. `retrying`, `promoting` and `promoted` authorize or describe only crash-safe private filesystem work. None authorizes a customer download, email attachment or provider delivery. The candidate has no delivery adapter, delivery-authorization state or provider delivery receipt, so customer delivery remains fail-closed.

Exact current catalogue amounts are `1800`, `2900` and `3900` minor GBP units. Do not fabricate evidence, reuse a transaction or change `checkoutVerified` to make a command pass.

`tools/gumroad-commission-payment-adapter.mjs` is intentionally disabled. Its authenticated provider contract hash is null and provider retrieval is not implemented because the signed-in Commission field map and final-charge/file-access sequence have not been proved. No manual JSON or dashboard transcription can enable final generation. Enabling the adapter requires a later governed, independently reviewed implementation.

## 7. Ledger, evidence, staging and promotion

When a future final is legitimately authorised, `tools/fulfil-order.mjs`:

1. verifies the initial authenticated receipt and reserves `SHA-256(provider + NUL + transaction ID)` plus its stable payment-identity hash in a private transaction directory so the same provider transaction cannot be replayed;
2. records HMAC-chained `reserved`, `staging`, optional `retrying` then replacement `staging`, `ready`, `promoting` and `promoted` events as write-once files, using a separate private 32–64 byte hexadecimal `AP_STUDIO_LEDGER_SECRET` held outside the repository and private order tree;
3. creates a transaction-specific staging directory and canonical final path under the same configured private root;
4. captures content-addressed immutable copies of the order intake, buyer durable confirmation and payment receipt, with a source-path-free evidence manifest;
5. renders, packages and quality-checks the final in staging;
6. rejects links/reparse points and re-verifies every fulfilment artifact, manifest and evidence object by size and SHA-256;
7. records the verified `ready` hashes and stops without promoting or exposing the final;
8. requires a second, post-`ready` seller-authenticated provider query with the same stable payment identity, a different signed receipt/nonce and current refund, dispute, chargeback and revocation fields;
9. stores that promotion receipt as a content-addressed private ledger object and appends `promoting` before the first promotion side effect; and
10. atomically renames the verified staging directory to its final private path on the same filesystem, then appends an HMAC-bound `promoted` event containing the committed receipt identity. This is local materialisation only, not customer delivery.

If rendering fails while `staging`, an authenticated retry first records `retrying`, atomically quarantines the failed tree, creates a new empty restricted staging directory and only then records replacement `staging`. The original reservation price and SKU snapshot remain authoritative even if the live catalogue later changes or removes that SKU.

The transaction directory remains as a fail-closed replay marker after interruption. A missing or incorrect ledger HMAC key blocks every ledger read/write; do not store that key in the order tree, expose it to renderer children, or delete/rename/rewrite an event to retry a payment.

The command below is expected to fail in this candidate because checkout and the provider adapter remain disabled:

```powershell
node tools/fulfil-order.mjs --in orders\private-order.json --payment evidence\verified-payment.json
```

Final mode does not accept `--out`; it uses the canonical private-root paths.

## 8. Controlled recovery

Use recovery only for an already recorded transaction after inspecting its private evidence. Status inspection is read-only:

```powershell
node tools/recover-studio-order.mjs --root C:\private\astroprecise-orders --transaction-hash <64-hex-hash> --status
```

Promotion recovery is allowed only from a verified `ready` or committed `promoting` state, or to reconcile an already `promoted` state. It re-verifies the HMAC ledger, final manifest, every artifact and the content-addressed evidence bundle. A `ready` recovery requires a newly queried, freshly signed `--payment` receipt for the same provider transaction and checks its current paid/refund/dispute/chargeback/revocation observation before committing `promoting`. A `promoting` recovery instead re-verifies the already committed signed promotion receipt and resumes only the remaining private filesystem steps; it cannot deliver to the buyer. This covers crashes before or after the atomic staging-to-final rename without pretending an older observation is current delivery authority.

```powershell
node tools/recover-studio-order.mjs --root C:\private\astroprecise-orders --transaction-hash <64-hex-hash> --payment evidence\post-ready-payment.json
```

Recovery fails closed if the HMAC key is absent; a `ready` recovery lacks a fresh payment receipt; the state is unsupported; the ready record or new observation is stale; a committed promotion receipt is invalid; the payment identity changed; both staging and final exist; neither exists; an integrity value changed; or a path/ACL is unsafe. Supply a new receipt only for `ready` with `--payment <private-root-contained-receipt.json>`; do not extend the window, edit evidence or delete the replay reservation.

## 9. Deliver

Delivery is not implemented, live or verified in this candidate. `promoted` means only that a verified package exists at its final private local path. It does not mean sent, downloadable or delivered.

Before a future adapter may deliver, it must obtain a new seller-authenticated provider observation after private materialisation, record a short-lived `delivery-authorized` decision, durably write a `delivery-intent` with an idempotency key, query/retry the provider idempotently, and record a provider-backed `delivered` receipt. Tests must prove that a refund, revocation, dispute or chargeback observed before delivery blocks supply, including every crash/retry boundary. Until that governed adapter and its signed-in mapping are independently verified, do not send files.

Record privately:

- provider completion and final-charge evidence;
- final manifest and evidence hashes;
- delivery timestamp;
- terms/listing version;
- early-start and digital-supply choices;
- correction deadline; and
- private-file deletion due date.

Do not attach raw order/payment JSON or the private `_private` directory. Do not expose HTML render sources, provenance keys, payment hashes, internal control files or birth data in a public support route.

## 10. Corrections and adjustment

Correct AstroPrecise calculation, transcription, rendering and missing-file errors without charge. Re-run the full quality gate and issue a new manifest through an approved replacement process.

Whole Sky includes one reasonable layout adjustment requested within seven calendar days after delivery. Keep the same accepted birth inputs and deliverable scope. A changed birth record, different chart, new brief, extra product or commercial licence is new scope, not the included adjustment.

Do not overwrite an audited final silently. Preserve a private change record and deliver a clearly versioned replacement while keeping customer filenames generic.

## 11. Retention and deletion

Proposed owner-confirmation rule:

- local raw birth inputs and working files: delete within 30 days after final delivery or final agreed correction, whichever is later;
- provider order/accounting evidence: retain only for the confirmed legal/tax schedule;
- public samples: fictional only; and
- operational logs: retain hashes/status without unnecessary birth data.

Record deletion completion without copying the deleted data into the deletion log. Do not delete customer access or required accounting evidence merely because local working data is due for deletion.

No live order may be accepted until a non-identifying scheduled purge and deletion-completion record have been implemented and exercised on a fictional self-order. The proposed 30-day period is draft policy, not proof that deletion automation or an owner-approved retention schedule exists.

## 12. Failure handling

If any intake, generator, renderer, evidence, ledger, payment, package or quality step fails:

1. do not upload files or mark the commission complete;
2. preserve private error context without publishing personal data;
3. identify whether the fault is eligibility, input, calculation, render, packaging, payment, provider or storage;
4. rerun a proof only after the cause is fixed and a clean private proof directory is available;
5. for an interrupted final, inspect the ledger and evidence, then use only the controlled recovery route when its conditions are satisfied;
6. visually inspect again; and
7. tell the buyer promptly through the approved private route if agreed timing is at risk.

Never bypass an age/self-order, page-count, dimension, font, overflow, watermark, provenance, payment, privacy, evidence, ledger or containment check to meet a deadline.

## 13. Deferred gifting and third-party scope

Gifting, birthday-gift artwork, recipient delivery, buyer-copy permissions, vouchers, ordering for another person, third-party birth data and every minor-related flow are outside the first release. Do not test them in a signed-in live order, advertise them, expose them in checkout, accept their data or use dormant gift code to fulfil them.

Any future gift product is a separate research and governance project. It would require its own lawful data model, adult-recipient self-entry, just-in-time notice, objection/withdrawal route, durable records, two-person access controls, provider field-map proof, fulfilment tests, legal review and an independently authorised release. None of that future work is an instruction for the v902 launch.

## 14. Local regression checks

Run only against fictional fixtures and non-customer data:

```powershell
npm run test:fulfil
node tools/test-product-render.mjs
npm run test:shop
npm test
npm run build
git diff --check
```

Some internal regression fixtures may still exercise dormant gift branches. A test pass for those branches does not change the self-order-only catalogue or authorise gifting.

No command result authorises a seller mutation, checkout opening, product publication, production deployment or Coherence seat.
