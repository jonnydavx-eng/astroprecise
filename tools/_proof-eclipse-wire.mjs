import { readFileSync } from 'node:fs'
import { buildEclipseReading5 } from '../website/js/eclipse-reading.js'

const templates = JSON.parse(readFileSync('website/js/reading-templates.json', 'utf8'))
const eclipseHtml = readFileSync('website/eclipse.html', 'utf8')
const peCss = readFileSync('website/css/ap-frontier-pe.css', 'utf8')
const sw = readFileSync('website/sw.js', 'utf8')
const shop = readFileSync('website/shop.html', 'utf8')

const fails = []
if (!eclipseHtml.includes('ap-eclipse-page.js')) fails.push('eclipse missing page module')
if (!eclipseHtml.includes('ecl-form')) fails.push('eclipse missing form')
if (!eclipseHtml.includes('ap-feat-matrix')) fails.push('eclipse missing feature matrix')
if (!peCss.includes('text-wrap: balance')) fails.push('PE css missing text-wrap')
if (!peCss.includes('animation-timeline: view()')) fails.push('PE css missing view timeline')
if (!sw.includes('ap-v755')) fails.push('SW not 755')
if (!shop.includes('ap-frontier-pe.css')) fails.push('shop missing PE css')

// Quiet chart: bodies clustered away from aspect angles to 140.133°
const quiet = buildEclipseReading5(140.133, {
  sun: 100, moon: 102, mercury: 104, venus: 106, mars: 108,
  jupiter: 110, saturn: 112, uranus: 114, neptune: 116, pluto: 118,
}, templates, { quietGateDeg: 5 })
if (!quiet.gateSale) fails.push('expected gateSale on quiet chart')

// Hot chart: Sun on eclipse
const hot = buildEclipseReading5(140.133, { sun: 140.133, moon: 10, mercury: 20, venus: 30, mars: 40, jupiter: 50, saturn: 60, uranus: 70, neptune: 80, pluto: 90 }, templates, { quietGateDeg: 5 })
if (hot.gateSale) fails.push('expected sale open on sun-conjunction')
if (!hot.anchor || !hot.contact) fails.push('hot reading missing beats')

if (fails.length) {
  console.error('FAIL', fails)
  process.exit(1)
}
console.log('PASS eclipse-wire-frontier-pe-755')
