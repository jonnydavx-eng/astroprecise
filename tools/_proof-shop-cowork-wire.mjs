import { readFileSync } from 'node:fs'
import { isCheckoutReady } from '../website/js/gumroad-unlock.js'
import { buildEclipseReading5 } from '../website/js/eclipse-reading.js'

const shop = readFileSync('website/shop.html', 'utf8')
const app = readFileSync('website/js/app.js', 'utf8')
const sw = readFileSync('website/sw.js', 'utf8')
const bridge = readFileSync('website/js/ap-gumroad-bridge.js', 'utf8')
const eclipse = readFileSync('website/eclipse.html', 'utf8')

const fails = []
if (!shop.includes('id="eclipse-reading"')) fails.push('shop missing eclipse-reading card')
if (!shop.includes('id="plate"')) fails.push('shop missing plate card')
if (!shop.includes('Notify me')) fails.push('shop missing Notify me CTAs')
if (!app.includes("id:           'eclipse-reading'")) fails.push('AP_MON missing eclipse-reading')
if (!app.includes("id:           'plate'")) fails.push('AP_MON missing plate')
if (!sw.includes('ap-v754')) fails.push('SW not ap-v754')
if (!bridge.includes('REPLACE_ME')) fails.push('bridge missing REPLACE_ME')
if (!eclipse.includes('shop.html#eclipse-reading')) fails.push('eclipse hub missing shop CTA')
if (isCheckoutReady('eclipse-reading') !== false) fails.push('gumroad should be dormant')
if (typeof buildEclipseReading5 !== 'function') fails.push('eclipse engine missing')

if (fails.length) {
  console.error('FAIL', fails)
  process.exit(1)
}
console.log('PASS shop-cowork-wire-754')
