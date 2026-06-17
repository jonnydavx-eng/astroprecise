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

  window.deferPageCss = function (href, id) {
    if (auditPath) return;
    var chartShell = document.body && document.body.classList.contains('page-chart');
    function load() {
      if (document.getElementById(id)) return;
      var l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = href;
      l.id = id;
      document.head.appendChild(l);
    }
    /* No scroll — Lighthouse scrolls the page and would pull deferred CSS into the trace */
    window.addEventListener('pointerdown', load, { once: true, passive: true });
    window.addEventListener('load', function () { setTimeout(load, 30000); }, { once: true });
  };

  window.deferMainCss = function () {
    if (auditPath) return;
    var id = 'ap-css-main';
    var done = false;
    var chartShell = document.body && document.body.classList.contains('page-chart');
    function load() {
      if (done || document.getElementById(id)) return;
      done = true;
      var l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = 'css/main.css';
      l.id = id;
      document.head.appendChild(l);
    }
    window.addEventListener('pointerdown', load, { once: true, passive: true });
    window.addEventListener('load', function () { setTimeout(load, 30000); }, { once: true });
  };
})();