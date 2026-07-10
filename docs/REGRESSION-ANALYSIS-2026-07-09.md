# Astro Precise — full regression & structure analysis (2026-07-09)

## Version map (source of truth)

| Layer | Version / commit | Notes |
|--------|------------------|--------|
| **Git HEAD / origin/main** | `7195f38` **ap-v657** | Shipped for external audit; product spine Cast→Sky→Keep→Daily→Reading→Shop |
| **Live production** | **ap-v657** | `https://astroprecise.app/sw.js` |
| **Local SW after world-class mess** | briefly ap-v658…**ap-v664** | Contaminated precache + dual Three |
| **Local SW after restore (now)** | **ap-v657** (restored from HEAD) | Matches production commit |
| **Untracked experiments** | `mysky.html`, `orrery-cinematic.js`, `ap-shell.js`, GSAP, etc. | **Not** in git HEAD; safe only if never linked from production pages |

---

## What “regressed” means in this tree

### A. Intentional production baseline (keep)

Committed **ap-v657** (`7195f38`) is the last known good multi-page product:

- Homepage: import-map Three → `orrery-webgl.js` via `orrery-loader` / award orrery (no UMD `three.min.js`)
- Chart: `chart-page.js` + `app.js` + `ap-nav-model.js` (exports already inside chart-page)
- Horoscope / shop / ephemeris / moment: own page CSS + shared masthead/footer from `app.js`
- Nav: Chart · Sky · Daily · Readings · Library · Shop; Moment under More with Keep badge
- Mobile bottom: Chart · Sky · Daily · Shop (**4 tabs**)

### B. World-class experiment layer (caused score-0)

Additive pack injected into **many** HTML heads:

```text
css/ap-design-system.css
js/vendor/three.min.js          ← UMD Three r160
js/orrery-cinematic.js
js/ap-shell.js                  ← sticky Journey + FAB + bottom tabs
js/ap-router.js / ap-export / ap-motion / gsap
```

#### Line-level failure mode (homepage)

1. `index.html` already has **importmap** → `./js/vendor/three/three.module.min.js`
2. Production engine: `import * as THREE from 'three'` in `orrery-webgl.js` (ESM)
3. Injection added **global** `three.min.js` + `initOrrery` UMD
4. Runtime: **“Multiple instances of Three.js”** + deprecation of build/three.min.js
5. Result: hero WebGL path degraded, extra sticky Journey bar, Continue FAB, bottom padding, dual chrome → **looks and behaves broken**

#### Structure / overlap failures (shell)

| Chrome | Source | Conflict |
|--------|--------|----------|
| Sticky Cosmic Journey | `ap-shell.js` injects `#ap-journey` as first body child | Stacks above masthead; duplicates IA |
| Continue FAB | `ap-shell.js` fixed bottom-right | Overlaps primary CTAs (chart calculate, etc.) |
| Bottom tabs | `ap-shell` + `app.js` NAV_BOTTOM | Double mobile chrome when both active |
| My Sky top nav | `mysky.html` brand row | Fine alone; + journey = double |
| Cinematic orrery mounts | Injected before `</main>` on index/chart/explore/… | Extra blank/black panels under real content |
| Chart export host | `#ap-export-suite-host` without scripts after strip | Orphan DOM (restored away) |

#### Orrery black panel (mysky-only bug, root cause found)

In `orrery-cinematic.js` (experimental):

```js
var frame = document.createElement('div'); // DOM chrome
// ...
function frame(now) { ... }               // intended rAF callback
raf = requestAnimationFrame(frame);       // frame is the DIV, not the function
```

Same scope: `var frame` assignment overwrites the hoisted function →  
`requestAnimationFrame` throws / never paints → black plate.

Fixed in later v3 by renaming to `chromeFrame` + `tick`, but page was still isolated after production strip.

---

## Code architecture (correct production spine)

### Homepage critical path (must stay pure)

```
importmap three → three.module.min.js
ap-home-bootstrap / orrery-loader → dynamic import orrery-webgl.js
app.js / home-daily / award orrery
NEVER three.min.js on this page
```

### Shared chrome (single source)

```
ap-nav-model.js  → NAV_PRIMARY / MORE / BOTTOM
app.js           → renderNav() always rebuilds masthead primary
                 → mobile bottom tabs from NAV_BOTTOM_TABS
footer inject    → tools column
```

