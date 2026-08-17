/**
 * Home Observatory Keep bridge.
 *
 * When a birth minute is known (ap-sky-ready, session chart, or keep-minute
 * handoff with a real clock), enable birth-hour Keep and publish the same
 * ap-keep-sky-context fields as chart-page publishKeepSkyContext.
 *
 * No birth minute → leave Keep disabled with an honest caption. Never invent noon.
 */
(function () {
  'use strict';

  var DISABLED_CAPTION =
    'Needs a birth minute from your chart. Cast with a clock time to keep that hour\u2019s still \u2014 the live sky above stays free.';

  function tzOffsetMinutes(tz, utcDate) {
    if (!tz || tz === 'UTC') return 0;
    try {
      var fmt = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        timeZoneName: 'shortOffset',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      var parts = fmt.formatToParts(utcDate);
      var off = '';
      parts.forEach(function (p) {
        if (p.type === 'timeZoneName') off = p.value;
      });
      var m = off.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
      if (!m) return 0;
      var sign = m[1] === '-' ? -1 : 1;
      return sign * (parseInt(m[2], 10) * 60 + parseInt(m[3] || '0', 10));
    } catch (_) {
      return 0;
    }
  }

  function localToUT(y, m, d, hh, mm, tz) {
    var utc = new Date(Date.UTC(y, m - 1, d, hh, mm, 0));
    for (var i = 0; i < 2; i++) {
      var off = tzOffsetMinutes(tz, utc);
      utc = new Date(Date.UTC(y, m - 1, d, hh, mm, 0) - off * 60000);
    }
    return utc;
  }

  function jdFromDate(date) {
    return date.getTime() / 86400000 + 2440587.5;
  }

  function detailFromFields(fields) {
    if (!fields || !/^\d{4}-\d{2}-\d{2}$/.test(String(fields.birthDate || ''))) return null;
    var time = fields.birthTime ? String(fields.birthTime).trim() : '';
    var timeKnown = fields.timeKnown === true && /^\d{1,2}:\d{2}/.test(time);
    if (!timeKnown) return null;

    var parts = String(fields.birthDate).split('-').map(Number);
    var clock = time.split(':');
    var hh = parseInt(clock[0], 10);
    var mm = parseInt(clock[1], 10);
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;

    var jd = Number(fields.jd);
    if (!Number.isFinite(jd)) {
      var ut = localToUT(parts[0], parts[1], parts[2], hh, mm, fields.timezone || 'UTC');
      jd = jdFromDate(ut);
    }

    return {
      jd: jd,
      birthDate: String(fields.birthDate),
      birthTime: time.slice(0, 5),
      timeKnown: true,
      timeAccuracy: fields.timeAccuracy ? String(fields.timeAccuracy) : 'exact',
      place: fields.place ? String(fields.place) : '',
      timezone: fields.timezone ? String(fields.timezone) : ''
    };
  }

  function detailFromChart(chart) {
    if (!chart) return null;
    return detailFromFields({
      jd: chart.jd,
      birthDate: chart.birthDate || chart.date,
      birthTime: chart.birthTime || chart.time,
      timeKnown: chart.timeKnown === true,
      timeAccuracy: chart.timeAccuracy,
      place: chart.city || chart.birthCity || chart.place || '',
      timezone: chart.tz || chart.timezone || ''
    });
  }

  function detailFromIso(iso, meta) {
    if (!iso || !meta || !meta.birthDate || meta.timeKnown !== true) return null;
    var date = new Date(iso);
    if (Number.isNaN(date.getTime())) return null;
    return detailFromFields({
      jd: jdFromDate(date),
      birthDate: meta.birthDate,
      birthTime: meta.birthTime,
      timeKnown: true,
      timeAccuracy: meta.timeAccuracy || 'exact',
      place: meta.place || '',
      timezone: meta.timezone || ''
    });
  }

  function readJson(store, key) {
    try {
      var raw = store.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (_) {
      return null;
    }
  }

  function fromSessionChart() {
    var handoff = readJson(sessionStorage, 'ap-chart-handoff');
    if (handoff && handoff.date && handoff.time) {
      return detailFromFields({
        birthDate: handoff.date,
        birthTime: handoff.time,
        timeKnown: true,
        place: handoff.city || handoff.place || '',
        timezone: handoff.tz || handoff.zone || ''
      });
    }
    return null;
  }

  function fromKeepMinute() {
    var minute = readJson(sessionStorage, 'ap-sky-card-handoff');
    if (!minute || !minute.date || !minute.time) return null;
    return detailFromFields({
      birthDate: minute.date,
      birthTime: minute.time,
      timeKnown: true,
      place: minute.place || '',
      timezone: minute.zone || minute.tz || ''
    });
  }

  function fromSavedCharts() {
    var charts = readJson(localStorage, 'ap_charts');
    if (!Array.isArray(charts) || !charts.length) return null;
    var activeId = null;
    try { activeId = localStorage.getItem('ap_active_chart'); } catch (_) {}
    var chart = (activeId && charts.find(function (c) {
      return String(c.id) === String(activeId);
    })) || charts[0];
    return detailFromChart(chart);
  }

  function publish(detail) {
    var btn = document.getElementById('keep-sky');
    var note = document.getElementById('keep-sky-caption');
    if (!btn || btn.dataset.keepMode !== 'birth-hour') return;

    if (!detail) {
      if (note && !birthPublished) note.textContent = DISABLED_CAPTION;
      return;
    }

    birthPublished = true;
    document.dispatchEvent(new CustomEvent('ap-keep-sky-context', { detail: detail }));
  }

  var birthPublished = false;

  function resolveBoot() {
    publish(
      fromSessionChart() ||
      fromKeepMinute() ||
      fromSavedCharts() ||
      null
    );
  }

  document.addEventListener('ap-sky-ready', function (event) {
    var detail = event && event.detail;
    if (!detail) return;
    var fromChart = detailFromChart(detail.chart);
    if (fromChart) {
      publish(fromChart);
      return;
    }
    if (detail.m && detail.chart) {
      var meta = {
        birthDate: detail.chart.birthDate || detail.chart.date,
        birthTime: detail.chart.birthTime || detail.chart.time,
        timeKnown: detail.chart.timeKnown === true,
        timeAccuracy: detail.chart.timeAccuracy,
        place: detail.chart.city || detail.chart.birthCity || '',
        timezone: detail.chart.tz || ''
      };
      var fromM = detailFromIso(detail.m, meta);
      if (fromM) publish(fromM);
    }
  });

  function boot() {
    var note = document.getElementById('keep-sky-caption');
    if (note && !note.textContent.trim()) note.textContent = DISABLED_CAPTION;
    resolveBoot();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
