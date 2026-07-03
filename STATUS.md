# STATUS — AstroPrecise · 2026-07-03 (evening)

**State:** 🌍 **PHOTOREAL ORRERY HERO LIVE-READY (ap-v575)** — the homepage now actually runs the textured 3D engine and rests on a photoreal Earth. Root cause of "planets are dots": js/orrery-webgl.js uses bare `import 'three'` but the redesigned index.html had **no import map**, so the dynamic import silently rejected for 100% of visitors → everyone got the 2D dot fallback while the page believed it upgraded. Fixed: restored the three.js import map + modulepreload in index.html head (kept in sync with index-full.html).

**Hero now:** boots WebGL on all capable devices (relaxed isCapableDevice — desktop always upgrades; old 4-core/4GB cutoff excluded capable phones+laptops), eager-boots in parallel with the ephemeris wait, and dives to the photoreal Earth close-up (`focusPlanet('earth')`, clouds+terminator+atmosphere+specular sun-glint) as the resting frame via setupHeroPhotorealFrame() in orrery-loader.js. Planet pills now drive `Orrery3D.focusPlanet` (they were wired to the destroyed lite poster).

**HUD (v575):** engraved **seal icons** replace unicode planet glyphs (bespoke — new Earth seal generated; 10 seal pills incl. Uranus/Neptune); **EARTH→COSMOS scale strip** (7 stations, drives setScaleLevel, live honesty caption "Positions live (VSOP87) · distances schematic", mobile `‹ EARTH ›` stepper); **✦ Cosmic journey** narrated scale-tour button beside Cosmic flight; time row (date/Now/scrub) restored after WebGL handoff. Feature-detected — hidden on the 2D fallback. a11y: engine now clears the canvas's decorative aria-hidden when it becomes a focusable instrument (fixed aria-hidden-focus).

**Copy (orbit-anchored + honesty):** removed every hard-rule violation site-wide — "arc-second" (→ "roughly an arcminute, 1800–2200 CE"), "same mathematics used by professional observatories" (→ "published VSOP87 planetary theory"), all "NASA-grade" abbr titles, and the daimon voice line. New hero standfirst captions the living Earth; chapter leads, chart/horoscope/guides heros, and index/horoscope meta all rebuilt around the living-sky idea. index title → "Astro Precise — The Sky, Live. Your Chart, Exact."

**QA (all green):** contract **20/20** (incl. index axe 0), expert audit **94/100, 0 issues** (a11y 100, visual 99), focused axe **0 serious** on home/chart/horoscope/guides, **npm test** all suites pass. SW **ap-v575**, 460 precache entries (+ earth.svg seal).

**Roadmap preserved:** ART-DIRECTION-2026.md holds the approved backlog (seal rollout P1–P3, orbit-as-design-language motifs, art-debt swaps like the horoscope nebula) — spawned as a background task chip. cosmic-hero.mp4 is a branded ambient clip (observatory + zodiac wheel, baked-in text), NOT a solar-system movie — the real "movie" is the engine's Cosmic journey/flight; the mp4 stays archived.

**Owner:** hard-refresh once to drop the old SW shell. The GitHub-Pages-build-flake follow-up chip still stands (each recent deploy needed a manual rebuild kick).

---

# STATUS — AstroPrecise · 2026-07-03

**State:** 🎨 **FULL SITE REDESIGN SHIPPED (ap-v574)** — orrery-centred homepage + structural consolidation + P0 masthead fix. Expert-panel redesign (3 critique agents → synthesis → implementation): the living solar model is now THE homepage — full-viewport unboxed stage, copy rail left over a readability scrim, HUD time-rail pinned to the hero's bottom edge (planet-focus pills + engine console + Cosmic flight). Chapters consolidated 12→9 (~12,700px → ~10,700px full-render desktop): trust+why merged into compare, reading merged into method, planet spheres → live chips, guide grid → teaser + new guides.html library page, shop trimmed, sign grid rebuilt (6/4/3/2 portrait tiles, element hairlines).

**P0 fixed (was LIVE for every visitor):** the masthead logomark SVG had no width/height and its sizing CSS lives in lazy-loaded ephemeris.css — every homepage visitor saw a ~1300px compass rose + unstyled nav until scroll (regression from the v567 palette hotfix, which inlined tokens but not masthead structure). Fixed via intrinsic SVG size + masthead rules in the inline critical style.

