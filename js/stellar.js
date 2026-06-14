/**
 * AstroPrecise — StellarBackground
 * Premium multi-layer starfield engine with nebula clouds, shooting stars,
 * mouse parallax, and constellation ghost lines.
 * Self-contained vanilla JS, no dependencies.
 */

window.StellarBackground = (function () {
  'use strict';

  // ── Constants ────────────────────────────────────────────────────────────────

  const SEED = 42;

  // Star counts per layer: far / mid / near
  const LAYER_COUNTS = [220, 130, 50];

  // Layer parallax offsets (CSS px per unit of mouse offset ratio)
  const PARALLAX_NEAR = 15;
  const PARALLAX_MID  = 8;
  const PARALLAX_FAR  = 3;

  // Nebula palette: [r, g, b, minAlpha, maxAlpha]
  const NEBULA_DEFS = [
    [92, 74, 110, 0.07, 0.13],   // lapis indigo
    [107, 33,  168, 0.06, 0.11],   // violet
    [139, 26,  46,  0.06, 0.12],   // oxblood crimson
    [201, 162, 39,  0.05, 0.09],   // gold
    [26,  44,  100, 0.06, 0.10],   // deep void blue
  ];

  // Constellation patterns: arrays of [xFrac, yFrac] pairs, edges as index pairs
  const CONSTELLATIONS = [
    {
      stars: [[0.12,0.18],[0.17,0.13],[0.22,0.16],[0.19,0.22],[0.14,0.24]],
      edges: [[0,1],[1,2],[2,3],[3,4],[4,0]],
    },
    {
      stars: [[0.75,0.10],[0.80,0.08],[0.85,0.11],[0.82,0.17],[0.77,0.17],[0.75,0.10]],
      edges: [[0,1],[1,2],[2,3],[3,4],[4,0],[0,3]],
    },
    {
      stars: [[0.55,0.70],[0.60,0.65],[0.66,0.68],[0.64,0.75],[0.57,0.77]],
      edges: [[0,1],[1,2],[2,3],[3,4],[4,0]],
    },
    {
      stars: [[0.30,0.50],[0.36,0.46],[0.42,0.50],[0.38,0.56],[0.32,0.55],[0.30,0.50]],
      edges: [[0,1],[1,2],[2,3],[3,4],[4,0],[1,3]],
    },
  ];

  // ── LCG seeded PRNG ──────────────────────────────────────────────────────────

  let _lcgState = SEED;

  function lcgReset() { _lcgState = SEED; }

  function lcgNext() {
    _lcgState = (Math.imul(1664525, _lcgState) + 1013904223) >>> 0;
    return _lcgState / 4294967296;
  }

  function lcgRange(min, max) {
    return min + lcgNext() * (max - min);
  }

  // ── Module state ─────────────────────────────────────────────────────────────

  let canvas, ctx;
  let W = 0, H = 0, dpr = 1;
  let animId        = null;
  let lastTime      = 0;
  let elapsed       = 0;
  let paused        = false;
  let reducedMotion = false;
  let intensity     = 1;

  const mouse       = { x: 0, y: 0 };   // lerped current position (−1 to 1 fractions)
  const mouseTarget = { x: 0, y: 0 };   // raw target
  let autoDriftPhase = 0;                // for mobile drift

  let stars       = [];   // star objects
  let nebulas     = [];   // nebula objects
  let shoots      = [];   // active shooting stars
  let shootTimer  = 0;    // seconds until next shoot
  let constellations = []; // pre-baked constellation render data

  // ── Canvas setup ─────────────────────────────────────────────────────────────

  function setupCanvas() {
    dpr = Math.min(window.devicePixelRatio || 1, 2); // cap at 2× for perf
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width  = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
  }

  // ── Star generation (seeded) ─────────────────────────────────────────────────

  function starColor() {
    const r = lcgNext();
    if (r < 0.62) return 'white';
    if (r < 0.78) return 'gold';
    if (r < 0.90) return 'violet';
    return 'crimson';
  }

  function colorRGBA(colorType, alpha) {
    switch (colorType) {
      case 'gold':   return `hsla(43,72%,76%,${alpha})`;
      case 'violet': return `hsla(268,58%,82%,${alpha})`;
      case 'crimson':return `hsla(342,52%,72%,${alpha})`;
      default:       return `rgba(240,232,216,${alpha})`;
    }
  }

  function generateStars() {
    stars = [];
    lcgReset();

    // Layer 0 — far/tiny
    const [c0, c1, c2] = LAYER_COUNTS;
    for (let i = 0; i < c0; i++) {
      stars.push({
        x:     lcgRange(0, 1),
        y:     lcgRange(0, 1),
        size:  lcgRange(0.15, 0.5),
        base:  lcgRange(0.35, 0.65),
        phase: lcgRange(0, Math.PI * 2),
        speed: lcgRange(0.35, 0.9),
        color: starColor(),
        layer: 0,
      });
    }
    // Layer 1 — mid
    for (let i = 0; i < c1; i++) {
      stars.push({
        x:     lcgRange(0, 1),
        y:     lcgRange(0, 1),
        size:  lcgRange(0.45, 1.1),
        base:  lcgRange(0.50, 0.80),
        phase: lcgRange(0, Math.PI * 2),
        speed: lcgRange(0.45, 1.1),
        color: starColor(),
        layer: 1,
      });
    }
    // Layer 2 — near/bright
    for (let i = 0; i < c2; i++) {
      stars.push({
        x:     lcgRange(0, 1),
        y:     lcgRange(0, 1),
        size:  lcgRange(0.9, 2.2),
        base:  lcgRange(0.70, 1.0),
        phase: lcgRange(0, Math.PI * 2),
        speed: lcgRange(0.25, 0.8),
        color: starColor(),
        layer: 2,
        glow:  lcgNext() > 0.6,
      });
    }
  }

  // ── Nebula generation ────────────────────────────────────────────────────────

  function generateNebulas() {
    nebulas = [];
    NEBULA_DEFS.forEach(([r, g, b, minA, maxA], i) => {
      const ox = lcgRange(0.1, 0.9);
      const oy = lcgRange(0.1, 0.9);
      nebulas.push({
        ox, oy,
        rx:     lcgRange(W * 0.18, W * 0.38),
        ry:     lcgRange(H * 0.18, H * 0.35),
        r, g, b,
        alpha:  lcgRange(minA, maxA),
        ampX:   lcgRange(20, 55),
        ampY:   lcgRange(15, 40),
        freqX:  lcgRange(0.00008, 0.00018),
        freqY:  lcgRange(0.00006, 0.00015),
        phaseX: lcgRange(0, Math.PI * 2),
        phaseY: lcgRange(0, Math.PI * 2),
      });
    });
  }

  // ── Constellation baking ──────────────────────────────────────────────────────

  function bakeConstellations() {
    constellations = CONSTELLATIONS.map(def => ({
      stars: def.stars.map(([xf, yf]) => ({ x: xf, y: yf })),
      edges: def.edges,
    }));
  }

  // ── Shooting star spawning ────────────────────────────────────────────────────

  function spawnShoot() {
    // Start from top or right edge, travel diagonally
    const fromTop = Math.random() > 0.3;
    let sx, sy, angle;
    if (fromTop) {
      sx    = Math.random() * W * 0.8;
      sy    = Math.random() * H * 0.2;
      angle = Math.PI / 4 + Math.random() * 0.3;
    } else {
      sx    = W * 0.6 + Math.random() * W * 0.4;
      sy    = Math.random() * H * 0.3;
      angle = Math.PI * 0.6 + Math.random() * 0.4;
    }
    const speed  = 600 + Math.random() * 400;   // px/s
    const length = 60 + Math.random() * 60;
    const life   = 0.6 + Math.random() * 0.3;   // seconds
    shoots.push({
      sx, sy,
      dx: Math.cos(angle),
      dy: Math.sin(angle),
      speed, length,
      maxLife: life,
      t: 0,
    });
  }

  function scheduleNextShoot() {
    shootTimer = 8 + Math.random() * 7;   // 8-15 seconds
  }

  // ── Drawing routines ─────────────────────────────────────────────────────────

  function drawBackground() {
    ctx.fillStyle = '#0d0a07';
    ctx.fillRect(0, 0, W, H);
  }

  function drawNebulas(t) {
    nebulas.forEach(n => {
      const cx = n.ox * W + n.ampX * Math.sin(t * n.freqX + n.phaseX);
      const cy = n.oy * H + n.ampY * Math.sin(t * n.freqY + n.phaseY);
      const a  = n.alpha * intensity;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(n.rx, n.ry));
      grad.addColorStop(0,   `rgba(${n.r},${n.g},${n.b},${a})`);
      grad.addColorStop(0.5, `rgba(${n.r},${n.g},${n.b},${a * 0.45})`);
      grad.addColorStop(1,   `rgba(${n.r},${n.g},${n.b},0)`);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(n.rx / Math.max(n.rx, n.ry), n.ry / Math.max(n.rx, n.ry));
      ctx.translate(-cx, -cy);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(n.rx, n.ry), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  function drawConstellations() {
    const alpha = 0.055 * intensity;
    ctx.strokeStyle = `rgba(180,190,240,${alpha})`;
    ctx.lineWidth   = 0.6;
    constellations.forEach(c => {
      c.edges.forEach(([a, b]) => {
        const sa = c.stars[a], sb = c.stars[b];
        if (!sa || !sb) return;
        ctx.beginPath();
        ctx.moveTo(sa.x * W, sa.y * H);
        ctx.lineTo(sb.x * W, sb.y * H);
        ctx.stroke();
      });
      // tiny dot at each constellation star
      ctx.fillStyle = `rgba(200,210,255,${alpha * 1.8})`;
      c.stars.forEach(s => {
        ctx.beginPath();
        ctx.arc(s.x * W, s.y * H, 1.2, 0, Math.PI * 2);
        ctx.fill();
      });
    });
  }

  function parallaxOffset(layer) {
    const mx = mouse.x;   // −1 to 1
    const my = mouse.y;
    switch (layer) {
      case 0: return { dx: mx * PARALLAX_FAR,  dy: my * PARALLAX_FAR  };
      case 1: return { dx: mx * PARALLAX_MID,  dy: my * PARALLAX_MID  };
      case 2: return { dx: mx * PARALLAX_NEAR, dy: my * PARALLAX_NEAR };
      default: return { dx: 0, dy: 0 };
    }
  }

  function drawStars(t) {
    stars.forEach(s => {
      const twinkle = reducedMotion
        ? s.base
        : s.base + 0.3 * Math.sin(t * 0.001 * s.speed + s.phase);
      const alpha = Math.max(0, Math.min(1, twinkle)) * intensity;

      const off = parallaxOffset(s.layer);
      const px  = ((s.x * W) + off.dx + W) % W;
      const py  = ((s.y * H) + off.dy + H) % H;

      // Glow for bright stars
      if (s.glow && s.size > 1.2) {
        const grad = ctx.createRadialGradient(px, py, 0, px, py, s.size * 4);
        const base = colorRGBA(s.color, alpha * 0.35);
        grad.addColorStop(0, colorRGBA(s.color, alpha * 0.6));
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, s.size * 4, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = colorRGBA(s.color, alpha);
      ctx.beginPath();
      ctx.arc(px, py, s.size, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawShoots(dt) {
    shoots = shoots.filter(s => {
      s.t += dt;
      if (s.t > s.maxLife) return false;

      const progress = s.t / s.maxLife;
      // Ease: fast start, decelerate
      const ease   = 1 - Math.pow(1 - progress, 2);
      const fade   = progress < 0.5
        ? progress / 0.5
        : (1 - progress) / 0.5;  // fade in then out

      const dist = s.speed * s.t;
      const hx   = s.sx + s.dx * dist;
      const hy   = s.sy + s.dy * dist;
      const tx   = hx   - s.dx * s.length;
      const ty   = hy   - s.dy * s.length;

      const headAlpha  = fade * intensity;
      const trailAlpha = fade * 0.5 * intensity;

      const grad = ctx.createLinearGradient(tx, ty, hx, hy);
      grad.addColorStop(0,   `rgba(255,255,200,0)`);
      grad.addColorStop(0.7, `rgba(255,240,180,${trailAlpha})`);
      grad.addColorStop(1,   `rgba(255,255,255,${headAlpha})`);

      ctx.save();
      ctx.lineWidth   = 1.5;
      ctx.strokeStyle = grad;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(hx, hy);
      ctx.stroke();

      // bright head dot
      ctx.fillStyle = `rgba(255,255,230,${headAlpha})`;
      ctx.beginPath();
      ctx.arc(hx, hy, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      return true;
    });
  }

  // ── Animation loop ────────────────────────────────────────────────────────────

  function frame(timestamp) {
    if (paused) { animId = requestAnimationFrame(frame); return; }

    const dt = Math.min((timestamp - lastTime) / 1000, 0.1);  // seconds, capped
    lastTime  = timestamp;
    elapsed  += dt;

    // Auto drift for mobile / no-mouse
    autoDriftPhase += dt * 0.15;
    if (!hasMouse) {
      mouseTarget.x = Math.sin(autoDriftPhase) * 0.3;
      mouseTarget.y = Math.cos(autoDriftPhase * 0.7) * 0.2;
    }

    // Lerp mouse toward target
    mouse.x += (mouseTarget.x - mouse.x) * 0.06;
    mouse.y += (mouseTarget.y - mouse.y) * 0.06;

    // Shooting star timer
    if (!reducedMotion) {
      shootTimer -= dt;
      if (shootTimer <= 0) {
        const count = Math.random() > 0.75 ? 2 : 1;
        for (let i = 0; i < count; i++) spawnShoot();
        scheduleNextShoot();
      }
    }

    const t = elapsed * 1000;  // ms-equivalent for sin argument scaling

    drawBackground();
    drawNebulas(t);
    drawConstellations();
    drawStars(t);
    if (!reducedMotion) drawShoots(dt);

    animId = requestAnimationFrame(frame);
  }

  // ── Mouse/touch tracking ──────────────────────────────────────────────────────

  let hasMouse = false;

  function onMouseMove(e) {
    hasMouse = true;
    mouseTarget.x = (e.clientX / W - 0.5) * 2;   // −1 to 1
    mouseTarget.y = (e.clientY / H - 0.5) * 2;
  }

  function onMouseLeave() {
    mouseTarget.x = 0;
    mouseTarget.y = 0;
  }

  // ── Resize handling ───────────────────────────────────────────────────────────

  let resizeTimer = null;

  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      setupCanvas();
      generateStars();
      generateNebulas();
      bakeConstellations();
    }, 150);
  }

  // ── Visibility ────────────────────────────────────────────────────────────────

  function onVisibilityChange() {
    if (document.hidden) {
      paused = true;
    } else {
      paused    = false;
      lastTime  = performance.now();
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────────

  function init() {
    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Create or find canvas
    canvas = document.getElementById('starfield-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'starfield-canvas';
      Object.assign(canvas.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        zIndex: '-1',
        pointerEvents: 'none',
      });
      document.body.prepend(canvas);
    }
    ctx = canvas.getContext('2d');

    setupCanvas();
    generateStars();
    generateNebulas();
    bakeConstellations();
    scheduleNextShoot();

    window.addEventListener('mousemove',     onMouseMove,        { passive: true });
    window.addEventListener('mouseleave',    onMouseLeave);
    window.addEventListener('resize',        onResize,           { passive: true });
    document.addEventListener('visibilitychange', onVisibilityChange);

    lastTime = performance.now();
    animId   = requestAnimationFrame(frame);
  }

  function pause() {
    paused = true;
  }

  function resume() {
    paused   = false;
    lastTime = performance.now();
  }

  function setIntensity(v) {
    intensity = Math.max(0, Math.min(1, v));
  }

  return { init, pause, resume, setIntensity };

})();
