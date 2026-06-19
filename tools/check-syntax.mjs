// Dependency-free syntax gate: runs `node --check` over every website JS module.
// Catches parse errors before they ship (the manual `node --check` sweep the
// handoff log mentions, now a single `npm run check:syntax`). No install needed.
import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const jsDir = join(here, '..', 'website', 'js')

function walk(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    if (name === 'vendor') continue
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...walk(p))
    else if (name.endsWith('.js')) out.push(p)
  }
  return out
}

const files = walk(jsDir)
let failed = 0
for (const f of files) {
  try {
    execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' })
  } catch (err) {
    failed++
    console.error(`✗ ${f}\n${err.stderr?.toString() ?? err.message}`)
  }
}

console.log(`\n${files.length - failed}/${files.length} files passed node --check`)
if (failed) process.exit(1)
