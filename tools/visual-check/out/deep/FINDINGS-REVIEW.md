# AstroPrecise Deep Audit — Full Findings Review
**Date:** 2026-06-16 (original) · **Updated:** 2026-06-17 (Wave 21) · **Build:** ap-v405 · **Target:** A+ (≥95) all aspects

## Executive summary (2026-06-17 Wave 20–21 — `lighthouse:production:ci` + visual QA)

| Aspect | Current | A+ Target | Gap | Status |
|--------|--------:|----------:|-----|--------|
| Lighthouse A11y (8-page CI batch) | **100** | 100 | 0 | ✅ |
| Lighthouse Best Practices | **100** | 100 | 0 | ✅ |
| Lighthouse SEO | **100** | 100 | 0 | ✅ |
| Lighthouse Performance (8-page batch) | **94–100** | 90+ | 0 | ✅ |
| Index (lite shell) | **perf 100**, LCP **1.5s**, CLS **0** | perf ≥90, LCP &lt;2.5s | 0 | ✅ Wave 20 |
| Horoscope CLS | **0** | ≤0.05 | 0 | ✅ Wave 19–20 |
| Transits CLS (tier C, outside CI batch) | **0.043** | ≤0.05 | 0 | ✅ Wave 20 (was 0.108) |
| axe WCAG (6-page sweep) | **0 violations** | 0 | 0 | ✅ |
| Visual regression captures | **11/11 ok** | — | — | ✅ Wave 21 |
| Visual baseline diff | **10/11 pass** (lifepath **4.74%**) | &lt;2% per page | lifepath | ⚠️ baseline **not** refreshed — Wave 19 tier-C defer drift |
| 10-page CI expansion | **TBD** — CI still **8 pages** | — | — | ⏳ transits/lifepath not in `lighthouse:production:ci` yet |

**Production CI batch (2026-06-17T10:32Z):** chart 96, horoscope 94 (CLS 0), aries/leo 97, compat 96, ephemeris 96, shop 95, **index 100 / LCP 1.5s** — all ≥85.

> Sections F1–F7 below are the **original 2026-06-16 forensic audit**. Many items are now resolved; see `website/tools/audit/PERF-AUDIT.md` backlog for closure status.

## Original executive summary (2026-06-16 — historical)
| Aspect | Current | A+ Target | Gap | Owner agent |
|--------|--------:|----------:|-----|-------------|
| Overall | 84 | 95+ | 11 | Orchestrator |
| Performance | 60 | 90+ | 30 | **Perf-Home** |
| Lighthouse A11y | 98 | 100 | 2 | **A11y-Shop** |
| axe WCAG | 84 | 98+ | 14 | **A11y-Shop** + **A11y-Compat** |
| Best practices | 100 | 100 | 0 | — |
| SEO | 95 | 100 | 5 | **SEO-CLS** |
| Engine tests | 100 | 100 | 0 | — |
| E2E commerce | 100 | 100 | 0 | — |
| Visual regression | 33 | 90+ | 57 | **Visual** (post-fix baseline) |

---

## F1 — Home performance (50/100) — CRITICAL

### Evidence
- LCP **7.1s**, Speed Index **14.1s**, TBT 365ms, load 11.6s
- `orrery-loader.js` in `<head>` calls `import(orrery-webgl.js)` immediately on first visit
- Preloader requires WebGL; blocks "hero ready" perception
- Three.js importmap + raf-core + ephemeris + starcatalog in critical path

### Root cause (site architecture)
The signature orrery is the brand moment but loads ~2MB JS (Three + postprocessing) before Lighthouse considers the page "visually complete." Headless mobile throttling amplifies this.

### Research-backed fixes (web.dev / three.js discourse)
1. **LCP element = static hero** — ensure H1/hero copy paints first; orrery canvas `content-visibility` or placeholder gradient
2. **Defer Three until after first paint** — `requestIdleCallback` + `IntersectionObserver` on `#orrery-canvas` (horoscope pattern at line 1954)
3. **Preloader lite path** — CSS-only earth for audit/low-tier; WebGL after `ap_intro_complete`
4. **Code-split** — bloom/postprocessing already deferred in orrery-webgl; extend to texture loads
5. **fetchpriority="high"** on hero text; `fetchpriority="low"` on orrery module

### Success criteria
- Home Lighthouse perf ≥ **85**
- LCP < **2.5s** (lab), Speed Index < **4s**

---

## F2 — Shop accessibility (axe 39, LH 89) — CRITICAL

