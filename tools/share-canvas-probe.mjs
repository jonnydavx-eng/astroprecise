/**
 * Share-canvas probe (step 10c). Runs the real canvas painters in Node with
 * @napi-rs/canvas and the repo's own fonts (tools/print-fonts), and records every
 * fillText: the text, the font size in card units, the position and the measured
 * width. Used by test-share-canvases.mjs and test-horoscope-card.mjs to check that
 * every line on a share card is at least ~11 CSS px when the card is shown 360 px
 * wide, and that it sits inside the card frame. No browser needed.
 *
 *   probeSkyCard('known' | 'unknown' | 'long' | 'sync' | 'placeholder')
 *   probeMomentCard(moment?)
 *   probeHoroscopeCard(signKey, reading?)
 *
 * Each returns { width, height, frame, draws: [{ text, px, x, y, w, align }], canvas }.
 */
import { existsSync, readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createCanvas, GlobalFonts, Image as NapiImage } from '@napi-rs/canvas'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const WEB = join(ROOT, 'website')
const read = (p) => readFileSync(join(WEB, p), 'utf8')

export const PHONE_CSS_PX = 360
export const MIN_EFFECTIVE_PX = 11

let fontsReady = false
/**
 * The website's own font files, registered under the families the pages and canvas painters
 * ask for. The eclipse plate letters only in these, so its measured boxes are the same on any
 * machine: this box, CI (ubuntu, no extra fonts) or a sandbox with every system font hidden.
 */
export const SITE_FONTS = [
  ['schibsted-grotesk-latin-var.woff2', 'Schibsted Grotesk'],
  ['astro-glyphs.woff2', 'AstroGlyph'],
  ['ibm-plex-mono-normal-400.woff2', 'IBM Plex Mono'],
  ['cormorant-garamond-normal-400.woff2', 'Cormorant Garamond'],
  ['cormorant-garamond-normal-500.woff2', 'Cormorant Garamond'],
  ['cormorant-garamond-normal-600.woff2', 'Cormorant Garamond'],
  ['cormorant-garamond-italic-400.woff2', 'Cormorant Garamond'],
  ['cormorant-garamond-italic-500.woff2', 'Cormorant Garamond'],
]
function registerFonts() {
  if (fontsReady) return
  const f = (n) => join(ROOT, 'tools', 'print-fonts', n)
  GlobalFonts.registerFromPath(f('instrument-serif-static-regular.ttf'), 'AP Serif')
  GlobalFonts.registerFromPath(f('instrument-serif-static-italic.ttf'), 'AP Serif')
  for (const w of [400, 500, 600])
    GlobalFonts.registerFromPath(f(`inter-static-${w}.ttf`), 'AP Sans')
  for (const [file, family] of SITE_FONTS) {
    const ok = GlobalFonts.registerFromPath(join(WEB, 'fonts', file), family)
    if (!ok) throw new Error(`share-canvas-probe: could not load website/fonts/${file}`)
  }
  // The instrument cards ask for Georgia. Gelasio is metric-compatible with it, so use it
  // when this machine has it; otherwise the canvas default font stands in.
  for (const g of ['Gelasio-VariableFont_wght.ttf', 'Gelasio-Italic-VariableFont_wght.ttf']) {
    const path = join('/usr/share/fonts/truetype/sand-box/google/Gelasio', g)
    if (existsSync(path)) GlobalFonts.registerFromPath(path, 'Georgia')
  }
  fontsReady = true
}

const sizeOf = (font) => Number((String(font).match(/(\d+(?:\.\d+)?)px/) || [])[1])

/**
 * Wrap a 2D context so fillText calls are recorded (in user units, before scale).
 * Each draw also carries its ink box in canvas space (`ink`: x0,y0,x1,y1, after the current
 * transform's translation). With `arcs`, every arc() is recorded too ({ x, y, r, full, op } in
 * canvas space; `op` becomes 'fill' and/or 'stroke' when the path is painted). With `segments`,
 * every straight moveTo/lineTo piece that gets stroked is recorded ({ x0, y0, x1, y1, width }).
 */
