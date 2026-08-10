# STATUS — AstroPrecise

**State:** Live at https://astroprecise.app, serving **ap-v830**. Commerce is dormant by design — all 12 Gumroad permalink slots read `REPLACE_ME`, so every buy control renders "Notify me — £x" and nothing can take money.
Updated: 2026-08-10 (Codex @ BOOK-T1H4NJ753R)

## Measured 2026-08-10

| Check | Result | How |
|-------|--------|-----|
| Live service-worker version | `ap-v830` | `GET https://astroprecise.app/sw.js?release=bfc650b` → 200; response contains `ap-v830` |
| Live Explore delivery | `v830` assets HTTP 200 | `GET /explore.html?release=bfc650b`, `/css/explore-page-v830.css?release=bfc650b` |
| GitHub `main` | `bfc650badc6f7bfd440d55f9677e1e21c70f546c` | GitHub API ref check after authorized push |
| GitHub Pages workflow | success | [run 31390570630](https://github.com/jonnydavx-eng/astroprecise/actions/runs/31390570630) |
| Release proofs | pass | `node test-orrery-adapter.mjs`; `node test-release-honesty.mjs` |
| CI test, build, Lighthouse and deploy jobs | success | GitHub Actions run 31390570630 |

The detailed 2026-08-08 tree/byte measurements below remain historical and are still labelled with their original date.

## Measured 2026-08-08

Everything in this section was measured on this machine on this date. Nothing is inherited.

| Check | Result | How |
|-------|--------|-----|
| Live service-worker version | `ap-v813` | `GET https://astroprecise.app/sw.js?cb=<ts>` → 200 |
| Local HEAD version | `ap-v813` | `website/sw.js` line 7, `const V = "ap-v813"` — matches live |
| Home page | HTTP 200 | direct fetch |
| `/eclipse.html` | HTTP 200 | direct fetch |
| Whole deployed tree reachable | 842/842 paths HTTP 200, 0 bad | `node tools/sweep.mjs` |
| Live bytes vs a local build of HEAD | 842 paths, **0 mismatches** | `npm run build && node tools/byte-audit.mjs` |
| Eclipse countdown target | 12 Aug 2026 **17:45:57 UT** (= 18:46 BST) | `website/eclipse.html`, `Date.UTC(2026, 7, 12, 17, 45, 57)` — corrected 2026-08-09 from a flat 17:46; the ΔT working is in the comment above it |
| Test suites | **19** | 13 root `test-*.mjs` + 5 `tools/_proof-*.mjs` + `ephemeris-package/test/smoke.test.mjs` |

On the byte comparison: 120 of the 842 files are served a few bytes shorter than
the local build. Every one of those deltas equals that file's CRLF count exactly —
`core.autocrlf=true` on this Windows checkout, LF on the Ubuntu CI runner that
builds and deploys. Content is identical. `tools/byte-audit.mjs` classifies these
separately and does not count them as mismatches.

## Not measured — do not claim

- Real-phone orrery pass (bloom/ACES pipeline is code-reviewed and gated, never device-verified).
- End-to-end purchase. Impossible until Gumroad products exist.
- Test suite pass/fail. The 19 suites were **counted**, not run, in this stamp.

## Release evidence still open

- Formal Coherence v2.1 `LIVE` receipt was not minted. Codex native S8 identity preflight rejected the detached shell, and Hermes could not run its native reviewer because the paid model account had no available credits. The product was pushed and deployed through the authorized GitHub Pages workflow; no validator receipt is claimed.

## Open owner blockers

1. **6 Gumroad permalinks** — 12 `REPLACE_ME` slots across `website/js/gumroad-unlock.js` (lines 33–39) and `website/js/ap-gumroad-bridge.js` (lines 13–18). Nothing can be sold until these are pasted. See `ECLIPSE-RUNBOOK.md` §1b.
2. **Legal name and postal address** — `[FULL LEGAL NAME]` / `[POSTAL ADDRESS]` placeholders are live on the public site at `website/privacy.html` lines 129 and 131 and `website/terms.html` lines 131 and 132. (`contact.html` has none, despite what the old runbook said.)
3. **Fixed-offset timezone dropdowns with no DST history** — `website/index.html` line 351 (nine options) and `website/eclipse.html` lines 141–143 (seven options). A UK summer birth entered as "UT / GMT" is cast an hour out, which can move the Ascendant by a whole sign. Accuracy issue, not cosmetic.
4. **Focused browser QA passed** — live Chrome desktop plus 390×844 mobile emulation reached the real v830 3D model with two canvases, no horizontal overflow, and the plaque removed from the full model. Physical Safari/device and WebBridge receipt remain unmeasured.

## Reference

- `ECLIPSE-RUNBOOK.md` — flip-day checklist, deploy discipline, ops, QA.
- `marketing/ECLIPSE-LAUNCH-PACK-2026-08-12.md` — email/social pack, commerce-gated; eclipse-day timeline.
- `docs/DECISION-LOG.md` — no React rewrite; no Swiss Ephemeris (AGPL).
- `tools/byte-audit.mjs` / `tools/sweep.mjs` — deploy verifiers; re-measure before quoting this file.

⚠️ **Deploy warning:** pushing to `origin/main` auto-deploys production via
`.github/workflows/deploy-pages.yml` on any change under `website/**` (plus a
named list including `tools/build.mjs` and most root test suites). Do not push
without the owner's say-so.
