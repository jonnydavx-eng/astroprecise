#!/usr/bin/env node
// Validates cortex/state.js — run in CI and before any commit that touches it.
// Dependency-free. Exits 1 with a list of problems, 0 if clean.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const statePath = join(here, '..', 'state.js');

const ALLOWED_STATUS = new Set(['done', 'running', 'waiting-owner', 'open']);
const ALLOWED_BLOCKED = new Set(['owner', 'agent', null, undefined]);
const errors = [];

function load(path) {
  const src = readFileSync(path, 'utf8');
  const sandbox = { window: {} };
  // state.js assigns window.CORTEX_STATE = {...}; run it with a fake window.
  new Function('window', src)(sandbox.window);
  return sandbox.window.CORTEX_STATE;
}

let S;
try { S = load(statePath); }
catch (e) { console.error('✗ state.js is not valid JS:', e.message); process.exit(1); }

if (!S) errors.push('window.CORTEX_STATE is not defined');
else {
  // meta
  if (!S.meta) errors.push('missing meta');
  else {
    if (isNaN(Date.parse(S.meta.generatedAt))) errors.push('meta.generatedAt is not a parseable ISO date');
    if (!S.meta.updatedBy) errors.push('meta.updatedBy is empty');
  }
  // projects
  const projectIds = new Set((S.projects || []).map(p => p.id));
  // current unfinished-mission count per project (open + waiting-owner + running)
  const UNFINISHED = new Set(['open', 'waiting-owner', 'running']);
  const unfinishedByProject = {};
  (S.missions || []).forEach(m => {
    if (UNFINISHED.has(m.status)) unfinishedByProject[m.project] = (unfinishedByProject[m.project] || 0) + 1;
  });
  (S.projects || []).forEach((p, i) => {
    if (!p.id) errors.push(`project[${i}] missing id`);
    if (!['green', 'amber', 'grey'].includes(p.health)) errors.push(`project ${p.id}: bad health "${p.health}"`);
    if (p.trend) {
      if (!Array.isArray(p.trend) || p.trend.some(n => typeof n !== 'number'))
        errors.push(`project ${p.id}: trend must be an array of numbers`);
      else {
        // honesty invariant: the trend's endpoint must equal the real current count
        const last = p.trend[p.trend.length - 1];
        const actual = unfinishedByProject[p.id] || 0;
        if (last !== actual)
          errors.push(`project ${p.id}: trend ends at ${last} but current unfinished missions = ${actual} (stale/fabricated trend)`);
      }
    }
  });
  // missions
  const ids = new Set();
  (S.missions || []).forEach((m, i) => {
    if (!m.id) errors.push(`mission[${i}] missing id`);
    if (ids.has(m.id)) errors.push(`duplicate mission id ${m.id}`);
    ids.add(m.id);
    if (!ALLOWED_STATUS.has(m.status)) errors.push(`mission ${m.id}: bad status "${m.status}"`);
    if (!ALLOWED_BLOCKED.has(m.blockedOn)) errors.push(`mission ${m.id}: bad blockedOn "${m.blockedOn}"`);
    if (!m.title) errors.push(`mission ${m.id}: missing title`);
    if (!m.owner) errors.push(`mission ${m.id}: missing owner`);
    if (m.project && !projectIds.has(m.project)) errors.push(`mission ${m.id}: unknown project "${m.project}"`);
    if (m.blockedOn === 'owner' && !(m.action || m.next))
      errors.push(`mission ${m.id}: blocked on owner but has no action/next to show`);
  });
  // activity
  if ((S.activity || []).length > 12) errors.push(`activity has ${S.activity.length} entries (keep <= 12)`);
}

if (errors.length) {
  console.error('✗ state.js validation failed:');
  errors.forEach(e => console.error('  - ' + e));
  process.exit(1);
}
console.log(`✓ state.js valid — ${S.missions.length} missions, ${S.projects.length} projects, ${S.agents.length} agents`);
