/**
 * AstroPrecise — Planet Orrery
 * Canvas-based geocentric sky map showing live planetary positions.
 * Requires AstroEphemeris to be loaded first.
 */

window.PlanetOrrery = (() => {
  'use strict';

  // ── Planet definitions ────────────────────────────────────────────────────

  const PLANETS = [
    { id: 'moon',    name: 'Moon',    glyph: '☽', color: '#d0d8e8', glow: 'rgba(192,200,216,0.5)', size: 4,  ring: 1 },
    { id: 'mercury', name: 'Mercury', glyph: '☿', color: '#7a7572', glow: 'rgba(122,117,114,0.5)', size: 3.5,ring: 2 },
    { id: 'venus',   name: 'Venus',   glyph: '♀', color: '#c8b07a', glow: 'rgba(200,176,122,0.5)', size: 5,  ring: 3 },
    { id: 'sun',     name: 'Sun',     glyph: '☉', color: '#f0c040', glow: 'rgba(240,192,64,0.6)',  size: 10, ring: 4 },
    { id: 'mars',    name: 'Mars',    glyph: '♂', color: '#b84232', glow: 'rgba(184,66,50,0.5)',   size: 4,  ring: 5 },
    { id: 'jupiter', name: 'Jupiter', glyph: '♃', color: '#c08858', glow: 'rgba(192,136,88,0.5)', size: 7,  ring: 6 },
    { id: 'saturn',  name: 'Saturn',  glyph: '♄', color: '#c8b48a', glow: 'rgba(200,180,138,0.5)',size: 5.5,ring: 7 },
  ];

  const SIGN_GLYPHS = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];
  const SIGN_NAMES  = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo',
                        'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];

  // ── State ─────────────────────────────────────────────────────────────────

  let canvas, ctx, W, H, cx, cy, maxR, dpr;
  let raf = null, destroyed = false;
  let planetData = [];    // { lon, retro, sign, deg } for each planet
  let animOffset = 0;     // slow wobble animation

  // ── Main init ─────────────────────────────────────────────────────────────

  function init(canvasEl) {
    canvas = canvasEl;
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    computePositions();
    loop();
  }

  function resize() {
    dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();
    const size = Math.min(rect.width, rect.height, 520);
    W = H = size;
    canvas.width  = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width  = size + 'px';
    canvas.style.height = size + 'px';
    cx = cy = size / 2;
    maxR = size / 2 - 28;
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // ── Astronomy ─────────────────────────────────────────────────────────────

  function computePositions() {
    if (!window.AstroEphemeris) return;
    const E   = window.AstroEphemeris;
    const now = new Date();
    const jd  = E.julianDay(now.getFullYear(), now.getMonth() + 1, now.getDate(),
                            now.getHours(), now.getMinutes(), now.getSeconds());

    planetData = PLANETS.map(p => {
      let lon = 0, retro = false;
      try {
        switch (p.id) {
          case 'sun':     lon = E.sunPosition(jd).lon; break;
          case 'moon':    lon = E.moonPosition(jd).lon; break;
          case 'mercury': lon = E.mercuryPosition(jd).lon; retro = E.isRetrograde('mercury', jd); break;
          case 'venus':   lon = E.venusPosition(jd).lon;   retro = E.isRetrograde('venus', jd);   break;
          case 'mars':    lon = E.marsPosition(jd).lon;    retro = E.isRetrograde('mars', jd);    break;
          case 'jupiter': lon = E.jupiterPosition(jd).lon; retro = E.isRetrograde('jupiter', jd); break;
          case 'saturn':  lon = E.saturnPosition(jd).lon;  retro = E.isRetrograde('saturn', jd);  break;
        }
      } catch (e) { /* ephemeris not ready */ }
      lon = ((lon % 360) + 360) % 360;
      const sign    = Math.floor(lon / 30);
      const deg     = lon - sign * 30;
      const degStr  = `${Math.floor(deg)}°${Math.floor((deg % 1) * 60).toString().padStart(2,'0')}′`;
      return { ...p, lon, retro, sign, degStr };
    });
  }

  // ── Animation loop ────────────────────────────────────────────────────────

  function loop() {
    if (destroyed) return;
    raf = requestAnimationFrame(loop);
    animOffset += 0.003;
    draw();
  }

  // ── Rendering ─────────────────────────────────────────────────────────────

  function draw() {
    ctx.clearRect(0, 0, W, H);
    drawZodiacRing();
    drawOrbits();
    drawPlanets();
    drawCenter();
  }

  // Outer zodiac ring with 12 sign sectors
  function drawZodiacRing() {
    const outerR = maxR;
    const innerR = maxR - 28;

    for (let i = 0; i < 12; i++) {
      const startAngle = ((i * 30) - 90) * Math.PI / 180;
      const endAngle   = ((i * 30 + 30) - 90) * Math.PI / 180;
      const midAngle   = ((i * 30 + 15) - 90) * Math.PI / 180;

      // Sector fill — alternating subtle
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, outerR, startAngle, endAngle);
      ctx.closePath();
      const alpha = i % 2 === 0 ? 0.05 : 0.02;
      ctx.fillStyle = `rgba(196,146,10,${alpha})`;
      ctx.fill();

      // Sector divider line
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(startAngle) * innerR,
                 cy + Math.sin(startAngle) * innerR);
      ctx.lineTo(cx + Math.cos(startAngle) * outerR,
                 cy + Math.sin(startAngle) * outerR);
      ctx.strokeStyle = 'rgba(196,146,10,0.25)';
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Sign glyph
      const glyphR = innerR + 14;
      ctx.font = '13px serif';
      ctx.fillStyle = 'rgba(196,146,10,0.7)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(SIGN_GLYPHS[i],
                   cx + Math.cos(midAngle) * glyphR,
                   cy + Math.sin(midAngle) * glyphR);
    }

    // Outer circle border
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(196,146,10,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Inner circle border
    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(196,146,10,0.2)';
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  // Concentric orbit rings
  function drawOrbits() {
    const innerR = maxR - 28;
    const rings  = 7;

    for (let r = 1; r <= rings; r++) {
      const radius = (innerR * r) / (rings + 1);
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(107,33,168,0.12)`;
      ctx.lineWidth = 0.8;
      ctx.setLineDash([2, 6]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // Place each planet at its ecliptic longitude
  function drawPlanets() {
    if (!planetData.length) return;

    const innerR = maxR - 28;
    const rings  = 7;
    const wobble = Math.sin(animOffset) * 0.5;   // very subtle breathing

    planetData.forEach(p => {
      const rFrac  = p.ring / (rings + 1);
      const radius = innerR * rFrac;

      // ecliptic longitude → canvas angle (Aries = top)
      const angle = ((p.lon - 90) * Math.PI / 180);
      const px = cx + Math.cos(angle) * (radius + wobble);
      const py = cy + Math.sin(angle) * (radius + wobble);

      // Glow
      const glowGrad = ctx.createRadialGradient(px, py, 0, px, py, p.size * 3);
      glowGrad.addColorStop(0, p.glow);
      glowGrad.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(px, py, p.size * 3, 0, Math.PI * 2);
      ctx.fillStyle = glowGrad;
      ctx.fill();

      // Planet circle
      ctx.beginPath();
      ctx.arc(px, py, p.size, 0, Math.PI * 2);
      if (p.id === 'sun') {
        const sunGrad = ctx.createRadialGradient(px, py, 0, px, py, p.size);
        sunGrad.addColorStop(0, '#fff8e0');
        sunGrad.addColorStop(0.4, '#f0c040');
        sunGrad.addColorStop(1, '#c4920a');
        ctx.fillStyle = sunGrad;
      } else if (p.id === 'earth') {
        const earthGrad = ctx.createRadialGradient(px - p.size * 0.3, py - p.size * 0.3, 0, px, py, p.size);
        earthGrad.addColorStop(0, '#4a90d4');
        earthGrad.addColorStop(1, '#1b5faa');
        ctx.fillStyle = earthGrad;
      } else {
        ctx.fillStyle = p.color;
      }
      ctx.fill();

      // Saturn ring
      if (p.id === 'saturn') {
        ctx.beginPath();
        ctx.ellipse(px, py, p.size * 2.2, p.size * 0.7, -0.3, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(200,180,138,0.45)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Glyph label
      ctx.font = `bold ${p.size * 1.6}px serif`;
      ctx.fillStyle = p.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.glyph, px, py - p.size * 2.2);

      // Retrograde marker
      if (p.retro) {
        ctx.font = `${p.size * 1.1}px serif`;
        ctx.fillStyle = 'rgba(192,53,101,0.8)';
        ctx.fillText('℞', px + p.size * 1.5, py - p.size * 1.5);
      }
    });
  }

  // Earth symbol at center
  function drawCenter() {
    // Outer ring
    const r = 10;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, 'rgba(107,33,168,0.9)');
    grad.addColorStop(0.6, 'rgba(55,20,110,0.8)');
    grad.addColorStop(1, 'rgba(20,12,45,0.9)');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(196,146,10,0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // ⊕ Earth glyph
    ctx.font = '11px serif';
    ctx.fillStyle = 'rgba(240,232,216,0.9)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⊕', cx, cy);
  }

  // ── Public API ────────────────────────────────────────────────────────────

  function destroy() {
    destroyed = true;
    if (raf) cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
  }

  function refresh() {
    computePositions();
  }

  return { init, destroy, refresh, getPlanetData: () => planetData };

})();
