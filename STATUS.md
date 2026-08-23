# STATUS — AstroPrecise

Updated: 2026-08-23 21:17 BST

## Result first

AstroPrecise now has a tested **v901 Studio preview release candidate**, not a live paid shop. The candidate defines exactly three proposed Gumroad Commission services at £18, £29 and £39, a fail-closed personalised fulfilment route, fictional samples and a commerce/legal launch pack. The release is deliberately stamped `ap-v901`; checkout remains closed. No seller account was changed, no product was published and the legacy Gumroad listing was not archived.

The public Shop was rechecked on 2026-08-23 and still says that nothing is for sale. Public `sw.js` returned HTTP 200 with `ap-v895`. The legacy Gumroad Eclipse URL also returned HTTP 200 at £7 GBP and remains an external owner action. The v901 branch is not production until the protected release review, merge, Pages run and public checks all complete.

## Local Studio offer

| SKU | Product | Price | State |
|---|---|---:|---|
| `natal-sky-print-pack` | Natal Sky Print Pack | £18 | preview draft · checkout closed |
| `personal-sky-keepsake` | Personal Sky Keepsake | £29 | preview draft · checkout closed |
| `whole-sky-edition` | Whole Sky Edition | £39 | preview draft · checkout closed |

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
- The full `npm test` integration suite, `npm run test:launch`, `npm run check:syntax`, `npm run build`, `node tools/test-product-render.mjs`, both dependency audits and `git diff --check` passed. The dependency audits reported zero vulnerabilities.
- Playwright rechecked the release at desktop and 390 × 844 phone widths: one live Observatory model, responsive 3D, exact three-product Shop, three disabled checkouts, no Gumroad sales link, no email form, no overflow and no runtime errors.
- Axe reported zero violations on all 36 audited routes. The rendered Midnight Meridian palette passed on 67 public routes. Production-artifact Lighthouse passed its CI floors on all ten routes: performance 76–97 and accessibility, best practices and SEO 100 throughout; the Shop scored 93/100/100/100.
- The service worker was regenerated as `ap-v901` with 82 launch-shell entries totalling 2,674,835 bytes. Four optional editorial WebPs remain runtime-only rather than bloating the offline install.
- The old frozen Coherence prelaunch wave cannot approve this live release. A fresh Full live/release wave, genuinely independent native review and signed S1 authority are still required before production merge.

## Hard blockers before revenue

1. **Trader disclosure:** supply and publish a full geographic business/service address, plus the legal/trading identity and direct service contact route. Checkout must stay closed without it.
2. **Owner policy decisions:** confirm the five-working-day service target, seven-day layout-adjustment scope, 30-day private-input/working-file deletion rule, supported buyer territories and tax/VAT status.
3. **Signed-in Gumroad proof:** verify Commission eligibility, payout identity and the complete 50% deposit/final-balance workflow. Confirm that an authenticated adapter can query and bind the paid-in-full state before the final unwatermarked delivery is released.
4. **End-to-end test:** test buyer receipt, required inputs, unticked early-start choice, cancellation/refund, completion/final charge, downloadable delivery and deletion.
5. **Authenticated final-release design:** replace the deliberately closed local gate with a seller-authenticated, test-proven payment adapter. Do not treat a self-authored JSON attestation as authentication.
6. **Public legal alignment:** owner-review the launch terms and update the public privacy/refund/contact surfaces for commissioned service processing before any product link appears.
7. **Release governance:** freeze the exact final v901 commit in a fresh Full live/release Coherence wave, obtain independent native review and signed S1 authority, then deploy that identity. The owner trust store and required production identity-header route are not yet configured.
8. **Public verification:** after an approved merge and successful Pages run, verify public `sw.js` is `ap-v901`, the three preview SKUs render logged out and every checkout remains disabled before describing the preview as live.

## Safety rules

- Archive the legacy Gumroad product; do not delete it or strand past buyers.
- Do not use an order ID alone as proof of payment.
- Do not create an unwatermarked final from only a 50% deposit.
- Do not accept unknown or approximate birth times at launch; no time rectification is offered.
- Do not send birth data through public forms, logs, URLs or customer filenames.
- Do not claim urgency, scarcity, reviews, bestseller status, outcomes or live availability without evidence.
- Do not merge production without the independent release receipt and owner authority.

Branch: `codex/v900-midnight-meridian`
Production baseline before this release: `51b2e675ddc9501a75df21bf4fdb7fb17d354a30` (`ap-v895`).
