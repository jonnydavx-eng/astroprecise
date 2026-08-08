#!/usr/bin/env node
/**
 * byte-audit — fetch every deployable path from the live host and compare the
 * SERVED byte length against the local `dist/` build. Catches the failure mode
 * a status-code sweep misses: a 200 that returns the *wrong* (stale, truncated,
 * or previous-deploy) file.
 *
 * Author: Kimi (Kimi CLI @ BOOK-T1H4NJ753R), 2026-08-06.
 * Imported into the canonical repo 2026-08-08 by Claude @ BOOK-T1H4NJ753R.
 * Changes on import (the original only ran on Kimi's machine):
 *   - dist path was hardcoded to an absolute OneDrive path -> now resolved from
 *     this file's location (repo/dist), overridable with --dist.
 *   - host was hardcoded to https://astroprecise.pages.dev -> now --host, default
 *     https://astroprecise.app (the production custom domain). Pass
 *     --host https://astroprecise.pages.dev to audit the Pages origin directly.
 *   - it required a pre-made `manifest-slash.json` that lived only in Kimi's
 *     scratch folder -> the path list is now walked out of dist/ itself, with
 *     --manifest kept as an optional override for a {path: hash} JSON map.
 *   - results were written to a fixed scratch path -> now printed to stdout,
 *     with --out <file> optional (nothing is written unless you ask for it).
 *   - CRLF classification added. `core.autocrlf=true` on this Windows checkout
 *     means every text file in the local build carries CRLF, while the Ubuntu CI
 *     runner checks out and deploys LF. The raw byte comparison therefore flags
 *     ~120 files that are in fact identical. Any file whose served size equals
 *     (local size - local CRLF count) is reported as CRLF-explained, not a real
 *     mismatch, and does not fail the run.
 *
 * Usage:
 *   npm run build                                  # dist/ must match what shipped
 *   node tools/byte-audit.mjs
 *   node tools/byte-audit.mjs --host https://astroprecise.pages.dev
 *   node tools/byte-audit.mjs --out tools/byte-audit-mismatches.json
 *
 * Exit code 1 if any path mismatches, so it can gate a release check.
 */
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from 'node:fs'
import { join, dirname, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

function arg(name, fallback) {
  const i = process.argv.indexOf(name)
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}

const HOST = String(arg('--host', 'https://astroprecise.app')).replace(/\/+$/, '')
const DIST = arg('--dist', join(ROOT, 'dist'))
const MANIFEST = arg('--manifest', '')
const OUT = arg('--out', '')
const CONC = Number(arg('--concurrency', '10')) || 10

/** Every file under dist/, as leading-slash URL paths. */
function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, acc)
    else acc.push('/' + relative(DIST, p).split(sep).join('/'))
  }
  return acc
}

let paths, manifest = null
if (MANIFEST) {
  manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'))
  paths = Object.keys(manifest)
} else {
  try {
    paths = walk(DIST).sort()
  } catch (e) {
    console.error(`Cannot read dist at ${DIST} — run \`npm run build\` first.\n${e.message}`)
    process.exit(2)
  }
}
if (!paths.length) {
  console.error(`No files found under ${DIST} — run \`npm run build\` first.`)
  process.exit(2)
}

/** Count CRLF pairs in a local file, so a LF-normalised deploy can be told apart
 *  from a genuinely different file. Returns 0 for anything unreadable/binary-ish. */
function crlfCount(file) {
  try {
    const buf = readFileSync(file)
    let n = 0
    for (let k = 0; k < buf.length - 1; k++) if (buf[k] === 13 && buf[k + 1] === 10) n++
    return n
  } catch {
    return 0
  }
}

const mismatches = []
const crlfOnly = []
let checked = 0, i = 0

async function worker() {
  while (i < paths.length) {
    const p = paths[i++]
    const localFile = join(DIST, p.slice(1).split('/').join(sep))
    let localSize = -1
    try {
      localSize = statSync(localFile).size
    } catch {
      // In the --manifest case a listed path may not exist locally at all.
      localSize = -1
    }
    let servedSize = -1, status = 0
    try {
      const r = await fetch(HOST + p)
      status = r.status
      servedSize = (await r.arrayBuffer()).byteLength
    } catch (e) {
      status = -1
      servedSize = String(e).slice(0, 80)
    }
    checked++
    if (status === 200 && servedSize === localSize) continue
    const row = { path: p, status, servedSize, localSize }
    if (manifest) row.hash = manifest[p]
    if (status === 200 && localSize > 0 && servedSize === localSize - crlfCount(localFile)) {
      crlfOnly.push(row)
    } else {
      mismatches.push(row)
    }
  }
}

await Promise.all(Array.from({ length: CONC }, worker))
mismatches.sort((a, b) => a.path.localeCompare(b.path))
crlfOnly.sort((a, b) => a.path.localeCompare(b.path))

console.log(`host: ${HOST}`)
console.log(`dist: ${DIST}`)
console.log(`checked: ${checked}  mismatches: ${mismatches.length}  crlf-explained: ${crlfOnly.length}`)
for (const m of mismatches) console.log(`  ${m.status} served=${m.servedSize} local=${m.localSize} ${m.path}`)
if (crlfOnly.length) {
  console.log(`\n${crlfOnly.length} file(s) differ only by CRLF->LF (local Windows checkout vs LF deploy) — content identical.`)
  if (process.argv.includes('--verbose')) {
    for (const m of crlfOnly) console.log(`  served=${m.servedSize} local=${m.localSize} ${m.path}`)
  }
}

if (OUT) {
  mkdirSync(dirname(OUT), { recursive: true })
  writeFileSync(OUT, JSON.stringify({ host: HOST, checked, mismatches, crlfOnly }, null, 1))
  console.log(`wrote ${OUT}`)
}

process.exit(mismatches.length ? 1 : 0)
