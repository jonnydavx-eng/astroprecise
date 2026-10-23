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

// Share images on the sky-card.html poster, the Instrument cards (ephemeris.html) and the
// eclipse edition plate: every text draw >= 11 px when the image is shown 360 px wide.
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
  if (kind === 'zenith')
    ok(
      r.draws.some((d) => d.text.startsWith('Calculated from star positions')),
      `${label}: badge says Calculated from star positions and local sidereal time`,
    )
}
// The eclipse edition (closed to new purchases; the plate is the paid PNG) — only its text sizes
// changed. Wheel labels are drawn around the wheel centre, so only the floor is checked there.
for (const [label, which] of [
  ['eclipse edition plate', 'artwork'],
  ['eclipse disc (captions)', 'disc'],
]) {
  const r = await probe.probeEclipsePlate(which)
  checkFloor(label, r)
  const flat = r.draws.filter((d) => d.x >= 0 && d.w > 60)
  ok(
    flat.every((d) => box(d).x1 <= r.width - 64),
    `${label}: header and footer lines fit the width`,
  )
}

// Eclipse plate wheel: markers never collide. Disc and label boxes come from the real drawing
// code (arc() and fillText ink boxes recorded by the probe). Checked on Grok's crowded chart, a
// normal chart, stacked charts and seeded random charts.
const WHEEL = { x: 1200, y: 1760, inner: 248, outer: 700 }
function wheelMarkers(r) {
  const fromCentre = (x, y) => Math.hypot(x - WHEEL.x, y - WHEEL.y)
  const discs = r.arcs.filter(
    (a) =>
      a.full &&
      a.r >= 20 &&
      a.r <= 120 &&
      fromCentre(a.x, a.y) > WHEEL.inner &&
      fromCentre(a.x, a.y) < 640,
  )
  const labels = r.draws
    .filter(
      (d) =>
        d.ink && fromCentre((d.ink.x0 + d.ink.x1) / 2, (d.ink.y0 + d.ink.y1) / 2) < WHEEL.outer,
    )
    .map((d) => {
      const cx = (d.ink.x0 + d.ink.x1) / 2,
        cy = (d.ink.y0 + d.ink.y1) / 2
      const own = discs
        .map((c) => ({ c, d: Math.hypot(c.x - cx, c.y - cy) }))
        .filter((o) => o.d < o.c.r)
        .sort((a, b) => a.d - b.d)[0]
      return { text: d.text, box: d.ink, own: own ? own.c : null }
    })
  return { discs, labels }
}
const rectHitsCircle = (b, c) => {
  const nx = Math.max(b.x0, Math.min(c.x, b.x1)),
    ny = Math.max(b.y0, Math.min(c.y, b.y1))
  return Math.hypot(nx - c.x, ny - c.y) < c.r
}
const rectsHit = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1
const boxInCircle = (b, c) =>
  [
    [b.x0, b.y0],
    [b.x1, b.y0],
    [b.x0, b.y1],
    [b.x1, b.y1],
  ].every(([x, y]) => Math.hypot(x - c.x, y - c.y) <= c.r)
export function wheelClashes(r) {
  const { discs, labels } = wheelMarkers(r)
  const bad = []
  for (let i = 0; i < discs.length; i++)
    for (let j = i + 1; j < discs.length; j++) {
      const a = discs[i],
        b = discs[j]
      if (Math.hypot(a.x - b.x, a.y - b.y) < a.r + b.r)
        bad.push(`disc/disc at ${a.x | 0},${a.y | 0}`)
    }
  for (const l of labels) {
    if (l.own && !boxInCircle(l.box, l.own)) bad.push(`"${l.text}" spills out of its disc`)
    for (const c of discs)
      if (c !== l.own && rectHitsCircle(l.box, c)) bad.push(`"${l.text}" over another disc`)
  }
  for (let i = 0; i < labels.length; i++)
    for (let j = i + 1; j < labels.length; j++)
      if (rectsHit(labels[i].box, labels[j].box))
        bad.push(`"${labels[i].text}" / "${labels[j].text}"`)
  const owners = new Set(labels.filter((l) => l.own).map((l) => l.own))
  if (owners.size !== discs.length)
    bad.push(`${discs.length - owners.size} disc(s) without their own label inside`)
  return { bad, discs: discs.length, labels: labels.length }
}
const ECL = 140.133
const seeded = (seed) => () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648
const KEYS = [
  'moon',
  'mercury',
  'venus',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
  'pluto',
  'asc',
  'mc',
]
const wheelCharts = [
  [
    'crowded (Asc 12, Moon 18, Uranus 28, Mercury 132, Sun on the eclipse)',
    probe.ECLIPSE_CROWDED_NATAL,
  ],
  [
    'normal',
    {
      sun: ECL,
      moon: 200,
      mercury: 162,
      venus: 100,
      mars: 60,
      jupiter: 20,
      saturn: 330,
      uranus: 290,
      neptune: 250,
      pluto: 225,
      asc: 175,
      mc: 85,
    },
  ],
  [
    'four planets within 10°',
    {
      sun: ECL,
      moon: 260,
      mercury: 100,
      venus: 103,
      mars: 106,
      jupiter: 109,
      saturn: 330,
      uranus: 20,
      neptune: 50,
      pluto: 210,
      asc: 300,
      mc: 190,
    },
  ],
  [
    'stacked on the eclipse point',
    {
      sun: ECL,
      moon: 135,
      mercury: 138,
      venus: 143,
      mars: 146,
      jupiter: 20,
      saturn: 330,
      uranus: 60,
      neptune: 250,
      pluto: 200,
      asc: 141,
      mc: 52,
    },
  ],
  [
    'stellium (Sun to Pluto inside 30°)',
    {
      sun: ECL,
      moon: 128,
      mercury: 131,
      venus: 134,
      mars: 137,
      jupiter: 144,
      saturn: 147,
      uranus: 150,
      neptune: 153,
      pluto: 156,
      asc: 300,
      mc: 210,
    },
  ],
]
for (const seed of [7, 42, 1999, 20261023]) {
  const rnd = seeded(seed)
  const base = rnd() * 360
  const natal = { sun: ECL }
  // Half the points fall in one 25° bunch, the rest anywhere.
  KEYS.forEach((k, i) => (natal[k] = i % 2 ? (base + rnd() * 25) % 360 : rnd() * 360))
  wheelCharts.push([`random seed ${seed}`, natal])
}
for (const [label, natal] of wheelCharts) {
  const r = await probe.probeEclipsePlate('artwork', { natal })
  const c = wheelClashes(r)
  ok(c.discs >= 12, `eclipse wheel (${label}): ${c.discs} marker discs recorded`)
  ok(c.bad.length === 0, `eclipse wheel (${label}): no disc or label overlaps ${c.bad.join('; ')}`)
  checkFloor(`eclipse plate (${label})`, r)
}

console.log(`test-share-canvases: ${passed} passed, 0 failed`)
