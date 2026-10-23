// Paid orders: the typed LOCAL birth time is converted to UT once, with the birth
// place's zone and DST, the same way as the free chart page, before any chart is cast.
// Covers London in BST and GMT, New York, India (+05:30), the clock-change hours
// (skipped refused; repeated refused without fold, honoured with fold), and Aurora
// typed as 03:42 in Whitby giving exactly the samples' chart (ASC 7°25′ Gemini).
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import {
  BirthTimeError,
  buildChart,
  civilCandidates,
  enrichOrder,
  loadEngines,
  localBirthToUT,
  normalizeBirthInstant,
} from './tools/fulfil-shared.mjs'
import { typeformToOrder, resolveCoordinates } from './tools/typeform-to-order.mjs'
import { validateBirthData } from './tools/fulfil-quality.mjs'
import { AURORA } from './tools/make-studio-samples.mjs'
import { SAMPLE } from './tools/sample-print-pack.mjs'

let bad = 0
const ok = (label, cond, detail = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${cond || !detail ? '' : `  (${detail})`}`)
  if (!cond) bad++
}
const code = (fn) => {
  try {
    fn()
    return null
  } catch (e) {
    return e instanceof BirthTimeError ? e.code : `other:${e.message}`
  }
}
const { E } = loadEngines()
const SIGNS = [
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
const dm = (lon) => {
  const x = ((lon % 360) + 360) % 360
  const deg = Math.floor(x % 30)
  const min = Math.floor(((x % 30) - deg) * 60)
  return `${deg}°${String(min).padStart(2, '0')}′ ${SIGNS[Math.floor(x / 30)]}`
}

// ── 1. Same conversion as the free chart page (ap-chart-next.js), run side by side ──
const page = readFileSync('website/js/ap-chart-next.js', 'utf8')
const start = page.indexOf('function civilParts(')
const end = page.indexOf('function dayBoundary(')
ok('chart page conversion found in ap-chart-next.js', start > 0 && end > start)
const sandbox = {}
vm.runInNewContext(`${page.slice(start, end)}\nthis.civilCandidates = civilCandidates;`, sandbox)
const parity = [
  ['1990-06-14', '03:42', 'Europe/London'],
  ['1990-01-14', '03:42', 'Europe/London'],
  ['1990-06-14', '03:42', 'America/New_York'],
  ['1990-06-14', '03:42', 'Asia/Kolkata'],
  ['2024-03-31', '01:30', 'Europe/London'],
  ['2024-10-27', '01:30', 'Europe/London'],
  ['2024-03-10', '02:30', 'America/New_York'],
  ['2024-11-03', '01:30', 'America/New_York'],
  ['1985-07-01', '23:59', 'Asia/Kathmandu'],
  ['1972-01-01', '00:00', 'Pacific/Auckland'],
]
for (const [date, time, tz] of parity) {
  const a = JSON.stringify(sandbox.civilCandidates(date, time, tz))
  const b = JSON.stringify(civilCandidates(date, time, tz))
  ok(`order path matches chart page: ${date} ${time} ${tz}`, a === b, `${a} vs ${b}`)
}

// ── 2. Local → UT conversions ──
const ut = (o) => localBirthToUT(o).utc
ok(
  'London in BST: 14 Jun 1990 03:42 local -> 02:42 UT',
  ut({ y: 1990, mo: 6, d: 14, h: 3, mi: 42, tz: 'Europe/London' }) === '1990-06-14T02:42Z',
)
ok(
  'London in GMT: 14 Jan 1990 03:42 local -> 03:42 UT',
  ut({ y: 1990, mo: 1, d: 14, h: 3, mi: 42, tz: 'Europe/London' }) === '1990-01-14T03:42Z',
)
ok(
  'London, 1971 British Standard Time (all-year +1): 14 Jan 1971 03:42 -> 02:42 UT',
  ut({ y: 1971, mo: 1, d: 14, h: 3, mi: 42, tz: 'Europe/London' }) === '1971-01-14T02:42Z',
)
ok(
  'New York in EDT: 14 Jun 1990 03:42 local -> 07:42 UT',
  ut({ y: 1990, mo: 6, d: 14, h: 3, mi: 42, tz: 'America/New_York' }) === '1990-06-14T07:42Z',
)
ok(
  'New York in EST: 14 Jan 1990 03:42 local -> 08:42 UT',
  ut({ y: 1990, mo: 1, d: 14, h: 3, mi: 42, tz: 'America/New_York' }) === '1990-01-14T08:42Z',
)
ok(
  'India (+05:30): 14 Jun 1990 03:42 local -> 13 Jun 22:12 UT (previous UT day)',
  ut({ y: 1990, mo: 6, d: 14, h: 3, mi: 42, tz: 'Asia/Kolkata' }) === '1990-06-13T22:12Z',
)
const ind = localBirthToUT({ y: 1990, mo: 6, d: 14, h: 3, mi: 42, tz: 'Asia/Kolkata' })
ok('India: offset recorded as +330 minutes', ind.local.offsetMinutes === 330)

// ── 3. Clock-change hours ──
ok(
  'London spring-forward 31 Mar 2024 01:30 never happened: refused (skipped)',
  code(() => localBirthToUT({ y: 2024, mo: 3, d: 31, h: 1, mi: 30, tz: 'Europe/London' })) ===
    'skipped',
)
ok(
  'London 31 Mar 2024 00:59 (just before) -> 00:59 UT',
  ut({ y: 2024, mo: 3, d: 31, h: 0, mi: 59, tz: 'Europe/London' }) === '2024-03-31T00:59Z',
)
ok(
  'London 31 Mar 2024 02:00 (just after) -> 01:00 UT',
  ut({ y: 2024, mo: 3, d: 31, h: 2, mi: 0, tz: 'Europe/London' }) === '2024-03-31T01:00Z',
)
ok(
  'London fall-back 27 Oct 2024 01:30 happened twice: refused without fold (repeated)',
  code(() => localBirthToUT({ y: 2024, mo: 10, d: 27, h: 1, mi: 30, tz: 'Europe/London' })) ===
    'repeated',
)
ok(
  'London 27 Oct 2024 01:30 fold earlier (BST) -> 00:30 UT',
  ut({ y: 2024, mo: 10, d: 27, h: 1, mi: 30, tz: 'Europe/London', fold: 'earlier' }) ===
    '2024-10-27T00:30Z',
)
ok(
  'London 27 Oct 2024 01:30 fold later (GMT) -> 01:30 UT',
  ut({ y: 2024, mo: 10, d: 27, h: 1, mi: 30, tz: 'Europe/London', fold: 'later' }) ===
    '2024-10-27T01:30Z',
)
ok(
  'New York spring-forward 10 Mar 2024 02:30: refused (skipped)',
  code(() => localBirthToUT({ y: 2024, mo: 3, d: 10, h: 2, mi: 30, tz: 'America/New_York' })) ===
    'skipped',
)
ok(
  'New York fall-back 3 Nov 2024 01:30: refused without fold',
  code(() => localBirthToUT({ y: 2024, mo: 11, d: 3, h: 1, mi: 30, tz: 'America/New_York' })) ===
    'repeated',
)
ok(
  'New York 3 Nov 2024 01:30 fold earlier (EDT) -> 05:30 UT',
  ut({ y: 2024, mo: 11, d: 3, h: 1, mi: 30, tz: 'America/New_York', fold: 'earlier' }) ===
    '2024-11-03T05:30Z',
)
ok(
  'New York 3 Nov 2024 01:30 fold later (EST) -> 06:30 UT',
  ut({ y: 2024, mo: 11, d: 3, h: 1, mi: 30, tz: 'America/New_York', fold: 'later' }) ===
    '2024-11-03T06:30Z',
)
ok(
  'fold is recorded on the order',
  localBirthToUT({ y: 2024, mo: 10, d: 27, h: 1, mi: 30, tz: 'Europe/London', fold: 'later' }).local
    .fold === 'later',
)
ok(
  'fold is ignored on an unambiguous time',
  !(
    'fold' in
    localBirthToUT({ y: 1990, mo: 6, d: 14, h: 3, mi: 42, tz: 'Europe/London', fold: 'later' })
      .local
  ),
)
ok(
  'unknown time uses local noon (London BST -> 11:00 UT)',
  ut({ y: 1990, mo: 6, d: 14, tz: 'Europe/London', timeKnown: false }) === '1990-06-14T11:00Z',
)
ok(
  'no zone: refused, never treated as UT',
  code(() => localBirthToUT({ y: 1990, mo: 6, d: 14, h: 3, mi: 42 })) === 'zone',
)
ok(
  'invalid zone: refused',
  code(() => localBirthToUT({ y: 1990, mo: 6, d: 14, h: 3, mi: 42, tz: 'Mars/Olympus' })) ===
    'zone',
)
ok(
  'typed time and h/mi disagreeing: refused (conflict)',
  code(() =>
    normalizeBirthInstant({
      y: 1990,
      mo: 6,
      d: 14,
      time: '03:42',
      h: 2,
      mi: 42,
      tz: 'Europe/London',
    }),
  ) === 'conflict',
)

// ── 4. The order stores both local and UT, and converts only once ──
const n1 = normalizeBirthInstant(
  { name: 'Test Person', dob: '1990-06-14', time: '03:42', place: 'London, UK' },
  E,
)
ok(
  'order stores UT fields',
  n1.y === 1990 &&
    n1.mo === 6 &&
    n1.d === 14 &&
    n1.h === 2 &&
    n1.mi === 42 &&
    n1.utc === '1990-06-14T02:42Z',
)
ok(
  'order stores the local time and zone',
  n1.local.date === '1990-06-14' &&
    n1.local.time === '03:42' &&
    n1.local.tz === 'Europe/London' &&
    n1.local.offsetMinutes === 60,
)
ok('order is marked timeBasis ut', n1.timeBasis === 'ut' && n1.timeUnknown === false)
const n2 = normalizeBirthInstant(n1, E)
ok('converting again changes nothing (idempotent)', JSON.stringify(n2) === JSON.stringify(n1))
ok(
  'enrichOrder on a converted order changes nothing',
  enrichOrder(n1, E).h === 2 && enrichOrder(n1, E).utc === n1.utc,
)
ok(
  'validateBirthData refuses an order still on local time',
  !validateBirthData({ ...n1, timeBasis: undefined }).ok,
)
ok(
  'validateBirthData accepts the converted order',
  validateBirthData({ ...n1, lat: 51.5074, lon: -0.1278 }).ok,
  JSON.stringify(validateBirthData({ ...n1, lat: 51.5074, lon: -0.1278 })),
)

// ── 5. Paid path end to end: Aurora typed 03:42 in Whitby = the samples' chart ──
const answers = [
  { field: { ref: 'chart_name' }, type: 'text', text: 'Aurora Vale' },
  { field: { ref: 'dob' }, type: 'date', date: '1990-06-14' },
  { field: { ref: 'birth_time' }, type: 'text', text: '03:42' },
  { field: { ref: 'birth_place' }, type: 'text', text: 'Whitby, England' },
]
const raw = typeformToOrder({
  form_response: { hidden: { order_id: 'FICTIONAL-UT', product_sku: 'deep-reading' }, answers },
})
// Whitby is not in the built-in place list, so ops add coordinates and zone (as for
// any un-geocoded place); the typed time stays as the customer gave it.
const paid = resolveCoordinates({ ...raw, lat: AURORA.lat, lon: AURORA.lon, tz: 'Europe/London' })
ok(
  'paid order: 03:42 typed in Whitby -> 02:42 UT',
  paid.utc === '1990-06-14T02:42Z' && paid.h === 2 && paid.mi === 42,
)
ok('paid order: local 03:42 kept', paid.local.time === '03:42' && paid.local.tz === 'Europe/London')
const chartPaid = buildChart(paid, E)
const chartSample = buildChart(AURORA, E)
ok(
  'paid order rising sign is 7°25′ Gemini',
  dm(chartPaid.asc) === '7°25′ Gemini',
  dm(chartPaid.asc),
)
ok(
  'paid order chart is identical to the samples (ASC, MC, every body)',
  chartPaid.asc === chartSample.asc &&
    chartPaid.mc === chartSample.mc &&
    Object.keys(chartSample.pos).every((k) => chartPaid.pos[k].lon === chartSample.pos[k].lon),
)
// The bug this fixes: the typed 03:42 used as if it were UT.
const asIfUT = E.calculateNatalChart(1990, 6, 14, 3, 42, AURORA.lat, AURORA.lon, 'placidus')
ok(
  '(the old bug) 03:42 read as UT would give 24°43′ Gemini',
  dm(asIfUT.ascendant) === '24°43′ Gemini',
  dm(asIfUT.ascendant),
)
ok(
  'enrichOrder alone (no typeform step) also converts',
  buildChart(
    {
      name: 'Aurora Vale',
      dob: '1990-06-14',
      time: '03:42',
      place: 'Whitby, England',
      lat: AURORA.lat,
      lon: AURORA.lon,
      tz: 'Europe/London',
    },
    E,
  ).asc === chartSample.asc,
)
ok(
  'London sample (GMT, clock = UT) is unchanged',
  buildChart(SAMPLE, E).order.h === 6 && buildChart(SAMPLE, E).order.utc === '1990-03-14T06:30Z',
)

// Couples legs from the form are converted too.
const couples = resolveCoordinates(
  typeformToOrder({
    form_response: {
      hidden: {},
      answers: [
        { field: { ref: 'p1_chart_name' }, type: 'text', text: 'A' },
        { field: { ref: 'p1_dob' }, type: 'date', date: '1990-06-14' },
        { field: { ref: 'p1_birth_time' }, type: 'text', text: '03:42' },
        { field: { ref: 'p1_birth_place' }, type: 'text', text: 'New York' },
        { field: { ref: 'p2_chart_name' }, type: 'text', text: 'B' },
        { field: { ref: 'p2_dob' }, type: 'date', date: '1990-06-14' },
        { field: { ref: 'p2_birth_time' }, type: 'text', text: '03:42' },
        { field: { ref: 'p2_birth_place' }, type: 'text', text: 'Mumbai, India' },
      ],
    },
  }),
)
ok('couples p1 (New York) -> 07:42 UT', couples.p1.utc === '1990-06-14T07:42Z')
ok('couples p2 (Mumbai) -> 13 Jun 22:12 UT', couples.p2.utc === '1990-06-13T22:12Z')

if (bad) {
  console.log(`\n${bad} order birth-time UT check(s) failed`)
  process.exit(1)
}
console.log('\nall order birth-time UT checks passed')
