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

  // Warm "observatory" nebula palette — gold / oxblood / subdued warm violet.
  // (The old cool lapis/void-violet/emerald values were retired; see CLAUDE.md.)
  const NEBULA_COLORS = [
    [201, 162,  39],   /* antique gold */
    [110,  26,  38],   /* oxblood */
    [ 92,  74, 110],   /* subdued warm violet */
    [128,  52,  64],   /* rose crimson */
    [ 60,  42,  74],   /* deep warm violet */
    [120,  80,  30],   /* warm amber-brown */
    [ 90,  30,  44],   /* deep oxblood */
  ];

  // Parallax speed as fraction of screen offset per layer (deep/mid/bright)
  const PARALLAX_SPEED = [0.004, 0.008, 0.014];
  // Hero scroll drive — shares the same 0→1 clock as the orrery for one continuous sky
  const SCROLL_STAR_SHIFT = [14, 26, 44];   // px downward drift at progress=1
  const SCROLL_NEBULA_SHIFT = 22;
  let scrollDrive = 0;

  // ── Module state ──────────────────────────────────────────────────────────

  let canvas, ctx;
  let W = 0, H = 0, dpr = 1;
  let animFrameId  = null;
  let shootTimerId = null;
  let resizeTimer  = null;
  let destroyed    = false;
  let paused       = false;   // tab hidden — skip the loop to save battery
  let preloaderPaused = false; // live WebGL orrery owns the splash — freeze 2D starfield
  let orreryBlend = 0;         // 0 = orrery owns sky; 1 = cosmos dominates at galaxy scale

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Tiered DPR cap (RafCore is the source of truth; fall back to a local
  // equivalent so the perf win applies on pages that don't load RafCore).
  function capDPR(base) {
    if (window.RafCore && window.RafCore.capDPR) return window.RafCore.capDPR(base);
    const real = window.devicePixelRatio || 1;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    return coarse ? Math.min(real, 1.5) : Math.min(real, base);
  }

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
    dpr = capDPR(2.5);
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
      case 'amethyst':  return `hsla(300,42%,80%,${alpha})`;   /* warm mauve, not cool violet */
      case 'crimson':   return `hsla(340,55%,70%,${alpha})`;
      default:          return `rgba(240,232,216,${alpha})`;   /* warm parchment */
    }
  }

  // Per-color halo sprites for bright stars — drawn with globalAlpha each frame
  // instead of allocating a fresh radial gradient per bright star per frame.
  function haloPx() {
    const t = (window.RafCore && window.RafCore.tier) || 'high';
    return t === 'high' ? 128 : t === 'mid' ? 96 : 64;
  }
  let haloSprites = {};
  function buildHaloSprites() {
    const px = haloPx();
    haloSprites = {};
    for (const c of ['white', 'gold', 'amethyst', 'crimson']) {
      const off  = document.createElement('canvas');
      off.width  = px;
      off.height = px;
      const o = off.getContext('2d');
      const g = o.createRadialGradient(px / 2, px / 2, 0, px / 2, px / 2, px / 2);
      g.addColorStop(0, colorString(c, 1));
      g.addColorStop(1, colorString(c, 0));
      o.fillStyle = g;
      o.fillRect(0, 0, px, px);
      haloSprites[c] = off;
    }
  }

  function generateStars() {
    buildHaloSprites();
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

  // Pre-render a nebula's radial gradient once to an offscreen sprite. The
  // per-frame loop then just drawImage()s it at the drifted position — no
  // createRadialGradient() allocation every frame (the big cosmos.js win).
  function makeNebulaSprite(n) {
    const size = Math.max(2, Math.ceil(n.rx * 2));
    const off  = document.createElement('canvas');
    off.width  = size;
    off.height = size;
    const octx = off.getContext('2d');
    const grad = octx.createRadialGradient(n.rx, n.rx, 0, n.rx, n.rx, n.rx);
    grad.addColorStop(0,   `rgba(${n.r},${n.g},${n.b},${n.alpha})`);
    grad.addColorStop(0.5, `rgba(${n.r},${n.g},${n.b},${n.alpha * 0.4})`);
    grad.addColorStop(1,   `rgba(${n.r},${n.g},${n.b},0)`);
    octx.fillStyle = grad;
    octx.fillRect(0, 0, size, size);
    n.sprite     = off;
    n.spriteSize = size;
  }

  function generateNebulas() {
    nebulas = [];
    for (let i = 0; i < 7; i++) {
      const [r, g, b] = NEBULA_COLORS[i];
      const n = {
        originX: rand(0.05, 0.95) * W,
        originY: rand(0.05, 0.95) * H,
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
      };
      makeNebulaSprite(n);
      nebulas.push(n);
    }
  }

  // ── Nebula draw ────────────────────────────────────────────────────────────

  function drawNebulas(now) {
    const scrollY = scrollDrive * SCROLL_NEBULA_SHIFT;
    for (const n of nebulas) {
      const cx = n.originX + Math.sin(now * n.freqX + n.phaseX) * n.ampX;
      const cy = n.originY + Math.cos(now * n.freqY + n.phaseY) * n.ampY - scrollY;

      // Ellipse via context scale; sprite is drawn at its native radius.
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1, n.ry / n.rx);
      ctx.drawImage(n.sprite, -n.rx, -n.rx, n.spriteSize, n.spriteSize);
      ctx.restore();
    }
  }

  // ── Stars draw ─────────────────────────────────────────────────────────────

  function drawStars(time) {
    const offX = (mouseTarget.x - W * 0.5);
    const offY = (mouseTarget.y - H * 0.5);

    for (const s of stars) {
      const speed = PARALLAX_SPEED[s.layer];
      const scrollY = scrollDrive * SCROLL_STAR_SHIFT[s.layer];
      const px = s.x + offX * speed;
      const py = s.y + offY * speed - scrollY;

      // Twinkling: oscillate between 60% and 100% of baseAlpha
      const twinkle = 0.5 + 0.5 * Math.sin(time * s.twinkleSpeed + s.twinkleOffset);
      const alpha   = s.baseAlpha * (0.6 + 0.4 * twinkle);

      if (s.size > 1.4) {
        // Radial glow halo for bright stars — cached sprite + globalAlpha
        const haloR  = s.size * 4;
        const sprite = haloSprites[s.color] || haloSprites.white;
        ctx.globalAlpha = alpha * 0.55;
        ctx.drawImage(sprite, px - haloR, py - haloR, haloR * 2, haloR * 2);
        ctx.globalAlpha = 1;
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
    if (preloaderPaused) return;

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
      if (reduceMotion) drawStaticFrame();   // no loop to repaint it otherwise
    }, 120);
  }

  function drawStaticFrame() {
    ctx.clearRect(0, 0, W, H);
    drawNebulas(0);
    drawStars(0);
  }

  function onVisibility() {
    if (document.hidden) {
      paused = true;
      if (animFrameId !== null) { cancelAnimationFrame(animFrameId); animFrameId = null; }
    } else if (paused && !destroyed && !reduceMotion && !preloaderPaused) {
      paused = false;
      lastTime = null;                         // reset dt baseline to avoid a jump
      animFrameId = requestAnimationFrame(frame);
    }
  }

  function setOrreryBlend(v) {
    orreryBlend = Math.max(0, Math.min(1, Number(v) || 0));
    if (!canvas) return;
    const base = preloaderPaused ? 0.5 : 0.62;
    canvas.style.opacity = String(base + orreryBlend * 0.38);
    canvas.style.transition = reduceMotion ? 'none' : 'opacity 0.9s ease';
  }

  function setPreloaderPause(on) {
    preloaderPaused = !!on;
    if (preloaderPaused) {
      if (animFrameId !== null) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
      }
      if (ctx && !destroyed) drawStaticFrame();
      return;
    }
    if (!destroyed && !reduceMotion && !paused && animFrameId === null) {
      lastTime = null;
      animFrameId = requestAnimationFrame(frame);
    }
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

    window.addEventListener('resize', onResize, { passive: true });

    if (reduceMotion) {
      // One static frame — no rAF loop, no shooting stars, no parallax.
      drawStaticFrame();
      initScrollReveal();
      return;
    }

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    document.addEventListener('visibilitychange', onVisibility, { passive: true });

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
    document.removeEventListener('visibilitychange', onVisibility);

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
  window.addEventListener('ap-hero-enter', () => setPreloaderPause(false));

  /** 0→1 hero scroll progress — ties the background starfield to the orrery scroll clock. */
  function setScrollDrive(progress) {
    if (reduceMotion) return;
    scrollDrive = Math.max(0, Math.min(1, Number(progress) || 0));
  }

  return { destroy, setScrollDrive, setPreloaderPause, setOrreryBlend };

})();
