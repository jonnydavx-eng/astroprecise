import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const sealRoot = new URL('./website/assets/images/seals/', import.meta.url)
const sealRootPath = fileURLToPath(sealRoot)
const cssRoot = new URL('./website/css/', import.meta.url)
const sealCssUrl = new URL('./website/css/celestial-seals.css', import.meta.url)

const expected = new Map([
  ['elements', ['air', 'all', 'earth', 'fire', 'water']],
  [
    'instruments',
    ['chart', 'compatibility', 'horoscope', 'instrument', 'lifepath', 'oracle', 'shop', 'transits'],
  ],
  [
    'planets',
    [
      'earth',
      'jupiter',
      'mars',
      'mercury',
      'moon',
      'neptune',
      'pluto',
      'saturn',
      'sun',
      'uranus',
      'venus',
    ],
  ],
  [
    'zodiac',
    [
      'aquarius',
      'aries',
      'cancer',
      'capricorn',
      'gemini',
      'leo',
      'libra',
      'pisces',
      'sagittarius',
      'scorpio',
      'taurus',
      'virgo',
    ],
  ],
])

const midnightMeridian = new Set([
  '#040812',
  '#0a1424',
  '#101d30',
  '#17263b',
  '#eef4fa',
  '#93a8bf',
  '#c9d6e3',
  '#8ba9ff',
  '#a5bcff',
  '#a897ff',
  '#6fd0b3',
  '#ff8ea8',
  '#79c7f2',
])

const retired = new Set([
  '#d8b46a',
  '#e05a3a',
  '#3f7d76',
  '#5e8a4a',
  '#a78bba',
  '#f2ecdf',
  '#0a0a10',
  '#1a1a22',
  '#0a0a0c',
  '#000000',
  '#fff',
])

const failures = []
const expectedFiles = []

const parseCssRules = (source) => [
  ...source.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g),
].map((match) => ({
  selectors: match[1].split(',').map((selector) => selector.trim()),
  body: match[2],
}))

const sealCss = await readFile(sealCssUrl, 'utf8')
const cssRules = parseCssRules(sealCss)

const findRule = (selector) => cssRules.find((rule) => rule.selectors.includes(selector))
const exactHex =
  'polygon(50% 5.36%, 89.58% 25%, 89.58% 75%, 50% 94.64%, 10.42% 75%, 10.42% 25%)'
if (!sealCss.includes(`--ap-seal-hex: ${exactHex};`)) {
  failures.push('celestial-seals.css: canonical 96 x 112 hex projection changed')
}

for (const selector of [
  '.ap-seal',
  '.home-sign-card__seal',
  '.sign-hero__glyph.sign-hero__seal',
  '.sign-card__seal',
]) {
  const rule = findRule(selector)
  if (!rule || !/\baspect-ratio:\s*6\s*\/\s*7\s*;/i.test(rule.body)) {
    failures.push(`celestial-seals.css: ${selector} must preserve the exact 6:7 master ratio`)
  }
}

const previewRule = findRule('.home-sign-preview__thumb--seal')
if (
  !previewRule ||
  !/\bwidth:\s*72px\s*;/i.test(previewRule.body) ||
  !/\bheight:\s*84px\s*;/i.test(previewRule.body)
) {
  failures.push('celestial-seals.css: home preview must preserve the exact 72 x 84 ratio')
}

const mainCss = await readFile(new URL('main.css', cssRoot), 'utf8')
const mainCssRules = parseCssRules(mainCss)
const elementSealRule = mainCssRules.find((rule) => rule.selectors.includes('.ap-el-seal'))
const elementPlateRule = mainCssRules.find((rule) => rule.selectors.includes('.ap-el-seal__plate'))
if (!elementSealRule || !/\baspect-ratio:\s*6\s*\/\s*7\s*;/i.test(elementSealRule.body)) {
  failures.push('main.css: .ap-el-seal must preserve the exact 6:7 master ratio')
}
if (!elementPlateRule || !elementPlateRule.body.includes(`clip-path: ${exactHex};`)) {
  failures.push('main.css: element seal plate must use the canonical 96 x 112 hex projection')
}

