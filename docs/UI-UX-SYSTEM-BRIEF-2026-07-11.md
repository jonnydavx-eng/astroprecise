# AstroPrecise — Full UI / UX / Graphics Design System
**Date:** 2026-07-11 · **Author:** Grok (art direction + systems)  
**Scope:** Evolution of the LIVE site (ap-v707 tip) — not a greenfield redesign  
**Canonical:** `C:\Users\jonny\OneDrive\astroprecise\website\`  
**Live:** https://astroprecise.app · **Local:** http://localhost:8790  
**Stack:** Vanilla multi-page HTML + `js/` on `window` + CSS tokens · SW `const V = "ap-v707"` · GitHub Actions → Pages  

**Laws (non-negotiable):** model is the product · controls never cover the disc · honesty over spectacle · one nav IA · one WebGL context per page · implementable in existing sheets.

---

### 1. Product name, tagline options, one-sentence design thesis

| Field | Value |
|---|---|
| **Product name** | **Astro Precise** (site: **AstroPrecise**) |
| **Primary tagline (locked)** | *The Sky, Live. Your Chart, Exact.* |
| **Alt A (model-first)** | *A private observatory for your sky.* |
| **Alt B (trust)** | *On-device sky. Exact free chart. No account.* |
| **Alt C (keep)** | *See it live. Cast it true. Keep the moment.* |

**Design thesis:**  
AstroPrecise is a **private mountain observatory on the web** — NASA Eyes model craft behind engraved glass chrome — where the **living 3D sky is the product**, free exact chart is the trust engine, and every LIVE claim has an honest failure path.

**Score weights (score every proposal):** brand fidelity · model-first law · honesty · mobile S24 · a11y · shippability in vanilla CSS/JS.

---

### 2. Experience loop (user journey)

**Spine (locked):**  
**Arrive (lens or home) → See model → Cast chart → Read sky / Daily → Keep Moment → Shop (optional)**

| Step | Emotion | Primary UI | Success metric | Honesty risk |
|---|---|---|---|---|
| **1. Arrive** | Awe, threshold | Warm mountain + eyepiece (`observatory.html`) **or** cold jet model home (`index.html`) | Iris open / model stage paints without nav flash | Labelling schematic starfield as LIVE; double-sky first paint |
| **2. See model** | Wonder, ownership of “now” | Model Window + plinth tray; Earth rest → scale | Disc visible; controls **below** canvas; LIVE only if `orrery-full` | LIVE badge on poster / black canvas / 2D wheel |
| **3. Cast chart** | Focus, private ritual | Chart form: date → city → time; one primary CTA | Submit in first viewport; result without account wall | Fake precision beyond ~arcminute class claims |
| **4. Read sky / Daily** | Orientation, daily habit | The Sky instrument panels; Daily slim first view | One job per page above fold; instrument language | Decorative sky as “your sky right now” without compute |
| **5. Keep Moment** | Pride, giftability | Moment plate (porthole + engraved rings) | Freeze/share path clear; plate matches masterpiece language | Export that pretends higher precision than engine |
| **6. Shop (optional)** | Quiet desire | Keepsake gallery; one-promise first viewport | Free rail honest; paid only when URL set | Fake scarcity, “Buy now” with dormant checkout |

**IA source of truth:** `js/ap-nav-model.js` only.  
Primary: **Observatory · Chart · The Sky · Daily · Shop**  
Bottom tabs (4): Observatory · Chart · The Sky · Daily  
More: Look Through the Lens · My Sky · Moment · Cosmic Story · Library · Match · Transits · Profile · Charts · tools…

---

### 3. Visual design system (full)

#### 3.1 Colour tokens (Jet · Silver · Aurora)

**Source of truth:** `css/ap-palette-2026.css` — always prefer `--ap-*`.

| Role | Token | Value / note |
|---|---|---|
| Stage pure | `--ap-jet` | `#000000` |
| Stage soft | `--ap-jet-soft` | `#07070A` (body void) |
| Stage base | `--ap-jet-base` | `#0A0A0C` |
| Stage mid | `--ap-jet-mid` | `#101014` |
| Raised surface | `--ap-jet-raised` | `#18181E` |
| Elevated | `--ap-jet-elevated` | `#22222A` |
| Text primary | `--ap-silver-bright` | `#E8EBF0` |
| Metal / secondary | `--ap-silver` | `#C8CDD6` |
| Muted UI | `--ap-silver-dim` | `#8B919C` |
| Captions | `--ap-silver-faint` | `#5C616A` |
| Chrome / icons | `--ap-chrome` | `#A8B0BC` |
| Life accent | `--ap-aurora` | `#7EC8E8` (Earth limb ice) |
| Aurora bright | `--ap-aurora-bright` | `#A8DCF2` |
| Aurora deep | `--ap-aurora-deep` | `#4A9FD4` |
| Violet whisper | `--ap-aurora-violet` | `#8B7CE0` |
| CTA solid | `--ap-cta` | `#6AB0FF` |
| CTA hover | `--ap-cta-hover` | `#8FC4FF` |
| CTA ink | `--ap-cta-ink` | `#050508` |
| CTA gradient | `--ap-cta-grad` | `135deg #4A90E0 → #7EC8E8 → #C8D8E8` |
| Sun glint only | `--ap-sun-glint` | `#E8DCC8` (Sun body / price digits only) |
| Fire | `--ap-element-fire` | `#E07070` |
| Earth | `--ap-element-earth` | `#6A9A70` |
| Air | `--ap-element-air` | → silver |
| Water | `--ap-element-water` | → aurora |
| Danger | map to cool crimson in `main.css` (`--danger`) | form errors, destroy actions — never gold |
| Success | cool teal (`--success`) | toast success, save-ok |
| Focus | `--ap-focus-ring` / `--ap-focus-shadow` | aurora + 3px ring |

