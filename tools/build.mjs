/**
 * AstroPrecise static build — produces a deployable `dist/` from `website/`.
 *
 * Stage 1 (this file): minify the approved public selection in place. Every
 * included file keeps its exact path and name, so references survive untouched — `<script src>` order, the
 * dynamic loaders (interpretations.js, orrery-*.js), the sw.js precache list,
 * CNAME/_headers/robots/sitemap. Only file *contents* shrink (JS + CSS minified,
 * inline <script>/<style> in HTML minified). This is the safe perf win; bundling
 * + content-hashing layer on top later (see OVERHAUL-PLAN.md Wave 5).
 *
 * Run: npm run build   ->   dist/
 */
import esbuild from 'esbuild'
import { readFileSync, writeFileSync, mkdirSync, readdirSync, lstatSync, rmSync, copyFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join, extname, relative, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(ROOT, 'website')
const OUT = join(ROOT, 'dist')

const TRACKED_WEBSITE_PATHS = new Set(
  execFileSync('git', ['ls-files', '-z', '--', 'website'], { cwd: ROOT, encoding: 'utf8' })
    .split('\0')
    .filter(Boolean)
    .map((path) => path.replace(/^website\//, '')),
)

// Dev-only dirs/files that must NOT ship in the deployable output.
const SKIP_DIRS = new Set(['tools', 'node_modules'])
// Internal dev tools — kept in source for local use, never deployed publicly.
const SKIP_FILES = new Set(['serve-preview.mjs', 'phone-audit.html', 'phone-cosmic-viewer.html'])
const SKIP_EXT = new Set(['.mjs', '.md'])
// Retired storefront modules/assets remain in source history for audit but must
// not enter a v902 deployment. No current HTML loads this cluster.
const RETIRED_PUBLIC_PATHS = new Set([
  'outreach.html',
  'js/outreach-content.js',
  'css/outreach-page.css',
  'js/shop-page-boot.js',
  'js/ap-post-purchase.js',
  'js/shop-wallpaper-lead.js',
  'js/art-theme-library.js',
  'js/shop-art-themes.js',
  'js/shop-curated.js',
  'data/art-themes.json',
  'img/shop/product-gift-box.jpg',
  'img/shop/product-gift-box.svg',
  'img/shop/product-gift-reading.jpg',
  'img/shop/product-gift-reading.svg',
  'img/shop/product-gift-reading.webp',
  'img/shop/product-two-skies.jpg',
  'img/shop/product-two-skies.svg',
  'img/shop/product-two-skies.webp',
])
const PUBLIC_SHOP_ASSETS = new Set([
  'img/shop/numbered-sky-plate-v835.webp',
  'img/shop/v901/natal-sky-print-pack.webp',
  'img/shop/v901/personal-sky-keepsake.webp',
  'img/shop/v901/whole-sky-edition.webp',
  'img/shop/v902/whole-sky-earth.jpg',
  'img/shop/v902/natal-wheel.webp',
  'img/shop/v902/keepsake-book.webp',
])
const FORBIDDEN_CLOUDFLARE_PATHS = new Set([
  '_worker.js',
  '_routes.json',
  '_redirects',
  'functions-filepath-routing-config.json',
  'wrangler.toml',
  'wrangler.json',
  'wrangler.jsonc',
  'wrangler.yaml',
  'wrangler.yml',
])

// --raw: same deployable file selection, but copy verbatim (no minify / no HTML
// transform). Used for the "source" production deploy — byte-identical to website/.
const RAW = process.argv.includes('--raw')

let jsBefore = 0, jsAfter = 0, cssBefore = 0, cssAfter = 0, htmlBefore = 0, htmlAfter = 0, copied = 0

function walk(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const rel = relative(SRC, p)
    const publicRel = rel.replaceAll('\\', '/')
    const stat = lstatSync(p)
    if (stat.isSymbolicLink()) throw new Error(`Deploy source may not contain a symlink or junction: ${publicRel}`)
    const lowerPublicRel = publicRel.toLowerCase()
    if (FORBIDDEN_CLOUDFLARE_PATHS.has(lowerPublicRel) || lowerPublicRel.startsWith('_worker.js/') ||
        lowerPublicRel === 'functions' || lowerPublicRel.startsWith('functions/') ||
        lowerPublicRel === '_worker.bundle' || lowerPublicRel.startsWith('_worker.bundle/')) {
      throw new Error(`Unreviewed Cloudflare executable/control path is forbidden: ${publicRel}`)
    }
    if (stat.isDirectory()) {
      if (SKIP_DIRS.has(name)) continue
      out.push(...walk(p))
    } else if (stat.isFile()) {
      if (SKIP_FILES.has(name) || SKIP_EXT.has(extname(name))) continue
      if (RETIRED_PUBLIC_PATHS.has(publicRel)) continue
      if (publicRel.startsWith('img/shop/') && !PUBLIC_SHOP_ASSETS.has(publicRel)) continue
      if (name.includes('.pre-shell') || name.includes('.pre-redirect') || name.includes('.pre-guard-bak') || /\.bak(?:$|[.-])/.test(name)) continue
      if (!TRACKED_WEBSITE_PATHS.has(publicRel)) throw new Error(`Deploy source is not present in the reviewed Git inventory: ${publicRel}`)
      out.push({ p, rel })
    } else {
      throw new Error(`Deploy source contains a non-regular filesystem entry: ${publicRel}`)
    }
  }
  return out
}

async function minifyHtml(code) {
  // esbuild has no HTML loader; minify the inline <script> and <style> blocks only,
  // leaving the hand-written markup (and its strict script order) byte-identical.
  // Mask comments first: prose can legitimately mention literal HTML tags and
  // must never be mistaken for an executable inline block by the regex pass.
  const scriptRe = /(<script(?![^>]*\bsrc=)(?![^>]*\btype="application\/(ld\+json)")[^>]*>)([\s\S]*?)(<\/script>)/gi
  const styleRe = /(<style[^>]*>)([\s\S]*?)(<\/style>)/gi
  const comments = []
  let result = code.replace(/<!--[\s\S]*?-->/g, (comment) => {
    const token = `__APMIN_HTML_COMMENT_${comments.length}__`
    comments.push([token, comment])
    return token
  })
  const jobs = []
  result = result.replace(scriptRe, (m, open, _t, body, close) => {
    if (!body.trim()) return m
    const token = `__APMIN_JS_${jobs.length}__`
    jobs.push(esbuild.transform(body, { loader: 'js', minify: true }).then(r => [token, r.code]).catch(() => [token, body]))
    return open + token + close
  })
  result = result.replace(styleRe, (m, open, body, close) => {
    if (!body.trim()) return m
    const token = `__APMIN_CSS_${jobs.length}__`
    jobs.push(esbuild.transform(body, { loader: 'css', minify: true }).then(r => [token, r.code]).catch(() => [token, body]))
    return open + token + close
  })
  for (const [token, out] of await Promise.all(jobs)) result = result.replace(token, () => out.trim())
  for (const [token, comment] of comments) result = result.replace(token, () => comment)
  return result
}

async function run() {
  rmSync(OUT, { recursive: true, force: true })
  const files = walk(SRC)
  for (const { p, rel } of files) {
    const dest = join(OUT, rel)
    mkdirSync(dirname(dest), { recursive: true })
    const ext = extname(p).toLowerCase()
    if (RAW) {
      copyFileSync(p, dest); copied++
    } else if (ext === '.js') {
      const code = readFileSync(p, 'utf8')
      jsBefore += code.length
      try {
        // legalComments 'inline' keeps /*! license */ headers (Three.js MIT requires notice retention)
        const r = await esbuild.transform(code, { loader: 'js', minify: true, legalComments: 'inline' })
        writeFileSync(dest, r.code)
        jsAfter += r.code.length
      } catch (e) {
        console.error(`! JS minify failed, copying raw: ${rel} (${e.message})`)
        writeFileSync(dest, code); jsAfter += code.length
      }
    } else if (ext === '.css') {
      const code = readFileSync(p, 'utf8')
      cssBefore += code.length
      try {
        const r = await esbuild.transform(code, { loader: 'css', minify: true })
        writeFileSync(dest, r.code); cssAfter += r.code.length
      } catch (e) {
        console.error(`! CSS minify failed, copying raw: ${rel} (${e.message})`)
        writeFileSync(dest, code); cssAfter += code.length
      }
    } else if (ext === '.html') {
      const code = readFileSync(p, 'utf8')
      htmlBefore += code.length
      const min = await minifyHtml(code)
      if (/__APMIN_(?:JS|CSS|HTML_COMMENT)_\d+__/.test(min)) {
        throw new Error(`HTML minify placeholder leaked: ${rel}`)
      }
      writeFileSync(dest, min); htmlAfter += min.length
    } else {
      copyFileSync(p, dest); copied++
    }
  }
  const kb = n => (n / 1024).toFixed(0) + ' KB'
  const pct = (a, b) => b ? ((1 - a / b) * 100).toFixed(0) + '%' : '0%'
  console.log(`\nAstroPrecise build -> dist/`)
  console.log(`  JS   ${kb(jsBefore)} -> ${kb(jsAfter)}  (-${pct(jsAfter, jsBefore)})`)
  console.log(`  CSS  ${kb(cssBefore)} -> ${kb(cssAfter)}  (-${pct(cssAfter, cssBefore)})`)
  console.log(`  HTML ${kb(htmlBefore)} -> ${kb(htmlAfter)}  (-${pct(htmlAfter, htmlBefore)})`)
  console.log(`  copied ${copied} other assets`)
}

run().catch(e => { console.error(e); process.exit(1) })
