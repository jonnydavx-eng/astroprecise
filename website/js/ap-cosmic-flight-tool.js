"use strict";
/* Opt-in fullscreen cosmic flight — start-sequence engine as a functional tool */

(function () {
  var motionQuery = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  var PRM = !!(motionQuery && motionQuery.matches);
  var AV = String(window.AP_ASSET_V || '771');
  var open = false;
  var booting = false;
  var scriptsQueued = false;
  var overlayBuilt = false;
  var narrateOn = false;
  var flightMode = "descent"; /* descent | zoom */
  var focusTrapHandler = null;
  var autoOpening = false;
  var autoAttempted = false;
  var autoCloseTimer = null;
  var AUTO_INTRO_KEY = "ap_cosmic_intro_v847";

  function $(id) { return document.getElementById(id); }

  function inject(src, next) {
    var s = document.createElement("script");
    s.src = src;
    s.defer = true;
    s.onload = function () { if (next) next(); };
    document.body.appendChild(s);
  }

  function ensureJourneyScripts(fn) {
    if (window.ScaleJourney && window.ScaleJourneyChapters) {
      if (fn) fn();
      return;
    }
    if (scriptsQueued) {
      var tries = 0;
      (function wait() {
        if (window.ScaleJourney && window.ScaleJourneyChapters) return fn && fn();
        if (++tries > 80) return;
        setTimeout(wait, 50);
      })();
      return;
    }
    scriptsQueued = true;
    inject("js/scale-journey-chapters.js?v=" + AV, function () {
      inject("js/scale-journey.js?v=" + AV, function () { if (fn) fn(); });
    });
  }

  function preloadEngine() {
    if (window.__scheduleOrreryEngineLoad) {
      window.__scheduleOrreryEngineLoad({ urgent: true, intent: true });
    } else if (window.__requestFullOrrery) {
      window.__requestFullOrrery({ urgent: true, showLoading: false, mode: "webgl" }).catch(function () {});
    }
  }

  function setLaunchLoading(on, msg) {
    var btn = $("ap-cosmic-flight-launch");
    if (!btn) return;
    btn.setAttribute("aria-busy", on ? "true" : "false");
    if (on) {
      btn.disabled = true;
      btn.dataset.prevLabel = btn.textContent;
      btn.textContent = msg || "Loading 3D sky…";
    } else if (!PRM) {
      btn.disabled = false;
      btn.textContent = btn.dataset.prevLabel || "✦ Cosmic flight";
      btn.removeAttribute("aria-busy");
    }
  }

  function autoIntroSeen() {
    try { return sessionStorage.getItem(AUTO_INTRO_KEY) === "1"; }
    catch (e) { return false; }
  }

  function markAutoIntroSeen() {
    try { sessionStorage.setItem(AUTO_INTRO_KEY, "1"); }
    catch (e) { /* storage blocked — this page load still runs only once */ }
  }

  function setReplayLabel() {
    var btn = $("ap-cosmic-flight-launch");
    if (!btn) return;
    btn.dataset.prevLabel = "Replay cosmic flight";
    if (!btn.disabled) btn.textContent = "Replay cosmic flight";
  }

  function trapFocus(root) {
    releaseFocusTrap();
    focusTrapHandler = function (e) {
      if (!open || e.key !== "Tab") return;
      var nodes = Array.prototype.slice.call(root.querySelectorAll(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )).filter(function (el) {
        return !el.hidden && el.getAttribute("aria-hidden") !== "true" && el.getClientRects().length > 0;
      });
      if (!nodes.length) return;
      var first = nodes[0];
      var last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", focusTrapHandler);
  }

  function releaseFocusTrap() {
    if (focusTrapHandler) {
      document.removeEventListener("keydown", focusTrapHandler);
      focusTrapHandler = null;
    }
  }

  function wireScaleStrip() {
    var strip = $("ap-cf-scale-strip");
    if (!strip || strip.dataset.wired) return;
    strip.dataset.wired = "1";
    strip.querySelectorAll("[data-scale]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var O = window.Orrery3D;
        var lv = parseInt(btn.dataset.scale, 10);
        if (!O || isNaN(lv)) return;
        if (O.isSpaceFlightActive && O.isSpaceFlightActive()) {
          if (typeof O.cancelSpaceFlight === "function") O.cancelSpaceFlight(false);
        }
        if (O.isCosmicFlightActive && O.isCosmicFlightActive()) {
          if (typeof O.cancelCosmicFlight === "function") O.cancelCosmicFlight(false);
        }
        if (O.isJourneyActive && O.isJourneyActive() && typeof O.cancelScaleJourney === "function") {
          O.cancelScaleJourney(false);
        }
        if (typeof O.setScaleLevel === "function") O.setScaleLevel(lv);
        strip.querySelectorAll("[data-scale]").forEach(function (b) {
          var on = parseInt(b.dataset.scale, 10) === lv;
          b.classList.toggle("active", on);
          b.setAttribute("aria-pressed", on ? "true" : "false");
        });
      });
    });
  }

  function showScaleStrip(show) {
    var strip = $("ap-cf-scale-strip");
    if (strip) strip.hidden = !show;
  }

  function syncNarrateBtn() {
    var btn = $("ap-cf-narrate");
    if (!btn) return;
    btn.setAttribute("aria-pressed", narrateOn ? "true" : "false");
    btn.textContent = narrateOn ? "Narration on" : "Narration";
    btn.classList.toggle("active", narrateOn);
  }

  function syncModeBtns() {
    var descent = $("ap-cf-mode-descent");
    var zoom = $("ap-cf-mode-zoom");
    if (descent) {
      descent.classList.toggle("active", flightMode === "descent");
      descent.setAttribute("aria-pressed", flightMode === "descent" ? "true" : "false");
    }
    if (zoom) {
      zoom.classList.toggle("active", flightMode === "zoom");
      zoom.setAttribute("aria-pressed", flightMode === "zoom" ? "true" : "false");
    }
  }

  function skipLabel() {
    if (flightMode === "zoom") return "Skip to galaxy";
    return "Skip to Earth";
  }

  function modeDek() {
    var keys = PRM ? "" : " · Esc exit · R replay";
    if (flightMode === "zoom") return "Earth → Milky Way · ~54s · VSOP87 live" + keys;
    return "Galaxy → Earth · ~26s · VSOP87 live" + keys;
  }

  function syncToolbarDek() {
    var dek = document.querySelector("#ap-cosmic-flight .ap-cf-toolbar__dek");
    if (dek) dek.textContent = modeDek();
  }

  function cancelActiveFlight() {
    var O = window.Orrery3D;
    if (!O) return;
    if (O.isSpaceFlightActive && O.isSpaceFlightActive() && typeof O.cancelSpaceFlight === "function") {
      O.cancelSpaceFlight(false);
    }
    if (O.isCosmicFlightActive && O.isCosmicFlightActive() && typeof O.cancelCosmicFlight === "function") {
      O.cancelCosmicFlight(false);
    }
    if (O.isJourneyActive && O.isJourneyActive() && typeof O.cancelScaleJourney === "function") {
      O.cancelScaleJourney(false);
    }
  }

  function onModeChange(mode) {
    if (flightMode === mode) return;
    flightMode = mode;
    syncModeBtns();
    syncToolbarDek();
    if (!open || booting) return;
    cancelActiveFlight();
    if ($("journey-skip")) $("journey-skip").textContent = skipLabel();
    showScaleStrip(false);
    startFlight();
  }

  function buildOverlay() {
    var root = $("ap-cosmic-flight");
    if (root) return root;

    root = document.createElement("div");
    root.id = "ap-cosmic-flight";
    root.hidden = true;
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-label", "Cosmic flight — interactive VSOP87 solar model");

    root.innerHTML =
      '<header class="ap-cf-toolbar">' +
        '<div class="ap-cf-toolbar__lead">' +
          '<p class="ap-cf-toolbar__title">Cosmic flight</p>' +
          '<p class="ap-cf-toolbar__dek" id="ap-cf-toolbar-dek">Galaxy → Earth · ~26s · VSOP87 live</p>' +
        '</div>' +
        '<div class="ap-cf-mode" role="group" aria-label="Flight direction">' +
          '<button type="button" class="ap-cf-btn ap-cf-btn--mode active" id="ap-cf-mode-descent" aria-pressed="true">↓ Descent</button>' +
          '<button type="button" class="ap-cf-btn ap-cf-btn--mode" id="ap-cf-mode-zoom" aria-pressed="false">↑ Space zoom</button>' +
        '</div>' +
        '<div class="ap-cf-toolbar__actions">' +
          '<button type="button" class="ap-cf-btn" id="ap-cf-narrate" aria-pressed="false" aria-label="Toggle poetic scene narration">Narration</button>' +
          '<button type="button" class="ap-cf-btn ap-cf-btn--primary" id="ap-cf-replay" aria-label="Replay flight">Replay</button>' +
          '<button type="button" class="ap-cf-btn ap-cf-btn--exit" id="ap-cf-exit" aria-label="Exit cosmic flight">Exit</button>' +
        '</div>' +
      '</header>' +
      '<div id="ap-cosmic-flight-stage" aria-live="polite"></div>' +
      '<div class="journey-hud" id="orrery-journey-hud" hidden aria-live="polite">' +
        '<div class="journey-hud__progress" aria-hidden="true"><span id="journey-progress-fill"></span></div>' +
        '<p class="journey-hud__tagline" id="journey-tagline"></p>' +
        '<h3 class="journey-hud__title" id="journey-title"></h3>' +
        '<button type="button" class="journey-hud__more" id="journey-more" aria-expanded="false">Scene notes</button>' +
        '<div class="journey-hud__detail" id="journey-detail" hidden>' +
          '<p class="journey-hud__narrative" id="journey-narrative"></p>' +
          '<p class="journey-hud__fact" id="journey-fact"></p>' +
          '<p class="journey-hud__pitch" id="journey-pitch"></p>' +
        '</div>' +
        '<button type="button" class="journey-hud__skip" id="journey-skip">Skip to Earth</button>' +
      '</div>' +
      '<footer class="ap-cf-scale-strip" id="ap-cf-scale-strip" hidden role="group" aria-label="Zoom scale">' +
        '<span class="ap-cf-scale-label">Explore scale</span>' +
        '<button type="button" data-scale="0" aria-pressed="false">Earth</button>' +
        '<button type="button" data-scale="1" aria-pressed="false">Inner</button>' +
        '<button type="button" data-scale="2" aria-pressed="false">System</button>' +
        '<button type="button" data-scale="3" aria-pressed="false">Oort</button>' +
        '<button type="button" data-scale="4" aria-pressed="false">Stars</button>' +
        '<button type="button" data-scale="5" aria-pressed="false">Galaxy</button>' +
        '<button type="button" data-scale="6" aria-pressed="false">Cosmos</button>' +
      '</footer>';

    document.body.appendChild(root);
    overlayBuilt = true;

    $("ap-cf-exit").addEventListener("click", function () {
      if (autoOpening) {
        var O = window.Orrery3D;
        var active = O && O.isCosmicFlightActive && O.isCosmicFlightActive();
        if (active && typeof O.cancelCosmicFlight === "function") O.cancelCosmicFlight(true);
        else closeTool({ focusLaunch: false });
      } else {
        closeTool();
      }
    });
    $("ap-cf-replay").addEventListener("click", function () {
      if (booting) return;
      startFlight();
    });
    $("ap-cf-mode-descent").addEventListener("click", function () { onModeChange("descent"); });
    $("ap-cf-mode-zoom").addEventListener("click", function () { onModeChange("zoom"); });
    $("ap-cf-narrate").addEventListener("click", function () {
      narrateOn = !narrateOn;
      syncNarrateBtn();
      var O = window.Orrery3D;
      if (O && typeof O.setNarrate === "function") O.setNarrate(narrateOn);
    });

    var skip = $("journey-skip");
    if (skip) {
      skip.addEventListener("click", function () {
        var O = window.Orrery3D;
        if (O && typeof O.isSpaceFlightActive === "function" && O.isSpaceFlightActive()) {
          if (typeof O.cancelSpaceFlight === "function") O.cancelSpaceFlight(true);
        } else if (O && typeof O.isCosmicFlightActive === "function" && O.isCosmicFlightActive()) {
          if (typeof O.cancelCosmicFlight === "function") O.cancelCosmicFlight(true);
        } else if (O && typeof O.cancelScaleJourney === "function") {
          O.cancelScaleJourney(true);
        }
      });
    }

    document.addEventListener("keydown", function (e) {
      if (!open) return;
      if (e.key === "Escape") {
        e.preventDefault();
        closeTool();
      } else if ((e.key === "r" || e.key === "R") && !e.ctrlKey && !e.metaKey && !e.altKey) {
        var tag = (e.target && e.target.tagName) || "";
        if (/^(INPUT|TEXTAREA|SELECT)$/.test(tag)) return;
        e.preventDefault();
        if (!booting && $("ap-cf-replay")) $("ap-cf-replay").click();
      }
    });

    document.addEventListener("orrery-journey-end", function (e) {
      if (!open) return;
      var d = e.detail || {};
      if (autoOpening) {
        autoOpening = false;
        var O = window.Orrery3D;
        if (O && typeof O.snapToNow === "function") O.snapToNow();
        setReplayLabel();
        if (autoCloseTimer) clearTimeout(autoCloseTimer);
        autoCloseTimer = setTimeout(function () {
          autoCloseTimer = null;
          closeTool({ focusLaunch: false });
        }, d.skipped ? 80 : 650);
        return;
      }
      if ($("ap-cf-replay")) $("ap-cf-replay").disabled = false;
      setLaunchLoading(false);
      showScaleStrip(true);
      var skip = $("journey-skip");
      var hud = $("orrery-journey-hud");
      if (skip) {
        if (d.spaceFlight) skip.textContent = "At galaxy — explore scale below";
        else if (d.cosmicFlight) skip.textContent = "At Earth — explore scale below";
        else skip.textContent = "Explore scale below";
      }
      if (hud) hud.hidden = false;
    });

    wireScaleStrip();
    try {
      narrateOn = localStorage.getItem("ap_narrate_journey") === "1";
    } catch (err) { narrateOn = false; }
    syncNarrateBtn();
    syncModeBtns();
    syncToolbarDek();

    return root;
  }

  function mountInstrument() {
    var instrument = document.querySelector(".ap-model-stage");
    if (!instrument) return false;
    // Keep <void-orrery> connected to its original DOM parent. Moving this
    // custom element fires disconnectedCallback(), which destroys the live
    // WebGL singleton and causes the fullscreen flight to flash/restart at
    // Earth. A promoted fixed-position class gives us the same visual result
    // without ever replacing the renderer or creating a second canvas.
    instrument.classList.add("ap-cf-promoted");
    // ap-v722 · A2 honesty: never claim LIVE (orrery-full) until WebGL owns the canvas.
    try {
      if (window.Orrery3D && window.Orrery3D.isWebGL) {
        document.documentElement.classList.add("orrery-full");
      }
    } catch (eFull) { /* optional */ }
    return true;
  }

  function restoreInstrument() {
    var instrument = document.querySelector(".ap-model-stage");
    if (instrument) instrument.classList.remove("ap-cf-promoted");
  }

  function waitOrrery(fn, maxTries) {
    var tries = 0;
    maxTries = maxTries || 160;
    (function poll() {
      if (window.Orrery3D && window.Orrery3D.isWebGL) return fn();
      if (++tries > maxTries) return fn(new Error("timeout"));
      setTimeout(poll, 50);
    })();
  }

  function startFlight() {
    var O = window.Orrery3D;
    if (!O) return;
    showScaleStrip(false);
    if ($("ap-cf-replay")) $("ap-cf-replay").disabled = true;
    if ($("journey-skip")) $("journey-skip").textContent = skipLabel();

    if (flightMode === "zoom") {
      if (typeof O.cancelCosmicFlight === "function") O.cancelCosmicFlight(false);
      if (typeof O.startSpaceFlight === "function") O.startSpaceFlight({ narrate: narrateOn });
    } else if (typeof O.startCosmicFlight === "function") {
      if (O.isJourneyActive && O.isJourneyActive() && typeof O.cancelScaleJourney === "function") {
        O.cancelScaleJourney(false);
      }
      O.startCosmicFlight({ narrate: narrateOn });
    }

    requestAnimationFrame(function () {
      if (typeof O.forceResize === "function") O.forceResize();
      setTimeout(function () { O.forceResize && O.forceResize(); }, 120);
      setTimeout(function () { O.forceResize && O.forceResize(); }, 400);
    });
  }

  function syncAutoIntroChrome(active) {
    var root = $("ap-cosmic-flight");
    if (!root) return;
    var mode = root.querySelector(".ap-cf-mode");
    var narrate = $("ap-cf-narrate");
    var replay = $("ap-cf-replay");
    var exit = $("ap-cf-exit");
    if (mode) mode.hidden = !!active;
    if (narrate) narrate.hidden = !!active;
    if (replay) replay.hidden = !!active;
    if (exit) {
      exit.textContent = active ? "Skip intro" : "Exit";
      exit.setAttribute("aria-label", active ? "Skip intro and open the live solar system" : "Exit cosmic flight");
    }
  }

  function bootAndFly() {
    if (booting) return;
    booting = true;
    setLaunchLoading(true);

    // Current Home boots through <void-orrery>; older builds exposed a loader
    // helper. Accept either path and reuse the already-running WebGL engine.
    var promote = window.Orrery3D && window.Orrery3D.isWebGL
      ? Promise.resolve()
      : window.__requestFullOrrery
        ? window.__requestFullOrrery({ urgent: true, showLoading: false, mode: "webgl" })
        : Promise.resolve();

    promote.then(function () {
      waitOrrery(function (err) {
        booting = false;
        if (err || !window.Orrery3D) {
          setLaunchLoading(false);
          if ($("ap-cf-replay")) $("ap-cf-replay").disabled = false;
          return;
        }
        // A2: LIVE chrome only after WebGL confirmed (mount may have skipped orrery-full).
        try {
          if (window.Orrery3D.isWebGL) {
            document.documentElement.classList.add("orrery-full");
          }
        } catch (eFull2) { /* optional */ }
        if (window.ScaleJourney && typeof window.ScaleJourney.rebind === "function") {
          window.ScaleJourney.rebind();
        }
        startFlight();
      }, 600);
    }).catch(function () {
      booting = false;
      setLaunchLoading(false);
      if ($("ap-cf-replay")) $("ap-cf-replay").disabled = false;
    });
  }

  function openTool(options) {
    if (PRM || open) return;
    options = options && options.auto === true ? options : { auto: false };
    ensureJourneyScripts(function () {
      var root = buildOverlay();
      if (window.ScaleJourney && typeof window.ScaleJourney.rebind === "function") {
        window.ScaleJourney.rebind();
      }
      if (!mountInstrument()) return;
      root.hidden = false;
      root.classList.add("is-open");
      document.body.classList.add("ap-cosmic-flight-open");
      open = true;
      autoOpening = options.auto;
      if (autoOpening) markAutoIntroSeen();
      syncAutoIntroChrome(autoOpening);
      trapFocus(root);
      $("ap-cf-exit").focus();
      bootAndFly();
    });
  }

  function closeTool(options) {
    if (!open) return;
    options = options || {};
    if (autoCloseTimer) {
      clearTimeout(autoCloseTimer);
      autoCloseTimer = null;
    }
    var O = window.Orrery3D;
    if (O && typeof O.cancelSpaceFlight === "function" && O.isSpaceFlightActive && O.isSpaceFlightActive()) {
      O.cancelSpaceFlight(false);
    }
    if (O && typeof O.cancelCosmicFlight === "function" && O.isCosmicFlightActive && O.isCosmicFlightActive()) {
      O.cancelCosmicFlight(false);
    }
    if (O && O.isJourneyActive && O.isJourneyActive() && typeof O.cancelScaleJourney === "function") {
      O.cancelScaleJourney(false);
    }
    releaseFocusTrap();
    restoreInstrument();
    var root = $("ap-cosmic-flight");
    if (root) {
      root.hidden = true;
      root.classList.remove("is-open");
    }
    document.body.classList.remove("ap-cosmic-flight-open");
    open = false;
    autoOpening = false;
    booting = false;
    syncAutoIntroChrome(false);
    setLaunchLoading(false);
    showScaleStrip(false);
    var launch = $("ap-cosmic-flight-launch");
    if (launch && options.focusLaunch !== false) launch.focus();
    requestAnimationFrame(function () {
      if (O && typeof O.forceResize === "function") O.forceResize();
    });
  }

  function bindLaunch() {
    var btn = $("ap-cosmic-flight-launch");
    if (!btn) return;
    btn.addEventListener("click", function () { openTool({ auto: false }); });
    btn.addEventListener("mouseenter", function () {
      ensureJourneyScripts();
      preloadEngine();
    }, { once: false, passive: true });
    btn.addEventListener("focus", function () {
      ensureJourneyScripts();
      preloadEngine();
    }, { once: false });
    function syncMotionPreference(reduce) {
      PRM = !!reduce;
      btn.disabled = PRM;
      if (PRM) {
        btn.title = "Cosmic flight is disabled when reduced motion is preferred";
        if (open) closeTool();
      } else {
        btn.removeAttribute("title");
      }
    }
    syncMotionPreference(PRM);
    if (autoIntroSeen()) setReplayLabel();
    if (motionQuery) {
      var onMotionChange = function (event) { syncMotionPreference(event.matches); };
      if (motionQuery.addEventListener) motionQuery.addEventListener("change", onMotionChange);
      else if (motionQuery.addListener) motionQuery.addListener(onMotionChange);
    }
  }

  function scheduleAutoIntro() {
    if (PRM || autoAttempted || autoIntroSeen()) return;
    if (!window.Orrery3D || !window.Orrery3D.isWebGL) return;
    autoAttempted = true;
    setTimeout(function () {
      if (!PRM && !open && document.visibilityState !== "hidden") {
        openTool({ auto: true });
      }
    }, 180);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      bindLaunch();
      scheduleAutoIntro();
    });
  } else {
    bindLaunch();
    scheduleAutoIntro();
  }
  document.addEventListener("ap-orrery-ready", scheduleAutoIntro, { once: true });

  window.APCosmicFlight = {
    open: openTool,
    close: closeTool,
    isOpen: function () { return open; },
    preload: function () { ensureJourneyScripts(); preloadEngine(); },
  };
})();