**Legacy debt:** all `--ap-gold-*` / `--brass` / `--gold` **remap to silver/chrome**. Do **not** reintroduce heavy gold UI chrome. Rare sun-glint only for Sun body and price numerals.

**Warm-twilight exception (locked):** `observatory.html` arrival (mountain + eyepiece) uses **hue ~40**. Do not force cool jet into that zone. Cool jet begins **inside** the lens and on all other product surfaces.

#### 3.2 Elevation & glass

| Level | Use | Surface |
|---|---|---|
| **Void 0** | Model window interior | `--ap-jet` pure black |
| **Void 1** | Page walls (cool) | `--ap-jet-soft` / `--ap-void-deep` |
| **Raised** | Cards, docks | `--ap-card-surface` (glass gradient) + `--ap-card-border` |
| **Instrument** | The Sky panels | `--ap-ip-surface` / `--ap-ip-surface-deep` + `--ap-ip-border` |
| **Rim focus** | Focused card / active instrument | `--ap-card-border-strong` / `--ap-ip-border-rim` (aurora) |
| **Shadow** | Cards | `--ap-shadow-card`; docks `--ap-shadow-raised` |
| **Hairline** | Frames, tray shelf | `--ap-hairline` / silver-a18–a28 |
| **Rim light** | Top edge of glass | `--ap-rim-light` / `--ap-rim-shadow` inset |

**Model Window interior** is always pure jet regardless of wall colour. Chrome is engraved glass — never competes with the disc.

#### 3.3 Typography

| Family | Role | When |
|---|---|---|
| **Cinzel** | Display / mast / plate titles | H1 brand moments, Moment title, section display (use sparingly; max 1–2 display lines per viewport) |
| **Cormorant Garamond** | Reading | Daily copy, Deep Reading body, long keep prose, sign library reading blocks |
| **Inter** | UI | Nav, forms, buttons, path cards, shop UI, body chrome |
| **IBM Plex Mono** | Instrument plates | Model Window caption, LIVE/schematic badges, date plates, ephemeris readouts, tray captions |
| **AstroGlyph** | Zodiac/planet glyphs as text | Never emoji fallback for signs/planets |

**Scale (tokens):**

| Token | Use |
|---|---|
| `--display-1` | Rare hero (observatory wordmark / Moment) |
| `--display-2` | Page H1 (Chart, Daily, Shop) |
| `--display-3` | Section titles |
| `--text-data` | Mono plates, instrument numbers |
| Body | Inter 0.95–1.05rem, line-height ~1.55 |
| Reading | Cormorant 1.125–1.25rem, line-height ~1.65 |

**Weights:** 400 default · 500 UI labels · 600 section · 700 rare display only.

#### 3.4 Spacing, radius, hairline, focus

| System | Source | Spec |
|---|---|---|
| Spacing | `main.css` `--space-1`…`--space-24` | Prefer 4/8 rhythm: 8 / 12 / 16 / 24 / 32 / 48 |
| Radius | `--radius-sm` 6 · `md` 10 · `lg` 14 · `xl` 20 | **Instrument plates:** 2–4px (engraved, not bubble) |
| Hairline | 1px silver-a18–a30 | Model Window, tray shelf, card edge |
| Focus | aurora ring | `0 0 0 3px var(--ap-aurora-a28)` on interactive; visible on keyboard only optional but never remove outline without replacement |
| Tap targets | **≥ 44×44px** | Nav, pills, primary CTA, bottom tabs |

#### 3.5 Icon / thumbnail language

| Kind | Source | Use |
|---|---|---|
| **Engine stills** | `img/engine/*.webp` (+ derivatives) | Planet pills, scale thumbs, path cards, empty/fail panels, bottom-nav active states |
| **Orbs SVG** | `assets/images/orbs/planets/` | Compact chips when still not needed |
| **Element seals** | `assets/images/seals/elements/` | Sign / element badges |
| **Glyphs** | AstroGlyph + sign page assets | Sign grid, reading plates |
| **Masterpiece plate** | `img/marketing-masterpiece-plate.jpg` (+ silver) | Export / Moment finish reference |
| **Cinema system** | `img/marketing-system-cinema.jpg` | Marketing / OG multi-body reference |
| **OG** | `img/og-banner-silver.jpg` | Share cards |

