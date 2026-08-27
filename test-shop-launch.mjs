import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

await import('./tools/test-product-catalog.mjs')

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')
const shop = read('./website/shop.html')
const shopCss = read('./website/css/ap-shop-v835.css')
const serviceWorker = read('./website/sw.js')
const catalogueText = read('./website/data/products-v901.json')
const catalogue = JSON.parse(catalogueText)
const privacy = read('./website/privacy.html')
const terms = read('./website/terms.html')
const refunds = read('./website/refunds.html')
const productTerms = read('./website/digital-product-terms.html')
const legalDraft = read('./marketing/shop-studio-v901/legal-draft.md')
const gumroadListings = read('./marketing/shop-studio-v901/gumroad-listings.md')
const appSource = read('./website/js/app.js')
const studioContextScript = read('./website/js/ap-studio-context-link.js')
const chartPage = read('./website/chart.html')
const deepReadingPage = read('./website/deep-reading.html')
const buildSource = read('./tools/build.mjs')
const publicHtml = readdirSync(new URL('./website/', import.meta.url))
  .filter((file) => file.endsWith('.html'))
  .map((file) => read(`./website/${file}`))
  .join('\n')
const visibleShop = shop
  .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&pound;/gi, '£')
  .replace(/&amp;/gi, '&')
  .replace(/\s+/g, ' ')

const expected = [
  ['natal-sky-print-pack', 'Natal Sky Print Pack', 18, 'downloads/studio/natal-sky-print-pack-sample.pdf'],
  ['personal-sky-keepsake', 'Personal Sky Keepsake', 29, 'downloads/studio/personal-sky-keepsake-sample.pdf'],
  ['whole-sky-edition', 'Whole Sky Edition', 39, 'downloads/studio/whole-sky-edition-sample.pdf'],
]

assert.equal(catalogue.state, 'draft-not-published')
assert.equal(catalogue.launchMode, 'self-only')
assert.equal(catalogue.platform.checkoutVerified, false)
assert.equal(catalogue.products.length, 3)
assert.deepEqual(catalogue.sharedRules.purchaseModes, ['self'])
for (const product of catalogue.products) {
  assert.deepEqual(product.purchaseModes, ['self'], `${product.sku} must be self-order only`)
  assert.equal(product.checkoutUrl, null)
  assert.equal(product.status, 'draft')
}

const publicCommerceSurface = [shop, shopCss, serviceWorker, catalogueText].join('\n')
assert.doesNotMatch(
  publicCommerceSurface,
  /gift|birthday|recipient|data-gift|ap-shop-gift/i,
  'the deployed self-order release must not retain deferred third-party purchase copy or controls',
)
assert.equal(existsSync(new URL('./website/js/ap-shop-gift-intent.js', import.meta.url)), false)
assert.equal(existsSync(new URL('./website/js/shop-commerce.js', import.meta.url)), false)
assert.doesNotMatch(publicHtml, /shop-page-boot\.js|shop-commerce\.js/i)
assert.doesNotMatch(
  appSource,
  /\bgiftUrl\s*:|\bcommerce\s*:|detailsForm|Typeform|product-gift|Two Skies|recipient|birthday/i,
  'the core app config must not expose the retired third-party/gift catalogue',
)
for (const file of [
  'birthday-orbit-detail.webp',
  'gift-personal-sky-keepsake.webp',
  'gift-whole-sky-edition.webp',
]) {
  assert.equal(
    existsSync(new URL(`./website/img/shop/v901/${file}`, import.meta.url)),
    false,
    `${file} must remain outside the deployable website tree`,
  )
}
for (const path of [
  'outreach.html',
  'js/outreach-content.js',
  'css/outreach-page.css',
  'js/shop-page-boot.js',
  'js/ap-post-purchase.js',
  'js/shop-art-themes.js',
  'data/art-themes.json',
  'img/shop/product-gift-box.jpg',
  'img/shop/product-gift-reading.webp',
  'img/shop/product-two-skies.jpg',
  '_worker.js',
  '_routes.json',
  '_redirects',
  'functions',
  'wrangler.toml',
]) {
  assert.ok(buildSource.includes(`'${path}'`) || buildSource.includes(`'${path}/'`), `${path} must be denied from the deployable build`)
}
assert.match(buildSource, /lstatSync\(p\)/)
assert.match(buildSource, /stat\.isSymbolicLink\(\)/)
assert.match(buildSource, /TRACKED_WEBSITE_PATHS/)
execFileSync(process.execPath, ['tools/build.mjs', '--raw'], {
  cwd: fileURLToPath(new URL('.', import.meta.url)),
  stdio: 'pipe',
})
const deployedAppSource = read('./dist/js/app.js')
assert.doesNotMatch(
  deployedAppSource,
  /\bgiftUrl\s*:|\bcommerce\s*:|detailsForm|Typeform|product-gift|Two Skies|recipient|birthday/i,
  'the raw deployable core runtime must not expose retired commerce or deferred gift content',
)
for (const path of [
  'outreach.html',
  'js/outreach-content.js',
  'css/outreach-page.css',
  'js/shop-page-boot.js',
  'js/ap-post-purchase.js',
  'js/shop-art-themes.js',
  'data/art-themes.json',
  'img/shop/product-gift-box.jpg',
  'img/shop/product-gift-reading.webp',
  'img/shop/product-two-skies.jpg',
  '_worker.js',
  '_routes.json',
  '_redirects',
  'functions',
  'wrangler.toml',
]) {
  assert.equal(
    existsSync(new URL(`./dist/${path}`, import.meta.url)),
    false,
    `${path} must be absent from the deployable output`,
  )
}
assert.deepEqual(
  readdirSync(new URL('./dist/img/shop/', import.meta.url)).sort(),
  ['numbered-sky-plate-v835.webp', 'v901'],
  'the deployable shop image root must contain only the referenced plate and v901 product folder',
)
assert.deepEqual(
  readdirSync(new URL('./dist/img/shop/v901/', import.meta.url)).sort(),
  ['natal-sky-print-pack.webp', 'personal-sky-keepsake.webp', 'whole-sky-edition.webp'],
  'the deployable v901 product-art folder must contain exactly the three reviewed self-order covers',
)
const fulfilRedirect = read('./website/fulfil-redirect.html')
assert.match(fulfilRedirect, /Legacy order handoff retired/i)
assert.doesNotMatch(
  fulfilRedirect,
  /KNOWN_FORMS|typeform\.com|location\.replace|gift-reading|gift-box-whole-sky|two-skies-map/i,
  'the retired public bridge must not accept or redirect any legacy/gift order',
)

