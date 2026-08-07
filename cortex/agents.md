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
| Grok | state protocol | Site feature waves (shipped homepage arc v535–v562) |
| Hermes | state protocol | Local model on the owner's machine |

## The protocol (all agents, both wirings)

1. **On start:** read `cortex/index.md`, `cortex/state.js`, and the wiki pages relevant
   to your mission. Do not re-derive documented knowledge.
2. **While working:** claims need proof artifacts (commit hash, test output, file:line).
   Follow repo ground rules: honesty (no fake data), determinism, `--ap-*` tokens only,
   bump `sw.js` cache when shipping cached assets.
3. **Before handing off:** update `cortex/state.js` — `meta.updated`/`updatedBy`, the
   missions you touched, one new `activity` entry (newest first, keep ≤ 12). If you
   completed a mission, append a `cortex/log.md` entry with proof. Commit these with
   your work — the handoff IS the state update.
4. **Never** mark a mission `done` without a proof artifact from your own run.

## Bootstrap prompt for external agents (paste-ready)

Give Grok or Hermes this block at the start of any session on this repo:

```
You are working inside the AstroPrecise repo, which is coordinated through a shared
mission-control state. Before doing anything else, read these files in order:
1. cortex/index.md        (knowledge-base index + open lint findings)
2. cortex/state.js        (current missions, projects, what is running)
3. cortex/wiki/mission-plan.md  (mission detail and standing orders)
Then do your assigned mission. Hard rules: never fake data; same inputs must give the
same outputs; use --ap-* CSS tokens, never hardcoded hex; bump the sw.js cache version
if you change cached site assets. Before you finish: update cortex/state.js
(meta.updated, meta.updatedBy = your name, the missions you touched, and prepend one
activity entry), and if you completed a mission, append an entry to cortex/log.md with
a proof artifact (commit hash / test output). Commit the state update together with
your work.
```

## Dashboard

`cortex/mission-control.html` renders `state.js` graphically — open it directly in a
browser (no server needed). It shows: what's running now, the mission board grouped by
who's blocked on whom, project health, this registry, and recent activity. If the
board looks stale, the fix is always to update `state.js`, never the HTML.


## Coherence — v2.1 (pointer)

Retired v1 doctrine removed 2026-08-07 (owner-authorized sweep; archive: `control-panel\RETIRED-DOCTRINE-ARCHIVE.md`).
Current law: `C:\Users\jonny\dev\coherence\policy\coherence-policy.json` (kit `C:\Users\jonny\dev\coherence`, skill `coherence`).
Lanes No-wave/Fast/Standard/Full; builder never verifies; only the validator emits `CODE-ONLY | BLOCK-SHIP | VERIFIED-LOCAL | READY-SHIP | LIVE`.
