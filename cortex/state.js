// CORTEX SHARED STATE — single source of truth for Mission Control.
// EVERY agent (Claude/Fable, Grok, Hermes, workers) reads this at session start
// and updates it before handing off: bump meta.updated/updatedBy, adjust the
// missions you touched, prepend one activity entry. Keep it valid JS — the
// dashboard (mission-control.html) renders exactly what is in this object.
window.CORTEX_STATE = {
  meta: {
    updated: "2026-07-13",
    updatedBy: "Grok",
    stateVersion: 1
  },

  // What is live/armed RIGHT NOW — keep this list short and true.
  now: [
    { label: "Live tip ap-v721", detail: "6fed17d — Personal Sky Moment + ship-harden; checkout dormant", kind: "running", link: "https://astroprecise.app" },
    { label: "Site deploy pipeline", detail: "Actions auto-deploys website/** pushes on main to astroprecise.app", kind: "running", link: "https://astroprecise.app" }
  ],

  projects: [
    {
      id: "astro-web",
      name: "AstroPrecise — Website",
      summary: "Static astrology site, in-browser engine, live at astroprecise.app. Tip ap-v721; checkout dormant.",
      status: "active",
      version: "ap-v721",
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
    { id: "M1", title: "Hub bootstrap", project: "astro-web", status: "waiting-owner", owner: "Claude", step: "Built + pushed as PR #6", next: "Owner: review and merge PR #6 if still open", proof: "PR #6, commits 7b3cd3d…f7b6ae3" },
    { id: "M2", title: "Instruction-layer repair (CLAUDE.md)", project: "astro-web", status: "done", owner: "Claude", step: "Deployment + palette sections rewritten, verifier-confirmed", next: "—", proof: "PR #6 diff; verifier verdicts in cortex/log.md" },
    { id: "M3", title: "Tip / STATUS refresh to ap-v721", project: "astro-web", status: "done", owner: "Grok", step: "Cortex snapshots set to ap-v721 (6fed17d)", next: "Align root STATUS.md if it still lags", proof: "cortex/wiki/astroprecise-state.md, state.js, index.md, mission-plan.md" },
    { id: "M4", title: "Phase-1 traction support", project: "astro-web", status: "waiting-owner", owner: "Claude + Grok", step: "Plans ready; checkout dormant", next: "Owner: re-arm shop/PayPal when ready; social + Postiz", proof: "PAYPAL-SETUP.md, CONTENT-CALENDAR.md" },
    { id: "M5", title: "Satellite dashboard build", project: "sat-dash", status: "open", owner: "unassigned", step: "Greenfield", next: "Owner: define what the dashboard should show", proof: "—" },
    { id: "M6", title: "Palette token hygiene sweep", project: "astro-web", status: "open", owner: "any agent", step: "Warm hexes catalogued in shipped JS renderers", next: "Owner call: intentional aesthetics or leftovers? Then sweep + visual QA", proof: "cortex/index.md lint finding" },
    { id: "M7", title: "Mission Control v2 (this upgrade)", project: "cortex", status: "done", owner: "Claude", step: "Shared state + graphical dashboard + agent wiring protocol", next: "All agents adopt the state protocol (see agents.md)", proof: "cortex/state.js, mission-control.html, agents.md" }
  ],

  agents: [
    { name: "Claude — Fable (Cortex Leader)", wiring: "native", role: "Synthesis, judgment, final quality; owns instruction-layer edits and this state file", status: "active" },
    { name: "scout", wiring: "native worker", role: "Cheap read-only recon: cataloging, fan-out search (.claude/agents/scout.md)", status: "on-call" },
    { name: "verifier", wiring: "native worker", role: "Adversarial claim checking before anything enters the wiki (.claude/agents/verifier.md)", status: "on-call" },
    { name: "Grok", wiring: "state protocol", role: "Site feature waves; cortex tip refresh 2026-07-13", status: "external" },
    { name: "Hermes", wiring: "state protocol", role: "Local model on owner's machine. Wire in via the same bootstrap prompt", status: "external" }
  ],

  // Prepend newest first; keep ≤ 12 entries, prune the tail.
  activity: [
    { date: "2026-07-13", who: "Grok", what: "Cortex tip refresh: ap-v721 LIVE (6fed17d), Personal Sky Moment + ship-harden, checkout dormant; retired 563/566 tip claims" },
    { date: "2026-07-03", who: "Claude", what: "Mission Control v2: shared state file, graphical dashboard, agent wiring protocol (M7)" },
    { date: "2026-07-02", who: "Claude", what: "CLAUDE.md deployment + palette sections repaired; verifier confirmed against repo (M2)" },
    { date: "2026-07-02", who: "Claude", what: "Cortex hub bootstrapped: wiki, log, workers; PR #6 opened as draft (M1)" },
    { date: "2026-07-02", who: "Grok + Claude", what: "ap-v563–v566 era (historical): homepage arc, SEO hardening, PayPal direct, e2e gate" }
  ]
};
