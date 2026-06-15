/**
 * Full AstroPrecise visual audit — preloader + all major pages.
 * Usage: node run-all.mjs [baseUrl]
 */
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = process.argv[2] || 'http://localhost:8790';

function run(script) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [join(__dirname, script), BASE], {
      stdio: 'inherit',
      cwd: __dirname,
    });
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${script} exited ${code}`))));
  });
}

async function main() {
  console.log('\n── Preloader / orrery intro ──');
  await run('capture-preloader.mjs');
  console.log('\n── All major pages + hero ──');
  await run('capture-pages.mjs');
  console.log('\nDone. Review tools/visual-check/out/ and out/pages/');
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});