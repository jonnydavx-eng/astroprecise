(function () {
    'use strict';
    var AV = String(window.AP_ASSET_V || '835');

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

    var enginesLoading = false;
    var enginesReady = false;
    var enginesWaiters = [];

    // The sign whose reading is currently open. Set by openPanel(), cleared by
    // closePanel(). Share/Download read this instead of querying the DOM for
    // `.sign-card.is-active`, which can be null or inside a display:none wrapper.
    var currentOpenSign = null;

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

    var interpPromise = null;
    function ensureInterpretations() {
      if (window.Interpretations && typeof Interpretations.getDailyHoroscope === 'function') {
        return Promise.resolve();
      }
      if (interpPromise) return interpPromise;
      interpPromise = loadScript('js/sign-daily.js').catch(function () {
        return loadScript('js/ap-load-interpretations.js').then(function () {
          if (typeof window.loadInterpretations === 'function') {
            return window.loadInterpretations();
          }
        });
      });
      return interpPromise;
    }

    function userHasSavedChart() {
      try {
        return !!(window.AstroProfile && typeof AstroProfile.getCharts === 'function' && AstroProfile.getCharts().length);
      } catch (e) { return false; }
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

    function getActiveSavedChart() {
      if (!window.AstroProfile) return null;
      if (typeof AstroProfile.getActiveChart === 'function') return AstroProfile.getActiveChart();
      var charts = AstroProfile.getCharts();
      if (!charts.length) return null;
      try {
        var activeId = localStorage.getItem('ap_active_chart');
        if (activeId) {
          var hit = charts.filter(function (x) { return String(x.id) === String(activeId); })[0];
          if (hit) return hit;
        }
      } catch (e) {}
      return charts[0];
    }

    function getUserSign() {
      try {
        var c = getActiveSavedChart();
        if (c) {
          var sun = c.sunSign || (c.positions && c.positions.sun);
          if (sun) return (sun.sign || sun).toLowerCase();
        }
      } catch(e) {}
      return null;
    }

    function getUserNatalMarkers() {
      try {
        if (!window.AstroProfile || typeof AstroProfile.getCharts !== 'function') {
          return { markers: [], sunSign: null };
        }
        var c = getActiveSavedChart();
        if (!c) return { markers: [], sunSign: null };
        var pos = c.positions || {};
        if ((!pos.sun || pos.sun.longitude == null) && c.birthDate && typeof AstroProfile.buildChartData === 'function') {
          try {
            var full = AstroProfile.buildChartData({
              name: c.name, date: c.birthDate, time: c.birthTime,
              lat: c.lat, lon: c.lon, city: c.birthCity || c.city,
              tz: c.tz, houseSystem: c.houseSystem,
            });
            if (full && full.positions) pos = full.positions;
          } catch (e) {}
        }
        var markers = [];
        if (pos.sun && pos.sun.longitude != null && isFinite(pos.sun.longitude)) {
          markers.push({ lon: pos.sun.longitude, label: '☉ Natal', col: '#6FA0D8' });
        }
        if (pos.moon && pos.moon.longitude != null && isFinite(pos.moon.longitude)) {
          markers.push({ lon: pos.moon.longitude, label: '☽ Natal', col: '#C8D0E8' });
        }
        if (c.ascendant != null && isFinite(c.ascendant)) {
          markers.push({ lon: c.ascendant, label: 'ASC', col: '#d8b46a' });
        }
        var sunSign = (c.sunSign || (pos.sun && pos.sun.sign) || '').toLowerCase();
        return { markers: markers, sunSign: sunSign || null };
      } catch (e) {
        return { markers: [], sunSign: null };
      }
    }

    function getSkyPlanetLons() {
      try {
        var eph = window.AstroEphemeris;
        if (eph && typeof eph.julianDay === 'function' && typeof eph.allPlanetPositions === 'function') {
          var now = new Date();
          var jd = eph.julianDay(now.getFullYear(), now.getMonth() + 1, now.getDate(), 12, 0, 0);
          var positions = eph.allPlanetPositions(jd) || {};
          var out = {};
          Object.keys(positions).forEach(function (name) {
            if (positions[name] && isFinite(positions[name].lon)) out[name.toLowerCase()] = positions[name].lon;
          });
          return out;
        }
      } catch (e) {}
      return {};
    }

    function buildCollectiveChords(signKey) {
      var info = SIGNS[signKey];
      if (!info) return [];
      var signLon = null;
      var Zk = window.AP_ZODIAC;
      if (Zk && Zk.SIGNS) {
        var match = Zk.SIGNS.find(function (s) { return s.key === signKey; });
        if (match && isFinite(match.lon)) signLon = (match.lon + 15) % 360;
      }
      if (signLon == null) {
        var order = ['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces'];
        var idx = order.indexOf(signKey);
        signLon = idx >= 0 ? (idx * 30 + 15) % 360 : 0;
      }
      var lons = getSkyPlanetLons();
      var transitPlanets = [
        { key: 'sun', name: 'Sun' },
        { key: 'moon', name: 'Moon' },
        { key: 'mercury', name: 'Mercury' },
        { key: 'venus', name: 'Venus' },
        { key: 'mars', name: 'Mars' },
        { key: 'jupiter', name: 'Jupiter' },
        { key: 'saturn', name: 'Saturn' },
      ];
      var aspects = [
        { angle: 0, orb: 10, glyph: '☌', quality: 'c' },
        { angle: 60, orb: 8, glyph: '⚹', quality: 'h' },
        { angle: 90, orb: 8, glyph: '□', quality: 'x' },
        { angle: 120, orb: 8, glyph: '△', quality: 'h' },
        { angle: 180, orb: 10, glyph: '☍', quality: 'x' },
      ];
      function sep(a, b) {
        var d = Math.abs((((a - b) % 360) + 360) % 360);
        return d > 180 ? 360 - d : d;
      }
      var candidates = [];
      transitPlanets.forEach(function (pl) {
        var tLon = lons[pl.key];
        if (tLon == null || !isFinite(tLon)) return;
        var diff = sep(tLon, signLon);
        var best = null;
        aspects.forEach(function (asp) {
          var delta = Math.abs(diff - asp.angle);
          if (delta <= asp.orb && (!best || delta < best.delta)) {
            best = { asp: asp, delta: delta };
          }
        });
        if (best) {
          candidates.push({
            natalLon: signLon,
            transitLon: tLon,
            quality: best.asp.quality,
            glyph: best.asp.glyph,
            label: 'Transiting ' + pl.name + ' ' + best.asp.glyph + ' ' + info.name,
            collective: true,
            delta: best.delta,
          });
        }
      });
      candidates.sort(function (a, b) { return a.delta - b.delta; });
      return candidates.slice(0, 3);
    }

    function buildTransitChordsFromReading() {
      try {
        if (!window.DailyTransit || typeof DailyTransit.buildReading !== 'function') return [];
        var reading = DailyTransit.buildReading(new Date());
        if (!reading || !reading.aspects || !reading.aspects.length || !reading.transits) return [];
        var natalMap = {};
        if (window.AstroProfile && typeof AstroProfile.getCharts === 'function') {
          var c = getActiveSavedChart();
          if (c) {
            var pos = c.positions || {};
            if ((!pos.sun || pos.sun.longitude == null) && c.birthDate && typeof AstroProfile.buildChartData === 'function') {
              try {
                var full = AstroProfile.buildChartData({
                  name: c.name, date: c.birthDate, time: c.birthTime,
                  lat: c.lat, lon: c.lon, city: c.birthCity || c.city,
                  tz: c.tz, houseSystem: c.houseSystem,
                });
                if (full && full.positions) pos = full.positions;
              } catch (e) {}
            }
            if (pos.sun && pos.sun.longitude != null) natalMap.Sun = pos.sun.longitude;
            if (pos.moon && pos.moon.longitude != null) natalMap.Moon = pos.moon.longitude;
            if (c.ascendant != null) natalMap.Ascendant = c.ascendant;
            ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'].forEach(function (k) {
              if (pos[k] && pos[k].longitude != null) {
                natalMap[k.charAt(0).toUpperCase() + k.slice(1)] = pos[k].longitude;
              }
            });
          }
        }
        return reading.aspects.slice(0, 4).map(function (a) {
          return {
            natalLon: natalMap[a.natal],
            transitLon: reading.transits[a.transit],
            quality: a.quality,
            glyph: a.glyph,
            label: 'Transiting ' + a.transit + ' ' + a.glyph + ' your ' + a.natal,
          };
        }).filter(function (ch) {
          return ch.natalLon != null && ch.transitLon != null && isFinite(ch.natalLon) && isFinite(ch.transitLon);
        });
      } catch (e) {
        return [];
      }
    }

    var lastTransitChords = [];

    function transitQualityClass(q) {
      if (q === 'h') return 'epn-transit--harmony';
      if (q === 'x') return 'epn-transit--challenge';
      return 'epn-transit--conjunction';
    }

    function chipQualityClass(q) {
      if (q === 'h') return 'srp-transit-chip--harmony';
      if (q === 'x') return 'srp-transit-chip--challenge';
      return 'srp-transit-chip--conjunction';
    }

    function highlightTransitChord(idx, opts) {
      opts = opts || {};
      var activeIdx = (idx != null && idx >= 0) ? idx : -1;
      if (window.ZodiacSphere && typeof ZodiacSphere.setHighlightedChord === 'function') {
        ZodiacSphere.setHighlightedChord(activeIdx >= 0 ? activeIdx : null);
      }
      document.querySelectorAll('.epn-transit').forEach(function (el) {
        var ci = parseInt(el.getAttribute('data-chord-idx'), 10);
        el.classList.toggle('is-active', ci === activeIdx);
      });
      document.querySelectorAll('.srp-transit-chip').forEach(function (el) {
        var ci = parseInt(el.getAttribute('data-chord-idx'), 10);
        el.classList.toggle('is-active', ci === activeIdx);
      });
      if (opts.scroll) {
        var note = document.getElementById('ecliptic-personal-note');
        if (note) {
          note.classList.add('is-flash');
          note.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          window.setTimeout(function () { note.classList.remove('is-flash'); }, 1200);
        }
      }
    }

    function bindTransitChordButtons(root) {
      if (!root) return;
      root.querySelectorAll('[data-chord-idx]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var idx = parseInt(btn.getAttribute('data-chord-idx'), 10);
          if (!isFinite(idx)) return;
          highlightTransitChord(idx, { scroll: btn.classList.contains('epn-transit') });
        });
      });
    }

    function updateEclipticPersonalNote(chords) {
      var el = document.getElementById('ecliptic-personal-note');
      if (!el) return;
      var natal = getUserNatalMarkers();
      var list = (chords && chords.length) ? chords : [];
      var signKey = currentOpenSign;
      if (!natal.markers.length) {
        if (!list.length) {
          el.setAttribute('hidden', '');
          return;
        }
        el.removeAttribute('hidden');
        var collectiveItems = list.map(function (ch, i) {
          return '<button type="button" class="epn-transit ' + transitQualityClass(ch.quality) + '" data-chord-idx="' + i + '">' +
            (ch.label || '') + '</button>';
        }).join('');
        var signLabel = (signKey && SIGNS[signKey]) ? SIGNS[signKey].name : 'this sign';
        el.innerHTML = '<span class="epn-transits">' + collectiveItems + '</span> — today\'s sky aspects to ' + signLabel;
        bindTransitChordButtons(el);
        return;
      }
      el.removeAttribute('hidden');
      if (list.length) {
        var items = list.map(function (ch, i) {
          return '<button type="button" class="epn-transit ' + transitQualityClass(ch.quality) + '" data-chord-idx="' + i + '">' +
            (ch.label || '') + '</button>';
        }).join('');
        el.innerHTML = '<span class="epn-transits">' + items + '</span> — <span class="epn-mark" aria-hidden="true">◆</span> Sun, Moon, Ascendant on dial';
        bindTransitChordButtons(el);
      } else {
        el.innerHTML = 'Your natal placements marked on the dial — <span class="epn-mark" aria-hidden="true">◆</span> Sun, Moon, Ascendant';
      }
    }

    function updateSrpTransitChords(chords, signKey) {
      var wrap = document.getElementById('srp-transit-chords');
      var list = document.getElementById('srp-transit-chords-list');
      if (!wrap || !list) return;
      var labelEl = wrap.querySelector('.srp-transit-chords__label');
      var natal = getUserNatalMarkers();
      if (!chords || !chords.length) {
        wrap.setAttribute('hidden', '');
        list.innerHTML = '';
        return;
      }
      wrap.removeAttribute('hidden');
      if (labelEl) {
        labelEl.textContent = natal.markers.length
          ? 'Transits to your chart today'
          : 'Today\'s sky aspects to ' + ((signKey && SIGNS[signKey]) ? SIGNS[signKey].name : 'this sign');
      }
      list.innerHTML = chords.map(function (ch, i) {
        return '<button type="button" class="srp-transit-chip ' + chipQualityClass(ch.quality) + '" data-chord-idx="' + i + '">' +
          (ch.glyph ? '<span class="stc-glyph" aria-hidden="true">' + ch.glyph + '</span> ' : '') +
          (ch.label || '') + '</button>';
      }).join('');
      bindTransitChordButtons(list);
    }

    function applyTransitChords(signKey) {
      var chords = buildTransitChordsFromReading();
      if (!chords.length && signKey) chords = buildCollectiveChords(signKey);
      lastTransitChords = chords;
      if (window.ZodiacSphere && typeof ZodiacSphere.setTransitChords === 'function') {
        ZodiacSphere.setTransitChords(chords);
      }
      if (window.HoroscopeWheelPoster && typeof HoroscopeWheelPoster.setTransitChords === 'function') {
        HoroscopeWheelPoster.setTransitChords(chords);
      }
      updateEclipticPersonalNote(chords);
      updateSrpTransitChords(chords, signKey || currentOpenSign);
    }

    function collapseLegendOnRead(collapsed) {
      var legend = document.getElementById('planet-legend');
      if (legend) legend.classList.toggle('planet-legend--compact', !!collapsed);
    }

    function collapseSkyBoardOnRead(collapsed) {
      var strip = document.getElementById('planets-live-strip');
      var toggle = document.getElementById('sky-board-toggle');
      if (!strip || !toggle) return;
      document.body.classList.toggle('horoscope--reading-open', !!collapsed);
      if (collapsed) {
        strip.hidden = true;
        toggle.setAttribute('aria-expanded', 'false');
        var showEl = toggle.querySelector('.sbt-show');
        var hideEl = toggle.querySelector('.sbt-hide');
        if (showEl) showEl.style.display = '';
        if (hideEl) hideEl.style.display = 'none';
        return;
      }
      if (window.matchMedia('(min-width: 901px)').matches) {
        autoExpandSkyBoard();
      } else {
        strip.hidden = true;
        toggle.setAttribute('aria-expanded', 'false');
        var showEl2 = toggle.querySelector('.sbt-show');
        var hideEl2 = toggle.querySelector('.sbt-hide');
        if (showEl2) showEl2.style.display = '';
        if (hideEl2) hideEl2.style.display = 'none';
      }
    }

    function dismissCentreHint() {
      try { localStorage.setItem('ap_horoscope_centre_seen', '1'); } catch (e) { /* */ }
      var hint = document.querySelector('.sphere-hint--pulse');
      if (hint) hint.classList.remove('sphere-hint--pulse');
    }

    function initCentreHint() {
      try {
        if (localStorage.getItem('ap_horoscope_centre_seen') === '1') dismissCentreHint();
      } catch (e) { /* */ }
    }
    initCentreHint();
    document.addEventListener('ap-horoscope-centre-tap', dismissCentreHint);

    function syncLegendFromCanvas() {
      if (!window.ZodiacSphere || typeof ZodiacSphere.getPlanetLons !== 'function') return;
      var lons = ZodiacSphere.getPlanetLons();
      if (window.EclipticDialData && typeof EclipticDialData.syncLegendLons === 'function') {
        EclipticDialData.syncLegendLons(lons);
      }
    }

    function dialDataRefresh() {
      if (window.EclipticDialData && typeof EclipticDialData.refreshPlanets === 'function') {
        EclipticDialData.refreshPlanets();
      }
    }

    function autoExpandSkyBoard() {
      try {
        if (!window.matchMedia('(min-width: 901px)').matches) return;
        if (document.body.classList.contains('horoscope--reading-open')) return;
        var panel = document.getElementById('planets-live-strip');
        var btn = document.getElementById('sky-board-toggle');
        if (!panel || !btn || !panel.hidden) return;
        panel.hidden = false;
        btn.setAttribute('aria-expanded', 'true');
        var showEl = btn.querySelector('.sbt-show');
        var hideEl = btn.querySelector('.sbt-hide');
        if (showEl) showEl.style.display = 'none';
        if (hideEl) hideEl.style.display = '';
      } catch (e) { /* */ }
    }

    function scheduleAutoExpandSkyBoard() {
      autoExpandSkyBoard();
      window.setTimeout(autoExpandSkyBoard, 350);
      window.setTimeout(autoExpandSkyBoard, 1100);
    }

    document.addEventListener('ap-zodiac-sphere-ready', scheduleAutoExpandSkyBoard, { once: true });
    document.addEventListener('ap-horoscope-dial-ready', scheduleAutoExpandSkyBoard);
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', scheduleAutoExpandSkyBoard, { once: true });
    } else {
      scheduleAutoExpandSkyBoard();
    }

    var PLANETARY_RULERS = {
      aries:'♂ Mars', taurus:'♀ Venus', gemini:'☿ Mercury', cancer:'☽ Moon',
      leo:'☉ Sun', virgo:'☿ Mercury', libra:'♀ Venus', scorpio:'♇ Pluto',
      sagittarius:'♃ Jupiter', capricorn:'♄ Saturn', aquarius:'♅ Uranus', pisces:'♆ Neptune'
    };
    // Engine still per classical/modern ruler — matches sign-page img/engine/* language.
    var RULER_ENGINE_STILL = {
      aries: 'mars', taurus: 'venus', gemini: 'mercury', cancer: 'moon',
      leo: 'sun', virgo: 'mercury', libra: 'venus', scorpio: 'pluto',
      sagittarius: 'jupiter', capricorn: 'saturn', aquarius: 'uranus', pisces: 'neptune'
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
      var engineGate = auditPath ? Promise.resolve() : bootEngines();
      engineGate.then(ensureInterpretations).then(function () {
        renderOpenPanel(signKey, info);
      }).catch(function () {});
    }

    function renderOpenPanel(signKey, info) {
      var Interp = window.Interpretations;
      if (!Interp || typeof Interp.getDailyHoroscope !== 'function') return;

      var hasChart = userHasSavedChart();
      var cta = document.getElementById('srp-chart-cta');
      var chip = document.getElementById('srp-personalise-chip');
      if (cta) cta.setAttribute('hidden', '');
      if (chip) {
        if (hasChart) chip.setAttribute('hidden', '');
        else chip.removeAttribute('hidden');
      }

      // Update the "Get Your Personal Birth Chart" CTA with the selected sign context
      var ctaSignEl = document.getElementById('srp-chart-sign-name');
      if (ctaSignEl) ctaSignEl.textContent = info.name;
      var ctaLink = document.getElementById('srp-chart-link');
      if (ctaLink) ctaLink.href = 'chart.html';

      var data = Interp.getDailyHoroscope(info.name, new Date());
      if (!data) return; // a null engine return must not throw mid-render
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
        var bodyStill = RULER_ENGINE_STILL[signKey] || 'earth';
        thumb.src = 'img/engine/' + bodyStill + '.webp';
        thumb.alt = info.name + ' — ruled by ' + bodyStill.charAt(0).toUpperCase() + bodyStill.slice(1) + ' (engine still)';
      }
      var dialModel = document.getElementById('dial-model-link');
      if (dialModel) {
        try {
          var focusBody = RULER_ENGINE_STILL[signKey] || 'earth';
          dialModel.href = (window.APDeepLink && APDeepLink.buildSkyLink)
            ? APDeepLink.buildSkyLink({ m: 'now', focus: focusBody })
            : 'index.html#m=now&focus=' + encodeURIComponent(focusBody);
        } catch (eDial) {
          dialModel.href = (window.APDeepLink && APDeepLink.buildSkyLink)
            ? APDeepLink.buildSkyLink({ m: 'now' })
            : 'index.html#m=now';
        }
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

      // Planetary ruler badge
      var rulerEl = document.getElementById('srp-ruler-badge');
      if (rulerEl) rulerEl.textContent = (PLANETARY_RULERS[signKey] || '') + ' Ruler';

      // Moon phase canvas
      try { (function drawMoonPhase() {
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
        bgGrad.addColorStop(0, '#0d1124'); bgGrad.addColorStop(1, '#07070A');
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
      })(); } catch (e) { /* moon canvas must not block reading panel */ }

      applyTransitChords(signKey);
      collapseLegendOnRead(true);
      collapseSkyBoardOnRead(true);

      currentOpenSign = signKey;
      panel.classList.add('is-open');
      panel.setAttribute('aria-hidden', 'false');
      panel.setAttribute('aria-live', 'polite');
      panel.setAttribute('aria-label', 'Daily horoscope reading');
      setPanelLocked(panel, false);
      setTimeout(function () {
        var stickyRead = window.matchMedia && window.matchMedia('(min-width: 901px)').matches;
        // v627 — honor reduced-motion (no smooth yank); scroll-margin-top on the panel
        // keeps its header clear of the sticky masthead on mobile 'start' alignment.
        var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        panel.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: stickyRead ? 'nearest' : 'start' });
      }, 80);
    }

    function closePanel() {
      currentOpenSign = null;
      collapseLegendOnRead(false);
      collapseSkyBoardOnRead(false);
      var panel = document.getElementById('sign-reading-panel');
      panel.classList.remove('is-open');
      panel.setAttribute('aria-hidden', 'true');
      panel.removeAttribute('aria-live');
      panel.removeAttribute('aria-label');
      setPanelLocked(panel, true);
      panel.removeAttribute('data-element');
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
        el.textContent = 'Drag the dial or tap a sign';
      }
    }

    function selectSign(signKey, opts) {
      opts = opts || {};
      document.querySelectorAll('.sign-card').forEach(function(card) {
        card.classList.toggle('is-active', card.dataset.sign === signKey);
      });
      var wrapEl = document.getElementById('sphere-wrap');
      if (window.HoroscopeWheelPoster && wrapEl &&
          !wrapEl.classList.contains('is-canvas-ready') &&
          wrapEl.classList.contains('is-canvas-fallback')) {
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

      // Use the visitor's local calendar date, while naming the fixed instant
      // used by the daily calculation.
      var todayEl = document.getElementById('today-date-display');
      if (todayEl) {
        todayEl.textContent = new Date().toLocaleDateString(undefined, {
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        }) + ' · POSITIONS CALCULATED AT 12:00 UT · SOLAR-CHART READING';
      }

      // Retrograde Calendar heading — make the year range track the real clock
      // instead of a hardcoded "2025–2026" that goes stale.
      var retroHeadingEl = document.getElementById('retro-heading');
      if (retroHeadingEl) {
        var yr = new Date().getFullYear();
        retroHeadingEl.textContent = 'Retrograde Calendar ' + yr + '–' + (yr + 1);
      }

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

      // Ecliptic dial — register expand hook even if poster inited first (audit/lite path)
      if (window.EclipticDialData && typeof EclipticDialData.init === 'function') {
        EclipticDialData.init({
          onPlanetsUpdated: function () {
            scheduleAutoExpandSkyBoard();
            if (currentOpenSign) applyTransitChords(currentOpenSign);
          },
        });
      }
      if (!auditPath) {
        loadScript('js/ephemeris.js').then(dialDataRefresh).catch(function () {});
      }

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

      // ── Canvas-primary dial (poster = audit/fallback only) ───────────────────
      var sphereWrap = document.getElementById('sphere-wrap');
      var spherePoster = document.getElementById('sphere-poster');
      var sphereLoadQueued = false;
      var sphereUiReady = false;
      var pendingSphereAction = null;
      var canvasPrimary = !auditPath && document.documentElement.classList.contains('ap-canvas-primary');
      var canvasLegendPoll = null;

      if (sphereWrap && canvasPrimary) {
        sphereWrap.classList.add('is-canvas-primary');
      }

      function enablePosterFallback() {
        if (!sphereWrap || auditPath || sphereWrap.classList.contains('is-canvas-ready')) return;
        sphereWrap.classList.remove('is-canvas-primary');
        sphereWrap.classList.add('is-canvas-fallback');
        loadScript('js/horoscope-wheel-poster.js?v=' + AV).then(function () {
          if (window.HoroscopeWheelPoster && typeof HoroscopeWheelPoster.enableVisual === 'function') {
            HoroscopeWheelPoster.enableVisual();
          } else if (window.HoroscopeWheelPoster && typeof HoroscopeWheelPoster.init === 'function') {
            HoroscopeWheelPoster.init();
          }
        }).catch(function () {});
      }

      function startCanvasLegendPoll() {
        if (canvasLegendPoll) return;
        canvasLegendPoll = window.setInterval(function () {
          syncLegendFromCanvas();
          if (window.ZodiacSphere && typeof ZodiacSphere.refreshPlanets === 'function') {
            ZodiacSphere.refreshPlanets();
          }
        }, 60000);
      }

      function crossfadeSphereCanvas() {
        if (!sphereWrap || auditPath) return;
        sphereWrap.classList.add('is-canvas-handoff');
        sphereWrap.classList.add('is-canvas-ready');
        var canvas = document.getElementById('zodiac-ring-canvas');
        if (canvas) {
          canvas.removeAttribute('aria-hidden');
          canvas.setAttribute('role', 'application');
          canvas.setAttribute('aria-roledescription', 'live 3D ecliptic dial');
          canvas.setAttribute('aria-label', 'Live 3D ecliptic dial — drag to explore, arrow keys to rotate, Enter to select a sign');
        }
        if (spherePoster) spherePoster.setAttribute('aria-hidden', 'true');
        if (window.ZodiacSphere && typeof ZodiacSphere.refreshPlanets === 'function') {
          ZodiacSphere.refreshPlanets();
        }
        syncLegendFromCanvas();
        startCanvasLegendPoll();
        scheduleAutoExpandSkyBoard();
        window.setTimeout(function () {
          if (sphereWrap) sphereWrap.classList.remove('is-canvas-handoff');
        }, 280);
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
        }, 1200);
        if (canvasPrimary) {
          window.setTimeout(enablePosterFallback, 3200);
        }

        ZodiacSphere.onSelectChange = function (key) { updateSphereLabel(key); };
        if (!canvasPrimary && window.HoroscopeWheelPoster && typeof HoroscopeWheelPoster.getRotationRad === 'function') {
          ZodiacSphere.setRotation(HoroscopeWheelPoster.getRotationRad());
        }
        ZodiacSphere.onChordClick = function (idx) {
          highlightTransitChord(idx, { scroll: true });
        };
        ZodiacSphere.onChordHover = function (idx) {
          highlightTransitChord(idx, { scroll: false });
        };
        ZodiacSphere.init(sphereCanvas, function (signKey) {
          selectSign(signKey, { skipSpin: true });
          var panel = document.getElementById('sign-reading-panel');
          if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });

        function applyNatalMarkers() {
          var natal = getUserNatalMarkers();
          if (window.ZodiacSphere && typeof ZodiacSphere.setNatalMarkers === 'function') {
            ZodiacSphere.setNatalMarkers(natal.markers, natal.sunSign);
          }
          return loadScript('js/ephemeris.js')
            .then(function () { return loadScript('js/daily-transit.js'); })
            .then(applyTransitChords)
            .catch(applyTransitChords);
        }
        loadScript('js/profile.js').then(applyNatalMarkers).catch(function () {
          updateEclipticPersonalNote([]);
        });

      }

    function bootPersonalizedDial() {
        if (auditPath || document.body.classList.contains('ap-daily-ledger')) return;
        var params = new URLSearchParams(window.location.search);
        if (params.get('sign')) return;
        var opened = false;

        function run() {
          if (opened) return;
          var mine = getUserSign();
          if (!mine || !SIGNS[mine]) return;
          opened = true;
          var hasChart = userHasSavedChart();
          whenEngines(function () {
            whenSphereUiReady(function () {
              if (hasChart) {
                ZodiacSphere.spinToSign(mine, {
                  duration: 1000,
                  onDone: function () { selectSign(mine, { skipSpin: true }); },
                });
              } else {
                ZodiacSphere.spinToSign(mine, { duration: 900 });
                updateSphereLabel(mine);
              }
            });
          });
        }

        loadScript('js/profile.js').then(function () {
          if (canvasPrimary) {
            document.addEventListener('ap-zodiac-sphere-ready', run, { once: true });
            window.setTimeout(run, 2200);
          } else {
            window.setTimeout(run, 1100);
          }
        }).catch(function () {
          if (!canvasPrimary) {
            window.setTimeout(run, 1100);
          }
        });
      }

      bootPersonalizedDial();

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
          injectScript('js/zodiac-sphere.js?v=' + AV, initZodiacSphereUI);
        }
        if (window.APCanvasSeals) {
          loadSphere();
        } else {
          injectScript('js/ap-canvas-seals.js', loadSphere);
        }
      }

      function scheduleZodiacSphere() {
        if (sphereLoadQueued || auditPath || document.body.classList.contains('ap-daily-ledger')) return;
        sphereLoadQueued = true;
        loadZodiacSphere();
      }

      if (window.HoroscopeWheelPoster && !auditPath) {
        if (!canvasPrimary) {
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
      }

      if (sphereWrap && !auditPath) {
        if (canvasPrimary) {
          scheduleZodiacSphere();
        } else {
          sphereWrap.addEventListener('pointerdown', scheduleZodiacSphere, { once: true, passive: true });
          window.setTimeout(scheduleZodiacSphere, 700);
          window.addEventListener('load', function () {
            setTimeout(scheduleZodiacSphere, 2200);
          }, { once: true });
        }
      }

      var spinMineBtn = document.getElementById('sphere-spin-mine');
      if (spinMineBtn) {
        spinMineBtn.addEventListener('pointerdown', scheduleZodiacSphere, { once: true, passive: true });
        spinMineBtn.addEventListener('click', function () {
          whenSphereUiReady(function () {
            var mine = getUserSign();
            var note = document.getElementById('sphere-no-chart-note');
            if (!mine || !SIGNS[mine]) {
              if (note) {
                note.removeAttribute('hidden');
                note.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              }
              return;
            }
            if (note) note.setAttribute('hidden', '');
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

      function wireCollapsibleToggle(btnId, panelId, showSel, hideSel) {
        var btn = document.getElementById(btnId);
        var panel = document.getElementById(panelId);
        if (!btn || !panel) return;
        btn.addEventListener('click', function () {
          var open = panel.hidden;
          panel.hidden = !open;
          btn.setAttribute('aria-expanded', String(open));
          var showEl = btn.querySelector(showSel);
          var hideEl = btn.querySelector(hideSel);
          if (showEl) showEl.style.display = open ? 'none' : '';
          if (hideEl) hideEl.style.display = open ? '' : 'none';
        });
      }

      wireCollapsibleToggle('sky-board-toggle', 'planets-live-strip', '.sbt-show', '.sbt-hide');
      wireCollapsibleToggle('weather-grid-toggle', 'todays-sky-wrap', '.wgt-show', '.wgt-hide');

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
      // Patch selectSign to also sync pressed state.
      // Forward all args (key + opts) — dropping opts loses { skipSpin:true }
      // and makes the hero re-spin (~640ms) to a sign the user already picked.
      var _origSelect = selectSign;
      selectSign = function(key, opts) {
        _origSelect(key, opts);
        syncPressed(key);
        if (window.APPersonalMemory && key) APPersonalMemory.saveLastSign(key);
      };
      var _origClose = closePanel;
      closePanel = function() { _origClose(); syncPressed(null); };

      // Close button
      var closeBtn = document.getElementById('srp-close-btn');
      if (closeBtn) closeBtn.addEventListener('click', closePanel);

      // Shareable cosmic card — enhanced 1080×1080 PNG
      // Muted observatory element palette (ap-palette-2026 --ap-element-*) — not neon.
      // Canvas needs literal hex; glow alpha keeps 0.13/0.15/0.16 so neb2 replace() still fires.
      var ELEMENT_CARD_TINTS = {
        fire:  ['#B85A42', 'rgba(184, 90, 66,0.16)', '#4a1408'],
        earth: ['#5A7A48', 'rgba(90, 122, 72,0.13)', '#1e3a24'],
        air:   ['#8A7A6A', 'rgba(138, 122, 106,0.13)', '#3a342e'],
        water: ['#4A7580', 'rgba(74, 117, 128,0.15)', '#10282e'],
      };

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
        bgGrad.addColorStop(0, '#0d1124'); bgGrad.addColorStop(1, '#07070A');
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
        var tint = ELEMENT_CARD_TINTS[info.element] || ['#d8b46a', 'rgba(216,180,106,0.13)', '#1A2230'];

        var BASE = 1080;
        var exportW = (window.RafCore && window.RafCore.cardExportSize) ? window.RafCore.cardExportSize() : BASE * 2;
        var cv = document.createElement('canvas');
        var ctx = (window.RafCore && window.RafCore.prepExportCtx)
          ? window.RafCore.prepExportCtx(cv, exportW, exportW)
          : (cv.width = exportW, cv.height = exportW, cv.getContext('2d'));
        ctx.scale(exportW / BASE, exportW / BASE);

        // Background: void base
        ctx.fillStyle = '#07070A';
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

          ctx.fillStyle = '#d8b46a';
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
          ctx.font = '20px Georgia, serif';
          ctx.fillText('REFLECTION & ENTERTAINMENT · NOT ADVICE OR PREDICTION', 540, 884);

          ctx.fillStyle = tint[0];
          ctx.font = '600 20px Georgia, serif';
          var elemLabel = info.element.charAt(0).toUpperCase() + info.element.slice(1) + ' Sign  ·  Ruled by ' + (PLANETARY_RULERS[signKey] || '');
          ctx.fillText(elemLabel, 540, 922);

          ctx.fillStyle = '#d8b46a';
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

      // Resolve the active sign from the tracked open-panel state, falling back
      // to the DOM. `.sign-card.is-active` can be null or inside a display:none
      // wrapper, so the tracked value is the reliable source.
      function activeReadingSign() {
        if (currentOpenSign && SIGNS[currentOpenSign]) return currentOpenSign;
        var active = document.querySelector('.sign-card.is-active');
        var key = active ? active.dataset.sign : null;
        return (key && SIGNS[key]) ? key : null;
      }
      function toast(title, msg) {
        if (window.AstroApp && typeof AstroApp.showToast === 'function') {
          AstroApp.showToast(title, msg, 'info');
        }
      }

      var cardBtn = document.getElementById('srp-card-btn');
      if (cardBtn) {
        cardBtn.addEventListener('click', function() {
          var key = activeReadingSign();
          if (!key || !window.Interpretations) {
            toast('Pick a sign first', 'Open a reading, then download your card.');
            return;
          }
          if (cardBtn.dataset.busy) return;
          // Paint the loading state before the multi-hundred-ms canvas raster.
          cardBtn.dataset.busy = '1';
          cardBtn.disabled = true;
          cardBtn.setAttribute('aria-busy', 'true');
          cardBtn.textContent = '↻ Crafting…';
          function restore() {
            delete cardBtn.dataset.busy;
            cardBtn.disabled = false;
            cardBtn.removeAttribute('aria-busy');
          }
          requestAnimationFrame(function () {
            try {
              drawHoroscopeCard(key, function (cv) {
                var a = document.createElement('a');
                a.download = key + '-horoscope-' + new Date().toISOString().slice(0,10) + '.png';
                a.href = cv.toDataURL('image/png');
                a.click();
                cardBtn.textContent = 'Saved ✓';
                restore();
                setTimeout(function() { cardBtn.textContent = '↓ Download Card'; }, 2000);
              });
            } catch (e) {
              cardBtn.textContent = '↓ Download Card';
              restore();
              toast('Card unavailable', 'Could not render the card just now.');
            }
          });
        });
      }

      // Share button — crafted copy with sign, date, and reading hook
      var shareBtn = document.getElementById('srp-share-btn');
      if (shareBtn) {
        shareBtn.addEventListener('click', function() {
          var url = window.location.href;
          var key = activeReadingSign();
          var info = key ? SIGNS[key] : null;
          if (!info) {
            toast('Pick a sign first', 'Open a reading, then share it.');
            return;
          }
          if (shareBtn.dataset.busy) return;
          shareBtn.dataset.busy = '1';
          shareBtn.setAttribute('aria-busy', 'true');
          shareBtn.textContent = '↻ Sharing…';
          function restore(label) {
            delete shareBtn.dataset.busy;
            shareBtn.removeAttribute('aria-busy');
            shareBtn.textContent = label || 'Share ↗';
          }
          var title = 'My Daily Horoscope';
          var text = '';
          if (window.Interpretations) {
            var d = Interpretations.getDailyHoroscope(info.name, new Date());
            var hook = ((d && d.overview) || '').split('.')[0];
            var dateStr = new Date().toLocaleDateString('en-GB', { day:'numeric', month:'long' });
            title = info.name + ' — ' + dateStr;
            text = info.name + ', ' + dateStr + ': "' + hook + '." — computed from the real sky at Astro Precise';
          }
          if (navigator.share) {
            navigator.share({ title: title, text: text, url: url })
              .then(function () { restore(); })
              .catch(function () { restore(); });
          } else if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text ? text + ' ' + url : url).then(function() {
              restore('Copied! ✓');
              setTimeout(function() { shareBtn.textContent = 'Share ↗'; }, 2000);
            }).catch(function() {
              restore();
              toast('Could not share', 'Copy the page link manually to share.');
            });
          } else {
            restore();
            toast('Sharing unavailable', 'Copy the page link manually to share.');
          }
        });
      }

      // Dynamic planet weather from live ephemeris
      (function updatePlanetWeather() {
        var PLANET_INFO = [
          { key:'Sun', id:'ap-sky-sun' },
          { key:'Moon', id:'ap-sky-moon' },
          { key:'Mercury', id:'ap-sky-mercury' },
          { key:'Venus', id:'ap-sky-venus' },
          { key:'Mars', id:'ap-sky-mars' },
          { key:'Jupiter', id:'ap-sky-jupiter' },
          { key:'Saturn', id:'ap-sky-saturn' },
        ];

        function tryUpdate() {
          if (!window.AstroEphemeris || typeof AstroEphemeris.julianDay !== 'function' || typeof AstroEphemeris.allPlanetPositions !== 'function') return;
          var now = new Date();
          var jd = AstroEphemeris.julianDay(now.getFullYear(), now.getMonth() + 1, now.getDate(), 12, 0, 0);
          var positions = AstroEphemeris.allPlanetPositions(jd) || {};
          var signNames = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
          PLANET_INFO.forEach(function (planet) {
            var target = document.getElementById(planet.id);
            if (!target) return;
            var pos = positions[planet.key];
            var lon = pos && Number(pos.lon);
            if (!isFinite(lon)) {
              target.textContent = 'Position unavailable';
              return;
            }
            var normalized = ((lon % 360) + 360) % 360;
            var sign = signNames[Math.floor(normalized / 30)] || 'Aries';
            var degree = (normalized % 30).toFixed(1);
            target.textContent = sign + ' ' + degree + '°' + (pos.retrograde ? ' · retrograde' : '');
          });
        }
        engineAfterLoad.push(tryUpdate);
        var ledger = document.getElementById('ap-daily-weather');
        if (ledger) {
          ledger.addEventListener('toggle', function () {
            if (ledger.open) bootEngines().then(tryUpdate).catch(function () {});
          });
        }
      })();

      // Auto-open from ?sign= URL param or last explored sign (device memory)
      if (!auditPath) {
        var params = new URLSearchParams(window.location.search);
        var signParam = params.get('sign');
        var fromMemory = false;
        if (!signParam && window.APPersonalMemory) {
          signParam = APPersonalMemory.getLastSign();
          fromMemory = !!signParam;
        }
        if (signParam && SIGNS[signParam]) {
          whenEngines(function () {
            selectSign(signParam, fromMemory ? { skipSpin: true } : undefined);
          });
        }
      }
    });

  })();
