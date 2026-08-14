/**
 * Astro Precise — unified Tier-C page chrome boot.
 * Ensures: ap-zodiac-constants → celestial-seals → icons → ap-page-bridge → ap-nav-model → app.js
 * Daily/content scripts (sign-page-boot, etc.) stay separate on sign pages.
 */
(function () {
  'use strict';

  document.documentElement.classList.add('ap-enchanted', 'ap-brand-nebula');

if (typeof window.AP_ASSET_V === 'undefined') window.AP_ASSET_V = '871';
  var AV = window.AP_ASSET_V;

  // Client error beacon (session buffer; optional future Sentry DSN via meta)
  if (!document.getElementById('ap-error-beacon')) {
    var _eb = document.createElement('script');
    _eb.id = 'ap-error-beacon';
    _eb.src = 'js/ap-error-beacon.js?v=' + AV;
    _eb.defer = true;
    document.head.appendChild(_eb);
  }

  function ensureSitePolishCss() {
    if (document.getElementById('ap-css-site-polish') || document.querySelector('link[href*="ap-site-polish"]')) return;
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'css/ap-site-polish.css?v=' + AV;
    l.id = 'ap-css-site-polish';
    document.head.appendChild(l);
  }
  ensureSitePolishCss();

  function ensurePaletteCss() {
    if (document.getElementById('ap-css-palette-2026') || document.querySelector('link[href*="ap-palette-2026"]')) return;
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'css/ap-palette-2026.css?v=' + AV;
    l.id = 'ap-css-palette-2026';
    document.head.appendChild(l);
  }
  ensurePaletteCss();

  function ensureLogoAuroraCss() {
    if (document.getElementById('ap-css-logo-aurora')) return;
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'css/ap-logo-aurora.css?v=' + AV;
    l.id = 'ap-css-logo-aurora';
    document.head.appendChild(l);
  }
  ensureLogoAuroraCss();

  function ensureVisualClarityCss() {
    if (document.getElementById('ap-css-visual-clarity')) return;
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'css/ap-visual-clarity.css?v=' + AV;
    l.id = 'ap-css-visual-clarity';
    document.head.appendChild(l);
  }
  ensureVisualClarityCss();

  function ensureModelStageCss() {
    if (document.getElementById('ap-css-model-stage')) return;
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'css/ap-model-stage.css?v=' + AV;
    l.id = 'ap-css-model-stage';
    document.head.appendChild(l);
  }
  ensureModelStageCss();

  function ensurePageStructureCss() {
    if (document.getElementById('ap-css-page-structure')) return;
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'css/ap-page-structure.css?v=' + AV;
    l.id = 'ap-css-page-structure';
    document.head.appendChild(l);
  }
  ensurePageStructureCss();

  function ensureBrandNebulaCss() {
    if (document.getElementById('ap-css-brand-nebula')) return;
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'css/ap-brand-nebula.css?v=' + AV;
    l.id = 'ap-css-brand-nebula';
    document.head.appendChild(l);
  }
  ensureBrandNebulaCss();

  var CHAIN = [
    'js/ap-zodiac-constants.js',
    'js/celestial-seals.js',
    'js/icons.js',
    'js/ap-page-bridge.js',
    'js/ap-nav-model.js',
    'js/ap-footer-inject.js',
    'js/app.js',
    // Engine stills / cinema plate sitewide (no Three.js — safe)
    'js/ap-engine-visuals.js',
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
      s.src = CHAIN[i] + '?v=' + AV;
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

/* One-time gentle reload when an UPDATED service worker takes control
   mid-session (sw.js uses skipWaiting + clients.claim): without this, the
   page keeps running the previous version's CSS/JS against the new cache —
   the mobile "flashes of old version". Guards: never on first install (no
   prior controller), never twice, never while the visitor is typing or has
   unsaved form input. Same flag-guarded block lives in app.js, index.html
   and defer-page-css.js — window.__apSwReloadGuard makes overlaps a no-op. */
(function () {
  if (!('serviceWorker' in navigator) || navigator.webdriver) return;
  if (window.__apSwReloadGuard) return;
  window.__apSwReloadGuard = 1;
  var hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (!hadController) { hadController = true; return; }
    if (window.__apSwReloaded) return;
    var el = document.activeElement;
    if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
    var dirty = false;
    try {
      var fields = document.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]), textarea');
      for (var i = 0; i < fields.length; i++) {
        if (fields[i].value !== fields[i].defaultValue) { dirty = true; break; }
      }
    } catch (err) {}
    if (dirty) return;
    window.__apSwReloaded = 1;
    if (document.visibilityState === 'hidden') location.reload(); /* only refresh backgrounded tabs — never a visible reload flash while the visitor is looking */
  });
})();





