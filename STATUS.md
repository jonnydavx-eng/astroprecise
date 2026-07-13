# STATUS — AstroPrecise · 2026-07-13

## State
- LIVE tip: **ap-v721** · tip SHA **6fed17d** · https://astroprecise.app
- Local SW: website/sw.js `const V = "ap-v721"` · live /sw.js matches (re-check after hard-refresh)
- Git: main = origin/main = mirror/main @ 6fed17d (ship 78a1195 + docs mark live 6fed17d). Range: f2dab46..6fed17d
- Preview: website/ on :8790 · localhost or `?nosw=1` skips SW (**note:** index.html still registers SW on localhost — Track A P0)
- Checkout / Deep Reading: **dormant** (AP_MON.deepReadingUrl empty)
- **Doc trust order:** this file → `docs/UPGRADE-REFINE-PLAN-2026-07-13.md` → `docs/REGRESSION-AUDIT-2026-07-13.md` → contract → HANDOFF freeze
- **2026-07-13 audit:** 20 agents · `npm test` green · live SW ap-v721 · **spine FAIL on explore focus clobber** (see audit)

## Product spine
- Personal Sky Moment Stages 0–3 **in code on live**; Stage 4 = deploy **done** + **owner eye-check OPEN**
- Emitters → explore.html#m= → WebGL Surface C (**focus can be overwritten ~1.1s by loader auto-Earth — P0**)
- Contract: docs/MODEL-SURFACE-CONTRACT.md
- Plans: **docs/OBSERVATORY-CORE-ULTIMATE-MASTER-PLAN-2026-07-13.md** (★ continuous law) · team lock `docs/OBSERVATORY-CORE-TEAM-CONTINUITY.md` · UPGRADE-REFINE · WORLD-SQUAD · REGRESSION-AUDIT

## Ship-harden already on tip (do not re-do)
- SW bypass in app.js (localhost + ?nosw=1) — **not yet on index.html**
- npm run test:ui; CI sky-bridge + engine splits
- Home: sky-bridge, scale-ladder, planet-actions; Explore cockpit toggle
- Canvas pointer-events / planet cursor polish

## Stack / agents
- Canonical: C:\Users\jonny\OneDrive\astroprecise · website/
- PROJECT-FIRST; AGENTS.md + website/AGENTS.md
- Skill: ~/.claude/skills/astroprecise-website · rule: .cursor/rules/astroprecise.mdc
- After UI: tools/visual-check · after_project_edit.ps1 -Project "AstroPrecise"
- Deploy: push website/** to main → Actions Pages · **never force-push**

## Open / owner
- [ ] Hard-refresh or incognito: SW cache **ap-v721**; assets ?v=721
- [ ] Phone pass: cast → explore focus → freeze/share → daily return (**focus landings may fail until Track A**)
- [ ] When selling: set deepReadingUrl / checkout URLs (honesty: no fake buy)
- OrbitLab free-explore: not auto-ported unless asked
- Warm hex hardcodes: later (Track C)

## Suggested next (agents)
1. **Phase 0 READY** — pack `docs/PHASE-0-READY-PACK.md` (baselines green, tickets pinned, wave3 gate scaffolded). **Next: EXECUTE A1–A6 → ap-v722**
2. Owner parallel: `docs/DECISION-LOG.md` + `docs/SHOPPING-LIST-PHASE-0-M.md` (does not block A1)
3. Ultimate plan: `docs/OBSERVATORY-CORE-ULTIMATE-MASTER-PLAN-2026-07-13.md` · hire/tools: `OBSERVATORY-CORE-HIRE-TOOLS-SPAWN`
4. After 722: Training Gate → Phase M → Gate M → Phase S
5. On website change: bump ?v= + sw V + tests + after_project_edit

## Verify
- npm test · npm run test:ui
- node tools/_diag-click.mjs · node tools/_diag-engine.mjs
- Hard-refresh / ?nosw=1 · never trust Cursor in-app browser for WebGL

## Older tips
ap-v720 Stage 4 prep · ap-v715 scale ladder · ap-v707 look-through · ap-v705 homepage-is-model
Full history: AGENT-HANDOFF.md (+ ARCHIVE)
