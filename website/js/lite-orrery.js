/**
 * Astro Precise — Lite orrery instrument layer.
 * Live VSOP87 poster (canvas), micro-journey, lite time deck, sky sync.
 */
(function () {
  'use strict';

  function isLiteHero() {
    return !!(window.__apLiteHero ||
      (document.documentElement && document.documentElement.classList.contains('ap-lite-hero')));
  }

  if (!isLiteHero()) return;

  var PRM = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var AUDIT = false;
  try { AUDIT = !!navigator.webdriver; } catch (e) {}

  var poster, liteCanvas, microHud, microAct, microTitle;
  var liteScrub, liteNow, liteDate, fullScrub, fullDate;
  var domBound = false;

  function bindDom() {
    if (domBound && poster) return !!poster;
    poster = document.getElementById('orrery-lite-poster');
    liteCanvas = document.getElementById('lite-poster-canvas');
    microHud = document.getElementById('lite-micro-hud');
    microAct = document.getElementById('lite-micro-act');
    microTitle = document.getElementById('lite-micro-title');
    liteScrub = document.getElementById('lite-scrub');
    liteNow = document.getElementById('lite-now-btn');
    liteDate = document.getElementById('lite-date-display');
    fullScrub = document.getElementById('orrery-scrub');
    fullDate = document.getElementById('orrery-date-display');
    domBound = !!poster && !!liteCanvas;
    return domBound;
  }

  var baseJd = 0;
  var dayOffset = 0;
  var raf = null;
  var destroyed = false;
  var microToken = 0;
  var microPlayed = false;
  var zoom = 1.58;
  var targetZoom = 1.58;
  var panX = 0;
  var panY = 0;
  var targetPanX = 0;
  var targetPanY = 0;
  var focusId = 'earth';
  var posterOnScreen = true;
  var frameTick = 0;
  var helioCache = { jd: null, map: {} };
  var vpWired = false;
  var canvasCache = { w: 0, h: 0, dpr: 0 };
  var meteors = [];
  var nextMeteorAt = 0;
  var stars = [];

  // Interactive instrument state (drag-explore / zoom / hover-illuminate).
  var userPanX = 0;     // user's drag offset, layered on top of focus-centering
  var userPanY = 0;
  var dragActive = false;
  var velX = 0, velY = 0; // inertia velocity (px/frame)
  var hoverId = null;     // planet under the cursor (illuminated)
  var planetHits = [];    // [{id,x,y}] screen-space, rebuilt each draw for hit-testing
  var pinchDist = 0;
  var ptrWired = false;

  function clampN(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  var VALID_FOCUS = ['earth', 'sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];

  var FOCUS_ZOOM = {
    earth: 1.58,
    sun: 1.05,
    moon: 1.64,
    mercury: 1.38,
    venus: 1.35,
    mars: 1.32,
    jupiter: 1.14,
    saturn: 1.1,
  };

  var PLANETS = [
    { id: 'mercury', label: 'Mercury', core: '#d8d2cc', hi: '#ffffff', lo: '#5a5550', size: 4 },
    { id: 'venus',   label: 'Venus',   core: '#e8d4a0', hi: '#fff8e0', lo: '#8a6a38', size: 5.2 },
    { id: 'earth',   label: 'Earth',   core: '#4ab0e8', hi: '#d8f4ff', lo: '#145080', size: 7.2 },
    { id: 'mars',    label: 'Mars',    core: '#e85840', hi: '#ffb0a0', lo: '#7a2010', size: 4.4 },
    { id: 'jupiter', label: 'Jupiter', core: '#e8a860', hi: '#ffe8b8', lo: '#7a4818', size: 7.2 },
    { id: 'saturn',  label: 'Saturn',  core: '#e8d0a0', hi: '#fff6e0', lo: '#7a6848', size: 6.2 },
  ];

  var MICRO = [
    { act: 'I · Vantage', title: 'Earth — your observatory', zoom: 1.58 },
    { act: 'II · Neighbours', title: 'Inner system in motion', zoom: 1.18 },
    { act: 'III · Living sky', title: 'VSOP87 positions, live', zoom: 1 },
  ];

  function tier() {
    try {
      if (window.RafCore && window.RafCore.tier) return window.RafCore.tier;
      if (navigator.deviceMemory && navigator.deviceMemory <= 4) return 'low';
      if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) return 'low';
      if (navigator.deviceMemory && navigator.deviceMemory <= 6) return 'mid';
      if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 6) return 'mid';
    } catch (e) {}
    return 'high';
  }

  function starBudget() {
    return tier() === 'low' ? 40 : 90;
  }

  function meteorsEnabled() {
    var t = tier();
    return !PRM && !AUDIT && t !== 'low' && t !== 'mid';
  }

  function waitFor(test, ms) {
    return new Promise(function (resolve, reject) {
      var t0 = Date.now();
      (function poll() {
        try { if (test()) return resolve(true); } catch (e) {}
        if (Date.now() - t0 > ms) return reject(new Error('lite deps timeout'));
        setTimeout(poll, 40);
      })();
    });
  }

  function rectOf(lon, lat, r) {
    var lo = lon * Math.PI / 180;
    var la = lat * Math.PI / 180;
    return {
      x: r * Math.cos(la) * Math.cos(lo),
      y: r * Math.cos(la) * Math.sin(lo),
      z: r * Math.sin(la),
    };
  }

  function helio(id, jd) {
    var E = window.AstroEphemeris;
    var sun = E.sunPosition(jd);
    var s = rectOf(sun.lon, 0, sun.distance);
    var h;
    if (id === 'earth') {
      h = { x: -s.x, y: -s.y, z: -s.z };
    } else {
      var g = E[id + 'Position'](jd);
      var gr = rectOf(g.lon, g.lat, g.distance);
      h = { x: gr.x - s.x, y: gr.y - s.y, z: gr.z - s.z };
    }
    var r = Math.sqrt(h.x * h.x + h.y * h.y + h.z * h.z) || 1e-9;
    var rc = Math.pow(r, 0.5);
    return { x: h.x / r * rc, y: h.y / r * rc, z: h.z / r * rc, au: r };
  }

  function helioCached(id, jd) {
    if (helioCache.jd !== jd) {
      helioCache = { jd: jd, map: {} };
    }
    if (!helioCache.map[id]) {
      helioCache.map[id] = helio(id, jd);
    }
    return helioCache.map[id];
  }

  function focusPosition(id, jd) {
    if (id === 'sun') return { x: 0, y: 0 };
    if (id === 'moon') {
      var earth = helioCached('earth', jd);
      var m = window.AstroEphemeris.moonPosition(jd);
      var dir = rectOf(m.lon, m.lat, 1);
      return {
        x: earth.x + dir.x * 0.14,
        y: earth.y + dir.y * 0.14,
      };
    }
    var pos = helioCached(id, jd);
    return { x: pos.x, y: pos.y };
  }

  function updateFocusPan(W, H, jd) {
    var maxPan = Math.min(W, H) * 1.15;
    userPanX = clampN(userPanX, -maxPan, maxPan);
    userPanY = clampN(userPanY, -maxPan, maxPan);
    if (!focusId || !VALID_FOCUS.some(function (v) { return v === focusId; })) {
      targetPanX = userPanX;
      targetPanY = userPanY;
      return;
    }
    var R = Math.min(W, H) * 0.46 * targetZoom;
    var pos = focusPosition(focusId, jd);
    targetPanX = -pos.x * R * 0.94 + userPanX;
    targetPanY = -pos.y * R * 0.94 + userPanY;
  }

  function syncFocusUi() {
    if (poster) poster.setAttribute('data-lite-focus', focusId || 'earth');
    document.querySelectorAll('.lite-vp-btn[data-lite-planet]').forEach(function (btn) {
      var pid = (btn.getAttribute('data-lite-planet') || '').toLowerCase();
      btn.classList.toggle('active', pid === focusId);
    });
  }

  function focusPlanet(id) {
    if (!id) return;
    id = String(id).toLowerCase();
    if (VALID_FOCUS.indexOf(id) < 0) return;
    focusId = id;
    userPanX = 0; userPanY = 0; velX = 0; velY = 0; // re-center on the chosen body
    if (FOCUS_ZOOM[id] != null) targetZoom = FOCUS_ZOOM[id];
    syncFocusUi();
    document.dispatchEvent(new CustomEvent('orrery-planet-focus', { detail: { id: focusId } }));
    if (bindDom()) {
      var rect = poster.getBoundingClientRect();
      updateFocusPan(
        Math.max(120, Math.round(rect.width)),
        Math.max(120, Math.round(rect.height)),
        baseJd + dayOffset
      );
    }
  }

  function sunSignIndex(jd) {
    try {
      var lon = window.AstroEphemeris.sunPosition(jd).lon;
      return Math.floor(((lon % 360) + 360) % 360 / 30);
    } catch (e) { return 0; }
  }

  function formatDate(jd) {
    var ms = (jd - 2440587.5) * 86400000;
    var d = new Date(ms);
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var tag = Math.abs(dayOffset) < 0.5 ? ' · now' : (dayOffset > 0 ? ' · +' + Math.round(dayOffset) + 'd' : ' · ' + Math.round(dayOffset) + 'd');
    return months[d.getUTCMonth()] + ' ' + d.getUTCDate() + ', ' + d.getUTCFullYear() + tag;
  }

  function emitSky(jd) {
    document.dispatchEvent(new CustomEvent('ap-sky-tick', { detail: { jd: jd } }));
    try {
      var ms = (jd - 2440587.5) * 86400000;
      localStorage.setItem('astro_current_demo_time', new Date(ms).toISOString());
    } catch (e) {}
  }

  function syncDateHud() {
    var jd = baseJd + dayOffset;
    var text = formatDate(jd);
    if (liteDate) liteDate.textContent = text;
    if (fullDate && !document.documentElement.classList.contains('orrery-full')) {
      fullDate.textContent = text;
    }
    emitSky(jd);
  }

  function setDayOffset(days) {
    dayOffset = Number(days) || 0;
    if (liteScrub) liteScrub.value = String(Math.round(dayOffset));
    if (fullScrub) fullScrub.value = String(Math.round(dayOffset));
    if (window.Orrery3D && typeof window.Orrery3D.setTimelineDays === 'function') {
      window.Orrery3D.setTimelineDays(dayOffset);
    }
    syncDateHud();
  }

  function setupCanvas() {
    if (!liteCanvas || !poster) return null;
    var rect = poster.getBoundingClientRect();
    var cssW = Math.max(120, Math.round(rect.width));
    var cssH = Math.max(120, Math.round(rect.height));
    var dpr = 1;
    if (window.RafCore && window.RafCore.hdDPR) {
      dpr = window.RafCore.hdDPR(tier() === 'low' ? 2 : 2.5);
    } else {
      dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    }
    if (canvasCache.w !== cssW || canvasCache.h !== cssH || canvasCache.dpr !== dpr) {
      liteCanvas.width = Math.round(cssW * dpr);
      liteCanvas.height = Math.round(cssH * dpr);
      liteCanvas.style.width = cssW + 'px';
      liteCanvas.style.height = cssH + 'px';
      canvasCache = { w: cssW, h: cssH, dpr: dpr };
    }
    var ctx = liteCanvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (ctx.imageSmoothingQuality) ctx.imageSmoothingQuality = 'high';
    return { ctx: ctx, W: cssW, H: cssH };
  }

  function isPosterVisible() {
    return document.documentElement.classList.contains('ap-lite-hero') &&
      !document.documentElement.classList.contains('orrery-canvas') &&
      !document.documentElement.classList.contains('orrery-full');
  }

  function spawnMeteor(W, H) {
    var angle = (-0.35 + Math.random() * 0.5) * Math.PI;
    meteors.push({
      x: Math.random() * W * 0.4,
      y: Math.random() * H * 0.35,
      vx: Math.cos(angle) * (2.8 + Math.random() * 1.4),
      vy: Math.sin(angle) * (2.8 + Math.random() * 1.4),
      life: 1,
      gold: Math.random() > 0.35,
    });
  }

  function drawMeteors(ctx, W, H, now) {
    if (!meteorsEnabled()) return;
    if (now >= nextMeteorAt) {
      spawnMeteor(W, H);
      nextMeteorAt = now + 4200 + Math.random() * 5000;
    }
    for (var i = meteors.length - 1; i >= 0; i--) {
      var m = meteors[i];
      m.x += m.vx;
      m.y += m.vy;
      m.life -= 0.028;
      if (m.life <= 0) { meteors.splice(i, 1); continue; }
      var tail = 22 * m.life;
      var col = m.gold ? '201, 162, 39' : '140, 190, 255';
      var grad = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * 8, m.y - m.vy * 8);
      grad.addColorStop(0, 'rgba(' + col + ',' + (0.85 * m.life) + ')');
      grad.addColorStop(1, 'rgba(' + col + ',0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.8 * m.life;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(m.x - m.vx * tail, m.y - m.vy * tail);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,' + (0.9 * m.life) + ')';
      ctx.beginPath();
      ctx.arc(m.x, m.y, 1.4 * m.life, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawPlanetBody(ctx, px, py, p, alpha) {
    var s = p.size;
    ctx.globalAlpha = alpha;

    var halo = ctx.createRadialGradient(px, py, s * 0.4, px, py, s * 2.2);
    halo.addColorStop(0, p.hi + '58');
    halo.addColorStop(0.85, p.hi + '0d'); // soft mid-stop so the halo feathers out instead of hard-cutting
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(px, py, s * 2, 0, Math.PI * 2);
    ctx.fill();

    var body = ctx.createRadialGradient(px - s * 0.35, py - s * 0.35, 0, px, py, s);
    body.addColorStop(0, p.hi);
    body.addColorStop(0.45, p.core);
    body.addColorStop(1, p.lo);
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(px, py, s, 0, Math.PI * 2);
    ctx.fill();

    if (p.id === 'earth') {
      ctx.fillStyle = 'rgba(56, 142, 60, 0.55)';
      ctx.beginPath();
      ctx.ellipse(px - s * 0.2, py + s * 0.1, s * 0.55, s * 0.35, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
      ctx.beginPath();
      ctx.arc(px - s * 0.42, py - s * 0.38, s * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.arc(px, py, s, 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalAlpha = 1;
  }

  function planetDrawSpec(p) {
    if (p.id !== 'earth' || focusId !== 'earth') return p;
    return {
      id: p.id,
      label: p.label,
      core: p.core,
      hi: p.hi,
      lo: p.lo,
      size: p.size * 1.2,
    };
  }

  var MOON_CRATERS = [
    [0.12, -0.28, 0.22], [-0.35, 0.18, 0.16], [0.42, 0.08, 0.28],
    [-0.08, 0.44, 0.14], [0.28, -0.42, 0.18], [-0.48, -0.12, 0.12],
    [0.05, 0.12, 0.32], [-0.22, -0.38, 0.1], [0.38, 0.32, 0.15],
  ];

  var LEO_SPECS = [];  // satellites removed — clean blue-marble Earth (parity with the WebGL scene)

  var debrisSeeds = null;
  function debrisSeedList() {
    if (debrisSeeds) return debrisSeeds;
    debrisSeeds = [];
    var n = tier() === 'low' ? 18 : 34;
    for (var i = 0; i < n; i++) {
      debrisSeeds.push({
        ang: Math.random() * Math.PI * 2,
        r: 0.102 + Math.random() * 0.028,
        inc: (Math.random() - 0.5) * 0.9,
        sz: 0.35 + Math.random() * 0.65,
      });
    }
    return debrisSeeds;
  }

  function drawMoonDetail(ctx, px, py, size, alpha, now) {
    drawPlanetBody(ctx, px, py, {
      id: 'moon', core: '#c8d0dc', hi: '#f4f6fa', lo: '#6a7280', size: size,
    }, alpha);

    ctx.save();
    ctx.globalAlpha = alpha * 0.75;
    MOON_CRATERS.forEach(function (cr) {
      var dx = cr[0] * size;
      var dy = cr[1] * size;
      var rad = cr[2] * size * 0.55;
      var cg = ctx.createRadialGradient(px + dx, py + dy, 0, px + dx, py + dy, rad);
      cg.addColorStop(0, 'rgba(42, 44, 52, 0.75)');
      cg.addColorStop(0.5, 'rgba(88, 92, 102, 0.35)');
      cg.addColorStop(1, 'rgba(120, 124, 134, 0)');
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.arc(px + dx, py + dy, rad, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.strokeStyle = 'rgba(180, 190, 210, 0.18)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.arc(px, py, size * 1.04, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    if (focusId === 'moon' && size > 2.8) {
      ctx.save();
      ctx.globalAlpha = alpha * 0.12;
      var hg = ctx.createRadialGradient(px, py, size, px, py, size * 1.35);
      hg.addColorStop(0, 'rgba(140, 160, 200, 0.5)');
      hg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = hg;
      ctx.beginPath();
      ctx.arc(px, py, size * 1.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawEarthOrbitLite(ctx, ecx, ecy, earthR, now) {
    if (zoom < 1.12 || (focusId !== 'earth' && focusId !== 'moon')) return;
    var t = now * 0.001;
    var showCraft = tier() !== 'low';

    ctx.save();
    ctx.translate(ecx, ecy);

    debrisSeedList().forEach(function (d, i) {
      var ang = d.ang + t * 0.35 + i * 0.02;
      var x = Math.cos(ang) * earthR * d.r;
      var y = Math.sin(ang) * earthR * d.r * Math.cos(d.inc);
      ctx.fillStyle = 'rgba(168, 162, 148, ' + (0.35 + d.sz * 0.25) + ')';
      ctx.fillRect(x - d.sz * 0.4, y - d.sz * 0.25, d.sz * 0.8, d.sz * 0.5);
    });

    if (showCraft) {
      LEO_SPECS.forEach(function (spec) {
        var ang = spec.phase + t * spec.speed * 120;
        var x = Math.cos(ang) * earthR * spec.r;
        var y = Math.sin(ang) * earthR * spec.r * 0.82;
        if (spec.kind === 'iss') {
          ctx.fillStyle = 'rgba(200, 210, 230, 0.9)';
          ctx.fillRect(x - 2.2, y - 0.6, 4.4, 1.2);
          ctx.fillStyle = 'rgba(40, 60, 90, 0.85)';
          ctx.fillRect(x - 3.8, y - 0.3, 1.6, 0.6);
          ctx.fillRect(x + 2.2, y - 0.3, 1.6, 0.6);
        } else if (spec.kind === 'hub') {
          ctx.fillStyle = 'rgba(170, 185, 210, 0.88)';
          ctx.beginPath();
          ctx.ellipse(x, y, 2.2, 0.7, ang, 0, Math.PI * 2);
          ctx.fill();
        } else if (spec.kind === 'train') {
          for (var s = 0; s < 4; s++) {
            ctx.fillStyle = 'rgba(150, 165, 190, 0.82)';
            ctx.fillRect(x + (s - 1.5) * 1.1, y - 0.4, 0.8, 0.8);
          }
        } else {
          ctx.fillStyle = 'rgba(210, 185, 90, 0.9)';
          ctx.beginPath();
          ctx.moveTo(x, y - 1.2);
          ctx.lineTo(x + 1.1, y);
          ctx.lineTo(x, y + 1.2);
          ctx.lineTo(x - 1.1, y);
          ctx.closePath();
          ctx.fill();
        }
      });
    }

    ctx.strokeStyle = 'rgba(120, 140, 180, 0.12)';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.ellipse(0, 0, earthR * 0.11, earthR * 0.09, 0.4, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  function initStars(W, H) {
    var budget = starBudget();
    if (stars.length && stars.length !== budget) stars = [];
    if (stars.length) return;
    for (var i = 0; i < budget; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.2 + 0.35,
        a: 0.25 + Math.random() * 0.65,
        tw: Math.random() * Math.PI * 2,
      });
    }
  }

  function drawStarField(ctx, W, H, now) {
    initStars(W, H);
    stars.forEach(function (st) {
      var tw = 0.75 + 0.25 * Math.sin(now * 0.0012 + st.tw);
      ctx.fillStyle = 'rgba(240, 236, 255, ' + (st.a * tw) + ')';
      ctx.beginPath();
      ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawPoster(now) {
    if (destroyed) return;
    if (!bindDom()) return;
    if (!isPosterVisible()) return;
    var pack = setupCanvas();
    if (!pack) return;
    var ctx = pack.ctx;
    var W = pack.W;
    var H = pack.H;
    var jd = baseJd + dayOffset;
    updateFocusPan(W, H, jd);

    var cx = W * 0.5 + panX;
    var cy = H * 0.5 + panY;
    var R = Math.min(W, H) * 0.46 * zoom;

    ctx.fillStyle = '#060a10';
    ctx.fillRect(0, 0, W, H);
    drawStarField(ctx, W, H, now);

    var edgeGlow = ctx.createRadialGradient(cx, cy, R * 0.15, cx, cy, R * 1.25);
    edgeGlow.addColorStop(0, 'rgba(30, 80, 130, 0.08)');
    edgeGlow.addColorStop(0.7, 'rgba(20, 50, 90, 0.12)');
    edgeGlow.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
    ctx.fillStyle = edgeGlow;
    ctx.fillRect(0, 0, W, H);

    var signIdx = sunSignIndex(jd);

    for (var s = 0; s < 12; s++) {
      var a0 = (s * 30 - 90) * Math.PI / 180;
      var a1 = ((s + 1) * 30 - 90) * Math.PI / 180;
      var active = s === signIdx;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.1, a0, a1);
      ctx.strokeStyle = active ? 'rgba(232, 201, 106, 0.78)' : 'rgba(201, 162, 39, 0.18)';
      ctx.lineWidth = active ? 4 : 1.4;
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(150, 190, 240, 0.22)';
    ctx.lineWidth = 1;
    PLANETS.forEach(function (p) {
      var pos = helioCached(p.id, jd);
      var dist = Math.sqrt(pos.x * pos.x + pos.y * pos.y) * R * 0.94;
      if (dist < 4) return;
      ctx.beginPath();
      ctx.arc(cx, cy, dist, 0, Math.PI * 2);
      ctx.stroke();
    });

    var sunG = ctx.createRadialGradient(cx - 4, cy - 4, 0, cx, cy, 18);
    sunG.addColorStop(0, 'rgba(255, 245, 210, 1)');
    sunG.addColorStop(0.35, 'rgba(255, 210, 90, 0.92)');
    sunG.addColorStop(0.7, 'rgba(240, 160, 40, 0.45)');
    sunG.addColorStop(1, 'rgba(200, 100, 20, 0)');
    ctx.fillStyle = sunG;
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.fill();

    planetHits.length = 0;
    planetHits.push({ id: 'sun', x: cx, y: cy });
    PLANETS.forEach(function (p, i) {
      var pos = helioCached(p.id, jd);
      var px = cx + pos.x * R * 0.94;
      var py = cy + pos.y * R * 0.94;
      planetHits.push({ id: p.id, x: px, y: py });
      var spec = planetDrawSpec(p);
      var alpha = 1;
      if (poster.classList.contains('lite-awakening')) {
        alpha = Math.min(1, Math.max(0, (now - awakeningT0 - i * 160) / 520));
      }
      if (hoverId === p.id) {
        var pulse = 0.42 + 0.18 * Math.sin(now * 0.006);
        var hg = ctx.createRadialGradient(px, py, 0, px, py, spec.size + 11);
        hg.addColorStop(0, 'rgba(232, 201, 106, ' + (0.30 * pulse + 0.16).toFixed(3) + ')');
        hg.addColorStop(1, 'rgba(232, 201, 106, 0)');
        ctx.fillStyle = hg;
        ctx.beginPath();
        ctx.arc(px, py, spec.size + 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(px, py, spec.size + 5.5, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(244, 223, 150, ' + (0.5 + 0.25 * pulse).toFixed(3) + ')';
        ctx.lineWidth = 1.4;
        ctx.stroke();
        alpha = 1;
      }
      drawPlanetBody(ctx, px, py, spec, alpha);
      if (p.id === 'earth') {
        var earthR = spec.size;
        drawEarthOrbitLite(ctx, px, py, earthR, now);
      }
    });

    try {
      var moonPos = focusPosition('moon', jd);
      var mx = cx + moonPos.x * R * 0.94;
      var my = cy + moonPos.y * R * 0.94;
      planetHits.push({ id: 'moon', x: mx, y: my });
      var moonSize = focusId === 'moon' ? 3.6 : 2.8;
      drawMoonDetail(ctx, mx, my, moonSize, 1, now);
    } catch (e) {}

    drawMeteors(ctx, W, H, now);

    var vig = ctx.createRadialGradient(cx, cy, R * 0.5, cx, cy, R * 1.18);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(5, 4, 6, 0.15)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);
  }

  function tick(now) {
    if (destroyed) return;
    if (!posterOnScreen) return;
    now = now || performance.now();
    if (tier() === 'low') {
      frameTick += 1;
      if (frameTick % 2 === 0) {
        raf = requestAnimationFrame(tick);
        return;
      }
    }
    if (isPosterVisible()) {
      // Inertia glide after a flick (decays, bounds-clamped in updateFocusPan).
      var inertia = !dragActive && (Math.abs(velX) > 0.12 || Math.abs(velY) > 0.12);
      if (inertia) {
        userPanX += velX; userPanY += velY;
        velX *= 0.90; velY *= 0.90;
      } else if (!dragActive) { velX = 0; velY = 0; }
      zoom += (targetZoom - zoom) * 0.038;
      if (Math.abs(targetZoom - zoom) < 0.001) zoom = targetZoom;
      // Track the cursor 1:1 while dragging/gliding; settle gently otherwise.
      var panLerp = (dragActive || inertia) ? 0.45 : 0.038;
      panX += (targetPanX - panX) * panLerp;
      panY += (targetPanY - panY) * panLerp;
      if (Math.abs(targetPanX - panX) < 0.05) panX = targetPanX;
      if (Math.abs(targetPanY - panY) < 0.05) panY = targetPanY;
      drawPoster(now);
    }
    raf = requestAnimationFrame(tick);
  }

  function setupPosterObserver() {
    if (!poster || !window.IntersectionObserver) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        posterOnScreen = entry.isIntersecting;
        if (posterOnScreen && !raf && !destroyed) {
          raf = requestAnimationFrame(tick);
        } else if (!posterOnScreen && raf) {
          cancelAnimationFrame(raf);
          raf = null;
        }
      });
    }, { root: null, threshold: 0.08 });
    io.observe(poster);
  }

  var awakeningT0 = 0;
  function runAwakening() {
    if (!poster || PRM || AUDIT) return;
    awakeningT0 = performance.now();
    poster.classList.add('lite-awakening');
    document.documentElement.classList.add('lite-entry-active');
    setTimeout(function () {
      poster.classList.remove('lite-awakening');
      poster.classList.add('lite-poster-ready');
      document.documentElement.classList.remove('lite-entry-active');
      if (!microPlayed) runMicroJourney();
    }, 2400);
  }

  function runMicroJourney() {
    if (!microHud || PRM || AUDIT || microPlayed) return;
    microPlayed = true;
    var token = ++microToken;
    microHud.hidden = false;

    function step(i) {
      if (token !== microToken || i >= MICRO.length) {
        if (microHud) microHud.hidden = true;
        return;
      }
      var ch = MICRO[i];
      if (microAct) microAct.textContent = ch.act;
      if (microTitle) microTitle.textContent = ch.title;
      targetZoom = ch.zoom;
      poster.setAttribute('data-lite-scale', String(i));
      setTimeout(function () { step(i + 1); }, i === MICRO.length - 1 ? 3200 : 2600);
    }
    step(0);
  }

  function wireLiteVpControls() {
    if (vpWired) return;
    vpWired = true;
    document.querySelectorAll('.lite-vp-btn[data-lite-planet]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var pid = (btn.getAttribute('data-lite-planet') || '').toLowerCase();
        focusPlanet(pid);
      });
    });
    document.addEventListener('orrery-planet-click', function (e) {
      var detail = e && e.detail ? e.detail : {};
      var pid = (detail.id || detail.name || '').toLowerCase();
      if (VALID_FOCUS.indexOf(pid) >= 0) focusPlanet(pid);
    });
  }

  function nearestPlanet(mx, my) {
    var best = null, bestD = 26;
    for (var i = 0; i < planetHits.length; i++) {
      var h = planetHits[i];
      var d = Math.sqrt((mx - h.x) * (mx - h.x) + (my - h.y) * (my - h.y));
      if (d < bestD) { bestD = d; best = h.id; }
    }
    return best;
  }

  function kickRaf() {
    if (!raf && !destroyed && posterOnScreen) raf = requestAnimationFrame(tick);
  }

  // Turn the poster into a hands-on instrument: drag-to-explore (with inertia),
  // wheel / pinch zoom, hover-to-illuminate. Reuses the existing tick() lerp +
  // target vars; reduced-motion keeps the static poster + focus buttons only.
  function wireViewportPointer() {
    if (ptrWired || PRM || AUDIT) return;
    var vp = document.getElementById('orrery-viewport');
    if (!vp || !window.PointerEvent) return;
    ptrWired = true;
    vp.style.touchAction = 'none';
    vp.classList.add('orrery-grabbable');

    var pointers = {};
    var pointerCount = 0;
    var lastX = 0, lastY = 0, lastT = 0;

    // When the HD 3D orrery takes over, its own controls own the pointer; stand down.
    function handedOff() { return document.documentElement.classList.contains('orrery-full'); }

    function isControl(t) {
      return !!(t && t.closest && t.closest(
        '.lite-vp-btn, .orrery-lite-launch, button, a, input, label, [role="toolbar"]'));
    }

    vp.addEventListener('pointerdown', function (e) {
      if (handedOff() || isControl(e.target)) return;
      if (!pointers[e.pointerId]) pointerCount++;
      pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
      if (pointerCount === 1) {
        dragActive = true;
        velX = 0; velY = 0;
        lastX = e.clientX; lastY = e.clientY;
        lastT = e.timeStamp || performance.now();
        hoverId = null;
        vp.classList.add('orrery-grabbing');
        vp.classList.remove('orrery-hovering');
        try { vp.setPointerCapture(e.pointerId); } catch (err) {}
      } else if (pointerCount === 2) {
        var ks = Object.keys(pointers);
        var a = pointers[ks[0]], b = pointers[ks[1]];
        pinchDist = Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
      }
      kickRaf();
    });

    vp.addEventListener('pointermove', function (e) {
      if (handedOff()) return;
      if (pointers[e.pointerId]) pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
      var ks = Object.keys(pointers);
      if (ks.length >= 2) {
        var a = pointers[ks[0]], b = pointers[ks[1]];
        var d = Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
        if (pinchDist > 0) targetZoom = clampN(targetZoom * (d / pinchDist), 0.7, 3.4);
        pinchDist = d;
        kickRaf();
        return;
      }
      if (dragActive && pointers[e.pointerId]) {
        var dx = e.clientX - lastX;
        var dy = e.clientY - lastY;
        lastX = e.clientX; lastY = e.clientY;
        userPanX += dx; userPanY += dy;
        var t = e.timeStamp || performance.now();
        var dt = Math.max(8, t - lastT); lastT = t;
        velX = dx * (16 / dt); velY = dy * (16 / dt);
        kickRaf();
        return;
      }
      // Hover-to-illuminate (no button held). planetHits are in canvas CSS px,
      // and the canvas is inset within the viewport — measure against the canvas.
      var rect = (liteCanvas || vp).getBoundingClientRect();
      var hid = nearestPlanet(e.clientX - rect.left, e.clientY - rect.top);
      if (hid !== hoverId) {
        hoverId = hid;
        vp.classList.toggle('orrery-hovering', !!hid);
        kickRaf();
      }
    });

    function endPointer(e) {
      if (pointers[e.pointerId]) { delete pointers[e.pointerId]; pointerCount = Math.max(0, pointerCount - 1); }
      if (pointerCount < 2) pinchDist = 0;
      if (pointerCount === 0) {
        dragActive = false;
        vp.classList.remove('orrery-grabbing');
        try { vp.releasePointerCapture(e.pointerId); } catch (err) {}
        kickRaf();
      }
    }
    vp.addEventListener('pointerup', endPointer);
    vp.addEventListener('pointercancel', endPointer);
    vp.addEventListener('pointerleave', function () {
      if (!dragActive && hoverId) { hoverId = null; vp.classList.remove('orrery-hovering'); kickRaf(); }
    });

    vp.addEventListener('wheel', function (e) {
      if (handedOff()) return;
      e.preventDefault();
      var f = 1 - clampN(e.deltaY, -120, 120) * 0.0014;
      targetZoom = clampN(targetZoom * f, 0.7, 3.4);
      kickRaf();
    }, { passive: false });

    vp.addEventListener('dblclick', function (e) {
      if (handedOff() || isControl(e.target)) return;
      userPanX = 0; userPanY = 0; velX = 0; velY = 0;
      if (FOCUS_ZOOM[focusId] != null) targetZoom = FOCUS_ZOOM[focusId];
      kickRaf();
    });
  }

  var deckWired = false;
  function wireLiteDeck() {
    if (deckWired) return;
    deckWired = true;
    if (liteScrub) {
      liteScrub.addEventListener('input', function () {
        setDayOffset(parseInt(liteScrub.value, 10) || 0);
      });
    }
    if (liteNow) {
      liteNow.addEventListener('click', function () {
        setDayOffset(0);
        if (window.Orrery3D && typeof window.Orrery3D.snapToNow === 'function') {
          window.Orrery3D.snapToNow();
        }
      });
    }
  }

  function prefetchWebGL() {
    if (AUDIT || window.__orreryPrefetchDone) return;
    window.__orreryPrefetchDone = true;
    function addPreload(href) {
      if (document.querySelector('link[data-ap-prefetch="' + href + '"]')) return;
      var l = document.createElement('link');
      l.rel = 'modulepreload';
      l.href = href;
      l.setAttribute('data-ap-prefetch', href);
      l.crossOrigin = 'anonymous';
      document.head.appendChild(l);
    }
    var base = 'js/';
    try {
      var loader = document.querySelector('script[src*="orrery-loader"]');
      if (loader && loader.src) base = new URL('./', loader.src).href;
    } catch (e) {}
    addPreload(base + 'orrery-webgl.js');
    addPreload(base + 'vendor/three/three.module.min.js');
  }

  function schedulePrefetch() {
    function go() {
      if (window.requestIdleCallback) {
        requestIdleCallback(prefetchWebGL, { timeout: 3500 });
      } else {
        setTimeout(prefetchWebGL, 1200);
      }
    }
    if (document.readyState === 'complete') go();
    else window.addEventListener('load', go, { once: true });
  }

  function bootPoster() {
    if (!bindDom()) return;
    var now = new Date();
    baseJd = window.AstroEphemeris.julianDay(
      now.getFullYear(), now.getMonth() + 1, now.getDate(),
      now.getHours(), now.getMinutes(), now.getSeconds()
    );
    syncDateHud();
    wireLiteDeck();
    wireLiteVpControls();
    wireViewportPointer();
    setupPosterObserver();
    zoom = 1.58;
    targetZoom = 1.58;
    focusPlanet('earth');
    nextMeteorAt = performance.now() + 1800;
    if (!raf) raf = requestAnimationFrame(tick);
    schedulePrefetch();
    setTimeout(runAwakening, 400);
  }

  window.LiteOrrery = {
    getDayOffset: function () { return dayOffset; },
    setDayOffset: setDayOffset,
    getJd: function () { return baseJd + dayOffset; },
    redraw: function () { drawPoster(performance.now()); },
    focusPlanet: focusPlanet,
    getFocusId: function () { return focusId; },
    getView: function () {
      return { zoom: zoom, targetZoom: targetZoom, panX: panX, panY: panY,
        userPanX: userPanX, userPanY: userPanY, dragActive: dragActive, hoverId: hoverId };
    },
    tier: tier,
    destroy: function () {
      destroyed = true;
      if (raf) cancelAnimationFrame(raf);
    },
  };

  function waitForBoot() {
    return waitFor(function () {
      return window.AstroEphemeris && window.AstroEphemeris.julianDay && bindDom();
    }, 15000).then(bootPoster);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { waitForBoot().catch(function () {}); });
  } else {
    waitForBoot().catch(function () {});
  }

  window.addEventListener('resize', function () {
    canvasCache = { w: 0, h: 0, dpr: 0 };
    stars = [];
    if (!destroyed) drawPoster(performance.now());
  }, { passive: true });

  document.addEventListener('ap-orrery-ready', function () {
    if (window.Orrery3D && typeof window.Orrery3D.getDayOffset === 'function') {
      setDayOffset(window.Orrery3D.getDayOffset());
    }
    // HD 3D now owns the viewport — release the lite instrument's pointer affordances.
    var vp = document.getElementById('orrery-viewport');
    if (vp) {
      vp.classList.remove('orrery-grabbable', 'orrery-grabbing', 'orrery-hovering');
      vp.style.touchAction = '';
    }
    dragActive = false; hoverId = null; velX = 0; velY = 0;
  });
})();