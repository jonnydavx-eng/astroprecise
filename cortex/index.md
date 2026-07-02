# Cortex Knowledge Base — Index

Master index of the LLM-Wiki knowledge base. **Read this first** before complex work;
update it whenever a wiki page is added, renamed, or retired.

- `wiki/` — synthesized, cross-referenced knowledge pages (the durable layer)
- `raw/` — unprocessed source material awaiting ingest
- `log.md` — mission log (what was done, when, with what proof)

## Wiki Pages

| Page | Covers | Last updated |
|---|---|---|
| [mission-plan.md](wiki/mission-plan.md) | **Active mission plan** — current missions, status, standing orders | 2026-07-02 |
| [operations.md](wiki/operations.md) | How the Cortex system works: environment reality, delegation policy, goals/loops rules, ingest/query/lint procedures | 2026-07-02 |
| [astroprecise-state.md](wiki/astroprecise-state.md) | Current technical state of the AstroPrecise site + app: deployment truth, palette, versioning, known doc contradictions | 2026-07-02 |
| [astroprecise-business.md](wiki/astroprecise-business.md) | Launch/monetization strategy synthesized from the 21 root planning docs, with phase gates and doc map | 2026-07-02 |
| [davit-sat-dashboard.md](wiki/davit-sat-dashboard.md) | Satellite dashboard repo — currently an untouched Streamlit blank template | 2026-07-02 |

## Open lint findings

1. **STATUS.md behind git history** — snapshot says ap-v563; `main` history shows
   ap-v566 (PayPal direct replaced Lemon Squeezy, e2e PayPal gate, LS tooling archived).
   Fix tracked as Mission 3 in [mission-plan.md](wiki/mission-plan.md).

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
