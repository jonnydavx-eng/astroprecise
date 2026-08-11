/* AstroPrecise v834 — one Observatory state controller.
   State spine: time -> scale -> selected object -> interpretation. */
(function () {
  'use strict';

  var SCALE_NAMES = ['Earth', 'Inner system', 'Solar system', 'Oort cloud', 'Nearby stars', 'Galaxy', 'Cosmos'];
  var SCALE_KEYS = ['EARTH', 'INNER', 'SYSTEM', 'OORT', 'STARS', 'GALAXY', 'COSMOS'];
  var FOCUS = {
    sun: 'Sun', mercury: 'Mercury', venus: 'Venus', earth: 'Earth', moon: 'Moon',
    mars: 'Mars', jupiter: 'Jupiter', saturn: 'Saturn', uranus: 'Uranus',
    neptune: 'Neptune'
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
      if (value.ts && Date.now() - value.ts > STASH_MAX_AGE_MS) return null;
      return {
        moment: value.m != null ? String(value.m) : null,
        focus: value.focus ? String(value.focus).toLowerCase() : '',
        scale: value.scale != null ? String(value.scale) : null
      };
    } catch (_) { return null; }
  }

  function byId(id) { return document.getElementById(id); }

  function formatUtc(date) {
    try {
      return new Intl.DateTimeFormat('en-GB', {
        timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: false
      }).format(date).replace(',', '') + ' UTC';
    } catch (_) {
      return date.toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
    }
  }

  function parseHash() {
    var raw = location.hash.replace(/^#/, '');
    var params = new URLSearchParams(raw);
    return {
      moment: params.get('m'),
      focus: String(params.get('focus') || '').toLowerCase(),
      scale: params.get('scale')
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
    var appliedHash = null;
    var didReady = false;
    var stashed = readStash();

    function revealModelAfterChoice() {
      if (!stage || !window.matchMedia || !window.matchMedia('(max-width: 700px)').matches) return;
      var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      requestAnimationFrame(function () {
        stage.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' });
      });
    }

    function updateClock(customDate) {
      var date = customDate || new Date();
      if (timeStatus) timeStatus.textContent = formatUtc(date);
      if (liveStatus) liveStatus.textContent = customDate ? 'Selected moment' : 'Live now';
      if (liveStatus) liveStatus.classList.toggle('ap-model-status__live', !customDate);
    }

    function showFocus(name, detail) {
      if (focusTitle) focusTitle.textContent = name || 'Solar system';
      if (detail && detail.key) {
        setPressed(worldGroup, function (button) { return button.dataset.key === detail.key; });
      } else {
        setPressed(worldGroup, function (button) { return button.dataset.key === ''; });
      }
    }

    function showScale(level) {
      var key = String(level == null ? 'SYSTEM' : level).toUpperCase();
      var idx = SCALE_KEYS.indexOf(key);
      if (idx < 0 && /^\d+$/.test(key)) idx = Math.max(0, Math.min(6, Number(key)));
      if (idx < 0) idx = 2;
      if (scaleStatus) scaleStatus.textContent = SCALE_NAMES[idx];
      setPressed(scaleGroup, function (button) { return button.dataset.lv === SCALE_KEYS[idx]; });
    }

    function setMoment(moment) {
      if (!moment || moment === 'now') {
        if (orrery.setLive) orrery.setLive();
        updateClock();
        return;
      }
      var normalized = String(moment);
      if (/^\d{4}-\d{2}-\d{2}T[\d:.]+$/.test(normalized)) normalized += 'Z';
      var date = new Date(normalized);
      if (Number.isNaN(date.getTime())) return;
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
      showScale('SYSTEM');
      showFocus('Solar system', { key: '' });
      updateClock();
      appliedHash = null;
      applyHash();
    }

    orrery.addEventListener('planetfocus', function (event) {
      var detail = event.detail || {};
      showFocus(detail.name || FOCUS[detail.key] || 'Solar system', detail);
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
        revealModelAfterChoice();
      });
    }

    if (scaleGroup) {
      scaleGroup.addEventListener('click', function (event) {
        var button = event.target.closest('button');
        if (!button) return;
        revealModelAfterChoice();
      });
    }

    var nowButton = byId('nowBtn');
    if (nowButton) nowButton.addEventListener('click', function () {
      updateClock();
      appliedHash = null;
      if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    });

    var scrub = byId('scrub');
    if (scrub) scrub.addEventListener('input', function () {
      if (liveStatus) {
        liveStatus.textContent = 'Selected moment';
        liveStatus.classList.remove('ap-model-status__live');
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape' || !orrery.cancelNavigation) return;
      orrery.cancelNavigation();
      if (telemetry) telemetry.textContent = 'Movement stopped. Choose any named destination when you are ready.';
    });

    document.addEventListener('ap-orrery-ready', ready, { once: true });
    if (orrery._ready) ready();
    window.addEventListener('hashchange', function () { appliedHash = null; applyHash(); });

    setInterval(function () {
      if (!liveStatus || liveStatus.textContent === 'Live now') updateClock();
    }, 30000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
