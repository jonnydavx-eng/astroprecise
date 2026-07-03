# Agent Registry & Wiring Protocol

*Last verified: 2026-07-03*

How every agent connects to the shared brain. There are two wiring types:

- **Native** — runs inside a Claude Code session with direct tool access
  (the Cortex Leader and its `.claude/agents/` workers).
- **State protocol** — any external agent (Grok, Hermes, anything else) that works on
  this repo. It cannot be called from inside a Claude session, so it plugs in through
  the shared state instead: read the brain on start, write it back before handing off.
  Same brain, different runtime.

## Registry

| Agent | Wiring | Role |
|---|---|---|
| Claude — Fable (Cortex Leader) | native | Synthesis, judgment, final quality; owns instruction-layer files and `state.js` schema |
| scout | native worker | Cheap read-only recon (`.claude/agents/scout.md`) |
| verifier | native worker | Adversarial claim checking (`.claude/agents/verifier.md`) |
| Maintenance agent | github actions | Weekly cron repo-health sweep; write-gated (issues/PRs only). Needs `ANTHROPIC_API_KEY` |
| Grok | state protocol | Site feature waves (shipped homepage arc v535–v562) |
| Hermes | state protocol | Local offline model + sleep-time memory distiller |

## The protocol (all agents, both wirings)

1. **On start:** grep `cortex/INDEX.md` (the progressive-disclosure map), then read
   `cortex/state.js`, `cortex/memory/shared-learnings.md`, and your own
   `cortex/memory/<you>.md`. Open only the wiki/skill files your mission needs — don't
   re-derive documented knowledge.
2. **Take the contract.** If your mission has a `contract` in `state.js`, echo back its
   objective / deliverable / done-criteria before starting, and work only within its
   scope. Vague handoffs are the #1 cause of wasted multi-agent work.
3. **While working:** use the playbooks in `cortex/skills/`. Claims need proof
   artifacts (commit, test output, file:line). Repo ground rules: honesty (no fake
   data), determinism, `--ap-*` tokens only, bump `sw.js` cache when shipping cached
   assets. Log non-obvious decisions to `cortex/trajectories/M<id>.jsonl` (decisions,
   not just success — agents fail *quietly*).
4. **Before handing off:** run `node cortex/tools/validate-state.mjs`; update
   `state.js` (`meta.generatedAt`/`updatedBy`, missions touched, project `trend`, one
   `activity` entry ≤ 12); append a dated reflection to `cortex/memory/<you>.md`
   Episodes (template in memory/README.md, with `confirmed-by:`); if a mission
   completed, add a `cortex/log.md` entry with proof. Ship memory edits as their own
   `mem(<you>): …` commit. The handoff IS the state + memory update.
5. **Never** mark a mission `done` without a proof artifact from your own run
   (`skills/verify-before-claiming.md`). A mission tagged `gated: true` also needs a
   cross-model verdict in `cortex/verdicts/M<id>.md` (a *different* model than the
   owner). Historical missions are grandfathered — see verdicts/README.md.
6. **Branch per mission.** Work a mission on its own `claude/<slug>` branch; merges are
   gated by CI. Two agents never share a working tree.
7. **Leader only:** periodically distill per-agent memory into
   `memory/shared-learnings.md` (`skills/memory-distill.md`) — verify before folding
   in, evict/archive to stay under budget. Regenerate `INDEX.md` after adding docs
   (`node cortex/tools/build-index.mjs`).

## Bootstrap prompt for external agents (paste-ready)

Give Grok or Hermes this block at the start of any session on this repo:

```
You are working inside the AstroPrecise repo, coordinated through a shared
mission-control state, shared memory, and skill playbooks. Before anything else:
1. grep cortex/INDEX.md                  (map of everything; open only what you need)
2. read cortex/state.js                  (missions, projects, what is running)
3. read cortex/memory/shared-learnings.md (everything all agents have learned)
4. read cortex/memory/<your-name>.md      (your own memory from past sessions)
If your mission has a `contract` in state.js, restate its objective/deliverable/
done-criteria and stay inside its scope. Follow the playbooks in cortex/skills/ —
especially verify-before-claiming.md: never state a conclusion you haven't checked
against the actual repo. Hard rules: never fake data (no invented stats/trends);
same inputs must give the same outputs; use --ap-* CSS tokens, never hardcoded hex;
bump the sw.js cache version if you change cached site assets. Log non-obvious
decisions to cortex/trajectories/M<id>.jsonl. Before you finish: (a) run
`node cortex/tools/validate-state.mjs` and update cortex/state.js (meta.generatedAt,
meta.updatedBy = your name, missions touched, project trend, prepend one activity
entry ≤12); (b) append a dated reflection to cortex/memory/<your-name>.md Episodes
using the template in memory/README.md, filling confirmed-by (or marking UNVERIFIED);
(c) if you completed a mission, append a cortex/log.md entry with a proof artifact.
Commit memory edits as their own `mem(<your-name>): …` commit alongside your work.
```

## Dashboard

`cortex/mission-control.html` renders `state.js` graphically — open it directly in a
browser (no server needed). It shows: what's running now, the mission board grouped by
who's blocked on whom, project health, this registry, and recent activity. If the
board looks stale, the fix is always to update `state.js`, never the HTML.
