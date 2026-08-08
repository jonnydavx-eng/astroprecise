#!/usr/bin/env node
/**
 * sweep — GET every deployable path on the live host and list anything that is
 * not HTTP 200. The cheap, fast sibling of byte-audit.mjs: it answers "is
 * anything 404/500 on the deployed site?" without comparing content.
 *
 * Author: Kimi (Kimi CLI @ BOOK-T1H4NJ753R), 2026-08-06.
 * Imported into the canonical repo 2026-08-08 by Claude @ BOOK-T1H4NJ753R.
 * Changes on import (the original only ran on Kimi's machine):
 *   - host was hardcoded to https://astroprecise.pages.dev -> now --host, default
 *     https://astroprecise.app (the production custom domain).
 *   - it read a `manifest-slash.json` that existed only in Kimi's scratch folder
 *     -> the path list is now walked out of dist/, with --manifest kept as an
 *     optional override for a {path: hash} JSON map.
 *   - results were written to a fixed scratch path -> now printed to stdout,
 *     with --out <file> optional.
 *
 * Usage:
 *   npm run build
 *   node tools/sweep.mjs
 *   node tools/sweep.mjs --host https://astroprecise.pages.dev
 *
 * Exit code 1 if any path is not 200, so it can gate a release check.
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
const CONC = Number(arg('--concurrency', '12')) || 12

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, acc)
    else acc.push('/' + relative(DIST, p).split(sep).join('/'))
  }
  return acc
}

let paths
if (MANIFEST) {
  paths = Object.keys(JSON.parse(readFileSync(MANIFEST, 'utf8')))
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

const bad = []
let i = 0

async function worker() {
  while (i < paths.length) {
    const p = paths[i++]
    try {
      const r = await fetch(HOST + p, { method: 'GET' })
      if (r.status !== 200) bad.push({ p, status: r.status })
      await r.arrayBuffer().catch(() => {})
    } catch (e) {
      bad.push({ p, status: 'ERR:' + String(e).slice(0, 80) })
    }
  }
}

await Promise.all(Array.from({ length: CONC }, worker))
bad.sort((a, b) => a.p.localeCompare(b.p))

console.log(`host: ${HOST}`)
console.log(`checked: ${paths.length}  bad: ${bad.length}`)
for (const b of bad) console.log(`  ${b.status} ${b.p}`)

if (OUT) {
  mkdirSync(dirname(OUT), { recursive: true })
  writeFileSync(OUT, JSON.stringify(bad, null, 1))
  console.log(`wrote ${OUT}`)
}

process.exit(bad.length ? 1 : 0)
