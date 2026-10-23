// test-paper-legacy-browser.mjs — step 10f review round 1. The 13 legacy pages moved to
// Paper & Night, checked in a real browser against the repo's own website/ folder
// (served locally, service workers blocked, no network beyond localhost):
//   - buttons, chips and links meet WCAG contrast (4.5:1, 3:1 for large text) at 390 and 1280,
//     from computed colours composited over the computed backgrounds behind them;
//   - no text under 12px at 360, 390 and 1280 (SVG text included);
//   - no Cinzel or Cormorant Garamond anywhere;
//   - the <html> ground is paper, so iOS overscroll shows no dark band.
// The page is opened as a visitor sees it (several pages skip their scripts on the headless
// audit path), scrolled to the end so late sections render, then measured.
// Needs Chrome (CHROME_PATH or a system Chrome); skips locally without one, fails in CI.
import { chromium } from 'playwright-core'
import { existsSync, readFileSync, statSync } from 'fs'
import { createServer } from 'http'
import path from 'path'
import { fileURLToPath } from 'url'

const SITE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'website')
const CHROME =
  process.env.CHROME_PATH ||
  [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].find(existsSync)
if (!CHROME) {
  if (process.env.CI) {
    console.error('paper legacy browser: no Chrome found (set CHROME_PATH)')
    process.exit(1)
  }
  console.log('paper legacy browser: SKIP (no Chrome; set CHROME_PATH)')
  process.exit(0)
}

export const LEGACY = [
  'accuracy.html',
  'angel-numbers.html',
  'numerology.html',
  'lifepath.html',
  'name-numerology.html',
  'quiz.html',
  'saturn-return.html',
  'solar-return.html',
  'cosmic-story.html',
  'eclipse.html',
  'ephemeris.html',
  'outreach.html',
  'moment.html',
]

// Text allowed under 12px, each with its reason. Only decorative, aria-hidden SVG art.
export const SMALL_EXEMPT = {
  'lifepath.html': [
    {
      selector: 'svg.lp-form-card__art[aria-hidden="true"] text',
      reason:
        "the 1/3/6/9 tick numerals on the form card's aria-hidden background wheel are drawn " +
        'at 55% opacity as ornament; the reading itself is all HTML text at 12px or more',
    },
  ],
}

let fails = 0
let passed = 0
const ok = (cond, msg, got) => {
  if (cond) passed++
  else {
    fails++
    console.error(
      '  FAIL',
      msg,
      got === undefined ? '' : '— got ' + JSON.stringify(got).slice(0, 700),
    )
  }
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain',
  '.xml': 'application/xml',
  '.webmanifest': 'application/manifest+json',
}
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  if (p.endsWith('/')) p += 'index.html'
  const f = path.join(SITE, path.normalize(p))
  if (!f.startsWith(SITE) || !existsSync(f) || !statSync(f).isFile()) {
    res.writeHead(404)
    res.end('not found')
    return
  }
  res.writeHead(200, {
    'content-type': TYPES[path.extname(f)] || 'application/octet-stream',
    'cache-control': 'no-store',
  })
  res.end(readFileSync(f))
})
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const BASE = `http://127.0.0.1:${server.address().port}`