function recording(ctx, draws, arcs, segments) {
  const toCanvas = (target, x, y) => {
    const m = target.getTransform ? target.getTransform() : { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }
    return [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f]
  }
  let pathArcs = []
  let pathLines = []
  let pen = null
  return new Proxy(ctx, {
    get(target, prop) {
      if (prop === 'beginPath' && (arcs || segments)) {
        return () => {
          pathArcs = []
          pathLines = []
          pen = null
          return target.beginPath()
        }
      }
      if (prop === 'moveTo' && segments) {
        return (x, y) => {
          pen = toCanvas(target, x, y)
          return target.moveTo(x, y)
        }
      }
      if (prop === 'lineTo' && segments) {
        return (x, y) => {
          const p = toCanvas(target, x, y)
          if (pen) pathLines.push({ x0: pen[0], y0: pen[1], x1: p[0], y1: p[1] })
          pen = p
          return target.lineTo(x, y)
        }
      }
      if ((prop === 'fill' || prop === 'stroke') && (arcs || segments)) {
        return (...args) => {
          for (const a of pathArcs) a.op = a.op ? `${a.op}+${prop}` : prop
          if (prop === 'stroke' && segments)
            for (const l of pathLines)
              segments.push({ ...l, width: target.lineWidth, alpha: target.globalAlpha })
          return target[prop](...args)
        }
      }
      if (prop === 'arc' && arcs) {
        return (x, y, r, a0, a1, ccw) => {
          const [gx, gy] = toCanvas(target, x, y)
          const a = { x: gx, y: gy, r, full: Math.abs(a1 - a0) >= Math.PI * 2 - 1e-6, op: '' }
          arcs.push(a)
          pathArcs.push(a)
          pen = null
          return target.arc(x, y, r, a0, a1, ccw)
        }
      }
      if (prop === 'fillText') {
        return (text, x, y, maxWidth) => {
          const s = String(text)
          if (s.trim()) {
            const mt = target.measureText(s)
            const [gx, gy] = toCanvas(target, x, y)
            draws.push({
              text: s,
              px: sizeOf(target.font),
              font: target.font,
              x,
              y,
              w: mt.width,
              align: target.textAlign,
              baseline: target.textBaseline,
              gx,
              gy,
              ink: {
                x0: gx - mt.actualBoundingBoxLeft,
                x1: gx + mt.actualBoundingBoxRight,
                y0: gy - mt.actualBoundingBoxAscent,
                y1: gy + mt.actualBoundingBoxDescent,
              },
            })
          }
          return maxWidth === undefined
            ? target.fillText(text, x, y)
            : target.fillText(text, x, y, maxWidth)
        }
      }
      const v = target[prop]
      return typeof v === 'function' ? v.bind(target) : v
    },
    set(target, prop, value) {
      target[prop] = value
      return true
    },
    has(target, prop) {
      return prop in target
    },
  })
}

/** Image stand-in: decodes the APGlyphs SVG data URLs into a real napi image. */
function ImageShim() {
  const img = new NapiImage()
  const proto = Object.getPrototypeOf(img)
  const desc = Object.getOwnPropertyDescriptor(proto, 'src')
  let handlers = { load: null, error: null }
  Object.defineProperty(img, 'onload', {
    set: (fn) => {
      handlers.load = fn
    },
    get: () => handlers.load,
  })
  Object.defineProperty(img, 'onerror', {
    set: (fn) => {
      handlers.error = fn
    },
    get: () => handlers.error,
  })
  img.addEventListener = (type, fn) => (handlers[type] = fn)
  Object.defineProperty(img, 'src', {
    set(value) {
      const str = String(value)
      const comma = str.indexOf(',')
      const body = str.slice(comma + 1)
      const buf = /;base64,/.test(str.slice(0, comma + 1))
        ? Buffer.from(body, 'base64')
        : Buffer.from(decodeURIComponent(body))
      desc.set.call(img, buf)
      setTimeout(() => {
        if (img.width > 0 && handlers.load) handlers.load()
        else if (handlers.error) handlers.error(new Error('decode'))
      }, 0)
    },
  })
  return img
}

const store = () => {
  const m = new Map()
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  }
}

function baseWindow() {
  const win = {
    console,
    setTimeout,
    clearTimeout,
    Promise,
    URL,
    URLSearchParams,
    Intl,
    Date,
    Math,
    JSON,
    Number,
    String,
    Object,
    Array,
    Error,
    Image: ImageShim,
    encodeURIComponent,
    decodeURIComponent,
    localStorage: store(),
    sessionStorage: store(),
    navigator: {},
  }
  win.window = win
  win.globalThis = win
  return win
}

const settle = (ms = 30) => new Promise((r) => setTimeout(r, ms))

const SAMPLE = {
  known: {
    id: 'p1',
    name: 'Sample Ada',
    birthDate: '1991-03-14',
    birthTime: '07:42',
    tz: 'Europe/London',
    city: 'Manchester, England',
    lat: 53.48,
    lon: -2.24,
  },
  unknown: {
    id: 'p2',
    name: 'Sample Ben',
    birthDate: '1986-11-02',
    timeKnown: false,
    tz: 'Europe/Lisbon',
    city: 'Porto, Portugal',
    lat: 41.15,
    lon: -8.61,
  },
  // Worst case for the layout: a long two-line town, an unknown hour (alert lines, the
  // assumed-hour note) and the longest month name.
  long: {
    id: 'p3',
    name: 'Sample Cleo',
    birthDate: '1977-09-28',
    timeKnown: false,
    tz: 'America/Argentina/Buenos_Aires',
    city: 'San Fernando del Valle de Catamarca, Catamarca Province, Argentina',
    lat: -28.47,
    lon: -65.78,
  },
}

