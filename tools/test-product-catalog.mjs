#!/usr/bin/env node
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PDFDocument } from 'pdf-lib'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import sharp from 'sharp'

const ROOT = new URL('../', import.meta.url)
const fileUrl = (path) => new URL(path, ROOT)
const read = (path) => readFileSync(fileUrl(path), 'utf8')

const expectedProducts = [
  {
    sku: 'natal-sky-print-pack',
    name: 'Natal Sky Print Pack',
    priceGbp: 18,
    image: 'website/img/shop/v901/natal-sky-print-pack.webp',
    sample: 'downloads/studio/natal-sky-print-pack-sample.pdf',
    samplePages: 1,
    sampleSize: [841.89, 1190.55],
    deliverables: [
      'A3 RGB home-print PDF',
      'A4 ink-light home-print PDF',
      '4960 x 7016 PNG',
      '2160 x 2160 square PNG',
      '2160 x 3840 story PNG',
      '1080 x 1920 phone wallpaper PNG',
      '1080 x 1080 Big Three PNG',
      'print guide',
      'personal-use licence',
      'SHA-256 file-integrity manifest',
    ],
  },
  {
    sku: 'personal-sky-keepsake',
    name: 'Personal Sky Keepsake',
    priceGbp: 29,
    image: 'website/img/shop/v901/personal-sky-keepsake.webp',
    sample: 'downloads/studio/personal-sky-keepsake-sample.pdf',
    samplePages: 20,
    sampleSize: [595.28, 841.89],
    sampleTitle: 'Personal Sky Keepsake — screen edition',
    outlineTitles: [
      'The Sky at Your First Breath',
      'A coordinate in time and place.',
      'The Big Three.',
      'Language, learning and perspective.',
      'Relating as a reflective theme.',
      'Four reflective lenses.',
      'Four reflective lenses.',
      'Public life & the long game.',
      'A Capricorn stellium across the 8th & 9th houses.',
      'House by house — where life happens.',
      'House by house — where life happens.',
      'The personal planets.',
      'Action, growth & structure.',
      'Outer & nodal symbols.',
      'Patterns in the geometry.',
      'Five close aspects.',
      'Five more aspects.',
      'Living with the map.',
      'Measured sky, not invented copy.',
      'Chart reference.',
    ],
    deliverables: [
      '20-page screen PDF',
      '20-page ink-light A4 PDF',
      'A3 RGB home-print natal plate PDF',
      'A4 natal plate PDF',
      'personal-use licence',
      'SHA-256 file-integrity manifest',
    ],
  },
  {
    sku: 'whole-sky-edition',
    name: 'Whole Sky Edition',
    priceGbp: 39,
    image: 'website/img/shop/v901/whole-sky-edition.webp',
    sample: 'downloads/studio/personal-sky-keepsake-sample.pdf',
    samplePages: 20,
    sampleSize: [595.28, 841.89],
    deliverables: [
      'everything in the Natal Sky Print Pack',
      'everything in the Personal Sky Keepsake',
      '4800 x 3600 SCHEMATIC Observatory birth-hour PNG',
      'organised ZIP and SHA-256 manifest',
      'one reasonable layout adjustment requested within 7 days',
    ],
  },
]

const catalogue = JSON.parse(read('website/data/products-v901.json'))
assert.equal(catalogue.schema, 'astroprecise-studio-catalogue-v901')
assert.equal(catalogue.state, 'draft-not-published', 'catalogue must remain explicitly unpublished')
assert.equal(catalogue.currency, 'GBP')
assert.equal(catalogue.platform.seller, 'Gumroad')
assert.equal(catalogue.platform.productType, 'commission')
assert.equal(catalogue.platform.depositPercent, 50)
assert.equal(catalogue.platform.merchantOfRecord, true)
assert.equal(catalogue.platform.checkoutVerified, false)
assert.deepEqual(
  [...catalogue.launchBlockers].sort(),
  [
    'end-to-end-test-order-receipt-refund-and-deletion',
    'owner-service-level-confirmation',
    'public-geographic-trader-address',
    'signed-in-gumroad-commission-eligibility-check',
  ].sort(),
  'all four launch blockers must remain machine-readable until cleared deliberately',
)

