# AstroPrecise Studio v901 — shop launch runbook

Updated: 2026-08-23

## Outcome

Use this runbook to move the exact three-product local candidate to a controlled Gumroad Commission launch. It does not authorise any external action. Product publication, legacy-product withdrawal, website deployment and Cloudflare mutation each require explicit owner confirmation at action time.

As of 2026-08-23, this is a prepared release candidate only. The public site still serves `ap-v895`; the three v901 products have no live checkout URLs; seller authentication, owner signing and the protected release are still incomplete. Do not describe the shop, v901 or any product as live until the observable checks below pass.

## Fixed launch scope

| SKU                     | Product               | Price |
| ----------------------- | --------------------- | ----: |
| `natal-sky-print-pack`  | Natal Sky Print Pack  |   £18 |
| `personal-sky-keepsake` | Personal Sky Keepsake |   £29 |
| `whole-sky-edition`     | Whole Sky Edition     |   £39 |

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
3. “Make the legacy Gumroad Eclipse product [recorded product ID/URL] unavailable, then archive it while preserving past-buyer access now?”
4. “After that exact commit is observably deployed, proxy the five verified Cloudflare DNS records and set the one candidate-identity rule to [exact hash] now?”

A broad instruction to improve the shop is not a substitute for these action-time confirmations. Do not group deletion into the archive request; deletion is not planned.

## Gate H — immutable, identity-verifiable website release

The public identity claim has four parts which must agree: the unique immutable Git tag, the GitHub Actions deployment SHA, the SHA-named identity file inside the deployed Pages artifact and the one Cloudflare response header. A successful build, a matching `ap-v###` string or a visible page on its own is not proof of that agreement.

### One-time GitHub protection setup

Complete this before creating the release tag:

- [ ] In **Settings → Environments → github-pages**, allow only protected `release/*` tags to deploy.
- [ ] Add the available independent required reviewer; prevent self-review and disable administrator bypass where the plan supports it.
- [ ] Add a tag ruleset targeting `release/*` which prevents updates and deletion. Do not allow force-updates.
- [ ] Confirm the Pages workflow is manual, accepts an exact candidate SHA, proves that SHA belongs to the selected immutable `release/*` tag, checks out the SHA rather than a moving branch and records the deployed SHA.
- [ ] Keep `main` and `gh-pages` pushes out of the deployment allow-list. Merging source is not deployment authority.

Record screenshots or exported settings privately. Repository configuration can drift; recheck it for every launch.

`GITHUB_REF_PROTECTED=true` proves only that GitHub matched some protection rule; it does not prove that the live rule forbids tag update/deletion or has no bypass. The repository cannot self-attest its own administrative settings. The owner must recheck the tag ruleset and `github-pages` environment before every dispatch. The required protected-environment reviewer is the authoritative deployment gate in GitHub; the workflow does not claim that repository code alone cryptographically enforces the local Coherence S1 envelope.

### Coherence and owner-authority order

1. Start a fresh Full/L3 live-release wave with every implementation, workflow, domain/security and truth-claim target declared before editing.
2. Complete implementation and every required independent peer review. A builder cannot issue its own independent approval.
3. Freeze the exact candidate SHA and immutable PreEdit identity; run the validator-owned gates.
4. Only after peer evidence is present, obtain the real owner/S1 signature for that exact wave, SHA, PreEdit digest/version, owner instruction and canonical URL. Never generate, copy or sign with the owner's private key from the repository or a builder session.
5. For a new version, create one new protected release tag at that exact SHA. Never move, recreate, repoint or delete it, and never assign that `ap-v###` service-worker version to another tag; the dispatch verifier rejects more than one `release/<version>-*` tag. Re-dispatching the same existing immutable tag is reserved for a deliberate deploy or rollback of that exact candidate.
6. Dispatch the protected Pages workflow using that tag/SHA and record the run URL, environment approval and observed deployment SHA.

If any identity differs, stop. Start a corrected wave/tag; do not rewrite history or edit evidence to fit.

