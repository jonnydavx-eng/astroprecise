# Shared Learnings — the one clean spot

*Distilled by the Cortex Leader from per-agent memory + verified session findings.
Any agent: read this file in full before starting work. Last distilled: 2026-07-03.*

## Owner preferences (observed)

- Wants boards/dashboards **graphical and instantly scannable** — "what's running,
  what steps" visible without reading prose (2026-07-03, Mission Control v2 request).
- Prefers **PayPal direct** over merchant-of-record platforms — dropped Lemon Squeezy
  2026-07-02; VAT/risk handling is knowingly owner-side.
- Values **honesty over polish**: no fake data, no fake buttons, dormant shop stays
  visibly dormant (enforced in copy + CI at ap-v566).
- Runs a **multi-agent workflow** (Claude, Grok, Hermes) and wants them sharing one
  brain — coordination artifacts belong in-repo, not in any one tool.

## Process lessons

- **Instruction docs drift; verify before trusting.** CLAUDE.md was 3 weeks stale on
  palette AND deployment — an agent trusting it would have reintroduced a retired
  palette and hand-pushed over an automated deploy. Check claims against the repo
  (css tokens, workflow files) before acting on any doc (2026-07-02).
- **Docs lag git.** STATUS.md said ap-v563 while main was at ap-v566. Git history is
  the ground truth for "what shipped"; docs are the ground truth for "why".
- **Ephemeral sessions ⇒ commit or it never happened.** Remote containers are
  reclaimed; the hub, memory, and state only work because they're pushed (2026-07-02).
- **Delegate recon, keep judgment.** Haiku-tier scouts catalog 21 docs fine; the
  verifier catches leader mistakes (it corrected two of Claude's CLAUDE.md claims
  before push on 2026-07-02). Final synthesis stays with the leader.

## AstroPrecise technical facts (verified)

- Deploys: push to `main` touching `website/**` → Actions runs test gates → minified
  `dist/` → published to `gh-pages` root → live at https://astroprecise.app.
  Never mirror gh-pages by hand.
- Palette tokens: `css/ap-palette-2026.css` (cool void `#0C1016` + brass `#C2A05E`);
  use `--ap-*` vars only. Caveat: warm hexes still hardcoded in canvas/WebGL/SVG
  renderers (`chart-render.js`, `instrument.js`, `orrery-webgl.js`, `tool-cards.js`) —
  open decision, Mission 6.
- Shipping cached site assets requires bumping `sw.js` cache version `V`.
- GitHub Pages ignores `_headers` (CSP inert on live host) — open owner decision.
- Grok ships in version waves (v535–v562 homepage arc) and left
  `tools/visual-check/out/**` intentionally uncommitted.

## Business context

- Phase 1 (traction + first revenue) is blocked on owner actions only: PayPal links
  into `app.js AP_MON`, social accounts + Postiz. Code is ready.
- Phase 2 commerce requires leaving GitHub Pages (ToS forbids on-site selling).
