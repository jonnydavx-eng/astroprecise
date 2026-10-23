/**
 * Step 10b — share canvases on Paper & Night.
 * ap-sky-card.js and ap-moment-share.js draw on a paper ground with ink/copper,
 * letter in AP Serif (Instrument Serif) + AP Sans (Inter), wait for those fonts
 * before painting, draw astrology glyphs from APGlyphs (code), keep a minimum
 * canvas text size and keep every honesty string.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const sky = read('./website/js/ap-sky-card.js')
const moment = read('./website/js/ap-moment-share.js')
const skyPage = read('./website/synchronicity-card.html')
let passed = 0
const ok = (cond, msg) => {
  assert.ok(cond, msg)
  passed++
}

// Unicode astrology glyphs (planets, signs, nodes, retro-free) — must come from APGlyphs instead.
const ASTRO_GLYPHS =
  /[\u2609\u263D\u263E\u263F\u2640\u2642-\u2647\u2648-\u2653\u26B3-\u26B7\u260A\u260B]/u

for (const [name, src] of [
  ['ap-sky-card.js', sky],
  ['ap-moment-share.js', moment],
]) {
  ok(!/040812/i.test(src), `${name}: no legacy #040812 void`)
  ok(!/Georgia|IBM Plex|Plex Mono|Cormorant/i.test(src), `${name}: no legacy faces`)
  ok(/"AP Serif"/.test(src) && /"AP Sans"/.test(src), `${name}: letters in AP Serif + AP Sans`)
  ok(/#F6F3EC/i.test(src), `${name}: paper ground #F6F3EC`)
  ok(/#0E1116/i.test(src), `${name}: ink #0E1116`)
  ok(/#B4693E/i.test(src) || /#8A4A24/i.test(src), `${name}: copper accent`)
  ok(
    /document\.fonts/.test(src) && /\.load\(/.test(src),
    `${name}: waits for fonts before painting`,
  )
  ok(!ASTRO_GLYPHS.test(src), `${name}: no Unicode astrology glyphs (glyphs come from APGlyphs)`)
}

// Sky card: glyphs from code, size floor, honesty strings.
ok(/APGlyphs\.image\(/.test(sky), 'sky card draws glyphs with APGlyphs.image()')
const skyMin = Number((sky.match(/SKY_CARD_MIN_PX\s*=\s*(\d+)/) || [])[1])
ok(skyMin >= 16, 'sky card text floor >= 16 canvas px')
const skySizes = [...sky.matchAll(/(\d+)px ['"]?\s*\+?\s*(?:SERIF|SANS)/g)].map((m) => Number(m[1]))
ok(
  skySizes.length > 5 && skySizes.every((n) => n >= skyMin),
  `sky card font sizes >= floor (${[...new Set(skySizes)].sort((a, b) => a - b)})`,
)
for (const s of [
  'DAY OR NIGHT NOT STATED',
  'MISSING \\u2014 NO BIRTH HOUR',
  ' (ASSUMED)',
  'MOON PLACED FROM ',
  'NOT A CLAIM ABOUT YOUR LIFE',
  'COMPUTED ON THIS DEVICE',
]) {
  ok(sky.includes(s), `sky card keeps honesty string: ${s}`)
}
ok(/assetsReady\.then\(/.test(sky), 'sky card paints only after fonts + glyph images are ready')

// Moment card: size floor, honesty, night disc only around the plate.
const momMin = Number((moment.match(/MOMENT_MIN_PX\s*=\s*(\d+)/) || [])[1])
ok(momMin >= 20, 'moment card text floor >= 20 canvas px (1080 square)')
const momSizes = [...moment.matchAll(/(\d+)px ['"]?\s*\+?\s*(?:SERIF|SANS)/g)].map((m) =>
  Number(m[1]),
)
ok(
  momSizes.length > 5 && momSizes.every((n) => n >= momMin),
  `moment card font sizes >= floor (${[...new Set(momSizes)].sort((a, b) => a - b)})`,
)
ok(moment.includes('free PNG ≠ paid pack'), 'moment card keeps the free PNG ≠ paid pack line')
ok(/drawNightDisc/.test(moment), 'moment card keeps night only inside the plate disc')
ok(/cardFontsReady\(\)/.test(moment) && /await/.test(moment), 'async moment export awaits fonts')

// Page: the glyph module is loaded before the card, and the page sits on the ap-next tokens.
const gi = skyPage.indexOf('js/ap-glyphs.js'),
  ci = skyPage.indexOf('js/ap-sky-card.js')
ok(gi > 0 && ci > gi, 'synchronicity-card loads ap-glyphs.js before ap-sky-card.js')
ok(/css\/ap-next\.css/.test(skyPage), 'synchronicity-card loads ap-next.css (AP font faces)')
ok(/<body class="ap-next\b/.test(skyPage), 'synchronicity-card body is ap-next')
ok(
  !/040812/i.test(skyPage) && !/ap-living-sky-v834/.test(skyPage),
  'synchronicity-card has no legacy dark stack',
)

console.log(`test-share-canvases: ${passed} passed, 0 failed`)
