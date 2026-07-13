# STATUS — AstroPrecise · 2026-07-13

## State
- LIVE tip: **ap-v721** · tip SHA **6fed17d** · https://astroprecise.app
- Local SW: website/sw.js `const V = "ap-v721"` · live /sw.js matches (re-check after hard-refresh)
- Git: main = origin/main = mirror/main @ 6fed17d (ship 78a1195 + docs mark live 6fed17d). Range: f2dab46..6fed17d
- Preview: website/ on :8790 · localhost or `?nosw=1` skips SW
- Checkout / Deep Reading: **dormant** (AP_MON.deepReadingUrl empty)
- **Doc trust order:** this file + freeze at top of AGENT-HANDOFF.md → ignore root HANDOFF.md if it disagrees (should match after tidy) → ignore cortex wiki snapshots → ignore WHERE-IM-UP-TO if older than this file

## Product spine
- Personal Sky Moment Stages 0–3 **in code on live**; Stage 4 = deploy **done** + **owner eye-check OPEN**
- Emitters → explore.html#m= → WebGL Surface C
- Contract: docs/MODEL-SURFACE-CONTRACT.md
- Forward plan: docs/FORWARD-PLAN.md

## Ship-harden already on tip (do not re-do)
- SW bypass localhost + ?nosw=1
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
- [ ] Phone pass: cast → explore focus → freeze/share → daily return
- [ ] When selling: set deepReadingUrl / checkout URLs (honesty: no fake buy)
- OrbitLab free-explore: not auto-ported unless asked
- Warm hex hardcodes: later

## Suggested next (agents)
1. Support owner eye-check or run Playwright harness + report
2. No new SW tip without ask unless bugfix
3. See docs/FORWARD-PLAN.md for ranked options
4. On website change: bump ?v= + sw V + tests + after_project_edit

## Verify
- npm test · npm run test:ui
- node tools/_diag-click.mjs · node tools/_diag-engine.mjs
- Hard-refresh / ?nosw=1 · never trust Cursor in-app browser for WebGL

## Older tips
ap-v720 Stage 4 prep · ap-v715 scale ladder · ap-v707 look-through · ap-v705 homepage-is-model
Full history: AGENT-HANDOFF.md (+ ARCHIVE)
