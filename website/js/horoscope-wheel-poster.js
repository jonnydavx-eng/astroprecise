'use strict';

/**
 * HoroscopeWheelPoster — immediate interactivity on the static SVG wheel.
 * Click signs, drag to spin, centre star → chart. Live planet dots when ephemeris is ready.
 */
(function () {
  var AUDIT = !!(window.__apHoroscopeAudit ||
    navigator.webdriver ||
    /\bHeadlessChrome\b/i.test(navigator.userAgent || ''));

  var SIGNS = (function () {
    var Z = window.AP_ZODIAC;
    if (Z && Z.SIGNS) {
      return Z.SIGNS.map(function (s) {
        return { key: s.key, name: s.name, el: s.element, lon: s.lon };
      });
    }
    return [
      { key: 'aries', name: 'Aries', el: 'fire', lon: 0 },
      { key: 'taurus', name: 'Taurus', el: 'earth', lon: 30 },
      { key: 'gemini', name: 'Gemini', el: 'air', lon: 60 },
      { key: 'cancer', name: 'Cancer', el: 'water', lon: 90 },
      { key: 'leo', name: 'Leo', el: 'fire', lon: 120 },
      { key: 'virgo', name: 'Virgo', el: 'earth', lon: 150 },
      { key: 'libra', name: 'Libra', el: 'air', lon: 180 },
      { key: 'scorpio', name: 'Scorpio', el: 'water', lon: 210 },
      { key: 'sagittarius', name: 'Sagittarius', el: 'fire', lon: 240 },
      { key: 'capricorn', name: 'Capricorn', el: 'earth', lon: 270 },
      { key: 'aquarius', name: 'Aquarius', el: 'air', lon: 300 },
      { key: 'pisces', name: 'Pisces', el: 'water', lon: 330 },
    ];
  })();

  var EL_COL = {
    fire:  '#e05040',
    earth: '#6b9b5f',
    air:   '#5c4a6e',
    water: '#2a6ebd',
  };

  var PLANETS = [
    { key: 'sun',     sym: '☉', col: '#c9a227', name: 'Sun' },
    { key: 'moon',    sym: '☽', col: '#C8D0E8', name: 'Moon' },
    { key: 'mercury', sym: '☿', col: '#3f7d76', name: 'Mercury' },
    { key: 'venus',   sym: '♀', col: '#C77DFF', name: 'Venus' },
    { key: 'mars',    sym: '♂', col: '#e05848', name: 'Mars' },
    { key: 'jupiter', sym: '♃', col: '#E8A050', name: 'Jupiter' },
    { key: 'saturn',  sym: '♄', col: '#A0B898', name: 'Saturn' },
  ];

  var RING_R = 228;
  var SIGN_R = 228;
  var ROTATION = -90;
  var rotVel = 0;
  var autoSpin = true;
  var dragging = false;
  var dragStartX = 0;
  var dragMoved = 0;
  var selected = null;
  var hovered = null;
  var rafId = null;
  var planetLons = {};
  var planetPoll = null;

  var wrap, poster, svg, rotator, planetsG, centreBtn;
  var onSignSelect = null;
  var onInteract = null;
  var ready = false;

  function ns(tag, attrs) {
    var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'textContent') el.textContent = attrs[k];
        else el.setAttribute(k, attrs[k]);
      });
    }
    return el;
  }

  function setRotation(deg, opts) {
    opts = opts || {};
    ROTATION = deg;
    if (rotator) rotator.setAttribute('transform', 'rotate(' + ROTATION + ')');
    if (!opts.silent && window.ZodiacSphere && typeof ZodiacSphere.setRotation === 'function') {
      ZodiacSphere.setRotation(deg * Math.PI / 180);
    }
  }

  function getRotationRad() {
    return ROTATION * Math.PI / 180;
  }

  function signAtTop(key) {
    var s = SIGNS.find(function (x) { return x.key === key; });
    if (!s) return ROTATION;
    return -90 - s.lon;
  }

  function shortestDelta(from, to) {
    var d = to - from;
    while (d > 180) d -= 360;
    while (d < -180) d += 360;
    return d;
  }

  function spinToSign(key, opts) {
    opts = opts || {};
    var target = signAtTop(key);
    selected = key;
    syncSelectedUi();
    if (opts.instant) {
      setRotation(target);
      if (opts.onDone) opts.onDone();
      return;
    }
    var from = ROTATION;
    var delta = shortestDelta(from, target);
    var start = performance.now();
    var dur = opts.duration || 720;
    autoSpin = false;
    rotVel = 0;
    function step(ts) {
      var p = Math.min(1, (ts - start) / dur);
      var e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      setRotation(from + delta * e, { silent: true });
      if (p < 1) requestAnimationFrame(step);
      else {
        setRotation(from + delta);
        autoSpin = !hovered && !dragging;
        if (opts.onDone) opts.onDone();
      }
    }
    requestAnimationFrame(step);
  }

  function syncSelectedUi() {
    if (!rotator) return;
    rotator.querySelectorAll('.wheel-sign').forEach(function (g) {
      var on = g.dataset.sign === selected;
      g.classList.toggle('is-selected', on);
      g.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function buildRing() {
    var tilt = ns('g', { id: 'wheel-poster-tilt', transform: 'scale(1,0.325)' });
    rotator = ns('g', { id: 'wheel-poster-rotator' });

    var outer = ns('circle', {
      r: RING_R,
      fill: 'none',
      stroke: 'rgba(201,162,39,0.32)',
      'stroke-width': '2',
      'stroke-dasharray': '6 10',
      class: 'wheel-poster__outer-ring',
    });
    var inner = ns('circle', {
      r: RING_R * 0.8,
      fill: 'none',
      stroke: 'rgba(92,74,110,0.16)',
      'stroke-width': '1',
    });
    rotator.appendChild(outer);
    rotator.appendChild(inner);

    SIGNS.forEach(function (s, i) {
      var sector = ns('path', {
        class: 'wheel-sector',
        'data-el': s.el,
        fill: 'rgba(0,0,0,0)',
        stroke: 'none',
      });
      var a0 = (s.lon - 15) * Math.PI / 180;
      var a1 = (s.lon + 15) * Math.PI / 180;
      var r0 = RING_R * 0.72;
      var r1 = RING_R * 1.04;
      var x0 = r0 * Math.sin(a0);
      var y0 = -r0 * Math.cos(a0);
      var x1 = r1 * Math.sin(a0);
      var y1 = -r1 * Math.cos(a0);
      var x2 = r1 * Math.sin(a1);
      var y2 = -r1 * Math.cos(a1);
      var x3 = r0 * Math.sin(a1);
      var y3 = -r0 * Math.cos(a1);
      sector.setAttribute('d',
        'M' + x0 + ',' + y0 + ' L' + x1 + ',' + y1 +
        ' A' + r1 + ',' + r1 + ' 0 0 1 ' + x2 + ',' + y2 +
        ' L' + x3 + ',' + y3 + ' A' + r0 + ',' + r0 + ' 0 0 0 ' + x0 + ',' + y0 + ' Z');
      sector.setAttribute('fill', EL_COL[s.el] || '#888');
      sector.setAttribute('fill-opacity', '0.07');
      rotator.appendChild(sector);
    });

    for (var t = 0; t < 360; t += 30) {
      var rad = t * Math.PI / 180;
      var tx1 = (RING_R * 0.76) * Math.sin(rad);
      var ty1 = -(RING_R * 0.76) * Math.cos(rad);
      var tx2 = (RING_R * 0.92) * Math.sin(rad);
      var ty2 = -(RING_R * 0.92) * Math.cos(rad);
      rotator.appendChild(ns('line', {
        x1: tx1, y1: ty1, x2: tx2, y2: ty2,
        stroke: 'rgba(201,162,39,0.22)',
        'stroke-width': t % 90 === 0 ? '1.4' : '0.7',
      }));
    }

    planetsG = ns('g', { id: 'wheel-poster-planets', class: 'wheel-poster-planets' });
    rotator.appendChild(planetsG);

    SIGNS.forEach(function (s) {
      var ang = s.lon;
      var g = ns('g', {
        class: 'wheel-sign',
        'data-sign': s.key,
        'data-el': s.el,
        transform: 'rotate(' + ang + ') translate(0,' + (-SIGN_R) + ')',
        role: 'button',
        tabindex: '0',
        'aria-label': s.name + ' — tap for today\'s reading',
        'aria-pressed': 'false',
      });
      g.appendChild(ns('circle', {
        class: 'wheel-sign__glow',
        r: '34',
        fill: EL_COL[s.el] || '#888',
        'fill-opacity': '0',
      }));
      g.appendChild(ns('circle', {
        class: 'wheel-sign__hit',
        r: '30',
        fill: 'transparent',
        stroke: 'none',
      }));
      g.appendChild(ns('circle', {
        class: 'wheel-sign__ring',
        r: '22',
        fill: 'rgba(12,16,22,0.55)',
        stroke: EL_COL[s.el] || '#888',
        'stroke-opacity': '0.45',
        'stroke-width': '1.2',
      }));
      g.appendChild(ns('image', {
        class: 'wheel-sign__seal',
        href: 'assets/images/seals/zodiac/' + s.key + '.svg',
        x: '-18',
        y: '-26',
        width: '36',
        height: '42',
        'pointer-events': 'none',
      }));
      g.appendChild(ns('text', {
        class: 'wheel-sign__name',
        y: '32',
        'text-anchor': 'middle',
        'font-family': 'system-ui,sans-serif',
        'font-size': '8',
        fill: 'rgba(200,190,165,0.85)',
        'letter-spacing': '0.06em',
        textContent: s.name.toUpperCase(),
      }));
      rotator.appendChild(g);
    });

    tilt.appendChild(rotator);
    return tilt;
  }

  function buildCentre() {
    var g = ns('g', { id: 'wheel-poster-centre', class: 'wheel-centre' });
    g.appendChild(ns('circle', {
      class: 'wheel-centre__pulse',
      r: '38',
      fill: 'none',
      stroke: 'rgba(63,125,118,0.35)',
      'stroke-width': '1',
    }));
    g.appendChild(ns('circle', {
      r: '34',
      fill: 'rgba(63,125,118,0.12)',
      stroke: 'rgba(63,125,118,0.4)',
      'stroke-width': '1.2',
    }));
    var star = ns('polygon', {
      class: 'wheel-centre__star',
      fill: 'url(#sphere-poster-star)',
      points: '0,-26 6,-8 26,-8 10,4 16,24 0,12 -16,24 -10,4 -26,-8 -6,-8',
    });
    g.appendChild(star);
    centreBtn = ns('a', {
      class: 'wheel-centre__link',
      href: 'chart.html',
      'aria-label': 'Calculate your birth chart',
      tabindex: '0',
    });
    centreBtn.appendChild(ns('circle', { r: '40', fill: 'transparent' }));
    g.appendChild(centreBtn);
    g.appendChild(ns('text', {
      y: '48',
      'text-anchor': 'middle',
      fill: 'rgba(201,162,39,0.7)',
      'font-size': '9',
      'font-family': 'system-ui,sans-serif',
      'letter-spacing': '1.1',
      textContent: 'BIRTH CHART',
    }));
    return g;
  }

  function injectSvgStructure() {
    var hub = ns('g', { transform: 'translate(300,218)' });
    hub.appendChild(buildRing());
    hub.appendChild(buildCentre());
    var oldHub = svg.querySelector('g[transform="translate(300,218)"]');
    if (oldHub) oldHub.remove();
    svg.appendChild(hub);
    setRotation(ROTATION, { silent: true });
  }

  function lonToSign(lon) {
    var idx = Math.floor((((lon % 360) + 360) % 360) / 30);
    return SIGNS[idx] ? SIGNS[idx].name : '';
  }

  function drawPlanets() {
    if (!planetsG) return;
    planetsG.innerHTML = '';
    PLANETS.forEach(function (pl) {
      if (planetLons[pl.key] == null) return;
      var ang = planetLons[pl.key];
      var rad = ang * Math.PI / 180;
      var px = (RING_R * 0.58) * Math.sin(rad);
      var py = -(RING_R * 0.58) * Math.cos(rad);
      var g = ns('g', {
        class: 'wheel-planet',
        transform: 'translate(' + px + ',' + py + ')',
        role: 'img',
        'aria-label': pl.name + ' in ' + lonToSign(ang),
      });
      g.appendChild(ns('circle', {
        class: 'wheel-planet__halo',
        r: '12',
        fill: pl.col,
        'fill-opacity': '0.18',
      }));
      g.appendChild(ns('circle', {
        class: 'wheel-planet__dot',
        r: '4.5',
        fill: pl.col,
      }));
      g.appendChild(ns('text', {
        y: '-8',
        'text-anchor': 'middle',
        'font-size': '9',
        fill: pl.col,
        textContent: pl.sym,
      }));
      planetsG.appendChild(g);
    });
    updateLegend();
  }

  function updateLegend() {
    var legend = document.getElementById('planet-legend');
    if (!legend) return;
    legend.querySelectorAll('.pl-dot').forEach(function (el) {
      var label = (el.getAttribute('aria-label') || '').replace(/ position$/i, '');
      var pl = PLANETS.find(function (p) { return p.name === label; });
      if (!pl || planetLons[pl.key] == null) return;
      var sign = lonToSign(planetLons[pl.key]);
      el.textContent = pl.sym + ' ' + pl.name + (sign ? ' · ' + sign : '');
      el.style.setProperty('--c', pl.col);
    });
  }

  function approxPlanets() {
    var now = new Date();
    var start = new Date(now.getFullYear(), 0, 0);
    var doy = (now - start) / 86400000;
    var yr = now.getFullYear() + (now.getMonth() + 1) / 12;
    planetLons.sun = (doy / 365.25) * 360;
    var jd = 367 * now.getUTCFullYear() -
      Math.floor(7 * (now.getUTCFullYear() + Math.floor((now.getUTCMonth() + 1 + 9) / 12)) / 4) +
      Math.floor(275 * (now.getUTCMonth() + 1) / 9) + now.getUTCDate() + 1721013.5;
    var syn = 29.53058867;
    var ph = ((jd - 2451549.5) % syn + syn) % syn / syn;
    planetLons.moon = (planetLons.sun + ph * 360) % 360;
    planetLons.mercury = (planetLons.sun + 50 * Math.sin(yr * 2.1)) % 360;
    planetLons.venus = (planetLons.sun + 30 * Math.sin(yr * 1.6 + 1)) % 360;
    planetLons.mars = (planetLons.sun + 120 + 20 * Math.sin(yr * 0.9)) % 360;
    planetLons.jupiter = (30 * yr + 80) % 360;
    planetLons.saturn = (12 * yr + 200) % 360;
    drawPlanets();
  }

  function fetchPlanets() {
    var E = window.AstroEphemeris;
    if (!E) return false;
    try {
      var now = new Date();
      var jd = E.julianDay(now.getFullYear(), now.getMonth() + 1, now.getDate(),
        now.getUTCHours(), now.getUTCMinutes(), 0);
      var mod = function (l) { return ((l % 360) + 360) % 360; };
      PLANETS.forEach(function (pl) {
        try {
          var lon;
          if (pl.key === 'sun') lon = E.sunPosition(jd).lon;
          else if (pl.key === 'moon') lon = E.moonPosition(jd).lon;
          else lon = E.planetLongitude(pl.key, jd);
          planetLons[pl.key] = mod(lon);
        } catch (e) { /* skip */ }
      });
      drawPlanets();
      return true;
    } catch (e) {
      return false;
    }
  }

  function startPlanetPoll() {
    if (planetPoll) return;
    approxPlanets();
    planetPoll = window.setInterval(function () {
      if (!fetchPlanets()) approxPlanets();
    }, 60000);
    fetchPlanets();
  }

  function pickSign(key) {
    if (!key || AUDIT) return;
    if (onInteract) onInteract();
    spinToSign(key, {
      duration: 520,
      onDone: function () {
        if (onSignSelect) onSignSelect(key);
      },
    });
  }

  function onSignPointer(signKey) {
    if (dragging && dragMoved > 8) return;
    pickSign(signKey);
  }

  function wireSigns() {
    if (!rotator) return;
    rotator.querySelectorAll('.wheel-sign').forEach(function (g) {
      var key = g.dataset.sign;
      g.addEventListener('click', function (e) {
        e.stopPropagation();
        onSignPointer(key);
      });
      g.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSignPointer(key);
        }
      });
      g.addEventListener('mouseenter', function () {
        hovered = key;
        g.classList.add('is-hovered');
        autoSpin = false;
      });
      g.addEventListener('mouseleave', function () {
        if (hovered === key) hovered = null;
        g.classList.remove('is-hovered');
        autoSpin = !dragging;
      });
      g.addEventListener('focus', function () {
        hovered = key;
        g.classList.add('is-hovered');
        autoSpin = false;
      });
      g.addEventListener('blur', function () {
        g.classList.remove('is-hovered');
        if (hovered === key) hovered = null;
        autoSpin = !dragging;
      });
    });
  }

  function wireDrag() {
    if (!wrap || AUDIT) return;
    var lastX = 0;

    function onDown(e) {
      if (wrap.classList.contains('is-canvas-ready')) return;
      if (e.target.closest && e.target.closest('.wheel-sign, .wheel-centre__link')) return;
      dragging = true;
      dragMoved = 0;
      dragStartX = e.clientX;
      lastX = e.clientX;
      autoSpin = false;
      rotVel = 0;
      wrap.classList.add('is-dragging');
      if (onInteract) onInteract();
      try { wrap.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    }

    function onMove(e) {
      if (!dragging) return;
      var dx = e.clientX - lastX;
      dragMoved += Math.abs(e.clientX - dragStartX);
      lastX = e.clientX;
      setRotation(ROTATION + (dx / wrap.clientWidth) * 220, { silent: true });
      rotVel = (dx / wrap.clientWidth) * 220;
    }

    function onUp() {
      if (!dragging) return;
      dragging = false;
      wrap.classList.remove('is-dragging');
      autoSpin = Math.abs(rotVel) < 0.4;
    }

    wrap.addEventListener('pointerdown', onDown);
    wrap.addEventListener('pointermove', onMove);
    wrap.addEventListener('pointerup', onUp);
    wrap.addEventListener('pointercancel', onUp);
  }

  function tick() {
    if (!wrap || wrap.classList.contains('is-canvas-ready')) {
      rafId = null;
      return;
    }
    if (autoSpin && !dragging) {
      setRotation(ROTATION + 0.028, { silent: true });
    } else if (!dragging && Math.abs(rotVel) > 0.05) {
      setRotation(ROTATION + rotVel, { silent: true });
      rotVel *= 0.92;
    }
    rafId = requestAnimationFrame(tick);
  }

  function startAnim() {
    if (rafId || AUDIT) return;
    rafId = requestAnimationFrame(tick);
  }

  function init() {
    if (ready || AUDIT) return;
    wrap = document.getElementById('sphere-wrap');
    poster = document.getElementById('sphere-poster');
    if (!wrap || !poster) return;
    svg = poster.querySelector('.sphere-poster__svg') || poster.querySelector('svg');
    if (!svg) return;

    poster.setAttribute('role', 'application');
    poster.setAttribute('aria-roledescription', 'zodiac wheel');
    poster.setAttribute('aria-label', 'Interactive zodiac ring — drag to spin, tap a sign for today\'s reading');

    injectSvgStructure();
    wireSigns();
    wireDrag();
    startPlanetPoll();
    startAnim();
    ready = true;

    document.addEventListener('ap-zodiac-sphere-ready', function () {
      if (window.ZodiacSphere && typeof ZodiacSphere.setRotation === 'function') {
        ZodiacSphere.setRotation(getRotationRad());
      }
      if (selected) {
        window.setTimeout(function () {
          if (window.ZodiacSphere) ZodiacSphere.setSelected(selected, { instant: true });
        }, 80);
      }
    });
  }

  window.HoroscopeWheelPoster = {
    init: init,
    spinToSign: spinToSign,
    setSelected: function (key, opts) {
      selected = key;
      syncSelectedUi();
      spinToSign(key, opts || {});
    },
    getRotation: function () { return ROTATION; },
    getRotationRad: getRotationRad,
    set onSignSelect(fn) { onSignSelect = typeof fn === 'function' ? fn : null; },
    set onInteract(fn) { onInteract = typeof fn === 'function' ? fn : null; },
    refreshPlanets: function () { fetchPlanets() || approxPlanets(); },
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();