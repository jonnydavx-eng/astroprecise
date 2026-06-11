/**
 * AstroPrecise — 3D Solar System Orrery
 * Canvas-based heliocentric 3D view with accurate live planetary positions.
 *
 * Positions are exact per the VSOP87 ephemeris: heliocentric vectors are
 * recovered from the geocentric output (helio = geo − Sun), so planets sit at
 * their true ecliptic longitude/latitude for the displayed moment. Radial
 * distances are compressed (r^0.5) so Mercury→Saturn fit one view; angles are
 * never altered.
 *
 * Requires AstroEphemeris (ephemeris.js) loaded first.
 */

window.Orrery3D = (() => {
  'use strict';

  const PLANETS = [
    { id: 'mercury', name: 'Mercury', glyph: '☿', size: 3,   period: 87.969,
      color: '#8a8580', hi: '#c8c2bc', lo: '#4a4744' },
    { id: 'venus',   name: 'Venus',   glyph: '♀', size: 5,   period: 224.701,
      color: '#c8a86a', hi: '#ecd9a8', lo: '#7a6238' },
    { id: 'earth',   name: 'Earth',   glyph: '⊕', size: 5.5, period: 365.256,
      color: '#3274b8', hi: '#7ab4e8', lo: '#173a64' },
    { id: 'mars',    name: 'Mars',    glyph: '♂', size: 4,   period: 686.980,
      color: '#b84a32', hi: '#e08868', lo: '#642618' },
    { id: 'jupiter', name: 'Jupiter', glyph: '♃', size: 9,   period: 4332.589,
      color: '#c08858', hi: '#e8bc90', lo: '#6c4a2c' },
    { id: 'saturn',  name: 'Saturn',  glyph: '♄', size: 7.5, period: 10759.22,
      color: '#c8b48a', hi: '#ecdcb8', lo: '#6e6248' },
  ];

  const SIGN_GLYPHS = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'].map(g => g + '\uFE0E');
  const RADIAL_COMP = 0.5;            // r' = r^COMP (AU), angles untouched
  const ORBIT_SAMPLES = 160;

  // ── State ─────────────────────────────────────────────────────────────────
  let canvas, ctx, wrap, W, H, cx, cy, dpr, scale;
  let raf = null, destroyed = false;
  let yaw = -0.35, pitch = 1.05;      // radians; pitch 0 = edge-on, π/2 = top-down
  let autoSpin = true, lastInteract = 0;
  let dragging = false, lastX = 0, lastY = 0;
  let baseJd = 0;                     // JD at "now" when initialised
  let dayOffset = 0;                  // animated days past baseJd
  let speed = 0;                      // days per second (0 = paused at now)
  let lastFrame = 0;
  let orbits = {};                    // id -> [{x,y,z} display coords]
  let bodies = [];                    // current frame positions
  let ui = {};

  // ── Astronomy ─────────────────────────────────────────────────────────────

  function rectOf(lon, lat, r) {
    const lo = lon * Math.PI / 180, la = lat * Math.PI / 180;
    return {
      x: r * Math.cos(la) * Math.cos(lo),
      y: r * Math.cos(la) * Math.sin(lo),
      z: r * Math.sin(la),
    };
  }

  // Heliocentric position in display units (compressed radius, true direction)
  function helioDisplay(id, jd) {
    const E = window.AstroEphemeris;
    const sun = E.sunPosition(jd);                     // geocentric Sun
    const s = rectOf(sun.lon, 0, sun.distance);
    let h;
    if (id === 'earth') {
      h = { x: -s.x, y: -s.y, z: -s.z };
    } else {
      const g = E[id + 'Position'](jd);                // geocentric planet
      const gr = rectOf(g.lon, g.lat, g.distance);
      h = { x: gr.x - s.x, y: gr.y - s.y, z: gr.z - s.z };
    }
    const r = Math.sqrt(h.x * h.x + h.y * h.y + h.z * h.z) || 1e-9;
    const rc = Math.pow(r, RADIAL_COMP);
    return { x: h.x / r * rc, y: h.y / r * rc, z: h.z / r * rc, au: r };
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
    bodies = PLANETS.map(p => ({ ...p, pos: helioDisplay(p.id, jd) }));
    // Moon: true geocentric direction, exaggerated distance from Earth
    try {
      const earth = bodies.find(b => b.id === 'earth');
      const m = E.moonPosition(jd);
      const dir = rectOf(m.lon, m.lat, 1);
      const sun = E.sunPosition(jd);
      // moon geo vector relative to Earth, shown at fixed 0.16 display units
      bodies.push({
        id: 'moon', name: 'Moon', glyph: '☽', size: 2.2,
        color: '#c8ccd8', hi: '#eef0f6', lo: '#6a6e7a',
        pos: {
          x: earth.pos.x + dir.x * 0.16,
          y: earth.pos.y + dir.y * 0.16,
          z: earth.pos.z + dir.z * 0.16,
        },
      });
    } catch (e) { /* moon optional */ }
  }

  // ── Projection ────────────────────────────────────────────────────────────

  const FOCAL = 7.5;  // display units

  function project(p) {
    const cy_ = Math.cos(yaw),  sy_ = Math.sin(yaw);
    const cp_ = Math.cos(pitch), sp_ = Math.sin(pitch);
    const x1 = p.x * cy_ - p.y * sy_;
    const y1 = p.x * sy_ + p.y * cy_;
    // tilt: rotate around x-axis so ecliptic plane leans back
    const y2 = y1 * cp_ - p.z * sp_;            // into screen
    const z2 = y1 * sp_ + p.z * cp_;            // up on screen
    const f = FOCAL / (FOCAL + y2);
    return {
      x: cx + x1 * scale * f,
      y: cy - z2 * scale * f,
      f,
      depth: y2,
    };
  }

  // ── Setup ─────────────────────────────────────────────────────────────────

  function init(canvasEl) {
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
    buildControls();
    computeOrbits();
    computeBodies();
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
    // Saturn display radius = 9.58^0.5 ≈ 3.1; zodiac ring sits at 3.55
    scale = (size / 2 - 18) / 3.7;
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function bindPointer() {
    canvas.style.touchAction = 'pan-y';
    canvas.style.cursor = 'grab';
    canvas.addEventListener('pointerdown', e => {
      dragging = true; lastX = e.clientX; lastY = e.clientY;
      lastInteract = performance.now();
      canvas.setPointerCapture(e.pointerId);
      canvas.style.cursor = 'grabbing';
    });
    canvas.addEventListener('pointermove', e => {
      if (!dragging) return;
      yaw += (e.clientX - lastX) * 0.008;
      pitch = Math.min(1.5, Math.max(0.25, pitch + (e.clientY - lastY) * 0.006));
      lastX = e.clientX; lastY = e.clientY;
      lastInteract = performance.now();
    });
    const up = () => { dragging = false; canvas.style.cursor = 'grab'; };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
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
    ui.play.textContent = s === 0 ? '▶' : '⏸';
    ui.speedBtns.forEach(b => b.classList.toggle('active', +b.dataset.speed === s && s !== 0));
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
    draw();
  }

  // ── Rendering ─────────────────────────────────────────────────────────────

  function draw() {
    ctx.clearRect(0, 0, W, H);
    drawZodiacRing();
    drawOrbitPaths();

    // depth-sort: sun + planets, far first
    const items = bodies.map(b => ({ kind: 'planet', b, pr: project(b.pos) }));
    items.push({ kind: 'sun', pr: project({ x: 0, y: 0, z: 0 }) });
    items.sort((a, b) => b.pr.depth - a.pr.depth);
    items.forEach(it => it.kind === 'sun' ? drawSun(it.pr) : drawPlanet(it.b, it.pr));

    updateDate();
  }

  function drawZodiacRing() {
    const R = 3.45;
    ctx.lineWidth = 1;
    // ring on ecliptic plane
    ctx.beginPath();
    for (let i = 0; i <= 96; i++) {
      const a = (i / 96) * Math.PI * 2;
      const p = project({ x: Math.cos(a) * R, y: Math.sin(a) * R, z: 0 });
      i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
    }
    ctx.strokeStyle = 'rgba(196,146,10,0.28)';
    ctx.stroke();

    for (let i = 0; i < 12; i++) {
      const a0 = (i * 30) * Math.PI / 180;
      const t0 = project({ x: Math.cos(a0) * (R - 0.09), y: Math.sin(a0) * (R - 0.09), z: 0 });
      const t1 = project({ x: Math.cos(a0) * (R + 0.09), y: Math.sin(a0) * (R + 0.09), z: 0 });
      ctx.beginPath();
      ctx.moveTo(t0.x, t0.y); ctx.lineTo(t1.x, t1.y);
      ctx.strokeStyle = 'rgba(196,146,10,0.3)';
      ctx.stroke();

      const am = ((i * 30 + 15)) * Math.PI / 180;
      const g = project({ x: Math.cos(am) * (R + 0.28), y: Math.sin(am) * (R + 0.28), z: 0 });
      ctx.font = `${Math.max(10, 13 * g.f)}px serif`;
      ctx.fillStyle = `rgba(196,146,10,${0.35 + 0.35 * g.f})`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(SIGN_GLYPHS[i], g.x, g.y);
    }
  }

  function drawOrbitPaths() {
    PLANETS.forEach(p => {
      const pts = orbits[p.id];
      if (!pts) return;
      ctx.beginPath();
      for (let i = 0; i <= pts.length; i++) {
        const pr = project(pts[i % pts.length]);
        i === 0 ? ctx.moveTo(pr.x, pr.y) : ctx.lineTo(pr.x, pr.y);
      }
      ctx.strokeStyle = 'rgba(91, 127, 199,0.16)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    });
  }

  function drawSun(pr) {
    const r = 13 * pr.f;
    const glow = ctx.createRadialGradient(pr.x, pr.y, 0, pr.x, pr.y, r * 4);
    glow.addColorStop(0, 'rgba(240,192,64,0.55)');
    glow.addColorStop(0.4, 'rgba(196,146,10,0.18)');
    glow.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.arc(pr.x, pr.y, r * 4, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();

    const core = ctx.createRadialGradient(pr.x - r * 0.2, pr.y - r * 0.2, 0, pr.x, pr.y, r);
    core.addColorStop(0, '#fff8e0');
    core.addColorStop(0.5, '#f0c040');
    core.addColorStop(1, '#c4920a');
    ctx.beginPath();
    ctx.arc(pr.x, pr.y, r, 0, Math.PI * 2);
    ctx.fillStyle = core;
    ctx.fill();
  }

  function drawPlanet(b, pr) {
    const r = Math.max(1.6, b.size * pr.f);
    const sunPr = project({ x: 0, y: 0, z: 0 });
    // light comes from the sun's screen direction
    let lx = sunPr.x - pr.x, ly = sunPr.y - pr.y;
    const ll = Math.sqrt(lx * lx + ly * ly) || 1;
    lx /= ll; ly /= ll;

    const grad = ctx.createRadialGradient(
      pr.x + lx * r * 0.45, pr.y + ly * r * 0.45, r * 0.15,
      pr.x, pr.y, r * 1.05);
    grad.addColorStop(0, b.hi);
    grad.addColorStop(0.55, b.color);
    grad.addColorStop(1, b.lo);
    ctx.beginPath();
    ctx.arc(pr.x, pr.y, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    if (b.id === 'saturn') {
      ctx.save();
      ctx.translate(pr.x, pr.y);
      ctx.rotate(-0.35);
      ctx.scale(1, 0.32 + 0.25 * Math.cos(pitch));
      ctx.beginPath();
      ctx.arc(0, 0, r * 2.05, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(200,180,138,0.55)';
      ctx.lineWidth = r * 0.38;
      ctx.stroke();
      ctx.restore();
    }

    if (b.id === 'earth') {
      // subtle atmosphere
      ctx.beginPath();
      ctx.arc(pr.x, pr.y, r + 1.2, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(122,180,232,0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

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

  return { init, destroy };

})();
