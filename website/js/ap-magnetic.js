/**
 * Astro Precise — magnetic micro-interaction for the hero "Cast My Chart" CTA.
 * The button drifts gently toward the cursor when it comes near, with an
 * elastic ease-back on leave. Pointer-fine + non-reduced-motion only; writes
 * --mx/--my (consumed by lite-critical.css's `translate`). One rAF-throttled
 * pointermove, transform-only, trivially removable. No effect on touch/coarse.
 */
(function () {
  'use strict';

  if (!window.matchMedia) return;
  try {
    if (!window.matchMedia('(pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  } catch (e) { return; }

  function init() {
    var btn = document.querySelector('.hero__cast-btn');
    if (!btn || btn.__apMagnetic) return;
    btn.__apMagnetic = true;

    var PULL = 0.32;   // fraction of cursor offset the button follows
    var MAX = 9;       // px cap so it never wanders far
    var REACH = 78;    // px proximity halo beyond the button box
    var raf = 0;
    var lastEvt = null;

    function clamp(v) { return v < -MAX ? -MAX : (v > MAX ? MAX : v); }

    function apply() {
      raf = 0;
      var e = lastEvt;
      if (!e) return;
      var r = btn.getBoundingClientRect();
      if (!r.width) return;
      var cx = r.left + r.width / 2;
      var cy = r.top + r.height / 2;
      var dx = e.clientX - cx;
      var dy = e.clientY - cy;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var reach = Math.max(r.width, r.height) / 2 + REACH;
      var mx = 0, my = 0;
      if (dist < reach) { mx = clamp(dx * PULL); my = clamp(dy * PULL); }
      btn.style.setProperty('--mx', mx.toFixed(1) + 'px');
      btn.style.setProperty('--my', my.toFixed(1) + 'px');
    }

    function onMove(e) {
      lastEvt = e;
      if (!raf) raf = requestAnimationFrame(apply);
    }

    function reset() {
      lastEvt = null;
      btn.style.setProperty('--mx', '0px');
      btn.style.setProperty('--my', '0px');
    }

    window.addEventListener('pointermove', onMove, { passive: true });
    btn.addEventListener('pointerleave', reset);
    window.addEventListener('blur', reset);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) reset();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
