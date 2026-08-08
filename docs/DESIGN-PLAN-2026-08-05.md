# AstroPrecise — Next-Level Design Plan

> **Author:** Kimi (Kimi CLI @ BOOK-T1H4NJ753R), 2026-08-05, as
> `astroprecise-design-plan-2026-08-05.md`. Imported into the canonical repo
> 2026-08-08 by Claude @ BOOK-T1H4NJ753R.

---

## ⚠️ STATUS BANNER — the central finding is no longer true (verified 2026-08-08)

**Phase A and M2 SHIPPED in v813.** This document's headline finding in §2 — that
the front door runs the weaker engine with wrong positions while the better engine
sits behind a click on `explore.html` — **has been fixed.**

Measured 2026-08-08 in `C:\Users\jonny\OneDrive\astroprecise`:

- `website/js/void-orrery-adapter.js` exists. Its header describes itself as
  "M2 engine unification (2026-07)" and it boots Orrery3D (`js/orrery-webgl.js`
  — bloom + grade pass, soft-disc stars, **real VSOP87**) behind the legacy
  `<void-orrery>` public surface.
- **`website/index.html` line 33 loads it:**
  `<script src="./js/void-orrery-adapter.js?v=782" defer></script>`
- So do the other five `<void-orrery>` pages: `deep-time.html` line 24,
  `eclipse.html` line 35, `natal-plate.html` line 14, `sky-card.html` line 12,
  `sky-events.html` line 12.
- The adapter's declared surface includes `setEclipse(k[,instant])` and
  `getEclipse()` — Phase A item 5, the campaign asset, is wired.
- Rollback is preserved exactly as §3 M2 specified: `?engine=legacy` injects the
  old `js/orrery.js`, which self-registers `<void-orrery>` as before. There is a
  four-rung fail-open ladder below that (canvas engine, fresh canvas, static poster).
- Live production serves **ap-v813** (`sw.js` `const V`, fetched 2026-08-08), and
  every one of 842 deployable paths is byte-identical to a local build of HEAD.

**Read §2 and §3 Phase A/M2 as history — a record of why the change was made, not
as work outstanding.** Everything else in the document (the §4 all-pages plan, the
§5 wow map, the §7 owner decisions, and the Living Sky addendum) has *not* been
superseded and still applies.

**The four owner decisions in §7 remain open.** Nobody has recorded an answer to
them. They are the live part of this document.

Two smaller notes from the same measurement:

- §6 says "full test gate (17 suites)". The real count is **19** — 13 root
  `test-*.mjs` + 5 `tools/_proof-*.mjs` + `ephemeris-package/test/smoke.test.mjs`.
