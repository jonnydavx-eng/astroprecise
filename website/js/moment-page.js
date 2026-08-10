/**
 * Astro Precise — Moment page controller
 * Free keepsake path: occasion → date/time/place → zenith + light-cone → share card.
 * Engines: AstroEphemeris, LightCone, StarCatalog, APMomentShare, AstroApp.searchPlaces
 */
(function () {
  'use strict';

  if (!document.getElementById('mom-form')) return;

  var esc = (window.AP_SAFE && window.AP_SAFE.esc)
    ? function (s) { return window.AP_SAFE.esc(s); }
    : function (s) {
      return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    };

  var OCCASIONS = {
    birth: { label: 'Birth', titleDefault: 'The sky when you arrived', subtitle: 'The star over a first breath' },
    met: { label: 'We met', titleDefault: 'The night we met', subtitle: 'The sky above that night' },
    wedding: { label: 'Wedding', titleDefault: 'The night you promised', subtitle: 'The sky of a vow' },
    memorial: { label: 'Memorial', titleDefault: 'A sky that held them', subtitle: 'Quiet keepsake — any date that matters' },
    custom: { label: 'Custom', titleDefault: 'A moment of sky', subtitle: 'The sky on the night it mattered' }
  };

  var state = {
    kind: 'birth',
    lat: null,
    lon: null,
    placeLabel: '',
    tz: '',
    lastCanvas: null,
    lastMoment: null,
    lastSkyLink: null
  };

  function $(id) { return document.getElementById(id); }

  function setStatus(msg, tone) {
    var el = $('mom-status');
    if (!el) return;
    el.textContent = msg || '';
    if (tone) el.setAttribute('data-tone', tone);
    else el.removeAttribute('data-tone');
  }

  function loadSavedChartPlace() {
    try {
      if (window.AstroProfile && typeof AstroProfile.getActiveChart === 'function') {
        var active = AstroProfile.getActiveChart();
        if (active && active.lat != null) return active;
      }
      if (window.AstroProfile && AstroProfile.getCharts) {
        var charts = AstroProfile.getCharts();
        if (charts && charts[0] && charts[0].lat != null) {
          return charts[0];
        }
      }
    } catch (e) {}
    try {
      var raw = localStorage.getItem('ap_saved_charts') || localStorage.getItem('ap_charts');
      if (raw) {
        var list = JSON.parse(raw);
        if (Array.isArray(list) && list[0] && list[0].lat != null) return list[0];
      }
    } catch (e2) {}
    return null;
  }

  function prefillFromChart() {
    var c = loadSavedChartPlace();
    if (!c) return;
    if (c.birthDate && $('mom-date') && !$('mom-date').value) $('mom-date').value = c.birthDate;
    if (c.birthTime && $('mom-time') && !$('mom-time').value) $('mom-time').value = String(c.birthTime).slice(0, 5);
    if ((c.city || c.birthCity) && $('mom-place') && !$('mom-place').value) {
      $('mom-place').value = c.city || c.birthCity;
    }
    if (c.name && $('mom-title') && !$('mom-title').value) {
      $('mom-title').value = OCCASIONS.birth.titleDefault;
      $('mom-title').dataset.autoKind = 'birth';
    }
    if (c.lat != null) {
      state.lat = Number(c.lat);
      state.lon = Number(c.lon);
      state.placeLabel = c.city || (c.lat.toFixed(2) + ', ' + c.lon.toFixed(2));
      state.tz = c.tz || '';
    }
    var btn = $('mom-use-chart');
    if (btn) btn.hidden = false;
  }

  function wireOccasions() {
    var root = $('mom-occasions');
    if (!root) return;
    root.querySelectorAll('.mom-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        var k = chip.getAttribute('data-kind') || 'custom';
        state.kind = k;
        root.querySelectorAll('.mom-chip').forEach(function (c) {
          c.setAttribute('aria-pressed', c === chip ? 'true' : 'false');
        });
        var occ = OCCASIONS[k] || OCCASIONS.custom;
        if ($('mom-title') && (!$('mom-title').value || OCCASIONS[$('mom-title').dataset.autoKind || ''])) {
          /* keep user title if they typed custom */
        }
        if ($('mom-title') && (!$('mom-title').dataset.touched || $('mom-title').dataset.touched === '0')) {
          $('mom-title').value = occ.titleDefault;
          $('mom-title').dataset.autoKind = k;
        }
      });
    });
    if ($('mom-title')) {
      $('mom-title').addEventListener('input', function () {
        $('mom-title').dataset.touched = '1';
      });
    }
  }

  var placeTimer = null;
  function wirePlace() {
    var input = $('mom-place');
    var list = $('mom-place-list');
    if (!input || !list) return;

    input.addEventListener('input', function () {
      state.lat = null;
      state.lon = null;
      state.placeLabel = input.value.trim();
      clearTimeout(placeTimer);
      var q = input.value.trim();
      if (q.length < 2 || !window.AstroApp || !AstroApp.searchPlaces) {
        list.classList.remove('is-open');
        list.innerHTML = '';
        return;
      }
      placeTimer = setTimeout(function () {
        AstroApp.searchPlaces(q).then(function (res) {
          var results = (res && res.results) || [];
          if (!Array.isArray(results)) results = [];
          list.innerHTML = '';
          results.slice(0, 6).forEach(function (r) {
            var region = r.admin ? (r.admin + ', ' + (r.country || '')) : (r.country || '');
            var label = r.name + (region ? ' — ' + region : '');
            var b = document.createElement('button');
            b.type = 'button';
            b.setAttribute('role', 'option');
            b.textContent = label;
            b.addEventListener('click', function () {
              input.value = label;
              state.placeLabel = label;
              state.lat = Number(r.lat);
              state.lon = Number(r.lon);
              state.tz = r.tz || '';
              list.classList.remove('is-open');
              list.innerHTML = '';
            });
            list.appendChild(b);
          });
          list.classList.toggle('is-open', results.length > 0);
        }).catch(function () {
          list.classList.remove('is-open');
        });
      }, 280);
    });

    document.addEventListener('click', function (e) {
      if (!list.contains(e.target) && e.target !== input) {
        list.classList.remove('is-open');
      }
    });
  }

  /** Civil local wall time → UTC Date (same two-iteration tz fix as instrument.js). */
  function localDateToUTC(dateStr, timeStr, tz) {
    var t = timeStr || '12:00';
    var parts = dateStr.split('-').map(Number);
    var tp = t.split(':').map(Number);
    var y = parts[0], m = parts[1], dd = parts[2];
    var hh = tp[0] || 0, mm = tp[1] || 0;
    if (!y || !m || !dd) return null;
    if (!tz) return new Date(Date.UTC(y, m - 1, dd, hh, mm));
    var utc = new Date(Date.UTC(y, m - 1, dd, hh, mm));
    for (var i = 0; i < 2; i++) {
      try {
        var dtf = new Intl.DateTimeFormat('en-US', {
          timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit', hour12: false
        });
        var p = {};
        dtf.formatToParts(utc).forEach(function (x) { p[x.type] = x.value; });
        var asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute);
        utc = new Date(Date.UTC(y, m - 1, dd, hh, mm) - (asUTC - utc.getTime()));
      } catch (e) { break; }
    }
    return utc;
  }

  function dateLabel(dateStr, timeStr) {
    try {
      var d = new Date(dateStr + 'T12:00:00');
      var s = d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
      if (timeStr) s += ' · ' + timeStr;
      return s;
    } catch (e) {
      return dateStr + (timeStr ? ' · ' + timeStr : '');
    }
  }

  function computeMoment() {
    var dateStr = $('mom-date') && $('mom-date').value;
    var timeStr = ($('mom-time') && $('mom-time').value) || '12:00';
    var title = ($('mom-title') && $('mom-title').value.trim()) ||
      (OCCASIONS[state.kind] && OCCASIONS[state.kind].titleDefault) || 'A moment of sky';

    if (!dateStr) {
      setStatus('Choose a date first.', 'err');
      return null;
    }
    if (state.lat == null || state.lon == null || !isFinite(state.lat) || !isFinite(state.lon)) {
      setStatus('Pick a place from the search list so we have coordinates.', 'err');
      return null;
    }
    if (!window.AstroEphemeris || !window.LightCone || !window.StarCatalog) {
      setStatus('Astronomy engines still loading — try again in a second.', 'err');
      return null;
    }

    var utc = localDateToUTC(dateStr, timeStr, state.tz);
    if (!utc) {
      setStatus('Could not read that date and time.', 'err');
      return null;
    }

    var jd = AstroEphemeris.julianDay(
      utc.getUTCFullYear(),
      utc.getUTCMonth() + 1,
      utc.getUTCDate(),
      utc.getUTCHours(),
      utc.getUTCMinutes(),
      0
    );

    var z = LightCone.zenithStar(jd, state.lat, state.lon);
    if (!z || !z.star) {
      setStatus('Could not resolve a zenith star for that place and time.', 'err');
      return null;
    }

    var cone = null;
    try {
      // Light-cone age = years from moment to now (meaningful for past dates)
      cone = LightCone.state(utc, new Date());
    } catch (e) {}

    var occ = OCCASIONS[state.kind] || OCCASIONS.custom;
    var story;
    if (cone && isFinite(cone.radiusLy) && cone.radiusLy > 0) {
      var ly = cone.radiusLy;
      story = 'Light has travelled about ' +
        (ly < 10 ? ly.toFixed(2) : Math.round(ly).toLocaleString()) +
        ' light-years since this night. Nearest zenith star: ' +
        z.star.name + ' (' + z.sepDeg.toFixed(1) + '° from exact overhead).';
    } else {
      story = 'Nearest catalogue star to the zenith — ' + z.star.name +
        ', ' + z.sepDeg.toFixed(1) + '° from exact overhead.';
    }

    return {
      kind: state.kind,
      title: title,
      subtitle: occ.subtitle,
      dateLabel: dateLabel(dateStr, timeStr === '12:00' && !($('mom-time') && $('mom-time').value) ? '' : timeStr),
      placeLabel: state.placeLabel,
      zenith: z,
      cone: cone,
      storyLine: story,
      utc: utc,
      jd: jd
    };
  }

  function renderReveal(moment) {
    var reveal = $('mom-reveal');
    if (!reveal) return;
    reveal.hidden = false;

    var star = moment.zenith.star;
    $('mom-fact-star').textContent = star.name +
      (star.con ? ' · ' + star.con : '') +
      (isFinite(moment.zenith.sepDeg) ? ' · ' + moment.zenith.sepDeg.toFixed(1) + '° from zenith' : '');
    $('mom-fact-meta').textContent = [
      star.spectral ? 'Spectral ' + star.spectral : null,
      'mag ' + star.mag,
      star.ly + ' light-years'
    ].filter(Boolean).join(' · ');
    $('mom-fact-when').textContent = [moment.dateLabel, moment.placeLabel].filter(Boolean).join(' · ');
    $('mom-fact-cone').textContent = moment.cone && isFinite(moment.cone.radiusLy) && moment.cone.radiusLy > 0
      ? ('~' + (moment.cone.radiusLy < 10
        ? moment.cone.radiusLy.toFixed(2)
        : Math.round(moment.cone.radiusLy).toLocaleString()) + ' ly of light-travel since this night')
      : (moment.kind === 'birth' ? 'Enter a past birth date for the light-cone story.' : 'Future or “now” moments skip the light-cone age line.');

    var preview = $('mom-card-host');
    preview.innerHTML = '<p class="mom-card-loading" style="color:var(--mom-muted,#9a8f7a);font-size:0.9rem;">Painting card with engine sky plate…</p>';
    state.lastMoment = moment;

    // Occasion texture window (3D still library — not live WebGL)
    var win = $('mom-engine-window');
    var winImg = $('mom-engine-window-img');
    var winCap = $('mom-engine-window-cap');
    if (win && winImg && window.APMomentShare && APMomentShare.plateSrcForKind) {
      var psrc = APMomentShare.plateSrcForKind(moment.kind);
      winImg.src = psrc;
      win.hidden = false;
      if (winCap) {
        winCap.textContent = (moment.kind === 'met' || moment.kind === 'wedding')
          ? 'Engine plate: Earth + Moon textures from our 3D orrery (not your chart geometry).'
          : 'Engine plate: photoreal texture from our 3D orrery library (positions still from VSOP87 math).';
      }
    }

    function mountCard(cv) {
      preview.innerHTML = '';
      state.lastCanvas = cv;
      if (cv) {
        cv.setAttribute('role', 'img');
        cv.setAttribute('aria-label', 'Moment card: ' + star.name + ' for ' + (moment.dateLabel || 'this date'));
        preview.appendChild(cv);
      }
      setStatus('Free card ready — share or download below.', 'ok');
      var shareBtn = $('mom-share');
      if (shareBtn && typeof shareBtn.focus === 'function') {
        try { shareBtn.focus({ preventScroll: true }); } catch (eF) { shareBtn.focus(); }
      }
    }

    if (window.APMomentShare && APMomentShare.paintMomentCardAsync) {
      APMomentShare.paintMomentCardAsync(moment).then(mountCard).catch(function () {
        if (APMomentShare.paintMomentCard) mountCard(APMomentShare.paintMomentCard(moment));
      });
    } else if (window.APMomentShare && APMomentShare.paintMomentCard) {
      mountCard(APMomentShare.paintMomentCard(moment));
    }

    // Model deep-link + ap-sky-ready for share/export closure.
    state.lastSkyLink = null;
    if (window.APSkyBridge && typeof APSkyBridge.emitMomentSkyReady === 'function') {
      var sky = APSkyBridge.emitMomentSkyReady(moment);
      if (sky) state.lastSkyLink = sky.link;
    } else if (moment.utc) {
      try {
        var iso = moment.utc.toISOString ? moment.utc.toISOString() : String(moment.utc);
        state.lastSkyLink = (window.APDeepLink && APDeepLink.buildSkyLink)
          ? APDeepLink.buildSkyLink({ m: iso, focus: 'earth' })
          : 'index.html#m=' + encodeURIComponent(iso) + '&focus=earth';
        document.dispatchEvent(new CustomEvent('ap-sky-ready', {
          bubbles: true,
          detail: { moment: moment, m: iso, link: state.lastSkyLink, focus: 'earth', source: 'moment-freeze' }
        }));
      } catch (eSky) { /* optional */ }
    }

    var modelLink = $('mom-model-link');
    if (modelLink) {
      modelLink.href = state.lastSkyLink || 'index.html#m=now&focus=earth';
      modelLink.hidden = !state.lastSkyLink;
    }

    var dailyReturn = $('mom-daily-return');
    if (dailyReturn) dailyReturn.hidden = false;

    try {
      localStorage.setItem('ap_moment_return', JSON.stringify({
        ts: Date.now(),
        title: moment.title,
        dateLabel: moment.dateLabel,
        m: moment.utc && moment.utc.toISOString ? moment.utc.toISOString() : null
      }));
    } catch (eStore) { /* optional */ }

    try {
      reveal.scrollIntoView({ behavior: (window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'), block: 'start' });
    } catch (e) {}
  }

  function onFreeze(e) {
    if (e) e.preventDefault();
    setStatus('Computing zenith and light-cone…');
    var moment = computeMoment();
    if (!moment) return;
    renderReveal(moment);
  }

  function onShare() {
    if (!state.lastCanvas || !window.APMomentShare) {
      setStatus('Freeze a moment first.', 'err');
      return;
    }
    var name = 'moment-' + (state.lastMoment && state.lastMoment.zenith.star.name || 'sky')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.png';
    var shareOpts = {
      title: (state.lastMoment && state.lastMoment.title) || 'My Astro Precise Moment',
      text: 'The sky on a night that mattered — computed privately.',
      url: state.lastSkyLink || undefined
    };
    APMomentShare.shareOrDownload(state.lastCanvas, name, shareOpts).then(function (shared) {
      setStatus(shared ? 'Card shared.' : 'Card saved to your device.', 'ok');
    }).catch(function () {
      APMomentShare.downloadCanvas(state.lastCanvas, name);
      setStatus('Card downloaded.', 'ok');
    });
  }

  function onSave() {
    if (!state.lastCanvas || !window.APMomentShare) {
      setStatus('Freeze a moment first.', 'err');
      return;
    }
    var name = 'moment-' + (state.lastMoment && state.lastMoment.zenith.star.name || 'sky')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.png';
    APMomentShare.downloadCanvas(state.lastCanvas, name);
    setStatus('Card downloaded.', 'ok');
  }

  function wireForm() {
    var form = $('mom-form');
    if (form) form.addEventListener('submit', onFreeze);
    var share = $('mom-share');
    if (share) share.addEventListener('click', onShare);
    var save = $('mom-save');
    if (save) save.addEventListener('click', onSave);
    var useChart = $('mom-use-chart');
    if (useChart) {
      useChart.addEventListener('click', function () {
        var c = loadSavedChartPlace();
        if (!c) {
          setStatus('No saved chart found — cast one on the Chart page first.', 'err');
          return;
        }
        if (c.birthDate && $('mom-date')) $('mom-date').value = c.birthDate;
        if (c.birthTime && $('mom-time')) $('mom-time').value = String(c.birthTime).slice(0, 5);
        if (c.city && $('mom-place')) $('mom-place').value = c.city;
        state.lat = Number(c.lat);
        state.lon = Number(c.lon);
        state.placeLabel = c.city || '';
        state.tz = c.tz || '';
        state.kind = 'birth';
        document.querySelectorAll('.mom-chip').forEach(function (chip) {
          chip.setAttribute('aria-pressed', chip.getAttribute('data-kind') === 'birth' ? 'true' : 'false');
        });
        if ($('mom-title') && (!$('mom-title').dataset.touched || $('mom-title').dataset.touched === '0')) {
          $('mom-title').value = OCCASIONS.birth.titleDefault;
        }
        setStatus('Filled from your saved chart — freeze when ready.', 'ok');
      });
    }
  }

  function bootWhenReady() {
    // Engines load as deferred scripts; retry briefly if needed
    var tries = 0;
    function go() {
      tries++;
      if (window.AstroEphemeris && window.LightCone && window.StarCatalog && window.APMomentShare) {
        wireOccasions();
        wirePlace();
        wireForm();
        prefillFromChart();
        if ($('mom-title') && !$('mom-title').value) {
          $('mom-title').value = OCCASIONS.birth.titleDefault;
        }
        setStatus('Pick an occasion, date, and place — then freeze the sky.');
        return;
      }
      if (tries < 40) setTimeout(go, 100);
      else setStatus('Could not load astronomy engines. Refresh the page.', 'err');
    }
    go();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootWhenReady);
  } else {
    bootWhenReady();
  }
})();
