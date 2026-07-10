/**
 * Astro Precise — App shell (structure-safe)
 * Compact Cosmic Journey bar · mobile bottom tabs only · Continue FAB only when needed.
 * Does not replace ap-nav-model / app.js masthead.
 */
(function (global) {
  'use strict';

  var STEPS = [
    { id: 'cast', label: 'Cast', href: 'chart.html', progress: 14, next: 'ephemeris.html' },
    { id: 'sky', label: 'Sky', href: 'ephemeris.html', progress: 28, next: 'moment.html' },
    { id: 'keep', label: 'Keep', href: 'moment.html', progress: 42, next: 'horoscope.html' },
    { id: 'daily', label: 'Daily', href: 'horoscope.html', progress: 56, next: 'mysky.html' },
    { id: 'mysky', label: 'My Sky', href: 'mysky.html', progress: 72, next: 'shop.html' },
    { id: 'shop', label: 'Shop', href: 'shop.html', progress: 100, next: 'mysky.html' },
  ];

  var TABS = [
    { href: 'chart.html', label: 'Chart', icon: 'chart' },
    { href: 'ephemeris.html', label: 'Sky', icon: 'sky' },
    { href: 'mysky.html', label: 'My Sky', icon: 'hub' },
    { href: 'horoscope.html', label: 'Daily', icon: 'daily' },
    { href: 'shop.html', label: 'Shop', icon: 'shop' },
  ];

  function pageFile() {
    var p = (location.pathname || '').split('/').pop() || 'index.html';
    return p.toLowerCase() || 'index.html';
  }

  function isMobile() {
    try {
      return window.matchMedia('(max-width: 899px)').matches;
    } catch (e) {
      return window.innerWidth < 900;
    }
  }

  function currentStep() {
    var d = document.body && document.body.getAttribute('data-journey');
    if (d) {
      for (var i = 0; i < STEPS.length; i++) if (STEPS[i].id === d) return STEPS[i];
    }
    var f = pageFile();
    if (f === 'index.html' || f === '') return STEPS[0];
    if (f.indexOf('chart') >= 0) return STEPS[0];
    if (f.indexOf('ephemeris') >= 0 || f.indexOf('explore') >= 0) return STEPS[1];
    if (f.indexOf('moment') >= 0) return STEPS[2];
    if (f.indexOf('horoscope') >= 0) return STEPS[3];
    if (f.indexOf('mysky') >= 0) return STEPS[4];
    if (f.indexOf('shop') >= 0) return STEPS[5];
    return STEPS[0];
  }

  function iconSvg(name) {
    var paths = {
      chart: '<circle cx="12" cy="12" r="8"/><path d="M12 4v8l5 3"/>',
      sky: '<circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2"/>',
      hub: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z"/><circle cx="12" cy="12" r="2"/>',
      daily: '<path d="M21 12.8A9 9 0 1111.2 3 7 7 0 0021 12.8z"/>',
      shop: '<path d="M6 6h15l-1.5 9h-12z"/><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/>',
    };
    return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (paths[name] || paths.hub) + '</svg>';
  }

  function injectJourney() {
    if (document.getElementById('ap-journey') || document.body.hasAttribute('data-no-journey')) return;
    var step = currentStep();
    var nav = document.createElement('nav');
    nav.id = 'ap-journey';
    nav.className = 'ap-journey ap-journey--compact';
    nav.setAttribute('aria-label', 'Cosmic Journey progress');

    var label = document.createElement('span');
    label.className = 'ap-journey__label';
    label.textContent = 'Journey';
    nav.appendChild(label);

    var track = document.createElement('div');
    track.className = 'ap-journey__track';
    track.setAttribute('role', 'progressbar');
    track.setAttribute('aria-valuemin', '0');
    track.setAttribute('aria-valuemax', '100');
    track.setAttribute('aria-valuenow', String(step.progress));
    track.setAttribute('aria-label', 'Journey progress ' + step.progress + ' percent');
    var fill = document.createElement('div');
    fill.className = 'ap-journey__fill';
    fill.style.width = step.progress + '%';
    track.appendChild(fill);
    nav.appendChild(track);

    // Compact step links — single row, no wrap overflow
    var ul = document.createElement('ul');
    ul.className = 'ap-journey__steps';
    STEPS.forEach(function (s) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = s.href;
      a.textContent = s.label;
      if (s.id === step.id) a.setAttribute('aria-current', 'page');
      li.appendChild(a);
      ul.appendChild(li);
    });
    nav.appendChild(ul);

    var themeBtn = document.createElement('button');
    themeBtn.type = 'button';
    themeBtn.className = 'ap-theme-toggle';
    themeBtn.setAttribute('aria-label', 'Toggle light and dark theme');
    themeBtn.textContent = '◐';
    themeBtn.addEventListener('click', toggleTheme);
    nav.appendChild(themeBtn);

    // Always first child of body — avoids fighting page headers
    if (document.body) {
      document.body.insertBefore(nav, document.body.firstChild);
      document.body.classList.add('ap-has-journey');
    }
  }

  function injectBottomTabs() {
    if (document.getElementById('ap-bottom-tabs') || document.body.hasAttribute('data-no-bottom-tabs'))
      return;
    // Mobile only — desktop already has masthead / My Sky top nav
    if (!isMobile()) {
      document.body.classList.remove('ap-has-bottom-tabs');
      return;
    }
    var file = pageFile();
    var nav = document.createElement('nav');
    nav.id = 'ap-bottom-tabs';
    nav.className = 'ap-bottom-tabs';
    nav.setAttribute('aria-label', 'Primary');
    TABS.forEach(function (t) {
      var a = document.createElement('a');
      a.href = t.href;
      a.innerHTML = iconSvg(t.icon) + '<span>' + t.label + '</span>';
      if (file === t.href) a.setAttribute('aria-current', 'page');
      nav.appendChild(a);
    });
    document.body.appendChild(nav);
    document.body.classList.add('ap-has-bottom-tabs');
  }

  function injectContinue() {
    if (document.getElementById('ap-continue-fab') || document.body.hasAttribute('data-no-continue'))
      return;
    // Only show on homepage or when explicitly requested — avoids overlapping cast CTAs
    var f = pageFile();
    var allow =
      document.body.hasAttribute('data-show-continue') ||
      f === 'index.html' ||
      f === '' ||
      f === 'mysky.html';
    if (!allow) return;
    // My Sky: no FAB (cards already have CTAs)
    if (f === 'mysky.html' && !document.body.hasAttribute('data-show-continue')) return;

    var step = currentStep();
    var a = document.createElement('a');
    a.id = 'ap-continue-fab';
    a.className = 'ap-continue-fab';
    a.href = step.next || 'mysky.html';
    a.textContent = 'Continue';
    a.setAttribute('aria-label', 'Continue your cosmic journey');
    document.body.appendChild(a);
  }

  function themeKey() {
    return 'ap_theme_v1';
  }
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(themeKey(), theme);
    } catch (e) {}
  }
  function toggleTheme() {
    var cur = document.documentElement.getAttribute('data-theme') || 'dark';
    applyTheme(cur === 'light' ? 'dark' : 'light');
  }
  function bootTheme() {
    var t = 'dark';
    try {
      t = localStorage.getItem(themeKey()) || 'dark';
    } catch (e) {}
    if (t !== 'light' && t !== 'dark') t = 'dark';
    applyTheme(t);
  }

  function onboarding() {
    if (document.body.hasAttribute('data-no-onboard')) return;
    try {
      if (localStorage.getItem('ap_onboard_v1') === '1') return;
    } catch (e) {}
    var wrap = document.createElement('div');
    wrap.className = 'ap-onboard';
    wrap.id = 'ap-onboard';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');
    wrap.setAttribute('aria-labelledby', 'ap-onboard-title');
    wrap.innerHTML =
      '<div class="ap-onboard__panel">' +
      '<h2 id="ap-onboard-title">Welcome to Astro Precise</h2>' +
      '<p>Cast your chart, watch the sky, keep a Moment, read today — then go deeper when you want.</p>' +
      '<div class="ap-onboard__actions">' +
      '<a class="ap-btn ap-btn--primary" href="chart.html" id="ap-onboard-cast">Cast free chart</a>' +
      '<a class="ap-btn ap-btn--ghost" href="mysky.html" id="ap-onboard-hub">Open My Sky</a>' +
      '<button type="button" class="ap-btn ap-btn--ghost" id="ap-onboard-skip">Explore first</button>' +
      '</div></div>';
    document.body.appendChild(wrap);
    function dismiss() {
      try {
        localStorage.setItem('ap_onboard_v1', '1');
      } catch (e) {}
      wrap.remove();
    }
    wrap.querySelector('#ap-onboard-skip').addEventListener('click', dismiss);
    wrap.querySelector('#ap-onboard-cast').addEventListener('click', function () {
      try {
        localStorage.setItem('ap_onboard_v1', '1');
      } catch (e) {}
    });
    wrap.querySelector('#ap-onboard-hub').addEventListener('click', function () {
      try {
        localStorage.setItem('ap_onboard_v1', '1');
      } catch (e) {}
    });
  }

  function promoteMySkyLink() {
    if (pageFile() === 'mysky.html') return;
    if (document.querySelector('a[href="mysky.html"]')) return;
    var shop = document.querySelector(
      'nav a[href="shop.html"], .site-nav a[href="shop.html"], #primary-nav a[href="shop.html"]'
    );
    if (!shop) return;
    var a = document.createElement('a');
    a.href = 'mysky.html';
    a.textContent = 'My Sky';
    a.className = shop.className || '';
    shop.parentNode.insertBefore(a, shop);
  }

  function rememberProgress() {
    try {
      localStorage.setItem('ap_journey_step', currentStep().id);
      localStorage.setItem('ap_journey_href', pageFile());
    } catch (e) {}
  }

  function syncShellLayout() {
    // Drop phantom bottom padding when tabs not shown
    if (!document.getElementById('ap-bottom-tabs') || !isMobile()) {
      document.body.classList.remove('ap-has-bottom-tabs');
      var tabs = document.getElementById('ap-bottom-tabs');
      if (tabs && !isMobile()) tabs.hidden = true;
    } else {
      document.body.classList.add('ap-has-bottom-tabs');
      var t2 = document.getElementById('ap-bottom-tabs');
      if (t2) t2.hidden = false;
    }
  }

  function refresh() {
    var file = pageFile();
    document.querySelectorAll('#ap-bottom-tabs a').forEach(function (a) {
      if (a.getAttribute('href') === file) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    var step = currentStep();
    var fill = document.querySelector('.ap-journey__fill');
    var track = document.querySelector('.ap-journey__track');
    if (fill) fill.style.width = step.progress + '%';
    if (track) track.setAttribute('aria-valuenow', String(step.progress));
    var fab = document.getElementById('ap-continue-fab');
    if (fab) fab.href = step.next || 'mysky.html';
    syncShellLayout();
    rememberProgress();
  }

  function boot() {
    if (document.body.hasAttribute('data-no-shell')) return;
    bootTheme();
    injectJourney();
    injectBottomTabs();
    injectContinue();
    promoteMySkyLink();
    syncShellLayout();
    rememberProgress();
    setTimeout(onboarding, 800);
    window.addEventListener('resize', function () {
      if (isMobile() && !document.getElementById('ap-bottom-tabs') && !document.body.hasAttribute('data-no-bottom-tabs')) {
        injectBottomTabs();
      }
      syncShellLayout();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  document.addEventListener('ap:navigated', refresh);

  global.AP_SHELL = {
    refresh: refresh,
    toggleTheme: toggleTheme,
    steps: STEPS,
    currentStep: currentStep,
  };
})(typeof window !== 'undefined' ? window : globalThis);
