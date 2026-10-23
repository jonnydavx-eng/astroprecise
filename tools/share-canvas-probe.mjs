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
import { readFileSync } from 'node:fs'
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
    set: (fn) => (handlers.load = fn),
    get: () => handlers.load,
  })
  Object.defineProperty(img, 'onerror', {
    set: (fn) => (handlers.error = fn),
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
