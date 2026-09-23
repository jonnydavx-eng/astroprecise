import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')
const count = (text, pattern) => (text.match(pattern) || []).length
const serviceWorker = read('./website/sw.js')
const releaseTip = (serviceWorker.match(/const V = "ap-v(\d+)"/) || [])[1]
assert.ok(releaseTip, 'service worker must declare the release tip')
const appRuntime = read('./website/js/app.js')
const profileManager = read('./website/js/profile.js')
assert.ok(
  appRuntime.includes(`window.AP_ASSET_V || '${releaseTip}'`),
  'runtime-injected assets must fall back to the current release tip',
)
assert.ok(
  appRuntime.includes("s.src = 'js/ap-engine-visuals.js?v=' + AP_ASSET_V"),
  'runtime-injected engine stills must load their controller at the current release tip',
)
assert.ok(
  profileManager.includes("localStorage.removeItem('ap_user')"),
  'the retired local pseudo-account must purge its legacy browser record',
)
assert.equal(
  /passwordHash|btoa\(password\)|function\s+(?:login|register|saveUser|updateProfile)\b/.test(
    profileManager,
  ),
  false,
  'profile manager must never store or expose reversible local password material',
)
assert.equal(
  /\b(?:getUser|saveUser|isLoggedIn|login|register|logout|updateProfile|generateAppSyncData)\s*,/.test(
    profileManager,
  ),
  false,
  'retired pseudo-account and user-bearing sync methods must not be exported',
)
for (const page of ['./website/ephemeris.html', './website/horoscope.html']) {
  assert.ok(
    read(page).includes(`window.AP_ASSET_V='${releaseTip}'`),
    `${page} must seed the runtime asset tip before app.js injects styles and helpers`,
  )
}

const chartPage = read('./website/js/chart-page.js')
assert.ok(
  chartPage.includes('(seed = Math.imul(seed, 16807) >>> 0) / 4294967296'),
  'chart artwork PRNG must stay unsigned so every canvas radius is non-negative',
)
assert.equal(
  /Math\.imul\(seed,\s*16807\)[^\n]*%/.test(chartPage),
  false,
  'chart artwork must not restore the signed-remainder PRNG that broke PNG export',
)
assert.ok(
  chartPage.includes('privacySafeShareChart') && chartPage.includes('Personal details withheld'),
  'default chart sharing must render the privacy-safe surrogate',
)
assert.ok(chartPage.includes('Career point'))
assert.ok(chartPage.includes("fs.orb.toFixed(1) + '° from exact'"))
assert.ok(!chartPage.includes('}° orb ·'))
assert.ok(!chartPage.includes('Rising, Ascendant, Midheaven, houses'))
assert.ok(!chartPage.includes('within orb for this chart'))

const chartHtml = read('./website/chart.html')
const chartCss = read('./website/css/ap-chart-v835.css')
const interpretationsLoader = read('./website/js/ap-load-interpretations.js')
const readingFormat = read('./website/js/reading-format.js')
const chartRender = read('./website/js/chart-render.js')
assert.ok(chartPage.includes("name:'Semi-sextile'"))
assert.equal(chartPage.includes("name:'Slight angle'"), false)
assert.ok(chartCss.includes('.ap-reading-card > .ap-reading-card__content:only-child'))
assert.ok(chartCss.includes('scroll-margin-top:'))
assert.ok(chartHtml.includes(`ap-chart-next.css?v=${releaseTip}`))
assert.ok(
  chartHtml.includes(`ap-next.css?v=${releaseTip}`) &&
    chartHtml.includes(`ap-chart-next.js?v=${releaseTip}`),
)
assert.ok(
  chartHtml.includes(`ephemeris.js?v=${releaseTip}`) &&
    chartHtml.includes(`ap-mirror-hour.js?v=${releaseTip}`),
)
for (const asset of ['css/ap-next.css', 'css/ap-chart-next.css', 'js/ap-chart-next.js']) {
  assert.ok(chartHtml.includes(`${asset}?v=${releaseTip}`), `Chart must release-pin ${asset}`)
}
assert.ok(chartRender.includes('ap:wheel-select') && chartPage.includes('wireWheelReadingSelect'))
assert.ok(
  chartRender.includes("'#040812'") &&
    chartRender.includes("'#93A8BF'") &&
    chartRender.includes("'#8BA9FF'"),
)
assert.ok(
  chartPage.includes('chart-wheel-card--has-reading') && chartPage.includes('keepWheelInView'),
)
assert.ok(chartPage.includes('writeSittingHandoff') && chartPage.includes('function openSitting'))
assert.ok(chartHtml.includes('id="read-my-sky"') && chartHtml.includes('Read my sky story'))
assert.ok(chartHtml.includes('id="time-unknown"') && chartHtml.includes('id="time-approximate"'))
assert.ok(/Online search sends only the town text to Open-Meteo/i.test(chartHtml))
assert.ok(chartHtml.includes('does not claim observatory-grade precision'))
assert.equal(/gumroad\.com|openCheckout/i.test(chartHtml), false)
assert.ok(!/card\.scrollIntoView\(\{ behavior: 'smooth', block: 'nearest' \}\)/.test(chartPage))
assert.ok(
  readingFormat.includes('if (leadHtml) inner += leadHtml;') &&
    !readingFormat.includes('leadHtml && !collapsed'),
)
assert.ok(interpretationsLoader.includes('interpretations.js?v='))
assert.ok(chartPage.includes('degree withheld') && chartPage.includes('Date-reference angle'))
assert.ok(chartPage.includes('Secondary contacts · minor aspects and calculated points'))
assert.ok(chartPage.includes('resultNameEl.focus') && !chartPage.includes('firstTab = wrapEl'))
assert.ok(chartPage.includes("document.body.classList.add('ap-chart-has-results')"))
assert.ok(chartCss.includes('.page-chart.ap-chart-has-results .chart-method-ledger'))
assert.ok(!chartPage.includes('catch (e) { a = null; }'))
assert.ok(
  chartRender.includes('displayBodyName(p1name)') &&
    chartRender.includes('displayBodyName(p2name)'),
)
assert.equal(chartHtml.includes('Robust even when your birth time is approximate'), false)

