#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs'

const SITEMAP = new URL('../website/sitemap.xml', import.meta.url)
const args = Object.fromEntries(
  process.argv.slice(2).map((arg, index, all) => {
    if (!arg.startsWith('--')) return [arg, true]
    const key = arg.slice(2)
    const next = all[index + 1]
    return [key, next && !next.startsWith('--') ? next : true]
  }),
)

const paths = String(args.paths || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean)

if (paths.length === 0) {
  throw new Error('Usage: update-sitemap-lastmod.mjs --paths page.html[,page.html] [--date YYYY-MM-DD | --check]')
}
if (paths.some((path) => !/^[a-z0-9][a-z0-9/-]*\.html$/i.test(path) || path.includes('..'))) {
  throw new Error('Every sitemap path must be a safe relative .html path')
}

const source = readFileSync(SITEMAP, 'utf8')
const entries = [...source.matchAll(/<url>\s*<loc>https:\/\/astroprecise\.app\/([^<]+)<\/loc>\s*<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>/g)]
if (entries.length === 0) throw new Error('No canonical dated sitemap entries found')

const byPath = new Map(entries.map((match) => [match[1], match[2]]))
for (const path of paths) {
  if (!byPath.has(path)) throw new Error(`Sitemap entry is missing: ${path}`)
}

if (args.check === true) {
  const newest = [...byPath.values()].sort().at(-1)
  const stale = paths.filter((path) => byPath.get(path) !== newest)
  if (stale.length > 0) throw new Error(`Changed sitemap entries are not at the newest lastmod ${newest}: ${stale.join(', ')}`)
  console.log(`PASS sitemap lastmod: ${paths.length} changed pages use newest date ${newest}`)
  process.exit(0)
}

const date = String(args.date || '')
if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
  throw new Error('--date must be a real YYYY-MM-DD date')
}

let next = source
for (const path of paths) {
  const escaped = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = new RegExp(`(<loc>https://astroprecise\\.app/${escaped}</loc>\\s*<lastmod>)\\d{4}-\\d{2}-\\d{2}(</lastmod>)`)
  if (!pattern.test(next)) throw new Error(`Could not update sitemap entry: ${path}`)
  next = next.replace(pattern, `$1${date}$2`)
}
writeFileSync(SITEMAP, next)
console.log(`Updated ${paths.length} sitemap lastmod entries to ${date}`)
