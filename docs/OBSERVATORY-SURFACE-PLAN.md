# Observatory Surface Plan — rewrite of the R3F brief

**For:** Jonny · AstroPrecise · measured tip ap-v876 · 2026-08-17  
**Supersedes:** the React Three Fiber / Zustand / glassmorphic paste (sensor · tilt_plate · filter_wheel). That brief was the wrong product.  
**Owner law (unchanged):** no React · WebGL only · one WebGL context per page · no gate on the live sky · no UFO brand · no new SKUs · no live checkout until you say · Night you were born is the gift path (`NIGHT-YOU-WERE-BORN.md`).

This is the same *job* as that paste — full-viewport 3D stage, guided camera, spatial HUD, buried tools on the surface — done on the house that already ships.

---

## What stays, what dies

| R3F paste | AstroPrecise rewrite |
|---|---|
| `components/3d/Stage3D.tsx` + R3F Canvas | Surface C on `index.html` — existing `orrery-webgl.js` + `void-orrery-adapter.js` |
| React OrbitControls | Existing orbit / focus / scale journey in `orrery-webgl.js` (damped; polar clamp already the right idea — tighten if a spin still inverts) |
| Zustand camera store | Thin page controller on `window` (or one module) — same fields, no React store |
| GSAP / react-spring camera | Existing interruptible camera owner in `void-orrery-adapter.js` + `focusPlanet` / authored stills |
| `@react-three/drei` Html pins | DOM overlay pins (`.orrery-dom-labels` must stay `pointer-events: none` except the pin hit targets) |
| Glass SpatialHUD as React | Glass CSS tokens (`--ap-*`) + existing nav / observatory controls — no second IA |
| Draco / KTX2 / detect-gpu | Keep current texture pipeline; throttle bloom/AA from existing device class checks — do not add a second loader stack without measuring |
| Nodes: sensor / tilt_plate / filter_wheel | Wrong domain. Real nodes below. |

Do not create `components/`. Do not open a Vite/React app beside `website/`.

---

## 1. Core 3D stage (Surface C)

**Owner:** `website/index.html` + `website/js/orrery-webgl.js`.

- Full-viewport canvas behind UI (`z-0` / existing shell). One context only.
- Camera: keep damped orbit; constrain polar so the user cannot flip under the ecliptic into nausea.
- Lighting: keep True-Time / honesty rules — do not invent fake “LIVE” HDR that lies about the sky.
- Loading: existing preloader / wireframe path — holographic skeleton only if it does not claim live positions before the engine is ready.
- Receiver for `#m=` / focus stays `APDeepLink` / `APSkyBridge` → this page. Emitters never mount a second WebGL.

Honesty: Surface C may say live VSOP87 when the engine is running. Stills and posters stay SCHEMATIC (Surface A). See `docs/MODEL-SURFACE-CONTRACT.md`.

---

## 2. Spatial nodes & camera rig (real product nodes)

**Not** hardware calibration. Nodes are the house’s real instruments.

| `activeNode` | Meaning | Camera / UI |
|---|---|---|
| `null` | Free play | Default system / Earth rest |
| `earth` | Home marked | Earth focus, limb / terminator honesty |
| `system_hour` | Birth-minute still | Authored “solar system that hour”, Earth marked, **no HUD in the frame** |
| `chart` | Free positions | Hand off or overlay chart minute — no second canvas |
| `reading` | Deep reading | Drawer / panel — engine may idle or hold still |
| `sky_card` | Keepable card | 2D card path — do not mount WebGL on the card page |
| `couples` | Two clocks | Separate product — do not fold into the gift |

**Store shape (vanilla module, not Zustand):**

```js
// conceptual — one module, e.g. website/js/ap-observatory-rig.js
{
  activeNode: null | 'earth' | 'system_hour' | 'chart' | 'reading' | 'sky_card' | 'couples',
  cameraTarget: [x, y, z],
  cameraPosition: [x, y, z],
  momentUtc: string | null   // birth / keep minute when set
}
```

Click pin → set `activeNode` → existing camera transition (60 FPS lerp already owned by the orrery). Do not add a second animation library unless the current owner cannot land cleanly.

Pins: DOM chips with a quiet pulse. Hover = glance status (body name, honest label). Click = focus. Overlay trap rule stands: labels must not steal canvas pointer events except the pin itself.

---

## 3. Spatial HUD (glass, house tokens)

**Top bar:** AstroPrecise wordmark · mode presets that map to real engine modes (e.g. System / Inner / Earth) · optional Cmd+K only if it searches real house routes (chart, reading, sky-card, eclipse) — not a fake command palette.

**Bottom dock (floating glass, `--ap-*`):**

| Control | Does |
|---|---|
| Keep this sky | Still + sky-card + reading path (`NIGHT-YOU-WERE-BORN.md`) |
| Chart minute | Free positions for the held moment |
| Deep reading | Seven chapters |
| Couples | Two clocks — separate entry |
| Reset view | Clear focus / return to default |

**Right drawer:** Opens only when a node needs precision inputs (place, IANA zone, time honesty). Must not cover the focal mesh. Refuse UTC/GMT-as-birth-zone per gift plan.

No exploded view / X-ray / measurement grid unless they mean real ephemeris scale journey — rename to house language (System · Inner · Earth), never lab-instrument cosplay.

---

## 4. Asset & performance

- One WebGL context. Prefer OrbitLab math as engine source of truth when syncing.
- Textures: current WebP / existing pipeline first. Draco/KTX2 only if measured need (size or GPU) — not as fashion.
- Throttle bloom / AA / particle density on weak GPUs using the device class you already have; prove with `npm run test:ui`, not Cursor’s browser.
- Cache bust: bump `website/sw.js` `V` + matching `?v=` together.

---

## 5. Build order (Act 1 — local, no push)

1. House-fit sky card (IANA, honesty, same nav).  
2. Authored `system_hour` still + keep filename + caption (Earth marked, no HUD).  
3. One Keep path from Observatory / Chart / Deep reading — no new folder.  
4. Wire `activeNode` + pins on index only — one stage.  
5. Phone 390 pass.  
6. You look. Shop / new SKU only if you say.

Hard stops: no React · no second brand · no inventing SKUs · no push to `origin/main` without you · leftover rooms stay off the front path.

---

## 6. Cloud agents (when you arm them)

Standing STATUS said: no new cloud job until you say. If you arm cloud credits later, spawn **at most two** agents with **non-overlapping** scopes:

| Agent | Exact scope | Forbidden |
|---|---|---|
| A — Keep path / sky-card house-fit | `sky-card.html`, keep links, IANA honesty | No React · no shop SKUs · no push |
| B — `system_hour` still | Authored camera in `orrery-webgl.js` / keep-sky caption | No React · no second canvas · no HUD in still |

Fold PRs into local. Close leftover 16–23 without merge after `gh auth login`. Do not burn credits on R3F scaffolds.

---

## Done when

- Free play on index still works without paying.  
- Keep path yields still + card + reading for one birth minute.  
- One WebGL context; surfaces A/B/C honesty intact.  
- You have looked on phone and laptop.  
- No React tree exists under `website/`.
