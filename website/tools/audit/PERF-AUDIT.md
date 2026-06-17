# AstroPrecise Performance Audit

**Last updated:** 2026-06-17  
**Preview server:** `node tools/serve-preview.mjs` → `http://127.0.0.1:8790` (brotli + gzip + lite shell rewrite)  
**SW cache version:** `ap-v399`

## Composite targets

| Metric | Global target | Notes |
|--------|---------------|-------|
| Lighthouse Performance | Tier-dependent (below) | Mobile, simulated 4G, Moto G Power class |
| Lighthouse Accessibility | **100** | axe-core parity on phone-audit |
| Lighthouse Best Practices | **≥ 95** | HTTPS, console errors, deprecated APIs |
| Lighthouse SEO | **≥ 95** | Canonical, meta, crawlability |
| CLS | **≤ 0.05** on chart; **≤ 0.10** on content-heavy tools | Shop/lifepath may need layout reserves |
| TBT | **≤ 200 ms** tier A–B; **≤ 350 ms** tier C–D | Ephemeris/orrery pages higher ceiling |

Run Lighthouse against the gzip preview — production Cloudflare gzip should match or beat local scores.

---

## Page tiers & LH performance targets

### Tier A — Lite home shell (`/` / `index.html`)

| Target | Value |
|--------|-------|
| Perf | **100** |
| LCP | **< 1.2 s** |
| FCP | **< 0.9 s** |
| TBT | **< 50 ms** |

**Strategy:** 7 KB HTML shell, `lite-critical.css` only blocking, orrery via `lite-orrery.js` + early `ephemeris.js` (`modulepreload`), WebGL gated on interaction, below-fold via `lite-shell-boot.js`.

**Recent baseline:** 100/100/100/100 mobile (local :8790).

---

### Tier B — Core product pages (chart, horoscope, compatibility)

| Page | Perf target | LCP target | Priority fixes |
|------|-------------|------------|----------------|
| `chart.html` | **≥ 90** (stretch **95**) | **< 2.5 s** | Idle `chart.css`, solid h1 color for LCP |
| `horoscope.html` | **≥ 85** (stretch **90**) | **< 3.0 s** | Interaction-gated ephemeris/engine |
| `compatibility.html` | **≥ 85** (stretch **90**) | **< 3.0 s** | `main-lite` + `compatibility-critical`; blocking `ap-page-bridge.css` for first-nav VT |

**Recent baseline (mobile):** chart ~81–83, horoscope ~76–80, compat ~79–82.

**Nav prefetch:** `ap-nav-prefetch.js` warms `chart.html`, `horoscope.html`, `shop.html` on hover/touch (skipped when Save-Data).

---

### Tier C — Instrument & long-form tools

| Page | Perf target | LCP target | Notes |
|------|-------------|------------|-------|
| `ephemeris.html` | **≥ 80** | **< 3.5 s** | `ephemeris-page.css` external; starcatalog + orrery chain |
| `transits.html` | **≥ 80** | **< 3.5 s** | Shared ephemeris boot |
| `lifepath.html` | **≥ 80** | **< 3.5 s** | Extract inline CSS → `lifepath-page.css` |
| `index-full.html` | **≥ 75** | **< 4.0 s** | Cinematic first visit; not default route |

**Recent baseline:** ephemeris ~74–77, transits ~76, lifepath ~76 (CLS ~0.18).

---

### Tier D — Commerce & heavy media

| Page | Perf target | LCP target | Notes |
|------|-------------|------------|-------|
| `shop.html` | **≥ 85** (from ~66) | **< 3.0 s** | `main-lite` + `shop-critical.css`; IO-gate `shop-art-themes.js` |
| Sign pages (`aries.html` …) | **≥ 85** | **< 2.5 s** | `app.js` + deferred main.css pattern |

**Shop outlier:** LCP ~7.6 s, TBT ~300 ms — blocking CSS + art-theme boot.

---

### Tier E — Static / legal / profile

| Pages | Perf target |
|-------|-------------|
| `why.html`, `accuracy.html`, `privacy.html`, `terms.html`, `links.html` | **≥ 90** |
| `profile.html` | **≥ 80** (large inline surface) |

---

## Blocking resources by tier

Resources that block first paint or sit on the critical path before `DOMContentLoaded` completes.

### Tier A — `index.html` (lite shell)