/** Paint the sky card (synchronicity-card.html + js/ap-sky-card.js) for one scenario. */
export async function probeSkyCard(scenario = 'known') {
  registerFonts()
  const page = read('synchronicity-card.html')
  const tag = page.match(/<canvas id="skyCard" width="(\d+)" height="(\d+)"/)
  const width = Number(tag[1]),
    height = Number(tag[2])
  const canvas = createCanvas(width, height)
  const draws = []
  const ctx = recording(canvas.getContext('2d'), draws)
  let frames = 0
  const origFillRect = ctx.fillRect
  void origFillRect
  const win = baseWindow()
  const values = { dob: { value: '' }, tob: { value: '' } }
  const handlers = {}
  const el = {
    skyCard: {
      width,
      height,
      getContext: () =>
        new Proxy(ctx, {
          get(t, p) {
            if (p === 'fillRect')
              return (x, y, w, h) => {
                if (x === 0 && y === 0 && w >= width && h >= height) {
                  frames++
                  draws.length = 0
                }
                return t.fillRect(x, y, w, h)
              }
            return t[p]
          },
          set(t, p, v) {
            t[p] = v
            return true
          },
          has(t, p) {
            return p in t
          },
        }),
      toBlob: () => {},
      toDataURL: () => '',
    },
    skyCardForm: { addEventListener: (type, fn) => (handlers[type] = fn) },
    ...values,
  }
  win.document = {
    readyState: 'complete',
    getElementById: (id) => el[id] || null,
    querySelectorAll: () => [],
    createElement: () => ({ setAttribute() {}, appendChild() {} }),
    addEventListener() {},
  }
  if (scenario === 'sync') {
    win.sessionStorage.setItem(
      'ap-sky-card-handoff',
      JSON.stringify({ livePattern: true, date: '2026-10-23', time: '11:11' }),
    )
  } else if (SAMPLE[scenario]) {
    win.localStorage.setItem('ap_charts', JSON.stringify([SAMPLE[scenario]]))
  }
  for (const f of ['js/ephemeris.js', 'js/ap-mirror-hour.js', 'js/ap-glyphs.js'])
    runInNewContext(read(f), win, { filename: f })
  runInNewContext(read('js/ap-sky-card.js'), win, { filename: 'js/ap-sky-card.js' })
  // boot → placeholder, then (fonts + glyph images) → draw. Wait for the frames to settle.
  let last = -1
  for (let i = 0; i < 200 && (frames !== last || i < 10); i++) {
    last = frames
    await settle(20)
  }
  return { width, height, frame: 32, draws: draws.slice(), canvas }
}

/** Paint the Moment share card (js/ap-moment-share.js) for a sample moment. */
export async function probeMomentCard(moment) {
  registerFonts()
  const win = baseWindow()
  const draws = []
  let last = null
  win.document = {
    querySelectorAll: () => [],
    createElement: () => {
      const proxyCanvas = {
        width: 0,
        height: 0,
        _real: null,
        getContext() {
          this._real = createCanvas(this.width, this.height)
          last = this._real
          return recording(this._real.getContext('2d'), draws)
        },
      }
      return proxyCanvas
    },
  }
  for (const f of ['js/starcatalog.js', 'js/ap-moment-share.js'])
    runInNewContext(read(f), win, { filename: f })
  const S = win.StarCatalog
  const star = S.STARS.find((s) => /vega/i.test(s.name)) || S.STARS[0]
  const m = moment || {
    kind: 'met',
    title: 'The night we met',
    subtitle: 'The sky on the night it mattered',
    dateLabel: '14 June 2019 · 22:40',
    placeLabel: 'Bristol',
    zenith: { star, sepDeg: 1.4, zenithRa: star.ra + 1, zenithDec: star.dec - 1 },
    storyLine:
      'Light has travelled about 7.36 light-years since this night. Nearest zenith star: ' +
      star.name +
      ' (1.4° from exact overhead).',
  }
  win.APMomentShare.paintMomentCard(m)
  const base = win.APMomentShare.CARD_BASE
  return { width: base, height: base, frame: 58.5, draws: draws.slice(), canvas: last }
}

/** Paint the horoscope "Download card" (js/horoscope-page.js buildDailyCard). */
export async function probeHoroscopeCard(signKey = 'sagittarius', reading) {
  registerFonts()
  const win = baseWindow()
  const draws = []
  let last = null
  win.document = {
    readyState: 'loading',
    addEventListener() {},
    querySelectorAll: () => [],
    scripts: [],
    createElement: () => ({
      width: 0,
      height: 0,
      getContext() {
        last = createCanvas(this.width, this.height)
        return recording(last.getContext('2d'), draws)
      },
    }),
  }
  const long =
    'A long day of small decisions asks for patience with yourself and with the people who rely on you, so keep the plan simple and let the details wait.'
  win.Interpretations = {
    getDailyHoroscope: () =>
      reading || {
        todayLine: long,
        useThis:
          'A short list, written down early, and one honest conversation you have been putting off for a week.',
        leaveThis:
          'The urge to answer every message at once, and the habit of measuring the day by what others finish.',
      },
  }
  runInNewContext(read('js/ephemeris.js'), win, { filename: 'js/ephemeris.js' })
  runInNewContext(read('js/ap-glyphs.js'), win, { filename: 'js/ap-glyphs.js' })
  let src = read('js/horoscope-page.js')
  const end = src.lastIndexOf('})();')
  src = src.slice(0, end) + 'window.__apBuildDailyCard = buildDailyCard;\n' + src.slice(end)
  runInNewContext(src, win, { filename: 'js/horoscope-page.js' })
  await win.__apBuildDailyCard(signKey)
  return { width: 1080, height: 1080, frame: 28, draws: draws.slice(), canvas: last }
}

/** Left/right edges of a recorded draw, from its alignment. */
export function extent(d) {
  if (d.align === 'center') return [d.x - d.w / 2, d.x + d.w / 2]
  if (d.align === 'right' || d.align === 'end') return [d.x - d.w, d.x]
  return [d.x, d.x + d.w]
}

/** Effective CSS px of a draw when a card `width` units wide is shown 360 CSS px wide. */
export const effectivePx = (px, width) => (px * PHONE_CSS_PX) / width