**Do not** use random stock nebulae for “live” UI. Decorative fields must be labelled **schematic** when not computed sky.

#### 3.6 Status & data plates

| State | Plate copy pattern | Visual | Gate |
|---|---|---|---|
| **LIVE** | `LIVE · VSOP87 · <UTC date>` | Aurora dot pulse ≤0.5 Hz | Only when WebGL HD owns canvas (`html.orrery-full` + revealed) |
| **Schematic** | `SCHEMATIC · decorative field` | Silver dim, no pulse | Mountain backdrop, galaxy beat art, marketing fields |
| **Unavailable** | `LIVE SKY UNAVAILABLE` + path inside | Reticle/static plate; secondary CTA “Step inside” / “Open chart” | WebGL fail, offline sky, black canvas |
| **Computing** | `SETTLING…` / quiet spinner | No LIVE claim | Boot poster → live |
| **Precision** | ~arcminute class only as currently stated | Mono footnote | Never invent higher precision |

#### 3.7 Light rules (rare)

Parchment / export surfaces only (Moment print, poster PDF preview, certificate plates):

- Warm off-white paper `#F4F0E6` max  
- Engraved silver/chrome rings (not heavy brass UI)  
- Ink dark `#1A1814` for print contrast  
- Honesty footer always present (source + date + “on-device” where true)  
**No** sitewide light mode.

---

### 4. Component library (implementable)

Map components to existing CSS before inventing sheets. Prefer consolidating layers over a 40th file.

#### 4.1 Top nav + More drawer + bottom tabs

| | |
|---|---|
| **Purpose** | Single IA surface — Observatory / Chart / The Sky / Daily / Shop + More |
| **Anatomy** | Masthead logo · primary links · More trigger · drawer sections · bottom tab bar (4) |
| **Variants** | Overlay bar on model home; solid bar on form/reading pages; bottom tabs ≤640 |
| **Do** | Source from `AP_NAV` only; 44px targets; active state with engine thumb or quiet aurora underline |
| **Don’t** | Second nav model; Tools FAB stacks; dual primary rows; Explore as peer of Observatory |
| **Tokens** | silver text, jet glass bar, aurora active; sheets: structure-clean + site chrome / app.js `renderNav` |
| **Files** | `js/ap-nav-model.js`, `js/app.js` renderNav, `ap-structure-clean.css` bottom-nav |

#### 4.2 Model Window

| | |
|---|---|
| **Purpose** | Museum plate frame around the live model |
| **Anatomy** | Frame hairline · 4 corner ticks · caption plate (Plex Mono) · LIVE tag+dot · plinth tray below canvas |
| **Variants** | Desktop in-frame plate; mobile plate in tray band (never over disc); explore mount top-centered plate |
| **Do** | Show LIVE only after `orrery-full` + `ap-model-revealed`; curtain-raise on reveal; shrink canvas before overlapping |
| **Don’t** | Frame over poster as LIVE; controls on the disc; multi-WebGL |
| **Tokens** | jet interior, silver hairline, aurora LIVE; `css/ap-model-window.css` (load **after** structure-clean) |
| **Plinth law** | Pills, scrub, scale, cast band = **below** canvas; tray top == canvas bottom by construction |

#### 4.3 Primary / secondary / ghost CTAs

| Variant | Look | Use |
|---|---|---|
| **Primary** | `--ap-cta-grad` fill, `--ap-cta-ink` text, min-height 48 | Cast chart, Freeze moment, Look through the lens |
| **Secondary** | Transparent + silver border | The Sky tools, secondary paths |
| **Ghost** | Text + aurora underline/hover | Tertiary, footer, “learn method” |
| **Dormant-safe** | Secondary style + “Coming soon” or “Notify” if URL unset | Deep Reading when checkout dormant |

**Do/Don’t:** One primary per viewport. No brass/gold CTA stacks. No floating gold FAB competing with bottom tabs.

#### 4.4 Form fields (chart cast)

| | |
|---|---|
| **Purpose** | Private natal cast — no account |
| **Anatomy** | Label (Inter) · input · helper mono note · advanced disclosure · primary submit |
| **Priority** | **Date → City → Time** (time optional with accuracy note) |
| **Variants** | Hero cast dock (home rail/band); full chart page form |
| **Do** | 48px controls; city autocomplete honesty; UTC/jd discipline in captions |
| **Don’t** | Require account; bury Calculate below fold; fake geocode precision |
| **Files** | `css/ap-forms.css`, `chart.css`, `chart-critical.css`, `js/chart-page.js` |

#### 4.5 Cards