| Resource | Type | Blocking? | Mitigation |
|----------|------|-----------|------------|
| `js/ap-lite-detect.js` | script (sync, head) | Yes | Tiny; required for shell routing |
| `css/lite-critical.css` | stylesheet | Yes | Preloaded; sole blocking CSS |
| `css/celestial-seals.css` | stylesheet | Yes | Small seal sprites |
| `css/ap-forms.css` | stylesheet | Yes | Hero form only |
| `js/ephemeris.js` | script | No (modulepreload + onload chain) | **modulepreload** in `<head>` |
| `js/lite-orrery.js` | script | No | After load / ephemeris ready |
| `js/orrery-loader.js` | script | No | Scroll/pointer/timeout gated |
| `js/lite-shell-boot.js` | script (defer) | No | Below-fold injection on interaction |
| `js/ap-nav-prefetch.js` | script (defer) | No | Idle-capable prefetch hints |

**Not blocking (deferred interaction):** `main.css`, `index-home.css`, `fonts.css`, `app.js`, full orrery WebGL stack.

---

### Tier B — `chart.html`

| Resource | Blocking? |
|----------|-----------|
| `css/main-lite.css` | **Yes** |
| `css/ap-page-bridge.css` | **Yes** (view transitions on first same-origin nav) |
| `css/ap-forms.css` | **Yes** |
| `css/chart-critical.css` | **Yes** |
| `css/fonts.css` | No (print media trick) |
| `css/main.css` | No — `deferMainCss()` on DOMContentLoaded |
| `css/chart.css` | No — idle deferred |
| `css/chart-page-deferred.css` | No — idle deferred |
| `js/defer-page-css.js` | defer |
| `js/ephemeris.js` … `js/chart-page.js` | defer |
| `js/app.js` | defer (+ `ap-nav-prefetch.js` injected at tail) |

---

### Tier B — `horoscope.html`

| Resource | Blocking? |
|----------|-----------|
| `css/main-lite.css` | **Yes** |
| `css/ap-page-bridge.css` | **Yes** (view transitions on first same-origin nav) |
| `css/ap-forms.css` | **Yes** |
| `css/horoscope-critical.css` | **Yes** |
| `css/main.css` | No — deferred |
| `css/horoscope-page-deferred.css` | No — idle |
| `js/horoscope-page.js`, `js/app.js` | defer |

Ephemeris/engine scripts are interaction- or idle-gated inside page boot (not render-blocking).

---

### Tier B — `compatibility.html`

| Resource | Blocking? |
|----------|-----------|
| `css/main-lite.css` | **Yes** |
| `css/ap-page-bridge.css` | **Yes** (view transitions on first same-origin nav) |
| `css/ap-forms.css` | **Yes** |
| `css/compatibility-critical.css` | **Yes** |
| `css/main.css` | No — `deferMainCss()` on DOMContentLoaded |
| `css/compatibility-page-deferred.css` | No — idle |

---

### Tier C — `ephemeris.html`

| Resource | Blocking? |
|----------|-----------|
| `css/main-lite.css` or `main.css` | **Yes** (per page variant) |
| `css/ephemeris-page.css` | **Yes** |
| `js/starcatalog.js` | sync/defer per markup |
| `js/ephemeris.js` | defer |
| Orrery / lightcone chain | post-DOM, heavy TBT |

---

### Tier D — `shop.html`

| Resource | Blocking? |
|----------|-----------|
| `css/main-lite.css` | **Yes** |
| `css/shop-critical.css` | **Yes** |
| `css/shop.css` | No — deferred |
| `js/shop-page-boot.js` | defer |
| `js/shop-art-themes.js` | Should be IO-gated (TBT hotspot) |

---

## Service worker precache (perf-relevant additions)

`sw.js` `ap-v301` includes nav/orrery modules:

- `js/ap-nav-prefetch.js`
- `js/lite-sky-dock.js`
- `js/starcatalog.js`
- `js/ephemeris.js`, `js/lite-orrery.js`, `js/orrery-loader.js`
- `js/lite-shell-boot.js`, `js/ap-lite-detect.js`

After deploy: hard-refresh or unregister stale SW if precache misses in DevTools → Application.

---

## Wave 19 closure (2026-06-17)

| Track | Outcome |
|-------|---------|
| Horoscope CLS | **0** — sphere/orrery layout reserves + `main-lite` shell; optional polish item closed |
| Tier C audit | `transits.html`, `lifepath.html` — Lighthouse perf ≥80, axe **0** violations; transits ticker reserve for CLS |
| Visual baseline | `tools/visual-check/baseline/` refreshed after horoscope + tier C sweep |
| Platform follow-up | Horoscope blocking `ap-page-bridge.css` — ✅ **Wave 20** (chart/compat **ap-v399**) |

