/* ============================================================================
 * retrograde.js — "Is Mercury in Retrograde Right Now?" page controller
 * ----------------------------------------------------------------------------
 * Computes everything live and deterministically from window.AstroEphemeris.
 *   - Hero answer  : AstroEphemeris.isRetrograde('mercury', todayJD)
 *   - Status grid  : isRetrograde for Mercury..Pluto, with current sign
 *   - Next windows : day-by-day forward scan (cap ~400 days) detecting the
 *                    station-retrograde (direct -> retro) and station-direct
 *                    (retro -> direct) transitions, reported as date windows.
 *
 * Honesty + determinism (website/CLAUDE.md): same input -> same output. Every
 * position comes from the real VSOP87 engine; we never fabricate a date. If the
 * engine is unavailable we say so rather than showing a made-up answer.
 * ==========================================================================*/
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }

  var SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

  // Planets shown in the status grid. Sun & Moon are never retrograde, so they
  // are deliberately excluded (isRetrograde returns false for them anyway).
  var GRID_PLANETS = [
    { key: 'mercury', name: 'Mercury' },
    { key: 'venus', name: 'Venus' },
    { key: 'mars', name: 'Mars' },
    { key: 'jupiter', name: 'Jupiter' },
    { key: 'saturn', name: 'Saturn' },
    { key: 'uranus', name: 'Uranus' },
    { key: 'neptune', name: 'Neptune' },
    { key: 'pluto', name: 'Pluto' }
  ];

  function ephemerisReady() {
    return !!(window.AstroEphemeris &&
      typeof window.AstroEphemeris.isRetrograde === 'function' &&
      typeof window.AstroEphemeris.julianDay === 'function' &&
      typeof window.AstroEphemeris.planetLongitude === 'function');
  }

  // Julian Day for the start (00:00 local-as-UT) of a given JS Date.
  function jdForDate(d) {
    return window.AstroEphemeris.julianDay(
      d.getFullYear(), d.getMonth() + 1, d.getDate(), 12, 0, 0);
  }

  function signFromLon(lon) {
    var d = ((lon % 360) + 360) % 360;
    return SIGNS[Math.floor(d / 30)];
  }

  function degInSign(lon) {
    var d = ((lon % 360) + 360) % 360;
    return d % 30;
  }

  function formatSignPos(lon) {
    var sign = signFromLon(lon);
    var deg = degInSign(lon);
    var whole = Math.floor(deg);
    var mins = Math.round((deg - whole) * 60);
    if (mins === 60) { mins = 0; whole += 1; }
    return sign + ' ' + whole + '°' + (mins < 10 ? '0' : '') + mins + '′';
  }

  function fmtDate(d) {
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function fmtDateShort(d) {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function dateFromJDStartOffset(baseDate, dayOffset) {
    var d = new Date(baseDate.getTime());
    d.setDate(d.getDate() + dayOffset);
    return d;
  }

  // -------------------------------------------------------------------------
  // Hero answer
  // -------------------------------------------------------------------------
  function renderHero(jd) {
    var isRetro = window.AstroEphemeris.isRetrograde('mercury', jd);
    var lon = window.AstroEphemeris.planetLongitude('mercury', jd);
    var pos = formatSignPos(lon);

    var answerEl = $('hero-answer');
    var subEl = $('hero-sub');
    var heroEl = $('retro-hero');

    if (!answerEl) return isRetro;

    if (isRetro) {
      answerEl.innerHTML = 'Yes — Mercury <em>is</em> in retrograde right now.';
      answerEl.classList.add('hero-answer--retro');
      if (heroEl) heroEl.classList.add('retro-hero--active');
      if (subEl) {
        subEl.textContent = 'Mercury is currently moving apparently backward through ' +
          pos + '. A natural window for review, revision and tying up loose ends — ' +
          'not a curse, just an optical effect of orbital geometry.';
      }
    } else {
      answerEl.innerHTML = 'No — Mercury is <em>not</em> in retrograde right now.';
      answerEl.classList.remove('hero-answer--retro');
      if (heroEl) heroEl.classList.remove('retro-hero--active');
      if (subEl) {
        subEl.textContent = 'Mercury is currently moving direct (forward) through ' +
          pos + '. Communication, travel and tech are running with the cosmic grain.';
      }
    }
    return isRetro;
  }

  // -------------------------------------------------------------------------
  // Status grid for all relevant planets
  // -------------------------------------------------------------------------
  function statusCardHtml(p, jd) {
    var retro = window.AstroEphemeris.isRetrograde(p.key, jd);
    var lon = window.AstroEphemeris.planetLongitude(p.key, jd);
    var pos = formatSignPos(lon);
    var orbHtml = window.AstroIcons
      ? window.AstroIcons.planet(p.name)
      : '<span class="ap-orb ap-orb--' + p.key + '" aria-hidden="true"></span>';
    var statusClass = retro ? 'status-card--retro' : 'status-card--direct';
    var statusLabel = retro
      ? '<span class="status-badge status-badge--retro">℞ Retrograde</span>'
      : '<span class="status-badge status-badge--direct">Direct</span>';
    return '' +
      '<span class="status-card__orb" aria-hidden="true">' + orbHtml + '</span>' +
      '<span class="status-card__name">' + p.name + '</span>' +
      '<span class="status-card__pos">' + pos + '</span>' +
      statusLabel;
  }

  function renderGrid(jd) {
    var grid = $('status-grid');
    if (!grid) return;
    var skeletons = grid.querySelectorAll('.status-card--skeleton');
    if (skeletons.length >= GRID_PLANETS.length) {
      GRID_PLANETS.forEach(function (p, i) {
        var card = skeletons[i];
        var retro = window.AstroEphemeris.isRetrograde(p.key, jd);
        card.className = 'status-card ' + (retro ? 'status-card--retro' : 'status-card--direct');
        card.removeAttribute('aria-hidden');
        card.innerHTML = statusCardHtml(p, jd);
      });
      return;
    }
    var html = '';
    GRID_PLANETS.forEach(function (p) {
      var retro = window.AstroEphemeris.isRetrograde(p.key, jd);
      html += '<div class="status-card ' + (retro ? 'status-card--retro' : 'status-card--direct') + '">' +
        statusCardHtml(p, jd) + '</div>';
    });
    grid.innerHTML = html;
  }

  // -------------------------------------------------------------------------
  // Next Mercury retrograde windows — forward day-by-day scan.
  // Detects transitions: direct->retro = station retrograde (window start),
  // retro->direct = station direct (window end). Caps the scan at ~400 days.
  // -------------------------------------------------------------------------
  function findUpcomingWindows(baseDate, maxWindows) {
    var SCAN_DAYS = 400;
    var windows = [];
    var prevRetro = window.AstroEphemeris.isRetrograde('mercury', jdForDate(baseDate));

    var open = null; // open window start date (when currently/just-entered retro)

    // If Mercury is already retrograde today, treat today as inside an open
    // window — find its station-direct end, then continue scanning for the
    // next full window(s).
    if (prevRetro) {
      open = { start: new Date(baseDate.getTime()), startKnown: false };
    }

    for (var i = 1; i <= SCAN_DAYS; i++) {
      var d = dateFromJDStartOffset(baseDate, i);
      var jd = jdForDate(d);
      var retro = window.AstroEphemeris.isRetrograde('mercury', jd);

      if (!prevRetro && retro) {
        // station retrograde — window opens on day i
        open = { start: new Date(d.getTime()), startKnown: true };
      } else if (prevRetro && !retro) {
        // station direct — window closes on day i-1 (last retro day)
        var endDate = dateFromJDStartOffset(baseDate, i - 1);
        if (open) {
          open.end = endDate;
          open.endKnown = true;
          windows.push(open);
          open = null;
          if (windows.length >= maxWindows) break;
        }
      }
      prevRetro = retro;
    }

    // If a window is still open at the end of the scan (rare — station-direct
    // beyond the horizon), record it with an unknown end so we never invent a date.
    if (open && windows.length < maxWindows) {
      open.end = null;
      open.endKnown = false;
      windows.push(open);
    }

    return windows;
  }

  function renderWindows(baseDate, todayIsRetro) {
    var listEl = $('windows-list');
    if (!listEl) return;

    var windows = findUpcomingWindows(baseDate, 3);

    if (!windows.length) {
      listEl.innerHTML = '<li class="window-item window-item--empty">' +
        '<p>No Mercury retrograde stations found in the next 400 days from the live engine. ' +
        'Mercury typically turns retrograde three times a year, so this is unusual — ' +
        'check back as the date advances.</p></li>';
      return;
    }

    var html = '';
    windows.forEach(function (w, idx) {
      var startLon, endLon, startSign, endSign;
      try {
        startLon = window.AstroEphemeris.planetLongitude('mercury', jdForDate(w.start));
        startSign = signFromLon(startLon);
      } catch (e) { startSign = ''; }

      var rangeText;
      var signText;

      if (w.startKnown === false) {
        // currently in-progress window
        rangeText = 'In progress now → ' + (w.endKnown ? fmtDate(w.end) : 'station date beyond scan horizon');
      } else if (w.endKnown && w.end) {
        rangeText = fmtDate(w.start) + ' → ' + fmtDate(w.end);
      } else {
        rangeText = fmtDate(w.start) + ' → station-direct date beyond 400-day scan';
      }

      if (w.endKnown && w.end) {
        try {
          endLon = window.AstroEphemeris.planetLongitude('mercury', jdForDate(w.end));
          endSign = signFromLon(endLon);
        } catch (e) { endSign = ''; }
      }

      if (startSign && endSign && startSign !== endSign) {
        signText = startSign + ' → ' + endSign;
      } else if (startSign) {
        signText = startSign;
      } else {
        signText = '';
      }

      var durationText = '';
      if (w.startKnown !== false && w.endKnown && w.end) {
        var days = Math.round((w.end.getTime() - w.start.getTime()) / 86400000) + 1;
        durationText = '<span class="window-item__duration">' + days + ' days</span>';
      }

      var label = (w.startKnown === false) ? 'Current window' : 'Upcoming window ' + (idx + 1);

      html += '' +
        '<li class="window-item">' +
          '<span class="window-item__symbol" aria-hidden="true">' +
            (window.AstroIcons ? window.AstroIcons.planet('Mercury') : '☿') +
          '</span>' +
          '<div class="window-item__info">' +
            '<h3>' + label + (signText ? ' — ' + signText : '') + '</h3>' +
            '<p>' + retroNote(idx, w.startKnown === false) + '</p>' +
          '</div>' +
          '<div class="window-item__dates">' + rangeText + durationText + '</div>' +
        '</li>';
    });

    listEl.innerHTML = html;
  }

  function retroNote(idx, inProgress) {
    if (inProgress) {
      return 'Mercury is mid-retrograde now. Favour revising, re-reading and reconnecting ' +
        'over launching anything brand new; double-check travel and tech details.';
    }
    var notes = [
      'Back up files, re-read contracts before signing, and expect plans to need a second pass. ' +
        'Old conversations and contacts may resurface for completion.',
      'A good stretch for finishing, editing and reconnecting rather than starting fresh. ' +
        'Build in buffer time for travel and messaging mix-ups.',
      'Slow down around communication, commerce and scheduling. Patience and review pay off; ' +
        'avoid rushing big purchases or signatures.'
    ];
    return notes[idx % notes.length];
  }

  // -------------------------------------------------------------------------
  // Live timestamp badge
  // -------------------------------------------------------------------------
  function renderTimestamp(now) {
    var el = $('retro-timestamp');
    if (!el) return;
    var dateStr = now.toLocaleDateString('en-US',
      { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    var timeStr = now.toLocaleTimeString('en-US',
      { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
    el.innerHTML = '<span class="live-date-badge__dot" aria-hidden="true"></span>' +
      '<span>Live — ' + dateStr + ' · ' + timeStr + '</span>';
  }

  // -------------------------------------------------------------------------
  // Unavailable-engine fallback (honesty rule)
  // -------------------------------------------------------------------------
  function renderUnavailable() {
    var answerEl = $('hero-answer');
    var subEl = $('hero-sub');
    if (answerEl) answerEl.textContent = 'The astronomy engine could not load.';
    if (subEl) {
      subEl.textContent = 'We compute this answer live in your browser and will not show ' +
        'a guessed result. Please refresh the page — if it persists, the ephemeris ' +
        'script failed to load.';
    }
    var grid = $('status-grid');
    if (grid) {
      grid.innerHTML = '<p class="status-grid__error">Planetary statuses are unavailable ' +
        'until the ephemeris engine loads. Refresh to try again.</p>';
    }
    var listEl = $('windows-list');
    if (listEl) {
      listEl.innerHTML = '<li class="window-item window-item--empty"><p>Retrograde dates ' +
        'are computed live and cannot be shown until the engine loads.</p></li>';
    }
  }

  // -------------------------------------------------------------------------
  // Init (with retry while ephemeris.js finishes loading)
  // -------------------------------------------------------------------------
  function init(attempt) {
    attempt = attempt || 0;
    var now = new Date();
    renderTimestamp(now);

    if (!ephemerisReady()) {
      if (attempt < 30) {
        setTimeout(function () { init(attempt + 1); }, 250);
      } else {
        renderUnavailable();
      }
      return;
    }

    try {
      var todayJD = window.AstroEphemeris.julianDay(
        now.getFullYear(), now.getMonth() + 1, now.getDate(),
        now.getHours(), now.getMinutes(), 0);

      var todayIsRetro = renderHero(todayJD);
      renderGrid(todayJD);
      renderWindows(now, todayIsRetro);
    } catch (e) {
      renderUnavailable();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { init(0); });
  } else {
    init(0);
  }
})();
