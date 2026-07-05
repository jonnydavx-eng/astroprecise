/**
 * Astro Precise — Local personal memory (privacy-first, device-only).
 * Remembers chart form drafts, birth-time accuracy, and daily preferences.
 */
'use strict';

window.APPersonalMemory = (function () {
  var DRAFT_KEY = 'ap_chart_draft_v1';
  var TIME_KEY = 'ap_time_accuracy';
  var SIGN_KEY = 'ap_last_horoscope_sign';

  function read(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
  }
  function write(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  function saveDraft(data) {
    if (!data) return;
    write(DRAFT_KEY, {
      name: data.name || '',
      date: data.date || '',
      time: data.time || '',
      city: data.city || '',
      lat: data.lat || '',
      lon: data.lon || '',
      tz: data.tz || '',
      savedAt: Date.now(),
    });
  }

  function loadDraft() {
    var d = read(DRAFT_KEY);
    if (!d || !d.savedAt) return null;
    if (Date.now() - d.savedAt > 30 * 86400000) return null;
    return d;
  }

  function clearDraft() {
    try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}
  }

  /** @param {'exact'|'approximate'|'unknown'} level */
  function setTimeAccuracy(level) {
    try { localStorage.setItem(TIME_KEY, level); } catch (e) {}
  }

  function getTimeAccuracy() {
    var v = localStorage.getItem(TIME_KEY);
    return v === 'exact' || v === 'approximate' || v === 'unknown' ? v : null;
  }

  function inferTimeAccuracy(hasTime, isApproximate) {
    if (!hasTime) return 'unknown';
    if (isApproximate) return 'approximate';
    return 'exact';
  }

  function accuracyMeta(level) {
    var map = {
      exact: {
        label: 'Birth time known',
        pct: 100,
        note: 'Houses, Ascendant, and Midheaven are calculated from your stated birth time and place.',
      },
      approximate: {
        label: 'Approximate time',
        pct: 72,
        note: 'Rising sign and house cusps may shift if the true time differs by more than ~30 minutes. Sun and Moon positions stay reliable.',
      },
      unknown: {
        label: 'Time unknown',
        pct: 48,
        note: 'We use noon at your birthplace as a neutral default. Planets stay accurate; houses and Rising are illustrative only.',
      },
    };
    return map[level] || map.unknown;
  }

  function renderTimeAccuracyGuide(container, opts) {
    if (!container) return;
    opts = opts || {};
    var level = opts.level || getTimeAccuracy() || inferTimeAccuracy(!!opts.hasTime, !!opts.approximate);
    var meta = accuracyMeta(level);
    container.innerHTML =
      '<div class="ap-time-accuracy ap-reveal-smooth" role="status">' +
        '<strong>' + meta.label + '</strong> — ' + meta.note +
        '<div class="ap-time-accuracy__meter ap-progress-meter" aria-hidden="true">' +
          '<div class="ap-progress-meter__track"><div class="ap-progress-meter__fill" style="width:' + meta.pct + '%"></div></div>' +
          '<span class="ap-progress-meter__label">Chart precision · ' + meta.pct + '%</span>' +
        '</div>' +
      '</div>';
    container.hidden = false;
  }

  function saveLastSign(sign) {
    if (!sign) return;
    try { localStorage.setItem(SIGN_KEY, sign); } catch (e) {}
  }

  function getLastSign() {
    return localStorage.getItem(SIGN_KEY) || null;
  }

  function applyDraftToForm(ids) {
    var d = loadDraft();
    if (!d) return false;
    ids = ids || {};
    var name = document.getElementById(ids.name || 'name-input');
    var date = document.getElementById(ids.date || 'date-input');
    var time = document.getElementById(ids.time || 'time-input');
    var city = document.getElementById(ids.city || 'city-input');
    var lat = document.getElementById(ids.lat || 'lat-input');
    var lon = document.getElementById(ids.lon || 'lon-input');
    var tz = document.getElementById(ids.tz || 'tz-input');
    if (name && d.name && !name.value) name.value = d.name;
    if (date && d.date && !date.value) date.value = d.date;
    if (time && d.time && !time.value) time.value = d.time;
    if (city && d.city && !city.value) city.value = d.city;
    if (lat && d.lat && !lat.value) lat.value = d.lat;
    if (lon && d.lon && !lon.value) lon.value = d.lon;
    if (tz && d.tz && !tz.value) tz.value = d.tz;
    return true;
  }

  function watchChartForm(formEl, ids) {
    if (!formEl) return;
    ids = ids || {};
    var timer;
    function snapshot() {
      saveDraft({
        name: (document.getElementById(ids.name || 'name-input') || {}).value,
        date: (document.getElementById(ids.date || 'date-input') || {}).value,
        time: (document.getElementById(ids.time || 'time-input') || {}).value,
        city: (document.getElementById(ids.city || 'city-input') || {}).value,
        lat: (document.getElementById(ids.lat || 'lat-input') || {}).value,
        lon: (document.getElementById(ids.lon || 'lon-input') || {}).value,
        tz: (document.getElementById(ids.tz || 'tz-input') || {}).value,
      });
      var timeVal = (document.getElementById(ids.time || 'time-input') || {}).value;
      setTimeAccuracy(inferTimeAccuracy(!!timeVal, false));
    }
    formEl.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(snapshot, 400);
    });
    formEl.addEventListener('change', snapshot);
  }

  return {
    saveDraft: saveDraft,
    loadDraft: loadDraft,
    clearDraft: clearDraft,
    setTimeAccuracy: setTimeAccuracy,
    getTimeAccuracy: getTimeAccuracy,
    inferTimeAccuracy: inferTimeAccuracy,
    accuracyMeta: accuracyMeta,
    renderTimeAccuracyGuide: renderTimeAccuracyGuide,
    saveLastSign: saveLastSign,
    getLastSign: getLastSign,
    applyDraftToForm: applyDraftToForm,
    watchChartForm: watchChartForm,
  };
})();