# AstroPrecise Studio v901 — shop launch runbook

Updated: 2026-08-23

## Outcome

Use this runbook to move the exact three-product local candidate to a controlled Gumroad Commission launch. It does not authorise any external action. Product publication, legacy-product archive and website deployment each require explicit owner confirmation at action time.

## Fixed launch scope

| SKU | Product | Price |
|---|---|---:|
| `natal-sky-print-pack` | Natal Sky Print Pack | £18 |
| `personal-sky-keepsake` | Personal Sky Keepsake | £29 |
| `whole-sky-edition` | Whole Sky Edition | £39 |

No fourth SKU, physical item, instant download, gift workflow, subscription or Ko-fi product belongs in this launch. Ko-fi remains voluntary support-only.

## Gate A — owner facts and legal review

All boxes must be true before any checkout opens:

- [ ] Legal name, trading name and legal form confirmed.
- [ ] Full **geographic business/service address** approved for public display.
- [ ] Direct service/cancellation contact route confirmed.
- [ ] VAT/tax status and accepted territories confirmed.
- [ ] Five-working-day production target confirmed.
- [ ] “Working day” definition confirmed.
- [ ] Whole Sky one reasonable layout adjustment within seven calendar days confirmed.
- [ ] 30-day local raw-input/working-file deletion rule confirmed.
- [ ] Accounting retention schedule confirmed for the operator's legal/tax status.
- [ ] Owner/adviser review completed for the service terms, cancellation, privacy, refund and limitation wording.
- [ ] Current public `terms.html`, `privacy.html`, `refunds.html` and `contact.html` aligned to the Commission service.
- [ ] Model cancellation form contains the completed trader identity/address/contact route.
- [ ] Early-start wording is separate, optional and initially unticked.
- [ ] Saveable/durable post-order confirmation is proven.

The noindex `website/digital-product-terms.html` file is a drafting surface, not launch terms. Do not remove its draft warning or link it from checkout as though the owner gaps were complete.

## Gate B — signed-in seller account

In the intended Gumroad account, record private evidence of:

- [ ] account identity and age;
- [ ] Commission product type availability;
- [ ] payout identity/destination;
- [ ] GBP price display and buyer checkout total;
- [ ] 50% deposit presentation;
- [ ] remaining 50% completion charge;
- [ ] fee treatment;
- [ ] tax/merchant-of-record presentation;
- [ ] required/optional buyer input controls;
- [ ] private Sales drawer contents;
- [ ] upload limits and accepted file types/sizes;
- [ ] completion, refund and cancellation controls;
- [ ] ability to deliver/replace final files after paid-in-full evidence;
- [ ] buyer receipt and library/download behaviour.

Gumroad's current help says Commission products require an account at least 30 days old, collect 50% up front and charge the balance after completion. Treat the signed-in seller UI and a test order as the action-time truth; do not infer eligibility from the help article.

If Commission is unavailable or the final-charge/file-upload sequence conflicts with the paid-in-full fulfilment gate, stop. Do not publish these as ordinary digital products.

## Gate C — create three private drafts

Use `marketing/shop-studio-v901/gumroad-listings.md`.

For each draft:

- [ ] exact title/SKU/GBP price;
- [ ] product type is Commission;
- [ ] exact deliverables and digital-only statement;
- [ ] five-working-day clock described accurately;
- [ ] exact recorded time requirement;
- [ ] no time rectification;
- [ ] home-print limitation;
- [ ] symbolic/not-professional-advice boundary;
- [ ] lawful cancellation/correction wording;
- [ ] separate optional early-start control;
- [ ] fictional watermarked sample only;
- [ ] correct cool-palette cover;
- [ ] no urgency, scarcity, stock theatre, crossed-out launch price, unsupported review, bestseller badge or outcome promise;
- [ ] checkout link remains absent from the website catalogue while draft state is not published.

Do not publish yet.

## Gate D — end-to-end Commission test

Follow Gumroad's current test-purchase guidance: <https://gumroad.com/help/article/62-testing-a-purchase>. Confirm that its test method covers Commission products. If it does not, obtain owner approval for a controlled genuine transaction/refund and account for any non-returned processing fee.

Test at least:

### Buyer/contract

- [ ] Desktop and phone checkout.
- [ ] Full total, deposit and tax visible before commitment.
- [ ] Terms, privacy, cancellation and trader address visible/saveable.
- [ ] Required birth/date/time/place fields.
- [ ] Exact-time acknowledgement.
- [ ] Early-start box unticked by default.
- [ ] Order can be placed without selecting early start.
- [ ] Buyer receives a durable record of terms and consent state.

### Cancellation/work start

- [ ] No-early-start order is blocked locally until 14 days elapse.
- [ ] Early-start order requires a real consent timestamp.
- [ ] Cancellation before work starts can be processed.
- [ ] Cancellation after requested partial performance has a documented proportionate-charge route.
- [ ] Rejected commission returns the deposit.
- [ ] Refund state reaches the seller dashboard and buyer.

### Fulfilment/payment

- [ ] Private order input exported without copying data into the repository.
- [ ] Watermarked proof succeeds.
- [ ] Completion action triggers the remaining 50% exactly as described.
- [ ] Dashboard shows a full-price, non-refunded transaction that the authenticated adapter can query and bind to the exact order.
- [ ] A seller-authenticated adapter is designed and tested; a manually written attestation alone cannot release an unwatermarked final.
- [ ] Adapter receipts use `gumroad-authenticated-adapter-v1` and a valid HMAC from a private `AP_PAYMENT_ADAPTER_SECRET` held outside the repository/order package.
- [ ] `platform.checkoutVerified` remains false until that adapter and the complete Commission sequence are proven.
- [ ] Final ZIP can be uploaded/delivered after payment in full.
- [ ] Buyer can download the exact files.
- [ ] Correction/replacement path works without exposing internal files.
- [ ] Local raw inputs/working files can be deleted on schedule without removing buyer access.

