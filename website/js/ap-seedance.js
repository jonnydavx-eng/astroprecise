/**
 * Astro Precise — optional Seedance cinematic backdrop for the hero orrery.
 *
 * DROP-IN, OFF BY DEFAULT. The page is byte-identical to today until an owner
 * configures a clip: it does nothing unless #orrery-seedance has a non-empty
 * data-ap-seedance-src. Then, ONLY on capable devices (desktop width, fine
 * pointer, non-reduced-motion, 4g+/no-save-data, not headless), it lazily loads
 * the clip BEHIND the live orrery, plays it muted/looping, and pauses it when
 * the orrery scrolls off-screen (mirrors the orrery's own IntersectionObserver
 * pause). It is NEVER a full-page intro and never blocks anything. If the file
 * is missing or fails to load, it hides itself — the page falls back to today's
 * exact view (the live orrery on top, no video).
 */
(function () {
  'use strict';

  function gatesPass() {
    try {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
      if (!window.matchMedia('(min-width: 1025px)').matches) return false;
      if (window.matchMedia('(pointer: coarse)').matches) return false;
      if (navigator.webdriver) return false;
      var c = navigator.connection;
      if (c) {
        if (c.saveData) return false;
        if (c.effectiveType && !/4g/.test(c.effectiveType)) return false;
      }
    } catch (e) { return false; }
    return true;
  }

  function init() {
    var v = document.getElementById('orrery-seedance');
    if (!v) return;
    var src = (v.getAttribute('data-ap-seedance-src') || '').trim();
    if (!src) return;            // not configured → stay invisible (today's view)
    if (!gatesPass()) return;

    var vp = document.getElementById('orrery-viewport');
    var hidden = false;
    function hide() { if (hidden) return; hidden = true; v.classList.remove('is-active', 'is-playing'); v.style.display = 'none'; }

    var source = document.createElement('source');
    source.src = src;
    source.type = /\.webm$/i.test(src) ? 'video/webm' : 'video/mp4';
    v.appendChild(source);

    v.addEventListener('error', hide, true);
    v.addEventListener('loadeddata', function () { if (!hidden) v.classList.add('is-playing'); });

    v.classList.add('is-active');

    function play() { try { var p = v.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {} }

    v.load();
    play();

    if (window.IntersectionObserver && vp) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (hidden) return;
          if (e.isIntersecting) play(); else { try { v.pause(); } catch (er) {} }
        });
      }, { threshold: 0.05 });
      io.observe(vp);
    }

    document.addEventListener('visibilitychange', function () {
      if (hidden) return;
      if (document.hidden) { try { v.pause(); } catch (e) {} } else play();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
