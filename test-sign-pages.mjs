// Sign guides (aries … pisces): Paper & Night light shell, no legacy dark stack,
// and the committed pages match the generator byte for byte.
import { readFileSync, existsSync, mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { SIGN_KEYS, BANNED, PAGE_TITLE } from './website/tools/generate-sign-pages.mjs'

const SITE = 'website'
const V = readFileSync(join(SITE, 'js/ap-asset-v.js'), 'utf8').match(/AP_ASSET_V\s*=\s*'(\d+)'/)[1]
let pass = 0, fail = 0
const ok = (name, cond) => { if (cond) { pass++ } else { fail++; console.log('  ✗ ' + name) } }
const cap = (k) => k[0].toUpperCase() + k.slice(1)

ok('twelve signs', SIGN_KEYS.length === 12)

// Generator freshness: regenerate into a temp dir and compare.
const out = mkdtempSync(join(tmpdir(), 'ap-signs-'))
execFileSync(process.execPath, [join(SITE, 'tools/generate-sign-pages.mjs'), '--out', out], { stdio: 'ignore' })

for (const key of SIGN_KEYS) {
  const html = readFileSync(join(SITE, `${key}.html`), 'utf8')
  const lower = html.toLowerCase()
  const name = cap(key)
  ok(`${key}: matches generator output`, html === readFileSync(join(out, `${key}.html`), 'utf8'))

  // SHELL: the shared ap-next shell and one page stylesheet.
  ok(`${key}: SHELL body.ap-next.ap-sign`, /<body class="ap-next ap-sign"/.test(html))
  const sheets = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((m) => m[1])
  ok(`${key}: SHELL exactly ap-next.css + sign-next.css`, sheets.join(',') === `css/ap-next.css?v=${V},css/sign-next.css?v=${V}`)
  ok(`${key}: SHELL ap-next.js`, html.includes(`<script src="js/ap-next.js?v=${V}" defer></script>`))
  ok(`${key}: SHELL shared header and footer slots`, html.includes('data-ap-next-nav') && html.includes('data-ap-next-footer'))
  ok(`${key}: SHELL skip link to main`, html.includes('href="#main-content"') && html.includes('id="main-content"'))
  ok(`${key}: SHELL title`, html.includes(`<title>${name}: ${PAGE_TITLE} | AstroPrecise</title>`))
  ok(`${key}: SHELL breadcrumb to Guides & signs`, html.includes('<li><a href="guides.html">Guides &amp; signs</a></li>'))
  const pins = [...html.matchAll(/\?v=(\d+)/g)].map((m) => m[1])
  ok(`${key}: every ?v= pin is the release (${V})`, pins.length > 0 && pins.every((p) => p === V))

  // LIGHT: paper theme, no dark legacy hooks or AI card art.
  ok(`${key}: LIGHT theme-color #F6F3EC`, html.includes('<meta name="theme-color" content="#F6F3EC" />'))
  ok(`${key}: LIGHT no 040812`, !lower.includes('040812'))
  ok(`${key}: LIGHT no zodiac-cards`, !lower.includes('zodiac-cards'))
  ok(`${key}: LIGHT no inline <style>`, !lower.includes('<style'))
  for (const [needle, why] of BANNED) ok(`${key}: banned ${why}`, !lower.includes(needle.toLowerCase()))

  // Every <use href="#id"> resolves on the page, and ids are unique.
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])
  ok(`${key}: ids unique`, new Set(ids).size === ids.length)
  const uses = [...html.matchAll(/<use href="#([^"]+)"/g)].map((m) => m[1])
  ok(`${key}: every glyph <use> resolves`, uses.length > 0 && uses.every((u) => ids.includes(u)))
  ok(`${key}: brand glyph inlined`, html.includes(`<symbol id="g-${key}"`))
  ok(`${key}: constellation gradients never use the glyph id space`, !html.includes('url(#g-'))

  // Local files referenced by the page exist.
  const refs = [...html.matchAll(/(?:src|href)="((?:css|js|img|fonts)\/[^"?#]+)/g)].map((m) => m[1])
  for (const r of new Set(refs)) ok(`${key}: ${r} exists`, existsSync(join(SITE, r)))
}

for (const key of SIGN_KEYS) ok(`tile img/signs/${key}.webp`, existsSync(join(SITE, 'img/signs', `${key}.webp`)))

// The page stylesheet: tokens, no legacy dark colours, nothing under 14px in <main>.
const css = readFileSync(join(SITE, 'css/sign-next.css'), 'utf8')
ok('sign-next.css: no 040812', !css.includes('040812'))
const bare = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/var\([^()]*\)/g, 'var()')
ok('sign-next.css: hex only as var() fallbacks', !/#[0-9a-f]{3,8}\b/i.test(bare) && !/rgba?\(/i.test(bare))
const pxSizes = [...css.matchAll(/font(?:-size)?:[^;}]*?(\d+(?:\.\d+)?)px/g)].map((m) => Number(m[1]))
ok('sign-next.css: no font size under 14px', pxSizes.every((n) => n >= 14))
ok('sign-next.css: serif headings via token', css.includes('var(--ap-serif)'))

// The boot script paints the reading without inline styles.
const boot = readFileSync(join(SITE, 'js/sign-page-boot.js'), 'utf8')
ok('sign-page-boot.js: no inline style', !/style=/.test(boot))

console.log(`\ntest-sign-pages: ${pass} passed, ${fail} failed`)
if (fail) process.exit(1)