### Cloudflare edge identity

The edge tool is deliberately narrow. Its default and `--dry-run` modes are offline. `--verify-public` reads only the public site. `--verify` reads Cloudflare configuration and public responses. Mutation requires both `--apply` and an exact lowercase 40-character candidate SHA.

Use separate least-privilege tokens where possible. `--verify` needs Zone Read, DNS Read and Transform Rules Read. `--apply` needs Zone Read, DNS Write/Edit and Transform Rules Write/Edit. Limit both tokens to the `astroprecise.app` zone. The tool calls only zone-scoped Rulesets endpoints; do not grant Account Rulesets access. Keep `CLOUDFLARE_API_TOKEN` in the existing private environment or `secrets/.env.local`; never paste it into a command, log, issue, repository or handoff.

```powershell
# Offline: safe before authentication and safe in review.
node tools/setup-cloudflare-release-edge.mjs --dry-run --candidate <exact-40-character-sha>

# After the exact tag deployment is observable: explicit external mutation.
node tools/setup-cloudflare-release-edge.mjs --apply --candidate <exact-40-character-sha>

# Token-backed state + public verification; never mutates.
node tools/setup-cloudflare-release-edge.mjs --verify --candidate <exact-40-character-sha>

# CI/public proof without reading a Cloudflare token; never mutates.
node tools/setup-cloudflare-release-edge.mjs --verify-public --candidate <exact-40-character-sha>
```

The apply route will only proxy the existing four GitHub Pages apex A records and the existing `www` CNAME. It refuses missing, unexpected or duplicate targets. It preserves unrelated DNS and Transform Rules, refuses duplicate/conflicting candidate-header rules and creates or updates one stable `http_response_headers_transform` rule using `set`:

```text
http.host in {"astroprecise.app" "www.astroprecise.app"}
X-Coherence-Candidate-Tip = <exact-40-character-sha>
```

It does not create DNS content, broaden caching, purge caches or publish products. `--apply` first proves that the worktree is clean, `HEAD` is the requested SHA, the one local version tag resolves to that SHA and apex/`www` both serve `/.well-known/astroprecise-release/<sha>.json` with the exact tag, SHA and version generated by the protected workflow. A matching `ap-v###` alone cannot authorise a stamp.

Transform changes use Cloudflare's single-rule `PATCH`/`POST` endpoints, never a whole-ruleset replacement. Every successful write must return the exact full managed-rule definition plus rule and ruleset `version`/`last_updated` receipts, each at the documented immediate next numeric version from the pre-write snapshot. Before DNS is touched, automatic Transform rollback is allowed only while the current GET still matches those exact receipts; the rollback response and a second GET must then agree on the exact restored rule and immediate next revisions. A created rule is deleted only by the exact ID and revisions returned to this invocation, never by description, matching content or whole-ruleset deletion. Extra headers or writable fields make a rule non-matching. Cloudflare offers no compare-and-swap for Rulesets writes, so successor checks detect a race after the write but cannot prevent the first overwrite; any gap, stale response or changed receipt produces `MANUAL RECOVERY REQUIRED`. The exclusive Cloudflare change window applies to Transform Rules as well as DNS.

The five DNS proxy flags use one batch database transaction. Set `mutationAttempted` before awaiting that request: after any non-empty DNS batch attempt, including a timeout or error response, the tool performs no automatic DNS or Transform rollback. Cloudflare offers no compare-and-swap for either operation, and a control-plane read cannot prove distributed DNS convergence or distinguish a concurrent operator's identical choice. The safer failure state retains both the proxy flags and candidate header for inspection and manual recovery after convergence. Run apply only in an exclusive Cloudflare change window with no other DNS/Rulesets writer. The tool finishes by proving that apex and `www` each return exactly one matching `X-Coherence-Candidate-Tip`, the SHA-specific identity JSON and the strict public `sw.js` version. Use `set`, never `add`, so duplicate identity headers cannot accumulate.