**Operational fixes:** hero never traps scrolling (touch-action pan-y; wheel-zoom requires ctrl/pinch, hero-scoped in orrery-webgl); no scroll-triggered Three.js pull; fallback wheel cross-fades only when the poster actually drew; 2D fallback engine scales to the stage (tier caps 640/760/960); chart.html accordion + sticky-CTA occlusion + terracotta CTA fixed; orphaned email-bar "x" fixed site-wide (app.js ensureStickyCtaCss); float-nav rail padding honest (108px+) with masthead exempt; guides.html sticky filter.

**QA gates (all green pre-push):** contract **20/20** (rewritten for teaser architecture, v574), expert homepage audit **96/100, 0 issues** (a11y 100, navUx 100, visual 99, mobile 98, perf 98), axe **0 serious**, user-journey v548 **0 issues**, npm test all suites. Evidence: tools/visual-check/out/{contract-eval-574,expert-audit-v574}.json, out/redesign/ before/after screenshots (untracked).

**SW:** ap-v574, 459 precache entries (guides.html added).

**Owner notes:** hard-refresh once to drop the old SW shell. Synastry lost its homepage card in the why-merge (footer link remains) — re-add somewhere if it matters. Known follow-up chips: this-weeks-sky.html invisible-text bug (main-lite body::before opaque vignette — pre-existing, live today), chart-critical.css dead warm-gold rules, main.css warm-void sticky-bar background.

---

# STATUS — AstroPrecise · 2026-07-02 (late night)

**State:** 🚑 **WHITE-HOMEPAGE HOTFIX LIVE (ap-v567)** + **NOAA feed fix (ap-v568)**. The homepage was rendering **white** (black text on transparent bg): the award palette tokens (`--void`/`--brass`/…) live only in `css/ephemeris.css`, which the homepage lazy-loads on scroll; `ap-horizon-2026.css` consumes them but never defines them, so above-the-fold every token was undefined → `background:var(--void)` = transparent = white. The v557–v562 lazy-ephemeris perf trim went live with today's deploys and exposed it. **Fix:** inlined the ~2KB `:root` palette as critical `<style>` in index.html head (+ `html,body{background:#0C1016}`) — paints on-brand from frame 1, no scroll/JS dependency. Also fixed **NOAA solar-wind feeds** (plasma-7-day/mag-7-day 404 → `propagated-solar-wind-1-hour.json`), clearing the Instrument-page console errors. Both live-verified; expert audit 100/100; full-site white-sweep clean. **Jonny: hard-refresh or unregister the SW once** to drop the cached white shell.

---

