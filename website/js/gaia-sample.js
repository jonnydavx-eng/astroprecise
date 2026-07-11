// GENERATED — canonical source: OrbitLab js/. Edit there, sync via scripts/sync-to-astroprecise.mjs
/**
 * OrbitLab Phase 4 — Gaia-inspired sample layer
 * ---------------------------------------------------------------------------
 * Not a download of Gaia DR3. A deterministic, arm-structured star sample
 * with approximate galactic (l, b) labels for education + free-explore density.
 * Bright nearby stars from StarCatalog can be projected via equatorial→galactic.
 *
 * Honesty: positions are schematic in the same scene units as the MW spiral.
 */
(function (global) {
  'use strict';

  var D2R = Math.PI / 180;
  var R2D = 180 / Math.PI;

  // IAU galactic north pole (J2000) for equatorial → galactic
  var NGPRAD = 192.85948 * D2R;
  var NGPDECD = 27.12825 * D2R;
  var LNCP = 122.93192 * D2R; // galactic longitude of celestial pole

  function mulberry32(a) {
    return function () {
      var t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /** Equatorial RA/Dec (deg J2000) → galactic l,b (deg). */
  function equatorialToGalactic(raDeg, decDeg) {
    var ra = raDeg * D2R;
    var dec = decDeg * D2R;
    var cosb = Math.cos(dec);
    var sinb = Math.sin(dec);
    var cosd = Math.cos(NGPDECD);
    var sind = Math.sin(NGPDECD);
    var dra = ra - NGPRAD;
    var sinbG = sinb * sind + cosb * cosd * Math.cos(dra);
    var b = Math.asin(Math.max(-1, Math.min(1, sinbG)));
    var y = cosb * Math.sin(dra);
    var x = sinb * cosd - cosb * sind * Math.cos(dra);
    var l = LNCP - Math.atan2(y, x);
    l = ((l * R2D) % 360 + 360) % 360;
    b = b * R2D;
    return { l: l, b: b };
  }

  /**
   * Generate arm-structured sample stars.
   * @returns {{ pos: Float32Array, col: Float32Array, meta: Array, count: number }}
   * meta[i] = { l, b, arm, mag }
   */
  function generate(count, seed) {
    count = Math.max(500, Math.min(60000, count | 0));
    seed = seed == null ? 20260709 : seed | 0;
    var rnd = mulberry32(seed);

    // Match orrery spiral constants (must stay in sync with orrery-webgl)
    var R0 = 44;
    var PITCH = 12.8 * D2R;
    var ARMS = [
      { phase: 0.55, name: 'Sagittarius–Carina', cool: 0.15 },
      { phase: 2.12, name: 'Scutum–Centaurus', cool: 0.05 },
      { phase: 3.68, name: 'Norma', cool: 0.25 },
      { phase: 5.24, name: 'Perseus', cool: 0.35 },
    ];

    var pos = new Float32Array(count * 3);
    var col = new Float32Array(count * 3);
    var meta = new Array(count);

    function spiralXY(armPhase, radius, scatter) {
      var th = armPhase + Math.log(Math.max(radius, R0) / R0) / Math.tan(PITCH) + (scatter || 0);
      return { x: Math.cos(th) * radius, z: Math.sin(th) * radius, th: th };
    }

    for (var i = 0; i < count; i++) {
      var arm = ARMS[(rnd() * ARMS.length) | 0];
      var t = Math.pow(rnd(), 0.52);
      if (rnd() < 0.4) t = 0.2 + rnd() * 0.55;
      var rad = R0 + t * 560 + (rnd() - 0.5) * 10;
      var scatter = (rnd() - 0.5) * (0.03 + t * 0.045);
      var p = spiralXY(arm.phase, rad, scatter);
      // Thin disk scale height grows mildly with R
      var h = (4 + t * 7) * (0.85 + rnd() * 0.3);
      var y = (rnd() - 0.5) * h;
      pos[i * 3] = p.x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = p.z;

      // Approximate galactic (l,b) from cylindrical scene + Sun offset
      // Sun at ~132 units on Sag arm → l=0° toward center would be -x-ish in MW models;
      // for HUD education we derive l from atan2 of (pos - sunLocal) in plane.
      var sunX = Math.cos(arm.phase + 0.14 + Math.log(132 / R0) / Math.tan(PITCH)) * 132;
      var sunZ = Math.sin(arm.phase + 0.14 + Math.log(132 / R0) / Math.tan(PITCH)) * 132;
      // Use fixed Sun locus matching orrery (Sag phase + 0.14, R=132)
      sunX = Math.cos(0.55 + 0.14 + Math.log(132 / R0) / Math.tan(PITCH)) * 132;
      sunZ = Math.sin(0.55 + 0.14 + Math.log(132 / R0) / Math.tan(PITCH)) * 132;
      var dx = p.x - sunX;
      var dz = p.z - sunZ;
      var l = ((Math.atan2(dz, dx) * R2D) + 360) % 360;
      var dist = Math.sqrt(dx * dx + y * y + dz * dz) || 1;
      var b = Math.asin(Math.max(-1, Math.min(1, y / dist))) * R2D;

      // Color: cooler outer (Gaia blue) vs warmer inner
      var cool = arm.cool + t * 0.45 + rnd() * 0.1;
      var w = 0.45 + rnd() * 0.55;
      col[i * 3] = (0.55 + (1 - cool) * 0.4) * w;
      col[i * 3 + 1] = (0.68 + cool * 0.12) * w;
      col[i * 3 + 2] = (0.78 + cool * 0.22) * w;

      meta[i] = { l: l, b: b, arm: arm.name, mag: 6 + t * 10 + rnd() * 4 };
    }

    return { pos: pos, col: col, meta: meta, count: count, seed: seed };
  }

  /**
   * Magellanic Stream schematic path (scene units, MW group local coords).
   * Approximate arc trailing LMC/SMC — educational, not a survey polyline.
   */
  function magellanicStreamPath(segments) {
    segments = segments || 48;
    // LMC/SMC positions match orrery-webgl satellites
    var lmc = { x: -210, y: -48, z: 430 };
    var smc = { x: -178, y: -62, z: 405 };
    var pts = [];
    for (var i = 0; i <= segments; i++) {
      var t = i / segments;
      // Arc from between LMC/SMC trailing toward -X, +Y slight, -Z
      var bx = (lmc.x + smc.x) * 0.5;
      var by = (lmc.y + smc.y) * 0.5;
      var bz = (lmc.z + smc.z) * 0.5;
      var x = bx - t * 380 + Math.sin(t * Math.PI) * 40;
      var y = by + t * 90 + Math.sin(t * 3.1) * 12;
      var z = bz - t * 220 - Math.cos(t * Math.PI) * 30;
      pts.push({ x: x, y: y, z: z, t: t });
    }
    return pts;
  }

  /**
   * Camera look-direction → approximate galactic l,b for HUD.
   * Uses MW group orientation: tilt X + yaw Z + spin Y.
   */
  function lookDirToGalactic(dirWorld, mwGroup) {
    if (!dirWorld) return { l: 0, b: 0 };
    var v = { x: dirWorld.x, y: dirWorld.y, z: dirWorld.z };
    if (mwGroup && mwGroup.matrixWorld) {
      // Inverse-rotate into MW local: apply -yaw Y, -tilt X roughly via quaternion
      try {
        var e = mwGroup.rotation;
        // Undo R = Rz(z) * Rx(x) * Ry(y) approximately for HUD
        var cy = Math.cos(-e.y), sy = Math.sin(-e.y);
        var x1 = v.x * cy + v.z * sy;
        var z1 = -v.x * sy + v.z * cy;
        var y1 = v.y;
        var cx = Math.cos(-e.x), sx = Math.sin(-e.x);
        var y2 = y1 * cx - z1 * sx;
        var z2 = y1 * sx + z1 * cx;
        var x2 = x1;
        var cz = Math.cos(-e.z), sz = Math.sin(-e.z);
        v = {
          x: x2 * cz - y2 * sz,
          y: x2 * sz + y2 * cz,
          z: z2,
        };
      } catch (err) { /* keep world */ }
    }
    var len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z) || 1;
    var b = Math.asin(Math.max(-1, Math.min(1, v.y / len))) * R2D;
    var l = ((Math.atan2(v.z, v.x) * R2D) + 360) % 360;
    return { l: l, b: b };
  }

  /**
   * Project bright catalog stars into MW-group schematic coords using true
   * equatorial→galactic (ℓ,b), placed around the Sun locus for free-explore.
   * @param {Array} stars StarCatalog rows with ra, dec, ly, mag, spectral, name
   * @param {{ sunX:number, sunY:number, sunZ:number, maxLy?:number }} opts
   */
  function projectBrightStars(stars, opts) {
    opts = opts || {};
    var sunX = opts.sunX != null ? opts.sunX : 0;
    var sunY = opts.sunY != null ? opts.sunY : 2.8;
    var sunZ = opts.sunZ != null ? opts.sunZ : 0;
    var maxLy = opts.maxLy != null ? opts.maxLy : 80;
    var list = stars || [];
    var n = list.length;
    var pos = new Float32Array(n * 3);
    var col = new Float32Array(n * 3);
    var names = [];
    var specColors = {
      O: [0.6, 0.75, 1.0], B: [0.7, 0.85, 1.0], A: [0.88, 0.92, 1.0],
      F: [1.0, 0.98, 0.95], G: [1.0, 0.92, 0.72], K: [1.0, 0.82, 0.55],
      M: [1.0, 0.65, 0.45], D: [0.95, 0.95, 1.0],
    };
    for (var i = 0; i < n; i++) {
      var s = list[i];
      var gb = equatorialToGalactic(s.ra || 0, s.dec || 0);
      var ly = Math.min(Math.max(s.ly || 20, 4), maxLy);
      // schematic kpc-ish distance from Sun in scene units (not true AU/pc scale)
      var d = 18 + Math.sqrt(ly) * 9;
      var l = gb.l * D2R;
      var b = gb.b * D2R;
      // Galactic cartesian relative to Sun (x→center roughly -sin for ℓ=0 convention simplified)
      var cl = Math.cos(l), sl = Math.sin(l), cb = Math.cos(b), sb = Math.sin(b);
      pos[i * 3] = sunX + d * cb * cl;
      pos[i * 3 + 1] = sunY + d * sb;
      pos[i * 3 + 2] = sunZ + d * cb * sl;
      var sp = (s.spectral || 'G').charAt(0).toUpperCase();
      var c = specColors[sp] || specColors.G;
      var w = 0.65 + Math.min(0.35, Math.max(0, (3 - (s.mag != null ? s.mag : 4)) / 8));
      col[i * 3] = c[0] * w;
      col[i * 3 + 1] = c[1] * w;
      col[i * 3 + 2] = c[2] * w;
      names.push({ name: s.name || '', l: gb.l, b: gb.b, ly: s.ly });
    }
    return { pos: pos, col: col, names: names, count: n };
  }

  global.GaiaSample = {
    generate: generate,
    equatorialToGalactic: equatorialToGalactic,
    magellanicStreamPath: magellanicStreamPath,
    lookDirToGalactic: lookDirToGalactic,
    projectBrightStars: projectBrightStars,
    VERSION: 'phase4b-1',
  };
})(typeof window !== 'undefined' ? window : globalThis);
