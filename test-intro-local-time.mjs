// Home "sky right now" must read in the visitor's local zone, not UTC.
// Forces TZ=Europe/London for the default-zone check (portable: no shell env prefix).
process.env.TZ = 'Europe/London'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const src = readFileSync(new URL('./website/js/ap-intro-next.js', import.meta.url), 'utf8')
const window = {}
const document = { readyState: 'complete', getElementById: () => null, addEventListener() {} }
vm.runInNewContext(src, { window, document, Intl, Date, matchMedia: () => ({ matches: false }) })
const { formatLocalSkyTime } = window.APIntroTime

const summer = new Date('2026-10-22T07:47:00Z')
const winter = new Date('2026-12-01T07:47:00Z')
assert.equal(formatLocalSkyTime(summer, 'Europe/London'), '22 Oct 2026, 08:47 BST')
assert.equal(formatLocalSkyTime(winter, 'Europe/London'), '1 Dec 2026, 07:47 GMT')
assert.match(formatLocalSkyTime(summer, 'Europe/Dublin'), /08:47/)
assert.equal(formatLocalSkyTime(summer), '22 Oct 2026, 08:47 BST')
assert.doesNotMatch(src, /\+' UTC'/, 'home must not append a hard-coded UTC label')
console.log('test-intro-local-time: 5 passed, 0 failed')
