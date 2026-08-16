/* Couples sky — two natal clocks in one live WebGL sky. */
/* Local only. Hash only. No scores. Never treat UK summer as UT/GMT. */
(function () {
  'use strict';

  var active = 'now';
  var scrubOffset = 0;
  var GEO = 'https://geocoding-api.open-meteo.com/v1/search';

  var BODIES = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];
  var ASPECTS = [
    { name: 'conjunction', deg: 0, orb: 8 },
    { name: 'sextile', deg: 60, orb: 5 },
    { name: 'square', deg: 90, orb: 6 },
    { name: 'trine', deg: 120, orb: 6 },
    { name: 'opposition', deg: 180, orb: 8 }
  ];

  /* Built-in towns with real IANA zones — used when the geocoder is down.
     Zones are copied from the site ephemeris list. UTC/GMT are never listed. */
  var OFFLINE_TOWNS = [
    { name: 'London', admin: '', country: 'GB', lat: 51.5074, lon: -0.1278, tz: 'Europe/London' },
    { name: 'Manchester', admin: '', country: 'GB', lat: 53.4808, lon: -2.2426, tz: 'Europe/London' },
    { name: 'Edinburgh', admin: '', country: 'GB', lat: 55.9533, lon: -3.1883, tz: 'Europe/London' },
    { name: 'Dublin', admin: '', country: 'IE', lat: 53.3498, lon: -6.2603, tz: 'Europe/Dublin' },
    { name: 'Paris', admin: '', country: 'FR', lat: 48.8566, lon: 2.3522, tz: 'Europe/Paris' },
    { name: 'Berlin', admin: '', country: 'DE', lat: 52.5200, lon: 13.4050, tz: 'Europe/Berlin' },
    { name: 'Rome', admin: '', country: 'IT', lat: 41.9028, lon: 12.4964, tz: 'Europe/Rome' },
    { name: 'Madrid', admin: '', country: 'ES', lat: 40.4168, lon: -3.7038, tz: 'Europe/Madrid' },
    { name: 'Amsterdam', admin: '', country: 'NL', lat: 52.3676, lon: 4.9041, tz: 'Europe/Amsterdam' },
    { name: 'New York', admin: '', country: 'US', lat: 40.7128, lon: -74.0060, tz: 'America/New_York' },
    { name: 'Los Angeles', admin: '', country: 'US', lat: 34.0522, lon: -118.2437, tz: 'America/Los_Angeles' },
    { name: 'Chicago', admin: '', country: 'US', lat: 41.8781, lon: -87.6298, tz: 'America/Chicago' },
    { name: 'Denver', admin: '', country: 'US', lat: 39.7392, lon: -104.9903, tz: 'America/Denver' },
    { name: 'Phoenix', admin: '', country: 'US', lat: 33.4484, lon: -112.0740, tz: 'America/Phoenix' },
    { name: 'Toronto', admin: '', country: 'CA', lat: 43.6532, lon: -79.3832, tz: 'America/Toronto' },
    { name: 'Mexico City', admin: '', country: 'MX', lat: 19.4326, lon: -99.1332, tz: 'America/Mexico_City' },
    { name: 'São Paulo', admin: '', country: 'BR', lat: -23.5505, lon: -46.6333, tz: 'America/Sao_Paulo' },
    { name: 'Sydney', admin: '', country: 'AU', lat: -33.8688, lon: 151.2093, tz: 'Australia/Sydney' },
    { name: 'Melbourne', admin: '', country: 'AU', lat: -37.8136, lon: 144.9631, tz: 'Australia/Melbourne' },
    { name: 'Auckland', admin: '', country: 'NZ', lat: -36.8485, lon: 174.7633, tz: 'Pacific/Auckland' },
    { name: 'Tokyo', admin: '', country: 'JP', lat: 35.6762, lon: 139.6503, tz: 'Asia/Tokyo' },
    { name: 'Mumbai', admin: '', country: 'IN', lat: 19.0760, lon: 72.8777, tz: 'Asia/Kolkata' },
    { name: 'Dubai', admin: '', country: 'AE', lat: 25.2048, lon: 55.2708, tz: 'Asia/Dubai' },
    { name: 'Johannesburg', admin: '', country: 'ZA', lat: -26.2041, lon: 28.0473, tz: 'Africa/Johannesburg' },
    { name: 'Cairo', admin: '', country: 'EG', lat: 30.0444, lon: 31.2357, tz: 'Africa/Cairo' }
  ];

  function byId(id) { return document.getElementById(id); }

  function isValidTimeZone(tz) {
    if (typeof tz !== 'string' || !tz.trim()) return false;
    if (tz === 'UTC' || tz === 'GMT' || tz === 'Etc/UTC' || /^Etc\/GMT/i.test(tz)) return false;
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: tz }).format();
      return true;
    } catch (e) { return false; }
  }

  function tzOffsetMinutes(tz, utcDate) {
    try {
      var dtf = new Intl.DateTimeFormat('en-US', {
        timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
      });
      var p = {};
      dtf.formatToParts(utcDate).forEach(function (x) { p[x.type] = x.value; });
      var asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
      return (asUTC - utcDate.getTime()) / 60000;
    } catch (e) { return null; }
  }

  function localToUT(y, m, d, hh, mm, tz) {
    if (!isValidTimeZone(tz)) return null;
    var guess = new Date(Date.UTC(y, m - 1, d, hh, mm, 0));
    var i, off;
    for (i = 0; i < 2; i++) {
      off = tzOffsetMinutes(tz, guess);
      if (off == null) return null;
      guess = new Date(Date.UTC(y, m - 1, d, hh, mm, 0) - off * 60000);
    }
    return {
      y: guess.getUTCFullYear(), m: guess.getUTCMonth() + 1, d: guess.getUTCDate(),
      hh: guess.getUTCHours(), mm: guess.getUTCMinutes()
    };
  }

  function jdFromUT(ut) {
    if (!ut) return null;
    return Date.UTC(ut.y, ut.m - 1, ut.d, ut.hh, ut.mm, 0) / 86400000 + 2440587.5;
  }

  function personFromFields(fields) {
    fields = fields || {};
    var date = fields.date || '';
    var time = fields.time || '';
    var tz = (fields.tz || '').trim();
    var city = (fields.city || '').trim();
    var prefix = fields.prefix || '';
    var parts = date ? date.split('-').map(Number) : [];
    var clock = time ? time.split(':').map(Number) : [];
    var timeKnown = !!(time && clock.length >= 2 && Number.isFinite(clock[0]) && Number.isFinite(clock[1]));
    var zoneKnown = isValidTimeZone(tz);
    var ut = null;
    var jd = null;
    if (date && parts.length === 3 && zoneKnown && timeKnown) {
      ut = localToUT(parts[0], parts[1], parts[2], clock[0] || 0, clock[1] || 0, tz);
      jd = jdFromUT(ut);
    }
    var raw = String(fields.name || '').trim();
    return {
      name: raw || (prefix === 'person2' ? 'B' : 'A'),
      date: date,
      time: time,
      city: city,
      tz: zoneKnown ? tz : '',
      timeKnown: timeKnown,
      zoneKnown: zoneKnown,
      ut: ut,
      jd: jd
    };
  }

  function readPerson(prefix) {
    var dateEl = byId(prefix + '-date');
    var timeEl = byId(prefix + '-time');
    var nameEl = byId(prefix + '-name');
    var tzEl = byId(prefix + '-tz');
    var cityEl = byId(prefix + '-city');
    return personFromFields({
      prefix: prefix,
      date: dateEl ? dateEl.value : '',
      time: timeEl ? timeEl.value : '',
      name: nameEl ? nameEl.value : '',
      tz: tzEl ? tzEl.value : '',
      city: cityEl ? cityEl.value : ''
    });
  }

  function writeField(id, value) {
    var el = byId(id);
    if (el && value) el.value = value;
  }

  function orrery() { return byId('orr'); }

  function shortName(p, fallback) {
    var raw = String((p && p.name) || fallback || '').trim();
    var first = raw.split(/\s+/)[0] || fallback;
    return first.slice(0, 12) || fallback;
  }

  function setPressed(which) {
    active = which;
    ['ab-a', 'ab-b', 'ab-now'].forEach(function (id) {
      var btn = byId(id);
      if (btn) btn.setAttribute('aria-pressed', id === 'ab-' + which ? 'true' : 'false');
    });
  }

  function stamp(text) {
    var el = byId('sky-time-status');
    if (el) el.textContent = text;
    var note = byId('ap-ab-note');
    if (note) note.textContent = text;
  }

  function minuteLabel(p) {
    if (!p.date) return p.name + ' · date needed';
    if (!p.zoneKnown) return p.name + ' · ' + p.date + ' · place needed for a real zone (not treated as GMT)';
    var clock = p.timeKnown ? p.time : 'time unknown';
    var extra = p.timeKnown ? '' : ' · clock, Moon and angles withheld · not filled with noon';
    return p.name + ' · ' + p.date + ' · ' + clock + ' · ' + p.tz + extra;
  }

  function resetScrub() {
    scrubOffset = 0;
    var el = byId('minute-scrub');
    if (el) el.value = '0';
    var lab = byId('minute-scrub-label');
    if (lab) lab.textContent = 'Birth minute';
  }

  function enableScrub(on) {
    var el = byId('minute-scrub');
    if (el) el.disabled = !on;
  }

  function clockEntry(p, which) {
    if (!p.jd) return null;
    var jd = p.jd;
    if (active === which && scrubOffset) jd += scrubOffset / 1440;
    return { jd: jd, label: p.name };
  }

  function clocksFromPeople(a, b, which, offsetMin) {
    var prevActive = active;
    var prevOff = scrubOffset;
    if (which) active = which;
    if (typeof offsetMin === 'number') scrubOffset = offsetMin;
    var out = {
      a: a && a.timeKnown ? clockEntry(a, 'a') : null,
      b: b && b.timeKnown ? clockEntry(b, 'b') : null,
      focus: (which === 'a' || which === 'b') ? which : null
    };
    active = prevActive;
    scrubOffset = prevOff;
    return out;
  }

  function clockFocus() {
    return (active === 'a' || active === 'b') ? active : null;
  }

  function applyNatalClocks() {
    var o = orrery();
    if (!o) return false;
    var a = readPerson('person1');
    var b = readPerson('person2');
    var aClock = a.timeKnown ? clockEntry(a, 'a') : null;
    var bClock = b.timeKnown ? clockEntry(b, 'b') : null;
    if (!aClock && !bClock) {
      if (typeof o.clearNatalClocks === 'function') o.clearNatalClocks();
      return false;
    }
    if (typeof o.setNatalClocks !== 'function') return false;
    var focus = (active === 'a' || active === 'b') ? active : null;
    o.setNatalClocks({ a: aClock, b: bClock, focus: focus });
    return true;
  }

  function paintTelemetry() {
    var el = byId('telemetry');
    if (!el) return;
    var a = readPerson('person1');
    var b = readPerson('person2');
    if (a.jd && b.jd) {
      el.textContent = 'One model. Both birth minutes stay in the sky.';
      return;
    }
    if (a.jd || b.jd) {
      var have = a.jd ? a.name : b.name;
      var need = a.jd ? b.name : a.name;
      el.textContent = 'One model. ' + have + '\'s minute is in the sky. ' +
        need + ' still needs a birth time and a real zone.';
      return;
    }
    if ((a.date && !a.timeKnown) || (b.date && !b.timeKnown)) {
      el.textContent = 'One model. Unknown birth time is not filled with noon. Moon and angles stay withheld.';
      return;
    }
    if ((a.date && a.timeKnown && !a.zoneKnown) || (b.date && b.timeKnown && !b.zoneKnown)) {
      el.textContent = 'One model. Civil time waits for a real zone from the birth town. Not treated as GMT.';
      return;
    }
    el.textContent = 'One model. Both birth minutes stay in the sky.';
  }

  function showPerson(which) {
    var p = readPerson(which === 'b' ? 'person2' : 'person1');
    resetScrub();
    setPressed(which);
    if (!p.jd) {
      enableScrub(false);
      stamp(minuteLabel(p));
      applyNatalClocks();
      renderAngles();
      paintTelemetry();
      return;
    }
    enableScrub(true);
    stamp(minuteLabel(p));
    applyNatalClocks();
    writeHash();
    renderAngles();
    paintTelemetry();
  }

  function showA() { showPerson('a'); }
  function showB() { showPerson('b'); }

  function showLive() {
    var o = orrery();
    if (o && o.setLive) o.setLive();
    resetScrub();
    enableScrub(false);
    setPressed('now');
    stamp('Live sky · now');
    applyNatalClocks();
    paintTelemetry();
  }

  function onScrub() {
    var el = byId('minute-scrub');
    if (!el) return;
    scrubOffset = parseInt(el.value, 10) || 0;
    var lab = byId('minute-scrub-label');
    if (lab) {
      if (!scrubOffset) lab.textContent = 'Birth minute';
      else lab.textContent = (scrubOffset > 0 ? '+' : '') + scrubOffset + ' min';
    }
    if (active !== 'a' && active !== 'b') return;
    var p = active === 'b' ? readPerson('person2') : readPerson('person1');
    if (!p.jd) return;
    applyNatalClocks();
    stamp(minuteLabel(p) + (scrubOffset ? ' · ' + (scrubOffset > 0 ? '+' : '') + scrubOffset + ' min' : ''));
  }

  function paintWhoButtons(a, b) {
    var btnA = byId('ab-a');
    var btnB = byId('ab-b');
    if (btnA) {
      btnA.textContent = shortName(a, 'A');
      btnA.setAttribute('aria-label', shortName(a, 'A') + '\'s minute');
      btnA.disabled = !a.date;
    }
    if (btnB) {
      btnB.textContent = shortName(b, 'B');
      btnB.setAttribute('aria-label', shortName(b, 'B') + '\'s minute');
      btnB.disabled = !b.date;
    }
  }

  function enableToggles() {
    var a = readPerson('person1');
    var b = readPerson('person2');
    paintWhoButtons(a, b);
    var inv = byId('compat-invite-btn');
    if (inv) inv.disabled = !a.date;
    paintZone('person1', a);
    paintZone('person2', b);
    applyNatalClocks();
    paintTelemetry();
    return !!(a.jd && b.jd);
  }

  function paintZone(prefix, p) {
    var el = byId(prefix + '-zone');
    if (!el) return;
    if (p.zoneKnown) {
      el.textContent = p.tz + ' · civil time uses this zone, not GMT.';
      return;
    }
    el.textContent = 'Pick a place for a real zone. UK summer is not GMT.';
  }

  function sep(a, b) {
    var d = Math.abs(a - b) % 360;
    if (d > 180) d = 360 - d;
    return d;
  }

  function rowsAt(jd) {
    var V = window.VoidEphem;
    if (!V || !V.positions || !V.dateOf) return [];
    var pack = V.positions(V.dateOf(jd));
    return (pack && pack.rows) || [];
  }

  function lonMap(rows) {
    var out = {};
    rows.forEach(function (r) {
      if (r && r.key && typeof r.lon === 'number') out[r.key] = r;
    });
    return out;
  }

  function namedAspect(angle) {
    var i, a, off;
    for (i = 0; i < ASPECTS.length; i++) {
      a = ASPECTS[i];
      off = Math.abs(angle - a.deg);
      if (off <= a.orb) return { name: a.name, exact: a.deg, off: off };
    }
    return null;
  }

  function renderAngles() {
    var box = byId('ap-angles');
    var list = byId('ap-angles-list');
    if (!box || !list) return;
    var a = readPerson('person1');
    var b = readPerson('person2');
    list.innerHTML = '';
    if (!a.zoneKnown || !b.zoneKnown) {
      box.hidden = false;
      var need = document.createElement('li');
      need.textContent = 'Angles withheld. Both places need a real zone. Not treated as GMT.';
      list.appendChild(need);
      return;
    }
    if (!a.timeKnown || !b.timeKnown) {
      box.hidden = false;
      var hold = document.createElement('li');
      hold.textContent = 'Moon and angles withheld. Unknown time is not filled with noon.';
      list.appendChild(hold);
      return;
    }
    if (!a.jd || !b.jd || !window.VoidEphem) {
      box.hidden = true;
      return;
    }
    var A = lonMap(rowsAt(a.jd));
    var B = lonMap(rowsAt(b.jd));
    var hits = [];
    BODIES.forEach(function (ak) {
      if (!A[ak]) return;
      BODIES.forEach(function (bk) {
        if (!B[bk]) return;
        var angle = sep(A[ak].lon, B[bk].lon);
        var named = namedAspect(angle);
        if (!named) return;
        hits.push({
          a: A[ak].name || ak,
          b: B[bk].name || bk,
          angle: angle,
          named: named
        });
      });
    });
    hits.sort(function (x, y) { return x.named.off - y.named.off; });
    if (!hits.length) {
      box.hidden = false;
      var empty = document.createElement('li');
      empty.textContent = 'No major aspect inside orb. The measured sky is still both minutes.';
      list.appendChild(empty);
      return;
    }
    hits.slice(0, 12).forEach(function (h) {
      var li = document.createElement('li');
      li.textContent = a.name + ' ' + h.a + ' · ' + b.name + ' ' + h.b + ' — ' +
        h.angle.toFixed(1) + '° (' + h.named.name + ', ' + h.named.off.toFixed(1) + '° from ' + h.named.exact + '°)';
      list.appendChild(li);
    });
    box.hidden = false;
  }

  function oneFromParams(q, prefix) {
    var date = q.get(prefix) || '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
    var time = q.get(prefix + 't') || '';
    if (time && !/^\d{2}:\d{2}$/.test(time)) time = '';
    var tz = q.get(prefix + 'z') || '';
    if (tz && !isValidTimeZone(tz)) tz = '';
    var city = q.get(prefix + 'c') || '';
    if (city && isValidTimeZone(city)) city = '';
    if (city && !tz) {
      var hit = matchTown(city);
      if (hit) tz = hit.tz;
    }
    return { date: date, time: time, name: q.get(prefix + 'n') || '', tz: tz, city: city };
  }

  function sceneFromHash(raw) {
    raw = raw != null ? String(raw).replace(/^#/, '') : (location.hash || '').replace(/^#/, '');
    if (!raw) return { a: null, b: null };
    var q = new URLSearchParams(raw);
    return { a: oneFromParams(q, 'a'), b: oneFromParams(q, 'b') };
  }

  function writeHash() {
    var a = readPerson('person1');
    var b = readPerson('person2');
    var q = new URLSearchParams();
    if (a.date) {
      q.set('a', a.date);
      if (a.time) q.set('at', a.time);
      if (a.name && a.name !== 'A') q.set('an', a.name);
      if (a.zoneKnown) q.set('az', a.tz);
      if (a.city && !isValidTimeZone(a.city)) q.set('ac', a.city);
    }
    if (b.date) {
      q.set('b', b.date);
      if (b.time) q.set('bt', b.time);
      if (b.name && b.name !== 'B') q.set('bn', b.name);
      if (b.zoneKnown) q.set('bz', b.tz);
      if (b.city && !isValidTimeZone(b.city)) q.set('bc', b.city);
    }
    var next = q.toString();
    var hash = next ? '#' + next : '';
    if (location.hash === hash) return;
    if (history.replaceState) history.replaceState(null, '', location.pathname + hash);
    else location.hash = next;
  }

  function applyHash() {
    var scene = sceneFromHash();
    if (scene.a) {
      writeField('person1-date', scene.a.date);
      writeField('person1-time', scene.a.time);
      writeField('person1-name', scene.a.name);
      writeField('person1-tz', scene.a.tz);
      if (scene.a.city && !isValidTimeZone(scene.a.city)) writeField('person1-city', scene.a.city);
      if (scene.a.tz) {
        var noteA = byId('person1-zone');
        if (noteA) noteA.textContent = scene.a.tz + ' · civil time uses this zone, not GMT.';
      }
    }
    if (scene.b) {
      writeField('person2-date', scene.b.date);
      writeField('person2-time', scene.b.time);
      writeField('person2-name', scene.b.name);
      writeField('person2-tz', scene.b.tz);
      if (scene.b.city && !isValidTimeZone(scene.b.city)) writeField('person2-city', scene.b.city);
      if (scene.b.tz) {
        var noteB = byId('person2-zone');
        if (noteB) noteB.textContent = scene.b.tz + ' · civil time uses this zone, not GMT.';
      }
    }
    enableToggles();
    setPressed('now');
    enableScrub(false);
    var pa = readPerson('person1');
    var pb = readPerson('person2');
    if (pa.jd && pb.jd) stamp(pa.name + ' and ' + pb.name + ' · both minutes in the live sky');
    else if (pa.date) stamp(minuteLabel(pa));
    else if (pb.date) stamp(minuteLabel(pb));
    applyNatalClocks();
    renderAngles();
    paintTelemetry();
  }

  function inviteLink() {
    writeHash();
    return location.origin + location.pathname + location.hash;
  }

  function onInvite() {
    var a = readPerson('person1');
    var btn = byId('compat-invite-btn');
    if (!a.date) return;
    var link = inviteLink();
    var label = function (text) {
      if (!btn) return;
      var old = btn.textContent;
      btn.textContent = text;
      setTimeout(function () { btn.textContent = old; }, 2000);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(link).then(function () {
        label('Hash link copied');
      }).catch(function () {
        label('Could not copy');
      });
    } else {
      label('Could not copy');
    }
  }

  function scrollToSky() {
    var lead = byId('lead');
    if (lead && typeof lead.scrollIntoView === 'function') {
      lead.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function onSubmit(event) {
    event.preventDefault();
    var err = byId('compatError');
    var a = readPerson('person1');
    var b = readPerson('person2');
    if (!a.date || !b.date) {
      if (err) {
        err.hidden = false;
        err.textContent = 'Both people need a birth date.';
      }
      enableToggles();
      return;
    }
    if (!a.zoneKnown || !b.zoneKnown) {
      if (err) {
        err.hidden = false;
        err.textContent = 'Pick both birth places from the list so the minute uses a real zone. UK summer is not GMT.';
      }
      enableToggles();
      return;
    }
    if (err) { err.hidden = true; err.textContent = ''; }
    enableToggles();
    var o = orrery();
    if (o && o.setLive) o.setLive();
    setPressed('now');
    resetScrub();
    enableScrub(false);
    stamp(a.name + ' and ' + b.name + ' · both minutes in the live sky');
    applyNatalClocks();
    writeHash();
    renderAngles();
    paintTelemetry();
    scrollToSky();
  }

  function townSources() {
    var extra = [];
    if (window.AstroEphemeris && Array.isArray(AstroEphemeris.CITIES)) extra = extra.concat(AstroEphemeris.CITIES);
    if (window.AstroApp && Array.isArray(AstroApp.CITIES)) extra = extra.concat(AstroApp.CITIES);
    return OFFLINE_TOWNS.concat(extra);
  }

  function matchTown(query) {
    var q = String(query || '').trim().toLowerCase();
    if (!q) return null;
    var list = townSources();
    var i, c, name, label;
    var exact = null;
    var starts = null;
    for (i = 0; i < list.length; i++) {
      c = list[i];
      if (!c || !c.name || !isValidTimeZone(c.tz)) continue;
      name = String(c.name).toLowerCase();
      label = (c.name + (c.admin ? ', ' + c.admin : '')).toLowerCase();
      if (name === q || label === q) {
        exact = c;
        break;
      }
      if (!starts && (name.indexOf(q) === 0 || q.indexOf(name) === 0)) starts = c;
    }
    var hit = exact || starts;
    if (!hit) return null;
    return {
      name: hit.name,
      admin: hit.admin || '',
      country: hit.country || '',
      lat: hit.lat,
      lon: hit.lon,
      tz: hit.tz
    };
  }

  function offlineRows(q) {
    var needle = String(q || '').toLowerCase();
    var out = [];
    var seen = {};
    townSources().forEach(function (c) {
      if (!c || !c.name || !isValidTimeZone(c.tz)) return;
      if (c.name.toLowerCase().indexOf(needle) < 0) return;
      if (seen[c.name + '|' + c.tz]) return;
      seen[c.name + '|' + c.tz] = 1;
      out.push({
        name: c.name,
        admin: c.admin || '',
        country: c.country || '',
        lat: c.lat,
        lon: c.lon,
        tz: c.tz
      });
    });
    return out.slice(0, 6);
  }

  function bindCity(prefix) {
    var input = byId(prefix + '-city');
    var latEl = byId(prefix + '-lat');
    var lonEl = byId(prefix + '-lon');
    var tzEl = byId(prefix + '-tz');
    var drop = byId(prefix + '-city-drop');
    if (!input || !drop) return;
    var seq = 0;
    var timer = null;
    var activeIdx = -1;

    function clearPlace() {
      if (latEl) latEl.value = '';
      if (lonEl) lonEl.value = '';
      if (tzEl) tzEl.value = '';
      enableToggles();
    }

    function hideDrop() {
      drop.hidden = true;
      drop.innerHTML = '';
      drop._items = [];
      activeIdx = -1;
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
    }

    function pick(city) {
      if (!city || !isValidTimeZone(city.tz)) return;
      input.value = city.name + (city.admin ? ', ' + city.admin : '');
      if (isValidTimeZone(input.value)) input.value = city.name;
      if (latEl) latEl.value = (+city.lat).toFixed(4);
      if (lonEl) lonEl.value = (+city.lon).toFixed(4);
      if (tzEl) tzEl.value = city.tz || '';
      hideDrop();
      enableToggles();
      writeHash();
      renderAngles();
    }

    function markActive() {
      var items = drop.querySelectorAll('.ap-city-item');
      items.forEach(function (el, i) {
        var on = i === activeIdx;
        el.classList.toggle('is-selected', on);
        el.setAttribute('aria-selected', on ? 'true' : 'false');
        if (on) input.setAttribute('aria-activedescendant', el.id);
      });
    }

    function note(text) {
      drop.innerHTML = '';
      var p = document.createElement('p');
      p.className = 'ap-city-note';
      p.textContent = text;
      drop.appendChild(p);
      drop._items = [];
      drop.hidden = false;
      input.setAttribute('aria-expanded', 'true');
    }

    function render(results, source) {
      drop.innerHTML = '';
      drop._items = [];
      activeIdx = -1;
      input.removeAttribute('aria-activedescendant');
      var rows = (results || []).filter(function (city) {
        return city && city.tz && isValidTimeZone(city.tz);
      });
      if (!rows.length) {
        note(source === 'offline'
          ? 'Offline list has no match with a real zone. UTC/GMT are refused.'
          : 'No places with a real zone matched. UTC/GMT are refused.');
        return;
      }
      if (source === 'offline') {
        var off = document.createElement('p');
        off.className = 'ap-city-note';
        off.textContent = 'Offline — built-in towns with real IANA zones.';
        drop.appendChild(off);
      }
      rows.forEach(function (city, i) {
        var item = document.createElement('button');
        item.type = 'button';
        item.className = 'ap-city-item';
        item.id = prefix + '-city-opt-' + i;
        item.setAttribute('role', 'option');
        item.setAttribute('aria-selected', 'false');
        item.textContent = city.name + (city.admin ? ', ' + city.admin : '') + ' · ' + city.tz;
        item.addEventListener('click', function () { pick(city); });
        drop.appendChild(item);
      });
      drop._items = rows;
      drop.hidden = false;
      input.setAttribute('aria-expanded', 'true');
    }

    function search(q) {
      q = (q || '').trim();
      if (q.length < 2) { hideDrop(); return; }
      var my = ++seq;
      function show(rows, source) {
        if (my !== seq) return;
        render(rows || [], source || 'live');
      }
      note('Searching the gazetteer…');
      if (window.AstroApp && typeof AstroApp.searchPlaces === 'function') {
        AstroApp.searchPlaces(q).then(function (out) {
          show((out && out.results) || [], (out && out.source) || 'live');
        }).catch(function () { show(offlineRows(q), 'offline'); });
        return;
      }
      fetch(GEO + '?name=' + encodeURIComponent(q) + '&count=6&language=en&format=json')
        .then(function (r) { return r.ok ? r.json() : { results: [] }; })
        .then(function (data) {
          var rows = (data.results || []).map(function (r) {
            return {
              name: r.name,
              admin: r.admin1 && r.admin1 !== r.name ? r.admin1 : '',
              country: r.country_code || r.country || '',
              lat: r.latitude,
              lon: r.longitude,
              tz: r.timezone || ''
            };
          });
          if (!rows.length) rows = offlineRows(q);
          show(rows, rows.length && !(data.results || []).length ? 'offline' : 'live');
        })
        .catch(function () { show(offlineRows(q), 'offline'); });
    }

    input.setAttribute('aria-expanded', 'false');
    input.addEventListener('input', function () {
      clearPlace();
      clearTimeout(timer);
      timer = setTimeout(function () { search(input.value); }, 250);
    });
    input.addEventListener('keydown', function (ev) {
      var items = drop._items || [];
      if (!items.length) return;
      if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
        ev.preventDefault();
        activeIdx = (activeIdx + (ev.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length;
        markActive();
      } else if (ev.key === 'Enter' && activeIdx >= 0) {
        ev.preventDefault();
        pick(items[activeIdx]);
      } else if (ev.key === 'Escape') {
        hideDrop();
      }
    });
    input.addEventListener('blur', function () {
      setTimeout(function () { hideDrop(); }, 180);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var form = byId('compat-form');
    if (form) form.addEventListener('submit', onSubmit);
    if (byId('ab-a')) byId('ab-a').addEventListener('click', showA);
    if (byId('ab-b')) byId('ab-b').addEventListener('click', showB);
    if (byId('ab-now')) byId('ab-now').addEventListener('click', showLive);
    if (byId('compat-invite-btn')) byId('compat-invite-btn').addEventListener('click', onInvite);
    if (byId('minute-scrub')) byId('minute-scrub').addEventListener('input', onScrub);
    ['person1-date', 'person1-time', 'person1-name', 'person2-date', 'person2-time', 'person2-name'].forEach(function (id) {
      var el = byId(id);
      if (!el) return;
      el.addEventListener('change', function () { enableToggles(); writeHash(); renderAngles(); });
      el.addEventListener('input', function () { enableToggles(); });
    });
    bindCity('person1');
    bindCity('person2');
    applyHash();
    if (!sceneFromHash().a) {
      enableToggles();
      setPressed('now');
      enableScrub(false);
    }
    document.addEventListener('ap-orrery-ready', function () { applyNatalClocks(); });
    if (!window.VoidEphem) {
      var n = 0;
      var t = setInterval(function () {
        n += 1;
        if (window.VoidEphem || n > 40) {
          clearInterval(t);
          if (window.VoidEphem) renderAngles();
        }
      }, 250);
    }
  });

  window.APCouplesSky = {
    isValidTimeZone: isValidTimeZone,
    localToUT: localToUT,
    jdFromUT: jdFromUT,
    personFromFields: personFromFields,
    clocksFromPeople: clocksFromPeople,
    sceneFromHash: sceneFromHash,
    matchTown: matchTown,
    minuteLabel: minuteLabel,
    OFFLINE_TOWNS: OFFLINE_TOWNS
  };
})();
