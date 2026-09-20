/**
 * Home sitting plate — invitation first.
 * Sky-now signs may caption the source line. They must not replace the sitting.
 */
(function () {
  'use strict';

  if (!document.body || !document.body.classList.contains('ap-reading-room')) return;

  var oracleSrc = 'js/oracle.js?v=912';

  function $(id) { return document.getElementById(id); }

  // Replacing identical text creates a fresh paint candidate. On Home the
  // authored H1 already contains the default invitation, so writing the same
  // string again after the 3D renderer becomes ready made Lighthouse report the
  // renderer-ready timestamp as text LCP. Preserve the existing node whenever
  // its copy is already correct; natal copy still personalises normally.
  function setText(node, value) {
    if (node && node.textContent !== value) node.textContent = value;
  }

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
    if (document.body.classList.contains('is-birth-sky')) return;
    var kicker = $('ap-reading-kicker');
    var title = $('ap-reading-title');
    var body = $('ap-reading-body');
    var source = $('ap-reading-source');
    var moon = insight && insight.meta && insight.meta.moonSign;
    var sunNow = insight && insight.meta && insight.meta.sunSign;
    var timed = !!(natal && natal.timeKnown === true);
    var natalSun = natal && natal.positions && natal.positions.Sun && natal.positions.Sun.sign;

    if (natal) {
      setText(kicker, timed ? 'Your minute is on this device' : 'Your date is on this device');
      setText(title, timed ? 'Sit with the hour you arrived' : 'Sit with the sky you were born under');
      if (natalSun && timed) {
        setText(body, 'Your Sun in ' + natalSun + ' is already here.');
      } else if (natalSun) {
        setText(body, 'Your Sun in ' + natalSun + ' is here. Moon, rising and houses wait for a birth time. Noon is a date reference, not your hour.');
      } else {
        setText(body, timed ? 'Your minute is already here.' : 'Your date is here. Moon, rising and houses wait for a birth time.');
      }
    } else {
      setText(kicker, 'The night you were born');
      setText(title, 'Sit with the sky first');
      setText(body, 'Earth now. Then the minute you arrived.');
    }
    if (source) {
      var signs = [];
      if (moon) signs.push('Moon in ' + moon);
      if (sunNow) signs.push('Sun in ' + sunNow);
      setText(source, natal
        ? 'From the chart saved on this device. Astrology is symbolic, not a scientific claim.'
        : (signs.length ? signs.join(' · ') + '. Computed here. Open your chart to read this hour against your birth.'
          : 'Positions computed on this device. Astrology is offered for reflection, not as fact.'));
    }
  }

  function run() {
    if (run.started) return;
    run.started = true;
    var natal = savedChart();
    paint(null, natal);
    // Home has no source caption, and the oracle output only feeds that
    // caption. Keep the sitting copy without loading an unused engine.
    if (!$('ap-reading-source')) return;
    loadScript(oracleSrc).then(function () {
      if (!window.AstroOracle || typeof window.AstroOracle.getDailyInsight !== 'function') return;
      var insight = window.AstroOracle.getDailyInsight(natal, new Date());
      paint(insight, natal);
    }).catch(function () {
      var source = $('ap-reading-source');
      setText(source, 'The reading engine is unavailable. The model below is still the live sky.');
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
