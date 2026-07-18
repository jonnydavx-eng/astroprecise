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
  function sep(a, b) {
    var d = Math.abs(a - b) % 360;
    return d > 180 ? 360 - d : d;
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
    var jd = nowJD();
    var L = allLons(jd);
    var items = [];
    var moon = L.Moon, sun = L.Sun;

    // Moon phase + sign
    if (moon != null && sun != null) {
      var elong = sep(moon, sun);
      var phase =
        elong < 10 ? 'New Moon window' :
        elong < 80 ? 'Waxing crescent / first quarter approach' :
        elong < 100 ? 'Near first quarter' :
        elong < 170 ? 'Waxing gibbous' :
        elong < 190 ? 'Full Moon window' :
        elong < 260 ? 'Waning gibbous' :
        elong < 280 ? 'Near last quarter' : 'Waning crescent';
      var illum = Math.round((1 - Math.cos(elong * Math.PI / 180)) / 2 * 100);
      items.push({
        id: 'moon',
        kicker: 'MOON',
        title: GLYPH.Moon + ' ' + phase,
        detail: fmtDeg(moon) + ' · ~' + illum + '% illuminated · elongation ' + elong.toFixed(1) + '° from Sun',
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
        detail: pairBest.s.toFixed(2) + '° separation (geocentric) · ' + fmtDeg(L[pairBest.a]) + ' / ' + fmtDeg(L[pairBest.b]),
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
        detail: retro.length + ' body(ies) currently retrograde (longitude decreasing over 3d sample) · tradition only — not advice',
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
              kind = a === 0 ? 'conjunct' : a === 60 ? 'sextile' : a === 90 ? 'square' : a === 120 ? 'trine' : 'opposite';
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
          title: (GLYPH[bestT.tr] || '') + ' ' + bestT.tr + ' ' + bestT.kind + ' natal ' + (GLYPH[bestT.na] || '') + ' ' + bestT.na,
          detail: 'Orb ' + bestT.orb.toFixed(2) + '° · from your saved chart on this device · computed transit, not a sun-sign blurb',
          fly: KEY[bestT.tr] || 'sun',
          score: 92 - bestT.orb
        });
      } else if (bestWide) {
        items.push({
          id: 'transit-natal-wide',
          kicker: 'YOUR CHART · WIDE',
          title: (GLYPH[bestWide.tr] || '') + ' ' + bestWide.tr + ' ' + bestWide.kind + ' natal ' + (GLYPH[bestWide.na] || '') + ' ' + bestWide.na,
          detail: 'Orb ' + bestWide.orb.toFixed(2) + '° (wide · under 8°) · still your chart on this device · not a sun-sign blurb',
          fly: KEY[bestWide.tr] || 'sun',
          score: 78 - bestWide.orb
        });
      } else {
        var hasAsc = natal.Ascendant != null;
        items.push({
          id: 'chart-quiet',
          kicker: 'YOUR CHART',
          title: hasAsc
            ? 'No tight major transit-to-natal within 8° right now'
            : 'Chart loaded · cast with place for rising hits',
          detail: hasAsc
            ? 'Quiet is honest — the sky is not always loud. Your longitudes stay on this device.'
            : 'Home cast has planets; add birth place on the full chart for Ascendant contacts.',
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
        title: 'Cast your free chart · personal sky news',
        detail: 'When a chart is saved on this device, this strip can name real transit-to-natal hits — never a sun-sign blurb.',
        href: './index.html#cast',
        fly: 'earth',
        score: 55
      });
    }

    // Eclipse 12 Aug 2026 countdown
    var eclJD = eng.julianDay(2026, 8, 12, 17, 46, 0);
    var days = eclJD - jd;
    if (days > -2 && days < 120) {
      var eclLon = lonOf('Sun', eclJD);
      items.push({
        id: 'eclipse',
        kicker: '12 AUG 2026',
        title: 'Solar eclipse · greatest ~17:46 UT',
        detail: (days > 0 ? ('T−' + Math.floor(days) + 'd') : 'Passed / archive') +
          (eclLon != null ? ' · eclipse point ' + fmtDeg(eclLon) : '') +
          ' · UK deep partial ~91% · real sky news',
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
            detail: 'Within ~' + d + ' day(s) · now ' + fmtDeg(L0) + ' · Meeus series on-device',
            fly: KEY[n],
            score: 60 - d
          });
          break;
        }
      }
    });

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

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function mount(host, opts) {
    opts = opts || {};
    if (!host || !E()) return null;
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
      empty.textContent = 'Ephemeris warm… sky news will appear when the engine is ready.';
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
      mount(band, { autoFly: !narrow, autoCycle: true, cycleMs: 10000, limit: 6, flyDelayMs: 1800 });
    }
  }

  w.APSkyNews = { buildNews: buildNews, mount: mount, driveModel: driveModel };

  // Browser only — keep buildNews usable under Node proofs
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', autoMount, { once: true });
    } else {
      autoMount();
    }
  }
})(typeof window !== 'undefined' ? window : globalThis);
