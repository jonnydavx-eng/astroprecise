/**
 * Step 10b — share canvases on Paper & Night. Step 10c — every text draw is measured.
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
// Step 10c: the card is 1080 units wide and seen about 360 CSS px wide on a phone, so the
// floor is 33 units (11 px). Every text draw is measured below with the real painter.
const skyMin = Number((sky.match(/SKY_CARD_MIN_PX\s*=\s*(\d+)/) || [])[1])
ok(skyMin >= 33, `sky card text floor >= 33 canvas px (${skyMin})`)
ok(
  /<canvas id="skyCard" width="1080" height="1440"/.test(skyPage),
  'sky card canvas is 1080 x 1440',
)
ok(
  !/1200 × 630|small on a phone/.test(skyPage),
  'sky card page no longer describes a 1200 × 630 plate',
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
ok(momMin >= 33, `moment card text floor >= 33 canvas px (1080 square) (${momMin})`)
ok(
  moment.includes('Free image · the full pack is separate'),
  'moment card says: Free image · the full pack is separate',
)
ok(
  !/≠|free PNG|paid pack|stars = |plate = /.test(moment),
  'moment card has no internal shorthand (≠, free PNG, paid pack, x = y)',
)
ok(/drawNightDisc/.test(moment), 'moment card keeps night only inside the plate disc')
ok(/cardFontsReady\(\)/.test(moment) && /await/.test(moment), 'async moment export awaits fonts')

// Every text draw, measured: the real painters run in Node (tools/share-canvas-probe.mjs) with
// the repo's fonts. Each line must be >= 11 px at 360 CSS px wide, inside the card frame, and
// clear of every other line.
const probe = await import('./tools/share-canvas-probe.mjs')
const { MIN_EFFECTIVE_PX, PHONE_CSS_PX, effectivePx, extent } = probe
const box = (d) => {
  const [x0, x1] = extent(d)
  return { x0, x1, y0: d.y - d.px * 0.74, y1: d.y + d.px * 0.22 }
}
function checkCard(label, r) {
  ok(r.draws.length > 0, `${label}: draws text`)
  const small = r.draws.filter((d) => effectivePx(d.px, r.width) < MIN_EFFECTIVE_PX - 1e-9)
  ok(
    small.length === 0,
    `${label}: every line >= ${MIN_EFFECTIVE_PX} px at ${PHONE_CSS_PX} wide (` +
      `min ${Math.min(...r.draws.map((d) => effectivePx(d.px, r.width))).toFixed(2)} px)` +
      small.map((d) => ` [${d.px}u ${d.text}]`).join(''),
  )
  const out = r.draws.filter((d) => {
    const b = box(d)
    return b.x0 < r.frame || b.x1 > r.width - r.frame || b.y0 < r.frame || b.y1 > r.height - r.frame
  })
  ok(
    out.length === 0,
    `${label}: every line inside the frame` + out.map((d) => ` [${d.text}]`).join(''),
  )
  const clashes = []
  for (let i = 0; i < r.draws.length; i++)
    for (let j = i + 1; j < r.draws.length; j++) {
      const a = box(r.draws[i]),
        b = box(r.draws[j])
      if (a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1)
        clashes.push(`${r.draws[i].text} / ${r.draws[j].text}`)
    }
  ok(clashes.length === 0, `${label}: no two lines overlap ${clashes.join('; ')}`)
}
const footerRule = Number((sky.match(/FOOTER_RULE\s*=\s*(\d+)/) || [])[1])
const footerText = new Set([
  'AstroPrecise',
  'COMPUTED ON THIS DEVICE',
  'NOT A CLAIM ABOUT YOUR LIFE',
  'DEVICE CLOCK · FOLK PATTERN ONLY',
  'NOT A NATAL CLAIM',
])
for (const scenario of ['placeholder', 'known', 'unknown', 'long', 'sync']) {
  const r = await probe.probeSkyCard(scenario)
  checkCard(`sky card (${scenario})`, r)
  ok(
    r.draws.filter((d) => !footerText.has(d.text)).every((d) => d.y + d.px * 0.22 < footerRule),
    `sky card (${scenario}): body ends above the footer rule`,
  )
  const texts = r.draws.map((d) => d.text).join('\n')
  if (scenario === 'unknown' || scenario === 'long') {
    ok(
      texts.includes('DAY OR NIGHT NOT STATED'),
      `sky card (${scenario}) prints DAY OR NIGHT NOT STATED`,
    )
    ok(
      texts.includes('MISSING — NO BIRTH HOUR'),
      `sky card (${scenario}) prints MISSING — NO BIRTH HOUR`,
    )
    ok(texts.includes('(ASSUMED)'), `sky card (${scenario}) prints (ASSUMED)`)
    ok(/MOON PLACED FROM 12:00 LOCAL/.test(texts), `sky card (${scenario}) prints the Moon note`)
  }
  if (scenario === 'known')
    ok(/RISING/.test(texts) && /°/.test(texts), 'sky card (known) prints rising')
  if (scenario === 'sync') {
    ok(
      texts.includes('AstroPrecise does not invent or own'),
      'sync plate says AstroPrecise (one word)',
    )
    ok(!/Astro Precise/.test(texts), 'sync plate never prints "Astro Precise"')
  }
  if (scenario !== 'placeholder' && scenario !== 'sync')
    ok(
      texts.includes('NOT A CLAIM ABOUT YOUR LIFE'),
      `sky card (${scenario}) keeps the footer honesty`,
    )
}
const m = await probe.probeMomentCard()
checkCard('moment card', m)
ok(
  m.draws.some((d) => d.text === 'Free image · the full pack is separate'),
  'moment card prints: Free image · the full pack is separate',
)
const longTitle = await probe.probeMomentCard({
  kind: 'custom',
  title: 'The evening the whole family finally met in the old harbour town',
  subtitle: 'Quiet keepsake — any date that matters',
  dateLabel: '30 September 2001 · 23:59',
  placeLabel: 'Llanfairpwllgwyngyll, Anglesey, Wales, United Kingdom',
  zenith: {
    star: {
      name: 'Alpha Centauri',
      con: 'Cen',
      spectral: 'G2V',
      mag: -0.27,
      ly: 4.37,
      ra: 220,
      dec: -60,
    },
    sepDeg: 12.3,
    zenithRa: 221,
    zenithDec: -59,
  },
  storyLine:
    'Light has travelled about 25 light-years since this night. Nearest zenith star: Alpha Centauri (12.3° from exact overhead). A long line to test the three-line limit on the card.',
})
checkCard('moment card (long title, place and story)', longTitle)

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

// Step 10c ruling 4: share/brand copy uses the one-word wordmark (comments may still say it).
for (const f of [
  'js/ap-sky-card.js',
  'js/ap-moment-share.js',
  'js/ap-mirror-hour.js',
  'js/moment-page.js',
  'js/moonphase.js',
  'js/saturn-return.js',
  'js/ap-ai-assistant.js',
]) {
  const code = readFileSync(new URL('./website/' + f, import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
  ok(!/Astro Precise/.test(code), `${f}: share/brand copy says AstroPrecise (one word)`)
}

// ── Step 10d ─────────────────────────────────────────────────────────────────────────────
// Every shipped file says AstroPrecise (one word). Comments may still say it. Three files
// are allowed to keep it for now, because their checkout/fulfilment copy waits for Jonny.
const { readdirSync, statSync } = await import('node:fs')
const { join, relative, extname } = await import('node:path')
const WEB = new URL('./website/', import.meta.url).pathname
const BRAND_ALLOW = new Map([
  ['fulfil-redirect.html', 'checkout/fulfilment copy waits for Jonny'],
  ['js/shop-commerce.js', 'checkout/fulfilment copy waits for Jonny'],
  ['js/ap-checkout-honest.js', 'checkout/fulfilment copy waits for Jonny'],
])
const BRAND_EXT = new Set(['.html', '.js', '.mjs', '.json', '.svg', '.txt', '.xml', '.webmanifest'])
const shipped = []
;(function walk(dir) {
  for (const n of readdirSync(dir)) {
    if (
      n.startsWith('.') ||
      n === 'node_modules' ||
      /\.(pre-[\w-]+|bak)$/.test(n) ||
      /\.pre-/.test(n)
    )
      continue
    const f = join(dir, n)
    if (statSync(f).isDirectory()) walk(f)
    else if (BRAND_EXT.has(extname(n))) shipped.push(relative(WEB, f).split('\\').join('/'))
  }
})(WEB)
ok(shipped.length > 300, `brand check walks the shipped site (${shipped.length} files)`)
for (const f of BRAND_ALLOW.keys())
  ok(shipped.includes(f), `brand allowlist entry exists: ${f} (${BRAND_ALLOW.get(f)})`)
const spaced = []
for (const f of shipped) {
  if (BRAND_ALLOW.has(f)) continue
  let code = readFileSync(join(WEB, f), 'utf8')
  if (/\.(js|mjs)$/.test(f))
    code = code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
  else code = code.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
  if (/astro precise/i.test(code)) spaced.push(f)
}
ok(spaced.length === 0, `every shipped file says AstroPrecise (one word): ${spaced.join(', ')}`)

// Plain words for the method, not shorthand, on the Moment and Instrument cards.
const instrument = read('./website/js/instrument.js')
for (const [name, src] of [
  ['ap-moment-share.js', moment],
  ['instrument.js', instrument],
]) {
  for (const old of ['J2000 catalogue + LST', 'computed · J2000', 'LST + latitude', '· VSOP87'])
    ok(!src.includes(old), `${name}: no "${old}" shorthand`)
}
ok(
  m.draws.some((d) => d.text === 'Calculated from star positions and local sidereal time'),
  'moment card badge: Calculated from star positions and local sidereal time',
)
ok(
  moment.includes("'calculated from local sidereal time and latitude.'"),
  'moment card fallback says: calculated from local sidereal time and latitude',
)

// Share images on the sky-card.html poster and the Instrument cards (ephemeris.html): every
// text draw >= 11 px when the image is shown 360 px wide.
function checkFloor(label, r) {
  ok(r.draws.length > 0, `${label}: draws text`)
  const small = r.draws.filter((d) => effectivePx(d.px, r.width) < MIN_EFFECTIVE_PX - 1e-9)
  ok(
    small.length === 0,
    `${label}: every line >= ${MIN_EFFECTIVE_PX} px at ${PHONE_CSS_PX} wide (min ` +
      `${Math.min(...r.draws.map((d) => effectivePx(d.px, r.width))).toFixed(2)} px)` +
      small.map((d) => ` [${d.px}u ${d.text}]`).join(''),
  )
}
function checkLayout(label, r, draws) {
  const out = draws.filter((d) => {
    const b = box(d)
    return b.x0 < r.frame || b.x1 > r.width - r.frame || b.y0 < r.frame || b.y1 > r.height - r.frame
  })
  ok(
    out.length === 0,
    `${label}: every line inside the frame` + out.map((d) => ` [${d.text}]`).join(''),
  )
  const clashes = []
  for (let i = 0; i < draws.length; i++)
    for (let j = i + 1; j < draws.length; j++) {
      const a = box(draws[i]),
        b = box(draws[j])
      if (a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1)
        clashes.push(`${draws[i].text} / ${draws[j].text}`)
    }
  ok(clashes.length === 0, `${label}: no two lines overlap ${clashes.join('; ')}`)
}
for (const [label, scenario, opts] of [
  ['poster (known birth)', 'known', {}],
  ['poster (unknown birth time)', 'unknown', {}],
  [
    'poster (birth hidden, long title)',
    'known',
    { includeBirth: false, name: 'A very long title for my sky card' },
  ],
]) {
  const r = await probe.probeKeepsakePoster(scenario, opts)
  checkFloor(label, r)
  // Sign names are set on a circle (rotated); the straight lines are checked for fit and overlap.
  checkLayout(
    label,
    r,
    r.draws.filter((d) => !d.rotate),
  )
  ok(
    r.draws.some((d) => d.text === 'ASTROPRECISE'),
    `${label}: wordmark is ASTROPRECISE`,
  )
}
for (const [label, kind, opts] of [
  ['instrument light-cone card', 'lightcone', {}],
  ['instrument zenith card', 'zenith', {}],
  ['instrument daily card', 'daily', {}],
  ['instrument daily card (feed down)', 'daily', { measured: false }],
]) {
  const r = await probe.probeInstrumentCard(kind, opts)
  checkFloor(label, r)
  checkLayout(label, r, r.draws)
  ok(
    r.draws.every((d) => !/J2000|LST|VSOP87/.test(d.text)),
    `${label}: no J2000 / LST / VSOP87 shorthand`,
  )
  if (label.includes('feed down')) {
    const badge = r.draws.map((d) => d.text).join(' ')
    ok(
      /Live space-weather feed unavailable, showing calculated values/.test(
        badge.replace(/\s+/g, ' '),
      ) && !/feed down|computed only/.test(badge),
      `${label}: feed-down badge is plain words`,
    )
  }
  if (kind === 'zenith')
    ok(
      r.draws.some((d) => d.text.startsWith('Calculated from star positions')),
      `${label}: badge says Calculated from star positions and local sidereal time`,
    )
}
// Step 10d-eclipse: the eclipse edition plate (2400 × 3000) and its disc (2000 × 2000), drawn by
// the real painters. Every line >= 11 px at 360 wide, the plate's header and footer fit and clear
// each other, and the natal wheel holds its rules on every test chart (checkEclipseWheel): no
// disc/disc, label/disc or label/label overlap, each label inside its own disc, nothing over the
// sign marks, no leader under another disc, no two leaders crossing, every disc centre inside its
// true sign, the eclipse line and dot at the eclipse degree, and a tick at every exact degree.
const eclipseSrc = read('./website/js/ap-eclipse-edition-v841.js')
const plateFamilies = new Set(probe.SITE_FONTS.map(([, family]) => family))
const firstFamily = (font) => (String(font).match(/px\s+"([^"]+)"/) || [])[1]
// Weights the site ships per family (from the file names; a variable or single-face file takes any
// weight). A weight not shipped would be faked in browsers and on CI but could pick up a locally
// installed face on a machine that has one, so the plate would measure differently there.
const shippedWeights = new Map()
for (const [file, family] of probe.SITE_FONTS) {
  const w = (file.match(/-normal-(\d{3})\.woff2$/) || [])[1]
  if (/-italic-/.test(file)) continue
  if (!w) shippedWeights.set(family, null)
  else if (shippedWeights.get(family) !== null)
    shippedWeights.set(family, [...(shippedWeights.get(family) || []), w])
}
const weightOf = (font) => (String(font).match(/^\s*(?:italic\s+)?(\d{3})\s/) || [null, '400'])[1]
for (const which of ['artwork', 'disc']) {
  const r = await probe.probeEclipsePlate(which)
  checkFloor(`eclipse ${which}`, r)
  const foreign = r.draws.filter((d) => !plateFamilies.has(firstFamily(d.font)))
  ok(
    foreign.length === 0,
    `eclipse ${which}: every line asks first for a site font from website/fonts` +
      foreign.map((d) => ` [${d.font} ${d.text}]`).join(''),
  )
  const unshipped = r.draws.filter((d) => {
    const weights = shippedWeights.get(firstFamily(d.font))
    return weights && !weights.includes(weightOf(d.font))
  })
  ok(
    unshipped.length === 0,
    `eclipse ${which}: every line uses a weight the site ships` +
      unshipped.map((d) => ` [${d.font} ${d.text}]`).join(''),
  )
}
{
  const r = await probe.probeEclipsePlate('artwork')
  const W = r.wheel
  const offWheel = r.draws.filter((d) => {
    const cx = (d.ink.x0 + d.ink.x1) / 2,
      cy = (d.ink.y0 + d.ink.y1) / 2
    return Math.hypot(cx - W.x, cy - W.y) > W.outerR + 48
  })
  ok(offWheel.length >= 4, `eclipse plate: header and footer lines found (${offWheel.length})`)
  const outside = offWheel.filter(
    (d) => d.ink.x0 < 0 || d.ink.y0 < 0 || d.ink.x1 > r.width || d.ink.y1 > r.height,
  )
  ok(outside.length === 0, `eclipse plate: header and footer fit the plate` + outside.map((d) => ` [${d.text}]`).join(''))
  const hits = []
  for (let i = 0; i < offWheel.length; i++)
    for (let j = i + 1; j < offWheel.length; j++) {
      const a = offWheel[i].ink,
        b = offWheel[j].ink
      if (a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1)
        hits.push(`${offWheel[i].text} / ${offWheel[j].text}`)
    }
  ok(hits.length === 0, `eclipse plate: header and footer lines do not overlap ${hits.join('; ')}`)
  const footTop = Math.min(...offWheel.filter((d) => d.ink.y0 > W.y).map((d) => d.ink.y0))
  // The wheel reaches outerR + 29 (the eclipse line and its dot).
  ok(footTop > W.y + W.outerR + 29, `eclipse plate: footer starts below the wheel (${footTop.toFixed(0)})`)
}
ok(/export const PLATE_WHEEL/.test(eclipseSrc), 'eclipse plate exports its wheel geometry')
ok(!/globalThis\.__/.test(eclipseSrc), 'eclipse plate has no debug hooks')
const lonAngle = (lon) => Math.PI - (lon * Math.PI) / 180
for (const [name, natal] of await probe.eclipseWheelCharts()) {
  const r = await probe.probeEclipsePlate('artwork', { natal })
  const label = `eclipse wheel, ${name}`
  checkFloor(label, r)
  const c = probe.checkEclipseWheel(r)
  for (const [rule, list] of Object.entries(c.problems))
    ok(list.length === 0, `${label}: ${rule} — ${list.length ? list.join('; ') : 'clean'}`)
  ok(c.discs.length === Object.keys(natal).length, `${label}: one disc per point (${c.discs.length})`)
  const W = r.wheel
  const E = probe.ECLIPSE_LONGITUDE
  // The eclipse marker: an ember line out along the eclipse degree, ending in the dot.
  const dotAt = [W.x + Math.cos(lonAngle(E)) * (W.outerR + 18), W.y + Math.sin(lonAngle(E)) * (W.outerR + 18)]
  const lineFrom = [W.x + Math.cos(lonAngle(E)) * (W.innerR + 18), W.y + Math.sin(lonAngle(E)) * (W.innerR + 18)]
  ok(
    r.segments.some(
      (s) =>
        s.width === 7 &&
        Math.hypot(s.x0 - lineFrom[0], s.y0 - lineFrom[1]) < 1e-6 &&
        Math.hypot(s.x1 - dotAt[0], s.y1 - dotAt[1]) < 1e-6,
    ),
    `${label}: eclipse line at ${E}°`,
  )
  ok(
    r.arcs.some((a) => a.full && a.r === 11 && Math.hypot(a.x - dotAt[0], a.y - dotAt[1]) < 1e-6),
    `${label}: eclipse dot fixed at the end of the eclipse line`,
  )
  // A tick at every exact degree, out from the inner circle.
  const missing = Object.entries(natal).filter(([, lon]) => {
    const a = lonAngle(lon)
    return !r.segments.some(
      (s) =>
        s.width === 3 &&
        Math.hypot(s.x0 - (W.x + Math.cos(a) * W.innerR), s.y0 - (W.y + Math.sin(a) * W.innerR)) < 1e-6 &&
        Math.hypot(s.x1 - (W.x + Math.cos(a) * (W.innerR + W.degreeTick)), s.y1 - (W.y + Math.sin(a) * (W.innerR + W.degreeTick))) < 1e-6,
    )
  })
  ok(missing.length === 0, `${label}: exact-degree tick for every point ${missing.map(([k]) => k).join(', ')}`)
}

console.log(`test-share-canvases: ${passed} passed, 0 failed`)
