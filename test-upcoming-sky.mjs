/**
 * Upcoming sky events (website/js/sky-upcoming.js) — accuracy and provenance.
 * Run: node test-upcoming-sky.mjs   (exit 0 = pass)
 *
 * Every expected value below is a PUBLISHED reference, copied by hand from the
 * cited source (retrieved 2026-10-23). The module itself holds no event list;
 * these values only check what the engine computes.
 *
 * Sources and tolerances:
 *  - Moon phases: US Naval Observatory, Astronomical Applications API,
 *    https://aa.usno.navy.mil/api/moon/phases/year?year=2026 (and 2027), UT.
 *    Tolerance 5 minutes.
 *  - Equinoxes and solstices: USNO API https://aa.usno.navy.mil/api/seasons?year=2026
 *    (and 2027), UT. Tolerance 15 minutes.
 *  - Eclipses: NASA GSFC eclipse catalogue (F. Espenak),
 *    https://eclipse.gsfc.nasa.gov/SEdecade/SEdecade2021.html and
 *    https://eclipse.gsfc.nasa.gov/LEdecade/LEdecade2021.html. Times are of
 *    greatest eclipse in TD (TD − UT ≈ 69 s in 2026–27). Date and type must
 *    match exactly; time within 30 minutes.
 *  - Mercury stations: JPL Horizons (target 199, geocentric 500@399, observer
 *    ecliptic-of-date longitude ObsEcLon, 1 h steps; turning point fitted by a
 *    parabola), https://ssd.jpl.nasa.gov/api/horizons.api. Tolerance 6 hours
 *    (a station is a slow turn; the page shows it as approximate).
 */
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const here = dirname(fileURLToPath(import.meta.url))
const FILES = ['website/js/ephemeris.js', 'website/js/weekly-sky.js', 'website/js/sky-upcoming.js']
function load(patch) {
  const win = {}
  for (const f of FILES) {
    new Function('window', 'console', readFileSync(join(here, f), 'utf8'))(win, console)
    if (patch && f.endsWith('ephemeris.js')) patch(win.AstroEphemeris)
  }
  return win
}
const win = load()
const U = win.UpcomingSky

let pass = 0,
  fail = 0
const rows = []
const ok = (name, cond, got) => {
  if (cond) pass++
  else {
    fail++
    console.log(`  ✗ ${name}${got !== undefined ? ' — got ' + got : ''}`)
  }
}
const utc = (s) => Date.parse(s.replace(' ', 'T') + 'Z')
const mins = (a, b) => Math.abs(a - b) / 60000

// Two years of computed events (Jan 2026 → Dec 2027), built once.
const span = U.build(Date.UTC(2026, 0, 1), 730)
const evs = span.events
const near = (kind, ms, pred = () => true) =>
  evs
    .filter((e) => e.kind === kind && pred(e))
    .sort((a, b) => Math.abs(+a.tDate - ms) - Math.abs(+b.tDate - ms))[0]

// ── Moon phases vs USNO ──────────────────────────────────────────────────
const LUNATIONS = [
  ['New Moon', '2026-10-10 15:50'],
  ['Full Moon', '2026-10-26 04:12'],
  ['New Moon', '2026-11-09 07:02'],
  ['Full Moon', '2026-11-24 14:53'],
  ['New Moon', '2026-12-09 00:52'],
]
for (const [name, when] of LUNATIONS) {
  const ms = utc(when)
  const e = near('moon', ms, (x) => x.name === name)
  const d = e ? mins(+e.tDate, ms) : Infinity
  rows.push([
    `${name} ${when.slice(0, 10)}`,
    'USNO',
    when + ' UT',
    e && e.tDate.toISOString().slice(0, 16).replace('T', ' '),
    d.toFixed(1) + ' min',
    '5 min',
  ])
  ok(`${name} ${when} within 5 min of USNO`, d <= 5, d.toFixed(1) + ' min')
}

