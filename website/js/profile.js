/**
 * AstroPrecise — Profile & Birth Chart Manager
 * Manages user profiles and birth chart data using localStorage.
 */

'use strict';

window.AstroProfile = (() => {

  const STORAGE_KEY_USER     = 'ap_user';
  const STORAGE_KEY_CHARTS   = 'ap_charts';
  const STORAGE_KEY_PREFS    = 'ap_prefs';
  const STORAGE_KEY_COMPARES = 'ap_comparisons';

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
    return getCharts().find(c => c.id === id) || null;
  }

  function saveChart(chartData) {
    const charts = getCharts();
    const existing = charts.findIndex(c => c.id === chartData.id);
    const now = Date.now();

    if (existing >= 0) {
      charts[existing] = { ...charts[existing], ...chartData, updatedAt: now };
    } else {
      charts.unshift({
        id:        crypto.randomUUID ? crypto.randomUUID() : now.toString(36),
        createdAt: now,
        updatedAt: now,
        engineV:   2,
        ...chartData,
      });
    }

    localStorage.setItem(STORAGE_KEY_CHARTS, JSON.stringify(charts));
    return charts[existing >= 0 ? existing : 0];
  }

  function deleteChart(id) {
    const charts = getCharts().filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEY_CHARTS, JSON.stringify(charts));
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
    const [y, m, d] = date.split('-').map(Number);
    const [hh, mm]  = (time || '12:00').split(':').map(Number);
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
      birthTime:   time || null,
      birthCity:   city,
      lat:         parseFloat(lat),
      lon:         parseFloat(lon),
      tz:          tz || '',
      houseSystem: houseSystem || 'placidus',
      jd:          raw.jd,
      positions:   raw.positions,
      ascendant:   raw.ascendant,
      mc:          raw.midheaven,
      houses:      raw.houses,
      aspects:     raw.aspects,
      sunSign:     E.signOf(raw.positions.sun.longitude),
      moonSign:    E.signOf(raw.positions.moon.longitude),
      risingSign:  E.signOf(raw.ascendant),
      engineV:     2,
    };
  }

  // One-time re-derivation after the 2026-06-12 ascendant fix: charts saved
  // before it carry the DESCENDANT as risingSign. Birth data is stored, so we
  // recompute quietly instead of asking anyone to re-enter anything.
  const ENGINE_V = 2;
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
      });
      if (rebuilt) {
        c.risingSign = rebuilt.risingSign;
        c.sunSign    = rebuilt.sunSign  || c.sunSign;
        c.moonSign   = rebuilt.moonSign || c.moonSign;
        if (c.ascendant != null) c.ascendant = rebuilt.ascendant;
        if (c.houses) c.houses = rebuilt.houses;
      }
      c.engineV = ENGINE_V;
      changed = true;
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
    a.click();
    URL.revokeObjectURL(url);
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

  function generateShareUrl(chartId) {
    const chart = getChart(chartId);
    if (!chart) return null;
    const params = new URLSearchParams({
      name: chart.name,
      date: chart.birthDate,
      time: chart.birthTime || '',
      lat:  chart.lat,
      lon:  chart.lon,
    });
    return `${location.origin}${location.pathname.replace(/[^/]*$/, '')}chart.html?${params}`;
  }

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

  // ── App sync (generate QR data string) ────────────────────────────────────
  function generateAppSyncData() {
    const user   = getUser();
    const charts = getCharts().slice(0, 5);
    return btoa(JSON.stringify({ user: user ? { name: user.name } : null, charts }));
  }

  return {
    getUser, saveUser, isLoggedIn, login, register, logout, updateProfile,
    getCharts, getChart, saveChart, deleteChart, buildChartData,
    getComparisons, saveComparison, deleteComparison,
    getPrefs, savePrefs,
    exportData, importData,
    generateShareUrl, loadChartFromUrl,
    generateAppSyncData,
  };
})();
