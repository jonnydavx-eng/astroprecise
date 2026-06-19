/**
 * Hover/touch prefetch for high-traffic nav destinations (chart, horoscope, shop).
 * Same-origin only; skipped when Save-Data is enabled.
 */
(function () {
  'use strict';

  var TARGETS = /^(?:\.\/)?(?:chart|horoscope|shop)\.html(?:[?#].*)?$/i;
  var prefetched = Object.create(null);

  function saveDataEnabled() {
    try {
      var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      return !!(conn && conn.saveData);
    } catch (e) {
      return false;
    }
  }

  function shouldPrefetch(href) {
    if (!href || href.charAt(0) === '#' || /^mailto:|^tel:|^javascript:/i.test(href)) return false;
    try {
      var url = new URL(href, location.href);
      if (url.origin !== location.origin) return false;
      var path = url.pathname.replace(/^\/+/, '');
      return TARGETS.test(path + url.search + url.hash);
    } catch (e) {
      return false;
    }
  }

  function prefetch(href) {
    if (saveDataEnabled()) return;
    var key;
    try {
      var url = new URL(href, location.href);
      key = url.pathname + url.search;
    } catch (e) {
      return;
    }
    if (prefetched[key]) return;
    prefetched[key] = true;

    var link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = key;
    link.as = 'document';
    document.head.appendChild(link);
  }

  function onPointer(e) {
    var el = e.target;
    if (!el || !el.closest) return;
    var a = el.closest('a[href]');
    if (!a) return;
    var href = a.getAttribute('href');
    if (!shouldPrefetch(href)) return;
    prefetch(href);
  }

  document.addEventListener('mouseover', onPointer, { passive: true, capture: true });
  document.addEventListener('touchstart', onPointer, { passive: true, capture: true });
})();