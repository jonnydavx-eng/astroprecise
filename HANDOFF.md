# AstroPrecise — HANDOFF (start here) · 2026-07-11

**Canonical:** `C:\Users\jonny\OneDrive\astroprecise` · site in `website/` · preview `http://localhost:8790` · SW tip **ap-v717**.
Ground first: `powershell -NoProfile -File control-panel\project_first.ps1 -Name AstroPrecise -Agent <you>`.

---

## ⚠️ Read these 3 before touching anything

1. **NOTHING IS DEPLOYED.** Local `main` has **diverged from `origin/main`**. A plain `git push` is NOT a clean fast-forward and could clobber live. Reconcile the branches (cherry-pick the real fixes onto origin/main, or a careful merge) before any deploy. Everything below is **localhost only**.
2. **A service worker serves the owner a STALE cached homepage** — changes look invisible for hours. Always verify via **hard-refresh (Ctrl+Shift+R) or incognito**. Consider adding a dev SW-bypass on localhost.
3. **You CAN see + test the WebGL graphics** — the in-app CDP browser renders the page `hidden` (paused rAF → blank canvas, frozen transitions), so DON'T trust it for graphics. Use the harness below.

## ✅ The render / real-click test harness (the key capability)

The in-app browser can't render the engine, but **Playwright + SwiftShader can** (node_modules ARE hydrated):

```
node tools/_diag-click.mjs    # renders the homepage, does REAL mouse drag/click/dblclick on the model,
                              # checks elementFromPoint for click-eating overlays, saves screenshots
node tools/_diag-engine.mjs   # renders + runs the scale journey / focus, captures ALL console + pageerrors
```
Screenshots land in the scratchpad + are copied to `_engine-render/` — then `Read` the PNGs to actually SEE it.
**Hard rule:** never "verify" a 3D interaction by calling `Orrery3D.focusPlanet()` — that bypasses pointer overlays. Simulate a real mouse event.

## ✅ Fixed & verified this session

- **P0 — the 3D model was UNCLICKABLE.** `.orrery-dom-labels` (full-canvas label overlay) had `pointer-events:auto` in `orrery-full`, eating every click/drag. Fixed in `css/orrery-visual.css` just after line 1195 (`.orrery-dom-labels{pointer-events:none!important}` + chips `auto`). VERIFIED: drag turns the model, dblclick focuses a planet.
- **Clarity overhaul (partial):** one plain nav everywhere (`Chart · Compatibility · Daily · Live Sky · Shop`; "Daily"→horoscope.html; Compatibility promoted) in `index.html` masthead + `js/ap-nav-model.js`; mobile task-first hero (form above a bounded model band) in `css/ap-observatory-home.css` (phone-only caps — do NOT let height caps leak to desktop, that regression happened + was fixed).
- Palette aligned to **silver/aurora** (`css/ap-palette-2026.css` is the live "Jet·Silver·Aurora" system, NOT the old brass); observatory "look-through" recovered + elevated (`docs/OBSERVATORY-LOOK-THROUGH-2026-07-11.md`, `observatory.html`); the wrong "lighthouse overture" was deleted; Phase-1 planet launchpad added (`js/ap-planet-actions.js`).

## ▶️ Next, in order

1. Stop `js/ap-planet-actions.js` **auto-opening the panel at rest** (it covers the model — only open on an explicit user click).
2. Finish the clarity overhaul (`tools/.../w79ikgczk.output`): collapse the ~15-control model cockpit behind one "Explore" toggle; one home / one entrance (retire the observatory portal from the hero); group the ~25 tool pages in "More".
3. The real **3D / spatial-navigation** work the owner wants ("go through space, navigate via the model") — now testable via the harness. Engine is `js/orrery-webgl.js` (OrbitLab-synced; real changes belong in OrbitLab). Raycast/`focusPlanet`/`flyTo`/scale-journey primitives already exist.

## Owner context

Frustrated by a long session where most work was invisible (caching) or tested wrong (API calls not real clicks). Lead with **verified-by-real-render** results and hard-refresh instructions. Full detail: `AGENT-HANDOFF.md` (top entries) + `STATUS.md`. Memory: `visual-check-blocked-onedrive-pause` (the harness), `astroprecise`.
