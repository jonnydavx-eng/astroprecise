# AstroPrecise — Shop Audit & Product Lineup

_2026-06-13. Reviewed `shop.html`, `js/shop-commerce.js`, `AP_MON.commerce` (app.js), `POD-PLAYBOOK.md`, `tools/generate-reading.mjs`. Pairs with `GTM-LADDER.md`, `INSTANT-MONETIZATION.md`._

## Verdict
**Architecturally launch-ready, commercially not-yet-open — and that's by design and honest.** The shop is a clean, config-driven, Pages-compliant link-out engine, correctly **dormant** (every fulfilment URL empty → the honest "shop opens soon" modal + email invite, never a fake/dead Buy button). To open: (a) create the external products, (b) paste URLs, (c) fix the items below.

## What exists today
- **"Wear Your Sky"** (`#wear-your-sky`, `window.AstroShop`): real cart + quick-view + checkout fallback chain, **8 SKUs** defined in config, all dormant. ✅ honest.
- **Affiliate shelf**: ~21 hardcoded cards to Amazon/Etsy **search** URLs (live, but untagged — see gap 4).
- **Free Tools** cards: live, correct.
- **The 8 config SKUs:** natal-poster £38, sky-tee £34, sky-hoodie £62, big-three-print £18, constellation-mug £20, deep-reading £28, year-ahead £22, gift-reading £28.

## Gaps / bugs to fix before opening (priority)
1. **CURRENCY BUG (the one real bug):** `checkout.currency: 'USD'` (app.js) and `$` literals in `shop-commerce.js` (≈ lines 165, 185, 376, 408) — a UK GBP brand showing `$38.00` is wrong + trust-eroding. **Set `currency:'GBP'` and change `$`→`£`.** (schema.org priceCurrency already reads from config.)
2. **Price drift vs the ladder:** Deep Reading is **£28 in config vs £24** in the ladder; **no £12 print-at-home PDF poster** (the rung-1 Pinterest magnet + best low-friction first sale). Reconcile to £24 + add the £12 PDF + the £32 bundle.
3. **No free Chart Wallpaper lead-magnet (rung 0)** anywhere — the biggest *strategic* gap (it builds the list that sells everything). Now partly addressed by the new site-wide email capture; add the wallpaper as the incentive.
4. **Affiliate links are untagged search URLs** + `affiliateTag` empty → the prominent disclosure currently over-discloses. Either get an Amazon Associates tag + apply it, or soften the banner to "some links may be affiliate links" until tags exist.
5. **No made-to-order turnaround copy** on personalised cards ("rendered + shipped in 2–7 business days; don't know your birth time? we'll help").
6. **Minor:** cart placeholder `$0.00` (cosmetic, fix with currency); JSON-LD `availability: PreOrder` — flip to `InStock`/`MadeToOrder` per product when it goes live.

## Recommended lineup
**DIGITAL (margin core — start here, ~90% margin):**
| Product | GBP | Effort | Speed |
|---|---|---|---|
| Chart Wallpaper | **free (email)** | ~0 | list-builder |
| Natal Poster — print-at-home PDF | **£12** | ~2 min/order | ★★★ fastest first sale |
| Deep Natal Reading PDF (6–10pp) | **£24** | ~3–5 min | ★★★ hero |
| Your Year Ahead — Transit Report PDF | **£22** | ~5 min | ★★ seasonal |
| Reading + Poster bundle | **£32** | ~5 min | ★★ AOV anchor |
| Gift a Reading | **£28** | ~5 min | ★★ seasonal |

**POD PHYSICAL (wow/gift layer — add once digital converts; Gelato/Printful + Etsy):**
| Product | GBP | Net margin | Speed |
|---|---|---|---|
| Natal Star-Map Print A3 | **£34** | ~£20–23 | ★★★ hero physical |
| Star-Map Print A2 | **£45** | ~£26–30 | ★★ |
| Framed natal/constellation print | **£48** | ~£17–24 | ★★ giftable |
| "Your Sky" tee | **£32** | ~£12–15 | ★★ |
| Chart mug | **£18** | ~£8–10 | ★★★ impulse/add-on |
| Big Three mini-print | **£18** | ~£9–11 | ★★ |
| ~~Hoodie £62~~ | defer | thin/return risk | ★ |

**What sells fastest (2026 evidence):** personalised + a specific **date/name** wins — a **"two skies" relationship/anniversary star map** is likely your fastest physical seller; **moon-phase décor +63% YoY**; Etsy best-sellers = **foil natal prints** + detailed readings + **astrocartography maps** (a strong, almost-uncontested differentiator you can compute).

## Minimum Viable Shop (open with this — digital-only, hand-fulfilled, no host migration)
1. **Ko-fi tip jar** → `tipUrl`.
2. **Email list / Chart Wallpaper** → `newsletterUrl` (capture now live site-wide).
3. **£12 Natal Poster PDF** → Gumroad/LS, set `posterUrl` + the SKU's `fulfilUrl` (add this SKU — it's missing).
4. **£24 Deep Reading PDF** → Lemon Squeezy (MoR, EU VAT handled), set `deepReadingUrl` + `fulfilUrl`.

Then: **week 2–6** add the £32 bundle + Gift; **month 2+** open Etsy POD (lead with the £34 A3 star-map + £18 mug + the "two skies" print), set `checkout.etsyUrl`; **month 3+** tee, framed, foil, astrocartography. **Defer** the hoodie and any subscription.

## Pre-open fix checklist
- ☐ `currency 'USD'→'GBP'` + `$`→`£` in shop-commerce.js (the one real bug)
- ☐ reconcile prices (Deep Reading £24; add £12 PDF SKU; add £32 bundle)
- ☐ add free Chart Wallpaper lead-magnet (rung 0)
- ☐ fix affiliate honesty (tag, or soften the banner)
- ☐ add made-to-order turnaround copy
- ☐ flip JSON-LD `availability` off `PreOrder` per product as it goes live