---

## Implemented in this audit pass

1. **`js/ap-nav-prefetch.js`** — prefetch chart/horoscope/shop on `mouseover` + `touchstart`; Save-Data aware; same-origin only.
2. **`app.js` tail loader** — injects prefetch on all `app.js` pages.
3. **`index.html`** — direct `ap-nav-prefetch.js` (lite shell loads `app.js` late); **`modulepreload`** for `ephemeris.js`.
4. **`lite-shell-boot.js`** — `affiliate-social.js` in `DEFER_SCRIPTS` (avoids duplicate load from `app.js` on full boot path).
5. **`sw.js`** — precache bump + new modules.

---

## Verification commands

```bash
# Local LH-grade preview
node tools/serve-preview.mjs 8790

# Mobile device sweep (real WebGL)
# Open http://<LAN-IP>:8790/phone-audit.html
```

**Pages to spot-check after changes:** `/`, `/chart.html`, `/horoscope.html`, `/shop.html`, `/ephemeris.html`.

---

## Next high-impact backlog

| Item | Impact | Effort |
|------|--------|--------|
| ~~Shop LCP — hero image WebP + smaller above-fold product row~~ | High | ✅ ap-v350 (−91% deep-reading WebP) |
| ~~Shop boot — defer profile.js~~ | Medium | ✅ ap-v347 |
| ~~Production Lighthouse CI in GitHub Actions~~ | High | ✅ ap-v347 |
| ~~Lifepath inline CSS extraction~~ | Medium | ✅ ap-v278 (`lifepath-page.css`) |
| ~~Chart LCP — font preload subset for hero h1~~ | Medium | ✅ ap-v354 (`cinzel-hero-700.woff2` 3.8KB + preload) |
| ~~Horoscope TBT — defer subscribe until scroll/focus~~ | Medium | ✅ ap-v350 (IO-gated subscribe) |
| ~~Index lite shell — defer Hollywood CSS stack~~ | High | ✅ ap-v354 (lite-critical + ap-forms only blocking) |
| ~~Lifepath fonts defer~~ | Medium | ✅ ap-v354 (chart-parity idle fonts) |
| ~~Local preview Brotli~~ | Medium | ✅ ap-v354 (`serve-preview.mjs` br/gzip) |
| ~~Production cache headers (Cloudflare script)~~ | Medium | ✅ ap-v358 (`tools/setup-cloudflare-cache.mjs` — requires orange cloud) |
| ~~main-lite mobile nav overlap (profile target)~~ | Medium | ✅ ap-v358 (build range + 44px profile) |
| ~~Horoscope a11y (sign cards + weekly region)~~ | Medium | ✅ ap-v358 |
| ~~chart-render.js duplicate PLANET_SLUG (console error)~~ | High | ✅ ap-v360 |
| ~~Compatibility CLS + seals defer~~ | Medium | ✅ ap-v360 (CLS 0.091, bp 100) |
| ~~Horoscope oracle/ephemeris race (console error)~~ | High | ✅ ap-v365 (bp 100) |
| ~~main-lite footer-legal CSS truncation (social 4px)~~ | High | ✅ ap-v365 (a11y 100 horoscope/shop/ephemeris) |
| ~~Chart sample-btn label mismatch + CTA overlap~~ | Medium | ✅ ap-v367 (remove aria-label; form-cta z-index) |
| ~~Sign pages thumb grid aria-allowed-role~~ | Medium | ✅ ap-v367 (`ul`/`li` grid; remove listitem on `<a>`) |
| ~~Sign hero WebP aspect ratio (bp 96)~~ | Medium | ✅ ap-v367 (`aspect-ratio: 2/3` on card img) |
| ~~Privacy banner close label mismatch~~ | Low | ✅ ap-v367 (visible "Understood" only) |
| ~~Compatibility CLS ≤ 0.05~~ | Medium | ✅ ap-v370 (**0.099→0.033** — critical form spacing + 2420px reserve; main-lite rebuild) |
| ~~main-lite build corruption (manifesto bleed, missing .orb/.eng-i)~~ | High | ✅ ap-v370 (ranges 6659/5306/7328 + validation) |
| Horoscope sphere-poster aria-label without role | Low | ✅ ap-v374 (`role=img` on poster; panel aria attrs when open) |
| Shop curated tabpanels `aria-labelledby` + `hidden` | Low | ✅ ap-v376 (`shop-curated.js` + static `hidden` on inactive panels) |
| Shop art-library tabpanel `aria-labelledby` | Low | ✅ ap-v376 (`shop-art-themes.js`) |
| ~~Chart privacy-badge CLS (0.022)~~ | Low | ✅ ap-v379 (badge removed; subtext reserve `min-height:85px`; CLS **0.02**) |
| ~~Horoscope sphere-ctas CLS (0.027)~~ | Low | ✅ ap-v379 (legend + CTA reserves; CLS **0.019**) |
| ~~Visual regression baseline refresh (F7)~~ | Low | ✅ ap-v379 (25 preloader + 13 page PNGs in `visual-check/baseline/`) |
| axe shop page in CI sweep | Low | ✅ ap-v379 (`audit-a11y.mjs` includes `/shop.html`) |
| ~~capture-pages false failures (lite/sign starfield)~~ | Low | ✅ ap-v382 (`requireStarfield` flag; hero-entered lite DOM check) |
| ~~Compat CLS nested reserve inflation~~ | Low | ✅ ap-v389 (hero **eng-i** + sprite in critical path; form **1680px** reserve; CLS **0**) |
| ~~Chart `form-glass__sub` height lock~~ | Low | ✅ ap-v389 (eng-i critical + **100px** subtext; CLS **0**) |
| ~~Horoscope eng-i deferred inject CLS~~ | Low | ✅ ap-v392 (critical eng-i + sprite; CLS **0.019→0.013**) |
| Sign constellation CLS (audit-deferred sign-page.css) | Low | ✅ ap-v392 (inline `aspect-ratio:320/200` reserve; aries/leo **0.021→0.014**) |
| ~~Lite shell nav Sky tab + `AP_NAV` vocabulary~~ | Medium | ✅ ap-v395 (`index.html` primary rail + noscript nav) |
| ~~Legal/minimal footer social (`footer-chrome.js`)~~ | Low | ✅ ap-v395 (`privacy.html`, `terms.html`, `404.html`) |
| ~~View transitions on `main-lite` tier~~ | Medium | ✅ ap-v395 (`build-main-lite.mjs` injects `@view-transition`; `ap-page-bridge.css` on core tools) |
| ~~Shop JSON-LD / checkout currency GBP~~ | Low | ✅ ap-v395 (`shop.html` `AggregateOffer` `priceCurrency: GBP`; `shop-commerce.js`) |
| ~~Sign pages constellation CLS polish~~ | Low | ✅ ap-v399 (aries **0.014→0.002**) |
| ~~Chart/compat early `ap-page-bridge.css` (first-nav VT)~~ | Low | ✅ ap-v399 (blocking link after `main-lite`, before `deferMainCss` idle) |
| ~~Horoscope CLS **0.013** → **0** (optional)~~ | Low | ✅ Wave 19 (sphere/orrery reserves + `main-lite` rebuild; CLS **0**; gate **≤ 0.05**) |
| ~~Horoscope blocking `ap-page-bridge.css` (first-nav VT)~~ | Low | ✅ Wave 20 (parity with chart/compat; idle defer removed) |
| ~~Tier C LH + axe — `transits.html`, `lifepath.html`~~ | Medium | ✅ Wave 19 (perf ≥80, a11y 100, CLS reserves on transits ticker) |
| ~~Visual regression baseline refresh (Wave 19 sweep)~~ | Low | ✅ Wave 19 (`visual-check/baseline/` updated post–horoscope CLS + tier C) |
| ~~Production LH CI — expand to 10-page batch (+transits, +lifepath)~~ | Medium | ✅ Wave 21 (`lighthouse-production.mjs` 10 URLs; `audit-a11y.mjs` +2 pages; perf ≥85 gate unchanged; **all 10 LH pass**) |
| ~~Transits axe — `aria-prohibited-attr` (ticker `role=marquee`) + color-contrast (39 nodes)~~ | Medium | ✅ Wave 24 (sr-only ticker status, palette contrast, moonphase/retrograde parity) |

### Ephemeris Lighthouse a11y flake

Instrument-panel microcopy uses palette tokens from `css/ap-palette-2026.css` (`--ap-text-muted` **#9A9084**, documented **≥4.5:1** on void-deep). **`npm run a11y`** (axe-core) reports **0 violations** on `ephemeris.html`. Lighthouse mobile a11y has historically scored **96** on the same tree while axe stays clean — treat as **LH audit flake** (retry single-URL run); do not chase as a contrast regression unless axe fails.