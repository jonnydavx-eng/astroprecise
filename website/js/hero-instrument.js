/**
 * AstroPrecise — Homepage signature instrument layer.
 * Meridian ring, scroll-time rail, chronicle HUD, staggered hero entrance.
 * Depends on RafCore (optional) and Orrery3D on index.html only.
 */
(function () {
  'use strict';

  var hero = document.querySelector('.hero');
  if (!hero) return;

  var PRM = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var meridian = document.getElementById('hero-meridian');
  var railFill = document.getElementById('hero-scroll-rail-fill');
  var railDot = document.getElementById('hero-scroll-rail-dot');
  var chronicleDate = document.getElementById('hero-chronicle-date');
  var chronicleOffset = document.getElementById('hero-chronicle-offset');
  var scrollCue = document.getElementById('hero-scroll-cue');
  var orreryDateEl = document.getElementById('orrery-date-display');
  var heroContent = document.querySelector('.hero__content');
  var heroOrreryLayer = document.querySelector('.hero__orrery-layer');
  var scrolledOnce = false;

  /* ── Staggered entrance after preloader (or instant on repeat visit) ── */
  function enterHero() {
    if (hero.classList.contains('hero--entered')) return;
    if (preloaderStillActive()) return;
    hero.classList.add('hero--entered');
    document.body.classList.add('page-home--ready');
    document.body.classList.remove('preloader-active');
    window.__apHeroEntered = true;
  }

  /* Exposed for the early preloader script (may run before this file loads). */
  window.__apHeroEnter = enterHero;

  function preloaderStillActive() {
    var pre = document.getElementById('preloader');
    if (!pre || pre.style.display === 'none') return false;
    return true;
  }

  function bootHeroEntrance() {
    if (window.__apHeroEntered || hero.classList.contains('hero--entered')) {
      enterHero();
      return;
    }
    if (!preloaderStillActive()) enterHero();
  }

  window.addEventListener('ap-hero-enter', enterHero);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { requestAnimationFrame(bootHeroEntrance); });
  } else {
    requestAnimationFrame(bootHeroEntrance);
  }

  /* Safety: never leave hero copy invisible if the enter event was missed. */
  setTimeout(bootHeroEntrance, 1200);
  setTimeout(bootHeroEntrance, 10000);

  /* ── Scroll-time rail + meridian rotation + chronicle mirror ── */
  function formatOffsetDays(days) {
    var n = Math.round(days);
    if (Math.abs(n) < 1) return 'Now';
    return n > 0 ? '+' + n + ' days' : n + ' days';
  }

  function parseOffsetFromDateTag(text) {
    if (!text) return 0;
    var m = text.match(/·\s*([+-]?\d+)d/);
    if (m) return parseInt(m[1], 10);
    if (text.indexOf('· now') !== -1) return 0;
    return null;
  }

  function updateInstrument(state) {
    var progress = state && typeof state.progress === 'number'
      ? Math.max(0, Math.min(1, state.progress))
      : (function () {
          var rect = hero.getBoundingClientRect();
          return Math.max(0, Math.min(1, -rect.top / (hero.offsetHeight || 1)));
        })();

    if (railFill) railFill.style.transform = 'scaleY(' + progress + ')';
    if (railDot) railDot.style.top = (progress * 100) + '%';

    if (!PRM && hero.classList.contains('hero--entered')) {
      var copyY = progress * -32;
      var orrY = progress * 22;
      var orrScale = 1 - progress * 0.035;
      if (heroContent) heroContent.style.transform = 'translate3d(0,' + copyY.toFixed(1) + 'px,0)';
      if (heroOrreryLayer) {
        heroOrreryLayer.style.transform = 'translate3d(0,' + orrY.toFixed(1) + 'px,0) scale(' + orrScale.toFixed(3) + ')';
      }
    }

    if (meridian && !PRM) {
      var deg = progress * 48 - 6;
      meridian.style.transform = 'rotate(' + deg + 'deg)';
    }

    if (chronicleOffset) {
      var days = Math.round(progress * 120);
      chronicleOffset.textContent = formatOffsetDays(days);
      chronicleOffset.setAttribute('aria-label', 'Sky offset: ' + formatOffsetDays(days));
    }

    if (orreryDateEl && chronicleDate) {
      var raw = orreryDateEl.textContent || '';
      var main = raw.replace(/\s*·\s*(now|[+-]?\d+d)\s*$/i, '').trim();
      if (main) chronicleDate.textContent = main;
      var parsed = parseOffsetFromDateTag(raw);
      if (parsed !== null && chronicleOffset) {
        chronicleOffset.textContent = formatOffsetDays(parsed);
      }
    }

    if (scrollCue && progress > 0.04) {
      scrollCue.classList.add('hero__scroll-cue--hidden');
      scrolledOnce = true;
    }

    /* Scroll → shared sky clock (orrery time advance + cosmos parallax) */
    if (!PRM) {
      if (window.Orrery3D && typeof window.Orrery3D.setScrollDrive === 'function') {
        window.Orrery3D.setScrollDrive(progress);
      }
      if (window.CosmosEngine && typeof window.CosmosEngine.setScrollDrive === 'function') {
        window.CosmosEngine.setScrollDrive(progress);
      }
    }
  }

  function onScroll(state) { updateInstrument(state); }

  if (window.RafCore) {
    window.RafCore.onScroll(onScroll);
  } else {
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (!ticking) {
        requestAnimationFrame(function () { onScroll(); ticking = false; });
        ticking = true;
      }
    }, { passive: true });
  }
  updateInstrument();

  /* Chronicle ticks with orrery date HUD even when not scrolling */
  if (chronicleDate && orreryDateEl && window.MutationObserver) {
    var mo = new MutationObserver(function () { updateInstrument(); });
    mo.observe(orreryDateEl, { childList: true, characterData: true, subtree: true });
  }

  /* ── Scroll cue dismiss on wheel / touch ── */
  function dismissCue() {
    if (scrollCue && !scrolledOnce) scrollCue.classList.add('hero__scroll-cue--hidden');
  }
  window.addEventListener('wheel', dismissCue, { passive: true, once: true });
  window.addEventListener('touchmove', dismissCue, { passive: true, once: true });

  /* ── Sky pill → orrery planet focus (dispatch existing click event) ── */
  document.addEventListener('click', function (e) {
    var pill = e.target.closest && e.target.closest('.sky-pill');
    if (!pill || !window.Orrery3D) return;
    var nameEl = pill.querySelector('.sky-pill__name');
    if (!nameEl) return;
    var name = nameEl.textContent.replace(/\s*℞\s*/g, '').trim().toLowerCase();
    document.dispatchEvent(new CustomEvent('orrery-planet-click', {
      detail: { name: name.charAt(0).toUpperCase() + name.slice(1), id: name }
    }));
    pill.classList.add('sky-pill--focus');
    setTimeout(function () { pill.classList.remove('sky-pill--focus'); }, 1400);
  });

})();