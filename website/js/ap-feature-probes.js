/**
 * Astro Precise — live feature probes (adapted from FRONTIER/26)
 * Progressive-enhancement honesty: green = available in THIS browser.
 * Does not claim product astronomy / LIVE sky — platform capability only.
 */
(function (w) {
  'use strict';

  var PROBES = [
    ['Scroll timelines', function () { return CSS.supports('animation-timeline', 'scroll()'); }, 'CSS'],
    ['View timelines', function () { return CSS.supports('animation-timeline', 'view()'); }, 'CSS'],
    ['ViewTransition API', function () { return 'startViewTransition' in document; }, 'JS'],
    ['view-transition-name', function () { return CSS.supports('view-transition-name', 'x'); }, 'CSS'],
    ['WebGL2', function () { return !!document.createElement('canvas').getContext('webgl2'); }, 'JS'],
    ['WebGPU', function () { return 'gpu' in navigator; }, 'JS'],
    ['OKLCH color', function () { return CSS.supports('color', 'oklch(0.7 0.2 200)'); }, 'CSS'],
    ['Display-P3', function () { return CSS.supports('color', 'color(display-p3 1 0 0)'); }, 'CSS'],
    ['color-mix()', function () { return CSS.supports('background', 'color-mix(in oklch, red, blue)'); }, 'CSS'],
    ['@property', function () { return 'registerProperty' in CSS; }, 'JS'],
    [':has() selector', function () { return CSS.supports('selector(:has(*))'); }, 'CSS'],
    ['Container queries', function () { return CSS.supports('container-type', 'inline-size'); }, 'CSS'],
    ['Anchor positioning', function () { return CSS.supports('anchor-name', '--a'); }, 'CSS'],
    ['Popover API', function () { return 'popover' in HTMLElement.prototype; }, 'JS'],
    ['interpolate-size', function () { return CSS.supports('interpolate-size', 'allow-keywords'); }, 'CSS'],
    ['field-sizing', function () { return CSS.supports('field-sizing', 'content'); }, 'CSS'],
    ['text-wrap: balance', function () { return CSS.supports('text-wrap', 'balance'); }, 'CSS'],
    ['text-wrap: pretty', function () { return CSS.supports('text-wrap', 'pretty'); }, 'CSS'],
    ['backdrop-filter', function () { return CSS.supports('backdrop-filter', 'blur(1px)'); }, 'CSS'],
    ['ScrollTimeline class', function () { return 'ScrollTimeline' in w; }, 'JS'],
  ];

  function runProbes() {
    var passed = 0;
    var results = PROBES.map(function (row) {
      var ok = false;
      try { ok = !!row[1](); } catch (_) { ok = false; }
      if (ok) passed++;
      return { name: row[0], ok: ok, kind: row[2] };
    });
    return { passed: passed, total: PROBES.length, results: results };
  }

  function mount(el) {
    if (!el) return null;
    var report = runProbes();
    el.setAttribute('role', 'list');
    el.innerHTML = '';
    report.results.forEach(function (r) {
      var item = document.createElement('div');
      item.className = 'ap-feat ' + (r.ok ? 'ap-feat--pass' : 'ap-feat--fail');
      item.setAttribute('role', 'listitem');
      item.innerHTML = '<span class="ap-feat__dot" aria-hidden="true"></span>' +
        '<span class="ap-feat__name"></span><small class="ap-feat__kind"></small>';
      item.querySelector('.ap-feat__name').textContent = r.name;
      item.querySelector('.ap-feat__kind').textContent = r.kind;
      el.appendChild(item);
    });
    var score = document.getElementById(el.getAttribute('data-score') || 'ap-feat-score');
    if (score) {
      score.textContent = 'This browser passes ' + report.passed + ' / ' + report.total +
        ' platform probes — capability only, not a sky claim.';
    }
    return report;
  }

  w.APFeatureProbes = { PROBES: PROBES, run: runProbes, mount: mount };

  function auto() {
    var host = document.getElementById('ap-feat-matrix');
    if (host) mount(host);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', auto);
  else auto();
})(typeof window !== 'undefined' ? window : globalThis);
