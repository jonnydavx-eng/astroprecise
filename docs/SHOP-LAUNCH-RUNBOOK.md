# AstroPrecise Studio — controlled launch runbook

Updated: 2026-08-24

## Current truth

AstroPrecise v901 is a checkout-closed release candidate, not a live paid shop.
The public site remains v895 until the exact v901 candidate completes Coherence,
Cloudflare Pages release proof and owner-controlled launch checks.

The launch offer is exactly three personalised Gumroad Commission services:

| SKU | Price | Status |
|---|---:|---|
| Natal Sky Print Pack | £18 | draft; no checkout URL |
| Personal Sky Keepsake | £29 | draft; no checkout URL |
| Whole Sky Edition | £39 | draft; no checkout URL |

Each SKU has `self` and adult recipient-controlled `gift` purchase modes at the same price. Gift mode is not a fourth listing. It is birthday-only at launch: recipient present and self-entering, recipient pays nothing, recipient-default delivery, no surprise/minor/buyer-entered-data route, and buyer copy only with separate unticked recipient authorisation.

Ko-fi remains optional support. It does not buy a Studio product, reserve a slot,
accelerate delivery or unlock a file.

This runbook prepares external actions; it does not silently authorise them.
Seller identity, address, tax status, payout setup, product publication, legacy
listing archive, DNS/custom-domain cutover and production deployment need the
owner at the relevant account screen.

## Stop conditions

Do not open checkout while any item below is unresolved:

- full public legal/trading identity and geographic service address;
- direct electronic contact route and supported customer territories;
- tax/VAT position and Gumroad checkout treatment confirmed;
- five-working-day target, seven-day layout adjustment and 30-day working-file
  deletion rule approved by the owner;
- final public terms, privacy, refund/cancellation and contact pages approved;
- gift-recipient legitimate-interests assessment completed and owner-approved;
- adult recipient self-entry, just-in-time privacy notice, recipient-default delivery,
  separate unticked buyer-copy authorisation, objection/withdrawal and deletion
  proved without exposing recipient data/files to the buyer;
- Cloudflare Pages project, protected GitHub environment and custom domains set;
- Gumroad account age, Commission eligibility, payout identity and seller review
  state checked while signed in;
- exact Commission deposit, upload, completion, final charge, refund and file
  replacement sequence proven with Gumroad's test-purchase route;
- authenticated paid-in-full fulfilment adapter implemented and verified;
- one complete fictional test order covers intake, consent, proof, correction,
  immutable buyer/recipient confirmation delivery, final delivery, receipt
  retention and deletion;
- final candidate independently reviewed and owner-authorised through Coherence;
- old Eclipse listing made unavailable and then archived only after direct-link
  verification and owner confirmation;
- owner explicitly approves the three new listings and public deployment.

## 1. Owner decision sheet

Record these facts privately. Do not invent placeholders in public pages.

| Decision | Required value |
|---|---|
| Legal operator name | exact person/company taking the contract |
| Trading name | AstroPrecise relationship to that operator |
| Geographic address | address that may lawfully be shown before ordering |
| Direct contact | monitored email and any required additional route |
| Territories | countries in which orders will be accepted |
| Tax/VAT | registration/status and who confirms checkout treatment |
| Service target | approve or replace five working days |
| Layout adjustment | approve or replace seven calendar days and scope |
| Private work retention | approve or replace 30 days after final correction, or after final delivery if none is agreed; whichever date is later |
| Private order storage | approve an absolute non-synced directory, restrictive Windows ACL, device-encryption/backup boundary and purge owner |
| Refund reserve | sufficient Gumroad balance and operating rule for statutory/quality refunds |
| Data complaints | monitored route, 30-day acknowledgement owner and complaint register |
| Children assessment | record whether the wider free service is likely to be accessed by children and any higher-protection measures required |
| ICO fee | exemption or current tier/payment evidence |
| Capacity | maximum concurrent commissions and pause rule |
| Gift privacy | approve the LIA, adult-only self-entry boundary and recipient objection route |
| Gift delivery | approve recipient-default delivery and separate unticked buyer-copy wording |

