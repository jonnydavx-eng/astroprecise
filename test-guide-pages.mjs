// 2C step 5: the dark legacy guide and tool pages on the Paper & Night light shell.
// Each page loads ap-next.css + guide-next.css and ap-next.js, carries none of the
// legacy dark stack, and draws planet/sign symbols from the brand glyph sprite.
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { buildGlyphsJs } from './website/tools/generate-glyphs-js.mjs'

const SITE = 'website'
const V = readFileSync(join(SITE, 'js/ap-asset-v.js'), 'utf8').match(/AP_ASSET_V\s*=\s*'(\d+)'/)[1]
let pass = 0, fail = 0
const ok = (name, cond) => { if (cond) { pass++ } else { fail++; console.log('  ✗ ' + name) } }

export const GUIDE_PAGES = ['why', 'what-is-my-rising-sign', 'moonphase', 'transits', 'tonight', 'natal-plate', 'retrograde', 'this-weeks-sky', 'horoscope']

// The migration plan's list for step 5, plus the rest of the legacy chrome that painted them dark.
const BANNED = [
  'ap-palette-2026', 'ap-atlas-tokens', 'ap-observatory-enchanted', 'ap-living-sky-v834', 'ap-cinematic-2026',
  'ap-logo-aurora', 'ap-brand-nebula', 'celestial-seals', 'main-lite',
  'js/cosmos.js', 'js/effects.js', 'js/ap-page-boot.js', 'js/icons.js', 'js/ap-footer-inject.js', 'js/ap-nav-model.js',
  'defer-page-css', 'starfield', 'aurora-orb', '040812', 'seals/zodiac/', '<style',
]

for (const key of GUIDE_PAGES) {
  const html = readFileSync(join(SITE, `${key}.html`), 'utf8')
  const lower = html.toLowerCase()

  ok(`${key}: SHELL body.ap-next.ap-guide`, new RegExp(`<body class="ap-next ap-guide ap-guide--${key}[ "]`).test(html))
  const sheets = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((m) => m[1])
  ok(`${key}: SHELL exactly ap-next.css + guide-next.css`, sheets.join(',') === `css/ap-next.css?v=${V},css/guide-next.css?v=${V}`)
  ok(`${key}: SHELL ap-next.js`, html.includes(`<script src="js/ap-next.js?v=${V}" defer></script>`))
  ok(`${key}: SHELL header and footer slots`, html.includes('data-ap-next-nav') && html.includes('data-ap-next-footer'))
  ok(`${key}: SHELL skip link to main`, html.includes('href="#main-content"') && html.includes('id="main-content"'))
  const pins = [...html.matchAll(/\?v=(\d+)/g)].map((m) => m[1])
  ok(`${key}: every ?v= pin is the release (${V})`, pins.length > 0 && pins.every((p) => p === V))
  const assetV = html.match(/AP_ASSET_V='(\d+)'/)
  ok(`${key}: inline AP_ASSET_V matches`, !assetV || assetV[1] === V)

  ok(`${key}: LIGHT no dark color-scheme meta`, !/<meta name="color-scheme" content="dark"/.test(html))
  ok(`${key}: LIGHT theme-color #F6F3EC`, html.includes('<meta name="theme-color" content="#F6F3EC" />'))
  for (const needle of BANNED) ok(`${key}: no ${needle}`, !lower.includes(needle.toLowerCase()))
  ok(`${key}: no inline style attributes beyond the hidden SVG sprite and JS toggles`,
    [...html.matchAll(/style="([^"]*)"/g)].every((m) => /^position:absolute;width:0;height:0;overflow:hidden$|^display:none$|^width:'/.test(m[1])))

  // Pages that draw planet or sign symbols use the brand sprite, not the retired seal art.
  if (/AstroIcons|data-celestial-seal|APGlyphs/.test(html)) ok(`${key}: loads js/ap-glyphs.js`, html.includes(`js/ap-glyphs.js?v=${V}`))

  const refs = [...html.matchAll(/(?:src|href)="((?:css|js|img|fonts)\/[^"?#]+)/g)].map((m) => m[1])
  for (const r of new Set(refs)) ok(`${key}: ${r} exists`, existsSync(join(SITE, r)))
}

// The glyph runtime is generated from the brand sprite and must stay in sync.
ok('js/ap-glyphs.js matches tools/generate-glyphs-js.mjs', readFileSync(join(SITE, 'js/ap-glyphs.js'), 'utf8') === buildGlyphsJs())

// The one page stylesheet: tokens, no legacy dark colours, nothing under 14px.
const css = readFileSync(join(SITE, 'css/guide-next.css'), 'utf8')
ok('guide-next.css: no 040812', !css.includes('040812'))
const bare = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/var\((?:[^()]|\([^()]*\))*\)/g, 'var()')
ok('guide-next.css: hex only as var() fallbacks', !/#[0-9a-f]{3,8}\b/i.test(bare) && !/rgba?\(/i.test(bare))
const pxSizes = [...css.matchAll(/font(?:-size)?:[^;}]*?(\d+(?:\.\d+)?)px/g)].map((m) => Number(m[1]))
ok('guide-next.css: no font size under 14px', pxSizes.every((n) => n >= 14))
const remSizes = [...css.matchAll(/font(?:-size)?:[^;}]*?(\d*\.\d+|\d+)rem/g)].map((m) => Number(m[1]))
ok('guide-next.css: no rem font size under 0.875rem', remSizes.every((n) => n >= 0.875))
ok('guide-next.css: serif headings via token', css.includes('var(--ap-serif)'))
ok('guide-next.css: hides the legacy engine visuals on the daily page', css.includes('.page-horoscope #ap-engine-visuals'))

// app.js stays out of the way on shell pages.
const app = readFileSync(join(SITE, 'js/app.js'), 'utf8')
ok("app.js: body.ap-next counts as a launch-core page", /function isLaunchCorePage\(\) \{\s*(?:\/\/[^\n]*\n\s*)*if \(document\.body && document\.body\.classList\.contains\('ap-next'\)\) return true;/.test(app))

console.log(`\ntest-guide-pages: ${pass} passed, ${fail} failed`)
if (fail) process.exit(1)
