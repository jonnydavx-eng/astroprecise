/**
 * Sky card — one keepable 1080 × 1440 plate of a single birth minute.
 *
 * The honesty rules this file exists to enforce:
 *
 *   · A birth zone is a real IANA zone. UTC, GMT, Etc/UTC and Etc/GMT* are
 *     refused, because "09:12 UTC" is not the minute anyone was born at in
 *     Manchester in March — this page used to read the clock field as UTC and
 *     print "09:12 UTC" on the card, which was wrong by an hour every summer.
 *   · The card prints the date, the town, the clock time, the zone AND the UT
 *     it was computed from, so the moment on the plate can be checked.
 *   · An unknown hour is never quietly turned into noon. The card is still
 *     drawn, but it says which hour was assumed, that the Moon may be a sign
 *     out, and that the rising sign and houses are missing rather than guessed.
 *   · Day or night is computed from the Sun's altitude at that place, never
 *     inferred from the clock, and only stated when the hour is known. Nothing
 *     is captioned "night" unless the Sun really was below the horizon.
 *   · Only the town text typed into the place field reaches Open-Meteo. The
 *     date and time stay in this tab.
 *
 * The minute may arrive from `ap-sky-card-handoff` (sessionStorage, written by
 * js/ap-keep-minute.js) or from a locally saved chart. It is never read from
 * the address bar: a birth moment in a query string lands in access logs, in
 * Referer headers and in the visitor's own synced history.
 */
