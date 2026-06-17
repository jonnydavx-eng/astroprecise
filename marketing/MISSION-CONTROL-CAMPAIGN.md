# AstroPrecise — Mission Control Campaign

_2026-06-16. SpaceX-inspired positioning without copying trademarks. Pairs with `SOCIAL-ACCOUNTS-SETUP.md`, `CONTENT-CALENDAR.md`, `EMAIL-FUNNEL.md`, `GTM-LADDER.md`._

---

## The insight: why SpaceX energy fits AstroPrecise

SpaceX won attention by doing something the industry said was impossible — with **real math, visible telemetry, and zero hand-waving**. AstroPrecise occupies the same corner in astrology:

| SpaceX promise | AstroPrecise parallel |
|---|---|
| "Every number is real" (flight telemetry) | VSOP87/ELP2000 ephemeris — arcminute accuracy, 1800–2200 CE |
| Mission control aesthetic (dark room, gold status lights) | Warm void `#050406` + engraved gold `#C9A227` observatory palette |
| Launch sequence (T-minus, go/no-go) | Cosmic preloader: galaxy → solar system → Earth handoff |
| Precision engineering vs legacy incumbents | vs Co-Star/Chani vague columns and subscription walls |
| Privacy of flight data / no leaks | Birth data computed in-browser — never uploaded |
| Making humanity multiplanetary | Making **your** sky navigable — from cosmos scale to birth minute |
| Starlink in LEO (already in our orrery, ap-v304) | Real LEO traffic in the 3D model — proof we mean "real sky" |

**Brand line:** _Mission Control for your sky._

**Hashtag family:** `#WearYourSky` · `#AstroPrecise` · `#YourSky` · `#MissionControl` (secondary)

We never use SpaceX logos, fonts, or trademarked phrases ("Occupy Mars", etc.). We borrow the **feeling**: precision, telemetry, launch readiness, awe at real orbital mechanics.

---

## Target audience (research-backed)

### Primary (80% of effort)
- **Women 22–38**, UK/US/EU — the #AstroTok core ([Entrepreneur 2025](https://www.entrepreneur.com/en-in/news-and-trends/the-rise-of-digital-astrology-how-a-traditional-practice/499975))
- **Psychographic:** tired of vague apps; wants accuracy + privacy; saves chart posts; buys personalised gifts
- **Platforms:** TikTok/Reels first → Instagram → Pinterest → X → Reddit

### Secondary (20%)
- **Space-curious skeptics** — r/space, NASA eclipse threads, "is Mercury actually retrograde?" myth-busters
- **Gift buyers** — partners/parents buying Deep Reading or natal poster (£12–22)
- **Accuracy-first r/astrology** — builders and serious students who compare ephemerides

### Anti-audience (do not chase)
- Daily horoscope-only scrollers who won't cast a chart
- Crypto/spiritual hustle bait
- Anyone wanting live psychic readings — we sell **artifacts**, not sessions

