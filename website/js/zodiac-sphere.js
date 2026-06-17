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

  // ── Data (AP_ZODIAC.SIGNS — seal keys, not Unicode glyphs) ───────────────

  const Z = window.AP_ZODIAC;
  const SIGNS = (Z && Z.SIGNS ? Z.SIGNS : []).map(function (s) {
    return { key: s.key, name: s.name, el: s.element, lon: s.lon };
  });
  if (!SIGNS.length) {
    console.warn('[ZodiacSphere] AP_ZODIAC.SIGNS missing — load ap-zodiac-constants.js first');
  }

  // Element colours (RGB components for easy alpha composition)
  const EL = {
    fire:  [224,  80,  64],
    earth: [107, 155,  95],
    air:   [92, 74, 110],
    water: [ 42, 110, 189],
  };

  const PLANETS = [
    { key: 'sun',     sym: '☉', col: '#c9a227', name: 'Sun'     },
    { key: 'moon',    sym: '☽', col: '#C8D0E8', name: 'Moon'    },
    { key: 'mercury', sym: '☿', col: '#3f7d76', name: 'Mercury' },
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
  let spinAnim = null;
  let spinDoneCb = null;

  let hovered  = null;
  let hoveredPlanet = null;
  let selected = null;
  let selectCb = null;
  let onSelectChange = null;
  let tooltipEl = null;

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

  function lonToSignName(lon) {
    const idx = Math.floor((((lon % 360) + 360) % 360) / 30);
    return SIGNS[idx] ? SIGNS[idx].name : '';
  }

  function projectRaw(lonDeg, rad) {
    const theta = (lonDeg * Math.PI / 180) + rotation;
    const x3 = rad * Math.cos(theta);
    const y3d = rad * Math.sin(theta);
    const y3 = y3d * Math.cos(TILT);
    const z3 = y3d * Math.sin(TILT);
    const sc = FOCAL / (FOCAL + z3);
    return { x: cx + x3 * sc, y: cy + y3 * sc };
  }

  function drawElementSectors() {
    const R = ringRadius();
    const r0 = R * 0.72;
    const r1 = R * 1.04;
    const steps = 10;
    for (const s of SIGNS) {
      const el = EL[s.el];
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const lon = s.lon - 15 + (30 * i / steps);
        const p = projectRaw(lon, r1);
        i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
      }
      for (let i = steps; i >= 0; i--) {
        const lon = s.lon - 15 + (30 * i / steps);
        const p = projectRaw(lon, r0);
        ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      ctx.fillStyle = `rgba(${el[0]},${el[1]},${el[2]},0.07)`;
      ctx.fill();
    }
  }

  function drawTickMarks() {
    const R = ringRadius();
    for (let t = 0; t < 360; t += 30) {
      const theta = (t * Math.PI / 180) + rotation;
      const x3a = (R * 0.76) * Math.cos(theta);
      const y3da = (R * 0.76) * Math.sin(theta);
      const x3b = (R * 0.92) * Math.cos(theta);
      const y3db = (R * 0.92) * Math.sin(theta);
      const ya = y3da * Math.cos(TILT);
      const za = y3da * Math.sin(TILT);
      const yb = y3db * Math.cos(TILT);
      const zb = y3db * Math.sin(TILT);
      const sa = FOCAL / (FOCAL + za);
      const sb = FOCAL / (FOCAL + zb);
      ctx.beginPath();
      ctx.moveTo(cx + x3a * sa, cy + ya * sa);
      ctx.lineTo(cx + x3b * sb, cy + yb * sb);
      ctx.strokeStyle = t % 90 === 0 ? 'rgba(201,162,39,0.32)' : 'rgba(201,162,39,0.16)';
      ctx.lineWidth = t % 90 === 0 ? 1.4 : 0.7;
      ctx.stroke();
    }
  }

  // ── Ecliptic ring ─────────────────────────────────────────────────────────

  function drawRing() {
    const STEPS = ringSteps();

    drawElementSectors();
    drawTickMarks();

    // Outer dashed gold ring
    ctx.beginPath();
    for (let i = 0; i <= STEPS; i++) {
      const lon = (i / STEPS) * 360;
      const p   = project(lon);
      i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.strokeStyle = 'rgba(201, 162, 39,0.30)';
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
    ctx.strokeStyle = 'rgba(92, 74, 110,0.14)';
    ctx.lineWidth   = 1;
    ctx.stroke();
  }

  // ── Planets ───────────────────────────────────────────────────────────────

  function hitPlanet(px, py) {
    const baseR = 14;
    const visible = PLANETS
      .filter(pl => planetLons[pl.key] != null)
      .map(pl => ({ pl, pt: project(planetLons[pl.key]) }))
      .sort((a, b) => b.pt.z - a.pt.z);
    for (const { pl, pt } of visible) {
      const r = Math.max(10, baseR * pt.s);
      const dx = px - pt.x;
      const dy = py - pt.y;
      if (dx * dx + dy * dy < r * r) return pl.key;
    }
    return null;
  }

  function drawPlanets() {
    // Sort back-to-front
    const visible = PLANETS
      .filter(pl => planetLons[pl.key] != null)
      .map(pl => ({ pl, pt: project(planetLons[pl.key]) }))
      .sort((a, b) => a.pt.z - b.pt.z);

    for (const { pl, pt } of visible) {
      const isHov = hoveredPlanet === pl.key;
      const r     = (isHov ? 6.2 : 5) * pt.s;
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
      ctx.font          = `${Math.max(8, 9 * pt.s)}px 'AstroGlyph', sans-serif`;
      ctx.fillStyle     = pl.col;
      ctx.textAlign     = 'center';
      ctx.textBaseline  = 'bottom';
      ctx.fillText(pl.sym + '︎', pt.x, pt.y - r - 1);  // FE0E = force text glyph, not emoji

      ctx.globalAlpha = 1;
    }

    if (hoveredPlanet) {
      const pl = PLANETS.find(p => p.key === hoveredPlanet);
      const lon = planetLons[hoveredPlanet];
      if (pl && lon != null) {
        const pt = project(lon);
        const label = pl.name + ' · ' + lonToSignName(lon);
        ctx.font = `${Math.max(9, 10 * pt.s)}px Inter, system-ui, sans-serif`;
        const tw = ctx.measureText(label).width;
        const bx = pt.x - tw / 2 - 6;
        const by = pt.y - 28 * pt.s;
        ctx.fillStyle = 'rgba(8,12,18,0.88)';
        ctx.strokeStyle = 'rgba(201,162,39,0.45)';
        ctx.lineWidth = 1;
        const bw = tw + 12;
        const bh = 18;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh, 4);
        else ctx.rect(bx, by, bw, bh);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = pl.col;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, pt.x, by + bh / 2);
      }
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
        const [gr, gg, gb] = isSel ? [201, 162, 39] : el;
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
        ? 'rgba(201, 162, 39,0.22)'
        : `rgba(${el[0]},${el[1]},${el[2]},0.14)`;
      ctx.fill();

      // Border ring
      ctx.strokeStyle = isSel
        ? 'rgba(201, 162, 39,0.95)'
        : isHov
          ? `rgba(${el[0]},${el[1]},${el[2]},0.85)`
          : `rgba(${el[0]},${el[1]},${el[2]},0.40)`;
      ctx.lineWidth = isSel || isHov ? 1.8 : 0.9;
      ctx.stroke();

      // Engraved zodiac seal (APCanvasSeals) — keyed by sign slug, not Unicode.
      const sealCol = isSel ? '#c9a227' : `rgb(${el[0]},${el[1]},${el[2]})`;
      const drewSeal = window.APCanvasSeals && (
        (typeof APCanvasSeals.drawSealPlate === 'function' && APCanvasSeals.drawSealPlate(ctx, s.key, s.x, s.y, r * 0.82, sealCol)) ||
        (typeof APCanvasSeals.drawSeal === 'function' && APCanvasSeals.drawSeal(ctx, s.key, s.x, s.y, r * 1.45))
      );
      if (!drewSeal) {
        ctx.font         = `${Math.max(8, r * 0.55)}px Inter, system-ui, sans-serif`;
        ctx.fillStyle    = isSel ? '#c9a227' : isHov ? sealCol : '#C8BFA6';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((s.name || s.key || '?').charAt(0), s.x, s.y);
      }

      // Name label — visible for near-side signs, always for hovered/selected
      const labelFade = Math.max(0, (s.depth - 0.35) / 0.35 + (isHov || isSel ? 1 : 0));
      if (labelFade > 0) {
        ctx.globalAlpha = alpha * Math.min(1, labelFade);
        ctx.font        = `${Math.max(8, 9.5 * s.s)}px Inter, system-ui, sans-serif`;
        ctx.fillStyle   = isSel ? '#c9a227' : 'rgba(200,190,165,0.9)';
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
    ctx.strokeStyle = `rgba(63, 125, 118,${wA})`;
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
    grad.addColorStop(0.5, '#c9a227');
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
    ctx.fillStyle     = 'rgba(201, 162, 39,0.65)';
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
  let readyFired = false;

  function signalReady() {
    if (readyFired) return;
    readyFired = true;
    try {
      document.dispatchEvent(new CustomEvent('ap-zodiac-sphere-ready', { detail: { canvas: cvs } }));
    } catch (e) { /* IE11 guard */ }
  }

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

    if (spinAnim) {
      const p = Math.min(1, (ts - spinAnim.start) / spinAnim.dur);
      const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      rotation = spinAnim.from + spinAnim.delta * e;
      if (p >= 1) {
        rotation = spinAnim.from + spinAnim.delta;
        spinAnim = null;
        if (spinDoneCb) { const f = spinDoneCb; spinDoneCb = null; f(); }
      }
    } else if (autoSpin) {
      rotation += SPIN_SPEED;
    } else if (Math.abs(rotVel) > 0.0001) {
      rotation += rotVel;
      rotVel   *= 0.91;
    }

    signalReady();
    requestAnimationFrame(frame);
  }

  // ── Pointer / touch ───────────────────────────────────────────────────────

  let dragging    = false;
  let dragStartX  = 0;
  let dragStartY  = 0;
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
    hoveredPlanet = hitPlanet(x, y);
    const onC = hitCentre(x, y);
    cvs.style.cursor = (hovered || onC || hoveredPlanet) ? 'pointer' : (dragging ? 'grabbing' : 'grab');
    autoSpin = !hovered && !onC && !hoveredPlanet && !dragging;
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
    dragStartY = clientY;
    dragDist   = 0;
    spinAnim   = null;
    spinDoneCb = null;
    autoSpin   = false;
    rotVel     = 0;
    cvs.style.cursor = 'grabbing';
  }

  function onRelease(clientX, clientY) {
    if (!dragging) return;
    dragging = false;
    const { x, y } = canvasCoords(clientX, clientY);
    const moved = Math.hypot(clientX - dragStartX, clientY - dragStartY);

    if (moved < 14) {
      const hit = hitSign(x, y);
      if (hit) {
        spinToSign(hit, { duration: 520, onDone: function () {
          if (selectCb) selectCb(hit);
        } });
      } else if (hitCentre(x, y)) {
        window.location.href = 'chart.html';
      }
    }
    cvs.style.cursor = hovered ? 'pointer' : 'grab';
  }

  // These handlers are referenced in init()'s addEventListener calls. They MUST be
  // declared — under 'use strict' an undeclared assignment throws ReferenceError at
  // load, which previously aborted the whole module (window.ZodiacSphere never set →
  // the "Spin to Your Sign" canvas rendered blank on horoscope.html).
  let cvs_mousemove, cvs_mouseleave, cvs_mousedown, win_mouseup,
      cvs_touchstart, cvs_touchmove, cvs_touchend;

  cvs_mousemove  = (e) => { onMove(e.clientX, e.clientY); onDrag(e.clientX); };
  cvs_mouseleave = ()  => { hovered = null; hoveredPlanet = null; autoSpin = !dragging; cvs.style.cursor = ''; };
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
    autoSpin = !hovered;
  };

  // ── Resize ────────────────────────────────────────────────────────────────

  function ringSteps() {
    const t = (window.RafCore && window.RafCore.tier) || 'high';
    return t === 'high' ? 360 : t === 'mid' ? 240 : 180;
  }

  function resize() {
    const wrap = cvs.parentElement;
    const cssW = wrap.clientWidth;
    const maxH = (window.RafCore && window.RafCore.tier === 'high') ? 520 : 460;
    const cssH = Math.min(Math.round(cssW * 0.65), Math.round(window.innerHeight * 0.52), maxH);

    if (window.RafCore && window.RafCore.setupCanvas2D) {
      const setup = window.RafCore.setupCanvas2D(cvs, cssW, cssH, 2.5);
      dpr = setup.dpr;
      ctx = setup.ctx;
    } else {
      dpr = window.devicePixelRatio || 1;
      cvs.style.width = cssW + 'px';
      cvs.style.height = cssH + 'px';
      cvs.width = Math.round(cssW * dpr);
      cvs.height = Math.round(cssH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;
      if (ctx.imageSmoothingQuality) ctx.imageSmoothingQuality = 'high';
    }

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
          else                        lon = E.planetLongitude(pl.key, jd); // accurate path (was geocentricPlanetLongitude — rendered Pluto ~2.5 signs wrong)
          planetLons[pl.key] = mod(lon);
        } catch (e) { /* leave unset — planet simply won't render */ }
      }
    } catch (e) { /* ephemeris not ready */ }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  function onKeyDown(e) {
    if (!cvs || document.activeElement !== cvs) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      rotation -= 0.12;
      autoSpin = false;
      rotVel = 0;
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      rotation += 0.12;
      autoSpin = false;
      rotVel = 0;
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (hovered) {
        spinToSign(hovered, { duration: 520, onDone: () => { if (selectCb) selectCb(hovered); } });
      } else if (hitCentre(cx, cy)) {
        window.location.href = 'chart.html';
      }
    }
  }

  function setRotation(rad) {
    rotation = rad;
    autoSpin = false;
    rotVel = 0;
  }

  function getRotation() { return rotation; }

  function init(canvasEl, cb) {
    cvs      = canvasEl;
    if (!cvs) return;
    ctx      = cvs.getContext('2d');
    if (!ctx) return;
    selectCb = cb;

    cvs.setAttribute('tabindex', '0');
    cvs.setAttribute('role', 'application');
    cvs.setAttribute('aria-roledescription', '3D zodiac wheel');
    cvs.setAttribute('aria-label', 'Zodiac ring — drag to spin, arrow keys to rotate, Enter to select a sign');

    resize();
    window.addEventListener('resize', resize);

    fetchPlanets();

    if (window.APCanvasSeals && typeof APCanvasSeals.preload === 'function') {
      APCanvasSeals.preload();
    }

    cvs.addEventListener('keydown', onKeyDown);
    cvs.addEventListener('mousemove',  cvs_mousemove);
    cvs.addEventListener('mouseleave', cvs_mouseleave);
    cvs.addEventListener('mousedown',  cvs_mousedown);
    window.addEventListener('mouseup', win_mouseup);
    cvs.addEventListener('touchstart', cvs_touchstart, { passive: true  });
    cvs.addEventListener('touchmove',  cvs_touchmove,  { passive: false });
    cvs.addEventListener('touchend',   cvs_touchend);

    requestAnimationFrame(frame);
  }

  function shortestDelta(from, to) {
    let d = to - from;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  }

  function targetRotationForSign(key) {
    const s = SIGNS.find((x) => x.key === key);
    if (!s) return rotation;
    return -Math.PI / 2 - (s.lon * Math.PI / 180);
  }

  function spinToSign(key, opts) {
    opts = opts || {};
    const s = SIGNS.find((x) => x.key === key);
    if (!s) return;
    selected = key;
    if (onSelectChange) onSelectChange(key, s);
    const target = targetRotationForSign(key);
    const delta = shortestDelta(rotation, target);
    if (opts.instant || opts.animate === false || opts.duration === 0) {
      rotation += delta;
      spinAnim = null;
      if (opts.onDone) opts.onDone();
      return;
    }
    spinAnim = {
      from: rotation,
      delta,
      start: performance.now(),
      dur: opts.duration || 900,
    };
    spinDoneCb = opts.onDone || null;
    autoSpin = false;
    rotVel = 0;
  }

  function spinRandom(opts) {
    const pick = SIGNS[Math.floor(Math.random() * SIGNS.length)];
    spinToSign(pick.key, opts);
    return pick.key;
  }

  function getSelected() { return selected; }

  function setSelected(key, opts) {
    if (!key) { selected = null; return; }
    spinToSign(key, Object.assign({ duration: 700 }, opts || {}));
  }

  window.ZodiacSphere = {
    init,
    setSelected,
    spinToSign,
    spinRandom,
    getSelected,
    setRotation,
    getRotation,
    get onSelectChange() { return onSelectChange; },
    set onSelectChange(fn) { onSelectChange = typeof fn === 'function' ? fn : null; },
  };

})();
