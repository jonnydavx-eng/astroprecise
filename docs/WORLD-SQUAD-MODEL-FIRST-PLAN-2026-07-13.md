# World Squad · Model-First Program — AstroPrecise

**Date:** 2026-07-13  
**Owner:** Jonny · **Agent steward:** Grok (project-first, STATUS-aligned)  
**Budget posture:** **Unlimited for craft** — spend is gated only by **performance budgets** and **honesty law**, not by “cheap enough.”  
**Product law:** The **3D model is the product**. The site is built **out from the model**, never the reverse.  
**Non-goals this doc avoids:** re-litigating ap-v721 ship; OrbitLab free-explore unless owner re-asks mid-program.

**Related:**  
`docs/UPGRADE-REFINE-PLAN-2026-07-13.md` (stabilize spine first) · `docs/MODEL-SURFACE-CONTRACT.md` · `docs/REGRESSION-AUDIT-2026-07-13.md` · `STATUS.md`

---

## 1. Why a permanent squad (not a one-off agency)

AstroPrecise is not a brochure with a spinning ball. It is a **private mountain observatory on the web**: VSOP87-truthful sky, Personal Sky Moment spine, single WebGL Surface C, Jet·Silver·Aurora craft.

That needs a **standing unit** that:

1. Speaks **astronomy visualization** and **astrology product** without conflating them.  
2. Ships **cinematic WebGL** under **mobile FPS budgets**.  
3. Respects **OrbitLab as engine SoT** and AP as product shell.  
4. Survives agent handoffs (Grok / Claude / Hermes) via **written doctrine**.

This document defines **who**, **why each seat**, **rules to keep them**, **training courses before build**, and **model-first phases**.

---

## 2. Permanent rules — “keep this team”

Copy into contracts, AGENTS, and kickoff decks. Non-negotiable.

### 2.1 Charter name

**Squad name:** **Observatory Core** (internal)  
**Public credit (optional later):** “Engineered for the living sky — AstroPrecise Observatory Core”

### 2.2 Seat permanence

| Rule | Detail |
|------|--------|
| **Seats are roles, not vibes** | Each hire/retainer maps to a seat ID (S1–S12). Replace people; **never delete seats** without owner vote. |
| **Two-year retainers preferred** | Cinematic WebGL + astronomy craft compounds; churn kills the look. |
| **No seat owns honesty alone** | S5 (science viz) + S7 (astrology product) + S8 (engine lead) **must all sign** LIVE labels and “aspect” wording. |
| **Model first veto** | S3 (cinematic CD) + S8 (engine) can **block** site chrome that covers the disc or dual-WebGL. |
| **Perf is a product feature** | S4 (perf) can **block ship** if budgets fail on S24 / mid Android / M1 Safari. Unlimited budget ≠ unlimited draw calls. |
| **OrbitLab law** | Engine geometry/True-Time/shaders: edit **OrbitLab**, sync to AP. AP agents do not hand-edit GENERATED `orrery-webgl.js`. |
| **Single IA / single primary bar** | S6 (product) owns nav model; no second invented primary. |
| **Training before tickets** | No one lands code on Track Model until **Training Gate** is green (Section 4). |
| **Weekly model review** | 90 min: only the canvas (home + explore). Site pages deferred until model score ≥ target. |
| **Credit & continuity** | Handoff row after every model ship; STATUS tip; freeze block if deploy state changes. |

### 2.3 Performance budgets (hard — even with unlimited money)

| Tier | Device class | Target |
|------|----------------|--------|
| **A** | Desktop fine pointer, discrete GPU | 60 fps steady, home hero, orrery-full |
| **B** | Mid laptop / iPhone 13-class | ≥45 fps, no thermal death in 3 min idle breathe |
| **C** | Android mid / IS_PHONE path | ≥30 fps, DPR cap ≤1.6, reduced bloom / particles |
| **Fail** | Any tier | Blank canvas, dual Three, LIVE on poster |

**Budgets before beauty:** triangle budget, texture memory, post-process stack, concurrent lights, starfield count, idle RAF cost.

### 2.4 Honesty budgets (hard)

