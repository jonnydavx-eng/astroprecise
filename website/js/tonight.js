/**
 * Astro Precise — Tonight's Sky
 * ----------------------------------------------------------------------------
 * window.TonightSky — "What's visible tonight" computer.
 *
 * Everything here runs in the visitor's browser. Given a location (latitude,
 * longitude) and a date, it works out — from real astronomy (AstroEphemeris,
 * VSOP87/ELP2000 + Meeus) — which naked-eye planets are above the horizon /
 * visible after sunset tonight, the Moon's phase and illumination, and the
 * approximate sunset and twilight times.
 *
 * Honesty note (per the project ethos): the visibility and rise/set times are
 * GOOD APPROXIMATIONS, not observatory-grade predictions. They assume a flat,
 * unobstructed horizon at sea level and ignore atmospheric refraction beyond a
 * standard sunset depression, your local terrain, light pollution and weather.
 * The numbers are real (computed from the actual sky), but treat the minute
 * marks as "about" and the visibility as "should be findable, sky permitting".
 *
 * Public API:
 *   TonightSky.computeTonight(lat, lon, date?)  -> report object
 *   TonightSky.formatLocalTime(date, tz?)       -> "21:43" style HH:MM
 *
 * Depends on: window.AstroEphemeris (ephemeris.js).
 * ==========================================================================*/
