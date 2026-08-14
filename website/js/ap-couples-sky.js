/* Couples sky — one void-orrery, two birth minutes, minute scrub, real angles. */
/* Local only. Hash only. No scores. */
(function () {
  'use strict';

  var active = 'now';
  var scrubOffset = 0;

  var BODIES = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];
  var ASPECTS = [
    { name: 'conjunction', deg: 0, orb: 8 },
    { name: 'sextile', deg: 60, orb: 5 },
    { name: 'square', deg: 90, orb: 6 },
    { name: 'trine', deg: 120, orb: 6 },
    { name: 'opposition', deg: 180, orb: 8 }
  ];

  function $(id) { return document.getElementById(id); }

  function jdFromCivil(date, time) {
    if (!date) return null;
    var t = time || '12:00';
    var d = new Date(date + 'T' + t + ':00');
    if (isNaN(d.getTime())) return null;
    return d.getTime() / 86400000 + 2440587.5;
  }

  function readPerson(prefix) {
    var dateEl = $(prefix + '-date');
    var timeEl = $(prefix + '-time');
    var nameEl = $(prefix + '-name');
    var date = dateEl ? dateEl.value : '';
    var time = timeEl ? timeEl.value : '';
    return {
      name: nameEl && nameEl.value.trim() ? nameEl.value.trim() : (prefix === 'person1' ? 'A' : 'B'),
      date: date,
      time: time,
      jd: jdFromCivil(date, time),
      noon: !time
    };
  }

  function writeField(id, value) {
    var el = $(id);
    if (el && value) el.value = value;
  }

  function orrery() { return $('orr'); }

  function setPressed(which) {
    active = which;
    ['ab-a', 'ab-b', 'ab-now'].forEach(function (id) {
      var btn = $(id);
      if (btn) btn.setAttribute('aria-pressed', id === 'ab-' + which ? 'true' : 'false');
    });
  }

  function stamp(text) {
    var el = $('sky-time-status');
    if (el) el.textContent = text;
    var note = $('ap-ab-note');
    if (note) note.textContent = text;
  }

  function resetScrub() {
    scrubOffset = 0;
    var el = $('minute-scrub');
    if (el) el.value = '0';
    var lab = $('minute-scrub-label');
    if (lab) lab.textContent = 'Birth minute';
  }

  function enableScrub(on) {
    var el = $('minute-scrub');
    if (el) el.disabled = !on;
  }

  function applySky(jd, label) {
    var o = orrery();
    if (!jd || !o || !o.setJD) return;
    o.setJD(jd + scrubOffset / 1440);
    stamp(label);
  }

  function showA() {
    var p = readPerson('person1');
    if (!p.jd) return;
    resetScrub();
    setPressed('a');
    enableScrub(true);
    applySky(p.jd, p.name + ' · ' + p.date + ' ' + (p.time || '12:00 noon') + ' · this device zone');
    writeHash();
    renderAngles();
  }

  function showB() {
    var p = readPerson('person2');
    if (!p.jd) return;
    resetScrub();
    setPressed('b');
    enableScrub(true);
    applySky(p.jd, p.name + ' · ' + p.date + ' ' + (p.time || '12:00 noon') + ' · this device zone');
    writeHash();
    renderAngles();
  }

  function showLive() {
    var o = orrery();
    if (o && o.setLive) o.setLive();
    resetScrub();
    enableScrub(false);
    setPressed('now');
    stamp('Live sky · now');
  }

  function onScrub() {
    var el = $('minute-scrub');
    if (!el) return;
    scrubOffset = parseInt(el.value, 10) || 0;
    var lab = $('minute-scrub-label');
    if (lab) {
      if (!scrubOffset) lab.textContent = 'Birth minute';
      else lab.textContent = (scrubOffset > 0 ? '+' : '') + scrubOffset + ' min';
    }
    var p = active === 'b' ? readPerson('person2') : readPerson('person1');
    if (!p.jd) return;
    var when = p.date + ' ' + (p.time || '12:00');
    applySky(p.jd, p.name + ' · ' + when + (scrubOffset ? ' · ' + (scrubOffset > 0 ? '+' : '') + scrubOffset + ' min' : '') + ' · this device zone');
  }

  function enableToggles() {
    var a = readPerson('person1');
    var b = readPerson('person2');
    if ($('ab-a')) $('ab-a').disabled = !a.jd;
    if ($('ab-b')) $('ab-b').disabled = !b.jd;
    var inv = $('compat-invite-btn');
    if (inv) inv.disabled = !a.jd;
    return !!(a.jd && b.jd);
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
    var box = $('ap-angles');
    var list = $('ap-angles-list');
    if (!box || !list) return;
    var a = readPerson('person1');
    var b = readPerson('person2');
    if (!a.jd || !b.jd || !window.VoidEphem) {
      box.hidden = true;
      list.innerHTML = '';
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
    list.innerHTML = '';
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

  /* Hash only. Never touch location.search. Browsers do not send # to a server. */
  function sceneFromHash() {
    var raw = (location.hash || '').replace(/^#/, '');
    if (!raw) return { a: null, b: null };
    var q = new URLSearchParams(raw);
    function one(prefix) {
      var date = q.get(prefix) || '';
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
      var time = q.get(prefix + 't') || '';
      if (time && !/^\d{2}:\d{2}$/.test(time)) time = '';
      return { date: date, time: time, name: q.get(prefix + 'n') || '' };
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
    }
    if (b.date) {
      q.set('b', b.date);
      if (b.time) q.set('bt', b.time);
      if (b.name && b.name !== 'B') q.set('bn', b.name);
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
    }
    if (scene.b) {
      writeField('person2-date', scene.b.date);
      writeField('person2-time', scene.b.time);
      writeField('person2-name', scene.b.name);
    }
    enableToggles();
    if (scene.a && scene.a.date) showA();
  }

  function inviteLink() {
    writeHash();
    return location.origin + location.pathname + location.hash;
  }

  function onInvite() {
    var a = readPerson('person1');
    var btn = $('compat-invite-btn');
    if (!a.jd) return;
    var link = inviteLink();
    var done = function () {
      if (!btn) return;
      var old = btn.textContent;
      btn.textContent = 'Hash link copied';
      setTimeout(function () { btn.textContent = old; }, 2000);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(link).then(done).catch(done);
    } else {
      done();
    }
  }

  function onSubmit(event) {
    event.preventDefault();
    var err = $('compatError');
    var a = readPerson('person1');
    var b = readPerson('person2');
    if (!a.jd || !b.jd) {
      if (err) {
        err.hidden = false;
        err.textContent = 'Both people need a birth date. Time can stay blank (noon is used).';
      }
      enableToggles();
      return;
    }
    if (err) { err.hidden = true; err.textContent = ''; }
    enableToggles();
    showA();
  }

  document.addEventListener('DOMContentLoaded', function () {
    var form = $('compat-form');
    if (form) form.addEventListener('submit', onSubmit);
    if ($('ab-a')) $('ab-a').addEventListener('click', showA);
    if ($('ab-b')) $('ab-b').addEventListener('click', showB);
    if ($('ab-now')) $('ab-now').addEventListener('click', showLive);
    if ($('compat-invite-btn')) $('compat-invite-btn').addEventListener('click', onInvite);
    if ($('minute-scrub')) $('minute-scrub').addEventListener('input', onScrub);
    ['person1-date', 'person1-time', 'person1-name', 'person2-date', 'person2-time', 'person2-name'].forEach(function (id) {
      var el = $(id);
      if (el) el.addEventListener('change', function () { enableToggles(); writeHash(); renderAngles(); });
    });
    applyHash();
    if (!sceneFromHash().a) {
      enableToggles();
      setPressed('now');
      enableScrub(false);
    }
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
