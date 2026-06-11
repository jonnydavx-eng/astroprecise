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

  // Build chart data from birth information
  function buildChartData(birthInfo) {
    const Eph = window.AstroEphemeris || window.Ephemeris;
    if (!Eph) return null;

    const { name, date, time, lat, lon, city, houseSystem } = birthInfo;
    const d    = new Date(`${date}T${time || '12:00'}:00`);
    const jd   = Eph.julianDay
      ? Eph.julianDay(d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes())
      : (window.Ephemeris ? window.Ephemeris.dateToJulian(d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes()) : 0);

    let positions, ascendant, houses, aspects;
    try {
      if (window.AstroEphemeris) {
        positions = window.AstroEphemeris.planetPositions(jd);
        ascendant = window.AstroEphemeris.ascendant(jd, parseFloat(lat), parseFloat(lon));
        houses    = window.AstroEphemeris.houseCusps(jd, parseFloat(lat), parseFloat(lon), houseSystem);
        aspects   = window.AstroEphemeris.aspects(positions);
      } else if (window.Ephemeris) {
        const E = window.Ephemeris;
        positions = E.getPlanetPositions(jd);
        ascendant = E.calcAscendant(jd, parseFloat(lat), parseFloat(lon));
        houses    = E.getHouseCusps(ascendant, houseSystem);
        aspects   = E.calcAspects(positions);
      }
    } catch (e) {
      console.error('Chart calculation error:', e);
    }

    return {
      name,
      birthDate:   date,
      birthTime:   time,
      birthCity:   city,
      lat:         parseFloat(lat),
      lon:         parseFloat(lon),
      houseSystem: houseSystem || 'Whole Sign',
      jd,
      positions,
      ascendant,
      houses,
      aspects,
    };
  }

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
