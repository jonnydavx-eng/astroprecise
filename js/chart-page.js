/**
 * AstroPrecise — Birth Chart Page Controller
 * Wires the chart form to the ephemeris engine, renders results, and adds
 * city autocomplete, timezone-correct UT conversion, shareable links, a
 * downloadable natal poster, and a premium Big Three share card.
 *
 * Requires: ephemeris.js, chart-render.js, interpretations.js, profile.js, app.js
 */

(function () {
  'use strict';

  if (!document.getElementById('chart-form')) return;

  const E = () => window.AstroEphemeris;

  // ── Glyph / display maps ──────────────────────────────────────────────────

  const SIGN_GLYPHS = {
    Aries:'♈︎', Taurus:'♉︎', Gemini:'♊︎', Cancer:'♋︎',
    Leo:'♌︎', Virgo:'♍︎', Libra:'♎︎', Scorpio:'♏︎',
    Sagittarius:'♐︎', Capricorn:'♑︎', Aquarius:'♒︎', Pisces:'♓︎',
  };
  const PLANET_GLYPHS = {
    Sun:'☉', Moon:'☽', Mercury:'☿', Venus:'♀', Mars:'♂', Jupiter:'♃',
    Saturn:'♄', Uranus:'♅', Neptune:'♆', Pluto:'♇', Chiron:'⚷', Lilith:'⚸',
    NorthNode:'☊', SouthNode:'☋', Ascendant:'AC', Midheaven:'MC',
  };
  const ASPECT_DISPLAY = {
    conjunction:    { name:'Conjunction',    glyph:'☌', color:'#e8c96a' },
    opposition:     { name:'Opposition',     glyph:'☍', color:'#b04a52' },
    trine:          { name:'Trine',          glyph:'△', color:'#3fae7a' },
    square:         { name:'Square',         glyph:'□', color:'#b04a52' },
    sextile:        { name:'Sextile',        glyph:'⚹', color:'#9db36a' },
    quincunx:       { name:'Quincunx',       glyph:'⚻', color:'#9aa6c8' },
    semisquare:     { name:'SemiSquare',     glyph:'∠', color:'#9aa6c8' },
    sesquiquadrate: { name:'Sesquiquadrate', glyph:'⚼', color:'#9aa6c8' },
    semisextile:    { name:'Semisextile',    glyph:'⚺', color:'#9aa6c8' },
    quintile:       { name:'Quintile',       glyph:'Q', color:'#9aa6c8' },
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
    fire:  '#c84832',
    earth: '#2d8a3e',
    air:   '#4a7ac7',
    water: '#5B3FA0',
  };
  const ELEMENT_LABEL_COLORS = {
    fire:  '#e07060',
    earth: '#5ab870',
    air:   '#7aabef',
    water: '#8B6FD4',
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

  // ── City autocomplete ─────────────────────────────────────────────────────

  const cityInput = document.getElementById('city-input');
  const dropdown  = document.getElementById('city-autocomplete');
  const latInput  = document.getElementById('lat-input');
  const lonInput  = document.getElementById('lon-input');
  const tzInput   = document.getElementById('tz-input');
  let activeIdx   = -1;

  const esc = s => String(s).replace(/[&<>"']/g,
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

  function readForm() {
    const name = document.getElementById('name-input').value.trim();
    const date = document.getElementById('date-input').value;
    const time = document.getElementById('time-input').value || '12:00';
    const lat  = parseFloat(latInput.value);
    const lon  = parseFloat(lonInput.value);
    const tz   = tzInput.value;
    if (!name) return { error: 'Please enter your name.', focus: 'name-input' };
    if (!date) return { error: 'Please enter your birth date.', focus: 'date-input' };
    if (isNaN(lat) || isNaN(lon)) return { error: 'Please pick your birth city from the dropdown.', focus: 'city-input' };
    const [y, m, d]  = date.split('-').map(Number);
    const [hh, mm]   = time.split(':').map(Number);
    // Guard against malformed date/time (e.g. a hand-edited share URL): NaN
    // doesn't throw, it would silently render a chart full of NaN°.
    if (![y, m, d, hh, mm].every(Number.isFinite) ||
        m < 1 || m > 12 || d < 1 || d > 31 || hh > 23 || mm > 59) {
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
      if (window.AstroApp) AstroApp.showToast('Missing details', input.error, 'warning');
      document.getElementById(input.focus)?.focus();
      resetCalcBtn();
      return;
    }
    setTimeout(() => {
      try {
        currentChart = calculate(input);
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
            name: input.name.split(/\s+/)[0],
            sunSign: currentChart.positions.Sun?.sign,
            points: pts,
            savedAt: Date.now(),
          }));
          if (window.AstroApp) AstroApp.showToast('Pinned to the heavens',
            'Your Sun, Moon' + (input.timeKnown ? ' & Ascendant' : '') + ' now mark the home orrery’s zodiac ring.', 'success');
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

  // Sample chart — Frida Kahlo
  document.getElementById('sample-btn')?.addEventListener('click', () => {
    document.getElementById('name-input').value = 'Sample: Frida Kahlo';
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
        const r2 = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latInput.value}&longitude=${lonInput.value}&timezone=auto&forecast_days=1`);
        const j = await r2.json();
        if (j.timezone) tzInput.value = j.timezone;
      } catch (e) {}
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
    document.dispatchEvent(new CustomEvent('astro:city-selected'));
    ['name-input', 'date-input', 'time-input'].forEach(id =>
      document.getElementById(id).dispatchEvent(new Event('input')));
    form.requestSubmit();
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
    wrapEl.classList.remove('hidden');

    document.getElementById('result-name').textContent = `${chart.name} — Natal Chart`;
    document.getElementById('result-date').textContent =
      `${chart.birthDate}${chart.birthTime ? ' at ' + chart.birthTime : ' (time unknown — houses approximate)'} · ${chart.city}`;

    renderBigThree(chart);
    renderWheel(chart);
    renderTabs(chart);
    initTabs();
    renderDeepTeaser(chart);
    initEmailCapture(chart);

    wrapEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderBigThree(chart) {
    const el = document.getElementById('big-three');
    if (!el) return;
    const items = [
      { planet:'☉ Sun',    sub:'Core Identity',  sign: chart.positions.Sun.sign,  glyph: SIGN_GLYPHS[chart.positions.Sun.sign] || '?', deg: fmtDeg(chart.positions.Sun) },
      { planet:'☽ Moon',   sub:'Inner World',    sign: chart.positions.Moon.sign, glyph: SIGN_GLYPHS[chart.positions.Moon.sign] || '?', deg: fmtDeg(chart.positions.Moon) },
      { planet:'↑ Rising', sub:'Outward Self',   sign: chart.risingSign,          glyph: SIGN_GLYPHS[chart.risingSign] || '?', deg: '' },
    ];
    el.innerHTML = items.map(it => `
      <div class="big-three-card">
        <p class="big-three-card__planet">${it.planet} · ${it.sub}</p>
        ${(window.AstroIcons && AstroIcons.SIGN_GLYPH[it.sign]) ? AstroIcons.sign(it.sign,{lg:true,class:'big-three-card__orb'}) : '<span class="big-three-card__glyph" aria-hidden="true">'+it.glyph+'</span>'}
        <h3 class="big-three-card__sign">${it.sign}</h3>
        <p class="big-three-card__desc">${it.deg ? it.deg + ' · ' : ''}${ELEMENT_MAP[it.sign] ? cap(ELEMENT_MAP[it.sign]) + ' · ' + cap(MODALITY_MAP[it.sign] || '') : ''}</p>
      </div>`).join('');
  }

  function renderWheel(chart) {
    const el = document.getElementById('natal-wheel');
    if (!el || !window.AstroChartRender) return;
    el.innerHTML = '';
    AstroChartRender.renderNatalChart(
      { positions: chart.positions, houses: chart.houses, aspects: chart.renderAspects,
        name: chart.name, dominant: chart.dominant, chartRuler: chart.chartRuler },
      'natal-wheel',
      { title: null });
  }

  function renderTabs(chart) {
    const I = window.AstroInterpretations;

    // Overview
    const ov = document.getElementById('analysis-content');
    if (ov) {
      let a = null;
      try { a = I && I.analyzeChartDetailed ? I.analyzeChartDetailed(chart) : null; } catch (e) { a = null; }
      const blocks = [];
      blocks.push(analysisSection('Dominant Energy',
        `Your chart leads with <strong>${chart.dominantElement}</strong> energy in the <strong>${chart.dominantModality}</strong> mode. ` +
        `The chart ruler is <strong>${cap(chart.chartRuler || '—')}</strong>, lord of your ${chart.risingSign} Ascendant.`));
      if (a) {
        if (a.personality) blocks.push(analysisSection('Personality', a.personality));
        if (a.love)        blocks.push(analysisSection('Love & Connection', a.love));
        if (a.career)      blocks.push(analysisSection('Career & Calling', a.career));
        if (a.challenges)  blocks.push(analysisSection('Growth Edges', a.challenges));
        if (a.lifePurpose) blocks.push(analysisSection('Life Purpose', a.lifePurpose));
      }
      const patterns = I && I.detectChartPatterns
        ? I.detectChartPatterns(chart.positions, chart.aspects)
        : [];
      if (patterns.length) {
        const patternCards = patterns.map(patt => `
          <div class="pattern-card" style="margin-bottom:var(--space-3);padding:var(--space-3) var(--space-4);background:rgba(255,255,255,0.04);border-radius:8px;border-left:3px solid var(--gold);">
            <div style="display:flex;align-items:center;gap:var(--space-2);margin-bottom:var(--space-1);">
              <span style="font-size:1.2em;color:var(--gold);">${patt.glyph}</span>
              <strong style="color:var(--gold);">${patt.name}</strong>
              ${patt.strength === 'major' ? '<span style="font-size:0.7em;color:var(--silver-dim);text-transform:uppercase;letter-spacing:0.05em;">Major</span>' : ''}
            </div>
            <p style="margin:0;color:var(--silver);font-size:0.9em;line-height:1.5;">${patt.description}</p>
          </div>`).join('');
        blocks.push(`<div class="analysis-section">
          <h4 class="analysis-section__title">Chart Patterns</h4>
          ${patternCards}
        </div>`);
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
          <div class="pattern-card" style="margin-bottom:var(--space-3);padding:var(--space-3) var(--space-4);background:rgba(92, 74, 110,0.07);border-radius:8px;border-left:3px solid var(--violet-bright);">
            <div style="display:flex;align-items:center;gap:var(--space-2);margin-bottom:var(--space-1);flex-wrap:wrap;">
              <span style="font-size:1.1em;color:var(--violet-bright);">✦</span>
              <strong style="color:var(--violet-bright);">${fs.point} conjunct ${fs.star}</strong>
              <span style="font-size:0.75em;color:var(--silver-dim);">${fs.orb.toFixed(1)}° orb · ${fs.constellation}</span>
              ${fs.royal ? `<span style="font-size:0.7em;color:var(--gold);text-transform:uppercase;letter-spacing:0.05em;">★ Royal Star — ${fs.royal}</span>` : ''}
            </div>
            <p style="margin:0;color:var(--silver);font-size:0.9em;line-height:1.5;">${fs.meaning}</p>
          </div>`).join('');
        blocks.push(`<div class="analysis-section">
          <h4 class="analysis-section__title">Fixed Star Conjunctions</h4>
          <p style="font-size:0.85em;color:var(--silver-dim);margin-bottom:var(--space-3);">Natal points within 1° of the major named stars, precession-corrected to your birth year.</p>
          ${starCards}
        </div>`);
      }

      ov.innerHTML = blocks.join('');
    }

    // Planets
    const pt = document.getElementById('planets-table');
    if (pt) {
      const order = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto','Chiron','Lilith','NorthNode','SouthNode'];
      const DISPLAY_NAME = { NorthNode:'North Node', SouthNode:'South Node', Lilith:'Lilith' };
      pt.innerHTML = order.filter(k => chart.positions[k]).map(k => {
        const p = chart.positions[k];
        const h = chart.planetHouses[k];
        const planetName = DISPLAY_NAME[k] ? DISPLAY_NAME[k].toLowerCase() : k.toLowerCase();
        const signName = (p.sign || '').toLowerCase();
        const dignity = I && I.getDignity ? I.getDignity(planetName, signName) : null;
        const dignityHtml = dignity && dignity.status !== 'peregrine'
          ? `<span class="dignity-badge dignity-badge--${dignity.status}" title="${dignity.note}" style="display:inline-block;margin-left:var(--space-2);font-size:0.7em;padding:1px 5px;border-radius:3px;vertical-align:middle;background:rgba(201, 162, 39,0.15);color:var(--gold);border:1px solid rgba(201, 162, 39,0.3);">${dignity.glyph} ${dignity.label}</span>`
          : '';
        const decan = I && I.getDecan && typeof p.lon === 'number' ? I.getDecan(p.lon) : null;
        const decanHtml = decan
          ? ` · <span title="${decan.label} of ${p.sign} (triplicity sub-ruler)" style="cursor:help;">D${decan.index} ${decan.glyph}</span>`
          : '';
        return `<div class="planet-data-row">
          ${(window.AstroIcons && AstroIcons.PLANET_GLYPH[k]) ? AstroIcons.planet(k,{lg:true,class:'planet-data-row__orb'}) : '<span class="planet-data-row__glyph">'+(PLANET_GLYPHS[k]||'')+'</span>'}
          <div>
            <div class="planet-data-row__name">${DISPLAY_NAME[k] || k}${p.retrograde ? ' <span style="color:var(--crimson-light);font-size:0.7em;">℞</span>' : ''}</div>
            <div class="planet-data-row__sign">${window.AstroIcons ? AstroIcons.sign(p.sign,{sm:true})+' ' : (SIGN_GLYPHS[p.sign]||'')+' '}${p.sign}${h ? ` · H${h}` : ''}${decanHtml}${dignityHtml}</div>
          </div>
          <span class="planet-data-row__deg">${fmtDeg(p)}</span>
        </div>`;
      }).join('');
      // Honest disclosure of which lunar-node model produced the nodes shown.
      if (chart.nodeMode) {
        const modeLabel = chart.nodeMode === 'true' ? 'True (osculating) node' : 'Mean node';
        pt.innerHTML += `<p style="margin:var(--space-3) var(--space-4) 0;font-size:0.66rem;color:var(--silver-dim);letter-spacing:0.04em;">
          Lunar nodes: <strong style="color:var(--gold-pale);">${modeLabel}</strong> · Lilith = mean Black Moon (lunar apogee). South Node = North Node + 180°.</p>`;
      }
    }

    // Houses
    const ht = document.getElementById('houses-table');
    if (ht) {
      ht.innerHTML = chart.houses.map((cusp, i) => {
        const sign = E().signOf(cusp);
        const deg  = cusp % 30;
        const dg = Math.floor(deg), mn = Math.round((deg - dg) * 60);
        return `<div class="planet-data-row">
          <span class="planet-data-row__glyph" style="font-size:0.75rem;color:var(--gold);">${roman(i + 1)}</span>
          <div>
            <div class="planet-data-row__name">House ${i + 1}</div>
            <div class="planet-data-row__sign">${HOUSE_THEMES[i]}</div>
          </div>
          <span class="planet-data-row__deg">${window.AstroIcons ? AstroIcons.sign(sign,{sm:true})+' ' : (SIGN_GLYPHS[sign]||'')+' '}${dg}°${String(mn).padStart(2,'0')}′</span>
        </div>`;
      }).join('');
    }

    // Aspects
    const at = document.getElementById('aspects-table');
    if (at) {
      const main = chart.aspects
        .filter(x => !['Ascendant','Midheaven','SouthNode'].includes(x.planet1) &&
                     !['Ascendant','Midheaven','SouthNode'].includes(x.planet2))
        .sort((x, y) => x.orb - y.orb)
        .slice(0, 18);
      at.innerHTML = main.map(x => {
        const d = ASPECT_DISPLAY[x.aspect] || { name: x.aspect, glyph: '·', color: 'var(--silver)' };
        return `<div class="planet-data-row" style="border-left:3px solid ${d.color};padding-left:var(--space-3);">
          <span class="planet-data-row__glyph" style="color:${d.color};">${d.glyph}</span>
          <div>
            <div class="planet-data-row__name">${x.planet1} ${d.name} ${x.planet2}</div>
            <div class="planet-data-row__sign">${x.applying ? 'Applying' : 'Separating'}</div>
          </div>
          <span class="planet-data-row__deg">${x.orb.toFixed(1)}° orb</span>
        </div>`;
      }).join('') || '<p style="color:var(--silver-dim);padding:var(--space-4);">No major aspects within orb.</p>';
    }
  }

  function analysisSection(title, html) {
    return `<div class="analysis-section">
      <h4 class="analysis-section__title">${title}</h4>
      <p>${html}</p>
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

    const orbFor = s =>
      (window.AstroIcons && AstroIcons.SIGN_GLYPH && AstroIcons.SIGN_GLYPH[s.sign])
        ? (s.planet && AstroIcons.PLANET_GLYPH && AstroIcons.PLANET_GLYPH[s.planet]
            ? AstroIcons.planet(s.planet, { class: 'deep-snippet__orb' })
            : AstroIcons.sign(s.sign, { class: 'deep-snippet__orb' }))
        : '<span class="deep-snippet__orb" aria-hidden="true">✦</span>';

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
      ? `<p class="deep-teaser__format">A personalised 6–10 page PDF, drawn line by line from your exact chart${priceBit}. One-time — yours to keep, no subscription.</p>
         <a class="btn--deep" id="deep-cta" href="${esc(url)}" target="_blank" rel="noopener">
           ✦ Unlock Your Deep Reading${price ? ' — ' + esc(price) : ''}
         </a>
         <p class="deep-teaser__honest">Opens a secure checkout on our partner store. The chart you cast here never leaves your browser — your reading is hand-prepared from the birth details you enter at checkout.</p>`
      : `<button type="button" class="btn--deep" id="deep-cta">
           ✦ Full readings coming soon
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

  let emailCaptureWired = false;

  function initEmailCapture(chart) {
    const host = document.getElementById('email-capture');
    if (!host) return;
    host.hidden = false;            // reveal alongside a cast chart

    if (emailCaptureWired) return;  // wire the form exactly once
    emailCaptureWired = true;

    const form = document.getElementById('email-capture-form');
    const input = document.getElementById('email-capture-input');
    const doneMsg = document.getElementById('email-capture-done-msg');
    if (!form || !input) return;

    const validEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

    form.addEventListener('submit', async ev => {
      ev.preventDefault();
      const email = input.value.trim();
      if (!validEmail(email)) {
        if (window.AstroApp) AstroApp.showToast('Check your email',
          'That doesn’t look like a valid email address.', 'warning');
        input.focus();
        return;
      }

      const M = window.AP_MON || {};
      const endpoint = typeof M.emailUrl === 'string' ? M.emailUrl.trim() : '';
      const configured = /^https?:\/\//i.test(endpoint);

      if (configured) {
        // Standard hosted-newsletter POST (Buttondown/Mailchimp form action).
        // no-cors keeps it a fire-and-forget subscribe from a static page; we
        // only ever send the address the visitor typed — no birth data.
        try {
          const body = new FormData();
          body.append('email', email);
          await fetch(endpoint, { method: 'POST', mode: 'no-cors', body });
        } catch (e) { /* opaque/no-cors — treat as sent, confirm below */ }
        if (doneMsg) doneMsg.innerHTML = '<strong>You’re on the list.</strong> Your cosmic weather will arrive by email — unsubscribe anytime.';
        if (window.AstroApp) AstroApp.showToast('Subscribed', 'You’ll get your cosmic weather by email.', 'success');
      } else {
        // DORMANT: nothing leaves the device. Save intent locally only.
        try {
          const key = 'ap_email_intent';
          const prev = JSON.parse(localStorage.getItem(key) || '[]');
          prev.push({
            email,
            forName: (chart && chart.name) ? String(chart.name).split(/\s+/)[0] : null,
            sunSign: chart && chart.positions && chart.positions.Sun ? chart.positions.Sun.sign : null,
            savedAt: Date.now(),
          });
          localStorage.setItem(key, JSON.stringify(prev.slice(-20)));
        } catch (e) {}
        if (doneMsg) doneMsg.innerHTML = '<strong>We’ll let you know.</strong> Saved on your device only — no email has been sent anywhere yet. The moment readings open, you’ll be first.';
        if (window.AstroApp) AstroApp.showToast('Saved on your device',
          'Email signup isn’t live yet, so nothing left your browser — we kept your interest locally.', 'info');
      }

      host.classList.add('is-done');
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
      });
    });
  }

  // ── Action buttons ────────────────────────────────────────────────────────

  document.getElementById('save-btn')?.addEventListener('click', () => {
    if (!currentChart) return;
    if (window.AstroProfile) {
      AstroProfile.saveChart({
        name: currentChart.name, birthDate: currentChart.birthDate,
        birthTime: currentChart.birthTime, city: currentChart.city,
        lat: currentChart.lat, lon: currentChart.lon, tz: currentChart.tz,
        sunSign: currentChart.positions.Sun.sign,
        moonSign: currentChart.positions.Moon.sign,
        risingSign: currentChart.risingSign,
      });
      if (window.AstroApp) AstroApp.showToast('Saved', 'Chart saved to your profile.', 'success');
    }
  });

  // Share Chart → one-tap share of the polished square image (Web Share API with
  // an image file where supported), falling back to a copied link otherwise.
  document.getElementById('share-btn')?.addEventListener('click', async () => {
    if (!currentChart) return;
    const url  = location.href;
    const text = `${currentChart.name}: ☉ ${currentChart.positions.Sun.sign} · ☽ ${currentChart.positions.Moon.sign} · ↑ ${currentChart.risingSign}`;
    // Prefer sharing the generated image (richer than a bare link) on capable devices.
    if (navigator.canShare && navigator.share) {
      try {
        const blob = await canvasToBlob(paintShareImage(currentChart, 'square'));
        const file = blob && new File([blob], `${slugify(currentChart.name)}-natal-square.png`, { type: 'image/png' });
        if (file && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: 'My Birth Chart — AstroPrecise', text, url });
          return;
        }
      } catch (e) { if (e && e.name === 'AbortError') return; /* else fall through */ }
    }
    try {
      if (navigator.share) {
        await navigator.share({ title: 'My Birth Chart — AstroPrecise', text, url });
      } else {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        if (window.AstroApp) AstroApp.showToast('Link copied', 'Share link copied to clipboard.', 'success');
      }
    } catch (e) { /* user cancelled */ }
  });

  // Big Three Card → one-tap export of the polished square image.
  document.getElementById('print-btn')?.addEventListener('click', () => {
    if (!currentChart) { window.print(); return; }
    exportShareImage(currentChart, 'square');
  });

  document.getElementById('json-btn')?.addEventListener('click', () => {
    if (!currentChart) return;
    const I = window.AstroInterpretations;
    const data = {
      generator: 'AstroPrecise (astroprecise ephemeris — truncated VSOP87/ELP2000, ~1′ accuracy)',
      exported: new Date().toISOString(),
      name: currentChart.name,
      birthDate: currentChart.birthDate,
      birthTime: currentChart.birthTime || null,
      place: { city: currentChart.city, lat: currentChart.lat, lon: currentChart.lon, tz: currentChart.tz },
      risingSign: currentChart.risingSign,
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
  //   • square   1080×1080  — Instagram / general social post
  //   • story    1080×1920  — IG / FB / WhatsApp story (9:16)
  //   • print    2480×3508  — A4-proportioned, print-on-demand poster (300dpi)
  // The merch / print-on-demand line will reuse the SAME pipeline, so geometry is
  // expressed in a 0..1 "design space" and multiplied by the canvas size: the
  // print export is genuinely high-resolution, not an upscaled screenshot.
  // Honest + deterministic: only the real computed chart is ever drawn.
  // ═══════════════════════════════════════════════════════════════════════════

  // Cinzel (display) + Inter (sans), loaded by the page <head>; serif/sans fallback.
  const FONT_DISPLAY = '"Cinzel", "Cormorant Garamond", Georgia, serif';
  const FONT_SANS    = '"Inter", "Helvetica Neue", Arial, sans-serif';

  // Engraved palette (matches css/main.css :root) ────────────────────────────
  const PAL = {
    void:     '#050406',
    voidWarm: '#0D0A07',
    lapis:    '#6e1a26',   // repurposed cool→warm: structural/accent lines are now oxblood, not blue
    gold:     '#C9A227',
    goldHi:   '#EFE3C0',
    goldPale: '#E8E0D0',
    parchment:'#E8E0D0',
    oxblood:  '#6e1a26',
    silver:   '#A89E88',
    silverDim:'#6E6658',
  };

  const SHARE_FORMATS = {
    square: { w: 1080, h: 1080 },
    story:  { w: 1080, h: 1920 },
    print:  { w: 2480, h: 3508 }, // A4 @ ~300dpi — print-on-demand ready
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
    x.fillStyle = 'rgba(201,162,39,0.05)';
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
        ? `rgba(232,201,106,${alpha})`
        : `rgba(240,232,216,${alpha})`;
      x.beginPath();
      x.arc(rnd() * W, rnd() * H, r, 0, Math.PI * 2);
      x.fill();
    }
  }

  // Void → lapis cosmic ground + nebulae (scaled, deterministic).
  function paintBackground(x, W, H, seed, S) {
    // Vertical void → lapis gradient
    const g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, PAL.void);
    g.addColorStop(0.55, PAL.voidWarm);
    g.addColorStop(1, '#13100C');
    x.fillStyle = g; x.fillRect(0, 0, W, H);

    // Gold nebula (top)
    const neb1 = x.createRadialGradient(W * 0.72, H * 0.16, 0, W * 0.72, H * 0.16, Math.max(W, H) * 0.75);
    neb1.addColorStop(0, 'rgba(201,162,39,0.20)');
    neb1.addColorStop(0.5, 'rgba(201,162,39,0.06)');
    neb1.addColorStop(1, 'transparent');
    x.fillStyle = neb1; x.fillRect(0, 0, W, H);

    // Oxblood nebula (lower)
    const neb2 = x.createRadialGradient(W * 0.2, H * 0.86, 0, W * 0.2, H * 0.86, Math.max(W, H) * 0.7);
    neb2.addColorStop(0, 'rgba(110,26,38,0.30)');
    neb2.addColorStop(0.5, 'rgba(110,26,38,0.08)');
    neb2.addColorStop(1, 'transparent');
    x.fillStyle = neb2; x.fillRect(0, 0, W, H);

    drawDotGrid(x, W, H, S);
    drawStars(x, W, H, Math.round((W * H) / 5200), seed, S);

    // Subtle vignette to focus the eye
    const vig = x.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.72);
    vig.addColorStop(0, 'transparent');
    vig.addColorStop(1, 'rgba(5,6,14,0.55)');
    x.fillStyle = vig; x.fillRect(0, 0, W, H);
  }

  // Double gold frame with generous margin (print bleed-friendly).
  function drawFrame(x, W, H, outerInset, innerInset) {
    x.strokeStyle = 'rgba(196,146,10,0.7)';
    x.lineWidth = Math.max(2, outerInset * 0.05);
    x.strokeRect(outerInset, outerInset, W - outerInset * 2, H - outerInset * 2);
    x.strokeStyle = 'rgba(196,146,10,0.3)';
    x.lineWidth = Math.max(1, outerInset * 0.025);
    x.strokeRect(innerInset, innerInset, W - innerInset * 2, H - innerInset * 2);
    // Corner ticks
    x.strokeStyle = 'rgba(232,201,106,0.55)';
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

  // Sign-glyph helper drawing a small glass orb behind the unicode glyph.
  function drawSignOrb(x, glyph, cx, cy, r, elemCol) {
    const grad = x.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r);
    grad.addColorStop(0, 'rgba(255,255,255,0.18)');
    grad.addColorStop(0.4, elemCol + 'cc');
    grad.addColorStop(1, elemCol + '33');
    x.fillStyle = grad;
    x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill();
    x.strokeStyle = 'rgba(196,146,10,0.55)';
    x.lineWidth = Math.max(1, r * 0.06);
    x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.stroke();
    // top highlight
    x.strokeStyle = 'rgba(255,255,255,0.28)';
    x.lineWidth = Math.max(1, r * 0.05);
    x.beginPath(); x.arc(cx, cy, r * 0.78, Math.PI * 1.15, Math.PI * 1.85); x.stroke();
    x.fillStyle = PAL.parchment;
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = `400 ${r * 0.95}px ${FONT_DISPLAY}`;
    x.fillText(glyph, cx, cy + r * 0.04);
  }

  // ── The natal wheel, drawn in design-space (cx,cy,radius in px) ────────────
  function drawWheel(x, chart, cx, cy, R) {
    const SIGNS_ORDER = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo',
                         'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
    const ELEMENT_SECTOR = {
      Aries:'rgba(200,72,50,0.12)', Taurus:'rgba(45,138,62,0.12)', Gemini:'rgba(74,122,199,0.12)', Cancer:'rgba(91,63,160,0.14)',
      Leo:'rgba(200,72,50,0.12)', Virgo:'rgba(45,138,62,0.12)', Libra:'rgba(74,122,199,0.12)', Scorpio:'rgba(91,63,160,0.14)',
      Sagittarius:'rgba(200,72,50,0.12)', Capricorn:'rgba(45,138,62,0.12)', Aquarius:'rgba(74,122,199,0.12)', Pisces:'rgba(91,63,160,0.14)',
    };
    const rOuter     = R;
    const rBand      = R * 0.89;
    const rSignInner = R * 0.755;
    const rPlanets   = R * 0.61;
    const rInner     = R * 0.475;
    const lw = R / 410; // line-weight scale relative to the original 410px wheel

    const ascLon = chart.asc || 0;
    const ang = lon => Math.PI - ((lon - ascLon) * Math.PI / 180);

    // Rings
    x.strokeStyle = 'rgba(196,146,10,0.75)'; x.lineWidth = 3 * lw;
    x.beginPath(); x.arc(cx, cy, rOuter, 0, Math.PI * 2); x.stroke();
    x.strokeStyle = 'rgba(196,146,10,0.45)'; x.lineWidth = 1.5 * lw;
    x.beginPath(); x.arc(cx, cy, rSignInner, 0, Math.PI * 2); x.stroke();
    x.strokeStyle = 'rgba(196,146,10,0.3)'; x.lineWidth = 1 * lw;
    x.beginPath(); x.arc(cx, cy, rBand, 0, Math.PI * 2); x.stroke();
    x.strokeStyle = 'rgba(196,146,10,0.22)'; x.lineWidth = 1 * lw;
    x.beginPath(); x.arc(cx, cy, rInner, 0, Math.PI * 2); x.stroke();

    // Sign sectors
    for (let i = 0; i < 12; i++) {
      const a1 = ang(i * 30), a2 = ang((i + 1) * 30);
      const sign = SIGNS_ORDER[i];
      x.fillStyle = ELEMENT_SECTOR[sign] || 'transparent';
      x.beginPath(); x.moveTo(cx, cy);
      x.arc(cx, cy, rOuter, a1, a2, a1 > a2); x.closePath(); x.fill();

      x.strokeStyle = 'rgba(196,146,10,0.3)'; x.lineWidth = 1 * lw;
      x.beginPath();
      x.moveTo(cx + Math.cos(a1) * rSignInner, cy + Math.sin(a1) * rSignInner);
      x.lineTo(cx + Math.cos(a1) * rOuter,     cy + Math.sin(a1) * rOuter);
      x.stroke();

      const mid = ang(i * 30 + 15);
      const gR  = (rBand + rSignInner) / 2;
      x.fillStyle = PAL.gold;
      x.font = `400 ${R * 0.1}px ${FONT_DISPLAY}`;
      x.textBaseline = 'middle'; x.textAlign = 'center';
      x.fillText(SIGN_GLYPHS[sign] || '', cx + Math.cos(mid) * gR, cy + Math.sin(mid) * gR);
    }

    // 10° ticks
    x.strokeStyle = 'rgba(196,146,10,0.4)';
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
      haloGrad.addColorStop(0, 'rgba(196,146,10,0.22)');
      haloGrad.addColorStop(1, 'transparent');
      x.fillStyle = haloGrad;
      x.beginPath(); x.arc(px2, py2, haloR, 0, Math.PI * 2); x.fill();

      x.fillStyle = PAL.parchment;
      x.font = `400 ${R * 0.112}px ${FONT_DISPLAY}`;
      x.textBaseline = 'middle'; x.textAlign = 'center';
      x.fillText(PLANET_GLYPHS[k] || '', px2, py2);

      if (p.retrograde) {
        x.fillStyle = '#c97a82';
        x.font = `500 ${R * 0.04}px ${FONT_SANS}`;
        x.fillText('℞', px2 + R * 0.055, py2 - R * 0.05);
      }
    });
    x.textBaseline = 'alphabetic';

    // Centre star
    x.fillStyle = 'rgba(196,146,10,0.95)';
    x.font = `400 ${R * 0.14}px ${FONT_DISPLAY}`;
    x.textBaseline = 'middle'; x.textAlign = 'center';
    x.fillText('✦', cx, cy);
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

    x.strokeStyle = 'rgba(196,146,10,0.22)'; x.lineWidth = 1 * scale;
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

    x.strokeStyle = 'rgba(196,146,10,0.22)'; x.lineWidth = 1 * scale;
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
        x.fillText(`${SIGN_GLYPHS[row.p.sign] || ''} ${row.p.sign}`, colX + 56 * scale, ry + 34 * scale);

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

  // ── THE UNIFIED PAINTER ───────────────────────────────────────────────────
  // Returns a canvas for the requested format. All three formats share the same
  // header → wheel → footer spine; 'print' and 'story' add the detail panels.
  function paintShareImage(chart, format) {
    const fmt = SHARE_FORMATS[format] || SHARE_FORMATS.square;
    const W = fmt.w, H = fmt.h;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const S = W / 1080;                       // scale relative to the 1080-wide baseline
    const seed = seedFromChart(chart);

    paintBackground(x, W, H, seed, S);
    drawFrame(x, W, H, 44 * S, 62 * S);

    const cityShort = (chart.city || '').split(',')[0];
    const accLine = 'VSOP87 · ELP2000 · computed privately in your browser';

    // ── Header (shared) ──
    x.textAlign = 'center';
    let y = 116 * S;
    x.fillStyle = PAL.gold;
    x.font = `500 ${24 * S}px ${FONT_DISPLAY}`;
    x.fillText('✦  A S T R O P R E C I S E  ✦', W / 2, y);

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
      drawSignOrb(x, SIGN_GLYPHS[t.sign] || '?', tx, y, orbR, elemCol);
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
    x.strokeStyle = 'rgba(196,146,10,0.25)'; x.lineWidth = 1 * S;
    x.beginPath(); x.moveTo(W * 0.2, H - 108 * S); x.lineTo(W * 0.8, H - 108 * S); x.stroke();
    x.fillStyle = PAL.silverDim;
    x.font = `400 ${20 * S}px ${FONT_SANS}`;
    x.fillText(`✦  astroprecise  ·  ${accLine}  ✦`, W / 2, H - 78 * S);

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
    const cv = paintShareImage(chart, format);
    const filename = `${slugify(chart.name)}-${format === 'print' ? 'natal-poster' : 'natal-' + format}.png`;
    const blob = await canvasToBlob(cv);
    if (!blob) { if (window.AstroApp) AstroApp.showToast('Export failed', 'Could not render the image.', 'error'); return; }

    // Try the Web Share API with a file (mobile-first), unless caller forces download.
    if (!opts.forceDownload && navigator.canShare && navigator.share) {
      try {
        const file = new File([blob], filename, { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'My Birth Chart — AstroPrecise',
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
      const labels = { square: 'Square image', story: 'Story image', print: 'Print poster' };
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
      'background:rgba(13, 10, 7,0.97);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);' +
      'border:1px solid rgba(196,146,10,0.35);box-shadow:0 24px 60px rgba(0,0,0,0.6);';
    const opts = [
      { fmt: 'square', title: 'Square · 1080×1080', sub: 'Instagram & social posts' },
      { fmt: 'story',  title: 'Story · 1080×1920',  sub: 'IG / WhatsApp stories' },
      { fmt: 'print',  title: 'Print poster · 2480×3508', sub: 'High-res, print-ready' },
    ];
    menu.innerHTML = opts.map(o =>
      `<button type="button" role="menuitem" data-fmt="${o.fmt}" style="display:block;width:100%;text-align:left;` +
      `padding:10px 12px;margin:2px 0;border:none;border-radius:10px;background:transparent;cursor:pointer;color:#f0e8d8;` +
      `font-family:Inter,sans-serif;transition:background .15s;">` +
      `<span style="display:block;font-weight:600;font-size:0.8rem;letter-spacing:0.04em;">${o.title}</span>` +
      `<span style="display:block;font-size:0.66rem;color:#9aa6c8;margin-top:2px;">${o.sub}</span></button>`
    ).join('');

    document.body.appendChild(menu);
    const r = anchorBtn.getBoundingClientRect();
    menu.style.top  = (r.bottom + window.scrollY + 8) + 'px';
    menu.style.left = (Math.min(r.left + window.scrollX, window.scrollX + window.innerWidth - menu.offsetWidth - 12)) + 'px';

    const close = () => { menu.remove(); document.removeEventListener('click', onDoc, true); };
    const onDoc = ev => { if (!menu.contains(ev.target) && ev.target !== anchorBtn) close(); };
    setTimeout(() => document.addEventListener('click', onDoc, true), 0);

    menu.querySelectorAll('button[data-fmt]').forEach(b => {
      b.addEventListener('mouseenter', () => { b.style.background = 'rgba(196,146,10,0.12)'; });
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
  // BIG THREE SHARE CARD
  // The "Big Three card" is now the polished square (1080×1080) share image —
  // produced by the same unified painter as the poster, so screen and merch
  // share one design language. Kept as a named function for the button wiring.
  // ═══════════════════════════════════════════════════════════════════════════

  function drawShareCard(chart) { return paintShareImage(chart, 'square'); }

  function addShareCardButton() {
    // The HTML already has the buttons; wiring lives below. No-op kept for boot.
  }

  // ── Boot ──────────────────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', () => {
    addShareCardButton();
    initNodeToggle();
    restoreFromURL();
  });
  if (document.readyState !== 'loading') {
    addShareCardButton();
    initNodeToggle();
    restoreFromURL();
  }

})();
