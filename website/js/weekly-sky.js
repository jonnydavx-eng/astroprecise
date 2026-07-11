/**
 * Weekly Sky — deterministic seven-day sky calendar.
 * Computes Moon phases, sign ingresses, retrograde stations and exact
 * aspects for a UTC-anchored week, entirely on-device via AstroEphemeris.
 *
 * Honesty notes baked into the data:
 *  - Moon-phase instants (ELP2000) are good to a few minutes → shown to the minute.
 *  - Outer-planet ingresses/stations ride truncated series → flagged `approx`
 *    and rendered as "around <day>".
 *  - The week is anchored to the UTC Monday so every visitor sees the same
 *    list for the same civil week; only the displayed times are local.
 */
(function () {
  'use strict';

  var PLANET_NAMES = {
    sun: 'Sun', moon: 'Moon', mercury: 'Mercury', venus: 'Venus', mars: 'Mars',
    jupiter: 'Jupiter', saturn: 'Saturn', uranus: 'Uranus', neptune: 'Neptune', pluto: 'Pluto',
  };
  var INGRESS_BODIES = ['sun', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
  var STATION_BODIES = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
  var ASPECT_BODIES = INGRESS_BODIES; // Moon excluded — phases + the Moon strip cover it
  // Slow-body weight × aspect gravity ranks "notable" — outer-planet contacts float up
  var BODY_WEIGHT = { sun: 1, mercury: 1, venus: 1.5, mars: 2, jupiter: 3, saturn: 3.5, uranus: 4, neptune: 4, pluto: 4 };
  var ASPECT_GRAVITY = { conjunction: 3, opposition: 2.8, square: 2.4, trine: 2.2, sextile: 1.4 };
  var APPROX_BODIES = { jupiter: 1, saturn: 1, uranus: 1, neptune: 1, pluto: 1 };
  var PHASE_TARGETS = [
    { angle: 0, name: 'New Moon' },
    { angle: 90, name: 'First Quarter' },
    { angle: 180, name: 'Full Moon' },
    { angle: 270, name: 'Last Quarter' },
  ];

  function E() { return window.AstroEphemeris; }

  // ── time helpers ─────────────────────────────────────────────────────────
  function jdFromDateUTC(date) {
    return E().julianDay(
      date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(),
      date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds()
    );
  }
  function jdToDate(jd) {
    return new Date(Math.round((jd - 2440587.5) * 86400000));
  }
  /** UTC Monday 00:00 of the week containing `date` → {jdStart, jdEnd, start, end}. */
  function computeWeek(date) {
    var d = date instanceof Date ? date : new Date(date);
    var dow = d.getUTCDay(); // 0=Sun..6=Sat
    var back = (dow + 6) % 7; // days since Monday
    var mondayMs = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - back);
    var start = new Date(mondayMs);
    var jdStart = jdFromDateUTC(start);
    return { jdStart: jdStart, jdEnd: jdStart + 7, start: start, end: new Date(mondayMs + 7 * 86400000) };
  }

  // ── math helpers ─────────────────────────────────────────────────────────
  function wrap180(x) {
    var m = E().mod360(x);
    return m > 180 ? m - 360 : m;
  }
  /** Bisect f (signed, continuous through the root) on [a,b] where f(a),f(b) differ in sign. */
  function bisect(f, a, b, iters) {
    var fa = f(a);
    for (var i = 0; i < (iters || 22); i++) {
      var mid = (a + b) / 2;
      var fm = f(mid);
      if (fa * fm <= 0) { b = mid; } else { a = mid; fa = fm; }
    }
    return (a + b) / 2;
  }

  // ── event finders ────────────────────────────────────────────────────────
  function elongation(jd) {
    return E().mod360(E().moonPosition(jd).lon - E().sunPosition(jd).lon);
  }

  function findMoonPhases(week) {
    var out = [];
    PHASE_TARGETS.forEach(function (t) {
      var f = function (jd) { return wrap180(elongation(jd) - t.angle); };
      var step = 0.25; // 6 h — Moon-Sun elongation moves ~3° per step
      var prev = f(week.jdStart);
      for (var jd = week.jdStart + step; jd <= week.jdEnd + 1e-9; jd += step) {
        var cur = f(jd);
        if (prev * cur <= 0 && Math.abs(prev) < 90 && Math.abs(cur) < 90) {
          var tJD = bisect(f, jd - step, jd);
          if (tJD >= week.jdStart && tJD < week.jdEnd) {
            var lon = E().moonPosition(tJD).lon;
            out.push({
              kind: 'phase', tJD: tJD, tDate: jdToDate(tJD), approx: false,
              name: t.name, sign: E().signOf(lon), deg: Math.floor(E().degreeInSign(lon)),
            });
          }
        }
        prev = cur;
      }
    });
    return out;
  }

  function signIndex(body, jd) {
    return Math.floor(E().mod360(E().planetLongitude(body, jd)) / 30);
  }

  function findIngresses(week, bodies, stepDays) {
    var out = [];
    bodies.forEach(function (body) {
      var step = stepDays || 1;
      var prevIdx = signIndex(body, week.jdStart);
      for (var jd = week.jdStart + step; jd <= week.jdEnd + 1e-9; jd += step) {
        var idx = signIndex(body, jd);
        if (idx !== prevIdx) {
          var lo = jd - step, hi = jd, from = prevIdx;
          // bisect on "has the sign index changed yet"
          for (var i = 0; i < 22; i++) {
            var mid = (lo + hi) / 2;
            if (signIndex(body, mid) === from) lo = mid; else hi = mid;
          }
          var tJD = hi;
          if (tJD >= week.jdStart && tJD < week.jdEnd) {
            var retro = E().isRetrograde(body, tJD);
            out.push({
              kind: 'ingress', tJD: tJD, tDate: jdToDate(tJD),
              approx: !!APPROX_BODIES[body] || body === 'pluto',
              body: body, planet: PLANET_NAMES[body], retro: retro,
              fromSign: E().SIGNS[from], sign: E().SIGNS[signIndex(body, tJD + 1e-4)],
            });
          }
          prevIdx = idx;
        }
      }
    });
    return out;
  }

  function speed(body, jd) {
    return wrap180(E().planetLongitude(body, jd + 0.5) - E().planetLongitude(body, jd - 0.5));
  }

  function findStations(week) {
    var out = [];
    STATION_BODIES.forEach(function (body) {
      var prev = speed(body, week.jdStart);
      for (var jd = week.jdStart + 1; jd <= week.jdEnd + 1e-9; jd += 1) {
        var cur = speed(body, jd);
        if (prev * cur <= 0 && (prev !== 0 || cur !== 0)) {
          var f = function (x) { return speed(body, x); };
          var tJD = bisect(f, jd - 1, jd, 16);
          if (tJD >= week.jdStart && tJD < week.jdEnd) {
            var lon = E().planetLongitude(body, tJD);
            out.push({
              kind: 'station', tJD: tJD, tDate: jdToDate(tJD), approx: true,
              body: body, planet: PLANET_NAMES[body],
              toRetro: prev > 0, sign: E().signOf(lon), deg: Math.floor(E().degreeInSign(lon)),
            });
          }
        }
        prev = cur;
      }
    });
    return out;
  }

  function separation(a, b, jd) {
    var d = E().mod360(E().planetLongitude(a, jd) - E().planetLongitude(b, jd));
    return d > 180 ? 360 - d : d;
  }

  function findExactAspects(week, cap) {
    var found = [];
    // majors only — minor aspects (semisextile, sesquiquadrate…) are too frequent to be "notable"
    var defs = E().ASPECT_DEFS.filter(function (d) { return ASPECT_GRAVITY[d.name]; });
    for (var i = 0; i < ASPECT_BODIES.length; i++) {
      for (var j = i + 1; j < ASPECT_BODIES.length; j++) {
        (function (a, b) {
          defs.forEach(function (def) {
            var f = function (jd) { return separation(a, b, jd) - def.angle; };
            var prev = f(week.jdStart);
            for (var jd = week.jdStart + 1; jd <= week.jdEnd + 1e-9; jd += 1) {
              var cur = f(jd);
              if (prev * cur <= 0 && Math.abs(prev) < 15 && Math.abs(cur) < 15) {
                var tJD = bisect(f, jd - 1, jd);
                if (tJD >= week.jdStart && tJD < week.jdEnd) {
                  var score = (BODY_WEIGHT[a] + BODY_WEIGHT[b]) * (ASPECT_GRAVITY[def.name] || 1);
                  found.push({
                    kind: 'aspect', tJD: tJD, tDate: jdToDate(tJD),
                    approx: !!(APPROX_BODIES[a] || APPROX_BODIES[b]),
                    bodyA: a, bodyB: b, planetA: PLANET_NAMES[a], planetB: PLANET_NAMES[b],
                    aspect: def.name, angle: def.angle, score: score,
                    signA: E().signOf(E().planetLongitude(a, tJD)),
                    signB: E().signOf(E().planetLongitude(b, tJD)),
                  });
                }
              }
              prev = cur;
            }
          });
        })(ASPECT_BODIES[i], ASPECT_BODIES[j]);
      }
    }
    found.sort(function (x, y) { return y.score - x.score || x.tJD - y.tJD; });
    return found.slice(0, cap || 5);
  }

  // ── plain-language one-liners (observational + lightly interpretive) ─────
  var ASPECT_TONE = {
    conjunction: 'their themes merge and start a shared cycle',
    opposition: 'two pulls face each other across the sky — balance is the work',
    square: 'a friction angle — the tension asks for adjustment',
    trine: 'an easy angle — things flow with little pushing',
    sextile: 'a soft opening — useful if you act on it',
  };
  function oneLiner(ev) {
    if (ev.kind === 'phase') {
      if (ev.name === 'New Moon') return 'The Moon and Sun meet in ' + ev.sign + ' — a dark sky, and by tradition a clean slate.';
      if (ev.name === 'Full Moon') return 'The Moon stands opposite the Sun, fully lit in ' + ev.sign + ' — the month’s peak of visibility.';
      if (ev.name === 'First Quarter') return 'Half-lit and waxing in ' + ev.sign + ' — the traditional push-through point of the lunar cycle.';
      return 'Half-lit and waning in ' + ev.sign + ' — the cycle’s winding-down turn.';
    }
    if (ev.kind === 'ingress') {
      if (ev.body === 'sun') return 'The Sun crosses into ' + ev.sign + ' — the season’s tone shifts.';
      if (ev.retro) return ev.planet + ' backs out of ' + ev.fromSign + ' into ' + ev.sign + ' (retrograde) — revisiting old ground.';
      return ev.planet + ' leaves ' + ev.fromSign + ' for ' + ev.sign + ' — a change of register for everything ' + ev.planet + ' touches.';
    }
    if (ev.kind === 'station') {
      if (ev.toRetro) return ev.planet + ' pauses at ' + ev.deg + '° ' + ev.sign + ' and turns retrograde — its apparent motion reverses.';
      return ev.planet + ' stations direct at ' + ev.deg + '° ' + ev.sign + ' — forward motion resumes.';
    }
    if (ev.kind === 'aspect') {
      return ev.planetA + ' ' + ev.aspect.toLowerCase() + ' ' + ev.planetB + ' is exact (' + ev.angle + '°) — ' + (ASPECT_TONE[ev.aspect] || 'a precise geometric alignment') + '.';
    }
    return '';
  }
  function title(ev) {
    if (ev.kind === 'phase') return ev.name + ' in ' + ev.sign;
    if (ev.kind === 'ingress') return ev.planet + (ev.retro ? ' re-enters ' : ' enters ') + ev.sign;
    if (ev.kind === 'station') return ev.planet + (ev.toRetro ? ' stations retrograde' : ' stations direct');
    if (ev.kind === 'aspect') return ev.planetA + ' ' + ev.aspect.toLowerCase() + ' ' + ev.planetB;
    return '';
  }

  // ── public API ───────────────────────────────────────────────────────────
  /**
   * Full report for the UTC week containing `date`.
   * Deterministic: same civil week → same events for every visitor.
   */
  function buildWeekReport(date) {
    var week = computeWeek(date || new Date());
    var events = []
      .concat(findMoonPhases(week))
      .concat(findIngresses(week, INGRESS_BODIES, 1))
      .concat(findStations(week))
      .concat(findExactAspects(week, 5));
    events.forEach(function (ev) { ev.title = title(ev); ev.note = oneLiner(ev); });
    events.sort(function (a, b) { return a.tJD - b.tJD; });
    var moonStrip = findIngresses(week, ['moon'], 0.25).map(function (ev) {
      ev.title = 'Moon enters ' + ev.sign;
      ev.note = '';
      ev.approx = false;
      return ev;
    });
    return {
      weekStart: week.start,
      weekEnd: new Date(week.end.getTime() - 1), // inclusive Sunday
      events: events,
      moonStrip: moonStrip,
      empty: events.length === 0,
    };
  }

  window.WeeklySky = {
    buildWeekReport: buildWeekReport,
    computeWeek: computeWeek,
    jdToDate: jdToDate,
    // exposed for tests
    _findMoonPhases: findMoonPhases,
    _findIngresses: findIngresses,
    _findStations: findStations,
    _findExactAspects: findExactAspects,
    _elongation: elongation,
  };
})();
