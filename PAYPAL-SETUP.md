# PayPal Direct — Owner Setup Guide

*Created 2026-07-02 when Lemon Squeezy was dropped (they would not onboard the store). The site is already fully wired for PayPal — every step below is a paste-a-link job, no code. Until you paste links, every product honestly shows "coming soon" + email capture; nothing is broken and no dead checkout ever opens.*

## What the site does now

- **Checkout = link OUT to PayPal-hosted pages** (GitHub Pages ToS-compliant — the sale happens on paypal.com, same pattern as before).
- After any buy click, the shop shows the **two-step follow-up**: "Step 1 — pay on PayPal · Step 2 — send your birth details" linking to that product's Typeform. If the buyer closes it, a reminder appears on their next shop visit (7-day window, on-device only).
- The Two Skies post-purchase 50% offer now works as a **pre-filled discounted PayPal.Me amount link** — it only appears once you set your PayPal.Me handle (honesty rule: no discount we can't grant).

## Step 1 — PayPal Business account (~10 min)

You need a **Business** account (payment links are Business-only). If yours is personal: log in → Settings (gear) → **Upgrade to a Business account** → business type "Sole trader / Individual". Confirm your bank account.

## Step 2 — Create one payment link per product (~30 min for all 13)

1. Log in at paypal.com → Business dashboard → **Pay & Get Paid → Pay Links and Buttons** (or go straight to **https://www.paypal.com/buttons/**).
2. **Create** → single-item payment link → **Fixed price**.
3. Product name = the exact SKU name (this is how you'll know what was bought), price, currency **GBP**. Leave tax/shipping 0 for PDFs; add P&P on the two print items if you charge it.
4. **Build It** → copy the link (`https://www.paypal.com/ncp/payment/XXXXXXXX`).
5. If the builder offers **Auto-Return / redirect after payment**, point it at `https://astroprecise.app/shop.html?thanks=1` (nice-to-have; the two-step modal covers buyers regardless).
6. Repeat per product. Suggested names + prices are already in `website/js/app.js` (AP_MON.commerce.products).

## Step 3 — Paste the links (5 min)

Open `website/js/app.js` and paste each link into its product's **`fulfilUrl`** (every one is currently `''` with a `← paste` comment). Also fill the four top-level fields:

| Field | Which link |
|---|---|
| `deepReadingUrl` + `reportUrl` | Deep Reading (£12) |
| `posterUrl` | Natal Poster PDF |
| `giftUrl` | Gift a Reading |
| `AP_MON.paypal.me` | Your PayPal.Me URL, e.g. `'https://paypal.me/YourHandle'` (enables the Two Skies discount offer) |

Pasting a link instantly makes that SKU live (price shows, Add to basket works). Leave any SKU `''` and it stays honestly dormant. Then commit + push `main` (deploys in ~2 min) and hard-refresh.

*(Alternative: put the links in `tools/commerce-urls.json` and run `node tools/wire-ap-mon.mjs`.)*

## Step 4 — Smoke test (do this before announcing)

Buy the cheapest product yourself with a real card: pay → confirm the "send your birth details" modal appears → submit the Typeform → confirm the sale shows in PayPal Activity with the right product name → refund yourself.

## Fulfilment loop (unchanged)

Each sale = PayPal email + Activity entry (product name, buyer name + email). Buyer's birth details arrive via the product's Typeform (they're asked to include their PayPal transaction ID). Generate with `node tools/generate-reading.mjs --in order.json --final` as before.

## ⚠ Things Lemon Squeezy did that are now on you

- **VAT**: LS was merchant of record. You are now the seller. UK: nothing owed below the **£90,000**/12-month registration threshold. **EU caveat**: automated digital downloads to EU consumers technically owe that country's VAT from the FIRST sale (Non-Union OSS). Your readings are **manually prepared per order**, which arguably takes them outside the "electronically supplied services" definition — but confirm that judgement with an accountant, or geo-limit sales to the UK. Income goes on Self Assessment either way.
- **PayPal risk note**: PayPal treats fortune-telling/psychic services as a restricted/high-risk category on some payment methods. Keep product descriptions framed as **astrology reports for insight/entertainment** (the site already does this), keep delivery terms clear, and **withdraw your balance regularly** (PayPal can hold funds up to 180 days in a dispute).
- No automatic file delivery / license keys — your manual fulfilment flow already covers this.

## Guardrail (do not change)

`checkout.paypalClientId` in app.js stays `''` while the site is on GitHub Pages — on-site PayPal Buttons would put the sale ON the site, which breaches the Pages ToS. It becomes an option only after a Cloudflare Pages move.
