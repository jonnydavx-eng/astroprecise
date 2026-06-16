/**
 * Lightweight pre-push checks — no browser, no WebGL, no Playwright.
 * Run heavy audits last (when RAM is free):
 *   cd tools/visual-check && npm run audit
 * Then push: git push origin main
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const root = path.resolve(import.meta.dirname, '..');

const syntaxFiles = [
  'website/js/scale-journey.js',
  'website/js/scale-journey-chapters.js',
  'website/js/orrery-webgl.js',
  'website/js/horoscope-subscribe.js',
  'website/js/app.js',
  'website/js/hero-instrument.js',
];

const tests = [
  'test-engine.mjs',
  'test-horoscope.mjs',
  'test-compat.mjs',
  'test-content-bank.mjs',
  'test-art-themes.mjs',
];

let failed = 0;

for (const rel of syntaxFiles) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) {
    console.error('MISSING', rel);
    failed++;
    continue;
  }
  try {
    execSync(`node --check "${file}"`, { cwd: root, stdio: 'pipe' });
    console.log('syntax OK', rel);
  } catch (e) {
    console.error('syntax FAIL', rel);
    failed++;
  }
}

for (const test of tests) {
  try {
    execSync(`node ${test}`, { cwd: root, stdio: 'inherit' });
    console.log('test OK', test);
  } catch {
    console.error('test FAIL', test);
    failed++;
  }
}

if (failed) {
  console.error(`\nverify-light: ${failed} failure(s)`);
  process.exit(1);
}
console.log('\nverify-light: all passed (heavy visual-check deferred until final push)');