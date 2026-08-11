/**
 * Astro Precise — Birth Chart Page Controller
 * Wires the chart form to the ephemeris engine, renders results, and adds
 * city autocomplete, timezone-correct UT conversion, shareable links, a
 * downloadable natal plate, and a Big Three share card.
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
    conjunction:    { name:'Conjunction',    glyph:'☌', color:'#D8B46A' },
    opposition:     { name:'Opposition',     glyph:'☍', color:'#FF6428' },
    trine:          { name:'Trine',          glyph:'△', color:'#B9C8DC' },
    square:         { name:'Square',         glyph:'□', color:'#FF6428' },
    sextile:        { name:'Helpful angle',  glyph:'⚹', color:'#D8B46A' },
    quincunx:       { name:'Quincunx',       glyph:'⚻', color:'#B9C8DC' },
    semisquare:     { name:'SemiSquare',      glyph:'∠', color:'#B9C8DC' },
    sesquiquadrate: { name:'Sesquiquadrate', glyph:'⚼', color:'#B9C8DC' },
    semisextile:    { name:'Slight angle',    glyph:'⚺', color:'#B9C8DC' },
    quintile:       { name:'Quintile',        glyph:'Q', color:'#B9C8DC' },
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
    fire:  '#FF6428',
    earth: '#D8B46A',
    air:   '#F2ECDF',
    water: '#B9C8DC',
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
  let searchSeq   = 0;
  let searchTimer = 0;

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g,
    ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));

  const regionOf = c => c.admin ? `${c.admin}, ${c.country}` : c.country;

  function renderDropdown(items, source, state) {
    if (!dropdown) return;
    activeIdx = -1;
    cityInput.removeAttribute('aria-activedescendant');
    dropdown._items = items;
    if (state === 'searching') {
      dropdown.innerHTML = '<div class="autocomplete-note">Searching the gazetteer…</div>';
      dropdown.hidden = false;
      cityInput.setAttribute('aria-expanded', 'true');
      return;
    }
    if (!items.length) {
      if (state === 'empty') {
        dropdown.innerHTML = '<div class="autocomplete-note">No places matched — check the spelling, or try the nearest larger town.</div>';
        dropdown.hidden = false;
        cityInput.setAttribute('aria-expanded', 'true');
      } else {
        dropdown.innerHTML = '';
        dropdown.hidden = true;
        cityInput.setAttribute('aria-expanded', 'false');
      }
      return;
    }
    const note = source === 'offline'
      ? '<div class="autocomplete-note">Offline — built-in city list only</div>' : '';
    dropdown.innerHTML = items.map((c, i) =>
      `<div class="autocomplete-option" role="option" aria-selected="false" data-i="${i}" id="city-opt-${i}">
        <span aria-hidden="true"><svg class="eng-i" aria-hidden="true"><use href="#ei-pin"/></svg></span> <strong>${esc(c.name)}</strong><span class="autocomplete-option__region">${esc(regionOf(c))}</span>
      </div>`).join('') + note;
    dropdown.hidden = false;
    cityInput.setAttribute('aria-expanded', 'true');
    dropdown.querySelectorAll('.autocomplete-option').forEach(elx => {
      elx.addEventListener('pointerdown', ev => { ev.preventDefault(); pickCity(items[+elx.dataset.i]); });
    });
  }

  function pickCity(c) {
    searchSeq += 1;
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = 0;
    cityInput.value = c.admin ? `${c.name}, ${c.admin}, ${c.country}` : `${c.name}, ${c.country}`;
    cityInput.dataset.coordinatesLocked = 'true';
    latInput.value  = c.lat;
    lonInput.value  = c.lon;
    tzInput.value   = c.tz || '';
    dropdown.innerHTML = '';
    dropdown.hidden = true;
    cityInput.setAttribute('aria-expanded', 'false');
    cityInput.removeAttribute('aria-activedescendant');
    const cityHint = document.getElementById('city-hint');
    if (cityHint) {
      cityHint.dataset.state = 'selected';
      cityHint.firstChild.textContent = 'Coordinates locked for ' + c.name + '. ';
    }
    document.dispatchEvent(new CustomEvent('astro:city-selected'));
  }

  if (cityInput && dropdown) {
    cityInput.addEventListener('input', () => {
      const mySeq = ++searchSeq;
      if (searchTimer) clearTimeout(searchTimer);
      searchTimer = 0;
      cityInput.dataset.coordinatesLocked = 'false';
      const cityHint = document.getElementById('city-hint');
      if (cityHint && cityHint.firstChild) cityHint.firstChild.textContent = 'Pick a result for precise coordinates. ';
      latInput.value = ''; lonInput.value = ''; tzInput.value = '';
      const q = cityInput.value.trim();
      if (q.length < 2) { renderDropdown([], 'live', 'idle'); return; }
      renderDropdown([], 'live', 'searching');
      searchTimer = setTimeout(() => {
        searchTimer = 0;
        window.AstroApp.searchPlaces(q).then(({ results, source }) => {
          if (mySeq !== searchSeq || cityInput.value.trim() !== q || cityInput.dataset.coordinatesLocked === 'true') return;
          renderDropdown(results, source, results.length ? 'results' : 'empty');
        }).catch(() => {
          if (mySeq === searchSeq && cityInput.value.trim() === q) renderDropdown([], 'live', 'empty');
        });
      }, 250);
    });
    cityInput.addEventListener('keydown', ev => {
      const items = dropdown._items || [];
      if (!items.length) return;
      if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
        ev.preventDefault();
        activeIdx = (activeIdx + (ev.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length;
        dropdown.querySelectorAll('.autocomplete-option').forEach((elx, i) => {
          const selected = i === activeIdx;
          elx.classList.toggle('is-selected', selected);
          elx.setAttribute('aria-selected', selected ? 'true' : 'false');
        });
        cityInput.setAttribute('aria-activedescendant', `city-opt-${activeIdx}`);
      } else if (ev.key === 'Enter' && activeIdx >= 0) {
        ev.preventDefault();
        pickCity(items[activeIdx]);
      } else if (ev.key === 'Escape') {
        dropdown.innerHTML = ''; dropdown.hidden = true;
        cityInput.setAttribute('aria-expanded', 'false');
        cityInput.removeAttribute('aria-activedescendant');
      }
    });
    cityInput.addEventListener('blur', () => setTimeout(() => {
      dropdown.innerHTML = ''; dropdown.hidden = true;
      cityInput.setAttribute('aria-expanded', 'false');
      cityInput.removeAttribute('aria-activedescendant');
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

  function isValidTimeZone(tz) {
    if (typeof tz !== 'string' || !tz.trim()) return false;
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: tz }).format();
      return true;
    } catch (e) { return false; }
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

  function dominantPlacementValue(positions, lookup) {
    const counts = Object.create(null);
    ['Sun','Mercury','Venus','Mars','Jupiter','Saturn'].forEach(function (key) {
      const position = positions[key];
      const bucket = position && lookup[position.sign];
      if (bucket) counts[bucket] = (counts[bucket] || 0) + 1;
    });
    return Object.keys(counts).sort(function (a, b) {
      return counts[b] - counts[a] || a.localeCompare(b);
    })[0] || null;
  }

  function hasKnownBirthTime(chart) {
    return Boolean(chart && chart.timeKnown === true && chart.birthTime);
  }

  function adaptChart(raw, meta) {
    const timeKnown = meta.timeKnown === true;
    const positions = {};
    const planetHouses = {};
    for (const [k, cap] of Object.entries(KEY_MAP)) {
      // A neutral noon is used internally when time is unknown so the engine
      // can still calculate date-based placements. Never expose its Moon or
      // angles as if noon were the visitor's birth time.
      if (!timeKnown && ['Moon', 'Ascendant', 'Midheaven'].includes(cap)) continue;
      const p = raw.positions[k];
      if (!p) continue;
      positions[cap] = { lon: p.longitude, sign: p.sign, degree: p.degree, retrograde: p.retrograde };
      if (timeKnown && !['Ascendant', 'Midheaven'].includes(cap)) {
        planetHouses[cap] = houseOf(p.longitude, raw.houses);
      }
    }
    positions.NNode = positions.NorthNode;
    if (timeKnown) positions.MC = positions.Midheaven;

    const capAspect = s => {
      const d = ASPECT_DISPLAY[s];
      return d ? d.name : s.charAt(0).toUpperCase() + s.slice(1);
    };
    const MAJOR = ['conjunction', 'opposition', 'trine', 'square', 'sextile'];
    const timeSensitiveKeys = ['moon', 'asc', 'mc'];
    const usableAspect = a => KEY_MAP[a.planet1] && KEY_MAP[a.planet2]
      && (timeKnown || (!timeSensitiveKeys.includes(a.planet1) && !timeSensitiveKeys.includes(a.planet2)));
    const renderAspects = raw.aspects
      .filter(a => usableAspect(a) && MAJOR.includes(a.aspect))
      .map(a => ({ planet1: KEY_MAP[a.planet1], planet2: KEY_MAP[a.planet2], aspect: capAspect(a.aspect), orb: a.orb, applying: a.applying }));
    const interpAspects = raw.aspects
      .filter(usableAspect)
      .map(a => ({ planet1: KEY_MAP[a.planet1], planet2: KEY_MAP[a.planet2], aspect: a.aspect, orb: a.orb, applying: a.applying }));

    const dominantElement = timeKnown
      ? raw.dominantElement
      : dominantPlacementValue(positions, ELEMENT_MAP);
    const dominantModality = timeKnown
      ? raw.dominantModality
      : dominantPlacementValue(positions, MODALITY_MAP);

    return {
      ...meta,
      positions,
      houses: timeKnown ? raw.houses : null,
      renderAspects,
      aspects: interpAspects,
      planetHouses,
      asc: timeKnown ? raw.ascendant : null,
      mc: timeKnown ? raw.midheaven : null,
      risingSign: timeKnown ? E().signOf(raw.ascendant) : null,
      chartRuler: timeKnown ? raw.chartRuler : null,
      timeAccuracy: meta.timeAccuracy || (timeKnown ? 'exact' : 'unknown'),
      timezoneKnown: meta.timezoneKnown === true,
      houseSystem: meta.houseSystem || raw.houseSystem || 'equal',
      angleStatus: timeKnown ? 'computed' : 'withheld_time_unknown',
      dominant: { element: dominantElement, modality: dominantModality },
      dominantElement,
      dominantModality,
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
      const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    }
  }

  function readForm() {
    const name = document.getElementById('name-input').value.trim() || 'Birth Chart';
    const date = document.getElementById('date-input').value;
    const timeField = document.getElementById('time-input');
    const timeKnown = !!(timeField && timeField.value);
    // Noon is an internal neutral epoch only; never persist or present it as
    // the visitor's birth time. The result carries timeKnown/timeAccuracy.
    const time = timeKnown ? timeField.value : '12:00';
    const lat  = parseFloat(latInput.value);
    const lon  = parseFloat(lonInput.value);
    const tz   = (tzInput.value || '').trim();
    // Name is optional label — defaults to "Birth Chart" for exports
    if (!date) return { error: 'Please enter your birth date.', focus: 'date-input' };
    if (isNaN(lat) || isNaN(lon)) return { error: 'Please pick your birth city from the dropdown.', focus: 'city-input' };
    if (!isValidTimeZone(tz)) {
      return { error: 'Please pick a city with a recognised timezone before calculating.', focus: 'city-input' };
    }
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
      timeKnown,
      timezoneKnown: true,
      timeAccuracy: (document.getElementById('time-accuracy-input')?.value || '').trim() ||
        (document.getElementById('time-input').value ? 'exact' : 'unknown'),
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
      timeKnown: input.timeKnown === true,
      timeAccuracy: input.timeAccuracy || (input.timeKnown ? 'exact' : 'unknown'),
      city: input.city, lat: input.lat, lon: input.lon, tz: input.tz,
      timezoneKnown: input.timezoneKnown === true,
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
        // No updateShareURL() here any more. It used to replaceState() the
        // whole birth record — name, date, time, town, lat, lon, tz — into the
        // address bar on every calculation. Sharing never needed it: the Share
        // and Copy-link buttons build their URL on demand from the chart object
        // (buildChartShareUrl), so the only thing the address-bar write
        // achieved was putting birth data somewhere the visitor did not ask for
        // it — history, bookmarks, browser sync, and the next Referer header.
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

  // ── Restoring a complete chart ────────────────────────────────────────────

  /* Where a full chart restore (n, d, t, c, lat, lon, tz, a, hs) comes from,
     in priority order. Nothing on this route writes birth data into a
     network-visible query; deliberate shares use a client-only fragment.

       1. sessionStorage['ap-chart-restore'] — what the saved-chart galleries
          (charts.html, profile.html) now hand over. Same tab, same origin,
          never transmitted. Read once and deleted.
       2. location.hash — a chart somebody deliberately SHARED with this person
          (buildChartShareUrl). Sharing a chart is the feature; sending
          it to a server on the way is not, and a fragment is never part of the
          request line or the Referer. Stripped from the address bar on use.
       3. location.search — LEGACY. A query string reaches the origin and the
          CDN access logs and becomes a Cache Storage key, which is why nothing
          mints one now. Reading a link the visitor already holds is harmless;
          creating it was the harm. Do not reintroduce a query-string handoff. */
  function readRestoreParams() {
    try {
      const raw = sessionStorage.getItem('ap-chart-restore');
      if (raw) {
        sessionStorage.removeItem('ap-chart-restore');
        return { q: new URLSearchParams(raw), fromUrl: false };
      }
    } catch { /* storage blocked or malformed — fall through */ }

    if (location.hash && location.hash.length > 1) {
      try {
        const h = new URLSearchParams(location.hash.slice(1));
        if (h.get('d') && h.get('lat')) return { q: h, fromUrl: true };
      } catch { /* malformed fragment — fall through */ }
    }

    return { q: new URLSearchParams(location.search), fromUrl: true };
  }

  function restoreFromURL() {
    const { q, fromUrl } = readRestoreParams();
    if (!q.get('d') || !q.get('lat')) return;
    // A legacy link has served its purpose the moment it is read. Take it out
    // of the address bar rather than leave someone's birth record on screen to
    // be screenshotted, bookmarked or handed on with the next link they click.
    if (fromUrl) {
      try { history.replaceState(null, '', location.pathname); } catch { /* pre-history browser */ }
    }
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
    const accuracy = q.get('a');
    const accuracyInput = document.getElementById('time-accuracy-input');
    if (accuracyInput && /^(exact|approximate|unknown)$/.test(accuracy || '')) accuracyInput.value = accuracy;
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
        card.tabIndex = on ? 0 : -1;
      });
    }
    document.dispatchEvent(new CustomEvent('astro:city-selected'));
    ['name-input', 'date-input', 'time-input'].forEach(id =>
      document.getElementById(id).dispatchEvent(new Event('input')));
    if (accuracy) document.dispatchEvent(new CustomEvent('ap-time-accuracy', { detail: accuracy }));
    form.requestSubmit();
  }

  /* Where the homepage handoff comes from, in priority order. The first two
     never touch the network; the third is only there so links minted before
     2026-08-08 keep working.

       1. sessionStorage['ap-chart-handoff'] — what index.html writes. Same
          tab, same origin, never transmitted. Read once and deleted, so the
          details do not sit in the tab after they have been used.
       2. location.hash (#date=&time=&city=) — LEGACY ONLY. Current Home never
          writes birth details into the address bar, even when storage is blocked.
       3. location.search (?date=&time=&city=) — LEGACY ONLY. As of 2026-08-09
          nothing on this site mints one: lifepath.html, profile.html and
          js/charts-dashboard.js were the last three and now hand over in
          sessionStorage. A visitor may still have an old link bookmarked.
          Reading it is safe; the harm was in *creating* it, because a query
          string is written into the origin's and the CDN's access logs and
          becomes a Cache Storage key. Do not reintroduce a query handoff. */
  function readHandoff() {
    let src = null;

    try {
      const raw = sessionStorage.getItem('ap-chart-handoff');
      if (raw) {
        sessionStorage.removeItem('ap-chart-handoff');
        const o = JSON.parse(raw);
        if (o && typeof o === 'object') src = o;
      }
    } catch { /* storage blocked or malformed — fall through */ }

    if (!src && location.hash && location.hash.length > 1) {
      try {
        const h = new URLSearchParams(location.hash.slice(1));
        if (h.get('date') || h.get('time') || h.get('city')) {
          src = { date: h.get('date'), time: h.get('time'), city: h.get('city') };
          // Take it out of the address bar: it is used, and a fragment left
          // lying there gets copied, screenshotted and shared.
          history.replaceState(null, '', location.pathname + location.search);
        }
      } catch { /* malformed fragment — ignore */ }
    }

    if (!src) {
      const q = new URLSearchParams(location.search);
      src = { date: q.get('date'), time: q.get('time'), city: q.get('city') };
    }

    return src;
  }

  /* Handoff from the homepage coupon.
     Distinct from restoreFromURL(), which restores a complete shared chart
     (?d=&lat=…) and submits it.

     Until 2026-08-08 this function read ONLY `date`, so a homepage form that
     collected a town and a time threw both away and made the visitor type them
     again. It now carries all three, with one deliberate limit stated out loud:

       · date — filled and validated; the form group is marked valid.
       · time — filled, then an `input` event is dispatched so chart.html's own
         listener flips the time-accuracy status to "Exact time · Rising, MC and
         houses will be calculated". Setting the value without that event would
         leave the page saying the time was unknown while quietly using it.
       · city — filled as TEXT ONLY, and the `input` event fires the gazetteer
         search so the dropdown opens on the carried-over name. Coordinates are
         deliberately NOT set: a typed town name is not a location, and this
         page refuses to compute angles from one (readForm() rejects a chart
         with no lat/lon). Focus therefore lands on the city field so the
         visitor confirms the exact place — which is what the homepage coupon
         promises in so many words.

     Nothing already filled is overwritten: a restored draft or a shared-chart
     URL always wins over the handoff. */
  function prefillFromHandoff() {
    try {
      const routeQuery = new URLSearchParams(location.search);
      if (routeQuery.get('entry') === 'private-reentry') {
        try { history.replaceState(null, '', location.pathname); } catch (_) {}
        const wrap = document.getElementById('chart-form-wrapper');
        if (wrap && !document.getElementById('chart-handoff-note')) {
          const note = document.createElement('p');
          note.id = 'chart-handoff-note';
          note.className = 'chart-handoff-note';
          note.setAttribute('role', 'status');
          note.textContent = 'Private browser storage is blocked, so your birth details were not carried in the address bar. Re-enter them here to keep the chart private.';
          const header = wrap.querySelector('.form-glass__header');
          if (header && header.parentNode) header.parentNode.insertBefore(note, header.nextSibling);
          else wrap.insertBefore(note, wrap.firstChild);
        }
        const dateField = document.getElementById('date-input');
        if (dateField) setTimeout(() => dateField.focus(), 0);
      }
      const handoff = readHandoff();
      const d = handoff.date;
      const t = handoff.time;
      const c = handoff.city;

      const dateEl = document.getElementById('date-input');
      const timeEl = document.getElementById('time-input');
      const cityEl = document.getElementById('city-input');

      const gotDate = !!(d && /^\d{4}-\d{2}-\d{2}$/.test(d) && dateEl && !dateEl.value);
      const gotTime = !!(t && /^([01]\d|2[0-3]):[0-5]\d$/.test(t) && timeEl && !timeEl.value);
      // A place is only worth carrying if it is plausibly a place name.
      const cityName = (c || '').trim().slice(0, 120);
      const gotCity = !!(cityName.length >= 2 && cityEl && !cityEl.value);

      if (!gotDate && !gotTime && !gotCity) return;

      if (gotDate) {
        dateEl.value = d;
        dateEl.dispatchEvent(new Event('input', { bubbles: true }));
        const dateGroup = document.getElementById('group-date-first');
        if (dateGroup) dateGroup.classList.add('is-valid');
      }

      if (gotTime) {
        timeEl.value = t;
        // The form interaction listener below owns the accuracy status line.
        timeEl.dispatchEvent(new Event('input', { bubbles: true }));
        timeEl.dispatchEvent(new Event('change', { bubbles: true }));
      }

      if (gotCity) {
        cityEl.value = cityName;
        // Fires the gazetteer lookup and, importantly, clears any stale
        // lat/lon: a carried-over name is never treated as confirmed.
        cityEl.dispatchEvent(new Event('input', { bubbles: true }));
      }

      // Say what carried over and what is still needed. No silent handoff.
      const wrap = document.getElementById('chart-form-wrapper');
      if (wrap && !document.getElementById('chart-handoff-note')) {
        const carried = [gotDate && 'birth date', gotTime && 'time', gotCity && 'place']
          .filter(Boolean);
        const listed = carried.length > 1
          ? carried.slice(0, -1).join(', ') + ' and ' + carried[carried.length - 1]
          : carried[0];
        const asks = gotCity
          ? 'Pick your town from the list to lock its coordinates — that is what gives you your rising sign, career point and houses.'
          : 'Add your birth place below — that is what gives you your rising sign, career point and houses.';
        const note = document.createElement('p');
        note.id = 'chart-handoff-note';
        note.className = 'chart-handoff-note';
        note.setAttribute('role', 'status');
        note.innerHTML = '<span class="chart-handoff-note__mark eng-star-mark" aria-hidden="true"></span> ' +
          'Your ' + esc(listed) + ' carried over from the homepage. ' + asks;
        const header = wrap.querySelector('.form-glass__header');
        if (header && header.parentNode) header.parentNode.insertBefore(note, header.nextSibling);
        else wrap.insertBefore(note, wrap.firstChild);
      }

      const form = document.getElementById('chart-form');
      if (form && typeof form.scrollIntoView === 'function') {
        const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        form.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      }
      // The place always needs confirming, so it wins focus whenever it is the
      // outstanding field — including when we just pre-filled its text.
      const nextField = (cityEl && cityEl.dataset.coordinatesLocked !== 'true')
        ? cityEl
        : (timeEl && !timeEl.value ? timeEl : null);
      if (nextField) {
        // Focus after the smooth scroll settles; preventScroll so we don't fight it.
        const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        setTimeout(function () {
          try { nextField.focus({ preventScroll: true }); } catch (e) { nextField.focus(); }
        }, reduce ? 0 : 360);
      }
    } catch (e) {}
  }

  // ── Results rendering ─────────────────────────────────────────────────────

  function fmtDeg(p) {
    let dg = Math.floor(p.degree);
    let mn = Math.round((p.degree - dg) * 60);
    if (mn === 60) {
      dg = (dg + 1) % 30;
      mn = 0;
    }
    return `${dg}°${String(mn).padStart(2, '0')}′`;
  }

  function renderResults(chart) {
    const wrapEl = document.getElementById('chart-result');
    if (!wrapEl) return;
    // Defense-in-depth: never render a chart whose core points failed to
    // compute (would otherwise throw on chart.positions.Sun.sign below).
    if (!chart || !chart.positions || !chart.positions.Sun) {
      if (window.AstroApp) AstroApp.showToast('Calculation failed',
        'Could not compute this chart — please check the birth details.', 'error');
      return;
    }
    wrapEl.classList.remove('hidden');

    const resultNameEl = document.getElementById('result-name');
    if (resultNameEl) {
      // The hero name stands alone (big Cormorant) — "— Natal Chart" was
      // redundant and wrapped awkwardly on the em-dash at mobile widths.
      resultNameEl.textContent = chart.name;
      resultNameEl.removeAttribute('aria-hidden');
    }
    document.getElementById('result-date').textContent =
      `${chart.birthDate}${chart.birthTime ? ' at ' + chart.birthTime : ' · time unknown'} · ${chart.city}`;
    const precisionLabel = document.getElementById('result-precision-label');
    if (precisionLabel) {
      const level = chart.timeAccuracy || (chart.birthTime ? 'exact' : 'unknown');
      const labels = {
        exact: 'Exact time · Moon, Rising, MC and houses included',
        approximate: 'Approximate time · Moon and angles are provisional',
        unknown: 'Time unknown · Moon, Rising, MC and houses withheld',
      };
      precisionLabel.dataset.level = level;
      const houseName = HOUSE_SYSTEM_NAMES[chart.houseSystem] || chart.houseSystem || 'Equal';
      precisionLabel.textContent = (labels[level] || labels.unknown) +
        (chart.houses ? ` · ${houseName} houses` : ` · date-based placements only`);
    }
    const eclipseHref = eclipseHandoffHref(chart);
    ['eclipse-handoff', 'eclipse-cta'].forEach(function (id) {
      const el = document.getElementById(id);
      if (el) el.href = eclipseHref;
    });
    renderBigThree(chart);
    renderWheel(chart);
    renderTabs(chart);
    initTabs();

    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    wrapEl.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        var firstTab = wrapEl.querySelector('[role="tab"]');
        if (firstTab && typeof firstTab.focus === 'function') {
          try { firstTab.focus({ preventScroll: true }); } catch (e) { firstTab.focus(); }
        }
      });
    });
  }

  /* ── Chart → eclipse handoff. Carries the just-cast birth data so nobody
     re-types it, WITHOUT putting it in the link.

     Until 2026-08-09 both eclipse CTAs on this page were

       eclipse.html?from=chart&dob=1994-03-14&tob=09%3A12&tzname=Europe/London

     so clicking through sent a birth date, a birth time and a home timezone in
     the request line — the access log, the Referer of everything eclipse.html
     loaded next, the service worker's cache key, and the visitor's own synced
     history. Eclipse week is the busiest this link will ever be.

     sessionStorage is same tab, same origin, never transmitted, and gone when
     the tab closes. `from=chart` stays in the query: it names the route, not a
     person. Where storage is blocked, the visitor re-enters the details rather
     than leaking a birth moment into a request URL. */
  function eclipseHandoffHref(chart) {
    const target = 'eclipse.html?from=chart';
    try {
      sessionStorage.setItem('ap-eclipse-handoff', JSON.stringify({
        dob: chart.birthDate || '',
        tob: chart.birthTime || '',
        tzname: chart.tz || '',
        ts: Date.now(),
      }));
    } catch (e) {
      // Storage-disabled browsers reopen the blank private form. A working
      // handoff is not worth putting a birth moment into a request URL.
      return target;
    }
    return target;
  }

  function renderBigThree(chart) {
    const el = document.getElementById('big-three');
    if (!el) return;
    const moon = chart.positions.Moon;
    const items = [
      { key: 'Sun', label: 'Sun', sub: 'Core Identity', sign: chart.positions.Sun.sign, deg: fmtDeg(chart.positions.Sun), seal: 'planet:sun' },
      moon
        ? { key: 'Moon', label: 'Moon', sub: 'Inner World', sign: moon.sign, deg: fmtDeg(moon), seal: 'planet:moon' }
        : { key: 'Moon', label: 'Moon', sub: 'Inner World', withheld: true, reason: 'Add an exact or approximate birth time to place the Moon reliably.' },
      chart.risingSign
        ? { key: 'Rising', label: 'Rising', sub: 'Outward Self', sign: chart.risingSign, deg: (typeof chart.asc === 'number') ? fmtDeg({ degree: chart.asc % 30 }) : '', seal: 'zodiac:' + String(chart.risingSign).toLowerCase() }
        : { key: 'Rising', label: 'Rising', sub: 'Outward Self', withheld: true, reason: 'Add an exact or approximate birth time to calculate angles.' },
    ];
    el.innerHTML = items.map(it => {
      if (it.withheld) {
        return `<article class="big-three-card big-three-card--withheld" aria-label="${esc(it.label)} placement withheld because birth time is unknown">
          <p class="big-three-card__planet">${esc(it.label)} · ${esc(it.sub)}</p>
          <h3 class="big-three-card__sign">Withheld</h3>
          <p class="big-three-card__desc">${esc(it.reason)}</p>
        </article>`;
      }
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
    const wrap = document.getElementById('natal-wheel-wrap');
    if (!chart.houses) {
      el.innerHTML = '<div class="ap-withheld-card" role="status"><div><strong>Natal wheel withheld</strong><span>Birth time is unknown, so the wheel cannot claim the Moon, Ascendant, MC or house cusps. Date-based placements remain available below.</span></div></div>';
      el.classList.remove('natal-wheel--loading', 'natal-wheel--loaded');
      if (wrap) {
        wrap.classList.add('natal-wheel-container--withheld');
        wrap.removeAttribute('aria-busy');
      }
      return;
    }
    if (wrap) wrap.classList.remove('natal-wheel-container--withheld');
    if (!window.AstroChartRender) {
      // Renderer missing (failed to load/parse) — say so instead of a silent blank wheel.
      el.innerHTML = '<p class="chart-render-error">The chart renderer didn\'t load — please refresh the page.</p>';
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
    if (wrap) wrap.removeAttribute('aria-busy');
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
      timeAccuracy: chart.timeAccuracy || (timeKnown ? 'exact' : 'unknown'),
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
      // The interpretation library has a historical noon fallback for ASC/MC.
      // Do not call it when the visitor deliberately left time unknown: a
      // polished Aries/MC paragraph would be an angle claim, not a result.
      try { a = chart.risingSign && I && I.analyzeChartDetailed ? I.analyzeChartDetailed(chart) : null; } catch (e) { a = null; }
      const blocks = [];
      const tocItems = [];
      let readText = '';

      if (fmt) {
        const chips = [
          chart.dominantElement ? cap(chart.dominantElement) + ' · dominant element' : '',
          chart.dominantModality ? cap(chart.dominantModality) + ' · modality' : '',
          chart.chartRuler ? 'Ruler ' + cap(chart.chartRuler) : '',
        ].filter(Boolean);
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

      const dominantText = chart.risingSign
        ? `Your chart is weighted toward the ${chart.dominantElement} element and ${chart.dominantModality} modality. ` +
          `Chart ruler ${cap(chart.chartRuler || '—')} steers your ${chart.risingSign} Ascendant — the lens others meet first.`
        : `Your chart is weighted toward the ${chart.dominantElement} element and ${chart.dominantModality} modality. ` +
          `Birth time is unknown, so the Moon, angles and houses are withheld; the remaining placements are calculated from your date and place.`;
      blocks.push(analysisSection('Chart emphasis', dominantText, { featured: true, eyebrow: 'Start here' }));
      tocItems.push({ title: 'Chart emphasis' });
      if (!chart.risingSign) {
        blocks.push(analysisSection('Time-dependent points withheld',
          'Birth time is unknown. Your Moon, rising sign, career point, houses and their interpretations are intentionally omitted; add a time and recast when you want that layer.',
          { eyebrow: 'Honest precision' }));
        tocItems.push({ title: 'Time-dependent points withheld' });
      }

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
              <span class="eng-star-mark pattern-card__star-mark" aria-hidden="true"></span>
              <strong class="pattern-card__name pattern-card__name--star">${esc(fs.point === 'Midheaven' ? 'Career point' : fs.point === 'Ascendant' ? 'Rising sign' : fs.point)} conjunct ${esc(fs.star)}</strong>
              <span class="pattern-card__meta">${esc(fs.orb.toFixed(1))}° from exact · ${esc(fs.constellation)}</span>
              ${fs.royal ? `<span class="pattern-card__badge pattern-card__badge--royal">Royal star — ${esc(fs.royal)}</span>` : ''}
            </div>
            <p class="pattern-card__body">${esc(fs.meaning)}</p>
          </div>`).join('');
        blocks.push('<p class="ap-reading-section-label">Fixed star conjunctions</p>' +
          '<p class="ap-reading-card__meta ap-reading-card__meta--intro">Natal points within 1° of major named stars, precession-corrected to your birth year.</p>' +
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
      const planetMarkup = renderedPlanets.map(k => {
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
        const placement = fmt.placement({
          title: label + ' in ' + signName,
          meta: meta + dignityMeta,
          text: fullText.trim(),
          icon: planetIcon(k),
        });
        if (k === 'Sun' && !chart.positions.Moon) {
          return placement + '<div class="ap-withheld-card" role="note"><div><strong>Moon withheld</strong><span>A birth time is needed to place the Moon reliably; the neutral calculation time is not shown as a natal claim.</span></div></div>';
        }
        return placement;
      });
      pt.innerHTML = planetMarkup.join('');
      if (chart.nodeMode) {
        const modeLabel = chart.nodeMode === 'true' ? 'True (osculating) node' : 'Mean node';
        pt.innerHTML += '<p class="ap-reading-card__meta ap-reading-card__meta--centered">' +
          'Lunar nodes: ' + modeLabel + ' · Lilith = mean Black Moon · South Node = North Node + 180° · ' +
          'Chiron: Kepler orbit from JPL elements — to the degree 1970–2030, approximate for mid-century births</p>';
      }
      // Tag each placement card after all innerHTML writes. data-planet uses the
      // internal key (for example NorthNode) to match the wheel's glyph group.
      const placementCards = pt.querySelectorAll('.ap-reading-card--placement');
      renderedPlanets.forEach((k, i) => {
        const card = placementCards[i];
        if (!card) return;
        card.setAttribute('data-planet', k);
        card.setAttribute('tabindex', '0');
      });
    } else if (pt) {
      pt.innerHTML = '<p class="ap-reading-empty">Reading formatter loading — refresh if this persists.</p>';
    }

    // Houses
    const ht = document.getElementById('houses-table');
    if (ht && fmt && !chart.houses) {
      ht.innerHTML = '<div class="ap-withheld-card" role="status"><div><strong>Houses withheld</strong><span>A birth time is needed for Ascendant-based houses and angle interpretations. Date-based placements remain in the Planets tab; the Moon is withheld too.</span></div></div>';
    } else if (ht && fmt) {
      const planetsByHouse = {};
      Object.keys(chart.positions || {}).forEach(function (k) {
        const hh = chart.planetHouses && chart.planetHouses[k];
        if (!hh) return;
        planetsByHouse[hh] = planetsByHouse[hh] || [];
        planetsByHouse[hh].push(k);
      });
      const curSys = chart.houseSystem || 'equal';
      const switcherHtml =
        '<div class="house-system-switch" role="group" aria-label="House system — the framework that divides your chart into twelve life areas">' +
          '<p class="house-system-switch__label"><span class="house-system-switch__name">' +
            (HOUSE_SYSTEM_NAMES[curSys] || 'Equal') + ' houses</span> — switchable</p>' +
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
          icon: '<span class="ap-reading-card__aspect-glyph ap-reading-card__roman">' + roman(i + 1) + '</span>',
        });
      }).join('');
      ht.querySelectorAll('[data-house-system]').forEach(function (btn) {
        btn.addEventListener('click', function () { switchHouseSystem(btn.dataset.houseSystem); });
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
        : '<p class="ap-reading-empty">No major aspects close enough to count for this chart.</p>';

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



  // ── Tabs ──────────────────────────────────────────────────────────────────

  let tabsInit = false;
  function initTabs() {
    if (tabsInit) return;
    tabsInit = true;
    const tabs = Array.from(document.querySelectorAll('.chart-detail-tabs .tabs__trigger, .chart-detail-tabs .tab-trigger'));
    const panels = Array.from(document.querySelectorAll('.chart-detail-tabs .tabs__panel, .chart-detail-tabs .tab-panel'));
    if (!tabs.length) return;

    function activateTab(btn, moveFocus) {
      tabs.forEach(function (item) {
        const selected = item === btn;
        item.setAttribute('aria-selected', selected ? 'true' : 'false');
        item.tabIndex = selected ? 0 : -1;
      });
      panels.forEach(function (panel) {
        panel.setAttribute('aria-hidden', panel.id === btn.getAttribute('aria-controls') ? 'false' : 'true');
      });
      if (moveFocus) btn.focus();
    }

    tabs.forEach(function (btn, index) {
      btn.tabIndex = btn.getAttribute('aria-selected') === 'true' ? 0 : -1;
      btn.addEventListener('click', function () { activateTab(btn, false); });
      btn.addEventListener('keydown', function (event) {
        let next = null;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = tabs[(index + 1) % tabs.length];
        if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = tabs[(index + tabs.length - 1) % tabs.length];
        if (event.key === 'Home') next = tabs[0];
        if (event.key === 'End') next = tabs[tabs.length - 1];
        if (!next) return;
        event.preventDefault();
        activateTab(next, true);
      });
    });
  }

  // ── Action buttons ────────────────────────────────────────────────────────

  function saveDataFor(chart) {
    const moon = chart.positions.Moon;
    return {
      name: chart.name,
      birthDate: chart.birthDate,
      birthTime: chart.birthTime,
      birthCity: chart.city,
      city: chart.city,
      lat: chart.lat,
      lon: chart.lon,
      tz: chart.tz,
      houseSystem: chart.houseSystem || 'equal',
      timeKnown: chart.timeKnown === true,
      timeAccuracy: chart.timeAccuracy || 'unknown',
      timezoneKnown: chart.timezoneKnown === true,
      sunSign: chart.positions.Sun.sign,
      moonSign: moon ? moon.sign : null,
      risingSign: chart.risingSign,
      positions: window.AstroProfile && AstroProfile.packPositionsForSave
        ? AstroProfile.packPositionsForSave(chart.positions) : null,
      aspects: (chart.aspects || []).slice(0, 16),
      engineV: window.AstroProfile && Number(AstroProfile.engineVersion) || 3,
    };
  }

  function buildChartShareUrl(chart) {
    if (!chart || !chart.birthDate || chart.lat == null || chart.lon == null || !isValidTimeZone(chart.tz)) {
      return location.href;
    }
    const params = new URLSearchParams();
    const fields = {
      n: chart.name || 'Shared Chart',
      d: chart.birthDate,
      t: chart.birthTime || '',
      c: chart.city || '',
      lat: String(chart.lat),
      lon: String(chart.lon),
      tz: chart.tz,
      hs: chart.houseSystem || 'equal',
      a: chart.timeAccuracy || (hasKnownBirthTime(chart) ? 'exact' : 'unknown'),
    };
    Object.keys(fields).forEach(function (key) {
      if (fields[key] !== '') params.set(key, fields[key]);
    });
    const page = hasKnownBirthTime(chart) ? 'chart-view.html' : 'chart.html';
    return location.origin + location.pathname.replace(/[^/]+$/, '') + page + '#' + params.toString();
  }

  document.getElementById('save-btn')?.addEventListener('click', () => {
    if (!currentChart || !window.AstroProfile) {
      if (window.AstroApp) AstroApp.showToast('Save unavailable', 'This browser could not open local chart storage.', 'warning');
      return;
    }
    AstroProfile.saveChart(saveDataFor(currentChart));
    if (window.AstroApp) AstroApp.showToast('Saved', 'Chart saved on this device.', 'success');

    const row = document.getElementById('result-actions-row');
    if (!row) return;
    let chip = document.getElementById('chart-save-confirmation');
    if (!chip) {
      chip = document.createElement('div');
      chip.id = 'chart-save-confirmation';
      chip.className = 'chart-save-confirmation';
      chip.setAttribute('role', 'status');
      chip.setAttribute('aria-live', 'polite');
      row.parentNode.insertBefore(chip, row.nextSibling);
    }
    chip.hidden = false;
    chip.innerHTML = '<span class="chart-save-confirmation__mark eng-star-mark" aria-hidden="true"></span>' +
      '<span>Saved on this device — <a href="charts.html">open My Charts →</a></span>';
  });

  // Share Chart → beautiful chart-view link (preferred) or image via Web Share API.
  document.getElementById('share-btn')?.addEventListener('click', async () => {
    if (!currentChart) return;
    const shareUrl = buildChartShareUrl(currentChart);
    const text = sharePlacementLine(currentChart);
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
      } else {
        await navigator.clipboard.writeText(`${text}\n${shareUrl}`);
        if (window.AstroApp) AstroApp.showToast('Link copied', 'Share link copied to clipboard.', 'success');
      }
    } catch (e) { /* user cancelled */ }
  });

  // Big Three Card → dedicated Sun/Moon/Rising square (no full natal wheel).
  document.getElementById('print-btn')?.addEventListener('click', () => {
    if (!currentChart) { window.print(); return; }
    exportShareImage(currentChart, 'bigthree');
  });

  document.getElementById('json-btn')?.addEventListener('click', () => {
    if (!currentChart) return;
    const I = window.AstroInterpretations;
    const data = {
      generator: 'AstroPrecise browser ephemeris (published VSOP87, ELP2000 and Meeus-based methods; accuracy varies by body and date)',
      exported: new Date().toISOString(),
      name: currentChart.name,
      birthDate: currentChart.birthDate,
      birthTime: currentChart.birthTime || null,
      place: { city: currentChart.city, lat: currentChart.lat, lon: currentChart.lon, tz: currentChart.tz },
      timeKnown: currentChart.timeKnown === true,
      timeAccuracy: currentChart.timeAccuracy || 'unknown',
      timezoneKnown: currentChart.timezoneKnown === true,
      risingSign: currentChart.timeKnown ? currentChart.risingSign : null,
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
    document.body.appendChild(a);
    a.click();
    const downloadUrl = a.href;
    a.remove();
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    if (window.AstroApp) AstroApp.showToast('Exported', 'Chart data downloaded as JSON.', 'success');
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
  //   • wallpaper 1080×1920  — lock-screen portrait
  //   • bigthree  1080×1080  — Sun / Moon / Rising social card only
  //   • print     2480×3508  — A4-proportioned high-resolution plate
  // Geometry is resolution-independent, so the print export is drawn at its
  // target dimensions rather than upscaled from a screenshot.
  // Honest + deterministic: only the real computed chart is ever drawn.
  // ═══════════════════════════════════════════════════════════════════════════

  // The exported plate uses the same typography as the live field instrument.
  const FONT_DISPLAY = '"Cormorant Garamond", Georgia, serif';
  const FONT_SANS    = '"Schibsted Grotesk", system-ui, sans-serif';
  const FONT_MONO    = '"IBM Plex Mono", ui-monospace, monospace';

  // Engraved palette (matches css/main.css :root) ────────────────────────────
  const PAL = {
    void:      '#020307',
    voidWarm:  '#0D121B',
    lapis:     '#B9C8DC',
    gold:      '#D8B46A',
    goldHi:    '#FF6428',
    goldPale:  '#F2ECDF',
    parchment: '#F2ECDF',
    oxblood:   '#FF6428',
    silver:    '#B9C8DC',
    silverDim: 'rgba(185,200,220,0.68)',
  };

  const SHARE_FORMATS = {
    square:    { w: 2160, h: 2160 },
    story:     { w: 2160, h: 3840 },
    wallpaper: { w: 1080, h: 1920 },
    bigthree:  { w: 1080, h: 1080 },
    print:     { w: 4960, h: 7016 }, // A4-proportioned high-resolution export
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
    x.fillStyle = 'rgba(216,180,106,0.05)';
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
        ? `rgba(216,180,106,${alpha})`
        : `rgba(242,236,223,${alpha})`;
      x.beginPath();
      x.arc(rnd() * W, rnd() * H, r, 0, Math.PI * 2);
      x.fill();
    }
  }

  // Honest plate ground: flat void, raised ledger band, grid and plotted stars.
  function paintBackground(x, W, H, seed, S) {
    x.fillStyle = PAL.void;
    x.fillRect(0, 0, W, H);
    x.fillStyle = 'rgba(13,18,27,0.72)';
    x.fillRect(0, H * 0.18, W, H * 0.64);

    drawDotGrid(x, W, H, S);
    drawStars(x, W, H, Math.round((W * H) / 4800), seed, S);
    x.strokeStyle = 'rgba(185,200,220,0.12)';
    x.lineWidth = Math.max(1, S);
    x.beginPath();
    x.moveTo(W / 2, H * 0.18);
    x.lineTo(W / 2, H * 0.82);
    x.moveTo(W * 0.12, H / 2);
    x.lineTo(W * 0.88, H / 2);
    x.stroke();
  }

  // Double gold frame with generous margin (print bleed-friendly).
  function drawFrame(x, W, H, outerInset, innerInset) {
    x.strokeStyle = 'rgba(216,180,106,0.7)';
    x.lineWidth = Math.max(2, outerInset * 0.05);
    x.strokeRect(outerInset, outerInset, W - outerInset * 2, H - outerInset * 2);
    x.strokeStyle = 'rgba(216,180,106,0.3)';
    x.lineWidth = Math.max(1, outerInset * 0.025);
    x.strokeRect(innerInset, innerInset, W - innerInset * 2, H - innerInset * 2);
    // Corner ticks (silver chrome — not gold debt)
    x.strokeStyle = 'rgba(242,236,223,0.45)';
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

  // Sign seal on an engraved plate; unknown angles are explicitly withheld.
  function drawSignOrb(x, signName, cx, cy, r, elemCol) {
    if (!signName) {
      x.fillStyle = PAL.voidWarm;
      x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill();
      x.strokeStyle = 'rgba(185,200,220,0.34)';
      x.lineWidth = Math.max(1, r * 0.045);
      x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.stroke();
      x.fillStyle = PAL.silver;
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.font = `500 ${r * 0.7}px ${FONT_DISPLAY}`;
      x.fillText('—', cx, cy - r * 0.04);
      return;
    }
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
    grad.addColorStop(0, 'rgba(242,236,223,0.18)');
    var alphaFn = (window.APCanvasSeals && APCanvasSeals.withAlpha) ? APCanvasSeals.withAlpha.bind(APCanvasSeals) : null;
    grad.addColorStop(0.4, alphaFn ? alphaFn(elemCol, 'cc') : elemCol);
    grad.addColorStop(1, alphaFn ? alphaFn(elemCol, '33') : elemCol);
    x.fillStyle = grad;
    x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill();
    x.strokeStyle = 'rgba(216,180,106,0.55)';
    x.lineWidth = Math.max(1, r * 0.06);
    x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.stroke();
    x.strokeStyle = 'rgba(242,236,223,0.28)';
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
    // Brand-token element tints: ember, brass, paper and silver.
    const ELEMENT_SECTOR = {
      Aries:'rgba(255,100,40,0.09)', Taurus:'rgba(216,180,106,0.09)', Gemini:'rgba(242,236,223,0.06)', Cancer:'rgba(185,200,220,0.09)',
      Leo:'rgba(255,100,40,0.09)', Virgo:'rgba(216,180,106,0.09)', Libra:'rgba(242,236,223,0.06)', Scorpio:'rgba(185,200,220,0.09)',
      Sagittarius:'rgba(255,100,40,0.09)', Capricorn:'rgba(216,180,106,0.09)', Aquarius:'rgba(242,236,223,0.06)', Pisces:'rgba(185,200,220,0.09)',
    };
    const rOuter     = R;
    const rBand      = R * 0.89;
    const rSignInner = R * 0.755;
    const rPlanets   = R * 0.61;
    const rInner     = R * 0.475;
    const lw = R / 410;

    const hasAngles = chart.timeKnown === true && Array.isArray(chart.houses) && typeof chart.asc === 'number';
    const ascLon = hasAngles ? chart.asc : 0;
    const ang = lon => Math.PI - ((lon - ascLon) * Math.PI / 180);

    // Schematic orbital tracks (decorative — matches SVG chart-render layer)
    [0.78, 0.68, 0.58].forEach((frac, i) => {
      x.save();
      x.strokeStyle = 'rgba(216,180,106,' + (0.1 + i * 0.04) + ')';
      x.lineWidth = 0.8 * lw;
      x.setLineDash([3 + i, 5 + i * 2]);
      x.beginPath();
      x.arc(cx, cy, R * frac, 0, Math.PI * 2);
      x.stroke();
      x.restore();
    });

    // Rings
    x.strokeStyle = 'rgba(216,180,106,0.75)'; x.lineWidth = 3 * lw;
    x.beginPath(); x.arc(cx, cy, rOuter, 0, Math.PI * 2); x.stroke();
    x.strokeStyle = 'rgba(216,180,106,0.45)'; x.lineWidth = 1.5 * lw;
    x.beginPath(); x.arc(cx, cy, rSignInner, 0, Math.PI * 2); x.stroke();
    x.strokeStyle = 'rgba(216,180,106,0.3)'; x.lineWidth = 1 * lw;
    x.beginPath(); x.arc(cx, cy, rBand, 0, Math.PI * 2); x.stroke();
    x.strokeStyle = 'rgba(216,180,106,0.22)'; x.lineWidth = 1 * lw;
    x.beginPath(); x.arc(cx, cy, rInner, 0, Math.PI * 2); x.stroke();

    // Sign sectors
    for (let i = 0; i < 12; i++) {
      const a1 = ang(i * 30), a2 = ang((i + 1) * 30);
      const sign = SIGNS_ORDER[i];
      x.fillStyle = ELEMENT_SECTOR[sign] || 'transparent';
      x.beginPath(); x.moveTo(cx, cy);
      x.arc(cx, cy, rOuter, a1, a2, a1 > a2); x.closePath(); x.fill();

      x.strokeStyle = 'rgba(216,180,106,0.3)'; x.lineWidth = 1 * lw;
      x.beginPath();
      x.moveTo(cx + Math.cos(a1) * rSignInner, cy + Math.sin(a1) * rSignInner);
      x.lineTo(cx + Math.cos(a1) * rOuter,     cy + Math.sin(a1) * rOuter);
      x.stroke();

      const mid = ang(i * 30 + 15);
      const gR  = (rBand + rSignInner) / 2;
      drawWheelSignSeal(x, sign, cx + Math.cos(mid) * gR, cy + Math.sin(mid) * gR, R * 0.1);
    }

    // 10° ticks
    x.strokeStyle = 'rgba(216,180,106,0.4)';
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
      Trine: '#B9C8DC', Sextile: '#D8B46A', Conjunction: '#D8B46A',
      Opposition: '#FF6428', Square: '#FF6428',
    };
    (chart.renderAspects || []).slice(0, 24).forEach(asp => {
      const p1 = chart.positions[asp.planet1], p2 = chart.positions[asp.planet2];
      if (!p1 || !p2) return;
      const a1 = ang(p1.lon), a2 = ang(p2.lon);
      const col = ASPECT_LINE_COLORS[asp.aspect] || 'rgba(185,200,220,0.3)';
      x.strokeStyle = col.startsWith('rgba') ? col : col + '66';
      x.globalAlpha = 0.5; x.lineWidth = 1.5 * lw;
      x.beginPath();
      x.moveTo(cx + Math.cos(a1) * (rInner - 8 * lw), cy + Math.sin(a1) * (rInner - 8 * lw));
      x.lineTo(cx + Math.cos(a2) * (rInner - 8 * lw), cy + Math.sin(a2) * (rInner - 8 * lw));
      x.stroke();
      x.globalAlpha = 1;
    });

    // House spokes
    if (hasAngles) {
      chart.houses.forEach(cusp => {
        const a = ang(cusp);
        x.strokeStyle = 'rgba(185,200,220,0.2)'; x.lineWidth = 1 * lw;
        x.beginPath(); x.moveTo(cx, cy);
        x.lineTo(cx + Math.cos(a) * rInner, cy + Math.sin(a) * rInner); x.stroke();
      });
    }

    // Ascendant axis
    if (hasAngles) {
      const aAsc = ang(ascLon);
      x.strokeStyle = 'rgba(255,100,40,0.9)'; x.lineWidth = 2.5 * lw;
      x.beginPath();
      x.moveTo(cx + Math.cos(aAsc) * rInner,     cy + Math.sin(aAsc) * rInner);
      x.lineTo(cx + Math.cos(aAsc) * rSignInner, cy + Math.sin(aAsc) * rSignInner);
      x.stroke();
      x.fillStyle = '#FF6428';
      x.font = `bold ${R * 0.05}px ${FONT_SANS}`;
      x.textBaseline = 'middle'; x.textAlign = 'center';
      x.fillText('ASC', cx + Math.cos(aAsc) * (rInner - 32 * lw), cy + Math.sin(aAsc) * (rInner - 32 * lw));
    }

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
      x.strokeStyle = 'rgba(242,236,223,0.45)'; x.lineWidth = 1 * lw;
      x.beginPath();
      x.moveTo(cx + Math.cos(at2) * rSignInner,            cy + Math.sin(at2) * rSignInner);
      x.lineTo(cx + Math.cos(at2) * (rSignInner - 14 * lw), cy + Math.sin(at2) * (rSignInner - 14 * lw));
      x.stroke();

      const haloR = R * 0.07;
      const haloGrad = x.createRadialGradient(px2, py2, 0, px2, py2, haloR);
      haloGrad.addColorStop(0, 'rgba(216,180,106,0.22)');
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
        x.fillStyle = '#FF6428';
        x.font = `500 ${R * 0.04}px "IBM Plex Mono", ${FONT_SANS}`;
        x.fillText('℞', px2 + R * 0.055, py2 - R * 0.05);
      }
    });
    x.textBaseline = 'alphabetic';

    // Centre star
    x.fillStyle = 'rgba(216,180,106,0.95)';
    x.font = `400 ${R * 0.14}px ${FONT_DISPLAY}`;
    x.textBaseline = 'middle'; x.textAlign = 'center';
    if (window.AstroUI && AstroUI.drawStar4) {
      x.fillStyle = 'rgba(216,180,106,0.95)';
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

    x.strokeStyle = 'rgba(216,180,106,0.22)'; x.lineWidth = 1 * scale;
    x.beginPath(); x.moveTo(x0, y0 + 16 * scale); x.lineTo(x0 + barW, y0 + 16 * scale); x.stroke();

    const rows = [
      { key: 'fire',  label: 'Fire',  color: ELEMENT_COLORS.fire },
      { key: 'earth', label: 'Earth', color: ELEMENT_COLORS.earth },
      { key: 'air',   label: 'Air',   color: ELEMENT_COLORS.air },
      { key: 'water', label: 'Water', color: ELEMENT_COLORS.water },
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
      x.fillStyle = er.color;
      x.font = `600 ${20 * scale}px ${FONT_SANS}`;
      x.fillText(er.label.toUpperCase(), x0, rowY + BAR_H / 2 + 7 * scale);

      x.fillStyle = 'rgba(185,200,220,0.08)';
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

    x.strokeStyle = 'rgba(216,180,106,0.22)'; x.lineWidth = 1 * scale;
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
          x.strokeStyle = 'rgba(185,200,220,0.08)'; x.lineWidth = 1 * scale;
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
        x.font = `400 ${18 * scale}px ${FONT_MONO}`;
        x.textAlign = 'right';
        x.fillText(
          `${fmtDeg(row.p)}${row.p.retrograde ? ' ℞' : ''}`,
          colX + colW - 60 * scale, ry + 10 * scale);
      });
    });
  }

  // Lock-screen wallpaper — flat field plate, centred wheel, restrained chrome.
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

    paintBackground(x, W, H, seed, S);

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
    const moon = chart.positions.Moon;
    x.fillText(
      `☉ ${chart.positions.Sun.sign}   ·   ${moon ? '☽ ' + moon.sign : 'Moon withheld'}   ·   ${chart.risingSign ? '↑ ' + chart.risingSign : 'Rising withheld'}`,
      W / 2, y);

    // Engraved placement row
    y += 56 * S;
    const trio = [
      { sign: chart.positions.Sun.sign,  label: 'SUN' },
      { sign: moon ? moon.sign : null, label: 'MOON' },
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
    x.strokeStyle = 'rgba(216,180,106,0.18)'; x.lineWidth = 1 * S;
    x.beginPath(); x.moveTo(W * 0.28, H - safeBot + 36 * S); x.lineTo(W * 0.72, H - safeBot + 36 * S); x.stroke();
    x.fillStyle = PAL.silverDim;
    x.font = `400 ${16 * S}px ${FONT_SANS}`;
    x.textAlign = 'center';
    x.fillText(
      hasKnownBirthTime(chart)
        ? 'astroprecise  ·  computed natal plate'
        : 'astroprecise  ·  date-based plate · Moon and angles withheld',
      W / 2, H - safeBot + 72 * S);

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

    paintBackground(x, W, H, seed, S);
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
      { key: 'Moon', sign: chart.positions.Moon ? chart.positions.Moon.sign : null, label: 'MOON', glyph: '☽' },
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
      x.fillText(t.sign || 'WITHHELD', tx, y + orbR + 58 * S);

      const pos = t.key && chart.positions[t.key];
      if (pos) {
        x.fillStyle = PAL.silverDim;
        x.font = `400 ${17 * S}px ${FONT_SANS}`;
        x.fillText(fmtDeg(pos), tx, y + orbR + 82 * S);
      }
    });

    y += orbR + 120 * S;
    const dom = [
      chart.dominantElement ? cap(chart.dominantElement) + ' · element emphasis' : '',
      chart.dominantModality ? cap(chart.dominantModality) + ' · modality' : '',
    ].filter(Boolean).join('   ·   ');
    if (dom) {
      x.fillStyle = PAL.silverDim;
      x.font = `400 ${18 * S}px ${FONT_SANS}`;
      x.fillText(dom, W / 2, y);
    }

    x.strokeStyle = 'rgba(216,180,106,0.25)'; x.lineWidth = 1 * S;
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

    paintBackground(x, W, H, seed, S);
    drawFrame(x, W, H, 44 * S, 62 * S);

    const cityShort = (chart.city || '').split(',')[0];
    const accLine = hasKnownBirthTime(chart)
      ? 'VSOP87 · ELP2000 · calculated on device'
      : 'date-based positions · Moon and angles withheld';

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

    // ── Core placement plates (shared) ──
    y += 78 * S;
    const trio = [
      { sign: chart.positions.Sun.sign,  label: 'SUN' },
      { sign: chart.positions.Moon ? chart.positions.Moon.sign : null, label: 'MOON' },
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
      x.fillText(t.sign || 'WITHHELD', tx, y + orbR + 48 * S);
    });

    // Dominant-energy line
    y += orbR + 86 * S;
    const dom = [
      chart.dominantElement ? cap(chart.dominantElement) + ' · element emphasis' : '',
      chart.dominantModality ? cap(chart.dominantModality) + ' · modality' : '',
      chart.chartRuler ? cap(chart.chartRuler) + ' · chart ruler' : '',
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
    x.strokeStyle = 'rgba(216,180,106,0.25)'; x.lineWidth = 1 * S;
    x.beginPath(); x.moveTo(W * 0.2, H - 108 * S); x.lineTo(W * 0.8, H - 108 * S); x.stroke();
    x.fillStyle = PAL.silverDim;
    x.font = `400 ${18 * S}px ${FONT_SANS}`;
    x.fillText(`astroprecise  ·  ${accLine}`, W / 2, H - 88 * S);
    x.fillStyle = 'rgba(185,200,220,0.72)';
    x.font = `400 ${13 * S}px ${FONT_SANS}`;
    x.fillText('Wheel = computed degrees · artwork = schematic field plate', W / 2, H - 58 * S);

    return cv;
  }

  // Format wrappers (kept as named entry points the rest of the app can call).
  function drawChartPoster(chart) { return paintShareImage(chart, 'print'); }
  function drawShareImageSquare(chart) { return paintShareImage(chart, 'square'); }
  function drawShareImageStory(chart) { return paintShareImage(chart, 'story'); }

  const slugify = name =>
    (name || 'chart').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'chart';

  function sharePlacementLine(chart) {
    const points = [
      `☉ ${chart.positions.Sun.sign}`,
    ];
    if (chart.positions.Moon) points.push(`☽ ${chart.positions.Moon.sign}`);
    else points.push('Moon withheld · birth time unknown');
    if (chart.risingSign) points.push(`↑ ${chart.risingSign}`);
    else points.push('Rising withheld · birth time unknown');
    return `${chart.name || 'Birth Chart'}: ${points.join(' · ')}`;
  }

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
    // Preload engraved zodiac and planet seals before painting the export.
    try {
      if (window.APCanvasSeals) {
        const signs = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
        const planets = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'];
        await Promise.all([
          APCanvasSeals.preload ? APCanvasSeals.preload(signs) : Promise.resolve(),
          APCanvasSeals.preloadPlanets ? APCanvasSeals.preloadPlanets(planets) : Promise.resolve(),
        ]);
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
            text: sharePlacementLine(chart),
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
    const existing = document.getElementById('share-format-menu');
    if (existing) {
      if (typeof existing._close === 'function') existing._close();
      else existing.remove();
      return;
    }
    const menu = document.createElement('div');
    menu.id = 'share-format-menu';
    menu.className = 'chart-export-menu';
    menu.setAttribute('role', 'menu');
    menu.setAttribute('aria-label', 'Export artwork format');
    anchorBtn.setAttribute('aria-expanded', 'true');
    const opts = [
      { fmt: 'print',  title: 'Print plate · 4960×7016', sub: 'High-resolution computed wheel + ledger' },
      { fmt: 'square', title: 'Square · 2160×2160', sub: 'High-resolution social plate' },
      { fmt: 'story',  title: 'Story · 2160×3840 HD',  sub: 'IG / WhatsApp stories' },
      { fmt: 'wallpaper', title: 'Phone wallpaper · 1080×1920', sub: 'Lock screen — your chart' },
      { fmt: 'bigthree',  title: 'Big Three card · 1080×1080', sub: 'Time-sensitive points are withheld when needed' },
      { fmt: 'square1x', title: 'Square · 1080×1080', sub: 'Smaller file size' },
    ];
    menu.innerHTML = opts.map(o =>
      `<button type="button" class="chart-export-menu__item" role="menuitem" data-fmt="${o.fmt}">` +
      `<span class="chart-export-menu__title">${o.title}</span>` +
      `<span class="chart-export-menu__meta">${o.sub}</span></button>`
    ).join('');

    document.body.appendChild(menu);
    const r = anchorBtn.getBoundingClientRect();
    const margin = 12;
    const menuWidth = menu.offsetWidth;
    const menuHeight = menu.offsetHeight;
    const spaceBelow = window.innerHeight - r.bottom - margin;
    const top = spaceBelow >= menuHeight
      ? r.bottom + 8
      : Math.max(margin, r.top - menuHeight - 8);
    const left = Math.max(margin, Math.min(r.left, window.innerWidth - menuWidth - margin));
    menu.style.top = top + 'px';
    menu.style.left = left + 'px';

    const close = () => {
      menu.remove();
      anchorBtn.setAttribute('aria-expanded', 'false');
      document.removeEventListener('click', onDoc, true);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
      try { anchorBtn.focus(); } catch (e) {}
    };
    menu._close = close;
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
      window.addEventListener('resize', close, { once: true });
      window.addEventListener('scroll', close, { once: true, capture: true });
      const first = menu.querySelector('button[role="menuitem"]');
      try { if (first) first.focus(); } catch (e) {}
    }, 0);

    menu.querySelectorAll('button[data-fmt]').forEach(b => {
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

  function initAdvancedAccordion() {
    const root = document.getElementById('chart-advanced');
    const item = document.getElementById('chart-advanced-item');
    const trigger = document.getElementById('chart-advanced-trigger');
    const panel = document.getElementById('chart-advanced-panel');
    if (!root || !item || !trigger || !panel) return;

    // Always start collapsed so Calculate stays in the first form viewport.
    item.classList.remove('is-open');

    const sync = () => {
      const open = item.classList.contains('is-open');
      trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
    };

    trigger.addEventListener('click', () => {
      item.classList.toggle('is-open');
      sync();
    });

    sync();
  }

  // ── Boot ──────────────────────────────────────────────────────────────────
  // Run exactly once. This script is `defer`, so when it executes readyState is
  // already 'interactive' — without the guard BOTH the readyState branch and the
  // later DOMContentLoaded listener fired, double-wiring the accordion/node toggle
  // and calling restoreFromURL()→requestSubmit() twice.
  let booted = false;
  function initFormInteractions() {
    const accuracyInput = document.getElementById('time-accuracy-input');
    const accuracyStatus = document.getElementById('time-accuracy-status');
    const timeUnknownBtn = document.getElementById('time-unknown-btn');
    const timeInput = document.getElementById('time-input');

    function setTimeAccuracy(level) {
      level = /^(exact|approximate|unknown)$/.test(level) ? level : 'unknown';
      if (accuracyInput) accuracyInput.value = level;
      if (accuracyStatus) {
        accuracyStatus.dataset.level = level;
        accuracyStatus.textContent = level === 'exact'
          ? 'Exact time · Moon, Rising, MC and houses will be calculated.'
          : level === 'approximate'
            ? 'Approximate time · Moon and angles are provisional.'
            : 'Time unknown · Moon, Rising, MC and houses will be withheld.';
      }
      if (timeUnknownBtn) {
        timeUnknownBtn.textContent = level === 'unknown' ? 'Choose an approximate time' : 'Mark time unknown';
      }
    }

    document.addEventListener('ap-time-accuracy', function (event) {
      setTimeAccuracy(event && event.detail);
    });

    timeUnknownBtn?.addEventListener('click', function () {
      const chooseApproximate = !accuracyInput || accuracyInput.value === 'unknown';
      if (timeInput) timeInput.value = '';
      document.querySelectorAll('.time-btn').forEach(function (item) {
        item.classList.remove('active');
        item.setAttribute('aria-pressed', 'false');
      });
      setTimeAccuracy('unknown');
      if (!chooseApproximate) return;
      const item = document.getElementById('chart-advanced-item');
      const trigger = document.getElementById('chart-advanced-trigger');
      if (item && trigger && !item.classList.contains('is-open')) trigger.click();
      const picks = document.querySelector('.chart-form__time-picks');
      if (!picks) return;
      const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      picks.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      const first = picks.querySelector('.time-btn');
      if (first) window.setTimeout(function () { first.focus({ preventScroll: true }); }, reduce ? 0 : 320);
    });

    document.querySelectorAll('.time-btn').forEach(function (button) {
      button.addEventListener('click', function () {
        document.querySelectorAll('.time-btn').forEach(function (item) {
          item.classList.remove('active');
          item.setAttribute('aria-pressed', 'false');
        });
        button.classList.add('active');
        button.setAttribute('aria-pressed', 'true');
        if (!timeInput) return;
        timeInput.value = button.dataset.time;
        setTimeAccuracy('approximate');
        timeInput.dispatchEvent(new Event('input'));
      });
    });

    if (timeInput) {
      timeInput.addEventListener('input', function () {
        const value = timeInput.value;
        const activePreset = document.querySelector('.time-btn.active');
        if (!activePreset || activePreset.dataset.time !== value) {
          document.querySelectorAll('.time-btn').forEach(function (item) {
            item.classList.remove('active');
            item.setAttribute('aria-pressed', 'false');
          });
        }
        setTimeAccuracy(value ? (activePreset && activePreset.dataset.time === value ? 'approximate' : 'exact') : 'unknown');
      });
      timeInput.addEventListener('change', function () {
        const preset = document.querySelector('.time-btn.active');
        setTimeAccuracy(timeInput.value ? (preset && preset.dataset.time === timeInput.value ? 'approximate' : 'exact') : 'unknown');
      });
    }

    const houseInput = document.getElementById('house-system');
    function selectHouseCard(card) {
      document.querySelectorAll('.house-card').forEach(function (item) {
        const selected = item === card;
        item.classList.toggle('active', selected);
        item.setAttribute('aria-checked', selected ? 'true' : 'false');
        item.tabIndex = selected ? 0 : -1;
      });
      if (houseInput) houseInput.value = card.dataset.value;
    }
    const houseCards = Array.from(document.querySelectorAll('.house-card'));
    houseCards.forEach(function (card, index) {
      card.addEventListener('click', function () { selectHouseCard(card); });
      card.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          selectHouseCard(card);
          return;
        }
        let next = null;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = houseCards[(index + 1) % houseCards.length];
        if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = houseCards[(index + houseCards.length - 1) % houseCards.length];
        if (!next) return;
        event.preventDefault();
        selectHouseCard(next);
        next.focus();
      });
    });

    function watchField(inputId, groupId) {
      const input = document.getElementById(inputId);
      const group = document.getElementById(groupId);
      if (!input || !group) return;
      function check() {
        group.classList.toggle('is-valid', input.value.trim() !== '');
        group.classList.remove('is-error');
      }
      input.addEventListener('input', check);
      input.addEventListener('change', check);
      input.addEventListener('blur', function () {
        if (input.required && input.value.trim() === '') group.classList.add('is-error');
      });
      check();
    }
    watchField('name-input', 'group-name');
    watchField('date-input', 'group-date-first');
    watchField('time-input', 'group-time');

    document.addEventListener('astro:city-selected', function () {
      const group = document.getElementById('group-city');
      if (group) {
        group.classList.add('is-valid');
        group.classList.remove('is-error');
      }
    });
    document.getElementById('city-input')?.addEventListener('input', function () {
      const group = document.getElementById('group-city');
      if (group) group.classList.remove('is-valid', 'is-error');
    });

    const calculateButton = document.getElementById('calculate-btn');
    if (form && calculateButton) {
      form.addEventListener('submit', function () {
        requestAnimationFrame(function () {
          if (form.querySelector('.form-group.is-error')) return;
          calculateButton.classList.add('is-loading');
          calculateButton.disabled = true;
          window.setTimeout(resetCalcBtn, 8000);
        });
      });
    }

    setTimeAccuracy((accuracyInput && accuracyInput.value) || (timeInput && timeInput.value ? 'exact' : 'unknown'));
  }

  function initPersonalMemory() {
    if (!window.APPersonalMemory) return;
    var restored = APPersonalMemory.applyDraftToForm();
    if (restored && window.AstroApp) {
      AstroApp.showToast('Welcome back', 'Your last chart details were restored from this device.', 'success');
    }
    APPersonalMemory.watchChartForm(form);
  }

  function boot() {
    if (booted) return;
    booted = true;
    initNodeToggle();
    initAdvancedAccordion();
    initPersonalMemory();
    initFormInteractions();
    restoreFromURL();
    prefillFromHandoff();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

})();
