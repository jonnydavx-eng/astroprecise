# Seller details: what must be true before they are filled in

Status on 20 October 2026: checkout is closed by Jonny's decision and every company
field is empty. The public pages say so honestly. Nothing here is a launch instruction.

## Where the details live

- Single source of truth: `website/data/seller-details.json`.
- Public blocks: `contact.html`, `terms.html` and `digital-product-terms.html`, between the
  `<!-- seller-details:start -->` and `<!-- seller-details:end -->` markers.
- Guard: `test-seller-details.mjs` (part of `npm test`). It fails if the JSON and the three
  blocks disagree, if a company field is filled while checkout is closed, or if any page shows
  a bracket placeholder, an 8-digit number next to company wording, or a VAT-shaped number.

## Filling them requires Jonny's yes

No agent fills these fields on its own initiative. Jonny confirms each value in writing and
says yes to publishing. Until then the fields stay `null` and the not-yet-published note
stays on the pages.

## Verify on Companies House first

Check the live register entry at find-and-update.company-information.service.gov.uk, not a
formation email or an invoice. Record the date checked.

1. Exact registered name, including "Ltd" or "Limited" exactly as the register spells it.
2. Company number as shown on the register (8 digits, or 2 letters plus 6 digits).
3. Registered office address as shown on the register.
4. Company status is Active, not proposed, dissolved or in the course of being struck off.
5. The company is the entity that will actually sell: it will take the money, issue the
   contract and own the obligations. If Jonny would sell as a sole trader instead, the legal
   name is his own and `companyNumber` stays `null`.
6. A geographic address at which the trader can be contacted. This may be the registered
   office; a PO box on its own is not enough for distance-selling information.
7. VAT number only if the company is VAT registered. Otherwise leave it `null`.

## How to fill, once confirmed

1. Put the confirmed values in `website/data/seller-details.json`. Keep `tradingAs` as
   AstroPrecise and `contactEmail` as the published contact address.
2. Replace the note inside each marked block with the same values. The test requires the legal
   name, company number and registered office to appear in every block and the note to go.
3. Run `npm test`. The seller-details check still fails while checkout is closed; that is the
   point. Opening checkout is a separate decision and a separate change.
