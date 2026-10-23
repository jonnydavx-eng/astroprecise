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

// Step 10b: the footer disclaimer is readable on a phone. The card is a 1080-unit square that a
// phone shows about 360 CSS px wide, so a unit is a third of a CSS px there; the disclaimer was
// 15 units (5 px). It must be at least 11 px at 360 wide, wrap in at most two lines inside the
// footer width, and sit inside the hairline frame.
const num = (name) => {
  const m = card.match(new RegExp(`const ${name} = (\\d+);`))
  return m ? +m[1] : NaN
}
const CARD_SIZE = num('CARD_SIZE')
const FOOTER_PX = num('CARD_FOOTER_PX')
const FOOTER_LINE = num('CARD_FOOTER_LINE')
const FOOTER_WIDTH = num('CARD_FOOTER_WIDTH')
const PHONE_PX = 360
const effective = (FOOTER_PX * PHONE_PX) / CARD_SIZE
ok('card is drawn on 1080 units', CARD_SIZE === 1080, String(CARD_SIZE))
ok(
  `disclaimer is at least 11 px at ${PHONE_PX} px wide`,
  effective >= 11,
  `${FOOTER_PX} units = ${effective.toFixed(2)} px`,
)
ok(
  'the disclaimer is drawn at CARD_FOOTER_PX in AP Sans',
  /context\.font = '400 ' \+ CARD_FOOTER_PX \+ 'px ' \+ CARD_SANS;\s*wrapText\(context, CARD_DISCLAIMER, 540, (\d+), CARD_FOOTER_WIDTH, CARD_FOOTER_LINE, 3\)/.test(
    card,
  ),
)
ok('the card waits for the disclaimer face', /fonts\.load\('400 ' \+ CARD_FOOTER_PX/.test(card))
const disclaimer = (card.match(/const CARD_DISCLAIMER = '([^']+)'/) || [])[1] || ''
ok('disclaimer says reflection and entertainment', /reflection and entertainment/.test(disclaimer))
ok('disclaimer names the 12:00 UT reference', /positions calculated at 12:00 UT/.test(disclaimer))
// Step 10c: no card text under 33 units (11 px at 360). Static sizes and every fallback set.
const MIN = num('CARD_MIN_PX')
ok('CARD_MIN_PX is 33 units (11 px at 360)', MIN === 33, String(MIN))
ok('labels are at least CARD_MIN_PX', num('CARD_LABEL_PX') >= 33, String(num('CARD_LABEL_PX')))
const sizes = [...card.matchAll(/(?:'\d00 )(\d+)px |(?:label|note|today): (\d+)/g)].map(
  (m) => +(m[1] || m[2]),
)
ok(
  'no literal card size under 33 units',
  sizes.length > 0 && sizes.every((v) => v >= 33),
  sizes.join(','),
)
ok(
  'every fallback set keeps note and label at the floor',
  [...card.matchAll(/note: (\w+), noteLine: \d+, label: (\w+)/g)].every((m) =>
    [m[1], m[2]].every((v) => /^CARD_(MIN|LABEL)_PX$/.test(v) || +v >= 33),
  ),
)

// Measure the wrap with the repo's Inter so the two-line footer fits the frame (1052).
const { createCanvas, GlobalFonts } = await import('@napi-rs/canvas')
GlobalFonts.registerFromPath('tools/print-fonts/inter-static-400.ttf', 'APTestInter')
const ctx = createCanvas(10, 10).getContext('2d')
ctx.font = `400 ${FOOTER_PX}px APTestInter`
const lines = []
let line = ''
for (const word of disclaimer.split(/\s+/)) {
  const trial = line ? line + ' ' + word : word
  if (ctx.measureText(trial).width <= FOOTER_WIDTH || !line) line = trial
  else {
    lines.push(line)
    line = word
  }
}
if (line) lines.push(line)
ok('disclaimer wraps to two lines', lines.length === 2, lines.join(' | '))
ok(
  'each disclaimer line fits the footer width',
  lines.every((l) => ctx.measureText(l).width <= FOOTER_WIDTH),
)
const footerY = +(card.match(/wrapText\(context, CARD_DISCLAIMER, 540, (\d+),/) || [])[1]
const lastBaseline = footerY + (lines.length - 1) * FOOTER_LINE
ok(
  'disclaimer sits inside the frame',
  lastBaseline + FOOTER_PX * 0.25 <= 1052 - 8,
  `last baseline ${lastBaseline}`,
)
const ruleY = +(card.match(/context\.fillRect\(84, (\d+), 912, 2\)/) || [])[1]
const blockBottom = +(card.match(/const bottom = (\d+);/) || [])[1]
ok('reading block ends above the footer rule', blockBottom < ruleY, `${blockBottom} vs ${ruleY}`)

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

// Every text draw, measured with the real painter (tools/share-canvas-probe.mjs): all twelve
// signs with a long reading and a short one. Each line >= 11 px at 360 CSS px wide, inside the
// hairline frame, the reading above the footer rule, and no two lines overlapping.
const probe = await import('./tools/share-canvas-probe.mjs')
const short = { todayLine: 'A quiet day.', useThis: 'One list.', leaveThis: 'The rush.' }
let worst = Infinity
const problems = []
for (const sign of [
  'aries',
  'taurus',
  'gemini',
  'cancer',
  'leo',
  'virgo',
  'libra',
  'scorpio',
  'sagittarius',
  'capricorn',
  'aquarius',
  'pisces',
]) {
  for (const reading of [undefined, short]) {
    const r = await probe.probeHoroscopeCard(sign, reading)
    const tag = `${sign}/${reading ? 'short' : 'long'}`
    if (!r.draws.length) problems.push(`${tag}: no text`)
    const boxes = r.draws.map((d) => {
      const [x0, x1] = probe.extent(d)
      return { d, x0, x1, y0: d.y - d.px * 0.74, y1: d.y + d.px * 0.22 }
    })
    for (const b of boxes) {
      const eff = probe.effectivePx(b.d.px, r.width)
      worst = Math.min(worst, eff)
      if (eff < probe.MIN_EFFECTIVE_PX - 1e-9) problems.push(`${tag}: ${b.d.px}u "${b.d.text}"`)
      if (b.x0 < r.frame || b.x1 > r.width - r.frame || b.y0 < r.frame || b.y1 > r.height - r.frame)
        problems.push(`${tag}: outside frame "${b.d.text}"`)
    }
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i],
          b = boxes[j]
        if (a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1)
          problems.push(`${tag}: overlap "${a.d.text}" / "${b.d.text}"`)
      }
    const body = r.draws.filter((d) => d.y < 900 && d.text !== 'AstroPrecise')
    if (!body.every((d) => d.y + d.px * 0.22 < ruleY))
      problems.push(`${tag}: reading runs into the rule`)
    if (r.draws.some((d) => /\.…$/.test(d.text)))
      problems.push(`${tag}: ellipsis after a full stop`)
  }
}
ok(
  `every line on all 24 painted cards >= 11 px at ${PHONE_PX} wide, in frame, clear (min ${worst.toFixed(2)} px)`,
  problems.length === 0,
  problems.slice(0, 8).join(' | '),
)

console.log(fails ? `\n${fails} share card check(s) failed` : '\nall share card checks passed')
process.exit(fails ? 1 : 0)