assert.match(shop, /<title>Personalised Birth Chart Prints &amp; Astrology Readings \| AstroPrecise<\/title>/i)
assert.match(shop, /<h1>Personalised birth chart[\s\S]{0,80}prints and readings/i)
assert.match(shop, /adults aged 18\+ ordering for themselves only/i)
assert.match(shop, /computed and quality-checked/i)
assert.doesNotMatch(shop, /human[- ]edited|human finish|personally edited|exact chart geometry|exact export geometry/i)

const skuAttributes = [...shop.matchAll(/\bdata-product-sku=["']([^"']+)["']/gi)].map((match) => match[1])
assert.deepEqual(skuAttributes.sort(), expected.map(([sku]) => sku).sort())

for (const [sku, name, price, sample] of expected) {
  const product = catalogue.products.find((candidate) => candidate.sku === sku)
  assert.ok(product, `catalogue is missing ${sku}`)
  assert.equal(product.name, name)
  assert.equal(product.priceGbp, price)
  assert.ok(shop.includes(name))
  assert.match(visibleShop, new RegExp(`£\\s*${price}\\b`))
  assert.ok(shop.includes(`img/shop/v901/${sku}.webp`))
  assert.ok(shop.includes(sample))

  const escapedSku = sku.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const card = shop.match(new RegExp(`<article\\b(?=[^>]*\\bdata-product-sku=["']${escapedSku}["'])[^>]*>[\\s\\S]*?<\\/article>`, 'i'))
  assert.ok(card, `shop is missing the complete ${sku} card`)
  const disabled = [...card[0].matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)]
    .filter(([, attrs]) => /(?:^|\s)disabled(?:\s|=|$)/i.test(attrs))
  assert.equal(disabled.length, 1, `${sku} must have one disabled checkout control`)
  assert.match(disabled[0][1], /\btype=["']button["']/i)
  assert.match(disabled[0][2], /checkout|commission/i)
}

assert.match(visibleShop, /draft service prices[\s\S]{0,180}tax-inclusive totals/i)
assert.match(shop, /50%\s+(?:deposit|upfront)/i)
assert.match(shop, /balance[^.]{0,100}(?:completion|complete)/i)
assert.match(shop, /digital only|digital-only|no physical item is (?:shipped|supplied|included)/i)
assert.match(shop, /exact recorded birth time/i)
assert.match(shop, /unknown|approximate/i)
assert.match(shop, /reflection and entertainment|reflective entertainment/i)
assert.match(shop, /not[^.]{0,70}(?:medical|legal|financial)[^.]{0,70}advice|not advice/i)
assert.match(shop, /A3[^.]{0,100}RGB[^.]{0,100}home[- ]print/i)
assert.match(shop, /SCHEMATIC/i)
assert.doesNotMatch(shop, /press[- ]ready|commercial print(?:er|ing)? ready/i)
assert.match(shop, /(?:checkout|commissions?)[^.]{0,100}(?:closed|not open|verification pending)/i)
assert.match(shop, /preview|pre-launch|prelaunch/i)
assert.doesNotMatch(shop, /\b(?:published|live now|available now|order now|buy now|purchase now|commission now)\b/i)
assert.doesNotMatch(shop, /"offers"\s*:|"@type"\s*:\s*"Offer"|schema\.org\/InStock/i)
assert.doesNotMatch(shop, /(?:gumroad\.com\/(?:l\/|checkout|products?)|checkout\.gumroad\.com|buy\.stripe\.com|paypal\.com\/checkout)/i)
assert.doesNotMatch(shop, /<form\b|<input\b|<textarea\b|contenteditable/i)

for (const match of shop.matchAll(/<(a|button)\b([^>]*)>([\s\S]*?)<\/\1>/gi)) {
  const [, tag, attrs, body] = match
  const text = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  if (!/\b(?:buy|order|purchase|checkout|commission)\b/i.test(text)) continue
  assert.ok(tag.toLowerCase() === 'button' && /\bdisabled\b|aria-disabled=["']true["']/i.test(attrs), `active commerce control: ${text}`)
}

assert.doesNotMatch(
  [shop, gumroadListings].join('\n'),
  /\b(?:best[ -]?seller|most popular|selling fast|limited time|today only|last chance|act now|five[- ]star|5[- ]star)\b/i,
)
assert.match(visibleShop, /saves?\s+£\s*8\s+against (?:buying )?(?:the )?(?:two|both) (?:other )?(?:editions|products)(?: separately)?/i)
assert.match(productTerms, /<meta[^>]+name=["']robots["'][^>]+noindex/i)
assert.match(productTerms, /not (?:the )?current offer|not currently in force|launch draft|working review copy/i)
assert.match(productTerms, /geographic|service address|trader address/i)
for (const [label, source] of [['product terms', productTerms], ['legal implementation draft', legalDraft]]) {
  assert.match(source, /14[- ]day|14 days/i, `${label} needs the cancellation period`)
  assert.match(source, /early[- ]start|start (?:the )?(?:service|work) (?:during|before)/i, `${label} needs optional early start`)
  assert.match(source, /unticked|not pre[- ]ticked|optional checkbox|express request/i, `${label} needs an active early-start choice`)
  assert.match(source, /proportionate|work (?:already )?(?:performed|completed)/i, `${label} needs cancellation consequences`)
}

assert.ok(catalogue.launchBlockers.includes('legal-operator-and-public-geographic-address'))
assert.ok(catalogue.launchBlockers.includes('signed-in-gumroad-commission-eligibility-check'))
assert.ok(catalogue.launchBlockers.includes('end-to-end-test-order-receipt-refund-and-deletion'))
assert.match(catalogue.sharedRules.retentionDraft, /deleted 30 days/i)
assert.match(privacy.replace(/\s+/g, ' '), /No current shop checkout uses this bridge/i)
for (const [label, source] of [['privacy', privacy], ['terms', terms], ['refunds', refunds]]) {
  assert.match(
    source.replace(/\s+/g, ' '),
    /legacy external Gumroad listing may still be reachable/i,
    `${label} must disclose the externally reachable legacy listing`,
  )
}
assert.match(productTerms, /acknowledge receipt within 30 days/i)
assert.match(productTerms, /same means of payment[^.]{0,120}no reimbursement fee/i)
assert.match(shop, /href=["']digital-product-terms\.html["'][^>]*>[^<]*Studio terms draft/i)

const studioDownloads = new URL('./website/downloads/studio/', import.meta.url)
assert.ok(existsSync(studioDownloads))
for (const file of readdirSync(studioDownloads)) {
  assert.match(file, /^(?:natal-sky-print-pack|personal-sky-keepsake|whole-sky-edition)-sample\.pdf$/)
}

const retiredWarmHex = /#(?:b86b4a|c87d5c|ff6428|ff5a1f|ff7a45|e4996f|d8b46a|e8c96a|c4920a|e6c24a|c2a05e|8c6a2f|d9bc5c|d4b87a|f0e8d8|e8e0d0|e6ddc8|ece6d8|c8b88f|f2dfa7|e05a3a)\b/i
assert.equal(retiredWarmHex.test(shopCss), false)
assert.ok(shopCss.includes('#040812') && shopCss.includes('#EEF4FA') && shopCss.includes('#8BA9FF'))

assert.match(studioContextScript, /catalogue\?\.state !== 'published'/)
assert.match(studioContextScript, /checkoutVerified !== true/)
assert.match(studioContextScript, /product\.status !== 'live'/)
assert.match(studioContextScript, /purchaseModes\[0\] !== 'self'/)
assert.match(studioContextScript, /gumroad\\\.com/)
assert.match(studioContextScript, /cache: 'no-store'/)
assert.doesNotMatch(studioContextScript, /localStorage|sessionStorage|URLSearchParams|location\.search/)
for (const [page, sku] of [
  [chartPage, 'natal-sky-print-pack'],
  [deepReadingPage, 'personal-sky-keepsake'],
]) {
  assert.match(page, new RegExp(`data-ap-studio-context[^>]+data-product-sku=["']${sku}["'][^>]+hidden`))
  assert.match(page, /js\/ap-studio-context-link\.js\?v=902/)
}

console.log('PASS shop prelaunch: exact 3 self-order products, honest search copy, closed checkout and privacy gates')
