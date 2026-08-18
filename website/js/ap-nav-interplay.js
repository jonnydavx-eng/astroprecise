"use strict";
/* Astro Precise — OBSERVATORY nav↔model interplay + chrome recession + scroll cue.
 * Homepage (body.ap-observatory-home) only — loaded after ap-home-bootstrap.
 *
 * LAWS (design 2026-07-10):
 *  - One Three instance: ALL camera work routes through window.Orrery3D public
 *    API (focusPlanet only — the engine's own eased tween satisfies the inertia
 *    law). No direct camera/quaternion writes, ever.
 *  - Honesty: chips render ONLY engine-derived strings (getBodyReadout). If the
 *    ephemeris isn't ready the chip simply doesn't show.
 *  - Calm: 300ms dwell gate, max ONE camera call per 2500ms, no hover-out
 *    revert, 10s lockout while the visitor drives the canvas, nothing during
 *    the intro or before html.orrery-full. PRM/keyboard/touch/2D = chips only.
 *  - INTERPLAY_CAMERA=false is the one-line rollback to chips-only mode.
 */
(function () {
  if (!document.body || !document.body.classList.contains("ap-observatory-home")) return;

  var INTERPLAY_CAMERA = true; // one-line rollback: set false for chips-only
  var PRM = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var FINE = !!(window.matchMedia && window.matchMedia("(pointer: fine)").matches);
  var DWELL_MS = 300, COOLDOWN_MS = 2500, LOCKOUT_MS = 10000;
  var lastCameraAt = 0, lockoutUntil = 0, dwellTimer = 0, chipTimer = 0;

  var LINK_SEL = ".contents-nav a, .navbar__nav .navbar__link, .bottom-nav__item";

  /* ── chip component — one element inside the Model Window frame ── */
  var chipEl = null;
  function ensureChip() {
    if (chipEl) return chipEl;
    var mw = document.getElementById("apModelWindow");
    if (!mw) return null;
    chipEl = document.createElement("span");
    chipEl.className = "ap-mw-chip";
    chipEl.setAttribute("aria-hidden", "true"); // hover ephemera — facts exist in page copy
    mw.appendChild(chipEl);
    return chipEl;
  }
  function showChip(text) {
    if (!text) return;
    var c = ensureChip();
    if (!c) return;
    c.textContent = text;
    c.classList.add("is-on");
    clearTimeout(chipTimer);
    chipTimer = setTimeout(hideChip, 2600);
  }
  function hideChip() { if (chipEl) chipEl.classList.remove("is-on"); }

  /* ── engine access (feature-detected; 2D/lite path = chips-only) ── */
  function engineFull() { return document.documentElement.classList.contains("orrery-full"); }
  function readoutLabel(id) {
    try {
      var O = window.Orrery3D;
      var r = O && typeof O.getBodyReadout === "function" ? O.getBodyReadout(id) : null;
      return (r && r.label) || null;
    } catch (e) { return null; }
  }
  function scaleLevel() {
    try {
      var O = window.Orrery3D;
      return O && typeof O.getScaleLevel === "function" ? O.getScaleLevel() | 0 : null;
    } catch (e) { return null; }
  }

  /* ── intent table (href → chip + optional camera body) ── */
  var INTENTS = {
    "chart.html": {
      chip: function () { var s = readoutLabel("sun"); return s ? s + " · cast yours" : null; },
      cam: function () { var lv = scaleLevel(); return lv != null && lv <= 2 ? "earth" : null; }
    },
    "ephemeris.html": {
      chip: function () {
        var m = readoutLabel("moon"), s = readoutLabel("sun");
        return m && s ? m + " · " + s + " · live now" : null;
      }
    },
    "horoscope.html": {
      chip: function () {
        var s = readoutLabel("sun");
        var d = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" });
        return s ? d + " · " + s : null;
      }
    },
    "shop.html": {
      chip: function () { return "wear this sky · prints from this model"; },
      cam: function () { var lv = scaleLevel(); return lv === 1 || lv === 2 ? "saturn" : null; } /* Saturn only when already on screen — never yank across scales */
    }
  };
  function intentFor(href) {
    if (!href) return null;
    if (href.charAt(0) === "#") return href === "#today" ? INTENTS["horoscope.html"] : null;
    var base = href.split(/[?#]/)[0].split("/").pop();
    if (!base || base === "index.html") return null; // current page → no-op
    return INTENTS[base] || null;
  }

  function fireCamera(body) {
    if (!INTERPLAY_CAMERA || PRM || !FINE) return;
    if (!engineFull()) return; // 2D fallback / poster: chips only
    var O = window.Orrery3D;
    if (!O || typeof O.focusPlanet !== "function") return;
    try { if (typeof O.isIntroActive === "function" && O.isIntroActive()) return; } catch (e) { return; }
    var now = Date.now();
    if (now < lockoutUntil || now - lastCameraAt < COOLDOWN_MS) return;
    lastCameraAt = now;
    try { O.focusPlanet(body); } catch (e) { /* engine optional */ }
  }

  function onIntent(link, chipsOnly) {
    var it = intentFor(link.getAttribute("href"));
    if (!it) return;
    var txt = it.chip ? it.chip() : null;
    if (txt) showChip(txt);
    if (!chipsOnly && it.cam && FINE && !PRM) {
      clearTimeout(dwellTimer);
      dwellTimer = setTimeout(function () {
        var body = it.cam();
        if (body) fireCamera(body);
      }, DWELL_MS); // dwell gate — leave before 300ms cancels
    }
  }

  document.addEventListener("mouseover", function (e) {
    if (!FINE) return; // touch devices: module inert for hover
    var link = e.target && e.target.closest && e.target.closest(LINK_SEL);
    if (!link || (e.relatedTarget && link.contains(e.relatedTarget))) return;
    onIntent(link, false);
  });
  document.addEventListener("mouseout", function (e) {
    var link = e.target && e.target.closest && e.target.closest(LINK_SEL);
    if (!link || (e.relatedTarget && link.contains(e.relatedTarget))) return;
    clearTimeout(dwellTimer); // NO revert — Earth is the rest frame anyway
  });
  document.addEventListener("focusin", function (e) {
    var link = e.target && e.target.closest && e.target.closest(LINK_SEL);
    if (link) onIntent(link, true); // keyboard: chips only
  });

  /* user-is-driving lockout — the visitor's hands beat nav whimsy */
  var canvas = document.getElementById("orrery-canvas");
  if (canvas) {
    ["pointerdown", "wheel"].forEach(function (ev) {
      canvas.addEventListener(ev, function () { lockoutUntil = Date.now() + LOCKOUT_MS; }, { passive: true });
    });
  }

  /* ── chrome recession — html.ap-chrome-idle (opacity-only, CSS-side).
       PRM: disabled entirely (owner law — chips still work above). ── */
  if (!PRM) {
    var IDLE_MS = FINE ? 6000 : 5000;
    var idleTimer = 0;
    var wake = function () {
      document.documentElement.classList.remove("ap-chrome-idle");
      clearTimeout(idleTimer);
      idleTimer = setTimeout(function () {
        document.documentElement.classList.add("ap-chrome-idle");
      }, IDLE_MS);
    };
    ["pointermove", "pointerdown", "wheel", "keydown", "touchstart"].forEach(function (ev) {
      document.addEventListener(ev, wake, { passive: true });
    });
    wake();
  }

  /* ── scroll cue — retire on first scroll; smooth-jump to #site-below ── */
  var cue = document.querySelector(".ap-mw-scrollcue");
  if (cue) {
    var seen = false;
    window.addEventListener("scroll", function () {
      if (!seen && (window.scrollY || 0) > 80) {
        seen = true;
        cue.classList.add("ap-mw-scrollcue--seen");
      }
    }, { passive: true });
    cue.addEventListener("click", function (e) {
      var t = document.getElementById("site-below");
      if (!t) return; // default anchor jump
      e.preventDefault();
      if (PRM) t.scrollIntoView();
      else t.scrollIntoView({ behavior: "smooth" });
    });
  }
})();
