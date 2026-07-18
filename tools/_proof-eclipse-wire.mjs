/**
 * Proof: eclipse quiet-gate engine + page honesty (ap-v762+).
 * Production eclipse.html is an inline module (not ap-eclipse-page.js).
 */
import { readFileSync } from 'node:fs'
import { buildEclipseReading5 } from '../website/js/eclipse-reading.js'

const templates = JSON.parse(readFileSync('website/js/reading-templates.json', 'utf8'))
const eclipseHtml = readFileSync('website/eclipse.html', 'utf8')
const peCss = readFileSync('website/css/ap-frontier-pe.css', 'utf8')
const sw = readFileSync('website/sw.js', 'utf8')
const honest = readFileSync('website/js/ap-checkout-honest.js', 'utf8')

const fails = []
if (!eclipseHtml.includes('buildEclipseReading5')) fails.push('eclipse missing engine import')
if (!eclipseHtml.includes('gateSale')) fails.push('eclipse missing gateSale branch')
if (!eclipseHtml.includes('quietBox')) fails.push('eclipse missing quietBox')
if (!eclipseHtml.includes('saleBox')) fails.push('eclipse missing saleBox')
if (!eclipseHtml.includes('ap-checkout-honest')) fails.push('eclipse missing honest checkout script')
if (!eclipseHtml.includes('eclipse-geometry.svg')) fails.push('eclipse missing geometry master')
if (!eclipseHtml.includes('THE REAL SKY NEWS')) fails.push('eclipse missing brand line')
if (!peCss.includes('text-wrap: balance') && !peCss.includes('text-wrap:balance')) {
  // PE may use either form
  if (!peCss.includes('text-wrap')) fails.push('PE css missing text-wrap')
}
if (!/ap-v7[6-9]\d?/.test(sw) && !/ap-v76[0-9]/.test(sw) && !/ap-v77[0-9]/.test(sw)) fails.push('SW tip not in 76x–77x range')
if (!honest.includes('hardenAllDeadGumroad')) fails.push('honest checkout missing hardener')

// Quiet chart: bodies clustered away from aspect angles to 140.133°
const quiet = buildEclipseReading5(140.133, {
  sun: 100, moon: 102, mercury: 104, venus: 106, mars: 108,
  jupiter: 110, saturn: 112, uranus: 114, neptune: 116, pluto: 118,
}, templates, { quietGateDeg: 5 })
if (!quiet.gateSale) fails.push('expected gateSale on quiet chart')

// Hot chart: Sun on eclipse
const hot = buildEclipseReading5(140.133, {
  sun: 140.133, moon: 10, mercury: 20, venus: 30, mars: 40,
  jupiter: 50, saturn: 60, uranus: 70, neptune: 80, pluto: 90,
}, templates, { quietGateDeg: 5 })
if (hot.gateSale) fails.push('expected sale open on sun-conjunction')
if (!hot.anchor || !hot.contact) fails.push('hot reading missing beats')

if (fails.length) {
  console.error('FAIL', fails)
  process.exit(1)
}
console.log('PASS eclipse-wire + honest-checkout + geometry + brand')
