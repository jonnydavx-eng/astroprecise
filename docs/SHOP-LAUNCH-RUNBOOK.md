# AstroPrecise Studio — controlled v902 launch runbook

Updated: 2026-08-24

## Current truth

AstroPrecise v902 is a checkout-closed candidate, not a live paid shop. Public
v895 remains in place until the exact v902 commit passes Coherence, protected
Cloudflare release proof and owner-controlled account checks.

The proposed first release is exactly three personalised Gumroad Commission
services:

| SKU | Price | First-release mode | Current state |
|---|---:|---|---|
| Natal Sky Print Pack | £18 | adult self-order | draft; no checkout URL |
| Personal Sky Keepsake | £29 | adult self-order | draft; no checkout URL |
| Whole Sky Edition | £39 | adult self-order | draft; no checkout URL |

Gifting, buying for someone else, vouchers, delayed redemption, minors,
recipient intake and all third-party birth-data flows are deferred. They are not
a launch blocker because they are not part of this release. Do not restore gift
copy, controls, images or fulfilment branches to the deployable surface.

Ko-fi remains voluntary support only. It does not buy a Studio product, reserve
a slot, accelerate delivery or unlock a file.

This runbook prepares actions. It does not authorise account mutation,
publication, archive, DNS change or deployment. Passwords, MFA codes, recovery
codes and payment credentials stay with the owner and must never be copied into
the repository or chat.

## Hard stop conditions

Keep checkout closed while any of the following is unresolved:

- legal operator and trading status;
- publishable geographic business/service address and monitored direct contact;
- supported territories, tax/VAT position and tax-inclusive checkout total;
- approved five-working-day target, seven-day Whole Sky layout-adjustment scope
  and private-working-file retention/deletion rule;
- owner-approved public Terms, Privacy, Refunds and Contact pages;
- signed-in Gumroad Commission eligibility, seller/payout identity and account
  review/hold state;
- exact deposit, completion, final-charge, receipt, refund and delivery sequence;
- authenticated seller event mapping for paid-in-full evidence;
- access-restricted private storage, recovery, backup/encryption and purge proof;
- one complete fictional self-order from intake through deletion;
- a clean, exact candidate with every required Coherence seat and owner S1;
- protected GitHub release tag/environment and verified Cloudflare project,
  preview, production branch, domains and least-privilege credentials;
- explicit owner approval for each listing publication, legacy-listing archive,
  checkout wiring and production deployment.

## 1. Owner decision sheet

Record these privately and approve the corresponding public wording. Do not
invent placeholders or infer facts from an account name.

| Decision | Required value |
|---|---|
| Legal operator | exact person/company taking the contract |
| Trading status | exact relationship between AstroPrecise and operator |
| Geographic address | lawful address shown before an order is placed |
| Direct contact | monitored email and any other required route |
| Territories | countries in which orders will be accepted |
| Tax/VAT | registration/status and owner of checkout-total verification |
| Service target | approve or replace five working days |
| Whole Sky adjustment | approve or replace seven calendar days and scope |
| Private retention | approve the candidate's 30-day deletion rule or replace it |
| Private order store | absolute non-synced path, ACL owner, encryption/backup boundary |
| Refund reserve | operating reserve and refund owner |
| Complaints/rights | monitored route, handler, response and escalation owner |
| ICO fee | current exemption or tier/payment evidence |
| Capacity | maximum concurrent orders and pause rule |

If a home address cannot safely be published, obtain an appropriate lawful
service address before launch. An email address alone is not a substitute where
a geographic address is required.

## 2. Native signed-in Gumroad proof

The owner performs this in Gumroad's own signed-in test facility. Do not use a
real self-purchase card and do not publish a listing during the test.

1. Confirm the account is eligible for Commission products and record any age,
   sales-history, review or payout restriction.
2. Confirm legal seller identity, payout destination, currency and hold state.
3. Create or inspect exactly three **unpublished** self-order drafts matching
   `website/data/products-v901.json`. Keep checkout URLs out of the catalogue.