// ── Step 10d: the sky-card.html poster, the Instrument cards and the eclipse plate ──

/** Fictional sample charts for the sky-card.html poster (ap-keepsake-next.js). */
const POSTER_SAMPLE = {
  known: {
    id: 'k1',
    name: 'My birth chart',
    birthDate: '1991-03-14',
    birthTime: '11:11',
    timeKnown: true,
    timeAccuracy: 'exact',
    birthCity: 'Manchester, England',
    risingSign: 'Sagittarius',
    positions: {
      Sun: { longitude: 353.4, sign: 'Pisces' },
      Moon: { longitude: 251.2, sign: 'Sagittarius' },
      Mercury: { longitude: 4.2, sign: 'Aries' },
      Venus: { longitude: 26.9, sign: 'Aries' },
      Mars: { longitude: 80.1, sign: 'Gemini' },
      Jupiter: { longitude: 130.8, sign: 'Leo' },
      Saturn: { longitude: 303.6, sign: 'Aquarius' },
      Uranus: { longitude: 282.7, sign: 'Capricorn' },
      Neptune: { longitude: 286.9, sign: 'Capricorn' },
      Pluto: { longitude: 230.1, sign: 'Scorpio' },
    },
  },
  unknown: {
    id: 'k2',
    name: 'My birth chart',
    birthDate: '1977-09-23',
    birthTime: null,
    timeKnown: false,
    timeAccuracy: 'unknown',
    birthCity: 'San Fernando del Valle de Catamarca, Catamarca Province, Argentina',
    positions: {
      Sun: { longitude: 179.6, sign: 'Virgo' },
      Mercury: { longitude: 170.3, sign: 'Virgo' },
      Venus: { longitude: 132.4, sign: 'Leo' },
      Mars: { longitude: 103.2, sign: 'Cancer' },
      Jupiter: { longitude: 84.9, sign: 'Gemini' },
      Saturn: { longitude: 145.1, sign: 'Leo' },
      Uranus: { longitude: 160.2, sign: 'Virgo' },
      Neptune: { longitude: 253.7, sign: 'Sagittarius' },
      Pluto: { longitude: 192.6, sign: 'Libra' },
    },
    uncertainty: {
      assumedLocalTime: '12:00',
      signRanges: { sun: ['Virgo', 'Libra'], moon: ['Sagittarius', 'Capricorn'] },
    },
  },
}

const attr = (tag, name) => {
  const m = tag.match(new RegExp('\\s' + name + '="([^"]*)"'))
  return m ? m[1] : null
}
const unesc = (s) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')

/**
 * Run js/ap-keepsake-next.js (the sky-card.html poster) for one sample and return its
 * SVG and every <text>: { text, px, x, y, w, align, rotate }. Widths are measured with
 * Inter (AP Sans), which is wider than the Arial the poster asks for, so they err large.
 */
