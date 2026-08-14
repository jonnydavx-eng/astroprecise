# STATUS — AstroPrecise

**State:** Friday 14 Aug 2026 morning (Europe/London). Live site stays on hold at the current version until Jonny pastes the Gumroad listing. Helm is not shipping.

## 14 Aug note
- PR #12 (Gumroad product_id) merged 12 Aug.
- Codex review credits exhausted on that PR.
- Helm will not push or deploy.
- Version numbers and live checks below are 12 Aug measurements. Not re-measured this morning.

---

# STATUS — AstroPrecise

**Live (origin, until you push):** https://astroprecise.app still ships **ap-v849**. Gumroad product `your-eclipse-reading`; licence product_id `3ZwFjg0IW702KvJ5s97QuQ==`.

**Local candidate (this machine, not live):** **ap-v850** post-eclipse hub + natal-wheel £7 edition. Measured 2026-08-12 21:47 BST — `node test-eclipse-edition.mjs` and `npm run test:launch` proofs PASS locally. Not pushed.

Updated: 2026-08-12 (Cursor @ BOOK-T1H4NJ753R — post-eclipse hub, not deployed)

## Measured 2026-08-12 — ap-v847 Gumroad product_id hotfix

| Check | Result | How |
|-------|--------|-----|
| Live service-worker version | **ap-v847** | Cache-busted GET https://astroprecise.app/sw.js |
| Live Gumroad bridge productId | **3ZwFjg0IW702KvJ5s97QuQ==** | Cache-busted GET /js/ap-gumroad-bridge.js — stale `30971` absent |
| Live View content guidance | present | Cache-busted GET /js/ap-eclipse-edition-v841.js + /shop.html |
| Gumroad public product.id | **3ZwFjg0IW702KvJ5s97QuQ==** | Parsed from https://davxplorer3.gumroad.com/l/your-eclipse-reading `data-page` |
| Released application commit | `deca88ad667a910ad627b764b7456bbb356d62a0` | Fast-forward main from PR #12 (owner-authorized deploy) |
| GitHub Pages workflow | success | [run 31631737228](https://github.com/jonnydavx-eng/astroprecise/actions/runs/31631737228) (test → build → deploy) |
| Local launch proofs | PASS | `npm run test:launch` + gumroad / orrery / edition / honesty gates |
| Coherence v2.1 receipt | **LIVE** | Independent verifier seat (not builder). Residual risks below remain open. |

### Coherence residuals (do not erase)

1. **Real licence unlock untested** — no live purchase was used against `api.gumroad.com/v2/licenses/verify` with the corrected product_id.
2. **SW eviction lag** — returning visitors may keep `ap-v846` until the next navigation activates the new worker.
3. Native Coherence kit path (`C:\Users\jonny\dev\coherence`) was not available in this cloud seat; the LIVE verdict is from an independent adversarial verifier agent following the same five-verdict grammar.

## Measured 2026-08-10

| Check | Result | How |
|-------|--------|-----|
| Live service-worker version | ap-v833 | Cache-busted GET /sw.js returned 200 and the v833 worker |
| Released application commit | 385b37a9def95522fdea9c1c56fde770f718e1fd | Fast-forwarded to redesign/editorial-front-screen and main with the owner's explicit authorization |
| GitHub Pages workflow | success | [run 31418936515](https://github.com/jonnydavx-eng/astroprecise/actions/runs/31418936515) |
| Critical live assets | 3/3 exact SHA-256 matches | ap-living-sky-v833.css, ap-nav-model-v833.js and ap-observatory-v833.js matched the local production build byte-for-byte |
| Live index | content-identical | Live was 29 bytes shorter; local contained exactly 29 CRLF pairs and normalized text was equal |
| Live desktop + 390px UI gate | pass | Real-domain v833 gate: one WebGL model, System start, all worlds/scales, interrupted Mars→Jupiter, deep links, five route shells, four mobile tabs, no overflow or runtime errors |
| Local release gates | pass | Production build; test:ui; full npm test; syntax 140/140; launch proofs; lint 0 errors; agent-verify fail_signals=0 |

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

## Not measured in the 2026-08-08 stamp — do not claim from that stamp

- Real-phone orrery pass (bloom/ACES pipeline is code-reviewed and gated, never device-verified).
- End-to-end purchase. Impossible until Gumroad products exist.
- Test suite pass/fail. The 19 suites were **counted**, not run, in this stamp.

## Open owner blockers

1. **Owner spot-check:** one real (or refunded) Gumroad purchase → View content → paste licence on eclipse unlock.
2. **Fixed-offset timezone dropdowns with no DST history** — website/index.html and website/eclipse.html use manual offsets. A UK summer birth entered as "UT / GMT" is cast an hour out, which can move the Ascendant by a whole sign. Accuracy issue, not cosmetic.
3. **Physical-device pass remains unmeasured** — live Chrome desktop and 390×844 emulation both passed against earlier tips; a real S24/Safari-class GPU and touch pass is still external evidence.

## Reference

- `ECLIPSE-RUNBOOK.md` — flip-day checklist, deploy discipline, ops, QA.
- `marketing/ECLIPSE-LAUNCH-PACK-2026-08-12.md` — email/social pack, commerce-gated; eclipse-day timeline.
- `docs/DECISION-LOG.md` — no React rewrite; no Swiss Ephemeris (AGPL).
- `tools/byte-audit.mjs` / `tools/sweep.mjs` — deploy verifiers; re-measure before quoting this file.
- PR #12 — ap-v847 product_id + View content hotfix.

⚠️ **Deploy warning:** pushing to `origin/main` auto-deploys production via
`.github/workflows/deploy-pages.yml` on any change under `website/**` (plus a
named list including `tools/build.mjs` and most root test suites). Do not push
without the owner's say-so.
