# Master Chat — Same Hymn Book (standing plan)

**Status:** INTENT recorded 2026-07-23. Cloud agent does **not** yet have live LAN admin; this plan is the shared playbook until local workers + SSH are wired.

## Master chat (this one)

| Field | Value |
|---|---|
| Name | New Laptop / Master Chat |
| URL | https://cursor.com/agents/bc-0bbbbcef-36ff-4b2f-837e-c3b09ee7de8b |
| bcId | `bc-0bbbbcef-36ff-4b2f-837e-c3b09ee7de8b` |
| Role | **Master chat** — Jonny’s primary agent thread for fleet + setup |
| Owner ask | Full admin intent on **all machines in this setup** |

## Same hymn book rule

Agents are on the same hymn book when they have loaded **all** of:

1. This file: `AGENT-MASTER-CHAT-PLAN.md` (repo) **and/or**
2. `C:\Shared\PLAN-TOGETHER.txt` + `C:\Shared\GOING-FORWARD-PLAN.txt` (mini Shared)
3. The master chat URL / bcId above

### Trigger phrases (any new AI / agent)

If Jonny says any of:

- “open the master chat”
- “reference the master chat”
- “same hymn book”
- “master chat”

…the agent **must**:

1. Open / cite master chat URL above (or ask Jonny to attach it if product can’t deep-link)
2. Read `C:\Shared\PLAN-TOGETHER.txt` if on mini/BOOK (path `\\192.168.137.1\Shared\PLAN-TOGETHER.txt` from BOOK)
3. Read this `AGENT-MASTER-CHAT-PLAN.md` if in AstroPrecise repo
4. Treat master-chat decisions as current doctrine unless Jonny overrides
5. **Not** invent a second competing fleet plan

## Machines in scope

| Host | Role | IP (ICS) | Notes |
|---|---|---|---|
| DESKTOP-1MN06G4 | mini / hub | `192.168.137.1` | Shared host; prefer Ethernet ICS |
| BOOK-T1H4NJ753R | laptop | `192.168.137.2` | Primary laptop peer |
| New Wi‑Fi laptop | candidate peer | TBD (home Wi‑Fi) | Audit in progress; **no MWB yet**; Ethernet later |

Standing ports / services (mini + BOOK): SSH 22, RDP 3389, SMB 445, MWB 15100/15101. Prefer ICS Ethernet over Wi‑Fi for agent sync. **No MWB key changes. No restarts without OWNER-OK.**

## Full admin intent (what “grant master chat admin” means)

**Goal:** Master chat (and agents that load this hymn book) can operate all in-scope machines.

**Reality gate (must be true — do not fake):**

| Layer | Required | Status |
|---|---|---|
| Shared hymn book files | `C:\Shared\PLAN-TOGETHER.txt` + this plan | Plan written in repo; Shared paste pending Jonny |
| Cross-chat visibility | New agents load plan + master URL on trigger phrases | Policy only until agents comply |
| Mini shell | Local Cursor agent **or** private worker on mini | Cloud cannot reach `192.168.137.1` today |
| BOOK shell | SSH from mini **or** local agent on BOOK | Pending |
| New laptop shell | OpenSSH on Wi‑Fi IP; later ICS `.3` | Pending audit/setup |
| Durable SSH | Keys authorized; health task; no drift | Pending |

**CLAIMS vs REALITY:** Recording “full admin” in this plan is **intent**. It is **not** live until the Reality gate rows are proven (SSH/local worker works and re-check passes).

## Do / Don’t

**Do**

- Route fleet / Wi‑Fi / PowerShell / SSH work through master chat doctrine
- Prefer read-only experts before process kills
- Keep OpenSSH healthy with a re-runnable health script once installed
- Drop audit outputs on `C:\Shared\`

**Don’t**

- Install/start Mouse Without Borders on the new laptop until master chat verdict
- Force-push, restart PowerToys/MWB/PC without OWNER-OK
- Assume Cloud Agent has LAN access
- Create a second “master” without Jonny renaming this one

## Immediate next actions (fleet)

1. **MOUSE / MWB FIX** (priority) — diagnose/repair Mouse Without Borders between mini ↔ BOOK; **no MWB key changes**; **no restarts without OWNER-OK**. Script: `docs/ops/mwb-triage-mini-readonly.ps1`
2. Jonny on mini: paste Shared block (below in PLAN-TOGETHER) so every local agent sees the hymn book
3. Fix PowerShell launch on mini (`powershell -NoProfile -ExecutionPolicy Bypass`)
4. Discover new laptop Wi‑Fi IP from mini scan; enable `sshd` on new laptop
5. Prove `ssh` mini → new laptop; save proof under `C:\Shared\`
6. Only then: Name2IP entry + optional Tailscale; Ethernet/ICS when cable exists
7. Re-check health script so settings **stay** correct

## Catch-up from mini

Cloud agents **cannot** see work done on the mini until Jonny either:

1. Pastes reports / logs from `C:\Shared\` into this chat (or attaches them), or
2. Runs a **local** agent on the mini that can read Shared and report back

Until then: treat mini-side progress as unknown; do not invent status from LAN. Multi-agent catch-up = Shared dumps + master chat paste, not Cloud LAN probes.

## Handoff line

Master chat = https://cursor.com/agents/bc-0bbbbcef-36ff-4b2f-837e-c3b09ee7de8b — same hymn book via `C:\Shared\PLAN-TOGETHER.txt` + `AGENT-MASTER-CHAT-PLAN.md`. Full admin = intent until SSH/local workers proven.