export async function probeKeepsakePoster(
  scenario = 'known',
  { name = '', includeBirth = true } = {},
) {
  registerFonts()
  const win = baseWindow()
  const els = {}
  const el = (id) =>
    (els[id] ||= {
      id,
      hidden: false,
      value: '',
      checked: false,
      textContent: '',
      innerHTML: '',
      disabled: false,
      addEventListener() {},
    })
  el('keepsake-name').value = name
  el('include-birth').checked = includeBirth
  win.sessionStorage.setItem('ap-next-sky', JSON.stringify(POSTER_SAMPLE[scenario]))
  win.document = { getElementById: el, createElement: () => ({}) }
  for (const f of ['js/ap-mirror-hour.js', 'js/ap-keepsake-next.js'])
    runInNewContext(read(f), win, { filename: f })
  const svg = el('sky-poster').innerHTML
  const vb = svg.match(/viewBox="0 0 (\d+) (\d+)"/)
  const width = Number(vb[1]),
    height = Number(vb[2])
  const measure = createCanvas(10, 10).getContext('2d')
  const draws = []
  const re = /<text\b([^>]*)>([\s\S]*?)<\/text>/g
  let m
  while ((m = re.exec(svg))) {
    const tag = m[1]
    const text = unesc(m[2].replace(/<[^>]+>/g, ''))
    const px = Number(attr(tag, 'font-size'))
    const ls = Number(attr(tag, 'letter-spacing') || 0)
    const serif =
      /serif/i.test(attr(tag, 'font-family') || '') && !/sans/i.test(attr(tag, 'font-family') || '')
    measure.font = `${px}px ${serif ? '"AP Serif"' : '"AP Sans"'}`
    const w = measure.measureText(text).width + ls * Math.max(0, [...text].length - 1)
    const anchor = attr(tag, 'text-anchor') || 'start'
    const rot = (attr(tag, 'transform') || '').match(/rotate\(([-\d.]+)/)
    draws.push({
      text,
      px,
      x: Number(attr(tag, 'x')),
      y: Number(attr(tag, 'y')),
      w,
      align: anchor === 'middle' ? 'center' : anchor === 'end' ? 'right' : 'left',
      rotate: rot ? Number(rot[1]) : 0,
    })
  }
  return { width, height, frame: 40, draws, svg, status: el('poster-status').textContent }
}

/**
 * Paint the three Instrument share cards (js/instrument.js on ephemeris.html): the
 * light-cone card, the zenith-star card and the daily-sky card. The painters are
 * closure-private, so the probe appends one line that hands them out.
 */
export async function probeInstrumentCard(kind = 'zenith', opts = {}) {
  registerFonts()
  const win = baseWindow()
  const draws = []
  let last = null
  const stub = () => null
  // Inert stand-ins for the page's form and section elements (the boot never runs).
  const stubEl = (id) => ({
    id,
    value: '',
    textContent: '',
    innerHTML: '',
    hidden: false,
    style: {},
    dataset: {},
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    addEventListener() {},
    removeEventListener() {},
    setAttribute() {},
    getAttribute: stub,
    appendChild() {},
    querySelector: stub,
    querySelectorAll: () => [],
  })
  win.document = {
    readyState: 'loading',
    hidden: false,
    addEventListener() {},
    getElementById: (id) => stubEl(id),
    querySelector: stub,
    querySelectorAll: () => [],
    createElement: () => ({
      width: 0,
      height: 0,
      getContext() {
        last = createCanvas(this.width, this.height)
        return recording(last.getContext('2d'), draws)
      },
    }),
  }
  win.AstroApp = { debounce: (fn) => fn, showToast() {} }
  for (const f of ['js/ephemeris.js', 'js/starcatalog.js', 'js/lightcone.js'])
    runInNewContext(read(f), win, { filename: f })
  let src = read('js/instrument.js')
  const end = src.lastIndexOf('})();')
  src =
    src.slice(0, end) +
    'window.__apInstrumentCards = { drawLightConeCard, drawZenithCard, drawDailySkyCard, setEvent: function (e) { event_ = e; } };\n' +
    src.slice(end)
  runInNewContext(src, win, { filename: 'js/instrument.js' })
  const api = win.__apInstrumentCards
  const ev = opts.event || {
    dt: '1991-03-14T07:42',
    lat: 53.48,
    lon: -2.24,
    tz: 'Europe/London',
    city: 'Manchester',
  }
  api.setEvent(ev)
  if (kind === 'lightcone') api.drawLightConeCard(new Date(Date.UTC(1991, 2, 14, 7, 42)))
  else if (kind === 'zenith') api.drawZenithCard()
  else {
    const measured = opts.measured !== false
    api.drawDailySkyCard({
      generatedAt: '2026-09-23T09:00:00Z',
      composite: {
        label: opts.label || 'Steady, with a restless edge',
        summary:
          opts.summary ||
          'Mercury squares your natal Saturn while the Moon crosses your Midheaven, so plans that looked finished ask for one more careful look before you commit. Keep it simple.',
      },
      components: {
        lunar: { illumination: 0.64, waxing: true, phaseName: 'Waxing Gibbous' },
        solarWind: measured ? { speedKmS: 512.4 } : { unavailable: true },
        kp: measured ? { kp: 3.33, band: { label: 'unsettled' } } : { unavailable: true },
        transits: { basis: 'natal' },
      },
    })
  }
  return { width: 1080, height: 1080, frame: 58, draws: draws.slice(), canvas: last }
}

/** Grok's crowded test chart (step 10d review): Asc 12°, Moon 18°, Uranus 28°, Mercury 132°, Sun on the eclipse. */
export const ECLIPSE_CROWDED_NATAL = {
  sun: 140.133,
  moon: 18,
  mercury: 132,
  venus: 95,
  mars: 48,
  jupiter: 210,
  saturn: 320,
  uranus: 28,
  neptune: 355,
  pluto: 250,
  asc: 12,
  mc: 280,
}

/**
 * Paint the eclipse edition plate (js/ap-eclipse-edition-v841.js renderEclipseArtwork) or the
 * captioned disc for a natal chart (longitudes in degrees; the Sun on the eclipse by default).
 * Returns the recorded text draws, arcs and stroked line segments in canvas space.
 */
export async function probeEclipsePlate(which = 'artwork', { natal: natalIn } = {}) {
  registerFonts()
  const templates = JSON.parse(read('js/reading-templates.json'))
  const { buildEclipseReading5 } = await import(
    new URL('../website/js/eclipse-reading.js', import.meta.url)
  )
  const mod = await import(new URL('../website/js/ap-eclipse-edition-v841.js', import.meta.url))
  const eclipseLongitude = 140.133
  const natal = natalIn || ECLIPSE_CROWDED_NATAL
  const reading = buildEclipseReading5(eclipseLongitude, natal, templates, { quietGateDeg: 5 })
  const model = mod.buildEclipsePlateModel({ reading, natal, eclipseLongitude })
  const draws = []
  const arcs = []
  const segments = []
  let real = null
  const canvas = {
    dataset: {},
    _w: 0,
    _h: 0,
    set width(v) {
      this._w = v
    },
    get width() {
      return this._w
    },
    set height(v) {
      this._h = v
    },
    get height() {
      return this._h
    },
    getContext() {
      real = createCanvas(this._w, this._h)
      return recording(real.getContext('2d'), draws, arcs, segments)
    },
  }
  if (which === 'disc') mod.renderEclipseDisc(model, canvas, { captions: true })
  else mod.renderEclipseArtwork(model, canvas)
  return {
    natal,
    // Older plates (main before 10d-eclipse) do not export their wheel geometry.
    wheel: mod.PLATE_WHEEL || { x: 1200, y: 1760, innerR: 248, outerR: 690, tickInner: 640, leaderStart: 274 },
    width: canvas.width,
    height: canvas.height,
    frame: 0,
    draws: draws.slice(),
    arcs: arcs.slice(),
    segments: segments.slice(),
    canvas: real,
    model,
  }
}

const SIGN_MARK_TEXT = new Set(['AR', 'TA', 'GE', 'CN', 'LE', 'VI', 'LI', 'SC', 'SG', 'CP', 'AQ', 'PI'])
const lonAt = (wheel, x, y) =>
  (((180 - (Math.atan2(y - wheel.y, x - wheel.x) * 180) / Math.PI) % 360) + 360) % 360
const angDiff = (a, b) => ((((a - b) % 360) + 540) % 360) - 180
const rectHitsCircle = (b, c, pad = 0) => {
  const nx = Math.max(b.x0, Math.min(c.x, b.x1)),
    ny = Math.max(b.y0, Math.min(c.y, b.y1))
  return Math.hypot(nx - c.x, ny - c.y) < c.r + pad
}
const rectsHit = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1
/**
 * The inked pixels of a recorded fillText, in canvas coordinates (pixel centres), found by
 * drawing the same text with the same font, alignment and baseline on a scratch canvas.
 */
const INK_POINTS = new Map()
function inkPoints(d) {
  const fx = d.gx - Math.floor(d.gx)
  const fy = d.gy - Math.floor(d.gy)
  const key = [d.text, d.font, d.align, d.baseline, fx.toFixed(3), fy.toFixed(3)].join('|')
  let rel = INK_POINTS.get(key)
  if (!rel) {
    const pad = 8
    const left = Math.ceil(d.gx - d.ink.x0) + pad
    const top = Math.ceil(d.gy - d.ink.y0) + pad
    const w = Math.ceil(d.ink.x1 - d.ink.x0) + 2 * pad + 2
    const h = Math.ceil(d.ink.y1 - d.ink.y0) + 2 * pad + 2
    const c = createCanvas(w, h)
    const x = c.getContext('2d')
    x.font = d.font
    x.textAlign = d.align || 'start'
    x.textBaseline = d.baseline || 'alphabetic'
    x.fillStyle = '#000'
    x.fillText(d.text, left + fx, top + fy)
    const px = x.getImageData(0, 0, w, h).data
    rel = []
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++)
        if (px[(j * w + i) * 4 + 3] > 0) rel.push([i + 0.5 - left - fx, j + 0.5 - top - fy])
    INK_POINTS.set(key, rel)
  }
  return rel.map(([x, y]) => [d.gx + x, d.gy + y])
}

