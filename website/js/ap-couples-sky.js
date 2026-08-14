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

  function readPerson(prefix) {
    var dateEl = byId(prefix + '-date');
    var timeEl = byId(prefix + '-time');
    var nameEl = byId(prefix + '-name');
    var tzEl = byId(prefix + '-tz');
    var cityEl = byId(prefix + '-city');
    var date = dateEl ? dateEl.value : '';
    var time = timeEl ? timeEl.value : '';
    var tz = tzEl ? (tzEl.value || '').trim() : '';
    var city = cityEl ? (cityEl.value || '').trim() : '';
    var parts = date ? date.split('-').map(Number) : [];
    var clock = time ? time.split(':').map(Number) : [];
    var timeKnown = !!(time && clock.length >= 2);
    var zoneKnown = isValidTimeZone(tz);
    var ut = null;
    var jd = null;
    if (date && parts.length === 3 && zoneKnown && timeKnown) {
      ut = localToUT(parts[0], parts[1], parts[2], clock[0] || 0, clock[1] || 0, tz);
      jd = jdFromUT(ut);
    }
    return {
      name: (function () {
        var raw = (nameEl && nameEl.value) || '';
        raw = String(raw).trim();
        return raw || (prefix === 'person1' ? 'A' : 'B');
      })(),
      date: date,
      time: time,
      city: city,
      tz: zoneKnown ? tz : '',
      timeKnown: timeKnown,
      zoneKnown: zoneKnown,
      jd: jd
    };
  }

  function writeField(id, value) {
    var el = byId(id);
    if (el && value) el.value = value;
  }

  function orrery() { return byId('orr'); }

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
    var extra = p.timeKnown ? '' : ' · Moon and angles withheld · not filled with noon';
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
    o.setNatalClocks({ a: aClock, b: bClock });
    return true;
  }

  function paintTelemetry() {
    var el = byId('telemetry');
    if (!el) return;
    var a = readPerson('person1');
    var b = readPerson('person2');
    if (a.jd && b.jd) {
      el.textContent = 'One model. Both birth minutes stay in the sky.';
    }
  }

  function focusEarthCamera() {
    var o = orrery();
    if (!o) return;
    if (typeof o.flyTo === 'function') o.flyTo('earth');
    else if (typeof o.focusPlanet === 'function') o.focusPlanet('earth');
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
      return;
    }
    enableScrub(true);
    stamp(minuteLabel(p));
    applyNatalClocks();
    focusEarthCamera();
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

  function enableToggles() {
    var a = readPerson('person1');
    var b = readPerson('person2');
    if (byId('ab-a')) byId('ab-a').disabled = !a.date;
    if (byId('ab-b')) byId('ab-b').disabled = !b.date;
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
    el.textContent = p.zoneKnown ? p.tz : 'Pick a place for a real zone. UK summer is not GMT.';
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

  function sceneFromHash() {
    var raw = (location.hash || '').replace(/^#/, '');
    if (!raw) return { a: null, b: null };
    var q = new URLSearchParams(raw);
    function one(prefix) {
      var date = q.get(prefix) || '';
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
      var time = q.get(prefix + 't') || '';
      if (time && !/^\d{2}:\d{2}$/.test(time)) time = '';
      var tz = q.get(prefix + 'z') || '';
      if (tz && !isValidTimeZone(tz)) tz = '';
      var city = q.get(prefix + 'c') || '';
      return { date: date, time: time, name: q.get(prefix + 'n') || '', tz: tz, city: city };
    }
    return { a: one('a'), b: one('b') };
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
      if (a.city) q.set('ac', a.city);
    }
    if (b.date) {
      q.set('b', b.date);
      if (b.time) q.set('bt', b.time);
      if (b.name && b.name !== 'B') q.set('bn', b.name);
      if (b.zoneKnown) q.set('bz', b.tz);
      if (b.city) q.set('bc', b.city);
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
      if (scene.a.city) writeField('person1-city', scene.a.city);
      if (scene.a.tz) {
        var noteA = byId('person1-zone');
        if (noteA) noteA.textContent = scene.a.tz;
      }
    }
    if (scene.b) {
      writeField('person2-date', scene.b.date);
      writeField('person2-time', scene.b.time);
      writeField('person2-name', scene.b.name);
      writeField('person2-tz', scene.b.tz);
      if (scene.b.city) writeField('person2-city', scene.b.city);
      if (scene.b.tz) {
        var noteB = byId('person2-zone');
        if (noteB) noteB.textContent = scene.b.tz;
      }
    }
    enableToggles();
    if (scene.a && scene.a.date) {
      setPressed('a');
      var pa = readPerson('person1');
      enableScrub(!!pa.jd);
      stamp(minuteLabel(pa));
    }
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

    function clearPlace() {
      if (latEl) latEl.value = '';
      if (lonEl) lonEl.value = '';
      if (tzEl) tzEl.value = '';
      enableToggles();
    }

    function pick(city) {
      input.value = city.name + (city.admin ? ', ' + city.admin : '');
      if (latEl) latEl.value = (+city.lat).toFixed(4);
      if (lonEl) lonEl.value = (+city.lon).toFixed(4);
      if (tzEl) tzEl.value = city.tz || '';
      drop.hidden = true;
      drop.innerHTML = '';
      enableToggles();
      writeHash();
      renderAngles();
    }

    function render(results) {
      drop.innerHTML = '';
      if (!results.length) { drop.hidden = true; return; }
      results.forEach(function (city) {
        if (!city.tz || !isValidTimeZone(city.tz)) return;
        var item = document.createElement('button');
        item.type = 'button';
        item.className = 'ap-city-item';
        item.textContent = city.name + (city.admin ? ', ' + city.admin : '') + ' · ' + city.tz;
        item.addEventListener('click', function () { pick(city); });
        drop.appendChild(item);
      });
      drop.hidden = !drop.childNodes.length;
    }

    function offlineRows(q) {
      var list = (window.AstroApp && AstroApp.CITIES)
        || (window.AstroEphemeris && AstroEphemeris.CITIES)
        || [];
      var needle = q.toLowerCase();
      return list.filter(function (c) {
        return c && c.name && c.name.toLowerCase().indexOf(needle) >= 0 && isValidTimeZone(c.tz);
      }).slice(0, 6).map(function (c) {
        return {
          name: c.name,
          admin: c.admin || '',
          country: c.country || '',
          lat: c.lat,
          lon: c.lon,
          tz: c.tz || ''
        };
      });
    }

    function search(q) {
      q = (q || '').trim();
      if (q.length < 2) { drop.hidden = true; drop.innerHTML = ''; return; }
      var my = ++seq;
      function show(rows) {
        if (my !== seq) return;
        render(rows || []);
      }
      if (window.AstroApp && typeof AstroApp.searchPlaces === 'function') {
        AstroApp.searchPlaces(q).then(function (out) {
          show((out && out.results) || []);
        }).catch(function () { show(offlineRows(q)); });
        return;
      }
      fetch(GEO + '?name=' + encodeURIComponent(q) + '&count=6&language=en&format=json')
        .then(function (r) { return r.ok ? r.json() : { results: [] }; })
        .then(function (data) {
          show((data.results || []).map(function (r) {
            return {
              name: r.name,
              admin: r.admin1 && r.admin1 !== r.name ? r.admin1 : '',
              country: r.country_code || r.country || '',
              lat: r.latitude,
              lon: r.longitude,
              tz: r.timezone || ''
            };
          }));
        })
        .catch(function () { show(offlineRows(q)); });
    }

    input.addEventListener('input', function () {
      clearPlace();
      clearTimeout(timer);
      timer = setTimeout(function () { search(input.value); }, 250);
    });
    input.addEventListener('blur', function () {
      setTimeout(function () { drop.hidden = true; }, 180);
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
      if (el) el.addEventListener('change', function () { enableToggles(); writeHash(); renderAngles(); });
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
})();
