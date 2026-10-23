/**
 * Upcoming sky events — a rolling list (default 90 days) of eclipses, New and
 * Full Moons, retrograde/direct stations, sign ingresses and the equinoxes and
 * solstices.
 *
 * Nothing here is a stored list. Every event is found at view time by the
 * existing engine: WeeklySky's finders (phases, ingresses, stations) run over
 * the requested range on AstroEphemeris positions, and eclipses are classified
 * from the engine's Sun and Moon (longitude, latitude, distance) at each
 * New/Full Moon with standard shadow geometry.
 *
 * Accuracy (see test-upcoming-sky.mjs): Moon phases and eclipses within a
 * minute or two of USNO / NASA (Espenak), equinoxes, solstices and fast-planet
 * sign changes within a couple of minutes of USNO / JPL Horizons. Stations
 * (and slow outer-planet sign changes) are flat turning points: they are shown
 * by day, as a two-day range when the uncertainty spans UK midnight.
 */
;(function () {
  'use strict'

  var DAY_MS = 86400000
  var SEASONS = {
    Aries: {
      name: 'March equinox',
      note: 'The Sun reaches 0° Aries. Day and night run close to equal, and astronomical spring begins in the UK.',
    },
    Cancer: {
      name: 'June solstice',
      note: 'The Sun reaches 0° Cancer. It is the longest day of the year in the UK, and astronomical summer begins.',
    },
    Libra: {
      name: 'September equinox',
      note: 'The Sun reaches 0° Libra. Day and night run close to equal, and astronomical autumn begins in the UK.',
    },
    Capricorn: {
      name: 'December solstice',
      note: 'The Sun reaches 0° Capricorn. It is the shortest day of the year in the UK, and the light starts to return.',
    },
  }
  var ECLIPSE_NOTES = {
    'solar-total':
      'The Moon covers the Sun completely along a narrow track, with a partial eclipse either side. Visibility depends on where you are.',
    'solar-annular':
      'The Moon is a little too far away to cover the Sun, leaving a ring of sunlight along a narrow track. Visibility depends on where you are.',
    'solar-partial':
      'The Moon covers part of the Sun as seen from part of the world. Visibility depends on where you are.',
    'lunar-total':
      'The whole Moon passes into Earth’s darkest shadow and often turns a coppery red. Seen wherever the Moon is up.',
    'lunar-partial':
      'Part of the Moon dips into Earth’s darkest shadow. Seen wherever the Moon is up.',
    'lunar-penumbral':
      'The Moon only brushes Earth’s outer shadow, a soft dimming that is easy to miss. Seen wherever the Moon is up.',
  }
  var TYPE_LABELS = {
    eclipse: 'Eclipses',
    moon: 'Moon',
    station: 'Retrogrades',
    ingress: 'Ingresses',
    season: 'Seasons',
  }

  function E() {
    return window.AstroEphemeris
  }
  function W() {
    return window.WeeklySky
  }
  function rad(d) {
    return (d * Math.PI) / 180
  }
  function deg(r) {
    return (r * 180) / Math.PI
  }
  function jdFromMs(ms) {
    return ms / DAY_MS + 2440587.5
  }

  // ── eclipse geometry on the engine's own Sun and Moon ────────────────────
  var EARTH_R_KM = 6378.137,
    MOON_R_KM = 1737.4
  var SUN_PARALLAX_1AU = 8.794148 / 3600,
    SUN_SEMI_1AU = 959.63 / 3600

  /** Great-circle separation (degrees) of two ecliptic points. */
  function sep(lon1, lat1, lon2, lat2) {
    var a = rad(lat1),
      b = rad(lat2),
      dl = rad(lon1 - lon2)
    var c = Math.sin(a) * Math.sin(b) + Math.cos(a) * Math.cos(b) * Math.cos(dl)
    return deg(Math.acos(Math.max(-1, Math.min(1, c))))
  }
  function geometry(jd, lunar) {
    var s = E().sunPosition(jd),
      m = E().moonPosition(jd)
    var target = lunar ? { lon: s.lon + 180, lat: -(s.lat || 0) } : { lon: s.lon, lat: s.lat || 0 }
    return {
      d: sep(m.lon, m.lat, target.lon, target.lat),
      piM: deg(Math.asin(EARTH_R_KM / m.distance)),
      sM: deg(Math.asin(MOON_R_KM / m.distance)),
      piS: SUN_PARALLAX_1AU / s.distance,
      sS: SUN_SEMI_1AU / s.distance,
      moonKm: m.distance,
    }
  }
  /** Golden-section search for the closest approach within ±6 h of the syzygy. */
  function closest(tJD, lunar) {
    var a = tJD - 0.25,
      b = tJD + 0.25,
      g = (Math.sqrt(5) - 1) / 2
    var c = b - g * (b - a),
      d = a + g * (b - a)
    var fc = geometry(c, lunar).d,
      fd = geometry(d, lunar).d
    for (var i = 0; i < 30; i++) {
      if (fc < fd) {
        b = d
        d = c
        fd = fc
        c = b - g * (b - a)
        fc = geometry(c, lunar).d
      } else {
        a = c
        c = d
        fc = fd
        d = a + g * (b - a)
        fd = geometry(d, lunar).d
      }
    }
    var t = (a + b) / 2
    return { tJD: t, g: geometry(t, lunar) }
  }
  /**
   * Classify a New Moon (solar) or Full Moon (lunar). Returns null when the
   * Moon passes too far from the node for any eclipse.
   */
  function classifyEclipse(tJD, lunar) {
    var c = closest(tJD, lunar),
      g = c.g
    if (lunar) {
      // Earth's shadow radii at the Moon's distance, 1.02 Danjon enlargement.
      var umbra = 1.02 * (0.99834 * g.piM + g.piS - g.sS)
      var penumbra = 1.02 * (0.99834 * g.piM + g.piS + g.sS)
      var umbralMag = (umbra + g.sM - g.d) / (2 * g.sM)
      var penMag = (penumbra + g.sM - g.d) / (2 * g.sM)
      if (penMag <= 0) return null
      var type = umbralMag >= 1 ? 'total' : umbralMag > 0 ? 'partial' : 'penumbral'
      return {
        body: 'lunar',
        type: type,
        tJD: c.tJD,
        magnitude: umbralMag > 0 ? umbralMag : penMag,
      }
    }
    var axis = g.piM - g.piS // shadow-axis distance scale (Earth radii ↔ degrees)
    if (g.d >= axis + g.sM + g.sS) return null
    var gamma = g.d / axis
    var stype = 'partial'
    if (gamma < 0.9972) {
      // Compare Moon and Sun apparent radii from the sub-shadow point on Earth's surface.
      var near = g.moonKm - EARTH_R_KM * Math.sqrt(1 - gamma * gamma)
      var sMoonTopo = deg(Math.asin(MOON_R_KM / near))
      stype = sMoonTopo >= g.sS ? 'total' : 'annular'
    }
    return { body: 'solar', type: stype, tJD: c.tJD, gamma: gamma }
  }

  // ── links to existing pages ──────────────────────────────────────────────
  function signHref(sign) {
    return sign ? sign.toLowerCase() + '.html' : ''
  }
  function hrefFor(ev) {
    if (ev.kind === 'eclipse')
      return new Date(ev.tDate).getUTCFullYear() === 2026
        ? 'guides/eclipse-field-guide-2026.html'
        : ''
    if (ev.kind === 'moon') return 'moonphase.html'
    if (ev.kind === 'station') return 'retrograde.html'
    if (ev.kind === 'ingress' || ev.kind === 'season') return signHref(ev.sign)
    return ''
  }
  function linkLabel(ev) {
    if (ev.kind === 'eclipse') return 'Eclipse field guide'
    if (ev.kind === 'moon') return 'Explore the Moon'
    if (ev.kind === 'station') return 'About retrogrades'
    return ev.sign + ' guide'
  }

  // ── range builder on the shared finders ──────────────────────────────────
  function lunations(range) {
    return W()
      ._findMoonPhases(range)
      .filter(function (p) {
        return p.name === 'New Moon' || p.name === 'Full Moon'
      })
  }
  function fromPhase(p) {
    var lunar = p.name === 'Full Moon'
    var ecl = classifyEclipse(p.tJD, lunar)
    W().describe(p)
    if (!ecl) {
      return {
        kind: 'moon',
        types: ['moon'],
        tJD: p.tJD,
        tDate: p.tDate,
        approx: false,
        name: p.name,
        sign: p.sign,
        deg: p.deg,
        title: p.title,
        note: p.note,
      }
    }
    var label = ecl.type.charAt(0).toUpperCase() + ecl.type.slice(1) + ' ' + ecl.body + ' eclipse'
    return {
      kind: 'eclipse',
      types: ['eclipse', 'moon'],
      tJD: ecl.tJD,
      tDate: W().jdToDate(ecl.tJD),
      approx: false,
      eclipse: ecl.body,
      eclipseType: ecl.type,
      magnitude: ecl.magnitude,
      gamma: ecl.gamma,
      name: p.name,
      sign: p.sign,
      deg: p.deg,
      title: label,
      subtitle: p.name + ' in ' + p.sign,
      note: ECLIPSE_NOTES[ecl.body + '-' + ecl.type],
    }
  }
  function fromIngress(ev) {
    W().describe(ev)
    if (ev.body === 'sun' && SEASONS[ev.sign]) {
      var s = SEASONS[ev.sign]
      return {
        kind: 'season',
        types: ['season', 'ingress'],
        tJD: ev.tJD,
        tDate: ev.tDate,
        approx: false,
        body: 'sun',
        planet: 'Sun',
        sign: ev.sign,
        fromSign: ev.fromSign,
        title: s.name,
        subtitle: 'Sun enters ' + ev.sign,
        note: s.note,
      }
    }
    ev.types = ['ingress']
    return ev
  }
  function fromStation(ev) {
    W().describe(ev)
    ev.types = ['station']
    return ev
  }

  var INGRESS_BODIES = [
    'sun',
    'mercury',
    'venus',
    'mars',
    'jupiter',
    'saturn',
    'uranus',
    'neptune',
    'pluto',
  ]

  /**
   * All events in [start, start + days). `start` is a Date or ms; default now.
   */
  function build(start, days) {
    var t0 = start == null ? Date.now() : +start
    var span = days || 90
    var range = { jdStart: jdFromMs(t0), jdEnd: jdFromMs(t0) + span }
    var events = []
      .concat(lunations(range).map(fromPhase))
      .concat(W()._findIngresses(range, INGRESS_BODIES, 1).map(fromIngress))
      .concat(W()._findStations(range).map(fromStation))
    events.forEach(function (ev) {
      ev.source = 'engine'
      ev.id =
        ev.kind + ':' + (ev.body || ev.eclipse || ev.name || '') + ':' + Math.round(ev.tJD * 1440)
      ev.href = hrefFor(ev)
      ev.linkLabel = ev.href ? linkLabel(ev) : ''
      if (!ev.subtitle) {
        if (ev.kind === 'ingress')
          ev.subtitle =
            'Leaving ' + ev.fromSign + (ev.approx ? ' · slow-moving, date approximate' : '')
        else if (ev.sign) ev.subtitle = ev.deg + '° ' + ev.sign
      }
    })
    events = events.filter(function (ev) {
      return ev.tJD >= range.jdStart && ev.tJD < range.jdEnd
    })
    events.sort(function (a, b) {
      return a.tJD - b.tJD
    })
    return { start: new Date(t0), end: new Date(t0 + span * DAY_MS), days: span, events: events }
  }

  /** The next eclipse after `start`, scanning lunations up to `maxDays` (default 400). */
  function nextEclipse(start, maxDays) {
    var t0 = start == null ? Date.now() : +start
    var jd0 = jdFromMs(t0),
      limit = maxDays || 400
    for (var off = 0; off < limit; off += 60) {
      var range = { jdStart: jd0 + off, jdEnd: jd0 + Math.min(off + 60, limit) }
      var found = lunations(range)
        .map(fromPhase)
        .filter(function (ev) {
          return ev.kind === 'eclipse' && ev.tJD >= jd0
        })
      if (found.length) {
        found.sort(function (a, b) {
          return a.tJD - b.tJD
        })
        var ev = found[0]
        ev.source = 'engine'
        ev.href = hrefFor(ev)
        ev.linkLabel = ev.href ? linkLabel(ev) : ''
        return ev
      }
    }
    return null
  }

  // ── UK time formatting (Europe/London, labelled GMT/BST) ─────────────────
  function ukParts(date, opts) {
    var f = new Intl.DateTimeFormat('en-GB', Object.assign({ timeZone: 'Europe/London' }, opts))
    return f.format(date)
  }
  function ukZone(date) {
    var z = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', timeZoneName: 'short' })
      .formatToParts(date)
      .filter(function (p) {
        return p.type === 'timeZoneName'
      })[0]
    var name = z ? z.value : 'GMT'
    return /^GMT\+1$|^BST$/.test(name) ? 'BST' : 'GMT'
  }
  // How far an approximate (flat) turning point may sit from the engine's time,
  // in hours, set from gaps measured against JPL Horizons for 2026–27
  // (test-upcoming-sky.mjs). Measured: Mercury ≤ 4 min, Venus 18 min, Mars
  // 10 min, Jupiter 9 min, Saturn 15 min, Uranus 43 min, Neptune 68 min. Pluto
  // runs 14–17 h early: its Meeus Ch. 37 position is combined with the
  // of-date Sun without precessing the Sun to J2000, which tilts its apparent
  // speed. Until the engine is corrected Pluto gets ±20 h, so its stations show
  // as a range of days. When a window spans UK midnight the page shows the days.
  var APPROX_WINDOW_H = {
    mercury: 0.5,
    venus: 1,
    mars: 1,
    jupiter: 1,
    saturn: 1,
    uranus: 1.5,
    neptune: 2,
    pluto: 20,
  }
  function ukDayKey(date) {
    return ukParts(date, { year: 'numeric', month: '2-digit', day: '2-digit' })
  }
  /**
   * For an approximate event, the UK calendar days its uncertainty window
   * covers: one day normally, two when the window spans UK midnight.
   */
  function ukDaySpan(ev) {
    var t = +new Date(ev.tDate)
    var w = (APPROX_WINDOW_H[ev.body] || 4) * 3600000
    var a = new Date(t - w),
      b = new Date(t + w)
    return ukDayKey(a) === ukDayKey(b) ? [new Date(t)] : [a, b]
  }
  /**
   * "Sat 24 Oct, 08:13 BST"; approximate timings read "Around Sat 24 Oct (UK)",
   * or "Around 7–8 May (UK)" when the uncertainty spans UK midnight.
   */
  function formatUK(ev) {
    var d = new Date(ev.tDate)
    var day = ukParts(d, { weekday: 'short', day: 'numeric', month: 'short' })
    if (ev.approx) {
      var span = ukDaySpan(ev)
      if (span.length === 1)
        return (
          'Around ' +
          ukParts(span[0], { weekday: 'short', day: 'numeric', month: 'short' }) +
          ' (UK)'
        )
      var m0 = ukParts(span[0], { month: 'short' }),
        m1 = ukParts(span[1], { month: 'short' })
      var d0 = ukParts(span[0], { day: 'numeric' }),
        d1 = ukParts(span[1], { day: 'numeric' })
      return (
        'Around ' +
        (m0 === m1 ? d0 + '–' + d1 + ' ' + m1 : d0 + ' ' + m0 + '–' + d1 + ' ' + m1) +
        ' (UK)'
      )
    }
    return (
      day +
      ', ' +
      ukParts(d, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }) +
      ' ' +
      ukZone(d)
    )
  }
  function monthKeyUK(ev) {
    return ukParts(new Date(ev.tDate), { month: 'long', year: 'numeric' })
  }
  /** "in 3 days, 4 hours" style countdown; null once passed. */
  function countdown(target, now, approx) {
    var ms = +target - +(now == null ? Date.now() : now)
    if (ms <= 0) return null
    if (approx) {
      // Slow turning points are dated to the day, so the countdown is rounded too.
      var hrs = Math.round(ms / 3600000),
        days = Math.round(ms / DAY_MS)
      // Clamp first, then choose the noun, so under 30 min reads "about 1 hour".
      var h1 = Math.max(1, hrs)
      if (hrs < 36) return 'about ' + h1 + ' hour' + (h1 === 1 ? '' : 's')
      return 'about ' + days + ' days'
    }
    var mins = Math.floor(ms / 60000),
      d = Math.floor(mins / 1440),
      h = Math.floor((mins % 1440) / 60),
      m = mins % 60
    var plural = function (n, w) {
      return n + ' ' + w + (n === 1 ? '' : 's')
    }
    if (d >= 1) return plural(d, 'day') + ', ' + plural(h, 'hour')
    if (h >= 1) return plural(h, 'hour') + ', ' + plural(m, 'minute')
    return plural(Math.max(1, m), 'minute')
  }

  window.UpcomingSky = {
    build: build,
    nextEclipse: nextEclipse,
    classifyEclipse: classifyEclipse,
    formatUK: formatUK,
    ukDaySpan: ukDaySpan,
    APPROX_WINDOW_H: APPROX_WINDOW_H,
    monthKeyUK: monthKeyUK,
    ukZone: ukZone,
    countdown: countdown,
    TYPE_LABELS: TYPE_LABELS,
  }
})()
