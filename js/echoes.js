/**
 * Astro Precise — Echo Dates (Harmonic Returns)
 * The sky never exactly repeats, but it rhymes. This module scans the future
 * ephemeris for the dates when the heavens most closely re-approximate the
 * natal configuration — a weighted angular deviation across the seven
 * classical planets. Local minima below a resonance threshold become "echo
 * windows."
 *
 * The full deviation can never reach zero (outer planets drift for decades),
 * so resonance is reported as a percentage where 100% = the birth moment.
 *
 * Requires: ephemeris.js (AstroEphemeris).
 */

window.EchoDates = (() => {
  'use strict';

  // weights: personal planets count more — they define the chord's melody;
  // slow planets are the drone underneath
  const WEIGHTS = {
    sun: 3, moon: 1.5, mercury: 2, venus: 2.5, mars: 2.5,
    jupiter: 1.5, saturn: 1.5,
  };
  const PLANETS = Object.keys(WEIGHTS);
  const W_TOTAL = PLANETS.reduce((s, p) => s + WEIGHTS[p], 0);

  function angDist(a, b) {
    let d = Math.abs(a - b) % 360;
    return d > 180 ? 360 - d : d;
  }

  function positionsAt(jd) {
    const E = window.AstroEphemeris;
    return {
      sun:     E.sunPosition(jd).lon,
      moon:    E.moonPosition(jd).lon,
      mercury: E.mercuryPosition(jd).lon,
      venus:   E.venusPosition(jd).lon,
      mars:    E.marsPosition(jd).lon,
      jupiter: E.jupiterPosition(jd).lon,
      saturn:  E.saturnPosition(jd).lon,
    };
  }

  // weighted mean angular deviation from natal, in degrees (0 = identical sky)
  function deviation(natal, jd) {
    const now = positionsAt(jd);
    let sum = 0;
    for (const p of PLANETS) sum += WEIGHTS[p] * angDist(natal[p], now[p]);
    return sum / W_TOTAL;
  }

  // deviation → resonance %: 0° dev = 100%, 90° mean dev (uncorrelated sky) = 0%
  function resonancePct(dev) {
    return Math.max(0, Math.min(100, (1 - dev / 90) * 100));
  }

  /**
   * Scan [from, from + years] for echo windows.
   * Async & chunked so the UI thread breathes. onProgress(0..1) optional.
   * Returns top `count` windows: [{date, jd, resonance, deviation, chord}]
   * where chord lists the planets currently within 5° of natal.
   */
  async function scan(natalChart, opts = {}) {
    const E = window.AstroEphemeris;
    if (!E || !natalChart) return [];
    const years   = opts.years || 5;
    const count   = opts.count || 5;
    const from    = opts.from || new Date();
    const onProg  = opts.onProgress || (() => {});

    // natal longitudes — accept saved-chart shape or raw positions
    const natal = {};
    for (const p of PLANETS) {
      const src = natalChart.positions
        ? (natalChart.positions[p] || natalChart.positions[p.charAt(0).toUpperCase() + p.slice(1)])
        : null;
      if (src == null) return [];
      natal[p] = typeof src === 'number' ? src : (src.longitude != null ? src.longitude : src.lon);
    }

    const jd0 = E.julianDay(from.getFullYear(), from.getMonth() + 1, from.getDate(), 12, 0, 0);
    const days = Math.round(years * 365.25);

    // pass 1: daily coarse scan
    const devs = new Float64Array(days);
    const CHUNK = 120;
    for (let d = 0; d < days; d += CHUNK) {
      const end = Math.min(d + CHUNK, days);
      for (let i = d; i < end; i++) devs[i] = deviation(natal, jd0 + i);
      onProg(end / days * 0.85);
      await new Promise(r => setTimeout(r, 0));
    }

    // pass 2: local minima, refined to the hour
    const minima = [];
    for (let i = 1; i < days - 1; i++) {
      if (devs[i] < devs[i - 1] && devs[i] <= devs[i + 1]) {
        minima.push({ i, dev: devs[i] });
      }
    }
    minima.sort((a, b) => a.dev - b.dev);

    // de-duplicate windows closer than 20 days apart
    const picked = [];
    for (const m of minima) {
      if (picked.every(p => Math.abs(p.i - m.i) > 20)) picked.push(m);
      if (picked.length >= count) break;
    }

    const results = picked.map(m => {
      // hourly refinement ±1 day
      let bestJd = jd0 + m.i, bestDev = m.dev;
      for (let h = -24; h <= 24; h += 2) {
        const jd = jd0 + m.i + h / 24;
        const dv = deviation(natal, jd);
        if (dv < bestDev) { bestDev = dv; bestJd = jd; }
      }
      const now = positionsAt(bestJd);
      const chord = PLANETS
        .filter(p => angDist(natal[p], now[p]) <= 5)
        .map(p => p.charAt(0).toUpperCase() + p.slice(1));
      // JD → Date
      const ms = (bestJd - 2440587.5) * 86400000;
      return {
        date: new Date(ms),
        jd: bestJd,
        deviation: +bestDev.toFixed(2),
        resonance: +resonancePct(bestDev).toFixed(1),
        chord,
      };
    });

    results.sort((a, b) => a.date - b.date);
    onProg(1);
    return results;
  }

  return { scan, deviation, resonancePct, positionsAt };

})();
