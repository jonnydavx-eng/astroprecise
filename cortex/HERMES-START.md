---
description: One-file onboarding to run Hermes (local, free) as a Cortex agent — setup, bootstrap prompt, and a first mission.
tags: hermes, free-mode, onboarding
---

# Start Hermes as a Cortex agent

Hermes is the free/offline workhorse. Use it for **bounded, verifiable** work
(doc sync, state updates, maintenance sweeps, first drafts, cataloging). Keep the
judgment-heavy missions for a stronger model — and let the verdict gate + validators
catch anything weak. This file is everything you need to start.

## 0. Prerequisites (one time)

1. The repo is cloned on the machine Hermes runs on, on the working branch:
   `git clone <repo> && cd astroprecise && git checkout claude/cortex-leader-setup-053e58`
2. Node 18+ installed (only needed to run the free validators — `node -v` to check).
3. Decide your mode:
   - **Driver mode** (any chat model): you paste prompts/files into Hermes and apply
     its edits yourself. Works with plain Ollama/LM Studio chat. Start here.
   - **Agent mode** (Hermes inside Aider / Cline / Continue / Open Interpreter, etc.):
     Hermes reads/edits files and runs commands itself. More setup, more autonomous.

## 1. Give Hermes the bootstrap prompt

Paste this as Hermes's system/first message (it's the same prompt from `agents.md`):

```
You are Hermes, working inside the AstroPrecise repo, coordinated through a shared
mission-control state, memory, and skill playbooks. Before anything else, read:
1. cortex/INDEX.md                    (map of everything; open only what you need)
2. cortex/state.js                    (missions, projects, what is running)
3. cortex/memory/shared-learnings.md  (everything all agents have learned)
4. cortex/memory/hermes.md            (your own memory from past sessions)
If your mission has a `contract` in state.js, restate its objective/deliverable/
done-criteria and stay inside its scope. Follow cortex/skills/ — especially
verify-before-claiming.md: never state a conclusion you haven't checked against the
actual repo. Hard rules: never fake data; same inputs give same outputs; use --ap-*
CSS tokens, never hardcoded hex; bump sw.js cache if you change cached site assets.
Before you finish: run `node cortex/tools/validate-state.mjs`; update cortex/state.js
(meta.generatedAt, meta.updatedBy = "Hermes", missions touched, project trend, one
activity entry); append a dated reflection to cortex/memory/hermes.md Episodes with a
`confirmed-by:` line (or UNVERIFIED); if you finished a mission add a cortex/log.md
entry with proof. Commit memory as its own `mem(hermes): …` commit.
```

## 2. Give it the first mission — M3 (a safe starter)

M3 is `open`, owned by "any agent", bounded, and machine-verifiable — ideal for a
first run. Paste this after the bootstrap:

```
Your mission is M3 (see cortex/state.js). Contract:
- objective: bring STATUS.md in sync with shipped reality (the site is at ap-v566).
- deliverable: edited STATUS.md; resolve the AGENT-HANDOFF.md pointer (that file
  doesn't exist — see cortex/index.md lint findings; point it at cortex/ instead).
- scope: STATUS.md only. Do NOT touch site/app code.
- done when: STATUS.md's version, date, and open-items match `git log` + the lint
  findings in cortex/index.md.
Steps: read STATUS.md and `git log --oneline -8`; edit STATUS.md; then set M3 to
status "done" in state.js with a proof (the commit), and do the handoff in step 1.
```

## 3. Verify before trusting (always, but especially for a weak model)

After Hermes proposes changes, run these — they need no model and no credits:

```
node cortex/tools/validate-state.mjs     # state integrity + honesty invariants
node cortex/tools/check-verdicts.mjs     # verdict gate
node cortex/tools/build-index.mjs        # refresh INDEX.md if docs changed
```

If validate-state fails, the change is not ready — hand the error back to Hermes.
For any non-trivial mission, get a **cross-model verdict** before marking it done:
have a *different* model review it and write `cortex/verdicts/M<id>.md` (a Hermes
self-review does NOT satisfy the gate — the checker rejects it).

## 4. Commit + push

Driver mode: you commit (`git add … && git commit && git push`). Agent mode: Hermes
does it. Either way, memory edits go in their own `mem(hermes): …` commit.

---

## What Hermes is good / not good at (be honest with it)

- **Good:** following these playbooks, STATUS/doc sync, running + reacting to the
  validators, the maintenance-sweep checklist, cataloging, first drafts.
- **Not good:** deep synthesis, novel design, high-stakes judgment. Don't give it the
  Leader role for anything that ships to users without a stronger-model verdict.
- **Free floor:** even with no capable model at all, the validators + CI `checks` job
  keep integrity/honesty enforced for free. Hermes adds *labor* on top of that floor.
