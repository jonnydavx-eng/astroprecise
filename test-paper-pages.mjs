/**
 * Step 10b — Paper & Night page sweep.
 * Fails if any shipped website/*.html page uses the legacy #040812 void, unless it is
 * on the explicit allowlist below with a reason. Allowlisted pages must still need the
 * entry (a stale entry fails), so the list only shrinks.
 * Moved pages must stay on the paper tokens. Step 10f moved the 13 legacy page stacks
 * (LEGACY); journey and cosmic-calendar stay out because their starfield is the page.
 */
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const site = join(dirname(fileURLToPath(import.meta.url)), 'website')
const VOID = /#?040812/i

/** Pages still on the legacy dark stack, with the reason each is held. */
const ALLOW = {
  'fulfil-redirect.html': 'excluded area: order fulfilment / payment handoff',
  'digital-product-terms.html': 'excluded area: Studio sale terms (payment copy)',
  'links.html': 'excluded area: waitlist / support aside, Studio link and paid links',
  'profile.html': 'large app page (~82 KB) with its own dark stack; needs a dedicated rewrite',
  'sample-reading.html':
    'print / PDF reading template with SVG night gradient; moves with the PDF pipeline',
  // Step 10f kept these two out of the legacy sweep: the night starfield is the page itself.
  'journey.html':
    'full-page starfield warp canvas is the content; kept out of step 10f, needs a design call on .ap-sky',
  'cosmic-calendar.html':
    'full-page starfield canvas is the content; kept out of step 10f, needs a design call on .ap-sky',
}

/** Moved in step 10b. Shell pages sit on body.ap-next; stubs are light redirect stubs. */
const SHELL = [
  '404.html',
  'privacy.html',
  'terms.html',
  'refunds.html',
  'verify.html',
  'synchronicity-card.html',
]
const STUBS = [
  'catalogue.html',
  'deep-time.html',
  'mysky.html',
  'index-ephemeris.html',
  'index-lite.html',
  'synastry.html',
]
const LEGACY_DARK_CSS = [
  'ap-living-sky-v834',
  'ap-palette-2026',
  'ap-atlas-tokens',
  'ap-observatory-enchanted',
  'ap-legal-v835',
  'ap-verify-v835',
  'ap-cinematic-2026',
  'ap-page-boot.js',
]

/** Moved in step 10f: legacy page stacks re-skinned by css/ap-paper-pages.css. */
const LEGACY = [
  'accuracy.html',
  'angel-numbers.html',
  'numerology.html',
  'lifepath.html',
  'name-numerology.html',
  'quiz.html',
  'saturn-return.html',
  'solar-return.html',
  'cosmic-story.html',
  'eclipse.html',
  'ephemeris.html',
  'outreach.html',
  'moment.html',
]

function htmlFiles(dir, rel = '') {
  const out = []
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name === 'node_modules') continue
    const r = rel ? `${rel}/${e.name}` : e.name
    if (e.isDirectory()) out.push(...htmlFiles(join(dir, e.name), r))
    else if (e.name.endsWith('.html')) out.push(r)
  }
  return out
}

let passed = 0
const fails = []
const check = (cond, msg) => {
  if (cond) passed++
  else fails.push(msg)
}

const files = htmlFiles(site)
check(files.length > 50, `found shipped pages (${files.length})`)
for (const f of files) {
  const src = readFileSync(join(site, f), 'utf8')
  if (ALLOW[f])
    check(VOID.test(src), `${f}: allowlisted but no longer uses #040812 — remove it from ALLOW`)
  else
    check(
      !VOID.test(src),
      `${f}: uses legacy #040812 — move it to the Paper & Night tokens or allowlist it with a reason`,
    )
}
for (const [f, why] of Object.entries(ALLOW))
  check(
    why.length > 10 && files.includes(f),
    `${f}: allowlist entry needs a reason and a real page`,
  )

