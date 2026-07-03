---
description: The one clean distilled spot — verified cross-agent knowledge every agent reads first.
tags: memory, shared, canonical
---

# Shared Learnings — the one clean spot

*Leader-distilled from per-agent memory + verified findings. Read this in full before
work. Cap ~120 lines. Only the Leader edits. Last distilled: 2026-07-03.*

## Owner preferences (observed)

- Wants boards **graphical and instantly scannable** — "what's running, what steps"
  without reading prose; exception-first (what needs action floats up).
- Prefers **PayPal direct** over merchant-of-record; dropped Lemon Squeezy 2026-07-02.
- Honesty over polish: no fake data, no fake buttons, no fabricated charts/trends.
- Runs a **multi-agent fleet** (Claude, Grok, Hermes) sharing one git-file brain.
- Ships in decisive steps; says "ship all" — bias to action over asking.

## Process lessons (verified)

- **Docs drift; verify against the repo.** CLAUDE.md was 3 weeks stale on palette AND
  deploy. Check css tokens / workflow files before trusting any doc.
- **Docs lag git.** git log = what shipped; docs = why. STATUS.md trailed by 3 versions.
- **Ephemeral sessions ⇒ commit or it never happened.** The hub only persists because
  it's pushed.
- **Delegate recon, keep judgment.** Cheap scouts catalog; the verifier catches leader
  mistakes; final synthesis stays with the leader.
- **Build the data schema before the view.** state.js v3 first made the dashboard
  rewrite clean.
- **Never fabricate a trend/stat to fill a chart** — derive from the real log or omit.

## AstroPrecise technical facts (verified)

- Deploy: push `main` touching `website/**` → Actions test gates → minified `dist/`
  → `gh-pages` root → https://astroprecise.app. Never hand-mirror gh-pages.
- Palette: `css/ap-palette-2026.css` cool void `#0C1016` + brass `#C2A05E`; use
  `--ap-*` only. Warm hexes still hardcoded in canvas/WebGL renderers (M6, open).
- Shipping cached assets ⇒ bump `sw.js` cache `V`.
- GitHub Pages ignores `_headers` (CSP inert live) — open owner decision.
- STATUS.md references AGENT-HANDOFF.md, which doesn't exist — cortex/ covers it now.

## Cortex system facts

- Coordination is git-file only, no server, must work offline (Hermes).
- `window.CORTEX_STATE` loads in Node via `new Function('window', src)` — enables
  offline validation/tooling with no browser and no deps.
- Validate state before commit: `node cortex/tools/validate-state.mjs`.
- Regenerate the index after adding docs: `node cortex/tools/build-index.mjs`.
- Memory is 3-tier with hard size caps; the Leader distills; eviction is git-safe.

## Business context

- Phase 1 (traction + first revenue) is blocked on owner actions only: PayPal links
  into `app.js AP_MON`, social accounts + Postiz. Code is ready.
- Phase 2 commerce requires leaving GitHub Pages (ToS forbids on-site selling).
