# Expert team audit — 3D model: where did the improvements go?

**Date:** 2026-07-11 · **Panel:** WebGL engineer · CSS architect · Deploy engineer · Product design director · Grok synthesis  
**Owner complaint:** “Experts keep promising 3D model improvements; every update I see none.”

---

## Executive answer (blunt)

| Question | Answer |
|----------|--------|
| Where did the “improvements” go? | **Almost entirely local OneDrive tree + handoff docs — not production.** |
| Live public site | **Still `ap-v705`** (`https://astroprecise.app/sw.js`) |
| Local tip before this audit | **`ap-v712`** chrome work |
| Did agents change the WebGL engine? | **No.** `orrery-webgl.js` stayed at **`?v=703`** while SW labels rose to 712 |
| Is the mountain Observatory on the internet? | **No.** `observatory.html` **404 on live**; missing from `origin/main` |
| Why the model “feels the same”? | (1) **not deployed** (2) **chrome around same engine** (3) **deliberate frozen Earth rest frame** (4) **CSS postage stamps** still fighting |

---

## Version map (evidence)

| Surface | SW version |
|---------|------------|
| Live `astroprecise.app/sw.js` | **ap-v705** |
| GitHub `origin/main` | **ap-v705** (commit `f2dab46`) |
| Local `website/sw.js` (before audit ship) | **ap-v712** |
| Local branch vs origin | **ahead 9 / behind 92** — diverged |
| Local remote for autosnapshots | **`mirror` only** — does **not** deploy |
| Last successful Pages deploy | Run on `f2dab46` — **v705** |

**Deploy path that actually works:**

```
edit website/** → commit on main → git push origin main
  → GitHub Actions → dist/ → GitHub Pages → astroprecise.app
```

Mirror / STATUS / handoff / local `:8790` **do not update live.**

Agents said “shipped ap-v70x” when they meant **edited local files and bumped a number in STATUS.**

---

## What the four expert lenses found

### 1. WebGL / engine engineer

- Home boots: bootstrap → award → **loader `?v=703`** → **webgl `?v=703`**
- Default: **Earth rest, FOV 38°, radius ~3.8, `setSpeed(0)`**, orbits **off**, readout **hidden**
- Product comment in loader: *“calm Earth rest frame… rich layers only as visitor engages”*
- **ap-v708–712 never version-bumped the engine module**
- Wow APIs exist (`startScaleJourney`, `setScaleLevel`, trails, etc.) but need **engagement** or **new first-paint policy**

### 2. CSS architect

- Postage stamps still live in: `ap-model-stage`, `ap-page-structure`, structure-clean media, model-window mobile, horizon `left:78%`
- Observatory-home tries to win last, but fight is **fragile**
- Horizon **canvas radial mask** shrinks the *visible* disc even when the box is full
- Local cascade *can* full-stage if observatory loads; live may still be older tip

### 3. Deploy engineer

- **`observatory.html` not on origin** → live 404
- **`ap-scale-ladder.js` 404 on live**
- Repo-guard autosnapshots → **mirror**, not GitHub
- OneDrive recovery history already lost work once

### 4. Product design director

- Promise: NASA Eyes–class living instrument
- Shipped week: **museum frame + bigger window + 2D lens room** around **same generation orrery**
- True-Time / VSOP already in engine (under-shown)
- Gap: camera craft, trails, real 3D stars, Sky Wheel, one material leap

---

## Chrome vs model (session reality)

| Work | Changes the 3D disc? |
|------|----------------------|
| Aurora CTA, Explore→Observatory words, path thumbs | **No** |
| Moment porthole rings, My Sky honesty | **No** |
| Scale Ladder JS (scroll → setScaleLevel) | **Only if local + user scrolls** — not on live |
| Model Window hairline / plate | **Frame only** |
| Full-stage CSS | **Bigger window, same renderer** |
| `setDefaultEarthFrame` closer / FOV (ap-v713) | **Yes — first real engine pixel change** |
| Orbits on at Earth rest on home (ap-v713) | **Yes — reads as orrery** |
| Stronger idle breathe (ap-v713) | **Yes — disc moves** |

---

## One-week expert team plan (model-only, visible)

Ban: nav synonyms, CTA colours, design docs, mountain SVG polish.

| Day | Canvas-visible ship |
|-----|---------------------|
| 1 | Camera craft: damper, idle drift, pointer parallax, reveal dolly-in |
| 2 | Focus package: FOV + fog + readout |
| 3 | Time scrub + orbit trails |
| 4 | Real bright-star shell in WebGL |
| 5–6 | Sky Wheel mode **or** one body material leap (Saturn shadow / Earth 4k) |
| 7 | Perf + crop QA + **push origin/main** |

Acceptance: screen recording of **canvas only** is obviously better day-over-day.

---

## Immediate actions for the owner

1. **Hard-refresh local** `http://localhost:8790/` after **ap-v713** (engine actually bumped).
2. Expect: **larger Earth**, **orbit rings visible**, **stronger idle camera breathe**.
3. **Live will not change** until someone **`git push origin main`** (and reconcile behind 92 carefully).
4. Do not trust handoff “ap-v### shipped” without checking  
   `https://astroprecise.app/sw.js` → `const V`.

---

## ap-v713 (this audit’s first real model delta)

| Change | File |
|--------|------|
| Home Earth closer (3.15) + FOV 34° | `orrery-webgl.js` `setDefaultEarthFrame` |
| Stronger idle breathe | `orrery-webgl.js` idle branch |
| Orbits ON at scale 0 on observatory home | `orrery-loader.js` |
| Engine cache `?v=713` | loader, award, index modulepreload |
| Stamp CSS `:not(.ap-observatory-home)` | model-stage, model-window |
| Kill canvas mask on home | `ap-observatory-home.css` |
| SW **ap-v713** | `sw.js` |

## ap-v714 — Expert Day-1 CAMERA CRAFT (shipped local)

| Change | Detail |
|--------|--------|
| **Reveal dolly** | On home arm: start at radius×1.58 + FOV+6°; on `orrery-full` / `playHomeRevealDolly()` ease-out ~1.55s to settle |
| **Pointer parallax** | Fine pointer ±~2° az / 1.4° el, damper k≈6, applied in `applyCamera` without dirtying cam state |
| **Idle settle** | Home idle uses 3.15/7° (not scale preset 4.5 which pulled camera back) |
| **API** | `Orrery3D.playHomeRevealDolly()` — loader handoff + award `markLive` |
| **PRM** | Dolly skipped; settle instant |
| Engine / SW | `orrery-webgl.js?v=714`, SW **ap-v714** |

**How to verify (canvas only):** hard-refresh local home → Earth should **push in** over ~1.5s, then gently breathe; mouse over canvas should slightly reframe.

**Day-2 (next):** focus FOV package on planet pill tap.

---

*Panel consensus: stop reporting chrome as model. Deploy is the gate. Engine pixels are the product.*
