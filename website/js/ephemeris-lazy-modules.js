/**
 * Ephemeris page — defer heavy section modules (daimon ~103KB, orrery3d ~55KB)
 * until viewport proximity or explicit user action (set birth event).
 */
(function () {
  'use strict';

  if (!document.getElementById('sec-daimon') && !document.getElementById('sec-timetravel')) return;

  var daimonPromise = null;
  var orreryPromise = null;

  function injectScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.defer = true;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error(src + ' failed to load')); };
      document.body.appendChild(s);
    });
  }

  function loadDaimon() {
    if (window.Daimon) return Promise.resolve(window.Daimon);
    if (!daimonPromise) {
      daimonPromise = injectScript('js/daimon.js').then(function () {
        if (!window.Daimon) throw new Error('daimon.js did not register Daimon');
        return window.Daimon;
      }).catch(function (err) {
        daimonPromise = null;
        throw err;
      });
    }
    return daimonPromise;
  }

  function loadOrrery3D() {
    if (window.Orrery3D) return Promise.resolve(window.Orrery3D);
    if (!orreryPromise) {
      orreryPromise = injectScript('js/orrery3d.js').then(function () {
        if (!window.Orrery3D) throw new Error('orrery3d.js did not register Orrery3D');
        document.dispatchEvent(new CustomEvent('ap:orrery3d-ready'));
        return window.Orrery3D;
      }).catch(function (err) {
        orreryPromise = null;
        throw err;
      });
    }
    return orreryPromise;
  }

  function observeWhenNear(id, onNear) {
    var el = document.getElementById(id);
    if (!el) return;
    if (!('IntersectionObserver' in window)) {
      onNear();
      return;
    }
    var fired = false;
    var io = new IntersectionObserver(function (entries) {
      if (fired) return;
      if (entries.some(function (e) { return e.isIntersecting; })) {
        fired = true;
        io.disconnect();
        onNear();
      }
    }, { rootMargin: '0px 0px 240px 0px', threshold: 0 });
    io.observe(el);
  }

  function wireEventTriggers() {
    function onSet() { loadDaimon().catch(function () {}); }
    var setBtn = document.getElementById('ev-set');
    var exBtn = document.getElementById('ev-example');
    if (setBtn) setBtn.addEventListener('click', onSet);
    if (exBtn) exBtn.addEventListener('click', onSet);
  }

  function boot() {
    observeWhenNear('sec-daimon', function () { loadDaimon().catch(function () {}); });
    observeWhenNear('sec-timetravel', function () { loadOrrery3D().catch(function () {}); });
    observeWhenNear('tt-canvas', function () { loadOrrery3D().catch(function () {}); });
    wireEventTriggers();
  }

  window.ApEphemerisLazy = {
    loadDaimon: loadDaimon,
    loadOrrery3D: loadOrrery3D,
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();