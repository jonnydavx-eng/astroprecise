/* ============================================================================
 * moonphase.js — "Moon Phase On Your Birthday" tool
 * ----------------------------------------------------------------------------
 * Computes the EXACT lunar phase for any date from the site's real astronomy
 * engine (window.AstroEphemeris — VSOP87/ELP2000), then draws a beautiful,
 * screenshot-shareable Moon showing the correct lit fraction and waxing/waning
 * side, with phase name, % illumination, and the date.
 *
 * HONESTY + DETERMINISM (see website/CLAUDE.md):
 *   - Every number comes from the live ephemeris. Same date -> same Moon.
 *   - The "compatibility" mode shows two real birth-Moons side by side with a
 *     warm, accurate resonance note. There is NO fake percentage and no claim
 *     of predictive power — it is framed honestly as shared/contrasting sky.
 *
 * Phase math:
 *   elongation        = normalize(moonLon - sunLon)   in [0, 360)
 *   illuminationFrac  = (1 - cos(elongation)) / 2     in [0, 1]
 *   waxing            = elongation < 180  (Moon east of Sun, lit on the right
 *                        as seen from the northern hemisphere)
 *   phase NAME        from the elongation angle, with small windows around the
 *                        four cardinal phases (New / First Q / Full / Last Q).
 * ==========================================================================*/
