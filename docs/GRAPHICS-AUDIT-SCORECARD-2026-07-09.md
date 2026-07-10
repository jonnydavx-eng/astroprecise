# Astro Precise — Multi-team graphics audit scorecard

**Date:** 2026-07-09  
**Scope:** Local `ap-v660` (+ My Sky orrery boot fix) at http://localhost:8790  
**Method:** Playwright captures · axe a11y · human expert review of screenshots · brand plate references · Grok Imagine elevation targets  
**Brand north stars (existing assets):**

| Asset | Role |
|--------|------|
| `img/marketing-masterpiece-plate.jpg` | Engraved brass + parchment + Earth porthole keepsake |
| `img/marketing-system-cinema.jpg` | Cinematic multi-body still, brass rings, photoreal planets |
| `img/og-banner-v576.jpg` | Split hero: typography + brass armillary Earth |
| `img/marketing-devices.jpg` | Product-in-hand / lifestyle (devices) |

**Imagine targets (generated this session):**

| File | Purpose |
|------|---------|
| `website/img/design-targets/target-masterpiece-plate.jpg` | Elevates masterpiece plate finish |
| `website/img/design-targets/target-system-cinema.jpg` | Elevates system still for orrery bar |
| `website/img/design-targets/target-mysky-dashboard.jpg` | My Sky layout with filled 3D panel |
| Captures: `tools/visual-check/out/graphics-audit/*.png` | Live UI truth |

---

## Executive score (weighted)

| Pillar | Weight | Score | Notes |
|--------|--------|------:|-------|
| **Brand / art direction** | 20% | **88** | Void+brass coherent; home Earth is flagship-grade |
| **3D / orrery graphics** | 20% | **62** | Hero WebGL excellent; cinematic UMD plate **black/empty** on My Sky (P0) |
| **UI craft & chrome** | 15% | **80** | Journey/export/cards good; double nav / FAB clutter |
| **Page hierarchy / IA** | 10% | **84** | Spine clear; My Sky hub correct structure |
| **Motion / micro** | 8% | **78** | GSAP present; reduced-motion respected |
| **A11y** | 12% | **90** | axe mostly clean; shop/transits `region` moderate |
| **Conversion / shop** | 8% | **72** | Honesty strong; product stills lag masterpiece plate |
| **Perf / reliability** | 7% | **75** | Extra Three/GSAP weight; orrery race fixed |
| **Overall** | 100% | **~79** | **Strong brand, critical 3D hub gap** |

**Verdict:** Premium brand language is real (home + marketing plates). The **My Sky hub fails its main promise** if the live solar system panel stays black. Close that gap and scores jump into the mid-80s.

---

## Expert team readouts

### 1) Art director (brand plates vs live UI)

**Score: 88/100**

**Wins**
- Home hero Earth matches OG/marketing cinema language (limb, city lights, void).
- Transit Explorer brass wheel is on-brand; calm, museum-dark.
- Chart cast form is restrained and trustworthy.

**Gaps vs plates**
- Masterpiece plate = **brass + parchment + porthole Earth**. Chart export PNG still feels “engine plate,” not gallery object.
- System cinema = **layered brass rings around Earth** + multi-body depth. Cinematic orrery is schematic spheres vs photoreal stills.
- Live UI uses too many **competing brass CTAs** (Continue FAB + gold primary + journey pills).

**Improvements (ordered)**
1. Align export PNG plate layout to `target-masterpiece-plate.jpg` (porthole + engraved rings).
2. Pull engine stills (`img/engine/*.webp`) into My Sky empty-state poster until WebGL boots.
3. One primary CTA colour system: coral for cast, brass outline for secondary (home already does this).

---

### 2) 3D / graphics engineer

**Score: 62/100**

**Wins**
- Production `orrery-webgl` on home is still best-in-class on this site.
- Cinematic v2 code path has the right *features* (procedural maps, corona, zodiac ring, damping).

**P0 — My Sky black panel (confirmed in `mysky.png`)**
- Capture shows engraved frame + caption but **no planets/canvas content**.
- Cause class: race / WebGL init before measurable size / silent fail.
- **Mitigation shipped this session:** wait for `window.THREE` + `initOrrery`, force min-height, rAF init, user-visible error fallback.

**Next 3D upgrades (guided by `target-system-cinema.jpg`)**
1. **LOD poster:** show `img/engine/earth.webp` or cinema still under canvas until first frame paints.
2. **Shared lighting recipe** with hero: stronger limb-light, darker fill, brass ring roughness 0.35.
3. Optional: sample **engine stills as sprite billboards** for outer planets on low tier.
4. Don’t replace `orrery-webgl` until cinematic plate consistently matches home quality.