for (const f of SHELL) {
  const src = readFileSync(join(site, f), 'utf8')
  check(/<meta name="theme-color" content="#F6F3EC"/i.test(src), `${f}: theme-color #F6F3EC`)
  check(/<meta name="color-scheme" content="light">/.test(src), `${f}: color-scheme light`)
  check(/<body class="ap-next\b/.test(src), `${f}: body.ap-next`)
  check(
    /css\/ap-next\.css/.test(src) && /js\/ap-next\.js/.test(src),
    `${f}: ap-next shell css + js`,
  )
  for (const css of LEGACY_DARK_CSS) check(!src.includes(css), `${f}: no legacy ${css}`)
  check(
    !/class="skip-link"/.test(src),
    `${f}: uses the ap-skip link (legacy skip-link is unstyled on paper)`,
  )
}
for (const f of LEGACY) {
  const src = readFileSync(join(site, f), 'utf8')
  check(!ALLOW[f], `${f}: moved in step 10f, so not allowlisted`)
  check(/<html[^>]*\bclass="[^"]*\bap-paper-legacy\b/.test(src), `${f}: html.ap-paper-legacy`)
  check(/<meta name="theme-color" content="#F6F3EC"/i.test(src), `${f}: theme-color #F6F3EC`)
  check(/<meta name="color-scheme" content="light">/.test(src), `${f}: color-scheme light`)
  check(/html\{background:#F6F3EC/i.test(src), `${f}: paper ground before CSS loads`)
  check(/href="css\/ap-paper-pages\.css\?v=\d+"/.test(src), `${f}: links ap-paper-pages.css`)
  check(!/color-scheme" content="dark/.test(src), `${f}: no dark color-scheme`)
}
for (const f of STUBS) {
  const src = readFileSync(join(site, f), 'utf8')
  check(/#F6F3EC/i.test(src), `${f}: light paper ground`)
  check(!/color-scheme" content="dark/.test(src), `${f}: no dark color-scheme`)
}
const paperCss = readFileSync(join(site, 'css', 'ap-paper-pages.css'), 'utf8')
check(!VOID.test(paperCss), 'ap-paper-pages.css has no #040812')
const sizes = [...paperCss.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)].map((m) => Number(m[1]))
check(
  sizes.every((n) => n >= 14),
  `ap-paper-pages.css respects the 14px floor (${sizes.filter((n) => n < 14)})`,
)

// Step 10c (a): the 404 page's own rules are scoped to main.wrap, so they cannot reach the
// injected footer (which has its own div.wrap) and turn its links into ink buttons.
{
  const src = readFileSync(join(site, '404.html'), 'utf8')
  const style = [...src.matchAll(/<style>([\s\S]*?)<\/style>/g)]
    .map((m) => m[1])
    .join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, '')
  const selectors = [...style.matchAll(/([^{}]+)\{/g)].map((m) => m[1].trim())
  const wrapSel = selectors.filter((sel) => /\.wrap\b/.test(sel))
  check(wrapSel.length >= 5, `404.html: page rules found (${wrapSel.length})`)
  check(
    wrapSel.every((sel) => sel.split(',').every((part) => /\bmain\.wrap\b/.test(part))),
    `404.html: every .wrap rule is scoped to main.wrap (${wrapSel.filter((sel) => !/main\.wrap/.test(sel))})`,
  )
  check(/<main id="main-content" class="wrap">/.test(src), '404.html: main.wrap holds the page')
}

// Step 10c (b): the index-lite redirect keeps the Observatory #lead anchor. Run the inline
// redirect against a stub location and check where it sends each kind of visit.
{
  const { runInNewContext } = await import('node:vm')
  const src = readFileSync(join(site, 'index-lite.html'), 'utf8')
  const script = (src.match(/<script>([\s\S]*?)<\/script>/) || [])[1] || ''
  const go = (hash, search = '') => {
    let sent = ''
    const location = {
      href: 'https://astroprecise.app/index-lite.html' + search + hash,
      search,
      hash,
      replace: (u) => (sent = u),
    }
    runInNewContext(script, { location, URL, URLSearchParams, String })
    return new URL(sent)
  }
  for (const [hash, want] of [
    ['', '#lead'],
    ['#lead', '#lead'],
    ['#LEAD', '#lead'],
    ['#name=Ada&dob=1990-01-01', '#lead'],
    ['#focus=mars', '#focus=mars'],
  ]) {
    const u = go(hash)
    check(
      u.pathname === '/observatory.html' && u.hash === want,
      `index-lite.html: '${hash || '(none)'}' redirects to observatory.html${want} (got ${u.pathname}${u.hash})`,
    )
    check(!/name|dob/.test(u.href), `index-lite.html: '${hash || '(none)'}' drops personal fields`)
  }
  check(go('', '?lite=1').search === '?lite=1', 'index-lite.html: keeps the lite=1 flag')
  check(
    /http-equiv="refresh" content="0;url=observatory\.html#lead"/.test(src),
    'index-lite.html: meta refresh keeps #lead',
  )
  check(/<a href="observatory\.html#lead">/.test(src), 'index-lite.html: fallback link keeps #lead')
}

if (fails.length) {
  for (const m of fails) console.error('FAIL ' + m)
  assert.fail(`test-paper-pages: ${fails.length} failed`)
}
console.log(
  `test-paper-pages: ${passed} passed, 0 failed (${Object.keys(ALLOW).length} pages allowlisted)`,
)
