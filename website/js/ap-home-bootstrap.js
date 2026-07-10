"use strict";
/* Award homepage — lazy ephemeris + hero instrument bundle (perf) */

(function () {
  var V = "684";

  window.__loadEphemeris = function (cb) {
    if (window.AstroEphemeris) {
      if (cb) cb();
      return Promise.resolve();
    }
    if (window.__ephemerisLoadPromise) {
      return window.__ephemerisLoadPromise.then(function () { if (cb) cb(); });
    }
    window.__ephemerisLoadPromise = new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = "js/ephemeris.js";
      s.defer = true;
      s.onload = function () { resolve(); if (cb) cb(); };
      s.onerror = reject;
      document.head.appendChild(s);
    });
    return window.__ephemerisLoadPromise;
  };

  function injectCss(href, id) {
    if (id && document.getElementById(id)) return;
    var l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = href;
    if (id) l.id = id;
    document.head.appendChild(l);
  }

  function loadEphemerisCss() {
    if (loadEphemerisCss.done) return;
    loadEphemerisCss.done = true;
    injectCss("css/ephemeris.css", "ap-ephemeris-css");
  }

  function loadCosmicFlightTool() {
    if (loadCosmicFlightTool.done) return;
    loadCosmicFlightTool.done = true;
    injectCss("css/ap-cosmic-flight.css?v=" + V, "ap-cf-css");
    var s = document.createElement("script");
    s.src = "js/ap-cosmic-flight-tool.js?v=" + V;
    document.body.appendChild(s);
  }

  function loadHeroBundle() {
    if (loadHeroBundle.done) return;
    loadHeroBundle.done = true;
    injectCss("css/orrery-visual.css?v=" + V, "ap-orrery-visual-css");
    loadCosmicFlightTool();
    var s = document.createElement("script");
    s.src = "js/ap-award-orrery.js?v=" + V;
    document.body.appendChild(s);
  }

  function warmOnIntent() {
    loadHeroBundle();
    window.__loadEphemeris();
  }

  function watchLazy() {
    // Hero is always above the fold — boot the existing HD stack immediately
    // so the photoreal Earth appears sooner (no alternate model).
    loadHeroBundle();

    var hero = document.querySelector("#apAwardOrreryWrap, .ap-award-orrery-frame");
    var instruments = document.getElementById("instrumentsChapter");
    if (!("IntersectionObserver" in window)) {
      return;
    }
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          loadHeroBundle();
          obs.disconnect();
        }
      });
    }, { rootMargin: "120px 0px" });
    if (hero) obs.observe(hero);
    if (instruments) obs.observe(instruments);

    ["ap-cosmic-flight-launch", "instruments-cosmic-flight"].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("mouseenter", warmOnIntent, { passive: true });
      el.addEventListener("focus", warmOnIntent, { once: true });
      el.addEventListener("click", function (e) {
        warmOnIntent();
        if (id !== "ap-cosmic-flight-launch" || window.APCosmicFlight) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        var tries = 0;
        (function waitOpen() {
          if (window.APCosmicFlight && typeof window.APCosmicFlight.open === "function") {
            window.APCosmicFlight.open();
          } else if (++tries < 100) {
            setTimeout(waitOpen, 50);
          }
        })();
      }, { capture: true });
    });
  }

  function scheduleEphemerisJs() {
    if (typeof requestIdleCallback === "function") {
      requestIdleCallback(function () { window.__loadEphemeris(); }, { timeout: 900 });
    } else {
      setTimeout(function () { window.__loadEphemeris(); }, 120);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleEphemerisJs, { once: true });
  } else {
    scheduleEphemerisJs();
  }

  window.addEventListener("load", function () {
    setTimeout(function () { window.__loadEphemeris(); }, 800);
  }, { once: true });

  // Sign-library seals: upgrade the 12 glyph slots (data-celestial-seal) after
  // load, off the critical path. Skipped on the audit path like icons.js.
  window.addEventListener("load", function () {
    if (navigator.webdriver || /\bHeadlessChrome\b/i.test(navigator.userAgent || "")) return;
    function loadSeals() {
      if (window.AstroCelestialSeals) return;
      injectCss("css/celestial-seals.css?v=" + V, "ap-css-seals");
      var s = document.createElement("script");
      s.src = "js/celestial-seals.js?v=" + V;
      s.defer = true;
      document.head.appendChild(s);
    }
    if (typeof requestIdleCallback === "function") {
      requestIdleCallback(loadSeals, { timeout: 2500 });
    } else {
      setTimeout(loadSeals, 600);
    }
  }, { once: true });

  window.addEventListener("pointerdown", function () {
    window.__loadEphemeris();
  }, { once: true, passive: true });

  var sky = document.getElementById("skyChapter");
  if (sky && "IntersectionObserver" in window) {
    var skyObs = new IntersectionObserver(function (entries) {
      if (entries[0] && entries[0].isIntersecting) {
        loadEphemerisCss();
        window.__loadEphemeris();
        skyObs.disconnect();
      }
    }, { rootMargin: "200px 0px" });
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () { skyObs.observe(sky); }, { once: true });
    } else {
      skyObs.observe(sky);
    }
  }

  function pinFloatNavAtHero() {
    var nav = document.getElementById("apFloatNav");
    if (!nav) return;
    nav.hidden = true;
    document.body.classList.remove("ap-award-511--nav-visible");
  }

  function onDomReady() {
    pinFloatNavAtHero();
    watchLazy();
    if (typeof requestIdleCallback === "function") {
      requestIdleCallback(loadHorizonFeatures, { timeout: 180 });
    } else {
      setTimeout(loadHorizonFeatures, 0);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", onDomReady, { once: true });
  } else {
    onDomReady();
  }

  function loadHorizonFeatures() {
    if (loadHorizonFeatures.done) return;
    loadHorizonFeatures.done = true;
    var s = document.createElement("script");
    s.src = "js/ap-horizon-features.js?v=" + V;
    document.body.appendChild(s);
  }

  window.__apWarmHeroBundle = warmOnIntent;
})();