// test-paper-legacy-update-browser.mjs — step 10h, the legacy-pages update. Follows
// test-paper-legacy-browser.mjs (same 13 pages, same local server, service workers blocked, no
// network beyond localhost) and checks what the paper skin's blanket background reset broke:
//   - Ephemeris: the sticky jump nav (Tonight / Cast / Shop / Events) and the "Advanced" heading
//     do not overlap at 360, 390 and 1280. Scrolled so the heading sits under the stuck nav (where
//     it showed through "Tonight"), the nav's pixels are the same with the heading hidden or
//     shown, and the jump targets land with their headings clear below the nav;
//   - every bar that stays on screen while the page scrolls (sticky or fixed: jump nav, eclipse
//     playback dock, privacy notice, toasts, skip links once focused) has an opaque ground;
//   - the fills that carry meaning: quiz progress and element dots, the ephemeris resonance
//     meter, the life-path mandala drawn from the visitor's number, the eclipse 3D labels;
//   - the 12px floor for text the pages write later: every inline font size in a page's own
//     markup and scripts, rendered in the page, comes out at 12px or more.
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
    console.error('paper legacy update: no Chrome found (set CHROME_PATH)')
    process.exit(1)
  }
  console.log('paper legacy update: SKIP (no Chrome; set CHROME_PATH)')
  process.exit(0)
}

// The same 13 pages as test-paper-legacy-browser.mjs (checked against it below).
const LEGACY = [
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
const WIDTHS = [360, 390, 1280]

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

{
  const src = readFileSync(new URL('./test-paper-legacy-browser.mjs', import.meta.url), 'utf8')
  const m = src.match(/export const LEGACY = \[([\s\S]*?)\]/)
  const theirs = m ? [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]) : []
  ok(
    JSON.stringify(theirs) === JSON.stringify(LEGACY),
    'same 13 legacy pages as test-paper-legacy-browser.mjs',
    theirs,
  )
}

