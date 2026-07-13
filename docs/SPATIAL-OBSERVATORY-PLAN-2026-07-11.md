# The Living Observatory — spatial-navigation site (hybrid) — BUILD PLAN

> **Snapshot only (as of file date).** Deploy / tip claims here may be stale. **Current LIVE tip:** see `STATUS.md` and `website/sw.js` (ap-v721 as of 2026-07-13). Do not plan from this file's "not deployed / diverged" language.

**Date:** 2026-07-11 · **Author:** Claude · **Owner decision:** *hybrid* (the 3D model IS the primary navigation, with a real DOM nav + crawlable content underneath) · "plan the build now."
**Inputs:** owner vision (below) · owner's Grok research thread (3D-as-main-nav, per-planet, reading formats, 12 side features, engagement/turnover) · direct engine audit of `orrery-webgl.js` · the failed feasibility workflow (rerun-able after session reset).

> **Owner vision (verbatim, 2026-07-11):** "the model should lead into a 3d observatory, then through the telescope you're led out to the 3d model, all the site is clickable and navigation can happen through the model — I want a unique site."

## Verdict: possible — as a HYBRID
The primitives already exist in the engine, so "navigate by clicking through a 3D world" is buildable:
- **Object picking** — a `Raycaster` on pointer/dblclick (`orrery-webgl.js:7568–7587, 9048`); today it picks planets, extend to hotspots.
- **Camera fly** — `flyTo` / `focusPlanet` (38+ uses) + `startScaleJourney` (cosmos↔Earth). The loop = more waypoints on this.
- **Scene meshes** — built from addable `THREE.Mesh`/`Group` (48/22 uses) → an observatory dome + telescope can be added.

**Hard rule (every precedent + Grok's experts agree): never pure-3D.** A DOM-less 3D site kills SEO, accessibility, mobile battery, and conversion. The unique-and-shippable form = **the model is the hero/primary navigation, clickable + spatial + looping, with a persistent real nav + crawlable content + 2D/reduced-motion fallback underneath.**

## The concept — "The Living Observatory"
One continuous 3D world you navigate by moving through it. Every planet and observatory fixture is a **doorway** to a real page.

### The loop (forward-flowing — fixes "it flows backwards")
1. **Cosmos / the model** — land on the live orrery (as today).
2. **Into the observatory** — the model *leads down*: a fly-down (reuse the Earth-ward scale journey) settles on a **3D observatory dome** on the mountain; the camera glides toward/into it.
3. **Inside the observatory** — the **telescope** is the focal object; the dome frames the sky; fixtures (telescope, star-chart table, plinth, doorway) are **clickable hotspots**.
4. **Through the telescope → back out** — looking through the telescope flies you back OUT to the cosmos/model — closing the loop (cosmos ↔ observatory ↔ telescope ↔ cosmos).
5. **Everywhere clickable** — planets + fixtures raycast → fly-to + a DOM quick-action panel (live sign/degree via `getBodyReadout` + actions) that deep-links the real pages.

## Hybrid architecture (the spine)
- **One persistent Three.js scene** (index.html) holds both the model and the observatory; camera waypoints move between them (reuse `flyTo`/scale-journey).
- **New additive module `js/ap-spatial-nav.js`** — registers clickable 3D hotspots (planets + fixtures), raycasts pointer/keyboard events, maps each hotspot → {fly-to + open a DOM quick-action panel, or navigate}. Uses the engine's EXPOSED API only (no engine edit for this layer).
- **Persistent real DOM nav** (the locked bar: Observatory·Chart·The Sky·Daily·Shop) is always present — the escape hatch, a11y, and SEO. The spatial nav is an ENHANCEMENT over it, never a replacement.
- **Crawlable content** — the real pages stay DOM pages; the 3D world deep-links into them. SEO intact.
- **Fallbacks** — reduced-motion / low-tier / no-JS / saveData → the current stacked DOM site + the 2D `observatory.html` "look through the lens" as the fallback for the telescope moment. The spatial layer is feature-detected + additive; it never blocks LCP or the cast form.
- **Conversion** — "Cast my chart" reachable in ≤1 step always (persistent CTA + a hotspot). Never buried.

## Reuse vs new
- **Reuse (exists):** Raycaster/picking · `flyTo`/`focusPlanet` · `startScaleJourney` (cosmos↔Earth) · scene mesh-adding · `getBodyReadout` · `captureFrame` · events `orrery-planet-focus`/`orrery-scale-change` · True-Time Earth · the 7-act scale chapters.
- **New — additive site JS (safe, no engine edit):** the spatial-nav hotspot layer, DOM quick-action panels, hybrid-nav wiring, onboarding hints, deep-link glue, all fallbacks.
- **New — OrbitLab engine work (canonical source — edits to `orrery-webgl.js` here get overwritten by sync):** the 3D observatory dome/telescope geometry; the into-observatory + through-telescope camera waypoints; clickable non-planet hotspot meshes; per-planet visual identities (some exist already).

## Phased plan — cheapest-first, each ships + is verifiable
- **Phase 0 — Foundations (additive):** first-visit onboarding hint ("drag · zoom · click a planet"); persistent hybrid nav + a floating always-visible "Cast my chart" CTA. *Verify:* appears/dismissible, PRM-safe, cast reachable.
- **Phase 1 — Actionable planets (the MVP of "navigate through the model"; mostly additive):** click a planet → a DOM quick-action panel (live sign/degree + [Cast Chart · Freeze Moment · Today's transit · Shop this sky]) that deep-links existing pages, plus fly-to. Highest value, most-validated (Grok #1), low engine risk (reuses picking + flyTo + getBodyReadout). *Verify:* click→panel+fly-to+correct links; keyboard/AT equivalent; fallback.
- **Phase 2 — Observatory waypoint + telescope portal (OrbitLab engine work):** add the dome/telescope to the scene; camera waypoints model→observatory→through-telescope→cosmos = the loop. The 2D observatory.html becomes the reduced-motion/2D fallback. *Verify:* loop closes; mobile/low-tier fallback = current site.
- **Phase 3 — Spatial nav proper (hotspots ARE the menu):** fixtures → nav destinations (telescope→The Sky, star-table→Chart, plinth→Daily, doorway→Shop…), each fly-to + deep-link, with full DOM-nav parity. This is "the whole site navigable through the model."
- **Phase 4 — Astrology depth (sequenced by the turnover research — synastry/compatibility + daily interactive first, they drive the most engagement AND conversion):** Synastry overlay · Sky Story (horoscope as a guided 3D animation) · Planet Dialogue readings · Transit Weaver. Then the rest of Grok's side features by impact.

## Risks + guardrails
- **OrbitLab-sync:** Phase 2/3 geometry + waypoints must land in OrbitLab or be overwritten.
- **Mobile perf/battery:** a heavier persistent world → device-adaptive tiers, IS_PHONE DPR clamp, the fallback path.
- **Discoverability:** onboarding hints so visitors know the world is clickable.
- **SEO/a11y:** DOM nav + content parity is mandatory, not optional.
- **Verification:** this build environment can't screenshot the WebGL (page renders hidden) — build tunable, verify structurally, owner eye-checks the feel.
- **Deploy:** the local branch is still diverged from origin/main — reconcile before shipping.

## First concrete step
**Phase 1 (actionable planets)** — additive site JS, reuses the engine's picking + fly + readout, proves the "navigate through the model" feel, and is structurally verifiable. Build it, then expand into the observatory loop (Phase 2, in OrbitLab).
