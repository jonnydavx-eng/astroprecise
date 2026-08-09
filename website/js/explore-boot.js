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
 *   6. apply the moment: sessionStorage['ap-explore-moment'] for personal
 *      (birth) moments, #m=<ISO|now>&focus=<body> for public ones
 *
 * Everything feature-detects: a device that can't run WebGL degrades to the 2D
 * canvas engine, and the scale strip / journey button simply stay hidden.
 */
(function () {
  var PRM = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var V = '825';
  try {
    var ownScript = document.currentScript;
    var ownVersion = ownScript && new URL(ownScript.src, document.baseURI).searchParams.get('v');
    V = String(ownVersion || window.AP_ASSET_V || V);
  } catch (e) { V = String(window.AP_ASSET_V || V); }
  window.AP_ASSET_V = V;

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

  // ── Personal-moment receiver: sessionStorage['ap-explore-moment'] ────────
  // Public links (an eclipse, "now", a calendar day) carry their moment in the
  // fragment and stay shareable. A moment that is somebody's BIRTH minute is
  // handed over here instead — APDeepLink.stashSkyLink writes it, this reads it
  // once and deletes it — so explore.html never sits with a birth instant in
  // its address bar, where it would be screenshotted, bookmarked and synced.
  // Read at boot, kept in memory, because applyModelDeepLink runs several times
  // as the engines come up.
  var STASH_KEY = 'ap-explore-moment';
  var STASH_MAX_AGE_MS = 30 * 60 * 1000;
  var stashed = null;
  (function readStash() {
    var raw = null;
    try {
      raw = sessionStorage.getItem(STASH_KEY);
      if (raw) sessionStorage.removeItem(STASH_KEY);
    } catch (e) { return; }
    if (!raw) return;
    try {
      var o = JSON.parse(raw);
      if (!o || (o.m == null && !o.focus)) return;
      if (o.ts && Date.now() - o.ts > STASH_MAX_AGE_MS) return;
      stashed = {
        m: o.m != null ? String(o.m) : null,
        focus: o.focus ? String(o.focus).toLowerCase() : null
      };
    } catch (e2) { stashed = null; }
  }());

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
        var active = (b.getAttribute("data-lite-planet") || "").toLowerCase() === liteId;
        b.classList.toggle("active", active);
        b.setAttribute("aria-pressed", active ? "true" : "false");
      });
    } catch (e3) { /* optional */ }
  }

  /* The fragment still wins where it says something: a link somebody pasted is
     an explicit instruction. The stash fills in whatever the fragment left out
     — which for a personal link is the moment itself, the fragment carrying
     only the focus body. */
  function resolveIntent() {
    var parsed = parseModelHash();
    if (!stashed) return parsed;
    if (!parsed) return { m: stashed.m, focus: stashed.focus };
    return {
      m: parsed.m != null ? parsed.m : stashed.m,
      focus: parsed.focus || stashed.focus
    };
  }

  var lastAppliedKey = "";
  function applyModelDeepLink(force) {
    var parsed = resolveIntent();
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
  // Any explicit model instruction bypasses the threshold and deserves the
  // full engine. This includes bare #focus= links, not just #m= moments.
  var webglIntent = !!resolveIntent();
  function armWebglIntent() {
    if (webglIntent) return;
    webglIntent = true;
    queueLoader();
  }

  // Observatory threshold: gate the underlying controls until the visitor
  // enters, then reveal the SAME poster/WebGL surface. No extra canvas/context.
  var threshold = document.getElementById("explore-threshold");
  var thresholdEnter = document.getElementById("explore-threshold-enter");
  var stage = document.getElementById("explore-stage");
  var thresholdTimer = 0;
  function setInstrumentInert(on) {
    if (!stage) return;
    Array.prototype.forEach.call(stage.children, function (child) {
      if (child === threshold || child.classList.contains("sr-only")) return;
      if (on) child.setAttribute("inert", "");
      else child.removeAttribute("inert");
    });
  }
  function finishThreshold() {
    document.documentElement.classList.remove("explore-threshold-pending", "explore-threshold-entering");
    document.documentElement.classList.add("explore-threshold-entered");
    setInstrumentInert(false);
    if (threshold) threshold.hidden = true;
    if (stage) {
      try { stage.focus({ preventScroll: true }); }
      catch { try { stage.focus(); } catch {} }
    }
  }
  function enterThreshold(event) {
    if (event) event.preventDefault();
    armWebglIntent();
    try { sessionStorage.setItem("ap-explore-threshold-seen", "1"); } catch {}
    document.documentElement.classList.add("explore-threshold-entering");
    if (thresholdTimer) clearTimeout(thresholdTimer);
    thresholdTimer = setTimeout(finishThreshold, PRM ? 0 : 740);
  }
  if (threshold && thresholdEnter) {
    if (document.documentElement.classList.contains("explore-threshold-pending")) {
      setInstrumentInert(true);
      thresholdEnter.addEventListener("click", enterThreshold);
    } else {
      threshold.hidden = true;
      setInstrumentInert(false);
    }
  }
  // Loading the lite poster is safe on first paint; WebGL/Three is a user
  // intent upgrade. A tap, keyboard action, or explicit model deep-link arms it.
  ['pointerdown', 'touchstart', 'keydown'].forEach(function (eventName) {
    window.addEventListener(eventName, armWebglIntent, { once: true, passive: eventName !== 'keydown' });
  });
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
    if (loaderQueued || !webglIntent) return;
    loaderQueued = true;
    inject("js/orrery-loader.js?v=" + V, function () {
      setTimeout(promoteToWebGL, 300);
    });
  }

  // Suppress the poster only after an explicit deep-link/gesture has armed the
  // HD path. Capability alone must never hide the honest fallback or imply that
  // WebGL is already loading.
  if (isCapableDevice() && !PRM && webglIntent) {
    document.documentElement.classList.add("ap-await-webgl");
    if (webglIntent) queueLoader();
  }

  // Poster + time-row wiring (date display, Now, scrub → Orrery3D.setTimelineDays).
  waitEphemeris(function () {
    injectCss("css/orrery-visual.css?v=" + V, "ap-orrery-visual-css");
    inject("js/lite-orrery.js?v=" + V, function () {
      document.documentElement.classList.add("orrery-poster-ready");
      queueLoader();
      scheduleDeepLink();
    });
  });

  // Cosmic-flight tool (wires #ap-cosmic-flight-launch → fullscreen overlay).
  injectCss("css/ap-cosmic-flight.css?v=" + V, "ap-cf-css");
  inject("js/ap-cosmic-flight-tool.js?v=" + V);

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
    // A new hash is a new instruction; the one-hop handoff has had its turn.
    stashed = null;
    lastAppliedKey = "";
    scheduleDeepLink();
  });

  // Safety nets so the loader can never sit forever over a dead boot.
  setTimeout(function () { if (webglIntent) queueLoader(); }, 4000);
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
  // Deck height changes as WebGL controls arrive; keep the roaming hint and
  // mobile legend clear without guessing a fixed control-deck height.
  try {
    var deckMeasure = document.getElementById("orrery-lite-deck");
    if (deckMeasure && window.ResizeObserver) {
      var deckObserver = new ResizeObserver(syncNavHeight);
      deckObserver.observe(deckMeasure);
    }
  } catch { /* ResizeObserver is optional */ }
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