// Measured in the page. Controls are links, buttons and chip / pill / button-classed
// elements; each text node inside one is checked against the colours actually behind it.
const AUDIT = (exempt) => {
  const parse = (s) => {
    const m = String(s).match(/rgba?\(([^)]+)\)/)
    if (!m) return null
    const p = m[1]
      .split(/[ ,/]+/)
      .filter(Boolean)
      .map(Number)
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }
  }
  const over = (top, under) => {
    const a = top.a + under.a * (1 - top.a)
    if (!a) return { r: 0, g: 0, b: 0, a: 0 }
    const mix = (k) => (top[k] * top.a + under[k] * under.a * (1 - top.a)) / a
    return { r: mix('r'), g: mix('g'), b: mix('b'), a }
  }
  const lum = (c) => {
    const f = (v) => {
      v /= 255
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
    }
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b)
  }
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
    return (x + 0.05) / (y + 0.05)
  }
  // The solid colour behind an element: its own and its ancestors' background colours,
  // composited from the page ground up. An image or gradient on the way (a photo plate,
  // a canvas) makes the backdrop unknown, so that text is reported separately.
  const backdrop = (el) => {
    const layers = []
    let unknown = false
    for (let e = el; e; e = e.parentElement) {
      const cs = getComputedStyle(e)
      if (cs.backgroundImage && cs.backgroundImage !== 'none') unknown = true
      const c = parse(cs.backgroundColor)
      if (c && c.a > 0) {
        layers.push(c)
        if (c.a >= 1) break
      }
    }
    let bg = { r: 255, g: 255, b: 255, a: 1 }
    for (let i = layers.length - 1; i >= 0; i--) bg = over(layers[i], bg)
    return { bg, unknown }
  }
  const visible = (e) => {
    const cs = getComputedStyle(e)
    if (cs.visibility === 'hidden' || cs.display === 'none') return false
    const r = e.getBoundingClientRect()
    if (r.width <= 1 || r.height <= 1) return false
    if (e.closest('[hidden],noscript,script,style,[aria-hidden="true"] [hidden]')) return false
    return true
  }
  const name = (e) =>
    `${e.tagName.toLowerCase()}.${
      String(e.className && e.className.baseVal !== undefined ? e.className.baseVal : e.className)
        .trim()
        .split(/\s+/)[0]
    }`
  const CONTROL =
    'a[href], button, [role="button"], summary, [class*="chip"], [class*="pill"], [class*="btn"], [class*="button"]'
  const contrast = []
  const unknown = []
  const small = []
  const fonts = new Set()
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  let n
  let total = 0
  let controls = 0
  while ((n = w.nextNode())) {
    const t = n.textContent.trim()
    if (!t) continue
    const e = n.parentElement
    if (!e || !visible(e)) continue
    const cs = getComputedStyle(e)
    total++
    const fam = cs.fontFamily.split(',')[0].replace(/["']/g, '').trim()
    if (/cinzel|cormorant/i.test(cs.fontFamily)) fonts.add(`${name(e)} ${fam} "${t.slice(0, 20)}"`)
    const fs = parseFloat(cs.fontSize)
    if (fs < 12 && !exempt.some((sel) => e.matches(sel)))
      small.push(`${name(e)} ${fs}px "${t.slice(0, 24)}"`)
    if (!e.closest(CONTROL) || e.closest('svg')) continue
    controls++
    const { bg, unknown: unk } = backdrop(e)
    let fg = parse(cs.color)
    let op = 1
    for (let a = e; a; a = a.parentElement) op *= Number(getComputedStyle(a).opacity)
    fg = { ...fg, a: fg.a * op }
    const r = ratio(over(fg, bg), bg)
    const weight = Number(cs.fontWeight) || 400
    const large = fs >= 24 || (fs >= 18.66 && weight >= 700)
    const need = large ? 3 : 4.5
    const line = `${name(e)} ${r.toFixed(2)}:1 (needs ${need}) ${fs}px "${t.slice(0, 24)}" fg ${cs.color} bg rgb(${[bg.r, bg.g, bg.b].map(Math.round)})`
    if (unk) unknown.push(line)
    else if (r < need - 0.005) contrast.push(line)
  }
  return {
    total,
    controls,
    contrast,
    unknown,
    small,
    fonts: [...fonts],
    htmlBg: getComputedStyle(document.documentElement).backgroundColor,
    pill: parseFloat(getComputedStyle(document.querySelector('.offline-ready-pill')).fontSize),
  }
}

const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox'],
})
const results = {}
try {
  const runWidth = async (width) => {
    const ctx = await browser.newContext({
      viewport: { width, height: width === 1280 ? 900 : 844 },
      deviceScaleFactor: 1,
      serviceWorkers: 'block',
      locale: 'en-GB',
      timezoneId: 'Europe/London',
      reducedMotion: 'reduce',
      userAgent:
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
    })
    await ctx.addInitScript(() =>
      Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false }),
    )
    await ctx.route('**/*', (route) =>
      route.request().url().startsWith(BASE) ? route.continue() : route.abort(),
    )
    for (const file of LEGACY) {
      const page = await ctx.newPage()
      await page.goto(`${BASE}/${file}`, { waitUntil: 'load' })
      await page.waitForTimeout(1500)
      // Scroll slowly enough for every scroll-reveal observer to fire, then let the
      // fade-ins finish: a half-faded card would read as a contrast failure.
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 400) {
          window.scrollTo(0, y)
          await new Promise((r) => setTimeout(r, 120))
        }
        window.scrollTo(0, 0)
        // The "Works offline" pill (js/app.js) only appears once a service worker controls
        // the page; mount it as app.js does so its size and colours are measured too.
        if (!document.querySelector('.offline-ready-pill')) {
          const pill = document.createElement('div')
          pill.className = 'offline-ready-pill is-visible'
          pill.setAttribute('role', 'status')
          pill.textContent = 'Works offline'
          document.body.appendChild(pill)
        }
      })
      await page.waitForTimeout(1200)
      const exempt = (SMALL_EXEMPT[file] || []).map((x) => x.selector)
      const r = await page.evaluate(AUDIT, exempt)
      results[`${file}@${width}`] = r
      ok(r.total > 20, `${file} ${width}px: page rendered (${r.total} text nodes)`, r.total)
      ok(r.small.length === 0, `${file} ${width}px: no text under 12px`, r.small)
      ok(r.pill >= 12, `${file} ${width}px: "Works offline" pill is 12px or more`, r.pill)
      if (width !== 360) {
        ok(r.controls > 3, `${file} ${width}px: controls found (${r.controls})`, r.controls)
        ok(
          r.contrast.length === 0,
          `${file} ${width}px: buttons, chips and links meet WCAG contrast`,
          r.contrast,
        )
      }
      ok(r.fonts.length === 0, `${file} ${width}px: no Cinzel or Cormorant`, r.fonts)
      ok(
        r.htmlBg === 'rgb(246, 243, 236)',
        `${file} ${width}px: <html> ground is paper (overscroll)`,
        r.htmlBg,
      )
      await page.close()
    }
    await ctx.close()
  }
  await Promise.all([360, 390, 1280].map(runWidth))
} finally {
  await browser.close()
  server.close()
}
if (process.env.PAPER_AUDIT_OUT)
  (await import('fs')).writeFileSync(process.env.PAPER_AUDIT_OUT, JSON.stringify(results, null, 1))
if (fails) {
  console.error(`\ntest-paper-legacy-browser: ${fails} failed, ${passed} passed`)
  process.exit(1)
}
console.log(`test-paper-legacy-browser: ${passed} passed, 0 failed`)
