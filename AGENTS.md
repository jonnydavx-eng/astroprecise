# AGENTS.md — AstroPrecise

**Atlas name:** AstroPrecise  
**Canonical:** `C:\Users\jonny\OneDrive\astroprecise`  
**Live:** https://astroprecise.app  
**Local site:** http://localhost:8790 (`website/`)  
**Deep docs:** `CLAUDE.md` (Android + full website architecture) — do not duplicate here.

## PROJECT-FIRST

If this session has not grounded yet:

```powershell
powershell -NoProfile -File "C:\Users\jonny\OneDrive\control-panel\project_first.ps1" -Name AstroPrecise -Agent <Grok|Claude|Hermes>
```

## What this repo is

Monorepo:

| Area | Path | Stack |
|---|---|---|
| **Website (primary agent surface)** | `website/` | Static HTML/CSS/JS, no SPA framework; SW precache; GitHub Actions → Pages |
| Android app | `app/` | Kotlin, Jetpack Compose, Hilt |
| Ephemeris package | `ephemeris-package/` | npm |
| Visual QA | `tools/visual-check/` | Playwright screenshots, a11y, lighthouse |

Most chat about “AstroPrecise” means **`website/`**. See `website/AGENTS.md`.

## Do

- Edit only this canonical tree (never stale Desktop copies).
- Site preview: repo `launch.bat` / serve `website` on **:8790**.
- After **any** `website/` UI change: run visual-check skill / `tools/visual-check` (`npm run all` minimum for orrery/CSS).
- Bump cache-bust (`?v=` / SW `ap-v###`) when shipping asset changes.
- Tests before push: root `npm test` (engine gates) when touching JS engines; `npm run test:ui` for WebGL click + deeplink spine.
- Deploy: push `website/**` to `main` (Actions build `dist/` + Pages). No manual gh-pages. **Never force-push.** If ahead of origin, warn — live will not update until push.
- After served edits:  
  `after_project_edit.ps1 -Project "AstroPrecise"`

## Don’t

- Fake live data / honesty violations (source labels or admit unavailable).
- Edit generated sign pages by hand — use `tools/generate-sign-pages.mjs`.
- Put secrets in the repo; treat `secrets/` as local-only.
- Bind ports already in the machine atlas (8790 is this site’s preview).
- Assume Android and website share UI code — they don’t.

## Verify (website)

```powershell
Set-Location C:\Users\jonny\OneDrive\astroprecise
npm test
Set-Location tools\visual-check
npm run all   # after UI work
```

## Handoff

Newest notes: `AGENT-HANDOFF.md` (archive older history if file is huge).  
Sign rows with your agent name. Carry out flags for you before new work.

**Master chat / same hymn book:** `AGENT-MASTER-CHAT-PLAN.md`. If Jonny says “master chat”, “open the master chat”, or “same hymn book”, load that plan and `C:\Shared\PLAN-TOGETHER.txt` (paste source: `docs/SHARED-PLAN-TOGETHER-PASTE.txt`). Master chat URL is in the plan. Fleet full-admin is **intent until SSH/local workers proven** — Cloud alone has no LAN admin.

<!-- Coherence bind — paste into product AGENTS.md -->

## Coherence (multi-agent OS)

Non-trivial work uses **Coherence** (`C:\Users\jonny\dev\coherence`):

- Load `docs/EXPERT-WORKFORCE-OS.md` or skill `coherence`
- Binding: `C:\Users\jonny\dev\coherence\bindings\AstroPrecise.md`
- Spawn Core seats; **dual-seat ship**; **no multi-hat AGREE-SHIP**
- Status: `CODE-ONLY` until proven; never false-green

```text
Load Coherence. PROJECT-FIRST AstroPrecise. Mode: <AUDIT|IMPLEMENT|SHIP-GATE>.
Spawn seats. Do not skip multi-agent.
```

<!-- Coherence bind — paste into product AGENTS.md -->

## Coherence (multi-agent OS)

Non-trivial work uses **Coherence** (`C:\Users\jonny\dev\coherence`):