### Evidence
| Rule | Impact | Nodes | Source |
|------|--------|------:|--------|
| aria-allowed-attr | critical | 8 | `shop-art-themes.js`, `shop-curated.js` |
| aria-required-children | critical | 2 | `ap-art-grid role="list"` with `role="button"` children |
| aria-allowed-role | minor | 38 | `role="button"` on divs/articles; `role="listitem"` on spans |
| heading-order | moderate | 1 | dynamic catalogue headings |

### Root cause
- `shop-art-themes.js:57` — `role="list"` requires `listitem` children; cards use `role="button"`
- `shop-art-themes.js:18` — pack filters use `aria-selected` without `role="tab"`
- `shop-commerce.js:478` — `role="list"` / `listitem` on `<span>` (invalid semantics)
- `role="button"` on `<div class="shopc-card__art">` — prefer `<button>` or link

### Fixes
1. `ap-art-grid` → `role="group"` + `aria-label="Art styles"`
2. Art cards → `<button type="button">` or remove role/list pattern
3. Pack tabs → `role="tablist"` + `role="tab"` + `aria-selected`
4. Trust row → `<ul><li>` markup
5. Quick-view divs → `<button>` elements
6. Fix heading order in shop grid section titles (h2→h3 sequence)

### Success criteria
- Shop axe ≥ **98**, Lighthouse a11y **100**

---

## F3 — Compatibility matrix (axe 82) — HIGH

### Evidence
- `empty-table-header` × 24 — `<th>` with `<abbr aria-hidden="true">` only; axe sees empty header text
- `scrollable-region-focusable` × 1 — overflow scroll container without keyboard access

### Fixes
1. Remove `aria-hidden` from abbr OR add visually-hidden sign name text in each `<th>`
2. `role="grid"` → plain `<table>` (simpler) or add `tabindex="0"` to scroll wrapper + focus ring
3. ap-v220 added `aria-label` on headers — verify abbr isn't hiding all discernible text

### Success criteria
- Compat axe **100**

---

## F4 — Horoscope (axe 85, perf 61) — HIGH

### Evidence
- `aria-hidden-focus` × 1 — collapsed reading panel hides focusable children
- Speed Index 6.8s — zodiac sphere loads (IO deferred but still heavy)

### Fixes
1. Collapsed panel: `inert` attribute or `tabindex="-1"` on children when `aria-hidden="true"`
2. Verify ap-v218 fixes (h3 reading title, empty h3) are present
3. Sphere: increase IO `rootMargin` defer; static poster until visible

### Success criteria
- Horoscope axe **100**, perf ≥ **75**

---

## F5 — Inner pages perf (58–70) — MEDIUM

| Page | Perf | Main drag |
|------|-----:|-----------|
| Chart | 70 | CLS 0.06 — wheel mount shift |
| Ephemeris | 59 | Instrument JS + SI 6.5s |
| Compatibility | 58 | TBT 267ms matrix DOM |
| Shop | 60 | Art library render TBT 221ms |

### Fixes
- Chart: reserve `#chart-wheel` min-height; skeleton before SVG inject
- Ephemeris: defer instrument init behind IO
- Compat: virtualize or lazy-render matrix cells off-screen
- Shop: defer `shop-art-themes.js` render until `#art-library` visible

---

## F6 — SEO (92 on inner pages) — LOW

Common Lighthouse SEO gaps at 92:
- Missing meta description uniqueness (verify)
- Link text / crawlable anchors
- Structured data gaps on tool pages

### Fixes
- Audit `chart.html`, `compatibility.html`, `ephemeris.html`, `shop.html` JSON-LD
- Ensure canonical + og:image on all
- Font size / tap target audits

### Success criteria
- All pages SEO **100**

---

## F7 — Visual regression (33/100) — POST-FIX

- Preloader earth-hold **40%** drift — intentional ap-v212 visual change
- After A+ code fixes: `npm run all && npm run baseline:save`
- Not blocking launch; blocking "A+ visual" score

---

## Agent dispatch matrix

| Agent | Scope | Files | Exit gate |
|-------|-------|-------|-----------|
| **Perf-Home** | F1 | index.html, orrery-loader.js, orrery-webgl.js, sw.js | home perf ≥85 |
| **A11y-Shop** | F2 | shop.html, shop-commerce.js, shop-art-themes.js, shop-curated.js | shop axe ≥98 |
| **A11y-Compat** | F3,F4 | compatibility.html, horoscope.html | axe 100 both |
| **SEO-Perf** | F5,F6 | chart.html, ephemeris.html, shop defer | SEO 100, CLS <0.05 |

**After all agents:** bump `sw.js`, run `node audit-deep.mjs`, `node test-engine.mjs`, handoff AGENT-HANDOFF.md