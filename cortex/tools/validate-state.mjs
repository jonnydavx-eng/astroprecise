#!/usr/bin/env node
// Validates cortex/state.js — run in CI and before any commit that touches it.
// Thin CLI over tools/state-lib.mjs (shared with check-verdicts + the MCP server,
// so the three can't drift). Exits 1 with a list of problems, 0 if clean.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadState, validateState } from './state-lib.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const statePath = join(here, '..', 'state.js');

let S;
try { S = loadState(statePath); }
catch (e) { console.error('✗ state.js is not valid JS:', e.message); process.exit(1); }

const errors = validateState(S);
if (errors.length) {
  console.error('✗ state.js validation failed:');
  errors.forEach(e => console.error('  - ' + e));
  process.exit(1);
}
const n = a => (Array.isArray(a) ? a.length : 0);
console.log(`✓ state.js valid — ${n(S.missions)} missions, ${n(S.projects)} projects, ${n(S.agents)} agents`);
