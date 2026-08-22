import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const sealRoot = new URL('./website/assets/images/seals/', import.meta.url)
const sealRootPath = fileURLToPath(sealRoot)

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
  if (!/<svg\b[^>]*\bviewBox=["']0 0 96 112["'][^>]*>/i.test(source)) {
    failures.push(`${relativePath}: canonical seal viewBox changed`)
  }
  if (/<(?:script|foreignObject)\b|\bon[a-z]+\s*=|\bhref\s*=/i.test(source)) {
    failures.push(`${relativePath}: executable or externally linked SVG content found`)
  }
}

if (failures.length) {
  console.error(`Seal palette contract failed under ${sealRootPath}:`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(
  `Seal palette contract OK (${expectedFiles.length} SVGs; approved colours and accessibility metadata intact).`,
)
