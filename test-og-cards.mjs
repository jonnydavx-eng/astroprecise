// OG cards (2C step 9): light Paper & Night cards from tools/make-og-cards.py, one per public
// page, 1200x630 JPEG, wired into every page head. Checks the committed output; no Python needed.
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join, extname } from 'node:path'
import { ALWAYS_SHIP_FILES } from './tools/build-reachable.mjs'

const SITE = 'website'
const BASE = 'https://astroprecise.app/'
let fails = 0
const ok = (name, cond, extra = '') => {
  if (!cond) {
    fails++
    console.log(`FAIL  ${name}${extra ? `  (${extra})` : ''}`)
  }
}

// JPEG size from the first SOF marker.
const jpegSize = (buf) => {
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return null
  let i = 2
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) return null
    const m = buf[i + 1]
    const len = buf.readUInt16BE(i + 2)
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc)
      return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) }
    i += 2 + len
  }
  return null
}
const metaContent = (html, attr, key) => {
  const m = html.match(new RegExp(`<meta ${attr}="${key}" content="([^"]*)"`))
  return m ? m[1] : null
}

const manifest = JSON.parse(readFileSync(join(SITE, 'img/og/manifest.json'), 'utf8'))
ok('55 cards in the manifest', manifest.length === 55, String(manifest.length))
for (const e of manifest) {
  const name = e.page.replace(/\.html$/, '')
  const file = join(SITE, e.og)
  ok(`${name}: card path is img/og/og-${name}.jpg`, e.og === `img/og/og-${name}.jpg`, e.og)
  if (!existsSync(file)) {
    ok(`${name}: card exists`, false, file)
    continue
  }
  const buf = readFileSync(file)
  const size = jpegSize(buf)
  ok(`${name}: 1200x630 JPEG`, size && size.w === 1200 && size.h === 630, JSON.stringify(size))
  ok(`${name}: 25-100 KB`, buf.length >= 25000 && buf.length <= 100000, String(buf.length))
  ok(`${name}: manifest bytes match`, e.bytes === buf.length, `${e.bytes} vs ${buf.length}`)

  const html = readFileSync(join(SITE, e.page), 'utf8')
  const url = BASE + e.og
  ok(
    `${name}: og:image`,
    metaContent(html, 'property', 'og:image') === url,
    metaContent(html, 'property', 'og:image'),
  )
  ok(
    `${name}: twitter:image`,
    metaContent(html, 'name', 'twitter:image') === url,
    metaContent(html, 'name', 'twitter:image'),
  )
  ok(`${name}: og:image:width 1200`, metaContent(html, 'property', 'og:image:width') === '1200')
  ok(`${name}: og:image:height 630`, metaContent(html, 'property', 'og:image:height') === '630')
  ok(
    `${name}: twitter:card large`,
    metaContent(html, 'name', 'twitter:card') === 'summary_large_image',
  )
  const alt = metaContent(html, 'property', 'og:image:alt') || ''
  ok(
    `${name}: alt names the card, not an engine still`,
    /AstroPrecise card/.test(alt) && !/Engine still/.test(alt),
    alt,
  )
  ok(`${name}: one og:image tag`, (html.match(/property="og:image"/g) || []).length === 1)
}

for (const p of [
  'charts',
  'contact',
  'deep-reading',
  'explore',
  'guides',
  'offline',
  'refunds',
  'sky-card',
  'verify',
])
  ok(
    `${p}: has an og:image now`,
    manifest.some((e) => e.page === `${p}.html`),
  )
// Step 10: lifepath, links and numerology carry their own light card on og:image and
// twitter:image (they pointed at the dark og-banner-silver.jpg with no twitter:image before v937).
for (const p of ['lifepath', 'links', 'numerology']) {
  ok(
    `${p}: has a card now`,
    manifest.some((e) => e.page === `${p}.html`),
  )
  const h = readFileSync(join(SITE, `${p}.html`), 'utf8')
  ok(
    `${p}: head has no og-banner-silver.jpg`,
    !h.slice(0, h.indexOf('</head>')).includes('og-banner-silver'),
  )
  ok(`${p}: one twitter:image tag`, (h.match(/name="twitter:image"/g) || []).length === 1)
}
// Step 10b: a share card or share description never advertises checkout status. The card
// letters the page's meta description, so checking the head descriptions covers the card text.
const CHECKOUT_STATUS = /checkout[\s-]*(?:is\s+)?closed/i
for (const e of manifest) {
  const h = readFileSync(join(SITE, e.page), 'utf8')
  const head = h.slice(0, h.indexOf('</head>'))
  const descs = [
    metaContent(head, 'name', 'description'),
    metaContent(head, 'property', 'og:description'),
    metaContent(head, 'name', 'twitter:description'),
    metaContent(head, 'property', 'og:image:alt'),
    e.title,
  ].filter(Boolean)
  for (const ld of head.matchAll(/"description":"([^"]*)"/g)) descs.push(ld[1])
  ok(
    `${e.page.replace(/\.html$/, '')}: share text does not say checkout is closed`,
    descs.every((d) => !CHECKOUT_STATUS.test(d)),
    descs.find((d) => CHECKOUT_STATUS.test(d)),
  )
}
ok('the checkout-status check catches "Checkout closed."', CHECKOUT_STATUS.test('Checkout closed.'))
ok(
  'the checkout-status check catches "checkout-closed"',
  CHECKOUT_STATUS.test('the checkout-closed preview'),
)

