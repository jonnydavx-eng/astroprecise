#!/usr/bin/env node
// The cross-model verdict gate. A mission tagged `gated: true` may not be `done`
// without a verdict at cortex/verdicts/<ID>.md whose `reviewer:` is a DIFFERENT
// model/agent than the mission owner — a self-authored file does NOT satisfy it.
// Historical missions are grandfathered (not gated) and reported honestly.
// Dependency-free. Exit 1 if any gated mission is done without a valid verdict.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadState } from './state-lib.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const cortexRoot = join(here, '..');

let S;
try { S = loadState(join(cortexRoot, 'state.js')); }
catch (e) { console.error('✗ state.js is not valid JS:', e.message); process.exit(1); }

if (!Array.isArray(S?.missions)) { console.error('✗ state.js has no missions array'); process.exit(1); }

// first identity token of the owner, e.g. "Claude + Grok" -> "claude"
const ownerKey = m => String(m.owner || '').toLowerCase().match(/[a-z]+/)?.[0] || '';

function verdictOk(mission, file) {
  if (!existsSync(file)) return { ok: false, why: 'MISSING' };
  const text = readFileSync(file, 'utf8');
  const reviewer = (text.match(/reviewer:\s*(.+)/i)?.[1] || '').trim();
  if (!reviewer) return { ok: false, why: 'no `reviewer:` line' };
  const ok = ownerKey(mission);
  // reject a verdict whose reviewer is the same identity as the owner (self-review)
  if (ok && new RegExp('^' + ok + '\\b', 'i').test(reviewer))
    return { ok: false, why: `reviewer "${reviewer}" is the same as owner (self-review not allowed)` };
  return { ok: true, why: reviewer };
}

const done = S.missions.filter(m => m.status === 'done');
let hardFail = 0;
console.log('Verdict gate — done missions:');
for (const m of done) {
  const gated = m.gated === true;
  if (!gated) { console.log(`  ${m.id}  · grandfathered (no verdict)  — ${m.title}`); continue; }
  const v = verdictOk(m, join(cortexRoot, 'verdicts', `${m.id}.md`));
  if (v.ok) console.log(`  ${m.id}  ✓ verdict by ${v.why}  — ${m.title}`);
  else { console.log(`  ${m.id}  ✗ ${v.why} (gated)  — ${m.title}`); hardFail++; }
}
if (hardFail) {
  console.error(`\n✗ ${hardFail} gated mission(s) done without a valid cross-model verdict.`);
  process.exit(1);
}
console.log('\n✓ verdict gate satisfied.');
