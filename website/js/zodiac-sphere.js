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
  // Cool-brass system, low saturation — mirrors css .ap-orb ramp --c1 (retinted 2026-07-04)
  const EL = {
    fire:  [216, 154, 114],
    earth: [156, 178, 126],
    air:   [184, 192, 204],
    water: [143, 184, 182],
  };

  const EL_HEX = {
    fire: '#d89a72',
    earth: '#9cb27e',
    air: '#b8c0cc',
    water: '#8fb8b6',
  };

  function withAlpha(col, hexAlpha) {
    if (window.APCanvasSeals && typeof APCanvasSeals.withAlpha === 'function') {
      return APCanvasSeals.withAlpha(col, hexAlpha);
    }
    var a = parseInt(hexAlpha || 'ff', 16) / 255;
    if (/^#[0-9a-f]{3,8}$/i.test(col)) {
      var h = col.slice(1);
      if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      return 'rgba(' +
        parseInt(h.slice(0, 2), 16) + ',' +
        parseInt(h.slice(2, 4), 16) + ',' +
        parseInt(h.slice(4, 6), 16) + ',' + a.toFixed(3) + ')';
    }
    var rgb = String(col || '').match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
    if (rgb) return 'rgba(' + rgb[1] + ',' + rgb[2] + ',' + rgb[3] + ',' + a.toFixed(3) + ')';
    return col || 'rgba(201,162,39,' + a.toFixed(3) + ')';
  }

  // Planet dot colours — muted brass / parchment family, cool (retinted 2026-07-04)
  const PLANETS = [
    { key: 'sun',     sym: '☉', col: '#ead79a', name: 'Sun'     },
    { key: 'moon',    sym: '☽', col: '#e6e0d2', name: 'Moon'    },
    { key: 'mercury', sym: '☿', col: '#cfc7b6', name: 'Mercury' },
    { key: 'venus',   sym: '♀', col: '#e2c8b4', name: 'Venus'   },
    { key: 'mars',    sym: '♂', col: '#c87e5e', name: 'Mars'    },
    { key: 'jupiter', sym: '♃', col: '#e0c48e', name: 'Jupiter' },
    { key: 'saturn',  sym: '♄', col: '#d8c289', name: 'Saturn'  },
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
  let hoveredChord = null;
  let hoveredNatal = null;
  let highlightedChord = null;
  let onChordClick = null;
  let onChordHover = null;
  let lastHoverChord = null;
  let selected = null;
  let selectCb = null;
  let onSelectChange = null;
  let tooltipEl = null;

  let planetLons = {};           // signKey → ecliptic lon (degrees, 0–360)
  let stars      = [];
  let cachedPositions = [];      // projected sign positions, updated each frame
  let spacePanX = 0;
  let spacePanY = 0;
  let natalMarkers = [];
  let natalSunSign = null;
  let transitChords = [];

  // Backdrop is engine-rendered only (ART-DIRECTION hard rule): a deep cool-void
  // radial gradient + engraved starfield drawn in drawSpaceBackground(). No
  // photographic sky imagery is loaded.

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
    const n = Math.floor(W * H / 2200);
    for (let i = 0; i < n; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.3 + 0.2,
        a: Math.random() * 0.65 + 0.12,
        tw: Math.random() * Math.PI * 2,
        sp: Math.random() * 0.014 + 0.004,
        brass: Math.random() < 0.28,
      });
    }
  }

  function syncSpaceParallax() {
    const targetX = Math.sin(rotation) * 22 + rotVel * 140;
    const targetY = Math.cos(rotation) * 10 + Math.sin(rotation * 0.55) * 5;
    spacePanX += (targetX - spacePanX) * 0.07;
    spacePanY += (targetY - spacePanY) * 0.07;
    const wrap = cvs && cvs.parentElement;
    if (wrap) {
      wrap.style.setProperty('--space-pan-x', spacePanX.toFixed(2) + 'px');
      wrap.style.setProperty('--space-pan-y', spacePanY.toFixed(2) + 'px');
    }
  }

  function drawSpaceBackground() {
    syncSpaceParallax();
    // On-system cool-void well (DESIGN.md tokens): raised mid #121826 at the
    // centre falling to deep base #0C1016 at the rim — engraved-observatory
    // backdrop, no photographic sky.
    const g = ctx.createRadialGradient(cx, cy * 0.88, 0, cx, cy, Math.max(W, H) * 0.78);
    g.addColorStop(0, '#121826');
    g.addColorStop(0.55, '#0E141E');
    g.addColorStop(1, '#0C1016');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, ringRadius() * 1.55);
    glow.addColorStop(0, 'rgba(111, 160, 216, 0.1)');
    glow.addColorStop(0.45, 'rgba(194, 160, 94, 0.06)');
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
    const vig = ctx.createRadialGradient(cx, cy, ringRadius() * 0.25, cx, cy, Math.max(W, H) * 0.78);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(0.65, 'rgba(6, 10, 16, 0.38)');
    vig.addColorStop(1, 'rgba(6, 10, 16, 0.88)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);
  }

  function drawStars(t) {
    for (const s of stars) {
      const alpha = s.a * (0.68 + 0.32 * Math.sin(s.tw + t * s.sp));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      if (s.brass) {
        ctx.fillStyle = `rgba(194, 160, 94, ${alpha * 0.95})`;
      } else {
        ctx.fillStyle = `rgba(236, 230, 216, ${alpha})`;
      }
      ctx.fill();
    }
  }

  function drawMeridian() {
    const R = ringRadius();
    ctx.save();
    ctx.strokeStyle = 'rgba(194, 160, 94, 0.48)';
    ctx.setLineDash([4, 6]);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx, cy - R * 1.14);
    ctx.lineTo(cx, cy + R * 0.42);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(194, 160, 94, 0.9)';
    ctx.beginPath();
    ctx.arc(cx, cy - R * 1.06, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = `600 ${Math.max(7, 7.5 * (W / 600))}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(194, 160, 94, 0.72)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('TODAY', cx, cy - R * 1.14);
    ctx.restore();
  }

  function lonToSignName(lon) {
    const idx = Math.floor((((lon % 360) + 360) % 360) / 30);
    return SIGNS[idx] ? SIGNS[idx].name : '';
  }

  function degInSign(lon) {
    return Math.floor(((lon % 30) + 30) % 30);
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
      ctx.fillStyle = 'rgba(194, 160, 94, 0.035)';
      ctx.fill();
    }
  }

  function drawTickMarks() {
    const R = ringRadius();
    for (let t = 0; t < 360; t += 10) {
      const major = t % 30 === 0;
      const theta = (t * Math.PI / 180) + rotation;
      const rIn = R * (major ? 0.78 : 0.84);
      const rOut = R * (major ? 0.96 : 0.92);
      const x3a = rIn * Math.cos(theta);
      const y3da = rIn * Math.sin(theta);
      const x3b = rOut * Math.cos(theta);
      const y3db = rOut * Math.sin(theta);
      const ya = y3da * Math.cos(TILT);
      const za = y3da * Math.sin(TILT);
      const yb = y3db * Math.cos(TILT);
      const zb = y3db * Math.sin(TILT);
      const sa = FOCAL / (FOCAL + za);
      const sb = FOCAL / (FOCAL + zb);
      ctx.beginPath();
      ctx.moveTo(cx + x3a * sa, cy + ya * sa);
      ctx.lineTo(cx + x3b * sb, cy + yb * sb);
      ctx.strokeStyle = major ? 'rgba(194, 160, 94, 0.38)' : 'rgba(194, 160, 94, 0.14)';
      ctx.lineWidth = major ? 1.2 : 0.55;
      ctx.stroke();
    }
  }

  // ── Ecliptic ring ─────────────────────────────────────────────────────────

  function drawRing() {
    const STEPS = ringSteps();

    drawElementSectors();
    drawTickMarks();
    drawOrbitalGlow();

    // Outer brass ring
    ctx.beginPath();
    for (let i = 0; i <= STEPS; i++) {
      const lon = (i / STEPS) * 360;
      const p   = project(lon);
      i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.strokeStyle = 'rgba(194, 160, 94, 0.42)';
    ctx.lineWidth   = 1.8;
    ctx.setLineDash([]);
    ctx.stroke();

    // Inner guide ring (68% radius)
    const Ri = ringRadius() * 0.68;
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
    ctx.strokeStyle = 'rgba(111, 160, 216, 0.14)';
    ctx.lineWidth   = 1;
    ctx.setLineDash([2, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawOrbitalGlow() {
    const R = ringRadius();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(111, 160, 216, 0.06)';
    ctx.lineWidth = 5;
    PLANETS.forEach((pl) => {
      if (planetLons[pl.key] == null) return;
      const pt = project(planetLons[pl.key]);
      const dist = Math.sqrt(
        Math.pow(pt.x - cx, 2) + Math.pow(pt.y - cy, 2)
      );
      if (dist < 8) return;
      ctx.beginPath();
      ctx.arc(cx, cy, dist, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.restore();
  }

  function chordColor(quality) {
    // cool-brass system: harmonious = teal-brass, challenging = muted terracotta, else brass
    if (quality === 'h') return 'rgba(143, 184, 182, 0.82)';
    if (quality === 'x') return 'rgba(200, 126, 94, 0.78)';
    return 'rgba(216, 185, 120, 0.88)';
  }

  function chordGeometry(ch) {
    const R = ringRadius();
    const tLon = ch.transitLon != null ? ch.transitLon : planetLons[ch.transitKey];
    const nLon = ch.natalLon;
    if (tLon == null || nLon == null || !isFinite(tLon) || !isFinite(nLon)) return null;
    const nNorm = ((nLon % 360) + 360) % 360;
    const tNorm = ((tLon % 360) + 360) % 360;
    const ptN = projectRaw(nNorm, R * 0.50);
    const ptT = projectRaw(tNorm, R * 0.90);
    const mx = (ptN.x + ptT.x) * 0.5 + (cx - (ptN.x + ptT.x) * 0.5) * 0.22;
    const my = (ptN.y + ptT.y) * 0.5 + (cy - (ptN.y + ptT.y) * 0.5) * 0.22;
    const gx = 0.25 * ptN.x + 0.5 * mx + 0.25 * ptT.x;
    const gy = 0.25 * ptN.y + 0.5 * my + 0.25 * ptT.y;
    return { ptN, ptT, mx, my, gx, gy, col: chordColor(ch.quality) };
  }

  function distToSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len2 = dx * dx + dy * dy;
    if (len2 < 1) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * dx + (py - y1) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  }

  function hitChord(px, py) {
    const threshold = 16;
    for (let i = transitChords.length - 1; i >= 0; i--) {
      const geom = chordGeometry(transitChords[i]);
      if (!geom) continue;
      if (distToSegment(px, py, geom.ptN.x, geom.ptN.y, geom.ptT.x, geom.ptT.y) < threshold) return i;
      if (Math.hypot(px - geom.gx, py - geom.gy) < 26) return i;
    }
    return null;
  }

  function hitNatalMarker(px, py) {
    if (!natalMarkers.length) return null;
    for (let i = natalMarkers.length - 1; i >= 0; i--) {
      const m = natalMarkers[i];
      if (m.lon == null || !isFinite(m.lon)) continue;
      const pt = project(((m.lon % 360) + 360) % 360);
      const r = Math.max(12, 14 * pt.s);
      const dx = px - pt.x;
      const dy = py - pt.y;
      if (dx * dx + dy * dy < r * r) return i;
    }
    return null;
  }

  function drawTransitChords() {
    if (!transitChords.length) return;
    ctx.save();
    transitChords.forEach((ch, idx) => {
      const geom = chordGeometry(ch);
      if (!geom) return;
      const { ptN, ptT, mx, my, gx, gy, col } = geom;
      const isHov = hoveredChord === idx || highlightedChord === idx;
      const pulse = isHov ? 1 : 0.62 + 0.38 * Math.sin(lastT * 0.0014 + (ch.natalLon + ch.transitLon) * 0.017);
      ctx.globalAlpha = pulse;
      ctx.strokeStyle = col;
      ctx.lineWidth = isHov ? (ch.quality === 'c' ? 2.4 : 2) : (ch.quality === 'c' ? 1.7 : 1.15);
      ctx.setLineDash(ch.quality === 'x' ? [5, 5] : []);
      ctx.beginPath();
      ctx.moveTo(ptN.x, ptN.y);
      ctx.quadraticCurveTo(mx, my, ptT.x, ptT.y);
      ctx.stroke();
      ctx.setLineDash([]);
      if (ch.glyph) {
        ctx.font = `${Math.max(8, isHov ? 10 : 9)}px 'AstroGlyph', sans-serif`;
        ctx.fillStyle = col;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.globalAlpha = Math.min(1, pulse + 0.15);
        ctx.fillText(ch.glyph + '︎', gx, gy);  // FE0E = force text glyph, not emoji
      }
    });
    ctx.restore();
  }

  function drawChordTooltip() {
    if (hoveredChord == null) return;
    const ch = transitChords[hoveredChord];
    const geom = chordGeometry(ch);
    if (!ch || !geom || !ch.label) return;
    const label = ch.label;
    ctx.font = `500 ${Math.max(9, 10)}px Inter, system-ui, sans-serif`;
    const tw = ctx.measureText(label).width;
    const bx = geom.gx - tw / 2 - 8;
    const by = geom.gy - 32;
    const bw = tw + 16;
    const bh = 20;
    ctx.fillStyle = 'rgba(8, 12, 18, 0.92)';
    ctx.strokeStyle = geom.col;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 1;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh, 4);
    else ctx.rect(bx, by, bw, bh);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(236, 230, 216, 0.95)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, geom.gx, by + bh / 2);
  }

  function drawNatalMarkers() {
    if (!natalMarkers.length) return;
    const R = ringRadius() * 0.5;
    natalMarkers.forEach((m, idx) => {
      if (m.lon == null || !isFinite(m.lon)) return;
      const pt = project(((m.lon % 360) + 360) % 360);
      const col = m.col || '#C2A05E';
      const isHov = hoveredNatal === idx;
      const pulse = isHov ? 1 : 0.85 + 0.15 * Math.sin(lastT * 0.002 + (m.lon || 0));
      const hg = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, (isHov ? 22 : 16) * pt.s);
      hg.addColorStop(0, withAlpha(col, '55'));
      hg.addColorStop(1, withAlpha(col, '00'));
      ctx.fillStyle = hg;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, (isHov ? 22 : 16) * pt.s, 0, Math.PI * 2);
      ctx.fill();
      const sz = (isHov ? 6.5 : 5) * pt.s * pulse;
      ctx.save();
      ctx.translate(pt.x, pt.y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = col;
      ctx.globalAlpha = 0.92;
      ctx.fillRect(-sz, -sz, sz * 2, sz * 2);
      ctx.restore();
      ctx.globalAlpha = 1;
      if (m.label && hoveredNatal !== idx) {
        ctx.font = `${Math.max(7, 8 * pt.s)}px Inter, system-ui, sans-serif`;
        ctx.fillStyle = 'rgba(236, 230, 216, 0.9)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(m.label, pt.x, pt.y - sz - 3);
      }
    });
  }

  function drawNatalTooltip() {
    if (hoveredNatal == null) return;
    const m = natalMarkers[hoveredNatal];
    if (!m || m.lon == null || !isFinite(m.lon)) return;
    const pt = project(((m.lon % 360) + 360) % 360);
    const col = m.col || '#C2A05E';
    const name = (m.label || 'Natal').replace(/\s*Natal\s*/i, '').trim() || 'Natal';
    const label = name + ' · ' + lonToSignName(m.lon) + ' ' + degInSign(m.lon) + '°';
    ctx.font = `500 ${Math.max(9, 10)}px Inter, system-ui, sans-serif`;
    const tw = ctx.measureText(label).width;
    const bx = pt.x - tw / 2 - 8;
    const by = pt.y - 36 * pt.s;
    const bw = tw + 16;
    const bh = 20;
    ctx.fillStyle = 'rgba(8, 12, 18, 0.92)';
    ctx.strokeStyle = col;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 1;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh, 4);
    else ctx.rect(bx, by, bw, bh);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(236, 230, 216, 0.95)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, pt.x, by + bh / 2);
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
      g.addColorStop(0, withAlpha(pl.col, 'AA'));
      g.addColorStop(1, withAlpha(pl.col, '00'));
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
      const isNatal = natalSunSign && natalSunSign === s.key;
      const el     = EL[s.el];
      const alpha  = 0.30 + 0.70 * s.depth;
      const baseR  = Math.max(16, 22 * s.s);
      const r      = baseR * (isHov ? 1.28 : 1);

      ctx.save();
      ctx.globalAlpha = alpha;

      // Glow for hovered / selected / natal sun sign
      if (isSel || isHov || isNatal) {
        const [gr, gg, gb] = isSel ? [194, 160, 94] : isNatal ? [111, 160, 216] : el;
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
        ? 'rgba(194, 160, 94, 0.24)'
        : isNatal
          ? 'rgba(111, 160, 216, 0.18)'
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
      const sealCol = isSel ? '#c9a227' : (EL_HEX[s.el] || '#c9a227');
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
    ctx.strokeStyle = `rgba(194, 160, 94, ${wA * 0.85})`;
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
    grad.addColorStop(0,   '#FFF8E4');
    grad.addColorStop(0.5, '#C2A05E');
    grad.addColorStop(1,   '#9A7A3A');
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
    ctx.fillText('YOUR CHART', cx, cy + R * pulse + 9);
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

    drawSpaceBackground();
    drawStars(ts / 1000);
    drawMeridian();
    drawRing();
    drawPlanets();
    drawTransitChords();
    drawChordTooltip();
    drawNatalMarkers();
    drawNatalTooltip();
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
    hoveredChord = hovered || hoveredPlanet ? null : hitChord(x, y);
    hoveredNatal = hovered || hoveredPlanet || hoveredChord != null ? null : hitNatalMarker(x, y);
    if (hoveredChord !== lastHoverChord) {
      lastHoverChord = hoveredChord;
      if (typeof onChordHover === 'function') onChordHover(hoveredChord);
    }
    const onC = hitCentre(x, y);
    cvs.style.cursor = (hovered || onC || hoveredPlanet || hoveredChord != null || hoveredNatal != null) ? 'pointer' : (dragging ? 'grabbing' : 'grab');
    autoSpin = !hovered && !onC && !hoveredPlanet && hoveredChord == null && hoveredNatal == null && !dragging;
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
      if (hoveredChord != null) {
        const ch = transitChords[hoveredChord];
        if (typeof onChordClick === 'function') onChordClick(hoveredChord, ch);
        return;
      }
      const hit = hitSign(x, y);
      if (hit) {
        spinToSign(hit, { duration: 520, onDone: function () {
          if (selectCb) selectCb(hit);
        } });
      } else if (hitCentre(x, y)) {
        try { document.dispatchEvent(new CustomEvent('ap-horoscope-centre-tap')); } catch (e) { /* */ }
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
  cvs_mouseleave = ()  => {
    hovered = null; hoveredPlanet = null; hoveredChord = null; hoveredNatal = null;
    if (lastHoverChord != null) {
      lastHoverChord = null;
      if (typeof onChordHover === 'function') onChordHover(null);
    }
    autoSpin = !dragging; cvs.style.cursor = '';
  };
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
        try { document.dispatchEvent(new CustomEvent('ap-horoscope-centre-tap')); } catch (e) { /* */ }
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
    cvs.setAttribute('aria-roledescription', 'live 3D ecliptic dial');
    cvs.setAttribute('aria-label', 'Live 3D ecliptic dial — drag to explore, arrow keys to rotate, Enter to select a sign');

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

  function setNatalMarkers(list, sunSignKey) {
    natalMarkers = Array.isArray(list) ? list.slice() : [];
    natalSunSign = sunSignKey || null;
  }

  function setTransitChords(list) {
    transitChords = Array.isArray(list) ? list.slice() : [];
  }

  function setHighlightedChord(idx) {
    highlightedChord = (idx != null && idx >= 0 && idx < transitChords.length) ? idx : null;
  }

  function getPlanetLons() {
    return Object.assign({}, planetLons);
  }

  function getTransitChordCount() {
    return transitChords.length;
  }

  window.ZodiacSphere = {
    init,
    setSelected,
    spinToSign,
    spinRandom,
    getSelected,
    setRotation,
    getRotation,
    setNatalMarkers,
    setTransitChords,
    setHighlightedChord,
    getPlanetLons,
    getTransitChordCount,
    get onChordClick() { return onChordClick; },
    set onChordClick(fn) { onChordClick = typeof fn === 'function' ? fn : null; },
    get onChordHover() { return onChordHover; },
    set onChordHover(fn) { onChordHover = typeof fn === 'function' ? fn : null; },
    refreshPlanets: fetchPlanets,
    get onSelectChange() { return onSelectChange; },
    set onSelectChange(fn) { onSelectChange = typeof fn === 'function' ? fn : null; },
  };

})();