- LIVE only after HD WebGL owns the canvas (`orrery-full` + real ready).  
- Surface A stills never claim LIVE.  
- No fake checkout / fake precision.  
- Helio alignments must not be labeled natal “aspects” without copy review (S7).

### 2.5 Working cadence

```
Week 0–2   Training Gate (all seats + agent stewards)
Week 2–N   MODEL PHASE only (home + explore canvas)
Gate M     Model scorecard signed (S3,S4,S5,S8, owner)
Then       SITE PHASE radial from model (emitters, IA, shop, signs…)
```

---

## 3. The squad — specific seats & research

**Important:** Named people/studios are **recruitment targets / inspirational anchors** based on public work. Availability is unknown; each seat has **primary targets** and **acceptable alternates**. Do not claim anyone is hired until contracts are signed.

### S1 — Vision / Owner (permanent)

| | |
|--|--|
| **Seat** | Product owner, taste final say, budget, “museum plate vs aurora CTA” |
| **Who** | **Jonny** |
| **Why** | Only person who can choose brass-home exception, OrbitLab free-explore, checkout URLs, phone pass |
| **Keeps team** | Attends model review weekly; does not skip Training Gate for new hires |

---

### S2 — Agent Orchestration / Repo Law (permanent on this machine)

| | |
|--|--|
| **Seat** | PROJECT-FIRST, STATUS, handoff freeze, deploy discipline, test gates |
| **Who** | **Grok + Claude + Hermes** under `AGENTS.md` / control-panel atlas |
| **Why** | Multi-agent loss happens when paths fork; this seat prevents dual repos and OneDrive disasters |
| **Doctrine** | Canonical `C:\Users\jonny\OneDrive\astroprecise` · tip = `sw.js` + STATUS · never force-push |

---

### S3 — Cinematic Creative Direction (Web experience)

