# AstroPrecise — HANDOFF (start here) · 2026-07-13

**2026-09-14 Cursor @ JDAV / Laptop 1 — sitting spine night (local only).** Canonical `C:\Users\jonny\dev\astroprecise`. Branch still dirty `codex/v902-whole-release-r2` / `cursor/simplify-sitting-spine` tip `025c2cb4`. Do not push. Do not bump `website/sw.js` (local `ap-v902`, public `ap-v895`). Sign pages were regenerated from `website/tools/generate-sign-pages.mjs` (Observatory breadcrumb, compact four-route footer, Today’s reading / Cast your chart / Open the Shop). Archive leftover copy on solar-return, 404, offline, redirects, field guide, rising CTA. Engine-visuals strip skipped on `data-ap-static-nav` / `data-sign`. Cloud agent still owns `index.html` hero/3D, `shop.html` checkout, `orrery-webgl.js`. Checkout closed. WebGL keep capture unproven in Cursor browser. `AGENT-HANDOFF.md` is missing from this tree; this file plus `STATUS.md` are the current doors.

**Canonical:** `C:\Users\jonny\dev\astroprecise` · site in `website/` · preview `http://localhost:8790/?nosw=1` · public https://astroprecise.app. This July 2026 note is historical; current identity is `STATUS.md` (public `ap-v895`, local v902, checkout closed).

Ground first: read `STATUS.md` and `AGENT-HANDOFF.md` in `C:\Users\jonny\dev\astroprecise`. Do not use the old OneDrive tree.

**Authoritative status:** `STATUS.md`. **Forward plan:** `docs/FORWARD-PLAN.md`. **Full history:** `AGENT-HANDOFF.md` (+ ARCHIVE). If this file disagrees with STATUS, **STATUS wins**.

---

## Before you trust the screen

1. **Stale service worker** still fools hard. Prefer hard-refresh (Ctrl+Shift+R), incognito, or **`?nosw=1`** / localhost SW bypass.
2. **Do not trust Cursor’s in-app browser for WebGL** (hidden page → paused rAF → blank/frozen). Use the harness below.
3. **Never verify 3D by calling `Orrery3D.focusPlanet()`** — that bypasses pointer overlays. Use real mouse events.

## Render / real-click harness

```
npm test
npm run test:ui               # _diag-click + _wave2-deeplink
node tools/_diag-click.mjs
node tools/_diag-engine.mjs
```

## Current tip (ap-v722) — Track A stabilize

- **Fixes:** deep-link focus no longer clobbered by auto-Earth @1.1s; home SW bypass on localhost/`?nosw=1`; Surface C assets bust `?v=722`; lite/explore-boot focus residual.
- **Canary:** `http://127.0.0.1:8790/explore.html?nosw=1#m=now&focus=mars`
- Contract: `docs/MODEL-SURFACE-CONTRACT.md`.
- Checkout URLs: **still dormant**.
- **Next after ship:** Track B (Personal Sky doorway/return polish) per `docs/FORWARD-PLAN.md`.

## Next (short)

1. **Owner:** incognito live → confirm SW **ap-v722** + mars canary on explore.
2. **Agents:** Track B from FORWARD-PLAN; no force-push; Phase M only after Training Gate.

## Owner context

Long sessions failed on **caching** and **API-not-click** testing. Lead with verified-by-real-render results + hard-refresh instructions.
