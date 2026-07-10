# Art Direction 2026 — "Base the site around the orbit"

*Specialist-panel plan, 2026-07-03 (Claude session: photoreal-engine integration). The hero now rests on the photoreal Earth (orrery-webgl, import map restored). This doc holds the APPROVED remaining roadmap so any agent can pick items up. Tokens/rules: DESIGN.md governs; hard rules at the bottom are binding.*

**2026-07-08 site merger:** Premium Moment lifestyle art (void + brass + photoreal Earth + framed mockups) is the **marketing language for the whole product**. Full phased plan: `docs/SITE-MERGER-PLAN-2026-07-08.md`. Production matrix: Imagine = lifestyle/product · engine capture = sky truth · code = personalised numbers.

## Shipped in the 2026-07-03 sessions
- Photoreal WebGL engine actually loads on the homepage (three.js import map restored — it silently failed for 100% of visitors before), rests on Earth close-up via `focusPlanet('earth')`, planet pills drive the HD engine, desktop always upgrades.
- Hero HUD: engraved seal pills (incl. new Earth seal), EARTH→COSMOS scale strip + honesty caption, Cosmic journey button, time row restored (see AGENT-HANDOFF.md for exact state).
- Copy plan applied: honesty fixes (arc-second/NASA-grade/observatory claims removed), orbit-anchored chapter leads, key-page heros, new index/horoscope meta.

## Seal iconography rollout (bespoke engraved SVGs — never unicode glyphs in UI)
Inventory: 10 planets (Earth added 2026-07-03), 12 zodiac, 8 instruments, 5 elements. No lunar-node seals yet.
- **P1** — orrery3d.js 2D fallback canvas labels (extend ap-canvas-seals.js with planet loader, or names-only).
- **P1** — horoscope.html (~27 glyphs) + horoscope-page.js (13): sun/moon summary + planet positions list → sm seals via `data-celestial-seal="planet:x"`.
- **P1** — profile.html (27) + journey.js (31): placement rows → sm seals.
- **P2** — chart wheel + share card: chart-render.js/chart-page.js canvas glyphs → seals via extended ap-canvas-seals (also upgrades the shop share engine).
- **P2** — index.html "Plate I" inline SVG: 12 zodiac + ☉☽ `<text>` glyphs → inline engraved seal paths.
- **P3** — long tail: index-full (19), sample-reading (16), ephemeris.html (12) + instrument.js (11), ecliptic-dial-data/zodiac-sphere/horoscope-wheel-poster, tonight.js, tool-cards.js, shop-commerce.js, icons.js, ap-footer-inject.js, compatibility/transits.
Sizes: sm=tables/pills · md=inline cards · lg=tool cards · xl=sign heroes. Zodiac keeps element accents; planets brass-default.

## Orbit as design language (motif backlog; S/M = effort)
1. **Orbit-arc section dividers** (S) — reusable SVG dashed brass arc + sm planet seal at perihelion; index chapters + guides.
2. **Card hover = orbital ring** (S) — elliptical hairline pseudo-element on the v571 tile hover, slow rotation, PRM-gated.
3. **Chart hero = your sky** (M) — after calc: engine to birth date, `captureFrame({scale:2})` at System preset → backdrop plate behind the wheel + share-card background.
4. **Sign pages open on the ruling planet** (M) — build-time capture library (`focusPlanet()` + `captureFrame` for all 10 planets, automate in tools/visual-check) → static webp in sign heroes via generate-sign-pages.mjs.
5. **Shop card art = engine frames** (S once #4 exists) — Earth/Saturn/inner-system captures behind seal-stamped titles.
6. **Orbit spinner/empty states** (S) — dashed ring + planet dot; reuse `ap-seal--live` breathe.
7. **Footer "tonight's system" strip** (M) — 7 sm planet seals along one arc by live ecliptic longitude (AstroEphemeris, pure DOM).
8. **Scale strip as guide scroll-progress** (M) — reuse the EARTH→COSMOS tick strip on long guides.

## Art debt (replace off-system imagery)
1. `assets/images/ecliptic-space-bg.jpg` (horoscope dial photographic nebula) → toned engine capture (Stars/System) or void gradient + cosmos.js starfield. (horoscope-critical.css `.sphere-space-bg` + preload)
2. `assets/images/zodiac-cards/*.jpg` (painterly warm sign art, also OG images) → void plate + engraved zodiac seal + ruling-planet engine portrait; keep filenames/dimensions.
3. `img/hero-cosmic-ref.jpg` (index/horoscope OG) → Earth-hero captureFrame export + brass wordmark.
4. Hardcoded warm hexes in canvas/WebGL paints (chart-render.js, instrument.js, orrery-webgl.js, tool-cards.js) → `--ap-*` token values.

## Hard rules (do-not-do)
- No stock/NASA-photo CSS backgrounds — sky imagery comes only from the engine (live or captured) or engraved SVG.
- No glyph fonts/emoji planets; seals are drawn art, never unicode-in-a-hexagon.
- Photoreal renders are "windows", seals are "instrument stamps" — never a photoreal planet inside a hex plate.
- No bloom/exposure cranking; terracotta stays CTA-only.
- Max ONE live WebGL instance per page; every other orbital visual is a captured still. PRM + CLS ≤0.05 on all new motion.