- Load `docs/EXPERT-WORKFORCE-OS.md` or skill `coherence`
- Binding: `C:\Users\jonny\dev\coherence\bindings\AstroPrecise.md`
- Spawn Core seats; **dual-seat ship**; **no multi-hat AGREE-SHIP**
- Status: `CODE-ONLY` until proven; never false-green
- All-agents handoff: `docs/ALL-AGENTS-HANDOFF.md`

### FAIL-CLOSED edit gate (2026-07-13)

**No product file edits** until real seats are spawned for **this tip / vertical** (not roleplay).

| | |
|--|--|
| **Before edit** | PROJECT-FIRST → load Coherence → **spawn seats** → wait for returns → then implement |
| **Non-trivial** | UI, CSS, layout, colour, graphics, polish, features, multi-file, shell `?v=`, IA/copy — **default YES** |
| **Banned** | faster solo · path obvious · just CSS · prior fleet free-pass · multi-hat S8+S12 one chat |
| **S12** | Verify in a **different run** than implementer |
| **Status** | CODE-ONLY until dual-seat · max AGREE-IMPLEMENT-LOCAL for local tip · LIVE only S1 public |

```text
Load Coherence. PROJECT-FIRST AstroPrecise. Mode: <AUDIT|IMPLEMENT|SHIP-GATE>.
Vertical: <this tip surface>. Spawn seats. No multi-hat.
No product edits until fleet returns. CODE-ONLY until S12.
```

<!-- coherence:managed:start id=coherence-policy-v2 schema=2 -->
## Coherence v2.1 managed policy

<!-- coherence:supersedes id=coherence-policy-v1 -->
- **Supersession:** For Coherence process and status only, this managed v2 block supersedes earlier unmanaged Coherence v1, “permanent law”, “FAIL-CLOSED edit gate” and legacy status text in this file. Older text is retained as history; project-specific safety and owner restrictions remain in force.
- Do not merge v1 and v2 status vocabularies; only the v2 validator statuses below apply to new waves.
- Authority: `C:\Users\jonny\dev\coherence\policy\coherence-policy.json`
- Run PROJECT-FIRST for a named project and use only its canonical path.
- For new work select No-wave, Fast, Standard or Full; deterministic impact floors and ambiguity may only round up. Manifests without `protocolVersion` stay legacy v2 unchanged.
- No-wave is strictly read-only and creates no artifacts. Fast is at most two exact internal reversible files with S8, reason, rollback and scripted proof.
- Standard is S8 plus different-run S12; add S5 only for truth/status claims and S11 only for UI. Full adds base S5 and relevant S1/S2/S4/S7/S11 seats.
- v2.1 PreEdit requires an agreeing S8 preflight and declared later seats; later-seat preflight advice is not final verification.
- Cooperative limits are two open waves, two compatible different-project `IMPLEMENTING` waves, and one heavy/browser wave. The same canonical project and project maintenance remain exclusive. Lease health is heartbeat-derived (`FRESH`, blocking `UNCERTAIN`, then `REAPABLE`); PID observation is advisory only. LocalAppData leases are not OS enforcement and are **not integrated with OneDrive Repo Guard**.
- Tools/models/browsers default off; enabling requires benefit, RAM/disk/startup/runtime/money/network/privacy cost, exact use and stop/unload proofs, Coherence off-switch and current-task consent.
- Artifact budgets are Fast 25 MB, Standard 100 MB, Full 250 MB; cleanup is reviewed plan/apply for closed waves and never removes manifests, gate receipts or referenced evidence.
- S12 preflight advice is not verification. Prior-wave proof does not transfer to a new tip or vertical.
- Agents record evidence; only the validator emits `CODE-ONLY`, `BLOCK-SHIP`, `VERIFIED-LOCAL`, `READY-SHIP` or `LIVE`.
- Deferred proof is not pass. Local, HEAD, origin and live identities remain separate.
- Board-wide installation is plan-only by default and may alter only exact allowlisted managed regions.
<!-- coherence:managed:end id=coherence-policy-v2 -->
