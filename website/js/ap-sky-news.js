/**
 * AP Sky News — "The real sky news" instrument
 * ---------------------------------------------------------------------------
 * Computes live sky events from AstroEphemeris and drives the Void orrery
 * (void-orrery #orr) or Orrery3D when present. NASA Eyes-class briefing strip:
 * mono receipts, arcminutes, fly-to, not content-farm horoscope filler.
 *
 * Honesty: weather report of the sky. No prophecy. Reduced-motion = static list.
 */
(function (w) {
  'use strict';

  var SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
  var GLYPH = { Sun:'☉', Moon:'☽', Mercury:'☿', Venus:'♀', Mars:'♂', Jupiter:'♃', Saturn:'♄', Uranus:'♅', Neptune:'♆', Pluto:'♇' };
  var KEY = { Sun:'sun', Moon:'moon', Mercury:'mercury', Venus:'venus', Mars:'mars', Jupiter:'jupiter', Saturn:'saturn', Uranus:'uranus', Neptune:'neptune', Pluto:'pluto' };
  var BODIES = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'];

  function E() { return w.AstroEphemeris; }
  function nowJD() {
    var d = new Date();
    return E().julianDay(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds());
  }
  function lonOf(name, jd) {
    var eng = E();
    if (!eng) return null;
    // Prefer bulk table when present (one JD evaluation)
    if (typeof eng.allPlanetPositions === 'function') {
      try {
        var bulk = eng.allPlanetPositions(jd);
        var row = bulk && (bulk[name] || bulk[name.toLowerCase()]);
        if (row && typeof row.lon === 'number') return row.lon;
      } catch (e0) { /* fall through */ }
    }
    var fn = {
      Sun: eng.sunPosition, Moon: eng.moonPosition, Mercury: eng.mercuryPosition,
      Venus: eng.venusPosition, Mars: eng.marsPosition, Jupiter: eng.jupiterPosition,
      Saturn: eng.saturnPosition, Uranus: eng.uranusPosition, Neptune: eng.neptunePosition, Pluto: eng.plutoPosition
    }[name];
    if (typeof fn !== 'function') return null;
    try {
      var r = fn.call(eng, jd);
      return r && typeof r.lon === 'number' ? r.lon : null;
    } catch (e) { return null; }
  }
  function allLons(jd) {
    var o = {};
    var eng = E();
    if (eng && typeof eng.allPlanetPositions === 'function') {
      try {
        var bulk = eng.allPlanetPositions(jd);
        BODIES.forEach(function (n) {
          var row = bulk[n] || bulk[n.toLowerCase()];
          if (row && typeof row.lon === 'number' && isFinite(row.lon)) {
            o[n] = ((row.lon % 360) + 360) % 360;
          }
        });
        if (Object.keys(o).length >= 8) return o;
      } catch (e1) { /* fall through per-body */ }
    }
    BODIES.forEach(function (n) {
      var L = lonOf(n, jd);
      if (L != null && isFinite(L)) o[n] = ((L % 360) + 360) % 360;
    });
    return o;
  }
  function fmtDeg(lon) {
    lon = ((lon % 360) + 360) % 360;
    var si = Math.floor(lon / 30);
    var d = lon - si * 30;
    var dg = Math.floor(d);
    var mn = Math.round((d - dg) * 60);
    if (mn === 60) { mn = 0; dg += 1; }
    return dg + '°' + String(mn).padStart(2, '0') + '′ ' + SIGNS[si];
  }
  /**
   * Unsigned angular separation, folded into [0, 180].
   * Correct for ASPECTS and pair proximity: an aspect is symmetric, so which
   * body leads carries no meaning there.
   * NEVER use this for Moon phase. Folding destroys the waxing/waning sign —
   * a true 303.6° elongation reads back as 56.4°, which named a waning
   * crescent "waxing crescent" and made every waning branch unreachable.
   * Use elongation() for anything phase-shaped.
   */
  function sep(a, b) {
    var d = Math.abs(a - b) % 360;
    return d > 180 ? 360 - d : d;
  }
  /**
   * Sun→Moon elongation measured eastward along the ecliptic, in [0, 360):
   * 0 new · 90 first quarter · 180 full · 270 last quarter.
   * Below 180 the Moon is waxing; at or above 180 it is waning.
   */
  function elongation(moonLon, sunLon) {
    return (((moonLon - sunLon) % 360) + 360) % 360;
  }
  /**
   * The eight principal phases as 45° bins centred on the cardinal points.
   * Deliberately the same ladder index.html's tonight() panel and js/tonight.js
   * use, so the band and the panel on the same page cannot name different
   * phases at the same minute.
   */
  var PHASES = ['New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous',
    'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent'];
  function phaseName(elong) {
    var e = ((((elong % 360) + 360) % 360) + 22.5) % 360;
    return PHASES[Math.floor(e / 45)];
  }
  /** Illuminated fraction as a whole percent, from the same elongation. */
  function illumPct(elong) {
    return Math.round((1 - Math.cos(elong * Math.PI / 180)) / 2 * 100);
  }
  function daysToJD(days) { return nowJD() + days; }

  /** Read saved chart longitudes from localStorage (privacy: never leaves device). */
  function loadSavedNatalLons() {
    try {
      if (w.AstroProfile && typeof w.AstroProfile.getActiveChart === 'function') {
        var c0 = w.AstroProfile.getActiveChart();
        if (c0 && c0.positions) return positionsToLons(c0.positions);
      }
      var raw = w.localStorage && w.localStorage.getItem('ap_charts');
      if (!raw) return null;
      var charts = JSON.parse(raw);
      if (!charts || !charts.length) return null;
      var activeId = w.localStorage.getItem('ap_active_chart');
      var chart = charts.find(function (c) { return c && c.id === activeId; }) || charts[0];
      if (!chart || !chart.positions) return null;
      return positionsToLons(chart.positions);
    } catch (e) { return null; }
  }
  function positionsToLons(pos) {
    var out = {};
    Object.keys(pos).forEach(function (k) {
      var p = pos[k];
      if (!p) return;
      var lon = typeof p.lon === 'number' ? p.lon : (typeof p.longitude === 'number' ? p.longitude : null);
      if (lon == null || !isFinite(lon)) return;
      var key = k.charAt(0).toUpperCase() + k.slice(1);
      if (k === 'Ascendant' || k === 'asc' || k === 'Rising') key = 'Ascendant';
      out[key] = ((lon % 360) + 360) % 360;
      // also Sun/Moon style
      if (/^sun$/i.test(k)) out.Sun = out[key];
      if (/^moon$/i.test(k)) out.Moon = out[key];
    });
    return Object.keys(out).length ? out : null;
  }

  /** Build ranked news items (highest signal first). */
  function buildNews(opts) {
    opts = opts || {};
    var eng = E();
    if (!eng) return [];
    // opts.jd is a test/proof seam only — the page never passes it.
    var jd = (opts.jd != null && isFinite(opts.jd)) ? Number(opts.jd) : nowJD();
    var L = allLons(jd);
    var items = [];
    var moon = L.Moon, sun = L.Sun;

    // Moon phase + sign
    if (moon != null && sun != null) {
      var elong = elongation(moon, sun);
      var phase = phaseName(elong);
      var illum = illumPct(elong);
      items.push({
        id: 'moon',
        kicker: 'MOON',
        title: GLYPH.Moon + ' ' + phase,
        // The unfolded 0–360° figure stays printed to one decimal: it is the
        // number test-sky-news-moon-phase.mjs reads back to prove the waxing /
        // waning branch was not folded. Only the label changed — "elongation"
        // is a word nobody outside the trade uses.
        detail: fmtDeg(moon) + ' · about ' + illum + '% lit · ' + (elong < 180 ? 'waxing' : 'waning') +
          ' · ' + elong.toFixed(1) + '° round the sky from the Sun',
        fly: 'moon',
        score: 100
      });
    }

    // Tightest non-luminary pair (evening signal)
    var pairBest = null;
    ['Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'].forEach(function (a, i, arr) {
      for (var j = i + 1; j < arr.length; j++) {
        var b = arr[j];
        if (L[a] == null || L[b] == null) continue;
        var s = sep(L[a], L[b]);
        if (!pairBest || s < pairBest.s) pairBest = { a: a, b: b, s: s };
      }
    });
    if (pairBest && pairBest.s < 12) {
      items.push({
        id: 'pair',
        kicker: 'TIGHTEST PAIR',
        title: GLYPH[pairBest.a] + ' ' + pairBest.a + ' · ' + GLYPH[pairBest.b] + ' ' + pairBest.b,
        detail: pairBest.s.toFixed(2) + '° separation as we see them from Earth · ' +
          fmtDeg(L[pairBest.a]) + ' and ' + fmtDeg(L[pairBest.b]),
        fly: KEY[pairBest.a],
        flyB: KEY[pairBest.b],
        score: 95 - pairBest.s
      });
    }

    // Retrograde board (lon decrease over 3 days)
    var retro = [];
    BODIES.forEach(function (n) {
      if (n === 'Sun' || n === 'Moon') return;
      var a = lonOf(n, jd), b = lonOf(n, jd + 3);
      if (a == null || b == null) return;
      var da = ((b - a + 540) % 360) - 180;
      if (da < -0.01) retro.push(n);
    });
    if (retro.length) {
      items.push({
        id: 'rx',
        kicker: 'RETROGRADE',
        title: retro.map(function (n) { return GLYPH[n] + ' ' + n; }).join(' · '),
        detail: (retro.length === 1 ? 'One planet is' : retro.length + ' planets are') +
          ' moving backwards against the stars right now, seen from here · measured over the next three days, not predicted · tradition, not advice',
        fly: KEY[retro[0]],
        score: 70
      });
    }

    // Personal: transit-to-natal when a saved chart exists (full-chart habit loop)
    var natal = loadSavedNatalLons();
    if (natal && L.Sun != null) {
      var bestT = null;
      var bestWide = null;
      ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'].forEach(function (tr) {
        if (L[tr] == null) return;
        ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Ascendant'].forEach(function (na) {
          if (natal[na] == null) return;
          var s = sep(L[tr], natal[na]);
          var aspects = [0, 60, 90, 120, 180];
          var nearest = 999, kind = '';
          aspects.forEach(function (a) {
            var o = Math.abs(s - a);
            if (o < nearest) {
              nearest = o;
              // Plain verb phrases, not the trade's nouns. Audience research
              // (2026-08-08) measured "sextile" as vocabulary readers do not
              // have; "at an easy angle to" says the same thing and reads.
              kind = a === 0 ? 'sitting on' : a === 60 ? 'at an easy angle to'
                : a === 90 ? 'squaring' : a === 120 ? 'in a flowing trine to' : 'facing';
            }
          });
          if (nearest <= 3 && (!bestT || nearest < bestT.orb)) {
            bestT = { tr: tr, na: na, kind: kind, orb: nearest };
          }
          if (nearest <= 8 && (!bestWide || nearest < bestWide.orb)) {
            bestWide = { tr: tr, na: na, kind: kind, orb: nearest };
          }
        });
      });
      if (bestT) {
        items.push({
          id: 'transit-natal',
          kicker: 'YOUR CHART TODAY',
          title: (GLYPH[bestT.tr] || '') + ' ' + bestT.tr + ' ' + bestT.kind + ' your ' + (GLYPH[bestT.na] || '') + ' ' + bestT.na,
          detail: 'Within ' + bestT.orb.toFixed(2) + '° of exact · read off the chart saved on this device · your own placements, not a sun-sign blurb',
          fly: KEY[bestT.tr] || 'sun',
          score: 92 - bestT.orb
        });
      } else if (bestWide) {
        items.push({
          id: 'transit-natal-wide',
          kicker: 'YOUR CHART · LOOSE',
          title: (GLYPH[bestWide.tr] || '') + ' ' + bestWide.tr + ' ' + bestWide.kind + ' your ' + (GLYPH[bestWide.na] || '') + ' ' + bestWide.na,
          detail: 'Within ' + bestWide.orb.toFixed(2) + '° of exact — a loose one · still your own chart, on this device · not a sun-sign blurb',
          fly: KEY[bestWide.tr] || 'sun',
          score: 78 - bestWide.orb
        });
      } else {
        var hasAsc = natal.Ascendant != null;
        items.push({
          id: 'chart-quiet',
          kicker: 'YOUR CHART',
          title: hasAsc
            ? 'A quiet day in your chart'
            : 'Your chart is here · add your birth place for your rising',
          detail: hasAsc
            ? 'Nothing is close to your placements right now, and that is a real reading — quiet charts are real, the sky is not always loud. Your chart stays on this device.'
            : 'This cast has your planets. Add your birth place on the full chart and this strip can name what today is touching in your rising too.',
          href: hasAsc ? './transits.html' : './chart.html',
          fly: 'earth',
          score: 74
        });
      }
    } else {
      // Research P1: prompt full-chart personalisation without faking a chart
      items.push({
        id: 'cast-cta',
        kicker: 'PERSONALISE',
        title: 'Cast your free birth chart · your own sky news',
        detail: 'Save a chart on this device and this strip names what today’s sky is actually touching in your placements — never a sun-sign blurb.',
        href: './index.html#cast',
        fly: 'earth',
        score: 55
      });
    }

    // Eclipse, Wednesday 12 August 2026.
    // No day count here on purpose. index.html already prints one in its own
    // dateline, and two counters on one page is how a page looks unfinished.
    // This card carries what that line cannot: when it starts, when it is
    // deepest where you are, and the one safety rule.
    // 17:46 is rounded UT (NASA GSFC: 17:47:06 TDT, ΔT 75.4 s, 17:45:51 UT = 18:46 BST).
    // An earlier version of this comment claimed 17:46 was TD; it is not, and the
    // correction is written out in full in eclipse.html. Either reading moves the
    // Sun about 3 seconds of arc, so the longitude below is unaffected.
    // It is greatest eclipse 45 km off western Iceland, so it is not a UK time and
    // is not printed as one. Britain never reaches totality: that is Iceland and
    // northern Spain.
    var eclJD = eng.julianDay(2026, 8, 12, 17, 46, 0);
    var days = eclJD - jd;
    if (days > -2 && days < 120) {
      var eclLon = lonOf('Sun', eclJD);
      items.push({
        id: 'eclipse',
        kicker: 'WEDNESDAY 12 AUGUST 2026',
        title: days < 0 ? '☉ The eclipse Britain just watched' : '☉ The Sun goes deep partial over Britain',
        detail: 'First bite 18:08–18:17 BST · deepest about 19:12 in London, 19:05 in Edinburgh, 19:16 in Truro · 88–96% of the Sun covered' +
          (eclLon != null ? ' · it lands at ' + fmtDeg(eclLon) : '') +
          ' · Britain never reaches totality, so eclipse glasses stay on the whole way through.',
        href: './eclipse.html',
        fly: 'sun',
        score: 90
      });
    }

    // Sign ingresses within 14 days (sample daily)
    ['Mercury','Venus','Mars','Sun','Moon'].forEach(function (n) {
      var L0 = lonOf(n, jd);
      if (L0 == null) return;
      var s0 = Math.floor(L0 / 30);
      for (var d = 1; d <= 14; d++) {
        var Ld = lonOf(n, jd + d);
        if (Ld == null) continue;
        var sd = Math.floor((((Ld % 360) + 360) % 360) / 30);
        if (sd !== s0) {
          items.push({
            id: 'ingress-' + n,
            kicker: 'INGRESS',
            title: GLYPH[n] + ' ' + n + ' → ' + SIGNS[sd],
            detail: (d === 1 ? 'Tomorrow' : 'In about ' + d + ' days') +
              ' · now at ' + fmtDeg(L0) + ' · worked out on this device',
            fly: KEY[n],
            score: 60 - d
          });
          break;
        }
      }
    });

    // Drop anything the host page already prints for itself. index.html has a
    // full Moon / tightest-pair / retrograde readout of its own directly under
    // this strip, and rendering both put the same Moon on screen twice.
    // Declared in the markup (data-ap-exclude) so every mount of that host —
    // including the re-mount after a cast — honours it without repeating a list.
    if (opts.exclude && opts.exclude.length) {
      items = items.filter(function (it) { return opts.exclude.indexOf(it.id) === -1; });
    }

    items.sort(function (a, b) { return b.score - a.score; });
    return items.slice(0, opts.limit || 8);
  }

  function orrery() {
    return document.getElementById('orr') || document.querySelector('void-orrery');
  }

  function driveModel(item) {
    var o = orrery();
    if (o && item.fly && typeof o.flyTo === 'function') {
      try { o.flyTo(item.fly); } catch (e) { /* optional */ }
    }
    var O = w.Orrery3D;
    if (O) {
      try {
        if (item.fly && typeof O.focusPlanet === 'function') O.focusPlanet(item.fly);
        if (item.fly && item.flyB && typeof O.focusAspect === 'function') {
          O.focusAspect(item.fly, item.flyB, { holdMs: 8000 });
        }
      } catch (e2) { /* optional */ }
    }
  }

  // Eclipse campaign: when the 12 Aug eclipse card is the active card on the
  // homepage band, fly to the sun and sink the engine into eclipse mode; any
  // other active card restores normal lighting. Guarded — the mounted
  // <void-orrery> may be an older build without setEclipse.
  // 0.90 is London's maximum. The UK spread is 88–96% (Truro deepest, Edinburgh
  // shallowest of the three cities we name), so the model shows the middle of
  // the country rather than the best seat in it.
  var autoEclipse = 0;
  function driveEclipse(item) {
    var o = orrery();
    if (!o || typeof o.setEclipse !== 'function') return;
    if (item && item.id === 'eclipse' && item.fly === 'sun') {
      try { if (typeof o.flyTo === 'function') o.flyTo('sun'); } catch (e0) { /* optional */ }
      setTimeout(function () { try { o.setEclipse(0.90, true); } catch (e1) { /* optional */ } }, 700); // after the fly begins
    } else {
      try { o.setEclipse(0); } catch (e2) { /* optional */ }
    }
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /**
   * `data-ap-exclude="moon pair rx"` on the host → card ids this page already
   * prints for itself. Merged into opts.exclude, de-duplicated because mount()
   * re-enters itself through ctl.refresh() with the merged opts.
   */
  function mergeHostExclude(host, opts) {
    var raw = host && host.getAttribute && host.getAttribute('data-ap-exclude');
    if (!raw) return opts;
    var seen = {}, out = [];
    (opts.exclude || []).concat(String(raw).split(/[\s,]+/)).forEach(function (id) {
      if (id && !seen[id]) { seen[id] = 1; out.push(id); }
    });
    opts.exclude = out;
    return opts;
  }

  /* Host-owned camera policy: false stops carousel/timer movement, never taps. */
  function allowsAutoDrive(host) {
    return !(host && host.getAttribute && host.getAttribute('data-ap-auto-drive') === 'false');
  }

  function mount(host, opts) {
    opts = opts || {};
    if (!host || !E()) return null;
    opts = mergeHostExclude(host, opts);
    var autoDrive = allowsAutoDrive(host);
    // Stop prior controller if remounting same host
    if (host._apSkyNewsCtl && typeof host._apSkyNewsCtl.stop === 'function') {
      host._apSkyNewsCtl.stop();
    }
    var items = buildNews(opts);
    var prm = w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches;
    host.classList.add('ap-sky-news');
    host.setAttribute('role', 'region');
    host.setAttribute('aria-label', 'The real sky news — computed this minute. Weather report of the sky, not prophecy.');
    host.setAttribute('aria-live', 'polite');

    var head = document.createElement('div');
    head.className = 'ap-sky-news__head';
    head.innerHTML =
      '<span class="ap-sky-news__live" aria-hidden="true">●</span>' +
      '<span class="ap-sky-news__brand">THE REAL SKY NEWS</span>' +
      '<span class="ap-sky-news__sub">COMPUTED THIS MINUTE · WEATHER REPORT, NOT PROPHECY</span>';

    var track = document.createElement('div');
    track.className = 'ap-sky-news__track' + (prm ? ' ap-sky-news__track--static' : '');
    track.setAttribute('role', 'group');
    track.setAttribute('aria-label', 'Sky news items');

    if (!items.length) {
      var empty = document.createElement('p');
      empty.className = 'ap-sky-news__empty';
      empty.textContent = 'Warming up… tonight’s sky appears as soon as the engine has it.';
      track.appendChild(empty);
    }

    items.forEach(function (it, i) {
      var card = document.createElement(it.href ? 'a' : 'button');
      card.className = 'ap-sky-news__card';
      // Native <a>/<button> already expose roles — avoid invalid listitem on them
      var label = (it.kicker || '') + ': ' + (it.title || '') + '. ' + (it.detail || '');
      card.setAttribute('aria-label', label + (it.href ? ' Open page.' : ' Fly model to this body.'));
      if (it.href) { card.href = it.href; }
      else { card.type = 'button'; }
      card.tabIndex = i === 0 ? 0 : -1;
      card.innerHTML =
        '<span class="ap-sky-news__kicker">' + esc(it.kicker) + '</span>' +
        '<span class="ap-sky-news__title">' + esc(it.title) + '</span>' +
        '<span class="ap-sky-news__detail">' + esc(it.detail) + '</span>' +
        '<span class="ap-sky-news__cta" aria-hidden="true">' + (it.href ? 'OPEN →' : 'FLY THE MODEL →') + '</span>';
      card.addEventListener('click', function (ev) {
        if (!it.href) ev.preventDefault();
        driveModel(it);
        if (host.id === 'ap-sky-news-band') driveEclipse(it); // keep eclipse mode in sync with the tapped card
        host.dispatchEvent(new CustomEvent('ap-sky-news-select', { detail: it, bubbles: true }));
      });
      card.addEventListener('keydown', function (ev) {
        var cards = track.querySelectorAll('.ap-sky-news__card');
        var list = Array.prototype.slice.call(cards);
        var at = list.indexOf(card);
        if (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') {
          ev.preventDefault();
          var next = list[(at + 1) % list.length];
          if (next) { list.forEach(function (c) { c.tabIndex = -1; }); next.tabIndex = 0; next.focus(); }
        } else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp') {
          ev.preventDefault();
          var prev = list[(at - 1 + list.length) % list.length];
          if (prev) { list.forEach(function (c) { c.tabIndex = -1; }); prev.tabIndex = 0; prev.focus(); }
        } else if (ev.key === 'Enter' || ev.key === ' ') {
          if (!it.href) { ev.preventDefault(); card.click(); }
        }
      });
      track.appendChild(card);
      if (!prm && i === 0) card.classList.add('ap-sky-news__card--on');
    });

    host.innerHTML = '';
    host.removeAttribute('aria-busy');
    host.appendChild(head);
    host.appendChild(track);

    // Auto-cycle highlight only (never auto-fly unless opts.autoFly)
    var idx = 0;
    var timer = null;
    var flyTimer = null;
    function cycle() {
      // Skip scroll/focus thrash while user is keyboard-navigating the track
      if (track.contains(document.activeElement)) return;
      var cards = track.querySelectorAll('.ap-sky-news__card');
      if (!cards.length) return;
      cards.forEach(function (c) { c.classList.remove('ap-sky-news__card--on'); c.removeAttribute('aria-current'); });
      var el = cards[idx];
      if (!el) return;
      el.classList.add('ap-sky-news__card--on');
      el.setAttribute('aria-current', 'true');
      // Do not scrollIntoView on auto-cycle — disturbs keyboard/scroll position
      if (autoDrive && host.id === 'ap-sky-news-band') { var eit = items[idx]; if (autoEclipse === 0 && eit && eit.id === 'eclipse') { driveEclipse(eit); autoEclipse = 1; } else if (autoEclipse === 1) { driveEclipse(eit); if (!eit || eit.id !== 'eclipse') autoEclipse = 2; } } // one auto-reveal per session; clicks always drive
      if (opts.autoFly === true && items[idx] && !items[idx].href) {
        driveModel(items[idx]);
      }
      idx = (idx + 1) % cards.length;
    }
    if (!prm && opts.autoCycle !== false && items.length > 1) {
      timer = setInterval(cycle, opts.cycleMs || 7000);
    }
    if (opts.autoFly === true && items[0]) {
      flyTimer = setTimeout(function () { driveModel(items[0]); }, opts.flyDelayMs || 1200);
    }
    // Band: the initially highlighted card may be the eclipse card (auto-cycle's first
    // tick is seconds away) — settle the eclipse state shortly after the settle fly.
    if (autoDrive && !prm && host.id === 'ap-sky-news-band' && items[0]) {
      setTimeout(function () { driveEclipse(items[0]); }, (opts.flyDelayMs || 1200) + 500);
    }

    var ctl = {
      items: items,
      refresh: function () { mount(host, opts); },
      stop: function () {
        if (timer) { clearInterval(timer); timer = null; }
        if (flyTimer) { clearTimeout(flyTimer); flyTimer = null; }
      }
    };
    host._apSkyNewsCtl = ctl;
    return ctl;
  }

  var _mountTries = 0;
  function autoMount() {
    if (!E()) {
      ['ap-sky-news', 'ap-sky-news-band'].forEach(function (id) {
        var h = document.getElementById(id);
        if (h) {
          h.setAttribute('aria-busy', 'true');
          h.setAttribute('role', 'region');
          h.setAttribute('aria-label', 'The real sky news — engine loading');
          h.innerHTML = '<div class="ap-sky-news__head"><span class="ap-sky-news__brand">THE REAL SKY NEWS</span><span class="ap-sky-news__sub">ENGINE LOADING…</span></div>';
        }
      });
      // Bounded retry if ephemeris script order races
      if (_mountTries++ < 8) setTimeout(autoMount, 350);
      return;
    }
    _mountTries = 0;
    var narrow = w.matchMedia && w.matchMedia('(max-width: 900px)').matches;
    // Hero overlay desktop only — band is the reliable surface on phone (CSS hides hero ≤900px)
    var hero = document.getElementById('ap-sky-news');
    if (hero && !narrow) mount(hero, { autoFly: false, autoCycle: true, cycleMs: 9000, limit: 5 });
    // Tonight band: one settle fly, then click-driven
    var band = document.getElementById('ap-sky-news-band');
    if (band) {
      mount(band, { autoFly: allowsAutoDrive(band) && !narrow, autoCycle: true, cycleMs: 10000, limit: 6, flyDelayMs: 1800 });
    }
  }

  w.APSkyNews = {
    buildNews: buildNews, mount: mount, driveModel: driveModel,
    // Pure helpers, exported so the phase maths is testable without a DOM.
    elongation: elongation, phaseName: phaseName, illumPct: illumPct, separation: sep
  };

  // Browser only — keep buildNews usable under Node proofs
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', autoMount, { once: true });
    } else {
      autoMount();
    }
  }
})(typeof window !== 'undefined' ? window : globalThis);