| Variant | Anatomy | Use |
|---|---|---|
| **Reading** | Cormorant body, silver title, hairline | Daily, Deep Reading teaser |
| **Tool / path** | Engine thumb + Inter label + one line | Home path, instruments |
| **Product** | Plate-quality still + price (sun-glint ok) + one promise | Shop |
| **Sign** | Glyph + element accent + short lead | Library grid (generator) |

**Surface:** `--ap-card-surface` + silver border; focus/hover aurora rim.

#### 4.6 Pills / chips / scale strip

- Planet pills: engine still or seal + glyph; 44px; horizontal scroll on mobile  
- Scale strip: 7-stop track desktop; stepper mobile (`‹ EARTH ›`)  
- Caption: `Positions live (VSOP87) · distances schematic` (Plex Mono)  
- Chips: filter only where needed; kill sticky chip bars that compete with first promise  

#### 4.7 Instrument panels (The Sky)

- Glass jet (`--ap-ip-*`), engraved lines, mono readouts  
- One primary instrument job per fold  
- Brass language → **silver system** (no new brass chrome)  
- Files: `instrument-panel.css`, `ephemeris.css`, `ephemeris-page.css`

#### 4.8 Empty / loading / WebGL-fail

| State | UI |
|---|---|
| **Loading** | Poster/engine still + “Settling the model…” — no LIVE |
| **Empty My Sky** | Engine still + “Cast a free chart to fill this sky” + CTA |
| **WebGL fail** | Engraved plate / still + `LIVE SKY UNAVAILABLE` + Chart / Observatory links |
| **Offline** | Cached shell + honest offline copy; 404 uses engine stills |

#### 4.9 Footer brand block

- Night-watch footer: logo · tagline · spine links · legal · accuracy link  
- Quiet silver; no second shop hero  
- File patterns: existing `footer.night-watch` on index

#### 4.10 Lens / iris transition motif

- `clip-path: circle()` bloom; reticle; Model Window corner ticks  
- Dive: scale eyepiece + veil → navigate  
- Rollout: page transitions / “enter room” moments sitewide (shared CSS vars `--obs-iris` etc.)  
- Files: `observatory.html`, `js/ap-observatory-entrance.js`, `js/zodiac-sphere.js`

#### 4.11 Toast / focus / skip-link a11y

- Skip link first focusable → `#main-content`  
- Toasts: short Inter copy; success/danger tokens; auto-dismiss + pause on focus  
- Focus ring aurora; no `outline: none` without replacement  
- Landmarks: header / main / nav / footer; one h1 per page  

---

### 5. Screen-by-screen UI specs

#### 5.1 Preloader / first paint

| | |
|---|---|
| **Goal** | One sky, no nav flash, no double model |
| **ATF** | Poster (`img/engine/earth.webp` or page poster) OR warm mountain still on observatory; critical CSS geometry |
| **Secondary** | Quiet settle → curtain-raise when live |
| **CTAs** | None until usable |
| **NOT** | LIVE badge; full nav paint then collapse; two canvases; cyan flash |
| **Mobile** | Same; respect bottom-nav reserved height early |

#### 5.2 Observatory home (`index.html`) — desktop + ≤640

| | |
|---|---|
| **Goal** | Living model is the product; cast is one clear path |
| **ATF** | Full-bleed stage + Model Window; cast rail (desktop) / cast band (mobile); plinth tray; slim overlay masthead |
| **Secondary** | Path cards (≤5) · Daily strip · Shop 2–3 keepsakes · Footer |
| **CTAs** | Primary: Calculate my chart · Secondary: Look Through the Lens / The Sky |
| **NOT** | 12 marketing chapters; dual heroes; Tools FAB; LIVE on poster; controls over disc |
| **Mobile deltas** | Stage height `100svh − tray − bottom-nav`; pills scroll; scale stepper; journey buttons optional/hidden; plate not over Earth |
| **CSS** | `ap-observatory-home.css` last after model-window; structure-clean; index-home |

**Scale Ladder (backlog product):** scroll reframes **one** persistent model (Earth → sky → system → galaxy beats via `data-ap-beat`); no second WebGL.

#### 5.3 Look Through the Lens (`observatory.html`)

| | |
|---|---|
| **Goal** | Ritual arrival: look **through** the eyepiece to real VSOP sky |
| **ATF** | Warm mountain + dome + eyepiece; schematic starfield labelled; “Look through the lens” |
| **Secondary** | Iris open → square ZodiacSphere LIVE plate; drag sky; Enter / dive to home model |
| **CTAs** | Primary: Look through the lens · After: Enter the observatory |
| **NOT** | Cool jet walls on mountain; lighthouse overture; LIVE if sphere failed; pull-back camera story |
| **Mobile** | Large circular target; 44px; reduced-motion = instant open |
| **Files** | `observatory.html`, `ap-observatory-entrance.js`, `zodiac-sphere.js`; doc `docs/OBSERVATORY-LOOK-THROUGH-2026-07-11.md` |

#### 5.4 Chart cast + result (`chart.html`)