(function () {
  'use strict';

  var DEG = Math.PI / 180;
  var RAD = 180 / Math.PI;

  function E() { return window.AstroEphemeris; }

  // --- small math helpers (self-contained so the module is testable in Node) -
  function mod360(x) { return ((x % 360) + 360) % 360; }
  function modHours(x) { return ((x % 24) + 24) % 24; }
  function sind(d) { return Math.sin(d * DEG); }
  function cosd(d) { return Math.cos(d * DEG); }
  function tand(d) { return Math.tan(d * DEG); }
  function asind(x) { return Math.asin(Math.max(-1, Math.min(1, x))) * RAD; }

  // -------------------------------------------------------------------------
  // Ecliptic (lon, lat) -> equatorial (RA hours, Dec degrees).
  // eps is the obliquity of the ecliptic in degrees.
  // -------------------------------------------------------------------------
  function eclipticToEquatorial(lon, lat, eps) {
    var sinDec = sind(lat) * cosd(eps) + cosd(lat) * sind(eps) * sind(lon);
    var dec = asind(sinDec);
    var y = sind(lon) * cosd(eps) - tand(lat) * sind(eps);
    var x = cosd(lon);
    var ra = mod360(Math.atan2(y, x) * RAD); // degrees
    return { ra: ra / 15, dec: dec };        // RA in hours, Dec in degrees
  }

  // -------------------------------------------------------------------------
  // Altitude (degrees) of a body of declination `dec` (deg) and right
  // ascension `raHours` (hours) seen from latitude `lat` (deg) at the moment
  // whose Greenwich sidereal time corresponds to Julian Day `jd`, observer at
  // longitude `lon` (deg, east positive). Standard spherical-astronomy formula
  // sin(alt) = sin(lat)sin(dec) + cos(lat)cos(dec)cos(H).
  // -------------------------------------------------------------------------
  function altitudeAt(jd, lat, lon, raHours, dec) {
    var lst = E().localSiderealTime(jd, lon);       // degrees
    var H = mod360(lst - raHours * 15);             // hour angle, degrees
    var sinAlt = sind(lat) * sind(dec) + cosd(lat) * cosd(dec) * cosd(H);
    return asind(sinAlt);
  }

  // -------------------------------------------------------------------------
  // Hour angle (degrees, 0..180) at which a body of declination `dec` reaches
  // altitude `h0` from latitude `lat`. Returns null when the body never
  // reaches that altitude (circumpolar above, or never rises that high).
  // cos(H) = (sin(h0) - sin(lat)sin(dec)) / (cos(lat)cos(dec))
  // -------------------------------------------------------------------------
  function hourAngleForAltitude(lat, dec, h0) {
    var denom = cosd(lat) * cosd(dec);
    if (Math.abs(denom) < 1e-12) return null;
    var cosH = (sind(h0) - sind(lat) * sind(dec)) / denom;
    if (cosH > 1) return null;   // never rises this high
    if (cosH < -1) return null;  // always above this altitude (circumpolar)
    return Math.acos(cosH) * RAD;
  }

  // -------------------------------------------------------------------------
  // Sun events for the local civil day containing `date`, at (lat, lon).
  // Computes, for "today", the UTC instants of:
  //   sunset            (Sun centre at -0.833°, allowing for refraction+radius)
  //   civil twilight end   (-6°)
  //   nautical twilight end(-12°)
  //   astronomical end     (-18°)
  // Uses a noon Sun position (good enough for the day's RA/Dec) and the
  // standard set-time hour-angle formula. Returns Date objects (UTC) or null
  // when the event does not occur (polar day/night).
  // -------------------------------------------------------------------------
  function sunEvents(date, lat, lon) {
    var eph = E();
    // Local solar noon, approximately: 12:00 local apparent ~ when the Sun
    // transits. We build a JD for ~local noon to sample the Sun's daily RA/Dec.
    var y = date.getUTCFullYear(), m = date.getUTCMonth() + 1, d = date.getUTCDate();
    // Approximate local noon in UT = 12:00 - lon/15 hours.
    var noonUT = 12 - lon / 15;
    var jdNoon = eph.julianDay(y, m, d, 0, 0, 0) + noonUT / 24;

    var T = (jdNoon - 2451545.0) / 36525;
    var eps = eph.obliquityOfEcliptic(T);
    var sun = eph.sunPosition(jdNoon);
    var eq = eclipticToEquatorial(sun.lon, 0, eps);
    var dec = eq.dec;
    var raHours = eq.ra;

    // Equation of time via the Sun's RA vs mean Sun. Transit (local apparent
    // noon) occurs when LST = Sun RA, i.e. GST = RA - lon. Solve for UT.
    // GST(jd) is what AstroEphemeris.greenwichSiderealTime gives.
    function transitUT() {
      // Greenwich hour angle of Sun = GST - RA. We want local: LHA=0 ->
      // GST = RA - lon (deg). Find UT on this date giving that GST.
      var targetGST = mod360(raHours * 15 - lon);
      var gst0 = eph.greenwichSiderealTime(eph.julianDay(y, m, d, 0, 0, 0)); // at 0h UT
      var dGST = mod360(targetGST - gst0);
      // sidereal hours -> solar hours (1.0027379 sidereal per solar hour)
      var ut = (dGST / 15) / 1.0027379093;
      return modHours(ut);
    }

    function eventForAltitude(h0) {
      var H = hourAngleForAltitude(lat, dec, h0); // degrees, set-side
      if (H === null) return null;
      var setHA = H / 15 / 1.0027379093;          // hour angle in solar hours
      var transit = transitUT();
      var setUT = modHours(transit + setHA);
      // Build the UTC Date. setUT is hours-after-0hUT on (y,m,d) — but events
      // after midnight UT need the day to roll; using base date + ms handles it.
      var base = Date.UTC(y, m - 1, d, 0, 0, 0);
      return new Date(base + setUT * 3600 * 1000);
    }

    return {
      jdNoon: jdNoon,
      sunDec: dec,
      sunset: eventForAltitude(-0.833),
      civilEnd: eventForAltitude(-6),
      nauticalEnd: eventForAltitude(-12),
      astronomicalEnd: eventForAltitude(-18),
    };
  }

  // -------------------------------------------------------------------------
  // Moon phase + illumination for `date` (uses midnight-UT-ish sample of date).
  // Phase angle from Sun/Moon elongation; illuminated fraction = (1+cos(i))/2
  // where i is the phase angle (Sun-Moon-Earth). We approximate i with the
  // geocentric elongation, which is the standard simple model and good to ~1%.
  // -------------------------------------------------------------------------
  function moonInfo(jd) {
    var eph = E();
    var sun = eph.sunPosition(jd);
    var moon = eph.moonPosition(jd);
    var elong = mod360(moon.lon - sun.lon); // 0..360 along the cycle
    // Illuminated fraction (Meeus 48.1 simplified): use elongation as phase angle.
    var illum = (1 - cosd(elong)) / 2; // 0 at new (elong 0), 1 at full (180)
    var waxing = elong < 180;
    var name = phaseName(elong);
    return {
      lon: moon.lon,
      sign: eph.signOf(moon.lon),
      degInSign: eph.degreeInSign(moon.lon),
      elongation: elong,
      illumination: illum,        // 0..1
      illuminationPct: illum * 100,
      waxing: waxing,
      phaseName: name,
      phaseGlyph: phaseGlyph(name),
      ageDays: elong / 360 * 29.530588853,
    };
  }

  function phaseName(elong) {
    // 8 principal phases, 45° windows centred on the principal points.
    if (elong < 22.5 || elong >= 337.5) return 'New Moon';
    if (elong < 67.5)  return 'Waxing Crescent';
    if (elong < 112.5) return 'First Quarter';
    if (elong < 157.5) return 'Waxing Gibbous';
    if (elong < 202.5) return 'Full Moon';
    if (elong < 247.5) return 'Waning Gibbous';
    if (elong < 292.5) return 'Last Quarter';
    return 'Waning Crescent';
  }

  function phaseGlyph(name) {
    var G = {
      'New Moon': '<svg class="eng-i"><use href="#ei-moon0"/></svg>',
      'Waxing Crescent': '<svg class="eng-i"><use href="#ei-moon1"/></svg>',
      'First Quarter': '<svg class="eng-i"><use href="#ei-moon2"/></svg>',
      'Waxing Gibbous': '<svg class="eng-i"><use href="#ei-moon3"/></svg>',
      'Full Moon': '<svg class="eng-i"><use href="#ei-moon4"/></svg>',
      'Waning Gibbous': '<svg class="eng-i"><use href="#ei-moon5"/></svg>',
      'Last Quarter': '<svg class="eng-i"><use href="#ei-moon6"/></svg>',
      'Waning Crescent': '<svg class="eng-i"><use href="#ei-moon7"/></svg>',
    };
    return G[name] || '<svg class="eng-i"><use href="#ei-moon0"/></svg>';
  }

  // -------------------------------------------------------------------------
  // The five naked-eye planets (Mercury..Saturn). Order = brightness-ish /
  // classical order for display.
  // -------------------------------------------------------------------------
  var NAKED_EYE = [
    { key: 'mercury', name: 'Mercury', glyph: '☿' },
    { key: 'venus',   name: 'Venus',   glyph: '♀' },
    { key: 'mars',    name: 'Mars',    glyph: '♂' },
    { key: 'jupiter', name: 'Jupiter', glyph: '♃' },
    { key: 'saturn',  name: 'Saturn',  glyph: '♄' },
  ];

  // -------------------------------------------------------------------------
  // Main: compute tonight's report.
  //   lat, lon : degrees (lon east-positive)
  //   date     : a Date (defaults to now). Only its calendar day matters for
  //              "tonight"; we anchor the evening window to today's sunset.
  // -------------------------------------------------------------------------
  function computeTonight(lat, lon, date) {
    var eph = E();
    if (!eph || !eph.sunPosition) throw new Error('AstroEphemeris not loaded');
    lat = +lat; lon = +lon;
    if (!isFinite(lat) || lat < -90 || lat > 90) throw new RangeError('latitude out of range');
    if (!isFinite(lon) || lon < -180 || lon > 180) throw new RangeError('longitude out of range');
    date = date || new Date();

    var sun = sunEvents(date, lat, lon);

    // Evening sampling window: from sunset to the end of astronomical twilight
    // (or +2h after sunset if twilight never ends — high summer). We scan this
    // window in 10-minute steps and, for each planet, record its peak altitude
    // and whether it is up while the sky is dark enough to see it.
    var startDate = sun.sunset;
    var endDate = sun.astronomicalEnd;
    if (!startDate) {
      // No sunset today (polar day or polar night). Fall back to local
      // "evening" centred near local 21:00 so we still say something honest.
      var y = date.getUTCFullYear(), m = date.getUTCMonth() + 1, d = date.getUTCDate();
      var ut21 = 21 - lon / 15;
      startDate = new Date(Date.UTC(y, m - 1, d, 0, 0, 0) + ut21 * 3600 * 1000);
      endDate = new Date(startDate.getTime() + 3 * 3600 * 1000);
    }
    if (!endDate || endDate.getTime() <= startDate.getTime()) {
      endDate = new Date(startDate.getTime() + 2 * 3600 * 1000);
    }
    // Cap the window at 5 hours so very high-latitude long twilights don't
    // produce a giant scan.
    if (endDate.getTime() - startDate.getTime() > 5 * 3600 * 1000) {
      endDate = new Date(startDate.getTime() + 5 * 3600 * 1000);
    }

    var stepMs = 10 * 60 * 1000;
    var samples = [];
    for (var t = startDate.getTime(); t <= endDate.getTime(); t += stepMs) {
      samples.push(t);
    }
    if (samples.length === 0) samples.push(startDate.getTime());

    function jdOf(ms) {
      var dd = new Date(ms);
      return eph.julianDay(dd.getUTCFullYear(), dd.getUTCMonth() + 1, dd.getUTCDate(),
        dd.getUTCHours(), dd.getUTCMinutes(), dd.getUTCSeconds());
    }

    var planets = NAKED_EYE.map(function (p) {
      var jdStart = jdOf(startDate.getTime());
      var Tstart = (jdStart - 2451545.0) / 36525;
      var eps = eph.obliquityOfEcliptic(Tstart);

      // Position at sunset (for sign/degree label — barely moves over an evening).
      var pos = eph.planetLongitude(p.key, jdStart);
      var sign = eph.signOf(pos);
      var degInSign = eph.degreeInSign(pos);
      var retro = eph.isRetrograde(p.key, jdStart);

      // Scan the evening for peak altitude and altitude at sunset.
      var altAtSunset = null;
      var peakAlt = -90, peakMs = startDate.getTime();
      for (var i = 0; i < samples.length; i++) {
        var ms = samples[i];
        var jd = jdOf(ms);
        // recompute the planet's ecliptic coords sparsely (every sample is fine)
        var lonP = eph.planetLongitude(p.key, jd);
        // planet ecliptic latitude: use the full position function via the engine
        var full = planetEclLat(eph, p.key, jd);
        var eq = eclipticToEquatorial(lonP, full, eps);
        var alt = altitudeAt(jd, lat, lon, eq.ra, eq.dec);
        if (i === 0) altAtSunset = alt;
        if (alt > peakAlt) { peakAlt = alt; peakMs = ms; }
      }

      // Visible if it clears a practical minimum altitude (5°) at some point in
      // the post-sunset window while the sky is darkening.
      var visible = peakAlt >= 5;
      var upAtSunset = altAtSunset !== null && altAtSunset >= 0;

      return {
        key: p.key,
        name: p.name,
        glyph: p.glyph,
        sign: sign,
        degInSign: degInSign,
        retrograde: retro,
        altAtSunset: altAtSunset,
        peakAltitude: peakAlt,
        peakTime: new Date(peakMs),
        visible: visible,
        upAtSunset: upAtSunset,
      };
    });

    var moon = moonInfo(jdOf(startDate.getTime()));
    // Moon altitude this evening (peak) for an "is the Moon up tonight" note.
    var moonUp = false, moonPeakAlt = -90;
    {
      var jdMS = jdOf(startDate.getTime());
      var TmS = (jdMS - 2451545.0) / 36525;
      var epsM = eph.obliquityOfEcliptic(TmS);
      for (var k = 0; k < samples.length; k++) {
        var mms = samples[k];
        var mjd = jdOf(mms);
        var mp = eph.moonPosition(mjd);
        var meq = eclipticToEquatorial(mp.lon, mp.lat, epsM);
        var malt = altitudeAt(mjd, lat, lon, meq.ra, meq.dec);
        if (malt > moonPeakAlt) moonPeakAlt = malt;
      }
      moonUp = moonPeakAlt >= 0;
    }
    moon.up = moonUp;
    moon.peakAltitude = moonPeakAlt;

    var visibleCount = planets.filter(function (p) { return p.visible; }).length;

    return {
      lat: lat,
      lon: lon,
      date: date,
      sun: {
        sunset: sun.sunset,
        civilTwilightEnd: sun.civilEnd,
        nauticalTwilightEnd: sun.nauticalEnd,
        astronomicalTwilightEnd: sun.astronomicalEnd,
        declination: sun.sunDec,
      },
      window: { start: startDate, end: endDate },
      planets: planets,
      visiblePlanets: planets.filter(function (p) { return p.visible; }),
      visibleCount: visibleCount,
      moon: moon,
      approximate: true,
    };
  }

  // Get a planet's geocentric ecliptic latitude from the engine's position fn.
  function planetEclLat(eph, key, jd) {
    var fnMap = {
      mercury: eph.mercuryPosition, venus: eph.venusPosition, mars: eph.marsPosition,
      jupiter: eph.jupiterPosition, saturn: eph.saturnPosition,
    };
    var fn = fnMap[key];
    if (typeof fn === 'function') {
      var r = fn(jd);
      return (r && isFinite(r.lat)) ? r.lat : 0;
    }
    return 0;
  }

  // -------------------------------------------------------------------------
  // Format a UTC Date as a local HH:MM string in IANA timezone `tz`. If tz is
  // omitted, uses the browser's local zone.
  // -------------------------------------------------------------------------
  function formatLocalTime(d, tz) {
    if (!d || isNaN(d.getTime())) return '—';
    try {
      var opts = { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' };
      if (tz) opts.timeZone = tz;
      return new Intl.DateTimeFormat('en-GB', opts).format(d);
    } catch (e) {
      return d.toISOString().slice(11, 16);
    }
  }

  window.TonightSky = {
    computeTonight: computeTonight,
    formatLocalTime: formatLocalTime,
    moonInfo: moonInfo,
    sunEvents: sunEvents,
    // low-level helpers exposed for testing / reuse
    eclipticToEquatorial: eclipticToEquatorial,
    altitudeAt: altitudeAt,
    hourAngleForAltitude: hourAngleForAltitude,
    NAKED_EYE: NAKED_EYE,
  };
})();
