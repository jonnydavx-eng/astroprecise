'use strict';

// =============================================================================
// ZodiacSphere — Interactive 3D ecliptic ring
//
// Renders a perspective-projected zodiac ring on a <canvas> element.
// The 12 signs orbit the ring; live planetary positions from AstroEphemeris
// are overlaid as glowing dots at their real ecliptic longitudes.
//
// Drag to spin. Click a sign → selectCallback(signKey).
// Click the centre star → navigate to chart.html.
//
// window.ZodiacSphere = { init(canvasEl, selectCallback), setSelected(key) }
// =============================================================================

(function () {

  // ── Data ──────────────────────────────────────────────────────────────────

  const SIGNS = [
    { key: 'aries',       name: 'Aries',       glyph: '♈', el: 'fire',  lon:   0 },
    { key: 'taurus',      name: 'Taurus',       glyph: '♉', el: 'earth', lon:  30 },
    { key: 'gemini',      name: 'Gemini',       glyph: '♊', el: 'air',   lon:  60 },
    { key: 'cancer',      name: 'Cancer',       glyph: '♋', el: 'water', lon:  90 },
    { key: 'leo',         name: 'Leo',          glyph: '♌', el: 'fire',  lon: 120 },
    { key: 'virgo',       name: 'Virgo',        glyph: '♍', el: 'earth', lon: 150 },
    { key: 'libra',       name: 'Libra',        glyph: '♎', el: 'air',   lon: 180 },
    { key: 'scorpio',     name: 'Scorpio',      glyph: '♏', el: 'water', lon: 210 },
    { key: 'sagittarius', name: 'Sagittarius',  glyph: '♐', el: 'fire',  lon: 240 },
    { key: 'capricorn',   name: 'Capricorn',    glyph: '♑', el: 'earth', lon: 270 },
    { key: 'aquarius',    name: 'Aquarius',     glyph: '♒', el: 'air',   lon: 300 },
    { key: 'pisces',      name: 'Pisces',       glyph: '♓', el: 'water', lon: 330 },
  ];

  // Element colours (RGB components for easy alpha composition)
  const EL = {
    fire:  [224,  80,  64],
    earth: [107, 155,  95],
    air:   [123,  44, 191],
    water: [ 42, 110, 189],
  };

  const PLANETS = [
    { key: 'sun',     sym: '☉', col: '#D4AF37', name: 'Sun'     },
    { key: 'moon',    sym: '☽', col: '#C8D0E8', name: 'Moon'    },
    { key: 'mercury', sym: '☿', col: '#00D4FF', name: 'Mercury' },
    { key: 'venus',   sym: '♀', col: '#C77DFF', name: 'Venus'   },
    { key: 'mars',    sym: '♂', col: '#e05848', name: 'Mars'    },
    { key: 'jupiter', sym: '♃', col: '#E8A050', name: 'Jupiter' },
    { key: 'saturn',  sym: '♄', col: '#A0B898', name: 'Saturn'  },
  ];

  // ── State ─────────────────────────────────────────────────────────────────

  let cvs, ctx;
  let W = 600, H = 420, cx = 300, cy = 210;
  let dpr = 1;

  let rotation = -Math.PI / 2;   // Aries at the top initially
  let rotVel   = 0;
  let autoSpin = true;
  const SPIN_SPEED = 0.0018;     // rad/frame at 60fps → ~1 full revolution per ~6 min

  let hovered  = null;
  let selected = null;
  let selectCb = null;

  let planetLons = {};           // signKey → ecliptic lon (degrees, 0–360)
  let stars      = [];
  let cachedPositions = [];      // projected sign positions, updated each frame

  // 3D ring geometry
  const TILT  = 0.30;            // ~17° — enough depth cue without collapsing too flat
  const FOCAL = 900;

  // ── 3D projection ─────────────────────────────────────────────────────────

  function ringRadius() { return Math.min(W, H) * 0.40; }

  function project(lonDeg) {
    const R     = ringRadius();
    const theta = (lonDeg * Math.PI / 180) + rotation;
    const x3    = R * Math.cos(theta);
    const y3d   = R * Math.sin(theta);
    const y3    = y3d * Math.cos(TILT);
    const z3    = y3d * Math.sin(TILT);
    const s     = FOCAL / (FOCAL + z3);
    return {
      x: cx + x3 * s,
      y: cy + y3 * s,
      z: z3, s,
      depth: (z3 / R + 1) / 2,   // 0 = far, 1 = near
    };
  }

  // ── Background stars ──────────────────────────────────────────────────────

  function initStars() {
    stars = [];
    const n = Math.floor(W * H / 3500);
    for (let i = 0; i < n; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.1 + 0.15,
        a: Math.random() * 0.55 + 0.1,
        tw: Math.random() * Math.PI * 2,
        sp: Math.random() * 0.012 + 0.004,
      });
    }
  }

  function drawStars(t) {
    for (const s of stars) {
      const alpha = s.a * (0.75 + 0.25 * Math.sin(s.tw + t * s.sp));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,212,245,${alpha})`;
      ctx.fill();
    }
  }

  // ── Ecliptic ring ─────────────────────────────────────────────────────────

  function drawRing() {
    const STEPS = 180;

    // Outer dashed gold ring
    ctx.beginPath();
    for (let i = 0; i <= STEPS; i++) {
      const lon = (i / STEPS) * 360;
      const p   = project(lon);
      i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.strokeStyle = 'rgba(212,175,55,0.30)';
    ctx.lineWidth   = 1.5;
    ctx.setLineDash([5, 9]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Inner violet guide ring (80% radius)
    const Ri = ringRadius() * 0.80;
    ctx.beginPath();
    for (let i = 0; i <= STEPS; i++) {
      const theta = (i / STEPS) * Math.PI * 2 + rotation;
      const x3    = Ri * Math.cos(theta);
      const y3d   = Ri * Math.sin(theta);
      const y3    = y3d * Math.cos(TILT);
      const z3    = y3d * Math.sin(TILT);
      const sc    = FOCAL / (FOCAL + z3);
      const px    = cx + x3 * sc;
      const py    = cy + y3 * sc;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.strokeStyle = 'rgba(123,44,191,0.14)';
    ctx.lineWidth   = 1;
    ctx.stroke();
  }

  // ── Planets ───────────────────────────────────────────────────────────────

  function drawPlanets() {
    // Sort back-to-front
    const visible = PLANETS
      .filter(pl => planetLons[pl.key] != null)
      .map(pl => ({ pl, pt: project(planetLons[pl.key]) }))
      .sort((a, b) => a.pt.z - b.pt.z);

    for (const { pl, pt } of visible) {
      const r     = 5 * pt.s;
      const alpha = 0.45 + 0.55 * pt.depth;

      // Glow halo
      const g = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, r * 3.5);
      g.addColorStop(0, pl.col + 'AA');
      g.addColorStop(1, pl.col + '00');
      ctx.globalAlpha = alpha * 0.55;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, r * 3.5, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();

      // Planet dot
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
      ctx.fillStyle = pl.col;
      ctx.fill();

      // Symbol above the dot
      ctx.font          = `${Math.max(8, 9 * pt.s)}px sans-serif`;
      ctx.fillStyle     = pl.col;
      ctx.textAlign     = 'center';
      ctx.textBaseline  = 'bottom';
      ctx.fillText(pl.sym, pt.x, pt.y - r - 1);

      ctx.globalAlpha = 1;
    }
  }

  // ── Sign nodes ────────────────────────────────────────────────────────────

  function buildSignPositions() {
    return SIGNS
      .map(s => ({ ...s, ...project(s.lon) }))
      .sort((a, b) => a.z - b.z);     // back-to-front
  }

  function drawSigns(positions) {
    for (const s of positions) {
      const isSel  = selected === s.key;
      const isHov  = hovered  === s.key;
      const el     = EL[s.el];
      const alpha  = 0.30 + 0.70 * s.depth;
      const baseR  = Math.max(16, 22 * s.s);
      const r      = baseR * (isHov ? 1.28 : 1);

      ctx.save();
      ctx.globalAlpha = alpha;

      // Glow for hovered / selected
      if (isSel || isHov) {
        const [gr, gg, gb] = isSel ? [212, 175, 55] : el;
        const glow = ctx.createRadialGradient(s.x, s.y, r * 0.4, s.x, s.y, r * 2.8);
        glow.addColorStop(0, `rgba(${gr},${gg},${gb},0.40)`);
        glow.addColorStop(1, `rgba(${gr},${gg},${gb},0)`);
        ctx.beginPath();
        ctx.arc(s.x, s.y, r * 2.8, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();
      }

      // Filled circle
      ctx.beginPath();
      ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
      ctx.fillStyle = isSel
        ? 'rgba(212,175,55,0.22)'
        : `rgba(${el[0]},${el[1]},${el[2]},0.14)`;
      ctx.fill();

      // Border ring
      ctx.strokeStyle = isSel
        ? 'rgba(212,175,55,0.95)'
        : isHov
          ? `rgba(${el[0]},${el[1]},${el[2]},0.85)`
          : `rgba(${el[0]},${el[1]},${el[2]},0.40)`;
      ctx.lineWidth = isSel || isHov ? 1.8 : 0.9;
      ctx.stroke();

      // Zodiac glyph
      ctx.font         = `${r * 0.92}px Georgia, 'Times New Roman', serif`;
      ctx.fillStyle    = isSel ? '#D4AF37' : isHov ? `rgb(${el[0]},${el[1]},${el[2]})` : '#C4CCE4';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(s.glyph, s.x, s.y);

      // Name label — visible for near-side signs, always for hovered/selected
      const labelFade = Math.max(0, (s.depth - 0.35) / 0.35 + (isHov || isSel ? 1 : 0));
      if (labelFade > 0) {
        ctx.globalAlpha = alpha * Math.min(1, labelFade);
        ctx.font        = `${Math.max(8, 9.5 * s.s)}px Inter, system-ui, sans-serif`;
        ctx.fillStyle   = isSel ? '#D4AF37' : 'rgba(200,212,245,0.9)';
        ctx.textAlign   = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(s.name, s.x, s.y + r + 3);
      }

      ctx.restore();
    }
  }

  // ── Centre star (logo motif) ──────────────────────────────────────────────

  function drawCentre(t) {
    const R      = Math.min(W, H) * 0.068;
    const pulse  = 1 + 0.05 * Math.sin(t * 0.75);

    // Expanding wavefront ring
    const waveR  = R * (1.2 + ((t * 0.18) % 2.2));
    const wA     = Math.max(0, 0.45 - waveR / (R * 5));
    ctx.beginPath();
    ctx.arc(cx, cy, waveR, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(0,212,255,${wA})`;
    ctx.lineWidth   = 1.2;
    ctx.stroke();

    // Eight-point star (slowly precessing)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(t * 0.025);

    function starPath(outer, inner, pts) {
      ctx.beginPath();
      for (let i = 0; i < pts * 2; i++) {
        const a = (i * Math.PI) / pts - Math.PI / 2;
        const rad = i % 2 === 0 ? outer : inner;
        i === 0 ? ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad)
                : ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
      }
      ctx.closePath();
    }

    // Outer gold star
    starPath(R * pulse, R * 0.38 * pulse, 8);
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, R * pulse);
    grad.addColorStop(0,   '#F0D868');
    grad.addColorStop(0.5, '#D4AF37');
    grad.addColorStop(1,   '#B8962E');
    ctx.fillStyle = grad;
    ctx.fill();

    // Inner star overlay (rotated 22.5°)
    ctx.rotate(Math.PI / 8);
    starPath(R * 0.55 * pulse, R * 0.22 * pulse, 8);
    ctx.fillStyle = 'rgba(240,216,104,0.45)';
    ctx.fill();

    ctx.restore();

    // "BIRTH CHART" prompt below the star
    ctx.font          = `500 ${Math.max(9, 10 * (W / 600))}px Inter, system-ui, sans-serif`;
    ctx.fillStyle     = 'rgba(212,175,55,0.65)';
    ctx.textAlign     = 'center';
    ctx.textBaseline  = 'top';
    ctx.fillText('BIRTH CHART', cx, cy + R * pulse + 9);
  }

  // ── Hit testing ───────────────────────────────────────────────────────────

  function hitSign(px, py) {
    const baseR = 22;
    // Test in reverse (front-to-back) so topmost wins
    for (let i = cachedPositions.length - 1; i >= 0; i--) {
      const s  = cachedPositions[i];
      const r  = Math.max(16, baseR * s.s) * 1.4;
      const dx = px - s.x, dy = py - s.y;
      if (dx * dx + dy * dy < r * r) return s.key;
    }
    return null;
  }

  function hitCentre(px, py) {
    const r  = Math.min(W, H) * 0.068 * 2.0;
    const dx = px - cx, dy = py - cy;
    return dx * dx + dy * dy < r * r;
  }

  // ── Animation loop ────────────────────────────────────────────────────────

  let lastT = 0;

  function frame(ts) {
    const dt = Math.min((ts - lastT) / 1000, 0.05);
    lastT = ts;

    ctx.clearRect(0, 0, W, H);

    drawStars(ts / 1000);
    drawRing();
    drawPlanets();
    cachedPositions = buildSignPositions();
    drawSigns(cachedPositions);
    drawCentre(ts / 1000);

    if (autoSpin) {
      rotation += SPIN_SPEED;
    } else if (Math.abs(rotVel) > 0.0001) {
      rotation += rotVel;
      rotVel   *= 0.91;
    }

    requestAnimationFrame(frame);
  }

  // ── Pointer / touch ───────────────────────────────────────────────────────

  let dragging    = false;
  let dragStartX  = 0;
  let dragDist    = 0;

  function canvasCoords(clientX, clientY) {
    const r  = cvs.getBoundingClientRect();
    return {
      x: (clientX - r.left) * (W / r.width),
      y: (clientY - r.top)  * (H / r.height),
    };
  }

  function onMove(clientX, clientY) {
    const { x, y } = canvasCoords(clientX, clientY);
    hovered   = hitSign(x, y);
    const onC = hitCentre(x, y);
    cvs.style.cursor = (hovered || onC) ? 'pointer' : (dragging ? 'grabbing' : 'grab');
    autoSpin = !hovered && !onC && !dragging;
  }

  function onDrag(clientX) {
    if (!dragging) return;
    const dx  = clientX - dragStartX;
    const del = (dx / W) * Math.PI * 1.2;
    rotation    += del - (dragDist);
    rotVel       = del - dragDist;
    dragDist     = del;
  }

  function onPress(clientX, clientY) {
    dragging   = true;
    dragStartX = clientX;
    dragDist   = 0;
    autoSpin   = false;
    rotVel     = 0;
    cvs.style.cursor = 'grabbing';
  }

  function onRelease(clientX, clientY) {
    if (!dragging) return;
    dragging = false;
    const { x, y } = canvasCoords(clientX, clientY);

    if (Math.abs(rotVel) < 0.006) {
      const hit = hitSign(x, y);
      if (hit) {
        selected = hit;
        if (selectCb) selectCb(hit);
      } else if (hitCentre(x, y)) {
        window.location.href = 'chart.html';
      }
    }
    cvs.style.cursor = hovered ? 'pointer' : 'grab';
  }

  cvs_mousemove  = (e) => { onMove(e.clientX, e.clientY); onDrag(e.clientX); };
  cvs_mouseleave = ()  => { hovered = null; autoSpin = !dragging; cvs.style.cursor = ''; };
  cvs_mousedown  = (e) => onPress(e.clientX, e.clientY);
  win_mouseup    = (e) => onRelease(e.clientX, e.clientY);

  cvs_touchstart = (e) => {
    if (e.touches.length === 1) onPress(e.touches[0].clientX, e.touches[0].clientY);
  };
  cvs_touchmove  = (e) => {
    if (e.touches.length === 1) {
      e.preventDefault();
      onDrag(e.touches[0].clientX);
      onMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  };
  cvs_touchend   = (e) => {
    if (e.changedTouches.length) {
      const t = e.changedTouches[0];
      onRelease(t.clientX, t.clientY);
    }
    setTimeout(() => { autoSpin = !hovered; }, 2200);
  };

  // ── Resize ────────────────────────────────────────────────────────────────

  function resize() {
    dpr = window.devicePixelRatio || 1;
    const wrap = cvs.parentElement;
    const cssW = wrap.clientWidth;
    const cssH = Math.min(Math.round(cssW * 0.65), Math.round(window.innerHeight * 0.52), 460);

    cvs.style.width  = cssW + 'px';
    cvs.style.height = cssH + 'px';
    cvs.width        = Math.round(cssW * dpr);
    cvs.height       = Math.round(cssH * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    W = cssW; H = cssH;
    cx = W / 2; cy = H / 2 + 10;
    initStars();
  }

  // ── Planet position fetch ─────────────────────────────────────────────────

  function fetchPlanets() {
    const E = window.AstroEphemeris;
    if (!E) { setTimeout(fetchPlanets, 350); return; }
    try {
      const now = new Date();
      const jd  = E.julianDay(now.getFullYear(), now.getMonth() + 1, now.getDate(),
                               now.getUTCHours(), now.getUTCMinutes(), 0);
      const mod = l => ((l % 360) + 360) % 360;
      for (const pl of PLANETS) {
        try {
          let lon;
          if      (pl.key === 'sun')  lon = E.sunPosition(jd).lon;
          else if (pl.key === 'moon') lon = E.moonPosition(jd).lon;
          else                        lon = E.geocentricPlanetLongitude(pl.key, jd);
          planetLons[pl.key] = mod(lon);
        } catch (e) { /* leave unset — planet simply won't render */ }
      }
    } catch (e) { /* ephemeris not ready */ }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  function init(canvasEl, cb) {
    cvs      = canvasEl;
    ctx      = cvs.getContext('2d');
    selectCb = cb;

    resize();
    window.addEventListener('resize', resize);

    fetchPlanets();

    cvs.addEventListener('mousemove',  cvs_mousemove);
    cvs.addEventListener('mouseleave', cvs_mouseleave);
    cvs.addEventListener('mousedown',  cvs_mousedown);
    window.addEventListener('mouseup', win_mouseup);
    cvs.addEventListener('touchstart', cvs_touchstart, { passive: true  });
    cvs.addEventListener('touchmove',  cvs_touchmove,  { passive: false });
    cvs.addEventListener('touchend',   cvs_touchend);

    requestAnimationFrame(frame);
  }

  function setSelected(key) {
    selected = key || null;
  }

  window.ZodiacSphere = { init, setSelected };

})();
