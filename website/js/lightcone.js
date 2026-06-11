/**
 * AstroPrecise — The Light-Cone
 * Your birth as an event in spacetime: light left your birthplace at c and
 * has been expanding outward ever since. Radius in light-years equals your
 * age in years — that identity is exact, and everything here follows from it.
 *
 * Also computes the Zenith Star: the catalog star nearest the point directly
 * overhead at the moment and place of birth (zenith RA = local sidereal time,
 * zenith Dec = geographic latitude).
 *
 * Requires: ephemeris.js (AstroEphemeris), starcatalog.js (StarCatalog).
 */

window.LightCone = (() => {
  'use strict';

  const C_KM_S = 299792.458;
  const SECONDS_PER_YEAR = 365.25 * 86400;   // Julian year — definition of the light-year

  // ── Core math ─────────────────────────────────────────────────────────────

  function state(birthDate, now) {
    now = now || new Date();
    const ageSec = (now.getTime() - birthDate.getTime()) / 1000;
    if (ageSec <= 0) return null;
    const ly = ageSec / SECONDS_PER_YEAR;
    return {
      ageSeconds: ageSec,
      radiusLy: ly,
      radiusKm: ageSec * C_KM_S,
      // the sphere's surface area grows as r² — light touching new space
      sphereAreaLy2: 4 * Math.PI * ly * ly,
      kmPerSecond: C_KM_S,
    };
  }

  function milestones(birthDate, now) {
    const S = window.StarCatalog;
    const st = state(birthDate, now);
    if (!st || !S) return null;
    const reached = S.reachedBy(st.radiusLy);
    const next = S.nextAfter(st.radiusLy);
    // "currently passing": nearest star within ±1.5 ly of the wavefront
    let passing = null, best = 1.5;
    for (const star of S.STARS) {
      const d = Math.abs(star.ly - st.radiusLy);
      if (d < best) { best = d; passing = star; }
    }
    let nextYears = null;
    if (next) nextYears = next.ly - st.radiusLy;
    return { ...st, reached, next, nextYears, passing };
  }

  // ── Zenith star ───────────────────────────────────────────────────────────

  function zenithStar(jd, lat, lon) {
    const E = window.AstroEphemeris, S = window.StarCatalog;
    if (!E || !S) return null;
    const ra = E.localSiderealTime(jd, lon);   // degrees
    const dec = lat;
    const near = S.nearestSky(ra, dec, 3);
    if (!near || !near.length) return null;
    return { zenithRa: ra, zenithDec: dec, star: near[0].star, sepDeg: near[0].sepDeg, runnersUp: near.slice(1) };
  }

  // ── Canvas visualization — expanding wavefront among real stars ──────────

  let canvas, ctx, raf = null, destroyed = false;
  let birth = null, W = 0, H = 0, cx = 0, cy = 0, dpr = 1;
  let phase = 0;

  // log-compressed radial mapping: 0.1 ly .. 1000 ly onto the canvas
  function rOf(ly, maxR) {
    const t = Math.log10(Math.max(ly, 0.1) / 0.1) / Math.log10(1000 / 0.1);
    return 14 + t * (maxR - 14);
  }

  function init(canvasEl, birthDate) {
    canvas = canvasEl;
    birth = birthDate;
    if (!canvas || !birth) return;
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    destroyed = false;
    loop();
  }

  function resize() {
    dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();
    const size = Math.min(rect.width, 560);
    W = size; H = size;
    canvas.width = size * dpr; canvas.height = size * dpr;
    canvas.style.width = size + 'px'; canvas.style.height = size + 'px';
    cx = cy = size / 2;
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function loop() {
    if (destroyed) return;
    raf = requestAnimationFrame(loop);
    phase += 0.012;
    draw();
  }

  function draw() {
    const S = window.StarCatalog;
    const st = state(birth);
    if (!st || !S) return;
    ctx.clearRect(0, 0, W, H);
    const maxR = W / 2 - 16;
    const waveR = rOf(st.radiusLy, maxR);

    // distance gridlines: 1, 10, 100, 1000 ly
    [1, 10, 100, 1000].forEach(ly => {
      const r = rOf(ly, maxR);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(154, 166, 200, 0.10)';
      ctx.lineWidth = 0.6;
      ctx.setLineDash([2, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = '9px monospace';
      ctx.fillStyle = 'rgba(154, 166, 200, 0.35)';
      ctx.textAlign = 'center';
      ctx.fillText(ly + ' ly', cx, cy - r - 3);
    });

    // interior glow — the volume your light has filled
    const fillGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, waveR);
    fillGrad.addColorStop(0, 'rgba(196, 146, 10, 0.10)');
    fillGrad.addColorStop(0.75, 'rgba(91, 127, 199, 0.05)');
    fillGrad.addColorStop(1, 'rgba(91, 127, 199, 0.02)');
    ctx.beginPath();
    ctx.arc(cx, cy, waveR, 0, Math.PI * 2);
    ctx.fillStyle = fillGrad;
    ctx.fill();

    // stars — angle from RA, radius from distance
    for (const star of S.STARS) {
      if (star.ly > 1100) continue;
      const r = rOf(star.ly, maxR);
      const a = (star.ra - 90) * Math.PI / 180;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      const reached = star.ly <= st.radiusLy;
      const sz = Math.max(1, 3 - star.mag * 0.25);
      ctx.beginPath();
      ctx.arc(x, y, reached ? sz : sz * 0.7, 0, Math.PI * 2);
      ctx.fillStyle = reached ? 'rgba(232, 201, 106, 0.95)' : 'rgba(154, 166, 200, 0.30)';
      ctx.fill();
      if (reached && star.ly > st.radiusLy - 6) {
        // recently reached — label it
        ctx.font = '9px monospace';
        ctx.fillStyle = 'rgba(232, 201, 106, 0.8)';
        ctx.textAlign = 'left';
        ctx.fillText(star.name, x + 5, y + 3);
      }
    }

    // the wavefront — your first breath, still travelling
    const pulse = 1 + Math.sin(phase) * 0.012;
    ctx.beginPath();
    ctx.arc(cx, cy, waveR * pulse, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(232, 201, 106, 0.85)';
    ctx.lineWidth = 1.6;
    ctx.shadowColor = 'rgba(196, 146, 10, 0.8)';
    ctx.shadowBlur = 12;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // trailing echo rings
    for (let i = 1; i <= 3; i++) {
      const rr = waveR * pulse - i * 7;
      if (rr < 12) break;
      ctx.beginPath();
      ctx.arc(cx, cy, rr, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(232, 201, 106, ${0.22 / i})`;
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }

    // the event itself
    ctx.beginPath();
    ctx.arc(cx, cy, 3.2, 0, Math.PI * 2);
    ctx.fillStyle = '#f0e8d8';
    ctx.shadowColor = 'rgba(240, 232, 216, 0.9)';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  function destroy() {
    destroyed = true;
    if (raf) cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
  }

  return { state, milestones, zenithStar, init, destroy };

})();