const segToPoint = (s, x, y) => {
  const dx = s.x1 - s.x0,
    dy = s.y1 - s.y0
  const len2 = dx * dx + dy * dy
  const t = len2 ? Math.max(0, Math.min(1, ((x - s.x0) * dx + (y - s.y0) * dy) / len2)) : 0
  return Math.hypot(s.x0 + t * dx - x, s.y0 + t * dy - y)
}
const properCross = (a, b) => {
  const cr = (ox, oy, px, py, qx, qy) => (px - ox) * (qy - oy) - (py - oy) * (qx - ox)
  const d1 = cr(a.x0, a.y0, a.x1, a.y1, b.x0, b.y0)
  const d2 = cr(a.x0, a.y0, a.x1, a.y1, b.x1, b.y1)
  const d3 = cr(b.x0, b.y0, b.x1, b.y1, a.x0, a.y0)
  const d4 = cr(b.x0, b.y0, b.x1, b.y1, a.x1, a.y1)
  return d1 * d2 < 0 && d3 * d4 < 0
}

/**
 * Check the eclipse plate's natal wheel from what the real drawing code painted (probeEclipsePlate
 * result). Marker discs are the filled full circles between the inner circle and the tick ring;
 * marker labels are the text ink boxes (and the drawn Sun mark) inside the wheel; sign marks are
 * the AR…PI text boxes; leaders are the thin stroked lines that start at the tip of an
 * exact-degree tick. Returns { problems: { overlap, signBand, leaderUnder, leaderCross,
 * sector, leaders }, discs, labels, leaders, maxShift, shifts }.
 */
