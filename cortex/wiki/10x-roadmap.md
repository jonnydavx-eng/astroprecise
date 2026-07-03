# Cortex 10x Roadmap

*Synthesized 2026-07-03 from three parallel research passes (agent memory systems,
mission-control dashboard design, multi-agent orchestration — 2024–2026 web sources)
plus the Leader's knowledge of our constraints: git-file coordination, no shared
server, must work offline for Hermes, GitHub Actions available.*

**Thesis:** v1 built the right skeleton (shared state, memory, skills, one dashboard).
The 10x comes from three shifts: the dashboard answering "do I need to act?" in one
glance instead of showing everything; memory that stays small and verified instead of
growing until nobody reads it; and GitHub Actions becoming an autonomous team member
instead of a passive test gate.

---

## Pillar A — Visual & UX (Dashboard v3)

1. **Exception-first hero line** — one computed sentence at the top: "2 items need
   you · 3 running · all projects nominal". Green is silent; only what needs action
   is loud. (NOC doctrine: INOC, Honeycomb; Grafana z-pattern)
2. **Redundant status encoding** — every status = color + shape + word ("▲ BLOCKED",
   "● RUNNING", "✓ DONE"), one vocabulary reused identically everywhere. Survives
   grayscale and colorblindness (WCAG 1.4.1; Grafana warns against red/green pairs).
3. **Freshness badge** — stamp generated-at into state.js; header shows "Snapshot ·
   14 min ago", turning amber past a threshold. A disk-opened board is always a
   snapshot; say so. (Smashing Magazine 2025 real-time dashboard UX)
4. **Progressive disclosure** — mission cards collapse to status+title+owner by
   default, native `<details>` expand for step/next/proof. ~halves on-screen noise,
   fixes mobile scroll. (NN/g)
5. **Sparkline health tiles** — state.js keeps a short per-project history array;
   render 60×16 inline-SVG sparkline + Δ arrow on each health card. (Tufte word-sized
   graphics)
6. **De-weighted chrome** — drop section headers/borders/registry 1–2 contrast steps
   so only statuses and running items carry full weight. (Linear 2024 redesign)
7. **Thumb-zone mobile** — bottom section-jump bar (Now/Board/Health/Log) on narrow
   viewports, ≥48px tap rows.
8. **Launchpad, not mirror** — every blocked-on-you item carries its action inline:
   copyable command, file path, or deep link. (Datadog incident practice)

## Pillar B — Memory & learning (make it actually compound)

1. **Three-tier memory structure** (the production consensus — CoALA taxonomy):
   each agent file gets `## Episodes` (append-only run log, prunable), `## Learnings`
   (distilled, capped), `## Procedures` (pointers into skills/). Distill pipeline:
   Episodes → Learnings → shared-learnings.md/skills.