| | |
|---|---|
| **Goal** | Exact free chart; private; form priority |
| **ATF** | H1 + date/city/time form + Calculate in first viewport |
| **Secondary** | Result wheel/plates; honesty footer; optional keep → Moment; dormant Deep Reading card |
| **CTAs** | Primary Calculate · Secondary Keep / Moment · Tertiary Deep Reading only if URL live |
| **NOT** | Account wall; competing gold CTAs; overclaim precision |
| **Mobile** | Advanced collapsed; strip accuracy note; one column |

#### 5.5 The Sky / ephemeris (`ephemeris.html`)

| | |
|---|---|
| **Goal** | Instrument room for live positions / sky tools |
| **ATF** | Instrument hero + primary readout/tool; silver system |
| **Secondary** | Body list, time controls, links to Tonight / Week |
| **CTAs** | Secondary: Cast chart if no chart; primary tool actions as needed |
| **NOT** | Marketing essay first; email banners; brass nostalgia chrome |
| **Mobile** | Dense cards; hide bloat; sticky only if it doesn’t cover data |

#### 5.6 Daily horoscope (`horoscope.html`)

| | |
|---|---|
| **Goal** | Slim first viewport; daily habit |
| **ATF** | Date + sign entry / personalised strip; high-contrast cards |
| **Secondary** | Reading body (Cormorant); link to Chart if empty |
| **CTAs** | Open my sign / personalise via free chart |
| **NOT** | Tools FAB; long marketing hero |
| **Mobile** | Cards in first view; 44px sign targets |

#### 5.7 My Sky hub (`mysky.html`)

| | |
|---|---|
| **Goal** | Personal hub; never empty black “live” lie |
| **ATF** | Status plate + engine still or live panel **with fallback** |
| **Secondary** | Charts list, Moment, Transits, Profile links |
| **CTAs** | Cast if empty; Open Moment if kept |
| **NOT** | Black WebGL void with LIVE; empty panels without path |
| **Mobile** | Stack cards; one primary |

#### 5.8 Moment keep/share (`moment.html`)

| | |
|---|---|
| **Goal** | Best brand object: masterpiece porthole plate |
| **ATF** | Plate preview + Freeze / Share primary |
| **Secondary** | Honesty footer; download; optional shop rail |
| **CTAs** | Freeze · Share · (optional) print product |
| **NOT** | Gallery essay first; title field noise on mobile |
| **Reference** | `img/marketing-masterpiece-plate.jpg` |

#### 5.9 Shop (`shop.html`)

| | |
|---|---|
| **Goal** | Keepsake gallery; one promise first viewport |
| **ATF** | One line promise + 1–3 featured products with plate-quality stills |
| **Secondary** | Free rail (chart/moment) · categories quiet |
| **CTAs** | Product primary only if purchase URL set; else “Preview” / dormant-safe |
| **NOT** | Fake scarcity timers; free-tools wall; sticky chip spam; engine strip bloat |
| **Pricing note** | AP_MON ladder (poster / Deep Reading / bundle) — UI shows prices; checkout owner-gated |

#### 5.10 Sign page template (`aries.html` …)

| | |
|---|---|
| **Goal** | SEO + library; generator-owned structure |
| **ATF** | Sign name (Cinzel) + element accent + glyph + short lead + Cast CTA |
| **Secondary** | Reading sections; related signs; sky link |
| **CTAs** | Cast free chart · Daily for sign |
| **NOT** | Hand-edit 12 pages; invent second template structure |
| **Process** | `tools/generate-sign-pages.mjs` only for structure content |

#### 5.11 Offline / 404

| | |
|---|---|
| **Goal** | On-brand recovery |
| **ATF** | Engine still + quiet Cinzel line + home/chart links |
| **NOT** | Browser default ugliness; fake LIVE sky |
| **Files** | `404.html`, SW offline shell |

---

### 6. Motion & micro-delight system

#### 6.1 Catalog

| Motion | Feel | Where |
|---|---|---|
| **Entrance settle** | Warm fade / opacity 0→1 400–800ms | Observatory arrival |
| **Curtain-raise** | Deck rise 12px staggered 150ms | Model reveal (`ap-model-revealed`) |
| **Iris** | `clip-path` circle 9%→72%+ bloom + ring flash | Lens threshold |
| **Dive** | Eyepiece scale + warp veil | Enter observatory → home |
| **LIVE pulse** | Dot ~0.4 Hz | Caption only when live |
| **Idle camera drift** | Subtle damping, no snaps | Orrery craft (engine) |
| **Poster→live dolly** | Smooth handoff | Home boot |
| **Scroll-scale (ladder)** | IO beats reframe one model | Backlog Scale Ladder |
| **Hover/focus** | Hairline brighten, aurora rim 150ms | Cards, pills, links |

#### 6.2 Reduced motion

