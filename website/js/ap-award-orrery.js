"use strict";
/* Award homepage — boot lite canvas orrery + deferred WebGL upgrade */

(function () {
  var PRM = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var wrap = document.getElementById("apAwardOrreryWrap");
  var fallback = document.getElementById("apHeroWheelFallback");
  if (!wrap || PRM) return;

  window.__apLiteHero = true;
  document.documentElement.classList.add("ap-lite-hero");

  function hideFallback() {
    if (!fallback) return;
    var canvas = document.getElementById("lite-poster-canvas");
    var poster = document.getElementById("orrery-lite-poster");
    var ready = poster && poster.classList.contains("lite-poster-ready");
    var sized = canvas && canvas.width > 0 && canvas.height > 0;
    if (ready || sized) {
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

  var loaderQueued = false;
  function queueWebGL() {
    if (loaderQueued) return;
    loaderQueued = true;
    inject("js/orrery-loader.js?v=533");
  }

  showInstrument();

  waitEphemeris(function () {
    inject("js/lite-orrery.js?v=533", function () {
      document.documentElement.classList.add("orrery-poster-ready");
    });
  });

  wrap.addEventListener("pointerdown", queueWebGL, { once: true, passive: true });
  window.addEventListener("scroll", queueWebGL, { once: true, passive: true });

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

  setTimeout(queueWebGL, 12000);

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

  document.addEventListener("ap-orrery-ready", hideFallback);
  setTimeout(hideFallback, 4500);
})();