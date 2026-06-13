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
    Saturn:'♄', Uranus:'♅', Neptune:'♆', Pluto:'♇', Chiron:'⚷',
    NorthNode:'☊', SouthNode:'☋', Ascendant:'AC', Midheaven:'MC',
  };
  const ASPECT_DISPLAY = {
    conjunction:    { name:'Conjunction',    glyph:'☌', color:'#e8c96a' },
    opposition:     { name:'Opposition',     glyph:'☍', color:'#b04a52' },
    trine:          { name:'Trine',          glyph:'△', color:'#3fae7a' },
    square:         { name:'Square',         glyph:'□', color:'#b04a52' },
    sextile:        { name:'Sextile',        glyph:'⚹', color:'#5b7fc7' },
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
    pluto:'Pluto', chiron:'Chiron', northNode:'NorthNode', southNode:'SouthNode',
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
    };
  }

  function calculate(input) {
    const ut = localToUT(input.y, input.m, input.d, input.hh, input.mm, input.tz);
    const raw = E().calculateNatalChart(ut.y, ut.m, ut.d, ut.hh, ut.mm, input.lat, input.lon, input.houseSystem);
    return adaptChart(raw, {
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
        <span class="big-three-card__glyph" aria-hidden="true">${it.glyph}</span>
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
          <div class="pattern-card" style="margin-bottom:var(--space-3);padding:var(--space-3) var(--space-4);background:rgba(123,44,191,0.07);border-radius:8px;border-left:3px solid var(--violet-bright);">
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
      const order = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto','Chiron','NorthNode'];
      pt.innerHTML = order.filter(k => chart.positions[k]).map(k => {
        const p = chart.positions[k];
        const h = chart.planetHouses[k];
        const planetName = k === 'NorthNode' ? 'north node' : k.toLowerCase();
        const signName = (p.sign || '').toLowerCase();
        const dignity = I && I.getDignity ? I.getDignity(planetName, signName) : null;
        const dignityHtml = dignity && dignity.status !== 'peregrine'
          ? `<span class="dignity-badge dignity-badge--${dignity.status}" title="${dignity.note}" style="display:inline-block;margin-left:var(--space-2);font-size:0.7em;padding:1px 5px;border-radius:3px;vertical-align:middle;background:rgba(212,175,55,0.15);color:var(--gold);border:1px solid rgba(212,175,55,0.3);">${dignity.glyph} ${dignity.label}</span>`
          : '';
        const decan = I && I.getDecan && typeof p.lon === 'number' ? I.getDecan(p.lon) : null;
        const decanHtml = decan
          ? ` · <span title="${decan.label} of ${p.sign} (triplicity sub-ruler)" style="cursor:help;">D${decan.index} ${decan.glyph}</span>`
          : '';
        return `<div class="planet-data-row">
          <span class="planet-data-row__glyph">${PLANET_GLYPHS[k]}</span>
          <div>
            <div class="planet-data-row__name">${k === 'NorthNode' ? 'North Node' : k}${p.retrograde ? ' <span style="color:var(--crimson-light);font-size:0.7em;">℞</span>' : ''}</div>
            <div class="planet-data-row__sign">${SIGN_GLYPHS[p.sign] || ''} ${p.sign}${h ? ` · H${h}` : ''}${decanHtml}${dignityHtml}</div>
          </div>
          <span class="planet-data-row__deg">${fmtDeg(p)}</span>
        </div>`;
      }).join('');
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
          <span class="planet-data-row__deg">${SIGN_GLYPHS[sign] || ''} ${dg}°${String(mn).padStart(2,'0')}′</span>
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

  document.getElementById('share-btn')?.addEventListener('click', async () => {
    if (!currentChart) return;
    const url  = location.href;
    const text = `${currentChart.name}: ☉ ${currentChart.positions.Sun.sign} · ☽ ${currentChart.positions.Moon.sign} · ↑ ${currentChart.risingSign}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'My Birth Chart — AstroPrecise', text, url });
      } else {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        if (window.AstroApp) AstroApp.showToast('Link copied', 'Share link copied to clipboard.', 'success');
      }
    } catch (e) { /* user cancelled */ }
  });

  // print-btn now serves as Big Three card (HTML has it labelled that way)
  document.getElementById('print-btn')?.addEventListener('click', () => {
    if (!currentChart) { window.print(); return; }
    const cv = drawShareCard(currentChart);
    const a  = document.createElement('a');
    a.download = `${(currentChart.name || 'chart').replace(/[^\w]+/g, '-').toLowerCase()}-big-three.png`;
    a.href = cv.toDataURL('image/png');
    a.click();
    if (window.AstroApp) AstroApp.showToast('Card ready', 'Your Big Three card has been downloaded.', 'success');
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

  // ── Poster draw helpers ───────────────────────────────────────────────────

  // Try Cinzel from Google Fonts; fall back to Georgia / serif
  const FONT_DISPLAY = '"Cinzel", "Cormorant Garamond", Georgia, serif';
  const FONT_SANS    = '"Inter", "Helvetica Neue", Arial, sans-serif';

  // Draw a faint dot grid across the canvas
  function drawDotGrid(x, W, H) {
    const step = 48;
    x.fillStyle = 'rgba(150,175,230,0.04)';
    for (let gx = step; gx < W; gx += step) {
      for (let gy = step; gy < H; gy += step) {
        x.beginPath();
        x.arc(gx, gy, 1.2, 0, Math.PI * 2);
        x.fill();
      }
    }
  }

  // Draw deterministic stars
  function drawStars(x, W, H, count, seed0) {
    let seed = seed0;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < count; i++) {
      const alpha = 0.12 + rnd() * 0.52;
      const r     = rnd() * 1.8 + 0.3;
      x.fillStyle = `rgba(240,232,216,${alpha})`;
      x.beginPath();
      x.arc(rnd() * W, rnd() * H, r, 0, Math.PI * 2);
      x.fill();
    }
  }

  // Draw double gold frame
  function drawFrame(x, W, H, outerInset, innerInset) {
    x.strokeStyle = 'rgba(212,175,55,0.65)';
    x.lineWidth = 2.5;
    x.strokeRect(outerInset, outerInset, W - outerInset * 2, H - outerInset * 2);
    x.strokeStyle = 'rgba(212,175,55,0.28)';
    x.lineWidth = 1.5;
    x.strokeRect(innerInset, innerInset, W - innerInset * 2, H - innerInset * 2);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CHART POSTER — 1600×2000
  // ═══════════════════════════════════════════════════════════════════════════

  function drawChartPoster(chart) {
    const W = 1600, H = 2000;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');

    // ── Background ──
    x.fillStyle = '#0A0B1F';
    x.fillRect(0, 0, W, H);

    // Nebula gradients — richer, two-color
    const neb1 = x.createRadialGradient(W * 0.25, H * 0.18, 0, W * 0.25, H * 0.18, W * 0.85);
    neb1.addColorStop(0, 'rgba(123,44,191,0.30)');
    neb1.addColorStop(0.5, 'rgba(123,44,191,0.10)');
    neb1.addColorStop(1, 'transparent');
    x.fillStyle = neb1; x.fillRect(0, 0, W, H);

    const neb2 = x.createRadialGradient(W * 0.82, H * 0.88, 0, W * 0.82, H * 0.88, W * 0.75);
    neb2.addColorStop(0, 'rgba(110,26,38,0.20)');
    neb2.addColorStop(0.5, 'rgba(110,26,38,0.07)');
    neb2.addColorStop(1, 'transparent');
    x.fillStyle = neb2; x.fillRect(0, 0, W, H);

    const neb3 = x.createRadialGradient(W * 0.78, H * 0.08, 0, W * 0.78, H * 0.08, W * 0.5);
    neb3.addColorStop(0, 'rgba(91,127,199,0.12)');
    neb3.addColorStop(1, 'transparent');
    x.fillStyle = neb3; x.fillRect(0, 0, W, H);

    // Dot grid
    drawDotGrid(x, W, H);

    // Stars
    drawStars(x, W, H, 320, 1907);

    // Double frame
    drawFrame(x, W, H, 52, 72);

    // ── Header area (top 380px) ──
    x.textAlign = 'center';

    // "✦ NATAL CHART ✦" eyebrow
    x.fillStyle = '#D4AF37';
    x.font = `500 28px ${FONT_DISPLAY}`;
    x.fillText('✦  N A T A L   C H A R T  ✦', W / 2, 152);

    // Decorative separator line
    x.strokeStyle = 'rgba(212,175,55,0.3)';
    x.lineWidth = 1;
    x.beginPath(); x.moveTo(200, 172); x.lineTo(W - 200, 172); x.stroke();

    // Name — large Cinzel
    x.fillStyle = '#f0e8d8';
    x.font = `bold 80px ${FONT_DISPLAY}`;
    x.fillText(chart.name || 'Birth Chart', W / 2, 270);

    // Birth date + city
    x.fillStyle = '#9aa6c8';
    x.font = `400 32px ${FONT_SANS}`;
    const cityShort = (chart.city || '').split(',')[0];
    x.fillText(
      `${chart.birthDate}${chart.birthTime ? ' · ' + chart.birthTime : ''}  ·  ${cityShort}`,
      W / 2, 328
    );

    // Three sign glyphs in a row (Sun / Moon / Rising)
    const threeItems = [
      { glyph: SIGN_GLYPHS[chart.positions.Sun.sign] || '?',  label: 'Sun' },
      { glyph: SIGN_GLYPHS[chart.positions.Moon.sign] || '?', label: 'Moon' },
      { glyph: SIGN_GLYPHS[chart.risingSign] || '?',          label: 'Rising' },
    ];
    const trioY = 390;
    threeItems.forEach((ti, idx) => {
      const tx = W / 2 + (idx - 1) * 160;
      x.fillStyle = '#D4AF37';
      x.font = `400 44px ${FONT_DISPLAY}`;
      x.fillText(ti.glyph, tx, trioY);
      x.fillStyle = '#8891aa';
      x.font = `500 18px ${FONT_SANS}`;
      x.fillText(ti.label.toUpperCase(), tx, trioY + 30);
    });

    // Element + modality line
    const ruler = chart.chartRuler ? `${cap(chart.chartRuler)} Rules` : '';
    const elemLine = [
      chart.dominantElement ? cap(chart.dominantElement) + ' Energy' : '',
      chart.dominantModality ? cap(chart.dominantModality) + ' Mode' : '',
      ruler,
    ].filter(Boolean).join('  ·  ');
    x.fillStyle = '#8891aa';
    x.font = `400 22px ${FONT_SANS}`;
    x.fillText(elemLine, W / 2, 450);

    // ── Natal Wheel (center, large) ──
    const cx = W / 2, cy = 900;
    const rOuter  = 410, rBand = 365, rSignInner = 310, rPlanets = 250, rInner = 195;

    const SIGNS_ORDER = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo',
                          'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
    const ELEMENT_SECTOR_COLORS = {
      Aries:'rgba(200,72,50,0.10)', Taurus:'rgba(45,138,62,0.10)', Gemini:'rgba(74,122,199,0.10)', Cancer:'rgba(123,44,191,0.12)',
      Leo:'rgba(200,72,50,0.10)', Virgo:'rgba(45,138,62,0.10)', Libra:'rgba(74,122,199,0.10)', Scorpio:'rgba(123,44,191,0.12)',
      Sagittarius:'rgba(200,72,50,0.10)', Capricorn:'rgba(45,138,62,0.10)', Aquarius:'rgba(74,122,199,0.10)', Pisces:'rgba(123,44,191,0.12)',
    };

    const ascLon = chart.asc || 0;
    const ang = lon => Math.PI - ((lon - ascLon) * Math.PI / 180);

    // Outer rim circle
    x.strokeStyle = 'rgba(212,175,55,0.75)';
    x.lineWidth = 3;
    x.beginPath(); x.arc(cx, cy, rOuter, 0, Math.PI * 2); x.stroke();

    // Sign band inner ring
    x.strokeStyle = 'rgba(212,175,55,0.45)';
    x.lineWidth = 1.5;
    x.beginPath(); x.arc(cx, cy, rSignInner, 0, Math.PI * 2); x.stroke();

    // Sign band outer ring
    x.strokeStyle = 'rgba(212,175,55,0.3)';
    x.lineWidth = 1;
    x.beginPath(); x.arc(cx, cy, rBand, 0, Math.PI * 2); x.stroke();

    // Planet ring
    x.strokeStyle = 'rgba(212,175,55,0.2)';
    x.lineWidth = 1;
    x.beginPath(); x.arc(cx, cy, rInner, 0, Math.PI * 2); x.stroke();

    // Sign sectors — tinted fill + spoke lines + glyphs
    for (let i = 0; i < 12; i++) {
      const a1 = ang(i * 30);
      const a2 = ang((i + 1) * 30);
      const sign = SIGNS_ORDER[i];

      // Sector fill (element tint in the outer band)
      x.fillStyle = ELEMENT_SECTOR_COLORS[sign] || 'transparent';
      x.beginPath();
      x.moveTo(cx, cy);
      // arc direction: because ang maps to canvas angles with reversed y
      const startA = Math.min(a1, a2) - 0.001;
      const endA   = Math.max(a1, a2) + 0.001;
      x.arc(cx, cy, rOuter, a1, a2, a1 > a2);
      x.closePath();
      x.fill();

      // Spoke
      x.strokeStyle = 'rgba(212,175,55,0.3)';
      x.lineWidth = 1;
      x.beginPath();
      x.moveTo(cx + Math.cos(a1) * rSignInner, cy + Math.sin(a1) * rSignInner);
      x.lineTo(cx + Math.cos(a1) * rOuter,     cy + Math.sin(a1) * rOuter);
      x.stroke();

      // Sign glyph in the band midpoint
      const mid = ang(i * 30 + 15);
      const gR  = (rBand + rSignInner) / 2;
      x.fillStyle = '#D4AF37';
      x.font = `400 42px ${FONT_DISPLAY}`;
      x.textBaseline = 'middle';
      x.textAlign = 'center';
      x.fillText(SIGN_GLYPHS[sign] || '', cx + Math.cos(mid) * gR, cy + Math.sin(mid) * gR);
    }

    // Degree ticks every 10° (minor) and 30° (major already handled by spokes)
    x.strokeStyle = 'rgba(212,175,55,0.4)';
    for (let d2 = 0; d2 < 360; d2 += 10) {
      if (d2 % 30 === 0) continue;
      const a = ang(d2);
      x.lineWidth = 1;
      x.beginPath();
      x.moveTo(cx + Math.cos(a) * rSignInner,       cy + Math.sin(a) * rSignInner);
      x.lineTo(cx + Math.cos(a) * (rSignInner + 12), cy + Math.sin(a) * (rSignInner + 12));
      x.stroke();
    }

    // Aspect lines inside inner ring — colored by type
    const ASPECT_LINE_COLORS = {
      Trine: '#3fae7a', Sextile: '#5b7fc7', Conjunction: '#e8c96a',
      Opposition: '#b04a52', Square: '#b04a52',
    };
    (chart.renderAspects || []).slice(0, 20).forEach(asp => {
      const p1 = chart.positions[asp.planet1];
      const p2 = chart.positions[asp.planet2];
      if (!p1 || !p2) return;
      const a1 = ang(p1.lon);
      const a2 = ang(p2.lon);
      const col = ASPECT_LINE_COLORS[asp.aspect] || 'rgba(150,175,230,0.25)';
      x.strokeStyle = col.startsWith('rgba') ? col : col + '55';
      x.globalAlpha = 0.45;
      x.lineWidth = 1.5;
      x.beginPath();
      x.moveTo(cx + Math.cos(a1) * (rInner - 8), cy + Math.sin(a1) * (rInner - 8));
      x.lineTo(cx + Math.cos(a2) * (rInner - 8), cy + Math.sin(a2) * (rInner - 8));
      x.stroke();
      x.globalAlpha = 1;
    });

    // House lines (faint spokes from centre to inner ring)
    (chart.houses || []).forEach((cusp) => {
      const a = ang(cusp);
      x.strokeStyle = 'rgba(150,175,230,0.18)';
      x.lineWidth = 1;
      x.beginPath();
      x.moveTo(cx, cy);
      x.lineTo(cx + Math.cos(a) * rInner, cy + Math.sin(a) * rInner);
      x.stroke();
    });

    // Ascendant axis
    const aAsc = ang(ascLon);
    x.strokeStyle = 'rgba(176,74,82,0.9)';
    x.lineWidth = 2.5;
    x.beginPath();
    x.moveTo(cx + Math.cos(aAsc) * rInner,     cy + Math.sin(aAsc) * rInner);
    x.lineTo(cx + Math.cos(aAsc) * rSignInner, cy + Math.sin(aAsc) * rSignInner);
    x.stroke();
    x.fillStyle = '#b04a52';
    x.font = `bold 20px ${FONT_SANS}`;
    x.textBaseline = 'middle';
    x.textAlign = 'center';
    x.fillText('ASC', cx + Math.cos(aAsc) * (rInner - 32), cy + Math.sin(aAsc) * (rInner - 32));

    // Planet glyphs — with halo + collision offset
    const PLANET_ORDER_WHEEL = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'];
    const placed = [];
    PLANET_ORDER_WHEEL.forEach(k => {
      const p = chart.positions[k];
      if (!p) return;
      let lon2 = p.lon;
      // nudge to avoid overlap
      while (placed.some(q => Math.abs(((q - lon2) + 540) % 360 - 180) < 8)) lon2 += 8;
      placed.push(lon2);
      const a = ang(lon2);
      const px2 = cx + Math.cos(a) * rPlanets;
      const py2 = cy + Math.sin(a) * rPlanets;

      // pointer tick
      const at2 = ang(p.lon);
      x.strokeStyle = 'rgba(240,232,216,0.4)';
      x.lineWidth = 1;
      x.beginPath();
      x.moveTo(cx + Math.cos(at2) * rSignInner,       cy + Math.sin(at2) * rSignInner);
      x.lineTo(cx + Math.cos(at2) * (rSignInner - 14), cy + Math.sin(at2) * (rSignInner - 14));
      x.stroke();

      // Halo circle behind glyph
      const haloR = 28;
      const haloGrad = x.createRadialGradient(px2, py2, 0, px2, py2, haloR);
      haloGrad.addColorStop(0, 'rgba(212,175,55,0.18)');
      haloGrad.addColorStop(1, 'transparent');
      x.fillStyle = haloGrad;
      x.beginPath(); x.arc(px2, py2, haloR, 0, Math.PI * 2); x.fill();

      // Glyph
      x.fillStyle = '#f0e8d8';
      x.font = `400 46px ${FONT_DISPLAY}`;
      x.textBaseline = 'middle';
      x.textAlign = 'center';
      x.fillText(PLANET_GLYPHS[k] || '', px2, py2);

      // Retrograde marker
      if (p.retrograde) {
        x.fillStyle = '#b04a52';
        x.font = `500 16px ${FONT_SANS}`;
        x.fillText('℞', px2 + 22, py2 - 20);
      }
    });
    x.textBaseline = 'alphabetic';

    // Centre star
    x.fillStyle = 'rgba(212,175,55,0.9)';
    x.font = `400 56px ${FONT_DISPLAY}`;
    x.textBaseline = 'middle';
    x.textAlign = 'center';
    x.fillText('✦', cx, cy);
    x.textBaseline = 'alphabetic';

    // ── Elemental Distribution bars ──
    const elems = computeElements(chart.positions);
    const elemTop = 1380;
    const BAR_W = 580, BAR_H = 26, BAR_X = (W - BAR_W) / 2;

    x.textAlign = 'center';
    x.fillStyle = '#D4AF37';
    x.font = `600 22px ${FONT_SANS}`;
    x.fillText('E L E M E N T A L   D I S T R I B U T I O N', W / 2, elemTop);

    x.strokeStyle = 'rgba(212,175,55,0.2)';
    x.lineWidth = 1;
    x.beginPath(); x.moveTo(200, elemTop + 16); x.lineTo(W - 200, elemTop + 16); x.stroke();

    const elemRows = [
      { key: 'fire',  label: 'Fire',  color: ELEMENT_COLORS.fire,  lColor: ELEMENT_LABEL_COLORS.fire  },
      { key: 'earth', label: 'Earth', color: ELEMENT_COLORS.earth, lColor: ELEMENT_LABEL_COLORS.earth },
      { key: 'air',   label: 'Air',   color: ELEMENT_COLORS.air,   lColor: ELEMENT_LABEL_COLORS.air   },
      { key: 'water', label: 'Water', color: ELEMENT_COLORS.water, lColor: ELEMENT_LABEL_COLORS.water },
    ];
    const maxCount = 7; // 7 counted planets
    elemRows.forEach((er, idx) => {
      const rowY = elemTop + 50 + idx * 58;
      const count = elems[er.key] || 0;
      const fillW = (count / maxCount) * BAR_W;

      // Label
      x.textAlign = 'left';
      x.fillStyle = er.lColor;
      x.font = `600 20px ${FONT_SANS}`;
      x.fillText(er.label.toUpperCase(), BAR_X - 110, rowY + BAR_H / 2 + 7);

      // Track
      x.fillStyle = 'rgba(150,175,230,0.07)';
      x.beginPath();
      if (x.roundRect) { x.roundRect(BAR_X, rowY, BAR_W, BAR_H, 6); } else { x.rect(BAR_X, rowY, BAR_W, BAR_H); }
      x.fill();

      // Fill bar
      if (fillW > 0) {
        const barGrad = x.createLinearGradient(BAR_X, 0, BAR_X + fillW, 0);
        barGrad.addColorStop(0, er.color);
        barGrad.addColorStop(1, er.color + 'aa');
        x.fillStyle = barGrad;
        x.beginPath();
        if (x.roundRect) { x.roundRect(BAR_X, rowY, fillW, BAR_H, 6); } else { x.rect(BAR_X, rowY, fillW, BAR_H); }
        x.fill();
      }

      // Count label
      x.textAlign = 'right';
      x.fillStyle = '#9aa6c8';
      x.font = `400 18px ${FONT_SANS}`;
      x.fillText(`${count} planet${count !== 1 ? 's' : ''}`, BAR_X + BAR_W + 110, rowY + BAR_H / 2 + 7);
    });

    // ── Planet Placements Table ── two-column
    const tableTop = 1630;
    x.textAlign = 'center';
    x.fillStyle = '#D4AF37';
    x.font = `600 22px ${FONT_SANS}`;
    x.fillText('P L A N E T A R Y   P L A C E M E N T S', W / 2, tableTop);

    x.strokeStyle = 'rgba(212,175,55,0.2)';
    x.lineWidth = 1;
    x.beginPath(); x.moveTo(200, tableTop + 14); x.lineTo(W - 200, tableTop + 14); x.stroke();

    const PLANET_ORDER_TABLE = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'];
    const cols = [[], []];
    PLANET_ORDER_TABLE.forEach((k, i) => {
      const p = chart.positions[k];
      if (p) cols[i % 2].push({ k, p, h: chart.planetHouses[k] });
    });

    const ROW_H = 56;
    cols.forEach((col, c) => {
      const colX = c === 0 ? 200 : 900;
      col.forEach((row, r) => {
        const ry = tableTop + 36 + r * ROW_H;

        // thin row separator
        if (r > 0) {
          x.strokeStyle = 'rgba(150,175,230,0.07)';
          x.lineWidth = 1;
          x.beginPath(); x.moveTo(colX, ry - 6); x.lineTo(colX + 480, ry - 6); x.stroke();
        }

        // Planet glyph
        x.textAlign = 'left';
        x.fillStyle = '#D4AF37';
        x.font = `400 36px ${FONT_DISPLAY}`;
        x.fillText(PLANET_GLYPHS[row.k] || '', colX, ry + 20);

        // Planet name
        x.fillStyle = '#f0e8d8';
        x.font = `600 24px ${FONT_SANS}`;
        x.fillText(row.k, colX + 56, ry + 10);

        // Sign glyph + sign name
        x.fillStyle = '#9aa6c8';
        x.font = `400 22px ${FONT_SANS}`;
        x.fillText(`${SIGN_GLYPHS[row.p.sign] || ''} ${row.p.sign}`, colX + 56, ry + 34);

        // House
        if (row.h) {
          x.fillStyle = '#5a648a';
          x.font = `400 18px ${FONT_SANS}`;
          x.fillText(`H${row.h}`, colX + 240, ry + 10);
        }

        // Degree
        x.fillStyle = '#D4AF37';
        x.font = `400 18px "Courier New", monospace`;
        x.textAlign = 'right';
        x.fillText(
          `${Math.floor(row.p.degree)}°${String(Math.round((row.p.degree - Math.floor(row.p.degree)) * 60)).padStart(2,'0')}′${row.p.retrograde ? ' ℞' : ''}`,
          colX + 480,
          ry + 10
        );
      });
    });

    // ── Footer ──
    x.textAlign = 'center';
    x.fillStyle = '#5a648a';
    x.font = `400 20px ${FONT_SANS}`;
    x.fillText(
      '✦  ASTROPRECISE  —  VSOP87 · ELP2000 · Computed privately in your browser  ✦',
      W / 2, H - 100
    );

    return cv;
  }

  document.getElementById('poster-btn')?.addEventListener('click', () => {
    if (!currentChart) return;
    const cv = drawChartPoster(currentChart);
    const a  = document.createElement('a');
    const slug = (currentChart.name || 'chart').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    a.download = slug + '-natal-poster.png';
    a.href = cv.toDataURL('image/png');
    a.click();
    if (window.AstroApp) AstroApp.showToast('Poster saved', 'Your natal chart poster has been downloaded.', 'success');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BIG THREE SHARE CARD — 1080×1080
  // ═══════════════════════════════════════════════════════════════════════════

  function drawShareCard(chart) {
    const W = 1080, H = 1080;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');

    // ── Background ──
    x.fillStyle = '#0A0B1F';
    x.fillRect(0, 0, W, H);

    // Nebula 1 — lapis top-right
    const neb1 = x.createRadialGradient(W * 0.75, H * 0.2, 0, W * 0.75, H * 0.2, W * 0.7);
    neb1.addColorStop(0, 'rgba(123,44,191,0.30)');
    neb1.addColorStop(0.5, 'rgba(123,44,191,0.10)');
    neb1.addColorStop(1, 'transparent');
    x.fillStyle = neb1; x.fillRect(0, 0, W, H);

    // Nebula 2 — crimson bottom-left
    const neb2 = x.createRadialGradient(W * 0.18, H * 0.82, 0, W * 0.18, H * 0.82, W * 0.65);
    neb2.addColorStop(0, 'rgba(110,26,38,0.22)');
    neb2.addColorStop(0.5, 'rgba(110,26,38,0.07)');
    neb2.addColorStop(1, 'transparent');
    x.fillStyle = neb2; x.fillRect(0, 0, W, H);

    // Deterministic stars
    drawStars(x, W, H, 180, 42);

    // ── Double gold frame ──
    drawFrame(x, W, H, 40, 58);

    // ── Header ──
    x.textAlign = 'center';
    x.fillStyle = '#D4AF37';
    x.font = `500 24px ${FONT_DISPLAY}`;
    x.fillText('✦  A S T R O P R E C I S E  ✦', W / 2, 122);

    // ── Name ──
    x.fillStyle = '#f0e8d8';
    x.font = `bold 68px ${FONT_DISPLAY}`;
    x.fillText(chart.name || 'Birth Chart', W / 2, 230);

    // ── Birth info ──
    x.fillStyle = '#9aa6c8';
    x.font = `400 26px ${FONT_SANS}`;
    const birthLabel = `${chart.birthDate}${chart.birthTime ? ' · ' + chart.birthTime : ''} · ${(chart.city || '').split(',')[0]}`;
    x.fillText(birthLabel, W / 2, 278);

    // ── Three placement rows ──
    const rowData = [
      {
        planetGlyph: '☉', label: 'SUN',    desc: 'Core Identity',
        sign: chart.positions.Sun.sign,
        elem: ELEMENT_MAP[chart.positions.Sun.sign] || 'fire',
      },
      {
        planetGlyph: '☽', label: 'MOON',   desc: 'Inner World',
        sign: chart.positions.Moon.sign,
        elem: ELEMENT_MAP[chart.positions.Moon.sign] || 'water',
      },
      {
        planetGlyph: '↑', label: 'RISING', desc: 'Outward Self',
        sign: chart.risingSign,
        elem: ELEMENT_MAP[chart.risingSign] || 'air',
      },
    ];

    const CARD_H   = 168;
    const CARD_PAD = 16;
    const CARD_X   = 84;
    const CARD_W   = W - 168;

    rowData.forEach((row, i) => {
      const cardY = 330 + i * (CARD_H + 18);
      const elemCol = ELEMENT_COLORS[row.elem] || '#5b7fc7';
      const elemColBright = ELEMENT_LABEL_COLORS[row.elem] || '#9aa6c8';

      // Card background — glassmorphism fill
      x.fillStyle = 'rgba(17,26,54,0.62)';
      x.beginPath();
      if (x.roundRect) { x.roundRect(CARD_X, cardY, CARD_W, CARD_H, 18); }
      else { x.rect(CARD_X, cardY, CARD_W, CARD_H); }
      x.fill();

      // Card border
      x.strokeStyle = 'rgba(150,175,230,0.2)';
      x.lineWidth = 1.5;
      x.stroke();

      // Left element accent bar
      x.fillStyle = elemCol;
      x.beginPath();
      if (x.roundRect) { x.roundRect(CARD_X, cardY + 12, 4, CARD_H - 24, 2); }
      else { x.rect(CARD_X, cardY + 12, 4, CARD_H - 24); }
      x.fill();

      // Top highlight
      const hlGrad = x.createLinearGradient(CARD_X + 40, cardY, CARD_X + CARD_W * 0.6, cardY);
      hlGrad.addColorStop(0, 'transparent');
      hlGrad.addColorStop(0.2, 'rgba(200,208,232,0.1)');
      hlGrad.addColorStop(1, 'transparent');
      x.strokeStyle = hlGrad;
      x.lineWidth = 1;
      x.beginPath(); x.moveTo(CARD_X + 20, cardY + 1); x.lineTo(CARD_X + CARD_W - 20, cardY + 1); x.stroke();

      // Planet glyph (big, gold)
      x.fillStyle = '#D4AF37';
      x.font = `400 74px ${FONT_DISPLAY}`;
      x.textBaseline = 'middle';
      x.textAlign = 'left';
      x.fillText(row.planetGlyph, CARD_X + 28, cardY + CARD_H / 2);

      // Label + descriptor
      x.fillStyle = '#8891aa';
      x.font = `600 18px ${FONT_SANS}`;
      x.textBaseline = 'top';
      x.fillText(`${row.label}  ·  ${row.desc}`, CARD_X + 124, cardY + 32);

      // Sign glyph + name
      x.fillStyle = '#f0e8d8';
      x.font = `bold 52px ${FONT_DISPLAY}`;
      x.textBaseline = 'top';
      x.fillText(`${SIGN_GLYPHS[row.sign] || ''} ${row.sign}`, CARD_X + 124, cardY + 62);

      // Element label (right side)
      x.fillStyle = elemColBright;
      x.font = `500 16px ${FONT_SANS}`;
      x.textAlign = 'right';
      x.textBaseline = 'middle';
      x.fillText(cap(row.elem), CARD_X + CARD_W - 20, cardY + CARD_H / 2);

      x.textBaseline = 'alphabetic';
    });

    // ── Element distribution circle (small, right side, below rows) ──
    const elems = computeElements(chart.positions);
    const circX = W - 160, circY = 900, circR = 68;

    // Background circle
    x.fillStyle = 'rgba(17,26,54,0.5)';
    x.beginPath(); x.arc(circX, circY, circR + 8, 0, Math.PI * 2); x.fill();

    // Pie slices for each element
    const elemKeys = ['fire','earth','air','water'];
    const total = elemKeys.reduce((s, k) => s + (elems[k] || 0), 0) || 1;
    let startAngle = -Math.PI / 2;
    elemKeys.forEach(ek => {
      const count = elems[ek] || 0;
      if (!count) return;
      const slice = (count / total) * Math.PI * 2;
      x.fillStyle = ELEMENT_COLORS[ek];
      x.globalAlpha = 0.85;
      x.beginPath();
      x.moveTo(circX, circY);
      x.arc(circX, circY, circR, startAngle, startAngle + slice);
      x.closePath();
      x.fill();
      startAngle += slice;
    });
    x.globalAlpha = 1;

    // Circle border
    x.strokeStyle = 'rgba(212,175,55,0.5)';
    x.lineWidth = 2;
    x.beginPath(); x.arc(circX, circY, circR, 0, Math.PI * 2); x.stroke();

    // Centre dot
    x.fillStyle = '#0A0B1F';
    x.beginPath(); x.arc(circX, circY, 14, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#D4AF37';
    x.font = `400 14px ${FONT_DISPLAY}`;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText('✦', circX, circY);
    x.textBaseline = 'alphabetic';

    // ── Dominant voice line ──
    const dom = [
      chart.dominantElement ? cap(chart.dominantElement) + ' Dominant' : '',
      chart.dominantModality ? cap(chart.dominantModality) + ' Mode' : '',
    ].filter(Boolean).join('  ·  ');

    x.textAlign = 'left';
    x.fillStyle = '#5a648a';
    x.font = `400 20px ${FONT_SANS}`;
    x.textBaseline = 'middle';
    x.fillText(dom, 90, 900);
    x.textBaseline = 'alphabetic';

    // ── Footer ──
    x.textAlign = 'center';
    x.fillStyle = '#5a648a';
    x.font = `400 20px ${FONT_SANS}`;
    x.fillText('Discover your cosmic blueprint at astroprecise.app', W / 2, H - 86);

    // Bottom gold rule
    x.strokeStyle = 'rgba(212,175,55,0.25)';
    x.lineWidth = 1;
    x.beginPath(); x.moveTo(200, H - 106); x.lineTo(W - 200, H - 106); x.stroke();

    return cv;
  }

  function addShareCardButton() {
    // The HTML already has print-btn wired to the share card.
    // This function is kept for backwards-compat but is a no-op now.
  }

  // ── Boot ──────────────────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', () => {
    addShareCardButton();
    restoreFromURL();
  });
  if (document.readyState !== 'loading') {
    addShareCardButton();
    restoreFromURL();
  }

})();
