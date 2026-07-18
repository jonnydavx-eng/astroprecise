/**
 * Proof: verify page uses shared plate-fingerprint + register matches engine-sealed demo.
 */
import { readFileSync } from 'node:fs'
import { fingerprint, verifyChain, FORMAT_VERSION } from '../website/js/plate-fingerprint.js'

const fails = []
const verifyHtml = readFileSync('website/verify.html', 'utf8')
const regText = readFileSync('website/data/plate-register.jsonl', 'utf8')
const demo = JSON.parse(readFileSync('website/data/plate-demo-001.json', 'utf8'))

if (!verifyHtml.includes("from './js/plate-fingerprint.js'") && !verifyHtml.includes('from "./js/plate-fingerprint.js"')) {
  fails.push('verify.html must import shared plate-fingerprint.js')
}
if (verifyHtml.includes('inlined copy of plate-fingerprint')) fails.push('verify still has inlined fingerprint copy')
if (!verifyHtml.includes('plate-register.jsonl')) fails.push('verify missing register fetch')
if (!verifyHtml.includes('plate-demo-001.json')) fails.push('verify should load plate-demo-001.json')
if (!verifyHtml.includes('ephemeris.js')) fails.push('verify missing ephemeris for engine cross-check')

const rows = regText.split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l))
const chain = verifyChain(rows)
if (!chain.ok) fails.push('register chain broken at ' + chain.brokenAt)

const fp = await fingerprint(demo)
if (fp !== rows[0].fp) fails.push('demo fingerprint !== register row 0: ' + fp + ' vs ' + rows[0].fp)
if (FORMAT_VERSION !== 'AP-FP-1') fails.push('format version drift')

// Engine recompute should match sealed demo within FP-1 rounding (same code path)
const src = readFileSync('website/js/ephemeris.js', 'utf8')
const E = new Function('window', src + '\n;return window.AstroEphemeris;')({})
const jd = E.julianDay(2026, 8, 12, 18, 5, 0)
const live = {
  sun: Math.round((((E.sunPosition(jd).lon % 360) + 360) % 360) * 1000) / 1000,
  moon: Math.round((((E.moonPosition(jd).lon % 360) + 360) % 360) * 1000) / 1000,
}
if (Math.abs(live.sun - demo.bodies.sun) > 0.002) fails.push('demo sun not engine-sealed')
if (Math.abs(live.moon - demo.bodies.moon) > 0.002) fails.push('demo moon not engine-sealed')

if (fails.length) {
  console.error('FAIL', fails)
  process.exit(1)
}
console.log('PASS verify-plate engine-sealed demo', fp.slice(0, 12) + '…')