If a home address cannot safely be published, obtain a suitable business/service
address before launch. A contact form or email alone is not a substitute for a
required geographic address.

Before the first real order, set `AP_STUDIO_PRIVATE_ORDERS_ROOT` to an absolute
access-restricted directory outside the repository, verify its Windows ACL and
device-encryption/backup boundary, and exercise a non-identifying scheduled
purge on a fictional order. The final orchestrator rejects a missing, relative
or repository-contained private root; that path guard does not replace the ACL
and deletion tests.

Before any commissioned proof work, preserve the exact dated terms/privacy
attachments and the sent buyer confirmation as immutable files, then record its
safe private filename, bundle schema, UTC sent time and SHA-256 in the order.
Gift work additionally requires the recipient bundle's corresponding quartet.
The orchestrator re-hashes both files beside the private order. `assertWorkMayStart()` fails closed when
either required record is missing, pre-dates the relevant contract/confirmation,
pre-dates a choice reproduced in that confirmation, or is in the future. The future signed-in adapter must authenticate who caused
each record; the local hashes prove consistency, not identity.

Minimal data-complaint register (keep it access-restricted and do not duplicate
raw birth details): case ID; received/acknowledged dates; safe contact route;
complaint and any linked rights-request category; handler; risk/escalation;
enquiries; material progress updates; outcome/date; ICO escalation; and retention
or deletion due date. Test acknowledgement, progress and outcome messages with a
fictional case before launch.

## 2. Cloudflare Pages setup

GitHub's current Pages terms do not allow an online business/e-commerce site
whose primary purpose is facilitating commercial transactions. AstroPrecise
therefore uses Cloudflare Pages before paid checkout opens.

Use the free plan. No Cloudflare Pro purchase is required for this static launch.

Owner/admin setup:

1. Use the existing **Direct Upload** Pages project named `astroprecise`, whose
   production branch is `main`. Read-only verification on 24 August 2026 found a
   current `astroprecise.pages.dev` production deployment and no custom domain
   attached to this project. Do not create a duplicate project. The protected release
   command passes that exact branch because Wrangler can infer detached `HEAD`
   inside CI when no branch is supplied. The workflow then rejects the deployment
   unless Wrangler reports the resulting Pages environment as `production`.
2. Create a GitHub environment named `cloudflare-pages`. Require the owner or
   designated reviewer and allow only protected `release/*` tags.
3. Add environment secrets `CLOUDFLARE_ACCOUNT_ID` and
   `CLOUDFLARE_API_TOKEN`. The token needs only Account → Cloudflare Pages → Edit
   for the relevant account. Do not grant zone-wide write or Rulesets access to
   the deployment token.
4. In the Pages project, associate `astroprecise.app` and
   `www.astroprecise.app` as custom domains. The apex zone must be in the same
   Cloudflare account. Add domains through Pages before changing DNS; a manual
   CNAME alone can fail or produce an inactive association. Both names must
   directly return the candidate during release proof; remove or disable any
   apex/`www` canonical redirect for that proof because Pages applies redirects
   before `_headers`.
5. Review the resulting DNS changes in an exclusive change window. Preserve all
   unrelated DNS records. The old GitHub Pages A/CNAME targets should disappear
   only as part of this approved cutover.
6. Confirm Pages serves the repository's `_headers` security policy. The release
   build replaces exactly one `__ASTROPRECISE_CANDIDATE_SHA__` placeholder in
   `dist/_headers`; uploading `website/` directly cannot pass release proof.

The retired `tools/setup-cloudflare-release-edge.mjs --apply` route is disabled.
The tool is now a tokenless GET-only verifier. Cloudflare project/domain mutation
belongs in the owner-controlled account and the protected deployment workflow.

## 3. Exact-identity release

The workflow `.github/workflows/deploy-pages.yml` is manual-only and deny-by-
default. It accepts one lowercase 40-character candidate SHA and must be started
from a protected immutable tag named:

```text
release/ap-v901-<first-12-characters-of-the-exact-SHA>
```

Before creating the tag:

1. Ensure the entire intended PR diff is represented by a fresh Full Coherence
   wave, not merely a later infrastructure subset.