// ── Seasons vs USNO ──────────────────────────────────────────────────────
const SEASONS = [
  ['September equinox', '2026-09-23 00:05'],
  ['December solstice', '2026-12-21 20:50'],
  ['March equinox', '2027-03-20 20:25'],
  ['June solstice', '2027-06-21 14:11'],
]
for (const [name, when] of SEASONS) {
  const ms = utc(when)
  const e = near('season', ms, (x) => x.title === name)
  const d = e ? mins(+e.tDate, ms) : Infinity
  rows.push([
    `${name} ${when.slice(0, 4)}`,
    'USNO',
    when + ' UT',
    e && e.tDate.toISOString().slice(0, 16).replace('T', ' '),
    d.toFixed(1) + ' min',
    '15 min',
  ])
  ok(`${name} ${when} within 15 min of USNO`, d <= 15, d.toFixed(1) + ' min')
}
ok('exactly 8 seasons in two years', evs.filter((e) => e.kind === 'season').length === 8)

// ── Eclipses vs NASA (Espenak) ───────────────────────────────────────────
const ECLIPSES = [
  ['solar', 'annular', '2026-02-17 12:13'],
  ['lunar', 'total', '2026-03-03 11:34'],
  ['solar', 'total', '2026-08-12 17:47'],
  ['lunar', 'partial', '2026-08-28 04:14'],
  ['solar', 'annular', '2027-02-06 16:00'],
  ['lunar', 'penumbral', '2027-02-20 23:14'],
  ['lunar', 'penumbral', '2027-07-18 16:04'],
  ['solar', 'total', '2027-08-02 10:07'],
  ['lunar', 'penumbral', '2027-08-17 07:14'],
]
const found = evs.filter((e) => e.kind === 'eclipse')
ok(
  'exactly the 9 NASA eclipses of 2026–27, no extras',
  found.length === ECLIPSES.length,
  found.map((e) => e.tDate.toISOString().slice(0, 10)).join(','),
)
for (const [body, type, whenTD] of ECLIPSES) {
  const ms = utc(whenTD) - 69000 // TD → UT
  const e = found
    .filter((x) => x.eclipse === body)
    .sort((a, b) => Math.abs(+a.tDate - ms) - Math.abs(+b.tDate - ms))[0]
  const d = e ? mins(+e.tDate, ms) : Infinity
  const sameDay = e && e.tDate.toISOString().slice(0, 10) === whenTD.slice(0, 10)
  rows.push([
    `${type} ${body} eclipse ${whenTD.slice(0, 10)}`,
    'NASA',
    whenTD + ' TD',
    e && `${e.tDate.toISOString().slice(0, 16).replace('T', ' ')} (${e.eclipseType})`,
    d.toFixed(1) + ' min',
    'type exact, 30 min',
  ])
  ok(`${whenTD} ${body} eclipse found on the same date`, sameDay, e && e.tDate.toISOString())
  ok(`${whenTD} ${body} eclipse type is ${type}`, e && e.eclipseType === type, e && e.eclipseType)
  ok(`${whenTD} ${body} eclipse within 30 min of greatest eclipse`, d <= 30, d.toFixed(1) + ' min')
  ok(
    `${whenTD} eclipse title names its type`,
    e && e.title.toLowerCase() === `${type} ${body} eclipse`,
    e && e.title,
  )
}

// ── Mercury stations vs JPL Horizons ─────────────────────────────────────
const STATIONS = [
  [true, '2026-10-24 07:13'],
  [false, '2026-11-13 15:54'],
  [true, '2027-02-09 17:36'],
]
for (const [toRetro, when] of STATIONS) {
  const ms = utc(when)
  const e = near('station', ms, (x) => x.body === 'mercury' && x.toRetro === toRetro)
  const d = e ? mins(+e.tDate, ms) : Infinity
  rows.push([
    `Mercury stations ${toRetro ? 'retrograde' : 'direct'} ${when.slice(0, 10)}`,
    'JPL Horizons',
    when + ' UT',
    e && e.tDate.toISOString().slice(0, 16).replace('T', ' '),
    d.toFixed(1) + ' min',
    '6 h',
  ])
  ok(
    `Mercury ${toRetro ? 'SR' : 'SD'} ${when} within 6 h of Horizons`,
    d <= 360,
    d.toFixed(1) + ' min',
  )
  ok('station is labelled approximate', e && e.approx === true)
}