const index = readFileSync(join(SITE, 'index.html'), 'utf8')
ok('index.html no longer points at og-banner-silver.jpg', !index.includes('og-banner-silver'))

// Step 10f: the last dark previews. Ten pages that used og-banner-silver.jpg, the v906 keep and
// profile sittings or og/moment.jpg now carry their own light card, and no shipped text file
// references a dark preview. fulfil-redirect is the one exception: it is a locked
// checkout-return page (pin bumps only), so its head is left for Jonny's call.
const DARK_PREVIEW = /og-banner-silver|sitting-(?:keep|profile)-og-v906|img\/og\/moment\.jpg/
const DARK_OK = new Set(['fulfil-redirect.html'])
for (const p of [
  'angel-numbers',
  'cosmic-story',
  'ephemeris',
  'moment',
  'name-numerology',
  'profile',
  'quiz',
  'saturn-return',
  'solar-return',
  'synchronicity-card',
])
  ok(
    `${p}: has its own light card now`,
    manifest.some((e) => e.page === `${p}.html` && e.og === `img/og/og-${p}.jpg`),
  )
const TEXT = new Set(['.html', '.js', '.mjs', '.css', '.json', '.xml', '.txt', '.webmanifest'])
const walk = (dir, rel = '') =>
  readdirSync(join(dir, rel), { withFileTypes: true }).flatMap((d) => {
    const r = rel ? `${rel}/${d.name}` : d.name
    if (d.isDirectory()) return d.name === 'node_modules' ? [] : walk(dir, r)
    return TEXT.has(extname(d.name)) ? [r] : []
  })
const darkRefs = walk(SITE).filter(
  (f) => !DARK_OK.has(f) && DARK_PREVIEW.test(readFileSync(join(SITE, f), 'utf8')),
)
ok(
  'no shipped page, script or style references a dark preview',
  darkRefs.length === 0,
  darkRefs.join(', '),
)
ok(
  'the dark-preview check catches og-banner-silver.jpg',
  DARK_PREVIEW.test('img/og-banner-silver.jpg?v=943'),
)
for (const f of [
  'img/editorial/sitting-keep-og-v906.jpg',
  'img/editorial/sitting-profile-og-v906.jpg',
  'img/og/moment.jpg',
])
  ok(`old ${f} still ships for links already posted`, ALWAYS_SHIP_FILES.has(f))

// Old cards keep shipping for links already posted elsewhere.
for (const k of ['aries', 'leo', 'pisces'])
  ok(`old sign-${k}.jpg still ships`, ALWAYS_SHIP_FILES.has(`img/og/sign-${k}.jpg`))
ok('og-banner-silver.jpg still ships', ALWAYS_SHIP_FILES.has('img/og-banner-silver.jpg'))

// The generator draws from code: repo fonts, drawn glyphs, engine stills. The dark tools are gone.
const gen =
  readFileSync('tools/make-og-cards.py', 'utf8') + readFileSync('tools/og/og_brand.py', 'utf8')
ok('make-og-banner.mjs removed', !existsSync('tools/make-og-banner.mjs'))
ok(
  'generator uses tools/print-fonts',
  gen.includes("'print-fonts'") && gen.includes('instrument-serif-static-regular.ttf'),
)
ok('generator writes 1200x630', /W, H = 1200, 630/.test(gen))
ok(
  'generator never calls an image model',
  !/openai|stability|replicate|midjourney|dall|imagen|diffus/i.test(gen),
)

console.log(
  fails
    ? `\n${fails} OG card check(s) failed`
    : `all OG card checks passed (${manifest.length} cards)`,
)
process.exit(fails ? 1 : 0)
