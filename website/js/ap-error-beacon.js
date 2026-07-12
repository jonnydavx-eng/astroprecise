/**
 * Astro Precise — lightweight client error beacon (no Sentry account required).
 * - Captures window errors + unhandled rejections
 * - Ring buffer in sessionStorage (last 25)
 * - Optional: <meta name="ap-sentry-dsn" content="https://...@..."> to enable Sentry later
 * - Inspect: window.AP_getClientErrors()
 */
(function () {
  'use strict';
  if (window.__AP_ERROR_BEACON__) return;
  window.__AP_ERROR_BEACON__ = true;

  var KEY = 'ap_client_errors_v1';
  var MAX = 25;

  function load() {
    try {
      var raw = sessionStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function save(list) {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(list.slice(-MAX)));
    } catch (e) { /* private mode / quota */ }
  }

  function push(entry) {
    var list = load();
    entry.ts = entry.ts || new Date().toISOString();
    entry.href = entry.href || (location && location.href) || '';
    list.push(entry);
    save(list);
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[AP error beacon]', entry.message || entry, entry);
    }
  }

  window.AP_getClientErrors = function () {
    return load();
  };
  window.AP_clearClientErrors = function () {
    try { sessionStorage.removeItem(KEY); } catch (e) {}
  };

  window.addEventListener('error', function (ev) {
    push({
      type: 'error',
      message: (ev && ev.message) || 'error',
      source: ev && ev.filename,
      line: ev && ev.lineno,
      col: ev && ev.colno,
      stack: ev && ev.error && ev.error.stack
    });
  });

  window.addEventListener('unhandledrejection', function (ev) {
    var reason = ev && ev.reason;
    var msg = reason && reason.message ? reason.message : String(reason);
    push({
      type: 'unhandledrejection',
      message: msg,
      stack: reason && reason.stack
    });
  });

  // Optional Sentry when you add a free project DSN to the page:
  // <meta name="ap-sentry-dsn" content="https://KEY@oORG.ingest.sentry.io/PROJECT">
  try {
    var meta = document.querySelector('meta[name="ap-sentry-dsn"]');
    var dsn = meta && meta.getAttribute('content');
    if (dsn && dsn.indexOf('http') === 0) {
      // Loader stub: set DSN; wire full @sentry/browser when you enable it in deploy.
      window.__AP_SENTRY_DSN__ = dsn;
      push({ type: 'info', message: 'Sentry DSN present — load @sentry/browser in deploy to activate' });
    }
  } catch (e) { /* ignore */ }
})();
