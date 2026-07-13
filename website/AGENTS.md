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


## Coherence FAIL-CLOSED (auto · 2026-07-13)

**No product edits** until Coherence seats are spawned for **this tip / vertical**.

- Kit: `C:\Users\jonny\dev\coherence` · Skill: `coherence` · Site: http://localhost:8785/website/
- Min: S8 implement · S12 verify (**different run**) · S5 honesty · S4 if CSS/perf · S6 if layout · S9 if visual
- Non-trivial by default (UI/CSS/polish/colour/features/multi-file/`?v=`)
- Banned: solo implement · path obvious · just CSS · prior fleet free-pass · multi-hat AGREE-SHIP
- Handoff: `C:\Users\jonny\dev\coherence\docs\ALL-AGENTS-HANDOFF.md`

```text
Load Coherence. PROJECT-FIRST this project. Mode: IMPLEMENT. Vertical: <surface>.
Spawn seats. No product edits until fleet returns.
```
