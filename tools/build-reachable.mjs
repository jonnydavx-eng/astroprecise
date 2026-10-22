/**
 * Build hygiene: decide which deployable files are actually used.
 *
 * Every HTML page and every top-level file (CNAME, robots.txt, sw.js, manifest.json,
 * favicons, verification files) is a root. A file ships when its file name, or its
 * name without the extension, appears in any shipped text file (HTML, JS, CSS, JSON,
 * SVG, XML, TXT, webmanifest). That match is deliberately generous: dynamic loaders
 * that build a URL like 'js/' + name + '.json' still keep their file, and a false
 * keep only costs bytes. Folders whose files are named at runtime (dated content)
 * always ship. Nothing is deleted from the repo; the build lists what it left out.
 */
import { readFileSync } from 'node:fs'
import { extname, basename } from 'node:path'

const TEXT_EXT = new Set(['.html', '.js', '.css', '.json', '.svg', '.xml', '.txt', '.webmanifest'])
// Files in these folders are requested by computed names (dated content, planet textures
// built as name + '_md.webp', element seals), and .well-known must always be served.
export const ALWAYS_SHIP_PREFIXES = ['data/content-bank/', 'assets/', '.well-known/', 'js/vendor/']
// Licence and credit files ship with whatever they cover.
export const ALWAYS_SHIP_NAME = /licen[cs]e|credits/i

export function selectReachable(files) {
  const norm = (rel) => rel.replaceAll('\\', '/')
  const byRel = new Map(files.map((f) => [norm(f.rel), f]))
  const reached = new Set()
  const queue = []
  const reach = (rel) => { if (!reached.has(rel)) { reached.add(rel); queue.push(rel) } }
  for (const rel of byRel.keys()) {
    if (!rel.includes('/') || rel.endsWith('.html') || ALWAYS_SHIP_NAME.test(rel) || ALWAYS_SHIP_PREFIXES.some((p) => rel.startsWith(p))) reach(rel)
  }
  const pending = new Map()
  for (const rel of byRel.keys()) {
    if (reached.has(rel)) continue
    const name = basename(rel)
    const stem = name.slice(0, name.length - extname(name).length)
    pending.set(rel, stem.length >= 3 ? [name, stem] : [name])
  }
  while (queue.length) {
    const rel = queue.shift()
    if (!TEXT_EXT.has(extname(rel).toLowerCase())) continue
    let text
    try { text = readFileSync(byRel.get(rel).p, 'utf8') } catch { continue }
    for (const [cand, needles] of pending) {
      if (needles.some((n) => text.includes(n))) { pending.delete(cand); reach(cand) }
    }
  }
  const keep = files.filter((f) => reached.has(norm(f.rel)))
  const omitted = [...pending.keys()].sort()
  return { keep, omitted }
}
