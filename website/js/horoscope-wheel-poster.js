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

  // cool-brass system — mirrors css .ap-orb ramp (retinted 2026-07-04)
  var EL_COL = {
    fire:  '#d89a72',
    earth: '#9cb27e',
    air:   '#b8c0cc',
    water: '#8fb8b6',
  };

  var PLANETS = [
    { key: 'sun',     sym: '☉', col: '#ead79a', name: 'Sun' },
    { key: 'moon',    sym: '☽', col: '#e6e0d2', name: 'Moon' },
    { key: 'mercury', sym: '☿', col: '#cfc7b6', name: 'Mercury' },
    { key: 'venus',   sym: '♀', col: '#e2c8b4', name: 'Venus' },
    { key: 'mars',    sym: '♂', col: '#c87e5e', name: 'Mars' },
    { key: 'jupiter', sym: '♃', col: '#e0c48e', name: 'Jupiter' },
    { key: 'saturn',  sym: '♄', col: '#d8c289', name: 'Saturn' },
  ];

  var RING_R = 228;
  var SIGN_R = 228;
  var TILT_Y = 0.38;

  var SIGN_ABBR = {
    aries: 'ARI', taurus: 'TAU', gemini: 'GEM', cancer: 'CAN',
    leo: 'LEO', virgo: 'VIR', libra: 'LIB', scorpio: 'SCO',
    sagittarius: 'SAG', capricorn: 'CAP', aquarius: 'AQU', pisces: 'PIS',
  };
  var ROTATION = -90;
  var rotVel = 0;
  var autoSpin = true;
  var dragging = false;
  var dragStartX = 0;
  var dragMoved = 0;
  var selected = null;
  var hovered = null;
  var rafId = null;

  var spacePanX = 0;
  var spacePanY = 0;

  var wrap, poster, svg, rotator, planetsG, chordsG, centreBtn, chordTooltip;
  var transitChords = [];
  var hoveredChord = null;
  var onSignSelect = null;
  var onInteract = null;
  var ready = false;
  var visualEnabled = false;

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
    });
  }

  function buildMeridian() {
    var g = ns('g', {
      id: 'wheel-poster-meridian',
      class: 'wheel-meridian',
      'pointer-events': 'none',
    });
    g.appendChild(ns('line', {
      x1: 0, y1: 8, x2: 0, y2: -RING_R * 1.1,
      stroke: 'rgba(194, 160, 94, 0.5)',
      'stroke-width': '1.2',
      'stroke-dasharray': '3 5',
    }));
    g.appendChild(ns('circle', {
      cx: 0, cy: -RING_R * 1.04, r: 2.8,
      fill: 'rgba(194, 160, 94, 0.9)',
    }));
    g.appendChild(ns('text', {
      y: -RING_R * 1.16,
      'text-anchor': 'middle',
      'font-family': 'system-ui,sans-serif',
      'font-size': '6.5',
      'letter-spacing': '0.16em',
      fill: 'rgba(194, 160, 94, 0.72)',
      textContent: 'TODAY',
    }));
    return g;
  }

  function buildRing() {
    var tilt = ns('g', { id: 'wheel-poster-tilt', transform: 'scale(1,' + TILT_Y + ')' });
    rotator = ns('g', { id: 'wheel-poster-rotator' });

    rotator.appendChild(ns('circle', {
      r: RING_R * 1.06,
      fill: 'none',
      stroke: 'rgba(194, 160, 94, 0.14)',
      'stroke-width': '1',
    }));
    rotator.appendChild(ns('circle', {
      r: RING_R,
      fill: 'rgba(12, 16, 22, 0.35)',
      stroke: 'rgba(194, 160, 94, 0.42)',
      'stroke-width': '1.8',
      class: 'wheel-poster__outer-ring',
    }));
    rotator.appendChild(ns('circle', {
      r: RING_R * 0.68,
      fill: 'none',
      stroke: 'rgba(111, 160, 216, 0.12)',
      'stroke-width': '1',
      'stroke-dasharray': '2 6',
    }));

    for (var t = 0; t < 360; t += 10) {
      var rad = t * Math.PI / 180;
      var major = t % 30 === 0;
      var rIn = RING_R * (major ? 0.82 : 0.86);
      var rOut = RING_R * (major ? 0.98 : 0.94);
      var tx1 = rIn * Math.sin(rad);
      var ty1 = -rIn * Math.cos(rad);
      var tx2 = rOut * Math.sin(rad);
      var ty2 = -rOut * Math.cos(rad);
      rotator.appendChild(ns('line', {
        x1: tx1, y1: ty1, x2: tx2, y2: ty2,
        stroke: major ? 'rgba(194, 160, 94, 0.38)' : 'rgba(194, 160, 94, 0.14)',
        'stroke-width': major ? '1.2' : '0.6',
      }));
    }

    SIGNS.forEach(function (s) {
      var a0 = (s.lon - 15) * Math.PI / 180;
      var a1 = (s.lon + 15) * Math.PI / 180;
      var r0 = RING_R * 0.74;
      var r1 = RING_R * 1.02;
      var sector = ns('path', {
        class: 'wheel-sector',
        'data-el': s.el,
        fill: 'rgba(194, 160, 94, 0.03)',
        stroke: 'rgba(194, 160, 94, 0.08)',
        'stroke-width': '0.5',
      });
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
      rotator.appendChild(sector);
    });

    chordsG = ns('g', { id: 'wheel-poster-chords', class: 'wheel-poster-chords' });
    rotator.appendChild(chordsG);
    planetsG = ns('g', { id: 'wheel-poster-planets', class: 'wheel-poster-planets' });
    rotator.appendChild(planetsG);

    SIGNS.forEach(function (s) {
      var ang = s.lon + 15;
      var g = ns('g', {
        class: 'wheel-sign',
        'data-sign': s.key,
        'data-el': s.el,
        transform: 'rotate(' + ang + ') translate(0,' + (-SIGN_R * 0.9) + ')',
        'aria-hidden': 'true',
        focusable: 'false',
      });
      g.appendChild(ns('circle', {
        class: 'wheel-sign__glow',
        r: '32',
        fill: 'rgba(194, 160, 94, 0.85)',
        'fill-opacity': '0',
      }));
      g.appendChild(ns('circle', {
        class: 'wheel-sign__hit',
        r: '36',
        fill: 'transparent',
        stroke: 'none',
      }));
      g.appendChild(ns('circle', {
        class: 'wheel-sign__ring',
        r: '20',
        fill: 'rgba(12, 16, 22, 0.72)',
        stroke: 'rgba(194, 160, 94, 0.38)',
        'stroke-width': '1.1',
      }));
      g.appendChild(ns('image', {
        class: 'wheel-sign__seal',
        href: 'assets/images/seals/zodiac/' + s.key + '.svg',
        x: '-16',
        y: '-22',
        width: '32',
        height: '36',
        'pointer-events': 'none',
      }));
      g.appendChild(ns('text', {
        class: 'wheel-sign__abbr',
        y: '14',
        'text-anchor': 'middle',
        'font-family': 'system-ui,sans-serif',
        'font-size': '7',
        fill: 'rgba(236, 230, 216, 0.82)',
        'letter-spacing': '0.1em',
        textContent: SIGN_ABBR[s.key] || s.name.slice(0, 3).toUpperCase(),
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
      fill: 'rgba(194, 160, 94, 0.08)',
      stroke: 'rgba(194, 160, 94, 0.42)',
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
    centreBtn.addEventListener('click', function () {
      try { document.dispatchEvent(new CustomEvent('ap-horoscope-centre-tap')); } catch (e) { /* */ }
    });
    g.appendChild(centreBtn);
    g.appendChild(ns('text', {
      y: '48',
      'text-anchor': 'middle',
      fill: 'rgba(201,162,39,0.7)',
      'font-size': '9',
      'font-family': 'system-ui,sans-serif',
      'letter-spacing': '1.1',
      textContent: 'YOUR CHART',
    }));
    return g;
  }

  function injectSvgStructure() {
    var hub = ns('g', { transform: 'translate(300,218)' });
    hub.appendChild(buildMeridian());
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
    var planetLons = window.EclipticDialData ? EclipticDialData.getPlanetLons() : {};
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
        'font-family': "'AstroGlyph', 'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif",
        fill: pl.col,
        textContent: pl.sym + '︎',
      }));
      planetsG.appendChild(g);
    });
  }

  function chordStroke(quality) {
    // cool-brass system: harmonious = teal-brass, challenging = muted terracotta
    if (quality === 'h') return 'rgba(143, 184, 182, 0.55)';
    if (quality === 'x') return 'rgba(184, 90, 66, 0.48)';
    return 'rgba(194, 160, 94, 0.62)';
  }

  function lonToLocal(lon, r) {
    var rad = lon * Math.PI / 180;
    return { x: r * Math.sin(rad), y: -r * Math.cos(rad) };
  }

  function isHeadlessMode() {
    return wrap && wrap.classList.contains('is-canvas-primary') && !visualEnabled;
  }

  function ensureChordTooltip() {
    if (chordTooltip || !wrap) return;
    chordTooltip = document.createElement('div');
    chordTooltip.className = 'wheel-chord-tooltip';
    chordTooltip.setAttribute('role', 'tooltip');
    chordTooltip.hidden = true;
    wrap.appendChild(chordTooltip);
  }

  function hideChordTooltip() {
    hoveredChord = null;
    if (!chordTooltip) return;
    chordTooltip.classList.remove('is-visible');
    chordTooltip.hidden = true;
    drawPosterChords();
  }

  function showChordTooltip(idx, clientX, clientY) {
    var ch = transitChords[idx];
    if (!ch || !wrap) return;
    ensureChordTooltip();
    hoveredChord = idx;
    drawPosterChords();
    var label = ch.label || ch.glyph || 'Transit aspect';
    chordTooltip.textContent = label;
    chordTooltip.hidden = false;
    var rect = wrap.getBoundingClientRect();
    chordTooltip.style.left = (clientX - rect.left) + 'px';
    chordTooltip.style.top = (clientY - rect.top - 8) + 'px';
    chordTooltip.classList.add('is-visible');
  }

  function wireChordLine(line, idx) {
    line.addEventListener('mouseenter', function (e) {
      showChordTooltip(idx, e.clientX, e.clientY);
    });
    line.addEventListener('mousemove', function (e) {
      if (hoveredChord !== idx) return;
      if (!chordTooltip || chordTooltip.hidden) return;
      var rect = wrap.getBoundingClientRect();
      chordTooltip.style.left = (e.clientX - rect.left) + 'px';
      chordTooltip.style.top = (e.clientY - rect.top - 8) + 'px';
    });
    line.addEventListener('mouseleave', hideChordTooltip);
    line.addEventListener('focus', function (e) {
      var box = line.getBoundingClientRect();
      showChordTooltip(idx, box.left + box.width * 0.5, box.top);
    });
    line.addEventListener('blur', hideChordTooltip);
  }

  function drawPosterChords() {
    if (!chordsG || (isHeadlessMode() && !AUDIT)) return;
    while (chordsG.firstChild) chordsG.removeChild(chordsG.firstChild);
    transitChords.forEach(function (ch, idx) {
      if (ch.natalLon == null || ch.transitLon == null) return;
      var n = lonToLocal(((ch.natalLon % 360) + 360) % 360, RING_R * 0.50);
      var t = lonToLocal(((ch.transitLon % 360) + 360) % 360, RING_R * 0.90);
      var col = chordStroke(ch.quality);
      var hit = ns('line', {
        class: 'wheel-poster-chord-hit',
        x1: n.x, y1: n.y, x2: t.x, y2: t.y,
        stroke: 'transparent',
        'stroke-width': '14',
        'stroke-linecap': 'round',
        tabindex: '0',
        'aria-label': ch.label || 'Transit aspect chord',
      });
      wireChordLine(hit, idx);
      chordsG.appendChild(hit);
      var vis = ns('line', {
        class: 'wheel-poster-chord-vis' + (hoveredChord === idx ? ' is-highlighted' : ''),
        x1: n.x, y1: n.y, x2: t.x, y2: t.y,
        stroke: col,
        'stroke-width': hoveredChord === idx ? (ch.quality === 'c' ? '2.2' : '1.8') : (ch.quality === 'c' ? '1.4' : '1.1'),
        'stroke-dasharray': ch.quality === 'x' ? '4 4' : 'none',
        'stroke-linecap': 'round',
        opacity: hoveredChord === idx ? '1' : '0.85',
      });
      chordsG.appendChild(vis);
      if (ch.glyph) {
        chordsG.appendChild(ns('text', {
          x: (n.x + t.x) * 0.5,
          y: (n.y + t.y) * 0.5,
          'text-anchor': 'middle',
          'dominant-baseline': 'middle',
          'font-size': hoveredChord === idx ? '9' : '8',
          'font-family': "'AstroGlyph', 'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif",
          fill: col,
          'pointer-events': 'none',
          textContent: ch.glyph + '︎',
        }));
      }
    });
  }

  function setTransitChords(list) {
    transitChords = Array.isArray(list) ? list.slice() : [];
    drawPosterChords();
  }

  function syncSpaceParallax() {
    var rad = ROTATION * Math.PI / 180;
    var targetX = Math.sin(rad) * 22 + rotVel * 0.6;
    var targetY = Math.cos(rad) * 10 + Math.sin(rad * 0.55) * 5;
    spacePanX += (targetX - spacePanX) * 0.07;
    spacePanY += (targetY - spacePanY) * 0.07;
    if (wrap) {
      wrap.style.setProperty('--space-pan-x', spacePanX.toFixed(2) + 'px');
      wrap.style.setProperty('--space-pan-y', spacePanY.toFixed(2) + 'px');
    }
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
    syncSpaceParallax();
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

  function enableVisual() {
    if (visualEnabled || AUDIT) return;
    visualEnabled = true;
    if (!wrap || !poster) return;
    wrap.classList.remove('is-canvas-primary');
    poster.removeAttribute('aria-hidden');
    wireDrag();
    startAnim();
    drawPosterChords();
  }

  function init() {
    if (ready) return;
    wrap = document.getElementById('sphere-wrap');
    poster = document.getElementById('sphere-poster');
    if (!wrap || !poster) return;
    svg = poster.querySelector('.sphere-poster__svg') || poster.querySelector('svg');
    if (!svg) return;

    var headless = !AUDIT && (
      document.documentElement.classList.contains('ap-canvas-primary') ||
      wrap.classList.contains('is-canvas-primary')
    );

    if (headless) {
      poster.setAttribute('aria-hidden', 'true');
    } else {
      poster.setAttribute('role', 'application');
      poster.setAttribute('aria-roledescription', 'live ecliptic dial');
      poster.setAttribute('aria-label', 'Live ecliptic dial — drag to explore, tap a sign for today\'s reading');
    }

    injectSvgStructure();
    ensureChordTooltip();
    if (poster) {
      poster.addEventListener('mouseleave', hideChordTooltip);
    }
    wireSigns();
    if (!AUDIT && !headless) {
      visualEnabled = true;
      wireDrag();
      startAnim();
    }
    if (window.EclipticDialData) {
      EclipticDialData.init({ onPlanetsUpdated: drawPlanets });
    }
    ready = true;
    try { document.dispatchEvent(new CustomEvent('ap-horoscope-dial-ready')); } catch (e) { /* */ }

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
    refreshPlanets: function () {
      return window.EclipticDialData ? EclipticDialData.refreshPlanets() : false;
    },
    syncLegendLons: function (lons) {
      if (window.EclipticDialData) EclipticDialData.syncLegendLons(lons);
    },
    setTransitChords: setTransitChords,
    enableVisual: enableVisual,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();