| Feature | Full | `prefers-reduced-motion: reduce` |
|---|---|---|
| Iris | Bloom + flash | Instant open / final state |
| Curtain-raise | Stagger | Opacity 1, no translate |
| Dive | Scale/veil | Instant navigate |
| LIVE pulse | Soft pulse | Static aurora dot |
| Idle drift | On | Off |
| Hover | Micro lift OK | Color only |

#### 6.3 Forbidden

- Parallax that slides controls over the disc  
- Fake LIVE fades on posters  
- Camera snaps without damping  
- Competing confetti / streak gamification  
- Autoplaying heavy motion without user intent on data-heavy pages  

Sheets: `ap-motion.css`, `ap-micro-delight.css`, `ap-micro-2026.css`, observatory entrance CSS vars.

---

### 7. Graphics upgrade list (ranked S/M/L)

| Rank | Item | Path / surface | Why |
|---|---|---|---|
| **S** | Engine stills on path cards + empty My Sky | `img/engine/*.webp` | Honesty + 3D sitewide law |
| **S** | Active bottom-nav 3D thumbs | engine derivatives | Distinct tabs, not flat icons only |
| **S** | Shop product stills → plate quality | `img/shop/*` vs masterpiece plate | First-viewport promise |
| **S** | LIVE/unavailable plate CSS consistency | model-window + mysky | Trust |
| **M** | Real star catalog behind ZodiacSphere lens | `starcatalog.js` + `zodiac-sphere.js` | Observatory storyboard step 4 |
| **M** | Chart/Moment export = porthole + rings + honesty footer | Moment export path + chart export | Gallery object finish |
| **M** | Scale Ladder scroll beats (one model) | index + scale-journey | Homepage award craft |
| **M** | Birth-date live caption on cast (UTC/jd) | chart form + model caption | Wow without fake data |
| **M** | Lens-circle motif shared CSS | sitewide transition | Brand glue |
| **L** | Camera craft pass (damping, idle, dolly) | orrery-webgl / award boot | Observatory feel |
| **L** | Seal/orb SVG silver refresh | `assets/images/orbs`, seals | Kill leftover brass |
| **L** | OG/share plate family alignment | `og-banner-silver`, moment OG | Social fidelity |
| **L** | Design-targets visual regression set | `img/design-targets/*` | visual-check baselines |

---

### 8. IA & content chrome cleanup

#### 8.1 Primary vs More (locked)

| Primary bar | More (hub first) | Extras (tools) |
|---|---|---|
| Observatory | Look Through the Lens | Moon Phase, Retrograde, Tonight, Week… |
| Chart | My Sky · Moment · Cosmic Story | Solar/Saturn return, Synastry… |
| The Sky | Library · Match · Transits | Quiz, Angel Numbers, Numerology… |
| Daily | Profile · Charts | Accuracy, Why, Links |
| Shop | — | Lookbook |

`explore.html` = deep-link receiver room only — **not** a primary nav peer.

#### 8.2 Vocabulary (use these words)

| Prefer | Avoid |
|---|---|
| Observatory | Explore (as home name), Cosmos Hub |
| The Sky | Ephemeris (UI label — OK in instrument plates) |
| Daily | Horoscope (OK in SEO title, not primary tab) |
| Chart | Birth map / natal generator (marketing only) |
| Moment / Keep | Share card / meme |
| Look Through the Lens | Lighthouse, overture, pull-back |
| Model Window | Hero canvas, widget |
| Schematic / Unavailable | Soft-fail silence |

#### 8.3 Kill list (clutter)

- Duplicate Cast CTAs in same viewport  
- Tools FAB sitewide (disabled path stays dead)  
- Float-nav when bottom-nav exists  
- Double hero (marketing banner **and** full model)  
- Email banners on instrument pages  
- 12-card library walls on home  
- Sticky shop chips + free-tools + how-it-works stacking above first promise  
- Micro-labels on hero that fight the Model Window plate  
- Second “LIVE” language without engine ownership  

---

### 9. Accessibility, eye-comfort, performance UI rules

#### 9.1 A11y

- Contrast: silver-bright on jet ≥ WCAG AA for body; muted text only for true secondary  
- Targets ≥ 44×44; spacing between dense pills  
- Visible focus rings (aurora)  
- Landmarks + one h1  
- Skip link  
- Keyboard: iris open, form, drawer, bottom tabs  
- Don’t nest interactive controls; de-nest legends/drawers carefully  
- Motion: PRM table above  

#### 9.2 Eye comfort

| Surface | Temperature |
|---|---|
| Model window / orrery | Cool jet void |
| Long reading (Daily body, guides) | Slightly lifted void mid; Cormorant; avoid pure #000 full-bleed under long text |
| Observatory **arrival** | **Warm twilight ~40** |
| Forms | Jet raised cards, not pure black fields without borders |

#### 9.3 Performance UI rules

- **One Three.js / WebGL context per page**  
- Poster → lite → full ladder; never claim LIVE early  
- Prefer engine stills over second live canvas for thumbs  
- SW: bump `const V` in `sw.js` + `?v=` query on assets when shipping; hard-refresh verify  
- Critical CSS for first paint geometry; defer non-critical page CSS  
- visual-check settle ≥ ~1400ms after intro/WebGL for screenshots  

