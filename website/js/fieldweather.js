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
    // rows: [time_tag, Kp, a_running, station_count]; first row is header
    const rows = await fetchJson(KP_URL);
    const last = rows[rows.length - 1];
    return { kp: parseFloat(last[1]), time: last[0], source: 'NOAA SWPC (measured)' };
  }

  async function getSolarWind() {
    // rows: [time_tag, density, speed, temperature]; first row is header
    const rows = await fetchJson(WIND_URL);
    for (let i = rows.length - 1; i > 0; i--) {
      const speed = parseFloat(rows[i][2]);
      if (!isNaN(speed)) return { speedKmS: speed, time: rows[i][0], source: 'NOAA SWPC / DSCOVR (measured)' };
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
    if (kp == null) return null;
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

    // composite: start at 100 (clear), subtract weighted disturbances
    let score = 100, parts = 0;
    if (kp) { score -= (Math.min(kp.kp, 9) / 9) * 30; parts++; }
    if (wind) { score -= Math.max(0, Math.min(1, (wind.speedKmS - 350) / 450)) * 15; parts++; }
    // full & new moons are "spring tides" of the field — not bad, but loud
    score -= Math.pow(Math.abs(lunar.illumination - 0.5) * 2, 2) * 15;
    score -= transits.pressure * 30;
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

    return {
      components: {
        kp: kp ? { ...kp, band: kpBand(kp.kp) } : { unavailable: true, source: 'NOAA SWPC (feed unreachable)' },
        solarWind: wind || { unavailable: true, source: 'NOAA SWPC (feed unreachable)' },
        lunar,
        transits,
        schumann: { unavailable: true, source: 'no public live feed — not faked' },
      },
      composite: { score, label, summary },
      generatedAt: date.toISOString(),
    };
  }

  return { assemble, getKp, getSolarWind, getLunar };

})();
