# AstroPrecise — Google Play Store Listing & Submission Pack

_Paste-ready pack for submitting AstroPrecise (PWA wrapped as a Trusted Web Activity via PWABuilder) to the Google Play Console. Every claim honours the project honesty rule: accuracy is stated as "to roughly an arcminute (1800–2200 CE)", never "exact"; framing is entertainment; privacy claims match the in-browser, no-server architecture. UK sole trader, no user accounts, no in-app purchases. Pairs with `LAUNCH-PLAN.md`, `LEGAL-LAUNCH.md`, `DOMAIN-SWITCH.md`._

---

## 1. Listing copy

### App title (≤30 chars)
> **AstroPrecise: Birth Chart**  (25 chars ✓)

Alternates (each ≤30): `AstroPrecise — Natal Charts` (27) · `AstroPrecise: Astrology` (23)

> ASO note: title carries brand + the single highest-volume keyword ("Birth Chart"). Don't keyword-stuff — Play ranks the full description too, and a clean brand+category title converts better.

### Short description (≤80 chars)
> **Free, precise birth charts & horoscopes. Real astronomy, computed privately.**  (77 ✓)

Alternates: `Free natal chart & horoscope app. Real ephemeris, private, no account needed.` (76) · `Your real birth chart, rising sign & daily horoscope — free & fully private.` (75)

### Full description (≤4000 chars; ≈3,180 — paste as plain text, Play supports only line breaks + emoji)

```
AstroPrecise is a free birth chart and horoscope app that does something rare: every number it shows is real. Your natal chart is computed from genuine astronomical data (the VSOP87 and ELP2000 models) right on your device — accurate to roughly an arcminute for years 1800–2200 CE. No vague guesses, no canned content feed.

★ YOUR FREE BIRTH CHART (NATAL CHART)
Enter your birth date, time and place and get your complete natal chart in seconds: all 10 planets, 12 houses, your rising sign (ascendant), Sun sign, Moon sign, and every major and minor aspect with precise orbs. Clear interpretations and a downloadable chart poster included — completely free.

★ DAILY HOROSCOPE THAT'S ACTUALLY CALCULATED
Sign-specific daily readings derived from the real planetary transits happening right now — not random generic predictions. Deterministic and honest: the same sign on the same day always gives the same reading.

★ FIND YOUR RISING SIGN, SUN & MOON
Discover your big three and what they mean. Explore all 12 zodiac signs with grounded, well-written interpretations.

★ COMPATIBILITY (SYNASTRY)
Overlay two charts for a full synastry reading — inter-chart aspects, elemental compatibility, and a shareable link.

★ LIFE PATH NUMEROLOGY
Your Life Path, Expression, Soul Urge and Personal Year numbers, calculated by Pythagorean reduction with master numbers preserved.

★ THE INSTRUMENT — a real cosmic observatory
A live planetary orrery you can scrub through time, your birth-light cone, your zenith star, planetary hours, and live NOAA space-weather feeds (clearly labelled with their sources).

★ BEAUTIFUL, SHAREABLE ARTIFACTS
Generate elegant chart cards and posters to save or share. Made client-side, on your device.

— WHY ASTROPRECISE IS DIFFERENT —

✓ GENUINELY ACCURATE. A real ephemeris engine computes full natal and transit charts on-device — not a content feed, not web clippings. Accuracy to roughly an arcminute (1800–2200 CE).

✓ PRIVATE BY DESIGN. Everything is computed in your browser/app. Your birth data never leaves your device. No account. No sign-up. No tracking. No ads.

✓ FREE TO CAST. The chart tool is free — no paywall on the truth. The full personalised reading is an optional one-time purchase.

✓ NO ACCOUNT NEEDED. Open it and go. We don't store your data because we never receive it.

Whether you're a curious beginner learning your rising sign or a seasoned astrologer who wants real precision and real privacy, AstroPrecise gives you the genuine sky — beautifully.

— IMPORTANT —

AstroPrecise is provided for entertainment and personal-interest purposes only. It does not provide medical, financial, legal, psychological or other professional advice. Always consult a qualified professional for decisions in those areas.

Get your free, precise, private birth chart today.
```

