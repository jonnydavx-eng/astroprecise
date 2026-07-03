# Cortex Knowledge Base — Index

Master index of the LLM-Wiki knowledge base. **Read this first** before complex work;
update it whenever a wiki page is added, renamed, or retired.

- `INDEX.md` — **grep this first**: auto-generated progressive-disclosure map of every
  cortex doc (regenerate with `tools/build-index.mjs`)
- `mission-control.html` — **graphical dashboard v3** (exception-first; open in a browser)
- `state.js` — machine-readable shared state every agent reads/updates (the live brain);
  validate with `tools/validate-state.mjs`
- `agents.md` — agent registry + wiring protocol (incl. bootstrap prompt for Grok/Hermes)
- `memory/` — 3-tier per-agent memory + `shared-learnings.md` (the one clean distilled
  spot) + `archive/`
- `skills/` — executable playbooks (verify, delegate, ship, ingest, distill, maintain)
  with progressive-disclosure frontmatter; usable by any agent, online or offline
- `tools/` — dependency-free validators (state, verdicts, index)
- `trajectories/` — per-mission decision logs (JSONL) · `verdicts/` — cross-model
  reviews · `evals/` — golden missions · `mcp/` — stdio MCP server for shared tools
- `wiki/` — synthesized, cross-referenced knowledge pages (the durable layer)
- `raw/` — unprocessed source material awaiting ingest
- `log.md` — mission log (what was done, when, with what proof)

## Wiki Pages

| Page | Covers | Last updated |
|---|---|---|
| [mission-plan.md](wiki/mission-plan.md) | **Active mission plan** — current missions, status, standing orders | 2026-07-02 |
| [10x-roadmap.md](wiki/10x-roadmap.md) | Researched 10x upgrade plan: dashboard v3, compounding memory, autonomy via Actions — 3 waves | 2026-07-03 |
| [operations.md](wiki/operations.md) | How the Cortex system works: environment reality, delegation policy, goals/loops rules, ingest/query/lint procedures | 2026-07-02 |
| [astroprecise-state.md](wiki/astroprecise-state.md) | Current technical state of the AstroPrecise site + app: deployment truth, palette, versioning, known doc contradictions | 2026-07-02 |
| [astroprecise-business.md](wiki/astroprecise-business.md) | Launch/monetization strategy synthesized from the 21 root planning docs, with phase gates and doc map | 2026-07-02 |
| [davit-sat-dashboard.md](wiki/davit-sat-dashboard.md) | Satellite dashboard repo — currently an untouched Streamlit blank template | 2026-07-02 |

## Open lint findings

1. **STATUS.md behind git history** — snapshot says ap-v563; `main` history shows
   ap-v566 (PayPal direct replaced Lemon Squeezy, e2e PayPal gate, LS tooling archived).
   Fix tracked as Mission 3 in [mission-plan.md](wiki/mission-plan.md).
2. **AGENT-HANDOFF.md referenced but missing** — STATUS.md points to "AGENT-HANDOFF.md"
   for full history and a prioritized roadmap, but no such file exists in the repo.
   Its role is now covered by `cortex/` (state.js + log.md + agents.md); either restore
   the file or update STATUS.md's pointer when doing Mission 3.
2. **Warm hexes still hardcoded outside the token system** (verifier, 2026-07-02) —
   `#050406`/`#C9A227` live on as literal canvas/WebGL/SVG paint colors in
   `js/chart-render.js:64,320`, `js/chart-page.js:1488`, `js/instrument.js:238,358`,
   `js/orrery-webgl.js:2415,4673`, `js/compatibility-page.js:109`,
   `js/tool-cards.js` (6 spots), `css/main.css:5825` (SVG data-URI),
   `saturn-return.html:282`, plus inert `var(--gold,#C9A227)` fallbacks in `js/app.js`.
   Also: 7 utility/dev pages carry no theme-color meta. Tracked as Mission 6.

### Resolved

- ~~CLAUDE.md palette contradiction~~ — fixed 2026-07-02: section rewritten to the live
  `ap-palette-2026.css` cool-void + brass tokens (verified against `css/main.css` `:root`).
- ~~CLAUDE.md deployment section stale~~ — fixed 2026-07-02: rewritten to the automated
  gh-pages Actions pipeline + `astroprecise.app` (verified against
  `.github/workflows/deploy-pages.yml` and `website/CNAME`).

## Conventions

- Every page carries a "Last verified" date and links to its sources.
- Prefer updating an existing page over creating a near-duplicate.
- When a page contradicts a repo doc, record it here under lint findings — don't
  silently resolve; newer + verifiable wins only after checking.
