/**
 * Deferred orrery engine loader — keeps Three.js off the critical path until needed.
 * Preloader path loads immediately; return visits warm on idle.
 */
(function () {
  'use strict';

  var loadPromise = null;
  var scriptEl = document.currentScript;
  var ORRERY_MODULE = (scriptEl && scriptEl.src)
    ? new URL('orrery-webgl.js', scriptEl.src).href
    : 'js/orrery-webgl.js';

  function loadEngine() {
    if (window.Orrery3D) return Promise.resolve(window.Orrery3D);
    if (loadPromise) return loadPromise;
    loadPromise = import(ORRERY_MODULE).then(function () {
      if (!window.Orrery3D) throw new Error('orrery-webgl did not register Orrery3D');
      return window.Orrery3D;
    }).catch(function (err) {
      loadPromise = null;
      throw err;
    });
    return loadPromise;
  }

  window.__loadOrreryEngine = loadEngine;

  try {
    var introSeen = sessionStorage.getItem('ap_intro_complete') === '1';
    if (introSeen) {
      var warm = function () { loadEngine().catch(function () {}); };
      if (window.requestIdleCallback) requestIdleCallback(warm, { timeout: 2200 });
      else setTimeout(warm, 500);
    } else {
      // First visit: preloader needs the engine — start loading immediately in <head>
      loadEngine().catch(function () {});
    }
  } catch (e) {
    loadEngine().catch(function () {});
  }
})();