4. Verify the GBP total and tax display, stated deposit, Gumroad fees, required
   buyer questions, optional early-start choice, cancellation/refund controls,
   message thread, upload limits and completion action.
5. Prove the buyer can supply only their own adult, known, exact recorded birth
   details. Reject another person's data, a minor, an unknown/approximate time,
   a surprise gift, voucher or delayed redemption.
6. Prove the usable final can exist when the commission is marked complete while
   the local pipeline still blocks unwatermarked release until authenticated
   paid-in-full evidence exists.
7. Test receipt, cancellation, refund, completion, final charge, delivery and
   payout state. Capture only redacted evidence; never credentials or real birth
   data.

Gumroad's public Commission description is not enough to prove this account's
actual sequence. If the signed-in sequence cannot satisfy both truthful
completion and paid-in-full release, stop and redesign fulfilment before any
publication.

## 3. Authenticated private fulfilment proof

Use `tools/fulfil-order.mjs`; do not run lower-level generators on real inputs.

Before the first real order:

1. Set `AP_STUDIO_PRIVATE_ORDERS_ROOT` to an absolute access-restricted path
   outside the repository and synced consumer folders.
2. Verify restrictive Windows ACLs, device encryption/backup ownership and an
   auditable purge schedule with fictional data.
3. Create a separate high-entropy `AP_STUDIO_LEDGER_SECRET` outside the
   repository and private order tree; make it available only to the fulfilment
   process. A missing key blocks ledger reads and writes.
4. Implement the Gumroad adapter only from the signed-in event map. It must
   authenticate and bind order ID, SKU, amount, currency, paid/refunded/disputed
   state and verification time to the HMAC evidence contract.
5. Complete one fictional Aurora Vale self-order: intake validation, dated buyer
   confirmation, proof, correction, paid-in-full evidence, staged final,
   integrity manifest, `THIRD-PARTY-CREDITS`, delivery, refund/revocation check,
   recovery and deletion.
6. Confirm keyed-ledger tampering, stale/replayed evidence, reparse/path escapes
   and recovery without a newly authenticated non-refunded provider observation
   all fail closed.

Never copy private order data into the repository, public build, screenshots,
support tickets, URLs or analytics.

## 4. GitHub and Cloudflare owner setup

Use the existing repository and Cloudflare account. Do not create a duplicate
project unless a native read-only check proves the intended project is absent.

GitHub owner checks:

1. Protect `main` with a GitHub ruleset: require pull requests and the intended
   checks/review, block force-pushes and deletion, and do not allow bypass for
   routine release work. The release workflows fail closed unless GitHub reports
   `GITHUB_REF_PROTECTED=true`.
2. Protect immutable `release/*` tags against update/deletion.
3. Create environments `cloudflare-pages-preview`,
   `cloudflare-pages-production` and `cloudflare-custom-domain-cutover`; require
   the intended owner/reviewer and disable routine bypass on all three.
4. Restrict production deployment to the protected `main` workflow source.
   Protect immutable `release/*` tags separately; the release tag is supplied as
   an input and resolved by trusted-main code, not used as the workflow source.
5. Store only `CLOUDFLARE_ACCOUNT_ID` and a least-privilege
   `CLOUDFLARE_API_TOKEN` in the preview and production environments. The
   cutover-verification environment is read-only and receives no deploy token.
   Never expose secret values.

Cloudflare owner checks:

1. Verify the Pages project is exactly `astroprecise` and its production branch
   is `main`.
2. Verify the token grants only the Pages access required for that account.
3. Associate `astroprecise.app` and `www.astroprecise.app` through Pages before
   any approved DNS cutover; preserve all unrelated DNS records.
4. Confirm the candidate `_headers` policy and exact identity header are served.

The preview workflow deploys a candidate-specific non-production branch and
must report the Cloudflare environment as `preview`. The production workflow
uploads the tested artifact to branch `main` and must report `production`.
Candidate source is never executed in a credential-bearing job.

