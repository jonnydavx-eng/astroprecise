/**
 * Astro Precise — GSAP micro-interactions (brass polish)
 * Graceful no-op if GSAP missing or prefers-reduced-motion.
 *
 * Features:
 *  - Button / CTA hover lift + brass glow
 *  - Card entrance stagger
 *  - Journey bar fill pulse on load
 *  - Nav link underline shimmer
 *  - Export toolbar pop-in
 *  - Orrery host soft reveal
 */
(function (global) {
  'use strict';

  function reduced() {
    try {
      return matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) {
      return false;
    }
  }

  function gsap() {
    return global.gsap || null;
  }

  function ensureCss() {
    if (document.getElementById('ap-motion-css')) return;
    var s = document.createElement('style');
    s.id = 'ap-motion-css';
    s.textContent =
      '.ap-export-toolbar{display:flex;flex-wrap:wrap;gap:.4rem;align-items:center;margin:1rem 0;padding:.65rem .85rem;border:1px solid rgba(201,162,74,.28);border-radius:14px;background:rgba(18,22,30,.72)}' +
      '.ap-export-toolbar__label{font-size:.68rem;letter-spacing:.14em;text-transform:uppercase;color:#A8B0BC;font-weight:600;margin-right:.35rem}' +
      '.ap-export-toolbar .ap-btn{min-height:40px;padding:.4rem .85rem;font-size:.72rem}' +
      '.ap-motion-brass-glow{box-shadow:0 0 0 1px rgba(201,162,74,.25),0 8px 28px rgba(201,162,74,.18)}' +
      '.ap-btn,.ap-card,a.cta,.site-nav a{will-change:transform}';
    document.head.appendChild(s);
  }

  function wireHoverButtons() {
    var G = gsap();
    if (!G || reduced()) return;
    var sel = '.ap-btn, .ap-continue-fab, a.cta, button.primary, .btn-primary, .hero-cta';
    document.querySelectorAll(sel).forEach(function (el) {
      if (el.__apMotionHover) return;
      el.__apMotionHover = true;
      el.addEventListener('pointerenter', function () {
        G.to(el, { y: -2, duration: 0.22, ease: 'power2.out', overwrite: 'auto' });
        el.classList.add('ap-motion-brass-glow');
      });
      el.addEventListener('pointerleave', function () {
        G.to(el, { y: 0, duration: 0.28, ease: 'power2.out', overwrite: 'auto' });
        el.classList.remove('ap-motion-brass-glow');
      });
    });
  }

  function entranceCards() {
    var G = gsap();
    if (!G || reduced()) return;
    var cards = document.querySelectorAll(
      '.ap-card, .mysky-card, .transit-panels .ap-card, .tool-card, .instrument-card'
    );
    if (!cards.length) return;
    G.from(cards, {
      opacity: 0,
      y: 18,
      duration: 0.55,
      stagger: 0.06,
      ease: 'power2.out',
      clearProps: 'transform',
    });
  }

  function journeyPulse() {
    var G = gsap();
    if (!G || reduced()) return;
    var fill = document.querySelector('.ap-journey__fill');
    if (!fill) return;
    var w = fill.style.width || '0%';
    G.fromTo(
      fill,
      { width: '0%' },
      { width: w, duration: 0.9, ease: 'power3.out', delay: 0.15 }
    );
  }

  function orreryReveal() {
    var G = gsap();
    if (!G || reduced()) return;
    var hosts = document.querySelectorAll('.ap-orrery-host, .ap-enhanced-orrery-host');
    if (!hosts.length) return;
    G.from(hosts, {
      opacity: 0,
      scale: 0.98,
      duration: 0.7,
      ease: 'power2.out',
      stagger: 0.1,
    });
  }

  function exportBarIn() {
    var G = gsap();
    if (!G || reduced()) return;
    var bars = document.querySelectorAll('.ap-export-toolbar');
    if (!bars.length) return;
    G.from(bars, { opacity: 0, y: 10, duration: 0.45, ease: 'power2.out' });
  }

  function navShimmer() {
    var G = gsap();
    if (!G || reduced()) return;
    var links = document.querySelectorAll(
      '.ap-journey__steps a, .ap-bottom-tabs a, .ap-brass-tabs a'
    );
    links.forEach(function (a) {
      if (a.__apNavMotion) return;
      a.__apNavMotion = true;
      a.addEventListener('pointerenter', function () {
        G.to(a, { color: '#C8CDD6', duration: 0.2, overwrite: 'auto' });
      });
    });
  }

  function boot() {
    ensureCss();
    if (reduced()) {
      document.documentElement.setAttribute('data-motion', 'reduced');
      return;
    }
    if (!gsap()) {
      // GSAP script may still be loading (defer)
      var tries = 0;
      var iv = setInterval(function () {
        tries++;
        if (gsap() || tries > 40) {
          clearInterval(iv);
          if (gsap()) runAll();
        }
      }, 50);
      return;
    }
    runAll();
  }

  function runAll() {
    document.documentElement.setAttribute('data-motion', 'gsap');
    wireHoverButtons();
    entranceCards();
    journeyPulse();
    orreryReveal();
    exportBarIn();
    navShimmer();
  }

  function refresh() {
    if (reduced() || !gsap()) return;
    wireHoverButtons();
    exportBarIn();
    navShimmer();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  document.addEventListener('ap:navigated', refresh);

  global.AP_MOTION = { boot: boot, refresh: refresh, reduced: reduced };
})(typeof window !== 'undefined' ? window : globalThis);
