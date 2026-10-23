// Real-browser cold start for the eclipse plate: a fresh Chrome profile with no cache, fonts
// served slowly (as on a first visit), the edition mounted the way the page mounts it. The first
// draw, a redraw and the downloaded PNG must lay out the same, every wheel mark must be drawn in
// its loaded face, and no mark's ink may pass its disc edge.
// Env: AP_BROWSER_PATH / CHROME_PATH (default /usr/bin/google-chrome), ECLIPSE_COLD_OUT (PNGs),
// ECLIPSE_COLD_FONT_DELAY_MS (default 700).
import { createServer } from 'node:http'
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

const ROOT = dirname(fileURLToPath(import.meta.url))
const SITE = join(ROOT, 'website')
const CHROME = process.env.AP_BROWSER_PATH || process.env.CHROME_PATH || '/usr/bin/google-chrome'
const OUT = process.env.ECLIPSE_COLD_OUT || join(tmpdir(), 'eclipse-cold-start')
const FONT_DELAY = Number(process.env.ECLIPSE_COLD_FONT_DELAY_MS || 700)
const E = 140.133
// The stacked-on-the-eclipse chart from tools/share-canvas-probe.mjs.
const NATAL = {
  sun: E,
  moon: 139.5,
  mercury: 140.6,
  venus: 141.2,
  mars: 138.8,
  jupiter: 20,
  saturn: 330,
  uranus: 60,
  neptune: 250,
  pluto: 200,
  asc: 140.9,
  mc: 52,
}

let passed = 0
const ok = (cond, msg) => {
  if (!cond) throw new Error(`test-eclipse-cold-start: ${msg}`)
  passed += 1
}
ok(existsSync(CHROME), `Chrome found at ${CHROME} (set AP_BROWSER_PATH)`)

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
}
const HARNESS = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<link rel="stylesheet" href="/css/fonts.css"></head><body><div id="host"></div>
<script type="module">
import { buildEclipseReading5 } from '/js/eclipse-reading.js?v=944';
import { buildEclipsePlateModel, mountEclipseEdition } from '/js/ap-eclipse-edition-v841.js?v=944';
const natal = ${JSON.stringify(NATAL)};
const templates = await (await fetch('/js/reading-templates.json')).json();
const reading = buildEclipseReading5(${E}, natal, templates, { quietGateDeg: 5 });
const model = buildEclipsePlateModel({ reading, natal, eclipseLongitude: ${E} });
localStorage.setItem('ap-eclipse-edition-unlocked', JSON.stringify({ at: Date.now(), fingerprints: [model.fingerprint] }));
window.__mount = () => mountEclipseEdition(document.getElementById('host'), { reading, natal, eclipseLongitude: ${E} });
window.__mount();
</script></body></html>`

const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  const headers = { 'Cache-Control': 'no-store' }
  if (path === '/__eclipse-cold.html') {
    res.writeHead(200, { ...headers, 'Content-Type': TYPES['.html'] })
    res.end(HARNESS)
    return
  }
  const file = normalize(join(SITE, path))
  if (!file.startsWith(SITE) || !existsSync(file)) {
    res.writeHead(404, headers).end('not found')
    return
  }
  if (path.startsWith('/fonts/')) await new Promise((r) => setTimeout(r, FONT_DELAY))
  res.writeHead(200, {
    ...headers,
    'Content-Type': TYPES[extname(file)] || 'application/octet-stream',
  })
  res.end(readFileSync(file))
})
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const BASE = `http://127.0.0.1:${server.address().port}`

