# STATUS — AstroPrecise · 2026-07-12

**State:** **LIVE tip ap-v721** on https://astroprecise.app (Personal Sky Moment Stages 0–4 + ship-harden). Local preview :8790. Pushed `origin/main` + mirror `f2dab46..78a1195` (2026-07-12). Checkout Deep Reading URLs remain **dormant**.

**Product spine:** Personal Sky Moment — chart/moment/horoscope emitters → `explore.html#m=` (Surface A) → live WebGL (Surface C). Contract: `docs/MODEL-SURFACE-CONTRACT.md`.

**Ship-harden (this tip):** localhost / `?nosw=1` SW bypass; `npm run test:ui` (`_diag-click` + `_wave2-deeplink`); CI gates for sky-bridge + engine splits; agent skill + Cursor rules; home loads scale-ladder / sky-bridge / planet-actions; Explore cockpit toggle; larger planet pick zones + pointer cursor.

**Verify:** `npm test` · `npm run test:ui` · hard-refresh / `?nosw=1` on :8790 · never trust Cursor’s in-app browser for WebGL.

## Stack / agents
- Canonical: `C:\Users\jonny\OneDrive\astroprecise` · site in `website/`
- AGENTS.md + `website/AGENTS.md` · visual-check: `tools/visual-check`
- PROJECT-FIRST: `project_first.ps1 -Name AstroPrecise`
- After UI: visual-check + `after_project_edit.ps1 -Project "AstroPrecise"`
- Skill: `~/.claude/skills/astroprecise-website` · rule: `.cursor/rules/astroprecise.mdc`

## Open / ongoing
- **Owner:** hard-refresh / incognito on live — confirm SW **ap-v721**; phone pass still welcome
- **Owner:** set `deepReadingUrl` / checkout when products go live
- OrbitLab free-explore galaxy is **not** auto-ported unless Jonny asks
- Warm hex hardcodes in WebGL/canvas — owner aesthetic tension (later)

## Suggested next steps
1. Owner phone eye-check of Personal Sky Moment on live
2. When selling: wire real checkout URLs sitewide
3. Optional: more OrbitLab hit-target polish / warm-hex token migration

## Older STATUS blocks
Prior tips: ap-v720 Personal Sky Moment Stage 4; ap-v715 Scale Ladder; ap-v707 observatory look-through; ap-v705 homepage-is-the-model. See AGENT-HANDOFF.md for full history.

*Full history: AGENT-HANDOFF.md (+ ARCHIVE) · board: OneDrive\WHERE-IM-UP-TO.md*
