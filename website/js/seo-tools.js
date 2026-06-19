/* ============================================================================
 * seo-tools.js — tiny shared helpers for the standalone SEO landing pages
 * (what-is-my-rising-sign.html, solar-return.html).
 *
 * Honesty + determinism: every number here comes from window.AstroEphemeris
 * (real VSOP87 / Meeus astronomy). Same inputs -> same output. Nothing is
 * fabricated; if the engine is unavailable we say so rather than guessing.
 *
 * Exposes window.AstroSeoTools:
 *   - localToUT(y,m,d,hh,mm,tz)  -> {y,m,d,hh,mm}   (two-iteration refinement)
 *   - initCityAutocomplete(inputEl, dropdownEl, onPick)
 *   - nextSolarReturn(birthY,birthM,birthD,birthHH,birthMM, fromDate)
 *       -> { jd, date:{year,month,day,hour,minute}, sunLon, sign, degree }
 *   - jdToUTCDate(jd) -> {year,month,day,hour,minute,second}
 * ========================================================================== */
(function () {
  'use strict';

  const esc = (window.AP_SAFE && window.AP_SAFE.esc) ? s => window.AP_SAFE.esc(s) : s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  function E() { return window.AstroEphemeris; }

  // ── Timezone: local civil time -> Universal Time ───────────────────────────
  // Mirrors chart-page.js localToUT (Intl two-iteration refinement). Never
  // hardcodes offsets, so it honours DST and historical zone rules.
  function tzOffsetMinutes(tz, utcDate) {
    try {
      const dtf = new Intl.DateTimeFormat('en-US', {
        timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
      });
      const p = {};
      dtf.formatToParts(utcDate).forEach(x => { p[x.type] = x.value; });
      const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
      return (asUTC - utcDate.getTime()) / 60000;
    } catch (e) { return 0; }
  }

  function localToUT(y, m, d, hh, mm, tz) {
    if (!tz) return { y, m, d, hh, mm }; // no zone -> treat the given time as UT
    let utc = new Date(Date.UTC(y, m - 1, d, hh, mm, 0));
    for (let i = 0; i < 2; i++) {
      const off = tzOffsetMinutes(tz, utc);
      utc = new Date(Date.UTC(y, m - 1, d, hh, mm, 0) - off * 60000);
    }
    return {
      y: utc.getUTCFullYear(), m: utc.getUTCMonth() + 1, d: utc.getUTCDate(),
      hh: utc.getUTCHours(), mm: utc.getUTCMinutes(),
    };
  }

  // ── City autocomplete (reuses AstroApp.searchPlaces — Open-Meteo + offline) ─
  function debounce(fn, wait) {
    let t;
    return function (...args) { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), wait); };
  }

  function initCityAutocomplete(inputEl, dropdownEl, onPick) {
    if (!inputEl || !dropdownEl || !window.AstroApp || !AstroApp.searchPlaces) return;
    let seq = 0;
    const run = debounce(query => {
      const mySeq = ++seq;
      AstroApp.searchPlaces(query).then(({ results }) => {
        if (mySeq !== seq) return;
        dropdownEl.innerHTML = '';
        if (!results.length) { dropdownEl.hidden = true; return; }
        results.forEach(city => {
          const item = document.createElement('div');
          item.className = 'autocomplete-option';
          item.setAttribute('role', 'option');
          const region = city.admin ? `${city.admin}, ${city.country}` : city.country;
          item.innerHTML = `${esc(city.name)} <span class="city-country">${esc(region)}</span>`;
          item.addEventListener('mousedown', ev => {
            ev.preventDefault();
            inputEl.value = city.admin
              ? `${city.name}, ${city.admin}, ${city.country}`
              : `${city.name}, ${city.country}`;
            dropdownEl.innerHTML = '';
            dropdownEl.hidden = true;
            onPick({ lat: city.lat, lon: city.lon, tz: city.tz, name: city.name });
          });
          dropdownEl.appendChild(item);
        });
        dropdownEl.hidden = false;
      });
    }, 250);

    inputEl.addEventListener('input', () => {
      onPick(null); // invalidate previous selection while typing
      const q = inputEl.value.trim();
      if (q.length < 2) { seq++; dropdownEl.innerHTML = ''; dropdownEl.hidden = true; return; }
      run(q);
    });
    inputEl.addEventListener('blur', () => setTimeout(() => {
      dropdownEl.innerHTML = ''; dropdownEl.hidden = true;
    }, 150));
  }

  // ── Julian Day -> UTC calendar (Meeus Ch 7, inverse) ───────────────────────
  function jdToUTCDate(jd) {
    const z = Math.floor(jd + 0.5);
    const f = jd + 0.5 - z;
    let A = z;
    if (z >= 2299161) {
      const a = Math.floor((z - 1867216.25) / 36524.25);
      A = z + 1 + a - Math.floor(a / 4);
    }
    const B = A + 1524;
    const C = Math.floor((B - 122.1) / 365.25);
    const D = Math.floor(365.25 * C);
    const Eg = Math.floor((B - D) / 30.6001);
    const dayFrac = B - D - Math.floor(30.6001 * Eg) + f;
    const day = Math.floor(dayFrac);
    const month = Eg < 14 ? Eg - 1 : Eg - 13;
    const year = month > 2 ? C - 4716 : C - 4715;
    let hourFrac = (dayFrac - day) * 24;
    let hour = Math.floor(hourFrac);
    let minute = Math.round((hourFrac - hour) * 60);
    if (minute === 60) { minute = 0; hour += 1; }
    return { year, month, day, hour, minute, second: 0 };
  }

  // ── Solar return solver ────────────────────────────────────────────────────
  // The solar return is the exact moment the transiting Sun returns to the
  // ecliptic longitude it held at birth. We find the natal Sun longitude, then
  // bisect within a ~10-day window around the birthday in the target year until
  // the longitude difference crosses zero — accurate to well under an arcsecond.
  function angDiff(a, b) { return ((a - b) % 360 + 540) % 360 - 180; }

  function nextSolarReturn(by, bm, bd, bhh, bmm, fromDate) {
    const eph = E();
    if (!eph) return null;
    const jdNatal = eph.julianDay(by, bm, bd, bhh || 0, bmm || 0, 0);
    const natalSunLon = eph.sunPosition(jdNatal).lon;
    const sunLonAt = jd => eph.sunPosition(jd).lon;

    const now = fromDate || new Date();
    // Candidate year: this year's birthday; if already passed, next year.
    let year = now.getUTCFullYear();
    const birthdayThisYear = new Date(Date.UTC(year, bm - 1, bd));
    if (birthdayThisYear.getTime() < Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) {
      year += 1;
    }

    // Bracket a sign change of the longitude difference in a window around the
    // birthday. ±6 days comfortably contains the return for any natal date.
    let lo = eph.julianDay(year, bm, bd, 0, 0, 0) - 6;
    let hi = lo + 12;
    let dLo = angDiff(sunLonAt(lo), natalSunLon);
    let dHi = angDiff(sunLonAt(hi), natalSunLon);
    // If the window doesn't bracket (rare edge near 0/360 wrap), widen once.
    if (Math.sign(dLo) === Math.sign(dHi)) {
      lo -= 4; hi += 4;
      dLo = angDiff(sunLonAt(lo), natalSunLon);
    }
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2;
      const dMid = angDiff(sunLonAt(mid), natalSunLon);
      if (Math.sign(dMid) === Math.sign(dLo)) { lo = mid; dLo = dMid; }
      else { hi = mid; }
    }
    const jd = (lo + hi) / 2;
    const lon = sunLonAt(jd);
    return {
      jd,
      date: jdToUTCDate(jd),
      sunLon: lon,
      sign: eph.signOf(lon),
      degree: eph.degreeInSign(lon),
    };
  }

  window.AstroSeoTools = {
    localToUT,
    initCityAutocomplete,
    nextSolarReturn,
    jdToUTCDate,
  };
})();
