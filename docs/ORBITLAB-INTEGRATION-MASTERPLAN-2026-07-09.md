# OrbitLab × AstroPrecise — Integration & Improvement Masterplan
**Date:** 2026-07-09 · **Author:** Claude (expert-team production: 4-specialist recon + 2-critic adversarial verification, ~700k tokens over both codebases; verified against the code as of ~23:00 tonight)
**Owner decision doc — Jonny's go-ahead for the galaxy/free-explore port into the website is HEREBY RECORDED (he asked 2026-07-09: "I want the 3D model incorporated in the website but also want major improvements to both"). This supersedes the OrbitLab standing order "Do not port MW free-explore stack to AstroPrecise unless Jonny asks."**

⚠️ Grok worked these exact files until 22:30 tonight (its 20:55 AP-visual sync already outran part of our recon within the same evening). **Executors must re-diff/re-md5 at each phase start rather than trust this doc's feature tables blindly.**

---

## 0. The decision (unanimous across all experts)

**OrbitLab becomes the single canonical 3D engine. The website consumes it via a one-way, manifest-driven sync into `website/js/`. The hand-copy-and-re-patch era ends.**

Why this is the right call and why it's cheap:

- The two `orrery-webgl.js` files are a true fork of one ancestor, same `window.Orrery3D` API core. **OrbitLab's copy (9,127 lines / 405KB) is almost a strict superset** — galaxy free-explore + Gaia worker stars, Solar Masterclass, instrument mode (flyToBody, velocity vectors, Kepler guides), and after tonight's Grok sync it also already has `whenEarthReady`, `__orreryPreloaderOwns`, and a *functional* `setShowAspects` (AP's is a no-op stub). AP's copy (7,368 lines) has only ~7 features OrbitLab lacks (verified list in Phase 1).
- **three.js is byte-identical on both sides** (md5 `4d8e72af…`, r160 ESM + same UnrealBloom addon set). All 56 texture files hash-identical. Six shared support modules identical today.
- **Marginal wire cost on astroprecise.app: ~+17.4KB gz for the engine swap** (13.0KB engine delta + 4.4KB for the two mandatory new imports `orbitlab-bodies.js` + `orbitlab-orbital-math.js`) **plus ~+8.1KB gz of on-demand galaxy support files** (gaia-sample.js + worker + galaxy HUD). Galaxy stars are procedural (seeded, worker-generated) — zero data download. Note: the galaxy *geometry code* is baked into the engine monolith (no dynamic-import chunk exists); "lazy" here means the support files + worker + HUD fetch on demand — extracting a true engine chunk is a Phase 5 refactor, not a Phase 1 promise.
- AP's existing poster→lite→full loader needs **zero structural changes**: the API lands as a superset and the deck feature-detects.
- Alternative architectures (engine-core split, git submodule/NPM) are the right *eventual* homes but the wrong first move — sequenced in Phase 5.

---

## 1. Owner checklist — only Jonny can do these

| # | Decision | Why it blocks |
|---|---|---|
| J1 | **Palette sign-off**: the unpushed Jet/Silver/Aurora flip (v665–v670) uses pure black `#000/#07070A` and was executed while the plan doc still said "awaiting Jonny approve". Check it on the S24 at night — your documented preference is lifted deep-navy, not pure black. Approve, tweak (lift the wells), or revert. | Everything visual stacks on whichever palette wins. |
| J2 | **Deploy approval**: live is ap-v657; local is ap-v683 (26 versions, 394 files, all *uncommitted*). After J1 + full gates, say "push". | Engine work on top of an uncommitted delta = merge chaos. |
| J3 | **PayPal fulfilUrls**: checkout dormant since ap-v565. Paste real links per `PAYPAL-SETUP.md`. | Zero revenue possible until this; POD/"wear your sky" pipeline dead-ends without it. |
| J4 | ~~Galaxy port approval~~ — **DONE, recorded above.** | Standing order in both handoffs required your explicit ask. |

---

## 2. Phase 0 — Safety & unblock (do first, ~1 session)

1. **Commit the v683 working tree to a branch IMMEDIATELY, before J1 is even decided.** The v658–v683 delta is one uncommitted 394-file blob — there are no intermediate commits, so a palette-only revert would mean hand-unpicking Grok's palette changes from interleaved structural fixes in the same files. Branch first preserves everything; J1's outcome then lands as a new commit on top.
2. **Then push to live** (after J1/J2; gates: `npm test`, visual-check suite, axe, 390px mobile audit). No force-push; deploy = push `main` → Actions Pages workflow only.
3. **`git init` OrbitLab immediately.** It has NO `.git`, the GitHub repo doesn't exist (`ls-remote` → not found), and it lives on the raw local Desktop with no OneDrive twin — a single disk failure destroys the canonical engine. Init + first commit now; push to `jonnydavx-eng/orbitlab` when convenient; update PROJECTS.md when it lands.
4. **Diff tonight's partial sync before building on it**: `OrbitLab/js/orrery-webgl.js.bak-pre-ap-visual-20260709-2055` (Jul 5 state, 7,940 lines) vs current (9,127) shows exactly what Grok's 20:55 port changed.
5. **File freeze for Phase 1**: handoff rows in both projects declare an edit lock on the engine-chain files (`orrery-webgl.js`, `orrery-loader.js`, `ap-award-orrery.js`, `explore-boot.js`, `lite-orrery.js`, `orrery-visual.css`, `sw.js`) for other agents until the Phase-1 completion row appears — Grok's autonomous waves hit exactly these files repeatedly today.

## 3. Phase 1 — Kill the fork (engine reunification)

**Goal: OrbitLab's engine becomes a verified strict superset, then lands in `website/js/` unchanged.**

1. **Port the verified AP-only feature set into OrbitLab's engine** (critic-corrected list; re-derive by diffing the two `window.Orrery3D` registration objects first):
   - `IS_PHONE` DPR ≤ 1.6 clamp (v627, AP line ~292) — **CRITICAL: without it an S24 renders at DPR 2.5 = ~2.4× fill rate.** The one omission that would visibly regress the live homepage. OrbitLab has zero `IS_PHONE` matches today.
   - **`getBodyReadout` + its internal bodyReadout/AstroEphemeris bridge** — AP-only (line ~7224); `orrery-loader.js:534` gates the homepage live geocentric readout panel on it and **fails closed**: execute a naive copy and the readout (an honesty-branding feature) silently disappears with no gate catching it. Add a loader assertion for it.
   - `buildExtraBodies` / `getExtraBodies`, trail system (`buildTrails/updateTrails/resetTrails/__trailDebug`), `getFocusedBody`, `galaxySoftDotTexture`.
   - ~~whenEarthReady / __orreryPreloaderOwns / setShowAspects~~ — **already in OrbitLab** since tonight's sync (verify behavioral parity, don't re-port; OL's `setShowAspects` is the functional one, AP's is a stub).
