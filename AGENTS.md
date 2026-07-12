# AGENTS.md — AstroPrecise

**Atlas name:** AstroPrecise  
**Canonical:** `C:\Users\jonny\OneDrive\astroprecise`  
**Live:** https://astroprecise.app  
**Local site:** http://localhost:8790 (`website/`)  
**Deep docs:** `CLAUDE.md` (Android + full website architecture) — do not duplicate here.

## PROJECT-FIRST

If this session has not grounded yet:

```powershell
powershell -NoProfile -File "C:\Users\jonny\OneDrive\control-panel\project_first.ps1" -Name AstroPrecise -Agent <Grok|Claude|Hermes>
```

## What this repo is

Monorepo:

| Area | Path | Stack |
|---|---|---|
| **Website (primary agent surface)** | `website/` | Static HTML/CSS/JS, no SPA framework; SW precache; GitHub Actions → Pages |
| Android app | `app/` | Kotlin, Jetpack Compose, Hilt |
| Ephemeris package | `ephemeris-package/` | npm |
| Visual QA | `tools/visual-check/` | Playwright screenshots, a11y, lighthouse |

Most chat about “AstroPrecise” means **`website/`**. See `website/AGENTS.md`.

## Do

- Edit only this canonical tree (never stale Desktop copies).
- Site preview: repo `launch.bat` / serve `website` on **:8790**.
- After **any** `website/` UI change: run visual-check skill / `tools/visual-check` (`npm run all` minimum for orrery/CSS).
- Bump cache-bust (`?v=` / SW `ap-v###`) when shipping asset changes.
- Tests before push: root `npm test` (engine gates) when touching JS engines; `npm run test:ui` for WebGL click + deeplink spine.
- Deploy: push `website/**` to `main` (Actions build `dist/` + Pages). No manual gh-pages. **Never force-push.** If ahead of origin, warn — live will not update until push.
- After served edits:  
  `after_project_edit.ps1 -Project "AstroPrecise"`

## Don’t

- Fake live data / honesty violations (source labels or admit unavailable).
- Edit generated sign pages by hand — use `tools/generate-sign-pages.mjs`.
- Put secrets in the repo; treat `secrets/` as local-only.
- Bind ports already in the machine atlas (8790 is this site’s preview).
- Assume Android and website share UI code — they don’t.

## Verify (website)

```powershell
Set-Location C:\Users\jonny\OneDrive\astroprecise
npm test
Set-Location tools\visual-check
npm run all   # after UI work
```

## Handoff

Newest notes: `AGENT-HANDOFF.md` (archive older history if file is huge).  
Sign rows with your agent name. Carry out flags for you before new work.
