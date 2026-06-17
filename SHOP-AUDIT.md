# AstroPrecise — Shop Audit & Product Lineup

_2026-06-13 (base). Wave 21 closure: 2026-06-17 — `shop.html`, `js/shop-commerce.js`, `AP_MON.commerce` (app.js), `POD-PLAYBOOK.md`. Pairs with `GTM-LADDER.md`, `INSTANT-MONETIZATION.md`._

## Verdict
**Architecturally launch-ready; commercially gated on owner fulfilment.** The shop is a config-driven, Pages-compliant link-out engine. When every `fulfilUrl` is empty the UI stays **dormant** (honest “opens soon” modal + email invite — never a fake Buy button). When URLs are pasted per SKU, Buy CTAs and JSON-LD availability flip live automatically.

## What exists today
- **"Wear Your Sky"** (`#wear-your-sky`, `window.AstroShop`): real cart + quick-view + checkout fallback chain, **13 SKUs** in `AP_MON.commerce.products`.
- **Free Chart Wallpaper** (`#shop-wallpaper-lead`, `js/shop-wallpaper-lead.js`): rung-0 lead magnet on shop — email capture + chart-page download path. ✅ Wave 18–20
- **Affiliate shelf**: ~21 curated cards; disclosure **softens** when `affiliateTag` empty (`affiliate-social.js` → “Some links may earn us a commission…”). ✅ Wave 19–20
- **Turnaround copy**: hero + featured lede — “rendered to your birth data · prints & apparel ship in 2–7 business days”. ✅ Wave 19–20
- **Currency**: `checkout.currency: 'GBP'`, `formatPrice()` → `£` everywhere in commerce JS. ✅ Wave 18–20
- **JSON-LD**: static `WebApplication` in `shop.html` (`priceCurrency: GBP`); dynamic `ItemList` injected by `injectCatalogSchema()` with per-SKU availability from config. ✅ Wave 21

## Gaps / bugs to fix before opening (priority)
1. ~~**CURRENCY BUG**~~ — **resolved** (`GBP` + `£` in `shop-commerce.js` / `app.js`).
2. ~~**Price drift**~~ — resolved ap-v116; ladder-aligned.
3. ~~**Chart Wallpaper lead-magnet**~~ — `#shop-wallpaper-lead` on shop + chart `#wallpaper-lead`.
4. **Affiliate tag (owner):** `affiliateTag` still empty — softened disclosure is honest interim; paste Amazon Associates tag when approved.
5. ~~**Made-to-order turnaround copy**~~ — on hero + featured section.
6. ~~**JSON-LD availability**~~ — dynamic per SKU (`schemaAvailability()` in `shop-commerce.js`).

## JSON-LD availability (Wave 21)
`injectCatalogSchema()` reads each product from `AP_MON.commerce.products`:

| Condition | `schema.org` value |
|---|---|
| `fulfilUrl` empty, `available !== false` | `PreOrder` (dormant / opens soon) |
| `fulfilUrl` empty, `available === false` | `OutOfStock` |
| `fulfilUrl` set, `type === 'digital'` | `OnlineOnly` |
| `fulfilUrl` set, physical (`print` / `apparel` / `accessory`) | `InStock` |
| Optional per-SKU override | `product.schemaAvailability` → `InStock` \| `OnlineOnly` \| `PreOrder` \| `OutOfStock` |

Live offers also emit `offers.url` = `fulfilUrl`. Static `shop.html` `WebApplication` block unchanged (aggregate GBP range); catalog truth is the injected `ItemList`.

## Recommended lineup
**DIGITAL (margin core — start here, ~90% margin):**
| Product | GBP | Effort | Speed |
|---|---|---|---|
| Chart Wallpaper | **free (email)** | ~0 | list-builder |
| Natal Poster — print-at-home PDF | **£6** | ~2 min/order | ★★★ fastest first sale |
| Deep Natal Reading PDF (6–10pp) | **£12** | ~3–5 min | ★★★ hero |
| Your Year Ahead — Transit Report PDF | **£16** | ~5 min | ★★ seasonal |
| Reading + Poster bundle | **£16** | ~5 min | ★★ AOV anchor |
| Gift a Reading | **£15** | ~5 min | ★★ seasonal |

**POD PHYSICAL (wow/gift layer — add once digital converts; Gelato/Printful + Etsy):**
| Product | GBP | Net margin | Speed |
|---|---|---|---|
| Natal Star-Map Print A3 | **£20** | ~£8–11 | ★★★ hero physical |
| Star-Map Print A2 | **£28** | ~£12–16 | ★★ |
| Framed natal/constellation print | **£35** | ~£7–12 | ★★ giftable |
| "Your Sky" tee | **£18** | ~£1–3 | ★★ |
| Chart mug | **£9** | ~£1–3 | ★★★ impulse/add-on |
| Big Three mini-print | **£10** | ~£1–2 | ★★ |
| ~~Hoodie £62~~ | defer | thin/return risk | ★ |

**What sells fastest (2026 evidence):** personalised + a specific **date/name** wins — a **"two skies" relationship/anniversary star map** is likely your fastest physical seller; **moon-phase décor +63% YoY**; Etsy best-sellers = **foil natal prints** + detailed readings + **astrocartography maps** (a strong, almost-uncontested differentiator you can compute).

## Minimum Viable Shop (open with this — digital-only, hand-fulfilled, no host migration)
1. **Ko-fi tip jar** → `tipUrl`.
2. **Email list / Chart Wallpaper** → `newsletterUrl` (capture now live site-wide).
3. **£6 Natal Poster PDF** → Gumroad/LS, set `posterUrl` + the SKU's `fulfilUrl`.
4. **£12 Deep Reading PDF** → Lemon Squeezy (MoR, EU VAT handled), set `deepReadingUrl` + `fulfilUrl`.

Then: **week 2–6** add the £16 bundle + Gift; **month 2+** open Etsy POD (lead with the £20 A3 star-map + £9 mug + the "two skies" print), set `checkout.etsyUrl`; **month 3+** tee, framed, foil, astrocartography. **Defer** the hoodie and any subscription.

## Pre-open fix checklist

### Dev / agent (Waves 18–21)
- ☑ `currency 'USD'→'GBP'` + `$`→`£` in shop-commerce.js — Wave 18–20
- ☑ reconcile prices (ap-v116: reading £12, poster PDF £6, bundle £16)
- ☑ add free Chart Wallpaper lead-magnet (rung 0) — `#shop-wallpaper-lead`
- ☑ fix affiliate honesty (soften banner when no tag) — `affiliate-social.js`
- ☑ add made-to-order turnaround copy — hero + featured lede
- ☑ JSON-LD `availability` dynamic per SKU — `schemaAvailability()` Wave 21

### Owner (do not fake — paste real URLs when products exist)
- ☐ Paste Lemon Squeezy / Etsy / Gelato **`fulfilUrl` per SKU** in `AP_MON.commerce.products` (and `checkout.*` URLs as needed)
- ☐ Set **`affiliateTag`** (Amazon Associates) when approved
- ☐ Set **`newsletterUrl`** / **`tipUrl`** when backends are live
- ☐ Smoke-test one live checkout end-to-end before announcing shop open