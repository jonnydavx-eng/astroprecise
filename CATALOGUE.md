# AstroPrecise Studio — launch catalogue

Updated: 2026-08-24

> **PRELAUNCH — NOT FOR SALE.** These are the only three proposed launch products. Checkout URLs are intentionally absent, no product has been published, and the public site has not been deployed from this branch. Ko-fi remains voluntary support only and does not unlock a product.

All three products are personalised **Gumroad Commission services** ending in digital-file delivery. Each has `self` and `gift` purchase modes at the same price; gift mode is not a fourth SKU. Prices are listed service prices in GBP; Gumroad must show the final checkout total including any applicable tax before the buyer commits. Public Gumroad guidance suggests a 50% Commission deposit and later balance, but that is a draft assumption—not account truth. Eligibility, platform role, the exact charge sequence and a safe post-final-charge file hand-off must pass an unpublished signed-in test order before launch.

## The three-product launch

### 1. Natal Sky Print Pack — £18

SKU: `natal-sky-print-pack`

A computed natal chart prepared as two home-print PDFs and five practical PNG layouts.

Modes: `self` or adult recipient-controlled birthday `gift`.

Delivered:

- A3 RGB home-print PDF
- A4 ink-light home-print PDF
- 4960 × 7016 portrait PNG
- 2160 × 2160 square PNG
- 2160 × 3840 story PNG
- 1080 × 1920 phone-wallpaper PNG
- 1080 × 1080 Big Three PNG
- print guide, personal-use licence and SHA-256 integrity manifest

Sample: `website/downloads/studio/natal-sky-print-pack-sample.pdf`

Cover: `website/img/shop/v901/natal-sky-print-pack.webp`

### 2. Personal Sky Keepsake — £29

SKU: `personal-sky-keepsake`

An intentionally paginated, 20-page reflective reading built from computed chart positions, supplied in screen and ink-light editions with a natal plate.

Modes: `self` or adult recipient-controlled birthday `gift`.

Delivered:

- 20-page screen PDF
- 20-page ink-light A4 PDF
- A3 RGB home-print natal-plate PDF
- A4 natal-plate PDF
- personal-use licence and SHA-256 integrity manifest

Sample: `website/downloads/studio/personal-sky-keepsake-sample.pdf`

Cover: `website/img/shop/v901/personal-sky-keepsake.webp`

Gift cover: `website/img/shop/v901/gift-personal-sky-keepsake.webp`

### 3. Whole Sky Edition — £39

SKU: `whole-sky-edition`

The complete Print Pack and Personal Sky Keepsake, plus a clearly labelled `SCHEMATIC` Observatory still for the supplied birth hour.

Modes: `self` or adult recipient-controlled birthday `gift`.

Delivered:

- everything in the Natal Sky Print Pack
- everything in the Personal Sky Keepsake
- 4800 × 3600 `SCHEMATIC` Observatory birth-hour PNG
- organised ZIP and SHA-256 integrity manifest
- one reasonable layout adjustment requested within seven calendar days of delivery

At the stated individual prices, the two component products total £47; this combined edition is £39, an £8 saving. This is a permanent price comparison, not a countdown or limited-time claim.

Sample: `website/downloads/studio/whole-sky-edition-sample.pdf`.

Cover: `website/img/shop/v901/whole-sky-edition.webp`

Gift cover: `website/img/shop/v901/gift-whole-sky-edition.webp`

## Shared commission rules

- Digital files only. No framed print, commercial press file, clothing, jewellery or other physical item is included.
- For `self`, the buyer supplies their own known, exact, recorded birth date, local clock time, city and country. For `gift`, the adult recipient is present and personally supplies their own data after receiving the privacy information. Unknown, approximate and rectified times are not accepted at launch.
- Gift mode is birthday-only at launch. The recipient pays nothing and receives the files by default. Surprise gifts, delayed redemption, recipients under 18 and buyer-entered recipient birth data are rejected.
- A buyer copy of recipient files requires the recipient's separate, specific and initially unticked authorisation. Refusing it does not affect the commission.
- The default production target is five working days after complete valid inputs and either the buyer's optional early-start request or expiry of the 14-day cancellation period. This service level still requires owner confirmation.
- Calculation and production errors are corrected without charge. The Whole Sky Edition also includes the layout adjustment stated above. Statutory consumer rights are not restricted.
- Astrology passages describe traditional symbolic interpretations for reflection and entertainment. They are not scientific personality findings, predictions or medical, legal, financial or mental-health advice.
- Customer birth inputs must stay in the private Gumroad order and local private fulfilment area; they must never be sent through a public contact form, placed in a URL or used in public samples.
- Public samples use a conspicuously labelled fictional person and remain watermarked. Customer files use generic filenames.
- Personal, non-commercial use only unless separate written permission is agreed.

## Birthday gift additions

Every gift-mode package adds these deterministic, chart-derived digital files:

- `birthday-gift-jacket-a4.pdf` — tagged personalised A4 dedication jacket rendered from a 2480 × 3508 (300 ppi) source;
- `birthday-reveal-1080x1920.png` — phone/private-share birthday reveal;
- `birthday-moon-plate-2160x2160.png` — square lunar-phase artwork computed for the exact recorded birth UTC instant and explicitly not a photograph.

For the reading SKUs, the jacket is a separate A4 file and the reading remains exactly 20 pages.

Shared fictional gift-detail artwork: `website/img/shop/v901/birthday-orbit-detail.webp`.

## Hard launch blockers

1. Publish the operator's full geographic business/service address and confirm legal/trading identity, contact route and applicable territories.
2. Obtain owner confirmation of the five-working-day target, seven-day layout-adjustment scope and 30-day private-working-file deletion rule.
3. Create the Cloudflare Pages project and attach the apex and `www` custom domains, then prove the exact SHA identity on the Pages deployment and both domains.
4. Confirm the Gumroad account is eligible for Commission products and verify the exact 50% deposit/balance workflow.
5. Implement an authenticated seller adapter and prove a truthful completion sequence in which a usable final exists when the commission is marked complete, while unauthorised delivery remains blocked unless the final charge succeeds.
6. Complete a test order covering receipt, buyer inputs, optional early-start consent, cancellation/refund, final balance, final-file delivery and data deletion.
7. Complete and owner-approve the gift legitimate-interests assessment; prove adult recipient self-entry, just-in-time notice, recipient-default delivery, separate unticked buyer-copy authorisation, objection/withdrawal and no-minor/no-surprise rejection.
8. Replace this draft/noindex service-terms page with owner-approved public terms and align the live privacy/refund/contact pages before checkout opens.
9. Receive explicit owner approval before archiving the legacy listing, publishing any new product or deploying the website.

Authoritative machine-readable product, price and checkout state:
`website/data/products-v901.json`. Its `launchBlockers` array is a compact
fail-closed product guard, not the complete release checklist. The nine blockers
above and `docs/SHOP-LAUNCH-RUNBOOK.md` remain mandatory even if the compact array
is unchanged.