export function checkEclipseWheel(r) {
  const W = r.wheel
  const C = (x, y) => Math.hypot(x - W.x, y - W.y)
  const discs = r.arcs.filter(
    (a) =>
      a.full &&
      /fill/.test(a.op) &&
      a.r >= 20 &&
      a.r <= 120 &&
      C(a.x, a.y) > W.innerR &&
      C(a.x, a.y) < W.tickInner,
  )
  const signMarks = r.draws
    .filter((d) => d.ink && SIGN_MARK_TEXT.has(d.text))
    .map((d) => ({ text: d.text, box: d.ink, points: inkPoints(d) }))
  const labels = r.draws
    .filter((d) => d.ink && !SIGN_MARK_TEXT.has(d.text))
    .filter((d) => C((d.ink.x0 + d.ink.x1) / 2, (d.ink.y0 + d.ink.y1) / 2) < W.tickInner)
    .map((d) => ({ text: d.text, box: d.ink, points: inkPoints(d) }))
  // A drawn Sun mark: a stroked (not filled) ring smaller than any disc.
  for (const a of r.arcs)
    if (a.full && a.op === 'stroke' && a.r >= 12 && a.r < 20 + 1e-9 && C(a.x, a.y) < W.tickInner)
      labels.push({
        text: '☉ (drawn)',
        box: { x0: a.x - a.r - 3, x1: a.x + a.r + 3, y0: a.y - a.r - 3, y1: a.y + a.r + 3 },
        // The ring is stroked 6 wide: its outer edge, sampled every 2°.
        points: Array.from({ length: 180 }, (_, k) => [
          a.x + Math.cos((k * Math.PI) / 90) * (a.r + 3),
          a.y + Math.sin((k * Math.PI) / 90) * (a.r + 3),
        ]),
      })
  for (const l of labels) {
    const cx = (l.box.x0 + l.box.x1) / 2,
      cy = (l.box.y0 + l.box.y1) / 2
    l.own =
      discs
        .map((c) => ({ c, d: Math.hypot(c.x - cx, c.y - cy) }))
        .filter((o) => o.d < o.c.r)
        .sort((a, b) => a.d - b.d)[0]?.c || null
  }
  const leaderStart = W.leaderStart
  const leaders = r.segments
    .filter((s) => s.width <= 2 && Math.abs(C(s.x0, s.y0) - leaderStart) < 1.5)
    .map((s) => {
      const own = discs
        .map((c) => ({ c, d: Math.abs(Math.hypot(s.x1 - c.x, s.y1 - c.y) - c.r) }))
        .sort((a, b) => a.d - b.d)[0]
      return { ...s, own: own && own.d < 1.5 ? own.c : null, lon: lonAt(W, s.x0, s.y0) }
    })
  const P = {
    overlap: [],
    signBand: [],
    leaderUnder: [],
    leaderCross: [],
    sector: [],
    leaders: [],
  }
  const at = (c) => `${Math.round(lonAt(W, c.x, c.y))}°`
  for (let i = 0; i < discs.length; i++)
    for (let j = i + 1; j < discs.length; j++) {
      const a = discs[i],
        b = discs[j]
      if (Math.hypot(a.x - b.x, a.y - b.y) < a.r + b.r)
        P.overlap.push(`discs at ${at(a)} and ${at(b)} overlap`)
    }
  for (const l of labels) {
    if (!l.own) P.overlap.push(`"${l.text}" is not inside a disc`)
    else if (!l.points.every(([x, y]) => Math.hypot(x - l.own.x, y - l.own.y) <= l.own.r))
      P.overlap.push(`"${l.text}" spills out of its disc`)
    for (const c of discs)
      if (c !== l.own && l.points.some(([x, y]) => Math.hypot(x - c.x, y - c.y) < c.r))
        P.overlap.push(`"${l.text}" over the disc at ${at(c)}`)
  }
  for (let i = 0; i < labels.length; i++)
    for (let j = i + 1; j < labels.length; j++)
      if (
        rectsHit(labels[i].box, labels[j].box) &&
        labels[i].points.some(([x, y]) =>
          labels[j].points.some(([u, v]) => Math.abs(x - u) < 1 && Math.abs(y - v) < 1),
        )
      )
        P.overlap.push(`"${labels[i].text}" / "${labels[j].text}"`)
  const owners = labels.filter((l) => l.own).map((l) => l.own)
  for (const c of discs) {
    const n = owners.filter((o) => o === c).length
    if (n !== 1) P.overlap.push(`disc at ${at(c)} holds ${n} labels`)
  }
  for (const m of signMarks) {
    for (const c of discs)
      if (rectHitsCircle(m.box, c)) P.signBand.push(`sign mark ${m.text} under the disc at ${at(c)}`)
    for (const l of labels)
      if (rectsHit(m.box, l.box)) P.signBand.push(`sign mark ${m.text} under "${l.text}"`)
  }
  for (const c of discs) {
    const mine = leaders.filter((s) => s.own === c)
    if (mine.length !== 1) P.leaders.push(`disc at ${at(c)} has ${mine.length} leaders`)
  }
  for (const s of leaders) {
    if (!s.own) P.leaders.push(`leader from ${s.lon.toFixed(1)}° ends at no disc`)
    for (const c of discs)
      if (c !== s.own && segToPoint(s, c.x, c.y) < c.r)
        P.leaderUnder.push(`leader from ${s.lon.toFixed(1)}° runs under the disc at ${at(c)}`)
  }
  for (let i = 0; i < leaders.length; i++)
    for (let j = i + 1; j < leaders.length; j++)
      if (properCross(leaders[i], leaders[j]))
        P.leaderCross.push(
          `leaders from ${leaders[i].lon.toFixed(1)}° and ${leaders[j].lon.toFixed(1)}° cross`,
        )
  // Sector: each disc's true longitude is its leader's start (or, with no leaders, the
  // nearest natal longitude to the disc). Its centre must stay in that sign's 30° sector.
  const natal = Object.values(r.natal || {}).map(Number)
  const shifts = []
  for (const c of discs) {
    const shown = lonAt(W, c.x, c.y)
    const leader = leaders.find((s) => s.own === c)
    let truth = leader ? leader.lon : shown
    const exact = natal.sort((a, b) => Math.abs(angDiff(a, truth)) - Math.abs(angDiff(b, truth)))[0]
    if (exact != null && Math.abs(angDiff(exact, truth)) < 0.05) truth = ((exact % 360) + 360) % 360
    const shift = angDiff(shown, truth)
    shifts.push({ truth, shown, shift })
    const sign = Math.floor(truth / 30)
    const lo = sign * 30
    const into = truth - lo + shift
    if (into < 0 || into >= 30)
      P.sector.push(
        `disc for ${truth.toFixed(1)}° (${SIGN_NAMES[sign]}) drawn at ${shown.toFixed(1)}° (${SIGN_NAMES[Math.floor(shown / 30) % 12]})`,
      )
  }
  const maxShift = shifts.reduce((m, s) => Math.max(m, Math.abs(s.shift)), 0)
  return { problems: P, discs, labels, leaders, signMarks, maxShift, shifts }
}
const SIGN_NAMES = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
]

