---
name: maintenance-sweep
description: The weekly repo-health checklist the autonomous maintenance agent runs; can only open issues/PRs, never push to main.
when_to_use: weekly cron (cortex-maintenance.yml) or on demand
tags: skill, autonomy, maintenance, actions
---

# Skill: Maintenance sweep

The playbook the autonomous maintenance agent (GitHub Actions, weekly cron) runs. It
is **write-gated**: findings become an issue or a PR, never a direct push to `main`.

## Checks (each = one section in the report)

1. **State validity** — `node cortex/tools/validate-state.mjs`. Must pass.
2. **Verdict gate** — `node cortex/tools/check-verdicts.mjs`. Report gated misses.
3. **Index freshness** — run `node cortex/tools/build-index.mjs`; if `INDEX.md` changed,
   the index was stale → include the regenerated file in the PR.
4. **Memory budgets** — `wc -l cortex/memory/*.md`; flag any over the caps in
   `memory/README.md` and suggest a distill pass (`skills/memory-distill.md`).
5. **STATUS.md drift** — compare STATUS.md version against `git log` newest `ap-vNNN`;
   flag if behind (currently Mission M3).
6. **Palette drift** — grep `website/js` for hardcoded warm hexes (`#050406`,
   `#C9A227`); report new occurrences beyond the known M6 list.
7. **SW cache audit** — if `website/**` cached assets changed since the last `sw.js`
   cache-version bump, flag it.
8. **Link/anchor check** — if the site link-checker exists, run it; report breaks.
9. **Site test gates** — run the engine/horoscope/compat/weekly-sky tests; report fails.

## Output contract

One markdown report. If everything is clean → a single "all green" issue comment (or
skip). If anything needs action → open an issue titled `cortex maintenance: <date>`
with a checklist, or a PR when the fix is mechanical and safe (e.g. regenerated
INDEX.md). Never push to main. Always update `cortex/state.js` activity with a
one-line entry so the board shows the sweep ran.

## Boundaries

- Read-broad, write-narrow. No feature work, no refactors, no palette sweeps without
  owner sign-off (M6 is owner-gated).
- If a check needs a decision, the report asks the owner — it does not decide.
