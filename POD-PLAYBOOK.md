# AstroPrecise — Print-on-Demand Playbook (PERSONALIZED chart merch)

_Ops guide for "wear your sky" — natal posters, sky tees, and chart mugs printed from **each
customer's own chart**. Pairs with `GTM-LADDER.md` (the ladder), `MONETIZATION.md` (routes/ToS),
and `GROWTH.md` (prices/market)._

## The one thing that makes this different from normal POD

Standard POD guides assume **fixed designs**: you upload 10 artworks once, bulk-import a CSV, and every
buyer of "Design #3" gets the identical file. AstroPrecise is the opposite — **every order is a unique
artwork generated from that buyer's birth data** (their planets, their houses, their sky). So the usual
"bulk-CSV → set-and-forget storefront" model does **not** fulfil us out of the box. The whole game is:
**capture birth data, generate the artifact, attach it to that one order.** This doc is about how to do
that cleanly at small scale and then automate it.

> **Privacy rule (CLAUDE.md):** birth data is collected **only** at/after checkout, on the storefront
> provider's secure form or your own intake form — **never** sent from the chart tool itself. The site
> computes in-browser; only a volunteered email/birth-data-for-an-order leaves the device, and only when
> the customer deliberately buys.

## Print providers (pick by geography + product)

| Provider | Best for | UK/EU shipping | Personalization fit |
|---|---|---|---|
| **Gelato** | Posters/wall art, global local printing (UK, EU, US presses) | Excellent — prints in-region, low ship cost/footprint | Strong API; upload-per-order works well |
| **Printful** | Tees, mugs, framed prints; strong mockups & quality | Good UK/EU presence | Mature API + manual per-order upload |
| **Printify** | Widest blank catalogue, cheapest blanks via many providers | Use a **UK provider** (e.g. Inkthreadable) for UK buyers | Manual per-order upload, or API |

**Default recommendation:** **Gelato for posters/prints** (the hero physical product, printed in-region),
**Printful for tees/mugs** (quality + mockups). Use **Printify** when you want the cheapest blank or a
specific product Gelato/Printful lack. There is no lock-in — a poster PDF/PNG can go to any of them.

## Blanks (the base products)

| Product | Suggested blank | Why |
|---|---|---|
| Natal poster / star map | Matte or semi-gloss **museum/enhanced poster**, A3 + A2 (Gelato) | Astrology buyers frame these; matte reads premium |
| Framed print | Gelato/Printful framed poster | Higher AOV, giftable |
| Sky tee | **Bella+Canvas 3001** (premium, ~£14–16 base) unisex, 100% combed ringspun, DTG | Soft, true-to-size, the indie-apparel standard |
| Budget tee | Gildan 5000 (~£10 base) | Margin floor / promos |
| Chart mug | Standard 11oz/15oz white ceramic, wrap print | Low-cost impulse rung |

## Pricing math (worked, GBP — aligns with `GTM-LADDER.md`)

The pattern: **retail ≈ (blank + print) × ~2.5–3**, then subtract provider fee. Keep entry under ~£35 and
let prints/framed carry margin.

| Product | Base (blank + print) | Retail | Gross margin | Notes |
|---|---|---|---|---|
| Poster A3 (digital PDF) | ~£0 (file) | **£12** | ~£11 after fee | the print-at-home taster; near-pure margin |
| Poster A3 (physical) | ~£8–11 | **£34** | ~£22–25 | Gelato in-region print |
| Poster A2 (physical) | ~£12–16 | **£45** | ~£28–32 | upsell size |
| Framed print | ~£20–28 | **£48** | ~£18–25 | highest-AOV wall product |
| Sky tee (Bella+Canvas) | ~£15–17 | **£32** | ~£14–16 | DTG; -£2–3 after Printify/Printful fee |
| Chart mug | ~£6–8 | **£18** | ~£9–11 | impulse / gift add-on |

After the storefront's cut (Etsy ~6.5% + listing; Gumroad 10%+£0.50; on-site Stripe 2.9%+30¢) the **net**
on a physical poster is comfortably £18–28. The digital poster (£12) and Deep Reading (£24) remain the
margin champions — physical merch is the **wow/gift/shareable** layer, not the profit core.

## How to fulfil a PERSONALIZED order (the core operation)

You generate the artwork from the buyer's chart, then route it to the printer. Three ways, increasing
automation:

### Method A — Manual upload per order (start here; viable today)
The Etsy/Gumroad model. ~3–5 minutes per order, ~highest margin, zero backend.
1. **Capture birth data after payment.** Two clean options:
   - **Etsy "Personalization" field** — turn on Personalization on the listing; the buyer types their
     birth date, exact time, and place at checkout. (Etsy is built for made-to-order; this is the
     intended mechanism.) Add a note: "Don't know your birth time? Reply after ordering."
   - **Gumroad / Ko-fi Shop** — sell the product, then trigger a **post-purchase form** (Gumroad's
     "content/redirect" or an emailed link to a short form) collecting date / time / place / size.
2. **Generate the artifact.** Run **the generator** — the same `ap-samples` script that produced the
   Desktop samples (`GROWTH.md`: "the generator IS the fulfilment engine") — to render that buyer's
   poster PNG/PDF at print resolution. (The chart page's `paintShareImage` engine is the same lineage of
   art; the offline generator produces the print-res file.)
3. **Create the product on the printer for that order.** In Gelato/Printful/Printify, upload the generated
   file onto the chosen blank (poster size / tee / mug), set the buyer's shipping address, and place the
   order. For tees/mugs, generate a quick mockup if the buyer wants a proof.
4. **Confirm + deliver.** Mark the order fulfilled; the printer ships direct to the customer. For digital
   posters, just email the PDF.

