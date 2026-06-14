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

  // Debug load message (remove after testing)

  // ── Planet definitions ────────────────────────────────────────────────────

  const PLANETS = [
    { id: 'mercury', name: 'Mercury', glyph: '☿', size: 3,   period: 87.969, spinPeriod: 58.6,
      color: '#8a8580', hi: '#c8c2bc', lo: '#4a4744',
      sign: '', interpretation: 'Mercury governs communication, intellect, and swift movement. In this sign it sharpens wit and lends a restless, curious energy to thought.' },
    { id: 'venus',   name: 'Venus',   glyph: '♀', size: 5,   period: 224.701, spinPeriod: 243,
      color: '#c8a86a', hi: '#ecd9a8', lo: '#7a6238',
      sign: '', interpretation: 'Venus rules love, beauty, and harmony. Here it softens relationships and draws pleasurable, aesthetic experiences into focus.' },
    { id: 'earth',   name: 'Earth',   glyph: '⊕', size: 5.5, period: 365.256, spinPeriod: 1,
      color: '#3274b8', hi: '#7ab4e8', lo: '#173a64',
      sign: '', interpretation: 'Earth is our vantage point — the axis around which all other cycles are measured. Its position anchors the chart in lived experience.' },
    { id: 'mars',    name: 'Mars',    glyph: '♂', size: 4,   period: 686.980, spinPeriod: 1.03,
      color: '#b84a32', hi: '#e08868', lo: '#642618',
      sign: '', interpretation: 'Mars rules drive, courage, and desire. Its placement ignites action and shapes how we assert ourselves in the world.' },
    { id: 'jupiter', name: 'Jupiter', glyph: '♃', size: 9,   period: 4332.589, spinPeriod: 0.41,
      color: '#c08858', hi: '#e8bc90', lo: '#6c4a2c',
      sign: '', interpretation: 'Jupiter expands whatever it touches — wisdom, abundance, and good fortune. It marks the areas of life where we naturally seek growth.' },
    { id: 'saturn',  name: 'Saturn',  glyph: '♄', size: 7.5, period: 10759.22, spinPeriod: 0.45,
      color: '#c8b48a', hi: '#ecdcb8', lo: '#6e6248',
      sign: '', interpretation: 'Saturn teaches discipline, structure, and long-term responsibility. Where it falls, we face our greatest tests and most lasting achievements.' },
    { id: 'uranus', name: 'Uranus', glyph: '♅', size: 5.5, period: 30685, spinPeriod: 0.72,
      color: '#9ed1e8', hi: '#d6f0ff', lo: '#5a8aa0',
      sign: '', interpretation: 'Uranus brings sudden insight, innovation, and the urge to break free. It colors the areas of life where we seek originality and awakenings.' },
    { id: 'neptune', name: 'Neptune', glyph: '♆', size: 5.5, period: 60190, spinPeriod: 0.67,
      color: '#7aa8d8', hi: '#b8d4f0', lo: '#3a5a8a',
      sign: '', interpretation: 'Neptune dissolves boundaries and inspires dreams, compassion, and the mystical. It rules intuition, art, and the longing to merge with something greater.' },
  ];

  const SIGN_GLYPHS  = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'].map(g => g + '︎');
  const SIGN_NAMES   = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo',
                        'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
  const RADIAL_COMP  = 0.5;
  const ORBIT_SAMPLES = 160;

  // Aspect definitions for aspect lines
  const ASPECTS = [
    { name: 'Conjunction', angle:   0, orb: 8,  color: 'rgba(201, 162, 39,' },
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
  const SCRUB_SENS = 0.4;   // days of real time per px of horizontal drag (mirror of WebGL engine)
  let onScrub = null;
  let lastFrame = 0;
  let orbits = {};
  let bodies = [];

  // ── Your sky, pinned (ported from the Celestia prototype) ──
  // chart.html stores natal Sun/Moon/ASC longitudes after a cast; the home
  // orrery wears them as medallions on the zodiac ring ever after.
  let natalPins = null;
  function loadNatalPins() {
    try {
      const np = JSON.parse(localStorage.getItem('ap_natal_pins') || 'null');
      natalPins = (np && np.points) ? np : null;
    } catch (e) { natalPins = null; }
  }
  loadNatalPins();
  window.addEventListener('storage', e => { if (e.key === 'ap_natal_pins') loadNatalPins(); });
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

  // Hero-optimized defaults: clean, elegant, instantly understandable
  let showOrbits = true;       // very faint elegant orbits – help see the clockwork without clutter
  let showLabels = true;       // planet names + current signs – essential for comprehension
  let showAsteroids = false;   // off in hero – adds noise; can be toggled in full Instrument view
  showParticles = false;   // keep minimal for hero; beautiful but secondary
  showShootingStars = false; // rare elegant events only in deeper views

  // Zodiac ring frame throttle
  let zodiacFrameCount = 0;

  // Planet self-rotation (axial spin) for living 3D feel
  let planetSpins = {};   // id -> current angle in radians

  // Asteroid belt (between Mars and Jupiter)
  let asteroids = [];
  let asteroidsInited = false;

  // Reduced motion
  const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Intro zoom sequence: start close on Earth (instant recognition), zoom out to full solar system, then rotate
  let introActive = false;
  let introProgress = 0;
  const introStartZoom = 5.5;   // very close "globe" view of Earth to start
  const introDuration = 4.8;    // seconds

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
      let lon = null;
      try {
        if (p.id === 'earth') {
          const sun = E.sunPosition(jd);
          // Earth's ecliptic lon = sun lon + 180
          lon = (sun.lon + 180) % 360;
          sign = lonToSign(lon);
        } else {
          const g = E[p.id + 'Position'](jd);
          lon = g.lon;
          sign = lonToSign(lon);
        }
      } catch (e) { /* optional */ }
      return { ...p, pos, sign, lon };
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
        lon: m.lon,
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

  function initAsteroids() {
    if (asteroidsInited) return;
    asteroidsInited = true;
    asteroids = [];
    const count = 72;
    const innerR = 1.85; // between Mars & Jupiter, in our compressed units
    const outerR = 2.15;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.04;
      const r = innerR + Math.random() * (outerR - innerR);
      asteroids.push({
        angle: a,
        r,
        size: 0.6 + Math.random() * 1.1,
        phase: Math.random() * Math.PI * 2,
        speed: 0.0008 + Math.random() * 0.0006, // slow orbital drift
      });
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

  // Self-rotation for planets (makes them feel 3D and alive)
  function updatePlanetSpins(dt) {
    if (prefersReducedMotion) return;
    PLANETS.forEach(p => {
      if (!planetSpins[p.id]) planetSpins[p.id] = Math.random() * Math.PI * 2;
      const spinRate = (2 * Math.PI) / (p.spinPeriod * 24); // artistic visual speed (days scaled)
      planetSpins[p.id] += spinRate * dt * 120; // boost for nice visible rotation
      planetSpins[p.id] %= Math.PI * 2;
    });
  }

  function drawParticles() {
    if (!showParticles || prefersReducedMotion) return;
    particles.forEach(p => {
      const opacity = p.opacity * (0.7 + 0.3 * Math.sin(p.phase));
      ctx.globalAlpha = opacity;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.gold ? '#c9a227' : '#d8dce8';
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
      grad.addColorStop(0.6, `rgba(201, 162, 39,${alpha * 0.5})`);
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
      // Horizontal drag SCRUBS REAL TIME (planets walk to their true dated positions);
      // vertical drag tilts the view. (Mirrors the WebGL engine.)
      const dxp = e.clientX - lastX;
      if (dxp) { dayOffset += dxp * SCRUB_SENS; computeBodies(); if (onScrub) { try { onScrub(baseJd + dayOffset); } catch (_) {} } }
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
    const sun = { id: 'sun', name: 'Sun', glyph: '☉', size: 13 * sunPr.f,
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
    if (hit) {
      if (onPlanetClick) onPlanetClick(hit);
      // Also dispatch custom event so hero (and other pages) can listen without setting the callback
      try {
        const ev = new CustomEvent('orrery-planet-click', { detail: hit, bubbles: true });
        (canvas || document).dispatchEvent(ev);
      } catch (_) {}
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
        if (a.lon == null || b.lon == null) continue;
        const aDeg = a.lon;
        const bDeg = b.lon;
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
    initAsteroids();

    // Initial camera for the opening "globe" phase — looking nicely at Earth
    const earth0 = bodies.find(b => b.id === 'earth');
    if (earth0) {
      yaw = Math.atan2(earth0.pos.y, earth0.pos.x) - 0.55;
      pitch = 0.48;
    }
    targetZoomScale = introStartZoom;
    currentZoomScale = introStartZoom;

    if (!prefersReducedMotion) scheduleNextShootingStar(performance.now());

    // Stronger, slower, more guided Earth-first intro: deliberate pull-back that teaches scale and structure
    if (!prefersReducedMotion) {
      introActive = true;
      introProgress = 0;
      autoSpin = false;
    } else {
      autoSpin = true;
    }

    lastFrame = performance.now();
    loop(lastFrame);
  }

  function resize() {
    dpr = (window.RafCore && RafCore.hdDPR) ? RafCore.hdDPR(2.5) : Math.min(window.devicePixelRatio || 1, 2.5);
    const rect = wrap.getBoundingClientRect();
    // If the wrap isn't laid out yet (width ~0), Math.max would lock us to the 280 floor —
    // a tiny orrery on a desktop hero. Arm a one-shot refit on the next frame instead.
    if (rect.width < 40 && !resize._armed) {
      resize._armed = true;
      requestAnimationFrame(function () { resize._armed = false; resize(); });
    }
    // Match intended hero presence: up to 580px logical (CSS sets 580 on desktop, scales down responsively)
    const sizeCap = (window.RafCore && RafCore.tier === 'high') ? 760 : 640;
    const size = Math.min(Math.max(rect.width, 280), sizeCap);
    W = H = size;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    cx = cy = size / 2;
    scale = (size / 2 - 18) / 3.7;
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;
      if (ctx.imageSmoothingQuality) ctx.imageSmoothingQuality = 'high';
    }
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
    if (ui.play) ui.play.textContent = s === 0 ? '▶' : '‖';
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

    // Intro sequence: zoom out from Earth, then hand off to auto rotation
    if (introActive && !prefersReducedMotion) {
      introProgress += dt / introDuration;
      if (introProgress >= 1) {
        introActive = false;
        targetZoomScale = 1.0;
        autoSpin = true;
        lastInteract = ts - 2800;
      } else {
        const eased = 1 - Math.pow(1 - Math.min(introProgress, 1), 2.5);
        targetZoomScale = introStartZoom * (1 - eased) + 1.0 * eased;

        // Very gentle camera motion only after the pure globe phase
        if (introProgress > 0.22) {
          yaw += 0.00055 * (introProgress - 0.22) * 1.8;
        }
      }
    } else if (autoSpin && !dragging && ts - lastInteract > 3000) {
      yaw += 0.00115;
    }

    updatePlanetSpins(dt);
    updateZoom();
    updateParticles(dt);

    if (!prefersReducedMotion) coronaPhase += 0.018;

    draw(ts);
  }

  // ── Rendering ─────────────────────────────────────────────────────────────

  function draw(ts) {
    ctx.clearRect(0, 0, W, H);

    // During pure globe phase, suppress all the decorative layers so it's a clean Earth globe
    const isGlobePhase = introActive && introProgress < 0.28;
    if (!isGlobePhase) {
      drawParticles();
      if (showAsteroids) drawAsteroids();
    }

    zodiacFrameCount++;
    if (!isGlobePhase && zodiacFrameCount % 3 === 0) {
      drawZodiacRing();
    }

    if (!isGlobePhase && showOrbits) drawOrbitPaths();
    if (!isGlobePhase) drawAspectLines();

    const items = bodies.map(b => ({ kind: 'planet', b, pr: project(b.pos) }));
    items.push({ kind: 'sun', pr: project({ x: 0, y: 0, z: 0 }) });
    items.sort((a, b) => b.pr.depth - a.pr.depth);

    // Globe-first reveal: during the opening phase show a clean Earth + Sun only,
    // then gradually bring in the rest of the solar system as we zoom out.
    let visibleItems = items;
    if (introActive) {
      if (introProgress < 0.28) {
        // Pure globe phase — just the beautiful rotating Earth + Sun (longer for visibility)
        visibleItems = items.filter(it => it.kind === 'sun' || (it.b && it.b.id === 'earth'));
      } else if (introProgress < 0.55) {
        // Early pull-back — inner system starts to appear
        visibleItems = items.filter(it =>
          it.kind === 'sun' ||
          (it.b && (it.b.id === 'earth' || it.b.id === 'mercury' || it.b.id === 'venus' || it.b.id === 'mars'))
        );
      }
      // After ~0.55 the full system is visible and the gentle rotation has begun
    }

    // Trails (only meaningful after the globe phase)
    if (speed !== 0 && (!introActive || introProgress > 0.35)) {
      items.forEach(it => {
        if (it.kind !== 'planet' || it.b.id === 'moon') return;
        let t = trails.get(it.b.id);
        if (!t) { t = []; trails.set(it.b.id, t); }
        t.push({ x: it.pr.x, y: it.pr.y });
        if (t.length > 26) t.shift();
      });
    }
    if (!introActive || introProgress > 0.35) {
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
    }

    visibleItems.forEach(it => it.kind === 'sun' ? drawSun(it.pr) : drawPlanet(it.b, it.pr));

    if (showLabels) drawPlanetLabels(visibleItems);

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
    ctx.strokeStyle = `rgba(201, 162, 39,${0.18 * baseAlpha})`;
    ctx.stroke();

    for (let i = 0; i < 12; i++) {
      const a0 = (i * 30) * Math.PI / 180;
      const t0 = project({ x: Math.cos(a0) * (R - 0.09), y: Math.sin(a0) * (R - 0.09), z: 0 });
      const t1 = project({ x: Math.cos(a0) * (R + 0.09), y: Math.sin(a0) * (R + 0.09), z: 0 });
      ctx.beginPath();
      ctx.moveTo(t0.x, t0.y); ctx.lineTo(t1.x, t1.y);
      ctx.strokeStyle = `rgba(201, 162, 39,${0.22 * baseAlpha})`;
      ctx.stroke();

      const am = (i * 30 + 15) * Math.PI / 180;
      const g = project({ x: Math.cos(am) * (R + 0.3), y: Math.sin(am) * (R + 0.3), z: 0 });
      // Depth-based fade: signs at back of ring are dimmer
      const depthFade = Math.max(0.05, 0.5 + 0.5 * (1 - Math.min(1, (g.depth + 3.5) / 7)));
      const glyphAlpha = (0.15 + 0.25 * g.f) * depthFade * baseAlpha;
      if (glyphAlpha < 0.04) continue;
      ctx.font = `${Math.max(9, 12 * g.f)}px 'AstroGlyph', serif`;
      ctx.fillStyle = `rgba(201, 162, 39,${glyphAlpha})`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(SIGN_GLYPHS[i], g.x, g.y);
    }

    // Natal medallions — the visitor's own Sun, Moon and Ascendant riding the band
    if (natalPins && ringVisible) {
      const PIN = { sun: ['☉', 12], moon: ['☽', 12], asc: ['ASC', 6.5] };
      for (const [k, lonDeg] of Object.entries(natalPins.points)) {
        if (!isFinite(lonDeg) || !PIN[k]) continue;
        const a = lonDeg * Math.PI / 180;
        const tip  = project({ x: Math.cos(a) * (R + 0.52), y: Math.sin(a) * (R + 0.52), z: 0 });
        const base = project({ x: Math.cos(a) * (R + 0.07), y: Math.sin(a) * (R + 0.07), z: 0 });
        const depthFade = Math.max(0.15, 0.5 + 0.5 * (1 - Math.min(1, (tip.depth + 3.5) / 7)));
        const al = depthFade * baseAlpha;
        if (al < 0.06) continue;
        ctx.beginPath();
        ctx.moveTo(base.x, base.y); ctx.lineTo(tip.x, tip.y);
        ctx.strokeStyle = `rgba(232,201,106,${0.5 * al})`;
        ctx.lineWidth = 1;
        ctx.stroke();
        const r2 = Math.max(7, 9.5 * tip.f);
        ctx.beginPath();
        ctx.arc(tip.x, tip.y, r2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(10,8,6,${0.85 * al})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(232,201,106,${0.9 * al})`;
        ctx.lineWidth = 1.1;
        ctx.stroke();
        const [glyph, fs] = PIN[k];
        ctx.font = `${Math.max(fs * 0.8, fs * tip.f)}px ${k === 'asc' ? 'Inter, sans-serif' : 'serif'}`;
        ctx.fillStyle = `rgba(239,227,192,${Math.min(1, 1.05 * al)})`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(glyph, tip.x, tip.y);
      }
      // quiet legend — this is no longer the sky today; it is also YOUR sky
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = `rgba(232,201,106,${0.45 * baseAlpha})`;
      ctx.fillText(`✦ ${natalPins.name ? natalPins.name + '’s' : 'your'} sky pinned`, 14, H - 14);
    }
  }

  function drawOrbitPaths() {
    PLANETS.forEach(p => {
      const pts = orbits[p.id];
      if (!pts) return;
      const isInner = INNER_IDS.has(p.id);
      const baseColor = isInner ? '201, 162, 39' : '120,160,220';

      // Draw orbit in segments with soft glow + depth fade for stronger 3D graphic presence
      for (let i = 0; i < pts.length; i++) {
        const curr = project(pts[i]);
        const next = project(pts[(i + 1) % pts.length]);
        const d = curr.depth;
        const depthAlpha = 0.06 + 0.16 * Math.max(0, Math.min(1, (d + 3.6) / 7.2));

        // Soft outer glow pass
        ctx.beginPath();
        ctx.moveTo(curr.x, curr.y);
        ctx.lineTo(next.x, next.y);
        ctx.strokeStyle = `rgba(${baseColor},${depthAlpha * 0.55})`;
        ctx.lineWidth = 2.8;
        ctx.stroke();

        // Crisp core line
        ctx.beginPath();
        ctx.moveTo(curr.x, curr.y);
        ctx.lineTo(next.x, next.y);
        ctx.strokeStyle = `rgba(${baseColor},${depthAlpha})`;
        ctx.lineWidth = 0.9;
        ctx.stroke();
      }
    });
  }

  function drawAsteroids() {
    if (prefersReducedMotion || asteroids.length === 0) return;
    const beltAlpha = 0.45;
    ctx.save();
    asteroids.forEach(ast => {
      // slow drift
      ast.angle += ast.speed;
      const pos = project({
        x: Math.cos(ast.angle) * ast.r,
        y: Math.sin(ast.angle) * ast.r * 0.7, // slight tilt for 3D belt feel
        z: 0,
      });
      const s = Math.max(0.4, ast.size * (pos.f * 0.8));
      ctx.globalAlpha = beltAlpha * (0.6 + 0.4 * Math.sin(ast.phase));
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, s, 0, Math.PI * 2);
      ctx.fillStyle = '#d4c8a0';
      ctx.fill();
      // tiny glow
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, s * 2.2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(201, 162, 39, 0.12)';
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawSun(pr) {
    const r = 13 * pr.f;

    // Richer animated corona — multiple layered glows + subtle rays for more 3D solar presence
    if (!prefersReducedMotion) {
      // Main pulsing corona
      for (let ring = 0; ring < 4; ring++) {
        const phase = coronaPhase + ring * (Math.PI * 2 / 3.2);
        const pulseR = r * (4.2 + ring * 1.35 + 0.55 * Math.sin(phase));
        const baseOp = [0.18, 0.11, 0.065, 0.035][ring];
        const opacity = baseOp * (0.65 + 0.45 * Math.sin(phase * 1.4 + ring * 0.7));
        const corona = ctx.createRadialGradient(pr.x, pr.y, r * 0.7, pr.x, pr.y, pulseR);
        corona.addColorStop(0, `rgba(255,235,140,${opacity})`);
        corona.addColorStop(0.35, `rgba(201, 162, 39,${opacity * 0.65})`);
        corona.addColorStop(0.7, `rgba(180,110,30,${opacity * 0.35})`);
        corona.addColorStop(1, 'rgba(140,70,10,0)');
        ctx.beginPath();
        ctx.arc(pr.x, pr.y, pulseR, 0, Math.PI * 2);
        ctx.fillStyle = corona;
        ctx.fill();
      }

      // Soft radial rays (subtle energy)
      ctx.save();
      ctx.translate(pr.x, pr.y);
      ctx.rotate(coronaPhase * 0.6);
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(ang) * r * 5.5, Math.sin(ang) * r * 5.5);
        ctx.strokeStyle = `rgba(255,220,100,${0.09 + Math.sin(coronaPhase * 2 + i) * 0.04})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      ctx.restore();
    } else {
      // Static rich glow for reduced motion
      const glow = ctx.createRadialGradient(pr.x, pr.y, 0, pr.x, pr.y, r * 5);
      glow.addColorStop(0, 'rgba(255,235,140,0.65)');
      glow.addColorStop(0.3, 'rgba(240,192,64,0.35)');
      glow.addColorStop(0.6, 'rgba(201, 162, 39,0.12)');
      glow.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(pr.x, pr.y, r * 5, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();
    }

    // Strong outer halo
    const outerGlow = ctx.createRadialGradient(pr.x, pr.y, r * 0.6, pr.x, pr.y, r * 3.2);
    outerGlow.addColorStop(0, 'rgba(255,230,120,0.55)');
    outerGlow.addColorStop(0.5, 'rgba(201, 162, 39,0.22)');
    outerGlow.addColorStop(1, 'rgba(180,110,30,0)');
    ctx.beginPath();
    ctx.arc(pr.x, pr.y, r * 3.2, 0, Math.PI * 2);
    ctx.fillStyle = outerGlow;
    ctx.fill();

    // Core sphere with better 3D shading
    const core = ctx.createRadialGradient(
      pr.x - r * 0.25, pr.y - r * 0.28, r * 0.08,
      pr.x + r * 0.1, pr.y + r * 0.1, r * 1.1
    );
    core.addColorStop(0, '#fffdf0');
    core.addColorStop(0.35, '#ffe070');
    core.addColorStop(0.7, '#f0c040');
    core.addColorStop(1, '#c48a20');
    ctx.beginPath();
    ctx.arc(pr.x, pr.y, r, 0, Math.PI * 2);
    ctx.fillStyle = core;
    ctx.fill();

    // Sharp specular highlight
    ctx.beginPath();
    ctx.arc(pr.x - r * 0.32, pr.y - r * 0.35, r * 0.26, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,245,0.85)';
    ctx.fill();

    // Tiny bright core
    ctx.beginPath();
    ctx.arc(pr.x - r * 0.12, pr.y - r * 0.15, r * 0.18, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fill();
  }

  function drawPlanet(b, pr) {
    const r = Math.max(1.6, b.size * pr.f);

    // Stronger atmospheric/rim glow for more 3D volume
    const haloR = r * 2.8;
    const [hr, hg, hb] = hexToRgb(b.color);
    const halo = ctx.createRadialGradient(pr.x, pr.y, r * 0.35, pr.x, pr.y, haloR);
    halo.addColorStop(0, `rgba(${hr},${hg},${hb},0.32)`);
    halo.addColorStop(0.5, `rgba(${hr},${hg},${hb},0.12)`);
    halo.addColorStop(1, `rgba(${hr},${hg},${hb},0)`);
    ctx.beginPath();
    ctx.arc(pr.x, pr.y, haloR, 0, Math.PI * 2);
    ctx.fillStyle = halo;
    ctx.fill();

    // Directional lighting from sun (improved 3D sphere)
    const sunPr = project({ x: 0, y: 0, z: 0 });
    let lx = sunPr.x - pr.x, ly = sunPr.y - pr.y;
    const ll = Math.sqrt(lx * lx + ly * ly) || 1;
    lx /= ll; ly /= ll;

    const spin = planetSpins[b.id] || 0;
    const rotX = lx * Math.cos(spin) - ly * Math.sin(spin); // rotate light dir with planet spin for living surface
    const rotY = lx * Math.sin(spin) + ly * Math.cos(spin);

    const grad = ctx.createRadialGradient(
      pr.x + rotX * r * 0.38, pr.y + rotY * r * 0.38, r * 0.08,
      pr.x - rotX * r * 0.25, pr.y - rotY * r * 0.25, r * 1.15
    );
    grad.addColorStop(0, b.hi);
    grad.addColorStop(0.42, b.color);
    grad.addColorStop(0.78, b.lo);
    grad.addColorStop(1, 'rgba(20,18,28,0.6)');  // subtle terminator shading
    ctx.beginPath();
    ctx.arc(pr.x, pr.y, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Sharper moving specular highlight (top-left relative to light + spin)
    const specX = pr.x + rotX * r * 0.18 - r * 0.22;
    const specY = pr.y + rotY * r * 0.18 - r * 0.26;
    ctx.beginPath();
    ctx.arc(specX, specY, r * 0.32, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,250,0.75)';
    ctx.fill();

    // Tiny bright core reflection
    ctx.beginPath();
    ctx.arc(specX - r * 0.06, specY - r * 0.06, r * 0.11, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fill();

    // Gas giant bands — more realistic layered look
    if (b.id === 'jupiter' || b.id === 'saturn') {
      ctx.save();
      ctx.translate(pr.x, pr.y);
      ctx.rotate(spin * 0.65);
      // Multiple band colors for depth
      for (let band = -3; band <= 3; band++) {
        const by = band * r * 0.29;
        const wobble = Math.sin(spin * 1.8 + band) * 1.5;
        ctx.beginPath();
        ctx.moveTo(-r * 1.08, by + wobble);
        ctx.quadraticCurveTo(0, by + 3 + wobble * 0.6, r * 1.08, by - wobble);
        const alpha = 0.22 + Math.abs(band) * 0.04;
        ctx.strokeStyle = b.id === 'jupiter'
          ? `rgba(58,42,28,${alpha})`
          : `rgba(88,73,52,${alpha * 0.9})`;
        ctx.lineWidth = r * (0.09 + Math.abs(band) * 0.015);
        ctx.stroke();
      }
      // Jupiter Great Red Spot hint
      if (b.id === 'jupiter') {
        ctx.fillStyle = 'rgba(170, 68, 48, 0.55)';
        ctx.beginPath();
        ctx.ellipse(r * 0.18, -r * 0.08, r * 0.14, r * 0.07, spin * 0.6 + 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Earth — realistic detailed globe (the opening "start with a globe" view)
    // When very close (high zoom at intro start) it reads as a beautiful spinning Earth.
    // As we zoom out it becomes the anchor of the solar system.
    if (b.id === 'earth') {
      const spinOffset = spin * 1.2;
      ctx.save();
      ctx.translate(pr.x, pr.y);

      // Ocean base (richer, deeper blue)
      const ocean = ctx.createRadialGradient(-r*0.22, -r*0.28, r*0.25, 0, 0, r*1.08);
      ocean.addColorStop(0, '#3b9be8');
      ocean.addColorStop(0.42, '#2a7bc4');
      ocean.addColorStop(0.78, '#1e5a9a');
      ocean.addColorStop(1, '#154a7a');
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = ocean;
      ctx.fill();

      // Land / continents (rotate with spin so you see the globe turning)
      ctx.fillStyle = 'rgba(46, 125, 50, 0.72)';
      // Rough Africa/South America shape
      ctx.beginPath();
      ctx.ellipse(-r*0.12, r*0.08, r*0.17, r*0.35, spinOffset * 0.55, 0, Math.PI * 2);
      ctx.fill();
      // Americas
      ctx.beginPath();
      ctx.ellipse(-r*0.38, -r*0.12, r*0.11, r*0.36, spinOffset * 0.55 + 0.35, 0, Math.PI * 2);
      ctx.fill();
      // Eurasia
      ctx.fillStyle = 'rgba(56, 142, 60, 0.6)';
      ctx.beginPath();
      ctx.ellipse(r*0.25, -r*0.18, r*0.35, r*0.16, spinOffset * 0.55 - 0.15, 0, Math.PI * 2);
      ctx.fill();
      // Australia
      ctx.beginPath();
      ctx.ellipse(r*0.42, r*0.35, r*0.12, r*0.07, spinOffset * 0.55 + 1.0, 0, Math.PI * 2);
      ctx.fill();

      // Polar ice caps
      ctx.fillStyle = 'rgba(245, 250, 255, 0.9)';
      ctx.beginPath();
      ctx.arc(0, -r * 0.9, r * 0.17, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, r * 0.9, r * 0.145, 0, Math.PI * 2);
      ctx.fill();

      // Cloud layers (multiple speeds and opacities for realistic globe look)
      ctx.strokeStyle = 'rgba(255,255,255,0.78)';
      ctx.lineWidth = r * 0.105;
      for (let c = -2; c <= 2; c++) {
        const cy = c * r * 0.26;
        const ph = spinOffset * (0.85 + c * 0.12);
        ctx.beginPath();
        ctx.moveTo(-r * 0.96, cy);
        ctx.quadraticCurveTo(-r*0.25, cy + 5.5 * Math.sin(ph), r*0.35, cy - 4 * Math.sin(ph + 1.2));
        ctx.quadraticCurveTo(r*0.65, cy + 3.5 * Math.sin(ph + 2), r * 0.96, cy);
        ctx.stroke();
      }
      // High thin clouds
      ctx.lineWidth = r * 0.05;
      ctx.strokeStyle = 'rgba(255,255,255,0.42)';
      for (let c = -1; c <= 1; c++) {
        const cy = c * r * 0.52;
        ctx.beginPath();
        ctx.moveTo(-r*0.82, cy);
        ctx.quadraticCurveTo(r*0.5, cy + 7 * Math.sin(spinOffset * 1.35 + c), r*0.82, cy);
        ctx.stroke();
      }

      // Atmosphere (strong and clean when close — this is what makes it feel like a real planet)
      const atm = ctx.createRadialGradient(-r*0.08, -r*0.12, r*0.65, 0, 0, r * 1.92);
      atm.addColorStop(0, 'rgba(75,165,255,0.0)');
      atm.addColorStop(0.48, 'rgba(115,200,255,0.32)');
      atm.addColorStop(1, 'rgba(150,225,255,0.0)');
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.92, 0, Math.PI * 2);
      ctx.fillStyle = atm;
      ctx.fill();

      // Ocean specular glint (gives wet realistic look)
      const glint = ctx.createRadialGradient(r*0.32, -r*0.22, r*0.06, r*0.42, -r*0.32, r*0.5);
      glint.addColorStop(0, 'rgba(255,255,255,0.6)');
      glint.addColorStop(0.7, 'rgba(255,255,255,0.0)');
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = glint;
      ctx.fill();

      ctx.restore();

      // "EARTH • You are here" — strong and clear at the very beginning (globe phase),
      // then gracefully becomes the normal label as we zoom out.
      const showEarthAnchor = introActive && (introProgress < 0.82);
      if (showEarthAnchor) {
        const af = Math.max(0.18, 1 - introProgress * 0.9);
        ctx.font = `${Math.max(13, 17 * pr.f)}px Inter, system-ui`;
        ctx.fillStyle = `rgba(235,245,255,${af * 0.97})`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('EARTH', pr.x, pr.y + r * 2.2);
        ctx.font = `${Math.max(9, 11.5 * pr.f)}px Inter, system-ui`;
        ctx.fillStyle = `rgba(130,205,255,${af * 0.78})`;
        ctx.fillText('You are here', pr.x, pr.y + r * 2.58);
      }
    }

    // Saturn rings — more realistic with shadow and division
    if (b.id === 'saturn') {
      ctx.save();
      ctx.translate(pr.x, pr.y);
      ctx.rotate(-0.38);
      const ringScale = 0.26 + 0.32 * Math.cos(pitch);
      ctx.scale(1, ringScale);

      // Ring shadow on the planet (subtle but nice when close)
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.35, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(30,28,35,0.25)';
      ctx.fill();

      // Main outer ring
      ctx.beginPath();
      ctx.arc(0, 0, r * 2.6, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(215,192,152,0.72)';
      ctx.lineWidth = r * 0.46;
      ctx.stroke();

      // Cassini-like gap
      ctx.beginPath();
      ctx.arc(0, 0, r * 2.18, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(40,35,28,0.55)';
      ctx.lineWidth = r * 0.09;
      ctx.stroke();

      // Inner bright band
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.78, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(232,218,178,0.5)';
      ctx.lineWidth = r * 0.19;
      ctx.stroke();

      ctx.restore();
    }

    // Earth — nicer blue atmosphere halo
    if (b.id === 'earth') {
      ctx.beginPath();
      ctx.arc(pr.x, pr.y, r * 1.55, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(110,175,235,0.28)';
      ctx.lineWidth = Math.max(1.2, r * 0.35);
      ctx.stroke();

      // Thin cloud layer hint
      ctx.beginPath();
      ctx.arc(pr.x - r * 0.15, pr.y - r * 0.1, r * 1.05, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(240,245,255,0.22)';
      ctx.lineWidth = 0.9;
      ctx.stroke();
    }

    // Uranus/Neptune — subtle ring or haze
    if (b.id === 'uranus' || b.id === 'neptune') {
      ctx.save();
      ctx.translate(pr.x, pr.y);
      ctx.rotate(b.id === 'uranus' ? -1.1 : 0.6);
      ctx.scale(1, 0.22);
      ctx.beginPath();
      ctx.arc(0, 0, r * 2.1, 0, Math.PI * 2);
      ctx.strokeStyle = b.id === 'uranus' ? 'rgba(180,225,250,0.4)' : 'rgba(130,175,235,0.35)';
      ctx.lineWidth = r * 0.55;
      ctx.stroke();
      ctx.restore();
    }

    // Glyph label — crisper and slightly larger
    if (b.id !== 'moon' || pr.f > 0.85) {
      ctx.font = `${Math.max(9, 13 * pr.f)}px 'AstroGlyph', serif`;
      ctx.fillStyle = b.hi;
      ctx.globalAlpha = 0.92;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(b.glyph, pr.x, pr.y - r - 4);
      ctx.globalAlpha = 1;
    }
  }

  function drawPlanetLabels(items) {
    items.forEach(it => {
      if (it.kind === 'sun') return;
      const b = it.b;
      const pr = it.pr;
      if (!b || pr.f < 0.35) return; // hide when small / far
      const r = Math.max(1.6, b.size * pr.f);
      ctx.font = `${Math.max(7, 9.5 * pr.f)}px Inter, sans-serif`;
      ctx.fillStyle = 'rgba(232, 224, 208, 0.85)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const label = b.name;
      ctx.fillText(label, pr.x, pr.y + r + 2);
    });
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

  function scrubDays(d) {
    dayOffset += Number(d) || 0;
    setSpeed(0);
    computeBodies();
    if (onScrub) { try { onScrub(baseJd + dayOffset); } catch (_) {} }
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
    scrubDays,
    setDate,
    getDate,
    setBodies,
    getPlanets,
    nowJd: () => baseJd + dayOffset,
    get onScrub() { return onScrub; },
    set onScrub(fn) { onScrub = (typeof fn === 'function') ? fn : null; },
    // Backward compat aliases
    goTo,
    // New API
    setShowAspects,
    setShowParticles,
    triggerShootingStar,
    // New layer toggles for upgraded solar system
    setShowOrbits(bool) { showOrbits = !!bool; },
    setShowLabels(bool) { showLabels = !!bool; },
    setShowAsteroids(bool) { showAsteroids = !!bool; },
    // Callback property (set externally: Orrery3D.onPlanetClick = fn)
    get onPlanetClick() { return onPlanetClick; },
    set onPlanetClick(fn) { onPlanetClick = fn; },
  };

})();