// Records every plate draw: a new render starts when a canvas is sized; marker discs are filled
// full circles 20–120 units across; wheel text is checked against its disc as it is drawn, in
// the face the browser actually used at that moment.
const RECORDER = () => {
  const WHEEL = { x: 1200, y: 1760, tickInner: 598 }
  const renders = []
  let nextId = 1
  const ids = new WeakMap()
  const idOf = (canvas) => {
    if (!ids.has(canvas)) ids.set(canvas, nextId++)
    return ids.get(canvas)
  }
  const current = new WeakMap()
  const renderOf = (canvas) => current.get(canvas)
  const widthDesc = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'width')
  Object.defineProperty(HTMLCanvasElement.prototype, 'width', {
    ...widthDesc,
    set(v) {
      widthDesc.set.call(this, v)
      if (v === 2400) {
        const render = {
          canvas: idOf(this),
          discs: [],
          texts: [],
          overrun: [],
          unloaded: [],
          done: false,
        }
        renders.push(render)
        current.set(this, render)
      }
    },
  })
  const P = CanvasRenderingContext2D.prototype
  const pt = (ctx, x, y) => {
    const m = ctx.getTransform()
    return [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f]
  }
  let pathArcs = []
  const { beginPath, arc, fill, fillText } = P
  P.beginPath = function (...a) {
    pathArcs = []
    return beginPath.apply(this, a)
  }
  P.arc = function (x, y, r, a0, a1, ccw) {
    const [gx, gy] = pt(this, x, y)
    if (r >= 20 && r <= 120 && Math.abs(a1 - a0) >= Math.PI * 2 - 1e-6)
      pathArcs.push({ x: gx, y: gy, r })
    return arc.call(this, x, y, r, a0, a1, ccw)
  }
  P.fill = function (...a) {
    const render = renderOf(this.canvas)
    if (render)
      for (const d of pathArcs)
        if (Math.hypot(d.x - WHEEL.x, d.y - WHEEL.y) < WHEEL.tickInner) render.discs.push(d)
    return fill.apply(this, a)
  }
  P.fillText = function (text, x, y, ...rest) {
    const render = renderOf(this.canvas)
    const out = fillText.call(this, text, x, y, ...rest)
    if (!render) return out
    const [gx, gy] = pt(this, x, y)
    if (/Computed on your device/.test(text)) render.done = true
    if (Math.hypot(gx - WHEEL.x, gy - WHEEL.y) >= WHEEL.tickInner - 40) return out
    // A wheel mark: it belongs to the disc drawn just before it.
    const disc = render.discs[render.discs.length - 1]
    const face = this.font
    render.texts.push([text, face, +gx.toFixed(2), +gy.toFixed(2)])
    if (!document.fonts.check(face, text)) render.unloaded.push(`${text} (${face})`)
    // Its ink, drawn the same way on a scratch canvas.
    const s = document.createElement('canvas')
    s.width = 400
    s.height = 400
    const c = s.getContext('2d')
    c.font = face
    c.textAlign = this.textAlign
    c.textBaseline = this.textBaseline
    c.letterSpacing = this.letterSpacing
    const fx = gx - Math.floor(gx)
    const fy = gy - Math.floor(gy)
    c.fillText(text, 200 + fx, 200 + fy)
    const data = c.getImageData(0, 0, 400, 400).data
    let far = 0
    for (let j = 0; j < 400; j++)
      for (let i = 0; i < 400; i++)
        if (data[(j * 400 + i) * 4 + 3] > 0) {
          const px = Math.floor(gx) + i - 200 + 0.5
          const py = Math.floor(gy) + j - 200 + 0.5
          far = Math.max(far, Math.hypot(px - disc.x, py - disc.y))
        }
    if (!disc || far > disc.r)
      render.overrun.push(
        `${text}: ink ${far.toFixed(1)} from the centre of a disc of ${disc ? disc.r : 0}`,
      )
    return out
  }
  const toBlob = HTMLCanvasElement.prototype.toBlob
  HTMLCanvasElement.prototype.toBlob = function (...a) {
    window.__exported = idOf(this)
    return toBlob.apply(this, a)
  }
  window.__renders = renders
  window.__canvasOf = (id) =>
    [...document.querySelectorAll('canvas')].find((c) => ids.get(c) === id)
  window.__canvases = []
  const create = Document.prototype.createElement
  Document.prototype.createElement = function (tag, ...a) {
    const el = create.call(this, tag, ...a)
    if (String(tag).toLowerCase() === 'canvas') {
      idOf(el)
      window.__canvases.push(el)
    }
    return el
  }
}

