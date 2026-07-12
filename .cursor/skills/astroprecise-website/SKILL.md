---
name: astroprecise-website
description: |
  AstroPrecise public website (website/) — vanilla PWA, WebGL orrery, Personal Sky Moment.
  Use for AstroPrecise, astroprecise.app, :8790, orrery, sky-bridge, deep-link, SW ap-v.
---

# AstroPrecise website

1. PROJECT-FIRST `-Name AstroPrecise` (Agent Grok|Claude|Hermes). Edit only `C:\Users\jonny\OneDrive\astroprecise`.
2. Default surface is **`website/`** — not Android unless named.
3. Read `docs/MODEL-SURFACE-CONTRACT.md` before 3D/nav/deeplink work (Surfaces A/B/C honesty).
4. After asset edits: bump `website/sw.js` `V` (`ap-v###`) + matching `?v=` on changed scripts/CSS.
5. Never hand-edit sign pages — `node tools/generate-sign-pages.mjs`.
6. Never verify WebGL via Cursor browser or `Orrery3D.focusPlanet()` alone — `npm run test:ui` (`tools/_diag-click.mjs` + `_wave2-deeplink.mjs`). Localhost unregisters SW; use `?nosw=1` if needed.
7. Gates: `npm test` when engines/bridge touched; `tools/visual-check` → `npm run all` when OneDrive allows.
8. `after_project_edit.ps1 -Project "AstroPrecise"`. Append `AGENT-HANDOFF.md` if deploy/another agent affected.
9. **Warn if `git status` shows ahead of `origin/main` and unpushed** — live stays stale until intentional push (never force-push).
10. Port **8790** only. Honesty: no fake LIVE/stats. OrbitLab is 3D engine source of truth.