---

### 3) Product / UX designer

**Score: 80/100**

**Wins**
- Cosmic Journey + export suite + spine cards = correct hub structure.
- Chart honesty (precision %, time unknown) is excellent trust UX.

**Issues (from captures)**
- **Double chrome:** journey bar + site nav + bottom tabs + Continue FAB = dense.
- Chart page: journey bar + masthead + theme toggles fight for attention.
- Horoscope: Transit Explorer is strong; original sign grid still below fold — OK if intentional.

**Improvements**
1. On My Sky: hide redundant second top nav or fold into brand row only.
2. Demote “Continue My Journey” on pages where a primary CTA already exists (Cast).
3. Chart: move export toolbar **after cast success**, not competing with empty form.

---

### 4) Accessibility auditor

**Score: 90/100**

- axe: key pages clean; **shop + transits** `region` moderate (landmark).
- Incomplete colour-contrast checks remain for brass-on-void (manual AA pass needed on small caps).
- Orrery keyboard help is documented; ensure focus ring on canvas after fix.

**Improvements**
1. Wrap shop float/export residuals in `<main>` landmarks.
2. Live region when orrery fails/loads (“Solar system ready”).

---

### 5) Conversion / shop critic

**Score: 72/100**

- Shop hero honesty is good; product cards must look like **masterpiece plate**, not stock.
- Use Imagine target plates as the bar for Deep Reading / poster thumbs.

---

## Page-by-page scores

| Page | Visual | Structure | Graphics | Priority fix |
|------|-------:|----------:|---------:|--------------|
| **Home** | 90 | 88 | **92** | Keep; don’t regress hero |
| **My Sky** | 70 | 86 | **45** | Fill orrery + empty-state poster |
| **Chart** | 84 | 82 | 70 | Post-cast visual payoff (wheel/plate) |
| **Horoscope / Transit** | 86 | 85 | 80 | Wheel depth + glyph weight vs plate |
| **Shop** | 78 | 80 | 75 | Product stills → masterpiece quality |
| **Sky (ephemeris)** | 82 | 84 | 78 | Less empty void above fold |

---

## Gap analysis: live vs Imagine targets

| Target | Live gap | Code / content action |
|--------|----------|------------------------|
| Masterpiece plate | Export plate lacks porthole rings + parchment | Upgrade `AP_EXPORT.renderKeepsakeCanvas` composition |
| System cinema | Cinematic orrery too schematic | Texture quality + lighting; poster fallback |
| My Sky target | Empty left panel | Boot fix + poster underlay + longer first-frame wait |
| OG banner | Home already close | Keep typography law; optional brass armillary overlay on Earth rest frame |

---

## Priority backlog (graphics only)

### P0 (this week)
1. ~~My Sky orrery black panel~~ — boot wait for THREE (done); **verify in browser** after hard-refresh.
2. Poster underlay on all `ap-orrery-host` until first WebGL frame.
3. Re-capture `mysky.png` audit shot; must show planets.

### P1 (next)
4. Export PNG composition → masterpiece plate geometry.  
5. Transit wheel: thicker brass stroke, zodiac tick labels (Aries…), subtle paper grain.  
6. Shop product images regenerated from engine stills + brass frame recipe.  
7. Collapse dual nav on My Sky.

### P2 (polish)
8. Shared film-grain CSS overlay (very low opacity) on tool pages.  
9. Chart success state: full-bleed plate animation into export toolbar.  
10. Soft-nav remains off until orrery state survives navigation.

---

## A11y snapshot (axe, local)

- index, chart, horoscope, ephemeris, compatibility, lifepath: **0 critical** (as of run)  
- shop, transits: **region** moderate  
- Full report: `tools/visual-check/out/a11y/report.json`

---

## How to re-run this audit

```powershell
cd C:\Users\jonny\OneDrive\astroprecise\tools\visual-check
# capture script in session or: npm run pages
node audit-a11y.mjs "http://localhost:8790"
# open out/graphics-audit/*.png + img/design-targets/*
```

---

## Summary for Jonny

The site’s **brand is elite** where the production WebGL hero and marketing plates already exist. The **structure (My Sky / journey / export) is correct**. The audit team’s main call: **stop scoring graphics as “world-class” until My Sky’s 3D panel paints reliably and export/shop stills match the masterpiece/cinema plates.** Imagine targets in `website/img/design-targets/` are the visual contracts for the next implementation pass.