const profile = mkdtempSync(join(tmpdir(), 'eclipse-cold-profile-'))
const context = await chromium.launchPersistentContext(profile, {
  executablePath: CHROME,
  headless: true,
  acceptDownloads: true,
  viewport: { width: 1280, height: 900 },
  args: ['--enable-unsafe-swiftshader', '--disable-gpu'],
})
mkdirSync(OUT, { recursive: true })
const hashOf = (render) => {
  const discs = render.discs.map((d) => [+d.x.toFixed(2), +d.y.toFixed(2), d.r])
  const s = JSON.stringify({ discs, texts: render.texts })
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0
  return h.toString(16).padStart(8, '0')
}
try {
  const page = context.pages()[0] || (await context.newPage())
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.addInitScript(RECORDER)
  await page.goto(`${BASE}/__eclipse-cold.html`)
  const waitDone = (n) =>
    page.waitForFunction((k) => window.__renders.filter((r) => r.done).length >= k, n, {
      timeout: 60000,
    })
  await waitDone(1)
  // Redraw, once every face the page asked for has arrived.
  await page.evaluate(() => document.fonts.ready)
  await page.evaluate(() => window.__mount())
  await waitDone(2)
  await page.waitForFunction(
    () => /Ready on this device/.test(document.querySelector('[data-edition-status]').textContent),
    null,
    { timeout: 60000 },
  )
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 60000 }),
    page.click('[data-edition-download]'),
  ])
  const exportFile = join(OUT, 'stacked-eclipse-COLD-export.png')
  await download.saveAs(exportFile)
  const state = await page.evaluate(() => {
    const strip = ({ canvas, discs, texts, overrun, unloaded, done }) => ({
      canvas,
      discs,
      texts,
      overrun,
      unloaded,
      done,
    })
    return { renders: window.__renders.map(strip), exported: window.__exported }
  })
  const pngs = await page.evaluate(() =>
    window.__canvases.filter((c) => c.width === 2400).map((c) => c.toDataURL('image/png')),
  )
  const done = state.renders.filter((r) => r.done)
  const first = done[0]
  const redraw = done[1]
  // The exported file is the last full render of the canvas that was turned into the PNG.
  const exported = state.renders.filter((r) => r.canvas === state.exported && r.done).pop()
  ok(
    first && redraw && exported,
    `first draw, redraw and export all recorded (${done.length} renders)`,
  )
  writeFileSync(
    join(OUT, 'stacked-eclipse-COLD-first-render.png'),
    Buffer.from(pngs[0].split(',')[1], 'base64'),
  )
  writeFileSync(
    join(OUT, 'stacked-eclipse-COLD-second-render.png'),
    Buffer.from(pngs[1].split(',')[1], 'base64'),
  )
  const hashes = { first: hashOf(first), redraw: hashOf(redraw), export: hashOf(exported) }
  const report = { base: BASE, fontDelayMs: FONT_DELAY, hashes, renders: done.length, exportFile }
  for (const [name, r] of [
    ['first', first],
    ['redraw', redraw],
    ['export', exported],
  ]) {
    report[name] = { discs: r.discs.length, unloaded: r.unloaded, overrun: r.overrun }
  }
  writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
  ok(
    first.discs.length === Object.keys(NATAL).length,
    `one disc per point on the first draw (${first.discs.length})`,
  )
  for (const [name, r] of [
    ['first draw', first],
    ['redraw', redraw],
    ['export', exported],
  ]) {
    ok(
      r.unloaded.length === 0,
      `${name}: every wheel mark drawn in its loaded face ${r.unloaded.join('; ')}`,
    )
    ok(r.overrun.length === 0, `${name}: no mark's ink past its disc edge ${r.overrun.join('; ')}`)
  }
  ok(
    hashes.first === hashes.redraw,
    `first draw and redraw lay out the same (${hashes.first} / ${hashes.redraw})`,
  )
  ok(
    hashes.first === hashes.export,
    `first draw and export lay out the same (${hashes.first} / ${hashes.export})`,
  )
  ok(errors.length === 0, `no page errors ${errors.join('; ')}`)
} finally {
  await context.close()
  server.close()
  rmSync(profile, { recursive: true, force: true })
}
console.log(`test-eclipse-cold-start: ${passed} passed, 0 failed`)
