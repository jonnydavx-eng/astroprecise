# AstroPrecise — Hollywood 2026 Visual Spec

*Four-agent parallel pass: Motion · Color · Cinematic · Micro-interactions*

## Design north star

**Interstellar observatory luxury** — engraved gold on deep void, not generic AI purple gradients. Film grain, vignette depth, specular card sweeps, transform-only motion. Every animation respects `prefers-reduced-motion`.

---

## New CSS architecture (4 layers)

| Layer | File | Role |
|-------|------|------|
| **Palette** | `css/ap-palette-2026.css` | Canonical 2026 tokens — void tiers, gold spectrum, muted elements, observatory washes |
| **Motion** | `css/ap-motion.css` | Rise/fade/scale/stagger utilities; compositor-only (transform + opacity) |
| **Cinematic** | `css/ap-cinematic-2026.css` | Static grain, vignettes, lens flare, h1 glow, corner brackets, specular hover |
| **Micro** | `css/ap-micro-2026.css` | Button press, seal gleam, form rim pulse, card lift, sky-dock alignment lock |

**Load strategy:**
- **Home (`index.html`):** palette + motion + micro + cinematic on critical path (hero is the product)
- **Inner pages:** cinematic + micro + motion **idle-deferred** via `deferPageCss()` — protects LH perf

---

## Animation map (where motion helps)

| Zone | Opportunity | Animation | Trigger |
|------|------------|-----------|---------|
| Lite hero h1 | High | `ap-cine-h1-glow` + gold shimmer | Ambient 5.5s |
| Sky dock | High | `ap-rise-in` panel + alignment-lock shimmer | Ephemeris populate |
| Instrument rail | High | `ap-stagger-in` tiles | First paint |
| Chart wheel | High | `chart-wheel-reveal` + `ap-ring-breathe` halo | `.natal-wheel--loaded` |
| Big Three | High | `ap-scale-in` stagger | Results reveal |
| Horoscope signs | Medium | `ap-stagger-in` grid + `ap-pulse-gold` active | Load / pick |
| Shop cards | Medium | Specular sweep + `-4px` lift | Hover only |
| Ephemeris clock | Medium | `ap-draw-ring` on PH wheel | Section mount |
| Nav transitions | Low | `ap-page-bridge` 350ms fade | Same-origin nav |
| **Preloader WebGL** | **Avoid** | No extra CSS grain/motion on live canvas | — |

---

## Color tokens (ap-palette-2026)

```
Void:     --ap-void-deep #050406 | --ap-void-mid #0D0A07 | --ap-void-raised #13100C
Gold:     --ap-gold-core #C9A227 → --ap-gold-bright #D4B84A → --ap-gold-parchment #EFE3C0
Elements: muted fire/earth/air/water (no neon)
Heroes:   --ap-obs-violet + --ap-obs-burgundy (unified shop/chart/horoscope washes)
Links:    --ap-link #D4B84A (10.48:1 on void)
```

Imported first in `main-lite.css` → propagates site-wide.

---

## Cinematic features

- **Film grain:** fixed SVG turbulence tile, `mix-blend-mode: overlay`, zero animation
- **Vignette:** stacked radials on heroes, wheel stage, sphere wrap
- **Corner brackets:** L-frame system on chart wheel, instrument panels, shop cards
- **Specular sweep:** `translateX` + `skewX` on hover — transform only
- **Typography:** evolved `hero-h1-glow` → `ap-cine-h1-glow` (text-shadow pulse)

Body class: `ap-cinematic-2026` on index, chart, horoscope, shop, ephemeris.

---

## Micro-interactions

- Calculate button: press depth `scale(0.98)`
- Hex seals: engraving gleam via `background-position` sweep
- Forms: gold rim pulse on `:focus-visible`
- Cards: unified `translateY(-4px)` lift
- Bottom nav: active glow + press depth

---

## Perf guardrails

1. No animated grain — static only
2. No layout animations (width/height/margin) — CLS safe
3. Inner pages defer cinematic/micro/motion until idle
4. `prefers-reduced-motion: reduce` collapses all motion to 1ms / static rings
5. Preloader: do not add competing CSS motion on WebGL path

---

## Wired pages

| Page | Classes | CSS load |
|------|---------|----------|
| `index.html` | `ap-cinematic-2026` | Blocking motion + cinematic + micro |
| `chart.html` | `ap-cinematic-2026` | Critical: lite + forms + chart-critical; defer rest |
| `horoscope.html` | `ap-cinematic-2026` | Critical: horoscope-critical; defer cinematic |
| `shop.html` | `ap-cinematic-2026` | Critical: shop-critical; defer cinematic |
| `ephemeris.html` | `ap-cinematic-2026` | Critical: instrument-panel + ephemeris-page; defer cinematic |
| `compatibility.html` | — | micro only |

**SW cache:** ap-v317 precaches palette, motion, cinematic, micro.

---

*Hard-refresh after deploy. Visual-check: `npm run audit` in `tools/visual-check`.*