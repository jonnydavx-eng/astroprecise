'use strict';

// =============================================================================
// The Observatory — entrance orchestration.
//   • decorative twilight starfield on the vista (labelled schematic)
//   • the eyepiece → ZodiacSphere lens (REAL live planet positions)
//   • look-through choreography, honest caption plate, skip/enter exits
// Self-contained threshold page. No site chrome, no service worker coupling.
// =============================================================================

(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Honest date for the caption plates ──────────────────────────────────
  function today() {
    try {
      return new Date().toLocaleDateString('en-GB',
        { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase();
    } catch (e) { return ''; }
  }

  // ── Decorative twilight starfield (seeded, denser at the zenith) ─────────
  // Honesty: this backdrop is decorative — the REAL sky is inside the lens.
  function starfield() {
    var cv = document.getElementById('obs-stars');
    if (!cv) return;
    var ctx = cv.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0, H = 0, stars = [];

    function seed(n) { return function () { n = (n * 1103515245 + 12345) & 0x7fffffff; return n / 0x7fffffff; }; }

    function build() {
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var rnd = seed(20260711);
      var count = Math.round(Math.min(W * H / 5200, 220));
      stars = [];
      for (var i = 0; i < count; i++) {
        var yf = rnd();                    // 0 top → 1 bottom
        // bias toward the upper sky; almost none below the horizon band (~0.72)
        var y = Math.pow(yf, 1.7) * H * 0.74;
        stars.push({
          x: rnd() * W,
          y: y,
          r: 0.4 + rnd() * 1.3,
          a: 0.25 + rnd() * 0.6 * (1 - y / (H * 0.8)),   // fainter near the warm horizon
          tw: rnd() * Math.PI * 2,
          sp: 0.6 + rnd() * 1.4
        });
      }
    }

    function paint(t) {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        var tw = reduce ? 1 : (0.72 + 0.28 * Math.sin(t * 0.0011 * s.sp + s.tw));
        ctx.globalAlpha = Math.max(0, s.a * tw);
        ctx.fillStyle = s.r > 1.2 ? '#fff4e0' : '#e9e4f2';
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.2832); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    build();
    if (reduce) { paint(0); }
    else {
      var raf;
      (function loop(t) { paint(t || 0); raf = requestAnimationFrame(loop); })(0);
      window.addEventListener('pagehide', function () { if (raf) cancelAnimationFrame(raf); });
    }
    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt); rt = setTimeout(function () { build(); if (reduce) paint(0); }, 150);
    });
  }

  // ── The lens (ZodiacSphere on the eyepiece canvas) ──────────────────────
  var lensBooted = false;
  var opening = false;
  function bootLens() {
    if (lensBooted) return;
    var canvas = document.getElementById('obs-lens');
    if (!canvas || !window.ZodiacSphere || typeof window.ZodiacSphere.init !== 'function') return false;
    lensBooted = true;
    var hint = document.getElementById('obs-signhint');
    window.ZodiacSphere.init(canvas, function (signKey) {
      // Look-through → read that sign. Sign pages are flat <key>.html.
      if (!signKey) return;
      if (hint) {
        var nm = signKey.charAt(0).toUpperCase() + signKey.slice(1);
        hint.textContent = 'Opening ' + nm + '…';
      }
      window.location.href = signKey + '.html';
    }, { square: true });   // eyepiece lens is a 1:1 circle — fill it (no lower-third band)
    return true;
  }

  // Retry boot until the deferred deps have all parsed.
  function ensureLens(cb) {
    if (bootLens()) { cb && cb(true); return; }
    var tries = 0;
    var iv = setInterval(function () {
      tries++;
      var ok = bootLens();
      if (ok || tries > 40) { clearInterval(iv); cb && cb(ok); }
    }, 120);
  }

  // ── Look-through choreography ───────────────────────────────────────────
  function open() {
    if (opening || document.body.classList.contains('obs-open')) return;
    opening = true;   // synchronous guard — the lens boots async, so a fast
                      // double-tap must not run the look-through twice.
    var plate = document.getElementById('obs-plate-text');
    var hint = document.getElementById('obs-signhint');
    ensureLens(function (booted) {
      if (!booted) {
        // Honesty: never assert LIVE ZODIAC / VSOP87 over a lens that never drew.
        opening = false;
        if (plate) plate.textContent = 'LIVE SKY UNAVAILABLE · ' + today();
        if (hint) hint.textContent = 'The live sky couldn’t load — step inside the observatory.';
        return;
      }
      document.body.classList.add('obs-open');
      if (plate) plate.textContent = 'LIVE ZODIAC · VSOP87 · ' + today();
    });
  }

  // ── Wire up ─────────────────────────────────────────────────────────────
  function ready() {
    starfield();
    var plate = document.getElementById('obs-plate-text');
    if (plate) plate.textContent = 'THE OBSERVATORY · ' + today() + ' · REAL SKY';

    var look = document.getElementById('obs-look');
    var eye = document.getElementById('obs-eyepiece');
    if (look) look.addEventListener('click', open);
    if (eye) eye.addEventListener('click', open);

    // Reduced motion: no ritual — open the lens straight away.
    if (reduce) open();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ready);
  } else { ready(); }
})();
