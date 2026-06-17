/**
 * AstroPrecise — unified Tier-C page chrome boot.
 * Ensures: ap-zodiac-constants → celestial-seals → icons → ap-page-bridge → ap-nav-model → app.js
 * Daily/content scripts (sign-page-boot, etc.) stay separate on sign pages.
 */
(function () {
  'use strict';

  var CHAIN = [
    'js/ap-zodiac-constants.js',
    'js/celestial-seals.js',
    'js/icons.js',
    'js/ap-page-bridge.js',
    'js/ap-nav-model.js',
    'js/app.js',
  ];

  function scriptLoaded(src) {
    var leaf = src.split('/').pop();
    var scripts = document.scripts;
    for (var i = 0; i < scripts.length; i++) {
      var href = scripts[i].src || '';
      if (href.indexOf(leaf) >= 0) return true;
    }
    return false;
  }

  function inject(src, next) {
    if (scriptLoaded(src)) {
      if (next) next();
      return;
    }
    var s = document.createElement('script');
    s.src = src;
    s.defer = true;
    s.onload = function () { if (next) next(); };
    s.onerror = function () { if (next) next(); };
    document.body.appendChild(s);
  }

  function loadChain(index) {
    if (index >= CHAIN.length) return;
    inject(CHAIN[index], function () { loadChain(index + 1); });
  }

  window.AP_PAGE_BOOT = {
    CHAIN: CHAIN.slice(),
    load: function () { loadChain(0); },
  };

  function start() {
    loadChain(0);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();