(function () {
  'use strict';

  var RAD = Math.PI / 180;
  var HANDOFF_KEY = 'ap-sky-card-handoff';
  var GEOCODER = 'https://geocoding-api.open-meteo.com/v1/search';
  var ASSUMED_HOUR = '12:00';

  /* Glyphs are drawn from code: APGlyphs.image() returns the house SVG for each
     planet and sign, and the card paints those images. No Unicode astrology
     code points, so no emoji badges and no font fallback squares (step 10b). */
  var SIGN_KEYS = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
    'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
  var WHEEL_BODIES = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
  var LIGHTS = [['sun', 'Sun'], ['moon', 'Moon'], ['venus', 'Venus']];

  /* Canvas cannot read CSS custom properties, so the Paper & Night tokens are
     repeated here as literals. Keep them in step with css/ap-tokens.css. */
  var PAPER = '#F6F3EC';
  var CARD = '#FBF9F4';
  var RULE = '#D6D1C6';
  var INK = '#0E1116';
  var GRAPHITE = '#3A3F47';
  var MUTED = '#5C6168';
  var COPPER = '#B4693E';
  var COPPER_INK = '#8A4A24';
  var NIGHT = '#0E1116';
  var ALERT = '#A64526';

  var SERIF = '"AP Serif", "Instrument Serif", "Times New Roman", serif';
  var SANS = '"AP Sans", Inter, system-ui, -apple-system, "Segoe UI", sans-serif';
  /* The card is a 1080 × 1440 portrait plate (step 10c; it was 1200 × 630) and
     is mostly seen about 360 CSS px wide on a phone, so 1 unit is a third of a
     CSS px there. Nothing on the plate is set under 33 units, 11 px at 360. */
  var CARD_W = 1080;
  var CARD_H = 1440;
  var SKY_CARD_MIN_PX = 33;
  var FRAME = 32;
  var LEFT = 84;
  var RIGHT = 996;
  var COL = RIGHT - LEFT;
  var VALUE_X = 300;
  var ROW = 60;
  var FOOTER_RULE = 1200;
  var WHEEL_MIN_R = 150;
  var WHEEL_MAX_R = 214;

  var byId = function (id) { return document.getElementById(id); };

  var canvas = byId('skyCard');
  var ctx = canvas ? canvas.getContext('2d') : null;
  var form = byId('skyCardForm');
  var statusEl = byId('skyCardStatus');
  var ledgerEl = byId('skyCardLedger');
  var downloadBtn = byId('skyCardDownload');
  var shareBtn = byId('skyCardShare');
  var zoneNote = byId('sky-card-zone');
  var cityInput = byId('sky-card-city');
  var cityDrop = byId('sky-card-city-drop');

  var place = null;   // { name, lat, lon, tz } once a town has been picked
  var drawn = null;   // the last computed minute, kept for the PNG filename
  var liveCarry = false; // device-clock synchronicity handoff, not a birth minute

  function currentPattern(clockText) {
    if (!window.APMirrorHour) return null;
    return APMirrorHour.detectFromClock(clockText || (byId('tob') && byId('tob').value) || '');
  }

  function showSyncPanel(match, dateText) {
    var panel = byId('skySyncPanel');
    var label = byId('skySyncLabel');
    var folk = byId('skySyncFolk');
    var note = byId('skySyncNote');
    if (!panel) return;
    if (!match) {
      panel.hidden = true;
      return;
    }
    if (label) label.textContent = (window.APMirrorHour.cardLabel(match, dateText) || match.label);
    if (folk) folk.textContent = match.folk;
    if (note) note.textContent = window.APMirrorHour.HONESTY;
    panel.hidden = false;
  }

  /* The folk clock pattern, as one copper line in the card's running layout.
     Returns the next free baseline. */
  function paintSyncMark(match, dateText, y) {
    if (!match || !ctx) return y;
    var mark = window.APMirrorHour.cardLabel(match, dateText);
    ctx.textAlign = 'left';
    ctx.fillStyle = COPPER_INK;
    font('600', 33, SANS);
    spacing(1);
    y = wrapLines(mark + '  \u00B7  FOLK CLOCK PATTERN', LEFT, y, COL, 44, 2);
    spacing(0);
    return y;
  }

  // ── zone + time ───────────────────────────────────────────────────────────

  function validTimeZone(zone) {
    if (!zone || typeof zone !== 'string' || zone.length > 80) return false;
    // A birth zone names a place on Earth. UTC/GMT name an offset, so they
    // would silently drop daylight saving and shift the whole chart.
    if (zone === 'UTC' || zone === 'GMT' || zone === 'Etc/UTC' || /^Etc\//i.test(zone)) return false;
    try { new Intl.DateTimeFormat('en-GB', { timeZone: zone }).format(new Date()); return true; }
    catch (e) { return false; }
  }

  function zoneOffsetMinutes(zone, instant) {
    var parts = {};
    new Intl.DateTimeFormat('en-GB', {
      timeZone: zone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    }).formatToParts(instant).forEach(function (part) {
      if (part.type !== 'literal') parts[part.type] = part.value;
    });
    return (Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second) - instant.getTime()) / 60000;
  }

  /* Civil clock time in a zone → the UT instant. Iterated because the offset
     itself depends on the instant (a DST boundary is the whole point). */
  function civilToUTC(y, m, d, hh, mm, zone) {
    if (!validTimeZone(zone)) return null;
    var civilMs = Date.UTC(y, m - 1, d, hh, mm, 0);
    var utcMs = civilMs;
    for (var i = 0; i < 3; i += 1) utcMs = civilMs - zoneOffsetMinutes(zone, new Date(utcMs)) * 60000;
    var utc = new Date(utcMs);
    return isNaN(utc.getTime()) ? null : utc;
  }

  // ── astronomy ─────────────────────────────────────────────────────────────

  function engine() {
    var e = window.AstroEphemeris;
    return (e && e.calculateNatalChart && e.sunPosition) ? e : null;
  }

  /* Geometric altitude of the Sun's centre, Meeus ch. 13: the ecliptic Sun
     (latitude 0) converted to equatorial coordinates, then to the horizon at
     this observer. Refraction and observer height are NOT applied, which is
     why the card says so next to the number. */
  function sunAltitude(e, jd, lat, lon) {
    var eps = e.obliquityOfEcliptic((jd - 2451545) / 36525) * RAD;
    var lam = e.sunPosition(jd).lon * RAD;
    var ra = Math.atan2(Math.cos(eps) * Math.sin(lam), Math.cos(lam));
    var dec = Math.asin(Math.sin(eps) * Math.sin(lam));
    var h = e.localSiderealTime(jd, lon) * RAD - ra;
    var phi = lat * RAD;
    return Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(h)) / RAD;
  }

  function lightState(altitude) {
    if (altitude >= -0.833) return { label: 'Daylight', tone: COPPER_INK, night: false };
    if (altitude >= -6) return { label: 'Civil twilight', tone: COPPER_INK, night: false };
    if (altitude >= -12) return { label: 'Nautical twilight', tone: GRAPHITE, night: true };
    if (altitude >= -18) return { label: 'Astronomical twilight', tone: GRAPHITE, night: true };
    return { label: 'Night', tone: INK, night: true };
  }

  function lightSentence(light, altitude) {
    var above = altitude >= 0;
    return light.label + '. The Sun stood ' + Math.abs(altitude).toFixed(1) + '\u00B0 '
      + (above ? 'above' : 'below') + ' the horizon at that place '
      + '(geometric altitude of the Sun\u2019s centre; refraction not applied).';
  }

  function formatPosition(position) {
    var degree = Math.floor(position.degree);
    var minute = Math.round((position.degree - degree) * 60);
    if (minute === 60) { minute = 0; degree += 1; }
    return degree + '\u00B0' + String(minute).padStart(2, '0') + '\u2032 ' + position.sign
      + (position.retrograde ? ' \u211E' : '');
  }

  // ── the minute ────────────────────────────────────────────────────────────

  function readMinute() {
    var dateValue = (byId('dob').value || '').trim();
    var timeValue = (byId('tob').value || '').trim();
    if (!dateValue) return { error: 'Enter a birth date first.' };
    if (!place || !validTimeZone(place.tz)) {
      return { error: 'Pick the birth town from the list. A typed name is not a place, and UTC or GMT is not a birth zone.' };
    }
    var date = dateValue.split('-').map(Number);
    var timeKnown = Boolean(timeValue);
    var clock = (timeKnown ? timeValue : ASSUMED_HOUR).split(':').map(Number);
    if (![date[0], date[1], date[2], clock[0], clock[1]].every(Number.isFinite)) {
      return { error: 'That date or time looks malformed.' };
    }
    var e = engine();
    if (!e) return { error: 'The astronomy engine has not loaded yet. Try again in a moment.' };
    var ut = civilToUTC(date[0], date[1], date[2], clock[0], clock[1], place.tz);
    if (!ut) return { error: 'That town\u2019s zone could not be resolved. Pick it again.' };

    var chart;
    try {
      chart = e.calculateNatalChart(
        ut.getUTCFullYear(), ut.getUTCMonth() + 1, ut.getUTCDate(),
        ut.getUTCHours(), ut.getUTCMinutes(),
        place.lat, place.lon, 'equal', 'mean',
      );
    } catch (err) {
      return { error: 'That minute could not be computed: ' + (err && err.message ? err.message : 'unknown reason') + '.' };
    }

    var altitude = timeKnown ? sunAltitude(e, chart.jd, place.lat, place.lon) : null;
    return {
      chart: chart,
      timeKnown: timeKnown,
      clockText: timeKnown ? timeValue : ASSUMED_HOUR,
      utText: String(ut.getUTCHours()).padStart(2, '0') + ':' + String(ut.getUTCMinutes()).padStart(2, '0'),
      dateText: new Date(Date.UTC(date[0], date[1] - 1, date[2])).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
      }),
      isoDate: dateValue,
      place: place,
      altitude: altitude,
      light: altitude == null ? null : lightState(altitude),
    };
  }

  // ── the card ──────────────────────────────────────────────────────────────

  /* ── glyph images ── APGlyphs.image() markup, painted as images. */
  var glyphCache = {};
  function glyphKey(name, color) { return name + '|' + color; }
  function loadGlyph(name, color) {
    var key = glyphKey(name, color);
    if (glyphCache[key]) return Promise.resolve(glyphCache[key]);
    return new Promise(function (resolve) {
      var markup = window.APGlyphs && window.APGlyphs.image ? window.APGlyphs.image(name, color) : '';
      if (!markup) { resolve(null); return; }
      var image = new Image();
      image.onload = function () { glyphCache[key] = image; resolve(image); };
      image.onerror = function () { resolve(null); };
      image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(markup);
    });
  }
  function glyph(name, color, cx, cy, size) {
    var image = glyphCache[glyphKey(name, color)];
    if (image) {
      ctx.drawImage(image, cx - size / 2, cy - size / 2, size, size);
      return;
    }
    // Not loaded (APGlyphs missing): a small ring, never a fallback square.
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.22, 0, Math.PI * 2);
    ctx.stroke();
  }
  function cardAssetsReady() {
    var fonts = document.fonts && document.fonts.load
      ? Promise.all([
        document.fonts.load('400 96px ' + SERIF),
        document.fonts.load('italic 400 56px ' + SERIF),
        document.fonts.load('400 34px ' + SANS),
        document.fonts.load('500 33px ' + SANS),
        document.fonts.load('600 33px ' + SANS),
      ]).catch(function () { return null; })
      : Promise.resolve(null);
    var glyphs = [];
    WHEEL_BODIES.forEach(function (name) {
      glyphs.push(loadGlyph(name, INK), loadGlyph(name, GRAPHITE));
    });
    LIGHTS.forEach(function (row) { glyphs.push(loadGlyph(row[0], COPPER_INK)); });
    SIGN_KEYS.forEach(function (name) { glyphs.push(loadGlyph(name, MUTED)); });
    var all = Promise.all([fonts, Promise.all(glyphs)]);
    return Promise.race([all, new Promise(function (resolve) { setTimeout(resolve, 3000); })]);
  }

  /* Letter spacing where the canvas supports it (Chrome, Safari 17+); plain
     spacing elsewhere, so measureText and wrapping always agree. */
  function spacing(px) {
    if ('letterSpacing' in ctx) ctx.letterSpacing = px + 'px';
  }

  /* Every face on the card goes through here, so nothing can be set under
     the phone floor (SKY_CARD_MIN_PX). */
  function font(weight, px, family) {
    ctx.font = weight + ' ' + Math.max(SKY_CARD_MIN_PX, px) + 'px ' + family;
  }

  /* Set a line in the given weight, stepping the size down (never under the
     floor) until it fits the column. */
  function fitText(text, x, y, weight, px, family, maxWidth) {
    var size = Math.max(SKY_CARD_MIN_PX, px);
    font(weight, size, family);
    while (ctx.measureText(text).width > maxWidth && size > SKY_CARD_MIN_PX) {
      size -= 1;
      font(weight, size, family);
    }
    ctx.fillText(text, x, y);
    return size;
  }

  /* Split text into lines that fit maxWidth in the current font. A last line
     that would run past maxLines is shortened with an ellipsis. */
  function splitLines(text, maxWidth, maxLines) {
    var words = String(text || '').split(/\s+/).filter(Boolean);
    var lines = [];
    var line = '';
    for (var i = 0; i < words.length; i += 1) {
      var next = line ? line + ' ' + words[i] : words[i];
      if (ctx.measureText(next).width > maxWidth && line) {
        lines.push(line);
        line = words[i];
      } else line = next;
    }
    if (line) lines.push(line);
    if (maxLines && lines.length > maxLines) {
      var rest = lines.slice(maxLines - 1).join(' ');
      while (rest.length && ctx.measureText(rest + '\u2026').width > maxWidth) rest = rest.slice(0, -1);
      lines = lines.slice(0, maxLines - 1).concat([rest.trim() + '\u2026']);
    }
    return lines;
  }

  /* Draw wrapped lines from baseline y; returns the next free baseline. */
  function wrapLines(text, x, y, maxWidth, lineHeight, maxLines) {
    var lines = splitLines(text, maxWidth, maxLines);
    for (var i = 0; i < lines.length; i += 1) ctx.fillText(lines[i], x, y + i * lineHeight);
    return y + lines.length * lineHeight;
  }

  function star4(cx, cy, r) {
    var w = r * 0.22;
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.bezierCurveTo(cx + w * 0.35, cy - w, cx + w, cy - w * 0.35, cx + r, cy);
    ctx.bezierCurveTo(cx + w, cy + w * 0.35, cx + w * 0.35, cy + w, cx, cy + r);
    ctx.bezierCurveTo(cx - w * 0.35, cy + w, cx - w, cy + w * 0.35, cx - r, cy);
    ctx.bezierCurveTo(cx - w, cy - w * 0.35, cx - w * 0.35, cy - w, cx, cy - r);
    ctx.closePath();
    ctx.fill();
  }

  // The AstroPrecise mark: half paper, half night disc with a copper four-point star.
  function mark(cx, cy, size) {
    var r = size * 0.4;
    ctx.fillStyle = PAPER;
    ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI / 2, Math.PI * 1.5); ctx.fill();
    ctx.fillStyle = NIGHT;
    ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2); ctx.fill();
    ctx.strokeStyle = NIGHT;
    ctx.lineWidth = size * 0.04;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = COPPER;
    star4(cx + r * 0.42, cy - r * 0.26, r * 0.3);
  }

  function wordmark(x, baseline) {
    mark(x + 22, baseline - 14, 56);
    ctx.fillStyle = INK;
    font('400', 48, SERIF);
    ctx.fillText('AstroPrecise', x + 60, baseline);
  }

  function plate() {
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    spacing(0);
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, CARD_W, CARD_H);
    ctx.strokeStyle = RULE;
    ctx.lineWidth = 2;
    ctx.strokeRect(FRAME, FRAME, CARD_W - FRAME * 2, CARD_H - FRAME * 2);
  }

  function rule(y) {
    ctx.strokeStyle = RULE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(LEFT, y);
    ctx.lineTo(RIGHT, y);
    ctx.stroke();
  }

  function eyebrow(text, y) {
    ctx.fillStyle = COPPER_INK;
    font('600', 34, SANS);
    spacing(3);
    ctx.fillText(text, LEFT, y);
    spacing(0);
  }

  /* Footer: rule, wordmark, then the honesty line in two short lines so it
     stays at phone size. Returns the y of the rule (the content limit). */
  function footer(honesty) {
    rule(FOOTER_RULE);
    wordmark(LEFT, FOOTER_RULE + 64);
    if (!honesty) return FOOTER_RULE;
    ctx.fillStyle = MUTED;
    font('500', 33, SANS);
    spacing(1);
    honesty.forEach(function (line, index) {
      ctx.fillText(line, LEFT, FOOTER_RULE + 122 + index * 44);
    });
    spacing(0);
    return FOOTER_RULE;
  }

  function wheel(chart, cx, cy, radius) {
    var k = radius / 198;
    var point = function (lon, r) {
      var a = (180 - lon) * RAD;
      return [cx + r * k * Math.cos(a), cy - r * k * Math.sin(a)];
    };
    ctx.save();
    ctx.fillStyle = CARD;
    ctx.beginPath();
    ctx.arc(cx, cy, 198 * k, 0, Math.PI * 2);
    ctx.fill();
    [[198, GRAPHITE, 1.6], [168, RULE, 1.2], [100, RULE, 1.2]]
      .forEach(function (ring) {
        ctx.strokeStyle = ring[1];
        ctx.lineWidth = ring[2];
        ctx.beginPath();
        ctx.arc(cx, cy, ring[0] * k, 0, Math.PI * 2);
        ctx.stroke();
      });
    ctx.strokeStyle = RULE;
    ctx.lineWidth = 1.2;
    for (var s = 0; s < 12; s += 1) {
      var inner = point(s * 30, 168);
      var outer = point(s * 30, 198);
      ctx.beginPath();
      ctx.moveTo(inner[0], inner[1]);
      ctx.lineTo(outer[0], outer[1]);
      ctx.stroke();
      var at = point(s * 30 + 15, 183);
      glyph(SIGN_KEYS[s], MUTED, at[0], at[1], 22 * k);
    }
    var ordered = WHEEL_BODIES
      .filter(function (key) { return chart.positions[key]; })
      .sort(function (a, b) { return chart.positions[a].longitude - chart.positions[b].longitude; });
    ordered.forEach(function (key, index) {
      var lon = chart.positions[key].longitude;
      var tick = point(lon, 168);
      var seat = point(lon, index % 2 ? 122 : 146);
      // A leader line from the degree tick to the glyph: on a keepsake it must
      // be unambiguous which body sits at which longitude.
      ctx.strokeStyle = RULE;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(tick[0], tick[1]);
      ctx.lineTo(seat[0], seat[1]);
      ctx.stroke();
      ctx.fillStyle = COPPER;
      ctx.beginPath();
      ctx.arc(tick[0], tick[1], 3.5, 0, Math.PI * 2);
      ctx.fill();
      var light = key === 'sun' || key === 'moon' || key === 'venus';
      glyph(key, light ? INK : GRAPHITE, seat[0], seat[1], 26 * k);
    });
    ctx.restore();
  }

  /* The empty plate is the first thing a phone sees, so its type is set at
     phone size like the rest of the card. */
  function placeholder(message, detail) {
    if (!ctx) return;
    plate();
    eyebrow('SKY CARD', 112);
    ctx.fillStyle = INK;
    font('400', 104, SERIF);
    var y = wrapLines(message, LEFT, 300, COL, 108, 3);
    ctx.fillStyle = GRAPHITE;
    font('400', 40, SANS);
    wrapLines(detail || 'Nothing is computed until you ask for it.', LEFT, y + 30, COL, 56, 3);
    footer(null);
  }

  function drawCard(minute) {
    plate();
    var positions = minute.chart.positions;
    var pattern = currentPattern(minute.clockText);

    eyebrow('THE SKY AT THIS MINUTE', 112);

    ctx.fillStyle = INK;
    fitText(minute.dateText, LEFT, 236, '400', 96, SERIF, COL);

    var y = 300;
    ctx.fillStyle = GRAPHITE;
    font('500', 36, SANS);
    spacing(1);
    y = wrapLines(minute.place.name.toUpperCase(), LEFT, y, COL, 46, 2);
    y = wrapLines(minute.clockText + (minute.timeKnown ? '' : ' (ASSUMED)') + '  \u00B7  '
      + minute.place.tz.toUpperCase(), LEFT, y, COL, 46, 2);
    ctx.fillStyle = MUTED;
    font('500', 33, SANS);
    y = wrapLines('COMPUTED FROM ' + minute.utText + ' UT', LEFT, y, COL, 44, 1);
    y = paintSyncMark(pattern, minute.isoDate, y);

    y += 12;
    font('600', 33, SANS);
    if (minute.light) {
      ctx.fillStyle = minute.light.tone;
      y = wrapLines(minute.light.label.toUpperCase() + '  \u00B7  SUN '
        + Math.abs(minute.altitude).toFixed(1) + '\u00B0 '
        + (minute.altitude >= 0 ? 'ABOVE' : 'BELOW') + ' THE HORIZON', LEFT, y, COL, 44, 2);
    } else {
      ctx.fillStyle = ALERT;
      y = wrapLines('BIRTH HOUR UNKNOWN', LEFT, y, COL, 44, 1);
      y = wrapLines('DAY OR NIGHT NOT STATED', LEFT, y, COL, 44, 1);
    }
    spacing(0);

    // Lower block (rising, houses, the assumed-hour note) is measured first so
    // the wheel takes whatever height is left above it.
    var moonNote = minute.timeKnown ? [] : (function () {
      font('500', 33, SANS);
      spacing(1);
      var lines = splitLines('MOON PLACED FROM ' + ASSUMED_HOUR + ' LOCAL', COL, 1)
        .concat(splitLines('UP TO A SIGN OUT', COL, 1));
      spacing(0);
      return lines;
    }());
    // Last lower baseline sits 64 below the wheel plus this tail; keep it 36 above the rule.
    var lowerHeight = moonNote.length ? 2 * ROW + (moonNote.length - 1) * 44 : ROW;
    var top = y + 10;
    var radius = Math.max(WHEEL_MIN_R, Math.min(WHEEL_MAX_R, (FOOTER_RULE - 36 - 64 - lowerHeight - top) / 2));
    wheel(minute.chart, LEFT + radius, top + radius, radius);

    // The three lights, beside the wheel.
    var colX = LEFT + radius * 2 + 56;
    var colW = RIGHT - colX;
    // Each light is a label plus a value line, so rows never close up below 104.
    var pitch = Math.max(104, Math.min(140, (radius * 2 - 40) / 3));
    LIGHTS.forEach(function (row, index) {
      var position = positions[row[0]];
      if (!position) return;
      var base = top + 46 + index * pitch;
      glyph(row[0], COPPER_INK, colX + 18, base - 12, 38);
      ctx.fillStyle = MUTED;
      font('500', 33, SANS);
      spacing(2);
      ctx.fillText(row[1].toUpperCase(), colX + 50, base);
      spacing(0);
      ctx.fillStyle = INK;
      fitText(formatPosition(position), colX, base + 54, '500', 44, SANS, colW);
    });

    y = Math.max(top + radius * 2, top + 46 + 2 * pitch + 54) + 64;
    [['RISING', minute.timeKnown && positions.asc ? formatPosition(positions.asc) : null],
      ['HOUSES', minute.timeKnown && positions.asc ? 'FROM THE HOUR AND THE TOWN' : null]]
      .forEach(function (row, index) {
        ctx.fillStyle = MUTED;
        font('500', 33, SANS);
        spacing(2);
        ctx.fillText(row[0], LEFT, y);
        spacing(0);
        if (row[1]) {
          ctx.fillStyle = INK;
          if (index === 0) fitText(row[1], VALUE_X, y, '500', 44, SANS, RIGHT - VALUE_X);
          else fitText(row[1], VALUE_X, y, '500', 33, SANS, RIGHT - VALUE_X);
        } else {
          ctx.fillStyle = ALERT;
          fitText('MISSING \u2014 NO BIRTH HOUR', VALUE_X, y, '600', 33, SANS, RIGHT - VALUE_X);
        }
        y += ROW;
      });

    if (moonNote.length) {
      ctx.fillStyle = GRAPHITE;
      font('500', 33, SANS);
      spacing(1);
      moonNote.forEach(function (line, index) { ctx.fillText(line, LEFT, y + index * 44); });
      spacing(0);
    }

    footer(['COMPUTED ON THIS DEVICE', 'NOT A CLAIM ABOUT YOUR LIFE']);
  }

  function drawClockPlate(match, dateValue) {
    plate();
    eyebrow('SYNCHRONICITY CARD', 112);
    ctx.fillStyle = INK;
    fitText(match.label, LEFT, 300, '400', 176, SERIF, COL);
    ctx.fillStyle = GRAPHITE;
    font('500', 36, SANS);
    spacing(1);
    var y = wrapLines((dateValue || '') + '  \u00B7  DEVICE CLOCK  \u00B7  SCHEMATIC', LEFT, 380, COL, 46, 2);
    spacing(0);
    ctx.fillStyle = INK;
    font('italic 400', 56, SERIF);
    y = wrapLines(match.folk, LEFT, y + 80, COL, 66, 6);
    ctx.fillStyle = MUTED;
    font('400', 34, SANS);
    wrapLines(window.APMirrorHour ? window.APMirrorHour.HONESTY : '', LEFT, y + 40, COL, 46, 4);
    footer(['DEVICE CLOCK \u00B7 FOLK PATTERN ONLY', 'NOT A NATAL CLAIM']);
    drawn = {
      isoDate: dateValue || '',
      place: { name: 'device clock' },
      clockText: match.label,
      timeKnown: true,
      syncOnly: true
    };
    showSyncPanel(match, dateValue);
    if (downloadBtn) downloadBtn.disabled = false;
    if (shareBtn) shareBtn.disabled = false;
  }

  function renderLedger(minute) {
    if (!ledgerEl) return;
    var positions = minute.chart.positions;
    var rows = [
      ['Minute', minute.dateText + ' \u00B7 ' + minute.clockText
        + (minute.timeKnown ? '' : ' assumed') + ' \u00B7 ' + minute.place.tz
        + ' \u00B7 ' + minute.utText + ' UT'],
      ['Place', minute.place.name + ' \u00B7 ' + Math.abs(minute.place.lat).toFixed(2) + '\u00B0 '
        + (minute.place.lat >= 0 ? 'N' : 'S') + ', ' + Math.abs(minute.place.lon).toFixed(2) + '\u00B0 '
        + (minute.place.lon >= 0 ? 'E' : 'W')],
      ['Light', minute.light
        ? lightSentence(minute.light, minute.altitude)
        : 'Not stated. Without a birth hour there is no altitude to compute, so this card does not say whether it was day or night.'],
      ['The three lights', LIGHTS.map(function (row) {
        return row[1] + ' ' + formatPosition(positions[row[0]]);
      }).join(' \u00B7 ')],
      ['The ring', 'A zodiac wheel of ecliptic longitudes for that minute \u2014 schematic, not a photograph of the sky, and not to scale.'],
    ];
    if (minute.timeKnown && positions.asc) {
      rows.push(['Rising', formatPosition(positions.asc) + ' \u2014 from the hour and the town.']);
      rows.push(['Houses', 'From the hour and the town \u2014 the same angles that place the rising sign.']);
    } else {
      rows.push(['Rising and houses missing', 'The rising sign and the houses need the hour. This card was drawn from '
        + ASSUMED_HOUR + ' local, stated on the plate, so rising and houses are withheld rather than guessed and the Moon may be a sign out.', true]);
    }
    var pattern = currentPattern(minute.clockText);
    if (pattern) {
      rows.push(['Folk clock pattern', pattern.label + ' — ' + pattern.folk + ' ' + (window.APMirrorHour ? window.APMirrorHour.HONESTY : '')]);
    }
    rows.push(['What this is not', 'A computed sky, not a verdict. The astronomy can be checked; the meaning is a symbolic tradition offered for reflection.']);

    ledgerEl.innerHTML = '';
    rows.forEach(function (row) {
      var cell = document.createElement('div');
      if (row[2]) cell.setAttribute('data-withheld', '1');
      var label = document.createElement('span');
      label.textContent = row[0];
      var body = document.createElement('p');
      body.textContent = row[1];
      cell.appendChild(label);
      cell.appendChild(body);
      ledgerEl.appendChild(cell);
    });
  }

  function say(message, state) {
    if (!statusEl) return;
    statusEl.textContent = message;
    if (state) statusEl.dataset.state = state;
    else delete statusEl.dataset.state;
  }

  function keepDrawnCard() {
    if (!canvas || !drawn) return;
    canvas.toBlob(function (blob) {
      if (!blob || !window.APKeepLibrary || typeof APKeepLibrary.put !== 'function') return;
      var town = drawn.place && drawn.place.name ? String(drawn.place.name) : '';
      var pattern = currentPattern(drawn.clockText);
      APKeepLibrary.put({
        kind: pattern ? 'sync-card' : 'sky-card',
        blob: blob,
        caption: (pattern ? pattern.label + ' · ' : '') + 'Sky card · schematic plate · ' + drawn.isoDate + (town ? ' · ' + town : ''),
        birthDate: drawn.isoDate,
        place: town,
        schematic: true
      });
    }, 'image/png');
  }

  function draw() {
    var pattern = currentPattern();
    var dateValue = (byId('dob') && byId('dob').value) || '';
    if (liveCarry && pattern && !place) {
      drawClockPlate(pattern, dateValue);
      say('Device-clock keepable. No birth place was used. Folk pattern only — not a natal claim.');
      keepDrawnCard();
      return;
    }
    var minute = readMinute();
    if (minute.error) {
      say(minute.error, 'refused');
      if (downloadBtn) downloadBtn.disabled = true;
      if (shareBtn) shareBtn.disabled = true;
      drawn = null;
      placeholder('Nothing computed yet.', 'The card waits for a date and a real place.');
      showSyncPanel(pattern, dateValue);
      return;
    }
    drawn = minute;
    drawCard(minute);
    renderLedger(minute);
    showSyncPanel(currentPattern(minute.clockText), minute.isoDate);
    if (downloadBtn) downloadBtn.disabled = false;
    if (shareBtn) shareBtn.disabled = false;
    say('Computed on this device from ' + minute.utText + ' UT. Nothing was uploaded'
      + (minute.timeKnown ? '' : '; the hour is unknown, so the card says so and withholds the rising sign and the houses') + '.');
    keepDrawnCard();
  }

  // ── town search (only the typed town leaves this page) ─────────────────────

  function resetZone(message) {
    place = null;
    if (zoneNote) zoneNote.textContent = message;
  }

  function bindCitySearch() {
    if (!cityInput || !cityDrop) return;
    var seq = 0;
    var timer = null;

    function pick(candidate) {
      if (!validTimeZone(candidate.tz) || !Number.isFinite(candidate.lat) || !Number.isFinite(candidate.lon)) {
        resetZone('That result has no usable zone. Pick another town — UTC and GMT are refused as birth zones.');
        closeDrop();
        return;
      }
      place = candidate;
      cityInput.value = candidate.name;
      if (zoneNote) zoneNote.textContent = candidate.tz + ' \u00B7 ' + candidate.lat.toFixed(2) + ', ' + candidate.lon.toFixed(2);
      closeDrop();
    }

    function closeDrop() {
      cityDrop.hidden = true;
      cityDrop.innerHTML = '';
    }

    function render(results) {
      cityDrop.innerHTML = '';
      results.forEach(function (candidate) {
        if (!validTimeZone(candidate.tz)) return;
        var item = document.createElement('button');
        item.type = 'button';
        item.className = 'ap-city-item';
        item.textContent = candidate.name + ' \u00B7 ' + candidate.tz;
        item.addEventListener('click', function () { pick(candidate); });
        cityDrop.appendChild(item);
      });
      cityDrop.hidden = !cityDrop.childNodes.length;
    }

    function search(query) {
      query = (query || '').trim();
      if (query.length < 2) { closeDrop(); return; }
      var mine = ++seq;
      // Only this town text is sent. The date and time never join the request.
      fetch(GEOCODER + '?name=' + encodeURIComponent(query) + '&count=6&language=en&format=json')
        .then(function (response) { return response.ok ? response.json() : { results: [] }; })
        .then(function (data) {
          if (mine !== seq) return;
          render((data.results || []).map(function (row) {
            var region = [row.admin1 && row.admin1 !== row.name ? row.admin1 : '', row.country].filter(Boolean).join(', ');
            return {
              name: row.name + (region ? ', ' + region : ''),
              lat: Number(row.latitude),
              lon: Number(row.longitude),
              tz: row.timezone || '',
            };
          }));
        })
        .catch(function () {
          if (mine === seq) {
            closeDrop();
            resetZone('The town lookup did not answer. Check the connection and type the town again.');
          }
        });
    }

    cityInput.addEventListener('input', function () {
      resetZone('Pick a town from the list so the minute uses that town\u2019s real zone. UTC and GMT are refused as birth zones.');
      clearTimeout(timer);
      timer = setTimeout(function () { search(cityInput.value); }, 250);
    });
    cityInput.addEventListener('blur', function () { setTimeout(closeDrop, 180); });
  }

  // ── a minute already entered elsewhere on this device ──────────────────────

  function consumeHandoff() {
    try {
      var raw = sessionStorage.getItem(HANDOFF_KEY);
      if (!raw) return null;
      sessionStorage.removeItem(HANDOFF_KEY);
      var payload = JSON.parse(raw);
      if (payload && payload.livePattern) liveCarry = true;
      return payload && typeof payload === 'object' ? payload : null;
    } catch (e) {
      return null;
    }
  }

  function savedChart() {
    try {
      var charts = JSON.parse(localStorage.getItem('ap_charts') || '[]');
      if (!Array.isArray(charts) || !charts.length) return null;
      var activeId = localStorage.getItem('ap_active_chart');
      var chart = charts.filter(function (row) { return String(row.id) === String(activeId); })[0] || charts[0];
      if (!chart || !(chart.birthDate || chart.date)) return null;
      return {
        date: chart.birthDate || chart.date,
        time: chart.timeKnown === false ? '' : (chart.birthTime || chart.time || ''),
        zone: chart.tz || chart.timezone || '',
        place: chart.city || chart.place || '',
        lat: chart.lat,
        lon: chart.lon,
        source: 'saved chart',
      };
    } catch (e) {
      return null;
    }
  }

  /* An empty field is not a coordinate. Number('') is 0, and 0/0 is a real
     point in the Gulf of Guinea — carrying a minute over from a page that
     holds a zone but no coordinates (the natal reading) once produced a card
     that printed "Manchester" and computed its horizon and rising sign off
     the coast of Africa. */
  function coordinate(value, limit) {
    if (value === '' || value === null || value === undefined) return null;
    var number = Number(value);
    if (!Number.isFinite(number) || Math.abs(number) > limit) return null;
    return number;
  }

  function seed() {
    var carried = consumeHandoff() || savedChart();
    if (!carried) return false;
    if (carried.date) byId('dob').value = String(carried.date).slice(0, 10);
    if (carried.time) byId('tob').value = String(carried.time).slice(0, 5);
    if (carried.place && cityInput) cityInput.value = carried.place;
    var lat = coordinate(carried.lat, 90);
    var lon = coordinate(carried.lon, 180);
    var zoned = validTimeZone(carried.zone);
    if (zoned && lat !== null && lon !== null) {
      place = { name: carried.place || carried.zone, lat: lat, lon: lon, tz: carried.zone };
      if (zoneNote) zoneNote.textContent = carried.zone + ' \u00B7 ' + lat.toFixed(2) + ', ' + lon.toFixed(2);
      return Boolean(carried.date);
    }
    if (zoned) {
      resetZone('The date and hour came over, but not the coordinates. Pick the town from the list so the horizon and the rising sign come from the right place \u2014 ' + carried.zone + ' alone cannot place them.');
    } else if (carried.place) {
      resetZone('The town came over as text only. Pick it from the list to fix its zone and coordinates.');
    }
    return false;
  }

  // ── boot ──────────────────────────────────────────────────────────────────

  function waitForEngine(attempt) {
    if (engine()) return Promise.resolve(true);
    if (attempt > 60) return Promise.reject(new Error('The astronomy engine did not load.'));
    return new Promise(function (resolve) { setTimeout(resolve, 100); })
      .then(function () { return waitForEngine((attempt || 0) + 1); });
  }

  function boot() {
    if (!canvas || !ctx || !form) return;
    bindCitySearch();
    var assetsReady = cardAssetsReady();
    placeholder('Your minute goes here.', 'Enter a date and a town, then draw the card.');
    assetsReady.then(function () {
      if (!drawn) placeholder('Your minute goes here.', 'Enter a date and a town, then draw the card.');
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      assetsReady.then(draw);
    });
    if (downloadBtn) {
      downloadBtn.addEventListener('click', function () {
        if (!drawn) return;
        var link = document.createElement('a');
        link.download = 'astroprecise-sky-card-' + drawn.isoDate + '.png';
        link.href = canvas.toDataURL('image/png');
        link.rel = 'noopener';
        document.body.appendChild(link);
        link.click();
        link.remove();
      });
    }
    if (shareBtn) {
      shareBtn.addEventListener('click', function () {
        if (!drawn || !canvas) return;
        canvas.toBlob(function (blob) {
          if (!blob) return;
          var file = new File([blob], 'astroprecise-sky-card-' + drawn.isoDate + '.png', { type: 'image/png' });
          var text = 'My sky card · AstroPrecise';
          if (navigator.canShare && navigator.share && navigator.canShare({ files: [file] })) {
            navigator.share({ files: [file], title: 'Sky card — AstroPrecise', text: text }).catch(function () {});
            return;
          }
          if (navigator.share) {
            navigator.share({ title: 'Sky card — AstroPrecise', text: text }).catch(function () {});
            return;
          }
          // Fallback: download
          if (downloadBtn) downloadBtn.click();
        }, 'image/png');
      });
    }

    var ready = seed();
    waitForEngine(0).then(function () {
      // Wait for AP Serif, AP Sans and the drawn glyph images: drawing before
      // they land would bake fallback type into a card people intend to keep.
      return assetsReady.then(function () {
        if (ready || (liveCarry && currentPattern())) draw();
        else placeholder('Your minute goes here.', 'Enter a date and a town, then draw the card.');
      });
    }).catch(function (err) {
      say(err.message || 'The sky card could not start.', 'refused');
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
