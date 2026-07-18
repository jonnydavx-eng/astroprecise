/**
 * Honesty tool: sealed demo (plate-demo-001.json / register) vs live Meeus.
 * After re-seal, fingerprints should match (max Δ ~0° within rounding).
 */
import { fingerprint, canonicalString } from '../website/js/plate-fingerprint.js'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const demo = JSON.parse(readFileSync(path.join(root, 'website/data/plate-demo-001.json'), 'utf8'))
const reg = readFileSync(path.join(root, 'website/data/plate-register.jsonl'), 'utf8')
  .split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l))[0]

const src = readFileSync(path.join(root, 'website/js/ephemeris.js'), 'utf8')
const E = new Function('window', src + '\n;return window.AstroEphemeris;')({})

const jd = E.julianDay(2026, 8, 12, 18, 5, 0)
const round3 = (x) => Math.round((((x % 360) + 360) % 360) * 1000) / 1000
const liveBodies = {
  sun: round3(E.sunPosition(jd).lon),
  moon: round3(E.moonPosition(jd).lon),
  mercury: round3(E.mercuryPosition(jd).lon),
  venus: round3(E.venusPosition(jd).lon),
  mars: round3(E.marsPosition(jd).lon),
  jupiter: round3(E.jupiterPosition(jd).lon),
  saturn: round3(E.saturnPosition(jd).lon),
  uranus: round3(E.uranusPosition(jd).lon),
  neptune: round3(E.neptunePosition(jd).lon),
  pluto: round3(E.plutoPosition(jd).lon),
}

const sealedFp = await fingerprint(demo)
const liveFp = await fingerprint({ ...demo, bodies: liveBodies })

console.log('AP-FP-1 demo seal check (engine-sealed tip)')
console.log('register fp:', reg.fp)
console.log('demo json fp:', sealedFp)
console.log('live-engine fp:', liveFp)
console.log('register === demo:', reg.fp === sealedFp)
console.log('demo === live engine:', sealedFp === liveFp)
console.log('')
console.log('body      sealed     live       Δ°')
let max = 0
for (const k of Object.keys(demo.bodies)) {
  const s = demo.bodies[k]
  const L = liveBodies[k]
  let d = Math.abs(L - s)
  if (d > 180) d = 360 - d
  if (d > max) max = d
  console.log(k.padEnd(10), Number(s).toFixed(3).padStart(8), L.toFixed(3).padStart(8), d.toFixed(3).padStart(8))
}
console.log('max Δ°', max.toFixed(3))
if (reg.fp !== sealedFp || sealedFp !== liveFp || max > 0.002) {
  console.error('FAIL plate seal integrity')
  process.exit(1)
}
console.log('PASS engine-sealed demo matches register and live Meeus')
console.log('canonical:', canonicalString(demo).slice(0, 90) + '…')