(function () {
  'use strict';

  // ── Helpers ───────────────────────────────────────────────────────────────
  function $(id) { return document.getElementById(id); }
  function mod360(x) { return ((x % 360) + 360) % 360; }
  function toRad(d) { return (d * Math.PI) / 180; }

  var SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

  function signOf(lon) {
    if (window.AstroEphemeris && typeof AstroEphemeris.signOf === 'function') {
      return AstroEphemeris.signOf(lon);
    }
    return SIGNS[Math.floor(mod360(lon) / 30)];
  }

  // Parse a YYYY-MM-DD date input string into integer parts (no timezone games).
  function parseDateInput(value) {
    if (!value) return null;
    var parts = String(value).split('-');
    if (parts.length !== 3) return null;
    var y = parseInt(parts[0], 10);
    var m = parseInt(parts[1], 10);
    var d = parseInt(parts[2], 10);
    if (!isFinite(y) || !isFinite(m) || !isFinite(d)) return null;
    if (m < 1 || m > 12 || d < 1 || d > 31) return null;
    return { y: y, m: m, d: d };
  }

  function formatDateLong(parts) {
    // Use a UTC date purely for label formatting (no offset distortion).
    var dt = new Date(Date.UTC(parts.y, parts.m - 1, parts.d, 12, 0, 0));
    return dt.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'
    });
  }

  function todayInputValue() {
    var now = new Date();
    var mm = String(now.getMonth() + 1).padStart(2, '0');
    var dd = String(now.getDate()).padStart(2, '0');
    return now.getFullYear() + '-' + mm + '-' + dd;
  }

  // ── The astronomy ──────────────────────────────────────────────────────────
  // Returns null if the engine is not yet available.
  function computePhase(parts) {
    var E = window.AstroEphemeris;
    if (!E || typeof E.julianDay !== 'function' ||
        typeof E.moonPosition !== 'function' || typeof E.sunPosition !== 'function') {
      return null;
    }
    // Evaluate at 12:00 UT — a stable, reproducible instant for "the day".
    var jd = E.julianDay(parts.y, parts.m, parts.d, 12, 0, 0);
    var moon = E.moonPosition(jd);
    var sun = E.sunPosition(jd);
    if (!moon || !sun) return null;

    var elongation = mod360(moon.lon - sun.lon);            // [0, 360)
    var illumination = (1 - Math.cos(toRad(elongation))) / 2; // [0, 1]
    var waxing = elongation < 180;

    var info = phaseFromElongation(elongation);

    return {
      jd: jd,
      parts: parts,
      moonLon: moon.lon,
      sunLon: sun.lon,
      moonSign: signOf(moon.lon),
      sunSign: signOf(sun.lon),
      elongation: elongation,
      illumination: illumination,
      illuminationPct: Math.round(illumination * 1000) / 10, // one decimal
      waxing: waxing,
      name: info.name,
      blurb: info.blurb,
      emoji: info.emoji
    };
  }

  // Phase name from the Sun–Moon elongation angle. The four cardinal phases get
  // a small +-7 degrees window; the rest of the cycle fills the gibbous/crescent
  // quarters. This matches standard astronomical naming.
  function phaseFromElongation(elong) {
    var e = mod360(elong);
    var W = 7; // half-window around exact 0/90/180/270 in degrees
    if (e <= W || e >= 360 - W) {
      return {
        name: 'New Moon', emoji: '<svg class="eng-i"><use href="#ei-moon0"/></svg>',
        blurb: 'The Moon rides with the Sun, its face turned away from Earth — a dark sky and a clean slate. Traditionally a moment for intentions, seeds, and quiet beginnings.'
      };
    }
    if (e < 90 - W) {
      return {
        name: 'Waxing Crescent', emoji: '<svg class="eng-i"><use href="#ei-moon1"/></svg>',
        blurb: 'A slender sliver of light is growing on the western horizon after sunset. Momentum is building — the time to nurture a young intention into action.'
      };
    }
    if (e <= 90 + W) {
      return {
        name: 'First Quarter', emoji: '<svg class="eng-i"><use href="#ei-moon2"/></svg>',
        blurb: 'Half-lit and climbing. A decision point — push through the first resistance. What you commit to now tends to take real shape.'
      };
    }
    if (e < 180 - W) {
      return {
        name: 'Waxing Gibbous', emoji: '<svg class="eng-i"><use href="#ei-moon3"/></svg>',
        blurb: 'Almost full and brightening fast. Refinement, anticipation, last adjustments before things come to a head.'
      };
    }
    if (e <= 180 + W) {
      return {
        name: 'Full Moon', emoji: '<svg class="eng-i"><use href="#ei-moon4"/></svg>',
        blurb: 'The Moon stands opposite the Sun, fully lit and high in the night. A peak of clarity and feeling — culmination, revelation, release.'
      };
    }
    if (e < 270 - W) {
      return {
        name: 'Waning Gibbous', emoji: '<svg class="eng-i"><use href="#ei-moon5"/></svg>',
        blurb: 'Just past full and beginning to fade. A time of gratitude, sharing what you have gathered, and gentle letting-go.'
      };
    }
    if (e <= 270 + W) {
      return {
        name: 'Last Quarter', emoji: '<svg class="eng-i"><use href="#ei-moon6"/></svg>',
        blurb: 'Half-lit and shrinking. Reassessment and release — clear away what no longer serves before the next cycle.'
      };
    }
    return {
      name: 'Waning Crescent', emoji: '<svg class="eng-i"><use href="#ei-moon7"/></svg>',
      blurb: 'A thin paring of light before dawn — the old Moon. Rest, surrender, and quiet completion as the cycle closes.'
    };
  }

  // ── The visual Moon (SVG) ───────────────────────────────────────────────────
  // Renders the lit fraction correctly for any illumination, with the correct
  // waxing (lit on the right) / waning (lit on the left) side. The lit region is
  // built as a path: the limb is a full semicircle; the terminator is an ellipse
  // whose horizontal radius shrinks/grows with phase and flips at the half.
  function moonSVG(phase, R) {
    R = R || 120;
    var cx = R, cy = R;
    var k = phase.illumination;        // 0 (new) .. 1 (full)
    var waxing = phase.waxing;

    // Terminator x-radius. At new/full it is R (full ellipse edge); at quarter
    // it is 0 (straight line). The terminator bulges toward dark for crescent
    // and toward light for gibbous — captured by the sign below.
    var rx = Math.abs(Math.cos(Math.PI * k)) * R;     // |cos| of phase angle
    var gibbous = k > 0.5;                              // lit area > half

    // For the lit-region path we walk the bright limb (a semicircle) then the
    // terminator (a half-ellipse). The bright limb is on the right when waxing,
    // on the left when waning.
    // sweepLimb / sweepTerm control which way each arc bends.
    var litPath;
    if (k <= 0.0001) {
      litPath = ''; // new moon: nothing lit
    } else if (k >= 0.9999) {
      // full moon: lit disc is the whole circle
      litPath = 'M ' + cx + ' ' + (cy - R) +
        ' A ' + R + ' ' + R + ' 0 1 1 ' + cx + ' ' + (cy + R) +
        ' A ' + R + ' ' + R + ' 0 1 1 ' + cx + ' ' + (cy - R) + ' Z';
    } else {
      var topY = cy - R;
      var botY = cy + R;
      // Bright limb semicircle: waxing -> right side (sweep 1), waning -> left (sweep 0)
      var limbSweep = waxing ? 1 : 0;
      // Terminator half-ellipse sweep:
      //  - crescent (k<0.5): terminator curves AWAY from lit limb (toward dark)
      //  - gibbous (k>0.5):  terminator curves TOWARD the lit limb
      // Choosing the sweep flag accordingly produces the right silhouette.
      var termSweep;
      if (waxing) {
        termSweep = gibbous ? 1 : 0;
      } else {
        termSweep = gibbous ? 0 : 1;
      }
      litPath = 'M ' + cx + ' ' + topY +
        ' A ' + R + ' ' + R + ' 0 0 ' + limbSweep + ' ' + cx + ' ' + botY +
        ' A ' + rx + ' ' + R + ' 0 0 ' + termSweep + ' ' + cx + ' ' + topY + ' Z';
    }

    var uid = 'mp' + Math.random().toString(36).slice(2, 8);

    return '' +
      '<svg class="moonphase-svg" viewBox="0 0 ' + (2 * R) + ' ' + (2 * R) + '" ' +
        'xmlns="http://www.w3.org/2000/svg" role="img" ' +
        'aria-label="' + phase.name + ', ' + phase.illuminationPct + ' percent illuminated">' +
        '<defs>' +
          '<radialGradient id="' + uid + '-lit" cx="38%" cy="32%" r="75%">' +
            '<stop offset="0%" stop-color="#fbf7ec"/>' +
            '<stop offset="55%" stop-color="#efe6cf"/>' +
            '<stop offset="100%" stop-color="#cdbf9a"/>' +
          '</radialGradient>' +
          '<radialGradient id="' + uid + '-dark" cx="50%" cy="50%" r="65%">' +
            '<stop offset="0%" stop-color="#1a1f38"/>' +
            '<stop offset="100%" stop-color="#0b0e1e"/>' +
          '</radialGradient>' +
          '<filter id="' + uid + '-glow" x="-40%" y="-40%" width="180%" height="180%">' +
            '<feGaussianBlur stdDeviation="6" result="b"/>' +
            '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>' +
          '</filter>' +
          '<clipPath id="' + uid + '-clip"><circle cx="' + cx + '" cy="' + cy + '" r="' + R + '"/></clipPath>' +
        '</defs>' +
        // soft outer halo
        '<circle cx="' + cx + '" cy="' + cy + '" r="' + (R + 6) + '" fill="rgba(201, 162, 39,0.10)"/>' +
        // dark disc (the unlit Moon, faintly visible)
        '<circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="url(#' + uid + '-dark)"/>' +
        // craters on the dark side for texture
        '<g clip-path="url(#' + uid + '-clip)" opacity="0.5">' +
          '<circle cx="' + (cx - R * 0.30) + '" cy="' + (cy - R * 0.28) + '" r="' + (R * 0.13) + '" fill="rgba(255,255,255,0.05)"/>' +
          '<circle cx="' + (cx + R * 0.34) + '" cy="' + (cy + R * 0.10) + '" r="' + (R * 0.10) + '" fill="rgba(255,255,255,0.04)"/>' +
          '<circle cx="' + (cx + R * 0.05) + '" cy="' + (cy + R * 0.40) + '" r="' + (R * 0.16) + '" fill="rgba(255,255,255,0.035)"/>' +
          '<circle cx="' + (cx - R * 0.45) + '" cy="' + (cy + R * 0.30) + '" r="' + (R * 0.07) + '" fill="rgba(255,255,255,0.04)"/>' +
        '</g>' +
        // lit region
        (litPath
          ? '<g clip-path="url(#' + uid + '-clip)" filter="url(#' + uid + '-glow)">' +
              '<path d="' + litPath + '" fill="url(#' + uid + '-lit)"/>' +
              // subtle maria on the lit side
              '<g opacity="0.12">' +
                '<circle cx="' + (cx - R * 0.18) + '" cy="' + (cy - R * 0.22) + '" r="' + (R * 0.12) + '" fill="#6b5d3a"/>' +
                '<circle cx="' + (cx + R * 0.22) + '" cy="' + (cy + R * 0.18) + '" r="' + (R * 0.15) + '" fill="#6b5d3a"/>' +
              '</g>' +
            '</g>'
          : '') +
        // rim
        '<circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="none" stroke="rgba(255,255,255,0.10)" stroke-width="1"/>' +
      '</svg>';
  }

  // ── Single-date card rendering ──────────────────────────────────────────────
  function renderSingle(phase) {
    var out = $('moonphase-result');
    if (!out) return;
    if (!phase) {
      out.innerHTML = '<p class="mp-error">The astronomy engine is still loading — please try again in a moment.</p>';
      out.classList.remove('hidden');
      return;
    }
    var dateLabel = formatDateLong(phase.parts);
    var waxLabel = phase.waxing ? 'Waxing' : 'Waning';
    // New/Full have no waxing/waning direction worth labelling strongly.
    var directionNote = (phase.name === 'New Moon' || phase.name === 'Full Moon')
      ? '' : '<span class="mp-chip">' + waxLabel + '</span>';

    out.innerHTML =
      '<article class="mp-card" id="mp-share-card">' +
        '<div class="mp-card__brand">' +
          '<span class="mp-card__brand-mark eng-star-mark" aria-hidden="true" style="color:var(--gold);"></span>' +
          '<span class="mp-card__brand-name">AstroPrecise</span>' +
        '</div>' +
        '<div class="mp-card__moon">' + moonSVG(phase, 120) + '</div>' +
        '<p class="mp-card__phase">' + phase.name + '</p>' +
        '<p class="mp-card__date">' + dateLabel + '</p>' +
        '<div class="mp-card__stats">' +
          '<span class="mp-chip mp-chip--gold">' + phase.illuminationPct + '% illuminated</span>' +
          directionNote +
          '<span class="mp-chip">Moon in ' + phase.moonSign + '</span>' +
        '</div>' +
        '<p class="mp-card__blurb">' + phase.blurb + '</p>' +
        '<p class="mp-card__honesty">Computed from real Sun &amp; Moon positions (VSOP87 / ELP2000), evaluated at 12:00&nbsp;UT.</p>' +
      '</article>' +
      '<div class="mp-actions">' +
        '<button type="button" class="btn btn--secondary" id="mp-copy-btn">Copy shareable text</button>' +
      '</div>';

    out.classList.remove('hidden');

    var copyBtn = $('mp-copy-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        var text = 'On ' + dateLabel + ' the Moon was a ' + phase.name +
          ' (' + phase.illuminationPct + '% illuminated, Moon in ' + phase.moonSign + '). ' +
          'Real astronomy via AstroPrecise.';
        copyToClipboard(text, copyBtn);
      });
    }
  }

  function copyToClipboard(text, btn) {
    var done = function () {
      if (!btn) return;
      var old = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(function () { btn.textContent = old; }, 1800);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text, done); });
    } else {
      fallbackCopy(text, done);
    }
  }
  function fallbackCopy(text, done) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'absolute';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      done();
    } catch (e) { /* clipboard unavailable; silently ignore */ }
  }

  // ── Compatibility (two birth Moons, honest resonance note) ──────────────────
  function angularSeparation(a, b) {
    var d = Math.abs(mod360(a) - mod360(b));
    return d > 180 ? 360 - d : d; // 0..180
  }

  // Honest, warm note based on the real angular relationship between the two
  // birth Moons. No invented percentage; framed as resonance, not prediction.
  function resonanceNote(pa, pb) {
    var sep = angularSeparation(pa.moonLon, pb.moonLon);
    var sameSign = pa.moonSign === pb.moonSign;
    var sameElement = elementOf(pa.moonSign) === elementOf(pb.moonSign);

    var headline, body;
    if (sep <= 12) {
      headline = 'Twin Moons';
      body = 'Your birth Moons sit within about ' + Math.round(sep) + '° of each other' +
        (sameSign ? ', both in ' + pa.moonSign : '') +
        '. You tend to feel things in a remarkably similar key — comfort, mood, and what counts as "home" often line up without effort.';
    } else if (sep <= 60 && sameElement) {
      headline = 'Easy Resonance';
      body = 'Both Moons share the ' + elementOf(pa.moonSign) + ' element. Your emotional languages rhyme — you likely soothe and recharge in compatible ways.';
    } else if (sep >= 168) {
      headline = 'Complementary Poles';
      body = 'Your Moons sit nearly opposite (~' + Math.round(sep) + '° apart). That can read as fascination and balance: each of you naturally holds what the other reaches for. It asks for translation, and rewards it.';
    } else if (Math.abs(sep - 90) <= 12) {
      headline = 'Creative Friction';
      body = 'Your Moons are close to a square (~' + Math.round(sep) + '°). Emotional rhythms differ enough to spark growth — different defaults, met with curiosity, tend to stretch you both.';
    } else if (sameElement) {
      headline = 'Kindred Element';
      body = 'Different signs, shared ' + elementOf(pa.moonSign) + ' element. There is an underlying familiarity in how you each process feeling, even when the details differ.';
    } else {
      headline = 'Distinct Weather';
      body = 'Your birth Moons run on different emotional weather (~' + Math.round(sep) + '° apart, ' +
        elementOf(pa.moonSign) + ' and ' + elementOf(pb.moonSign) + '). Not a clash — just two genuinely different inner climates worth learning out loud.';
    }
    return { headline: headline, body: body, sep: sep };
  }

  var ELEMENT_MAP = {
    Aries: 'Fire', Leo: 'Fire', Sagittarius: 'Fire',
    Taurus: 'Earth', Virgo: 'Earth', Capricorn: 'Earth',
    Gemini: 'Air', Libra: 'Air', Aquarius: 'Air',
    Cancer: 'Water', Scorpio: 'Water', Pisces: 'Water'
  };
  function elementOf(sign) { return ELEMENT_MAP[sign] || ''; }

  function renderCompat(pa, pb, labelA, labelB) {
    var out = $('moonphase-compat-result');
    if (!out) return;
    if (!pa || !pb) {
      out.innerHTML = '<p class="mp-error">The astronomy engine is still loading — please try again in a moment.</p>';
      out.classList.remove('hidden');
      return;
    }
    var note = resonanceNote(pa, pb);

    function miniCard(p, label) {
      return '<div class="mp-mini">' +
        '<div class="mp-mini__moon">' + moonSVG(p, 70) + '</div>' +
        '<p class="mp-mini__label">' + (label || '') + '</p>' +
        '<p class="mp-mini__phase">' + p.name + '</p>' +
        '<p class="mp-mini__meta">' + p.illuminationPct + '% · Moon in ' + p.moonSign + '</p>' +
        '<p class="mp-mini__date">' + formatDateLong(p.parts) + '</p>' +
        '</div>';
    }

    out.innerHTML =
      '<article class="mp-card mp-card--compat" id="mp-compat-share-card">' +
        '<div class="mp-card__brand">' +
          '<span class="mp-card__brand-mark eng-star-mark" aria-hidden="true" style="color:var(--gold);"></span>' +
          '<span class="mp-card__brand-name">AstroPrecise</span>' +
        '</div>' +
        '<div class="mp-compat-grid">' +
          miniCard(pa, labelA) +
          '<div class="mp-compat-amp" aria-hidden="true">&amp;</div>' +
          miniCard(pb, labelB) +
        '</div>' +
        '<p class="mp-compat__headline">' + note.headline + '</p>' +
        '<p class="mp-card__blurb">' + note.body + '</p>' +
        '<p class="mp-card__honesty">Moon resonance is a reflection, not a verdict. Both Moons are computed from real positions; we show the genuine angular relationship (~' +
          Math.round(note.sep) + '°) rather than a made-up compatibility score.</p>' +
      '</article>';

    out.classList.remove('hidden');
  }

  // ── Mode switching ──────────────────────────────────────────────────────────
  function setMode(mode) {
    var single = $('mp-mode-single');
    var compat = $('mp-mode-compat');
    var btnSingle = $('mp-tab-single');
    var btnCompat = $('mp-tab-compat');
    if (!single || !compat) return;
    var isCompat = mode === 'compat';
    single.classList.toggle('hidden', isCompat);
    compat.classList.toggle('hidden', !isCompat);
    if (btnSingle) {
      btnSingle.classList.toggle('mp-tab--active', !isCompat);
      btnSingle.setAttribute('aria-selected', String(!isCompat));
    }
    if (btnCompat) {
      btnCompat.classList.toggle('mp-tab--active', isCompat);
      btnCompat.setAttribute('aria-selected', String(isCompat));
    }
  }

  // ── Saved birthday prefill ──────────────────────────────────────────────────
  function savedBirthDate() {
    try {
      if (window.AstroProfile && typeof AstroProfile.getCharts === 'function') {
        var charts = AstroProfile.getCharts();
        if (charts && charts.length && charts[0] && charts[0].birthDate) {
          return charts[0].birthDate; // already YYYY-MM-DD
        }
      }
    } catch (e) { /* no profile / storage blocked */ }
    return null;
  }

  // Engine may load after this script; retry the initial render briefly.
  function whenEngineReady(cb, tries) {
    tries = tries == null ? 20 : tries;
    if (window.AstroEphemeris && typeof AstroEphemeris.moonPosition === 'function') {
      cb();
    } else if (tries > 0) {
      setTimeout(function () { whenEngineReady(cb, tries - 1); }, 250);
    } else {
      cb(); // give up gracefully; renderSingle will show the loading message
    }
  }

  // ── Init ────────────────────────────────────────────────────────────────────
  function init() {
    var dateInput = $('moonphase-date');
    var form = $('moonphase-form');
    var savedBtn = $('mp-use-saved');
    var saved = savedBirthDate();

    if (dateInput && !dateInput.value) {
      dateInput.value = todayInputValue();
    }

    // Show the "use my saved birthday" button only if there is one.
    if (savedBtn) {
      if (saved) {
        savedBtn.classList.remove('hidden');
        savedBtn.addEventListener('click', function () {
          if (dateInput) dateInput.value = saved;
          runSingle();
        });
      } else {
        savedBtn.classList.add('hidden');
      }
    }

    function runSingle() {
      var parts = parseDateInput(dateInput ? dateInput.value : null);
      if (!parts) {
        renderSingle(null);
        return;
      }
      renderSingle(computePhase(parts));
    }

    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        runSingle();
      });
    }

    // Compatibility form
    var compatForm = $('moonphase-compat-form');
    if (compatForm) {
      compatForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var a = parseDateInput(($('mp-compat-date-a') || {}).value);
        var b = parseDateInput(($('mp-compat-date-b') || {}).value);
        var nameA = (($('mp-compat-name-a') || {}).value || '').trim() || 'Person A';
        var nameB = (($('mp-compat-name-b') || {}).value || '').trim() || 'Person B';
        if (!a || !b) {
          renderCompat(null, null);
          return;
        }
        renderCompat(computePhase(a), computePhase(b), nameA, nameB);
      });
    }

    // Tabs
    var tabSingle = $('mp-tab-single');
    var tabCompat = $('mp-tab-compat');
    if (tabSingle) tabSingle.addEventListener('click', function () { setMode('single'); });
    if (tabCompat) tabCompat.addEventListener('click', function () { setMode('compat'); });

    // Initial single render once the engine is ready.
    whenEngineReady(runSingle);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose a small API for testing / reuse.
  window.AstroMoonPhase = {
    computePhase: computePhase,
    phaseFromElongation: phaseFromElongation,
    moonSVG: moonSVG,
    angularSeparation: angularSeparation,
    resonanceNote: resonanceNote
  };
})();