for (const path of [
  './website/index-full.html',
  './website/deep-time.html',
  './website/terms.html',
]) {
  assert.equal(/arcminute/i.test(read(path)), false, `${path} must not make an arcminute claim`)
}
const home = read('./website/observatory.html')
assert.ok(
  home.includes("key === 'nosw' || key === 'lite'") &&
    home.includes("value === '1'") &&
    home.indexOf('var incomingQuery') < home.indexOf('<link rel="preload"'),
  'Observatory query allowlist must scrub legacy personal fields before assets load',
)
const guidedHome = read('./website/index.html')
assert.ok(
  guidedHome.includes("name === 'nosw' || name === 'lite'") &&
    guidedHome.includes('Reveal my birth sky') &&
    /fictional/i.test(guidedHome),
  'guided home must scrub legacy fields, start the birth-sky path, and label sample artwork',
)
assert.equal(/gumroad\.com\/l\/|checkout\.gumroad/i.test(guidedHome), false)
assert.ok(
  home.includes('moments.length === 1') &&
    home.includes('publicMarkers.length === 1') &&
    home.includes("publicMarkers[0].key === 'public'"),
  'Observatory fixed moments must require one canonical public marker',
)
assert.ok(
  home.includes('focuses.length === 1') &&
    home.includes('scales.length === 1') &&
    home.includes('raw !== cleanHash'),
  'Observatory must reconstruct accepted fragments and remove unrelated personal fields',
)
const orreryAdapter = read('./website/js/void-orrery-adapter.js')
assert.ok(home.includes('Preparing 3D'))
assert.ok(
  orreryAdapter.includes('No substitute model has been shown.') &&
    orreryAdapter.includes('Retry 3D'),
)
const deepTime = read('./website/deep-time.html')
assert.ok(
  deepTime.includes('duplicate Deep-Time model has been retired') &&
    deepTime.includes('Open the Observatory'),
)
assert.equal(/minute you were born/i.test(deepTime), false)

for (const path of ['./website/transits.html', './website/this-weeks-sky.html']) {
  assert.equal(count(read(path), /js\/ephemeris\.js/g), 1, `${path} must load the ephemeris once`)
}

const privacy = read('./website/privacy.html')
assert.equal(/refine on map|if you use the map|OpenStreetMap\/Carto/i.test(privacy), false)
assert.equal(/optional map tiles/i.test(read('./website/terms.html')), false)
assert.ok(privacy.includes('does not create or accept chart links containing birth details'))