/** Wheel test charts (longitudes in degrees; the Sun sits on the eclipse point, 140.133°). */
export const ECLIPSE_LONGITUDE = 140.133
const SEEDED_CHARTS = 24
let ephemerisCache = null
/** The site's ephemeris (website/js/ephemeris.js), loaded the way the fulfilment tools load it. */
function loadEphemeris() {
  if (ephemerisCache) return ephemerisCache
  const win = {}
  new Function('window', 'console', 'document', read('js/ephemeris.js'))(win, console, undefined)
  ephemerisCache = win.AstroEphemeris
  return ephemerisCache
}

export async function eclipseWheelCharts() {
  const E = ECLIPSE_LONGITUDE
  const charts = [
    ['crowded (Asc 12, Moon 18, Uranus 28, Mercury 132, Sun on the eclipse)', ECLIPSE_CROWDED_NATAL],
    [
      'normal',
      { sun: E, moon: 200, mercury: 162, venus: 100, mars: 60, jupiter: 20, saturn: 330, uranus: 290, neptune: 250, pluto: 225, asc: 175, mc: 85 },
    ],
    [
      'five bodies within 9° (61–70°)',
      { sun: E, moon: 61, venus: 63, mars: 65.5, jupiter: 68, saturn: 70, mercury: 150.5, uranus: 20, neptune: 330, pluto: 250, asc: 200, mc: 105 },
    ],
    [
      'four planets within 10°',
      { sun: E, moon: 260, mercury: 100, venus: 103, mars: 106, jupiter: 109, saturn: 330, uranus: 20, neptune: 50, pluto: 210, asc: 300, mc: 190 },
    ],
    [
      'stacked on the eclipse point',
      { sun: E, moon: 139.5, mercury: 140.6, venus: 141.2, mars: 138.8, jupiter: 20, saturn: 330, uranus: 60, neptune: 250, pluto: 200, asc: 140.9, mc: 52 },
    ],
    [
      'stellium (Sun to Pluto inside 30°)',
      { sun: E, moon: 128, mercury: 131, venus: 134, mars: 137, jupiter: 144, saturn: 147, uranus: 150, neptune: 153, pluto: 156, asc: 300, mc: 210 },
    ],
    [
      'cluster straddling a sign boundary (27°–33°)',
      { sun: E, moon: 27, mercury: 28.5, venus: 30, mars: 31.2, jupiter: 33, saturn: 330, uranus: 270, neptune: 250, pluto: 200, asc: 89, mc: 182 },
    ],
  ]
  // Seeded real charts: random birth moments (1940–2009, any time of day, latitudes 40°S–60°N)
  // run through the site's own ephemeris, keeping only bunched ones, where some sign holds five
  // or more of the twelve points, and the eclipse touches one of them. (Uniform random bunches put 7–9 points in one sign far more
  // often than real skies do, so real positions are used instead.)
  const ephemeris = loadEphemeris()
  const templates = JSON.parse(read('js/reading-templates.json'))
  const { buildEclipseReading5 } = await import(new URL('../website/js/eclipse-reading.js', import.meta.url))
  const mod = await import(new URL('../website/js/ap-eclipse-edition-v841.js', import.meta.url))
  // Only charts the edition would actually draw: the eclipse must make a direct contact.
  const drawable = (natal) =>
    mod.buildEclipsePlateModel({
      reading: buildEclipseReading5(E, natal, templates, { quietGateDeg: 5 }),
      natal,
      eclipseLongitude: E,
    })
  let seed = 20261023
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648
  const keys = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'asc', 'mc']
  for (let i = 1; i <= SEEDED_CHARTS; ) {
    const when = [1940 + Math.floor(rnd() * 70), 1 + Math.floor(rnd() * 12), 1 + Math.floor(rnd() * 28), Math.floor(rnd() * 24), Math.floor(rnd() * 60)]
    const lat = -40 + rnd() * 100
    const lon = -120 + rnd() * 240
    const chart = ephemeris.calculateNatalChart(...when, lat, lon, 'placidus')
    const natal = Object.fromEntries(keys.map((k) => [k, chart.positions[k].longitude]))
    const perSign = {}
    for (const k of keys) perSign[Math.floor(natal[k] / 30)] = (perSign[Math.floor(natal[k] / 30)] || 0) + 1
    const busiest = Math.max(...Object.values(perSign))
    if (busiest < 5 || !drawable(natal)) continue
    const [y, mo, d, h, mi] = when
    charts.push([`seeded bunched chart #${i} (${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')} ${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}, ${busiest} points in one sign)`, natal])
    i += 1
  }
  return charts
}
