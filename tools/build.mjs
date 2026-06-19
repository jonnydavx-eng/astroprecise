/**
 * AstroPrecise static build — produces a deployable `dist/` from `website/`.
 *
 * Stage 1 (this file): faithful minify-in-place. Every file keeps its exact path
 * and name, so all references survive untouched — `<script src>` order, the
 * dynamic loaders (interpretations.js, orrery-*.js), the sw.js precache list,
 * CNAME/_headers/robots/sitemap. Only file *contents* shrink (JS + CSS minified,
 * inline <script>/<style> in HTML minified). This is the safe perf win; bundling
 * + content-hashing layer on top later (see OVERHAUL-PLAN.md Wave 5).
 *
 * Run: npm run build   ->   dist/
 */
import esbuild from 'esbuild'
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, rmSync, copyFileSync } from 'node:fs'
import { join, extname, relative, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(ROOT, 'website')
const OUT = join(ROOT, 'dist')

// Dev-only dirs/files that must NOT ship in the deployable output.
const SKIP_DIRS = new Set(['tools', 'node_modules'])
// Internal dev tools — kept in source for local use, never deployed publicly.
const SKIP_FILES = new Set(['serve-preview.mjs', 'phone-audit.html', 'phone-cosmic-viewer.html'])
const SKIP_EXT = new Set(['.mjs', '.md'])

// --raw: same deployable file selection, but copy verbatim (no minify / no HTML
// transform). Used for the "source" production deploy — byte-identical to website/.
const RAW = process.argv.includes('--raw')

let jsBefore = 0, jsAfter = 0, cssBefore = 0, cssAfter = 0, htmlBefore = 0, htmlAfter = 0, copied = 0

function walk(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const rel = relative(SRC, p)
    if (statSync(p).isDirectory()) {
      if (SKIP_DIRS.has(name)) continue
      out.push(...walk(p))
    } else {
      if (SKIP_FILES.has(name) || SKIP_EXT.has(extname(name))) continue
      out.push({ p, rel })
    }
  }
  return out
}

async function minifyHtml(code) {
  // esbuild has no HTML loader; minify the inline <script> and <style> blocks only,
  // leaving the hand-written markup (and its strict script order) byte-identical.
  const scriptRe = /(<script(?![^>]*\bsrc=)(?![^>]*\btype="application\/(ld\+json)")[^>]*>)([\s\S]*?)(<\/script>)/gi
  const styleRe = /(<style[^>]*>)([\s\S]*?)(<\/style>)/gi
  let result = code
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
        const r = await esbuild.transform(code, { loader: 'js', minify: true, legalComments: 'none' })
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
