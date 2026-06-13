/**
 * AstroPrecise — Consciousness Weather
 * A field-conditions report, not a prediction. Blends:
 *   MEASURED — planetary K-index (NOAA SWPC), solar wind speed (NOAA SWPC)
 *   COMPUTED — lunar phase & illumination, day's transit pressure
 * Each component is labelled by provenance; the composite is presented as
 * "conditions," like a surf report for awareness. Schumann resonance has no
 * public CORS-accessible live feed, so it is honestly reported as
 * unavailable rather than faked.
 *
 * Requires: ephemeris.js. Oracle.js optional (transit pressure fallback).
 */

window.FieldWeather = (() => {
  'use strict';

  const KP_URL   = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json';
  const WIND_URL = 'https://services.swpc.noaa.gov/products/solar-wind/plasma-7-day.json';

  async function fetchJson(url, timeoutMs = 6000) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: ctl.signal });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } finally {
      clearTimeout(t);
    }
  }

  async function getKp() {
    // NOAA has served this both as array-of-arrays (header row first) and as
    // an array of {time_tag, Kp, …} objects — accept either, newest finite wins
    const rows = await fetchJson(KP_URL);
    for (let i = rows.length - 1; i >= 0; i--) {
      const r = rows[i];
      const kp = parseFloat(Array.isArray(r) ? r[1] : (r.Kp ?? r.kp_index));
      const time = Array.isArray(r) ? r[0] : r.time_tag;
      if (isFinite(kp)) return { kp, time, source: 'NOAA SWPC (measured)' };
    }
    throw new Error('no parsable Kp data');
  }

  async function getSolarWind() {
    // same dual-format tolerance: [time_tag, density, speed, …] or {speed, …}
    const rows = await fetchJson(WIND_URL);
    for (let i = rows.length - 1; i >= 0; i--) {
      const r = rows[i];
      const speed = parseFloat(Array.isArray(r) ? r[2] : r.speed);
      const time = Array.isArray(r) ? r[0] : r.time_tag;
      if (isFinite(speed)) return { speedKmS: speed, time, source: 'NOAA SWPC / DSCOVR (measured)' };
    }
    throw new Error('no plasma data');
  }

  function getLunar(date) {
    const E = window.AstroEphemeris;
    const jd = E.julianDay(date.getFullYear(), date.getMonth() + 1, date.getDate(),
                           date.getHours(), date.getMinutes(), 0);
    const elong = ((E.moonPosition(jd).lon - E.sunPosition(jd).lon) % 360 + 360) % 360;
    const illum = (1 - Math.cos(elong * Math.PI / 180)) / 2;
    const waxing = elong < 180;
    const names = ['New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous',
                   'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent'];
    const idx = Math.round(elong / 45) % 8;
    return { illumination: illum, waxing, phaseName: names[idx], elongation: elong, source: 'computed (ELP2000)' };
  }

  function getTransitPressure(natalChart, date) {
    // mean "tension" of today's sky: hard aspects raise it, flowing ones ease it
    try {
      if (window.AstroOracle) {
        const ins = window.AstroOracle.getDailyInsight(natalChart || null, date);
        // moodScore 0-100 (higher = smoother) → pressure is its inverse
        return { pressure: (100 - ins.moodScore) / 100, basis: ins.meta.mode, source: 'computed (VSOP87 transits, symbolic weighting)' };
      }
    } catch (e) { /* fall through */ }
    return { pressure: 0.5, basis: 'unavailable', source: 'computed' };
  }

  // ── Composite ─────────────────────────────────────────────────────────────

  function kpBand(kp) {
    if (kp == null || !isFinite(kp)) return null;
    if (kp < 3)  return { label: 'Quiet field',       note: 'Geomagnetic conditions calm.' };
    if (kp < 5)  return { label: 'Unsettled field',   note: 'Mild geomagnetic activity.' };
    if (kp < 7)  return { label: 'Storm conditions',  note: 'Geomagnetic storm in progress — aurora possible at high latitudes.' };
    return        { label: 'Severe storm',           note: 'Strong geomagnetic storm underway.' };
  }

  /**
   * assemble(natalChart|null) → {
   *   components: { kp, solarWind, lunar, transits, schumann },
   *   composite: { score (0-100, higher = clearer), label, summary },
   * }
   * Live fetches fail soft: missing feeds are marked unavailable and the
   * composite recalculates from what remains.
   */
  async function assemble(natalChart, date) {
    date = date || new Date();
    const [kpR, windR] = await Promise.allSettled([getKp(), getSolarWind()]);
    const kp    = kpR.status === 'fulfilled' ? kpR.value : null;
    const wind  = windR.status === 'fulfilled' ? windR.value : null;
    const lunar = getLunar(date);
    const transits = getTransitPressure(natalChart, date);

    // composite: start at 100 (clear), subtract weighted disturbances.
    // Track measured vs symbolic inputs so the headline never poses as a
    // measured index when the live feeds are dead (the honesty rule).
    let score = 100, measured = 0, symbolic = 0;
    if (kp && isFinite(kp.kp)) { score -= (Math.min(kp.kp, 9) / 9) * 30; measured++; }
    if (wind && isFinite(wind.speedKmS)) { score -= Math.max(0, Math.min(1, (wind.speedKmS - 350) / 450)) * 15; measured++; }
    // full & new moons are "spring tides" of the field — not bad, but loud
    score -= Math.pow(Math.abs(lunar.illumination - 0.5) * 2, 2) * 15; symbolic++;
    // only let transits move the score when we actually have a chart/oracle —
    // never subtract on the 0.5 "unavailable" placeholder
    if (transits && transits.basis !== 'unavailable') { score -= transits.pressure * 30; symbolic++; }
    score = Math.round(Math.max(0, Math.min(100, score)));

    let label, summary;
    if (score >= 75) { label = 'Clear field';
      summary = 'Low interference, measured and symbolic. A good day for signal — subtle work, listening, beginnings.'; }
    else if (score >= 55) { label = 'Light chop';
      summary = 'Some turbulence in the field. Workable, but allow margin around what matters.'; }
    else if (score >= 35) { label = 'Active conditions';
      summary = 'The field is loud today. Strong currents reward deliberate pace and grounding.'; }
    else { label = 'Heavy weather';
      summary = 'Multiple systems peaking at once. Conditions, not verdicts — but a day to sail close to shore.'; }

    // No live measurement reached us — disclose it rather than imply a reading.
    const provenance = measured === 0
      ? 'symbolic only — live space-weather feeds unreachable'
      : `from ${measured} measured + ${symbolic} symbolic input${(measured + symbolic) === 1 ? '' : 's'}`;
    if (measured === 0) { label = 'Symbolic only'; summary = 'The live space-weather feeds (NOAA SWPC) could not be reached, so this reflects only the computed Moon and transits — not a measured field state.'; }

    return {
      components: {
        kp: kp ? { ...kp, band: kpBand(kp.kp) } : { unavailable: true, source: 'NOAA SWPC (feed unreachable)' },
        solarWind: wind || { unavailable: true, source: 'NOAA SWPC (feed unreachable)' },
        lunar,
        transits,
        schumann: { unavailable: true, source: 'no public live feed — not faked' },
      },
      composite: { score: measured === 0 ? null : score, label, summary, provenance, measured, symbolic },
      generatedAt: date.toISOString(),
    };
  }

  return { assemble, getKp, getSolarWind, getLunar };

})();
