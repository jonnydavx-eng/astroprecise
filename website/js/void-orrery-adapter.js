/* Void Orrery adapter — M2 engine unification (2026-07).
 * Drop-in replacement for js/orrery.js on the <void-orrery> pages. Boots the
 * superior Orrery3D engine (js/orrery-webgl.js — bloom + grade pass, soft-disc
 * stars, real VSOP87) through the EXISTING loader path (js/orrery-loader.js +
 * an import map for bare `three`), while preserving the legacy element's exact
 * public surface:
 *
 *   flyTo(key) flyScale(level) setNatal(rows) setJD(jd) setLive() getJD()
 *   setEclipse(k[,instant]) getEclipse() flight() lookUp() setObserver(lat,lon)
 *   events: planetfocus {key,name,glyph} · scalechange {level}
 *   attrs:  start-focus start-radius motion orbits data-wheel
 *   global: window.VoidEphem (byte-identical ephemeris utilities)
 *
 * Fallback ladder (fail-open at every rung, legacy stays one script away):
 *   1. ?engine=legacy or a failed sync probe (no WebGL2 / no import maps)
 *      → inject js/orrery.js; it self-registers <void-orrery> exactly as before.
 *   2. WebGL module import fails or stalls (>8s)
 *      → canvas engine js/orrery3d.js (same window.Orrery3D API).
 *   3. Per-element init throw or 9s with no first frame
 *      → canvas engine on a fresh canvas node.
 *   4. Canvas engine unavailable
 *      → legacy (pre-registration) or the static observatory poster.
 *
 * Known-good reference for the choreography: explore.html + js/ap-award-orrery.js.
 */
