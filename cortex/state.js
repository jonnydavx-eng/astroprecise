// CORTEX SHARED STATE — single source of truth for Mission Control.
// EVERY agent (Claude/Fable, Grok, Hermes, workers) reads this at session start
// and updates it before handing off: bump meta.updated/updatedBy, adjust the
// missions you touched, prepend one activity entry. Keep it valid JS — the
// dashboard (mission-control.html) renders exactly what is in this object.
window.CORTEX_STATE = {
  meta: {
    updated: "2026-07-03",
    updatedBy: "Claude (Cortex Leader)",
    stateVersion: 1
  },

  // What is live/armed RIGHT NOW — keep this list short and true.
  now: [
    { label: "PR #6 — cortex hub bootstrap", detail: "Open draft, mergeable clean, awaiting owner review/merge", kind: "waiting", link: "https://github.com/jonnydavx-eng/astroprecise/pull/6" },
    { label: "PR watch loop", detail: "Hourly self check-in armed; auto-acts on comments/CI/conflicts until PR #6 merges or closes", kind: "running" },
    { label: "Site deploy pipeline", detail: "Actions auto-deploys website/** pushes on main to astroprecise.app (ap-v566 live)", kind: "running", link: "https://astroprecise.app" }
  ],

  projects: [
    {
      id: "astro-web",
      name: "AstroPrecise — Website",
      summary: "Static astrology site, in-browser engine, live at astroprecise.app. Launch phase 1: traction + first revenue via PayPal direct.",
      status: "active",
      version: "ap-v566",
      health: "green"
    },
    {
      id: "astro-app",
      name: "AstroPrecise — Android App",
      summary: "Kotlin/Compose app, offline deterministic astrology. Play Store submission deferred to phase 3 (TWA prerequisites met — domain live).",
      status: "paused",
      version: "pre-release",
      health: "amber"
    },
    {
      id: "sat-dash",
      name: "Satellite Dashboard",
      summary: "davit_sat_dashboard.py — blank Streamlit template. Greenfield; awaiting a mission brief from the owner.",
      status: "idea",
      version: "—",
      health: "grey"
    }
  ],

  // status: done | running | waiting-owner | open
  missions: [
    { id: "M1", title: "Hub bootstrap", project: "astro-web", status: "waiting-owner", owner: "Claude", step: "Built + pushed as PR #6", next: "Owner: review and merge PR #6", proof: "PR #6, commits 7b3cd3d…f7b6ae3" },
    { id: "M2", title: "Instruction-layer repair (CLAUDE.md)", project: "astro-web", status: "done", owner: "Claude", step: "Deployment + palette sections rewritten, verifier-confirmed", next: "Ships with PR #6", proof: "PR #6 diff; verifier verdicts in cortex/log.md" },
    { id: "M3", title: "STATUS.md refresh to ap-v566", project: "astro-web", status: "open", owner: "any agent", step: "Not started", next: "Update snapshot on next site-touching mission", proof: "—" },
    { id: "M4", title: "Phase-1 traction support", project: "astro-web", status: "waiting-owner", owner: "Claude + Grok", step: "Plans ready (content calendar, playbook)", next: "Owner: PayPal links into app.js AP_MON, social accounts + Postiz", proof: "PAYPAL-SETUP.md, CONTENT-CALENDAR.md" },
    { id: "M5", title: "Satellite dashboard build", project: "sat-dash", status: "open", owner: "unassigned", step: "Greenfield", next: "Owner: define what the dashboard should show", proof: "—" },
    { id: "M6", title: "Palette token hygiene sweep", project: "astro-web", status: "open", owner: "any agent", step: "Warm hexes catalogued in shipped JS renderers", next: "Owner call: intentional aesthetics or leftovers? Then sweep + visual QA", proof: "cortex/index.md lint finding" },
    { id: "M7", title: "Mission Control v2 (this upgrade)", project: "cortex", status: "done", owner: "Claude", step: "Shared state + graphical dashboard + agent wiring protocol", next: "All agents adopt the state protocol (see agents.md)", proof: "cortex/state.js, mission-control.html, agents.md" }
  ],

  agents: [
    { name: "Claude — Fable (Cortex Leader)", wiring: "native", role: "Synthesis, judgment, final quality; owns instruction-layer edits and this state file", status: "active" },
    { name: "scout", wiring: "native worker", role: "Cheap read-only recon: cataloging, fan-out search (.claude/agents/scout.md)", status: "on-call" },
    { name: "verifier", wiring: "native worker", role: "Adversarial claim checking before anything enters the wiki (.claude/agents/verifier.md)", status: "on-call" },
    { name: "Grok", wiring: "state protocol", role: "Site feature waves (homepage arc v535–v562). Wire in via the bootstrap prompt in agents.md", status: "external" },
    { name: "Hermes", wiring: "state protocol", role: "Local model on owner's machine. Wire in via the same bootstrap prompt", status: "external" }
  ],

  // Prepend newest first; keep ≤ 12 entries, prune the tail.
  activity: [
    { date: "2026-07-03", who: "Claude", what: "Mission Control v2: shared state file, graphical dashboard, agent wiring protocol (M7)" },
    { date: "2026-07-02", who: "Claude", what: "CLAUDE.md deployment + palette sections repaired; verifier confirmed against repo (M2)" },
    { date: "2026-07-02", who: "Claude", what: "Cortex hub bootstrapped: wiki, log, workers; PR #6 opened as draft (M1)" },
    { date: "2026-07-02", who: "Grok + Claude", what: "ap-v563–v566 shipped earlier on main: homepage arc, SEO hardening, PayPal direct, e2e gate" }
  ]
};
