"use strict";
/* Award homepage — lazy ephemeris + hero instrument bundle (perf) */

(function () {
  var V = String(window.AP_ASSET_V || "752");

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

  /* ═══ OBSERVATORY HOMEPAGE (body.ap-observatory-home only) ═════════════
     Everything below is gated on the observatory body class so the pre-flip
     index.html is byte-for-byte unaffected in behavior. */
  function obsWhenReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else {
      fn();
    }
  }
  obsWhenReady(function () {
    if (!document.body.classList.contains("ap-observatory-home")) return;
    var PRM = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    var root = document.documentElement;
    var hero = document.getElementById("heroChapter");
    var deck = document.getElementById("orrery-lite-deck");
    var copy = hero && hero.querySelector(".hero-copy");

    /* ── stage pixel budget — raf-core hdDPR consumes these globals so the
       full-viewport canvas never blows the fill budget on hi-DPI desktops
       (S24/coarse budget check: sqrt(1.15e6/0.285e6)=2.0 → phone 1.6 clamp
       unaffected — the OrbitLab IS_PHONE law survives). ── */
    function setStageBudget() {
      var stage = hero && hero.querySelector(".hero-solar-stage");
      var r = stage && stage.getBoundingClientRect();
      window.__apStageCssArea = r && r.width > 0 ? Math.round(r.width * r.height) : window.innerWidth * window.innerHeight;
      var coarse = !!(window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
      var tier = window.RafCore && window.RafCore.tier;
      window.__apStagePixelBudget = coarse ? 1.15e6 : tier === "mid" ? 3.5e6 : 6.0e6;
    }

    /* ── tray-height sync (explore-boot syncNavHeight descendant) —
       stage height = 100svh − tray − bottom-nav, so the tray top edge always
       equals the canvas bottom edge: control-vs-disc overlap is zero BY
       CONSTRUCTION at every width. ── */
    function syncTrayHeight() {
      var dh = deck ? Math.round(deck.getBoundingClientRect().height) : 0;
      root.style.setProperty("--ap-tray-h", (dh || 128) + "px");
      var mobile = window.matchMedia && window.matchMedia("(max-width: 1279px)").matches;
      var ch = mobile && copy ? Math.round(copy.getBoundingClientRect().height) : 0;
      root.style.setProperty("--ap-tray-h-m", ((dh + ch) || 168) + "px");
      var bar = document.querySelector(".bottom-nav");
      var bh = bar ? Math.round(bar.getBoundingClientRect().height) : 0;
      root.style.setProperty("--bottom-nav-h", bh + "px");
      setStageBudget();
    }
    syncTrayHeight();
    window.addEventListener("resize", syncTrayHeight, { passive: true });
    window.addEventListener("orientationchange", function () { setTimeout(syncTrayHeight, 120); }, { passive: true });
    window.addEventListener("load", function () { setTimeout(syncTrayHeight, 300); }, { once: true });
    // Deck grows when orrery-loader un-hides the scale strip; bottom-nav is
    // injected late by ap-horizon-features — re-measure after both.
    document.addEventListener("orrery-scale-change", function () { setTimeout(syncTrayHeight, 60); });
    document.addEventListener("ap-orrery-ready", function () { setTimeout(syncTrayHeight, 80); });
    setTimeout(syncTrayHeight, 700);
    setTimeout(syncTrayHeight, 1600);

    /* ── Explore toggle — collapse scale / journey / flight behind one control ── */
    (function exploreToggle() {
      var btn = document.getElementById("ap-explore-toggle");
      var panel = document.getElementById("ap-explore-panel");
      if (!btn || !panel) return;
      function setOpen(on) {
        panel.hidden = !on;
        btn.setAttribute("aria-expanded", on ? "true" : "false");
        btn.classList.toggle("is-open", on);
        setTimeout(syncTrayHeight, 40);
      }
      setOpen(false);
      btn.addEventListener("click", function () {
        setOpen(panel.hidden);
      });
    }());

    /* ── honest-model legend — starts collapsed (explore-boot twin) ── */
    (function legend() {
      var el = document.getElementById("explore-legend");
      var toggle = document.getElementById("explore-legend-toggle");
      if (!el || !toggle) return;
      function setCollapsed(on) {
        el.setAttribute("data-collapsed", on ? "true" : "false");
        toggle.setAttribute("aria-expanded", on ? "false" : "true");
      }
      setCollapsed(true);
      toggle.addEventListener("click", function () {
        setCollapsed(el.getAttribute("data-collapsed") !== "true");
      });
    }());

    /* ── returning-user chip rides ABOVE the form inside the cast dock
       (it ships inside the hidden .hero-action-chips otherwise) ── */
    var todayChip = document.getElementById("heroTodayChip");
    var form = document.getElementById("hero-chart-form");
    if (todayChip && form && form.parentNode) form.parentNode.insertBefore(todayChip, form);

    /* ── cast dock state machine — CONVERSION IS EXISTENTIAL.
       Compress ONLY on unambiguous exploration signals (scale≥1, journey,
       cosmic flight); any doubt → dock stays visible. Returning to Earth
       rest (scale 0) auto-restores after 600ms. PRM: State A permanent. ── */
    if (!PRM && hero && copy) {
      var pill = document.createElement("button");
      pill.type = "button";
      pill.className = "ap-cast-pill";
      pill.textContent = "✦ Cast your chart";
      pill.setAttribute("aria-label", "Cast your chart — reopen the birth date form");
      copy.appendChild(pill);
      var restoreTimer = 0;
      function compress() {
        clearTimeout(restoreTimer);
        if (hero.classList.contains("ap-cast-compressed")) return;
        hero.classList.add("ap-cast-compressed");
        setTimeout(syncTrayHeight, 60);
      }
      function restore(focusInput) {
        clearTimeout(restoreTimer);
        if (!hero.classList.contains("ap-cast-compressed")) return;
        hero.classList.remove("ap-cast-compressed");
        setTimeout(syncTrayHeight, 60);
        if (focusInput) {
          var input = document.getElementById("hero-birthdate");
          if (input) try { input.focus(); } catch (e) { /* focus optional */ }
        }
      }
      document.addEventListener("orrery-scale-change", function (e) {
        var lv = e && e.detail && e.detail.level;
        if (lv == null) return;
        if (lv >= 1) compress();
        else { clearTimeout(restoreTimer); restoreTimer = setTimeout(function () { restore(false); }, 600); }
      });
      ["ap-cosmic-journey", "ap-cosmic-flight-launch"].forEach(function (id) {
        var btn = document.getElementById(id);
        if (btn) btn.addEventListener("click", compress);
      });
      pill.addEventListener("click", function () { restore(true); });
    }
  });
})();
