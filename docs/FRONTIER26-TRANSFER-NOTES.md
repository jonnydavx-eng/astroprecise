# FRONTIER/26 → AstroPrecise + FareRadar transfer notes

**Source:** https://jovial-kayak-tysa.here.now/  
**What it is:** Single self-contained HTML dossier (*FRONTIER/26 — The State of the Web Platform, July 2026*). No framework, no build — live demos of mid-2026 web platform APIs. Mirror snapshot: `docs/_research-frontier26.html` (fetched 2026-07-17).

**Rule:** Steal **patterns + progressive-enhancement discipline**, not the purple aesthetic or the raymarcher as a product hero.

---

## Techniques inventory (what the page proves)

| # | Technique | How FRONTIER uses it | Keep for system? |
|---|---|---|---|
| 1 | **OKLCH + `@property --hue`** | Whole theme from one animated custom property; `color-mix(in oklch, …)` ladders | **YES — high value** |
| 2 | **Scroll-driven CSS** | `animation-timeline: scroll(root)` progress bar; `view()` entry/exit; named view timeline horizontal gallery **with zero JS** | **YES** (progressive) |
| 3 | **View Transitions API** | Tab panels morph via `document.startViewTransition` + `view-transition-name` | **YES** |
| 4 | **`:has()`** | Cards react to `:checked` / `:valid` with no JS | **YES** |
| 5 | **Container queries** | `container-type: inline-size`; card layout follows **own** width | **YES** |
| 6 | **Popover + CSS anchor** | Native `popover` + `anchor-name` / `position-area` tooltips | **YES** (Chromium-first, fallback) |
| 7 | **`interpolate-size` + `::details-content`** | Accordion animates to `height: auto` | **YES** |
| 8 | **`field-sizing: content`** | Textarea grows with content | **YES** (forms) |
| 9 | **Variable fonts + `text-wrap: balance` / `pretty`** | Fraunces axes; heading balance / orphan control | **YES** |
| 10 | **Live `@supports` / API probe matrix** | 24 probes (`CSS.supports` + feature detects); score in UI | **YES — honesty tool** |
| 11 | **Raymarched WebGL2 SDF hero** | Pointer-warped gyroid; mentions WebGPU | **NO as product hero** (see below) |
| 12 | **Film grain / glass / `@property --spin`** | Atmosphere polish | **Optional** — careful on AstroPrecise (already heavy 3D) |

### Probe list to reuse (copy-adapt)

```text
Scroll timelines · View timelines · ViewTransition API · view-transition-name
WebGL2 · WebGPU · OKLCH · Display-P3 · color-mix() · @property
:has() · Container queries · Anchor positioning · position-area · Popover API
interpolate-size · calc-size() · field-sizing · text-wrap balance/pretty
Gradient color hints · Individual transforms · backdrop-filter · ScrollTimeline class
```

---

## AstroPrecise (`website/` · :8790)

**Stack fit:** Already vanilla HTML/CSS/JS + WebGL orrery — same philosophy as FRONTIER (no SPA framework).

| Technique | Use on AstroPrecise | Avoid |
|---|---|---|
| OKLCH + `@property` | Token evolution beyond hex brass/void; one `--ap-hue` for seasonal shop/eclipse skins without forking CSS | Replacing honesty palette overnight; purple FRONTIER default |
| Scroll-driven CSS | Shop ladder sections, eclipse hub chapters, reading beat reveal — **JS-free** entry fades | Driving the **orrery camera** from CSS scroll (engine owns time/camera) |
| View Transitions | Shop featured ↔ quick-view; chart tabs; explore ↔ moment share handoff | Morphing WebGL canvas frames (not what VT is for) |
| `:has()` | Chart form valid/invalid chrome; shop dormant vs live shells; prefs toggles | Replacing existing a11y/ARIA flows |
| Container queries | Product cards, planet-actions sheet, tool cards on narrow columns | Full-page IA based only on CQ |
| Popover + anchor | Planet action chips, shop Notify-me help, verify plate footnotes | Critical nav that must work on Firefox until anchors are universal |
| Feature matrix | Dev/status or `/why` “what your browser can do” — aligns with honesty rule | Claiming WebGPU LIVE when only WebGL2 is used |
| Raymarcher | **Not** a second hero competing with the orrery. Optional *tiny* SDF accent behind shop/eclipse only if budgeted + `prefers-reduced-motion` | Home hero, explore canvas, or anything that eats the single WebGL context |

**Best first ports (ranked):**
1. `text-wrap: balance` / `pretty` on shop + eclipse headings (cheap).
2. View Transitions on shop quick-view / tabs.
3. Scroll `view()` reveals on shop ladder + eclipse hub (with `@supports` fallback = already visible).
4. OKLCH ladder for Glacial Observatory / Cowork identity work (no brass).
5. Shared `ap-feature-probes.js` from FRONTIER’s PROBES array for QA + honesty pages.

---

## FareRadar (`Travel Planner Pro` · :5057)

**Stack fit:** Vanilla portal shell + Flask — already uses View Transitions, scroll-driven bits, `:has()`, variable Outfit, some CQ ([scout](cf49b1c3-fda8-45ff-936e-c141f8edea1d)).

| Technique | Use on FareRadar | Avoid |
|---|---|---|
| OKLCH + `@property` | Stabilize Night Radar / Golden Hour token drift; one hue axis for steel↔gold | Another full theme rewrite without S1 |
| Container queries | Result cards, filter rail, ideas strip densities | Viewport-only breakpoints forever |
| Popover + anchor | Command bar / When panel / compare tray | Replacing working keyboard menus blindly |
| Feature matrix | Optional “engine check” in about/debug — PE culture already there | Surfacing as a customer-facing gimmick |
| Raymarcher | **Do not** — brand is SVG radar + steel instrument | WebGL hero competing with search utility |

**Best first ports:** OKLCH token pass · expand CQ on result cards · anchor popovers for command chrome · keep VT/scroll/` :has` as already started.

---

## Machine / agent system — remember these tools

Treat FRONTIER as a **reference kit**, not a dependency:

1. **Pattern library:** this file + `docs/_research-frontier26.html`
2. **Reusable snippet candidates** (extract when implementing):
   - `PROBES` feature matrix → `tools/` or `website/js/ap-feature-probes.js`
   - OKLCH `@property --hue` theme block → palette tokens
   - Scroll progress hairline (`animation-timeline: scroll(root)`)
   - View-transition tab pattern
3. **Discipline to copy:** every fancy feature gated with `@supports` / feature detect; reduced-motion respected; zero framework tax.
4. **Do not copy:** Fraunces+purple OKLCH skin as brand; SDF raymarch as default hero; “every page is a tech demo” tone on money/travel products.

---

## Honesty / Coherence notes

- AstroPrecise: never label shader demos as LIVE sky / ephemeris truth.
- FareRadar: utility UX wins over platform theatre.
- Implementing any of the above on either product = Coherence Standard (UI) with S8 → different-run S12; do not multi-hat.

*Logged 2026-07-17 · Cursor research pass · source here.now FRONTIER/26*
