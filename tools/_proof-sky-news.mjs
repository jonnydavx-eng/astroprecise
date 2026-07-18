import { readFileSync } from 'node:fs'
const src = readFileSync('website/js/ephemeris.js','utf8')
const win = { localStorage: { getItem: () => null } }
const E = new Function('window', src + ';return window.AstroEphemeris;')(win)
win.AstroEphemeris = E
new Function('window', readFileSync('website/js/ap-sky-news.js','utf8'))(win)
const items = win.APSkyNews.buildNews({ limit: 8 })
const fails = []
if (!items.length) fails.push('no items')
if (!items.some((i) => i.kicker === 'MOON')) fails.push('no moon card')
if (!items.every((i) => i.title && i.detail)) fails.push('incomplete cards')
if (fails.length) { console.error('FAIL', fails); process.exit(1) }
console.log('PASS sky-news-build', items.length)
