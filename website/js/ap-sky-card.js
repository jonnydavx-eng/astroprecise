/**
 * Sky card — one keepable 1200 × 630 plate of a single birth minute.
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

  /* U+FE0E after every glyph. The zodiac code points default to emoji
     presentation, so without the text selector Chrome paints ♈–♓ as round
     colour badges from the system emoji font and the plate stops being an
     engraving. Same reason the orrery's own sign table carries it. */
  var TEXT = '\uFE0E';
  var GLYPH = {
    sun: '\u2609', moon: '\u263D', mercury: '\u263F', venus: '\u2640', mars: '\u2642',
    jupiter: '\u2643', saturn: '\u2644', uranus: '\u2645', neptune: '\u2646', pluto: '\u2647',
  };
  var SIGN_GLYPHS = ['\u2648', '\u2649', '\u264A', '\u264B', '\u264C', '\u264D',
    '\u264E', '\u264F', '\u2650', '\u2651', '\u2652', '\u2653'];
  var WHEEL_BODIES = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
  var LIGHTS = [['sun', 'Sun'], ['moon', 'Moon'], ['venus', 'Venus']];

  /* Canvas cannot read CSS custom properties, so the house tokens are repeated
     here as literals. Keep them in step with css/ap-living-sky-v834.css. */
  var VOID = '#05080F';
  var PAPER = '#E6ECF2';
  var MUTE = '#A89C84';
  var EMBER = '#B86B4A';
  var BRASS = '#8FA3B8';
  var DANGER = '#B04A52';
  var SILVER = '#C5D0DC';

  var DISPLAY = "'Cormorant Garamond', Georgia, serif";
  var DATA = "'IBM Plex Mono', ui-monospace, monospace";
  var GLYPHS = "'n', 'AstroGlyph', 'Noto Sans Symbols 2', serif";

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
    if (altitude >= -0.833) return { label: 'Daylight', tone: EMBER, night: false };
    if (altitude >= -6) return { label: 'Civil twilight', tone: BRASS, night: false };
    if (altitude >= -12) return { label: 'Nautical twilight', tone: SILVER, night: true };
    if (altitude >= -18) return { label: 'Astronomical twilight', tone: SILVER, night: true };
    return { label: 'Night', tone: SILVER, night: true };
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

  function starfield() {
    var seed = 630630;
    var rand = function () { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (var i = 0; i < 170; i += 1) {
      ctx.globalAlpha = 0.12 + rand() * 0.5;
      ctx.fillStyle = i % 7 === 0 ? BRASS : PAPER;
      ctx.beginPath();
      ctx.arc(rand() * 1200, rand() * 630, 0.4 + rand() * 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function plate() {
    ctx.fillStyle = VOID;
    ctx.fillRect(0, 0, 1200, 630);
    var glow = ctx.createRadialGradient(600, -80, 40, 600, -80, 720);
    glow.addColorStop(0, 'rgba(255,100,40,.16)');
    glow.addColorStop(1, 'rgba(2,3,7,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 1200, 630);
    starfield();
    ctx.strokeStyle = 'rgba(216,180,106,.28)';
    ctx.lineWidth = 1;
    ctx.strokeRect(28.5, 28.5, 1143, 573);
  }

  function tracked(text, x, y, spacing) {
    var cursor = x;
    for (var i = 0; i < text.length; i += 1) {
      ctx.fillText(text[i], cursor, y);
      cursor += ctx.measureText(text[i]).width + spacing;
    }
  }

  function wheel(chart, cx, cy) {
    var point = function (lon, r) {
      var a = (180 - lon) * RAD;
      return [cx + r * Math.cos(a), cy - r * Math.sin(a)];
    };
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    [[198, 'rgba(216,180,106,.55)', 1.2], [176, 'rgba(216,180,106,.28)', 1], [104, 'rgba(216,180,106,.16)', 1]]
      .forEach(function (ring) {
        ctx.strokeStyle = ring[1];
        ctx.lineWidth = ring[2];
        ctx.beginPath();
        ctx.arc(cx, cy, ring[0], 0, Math.PI * 2);
        ctx.stroke();
      });
    ctx.strokeStyle = 'rgba(216,180,106,.16)';
    for (var s = 0; s < 12; s += 1) {
      var inner = point(s * 30, 176);
      var outer = point(s * 30, 198);
      ctx.beginPath();
      ctx.moveTo(inner[0], inner[1]);
      ctx.lineTo(outer[0], outer[1]);
      ctx.stroke();
      var mark = point(s * 30 + 15, 187);
      ctx.fillStyle = 'rgba(216,180,106,.8)';
      ctx.font = '400 16px ' + GLYPHS;
      ctx.fillText(SIGN_GLYPHS[s] + TEXT, mark[0], mark[1]);
    }
    var ordered = WHEEL_BODIES
      .filter(function (key) { return chart.positions[key]; })
      .sort(function (a, b) { return chart.positions[a].longitude - chart.positions[b].longitude; });
    ordered.forEach(function (key, index) {
      var lon = chart.positions[key].longitude;
      var tick = point(lon, 176);
      var seat = point(lon, index % 2 ? 130 : 154);
      // A leader line from the degree tick to the glyph: on a keepsake it must
      // be unambiguous which body sits at which longitude.
      ctx.strokeStyle = 'rgba(216,180,106,.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(tick[0], tick[1]);
      ctx.lineTo(seat[0], seat[1]);
      ctx.stroke();
      ctx.fillStyle = BRASS;
      ctx.beginPath();
      ctx.arc(tick[0], tick[1], 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = key === 'sun' || key === 'moon' || key === 'venus' ? PAPER : MUTE;
      ctx.font = '400 22px ' + GLYPHS;
      ctx.fillText((GLYPH[key] || '') + TEXT, seat[0], seat[1]);
    });
    ctx.restore();
  }

  /* The empty plate is the first thing a phone sees, at roughly a third of its
     drawn width, so its type is set to survive that reduction. The keepsake
     itself keeps the smaller engraved scale. */
  function placeholder(message, detail) {
    if (!ctx) return;
    plate();
    ctx.fillStyle = BRASS;
    ctx.font = '500 22px ' + DATA;
    tracked('SKY CARD', 76, 120, 5);
    ctx.fillStyle = PAPER;
    ctx.font = '600 62px ' + DISPLAY;
    ctx.fillText(message, 76, 230);
    ctx.fillStyle = MUTE;
    ctx.font = '400 30px ' + DATA;
    ctx.fillText(detail || 'Nothing is computed until you ask for it.', 76, 300);
  }

  function drawCard(minute) {
    plate();
    var positions = minute.chart.positions;

    ctx.fillStyle = BRASS;
    ctx.font = '500 13px ' + DATA;
    tracked('THE SKY AT THIS MINUTE', 76, 96, 3.4);

    ctx.fillStyle = PAPER;
    ctx.font = '600 54px ' + DISPLAY;
    ctx.fillText(minute.dateText, 76, 168);

    ctx.fillStyle = MUTE;
    ctx.font = '400 15px ' + DATA;
    ctx.fillText(minute.place.name.toUpperCase() + '  \u00B7  ' + minute.clockText
      + (minute.timeKnown ? '' : ' (ASSUMED)') + '  \u00B7  ' + minute.place.tz.toUpperCase(), 76, 205);
    ctx.font = '400 12px ' + DATA;
    ctx.fillStyle = 'rgba(168,156,132,.8)';
    ctx.fillText('COMPUTED FROM ' + minute.utText + ' UT', 76, 231);

    if (minute.light) {
      ctx.fillStyle = minute.light.tone;
      ctx.font = '400 13px ' + DATA;
      tracked(minute.light.label.toUpperCase() + '  \u00B7  SUN '
        + Math.abs(minute.altitude).toFixed(1) + '\u00B0 '
        + (minute.altitude >= 0 ? 'ABOVE' : 'BELOW') + ' THE HORIZON', 76, 272, 0.7);
    } else {
      ctx.fillStyle = DANGER;
      ctx.font = '400 13px ' + DATA;
      tracked('BIRTH HOUR UNKNOWN  \u00B7  DAY OR NIGHT NOT STATED', 76, 272, 0.7);
    }

    LIGHTS.forEach(function (row, index) {
      var position = positions[row[0]];
      if (!position) return;
      var y = 330 + index * 42;
      ctx.fillStyle = BRASS;
      ctx.font = '400 24px ' + GLYPHS;
      ctx.fillText(GLYPH[row[0]] + TEXT, 76, y);
      ctx.fillStyle = MUTE;
      ctx.font = '400 14px ' + DATA;
      ctx.fillText(row[1].toUpperCase(), 118, y);
      ctx.fillStyle = PAPER;
      ctx.font = '400 18px ' + DATA;
      ctx.fillText(formatPosition(position), 208, y);
    });

    ctx.font = '400 14px ' + DATA;
    ctx.fillStyle = MUTE;
    ctx.fillText('RISING', 118, 456);
    if (minute.timeKnown && positions.asc) {
      ctx.fillStyle = PAPER;
      ctx.font = '400 18px ' + DATA;
      ctx.fillText(formatPosition(positions.asc), 208, 456);
    } else {
      ctx.fillStyle = DANGER;
      ctx.font = '400 15px ' + DATA;
      ctx.fillText('MISSING \u2014 NO BIRTH HOUR', 208, 456);
    }

    ctx.font = '400 14px ' + DATA;
    ctx.fillStyle = MUTE;
    ctx.fillText('HOUSES', 118, 492);
    if (minute.timeKnown && positions.asc) {
      ctx.fillStyle = PAPER;
      ctx.font = '400 15px ' + DATA;
      ctx.fillText('FROM THE HOUR AND THE TOWN', 208, 492);
    } else {
      ctx.fillStyle = DANGER;
      ctx.font = '400 15px ' + DATA;
      ctx.fillText('MISSING \u2014 NO BIRTH HOUR', 208, 492);
    }

    if (!minute.timeKnown) {
      ctx.fillStyle = 'rgba(168,156,132,.85)';
      ctx.font = '400 12px ' + DATA;
      ctx.fillText('MOON PLACED FROM ' + ASSUMED_HOUR + ' LOCAL \u00B7 UP TO A SIGN OUT', 76, 528);
    }

    wheel(minute.chart, 928, 300);

    ctx.strokeStyle = 'rgba(216,180,106,.28)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(76, 548.5);
    ctx.lineTo(1124, 548.5);
    ctx.stroke();

    ctx.fillStyle = PAPER;
    ctx.font = '600 26px ' + DISPLAY;
    ctx.fillText('AstroPrecise', 76, 586);
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(168,156,132,.9)';
    ctx.font = '400 11px ' + DATA;
    ctx.fillText('COMPUTED ON THIS DEVICE \u00B7 NOT A CLAIM ABOUT YOUR LIFE', 1124, 583);
    ctx.textAlign = 'left';
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

  function draw() {
    var minute = readMinute();
    if (minute.error) {
      say(minute.error, 'refused');
      if (downloadBtn) downloadBtn.disabled = true;
      if (shareBtn) shareBtn.disabled = true;
      drawn = null;
      placeholder('Nothing computed yet.', 'The card waits for a date and a real place.');
      return;
    }
    drawn = minute;
    drawCard(minute);
    renderLedger(minute);
    if (downloadBtn) downloadBtn.disabled = false;
    if (shareBtn) shareBtn.disabled = false;
    say('Computed on this device from ' + minute.utText + ' UT. Nothing was uploaded'
      + (minute.timeKnown ? '' : '; the hour is unknown, so the card says so and withholds the rising sign and the houses') + '.');
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
    placeholder('Your minute goes here.', 'Enter a date and a town, then draw the card.');

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      draw();
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
      // The glyph face is a blocking webfont; drawing before it lands would
      // bake fallback squares into a card people intend to keep.
      var fonts = document.fonts
        ? document.fonts.load("400 24px 'n'").catch(function () { return null; })
        : Promise.resolve(null);
      return fonts.then(function () {
        if (ready) draw();
        else placeholder('Your minute goes here.', 'Enter a date and a town, then draw the card.');
      });
    }).catch(function (err) {
      say(err.message || 'The sky card could not start.', 'refused');
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