2. Run the recorded S8 proof on a clean tree and freeze the exact commit.
3. Obtain S12 from a genuinely different native top-level agent session. A
   subagent, second shell or renamed actor in the implementer's session does not
   satisfy independence.
4. Record the manifest-declared S11, S4, S7, S2 and S5 reviews against that same
   frozen commit.
5. Install and use the owner-authority signer; import S1 only after all peer
   evidence passes.
6. Confirm the `release/*` ruleset prevents update/deletion and that the
   `cloudflare-pages` environment requires the intended reviewer.

Read-only GitHub verification on 24 August 2026 found no repository rulesets and no classic branch protection. Treat both the protected release-tag ruleset and the `cloudflare-pages` reviewer environment as unproved until the owner configures and rechecks them; do not weaken the workflow to compensate.

The workflow then:

- validates repository, event, protected tag, tag suffix, checked-out SHA,
  unique release version and `website/sw.js` version;
- runs dependency audits, canonical tests, syntax, launch, UI, accessibility,
  profile-security, palette and production Lighthouse gates;
- builds `dist/` and stamps the SHA identity JSON plus exact response header;
- deploys through Wrangler 4.125.0 using a full-SHA-pinned Cloudflare action;
- verifies the immutable `pages.dev` deployment URL;
- verifies a direct, non-redirecting root response plus the exact candidate
  header, identity JSON and `ap-v901` service worker on both custom domains;
- calls IndexNow only after both public-domain checks pass.

If the project or custom domains are not ready, the workflow must fail. Do not
reinterpret a failed post-deploy job as a completed release.

## 4. Gumroad seller test

Use Gumroad's Commission product type, not the ordinary-product API. The retired
`tools/gumroad-provision.mjs` always exits with an error so it cannot create the
old 13-product catalogue.

While signed in:

1. Confirm the account is at least 30 days old and Commission is available.
2. Confirm payout identity, destination, currency and any review/hold notice.
3. Create exactly three **unpublished drafts** matching
   `website/data/products-v901.json`; do not add checkout URLs yet.
4. Verify the total GBP price, 50% deposit, fee/tax display, required buyer
   questions, separate optional early-start and early digital-supply choices, message thread, upload limits,
   cancellation/refund controls and completion action.
   Treat all 50% wording as a draft assumption until this test proves it.
5. For `self`, prove the subject enters their own exact details.
6. For `gift`, prove the adult recipient—not the buyer—enters their own details,
   receives the notice, records the exact canonical confirmation fields, pays
   nothing and receives files by default. Prove the buyer cannot view those
   details/files without separate recipient authorisation.
   The canonical order must bind the exact dated immutable recipient privacy
   notice version and SHA-256 hash; a mutable webpage link is insufficient.
7. Prove buyer-copy authorisation starts unticked, is attributable to the
   recipient, is optional, records wording/state/time, and can be withdrawn at any
   time so later copies/replacements stop. Prove under-18, surprise, absent-recipient and buyer-entry paths fail.
8. Use Gumroad's test-purchase feature. Do not buy your own listing with your
   card.
9. Capture screenshots or exported evidence without exposing credentials or
   customer data.

If Gumroad cannot prove the two-person recipient intake, private recipient
delivery and buyer-copy controls, keep `gift` unavailable. A later
owner-approved first release may offer the same three SKUs in `self` mode only;
do not approximate the gift flow with buyer-entered fields, shared links or an
unverified add-on.

Current Gumroad guidance says the 50% deposit is credited to the seller balance
immediately and the remaining 50% is charged after the seller uploads files and
marks the commission complete. That creates a deliberate fulfilment problem:
AstroPrecise refuses to generate/release an unwatermarked final until paid in
full, while Gumroad requests an upload before the final charge.

Do not mark a commission complete while only a watermarked proof exists, and do
not rely on replacing that proof after charging the buyer. Resolve the sequence
with account-visible evidence from an unpublished test commission. A usable final
must exist at the point the buyer is told the work is complete, while the local
pipeline must still prevent unauthorised release. If Gumroad cannot support both
conditions, redesign the checkout/fulfilment sequence before publication; never
silently weaken the paid-in-full gate or redefine a proof as a completed order.

