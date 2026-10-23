// 2C step 6: the Observatory on the Paper & Night light shell. The light header
// and footer come from ap-next; the live 3D instrument stays dark, but only inside
// .ap-sky. One page stylesheet, tokens only, no text under 14px.
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const SITE = 'website'
const V = readFileSync(join(SITE, 'js/ap-asset-v.js'), 'utf8').match(/AP_ASSET_V\s*=\s*'(\d+)'/)[1]
let pass = 0, fail = 0
const ok = (name, cond) => { if (cond) { pass++ } else { fail++; console.log('  ✗ ' + name) } }

const html = readFileSync(join(SITE, 'observatory.html'), 'utf8')
const lower = html.toLowerCase()
const css = readFileSync(join(SITE, 'css/observatory-next.css'), 'utf8')

// Shell
ok('body is ap-next ap-obs and keeps the engine room classes', /<body class="ap-next ap-obs ap-live-home ap-reading-room">/.test(html))
const sheets = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((m) => m[1])
ok('exactly ap-next.css + observatory-next.css', sheets.join(',') === `css/ap-next.css?v=${V},css/observatory-next.css?v=${V}`)
ok('loads ap-next.js', html.includes(`<script src="js/ap-next.js?v=${V}" defer></script>`))
ok('header and footer slots', html.includes('data-ap-next-nav') && html.includes('data-ap-next-footer'))
ok('skip link to main', html.includes('href="#main-content"') && html.includes('id="main-content"'))
const pins = [...html.matchAll(/\?v=(\d+)/g)].map((m) => m[1])
ok(`every ?v= pin is the release (${V})`, pins.length > 0 && pins.every((p) => p === V))
const assetV = html.match(/AP_ASSET_V='(\d+)'/)
ok('inline AP_ASSET_V matches', !assetV || assetV[1] === V)
ok('theme-color #F6F3EC', /<meta name="theme-color" content="#F6F3EC"\s*\/?>/.test(html))
ok('no dark color-scheme meta', !/<meta name="color-scheme" content="dark"/.test(html))
ok('referrer meta precedes the first script', html.indexOf('content="no-referrer"') > -1 && html.indexOf('content="no-referrer"') < html.indexOf('<script>'))

// Dark only inside .ap-sky
ok('#lead is the .ap-sky stage', /<section class="ap-live-stage ap-sky" id="lead"/.test(html))
const skyOpen = html.indexOf('class="ap-live-stage ap-sky"')
const skyClose = html.indexOf('</section>', skyOpen)
const orrery = html.indexOf('<void-orrery')
ok('void-orrery sits inside .ap-sky', orrery > skyOpen && orrery < skyClose)
ok('controls sit inside .ap-sky', html.indexOf('id="deck"') > skyOpen && html.indexOf('id="deck"') < skyClose)
ok('exactly one .ap-sky', (html.match(/\bap-sky\b"/g) || []).length === 1)

const BANNED = [
  '<style', ' style="', '040812', 'ap-home-v835.css', 'ap-living-sky-v834.css', 'ap-mirror-hour.css', 'ap-keep-sky.css',
  'ap-phone-pass.css', 'js/ap-nav-model.js', 'js/ap-footer-inject.js', 'js/ap-sky-time.js', 'site-header', 'ap-site-footer',
  'schibsted', 'cormorant', 'plex', '@font-face',
]
for (const needle of BANNED) ok(`html: no ${needle.trim()}`, !lower.includes(needle.toLowerCase()))

// Behaviour the page JS needs stays in place
for (const probe of ['id="keep-sky"', 'data-keep-mode="birth-hour"', 'id="coupon-form"', 'class="ap-mobile-flight-deck"',
  'id="mobileWorld"', 'id="mobileScale"', 'class="ap-model-boot"', 'class="ap-presence-banner"', 'id="ap-enter-sky"',
  'id="mladder"', 'id="dock"', 'id="ap-cosmic-flight-launch"', 'js/ap-observatory-v834.js', 'js/ap-home-reading.js',
  'js/void-orrery-adapter.js', 'Preparing 3D']) ok(`keeps ${probe}`, html.includes(probe))

// Licence credits survive the footer swap
for (const credit of ['Solar System Scope', 'OPAL', 'NASA/JHUAPL/SwRI/USGS', 'HYG catalogue', 'creativecommons.org/licenses/by/4.0/', 'creativecommons.org/licenses/by-sa/4.0/'])
  ok(`credit: ${credit}`, html.includes(credit))
const textureCredits = (html.match(/<section class="ap-texture-credits" id="texture-credits"[\s\S]*?<\/section>/) || [''])[0]
ok('texture credits link the Hubble OPAL archive at STScI', /<a href="https:\/\/archive\.stsci\.edu\/hlsp\/opal"[^>]*>archived by STScI<\/a>/.test(textureCredits))

// Local references resolve; ids are unique
const refs = [...html.matchAll(/(?:href|src|srcset)="([^"#?:]+\.(?:css|js|woff2|webp|png|svg|jpg|html))(?:\?[^"]*)?"/g)].map((m) => m[1])
for (const ref of new Set(refs)) ok(`local ref exists: ${ref}`, existsSync(join(SITE, ref)))
const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])
ok('ids are unique', ids.length === new Set(ids).size)

// Page CSS: scoped, tokens only, nothing under 14px
const plain = css.replace(/\/\*[\s\S]*?\*\//g, '')
ok('css: no 040812', !/040812/i.test(plain))
ok('css: no rgba()/rgb()', !/rgba?\(/i.test(plain))
let stripped = plain
for (let prev = ''; prev !== stripped;) { prev = stripped; stripped = stripped.replace(/var\(--[\w-]+(?:,[^()]*)?\)/g, '') }
const hexOutsideVar = stripped.replace(/[^{}]+\{/g, '{').match(/#[0-9a-f]{3,8}\b/gi) || []
ok('css: hex only as var() fallbacks', hexOutsideVar.length === 0)
const px = [...plain.matchAll(/font(?:-size)?:[^;}]*?(\d+(?:\.\d+)?)px/g)].map((m) => Number(m[1]))
ok('css: no font size under 14px', px.every((n) => n >= 14))
const rem = [...plain.matchAll(/font(?:-size)?:[^;}]*?(\d*\.?\d+)rem/g)].map((m) => Number(m[1]))
ok('css: no rem font size under .875rem', rem.every((n) => n >= 0.875))
const nightRules = [...plain.matchAll(/([^{}]+)\{([^}]*)\}/g)].filter((m) => /background(?:-color)?:[^;]*--ap-night/.test(m[2])).map((m) => m[1].trim())
const lightLeak = nightRules.filter((sel) => !sel.split(',').every((one) => /ap-sky|ap-model-stage|ap-control-panel|ap-presence|ap-mobile-flight-deck|ap-model-vignette|ap-action--primary|ap-enter-sky/.test(one)))
ok('css: night backgrounds only on the sky stage', lightLeak.length === 0)
if (lightLeak.length) console.log(lightLeak)
ok('css: phone deck and boot-ready selectors for the adapter gate', css.includes('.ap-mobile-flight-deck') && css.includes('.ap-model-stage.is-model-ready .ap-model-boot'))
ok('css: reduced motion honoured', css.includes('prefers-reduced-motion:reduce'))

console.log(`test-observatory-page: ${pass} passed, ${fail} failed`)
if (fail) process.exit(1)
