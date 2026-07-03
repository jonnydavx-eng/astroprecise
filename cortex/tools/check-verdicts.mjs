#!/usr/bin/env node
// The cross-model verdict gate (report-only by default; hard gate for opted-in
// missions). A mission tagged `gated: true` may not be `done` without a verdict
// file at cortex/verdicts/<ID>.md authored by a DIFFERENT model than the mission
// owner. Historical missions are grandfathered (not gated) and reported as such —
// we don't pretend they were cross-verified.
// Dependency-free. Exit 1 only if a GATED mission is done without a verdict.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const cortexRoot = join(here, '..');

function load() {
  const src = readFileSync(join(cortexRoot, 'state.js'), 'utf8');
  const w = {}; new Function('window', src)(w); return w.CORTEX_STATE;
}

const S = load();
const done = S.missions.filter(m => m.status === 'done');
let hardFail = 0;
console.log('Verdict gate — done missions:');
for (const m of done) {
  const vf = join(cortexRoot, 'verdicts', `${m.id}.md`);
  const has = existsSync(vf);
  const gated = m.gated === true;
  const mark = has ? '✓ verdict on record' : gated ? '✗ MISSING (gated)' : '· grandfathered (no verdict)';
  console.log(`  ${m.id}  ${mark}  — ${m.title}`);
  if (gated && !has) hardFail++;
}
if (hardFail) {
  console.error(`\n✗ ${hardFail} gated mission(s) marked done without a verdict. Add cortex/verdicts/<ID>.md.`);
  process.exit(1);
}
console.log('\n✓ verdict gate satisfied (no gated mission is missing a verdict).');
