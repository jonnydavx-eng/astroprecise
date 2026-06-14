# AstroPrecise — Link-in-Bio Setup

_The social funnel front door. One link that leads with the free chart tool → captures an email →
points to the shop. Pairs with `GTM-LADDER.md` (the ladder), `GROWTH.md` (channels/market),
`POD-PLAYBOOK.md` (merch)._

- **Platform:** Beacons.ai or Linktree (free tier works) — or, since the site is already great, just
  link straight to the live tool and skip the middleman where you can.
- **URL:** `beacons.ai/astroprecise` / `linktr.ee/astroprecise`
- **Live site:** `https://jonnydavx-eng.github.io/astroprecise/`
- **Purpose:** turn AstroTok/Pinterest/IG attention into (1) a free chart, (2) an email, (3) a sale —
  in that order. **Lead with the free, genuinely accurate tool** — it's the differentiator and the hook.

## The funnel logic (front → middle → end)
**FREE TOOL → EMAIL → SHOP.** Never lead with "buy." Lead with the thing that's free and unusually good
(an accurate, private birth chart), capture the email on the way, and let the shop be the natural next
step for people who already got value.

## Page structure (top to bottom)

### 1. Avatar + headline
- **AVATAR:** AstroPrecise mark (gold on void `#090b16`)
- **HEADLINE:** AstroPrecise
- **SUBHEADLINE:** Genuinely accurate astrology — your real sky, computed privately. ✦

### 2. Primary links (in order — free tool first)

✦ **[FREE BIRTH CHART — Your Real Sky]**
→ `https://jonnydavx-eng.github.io/astroprecise/chart.html`
_Every number is real (VSOP87/ELP2000). Computed in your browser — your birth data never leaves your
device. Free to cast._

☉ **[TODAY'S SKY & YOUR HOROSCOPE]**
→ `https://jonnydavx-eng.github.io/astroprecise/horoscope.html`
_Live planetary weather + your sign's reading. Free._

❤ **[COMPATIBILITY / SYNASTRY]**
→ `https://jonnydavx-eng.github.io/astroprecise/compatibility.html`
_Two charts, the real aspects between them. Shareable. Free._

📩 **[FREE CHART WALLPAPER — to your inbox]**
→ Hosted email signup (Buttondown / Kit / MailerLite landing page)
_Your sky as a phone + desktop background, plus the occasional cosmic-weather note. One email, that's it._

✷ **[GET THE DEEP READING — £12]**
→ Hosted product (Gumroad), the `deepReadingUrl` target
_A beautiful 6–10 page reading of your exact chart. Or the print-at-home Natal Poster, £6._

🖼 **[WEAR YOUR SKY — SHOP]**
→ Etsy / Gelato store (the `posterUrl` target)
_Your real natal chart as a framed print, tee, or mug. Made to order from your birth data._

### 3. Secondary links
📌 **[PINTEREST]** → your boards _("Natal poster ideas," "Your rising sign," sky art)_
🎵 **[TIKTOK — #AstroTok]** → daily "today's sky" / "what Pluto in Aquarius means" (the growth engine)
📷 **[INSTAGRAM]** → chart art + reels
💬 **[REDDIT r/astrology post]** → "I built a genuinely accurate, private, free birth-chart tool"

### 4. Embeds / widgets (optional)
- **SHOP GRID:** 3–4 bestsellers (natal poster, sky tee, framed print)
- **LATEST REEL:** your most recent "today's sky" short

## Beacons / Linktree theme settings (cosmic palette)
- **Theme:** Dark
- **Background:** solid void `#090b16` or a subtle starfield
- **Accent / button color:** gold `#c4920a`
- **Secondary accent:** lapis `#2a4a94`
- **Text color:** parchment `#f0e8d8`
- **Font:** serif display for headline, clean sans for body
- **Button style:** rounded, solid fill
- **Social icons:** TikTok, Instagram, Pinterest, Reddit

## Bio copy (paste-ready, re-themed)

### Instagram bio (≤150 chars)
```
AstroPrecise ✦
Genuinely accurate astrology. Your real sky, computed privately.
Free birth chart ↓
[link-in-bio URL]
```

### TikTok bio (≤80 chars)
```
Real, accurate astrology ✦
Free birth chart ↓
[link-in-bio URL]
```

### Pinterest bio
```
AstroPrecise — accurate, private astrology. Free birth charts, real planetary
weather, and natal chart posters made from your exact sky. Tap for your free chart ↓
```

### YouTube / channel description
```
AstroPrecise — genuinely accurate astrology. We make short videos from a live,
real sky: "today's sky," "what your rising sign means," "Pluto in Aquarius
explained." The site computes every chart for real (VSOP87/ELP2000) and privately
(in your browser — your birth data never leaves your device).

✦ Free birth chart: jonnydavx-eng.github.io/astroprecise/chart.html
📩 Free chart wallpaper + cosmic weather: link in bio
🖼 Wear your sky (posters, tees): link in bio
```

## The two rules, applied to the funnel (from CLAUDE.md)
1. **Nothing fake.** Only list links that work. The £12 reading / shop links go live **only** once the
   storefront product exists (paste the URL into `AP_MON` — `deepReadingUrl`, `posterUrl`, `giftUrl`).
   Until then, lead with the free tool + email signup, which are real today. Never link a "buy" that
   404s or fakes a checkout.
2. **All links in one config.** The on-site CTAs the funnel sends traffic to are wired through the single
   `window.AP_MON` block in `website/js/app.js` (`emailUrl`/`newsletterUrl`, `deepReadingUrl`,
   `reportUrl`, `posterUrl`, `giftUrl`, `tipUrl`) and `data-mon` surfaces — so the link-in-bio and the
   site stay consistent: one URL change updates everywhere, no scattered buttons.

## Privacy note for the funnel
Only a **volunteered email** ever leaves the device — birth data is computed in-browser and is **never**
transmitted. Say this plainly in the email-capture link ("your birth data stays on your device") — it's a
genuine differentiator vs Co-Star/Chani and a conversion booster, not just compliance.
