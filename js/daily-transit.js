/* ============================================================================
 * daily-transit.js — "Your Sky Today" personalised daily transit card
 * ----------------------------------------------------------------------------
 * Habit-forming, privacy-clean daily reading that renders at the top of the
 * personal section on transits.html. Everything runs in the browser.
 *
 *   - Auto-loads the visitor's most recent SAVED natal chart from localStorage
 *     (AstroProfile `ap_charts`, key/shape per the chart.html save path).
 *   - `ap_charts` entries hold only birth data + sign strings (NO planet
 *     longitudes), so a full natal chart is RE-DERIVED client-side via
 *     AstroProfile.buildChartData() (which replays AstroEphemeris and handles
 *     local->UT conversion). If only Sun/Moon/Asc are available we fall back to
 *     the lightweight `ap_natal_pins` store.
 *   - Computes TODAY's transit-to-natal aspects through the real VSOP87/ELP2000
 *     engine and produces a DETERMINISTIC reading via AstroOracle.getDailyInsight
 *     (seeded by date XOR chart — stable on reload, fresh each day). Output is
 *     cached by ISO date in localStorage and recomputed when the date rolls over.
 *   - If NO saved chart exists, renders a graceful "cast & save a chart" card —
 *     never fabricates a chart.
 *   - A gentle, privacy-clean visit-streak counter ("Day 7 — seven days running").
 *   - A quiet, dormant-safe tease toward the Deep Reading (reuses AP_MON; no
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

  var ASPECTS = [
    { name: 'Conjunction', angle: 0,   orb: 6, glyph: '☌', quality: 'c' },
    { name: 'Sextile',     angle: 60,  orb: 4, glyph: '⚹', quality: 'h' },
    { name: 'Square',      angle: 90,  orb: 5, glyph: '□', quality: 'x' },
    { name: 'Trine',       angle: 120, orb: 5, glyph: '△', quality: 'h' },
    { name: 'Opposition',  angle: 180, orb: 6, glyph: '☍', quality: 'x' }
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

  // ── chart loading (saved → re-derived natal positions) ─────────────────────

  // Returns { positions, label, mode, chartId } or null.
  //   positions: object usable directly by AstroOracle.getDailyInsight
  //   mode: 'full' (all planets) | 'pins' (Sun/Moon/Asc only)
  function loadNatal() {
    var P = window.AstroProfile;

    // (A) Recompute a full natal chart from the most recent saved birth data.
    if (P && typeof P.getCharts === 'function' && typeof P.buildChartData === 'function') {
      var charts = P.getCharts();
      if (charts && charts.length) {
        var c = charts[0];
        // Honor the dashboard's "Set as today's chart" (localStorage 'ap_active_chart' = chart id)
        try {
          var activeId = localStorage.getItem('ap_active_chart');
          if (activeId) {
            var found = charts.filter(function (x) { return String(x.id) === String(activeId); })[0]
                        || (typeof P.getChart === 'function' ? P.getChart(activeId) : null);
            if (found) c = found;
          }
        } catch (e) {}
        if (c && c.birthDate && isFinite(parseFloat(c.lat)) && isFinite(parseFloat(c.lon))) {
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
        // Birth data incomplete but a chart row exists — degrade to its signs
        // via the pins store below.
      }
    }

    // (B) Lightweight fallback — Sun/Moon/(Asc) longitudes only.
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
      'background:linear-gradient(90deg,var(--gold,#c9a227),var(--purple,#5c4a6e));opacity:0.8;}' +
      '.dt-card__top{display:flex;align-items:center;justify-content:space-between;gap:1rem;' +
      'flex-wrap:wrap;margin-bottom:1.25rem;}' +
      '.dt-card__eyebrow{font-size:0.62rem;font-weight:600;letter-spacing:0.28em;' +
      'text-transform:uppercase;color:var(--gold,#c9a227);margin:0 0 0.4rem;}' +
      '.dt-card__date{font-size:0.8rem;color:var(--silver-dim,#8891AA);margin:0;letter-spacing:0.04em;}' +
      '.dt-card__streak{display:inline-flex;align-items:center;gap:0.45rem;' +
      'background:rgba(201, 162, 39,0.1);border:1px solid rgba(201, 162, 39,0.28);border-radius:999px;' +
      'padding:0.35rem 0.85rem;font-size:0.72rem;color:var(--gold-light,#E8C872);' +
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
      '.dt-aspect__rel{font-size:0.95rem;color:var(--gold,#c9a227);width:1.4rem;text-align:center;flex-shrink:0;}' +
      '.dt-aspect__text{flex:1;min-width:0;}' +
      '.dt-aspect__name{font-size:0.78rem;font-weight:600;color:var(--white,#F8F4EE);' +
      'letter-spacing:0.02em;margin:0;}' +
      '.dt-aspect__detail{font-size:0.72rem;color:var(--silver-dim,#8891AA);margin:0.15rem 0 0;line-height:1.5;}' +
      '.dt-aspect__orb{font-size:0.68rem;color:var(--gold,#c9a227);white-space:nowrap;flex-shrink:0;opacity:0.85;}' +
      '.dt-meta{display:flex;flex-wrap:wrap;gap:0.5rem;margin:0 0 1.5rem;}' +
      '.dt-chip{display:inline-flex;align-items:center;gap:0.4rem;font-size:0.72rem;' +
      'color:var(--silver,#C8D0E8);background:rgba(255,255,255,0.04);' +
      'border:1px solid var(--border,rgba(255,255,255,0.08));border-radius:999px;padding:0.3rem 0.75rem;}' +
      '.dt-keywords{display:flex;flex-wrap:wrap;gap:0.4rem;margin:0 0 1.25rem;}' +
      '.dt-keyword{font-size:0.62rem;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;' +
      'color:var(--gold-light,#E8C872);background:rgba(92, 74, 110,0.12);' +
      'border:1px solid rgba(92, 74, 110,0.3);border-radius:999px;padding:0.25rem 0.7rem;}' +
      '.dt-tease{border-top:1px solid var(--border,rgba(255,255,255,0.08));padding-top:1.25rem;' +
      'margin-top:0.5rem;font-size:0.82rem;color:var(--silver-dim,#8891AA);line-height:1.7;}' +
      '.dt-tease a{color:var(--gold,#c9a227);text-decoration:none;border-bottom:1px solid rgba(201, 162, 39,0.4);' +
      'transition:border-color 0.2s;}' +
      '.dt-tease a:hover{border-bottom-color:var(--gold,#c9a227);}' +
      '.dt-empty{text-align:center;}' +
      '.dt-empty__icon{display:block;margin:0 auto 1rem;}' +
      '.dt-empty h3{font-family:var(--font-display,"Cinzel",serif);font-size:1.3rem;font-weight:700;' +
      'color:var(--white,#F8F4EE);margin:0 0 0.6rem;}' +
      '.dt-empty p{font-size:0.9rem;color:var(--silver-dim,#8891AA);line-height:1.7;' +
      'max-width:420px;margin:0 auto 1.6rem;}';
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
    var detail = 'Transiting ' + a.transit + (posText ? ' in ' + posText : '') +
      ' ' + a.aspect.toLowerCase() + ' your natal ' + a.natal + '.';
    return '<div class="dt-aspect">' +
      '<span class="dt-aspect__orbs" aria-hidden="true">' +
        planetOrb(a.transit, { sm: true }) + planetOrb(a.natal, { sm: true }) +
      '</span>' +
      '<span class="dt-aspect__rel" aria-hidden="true">' + a.glyph + '</span>' +
      '<span class="dt-aspect__text">' +
        '<p class="dt-aspect__name">' + esc(a.transit) + ' ' + esc(a.aspect) +
          ' ' + esc(a.natal) + '</p>' +
        '<p class="dt-aspect__detail">' + esc(detail) + '</p>' +
      '</span>' +
      '<span class="dt-aspect__orb">' + a.orb.toFixed(1) + '°</span>' +
    '</div>';
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
        metaChips +
        keywordsHtml +
        teaseHtml +
      '</div>';
  }

  function renderTease() {
    var M = window.AP_MON || {};
    var url = typeof M.reportUrl === 'string' ? M.reportUrl.trim() : '';
    var hasUrl = /^https?:\/\//i.test(url);
    var line = 'This is the surface. Your Deep Reading goes pages deeper into why ' +
      'these transits land the way they do.';
    if (hasUrl) {
      return '<p class="dt-tease">' + line +
        ' <a href="' + esc(url) + '" target="_blank" rel="noopener" data-mon="report">' +
        'Explore the Deep Reading →</a></p>';
    }
    // Dormant-safe: visible quiet line, link hidden until AP_MON is configured.
    return '<p class="dt-tease">' + line +
      ' <a href="#" data-mon="report" data-mon-mode="hide" style="display:none">' +
      'Explore the Deep Reading →</a></p>';
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
