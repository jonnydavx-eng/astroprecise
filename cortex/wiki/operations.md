# Operations — How the Cortex System Works

*Last verified: 2026-07-02*

## Environment reality (important)

Cortex sessions run in **ephemeral remote containers** (Claude Code on the web /
GitHub integration), not a persistent local machine:

- Repos are cloned fresh at session start; the container is reclaimed after inactivity.
- **Anything not committed and pushed is lost.** The hub therefore lives in-repo
  (`cortex/` in `astroprecise`) — never rely on files outside the repo persisting.
- No `gh` CLI; GitHub operations go through the GitHub MCP tools.
- Work happens on designated `claude/…` branches; PRs are opened as drafts.

## Delegation policy (Capability-Based Delegation)

Per mission, split work by capability:

- **Leader handles directly:** synthesis, architecture, final quality judgment,
  anything long-horizon or high-stakes, all final review of delegated output.
- **Delegate to cheap workers** (`.claude/agents/`): broad file cataloging, mechanical
  sweeps, independent verification passes, parallel read-only exploration.
- The leader is always responsible for the final result — delegated output gets
  verified before it's trusted (spot-check facts against files, run tests).
- "Pure Fable Mode" = user directive to do everything without delegation.

Current workers:
- `scout` — cheap read-only explorer for fan-out searches and doc cataloging.
- `verifier` — adversarial checker; tries to refute claims before they're recorded.

## Wiki procedures

- **Ingest:** read `cortex/index.md` first → create/update pages under `cortex/wiki/`
  with cross-links → update the index table → append a log entry.
- **Query:** before complex work, read `index.md` and pull only relevant pages;
  don't re-derive documented knowledge.
- **Lint:** when touching a page, check its claims against the repo's current state;
  contradictions go in `index.md` § Open lint findings, not silently resolved.

## Goals & loops rules

- Every loop/goal declares a visible **brake** (e.g. "stop after 25 turns") and a
  **proof-of-completion artifact** produced by the current run.
- Progress claims without an artifact from the current run don't count.

## Project ground rules that override defaults

- AstroPrecise honesty rule: never fake data; unavailable feeds say so.
- Determinism: same inputs → same reading (FNV-1a/mulberry32 seeding).
- Privacy: all computation in-browser; only labelled public feeds go out.
- Bump `sw.js` cache version when changing cached site assets.
