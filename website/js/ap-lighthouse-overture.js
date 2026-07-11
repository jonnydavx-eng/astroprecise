'use strict';

// =============================================================================
// Astro Precise — LIGHTHOUSE OVERTURE (homepage opening ceremony)
//   Land on the lit lighthouse → pull back through it → follow the orrery into
//   space → dissolve to the live 3D model. Transient, once-per-session overlay.
//
// Never touches the WebGL engine: it plays OVER the booting orrery (which it
// nudges to load urgently) and removes itself on reveal. Fully degrading —
// no-JS: never injected · reduced-motion / low-tier: calm cross-dissolve ·
// webdriver/audit: skipped · skippable (click/scroll/key) · hard-capped.
//
// Tuning while you watch on :8790 —
//   ?overture=1  force replay (ignore the once-per-session flag)
//   ?overture=0  disable this load
//   window.AP_DISABLE_OVERTURE = true  or  <html class="no-overture">  disable
//   Feel/timing knobs live in css/ap-lighthouse-overture.css (:root vars).
// =============================================================================

(function () {
  var SEEN_KEY = 'ap_overture_seen';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function qs() { try { return new URLSearchParams(location.search); } catch (e) { return { get: function () { return null; } }; } }
  var params = qs();
  var forced = params.get('overture') === '1';
  var disabled = params.get('overture') === '0';

  function lowTier() {
    try {
      if (window.RafCore && window.RafCore.tier === 'low') return true;
      if (navigator.deviceMemory && navigator.deviceMemory <= 3) return true;
      if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 3) return true;
    } catch (e) {}
    return false;
  }

  function shouldPlay() {
    if (disabled) return false;
    if (window.AP_DISABLE_OVERTURE) return false;
    if (document.documentElement.classList.contains('no-overture')) return false;
    try { if (navigator.webdriver) return false; } catch (e) {}          // Lighthouse / Playwright
    if (forced) return true;
    try { if (sessionStorage.getItem(SEEN_KEY) === '1') return false; } catch (e) {} // fail-open
    if (window.__apOverturePlayed) return false;
    return true;
  }

  function markSeen() {
    window.__apOverturePlayed = true;
    try { sessionStorage.setItem(SEEN_KEY, '1'); } catch (e) {}
  }

  // Seeded starfield on the sky layer (decorative; the real sky is the orrery).
  function paintStars(canvas) {
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    if (!ctx) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = canvas.clientWidth || window.innerWidth;
    var H = canvas.clientHeight || window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var n = 20260711;
    function rnd() { n = (n * 1103515245 + 12345) & 0x7fffffff; return n / 0x7fffffff; }
    var count = Math.round(Math.min(W * H / 6200, 190));
    for (var i = 0; i < count; i++) {
      var yf = rnd();
      var y = Math.pow(yf, 1.7) * H * 0.72;         // bias to the upper sky
      var r = 0.4 + rnd() * 1.2;
      ctx.globalAlpha = (0.2 + rnd() * 0.6) * (1 - y / (H * 0.85));
      ctx.fillStyle = r > 1.1 ? '#fff4e0' : '#e9e4f2';
      ctx.beginPath(); ctx.arc(rnd() * W, y, r, 0, 6.2832); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function build() {
    var ov = document.createElement('div');
    ov.id = 'ap-overture';
    ov.setAttribute('aria-hidden', 'true');     // decorative theatre; auto-dismisses
    if (reduce || lowTier()) ov.classList.add('is-reduced');
    ov.innerHTML =
      '<div class="ov-world">' +
        '<div class="ov-sky"></div>' +
        '<canvas class="ov-stars"></canvas>' +
        // far range
        '<svg class="ov-ridge ov-ridge--far" viewBox="0 0 1440 420" preserveAspectRatio="xMidYMax slice" width="112%">' +
          '<path d="M0,300 L200,244 L430,300 L640,214 L860,290 L1080,220 L1300,300 L1440,270 L1440,420 L0,420Z" fill="#3a2431"/></svg>' +
        // mid ridge (carries the lighthouse peak)
        '<svg class="ov-ridge ov-ridge--mid" viewBox="0 0 1440 460" preserveAspectRatio="xMidYMax slice" width="112%">' +
          '<path d="M0,340 L240,290 L520,352 L720,250 L960,336 L1180,272 L1440,336 L1440,460 L0,460Z" fill="#1f1520"/></svg>' +
        // the lighthouse: sweeping beam + lamp + a little tower/dome
        '<div class="ov-lighthouse">' +
          '<div class="ov-beam"></div>' +
          '<svg viewBox="0 0 80 80" width="100%" height="100%" style="position:relative;overflow:visible">' +
            '<rect x="34" y="30" width="12" height="40" rx="3" fill="#0e0a10"/>' +
            '<rect x="35.5" y="34" width="9" height="9" rx="2" fill="#1b1420"/>' +
            '<path d="M31 30 a9 9 0 0 1 18 0 Z" fill="#0b070d"/>' +
            '<rect x="30" y="68" width="20" height="6" rx="2" fill="#0a060c"/>' +
          '</svg>' +
          '<div class="ov-lamp"></div>' +
        '</div>' +
        // near ridge (foreground, darkest — recedes fastest)
        '<svg class="ov-ridge ov-ridge--near" viewBox="0 0 1440 300" preserveAspectRatio="xMidYMax slice" width="112%">' +
          '<path d="M0,190 L300,120 L560,196 L820,110 L1100,196 L1320,140 L1440,190 L1440,300 L0,300Z" fill="#0a070c"/></svg>' +
        '<div class="ov-space"></div>' +
      '</div>' +
      '<div class="ov-copy">' +
        '<span class="ov-mark">Astro <b>Precise</b></span>' +
        '<span class="ov-caption">Entering the observatory…</span>' +
      '</div>' +
      '<button type="button" class="ov-skip" aria-hidden="true" tabindex="-1">Skip &rsaquo;</button>';
    return ov;
  }

  function readMs(el, name, fallback) {
    try {
      var v = getComputedStyle(el).getPropertyValue(name).trim();
      if (/ms$/.test(v)) return parseFloat(v);
      if (/s$/.test(v)) return parseFloat(v) * 1000;
    } catch (e) {}
    return fallback;
  }

  function play() {
    var ov = build();
    document.body.appendChild(ov);
    window.__apOvertureActive = true;
    markSeen();
    paintStars(ov.querySelector('.ov-stars'));

    // Nudge the orrery to boot urgently NOW so the live model is ready under the
    // curtain when it lifts (idempotent — the loader guards double-boot).
    try {
      if (typeof window.__scheduleOrreryEngineLoad === 'function') window.__scheduleOrreryEngineLoad({ urgent: true });
    } catch (e) {}

    var reduced = ov.classList.contains('is-reduced');
    var hold = readMs(ov, '--ov-hold', 300);
    var dur = reduced ? 500 : readMs(ov, '--ov-dur', 2600);
    var revealMs = readMs(ov, '--ov-reveal', 720);
    var runway = reduced ? 520 : (hold + dur);
    var HARD_CAP = reduced ? 900 : 3500;             // never trap the visitor

    // kick the CSS timeline on the next frame
    requestAnimationFrame(function () { requestAnimationFrame(function () { ov.classList.add('is-playing'); }); });

    var done = false;
    function reveal() {
      if (done) return;
      done = true;
      teardownSkip();
      ov.classList.add('is-revealing');
      window.setTimeout(function () {
        if (ov.parentNode) ov.parentNode.removeChild(ov);
        window.__apOvertureActive = false;
        document.dispatchEvent(new Event('ap-overture-done'));
      }, revealMs + 40);
    }

    // Skip on any intent to engage (pointer/scroll/key), once armed after 250ms.
    var armed = false;
    window.setTimeout(function () { armed = true; }, 250);
    function onSkip(e) { if (!armed) return; if (e && e.type === 'keydown' && !/^(Escape|Enter| |Spacebar)$/.test(e.key)) return; reveal(); }
    function teardownSkip() {
      ['pointerdown', 'wheel', 'touchstart', 'keydown'].forEach(function (t) {
        window.removeEventListener(t, onSkip, { passive: true });
      });
    }
    ['pointerdown', 'wheel', 'touchstart'].forEach(function (t) { window.addEventListener(t, onSkip, { passive: true }); });
    window.addEventListener('keydown', onSkip);

    // Reveal when the pull-back finishes OR the orrery signals ready — whichever
    // first past the runway — and never later than the hard cap.
    var runwayDone = false;
    window.setTimeout(function () { runwayDone = true; reveal(); }, runway);
    function onOrreryReady() { if (runwayDone) reveal(); }
    document.addEventListener('ap-orrery-ready', onOrreryReady);
    window.setTimeout(reveal, HARD_CAP);
  }

  function boot() {
    if (!shouldPlay()) return;
    // Only on the model homepage (avoid firing on any page that reuses these assets).
    var isHome = document.body.classList.contains('ap-observatory-home') ||
      document.body.classList.contains('ap-award-511') ||
      document.getElementById('apAwardOrreryWrap') || document.getElementById('orrery-canvas');
    if (!isHome) return;
    play();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else { boot(); }
})();
