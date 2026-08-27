# AstroPrecise Studio — launch catalogue

Updated: 2026-08-24

> **PRELAUNCH — NOT FOR SALE.** These are the only three proposed launch products. Checkout URLs are intentionally absent, no product has been published, and the public site has not been deployed from this branch. Ko-fi remains voluntary support only and does not unlock a product.

All three products are personalised **Gumroad Commission services** ending in digital-file delivery. The first release is adult `self` order only; gifting and all third-party birth-data flows are deferred. Prices are listed service prices in GBP; Gumroad must show the final checkout total including any applicable tax before the buyer commits. Public Gumroad guidance suggests a 50% Commission deposit and later balance, but that is a draft assumption—not account truth. Eligibility, platform role, the exact charge sequence and a safe post-final-charge file hand-off must pass an unpublished signed-in test order before launch.

## The three-product launch

### 1. Natal Sky Print Pack — £18

SKU: `natal-sky-print-pack`

A computed natal chart prepared as two home-print PDFs and five practical PNG layouts.

Mode: adult `self` order only.

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

Mode: adult `self` order only.

Delivered:

- 20-page screen PDF
- 20-page ink-light A4 PDF
- A3 RGB home-print natal-plate PDF
- A4 natal-plate PDF
- personal-use licence and SHA-256 integrity manifest

Sample: `website/downloads/studio/personal-sky-keepsake-sample.pdf`

Cover: `website/img/shop/v901/personal-sky-keepsake.webp`

### 3. Whole Sky Edition — £39

SKU: `whole-sky-edition`

The complete Print Pack and Personal Sky Keepsake, plus a clearly labelled `SCHEMATIC` Observatory still for the supplied birth hour.

Mode: adult `self` order only.

Delivered:

- everything in the Natal Sky Print Pack
- everything in the Personal Sky Keepsake
- 4800 × 3600 `SCHEMATIC` Observatory birth-hour PNG
- organised ZIP and SHA-256 integrity manifest
- one reasonable layout adjustment requested within seven calendar days of delivery

At the stated individual prices, the two component products total £47; this combined edition is £39, an £8 saving. This is a permanent price comparison, not a countdown or limited-time claim.

Sample: `website/downloads/studio/whole-sky-edition-sample.pdf`.

Cover: `website/img/shop/v901/whole-sky-edition.webp`

## Shared commission rules

- Digital files only. No framed print, commercial press file, clothing, jewellery or other physical item is included.
- The adult buyer supplies only their own known, exact, recorded birth date, local clock time, city and country. Unknown, approximate and rectified times are not accepted at launch.
- Buying for another person, surprise gifts, delayed redemption, child data and buyer-entered third-party birth data are not accepted.
- The default production target is five working days after complete valid inputs and either the buyer's optional early-start request or expiry of the 14-day cancellation period. This service level still requires owner confirmation.
- Calculation and production errors are corrected without charge. The Whole Sky Edition also includes the layout adjustment stated above. Statutory consumer rights are not restricted.
- Astrology passages describe traditional symbolic interpretations for reflection and entertainment. They are not scientific personality findings, predictions or medical, legal, financial or mental-health advice.
- Customer birth inputs must stay in the private Gumroad order and local private fulfilment area; they must never be sent through a public contact form, placed in a URL or used in public samples.
- Public samples use a conspicuously labelled fictional person and remain watermarked. Customer files use generic filenames.
- Personal, non-commercial use only unless separate written permission is agreed.

## Hard launch blockers

1. Publish the operator's full geographic business/service address and confirm legal/trading identity, contact route and applicable territories.
2. Obtain owner confirmation of the five-working-day target, seven-day layout-adjustment scope and 30-day private-working-file deletion rule.
3. Create the Cloudflare Pages project and attach the apex and `www` custom domains, then prove the exact SHA identity on the Pages deployment and both domains.
4. Confirm the Gumroad account is eligible for Commission products and verify the exact 50% deposit/balance workflow.
5. Implement an authenticated seller adapter and prove a truthful completion sequence in which a usable final exists when the commission is marked complete, while unauthorised delivery remains blocked unless the final charge succeeds.
6. Complete a test order covering receipt, buyer inputs, optional early-start consent, cancellation/refund, final balance, final-file delivery and data deletion.
7. Replace this draft/noindex service-terms page with owner-approved public terms and align the live privacy/refund/contact pages before checkout opens.
8. Receive explicit owner approval before archiving the legacy listing, publishing any new product or deploying the website.

Authoritative machine-readable product, price and checkout state:
`website/data/products-v901.json`. Its `launchBlockers` array is a compact
fail-closed product guard, not the complete release checklist. The nine blockers
above and `docs/SHOP-LAUNCH-RUNBOOK.md` remain mandatory even if the compact array
is unchanged.

Future personalised gifting is preserved in `marketing/shop-studio-v901/deferred-gift-spec.md`. It is not part of this catalogue or launch authority.
