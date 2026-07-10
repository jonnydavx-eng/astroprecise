# Expert team audit — latest saved bug screenshots (2026-07-09)

**Sources reviewed**
- Owner browser shots: `tools/visual-check/out/user-shots/Screenshot_9-7-2026_16*` (16:17–16:18)
- Agent re-captures of same bugs: `user-shots-1618/live-home.png`, `live-explore.png`, `load-t*.png`
- Load sequence: `load-glitch/t200…t5500.png`
- Current local baseline: `expert-bug-audit/*-now-v682.png` (ap-v682, :8790)

**Out of scope**
- `Screenshot_…_14463` = **GE Vineyard / 3D Davit** training tool, not AstroPrecise.

---

## Expert panel (5 roles)

| Role | Focus | Verdict on bug set |
|------|--------|-------------------|
| **A · Structure / IA** | What owns first viewport; stacking order | **P0 clear:** form buried Earth on home; email sticky bisects Explore + Daily |
| **B · 3D / load** | Boot glitch, fake disc, final Earth quality | **P0 mid-load:** blank blue disc ~0.6s; **P1 residual:** Moon overlay on Earth at rest in one capture |
| **C · Conversion** | Can user cast / pick a sign without fighting chrome? | Home cast card wins over planet (bad); Daily sticky cuts sign grid (bad) |
| **D · Visual design** | Contrast, black voids, brand | Full-page home scroll shows **black chapter voids** + dead sign circles |
| **E · Regression** | Fixed since, still broken now? | Sticky email + form-over-planet largely fixed; **cast dock may be below fold again** on desktop |

---

## Bug inventory (from the screenshots)

