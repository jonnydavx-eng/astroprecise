/* ============================================================================
 * daily-transit.js — "Your Sky Today" personalised daily transit card
 * ----------------------------------------------------------------------------
 * Habit-forming, privacy-clean daily reading that renders at the top of the
 * personal section on transits.html. Everything runs in the browser.
 *
 *   - Auto-loads the visitor's most recent SAVED natal chart from localStorage
 *     (AstroProfile `ap_charts`, key/shape per chart.html / home cast save path).
 *   - Preference order: (1) re-derive via buildChartData when lat/lon exist;
 *     (2) use stored `positions` longitudes (home cast + full chart saves);
 *     (3) lightweight `ap_natal_pins` Sun/Moon/(Asc).
 *   - Computes TODAY's transit-to-natal aspects through the real VSOP87/ELP2000
 *     engine and produces a DETERMINISTIC reading via AstroOracle.getDailyInsight
 *     (seeded by date XOR chart — stable on reload, fresh each day). Output is
 *     cached by ISO date in localStorage and recomputed when the date rolls over.
 *   - If NO saved chart exists, renders a graceful "cast & save a chart" card —
 *     never fabricates a chart.
 *   - A gentle, privacy-clean visit-streak counter ("Day 7 — seven days running").
 *   - A quiet, free path toward the eclipse-contact instrument (no
 *     invented prices or links).
 *
 * Honesty + determinism rules (website/CLAUDE.md): all positions come from the
 * live engine; getDailyInsight states plainly when no transits are active rather
 * than inventing any; same chart + same day => identical reading everywhere.
 *
 * Public API (window.DailyTransit):
 *   - mount(targetEl)   render the card into targetEl (or #daily-transit-card)
 *   - refresh()         force a recompute + re-render (e.g. after a chart saves)
 *   - getReading()      returns the computed reading object (or null)
 * ==========================================================================*/
