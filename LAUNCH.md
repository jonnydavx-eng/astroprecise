# AstroPrecise release operator sheet

Updated: 2026-08-24

Public v895 stays untouched until the final v901 commit has valid Coherence and
exact-identity Cloudflare Pages evidence. Never push a `gh-pages` mirror or deploy
from `main` as a shortcut.

## Local proof

From `C:\Users\jonny\dev\astroprecise`:

```powershell
git status --short --branch
npm ci
node test-release-infrastructure.mjs
npm test
npm run check:syntax
npm run test:launch
npm run test:shop
npm run test:fulfil
npm run build
```

The worktree must contain only intentional release files. Preserve the untracked
`website/phone-audit.html`; it is not part of the deployable build.

## Governance

Use the clean kit at `C:\Users\jonny\dev\coherence-astro-release`. Read the
current manifest; do not trust a copied status word. S12 must come from a distinct
native top-level agent session. Record all declared seats against the same frozen
commit and import signed S1 last.

## Protected release

After the final SHA is immutable and authorised:

1. Create one protected tag `release/ap-v901-<sha12>` at that exact SHA.
2. Confirm GitHub environment `cloudflare-pages` has the intended reviewer and
   environment-scoped Cloudflare account/token secrets.
3. Dispatch `.github/workflows/deploy-pages.yml` from that tag with the full SHA.
4. Approve the environment only after reviewing the displayed tag and SHA.
5. Require the workflow to verify both the `pages.dev` URL and custom domains.

Manual read-only verification:

```powershell
node tools/setup-cloudflare-release-edge.mjs --verify-public --candidate <full-sha>
```

Do not create/move the tag, dispatch, approve, change domains or publish listings
without the owner at the action point. Full account and rollback procedure:
`docs/SHOP-LAUNCH-RUNBOOK.md`.
