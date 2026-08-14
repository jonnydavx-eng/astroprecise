/* Couples sky — one void-orrery, A/B birth minutes. Local only. Hash only. */
(function () {
  'use strict';

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
    var date = dateEl && dateEl.value != null ? String(dateEl.value) : '';
    var time = timeEl && timeEl.value != null ? String(timeEl.value) : '';
    var rawName = nameEl && nameEl.value != null ? String(nameEl.value).trim() : '';
    return {
      name: rawName || (prefix === 'person1' ? 'A' : 'B'),
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

  function showA() {
    var p = readPerson('person1');
    var o = orrery();
    if (!p.jd || !o || !o.setJD) return;
    o.setJD(p.jd);
    setPressed('a');
    stamp(p.name + ' · ' + p.date + ' ' + (p.time || '12:00 noon') + ' · this device zone');
    writeHash();
  }

  function showB() {
    var p = readPerson('person2');
    var o = orrery();
    if (!p.jd || !o || !o.setJD) return;
    o.setJD(p.jd);
    setPressed('b');
    stamp(p.name + ' · ' + p.date + ' ' + (p.time || '12:00 noon') + ' · this device zone');
    writeHash();
  }

  function showLive() {
    var o = orrery();
    if (o && o.setLive) o.setLive();
    setPressed('now');
    stamp('Live sky · now');
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
    if (location.search) {
      /* Ignore leftover query strings. Never write them back. */
    }
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
    ['person1-date', 'person1-time', 'person1-name', 'person2-date', 'person2-time', 'person2-name'].forEach(function (id) {
      var el = $(id);
      if (el) el.addEventListener('change', function () { enableToggles(); writeHash(); });
    });
    applyHash();
    if (!sceneFromHash().a) {
      enableToggles();
      setPressed('now');
    }
  });
})();
