# AstroPrecise — Monetization Evaluation & Build

_Assessed 2026-06-13. Facts web-verified (fees/ToS current as of Oct 2025–2026)._

## The one constraint that shapes everything

**GitHub Pages' Terms forbid selling on the site.** Verbatim: you may not use Pages "as a free web
hosting service to run your online business, e-commerce site… you cannot sell anything (products,
services, digital or physical) via GitHub Pages." **Exception: donation buttons and crowdfunding links
are explicitly permitted.** ([GitHub ToS](https://docs.github.com/en/site-policy/github-terms/github-terms-for-additional-products-and-features))

So, while still on GitHub Pages, every paid avenue must be a **link OUT to a storefront hosted on the
provider's own domain** (the sale happens off-Pages), or a tip/crowdfunding link. To sell *directly on the
site* (embedded Stripe checkout, subscriptions, on-page POD), **migrate hosting** → Cloudflare Pages or
Netlify (both free, both allow commerce + custom domains + serverless functions). That migration is the
single gate between "tips + linked storefronts" and "a real on-site shop."

## What was BUILT this pass (compliant now, no backend)

A provider-agnostic **monetisation layer** in `website/js/app.js` (`window.AP_MON` config + engine):
- Every avenue is an **external link**, **dormant by default** — nothing renders until you paste a real URL,
  so a visitor never meets a broken or fake checkout (honesty ethos preserved).
- Surfaces opt in with `data-mon="tip|report|poster|gift|newsletter"` (mode `hide` or `dormant`).
- A footer **"♥ Support this free tool"** link auto-appears the moment `tipUrl` is set.
- Plus the legal pages (`privacy.html`, `terms.html`) required before taking any money.

**To go live: edit the `window.AP_MON` block at the top of the monetisation section in `app.js`** and paste your URLs.

## Every route, rated

| Route | Provider | Fees | Static/Pages-safe? | Verdict |
|---|---|---|---|---|
| **Tips / support** | [Ko-fi](https://ko-fi.com/) (0% on tips) or Buy Me a Coffee | processor ~3%+30¢ only | ✅ permitted by Pages ToS | **Build now** (wired) |
| **Premium written report (PDF)** | [Gumroad](https://gumroad.com) (10%+$0.50, merchant-of-record, hosts file+delivery) or Ko-fi Shop (5%) | per sale | ✅ link-out to hosted product | **Build now** (wired, paste URL) |
| **Gift a reading** | Gumroad / Ko-fi Shop | per sale | ✅ link-out | **Build now** (wired) |
| **Affiliate (shop page)** | Amazon Associates + niche astrology programs | commission | ✅ outbound links | **Build now** — honest recs only |
| **Email list → funnel** | Buttondown / Kit / MailerLite (hosted signup) | free tier | ✅ link-out/embed | **Build now** (wired) — the real long-term asset |
| **Printable chart poster** | Gumroad (static PDF) now; print-on-demand later | 10%+$0.50 | ✅ as a hosted PDF product | **Build now** (PDF); POD = phase 2 |
| **Print-on-demand (physical posters of the chart art)** | [Gelato](https://www.gelato.com/) / Printful | product + margin | ⚠ needs a store integration (Shopify/Etsy/API), not no-backend | **Phase 2** (link to an Etsy/Gelato store, or post-migration) |
| **Direct on-site checkout (Stripe Payment Links/Buy Button)** | [Stripe](https://stripe.com/pricing) 2.9%+30¢, no monthly | per sale | ❌ "selling via Pages" — needs host migration | **Phase 2** (after Cloudflare/Netlify move) |
| **Subscriptions / memberships** | Stripe + Cloudflare Worker, or Memberstack/Outseta, Patreon, Ko-fi Memberships | varies | ❌ needs backend/auth (or Patreon/Ko-fi hosted) | **Phase 2** — or Patreon/Ko-fi (hosted) now |
| **B2B / API licensing of the ephemeris engine** | direct | — | n/a (separate offering) | **Consider** — the engine is genuinely good |
| **Display ads (AdSense)** | Google | low for indie traffic | technically possible | **Avoid** — destroys the privacy/premium brand |

## The honest product ladder (accuracy stays free)

Because the promise is "every number is real *and free*," sell **artifacts, depth, convenience, gifts** —
never lock the truth:
1. **Tip jar** (Ko-fi) — goodwill, zero friction, Pages-legal. _Ship first._
2. **Premium written natal report** — a long, beautiful PDF interpretation. Hosted product (Gumroad).
3. **Printable chart poster** — your generated chart as a framed-ready PDF; later, POD physical prints.
4. **Gift a reading** — the concept already exists in the UI; make the button a hosted product.
5. **Email list** — free "cosmic weather" letter → the channel for everything above.
6. _(Phase 2, post-migration)_ saved/synced charts, subscriptions, on-site checkout.

## Deliberately DON'T
- **Display/programmatic ads** — kills the premium, privacy-first feel for trivial indie revenue.
- **Embedding Stripe/checkout directly on the Pages site** — against Pages ToS; also a trust/CWV cost.
- **Paywalling the chart/accuracy** — betrays the core promise; the free tool IS the funnel.

## Setup checklist (owner)
- [ ] Register a business or sole-trader as needed; a payment account (Stripe/Gumroad/Ko-fi) needs identity + bank.
- [ ] Fill the placeholders in `privacy.html` / `terms.html` (business name, contact email, jurisdiction).
- [ ] Create the storefront products (Gumroad/Ko-fi) → paste URLs into `window.AP_MON` in `app.js`.
- [ ] Decide on host: stay on Pages (tips + linked storefronts) **or** migrate to Cloudflare Pages to sell on-site + add subscriptions.
- [ ] VAT/tax: Gumroad/Lemon Squeezy act as merchant-of-record (handle EU VAT); Stripe does not (you handle tax).
- [ ] Refund policy for digital goods is already in `terms.html`.
