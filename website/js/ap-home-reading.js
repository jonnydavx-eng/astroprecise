/**
 * Home sitting plate — invitation first.
 * Sky-now signs may caption the source line. They must not replace the sitting.
 */
(function () {
  'use strict';

  if (!document.body || !document.body.classList.contains('ap-reading-room')) return;

  var oracleSrc = 'js/oracle.js?v=884';

  function $(id) { return document.getElementById(id); }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      if (window.AstroOracle && typeof window.AstroOracle.getDailyInsight === 'function') {
        resolve();
        return;
      }
      var s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('oracle load failed')); };
      document.head.appendChild(s);
    });
  }

  function readJson(store, key) {
    try {
      var raw = store.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function savedChart() {
    var charts = readJson(localStorage, 'ap_charts');
    if (!Array.isArray(charts) || !charts.length) return null;
    var activeId = null;
    try { activeId = localStorage.getItem('ap_active_chart'); } catch (_) {}
    var chart = (activeId && charts.filter(function (c) {
      return String(c.id) === String(activeId);
    })[0]) || charts[0];
    return chart && chart.positions ? chart : null;
  }

  function paint(insight, natal) {
    var kicker = $('ap-reading-kicker');
    var title = $('ap-reading-title');
    var body = $('ap-reading-body');
    var source = $('ap-reading-source');
    var moon = insight && insight.meta && insight.meta.moonSign;
    var sun = insight && insight.meta && insight.meta.sunSign;

    if (kicker) kicker.textContent = natal ? 'Your minute is on this device' : 'The night you were born';
    if (title) title.textContent = natal ? 'Sit with the hour you arrived' : 'Sit with the sky first';
    if (body) {
      body.textContent = natal
        ? 'The chart is already here. Open the seven chapters, or keep a still of that hour.'
        : 'Earth now, then the minute you arrived, then seven chapters you can keep.';
    }
    if (source) {
      var signs = [];
      if (moon) signs.push('Moon in ' + moon);
      if (sun) signs.push('Sun in ' + sun);
      source.textContent = natal
        ? 'From the chart saved on this device. Astrology is symbolic, not a scientific claim.'
        : (signs.length ? signs.join(' · ') + '. Computed here. Cast a chart to read this hour against your birth.'
          : 'Positions computed on this device. Astrology is offered for reflection, not as fact.');
    }
  }

  function run() {
    var natal = savedChart();
    paint(null, natal);
    loadScript(oracleSrc).then(function () {
      if (!window.AstroOracle || typeof window.AstroOracle.getDailyInsight !== 'function') return;
      var insight = window.AstroOracle.getDailyInsight(natal, new Date());
      paint(insight, natal);
    }).catch(function () {
      var source = $('ap-reading-source');
      if (source) source.textContent = 'The reading engine is unavailable. The model below is still the live sky.';
    });
  }

  var instrumentBtn = $('ap-open-instrument');
  if (instrumentBtn) {
    instrumentBtn.addEventListener('click', function () {
      var open = document.body.classList.toggle('is-instrument-open');
      instrumentBtn.textContent = open ? 'Put the instrument away' : 'Use the instrument';
      instrumentBtn.setAttribute('aria-pressed', open ? 'true' : 'false');
    });
  }

  function start() {
    if (window.AstroEphemeris && window.AstroEphemeris.julianDay) {
      run();
      return;
    }
    document.addEventListener('ap-orrery-ready', run, { once: true });
    setTimeout(function () {
      if (window.AstroEphemeris && window.AstroEphemeris.julianDay) run();
    }, 2400);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
