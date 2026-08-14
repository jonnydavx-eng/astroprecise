/**
 * Static proof: gift path on a phone.
 * Sky-card.html belongs to PR 18 — this branch must not rewrite it.
 * Does not invent PR 18 modules. Does not bump the tip.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const web = join(root, 'website');
let fails = 0;
function ok(cond, msg) {
  if (cond) console.log('PASS', msg);
  else { console.error('FAIL', msg); fails++; }
}

const sw = readFileSync(join(web, 'sw.js'), 'utf8');
ok(/const V = "ap-v873"/.test(sw), 'does not bump or fight the Act 1 tip');

ok(!existsSync(join(web, 'js/ap-sky-card.js')), 'ap-sky-card.js is still absent — not invented');
ok(!existsSync(join(web, 'js/ap-keep-minute.js')), 'ap-keep-minute.js is still absent — not invented');

const sky = readFileSync(join(web, 'sky-card.html'), 'utf8');
ok(!/sky-card-word/.test(sky), 'this branch does not rewrite sky-card chrome');
ok(!/ap-phone-pass\.css/.test(sky), 'sky-card does not ride the Act 1 phone sheet');
ok(!/\?v=874/.test(sky), 'sky-card does not fight the laptop tip');
ok(/dob'\)\.value \+ 'T' \+ \(\$\('tob'\)\.value \|\| '12:00'\) \+ ':00Z'/.test(sky),
  'sky-card still reads the clock as UTC');
ok(/a\.download = 'my-sky-card\.png'/.test(sky), 'sky-card download path is unchanged');

let skyMatchesAct1 = false;
try {
  execFileSync('git', ['diff', '--quiet', 'origin/cursor/audit-improve-act1-04cc', '--', 'website/sky-card.html'], {
    cwd: root,
    stdio: 'ignore',
  });
  skyMatchesAct1 = true;
} catch {
  skyMatchesAct1 = false;
}
ok(skyMatchesAct1, 'sky-card.html matches Act 1 — PR 18 owns the rewrite');

const keepCss = readFileSync(join(web, 'css/ap-keep-sky.css'), 'utf8');
ok(/#keep-sky/.test(keepCss) && /min-height:\s*44px/.test(keepCss), 'keep button is a 44px target');
ok(/#keep-sky-caption/.test(keepCss) && /font-size:\s*16px/.test(keepCss),
  'keep caption / action-note keep a 16px floor');
ok(/ap-room-sky:has\(\.ap-keep-row\)/.test(keepCss) && /min-height:\s*380px/.test(keepCss),
  'birth-hour / keep stage stays a readable 3D band');
ok(!/gumroad|sku|checkout|payment/i.test(keepCss), 'keep CSS invents no commerce');

const keepJs = readFileSync(join(web, 'js/ap-keep-sky.js'), 'utf8');
ok(/captureStill/.test(keepJs) && /astroprecise-sky\.png/.test(keepJs),
  'existing keep path is still the local PNG capture');
ok(!/birth-hour/.test(keepJs), 'this branch does not invent the PR 17 birth-hour capture');

const chart = readFileSync(join(web, 'chart.html'), 'utf8');
ok(/id="keep-sky"/.test(chart) && /ap-keep-sky\.js/.test(chart), 'chart still hosts Keep this sky');
ok(/data-renderer="webgl-only"/.test(chart), 'chart keep stage stays webgl-only');
ok(/ap-phone-pass\.css\?v=873/.test(chart), 'chart keeps the Act 1 phone pass pin');

if (fails) process.exit(1);
console.log('PASS gift-path phone static proof');
