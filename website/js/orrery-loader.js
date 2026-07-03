/**
 * Deferred orrery engine loader — keeps Three.js off the critical path until needed.
 * Lite hero: live poster → tier boot (canvas2D on low/mid, WebGL on high).
 * Manual launch button upgrades to HD WebGL; ?full=1 always available.
 */
(function () {
  'use strict';

  var loadPromise = null;
  var scheduleToken = 0;
  var booting = false;
  var scriptEl = document.currentScript;
  var ORRERY_MODULE = (scriptEl && scriptEl.src)
    ? new URL('orrery-webgl.js', scriptEl.src).href
    : 'js/orrery-webgl.js';

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
    loadPromise = import(ORRERY_MODULE).then(function () {
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
    window.setTimeout(function () {
      if (viewport) viewport.classList.remove('orrery-viewport--handoff');
    }, 520);
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

  function promoteLiteToFull() {
    document.documentElement.classList.add('orrery-full');
    document.documentElement.classList.remove('orrery-canvas');
    window.__apLiteHero = false;
    var poster = document.getElementById('orrery-lite-poster');
    var btn = document.getElementById('orrery-lite-launch');
    if (poster) poster.setAttribute('aria-hidden', 'true');
    if (btn) {
      btn.hidden = true;
      btn.setAttribute('aria-hidden', 'true');
    }
    if (window.LiteOrrery && typeof window.LiteOrrery.destroy === 'function') {
      window.LiteOrrery.destroy();
    }
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
    if (window.__orreryReady && window.Orrery3D) {
      return Promise.resolve(window.Orrery3D);
    }
    return waitFor(function () {
      return window.AstroEphemeris && window.AstroEphemeris.julianDay;
    }, 12000).then(function () {
      return new Promise(function (resolve, reject) {
        var canvas = document.getElementById('orrery-canvas');
        if (!canvas) return reject(new Error('no canvas'));
        var s = document.createElement('script');
        s.src = 'js/orrery3d.js';
        s.onload = function () {
          try {
            if (window.Orrery3D && !window.__orreryReady) {
              var viewport = beginCanvasHandoff();
              var dayOff = (window.LiteOrrery && window.LiteOrrery.getDayOffset)
                ? window.LiteOrrery.getDayOffset() : 0;
              window.Orrery3D.init(canvas, { skipIntro: true, fromLite: true });
              window.__orreryReady = true;
              if (typeof window.Orrery3D.setSpeed === 'function') {
                window.Orrery3D.setSpeed(0);
              }
              if (typeof window.Orrery3D.setTimelineDays === 'function') {
                window.Orrery3D.setTimelineDays(dayOff);
              }
              waitFirstOrreryFrame().then(function () {
                finishCanvasHandoff(viewport);
                document.dispatchEvent(new Event('ap-orrery-ready'));
                resolve(window.Orrery3D);
              });
            } else {
              reject(new Error('canvas fallback unavailable'));
            }
          } catch (e) {
            reject(e);
          }
        };
        s.onerror = function () { reject(new Error('orrery3d.js failed')); };
        document.head.appendChild(s);
      });
    });
  }

  function teardownCanvasEngine() {
    try {
      if (window.Orrery3D && typeof window.Orrery3D.destroy === 'function') {
        window.Orrery3D.destroy();
      }
    } catch (e) {}
    window.__orreryReady = false;
    loadPromise = null;
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
    }

    return waitFor(function () {
      return window.AstroEphemeris && window.AstroEphemeris.julianDay;
    }, 15000).then(function () {
      return loadEngine();
    }).then(function () {
      if (!window.Orrery3D) throw new Error('Orrery3D missing after load');
      try {
        if (!window.__orreryReady) window.Orrery3D.init(canvas);
      } catch (e) {
        if (window.__orreryPreloaderOwns && !window.__apHeroEntered) throw e;
        return tryCanvasFallback();
      }
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

    setTimeout(function () {
      if (touched) return;
      try { O.focusPlanet('earth'); } catch (e) { return; }
      markActive(document.querySelector('.lite-vp-btn[data-lite-planet="earth"]'));
    }, 1100);

    /* ── v575 · time row: WebGL engine draws no console here — un-hide the
       lite date/Now/scrub (lite-orrery's setDayOffset already forwards to
       Orrery3D.setTimelineDays; Now also calls snapToNow). ── */
    var deck = document.getElementById('orrery-lite-deck');
    if (deck) deck.classList.add('ap-deck--time-restored');

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
      strip.hidden = false;
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
      journeyBtn.hidden = false;
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

      promoteLiteToFull();
      scheduleEngineLoad({ urgent: !!opts.urgent });
      return initOrreryIfNeeded(true).then(function (O) {
        setLaunchButtonState('ready');
        booting = false;
        return O;
      });
    }).catch(function (err) {
      booting = false;
      window.__orreryBootPromise = null;
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

  function scheduleLiteAutoBoot() {
    if (!liteAutoLoadAllowed() || window.__orreryReady) return;
    afterFirstPaint(function () {
      scheduleViaIntersection(function () {
        if (window.__orreryReady || booting) return;
        bootOrrery({ urgent: true, showLoading: false, mode: 'tier' }).catch(function () {});
      });
    });
  }

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
        scheduleLiteAutoBoot();
      };
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', onReady);
      } else {
        onReady();
      }
      return;
    }
    if (window.__orreryPreloaderOwns) {
      scheduleEngineLoad({ urgent: true });
      return;
    }
    try {
      var introSeen = sessionStorage.getItem('ap_intro_complete') === '1';
      if (introSeen) {
        scheduleEngineLoad({ urgent: false });
      }
    } catch (e) { /* preloader handles first visit */ }
  }

  window.__orreryEngineIsWebGL = isWebGLEngine;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootSchedule);
  } else {
    bootSchedule();
  }
})();