# AstroPrecise — Pricing, Monetization & Go-To-Market

_2026-06-13. Market facts web-verified. Pairs with `MONETIZATION.md` (the route/ToS detail)._

## The market (why this is worth doing)
- Astrology-**app** market ≈ **$4.7B (2025) → $5.7B (2026)**, ~**20% CAGR**; broader astrology industry ~$15B. ([MarketResearchFuture](https://www.marketresearchfuture.com/reports/astrology-market-22040), [TBRC](https://www.thebusinessresearchcompany.com/report/astrology-app-global-market-report))
- Co-Star: ~**20M downloads**, ~**$400K/month**, **$9/mo**. Chani: **$11.99/mo**. ([Co-Star](https://apps.apple.com/us/app/co-star-personalized-astrology/id1264782561), [Chani](https://chaninicholas.zendesk.com/hc/en-us/articles/1500001732281-App-Pricing))
- Etsy natal-report PDFs: **$17–25** typical; long/30+ page reports command more. ([Etsy](https://www.etsy.com/market/birth_chart_report))
- Growth channel: **#AstroTok / TikTok** (billions of views), Instagram, Pinterest. ([Entrepreneur](https://www.entrepreneur.com/en-in/news-and-trends/the-rise-of-digital-astrology-how-a-traditional-practice/499975))

**Our wedge vs Co-Star/Chani:** they're vague and subscription-walled; AstroPrecise is **genuinely accurate** (real VSOP87/ELP2000, "every number is real"), **private** (computes in-browser), and produces **beautiful artifacts**. Accuracy + craft + privacy is an unoccupied corner.

## Pricing (GBP)
The free, accurate tool is the funnel. We sell **artifacts, depth, gifts** — never the truth.

| Product | Price | Notes |
|---|---|---|
| **The Deep Reading** (PDF, ~6–10pp, the Desktop sample) | **£24** | premium vs Etsy's £14–20 — justified by craft + accuracy |
| **Natal Chart Poster** — digital PDF (print-at-home) | **£12** | the Pinterest/IG magnet; also a free taster → upsell |
| **Natal Chart Poster** — physical print (print-on-demand) | **£34–45** | A3/A2 via Gelato/Printful; margin after print cost |
| **Reading + Poster bundle** | **£32** | anchor the £24+£12 against this |
| **Gift a Reading** | **£28** | gifting carries a premium; Valentine's/birthday seasonal |
| **Tip / "keep the sky free"** | pay-what-you-want | Ko-fi, 0% on tips |
| **Cosmic Weather** subscription _(Phase 2)_ | **£4.99/mo** | deliberately undercuts Co-Star £9 / Chani £12 |
| **Engine API licensing** _(Phase 3, B2B)_ | bespoke | the corrected ephemeris is genuinely good IP |

Psychology: one **anchor** (the bundle), one **hero** (£24 Deep Reading), one **doorway** (free chart + £12 poster). Don't build a 4-tier subscription wall — it fights the brand.

## How the money is actually made (implementation)
The products are **personalised** (per birth data), but a static site + hosted checkout delivers a *fixed* file. So:

- **Phase 1 — manual fulfilment (the Etsy model, viable today):** customer pays on **Gumroad** (hosted, merchant-of-record, handles EU VAT, ~10%+£0.50) → a post-purchase form collects birth data → you run **the generator** (the exact `ap-samples` script that produced the Desktop samples) → email the PDF within 24h. ~2 minutes of work per order, ~90% margin. Tips via **Ko-fi**. Affiliate links on the shop page. All wired already: paste the URLs into the `AP_MON` block in `app.js`.
- **Phase 2 — automation (needs a host move):** migrate GitHub Pages → **Cloudflare Pages** (free, allows commerce) + a **Worker**: Stripe webhook on payment → generate PDF from submitted birth data → auto-email. Unlocks instant delivery + the subscription.
- **Posters:** sell the **digital PDF** now (manual), and for **physical prints** upload the generated poster per order to **Gelato/Printful** (or run a small Etsy shop that links from the site).

**Key asset:** the generator IS the fulfilment engine and a marketing engine — it turns any birth data into a sellable artifact in seconds.

## Marketing — the free tool is the top of funnel
1. **TikTok / Reels (#AstroTok)** — the growth engine. Daily, fast content the site *already computes for free*: "today's sky," "what Pluto in Aquarius means," "your rising sign's hidden gift." Cheap to produce because the data is live.
2. **Pinterest** — the **chart poster is perfect Pinterest content**; pin variations → drive to the free chart tool. Astrology + Pinterest skews exactly our buyer (women, Gen Z/Millennial).
3. **SEO** — already built for it: 12 sign landing pages + "free birth chart calculator." Submit sitemap to Search Console; this compounds for free.
4. **Reddit / communities** — r/astrology values *accuracy*; lead with "I built a genuinely accurate, private, free birth-chart tool" (our actual differentiator).
5. **Email list** — capture on every free chart ("save your chart / get your cosmic weather") → the channel that sells the Deep Reading and seasonal gifts.
6. **Influencer seeding** — gift the Deep Reading to mid-tier AstroTok/IG astrologers for honest posts.

## Go-to-market — taking it to the masses
- **Phase 0 — Ship (this week):** `git push` live; flip Pages→Actions; fill legal placeholders; create Gumroad + Ko-fi; paste into `AP_MON`. Soft-launch the *free tool* (Reddit, personal socials), start collecting emails.
- **Phase 1 — Prove (weeks 1–6):** publish 1 short video/day from the live sky; pin posters; manual-fulfil the first Deep Readings. Goal: first 100 emails, first 10 sales — validates price & message.
- **Phase 2 — Compound (months 2–6):** consistent content cadence, SEO maturing, Pinterest flywheel; migrate host + automate delivery; launch the £4.99 Cosmic Weather subscription to the warm email list.
- **Phase 3 — Scale (6mo+):** PWA → app-store wrappers; paid TikTok/IG once a product converts; B2B engine-API licensing; localisation.

**Honest sequencing:** don't pour money into ads before one organic product converts. The order is *free tool → audience → first organic sales → automate → then amplify*. The unfair advantages — real accuracy, privacy, auto-generated artifacts + content — are all already built.