| | |
|--|--|
| **Primary targets** | **Active Theory** (US/global; co-founders incl. **Andy Thelander**) — industry reference for *story + art + tech in one team*, award-winning WebGL brands, performance-aware toolsets. Public: [activetheory.net](https://activetheory.net/) |
| **Alternates** | **Immersive Garden** (Paris) — calm premium luxury 3D restraint ([immersive-g.com](https://immersive-g.com/)); **Lusion** (UK) — buttery 3D brand storytelling ([lusion.co](https://lusion.co/)); **MDX / cinematic boutique** for smaller retainer |
| **Why this seat** | “Looks like a movie” without becoming unusable scroll-theatre. They know **camera language**, scene rhythm, and when **not** to add particles |
| **AP fit** | Home reveal dolly, rest frame, explore as free-camera room, model window “instrument under glass” |

---

### S4 — Real-time WebGL / Performance Engineering

| | |
|--|--|
| **Primary targets** | **Utsubo** (Japan) — public emphasis on **WebGPU/WebGL with performance budgets from day one** ([utsubo.com](https://www.utsubo.com/)); senior Three.js engineers from **Lusion labs** (R&D culture) |
| **Named craft mentors (course / advisory)** | **Bruno Simon** (France) — ex-lead Immersive Garden; author **Three.js Journey**; portfolio is a living 3D world ([bruno-simon.com](https://bruno-simon.com/), [threejs-journey.com](https://threejs-journey.com/)) |
| **Platform SoT** | **Ricardo Cabello (mr.doob)** — creator of **Three.js**; use as **library/ecosystem** reference (not day-to-day hire); track Three.js + TSL/WebGPU direction ([ricardocabello.com](https://ricardocabello.com/), threejs.org) |
| **Why** | Unlimited budget still loses users if phone thermal-throttles. Need **tiering**, DPR caps, network-first SW, one renderer |
| **AP fit** | `IS_PHONE`, handoff lite→WebGL, SW ignoreSearch, bust alignment 703→tip, no dual Three |

---

### S5 — Scientific Sky Visualization (truth of the sky)

| | |
|--|--|
| **Primary anchors** | **Kevin Hussey** & NASA/JPL **Eyes** Visualization Technology Applications team — *Eyes on the Solar System* is the gold standard of **public, data-driven solar system navigation** (Hussey: former Disney Animation tech manager; JPL viz lead). Product: [eyes.nasa.gov](https://eyes.nasa.gov/) |
| **Secondary anchors** | **Mark SubbaRao** — leads NASA **Scientific Visualization Studio**; previously Adler Planetarium; IPS president; **Data to Dome** initiative — bridges **big data → public dome**. Bio: NASA GSFC / SVS |
| **Institutional partners (optional)** | **Sky-Skan** — planetarium systems, star fields, mission vignettes ([skyskan.com](https://skyskan.com/)); Adler / IPS community for critique sessions |
| **Why** | Movie look without lying about positions, time, or scale. They think in **ephemeris, scale ladders, and public understanding** |
| **AP fit** | True-Time Earth, scale 0–5 honesty, Gaia schematic vs decorative cosmos, LIVE labels |

---

### S6 — Product / Interaction Design (observatory UX)

| | |
|--|--|
| **Primary profile** | Lead product designer with **museum / science center digital** + **premium instrument UI** (not generic SaaS) |
| **Studio anchors** | Design leads who have shipped **instrument-first** sites (Immersive Garden editorial restraint; Active Theory mobile-first immersion) |
| **Why** | Model-first means **controls never cover the disc**, cast always reachable, explore cockpit collapsed, deep-link doorways with real hit targets |
| **AP fit** | `ap-nav-model`, plinth tray, planet-actions click-only, Personal Sky CTA spine |

---

### S7 — Astrology Product & Symbol Craft (not “mystic fluff”)

| | |
|--|--|
| **Primary public anchors** | **Chris Brennan** — Hellenistic tradition, *The Astrology Podcast*, technical literacy about **what charts actually claim** (keeps product honest vs entertainment spam) |
| **Complement** | Traditional chart-craft consultant (e.g. **Deborah Houlding**–class traditional technique expertise) *or* a working professional who uses **whole-sign / VSOP-grade tools** and can critique copy |
| **Anti-hire** | Pure “AI horoscope content farms” with no technical chart literacy |
| **Why** | Personal Sky Moment is emotional **because** the sky is real. S7 prevents fake precision and cheap shop language |
| **AP fit** | Chart wheel doorway meaning, moment freeze language, deep reading product ethics, sign page honesty subtitles |

---

### S8 — Engine Lead (OrbitLab ↔ AP)

| | |
|--|--|
| **Who** | **Owner of OrbitLab** (canonical `orrery-webgl` + bodies + orbital math) + one senior AP integrator |
| **Why** | AP file is **GENERATED**. Without this seat, “movie upgrades” get wiped on sync or fork forever |
| **Law** | All shader/camera/body work in OrbitLab → `sync-to-astroprecise` → AP `?v=` + SW tip |

---

### S9 — Camera / Lighting / Look-Dev (cinematic CG for realtime)

| | |
|--|--|
| **Profile** | Real-time look-dev artist (games or high-end web) — **IBL, terminator lighting, filmic tone map, restrained bloom** |
| **Inspiration** | NASA Eyes natural lighting modes; planetarium starfield craft; not Fortnite neon |
| **Why** | “Movie” is mostly **light + lens + grade**, not more geometry |
| **AP fit** | Earth rest frame, nightside cities restraint, Sun glare honesty, explore free-look |

---

### S10 — Sound / Haptics / Presence (optional but high “film”)

| | |
|--|--|
| **Profile** | Interactive sound designer (subtle ambiences, not stock spa music) |
| **Why** | Film-grade presence with almost zero FPS cost if streamed/lazy |
| **AP fit** | Soft enter observatory, PRM silence, optional haptic on planet focus (mobile) |

---

### S11 — Accessibility & Inclusive Observing

| | |
|--|--|
| **Profile** | A11y specialist (WCAG, reduced motion, keyboard 3D alternatives) |
| **Why** | Unlimited budget that excludes disabled users is a failure |
| **AP fit** | Modal traps, 44px targets, PRM snaps, non-WebGL fail plates |

---

### S12 — QA / Device Lab / Release

| | |
|--|--|
| **Profile** | QA with real device matrix (S24, mid Android, iPhone, Safari, low RAM) |
| **Why** | Playwright SwiftShader ≠ human phone |
| **AP fit** | Focus-after-settle tests, SW tip, `test:ui` hard gates, owner eye-check scripts |

---

### Squad map (one glance)

```
                 S1 Owner
                    │
     ┌──────────────┼──────────────┐
     │              │              │
    S3 CD         S5 Science      S7 Astrology
     │              │              │
     └──────┬───────┴──────┬───────┘
            │              │
           S9 Look-dev    S8 OrbitLab engine
            │              │
           S4 Perf WebGL ──┘
            │
     S6 Product UX · S10 Sound · S11 A11y · S12 QA
            │
           S2 Agents / repo law
```

**Core six for Phase Model:** S1, S3, S4, S5, S8, S9 (+ S2 always).

---

## 4. Training Gate — courses *on the site* and *on the task*

Nobody codes model upgrades until this is signed. **Unlimited budget applies here:** paid courses, paid workshops, travel to planetariums if useful.

### 4.1 Shared orientation (all seats · ~1–2 days)

| Module | Content | Pass criteria |
|--------|---------|----------------|
| **O1 · Canon walk** | Live https://astroprecise.app hard-refresh SW tip; localhost :8790 + `?nosw=1` | Can state tip version + how SW lies |
| **O2 · Contract law** | `docs/MODEL-SURFACE-CONTRACT.md` Surfaces A/B/C | Quiz: when is LIVE allowed? |
| **O3 · Spine** | Personal Sky: cast → explore `#m=` → doorway → freeze → return | Manual path once on phone |
| **O4 · Repo law** | PROJECT-FIRST, OrbitLab GENERATED, never force-push, honesty | Sign AGENTS.md |
| **O5 · Known P0s** | `REGRESSION-AUDIT` focus clobber, 703 bust, index SW | Can name 3 P0s |

**Deliverable:** `docs/training/ORIENTATION-CHECKLIST.md` signed per person.

### 4.2 Role-specific courses (paid / public)

| Seat | Course / immersion | Why |
|------|-------------------|-----|
| **S3, S4, S9, S8** | **Three.js Journey** (Bruno Simon) — full track, especially materials, postprocessing, performance, camera | Shared vocabulary for WebGL craft; industry standard training |
| **S4, S8** | Three.js docs + **WebGPU/TSL** survey (mr.doob / three.js wiki direction) | Future-proof without premature rewrite |
| **S4** | Web performance (web.dev Core Web Vitals + mobile GPU articles); optional workshop with perf studio (Utsubo-style budget workshops if retained) | Budget culture |
| **S5** | Hands-on **NASA Eyes on the Solar System** mastery (time scrub, scale, lighting modes, labels) | Reference UX for “true sky navigation” |
| **S5** | Planetarium visit or **Data to Dome** / IPS reading pack; Sky-Skan showreel study | Dome language → web stage |
| **S7** | Selected **Hellenistic / traditional technique** modules (Brennan podcast episodes on chart structure, houses, planetary condition — not content spam) | Language of real craft |
| **S6, S11** | Inclusive design + reduced-motion patterns; study AP `ap-planet-actions` click-only law | UX without covering disc |
| **S12** | Playwright harness on this repo: `_diag-click`, `_wave2-deeplink`, future focus-settle gate | How we prove truth |
| **All creative** | Competitive lab: **Eyes**, **Stellarium Web**, top Awwwards Three.js sites, AP live side-by-side score sheet | Shared taste |

### 4.3 Site-specific lab (mandatory · ~3–5 days)

Built **on AstroPrecise itself** — not abstract demos.

| Lab | Task | Output |
|-----|------|--------|
| **L1 · Boot timeline** | Instrument home boot: lite → handoff → orrery-full → LIVE | Annotated timeline diagram |
| **L2 · Focus clobber** | Reproduce explore `#m=&focus=mars` vs auto-Earth @1.1s | Bug write-up (links to Track A) |
| **L3 · Scale ladder** | Map beats vs `setScaleLevel`; note sticky absence | Truth vs claim note |
| **L4 · Honesty** | Find one place LIVE could lie (cosmic-flight) | Patch proposal |
| **L5 · OrbitLab sync dry-run** | Read ENGINE-SYNC; hash GENERATED files | “Where do I edit?” one-pager |
| **L6 · Phone pass** | S24 or mid Android: idle 3 min + drag + focus | FPS + thermal notes |
| **L7 · Emitter map** | Chart CTA, doorway, moment, horoscope, weekly | Link inventory spreadsheet |

**Pass:** Labs L1–L7 complete for S3,S4,S5,S8,S9; abbreviated O1–O5 + L1,L6 for others.

### 4.4 Training Gate certificate

```text
OBSERVATORY CORE — TRAINING GATE
Name / Seat: ________
Date: ________
Orientation O1–O5: ☐
Role courses: ☐
Labs: ☐
I will not ship dual WebGL, LIVE-on-poster, or hand-edit GENERATED engine.
Signed: ________
Owner countersign: ________
```

Store under `docs/training/signed/` (gitignored if personal).

---

## 5. Task definition — model first, then site

### 5.1 North star (one sentence)

**Make the living 3D sky feel like a film-grade private observatory instrument that still loads fast, tells the truth, and carries the whole product.**

### 5.2 Phase 0 — Stabilize (must precede movie work)

From `UPGRADE-REFINE-PLAN` Track A — **do not skip**:

1. Fix explore/home **auto-Earth clobber**  
2. Index **SW localhost / nosw**  
3. Unify orrery **`?v=` bust** → tip **ap-v722**  
4. Hard tests for focus settle  

*Movie work on a lying spine wastes unlimited budget.*

### 5.3 Phase M — Model masterpiece (primary task)

**Scope locked to:** `index.html` + `explore.html` WebGL Surface C + OrbitLab engine + loaders/CSS that **only** serve the model window.  
**Out of scope until Gate M:** shop redesign, sign regen waves, new marketing pages, OrbitLab free galaxy unless owner opens D.

#### M1 · Look-dev bible (1 week)

| Deliverable | Owner seats |
|-------------|-------------|
| Reference board: Eyes / planetarium / film stills vs AP screenshots | S3, S9, S5 |
| Lighting modes: natural / soft observatory / PRM static | S9, S4 |
| Camera grammar: rest frame, reveal dolly, free explore, focus ease | S3, S8 |
| Material & palette map: Jet void, silver rims, aurora only as LIVE/CTA, sun glint rare | S3, S9 |
| Perf budget table per tier | S4 |

#### M2 · Engine truth layer (OrbitLab)

| Work | Notes |
|------|--------|
| True-Time Earth polish (GMST, limb, nightside restraint) | S8 + S5 review |
| Body materials upgrade (Earth/Moon/Sun first — 90% of emotional time) | S9, S4 LOD |
| Starfield / magnitude cuts honest | S5 |
| Pick spheres + cursor + single-click policy (focus vs panel) | S6, S8 |
| No dual Three; canvas fallback path documented | S4 |

#### M3 · Cinematic host (AP shell around engine)

| Work | Notes |
|------|--------|
| Handoff film: poster → HD without PE dead zone | S4, S8 |
| Reveal moment (dolly **or** curtain — one hero beat) | S3 |
| Model Window plate: SETTLING / LIVE / UNAVAILABLE | S5, S11 |
| Explore: free camera room; deep-link focus **holds** | S8, S12 |
| Sound beds optional, lazy, PRM-off | S10 |

#### M4 · Scale as story (only if sticky works or claim honesty)

| Work | Notes |
|------|--------|
| Beat order earth→today→system→galaxy | S6 |
| Sticky pin **or** explicit non-sticky product decision | S3, S1 |
| Labels: schematic vs LIVE scale | S5 |

#### Gate M — Model scorecard (ship block)

| Criterion | Pass |
|-----------|------|
| Film still test | Owner + S3: “this could be a trailer frame” at rest Earth |
| Truth test | S5: positions/time/labels honest |
| Perf test | S4+S12: budgets A/B/C |
| Spine test | S12: focus=mars holds 2s+ after load |
| Phone test | S1: 5 min usable on personal phone |
| Sync test | S8: OrbitLab ledger clean |

**Only then open Phase S.**

### 5.4 Phase S — Site built *out from* the model

Radial expansion — each page must **point at or reuse** Surface C grammar.

| Ring | Surfaces | Rule |
|------|----------|------|
| **S0** | Home, Explore | Already model |
| **S1** | Chart, Moment, Horoscope | Emitters + doorway + return — Personal Sky closed |
| **S2** | Ephemeris, weekly sky, moonphase | Deep links only; no second WebGL |
| **S3** | Sign pages | Generator-backed model links; no hand-edit 12 HTML |
| **S4** | Shop, My Sky, marketing | Model stills schematic; checkout dormant until URLs |
| **S5** | Observatory threshold | Surface B invite only |

**IA rule:** every major journey starts or ends at the model.

### 5.5 Phase E — Elevate (owner-gated)

- OrbitLab free-explore / galaxy  
- Spatial Phase 2 dome  
- Commerce live  
- Full warm-hex purge  

---

## 6. First 30 days (concrete)

| Days | Focus |
|------|--------|
| **1–3** | Track A stabilize (P0 focus + SW + bust) → ap-v722 |
| **3–14** | Training Gate O + L labs for Core Six; enroll Three.js Journey for S4/S8/S9 |
| **7–14** | Recruit/retain outreach: Active Theory *or* Immersive Garden CD retainer; Utsubo/Lusion-class perf; science viz advisor (Eyes/Adler alumni network) |
| **14–21** | M1 look-dev bible + Eyes competitive lab |
| **21–45** | M2–M3 engine + host (OrbitLab → sync → AP tip) |
| **45** | Gate M review with owner phone pass |
| **45+** | Phase S rings S1→S3 |

---

## 7. Budget categories (unlimited craft, structured spend)

| Bucket | Examples |
|--------|----------|
| **People** | 2-year retainers S3–S5, S8–S9; fractional S7, S10, S11 |
| **Training** | Three.js Journey seats, planetarium tickets, Eyes workshops, travel |
| **Device lab** | S24, mid Android, iPhone, MacBook, Windows laptop |
| **Capture** | High-end screen capture, true-device video for reviews |
| **Not spent blindly** | Random particle packs, dual Three, unbudgeted post stacks, hand-editing GENERATED engine |

---

## 8. Success metrics

| Metric | Target |
|--------|--------|
| Model “trailer frame” | Owner yes |
| Focus deep-link reliability | 100% in automated settle test |
| Mobile C tier | ≥30 fps idle+drag |
| LCP / boot | No regression vs ap-v721 baseline (measure after A) |
| Honesty incidents | Zero LIVE-on-stills |
| Team continuity | Core seats filled ≥18 months |

---

## 9. Immediate next actions (this week)

1. **Owner:** approve squad seats S1–S12 as permanent structure.  
2. **Agents:** execute Track A stabilize (cannot skip).  
3. **Owner:** choose CD path — *retainer studio* (Active Theory / Immersive Garden / Lusion) vs *assemble freelancers* under same seats.  
4. **All:** start Orientation O1–O5 using live site + this doc.  
5. **S2:** keep `STATUS.md` + handoff freeze updated; link this plan from FORWARD-PLAN / docs README.

---

## 10. Citations / research notes (public)

- NASA Eyes / JPL visualization; Kevin Hussey leadership (JPL Eyes; Disney Animation background) — [eyes.nasa.gov](https://eyes.nasa.gov/), Wikipedia NASA's Eyes.  
- Mark SubbaRao — NASA SVS; Adler; IPS / Data to Dome.  
- Active Theory — Andy Thelander et al.; [activetheory.net](https://activetheory.net/).  
- Bruno Simon — Three.js Journey; Immersive Garden lead history; [threejs-journey.com](https://threejs-journey.com/).  
- Ricardo Cabello (mr.doob) — Three.js.  
- Lusion, Immersive Garden, Utsubo — public Three.js agency shortlists / studio sites.  
- Sky-Skan — planetarium craft.  
- Chris Brennan — The Astrology Podcast / Hellenistic technical public work.

*Recruitment is outreach + fit, not endorsement that any party has agreed.*

---

**Bottom line:** Build a **permanent Observatory Core**, train them **on this site and this spine**, **stabilize P0s**, then spend unlimited craft on a **film-grade, truthful, fast 3D model** — and only then radiate the rest of AstroPrecise outward from that instrument.
