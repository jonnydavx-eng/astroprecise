/**
 * Astro Precise — Modern Interaction Layer
 * Spotlight hover cards, 3D tilt, scroll reveals, scroll progress,
 * count-up stats. All effects respect prefers-reduced-motion and are
 * pointer-gated so touch devices skip hover-only work.
 */

(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover     = window.matchMedia('(hover: hover)').matches;

  // ── Scroll progress bar ───────────────────────────────────────────────────

  function initScrollProgress() {
    const bar = document.createElement('div');
    bar.className = 'scroll-progress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);

    if (window.RafCore) {
      window.RafCore.onScroll(s => { bar.style.transform = `scaleX(${s.progress})`; });
      return;
    }

    // Fallback: self-contained rAF-throttled handler (RafCore absent on this page)
    let ticking = false;
    function update() {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = `scaleX(${max > 0 ? Math.min(1, window.scrollY / max) : 0})`;
      ticking = false;
    }
    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  // ── Spotlight: candlelight glow follows the cursor inside cards ──────────

  const SPOT_SELECTOR = '.card, .live-sky__panel, .feature-strip__item, ' +
                        '.chart-form-panel, .sign-tile, .step-item, .house-card';

  function initSpotlight() {
    if (!canHover) return;
    document.querySelectorAll(SPOT_SELECTOR).forEach(el => {
      el.classList.add('has-spotlight');
      const layer = document.createElement('span');
      layer.className = 'spotlight-layer';
      layer.setAttribute('aria-hidden', 'true');
      el.appendChild(layer);
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--spot-x', (e.clientX - r.left) + 'px');
        el.style.setProperty('--spot-y', (e.clientY - r.top) + 'px');
      });
    });
  }

  // ── 3D tilt (sign medallion tiles & anything with [data-tilt]) ───────────

  function initTilt() {
    if (!canHover || reduceMotion) return;
    document.querySelectorAll('[data-tilt]').forEach(el => {
      el.style.transformStyle = 'preserve-3d';
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform =
          `perspective(700px) rotateY(${(px * 16).toFixed(2)}deg) rotateX(${(-py * 16).toFixed(2)}deg) translateY(-3px)`;
        el.style.transition = 'transform 0.06s linear';
      });
      el.addEventListener('pointerleave', () => {
        el.style.transition = 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)';
        el.style.transform = '';
      });
    });
  }

  // ── Scroll reveal (IntersectionObserver, staggered) ──────────────────────

  function initReveal() {
    const preset = document.querySelectorAll('.reveal-init');
    const targets = document.querySelectorAll(
      '.section-header, .sign-tile, .feature-strip__item, .step-item, ' +
      '.live-sky__panel, .hero-stat, .footer__grid > *');
    const all = [...new Set([...preset, ...targets])];

    function reveal(el, delayMs) {
      if (delayMs) el.style.transitionDelay = delayMs + 'ms';
      el.classList.add('revealed');
    }

    if (reduceMotion || !('IntersectionObserver' in window)) {
      all.forEach(t => reveal(t));
      return;
    }

    let order = 0;
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        reveal(en.target, (order++ % 6) * 70);
        io.unobserve(en.target);
        setTimeout(() => { order = 0; }, 50);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -30px 0px' });

    all.forEach(t => {
      if (!t.classList.contains('reveal-init')) t.classList.add('reveal-init');
      const r = t.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.92 && r.bottom > 0) {
        reveal(t);
      } else {
        io.observe(t);
      }
    });
  }

  // ── Count-up stats ────────────────────────────────────────────────────────

  function initCountUp() {
    const els = document.querySelectorAll('.hero-stat__number');
    if (!els.length || reduceMotion || !('IntersectionObserver' in window)) return;
    const easeOut = t => 1 - Math.pow(1 - t, 3);

    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        const el = en.target;
        const raw = el.textContent.trim();
        const m = raw.match(/^([\d.]+)(.*)$/);
        if (!m) return;
        const target = parseFloat(m[1]);
        const suffix = m[2] || '';
        const decimals = (m[1].split('.')[1] || '').length;
        const dur = 1400, t0 = performance.now();
        (function step(now) {
          const t = Math.min(1, (now - t0) / dur);
          el.textContent = (target * easeOut(t)).toFixed(decimals) + suffix;
          if (t < 1) requestAnimationFrame(step);
          else el.textContent = raw;
        })(t0);
      });
    }, { threshold: 0.6 });
    els.forEach(el => io.observe(el));
  }

  // ── Boot ──────────────────────────────────────────────────────────────────

  function boot() {
    initScrollProgress();
    initSpotlight();
    initTilt();
    initReveal();
    initCountUp();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
