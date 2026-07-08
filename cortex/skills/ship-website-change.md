---
name: ship-website-change
description: The full path from edit to verified-live for anything under website/** — tokens, sw.js, test gates, Actions deploy, live check.
when_to_use: any change under website/**
tags: skill, astro-web, deploy
---

# Skill: Ship a website change (repo-specific)

The full path from edit to verified-live for anything under `website/**`.
Verified against `.github/workflows/deploy-pages.yml` 2026-07-03.

## Before editing

1. Read `cortex/index.md` open lint findings — don't re-break known issues.
2. Colors: use `--ap-*` tokens from `css/ap-palette-2026.css`. Never hardcode hex.
   (Canvas/WebGL can read tokens via `getComputedStyle(document.documentElement)
   .getPropertyValue('--ap-gold-core')`.)
3. Honesty rule: no fake data, no fake buttons, live feeds get source labels,
   unavailable feeds say so. Determinism: same inputs → same reading (FNV-1a /
   mulberry32 seeding — no `Math.random()` in reading paths).

## While editing

4. Sign pages (`<sign>.html` ×12) are generated — edit
   `tools/generate-sign-pages.mjs`, never the pages.
5. Changing any asset the service worker precaches? Bump the cache version `V`
   in `website/sw.js`. Forgetting this ships stale shells to returning visitors.

## Before pushing

6. Run the test gates locally — the same ones CI runs as hard gates:
   `node test-engine.mjs && node test-horoscope.mjs && node test-compat.mjs &&
   node test-art-themes.mjs && node test-weekly-sky.mjs`
7. Visual check: `./launch.sh` serves `website/` on :8790 (or headless Chromium
   screenshot: `/opt/pw-browsers/chromium --headless --no-sandbox
   --screenshot=out.png <url>` in Claude's cloud sessions).

## Ship & verify live

8. Push to `main` (or merge the PR). Any push touching `website/**` triggers
   Actions: test gates → minified `dist/` via `tools/build.mjs` → published to
   `gh-pages` root. **Never mirror gh-pages by hand.**
9. After Actions completes, verify live:
   `curl -s https://astroprecise.app/sw.js | grep ap-v` → must show your new version.
10. Update `cortex/state.js` (+ log.md if a mission completed). Hand off clean.
