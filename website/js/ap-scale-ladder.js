/**
 * Astro Precise — Scale Ladder (WOW SLICE 3)
 * Scroll reframes the ONE home orrery via discrete IO beats → setScaleLevel.
 * Also: birth-date live caption on cast (UTC noon JD, honest).
 *
 * Laws: one WebGL · no setScrollDrive-for-camera · LIVE only when orrery-full
 * · PRM = instant snap · never fight active Cosmic journey without cancel
 * · controls stay on plinth (CSS sticky only shrinks stage, not overlays disc)
 */
'use strict';

(function () {
  if (typeof window === 'undefined') return;
  if (window.__apScaleLadderBooted) return;
  window.__apScaleLadderBooted = true;

  var PRM = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  // Narrative order: earth → today → system → galaxy (DOM must match — index.html)
  var BEAT_ORDER = ['earth', 'today', 'system', 'galaxy'];
  var BEAT_LEVEL = {
    earth: 0,
    today: 1,   // inner system / "today's sky" framing
    system: 2,
    galaxy: 5   // Gaia-style schematic (not cosmos decorative 6)
  };
  var BEAT_CAPTION = {
    earth: 'VSOP87 · EARTH',
    today: 'TODAY · INNER',
    system: 'THE SYSTEM',
    galaxy: 'GALAXY · SCHEMATIC'
  };

  var currentBeat = 'earth';
  var userDriving = false;
  var userDriveTimer = 0;
  var birthDriveTimer = 0;
  var birthActive = false;
  var lastBirthKey = '';

  function O() {
    return window.Orrery3D || null;
  }

  function isLive() {
    return document.documentElement.classList.contains('orrery-full') &&
      O() && typeof O().setScaleLevel === 'function';
  }

  function setCaption(text, live) {
    var el = document.getElementById('apModelCaption');
    if (!el) return;
    el.textContent = text;
    if (live === false) {
      /* caption may still show under LIVE gate — honesty via text */
    }
  }

  function markUserDriving(ms) {
    userDriving = true;
    clearTimeout(userDriveTimer);
    userDriveTimer = setTimeout(function () { userDriving = false; }, ms || 2800);
  }

  function goLevel(level, animate) {
    var eng = O();
    if (!eng || typeof eng.setScaleLevel !== 'function') return false;
    try {
      if (typeof eng.isJourneyActive === 'function' && eng.isJourneyActive()) {
        if (typeof eng.cancelScaleJourney === 'function') eng.cancelScaleJourney(false);
      }
    } catch (e) { /* ignore */ }
    var cur = 0;
    try { cur = eng.getScaleLevel() | 0; } catch (e2) {}
    if (cur === level) return true;
    try {
      eng.setScaleLevel(level, animate !== false && !PRM);
      return true;
    } catch (e3) {
      return false;
    }
  }

  function applyBeat(beat) {
    if (!beat || !isLive()) return;
    if (userDriving && beat !== 'earth') return;
    if (birthActive && beat === 'earth') return; // birth preview owns earth framing
    var level = BEAT_LEVEL[beat];
    if (level == null) return;
    if (currentBeat === beat) return;
    currentBeat = beat;
    var wasAway = document.body.classList.contains('ap-ladder-away');
    var away = beat !== 'earth';
    document.body.classList.toggle('ap-ladder-away', away);
    goLevel(level, !PRM);
    if (!birthActive) {
      setCaption(BEAT_CAPTION[beat] || 'VSOP87');
    }
    // Sticky height change needs a resize so the disc re-frames cleanly
    if (wasAway !== away) {
      var eng = O();
      if (eng && typeof eng.forceResize === 'function') {
        setTimeout(function () {
          try { eng.forceResize(); } catch (e) { /* optional */ }
        }, 80);
      }
    }
  }

  /* ── IntersectionObserver on [data-ap-beat] ── */
  function initBeats() {
    var nodes = document.querySelectorAll('[data-ap-beat]');
    if (!nodes.length || !('IntersectionObserver' in window)) return;

    var ratios = Object.create(null);
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var b = en.target.getAttribute('data-ap-beat');
        if (!b) return;
        ratios[b] = en.isIntersecting ? en.intersectionRatio : 0;
      });
      // Highest ratio above threshold; close ties prefer later beat (scroll-down advances)
      var best = null;
      var bestR = 0;
      BEAT_ORDER.forEach(function (k) {
        var r = ratios[k] || 0;
        if (r < 0.28) return;
        if (!best || r > bestR + 0.05) {
          best = k;
          bestR = r;
        } else if (best && Math.abs(r - bestR) <= 0.05 &&
            BEAT_ORDER.indexOf(k) > BEAT_ORDER.indexOf(best)) {
          best = k;
          bestR = r;
        }
      });
      if (!best) {
        if ((ratios.earth || 0) > 0.08) best = 'earth';
        else return;
      }
      applyBeat(best);
      var cue = document.getElementById('ap-ladder-cue');
      if (cue) {
        var idx = BEAT_ORDER.indexOf(best);
        cue.textContent = idx >= 0
          ? ('Scale · ' + (BEAT_CAPTION[best] || best) + ' · ' + (idx + 1) + '/' + BEAT_ORDER.length)
          : '';
        cue.hidden = !best || best === 'earth';
      }
    }, { threshold: [0, 0.15, 0.3, 0.45, 0.6, 0.75, 1], rootMargin: '-8% 0px -12% 0px' });

    nodes.forEach(function (n) { io.observe(n); });
  }

  /* ── User-driving lock (scale strip, scrub, journey) ── */
  function bindUserDriving() {
    document.addEventListener('orrery-scale-change', function (e) {
      // If ladder caused it, detail may not flag; use short lock only on strip clicks
      if (e && e.detail && e.detail.from === 'ladder') return;
    });
    var strip = document.getElementById('ap-scale-strip');
    if (strip) {
      strip.addEventListener('click', function () { markUserDriving(4000); }, true);
    }
    ['ap-cosmic-journey', 'ap-cosmic-flight-launch', 'lite-scrub', 'lite-now-btn'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('pointerdown', function () { markUserDriving(5000); }, { passive: true });
    });
    var deck = document.getElementById('orrery-lite-deck');
    if (deck) {
      deck.addEventListener('pointerdown', function (ev) {
        if (ev.target && ev.target.closest && ev.target.closest('.lite-vp-btn, .orrery-scale-btn, .ap-scale-stepper__btn')) {
          markUserDriving(4000);
        }
      }, { passive: true });
    }
  }

  /* ── Birth-date live caption (Slice 4) — UTC noon JD discipline ── */
  function parseDateInput(val) {
    if (!val || !/^\d{4}-\d{2}-\d{2}$/.test(val)) return null;
    var p = val.split('-');
    var y = +p[0], m = +p[1], d = +p[2];
    if (!y || m < 1 || m > 12 || d < 1 || d > 31) return null;
    // UTC noon — never local-as-UT
    return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  }

  function formatCaptionDate(dt) {
    try {
      return dt.toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC'
      }).toUpperCase();
    } catch (e) {
      return dt.toISOString().slice(0, 10);
    }
  }

  function sunReadout(dt) {
    var E = window.AstroEphemeris;
    if (!E || typeof E.calculateNatalChart !== 'function') return '';
    try {
      // (y,m,d,hour,minute,lat,lon,houseSystem,nodeMode) — lat/lon 0 for sky-only
      var c = E.calculateNatalChart(
        dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate(),
        12, 0, 0, 0, 'Placidus', 'mean'
      );
      var sun = c && (c.positions && (c.positions.Sun || c.positions.sun));
      if (!sun && c && c.sunSign) return 'Sun in ' + c.sunSign;
      if (!sun) return '';
      var sign = sun.sign || c.sunSign || '';
      var lon = sun.longitude != null ? sun.longitude : sun.lon;
      var deg = sun.degInSign != null ? sun.degInSign : (lon != null ? ((lon % 30) + 30) % 30 : null);
      if (!sign) return '';
      if (deg != null && isFinite(deg)) {
        return 'Sun in ' + sign + ' · ' + Math.floor(deg) + '°';
      }
      return 'Sun in ' + sign;
    } catch (e) {
      return '';
    }
  }

  function paintBirthUi(dt, val) {
    var chip = document.getElementById('ap-birth-sky-chip');
    var eng = O();
    if (eng && typeof eng.setDate === 'function' && isLive()) {
      try {
        if (typeof eng.isJourneyActive === 'function' && eng.isJourneyActive() &&
            typeof eng.cancelScaleJourney === 'function') {
          eng.cancelScaleJourney(false);
        }
        if (typeof eng.setScaleLevel === 'function') {
          var lv = 0;
          try { lv = eng.getScaleLevel() | 0; } catch (e) {}
          if (lv !== 0) eng.setScaleLevel(0, !PRM);
        }
        eng.setDate(dt);
      } catch (e2) { /* engine optional */ }
    }

    var cap = 'YOUR SKY · ' + formatCaptionDate(dt) + ' · UTC NOON';
    setCaption(cap);

    var line = sunReadout(dt);
    if (chip) {
      if (line) {
        chip.hidden = false;
        chip.textContent = line;
      } else {
        chip.hidden = true;
      }
    }
  }

  function driveBirthDate(val) {
    var dt = parseDateInput(val);
    var chip = document.getElementById('ap-birth-sky-chip');
    if (!dt) {
      birthActive = false;
      lastBirthKey = '';
      if (chip) { chip.hidden = true; chip.textContent = ''; }
      if (currentBeat === 'earth') setCaption(BEAT_CAPTION.earth);
      return;
    }
    var key = val;
    if (key === lastBirthKey) return;
    lastBirthKey = key;
    birthActive = true;

    // Warm ephemeris for Sun readout (lazy on home)
    if (typeof window.__loadEphemeris === 'function' && !window.AstroEphemeris) {
      window.__loadEphemeris(function () { paintBirthUi(dt, val); });
      setCaption('YOUR SKY · ' + formatCaptionDate(dt) + ' · UTC NOON');
      return;
    }
    paintBirthUi(dt, val);
  }

  function clearBirthDrive() {
    birthActive = false;
    lastBirthKey = '';
    var chip = document.getElementById('ap-birth-sky-chip');
    if (chip) { chip.hidden = true; chip.textContent = ''; }
    var eng = O();
    if (eng && typeof eng.snapToNow === 'function' && isLive()) {
      try { eng.snapToNow(); } catch (e) { /* optional */ }
    }
    if (currentBeat === 'earth') setCaption(BEAT_CAPTION.earth);
  }

  function bindBirthDate() {
    var input = document.getElementById('hero-birthdate') ||
      document.querySelector('#hero-chart-form input[type="date"]');
    if (!input) return;

    // Ensure readout chip exists next to form
    var form = document.getElementById('hero-chart-form');
    if (form && !document.getElementById('ap-birth-sky-chip')) {
      var chip = document.createElement('p');
      chip.id = 'ap-birth-sky-chip';
      chip.className = 'ap-birth-sky-chip';
      chip.hidden = true;
      chip.setAttribute('aria-live', 'polite');
      form.appendChild(chip);
    }

    function onInput() {
      clearTimeout(birthDriveTimer);
      var v = input.value;
      birthDriveTimer = setTimeout(function () {
        if (!v) clearBirthDrive();
        else driveBirthDate(v);
      }, PRM ? 0 : 300);
    }
    input.addEventListener('input', onInput);
    input.addEventListener('change', onInput);
    // Prefill path
    if (input.value) onInput();
  }

  function ensureLadderCue() {
    if (document.getElementById('ap-ladder-cue')) return;
    var cue = document.createElement('div');
    cue.id = 'ap-ladder-cue';
    cue.className = 'ap-ladder-cue';
    cue.hidden = true;
    cue.setAttribute('aria-live', 'polite');
    document.body.appendChild(cue);
  }

  function boot() {
    if (!document.body.classList.contains('ap-observatory-home') &&
        !document.getElementById('heroChapter')) {
      return;
    }
    document.body.classList.add('ap-scale-ladder');
    ensureLadderCue();
    initBeats();
    bindUserDriving();
    bindBirthDate();

    // Re-assert earth when engine becomes ready
    document.addEventListener('ap-orrery-ready', function () {
      if (!birthActive) {
        currentBeat = '';
        applyBeat('earth');
      }
    }, { once: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  window.APScaleLadder = {
    applyBeat: applyBeat,
    goLevel: goLevel,
    driveBirthDate: driveBirthDate,
    clearBirthDrive: clearBirthDrive
  };
})();
