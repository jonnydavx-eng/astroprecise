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

  // Parallel download, in-order execution. Dynamically-inserted scripts are
  // async by default; async=false puts them in the in-order-execution list, so
  // the 6 chrome scripts (zodiac-constants → seals → icons → bridge → nav → app
  // 116KB) fetch CONCURRENTLY but still run in their required setup order. The
  // previous serial onload chain paid one round-trip per script — on a throttled
  // connection that serial latency was the dominant LCP render-delay.
  function loadChain() {
    for (var i = 0; i < CHAIN.length; i++) {
      if (scriptLoaded(CHAIN[i])) continue;
      var s = document.createElement('script');
      s.src = CHAIN[i];
      s.async = false;
      document.body.appendChild(s);
    }
  }

  window.AP_PAGE_BOOT = {
    CHAIN: CHAIN.slice(),
    load: function () { loadChain(); },
  };

  function start() {
    loadChain();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();