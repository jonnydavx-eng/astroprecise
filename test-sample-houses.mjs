// The Keepsake sample (website/sample-reading.html and its PDF) must place every body
// in the house the engine's current Placidus cusps give it, and its house wording must be
// internally consistent: one life-theme label and one context sentence per house number.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadEngines, norm } from './tools/fulfil-shared.mjs'
import { AURORA as A } from './tools/make-studio-samples.mjs'

let fails = 0
const ok = (name, cond, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond || !extra ? '' : `  (${extra})`}`)
  if (!cond) fails++
}
const { E } = loadEngines()
const c = E.calculateNatalChart(A.y, A.mo, A.d, A.h, A.mi, A.lat, A.lon, A.house)
const cusps = c.houses
const houseOf = (lon) => {
  lon = norm(lon)
  for (let i = 0; i < 12; i++) {
    const span = norm(cusps[(i + 1) % 12] - cusps[i]) || 30
    if (norm(lon - cusps[i]) < span) return i + 1
  }
  return 1
}
const SIGNS = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
]
const signOf = (lon) => SIGNS[Math.floor(norm(lon) / 30)]
const NAME = {
  sun: 'Sun',
  moon: 'Moon',
  mercury: 'Mercury',
  venus: 'Venus',
  mars: 'Mars',
  jupiter: 'Jupiter',
  saturn: 'Saturn',
  uranus: 'Uranus',
  neptune: 'Neptune',
  pluto: 'Pluto',
  chiron: 'Chiron',
  northNode: 'North Node',
}
const KEY = Object.fromEntries(Object.entries(NAME).map(([k, v]) => [v, k]))
const H = Object.fromEntries(Object.keys(NAME).map((k) => [k, houseOf(c.positions[k].longitude)]))
const ord = (n) => `${n}${n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'}`
console.log(
  'engine houses:',
  Object.entries(H)
    .map(([k, h]) => `${NAME[k]} ${ord(h)}`)
    .join(', '),
)

const html = readFileSync(join('website', 'sample-reading.html'), 'utf8')
const page = html
  .replace(/<style[\s\S]*?<\/style>/g, ' ')
  .replace(/<svg[\s\S]*?<\/svg>/g, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ')
const NAMES = Object.values(NAME).join('|')

// 1. Placements table (Body · Position · House · Sign)
for (const [k, n] of Object.entries(NAME)) {
  const m = html.match(
    new RegExp(
      `<td><span class="glyph">[^<]+</span> ${n}</td><td>[^<]+</td><td>(\\d+)(?:st|nd|rd|th)</td>`,
    ),
  )
  ok(
    `placements table: ${n} in the ${ord(H[k])}`,
    m && +m[1] === H[k],
    m ? `${m[1]}` : 'row not found',
  )
}
// 2. "Every body" headings and their "falls in the Nth house" sentences
for (const [k, n] of Object.entries(NAME)) {
  const hd = page.match(new RegExp(`${n} — \\d{1,2}°\\d{2}′ \\w+ · (\\d+)(?:st|nd|rd|th) house`))
  ok(`dossier heading: ${n} · ${ord(H[k])} house`, hd && +hd[1] === H[k], hd ? hd[1] : 'missing')
  const fl = page.match(new RegExp(`${n} in \\w+ falls in the (\\d+)(?:st|nd|rd|th) house`))
  ok(
    `dossier sentence: ${n} falls in the ${ord(H[k])}`,
    fl && +fl[1] === H[k],
    fl ? fl[1] : 'missing',
  )
}
// 3. Every prose mention "<Body> in <Sign>, in the Nth house" / "— Nth house (" headings
const prose = [
  ...page.matchAll(new RegExp(`(${NAMES}) in (\\w+) ?, in the (\\d+)(?:st|nd|rd|th) house`, 'g')),
]
ok('prose mentions found', prose.length >= 4, String(prose.length))
for (const m of prose)
  ok(
    `prose: ${m[1]} in ${m[2]}, in the ${m[3]}`,
    H[KEY[m[1]]] === +m[3] && signOf(c.positions[KEY[m[1]]].longitude) === m[2],
  )
const big = [
  ...page.matchAll(new RegExp(`The (${NAMES}) in (\\w+) — (\\d+)(?:st|nd|rd|th) house`, 'g')),
]
ok('big-three headings found', big.length >= 2, String(big.length))
for (const m of big) ok(`big-three heading: ${m[1]} — ${m[3]}`, H[KEY[m[1]]] === +m[3])
const isAt = [
  ...page.matchAll(new RegExp(`(${NAMES}) is at [^,]+, in the (\\d+)(?:st|nd|rd|th) house`, 'g')),
]
for (const m of isAt) ok(`ruler sentence: ${m[1]} in the ${m[2]}`, H[KEY[m[1]]] === +m[2])
const sat = page.match(/Saturn in Capricorn — (\d+)(?:st|nd|rd|th) House/)
if (sat) ok(`Saturn chapter heading: ${sat[1]}`, H.saturn === +sat[1])

// 4. House-by-house tables: cusp sign and occupants for all twelve houses
const themes = {}
for (let h = 1; h <= 12; h++) {
  const m = html.match(
    new RegExp(`<tr><td>${ord(h)}</td><td>(\\w+)</td><td>([^<]*)</td><td>([^<]+)</td></tr>`),
  )
  if (!m) {
    ok(`house table row ${ord(h)}`, false, 'missing')
    continue
  }
  themes[h] = m[3]
  ok(`house table ${ord(h)}: cusp ${signOf(cusps[h - 1])}`, m[1] === signOf(cusps[h - 1]), m[1])
  const want =
    Object.keys(NAME)
      .filter((k) => H[k] === h)
      .map((k) => NAME[k])
      .sort()
      .join(', ') || '—'
  const got =
    m[2] === '—'
      ? '—'
      : m[2]
          .split(', ')
          .map((x) => x.replace(/^\S+ /, ''))
          .sort()
          .join(', ')
  ok(`house table ${ord(h)}: ${want}`, got === want, got)
}
// angular notes (1st/4th/7th/10th with occupants), as reading-narrative.mjs writes them
for (const h of [1, 4, 7, 10]) {
  const inmates = Object.keys(NAME)
    .filter((k) => H[k] === h)
    .map((k) => NAME[k])
  const m = page.match(new RegExp(`${ord(h)} house \\(\\w+ cusp\\): ([^.]*?) concentrates? `))
  ok(
    `angular note ${ord(h)}: ${inmates.join(', ') || 'none'}`,
    inmates.length
      ? m &&
          m[1].split(', ').sort().join() === inmates.sort().join() &&
          (inmates.length === 1) === / concentrates $/.test(m[0])
      : !m,
    m ? m[1] : 'none',
  )
}
// 5. Wording consistency: each house number carries the table's life theme and one context sentence
const lens = [
  ...page.matchAll(
    /falls in the (\d+)(?:st|nd|rd|th) house — a traditional lens on ([^.]+?)\. In this edition, the (\d+)(?:st|nd|rd|th) house supplies symbolic context for ([^.]+)\./g,
  ),
]
ok(
  'a lens sentence for every body (Venus repeats in the Big Three)',
  lens.length >= 12 && Object.values(NAME).every((n) => page.includes(`${n} in `)),
  String(lens.length),
)
const ctx = {}
for (const m of lens) {
  ok(
    `lens ${ord(+m[1])}: "${m[2]}" = table theme`,
    m[1] === m[3] && themes[+m[1]] === m[2],
    themes[+m[1]],
  )
  ;(ctx[m[1]] ||= new Set()).add(m[4])
}
for (const m of page.matchAll(
  /the (\d+)(?:st|nd|rd|th) house supplies symbolic context for ([^.]+)\./g,
))
  (ctx[m[1]] ||= new Set()).add(m[2])
for (const [h, s] of Object.entries(ctx))
  ok(`one context sentence for the ${ord(+h)} house`, s.size === 1, [...s].join(' | '))
// No house paragraph repeats a word between its lens and its context sentence. The 11th
// once said "aims" twice (collective aims ... shared aims); the 6th "daily", 8th
// "shared/resources/change", 10th "public" and 12th "rest" did the same before v935.
const WORD_SKIP = new Set(['and', 'the', 'what', 'with', 'for', 'that', 'this', 'from'])
const words = (t) =>
  (t.toLowerCase().match(/[a-z]+(?:-[a-z]+)*/g) || []).filter(
    (w) => w.length > 2 && !WORD_SKIP.has(w),
  )
const repeatSeen = new Set()
for (const m of lens) {
  if (repeatSeen.has(m[1])) continue
  repeatSeen.add(m[1])
  const lensWords = new Set(words(m[2]))
  const shared = [...new Set(words(m[4]).filter((w) => lensWords.has(w)))]
  ok(
    `${ord(+m[1])}-house paragraph repeats no word between lens and context`,
    shared.length === 0,
    `${shared.join(', ')}: ${m[2]} | ${m[4]}`,
  )
}
ok(
  '11th-house paragraph still has one "aims"',
  lens
    .filter((x) => x[1] === '11')
    .every((m) => (`${m[2]} ${m[4]}`.match(/\baims\b/g) || []).length === 1),
)
for (const [h, want] of [
  ['6', 'regular practice, service, maintenance, and useful skill'],
  ['8', 'what is held in common, trust, boundaries, and transition'],
  ['10', 'contribution to the wider world, reputation, and long-term direction'],
  ['11', 'friendship, networks, shared ideals, and hopes for the future'],
  ['12', 'quiet recovery, retreat, reflection, and what is processed privately'],
])
  ok(
    `${ord(+h)}-house context sentence wording`,
    ctx[h] && ctx[h].size === 1 && ctx[h].has(want),
    ctx[h] ? [...ctx[h]].join(' | ') : 'missing',
  )
const hd = [
  ...page.matchAll(
    new RegExp(`(${NAMES}) in \\w+ — (\\d+)(?:st|nd|rd|th) house \\(([^)]+)\\)`, 'g'),
  ),
]
for (const m of hd)
  ok(
    `heading theme ${ord(+m[2])}: "${m[3]}"`,
    themes[+m[2]] === m[3] || (+m[2] === 1 && m[3] === themes[1]),
  )
const moonAssoc = page.match(/The Moon's house is traditionally associated here with ([^.]+)\./)
ok(
  'Moon paragraph names its house theme',
  moonAssoc && moonAssoc[1] === themes[H.moon],
  moonAssoc && moonAssoc[1],
)
// stellium: the houses named equal the engine houses of the Capricorn bodies
const capH = [...new Set(['saturn', 'uranus', 'neptune'].map((k) => H[k]))].sort((a, b) => a - b)
ok(
  `stellium spans the ${capH.map(ord).join(' & ')} houses`,
  page.includes(`the ${capH.map(ord).join(' & ')} houses`),
)
ok(
  'pattern note names the same houses',
  page.includes(
    `falls across houses of ${capH.map((h) => `the ${ord(h)} (${themes[h]})`).join(', ')}.`,
  ),
)

// 5b. Sign wording: a degree is never followed by its own sign again ("29°51′ Capricorn in
// Capricorn", "3°21′ Gemini in Gemini" before v936), and a "considered through" pairing
// never repeats a word from its own lead ("…exchange considered through curiosity and exchange").
const SIGN_RE = SIGNS.join('|')
const dupSign = (t) =>
  [...t.matchAll(new RegExp(`\\d{1,2}°\\d{2} ?′ (${SIGN_RE}) in (${SIGN_RE})\\b`, 'g'))].filter(
    (m) => m[1] === m[2],
  )
ok(
  'no "<degree> X in X" sign duplication',
  dupSign(page).length === 0,
  dupSign(page)
    .map((m) => m[0])
    .join(' | '),
)
// HELD: Saturn in Capricorn ("structure, limits and responsibility considered through structure
// and long-range effort") repeats "structure"; its new wording awaits an owner ruling.
const PAIR_HELD = new Set(['Saturn in Capricorn'])
const pairs = [...page.matchAll(/pairs (\w+) in (\w+) — ([^.]+?) considered through ([^.]+?)\./g)]
ok('considered-through pairings found', pairs.length >= 10, String(pairs.length))
for (const m of pairs) {
  const lead = new Set(words(m[3]))
  const shared = [...new Set(words(m[4]).filter((w) => lead.has(w)))]
  if (PAIR_HELD.has(`${m[1]} in ${m[2]}`)) continue
  ok(
    `${m[1]} in ${m[2]}: pairing repeats no word`,
    shared.length === 0,
    `${shared.join(', ')}: ${m[0]}`,
  )
}
const mercGem = [...page.matchAll(/Mercury in Gemini — [^.]+?\./g)].map((m) => m[0])
ok(
  'Mercury in Gemini ends "curiosity and versatility"',
  mercGem.length >= 3 &&
    mercGem.every((t) => t.endsWith('considered through curiosity and versatility.')),
  mercGem.join(' | '),
)

// 6. The committed Keepsake PDF carries the same dossier houses
const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
const doc = await pdfjs.getDocument({
  data: new Uint8Array(
    readFileSync(join('website', 'downloads', 'studio', 'personal-sky-keepsake-sample.pdf')),
  ),
  useSystemFonts: false,
  disableFontFace: true,
}).promise
let pdf = ''
for (let i = 1; i <= doc.numPages; i++)
  pdf += ' ' + (await (await doc.getPage(i)).getTextContent()).items.map((t) => t.str).join(' ')
pdf = pdf.replace(/\s+/g, ' ')
for (const [k, n] of Object.entries(NAME)) {
  const m = [
    ...pdf.matchAll(
      new RegExp(`${n} — \\d{1,2}°\\d{2} ?′ \\w+ · (\\d+)(?:st|nd|rd|th) house`, 'g'),
    ),
  ]
  ok(
    `keepsake PDF: ${n} · ${ord(H[k])} house`,
    m.length > 0 && m.every((x) => +x[1] === H[k]),
    m.map((x) => x[1]).join(','),
  )
}
ok(
  'keepsake PDF: Moon big-three heading',
  pdf.includes(`The Moon in Aquarius — ${ord(H.moon)} house (${themes[H.moon]})`),
)
ok(
  'keepsake PDF: no "<degree> X in X" sign duplication',
  dupSign(pdf).length === 0,
  dupSign(pdf)
    .map((m) => m[0])
    .join(' | '),
)
ok(
  'keepsake PDF: Mercury in Gemini ends "curiosity and versatility"',
  !/exchange considered through curiosity and exchange/.test(pdf) &&
    pdf.includes('curiosity and versatility'),
)
await doc.cleanup?.()

console.log(fails ? `\n${fails} sample-house check(s) failed` : '\nall sample house checks passed')
process.exit(fails ? 1 : 0)