**Rule:** one sticky/fixed nav family per viewport. Do not add a second journey bar site-wide.

### Chart export (already exists — do not duplicate)

`chart-page.js` already owns:

- PNG / wallpaper / JSON export
- Engine plate honesty

A second `ap-export-suite` toolbar on chart without integration is structural noise.

---

## Diff residual (before restore) vs HEAD

| File | Drift | Regression risk |
|------|--------|-----------------|
| `chart.html` | Orphan `#ap-export-suite-host` before `</main>` | Low (dead DOM) but sloppy |
| `ephemeris/explore/moment` | Whitespace / `data-journey` / `</main>` format | Cosmetic + dead attrs |
| `shop.html` | Blank line in head | None |
| `ap-nav-model.js` | My Sky in MORE + **5-tab** bottom (Chart Sky **MySky** Daily Shop) | **Real product change** — 5 icons squeeze mobile; icons reused `star4` |
| `sw.js` | V → ap-v664 + precache of experimental assets | SW thrash; clients on mixed shells |
| `index.html` | No residual vs HEAD after strip | Clean |

**Restore action taken:** all modified **tracked** website files reset to **HEAD ap-v657**.  
**Untracked** experiment files left on disk but **not linked** from production HTML (except optional manual open of `mysky.html`).

---

## Overlap / structure checklist (post-restore)

| Check | Expected (v657) | Status after restore |
|-------|-----------------|----------------------|
| Home dual Three | No | Restored clean |
| Site-wide Journey bar | No | Only if someone opens mysky with shell |
| Chart orphan export host | No | Removed via checkout |
| Nav 4 mobile tabs | Chart Sky Daily Shop | Restored |
| My Sky in primary nav | No (More only if we add it later) | Not in v657 nav |
| SW version | ap-v657 | Restored |
| Live production | ap-v657 | Matches HEAD |

---

## Why you still “see” regression in browser

Even with disk = v657:

1. **Service Worker** may still hold **ap-v658–664** shells until unregistered.
2. **Memory/tabs** left open since dual-Three session.
3. Opening **mysky.html** still loads experimental stack (by design isolation) — that is **not** the production homepage.

### Mandatory client reset

```
DevTools → Application → Service Workers → Unregister
Then hard reload http://localhost:8790/
Confirm sw.js first line: const V = "ap-v657"
```

---

## Recommendations (ordered, no more shotgun)

### P0 — Stop the bleeding (done)

1. Production pages = **git HEAD only** (ap-v657).  
2. Never inject UMD Three onto pages that use import-map ESM Three.  
3. Client SW unregister.

### P1 — If My Sky ships later (isolated module)

1. Keep `mysky.html` **opt-in URL** until it uses **same** Three as site (ESM + shared import map) or pure canvas2D.  
2. Do **not** inject `ap-shell` site-wide; if journey UI is wanted, add a **single row inside masthead** via `ap-nav-model` / `renderNav`, not a second sticky.  
3. Nav: either  
   - More → My Sky (badge Hub), keep 4 bottom tabs, **or**  
   - Replace one bottom tab carefully (never 5 cramped icons without design pass).  
4. Cinematic orrery: no second global `THREE`; prefer reuse of `Orrery3D` rest frames / engine stills as poster.

### P2 — Graphics quality without structural risk

1. Improve **home** only via `orrery-webgl.js` (protected path, already flagship).  
2. Export plate polish only inside **chart-page.js** existing exporters.  
3. Marketing targets in `img/design-targets/` inform art direction, not inject new runtimes.

---

## Line-of-code “laws” going forward

1. **One Three instance per page.** Import map **or** UMD, never both.  
2. **One primary nav renderer** (`app.js` `renderNav` + `ap-nav-model`).  
3. **No sticky second bars** without removing something of equal height.  
4. **SW bump only with precache regen** (`generate-sw-precache.mjs`), not hand-append experiments.  
5. **Experiments live in unlinked files** until a single integration PR.

---

## Current honest state (after restore)

| Surface | Code state |
|---------|------------|
| Local tracked website | **= ap-v657 commit** |
| Live | **ap-v657** |
| Experimental My Sky stack | On disk, untracked, open only at `/mysky.html` |
| Regression from dual-Three injection | **Removed from production pages** |

If anything still looks wrong after SW unregister + hard reload of `/`, it is either (a) cached outside SW, or (b) a pre-existing v657 issue — not residual world-class injection on those pages.
