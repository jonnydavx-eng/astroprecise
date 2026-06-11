/**
 * AstroPrecise — Birth Chart Page Controller
 * Wires the chart form to the ephemeris engine, renders results, and adds
 * city autocomplete, timezone-correct UT conversion, shareable links, and a
 * downloadable Big Three card.
 *
 * Requires: ephemeris.js, chart-render.js, interpretations.js, profile.js, app.js
 */

(function () {
  'use strict';

  if (!document.getElementById('chart-form')) return;

  const E = () => window.AstroEphemeris;

  const SIGN_GLYPHS = {
    Aries:'♈\uFE0E', Taurus:'♉\uFE0E', Gemini:'♊\uFE0E', Cancer:'♋\uFE0E', Leo:'♌\uFE0E', Virgo:'♍\uFE0E',
    Libra:'♎\uFE0E', Scorpio:'♏\uFE0E', Sagittarius:'♐\uFE0E', Capricorn:'♑\uFE0E', Aquarius:'♒\uFE0E', Pisces:'♓\uFE0E',
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

  let currentChart = null;   // adapted chart + meta, for save/share

  // ── City autocomplete ─────────────────────────────────────────────────────

  const cityInput = document.getElementById('city-input');
  const dropdown  = document.getElementById('city-autocomplete');
  const latInput  = document.getElementById('lat-input');
  const lonInput  = document.getElementById('lon-input');
  const tzInput   = document.getElementById('tz-input');
  let activeIdx   = -1;

  function citySearch(q) {
    if (!E() || !E().CITIES) return [];
    q = q.trim().toLowerCase();
    if (q.length < 2) return [];
    const starts = [], contains = [];
    for (const c of E().CITIES) {
      const n = c.name.toLowerCase();
      if (n.startsWith(q)) starts.push(c);
      else if (n.includes(q)) contains.push(c);
      if (starts.length >= 8) break;
    }
    return starts.concat(contains).slice(0, 8);
  }

  function renderDropdown(items) {
    if (!dropdown) return;
    activeIdx = -1;
    dropdown._items = items;
    if (!items.length) { dropdown.innerHTML = ''; dropdown.hidden = true; return; }
    dropdown.innerHTML = items.map((c, i) =>
      `<div class="autocomplete-option" role="option" data-i="${i}" id="city-opt-${i}">
        <span aria-hidden="true">📍</span> <strong>${c.name}</strong>&nbsp;<span style="opacity:0.6">${c.country}</span>
      </div>`).join('');
    dropdown.hidden = false;
    dropdown.querySelectorAll('.autocomplete-option').forEach(elx => {
      elx.addEventListener('mousedown', ev => { ev.preventDefault(); pickCity(items[+elx.dataset.i]); });
    });
  }

  function pickCity(c) {
    cityInput.value = `${c.name}, ${c.country}`;
    latInput.value = c.lat;
    lonInput.value = c.lon;
    tzInput.value  = c.tz;
    dropdown.innerHTML = '';
    dropdown.hidden = true;
    document.dispatchEvent(new CustomEvent('astro:city-selected'));
  }

  if (cityInput && dropdown) {
    cityInput.addEventListener('input', () => {
      latInput.value = ''; lonInput.value = ''; tzInput.value = '';
      renderDropdown(citySearch(cityInput.value));
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
  // Uses the IANA tz database via Intl, which handles historical DST.

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
    } catch (e) {
      return 0; // unknown zone — treat as UT
    }
  }

  function localToUT(y, m, d, hh, mm, tz) {
    // first guess: local == UTC, then refine twice (handles DST boundaries)
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

  // ── Chart adaptation (ephemeris output → renderer/analyzer shapes) ───────

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
    // renderer wants Capitalized aspect + planet names; analyzer wants raw names
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
    const [y, m, d] = date.split('-').map(Number);
    const [hh, mm]  = time.split(':').map(Number);
    return {
      name, y, m, d, hh, mm, lat, lon, tz,
      city: cityInput.value,
      timeKnown: !!document.getElementById('time-input').value,
      houseSystem: document.getElementById('house-system').value,
    };
  }

  function calculate(input) {
    const ut = localToUT(input.y, input.m, input.d, input.hh, input.mm, input.tz);
    const raw = E().calculateNatalChart(ut.y, ut.m, ut.d, ut.hh, ut.mm, input.lat, input.lon);
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
    // brief delay so the spinner is perceptible
    setTimeout(() => {
      try {
        currentChart = calculate(input);
        renderResults(currentChart);
        updateShareURL(input);
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

  // Sample chart
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
    latInput.value = q.get('lat'); lonInput.value = q.get('lon'); tzInput.value = q.get('tz') || '';
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
      { label: 'Sun',    sub: 'Core Identity',  sign: chart.positions.Sun.sign,  glyph: '☉' },
      { label: 'Moon',   sub: 'Inner World',    sign: chart.positions.Moon.sign, glyph: '☽' },
      { label: 'Rising', sub: 'Outward Self',   sign: chart.risingSign,          glyph: '↑' },
    ];
    el.innerHTML = items.map(it => `
      <div class="card card--glow" style="text-align:center;">
        <div style="font-size:2rem;color:var(--gold);" aria-hidden="true">${SIGN_GLYPHS[it.sign] || ''}</div>
        <p style="font-size:0.65rem;letter-spacing:0.2em;text-transform:uppercase;color:var(--silver-dim);margin-top:var(--space-2);">${it.glyph} ${it.label} · ${it.sub}</p>
        <h3 style="font-family:var(--font-display);font-size:1.5rem;color:var(--white);margin-top:var(--space-1);">${it.sign}</h3>
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
      blocks.push(section('Dominant Energy',
        `Your chart leads with <strong>${chart.dominantElement}</strong> energy in the <strong>${chart.dominantModality}</strong> mode. ` +
        `The chart ruler is <strong>${cap(chart.chartRuler || '—')}</strong>, lord of your ${chart.risingSign} Ascendant.`));
      if (a) {
        if (a.personality) blocks.push(section('Personality', a.personality));
        if (a.love)        blocks.push(section('Love & Connection', a.love));
        if (a.career)      blocks.push(section('Career & Calling', a.career));
        if (a.challenges)  blocks.push(section('Growth Edges', a.challenges));
        if (a.lifePurpose) blocks.push(section('Life Purpose', a.lifePurpose));
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
        return `<div class="planet-data-row">
          <span class="planet-data-row__glyph">${PLANET_GLYPHS[k]}</span>
          <div>
            <div class="planet-data-row__name">${k === 'NorthNode' ? 'North Node' : k}${p.retrograde ? ' <span style="color:var(--crimson-light);font-size:0.7em;">℞</span>' : ''}</div>
            <div class="planet-data-row__sign">${SIGN_GLYPHS[p.sign] || ''} ${p.sign}${h ? ` · House ${h}` : ''}</div>
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
          <span class="planet-data-row__glyph" style="font-size:0.8rem;color:var(--gold);">${roman(i + 1)}</span>
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
        return `<div class="planet-data-row" style="border-left:2px solid ${d.color};">
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

  function section(title, html) {
    return `<div style="margin-bottom:var(--space-5);">
      <h4 style="font-size:0.7rem;letter-spacing:0.18em;text-transform:uppercase;color:var(--gold);margin-bottom:var(--space-2);">${title}</h4>
      <p style="font-size:var(--text-sm);color:var(--silver);line-height:1.7;">${html}</p>
    </div>`;
  }
  const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  const roman = n => ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'][n - 1] || n;

  // ── Tabs ──────────────────────────────────────────────────────────────────

  let tabsInit = false;
  function initTabs() {
    if (tabsInit) return;
    tabsInit = true;
    document.querySelectorAll('.tabs__trigger').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tabs__trigger').forEach(b => b.setAttribute('aria-selected', 'false'));
        document.querySelectorAll('.tabs__panel').forEach(p => p.setAttribute('aria-hidden', 'true'));
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
    const url = location.href;
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

  document.getElementById('print-btn')?.addEventListener('click', () => window.print());

  // ── Chart poster (1600×2000 PNG with natal wheel) ─────────────────────────

  function drawChartPoster(chart) {
    const W = 1600, H = 2000;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');

    x.fillStyle = '#090b16';
    x.fillRect(0, 0, W, H);
    const neb = x.createRadialGradient(W * 0.3, H * 0.2, 0, W * 0.3, H * 0.2, W * 0.8);
    neb.addColorStop(0, 'rgba(42,74,148,0.28)');
    neb.addColorStop(1, 'transparent');
    x.fillStyle = neb; x.fillRect(0, 0, W, H);
    const neb2 = x.createRadialGradient(W * 0.8, H * 0.85, 0, W * 0.8, H * 0.85, W * 0.7);
    neb2.addColorStop(0, 'rgba(110,26,38,0.16)');
    neb2.addColorStop(1, 'transparent');
    x.fillStyle = neb2; x.fillRect(0, 0, W, H);

    let seed = 1907;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 260; i++) {
      x.fillStyle = `rgba(240,232,216,${0.12 + rnd() * 0.5})`;
      x.beginPath();
      x.arc(rnd() * W, rnd() * H, rnd() * 1.7 + 0.3, 0, Math.PI * 2);
      x.fill();
    }

    x.strokeStyle = 'rgba(196,146,10,0.6)';
    x.lineWidth = 3;
    x.strokeRect(56, 56, W - 112, H - 112);
    x.strokeStyle = 'rgba(196,146,10,0.25)';
    x.lineWidth = 1.5;
    x.strokeRect(74, 74, W - 148, H - 148);

    x.textAlign = 'center';
    x.fillStyle = '#c4920a';
    x.font = '30px Georgia, serif';
    x.fillText('✦  N A T A L   C H A R T  ✦', W / 2, 175);

    x.fillStyle = '#f0e8d8';
    x.font = 'bold 76px Georgia, serif';
    x.fillText(chart.name || 'Birth Chart', W / 2, 280);
    x.fillStyle = '#9aa6c8';
    x.font = '32px Georgia, serif';
    x.fillText(`${chart.birthDate}${chart.birthTime ? ' · ' + chart.birthTime : ''} · ${(chart.city || '').split(',')[0]}`, W / 2, 340);

    // ── Natal wheel: Ascendant fixed at 9 o'clock, zodiac runs CCW ──
    const cx = W / 2, cy = 870, rOuter = 410, rSigns = 365, rPlanets = 280, rInner = 215;
    const ascLon = chart.asc || 0;
    // screen angle for an ecliptic longitude (canvas y grows downward)
    const ang = lon => Math.PI - ((lon - ascLon) * Math.PI / 180);

    x.strokeStyle = 'rgba(196,146,10,0.7)';
    x.lineWidth = 2.5;
    x.beginPath(); x.arc(cx, cy, rOuter, 0, Math.PI * 2); x.stroke();
    x.strokeStyle = 'rgba(196,146,10,0.4)';
    x.lineWidth = 1.5;
    x.beginPath(); x.arc(cx, cy, rSigns - 42, 0, Math.PI * 2); x.stroke();
    x.beginPath(); x.arc(cx, cy, rInner, 0, Math.PI * 2); x.stroke();

    // sign sector lines + glyphs
    const SIGNS_ORDER = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
    for (let i = 0; i < 12; i++) {
      const a = ang(i * 30);
      x.strokeStyle = 'rgba(196,146,10,0.3)';
      x.lineWidth = 1;
      x.beginPath();
      x.moveTo(cx + Math.cos(a) * (rSigns - 42), cy - Math.sin(a) * (rSigns - 42));
      x.lineTo(cx + Math.cos(a) * rOuter, cy - Math.sin(a) * rOuter);
      x.stroke();
      const mid = ang(i * 30 + 15);
      x.fillStyle = '#c4920a';
      x.font = '40px Georgia, serif';
      x.textBaseline = 'middle';
      x.fillText(SIGN_GLYPHS[SIGNS_ORDER[i]] || '', cx + Math.cos(mid) * rSigns, cy - Math.sin(mid) * rSigns);
    }

    // degree ticks every 10°
    x.strokeStyle = 'rgba(196,146,10,0.35)';
    for (let d = 0; d < 360; d += 10) {
      const a = ang(d);
      const len = d % 30 === 0 ? 0 : 10;
      if (!len) continue;
      x.lineWidth = 1;
      x.beginPath();
      x.moveTo(cx + Math.cos(a) * (rSigns - 42), cy - Math.sin(a) * (rSigns - 42));
      x.lineTo(cx + Math.cos(a) * (rSigns - 42 + len), cy - Math.sin(a) * (rSigns - 42 + len));
      x.stroke();
    }

    // Ascendant axis
    const aAsc = ang(ascLon);
    x.strokeStyle = 'rgba(176,74,82,0.8)';
    x.lineWidth = 2;
    x.beginPath();
    x.moveTo(cx + Math.cos(aAsc) * rInner, cy - Math.sin(aAsc) * rInner);
    x.lineTo(cx + Math.cos(aAsc) * (rSigns - 42), cy - Math.sin(aAsc) * (rSigns - 42));
    x.stroke();
    x.fillStyle = '#b04a52';
    x.font = 'bold 22px Georgia, serif';
    x.fillText('ASC', cx + Math.cos(aAsc) * (rInner - 28), cy - Math.sin(aAsc) * (rInner - 28));

    // planets at true longitudes (offset collisions slightly)
    const PLANET_ORDER = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'];
    const placed = [];
    PLANET_ORDER.forEach(k => {
      const p = chart.positions[k];
      if (!p) return;
      let lon = p.lon;
      while (placed.some(q => Math.abs(((q - lon) + 540) % 360 - 180) < 7)) lon += 7;
      placed.push(lon);
      const a = ang(lon);
      const px = cx + Math.cos(a) * rPlanets, py = cy - Math.sin(a) * rPlanets;
      // pointer tick at the true degree
      const at = ang(p.lon);
      x.strokeStyle = 'rgba(240,232,216,0.45)';
      x.lineWidth = 1;
      x.beginPath();
      x.moveTo(cx + Math.cos(at) * (rSigns - 42), cy - Math.sin(at) * (rSigns - 42));
      x.lineTo(cx + Math.cos(at) * (rSigns - 52), cy - Math.sin(at) * (rSigns - 52));
      x.stroke();
      x.fillStyle = '#f0e8d8';
      x.font = '44px Georgia, serif';
      x.textBaseline = 'middle';
      x.fillText(PLANET_GLYPHS[k] || '', px, py);
    });
    x.textBaseline = 'alphabetic';

    // centre glyph
    x.fillStyle = 'rgba(196,146,10,0.85)';
    x.font = '54px Georgia, serif';
    x.textBaseline = 'middle';
    x.fillText('✦', cx, cy);
    x.textBaseline = 'alphabetic';

    // ── Placements table, two columns ──
    const tableTop = 1400;
    x.fillStyle = '#c4920a';
    x.font = '26px Georgia, serif';
    x.fillText('— P L A C E M E N T S —', W / 2, tableTop - 40);
    const cols = [[], []];
    PLANET_ORDER.forEach((k, i) => {
      const p = chart.positions[k];
      if (p) cols[i % 2].push({ k, p });
    });
    cols.forEach((col, c) => {
      const colX = c === 0 ? 330 : 900;
      col.forEach((row, r) => {
        const y = tableTop + 20 + r * 64;
        x.textAlign = 'left';
        x.fillStyle = '#c4920a';
        x.font = '34px Georgia, serif';
        x.fillText(PLANET_GLYPHS[row.k] || '', colX, y);
        x.fillStyle = '#f0e8d8';
        x.font = '28px Georgia, serif';
        x.fillText(row.k, colX + 56, y);
        x.fillStyle = '#9aa6c8';
        x.fillText(`${SIGN_GLYPHS[row.p.sign] || ''} ${row.p.sign} ${Math.floor(row.p.degree)}°${row.p.retrograde ? ' ℞' : ''}`, colX + 240, y);
      });
    });

    x.textAlign = 'center';
    x.fillStyle = '#c4920a';
    x.font = '24px Georgia, serif';
    x.fillText('✦ ASTROPRECISE — computed locally from VSOP87 + ELP2000 ✦', W / 2, H - 110);

    return cv;
  }

  document.getElementById('poster-btn')?.addEventListener('click', () => {
    if (!currentChart) return;
    const cv = drawChartPoster(currentChart);
    const a = document.createElement('a');
    const slug = (currentChart.name || 'chart').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    a.download = slug + '-natal-poster.png';
    a.href = cv.toDataURL('image/png');
    a.click();
    if (window.AstroApp) AstroApp.showToast('Poster saved', 'Your natal chart poster has been downloaded.', 'success');
  });

  document.getElementById('app-btn')?.addEventListener('click', () => {
    location.href = 'index.html#app-download';
  });

  // ── Big Three share card (canvas → PNG) ───────────────────────────────────

  function drawShareCard(chart) {
    const W = 1080, H = 1080;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');

    // void background with subtle nebula
    x.fillStyle = '#090b16';
    x.fillRect(0, 0, W, H);
    const neb = x.createRadialGradient(W * 0.7, H * 0.25, 0, W * 0.7, H * 0.25, W * 0.7);
    neb.addColorStop(0, 'rgba(42, 74, 148,0.25)');
    neb.addColorStop(1, 'transparent');
    x.fillStyle = neb; x.fillRect(0, 0, W, H);
    const neb2 = x.createRadialGradient(W * 0.2, H * 0.8, 0, W * 0.2, H * 0.8, W * 0.6);
    neb2.addColorStop(0, 'rgba(110, 26, 38,0.18)');
    neb2.addColorStop(1, 'transparent');
    x.fillStyle = neb2; x.fillRect(0, 0, W, H);

    // deterministic stars
    let seed = 42;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 140; i++) {
      x.fillStyle = `rgba(240,232,216,${0.15 + rnd() * 0.55})`;
      x.beginPath();
      x.arc(rnd() * W, rnd() * H, rnd() * 1.8 + 0.4, 0, Math.PI * 2);
      x.fill();
    }

    // gold frame
    x.strokeStyle = 'rgba(196,146,10,0.55)';
    x.lineWidth = 2;
    x.strokeRect(46, 46, W - 92, H - 92);
    x.strokeStyle = 'rgba(196,146,10,0.25)';
    x.strokeRect(58, 58, W - 116, H - 116);

    x.textAlign = 'center';
    x.fillStyle = '#c4920a';
    x.font = '28px Georgia, serif';
    x.fillText('✦  A S T R O P R E C I S E  ✦', W / 2, 140);

    x.fillStyle = '#f0e8d8';
    x.font = 'bold 64px Georgia, serif';
    x.fillText(chart.name, W / 2, 250);
    x.fillStyle = '#9aa6c8';
    x.font = '30px Georgia, serif';
    x.fillText(`${chart.birthDate}${chart.birthTime ? ' · ' + chart.birthTime : ''} · ${chart.city.split(',')[0]}`, W / 2, 305);

    const rows = [
      { glyph: '☉', label: 'SUN',    sign: chart.positions.Sun.sign,  desc: 'core identity' },
      { glyph: '☽', label: 'MOON',   sign: chart.positions.Moon.sign, desc: 'inner world' },
      { glyph: '↑', label: 'RISING', sign: chart.risingSign,          desc: 'outward self' },
    ];
    rows.forEach((r2, i) => {
      const y = 440 + i * 175;
      x.fillStyle = 'rgba(17, 26, 54,0.6)';
      x.beginPath();
      x.roundRect(120, y - 78, W - 240, 150, 18);
      x.fill();
      x.strokeStyle = 'rgba(196,146,10,0.35)';
      x.lineWidth = 1.5;
      x.stroke();

      x.textAlign = 'left';
      x.fillStyle = '#c4920a';
      x.font = '64px Georgia, serif';
      x.fillText(r2.glyph, 160, y + 18);
      x.fillStyle = '#9aa6c8';
      x.font = '24px Georgia, serif';
      x.fillText(`${r2.label} · ${r2.desc}`, 260, y - 18);
      x.fillStyle = '#f0e8d8';
      x.font = 'bold 52px Georgia, serif';
      x.fillText(`${SIGN_GLYPHS[r2.sign] || ''} ${r2.sign}`, 260, y + 42);
      x.textAlign = 'center';
    });

    x.fillStyle = '#c4920a';
    x.font = '26px Georgia, serif';
    x.fillText('Discover your cosmic blueprint', W / 2, 1000);

    return cv;
  }

  function addShareCardButton() {
    const printBtn = document.getElementById('print-btn');
    if (!printBtn || document.getElementById('card-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'card-btn';
    btn.className = 'btn btn--outline btn--sm';
    btn.textContent = 'Big Three Card';
    btn.setAttribute('aria-label', 'Download a shareable Big Three image card');
    printBtn.parentElement.insertBefore(btn, printBtn);
    btn.addEventListener('click', () => {
      if (!currentChart) return;
      const cv = drawShareCard(currentChart);
      const a = document.createElement('a');
      a.download = `${currentChart.name.replace(/[^\w]+/g, '-').toLowerCase()}-big-three.png`;
      a.href = cv.toDataURL('image/png');
      a.click();
      if (window.AstroApp) AstroApp.showToast('Card ready', 'Your Big Three card has been downloaded — share it anywhere.', 'success');
    });
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
