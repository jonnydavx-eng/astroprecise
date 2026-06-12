/**
 * AstroPrecise — 3D Solar System Orrery (Enhanced)
 * Canvas-based heliocentric 3D view with accurate live planetary positions.
 *
 * Positions are exact per the VSOP87 ephemeris: heliocentric vectors are
 * recovered from the geocentric output (helio = geo − Sun), so planets sit at
 * their true ecliptic longitude/latitude for the displayed moment. Radial
 * distances are compressed (r^0.5) so Mercury→Saturn fit one view; angles are
 * never altered.
 *
 * Requires AstroEphemeris (ephemeris.js) loaded first.
 *
 * Enhancements over v1:
 *   - Planet click interaction (onPlanetClick callback)
 *   - Improved planet rendering (glow halo + radial gradient sphere + highlight)
 *   - Saturn elliptical ring
 *   - Shooting star system
 *   - Ambient particle field
 *   - Orbit path depth-fading + inner/outer color split
 *   - Zoom (mouse wheel + pinch)
 *   - Aspect lines (toggleable)
 *   - Animated sun corona
 *   - Better zodiac ring with glyphs
 *   - Reduced-motion support
 */

window.Orrery3D = (() => {
  'use strict';

  // ── Planet definitions ────────────────────────────────────────────────────

  const PLANETS = [
    { id: 'mercury', name: 'Mercury', glyph: '☿', size: 3,   period: 87.969,
      color: '#8a8580', hi: '#c8c2bc', lo: '#4a4744',
      sign: '', interpretation: 'Mercury governs communication, intellect, and swift movement. In this sign it sharpens wit and lends a restless, curious energy to thought.' },
    { id: 'venus',   name: 'Venus',   glyph: '♀', size: 5,   period: 224.701,
      color: '#c8a86a', hi: '#ecd9a8', lo: '#7a6238',
      sign: '', interpretation: 'Venus rules love, beauty, and harmony. Here it softens relationships and draws pleasurable, aesthetic experiences into focus.' },
    { id: 'earth',   name: 'Earth',   glyph: '⊕', size: 5.5, period: 365.256,
      color: '#3274b8', hi: '#7ab4e8', lo: '#173a64',
      sign: '', interpretation: 'Earth is our vantage point — the axis around which all other cycles are measured. Its position anchors the chart in lived experience.' },
    { id: 'mars',    name: 'Mars',    glyph: '♂', size: 4,   period: 686.980,
      color: '#b84a32', hi: '#e08868', lo: '#642618',
      sign: '', interpretation: 'Mars rules drive, courage, and desire. Its placement ignites action and shapes how we assert ourselves in the world.' },
    { id: 'jupiter', name: 'Jupiter', glyph: '♃', size: 9,   period: 4332.589,
      color: '#c08858', hi: '#e8bc90', lo: '#6c4a2c',
      sign: '', interpretation: 'Jupiter expands whatever it touches — wisdom, abundance, and good fortune. It marks the areas of life where we naturally seek growth.' },
    { id: 'saturn',  name: 'Saturn',  glyph: '♄', size: 7.5, period: 10759.22,
      color: '#c8b48a', hi: '#ecdcb8', lo: '#6e6248',
      sign: '', interpretation: 'Saturn teaches discipline, structure, and long-term responsibility. Where it falls, we face our greatest tests and most lasting achievements.' },
  ];

  const SIGN_GLYPHS  = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'].map(g => g + '︎');
  const SIGN_NAMES   = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo',
                        'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
  const RADIAL_COMP  = 0.5;
  const ORBIT_SAMPLES = 160;

  // Aspect definitions for aspect lines
  const ASPECTS = [
    { name: 'Conjunction', angle:   0, orb: 8,  color: 'rgba(196,146,10,' },
    { name: 'Sextile',     angle:  60, orb: 4,  color: 'rgba(64,128,196,' },
    { name: 'Square',      angle:  90, orb: 6,  color: 'rgba(180,50,50,'  },
    { name: 'Trine',       angle: 120, orb: 6,  color: 'rgba(50,160,80,'  },
    { name: 'Opposition',  angle: 180, orb: 8,  color: 'rgba(180,50,50,'  },
  ];

  // Inner planets for orbit color distinction
  const INNER_IDS = new Set(['mercury', 'venus', 'earth', 'mars']);

  // ── State ─────────────────────────────────────────────────────────────────

  let canvas, ctx, wrap, W, H, cx, cy, dpr, scale;
  let raf = null, destroyed = false;
  let yaw = -0.35, pitch = 1.05;
  let autoSpin = true, lastInteract = 0;
  let dragging = false, lastX = 0, lastY = 0;
  let mouseDownX = 0, mouseDownY = 0;     // for click vs drag detection
  let baseJd = 0;
  let dayOffset = 0;
  let speed = 0;
  let lastFrame = 0;
  let orbits = {};
  let bodies = [];
  let ui = {};
  const trails = new Map();

  // Zoom
  let targetZoomScale = 1;
  let currentZoomScale = 1;
  let pinchStartDist = null;
  let pinchStartZoom = 1;

  // Shooting stars
  let shootingStars = [];
  let nextShootingStarAt = 0;
  let showShootingStars = true;

  // Particles
  let particles = [];
  let showParticles = true;
  let particlesInited = false;

  // Aspect lines
  let showAspects = false;

  // Zodiac ring frame throttle
  let zodiacFrameCount = 0;

  // Reduced motion
  const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Sun corona
  let coronaPhase = 0;

  // Public callback
  let onPlanetClick = null;

  // ── Astronomy ─────────────────────────────────────────────────────────────

  function rectOf(lon, lat, r) {
    const lo = lon * Math.PI / 180, la = lat * Math.PI / 180;
    return {
      x: r * Math.cos(la) * Math.cos(lo),
      y: r * Math.cos(la) * Math.sin(lo),
      z: r * Math.sin(la),
    };
  }

  function helioDisplay(id, jd) {
    const E = window.AstroEphemeris;
    const sun = E.sunPosition(jd);
    const s = rectOf(sun.lon, 0, sun.distance);
    let h;
    if (id === 'earth') {
      h = { x: -s.x, y: -s.y, z: -s.z };
    } else {
      const g = E[id + 'Position'](jd);
      const gr = rectOf(g.lon, g.lat, g.distance);
      h = { x: gr.x - s.x, y: gr.y - s.y, z: gr.z - s.z };
    }
    const r = Math.sqrt(h.x * h.x + h.y * h.y + h.z * h.z) || 1e-9;
    const rc = Math.pow(r, RADIAL_COMP);
    return { x: h.x / r * rc, y: h.y / r * rc, z: h.z / r * rc, au: r };
  }

  function lonToSign(lon) {
    // lon in degrees [0,360)
    const idx = Math.floor(((lon % 360) + 360) % 360 / 30);
    return SIGN_GLYPHS[idx] + ' ' + SIGN_NAMES[idx];
  }

  function computeOrbits() {
    PLANETS.forEach(p => {
      const pts = [];
      for (let i = 0; i < ORBIT_SAMPLES; i++) {
        pts.push(helioDisplay(p.id, baseJd + (p.period * i) / ORBIT_SAMPLES));
      }
      orbits[p.id] = pts;
    });
  }

  function computeBodies() {
    const E = window.AstroEphemeris;
    const jd = baseJd + dayOffset;
    bodies = PLANETS.map(p => {
      const pos = helioDisplay(p.id, jd);
      // Compute ecliptic longitude for sign
      let sign = '';
      try {
        if (p.id === 'earth') {
          const sun = E.sunPosition(jd);
          // Earth's ecliptic lon = sun lon + 180
          sign = lonToSign(sun.lon + 180);
        } else {
          const g = E[p.id + 'Position'](jd);
          sign = lonToSign(g.lon);
        }
      } catch (e) { /* optional */ }
      return { ...p, pos, sign };
    });

    // Moon
    try {
      const earth = bodies.find(b => b.id === 'earth');
      const m = E.moonPosition(jd);
      const dir = rectOf(m.lon, m.lat, 1);
      bodies.push({
        id: 'moon', name: 'Moon', glyph: '☽', size: 2.2,
        color: '#c8ccd8', hi: '#eef0f6', lo: '#6a6e7a',
        sign: lonToSign(m.lon),
        interpretation: 'The Moon reflects the inner emotional world — instinct, memory, and the rhythms of feeling that ebb and flow beneath the surface.',
        pos: {
          x: earth.pos.x + dir.x * 0.16,
          y: earth.pos.y + dir.y * 0.16,
          z: earth.pos.z + dir.z * 0.16,
        },
      });
    } catch (e) { /* moon optional */ }
  }

  // ── Projection ────────────────────────────────────────────────────────────

  const FOCAL = 7.5;

  function project(p) {
    const cy_ = Math.cos(yaw),  sy_ = Math.sin(yaw);
    const cp_ = Math.cos(pitch), sp_ = Math.sin(pitch);
    const x1 = p.x * cy_ - p.y * sy_;
    const y1 = p.x * sy_ + p.y * cy_;
    const y2 = y1 * cp_ - p.z * sp_;
    const z2 = y1 * sp_ + p.z * cp_;
    const f = FOCAL / (FOCAL + y2);
    const zs = currentZoomScale;
    return {
      x: cx + x1 * scale * f * zs,
      y: cy - z2 * scale * f * zs,
      f,
      depth: y2,
    };
  }

  // ── Particles ─────────────────────────────────────────────────────────────

  function initParticles() {
    if (particlesInited) return;
    particlesInited = true;
    const count = Math.min(60, window.devicePixelRatio > 1 ? 50 : 40);
    for (let i = 0; i < count; i++) {
      particles.push(newParticle());
    }
  }

  function newParticle() {
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.12,
      vy: (Math.random() - 0.5) * 0.12,
      size: 0.8 + Math.random() * 1.2,
      opacity: 0.1 + Math.random() * 0.15,
      // gold or silver-white
      gold: Math.random() > 0.5,
      phase: Math.random() * Math.PI * 2,
      phaseSpeed: 0.005 + Math.random() * 0.01,
    };
  }

  function updateParticles(dt) {
    if (!showParticles || prefersReducedMotion) return;
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.phase += p.phaseSpeed;
      // Wrap
      if (p.x < -2) p.x = W + 2;
      if (p.x > W + 2) p.x = -2;
      if (p.y < -2) p.y = H + 2;
      if (p.y > H + 2) p.y = -2;
    });
  }

  function drawParticles() {
    if (!showParticles || prefersReducedMotion) return;
    particles.forEach(p => {
      const opacity = p.opacity * (0.7 + 0.3 * Math.sin(p.phase));
      ctx.globalAlpha = opacity;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.gold ? '#c4920a' : '#d8dce8';
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  // ── Shooting Stars ────────────────────────────────────────────────────────

  function scheduleNextShootingStar(ts) {
    nextShootingStarAt = ts + 8000 + Math.random() * 7000;
  }

  function spawnShootingStar(ts) {
    if (shootingStars.length >= 3) return;
    const startX = Math.random() * W * 0.7;
    const startY = Math.random() * H * 0.3;
    const angle = (Math.PI / 4) + (Math.random() - 0.5) * 0.4;
    const length = 80 + Math.random() * 40;
    const duration = 400 + Math.random() * 300;
    shootingStars.push({ startX, startY, angle, length, duration, startTs: ts });
  }

  function updateAndDrawShootingStars(ts) {
    if (!showShootingStars || prefersReducedMotion) return;

    if (ts >= nextShootingStarAt) {
      spawnShootingStar(ts);
      scheduleNextShootingStar(ts);
    }

    shootingStars = shootingStars.filter(s => {
      const t = (ts - s.startTs) / s.duration;
      if (t >= 1) return false;

      // Current head position (slides across the sky)
      const travel = t * (s.length * 2.5);
      const hx = s.startX + Math.cos(s.angle) * travel;
      const hy = s.startY + Math.sin(s.angle) * travel;

      // Tail end
      const tx = hx - Math.cos(s.angle) * s.length;
      const ty = hy - Math.sin(s.angle) * s.length;

      // Fade: ramp in first 20%, ramp out last 30%
      let alpha = 1;
      if (t < 0.2) alpha = t / 0.2;
      else if (t > 0.7) alpha = (1 - t) / 0.3;

      const grad = ctx.createLinearGradient(tx, ty, hx, hy);
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(0.6, `rgba(196,146,10,${alpha * 0.5})`);
      grad.addColorStop(1, `rgba(255,255,255,${alpha})`);

      ctx.save();
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(hx, hy);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Head dot
      ctx.beginPath();
      ctx.arc(hx, hy, 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fill();
      // Gold core
      ctx.beginPath();
      ctx.arc(hx, hy, 1, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,240,150,${alpha})`;
      ctx.fill();
      ctx.restore();

      return true;
    });
  }

  // ── Zoom ──────────────────────────────────────────────────────────────────

  const ZOOM_MIN = 0.4;
  const ZOOM_MAX = 3.5;

  function bindZoom() {
    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      targetZoomScale = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, targetZoomScale + delta));
    }, { passive: false });

    canvas.addEventListener('touchstart', e => {
      if (e.touches.length === 2) {
        pinchStartDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        pinchStartZoom = targetZoomScale;
      }
    }, { passive: true });

    canvas.addEventListener('touchmove', e => {
      if (e.touches.length === 2 && pinchStartDist !== null) {
        const d = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const ratio = d / pinchStartDist;
        targetZoomScale = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, pinchStartZoom * ratio));
      }
    }, { passive: true });

    canvas.addEventListener('touchend', e => {
      if (e.touches.length < 2) pinchStartDist = null;
    }, { passive: true });
  }

  function updateZoom() {
    // Lerp toward target
    currentZoomScale += (targetZoomScale - currentZoomScale) * 0.12;
  }

  // ── Click / Hit detection ─────────────────────────────────────────────────

  function bindPointer() {
    canvas.style.touchAction = 'pan-y';
    canvas.style.cursor = 'grab';

    canvas.addEventListener('pointerdown', e => {
      dragging = true;
      lastX = e.clientX; lastY = e.clientY;
      mouseDownX = e.clientX; mouseDownY = e.clientY;
      lastInteract = performance.now();
      canvas.setPointerCapture(e.pointerId);
      canvas.style.cursor = 'grabbing';
    });

    canvas.addEventListener('pointermove', e => {
      if (!dragging) {
        updateCursorForHover(e);
        return;
      }
      yaw += (e.clientX - lastX) * 0.008;
      pitch = Math.min(1.5, Math.max(0.25, pitch + (e.clientY - lastY) * 0.006));
      lastX = e.clientX; lastY = e.clientY;
      lastInteract = performance.now();
    });

    const up = e => {
      if (dragging) {
        // Check if this was a click (little movement)
        const dx = e.clientX - mouseDownX;
        const dy = e.clientY - mouseDownY;
        if (Math.sqrt(dx * dx + dy * dy) < 6) {
          handleClick(e);
        }
      }
      dragging = false;
      canvas.style.cursor = 'grab';
    };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', () => { dragging = false; canvas.style.cursor = 'grab'; });
  }

  function canvasLocalPos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / dpr / rect.width),
      y: (e.clientY - rect.top)  * (canvas.height / dpr / rect.height),
    };
  }

  function hitTestBodies(lx, ly) {
    // Build projected positions for all bodies
    const sunPr = project({ x: 0, y: 0, z: 0 });
    const sun = { id: 'sun', name: 'Sun', glyph: '☀', size: 13 * sunPr.f,
                  color: '#f0c040', sign: '', pr: sunPr,
                  interpretation: 'The Sun represents the core self — vital force, identity, and the conscious will driving one forward through life.' };

    const allBodies = [sun, ...bodies.map(b => ({ ...b, pr: project(b.pos) }))];

    for (const b of allBodies) {
      const r = Math.max(1.6, b.size * b.pr.f) * 3;
      const dx = lx - b.pr.x, dy = ly - b.pr.y;
      if (dx * dx + dy * dy <= r * r) return b;
    }
    return null;
  }

  function handleClick(e) {
    const { x, y } = canvasLocalPos(e);
    const hit = hitTestBodies(x, y);
    if (hit && onPlanetClick) {
      onPlanetClick(hit);
    }
  }

  function updateCursorForHover(e) {
    const { x, y } = canvasLocalPos(e);
    const hit = hitTestBodies(x, y);
    canvas.style.cursor = hit ? 'pointer' : 'grab';
  }

  // ── Aspect lines ──────────────────────────────────────────────────────────

  function drawAspectLines() {
    if (!showAspects) return;
    const projected = bodies.map(b => ({ ...b, pr: project(b.pos) }));

    for (let i = 0; i < projected.length; i++) {
      for (let j = i + 1; j < projected.length; j++) {
        const a = projected[i], b = projected[j];
        if (!a.sign || !b.sign) continue;

        // Compute ecliptic angle difference from sign indices
        // Approximate: use sign midpoint degrees
        const aDeg = SIGN_NAMES.indexOf(a.sign.split(' ')[1]) * 30 + 15;
        const bDeg = SIGN_NAMES.indexOf(b.sign.split(' ')[1]) * 30 + 15;
        let diff = Math.abs(aDeg - bDeg);
        if (diff > 180) diff = 360 - diff;

        for (const asp of ASPECTS) {
          if (Math.abs(diff - asp.angle) <= asp.orb) {
            const opacity = 0.2 + 0.1 * (1 - Math.abs(diff - asp.angle) / asp.orb);
            ctx.beginPath();
            ctx.moveTo(a.pr.x, a.pr.y);
            ctx.lineTo(b.pr.x, b.pr.y);
            ctx.strokeStyle = asp.color + opacity + ')';
            ctx.lineWidth = 0.8;
            ctx.setLineDash([3, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
            break;
          }
        }
      }
    }
  }

  // ── Setup ─────────────────────────────────────────────────────────────────

  function init(canvasEl, options) {
    canvas = canvasEl;
    if (!canvas || !window.AstroEphemeris) return;
    ctx = canvas.getContext('2d');
    wrap = canvas.parentElement;

    const now = new Date();
    baseJd = window.AstroEphemeris.julianDay(
      now.getFullYear(), now.getMonth() + 1, now.getDate(),
      now.getHours(), now.getMinutes(), now.getSeconds());

    resize();
    window.addEventListener('resize', resize);
    bindPointer();
    bindZoom();
    buildControls();
    computeOrbits();
    computeBodies();
    initParticles();

    if (!prefersReducedMotion) scheduleNextShootingStar(performance.now());

    lastFrame = performance.now();
    loop(lastFrame);
  }

  function resize() {
    dpr = window.devicePixelRatio || 1;
    const rect = wrap.getBoundingClientRect();
    const size = Math.min(rect.width, 520);
    W = H = size;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    cx = cy = size / 2;
    scale = (size / 2 - 18) / 3.7;
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Re-position particles within new canvas size
    particlesInited = false;
    particles = [];
    if (canvas && ctx) {
      initParticles();
    }
  }

  function buildControls() {
    const bar = document.createElement('div');
    bar.className = 'orrery-controls';
    bar.innerHTML =
      '<button type="button" class="orrery-btn" data-act="play" aria-label="Play or pause orbital motion">▶</button>' +
      '<button type="button" class="orrery-btn orrery-btn--speed" data-speed="1">1d/s</button>' +
      '<button type="button" class="orrery-btn orrery-btn--speed" data-speed="7">7d/s</button>' +
      '<button type="button" class="orrery-btn orrery-btn--speed" data-speed="60">60d/s</button>' +
      '<button type="button" class="orrery-btn" data-act="now">Now</button>' +
      '<span class="orrery-date" aria-live="off"></span>';
    wrap.appendChild(bar);
    ui.play = bar.querySelector('[data-act="play"]');
    ui.date = bar.querySelector('.orrery-date');
    ui.speedBtns = [...bar.querySelectorAll('[data-speed]')];

    ui.play.addEventListener('click', () => {
      if (speed === 0) setSpeed(ui._lastSpeed || 7);
      else setSpeed(0);
    });
    ui.speedBtns.forEach(b => b.addEventListener('click', () => setSpeed(+b.dataset.speed)));
    bar.querySelector('[data-act="now"]').addEventListener('click', () => {
      dayOffset = 0; setSpeed(0); computeBodies();
    });
  }

  function setSpeed(s) {
    if (s > 0) ui._lastSpeed = s;
    speed = s;
    if (s === 0) trails.clear();
    if (ui.play) ui.play.textContent = s === 0 ? '▶' : '⏸';
    if (ui.speedBtns) ui.speedBtns.forEach(b => b.classList.toggle('active', +b.dataset.speed === s && s !== 0));
  }

  function goTo(date) {
    const E = window.AstroEphemeris;
    const jd = E.julianDay(date.getFullYear(), date.getMonth() + 1, date.getDate(),
                           date.getHours(), date.getMinutes(), 0);
    dayOffset = jd - baseJd;
    setSpeed(0);
    trails.clear();
    computeBodies();
  }

  function getDate() {
    return new Date(Date.now() + dayOffset * 86400000);
  }

  // ── Loop ──────────────────────────────────────────────────────────────────

  function loop(ts) {
    if (destroyed) return;
    raf = requestAnimationFrame(loop);
    const dt = Math.min((ts - lastFrame) / 1000, 0.1);
    lastFrame = ts;

    if (speed !== 0) {
      dayOffset += speed * dt;
      computeBodies();
    }
    if (autoSpin && !dragging && ts - lastInteract > 3000) {
      yaw += 0.0012;
    }

    updateZoom();
    updateParticles(dt);

    if (!prefersReducedMotion) coronaPhase += 0.018;

    draw(ts);
  }

  // ── Rendering ─────────────────────────────────────────────────────────────

  function draw(ts) {
    ctx.clearRect(0, 0, W, H);

    drawParticles();

    zodiacFrameCount++;
    if (zodiacFrameCount % 3 === 0) {
      drawZodiacRing();
    }

    drawOrbitPaths();
    drawAspectLines();

    const items = bodies.map(b => ({ kind: 'planet', b, pr: project(b.pos) }));
    items.push({ kind: 'sun', pr: project({ x: 0, y: 0, z: 0 }) });
    items.sort((a, b) => b.pr.depth - a.pr.depth);

    // Trails
    if (speed !== 0) {
      items.forEach(it => {
        if (it.kind !== 'planet' || it.b.id === 'moon') return;
        let t = trails.get(it.b.id);
        if (!t) { t = []; trails.set(it.b.id, t); }
        t.push({ x: it.pr.x, y: it.pr.y });
        if (t.length > 26) t.shift();
      });
    }
    trails.forEach((t, id) => {
      if (t.length < 2) return;
      const b = bodies.find(x => x.id === id);
      if (!b) return;
      for (let i = 1; i < t.length; i++) {
        ctx.beginPath();
        ctx.moveTo(t[i - 1].x, t[i - 1].y);
        ctx.lineTo(t[i].x, t[i].y);
        ctx.strokeStyle = b.color;
        ctx.globalAlpha = (i / t.length) * 0.4;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    });

    items.forEach(it => it.kind === 'sun' ? drawSun(it.pr) : drawPlanet(it.b, it.pr));

    updateAndDrawShootingStars(ts || performance.now());

    updateDate();
  }

  function drawZodiacRing() {
    const R = 3.45;
    // Only draw if pitch indicates the ring is visible enough
    const ringVisible = Math.abs(Math.sin(pitch)) > 0.15;
    const baseAlpha = Math.min(1, Math.abs(Math.sin(pitch)) * 2) * 0.9;

    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= 96; i++) {
      const a = (i / 96) * Math.PI * 2;
      const p = project({ x: Math.cos(a) * R, y: Math.sin(a) * R, z: 0 });
      i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
    }
    ctx.strokeStyle = `rgba(196,146,10,${0.18 * baseAlpha})`;
    ctx.stroke();

    for (let i = 0; i < 12; i++) {
      const a0 = (i * 30) * Math.PI / 180;
      const t0 = project({ x: Math.cos(a0) * (R - 0.09), y: Math.sin(a0) * (R - 0.09), z: 0 });
      const t1 = project({ x: Math.cos(a0) * (R + 0.09), y: Math.sin(a0) * (R + 0.09), z: 0 });
      ctx.beginPath();
      ctx.moveTo(t0.x, t0.y); ctx.lineTo(t1.x, t1.y);
      ctx.strokeStyle = `rgba(196,146,10,${0.22 * baseAlpha})`;
      ctx.stroke();

      const am = (i * 30 + 15) * Math.PI / 180;
      const g = project({ x: Math.cos(am) * (R + 0.3), y: Math.sin(am) * (R + 0.3), z: 0 });
      // Depth-based fade: signs at back of ring are dimmer
      const depthFade = Math.max(0.05, 0.5 + 0.5 * (1 - Math.min(1, (g.depth + 3.5) / 7)));
      const glyphAlpha = (0.15 + 0.25 * g.f) * depthFade * baseAlpha;
      if (glyphAlpha < 0.04) continue;
      ctx.font = `${Math.max(9, 12 * g.f)}px serif`;
      ctx.fillStyle = `rgba(196,146,10,${glyphAlpha})`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(SIGN_GLYPHS[i], g.x, g.y);
    }
  }

  function drawOrbitPaths() {
    PLANETS.forEach(p => {
      const pts = orbits[p.id];
      if (!pts) return;
      const isInner = INNER_IDS.has(p.id);
      const baseColor = isInner ? '196,146,10' : '91,127,199';

      // Draw orbit in segments to simulate depth fade
      for (let i = 0; i < pts.length; i++) {
        const curr = project(pts[i]);
        const next = project(pts[(i + 1) % pts.length]);
        // Depth: more negative = further back. Range approx -3.5 to +3.5
        const d = curr.depth;
        // Back half = more transparent
        const depthAlpha = 0.05 + 0.12 * Math.max(0, Math.min(1, (d + 3.5) / 7));
        ctx.beginPath();
        ctx.moveTo(curr.x, curr.y);
        ctx.lineTo(next.x, next.y);
        ctx.strokeStyle = `rgba(${baseColor},${depthAlpha})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
    });
  }

  function drawSun(pr) {
    const r = 13 * pr.f;

    // Animated corona rings
    if (!prefersReducedMotion) {
      for (let ring = 0; ring < 3; ring++) {
        const phase = coronaPhase + ring * (Math.PI * 2 / 3);
        const pulseR = r * (3.5 + ring * 1.2 + 0.4 * Math.sin(phase));
        const baseOp = [0.12, 0.07, 0.04][ring];
        const opacity = baseOp * (0.6 + 0.4 * Math.sin(phase * 1.3 + ring));
        const corona = ctx.createRadialGradient(pr.x, pr.y, r * 0.8, pr.x, pr.y, pulseR);
        corona.addColorStop(0, `rgba(255,220,100,${opacity})`);
        corona.addColorStop(0.4, `rgba(196,146,10,${opacity * 0.5})`);
        corona.addColorStop(1, 'rgba(196,100,0,0)');
        ctx.beginPath();
        ctx.arc(pr.x, pr.y, pulseR, 0, Math.PI * 2);
        ctx.fillStyle = corona;
        ctx.fill();
      }
    } else {
      // Static glow for reduced motion
      const glow = ctx.createRadialGradient(pr.x, pr.y, 0, pr.x, pr.y, r * 4);
      glow.addColorStop(0, 'rgba(240,192,64,0.55)');
      glow.addColorStop(0.4, 'rgba(196,146,10,0.18)');
      glow.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(pr.x, pr.y, r * 4, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();
    }

    // Outer glow halo
    const outerGlow = ctx.createRadialGradient(pr.x, pr.y, r * 0.5, pr.x, pr.y, r * 2.5);
    outerGlow.addColorStop(0, 'rgba(240,200,80,0.4)');
    outerGlow.addColorStop(1, 'rgba(196,146,10,0)');
    ctx.beginPath();
    ctx.arc(pr.x, pr.y, r * 2.5, 0, Math.PI * 2);
    ctx.fillStyle = outerGlow;
    ctx.fill();

    // Core sphere
    const core = ctx.createRadialGradient(pr.x - r * 0.2, pr.y - r * 0.2, 0, pr.x, pr.y, r);
    core.addColorStop(0, '#fff8e0');
    core.addColorStop(0.5, '#f0c040');
    core.addColorStop(1, '#c4920a');
    ctx.beginPath();
    ctx.arc(pr.x, pr.y, r, 0, Math.PI * 2);
    ctx.fillStyle = core;
    ctx.fill();

    // Bright highlight
    ctx.beginPath();
    ctx.arc(pr.x - r * 0.28, pr.y - r * 0.28, r * 0.22, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,240,0.55)';
    ctx.fill();
  }

  function drawPlanet(b, pr) {
    const r = Math.max(1.6, b.size * pr.f);

    // Outer glow halo
    const haloR = r * 2.2;
    const halo = ctx.createRadialGradient(pr.x, pr.y, r * 0.5, pr.x, pr.y, haloR);
    // Parse hex color to rgba
    const [hr, hg, hb] = hexToRgb(b.color);
    halo.addColorStop(0, `rgba(${hr},${hg},${hb},0.25)`);
    halo.addColorStop(1, `rgba(${hr},${hg},${hb},0)`);
    ctx.beginPath();
    ctx.arc(pr.x, pr.y, haloR, 0, Math.PI * 2);
    ctx.fillStyle = halo;
    ctx.fill();

    // Inner sphere — light direction from sun
    const sunPr = project({ x: 0, y: 0, z: 0 });
    let lx = sunPr.x - pr.x, ly = sunPr.y - pr.y;
    const ll = Math.sqrt(lx * lx + ly * ly) || 1;
    lx /= ll; ly /= ll;

    const grad = ctx.createRadialGradient(
      pr.x + lx * r * 0.45, pr.y + ly * r * 0.45, r * 0.1,
      pr.x, pr.y, r * 1.05);
    grad.addColorStop(0, b.hi);
    grad.addColorStop(0.55, b.color);
    grad.addColorStop(1, b.lo);
    ctx.beginPath();
    ctx.arc(pr.x, pr.y, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Bright highlight dot (top-left of sphere)
    ctx.beginPath();
    ctx.arc(pr.x - r * 0.32, pr.y - r * 0.32, r * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fill();

    // Saturn rings
    if (b.id === 'saturn') {
      ctx.save();
      ctx.translate(pr.x, pr.y);
      ctx.rotate(-0.35);
      const ringScale = 0.28 + 0.28 * Math.cos(pitch);
      ctx.scale(1, ringScale);

      // Outer ring
      ctx.beginPath();
      ctx.arc(0, 0, r * 2.2, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(200,180,138,0.5)';
      ctx.lineWidth = r * 0.42;
      ctx.stroke();

      // Inner ring detail
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.7, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(220,200,158,0.25)';
      ctx.lineWidth = r * 0.18;
      ctx.stroke();

      ctx.restore();
    }

    // Earth atmosphere
    if (b.id === 'earth') {
      ctx.beginPath();
      ctx.arc(pr.x, pr.y, r + 1.4, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(122,180,232,0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Glyph label
    if (b.id !== 'moon' || pr.f > 0.9) {
      ctx.font = `${Math.max(8, 11 * pr.f)}px serif`;
      ctx.fillStyle = b.hi;
      ctx.globalAlpha = 0.85;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(b.glyph, pr.x, pr.y - r - 3);
      ctx.globalAlpha = 1;
    }
  }

  // Hex color to [r, g, b] (handles 6-char hex only)
  function hexToRgb(hex) {
    const h = hex.replace('#', '');
    return [
      parseInt(h.substring(0, 2), 16),
      parseInt(h.substring(2, 4), 16),
      parseInt(h.substring(4, 6), 16),
    ];
  }

  function updateDate() {
    if (!ui.date) return;
    const d = new Date(Date.now() + dayOffset * 86400000);
    const str = d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    const tag = Math.abs(dayOffset) < 0.5 ? ' · now' : (dayOffset > 0 ? ` · +${Math.round(dayOffset)}d` : ` · ${Math.round(dayOffset)}d`);
    const next = str + tag;
    if (ui.date.textContent !== next) ui.date.textContent = next;
  }

  // ── Public API ────────────────────────────────────────────────────────────

  function destroy() {
    destroyed = true;
    if (raf) cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
  }

  function setBodies(arr) {
    // Allow external override of body definitions (optional)
    if (Array.isArray(arr)) {
      arr.forEach(spec => {
        const existing = PLANETS.find(p => p.id === spec.id);
        if (existing) Object.assign(existing, spec);
      });
      computeOrbits();
      computeBodies();
    }
  }

  function getPlanets() {
    return bodies.slice();
  }

  function jumpTo(jd) {
    dayOffset = jd - baseJd;
    setSpeed(0);
    trails.clear();
    computeBodies();
  }

  function setDate(date) {
    goTo(date);
  }

  function setShowAspects(bool) {
    showAspects = !!bool;
  }

  function setShowParticles(bool) {
    showParticles = !!bool;
  }

  function triggerShootingStar() {
    if (!prefersReducedMotion) spawnShootingStar(performance.now());
  }

  return {
    init,
    destroy,
    setSpeed,
    jumpTo,
    setDate,
    getDate,
    setBodies,
    getPlanets,
    // Backward compat aliases
    goTo,
    // New API
    setShowAspects,
    setShowParticles,
    triggerShootingStar,
    // Callback property (set externally: Orrery3D.onPlanetClick = fn)
    get onPlanetClick() { return onPlanetClick; },
    set onPlanetClick(fn) { onPlanetClick = fn; },
  };

})();