> Keywords woven in naturally: free birth chart, natal chart, astrology, horoscope, rising sign, ascendant, Sun/Moon sign, zodiac, daily horoscope, compatibility, synastry, numerology, life path, transits, planetary positions.

---

## 2. Data Safety form

Use **Variant A** at launch (email list OFF). Switch to **Variant B** the same day the newsletter/fulfilment goes live (which also triggers ICO registration £52/yr per `LEGAL-LAUNCH.md`).

**Shared:** Encrypted in transit = **Yes** (HTTPS). Privacy policy URL = `https://astroprecise.app/privacy.html`.
> Reviewer framing: birth data (date/time/place) is entered + processed **only on-device**, never transmitted — under Google's definitions that is **not "collected" and not "shared,"** so it appears in neither variant.

### Variant A — LAUNCH (email list OFF)
- Collect or share any user data? → **No.** → listing shows **"No data collected" / "No data shared."**
- Encrypted in transit: Yes. Deletion method: N/A (nothing collected). Note: "All computation is on-device; no personal data is collected or transmitted."

### Variant B — email list ON
- Collect any user data? → **Yes** (collect only, not shared). Declare **Personal info → Email address**: Collected **Yes**, Shared **No**, **Optional**, purpose **Developer communications**, used for tracking **No**, advertising **No**.
- Encrypted in transit: Yes. Deletion: **Yes** — unsubscribe link in every email + email contact to erase; URL `https://astroprecise.app/privacy.html`. Accounts: none (subscription ≠ account) → account-deletion mandate still N/A.
> Never declare birth data, location, device IDs, or analytics — the app collects none. Adding analytics/crash-reporting later requires revising this form.

---

## 3. Content rating (IARC questionnaire)
Pick category **Reference / Utility** (NOT "Game"). Answers — violence **No**, graphic violence **No**, sexual content/nudity **No**, profanity **No**, controlled substances **No**, real-money gambling **No**, **simulated gambling No**, frightening-to-children **No**, real-world purchase facilitation **No** (commerce is external web only), shares location with users **No**, user interaction/UGC/chat **No**, IAP **No**, mature/suggestive themes **No**.
> IARC has no "fortune-telling" flag; astrology = general-audience reference/lifestyle (Co-Star/CHANI rate 4+/general). **Expected: PEGI 3 / Everyone / Rated for 3+.**

---

## 4. Target audience & ads
- Target age: **13+** (13–15, 16–17, 18+) — **no** under-13 band.
- Primarily directed at children? **No** (NOT made-for-kids). Designed for Families? **No.**
- Ads? **No.** News app? No. IAP? **No** (all purchases on external web storefronts).
> 13+ keeps it out of the Families/Teacher-Approved scrutiny track while accurate; "No ads + No data collected (Variant A)" makes the classification clean and low-risk.

---