## 5. Freeze and exact-identity release

Active Full wave:

`C:\Users\jonny\dev\coherence-astro-release\.fleets\AstroPrecise\astroprecise-20260824-195605-8be7\manifest.json`

Before any release tag or deployment:

1. Run the manifest's full proof command on a clean exact commit.
2. Freeze through the official Coherence script; do not edit the manifest or
   fabricate a receipt.
3. Obtain S12 from a genuinely separate native top-level process root.
4. Record S5, S11, S4, S7 and S2 against the same commit, then owner S1.
5. Confirm the validator's exact identity and requested status; prose and
   subagent audits are not governance evidence.
6. Push the reviewed feature commit only through the protected repository path.
7. If authorised, create the immutable tag
   `release/ap-v902-<first-12-characters-of-exact-SHA>`.

Run `.github/workflows/deploy-preview.yml` first with that exact candidate SHA.
The preview is checkout-closed and is for verification, not sale.

Only after preview, legal/account gates and a fresh owner deployment approval,
dispatch `.github/workflows/deploy-pages.yml` from protected `main` with the
exact immutable release tag and candidate SHA as inputs and `operation: deploy`.
It must test, stamp and upload the exact artifact, then
prove the immutable `pages.dev` result. Custom-domain cutover is a separate
owner-approved operation using `operation: verify-cutover`.

Never reinterpret a failed post-deploy verification as a successful release.

## 6. Publication order

The owner must approve each irreversible action at the moment it is taken:

1. Finish owner/legal facts and signed-in Gumroad/private fulfilment proof.
2. Freeze and independently approve the exact candidate.
3. Deploy and verify checkout-closed v902 on the immutable preview.
4. Create the three unpublished Gumroad drafts and recheck every field.
5. Deploy/verify the owner-approved public website and legal pages.
6. Make the legacy listing unavailable, verify its direct URL, then archive it
   only if past-buyer access is preserved and the owner confirms.
7. Publish exactly the three new listings and wire only their verified checkout
   URLs into a separately reviewed exact candidate.
8. Test one real low-risk purchase/refund path only with owner approval and no
   real customer birth data, then open capacity for the first legitimate order.

If any identity, price, tax, checkout, privacy, payment or fulfilment check
differs from the approved evidence, close checkout and roll back to the last
verified public state.

## 7. First-sales validation

Use the fictional samples and owned/organic channels. Explain the exact
difference between £18, £29 and £39, the known-time requirement, digital-only
delivery, computed geometry, private handling and the `SCHEMATIC` Observatory
label. Do not fabricate testimonials, ratings, scarcity, urgency, sales counts,
turnaround history or scientific personality claims.

For the first five legitimate fulfilled sales, record only the minimum required
operational data: qualified visits/enquiries, SKU, fees and net receipt,
hands-on time, elapsed delivery, corrections, support, refunds, privacy issues
and deletion completion. Do not buy ads or enable Gumroad Discover before those
five orders show that the offer is safe and economically sustainable.

## Source basis checked 2026-08-24

- Gumroad Commission mechanics: <https://gumroad.com/help/article/70-can-i-sell-services>
- Gumroad tax/Merchant-of-Record description: <https://gumroad.com/help/article/121-sales-tax-on-gumroad>
- UK distance-selling information duties: <https://www.gov.uk/online-and-distance-selling-for-businesses/distance-selling>
- Consumer Contracts Regulations 2013: <https://www.legislation.gov.uk/uksi/2013/3134/contents>
- Consumer Rights Act 2015: <https://www.legislation.gov.uk/ukpga/2015/15/contents>
- ICO special-category data guidance: <https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/special-category-data/what-are-the-rules-on-special-category-data/>
- Ko-fi payment methods: <https://help.ko-fi.com/hc/en-us/articles/24482435253661-What-payment-methods-are-available-on-Ko-fi>

This is operational drafting, not a substitute for advice from a UK solicitor
or tax professional who has reviewed the owner's real circumstances.
