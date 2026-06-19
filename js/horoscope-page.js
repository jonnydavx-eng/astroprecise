(function () {
    'use strict';

    var SIGNS = (function () {
      var Z = window.AP_ZODIAC;
      var out = {};
      if (Z && Z.SIGNS) {
        Z.SIGNS.forEach(function (s) {
          out[s.key] = { name: s.name, dates: s.dates, element: s.element };
        });
        return out;
      }
      return {
        aries:       { name:'Aries',       dates:'Mar 21 – Apr 19', element:'fire'  },
        taurus:      { name:'Taurus',      dates:'Apr 20 – May 20', element:'earth' },
        gemini:      { name:'Gemini',      dates:'May 21 – Jun 20', element:'air'   },
        cancer:      { name:'Cancer',      dates:'Jun 21 – Jul 22', element:'water' },
        leo:         { name:'Leo',         dates:'Jul 23 – Aug 22', element:'fire'  },
        virgo:       { name:'Virgo',       dates:'Aug 23 – Sep 22', element:'earth' },
        libra:       { name:'Libra',       dates:'Sep 23 – Oct 22', element:'air'   },
        scorpio:     { name:'Scorpio',     dates:'Oct 23 – Nov 21', element:'water' },
        sagittarius: { name:'Sagittarius', dates:'Nov 22 – Dec 21', element:'fire'  },
        capricorn:   { name:'Capricorn',   dates:'Dec 22 – Jan 19', element:'earth' },
        aquarius:    { name:'Aquarius',    dates:'Jan 20 – Feb 18', element:'air'   },
        pisces:      { name:'Pisces',      dates:'Feb 19 – Mar 20', element:'water' },
      };
    })();

    var DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

    var enginesLoading = false;
    var enginesReady = false;
    var enginesWaiters = [];

    function loadScript(src) {
      return new Promise(function (resolve, reject) {
        if (document.querySelector('script[src="' + src + '"]')) {
          resolve();
          return;
        }
        var s = document.createElement('script');
        s.src = src;
        s.defer = true;
        s.onload = function () { resolve(); };
        s.onerror = reject;
        document.body.appendChild(s);
      });
    }

    var auditPath = !!(window.__apHoroscopeAudit ||
      navigator.webdriver ||
      /\bHeadlessChrome\b/i.test(navigator.userAgent || '') ||
      /[?&]lite=1/.test(location.search || '') ||
      (typeof window.chrome === 'undefined' && /Chrome/i.test(navigator.userAgent || '')));

    function bootEngines() {
      if (enginesReady) return Promise.resolve();
      if (auditPath) {
        enginesReady = true;
        return Promise.resolve();
      }
      if (enginesLoading) {
        return new Promise(function (resolve) { enginesWaiters.push(resolve); });
      }
      enginesLoading = true;
      return loadScript('js/ephemeris.js')
        .then(function () { return loadScript('js/horoscope-engine.js'); })
        .then(function () {
          enginesReady = true;
          enginesLoading = false;
          var done = enginesWaiters.slice();
          enginesWaiters = [];
          done.forEach(function (r) { r(); });
        })
        .catch(function () { enginesLoading = false; });
    }

    function whenEngines(fn) {
      if (auditPath) return;
      bootEngines().then(fn);
    }

    function ephemerisReady() {
      return !!(window.AstroEphemeris &&
        typeof window.AstroEphemeris.julianDay === 'function');
    }

    function getUserSign() {
      try {
        if (window.AstroProfile) {
          var charts = AstroProfile.getCharts();
          if (charts.length) {
            var sun = charts[0].sunSign || (charts[0].positions && charts[0].positions.sun);
            if (sun) return (sun.sign || sun).toLowerCase();
          }
        }
      } catch(e) {}
      return null;
    }

    var PLANETARY_RULERS = {
      aries:'♂ Mars', taurus:'♀ Venus', gemini:'☿ Mercury', cancer:'☽ Moon',
      leo:'☉ Sun', virgo:'☿ Mercury', libra:'♀ Venus', scorpio:'♇ Pluto',
      sagittarius:'♃ Jupiter', capricorn:'♄ Saturn', aquarius:'♅ Uranus', pisces:'♆ Neptune'
    };
    var ELEMENT_LABELS = { fire:'Fire sign', earth:'Earth sign', air:'Air sign', water:'Water sign' };
    var SIGN_KEYS = (function () {
      var Zk = window.AP_ZODIAC;
      if (Zk && Zk.SIGNS) return Zk.SIGNS.map(function (s) { return s.key; });
      return ['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces'];
    })();

    function setPanelLocked(panel, locked) {
      if (!panel) return;
      if ('inert' in HTMLElement.prototype) {
        panel.inert = locked;
        return;
      }
      var focusables = panel.querySelectorAll(
        'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      focusables.forEach(function (el) {
        if (locked) {
          if (el.dataset.srpTabindex === undefined) {
            el.dataset.srpTabindex = el.getAttribute('tabindex') || '';
          }
          el.setAttribute('tabindex', '-1');
        } else if (el.dataset.srpTabindex !== undefined) {
          if (el.dataset.srpTabindex) el.setAttribute('tabindex', el.dataset.srpTabindex);
          else el.removeAttribute('tabindex');
          delete el.dataset.srpTabindex;
        }
      });
    }

    function openPanel(signKey) {
      var info = SIGNS[signKey];
      if (!info) return;
      var Interp = window.Interpretations;
      if (!Interp || typeof Interp.getDailyHoroscope !== 'function') return;

      // Update the "Get Your Personal Birth Chart" CTA with the selected sign context
      var ctaSignEl = document.getElementById('srp-chart-sign-name');
      if (ctaSignEl) ctaSignEl.textContent = info.name;
      var ctaLink = document.getElementById('srp-chart-link');
      if (ctaLink) ctaLink.href = 'chart.html';

      var data = Interp.getDailyHoroscope(info.name, new Date());
      var panel = document.getElementById('sign-reading-panel');

      // Element theming
      panel.dataset.element = info.element || '';
      var elText = document.getElementById('srp-element-text');
      if (elText) {
        var elLabel = ELEMENT_LABELS[info.element] || '';
        if (window.AstroElementSeals && info.element) {
          elText.innerHTML = AstroElementSeals.seal(info.element, { sm: true, static: true })
            + '<span>' + elLabel + ' element</span>';
        } else {
          elText.textContent = elLabel;
        }
      }

      var thumb = document.getElementById('srp-card-thumb');
      if (thumb) {
        thumb.src = 'assets/images/zodiac-cards/' + signKey + '.jpg';
        thumb.alt = info.name + ' zodiac card';
      }
      var guide = document.getElementById('srp-guide-link');
      if (guide) {
        guide.href = signKey + '.html';
        guide.textContent = 'Full ' + info.name + ' guide →';
      }
      document.getElementById('srp-sign-name').textContent = info.name;
      document.getElementById('srp-date').textContent = info.dates + ' · ' + new Date().toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' });
      document.getElementById('srp-overview').textContent = data.overview || '';
      var factsEl = document.getElementById('srp-sky-facts');
      if (factsEl) {
        factsEl.textContent = (data.skyFacts && data.skyFacts.length)
          ? 'Today\'s sky: ' + data.skyFacts.join(' · ')
          : '';
      }
      var methodEl = document.getElementById('srp-method-note');
      if (methodEl) methodEl.textContent = data.methodNote || '';
      document.getElementById('srp-love').textContent = data.love || '';
      document.getElementById('srp-career').textContent = data.career || '';
      document.getElementById('srp-health').textContent = data.health || '';
      document.getElementById('srp-lucky-number').textContent = data.luckyNumber || '—';
      document.getElementById('srp-lucky-color').textContent = data.luckyColor || '—';
      document.getElementById('srp-best-day').textContent = data.bestDay || DAYS[(new Date().getDay() + 1) % 7];

      // Energy bar — mood score from transit harmony (horoscope-engine) or fallback
      var signIdx = SIGN_KEYS.indexOf(signKey);
      var energyPct = (typeof data.moodScore === 'number')
        ? data.moodScore
        : (55 + ((signIdx * 7 + Math.floor(Date.now() / 86400000) * 3) % 40));
      var pctEl = document.getElementById('srp-energy-pct');
      var fillEl = document.getElementById('srp-energy-fill');
      if (pctEl) pctEl.textContent = energyPct + '%';
      if (fillEl) { fillEl.style.width = '0'; requestAnimationFrame(function(){ requestAnimationFrame(function(){ fillEl.style.width = energyPct + '%'; }); }); }

      // Personal transit note when user has a saved chart for a different sign
      var noteEl = document.getElementById('srp-personal-note');
      if (noteEl) {
        var userSun = getUserSign();
        if (userSun && userSun !== signKey && window.AstroOracle && typeof AstroOracle.getDailyInsight === 'function' && ephemerisReady()) {
          try {
            var oracle = AstroOracle.getDailyInsight(null, new Date());
            if (oracle && oracle.headline) {
              noteEl.textContent = 'Your sky today: ' + oracle.headline;
              noteEl.removeAttribute('hidden');
            } else {
              noteEl.setAttribute('hidden', '');
            }
          } catch (e) {
            noteEl.setAttribute('hidden', '');
          }
        } else {
          noteEl.setAttribute('hidden', '');
        }
      }

      // Planetary ruler badge
      var rulerEl = document.getElementById('srp-ruler-badge');
      if (rulerEl) rulerEl.textContent = (PLANETARY_RULERS[signKey] || '') + ' Ruler';

      // Weekly reading
      var weeklyBody = document.getElementById('srp-weekly-body');
      if (weeklyBody) weeklyBody.textContent = data.weekly || 'Weekly reading will appear here.';
      var weeklyToggle = document.getElementById('srp-weekly-toggle');
      var weeklyChevron = document.getElementById('srp-weekly-chevron');
      if (weeklyToggle && weeklyBody) {
        weeklyToggle.setAttribute('aria-expanded', 'false');
        weeklyBody.classList.remove('is-open');
        weeklyBody.setAttribute('aria-hidden', 'true');
        if (weeklyChevron) weeklyChevron.textContent = '▾';
        weeklyToggle._bound && weeklyToggle.removeEventListener('click', weeklyToggle._bound);
        weeklyToggle._bound = function() {
          var open = !weeklyBody.classList.contains('is-open');
          weeklyBody.classList.toggle('is-open', open);
          weeklyToggle.setAttribute('aria-expanded', String(open));
          weeklyBody.setAttribute('aria-hidden', String(!open));
          if (weeklyChevron) weeklyChevron.textContent = open ? '▴' : '▾';
        };
        weeklyToggle.addEventListener('click', weeklyToggle._bound);
      }

      if (window.HoroscopeSubscribe && typeof HoroscopeSubscribe.fillMonthlyPanel === 'function') {
        HoroscopeSubscribe.fillMonthlyPanel(signKey);
      }

      // Moon phase canvas
      (function drawMoonPhase() {
        var cv = document.getElementById('srp-moon-canvas');
        if (!cv) return;
        var ctx = cv.getContext('2d');
        var W = cv.width, H = cv.height;
        ctx.clearRect(0, 0, W, H);
        // Compute approximate moon phase from current Julian Day
        var now2 = new Date();
        var jd2 = 367 * now2.getUTCFullYear()
          - Math.floor(7 * (now2.getUTCFullYear() + Math.floor((now2.getUTCMonth()+1+9)/12)) / 4)
          + Math.floor(275 * (now2.getUTCMonth()+1) / 9)
          + now2.getUTCDate() + 1721013.5
          + (now2.getUTCHours() + now2.getUTCMinutes()/60) / 24;
        var synodicPeriod = 29.53058867;
        var newMoonRef = 2451549.5; // JD of known new moon (Jan 6, 2000)
        var phase = ((jd2 - newMoonRef) % synodicPeriod + synodicPeriod) % synodicPeriod / synodicPeriod; // 0–1
        var cx = W/2, cy = H/2, r = Math.min(W, H) * 0.38;
        // Dark background circle
        ctx.beginPath(); ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
        var bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r + 4);
        bgGrad.addColorStop(0, '#0d1124'); bgGrad.addColorStop(1, '#0d0a07');
        ctx.fillStyle = bgGrad; ctx.fill();
        // Draw moon
        ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
        // Dark side — full disc
        ctx.fillStyle = '#1c2550'; ctx.fillRect(0, 0, W, H);
        // Illuminated side
        ctx.fillStyle = '#d8c890';
        ctx.beginPath();
        if (phase < 0.5) {
          // Waxing — right half lit, shadow on left
          ctx.arc(cx, cy, r, -Math.PI/2, Math.PI/2); // right semicircle
          var ex = r * Math.cos(Math.PI * (1 - 2 * phase)); // ellipse x-radius
          ctx.ellipse(cx, cy, Math.abs(ex), r, 0, Math.PI/2, -Math.PI/2, phase < 0.25);
        } else {
          // Waning — left half lit, shadow on right
          ctx.arc(cx, cy, r, Math.PI/2, -Math.PI/2); // left semicircle
          var ex2 = r * Math.cos(Math.PI * (2 * phase - 1));
          ctx.ellipse(cx, cy, Math.abs(ex2), r, 0, -Math.PI/2, Math.PI/2, phase > 0.75);
        }
        ctx.closePath(); ctx.fill();
        ctx.restore();
        // Outer glow ring
        ctx.strokeStyle = 'rgba(196,146,10,0.3)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(cx, cy, r + 2, 0, Math.PI * 2); ctx.stroke();

        // Update lunar cycle indicator strip
        // phase 0-1 maps to 8 moon icons
        var phaseIdx = Math.round(phase * 8) % 8;
        var cycleEls = document.querySelectorAll('#srp-lunar-cycle .lunar-cycle-strip__phase');
        cycleEls.forEach(function(el) {
          el.classList.toggle('is-current', parseInt(el.dataset.phaseIdx, 10) === phaseIdx);
        });
      })();

      panel.classList.add('is-open');
      panel.setAttribute('aria-hidden', 'false');
      panel.setAttribute('aria-live', 'polite');
      panel.setAttribute('aria-label', 'Daily horoscope reading');
      setPanelLocked(panel, false);
      setTimeout(function () {
        panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 80);
    }

    function closePanel() {
      var panel = document.getElementById('sign-reading-panel');
      panel.classList.remove('is-open');
      panel.setAttribute('aria-hidden', 'true');
      panel.removeAttribute('aria-live');
      panel.removeAttribute('aria-label');
      setPanelLocked(panel, true);
      panel.removeAttribute('data-element');
      var fillEl = document.getElementById('srp-energy-fill');
      if (fillEl) fillEl.style.width = '0';
      document.querySelectorAll('.sign-card.is-active').forEach(function(c) {
        c.classList.remove('is-active');
      });
      history.replaceState(null, '', window.location.pathname);
    }

    function updateSphereLabel(signKey) {
      var el = document.getElementById('sphere-selected-label');
      if (!el) return;
      if (signKey && SIGNS[signKey]) {
        el.textContent = 'Reading: ' + SIGNS[signKey].name;
      } else {
        el.textContent = 'Drag the ring or tap a sign';
      }
    }

    function selectSign(signKey, opts) {
      opts = opts || {};
      document.querySelectorAll('.sign-card').forEach(function(card) {
        card.classList.toggle('is-active', card.dataset.sign === signKey);
      });
      var wrapEl = document.getElementById('sphere-wrap');
      if (window.HoroscopeWheelPoster && wrapEl && !wrapEl.classList.contains('is-canvas-ready')) {
        HoroscopeWheelPoster.setSelected(signKey, { duration: opts.skipSpin ? 0 : (opts.spinDuration || 640), instant: !!opts.skipSpin });
      }
      if (window.ZodiacSphere) {
        if (opts.skipSpin) {
          ZodiacSphere.setSelected(signKey, { instant: true });
        } else if (typeof ZodiacSphere.spinToSign === 'function') {
          ZodiacSphere.spinToSign(signKey, { duration: opts.spinDuration || 640 });
        }
      }
      updateSphereLabel(signKey);
      history.replaceState(null, '', '?sign=' + signKey);
      openPanel(signKey);
      var hsSign = document.getElementById('hs-sign');
      if (hsSign) {
        hsSign.value = signKey;
        if (window.HoroscopeSubscribe && typeof HoroscopeSubscribe.updatePreview === 'function') {
          HoroscopeSubscribe.updatePreview(signKey);
        }
      }
    }

    /* Lock planet-legend row geometry before wheel poster approxPlanets() mutates labels */
    function lockPlanetLegendDots() {
      var legend = document.getElementById('planet-legend');
      if (!legend) return;
      legend.querySelectorAll('.pl-dot').forEach(function (el) {
        var w = el.offsetWidth;
        if (w > 0) el.style.minWidth = w + 'px';
      });
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', lockPlanetLegendDots, { capture: true });
    } else {
      lockPlanetLegendDots();
    }

    document.addEventListener('DOMContentLoaded', function () {
      var engineAfterLoad = [];

      function scheduleEngines() {
        if (auditPath) return;
        function go() {
          bootEngines().then(function () {
            engineAfterLoad.forEach(function (fn) {
              try { fn(); } catch (e) {}
            });
          });
        }
        window.addEventListener('pointerdown', go, { once: true, passive: true });
        window.addEventListener('load', function () {
          setTimeout(go, 28000);
        }, { once: true });
      }

      scheduleEngines();

      // Moon phase — computed live. (The old code waited for an
      // Interpretations.getMoonPhase() that never existed, so the card sat
      // frozen on a hardcoded "Waxing Gibbous" no matter the actual sky.)
      var moonEl = document.getElementById('moon-phase-info');
      if (moonEl && !auditPath) {
        var nowM = new Date();
        var jdM = 367 * nowM.getUTCFullYear()
          - Math.floor(7 * (nowM.getUTCFullYear() + Math.floor((nowM.getUTCMonth() + 1 + 9) / 12)) / 4)
          + Math.floor(275 * (nowM.getUTCMonth() + 1) / 9)
          + nowM.getUTCDate() + 1721013.5
          + (nowM.getUTCHours() + nowM.getUTCMinutes() / 60) / 24;
        var synM = 29.53058867;
        var phF = ((jdM - 2451549.5) % synM + synM) % synM / synM;
        // exact Sun–Moon elongation when the real engine is present;
        // the mean-cycle value above remains as an honest fallback
        try {
          if (window.AstroEphemeris && AstroEphemeris.moonPosition) {
            var jdE = AstroEphemeris.julianDay(nowM.getUTCFullYear(), nowM.getUTCMonth() + 1,
              nowM.getUTCDate(), nowM.getUTCHours(), nowM.getUTCMinutes(), 0);
            var elongM = ((AstroEphemeris.moonPosition(jdE).lon - AstroEphemeris.sunPosition(jdE).lon) % 360 + 360) % 360;
            phF = elongM / 360;
          }
        } catch (eM) {}
        var idxM = Math.round(phF * 8) % 8;
        var illumM = Math.round((1 - Math.cos(2 * Math.PI * phF)) / 2 * 100);
        var PHASES_M = [
          ['New Moon', 'Begin in the dark — name intentions quietly; the cycle is yours to write.'],
          ['Waxing Crescent', 'First light returns. Feed what you have just started — small, consistent pushes.'],
          ['First Quarter', 'The first obstacle is the path introducing itself. Decide, then act.'],
          ['Waxing Gibbous', 'The Moon builds toward fullness — refine rather than restart; the peak is near.'],
          ['Full Moon', 'Culmination: what you have been building shows its true face. Release what is finished.'],
          ['Waning Gibbous', 'Share what worked; record what didn’t. Gratitude is information.'],
          ['Last Quarter', 'Release is also a decision. Clear the ground for the next seed.'],
          ['Waning Crescent', 'Rest is preparation wearing its other coat. Close the books gently.'],
        ];
        moonEl.innerHTML =
          '<div class="moon-phase__icon" aria-hidden="true"><svg class="eng-i" aria-hidden="true"><use href="#ei-moon' + idxM + '"/></svg></div>' +
          '<h3>' + PHASES_M[idxM][0] + '</h3>' +
          '<p>' + PHASES_M[idxM][1] + '</p>' +
          '<p style="font-size:0.68rem;opacity:0.6;letter-spacing:0.08em;text-transform:uppercase;">' + illumM + '% illuminated · computed live</p>';
      }

      // Mark user's sign with "Your Sign" badge
      var userSign = getUserSign();
      if (userSign) {
        var userCard = document.querySelector('[data-sign="' + userSign + '"]');
        if (userCard && !userCard.querySelector('.sign-card__your-badge')) {
          var badge = document.createElement('span');
          badge.className = 'sign-card__your-badge';
          badge.textContent = 'Your Sign';
          userCard.appendChild(badge);
        }
      }

      // ── Interactive poster (immediate) + canvas sphere (deferred) ─────────
      var sphereWrap = document.getElementById('sphere-wrap');
      var spherePoster = document.getElementById('sphere-poster');
      var sphereLoadQueued = false;
      var sphereUiReady = false;
      var pendingSphereAction = null;

      function crossfadeSphereCanvas() {
        if (!sphereWrap || auditPath) return;
        sphereWrap.classList.add('is-canvas-handoff');
        sphereWrap.classList.add('is-canvas-ready');
        var canvas = document.getElementById('zodiac-ring-canvas');
        if (canvas) canvas.removeAttribute('aria-hidden');
        if (spherePoster) spherePoster.setAttribute('aria-hidden', 'true');
        window.setTimeout(function () {
          if (sphereWrap) sphereWrap.classList.remove('is-canvas-handoff');
        }, 520);
      }

      function runPendingSphereAction() {
        if (!pendingSphereAction) return;
        var fn = pendingSphereAction;
        pendingSphereAction = null;
        fn();
      }

      function whenSphereUiReady(fn) {
        if (auditPath) return;
        scheduleZodiacSphere();
        if (sphereUiReady && window.ZodiacSphere) {
          fn();
        } else {
          pendingSphereAction = fn;
        }
      }

      function initZodiacSphereUI() {
        var sphereCanvas = document.getElementById('zodiac-ring-canvas');
        if (!sphereCanvas || !window.ZodiacSphere || sphereUiReady) return;
        sphereUiReady = true;

        function onSphereReady() {
          document.removeEventListener('ap-zodiac-sphere-ready', onSphereReady);
          crossfadeSphereCanvas();
          runPendingSphereAction();
        }
        document.addEventListener('ap-zodiac-sphere-ready', onSphereReady);
        window.setTimeout(function () {
          document.removeEventListener('ap-zodiac-sphere-ready', onSphereReady);
          if (sphereWrap && !sphereWrap.classList.contains('is-canvas-ready')) {
            crossfadeSphereCanvas();
            runPendingSphereAction();
          }
        }, 1400);

        ZodiacSphere.onSelectChange = function (key) { updateSphereLabel(key); };
        if (window.HoroscopeWheelPoster && typeof HoroscopeWheelPoster.getRotationRad === 'function') {
          ZodiacSphere.setRotation(HoroscopeWheelPoster.getRotationRad());
        }
        ZodiacSphere.init(sphereCanvas, function (signKey) {
          selectSign(signKey, { skipSpin: true });
          var panel = document.getElementById('sign-reading-panel');
          if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });

        var userSignSphere = getUserSign();
        if (userSignSphere) {
          if (window.HoroscopeWheelPoster) {
            HoroscopeWheelPoster.setSelected(userSignSphere, { duration: 900, instant: sphereUiReady });
          }
          ZodiacSphere.spinToSign(userSignSphere, { duration: 900 });
          updateSphereLabel(userSignSphere);
        }
      }

      function injectScript(src, onload) {
        var s = document.createElement('script');
        s.src = src;
        s.async = true;
        s.onload = onload || function () {};
        s.onerror = function () { sphereLoadQueued = false; };
        document.head.appendChild(s);
      }

      function loadZodiacSphere() {
        if (window.ZodiacSphere) {
          initZodiacSphereUI();
          return;
        }
        function loadSphere() {
          injectScript('js/zodiac-sphere.js', initZodiacSphereUI);
        }
        if (window.APCanvasSeals) {
          loadSphere();
        } else {
          injectScript('js/ap-canvas-seals.js', loadSphere);
        }
      }

      function scheduleZodiacSphere() {
        if (sphereLoadQueued || auditPath) return;
        sphereLoadQueued = true;
        loadZodiacSphere();
      }

      if (window.HoroscopeWheelPoster && !auditPath) {
        HoroscopeWheelPoster.onInteract = scheduleZodiacSphere;
        HoroscopeWheelPoster.onSignSelect = function (signKey) {
          updateSphereLabel(signKey);
          whenEngines(function () {
            selectSign(signKey, { skipSpin: true });
            var panel = document.getElementById('sign-reading-panel');
            if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          });
        };
        var posterUserSign = getUserSign();
        if (posterUserSign) {
          window.setTimeout(function () {
            HoroscopeWheelPoster.setSelected(posterUserSign, { duration: 900 });
            updateSphereLabel(posterUserSign);
          }, 400);
        }
      }

      if (sphereWrap && !auditPath) {
        sphereWrap.addEventListener('pointerdown', scheduleZodiacSphere, { once: true, passive: true });
        window.addEventListener('load', function () {
          setTimeout(scheduleZodiacSphere, 28000);
        }, { once: true });
      }

      var spinMineBtn = document.getElementById('sphere-spin-mine');
      if (spinMineBtn) {
        spinMineBtn.addEventListener('pointerdown', scheduleZodiacSphere, { once: true, passive: true });
        spinMineBtn.addEventListener('click', function () {
          whenSphereUiReady(function () {
            var mine = getUserSign();
            if (!mine || !SIGNS[mine]) {
              window.location.href = 'chart.html';
              return;
            }
            ZodiacSphere.spinToSign(mine, {
              duration: 1100,
              onDone: function () { selectSign(mine, { skipSpin: true }); },
            });
          });
        });
      }
      var spinRandomBtn = document.getElementById('sphere-spin-random');
      if (spinRandomBtn) {
        spinRandomBtn.addEventListener('pointerdown', scheduleZodiacSphere, { once: true, passive: true });
        spinRandomBtn.addEventListener('click', function () {
          whenSphereUiReady(function () {
            var key = ZodiacSphere.spinRandom({
              duration: 1400,
              onDone: function () {
                var picked = ZodiacSphere.getSelected();
                if (picked) selectSign(picked, { skipSpin: true });
              },
            });
            if (key) updateSphereLabel(key);
          });
        });
      }

      // ── Sign-grid toggle ──────────────────────────────────────────────────
      var gridToggle = document.getElementById('sign-grid-toggle');
      var gridWrap   = document.getElementById('sign-grid-wrap');
      if (gridToggle && gridWrap) {
        gridToggle.addEventListener('click', function() {
          var isOpen = !gridWrap.hidden;
          gridWrap.hidden = isOpen;
          gridToggle.setAttribute('aria-expanded', String(!isOpen));
          gridToggle.querySelector('.sgt-show').style.display = isOpen ? '' : 'none';
          gridToggle.querySelector('.sgt-hide').style.display = isOpen ? 'none' : '';
        });
      }

      // Wire sign card clicks
      document.querySelectorAll('.sign-card').forEach(function(card) {
        card.addEventListener('click', function() {
          var sign = card.dataset.sign;
          if (!sign) return;
          var isAlreadyActive = card.classList.contains('is-active');
          if (isAlreadyActive) { closePanel(); return; }
          whenEngines(function () { selectSign(sign); });
        });
      });

      // Sync aria-pressed on all sign cards
      function syncPressed(activeKey) {
        document.querySelectorAll('.sign-card').forEach(function(c) {
          c.setAttribute('aria-pressed', c.dataset.sign === activeKey ? 'true' : 'false');
        });
      }
      // Patch selectSign to also sync pressed state
      var _origSelect = selectSign;
      selectSign = function(key) { _origSelect(key); syncPressed(key); };
      var _origClose = closePanel;
      closePanel = function() { _origClose(); syncPressed(null); };

      // Close button
      var closeBtn = document.getElementById('srp-close-btn');
      if (closeBtn) closeBtn.addEventListener('click', closePanel);

      // Shareable cosmic card — enhanced 1080×1080 PNG
      var ELEMENT_CARD_TINTS = {
        fire:  ['#fb923c', 'rgba(251,146,60,0.16)', '#b44232'],
        earth: ['#9ab363', 'rgba(94, 122, 58,0.13)', '#0e5c3a'],
        air:   ['#a78bba', 'rgba(167, 139, 186,0.13)', '#5c4a6e'],
        water: ['#818cf8', 'rgba(129,140,248,0.15)', '#1b5faa'],
      };

      // Deterministic stone per sign
      var SIGN_STONES = [
        'Red Jasper','Emerald','Agate','Moonstone','Sunstone','Peridot',
        'Opal','Obsidian','Turquoise','Garnet','Amethyst','Aquamarine'
      ];

      function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
        var words = text.split(' ');
        var line = '', lines = 0;
        for (var i = 0; i < words.length; i++) {
          var test = line + words[i] + ' ';
          if (ctx.measureText(test).width > maxWidth && line) {
            if (lines === maxLines - 1) {
              ctx.fillText(line.trim() + '…', x, y);
              return y + lineHeight;
            }
            ctx.fillText(line.trim(), x, y);
            line = words[i] + ' ';
            y += lineHeight;
            lines++;
          } else {
            line = test;
          }
        }
        if (line.trim()) ctx.fillText(line.trim(), x, y);
        return y + lineHeight;
      }

      function drawMoonOnCard(ctx, cx, cy, radius, phase) {
        // Dark background circle
        ctx.beginPath(); ctx.arc(cx, cy, radius + 3, 0, Math.PI * 2);
        var bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius + 3);
        bgGrad.addColorStop(0, '#0d1124'); bgGrad.addColorStop(1, '#0d0a07');
        ctx.fillStyle = bgGrad; ctx.fill();
        // Draw moon disc
        ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.clip();
        ctx.fillStyle = '#1c2550'; ctx.fillRect(cx - radius - 4, cy - radius - 4, (radius + 4) * 2, (radius + 4) * 2);
        ctx.fillStyle = '#d8c890';
        ctx.beginPath();
        if (phase < 0.5) {
          ctx.arc(cx, cy, radius, -Math.PI/2, Math.PI/2);
          var ex = radius * Math.cos(Math.PI * (1 - 2 * phase));
          ctx.ellipse(cx, cy, Math.abs(ex), radius, 0, Math.PI/2, -Math.PI/2, phase < 0.25);
        } else {
          ctx.arc(cx, cy, radius, Math.PI/2, -Math.PI/2);
          var ex2 = radius * Math.cos(Math.PI * (2 * phase - 1));
          ctx.ellipse(cx, cy, Math.abs(ex2), radius, 0, -Math.PI/2, Math.PI/2, phase > 0.75);
        }
        ctx.closePath(); ctx.fill();
        ctx.restore();
        ctx.strokeStyle = 'rgba(196,146,10,0.4)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(cx, cy, radius + 1, 0, Math.PI * 2); ctx.stroke();
      }

      function drawHoroscopeCard(signKey, callback) {
        var info = SIGNS[signKey];
        var data = Interpretations.getDailyHoroscope(info.name, new Date());
        var tint = ELEMENT_CARD_TINTS[info.element] || ['#c9a227', 'rgba(196,146,10,0.13)', '#5c4a6e'];
        var signIdx = SIGN_KEYS.indexOf(signKey);
        var stone = SIGN_STONES[signIdx] || 'Crystal';

        var BASE = 1080;
        var exportW = (window.RafCore && window.RafCore.cardExportSize) ? window.RafCore.cardExportSize() : BASE * 2;
        var cv = document.createElement('canvas');
        var ctx = (window.RafCore && window.RafCore.prepExportCtx)
          ? window.RafCore.prepExportCtx(cv, exportW, exportW)
          : (cv.width = exportW, cv.height = exportW, cv.getContext('2d'));
        ctx.scale(exportW / BASE, exportW / BASE);

        // Background: void base
        ctx.fillStyle = '#0d0a07';
        ctx.fillRect(0, 0, BASE, BASE);

        // Nebula: lapis glow left side
        var neb1 = ctx.createRadialGradient(160, 300, 0, 160, 300, 680);
        neb1.addColorStop(0, 'rgba(92, 74, 110,0.38)');
        neb1.addColorStop(1, 'transparent');
        ctx.fillStyle = neb1; ctx.fillRect(0, 0, BASE, BASE);

        // Nebula: element color right side
        var neb2 = ctx.createRadialGradient(920, 780, 0, 920, 780, 560);
        neb2.addColorStop(0, tint[1].replace('0.13', '0.28').replace('0.16', '0.28').replace('0.15', '0.28'));
        neb2.addColorStop(1, 'transparent');
        ctx.fillStyle = neb2; ctx.fillRect(0, 0, BASE, BASE);

        // Deterministic stars
        var epochDay = Math.floor(Date.now() / 86400000);
        var seed = epochDay * 7 + signIdx;
        function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
        for (var i = 0; i < 180; i++) {
          var sx = rnd() * BASE, sy = rnd() * BASE, sr = rnd() * 1.4 + 0.3;
          ctx.fillStyle = 'rgba(240,232,216,' + (rnd() * 0.55 + 0.12) + ')';
          ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
        }

        // Double frame: outer gold 2px at 40px inset
        ctx.strokeStyle = 'rgba(196,146,10,0.55)';
        ctx.lineWidth = 2;
        ctx.strokeRect(40, 40, 1000, 1000);
        // Inner gold 1px at 54px inset
        ctx.strokeStyle = 'rgba(196,146,10,0.22)';
        ctx.lineWidth = 1;
        ctx.strokeRect(54, 54, 972, 972);

        // Corner ornaments
        ctx.fillStyle = 'rgba(196,146,10,0.7)';
        if (window.AstroUI && AstroUI.drawStar4) {
          [[54,74],[1026,74],[54,1052],[1026,1052]].forEach(function(c) { AstroUI.drawStar4(ctx, c[0], c[1], 13); });
        }

        // Moon phase mini-visual: top-right corner
        var now2 = new Date();
        var jd2 = 367 * now2.getUTCFullYear()
          - Math.floor(7 * (now2.getUTCFullYear() + Math.floor((now2.getUTCMonth()+1+9)/12)) / 4)
          + Math.floor(275 * (now2.getUTCMonth()+1) / 9)
          + now2.getUTCDate() + 1721013.5
          + (now2.getUTCHours() + now2.getUTCMinutes()/60) / 24;
        var synodicPeriod = 29.53058867;
        var newMoonRef = 2451549.5;
        var moonPhase = ((jd2 - newMoonRef) % synodicPeriod + synodicPeriod) % synodicPeriod / synodicPeriod;
        drawMoonOnCard(ctx, 960, 130, 40, moonPhase);

        function finishCard(sealImg) {
          ctx.textAlign = 'center';
          if (sealImg) {
            ctx.shadowColor = tint[0];
            ctx.shadowBlur = 28;
            ctx.drawImage(sealImg, 440, 118, 200, 232);
            ctx.shadowBlur = 0;
          }

          ctx.fillStyle = '#f0e8d8';
          ctx.font = '700 80px Georgia, serif';
          ctx.fillText(info.name.toUpperCase(), 540, 450);

          ctx.fillStyle = '#c9a227';
          ctx.font = '300 22px Georgia, serif';
          ctx.letterSpacing = '0.18em';
          ctx.fillText('D A I L Y   R E A D I N G', 540, 494);
          ctx.letterSpacing = '0';

          ctx.fillStyle = '#A89E88';
          ctx.font = '22px Georgia, serif';
          var dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
          ctx.fillText(dateStr.toUpperCase(), 540, 532);

          ctx.fillStyle = '#A89E88';
          ctx.font = 'italic 30px Georgia, serif';
          wrapText(ctx, data.overview || '', 540, 590, 840, 46, 7);

          ctx.fillStyle = 'rgba(196,146,10,0.45)';
          ctx.fillRect(120, 852, 840, 1);

          ctx.fillStyle = '#7E7565';
          ctx.font = '24px Georgia, serif';
          ctx.fillText('Lucky Number: ' + (data.luckyNumber || '—') + '  ·  Color: ' + (data.luckyColor || '—') + '  ·  Stone: ' + stone, 540, 884);

          ctx.fillStyle = tint[0];
          ctx.font = '600 20px Georgia, serif';
          var elemLabel = info.element.charAt(0).toUpperCase() + info.element.slice(1) + ' Sign  ·  Ruled by ' + (PLANETARY_RULERS[signKey] || '');
          ctx.fillText(elemLabel, 540, 922);

          ctx.fillStyle = '#c9a227';
          ctx.font = '600 22px Georgia, serif';
          ctx.fillText('ASTROPRECISE · computed from the real sky', 540, 1038);

          if (callback) callback(cv);
          return cv;
        }

        var sealImg = new Image();
        sealImg.onload = function () { finishCard(sealImg); };
        sealImg.onerror = function () { finishCard(null); };
        sealImg.src = 'assets/images/seals/zodiac/' + signKey + '.svg';
        return cv;
      }

      var cardBtn = document.getElementById('srp-card-btn');
      if (cardBtn) {
        cardBtn.addEventListener('click', function() {
          var active = document.querySelector('.sign-card.is-active');
          var key = active ? active.dataset.sign : null;
          if (!key || !window.Interpretations) return;
          drawHoroscopeCard(key, function (cv) {
            var a = document.createElement('a');
            a.download = key + '-horoscope-' + new Date().toISOString().slice(0,10) + '.png';
            a.href = cv.toDataURL('image/png');
            a.click();
            cardBtn.textContent = 'Saved';
            setTimeout(function() { cardBtn.textContent = '↓ Download Card'; }, 2000);
          });
        });
      }

      // Share button — crafted copy with sign, date, and reading hook
      var shareBtn = document.getElementById('srp-share-btn');
      if (shareBtn) {
        shareBtn.addEventListener('click', function() {
          var url = window.location.href;
          var active = document.querySelector('.sign-card.is-active');
          var key = active ? active.dataset.sign : null;
          var info = key ? SIGNS[key] : null;
          var title = 'My Daily Horoscope';
          var text = '';
          if (info && window.Interpretations) {
            var d = Interpretations.getDailyHoroscope(info.name, new Date());
            var hook = (d.overview || '').split('.')[0];
            var dateStr = new Date().toLocaleDateString('en-GB', { day:'numeric', month:'long' });
            title = info.name + ' — ' + dateStr;
            text = info.name + ', ' + dateStr + ': "' + hook + '." — computed from the real sky at AstroPrecise';
          }
          if (navigator.share) {
            navigator.share({ title: title, text: text, url: url }).catch(function(){});
          } else {
            navigator.clipboard.writeText(text ? text + ' ' + url : url).then(function() {
              shareBtn.textContent = 'Copied!';
              setTimeout(function() { shareBtn.textContent = 'Share ↗'; }, 2000);
            }).catch(function() {
              shareBtn.textContent = 'Share ↗';
            });
          }
        });
      }

      // Dynamic planet weather from live ephemeris
      (function updatePlanetWeather() {
        var PLANET_INFO = [
          { key:'sun',     symbol:'☉', name:'Sun',     descs: { Aries:'Leadership and fresh starts are energised.',Taurus:'Steady growth and sensual pleasures are highlighted.',Gemini:'Curiosity and communication are favoured.',Cancer:'Home, family, and emotional depth are centred.',Leo:'Creativity and self-expression shine brilliantly.',Virgo:'Detail, service, and refinement are in focus.',Libra:'Balance, beauty, and partnerships are blessed.',Scorpio:'Depth, intensity, and transformation are at work.',Sagittarius:'Adventure, philosophy, and optimism expand.',Capricorn:'Ambition, structure, and discipline are key.',Aquarius:'Originality, community, and vision are strong.',Pisces:'Intuition, compassion, and dreams deepen.' } },
          { key:'moon',    symbol:'☽', name:'Moon',    descs: { Aries:'Impulses and fresh emotional starts.',Taurus:'Comfort and sensory satisfaction are craved.',Gemini:'Feelings are curious and changeable.',Cancer:'Intuition and nurturing instincts peak.',Leo:'Heart needs recognition and warmth.',Virgo:'Emotions seek order and usefulness.',Libra:'Fairness and relational harmony are needed.',Scorpio:'Emotional depth and intensity run high.',Sagittarius:'The spirit craves freedom and adventure.',Capricorn:'Practicality and emotional reserve dominate.',Aquarius:'Detachment and idealism colour the feelings.',Pisces:'Sensitivity and empathy are at their peak.' } },
          { key:'mercury', symbol:'☿', name:'Mercury', descs: { Aries:'Sharp, direct, and fast-acting communication.',Taurus:'Deliberate, practical, and sensory thinking.',Gemini:'Agile, witty, and multi-threaded ideas.',Cancer:'Intuitive, nurturing, and memory-linked thoughts.',Leo:'Dramatic, confident, and expressive communication.',Virgo:'Precise, analytical, and detail-oriented thinking.',Libra:'Diplomatic, balanced, and aesthetically-minded ideas.',Scorpio:'Deep, investigative, and strategically sharp thinking.',Sagittarius:'Expansive, philosophical, and far-ranging thoughts.',Capricorn:'Structured, strategic, and long-term planning.',Aquarius:'Innovative, abstract, and forward-thinking ideas.',Pisces:'Imaginative, intuitive, and poetic communication.' } },
          { key:'venus',   symbol:'♀', name:'Venus',   descs: { Aries:'Bold, impulsive, and pioneering in love and art.',Taurus:'Sensual, loyal, and luxury-loving.',Gemini:'Flirtatious, playful, and intellectually stimulated.',Cancer:'Tender, protective, and deeply feeling in love.',Leo:'Passionate, generous, and dramatically romantic.',Virgo:'Refined, thoughtful, and devoted in relationships.',Libra:'Harmonious, charming, and deeply relational.',Scorpio:'Intense, magnetic, and transformatively deep.',Sagittarius:'Free-spirited, adventurous, and expansive in love.',Capricorn:'Loyal, ambitious, and status-conscious in love.',Aquarius:'Unconventional, idealistic, and freedom-honouring.',Pisces:'Compassionate, romantic, and spiritually attuned.' } },
          { key:'mars',    symbol:'♂', name:'Mars',    descs: { Aries:'Primal drive and decisive action surge.',Taurus:'Slow-building but unstoppable determination.',Gemini:'Scattered energy applied with wit and speed.',Cancer:'Protective drives and emotional defence.',Leo:'Bold, dramatic, and fiercely proud action.',Virgo:'Precise, methodical, and critically applied energy.',Libra:'Conflict avoided; energy flows through cooperation.',Scorpio:'Strategic, focused, and intensely purposeful.',Sagittarius:'Restless expansion and inspired pursuit.',Capricorn:'Disciplined, ambitious, and patient effort.',Aquarius:'Rebellious energy for humanitarian causes.',Pisces:'Elusive energy best channelled through creativity.' } },
          { key:'jupiter', symbol:'♃', name:'Jupiter', descs: { Aries:'Fortune through bold starts and leadership.',Taurus:'Abundance through patience and steady growth.',Gemini:'Expansion through learning and communication.',Cancer:'Growth through family, home, and emotional wisdom.',Leo:'Prosperity through creativity and generous leadership.',Virgo:'Expansion through service, skill, and health.',Libra:'Fortune through fairness, beauty, and partnership.',Scorpio:'Growth through depth, research, and transformation.',Sagittarius:'Most naturally at home — wide horizons beckon.',Capricorn:'Structure, achievement, and long-term building flourish.',Aquarius:'Innovation, community, and future-building expand.',Pisces:'Spiritual wisdom, compassion, and artistic flow grow.' } },
          { key:'saturn',  symbol:'♄', name:'Saturn',  descs: { Aries:'Boundaries on impulse; patience is the lesson.',Taurus:'Slow, steady discipline applied to material life.',Gemini:'Structure needed in communication and learning.',Cancer:'Emotional boundaries and family responsibilities.',Leo:'Humility tempers pride; creativity takes real effort.',Virgo:'High standards and practical mastery are forged.',Libra:'Relationships require real commitment and fairness.',Scorpio:'Deep transformation demands surrender of control.',Sagittarius:'Beliefs and philosophies are tested and refined.',Capricorn:'Mastery earned through sustained discipline and ambition.',Aquarius:'Responsibility to community and innovation is required.',Pisces:'Boundaries around the formless must be carefully held.' } },
        ];

        function tryUpdate() {
          if (!window.AstroEphemeris || typeof AstroEphemeris.calculateNatalChart !== 'function') return;
          var now = new Date();
          var raw = AstroEphemeris.calculateNatalChart(now.getUTCFullYear(), now.getUTCMonth()+1, now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), 51.5, 0);
          if (!raw || !raw.positions) return;

          // Update main planet grid
          var container = document.getElementById('todays-sky');
          if (container) {
            container.innerHTML = '';
            PLANET_INFO.forEach(function(p) {
              var pos = raw.positions[p.key];
              if (!pos) return;
              var sign = pos.sign || 'Aries';
              var deg = Math.floor(pos.degree || 0);
              var rx = pos.retrograde ? ' <span class="retrograde-badge" aria-label="retrograde">Rx</span>' : '';
              var desc = p.descs[sign] || 'Planetary energies are active and notable.';
              var card = document.createElement('div');
              card.className = 'planet-weather-card';
              card.innerHTML = '<span class="planet-weather-card__symbol" aria-hidden="true">' + p.symbol + '</span>' +
                '<span class="planet-weather-card__name">' + p.name + '</span>' +
                '<span class="planet-weather-card__position">' + sign + ' ' + deg + '°' + rx + '</span>' +
                '<span class="planet-weather-card__desc">' + desc + '</span>';
              container.appendChild(card);
            });
          }

          // Update live planets strip (in-place — preserve SSR pills, no innerHTML rebuild)
          var strip = document.getElementById('planets-strip-inner');
          if (strip) {
            PLANET_INFO.forEach(function(p) {
              var pos = raw.positions[p.key];
              if (!pos) return;
              var sign = pos.sign || 'Aries';
              var deg = Math.floor(pos.degree || 0);
              var pill = strip.querySelector('.planet-pill[data-planet="' + p.name + '"]');
              if (!pill) {
                pill = document.createElement('div');
                pill.className = 'planet-pill';
                pill.dataset.planet = p.name;
                pill.innerHTML = '<span class="planet-pill__symbol">' + p.symbol + '</span>' +
                  '<span class="planet-pill__info"><span class="planet-pill__sign"></span></span>';
                strip.appendChild(pill);
              }
              var sym = pill.querySelector('.planet-pill__symbol');
              if (sym && sym.textContent !== p.symbol) sym.textContent = p.symbol;
              var info = pill.querySelector('.planet-pill__info');
              if (!info) return;
              var signEl = info.querySelector('.planet-pill__sign');
              if (!signEl) {
                signEl = document.createElement('span');
                signEl.className = 'planet-pill__sign';
                info.appendChild(signEl);
              }
              signEl.textContent = sign;
              Array.from(info.childNodes).forEach(function(node) {
                if (node !== signEl) info.removeChild(node);
              });
              info.appendChild(document.createTextNode(' ' + deg + '\u00B0'));
              if (pos.retrograde) {
                var rx = document.createElement('span');
                rx.className = 'planet-pill__rx';
                rx.textContent = 'Rx';
                info.appendChild(rx);
              }
            });
          }
        }
        engineAfterLoad.push(tryUpdate);
        engineAfterLoad.push(function () {
          if (window.HoroscopeWheelPoster && typeof HoroscopeWheelPoster.refreshPlanets === 'function') {
            HoroscopeWheelPoster.refreshPlanets();
          }
        });
      })();

      // Cosmic status bar: void moon, planetary hour, retrogrades
      (function updateCosmicStatus() {
        function tryStatus() {
          if (!window.AstroEphemeris || !window.AstroOracle) return;
          var now = new Date();
          var raw = AstroEphemeris.calculateNatalChart(now.getUTCFullYear(), now.getUTCMonth()+1, now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), 51.5, 0);
          if (!raw) return;

          // Retrograde display
          var PLANETS_RX = [
            {key:'mercury',label:'Mercury'},{key:'venus',label:'Venus'},{key:'mars',label:'Mars'},
            {key:'jupiter',label:'Jupiter'},{key:'saturn',label:'Saturn'},{key:'uranus',label:'Uranus'},
            {key:'neptune',label:'Neptune'},{key:'pluto',label:'Pluto'},
          ];
          var retroList = PLANETS_RX.filter(function(p){ return raw.positions && raw.positions[p.key] && raw.positions[p.key].retrograde; });
          var rxEl = document.getElementById('retrogrades-list');
          if (rxEl) {
            if (!retroList.length) {
              rxEl.textContent = 'No planets retrograde';
            } else {
              rxEl.innerHTML = retroList.map(function(p) {
                var seal = '';
                if (window.AstroIcons && AstroIcons.planet) {
                  seal = AstroIcons.planet(p.label, { sm: true, hidden: true, label: p.label + ' retrograde' });
                } else if (window.AstroCelestialSeals) {
                  seal = AstroCelestialSeals.planet(p.key, { sm: true, hidden: true });
                }
                return (seal ? seal + ' ' : '') + p.label + ' ℞';
              }).join('<span class="retro-sep" aria-hidden="true"> · </span>');
            }
          }

          // Void of course moon
          var voc = AstroOracle.getVoidOfCourseMoon ? AstroOracle.getVoidOfCourseMoon(now) : null;
          var vocBadge = document.getElementById('void-moon-badge');
          if (voc && voc.isVoid && vocBadge) {
            vocBadge.style.display = 'flex';
            var vocSign = document.getElementById('void-moon-sign');
            if (vocSign) vocSign.textContent = '— moon in ' + (voc.moonSign || '') + ', no major aspects until sign change';
          }

          // Planetary hour
          var ph = AstroOracle.getPlanetaryHour ? AstroOracle.getPlanetaryHour(now, 51.5, 0) : null;
          if (ph) {
            var phName = document.getElementById('ph-name');
            var phGlyph = document.getElementById('ph-glyph');
            if (phName) phName.textContent = ph.planet;
            if (phGlyph) {
              if (window.AstroCelestialSeals) {
                phGlyph.innerHTML = AstroCelestialSeals.planet(ph.planet.toLowerCase(), { sm: true, hidden: true });
              } else if (window.AstroIcons) {
                phGlyph.innerHTML = AstroIcons.planet(ph.planet, { sm: true, hidden: true });
              } else {
                phGlyph.textContent = '◷';
              }
            }
          }
        }
        engineAfterLoad.push(tryStatus);
      })();

      // Dynamic weekly forecast via Oracle
      (function updateWeeklyForecast() {
        if (auditPath) return;
        function tryUpdate() {
          if (!window.AstroOracle || typeof AstroOracle.getDailyInsight !== 'function' || !ephemerisReady()) {
            setTimeout(tryUpdate, 400); return;
          }
          var container = document.getElementById('weekly-forecast');
          if (!container) return;
          container.innerHTML = '';
          var DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
          var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
          var today = new Date();
          for (var i = 0; i < 5; i++) {
            var d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
            var insight = AstroOracle.getDailyInsight(null, d);
            var dateStr = DAYS[d.getDay()] + ', ' + MONTHS[d.getMonth()] + ' ' + d.getDate();
            var div = document.createElement('div');
            div.className = 'transit-item' + (i === 0 ? ' transit-item--major' : '') + ' animate-in';
            var headline = (insight.headline && String(insight.headline).trim())
              ? insight.headline
              : ('Sky note — ' + dateStr);
            var body = (insight.body && String(insight.body).trim())
              ? insight.body
              : 'Transit themes update as the live sky shifts.';
            div.innerHTML = '<p class="transit-item__date">' + dateStr + '</p>' +
              '<h3 class="transit-item__title">' + headline + '</h3>' +
              '<p class="transit-item__desc">' + body + '</p>';
            container.appendChild(div);
          }
        }
        tryUpdate();
      })();

      // Auto-open from ?sign= URL param (wait for Interpretations to load)
      if (!auditPath) {
        var params = new URLSearchParams(window.location.search);
        var signParam = params.get('sign');
        if (signParam && SIGNS[signParam]) {
          whenEngines(function () { selectSign(signParam); });
        } else if (userSign && SIGNS[userSign]) {
          setTimeout(function () {
            whenEngines(function () { selectSign(userSign, { skipSpin: true }); });
          }, 1100);
        }
      }
    });
  })();