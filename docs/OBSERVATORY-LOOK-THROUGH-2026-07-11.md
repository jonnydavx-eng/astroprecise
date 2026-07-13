# The Observatory — Look Through the Lens (recovered + elevated)

> **Snapshot only (as of file date).** Deploy / tip claims here may be stale. **Current LIVE tip:** see `STATUS.md` and `website/sw.js` (ap-v721 as of 2026-07-13). Do not plan from this file's "not deployed / diverged" language.

**Date:** 2026-07-11 · **Author:** Claude (recovery workflow `recover-nightsky-plan` + design-panel recovery `mountain-observatory-entrance` wf_0b0aac05-4d5)
**Status:** BUILT on `website/observatory.html` (masterclass elevation shipped locally, ap-v707). Standalone entrance, wired into nav (More → "Look Through the Lens"), sitemap, SW precache. NOT deployed (branch diverged from origin/main — see AGENT-HANDOFF).

> This file exists because the plan was LOST once (scratchpad temp-file cleanup + the OneDrive conflict-copy event) and got reinvented WRONG (a "lighthouse overture"). Durable record so it is never lost or confused again.

## Owner's vision (verbatim — recovered from workflow wf_0b0aac05-4d5)
> "When I saw Observatory I had the idea — we start in an observatory on a picturesque mountain, we look through the lens and see the star signs; this ties into the 3D model."

The defining verb is **look THROUGH** (peer through an eyepiece to the real sky), NOT a camera pull-BACK. The full arc = **look through the lens to the real night sky, then follow the orrery outward** (the 7-act Earth→Cosmos scale journey).

## The storyboard (design panel: creative + visual + technical directors)
1. **Arrival** — a picturesque mountain + observatory dome under a warm twilight sky; a decorative starfield, **explicitly labelled schematic** (the REAL sky is inside the lens). Copy: "You've reached the observatory. High on the mountain, under a real sky."
2. **Approach** — the eye is drawn to the telescope: a circular brass eyepiece with a crosshair reticle, a living dome lamp. Plate: `THE OBSERVATORY · <date> · REAL SKY`.
3. **The Lens (threshold)** — click the frame / press "Look through the lens": an **iris/portal reveal** — `clip-path: circle()` aperture blooming open, brass ring reusing the **Model Window** hairline + corner-tick language, a ring flash, the reticle rotating and fading.
4. **Through it: the living sky** — inside the lens the **ZodiacSphere** boots (`squareLens` = 1:1 canvas fills the circle) showing the 12 signs + planets at their **true VSOP87 longitudes right now**. Plate flips to `LIVE ZODIAC · VSOP87 · <date>`.
5. **Interact** — drag to turn the sky; each seal is a constellation; tap a sign to read it.
6. **Enter → follow the orrery** — "Enter the observatory →" **dives through the lens** (eyepiece scales up, the live sky rushes forward, a veil closes) into the live 3D model home, where *follow the orrery* = the 7-act scale journey (`startScaleJourney`, `scale-journey-chapters.js`).
7. **Honest failure** — if the lens can't draw: plate reads `LIVE SKY UNAVAILABLE`, reticle kept, invited to "step inside" — never a fake sky.
8. **Motif** — the lens-circle iris is intended to recur sitewide as the transition device.

## Honesty + brand basis (research)
- Owner seed vision (above).
- `docs/VISUAL-OVERHAUL-RESEARCH-2026-07-09.md`: NASA Eyes = "model is the product, chrome is secondary glass"; Stellarium = "sky fills the frame."
- `docs/SITE-MERGER-PLAN-2026-07-08.md`: "AstroPrecise is a private observatory that freezes real sky … photoreal planetary windows."
- Honesty law: decorative backdrop labelled schematic; never assert LIVE/VSOP87 over a lens that didn't render.
- Palette: **warm-twilight** (hue ~40) for the mountain/eyepiece — this is a deliberate exception to the site's cool Jet·Silver·Aurora, and matches the owner's eye-comfort preference. Do NOT cool it.

## What is BUILT (2026-07-11, ap-v707)
`website/observatory.html` + `js/ap-observatory-entrance.js` + `js/zodiac-sphere.js` (squareLens). Masterclass beats added this session, all self-contained CSS/JS, tunable via `:root` vars (`--obs-arrive/--obs-iris/--obs-iris-ease/--obs-dive`), PRM-degrading, verified structurally (screenshots blocked this session — motion feel needs an owner eye-check on a real browser):
- Arrival settle (`obs-arrive`), breathing approach halo (`obs-breathe`), living dome lamp.
- **Iris/portal threshold**: lens `clip-path` 9%→72% bloom + `.obs-iris` ring flash + reticle rotate + **Model-Window corner ticks** (`.obs-tick`).
- Square live VSOP87 lens (510×510), honest plate, honest-fail path.
- **Dive hand-off** (`body.is-entering` → eyepiece scale + `.obs-warp` veil → navigate to index.html).
- Wired in: nav More "Look Through the Lens" (badge Enter), sitemap, SW precache.

## What the LIGHTHOUSE OVERTURE got wrong (deleted 2026-07-11)
`ap-lighthouse-overture.js/.css` inverted the concept: a camera **pull-BACK through a lighthouse** (retreating), a stylised SVG that **never renders the real sky**, and a **lighthouse that never existed** in AstroPrecise. It reused the owner's "follow the orrery" phrasing, which caused the confusion. Retired + deleted.

## Open / next (owner calls)
- **Real stars behind the zodiac** (storyboard step 4): render `starcatalog.js` (253 real stars) behind the ZodiacSphere ring inside the lens. Touches `zodiac-sphere.js drawSpaceBackground` (shared w/ horoscope) — do carefully + verify. NOT yet done.
- **Scroll-bound follow-the-orrery** (WOW-HOMEPAGE-PLAN Slice 3): bind homepage scroll to the scale journey so "follow the orrery" continues from the hand-off. Engine has no scroll→camera API (IO-triggered `setScaleLevel` only).
- **Lens-circle motif** rollout sitewide as the transition device.
- **Deploy**: reconcile the diverged local/origin branches first (origin lacks observatory.html entirely).
