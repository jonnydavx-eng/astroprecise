"use strict";
/* Award homepage — boot lite canvas orrery + deferred WebGL upgrade */

(function () {
  var PRM = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var wrap = document.getElementById("apAwardOrreryWrap");
  var fallback = document.getElementById("apHeroWheelFallback");
  if (!wrap || PRM) return;

  window.__apLiteHero = true;
  document.documentElement.classList.add("ap-lite-hero");

  function hideFallback(force) {
    if (!fallback) return;
    var poster = document.getElementById("orrery-lite-poster");
    var ready = poster && poster.classList.contains("lite-poster-ready");
    // Only cross-fade the engraved wheel once something has actually drawn —
    // the old canvas.width check passed on the 300x150 default, hiding the
    // wheel over a blank viewport when ephemeris never arrived.
    if (force === true || ready) {
      fallback.classList.add("ap-hero-wheel-fallback--hidden");
    }
  }

  function showInstrument() {
    wrap.hidden = false;
  }

  function inject(src, next) {
    var s = document.createElement("script");
    s.src = src;
    s.onload = function () { if (next) next(); };
    document.body.appendChild(s);
  }

  function waitEphemeris(fn) {
    var tries = 0;
    (function poll() {
      if (window.AstroEphemeris && window.AstroEphemeris.julianDay) return fn();
      if (++tries > 100) return;
      setTimeout(poll, 40);
    })();
  }

  function isCapableDevice() {
    try {
      // Desktop-class (fine pointer, wide screen) always gets the HD engine —
      // it has its own perf tiers + _sm textures. The old 4-core/4GB cutoff
      // excluded most mid phones AND many capable laptops.
      if (window.matchMedia && window.matchMedia("(pointer: fine) and (min-width: 1024px)").matches) return true;
      if (navigator.deviceMemory && navigator.deviceMemory <= 2) return false;
      if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) return false;
    } catch (e) { return true; }
    return true;
  }

  var loaderQueued = false;
  function promoteToWebGL() {
    if (!isCapableDevice()) return;
    if (window.__requestFullOrrery) {
      window.__requestFullOrrery({ urgent: true, showLoading: false }).catch(function () {});
      return;
    }
    var tries = 0;
    (function wait() {
      if (window.__requestFullOrrery) {
        window.__requestFullOrrery({ urgent: true, showLoading: false }).catch(function () {});
        return;
      }
      if (++tries < 40) setTimeout(wait, 50);
    })();
  }

  function queueWebGL() {
    if (loaderQueued) return;
    loaderQueued = true;
    inject("js/orrery-loader.js?v=562", function () {
      setTimeout(promoteToWebGL, 500);
    });
  }

  showInstrument();

  // Capable devices start the HD chain immediately, in parallel with the
  // ephemeris wait — orrery-loader has its own AstroEphemeris waitFor, so
  // this only removes dead time before the photoreal engine appears.
  if (isCapableDevice()) queueWebGL();

  waitEphemeris(function () {
    inject("js/lite-orrery.js?v=562", function () {
      document.documentElement.classList.add("orrery-poster-ready");
      if (isCapableDevice()) setTimeout(queueWebGL, 400);
    });
  });

  wrap.addEventListener("pointerdown", queueWebGL, { once: true, passive: true });

  var launch = document.getElementById("orrery-lite-launch");
  if (launch) launch.addEventListener("click", queueWebGL, { once: true });

  if (typeof IntersectionObserver !== "undefined") {
    var io = new IntersectionObserver(function (entries) {
      if (entries[0] && entries[0].isIntersecting) {
        queueWebGL();
        io.disconnect();
      }
    }, { rootMargin: "160px 0px" });
    io.observe(wrap);
  }

  setTimeout(queueWebGL, 8000);

  var poster = document.getElementById("orrery-lite-poster");
  if (poster) {
    var mo = new MutationObserver(function () {
      if (poster.classList.contains("lite-poster-ready")) {
        hideFallback();
        mo.disconnect();
      }
    });
    mo.observe(poster, { attributes: true, attributeFilter: ["class"] });
  }

  document.addEventListener("ap-orrery-ready", function () { hideFallback(true); });
  setTimeout(hideFallback, 4500);
})();