---

### 10. Conversion UI (honest)

| Priority | Path | UI rule |
|---|---|---|
| **P0** | Free chart | Always clearest primary; date→go; no account |
| **P1** | Keep Moment | After result; plate pride; free |
| **P2** | Shop keepsakes | Gallery; one promise; plate stills |
| **P3** | Deep Reading / poster paid | Show price; **if** `deepReadingUrl` / checkout unset → dormant-safe (Preview / Coming soon), **never** fake Buy |

**Trust chips (only if true):**

- On-device compute  
- Private — no account required for free chart  
- VSOP87 / precision range as currently documented  
- Positions live · distances schematic (model caption)  

**Forbidden conversion:** fake countdown scarcity, invented testimonials, LIVE over product photos, checkout buttons to dead URLs.

---

### 11. Implementation roadmap (UI-only phases)

Verify each phase: local :8790 hard-refresh SW · `tools/visual-check` (`npm run all` minimum) · disc-clearance gate on model pages · `after_project_edit.ps1 -Project "AstroPrecise"`.

#### Phase 0 — Token / audit consistency
| | |
|---|---|
| **Work** | Audit gold/brass leftovers; ensure pages load `ap-palette-2026.css`; map danger/success; document load-order laws |
| **Files** | `ap-palette-2026.css`, `main.css`, page critical CSS, stray brass rules |
| **Risk** | Low–med cascade fights |
| **Verify** | Spot home/chart/sky/shop; no heavy gold chrome |

#### Phase 1 — Model Window + mobile plinth (no overlap law)
| | |
|---|---|
| **Work** | Tray geometry; mobile plate; pill row; scale stepper; disc clearance measurable |
| **Files** | `ap-model-window.css`, `ap-observatory-home.css`, `ap-structure-clean.css`, home bootstrap tray height JS |
| **Risk** | High (layout regressions) |
| **Verify** | visual-check 1440 + 390; zero control∩disc |

#### Phase 2 — Home hierarchy + CTA discipline
| | |
|---|---|
| **Work** | One primary cast; kill dual heroes; path ≤5; bodyH gates; vocabulary Observatory |
| **Files** | `index.html`, `ap-structure-clean.css`, `index-home.css`, nav labels |
| **Risk** | Med SEO/scroll |
| **Verify** | Cast in first viewport; chapters budget |

#### Phase 3 — Observatory lens polish + motif rollout
| | |
|---|---|
| **Work** | Star catalog behind ring; shared iris CSS; PRM; dive handoff polish |
| **Files** | `observatory.html`, `ap-observatory-entrance.js`, `zodiac-sphere.js`, optional `ap-iris.css` |
| **Risk** | Med (shared drawSpaceBackground) |
| **Verify** | LIVE only on success; fail path; reduced-motion |

#### Phase 4 — Chart / Moment export gallery finish
| | |
|---|---|
| **Work** | Masterpiece porthole + engraved rings + honesty footer; export parity |
| **Files** | `moment-page.css`, moment JS, chart export CSS/JS |
| **Risk** | Med print/PDF |
| **Verify** | Phone eye-check plate; a11y text |

#### Phase 5 — Shop + My Sky empty/live honesty
| | |
|---|---|
| **Work** | One-promise shop; dormant-safe commerce; My Sky never black LIVE lie |
| **Files** | `shop.html`, `shop.css`, `mysky-page.css`, `AP_MON` UI gates |
| **Risk** | Low–med commerce |
| **Verify** | Dormant URLs don’t say Buy; empty My Sky has CTA |

#### Phase 6 — Sign template + systemwide 3D thumbs
| | |
|---|---|
| **Work** | Generator template polish; engine thumbs on path/nav/empty; seal silver pass |
| **Files** | `sign-page.css`, generator, `img/engine`, nav CSS |
| **Risk** | Low if generator-only |
| **Verify** | One sign regen sample; no hand mass-edit |

---

### 12. Explicit non-goals

- No React / Next / SPA rewrite  
- No fake live sky or inflated precision  
- No second navigation IA  
- No hand mass-edit of 12 sign pages (generator only)  
- No OrbitLab free-explore galaxy dump unless owner requests  
- No bright sitewide light-mode flip  
- No gamified streaks / points / fake social proof  
- No reintroduction of lighthouse overture  
- No Android app UI in this brief  
- No deploy without owner eye-check on major structure waves  

---

### 13. Definition of done (design)

This brief is **done** when:

1. A developer can implement **without guessing tokens** (`--ap-*` table + file map).  
2. Every component maps to **existing CSS/JS** (or a named new sheet with load-order law).  
3. Every **LIVE** claim has a **failure path** (schematic / unavailable / path inside).  
4. **Disc-clearance law** is measurable on home + model rooms.  
5. Owner can eye-check **phone (S24 class) + desktop** against §5 screens.  
6. IA vocabulary matches `ap-nav-model.js`.  
7. Warm-twilight observatory arrival remains warm; product chrome stays Jet · Silver · Aurora.  
8. visual-check + SW hard-refresh are the acceptance culture, not optional polish.

