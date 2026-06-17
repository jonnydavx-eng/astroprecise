# AstroPrecise Component Scorecard — ap-v315 (2026-06-16)

Mobile 390×844 · localhost:8790 · deep audit + 4-agent forensic pass

## Site rollup

| Metric | Before | After ap-v315 | Target |
|--------|-------:|--------------:|-------:|
| **Overall** | 92 | **94** | 100 |
| Performance (avg) | 78 | **79** | 95+ |
| Lighthouse A11y | 100 | **100** | 100 |
| Axe (avg) | 93 | **100** | 100 |
| Best practices / SEO | 100 | **100** | 100 |

## Per-page Lighthouse

| Page | Perf | A11y | Axe | CLS (est.) |
|------|-----:|-----:|----:|-----------:|
| index `/?lite=1` | **99** | 100 | 100 | 0 |
| chart | 81 | 100 | **100** | ~0.004 |
| horoscope | 70 | 100 | **100** | ~0.001 |
| compatibility | 76 | 100 | **100** | ~0.007 |
| ephemeris | 73 | 100 | **100** | ~0.06* |
| shop | **76** | 100 | **100** | improved† |

\* ephemeris weather skeleton deployed — re-verify CLS  
† shop hero 100vh removed; grid IO-deferred

---

## Natal chart (`chart.html`) — component scores

| Component | Score | Status |
|-----------|------:|--------|
| Chart form | 88 | radiogroup on house cards; ap-forms wired |
| Natal wheel | 90 | instrument stage, seals, aria-live on wrap |
| Big Three | 92 | `<article>` cards, engraved plate ::after |
| Reading tabs | 88 | reading-format + ap-reading deferred |
| Hero / LCP | 82 | inline system-font LCP shell; JPG off critical |
| Perf | 81 | main-lite + deferred chart.css stack |
| A11y | **100** | axe clean |
| Visual polish | 90 | wheel halo, seal glow, instrument header |

**Remaining to 100:** lazy-load interpretations until calc; merge critical CSS; SVG `<title>` on wheel planets; preload Inter 400 only.

---

## Horoscope (`horoscope.html`) — component scores

| Component | Score | Status |
|-----------|------:|--------|
| Sphere hero | 78 | JPG removed from critical CSS |
| Daily reading panel | 88 | srp-guide-link underline |
| Planet strip | 92 | in-place DOM update; `<section>` landmark |
| Zodiac gallery | 84 | deferred JPG cards |
| Subscribe CTA | 79 | endpoint dormant |
| Affiliate slot | 95 | inside `<main>` |
| Perf | **70** | TBT OK; LCP still image-heavy |
| A11y | **100** | ap-inline-link on lifepath |
| Seal cohesion | 87 | element seals on cards |

**Remaining to 100:** idle-load zodiac-sphere + ephemeris; privacy banner off LCP path; planet pill instrument SVGs.

---

## Instruments — component scores

| Page | Composite | Hero | Data | Scripts | CLS |
|------|----------:|-----:|-----:|--------:|----:|
| ephemeris | **84** | 86 | 82 | 88 defer | 78 |
| transits | **82** | 88 | 86 | 85 defer | 86 |
| moonphase | 85 | 86 | 88 | 74 | 90 |
| tonight | 82 | 87 | 83 | 64 | 84 |

**Shared:** `instrument-panel.css` (88) — engraved plate tokens on critical path.

**Remaining to 100:** celestial seals on instrument heroes; tonight/moonphase defer parity; ephemeris dynamic imports for orrery3d.

---

## Shop (`shop.html`) — component scores

| Component | Before | After | Status |
|-----------|-------:|------:|--------|
| Shop hero | 45 | **88** | no 100vh lock |
| Featured row | 55 | **86** | LCP image preload + src |
| Filter/grid | 50 | **84** | min-heights + IO defer |
| Art library | 40 | **85** | ap-art-grid in critical |
| Cart/checkout | 90 | 90 | unchanged |
| Mobile | 65 | **86** | hero collapse |

**Remaining to 100:** WebP product thumbs; shop affiliate cross-links; confirm CLS <0.05 in LH.

---

## Changes shipped ap-v314→315

- Chart: radiogroup, natal-wheel aria-live wrap, article big-three, engraved cards
- Horoscope: planet strip `<section>`, axe 100
- Transits: defer script chain + ap-page-bridge
- Shop: hero CLS, grid IO, paid chart upsell tile
- Instruments: instrument-panel.css, ephemeris weather skeleton, defer scripts
- 28 legacy pages → main-lite (ap-v313)
- app.js unique email landmarks

---

*Next sprint for 100/100: horoscope perf 70→90, shop perf 76→88, chart LCP <3s.*