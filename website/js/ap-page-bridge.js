/**
 * Astro Precise — cross-page polish: enter fade, view-transition nav, continue toast.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'ap_last_tool';
  var MAX_AGE_MS = 30 * 60 * 1000;
  var ENTER_MS = 350;
  var NAV_SELECTOR = '.navbar__link, .ap-lite-rail__tile, .bottom-nav a';

  var TOOL_PAGES = {
    'chart.html': 'Chart',
    'horoscope.html': 'Daily',
    'compatibility.html': 'Match',
    'transits.html': 'Transits',
    'ephemeris.html': 'Sky',
    'shop.html': 'Shop',
    'lifepath.html': 'Life Path',
    'moonphase.html': 'Moon',
    'quiz.html': 'Quiz',
    'profile.html': 'Profile'
  };

  var bound = false;
  var enterDone = false;
  var toastDone = false;
  var eventDone = false;

  function pageKey() {
    var p = (location.pathname || '').split('/').pop() || 'index.html';
    if (p === 'horoscope.html') {
      try {
        var sign = new URLSearchParams(location.search || '').get('sign');
        if (sign) return 'horoscope.html?sign=' + String(sign).toLowerCase();
      } catch (e) {}
    }
    return p;
  }

  function currentTool() {
    var key = pageKey();
    var base = key.split('?')[0];
    var label = TOOL_PAGES[key] || TOOL_PAGES[base];
    return label ? { path: key, label: label } : null;
  }

  function readStored() {
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || !data.path || !data.label || !data.ts) return null;
      if (Date.now() - data.ts > MAX_AGE_MS) {
        sessionStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return data;
    } catch (e) {
      return null;
    }
  }

  function persistTool() {
    var tool = currentTool();
    if (!tool) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        path: tool.path,
        label: tool.label,
        ts: Date.now()
      }));
    } catch (e) {}
  }

  function showContinueToast() {
    if (toastDone) return;
    if (!window.AstroApp || typeof AstroApp.showToast !== 'function') return;

    var stored = readStored();
    if (!stored) return;

    var here = pageKey();
    if (stored.path === here) {
      toastDone = true;
      return;
    }

    toastDone = true;
    window.setTimeout(function () {
      if (!window.AstroApp || typeof AstroApp.showToast !== 'function') return;
      AstroApp.showToast(
        'Continue: ' + stored.label,
        'Pick up where you left off.',
        'info',
        5000
      );
    }, ENTER_MS + 80);
  }

  function skipEnterFade() {
    if (!document.body) return false;
    return document.body.classList.contains('ap-no-nav-enter') ||
      document.body.getAttribute('data-ap-skip-enter') === 'true';
  }

  function applyEnterFade() {
    if (enterDone || !document.body) return;
    enterDone = true;

    if (skipEnterFade()) {
      document.body.classList.remove('ap-nav-enter');
      return;
    }

    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.body.classList.remove('ap-nav-enter');
      return;
    }

    document.body.classList.add('ap-nav-enter');
    requestAnimationFrame(function () {
      document.body.classList.add('ap-nav-enter--active');
    });
    window.setTimeout(function () {
      document.body.classList.remove('ap-nav-enter', 'ap-nav-enter--active');
    }, ENTER_MS);
  }

  function dispatchEnter() {
    if (eventDone) return;
    eventDone = true;
    try {
      document.dispatchEvent(new CustomEvent('ap-page-enter', {
        bubbles: true,
        detail: {
          path: pageKey(),
          tool: currentTool()
        }
      }));
    } catch (e) {}
  }

  function sameOriginHref(anchor) {
    var href = anchor.getAttribute('href');
    if (!href || href.charAt(0) === '#') return null;
    if (/^(mailto:|tel:|javascript:)/i.test(href)) return null;
    if (anchor.hasAttribute('download')) return null;
    if (anchor.target && anchor.target !== '_self') return null;

    var url;
    try {
      url = new URL(href, location.href);
    } catch (err) {
      return null;
    }
    if (url.origin !== location.origin) return null;
    if (url.href === location.href) return null;
    return url.href;
  }

  function bindNavTransitions() {
    if (bound) return;
    bound = true;

    document.addEventListener('click', function (e) {
      if (e.defaultPrevented) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      var link = e.target.closest('a');
      if (!link || !link.matches(NAV_SELECTOR)) return;

      var dest = sameOriginHref(link);
      if (!dest) return;

      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
      }

      if (typeof document.startViewTransition !== 'function') {
        return;
      }

      e.preventDefault();
      document.startViewTransition(function () {
        location.href = dest;
      });
    }, true);
  }

  function init() {
    bindNavTransitions();
    applyEnterFade();
    showContinueToast();
    persistTool();
    dispatchEnter();
  }

  window.ApPageBridge = { init: init };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();