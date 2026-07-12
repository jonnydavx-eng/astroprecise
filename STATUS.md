# STATUS — AstroPrecise · 2026-07-12

**State:** Local tip **ap-v721** (Personal Sky Moment Stages 0–4 + ship-harden). Live https://astroprecise.app still **ap-v705** until push. Local preview :8790. Git: `main` **26↑ / 0↓** vs `origin/main` (merge already done at `a92352a` — **no force-push**). Checkout Deep Reading URLs remain **dormant**.

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
- **Owner:** 8-item eye-check (handoff) then intentional `git push origin main`
- **Owner:** set `deepReadingUrl` / checkout when products go live
- OrbitLab free-explore galaxy is **not** auto-ported unless Jonny asks
- Warm hex hardcodes in WebGL/canvas — owner aesthetic tension (later)

## Suggested next steps
1. Owner eye-check ap-v721 → push `main` (never force)
2. Confirm Actions deploy-pages green + live SW tip in incognito
3. When selling: wire real checkout URLs sitewide

## Older STATUS blocks
Prior tips: ap-v720 Personal Sky Moment Stage 4; ap-v715 Scale Ladder; ap-v707 observatory look-through; ap-v705 homepage-is-the-model. See AGENT-HANDOFF.md for full history.

*Full history: AGENT-HANDOFF.md (+ ARCHIVE) · board: OneDrive\WHERE-IM-UP-TO.md*