2. **Hard core budget** — always-loaded memory capped (~150 lines per agent);
   overflow moves to `memory/archive/` greppable on demand. (MemGPT/Letta insight:
   the byte budget forces compression; matches Claude Code's own 200-line auto-load)
3. **Verified reflection gate** — post-mission reflection template (what failed / why
   / rule for next time) with a required `confirmed-by:` field (test run, rerun,
   leader review). Unverified lessons never enter shared-learnings — 2025-26 research
   shows unverified reflection *degrades* systems (memory confabulation).
4. **Entry metadata + eviction** — `created / last-used / hits` per learning; a
   periodic Leader pass merges near-duplicates and evicts entries unused for N
   missions. Git makes eviction safely revertible. (MemoryBank/Ebbinghaus decay)
5. **Progressive-disclosure INDEX** — one generated `cortex/INDEX.md`: name, one-line
   description, tags for every memory/skill/wiki file. Agents grep the index, open
   only matches. Multiplies what the smallest model (Hermes) can use; zero infra.
   (Anthropic Agent Skills pattern — frontmatter-first loading)
6. **Sleep-time distillation** — Hermes (free, local) runs the compression passes
   between missions: raw episodes → proposed learnings for Leader review. Cloud
   tokens stay reserved for missions. (Letta sleep-time compute)
7. **Memory commits convention** — memory edits ship as dedicated commits
   (`mem(grok): lesson about X`) so the Leader reviews the memory-diff before
   distilling; a bad lesson is a one-line revert. (git-native memory pattern)

## Pillar C — Orchestration & autonomy

1. **Cron maintenance agent** — a scheduled GitHub Actions workflow runs
   `anthropics/claude-code-action` weekly with a maintenance playbook: link check,
   sw.js cache audit, palette-drift grep, STATUS.md freshness, state.js validation.
   Write-gated: it can only open issues/PRs, never push (githubnext/gh-aw
   "safe outputs" pattern). Actions becomes a team member that reads the same board.
2. **Cross-model adversarial verdicts** — a mission can't reach `done` until a
   *different* model than the author files a REFUTE-oriented review (a
   `cortex/verdicts/M<id>.md` convention + Actions check). Our three-model diversity
   is an unusual asset — use it. (Agent-as-a-Judge; multi-LLM verification)
3. **Task contracts** — extend state.js mission schema: objective, deliverable
   file+format, scope boundaries, effort budget, done-criteria. Agents echo the
   contract back before starting. (Anthropic multi-agent system: vague handoffs are
   the #1 duplication/misdirection cause; their orchestrator beat single-agent 90%)
4. **Trajectory logs** — append-only `cortex/trajectories/M<id>.jsonl` per mission
   (agent, decisions, files touched, gate results), attribute names mirroring OTel
   GenAI conventions. Agents "fail gracefully" — exit clean with wrong output — so
   log decisions, not just success. Queryable with jq, no collector needed.
5. **Branch-per-mission isolation** — state.js assigns each mission a branch;
   external agents work only on their branch, merges gated by CI. Hard isolation
   beats clever coordination. (2026 worktree consensus)
6. **Evals for agent instructions** — `cortex/evals/` golden missions with rubrics;
   changes to skills/bootstrap prompt need a judge-scored pass in Actions before
   merge. We gate site code this way; gate the agent layer the same way.
7. **Later: stdio MCP server in-repo** — wrap ephemeris engine, test gates, and the
   state board as MCP tools launchable locally by Claude, Grok's runner, and Hermes
   alike: one tool surface, three agents, zero hosting.

---

## Build order

**Wave 1 — quick wins, one session, no new infrastructure:**
Dashboard v3 (A1–A4, A6, A8) + memory restructure (B1–B3, B5) + task-contract
schema and trajectory-log convention (C3, C4). Pure file/format work.

**Wave 2 — the autonomy jump (needs owner: repo secret `ANTHROPIC_API_KEY`):**
Cron maintenance agent (C1), verdict gate in Actions (C2), sparkline history (A5),
sleep-time distill routine for Hermes (B6), memory-commit convention (B7).

**Wave 3 — compounding quality:**
Evals for playbooks (C6), branch-per-mission (C5), eviction/decay passes (B4),
mobile thumb bar (A7), stdio MCP server (C7).

**Success criteria (how we know it's 10x, not just more):**
- Owner answers "do I need to act?" from the dashboard in <5 seconds.
- An agent picking up a mission reads ≤3 files before being productive.
- Zero missions marked done without a cross-model verdict on record.
- shared-learnings.md stays under 150 lines while its hit-rate (entries actually
  used per mission) rises.
- One autonomous maintenance PR per week with no human prompting.

*Full sourced findings from all three research passes live in the PR/session record;
key sources: Anthropic multi-agent engineering blog, Letta/MemGPT memory tiers,
Reflexion + 2026 confabulation studies, Anthropic Agent Skills standard, githubnext
gh-aw, claude-code-action, Agent-as-a-Judge (arXiv 2410.10934), OTel GenAI
conventions, Grafana/NASA/Linear/NN-g design guidance.*
