/**
 * Astro Precise — Profile & Birth Chart Manager
 * Manages user profiles and birth chart data using localStorage.
 */

'use strict';

window.AstroProfile = (() => {

  const STORAGE_KEY_USER     = 'ap_user';
  const STORAGE_KEY_CHARTS   = 'ap_charts';
  const STORAGE_KEY_PREFS    = 'ap_prefs';
  const STORAGE_KEY_COMPARES = 'ap_comparisons';
  const STORAGE_KEY_DASHBOARD = 'ap_profile_v2';
  const ENGINE_V = 3;

  // ── Default Preferences ──────────────────────────────────────────────────
  const DEFAULT_PREFS = {
    houseSystem:      'Whole Sign',
    displayDegrees:   true,
    showRetrograde:   true,
    theme:            'dark',
    language:         'en',
    dateFormat:       'MM/DD/YYYY',
    timeFormat:       '12h',
  };

  // ── User ──────────────────────────────────────────────────────────────────

  function getUser() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY_USER)); } catch { return null; }
  }

  function saveUser(user) {
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify({ ...user, updatedAt: Date.now() }));
    return user;
  }

  function isLoggedIn() { return !!getUser(); }

  function login(name, email, password) {
    // Simulate authentication with localStorage (no real auth)
    const existing = getUser();
    if (existing && existing.email === email) {
      // Simulate password check
      if (existing.passwordHash !== btoa(password)) return { success: false, error: 'Incorrect password.' };
      return { success: true, user: existing };
    }
    return { success: false, error: 'Account not found. Please create an account.' };
  }

  function register(name, email, password) {
    const existing = getUser();
    if (existing && existing.email === email) return { success: false, error: 'An account with this email already exists.' };
    const user = {
      id:           crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36),
      name,
      email,
      passwordHash: btoa(password),
      createdAt:    Date.now(),
      avatar:       name.charAt(0).toUpperCase(),
    };
    saveUser(user);
    return { success: true, user };
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY_USER);
  }

  function updateProfile(updates) {
    const user = getUser();
    if (!user) return null;
    return saveUser({ ...user, ...updates });
  }

  // ── Charts ────────────────────────────────────────────────────────────────

  function getCharts() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY_CHARTS)) || []; } catch { return []; }
  }

  function getChart(id) {
    return getCharts().find(c => String(c.id) === String(id)) || null;
  }

  /** Most recently saved chart, or the one marked active on chart.html / transits. */
  function getActiveChart() {
    const charts = getCharts();
    if (!charts.length) return null;
    try {
      const activeId = localStorage.getItem('ap_active_chart');
      if (activeId) {
        const found = charts.find(c => String(c.id) === String(activeId));
        if (found) return found;
        const byId = getChart(activeId);
        if (byId) return byId;
      }
    } catch (_) {}
    return charts[0];
  }

  function saveChart(chartData) {
    const charts = getCharts();
    const existing = charts.findIndex(c => String(c.id) === String(chartData.id));
    const now = Date.now();

    if (existing >= 0) {
      charts[existing] = { ...charts[existing], ...chartData, updatedAt: now };
    } else {
      charts.unshift({
        id:        crypto.randomUUID ? crypto.randomUUID() : now.toString(36),
        createdAt: now,
        updatedAt: now,
        engineV:   ENGINE_V,
        ...chartData,
      });
    }

    localStorage.setItem(STORAGE_KEY_CHARTS, JSON.stringify(charts));
    const saved = charts[existing >= 0 ? existing : 0];
    syncChartToDashboard(saved);
    return saved;
  }

  // Map an `ap_charts` row to the cosmic-dashboard (`ap_profile_v2`) shape.
  function chartToDashboardRow(c) {
    if (!c) return null;
    const timeKnown = c.timeKnown === true || !!((c.birthTime || c.time) && (c.birthTime || c.time) !== '12:00');
    return {
      id:      c.id,
      name:    c.name || 'Untitled Chart',
      date:    c.birthDate || c.date || '',
      time:    timeKnown ? (c.birthTime || c.time || '') : '',
      timeKnown,
      timeAccuracy: c.timeAccuracy || (timeKnown ? 'exact' : 'unknown'),
      timezoneKnown: c.timezoneKnown === true || isValidTimeZone(c.tz),
      city:    c.birthCity || c.city || '',
      lat:     c.lat,
      lon:     c.lon,
      tz:      c.tz || '',
      sun:     c.sunSign || c.sun || null,
      moon:    c.moonSign || c.moon || null,
      asc:     c.risingSign || c.asc || c.ascendant || null,
      savedAt: c.updatedAt || c.createdAt || c.savedAt || Date.now(),
    };
  }

  function isValidTimeZone(tz) {
    if (typeof tz !== 'string' || !tz.trim()) return false;
    try { new Intl.DateTimeFormat('en-US', { timeZone: tz }).format(); return true; }
    catch (e) { return false; }
  }

  // Keep profile.html's cosmic dashboard in sync when charts are saved from chart.html.
  function syncChartToDashboard(savedChart) {
    if (!savedChart) return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY_DASHBOARD);
      if (!raw) return null;
      const profile = JSON.parse(raw);
      if (!profile || typeof profile !== 'object') return null;
      const row = chartToDashboardRow(savedChart);
      if (!row || !row.date) return null;
      profile.charts = profile.charts || [];
      const idx = profile.charts.findIndex(c => String(c.id) === String(row.id));
      if (idx >= 0) profile.charts[idx] = { ...profile.charts[idx], ...row };
      else profile.charts.unshift(row);
      profile.updatedAt = Date.now();
      localStorage.setItem(STORAGE_KEY_DASHBOARD, JSON.stringify(profile));
      return profile;
    } catch { return null; }
  }

  function deleteChart(id) {
    const charts = getCharts().filter(c => String(c.id) !== String(id));
    localStorage.setItem(STORAGE_KEY_CHARTS, JSON.stringify(charts));
    try {
      const raw = localStorage.getItem(STORAGE_KEY_DASHBOARD);
      if (!raw) return;
      const profile = JSON.parse(raw);
      if (!profile || !Array.isArray(profile.charts)) return;
      profile.charts = profile.charts.filter(c => String(c.id) !== String(id));
      profile.updatedAt = Date.now();
      localStorage.setItem(STORAGE_KEY_DASHBOARD, JSON.stringify(profile));
    } catch { /* dashboard optional */ }
  }

  // ── Civil time → UT (historical tz rules via Intl, two-iteration) ────────
  function tzOffsetMin(zone, utcDate) {
    try {
      const p = {};
      new Intl.DateTimeFormat('en-GB', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
        .formatToParts(utcDate).forEach(x => { p[x.type] = x.value; });
      return (Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - utcDate.getTime()) / 60000;
    } catch (e) { return 0; }
  }
  function civilToUT(y, m, d, hh, mm, zone) {
    let u = new Date(Date.UTC(y, m - 1, d, hh, mm, 0));
    for (let i = 0; i < 2; i++) u = new Date(Date.UTC(y, m - 1, d, hh, mm, 0) - tzOffsetMin(zone, u) * 60000);
    return u;
  }

  // Build chart data from birth information.
  // Rewritten 2026-06-12: the old version called engine functions that never
  // existed (planetPositions/houseCusps/aspects, and ascendant with the wrong
  // signature), so its try/catch silently produced charts with no positions.
  function buildChartData(birthInfo) {
    const E = window.AstroEphemeris;
    if (!E || !E.calculateNatalChart) return null;
    const { name, date, time, lat, lon, city, tz, houseSystem } = birthInfo;
    if (!date || !isFinite(parseFloat(lat)) || !isFinite(parseFloat(lon))) return null;
    const timezoneKnown = birthInfo.timezoneKnown === true || isValidTimeZone(tz);
    if (!timezoneKnown) return null;
    const timeKnown = birthInfo.timeKnown != null ? birthInfo.timeKnown === true : !!time;
    const [y, m, d] = date.split('-').map(Number);
    const [hh, mm]  = (timeKnown ? time : '12:00').split(':').map(Number);
    let utY = y, utM = m, utD = d, utH = hh, utMin = mm;
    if (tz) {
      const u = civilToUT(y, m, d, hh, mm, tz);
      utY = u.getUTCFullYear(); utM = u.getUTCMonth() + 1; utD = u.getUTCDate();
      utH = u.getUTCHours(); utMin = u.getUTCMinutes();
    }
    let raw;
    try { raw = E.calculateNatalChart(utY, utM, utD, utH, utMin, parseFloat(lat), parseFloat(lon), houseSystem); }
    catch (e) { console.error('Chart calculation error:', e); return null; }
    return {
      name,
      birthDate:   date,
      birthTime:   timeKnown ? time : null,
      timeKnown,
      timeAccuracy: birthInfo.timeAccuracy || (timeKnown ? 'exact' : 'unknown'),
      timezoneKnown,
      birthCity:   city,
      lat:         parseFloat(lat),
      lon:         parseFloat(lon),
      tz:          tz || '',
      houseSystem: houseSystem || 'placidus',
      jd:          raw.jd,
      positions:   raw.positions,
      ascendant:   timeKnown ? raw.ascendant : null,
      mc:          timeKnown ? raw.midheaven : null,
      houses:      timeKnown ? raw.houses : null,
      aspects:     timeKnown ? raw.aspects : (raw.aspects || []).filter(a => !['asc', 'mc', 'ascendant', 'midheaven'].includes(String(a.planet1 || '').toLowerCase()) && !['asc', 'mc', 'ascendant', 'midheaven'].includes(String(a.planet2 || '').toLowerCase())),
      sunSign:     E.signOf(raw.positions.sun.longitude),
      moonSign:    E.signOf(raw.positions.moon.longitude),
      risingSign:  timeKnown ? E.signOf(raw.ascendant) : null,
      engineV:     ENGINE_V,
    };
  }

  // One-time re-derivation after the 2026-06-12 ascendant fix: charts saved
  // before it carry the DESCENDANT as risingSign. Birth data is stored, so we
  // recompute quietly instead of asking anyone to re-enter anything.
  function migrateCharts() {
    const E = window.AstroEphemeris;
    if (!E || !E.calculateNatalChart) { setTimeout(migrateCharts, 300); return; }
    const charts = getCharts();
    let changed = false;
    charts.forEach(c => {
      if (c.engineV >= ENGINE_V) return;
      const rebuilt = buildChartData({
        name: c.name, date: c.birthDate, time: c.birthTime,
        lat: c.lat, lon: c.lon, city: c.birthCity || c.city, tz: c.tz, houseSystem: c.houseSystem,
        timeKnown: c.timeKnown === true || !!(c.birthTime && c.birthTime !== '12:00'),
        timeAccuracy: c.timeAccuracy,
        timezoneKnown: isValidTimeZone(c.tz),
      });
      if (rebuilt) {
        c.risingSign = rebuilt.risingSign;
        c.sunSign    = rebuilt.sunSign  || c.sunSign;
        c.moonSign   = rebuilt.moonSign || c.moonSign;
        c.timeKnown = rebuilt.timeKnown;
        c.timeAccuracy = rebuilt.timeAccuracy;
        c.timezoneKnown = rebuilt.timezoneKnown;
        if (c.ascendant != null) c.ascendant = rebuilt.ascendant;
        if (c.houses) c.houses = rebuilt.houses;
      }
      if (rebuilt) {
        c.engineV = ENGINE_V;
        changed = true;
      }
    });
    if (changed) localStorage.setItem(STORAGE_KEY_CHARTS, JSON.stringify(charts));
  }
  migrateCharts();

  // ── Comparisons ───────────────────────────────────────────────────────────

  function getComparisons() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY_COMPARES)) || []; } catch { return []; }
  }

  function saveComparison(comp) {
    const list = getComparisons();
    list.unshift({ ...comp, id: Date.now().toString(36), savedAt: Date.now() });
    localStorage.setItem(STORAGE_KEY_COMPARES, JSON.stringify(list.slice(0, 20)));
  }

  function deleteComparison(id) {
    const list = getComparisons().filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEY_COMPARES, JSON.stringify(list));
  }

  // ── Preferences ───────────────────────────────────────────────────────────

  function getPrefs() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY_PREFS));
      return { ...DEFAULT_PREFS, ...stored };
    } catch { return { ...DEFAULT_PREFS }; }
  }

  function savePrefs(updates) {
    const prefs = { ...getPrefs(), ...updates };
    localStorage.setItem(STORAGE_KEY_PREFS, JSON.stringify(prefs));
    return prefs;
  }

  // ── Export / Import ───────────────────────────────────────────────────────

  function exportData() {
    const data = {
      user:        getUser(),
      charts:      getCharts(),
      comparisons: getComparisons(),
      prefs:       getPrefs(),
      exportedAt:  new Date().toISOString(),
      version:     '1.0',
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `astroprecise-backup-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function importData(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (data.user)        saveUser(data.user);
      if (data.charts)      localStorage.setItem(STORAGE_KEY_CHARTS,   JSON.stringify(data.charts));
      if (data.comparisons) localStorage.setItem(STORAGE_KEY_COMPARES, JSON.stringify(data.comparisons));
      if (data.prefs)       localStorage.setItem(STORAGE_KEY_PREFS,    JSON.stringify(data.prefs));
      return { success: true, chartsImported: (data.charts || []).length };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // ── Shareable URL ─────────────────────────────────────────────────────────
  //
  // generateShareUrl() was removed on 2026-08-09. It minted
  // 'chart.html?name=&date=&time=&lat=&lon=' — a saved chart's whole birth
  // record in a query string — and had no caller anywhere on the site: it was
  // exported and never used. A dead function that builds a birth-data URL is a
  // trap for the next person, so it is gone rather than left. The one supported
  // way to build a share link is APChartShare.buildShareUrl(), which runs only
  // when the visitor presses Share or Copy link.

  // Load chart data from URL params
  function loadChartFromUrl() {
    const params = new URLSearchParams(location.search);
    if (!params.get('date')) return null;
    return {
      name:      params.get('name') || 'Shared Chart',
      birthDate: params.get('date'),
      birthTime: params.get('time') || '12:00',
      lat:       parseFloat(params.get('lat')) || 0,
      lon:       parseFloat(params.get('lon')) || 0,
      city:      params.get('city') || '',
    };
  }

  const SAVE_POSITION_KEYS = [
    'Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn',
    'Uranus', 'Neptune', 'Pluto', 'Ascendant', 'Midheaven', 'NorthNode',
  ];

  const PACK_KEY_ALIASES = {
    sun: 'Sun', moon: 'Moon', mercury: 'Mercury', venus: 'Venus', mars: 'Mars',
    jupiter: 'Jupiter', saturn: 'Saturn', uranus: 'Uranus', neptune: 'Neptune',
    pluto: 'Pluto', asc: 'Ascendant', mc: 'Midheaven', northNode: 'NorthNode',
  };

  /** Slim positions blob for localStorage (ap-v608+). */
  function packPositionsForSave(positions) {
    if (!positions) return null;
    const out = {};
    function packOne(cap, p) {
      if (!p) return;
      const lon = p.lon != null ? p.lon : p.longitude;
      if (lon == null && !p.sign) return;
      out[cap] = {
        lon: lon != null ? lon : null,
        sign: p.sign || null,
        degree: p.degree != null ? p.degree : null,
        retrograde: !!p.retrograde,
      };
    }
    for (const cap of SAVE_POSITION_KEYS) {
      packOne(cap, positions[cap]);
    }
    for (const [low, cap] of Object.entries(PACK_KEY_ALIASES)) {
      if (out[cap]) continue;
      packOne(cap, positions[low]);
    }
    return Object.keys(out).length ? out : null;
  }

  /** Rebuild AI/shop chart object from a saved row without ephemeris. */
  function hydrateChartFromSaved(row) {
    if (!row) return null;
    const base = {
      name: row.name,
      birthDate: row.birthDate,
      birthTime: row.birthTime,
      birthCity: row.birthCity || row.city,
      city: row.city || row.birthCity,
      lat: row.lat,
      lon: row.lon,
      tz: row.tz,
      houseSystem: row.houseSystem,
      timeKnown: row.timeKnown === true || !!(row.birthTime && row.birthTime !== '12:00'),
      timeAccuracy: row.timeAccuracy || ((row.timeKnown === true || row.birthTime) ? 'exact' : 'unknown'),
      timezoneKnown: row.timezoneKnown === true || isValidTimeZone(row.tz),
      sunSign: row.sunSign,
      moonSign: row.moonSign,
      risingSign: row.risingSign,
      aspects: row.aspects || [],
    };
    base.positions = (row.positions && Object.keys(row.positions).length)
      ? { ...row.positions }
      : {};
    if (!base.timeKnown) {
      delete base.positions.Ascendant;
      delete base.positions.Midheaven;
      base.risingSign = null;
      base.aspects = base.aspects.filter(a => !['asc', 'mc', 'ascendant', 'midheaven'].includes(String(a.planet1 || '').toLowerCase()) && !['asc', 'mc', 'ascendant', 'midheaven'].includes(String(a.planet2 || '').toLowerCase()));
    }
    if (base.positions.Sun && !base.positions.Sun.sign && row.sunSign) {
      base.positions.Sun.sign = row.sunSign;
    }
    if (base.positions.Moon && !base.positions.Moon.sign && row.moonSign) {
      base.positions.Moon.sign = row.moonSign;
    }
    if (!base.positions.Sun && row.sunSign) {
      base.positions.Sun = { sign: row.sunSign };
    }
    if (!base.positions.Moon && row.moonSign) {
      base.positions.Moon = { sign: row.moonSign };
    }
    const hasPlacements = Object.keys(base.positions).length > 0
      || row.sunSign || row.moonSign || row.risingSign;
    if (!hasPlacements) return null;
    return base;
  }

  // ── App sync (generate QR data string) ────────────────────────────────────
  function generateAppSyncData() {
    const user   = getUser();
    const charts = getCharts().slice(0, 5);
    return btoa(JSON.stringify({ user: user ? { name: user.name } : null, charts }));
  }

  return {
    engineVersion: ENGINE_V,
    getUser, saveUser, isLoggedIn, login, register, logout, updateProfile,
    getCharts, getChart, getActiveChart, saveChart, deleteChart, buildChartData,
    packPositionsForSave, hydrateChartFromSaved,
    chartToDashboardRow, syncChartToDashboard,
    getComparisons, saveComparison, deleteComparison,
    getPrefs, savePrefs,
    exportData, importData,
    loadChartFromUrl,
    generateAppSyncData,
  };
})();