### Market size (why this is worth doing)
- Astrology-app market ≈ **$5.7B (2026)**, ~20% CAGR ([MarketResearchFuture](https://www.marketresearchfuture.com/reports/astrology-market-22040))
- Co-Star ~20M downloads; Chani $11.99/mo — both subscription-walled and math-opaque
- **Our wedge:** accurate + private + beautiful artifacts. Unoccupied corner.

---

## Channel strategy

### 1. TikTok + Instagram Reels (#AstroTok) — growth engine
- **Cadence:** 1 hero short/day (15–25s), screen-recorded from live site
- **Mission Control hooks:** telemetry overlays, "FLIGHT READINESS" for birth time, T-minus retrograde
- **Best times:** 7–9am, 12–2pm, **7–10pm** (evening strongest)
- **CTA:** always "link in bio" → `https://astroprecise.app/links.html`

### 2. Pinterest — conversion magnet
- Natal poster pins, zenith-star cards, mission-patch style chart art
- **3–4 pins/week**; evergreen; links to free chart first
- **Best time:** 8–11pm

### 3. X (Twitter) — conversation velocity
- 3–5 originals/day + **20–30 substantive replies/day** on astro accounts
- Mission Control one-liners: telemetry-style facts, no hashtag spam
- Bio → `links.html` only; never raw checkout links
- Engage: @NASA (eclipse/transit threads), @chaninicholas, @astro_poets, r/astrology cross-posts

### 4. Reddit — trust builder
- **1 value post/week max** to r/astrology — accuracy-first, builder tone
- Reply to every comment 48h

### 5. YouTube Shorts — mirror TikTok edits
- Same vertical video; schedule if Postiz connected

### 6. Newsletter (`list.astroprecise.app`) — LIVE
- Lead magnet: chart wallpaper (already on-site) + monthly cosmic weather
- Welcome sequence in `EMAIL-FUNNEL.md`; Mission Control variant in `MISSION-CONTROL-CONTENT.md`

### 7. Threads / Bluesky — low-effort mirrors
- Cross-post X hot-takes; Bluesky skews tech/privacy — lean "computed in-browser"

---

## The funnel (every day, every post)

```
Social hook → links.html → free chart (chart.html) → email capture → shop (Lemon Squeezy)
```

**Honesty rule:** product CTAs only when checkout is live. Shop is **LIVE** (13 SKUs). Newsletter is **LIVE**. Lead with free tools always.

---

## Visual system — Mission Control aesthetic

### Palette (matches live site — do NOT use retired cool lapis)
| Token | Hex | Use |
|---|---|---|
| Void | `#050406` | Backgrounds |
| Gold | `#C9A227` | Headlines, telemetry accents |
| Gold light | `#EFE3C0` | Body on dark |
| Parchment | `#E8E0D0` | Secondary text |
| Status green | `#3d8f5a` | "NOMINAL" / go indicators |
| Status amber | `#c4920a` | "CAUTION" / retrograde |

### Typography
- **Display:** Cinzel (brand wordmark feel)
- **Telemetry:** Consolas / Courier New monospace (mission readouts)
- **Body:** Cormorant Garamond italic for warmth

### Layout motifs
- Thin gold border frames (like MCC displays)
- Corner brackets `┌ ─ ┐` on telemetry cards
- Fake-but-honest status lines: `EPHEMERIS: NOMINAL · PRIVACY: LOCAL`
- Hex mission seals (already site-wide via `celestial-seals.js`)
- Screen recordings = proof; never mock UI

### Asset pack
Generated by `tools/make-mission-control-social.py` → `marketing/social/`:
- Profile banners (X 1500×500, LinkedIn 1584×396)
- Pinterest pins (1000×1500)
- Square posts (1080×1080)
- Story/reel end cards (1080×1920)
- Telemetry quote cards (1080×1080)

Preview all: open `tools/social-pack/mission-control-preview.html` in browser.

---

## Content pillars (Mission Control voice)

| Pillar | % | Example hook |
|---|---|---|
| **Telemetry** — real sky facts | 30% | "LIVE TELEMETRY: Moon 14°42′ Pisces · Mercury DIRECT" |
| **Flight readiness** — birth time / accuracy | 25% | "WRONG BIRTH TIME = WRONG RISING. Go/no-go on your certificate." |
| **Launch sequence** — cosmic journey / orrery | 20% | "T-minus to your birth minute. Spin the sky back." |
| **Mission patch** — wear your sky / shop | 15% | "Not your sign. Your sky. One of one." |
| **Ground station** — privacy / engineering | 10% | "Your birth data never leaves the device. Local compute only." |

---

## 30-day launch sequence

### Week 0 — Accounts + assets (owner)
1. Create accounts per `SOCIAL-ACCOUNTS-SETUP.md` (handle: `@astroprecise` everywhere possible)
2. Upload profile art from `marketing/social/`
3. Set bio link → `https://astroprecise.app/links.html`
4. Connect Postiz channels → run `AstroPrecise - Schedule Social Posts.bat`
5. Paste social URLs into `AP_SOCIAL` in `website/js/app.js`

### Week 1 — Awareness (Days 1–7 from `MISSION-CONTROL-CONTENT.md`)
Goal: reach, first followers. Lead with Sun/Moon/Rising + precession hook.

### Week 2 — Authority (Days 8–14)
Goal: saves/shares. Transits, synastry, zenith star, Saturn in Aries.

### Week 3 — Conversion (Days 15–21)
Goal: chart casts + email signups. Screen-record chart.html flow.

### Week 4 — Community + shop (Days 22–30)
Goal: first sales. Deep Reading + poster; gift angle for birthdays.

### Ongoing
- **Daily:** 1 short video + 1 X post + reply block
- **Weekly:** 3 Pinterest pins, 1 Reddit value post, 1 newsletter broadcast (monthly cadence after welcome sequence)
- **Astro-timing:** post transit/Moon content evening before or morning of real event — verify on `transits.html`

---

## Account handles & owned properties

| Property | URL / handle | Status |
|---|---|---|
| Website | https://astroprecise.app | LIVE |
| Link-in-bio | https://astroprecise.app/links.html | LIVE |
| Newsletter | https://list.astroprecise.app/subscribe | LIVE |
| Shop | https://astroprecise.app/shop.html | LIVE (Lemon Squeezy) |
| Tips | https://ko-fi.com/astroprecise | LIVE |
| TikTok | @astroprecise | **CREATE** |
| Instagram | @astroprecise | **CREATE** |
| Pinterest | @astroprecise | **CREATE** |
| X | @astroprecise | **CREATE** (Premium recommended for reach) |
| YouTube | @astroprecise | **CREATE** |
| Reddit | u/astroprecise (aged account preferred) | **CREATE** |
| Threads | @astroprecise | **CREATE** (after IG) |
| Bluesky | @astroprecise.bsky.social | **CREATE** |
| Postiz | Authenticated; **0 integrations** — connect channels | **WIRE** |

---

## Competitor positioning

| Competitor | Their pitch | Our counter (Mission Control voice) |
|---|---|---|
| Co-Star | Vague push notifications, $9/mo | "We show the math. No subscription. No server upload." |
| Chani | Premium readings, $12/mo | "One-time Deep Reading £12 — yours forever, made for your chart." |
| The Pattern | Social graph, not astronomy | "Real ephemeris, not a personality quiz." |
| Cafe Astrology | Text walls, ads | "Live orrery. Real positions. Computed in your browser." |
| Etsy PDF sellers | Generic templates | "Generated from YOUR exact birth minute — arcminute accuracy." |

---

## KPIs (first 90 days)

| Metric | Week 4 target | Day 90 target |
|---|---|---|
| Email subscribers | 50 | 500 |
| Free chart casts (referrer: social) | 200 | 2,000 |
| Social followers (all platforms) | 300 | 3,000 |
| Paid orders | 3 | 30 |
| Reddit post upvotes (value post) | 50+ | — |

Track via: MailerLite/list dashboard, Lemon Squeezy orders, `?utm_source=` on bio link (add when analytics ready — site has no tracking by design).

---

## Legal & honesty (non-negotiable)

- Entertainment framing on all readings; not professional advice
- Accuracy claim: "to roughly an arcminute (1800–2200 CE)" — never "exact"
- Screen recordings must show **real** tool output
- No SpaceX logos, wordmarks, or trademarked slogans
- Append disclaimer on transit/reading posts: _For entertainment. Astronomy computed in-browser. Birth data never leaves your device._

---

## File index

| File | Purpose |
|---|---|
| `marketing/MISSION-CONTROL-CAMPAIGN.md` | This document — strategy + research |
| `marketing/SOCIAL-ACCOUNTS-SETUP.md` | Step-by-step account creation |
| `marketing/MISSION-CONTROL-CONTENT.md` | 14-day paste-ready Mission Control posts |
| `marketing/social/` | Generated profile art + post templates |
| `tools/make-mission-control-social.py` | Regenerate all social art |
| `tools/social-pack/mission-control-preview.html` | Browser preview of asset pack |
| `CONTENT-CALENDAR.md` | Original 14-day calendar (still valid) |
| `CONTENT-PLAN.md` | 30-script video library |
| `EMAIL-FUNNEL.md` | Newsletter sequences |
| `website/js/outreach-content.js` | X posts + email copy (Mission Control batch added) |
| `website/outreach.html` | Owner copy-paste UI |