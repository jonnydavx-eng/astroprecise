// 2C step 7: Shop and samples on the Paper & Night light shell. The dark v906
// "FICTIONAL SAMPLE" plates give way to light v929 specimens built from real
// renders (Minute Plate specimen, the Keepsake sample pages, the engine Earth
// still) with a small SPECIMEN corner mark. Locked shop copy, prices, checkout
// and sample PDFs do not move.
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'

const SITE = 'website'
const V = readFileSync(join(SITE, 'js/ap-asset-v.js'), 'utf8').match(/AP_ASSET_V\s*=\s*'(\d+)'/)[1]
let pass = 0, fail = 0
const ok = (name, cond) => { if (cond) { pass++ } else { fail++; console.log('  ✗ ' + name) } }
const read = (p) => readFileSync(join(SITE, p), 'utf8')
const build = readFileSync('tools/build.mjs', 'utf8')

const shop = read('shop.html')
const plate = read('natal-plate.html')
const reading = read('sample-reading.html')
const compat = read('compatibility.html')

// Images: no dark v906 plates in any <img>/<source> on the step-7 pages
for (const [name, html] of [['shop', shop], ['natal-plate', plate], ['sample-reading', reading], ['compatibility', compat]]) {
  const media = [...html.matchAll(/<(?:img|source)\b[^>]*>/g)].map((m) => m[0]).join('\n')
  ok(`${name}: no v906 shop plate in <img>/<source>`, !media.includes('img/shop/v906/'))
}
ok('shop.html has no v906 reference at all', !shop.includes('v906'))
const v929 = [...new Set([...shop.matchAll(/img\/shop\/v9(?:29|3[0-2])\/[a-z0-9-]+\.(?:jpg|avif|webp)/g), ...plate.matchAll(/img\/shop\/v9(?:29|3[0-2])\/[a-z0-9-]+\.(?:jpg|avif|webp)/g)].map((m) => m[0]))]
ok('v929/v930/v932 specimens are referenced', v929.length >= 33)
for (const ref of v929) {
  ok(`exists: ${ref}`, existsSync(join(SITE, ref)))
  ok(`ships in Pages dist: ${ref}`, build.includes(`'${ref}'`))
}
// step 8: the Whole Sky specimen moved to v930 (same fictional person as its sample PDF)
// degrees PR: the Keepsake specimen moved to v931 (rebuilt after Aurora's positions were refreshed)
// houses PR: moved again to v932 (the Big Three page now places the Moon in the 11th house)
for (const name of ['v929/minute-plate', 'v932/keepsake-specimen', 'v930/whole-sky-specimen']) {
  const file = join(SITE, `img/shop/${name}.jpg`)
  const meta = await sharp(file).metadata()
  ok(`${name}.jpg is 1600×1600 like its width/height attributes`, meta.width === 1600 && meta.height === 1600)
  const { channels } = await sharp(file).stats()
  const mean = channels.slice(0, 3).reduce((a, c) => a + c.mean, 0) / 3
  ok(`${name}.jpg is a light specimen (mean ${mean.toFixed(0)} > 150)`, mean > 150)
  const corner = await sharp(await sharp(file).extract({ left: 0, top: 0, width: 120, height: 120 }).toBuffer()).stats()
  ok(`${name}.jpg sits on paper, not night`, corner.channels.slice(0, 3).every((c) => c.mean > 190))
}
for (const m of shop.matchAll(/<img src="img\/shop\/v9(?:29|3[0-2])\/[^"]+" width="(\d+)" height="(\d+)"/g)) ok('shop img is 1600×1600', m[1] === '1600' && m[2] === '1600')

// Locked shop copy stays exactly as it was
ok('shop keeps every Fictional sample label', (shop.match(/<figcaption>[^<]*Fictional sample[^<]*<\/figcaption>/g) || []).length === 4)
ok('Whole Sky keeps its schematic caption', shop.includes('<figcaption>Fictional sample · Schematic model, not a photograph</figcaption>'))
for (const locked of ['Coming soon', 'Not on sale yet', 'No prices are published']) ok(`shop keeps "${locked}"`, shop.includes(locked))
ok('shop shows no £ price', !/£\s?\d/.test(shop))
for (const pdf of ['natal-sky-print-pack-sample.pdf']) ok(`shop keeps sample PDF ${pdf}`, shop.includes(`downloads/studio/${pdf}`))
ok('every shop alt still says Fictional sample', [...shop.matchAll(/<img src="img\/shop\/v9(?:29|3[0-2])\/[^"]+"[^>]*alt="([^"]+)"/g)].every((m) => m[1].startsWith('Fictional sample')))
ok('natal-plate alt names the fictional person', plate.includes('for the fictional Imogen Hale'))

// Paid keepsake sample: visual restyle only
ok('sample-reading loads sample-reading-next.css after ap-next.css', reading.includes(`<link rel="stylesheet" href="css/ap-next.css?v=${V}"><link rel="stylesheet" href="css/sample-reading-next.css?v=${V}">`))
ok('sample-reading theme-color #F6F3EC', reading.includes('<meta name="theme-color" content="#F6F3EC" />'))
ok('sample-reading keeps a FICTIONAL SAMPLE mark on every page', (reading.match(/<div class="watermark">FICTIONAL SAMPLE<\/div>/g) || []).length === (reading.match(/<div class="page[ "]/g) || []).length)
ok('sample-reading keeps 20 pages', (reading.match(/<div class="page[ "]/g) || []).length === 20 && reading.includes('data-ap-page-count="20"'))
ok('sample-reading keeps product and footer labels', reading.includes('data-ap-product="personal-sky-keepsake"') && reading.includes('Fictional Studio sample'))
ok('sample-reading shows no £ price', !/£\s?\d/.test(reading))
const rcss = read('css/sample-reading-next.css')
ok('watermark becomes an upright corner mark', /\.watermark\{[^}]*transform:none/.test(rcss) && /\.watermark\{[^}]*right:12mm/.test(rcss))
ok('reading pages are paper', /\.page\{background:var\(--rd-card\)/.test(rcss))

// Compare two minutes: light shell, behaviour untouched
ok('compatibility theme-color #F6F3EC', compat.includes('<meta name="theme-color" content="#F6F3EC">'))
ok('compat-next.css loads last', compat.includes(`<link rel="stylesheet" href="css/ap-next.css?v=${V}"><link rel="stylesheet" href="css/compat-next.css?v=${V}">`))
for (const id of ['compat-form', 'person1-date', 'person1-time', 'person1-city', 'person2-date', 'person2-time', 'person2-city', 'compat-submit-btn', 'compat-invite-btn', 'compatError', 'ap-angles-list', 'sky-live-status'])
  ok(`compatibility keeps #${id}`, compat.includes(`id="${id}"`))
ok('compatibility keeps the couples script', compat.includes(`js/ap-couples-sky.js?v=${V}`))
const ccss = read('css/compat-next.css')
ok('compat-next: the Earth still is the only night pane', /\.ap-surface-a\{[^}]*background:var\(--c-night\)/.test(ccss))

// No old void on any new step-7 stylesheet; every pin is the release
ok('sample-reading preloads AP Serif and AP Sans (no font-swap layout shift)', read('sample-reading.html').includes('fonts/instrument-serif-regular.woff2" as="font"') && read('sample-reading.html').includes('fonts/inter-normal-400.woff2" as="font"'))
ok('sample-reading phone text is 14px or larger', /max-width:820px[\s\S]*\.page p[\s\S]*font-size:15px!important/.test(rcss) && /cover-method\{[^}]*font-size:14px!important/.test(rcss))
ok('shop body carries ap-studio', read('shop.html').includes('<body class="ap-next ap-discover ap-studio">'))
ok('shop text in main is 14px or larger', /\.ap-studio main \.eyebrow[^{]*\{font-size:14px!important\}/.test(read('css/ap-discover-next.css')) && /\.ap-studio \.studio-cover figcaption,\.ap-studio \.studio-edition figcaption\{font-size:14px/.test(read('css/ap-discover-next.css')))
for (const f of ['css/sample-reading-next.css', 'css/compat-next.css']) ok(`${f} has no #040812`, !read(f).toUpperCase().includes('#040812'))
for (const [name, html] of [['shop', shop], ['natal-plate', plate], ['sample-reading', reading], ['compatibility', compat]]) {
  const pins = [...html.matchAll(/\?v=(\d+)/g)].map((m) => m[1])
  ok(`${name}: every ?v= pin is ${V}`, pins.length > 0 && pins.every((p) => p === V))
}

console.log(`test-shop-specimens: ${pass} passed, ${fail} failed`)
if (fail) process.exit(1)