// ── Provenance: every event comes from the engine, no static list ────────
{
  const src = readFileSync(join(here, 'website/js/sky-upcoming.js'), 'utf8')
  ok('sky-upcoming.js holds no ISO dates', !/\b20\d\d-\d\d-\d\d/.test(src))
  ok(
    'sky-upcoming.js holds no Date.UTC / new Date(y, m, d) literals',
    !/Date\.UTC\(|new Date\(\s*\d{4}\s*,/.test(src),
  )
  ok(
    'sky-upcoming.js holds no Julian-day literals',
    !/24[4-6]\d{4}\.\d/.test(src.replace('2440587.5', '')),
  )
  const page = readFileSync(join(here, 'website/sky-events.html'), 'utf8')
  ok('sky-events.html ships no pre-rendered event rows', !/class="event-row/.test(page))
  const home = readFileSync(join(here, 'website/index.html'), 'utf8')
  ok(
    'home ships no pre-rendered next event',
    !/stations (retrograde|direct)|Full Moon in|New Moon in|eclipse,/i.test(home),
  )
  ok(
    'every event is marked source=engine',
    evs.every((e) => e.source === 'engine'),
  )

  // Re-running the shared finder reproduces each lunation/ingress/station instant.
  const W = win.WeeklySky
  const sample = evs.filter((e, i) => i % 7 === 0)
  let reproduced = 0
  for (const e of sample) {
    const r = { jdStart: e.tJD - 2, jdEnd: e.tJD + 2 }
    let again = []
    if (e.kind === 'moon') again = W._findMoonPhases(r).filter((x) => x.name === e.name)
    else if (e.kind === 'ingress' || e.kind === 'season') again = W._findIngresses(r, [e.body], 1)
    else if (e.kind === 'station') again = W._findStations(r).filter((x) => x.body === e.body)
    else if (e.kind === 'eclipse')
      again = [{ tJD: U.classifyEclipse(e.tJD, e.eclipse === 'lunar').tJD }]
    if (again.some((x) => Math.abs(x.tJD - e.tJD) < 1e-3)) reproduced++
  }
  ok(
    `sampled events reproduced by the engine finders (${reproduced}/${sample.length})`,
    reproduced === sample.length,
  )

  // Shift the engine's Sun and Moon by 10 days: the lunations and eclipses must follow.
  const shifted = load((Eph) => {
    const sun = Eph.sunPosition,
      moon = Eph.moonPosition
    Eph.sunPosition = (jd) => sun(jd - 10)
    Eph.moonPosition = (jd) => moon(jd - 10)
  })
    .UpcomingSky.build(Date.UTC(2026, 9, 1), 60)
    .events.filter((e) => e.kind === 'moon' || e.kind === 'eclipse')
  const base = U.build(Date.UTC(2026, 8, 21), 60).events.filter(
    (e) => e.kind === 'moon' || e.kind === 'eclipse',
  )
  const moved = base.filter((b) =>
    shifted.some((s) => s.name === b.name && Math.abs(s.tJD - (b.tJD + 10)) < 1e-3),
  ).length
  ok(
    'stubbed engine moves every lunation by exactly its shift',
    moved >= 3 && moved === Math.min(base.length, shifted.length),
    `${moved}/${base.length}`,
  )

  // A broken engine yields no events rather than invented ones.
  let threw = false
  try {
    load((Eph) => {
      Eph.moonPosition = () => {
        throw new Error('no moon')
      }
    }).UpcomingSky.build(Date.UTC(2026, 9, 1), 30)
  } catch {
    threw = true
  }
  ok('without a working engine the list cannot be built', threw)
}

// ── Range, kinds and copy ────────────────────────────────────────────────
{
  const start = Date.UTC(2026, 9, 23, 16)
  const r = U.build(start)
  ok('default range is 90 days', r.days === 90 && +r.end - +r.start === 90 * 86400000)
  ok(
    'all events inside the range',
    r.events.every((e) => +e.tDate >= start - 60000 && +e.tDate < +r.end),
  )
  ok(
    'events chronologically sorted',
    r.events.every((e, i, a) => !i || a[i - 1].tJD <= e.tJD),
  )
  const kinds = new Set(r.events.map((e) => e.kind))
  for (const k of ['moon', 'station', 'ingress', 'season'])
    ok(`90 days from 23 Oct 2026 include ${k}`, kinds.has(k))
  ok(
    'no Moon sign ingresses or quarter Moons in the list',
    r.events.every((e) => e.body !== 'moon' && !/Quarter/.test(e.name || '')),
  )
  ok(
    'every event has title, note and filter types',
    r.events.every((e) => e.title && e.note && e.types.length),
  )
  ok(
    'seasons are only Sun ingresses to Aries/Cancer/Libra/Capricorn',
    evs
      .filter((e) => e.kind === 'season')
      .every((e) => ['Aries', 'Cancer', 'Libra', 'Capricorn'].includes(e.sign)),
  )
  const banned =
    /doom|danger|beware|warning|curse|bad luck|disaster|fortune|lucky|destiny|£|\$|price|buy|checkout|offer/i
  ok(
    'no fear, fortune or selling copy',
    evs.every((e) => !banned.test(e.title + ' ' + e.note + ' ' + (e.subtitle || ''))),
    evs.map((e) => e.note).find((n) => banned.test(n)),
  )
  const hrefs = new Set(evs.map((e) => e.href).filter(Boolean))
  for (const h of hrefs) {
    let exists = true
    try {
      readFileSync(join(here, 'website', h))
    } catch {
      exists = false
    }
    ok(`event link ${h} is an existing page`, exists)
  }
  ok(
    '2026 eclipses link to the field guide',
    found
      .filter((e) => e.tDate.getUTCFullYear() === 2026)
      .every((e) => e.href === 'guides/eclipse-field-guide-2026.html'),
  )
  const next = U.nextEclipse(start)
  ok(
    'next eclipse after 23 Oct 2026 is the 6 Feb 2027 annular',
    next && next.tDate.toISOString().startsWith('2027-02-06') && next.eclipseType === 'annular',
    next && next.tDate.toISOString(),
  )
}

// ── UK time ──────────────────────────────────────────────────────────────
{
  const bst = { tDate: new Date('2026-07-01T23:05:00Z'), approx: false }
  const gmt = { tDate: new Date('2026-11-24T14:53:00Z'), approx: false }
  ok('summer time shown in BST', U.formatUK(bst) === 'Thu 2 Jul, 00:05 BST', U.formatUK(bst))
  ok('winter time shown in GMT', U.formatUK(gmt) === 'Tue 24 Nov, 14:53 GMT', U.formatUK(gmt))
  ok(
    'approximate events show the UK day only',
    U.formatUK({ tDate: new Date('2026-10-24T07:10:00Z'), approx: true }) ===
      'Around Sat 24 Oct (UK)',
  )
  ok(
    'UK day boundary uses Europe/London, not UTC',
    U.formatUK({ tDate: new Date('2026-06-30T23:30:00Z'), approx: true }) ===
      'Around Wed 1 Jul (UK)',
  )
  ok(
    'countdown days and hours',
    U.countdown(Date.UTC(2026, 0, 3, 5), Date.UTC(2026, 0, 1, 0)) === '2 days, 5 hours',
  )
  ok(
    'countdown minutes',
    U.countdown(Date.UTC(2026, 0, 1, 0, 1), Date.UTC(2026, 0, 1, 0, 0)) === '1 minute',
  )
  ok(
    'approximate countdown is rounded',
    U.countdown(Date.UTC(2026, 0, 3, 5), Date.UTC(2026, 0, 1, 0), true) === 'about 2 days',
  )
  ok('countdown is null once passed', U.countdown(1, 2) === null)
}

console.log('\nAccuracy table (computed vs published):')
console.table(
  rows.map(([event, source, published, computed, diff, tol]) => ({
    event,
    source,
    published,
    computed,
    diff,
    tol,
  })),
)
console.log(`\nupcoming sky: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