**Prior state (still current):** 🚀 **ap-v566** — **Lemon Squeezy DROPPED → PayPal direct** (owner instruction). Live site: 0 LS references, PayPal named in privacy, shop honestly dormant ("checkout opening soon") until Jonny pastes PayPal payment links (**guide: PAYPAL-SETUP.md** — steps 1–4, ~45 min). Deploy saga: v565 correctly blocked by the CI e2e gate (still asserted LS URLs); v566 fixed the gate; then GitHub Pages itself sat in status **errored** ("Deployment failed, try again later" ×2) — cleared via API rebuild (`POST /pages/builds`); also re-enabled `https_enforced` which had dropped (http:// was serving plain 200). Earlier today: ap-v564 (This Week's Sky + minified deploys + seals + SEO), ap-v563 (SEO/social + sitemap). Live: https://astroprecise.app

## PayPal migration (ap-v565, Claude)
- 17 dead LS URLs blanked in AP_MON (13 SKU fulfilUrls + deepReadingUrl/reportUrl/posterUrl/giftUrl) → every consumer CTA (chart teaser, quiz, compat upsell, daily-transit tease, data-mon) reverts to its honest dormant fallback; zero dead links anywhere
- Checkout resolver accepts PayPal payment links via fulfilUrl/paypalUrl (lemonsqueezy.com hard-ignored); `AP_MON.paypal { me, currency }` added
- **Two-step flow** (PayPal never redirects back): buy click → "pay on PayPal → send your birth details" modal → per-SKU Typeform via fulfil-redirect.html (all 13 detailsForm IDs wired) + 7-day return reminder
- Two Skies 50% promo → pre-filled discounted PayPal.Me amount link; only shows when grantable (needs paypal.me set)
- Fixed pre-existing race that silently disabled purchase tracking + the promo (APPostPurchase loads after shop-commerce; now polled)
- privacy.html Payments section names PayPal; `_headers` CSP drops *.lemonsqueezy.com; 7 planning docs bannered; commerce-urls.json blanked for rewiring
- QA: journey 0 / axe ok / contract 18/18 / npm test green; browser-verified on :8794 (clean PayPal URL opens, details modal + reminder work, 0 LS links in DOM on shop + chart)

## Shipped this session (ap-v563 → ap-v564, Claude)
- **NEW: This Week's Sky** (`this-weeks-sky.html` + `js/weekly-sky.js` + `css/weekly-sky-page.css`) — deterministic weekly sky calendar: Moon phases, sign ingresses, retrograde stations, top-5 exact major aspects; UTC-anchored weeks, ≈-labelled approximate outer-planet times (honesty rule), week switcher with `?week=` deep links. Engine cross-checked: computed Full Moon 2026-06-29 23:58 UTC vs published 23:56–23:57. **21-assertion test** (`test-weekly-sky.mjs`, incl. 2024 eclipse/equinox/Mercury-station goldens) in npm test + CI.
- **Deploy flip:** Actions workflow now runs `npm ci && npm run build` and publishes **dist/** (was raw website/). Browser-QA'd on 6 pages from the minified tree (0 errors); 458/458 SW precache URLs verified; Three.js MIT header retained (`legalComments: inline`). First deploy makes every returning client refetch the precache once (expected).
- **Glyph→seal completion (Wave-4 long tail):** transits ticker (20/20 seals, upgradeable `.ap-orb` fallback + bounded icons wait), horoscope live-planet pills (7/7 + clobber-guard in the in-place updater), rising-sign Big Three (Sun/Moon; Rising ▲ has no seal artwork — left), homepage sign library ×12 (idle-loaded `celestial-seals.js` via ap-home-bootstrap post-load, audit-path-skipped, CLS-guarded slots).
- **SEO/meta:** 9 over-budget titles → ≤60 chars; 15 descriptions → ≤160; `og:image:width/height/alt` on 40 pages (dims verified from the actual files); USD→GBP in 8 JSON-LD offers; index-classic/-full noindexed (archive variants, canonicals removed); `rel="noopener sponsored"` on all 12 JS-built commerce checkout locations; new page registered in nav (NAV_EXTRAS), sitemap (39 URLs), llms.txt, SW precache.
- **Tooling:** `generate-sw-precache.mjs` quote-bug fixed (V regex now accepts both quote styles); workflow trigger paths extended (build.mjs, package*.json, test-weekly-sky.mjs); `DESIGN.md` created (token/system reference so agents stop grepping for the palette).

## QA gates (all green pre-push)
- npm test: engine + horoscope + compat + content + art + **weekly-sky 21/21** + ephemeris-package — all pass
- Expert homepage audit **100/100 total** (v564; perf 96 within its 96–100 band), journey **0 issues**, axe **8/8 ok**, contract **18/18**
- Dist: 6-page real-browser QA zero console/page errors; 458/458 precache resolve

## Open / ongoing
- **Verify the first dist deploy** (`08127be` Actions run): live sw.js should say ap-v564 and JS should arrive minified. Rollback if needed: revert `publish_dir` to `./website` + restore `exclude_assets` in deploy-pages.yml (file paths identical both ways).
- `_headers` CSP still inert on GitHub Pages — Cloudflare Pages move remains the recommendation (Jonny decision).
- **Owner (unchanged):** GSC/Bing verification, LS checkout smoke-test, social handles, email provider URL, TWOSKIES50 in LS.

## Roadmap (deferred)
- Weekly sky column → shareable OG snapshot per week; Play Store TWA; astrocartography; on-site Stripe after any Cloudflare move. Detail: AUDIT-2026-07-02.md.

*Updated 2026-07-02 evening (Claude). Full history: AGENT-HANDOFF.md*
