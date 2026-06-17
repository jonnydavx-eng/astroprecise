# AstroPrecise — Social Accounts Setup

_Owner checklist. Complete in order. Art assets in `marketing/social/` (regenerate: `py tools/make-mission-control-social.py`)._

**Bio link for every platform:** `https://astroprecise.app/links.html`

**Handle everywhere:** `@astroprecise` (fallback: `@astroprecise.sky` if taken)

---

## Before you start

- [ ] Art pack generated: `py tools/make-mission-control-social.py`
- [ ] Review assets: open `tools/social-pack/mission-control-preview.html`
- [ ] Postiz authenticated (`postiz auth:status` shows valid)
- [ ] Business email working: `hello@astroprecise.app`

---

## 1. X (Twitter) — priority

**Why first:** Conversation velocity drives profile clicks; pairs with reply strategy in `outreach-content.js`.

| Field | Value |
|---|---|
| Handle | `@astroprecise` |
| Display name | `AstroPrecise ✦ Mission Control` |
| Bio | See paste-ready below |
| Website | `https://astroprecise.app/links.html` |
| Banner | `marketing/social/banner-x-1500x500.jpg` |
| Avatar | `website/img/icon-512.png` (crop to circle) |
| Pinned post | See `outreach-content.js` → `xTraffic.profile.pinnedPost` |

**Bio (160 chars):**
```
Mission Control for your sky ✦
Real ephemeris · computed in your browser
Birth data never uploaded
Free chart ↓
```

**Pinned post:**
```
I built a birth-chart tool that never uploads your birth data.

VSOP87 astronomy. Free chart. Your sky as wallpaper.

Start here → https://astroprecise.app/links.html
```

- [ ] Account created
- [ ] X Premium considered (For You priority)
- [ ] Connected in Postiz
- [ ] URL pasted into `AP_SOCIAL.x` in `app.js`

---

## 2. TikTok — growth engine

| Field | Value |
|---|---|
| Handle | `@astroprecise` |
| Display name | `AstroPrecise` |
| Bio | `Mission Control for your sky ✦ Real math. Free chart ↓` |
| Link | `https://astroprecise.app/links.html` (needs 1k followers OR TikTok business) |
| Avatar | `marketing/social/avatar-400.jpg` |

**Content:** Screen-record chart wheel, orrery, transits panel. Mission Control text overlays from CapCut template (gold Consolas on void).

- [ ] Account created (business account recommended)
- [ ] Connected in Postiz
- [ ] URL pasted into `AP_SOCIAL.tiktok`

---

## 3. Instagram

| Field | Value |
|---|---|
| Handle | `@astroprecise` |
| Name | `AstroPrecise` |
| Bio | See below |
| Link | `https://astroprecise.app/links.html` |
| Avatar | `marketing/social/avatar-400.jpg` |
| Highlights | `FREE CHART` · `SHOP` · `PRIVACY` · `ORRERY` |

**Bio (150 chars):**
```
Mission Control for your sky ✦
Genuinely accurate · private · free birth chart
VSOP87 ephemeris — every number is real
↓
```

- [ ] Account created (creator/business)
- [ ] Reels + feed connected in Postiz
- [ ] URL pasted into `AP_SOCIAL.instagram`

---

## 4. Pinterest — poster funnel

| Field | Value |
|---|---|
| Handle | `@astroprecise` |
| Display name | `AstroPrecise — Wear Your Sky` |
| Bio | See below |
| Website claim | `https://astroprecise.app` |
| Board 1 | `Natal Chart Wall Art` |
| Board 2 | `Birth Chart Education` |
| Board 3 | `Cosmic Mission Control` |

**Bio:**
```
Accurate, private astrology. Free birth charts from real ephemeris math.
Natal posters made from your exact sky — one of one.
#WearYourSky
```

**First pins:** upload from `marketing/social/pin-*.jpg` — all link to `links.html`.

- [ ] Account created (business)
- [ ] Connected in Postiz
- [ ] URL pasted into `AP_SOCIAL.pinterest`

---

## 5. YouTube

| Field | Value |
|---|---|
| Handle | `@astroprecise` |
| Channel name | `AstroPrecise` |
| Banner | `marketing/social/banner-youtube-2560x1440.jpg` |
| Avatar | `marketing/social/avatar-400.jpg` |
| Description | From `LINK-IN-BIO.md` YouTube section (update URL to astroprecise.app) |

- [ ] Channel created
- [ ] Shorts enabled (mirror TikTok edits)
- [ ] URL pasted into `AP_SOCIAL.youtube`

---

## 6. Reddit

| Field | Value |
|---|---|
| Username | `astroprecise` or aged personal account |
| Profile bio | `Built AstroPrecise — free, accurate, private birth charts. https://astroprecise.app` |

**Rules:** Read r/astrology self-promo rules. Lead with contribution. One value post/week max.

- [ ] Account ready (karma if new)
- [ ] Connected in Postiz
- [ ] URL pasted into `AP_SOCIAL.reddit`

---

## 7. Threads (after Instagram)

| Field | Value |
|---|---|
| Handle | `@astroprecise` |
| Bio | Mirror Instagram bio |

- [ ] Auto-created from IG or manual
- [ ] URL pasted into `AP_SOCIAL.threads`

---

## 8. Bluesky

| Field | Value |
|---|---|
| Handle | `@astroprecise.bsky.social` |
| Bio | `Mission Control for your sky. VSOP87 ephemeris, computed in-browser, birth data never uploaded. https://astroprecise.app/links.html` |
| Banner | `marketing/social/banner-x-1500x500.jpg` |

- [ ] Account created
- [ ] URL pasted into `AP_SOCIAL.bluesky`

---

## 9. Postiz wiring

```powershell
cd C:\Users\jonny\OneDrive\astroprecise
postiz auth:status          # should show authenticated
# In Postiz dashboard → Channels → connect each platform
.\tools\schedule-free-traffic.ps1   # schedules first pins + X post
# Or one-click:
# "AstroPrecise - Schedule Social Posts.bat"
```

- [ ] TikTok connected
- [ ] Instagram connected
- [ ] Pinterest connected
- [ ] X connected
- [ ] Reddit connected
- [ ] First week scheduled

---

## 10. Flip site config live

In `website/js/app.js`, paste real URLs into `AP_SOCIAL`:

```js
window.AP_SOCIAL = {
  handle:    '@astroprecise',
  tiktok:    'https://www.tiktok.com/@astroprecise',
  instagram: 'https://www.instagram.com/astroprecise',
  pinterest: 'https://www.pinterest.com/astroprecise',
  reddit:    'https://www.reddit.com/user/astroprecise',
  youtube:   'https://www.youtube.com/@astroprecise',
  x:         'https://x.com/astroprecise',
  threads:   'https://www.threads.net/@astroprecise',
  bluesky:   'https://bsky.app/profile/astroprecise.bsky.social',
};
```

Empty string = dormant (footer shows "coming soon" toast). Only paste URLs that **work**.

- [ ] `AP_SOCIAL` updated
- [ ] Footer social icons live on site
- [ ] `links.html` social row populated
- [ ] Hard-refresh + bump `sw.js` if pushed

---

## Daily owner rhythm (15 min minimum)

| Time | Action |
|---|---|
| Morning (7–9am) | Post or confirm scheduled reel; 10 replies on big astro accounts |
| Lunch (12pm) | 1 X telemetry post (from `MISSION-CONTROL-CONTENT.md`) |
| Evening (7–9pm) | Hero video goes live; 10 more replies; check chart casts via bio link |

**Weekly:** Batch-film 7 screen recordings Sunday; queue in Postiz.