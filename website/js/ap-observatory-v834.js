/* AstroPrecise v858 — one Observatory state controller.
   State spine: time -> scale -> selected object -> interpretation. */
(function () {
  'use strict';

  var SCALE_NAMES = ['Earth', 'Inner system', 'Solar system', 'Oort cloud', 'Nearby stars', 'Galaxy', 'Cosmos'];
  var SCALE_KEYS = ['EARTH', 'INNER', 'SYSTEM', 'OORT', 'STARS', 'GALAXY', 'COSMOS'];
  var FOCUS = {
    sun: 'Sun', mercury: 'Mercury', venus: 'Venus', earth: 'Earth', moon: 'Moon',
    mars: 'Mars', jupiter: 'Jupiter', saturn: 'Saturn', uranus: 'Uranus',
    neptune: 'Neptune', pluto: 'Pluto'
  };

  var STASH_KEY = 'ap-explore-moment';
  var STASH_MAX_AGE_MS = 30 * 60 * 1000;

  function readStash() {
    var raw = null;
    try {
      raw = sessionStorage.getItem(STASH_KEY);
      if (raw) sessionStorage.removeItem(STASH_KEY);
    } catch (_) { return null; }
    if (!raw) return null;
    try {
      var value = JSON.parse(raw);
      if (!value || (value.m == null && !value.focus && value.scale == null)) return null;
      var timestamp = Number(value.ts);
      var age = Date.now() - timestamp;
      if (!Number.isFinite(timestamp) || timestamp <= 0 || age < 0 || age > STASH_MAX_AGE_MS) return null;
      return {
        moment: value.m != null ? String(value.m) : null,
        focus: value.focus ? String(value.focus).toLowerCase() : '',
        scale: value.scale != null ? String(value.scale) : null
      };
    } catch (_) { return null; }
  }

  function byId(id) { return document.getElementById(id); }

  var UTC_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function twoDigits(value) { return String(value).padStart(2, '0'); }

  function formatUtc(date) {
    var instant = date instanceof Date ? date : new Date(date);
    if (!Number.isFinite(instant.getTime())) return 'UTC time unavailable';
    return twoDigits(instant.getUTCDate()) + ' ' + UTC_MONTHS[instant.getUTCMonth()] + ' ' +
      instant.getUTCFullYear() + ' ' + twoDigits(instant.getUTCHours()) + ':' +
      twoDigits(instant.getUTCMinutes()) + ' UTC';
  }

  function parseHash() {
    var raw = location.hash.replace(/^#/, '');
    if (raw === 'lead') return { moment: null, focus: '', scale: null };
    var params = new URLSearchParams(raw);
    var moments = [];
    var publicMarkers = [];
    var focuses = [];
    var scales = [];
    params.forEach(function (value, key) {
      var canonicalKey = String(key || '').toLowerCase();
      if (canonicalKey === 'm') moments.push({ key: String(key), value: String(value) });
      if (canonicalKey === 'public') publicMarkers.push({ key: String(key), value: String(value) });
      if (canonicalKey === 'focus') focuses.push({ key: String(key), value: String(value) });
      if (canonicalKey === 'scale') scales.push({ key: String(key), value: String(value) });
    });
    var oneCanonicalMoment = moments.length === 1 && moments[0].key === 'm';
    var safeNow = oneCanonicalMoment && moments[0].value === 'now' && publicMarkers.length === 0;
    var fixedMoment = oneCanonicalMoment ? moments[0].value : '';
    var safePublicFixed = oneCanonicalMoment && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(fixedMoment) &&
      Number.isFinite(new Date(fixedMoment).getTime()) &&
      publicMarkers.length === 1 && publicMarkers[0].key === 'public' && publicMarkers[0].value === '1';
    var moment = safeNow || safePublicFixed ? moments[0].value : null;
    // Rebuild every non-anchor fragment from the exact public contract. This
    // removes historical birth fields even when m=now or a marked event itself
    // is valid, and also covers same-document hash changes after boot.
    var kept = new URLSearchParams();
    if (safeNow || safePublicFixed) kept.set('m', moments[0].value);
    if (safePublicFixed) kept.set('public', '1');
    var focus = focuses.length === 1 && focuses[0].key === 'focus' ? focuses[0].value.toLowerCase() : '';
    var scale = scales.length === 1 && scales[0].key === 'scale' ? scales[0].value : null;
    if (FOCUS[focus]) kept.set('focus', focus);
    if (scale != null && /^-?\d+$/.test(String(scale))) kept.set('scale', String(scale));
    var cleanHash = kept.toString();
    if (raw !== cleanHash) {
      history.replaceState(null, '', location.pathname + location.search + (cleanHash ? '#' + cleanHash : ''));
    }
    return {
      moment: moment,
      focus: focus,
      scale: scale
    };
  }

  function setPressed(group, predicate) {
    if (!group) return;
    Array.prototype.forEach.call(group.querySelectorAll('button'), function (button) {
      var on = !!predicate(button);
      button.classList.toggle('on', on);
      button.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function boot() {
    var orrery = byId('orr');
    if (!orrery) return;

    var stage = document.querySelector('.ap-model-stage');
    var focusTitle = byId('sky-focus-title');
    var scaleStatus = byId('sky-scale-status');
    var timeStatus = byId('sky-time-status');
    var liveStatus = byId('sky-live-status');
    var telemetry = byId('telemetry');
    var scaleGroup = byId('mladder');
    var worldGroup = byId('dock');
    var mobileWorld = byId('mobileWorld');
    var mobileScale = byId('mobileScale');
    var appliedHash = null;
    var didReady = false;
    var stashed = readStash();
    var hasExplicitOpening = !!(location.hash || stashed);
    var userTookControl = false;
    var selectedView = 'Solar system';
    var selectedDate = null;
    var timeMode = 'current';

    function markUserControl() { userTookControl = true; }
    if (stage) {
      stage.addEventListener('pointerdown', markUserControl, { passive: true });
      stage.addEventListener('wheel', markUserControl, { passive: true });
    }

    function revealModelAfterChoice() {
      if (!stage || !window.matchMedia || !window.matchMedia('(max-width: 700px)').matches) return;
      var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      requestAnimationFrame(function () {
        stage.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
      });
    }

    function surfaceCOwnsSky() {
      var html = document.documentElement;
      return html.classList.contains('orrery-full') && html.classList.contains('ap-model-revealed');
    }

    function markSurfaceCOwned() {
      if (!orrery || orrery.getAttribute('data-engine') !== 'webgl') return;
      if (stage && stage.dataset.modelState === 'unavailable') return;
      document.documentElement.classList.add('orrery-full', 'ap-model-revealed');
    }

    function syncStageHonesty(kind) {
      if (!stage) return;
      if (kind === 'unavailable') {
        stage.setAttribute('aria-label', 'Live sky unavailable');
        return;
      }
      var label = timeMode === 'birth'
        ? selectedView + ' · selected birth view'
        : timeMode === 'selected'
          ? selectedView + ' at selected moment'
          : kind === 'live' ? 'Live ' + selectedView + ' now' : selectedView + ' as computed now';
      stage.setAttribute('aria-label', label);
    }

    function updateClock(customDate) {
      if (customDate && Number.isFinite(customDate.getTime())) selectedDate = customDate;
      var date = selectedDate || (timeMode === 'current' ? new Date() : null);
      if (timeStatus) timeStatus.textContent = date ? formatUtc(date) : 'Selected time';
      var unavailable = !!(stage && stage.dataset.modelState === 'unavailable');
      if (unavailable) {
        if (liveStatus) {
          liveStatus.textContent = 'Live sky unavailable';
          liveStatus.classList.remove('ap-model-status__live');
        }
        document.documentElement.classList.remove('orrery-full', 'ap-model-revealed');
        syncStageHonesty('unavailable');
        return;
      }
      var liveCurrent = timeMode === 'current' && surfaceCOwnsSky();
      if (liveStatus) {
        if (timeMode !== 'current') {
          liveStatus.textContent = 'Selected moment';
          liveStatus.classList.remove('ap-model-status__live');
        } else if (liveCurrent) {
          liveStatus.textContent = 'Live now';
          liveStatus.classList.add('ap-model-status__live');
        } else {
          liveStatus.textContent = didReady ? selectedView + ' now' : 'Preparing 3D';
          liveStatus.classList.remove('ap-model-status__live');
        }
      }
      syncStageHonesty(liveCurrent ? 'live' : 'computed');
    }

    function showFocus(name, detail) {
      selectedView = name || 'Solar system';
      if (focusTitle) focusTitle.textContent = name || 'Solar system';
      if (detail && detail.key) {
        setPressed(worldGroup, function (button) { return button.dataset.key === detail.key; });
      } else {
        setPressed(worldGroup, function (button) { return button.dataset.key === ''; });
      }
      if (mobileWorld) mobileWorld.value = detail && detail.key ? detail.key : '';
      updateClock();
    }

    function showScale(level) {
      var key = String(level == null ? 'SYSTEM' : level).toUpperCase();
      var idx = SCALE_KEYS.indexOf(key);
      if (idx < 0 && /^\d+$/.test(key)) idx = Math.max(0, Math.min(6, Number(key)));
      if (idx < 0) idx = 2;
      if (scaleStatus) scaleStatus.textContent = SCALE_NAMES[idx];
      setPressed(scaleGroup, function (button) { return button.dataset.lv === SCALE_KEYS[idx]; });
      if (mobileScale) mobileScale.value = SCALE_KEYS[idx];
      selectedView = SCALE_NAMES[idx];
      updateClock();
    }

    function setMoment(moment) {
      if (!moment || moment === 'now') {
        timeMode = 'current';
        selectedDate = null;
        if (orrery.setLive) orrery.setLive();
        updateClock();
        return;
      }
      var normalized = String(moment);
      if (/^\d{4}-\d{2}-\d{2}T[\d:.]+$/.test(normalized)) normalized += 'Z';
      var date = new Date(normalized);
      if (Number.isNaN(date.getTime())) return;
      timeMode = 'selected';
      var jd = date.getTime() / 86400000 + 2440587.5;
      if (orrery.setJD) orrery.setJD(jd);
      var scrub = byId('scrub');
      var scrubLabel = byId('scrubLabel');
      if (scrub) {
        var year = date.getUTCFullYear() + date.getUTCMonth() / 12;
        scrub.value = String(Math.max(0, Math.min(1000, (year - 1800) / 0.4)));
      }
      if (scrubLabel) scrubLabel.textContent = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).toUpperCase();
      updateClock(date);
    }

    function applyHash() {
      var signature = location.hash;
      if (signature === appliedHash) return;
      appliedHash = signature;
      var state = parseHash();
      if (!stashed) stashed = readStash();
      if (stashed) {
        if (!state.moment) state.moment = stashed.moment;
        if (!state.focus) state.focus = stashed.focus;
        if (state.scale == null) state.scale = stashed.scale;
        stashed = null;
      }
      setMoment(state.moment);
      if (state.focus && FOCUS[state.focus] && orrery.flyTo) {
        if (orrery.flyTo(state.focus) !== false) showFocus(FOCUS[state.focus], { key: state.focus });
      } else if (state.scale != null && orrery.flyScale) {
        orrery.flyScale(state.scale);
        showScale(state.scale);
      } else {
        showScale('SYSTEM');
        showFocus('Solar system', { key: '' });
      }
    }

    function ready() {
      if (didReady) {
        if (location.hash) { appliedHash = null; applyHash(); }
        return;
      }
      didReady = true;
      if (stage) {
        stage.classList.add('is-model-ready');
        stage.setAttribute('aria-busy', 'false');
      }
      markSurfaceCOwned();
      showScale('SYSTEM');
      showFocus('Solar system', { key: '' });
      updateClock();
      if (mobileWorld) mobileWorld.disabled = false;
      if (mobileScale) mobileScale.disabled = false;
      appliedHash = null;
      applyHash();
      try {
        if (window.Orrery3D && typeof window.Orrery3D.forceResize === 'function') {
          requestAnimationFrame(function () { window.Orrery3D.forceResize(); });
          setTimeout(function () { window.Orrery3D.forceResize(); }, 180);
        }
      } catch (e) {}
      if (!hasExplicitOpening && !userTookControl && orrery.startOpeningBeat) {
        var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        var readingRoom = document.body && document.body.classList.contains('ap-reading-room');
        if (!reduced && !readingRoom) setTimeout(function () {
          if (!userTookControl && !location.hash) orrery.startOpeningBeat();
        }, 260);
      }
    }

    orrery.addEventListener('planetfocus', function (event) {
      var detail = event.detail || {};
      showFocus(detail.name || FOCUS[detail.key] || 'Solar system', detail);
      if (detail.key === 'earth') showScale('EARTH');
    });

    orrery.addEventListener('scalechange', function (event) {
      var level = event.detail && event.detail.level;
      showScale(level);
      if (level && String(level).toUpperCase() !== 'EARTH') {
        showFocus(SCALE_NAMES[Math.max(0, SCALE_KEYS.indexOf(String(level).toUpperCase()))] || 'Solar system', { key: '' });
      }
    });

    if (worldGroup) {
      worldGroup.addEventListener('click', function (event) {
        var button = event.target.closest('button');
        if (!button) return;
        markUserControl();
        revealModelAfterChoice();
      });
    }

    if (scaleGroup) {
      scaleGroup.addEventListener('click', function (event) {
        var button = event.target.closest('button');
        if (!button) return;
        markUserControl();
        revealModelAfterChoice();
      });
    }

    if (mobileWorld) {
      mobileWorld.addEventListener('change', function () {
        markUserControl();
        var key = String(mobileWorld.value || '').toLowerCase();
        if (!key) {
          if (orrery.flyScale) orrery.flyScale('SYSTEM');
          showScale('SYSTEM');
          showFocus('Solar system', { key: '' });
        } else if (FOCUS[key] && orrery.flyTo && orrery.flyTo(key) !== false) {
          showFocus(FOCUS[key], { key: key });
        }
        revealModelAfterChoice();
      });
    }

    if (mobileScale) {
      mobileScale.addEventListener('change', function () {
        markUserControl();
        var key = String(mobileScale.value || 'SYSTEM').toUpperCase();
        if (orrery.flyScale) orrery.flyScale(key);
        showScale(key);
        if (key !== 'EARTH') {
          showFocus(SCALE_NAMES[Math.max(0, SCALE_KEYS.indexOf(key))] || 'Solar system', { key: '' });
        }
        revealModelAfterChoice();
      });
    }

    var nowButton = byId('nowBtn');
    if (nowButton) nowButton.addEventListener('click', function () {
      markUserControl();
      timeMode = 'current';
      selectedDate = null;
      updateClock();
      appliedHash = null;
      if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    });

    var scrub = byId('scrub');
    if (scrub) scrub.addEventListener('input', function () {
      markUserControl();
      timeMode = 'selected';
      selectedDate = null;
      updateClock();
    });

    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape' || !orrery.cancelNavigation) return;
      orrery.cancelNavigation();
      if (telemetry) telemetry.textContent = 'Movement stopped. Choose any named destination when you are ready.';
    });

    document.addEventListener('ap-personal-sky', function (event) {
      var detail = event.detail || {};
      if (detail.live) {
        timeMode = 'current';
        selectedDate = null;
        updateClock();
        if (telemetry) telemetry.textContent = selectedView + ' as computed now. Distances in the model are schematic; longitudes are live.';
        return;
      }
      timeMode = 'birth';
      selectedDate = null;
      showFocus('Earth', { key: 'earth' });
      showScale('EARTH');
      if (detail.date) updateClock(new Date(detail.date));
      if (telemetry) {
        telemetry.textContent = detail.caption
          ? detail.caption + '. Distances schematic; longitudes live for that instant.'
          : 'This hemisphere faced the Sun. Distances schematic; longitudes live.';
      }
    });

    document.addEventListener('ap-orrery-ready', ready, { once: true });
    document.addEventListener('ap-orrery-unavailable', function () {
      if (stage) stage.dataset.modelState = 'unavailable';
      document.documentElement.classList.remove('orrery-full', 'ap-model-revealed');
      updateClock();
    });
    if (orrery._ready) ready();
    window.addEventListener('hashchange', function () { appliedHash = null; applyHash(); });

    setInterval(function () {
      updateClock();
    }, 30000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
