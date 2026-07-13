# AstroPrecise — HANDOFF (start here) · 2026-07-13

**Canonical:** `C:\Users\jonny\OneDrive\astroprecise` · site in `website/` · preview `http://localhost:8790` · live https://astroprecise.app · SW tip **ap-v721** (tip SHA `6fed17d`).

Ground first:
```powershell
powershell -NoProfile -File "C:\Users\jonny\OneDrive\control-panel\project_first.ps1" -Name AstroPrecise -Agent <you>
```

**Authoritative status:** `STATUS.md`. **Forward plan:** `docs/FORWARD-PLAN.md`. **Full history:** `AGENT-HANDOFF.md` (+ ARCHIVE). If this file disagrees with STATUS, **STATUS wins**.

---

## Before you trust the screen

1. **Stale service worker** still fools hard. Prefer hard-refresh (Ctrl+Shift+R), incognito, or **`?nosw=1`** / localhost SW bypass.
2. **Do not trust Cursor’s in-app browser for WebGL** (hidden page → paused rAF → blank/frozen). Use the harness below.
3. **Never verify 3D by calling `Orrery3D.focusPlanet()`** — that bypasses pointer overlays. Use real mouse events.

## Render / real-click harness

```
node tools/_diag-click.mjs    # real drag/click/dblclick + overlay checks
node tools/_diag-engine.mjs   # scale journey / focus + console capture
npm test
npm run test:ui               # click + deeplink spine
```

## Current tip (ap-v721) — SHIPPED

- **LIVE:** Personal Sky Moment (Stages 0–3 in code; Stage 4 deploy done) + ship-harden (SW bypass, Explore toggle, CI sky-bridge gates, skills/rules).
- Contract: `docs/MODEL-SURFACE-CONTRACT.md`.
- Deep Reading checkout URLs: **still dormant** until owner wires them.
- Git is **pushed** to origin + mirror. Do **not** treat older “NOTHING IS DEPLOYED / NOT pushed” notes as current.

## Next (short)

1. **Owner:** hard-refresh live → confirm SW **ap-v721** + phone Personal Sky Moment pass.
2. **Owner:** when selling — wire real checkout URLs sitewide.
3. **Agents:** no force-push; ranked options in `docs/FORWARD-PLAN.md`; OrbitLab free-explore only if Jonny asks.

## Owner context

Long sessions failed on **caching** and **API-not-click** testing. Lead with verified-by-real-render results + hard-refresh instructions.
