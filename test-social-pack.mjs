/**
 * Step 10b — the social pack (tools/make-mission-control-social.py) is on Paper & Night.
 * Checks the generator source (repo fonts via og_brand, drawn glyphs, no starfield, no prices)
 * and the committed JPEGs (count and exact sizes) without running Python.
 */
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'

const root = new URL('./', import.meta.url)
const src = readFileSync(new URL('tools/make-mission-control-social.py', root), 'utf8')
let passed = 0
const ok = (c, m) => {
  assert.ok(c, m)
  passed++
}

ok(
  /from og_brand import/.test(src),
  'generator uses tools/og/og_brand.py (repo fonts + drawn glyphs)',
)
ok(!/C:\\\\Windows|georgia|consola|ImageFont/i.test(src), 'no installed / Windows fonts')
ok(!/def starfield|radial_glow|VOID\s*=/.test(src), 'no starfield, glow or void ground')
ok(!/£\s*\d/.test(src.replace(/^\s*#.*$/gm, '')), 'no price lines in generated copy')
ok(
  !/[\u2609\u263D\u263E\u263F\u2640\u2642-\u2653\u2726]/u.test(src),
  'no Unicode astrology glyphs or ✦ in the pack',
)
ok(
  /C\["paper"\]/.test(src) && /C\["ink"\]/.test(src) && /C\["goldink"\]|C\["gold"\]/.test(src),
  'paper / ink / copper palette',
)

// JPEG size from the SOF marker
function jpegSize(buf) {
  let i = 2
  while (i < buf.length) {
    if (buf[i] !== 0xff) {
      i++
      continue
    }
    const m = buf[i + 1],
      len = buf.readUInt16BE(i + 2)
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc)
      return [buf.readUInt16BE(i + 7), buf.readUInt16BE(i + 5)]
    i += 2 + len
  }
  return null
}
const want = {
  'avatar-400.jpg': [400, 400],
  'banner-x-1500x500.jpg': [1500, 500],
  'banner-youtube-2560x1440.jpg': [2560, 1440],
  'banner-linkedin-1584x396.jpg': [1584, 396],
  'pin-birth-chart.jpg': [1000, 1500],
  'pin-mission-control.jpg': [1000, 1500],
  'pin-natal-poster.jpg': [1000, 1500],
  'pin-zenith-star.jpg': [1000, 1500],
  'square-big-three.jpg': [1080, 1080],
  'square-birth-time.jpg': [1080, 1080],
  'square-orrery.jpg': [1080, 1080],
  'square-telemetry.jpg': [1080, 1080],
  'square-wear-your-sky.jpg': [1080, 1080],
  'story-brand-close.jpg': [1080, 1920],
  'story-free-chart.jpg': [1080, 1920],
  'story-privacy.jpg': [1080, 1920],
}
const files = readdirSync(new URL('marketing/social/', root))
  .filter((f) => f.endsWith('.jpg'))
  .sort()
ok(files.length === 16 && files.every((f) => want[f]), `16 social assets (${files.length})`)
for (const [f, [w, h]] of Object.entries(want)) {
  const s = jpegSize(readFileSync(new URL('marketing/social/' + f, root)))
  ok(s && s[0] === w && s[1] === h, `${f} is ${w}×${h} (${s})`)
}
for (const f of ['pin-birth-chart.jpg', 'square-your-sky.jpg']) {
  const s = jpegSize(readFileSync(new URL('tools/social-pack/images/' + f, root)))
  ok(s && s[0] >= 1000, `social-pack copy ${f} present (${s})`)
}
console.log(`test-social-pack: ${passed} passed, 0 failed`)
