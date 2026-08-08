# STATUS — AstroPrecise

**State:** Live at https://astroprecise.app, serving **ap-v813**. Commerce is dormant by design — all 12 Gumroad permalink slots read `REPLACE_ME`, so every buy control renders "Notify me — £x" and nothing can take money.
Updated: 2026-08-08 (Claude @ BOOK-T1H4NJ753R)

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
| Eclipse countdown target | 12 Aug 2026 **17:46 UT** | `website/eclipse.html` line 269, `Date.UTC(2026, 7, 12, 17, 46)` |
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

## Open owner blockers

1. **6 Gumroad permalinks** — 12 `REPLACE_ME` slots across `website/js/gumroad-unlock.js` (lines 33–39) and `website/js/ap-gumroad-bridge.js` (lines 13–18). Nothing can be sold until these are pasted. See `ECLIPSE-RUNBOOK.md` §1b.
2. **Legal name and postal address** — `[FULL LEGAL NAME]` / `[POSTAL ADDRESS]` placeholders are live on the public site at `website/privacy.html` lines 129 and 131 and `website/terms.html` lines 131 and 132. (`contact.html` has none, despite what the old runbook said.)
3. **Fixed-offset timezone dropdowns with no DST history** — `website/index.html` line 351 (nine options) and `website/eclipse.html` lines 141–143 (seven options). A UK summer birth entered as "UT / GMT" is cast an hour out, which can move the Ascendant by a whole sign. Accuracy issue, not cosmetic.
4. **Four design decisions** awaiting a yes/no — `docs/DESIGN-PLAN-2026-08-05.md` §7.
5. **Higgsfield: does MCP generation consume the unlimited allowance or bill credits?** — unresolved, see below. Unlimited *is* active (web app); the API just doesn't report it.

## Higgsfield / Seedance connector — measured 2026-08-08

**The account connection is permanent; the per-chat toggle is not.** Measured via
`ListConnectors` 2026-08-08: Higgsfield reads `installState: "connected"`,
`connected: true`, `enabledInChat: false`. So the claude.ai account-level OAuth link
is installed and valid — there is nothing to reconnect — but the connector is
**toggled off for the chat**, which is why its tools appeared mid-session and then
vanished, and why BOOK-T1H4NJ753R never saw them.

**Fix: enable Higgsfield in that chat's connector settings.** Restarting the session
alone does not do it; connectors are enabled per chat, independently of the account
connection. No agent tool can flip this — `ListConnectors` / `SuggestConnectors` only
read and recommend — so it is an owner action in the UI.

**Not wireable from the repo.** Higgsfield is a claude.ai connector, not a
project-scoped MCP server: there is no `.mcp.json` here and no `mcpServers` key in
`~/.claude.json`, and `SuggestConnectors` returns no URL for an already-installed
connector. So a checked-in config cannot make it available to every session. Do not
invent a server URL to try.

| Check | Result | How |
|-------|--------|-----|
| Connector auth | OK | `balance` returned live account data |
| Plan | `plus` | `balance` |
| Credit balance | 912.5 | `balance` |
| Monthly grant | +1000 at 2026-08-08 11:48 UT | `transactions` |
| Unlimited entitlement **over MCP** | **`unlim.available: false`** — but see below, this is wrong | `models_explore` — account-level and on `seedance_2_5` |
| Models carrying `supports_unlim` | `kling3_0` only, of the 10 video models on page 1 | `models_explore` search |
| Seedance 2.5 max resolution | **720p** (`480p`/`720p` only) | `models_explore` get |
| Observed Seedance cost | 97.5 credits for 15s @ 720p, audio on = **6.5 credits/sec** | `transactions` + `show_generations` |

### The unlimited entitlement IS active — the MCP surface does not show it

Owner's Higgsfield web app (screenshot, 2026-08-08 13:19 local) shows **8 models
currently unlimited**, including:

| Model | Window | Quality | Starts | Expires | Status |
|-------|--------|---------|--------|---------|--------|
| Seedance 2.5 Unlimited | 33-day | 720p | Aug 8 2026 | **Sep 10 2026** | Active |
| Nano Banana 2 Unlimited | 7-day | 2K | Aug 8 2026 | **Aug 15 2026** | Active |
| FLUX.2 Pro | 365 Unlimited | 1K | auto-renewing | auto-renewing | Active |

So `unlim.available: false` from `models_explore` is a **reporting gap in the MCP/API
surface**, not a billing or signup problem. Do not conclude from the API alone that
there is no unlimited allowance — check the web app.

**Open question, unresolved:** does generating *through the MCP connector* consume the
unlimited allowance, or bill credits regardless? Generation
`d5ea68be-9f47-4e51-a65c-ec6bf0d28e99` (Seedance 2.5, 15s, 720p, audio on) was
**charged 97.5 credits** at 2026-08-08 11:53 UT, and the web app's counters read
"0 free generations in total / +$0 saved in total" at 13:19 — consistent with either
(a) that clip predating promo activation, or (b) the API path not honouring unlimited.
Cheap way to settle it: run one short generation over MCP, then re-check `balance` and
the web app's free-generation counter. **Until settled, prefer the web app for bulk
generation** — if (b) is true, the connector is the expensive path.

### Not measured — do not claim

- Which of (a) or (b) above is true.
- Any credit cost other than the single 15s Seedance generation above.
- Cost of `generate_image` / image models — never called.
- Whether `generate_image` over MCP maps to Nano Banana 2 or FLUX.2 Pro (the two
  unlimited image models) or to some other default.

### Time-boxed: Nano Banana 2 expires 15 Aug

The 2K image allowance is the **shortest** window and covers two unbuilt assets:
the 1024×500 Play Store feature graphic (`PLAY-STORE-PACK.md` §6 / line 181) and
Pinterest pin variations (`CONTENT-CALENDAR.md` wants 3–4/week). Use it before
15 Aug or lose it. Seedance video has until 10 Sep, so it is not the urgent one.

### If a hero clip does get generated

`website/js/ap-seedance.js` and the inert `<video id="orrery-seedance">` in
`index-classic.html` are already built and waiting on
`website/assets/video/orrery-loop.mp4`. Two corrections to make **before** spending
credits:

- The prompt in `website/assets/video/README.md` still specifies the **retired**
  warm palette (`#040305` void, `#C9A227` gold). Live tokens are cool void `#0C1016`
  + brass `#C2A05E` (CLAUDE.md). Generating from it as written produces off-brand
  footage.
- Seedance defaults `generate_audio: true`. The hero `<video>` is muted and the
  README strips audio on encode — generate with audio **off**.

Activating the clip edits `index.html` and bumps the service worker, so it must ride
the one pre-eclipse deploy or wait until after 12 Aug (freeze starts 11 Aug 20:00 UT,
`SHIP-PLAN-2026-08-08.md` §1.5).

## Reference

- `ECLIPSE-RUNBOOK.md` — flip-day checklist, deploy discipline, ops, QA.
- `marketing/ECLIPSE-LAUNCH-PACK-2026-08-12.md` — email/social pack, commerce-gated; eclipse-day timeline.
- `docs/DECISION-LOG.md` — no React rewrite; no Swiss Ephemeris (AGPL).
- `tools/byte-audit.mjs` / `tools/sweep.mjs` — deploy verifiers; re-measure before quoting this file.

⚠️ **Deploy warning:** pushing to `origin/main` auto-deploys production via
`.github/workflows/deploy-pages.yml` on any change under `website/**` (plus a
named list including `tools/build.mjs` and most root test suites). Do not push
without the owner's say-so.