(function () {
  'use strict';

  var STREAK_KEY = 'ap_transit_streak';   // { count, lastISO, firstISO }
  var CACHE_KEY  = 'ap_daily_transit';    // { iso, chartId, headline, ... }

  var SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

  // `name` is the machine key other modules match on (horoscope-page.js PT_WORD)
  // and is never printed. `label` and `verb` are what a reader sees.
  var ASPECTS = [
    { name: 'Conjunction', angle: 0,   orb: 6, glyph: '☌', quality: 'c', label: 'Together',      verb: 'meets' },
    { name: 'Sextile',     angle: 60,  orb: 4, glyph: '⚹', quality: 'h', label: 'Helpful angle', verb: 'sits at a helpful angle to' },
    { name: 'Square',      angle: 90,  orb: 5, glyph: '□', quality: 'x', label: 'Friction',      verb: 'presses against' },
    { name: 'Trine',       angle: 120, orb: 5, glyph: '△', quality: 'h', label: 'Easy flow',     verb: 'flows with' },
    { name: 'Opposition',  angle: 180, orb: 6, glyph: '☍', quality: 'x', label: 'Face to face',  verb: 'sits opposite' }
  ];

  var TRANSIT_PLANETS = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
    'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];

  // ── small helpers ─────────────────────────────────────────────────────────

  function mod360(x) { return ((x % 360) + 360) % 360; }

  function isoDate(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate())
      .toISOString().slice(0, 10);
  }

  function read(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
  }
  function write(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function signOf(lon) { return SIGNS[Math.floor(mod360(lon) / 30)]; }
  function degInSign(lon) {
    var d = mod360(lon) % 30;
    var deg = Math.floor(d);
    var min = Math.round((d - deg) * 60);
    if (min === 60) { min = 0; deg += 1; }
    return deg + '°' + (min < 10 ? '0' + min : min) + '′';
  }

  function planetOrb(name, opts) {
    if (window.AstroIcons && typeof AstroIcons.planet === 'function') {
      return AstroIcons.planet(name, opts || {});
    }
    return '<span aria-hidden="true">' + esc(name.slice(0, 2)) + '</span>';
  }
  function signOrb(name, opts) {
    if (window.AstroIcons && typeof AstroIcons.sign === 'function') {
      return AstroIcons.sign(name, opts || {});
    }
    return '';
  }

  // ── chart loading (saved → re-derived or stored natal positions) ───────────

  // Returns { positions, label, mode, chartId } or null.
  //   positions: object usable directly by AstroOracle.getDailyInsight
  //   mode: 'full' | 'stored' | 'pins'
  function loadChartsList() {
    var P = window.AstroProfile;
    if (P && typeof P.getCharts === 'function') {
      try {
        var fromProfile = P.getCharts();
        if (fromProfile && fromProfile.length) return fromProfile;
      } catch (e0) { /* fall through */ }
    }
    try {
      var raw = JSON.parse(localStorage.getItem('ap_charts') || '[]');
      return Array.isArray(raw) ? raw : [];
    } catch (e1) {
      return [];
    }
  }

  function pickActiveChart(charts) {
    if (!charts || !charts.length) return null;
    var c = charts[0];
    try {
      var activeId = localStorage.getItem('ap_active_chart');
      if (activeId) {
        var found = charts.filter(function (x) { return x && String(x.id) === String(activeId); })[0];
        if (!found && window.AstroProfile && typeof AstroProfile.getChart === 'function') {
          found = AstroProfile.getChart(activeId);
        }
        if (found) c = found;
      }
    } catch (e) { /* ignore */ }
    return c;
  }

  function loadNatal() {
    var P = window.AstroProfile;
    var charts = loadChartsList();
    var c = pickActiveChart(charts);

    // (A) Recompute a full natal chart when birth place coords exist.
    if (c && c.birthDate && isFinite(parseFloat(c.lat)) && isFinite(parseFloat(c.lon))
        && P && typeof P.buildChartData === 'function') {
      var full = null;
      try {
        full = P.buildChartData({
          name: c.name, date: c.birthDate, time: c.birthTime,
          lat: c.lat, lon: c.lon, city: c.birthCity || c.city,
          tz: c.tz, houseSystem: c.houseSystem
        });
      } catch (e) { full = null; }
      if (full && full.positions) {
        return {
          positions: full.positions,
          label: firstName(c.name),
          mode: 'full',
          chartId: c.id || c.birthDate
        };
      }
    }

    // (B) Stored longitudes from home cast or prior full save (no re-derive needed).
    // Home cast writes { Sun: { lon, sign, ... }, ... } without lat/lon.
    if (c && c.positions && typeof c.positions === 'object') {
      var flat = flattenNatal(c.positions);
      if (Object.keys(flat).length >= 2) {
        return {
          positions: c.positions,
          label: firstName(c.name || 'Home cast'),
          mode: 'stored',
          chartId: c.id || c.birthDate || 'stored'
        };
      }
    }

    // (C) Lightweight fallback — Sun/Moon/(Asc) longitudes only.
    var pins = read('ap_natal_pins');
    if (pins && pins.points && (pins.points.sun != null || pins.points.moon != null)) {
      var pos = {};
      if (pins.points.sun != null) pos.Sun = pins.points.sun;
      if (pins.points.moon != null) pos.Moon = pins.points.moon;
      // Asc is not a transit target for getDailyInsight, kept for display only.
      if (Object.keys(pos).length >= 2) {
        return {
          positions: pos,
          label: firstName(pins.name),
          mode: 'pins',
          chartId: 'pins:' + (pins.savedAt || '')
        };
      }
    }

    return null;
  }

  function firstName(name) {
    if (!name) return '';
    return String(name).trim().split(/\s+/)[0];
  }

  // Normalise a positions value (number | {longitude} | {lon}) to a number.
  function lonOf(v) {
    if (v == null) return null;
    if (typeof v === 'number') return v;
    if (typeof v === 'object') {
      if (v.longitude != null) return v.longitude;
      if (v.lon != null) return v.lon;
    }
    return null;
  }

  // Flatten an oracle-ready positions object into { Sun: deg, ... }.
  function flattenNatal(positions) {
    var out = {};
    TRANSIT_PLANETS.forEach(function (name) {
      var lower = name.toLowerCase();
      var v = positions[name] != null ? positions[name] : positions[lower];
      var lon = lonOf(v);
      if (lon != null) out[name] = mod360(lon);
    });
    return out;
  }

  // ── today's transiting longitudes (live engine) ───────────────────────────

  function transitLongitudes(date) {
    var E = window.AstroEphemeris;
    if (!E || typeof E.julianDay !== 'function') return null;
    var jd = E.julianDay(
      date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(),
      date.getUTCHours(), date.getUTCMinutes(), 0
    );
    var out = {};
    // Prefer the bulk accessor when present, else per-planet functions.
    if (typeof E.allPlanetPositions === 'function') {
      var all = E.allPlanetPositions(jd);
      TRANSIT_PLANETS.forEach(function (name) {
        var p = all[name];
        var lon = p && p.lon != null ? p.lon : (typeof p === 'number' ? p : null);
        if (lon != null) out[name] = mod360(lon);
      });
    } else {
      TRANSIT_PLANETS.forEach(function (name) {
        var fn = E[name.toLowerCase() + 'Position'];
        if (typeof fn === 'function') {
          try { out[name] = mod360(fn(jd).lon); } catch (e) {}
        }
      });
    }
    return Object.keys(out).length ? out : null;
  }

  // ── transit-to-natal aspect scan (our own, deterministic) ──────────────────
  // Used to surface the 2-3 key contacts with glyphs. The narrative prose comes
  // from AstroOracle.getDailyInsight; this scan drives the visual aspect rows.

  function scanAspects(transits, natal) {
    var hits = [];
    Object.keys(transits).forEach(function (tName) {
      var tLon = transits[tName];
      Object.keys(natal).forEach(function (nName) {
        var nLon = natal[nName];
        var diff = Math.abs(mod360(tLon - nLon));
        if (diff > 180) diff = 360 - diff;
        for (var i = 0; i < ASPECTS.length; i++) {
          var a = ASPECTS[i];
          var orb = Math.abs(diff - a.angle);
          if (orb <= a.orb) {
            // Tightness score, slightly favouring slower transiting planets.
            var weight = 1 + (TRANSIT_PLANETS.indexOf(tName) / TRANSIT_PLANETS.length);
            hits.push({
              transit: tName, natal: nName,
              aspect: a.name, glyph: a.glyph, quality: a.quality,
              label: a.label, verb: a.verb,
              orb: orb, score: (a.orb - orb + 0.01) * weight
            });
            break;
          }
        }
      });
    });
    hits.sort(function (x, y) { return y.score - x.score; });
    return hits;
  }

  // ── visit streak (gentle, never punishing) ─────────────────────────────────

  function bumpStreak(today) {
    var s = read(STREAK_KEY) || { count: 0, lastISO: null, firstISO: today };
    if (s.lastISO === today) return s; // already counted today

    var yesterday = isoDate(new Date(Date.now() - 86400000));
    if (s.lastISO === yesterday) {
      s.count = (s.count || 0) + 1;
    } else {
      s.count = 1;
      s.firstISO = today;
    }
    s.lastISO = today;
    write(STREAK_KEY, s);
    return s;
  }

  // ── reading (deterministic, cached by ISO date) ────────────────────────────

  var _reading = null;

  function buildReading(date) {
    var today = isoDate(date);
    var natal = loadNatal();

    // Oracle prose (deterministic). Pass the full positions object when we have
    // it (richer aspects), else the flattened Sun/Moon map; null => sky mode.
    var oracleChart = null;
    var natalFlat = null;
    if (natal) {
      oracleChart = natal.mode === 'full' ? natal.positions : natal.positions;
      natalFlat = flattenNatal(natal.positions);
    }

    var insight = null;
    if (window.AstroOracle && typeof AstroOracle.getDailyInsight === 'function') {
      try { insight = AstroOracle.getDailyInsight(oracleChart, date); } catch (e) { insight = null; }
    }

    // Visual aspect rows from the live engine (independent of oracle internals).
    var transits = transitLongitudes(date);
    var aspectRows = [];
    if (transits && natalFlat && Object.keys(natalFlat).length) {
      aspectRows = scanAspects(transits, natalFlat).slice(0, 3);
    }

    _reading = {
      iso: today,
      hasChart: !!natal,
      chartId: natal ? natal.chartId : null,
      name: natal ? natal.label : '',
      mode: natal ? natal.mode : 'sky',
      insight: insight,
      transits: transits,
      natal: natalFlat,      // REAL natal longitudes { Sun: deg, ... } (chart-computed)
      aspects: aspectRows,
      sunSign: insight && insight.meta ? insight.meta.sunSign : (transits ? signOf(transits.Sun) : ''),
      moonSign: insight && insight.meta ? insight.meta.moonSign : (transits ? signOf(transits.Moon) : '')
    };

    // Cache the lightweight summary by ISO date (recompute when day rolls over).
    write(CACHE_KEY, {
      iso: today,
      chartId: _reading.chartId,
      headline: insight ? insight.headline : null,
      moodScore: insight ? insight.moodScore : null
    });

    return _reading;
  }

  function getReading() { return _reading; }

  // ── rendering ──────────────────────────────────────────────────────────────

  var STYLE_ID = 'daily-transit-style';

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var css =
      '.dt-card{position:relative;overflow:hidden;background:var(--surface,rgba(15,18,50,0.55));' +
      '-webkit-backdrop-filter:blur(20px);backdrop-filter:blur(20px);' +
      'border:1px solid var(--border,rgba(255,255,255,0.08));border-radius:var(--radius-2xl,28px);' +
      'padding:2.5rem;max-width:760px;margin:0 auto 2.5rem;}' +
      '@media(max-width:600px){.dt-card{padding:1.75rem 1.25rem;}}' +
      '.dt-card::before{content:"";position:absolute;top:0;left:0;right:0;height:3px;' +
      'background:linear-gradient(90deg,var(--gold,#d8b46a),var(--brass-shadow,#6A7078));opacity:0.8;}' +
      '.dt-card__top{display:flex;align-items:center;justify-content:space-between;gap:1rem;' +
      'flex-wrap:wrap;margin-bottom:1.25rem;}' +
      '.dt-card__eyebrow{font-size:0.62rem;font-weight:600;letter-spacing:0.28em;' +
      'text-transform:uppercase;color:var(--gold,#d8b46a);margin:0 0 0.4rem;}' +
      '.dt-card__date{font-size:0.8rem;color:var(--silver-dim,#8891AA);margin:0;letter-spacing:0.04em;}' +
      '.dt-card__streak{display:inline-flex;align-items:center;gap:0.45rem;' +
      'background:rgba(216, 180, 106,0.1);border:1px solid rgba(216, 180, 106,0.28);border-radius:999px;' +
      'padding:0.35rem 0.85rem;font-size:0.72rem;color:var(--gold-light,#d8b46a);' +
      'letter-spacing:0.03em;white-space:nowrap;}' +
      '.dt-card__streak-dot{width:6px;height:6px;border-radius:50%;background:#9db36a;' +
      'box-shadow:0 0 6px rgba(74,222,128,0.7);}' +
      '.dt-card__headline{font-family:var(--font-display,"Cinzel",serif);' +
      'font-size:clamp(1.4rem,3vw,1.9rem);font-weight:700;color:var(--white,#F8F4EE);' +
      'line-height:1.2;letter-spacing:0.02em;margin:0 0 1.1rem;}' +
      '.dt-card__body{font-size:0.95rem;color:var(--silver,#C8D0E8);line-height:1.8;margin:0 0 1.5rem;}' +
      '.dt-aspects{display:flex;flex-direction:column;gap:0.6rem;margin:0 0 1.5rem;}' +
      '.dt-aspect{display:flex;align-items:center;gap:0.75rem;background:rgba(255,255,255,0.03);' +
      'border:1px solid var(--border,rgba(255,255,255,0.08));border-radius:14px;padding:0.7rem 0.95rem;}' +
      '.dt-aspect__orbs{display:inline-flex;align-items:center;gap:0.3rem;flex-shrink:0;}' +
      '.dt-aspect__rel{font-size:0.95rem;color:var(--gold,#d8b46a);width:1.4rem;text-align:center;flex-shrink:0;}' +
      '.dt-aspect__text{flex:1;min-width:0;}' +
      '.dt-aspect__name{font-size:0.78rem;font-weight:600;color:var(--white,#F8F4EE);' +
      'letter-spacing:0.02em;margin:0;}' +
      '.dt-aspect__detail{font-size:0.72rem;color:var(--silver-dim,#8891AA);margin:0.15rem 0 0;line-height:1.5;}' +
      '.dt-aspect__orb{font-size:0.68rem;color:var(--gold,#d8b46a);white-space:nowrap;flex-shrink:0;opacity:0.85;}' +
      '.dt-meta{display:flex;flex-wrap:wrap;gap:0.5rem;margin:0 0 1.5rem;}' +
      '.dt-chip{display:inline-flex;align-items:center;gap:0.4rem;font-size:0.72rem;' +
      'color:var(--silver,#C8D0E8);background:rgba(255,255,255,0.04);' +
      'border:1px solid var(--border,rgba(255,255,255,0.08));border-radius:999px;padding:0.3rem 0.75rem;}' +
      '.dt-keywords{display:flex;flex-wrap:wrap;gap:0.4rem;margin:0 0 1.25rem;}' +
      '.dt-keyword{font-size:0.62rem;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;' +
      'color:var(--gold-light,#d8b46a);background:rgba(216, 180, 106,0.10);' +
      'border:1px solid rgba(216, 180, 106,0.28);border-radius:999px;padding:0.25rem 0.7rem;}' +
      '.dt-tease{border-top:1px solid var(--border,rgba(255,255,255,0.08));padding-top:1.25rem;' +
      'margin-top:0.5rem;font-size:0.82rem;color:var(--silver-dim,#8891AA);line-height:1.7;}' +
      '.dt-tease a{color:var(--gold,#d8b46a);text-decoration:none;border-bottom:1px solid rgba(216, 180, 106,0.4);' +
      'transition:border-color 0.2s;}' +
      '.dt-tease a:hover{border-bottom-color:var(--gold,#d8b46a);}' +
      '.dt-empty{text-align:center;}' +
      '.dt-empty__icon{display:block;margin:0 auto 1rem;}' +
      '.dt-empty h3{font-family:var(--font-display,"Cinzel",serif);font-size:1.3rem;font-weight:700;' +
      'color:var(--white,#F8F4EE);margin:0 0 0.6rem;}' +
      '.dt-empty p{font-size:0.9rem;color:var(--silver-dim,#8891AA);line-height:1.7;' +
      'max-width:420px;margin:0 auto 1.6rem;}' +
      // v628 — "what's next" rhythm (tomorrow + this week), the come-back loop
      '.dt-rhythm{list-style:none;margin:1.1rem 0 0;padding:0.9rem 0 0;' +
      'border-top:1px solid rgba(216,180,106,0.16);display:flex;flex-direction:column;gap:0.5rem;}' +
      '.dt-rhythm__row{display:flex;gap:0.7rem;align-items:baseline;font-size:0.86rem;line-height:1.4;}' +
      '.dt-rhythm__when{flex:none;min-width:5.4em;font-family:var(--font-mono,monospace);' +
      'font-size:0.66rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--color-gold,#d8b46a);}' +
      '.dt-rhythm__what{color:var(--silver,#C8D0E8);}' +
      '.dt-rhythm__note{margin:0.6rem 0 0;font-size:0.72rem;color:var(--silver-dim,#8891AA);font-style:italic;}' +
      // v629 — honest Deep-Reading teaser (real excerpt of this chart's reading)
      '.dt-tease--rich{margin:1.2rem 0 0;padding:1rem 1.1rem;border:1px solid rgba(216,180,106,0.22);' +
      'border-radius:12px;background:linear-gradient(180deg,rgba(216,180,106,0.06),rgba(216,180,106,0.02));}' +
      '.dt-tease__eyebrow{margin:0 0 0.4rem;font-family:var(--font-mono,monospace);font-size:0.62rem;' +
      'letter-spacing:0.16em;text-transform:uppercase;color:var(--color-gold,#d8b46a);}' +
      '.dt-tease__excerpt{margin:0 0 0.5rem;font-size:0.92rem;line-height:1.55;color:var(--white,#F8F4EE);}' +
      '.dt-tease__lock{position:relative;margin:0 0 0.8rem;font-size:0.85rem;line-height:1.5;' +
      'color:var(--silver-dim,#8891AA);-webkit-mask-image:linear-gradient(90deg,#000 55%,transparent);' +
      'mask-image:linear-gradient(90deg,#000 55%,transparent);}' +
      '.dt-tease__cta{margin:0;font-size:0.82rem;}' +
      '.dt-tease__soon{color:var(--silver-dim,#8891AA);}' +
      '.dt-tease__link{color:var(--color-gold,#d8b46a);font-weight:600;text-decoration:none;}' +
      '.dt-tease__link:hover{text-decoration:underline;}';
    var el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = css;
    document.head.appendChild(el);
  }

  function formatLongDate(date) {
    try {
      return date.toLocaleDateString('en-US',
        { weekday: 'long', month: 'long', day: 'numeric' });
    } catch (e) {
      return isoDate(date);
    }
  }

  function streakLine(s) {
    if (!s || !s.count || s.count < 1) return '';
    if (s.count === 1) return 'Day 1 — welcome back to your sky.';
    return 'Day ' + s.count + ' — ' + s.count + ' days running.';
  }

  function renderEmpty(target, date) {
    var sunSign = '';
    var transits = transitLongitudes(date);
    var skyLine = '';
    if (window.AstroOracle && typeof AstroOracle.getDailyInsight === 'function') {
      try {
        var sky = AstroOracle.getDailyInsight(null, date);
        if (sky) { skyLine = sky.headline; sunSign = sky.meta ? sky.meta.sunSign : ''; }
      } catch (e) {}
    }
    if (!sunSign && transits) sunSign = signOf(transits.Sun);

    var html =
      '<div class="dt-card dt-empty">' +
        '<p class="dt-card__eyebrow">Your Sky Today</p>' +
        '<span class="dt-empty__icon" aria-hidden="true">' +
          planetOrb('Sun', { lg: true }) + '</span>' +
        '<h3>Make today’s sky yours</h3>' +
        '<p>' + (skyLine
          ? esc(skyLine) + ' Cast and save your birth chart to see exactly how today’s ' +
            'planets touch <em>your</em> placements — not a generic sun-sign blurb.'
          : 'Cast and save your birth chart to see exactly how today’s sky touches ' +
            '<em>your</em> own placements. Everything stays in your browser.') +
        '</p>' +
        '<a href="chart.html" class="btn btn--primary">Cast &amp; save your chart →</a>' +
      '</div>';
    target.innerHTML = html;
  }

  function renderAspectRow(a, transits) {
    var tLon = transits ? transits[a.transit] : null;
    var posText = tLon != null ? signOf(tLon) + ' ' + degInSign(tLon) : '';
    // a.aspect is the machine key and stays out of the sentence — the reader gets
    // what the angle does (a.verb / a.label), not the trade name for it.
    var detail = 'Transiting ' + a.transit + (posText ? ' in ' + posText : '') +
      ' ' + (a.verb || 'contacts') + ' your natal ' + a.natal + '.';
    return '<div class="dt-aspect">' +
      '<span class="dt-aspect__orbs" aria-hidden="true">' +
        planetOrb(a.transit, { sm: true }) + planetOrb(a.natal, { sm: true }) +
      '</span>' +
      '<span class="dt-aspect__rel" aria-hidden="true">' + a.glyph + '</span>' +
      '<span class="dt-aspect__text">' +
        '<p class="dt-aspect__name">' + esc(a.transit) + ' · ' + esc(a.natal) +
          ' — ' + esc(String(a.label || 'in contact').toLowerCase()) + '</p>' +
        '<p class="dt-aspect__detail">' + esc(detail) + '</p>' +
      '</span>' +
      '<span class="dt-aspect__orb">' + a.orb.toFixed(1) + '°</span>' +
    '</div>';
  }

  // Top transit-to-natal aspect on a given date (pure — does not clobber _reading).
  function topAspectOn(date, natalFlat) {
    if (!natalFlat) return null;
    var t = transitLongitudes(date);
    if (!t) return null;
    var rows = scanAspects(t, natalFlat);
    return rows.length ? rows[0] : null;
  }

  // The next dated event this civil week from the deterministic weekly engine.
  function nextWeekEvent(date) {
    if (!(window.WeeklySky && typeof WeeklySky.buildWeekReport === 'function')) return null;
    try {
      var rep = WeeklySky.buildWeekReport(date);
      if (!rep || rep.empty || !rep.events || !rep.events.length) return null;
      return rep.events[0];
    } catch (e) { return null; }
  }

  // "What's next" — an honest come-back loop: tomorrow's top transit + this week's
  // next real event. All values are genuinely computed; empty sky is stated plainly.
  function renderRhythm(date, natalFlat) {
    var rows = [];
    var tomorrow = new Date(date.getTime() + 86400000);
    var ta = topAspectOn(tomorrow, natalFlat);
    var tText = ta
      ? esc(ta.transit) + ' ' + esc(ta.verb || 'in contact with') + ' your ' + esc(ta.natal)
      : 'open sky — no exact transits to your chart';
    rows.push('<li class="dt-rhythm__row"><span class="dt-rhythm__when">Tomorrow</span>' +
      '<span class="dt-rhythm__what">' + tText + '</span></li>');
    var ev = nextWeekEvent(date);
    if (ev && ev.title) {
      rows.push('<li class="dt-rhythm__row"><span class="dt-rhythm__when">This week</span>' +
        '<span class="dt-rhythm__what">' + esc(ev.title) + '</span></li>');
    }
    if (!rows.length) return '';
    return '<ul class="dt-rhythm" aria-label="What comes next">' + rows.join('') + '</ul>' +
      '<p class="dt-rhythm__note">The sky moves — your reading recomputes each day.</p>';
  }

  function renderReading(target, reading, date) {
    var streak = bumpStreak(reading.iso);
    var insight = reading.insight;
    var headline = insight ? insight.headline : 'Your sky today';
    var body = insight ? insight.body : '';
    var name = reading.name ? esc(reading.name) + '’s sky' : 'Your sky';

    var aspectsHtml = '';
    if (reading.aspects && reading.aspects.length) {
      aspectsHtml = '<div class="dt-aspects" role="list" aria-label="Key transits to your chart">' +
        reading.aspects.map(function (a) { return renderAspectRow(a, reading.transits); }).join('') +
        '</div>';
    } else if (reading.mode === 'pins') {
      aspectsHtml = '<div class="dt-meta"><span class="dt-chip">' +
        'Saved Sun &amp; Moon only — cast a full chart for every transit</span></div>';
    }

    // "Show me in the sky" — natal edition. If a host exports
    // window.APShowInSky, draw the TOP transit against the
    // saved chart's REAL computed natal longitude on the engine's geocentric
    // zodiac ring. HONESTY: bLon comes from reading.natal (AstroProfile
    // buildChartData positions, or the ap_natal_pins longitudes) — never a sign
    // midpoint — and the label says 'natal', not 'solar chart'.
    var skyBtnHtml = '';
    var skyApi = window.APShowInSky;
    var topA = reading.aspects && reading.aspects.length ? reading.aspects[0] : null;
    if (skyApi && typeof skyApi.show === 'function' && topA &&
        reading.natal && typeof reading.natal[topA.natal] === 'number') {
      var natLon = reading.natal[topA.natal]; // real longitude, degrees 0–360
      var natLabel = 'your ' + topA.natal + ' · natal';
      try { if (skyApi.ensureCss) skyApi.ensureCss(); } catch (e) {}
      skyBtnHtml = '<button type="button" class="home-daily__sky-btn" ' +
        'data-sky-planet="' + esc(topA.transit.toLowerCase()) + '" ' +
        'data-sky-aspect="' + esc(topA.aspect.toLowerCase()) + '" ' +
        'data-sky-blon="' + natLon + '" ' +
        'data-sky-blabel="' + esc(natLabel) + '">' +
        '<span aria-hidden="true">✦</span> Show ' + esc(topA.transit) + ' ' +
        esc(topA.verb || 'in contact with') + ' your ' + esc(topA.natal) + ' in the sky' +
      '</button>';
    }

    var metaChips = '';
    if (reading.sunSign || reading.moonSign) {
      metaChips = '<div class="dt-meta">' +
        (reading.sunSign ? '<span class="dt-chip">' + signOrb(reading.sunSign, { sm: true }) +
          ' Sun in ' + esc(reading.sunSign) + '</span>' : '') +
        (reading.moonSign ? '<span class="dt-chip">' + signOrb(reading.moonSign, { sm: true }) +
          ' Moon in ' + esc(reading.moonSign) + '</span>' : '') +
        (insight && insight.moodScore != null ? '<span class="dt-chip">Mood ' +
          Math.round(insight.moodScore) + '/100</span>' : '') +
        '</div>';
    }

    var keywordsHtml = '';
    if (insight && insight.keywords && insight.keywords.length) {
      keywordsHtml = '<div class="dt-keywords">' +
        insight.keywords.map(function (k) {
          return '<span class="dt-keyword">' + esc(k) + '</span>';
        }).join('') + '</div>';
    }

    var streakHtml = '';
    var line = streakLine(streak);
    if (line) {
      streakHtml = '<span class="dt-card__streak">' +
        '<span class="dt-card__streak-dot" aria-hidden="true"></span>' + esc(line) + '</span>';
    }

    // "What's next" — tomorrow + this week (only for saved-chart readers).
    var rhythmHtml = reading.natal ? renderRhythm(date, reading.natal) : '';

    // Deep-Reading tease — dormant-safe via AP_MON. Renders a plain line if no
    // URL is configured (never an invented price or broken link).
    var teaseHtml = renderTease();

    target.innerHTML =
      '<div class="dt-card">' +
        '<div class="dt-card__top">' +
          '<div>' +
            '<p class="dt-card__eyebrow">' + name + ' · Your Sky Today</p>' +
            '<p class="dt-card__date">' + esc(formatLongDate(date)) + '</p>' +
          '</div>' +
          streakHtml +
        '</div>' +
        '<h3 class="dt-card__headline">' + esc(headline) + '</h3>' +
        (body ? '<p class="dt-card__body">' + esc(body) + '</p>' : '') +
        aspectsHtml +
        skyBtnHtml +
        metaChips +
        keywordsHtml +
        rhythmHtml +
        teaseHtml +
      '</div>';

    if (skyBtnHtml) {
      var sb = target.querySelector('.home-daily__sky-btn');
      if (sb) {
        sb.addEventListener('click', function () {
          skyApi.show(
            sb.getAttribute('data-sky-planet'),
            sb.getAttribute('data-sky-aspect'),
            parseFloat(sb.getAttribute('data-sky-blon')),
            { bLabel: sb.getAttribute('data-sky-blabel'), natalMode: 'natal' }
          );
        });
      }
    }
  }

  function firstSentence(text) {
    if (!text) return '';
    var m = String(text).match(/^[\s\S]*?[.!?](?=\s|$)/);
    return (m ? m[0] : String(text)).trim();
  }

  // Lazy-load the (heavy) interpretation engine ONCE, only when a saved-chart
  // reader's card actually renders — keeps 424KB off the homepage first paint.
  var _interpState = 0; // 0 untried · 1 loading · 2 done/failed
  function ensureInterp(cb) {
    if (window.AstroInterpretations) { cb(); return; }
    if (_interpState !== 0) return;
    _interpState = 1;
    var s = document.createElement('script');
    s.src = 'js/interpretations.js';
    s.async = true;
    s.onload = function () { _interpState = 2; cb(); };
    s.onerror = function () { _interpState = 2; };
    document.head.appendChild(s);
  }

  // A real excerpt from this chart's interpretation engine, tied to today's strongest transit:
  // the first sentence of the genuine interpretation for the natal placement being
  // aspected. This stays free and leads into the launch eclipse instrument.
  function deepTeaserSnippet(reading) {
    var I = window.AstroInterpretations;
    if (!I || typeof I.getPlanetInterpretation !== 'function') return null;
    var topA = reading && reading.aspects && reading.aspects.length ? reading.aspects[0] : null;
    if (!topA || !reading.natal) return null;
    var natName = topA.natal;
    var lon = reading.natal[natName];
    if (typeof lon !== 'number') return null;
    var sign = signOf(lon);
    var full = '';
    try { full = I.getPlanetInterpretation(natName, sign); } catch (e) { full = ''; }
    var open = firstSentence(full);
    if (!open) return null;
    return { natName: natName, sign: sign, open: open };
  }

  function renderTease() {
    var reading = _reading;
    var ctaLink = ' <a class="dt-tease__link" href="eclipse.html#contact">Compare this chart with the eclipse →</a>';

    var snip = reading ? deepTeaserSnippet(reading) : null;
    if (snip) {
      return '<div class="dt-tease dt-tease--rich">' +
        '<p class="dt-tease__eyebrow">From your saved chart</p>' +
        '<p class="dt-tease__excerpt">' + esc(snip.natName) + ' in ' + esc(snip.sign) + ' &mdash; ' + esc(snip.open) + '</p>' +
        '<p class="dt-tease__lock">Now see whether the 12 August eclipse makes a direct contact with this chart.</p>' +
        '<p class="dt-tease__cta">' + ctaLink + '</p>' +
      '</div>';
    }

    // No engine yet — lazy-load it once for a saved-chart reader, re-render on ready.
    if (reading && reading.natal && reading.aspects && reading.aspects.length && !window.AstroInterpretations) {
      ensureInterp(function () { try { refresh(); } catch (e) {} });
    }
    var line = 'This is today’s surface. Compare the saved chart with the 12 August eclipse.';
    return '<p class="dt-tease">' + line + ctaLink + '</p>';
  }

  // ── mount / refresh ────────────────────────────────────────────────────────

  function findTarget(target) {
    if (target && target.nodeType === 1) return target;
    return document.getElementById('daily-transit-card');
  }

  function doRender(target) {
    injectStyle();
    var date = new Date();
    var natal = loadNatal();
    if (!natal) {
      renderEmpty(target, date);
      return;
    }
    var reading = buildReading(date);
    renderReading(target, reading, date);
  }

  function whenReady(cb) {
    var tries = 0;
    (function poll() {
      if (window.AstroEphemeris && window.AstroProfile) { cb(); return; }
      if (tries++ > 40) { cb(); return; } // ~12s ceiling, then render best-effort
      setTimeout(poll, 300);
    })();
  }

  function mount(target) {
    var el = findTarget(target);
    if (!el) return;
    whenReady(function () { doRender(el); });
  }

  function refresh(target) {
    var el = findTarget(target);
    if (!el) return;
    doRender(el);
  }

  window.DailyTransit = {
    mount: mount,
    refresh: refresh,
    buildReading: buildReading,
    getReading: getReading,
    bumpStreak: bumpStreak
  };

  // Auto-mount if the host page provides the container.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { mount(); });
  } else {
    mount();
  }
})();