### BUG-1 — Home: cast form covers / replaces the living Earth (P0)
**Evidence:** `161725` / `161738` top crops  
- Centre of viewport is a large **FREE BIRTH CHART** glass card (“You're not one of twelve…”)  
- Photoreal Earth is only a **faint blur** behind the card  
- Deck HUD (Earth/Sun/Moon, scrub) peeks under the card — instrument feels secondary  

**Root cause (historical):** cast dock / hero form stacked as full-centre overlay instead of bottom dock under a model-first stage.

**Status now (v682 metrics):** `overlapY: 0` (form no longer intersects stage box) — **overlap fixed**.  
But `formTop: 961` @ 900px viewport → **cast form is entirely below the first screen**. That trades “covers planet” for “form not visible without scroll”.

**Recommended fix:** keep model-first, **dock form peeking** (~120–160px of cast bar in first viewport) — not full-centre card, not fully below fold.

---

### BUG-2 — Sticky email bisects Explore stage vs engine strip (P0)
**Evidence:** `16183` full  
- Gorgeous Earth+Moon 3D stage on top  
- Mid-page hard band: **“Updates coming soon — join the list”** email sticky  
- Then “3D ENGINE / From the living sky” cinema + planet rail  
- Reads as two products glued by a marketing wall  

**Status now:** sticky email **off** on explore/home/chart/daily/instrument (v672+). Live Explore re-capture shows tools strip under stage without mid-bisect. **Fixed on model tools.**

---

### BUG-3 — Sticky email cuts Daily sign grid (P0)
**Evidence:** `161827` top  
- Aries–Cancer row above the sticky  
- Sticky email through the middle of the 12-sign grid  
- Leo–Scorpio below — grid **split by chrome**  

**Status now:** `stickyClass: false`, `emailVisible: false` on Daily. **Fixed.**

---

### BUG-4 — Home full-page = black voids / empty chapters (P1)
**Evidence:** `161725` / `161738` full-page  
- Below hero: long black bands, unreadable or missing section content  
- Sign library circles as empty dark discs  
- Feels broken / unfinished on scroll  

**Status:** partially addressed by jet/silver body text + glass cards (v672); still worth a scroll audit of secondary chapters.

---

### BUG-5 — Load glitch: fake blue disc before Earth (P0 load)
**Evidence:** `load-glitch/t600.png` vs `t5500.png`  
- ~0.6s: featureless blue circle + form dock  
- ~5.5s: real textured Earth  

**Status:** v678 kept real lite-poster + earth.webp underlay during `ap-await-webgl`. **Addressed**; re-verify with timed capture if cache is stale.

---

### BUG-6 — Rest frame: Moon disc overlaid on Earth (P1)
**Evidence:** `user-shots-1618/live-home.png`  
- Full Earth money-shot with a **large Moon sphere** sitting on Africa/Europe — looks like a composite bug or accidental dual-body rest  

**Status:** may still exist depending on hero photoreal frame mode. Needs engine/loader check (`focusPlanet` / Earth+Moon rest).

---

### BUG-7 — Daily page too long / secondary wall (P2)
**Evidence:** `161827` full  
- After sign grid: dial, personalise, email again, planetary weather empties, moon, retrograde, week text wall, tools rail  

**Status:** v679–v680 collapsed some secondary into `details.ap-more-sky`; tools-only mode. Still long — OK if collapsed.

---

### BUG-8 — Nav lag / dual nav systems (P2, historical)
**Evidence:** Explore shot still showed old “Chart · Sky · Daily · Readings · Library · Shop” while home had Explore-first spine.

**Status:** nav model now Explore · Chart · Sky · Daily · Shop. Hard-refresh required if SW holds old shell.

---

## Severity matrix

| ID | Severity | Then | Now (v682 local) |
|----|----------|------|------------------|
| BUG-1 form vs planet | P0 | Form wins; Earth dead | No overlap; form **below fold** (new trade-off) |
| BUG-2 email / Explore | P0 | Bisects stage | Fixed |
| BUG-3 email / Daily | P0 | Cuts sign grid | Fixed |
| BUG-4 black voids | P1 | Severe on full scroll | Improved; re-check |
| BUG-5 load disc | P0 load | Fake blue disc | Fixed in v678 (verify) |
| BUG-6 Moon on Earth | P1 | Visible in live-home | Unknown / re-check |
| BUG-7 Daily length | P2 | Wall of sections | Partially collapsed |
| BUG-8 nav lag | P2 | Dual bars | Model nav locked |

---

## What the team recommends next (ordered)

1. **P0 — Home cast dock peek**  
   Bring form dock back into first viewport (~bottom 15%) without covering Earth centre. Metrics target: `formTop < viewportH - 40`, `overlapY ≈ 0`, planet centre clear.

2. **P1 — Moon-on-Earth rest frame**  
   Confirm `setupHeroPhotorealFrame` / Moon pill doesn’t leave Moon geometry parked on Earth disc at scale-0 rest.

3. **P1 — Timed load re-proof**  
   Re-run 200/600/1500/4000ms captures after hard-refresh + SW unregister; expect textured underlay from t200, not blue disc.

4. **P2 — Full-page home scroll**  
   Spot-check library + shop chapters for empty circles / black voids after fonts + seals bind.

5. **Owner action**  
   Hard-refresh :8790 (or unregister SW once). Bug shots were taken against an older shell; many chrome bugs already shipped.

---

## Summary for Jonny

The **latest saved bug screenshots** (16:17–16:18 + re-captures at 17:08) show three main stories:

1. **Home structure fight** — form card vs living Earth (the shot that kicked off the structure wave).  
2. **Sticky email vandalism** — Explore + Daily literally cut in half by “Updates coming soon”.  
3. **Load / rest quality** — blank disc early; one rest frame with Moon stuck on Earth.

Most of (2) and parts of (1)/(3) are already fixed in ap-v672–v682. The **open expert concern on current :8790** is that the cast form may have over-corrected and fallen **below the first desktop viewport** — still model-first, but weaker conversion.

Shots for this audit: `tools/visual-check/out/expert-bug-audit/`.

---

## Follow-through shipped — ap-v683 (2026-07-09 ~22:05)

| Item | Result |
|------|--------|
| Cast dock peek | stage `48vh`/480 max; **formTop 961→676**, `dateInView`, `overlapY: 0` |
| Moon-on-Earth | Earth rest hides Moon unless Moon-focus / scale ≥ 1 |
| Load | form + canvas from t600; photoreal Earth at rest (no blank blue disc in settle) |
| Library voids | sign tiles forced glass + visible seals |
| Verify | `tools/visual-check/out/v683/` PASS; npm 21/21; SW **ap-v683** |

Hard-refresh :8790 home.
