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
 *   6. apply #m=<ISO|now>&focus=<body> deep links (model-moment mounts sitewide)
 *
 * Everything feature-detects: a device that can't run WebGL degrades to the 2D
 * canvas engine, and the scale strip / journey button simply stay hidden.
 */
(function () {
  var PRM = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var V = "740";

  var wrap = document.getElementById("apAwardOrreryWrap");
  var fallback = document.getElementById("apHeroWheelFallback");
  if (!wrap) return;

  // Mark as the lite hero so orrery-loader.js takes the auto-boot path.
  window.__apLiteHero = true;
  document.documentElement.classList.add("ap-lite-hero");

  function injectCss(href, id) {
    if (id && document.getElementById(id)) return;
    // Don't append a second orrery-visual sheet if explore.html already linked one
    // (stale ?v= injects used to win the cascade after the page's newer link).
    if (href.indexOf("orrery-visual") >= 0 &&
        document.querySelector('link[href*="orrery-visual"]')) return;
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

  // ── Model deep-link receiver: #m=<ISO|now>&focus=<body> ─────────────────
  // Sitewide stills + links point here. Invalid hash → silent no-op.
  var VALID_FOCUS = {
    earth: 1, sun: 1, moon: 1, mercury: 1, venus: 1, mars: 1,
    jupiter: 1, saturn: 1, uranus: 1, neptune: 1, pluto: 1
  };
  // Lite poster only focuses the classic seven + earth; outer → system frame.
  var LITE_FOCUS = {
    earth: 1, sun: 1, moon: 1, mercury: 1, venus: 1, mars: 1, jupiter: 1, saturn: 1
  };

  function parseModelHash(hash) {
    var h = String(hash || location.hash || "").replace(/^#/, "");
    if (!h) return null;
    // Accept #m=…&focus=… or bare #focus=mars (and optional leading ?).
    if (h.charAt(0) === "?") h = h.slice(1);
    var params = {};
    h.split(/[&;]/).forEach(function (part) {
      if (!part) return;
      var i = part.indexOf("=");
      if (i < 0) {
        // bare token like "now" is not supported without a key
        return;
      }
      var k = decodeURIComponent(part.slice(0, i).trim()).toLowerCase();
      var v = decodeURIComponent(part.slice(i + 1).trim());
      if (k) params[k] = v;
    });
    if (params.m == null && params.focus == null) return null;
    return {
      m: params.m != null ? params.m : null,
      focus: params.focus ? String(params.focus).toLowerCase() : null
    };
  }

  function resolveMomentDate(m) {
    if (m == null || m === "" || m === "now") return { kind: "now" };
    var s = String(m);
    /* Deep links are UTC by contract: a bare "1990-06-14T12:00" would parse
       as viewer-LOCAL time (a different sky per timezone). Append Z when no
       timezone designator is present so #m=…T17:46 === #m=…T17:46Z. */
    if (/^\d{4}-\d{2}-\d{2}T[\d:.]+$/.test(s)) s += "Z";
    var d = new Date(s);
    if (isNaN(d.getTime())) return null;
    return { kind: "date", date: d };
  }

  function applyTime(resolved) {
    if (!resolved) return;
    if (resolved.kind === "now") {
      if (window.LiteOrrery && typeof LiteOrrery.setDayOffset === "function") {
        LiteOrrery.setDayOffset(0);
      }
      if (window.Orrery3D) {
        if (typeof Orrery3D.snapToNow === "function") Orrery3D.snapToNow();
        else if (typeof Orrery3D.setTimelineDays === "function") Orrery3D.setTimelineDays(0);
      }
      return;
    }
    var date = resolved.date;
    if (window.Orrery3D && typeof Orrery3D.setDate === "function") {
      try { Orrery3D.setDate(date); } catch (e) { /* optional */ }
    }
    if (window.LiteOrrery && typeof LiteOrrery.setDayOffset === "function") {
      var off = (date.getTime() - Date.now()) / 86400000;
      try { LiteOrrery.setDayOffset(off); } catch (e2) { /* optional */ }
    }
  }

  function applyFocus(id) {
    if (!id || !VALID_FOCUS[id]) return;
    var liteId = LITE_FOCUS[id] ? id : "sun";
    try {
      if (window.LiteOrrery && typeof LiteOrrery.focusPlanet === "function") {
        LiteOrrery.focusPlanet(liteId);
      }
    } catch (e) { /* optional */ }
    try {
      if (window.Orrery3D && typeof Orrery3D.focusPlanet === "function") {
        Orrery3D.focusPlanet(id);
      }
    } catch (e2) { /* optional */ }
    try {
      document.querySelectorAll(".lite-vp-btn[data-lite-planet]").forEach(function (b) {
        b.classList.toggle("active", (b.getAttribute("data-lite-planet") || "").toLowerCase() === liteId);
      });
    } catch (e3) { /* optional */ }
  }

  var lastAppliedKey = "";
  function applyModelDeepLink(force) {
    var parsed = parseModelHash();
    if (!parsed) return false;
    var key = (parsed.m || "") + "|" + (parsed.focus || "");
    if (!force && key === lastAppliedKey) return true;
    var enginesReady = !!(window.LiteOrrery || window.Orrery3D);
    if (!enginesReady) return false;

    if (parsed.m != null) {
      var resolved = resolveMomentDate(parsed.m);
      if (resolved) applyTime(resolved);
    }
    if (parsed.focus) {
      applyFocus(parsed.focus);
    } else if (parsed.m != null) {
      // S6 product default: #m=… with no focus= → Earth rest frame.
      applyFocus('earth');
    }
    lastAppliedKey = key;
    try {
      document.documentElement.setAttribute("data-ap-model-link", key);
    } catch (e) { /* optional */ }
    return true;
  }

  function scheduleDeepLink() {
    var tries = 0;
    (function poll() {
      if (applyModelDeepLink(true)) return;
      if (++tries < 120) setTimeout(poll, 50);
    })();
  }

  // Public helper for tests / other scripts.
  window.__apApplyModelDeepLink = function () { return applyModelDeepLink(true); };
  window.__apParseModelHash = parseModelHash;

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
    inject("js/orrery-loader.js?v=740", function () {
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
    injectCss("css/orrery-visual.css?v=740", "ap-orrery-visual-css");
    inject("js/lite-orrery.js?v=740", function () {
      document.documentElement.classList.add("orrery-poster-ready");
      queueLoader();
      scheduleDeepLink();
    });
  });

  // Cosmic-flight tool (wires #ap-cosmic-flight-launch → fullscreen overlay).
  injectCss("css/ap-cosmic-flight.css?v=740", "ap-cf-css");
  inject("js/ap-cosmic-flight-tool.js?v=740");

  // Retire the loading placeholder once any engine is live.
  document.addEventListener("ap-orrery-ready", function () {
    hideFallback();
    document.documentElement.classList.add("orrery-live");
    // Continuous free-explore camera — Earth→Galaxy wheel/pinch without band traps
    try {
      if (window.Orrery3D && typeof window.Orrery3D.setFreeExplore === "function") {
        window.Orrery3D.setFreeExplore(true);
      }
    } catch (e) { /* optional */ }
    // Re-apply once WebGL owns time/focus (setDate path is richer than dayOffset).
    setTimeout(function () { applyModelDeepLink(true); }, 80);
    // ap-v722 · A1b: past loader auto-Earth timer (~1100ms) — belt-and-suspenders reassert.
    setTimeout(function () { applyModelDeepLink(true); }, 1200);
  });
  document.addEventListener("orrery-scale-change", hideFallback, { once: true });
  window.addEventListener("hashchange", function () {
    lastAppliedKey = "";
    scheduleDeepLink();
  });

  // Safety nets so the loader can never sit forever over a dead boot.
  setTimeout(queueLoader, 4000);
  setTimeout(hideFallback, 6000);
  // Late catch if lite boot was slow.
  setTimeout(scheduleDeepLink, 2500);

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
    // Structure clean: legend starts collapsed so the model owns first paint (all viewports).
    function setCollapsed(on) {
      el.setAttribute("data-collapsed", on ? "true" : "false");
      toggle.setAttribute("aria-expanded", on ? "false" : "true");
    }
    setCollapsed(true);
    toggle.addEventListener("click", function () {
      setCollapsed(el.getAttribute("data-collapsed") !== "true");
    });
  }());
}());
