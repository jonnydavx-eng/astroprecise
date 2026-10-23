// Horoscope share card (2C step 10): the "Download card" PNG from horoscope-page.js is drawn in
// the Paper & Night palette with the repo's Instrument Serif / Inter faces and the hand-drawn
// brand glyph, like the light OG cards. Static checks; no browser needed.
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

let fails = 0
const ok = (name, cond, extra = '') => {
  if (!cond) {
    fails++
    console.log(`FAIL  ${name}${extra ? `  (${extra})` : ''}`)
  } else console.log(`PASS  ${name}`)
}

const src = readFileSync('website/js/horoscope-page.js', 'utf8')
const start = src.indexOf('// Share card (2C step 10)')
const end = src.indexOf('function canvasToBlob')
const card = start >= 0 && end > start ? src.slice(start, end) : ''
ok('share card section found', card.length > 0)
ok('no dark #040812 ground in horoscope-page.js', !/040812/i.test(src))
ok('no star field or retired seal art on the card', !/deterministicRandom|seals\/zodiac/.test(card))
ok('no legacy card faces (IBM Plex Mono, Cormorant)', !/IBM Plex|Cormorant/.test(card))
ok('lettering uses AP Serif and AP Sans', card.includes('"AP Serif"') && card.includes('"AP Sans"'))
ok('waits for the faces before drawing', /document\.fonts\.load/.test(card))
ok('draws the brand glyph via APGlyphs.image', /APGlyphs\.image\(signKey/.test(card))

// Palette values match the brand tokens.
const tokens = readFileSync('website/css/ap-tokens.css', 'utf8')
const tok = (name) => (tokens.match(new RegExp(`--ap-${name}:\\s*(#[0-9A-Fa-f]{6})`)) || [])[1]
const pal = Object.fromEntries(
  [...card.matchAll(/(\w+): '(#[0-9A-Fa-f]{6})'/g)].map((m) => [m[1], m[2].toUpperCase()]),
)
for (const [k, t] of [
  ['paper', 'paper'],
  ['card', 'card'],
  ['rule', 'rule'],
  ['ink', 'ink'],
  ['graphite', 'graphite'],
  ['muted', 'muted'],
  ['copper', 'copper'],
  ['copperInk', 'copper-ink'],
  ['night', 'night'],
])
  ok(
    `card ${k} = --ap-${t}`,
    pal[k] && pal[k] === (tok(t) || '').toUpperCase(),
    `${pal[k]} vs ${tok(t)}`,
  )
const hexes = [...new Set([...card.matchAll(/#[0-9A-Fa-f]{6}\b/g)].map((m) => m[0].toUpperCase()))]
const allowed = new Set(Object.values(pal))
ok(
  'no colour outside the card palette',
  hexes.every((h) => allowed.has(h)),
  hexes.join(','),
)

// Keeps the honest footer and the 12:00 UT reference.
ok(
  'footer says interpretation, reflection and entertainment',
  /reflection and entertainment/.test(card),
)
ok('footer names the 12:00 UT reference', /positions calculated at 12:00 UT/.test(card))
ok(
  'no text under 14px on the card',
  [...card.matchAll(/'(?:\d00 )?(\d+)px /g)].every((m) => +m[1] >= 14),
)

// ap-glyphs.js (with .image) is generated from the sprite and up to date.
let fresh = true
try {
  execFileSync('node', ['tools/generate-glyphs-js.mjs', '--check'], {
    cwd: 'website',
    stdio: 'pipe',
  })
} catch {
  fresh = false
}
ok('js/ap-glyphs.js matches its generator', fresh)
const glyphs = readFileSync('website/js/ap-glyphs.js', 'utf8')
ok('APGlyphs.image is exported', /image: function \(name, color\)/.test(glyphs))

console.log(fails ? `\n${fails} share card check(s) failed` : '\nall share card checks passed')
process.exit(fails ? 1 : 0)