const cssEntries = await readdir(cssRoot, { withFileTypes: true })
for (const entry of cssEntries) {
  if (!entry.isFile() || !entry.name.endsWith('.css')) continue
  const source = await readFile(new URL(entry.name, cssRoot), 'utf8')
  for (const rule of parseCssRules(source)) {
    if (
      !rule.selectors.some((selector) =>
        selector.includes('.ap-seal') || selector.includes('.ap-el-seal'),
      )
    ) continue
    for (const match of rule.body.matchAll(/(?:^|;)\s*(height|max-height):\s*([^;]+);/gi)) {
      const property = match[1].toLowerCase()
      const value = match[2].trim().toLowerCase()
      if (!['auto', '100%', 'none'].includes(value)) {
        failures.push(
          `${entry.name}: ${rule.selectors.join(', ')} fixes ${property} to ${match[2].trim()}`,
        )
      }
    }
  }
}

for (const [group, names] of expected) {
  for (const name of names) expectedFiles.push(`${group}/${name}.svg`)
}

const actualFiles = []
for (const group of expected.keys()) {
  const entries = await readdir(new URL(`${group}/`, sealRoot), {
    withFileTypes: true,
  })
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.svg')) {
      actualFiles.push(`${group}/${entry.name}`)
    }
  }
}

const expectedSorted = expectedFiles.toSorted()
const actualSorted = actualFiles.toSorted()
if (JSON.stringify(actualSorted) !== JSON.stringify(expectedSorted)) {
  failures.push(
    `asset inventory mismatch\nexpected: ${expectedSorted.join(', ')}\nactual: ${actualSorted.join(', ')}`,
  )
}

for (const relativePath of expectedFiles) {
  const source = await readFile(new URL(relativePath, sealRoot), 'utf8')
  const colors = [...source.matchAll(/#[0-9a-f]{3,8}\b/gi)].map((match) => match[0].toLowerCase())
  const retiredFound = [...new Set(colors.filter((color) => retired.has(color)))]
  const outsidePalette = [...new Set(colors.filter((color) => !midnightMeridian.has(color)))]

  if (retiredFound.length) {
    failures.push(`${relativePath}: retired tokens ${retiredFound.join(', ')}`)
  }
  if (outsidePalette.length) {
    failures.push(`${relativePath}: tokens outside Midnight Meridian ${outsidePalette.join(', ')}`)
  }
  if (!/<svg\b[^>]*\brole=["']img["'][^>]*>/i.test(source)) {
    failures.push(`${relativePath}: missing role="img" on the root SVG`)
  }
  if (!/<svg\b[^>]*\baria-label=["'][^"']+["'][^>]*>/i.test(source)) {
    failures.push(`${relativePath}: missing a non-empty root aria-label`)
  }
  if (!/<title>[^<]+<\/title>/i.test(source)) {
    failures.push(`${relativePath}: missing a non-empty accessible title`)
  }
  if (!/<svg\b[^>]*\bviewBox=["']0 0 96 112["'][^>]*>/i.test(source)) {
    failures.push(`${relativePath}: canonical seal viewBox changed`)
  }
  if (/<(?:script|foreignObject)\b|\bon[a-z]+\s*=|\bhref\s*=/i.test(source)) {
    failures.push(`${relativePath}: executable or externally linked SVG content found`)
  }
  if (/<text\b/i.test(source)) {
    failures.push(`${relativePath}: live SVG text found; production seals must use vector outlines`)
  }
  const primitives = [...source.matchAll(/<(?:path|line|circle|ellipse|rect)\b[^>]*>/gi)]
  for (const primitive of primitives) {
    if (!/\bvector-effect=["']non-scaling-stroke["']/i.test(primitive[0])) {
      failures.push(`${relativePath}: scalable stroke primitive lacks explicit vector-effect`)
      break
    }
  }
}

if (failures.length) {
  console.error(`Seal palette contract failed under ${sealRootPath}:`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(
  `Seal production contract OK (${expectedFiles.length} SVGs; palette, outlined geometry, stroke scaling and accessibility metadata intact).`,
)
