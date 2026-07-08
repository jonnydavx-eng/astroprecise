// CORTEX SHARED STATE — single source of truth for Mission Control.
// EVERY agent (Claude/Fable, Grok, Hermes, workers) reads this at session start
// and updates it before handing off. Keep it valid JS — validate with
// `node cortex/tools/validate-state.mjs`. The dashboard (mission-control.html)
// renders exactly what is in this object.
//
// On handoff: bump meta.generatedAt (ISO) + meta.updatedBy; adjust the missions
// you touched; append one point to each project.trend you changed; prepend one
// activity entry (keep <= 12). See cortex/agents.md for the full protocol.
window.CORTEX_STATE = {
  meta: {
    updated: "2026-07-03",
    generatedAt: "2026-07-03T11:40:00Z", // stamp on every update; dashboard shows age
    staleAfterMin: 1440,                  // header badge turns amber past this age
    updatedBy: "Claude (Cortex Leader)",
    stateVersion: 3
  },

  // What is live/armed RIGHT NOW — keep this list short and true.
  // kind: running | waiting
  now: [
    { label: "Cortex hub is PERMANENT", detail: "PR #6 merged into main (14b1dbb) — every session inherits the hub, memory, skills", kind: "running" },
    { label: "PR #7 watch", detail: "Subscribed to PR #7 review/CI activity + periodic self check-in; responds until it merges or closes", kind: "running", link: "https://github.com/jonnydavx-eng/astroprecise/pull/7" },
    { label: "Site deploy pipeline", detail: "Actions auto-deploys website/** pushes on main to astroprecise.app (ap-v568 live)", kind: "running", link: "https://astroprecise.app" }
  ],

  // trend = count of unfinished missions (open+waiting-owner+running) for this
  // project at each recorded snapshot, oldest first. Burn-down: lower is better.
  // Honest — derived from the real mission log. INVARIANT (enforced by
  // validate-state.mjs): the LAST element must equal the project's current
  // unfinished-mission count, so a stale trend can't be committed.
  projects: [
    {
      id: "astro-web", name: "AstroPrecise — Website",
      summary: "Static astrology site, in-browser engine, live at astroprecise.app. Launch phase 1: traction + first revenue via PayPal direct.",
      status: "active", version: "ap-v568", health: "green",
      trend: [3, 3, 3, 3]
    },
    {
      id: "astro-app", name: "AstroPrecise — Android App",
      summary: "Kotlin/Compose app, offline deterministic astrology. Play Store submission deferred to phase 3 (TWA prerequisites met — domain live).",
      status: "paused", version: "pre-release", health: "amber",
      trend: [0, 0, 0, 0]
    },
    {
      id: "sat-dash", name: "Satellite Dashboard",
      summary: "davit_sat_dashboard.py — blank Streamlit template. Greenfield; awaiting a mission brief from the owner.",
      status: "idea", version: "—", health: "grey",
      trend: [1, 1, 1, 1]
    },
    {
      id: "cortex", name: "Cortex — Mission Control",
      summary: "The multi-agent brain: shared state, memory, skills, autonomy. Coordinates Claude, Grok, Hermes through git files, no server.",
      status: "active", version: "v3", health: "green",
      trend: [5, 4, 2, 1]
    }
  ],

  // status: done | running | waiting-owner | open
  // blockedOn: "owner" | "agent" | null  (drives the "needs you" count)
  // contract (optional): {objective, deliverable, scope, done} — shown when expanded
  missions: [
    { id: "M1", title: "Hub bootstrap", project: "cortex", status: "done", owner: "Claude", blockedOn: null,
      step: "PR #6 merged into main", next: "—", proof: "merge commit 14b1dbb" },
    { id: "M2", title: "Instruction-layer repair (CLAUDE.md)", project: "astro-web", status: "done", owner: "Claude", blockedOn: null,
      step: "Deployment + palette sections rewritten, verifier-confirmed", next: "Shipped in PR #6", proof: "PR #6 diff; verifier verdicts in cortex/log.md" },
    { id: "M3", title: "STATUS.md refresh to ap-v568", project: "astro-web", status: "open", owner: "any agent (Hermes candidate)", blockedOn: null,
      step: "Facts gathered: site is ap-v568 (sw.js), STATUS.md says v563. Ready for Hermes — see HERMES-START.md", next: "Hermes: update STATUS.md to ap-v568 + fix AGENT-HANDOFF pointer", proof: "—",
      contract: { objective: "Bring STATUS.md in sync with shipped reality (ap-v568)", deliverable: "Edited STATUS.md + AGENT-HANDOFF pointer resolved (file doesn't exist → point to cortex/)", scope: "STATUS.md only; do not touch site code", done: "Version, date, and open-items match git history + index.md lint findings" } },
    { id: "M4", title: "Phase-1 traction support", project: "astro-web", status: "waiting-owner", owner: "Claude + Grok", blockedOn: "owner",
      step: "Plans ready (content calendar, playbook)", next: "Owner: PayPal links into app.js AP_MON, social accounts + Postiz", proof: "PAYPAL-SETUP.md, CONTENT-CALENDAR.md",
      action: "Open PAYPAL-SETUP.md → create the 13 payment links → paste into website/js/app.js (AP_MON)" },
    { id: "M5", title: "Satellite dashboard build", project: "sat-dash", status: "open", owner: "unassigned", blockedOn: "owner",
      step: "Greenfield", next: "Owner: define what the dashboard should show", proof: "—",
      action: "Tell Cortex the mission brief: which satellites, which data, who the dashboard is for" },
    { id: "M6", title: "Palette token hygiene sweep", project: "astro-web", status: "open", owner: "any agent", blockedOn: "owner",
      step: "Warm hexes catalogued in shipped JS renderers", next: "Owner call: intentional aesthetics or leftovers? Then sweep + visual QA", proof: "cortex/index.md lint finding",
      action: "Decide: are warm hexes in chart-render.js / instrument.js intentional? If leftovers, approve the sweep" },
    { id: "M7", title: "Mission Control v2", project: "cortex", status: "done", owner: "Claude", blockedOn: null,
      step: "Shared state + graphical dashboard + agent wiring protocol", next: "Superseded by v3 (M9)", proof: "merged in 14b1dbb" },
    { id: "M8", title: "Agent memory + skills layer", project: "cortex", status: "done", owner: "Claude", blockedOn: null,
      step: "Per-agent memory, shared-learnings, 4 skill playbooks; protocol updated", next: "Restructured to 3-tier in M9", proof: "cortex/memory/*, cortex/skills/*" },
    { id: "M9", title: "10x Wave 1 — dashboard v3, 3-tier memory, contracts, trajectories", project: "cortex", status: "done", owner: "Claude", blockedOn: null, gated: true,
      step: "Shipped + cross-model verified: exception-first dashboard, redundant status, freshness, sparklines, progressive disclosure; 3-tier memory + INDEX; contracts; trajectories. Verifier found 2 issues, both fixed.", next: "In this PR", proof: "verdicts/M9.md; mission-control.html, memory/*, trajectories/" },
    { id: "M10", title: "10x Wave 2 — Actions autonomy + verdict gate", project: "cortex", status: "waiting-owner", owner: "Claude", blockedOn: "owner",
      step: "Workflow + maintenance playbook + verdict/validate scripts written and committed", next: "Owner: add repo secret ANTHROPIC_API_KEY, then the weekly maintenance agent goes live", proof: ".github/workflows/cortex-maintenance.yml, cortex/tools/*",
      action: "GitHub → repo Settings → Secrets and variables → Actions → add ANTHROPIC_API_KEY. That activates the autonomous weekly maintenance agent." },
    { id: "M11", title: "10x Wave 3 — evals, branch-per-mission, MCP server", project: "cortex", status: "done", owner: "Claude", blockedOn: null, gated: true,
      step: "Shipped + cross-model verified: evals golden missions + rubric, branch-per-mission, stdio MCP server (no deps), decay skill. Verifier found a CI smoke-test bug + secret-gating bug, both fixed.", next: "Agents adopt conventions on next missions", proof: "verdicts/M11.md; cortex/mcp/cortex-server.mjs, tools/mcp-smoke.mjs, evals/" }
  ],

  agents: [
    { name: "Claude — Fable (Cortex Leader)", wiring: "native", role: "Synthesis, judgment, final quality; owns instruction-layer edits, state schema, and distillation", status: "active" },
    { name: "scout", wiring: "native worker", role: "Cheap read-only recon: cataloging, fan-out search (.claude/agents/scout.md)", status: "on-call" },
    { name: "verifier", wiring: "native worker", role: "Adversarial claim checking before anything enters the wiki (.claude/agents/verifier.md)", status: "on-call" },
    { name: "Maintenance agent", wiring: "github actions", role: "Weekly cron: link/cache/palette/state audits → opens issues+PRs, never pushes. Needs ANTHROPIC_API_KEY.", status: "armed-pending-secret" },
    { name: "Grok", wiring: "state protocol", role: "Site feature waves (homepage arc v535–v562). Wire in via the bootstrap prompt in agents.md", status: "external" },
    { name: "Hermes", wiring: "state protocol", role: "Local offline model. Also the sleep-time distiller (compresses raw memory between missions)", status: "external" }
  ],

  // Prepend newest first; keep <= 12 entries, prune the tail.
  activity: [
    { date: "2026-07-03", who: "Claude", what: "Hermes onboarding (HERMES-START.md) + free/low-credit mode; verifying facts caught the brain saying ap-v566 when the live site is ap-v568 (sw.js) — corrected across cortex docs" },
    { date: "2026-07-03", who: "5-agent audit + Claude", what: "Independent audit workflow found more real defects — verdict gate had no author check, gated not type-checked, dashboard href XSS, workflow perms, 2 honesty misses — all fixed; validation refactored to one shared lib" },
    { date: "2026-07-03", who: "verifier + Claude", what: "Cross-model verdict on the 10x build caught 4 real defects (CI smoke-test grep, secret-in-if, stale trend, unrendered fields) — all fixed; verdicts recorded, gate enforced on M9/M11" },
    { date: "2026-07-03", who: "Claude", what: "10x SHIPPED (all 3 waves): dashboard v3, 3-tier compounding memory, task contracts, trajectory logs, Actions maintenance agent, verdict gate, evals, MCP server (M9–M11)" },
    { date: "2026-07-03", who: "Claude + 3 researchers", what: "10x roadmap researched and written across three pillars (M9 planned)" },
    { date: "2026-07-03", who: "Claude", what: "Memory + skills layer: per-agent memory, shared-learnings, 4 playbooks (M8)" },
    { date: "2026-07-03", who: "jonnydavx + Claude", what: "PR #6 MERGED — cortex hub permanent on main (14b1dbb); M1 done" },
    { date: "2026-07-03", who: "Claude", what: "Mission Control v2: shared state, graphical dashboard, agent wiring protocol (M7)" },
    { date: "2026-07-02", who: "Claude", what: "CLAUDE.md deployment + palette sections repaired; verifier confirmed against repo (M2)" },
    { date: "2026-07-02", who: "Claude", what: "Cortex hub bootstrapped: wiki, log, workers; PR #6 opened (M1)" },
    { date: "2026-07-02", who: "Grok + Claude", what: "ap-v563–v568 shipped on main: homepage arc, SEO hardening, PayPal direct, e2e gate, white-homepage + NOAA fixes" }
  ]
};
