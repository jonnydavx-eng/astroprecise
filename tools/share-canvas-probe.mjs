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
function registerFonts() {
  if (fontsReady) return
  const f = (n) => join(ROOT, 'tools', 'print-fonts', n)
  GlobalFonts.registerFromPath(f('instrument-serif-static-regular.ttf'), 'AP Serif')
  GlobalFonts.registerFromPath(f('instrument-serif-static-italic.ttf'), 'AP Serif')
  for (const w of [400, 500, 600])
    GlobalFonts.registerFromPath(f(`inter-static-${w}.ttf`), 'AP Sans')
  // The instrument cards ask for Georgia. Gelasio is metric-compatible with it, so use it
  // when this machine has it; otherwise the canvas default font stands in.
  for (const g of ['Gelasio-VariableFont_wght.ttf', 'Gelasio-Italic-VariableFont_wght.ttf']) {
    const path = join('/usr/share/fonts/truetype/sand-box/google/Gelasio', g)
    if (existsSync(path)) GlobalFonts.registerFromPath(path, 'Georgia')
  }
  fontsReady = true
}

const sizeOf = (font) => Number((String(font).match(/(\d+(?:\.\d+)?)px/) || [])[1])

/** Wrap a 2D context so fillText calls are recorded (in user units, before scale). */
function recording(ctx, draws) {
  return new Proxy(ctx, {
    get(target, prop) {
      if (prop === 'fillText') {
        return (text, x, y, maxWidth) => {
          const s = String(text)
          if (s.trim())
            draws.push({
              text: s,
              px: sizeOf(target.font),
              font: target.font,
              x,
              y,
              w: target.measureText(s).width,
              align: target.textAlign,
            })
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
    set: (fn) => { handlers.load = fn },
    get: () => handlers.load,
  })
  Object.defineProperty(img, 'onerror', {
    set: (fn) => { handlers.error = fn },
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
export async function probeKeepsakePoster(scenario = 'known', { name = '', includeBirth = true } = {}) {
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
    const serif = /serif/i.test(attr(tag, 'font-family') || '') && !/sans/i.test(attr(tag, 'font-family') || '')
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
  const ev = opts.event || { dt: '1991-03-14T07:42', lat: 53.48, lon: -2.24, tz: 'Europe/London', city: 'Manchester' }
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

/** Paint the eclipse edition plate (js/ap-eclipse-edition-v841.js renderEclipseArtwork). */
export async function probeEclipsePlate(which = 'artwork') {
  registerFonts()
  const templates = JSON.parse(read('js/reading-templates.json'))
  const { buildEclipseReading5 } = await import(new URL('../website/js/eclipse-reading.js', import.meta.url))
  const mod = await import(new URL('../website/js/ap-eclipse-edition-v841.js', import.meta.url))
  const eclipseLongitude = 140.133
  const natal = {
    sun: eclipseLongitude,
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
  const reading = buildEclipseReading5(eclipseLongitude, natal, templates, { quietGateDeg: 5 })
  const model = mod.buildEclipsePlateModel({ reading, natal, eclipseLongitude })
  const draws = []
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
      return recording(real.getContext('2d'), draws)
    },
  }
  if (which === 'disc') mod.renderEclipseDisc(model, canvas, { captions: true })
  else mod.renderEclipseArtwork(model, canvas)
  return { width: canvas.width, height: canvas.height, frame: 0, draws: draws.slice(), canvas: real, model }
}
