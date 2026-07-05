"use strict";
/* explore.html — dedicated full-viewport galaxy explorer boot.
 *
 * Replicates the homepage ap-award-orrery.js lite→WebGL upgrade chain, but for a
 * page whose WHOLE POINT is the 3D model, so it drives the promotion directly
 * instead of lazy-waiting on a marketing hero coming into view.
 *
 * Flow (same modules + order as the homepage):
 *   1. mark ap-lite-hero (orrery-loader auto-boots the WebGL/canvas tier on it)
 *   2. wait for AstroEphemeris, load lite-orrery.js  → live poster + time-row wiring
 *   3. load orrery-loader.js                          → feature-detects the WebGL
 *      engine and wires the deck (scale strip, planet pills, journey button)
 *   4. load ap-cosmic-flight-tool.js                  → #ap-cosmic-flight-launch
 *   5. request the full WebGL engine on capable devices
 *
 * Everything feature-detects: a device that can't run WebGL degrades to the 2D
 * canvas engine, and the scale strip / journey button simply stay hidden.
 */
(function () {
  var PRM = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var V = "1";

  var wrap = document.getElementById("apAwardOrreryWrap");
  var fallback = document.getElementById("apHeroWheelFallback");
  if (!wrap) return;

  // Mark as the lite hero so orrery-loader.js takes the auto-boot path.
  window.__apLiteHero = true;
  document.documentElement.classList.add("ap-lite-hero");

  function injectCss(href, id) {
    if (id && document.getElementById(id)) return;
    var l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = href;
    if (id) l.id = id;
    document.head.appendChild(l);
  }

  function inject(src, next) {
    var s = document.createElement("script");
    s.src = src;
    s.onload = function () { if (next) next(); };
    s.onerror = function () { if (next) next(new Error("load failed: " + src)); };
    document.body.appendChild(s);
  }

  function waitEphemeris(fn) {
    var tries = 0;
    (function poll() {
      if (window.AstroEphemeris && window.AstroEphemeris.julianDay) return fn();
      if (++tries > 200) return;
      setTimeout(poll, 40);
    })();
  }

  function isCapableDevice() {
    try {
      if (window.matchMedia && window.matchMedia("(pointer: fine) and (min-width: 1024px)").matches) return true;
      if (navigator.deviceMemory && navigator.deviceMemory <= 2) return false;
      if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) return false;
    } catch (e) { return true; }
    return true;
  }

  function hideFallback() {
    if (fallback) fallback.classList.add("explore-fallback--hidden");
  }

  // Reveal the model frame.
  wrap.hidden = false;

  var loaderQueued = false;
  function promoteToWebGL() {
    if (!isCapableDevice()) return;
    var tries = 0;
    (function wait() {
      if (window.__requestFullOrrery) {
        window.__requestFullOrrery({ urgent: true, showLoading: false, mode: "webgl" })
          .catch(function () {});
        return;
      }
      if (++tries < 60) setTimeout(wait, 50);
    })();
  }

  function queueLoader() {
    if (loaderQueued) return;
    loaderQueued = true;
    inject("js/orrery-loader.js?v=578", function () {
      setTimeout(promoteToWebGL, 300);
    });
  }

  // Suppress the 2D dot orrery flash on capable devices — CSS shows the calm
  // Earth loader instead, and the photoreal Earth fades in over it.
  if (isCapableDevice() && !PRM) {
    document.documentElement.classList.add("ap-await-webgl");
    queueLoader();
  }

  // Poster + time-row wiring (date display, Now, scrub → Orrery3D.setTimelineDays).
  waitEphemeris(function () {
    injectCss("css/orrery-visual.css?v=567", "ap-orrery-visual-css");
    inject("js/lite-orrery.js?v=578", function () {
      document.documentElement.classList.add("orrery-poster-ready");
      queueLoader();
    });
  });

  // Cosmic-flight tool (wires #ap-cosmic-flight-launch → fullscreen overlay).
  injectCss("css/ap-cosmic-flight.css?v=567", "ap-cf-css");
  inject("js/ap-cosmic-flight-tool.js?v=567");

  // Retire the loading placeholder once any engine is live.
  document.addEventListener("ap-orrery-ready", function () {
    hideFallback();
    document.documentElement.classList.add("orrery-live");
  });
  document.addEventListener("orrery-scale-change", hideFallback, { once: true });

  // Safety nets so the loader can never sit forever over a dead boot.
  setTimeout(queueLoader, 4000);
  setTimeout(hideFallback, 6000);

  // ── Page chrome: masthead height var + collapsible legend ──
  function syncNavHeight() {
    var header = document.querySelector(".site-header");
    if (header) {
      var h = Math.round(header.getBoundingClientRect().height) || 64;
      document.documentElement.style.setProperty("--explore-nav-h", h + "px");
    }
    var deck = document.getElementById("orrery-lite-deck");
    if (deck) {
      var dh = Math.round(deck.getBoundingClientRect().height) || 136;
      document.documentElement.style.setProperty("--explore-deck-h", dh + "px");
    }
  }
  syncNavHeight();
  window.addEventListener("resize", syncNavHeight, { passive: true });
  window.addEventListener("load", function () { setTimeout(syncNavHeight, 300); }, { once: true });
  // The deck grows when the scale strip un-hides; re-measure after boot.
  document.addEventListener("orrery-scale-change", function () { setTimeout(syncNavHeight, 60); });

  (function legend() {
    var el = document.getElementById("explore-legend");
    var toggle = document.getElementById("explore-legend-toggle");
    if (!el || !toggle) return;
    // Collapse by default on small screens to keep the model clear.
    var startCollapsed = window.matchMedia && window.matchMedia("(max-width: 600px)").matches;
    function setCollapsed(on) {
      el.setAttribute("data-collapsed", on ? "true" : "false");
      toggle.setAttribute("aria-expanded", on ? "false" : "true");
    }
    setCollapsed(startCollapsed);
    toggle.addEventListener("click", function () {
      setCollapsed(el.getAttribute("data-collapsed") !== "true");
    });
  }());
}());