2. **Resolve shared-module drift both directions — after re-running the md5 sweep** (tonight's sync already made `ephemeris.js` identical again; the earlier `normalizeHouseSystem` gap is closed). As of ~23:00: AP→OL: `chart-render.js`, `zodiac-sphere.js`, `orrery3d.js`. OL→AP: `cosmos.js`, `lightcone.js`, `scale-journey.js` + chapters. OL-only additions to AP: `masterclass.js` + `masterclass-chapters.js`.
3. **Copy the engine file set into `website/js/`**: `orrery-webgl.js`, **`orbitlab-bodies.js`, `orbitlab-orbital-math.js`** (engine imports them at lines 28/37 — copy without these = instant ESM resolution failure), `gaia-sample.js`, `workers/gaia-sample-worker.js`, `orbitlab-galaxy-hud.js` + css. **Exclude** `.bak-*` files and the 12MB `orbitlab-instrument-4k.png`.
4. **One Three stack law** (binding, `docs/REGRESSION-ANALYSIS-2026-07-09.md:184`: "One Three instance per page. Import map or UMD, never both." — the v658–v664 dual-Three layer scored live pages 0 and forced a full restore): everything goes through the existing ESM importmap. Retire AP's dead-weight `js/vendor/three.min.js` + `orrery-cinematic.js` (verified: referenced by no HTML page).
5. **All FOUR engine pages, not two**: `index.html`, `index-full.html` (third copy of the importmap — the "keep in sync" comments form a trio), `index-classic.html` (**currently broken-by-design: injects orrery-loader with NO importmap, so it silently 2D-fallbacks forever — decide: add importmap, accept, or retire the page**), `explore.html`. The `?v=` sweep must cover all four **plus `lite-orrery.js:1012`**, which modulepreloads *unversioned* `orrery-webgl.js` while the loader imports `?v=683` — a mismatched double fetch today.
6. **Deploy chain in strict order** (stale-engine class v453–v463): engine files → loader wiring → **run `tools/generate-sw-precache.mjs` and decide `JS_EXCLUDE` for the new engine-only files** (default behavior would precache `orbitlab-bodies.js` etc. on every first visit — deps of a module that is itself deliberately NOT precached) → **`?v=` bumps LAST across the whole chain** (fix today's inconsistencies: `ap-award-orrery.js:78` injects `?v=643`, `explore-boot.js:90` injects `?v=578`, engine at `?v=683`) → `sw.js` V bump **+ add `/js/orrery-webgl.js` to the isCritical network-first regex** (verified cache-first today, sw.js:584/615) → 390px Playwright audit + hero boot-FSM check → push.
7. **Rollback path, written down BEFORE the swap** (CI has zero engine coverage — none of the deploy gates reference Orrery3D, so a *regressed* engine sails through): keep the v657 engine on disk as `orrery-webgl-v657.js` so rollback is a one-line module-path flip in `orrery-loader.js` + `?v=`/SW bump; and add a minimal engine boot/import smoke test to the Actions workflow.
8. **OrbitLab's own SW too**: Phases 1.1/1.2 change files precached by `OrbitLab/sw.js` (`orbitlab-v14-galaxy-ship`) — bump its CACHE name and SHELL list, or all :8792 verification and the Phase-3 FPS measurements run against stale files.
9. **Build the guardrail**: `OrbitLab/scripts/sync-to-astroprecise.mjs` + `ENGINE-SYNC.md` manifest & hash ledger. Requirements: `--dry-run` mode; vitest coverage for the manifest/ledger logic (OrbitLab already runs vitest); refuses to run if AP-side files changed since last sync; **a drift detector runnable in AP's `npm test`** (website engine files still match ledger hashes); header comment `// GENERATED — edit in OrbitLab` in downstream copies; both AGENT-HANDOFF.md files updated so no agent hand-edits `website/js/orrery-webgl.js` again.

**Gates:** OrbitLab `npm test` (18 vitest) + `npm run validate` + `npm run smoke` (incl. SMOKE GALAXY) before sync; AP `npm test` + visual-check + `hero-structure-audit.mjs` + 390px audit after.

## 4. Phase 2 — Light the model up in the product

Ranked by conversion value, all gated behind Phase 1:

1. **Personal Sky beat** — *the flagship*. After hero form submit (and on chart.html reveal), the orrery flies to the user's exact birth moment: 2–3s camera move, caption "This was your sky — computed to the arcminute", then hands off to the chart. Verified available: `setDate`/`jumpTo`/`goTo` (AP engine 6223/6231/7214), saved profile in localStorage (`ap_profile_v2`/`ap_charts`). **Nothing on the site ever shows the user THEIR sky in 3D today — the brand promise unrealized.** Post-submit only: zero risk to the form-first structure.
2. **Birth-keyed capture → Moment/share/POD bridge** — expose `captureFrame(opts)` (verified, AP engine 7331, + enterPortrait/exitPortrait) as "Capture this sky"; feed `ap-moment-share.js`/export suite as the watermarked share card and print-ready "wear your sky" asset → shop. **Most-cited open item across five expert docs** and the missing print engine for the POD model. Replace Moment's hardcoded static `img/engine/earth.webp` (ap-moment-share.js:120) with the user's actual frame.
3. **explore.html = the OrbitLab showcase**: Solar Masterclass (7 chapters verified, honesty captions already written) wired to the existing "Cosmic journey" button (explore.html:234); galaxy free-explore enabled at scale ≥ 5 with support files (worker + gaia-sample + HUD) fetched on demand, tier budgets (5k/12k/24k stars), static spiral as the low-tier fallback. Homepage hero stays lean. **Ship the SEO update in the same change**: explore.html's JSON-LD (line 36), title/meta, and sitemap.xml lastmod must describe the new content — the deploy workflow auto-pings IndexNow, so crawlers get invited immediately.
4. **Zodiac sphere on horoscope + 12 sign pages** — verified pure canvas (zero Three imports; `getContext('2d')`), so no one-Three-law conflict. Gives 13 daily-traffic SEO pages a live element + "see the full model" link to explore. Sign pages ONLY via `tools/generate-sign-pages.mjs` (v579 drift incident).
5. **Honesty rule survives the port**: Masterclass "decorative deep-field · not a measured sky survey" captions and the "Gaia-style schematic" galaxy label are non-negotiable brand.

## 5. Phase 3 — Major improvements (both projects, parallelizable)

**AstroPrecise:**
- Hero hardening pack (`cortex/wiki/hero-orrery-improvements-2026-07-08.md` items 1–4): hero CSS into one @layer, ResizeObserver deck bay, boot-FSM Playwright assertions, visual baseline — **do this before or alongside Phase 1**; it instruments the most regression-prone surface.
- Perf pack (all S/M): tier-aware `precompileAllScales` (desktop/idle only; mobile levels [0,2] deferred; low skip) · SW precache trims to `_sm` textures only (saves ~2.6MB first mobile visit) · modulepreload three.js only when tier predicts mid/high (saves 165KB where it hurts most) · 1024px `_md` texture rung for high-tier phones.
- **Ephemeris worker port — a wiring job, not a copy job**: port `ephemeris-bridge.js` (Promise facade with sync fallback) + `workers/ephemeris-worker.js` together, convert the synchronous `AstroEphemeris` call sites in chart-page.js/instrument.js to async, add both files to the sync manifest + AP precache, and sequence AFTER Phase 1.2 so the worker wraps the winning ephemeris.
- Content/funnel: sign-page magazine-language pass, personalised DailyTransit primary on horoscope + Today|Week tabs.
- Infra: Cloudflare Pages migration (~1 evening; activates the inert `_headers` CSP; prerequisite for on-site Stripe).
- Design: outer-planet cinema / award-reel motion (combine with OrbitLab's tour-camera craft); seal rollout P1/P2 re-scoped to the winning palette.

**OrbitLab:**
- **Pay the measurement debt**: the galaxy ship's "FPS ≥ 45 desktop" acceptance criterion was never measured (probe inconclusive). Record real numbers: desktop + mid-GPU + S24-over-Tailscale (100.125.139.73). Treat all self-graded scores (~89–91, AP ~8.5) as directional until externally re-scored.
- Fix the 18-script sequential boot waterfall (parallel fetch, ordered exec) — several hundred ms of first-interactive. **Do not port the waterfall to the website.**
- Update stale STATUS.md line (TS defs / Vitest / ephemeris worker shipped 07-04).
- a11y Phase-1 leftovers (ARIA/screen-reader), responsive canvas sizing.
- `orbitlab.dev` hosting + NPM publish — after the git repo exists; the sync manifest becomes the package `files` list; update PROJECTS.md/atlas when hosting lands.

## 6. Phase 4 — Revenue chain (gated on J3)

fulfilUrls paste (owner) → Moment Pack multi-format PDF pipeline (SITE-MERGER #14) → physical POD / "Two Moments" (#16) with the Phase-2.2 birth-keyed capture as the design source. Agents can prep the PDF pipeline in parallel; **no fake checkout UI while dormant** (honesty rule).

## 7. Phase 5 — Long-term (explicitly deferred)

True galaxy code-splitting out of the engine monolith + `js/engine/` core-split with `registerFeature()` plugins (only after ≥2 clean sync cycles) · git submodule/NPM as the consumption mechanism · Gaia DR3 ingest / WebGPU (new scoped project per OrbitLab STATUS) · transit push alerts + astrocartography (seeded by OrbitLab engine work).

---

## 8. Team assignment (three agents + boss)

| Role | Agent | Work |
|---|---|---|
| **Engine integrator** | Claude | Phase 1 end-to-end (superset merge, sync script, deploy chain, rollback), Phase 3 perf pack |
| **Product surfaces** | Grok | Phase 2 (Personal Sky, capture bridge, explore showcase + SEO, zodiac sphere pages) — it owns the v6xx design waves and the form-first structure |
| **QA / measurement** | Hermes (or either) | FPS numbers, 390px audits, visual baselines, external re-scores after each phase |
| **Owner** | Jonny | J1–J3; palette check on the S24 at night |

Coordination rules: base all work on the committed v683 branch; append AGENT-HANDOFF rows; `after_project_edit.ps1` **for BOTH projects** (`-Project "Astro Precise"` / `-Project "OrbitLab"`) after served-page edits; hard-refresh + SW unregister before trusting any visual report; honor the Phase-1 file freeze; never edit `website/js/orrery-webgl.js` directly once the sync ships; keep PROJECTS.md/atlas current when the repo/hosting lands.

## 9. Binding laws (from the regression record — violations have each broken production once)

1. **One Three instance per page** (v658–v664 catastrophe; REGRESSION-ANALYSIS:184).
2. **IS_PHONE DPR clamp ships in any engine that reaches the website** (v627).
3. **`?v=` bumps LAST, sw V every deploy, engine in isCritical, precache only via `generate-sw-precache.mjs`** (v453–v463 class).
4. **Whole-file engine copies without the superset merge silently delete features in one direction (fail-closed loader hides the loss — e.g. the readout panel) or crash on missing `orbitlab-bodies.js` imports in the other.**
5. **Deck height changes only on the orrery-full turn; masthead CSS is critical-path** (v574, v640–v643).
6. **Sign pages only via the generator** (v579).
7. **No fabricated data, prices, or checkout states; honesty captions survive every port.**

## 10. Sources

Expert recon: workflow `wf_3701ee9b-764` (4 agents — engine architect, product strategist, perf/mobile, backlog auditor). Adversarial verification: workflow `wf_df3121f7-ee9` (feasibility skeptic — verdict *sound-with-fixes*, all load-bearing claims spot-checked against code; completeness critic — 10 execution gaps, all folded in above). Key inputs: `OrbitLab/docs/EXPERT-GALAXY-SCORECARD-UPGRADE-PLAN-2026-07-09.md`, `OrbitLab/docs/GALAXY-SHIP-COMPLETE-2026-07-09.md`, `docs/EXPERT-BUG-SCREENSHOT-AUDIT-2026-07-09.md`, `docs/REGRESSION-ANALYSIS-2026-07-09.md`, `docs/DESIGN-SCORECARD-2026-07-09.md`, `docs/SITE-MERGER-PLAN-2026-07-08.md`, `AUDIT-2026-07-02.md` (repo root), `cortex/wiki/hero-orrery-improvements-2026-07-08.md`, both AGENT-HANDOFF.md files.
