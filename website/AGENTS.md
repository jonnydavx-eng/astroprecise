# AGENTS.md — AstroPrecise website/

Parent repo rules: `../AGENTS.md` and `../CLAUDE.md`.

## Stack

- Vanilla HTML pages + `js/` modules on `window` + CSS tokens (`css/ap-palette-2026.css`)
- No React/Vite build for the live site pages (there is `tools/build.mjs` for deploy `dist/`)
- Service worker precache — bump version on asset ships

## Layout

| Path | Role |
|---|---|
| `*.html` | Pages (index, chart, horoscope, shop, signs, …) |
| `js/` | Engines + page controllers (`ephemeris.js`, `orrery-webgl.js`, `app.js`, …) |
| `css/` | Design tokens + page CSS |
| `sw.js` | Precache — keep in sync with shipped assets |

## Conventions

- **Tokens:** use `--ap-*`; cool void + engraved brass palette is live.
- **Honesty:** no fake astronomy/stats.
- **Nav:** single primary bar from nav model (`ap-nav-model` / `renderNav`) — don’t invent a second IA.
- **Orrery / 3D:** prefer OrbitLab as engine source of truth when syncing; don’t “fix” Earth lighting without True-Time rules.

## After UI edits

1. Hard-refresh preview :8790 (and SW update).
2. `tools/visual-check` → `npm run all` (or full `audit` before big merges).
3. `after_project_edit.ps1 -Project "AstroPrecise"`.


## Coherence — v2.1 (pointer)

Retired v1 doctrine removed 2026-08-07 (owner-authorized sweep; archive: `control-panel\RETIRED-DOCTRINE-ARCHIVE.md`).
Current law: `C:\Users\jonny\dev\coherence\policy\coherence-policy.json` (kit `C:\Users\jonny\dev\coherence`, skill `coherence`).
Lanes No-wave/Fast/Standard/Full; builder never verifies; only the validator emits `CODE-ONLY | BLOCK-SHIP | VERIFIED-LOCAL | READY-SHIP | LIVE`.
