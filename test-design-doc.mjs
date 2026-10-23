// test-design-doc.mjs — 2C step 11 (docs). DESIGN.md describes Paper & Night, not the dark era:
//   - it names website/css/ap-tokens.css as the token source of truth;
//   - every token it lists in the palette table has the same value as ap-tokens.css :root;
//   - the dark-era palette and fonts appear only as retired;
//   - the dark-era art docs live in docs/archive/ with an "Archived" banner, not at the repo root;
//   - step 11b: CLAUDE.md's palette note points to DESIGN.md and ap-tokens.css and no longer
//     presents the void/brass codes as live, and the docs that name the archived art docs
//     (AGENT-HANDOFF-ARCHIVE.md, LICENCES.md, docs/SITE-MERGER-PLAN-2026-07-08.md) use paths
//     that resolve.
// Static checks only; run: node test-design-doc.mjs
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
let pass = 0
let fail = 0
const ok = (cond, msg, got) => {
  if (cond) pass++
  else {
    fail++
    console.log(`  FAIL ${msg}${got === undefined ? '' : ' — got ' + JSON.stringify(got)}`)
  }
}

const design = readFileSync(join(root, 'DESIGN.md'), 'utf8')
const tokens = readFileSync(join(root, 'website/css/ap-tokens.css'), 'utf8')
const rootBlock = tokens.match(/:root\s*\{([\s\S]*?)\n\}/)[1]
const tokenValue = (name) => {
  const m = rootBlock.match(
    new RegExp(`${name.replace(/-/g, '\\-')}\\s*:\\s*(#[0-9a-f]{3,8})`, 'i'),
  )
  return m ? m[1].toUpperCase() : null
}

// 1. Source of truth.
const sot = design.split(/^## /m).find((s) => s.startsWith('Token source of truth')) || ''
ok(
  /website\/css\/ap-tokens\.css/.test(sot),
  'DESIGN.md names website/css/ap-tokens.css as the token source',
)
ok(
  !/ap-palette-2026\.css/.test(sot),
  'DESIGN.md does not name ap-palette-2026.css as the token source',
)
ok(
  /Paper & Night/.test(design.split('\n')[0]),
  'DESIGN.md title says Paper & Night',
  design.split('\n')[0],
)

// 2. Palette rows match the token file.
const rows = [
  ...design.matchAll(/^\|[^|\n]*\|\s*([^|\n]*--ap-[^|\n]*)\|\s*([^|\n]*#[0-9A-Fa-f][^|\n]*)\|/gm),
]
ok(rows.length >= 12, 'DESIGN.md palette table lists the tokens', rows.length)
for (const [, names, values] of rows) {
  const ns = [...names.matchAll(/`(--ap-[a-z0-9-]+)`/g)].map((m) => m[1])
  const vs = [...values.matchAll(/`(#[0-9A-Fa-f]{3,8})`/g)].map((m) => m[1].toUpperCase())
  ns.forEach((n, i) => {
    const v = vs[Math.min(i, vs.length - 1)]
    ok(tokenValue(n) === v, `DESIGN.md ${n} = ap-tokens.css value`, { doc: v, css: tokenValue(n) })
  })
}
for (const n of [
  '--ap-paper',
  '--ap-ink',
  '--ap-copper',
  '--ap-copper-ink',
  '--ap-card',
  '--ap-rule',
]) {
  ok(
    rows.some(([, names]) => names.includes('`' + n + '`')),
    `DESIGN.md palette lists ${n}`,
  )
}
ok(
  /Instrument Serif/.test(design) && /\bInter\b/.test(design),
  'DESIGN.md names Instrument Serif and Inter',
)

// 3. Dark-era values appear only as retired.
for (const old of ['#05080F', '#8FA3B8', '#B86B4A', '#040812', 'Cormorant Garamond', 'Cinzel']) {
  const lines = design.split('\n').filter((l) => l.includes(old))
  ok(
    lines.length > 0 && lines.every((l) => /retired/i.test(l)),
    `DESIGN.md mentions ${old} only as retired`,
    lines,
  )
}

// 4. Dark-era art docs archived.
for (const f of ['ART-DIRECTION-2026.md', 'ART-LIST-2026-08-21.md']) {
  ok(!existsSync(join(root, f)), `${f} is no longer at the repo root`)
  const a = join(root, 'docs/archive', f)
  ok(existsSync(a), `docs/archive/${f} exists`)
  if (existsSync(a)) {
    const first = readFileSync(a, 'utf8').split('\n')[0]
    ok(
      /Archived/.test(first) && /DESIGN\.md/.test(first),
      `docs/archive/${f} opens with the archive banner`,
      first,
    )
  }
}

// 5. CLAUDE.md palette note (step 11b).
const claude = readFileSync(join(root, 'CLAUDE.md'), 'utf8').split('\n')
const start = claude.findIndex((l) => /^- \*\*Palette/.test(l))
ok(start >= 0, 'CLAUDE.md has a palette note')
let end = start + 1
while (end < claude.length && /^\s{2}\S/.test(claude[end])) end++
const note = claude.slice(start, end).join('\n')
ok(/DESIGN\.md/.test(note), 'CLAUDE.md palette note points to DESIGN.md', note)
ok(/Paper & Night/.test(note), 'CLAUDE.md palette note says Paper & Night', note)
ok(
  /website\/css\/ap-tokens\.css/.test(note),
  'CLAUDE.md palette note names website/css/ap-tokens.css',
)
ok(
  !/VOID|BRASS/.test(note),
  'CLAUDE.md palette note does not call void/brass the live tokens',
  note,
)
for (const old of ['#0C1016', '#121826', '#1A2230', '#C2A05E', '#CDAE6A', '#D8B978', '#ECE6D8']) {
  const lines = claude.filter((l) => l.toUpperCase().includes(old))
  ok(lines.length === 0, `CLAUDE.md no longer lists ${old} as a token`, lines)
}
ok(
  !claude.some((l) => /ap-palette-2026\.css/.test(l) && /source of truth/i.test(l)),
  'CLAUDE.md does not name ap-palette-2026.css as the token source of truth',
)

// 6. References to the archived art docs resolve (step 11b).
for (const f of [
  'AGENT-HANDOFF-ARCHIVE.md',
  'LICENCES.md',
  'docs/SITE-MERGER-PLAN-2026-07-08.md',
]) {
  const text = readFileSync(join(root, f), 'utf8')
  const refs = [...text.matchAll(/([\w./-]*)(ART-DIRECTION-2026\.md|ART-LIST-2026-08-21\.md)/g)]
  ok(refs.length > 0, `${f} names an archived art doc`)
  for (const [ref] of refs) {
    const resolves = existsSync(join(root, ref)) || existsSync(join(root, dirname(f), ref))
    ok(resolves, `${f}: ${ref} resolves`)
  }
}
for (const f of ['ART-DIRECTION-2026.md', 'ART-LIST-2026-08-21.md']) {
  const a = join(root, 'docs/archive', f)
  if (!existsSync(a)) continue
  for (const [, href] of readFileSync(a, 'utf8').matchAll(/\]\(([^)]+)\)/g)) {
    ok(existsSync(join(root, 'docs/archive', href)), `docs/archive/${f}: link ${href} resolves`)
  }
}

console.log(`test-design-doc: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
