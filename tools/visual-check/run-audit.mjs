/**
 * Full visual + a11y + lighthouse audit.
 */
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = process.argv[2] || 'http://localhost:8790';

function run(script, optional) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [join(__dirname, script), BASE], {
      stdio: 'inherit',
      cwd: __dirname,
    });
    child.on('close', (code) => resolve(code === 0 ? 'pass' : optional ? 'warn' : 'fail'));
  });
}

async function main() {
  const results = {};
  console.log('\n── Screenshots (preloader + pages) ──');
  results.visual = await run('run-all.mjs');
  console.log('\n── Accessibility (axe) ──');
  results.a11y = await run('audit-a11y.mjs', true);
  console.log('\n── Performance (Playwright metrics) ──');
  results.perf = await run('audit-perf.mjs', true);
  console.log('\n── Lighthouse (optional — may fail on Windows temp) ──');
  results.lighthouse = await run('audit-lighthouse.mjs', true);
  console.log('\n── Visual regression (if baseline exists) ──');
  results.diff = await run('diff-baseline.mjs', true);
  console.log('\nSummary:', results);
  const hardFail = results.visual === 'fail';
  process.exit(hardFail ? 1 : 0);
}

main();