assert.equal(catalogue.sharedRules.format, 'digital-files-only')
assert.equal(catalogue.sharedRules.physicalItem, false)
assert.equal(catalogue.sharedRules.birthTime, 'known-exact-recorded-clock-time')
assert.equal(catalogue.sharedRules.unknownOrApproximateTimeAccepted, false)
assert.equal(catalogue.sharedRules.earlyStartOptional, true)
assert.equal(catalogue.sharedRules.productionWorkingDays, 5)
assert.match(
  catalogue.sharedRules.productionClock,
  /early-start consent|14-day cancellation period/i,
)
assert.match(catalogue.sharedRules.correctionPolicy, /errors corrected without charge/i)
assert.match(catalogue.sharedRules.retentionDraft, /deleted 30 days after final correction/i)
assert.match(catalogue.sharedRules.retentionDraft, /order evidence retained separately/i)

assert.equal(
  catalogue.products.length,
  3,
  'the launch catalogue must contain exactly three products',
)
assert.deepEqual(
  catalogue.products.map(({ sku, name, priceGbp }) => ({ sku, name, priceGbp })),
  expectedProducts.map(({ sku, name, priceGbp }) => ({ sku, name, priceGbp })),
)
assert.equal(
  new Set(catalogue.products.map((product) => product.sku)).size,
  3,
  'SKUs must be unique',
)

