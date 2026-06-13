# STATUS — AstroPrecise · 2026-06-13

**State:** Feature-complete and engine-correct. Major correctness sweep verified (planets via VSOP87, RA-semi-arc Placidus houses, ascendant 180° bug fixed). Design overhaul done (engraved sprite, 3-font system). **One git push from live.**

## Open / ongoing
- **Not deployed yet** — `git push origin main gh-pages` hasn't run because this machine has no stored GitHub credentials (push prompts interactively).
- Desktop saved-page snapshot (`AstroPrecise.html` + `_files`) is stale — delete candidate.

## Suggested next steps
1. From `OneDrive\astroprecise`: run `git push origin main gh-pages` once (browser sign-in pops, creds then cached) → corrected charts go live.
2. Flip GitHub **Pages → Actions** when convenient (the `deploy-pages.yml` workflow auto-deploys `website/**`).
3. Verify the live site, then delete the stale Desktop snapshot.

*Full history: AGENT-HANDOFF.md here (has its own CLAUDE.md too). Tracked in the Master Project Document.*
