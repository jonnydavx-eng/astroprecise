// Single source of truth for loading + validating cortex/state.js.
// Imported by validate-state.mjs (CLI), check-verdicts.mjs, and the MCP server's
// cortex_validate tool, so the three can never drift apart. Dependency-free.
import { readFileSync } from 'node:fs';

export const ALLOWED_STATUS = new Set(['done', 'running', 'waiting-owner', 'open']);
export const ALLOWED_BLOCKED = new Set(['owner', 'agent', null, undefined]);
export const ALLOWED_HEALTH = new Set(['green', 'amber', 'grey']);
// http(s) absolute, root-relative, or in-page anchor only — blocks javascript:/data:
export const SAFE_LINK = /^(https?:\/\/|\/[^/]|#)/;

// Loads state.js by running it with a fake `window`. Throws on invalid JS.
export function loadState(path) {
  const src = readFileSync(path, 'utf8');
  const w = {};
  new Function('window', src)(w);
  return w.CORTEX_STATE;
}

// Returns an array of human-readable problems ([] = valid). Never throws on
// shape problems — missing arrays are reported, not crashed on.
export function validateState(S) {
  const e = [];
  if (!S) { e.push('window.CORTEX_STATE is not defined'); return e; }

  // meta
  if (!S.meta) e.push('missing meta');
  else {
    if (isNaN(Date.parse(S.meta.generatedAt))) e.push('meta.generatedAt is not a parseable ISO date');
    if (!S.meta.updatedBy) e.push('meta.updatedBy is empty');
  }

  // required arrays (report, don't crash)
  for (const k of ['projects', 'missions', 'agents', 'now', 'activity']) {
    if (!Array.isArray(S[k])) e.push(`missing or non-array: ${k}`);
  }
  const projects = Array.isArray(S.projects) ? S.projects : [];
  const missions = Array.isArray(S.missions) ? S.missions : [];
  const now = Array.isArray(S.now) ? S.now : [];
  const activity = Array.isArray(S.activity) ? S.activity : [];

  // current unfinished-mission count per project (for the trend honesty invariant)
  const UNFINISHED = new Set(['open', 'waiting-owner', 'running']);
  const unfinishedByProject = {};
  missions.forEach(m => { if (UNFINISHED.has(m.status)) unfinishedByProject[m.project] = (unfinishedByProject[m.project] || 0) + 1; });

  const projectIds = new Set(projects.map(p => p.id));
  projects.forEach((p, i) => {
    if (!p.id) e.push(`project[${i}] missing id`);
    if (!ALLOWED_HEALTH.has(p.health)) e.push(`project ${p.id}: bad health "${p.health}"`);
    if (p.trend !== undefined) {
      if (!Array.isArray(p.trend) || p.trend.some(n => typeof n !== 'number'))
        e.push(`project ${p.id}: trend must be an array of numbers`);
      else if (p.trend.length) {
        const last = p.trend[p.trend.length - 1];
        const actual = unfinishedByProject[p.id] || 0;
        if (last !== actual)
          e.push(`project ${p.id}: trend ends at ${last} but current unfinished missions = ${actual} (stale/fabricated trend)`);
      }
    }
  });

  const ids = new Set();
  missions.forEach((m, i) => {
    if (!m.id) e.push(`mission[${i}] missing id`);
    if (ids.has(m.id)) e.push(`duplicate mission id ${m.id}`);
    ids.add(m.id);
    if (!ALLOWED_STATUS.has(m.status)) e.push(`mission ${m.id}: bad status "${m.status}"`);
    if (!ALLOWED_BLOCKED.has(m.blockedOn)) e.push(`mission ${m.id}: bad blockedOn "${m.blockedOn}"`);
    if (!m.title) e.push(`mission ${m.id}: missing title`);
    if (!m.owner) e.push(`mission ${m.id}: missing owner`);
    if (m.project && !projectIds.has(m.project)) e.push(`mission ${m.id}: unknown project "${m.project}"`);
    if (m.blockedOn === 'owner' && !(m.action || m.next)) e.push(`mission ${m.id}: blocked on owner but no action/next`);
    if ('gated' in m && typeof m.gated !== 'boolean') e.push(`mission ${m.id}: gated must be a boolean (got ${typeof m.gated} "${m.gated}")`);
  });

  // now[].link must be a safe scheme (state.js is multi-agent-writable)
  now.forEach((n, i) => {
    if (n.link !== undefined && !SAFE_LINK.test(String(n.link)))
      e.push(`now[${i}] link "${n.link}" is not an allowed scheme (http(s)/relative/# only)`);
  });

  if (activity.length > 12) e.push(`activity has ${activity.length} entries (keep <= 12)`);
  return e;
}
