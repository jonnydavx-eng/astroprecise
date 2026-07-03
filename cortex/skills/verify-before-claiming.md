# Skill: Verify before claiming

Every claim gets an attempt at refutation before it's recorded or acted on.
This is the single highest-leverage habit in the system — it caught a stale
CLAUDE.md that would have reintroduced a retired palette, and it corrected the
Leader's own edits before they shipped.

## Procedure

1. **State the claim precisely.** "The live palette is cool-void + brass" — not
   "the docs are probably right."
2. **Ask: what evidence would refute this?** A file, a command output, a date, a
   commit. If you can't name potential counter-evidence, the claim is too vague —
   go back to step 1.
3. **Go look.** Read the actual file (not a doc about the file), run the actual
   command, check the actual git history. Docs describe intent; the repo is reality.
   - Palette claims → read `website/css/` token files
   - Deploy claims → read `.github/workflows/`
   - "What shipped" claims → `git log`, not STATUS.md
4. **Verdict:** CONFIRMED (evidence found, cite file:line / commit / output),
   REFUTED (counter-evidence found — record THAT instead), or UNVERIFIED
   (couldn't check — say so explicitly; an unverified claim is never written as fact).
5. **Record with the evidence attached.** In state.js `proof`, in log.md, or in a
   wiki page's "Last verified" line. A claim without its evidence rots into folklore.

## When to run it

- Before marking any mission `done` in `state.js` (rule 4 of the agent protocol).
- Before editing instruction-layer files (CLAUDE.md, DESIGN.md, wiki pages).
- Before trusting any doc older than the newest commit that touches its subject.
- On another agent's finding before folding it into `memory/shared-learnings.md`.

## Adversarial mode (two-agent version)

When the stakes are high and a second agent/model is available: hand it the claim
with the instruction "try to REFUTE this; default to refuted if uncertain" and let
it hunt independently. Independent skepticism catches what self-review misses.
Claude sessions: spawn the `verifier` worker. Grok/Hermes: run steps 1–5 yourself
in a fresh pass, deliberately hunting counter-evidence only.