// Every inline font size a page writes: style="…" in its own HTML and in its local scripts
// (template strings and cssText), as written, so each can be rendered and measured.
const inlineSizes = (file) => {
  const html = readFileSync(path.join(SITE, file), 'utf8')
  const scripts = [...html.matchAll(/<script[^>]+src="(js\/[^"?]+)/g)]
    .map((m) => path.join(SITE, m[1]))
    .filter((f) => existsSync(f) && !/vendor/.test(f))
  const sizes = new Set()
  for (const text of [html, ...scripts.map((f) => readFileSync(f, 'utf8'))]) {
    for (const m of text.matchAll(/font-size:\s*(\d*\.?\d+)(rem|px)\b/g)) {
      const px = m[2] === 'rem' ? Number(m[1]) * 16 : Number(m[1])
      // Only inline sizes: the declaration sits in a style attribute or a cssText string.
      const before = text.slice(Math.max(0, m.index - 400), m.index)
      const inStyle = /style\s*=\s*["'][^"'<>]*$|cssText\s*[+]?=\s*[`'"][^`]*$|style="[^"]*$/.test(
        before,
      )
      if (inStyle && px < 12) sizes.add(m[0].replace(/\s+/g, ' ').replace(': ', ':'))
    }
  }
  return [...sizes]
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

// In-page helpers, installed on window.__pl.
const HELPERS = () => {
  const parse = (s) => {
    // Chrome reports color-mix() grounds as color(srgb r g b / a), channels 0–1.
    const c = String(s).match(/color\(srgb ([^)]+)\)/)
    if (c) {
      const p = c[1].split(/[ /]+/).filter(Boolean).map(Number)
      return { r: p[0] * 255, g: p[1] * 255, b: p[2] * 255, a: p.length > 3 ? p[3] : 1 }
    }
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
  // How opaque a bar is: its own ground composited with its ancestors' up to the page.
  const ground = (el) => {
    let a = 0
    for (let e = el; e && e !== document.body; e = e.parentElement) {
      const c = parse(getComputedStyle(e).backgroundColor)
      if (c) a = a + c.a * (1 - a)
      if (a >= 0.999) break
    }
    return a
  }
  const name = (e) =>
    `${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''}.${
      String(e.className && e.className.baseVal !== undefined ? e.className.baseVal : e.className)
        .trim()
        .split(/\s+/)[0]
    }`
  window.__pl = { parse, over, ratio, ground, name }
}

const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox'],
})
const results = {}
const settle = (page, ms) => page.waitForTimeout(ms)
const instant = (page) =>
  page.addStyleTag({ content: 'html,body{scroll-behavior:auto !important}' })

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
    await ctx.addInitScript(HELPERS)
    await ctx.route('**/*', (route) =>
      route.request().url().startsWith(BASE) ? route.continue() : route.abort(),
    )
    const R = (results[width] = {})

    // ── Ephemeris: the "Advanced" heading and the sticky jump nav ──
    {
      const page = await ctx.newPage()
      await page.goto(`${BASE}/ephemeris.html`, { waitUntil: 'load' })
      await settle(page, 1500)
      await instant(page)
      // Put the heading where the reported shot had it: its top at y 39, under the stuck nav
      // (390: heading y 39–63 under the TONIGHT link at 10–54).
      const geo = await page.evaluate(async () => {
        const nav = document.getElementById('sky-jump-nav')
        const h = document.querySelector('#sky-explore .instrument-eyebrow')
        const at = (y) => {
          window.scrollTo(0, y)
          return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
        }
        await at(0)
        const rest = {
          nav: nav.getBoundingClientRect().toJSON(),
          h: h.getBoundingClientRect().toJSON(),
        }
        await at(Math.round(h.getBoundingClientRect().top + scrollY - 39))
        const n = nav.getBoundingClientRect()
        const r = h.getBoundingClientRect()
        const cx = r.left + Math.min(r.width, 60) / 2
        const cy = (Math.max(r.top, n.top) + Math.min(r.bottom, n.bottom)) / 2
        const hit = document.elementFromPoint(cx, cy)
        return {
          rest,
          nav: [n.left, n.top, n.width, n.height].map(Math.round),
          h: [r.left, r.top, r.width, r.height].map(Math.round),
          stuck: Math.abs(n.top) < 1,
          under: n.bottom > r.top && n.top < r.bottom,
          hitInNav: !!(hit && nav.contains(hit)),
          ground: window.__pl.ground(nav),
          text: h.textContent.trim(),
        }
      })
      R.ephemerisOverlap = geo
      ok(/advanced/i.test(geo.text), `ephemeris ${width}px: "Advanced" heading found`, geo.text)
      ok(
        geo.rest.h.top >= geo.rest.nav.bottom,
        `ephemeris ${width}px: at rest the heading sits below the nav`,
        geo.rest,
      )
      ok(
        geo.stuck && geo.under,
        `ephemeris ${width}px: scrolled, the nav is stuck over the heading's line`,
        geo,
      )
      // The heading must not show in the nav: the nav's pixels are the same with it hidden.
      const clip = { x: 0, y: Math.max(0, geo.nav[1]), width, height: geo.nav[3] }
      const shown = await page.screenshot({ clip })
      await page.evaluate(() => {
        document.querySelector('#sky-explore .instrument-eyebrow').style.visibility = 'hidden'
      })
      const hidden = await page.screenshot({ clip })
      await page.evaluate(() => {
        document.querySelector('#sky-explore .instrument-eyebrow').style.visibility = ''
      })
      const same = Buffer.compare(shown, hidden) === 0
      R.ephemerisOverlap.navPixelsUnchanged = same
      ok(
        same,
        `ephemeris ${width}px: the "Advanced" heading and the "Tonight" nav do not overlap (nav pixels unchanged by the heading)`,
        geo,
      )
      ok(
        geo.hitInNav,
        `ephemeris ${width}px: the nav, not the heading, is on top where they cross`,
        geo,
      )
      ok(geo.ground >= 0.9, `ephemeris ${width}px: jump nav ground is opaque`, geo.ground)
      // Jumps land with the heading clear below the stuck nav.
      const jumps = await page.evaluate(async () => {
        const nav = document.getElementById('sky-jump-nav')
        const out = []
        for (const id of ['sky-tonight', 'sky-explore']) {
          const s = document.getElementById(id)
          s.scrollIntoView({ block: 'start' })
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
          const head = s.querySelector('.instrument-eyebrow, h2')
          const n = nav.getBoundingClientRect()
          const r = head.getBoundingClientRect()
          out.push({ id, navBottom: Math.round(n.bottom), headTop: Math.round(r.top) })
        }
        return out
      })
      R.ephemerisJumps = jumps
      for (const j of jumps)
        ok(
          j.headTop >= j.navBottom,
          `ephemeris ${width}px: #${j.id} jump lands with its heading below the nav`,
          j,
        )
      await page.close()
    }

    // ── Bars that stay on screen, on every page; plus the inline-size floor ──
    for (const file of LEGACY) {
      const page = await ctx.newPage()
      await page.goto(`${BASE}/${file}`, { waitUntil: 'load' })
      await settle(page, 1200)
      await instant(page)
      const sizes = inlineSizes(file)
      const r = await page.evaluate(async (sizes) => {
        window.scrollTo(0, Math.round(document.body.scrollHeight / 3))
        await new Promise((res) => setTimeout(res, 300))
        const bars = []
        for (const e of document.querySelectorAll('body *')) {
          const cs = getComputedStyle(e)
          if (cs.position !== 'sticky' && cs.position !== 'fixed') continue
          if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0)
            continue
          if (e.matches('canvas, [aria-hidden="true"], .scroll-progress, .toast-container'))
            continue
          if (e.parentElement && e.parentElement.closest('[style*="fixed"], .privacy-banner'))
            continue
          const b = e.getBoundingClientRect()
          if (b.width < 100 || b.height < 20) continue
          if (b.bottom <= 0 || b.top >= innerHeight) continue
          if (!e.textContent.trim()) continue
          bars.push({ el: window.__pl.name(e), ground: Number(window.__pl.ground(e).toFixed(3)) })
        }
        // A toast, as js/app.js shows them (e.g. "Continue: …" on arrival from another page).
        if (window.AstroApp && typeof window.AstroApp.showToast === 'function') {
          window.AstroApp.showToast('Continue: Sky', 'Pick up where you left off.', 'info', 60000)
          await new Promise((res) => setTimeout(res, 400))
          const t = document.querySelector('.toast-container .toast')
          if (t)
            bars.push({ el: window.__pl.name(t), ground: Number(window.__pl.ground(t).toFixed(3)) })
          else bars.push({ el: 'toast (not shown)', ground: 0 })
        }
        // Skip links show only once focused.
        for (const e of document.querySelectorAll('.skip-link, .ap-skip, .skip')) {
          e.focus()
          await new Promise((res) => requestAnimationFrame(res))
          const b = e.getBoundingClientRect()
          if (b.bottom > 0 && b.height > 1)
            bars.push({
              el: window.__pl.name(e) + ':focus',
              ground: Number(window.__pl.ground(e).toFixed(3)),
            })
          e.blur()
        }
        const main = document.querySelector('main') || document.body
        const probes = sizes.map((s) => {
          const p = document.createElement('p')
          p.setAttribute('style', s + ';')
          p.textContent = 'probe ' + s
          main.appendChild(p)
          const px = parseFloat(getComputedStyle(p).fontSize)
          p.remove()
          return { style: s, px }
        })
        return { bars, probes }
      }, sizes)
      R[file] = r
      for (const b of r.bars)
        ok(b.ground >= 0.9, `${file} ${width}px: ${b.el} (sticky/fixed) has an opaque ground`, b)
      const small = r.probes.filter((p) => p.px < 12)
      ok(
        small.length === 0,
        `${file} ${width}px: inline font sizes in its markup and scripts render at 12px or more`,
        small,
      )
      await page.close()
    }

    // ── Fills that carry meaning ──
    {
      // Quiz: progress track and fill, element dots.
      const page = await ctx.newPage()
      await page.goto(`${BASE}/quiz.html`, { waitUntil: 'load' })
      await settle(page, 1200)
      await page.click('#aq-start-btn')
      await page.waitForSelector('.aq-option__dot', { state: 'attached', timeout: 10000 })
      // Answer the first question so the progress fill has width.
      await page.locator('.aq-option').first().click()
      await page.waitForFunction(
        () => {
          const f = document.querySelector('.aq-progress__fill')
          return (
            f && f.getBoundingClientRect().width > 0 && document.querySelector('.aq-option__dot')
          )
        },
        null,
        { timeout: 10000 },
      )
      await settle(page, 300)
      const q = await page.evaluate(() => {
        const { parse, ratio, over } = window.__pl
        const track = parse(
          getComputedStyle(document.querySelector('.aq-progress')).backgroundColor,
        )
        const fill = parse(
          getComputedStyle(document.querySelector('.aq-progress__fill')).backgroundColor,
        )
        const paper = { r: 246, g: 243, b: 236, a: 1 }
        const dots = [...document.querySelectorAll('.aq-option__dot')].map((d) => {
          const c = parse(getComputedStyle(d).backgroundColor)
          const border = parse(getComputedStyle(d).borderTopColor)
          return {
            a: c.a,
            bordered: parseFloat(getComputedStyle(d).borderTopWidth) > 0 && border.a > 0,
          }
        })
        return {
          track: track.a,
          fill: fill.a,
          fillVsTrack: Number(ratio(over(fill, paper), over(track, paper)).toFixed(2)),
          dots,
        }
      })
      R.quiz = q
      ok(q.track > 0.5, `quiz ${width}px: progress track is painted`, q)
      ok(
        q.fill > 0.5 && q.fillVsTrack >= 3,
        `quiz ${width}px: progress fill shows against its track (3:1)`,
        q,
      )
      ok(
        q.dots.length >= 2 && q.dots.every((d) => d.a > 0.5 && d.bordered),
        `quiz ${width}px: element dots are painted`,
        q.dots,
      )
      await page.close()
    }
    {
      // Ephemeris resonance meter: the echo scan's markup (js/instrument.js), as the scan writes it.
      const page = await ctx.newPage()
      await page.goto(`${BASE}/ephemeris.html`, { waitUntil: 'load' })
      await settle(page, 1200)
      const m = await page.evaluate(() => {
        const out = document.getElementById('echo-out')
        out.closest('details')?.setAttribute('open', '')
        out.innerHTML = `<div class="echo-window"><div><div class="data-mono" style="font-size:1.05rem;">3 March 2027</div>
          <div style="font-size:0.68rem;color:var(--silver-dim);letter-spacing:0.1em;margin-top:2px;">In chord: Sun · Moon</div></div><div></div>
          <div style="text-align:right;"><div class="resonance-meter"><span style="width:64%"></span></div>
          <div style="font-size:0.66rem;color:var(--gold-pale);margin-top:4px;letter-spacing:0.08em;">64% resonance</div></div></div>`
        const { parse, ratio, over } = window.__pl
        const paper = { r: 246, g: 243, b: 236, a: 1 }
        const track = parse(getComputedStyle(out.querySelector('.resonance-meter')).backgroundColor)
        const fill = parse(
          getComputedStyle(out.querySelector('.resonance-meter span')).backgroundColor,
        )
        const sizes = [...out.querySelectorAll('div')]
          .filter((d) => d.childElementCount === 0 && d.textContent.trim())
          .map((d) => parseFloat(getComputedStyle(d).fontSize))
        return {
          track: track.a,
          fill: fill.a,
          fillVsTrack: Number(ratio(over(fill, paper), over(track, paper)).toFixed(2)),
          sizes,
        }
      })
      R.resonance = m
      ok(
        m.track > 0.5 && m.fill > 0.5 && m.fillVsTrack >= 3,
        `ephemeris ${width}px: resonance meter fill shows against its track (3:1)`,
        m,
      )
      ok(
        m.sizes.every((s) => s >= 12),
        `ephemeris ${width}px: echo-scan result text is 12px or more`,
        m.sizes,
      )
      await page.close()
    }
    {
      // Life path: the mandala drawn from the visitor's number.
      const page = await ctx.newPage()
      await page.goto(`${BASE}/lifepath.html`, { waitUntil: 'load' })
      await settle(page, 1200)
      await page.fill('#lp-birthdate', '1990-07-14')
      await page.click('.lp-submit-btn')
      await page.waitForFunction(() => document.querySelector('.is-mandala-ready'), null, {
        timeout: 10000,
      })
      await settle(page, 600)
      const l = await page.evaluate(() => {
        const c = document.getElementById('lp-mandala-canvas')
        const cs = getComputedStyle(c)
        const b = c.getBoundingClientRect()
        let painted = 0
        try {
          const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data
          for (let i = 3; i < d.length; i += 4) if (d[i] > 0) painted++
        } catch {
          painted = -1 // canvas unreadable
        }
        let op = 1
        for (let a = c; a; a = a.parentElement) op *= Number(getComputedStyle(a).opacity)
        return {
          display: cs.display,
          visibility: cs.visibility,
          w: Math.round(b.width),
          h: Math.round(b.height),
          op,
          painted,
          bg: cs.backgroundColor,
        }
      })
      R.mandala = l
      ok(
        l.display !== 'none' &&
          l.visibility !== 'hidden' &&
          l.w > 40 &&
          l.h > 40 &&
          l.op > 0.3 &&
          l.painted > 100,
        `lifepath ${width}px: the mandala for the visitor's number shows after the reading`,
        l,
      )
      ok(
        window_bg_clear(l.bg),
        `lifepath ${width}px: the mandala sits on the paper hero, no night plate`,
        l.bg,
      )
      await page.close()
    }
    {
      // Eclipse: the Sun / Moon / Earth labels over the 3D canvas.
      const page = await ctx.newPage()
      await page.goto(`${BASE}/eclipse.html`, { waitUntil: 'load' })
      await settle(page, 1500)
      const e = await page.evaluate(() => {
        const { parse, over, ratio } = window.__pl
        const canvas = document.querySelector('.ap-eclipse-live__canvas')
        const plate = parse(getComputedStyle(canvas).backgroundColor)
        return [...document.querySelectorAll('.ap-eclipse-live__body-label')].map((l) => {
          const cs = getComputedStyle(l)
          const chip = over(
            parse(cs.backgroundColor),
            plate.a ? plate : { r: 14, g: 17, b: 22, a: 1 },
          )
          return {
            text: l.textContent.trim(),
            ratio: Number(ratio(parse(cs.color), chip).toFixed(2)),
            chip: cs.backgroundColor,
            plate: getComputedStyle(canvas).backgroundColor,
          }
        })
      })
      R.eclipseLabels = e
      // The playback dock is sticky on phones; its ground must hide the canvas scrolling under it.
      const dock = await page.evaluate(() => {
        const d = document.querySelector('.ap-eclipse-live__dock')
        return d
          ? { pos: getComputedStyle(d).position, ground: Number(window.__pl.ground(d).toFixed(3)) }
          : null
      })
      R.eclipseDock = dock
      ok(dock && dock.ground >= 0.9, `eclipse ${width}px: playback dock has an opaque ground`, dock)
      ok(
        e.length >= 3 && e.every((x) => x.ratio >= 4.5),
        `eclipse ${width}px: 3D labels read against the night canvas (4.5:1)`,
        e,
      )
      await page.close()
    }
    await ctx.close()
  }
  await Promise.all(WIDTHS.map(runWidth))
} finally {
  await browser.close()
  server.close()
}
function window_bg_clear(bg) {
  const m = String(bg).match(/rgba?\(([^)]+)\)/)
  if (!m) return true
  const p = m[1]
    .split(/[ ,/]+/)
    .filter(Boolean)
    .map(Number)
  return (p.length > 3 ? p[3] : 1) === 0
}
if (process.env.PAPER_UPDATE_OUT)
  (await import('fs')).writeFileSync(process.env.PAPER_UPDATE_OUT, JSON.stringify(results, null, 1))
if (fails) {
  console.error(`\ntest-paper-legacy-update-browser: ${fails} failed, ${passed} passed`)
  process.exit(1)
}
console.log(`test-paper-legacy-update-browser: ${passed} passed, 0 failed`)
