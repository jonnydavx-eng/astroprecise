/**
 * AstroPrecise — CosmosEngine
 * Multi-layer starfield, nebula clouds, shooting stars, and scroll reveal.
 * Self-contained vanilla JS, no dependencies.
 */

window.CosmosEngine = (() => {
  'use strict';

  // ── Constants ──────────────────────────────────────────────────────────────

  const DEEP_COUNT   = 700;
  const MID_COUNT    = 350;
  const BRIGHT_COUNT = 120;

  const NEBULA_COLORS = [
    [107,  33, 168],   /* amethyst */
    [138,  26,  56],   /* ritual crimson */
    [ 80,  15, 140],   /* deep amethyst */
    [196, 146,  10],   /* antique gold */
    [ 55,  15, 110],   /* void violet */
    [ 14,  92,  58],   /* emerald shadow */
    [160,  40,  80],   /* rose crimson */
  ];

  // Parallax speed as fraction of screen offset per layer (deep/mid/bright)
  const PARALLAX_SPEED = [0.004, 0.008, 0.014];

  // ── Module state ──────────────────────────────────────────────────────────

  let canvas, ctx;
  let W = 0, H = 0, dpr = 1;
  let animFrameId  = null;
  let shootTimerId = null;
  let resizeTimer  = null;
  let destroyed    = false;

  // Logical (CSS) mouse coords, lerped toward target
  const mouse       = { x: 0, y: 0 };
  const mouseTarget = { x: 0, y: 0 };

  let stars   = [];   // { x, y, size, baseAlpha, twinkleSpeed, twinkleOffset, layer }
  let nebulas = [];   // { cx, cy, rx, ry, r, g, b, alpha, phaseX, phaseY, speedX, speedY, originX, originY }
  let shoots  = [];   // active shooting stars

  // ── Helpers ────────────────────────────────────────────────────────────────

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  // ── DPR-aware canvas setup ─────────────────────────────────────────────────

  function setupCanvas() {
    dpr = window.devicePixelRatio || 1;
    const cssW = window.innerWidth;
    const cssH = window.innerHeight;

    W = cssW;
    H = cssH;

    canvas.width  = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.width  = cssW + 'px';
    canvas.style.height = cssH + 'px';

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
  }

  // ── Star generation ────────────────────────────────────────────────────────

  function starColor() {
    const r = Math.random();
    if (r < 0.60) {
      return 'white';            /* warm parchment white */
    } else if (r < 0.78) {
      return 'gold';             /* antique gold star */
    } else if (r < 0.90) {
      return 'amethyst';         /* pale amethyst haze */
    } else {
      return 'crimson';          /* faint rose-crimson */
    }
  }

  function colorString(colorType, alpha) {
    switch (colorType) {
      case 'gold':      return `hsla(40,70%,75%,${alpha})`;
      case 'amethyst':  return `hsla(270,60%,80%,${alpha})`;
      case 'crimson':   return `hsla(340,55%,70%,${alpha})`;
      default:          return `rgba(240,232,216,${alpha})`;   /* warm parchment */
    }
  }

  function generateStars() {
    stars = [];

    // Layer 0 — deep (tiny, slow)
    for (let i = 0; i < DEEP_COUNT; i++) {
      stars.push({
        x:             rand(0, W),
        y:             rand(0, H),
        size:          rand(0.15, 0.55),
        baseAlpha:     rand(0.45, 0.75),
        twinkleSpeed:  rand(0.4, 1.1),
        twinkleOffset: rand(0, Math.PI * 2),
        layer:         0,
        color:         starColor(),
      });
    }

    // Layer 1 — mid
    for (let i = 0; i < MID_COUNT; i++) {
      stars.push({
        x:             rand(0, W),
        y:             rand(0, H),
        size:          rand(0.5, 1.0),
        baseAlpha:     rand(0.55, 0.85),
        twinkleSpeed:  rand(0.5, 1.3),
        twinkleOffset: rand(0, Math.PI * 2),
        layer:         1,
        color:         starColor(),
      });
    }

    // Layer 2 — bright (some with glow)
    for (let i = 0; i < BRIGHT_COUNT; i++) {
      stars.push({
        x:             rand(0, W),
        y:             rand(0, H),
        size:          rand(0.9, 2.2),
        baseAlpha:     rand(0.7, 1.0),
        twinkleSpeed:  rand(0.3, 0.9),
        twinkleOffset: rand(0, Math.PI * 2),
        layer:         2,
        color:         starColor(),
      });
    }
  }

  // ── Nebula generation ──────────────────────────────────────────────────────

  function generateNebulas() {
    nebulas = [];
    for (let i = 0; i < 7; i++) {
      const [r, g, b] = NEBULA_COLORS[i];
      const cx = rand(0.05, 0.95) * W;
      const cy = rand(0.05, 0.95) * H;
      nebulas.push({
        originX: cx,
        originY: cy,
        rx:      rand(0.15, 0.30) * W,
        ry:      rand(0.12, 0.22) * H,
        r, g, b,
        alpha:   rand(0.04, 0.08),
        // drift phase and amplitude (pixels)
        phaseX:  rand(0, Math.PI * 2),
        phaseY:  rand(0, Math.PI * 2),
        // period ~40s — angular frequency = 2π/40
        freqX:   (2 * Math.PI) / rand(35000, 50000),
        freqY:   (2 * Math.PI) / rand(35000, 50000),
        ampX:    rand(20, 60),
        ampY:    rand(15, 45),
      });
    }
  }

  // ── Nebula draw ────────────────────────────────────────────────────────────

  function drawNebulas(now) {
    for (const n of nebulas) {
      const cx = n.originX + Math.sin(now * n.freqX + n.phaseX) * n.ampX;
      const cy = n.originY + Math.cos(now * n.freqY + n.phaseY) * n.ampY;

      // We approximate an ellipse by scaling the context
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1, n.ry / n.rx);

      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, n.rx);
      grad.addColorStop(0,   `rgba(${n.r},${n.g},${n.b},${n.alpha})`);
      grad.addColorStop(0.5, `rgba(${n.r},${n.g},${n.b},${n.alpha * 0.4})`);
      grad.addColorStop(1,   `rgba(${n.r},${n.g},${n.b},0)`);

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, n.rx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // ── Stars draw ─────────────────────────────────────────────────────────────

  function drawStars(time) {
    const offX = (mouseTarget.x - W * 0.5);
    const offY = (mouseTarget.y - H * 0.5);

    for (const s of stars) {
      const speed = PARALLAX_SPEED[s.layer];
      const px = s.x + offX * speed;
      const py = s.y + offY * speed;

      // Twinkling: oscillate between 60% and 100% of baseAlpha
      const twinkle = 0.5 + 0.5 * Math.sin(time * s.twinkleSpeed + s.twinkleOffset);
      const alpha   = s.baseAlpha * (0.6 + 0.4 * twinkle);

      if (s.size > 1.4) {
        // Radial glow halo for bright stars
        const haloR = s.size * 4;
        const glow  = ctx.createRadialGradient(px, py, 0, px, py, haloR);
        glow.addColorStop(0,   colorString(s.color, alpha * 0.55));
        glow.addColorStop(1,   colorString(s.color, 0));
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(px, py, haloR, 0, Math.PI * 2);
        ctx.fill();
      }

      // Star core
      ctx.beginPath();
      ctx.arc(px, py, s.size, 0, Math.PI * 2);
      ctx.fillStyle = colorString(s.color, alpha);
      ctx.fill();
    }
  }

  // ── Shooting stars ─────────────────────────────────────────────────────────

  function spawnShoot() {
    if (destroyed) return;

    // Angle between -35° and -55° (roughly top-left to bottom-right)
    const angleDeg = rand(-55, -35);
    const angle    = angleDeg * (Math.PI / 180);
    const speed    = rand(350, 600);   // px/s
    const life     = rand(700, 1000);  // ms

    // Start just off the top edge, spread across width
    const startX = rand(W * 0.1, W * 0.9);
    const startY = rand(-20, H * 0.3);

    shoots.push({
      x:       startX,
      y:       startY,
      vx:      Math.cos(angle) * speed,
      vy:      Math.sin(angle) * speed,
      life,
      elapsed: 0,
      length:  rand(100, 200),
    });

    // Schedule next
    if (!destroyed) {
      shootTimerId = setTimeout(spawnShoot, rand(5000, 13000));
    }
  }

  function drawShoots(dt) {
    for (let i = shoots.length - 1; i >= 0; i--) {
      const s = shoots[i];
      s.elapsed += dt;

      if (s.elapsed >= s.life) {
        shoots.splice(i, 1);
        continue;
      }

      const progress = s.elapsed / s.life;

      // Fade in first 20%, fade out last 30%
      let opacity;
      if (progress < 0.2) {
        opacity = progress / 0.2;
      } else if (progress > 0.7) {
        opacity = 1 - (progress - 0.7) / 0.3;
      } else {
        opacity = 1;
      }

      // Current head position
      const hx = s.x + s.vx * (s.elapsed / 1000);
      const hy = s.y + s.vy * (s.elapsed / 1000);

      // Tail is behind head along travel direction
      const dist  = s.length;
      const angle = Math.atan2(s.vy, s.vx);
      const tx    = hx - Math.cos(angle) * dist;
      const ty    = hy - Math.sin(angle) * dist;

      // Trail gradient: transparent at tail, bright white at head
      const trail = ctx.createLinearGradient(tx, ty, hx, hy);
      trail.addColorStop(0, `rgba(255,255,255,0)`);
      trail.addColorStop(1, `rgba(255,255,255,${opacity * 0.9})`);

      ctx.save();
      ctx.strokeStyle = trail;
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(hx, hy);
      ctx.stroke();

      // Head dot with small glow
      const headGlow = ctx.createRadialGradient(hx, hy, 0, hx, hy, 5);
      headGlow.addColorStop(0, `rgba(255,255,255,${opacity})`);
      headGlow.addColorStop(1, `rgba(255,255,255,0)`);
      ctx.fillStyle = headGlow;
      ctx.beginPath();
      ctx.arc(hx, hy, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  // ── Main render loop ───────────────────────────────────────────────────────

  let lastTime = null;

  function frame(timestamp) {
    if (destroyed) return;

    if (lastTime === null) lastTime = timestamp;
    const dt  = Math.min(timestamp - lastTime, 50); // cap at 50ms to avoid jumps
    lastTime  = timestamp;
    const sec = timestamp / 1000;

    // Smooth mouse lerp (60fps-independent)
    const lerpFactor = 1 - Math.pow(0.05, dt / 1000);
    mouse.x = lerp(mouse.x, mouseTarget.x, lerpFactor);
    mouse.y = lerp(mouse.y, mouseTarget.y, lerpFactor);

    ctx.clearRect(0, 0, W, H);

    drawNebulas(timestamp);
    drawStars(sec);
    drawShoots(dt);

    animFrameId = requestAnimationFrame(frame);
  }

  // ── Scroll reveal (IntersectionObserver) ──────────────────────────────────

  let revealObserver = null;

  function injectRevealStyles() {
    if (document.getElementById('cosmos-reveal-styles')) return;
    const style = document.createElement('style');
    style.id = 'cosmos-reveal-styles';
    style.textContent = [
      '.will-reveal {',
      '  opacity: 0;',
      '  transform: translateY(28px);',
      '}',
      '.revealed {',
      '  opacity: 1 !important;',
      '  transform: translateY(0) !important;',
      '  transition: opacity 0.6s ease, transform 0.6s ease;',
      '}',
    ].join('\n');
    document.head.appendChild(style);
  }

  function initScrollReveal() {
    injectRevealStyles();

    const selector = [
      '.card',
      '.glass-card',
      '.planet-card',
      '.sign-card',
      '.transit-item',
      '.section-header',
      '.hero__content',
      '.feature-card',
      '.compat-score',
    ].join(', ');

    const elements = document.querySelectorAll(selector);
    elements.forEach(el => el.classList.add('will-reveal'));

    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -32px 0px' });

    elements.forEach(el => revealObserver.observe(el));
  }

  // ── Event listeners ────────────────────────────────────────────────────────

  function onMouseMove(e) {
    mouseTarget.x = e.clientX;
    mouseTarget.y = e.clientY;
  }

  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      setupCanvas();
      generateStars();
      generateNebulas();
    }, 120);
  }

  // ── Boot ───────────────────────────────────────────────────────────────────

  function init() {
    canvas = document.getElementById('starfield-canvas');
    if (!canvas) return;

    ctx = canvas.getContext('2d');

    setupCanvas();

    mouse.x       = W * 0.5;
    mouse.y       = H * 0.5;
    mouseTarget.x = W * 0.5;
    mouseTarget.y = H * 0.5;

    generateStars();
    generateNebulas();

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('resize',    onResize,    { passive: true });

    animFrameId  = requestAnimationFrame(frame);
    shootTimerId = setTimeout(spawnShoot, rand(2000, 6000));

    initScrollReveal();
  }

  // ── Destroy ────────────────────────────────────────────────────────────────

  function destroy() {
    destroyed = true;

    if (animFrameId !== null) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }

    if (shootTimerId !== null) {
      clearTimeout(shootTimerId);
      shootTimerId = null;
    }

    if (resizeTimer !== null) {
      clearTimeout(resizeTimer);
      resizeTimer = null;
    }

    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('resize',    onResize);

    if (revealObserver) {
      revealObserver.disconnect();
      revealObserver = null;
    }

    const styleEl = document.getElementById('cosmos-reveal-styles');
    if (styleEl) styleEl.remove();

    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  // ── DOMContentLoaded entry point ───────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', init);

  return { destroy };

})();
