# AstroPrecise — Design System Reference (Paper & Night)

_Rewritten 23 Oct 2026 (2C step 11) from the Paper & Night brand guide (`guide/brand-guide.html` in the brand pack, Direction A, 22 Oct 2026). The dark "Observatory Palette 2026" this file used to describe is retired. The CSS is the source of truth; this file says where that truth lives and the rules around it. The dark-era art docs are archived in `docs/archive/` (`ART-DIRECTION-2026.md`, `ART-LIST-2026-08-21.md`)._

**In one line:** your sky, to the minute. Light paper, ink and one copper accent. Dark only inside the sky.

## Token source of truth

- **`website/css/ap-tokens.css`** is the canonical token file (palette, type, space, shape, the `.ap-sky` night context). Edit tokens there, never hardcode hexes in page CSS.
- **`website/css/ap-next.css`** is the shell (header, tabs, footer, buttons). It carries a copy of the token layer between the `AP-TOKENS` markers, written by `node tools/sync-brand-tokens.mjs` (`--check` fails when it is stale). The copy saves a render-blocking request; do not hand-edit it.
- Legacy names (`--ap-next-*`) are aliases into the tokens so older selectors keep working. Do not add new uses.
- Pages still on a legacy layout stack get the paper skin from `website/css/ap-paper-pages.css`: `<html class="ap-paper-legacy">` puts every surface on paper, ink and copper, with `--pl-*` names that read the same tokens.
- Target page head: `ap-next.css` (tokens + shell), then **at most one** page file (`sign-next.css`, `guide-next.css`, `observatory-next.css`, …).

## Palette (one palette, one accent)

| Role                          | Token                         | Value                 | Notes                                                                         |
| ----------------------------- | ----------------------------- | --------------------- | ----------------------------------------------------------------------------- |
| Page                          | `--ap-paper`                  | `#F6F3EC`             | also the `theme-color` value                                                  |
| Bands, wells                  | `--ap-paper-2`                | `#EDE8DD`             |                                                                               |
| Cards, sheets                 | `--ap-card`                   | `#FBF9F4`             |                                                                               |
| Hairlines, borders            | `--ap-rule`                   | `#D6D1C6`             |                                                                               |
| Disabled, placeholders        | `--ap-fog`                    | `#D9D6CE`             |                                                                               |
| Headings, body                | `--ap-ink`                    | `#0E1116`             | 17.1:1 on paper                                                               |
| Secondary text                | `--ap-graphite`               | `#3A3F47`             | 9.6:1                                                                         |
| Captions, meta                | `--ap-muted`                  | `#5C6168`             | 5.6:1                                                                         |
| The accent                    | `--ap-copper`                 | `#B4693E`             | 3.8:1: marks, ticks, rules, focus ring, numerals 24px and up. Never body text |
| Copper as text                | `--ap-copper-ink`             | `#8A4A24`             | 6.1:1: eyebrows, links                                                        |
| Night (inside `.ap-sky` only) | `--ap-night` / `--ap-night-2` | `#0E1116` / `#181C24` |                                                                               |
| Type on night                 | `--ap-starlight`              | `#F1E7CF`             | links on night use `#E2A27A`                                                  |
| Checked states                | `--ap-proof`                  | `#3D6B55`             |                                                                               |
| Errors                        | `--ap-alert`                  | `#A64526`             |                                                                               |

- Copper appears once per view: one star, one tick, one eyebrow or one highlighted body.
- Element accents (fire, earth, air, water) stay semantic and distinct; do not flatten them to copper. Any element colour used as a mark on paper must reach 3:1 against paper, card and the hover ground (the quiz dots are tested for this).
- **Night** is used only inside `.ap-sky`: the Observatory canvas and the sky disc on a plate. Pages still allowed a dark stack are listed, with a reason each, in `test-paper-pages.mjs` (`ALLOW`), and that list only shrinks.
- **Retired, never reintroduce:** the `#040812` void and the dark Observatory Palette 2026 (`ap-palette-2026.css`: `#05080F` voids, instrument silver `#8FA3B8`, `#B86B4A` ember), the old gold `#d8a461` accent and every earlier brass, warm gold and acid orange set. `test-paper-pages.mjs` fails on `#040812` outside the allowlist.

## Typography (two families, both SIL OFL 1.1)

- **Instrument Serif** (`--ap-serif`, face name `AP Serif`): display and headings only, 28px and up. Regular and Italic. By Rodrigo Fuenzalida & Jordan Egstad. Self-hosted: `fonts/instrument-serif-regular.woff2`, `instrument-serif-italic.woff2`.
- **Inter** (`--ap-sans`, face name `AP Sans`): body, interface, eyebrows and every number. By Rasmus Andersson. Self-hosted as one variable file (`fonts/inter-normal-400.woff2`).
- Degrees and numbers use Inter tabular figures (`.ap-num`, `.ap-deg`, `--ap-num-features`), because Instrument Serif has no prime (′).
- Scale: `--ap-step--1` 14px (the floor), `--ap-step-0` 17px body, up to `--ap-step-4` serif display. Eyebrows: 600 weight, `0.18em` tracking, upper case, copper ink.
- **No text under 14px** on the new pages. Pages on the legacy paper skin have a 12px floor for text their scripts write later, until they move to the shell.
- Cormorant Garamond, Cinzel, Schibsted Grotesk and IBM Plex Mono are retired. Their files go in the step 12 deletes once nothing references them.

