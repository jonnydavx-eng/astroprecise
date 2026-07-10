/**
 * Astro Precise — Birth Chart Page Controller
 * Wires the chart form to the ephemeris engine, renders results, and adds
 * city autocomplete, timezone-correct UT conversion, shareable links, a
 * downloadable natal poster, and a premium Big Three share card.
 *
 * Requires: ephemeris.js, chart-render.js, ap-load-interpretations.js, profile.js, app.js
 */

(function () {
  'use strict';

  if (!document.getElementById('chart-form')) return;

  const E = () => window.AstroEphemeris;

  // ── Glyph / display maps ──────────────────────────────────────────────────


  const PLANET_GLYPHS = {
    Sun:'☉︎', Moon:'☽︎', Mercury:'☿︎', Venus:'♀︎', Mars:'♂︎', Jupiter:'♃︎',
    Saturn:'♄︎', Uranus:'♅︎', Neptune:'♆︎', Pluto:'♇︎', Chiron:'⚷︎', Lilith:'⚸︎',
    NorthNode:'☊︎', SouthNode:'☋︎', Ascendant:'AC', Midheaven:'MC',
  };
  const ASPECT_DISPLAY = {
    conjunction:    { name:'Conjunction',    glyph:'☌', color:'#e8c96a' },
    opposition:     { name:'Opposition',     glyph:'☍', color:'#b04a52' },
    trine:          { name:'Trine',          glyph:'△', color:'#3fae7a' },
    square:         { name:'Square',         glyph:'□', color:'#b04a52' },
    sextile:        { name:'Sextile',        glyph:'⚹', color:'#9db36a' },
    quincunx:       { name:'Quincunx',       glyph:'⚻', color:'#7E7565' },
    semisquare:     { name:'SemiSquare',     glyph:'∠', color:'#7E7565' },
    sesquiquadrate: { name:'Sesquiquadrate', glyph:'⚼', color:'#7E7565' },
    semisextile:    { name:'Semisextile',    glyph:'⚺', color:'#7E7565' },
    quintile:       { name:'Quintile',       glyph:'Q', color:'#7E7565' },
  };
  const HOUSE_THEMES = [
    'Self & Identity', 'Money & Values', 'Mind & Communication', 'Home & Roots',
    'Creativity & Joy', 'Work & Health', 'Partnership', 'Transformation',
    'Philosophy & Travel', 'Career & Calling', 'Community & Hopes', 'The Unconscious',
  ];

  // Element mapping
  const ELEMENT_MAP = {
    Aries:'fire',       Leo:'fire',    Sagittarius:'fire',
    Taurus:'earth',     Virgo:'earth', Capricorn:'earth',
    Gemini:'air',       Libra:'air',   Aquarius:'air',
    Cancer:'water',     Scorpio:'water', Pisces:'water',
  };
  const ELEMENT_COLORS = {
    fire:  '#D85A2C',
    earth: '#5E7A3A',
    air:   '#A78BBA',
    water: '#3F7D76',
  };
  const ELEMENT_LABEL_COLORS = {
    fire:  '#F0A878',
    earth: '#A8C07A',
    air:   '#C6AEDA',
    water: '#7FB8B0',
  };
  // Modality mapping
  const MODALITY_MAP = {
    Aries:'cardinal', Cancer:'cardinal', Libra:'cardinal', Capricorn:'cardinal',
    Taurus:'fixed',   Leo:'fixed',   Scorpio:'fixed',  Aquarius:'fixed',
    Gemini:'mutable', Virgo:'mutable', Sagittarius:'mutable', Pisces:'mutable',
  };
  // Ruling planets per sign
  const SIGN_RULERS = {
    Aries:'Mars', Taurus:'Venus', Gemini:'Mercury', Cancer:'Moon',
    Leo:'Sun', Virgo:'Mercury', Libra:'Venus', Scorpio:'Mars',
    Sagittarius:'Jupiter', Capricorn:'Saturn', Aquarius:'Saturn', Pisces:'Jupiter',
  };

  let currentChart = null;

  // First name for personalised copy. Strips the demo "Sample:" label and any
  // stray trailing punctuation so "Sample: Frida Kahlo" → "Frida" (not "Sample:").
  function firstNameOf(name) {
    if (!name) return '';
    const cleaned = String(name).replace(/^\s*sample:\s*/i, '').trim();
    const tok = (cleaned || '').split(/\s+/)[0] || '';
    return tok.replace(/[:.,;]+$/, '');
  }

  // ── City autocomplete ─────────────────────────────────────────────────────

  const cityInput = document.getElementById('city-input');
  const dropdown  = document.getElementById('city-autocomplete');
  const latInput  = document.getElementById('lat-input');
  const lonInput  = document.getElementById('lon-input');
  const tzInput   = document.getElementById('tz-input');
  let activeIdx   = -1;

  const esc = (window.AP_SAFE && window.AP_SAFE.esc)
    ? s => window.AP_SAFE.esc(s)
    : s => String(s == null ? '' : s).replace(/[&<>"']/g,
      ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));

  const regionOf = c => c.admin ? `${c.admin}, ${c.country}` : c.country;

  function renderDropdown(items, source, state) {
    if (!dropdown) return;
    activeIdx = -1;
    dropdown._items = items;
    if (state === 'searching') {
      dropdown.innerHTML = '<div class="autocomplete-note">Searching the gazetteer…</div>';
      dropdown.hidden = false;
      return;
    }
    if (!items.length) {
      if (state === 'empty') {
        dropdown.innerHTML = '<div class="autocomplete-note">No places matched — check the spelling, or try the nearest larger town.</div>';
        dropdown.hidden = false;
      } else {
        dropdown.innerHTML = '';
        dropdown.hidden = true;
      }
      return;
    }
    const note = source === 'offline'
      ? '<div class="autocomplete-note">Offline — built-in city list only</div>' : '';
    dropdown.innerHTML = items.map((c, i) =>
      `<div class="autocomplete-option" role="option" data-i="${i}" id="city-opt-${i}">
        <span aria-hidden="true"><svg class="eng-i" aria-hidden="true"><use href="#ei-pin"/></svg></span> <strong>${esc(c.name)}</strong>&nbsp;<span style="opacity:0.6">${esc(regionOf(c))}</span>
      </div>`).join('') + note;
    dropdown.hidden = false;
    dropdown.querySelectorAll('.autocomplete-option').forEach(elx => {
      elx.addEventListener('mousedown', ev => { ev.preventDefault(); pickCity(items[+elx.dataset.i]); });
    });
  }

  function pickCity(c) {
    cityInput.value = c.admin ? `${c.name}, ${c.admin}, ${c.country}` : `${c.name}, ${c.country}`;
    latInput.value  = c.lat;
    lonInput.value  = c.lon;
    tzInput.value   = c.tz || '';
    dropdown.innerHTML = '';
    dropdown.hidden = true;
    document.dispatchEvent(new CustomEvent('astro:city-selected'));
  }

  if (cityInput && dropdown) {
    let searchSeq = 0;
    const runSearch = window.AstroApp.debounce(q => {
      const mySeq = ++searchSeq;
      window.AstroApp.searchPlaces(q).then(({ results, source }) => {
        if (mySeq !== searchSeq) return;
        renderDropdown(results, source, results.length ? 'results' : 'empty');
      });
    }, 250);
    cityInput.addEventListener('input', () => {
      latInput.value = ''; lonInput.value = ''; tzInput.value = '';
      const q = cityInput.value.trim();
      if (q.length < 2) { searchSeq++; renderDropdown([], 'live', 'idle'); return; }
      renderDropdown([], 'live', 'searching');
      runSearch(q);
    });
    cityInput.addEventListener('keydown', ev => {
      const items = dropdown._items || [];
      if (!items.length) return;
      if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
        ev.preventDefault();
        activeIdx = (activeIdx + (ev.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length;
        dropdown.querySelectorAll('.autocomplete-option').forEach((elx, i) =>
          elx.classList.toggle('is-selected', i === activeIdx));
      } else if (ev.key === 'Enter' && activeIdx >= 0) {
        ev.preventDefault();
        pickCity(items[activeIdx]);
      } else if (ev.key === 'Escape') {
        dropdown.innerHTML = ''; dropdown.hidden = true;
      }
    });
    cityInput.addEventListener('blur', () => setTimeout(() => {
      dropdown.innerHTML = ''; dropdown.hidden = true;
    }, 150));
  }

  // ── Timezone: local birth time → Universal Time ──────────────────────────

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

  // ── Chart adaptation ──────────────────────────────────────────────────────

  const KEY_MAP = {
    sun:'Sun', moon:'Moon', mercury:'Mercury', venus:'Venus', mars:'Mars',
    jupiter:'Jupiter', saturn:'Saturn', uranus:'Uranus', neptune:'Neptune',
    pluto:'Pluto', chiron:'Chiron', lilith:'Lilith',
    northNode:'NorthNode', southNode:'SouthNode',
    asc:'Ascendant', mc:'Midheaven',
  };

  function houseOf(lon, houses) {
    for (let i = 0; i < 12; i++) {
      const a = houses[i], b = houses[(i + 1) % 12];
      const span = ((b - a) % 360 + 360) % 360 || 30;
      const off  = ((lon - a) % 360 + 360) % 360;
      if (off < span) return i + 1;
    }
    return 1;
  }

  function adaptChart(raw, meta) {
    const positions = {};
    const planetHouses = {};
    for (const [k, cap] of Object.entries(KEY_MAP)) {
      const p = raw.positions[k];
      if (!p) continue;
      positions[cap] = { lon: p.longitude, sign: p.sign, degree: p.degree, retrograde: p.retrograde };
      if (!['Ascendant', 'Midheaven'].includes(cap)) {
        planetHouses[cap] = houseOf(p.longitude, raw.houses);
      }
    }
    positions.NNode = positions.NorthNode;
    positions.MC    = positions.Midheaven;

    const capAspect = s => {
      const d = ASPECT_DISPLAY[s];
      return d ? d.name : s.charAt(0).toUpperCase() + s.slice(1);
    };
    const MAJOR = ['conjunction', 'opposition', 'trine', 'square', 'sextile'];
    const renderAspects = raw.aspects
      .filter(a => KEY_MAP[a.planet1] && KEY_MAP[a.planet2] && MAJOR.includes(a.aspect))
      .map(a => ({ planet1: KEY_MAP[a.planet1], planet2: KEY_MAP[a.planet2], aspect: capAspect(a.aspect), orb: a.orb, applying: a.applying }));
    const interpAspects = raw.aspects
      .filter(a => KEY_MAP[a.planet1] && KEY_MAP[a.planet2])
      .map(a => ({ planet1: KEY_MAP[a.planet1], planet2: KEY_MAP[a.planet2], aspect: a.aspect, orb: a.orb, applying: a.applying }));

    return {
      ...meta,
      positions,
      houses: raw.houses,
      renderAspects,
      aspects: interpAspects,
      planetHouses,
      asc: raw.ascendant,
      mc: raw.midheaven,
      risingSign: E().signOf(raw.ascendant),
      chartRuler: raw.chartRuler,
      dominant: { element: raw.dominantElement, modality: raw.dominantModality },
      dominantElement: raw.dominantElement,
      dominantModality: raw.dominantModality,
      jd: raw.jd,
    };
  }

  // ── Form handling ─────────────────────────────────────────────────────────

  const form = document.getElementById('chart-form');

  const FOCUS_GROUPS = {
    'name-input': 'group-name',
    'date-input': 'group-date-first',
    'city-input': 'group-city',
  };

  function clearFormErrors() {
    document.querySelectorAll('.form-group.is-error').forEach(function (g) {
      g.classList.remove('is-error');
    });
  }

  function showFormError(focusId, message) {
    clearFormErrors();
    const group = document.getElementById(FOCUS_GROUPS[focusId] || '');
    if (group) {
      group.classList.add('is-error');
      const msg = group.querySelector('.form-error-msg');
      if (msg && message) msg.textContent = message;
    }
    const el = document.getElementById(focusId);
    if (el) {
      el.focus();
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function readForm() {
    const name = document.getElementById('name-input').value.trim() || 'Birth Chart';
    const date = document.getElementById('date-input').value;
    const time = document.getElementById('time-input').value || '12:00';
    const lat  = parseFloat(latInput.value);
    const lon  = parseFloat(lonInput.value);
    const tz   = tzInput.value;
    // Name is optional label — defaults to "Birth Chart" for exports
    if (!date) return { error: 'Please enter your birth date.', focus: 'date-input' };
    if (isNaN(lat) || isNaN(lon)) return { error: 'Please pick your birth city from the dropdown.', focus: 'city-input' };
    const [y, m, d]  = date.split('-').map(Number);
    const [hh, mm]   = time.split(':').map(Number);
    // Guard against malformed date/time (e.g. a hand-edited share URL): NaN
    // doesn't throw, it would silently render a chart full of NaN°.
    // Real month-length validation (leap-aware) so an impossible date like
    // Feb 30 or Apr 31 is rejected, not silently rolled into a WRONG chart by
    // the raw Julian-day arithmetic. m is range-checked before indexing.
    const daysInMonth = (yy, mo) => [31, (yy % 4 === 0 && (yy % 100 !== 0 || yy % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mo - 1];
    if (![y, m, d, hh, mm].every(Number.isFinite) ||
        m < 1 || m > 12 || d < 1 || d > daysInMonth(y, m) || hh > 23 || mm > 59) {
      return { error: 'That birth date or time looks malformed.', focus: 'date-input' };
    }
    return {
      name, y, m, d, hh, mm, lat, lon, tz,
      city: cityInput.value,
      timeKnown: !!document.getElementById('time-input').value,
      houseSystem: document.getElementById('house-system').value,
      nodeMode: getNodeMode(),
    };
  }

  // ── Lunar-node model toggle (Mean default · True optional), persisted ──────
  // Honest default: the Mean node is the smoothly-moving classical point; the
  // True (osculating) node wobbles ±~1.5° around it. The choice is remembered
  // in localStorage so it survives reloads and shared-link re-runs.
  const NODE_MODE_KEY = 'ap_node_mode';
  function getNodeMode() {
    try {
      const v = localStorage.getItem(NODE_MODE_KEY);
      return v === 'true' ? 'true' : 'mean';
    } catch (e) { return 'mean'; }
  }
  function setNodeMode(mode) {
    const m = mode === 'true' ? 'true' : 'mean';
    try { localStorage.setItem(NODE_MODE_KEY, m); } catch (e) {}
    return m;
  }
  // Reflect the persisted choice onto the toggle control + recompute if a chart
  // is already on screen, so flipping it is immediate and honest.
  function initNodeToggle() {
    const radios = document.querySelectorAll('input[name="node-mode"]');
    if (!radios.length) return;
    const current = getNodeMode();
    radios.forEach(r => {
      r.checked = (r.value === current);
      r.addEventListener('change', () => {
        if (!r.checked) return;
        setNodeMode(r.value);
        // Live re-run: only if we already have a valid chart on screen.
        if (currentChart) form.requestSubmit();
      });
    });
  }

  function calculate(input) {
    const ut = localToUT(input.y, input.m, input.d, input.hh, input.mm, input.tz);
    const raw = E().calculateNatalChart(ut.y, ut.m, ut.d, ut.hh, ut.mm, input.lat, input.lon, input.houseSystem, input.nodeMode);
    return adaptChart(raw, {
      nodeMode: raw.nodeMode,
      houseSystem: input.houseSystem,
      name: input.name,
      birthDate: `${input.y}-${String(input.m).padStart(2,'0')}-${String(input.d).padStart(2,'0')}`,
      birthTime: input.timeKnown ? `${String(input.hh).padStart(2,'0')}:${String(input.mm).padStart(2,'0')}` : null,
      city: input.city, lat: input.lat, lon: input.lon, tz: input.tz,
    });
  }

  form.addEventListener('submit', ev => {
    ev.preventDefault();
    const input = readForm();
    if (input.error) {
      showFormError(input.focus, input.error);
      resetCalcBtn();
      return;
    }
    clearFormErrors();
    setTimeout(async () => {
      try {
        if (typeof window.loadInterpretations === 'function') {
          await window.loadInterpretations();
        }
        currentChart = calculate(input);
        if (window.APCanvasSeals && !window._apSealsPreloaded) {
          window._apSealsPreloaded = true;
          var sealSigns = (window.AP_ZODIAC && AP_ZODIAC.SIGN_ORDER) || [];
          window.APCanvasSeals.preload(sealSigns);
        }
        renderResults(currentChart);
        updateShareURL(input);
        // Pin this sky onto the home orrery (Celestia's payoff, ported):
        // the hero instrument stops being "the sky today" and becomes yours.
        try {
          const pts = {
            sun:  currentChart.positions.Sun?.lon,
            moon: currentChart.positions.Moon?.lon,
          };
          if (input.timeKnown) pts.asc = currentChart.positions.Ascendant?.lon;
          localStorage.setItem('ap_natal_pins', JSON.stringify({
            name: firstNameOf(input.name) || input.name,
            sunSign: currentChart.positions.Sun?.sign,
            points: pts,
            savedAt: Date.now(),
          }));
          var isSample = /^sample:/i.test(input.name || '');
          if (window.AstroApp && !isSample) {
            AstroApp.showToast('Pinned to the heavens',
              'Your Sun, Moon' + (input.timeKnown ? ' & Ascendant' : '') + ' now mark the home orrery’s zodiac ring.', 'success');
          }
        } catch (e) {}
      } catch (err) {
        if (window.AstroApp) AstroApp.showToast('Calculation failed', String(err.message || err), 'error');
      }
      resetCalcBtn();
    }, 400);
  });

  function resetCalcBtn() {
    const btn = document.getElementById('calculate-btn');
    if (btn) { btn.classList.remove('is-loading'); btn.disabled = false; }
  }

  function openOptionalName() {
    const wrap = document.getElementById('group-name-wrap');
    if (wrap) wrap.open = true;
  }

  // Sample chart — Frida Kahlo
  document.getElementById('sample-btn')?.addEventListener('click', () => {
    document.getElementById('name-input').value = 'Sample: Frida Kahlo';
    openOptionalName();
    document.getElementById('date-input').value = '1907-07-06';
    document.getElementById('time-input').value = '08:30';
    const mex = E().CITIES.find(c => c.name === 'Mexico City');
    if (mex) pickCity(mex);
    ['name-input', 'date-input', 'time-input'].forEach(id =>
      document.getElementById(id).dispatchEvent(new Event('input')));
    form.requestSubmit();
  });

  // ── Spacetime summary + geolocation (ported from the Celestia prototype) ──

  const stSum = document.getElementById('spacetime-summary');
  const stTxt = document.getElementById('spacetime-summary-txt');
  function updateSpacetime() {
    if (!stSum) return;
    const lat = parseFloat(latInput.value), lon = parseFloat(lonInput.value);
    const date = document.getElementById('date-input').value;
    if (isNaN(lat) || isNaN(lon) || !date) { stSum.hidden = true; return; }
    const [y, m, d] = date.split('-').map(Number);
    const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const time = document.getElementById('time-input').value;
    let s = `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(2)}°${lon >= 0 ? 'E' : 'W'} · ${d} ${MON[m - 1]} ${y}`;
    if (time) s += ` · ${time}`;
    if (tzInput.value) s += ` (${tzInput.value})`;
    else if (time) s += ' (local solar time approximation)';
    stTxt.textContent = s;
    stSum.hidden = false;
  }
  ['date-input', 'time-input'].forEach(id =>
    document.getElementById(id)?.addEventListener('input', updateSpacetime));
  document.addEventListener('astro:city-selected', updateSpacetime);

  document.getElementById('geo-btn')?.addEventListener('click', () => {
    if (!navigator.geolocation) {
      window.AstroApp?.showToast('Unavailable', 'Geolocation is not supported in this browser.', 'warning');
      return;
    }
    navigator.geolocation.getCurrentPosition(async pos => {
      latInput.value = pos.coords.latitude.toFixed(4);
      lonInput.value = pos.coords.longitude.toFixed(4);
      cityInput.value = 'My current location';
      try {
        const ctl = new AbortController();
        const timer = setTimeout(() => ctl.abort(), 6000);
        const r2 = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latInput.value}&longitude=${lonInput.value}&timezone=auto&forecast_days=1`, { signal: ctl.signal });
        clearTimeout(timer);
        if (r2.ok) {
          const j = await r2.json();
          if (j.timezone) tzInput.value = j.timezone;
        }
      } catch (e) { /* timezone lookup failed — leave tz blank, never fake it */ }
      document.dispatchEvent(new CustomEvent('astro:city-selected'));
      window.AstroApp?.showToast('Location set', 'Using your current position — fine for "born near where you live now".', 'success');
    }, () => window.AstroApp?.showToast('Declined', 'Location permission declined — search by name instead.', 'warning'));
  });

  // ── Shareable URL state ───────────────────────────────────────────────────

  function updateShareURL(input) {
    const q = new URLSearchParams({
      n: input.name, d: `${input.y}-${input.m}-${input.d}`,
      t: input.timeKnown ? `${input.hh}:${input.mm}` : '',
      c: input.city, lat: input.lat, lon: input.lon, tz: input.tz,
    });
    history.replaceState(null, '', '?' + q.toString());
  }

  function restoreFromURL() {
    const q = new URLSearchParams(location.search);
    if (!q.get('d') || !q.get('lat')) return;
    document.getElementById('name-input').value = q.get('n') || 'Shared Chart';
    openOptionalName();
    const [y, m, d] = q.get('d').split('-').map(Number);
    document.getElementById('date-input').value =
      `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    if (q.get('t')) {
      const [hh, mm] = q.get('t').split(':').map(Number);
      document.getElementById('time-input').value =
        `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
    }
    cityInput.value = q.get('c') || '';
    latInput.value  = q.get('lat'); lonInput.value = q.get('lon'); tzInput.value = q.get('tz') || '';
    var hs = q.get('hs');
    if (hs) {
      var houseInput = document.getElementById('house-system');
      if (houseInput) houseInput.value = hs;
      document.querySelectorAll('.house-card').forEach(function (card) {
        var on = card.dataset.value === hs;
        card.classList.toggle('active', on);
        card.setAttribute('aria-checked', on ? 'true' : 'false');
      });
    }
    document.dispatchEvent(new CustomEvent('astro:city-selected'));
    ['name-input', 'date-input', 'time-input'].forEach(id =>
      document.getElementById(id).dispatchEvent(new Event('input')));
    form.requestSubmit();
  }

  /* Lightweight handoff from the homepage quick-cast form (chart.html?date=
     YYYY-MM-DD): pre-fill ONLY the birth date so a first-timer continues their
     "3 easy steps" — they entered the date on the home, it's already here, and
     they just add time + place. Distinct from restoreFromURL(), which restores
     a complete shared chart (?d=&lat=...). */
  function prefillDateFromURL() {
    try {
      const d = new URLSearchParams(location.search).get('date');
      if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return;
      const el = document.getElementById('date-input');
      if (!el || el.value) return;
      el.value = d;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      const dateGroup = document.getElementById('group-date-first');
      if (dateGroup) dateGroup.classList.add('is-valid');

      // Honour the homepage promise ("time and place sharpen it on the next
      // step"): acknowledge the carried-over date inline, bring the form into
      // view, and move focus to the next thing the visitor actually needs — the
      // birth place (or time, if a place is already set). No silent handoff.
      const wrap = document.getElementById('chart-form-wrapper');
      if (wrap && !document.getElementById('chart-handoff-note')) {
        const note = document.createElement('p');
        note.id = 'chart-handoff-note';
        note.className = 'chart-handoff-note';
        note.setAttribute('role', 'status');
        note.innerHTML = '<span class="chart-handoff-note__mark" aria-hidden="true">✦</span> ' +
          'Your birth date carried over from the homepage — add your birth place and time below to sharpen the chart.';
        const header = wrap.querySelector('.form-glass__header');
        if (header && header.parentNode) header.parentNode.insertBefore(note, header.nextSibling);
        else wrap.insertBefore(note, wrap.firstChild);
      }

      const form = document.getElementById('chart-form');
      if (form && typeof form.scrollIntoView === 'function') {
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      const cityEl = document.getElementById('city-input');
      const nextField = (cityEl && !cityEl.value) ? cityEl : document.getElementById('time-input');
      if (nextField) {
        // Focus after the smooth scroll settles; preventScroll so we don't fight it.
        setTimeout(function () {
          try { nextField.focus({ preventScroll: true }); } catch (e) { nextField.focus(); }
        }, 360);
      }
    } catch (e) {}
  }

  // ── Results rendering ─────────────────────────────────────────────────────

  function fmtDeg(p) {
    const dg = Math.floor(p.degree);
    const mn = Math.round((p.degree - dg) * 60);
    return `${dg}°${String(mn).padStart(2, '0')}′`;
  }

  function renderResults(chart) {
    const wrapEl = document.getElementById('chart-result');
    if (!wrapEl) return;
    // Defense-in-depth: never render a chart whose core points failed to
    // compute (would otherwise throw on chart.positions.Sun.sign below).
    if (!chart || !chart.positions || !chart.positions.Sun || !chart.positions.Moon) {
      if (window.AstroApp) AstroApp.showToast('Calculation failed',
        'Could not compute this chart — please check the birth details.', 'error');
      return;
    }
    /* Chart deferred CSS idle-loads on pointerdown — results need tabs, wheel,
       and reading styles immediately after calculate (no scroll required). */
    if (typeof window.ensureChartResultsCss === 'function') {
      window.ensureChartResultsCss();
    }
    wrapEl.classList.remove('hidden');

    var tabsHint = document.getElementById('chart-tabs-hint');
    if (!tabsHint) {
      tabsHint = document.createElement('p');
      tabsHint.id = 'chart-tabs-hint';
      tabsHint.className = 'chart-tabs-hint';
      tabsHint.textContent = 'Explore Overview, Planets, Houses, and Aspects — each tab opens a different layer of your chart.';
      var tabsHost = wrapEl.querySelector('.tabs-card, .chart-tabs');
      if (tabsHost && tabsHost.parentNode) {
        tabsHost.parentNode.insertBefore(tabsHint, tabsHost);
      } else {
        wrapEl.insertBefore(tabsHint, wrapEl.firstChild.nextSibling);
      }
    }
    tabsHint.removeAttribute('hidden');

    const resultNameEl = document.getElementById('result-name');
    if (resultNameEl) {
      // The hero name stands alone (big Cormorant) — "— Natal Chart" was
      // redundant and wrapped awkwardly on the em-dash at mobile widths.
      resultNameEl.textContent = chart.name;
      resultNameEl.removeAttribute('aria-hidden');
    }
    document.getElementById('result-date').textContent =
      `${chart.birthDate}${chart.birthTime ? ' at ' + chart.birthTime : ' (time unknown — houses approximate)'} · ${chart.city}`;

    renderBigThree(chart);
    renderWheel(chart);
    renderTabs(chart);
    initTabs();
    renderWhatsNext(chart);
    renderDeepTeaser(chart);
    initWallpaperLead(chart);
    initEmailCapture(chart);
    updateKeepsakeBand(chart);
    loadEngineSkyPlate(function () { updateKeepsakeBand(chart); }, chart);

    if (window.APChartShare) APChartShare.updateShareStrip(chart, null);
    mountChartAI(chart);

    wrapEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        var firstTab = wrapEl.querySelector('[role="tab"]');
        if (firstTab && typeof firstTab.focus === 'function') {
          try { firstTab.focus({ preventScroll: true }); } catch (e) { firstTab.focus(); }
        }
      });
    });
  }

  function bundleUpsellProduct() {
    const products = (window.AP_MON && window.AP_MON.commerce && window.AP_MON.commerce.products) || [];
    const bundle = products.find(p => p.id === 'reading-poster-bundle');
    if (!bundle || bundle.available === false) return null;
    const url = typeof bundle.fulfilUrl === 'string' ? bundle.fulfilUrl.trim() : '';
    return /^https?:\/\//i.test(url) ? bundle : null;
  }

  function renderWhatsNext(chart) {
    const host = document.getElementById('chart-whats-next');
    if (!host || !chart) { if (host) host.hidden = true; return; }

    const sunSign = chart.positions && chart.positions.Sun && chart.positions.Sun.sign;
    const riseSign = chart.risingSign;
    const name = firstNameOf(chart.name) || 'your';
    const bundle = bundleUpsellProduct();

    // Site spine after cast: Sky → Keep → Daily → Reading (Match/Transits secondary)
    const steps = [
      {
        tag: '02 · Sky',
        title: "Tonight's living sky",
        desc: 'Same engine as this chart — Moon, planets, and mood computed live on your device.',
        href: 'ephemeris.html',
        cta: 'Open Sky →',
      },
      {
        tag: '03 · Keep',
        title: 'Freeze this sky as a Moment',
        desc: `Turn ${name === 'your' ? 'your' : name + '’s'} birth sky into a free share card — zenith star, light-cone, private on your device.`,
        href: 'moment.html',
        cta: 'Open Moment →',
      },
      {
        tag: '04 · Daily',
        title: "Today against your chart",
        desc: sunSign
          ? `Daily sky for your ${sunSign} placements — not a generic twelfth of the world.`
          : 'Come back daily; the sky keeps touching the chart you just cast.',
        href: 'horoscope.html',
        cta: 'Open Daily →',
      },
      {
        tag: '05 · Reading',
        title: 'Your cosmic story (free sample)',
        desc: `${name === 'your' ? 'Your' : name + '’s'} chart retold as prose — then Shop when you want the Deep Reading PDF.`,
        href: 'cosmic-story.html',
        cta: 'Read free sample →',
      },
    ];

    const more = [
      {
        tag: 'More',
        title: 'Transits',
        desc: 'How today’s planets aspect this chart.',
        href: 'transits.html',
        cta: 'Transits →',
      },
      {
        tag: 'More',
        title: 'Two charts',
        desc: 'Synastry with a partner — aspects, not a fake %.',
        href: 'compatibility.html',
        cta: 'Match →',
      },
    ];

    const paidTile = bundle ? {
      tag: 'Paid',
      title: 'Deep Reading + Poster',
      desc: `Long-form reading and print-at-home poster from ${name}'s chart.`,
      href: bundle.fulfilUrl,
      cta: 'Get the bundle →',
      external: true,
    } : {
      tag: 'Shop',
      title: 'Deep Reading when ready',
      desc: 'Paid PDF keepsakes from this chart — checkout opening soon.',
      href: 'shop.html#deep-reading',
      cta: 'Open Shop →',
    };

    host.innerHTML = `
      <div class="chart-whats-next__head">
        <p class="chart-whats-next__eyebrow">Your path · Cast → Sky → Keep → Daily → Reading</p>
        <h3 class="chart-whats-next__title">Chart cast — next steps in order</h3>
        <p class="chart-whats-next__sub">One spine, free first. Everything still runs in your browser.</p>
      </div>
      <div class="chart-whats-next__grid" role="list">
        ${steps.map(s => `
          <a href="${esc(s.href)}" class="chart-next-card" role="listitem">
            <span class="chart-next-card__tag">${esc(s.tag)}</span>
            <h4 class="chart-next-card__title">${esc(s.title)}</h4>
            <p class="chart-next-card__desc">${esc(s.desc)}</p>
            <span class="chart-next-card__cta">${esc(s.cta)}</span>
          </a>`).join('')}
      </div>
      <div class="chart-whats-next__more" role="list">
        <a href="${esc(paidTile.href)}" class="chart-next-card chart-next-card--paid" role="listitem"${paidTile.external ? ' target="_blank" rel="noopener sponsored"' : ''}>
          <span class="chart-next-card__tag">${esc(paidTile.tag)}</span>
          <h4 class="chart-next-card__title">${esc(paidTile.title)}</h4>
          <p class="chart-next-card__desc">${esc(paidTile.desc)}</p>
          <span class="chart-next-card__cta">${esc(paidTile.cta)}</span>
        </a>
        ${more.map(s => `
          <a href="${esc(s.href)}" class="chart-next-card chart-next-card--quiet" role="listitem">
            <span class="chart-next-card__tag">${esc(s.tag)}</span>
            <h4 class="chart-next-card__title">${esc(s.title)}</h4>
            <p class="chart-next-card__desc">${esc(s.desc)}</p>
            <span class="chart-next-card__cta">${esc(s.cta)}</span>
          </a>`).join('')}
      </div>`;
    host.hidden = false;
  }

  function renderBigThree(chart) {
    const el = document.getElementById('big-three');
    if (!el) return;
    const items = [
      { key: 'Sun', label: 'Sun', sub: 'Core Identity', sign: chart.positions.Sun.sign, deg: fmtDeg(chart.positions.Sun), seal: 'planet:sun' },
      { key: 'Moon', label: 'Moon', sub: 'Inner World', sign: chart.positions.Moon.sign, deg: fmtDeg(chart.positions.Moon), seal: 'planet:moon' },
      { key: 'Rising', label: 'Rising', sub: 'Outward Self', sign: chart.risingSign, deg: (typeof chart.asc === 'number') ? fmtDeg({ degree: chart.asc % 30 }) : '', seal: chart.risingSign ? ('zodiac:' + String(chart.risingSign).toLowerCase()) : '' },
    ];
    el.innerHTML = items.map(it => {
      const sealHtml = it.seal
        ? `<span class="big-three-card__seal" data-celestial-seal="${esc(it.seal)}" data-seal-lg aria-hidden="true"></span>`
        : '';
      const fallback = (window.AstroIcons && AstroIcons.sign)
        ? AstroIcons.sign(it.sign, { lg: true, class: 'big-three-card__orb', hidden: true })
        : `<span class="big-three-card__glyph" aria-hidden="true">${esc((it.sign || '?').charAt(0))}</span>`;
      return `
      <article class="big-three-card" aria-label="${esc(it.label)} in ${esc(it.sign)}">
        <p class="big-three-card__planet">${esc(it.label)} · ${esc(it.sub)}</p>
        ${sealHtml || fallback}
        <h3 class="big-three-card__sign">${esc(it.sign)}</h3>
        <p class="big-three-card__desc">${it.deg ? it.deg + ' · ' : ''}${ELEMENT_MAP[it.sign] ? cap(ELEMENT_MAP[it.sign]) + ' · ' + cap(MODALITY_MAP[it.sign] || '') : ''}</p>
      </article>`;
    }).join('');
    // Hydrate engraved seals (celestial-seals.js bindSlots)
    try {
      if (window.AstroCelestialSeals && typeof AstroCelestialSeals.bindSlots === 'function') {
        AstroCelestialSeals.bindSlots();
      }
    } catch (e) { /* seals optional */ }
  }

  function renderWheel(chart) {
    const el = document.getElementById('natal-wheel');
    if (!el) return;
    if (!window.AstroChartRender) {
      // Renderer missing (failed to load/parse) — say so instead of a silent blank wheel.
      el.innerHTML = '<p style="text-align:center;color:var(--silver-dim,#8F8579);padding:2rem;">The chart renderer didn\'t load — please refresh the page.</p>';
      return;
    }
    el.classList.add('natal-wheel--loading');
    AstroChartRender.renderNatalChart(
      { positions: chart.positions, houses: chart.houses, aspects: chart.renderAspects,
        name: chart.name, dominant: chart.dominant, chartRuler: chart.chartRuler },
      'natal-wheel',
      { title: null, wheelOnly: true, showTable: false, showLegend: false });
    el.classList.remove('natal-wheel--loading');
    el.classList.add('natal-wheel--loaded');
    const wrap = document.getElementById('natal-wheel-wrap');
    if (wrap) wrap.removeAttribute('aria-busy');
    paintWheelSky(chart);
  }

  // ── "Your sky" backdrop behind the wheel (ART-DIRECTION-2026 motif #3) ──────
  // A dimmed, engine-captured System-preset frame of the birth moment sits behind
  // the wheel. If a live Orrery3D is mounted (it is not on this page today), we
  // capture its frame; otherwise we paint a deterministic cool sky seeded from the
  // birth data — same "your sky, computed in your browser" honesty as the share
  // card. A still, not a live loop: CLS-safe and reduced-motion-safe by nature.
  function captureBirthSky(chart) {
    try {
      const O = window.Orrery3D;
      if (!O || typeof O.captureFrame !== 'function' || O.isWebGL === undefined) return null;
      // Drive the engine to the birth date if it exposes the timeline hook.
      if (typeof O.setTimelineDays === 'function' && typeof chart.jd === 'number') {
        const nowJd = E().julianDay(
          new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate(), 12, 0, 0);
        O.setTimelineDays(Math.round(chart.jd - nowJd));
      }
      const frame = O.captureFrame({ scale: 1 });
      return (frame && frame.width) ? frame : null;
    } catch (e) { return null; }
  }

  // 3D engine still library (no live WebGL on chart page — ART-DIRECTION hard rule)
  let _engineSkyImg = null;
  let _engineSkyLoading = false;
  let _engineSkySrc = '';
  const RULER_ENGINE = {
    sun: 'img/engine/sun.webp', moon: 'img/engine/moon.webp',
    mercury: 'img/engine/mercury.webp', venus: 'img/engine/venus.webp',
    mars: 'img/engine/mars.webp', jupiter: 'img/engine/jupiter.webp',
    saturn: 'img/engine/saturn.webp', uranus: 'img/engine/uranus.webp',
    neptune: 'img/engine/neptune.webp', pluto: 'img/engine/pluto.webp',
  };
  // Export plate policy (honest): prefer Sun-sign traditional ruler so the
  // photoreal window matches “your sky” marketing for sun-sign visitors.
  // ASC chart-ruler is fallback when Sun sign is missing. Library still ≠ natal frame.
  const SUN_SIGN_RULER = {
    Aries: 'mars', Taurus: 'venus', Gemini: 'mercury', Cancer: 'moon', Leo: 'sun', Virgo: 'mercury',
    Libra: 'venus', Scorpio: 'mars', Sagittarius: 'jupiter', Capricorn: 'saturn', Aquarius: 'saturn', Pisces: 'jupiter',
  };
  function enginePlateSrcForChart(chart) {
    const sun = chart && chart.positions && chart.positions.Sun && chart.positions.Sun.sign;
    const sunSlug = SUN_SIGN_RULER[sun];
    if (sunSlug && RULER_ENGINE[sunSlug]) return RULER_ENGINE[sunSlug];
    const r = String((chart && (chart.chartRuler || chart.ruler)) || '').toLowerCase();
    if (RULER_ENGINE[r]) return RULER_ENGINE[r];
    return 'img/engine/earth-moon.webp';
  }
  function enginePlateLabelForChart(chart) {
    const sun = chart && chart.positions && chart.positions.Sun && chart.positions.Sun.sign;
    const sunSlug = SUN_SIGN_RULER[sun];
    if (sunSlug && sun) return sunSlug.charAt(0).toUpperCase() + sunSlug.slice(1) + ' · ' + sun + ' Sun';
    const r = String((chart && (chart.chartRuler || chart.ruler)) || '').toLowerCase();
    if (r) return r.charAt(0).toUpperCase() + r.slice(1) + ' · chart ruler';
    return 'Earth · system plate';
  }
  // Queue of waiters when the same plate is already loading
  let _engineSkyWaiters = [];
  let _engineSkyGen = 0;
  function loadEngineSkyPlate(cb, chart) {
    const src = enginePlateSrcForChart(chart) || 'img/engine/earth-moon.webp';
    if (_engineSkyImg && _engineSkyImg.complete && _engineSkyImg.naturalWidth && _engineSkySrc === src) {
      if (cb) cb(_engineSkyImg);
      return;
    }
    if (_engineSkyLoading && _engineSkySrc === src) {
      if (cb) _engineSkyWaiters.push(cb);
      return;
    }
    // Chart identity changed — invalidate previous plate; bump gen so stale onload is ignored
    if (_engineSkySrc && _engineSkySrc !== src) {
      _engineSkyImg = null;
    }
    const gen = ++_engineSkyGen;
    _engineSkyLoading = true;
    _engineSkySrc = src;
    _engineSkyWaiters = cb ? [cb] : [];
    const img = new Image();
    const finish = function (resolved) {
      if (gen !== _engineSkyGen) return; // stale load — a newer cast/export won
      _engineSkyLoading = false;
      if (resolved) _engineSkyImg = resolved;
      const waiters = _engineSkyWaiters.slice();
      _engineSkyWaiters = [];
      waiters.forEach(function (fn) { try { fn(resolved); } catch (e) { /* ignore */ } });
    };
    img.onload = function () { finish(img); };
    img.onerror = function () {
      if (gen !== _engineSkyGen) return;
      if (src !== 'img/engine/earth-moon.webp' && src !== 'img/engine/earth.webp') {
        // Cascade: planet → earth-moon → earth (same gen until parent finishes)
        _engineSkyLoading = false;
        _engineSkySrc = '';
        loadEngineSkyPlate(function (fb) {
          if (gen !== _engineSkyGen) return;
          if (fb) finish(fb);
          else {
            const earth = new Image();
            earth.onload = function () { if (gen === _engineSkyGen) finish(earth); };
            earth.onerror = function () { if (gen === _engineSkyGen) finish(null); };
            _engineSkySrc = 'img/engine/earth.webp';
            _engineSkyLoading = true;
            earth.src = 'img/engine/earth.webp';
          }
        }, null);
        return;
      }
      if (src === 'img/engine/earth-moon.webp') {
        const earth = new Image();
        earth.onload = function () { if (gen === _engineSkyGen) finish(earth); };
        earth.onerror = function () { if (gen === _engineSkyGen) finish(null); };
        _engineSkySrc = 'img/engine/earth.webp';
        _engineSkyLoading = true;
        earth.src = 'img/engine/earth.webp';
        return;
      }
      finish(null);
    };
    img.src = src;
  }
  function ensureEngineSkyPlate(chart) {
    return new Promise(function (resolve) {
      loadEngineSkyPlate(function (img) { resolve(img || null); }, chart);
    });
  }
  function updateKeepsakeBand(chart) {
    try {
      const imgEl = document.querySelector('.chart-keepsake-band__art img');
      const honesty = document.querySelector('.chart-keepsake-band__honesty');
      const label = enginePlateLabelForChart(chart);
      const src = enginePlateSrcForChart(chart);
      if (imgEl && src) {
        imgEl.src = src + (src.indexOf('?') >= 0 ? '&' : '?') + 'v=656';
        imgEl.alt = label + ' — 3D engine still';
      }
      if (honesty) {
        honesty.textContent =
          'Wheel = your real positions · window = ' + label +
          ' (3D orrery still) · free PNG ≠ paid print · not AI art';
      }
    } catch (e) { /* optional UI */ }
  }

  function paintDeterministicSky(x, W, H, chart, engineImg) {
    const seed = seedFromChart(chart);
    const elem = (chart.dominant && chart.dominant.element) || 'water';
    const tint = { fire: '184,90,66', earth: '90,122,72', air: '138,122,106', water: '74,117,128' }[elem] || '74,117,128';
    // Void base
    x.fillStyle = '#07070A';
    x.fillRect(0, 0, W, H);
    // Engine photoreal plate — chart-keyed ruler still; wheel holds personal geometry
    if (engineImg && engineImg.naturalWidth) {
      x.save();
      x.globalAlpha = 0.28;
      const s = Math.max(W / engineImg.naturalWidth, H / engineImg.naturalHeight) * 1.05;
      const dw = engineImg.naturalWidth * s, dh = engineImg.naturalHeight * s;
      x.drawImage(engineImg, (W - dw) / 2, (H - dh) / 2 - H * 0.04, dw, dh);
      x.restore();
    }
    // Faint element-tinted glow — the one personalised, non-fabricated cue.
    const g = x.createRadialGradient(W * 0.5, H * 0.44, 0, W * 0.5, H * 0.5, W * 0.62);
    g.addColorStop(0, 'rgba(' + tint + ',0.20)');
    g.addColorStop(0.55, 'rgba(' + tint + ',0.06)');
    g.addColorStop(1, 'transparent');
    x.fillStyle = g;
    x.fillRect(0, 0, W, H);
    drawStars(x, W, H, 240, seed, W / 1080);
  }

  function paintWheelSky(chart) {
    try {
      const stage = document.querySelector('.chart-wheel-stage');
      if (!stage || !chart) return;
      let cv = stage.querySelector('.chart-wheel-stage__sky');
      if (!cv) {
        cv = document.createElement('canvas');
        cv.className = 'chart-wheel-stage__sky';
        cv.setAttribute('aria-hidden', 'true');
        stage.insertBefore(cv, stage.firstChild);
      }
      const W = 900, H = 900;
      cv.width = W; cv.height = H;
      const x = (window.RafCore && window.RafCore.prepExportCtx)
        ? window.RafCore.prepExportCtx(cv, W, H) : cv.getContext('2d');
      x.clearRect(0, 0, W, H);
      const frame = captureBirthSky(chart);
      if (frame) {
        x.drawImage(frame, 0, 0, W, H);
        stage.classList.add('has-sky');
      } else {
        paintDeterministicSky(x, W, H, chart, _engineSkyImg);
        stage.classList.add('has-sky');
        // Load plate for this chart's ruling body, then repaint
        loadEngineSkyPlate(function (img) {
          if (!img || !stage.isConnected) return;
          x.clearRect(0, 0, W, H);
          paintDeterministicSky(x, W, H, chart, img);
        }, chart);
      }
    } catch (e) { /* wheel still renders on its own plate */ }
  }

  const HOUSE_SYSTEM_NAMES = { equal: 'Equal', placidus: 'Placidus', whole: 'Whole Sign' };

  // Rebuild a calculate() input from an already-computed chart so the results-level
  // house-system switcher works for both fresh casts and restored shared charts
  // (no dependency on the live form). Same birth moment, new house framework.
  function inputFromChart(chart, houseSystem) {
    const parts = String(chart.birthDate || '').split('-').map(Number);
    let hh = 12, mm = 0, timeKnown = false;
    if (chart.birthTime && /^\d{1,2}:\d{2}/.test(chart.birthTime)) {
      const t = chart.birthTime.split(':');
      hh = parseInt(t[0], 10); mm = parseInt(t[1], 10); timeKnown = true;
    }
    return {
      y: parts[0], m: parts[1], d: parts[2], hh, mm, timeKnown,
      lat: chart.lat, lon: chart.lon, tz: chart.tz,
      houseSystem, nodeMode: chart.nodeMode || 'mean',
      name: chart.name, city: chart.city,
    };
  }

  // Recompute this chart under a different house system, in place, without
  // scrolling away or losing the Houses tab. Only the house cusps, house
  // occupancy and the wheel's house layer change — the birth data is untouched.
  function switchHouseSystem(sys) {
    if (!currentChart || !HOUSE_SYSTEM_NAMES[sys]) return;
    if (sys === (currentChart.houseSystem || 'equal')) return;
    try {
      const next = calculate(inputFromChart(currentChart, sys));
      if (!next || !next.positions || !next.positions.Sun) return;
      currentChart = next;
      renderWheel(currentChart);
      renderTabs(currentChart); // re-fills tables + re-wires wheel↔table linking
      if (window.AstroApp) {
        AstroApp.showToast('House system updated',
          HOUSE_SYSTEM_NAMES[sys] + ' houses — your planets and signs are unchanged; only the house cusps moved.', 'success');
      }
    } catch (e) { /* leave the current chart intact on any failure */ }
  }

  const RF = () => window.ReadingFormat;

  function capAspectName(a) {
    const s = String(a || '');
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  }

  function aspectInterpretation(I, asp) {
    if (!I || !asp) return '';
    const type = capAspectName(asp.aspect);
    const via = I.getAspectMeaning && I.getAspectMeaning(type, asp.planet1, asp.planet2);
    if (via && via.indexOf('adds texture') === -1) return via;
    return `${asp.planet1} ${type.toLowerCase()} ${asp.planet2} colours how these two parts of your chart speak to each other — notice when both themes show up in the same story.`;
  }

  function planetIcon(name) {
    return (window.AstroIcons && AstroIcons.planet)
      ? AstroIcons.planet(name, { sm: true, hidden: true })
      : '<span aria-hidden="true">' + (PLANET_GLYPHS[name] || '') + '</span>';
  }

  function renderTabs(chart) {
    const I = window.AstroInterpretations;
    const fmt = RF();

    // Overview
    const ov = document.getElementById('analysis-content');
    if (ov) {
      let a = null;
      try { a = I && I.analyzeChartDetailed ? I.analyzeChartDetailed(chart) : null; } catch (e) { a = null; }
      const blocks = [];
      const tocItems = [];
      let readText = '';

      if (fmt) {
        const chips = [
          cap(chart.dominantElement) + ' · dominant element',
          cap(chart.dominantModality) + ' · modality',
          'Ruler ' + cap(chart.chartRuler || '—'),
        ];
        if (a) {
          ['personality', 'love', 'career', 'challenges', 'lifePurpose'].forEach(function (k) {
            if (a[k]) readText += a[k] + ' ';
          });
        }
        blocks.push(fmt.hero({
          name: chart.name || 'Your natal chart',
          chips: chips,
          readMin: fmt.estimateReadMin(readText || 'reading'),
        }));
      }

      const dominantText =
        `Your chart leads with ${chart.dominantElement} energy in a ${chart.dominantModality} mode. ` +
        `Chart ruler ${cap(chart.chartRuler || '—')} steers your ${chart.risingSign} Ascendant — the lens others meet first.`;
      blocks.push(analysisSection('Dominant Energy', dominantText, { featured: true, eyebrow: 'Start here' }));
      tocItems.push({ title: 'Dominant Energy' });

      if (a) {
        const sections = [
          ['Personality', a.personality, 'Core self', true],
          ['Love & Connection', a.love, 'Relationships', false],
          ['Career & Calling', a.career, 'Public path', false],
          ['Growth Edges', a.challenges, 'Lessons', false],
          ['Life Purpose', a.lifePurpose, 'Direction', false],
        ];
        sections.forEach(function (row) {
          if (!row[1]) return;
          blocks.push(analysisSection(row[0], row[1], { eyebrow: row[2], featured: row[3], collapsed: !row[3] }));
          tocItems.push({ title: row[0] });
        });
      }

      if (fmt && tocItems.length > 1) {
        blocks.splice(1, 0, fmt.toc(tocItems));
      }

      const patterns = I && I.detectChartPatterns
        ? I.detectChartPatterns(chart.positions, chart.aspects)
        : [];
      if (patterns.length) {
        const patternCards = patterns.map(patt => `
          <div class="pattern-card">
            <div class="pattern-card__head">
              <span class="pattern-card__glyph">${esc(patt.glyph)}</span>
              <strong class="pattern-card__name">${esc(patt.name)}</strong>
              ${patt.strength === 'major' ? '<span class="pattern-card__badge">Major</span>' : ''}
            </div>
            <p class="pattern-card__body">${esc(patt.description)}</p>
          </div>`).join('');
        blocks.push('<p class="ap-reading-section-label">Chart patterns</p>' + patternCards);
      }

      // Part of Fortune — needs a real Ascendant, so only when birth time is
      // known (a noon-default ASC would make the Lot meaningless).
      if (I && I.getPartOfFortune && chart.birthTime && typeof chart.asc === 'number' && chart.positions.Sun && chart.positions.Moon) {
        const sunHouse = chart.planetHouses ? chart.planetHouses.Sun : null;
        const isDay = sunHouse >= 7 && sunHouse <= 12;
        const pof = I.getPartOfFortune(chart.asc, chart.positions.Sun.lon, chart.positions.Moon.lon, isDay);
        blocks.push(analysisSection('Lot of Fortune',
          `Your Part of Fortune falls at <strong>${pof.degree}° ${pof.sign}</strong> ` +
          `(${isDay ? 'day' : 'night'} chart formula) — the point where Sun, Moon, and Ascendant ` +
          `converge; classically read as where life flows with the least resistance.`));
      }

      const fixedStars = I && I.getFixedStarConjunctions
        ? I.getFixedStarConjunctions(
            (() => {
              const pts = {};
              ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto']
                .forEach(k => { if (chart.positions[k]) pts[k] = chart.positions[k].lon; });
              if (typeof chart.asc === 'number') pts['Ascendant'] = chart.asc;
              if (typeof chart.mc === 'number')  pts['Midheaven'] = chart.mc;
              return pts;
            })(),
            parseInt(chart.birthDate, 10) || 2000)
        : [];
      if (fixedStars.length) {
        const starCards = fixedStars.slice(0, 6).map(fs => `
          <div class="pattern-card pattern-card--star">
            <div class="pattern-card__head">
              <span class="eng-star-mark" style="color:#c9a88a;"></span>
              <strong class="pattern-card__name pattern-card__name--star">${esc(fs.point)} conjunct ${esc(fs.star)}</strong>
              <span class="pattern-card__meta">${esc(fs.orb.toFixed(1))}° orb · ${esc(fs.constellation)}</span>
              ${fs.royal ? `<span class="pattern-card__badge" style="color:var(--gold);">★ Royal Star — ${esc(fs.royal)}</span>` : ''}
            </div>
            <p class="pattern-card__body">${esc(fs.meaning)}</p>
          </div>`).join('');
        blocks.push('<p class="ap-reading-section-label">Fixed star conjunctions</p>' +
          '<p class="ap-reading-card__meta" style="margin:0 0 var(--space-4);max-width:65ch;">Natal points within 1° of major named stars, precession-corrected to your birth year.</p>' +
          starCards);
      }

      ov.innerHTML = '<div class="ap-reading-flow">' + blocks.join('') + '</div>';
    }

    // Planets — placement cards with chunked interpretations
    const pt = document.getElementById('planets-table');
    if (pt && fmt) {
      const order = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto','Chiron','Lilith','NorthNode','SouthNode'];
      const DISPLAY_NAME = { NorthNode:'North Node', SouthNode:'South Node', Lilith:'Lilith' };
      const renderedPlanets = order.filter(k => chart.positions[k]);
      pt.innerHTML = renderedPlanets.map(k => {
        const p = chart.positions[k];
        const h = chart.planetHouses[k];
        const label = DISPLAY_NAME[k] || k;
        const signName = p.sign || '';
        const interp = I && I.getPlanetInterpretation
          ? I.getPlanetInterpretation(label, signName)
          : '';
        const houseInterp = h && I && I.getPlanetInHouse ? (I.getPlanetInHouse(label, h) || '') : '';
        const fullText = [interp, houseInterp].filter(Boolean).join(' ');
        const meta = signName + (h ? ' · House ' + h : '') + ' · ' + fmtDeg(p) +
          (p.retrograde ? ' · ℞ retrograde' : '');
        const dignity = I && I.getDignity ? I.getDignity(label.toLowerCase(), signName.toLowerCase()) : null;
        const dignityMeta = dignity && dignity.status !== 'peregrine'
          ? ' · ' + dignity.label
          : '';
        return fmt.placement({
          title: label + ' in ' + signName,
          meta: meta + dignityMeta,
          text: fullText.trim(),
          icon: planetIcon(k),
        });
      }).join('');
      if (chart.nodeMode) {
        const modeLabel = chart.nodeMode === 'true' ? 'True (osculating) node' : 'Mean node';
        pt.innerHTML += '<p class="ap-reading-card__meta" style="text-align:center;margin-top:var(--space-4);">' +
          'Lunar nodes: ' + modeLabel + ' · Lilith = mean Black Moon · South Node = North Node + 180°</p>';
      }
      // Tag each placement card AFTER all innerHTML writes (innerHTML += re-parses
      // and would drop these attributes). data-planet uses the internal key (e.g.
      // NorthNode) to match the wheel's glyph group; class drives element tint.
      const placementCards = pt.querySelectorAll('.ap-reading-card--placement');
      renderedPlanets.forEach((k, i) => {
        const card = placementCards[i];
        if (!card) return;
        const signName = chart.positions[k].sign || '';
        const elemKey = ELEMENT_MAP[signName] || '';
        card.setAttribute('data-planet', k);
        card.setAttribute('tabindex', '0');
        if (elemKey) {
          card.classList.add('ap-elem-' + elemKey);
          card.style.setProperty('--row-elem', 'var(--ap-element-' + elemKey + ')');
        }
      });
    } else if (pt) {
      pt.innerHTML = '<p class="ap-reading-empty">Reading formatter loading — refresh if this persists.</p>';
    }

    // Houses
    const ht = document.getElementById('houses-table');
    if (ht && fmt) {
      const planetsByHouse = {};
      Object.keys(chart.positions || {}).forEach(function (k) {
        const hh = chart.planetHouses && chart.planetHouses[k];
        if (!hh) return;
        planetsByHouse[hh] = planetsByHouse[hh] || [];
        planetsByHouse[hh].push(k);
      });
      const houseSigns = [];
      const curSys = chart.houseSystem || 'equal';
      const approxNote = chart.birthTime
        ? ''
        : ' <span class="house-system-switch__approx">· approximate without a birth time</span>';
      const switcherHtml =
        '<div class="house-system-switch" role="group" aria-label="House system — the framework that divides your chart into twelve life areas">' +
          '<p class="house-system-switch__label"><span class="house-system-switch__name">' +
            (HOUSE_SYSTEM_NAMES[curSys] || 'Equal') + ' houses</span> — switchable' + approxNote + '</p>' +
          '<div class="house-system-switch__opts">' +
            ['equal', 'placidus', 'whole'].map(function (s) {
              return '<button type="button" class="house-system-switch__btn' +
                (s === curSys ? ' is-active' : '') + '" data-house-system="' + s +
                '" aria-pressed="' + (s === curSys) + '">' + HOUSE_SYSTEM_NAMES[s] + '</button>';
            }).join('') +
          '</div>' +
        '</div>';
      ht.innerHTML = switcherHtml + chart.houses.map((cusp, i) => {
        const sign = E().signOf(cusp);
        houseSigns.push(sign);
        const deg  = cusp % 30;
        const dg = Math.floor(deg), mn = Math.round((deg - dg) * 60);
        const hm = I && I.getHouseMeaning ? I.getHouseMeaning(i + 1) : null;
        const occupants = (planetsByHouse[i + 1] || []).join(', ');
        const text = (hm && hm.meaning ? hm.meaning + ' ' : '') +
          (occupants ? 'Planets here: ' + occupants + '.' : 'No major planets in this house — the theme runs in the background until transits or progressions activate it.');
        return fmt.placement({
          title: 'House ' + (i + 1) + ' · ' + (HOUSE_THEMES[i] || ''),
          meta: (hm && hm.keyword ? hm.keyword + ' · ' : '') + sign + ' ' + dg + '°' + String(mn).padStart(2, '0') + '′ on the cusp',
          text: text,
          icon: '<span class="ap-reading-card__aspect-glyph" style="font-size:0.85rem;color:var(--gold);">' + roman(i + 1) + '</span>',
        });
      }).join('');
      ht.querySelectorAll('[data-house-system]').forEach(function (btn) {
        btn.addEventListener('click', function () { switchHouseSystem(btn.dataset.houseSystem); });
      });
      // Element-tint each house card by its cusp sign (purely visual; the cusp
      // sign + degree shown in the meta are unchanged engine values).
      const houseCards = ht.querySelectorAll('.ap-reading-card--placement');
      houseSigns.forEach((sign, i) => {
        const card = houseCards[i];
        if (!card) return;
        const elemKey = ELEMENT_MAP[sign] || '';
        if (elemKey) {
          card.classList.add('ap-elem-' + elemKey);
          card.style.setProperty('--row-elem', 'var(--ap-element-' + elemKey + ')');
        }
      });
    }

    // Aspects
    const at = document.getElementById('aspects-table');
    if (at && fmt) {
      const main = chart.aspects
        .filter(x => !['Ascendant','Midheaven','SouthNode'].includes(x.planet1) &&
                     !['Ascendant','Midheaven','SouthNode'].includes(x.planet2))
        .sort((x, y) => x.orb - y.orb)
        .slice(0, 18);
      at.innerHTML = main.length
        ? main.map(x => {
          const d = ASPECT_DISPLAY[x.aspect] || { name: x.aspect, glyph: '·', color: 'var(--silver)' };
          return fmt.aspect({
            planet1: x.planet1,
            planet2: x.planet2,
            aspect: x.aspect,
            display: d,
            applying: x.applying,
            orb: x.orb,
            interpretation: aspectInterpretation(I, x),
          });
        }).join('')
        : '<p class="ap-reading-empty">No major aspects within orb for this chart.</p>';

      // Tag each rendered aspect card with the SAME key the wheel uses
      // (`${p1}-${p2}-${type.toLowerCase()}`), so the bidirectional highlight can
      // pair a card to its line. Cards render in `main` order, so we zip by index.
      // Re-encoding only — keys are built from the already-displayed planet/aspect.
      if (main.length) {
        const cards = at.querySelectorAll('.ap-reading-card--aspect');
        main.forEach((x, i) => {
          const card = cards[i];
          if (!card) return;
          card.setAttribute('data-aspect-key', aspectKeyOf(x.planet1, x.planet2, x.aspect));
          card.setAttribute('data-planet1', x.planet1);
          card.setAttribute('data-planet2', x.planet2);
          card.setAttribute('tabindex', '0');
        });
      }
    }

    // Once both the wheel and the detail tables exist, wire the bidirectional
    // hover/focus highlight between them (no-op if either is missing).
    linkChartInteractions();
  }

  // Wheel↔table key — must byte-match chart-render.js aspectKey():
  //   `${planet1}-${planet2}-${aspect.toLowerCase()}`
  function aspectKeyOf(p1, p2, type) {
    return (p1 || '') + '-' + (p2 || '') + '-' + String(type || '').toLowerCase();
  }

  function linkChartInteractions() {
    if (!window.AstroChartRender || typeof AstroChartRender.linkWheelAndTables !== 'function') return;
    const wheel = document.getElementById('natal-wheel');
    const tabsRoot = document.querySelector('.chart-detail-tabs') || document;
    if (!wheel || !wheel.querySelector('svg')) return;
    AstroChartRender.linkWheelAndTables(wheel, tabsRoot);
  }

  function analysisSection(title, html, opts) {
    opts = opts || {};
    const fmt = RF();
    if (fmt) {
      return fmt.card({
        title: title,
        html: html,
        eyebrow: opts.eyebrow || '',
        featured: opts.featured,
        collapsed: opts.collapsed,
      });
    }
    return `<div class="analysis-section">
      <h4 class="analysis-section__title">${esc(title)}</h4>
      <p>${esc(html)}</p>
    </div>`;
  }
  const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  const roman = n => ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'][n - 1] || n;

  // ═══════════════════════════════════════════════════════════════════════════
  // DEEP READING TEASER — snippet → paywall funnel
  // ----------------------------------------------------------------------------
  // Honesty rule (CLAUDE.md): every word shown is the visitor's REAL computed
  // chart. We open each snippet with the genuine first sentence of the matching
  // interpretation (the curiosity gap), then HARD-WALL the rest behind a blurred
  // tail + lock pill. The locked tail names a real placement (e.g. "Venus in
  // your 8th house") but withholds the interpretation — we never invent text.
  // The CTA links to AP_MON.deepReadingUrl when set; otherwise it stays DORMANT
  // and opens the email capture instead of a fake checkout.
  // ═══════════════════════════════════════════════════════════════════════════

  function ORDINAL(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  // First sentence of a passage — the genuine "open the curiosity gap" line.
  function firstSentence(text) {
    if (!text) return '';
    const m = String(text).match(/^.*?[.!?](?=\s|$)/);
    return (m ? m[0] : String(text)).trim();
  }

  function renderDeepTeaser(chart) {
    const host = document.getElementById('deep-teaser');
    if (!host) return;
    const I = window.AstroInterpretations;
    if (!I || !chart || !chart.positions) { host.hidden = true; return; }

    const sunSign  = chart.positions.Sun  && chart.positions.Sun.sign;
    const moonSign = chart.positions.Moon && chart.positions.Moon.sign;
    const riseSign = chart.risingSign;

    // ── Build snippets from REAL interpretation text for THIS chart ──
    const snippets = [];

    if (sunSign) {
      const full = I.getPlanetInterpretation('Sun', sunSign);
      snippets.push({
        planet: 'Sun', sign: sunSign, label: 'Sun in ' + sunSign,
        open: firstSentence(full),
        // Hard-walled: name the real placement, withhold the reading.
        lock: 'How your ' + sunSign + ' Sun shapes the way you lead, create, and claim your purpose',
      });
    }
    if (moonSign) {
      const full = I.getPlanetInterpretation('Moon', moonSign);
      snippets.push({
        planet: 'Moon', sign: moonSign, label: 'Moon in ' + moonSign,
        open: firstSentence(full),
        lock: 'What your ' + moonSign + ' Moon truly needs to feel safe — and the emotional pattern it sets in love',
      });
    }

    // Third snippet: Venus-in-house if we have a real Ascendant-based house
    // (matches the brief's "Venus in the 8th house" example); else Rising.
    const venus = chart.positions.Venus;
    const venusHouse = chart.planetHouses && chart.planetHouses.Venus;
    if (chart.birthTime && venus && venusHouse) {
      const houseMeaning = I.getHouseMeaning(venusHouse);
      const houseName = (houseMeaning && houseMeaning.keyword) ? houseMeaning.keyword.toLowerCase() : 'this area of life';
      snippets.push({
        planet: 'Venus', sign: venus.sign, label: 'Venus in your ' + ORDINAL(venusHouse) + ' house',
        open: 'Your Venus in ' + venus.sign + ' sits in your ' + ORDINAL(venusHouse) + ' house — the house of ' + houseName + '.',
        lock: 'the exact relationship pattern this drives, where you seek beauty, and what you must learn to receive',
      });
    } else if (riseSign) {
      const ruler = chart.chartRuler ? cap(chart.chartRuler) : null;
      snippets.push({
        planet: 'Ascendant', sign: riseSign, label: riseSign + ' Rising',
        open: 'You meet the world through a ' + riseSign + ' Ascendant' + (ruler ? ', ruled by ' + ruler : '') + '.',
        lock: 'how this shapes first impressions, your instinctive style, and the path your chart ruler is steering you toward',
      });
    }

    if (!snippets.length) { host.hidden = true; return; }

    const orbFor = s => {
      if (window.AstroIcons) {
        if (s.planet && AstroIcons.planet) {
          return AstroIcons.planet(s.planet, { class: 'deep-snippet__orb', hidden: true });
        }
        if (s.sign && AstroIcons.sign) {
          return AstroIcons.sign(s.sign, { class: 'deep-snippet__orb', hidden: true });
        }
      }
      return '<span class="deep-snippet__orb eng-star-mark" aria-hidden="true" style="color:var(--gold);"></span>';
    };

    const cards = snippets.map(s => `
      <div class="deep-snippet">
        <div class="deep-snippet__head">
          ${orbFor(s)}
          <span class="deep-snippet__label">${esc(s.label)}</span>
        </div>
        <p class="deep-snippet__open">${esc(s.open)}</p>
        <p class="deep-snippet__locked">
          <span class="deep-lock-tail">${esc(s.lock)}…</span>
          <span class="deep-lock-pill"><svg class="eng-i" aria-hidden="true"><use href="#ei-lock"/></svg> Unlock the full reading</span>
        </p>
      </div>`).join('');

    // ── CTA: configured → real product link · dormant → email capture ──
    const M = window.AP_MON || {};
    const url = typeof M.deepReadingUrl === 'string' ? M.deepReadingUrl.trim() : '';
    const configured = /^https?:\/\//i.test(url);
    // Price renders ONLY if the owner sets it (honesty rule — never a fake number).
    const price = typeof M.deepReadingPrice === 'string' ? M.deepReadingPrice.trim() : '';
    const priceBit = price ? ` — <strong>${esc(price)}</strong>` : '';
    const ctaHtml = configured
      ? `<p class="deep-teaser__format">A personalised 13-page PDF — every planet, all twelve houses, life-area chapters (love, career, wellbeing), chart patterns, ten tightest aspects, and a full reference — drawn from the same engine as your free chart${priceBit}. One-time; yours to keep, no subscription.</p>
         <a class="btn--deep" id="deep-cta" href="${esc(url)}" target="_blank" rel="noopener sponsored">
           <svg class="eng-i" aria-hidden="true"><use href="#ei-star4"/></svg> Unlock Your Deep Reading${price ? ' — ' + esc(price) : ''}
         </a>
         <p class="deep-teaser__honest">Opens a secure checkout on our partner store. The chart you cast here never leaves your browser — your reading is hand-prepared from the birth details you enter at checkout.</p>`
      : `<button type="button" class="btn--deep" id="deep-cta">
           <svg class="eng-i" aria-hidden="true"><use href="#ei-star4"/></svg> Full readings coming soon
         </button>
         <p class="deep-teaser__honest">Deep written readings aren't open for purchase yet. Drop your email below and you'll be the first to know — no spam.</p>`;

    host.innerHTML = `
      <div class="deep-teaser__head">
        <p class="deep-teaser__eyebrow">Your Deep Reading</p>
        <h3 class="deep-teaser__title">There's more written in this sky</h3>
        <p class="deep-teaser__sub">Your free chart above shows the placements. Your Deep Reading interprets how they weave together — drawn line by line from the exact chart you just cast.</p>
      </div>
      ${cards}
      <div class="deep-teaser__cta-wrap">
        ${ctaHtml}
        <p class="deep-teaser__sample" style="margin-top:var(--space-3);font-size:0.85rem;">
          <a href="sample-reading.html" target="_blank" rel="noopener" style="color:var(--gold-light,#E8C872);">See a real sample reading →</a>
          &nbsp;·&nbsp; A genuine example, generated from a sample chart.
        </p>
      </div>`;
    host.hidden = false;

    const cta = document.getElementById('deep-cta');
    if (cta && !configured) {
      cta.addEventListener('click', () => {
        const ec = document.getElementById('email-capture');
        if (ec) {
          ec.hidden = false;
          ec.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const inp = document.getElementById('email-capture-input');
          if (inp) setTimeout(() => inp.focus(), 400);
        }
        if (window.AstroApp) AstroApp.showToast('Coming soon',
          'Deep readings aren’t open yet — leave your email and we’ll let you know.', 'info');
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EMAIL CAPTURE — optional, privacy-respecting, dormant-by-default
  // ----------------------------------------------------------------------------
  // Provider-agnostic: when AP_MON.emailUrl is a real endpoint we POST there as a
  // standard hosted-newsletter form (Buttondown / Mailchimp style). When it's
  // empty (dormant) the email never leaves the device — we store the intent in
  // localStorage and show a friendly confirmation. Email is NEVER required to
  // use the free chart.
  // ═══════════════════════════════════════════════════════════════════════════

  const WALLPAPER_UNLOCK_KEY = 'ap_wallpaper_unlock';
  const WALLPAPER_DATE_KEY = 'ap_shop_wallpaper_date';
  let wallpaperLeadWired = false;

  function isValidEmail(e) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e || '');
  }

  function isWallpaperUnlocked() {
    try { return !!localStorage.getItem(WALLPAPER_UNLOCK_KEY); } catch (e) { return false; }
  }

  function setWallpaperUnlocked(email) {
    try { localStorage.setItem(WALLPAPER_UNLOCK_KEY, email); } catch (e) {}
  }

  function revealWallpaperUnlockUi() {
    const form = document.getElementById('wallpaper-email-form');
    const unlocked = document.getElementById('wallpaper-unlocked');
    if (isWallpaperUnlocked()) {
      if (form) form.hidden = true;
      if (unlocked) unlocked.hidden = false;
    }
  }

  function downloadWallpaper() {
    if (!currentChart) return;
    if (!isWallpaperUnlocked()) {
      const host = document.getElementById('wallpaper-lead');
      if (host) {
        host.hidden = false;
        host.scrollIntoView({ behavior: 'smooth', block: 'center' });
        document.querySelector('#wallpaper-email-form [name="email"]')?.focus();
      }
      if (window.AstroApp) AstroApp.showToast('Email unlock', 'Enter your email once to download your wallpaper.', 'info');
      return;
    }
    exportShareImage(currentChart, 'wallpaper', { forceDownload: true });
  }

  function initWallpaperLead(chart) {
    const host = document.getElementById('wallpaper-lead');
    if (!host || !chart) return;
    host.hidden = false;
    revealWallpaperUnlockUi();

    if (wallpaperLeadWired) return;
    wallpaperLeadWired = true;

    const form = document.getElementById('wallpaper-email-form');
    const dateInput = form?.querySelector('[name="birthDate"]');
    try {
      const hint = localStorage.getItem(WALLPAPER_DATE_KEY);
      if (hint && dateInput && !dateInput.value) dateInput.value = hint;
    } catch (e) {}

    form?.addEventListener('submit', ev => {
      ev.preventDefault();
      const email = (form.email?.value || '').trim();
      const birthDate = (dateInput?.value || '').trim();
      if (!isValidEmail(email)) {
        if (window.AstroApp) AstroApp.showToast('Check your email', 'That address looks off.', 'warning');
        else form.email?.focus();
        return;
      }
      let res = { sent: 'local' };
      if (window.AstroApp && typeof AstroApp.captureEmail === 'function') {
        res = AstroApp.captureEmail(email, {
          source: 'chart_wallpaper_unlock',
          tag: 'tag_chart_wallpaper',
          meta: {
            forName: firstNameOf(chart.name) || null,
            sunSign: chart.positions?.Sun?.sign || null,
            hasBirthDate: !!birthDate,
          },
        });
      }
      if (birthDate) {
        try { localStorage.setItem(WALLPAPER_DATE_KEY, birthDate); } catch (e) {}
      }
      setWallpaperUnlocked(email);
      revealWallpaperUnlockUi();
      downloadWallpaper();
      if (window.AstroApp) {
        AstroApp.showToast(
          res.sent === 'provider' ? 'Unlocked' : 'Saved locally',
          'Your wallpaper is downloading — cosmic weather by email when it ships.',
          'success'
        );
      }
    });

    document.getElementById('wallpaper-download-btn')?.addEventListener('click', downloadWallpaper);
  }

  let emailCaptureWired = false;

  function initEmailCapture(chart) {
    const host = document.getElementById('email-capture');
    if (!host) return;

    // Honesty + no double-ask: the default headline ("Unlocked your wallpaper?…")
    // presupposes the visitor already joined via the wallpaper gate above. If they
    // did, don't ask a second time; if they didn't, swap in a neutral headline so
    // we never assert a false premise.
    if (isWallpaperUnlocked()) {
      host.hidden = true;
      return;
    }
    host.hidden = false;            // reveal alongside a cast chart
    const capTitle = host.querySelector('.email-capture__title');
    const capSub = host.querySelector('.email-capture__sub');
    if (capTitle) capTitle.textContent = 'Get cosmic weather for your chart';
    if (capSub) capSub.innerHTML = 'Monthly transit notes for <em>your</em> chart, deep-reading previews, shop drops &amp; horoscopes when they ship — no spam, unsubscribe anytime. Your birth data stays on your device.';

    if (emailCaptureWired) return;  // wire the form exactly once
    emailCaptureWired = true;

    const form = document.getElementById('email-capture-form');
    const input = document.getElementById('email-capture-input');
    const doneMsg = document.getElementById('email-capture-done-msg');
    if (!form || !input) return;

    const validEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

    form.addEventListener('submit', ev => {
      ev.preventDefault();
      const email = input.value.trim();
      if (!validEmail(email)) {
        if (window.AstroApp) AstroApp.showToast('Check your email',
          'That doesn’t look like a valid email address.', 'warning');
        input.focus();
        return;
      }

            const copy = window.AP_COPY || {};
      let res = { sent: 'local' };
      if (window.AstroApp && typeof AstroApp.captureEmail === 'function') {
        res = AstroApp.captureEmail(email, {
          source: 'chart_capture',
          tag: 'tag_chart_wallpaper',
          meta: {
            forName: (chart && chart.name) ? (firstNameOf(chart.name) || null) : null,
            sunSign: chart && chart.positions && chart.positions.Sun ? chart.positions.Sun.sign : null,
          },
        });
      }

      if (doneMsg) {
        doneMsg.innerHTML = res.sent === 'provider'
          ? '<strong>You’re on the list.</strong> ' + (copy.confirmDoubleOptIn || 'Your cosmic weather will arrive by email — unsubscribe anytime.')
          : res.sent === 'mailto'
            ? '<strong>Noted.</strong> Your email client should open to complete sign-up — check your drafts if it didn’t.'
            : '<strong>We’ll let you know.</strong> ' + (copy.dormantSaved || 'Saved on your device only.');
      }
      if (window.AstroApp) {
        AstroApp.showToast(
          res.sent === 'provider' ? 'Subscribed' : (res.sent === 'mailto' ? 'Almost there' : 'Saved on your device'),
          res.sent === 'provider' ? 'You’ll get your cosmic weather by email.' : (copy.dormantSaved || 'Saved locally.'),
          res.sent === 'provider' ? 'success' : 'info'
        );
      }

host.classList.add('is-done');

      if (currentChart) {
        exportShareImage(currentChart, 'wallpaper', { forceDownload: true });
      }
    });
  }

  // ── Tabs ──────────────────────────────────────────────────────────────────

  let tabsInit = false;
  function initTabs() {
    if (tabsInit) return;
    tabsInit = true;
    // Support both old .tabs__trigger class (from chart-render) and new .tab-trigger
    document.querySelectorAll('.tabs__trigger, .tab-trigger').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tabs__trigger, .tab-trigger').forEach(b => b.setAttribute('aria-selected', 'false'));
        document.querySelectorAll('.tabs__panel, .tab-panel').forEach(p => p.setAttribute('aria-hidden', 'true'));
        btn.setAttribute('aria-selected', 'true');
        const panel = document.getElementById(btn.getAttribute('aria-controls'));
        if (panel) panel.setAttribute('aria-hidden', 'false');
        var hint = document.getElementById('chart-tabs-hint');
        if (hint) hint.setAttribute('hidden', '');
      });
    });
  }

  // ── Action buttons ────────────────────────────────────────────────────────

  document.getElementById('save-btn')?.addEventListener('click', () => {
    if (!currentChart) return;
    if (window.APChartShare) {
      APChartShare.saveWithFeedback(currentChart, {
        name: currentChart.name,
        birthDate: currentChart.birthDate,
        birthTime: currentChart.birthTime,
        birthCity: currentChart.city,
        city: currentChart.city,
        lat: currentChart.lat,
        lon: currentChart.lon,
        tz: currentChart.tz,
        houseSystem: currentChart.houseSystem || 'equal',
        sunSign: currentChart.positions.Sun.sign,
        moonSign: currentChart.positions.Moon.sign,
        risingSign: currentChart.risingSign,
        positions: window.AstroProfile && AstroProfile.packPositionsForSave
          ? AstroProfile.packPositionsForSave(currentChart.positions) : null,
        aspects: (currentChart.aspects || []).slice(0, 16),
        engineV: 2,
      });
    } else if (window.AstroProfile) {
      AstroProfile.saveChart({
        name: currentChart.name,
        birthDate: currentChart.birthDate,
        birthTime: currentChart.birthTime,
        birthCity: currentChart.city,
        city: currentChart.city,
        lat: currentChart.lat,
        lon: currentChart.lon,
        tz: currentChart.tz,
        houseSystem: currentChart.houseSystem || 'equal',
        sunSign: currentChart.positions.Sun.sign,
        moonSign: currentChart.positions.Moon.sign,
        risingSign: currentChart.risingSign,
        positions: AstroProfile.packPositionsForSave
          ? AstroProfile.packPositionsForSave(currentChart.positions) : null,
        aspects: (currentChart.aspects || []).slice(0, 16),
        engineV: 2,
      });
      if (window.AstroApp) {
        AstroApp.showToast('Saved',
          'Chart saved — view it in My Charts or your Profile.', 'success');
      }
    }
  });

  // Share Chart → beautiful chart-view link (preferred) or image via Web Share API.
  document.getElementById('share-btn')?.addEventListener('click', async () => {
    if (!currentChart) return;
    const shareUrl = window.APChartShare
      ? APChartShare.buildShareUrl(currentChart, null, { interactive: false })
      : location.href;
    const text = window.APChartShare
      ? APChartShare.bigThreeLine(currentChart)
      : `${currentChart.name}: ☉ ${currentChart.positions.Sun.sign} · ☽ ${currentChart.positions.Moon.sign} · ↑ ${currentChart.risingSign}`;
    if (window.APChartShare) APChartShare.updateShareStrip(currentChart, null);
    // Prefer sharing the generated image (richer than a bare link) on capable devices.
    if (navigator.canShare && navigator.share) {
      try {
        const blob = await canvasToBlob(paintShareImage(currentChart, 'square'));
        const file = blob && new File([blob], `${slugify(currentChart.name)}-natal-square.png`, { type: 'image/png' });
        if (file && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: 'My Birth Chart — Astro Precise', text, url: shareUrl });
          return;
        }
      } catch (e) { if (e && e.name === 'AbortError') return; /* else fall through */ }
    }
    try {
      if (navigator.share) {
        await navigator.share({ title: 'My Birth Chart — Astro Precise', text, url: shareUrl });
      } else if (window.APChartShare) {
        await APChartShare.copyShareLink(currentChart, null);
      } else {
        await navigator.clipboard.writeText(`${text}\n${shareUrl}`);
        if (window.AstroApp) AstroApp.showToast('Link copied', 'Share link copied to clipboard.', 'success');
      }
    } catch (e) { /* user cancelled */ }
  });

  if (window.APChartShare) {
    APChartShare.wireCopyButton(function () { return currentChart; }, function () { return null; });
  }

  // Big Three Card → dedicated Sun/Moon/Rising square (no full natal wheel).
  document.getElementById('print-btn')?.addEventListener('click', () => {
    if (!currentChart) { window.print(); return; }
    exportShareImage(currentChart, 'bigthree');
  });

  document.getElementById('wallpaper-btn')?.addEventListener('click', downloadWallpaper);

  document.getElementById('json-btn')?.addEventListener('click', () => {
    if (!currentChart) return;
    const I = window.AstroInterpretations;
    const data = {
      generator: 'Astro Precise (astroprecise ephemeris — truncated VSOP87/ELP2000, ~1′ accuracy)',
      exported: new Date().toISOString(),
      name: currentChart.name,
      birthDate: currentChart.birthDate,
      birthTime: currentChart.birthTime || null,
      place: { city: currentChart.city, lat: currentChart.lat, lon: currentChart.lon, tz: currentChart.tz },
      risingSign: currentChart.risingSign,
      houseSystem: currentChart.houseSystem || 'equal',
      positions: currentChart.positions,
      houses: currentChart.houses,
      planetHouses: currentChart.planetHouses,
      aspects: currentChart.aspects,
      patterns: I && I.detectChartPatterns
        ? I.detectChartPatterns(currentChart.positions, currentChart.aspects) : [],
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.download = `${(currentChart.name || 'chart').replace(/[^\w]+/g, '-').toLowerCase()}-natal-chart.json`;
    a.href = URL.createObjectURL(blob);
    a.click();
    URL.revokeObjectURL(a.href);
    if (window.AstroApp) AstroApp.showToast('Exported', 'Chart data downloaded as JSON.', 'success');
  });

  document.getElementById('app-btn')?.addEventListener('click', () => {
    location.href = 'index.html#app-download';
  });

  // ── Element distribution helper ───────────────────────────────────────────

  function computeElements(positions) {
    const COUNTED = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn'];
    const counts = { fire: 0, earth: 0, air: 0, water: 0 };
    for (const k of COUNTED) {
      const p = positions[k];
      if (p && ELEMENT_MAP[p.sign]) counts[ELEMENT_MAP[p.sign]]++;
    }
    return counts;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SHARE-IMAGE ENGINE — one deterministic renderer, many formats
  // ----------------------------------------------------------------------------
  // A single resolution-independent painter (paintShareImage) feeds every output:
  //   • square    1080×1080  — Instagram / general social post
  //   • story     1080×1920  — IG / FB / WhatsApp story (9:16)
  //   • wallpaper 1080×1920  — lock-screen portrait (lead magnet)
  //   • bigthree  1080×1080  — Sun / Moon / Rising social card only
  //   • print     2480×3508  — A4-proportioned, print-on-demand poster (300dpi)
  // The merch / print-on-demand line will reuse the SAME pipeline, so geometry is
  // expressed in a 0..1 "design space" and multiplied by the canvas size: the
  // print export is genuinely high-resolution, not an upscaled screenshot.
  // Honest + deterministic: only the real computed chart is ever drawn.
  // ═══════════════════════════════════════════════════════════════════════════

  // Cinzel (display) + Inter (sans), loaded by the page <head>; serif/sans fallback.
  const FONT_DISPLAY = '"AstroGlyph", "Cinzel", "Cormorant Garamond", Georgia, serif';
  const FONT_SANS    = '"Inter", "Helvetica Neue", Arial, sans-serif';

  // Engraved palette (matches css/main.css :root) ────────────────────────────
  const PAL = {
    void:     '#07070A',   // --ap-void-deep
    voidWarm: '#121826',   // --ap-void-mid (name kept; value is cool)
    lapis:    '#4A7580',   // structural/accent lines → water element accent
    gold:     '#A8B0BC',   // --ap-gold-core
    goldHi:   '#7EC8E8',   // --ap-gold-bright
    goldPale: '#E8EBF0',   // --ap-gold-parchment
    parchment:'#E8EBF0',
    oxblood:  '#4A7580',   // retired oxblood → cool water accent
    silver:   '#C8CDD6',   // --ap-text-secondary
    silverDim:'#8B919C',   // --ap-text-muted
  };

  const SHARE_FORMATS = {
    square:    { w: 2160, h: 2160 },
    story:     { w: 2160, h: 3840 },
    wallpaper: { w: 1080, h: 1920 },
    bigthree:  { w: 1080, h: 1080 },
    print:     { w: 4960, h: 7016 }, // A4 @ ~600dpi — print-on-demand HD
    // Legacy social sizes (still available via export picker)
    square1x: { w: 1080, h: 1080 },
    story1x:  { w: 1080, h: 1920 },
    print1x:  { w: 2480, h: 3508 },
  };

  // Deterministic star seed from the chart so the same person → same artwork.
  function seedFromChart(chart) {
    const s = `${chart.name || ''}|${chart.birthDate || ''}|${chart.birthTime || ''}|${chart.city || ''}`;
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0) || 1;
  }

  // Faint dot grid (scaled).
  function drawDotGrid(x, W, H, S) {
    const step = 48 * S;
    x.fillStyle = 'rgba(168,176,188,0.05)';
    for (let gx = step; gx < W; gx += step) {
      for (let gy = step; gy < H; gy += step) {
        x.beginPath();
        x.arc(gx, gy, 1.2 * S, 0, Math.PI * 2);
        x.fill();
      }
    }
  }

  // Deterministic starfield with occasional gold sparkles.
  function drawStars(x, W, H, count, seed0, S) {
    let seed = seed0 >>> 0 || 1;
    const rnd = () => (seed = (Math.imul(seed, 16807)) % 2147483647) / 2147483647;
    for (let i = 0; i < count; i++) {
      const sparkle = rnd() > 0.9;
      const alpha = 0.12 + rnd() * 0.55;
      const r     = (rnd() * 1.8 + 0.3) * S;
      x.fillStyle = sparkle
        ? `rgba(205,174,106,${alpha})`
        : `rgba(240,232,216,${alpha})`;
      x.beginPath();
      x.arc(rnd() * W, rnd() * H, r, 0, Math.PI * 2);
      x.fill();
    }
  }

  // Masterpiece ground: void + engine photoreal window + brass atmosphere + stars.
  // Engine stills from make-engine-stills (3D orrery library) — not stock nebulas.
  // eng: optional preloaded plate (preferred over global — avoids stale chart race).
  function paintBackground(x, W, H, seed, S, eng) {
    x.fillStyle = PAL.void;
    x.fillRect(0, 0, W, H);

    // Photoreal 3D engine plate as soft full-field atmosphere (marketing parity)
    eng = eng || _engineSkyImg;
    if (eng && eng.naturalWidth) {
      x.save();
      x.globalAlpha = 0.28;
      const s = Math.max(W / eng.naturalWidth, H / eng.naturalHeight) * 1.12;
      const dw = eng.naturalWidth * s, dh = eng.naturalHeight * s;
      x.drawImage(eng, (W - dw) / 2, (H - dh) / 2 - H * 0.06, dw, dh);
      x.restore();
    }

    // Brass nebula (top) — token brass only
    const neb1 = x.createRadialGradient(W * 0.72, H * 0.16, 0, W * 0.72, H * 0.16, Math.max(W, H) * 0.75);
    neb1.addColorStop(0, 'rgba(168,176,188,0.16)');
    neb1.addColorStop(0.5, 'rgba(168,176,188,0.05)');
    neb1.addColorStop(1, 'transparent');
    x.fillStyle = neb1; x.fillRect(0, 0, W, H);

    // Cool raised void (lower)
    const neb2 = x.createRadialGradient(W * 0.2, H * 0.86, 0, W * 0.2, H * 0.86, Math.max(W, H) * 0.7);
    neb2.addColorStop(0, 'rgba(26,34,48,0.55)');
    neb2.addColorStop(0.5, 'rgba(74,117,128,0.10)');
    neb2.addColorStop(1, 'transparent');
    x.fillStyle = neb2; x.fillRect(0, 0, W, H);

    drawDotGrid(x, W, H, S);
    drawStars(x, W, H, Math.round((W * H) / 4800), seed, S);

    // Circular engine “window” behind wheel zone (masterpiece motif — framed keep)
    if (eng && eng.naturalWidth) {
      const wx = W / 2, wy = H * 0.48, wr = Math.min(W, H) * 0.30;
      x.save();
      x.beginPath();
      x.arc(wx, wy, wr, 0, Math.PI * 2);
      x.closePath();
      x.clip();
      x.globalAlpha = 0.48;
      const s2 = Math.max((wr * 2) / eng.naturalWidth, (wr * 2) / eng.naturalHeight);
      const dw2 = eng.naturalWidth * s2, dh2 = eng.naturalHeight * s2;
      x.drawImage(eng, wx - dw2 / 2, wy - dh2 / 2, dw2, dh2);
      x.restore();
      // Brass double-ring window (matches marketing plate language)
      x.strokeStyle = 'rgba(168,176,188,0.48)';
      x.lineWidth = Math.max(2.5, 2.5 * S);
      x.beginPath();
      x.arc(wx, wy, wr, 0, Math.PI * 2);
      x.stroke();
      x.strokeStyle = 'rgba(168,176,188,0.22)';
      x.lineWidth = Math.max(1, 1.2 * S);
      x.beginPath();
      x.arc(wx, wy, wr + 6 * S, 0, Math.PI * 2);
      x.stroke();
    }

    // Subtle vignette to focus the eye
    const vig = x.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.72);
    vig.addColorStop(0, 'transparent');
    vig.addColorStop(1, 'rgba(12,16,22,0.62)');
    x.fillStyle = vig; x.fillRect(0, 0, W, H);
  }

  // Double gold frame with generous margin (print bleed-friendly).
  function drawFrame(x, W, H, outerInset, innerInset) {
    x.strokeStyle = 'rgba(168,176,188,0.7)';
    x.lineWidth = Math.max(2, outerInset * 0.05);
    x.strokeRect(outerInset, outerInset, W - outerInset * 2, H - outerInset * 2);
    x.strokeStyle = 'rgba(168,176,188,0.3)';
    x.lineWidth = Math.max(1, outerInset * 0.025);
    x.strokeRect(innerInset, innerInset, W - innerInset * 2, H - innerInset * 2);
    // Corner ticks
    x.strokeStyle = 'rgba(205,174,106,0.55)';
    x.lineWidth = Math.max(1.5, outerInset * 0.04);
    const t = (outerInset + innerInset) / 2;
    const len = (innerInset - outerInset) * 1.4;
    [[outerInset, outerInset, 1, 1], [W - outerInset, outerInset, -1, 1],
     [outerInset, H - outerInset, 1, -1], [W - outerInset, H - outerInset, -1, -1]]
      .forEach(([cx2, cy2, sx, sy]) => {
        x.beginPath();
        x.moveTo(cx2, cy2 + sy * len); x.lineTo(cx2, cy2); x.lineTo(cx2 + sx * len, cy2);
        x.stroke();
      });
  }

  // Centred text helper that shrinks to fit a max width (keeps long names tidy).
  function fitText(x, text, cx, cy, maxW, weight, basePx, fontFamily) {
    let px = basePx;
    x.font = `${weight} ${px}px ${fontFamily}`;
    while (x.measureText(text).width > maxW && px > basePx * 0.45) {
      px -= Math.max(1, basePx * 0.04);
      x.font = `${weight} ${px}px ${fontFamily}`;
    }
    x.fillText(text, cx, cy);
    return px;
  }

  // Sign seal on a glass orb plate; first letter of sign if seal not ready yet.
  function drawSignOrb(x, signName, cx, cy, r, elemCol) {
    const seals = window.APCanvasSeals;
    if (seals && typeof seals.drawSealPlate === 'function') {
      if (seals.drawSealPlate(x, signName, cx, cy, r, elemCol)) return;
      // Plate already painted by drawSealPlate — letter fallback only.
      x.fillStyle = PAL.parchment;
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.font = `600 ${r * 0.72}px ${FONT_DISPLAY}`;
      x.fillText((signName || '?').charAt(0), cx, cy + r * 0.04);
      return;
    }
    const grad = x.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r);
    grad.addColorStop(0, 'rgba(255,255,255,0.18)');
    var alphaFn = (window.APCanvasSeals && APCanvasSeals.withAlpha) ? APCanvasSeals.withAlpha.bind(APCanvasSeals) : null;
    grad.addColorStop(0.4, alphaFn ? alphaFn(elemCol, 'cc') : elemCol);
    grad.addColorStop(1, alphaFn ? alphaFn(elemCol, '33') : elemCol);
    x.fillStyle = grad;
    x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill();
    x.strokeStyle = 'rgba(168,176,188,0.55)';
    x.lineWidth = Math.max(1, r * 0.06);
    x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.stroke();
    x.strokeStyle = 'rgba(255,255,255,0.28)';
    x.lineWidth = Math.max(1, r * 0.05);
    x.beginPath(); x.arc(cx, cy, r * 0.78, Math.PI * 1.15, Math.PI * 1.85); x.stroke();
    x.fillStyle = PAL.parchment;
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = `600 ${r * 0.72}px ${FONT_DISPLAY}`;
    x.fillText((signName || '?').charAt(0), cx, cy + r * 0.04);
  }

  function drawWheelSignSeal(x, sign, cx, cy, sizePx) {
    const seals = window.APCanvasSeals;
    if (seals && typeof seals.drawSeal === 'function' && seals.drawSeal(x, sign, cx, cy, sizePx)) {
      return;
    }
    x.fillStyle = PAL.gold;
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = `600 ${sizePx * 0.85}px ${FONT_DISPLAY}`;
    x.fillText((sign || '?').charAt(0), cx, cy);
  }

  // ── The natal wheel, drawn in design-space (cx,cy,radius in px) ────────────
  function drawWheel(x, chart, cx, cy, R) {
    x.lineCap = 'round';
    x.lineJoin = 'round';
    const SIGNS_ORDER = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo',
                         'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
    // Observatory element tints (muted — match --ap-element-*)
    const ELEMENT_SECTOR = {
      Aries:'rgba(184,90,66,0.11)', Taurus:'rgba(90,122,72,0.11)', Gemini:'rgba(138,122,106,0.10)', Cancer:'rgba(74,117,128,0.12)',
      Leo:'rgba(184,90,66,0.11)', Virgo:'rgba(90,122,72,0.11)', Libra:'rgba(138,122,106,0.10)', Scorpio:'rgba(74,117,128,0.12)',
      Sagittarius:'rgba(184,90,66,0.11)', Capricorn:'rgba(90,122,72,0.11)', Aquarius:'rgba(138,122,106,0.10)', Pisces:'rgba(74,117,128,0.12)',
    };
    const rOuter     = R;
    const rBand      = R * 0.89;
    const rSignInner = R * 0.755;
    const rPlanets   = R * 0.61;
    const rInner     = R * 0.475;
    const lw = R / 410;

    const ascLon = chart.asc || 0;
    const ang = lon => Math.PI - ((lon - ascLon) * Math.PI / 180);

    // Schematic orbital tracks (decorative — matches SVG chart-render layer)
    [0.78, 0.68, 0.58].forEach((frac, i) => {
      x.save();
      x.strokeStyle = 'rgba(168,176,188,' + (0.1 + i * 0.04) + ')';
      x.lineWidth = 0.8 * lw;
      x.setLineDash([3 + i, 5 + i * 2]);
      x.beginPath();
      x.arc(cx, cy, R * frac, 0, Math.PI * 2);
      x.stroke();
      x.restore();
    });

    // Rings
    x.strokeStyle = 'rgba(168,176,188,0.75)'; x.lineWidth = 3 * lw;
    x.beginPath(); x.arc(cx, cy, rOuter, 0, Math.PI * 2); x.stroke();
    x.strokeStyle = 'rgba(168,176,188,0.45)'; x.lineWidth = 1.5 * lw;
    x.beginPath(); x.arc(cx, cy, rSignInner, 0, Math.PI * 2); x.stroke();
    x.strokeStyle = 'rgba(168,176,188,0.3)'; x.lineWidth = 1 * lw;
    x.beginPath(); x.arc(cx, cy, rBand, 0, Math.PI * 2); x.stroke();
    x.strokeStyle = 'rgba(168,176,188,0.22)'; x.lineWidth = 1 * lw;
    x.beginPath(); x.arc(cx, cy, rInner, 0, Math.PI * 2); x.stroke();

    // Sign sectors
    for (let i = 0; i < 12; i++) {
      const a1 = ang(i * 30), a2 = ang((i + 1) * 30);
      const sign = SIGNS_ORDER[i];
      x.fillStyle = ELEMENT_SECTOR[sign] || 'transparent';
      x.beginPath(); x.moveTo(cx, cy);
      x.arc(cx, cy, rOuter, a1, a2, a1 > a2); x.closePath(); x.fill();

      x.strokeStyle = 'rgba(168,176,188,0.3)'; x.lineWidth = 1 * lw;
      x.beginPath();
      x.moveTo(cx + Math.cos(a1) * rSignInner, cy + Math.sin(a1) * rSignInner);
      x.lineTo(cx + Math.cos(a1) * rOuter,     cy + Math.sin(a1) * rOuter);
      x.stroke();

      const mid = ang(i * 30 + 15);
      const gR  = (rBand + rSignInner) / 2;
      drawWheelSignSeal(x, sign, cx + Math.cos(mid) * gR, cy + Math.sin(mid) * gR, R * 0.1);
    }

    // 10° ticks
    x.strokeStyle = 'rgba(168,176,188,0.4)';
    for (let d2 = 0; d2 < 360; d2 += 10) {
      if (d2 % 30 === 0) continue;
      const a = ang(d2);
      x.lineWidth = 1 * lw;
      x.beginPath();
      x.moveTo(cx + Math.cos(a) * rSignInner,            cy + Math.sin(a) * rSignInner);
      x.lineTo(cx + Math.cos(a) * (rSignInner + 12 * lw), cy + Math.sin(a) * (rSignInner + 12 * lw));
      x.stroke();
    }

    // Aspect lines
    const ASPECT_LINE_COLORS = {
      Trine: '#3fae7a', Sextile: '#9db36a', Conjunction: '#e8c96a',
      Opposition: '#b04a52', Square: '#b04a52',
    };
    (chart.renderAspects || []).slice(0, 24).forEach(asp => {
      const p1 = chart.positions[asp.planet1], p2 = chart.positions[asp.planet2];
      if (!p1 || !p2) return;
      const a1 = ang(p1.lon), a2 = ang(p2.lon);
      const col = ASPECT_LINE_COLORS[asp.aspect] || 'rgba(168, 158, 136,0.3)';
      x.strokeStyle = col.startsWith('rgba') ? col : col + '66';
      x.globalAlpha = 0.5; x.lineWidth = 1.5 * lw;
      x.beginPath();
      x.moveTo(cx + Math.cos(a1) * (rInner - 8 * lw), cy + Math.sin(a1) * (rInner - 8 * lw));
      x.lineTo(cx + Math.cos(a2) * (rInner - 8 * lw), cy + Math.sin(a2) * (rInner - 8 * lw));
      x.stroke();
      x.globalAlpha = 1;
    });

    // House spokes
    (chart.houses || []).forEach(cusp => {
      const a = ang(cusp);
      x.strokeStyle = 'rgba(168, 158, 136,0.2)'; x.lineWidth = 1 * lw;
      x.beginPath(); x.moveTo(cx, cy);
      x.lineTo(cx + Math.cos(a) * rInner, cy + Math.sin(a) * rInner); x.stroke();
    });

    // Ascendant axis
    const aAsc = ang(ascLon);
    x.strokeStyle = 'rgba(176,74,82,0.9)'; x.lineWidth = 2.5 * lw;
    x.beginPath();
    x.moveTo(cx + Math.cos(aAsc) * rInner,     cy + Math.sin(aAsc) * rInner);
    x.lineTo(cx + Math.cos(aAsc) * rSignInner, cy + Math.sin(aAsc) * rSignInner);
    x.stroke();
    x.fillStyle = '#c97a82';
    x.font = `bold ${R * 0.05}px ${FONT_SANS}`;
    x.textBaseline = 'middle'; x.textAlign = 'center';
    x.fillText('ASC', cx + Math.cos(aAsc) * (rInner - 32 * lw), cy + Math.sin(aAsc) * (rInner - 32 * lw));

    // Planet glyphs with halo + collision offset
    const PLANET_ORDER_WHEEL = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'];
    const placed = [];
    PLANET_ORDER_WHEEL.forEach(k => {
      const p = chart.positions[k];
      if (!p) return;
      let lon2 = p.lon;
      while (placed.some(q => Math.abs(((q - lon2) + 540) % 360 - 180) < 8)) lon2 += 8;
      placed.push(lon2);
      const a = ang(lon2);
      const px2 = cx + Math.cos(a) * rPlanets;
      const py2 = cy + Math.sin(a) * rPlanets;

      const at2 = ang(p.lon);
      x.strokeStyle = 'rgba(240,232,216,0.45)'; x.lineWidth = 1 * lw;
      x.beginPath();
      x.moveTo(cx + Math.cos(at2) * rSignInner,            cy + Math.sin(at2) * rSignInner);
      x.lineTo(cx + Math.cos(at2) * (rSignInner - 14 * lw), cy + Math.sin(at2) * (rSignInner - 14 * lw));
      x.stroke();

      const haloR = R * 0.07;
      const haloGrad = x.createRadialGradient(px2, py2, 0, px2, py2, haloR);
      haloGrad.addColorStop(0, 'rgba(168,176,188,0.22)');
      haloGrad.addColorStop(1, 'transparent');
      x.fillStyle = haloGrad;
      x.beginPath(); x.arc(px2, py2, haloR, 0, Math.PI * 2); x.fill();

      // Engraved planet seal when preloaded; unicode only as last-resort fallback
      const seals = window.APCanvasSeals;
      const sealSz = R * 0.105;
      let drewSeal = false;
      if (seals && typeof seals.drawPlanetSeal === 'function') {
        drewSeal = seals.drawPlanetSeal(x, k, px2, py2, sealSz);
      }
      if (!drewSeal) {
        x.fillStyle = PAL.parchment;
        x.font = `400 ${R * 0.112}px ${FONT_DISPLAY}`;
        x.textBaseline = 'middle'; x.textAlign = 'center';
        x.fillText(PLANET_GLYPHS[k] || k.charAt(0), px2, py2);
      }

      if (p.retrograde) {
        x.fillStyle = '#c97a82';
        x.font = `500 ${R * 0.04}px "IBM Plex Mono", ${FONT_SANS}`;
        x.fillText('℞', px2 + R * 0.055, py2 - R * 0.05);
      }
    });
    x.textBaseline = 'alphabetic';

    // Centre star
    x.fillStyle = 'rgba(168,176,188,0.95)';
    x.font = `400 ${R * 0.14}px ${FONT_DISPLAY}`;
    x.textBaseline = 'middle'; x.textAlign = 'center';
    if (window.AstroUI && AstroUI.drawStar4) {
      x.fillStyle = 'rgba(168,176,188,0.95)';
      AstroUI.drawStar4(x, cx, cy, R * 0.12);
    }
    x.textBaseline = 'alphabetic';
  }

  // ── Shared building blocks for the poster layout (used by 'print' & 'story') ─

  // Elemental distribution bars (centred), origin at (x0, y0), bar width barW.
  function paintElementBars(x, chart, x0, y0, barW, scale) {
    const elems = computeElements(chart.positions);
    x.textAlign = 'center';
    x.fillStyle = PAL.gold;
    x.font = `600 ${22 * scale}px ${FONT_SANS}`;
    x.fillText('E L E M E N T A L   D I S T R I B U T I O N', x0 + barW / 2, y0);

    x.strokeStyle = 'rgba(168,176,188,0.22)'; x.lineWidth = 1 * scale;
    x.beginPath(); x.moveTo(x0, y0 + 16 * scale); x.lineTo(x0 + barW, y0 + 16 * scale); x.stroke();

    const rows = [
      { key: 'fire',  label: 'Fire',  color: ELEMENT_COLORS.fire,  lColor: ELEMENT_LABEL_COLORS.fire  },
      { key: 'earth', label: 'Earth', color: ELEMENT_COLORS.earth, lColor: ELEMENT_LABEL_COLORS.earth },
      { key: 'air',   label: 'Air',   color: ELEMENT_COLORS.air,   lColor: ELEMENT_LABEL_COLORS.air   },
      { key: 'water', label: 'Water', color: ELEMENT_COLORS.water, lColor: ELEMENT_LABEL_COLORS.water },
    ];
    const maxCount = 7;
    const BAR_H = 26 * scale;
    const innerW = barW - 220 * scale;     // leave room for label + count
    const innerX = x0 + 110 * scale;
    rows.forEach((er, idx) => {
      const rowY = y0 + 50 * scale + idx * 58 * scale;
      const count = elems[er.key] || 0;
      const fillW = (count / maxCount) * innerW;

      x.textAlign = 'left';
      x.fillStyle = er.lColor;
      x.font = `600 ${20 * scale}px ${FONT_SANS}`;
      x.fillText(er.label.toUpperCase(), x0, rowY + BAR_H / 2 + 7 * scale);

      x.fillStyle = 'rgba(168, 158, 136,0.08)';
      x.beginPath();
      if (x.roundRect) x.roundRect(innerX, rowY, innerW, BAR_H, 6 * scale); else x.rect(innerX, rowY, innerW, BAR_H);
      x.fill();

      if (fillW > 0) {
        const bg = x.createLinearGradient(innerX, 0, innerX + fillW, 0);
        bg.addColorStop(0, er.color); bg.addColorStop(1, er.color + 'aa');
        x.fillStyle = bg;
        x.beginPath();
        if (x.roundRect) x.roundRect(innerX, rowY, fillW, BAR_H, 6 * scale); else x.rect(innerX, rowY, fillW, BAR_H);
        x.fill();
      }

      x.textAlign = 'right';
      x.fillStyle = PAL.silver;
      x.font = `400 ${18 * scale}px ${FONT_SANS}`;
      x.fillText(`${count} planet${count !== 1 ? 's' : ''}`, x0 + barW, rowY + BAR_H / 2 + 7 * scale);
    });
  }

  // Two-column planetary placements table, full content width.
  function paintPlacementTable(x, chart, x0, y0, colW, scale) {
    x.textAlign = 'center';
    x.fillStyle = PAL.gold;
    x.font = `600 ${22 * scale}px ${FONT_SANS}`;
    x.fillText('P L A N E T A R Y   P L A C E M E N T S', x0 + colW, y0);

    x.strokeStyle = 'rgba(168,176,188,0.22)'; x.lineWidth = 1 * scale;
    x.beginPath(); x.moveTo(x0, y0 + 14 * scale); x.lineTo(x0 + colW * 2, y0 + 14 * scale); x.stroke();

    const PLANET_ORDER_TABLE = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'];
    const cols = [[], []];
    PLANET_ORDER_TABLE.forEach((k, i) => {
      const p = chart.positions[k];
      if (p) cols[i % 2].push({ k, p, h: chart.planetHouses[k] });
    });

    const ROW_H = 56 * scale;
    cols.forEach((col, c) => {
      const colX = x0 + c * colW + (c === 0 ? 0 : 40 * scale);
      col.forEach((row, r) => {
        const ry = y0 + 36 * scale + r * ROW_H;
        if (r > 0) {
          x.strokeStyle = 'rgba(168, 158, 136,0.08)'; x.lineWidth = 1 * scale;
          x.beginPath(); x.moveTo(colX, ry - 6 * scale); x.lineTo(colX + colW - 60 * scale, ry - 6 * scale); x.stroke();
        }
        x.textAlign = 'left';
        x.fillStyle = PAL.gold;
        x.font = `400 ${36 * scale}px ${FONT_DISPLAY}`;
        x.fillText(PLANET_GLYPHS[row.k] || '', colX, ry + 20 * scale);

        x.fillStyle = PAL.parchment;
        x.font = `600 ${24 * scale}px ${FONT_SANS}`;
        x.fillText(row.k, colX + 56 * scale, ry + 10 * scale);

        x.fillStyle = PAL.silver;
        x.font = `400 ${22 * scale}px ${FONT_SANS}`;
        x.fillText(row.p.sign, colX + 56 * scale, ry + 34 * scale);

        if (row.h) {
          x.fillStyle = PAL.silverDim;
          x.font = `400 ${18 * scale}px ${FONT_SANS}`;
          x.fillText(`H${row.h}`, colX + 240 * scale, ry + 10 * scale);
        }

        x.fillStyle = PAL.gold;
        x.font = `400 ${18 * scale}px "Courier New", monospace`;
        x.textAlign = 'right';
        x.fillText(
          `${Math.floor(row.p.degree)}°${String(Math.round((row.p.degree - Math.floor(row.p.degree)) * 60)).padStart(2,'0')}′${row.p.retrograde ? ' ℞' : ''}`,
          colX + colW - 60 * scale, ry + 10 * scale);
      });
    });
  }

  // Lock-screen wallpaper — warm void, centred wheel, big three, minimal chrome.
  function paintWallpaperImage(chart) {
    const fmt = SHARE_FORMATS.wallpaper;
    const W = fmt.w, H = fmt.h;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const x = (window.RafCore && window.RafCore.prepExportCtx)
      ? window.RafCore.prepExportCtx(cv, W, H)
      : cv.getContext('2d');
    if (x && !x.imageSmoothingQuality) { x.imageSmoothingEnabled = true; }
    const S = W / 1080;
    const seed = seedFromChart(chart);

    // Warm void ground (lighter vignette — clock widgets sit on top)
    const g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#07070A');
    g.addColorStop(0.45, PAL.voidWarm);
    g.addColorStop(1, '#121826');
    x.fillStyle = g; x.fillRect(0, 0, W, H);

    const neb = x.createRadialGradient(W * 0.5, H * 0.42, 0, W * 0.5, H * 0.42, Math.max(W, H) * 0.85);
    neb.addColorStop(0, 'rgba(168,176,188,0.14)');
    neb.addColorStop(0.55, 'rgba(74,117,128,0.08)');
    neb.addColorStop(1, 'transparent');
    x.fillStyle = neb; x.fillRect(0, 0, W, H);

    drawDotGrid(x, W, H, S);
    drawStars(x, W, H, Math.round((W * H) / 6200), seed, S);

    const safeTop = 200 * S;
    const safeBot = 280 * S;

    // Name — upper safe band
    x.textAlign = 'center';
    let y = safeTop + 24 * S;
    x.fillStyle = PAL.parchment;
    fitText(x, chart.name || 'Birth Chart', W / 2, y, W - 120 * S, 'bold', 52 * S, FONT_DISPLAY);

    // Big-three one-liner
    y += 52 * S;
    x.fillStyle = PAL.goldPale;
    x.font = `500 ${22 * S}px ${FONT_SANS}`;
    x.fillText(
      `☉ ${chart.positions.Sun.sign}   ·   ☽ ${chart.positions.Moon.sign}   ·   ↑ ${chart.risingSign}`,
      W / 2, y);

    // Glass orbs row
    y += 56 * S;
    const trio = [
      { sign: chart.positions.Sun.sign,  label: 'SUN' },
      { sign: chart.positions.Moon.sign, label: 'MOON' },
      { sign: chart.risingSign,          label: 'RISING' },
    ];
    const orbR = 44 * S;
    const gap = 168 * S;
    trio.forEach((t, i) => {
      const tx = W / 2 + (i - 1) * gap;
      const elemCol = ELEMENT_COLORS[ELEMENT_MAP[t.sign]] || PAL.lapis;
      drawSignOrb(x, t.sign, tx, y, orbR, elemCol);
      x.fillStyle = PAL.goldPale;
      x.font = `600 ${12 * S}px ${FONT_SANS}`;
      x.textAlign = 'center';
      x.fillText(t.label, tx, y + orbR + 20 * S);
    });

    // Centred natal wheel — main focal point for lock screen
    const wheelTop = y + orbR + 72 * S;
    const wheelBot = H - safeBot - 48 * S;
    const wheelCY = (wheelTop + wheelBot) / 2;
    const wheelR = Math.min((W - 96 * S) / 2, (wheelBot - wheelTop) / 2);
    drawWheel(x, chart, W / 2, wheelCY, wheelR);

    // Subtle footer (below thumb zone)
    x.strokeStyle = 'rgba(168,176,188,0.18)'; x.lineWidth = 1 * S;
    x.beginPath(); x.moveTo(W * 0.28, H - safeBot + 36 * S); x.lineTo(W * 0.72, H - safeBot + 36 * S); x.stroke();
    x.fillStyle = PAL.silverDim;
    x.font = `400 ${16 * S}px ${FONT_SANS}`;
    x.textAlign = 'center';
    x.fillText('astroprecise  ·  your sky', W / 2, H - safeBot + 72 * S);

    return cv;
  }

  // Big Three only — square social card, no natal wheel.
  function paintBigThreeCard(chart) {
    const fmt = SHARE_FORMATS.bigthree;
    const W = fmt.w, H = fmt.h;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const x = (window.RafCore && window.RafCore.prepExportCtx)
      ? window.RafCore.prepExportCtx(cv, W, H)
      : cv.getContext('2d');
    if (x && !x.imageSmoothingQuality) { x.imageSmoothingEnabled = true; }
    const S = W / 1080;
    const seed = seedFromChart(chart);

    paintBackground(x, W, H, seed, S, _engineSkyImg);
    drawFrame(x, W, H, 36 * S, 52 * S);

    x.textAlign = 'center';
    let y = 100 * S;
    x.fillStyle = PAL.gold;
    x.font = `500 ${20 * S}px ${FONT_DISPLAY}`;
    x.fillText('A S T R O P R E C I S E', W / 2, y);

    y += 32 * S;
    x.fillStyle = PAL.goldPale;
    x.font = `500 ${14 * S}px ${FONT_SANS}`;
    x.fillText('B I G   T H R E E', W / 2, y);

    y += 64 * S;
    x.fillStyle = PAL.parchment;
    fitText(x, chart.name || 'Birth Chart', W / 2, y, W - 160 * S, 'bold', 56 * S, FONT_DISPLAY);

    y += 48 * S;
    const cityShort = (chart.city || '').split(',')[0];
    x.fillStyle = PAL.silver;
    x.font = `400 ${20 * S}px ${FONT_SANS}`;
    x.fillText(
      `${chart.birthDate}${chart.birthTime ? ' · ' + chart.birthTime : ''}${cityShort ? '  ·  ' + cityShort : ''}`,
      W / 2, y);

    y += 100 * S;
    const trio = [
      { key: 'Sun',  sign: chart.positions.Sun.sign,  label: 'SUN',    glyph: '☉' },
      { key: 'Moon', sign: chart.positions.Moon.sign, label: 'MOON',   glyph: '☽' },
      { sign: chart.risingSign, label: 'RISING', glyph: '↑' },
    ];
    const orbR = 78 * S;
    const gap = 220 * S;
    trio.forEach((t, i) => {
      const tx = W / 2 + (i - 1) * gap;
      const elemCol = ELEMENT_COLORS[ELEMENT_MAP[t.sign]] || PAL.lapis;
      drawSignOrb(x, t.sign, tx, y, orbR, elemCol);

      x.fillStyle = PAL.gold;
      x.font = `600 ${13 * S}px ${FONT_SANS}`;
      x.fillText(t.label, tx, y + orbR + 28 * S);

      x.fillStyle = PAL.parchment;
      x.font = `600 ${28 * S}px ${FONT_SANS}`;
      x.fillText(t.sign, tx, y + orbR + 58 * S);

      const pos = t.key && chart.positions[t.key];
      if (pos) {
        x.fillStyle = PAL.silverDim;
        x.font = `400 ${17 * S}px ${FONT_SANS}`;
        x.fillText(
          `${Math.floor(pos.degree)}°${String(Math.round((pos.degree - Math.floor(pos.degree)) * 60)).padStart(2, '0')}′`,
          tx, y + orbR + 82 * S);
      }
    });

    y += orbR + 120 * S;
    const dom = [
      chart.dominantElement ? cap(chart.dominantElement) + ' Energy' : '',
      chart.dominantModality ? cap(chart.dominantModality) + ' Mode' : '',
    ].filter(Boolean).join('   ·   ');
    if (dom) {
      x.fillStyle = PAL.silverDim;
      x.font = `400 ${18 * S}px ${FONT_SANS}`;
      x.fillText(dom, W / 2, y);
    }

    x.strokeStyle = 'rgba(168,176,188,0.25)'; x.lineWidth = 1 * S;
    x.beginPath(); x.moveTo(W * 0.2, H - 88 * S); x.lineTo(W * 0.8, H - 88 * S); x.stroke();
    x.fillStyle = PAL.silverDim;
    x.font = `400 ${17 * S}px ${FONT_SANS}`;
    x.fillText('astroprecise  ·  wear your sky', W / 2, H - 58 * S);

    return cv;
  }

  // ── THE UNIFIED PAINTER ───────────────────────────────────────────────────
  // Returns a canvas for the requested format. Dedicated layouts for wallpaper &
  // bigthree; other formats share header → wheel → footer spine.
  function paintShareImage(chart, format) {
    if (format === 'wallpaper') return paintWallpaperImage(chart);
    if (format === 'bigthree') return paintBigThreeCard(chart);

    const fmt = SHARE_FORMATS[format] || SHARE_FORMATS.square;
    const W = fmt.w, H = fmt.h;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const x = (window.RafCore && window.RafCore.prepExportCtx)
      ? window.RafCore.prepExportCtx(cv, W, H)
      : cv.getContext('2d');
    if (x && !x.imageSmoothingQuality) { x.imageSmoothingEnabled = true; }
    const S = W / 1080;                       // scale relative to the 1080-wide baseline
    const seed = seedFromChart(chart);

    paintBackground(x, W, H, seed, S, _engineSkyImg);
    drawFrame(x, W, H, 44 * S, 62 * S);

    const cityShort = (chart.city || '').split(',')[0];
    const plateLbl = enginePlateLabelForChart(chart);
    const accLine = 'VSOP87 · ELP2000 · private browser math · not AI art';

    // ── Header (shared) ──
    x.textAlign = 'center';
    let y = 116 * S;
    x.fillStyle = PAL.gold;
    x.font = `500 ${24 * S}px ${FONT_DISPLAY}`;
    x.fillText('A S T R O P R E C I S E', W / 2, y);

    y += 36 * S;
    x.fillStyle = PAL.goldPale;
    x.font = `500 ${16 * S}px ${FONT_SANS}`;
    x.fillText('N A T A L   C H A R T', W / 2, y);

    y += 78 * S;
    x.fillStyle = PAL.parchment;
    fitText(x, chart.name || 'Birth Chart', W / 2, y, W - 200 * S, 'bold', 68 * S, FONT_DISPLAY);

    y += 50 * S;
    x.fillStyle = PAL.silver;
    x.font = `400 ${26 * S}px ${FONT_SANS}`;
    x.fillText(
      `${chart.birthDate}${chart.birthTime ? ' · ' + chart.birthTime : ''}${cityShort ? '  ·  ' + cityShort : ''}`,
      W / 2, y);

    // ── Big-Three glass orbs (shared) ──
    y += 78 * S;
    const trio = [
      { sign: chart.positions.Sun.sign,  label: 'SUN' },
      { sign: chart.positions.Moon.sign, label: 'MOON' },
      { sign: chart.risingSign,          label: 'RISING' },
    ];
    const orbR = 56 * S;
    const gap  = (format === 'square') ? 200 * S : 230 * S;
    trio.forEach((t, i) => {
      const tx = W / 2 + (i - 1) * gap;
      const elemCol = ELEMENT_COLORS[ELEMENT_MAP[t.sign]] || PAL.lapis;
      drawSignOrb(x, t.sign, tx, y, orbR, elemCol);
      x.fillStyle = PAL.goldPale;
      x.font = `600 ${15 * S}px ${FONT_SANS}`;
      x.textAlign = 'center';
      x.fillText(t.label, tx, y + orbR + 26 * S);
      x.fillStyle = PAL.silver;
      x.font = `400 ${17 * S}px ${FONT_SANS}`;
      x.fillText(t.sign, tx, y + orbR + 48 * S);
    });

    // Dominant-energy line
    y += orbR + 86 * S;
    const dom = [
      chart.dominantElement ? cap(chart.dominantElement) + ' Energy' : '',
      chart.dominantModality ? cap(chart.dominantModality) + ' Mode' : '',
      chart.chartRuler ? cap(chart.chartRuler) + ' Rules' : '',
    ].filter(Boolean).join('   ·   ');
    if (dom) {
      x.fillStyle = PAL.silverDim;
      x.font = `400 ${20 * S}px ${FONT_SANS}`;
      x.textAlign = 'center';
      x.fillText(dom, W / 2, y);
    }

    // ── Natal wheel + detail panels (height-aware so every format fits) ──
    // Everything below the header lives in the band between the dominant line and
    // the footer. We reserve space for the optional panels first, then size the
    // wheel to fill what remains — so nothing ever overflows the canvas.
    const bandTop = y + 28 * S;
    const bandBot = H - 132 * S;            // just above the footer rule
    const margin  = 150 * S;
    const contentW = W - margin * 2;

    // Panel heights (must match what paintElementBars / paintPlacementTable draw).
    const ELEM_BARS_H = 50 * S + 4 * 58 * S + 26 * S;     // title + 4 rows
    const PLACE_ROWS  = 5;                                 // 10 planets / 2 cols
    const PLACE_H     = 36 * S + PLACE_ROWS * 56 * S;      // title offset + rows
    const PANEL_GAP   = 64 * S;

    // What each format stacks below the wheel, chosen so the wheel stays large
    // and nothing overflows the canvas:
    //   square — wheel only (single-screen social post)
    //   story  — wheel + element bars (9:16, room for one panel)
    //   print  — wheel + full placement table (A4 poster; the data people frame)
    let showBars = false, showTable = false, reserved = 0;
    if (format === 'print') {
      showTable = true;
      reserved = PANEL_GAP + PLACE_H;
    } else if (format === 'story') {
      showBars = true;
      reserved = PANEL_GAP + ELEM_BARS_H;
    }

    const wheelBandBot = bandBot - reserved;
    let wheelR = Math.min(contentW / 2, (wheelBandBot - bandTop) / 2);
    if (format === 'square') wheelR = Math.min(wheelR, W * 0.24);
    const wheelCY = (bandTop + wheelBandBot) / 2;
    drawWheel(x, chart, W / 2, wheelCY, wheelR);

    let py = wheelCY + wheelR + PANEL_GAP;
    if (showBars)  { paintElementBars(x, chart, margin, py, contentW, S); py += ELEM_BARS_H + PANEL_GAP; }
    if (showTable) { paintPlacementTable(x, chart, margin, py, contentW / 2, S); }

    // ── Footer (shared) ──
    x.textAlign = 'center';
    x.strokeStyle = 'rgba(168,176,188,0.25)'; x.lineWidth = 1 * S;
    x.beginPath(); x.moveTo(W * 0.2, H - 108 * S); x.lineTo(W * 0.8, H - 108 * S); x.stroke();
    x.fillStyle = PAL.silverDim;
    x.font = `400 ${18 * S}px ${FONT_SANS}`;
    x.fillText(`astroprecise  ·  ${accLine}`, W / 2, H - 88 * S);
    x.fillStyle = 'rgba(168,158,136,0.9)';
    x.font = `400 ${13 * S}px ${FONT_SANS}`;
    x.fillText('Wheel = your degrees · window = ' + plateLbl + ' · free PNG ≠ paid print', W / 2, H - 58 * S);

    return cv;
  }

  // Format wrappers (kept as named entry points the rest of the app can call).
  function drawChartPoster(chart) { return paintShareImage(chart, 'print'); }
  function drawShareImageSquare(chart) { return paintShareImage(chart, 'square'); }
  function drawShareImageStory(chart) { return paintShareImage(chart, 'story'); }

  const slugify = name =>
    (name || 'chart').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'chart';

  // Canvas → Blob (toBlob preferred; dataURL fallback for older engines).
  function canvasToBlob(cv) {
    return new Promise(resolve => {
      if (cv.toBlob) {
        cv.toBlob(b => resolve(b), 'image/png');
      } else {
        const data = cv.toDataURL('image/png');
        const bin = atob(data.split(',')[1]);
        const arr = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        resolve(new Blob([arr], { type: 'image/png' }));
      }
    });
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.download = filename; a.href = url;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  // One-tap export: Web Share (with image file) where supported, else download.
  async function exportShareImage(chart, format, opts) {
    opts = opts || {};
    // Masterpiece path: preload zodiac + planet seals + engine plate before paint.
    // Await plate fully (no 900ms race that could paint a prior chart's still).
    try {
      const plateP = ensureEngineSkyPlate(chart);
      if (window.APCanvasSeals) {
        const signs = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
        const planets = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'];
        await Promise.all([
          APCanvasSeals.preload ? APCanvasSeals.preload(signs) : Promise.resolve(),
          APCanvasSeals.preloadPlanets ? APCanvasSeals.preloadPlanets(planets) : Promise.resolve(),
          plateP,
        ]);
      } else {
        await plateP;
      }
    } catch (e) { /* paint with fallbacks */ }

    const cv = paintShareImage(chart, format);
    const nameMap = {
      print: 'natal-poster',
      wallpaper: 'wallpaper',
      bigthree: 'big-three',
    };
    const filename = `${slugify(chart.name)}-${nameMap[format] || 'natal-' + format}.png`;
    const blob = await canvasToBlob(cv);
    if (!blob) { if (window.AstroApp) AstroApp.showToast('Export failed', 'Could not render the image.', 'error'); return; }

    // Try the Web Share API with a file (mobile-first), unless caller forces download.
    if (!opts.forceDownload && navigator.canShare && navigator.share) {
      try {
        const file = new File([blob], filename, { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'My Birth Chart — Astro Precise',
            text: `${chart.name}: ☉ ${chart.positions.Sun.sign} · ☽ ${chart.positions.Moon.sign} · ↑ ${chart.risingSign}`,
          });
          return; // shared successfully
        }
      } catch (e) {
        if (e && e.name === 'AbortError') return; // user cancelled — do nothing
        // otherwise fall through to download
      }
    }
    downloadBlob(blob, filename);
    if (window.AstroApp) {
      const labels = {
        square: 'Square image', story: 'Story image', print: 'Print poster',
        wallpaper: 'Phone wallpaper', bigthree: 'Big Three card',
      };
      AstroApp.showToast('Saved', `${labels[format] || 'Image'} downloaded.`, 'success');
    }
  }

  // Tiny chooser so one button can offer all three formats without a framework.
  function openShareFormatMenu(anchorBtn) {
    if (!currentChart) return;
    document.getElementById('share-format-menu')?.remove();
    const menu = document.createElement('div');
    menu.id = 'share-format-menu';
    menu.setAttribute('role', 'menu');
    menu.style.cssText =
      'position:absolute;z-index:1200;min-width:240px;padding:8px;border-radius:14px;' +
      'background:rgba(26, 34, 48,0.97);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);' +
      'border:1px solid rgba(168,176,188,0.35);box-shadow:0 24px 60px rgba(0,0,0,0.6);';
    const opts = [
      { fmt: 'print',  title: '★ Masterpiece poster · 4960×7016', sub: 'Ultra HD wall plate — seals + engine sky' },
      { fmt: 'square', title: 'Square · 2160×2160 HD', sub: 'Instagram & social — masterpiece quality' },
      { fmt: 'story',  title: 'Story · 2160×3840 HD',  sub: 'IG / WhatsApp stories' },
      { fmt: 'wallpaper', title: 'Phone wallpaper · 1080×1920', sub: 'Lock screen — your chart' },
      { fmt: 'bigthree',  title: 'Big Three card · 1080×1080', sub: 'Sun, Moon & Rising only' },
      { fmt: 'square1x', title: 'Square · 1080×1080', sub: 'Smaller file size' },
    ];
    menu.innerHTML = opts.map(o =>
      `<button type="button" role="menuitem" data-fmt="${o.fmt}" style="display:block;width:100%;text-align:left;` +
      `padding:10px 12px;margin:2px 0;border:none;border-radius:10px;background:transparent;cursor:pointer;color:var(--ap-text-primary,#E8EBF0);` +
      `font-family:Inter,sans-serif;transition:background .15s;">` +
      `<span style="display:block;font-weight:600;font-size:0.8rem;letter-spacing:0.04em;">${o.title}</span>` +
      `<span style="display:block;font-size:0.66rem;color:var(--ap-text-muted,#8B919C);margin-top:2px;">${o.sub}</span></button>`
    ).join('');

    document.body.appendChild(menu);
    const r = anchorBtn.getBoundingClientRect();
    menu.style.top  = (r.bottom + window.scrollY + 8) + 'px';
    menu.style.left = (Math.min(r.left + window.scrollX, window.scrollX + window.innerWidth - menu.offsetWidth - 12)) + 'px';

    const close = () => {
      menu.remove();
      document.removeEventListener('click', onDoc, true);
      document.removeEventListener('keydown', onKey, true);
      try { anchorBtn.focus(); } catch (e) {}
    };
    const onDoc = ev => { if (!menu.contains(ev.target) && ev.target !== anchorBtn) close(); };
    const onKey = ev => {
      if (ev.key === 'Escape') { ev.preventDefault(); close(); return; }
      if (ev.key === 'Tab') {
        const btns = menu.querySelectorAll('button[role="menuitem"]');
        if (!btns.length) return;
        const first = btns[0], last = btns[btns.length - 1];
        if (ev.shiftKey && document.activeElement === first) {
          ev.preventDefault(); last.focus();
        } else if (!ev.shiftKey && document.activeElement === last) {
          ev.preventDefault(); first.focus();
        }
      }
    };
    setTimeout(() => {
      document.addEventListener('click', onDoc, true);
      document.addEventListener('keydown', onKey, true);
      const first = menu.querySelector('button[role="menuitem"]');
      try { if (first) first.focus(); } catch (e) {}
    }, 0);

    menu.querySelectorAll('button[data-fmt]').forEach(b => {
      b.addEventListener('mouseenter', () => { b.style.background = 'rgba(168,176,188,0.12)'; });
      b.addEventListener('mouseleave', () => { b.style.background = 'transparent'; });
      b.addEventListener('click', () => { const f = b.dataset.fmt; close(); exportShareImage(currentChart, f); });
    });
  }

  // Poster button → defaults to the print-ready export (one-tap), long-standing label.
  document.getElementById('poster-btn')?.addEventListener('click', ev => {
    if (!currentChart) return;
    // Click opens the format menu so users can pick square / story / print.
    openShareFormatMenu(ev.currentTarget);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BIG THREE SHARE CARD — Sun/Moon/Rising orbs only (no natal wheel).
  // ═══════════════════════════════════════════════════════════════════════════

  function drawShareCard(chart) { return paintShareImage(chart, 'bigthree'); }

  function addShareCardButton() {
    // The HTML already has the buttons; wiring lives below. No-op kept for boot.
  }

  function initAdvancedAccordion() {
    const root = document.getElementById('chart-advanced');
    const item = document.getElementById('chart-advanced-item');
    const trigger = document.getElementById('chart-advanced-trigger');
    const panel = document.getElementById('chart-advanced-panel');
    if (!root || !item || !trigger || !panel) return;

    const mq = window.matchMedia('(max-width: 768px)');
    if (mq.matches) item.classList.remove('is-open');

    const sync = () => {
      const open = item.classList.contains('is-open');
      trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
      panel.style.maxHeight = open ? `${panel.scrollHeight}px` : '0';
    };

    trigger.addEventListener('click', () => {
      item.classList.toggle('is-open');
      sync();
    });

    if (mq.addEventListener) mq.addEventListener('change', sync);
    else mq.addListener(sync);
    sync();
  }

  // ── Boot ──────────────────────────────────────────────────────────────────
  // Run exactly once. This script is `defer`, so when it executes readyState is
  // already 'interactive' — without the guard BOTH the readyState branch and the
  // later DOMContentLoaded listener fired, double-wiring the accordion/node toggle
  // and calling restoreFromURL()→requestSubmit() twice.
  let booted = false;
  function initPersonalMemory() {
    if (!window.APPersonalMemory) return;
    var restored = APPersonalMemory.applyDraftToForm();
    if (restored && window.AstroApp) {
      AstroApp.showToast('Welcome back', 'Your last chart details were restored from this device.', 'success');
    }
    APPersonalMemory.watchChartForm(form);
    function refreshTimeGuide() {
      var guide = document.getElementById('time-accuracy-guide');
      if (!guide) return;
      APPersonalMemory.renderTimeAccuracyGuide(guide, {
        hasTime: !!document.getElementById('time-input')?.value,
        approximate: false,
      });
    }
    refreshTimeGuide();
    document.getElementById('time-input')?.addEventListener('input', refreshTimeGuide);
    document.getElementById('time-input')?.addEventListener('change', refreshTimeGuide);
  }

  function mountChartAI(chart) {
    if (!window.APAIAssistant) return;
    var panel = document.getElementById('chart-ai-panel');
    if (!panel) return;
    var getter = function () { return chart || currentChart; };
    APAIAssistant.mountPanel(panel, getter, { pageKey: 'chart-ai-panel' });
  }

  function boot() {
    if (booted) return;
    booted = true;
    addShareCardButton();
    initNodeToggle();
    initAdvancedAccordion();
    initPersonalMemory();
    mountChartAI(null);
    restoreFromURL();
    prefillDateFromURL();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

})();
