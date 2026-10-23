/**
 * Upcoming sky events (website/js/sky-upcoming.js) — accuracy and provenance.
 * Run: node test-upcoming-sky.mjs   (exit 0 = pass)
 *
 * Every expected value below is a PUBLISHED reference, copied by hand from the
 * cited source (retrieved 2026-10-23). The module itself holds no event list;
 * these values only check what the engine computes.
 *
 * Sources and tolerances:
 * Tolerances match the page copy (sky-events.html): "Moon phases and eclipses
 * are timed to within a minute or two of published almanac values; equinoxes,
 * solstices and sign changes to within a few minutes." Published values are
 * rounded to the minute, so "a minute or two" is tested as ≤ 2 min and "a few
 * minutes" as ≤ 3 min for the Sun and ≤ 5 min for planets' sign changes.
 *
 *  - Moon phases: US Naval Observatory, Astronomical Applications API,
 *    https://aa.usno.navy.mil/api/moon/phases/year?year=2026 (and 2027), UT.
 *    Tolerance 2 minutes.
 *  - Equinoxes and solstices: USNO API https://aa.usno.navy.mil/api/seasons?year=2026
 *    (and 2027), UT. Tolerance 3 minutes. Sep 2027 (06:02 UT) also agrees with
 *    JPL Horizons (Sun, 500@399, ObsEcLon crossing 180°: 06:01:44 UT).
 *  - Eclipses: NASA GSFC eclipse catalogue (F. Espenak),
 *    https://eclipse.gsfc.nasa.gov/SEdecade/SEdecade2021.html and
 *    https://eclipse.gsfc.nasa.gov/LEdecade/LEdecade2021.html. Times are of
 *    greatest eclipse in TD (TD − UT ≈ 69 s in 2026–27). Date and type must
 *    match exactly; time within 2 minutes.
 *  - Sign changes: JPL Horizons (targets 299 Venus, 499 Mars; geocentric
 *    500@399, ObsEcLon, 1-minute steps, linear crossing of the sign cusp),
 *    https://ssd.jpl.nasa.gov/api/horizons.api. Venus re-enters Libra
 *    2026-10-25 09:09:46 UT; Mars enters Virgo 2026-11-25 23:37:08 UT.
 *    Tolerance 5 minutes. Venus is the hard case: it is retrograde a day after
 *    inferior conjunction (0.27 AU away), so a ~6″ error from the truncated
 *    VSOP87D series moves the crossing by ~4 min.
 *  - Mercury stations: JPL Horizons (target 199, geocentric 500@399, observer
 *    ecliptic-of-date longitude ObsEcLon, 1 h steps; turning point fitted by a
 *    parabola), https://ssd.jpl.nasa.gov/api/horizons.api. Tolerance 30 min,
 *    the Mercury window the page uses for its day range.
 *  - Outer-planet stations: JPL Horizons (targets 599, 699, 799, 899, 999;
 *    500@399, ObsEcLon, 1 h steps over 23 Oct 2026 – 1 Nov 2027; station =
 *    vertex of a least-squares parabola over ±3 days). Each JPL time must fall
 *    inside the page's uncertainty window (UpcomingSky.APPROX_WINDOW_H), and the
 *    UK day(s) the page shows must include JPL's UK day.
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
    '2 min',
  ])
  ok(`${name} ${when} within 2 min of USNO`, d <= 2, d.toFixed(1) + ' min')
}

// ── Seasons vs USNO ──────────────────────────────────────────────────────
const SEASONS = [
  ['September equinox', '2026-09-23 00:05'],
  ['December solstice', '2026-12-21 20:50'],
  ['March equinox', '2027-03-20 20:25'],
  ['June solstice', '2027-06-21 14:11'],
  ['September equinox', '2027-09-23 06:02'],
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
    '3 min',
  ])
  ok(`${name} ${when} within 3 min of USNO`, d <= 3, d.toFixed(1) + ' min')
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
    'type exact, 2 min',
  ])
  ok(`${whenTD} ${body} eclipse found on the same date`, sameDay, e && e.tDate.toISOString())
  ok(`${whenTD} ${body} eclipse type is ${type}`, e && e.eclipseType === type, e && e.eclipseType)
  ok(`${whenTD} ${body} eclipse within 2 min of greatest eclipse`, d <= 2, d.toFixed(1) + ' min')
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
    '30 min',
  ])
  ok(
    `Mercury ${toRetro ? 'SR' : 'SD'} ${when} within 30 min of Horizons`,
    d <= 30,
    d.toFixed(1) + ' min',
  )
  ok('station is labelled approximate', e && e.approx === true)
}

// ── Sign changes vs JPL Horizons ─────────────────────────────────────────
const INGRESSES = [
  ['venus', 'Libra', '2026-10-25 09:09:46'],
  ['mars', 'Virgo', '2026-11-25 23:37:08'],
]
for (const [body, sign, when] of INGRESSES) {
  const ms = utc(when)
  const e = near('ingress', ms, (x) => x.body === body && x.sign === sign)
  const d = e ? mins(+e.tDate, ms) : Infinity
  rows.push([
    `${e ? e.title : body + ' → ' + sign} ${when.slice(0, 10)}`,
    'JPL Horizons',
    when.slice(0, 16) + ' UT',
    e && e.tDate.toISOString().slice(0, 16).replace('T', ' '),
    d.toFixed(1) + ' min',
    '5 min',
  ])
  ok(`${body} into ${sign} ${when} within 5 min of Horizons`, d <= 5, d.toFixed(1) + ' min')
  ok(`${body} into ${sign} is timed, not approximate`, e && e.approx === false)
}

// ── Outer-planet stations vs JPL Horizons (day shown must be right) ──────
{
  const STATIONS_OUTER = [
    ['saturn', false, '2026-12-10 23:30'],
    ['neptune', false, '2026-12-12 22:20'],
    ['jupiter', true, '2026-12-13 00:56'],
    ['uranus', false, '2027-02-08 12:22'],
    ['jupiter', false, '2027-04-13 02:20'],
    ['pluto', true, '2027-05-08 13:02'],
    ['neptune', true, '2027-07-09 23:01'],
    ['saturn', true, '2027-08-09 18:08'],
    ['uranus', true, '2027-09-15 09:17'],
    ['pluto', false, '2027-10-18 04:17'],
  ]
  const ukKey = (d) =>
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      day: 'numeric',
      month: 'short',
    }).format(d)
  for (const [body, toRetro, when] of STATIONS_OUTER) {
    const ms = utc(when)
    const e = near('station', ms, (x) => x.body === body && x.toRetro === toRetro)
    const d = e ? mins(+e.tDate, ms) : Infinity
    const winMin = (U.APPROX_WINDOW_H[body] || 0) * 60
    const shown = e ? U.formatUK(e) : ''
    const jplDay = ukKey(new Date(ms))
    const [dd, mon] = jplDay.split(' ')
    const span = e ? U.ukDaySpan(e).map(ukKey) : []
    const name = `${body[0].toUpperCase() + body.slice(1)} stations ${toRetro ? 'retrograde' : 'direct'}`
    rows.push([
      `${name} ${when.slice(0, 10)}`,
      'JPL Horizons',
      when + ' UT',
      e && `${e.tDate.toISOString().slice(0, 16).replace('T', ' ')} → ${shown}`,
      (d / 60).toFixed(2) + ' h',
      `±${winMin / 60} h, UK day`,
    ])
    ok(
      `${name} ${when}: JPL time inside the ±${winMin / 60} h window`,
      d <= winMin,
      d.toFixed(0) + ' min',
    )
    ok(
      `${name} ${when}: the UK day(s) shown include JPL's UK day (${jplDay})`,
      span.includes(jplDay) && shown.includes(dd) && shown.includes(mon),
      shown,
    )
  }
  // Pluto (review round 1): it was shown a day early as a single day (Fri 7 May,
  // Sun 17 Oct). The engine still runs 14–17 h early, so the page must show a
  // range that includes JPL's day, never the early day alone.
  const pr = near('station', utc('2027-05-08 13:02'), (x) => x.body === 'pluto')
  const pd = near('station', utc('2027-10-18 04:17'), (x) => x.body === 'pluto')
  ok(
    'Pluto SR shows a range that includes 8 May',
    pr && /–/.test(U.formatUK(pr)) && /\b8 May|–8 May/.test(U.formatUK(pr)),
    pr && U.formatUK(pr),
  )
  ok(
    'Pluto SD shows a range that includes 18 Oct',
    pd && /–/.test(U.formatUK(pd)) && U.ukDaySpan(pd).length === 2,
    pd && U.formatUK(pd),
  )
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
    U.formatUK({ tDate: new Date('2026-06-30T23:40:00Z'), approx: true, body: 'mercury' }) ===
      'Around Wed 1 Jul (UK)',
  )
  ok(
    'approximate event whose window spans UK midnight shows both days',
    U.formatUK({ tDate: new Date('2027-07-09T23:30:00Z'), approx: true, body: 'neptune' }) ===
      'Around 9–10 Jul (UK)',
    U.formatUK({ tDate: new Date('2027-07-09T23:30:00Z'), approx: true, body: 'neptune' }),
  )
  ok(
    'a range across a month end names both months',
    U.formatUK({ tDate: new Date('2027-04-30T23:30:00Z'), approx: true, body: 'uranus' }) ===
      'Around 30 Apr–1 May (UK)',
    U.formatUK({ tDate: new Date('2027-04-30T23:30:00Z'), approx: true, body: 'uranus' }),
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
  // Singular/plural edges (review round 1: "In about 1 hours").
  const T0 = Date.UTC(2026, 0, 1, 0)
  const H = 3600000,
    M = 60000
  const cdA = (ms) => U.countdown(T0 + ms, T0, true)
  const cdX = (ms) => U.countdown(T0 + ms, T0)
  const EDGES = [
    [cdA(10 * M), 'about 1 hour', 'approx, 10 min'],
    [cdA(29 * M), 'about 1 hour', 'approx, 29 min'],
    [cdA(31 * M), 'about 1 hour', 'approx, 31 min'],
    [cdA(89 * M), 'about 1 hour', 'approx, 89 min'],
    [cdA(91 * M), 'about 2 hours', 'approx, 91 min'],
    [cdA(35 * H), 'about 35 hours', 'approx, 35 h'],
    [cdA(36 * H), 'about 2 days', 'approx, 36 h'],
    [cdX(30 * 1000), '1 minute', 'exact, 30 s'],
    [cdX(2 * M), '2 minutes', 'exact, 2 min'],
    [cdX(H + M), '1 hour, 1 minute', 'exact, 1 h 1 min'],
    [cdX(2 * H), '2 hours, 0 minutes', 'exact, 2 h'],
    [cdX(24 * H + H), '1 day, 1 hour', 'exact, 25 h'],
    [cdX(48 * H), '2 days, 0 hours', 'exact, 48 h'],
  ]
  for (const [got, want, label] of EDGES) ok(`countdown ${label} → "${want}"`, got === want, got)
  for (const [got] of EDGES)
    ok(`no "1 hours"/"1 days"/"1 minutes" (${got})`, !/\b1 (hours|days|minutes)\b/.test(got))
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