The adapter must bind seller-authenticated order ID, SKU, expected amount,
currency, paid-in-full state and verification time to the local HMAC receipt.
An order ID, buyer screenshot, deposit, local note or manually edited JSON is not
payment authority.

## 5. Test order and unit economics

Use fictional data and complete the full lifecycle once for `self` and once for `gift`:

- pre-contract information and explicit terms acceptance;
- optional early-performance choice stored separately;
- valid birth input and ambiguity rejection;
- proof render and visual/perceptual checks;
- buyer correction route;
- final-charge evidence and authenticated adapter receipt;
- final render, ZIP and SHA-256 manifest;
- delivery/completion record;
- cancellation/refund exercise;
- deletion of raw inputs and working files on the recorded due date.
- for gift: recipient confirmation/notice, buyer attestation, recipient-default
  delivery, buyer-copy refusal and authorised-copy/withdrawal variants;
- gift artifact dimensions/page count, computed Moon truth label and recipient
  objection/rejected-order route.

Time each operator step. For each SKU calculate:

```text
net contribution = checkout receipts - Gumroad/payment fees - refunds -
                   tax provision - (operator hours × chosen hourly floor)
```

Do not call £18/£29/£39 profitable until this measured test is complete. If the
lowest tier cannot meet the hourly floor, raise the price or remove it before
publication; do not subsidise it with unmeasured labour.

Time gift composition, dual confirmations and recipient support separately. Do not call the same-price gift mode profitable merely because the self-order timing passes.

## 6. Owner-controlled launch order

1. Fill the owner decision sheet.
2. Complete and owner-approve the gift LIA, then review public legal/privacy/refund/contact pages.
3. Create Cloudflare Pages project, protected environment and custom domains.
4. Finish the adapter and fictional end-to-end seller test.
5. Freeze and independently verify the final whole candidate; obtain S1.
6. Create the one immutable release tag and dispatch the protected workflow.
7. Verify the Pages deployment URL and both public domains report the exact SHA.
8. Make the legacy Eclipse listing unavailable, confirm its direct URL cannot be
   purchased, then archive it while preserving past-buyer access.
9. Recheck the three drafts, URLs and public terms in a logged-out browser.
10. Obtain the owner's final publication confirmation; publish only those three
    products and wire only the verified checkout URLs.
11. Make one controlled first sale, measure fulfilment and pause automatically
    if any receipt, charge, file replacement, support or deletion step fails.

## 7. Rollback

Code rollback is a new reviewed commit and release tag; never move or reuse an
immutable release tag. Cloudflare Pages retains deployment history, but a
dashboard rollback still needs owner approval and exact public identity proof.

If checkout is unsafe, first disable/unpublish the affected Gumroad listing, then
remove its shop URL in a governed release. Preserve customer access, receipts and
legally required accounting records. Never delete customer evidence merely to
make the dashboard look clean.

## Current sources to recheck at action time

- GitHub additional product terms: <https://docs.github.com/en/site-policy/github-terms/github-terms-for-additional-products-and-features>
- Cloudflare Pages direct-upload CI: <https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/>
- Cloudflare Pages custom domains: <https://developers.cloudflare.com/pages/configuration/custom-domains/>
- Cloudflare Pages headers: <https://developers.cloudflare.com/pages/how-to/add-custom-http-headers/>
- Gumroad Commission: <https://gumroad.com/help/article/70-can-i-sell-services.html>
- Gumroad fees: <https://gumroad.com/help/article/66-gumroads-fees.html>
- Gumroad test purchase: <https://gumroad.com/help/article/62-testing-a-purchase.html>
- GOV.UK distance selling: <https://www.gov.uk/online-and-distance-selling-for-businesses/distance-selling>
- ICO data-protection fee: <https://ico.org.uk/for-organisations/data-protection-fee/>
- ICO legitimate interests: <https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/a-guide-to-lawful-basis/legitimate-interests/>
- ICO right to be informed: <https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/the-right-to-be-informed/>

Platform rules, fees and account screens can change. Recheck them while signed in
before each irreversible or public action.
