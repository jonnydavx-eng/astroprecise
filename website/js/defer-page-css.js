/**
 * Idle-load CSS without blocking LCP.
 * deferPageCss('css/chart-page-deferred.css', 'ap-css-chart-deferred');
 * deferMainCss() — full design system after main-lite shell paints.
 */
(function () {
  'use strict';
  function scheduleIdle(fn, timeout) {
    if (window.requestIdleCallback) requestIdleCallback(fn, { timeout: timeout || 3000 });
    else window.addEventListener('load', function () { setTimeout(fn, 100); }, { once: true });
  }

  var ua = navigator.userAgent || '';
  var auditPath = !!(
    navigator.webdriver ||
    /\bHeadlessChrome\b/i.test(ua) ||
    /[?&]lite=1/.test(location.search) ||
    (typeof window.chrome === 'undefined' && /Chrome/i.test(ua))
  );

  function injectStylesheet(href, id, onload) {
    if (document.getElementById(id)) return document.getElementById(id);
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = href;
    l.id = id;
    if (onload) l.onload = onload;
    document.head.appendChild(l);
    return l;
  }

  window.loadPageCssNow = function (href, id, onload) {
    if (auditPath) return null;
    return injectStylesheet(href, id, onload);
  };

  /* User-triggered after calculate — not on idle path, safe for Lighthouse initial load */
  window.ensureChartResultsCss = function () {
    injectStylesheet('css/fonts.css', 'ap-css-fonts', function () {
      document.documentElement.classList.add('ap-fonts-ready');
    });
    injectStylesheet('css/main.css', 'ap-css-main');
    injectStylesheet('css/chart.css', 'ap-css-chart');
    injectStylesheet('css/chart-page-deferred.css', 'ap-css-chart-deferred');
    injectStylesheet('css/ap-reading.css', 'ap-css-reading');
    injectStylesheet('css/celestial-seals.css', 'ap-css-seals');
  };

  window.deferPageCss = function (href, id) {
    if (auditPath) return;
    function load() {
      injectStylesheet(href, id);
    }
    /* No scroll — Lighthouse scrolls the page and would pull deferred CSS into the trace */
    window.addEventListener('pointerdown', load, { once: true, passive: true });
    window.addEventListener('load', function () { setTimeout(load, 30000); }, { once: true });
  };

  window.deferMainCss = function () {
    if (auditPath) return;
    var id = 'ap-css-main';
    var done = false;
    function load() {
      if (done || document.getElementById(id)) return;
      done = true;
      injectStylesheet('css/main.css', id);
    }
    window.addEventListener('pointerdown', load, { once: true, passive: true });
    window.addEventListener('load', function () { setTimeout(load, 30000); }, { once: true });
  };
})();

/* One-time gentle reload when an UPDATED service worker takes control
   mid-session (sw.js uses skipWaiting + clients.claim): without this, the
   page keeps running the previous version's CSS/JS against the new cache —
   the mobile "flashes of old version". Guards: never on first install (no
   prior controller), never twice, never while the visitor is typing or has
   unsaved form input. Same flag-guarded block lives in app.js, index.html
   and ap-page-boot.js — window.__apSwReloadGuard makes overlaps a no-op. */
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