const chartView = read('./website/chart-view.html')
const chartShare = read('./website/js/ap-chart-share.js')
const compatibilityHtml = read('./website/compatibility.html')
assert.equal(
  /location\.(?:search|hash)|new URLSearchParams/.test(chartView),
  false,
  'retired shared-chart route must not consume birth data from an address',
)
assert.equal(
  /location\.(?:search|hash)|chart-view\.html|birth details \(name/.test(chartShare),
  false,
  'chart share helper must emit a clean public URL only',
)
assert.equal(
  compatibilityHtml.includes('compatibility-page.js'),
  false,
  'retired compatibility-page.js must stay deleted',
)
assert.ok(
  compatibilityHtml.includes('ap-surface-a') && !compatibilityHtml.includes('<void-orrery'),
  'couples page must use a labelled still and leave live WebGL to the Observatory',
)
assert.equal(
  /Birth place <span class="opt">optional<\/span>/.test(compatibilityHtml),
  false,
  'couples birth place must not be labelled optional — a real IANA zone is required',
)
assert.ok(
  compatibilityHtml.includes('id="keep-sky"') &&
    !/id="keep-sky"[^>]*data-keep-mode/.test(compatibilityHtml),
  'couples Keep this sky must stay the current-view path, not chart birth-hour',
)
const couplesSky = read('./website/js/ap-couples-sky.js')
assert.equal(
  /gumroad|catalogueSkus|checkout|sku/i.test(couplesSky),
  false,
  'couples sky must not add checkout or SKU behavior',
)
assert.ok(
  couplesSky.includes('timeKnown && zoneKnown') || couplesSky.includes('zoneKnown && timeKnown'),
)
assert.equal(couplesSky.includes("time || '12:00'"), false)
assert.equal(
  /flyTo|focusPlanet/.test(couplesSky),
  false,
  'couples A/B must not fly the live camera',
)
assert.ok(
  /blank time withholds that clock/i.test(compatibilityHtml) ||
    compatibilityHtml.includes('that clock, the Moon, and angles are withheld'),
)
assert.equal(
  /location\.hash|new URLSearchParams\(location\.search\)[\s\S]{0,120}(?:get\(['"](?:d|date|time|city|lat|lon)|birth)/.test(
    chartPage,
  ),
  false,
  'chart page must not restore birth details from an address',
)

for (const critical of ['app', 'chart-page', 'horoscope-page']) {
  assert.ok(serviceWorker.includes(critical), `${critical}.js must remain release-critical`)
}
assert.ok(
  serviceWorker.includes('if (isCritical ||') &&
    serviceWorker.includes('if (network) return network;'),
  'release-critical code must remain network-first',
)

const runbook = read('./ECLIPSE-RUNBOOK.md')
const paypalRunbook = read('./PAYPAL-SETUP.md')
const lighthouseRunner = read('./tools/visual-check/lighthouse-production.mjs')
const releaseStatus = read('./STATUS.md')
assert.ok(runbook.includes('26 commands, must be 26/26'))
assert.match(
  runbook,
  /archived entitlement runbook/i,
  'Eclipse operations must stay explicitly archived',
)
assert.equal(
  /\?license=|turn(?:ing)? (?:the )?checkout live|checkoutEnabled:\s*true/i.test(runbook),
  false,
  'archived Eclipse instructions must not restore URL licences or checkout activation',
)
assert.match(
  paypalRunbook,
  /retired for v902/i,
  'obsolete PayPal product instructions must be visibly retired',
)
assert.equal(
  /site is already fully wired for PayPal|every step below is a paste-a-link job/i.test(
    paypalRunbook,
  ),
  false,
  'retired PayPal instructions must not tell the owner to reactivate the old catalogue',
)
assert.equal(
  /19 suites|19\/19|23 suites|23\/23|24 suites|24\/24|25 suites|25\/25|27 suites|27\/27/.test(
    runbook,
  ),
  false,
)
assert.equal(
  lighthouseRunner.includes('All pages passed CI thresholds.'),
  false,
  'informational Lighthouse runs must not claim that every page passed CI',
)
assert.ok(
  lighthouseRunner.includes('Informational threshold misses') &&
    lighthouseRunner.includes('CI enforcement was not enabled for this run.'),
  'informational Lighthouse misses must be reported explicitly',
)
assert.equal(
  lighthouseRunner.includes('auditPathLikely'),
  false,
  'production Lighthouse must describe headless as its host, not a product audit path',
)
assert.ok(
  lighthouseRunner.includes('Headless is the execution host only') &&
    lighthouseRunner.includes('uses the visitor path'),
  'production Lighthouse report must disclose its host and same-path contract',
)

const measuredPathSources = [
  './website/js/ap-sign-defer-boot.js',
  './website/js/icons.js',
  './website/js/instrument.js',
  './website/ephemeris.html',
  './website/transits.html',
  './website/lifepath.html',
]
for (const path of measuredPathSources) {
  assert.equal(
    /navigator\.webdriver|HeadlessChrome|ap-audit-path/.test(read(path)),
    false,
    `${path} must use the visitor rendering and resource path during production measurement`,
  )
}
const deferredCssRuntime = read('./website/js/defer-page-css.js').split(
  '/* One-time gentle reload',
)[0]
assert.equal(
  /navigator\.webdriver|HeadlessChrome|auditPath/.test(deferredCssRuntime),
  false,
  'deferred CSS must not disappear under automated production measurement',
)

const mergeNote = read('./MERGE-2026-07-17-COWORK.md')
assert.equal(/£2\.99[^\n]*£4 archive|£14→£19|prices only rise/i.test(mergeNote), false)

for (const path of [
  './website/js/gumroad-unlock.js',
  './ECLIPSE-RUNBOOK.md',
  './marketing/ECLIPSE-LAUNCH-PACK-2026-08-12.md',
  './marketing/social-2026-08-12/tiktok/PLAN.md',
]) {
  const text = read(path).toLowerCase()
  for (const staleClaim of [
    '£19 later',
    'rises to £4',
    '£4 after 12 aug',
    '£2.99 → £4',
    'pre-eclipse prices',
    'price flip',
  ]) {
    assert.equal(text.includes(staleClaim), false, `${path} retains stale claim: ${staleClaim}`)
  }
}

const launchPack = read('./marketing/ECLIPSE-LAUNCH-PACK-2026-08-12.md')
assert.equal(/arcminute|ephemeris/i.test(launchPack), false)

const shop = read('./website/shop.html')
const terms = read('./website/terms.html')
const refunds = read('./website/refunds.html')
const personalizationEngine = read('./website/js/personalization-engine.js')
const readingPrefs = read('./website/js/ap-reading-prefs.js')
const fulfilRedirect = read('./website/fulfil-redirect.html')
const eclipse = read('./website/eclipse.html')
const eclipseLive = read('./website/js/ap-eclipse-live-v834.js')
const horoscopePage = read('./website/js/horoscope-page.js')
const quizRuntime = read('./website/js/quiz.js')
const productConfig = read('./website/js/app.js')
const affiliateSocial = read('./website/js/affiliate-social.js')
const edition = read('./website/js/ap-eclipse-edition-v841.js')
const eclipseContact = read('./website/js/ap-eclipse-contact-v835.js')
const deepReadingEngine = read('./website/js/deep-reading.js')
const natalReadingEngine = read('./website/js/ap-natal-reading.js')
const gumroad = read('./website/js/gumroad-unlock.js')
const gumroadBridge = read('./website/js/ap-gumroad-bridge.js')
const studioCatalogue = JSON.parse(read('./website/data/products-v901.json'))
assert.equal(
  studioCatalogue.state,
  'draft-not-published',
  'the Studio catalogue must distinguish a prepared local candidate from a published shop',
)
assert.equal(
  studioCatalogue.platform.checkoutVerified,
  false,
  'checkout must remain closed until the signed-in Commission flow is verified',
)
assert.equal(
  studioCatalogue.products.length,
  3,
  'the Studio launch candidate must contain exactly the three reviewed commissions',
)
assert.deepEqual(
  studioCatalogue.products.map(({ sku, priceGbp, status, checkoutUrl }) => ({
    sku,
    priceGbp,
    status,
    checkoutUrl,
  })),
  [
    { sku: 'natal-sky-print-pack', priceGbp: 18, status: 'draft', checkoutUrl: null },
    { sku: 'personal-sky-keepsake', priceGbp: 29, status: 'draft', checkoutUrl: null },
    { sku: 'whole-sky-edition', priceGbp: 39, status: 'draft', checkoutUrl: null },
  ],
)
assert.deepEqual(
  [...shop.matchAll(/\bdata-product-sku=["']([^"']+)["']/gi)].map((match) => match[1]).sort(),
  studioCatalogue.products.map(({ sku }) => sku).sort(),
  'the public candidate must show each reviewed product once and no placeholder SKU',
)
assert.match(
  shop,
  /(?:checkout|commissions?)[^.]{0,90}(?:closed|not open|not live|verification pending|open after verification)/i,
  'shop must make the prelaunch checkout state visible',
)
assert.equal(
  /gumroad\.com\/(?:l\/|checkout|products?)|checkout\.gumroad\.com/i.test(shop),
  false,
  'shop must not expose a Gumroad checkout before action-time verification',
)
assert.equal(
  /\b(?:best[ -]?seller|most popular|selling fast|limited time|today only|last chance|only \d+ (?:left|remaining)|five[- ]star|5[- ]star)\b/i.test(
    shop,
  ),
  false,
  'shop must not invent urgency, scarcity or social proof',
)
assert.equal(
  existsSync(new URL('./website/js/shop-commerce.js', import.meta.url)),
  false,
  'the retired legacy commerce runtime must not ship',
)
assert.ok(
  personalizationEngine.includes('const ZODIAC_SIGNS = Object.freeze') &&
    personalizationEngine.includes('welcome.replaceChildren') &&
    personalizationEngine.includes('note.replaceChildren'),
  'personalization must use closed sign labels and DOM text nodes',
)
assert.equal(
  personalizationEngine.includes('.innerHTML'),
  false,
  'saved profile fields must never reach personalization innerHTML',
)
const checkoutPrefs = readingPrefs.slice(
  readingPrefs.indexOf('function appendToCheckoutUrl'),
  readingPrefs.indexOf('window.APReadingPrefs'),
)
assert.equal(
  /chart_name|AstroProfile\.getCharts/.test(checkoutPrefs),
  false,
  'saved chart labels must never be serialized into an external checkout URL',
)
assert.ok(
  fulfilRedirect.includes('content="no-referrer"') &&
    fulfilRedirect.includes('Legacy order handoff retired'),
  'the legacy fulfilment route must remain a clearly retired no-referrer page',
)
assert.equal(
  /URLSearchParams|__AP_FULFIL_HANDOFF|buyer_name|order_id|product_sku|Typeform|location\.replace/i.test(
    fulfilRedirect,
  ),
  false,
  'the retired fulfilment route must not read, retain or forward order metadata',
)
assert.ok(
  privacy.includes('Legacy order handoff') &&
    privacy.includes('No current shop checkout uses this bridge.'),
  'privacy must document that the former handoff is retired',
)
assert.equal(
  shop.includes('Your Eclipse Edition'),
  false,
  'eclipse edition is retired from the shop',
)
assert.equal(shop.includes('Personalised eclipse edition'), false)
assert.equal(
  /ko-fi\.com|kofi/i.test(shop),
  false,
  'Studio preview must not open Ko-fi while checkout is closed',
)
assert.equal(
  /one-time and optional monthly support|Monthly support recurs/i.test(shop),
  false,
  'Studio preview must not offer recurring support while checkout is closed',
)
assert.equal(
  /neither requires an account or email/i.test(shop),
  false,
  'free-tool privacy must not be attributed to external support',
)
for (const [name, source] of [
  ['privacy', privacy],
  ['terms', terms],
  ['refunds', refunds],
]) {
  const normalized = source.replace(/\s+/g, ' ')
  assert.match(
    normalized,
    /legacy external Gumroad listing may still be reachable/i,
    `${name} must disclose the externally reachable archived listing until the owner unpublishes it`,
  )
  assert.equal(
    /No product is currently (?:offered )?for sale/i.test(source),
    false,
    `${name} must not make an absolute no-sale claim while the external listing remains reachable`,
  )
}
assert.match(
  privacy,
  /Ko-fi and\s+the payment provider (?:it )?shows? before confirmation/i,
  'privacy policy must disclose the voluntary-support processor boundary',
)
assert.match(
  privacy,
  /Ko-fi currently documents PayPal and Stripe as its supported providers/i,
  'privacy policy must name Ko-fi’s documented provider set without claiming which account route is connected',
)
assert.match(
  privacy,
  /recurring-payment status/i,
  'privacy policy must disclose metadata for recurring Ko-fi support',
)
assert.match(
  terms,
  /optional\s+recurring monthly tip/i,
  'terms must disclose the recurring Ko-fi option',
)
assert.match(
  terms,
  /monthly tip renews until cancelled/i,
  'terms must state the recurring effect and cancellation route',
)
assert.match(
  refunds,
  /A monthly tip renews until cancelled/i,
  'refunds page must explain recurring support and its cancellation path',
)
assert.equal(
  /not a purchase, subscription, feature unlock or digital-good order/i.test(terms),
  false,
  'terms must not deny subscription behavior while Ko-fi monthly support is enabled',
)
assert.match(
  paypalRunbook,
  /one-time and optional monthly support/i,
  'owner runbook must verify both public Ko-fi support frequencies',
)
assert.match(
  releaseStatus,
  /(?:not (?:a )?live|no product was published|checkout (?:is )?closed)/i,
  'release status must distinguish this local prelaunch candidate from the live site',
)
assert.match(
  releaseStatus,
  /(?:public|publish)[^.\n]{0,100}geographic[^.\n]{0,80}address/i,
  'release status must preserve the missing public-address launch blocker',
)
assert.match(
  releaseStatus,
  /(?:Gumroad|Commission)[^.]{0,120}(?:sign[- ]in|eligib|verification|test order)/i,
  'release status must preserve the unverified seller-dashboard blocker',
)
assert.equal(
  /\b(?:shop|products?|checkout)\s+(?:is|are)\s+(?:already\s+|now\s+)?(?:live|published|deployed)\b/i.test(
    releaseStatus,
  ),
  false,
  'release status must not overclaim deployment, publication or checkout activation',
)
assert.ok(eclipse.includes('id="eclipseEdition"') && eclipse.includes('id="eclipseContactForm"'))
assert.doesNotMatch(
  productConfig,
  /\bgiftUrl\s*:|\bcommerce\s*:|detailsForm|Typeform|product-gift|Two Skies|recipient|birthday/i,
  'the public core runtime must not retain the retired commerce or deferred gift catalogue',
)
assert.match(productConfig, /emailCaptureEnabled:\s*false/)
assert.doesNotMatch(
  quizRuntime,
  /AP_MON|checkout|shop\.html|(?:£|\$)\s*\d/i,
  'the free quiz must not route visitors into a product or priced recommendation while checkout is closed',
)
assert.equal(
  /list\.astroprecise\.app|function captureEmail|newsletterUrl:\s*'https?:/.test(productConfig),
  false,
  'site-wide email capture must stay paused until the owner verifies the full consent lifecycle',
)
for (const path of [
  './website/links.html',
  './website/profile.html',
  './website/saturn-return.html',
]) {
  assert.equal(
    /ap-email-cta__form|cw-waitlist__form/.test(read(path)),
    false,
    `${path} must not expose a signup form while email capture is paused`,
  )
}
assert.match(productConfig, /adsEnabled:\s*false/)
assert.ok(
  affiliateSocial.includes('aff.adsEnabled !== true || !amazonTag()'),
  'affiliate cards must require both an explicit enable and a real Associates tag',
)
assert.ok(read('./website/terms.html').includes('No affiliate programme is active today.'))
for (const source of [edition, eclipseContact, deepReadingEngine]) {
  assert.ok(
    source.includes(`eclipse-reading.js?v=${releaseTip}`),
    'every transitive eclipse-reading import must carry the release tip',
  )
}
for (const source of [eclipseContact, natalReadingEngine]) {
  assert.ok(
    source.includes(`reading-templates.json?v=${releaseTip}`),
    'every reading-template fetch must carry the release tip',
  )
}
assert.ok(read('./website/accuracy.html').includes(`chart-render.js?v=${releaseTip}`))
assert.ok(read('./website/transits.html').includes(`chart-render.js?v=${releaseTip}`))
assert.ok(read('./website/quiz.html').includes(`quiz.js?v=${releaseTip}`))
assert.ok(read('./website/outreach.html').includes(`outreach-content.js?v=${releaseTip}`))
assert.ok(edition.includes('reading.gateSale || reading.quiet'))
assert.ok(edition.includes('This event edition is closed to new purchases'))
assert.equal(edition.includes('data-edition-buy'), false)
assert.ok(eclipse.includes('5.1 MB PDF'))
assert.equal(/2\.7 MB PDF/.test(eclipse), false)
assert.equal(
  /personally\s+reviewed|reviewed before they(?:'|&rsquo;)re sent|a human pass/i.test(
    read('./website/why.html'),
  ),
  false,
)
assert.ok(
  eclipseLive.includes('new URL(window.location.pathname, window.location.origin)') &&
    eclipseLive.includes("url.searchParams.set('public', '1')"),
  'eclipse share must build a canonical explicitly public event URL',
)
assert.ok(
  eclipse.includes('momentMs >= rangeStartMs && momentMs <= rangeEndMs'),
  'eclipse ingress must retain only moments inside its public replay window',
)
assert.equal(
  eclipseLive.includes('new URL(window.location.href)'),
  false,
  'eclipse share must not re-share arbitrary ingress parameters',
)
assert.ok(
  horoscopePage.includes('new URL(window.location.pathname, window.location.origin)') &&
    horoscopePage.includes("url.searchParams.set('sign', currentOpenSign)"),
  'horoscope share must build a canonical sign-only URL',
)
assert.equal(
  horoscopePage.includes('new URL(window.location.href)'),
  false,
  'horoscope share must not re-share arbitrary ingress parameters',
)
assert.ok(
  quizRuntime.includes('new URL(window.location.pathname, window.location.origin).href'),
  'quiz share must use the canonical page address',
)
for (const path of [
  './website/eclipse.html',
  './website/horoscope.html',
  './website/quiz.html',
  './website/moonphase.html',
  './website/guides.html',
]) {
  const source = read(path)
  assert.ok(
    source.includes('content="no-referrer"'),
    `${path} must suppress legacy-address referrers`,
  )
  assert.ok(
    source.includes('history.replaceState'),
    `${path} must canonicalize arbitrary ingress before sharing`,
  )
}
const skyGuides = read('./website/js/sky-guides.js')
assert.ok(
  skyGuides.includes('function safeHistoryUrl') &&
    !skyGuides.includes('location.pathname + location.search'),
  'guide history must preserve only allowlisted runtime flags',
)
const brandNebula = read('./website/css/ap-brand-nebula.css')
assert.equal(
  /html\.ap-brand-nebula body\s*>\s*\*\s*\{/.test(brandNebula),
  false,
  'late brand styling must not de-fix body-level canvases, notices or mobile navigation',
)

for (const path of [
  './website/index-classic.html',
  './website/index-full.html',
  './website/index-lite.html',
  './website/mysky.html',
  './website/observatory.html',
  './website/deep-time.html',
  './website/synastry.html',
]) {
  const source = read(path)
  assert.ok(
    source.indexOf('content="no-referrer"') > -1 &&
      source.indexOf('content="no-referrer"') < source.indexOf('<script>'),
    `${path} must suppress referrers before its redirect runs`,
  )
  assert.equal(
    /target\.search\s*=\s*location\.search|target\.hash\s*=\s*location\.hash|location\.search\s*\+\s*location\.hash/.test(
      source,
    ),
    false,
    `${path} must not blindly relay legacy personal fields`,
  )
}

const moment = read('./website/moment.html')
const saturnReturn = read('./website/saturn-return.html')
const instrument = read('./website/ephemeris.html')
const footer = read('./website/js/ap-footer-inject.js')
const manifest = read('./website/manifest.json')
const tonight = read('./website/tonight.html')
assert.ok(
  moment.includes('A town search sends only that name to Open-Meteo; the date and time stay here.'),
)
assert.equal(moment.includes('birth data never leaves your device'), false)
assert.ok(
  instrument.includes(
    'A town search sends only that name to Open-Meteo; your birth date and time stay here.',
  ),
)
assert.ok(
  chartHtml.includes('Online search sends only the town text to Open-Meteo'),
)
assert.ok(
  footer.includes(
    'Town search sends only that name to Open-Meteo; birth date and time stay on this device.',
  ),
)
assert.ok(
  JSON.parse(manifest).description.includes('Town search sends only that name to Open-Meteo'),
)
assert.ok(tonight.includes('City search sends only the place name to Open-Meteo'))
assert.equal(/£8|moment-pack|optional pack|pack later|paid keepsakes/i.test(moment), false)
assert.equal(
  /full personalised reading|printable PDF|gift readings|written natal reports/i.test(saturnReturn),
  false,
)
for (const source of [gumroad, gumroadBridge, edition]) {
  assert.equal(
    /handleUnlockOnLoad|searchParams\.get\(['"]license|[?&]license=/.test(source),
    false,
    'licence key must never be accepted through a URL',
  )
}

const htmlFiles = readdirSync(new URL('./website/', import.meta.url)).filter((name) =>
  name.endsWith('.html'),
)
for (const file of htmlFiles) {
  const html = read('./website/' + file)
  assert.equal(
    /shop\.html#(?:deep-reading|eclipse-reading|eclipse-set)/.test(html),
    false,
    `${file} links to a retired product funnel`,
  )
}

// ── Sky card: one keepable minute, honest about zone, hour and light ────────
const skyCard = read('./website/sky-card.html')
const skyCardJs = read('./website/js/ap-sky-card.js')
const keepMinute = read('./website/js/ap-keep-minute.js')
assert.ok(
  skyCard.includes(`window.AP_ASSET_V='${releaseTip}'`),
  'sky card must declare the release tip',
)
const skyCardTips = [...skyCard.matchAll(/\?v=(\d+)/g)].map((match) => match[1])
assert.ok(
  skyCardTips.length > 0 && skyCardTips.every((tip) => tip === releaseTip),
  'sky card must pin exactly one release tip',
)
assert.ok(
  skyCardJs.includes('skyCardShare') && skyCardJs.includes('navigator.share'),
  'sky card must offer a share sheet for the PNG',
)
assert.ok(
  skyCard.includes(`js/ap-next.js?v=${releaseTip}`),
  'sky card must use the shared phone navigation',
)
assert.equal(/Astro Precise/.test(skyCard), false, 'the wordmark is one word')
assert.equal(/#0a0908/i.test(skyCard), false, 'sky card must leave the retired warm surface behind')
assert.equal(
  /never rounded|placed exactly/i.test(skyCard),
  false,
  'sky card must not claim an exactness it cannot prove',
)
assert.equal(
  /TIME \(UTC\)|clock time read as UTC/i.test(skyCard),
  false,
  'a birth clock time is not UTC',
)
assert.ok(
  skyCard.includes('Created in your browser, with no upload.'),
  'sky card must say the image is created on the device',
)
assert.equal(
  /quiz\.html|angel-numbers\.html|name-numerology\.html|lifepath\.html|moment\.html/.test(skyCard),
  false,
  'retired rooms stay retired',
)
assert.ok(
  skyCardJs.includes("zone === 'UTC'") &&
    skyCardJs.includes("zone === 'GMT'") &&
    skyCardJs.includes("zone === 'Etc/UTC'") &&
    skyCardJs.includes('Etc\\/'),
  'sky card must refuse UTC, GMT and Etc/* as a birth zone',
)
assert.ok(skyCardJs.includes('sunAltitude('), 'day or night must be computed, never guessed')
assert.ok(
  skyCardJs.includes('DAY OR NIGHT NOT STATED') && skyCardJs.includes('NO BIRTH HOUR'),
  'an unknown hour must withhold the rising sign and the light state',
)
assert.ok(
  skyCardJs.includes("' (ASSUMED)'") && skyCardJs.includes('MOON PLACED FROM '),
  'an assumed hour must be printed on the card, not applied silently',
)
assert.ok(skyCardJs.includes('NOT A CLAIM ABOUT YOUR LIFE'), 'the card must not claim to be true')
assert.ok(
  skyCardJs.includes('function coordinate(') && skyCardJs.includes('not the coordinates'),
  'a carried minute without coordinates must not be placed at 0, 0',
)
assert.equal(
  /Number\(carried\.(?:lat|lon)\)/.test(skyCardJs),
  false,
  'coordinates must go through the empty-value guard',
)
assert.equal(
  /location\.(?:search|hash)|URLSearchParams/.test(skyCardJs),
  false,
  'sky card must not accept a birth minute from an address',
)
assert.equal(
  /location\.(?:search|hash)|URLSearchParams|location\.href\s*=/.test(keepMinute),
  false,
  'the keep path must not move a birth minute through a link',
)
assert.ok(keepMinute.includes('sessionStorage.setItem'), 'the keep path hands off in this tab only')
// Phone Look 390: the plate reaches the first screen and every tap is 44px.
assert.ok(
  skyCard.includes('@media(max-width:700px)'),
  'sky card must use the living-sky phone band, not 430px',
)
assert.match(
  skyCard,
  /\.sky-poster\{order:1/,
  'the plate must sit above the form on a phone',
)
assert.match(skyCard, /\.keepsake-controls\{order:2/, 'the form follows the plate on a phone')
assert.ok(
  skyCard.includes('min-height:48px;font-size:16px;padding:10px'),
  'form inputs need a 48px tap and a 16px face',
)
assert.ok(skyCard.includes('width:100%;min-height:48px'), 'phone buttons take the full width')
assert.ok(
  skyCard.includes('.keepsake-controls .small,.page-intro .lede{font-size:16px'),
  'the privacy line holds the 16px phone floor',
)
assert.ok(
  skyCard.includes('min-height:44px;font-size:16px'),
  'the birth-details choice needs a 44px tap',
)
assert.ok(
  skyCard.includes('distances and sizes are illustrative'),
  'a phone must be told the plate is a schematic, not a measured portrait',
)
assert.equal(
  /Astro\s+Precise/.test(skyCard),
  false,
  'the wordmark is one word, everywhere on the page',
)

const chartNext = read('./website/js/ap-chart-next.js')
const readingNext = read('./website/js/ap-reading-next.js')
const keepsakeNext = read('./website/js/ap-keepsake-next.js')
assert.ok(
  chartNext.includes("sessionStorage.setItem('ap-next-reading'") &&
    chartNext.includes("location.href='deep-reading.html'"),
  'chart hands the reading to the next page in this tab only',
)
assert.equal(/deep-reading\.html\?/.test(chartNext), false, 'chart must not put a birth minute in the reading link')
assert.ok(
  readingNext.includes("sessionStorage.setItem('ap-next-sky'") &&
    readingNext.includes("location.href='sky-card.html'"),
  'reading hands the keepsake to the next page in this tab only',
)
assert.equal(/sky-card\.html\?/.test(readingNext), false, 'reading must not put a birth minute in the keep link')
assert.ok(
  keepsakeNext.includes("Birth date, time and place are hidden from the image."),
  'keepsake artwork hides birth details unless the visitor asks',
)
assert.equal(
  /location\.(?:search|hash)|URLSearchParams/.test(keepsakeNext),
  false,
  'keepsake must not read a birth minute from the address',
)

const homeKeepPage = read('./website/observatory.html')
assert.ok(
  homeKeepPage.includes(`ap-keep-sky.js?v=${releaseTip}`) &&
    homeKeepPage.includes(`ap-keep-sky.css?v=${releaseTip}`),
  'Observatory must load Keep script and release-pinned styles',
)
assert.ok(
  homeKeepPage.includes(`ap-home-keep.js?v=${releaseTip}`),
  'Observatory must load the Keep context bridge',
)
assert.ok(
  homeKeepPage.includes('id="keep-sky"') && homeKeepPage.includes('data-keep-mode="birth-hour"'),
  'Observatory must host birth-hour Keep on the live orrery',
)
assert.equal(
  /LIVE/.test(read('./website/js/ap-keep-sky.js').split('stampSurfaceA')[1] || ''),
  false,
  'Keep stamp path must not introduce a LIVE badge',
)
assert.ok(
  read('./website/js/ap-keep-sky.js').includes("SURFACE_A = 'SCHEMATIC'"),
  'Keep PNG must stamp Surface A SCHEMATIC',
)
assert.ok(
  read('./website/js/ap-asset-v.js').includes(`AP_ASSET_V = '${releaseTip}'`),
  'shared asset tip must match the service worker',
)
for (const offlineAsset of [
  './js/ap-chart-next.js',
  './js/ap-reading-next.js',
  './js/ap-keepsake-next.js',
  './js/ap-mirror-hour.js',
  './js/ephemeris.js',
]) {
  assert.ok(
    serviceWorker.includes(`'${offlineAsset}'`),
    `offline Home shell must include ${offlineAsset}`,
  )
}
for (const criticalAsset of [
  'chart-render',
  'affiliate-social',
  'ap-couples-sky',
  'quiz',
  'outreach-content',
]) {
  assert.ok(
    serviceWorker.includes(criticalAsset),
    `release-changed ${criticalAsset} must revalidate network-first`,
  )
}

const outreach = read('./website/js/outreach-content.js')
for (const stale of [
  'Deep Reading £12',
  'posters from £6',
  'shop.html#deep-reading',
  '{{deepReadingPrice}}',
]) {
  assert.equal(
    outreach.includes(stale),
    false,
    `outreach content retains stale launch offer: ${stale}`,
  )
}

const publicTruthSources = [
  ...readdirSync(new URL('./website/', import.meta.url))
    .filter((name) => /\.(?:html|txt)$/.test(name))
    .map((name) => './website/' + name),
  ...readdirSync(new URL('./website/js/', import.meta.url))
    .filter((name) => /\.(?:js|json)$/.test(name))
    .map((name) => './website/js/' + name),
  './website/guides/eclipse-field-guide-2026.html',
]
for (const path of publicTruthSources) {
  assert.equal(read(path).includes('£7'), false, `${path} exposes the retired £7 offer`)
}

const shopBuild = read('./tools/build.mjs')
assert.ok(
  shopBuild.includes("'img/shop/v906/natal-plate.jpg'") &&
    shopBuild.includes("'img/shop/v906/keepsake-plate.jpg'") &&
    shopBuild.includes("'img/shop/v906/earth-plate.jpg'"),
  'Pages dist must ship the v906 shop plates the Studio HTML references',
)
assert.ok(
  read('./website/shop.html').includes('img/shop/v906/natal-plate.jpg'),
  'shop.html must point at the v906 Studio plates',
)

const moonphase = read('./website/js/moonphase.js')
assert.ok(
  moonphase.includes('APDeepLink.stashSkyLink') &&
    moonphase.includes("var href = 'observatory.html#focus=moon'"),
  'birthday Moon instant must use a same-tab private stash and a clean model link',
)
assert.equal(
  /buildSkyLink\s*\(\s*\{\s*m:\s*utc/.test(moonphase),
  false,
  'birthday Moon instant must not be serialized into a public link',
)
assert.ok(
  moonphase.includes("escHtml(label || '')"),
  'Moon compatibility names must render as inert text',
)
const outreachPage = read('./website/outreach.html')
for (const source of [moonphase, outreachPage]) {
  assert.ok(
    source.includes("document.execCommand('copy') === true"),
    'clipboard fallback must verify that copy succeeded',
  )
  assert.ok(source.includes('Copy failed'), 'clipboard failure must not use success feedback')
}

console.log('PASS pre-deploy truth and runtime regression checks')
