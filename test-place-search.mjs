// Offline place search: word-start matching (so "Bury" can miss Canterbury and go online),
// Greater Manchester towns present offline, and GB/IE-first ordering for online results.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const ctx = { window: {} }
vm.runInNewContext(readFileSync(new URL('./website/js/ephemeris.js', import.meta.url), 'utf8'), ctx)
vm.runInNewContext(readFileSync(new URL('./website/js/ap-place-match.js', import.meta.url), 'utf8'), ctx)
const { CITIES } = ctx.window.AstroEphemeris
const { matchOffline, sortOnline } = ctx.window.APPlaceMatch
const names = q => matchOffline(q, CITIES).map(c => c.name)
let n = 0
const ok = (cond, msg) => { assert.ok(cond, msg); n++ }

ok(names('Bury').includes('Bury'), 'Bury is offline')
ok(!names('Bury').includes('Canterbury'), 'Bury must not match mid-word in Canterbury')
ok(!names('bury').includes('Canterbury'), 'case-insensitive word start')
ok(names('Heywood')[0] === 'Heywood', 'Heywood first')
for (const t of ['Rochdale', 'Oldham', 'Middleton', 'Bolton', 'Wigan', 'Stockport', 'Salford', 'Stretford', 'Ashton-under-Lyne', 'Leigh', 'Altrincham', 'Sale', 'Prestwich', 'Radcliffe', 'Hyde'])
  ok(names(t).includes(t), `${t} is offline`)
ok(names('lyne').includes('Ashton-under-Lyne'), 'hyphenated word start')
ok(names('york gb').every(x => CITIES.find(c => c.name === x).country === 'GB'), 'trailing country code filters')
ok(names('Manc')[0] === 'Manchester', 'prefix match')
ok(names('xq').length === 0 && names('a').length === 0, 'no matches for nonsense or 1 letter')
const gm = CITIES.filter(c => c.country === 'GB' && c.lat > 53.3 && c.lat < 53.7 && c.lon > -2.75 && c.lon < -1.9)
ok(gm.length >= 40, `Greater Manchester box has ${gm.length} towns`)
const heywood = CITIES.find(c => c.name === 'Heywood')
ok(Math.abs(heywood.lat - 53.59) < 0.02 && Math.abs(heywood.lon + 2.22) < 0.02 && heywood.tz === 'Europe/London', 'Heywood coordinates')
const bury = CITIES.find(c => c.name === 'Bury')
ok(Math.abs(bury.lat - 53.59) < 0.03 && Math.abs(bury.lon + 2.30) < 0.03, 'Bury (Greater Manchester) coordinates')
const dupes = CITIES.map(c => c.name + '|' + c.country).filter((k, i, a) => a.indexOf(k) !== i)
ok(dupes.length === 0, `no duplicate cities: ${dupes}`)
const sorted = sortOnline([{ name: 'Bury', country_code: 'US' }, { name: 'Bury', country_code: 'IE' }, { name: 'Bury', country_code: 'GB' }, { name: 'Bury', country_code: 'FR' }])
ok(sorted.map(r => r.country_code).join() === 'GB,IE,US,FR', 'online results GB first, IE second, provider order after')
ok(sortOnline(undefined).length === 0, 'sortOnline tolerates no results')
console.log(`test-place-search: ${n} passed, 0 failed`)
