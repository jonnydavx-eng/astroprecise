# STATUS — AstroPrecise

Updated: 2026-08-23 19:37 BST

## Result first

AstroPrecise now has a **local v901 Studio prelaunch candidate**, not a live shop. The candidate defines exactly three Gumroad Commission services at £18, £29 and £39, a fail-closed personalised fulfilment route, fictional samples and a commerce/legal launch pack. No seller account was changed, no product was published, the legacy Gumroad listing was not archived, and this branch was not pushed or deployed.

The public Shop was rechecked on 2026-08-23 and still says that nothing is for sale. Public `sw.js` returned HTTP 200 with `ap-v895`. The legacy Gumroad Eclipse URL also returned HTTP 200 at £7 GBP and remains an external owner action. Local Studio work is later and must not be described as live.

## Local Studio offer

| SKU | Product | Price | State |
|---|---|---:|---|
| `natal-sky-print-pack` | Natal Sky Print Pack | £18 | local draft |
| `personal-sky-keepsake` | Personal Sky Keepsake | £29 | local draft |
| `whole-sky-edition` | Whole Sky Edition | £39 | local draft |

All three are proposed Gumroad **Commission** services: 50% deposit, balance charged after completion, digital files only. The default service target is five working days. Whole Sky includes one reasonable layout adjustment requested within seven calendar days. Ko-fi remains support-only and provides no paid product or feature.

## What is ready locally

- The old 18-item speculative catalogue has been retired in favour of the exact three-product catalogue above.
- Product generation is fail-closed: while `platform.checkoutVerified` is `false`, every unwatermarked final route is disabled. A manually written seller-dashboard attestation is explicitly insufficient to cross that gate.
- The fulfilment route uses private per-order directories, generic filenames, a lock against duplicate processing, an atomic transaction-replay ledger for the eventual verified flow, all-page PDF/image checks, byte-for-byte customer ZIP checks and mutually bound SHA-256 manifests.
- Final-mode payment evidence must carry an authenticated adapter receipt and a valid HMAC signature. Every generated page and raster is bound to the canonical private input with an `AP REF`; PDF pages are actually rasterised for perceptual inspection, PNGs carry a decoded pixel provenance strip, and the quality gate rechecks work-start authority at delivery time.
- The Whole Sky image is visibly labelled `SCHEMATIC`; it is an authored compressed whole-system view using computed body positions, not a photograph, live feed or true-scale scientific rendering.
- The public service-terms candidate is `noindex` and visibly marked as a launch draft, not a current offer.
- Exact listing copy, buyer questions, cancellation wording, privacy/retention rules and publish/rollback checks are documented under `marketing/shop-studio-v901/` and `docs/`.
- Self-hosted webfonts now have a repository licence file and an evidence-based family/file map.

## Evidence and verification state

- A full fictional Whole Sky proof has completed the local fulfilment quality gate, including 20-page screen and ink-light readings, A3/A4 plates, five exact-dimension print/social PNGs, a 4800 × 3600 Observatory still, ZIP inventory and manifests.
- `npm run test:shop` passed. `npm run test:fulfil` passed twice independently after the final Observatory tolerance profile, including stale-input rebinding, white-covered PDF, black-raster, ZIP-tamper, payment-signature and generator-liveness attacks.
- The full `npm test` integration suite, `npm run build`, `node tools/test-product-render.mjs`, `npm audit --audit-level=high` and `git diff --check` passed. The dependency audit reported zero vulnerabilities.
- Playwright rechecked source and built output at 1440 × 1000 and 390 × 844. Both expose exactly three disabled-checkout products, three loaded 1280 × 720 covers, working PDF sample responses, the support anchor, no horizontal overflow, and no console, page or failed-request errors. Source and built screenshots were byte-identical at both widths.
- The current Coherence wave still requires its validator-owned completion and independent receipt. Do not claim `VERIFIED-LOCAL` until that receipt is issued.

## Hard blockers before revenue

1. **Trader disclosure:** supply and publish a full geographic business/service address, plus the legal/trading identity and direct service contact route. Checkout must stay closed without it.
2. **Owner policy decisions:** confirm the five-working-day service target, seven-day layout-adjustment scope, 30-day private-input/working-file deletion rule, supported buyer territories and tax/VAT status.
3. **Signed-in Gumroad proof:** verify Commission eligibility, payout identity and the complete 50% deposit/final-balance workflow. Confirm that an authenticated adapter can query and bind the paid-in-full state before the final unwatermarked delivery is released.
4. **End-to-end test:** test buyer receipt, required inputs, unticked early-start choice, cancellation/refund, completion/final charge, downloadable delivery and deletion.
5. **Authenticated final-release design:** replace the deliberately closed local gate with a seller-authenticated, test-proven payment adapter. Do not treat a self-authored JSON attestation as authentication.
6. **Public legal alignment:** owner-review the launch terms and update the public privacy/refund/contact surfaces for commissioned service processing before any product link appears.
7. **Deployment cache identity:** deliberately bump the service worker to the final v901 release and verify its precache from the exact approved commit; the current local worker is still v900 and production was observed at v895.
8. **Explicit mutations:** obtain action-time owner confirmation before archiving the legacy Gumroad product, publishing the three new drafts or deploying the website.

## Safety rules

- Archive the legacy Gumroad product; do not delete it or strand past buyers.
- Do not use an order ID alone as proof of payment.
- Do not create an unwatermarked final from only a 50% deposit.
- Do not accept unknown or approximate birth times at launch; no time rectification is offered.
- Do not send birth data through public forms, logs, URLs or customer filenames.
- Do not claim urgency, scarcity, reviews, bestseller status, outcomes or live availability without evidence.
- Do not push or deploy without the owner.

Branch: `codex/v900-midnight-meridian`
Starting frozen commit for this pass: `ea9ff78`
