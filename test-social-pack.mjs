/**
 * Step 10b — the social pack (tools/make-mission-control-social.py) is on Paper & Night.
 * Checks the generator source (repo fonts via og_brand, drawn glyphs, no starfield, no prices)
 * and the committed JPEGs (count and exact sizes) without running Python.
 */
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'

const root = new URL('./', import.meta.url)
const src = readFileSync(new URL('tools/make-mission-control-social.py', root), 'utf8')
let passed = 0
const ok = (c, m) => {
  assert.ok(c, m)
  passed++
}

ok(
  /from og_brand import/.test(src),
  'generator uses tools/og/og_brand.py (repo fonts + drawn glyphs)',
)
ok(!/C:\\\\Windows|georgia|consola|ImageFont/i.test(src), 'no installed / Windows fonts')
ok(!/def starfield|radial_glow|VOID\s*=/.test(src), 'no starfield, glow or void ground')
ok(!/£\s*\d/.test(src.replace(/^\s*#.*$/gm, '')), 'no price lines in generated copy')
// Step 10c ruling: no price in the social images at all (the old 'FROM £6' line stays out).
// Every quoted string the generator draws, and the pack's preview pages, carry no '£' sign.
const code = src.replace(/^\s*#.*$/gm, '').replace(/"""[\s\S]*?"""/, '')
const strings = [...code.matchAll(/"((?:[^"\\\n]|\\.)*)"/g)].map((m) => m[1])
ok(strings.length > 40, `pack copy strings found (${strings.length})`)
ok(
  strings.every((t) => !/£|\bGBP\b|FROM\s*\$?\d/i.test(t)),
  'no £ price (or FROM n) in any social pack copy: ' +
    strings.filter((t) => /£/.test(t)).join(' | '),
)
ok(!/£/.test(code), "no '£' anywhere in the generator code")
for (const page of [
  'tools/social-pack/mission-control-preview.html',
  'tools/social-pack/posters.html',
])
  ok(!/£\s*\d/.test(readFileSync(new URL(page, root), 'utf8')), `${page}: no £ price`)

ok(
  !/[\u2609\u263D\u263E\u263F\u2640\u2642-\u2653\u2726]/u.test(src),
  'no Unicode astrology glyphs or ✦ in the pack',
)
ok(
  /C\["paper"\]/.test(src) && /C\["ink"\]/.test(src) && /C\["goldink"\]|C\["gold"\]/.test(src),
  'paper / ink / copper palette',
)

// JPEG size from the SOF marker
function jpegSize(buf) {
  let i = 2
  while (i < buf.length) {
    if (buf[i] !== 0xff) {
      i++
      continue
    }
    const m = buf[i + 1],
      len = buf.readUInt16BE(i + 2)
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc)
      return [buf.readUInt16BE(i + 7), buf.readUInt16BE(i + 5)]
    i += 2 + len
  }
  return null
}
const want = {
  'avatar-400.jpg': [400, 400],
  'banner-x-1500x500.jpg': [1500, 500],
  'banner-youtube-2560x1440.jpg': [2560, 1440],
  'banner-linkedin-1584x396.jpg': [1584, 396],
  'pin-birth-chart.jpg': [1000, 1500],
  'pin-mission-control.jpg': [1000, 1500],
  'pin-natal-poster.jpg': [1000, 1500],
  'pin-zenith-star.jpg': [1000, 1500],
  'square-big-three.jpg': [1080, 1080],
  'square-birth-time.jpg': [1080, 1080],
  'square-orrery.jpg': [1080, 1080],
  'square-telemetry.jpg': [1080, 1080],
  'square-wear-your-sky.jpg': [1080, 1080],
  'story-brand-close.jpg': [1080, 1920],
  'story-free-chart.jpg': [1080, 1920],
  'story-privacy.jpg': [1080, 1920],
}
const files = readdirSync(new URL('marketing/social/', root))
  .filter((f) => f.endsWith('.jpg'))
  .sort()
ok(files.length === 16 && files.every((f) => want[f]), `16 social assets (${files.length})`)
for (const [f, [w, h]] of Object.entries(want)) {
  const s = jpegSize(readFileSync(new URL('marketing/social/' + f, root)))
  ok(s && s[0] === w && s[1] === h, `${f} is ${w}×${h} (${s})`)
}
for (const f of ['pin-birth-chart.jpg', 'square-your-sky.jpg']) {
  const s = jpegSize(readFileSync(new URL('tools/social-pack/images/' + f, root)))
  ok(s && s[0] >= 1000, `social-pack copy ${f} present (${s})`)
}

// Step 10c: the YouTube banner keeps all text inside the centred 1546 × 423 safe area (what
// desktop and phones show). Decoded pixel check: outside that box (and off the hairline frame)
// the banner is plain paper, and inside it there is lettering.
ok(
  /YT_SAFE = \(\(YT_W - 1546\) \/ 2, \(YT_H - 423\) \/ 2/.test(src),
  'generator defines the 1546 × 423 safe area',
)
ok(/make_youtube_banner\("Mission Control/.test(src), 'YouTube banner uses the safe-area layout')
{
  const { loadImage, createCanvas } = await import('@napi-rs/canvas')
  const img = await loadImage(
    readFileSync(new URL('marketing/social/banner-youtube-2560x1440.jpg', root)),
  )
  const cv = createCanvas(img.width, img.height)
  const cx = cv.getContext('2d')
  cx.drawImage(img, 0, 0)
  const { data } = cx.getImageData(0, 0, img.width, img.height)
  const paper = [0xf6, 0xf3, 0xec]
  const S = [(2560 - 1546) / 2, (1440 - 423) / 2, (2560 + 1546) / 2, (1440 + 423) / 2]
  const frame = 58
  const nearFrame = (x, y) =>
    Math.abs(x - frame) <= 8 ||
    Math.abs(x - (2560 - frame)) <= 8 ||
    Math.abs(y - frame) <= 8 ||
    Math.abs(y - (1440 - frame)) <= 8
  let outside = 0,
    inside = 0,
    first = ''
  for (let y = 0; y < img.height; y += 2)
    for (let x = 0; x < img.width; x += 2) {
      const i = (y * img.width + x) * 4
      const off = Math.max(...[0, 1, 2].map((k) => Math.abs(data[i + k] - paper[k])))
      const inSafe = x >= S[0] && x <= S[2] && y >= S[1] && y <= S[3]
      if (inSafe) {
        if (off > 60) inside++
      } else if (!nearFrame(x, y) && off > 24) {
        outside++
        if (!first) first = `${x},${y}`
      }
    }
  ok(
    outside === 0,
    `YouTube banner: nothing but paper outside the safe area (${outside} px, first ${first})`,
  )
  ok(inside > 5000, `YouTube banner: lettering inside the safe area (${inside} px)`)
}

// Step 10c: '253' is the zenith-star catalogue size (js/starcatalog.js). It may only describe
// the zenith-star feature; no shipped copy may put it near 'Observatory' (the Observatory does
// not show 253 stars). Scans the site's HTML, JS and JSON and this generator.
{
  const { readdirSync: ls, statSync } = await import('node:fs')
  const walk = (dir) =>
    ls(new URL(dir, root)).flatMap((n) => {
      const p = dir + n
      if (statSync(new URL(p, root)).isDirectory())
        return /^(node_modules|vendor|img|fonts|textures|models)$/.test(n) ? [] : walk(p + '/')
      return /\.(html|js|mjs|json|txt|xml|webmanifest)$/.test(n) ? [p] : []
    })
  const files = walk('website/').concat(['tools/make-mission-control-social.py'])
  const near = []
  for (const f of files) {
    const text = readFileSync(new URL(f, root), 'utf8')
    for (const m of text.matchAll(/(?<![\d.,])253(?![\d.,])/g)) {
      const around = text.slice(Math.max(0, m.index - 160), m.index + 160)
      if (/observatory/i.test(around))
        near.push(
          `${f}: …${text.slice(Math.max(0, m.index - 60), m.index + 60).replace(/\s+/g, ' ')}…`,
        )
    }
  }
  ok(files.length > 100, `253 scan covers the shipped copy (${files.length} files)`)
  ok(near.length === 0, `no '253' near 'Observatory' in shipped copy: ${near.join(' | ')}`)
  ok(
    /Find your zenith star", "The real named star overhead at your birth minute — catalogue of 253 stars\./.test(
      src,
    ),
    "the zenith pin keeps 'catalogue of 253 stars' (true: starcatalog.js)",
  )
  const cat = readFileSync(new URL('website/js/starcatalog.js', root), 'utf8')
  const g = { window: {} }
  new Function('window', 'self', 'globalThis', cat)(g.window, g.window, g.window)
  const stars = (g.window.StarCatalog && g.window.StarCatalog.STARS) || []
  ok(stars.length === 253, `starcatalog.js holds 253 stars (${stars.length})`)
}
console.log(`test-social-pack: ${passed} passed, 0 failed`)