## Space and shape

- Spacing steps `--ap-s1`…`--ap-s9` (4, 8, 12, 16, 24, 32, 48, 72, 112px); reading measure `--ap-measure` 64ch.
- Print-like corners: `--ap-radius` 2px; pills only for chips.
- Hairlines (`--ap-hairline`, 1px `--ap-rule`) rather than glows. The one shadow, `--ap-shadow-print`, is for framed plates only.
- Focus ring: `--ap-focus` (paper gap, copper ring).
- Components in the token layer: `.ap-eyebrow`, `.ap-btn` / `.ap-btn--quiet`, `.ap-card`, `.ap-specimen`, `.ap-glyph`, `.ap-num`.

## Logo

A half-lit disc, a copper star and sixty minute ticks; the wordmark is outlined Instrument Serif. Keep clear space of one mark-radius on all sides. Minimum size is 20px for the mark and 96px for the lockup. Drop the tick ring below 32px (favicon). Use the dark lockup only on night. Icons are drawn by `tools/make-brand-icons.mjs`.

## Graphic language

- **Line:** glyphs sit on a 24-unit grid with a 1.5 stroke and round caps (1.8 at 16px and below), as `.ap-glyph` (`--ap-line`). Orbits are 1px hairlines; dotted orbit rings use a `1 5` dash (`--ap-orbit-dash`).
- **Stars and orbits:** the four-point copper star marks the one thing that matters. The 60-tick minute ring is the "to the minute" proof. Positions are always computed by the engine, never drawn by eye.
- **Glyphs:** every glyph is drawn SVG. No unicode glyphs or emoji as artwork.
- **Imagery:** planet discs are engine stills from the licensed NASA/USGS-based maps. Never replace the live planet maps (`website/assets/textures/`, `website/img/orrery/`) with Firefly, Adobe Stock or other generated art. No AI zodiac art and no lettering inside AI images. Paper grain is procedural or comes from a credited texture.
- **Sign tiles:** `img/signs/*.webp` (they replace `assets/images/zodiac-cards`).
- **Samples:** a small SPECIMEN corner mark (`.ap-specimen`), never a diagonal watermark. The sample person is fictional (Imogen Hale, 14 March 1990, 06:30 GMT, London); never a founder name, real birth data or a real person's chart.
- **Share cards:** light Paper & Night cards, one per public page, from `tools/make-og-cards.py` into `website/img/og/` (1200×630; `test-og-cards.mjs`).

## Voice

Faceless, calm, checkable. Plain UK English: "your sky", "to the minute", "calculated".

- Describe the sky, then what tradition says. Leave meaning to the reader.
- Say where numbers come from: "from our own engine, to about an arcminute".
- Weekly and monthly sky pages; real events with times in UK time.
- Never: promises of luck, health, love or money; daily sun-sign predictions.

## Do not

- Dark pages outside the Observatory, star fields behind body text, or text under 14px.
- A third typeface, a second accent, gradients or glows.
- Hardcoded hexes in new code: use the `--ap-*` tokens.

## Motion

- Respect `prefers-reduced-motion` everywhere (the token layer turns off animations and transitions under it).
- CLS budget ≤ 0.05 per page. Heroes reserve their space.

## Hard rules

1. **Honesty:** no fabricated data, no unlabelled sources, no unqualified accuracy claims ("to about an arcminute" is the approved phrasing).
2. Same inputs give the same reading.
3. Everything computes in the browser; only labelled public feeds go over the network.
4. When cached assets change, bump the asset pin (`?v=NNN`, `AP_ASSET_V`) and the `sw.js` cache (`ap-vNNN`) with `website/tools/generate-sw-precache.mjs` (`--check` and `test-sw-precache` catch a stale list).
5. Nav and footer are injected from one source (`data-ap-next-nav`, `data-ap-next-footer`). Never hand-edit nav per page.
6. Before any deploy: `npm test` must be green; run the `tools/visual-check/` scripts that cover the pages you changed.

## Checks that guard this file

`test-brand-tokens.mjs` (tokens, fonts, shell palette, logo), `test-brand-computed.mjs` (computed styles in a browser), `test-paper-pages.mjs` (no retired `#040812` outside the allowlist, 14px floor in the paper sheet), `test-paper-legacy-browser.mjs` and `test-paper-legacy-update-browser.mjs` (legacy pages on the paper skin), `test-og-cards.mjs`, and `test-design-doc.mjs` (this file matches `ap-tokens.css`).
