import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { GIFT_CONSENT_RECORDS } from './tools/fulfil-shared.mjs'

await import('./tools/test-product-catalog.mjs')

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')
const shop = read('./website/shop.html')
const shopCss = read('./website/css/ap-shop-v835.css')
const giftIntent = read('./website/js/ap-shop-gift-intent.js')
const serviceWorker = read('./website/sw.js')
const catalogue = JSON.parse(read('./website/data/products-v901.json'))
const privacy = read('./website/privacy.html')
const terms = read('./website/terms.html')
const refunds = read('./website/refunds.html')
const productTerms = read('./website/digital-product-terms.html')
const legalDraft = read('./marketing/shop-studio-v901/legal-draft.md')
const gumroadListings = read('./marketing/shop-studio-v901/gumroad-listings.md')
const giftConfirmationEmail = read('./marketing/shop-studio-v901/gift-confirmation-email.txt')
const normalizeWhitespace = (value) => value.replace(/\s+/g, ' ').trim()
const normalizedPrivacy = privacy.replace(/\s+/g, ' ')
const normalizedTerms = terms.replace(/\s+/g, ' ')
const normalizedRefunds = refunds.replace(/\s+/g, ' ')
const visibleShop = shop
  .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&pound;/gi, '£')
  .replace(/\s+/g, ' ')

const expected = [
  [
    'natal-sky-print-pack',
    'Natal Sky Print Pack',
    18,
    'downloads/studio/natal-sky-print-pack-sample.pdf',
  ],
  [
    'personal-sky-keepsake',
    'Personal Sky Keepsake',
    29,
    'downloads/studio/personal-sky-keepsake-sample.pdf',
  ],
  [
    'whole-sky-edition',
    'Whole Sky Edition',
    39,
    'downloads/studio/whole-sky-edition-sample.pdf',
  ],
]

assert.equal(catalogue.state, 'draft-not-published')
assert.equal(catalogue.platform.checkoutVerified, false)
assert.equal(catalogue.platform.giftCheckoutVerified, false)
assert.equal(catalogue.platform.giftPrivacyNoticeVersion, null)
assert.equal(catalogue.platform.giftPrivacyNoticeHash, null)
assert.equal(catalogue.products.length, 3)
for (const product of catalogue.products) {
  assert.deepEqual(
    product.purchaseModes,
    ['self', 'gift'],
    `${product.sku} must expose self and gift as modes, not extra SKUs`,
  )
  assert.ok(product.gift && typeof product.gift === 'object', `${product.sku} needs gift copy`)
}

