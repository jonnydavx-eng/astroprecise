# AstroPrecise — Price Ladder (GTM)

_The re-themed monetization ladder. Every rung is live on the site or one config link away._
_Pairs with `MONETIZATION.md` (routes/ToS), `GROWTH.md` (market + prices), `POD-PLAYBOOK.md` (merch ops), `LINK-IN-BIO.md` (the funnel front door)._

The free, genuinely accurate chart tool is the funnel. We sell **artifacts, depth, gifts, and craft —
never the truth**. Accuracy stays free forever; that promise is the brand. Everything below is a
**one-time purchase**. There is **no subscription rung** — a recurring membership fights the
"every number is real and free" voice, so it is deliberately dropped. (A `£3.49/mo` Cosmic Weather
letter is sketched in `GROWTH.md` as a Phase-2 *maybe* (**£3.49/mo**); it is **not** part of this launch ladder.)

## The ladder (ascending commitment)

| Rung | Offer | Price (GBP) | Status | `AP_MON` key |
|---|---|---|---|---|
| 0 | **Chart Wallpaper** — your sky as a phone/desktop background (lead magnet) | free / email | the doorway: the chart tool already paints a share image; the wallpaper is its by-product | `emailUrl` / `newsletterUrl` |
| 1 | **Natal Chart Poster — digital PDF** (print-at-home, A3/A2) | **£9** | the Pinterest/IG magnet; sells as a hosted PDF today | `posterUrl` |
| 2 | **The Deep Reading** (PDF, ~6–10pp, the Desktop sample) | **£18** | the hero; still above Etsy noise, priced for impulse | `deepReadingUrl` / `reportUrl` |
| 3 | **Personalized POD merch** — natal poster print, sky tee, chart mug (from *their* chart) | **£13–30** | "wear your sky" — physical print-on-demand, fulfilled per order (see `POD-PLAYBOOK.md`) | `posterUrl` (store) |
| 4 | **Reading + Poster bundle** | **£25** | the anchor: makes £18 + £9 look like a deal | `deepReadingUrl` (bundle product) |
| 5 | **Gift a Reading** | **£22** | gifting carries a premium; Valentine's/birthday/anniversary seasonal | `giftUrl` |
| 6 | **Bespoke natal-art commission** (one-of-one, hand-finished chart artwork) | **£85+** | scarcity at the top; cap at ~5/month to keep the promise true | `posterUrl` (commission listing) or a dedicated hosted product |
| — | **Tip / "keep the sky free"** | pay-what-you-want | Ko-fi, 0% on tips; Pages-permitted, ship first | `tipUrl` |

### Indicative POD price points (rung 3, see `POD-PLAYBOOK.md` for the math)
| Product | Retail (GBP) | Notes |
|---|---|---|
| Natal poster — physical print A3/A2 | **£24–30** | Gelato/Printful; the digital PDF (£9) is the taster → upsell |
| Sky tee (your planets, printed) | **£20–24** | Bella+Canvas-class blank, DTG |
| Chart mug ("your sky, your mug") | **£11–15** | low entry POD impulse buy |
| Star-map / constellation framed print | **£26–32** | back-catalogue companion to the natal poster |

## Why this shape works
- **A free doorway, then a low-friction first paid step.** Free chart → £9 digital poster is a tiny leap;
  it converts curiosity into a first transaction and a saved email.
- **One hero, one anchor.** The £18 Deep Reading is the thing we actually sell; the £25 bundle anchors it
  so £18 reads as restraint, not the ceiling.
- **Physical merch carries the wow and the margin.** "Wear your sky" / "your sky on your wall" is the
  shareable, giftable, Pinterest-native rung — and POD prints/tees carry healthy per-order margin.
- **Gifting monetizes other people's affection** for your customers (and brings in non-astrology buyers).
- **Scarcity at the very top.** The bespoke commission, capped per month, keeps a one-of-one promise honest
  and the waitlist warm — without ever paywalling the free, accurate chart.
- **No subscription wall.** Repeat revenue comes from new artifacts, gifts, and seasonal drops to the
  email list — not from a recurring charge that contradicts "accuracy is free."

## The two hard rules (from CLAUDE.md — non-negotiable)

1. **Nothing fake.** Every rung either **fulfils now** or visibly says **"coming soon."** Never a broken or
   placeholder checkout. The `AP_MON` engine enforces this: a surface with `data-mon` and **no configured
   URL** either vanishes (`data-mon-mode="hide"`, default) or shows a gentle "coming soon"
   (`data-mon-mode="dormant"`). A visitor must never meet a dead Buy button. Birth data is **never** sent;
   only a volunteered email ever leaves the device.

2. **All links in one config — no scattered buttons.** Every paid avenue lives in the single
   `window.AP_MON` block at the top of the monetisation section of `website/js/app.js`. Surfaces opt in
   declaratively with `data-mon="tip|report|poster|gift|newsletter"`; you go live by **pasting one URL**,
   not by hunting hardcoded `href`s across pages. Keys today:
   `tipUrl`, `reportUrl`, `posterUrl`, `giftUrl`, `newsletterUrl`, `affiliateTag`, `deepReadingUrl`, `emailUrl`.

## Mapping each rung to a real, honest route (no host migration needed)

While on GitHub Pages (which **forbids on-site selling** — see `MONETIZATION.md`), every paid rung is a
**link OUT** to a storefront on the provider's own domain, or a tip/crowdfunding link:

| Rung | Route today (Pages-safe) | Phase 2 (after Cloudflare/Netlify move) |
|---|---|---|
| 0 Wallpaper / email | Hosted newsletter form (Buttondown/Kit/MailerLite) → `emailUrl`/`newsletterUrl` | Same; auto-deliver the wallpaper on signup |
| 1 Digital poster PDF | Gumroad hosted PDF → `posterUrl` | On-site Stripe checkout + instant delivery |
| 2 Deep Reading | Gumroad (merchant-of-record, EU VAT) → `deepReadingUrl`; manual-fulfil within 24h | Stripe webhook → auto-generate + email |
| 3 POD merch | Etsy or Gelato/Printful store link-out → `posterUrl` | On-site checkout → POD API per order |
| 4 Bundle | Single Gumroad bundle product → `deepReadingUrl` | On-site checkout |
| 5 Gift | Gumroad/Ko-fi Shop gift product → `giftUrl` | On-site checkout |
| 6 Commission | Hosted listing (Gumroad/Etsy) with a brief form → `posterUrl` or dedicated product | Same (bespoke stays manual by nature) |
| — Tip | Ko-fi (0% on tips) → `tipUrl`; footer "♥ Support this free tool" auto-appears | Same |

## Launch sequence (which rungs first)
1. **Ship the doorway + the tip jar.** Free chart is already live; set `tipUrl` (Ko-fi) and `emailUrl`
   (newsletter). Zero fulfilment burden, Pages-legal, starts the email asset. _Do this first._
2. **Open the hero + first paid step.** Create the £18 Deep Reading and £9 poster as Gumroad products;
   paste `deepReadingUrl` + `posterUrl`. Manual-fulfil (the generator IS the fulfilment engine).
3. **Add gifting + the bundle** once the hero converts (seasonal timing for the gift).
4. **Layer in POD merch** (rung 3) via an Etsy/Gelato store once you have proof the audience buys.
5. **Offer the bespoke commission** only when the waitlist/interest justifies it; keep the monthly cap real.

> Sequencing honesty (from `GROWTH.md`): _free tool → audience → first organic sales → automate → then
> amplify._ Don't open a rung you can't fulfil, and don't pour money into ads before one organic product
> converts.
