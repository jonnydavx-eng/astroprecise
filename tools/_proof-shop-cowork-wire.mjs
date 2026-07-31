/**
 * Proof: shop ladder + dormant Gumroad + eclipse CTAs (tip ap-v763+).
 */
import { readFileSync } from 'node:fs'
import { isCheckoutReady } from '../website/js/gumroad-unlock.js'
import { buildEclipseReading5 } from '../website/js/eclipse-reading.js'

const shop = readFileSync('website/shop.html', 'utf8')
const app = readFileSync('website/js/app.js', 'utf8')
const sw = readFileSync('website/sw.js', 'utf8')
const bridge = readFileSync('website/js/ap-gumroad-bridge.js', 'utf8')
const eclipse = readFileSync('website/eclipse.html', 'utf8')
const honest = readFileSync('website/js/ap-checkout-honest.js', 'utf8')

const fails = []
// Catalogue is config-driven from app.js (cards rendered by shop-commerce.js)
if (!app.includes("id:           'eclipse-reading'") && !app.includes("id: 'eclipse-reading'")) {
  fails.push('AP_MON missing eclipse-reading product')
}
if (!app.includes("id:           'plate'") && !app.includes("id: 'plate'")) {
  fails.push('AP_MON missing plate product')
}
if (!app.includes('catalogueSkus') && !app.includes("'eclipse-reading'")) {
  fails.push('catalogue missing eclipse-reading slug')
}
if (!/Notify me|NOTIFY ME|notify|dormant|Coming soon|opening soon/i.test(shop + app)) {
  fails.push('shop/app missing dormant/notify language')
}
if (!/ap-v7[6-9][0-9]/.test(sw)) fails.push('SW tip not in 76x–79x')
if (!bridge.includes('REPLACE_ME')) fails.push('bridge missing REPLACE_ME dormant map')
if (!bridge.includes('deep-reading')) fails.push('bridge missing deep-reading alias')
if (!honest.includes('hardenAllDeadGumroad')) fails.push('honest checkout missing')
if (!eclipse.includes('shop.html#eclipse-reading')) fails.push('eclipse missing shop CTA')
if (/gumroad\.com\/l\/REPLACE/i.test(eclipse)) fails.push('eclipse still has dead gumroad buy href')
if (isCheckoutReady('eclipse-reading') !== false) fails.push('gumroad should be dormant')
if (isCheckoutReady('deep-reading') !== false) fails.push('deep-reading should be dormant')
if (typeof buildEclipseReading5 !== 'function') fails.push('eclipse engine missing')

if (fails.length) {
  console.error('FAIL', fails)
  process.exit(1)
}
console.log('PASS shop-cowork-wire + honest-dormant')