Cloudflare documents that DNS batch propagation is not atomic even though its database write is transactional. Therefore a resolver/edge convergence interval remains possible; the tool retries exact public proof for about five minutes, then stops with explicit manual-recovery instructions while retaining the identity rule if proof never converges. Do not promise zero transient exposure or automatic DNS recovery.

The first protected workflow run can deploy the exact Pages artifact and then stop at its tokenless `--verify-public` post-deploy check because Cloudflare has not yet been applied. GitHub Pages publishes before that check and offers no staging/automatic rollback in this workflow, so environment approval is an approval to make the candidate publicly visible—not merely to test it. Confirm the deployed SHA-specific identity file and strict `sw.js`, obtain the separate Cloudflare action-time approval, run `--apply`, then rerun the failed post-deploy job. IndexNow or any downstream “release complete” step must remain after the successful public identity check.

The DNS inspection paginates every exact-name result and considers apex/www A, AAAA, CNAME, HTTPS and SVCB routing. It refuses unexpected or conflicting routing, including an unproxied bypass. TXT, MX and CAA records are left untouched.

## Controlled launch sequence

After every prior gate and the relevant owner confirmation:

1. Capture private screenshots/records of the three final drafts and seller settings.
2. Publish the three Commission products.
3. Open each public listing logged out and verify title, GBP price, deposit, copy, sample, legal links and checkout.
4. Record the exact public URLs/product IDs in the catalogue.
5. Complete Gate H and deploy the exact owner-approved tagged commit.
6. Apply and verify the Cloudflare identity edge for that exact SHA; then independently verify public `sw.js` reports the exact v901 identity and crawl the live Shop logged out.
7. Run a live checkout smoke only to the non-committing review point; verify total, deposit, early-start default and legal/address disclosures.
8. Verify Ko-fi still says support-only and is not presented as a product route.
9. After the separate legacy-withdrawal confirmation, first make the Gumroad Eclipse listing unavailable/unpublished using the current seller control, then archive it to preserve history and buyer access if those are separate controls.
10. Open the legacy direct URL logged out and prove that it cannot be purchased. Archive status alone is insufficient because a direct link may remain purchasable. Confirm a past buyer can still access the purchase/library route. Do not delete the product.
11. Update `STATUS.md` and `AGENT-HANDOFF.md` with observable public evidence, exact commit, release tag, workflow run, candidate header, product IDs/URLs and timestamp.

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
5. re-dispatch the last known-good commit's **existing immutable** protected `release/ap-vNNN-<sha12>` tag with its exact SHA and obtain the required environment approval; never create a second tag for an already used `ap-vNNN`, and never move, recreate or delete either release tag;
6. set the Cloudflare candidate header to the rollback commit only after that deployment is observable, then verify exactly one header and the matching public service-worker identity on apex and `www`;
7. preserve non-PII evidence and keep real order data private;
8. fix and re-run every relevant gate before requesting a new launch approval.

Never restore the legacy Eclipse listing as a shortcut unless the owner separately decides to do so after a fresh legal/product review.

If the failed release exposed checkout, close checkout first. A website rollback is not a substitute for withdrawing an unsafe seller listing.

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
- GitHub Pages custom workflows: <https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages>
- GitHub Actions manual dispatch refs: <https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_dispatch>
- GitHub deployment environments: <https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments>
- Cloudflare response-header Transform Rule API: <https://developers.cloudflare.com/rules/transform/response-header-modification/create-api/>
- Cloudflare response-header operations: <https://developers.cloudflare.com/rules/transform/response-header-modification/reference/parameters/>
- Cloudflare single-rule API operations: <https://developers.cloudflare.com/ruleset-engine/rulesets-api/endpoints/>
- Cloudflare DNS batch transaction/propagation boundary: <https://developers.cloudflare.com/dns/manage-dns-records/how-to/batch-record-changes/>
- Cloudflare HTTPS/SVCB routing records: <https://developers.cloudflare.com/dns/manage-dns-records/reference/dns-record-types/>

Recheck at launch because seller UI, platform terms, fees, law and official guidance can change.