(function () {
  'use strict';
  if (window.__voidOrreryAdapter) return; // one adapter per page
  window.__voidOrreryAdapter = true;

  var ADAPTER_SCRIPT = document.currentScript;
  var ADAPTER_URL = (ADAPTER_SCRIPT && ADAPTER_SCRIPT.src)
    ? ADAPTER_SCRIPT.src
    : new URL('js/void-orrery-adapter.js', document.baseURI).href;
  // The page's adapter query is the delivery identity for the whole engine
  // chain. Publish it before loading orrery-loader.js so that loader imports
  // orrery-webgl.js with the same cache-safe version instead of its old fallback.
  var ADAPTER_V = new URL(ADAPTER_URL, document.baseURI).searchParams.get('v');
  var ASSET_V = String(ADAPTER_V || window.AP_ASSET_V || '826');
  window.AP_ASSET_V = ASSET_V;

  function assetUrl(name, extra) {
    var u = new URL(name, ADAPTER_URL);
    u.searchParams.set('v', ASSET_V);
    if (extra) for (var k in extra) u.searchParams.set(k, extra[k]);
    return u.href;
  }
  function log(msg) { try { console.info('[void-orrery adapter] ' + msg); } catch (e) {} }
  function warn(msg, err) { try { console.warn('[void-orrery adapter] ' + msg, err || ''); } catch (e) {} }

  /* ── window.VoidEphem — verbatim port from js/orrery.js (byte-compatible) ── */
  function defineVoidEphem() {
    if (window.VoidEphem) return;
    var J2000 = 2451545.0, DEG = Math.PI / 180;
    var SIGNS = [["Aries","♈\uFE0E"],["Taurus","♉\uFE0E"],["Gemini","♊\uFE0E"],["Cancer","♋\uFE0E"],["Leo","♌\uFE0E"],["Virgo","♍\uFE0E"],["Libra","♎\uFE0E"],["Scorpio","♏\uFE0E"],["Sagittarius","♐\uFE0E"],["Capricorn","♑\uFE0E"],["Aquarius","♒\uFE0E"],["Pisces","♓\uFE0E"]];
    var P = [
      { key:"mercury", name:"Mercury", glyph:"☿", a:0.387, L0:252.2509, rate:149472.6747, size:0.38, color:0x9b9187, c2:"#6e675f", band:0, kind:"cratered", tilt:0.03, spin:0.00005 },
      { key:"venus",   name:"Venus",   glyph:"♀", a:0.723, L0:181.9798, rate:58517.8156,  size:0.95, color:0xd9bd8f, c2:"#b09468", band:0.35, kind:"venus", tilt:177, spin:-0.00002 },
      { key:"earth",   name:"Earth",   glyph:"♁", a:1.000, L0:100.4644, rate:35999.3720,  size:1.00, color:0x4a7fd9, c2:"#2c5a9e", band:0, tex:"earth", tilt:23.4, spin:0.003 },
      { key:"mars",    name:"Mars",    glyph:"♂", a:1.524, L0:355.4473, rate:19140.3027,  size:0.53, color:0xc1633e, c2:"#8f4227", band:0.2, kind:"mars", tilt:25.2, spin:0.0029 },
      { key:"jupiter", name:"Jupiter", glyph:"♃", a:5.203, L0:34.3964,  rate:3034.7462,   size:3.20, color:0xc9a97e, c2:"#9d7d54", band:0.9, kind:"gas", tilt:3.1, spin:0.0073 },
      { key:"saturn",  name:"Saturn",  glyph:"♄", a:9.537, L0:49.9542,  rate:1222.4939,   size:2.80, color:0x9fdcec, c2:"#ab9468", band:0.7, kind:"gas", rings:true, tilt:26.7, spin:0.0067 },
      { key:"uranus",  name:"Uranus",  glyph:"♅", a:19.191, L0:313.2381, rate:428.4820,   size:1.90, color:0x9fd4d9, c2:"#6fa9b0", band:0.25, kind:"ice", tilt:97.8, spin:0.0042 },
      { key:"neptune", name:"Neptune", glyph:"♆", a:30.069, L0:304.8800, rate:218.4620,   size:1.85, color:0x5f7fd9, c2:"#3e57a5", band:0.35, kind:"ice", tilt:28.3, spin:0.0045 },
      { key:"pluto",   name:"Pluto",   glyph:"♇", a:39.482, L0:238.9295, rate:145.1780,  size:0.19, color:0xbfa792, c2:"#8a7660", band:0, kind:"cratered", tilt:119.6, spin:0.0005 }
    ];
    function norm(x) { x %= 360; return x < 0 ? x + 360 : x; }
    function jd(d) { return d.getTime() / 86400000 + 2440587.5; }
    function dateOf(j) { return new Date((j - 2440587.5) * 86400000); }
    function helioLon(p, j) { return norm(p.L0 + p.rate * ((j - J2000) / 36525)); }
    function helioXY(p, j) { var l = helioLon(p, j) * DEG; return [p.a * Math.cos(l), p.a * Math.sin(l)]; }
    function geoLon(p, j) { var e = helioXY(P[2], j), v = helioXY(p, j); return norm(Math.atan2(v[1] - e[1], v[0] - e[0]) / DEG); }
    function sunLon(j) { var dd = j - J2000; var g = (357.529 + 0.98560028 * dd) * DEG; return norm(helioLon(P[2], j) + 180 + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)); }
    function moonLon(j) { var dd = j - J2000; var M = (134.963 + 13.064993 * dd) * DEG; return norm(218.316 + 13.176396 * dd + 6.289 * Math.sin(M)); }
    function distAU(p, j) { var e = helioXY(P[2], j), v = helioXY(p, j); return Math.hypot(v[0] - e[0], v[1] - e[1]); }
    function sign(l) { l = norm(l); var i = Math.floor(l / 30); return { name: SIGNS[i][0], glyph: SIGNS[i][1], deg: Math.floor(l % 30), min: Math.round((l % 1) * 60) % 60 }; }
    function moonPhase(j) {
      var age = ((j - 2451550.1) % 29.530588 + 29.530588) % 29.530588;
      var illum = (1 - Math.cos(2 * Math.PI * age / 29.530588)) / 2;
      var name = age < 1.85 ? "New Moon" : age < 5.54 ? "Waxing Crescent" : age < 9.23 ? "First Quarter" : age < 12.91 ? "Waxing Gibbous" : age < 16.61 ? "Full Moon" : age < 20.3 ? "Waning Gibbous" : age < 23.99 ? "Last Quarter" : age < 27.68 ? "Waning Crescent" : "New Moon";
      var toFull = (14.765 - age + 29.530588) % 29.530588;
      return { age: age, illum: illum, name: name, daysToFull: toFull };
    }
    function positions(d) {
      var j = jd(d), rows = [];
      rows.push({ key: "sun", name: "Sun", glyph: "☉\uFE0E", lon: sunLon(j), sign: sign(sunLon(j)), dist: distAU ? Math.hypot.apply(null, helioXY(P[2], j)) : 1, retro: false });
      rows.push({ key: "moon", name: "Moon", glyph: "☽\uFE0E", lon: moonLon(j), sign: sign(moonLon(j)), dist: 0.00257, retro: false });
      for (var i = 0; i < P.length; i++) {
        var p = P[i]; if (p.key === "earth") continue;
        var glyphFixed = { mercury: "☿\uFE0E", venus: "♀\uFE0E", earth: "♁\uFE0E", mars: "♂\uFE0E", jupiter: "♃\uFE0E", saturn: "♄\uFE0E", uranus: "♅\uFE0E", neptune: "♆\uFE0E", pluto: "♇\uFE0E" };
        var l2 = geoLon(p, j), l22 = geoLon(p, j + 1);
        var diff = ((l22 - l2 + 540) % 360) - 180;
        rows.push({ key: p.key, name: p.name, glyph: glyphFixed[p.key] || p.glyph, lon: l2, sign: sign(l2), dist: distAU(p, j), retro: diff < 0 });
      }
      return { jd: j, rows: rows, moon: moonPhase(j) };
    }
    window.VoidEphem = { J2000: J2000, SIGNS: SIGNS, PLANETS: P, jd: jd, dateOf: dateOf, helioLon: helioLon, geoLon: geoLon, sunLon: sunLon, moonLon: moonLon, sign: sign, distAU: distAU, moonPhase: moonPhase, positions: positions, norm: norm };
    window.__voidOrreryAdapterOwnsEphem = true;
  }

  /* ── script injection helpers ────────────────────────────────────────────── */
  function injectScript(src, opts) {
    opts = opts || {};
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.async = opts.async !== false; // default async; legacy path passes false
      if (opts.dataset) for (var k in opts.dataset) s.dataset[k] = opts.dataset[k];
      s.onload = function () { resolve(s); };
      s.onerror = function () { reject(new Error('script failed: ' + src)); };
      document.head.appendChild(s);
    });
  }
  function withTimeout(promise, ms, label) {
    return new Promise(function (resolve, reject) {
      var t = setTimeout(function () { reject(new Error((label || 'step') + ' timeout')); }, ms);
      promise.then(function (v) { clearTimeout(t); resolve(v); }, function (e) { clearTimeout(t); reject(e); });
    });
  }
  function waitFor(test, ms, label) {
    return new Promise(function (resolve, reject) {
      var t0 = Date.now();
      (function poll() {
        try { if (test()) return resolve(true); } catch (e) {}
        if (Date.now() - t0 > ms) return reject(new Error((label || 'dep') + ' wait timeout'));
        setTimeout(poll, 40);
      })();
    });
  }

  /* ── legacy engine (orrery.js) — self-registers <void-orrery> + VoidEphem ── */
  var legacyRequested = false;
  function loadLegacy(why) {
    if (legacyRequested) return;
    legacyRequested = true;
    // orrery.js early-returns when VoidEphem exists — release the adapter's copy
    // so the legacy file boots fully and redefines it byte-identically.
    if (window.__voidOrreryAdapterOwnsEphem) {
      try { delete window.VoidEphem; } catch (e) { window.VoidEphem = undefined; }
      window.__voidOrreryAdapterOwnsEphem = false;
    }
    window.__voidOrreryEngine = 'legacy';
    log('legacy engine path (' + why + ') — injecting js/orrery.js');
    injectScript(assetUrl('orrery.js'), { async: false }).catch(function (err) {
      warn('legacy engine failed to load', err);
    });
  }

  /* ── engine selection ────────────────────────────────────────────────────── */
  var engineParam = '';
  try { engineParam = (new URLSearchParams(location.search).get('engine') || '').toLowerCase(); } catch (e) {}
  function webgl2OK() {
    try {
      var c = document.createElement('canvas');
      return !!(window.WebGL2RenderingContext && c.getContext('webgl2'));
    } catch (e) { return false; }
  }
  function importMapOK() {
    try { return !!(window.HTMLScriptElement && HTMLScriptElement.supports && HTMLScriptElement.supports('importmap')); } catch (e) { return false; }
  }
  var FORCE_LEGACY = engineParam === 'legacy';
  var FORCE_WEBGL = engineParam === 'webgl';
  var CAN_WEBGL = null;

  /* VoidEphem is useful on pages without a model. Defer the WebGL capability
   * probe and legacy engine injection until a <void-orrery> actually exists. */
  defineVoidEphem();

  function selectEnginePath() {
    if (CAN_WEBGL !== null) return CAN_WEBGL;
    CAN_WEBGL = !FORCE_LEGACY && !!window.customElements &&
      (FORCE_WEBGL || (importMapOK() && webgl2OK()));
    if (!CAN_WEBGL) loadLegacy(FORCE_LEGACY ? '?engine=legacy' : 'capability probe');
    return CAN_WEBGL;
  }

  function ensureImportMap() {
    try {
      if (document.querySelector('script[type="importmap"]')) return;
      var map = {
        imports: {
          three: new URL('vendor/three/three.module.min.js', ADAPTER_URL).href,
          'three/addons/': new URL('vendor/three/jsm/', ADAPTER_URL).href
        }
      };
      var s = document.createElement('script');
      s.type = 'importmap';
      s.textContent = JSON.stringify(map);
      (document.head || document.documentElement).insertBefore(s, (document.head && document.head.firstChild) || null);
    } catch (e) { /* a static map on the page, or a browser that wants none */ }
  }

  function ensureEphemeris() {
    if (window.AstroEphemeris && window.AstroEphemeris.julianDay) return Promise.resolve(true);
    if (!window.__voidOrreryEphemPromise) {
      window.__voidOrreryEphemPromise = injectScript(assetUrl('ephemeris.js'))
        .then(function () { return waitFor(function () { return window.AstroEphemeris && window.AstroEphemeris.julianDay; }, 12000, 'ephemeris'); })
        .catch(function (err) { window.__voidOrreryEphemPromise = null; throw err; });
    }
    return window.__voidOrreryEphemPromise;
  }

  function ensureLoader() {
    if (window.__loadOrreryEngine && window.__loadCanvasOrreryScript) return Promise.resolve(true);
    if (!window.__voidOrreryLoaderPromise) {
      window.__voidOrreryLoaderPromise = injectScript(assetUrl('orrery-loader.js'))
        .then(function () {
          return waitFor(function () { return window.__loadOrreryEngine && window.__loadCanvasOrreryScript; }, 4000, 'loader globals');
        })
        .catch(function (err) { window.__voidOrreryLoaderPromise = null; throw err; });
    }
    return window.__voidOrreryLoaderPromise;
  }

  /* Canvas engine, token-managed (mirrors orrery-loader.js so a cancelled load
   * can never clobber the running API). Used when the loader itself is missing. */
  var canvasSeq = 0;
  function loadCanvasEngine() {
    if (window.__loadCanvasOrreryScript) return window.__loadCanvasOrreryScript();
    if (window.Orrery3D && window.Orrery3D.init && window.__apOrreryCanvasFallback) {
      return Promise.resolve(window.Orrery3D);
    }
    var token = 'ap-adapter-fallback-' + ASSET_V + '-' + (++canvasSeq);
    window.__apOrreryFallbackOwner = token;
    return injectScript(assetUrl('orrery3d.js', { fallback: 'canvas' }), {
      dataset: { apOrreryCanvasFallback: 'true', apAssetV: ASSET_V, apOrreryFallbackToken: token, apState: 'loading' }
    }).then(function (s) {
      s.dataset.apState = 'loaded';
      if (!window.Orrery3D || typeof window.Orrery3D.init !== 'function') throw new Error('canvas engine unavailable');
      return window.Orrery3D;
    });
  }

  /* Engine pipeline (memoized): loader → WebGL module import (8s) → canvas (6s).
   * Resolves { kind, api }. The element is defined only after the first rung
   * that succeeds — total failure keeps the legacy door open. */
  var engineKind = null; // 'webgl' | 'canvas' | null
  var runningEngine = null;
  function bootPipeline() {
    if (window.__voidOrreryPipeline) return window.__voidOrreryPipeline;
    ensureImportMap();
    var p = ensureLoader().catch(function () { return true; /* loader optional — direct import fallback */ })
      .then(function () {
        var importJob = window.__loadOrreryEngine
          ? window.__loadOrreryEngine()
          : import(assetUrl('orrery-webgl.js')).then(function () {
              if (!window.Orrery3D) throw new Error('orrery-webgl did not register Orrery3D');
              return window.Orrery3D;
            });
        return withTimeout(importJob, 8000, 'webgl import');
      })
      .then(function (O) {
        engineKind = 'webgl';
        runningEngine = O;
        window.__voidOrreryEngine = 'webgl';
        return { kind: 'webgl', api: O };
      })
      .catch(function (err) {
        warn('WebGL engine import unavailable — failing open to canvas engine', err);
        return withTimeout(loadCanvasEngine(), 6000, 'canvas engine').then(function (O) {
          engineKind = 'canvas';
          runningEngine = O;
          window.__voidOrreryEngine = 'canvas';
          window.__orreryReady = true;
          window.__apOrreryCanvasFallback = true;
          return { kind: 'canvas', api: O };
        });
      });
    // Late-settling WebGL import must not clobber a running canvas engine.
    p.then(function (r) {
      if (r && r.kind === 'canvas' && runningEngine) {
        var api = runningEngine;
        setTimeout(function () {
          if (runningEngine === api && window.Orrery3D !== api) {
            try { window.Orrery3D = api; } catch (e) {}
          }
        }, 9000);
      }
    }, function () { /* pipeline rejection is owned by the outer .catch */ });
    window.__voidOrreryPipeline = p;
    return p;
  }

  /* ── constants for the legacy public surface ─────────────────────────────── */
  var BODY_INFO = {
    sun: ['Sun', '☉\uFE0E'], moon: ['Moon', '☽\uFE0E'],
    mercury: ['Mercury', '☿'], venus: ['Venus', '♀'], earth: ['Earth', '♁'],
    mars: ['Mars', '♂'], jupiter: ['Jupiter', '♃'], saturn: ['Saturn', '♄'],
    uranus: ['Uranus', '♅'], neptune: ['Neptune', '♆'], pluto: ['Pluto', '♇']
  };
  var SCALE_NAMES = ['EARTH', 'INNER', 'SYSTEM', 'OORT', 'STARS', 'GALAXY', 'COSMOS'];
  var SCALE_FOCUS_NAMES = {
    EARTH: 'Earth', INNER: 'The Inner System', SYSTEM: 'The System', OORT: 'The Oort Cloud',
    STARS: 'The Neighborhood', GALAXY: 'The Galaxy', COSMOS: 'The Deep Field'
  };
  function scaleToIndex(level) {
    if (typeof level === 'number' && isFinite(level)) return Math.max(0, Math.min(6, Math.round(level)));
    var lv = String(level || '').toUpperCase();
    var i = SCALE_NAMES.indexOf(lv);
    return i >= 0 ? i : 2; // unknown → SYSTEM (legacy default radius 210)
  }
  function radiusToLevel(r) { // legacy scalechange thresholds
    return r < 70 ? 0 : r < 900 ? 2 : r < 15000 ? 4 : r < 90000 ? 5 : 6;
  }

  /* ── <void-orrery> — the adapter element ─────────────────────────────────── */
  var engineOwner = null; // first connected element owns the engine singleton

  function defineElement() {
    if (customElements.get('void-orrery')) return;

    var VoidOrreryAdapter = /** @class */ (function () {
      function C() { return Reflect.construct(HTMLElement, [], C); }
      C.prototype = Object.create(HTMLElement.prototype, { constructor: { value: C } });
      Object.setPrototypeOf(C, HTMLElement);

      C.observedAttributes = ['motion', 'orbits'];

      C.prototype.connectedCallback = function () {
        if (this._booted) return;
        this._booted = true;
        this.style.display = 'block'; this.style.width = '100%'; this.style.height = '100%'; this.style.position = 'relative';
        this._queue = [];
        this._ready = false;
        this._live = false;
        this._eclipseK = 0; this._eclipseTarget = 0;
        this._lastLevelName = null;
        this._lastFocusKey = null; this._lastFocusAt = 0;
        if (!this._ph) {
          var ph = this._ph = document.createElement('div');
          ph.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;pointer-events:none';
          // The placeholder is a drawn ring and nothing else. It carried the
          // words "WAKING THE ENGINE…" until 2026-08-08; that string was the
          // first thing a visitor read on the homepage, and on any path where
          // the first frame never arrives it was also the last. A shipped
          // default state must not contain loading text — the ring alone says
          // "something is about to appear" without making a claim that has to
          // resolve. Removed here and in js/orrery.js; nothing else changed.
          ph.innerHTML = '<div style="width:180px;height:180px;border-radius:50%;border:1px solid rgba(216,180,106,.28);box-shadow:inset 0 0 60px rgba(216,180,106,.1)"></div>';
          this.appendChild(ph);
        }
        // data-wheel="off": keep page scroll, block the engine's own wheel-zoom.
        if (this.getAttribute('data-wheel') === 'off') {
          this.addEventListener('wheel', function (e) { e.stopPropagation(); }, true);
        }
        if (engineOwner && engineOwner !== this) { // one engine singleton per page
          warn('second <void-orrery> on one page — showing poster (engine already owned)');
          this._poster();
          return;
        }
        engineOwner = this;
        this._wireEngineEvents();
        this._bootEngine();
        this._armWatchdog();
      };

      C.prototype.disconnectedCallback = function () {
        if (this._liveTimer) { clearInterval(this._liveTimer); this._liveTimer = null; }
        if (this._eclipseRaf) { cancelAnimationFrame(this._eclipseRaf); this._eclipseRaf = null; }
        if (this._eclipseHold) { clearInterval(this._eclipseHold); this._eclipseHold = null; }
        if (this._watchdog) { clearTimeout(this._watchdog); this._watchdog = null; }
        this._unwireEngineEvents();
        if (engineOwner === this) {
          engineOwner = null;
          try { if (this._engine && this._engine.destroy) this._engine.destroy(); } catch (e) {}
        }
      };

      /* ── boot ── */
      C.prototype._bootEngine = function () {
        var self = this;
        this._engineKind = engineKind;
        ensureEphemeris()
          .then(function () {
            if (!self.isConnected) throw new Error('detached during boot');
            var cv = document.createElement('canvas');
            cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none';
            self._canvas = cv;
            self.insertBefore(cv, self._ph || null);
            var api = (self._engineKind === 'canvas' ? runningEngine : window.Orrery3D) || runningEngine;
            if (!api || typeof api.init !== 'function') throw new Error('Orrery3D missing');
            var res = api.init(cv, {});
            return Promise.resolve(res).then(function () { return api; });
          })
          .then(function (api) {
            // WebGL init may have self-fallen-back to the canvas engine.
            if (window.__apOrreryCanvasFallback && window.Orrery3D && window.Orrery3D !== api) {
              api = window.Orrery3D;
              self._engineKind = 'canvas';
              engineKind = 'canvas';
            }
            self._engine = api;
            runningEngine = api;
            self._postInit();
          })
          .catch(function (err) {
            warn('engine boot failed — failing open to canvas engine', err);
            self._toCanvasEngine();
          });
      };

      C.prototype._postInit = function () {
        var O = this._engine, self = this;
        try { if (O.setSpeed) O.setSpeed(0); } catch (e) {}
        try { if (O.skipIntro) O.skipIntro(); } catch (e) {}
        if (this.getAttribute('orbits') === 'off') {
          try { if (O.setShowOrbits) O.setShowOrbits(false); } catch (e) {}
        }
        // start-radius wins over start-focus (legacy frames the focus body FROM
        // that radius; the engine's scale presets are the honest equivalent).
        var sr = parseFloat(this.getAttribute('start-radius') || this.getAttribute('startradius'));
        var sf = this.getAttribute('start-focus') || this.getAttribute('startfocus');
        if (!isNaN(sr)) {
          this._applyScaleIndex(radiusToLevel(sr), false);
        } else if (sf) {
          this._suppressFocusKey = String(sf).toLowerCase();
          this._suppressFocusUntil = Date.now() + 1500;
          this._engineFlyTo(sf);
        }
        // state captured while unready, then the queued consumer calls, in order
        this._reapplyState();
        this._ready = true; // BEFORE the flush — re-entrant calls must not re-queue
        this.setAttribute('data-engine', this._engineKind || 'webgl');
        var q = this._queue; this._queue = [];
        for (var i = 0; i < q.length; i++) { try { q[i](); } catch (e) {} }
        this._awaitFirstFrame(function () {
          if (self._ph) {
            self._ph.style.transition = 'opacity .5s ease';
            self._ph.style.opacity = '0';
            var ph = self._ph;
            setTimeout(function () { try { ph.remove(); } catch (e) {} }, 560);
            self._ph = null;
          }
          try { document.dispatchEvent(new Event('ap-orrery-ready')); } catch (e) {}
        });
      };

      C.prototype._reapplyState = function () {
        var O = this._engine;
        if (!O) return;
        try { if (this._live && O.snapToNow) O.snapToNow(); }
        catch (e) {}
        try {
          if (!this._live && this._jd != null) {
            if (O.jumpTo) O.jumpTo(this._jd);
            else if (O.setDate && window.VoidEphem) O.setDate(window.VoidEphem.dateOf(this._jd));
          }
        } catch (e) {}
        this._applyEclipse(); // veil + exposure reach the new engine
        this._renderNatal();  // DOM overlay survives engine swaps by construction
      };

      C.prototype._awaitFirstFrame = function (done) {
        var called = false;
        function finish() { if (called) return; called = true; done(); }
        document.addEventListener('ap-orrery-first-frame', function once() {
          document.removeEventListener('ap-orrery-first-frame', once);
          finish();
        });
        requestAnimationFrame(function () { requestAnimationFrame(function () { setTimeout(finish, 900); }); });
      };

      C.prototype._armWatchdog = function () {
        var self = this;
        this._watchdog = setTimeout(function () {
          self._watchdog = null;
          if (self._ready || self._posted) return;
          warn('9s without engine ready — failing open to canvas engine');
          self._toCanvasEngine();
        }, 9000);
      };

      C.prototype._toCanvasEngine = function () {
        var self = this;
        if (this._posted) return;
        if (this._engineKind === 'canvas' && this._canvasTried) { this._poster(); return; }
        this._engineKind = 'canvas';
        engineKind = 'canvas';
        window.__voidOrreryEngine = 'canvas';
        this._canvasTried = true;
        try { if (this._engine && this._engine.destroy) this._engine.destroy(); } catch (e) {}
        this._engine = null;
        // A canvas that held a WebGL context cannot return a 2D context — fresh node.
        if (this._canvas && this._canvas.parentNode) {
          var fresh = this._canvas.cloneNode(false);
          this._canvas.parentNode.replaceChild(fresh, this._canvas);
          this._canvas = fresh;
        }
        loadCanvasEngine().then(function (O) {
          if (!self.isConnected) return;
          if (!self._canvas) {
            var cv = document.createElement('canvas');
            cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
            self._canvas = cv;
            self.insertBefore(cv, self._ph || null);
          }
          self._engine = O;
          runningEngine = O;
          O.init(self._canvas, { skipIntro: true, fromLite: true });
          try { if (O.setSpeed) O.setSpeed(0); } catch (e) {}
          window.__orreryReady = true;
          window.__apOrreryCanvasFallback = true;
          self._postInit();
        }).catch(function (err) {
          warn('canvas engine unavailable', err);
          self._poster();
        });
      };

      C.prototype._poster = function () {
        this._posted = true;
        this.setAttribute('data-engine', 'poster');
        window.__voidOrreryEngine = 'poster';
        if (this._ph) { try { this._ph.remove(); } catch (e) {} this._ph = null; }
        if (this._canvas) { try { this._canvas.remove(); } catch (e) {} this._canvas = null; }
        this.innerHTML = '<div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 62%,rgba(216,180,106,.12),transparent 62%),radial-gradient(ellipse at 50% 118%,rgba(255,90,31,.09),transparent 55%)"></div><div style="position:absolute;left:50%;top:52%;transform:translate(-50%,-50%);width:180px;height:180px;border-radius:50%;border:1px solid rgba(216,180,106,.28);box-shadow:0 0 60px rgba(216,180,106,.15),inset 0 0 60px rgba(216,180,106,.1)"></div>';
        // keep the natal overlay + eclipse veil above the poster
        if (this._natalLayer) this.appendChild(this._natalLayer);
        if (this._veil) this.appendChild(this._veil);
      };

      /* ── engine event re-emission (legacy event names, identical detail) ── */
      C.prototype._wireEngineEvents = function () {
        var self = this;
        this._onScaleChange = function (e) {
          var d = e && e.detail;
          if (!d || d.level == null) return;
          var name = SCALE_NAMES[d.level | 0] || 'SYSTEM';
          if (name === self._lastLevelName) return;
          self._lastLevelName = name;
          self._syncNatalVisibility();
          self.dispatchEvent(new CustomEvent('scalechange', { detail: { level: name }, bubbles: true }));
        };
        this._onPlanetFocus = function (e) {
          var d = e && e.detail;
          if (!d || !d.id) return;
          var key = String(d.id).toLowerCase();
          if (self._suppressFocusKey === key && Date.now() < self._suppressFocusUntil) return;
          if (self._lastFocusKey === key && Date.now() - self._lastFocusAt < 600) return;
          self._emitFocus(key);
        };
        document.addEventListener('orrery-scale-change', this._onScaleChange);
        document.addEventListener('orrery-planet-focus', this._onPlanetFocus);
      };
      C.prototype._unwireEngineEvents = function () {
        if (this._onScaleChange) { try { document.removeEventListener('orrery-scale-change', this._onScaleChange); } catch (e) {} this._onScaleChange = null; }
        if (this._onPlanetFocus) { try { document.removeEventListener('orrery-planet-focus', this._onPlanetFocus); } catch (e) {} this._onPlanetFocus = null; }
      };
      C.prototype._emitFocus = function (key, info) {
        var detail = info || { key: key };
        if (!info) {
          var bi = BODY_INFO[key];
          if (bi) { detail.name = bi[0]; detail.glyph = bi[1]; }
        }
        this._lastFocusKey = detail.key || null;
        this._lastFocusAt = Date.now();
        this.dispatchEvent(new CustomEvent('planetfocus', { detail: detail, bubbles: true }));
      };

      /* ── camera: flyTo / flyScale ── */
      C.prototype._engineFlyTo = function (key) {
        var O = this._engine;
        if (!O) return;
        var id = String(key || '').toLowerCase();
        try {
          if (!id) { if (O.setScaleLevel) O.setScaleLevel(2, true); return; }
          if (O.focusPlanet) { O.focusPlanet(id); return; }
          if (O.flyToBody) { O.flyToBody(id); return; }
        } catch (e) {}
      };
      C.prototype._applyScaleIndex = function (idx, animate) {
        var O = this._engine;
        if (!O) return;
        try { if (O.setScaleLevel) O.setScaleLevel(idx, animate !== false); } catch (e) {}
        this._lastScaleIndex = idx;
      };
      C.prototype.flyTo = function (key) {
        key = key == null ? '' : String(key).toLowerCase();
        var self = this;
        if (!this._ready) { this._queue.push(function () { self.flyTo(key); }); }
        else this._engineFlyTo(key);
        // legacy dispatched planetfocus synchronously, renderer or not
        if (!key) this._emitFocus(key, { key: key, name: 'The System', glyph: '✦' });
        else this._emitFocus(key);
      };
      C.prototype.flyScale = function (level) {
        var self = this;
        var lv = String(level == null ? '' : level).toUpperCase();
        if (lv === 'EARTH') return this.flyTo('earth');
        var idx = scaleToIndex(level);
        if (!this._ready) { this._queue.push(function () { self.flyScale(level); }); }
        else this._applyScaleIndex(idx, true);
        if (this._engineKind === 'canvas' || (this._engine && this._engine.isWebGL === false)) {
          // canvas engine emits no scale events — keep the ladder honest
          var name = SCALE_NAMES[idx];
          if (name !== this._lastLevelName) {
            this._lastLevelName = name;
            this._syncNatalVisibility();
            this.dispatchEvent(new CustomEvent('scalechange', { detail: { level: name }, bubbles: true }));
          }
        }
        this._emitFocus(null, { key: null, name: SCALE_FOCUS_NAMES[lv] || lv, glyph: '✦' });
      };

      /* ── time: setJD / setLive / getJD ── */
      C.prototype.setJD = function (j) {
        this._live = false;
        this._jd = j;
        var self = this;
        if (this._liveTimer) { clearInterval(this._liveTimer); this._liveTimer = null; }
        if (!this._ready) { this._queue.push(function () { self.setJD(j); }); return; }
        var O = this._engine;
        try {
          if (O.jumpTo) O.jumpTo(j); // both engines take an absolute JD
          else if (O.setDate && window.VoidEphem) O.setDate(window.VoidEphem.dateOf(j));
        } catch (e) {}
      };
      C.prototype.setLive = function () {
        this._live = true;
        this._jd = null;
        var self = this;
        function apply() {
          var O = self._engine;
          try { if (O && O.snapToNow) O.snapToNow(); } catch (e) {}
        }
        if (!this._ready) { this._queue.push(apply); }
        else apply();
        if (!this._liveTimer) {
          // legacy tracked wall-clock every frame; re-snap keeps the engine honest
          this._liveTimer = setInterval(function () {
            if (self._live && self._ready) apply();
          }, 30000);
        }
      };
      C.prototype.getJD = function () {
        var O = this._engine;
        if (this._ready && O) {
          try {
            if (O.nowJd) return O.nowJd();
            if (O.getDate && window.VoidEphem) return window.VoidEphem.jd(O.getDate());
          } catch (e) {}
        }
        return window.VoidEphem ? window.VoidEphem.jd(new Date()) : (Date.now() / 86400000 + 2440587.5);
      };

      /* ── eclipse: setEclipse / getEclipse ──
       * Orrery3D owns the lunar silhouette and corona-forward treatment. The
       * adapter supplies the eased public contract and a restrained atmosphere
       * veil; canvas fallback keeps the exposure-only approximation. */
      C.prototype.setEclipse = function (k, instant) {
        this._eclipseTarget = Math.max(0, Math.min(1, +k || 0));
        var self = this;
        if (instant) {
          if (this._eclipseRaf) { cancelAnimationFrame(this._eclipseRaf); this._eclipseRaf = null; }
          this._eclipseK = this._eclipseTarget;
          this._applyEclipse();
          this._armEclipseHold();
          return;
        }
        if (this._eclipseRaf) cancelAnimationFrame(this._eclipseRaf);
        var from = this._eclipseK, to = this._eclipseTarget, t0 = performance.now(), DUR = 1200;
        if (Math.abs(to - from) < 0.001) { this._eclipseK = to; this._applyEclipse(); this._armEclipseHold(); return; }
        function step(now) {
          var u = Math.min(1, (now - t0) / DUR);
          self._eclipseK = from + (to - from) * (u * u * (3 - 2 * u));
          self._applyEclipse();
          if (u < 1) self._eclipseRaf = requestAnimationFrame(step);
          else { self._eclipseRaf = null; self._armEclipseHold(); }
        }
        this._eclipseRaf = requestAnimationFrame(step);
      };
      C.prototype._armEclipseHold = function () {
        var self = this;
        if (this._eclipseHold) { clearInterval(this._eclipseHold); this._eclipseHold = null; }
        if (this._eclipseTarget <= 0) return;
        // scale transitions stomp exposure — re-assert while the eclipse holds
        this._eclipseHold = setInterval(function () { self._applyEclipse(); }, 1000);
      };
      C.prototype._applyEclipse = function () {
        var k = Math.max(0, Math.min(1, this._eclipseK || 0));
        if (!this._veil) {
          var v = this._veil = document.createElement('div');
          v.setAttribute('aria-hidden', 'true');
          v.style.cssText = 'position:absolute;inset:0;pointer-events:none;opacity:0;' +
            'background:radial-gradient(ellipse at 50% 58%,rgba(1,2,6,0) 26%,rgba(1,2,6,.55) 78%,rgba(0,1,4,.8) 100%),linear-gradient(rgba(2,3,9,.38),rgba(2,3,9,.38))';
          this.appendChild(v);
        }
        var O = this._engine;
        var nativeDriven = false;
        if (this._ready && O && typeof O.setEclipse === 'function' && O.isWebGL !== false) {
          try { O.setEclipse(k, true); nativeDriven = true; } catch (e0) {}
        }
        this._veil.style.opacity = String(k * (nativeDriven ? 0.38 : 0.72));
        if (!nativeDriven && this._ready && O && typeof O.setChapterExposure === 'function' && O.isWebGL !== false) {
          try {
            if (k > 0) { O.setChapterExposure(1.10 * (1 - k * 0.72)); this._exposureDriven = true; }
            else if (this._exposureDriven) { O.setChapterExposure(1.10); this._exposureDriven = false; }
          } catch (e1) {}
        } else if (nativeDriven && this._exposureDriven) {
          try { O.setChapterExposure(1.10); } catch (e2) {}
          this._exposureDriven = false;
        }
      };
      C.prototype.getEclipse = function () {
        var O = this._engine;
        if (this._ready && O && typeof O.getEclipse === 'function' && O.isWebGL !== false) {
          try { return O.getEclipse(); } catch (e) {}
        }
        return this._eclipseK || 0;
      };

      /* ── natal markers — minimal zodiac-ring DOM overlay ──
       * The engine has no natal-marker API (the native eclipse API is separate;
       * no marker support exists). The adapter draws the ring itself. */
      C.prototype.setNatal = function (list) {
        this._natalList = list || null;
        this._renderNatal();
      };
      C.prototype._renderNatal = function () {
        if (!this._natalLayer) {
          var layer = this._natalLayer = document.createElement('div');
          layer.setAttribute('aria-hidden', 'true');
          layer.style.cssText = 'position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity .6s ease';
          this.appendChild(layer);
        }
        var layer = this._natalLayer;
        layer.innerHTML = '';
        var list = this._natalList;
        if (!list || !list.length) return;
        var NS = 'http://www.w3.org/2000/svg';
        var svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('viewBox', '0 0 100 100');
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
        var ring = document.createElementNS(NS, 'ellipse');
        ring.setAttribute('cx', '50'); ring.setAttribute('cy', '50');
        ring.setAttribute('rx', '41'); ring.setAttribute('ry', '18.5');
        ring.setAttribute('fill', 'none');
        ring.setAttribute('stroke', 'rgba(216,180,106,.22)');
        ring.setAttribute('stroke-width', '0.35');
        svg.appendChild(ring);
        list.forEach(function (it) {
          var a = (it.lon || 0) * Math.PI / 180;
          var x = 50 + 41 * Math.cos(a), y = 50 - 18.5 * Math.sin(a);
          var g = document.createElementNS(NS, 'g');
          var t1 = document.createElementNS(NS, 'text');
          t1.setAttribute('x', x.toFixed(2)); t1.setAttribute('y', (y + 1.6).toFixed(2));
          t1.setAttribute('text-anchor', 'middle');
          t1.setAttribute('style', "font:6.4px 'Schibsted Grotesk',Arial,sans-serif;fill:rgba(230,238,255,.95);paint-order:stroke;stroke:rgba(216,180,106,.55);stroke-width:.9px");
          t1.textContent = it.glyph || '';
          var t2 = document.createElementNS(NS, 'text');
          t2.setAttribute('x', x.toFixed(2)); t2.setAttribute('y', (y + 5.4).toFixed(2));
          t2.setAttribute('text-anchor', 'middle');
          t2.setAttribute('style', "font:500 2.5px 'IBM Plex Mono',monospace;letter-spacing:.14em;fill:rgba(216,180,106,.9)");
          t2.textContent = 'YOUR ' + String(it.name || '').toUpperCase();
          g.appendChild(t1); g.appendChild(t2);
          svg.appendChild(g);
        });
        layer.appendChild(svg);
        this._syncNatalVisibility();
      };
      C.prototype._syncNatalVisibility = function () {
        if (!this._natalLayer) return;
        var show = !!(this._natalList && this._natalList.length);
        if (show && this._ready) {
          // legacy zf window: markers only at System/Inner/Oort camera range
          var idx = this._lastScaleIndex;
          if (this._lastLevelName) idx = SCALE_NAMES.indexOf(this._lastLevelName);
          if (idx == null || idx < 0) idx = 2;
          show = idx >= 1 && idx <= 3;
        }
        this._natalLayer.style.opacity = show ? '1' : '0';
      };

      /* ── flight / lookUp / setObserver ── */
      C.prototype.flight = function () {
        var self = this;
        function go() {
          var O = self._engine;
          if (!O) return;
          try {
            var active = typeof O.isJourneyActive === 'function' && O.isJourneyActive();
            if (active && typeof O.cancelScaleJourney === 'function') { O.cancelScaleJourney(true); return; }
            if (typeof O.startScaleJourney === 'function') O.startScaleJourney(6, { fullTour: true, direction: 'out' });
          } catch (e) {}
        }
        if (!this._ready) { this._queue.push(go); return; }
        go();
      };
      C.prototype.setObserver = function (lat, lon) { this._obsLat = lat; this._obsLon = lon; };
      C.prototype.lookUp = function () {
        var self = this;
        if (!this._ready) { this._queue.push(function () { self.lookUp(); }); }
        else this._engineFlyTo('earth');
        this._emitFocus(null, { key: null, name: this._obsLat != null ? 'Your Local Sky' : 'The Night Sky', glyph: '✷' });
      };

      C.prototype.attributeChangedCallback = function (n, o, v) {
        if (o === v) return;
        if (n === 'orbits' && this._ready && this._engine && this._engine.setShowOrbits) {
          try { this._engine.setShowOrbits(v !== 'off'); } catch (e) {}
        }
        // motion="off": engine idle drift is internal and not reachable — the
        // engine's own prefers-reduced-motion path is the honored equivalent.
      };

      return C;
    })();

    customElements.define('void-orrery', VoidOrreryAdapter);
  }

  /* ── go — engine boot is lazy: only when a <void-orrery> actually exists.
   * Pages that load this file only for window.VoidEphem (sky-card, sky-events,
   * natal-plate) never pay for Three.js — same laziness as legacy orrery.js. ── */
  var bootStarted = false;
  function maybeBoot() {
    if (bootStarted) return;
    if (!document.querySelector('void-orrery')) return;
    bootStarted = true;
    if (mo) { try { mo.disconnect(); } catch (e) {} mo = null; }
    if (!selectEnginePath()) return;
    bootPipeline().then(function () {
      defineElement();
      log('engine pipeline up (' + (engineKind || '?') + ') — <void-orrery> registered');
    }).catch(function (err) {
      warn('all modern engines unavailable — falling back to legacy', err);
      loadLegacy('webgl+canvas failed');
    });
  }
  var mo = null;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', maybeBoot);
    if (window.MutationObserver && document.documentElement) {
      mo = new MutationObserver(maybeBoot);
      mo.observe(document.documentElement, { childList: true, subtree: true });
      setTimeout(function () { if (mo) { try { mo.disconnect(); } catch (e) {} mo = null; } }, 60000);
    }
  } else {
    maybeBoot();
  }
})();
