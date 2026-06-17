/**
 * AstroPrecise — on-demand interpretations.js loader (~464 KB).
 * Call window.loadInterpretations() before any reading that needs the corpus.
 */
(function () {
  'use strict';

  var loadPromise = null;

  function loadInterpretations() {
    if (window.__apInterpReady && (window.Interpretations || window.AstroInterpretations)) {
      return Promise.resolve(window.Interpretations || window.AstroInterpretations);
    }
    if (loadPromise) return loadPromise;

    loadPromise = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = 'js/interpretations.js';
      s.async = true;
      s.onload = function () {
        window.__apInterpReady = true;
        resolve(window.Interpretations || window.AstroInterpretations);
      };
      s.onerror = function () {
        loadPromise = null;
        reject(new Error('Failed to load interpretations.js'));
      };
      (document.head || document.documentElement).appendChild(s);
    });

    return loadPromise;
  }

  window.loadInterpretations = loadInterpretations;
})();