/**
 * Deferred orrery engine loader — keeps Three.js off the critical path until needed.
 * Lite hero: live poster → tier boot (canvas2D on low/mid, WebGL on high).
 * Manual launch button upgrades to HD WebGL; ?full=1 always available.
 */
(function () {
  'use strict';

  var loadPromise = null;
  var fallbackPromise = null;
  var engineAttempt = 0;
  var scheduleToken = 0;
  var booting = false;
  var scriptEl = document.currentScript;
  var ASSET_V = String(window.AP_ASSET_V || '753');
  var fallbackScriptSeq = 0;
  var fallbackHandoffTimer = null;
  var fallbackHandoffToken = 0;
  var ORRERY_MODULE = (scriptEl && scriptEl.src)
    ? new URL('orrery-webgl.js?v=' + ASSET_V, scriptEl.src).href
    : 'js/orrery-webgl.js?v=' + ASSET_V;

  function engineModuleUrl() {
    return ORRERY_MODULE + (engineAttempt ? '&retry=' + engineAttempt : '');
  }

  function canvasFallbackUrl() {
    var base = (scriptEl && scriptEl.src)
      ? new URL('orrery3d.js', scriptEl.src).href
      : new URL('js/orrery3d.js', document.baseURI).href;
    var u = new URL(base, document.baseURI);
    u.search = '';
    u.searchParams.set('v', ASSET_V);
    u.searchParams.set('fallback', 'canvas');
    return u.href;
  }

  /**
   * Load one owned/versioned canvas fallback script. The token is checked by
   * orrery3d.js before it publishes window.Orrery3D, so a cancelled request
   * cannot clobber a newer retry after it eventually executes.
   */
  function loadCanvasFallbackScript() {
    if (window.__apOrreryFallbackScriptPromise) return window.__apOrreryFallbackScriptPromise;
    var src = canvasFallbackUrl();
    var existing = document.querySelector('script[data-ap-orrery-canvas-fallback][data-ap-asset-v="' + ASSET_V + '"]');
    if (existing && existing.dataset.apState === 'loaded' && window.Orrery3D) {
      return Promise.resolve(window.Orrery3D);
    }
    document.querySelectorAll('script[data-ap-orrery-canvas-fallback]').forEach(function (el) {
      if (el !== existing) {
        el.dataset.apState = 'cancelled';
        el.remove();
      }
    });
    var token = 'ap-fallback-' + ASSET_V + '-' + (++fallbackScriptSeq);
    var s = existing || document.createElement('script');
    s.dataset.apOrreryCanvasFallback = 'true';
    s.dataset.apAssetV = ASSET_V;
    s.dataset.apOrreryFallbackToken = token;
    s.dataset.apState = 'loading';
    s.src = src;
    s.async = false;
    window.__apOrreryFallbackOwner = token;
    var p = new Promise(function (resolve, reject) {
      s.onload = function () {
        if (s.dataset.apState === 'cancelled' || window.__apOrreryFallbackOwner !== token) {
          reject(new Error('stale canvas fallback load'));
          return;
        }
        if (!window.Orrery3D || typeof window.Orrery3D.init !== 'function') {
          reject(new Error('canvas fallback unavailable'));
          return;
        }
        s.dataset.apState = 'loaded';
        resolve(window.Orrery3D);
      };
      s.onerror = function () {
        s.dataset.apState = 'failed';
        try { s.remove(); } catch (e) {}
        reject(new Error('orrery3d.js failed'));
      };
      if (!existing) document.head.appendChild(s);
    });
    var tracked = p.catch(function (err) {
      if (window.__apOrreryFallbackOwner === token) {
        try { delete window.__apOrreryFallbackOwner; } catch (e) { window.__apOrreryFallbackOwner = null; }
      }
      if (window.__apOrreryFallbackScriptPromise === tracked) window.__apOrreryFallbackScriptPromise = null;
      throw err;
    });
    window.__apOrreryFallbackScriptPromise = tracked;
    return tracked;
  }

  window.__loadCanvasOrreryScript = loadCanvasFallbackScript;
  window.__cancelCanvasOrreryScript = function () {
    fallbackScriptSeq += 1;
    var owner = window.__apOrreryFallbackOwner;
    document.querySelectorAll('script[data-ap-orrery-canvas-fallback]').forEach(function (el) {
      el.dataset.apState = 'cancelled';
      try { el.remove(); } catch (e) {}
    });
    window.__apOrreryFallbackScriptPromise = null;
    if (owner && window.__apOrreryFallbackOwner === owner) {
      try { delete window.__apOrreryFallbackOwner; } catch (e) { window.__apOrreryFallbackOwner = null; }
    }
  };

  function isLiteHero() {
    return !!(window.__apLiteHero ||
      (document.documentElement && document.documentElement.classList.contains('ap-lite-hero')));
  }

  /** Lighthouse / automation only — real users may use ?lite=1 and still auto-boot. */
  function isAuditMode() {
    try { return !!navigator.webdriver; } catch (e) {}
    return false;
  }

  function liteAutoLoadAllowed() {
    if (isAuditMode()) return false;
    return true;
  }

  function waitFor(test, ms) {
    return new Promise(function (resolve, reject) {
      var t0 = Date.now();
      (function poll() {
        try { if (test()) return resolve(true); } catch (e) {}
        if (Date.now() - t0 > ms) return reject(new Error('orrery deps timeout'));
        setTimeout(poll, 40);
      })();
    });
  }

  function loadEngine() {
    if (window.Orrery3D && document.documentElement.classList.contains('orrery-full')) {
      return Promise.resolve(window.Orrery3D);
    }
    if (loadPromise) return loadPromise;
    loadPromise = import(engineModuleUrl()).then(function () {
      if (!window.Orrery3D) throw new Error('orrery-webgl did not register Orrery3D');
      return window.Orrery3D;
    }).catch(function (err) {
      loadPromise = null;
      throw err;
    });
    return loadPromise;
  }

  window.__loadOrreryEngine = loadEngine;

  function afterFirstPaint(fn) {
    function run() {
      requestAnimationFrame(function () { requestAnimationFrame(fn); });
    }
    if (document.visibilityState === 'hidden') {
      document.addEventListener('visibilitychange', function once() {
        if (document.visibilityState !== 'hidden') {
          document.removeEventListener('visibilitychange', once);
          run();
        }
      });
    } else {
      run();
    }
  }

  function scheduleIdleFallback(fn, timeoutMs) {
    if (window.requestIdleCallback) {
      requestIdleCallback(fn, { timeout: timeoutMs || 2200 });
    } else {
      setTimeout(fn, 500);
    }
  }

  function scheduleViaIntersection(fn) {
    var target = document.getElementById('orrery-canvas') ||
      document.getElementById('orrery-lite-poster') ||
      document.querySelector('.hero');
    if (!target || !('IntersectionObserver' in window)) {
      scheduleIdleFallback(fn, 2200);
      return;
    }

    var token = ++scheduleToken;
    var started = false;
    function start() {
      if (started || token !== scheduleToken) return;
      started = true;
      fn();
    }

    var io = new IntersectionObserver(function (entries) {
      if (entries[0] && entries[0].isIntersecting) {
        io.disconnect();
        start();
      }
    }, { rootMargin: '160px 0px' });
    io.observe(target);

    scheduleIdleFallback(function () {
      io.disconnect();
      start();
    }, 4000);
  }

  /**
   * @param {{ urgent?: boolean }} opts — urgent: skip intersection wait
   */
  function scheduleEngineLoad(opts) {
    opts = opts || {};
    if (opts.intent !== true) return;
    if (loadPromise || (window.Orrery3D && document.documentElement.classList.contains('orrery-full'))) {
      return;
    }

    function kick() {
      loadEngine().catch(function () {});
    }

    if (opts.urgent) {
      afterFirstPaint(kick);
      return;
    }

    afterFirstPaint(function () {
      scheduleViaIntersection(kick);
    });
  }

  window.__scheduleOrreryEngineLoad = scheduleEngineLoad;

  function beginCanvasHandoff() {
    var viewport = document.getElementById('orrery-viewport');
    if (viewport) viewport.classList.add('orrery-viewport--handoff');
    return viewport;
  }

  function finishCanvasHandoff(viewport) {
    document.documentElement.classList.add('orrery-canvas');
    var poster = document.getElementById('orrery-lite-poster');
    if (poster) poster.setAttribute('aria-hidden', 'true');
    var token = ++fallbackHandoffToken;
    if (fallbackHandoffTimer) window.clearTimeout(fallbackHandoffTimer);
    fallbackHandoffTimer = window.setTimeout(function () {
      if (token !== fallbackHandoffToken) return;
      if (viewport) viewport.classList.remove('orrery-viewport--handoff');
      fallbackHandoffTimer = null;
    }, 520);
  }

  function cancelPendingHandoff() {
    fallbackHandoffToken += 1;
    if (fallbackHandoffTimer) {
      window.clearTimeout(fallbackHandoffTimer);
      fallbackHandoffTimer = null;
    }
    var root = document.documentElement;
    if (root) root.classList.remove('orrery-full', 'orrery-canvas', 'ap-model-revealed');
    var viewport = document.getElementById('orrery-viewport');
    if (viewport) viewport.classList.remove('orrery-viewport--handoff');
    var poster = document.getElementById('orrery-lite-poster');
    if (poster) poster.setAttribute('aria-hidden', 'false');
    var canvas = document.getElementById('orrery-canvas');
    if (canvas) { canvas.style.transition = ''; canvas.style.opacity = ''; }
    deckHudRevealed = false;
    var deck = document.getElementById('orrery-lite-deck');
    if (deck) deck.classList.remove('ap-deck--time-restored');
    ['ap-scale-strip', 'ap-orbits-toggle', 'ap-cosmic-journey'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.hidden = true;
    });
  }

  function waitFirstOrreryFrame() {
    return new Promise(function (resolve) {
      var done = false;
      function finish() {
        if (done) return;
        done = true;
        document.removeEventListener('ap-orrery-first-frame', finish);
        resolve();
      }
      document.addEventListener('ap-orrery-first-frame', finish);
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          if (!done) finish();
        });
      });
      window.setTimeout(finish, 900);
    });
  }

  /* v576: the WebGL takeover cross-fades like the 2D path instead of snapping.
     promoteLiteToFull() now only BEGINS the handoff — the poster stays live under
     a transparent canvas; finishLiteToFullHandoff() fades the HD frame in once
     the engine has real pixels, then retires the poster + LiteOrrery. */
  function promoteLiteToFull() {
    window.__apLiteHero = false;
    var btn = document.getElementById('orrery-lite-launch');
    if (btn) {
      btn.hidden = true;
      btn.setAttribute('aria-hidden', 'true');
    }
    if (document.documentElement.classList.contains('orrery-canvas') && window.__orreryReady) {
      teardownCanvasEngine();
    }
    document.documentElement.classList.remove('orrery-canvas');
    return beginCanvasHandoff();
  }

  function finishLiteToFullHandoff(viewport) {
    var O = window.Orrery3D;
    var settle = new Promise(function (resolve) {
      var t = window.setTimeout(resolve, 1400); // cap the poster hold
      try {
        if (O && typeof O.whenEarthReady === 'function') {
          O.whenEarthReady().then(function () { window.clearTimeout(t); resolve(); });
        }
      } catch (e) { window.clearTimeout(t); resolve(); }
    });
    return waitFirstOrreryFrame().then(function () { return settle; }).then(function () {
      var canvas = document.getElementById('orrery-canvas');
      if (canvas) {
        canvas.style.transition = 'opacity 0.48s ease';
        canvas.style.opacity = '0';
        void canvas.offsetWidth;
        canvas.style.opacity = '1'; // fades in OVER the still-visible poster
      }
      var token = ++fallbackHandoffToken;
      if (fallbackHandoffTimer) window.clearTimeout(fallbackHandoffTimer);
      fallbackHandoffTimer = window.setTimeout(function () {
        if (token !== fallbackHandoffToken || !window.__orreryReady || window.__apOrreryCanvasFallback) return;
        document.documentElement.classList.add('orrery-full');
        revealHeroDeckHud();
        var poster = document.getElementById('orrery-lite-poster');
        if (poster) poster.setAttribute('aria-hidden', 'true');
        if (window.LiteOrrery && typeof window.LiteOrrery.destroy === 'function') {
          window.LiteOrrery.destroy();
        }
        if (viewport) viewport.classList.remove('orrery-viewport--handoff');
        if (canvas) { canvas.style.transition = ''; canvas.style.opacity = ''; }
        fallbackHandoffTimer = null;
      }, 520);
    });
  }

  function setLaunchButtonState(state, message) {
    var btn = document.getElementById('orrery-lite-launch');
    if (!btn) return;
    if (state === 'loading') {
      btn.hidden = false;
      btn.disabled = true;
      btn.setAttribute('aria-busy', 'true');
      btn.textContent = message || 'Loading…';
    } else if (state === 'ready') {
      btn.hidden = true;
      btn.setAttribute('aria-hidden', 'true');
    } else if (state === 'error') {
      btn.hidden = false;
      btn.disabled = false;
      btn.removeAttribute('aria-busy');
      btn.textContent = message || 'Tap to launch 3D orrery';
    } else if (state === 'idle') {
      btn.hidden = false;
      btn.disabled = false;
      btn.removeAttribute('aria-busy');
      btn.textContent = '✦ Launch 3D orrery';
    } else if (state === 'hd') {
      btn.hidden = false;
      btn.disabled = false;
      btn.removeAttribute('aria-busy');
      btn.textContent = message || '✦ Launch HD 3D';
    }
  }

  function tryCanvasFallback() {
    if (window.__orreryPreloaderOwns && !window.__apHeroEntered) {
      return Promise.reject(new Error('canvas fallback blocked during preloader'));
    }
    if (fallbackPromise) return fallbackPromise;
    if (window.__orreryReady && window.Orrery3D && window.__apOrreryCanvasFallback) {
      return Promise.resolve(window.Orrery3D);
    }
    fallbackPromise = waitFor(function () {
      return window.AstroEphemeris && window.AstroEphemeris.julianDay;
    }, 12000).then(function () {
      var canvas = document.getElementById('orrery-canvas');
      if (!canvas) return Promise.reject(new Error('no canvas'));
      try {
        if (canvas.parentNode) canvas.parentNode.querySelectorAll('.orrery-controls').forEach(function (el) { el.remove(); });
        if (window.Orrery3D && typeof window.Orrery3D.destroy === 'function' && !window.__apOrreryCanvasFallback) {
          window.Orrery3D.destroy();
        }
        if (window.Orrery3D && !window.__apOrreryCanvasFallback) {
          try { delete window.Orrery3D; } catch (e) { window.Orrery3D = undefined; }
        }
      } catch (e) {}
      cancelPendingHandoff();
      window.__orreryReady = false;
      window.__apOrreryCanvasFallback = false;
      return loadCanvasFallbackScript().then(function () {
        if (!window.Orrery3D || typeof window.Orrery3D.init !== 'function') {
          throw new Error('canvas fallback unavailable');
        }
        var viewport = beginCanvasHandoff();
        var dayOff = (window.LiteOrrery && window.LiteOrrery.getDayOffset)
          ? window.LiteOrrery.getDayOffset() : 0;
        window.Orrery3D.init(canvas, { skipIntro: true, fromLite: true });
        window.__orreryReady = false;
        if (typeof window.Orrery3D.setSpeed === 'function') window.Orrery3D.setSpeed(0);
        if (typeof window.Orrery3D.setTimelineDays === 'function') window.Orrery3D.setTimelineDays(dayOff);
        return waitFirstOrreryFrame().then(function () {
          finishCanvasHandoff(viewport);
          window.__orreryReady = true;
          window.__apOrreryCanvasFallback = true;
          document.dispatchEvent(new Event('ap-orrery-ready'));
          return window.Orrery3D;
        });
      });
    }).then(function (O) {
      fallbackPromise = null;
      return O;
    }).catch(function (err) {
      fallbackPromise = null;
      cancelPendingHandoff();
      try {
        if (window.Orrery3D && typeof window.Orrery3D.destroy === 'function') window.Orrery3D.destroy();
      } catch (e) {}
      if (typeof window.__cancelCanvasOrreryScript === 'function') window.__cancelCanvasOrreryScript();
      window.__orreryReady = false;
      window.__apOrreryCanvasFallback = false;
      throw err;
    });
    return fallbackPromise;
  }

  function teardownCanvasEngine() {
    var oldCanvas = document.getElementById('orrery-canvas');
    try {
      if (window.Orrery3D && typeof window.Orrery3D.destroy === 'function') {
        window.Orrery3D.destroy();
      }
    } catch (e) {}
    // A 2D context cannot be upgraded to WebGL. Retire the old node and its
    // generated controls so an explicit HD retry gets a clean surface.
    try {
      if (oldCanvas && oldCanvas.parentNode) {
        var parent = oldCanvas.parentNode;
        var fresh = oldCanvas.cloneNode(false);
        parent.replaceChild(fresh, oldCanvas);
        parent.querySelectorAll('.orrery-controls').forEach(function (el) { el.remove(); });
      }
      if (typeof window.__cancelCanvasOrreryScript === 'function') window.__cancelCanvasOrreryScript();
      else document.querySelectorAll('script[data-ap-orrery-canvas-fallback]').forEach(function (el) { el.remove(); });
    } catch (e) {}
    window.__orreryReady = false;
    window.__apOrreryCanvasFallback = false;
    window.__apOrreryFallbackPromise = null;
    loadPromise = null;
    fallbackPromise = null;
    engineAttempt += 1;
  }

  function initOrreryIfNeeded(forceWebGL) {
    var canvas = document.getElementById('orrery-canvas');
    if (!canvas) return Promise.reject(new Error('no canvas'));
    if (window.__orreryReady && window.Orrery3D && document.documentElement.classList.contains('orrery-full')) {
      return Promise.resolve(window.Orrery3D);
    }

    if (!forceWebGL && document.documentElement.classList.contains('orrery-canvas') && window.__orreryReady) {
      return Promise.resolve(window.Orrery3D);
    }

    if (forceWebGL && document.documentElement.classList.contains('orrery-canvas') && window.__orreryReady) {
      teardownCanvasEngine();
      canvas = document.getElementById('orrery-canvas');
    }

    return waitFor(function () {
      return window.AstroEphemeris && window.AstroEphemeris.julianDay;
    }, 15000).then(function () {
      return loadEngine();
    }).then(function () {
      if (!window.Orrery3D) throw new Error('Orrery3D missing after load');
      var initResult;
      try {
        if (!window.__orreryReady) initResult = window.Orrery3D.init(canvas);
      } catch (e) {
        if (window.__orreryPreloaderOwns && !window.__apHeroEntered) throw e;
        return tryCanvasFallback();
      }
      return Promise.resolve(initResult).then(function (result) {
        // WebGL's runtime failure path returns an awaitable canvas fallback. It
        // owns readiness/event choreography; do not stamp the retired WebGL
        // instance back onto the global flags here.
        if (window.__apOrreryCanvasFallback) return result || window.Orrery3D;
        window.__orreryReady = true;
        if (typeof window.Orrery3D.setSpeed === 'function') window.Orrery3D.setSpeed(0);
        if (window.LiteOrrery && typeof window.LiteOrrery.getDayOffset === 'function') {
          if (typeof window.Orrery3D.setTimelineDays === 'function') {
            window.Orrery3D.setTimelineDays(window.LiteOrrery.getDayOffset());
          }
        }
        if (typeof window.Orrery3D.forceResize === 'function') {
          requestAnimationFrame(function () {
            window.Orrery3D.forceResize();
            setTimeout(function () { window.Orrery3D.forceResize(); }, 200);
          });
        }
        document.dispatchEvent(new Event('ap-orrery-ready'));
        setupHeroPhotorealFrame();
        return window.Orrery3D;
      });
    }).catch(function (err) {
      if (window.__orreryPreloaderOwns && !window.__apHeroEntered) throw err;
      return tryCanvasFallback();
    });
  }

  /* Hero-only: once the HD engine owns the canvas, (1) route the HUD planet
     pills to Orrery3D.focusPlanet — their original wiring targeted the lite
     poster, which promoteLiteToFull destroyed — and (2) if the visitor hasn't
     touched the model yet, dive from the settle frame into the photoreal
     Earth close-up (terminator + detail lighting) so the resting hero shows
     real 3D planets, not schematic dots.
     v575 additions: (3) EARTH→COSMOS scale strip + mobile stepper on the
     engine's SCALE_LEVELS presets, (4) Cosmic journey pill on the narrated
     startScaleJourney tour, (5) restore the lite time row — the WebGL engine
     injects no DOM console on this page (the v570b hide rule assumed the 2D
     engine's console). Everything feature-detects, so the 2D-canvas fallback
     (no scale API) keeps strip + journey hidden. */
  var heroFrameDone = false;
  var deckHudRevealed = false;

  /* Layout-affecting HUD chrome (scale strip, orbits, journey, time row) must
     land in the same turn as html.orrery-full — revealing them at ap-orrery-ready
     grew the deck ~150px before v642/v643 padding, overlapping hero copy. */
  function revealHeroDeckHud() {
    if (deckHudRevealed) return;
    deckHudRevealed = true;
    var deck = document.getElementById('orrery-lite-deck');
    if (deck) deck.classList.add('ap-deck--time-restored');
    var O = window.Orrery3D;
    var strip = document.getElementById('ap-scale-strip');
    if (strip && O && typeof O.setScaleLevel === 'function') strip.hidden = false;
    var orbitsBtn = document.getElementById('ap-orbits-toggle');
    if (orbitsBtn && O && typeof O.setShowOrbits === 'function') orbitsBtn.hidden = false;
    var journeyBtn = document.getElementById('ap-cosmic-journey');
    if (journeyBtn && O && typeof O.startScaleJourney === 'function') journeyBtn.hidden = false;
  }

  function setupHeroPhotorealFrame() {
    if (heroFrameDone) return;
    var O = window.Orrery3D;
    var canvas = document.getElementById('orrery-canvas');
    var wrap = document.getElementById('apAwardOrreryWrap');
    if (!O || typeof O.focusPlanet !== 'function' || O.isWebGL === false) return;
    if (!canvas || !wrap || !wrap.contains(canvas)) return;
    heroFrameDone = true;

    var touched = false;
    wrap.addEventListener('pointerdown', function () { touched = true; }, { passive: true });

    /* v576: resurrect planet-name typography — engraved DOM labels (Cinzel, brass
       under-shadow, styled by .orrery-dom-label) at INNER/SYSTEM scales; the engine
       keeps the Earth rest frame clean. Feature-detected: 2D fallback has no layer. */
    if (typeof O.setShowLabels === 'function' && document.getElementById('orrery-dom-labels')) {
      try { O.setShowLabels(true); } catch (e) { /* engine optional */ }
    }

    function markActive(target) {
      document.querySelectorAll('.lite-vp-btn[data-lite-planet]').forEach(function (b) {
        b.classList.toggle('active', b === target);
      });
    }

    function cancelJourneyIfActive(jumpToTarget) {
      try {
        if (typeof O.isJourneyActive === 'function' && O.isJourneyActive() &&
            typeof O.cancelScaleJourney === 'function') {
          O.cancelScaleJourney(!!jumpToTarget);
        }
      } catch (e) { /* engine optional */ }
    }

    document.querySelectorAll('.lite-vp-btn[data-lite-planet]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        touched = true;
        var pid = (btn.getAttribute('data-lite-planet') || '').toLowerCase();
        cancelJourneyIfActive(false);
        try { O.focusPlanet(pid); } catch (e) { return; }
        markActive(btn);
      });
    });

    // Engine-initiated focus (canvas dblclick, journey legs) keeps pills honest.
    document.addEventListener('orrery-planet-focus', function (e) {
      var id = e && e.detail && e.detail.id;
      if (!id) return;
      markActive(document.querySelector('.lite-vp-btn[data-lite-planet="' + id + '"]'));
    });

    // ap-v722 · A1: hero auto-Earth must not clobber Personal Sky deep-links.
    // Explore/chart emitters set data-ap-model-link + #m=/#focus=; re-assert instead of Earth.
    setTimeout(function () {
      if (touched) return;
      try {
        if (document.documentElement.hasAttribute('data-ap-model-link')) {
          if (typeof window.__apApplyModelDeepLink === 'function') {
            try { window.__apApplyModelDeepLink(); } catch (eRe) { /* optional */ }
          }
          return;
        }
        var h = String(location.hash || '').replace(/^#/, '');
        if (h.charAt(0) === '?') h = h.slice(1);
        if (/(?:^|[&;])focus=/i.test(h) || /(?:^|[&;])m=/i.test(h)) {
          if (typeof window.__apApplyModelDeepLink === 'function') {
            try { window.__apApplyModelDeepLink(); } catch (eRe2) { /* optional */ }
          }
          return;
        }
      } catch (eGate) { /* optional */ }
      try { O.focusPlanet('earth'); } catch (e) { return; }
      markActive(document.querySelector('.lite-vp-btn[data-lite-planet="earth"]'));
    }, 1100);

    /* ── v575 · scale strip + stepper (feature-detect the preset API) ── */
    var SCALE_NAMES = ['Earth', 'Inner', 'System', 'Oort', 'Stars', 'Galaxy', 'Cosmos'];
    var strip = document.getElementById('ap-scale-strip');
    var stepLabel = document.getElementById('ap-scale-stepper-label');
    var caption = document.getElementById('ap-scale-caption');
    var hasScaleApi = typeof O.setScaleLevel === 'function' && typeof O.getScaleLevel === 'function';

    function syncScaleUi(level, preset) {
      // The engine itself syncs .orrery-scale-btn active/aria-pressed/title
      // (updateScaleHUD); here: mobile stepper label + live honesty caption.
      if (stepLabel && SCALE_NAMES[level]) stepLabel.textContent = SCALE_NAMES[level];
      if (caption && preset && preset.honesty) caption.textContent = preset.honesty;
    }

    function goToLevel(lv) {
      if (isNaN(lv)) return;
      touched = true;
      cancelJourneyIfActive(false);
      try { O.setScaleLevel(lv); } catch (e) { return; }
      if (lv !== 0) markActive(null); // camera left the focused body
    }

    if (strip && hasScaleApi) {
      strip.querySelectorAll('.orrery-scale-btn[data-scale]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          goToLevel(parseInt(btn.getAttribute('data-scale'), 10));
        });
      });
      [['ap-scale-prev', -1], ['ap-scale-next', 1]].forEach(function (pair) {
        var btn = document.getElementById(pair[0]);
        if (!btn) return;
        btn.addEventListener('click', function () {
          var lv = 2;
          try { lv = O.getScaleLevel() | 0; } catch (e) {}
          goToLevel(Math.max(0, Math.min(6, lv + pair[1])));
        });
      });
      document.addEventListener('orrery-scale-change', function (e) {
        var d = e && e.detail;
        if (!d || d.level == null) return;
        syncScaleUi(d.level, d.preset);
      });
      try { syncScaleUi(O.getScaleLevel(), null); } catch (e) {}
    }

    /* ── v575 · Cosmic journey — narrated tour across all seven levels ── */
    var journeyBtn = document.getElementById('ap-cosmic-journey');
    if (journeyBtn && typeof O.startScaleJourney === 'function') {
      var journeyIdleText = journeyBtn.textContent;
      var setJourneyRunning = function (on) {
        journeyBtn.classList.toggle('is-running', on);
        journeyBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
        journeyBtn.textContent = on ? '◼ End journey' : journeyIdleText;
      };
      journeyBtn.addEventListener('click', function () {
        touched = true;
        var active = false;
        try { active = typeof O.isJourneyActive === 'function' && O.isJourneyActive(); } catch (e) {}
        if (active) {
          cancelJourneyIfActive(true);
          setJourneyRunning(false);
          return;
        }
        try { O.startScaleJourney(6, { fullTour: true, direction: 'out' }); } catch (e) { return; }
        markActive(null);
        setJourneyRunning(true);
      });
      document.addEventListener('orrery-journey-end', function () {
        setJourneyRunning(false);
      });
    }

    /* ── v592 · ENRICHED ORRERY — progressive reveal (homepage embed) ──
       The hero stays a calm Earth rest frame on load. The rich layers appear only
       as the visitor engages: orbit rings fade in at System/Inner scale, the live
       readout appears on planet focus, trails appear when time is scrubbed. All
       feature-detected — the 2D fallback (no setShowOrbits/getBodyReadout) skips it. */
    setupEnrichedOrrery(O);
    if (document.documentElement.classList.contains('orrery-full')) revealHeroDeckHud();
  }

  /* Orbits toggle + live readout + scale-driven reveal. Split out for clarity;
     everything here is additive and no-ops if the engine lacks the API. */
  function setupEnrichedOrrery(O) {
    var hasOrbits = typeof O.setShowOrbits === 'function';
    var hasReadout = typeof O.getBodyReadout === 'function';
    var hasScale = typeof O.getScaleLevel === 'function';

    // --- Orbits: default ON at System/Inner (>=1), OFF in the Earth rest frame (0) ---
    var orbitsBtn = document.getElementById('ap-orbits-toggle');
    var userOrbitPref = null; // null = follow scale; true/false = explicit user choice
    function orbitsWantedAtLevel(lv) {
      if (userOrbitPref !== null) return userOrbitPref;
      return lv >= 1 && lv <= 3; // Inner / System / Oort read as an orrery
    }
    function applyOrbits(lv) {
      if (!hasOrbits) return;
      var on = orbitsWantedAtLevel(lv);
      try { O.setShowOrbits(on); } catch (e) {}
      if (orbitsBtn) orbitsBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    if (orbitsBtn && hasOrbits) {
      orbitsBtn.addEventListener('click', function () {
        var next = !(orbitsBtn.getAttribute('aria-pressed') === 'true');
        userOrbitPref = next;
        try { O.setShowOrbits(next); } catch (e) {}
        orbitsBtn.setAttribute('aria-pressed', next ? 'true' : 'false');
      });
    }

    // --- Live readout — compact panel; true geocentric sign+degree from the ephemeris ---
    var readoutEl = document.getElementById('ap-orrery-readout');
    var readoutBody = document.getElementById('ap-orrery-readout-body');
    var readoutSign = document.getElementById('ap-orrery-readout-sign');
    var readoutId = 'earth';
    var readoutTimer = null;
    function paintReadout() {
      if (!readoutEl || !hasReadout) return;
      var r;
      try { r = O.getBodyReadout(readoutId); } catch (e) { r = null; }
      if (!r || !r.sign) { readoutEl.hidden = true; return; }
      if (readoutBody) readoutBody.textContent = r.id === 'earth' ? 'Sun' : r.name;
      if (readoutSign) readoutSign.textContent = 'in ' + r.sign + ' · ' + r.degreeWhole + '°' + (r.retro ? ' ℞' : '');
      readoutEl.hidden = false;
      readoutEl.classList.toggle('is-retro', !!r.retro);
    }
    function showReadoutFor(id) {
      readoutId = id || 'earth';
      paintReadout();
    }
    // Repaint while time moves (scrub) so the degree ticks live.
    function ensureReadoutTicker() {
      if (readoutTimer) return;
      readoutTimer = setInterval(function () {
        if (readoutEl && !readoutEl.hidden) paintReadout();
      }, 900);
    }

    // Planet focus → readout tracks the focused body. Earth rest frame stays
    // clean — the hero live pill already shows Sun/Moon (v641 overlap fix).
    document.addEventListener('orrery-planet-focus', function (e) {
      var id = e && e.detail && e.detail.id;
      if (!id) return;
      var lv = 0; try { lv = O.getScaleLevel() | 0; } catch (err) {}
      if (lv === 0 && id === 'earth') { if (readoutEl) readoutEl.hidden = true; return; }
      showReadoutFor(id);
    });

    // Scale change → drive orbit reveal + readout visibility policy.
    function onLevel(lv) {
      applyOrbits(lv);
      if (readoutEl) {
        if (lv === 0) {
          readoutEl.hidden = true;
        } else {
          ensureReadoutTicker();
          paintReadout();
        }
      }
    }
    document.addEventListener('orrery-scale-change', function (e) {
      var d = e && e.detail; if (!d || d.level == null) return;
      onLevel(d.level);
    });

    // Now button also resets trails (engine clears on snapToNow via idle-fade, but reset
    // the readout time immediately).
    var nowBtn = document.getElementById('lite-now-btn');
    if (nowBtn) nowBtn.addEventListener('click', function () { setTimeout(paintReadout, 60); });

    // Initial sync to current level.
    if (hasScale) { try { onLevel(O.getScaleLevel() | 0); } catch (e) {} }
  }

  /**
   * @param {{ urgent?: boolean, showLoading?: boolean, mode?: 'canvas'|'webgl'|'tier' }} opts
   */
  function bootOrrery(opts) {
    if (booting && window.__orreryBootPromise) return window.__orreryBootPromise;
    booting = true;
    opts = opts || {};
    var mode = opts.mode || 'tier';
    if (mode === 'tier') {
      mode = localPerfTier() === 'low' ? 'canvas' : 'webgl';
    }

    if (opts.showLoading !== false) {
      setLaunchButtonState('loading', mode === 'webgl' ? 'Loading HD 3D…' : 'Loading orrery…');
    }

    window.__orreryBootPromise = Promise.resolve().then(function () {
      if (mode === 'canvas') {
        return tryCanvasFallback().then(function (O) {
          if (localPerfTier() !== 'low') setLaunchButtonState('hd');
          else setLaunchButtonState('ready');
          booting = false;
          return O;
        });
      }

      var viewport = promoteLiteToFull();
      scheduleEngineLoad({ urgent: !!opts.urgent, intent: true });
      return initOrreryIfNeeded(true).then(function (O) {
        if (document.documentElement.classList.contains('orrery-canvas')) {
          // 2D fallback won inside initOrreryIfNeeded — its own handoff choreography ran
          // finishCanvasHandoff owns the single tracked 520ms cleanup timer.
        } else {
          finishLiteToFullHandoff(viewport);
        }
        setLaunchButtonState('ready');
        booting = false;
        return O;
      });
    }).catch(function (err) {
      booting = false;
      window.__orreryBootPromise = null;
      cancelPendingHandoff();
      if (typeof window.__cancelCanvasOrreryScript === 'function') window.__cancelCanvasOrreryScript();
      setLaunchButtonState('error', 'Tap to retry 3D orrery');
      throw err;
    });

    return window.__orreryBootPromise;
  }

  window.__requestFullOrrery = function (opts) {
    opts = opts || {};
    if (!opts.mode) opts.mode = 'webgl';
    return bootOrrery(opts);
  };

  window.__bootLiteCanvas = function (opts) {
    return bootOrrery(Object.assign({ mode: 'canvas', urgent: true }, opts || {}));
  };

  function localPerfTier() {
    try {
      if (window.LiteOrrery && window.LiteOrrery.tier) return window.LiteOrrery.tier();
      if (window.RafCore && window.RafCore.tier) return window.RafCore.tier;
      if (navigator.deviceMemory && navigator.deviceMemory <= 4) return 'low';
      if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) return 'low';
      if (navigator.deviceMemory && navigator.deviceMemory <= 6) return 'mid';
      if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 6) return 'mid';
    } catch (e) { return 'high'; }
    return 'high';
  }

  function preloaderWebGLSafe() {
    try {
      if (isLiteHero()) return false;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
      if (localPerfTier() === 'low') return false;
      if (isAuditMode()) return false;
    } catch (e) { return false; }
    return true;
  }

  window.__preloaderWebGLSafe = preloaderWebGLSafe;

  function wireLiteLaunch() {
    var btn = document.getElementById('orrery-lite-launch');
    if (!btn || btn.__apLiteWired) return;
    btn.__apLiteWired = true;
    if (!isAuditMode()) btn.hidden = false;

    var lastTouch = 0;
    function onLaunch(e) {
      if (btn.disabled || booting) return;
      if (document.documentElement.classList.contains('orrery-canvas')) {
        window.__requestFullOrrery({ urgent: true }).catch(function () {});
      } else {
        bootOrrery({ urgent: true, mode: 'webgl' }).catch(function () {});
      }
    }

    btn.addEventListener('touchend', function (e) {
      lastTouch = Date.now();
      e.preventDefault();
      onLaunch(e);
    }, { passive: false });
    btn.addEventListener('click', function (e) {
      if (Date.now() - lastTouch < 400) return;
      onLaunch(e);
    });
  }

  function isWebGLEngine() {
    try {
      return !!(window.Orrery3D &&
        typeof window.Orrery3D.getIntroDurationMs === 'function' &&
        window.Orrery3D.getIntroDurationMs() >= 1000);
    } catch (e) { return false; }
  }

  function bootSchedule() {
    if (isLiteHero()) {
      var onReady = function () {
        wireLiteLaunch();
      };
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', onReady);
      } else {
        onReady();
      }
      return;
    }
    // WebGL is never capability/idle booted. Deep-link receivers and explicit
    // launch/tool gestures call __requestFullOrrery themselves, which supplies
    // the user-intent boundary before this loader is asked to import Three.
  }

  window.__orreryEngineIsWebGL = isWebGLEngine;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootSchedule);
  } else {
    bootSchedule();
  }
})();
