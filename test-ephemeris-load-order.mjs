/* Gate: ephemeris load order.
 * A non-module inline <script> runs during HTML parsing. If it references a
 * global that is only defined by a deferred (or later, or absent) script,
 * the reference is undefined at parse time — the class of bug that killed
 * the homepage cast button (AstroEphemeris captured before ephemeris.js ran).
 *   window.AstroEphemeris ← js/ephemeris.js
 *   window.VoidEphem      ← js/orrery.js (legacy) or js/void-orrery-adapter.js (M2)
 * Fail if a classic inline script touches either global before the defining
 * file was loaded NON-deferred earlier in the document. External and module
 * scripts are deferred by nature and run in document order — safe.
 */
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const root = join(dirname(fileURLToPath(import.meta.url)), 'website');
const files = readdirSync(root).filter(f => f.endsWith('.html'));
let bad = 0;

for (const f of files) {
  const html = readFileSync(join(root, f), 'utf8');
  const tagRe = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let m, ephReady = false, voidReady = false, pos = 0;
  while ((m = tagRe.exec(html))) {
    const attrs = m[1] || '', body = m[2] || '';
    const src = (attrs.match(/src=["']([^"']+)["']/) || [])[1] || '';
    const isModule = /type=["']module["']/.test(attrs);
    const isJson = /application\/ld\+json/.test(attrs);
    const isDeferred = /\bdefer\b/.test(attrs) || isModule;
    if (src && /ephemeris\.js/.test(src) && !isDeferred) ephReady = true;
    if (src && /(^|\/)(orrery|void-orrery-adapter)\.js/.test(src) && !isDeferred) voidReady = true;
    if (!src && !isJson && !isModule) {
      if (/AstroEphemeris/.test(body) && !ephReady) {
        console.log(`FAIL ${f}: inline script touches AstroEphemeris before sync ephemeris.js (char ${pos + m.index})`);
        bad++;
      }
      if (/VoidEphem/.test(body) && !voidReady) {
        console.log(`FAIL ${f}: inline script touches VoidEphem before sync orrery.js (char ${pos + m.index})`);
        bad++;
      }
    }
    pos = tagRe.lastIndex;
  }
}
if (bad) { console.log(`${bad} load-order hazard(s)`); process.exit(1); }
console.log(`ephemeris/orrery load-order OK across ${files.length} pages`);
