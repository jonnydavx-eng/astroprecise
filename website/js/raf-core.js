/**
 * AstroPrecise — RafCore
 * One scroll listener, one rAF dispatcher, one source of truth for
 * device tier / DPR cap / prefers-reduced-motion. Everything that reacts
 * to scroll or needs a pixel-ratio budget should go through here instead
 * of registering its own listener (kills duplicate handlers + layout reads).
 *
 * Pure vanilla, no deps. Attaches window.RafCore. Load this FIRST.
 * Consumers must degrade gracefully if it's absent (see callers).
 */

window.RafCore = (() => {
  'use strict';

  // ── prefers-reduced-motion (live) ─────────────────────────────────────────
  const prmMql = window.matchMedia('(prefers-reduced-motion: reduce)');
  const prmSubs = [];
  if (prmMql.addEventListener) {
    prmMql.addEventListener('change', () => prmSubs.forEach(fn => { try { fn(prmMql.matches); } catch (_) {} }));
  }

  // ── device tier (computed once) ───────────────────────────────────────────
  // low  → weak GPU/CPU: drop expensive passes, DPR 1
  // mid  → touch / mobile: moderate budget, DPR ≤ 1.5
  // high → desktop, fine pointer, decent specs: full budget, DPR ≤ base
  const cores  = navigator.hardwareConcurrency || 8;
  const mem    = navigator.deviceMemory || 8;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  let tier;
  if (cores <= 4 || mem <= 4) tier = 'low';
  else if (coarse)            tier = 'mid';
  else                        tier = 'high';

  /** Orrery-aligned HD DPR — canonical budget for all canvas/WebGL renderers. */
  function hdDPR(base = 2.5) {
    const real = window.devicePixelRatio || 1;
    if (tier === 'low') return Math.min(real, 1.25);
    if (tier === 'mid') return Math.min(real, 2);
    return Math.min(real, base);
  }

  /** Legacy alias — delegates to hdDPR with a 2.0 desktop cap. */
  function capDPR(base = 2) {
    return hdDPR(base);
  }

  const CARD_EXPORT_BASE = 1080;

  /** Retina share-card export width (1080 → 1620 mid → 2160 high). */
  function cardExportSize() {
    if (tier === 'low') return CARD_EXPORT_BASE;
    if (tier === 'mid') return Math.round(CARD_EXPORT_BASE * 1.5);
    return CARD_EXPORT_BASE * 2;
  }

  /** Setup a 2D canvas at CSS size with HD DPR + high-quality smoothing. */
  function setupCanvas2D(canvas, cssW, cssH, dprBase) {
    const dpr = hdDPR(dprBase == null ? 2.5 : dprBase);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    if (ctx.imageSmoothingQuality) ctx.imageSmoothingQuality = 'high';
    return { ctx, dpr, W: cssW, H: cssH };
  }

  /** Fresh offscreen export context at exact pixel dimensions. */
  function prepExportCtx(cv, w, h) {
    cv.width = w;
    cv.height = h;
    const ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    if (ctx.imageSmoothingQuality) ctx.imageSmoothingQuality = 'high';
    return ctx;
  }

  // ── single scroll/resize → rAF dispatcher ─────────────────────────────────
  const subs = [];
  let ticking = false;
  let lastY = window.scrollY || window.pageYOffset || 0;

  function snapshot() {
    const y   = window.scrollY || window.pageYOffset || 0;
    const ih  = window.innerHeight;
    const sh  = document.documentElement.scrollHeight;
    const max = sh - ih;
    const delta = y - lastY;
    lastY = y;
    return {
      scrollY: y,
      delta,
      innerHeight: ih,
      scrollHeight: sh,
      max,
      progress: max > 0 ? Math.min(1, Math.max(0, y / max)) : 0,
    };
  }

  function flush() {
    ticking = false;
    const snap = snapshot();
    for (let i = 0; i < subs.length; i++) {
      try { subs[i](snap); } catch (_) {}
    }
  }

  function request() {
    if (!ticking) { ticking = true; requestAnimationFrame(flush); }
  }

  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request, { passive: true });

  /** Subscribe to scroll/resize. Fires once immediately. Returns an unsubscribe fn. */
  function onScroll(fn) {
    if (typeof fn !== 'function') return () => {};
    subs.push(fn);
    try { fn(snapshot()); } catch (_) {}
    return () => offScroll(fn);
  }
  function offScroll(fn) {
    const i = subs.indexOf(fn);
    if (i >= 0) subs.splice(i, 1);
  }

  /** Subscribe to reduced-motion changes (so consumers can re-init). */
  function onReducedMotionChange(fn) {
    if (typeof fn === 'function') prmSubs.push(fn);
  }

  return {
    tier,
    capDPR,
    hdDPR,
    cardExportSize,
    setupCanvas2D,
    prepExportCtx,
    CARD_EXPORT_BASE,
    onScroll,
    offScroll,
    onReducedMotionChange,
    get reducedMotion() { return prmMql.matches; },
  };
})();