## 5. Screenshot shot-list
Specs: PNG/JPEG, 24-bit (no alpha), portrait phone (e.g. 1080×2340), min 2 / max 8 — supply all 8. Caption = short bold gold (#C9A227) line on a void (#06060f) band. Capture from the live PWA in a 1080-wide Chrome viewport (no TWA chrome).

| # | Screen | Caption overlay |
|---|---|---|
| 1 | Home / hero — living 3D orrery + "Cast My Chart" | **Your real birth chart. Free.** |
| 2 | Birth chart wheel — planets + houses + aspects | **Every planet, house & aspect — computed live** |
| 3 | Placements — Sun/Moon/Rising with degrees | **Know your Sun, Moon & Rising sign** |
| 4 | Daily horoscope + live planet weather strip | **A horoscope that's actually calculated** |
| 5 | Compatibility / synastry overlay + score | **See how two charts connect** |
| 6 | The Instrument — light-cone / zenith / orrery scrubber | **A real cosmic observatory in your pocket** |
| 7 | Privacy callout — "0 bytes sent to servers" badge | **Your birth data never leaves your device** |
| 8 | Share card / poster artifact | **Beautiful charts you can save & share** |

> Play shows the first 2–3 in search — lead with the orrery (1) and the wheel (2).

---

## 6. Graphic asset specs
Palette: gold `#C9A227`, void `#06060f`, lapis `#2a4a94`, parchment `#F0E8D8`.

**App icon — 512×512 PNG (32-bit):** a carved-gold celestial mark (the site's `✦`/astrolabe seal) on the void field with a faint radial lapis glow. **Maskable safe zone:** keep all essential art inside the central 80% (~409px) circle. (The manifest already ships `icon-maskable-512.png` — confirmed present.) No text, high contrast.

**Feature graphic — 1024×500 (JPEG / 24-bit PNG, no alpha):** left third = wordmark **AstroPrecise** (parchment→gold) + tagline **"Every number is real."**; right two-thirds = the glowing orrery/wheel bleeding off the edge, lapis nebula behind. Keep text within the centre 924×400. No "exact"/"100% accurate" wording.

Optional: promo video (orrery time-scrub + a live chart cast), tablet screenshots.

---

## 7. Review / release notes (rejection pre-emption)
Paste into **App content → reviewer notes** (and reuse the lead line in the first "What's new"). Directly answers the two real Play risks (webview/minimum-functionality and fortune-telling spam):

```
AstroPrecise computes full natal and transit charts ON-DEVICE using a real
astronomical ephemeris engine (VSOP87 / ELP2000 models). It is NOT a content
feed, web clipping, or a wrapper around generic horoscope text — the app
calculates genuine planetary positions, houses, aspects, rising sign and
compatibility locally, accurate to roughly an arcminute for years 1800–2200 CE.

Technical notes for review:
• Trusted Web Activity (TWA) wrapping our installable PWA; Digital Asset Links
  (assetlinks.json) verified at the origin root, so it runs full-screen, no URL bar.
• Substantial native-equivalent functionality: interactive 3D orrery with a time
  scrubber, full birth-chart wheel rendering, synastry overlay, Life Path
  numerology, planetary-hours and zenith-star tools, client-side share-card
  generation — all working offline after first load via a service worker.
• PRIVACY: all birth-data computation happens on the device; no birth data is ever
  transmitted to our servers or any third party. No analytics, no ads. The only
  outbound calls are clearly-labelled public feeds (e.g. NOAA space-weather) and an
  optional place-search geocoder (typed place text only — never the birth moment).
• ACCOUNTS: none, no sign-in, so the account-deletion requirement does not apply.
• PURCHASES: no in-app purchases; no paywall; any optional products sell only on
  external websites.

Disclaimers (also in-app and in the listing): AstroPrecise is for ENTERTAINMENT and
personal-interest purposes only. It does NOT provide medical, financial, legal,
psychological, or other professional advice; consult a qualified professional.

Privacy policy: https://astroprecise.app/privacy.html
Terms: https://astroprecise.app/terms.html
```

**First "What's new" (≤500 chars):**
```
Welcome to AstroPrecise — your free, private, genuinely-accurate birth chart.
Real astronomy computed on your device (accurate to ~an arcminute, 1800–2200 CE):
full natal charts, rising sign, daily horoscopes, compatibility, numerology, and
a live cosmic orrery. No account, no tracking, no ads. For entertainment only.
```

---

## Submission checklist
- [ ] Custom domain live; `assetlinks.json` at `https://astroprecise.app/.well-known/assetlinks.json` with the **Play App Signing** SHA-256 (see `DOMAIN-SWITCH.md`).
- [ ] Title / short / full description (§1).
- [ ] Data Safety — **Variant A** for launch (§2).
- [ ] Content rating → PEGI 3 / Everyone (§3).
- [ ] Target audience 13+, not made-for-kids, "No ads," no IAP (§4).
- [ ] 8 phone screenshots + captions (§5).
- [ ] 512² icon (maskable-safe) + 1024×500 feature graphic (§6).
- [ ] Reviewer notes + "What's new" (§7).
- [ ] Privacy-policy URL in listing + App content.
- [ ] Closed test: 12+ testers opted in for 14 consecutive days before applying for production.