assert.match(shop, /id=["']shop-intent["']/i, 'shop needs the visible self/gift intent control')
assert.match(shop, /role=["']radiogroup["']/i, 'shop intent control must expose a radiogroup')
for (const mode of ['self', 'gift']) {
  assert.match(
    shop,
    new RegExp(`data-shop-intent=["']${mode}["'][^>]*role=["']radio["']|role=["']radio["'][^>]*data-shop-intent=["']${mode}["']`, 'i'),
    `shop needs an accessible ${mode} radio button`,
  )
}
assert.match(shop, /aria-live=["']polite["']/i, 'mode copy changes need a polite live region')
assert.match(shop, /js\/ap-shop-gift-intent\.js\?v=901/i)
assert.match(giftIntent, /ap-shop-intent-v1/, 'gift intent must use the non-personal session key')
assert.match(giftIntent, /sessionStorage/, 'gift intent may persist only in session storage')
assert.match(
  serviceWorker,
  /isCritical[\s\S]*ap-shop-gift-intent/,
  'the release-specific gift intent controller must be network-first like other critical route code',
)
assert.equal(
  /\b(?:fetch|XMLHttpRequest|sendBeacon|WebSocket)\b|localStorage|document\.cookie/i.test(giftIntent),
  false,
  'gift intent controller must not transmit or persist visitor data',
)

const skuAttributes = [...shop.matchAll(/\bdata-product-sku=["']([^"']+)["']/gi)].map(
  (match) => match[1],
)
assert.deepEqual(
  skuAttributes.sort(),
  expected.map(([sku]) => sku).sort(),
  'shop must expose exactly one card for each of the three catalogue SKUs',
)

const productCards = new Map()
for (const [sku] of expected) {
  const escapedSku = sku.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const card = shop.match(
    new RegExp(
      `<article\\b(?=[^>]*\\bdata-product-sku=["']${escapedSku}["'])[^>]*>[\\s\\S]*?<\\/article>`,
      'i',
    ),
  )
  assert.ok(card, `shop is missing the complete ${sku} product card`)
  productCards.set(sku, card[0])
}

const natalCardText = productCards
  .get('natal-sky-print-pack')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
assert.match(
  natalCardText,
  /two(?: [a-z-]+){0,2} PDFs? (?:\+|and) five(?: [a-z-]+){0,2} PNG layouts/i,
  'Natal card must use the exact audited deliverable wording: two PDFs + five PNG layouts',
)
assert.equal(/six useful digital formats/i.test(natalCardText), false)

for (const [sku] of expected) {
  const card = productCards.get(sku)
  const disabledButtons = [...card.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)].filter(
    ([, attrs]) => /(?:^|\s)disabled(?:\s|=|$)/i.test(attrs),
  )
  assert.equal(disabledButtons.length, 1, `${sku} must have one actual disabled button control`)
  const [, attrs, body] = disabledButtons[0]
  assert.match(attrs, /\btype=["']button["']/i, `${sku} disabled control must be non-submitting`)
  assert.match(
    body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '),
    /checkout|commission/i,
    `${sku} disabled button must explain its commerce purpose`,
  )
}

assert.equal(
  [...shop.matchAll(/\bid=["']support["']/gi)].length,
  1,
  'shop must expose exactly one #support fragment target',
)
assert.match(
  shop,
  /href=["']https:\/\/ko-fi\.com\/astroprecise["']/i,
  '#support must lead to the real Ko-fi route',
)
assert.match(
  visibleShop,
  /draft service prices[\s\S]{0,180}tax-inclusive totals/i,
  'unverified prices must be labelled as draft and tax testing must remain visible',
)

for (const [sku, name, price, sample] of expected) {
  const product = catalogue.products.find((candidate) => candidate.sku === sku)
  assert.ok(product, `catalogue is missing ${sku}`)
  assert.equal(product.name, name)
  assert.equal(product.priceGbp, price)
  assert.equal(product.checkoutUrl, null)
  assert.equal(product.status, 'draft')
  assert.ok(shop.includes(name), `shop does not present ${name}`)
  assert.match(
    visibleShop,
    new RegExp(`£\\s*${price}\\b`),
    `shop does not present the exact £${price} price for ${name}`,
  )
  assert.ok(
    shop.includes(`img/shop/v901/${sku}.webp`),
    `shop does not use the approved ${sku} cover`,
  )
  assert.ok(shop.includes(sample), `shop does not link the approved sample for ${name}`)
}

assert.match(shop, /50%\s+(?:deposit|upfront)/i, 'shop must disclose the 50% Commission deposit')
assert.match(
  shop,
  /balance[^.]{0,100}(?:completion|complete)/i,
  'shop must explain when the Commission balance is due',
)
assert.match(
  shop,
  /digital files? only|digital-only|no physical item is (?:shipped|supplied|included)/i,
  'shop must state that no physical item is supplied',
)
assert.match(
  shop,
  /exact recorded birth time/i,
  'shop must require a known exact recorded birth time',
)
assert.match(shop, /birth date|recorded date|Date, exact local clock time/i)
assert.match(shop, /(?:birth )?city/i)
assert.match(shop, /country/i)
assert.match(
  shop,
  /unknown|approximate/i,
  'shop must say that unknown or approximate times are not accepted at launch',
)
assert.match(
  shop,
  /reflection and entertainment|reflective entertainment/i,
  'shop must frame astrology as reflection/entertainment',
)
assert.match(
  shop,
  /not[^.]{0,60}(?:medical|legal|financial)[^.]{0,60}advice|not advice/i,
  'shop must not position readings as professional advice',
)
assert.match(
  shop,
  /A3[^.]{0,100}RGB[^.]{0,100}home[- ]print/i,
  'A3 output must be described honestly as RGB home-print',
)
assert.match(shop, /SCHEMATIC/i, 'the Observatory still must retain its surface label')
assert.equal(
  /press[- ]ready|commercial print(?:er|ing)? ready/i.test(shop),
  false,
  'RGB home-print files must not be sold as commercial press-ready',
)

assert.match(
  shop,
  /(?:checkout|commissions?)[^.]{0,90}(?:closed|not open|not live|verification pending|open after verification)/i,
  'the page must tell visitors that checkout is still closed',
)
assert.match(
  shop,
  /(?:preview|prelaunch|not for sale yet|not yet for sale)/i,
  'prices and samples must be labelled as a prelaunch preview',
)
assert.equal(
  /\b(?:published|live now|available now|order now|buy now|purchase now|commission now)\b/i.test(
    shop,
  ),
  false,
  'the local candidate must not claim the products are published or live',
)
assert.equal(
  /"offers"\s*:|"@type"\s*:\s*"Offer"|schema\.org\/InStock/i.test(shop),
  false,
  'draft products must not emit live-offer structured data',
)

const externalProductRoute =
  /(?:gumroad\.com\/(?:l\/|checkout|products?)|app\.gumroad\.com|checkout\.gumroad\.com|buy\.stripe\.com|paypal\.me|paypal\.com\/checkout)/i
assert.equal(
  externalProductRoute.test(shop),
  false,
  'shop must not expose an external product checkout before verification',
)
const commerceControl = /\b(?:buy|order|purchase|checkout|commission)\b/i
for (const match of shop.matchAll(/<(a|button)\b([^>]*)>([\s\S]*?)<\/\1>/gi)) {
  const [, tag, attrs, body] = match
  const text = body
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!commerceControl.test(text)) continue
  const disabled = /\bdisabled\b|aria-disabled=["']true["']/i.test(attrs)
  assert.ok(
    tag.toLowerCase() === 'button' && disabled,
    `commerce CTA must be a disabled button, not an active ${tag}: ${text}`,
  )
}

const falsePromotion =
  /\b(?:best[ -]?seller|most popular|selling fast|limited time|today only|last chance|act now|only \d+ (?:left|remaining)|\d+[,+]? happy (?:customers|clients)|five[- ]star|5[- ]star|rated \d|customers? (?:love|say))\b/i
assert.equal(
  falsePromotion.test(shop),
  false,
  'shop must not invent urgency, scarcity, reviews or social proof',
)
assert.match(
  visibleShop,
  /saves?\s+£\s*8\s+against (?:buying )?(?:the )?(?:two|both) (?:other )?(?:editions|products)(?: separately)?/i,
  'the honest £8 bundle difference must be stated as arithmetic against the other two products',
)

assert.equal(
  /<form\b|<input\b|<textarea\b|contenteditable/i.test(shop),
  false,
  'the public prelaunch page must not collect birth data or email',
)
assert.match(
  visibleShop,
  /adult recipient[^.]{0,120}(?:present|with you)|recipient[^.]{0,120}(?:enter|provide)[^.]{0,80}(?:own|themselves)/i,
  'gift preview must explain adult recipient self-entry',
)
assert.match(
  visibleShop,
  /surprise gifts?[^.]{0,80}(?:not accepted|not available|cannot|unsupported)|not (?:a )?surprise gift/i,
  'gift preview must reject surprise-gift orders at launch',
)
assert.match(
  visibleShop,
  /recipient pays (?:£?0|nothing)|no charge to the recipient/i,
  'gift preview must make the payer role clear',
)
for (const [, url] of shop.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi)) {
  assert.equal(
    /[?&#](?:date|time|city|lat|lon|birth|name)=/i.test(url),
    false,
    `birth details must not appear in shop URL ${url}`,
  )
}
assert.equal(
  shop.includes('digital-product-terms.html'),
  true,
  'the checkout-closed shop must expose the clearly labelled noindex terms draft for review',
)
assert.match(
  productTerms,
  /<meta[^>]+name=["']robots["'][^>]+noindex/i,
  'draft product terms must be noindex',
)
assert.match(
  productTerms,
  /not (?:the )?current offer|not currently in force|launch draft/i,
  'draft product terms must say they are not the current offer',
)
assert.match(
  productTerms,
  /geographic|service address|trader address/i,
  'draft terms must preserve the public-address launch blocker',
)
for (const [label, source] of [
  ['product terms', productTerms],
  ['legal implementation draft', legalDraft],
]) {
  assert.match(
    source,
    /14[- ]day|14 days/i,
    `${label} must explain the distance-contract cancellation period`,
  )
  assert.match(
    source,
    /early[- ]start|start (?:the )?(?:service|work) (?:during|before)/i,
    `${label} must explain the optional early-start path`,
  )
  assert.match(
    source,
    /unticked|not pre[- ]ticked|optional checkbox|express request/i,
    `${label} must require an optional, active early-start choice`,
  )
  assert.match(
    source,
    /proportionate|work (?:already )?(?:performed|completed)/i,
    `${label} must explain the consequence of cancelling after work starts`,
  )
  assert.match(
    source,
    /fully perform|full performance|once (?:the )?(?:service|commission) is complete|right to cancel ends/i,
    `${label} must explain when the cancellation right ends`,
  )
  assert.match(
    source,
    /adult recipient/i,
    `${label} must keep gift orders adult-only`,
  )
  assert.match(
    source,
    /recipient[^.\n]{0,120}(?:enter|entered|complete)[^.\n]{0,100}(?:own|personally|themselves)/i,
    `${label} must require recipient self-entry`,
  )
  assert.match(
    source,
    /separate[^.\n]{0,100}(?:unticked|authori[sz]ation|permission)|recipient[^.\n]{0,120}(?:unticked|authori[sz]e)[^.\n]{0,80}(?:buyer|purchaser)/i,
    `${label} must separate permission to disclose files to the buyer`,
  )
}

assert.ok(catalogue.launchBlockers.includes('public-geographic-trader-address'))
assert.ok(catalogue.launchBlockers.includes('signed-in-gumroad-commission-eligibility-check'))
assert.ok(catalogue.launchBlockers.includes('end-to-end-test-order-receipt-refund-and-deletion'))
assert.match(catalogue.sharedRules.retentionDraft, /deleted 30 days/i)
assert.match(catalogue.sharedRules.retentionDraft, /order evidence retained separately/i)
assert.match(
  normalizedPrivacy,
  /No current shop checkout uses this bridge/i,
  'privacy page must not describe the legacy handoff as a current checkout',
)
assert.match(
  normalizedPrivacy,
  /legacy external Gumroad listing may still be reachable/i,
  'privacy page must disclose the legacy external listing until it is actually archived',
)
assert.match(normalizedTerms, /legacy external Gumroad listing may still be reachable/i)
assert.match(normalizedRefunds, /legacy external Gumroad listing may still be reachable/i)
assert.match(normalizedPrivacy, /withdraw[\s\S]{0,160}at any time[\s\S]{0,220}(?:later|further)[\s\S]{0,100}(?:copies|replacements)/i)
assert.match(productTerms, /acknowledge receipt within 30 days/i)
assert.match(productTerms, /same means of payment[^.]{0,120}no reimbursement fee/i)
assert.match(shop, /href=["']digital-product-terms\.html["'][^>]*>[^<]*Studio terms draft/i)

const normalizedListingDraft = normalizeWhitespace(gumroadListings)
for (const [recordName, canonicalText] of Object.entries(GIFT_CONSENT_RECORDS)) {
  if (!recordName.endsWith('Text')) continue
  assert.ok(
    normalizedListingDraft.includes(normalizeWhitespace(canonicalText)),
    `Gumroad listing draft must reproduce canonical ${recordName} exactly`,
  )
}
const normalizedGiftConfirmation = normalizeWhitespace(giftConfirmationEmail)
const buyerCopyWording = normalizeWhitespace(GIFT_CONSENT_RECORDS.recipientDisclosureWordingText)
assert.equal(
  normalizedGiftConfirmation.split(buyerCopyWording).length - 1,
  2,
  'both buyer and recipient durable confirmations must reproduce the exact buyer-copy authorisation wording',
)

const studioDownloads = new URL('./website/downloads/studio/', import.meta.url)
assert.ok(existsSync(studioDownloads))
for (const file of readdirSync(studioDownloads)) {
  assert.match(
    file,
    /^(?:natal-sky-print-pack|personal-sky-keepsake|whole-sky-edition)-sample\.pdf$/,
    `private fulfilment artifact leaked into public downloads: ${file}`,
  )
}
for (const privateToken of [
  'order.json',
  'payment.json',
  'fulfilment-control.json',
  'fulfilment-manifest.json',
  'customer-manifest.json',
  '.zip',
]) {
  assert.equal(
    shop.toLowerCase().includes(privateToken),
    false,
    `shop exposes private fulfilment artifact ${privateToken}`,
  )
}

const retiredWarmHex =
  /#(?:b86b4a|c87d5c|ff6428|ff5a1f|ff7a45|e4996f|d8b46a|e8c96a|c4920a|e6c24a|c2a05e|8c6a2f|d9bc5c|d4b87a|f0e8d8|e8e0d0|e6ddc8|ece6d8|c8b88f|f2dfa7|e05a3a)\b/i
assert.equal(
  retiredWarmHex.test(shopCss),
  false,
  'shop must not regress to the retired orange/brass scheme',
)
assert.ok(
  shopCss.includes('#040812') && shopCss.includes('#EEF4FA') && shopCss.includes('#8BA9FF'),
  'shop must keep the Midnight Meridian foundation',
)

console.log(
  'PASS shop prelaunch: exact 3 products, safe self/gift modes, closed checkout and privacy gates',
)
