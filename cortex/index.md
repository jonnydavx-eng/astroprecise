# Cortex Knowledge Base — Index

Master index of the LLM-Wiki knowledge base. **Read this first** before complex work;
update it whenever a wiki page is added, renamed, or retired.

- `mission-control.html` — **graphical dashboard** (open directly in a browser)
- `state.js` — machine-readable shared state every agent reads/updates (the live brain)
- `agents.md` — agent registry + wiring protocol (incl. bootstrap prompt for Grok/Hermes)
- `wiki/` — synthesized, cross-referenced knowledge pages (the durable layer)
- `raw/` — unprocessed source material awaiting ingest
- `log.md` — mission log (what was done, when, with what proof)

## Wiki Pages

| Page | Covers | Last updated |
|---|---|---|
| [mission-plan.md](wiki/mission-plan.md) | **Active mission plan** — current missions, status, standing orders | 2026-07-13 |
| [operations.md](wiki/operations.md) | How the Cortex system works: environment reality, delegation policy, goals/loops rules, ingest/query/lint procedures | 2026-07-02 |
| [astroprecise-state.md](wiki/astroprecise-state.md) | Current technical state of the AstroPrecise site + app: tip, deploy, known historical notes | 2026-07-13 |
| [astroprecise-business.md](wiki/astroprecise-business.md) | Launch/monetization strategy synthesized from the 21 root planning docs, with phase gates and doc map | 2026-07-02 |
| [davit-sat-dashboard.md](wiki/davit-sat-dashboard.md) | Satellite dashboard repo — currently an untouched Streamlit blank template | 2026-07-02 |

## Open lint findings

1. **Warm hexes still hardcoded outside the token system** (verifier, 2026-07-02) —
   `#050406`/`#C9A227` may still live as literal canvas/WebGL/SVG paint colors in
   shipped JS (chart-render, instrument, orrery-webgl, tool-cards, etc.). Tracked as
   Mission 6 in [mission-plan.md](wiki/mission-plan.md). Re-verify before sweeping.

### Resolved

- ~~STATUS.md / cortex snapshot stuck at ap-v563~~ — cortex tip refreshed **2026-07-13**
  to **ap-v721** LIVE (`6fed17d`, Personal Sky Moment + ship-harden, checkout dormant).
  Old 563→566 narrative is historical only.
- ~~AGENT-HANDOFF.md referenced but missing~~ — file exists at repo root; role also
  covered by `cortex/` (state.js + log.md + agents.md).
- ~~CLAUDE.md palette contradiction~~ — fixed 2026-07-02: section rewritten to the live
  `ap-palette-2026.css` cool-void + brass tokens (verified against `css/main.css` `:root`).
- ~~CLAUDE.md deployment section stale~~ — fixed 2026-07-02: rewritten to the automated
  Pages Actions pipeline + `astroprecise.app` (verified against
  `.github/workflows/deploy-pages.yml` and `website/CNAME`).

## Conventions

- Every page carries a "Last verified" date and links to its sources.
- Prefer updating an existing page over creating a near-duplicate.
- When a page contradicts a repo doc, record it here under lint findings — don't
  silently resolve; newer + verifiable wins only after checking.