> This is the honest, today-viable path: no fake automation, every order genuinely fulfilled, ~90% margin
> on digital and healthy margin on physical.

### Method B — Provider API (automate when volume justifies it; needs a backend → Phase 2)
After migrating off GitHub Pages to **Cloudflare Pages/Netlify** (see payment-routing map below), a small
**Worker/function** can:
1. Receive the payment webhook (Stripe) **with** the submitted birth data.
2. Call the generator to produce the print file (store it, or pass a signed URL).
3. Call **Printful's** or **Gelato's order API** (`POST` an order with the generated file URL + variant +
   recipient address) so the print is placed automatically. Printify also has an order API.
4. Email the customer the confirmation (and the digital file, if applicable).

This is the "instant, hands-off" version — but it is **Phase 2**, because it needs a host that allows
commerce + a serverless runtime. Don't claim it until it exists.

### Method C — Etsy auto-sync (semi-automated, for **fixed** companions only)
Etsy + Printify can **auto-fulfil** when Printify syncs a listing — but that path assumes a **fixed**
design. Use it **only** for non-personalized back-catalogue items (e.g. a generic "Pluto in Aquarius
2024–2043" art print, a zodiac-sign poster series). **Personalized** natal orders still go through
Method A (Etsy Personalization field → manual generate + upload) or Method B (API). Don't mix them up — a
personalized order can't ride the auto-sync rail.

### Decision guide
- **0–20 orders/week, on GitHub Pages today →** Method A (Etsy Personalization or Gumroad + post-purchase form).
- **Steady volume + you've migrated host →** Method B (Stripe webhook → generator → Printful/Gelato API).
- **Generic, non-personalized prints →** Method C (Etsy↔Printify auto-sync) as a low-effort side rail.

## Payment-routing map (from `MONETIZATION.md` / `GROWTH.md`, re-themed) → `AP_MON`

The single constraint: **GitHub Pages forbids selling on the site** (donation/crowdfunding links are the
only permitted money rail). So today every paid route is a **link OUT** to a storefront on the provider's
domain. On-site Stripe needs a **host migration**.

| Route | Setup | Best for | Maps to `AP_MON` |
|---|---|---|---|
| **Gumroad product** (merchant-of-record, handles EU VAT, ~10%+£0.50) | Create product → host file/redirect → paste listing URL | Digital poster, Deep Reading, bundle, gift — hands-off VAT | `posterUrl`, `deepReadingUrl`/`reportUrl`, `giftUrl` |
| **Etsy listing** (Personalization on; Printify syncs for *fixed* items) | Publish listing, enable Personalization for natal orders | Personalized natal merch (Method A) + marketplace traffic | `posterUrl` (store link) |
| **Ko-fi** (0% on tips; Ko-fi Shop ~5% for products) | Connect PayPal/Stripe payout | Tips + simple products | `tipUrl`, optionally `giftUrl`/`posterUrl` |
| **PayPal + manual fulfil** | developer.paypal.com → Live → Create App → Client ID | Real on-site-feel checkout w/ no monthly fee; you fulfil each order in the printer manually | (link-out product page) |
| **On-site Stripe** (2.9%+30¢, Payment Links/Buy Button) | ❌ violates Pages ToS — **needs Cloudflare/Netlify migration** first | Fully automated store at scale (enables Method B) | future on-site flow, not a link key |

**How it lands in code:** paste the chosen storefront URL into the matching key in the
`window.AP_MON` block at the top of the monetisation section of `website/js/app.js`. Surfaces opt in with
`data-mon="poster|report|gift|tip|newsletter"`. **Nothing renders until a real URL is set** — an
unconfigured Buy surface either hides or shows "coming soon" (`data-mon-mode`), so a customer never meets
a broken checkout. (Honesty rule, CLAUDE.md.)

## Re-theme checklist (so nothing reads like a generic POD shop or the old TBP brand)
- Copy is **astrology-specific and personal**: "your sky," "your chart," "your rising," "the moment you
  were born" — **never** consciousness/11:11/tree-of-life/awakening language (that was TBP).
- Every physical product is described as **made-to-order from the buyer's birth data** ("printed from your
  exact natal chart"), so personalization is the selling point, not a footnote.
- Aesthetic: glass/cosmic — lapis `#2a4a94`, gold `#c4920a`, void `#090b16`, parchment `#f0e8d8`.
- Honesty in listings: state the **made-to-order turnaround** (e.g. "rendered + shipped in 2–7 business
  days") and "need your birth time? we'll help" — don't promise instant on a manual flow.
- Sizing/turnaround/returns blurbs live with each listing on the storefront (Etsy/Gumroad), not on the
  Pages site.

## Example listing skeleton (Etsy / Gumroad, re-themed)

```
TITLE: Personalized Natal Chart Poster | Your Exact Birth Sky | Printed Astrology Wall Art

✦ Your sky, the moment you were born — rendered as a museum-quality print.
Every poster is generated from YOUR exact birth date, time, and place: your real
planets, houses, and aspects (not a generic sun-sign graphic).

HOW IT WORKS
1. Order, then enter your birth date, exact time, and city (Personalization box).
2. We generate your unique chart artwork.
3. Printed in-region and shipped to your door (2–7 business days).
   (Want it instantly? Choose the print-at-home digital PDF instead.)

DETAILS
• Sizes: A3 / A2 (and framed)
• Matte museum poster, fade-resistant inks
• Made to order from your birth data — privately computed, never sold or shared
• Don't know your birth time? Order anyway and reply — we'll guide you.

AstroPrecise — genuinely accurate astrology. Every number is real.
```