for (const expected of expectedProducts) {
  const product = catalogue.products.find(({ sku }) => sku === expected.sku)
  assert.ok(product, `missing ${expected.sku}`)
  assert.equal(product.status, 'draft', `${expected.sku} must not claim to be live`)
  assert.equal(product.checkoutUrl, null, `${expected.sku} checkout must remain closed`)
  assert.ok(
    product.summary && product.summary.length >= 70,
    `${expected.sku} needs a useful summary`,
  )
  assert.deepEqual(
    product.deliverables,
    expected.deliverables,
    `${expected.sku} deliverables drifted`,
  )
  assert.equal(product.sample, expected.sample, `${expected.sku} sample route drifted`)
  assert.equal(
    product.sample.startsWith('downloads/studio/'),
    true,
    `${expected.sku} sample must stay in the public studio-sample folder`,
  )
  assert.equal(
    product.sample.includes('..') || /[?#]/.test(product.sample),
    false,
    `${expected.sku} sample path must be local and canonical`,
  )
  assert.equal(extname(product.sample), '.pdf')
}
assert.equal(catalogue.products[2].savingGbpAgainstSeparateProducts, 8)
assert.equal(
  catalogue.products[0].priceGbp + catalogue.products[1].priceGbp - catalogue.products[2].priceGbp,
  8,
  'Whole Sky saving must be arithmetic, not promotional invention',
)
const natalProduct = catalogue.products.find(({ sku }) => sku === 'natal-sky-print-pack')
const illustratorKit = read('tools/adobe/make-shop-studio-kit-v901.jsx')
assert.match(
  natalProduct.summary,
  /two(?: [a-z-]+){0,2} PDFs? (?:\+|and) five(?: [a-z-]+){0,2} PNG layouts/i,
  'Natal catalogue summary must use the exact audited deliverable wording: two PDFs + five PNG layouts',
)
assert.equal(natalProduct.deliverables.filter((item) => /PDF$/i.test(item)).length, 2)
assert.equal(natalProduct.deliverables.filter((item) => /PNG$/i.test(item)).length, 5)
assert.equal(
  /six (?:useful )?digital formats/i.test(`${JSON.stringify(catalogue)}\n${illustratorKit}`),
  false,
  'Natal copy must not miscount two PDFs plus five PNGs as six formats',
)
assert.match(
  illustratorKit,
  /A3 \+ A4 plates[\s\S]{0,100}Five PNG layouts/i,
  'Illustrator Natal master must present two PDF plates and five PNG layouts',
)

const hype =
  /\b(?:best[ -]?seller|most popular|selling fast|limited time|today only|last chance|act now|only \d+ (?:left|remaining)|\d+[,+]? happy (?:customers|clients)|five[- ]star|5[- ]star|rated \d)\b/i
assert.equal(
  hype.test(JSON.stringify(catalogue)),
  false,
  'catalogue must not invent urgency or social proof',
)
assert.equal(
  /https?:\/\//i.test(JSON.stringify(catalogue.products)),
  false,
  'draft products must not smuggle in an external checkout URL',
)

const humanCatalogue = read('CATALOGUE.md')
const gumroadListings = read('marketing/shop-studio-v901/gumroad-listings.md')
for (const { name, priceGbp } of expectedProducts) {
  assert.ok(
    humanCatalogue.includes(name) && humanCatalogue.includes(`£${priceGbp}`),
    `CATALOGUE.md drifted from ${name} at £${priceGbp}`,
  )
  assert.ok(
    gumroadListings.includes(name) && gumroadListings.includes(`£${priceGbp}`),
    `Gumroad draft copy drifted from ${name} at £${priceGbp}`,
  )
}
assert.match(
  humanCatalogue,
  /exactly three|only three[^.\n]{0,40}launch|three-product launch|three launch|3 launch/i,
  'human catalogue must declare the narrow three-product launch',
)
assert.match(
  humanCatalogue,
  /draft|not (?:live|published)|checkout (?:closed|not open)/i,
  'human catalogue must disclose prelaunch state',
)
assert.equal(
  /\b23\s+(?:products|product ideas|launch products|editions)\b/i.test(humanCatalogue),
  false,
  'human catalogue must not retain the abandoned 23-product placeholder launch',
)
assert.match(gumroadListings, /Commission/i)
assert.match(gumroadListings, /50%\s+(?:deposit|upfront)/i)
assert.match(gumroadListings, /balance[^.\n]{0,100}(?:completion|complete)/i)
assert.match(gumroadListings, /digital files? only|digital-only|no physical item/i)
assert.match(
  gumroadListings,
  /exact recorded (?:birth )?(?:local )?clock time|birth time[^.\n]{0,50}(?:known|exact|recorded)/i,
)
assert.match(gumroadListings, /draft|not (?:live|published)|do not publish/i)
assert.equal(
  hype.test(`${humanCatalogue}\n${gumroadListings}`),
  false,
  'catalogue copy must not invent urgency or social proof',
)

const retiredWarmHex =
  /#(?:b86b4a|c87d5c|ff6428|ff5a1f|ff7a45|e4996f|d8b46a|e8c96a|c4920a|e6c24a|c2a05e|8c6a2f|d9bc5c|d4b87a|f0e8d8|e8e0d0|e6ddc8|ece6d8|c8b88f|f2dfa7|e05a3a)\b/i
const shopCss = read('website/css/ap-shop-v835.css')
const studioSource = read('tools/fulfil-shared.mjs')
assert.equal(retiredWarmHex.test(shopCss), false, 'shop CSS contains a retired orange/brass colour')
assert.equal(
  retiredWarmHex.test(studioSource),
  false,
  'Studio renderer contains a retired orange/brass colour',
)
for (const colour of [
  '#040812',
  '#0A1424',
  '#EEF4FA',
  '#93A8BF',
  '#8BA9FF',
  '#A897FF',
  '#6FD0B3',
  '#FF8EA8',
  '#79C7F2',
]) {
  assert.ok(
    studioSource.includes(colour),
    `Studio renderer is missing 2026 palette colour ${colour}`,
  )
}
for (const colour of ['#040812', '#EEF4FA', '#93A8BF', '#8BA9FF']) {
  assert.ok(
    shopCss.includes(colour),
    `shop CSS is missing foundational 2026 palette colour ${colour}`,
  )
}

async function inspectArtwork(expected) {
  const url = fileUrl(expected.image)
  assert.ok(existsSync(url), `missing product artwork ${expected.image}`)
  const bytes = statSync(url).size
  assert.ok(
    bytes >= 20_000 && bytes <= 1_000_000,
    `${expected.image} must be a useful but web-sized asset (${bytes} bytes)`,
  )
  const image = sharp(fileURLToPath(url))
  const metadata = await image.metadata()
  assert.deepEqual(
    [metadata.format, metadata.width, metadata.height],
    ['webp', 1280, 720],
    `${expected.image} must be the 1280x720 WebP cover`,
  )

  const { data, info } = await image
    .resize({ width: 320, height: 180, fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  let chromatic = 0
  let orange = 0
  let cool = 0
  for (let index = 0; index < data.length; index += info.channels) {
    const r = data[index]
    const g = data[index + 1]
    const b = data[index + 2]
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    if (max < 45 || (max - min) / Math.max(max, 1) < 0.16) continue
    chromatic += 1
    if (r > g * 1.14 && g > b * 1.08 && r > 105) orange += 1
    if (b >= r * 0.92 || (g > r * 1.04 && b > r * 0.78)) cool += 1
  }
  assert.ok(chromatic > 500, `${expected.image} must contain designed chromatic detail`)
  assert.ok(
    orange / chromatic < 0.12,
    `${expected.image} has an orange-dominant chromatic palette (${((100 * orange) / chromatic).toFixed(1)}%)`,
  )
  assert.ok(
    cool > orange * 2,
    `${expected.image} must read substantially cooler than its incidental warm pixels`,
  )
}

async function pdfText(pdfPath) {
  const loadingTask = getDocument({
    data: new Uint8Array(readFileSync(pdfPath)),
    disableWorker: true,
    useSystemFonts: true,
  })
  const pdf = await loadingTask.promise
  const outline = (await pdf.getOutline()) || []
  const outlineTitles = outline.map((item) => item.title)
  const pages = []
  const viewports = []
  for (let number = 1; number <= pdf.numPages; number += 1) {
    const page = await pdf.getPage(number)
    const viewport = page.getViewport({ scale: 1 })
    viewports.push([viewport.width, viewport.height])
    const content = await page.getTextContent()
    pages.push(
      content.items
        .map((item) => item.str)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim(),
    )
  }
  await loadingTask.destroy()
  return { outlineTitles, pages, viewports }
}

const uniqueSamples = new Map()
for (const expected of expectedProducts) {
  await inspectArtwork(expected)
  if (!uniqueSamples.has(expected.sample)) uniqueSamples.set(expected.sample, expected)
}

const publicReadingHtml = read('website/sample-reading.html')
assert.match(
  publicReadingHtml,
  /data-ap-product=["']personal-sky-keepsake["']/i,
  'public reading HTML must be generated as Personal Sky Keepsake, not Whole Sky',
)
assert.match(publicReadingHtml, /Personal Sky Keepsake/i)
assert.equal(/Whole Sky Edition/i.test(publicReadingHtml), false)
assert.equal(
  /Observatory(?: birth-hour)? still/i.test(publicReadingHtml),
  false,
  'public Personal reading HTML must not promise the Whole Sky Observatory deliverable',
)

const publicSampleDir = fileUrl('website/downloads/studio/')
assert.ok(existsSync(publicSampleDir), 'public Studio sample folder is missing')
assert.deepEqual(
  readdirSync(publicSampleDir).sort(),
  ['natal-sky-print-pack-sample.pdf', 'personal-sky-keepsake-sample.pdf'],
  'public Studio downloads must contain only the two deliberate sample PDFs',
)

for (const [relativePath, expected] of uniqueSamples) {
  const url = fileUrl(`website/${relativePath}`)
  assert.ok(existsSync(url), `missing public sample website/${relativePath}`)
  const bytes = readFileSync(url)
  assert.ok(
    bytes.length >= 50_000 && bytes.length <= 15_000_000,
    `${relativePath} has an implausible PDF byte size`,
  )
  const document = await PDFDocument.load(bytes, { updateMetadata: false })
  assert.equal(document.getPageCount(), expected.samplePages, `${relativePath} page count drifted`)
  assert.match(
    document.getTitle() || '',
    /AstroPrecise|Natal Sky|Personal Sky/i,
    `${relativePath} needs a meaningful title`,
  )
  assert.equal(
    document.getAuthor(),
    'Jonathan Davenport trading as AstroPrecise',
    `${relativePath} author metadata drifted`,
  )
  assert.equal(
    document.getCreator(),
    'AstroPrecise Studio v901',
    `${relativePath} creator metadata drifted`,
  )
  const { outlineTitles, pages, viewports } = await pdfText(url)
  assert.equal(pages.length, expected.samplePages)
  for (const [index, [width, height]] of viewports.entries()) {
    assert.ok(
      Math.abs(width - expected.sampleSize[0]) < 1 && Math.abs(height - expected.sampleSize[1]) < 1,
      `${relativePath} page ${index + 1} has wrong physical size ${width.toFixed(1)}x${height.toFixed(1)}pt`,
    )
    assert.ok(pages[index].length >= 35, `${relativePath} page ${index + 1} is empty or image-only`)
    assert.match(
      pages[index].replace(/\s+/g, ''),
      /FICTIONALSAMPLE/i,
      `${relativePath} page ${index + 1} must carry the fictional-sample mark`,
    )
  }
  const joined = pages.join('\n')
  const compactJoined = joined.replace(/\s+/g, '')
  assert.match(
    joined.replace(/\s+/g, ''),
    /FICTIONALSAMPLE/i,
    `${relativePath} must be visibly marked as fictional`,
  )
  assert.match(
    joined,
    /Aurora Vale/i,
    `${relativePath} must use the named fictional sample, never a customer file`,
  )
  assert.equal(
    /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(joined),
    false,
    `${relativePath} exposes an email address`,
  )
  assert.equal(
    /GUMROAD-|transaction id|buyer email/i.test(joined),
    false,
    `${relativePath} exposes private order evidence`,
  )
  if (expected.sku === 'personal-sky-keepsake') {
    assert.equal(
      document.getTitle(),
      expected.sampleTitle,
      'Personal sample metadata must name its own product',
    )
    assert.match(
      compactJoined,
      /PersonalSkyKeepsake/i,
      'Personal sample content must identify Personal Sky Keepsake',
    )
    assert.equal(
      /WholeSkyEdition/i.test(compactJoined),
      false,
      'Personal sample must not carry Whole Sky Edition branding',
    )
    assert.equal(
      /Observatory(?:Birth[-–—]?Hour)?Still/i.test(compactJoined),
      false,
      'Personal sample must not promise or label the Whole Sky Observatory deliverable',
    )
    const normalizedOutlineTitles = outlineTitles.map((title) =>
      title
        .replace(/\u00a0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    let expectedOutlineIndex = 0
    for (const title of normalizedOutlineTitles) {
      if (title === expected.outlineTitles[expectedOutlineIndex]) expectedOutlineIndex += 1
    }
    assert.equal(
      expectedOutlineIndex,
      expected.outlineTitles.length,
      'Personal sample PDF outline must retain every expected heading in reading order',
    )
    const outlineText = normalizedOutlineTitles.join('\n')
    assert.equal(
      /[a-z][A-Z]|(?:,|—)[A-Za-z]/.test(outlineText) ||
        /\b(?:timeand|learningand|areflective|territoriesyour|lifethe|acrossthe|sky,not)\b/i.test(
          outlineText,
        ),
      false,
      'Personal sample PDF outline titles must not join words or punctuation at visual line breaks',
    )
  }
}

console.log(
  'PASS Studio catalogue: 3 draft commissions, exact value, closed checkout, cool covers and verified fictional PDFs',
)