Do not launch if the completion step requires releasing an unwatermarked final before the full charge succeeds.

## Gate E — product QA

For fresh fictional proofs and the deliberately closed final-release gate:

- [ ] `npm run test:fulfil`
- [ ] `node tools/test-product-render.mjs`
- [ ] inspect all pages of both 20-page reading PDFs;
- [ ] inspect A3 and A4 PDFs;
- [ ] inspect all exact-dimension PNGs;
- [ ] verify Whole Sky `SCHEMATIC` label;
- [ ] verify proof watermarks and absence from paid final;
- [ ] verify every PDF page carries the order-bound `AP REF`, every PNG provenance strip decodes to the same reference, and the perceptual flatness gates reject covered/blank artefacts;
- [ ] verify generic filenames and clean ZIP inventory;
- [ ] verify manifests/hashes;
- [ ] verify no PII in filenames, public samples, source, logs or customer manifest;
- [ ] verify no retired orange/brass commerce palette.

Use `docs/PRODUCT-FULFILMENT.md` for the operator procedure.

## Gate F — website integration

Before deployment:

- [ ] `website/data/products-v901.json` contains exactly three products, correct prices and verified checkout URLs.
- [ ] Change catalogue state from draft only after products are actually publish-ready.
- [ ] Shop displays all deliverables, limitations, 50% deposit and five-working-day clock.
- [ ] Shop links the owner-approved public legal/privacy/refund/contact pages.
- [ ] No enabled checkout remains when address/legal/account/test gates are false.
- [ ] Ko-fi remains clearly separate support-only.
- [ ] Public samples are fictional and watermarked.
- [ ] `npm run test:shop`
- [ ] `npm run test:fulfil`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] `git diff --check`
- [ ] required AstroPrecise project hook passes;
- [ ] current Coherence wave receives independent verification and validator receipt.
- [ ] `website/sw.js` is deliberately bumped from local v900 to the exact final v901 cache identity, its precache is reviewed, and the built worker matches the approved commit.

Commit the clean, tested source before deployment. Build from that exact commit.

## Gate G — explicit action-time decisions

Ask the owner separately and concretely:

1. “Publish these exact three Gumroad Commission products now?”
2. “Deploy commit [exact hash] to the public website now?”
3. “Archive the legacy Gumroad Eclipse product [recorded product ID/URL] now while preserving past-buyer access?”

A broad instruction to improve the shop is not a substitute for these action-time confirmations. Do not group deletion into the archive request; deletion is not planned.

## Controlled launch sequence

After every prior gate and the relevant owner confirmation:

1. Capture private screenshots/records of the three final drafts and seller settings.
2. Publish the three Commission products.
3. Open each public listing logged out and verify title, GBP price, deposit, copy, sample, legal links and checkout.
4. Record the exact public URLs/product IDs in the catalogue.
5. Build and deploy the owner-approved commit.
6. Verify public `sw.js` reports the exact v901 identity from the deployed commit and crawl the live Shop logged out.
7. Run a live checkout smoke only to the non-committing review point; verify total, deposit, early-start default and legal/address disclosures.
8. Verify Ko-fi still says support-only and is not presented as a product route.
9. After the separate archive confirmation, use Gumroad's archive control on the legacy Eclipse product.
10. Verify the legacy listing is no longer publicly purchasable and a past buyer can still access the purchase/library route. Do not delete the product.
11. Update `STATUS.md` and `AGENT-HANDOFF.md` with observable public evidence, exact commit, product IDs/URLs and timestamp.

## Post-launch order readiness

Before accepting organic traffic:

- [ ] private order directory exists outside the repository;
- [ ] named operator can fulfil within the confirmed service target;
- [ ] seller-authenticated payment-adapter capture and private evidence procedure are ready;
- [ ] correction/deletion calendar is ready;
- [ ] direct service/cancellation contact is monitored;
- [ ] no sample contains a real customer;
- [ ] no capacity/slot claim is displayed unless it is enforced.

## Rollback

If checkout, legal disclosure, payment, fulfilment or privacy fails:

1. disable public Shop checkout links;
2. archive the affected new product(s) without deleting orders;
3. keep buyer access and communicate with affected buyers;
4. refund/reject commissions where required;
5. restore the last known-good website commit;
6. verify public Shop and service-worker identity;
7. preserve non-PII evidence and keep real order data private;
8. fix and re-run every relevant gate before requesting a new launch approval.

Never restore the legacy Eclipse listing as a shortcut unless the owner separately decides to do so after a fresh legal/product review.

## Official references checked 2026-08-23

- Commission/service setup: <https://gumroad.com/help/article/70-can-i-sell-services.html>
- Product dashboard/archive: <https://gumroad.com/help/article/304-products-dashboard>
- Buyer access: <https://gumroad.com/help/article/199-how-do-i-access-my-purchase>
- Test purchase: <https://gumroad.com/help/article/62-testing-a-purchase>
- Gumroad fees: <https://gumroad.com/help/article/66-gumroads-fees>
- UK distance selling: <https://www.gov.uk/online-and-distance-selling-for-businesses/distance-selling>
- Consumer Contracts Regulations: <https://www.legislation.gov.uk/uksi/2013/3134/contents>
- Consumer Rights Act: <https://www.legislation.gov.uk/ukpga/2015/15/contents>
- E-commerce Regulations: <https://www.legislation.gov.uk/uksi/2002/2013/contents>

Recheck at launch because seller UI, platform terms, fees, law and official guidance can change.
