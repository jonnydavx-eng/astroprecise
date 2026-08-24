# AstroPrecise monetisation — current decision

Updated: 2026-08-24

## Answer

Spend **£0 on new software, hosting, AI models, ads or ecommerce subscriptions**
before the first validated sale. The existing domain, Cloudflare Pages Free,
Gumroad Commission and local deterministic fulfilment are enough for launch.

Possible unavoidable costs are limited to:

- renewal of the existing `astroprecise.app` domain when actually due; and
- the ICO data-protection fee if the operator is not exempt and the current tier
  assessment says it is payable.

Do not buy another domain, Cloudflare Pro, Shopify, Etsy, POD services, premium
analytics, a helpdesk, Adobe stock, an OpenAI/Claude/DeepSeek API or another AI
subscription for this launch.

## Exact launch offer

| Product | Price | Fulfilment |
|---|---:|---|
| Natal Sky Print Pack | £18 | personalised Gumroad Commission |
| Personal Sky Keepsake | £29 | personalised Gumroad Commission |
| Whole Sky Edition | £39 | personalised Gumroad Commission |

There are no physical items and no subscription. Ko-fi is voluntary support,
not a product checkout.

## Hosting decision

The paid shop must move off GitHub Pages before checkout opens. GitHub's current
additional product terms say Pages is not intended or allowed for an online
business/e-commerce site primarily facilitating commercial transactions. The
older repo interpretation that outbound Gumroad links made this safe is retired.

Cloudflare Pages Free is the selected host. The protected release workflow uses
Direct Upload, an exact-SHA identity document and a build-stamped response header.
No Transform Rule or paid Cloudflare plan is required.

## Checkout decision

Use exactly three Gumroad **Commission** drafts. Gumroad has no monthly fee, but
fees and account-visible currency/tax treatment must be rechecked before launch.
Current public guidance lists a direct-sale platform fee of 10% + $0.50 and a
higher Discover fee. Budget conservatively until a test purchase shows the exact
GBP deposit, final charge, deductions and payout.

The retired API provisioner is disabled because it created 13 ordinary products.
Create Commission drafts only in the signed-in seller interface.

## Profit gate

The prices are hypotheses, not proven margins. Time one full fictional order for
each tier and calculate:

```text
net contribution = receipts - platform/payment fees - refunds - tax provision
                   - (operator hours × chosen hourly floor)
```

Raise a price or remove a tier if it cannot meet the hourly floor. Do not buy ads
until at least one organic channel produces a legitimate, successfully fulfilled
sale and the unit economics remain positive.

## Sources to recheck

- GitHub product terms: <https://docs.github.com/en/site-policy/github-terms/github-terms-for-additional-products-and-features>
- Cloudflare Pages limits: <https://developers.cloudflare.com/pages/platform/limits/>
- Gumroad fees: <https://gumroad.com/help/article/66-gumroads-fees.html>
- Gumroad Commission: <https://gumroad.com/help/article/70-can-i-sell-services.html>
- ICO fee: <https://ico.org.uk/for-organisations/data-protection-fee/>

The operational source of truth is `docs/SHOP-LAUNCH-RUNBOOK.md`.