- §3 M1 (point void-orrery's positions at `AstroEphemeris`) was made moot rather
  than done: M2 replaced the engine outright, and Orrery3D already carries real
  VSOP87, so the one-function indirection was never needed.

---

## 1. POSITIONING — the one-sentence strategy

Co-Star owns cold 2D minimalism. Sanctuary owns friendly illustration. The Pattern owns psychology.
**Nobody in the category has a living, touchable, astronomically-exact sky.** That is AstroPrecise's
identity: *"the only astrology product where you can grab the real sky — and check every number."*

Design implication: the 3D engine is not decoration, it IS the product. Every page should either
(a) put the living model in reach, or (b) clearly sell what the model computes. Premium craft
(NASA Eyes / award-studio level) + warm editorial clarity (never Co-Star-cold).

Design principles (ranked):

1. **Instant clarity, instant awe** — what it is + what to do in 3s; the live sky as proof.
2. **Computed, never fabricated** — honesty captions are brand equity, keep them verbatim.
3. **Warm, not terminal** — dawn-light warmth (shipped v5.1), never cold fintech dark.
4. **Phone-first frame budget** — mid-range Android is the QA bar (award-studio rule).
5. **One engine, one truth** — the strategic end-state (see §3).

---

## 2. THE HEADLINE FINDING (from the 3D audit) — ⚠️ RESOLVED IN v813, SEE BANNER

The repo already contains its own "next level":

| Engine | Tech | Where it runs (as of 2026-08-05) |
|---|---|---|
| `<void-orrery>` (orrery.js) | Three.js r128, decent bloom, **mean-longitude ephemeris (WRONG by whole degrees)** | **Live homepage hero**, deep-time, sky-card, sky-events, natal-plate |
| `Orrery3D` (orrery-webgl.js, 9.8k lines) | Modern Three.js + bloom + dither/grade finish pass + soft-disc stars + **real VSOP87** + 88k-point galaxy + **half-built eclipse mode** | Only explore.html & legacy index-full.html, only after a click |

The front door runs the *weaker* engine with *wrong* positions — while the sky-news strip on the
same page computes exact VSOP87. A user flying to Mars from a card lands on a Mars that disagrees
with the card. Fixing this is both the biggest correctness win and the biggest wow win available.

> **No longer true.** All six `<void-orrery>` pages now load
> `js/void-orrery-adapter.js`, which boots Orrery3D. See the status banner.

---

## 3. 3D ROADMAP

### Phase A — pre-eclipse quick wins on the live engine (days, low risk) — ⚠️ SHIPPED

1. **Soft-disc star shader** — port `makeStarPointsMaterial` from orrery-webgl.js (kills square stars).
2. **Delta-time loop** — motion is frame-rate-locked; 120Hz phones play 2× fast. Fix with dt scaling.
3. **Cinematic flights** — duration+easeInOutCubic for flyTo/flyScale + FOV punch mid-flight. The
   core interaction loop (clicking a sky-news card) is where visitors *feel* the product.
4. **Sun upgrade** — limb-darkened granulating disc + fresnel corona streamers (port from Orrery3D).
5. **ECLIPSE MODE** — `setEclipse(k)`: dim sunlight/exposure, moon-shadow sprite, corona emphasis.
   Wire the existing eclipse countdown card (ap-sky-news.js) + eclipse.html to drive it.
   **This is the campaign asset.** Orrery3D's uEclipse corona math is the reference.
6. Deterministic texture seeds (same Jupiter every visit), dither/grade finish pass, kill dead CDN
   fallback, pause+cache the 2D canvas engines (zodiac-sphere/natal-sphere run hot offscreen).

### Phase B — post-eclipse unification (the strategic move)

- **M1:** point void-orrery's positions at `AstroEphemeris` (VSOP87) — one function indirection.
  *(Moot — M2 replaced the engine outright; Orrery3D already carries real VSOP87.)*
- **M2 — ⚠️ SHIPPED:** promote Orrery3D to the homepage behind a byte-compatible `<void-orrery>` adapter
  (same flyTo/flyScale/setNatal/setJD/setLive APIs + same events). Deletes the duplicate engine,
  duplicate ephemeris, duplicate texture sets. Keep old engine behind `?engine=legacy` for rollback.
- M3–M5: instanced point layers + LOD fades, 2k texture set with `_sm` twins, DOM/SDF label layer.
  *(Still outstanding.)*
- **Deferred/declined by the audit:** full PBR/IBL, volumetric nebula, WebGPU rewrite — not worth it.

Perf budget guardrail (unchanged): 60fps at DPR ≤1.6 on 4-core mid phone; bloom gate stays.

---

## 4. ALL-PAGES DESIGN PLAN (68 pages → 4 systems)

*Not superseded — this section still describes work outstanding.*

### System 1 — ATLAS (46 pages: chart, horoscope, shop, tools, sign pages…)

Shared tokens + per-page layers. **Treatment: refinement, not rebuild.**

- Unify version query strings (currently mixed ?v=752–788 — cache roulette).
- Sweep dead CSS layers (≈10 orphan files: ap-motion, ap-micro-2026, index-home, shop.css…).
- Decide ap-page-bridge fate (on 29 pages, missing from 8 siblings — pick one rule).
- Give every tool hero the v5 pattern: plain eyebrow + clear H1 + 1-line sub + primary CTA
  (chart/horoscope/shop already done in v792; extend to transits, tonight, moonphase, retrograde…).
- cosmos.js starfield: batch ~1,170 arc() calls/frame into sprite blits; dedupe scroll-reveal vs effects.js.
- 12 sign pages share ONE template — retemplate once, apply to all 12.

### System 2 — SELF-CONTAINED EDITORIAL (16 pages: index, eclipse, deep-reading, sky-card, journey, cosmic-calendar, deep-time, natal-plate, why, refunds, contact, numerology…)

**Treatment: bless as the "Editorial" system, keep, harmonize.**

- These now share the warmed :root tokens (v791-793). Keep them deliberately distinct: they are
  the magazine/campaign surface; atlas is the app surface.
- sample-reading.html (70KB one-off book layout) → align to deep-reading.html's system.
- contact/refunds → migrate onto the privacy/terms legal shell for family consistency.
- numerology.html (4KB orphan hub) → fold into lifepath/name-numerology or delete with redirect.

### System 3 — LEGACY (4 pages)

**Treatment: retire.**

- index-lite.html & index-ephemeris.html: already redirect stubs — fine.
- index-classic.html & index-full.html: 301→/ (after M2 harvests anything unique from the
  index-full Orrery3D hero). Removes 180KB+ of duplicate monolith from the sitemap.
  *(M2 has now shipped, so this is unblocked.)*

### System 4 — UTILITY (5 pages): leave as-is.

### Consolidations

- **observatory.html vs explore.html** — two "look at the sky" experiences on different systems,
  neither in nav. Merge into ONE flagship "Sky Explorer" (explore.html's engine + observatory's
  lens concept) after Phase B. Until then: link only one from nav.
- **chart-view.html** (v752 tokens) → align tokens or fold into chart.html share flow.

---

## 5. PAGE-LEVEL WOW MAP (where the model should live)

- index — hero panel (now) → Orrery3D via adapter (Phase B) + eclipse mode. *(Adapter shipped.)*
- eclipse.html — drives eclipse mode; geometry SVG → replace with live model shot post-M2.
- chart.html — natal-sphere: cache static layers, add hover interactivity; keep natal markers in hero model.
- horoscope.html — zodiac-sphere: pause offscreen, prerender statics; keep sign-first flow (already good).
- deep-time/explore — the two full-screen playgrounds; deep-time keeps r128 until adapter exists.
  *(Adapter exists; deep-time.html line 24 now loads it.)*
- observatory — merge into explore (see §4).

---

## 6. 7-DAY EXECUTION SEQUENCE (→ eclipse, 12 Aug)

*Historical — this was the plan written on 5 Aug. Phase A landed.*

- **Day 1–2:** Q1 stars + Q2 delta-time + deterministic seeds (pure orrery.js, safest).
- **Day 2–3:** Q3 cinematic flights (the core interaction feel).
- **Day 3–4:** Q4 sun disc + corona.
- **Day 4–5:** Q5 **eclipse mode** + wire countdown card + eclipse.html drive. Campaign asset.
- **Day 5–6:** finish pass, offline cleanup, 2D-engine pause/caching, version-string unification start.
- **Day 6–7:** perf QA on mid-range Android, context-loss drill, precache registration, offline smoke.
- **Post-eclipse weeks 2–6:** M1 → M2 adapter → retire legacy index variants → observatory/explore merge
  → atlas refinements (bridge decision, dead CSS sweep, remaining hero patterns).

Every phase: full test gate (~~17~~ **19** suites incl. ephemeris load-order regression test) →
generate-sw-precache → push → verify live version before reporting.

---

## 7. DECISIONS NEEDED FROM JONNY — ⚠️ STILL OPEN

None of these four has been answered. They are the live part of this document.

1. **Eclipse mode concept**: subtle realistic dimming vs dramatic corona-forward spectacle? (Recommend dramatic — it's a campaign.)
2. **Legacy retirement**: OK to 301 index-classic/full to / post-eclipse?
3. **observatory vs explore**: merge to one flagship explorer? (Recommend yes.)
4. **Browser QA**: WebBridge still disconnected — pixel-level checks need it reconnected, or a
   10-minute call where you screen-share and I direct the QA clicks.

---

# ADDENDUM — CREATIVE DIRECTION "LIVING SKY" (2026-08-05, Jonny's brief)

*"Not all black and dark — planet details, colours, animations in space. Something people spend time on and come back to. Horoscopes and personal daily readings are the big thing."*

## Audience (researched, cited)

- **Daily habit is the product**: 65% of astrology-app users check daily; the daily horoscope is the most-used feature (85% of users); avg session 14 min; 68% read **at night** [bestechsols.co.uk/astrology-app-statistics-uk, Sep 2025]
- **Who**: 40% Gen Z, 62% under 35, female-skewed (43% of women 18–49 believe; male share growing to 38%) [electroiq.com/stats/astrology-app-statistics, Mar 2026]
- **Why they come**: love/career/relationship guidance; self-expression + social sharing (Gen Z); 47% link it to mental well-being — reflective routine, like journaling
- **Money**: millennials (28–40) pay most; 70% want freemium; avg £11.40/mo; natal charts + compatibility drive paid upgrades
- Co-Star went 7.5M→30M users in 3 years on exactly this loop [Oxford Brookes / churchandculture, 2025]

## Direction: the site breathes with the real sky

1. **Time-of-sky theming** (from musepool reference): page mood follows the visitor's local time — dawn amber / day lifted cerulean / dusk ember / night indigo. Subtle CSS-variable shifts on top of the atlas palette; the site you visit at 11pm is not the site at 9am. Matches the 68%-at-night behavior.
2. **Planet-true colour** (engine v6 shipped 2026-08-05): soft-disc stars, granulating limb-darkened sun + corona, deterministic planet surfaces, cinematic eased flights with FOV punch, real-time motion on 120Hz phones. Fixed a pre-existing NaN bug — asteroid belt, comet and marker cones now actually render.
3. **Ambient life, never scroll-jacked**: continuous drift/twinkle/rotation; motion you can watch, not motion you must scroll through.
4. **The Daily Ritual** (retention engine, next build): horoscope.html becomes a date-stamped personal reading — "Today, Thursday 6 August" → your sign → transit-to-natal lines → **"watch it happen"** buttons that fly the model to the transiting planet → shareable sky card. Return hook: the sky literally moved since yesterday.
5. **Shareable by default** (Gen Z): every personal reading yields an image card (sky-card/moment plumbing exists).

## Next build order (post v6)

- Q6 **Eclipse mode** (`setEclipse(k)` + countdown-card wiring) — campaign asset
  *(the adapter now declares `setEclipse(k[,instant])` / `getEclipse()`)*
- Time-of-sky theme layer (tokens + hero + eclipse page first)
- Daily Ritual horoscope rebuild (date stamp, personal transits, fly-to-watch, share card)