---

## Stretch

### A. Optional `:root` refinement block (gold→silver debt)

Only if audit finds remaining non-aliased brass UI (do **not** invent new gold chrome):

```css
/* css/ap-palette-2026.css — optional debt clamp (verify no Sun-body regression) */
:root {
  --ap-live-dot: var(--ap-aurora); /* status lamp; not CTA */
  /* Instrument gold aliases already remap; if a sheet hardcodes #C9A227 for chrome: */
  /* replace with var(--ap-chrome) / var(--ap-silver) — keep #E8DCC8 for Sun/price only via --ap-sun-glint */
}
```

**Note:** Some older docs mention brass CTAs on home cast; **current system law is cool aurora CTA** (`--ap-cta-grad`) sitewide, with warm exception **only** on mountain arrival. Align implementation to palette-2026, not brass nostalgia.

### B. Before / after hero (Observatory home) — prose

**Before (cluttered era):** A tall marketing landing where the model was one more section — dual nav, cast form lost below fold on phone, LIVE language fighting posters, gold/brass and cyan competing, twelve chapters of essay before shop.

**After (target):** You open a dark room and the **Earth is already breathing** under a silver Model Window. Caption plate whispers LIVE only when true. Controls sit on a plinth like instruments under a telescope. One cool aurora button: **Calculate my chart**. Scroll (later Scale Ladder) deepens the same model — you never leave the observatory to “start” the product.

### C. Three “wow” moments (real data only)

1. **Date scrub** — tray scrub moves true planetary positions; plate date updates UTC; no cinematic lies.  
2. **Body readout** — select a planet pill; mono plate shows real longitude/status from engine.  
3. **Birth-sky caption** — on cast date change (before submit), honest caption: sky of that civil date in UTC/jd discipline — never “your destiny loading.”

---

## File map (quick reference)

| Concern | Primary files |
|---|---|
| Tokens | `css/ap-palette-2026.css` |
| Fonts | `css/fonts.css`, `fonts/*` |
| Nav IA | `js/ap-nav-model.js` |
| Model Window | `css/ap-model-window.css` |
| Structure / mobile nav | `css/ap-structure-clean.css` |
| Observatory home | `css/ap-observatory-home.css`, `index.html` |
| Lens entrance | `observatory.html`, `js/ap-observatory-entrance.js`, `js/zodiac-sphere.js` |
| Chart | `chart.html`, `css/chart*.css`, `js/chart-page.js` |
| The Sky | `ephemeris.html`, `css/ephemeris*.css`, `instrument-panel.css` |
| Daily | `horoscope.html`, `css/horoscope*.css` |
| Moment | `moment.html`, `css/moment-page.css` |
| Shop | `shop.html`, `css/shop*.css`, `js` AP_MON |
| My Sky | `mysky.html`, `css/mysky-page.css` |
| SW | `website/sw.js` (`ap-v###`) |
| Verify | `tools/visual-check` |
| Prior design records | `docs/OBSERVATORY-LOOK-THROUGH-2026-07-11.md`, `STRUCTURE-CLEAN-2026-07-10.md`, `OBSERVATORY-HOMEPAGE-DESIGN-2026-07-10.md` |

---

## Quality bar (self-score checklist)

| Criterion | Pass if |
|---|---|
| Brand fidelity | Jet · Silver · Aurora + warm lens arrival only |
| Model-first | Disc legible; chrome secondary glass |
| Honesty | LIVE gated; schematic labelled; fail paths |
| Mobile | Plinth law; 44px; cast in view |
| A11y | Focus, contrast, PRM, landmarks |
| Shippability | Vanilla; existing sheets; visual-check + SW bump |

---

*End of brief. Implement phase-by-phase; do not rewrite the product. The model remains the product.*

---

## Implementation log (Grok)

| Date | SW | Shipped |
|---|---|---|
| 2026-07-11 | ap-v708 | Phase 0 CTA aurora · Phase 3 StarCatalog lens · Phase 5 My Sky honesty · engine-still pills |
| 2026-07-11 | **ap-v709** | Phase Scale Ladder (`js/ap-scale-ladder.js`) · birth-date UTC caption · Moment/chart porthole finish · sticky stage ≥1024 |
| 2026-07-11 | **ap-v710** | Beat DOM order earth→today→system→galaxy · path engine thumbs + Observatory vocab · mobile ladder cue · 404 Earth still |
| 2026-07-11 | **ap-v711** | Improvement loop: FOUC aurora CTA · Explore vocab kill · path flex thumbs · void-and-silver copy |

Remaining optional: continuous scroll-scrub scale API (engine), mobile sticky pin S24 jank test.
