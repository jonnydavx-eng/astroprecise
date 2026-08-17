/**
 * Home reading plate — sky-now (or natal, if a saved chart has longitudes).
 * Uses AstroOracle.getDailyInsight. Never invents a birth minute or a LIVE badge.
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

  function firstSentence(text) {
    var raw = String(text || '').replace(/\s+/g, ' ').trim();
    if (!raw) return '';
    var cut = raw.search(/[.!?](\s|$)/);
    if (cut < 0) return raw.length > 220 ? raw.slice(0, 217) + '…' : raw;
    return raw.slice(0, cut + 1);
  }

  function paint(insight, natal) {
    var kicker = $('ap-reading-kicker');
    var title = $('ap-reading-title');
    var body = $('ap-reading-body');
    var source = $('ap-reading-source');
    if (!insight) return;

    var moon = insight.meta && insight.meta.moonSign;
    var sun = insight.meta && insight.meta.sunSign;
    var mode = insight.meta && insight.meta.mode;

    if (kicker) {
      if (mode === 'natal' && natal) kicker.textContent = 'Your sky tonight';
      else if (sun) kicker.textContent = 'Tonight · Sun in ' + sun;
      else kicker.textContent = 'The night you were born';
    }
    if (title) {
      if (moon) title.textContent = 'Moon in ' + moon;
      else title.textContent = insight.headline || 'Sit with the sky first';
    }
    if (body) {
      var line = firstSentence(insight.body);
      body.textContent = line || body.textContent;
    }
    if (source) {
      source.textContent = mode === 'natal'
        ? 'From the chart saved on this device. Astrology is symbolic, not a scientific claim.'
        : 'Sky now, computed here. Cast a chart to read this hour against your birth.';
    }
  }

  function run() {
    loadScript(oracleSrc).then(function () {
      if (!window.AstroOracle || typeof window.AstroOracle.getDailyInsight !== 'function') return;
      var natal = savedChart();
      var insight = window.AstroOracle.getDailyInsight(natal, new Date());
      paint(insight, natal);
    }).catch(function () {
      var source = $('ap-reading-source');
      if (source) source.textContent = 'The reading engine is unavailable. The model above is still the live sky.';
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
