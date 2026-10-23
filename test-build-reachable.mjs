// Build hygiene: the build ships only files in use, and keeps dynamic and licence files.
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { selectReachable, ALWAYS_SHIP_FILES } from './tools/build-reachable.mjs'

let pass = 0, fail = 0
const ok = (name, cond) => { if (cond) { pass++ } else { fail++; console.log('  ✗ ' + name) } }
const dir = mkdtempSync(join(tmpdir(), 'ap-reach-'))
const put = (rel, text = '') => { const p = join(dir, rel); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, text); return { p, rel } }
const files = [
  put('index.html', '<link rel="stylesheet" href="css/site.css"><script src="js/app.js"></script>'),
  put('CNAME', 'astroprecise.app'),
  put('css/site.css', 'body{background:url(../img/paper.webp)}'),
  put('js/app.js', "['reading-templates'].map((name) => fetch('js/' + name + '.json')); import('./lazy.js')"),
  put('js/reading-templates.json', '{}'),
  put('js/lazy.js', ''),
  put('img/paper.webp'),
  put('img/old-banner.jpg'),
  put('js/retired.js', ''),
  put('assets/textures/mars_md.webp'),
  put('data/content-bank/daily/2026-10-22.json', '{}'),
  put('data/hyg-bright.LICENSE.txt', 'CC BY-SA'),
  put('js/vendor/three-r128-RenderPass.js', ''),
  put('img/og-banner-v576.jpg'),
]
const { keep, omitted } = selectReachable(files)
const kept = new Set(keep.map((f) => f.rel))
ok('HTML pages always ship', kept.has('index.html'))
ok('top-level files always ship', kept.has('CNAME'))
ok('CSS linked from HTML ships', kept.has('css/site.css'))
ok('image referenced from CSS ships', kept.has('img/paper.webp'))
ok('JSON named without extension still ships', kept.has('js/reading-templates.json'))
ok('dynamic import ships', kept.has('js/lazy.js'))
ok('textures (computed names) ship', kept.has('assets/textures/mars_md.webp'))
ok('dated content ships', kept.has('data/content-bank/daily/2026-10-22.json'))
ok('licence files ship', kept.has('data/hyg-bright.LICENSE.txt'))
ok('vendor builds ship', kept.has('js/vendor/three-r128-RenderPass.js'))
ok('old social-share image still ships', kept.has('img/og-banner-v576.jpg'))
// Step 10f added three: the keep and profile sittings and og/moment.jpg, once those pages took light cards.
ok('35 old share images are on the always-ship list', ALWAYS_SHIP_FILES.size === 35)
ok('pre-step-9 sign cards stay on the always-ship list', ALWAYS_SHIP_FILES.has('img/og/sign-aries.jpg') && ALWAYS_SHIP_FILES.has('img/og-banner-silver.jpg'))
ok('unreferenced image is left out', omitted.includes('img/old-banner.jpg'))
ok('unreferenced script is left out', omitted.includes('js/retired.js'))
console.log(`\ntest-build-reachable: ${pass} passed, ${fail} failed`)
if (fail) process.exit(1)
