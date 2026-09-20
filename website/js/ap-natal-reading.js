import { buildDeepReading } from './deep-reading.js?v=912';

const TARGETS = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
const ASSUMED_HOUR = '12:00';
const HOUSE_NAMES = { whole: 'Whole Sign', equal: 'Equal', placidus: 'Placidus' };
const byId = (id) => document.getElementById(id);
const esc = (value) => String(value == null ? '' : value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function waitForEphemeris() {
  return new Promise((resolve, reject) => {
    const started = performance.now();
    (function check() {
      const engine = window.AstroEphemeris;
      if (engine && engine.julianDay && engine.allPlanetPositions) return resolve(engine);
      if (performance.now() - started > 8000) return reject(new Error('The astronomical engine did not load.'));
      setTimeout(check, 40);
    })();
  });
}

function timezoneOffsetMinutes(zone, instant) {
  const parts = {};
  new Intl.DateTimeFormat('en-GB', {
    timeZone: zone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(instant).forEach((part) => { if (part.type !== 'literal') parts[part.type] = part.value; });
  return (Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second) - instant.getTime()) / 60000;
}

function civilToUTC(y, m, d, hh, mm, zone) {
  if (!validTimeZone(zone)) return null;
  const civilMs = Date.UTC(y, m - 1, d, hh, mm, 0);
  let utcMs = civilMs;
  for (let i = 0; i < 3; i += 1) utcMs = civilMs - timezoneOffsetMinutes(zone, new Date(utcMs)) * 60000;
  return new Date(utcMs);
}

function utcClock(instant) {
  return String(instant.getUTCHours()).padStart(2, '0') + ':' + String(instant.getUTCMinutes()).padStart(2, '0');
}

function longitudeFrom(positions, key) {
  if (!positions) return null;
  const title = key.charAt(0).toUpperCase() + key.slice(1);
  const aliases = key === 'asc'
    ? ['asc', 'Ascendant', 'ascendant']
    : key === 'mc'
      ? ['mc', 'MC', 'Midheaven', 'midheaven']
      : [key, title];
  for (const alias of aliases) {
    const position = positions[alias];
    if (typeof position === 'number' && Number.isFinite(position)) return position;
    if (!position) continue;
    const longitude = position.lon ?? position.longitude;
    if (Number.isFinite(Number(longitude))) return Number(longitude);
  }
  return null;
}

function natalFromPositions(positions, chart, timeKnown) {
  const natal = {};
  TARGETS.forEach((key) => {
    const longitude = longitudeFrom(positions, key);
    if (longitude != null) natal[key] = longitude;
  });
  if (timeKnown && chart) {
    const asc = Number(chart.ascendant ?? chart.asc ?? longitudeFrom(positions, 'asc'));
    const mc = Number(chart.mc ?? chart.midheaven ?? longitudeFrom(positions, 'mc'));
    if (Number.isFinite(asc)) natal.asc = asc;
    if (Number.isFinite(mc)) natal.mc = mc;
  }
  return natal;
}

function houseFromCusps(lon, houses) {
  if (!Array.isArray(houses) || houses.length !== 12) return null;
  for (let i = 0; i < 12; i += 1) {
    const a = Number(houses[i]);
    const b = Number(houses[(i + 1) % 12]);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    const span = ((b - a) % 360 + 360) % 360 || 30;
    const off = ((lon - a) % 360 + 360) % 360;
    if (off < span) return i + 1;
  }
  return null;
}

function computeNatal(engine, instant, lat, lon, timeKnown, houseSystem = 'whole', nodeMode = 'mean') {
  const y = instant.getUTCFullYear();
  const m = instant.getUTCMonth() + 1;
  const d = instant.getUTCDate();
  const hh = instant.getUTCHours();
  const mm = instant.getUTCMinutes();
  const coordsKnown = Number.isFinite(lat) && Number.isFinite(lon);
  if (timeKnown && coordsKnown && typeof engine.calculateNatalChart === 'function') {
    const chart = engine.calculateNatalChart(y, m, d, hh, mm, lat, lon, houseSystem, nodeMode);
    const natal = natalFromPositions(chart.positions, chart, true);
    const planetHouses = {};
    TARGETS.forEach((key) => {
      if (natal[key] == null) return;
      const house = houseFromCusps(natal[key], chart.houses);
      if (house) planetHouses[key] = house;
    });
    return { natal, houses: chart.houses, planetHouses, houseSystem, nodeMode };
  }
  const jd = engine.julianDay(y, m, d, hh, mm, instant.getUTCSeconds());
  return {
    natal: natalFromPositions(engine.allPlanetPositions(jd), null, false),
    houses: null,
    planetHouses: null,
    houseSystem,
    nodeMode,
  };
}

function getSittingHandoff() {
  try {
    const raw = sessionStorage.getItem('ap-sitting-handoff');
    if (!raw) return null;
    sessionStorage.removeItem('ap-sitting-handoff');
    const data = JSON.parse(raw);
    if (!data || !(data.birthDate || data.date)) return null;
    if (data.ts && (Date.now() - Number(data.ts)) > 6 * 60 * 60 * 1000) return null;
    return data;
  } catch (_) {
    return null;
  }
}

function getActiveChart() {
  try {
    const charts = JSON.parse(localStorage.getItem('ap_charts') || '[]');
    if (!Array.isArray(charts) || !charts.length) return null;
    const activeId = localStorage.getItem('ap_active_chart');
    return charts.find((chart) => String(chart.id) === String(activeId)) || charts[0];
  } catch (_) {
    return null;
  }
}

function seedHandoffForm(chart) {
  if (!chart) return false;
  const date = chart.birthDate || chart.date;
  const zone = chart.tz || chart.timezone;
  if (!date || !validTimeZone(zone)) return false;
  byId('dob').value = date;
  const known = chartTimeKnown(chart);
  const savedTime = chart.birthTime || chart.time || '';
  if (known && savedTime) byId('tob').value = savedTime;
  else byId('tob').value = '';
  byId('tz').value = zone;
  const city = byId('natal-city');
  const note = byId('natal-zone');
  const lat = Number(chart.lat);
  const lon = Number(chart.lon);
  if (city) city.value = chart.place || chart.city || zone;
  if (note) {
    note.textContent = Number.isFinite(lat) && Number.isFinite(lon)
      ? `${zone} · ${lat.toFixed(2)}, ${lon.toFixed(2)}`
      : zone;
  }
  if (Number.isFinite(lat)) byId('natal-lat').value = String(lat);
  if (Number.isFinite(lon)) byId('natal-lon').value = String(lon);
  const box = byId('useSavedChart');
  if (box) {
    box.checked = false;
    box.hidden = true;
    box.disabled = true;
  }
  const option = byId('savedChartOption');
  if (option) {
    option.hidden = false;
    option.dataset.mode = 'handoff';
    option.setAttribute('role', 'status');
    byId('savedChartLabel').textContent = `Just cast · ${chart.name || date}`;
  }
  return true;
}

function chartTimeKnown(chart) {
  if (!chart) return false;
  if (chart.timeKnown === true) return true;
  if (chart.timeKnown === false || chart.timeAccuracy === 'unknown') return false;
  return Boolean(chart.birthTime || chart.time);
}

function metaFromChartSnapshot(chart, source = 'chart handoff') {
  if (!chart || !chart.positions) return null;
  const date = chart.birthDate || chart.date;
  const savedTime = chart.birthTime || chart.time || '';
  const timeAccuracy = chart.timeAccuracy || (chartTimeKnown(chart) ? 'exact' : 'unknown');
  const timeKnown = timeAccuracy !== 'unknown' && Boolean(savedTime);
  const lat = Number(chart.lat);
  const lon = Number(chart.lon);
  const coordsKnown = Number.isFinite(lat) && Number.isFinite(lon);
  const natal = natalFromPositions(chart.positions, chart, timeKnown);
  if (natal.sun == null) return null;
  let utcText = '';
  if (Number.isFinite(Number(chart.jd))) {
    const instant = new Date((Number(chart.jd) - 2440587.5) * 86400000);
    if (!Number.isNaN(instant.getTime())) utcText = utcClock(instant) + ' UT';
  }
  const zone = chart.tz || chart.timezone || '';
  const houseSystem = chart.houseSystem || 'whole';
  const precisionLabel = timeAccuracy === 'approximate' ? 'approximate time' : timeKnown ? 'exact time' : 'time unknown';
  return {
    natal,
    timeKnown,
    timeAccuracy,
    coordsKnown,
    utcText,
    zone,
    houseSystem,
    houseCusps: Array.isArray(chart.houses) ? chart.houses : null,
    planetHouses: chart.planetHouses || null,
    nodeMode: chart.nodeMode || 'mean',
    label: `${date || 'Saved chart'} · ${precisionLabel}${zone ? ' · ' + zone : ''}${utcText ? ' · ' + utcText : ''}`,
    birth: {
      dateText: date || '',
      timeText: timeKnown ? savedTime : '',
      timeAccuracy,
      houseSystem,
      place: chart.place || chart.city || '',
      zone,
      utcText,
      noonReference: !timeKnown,
      coordsKnown,
      source,
    },
    chart,
  };
}

function transitsNow(engine) {
  const now = new Date();
  const jd = engine.julianDay(
    now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate(),
    now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds(),
  );
  const positions = engine.allPlanetPositions(jd);
  const transits = {};
  TARGETS.forEach((key) => {
    const longitude = longitudeFrom(positions, key);
    if (longitude != null) transits[key] = longitude;
  });
  return {
    transits,
    transitDateText: now.toISOString().slice(0, 10) + ' UTC',
  };
}

function validTimeZone(zone) {
  if (!zone || typeof zone !== 'string' || zone.length > 80) return false;
  if (zone === 'UTC' || zone === 'GMT' || zone === 'Etc/UTC' || /^Etc\//i.test(zone)) return false;
  try { new Intl.DateTimeFormat('en-GB', { timeZone: zone }).format(new Date()); return true; }
  catch (_) { return false; }
}

function readPlace() {
  const zone = ((byId('tz') || {}).value || '').trim();
  const lat = Number((byId('natal-lat') || {}).value);
  const lon = Number((byId('natal-lon') || {}).value);
  return {
    zone,
    lat: Number.isFinite(lat) ? lat : null,
    lon: Number.isFinite(lon) ? lon : null,
    place: ((byId('natal-city') || {}).value || '').trim(),
  };
}

function buildMeta(engine, { dateValue, timeValue, zone, lat, lon, place, source, houseSystem = 'whole', nodeMode = 'mean', timeAccuracy }) {
  if (!dateValue) throw new Error('Enter a birth date or use a saved chart.');
  if (!validTimeZone(zone)) throw new Error('Pick a birth place so the minute uses a real zone. UK summer is not GMT.');
  const [y, m, d] = dateValue.split('-').map(Number);
  const timeKnown = Boolean(timeValue);
  const [hh, mm] = (timeValue || ASSUMED_HOUR).split(':').map(Number);
  const instant = civilToUTC(y, m, d, hh, mm, zone);
  if (!instant) throw new Error('Place needs a real timezone. UK summer is not treated as GMT.');
  const coordsKnown = Number.isFinite(lat) && Number.isFinite(lon);
  const computed = computeNatal(engine, instant, lat, lon, timeKnown, houseSystem, nodeMode);
  const precision = timeAccuracy || (timeKnown ? 'exact' : 'unknown');
  const utcText = utcClock(instant) + ' UT';
  return {
    natal: computed.natal,
    timeKnown,
    timeAccuracy: precision,
    coordsKnown,
    utcText,
    zone,
    houseSystem: computed.houseSystem,
    houseCusps: computed.houses,
    planetHouses: computed.planetHouses,
    nodeMode: computed.nodeMode,
    label: timeKnown
      ? `${dateValue} · ${timeValue} · ${zone} · ${utcText}${precision === 'approximate' ? ' · approximate time' : ''}`
      : `${dateValue} · time unknown · noon ${zone} as a date reference · ${utcText}`,
    birth: {
      dateText: dateValue,
      timeText: timeKnown ? timeValue : '',
      timeAccuracy: precision,
      houseSystem: computed.houseSystem,
      place,
      zone,
      utcText,
      noonReference: !timeKnown,
      coordsKnown,
      source: source || 'typed',
    },
  };
}

function manualNatal(engine) {
  const place = readPlace();
  return buildMeta(engine, {
    dateValue: byId('dob').value,
    timeValue: byId('tob').value,
    ...place,
    source: 'typed',
  });
}

function recomputeSaved(engine, chart) {
  const date = chart && (chart.birthDate || chart.date);
  const zone = chart && (chart.tz || chart.timezone);
  const lat = Number(chart && chart.lat);
  const lon = Number(chart && chart.lon);
  if (!date || !validTimeZone(zone)) return null;
  const known = chartTimeKnown(chart);
  const savedTime = chart.birthTime || chart.time || '';
  return buildMeta(engine, {
    dateValue: date,
    timeValue: known && savedTime ? savedTime : '',
    zone,
    lat: Number.isFinite(lat) ? lat : null,
    lon: Number.isFinite(lon) ? lon : null,
    place: chart.place || chart.city || '',
    source: 'saved chart, recomputed',
    houseSystem: chart.houseSystem || 'whole',
    nodeMode: chart.nodeMode || 'mean',
    timeAccuracy: chart.timeAccuracy || (known ? 'exact' : 'unknown'),
  });
}

function seedSavedChart(chart) {
  const option = byId('savedChartOption');
  const checkbox = byId('useSavedChart');
  const date = chart && (chart.birthDate || chart.date);
  const positions = chart && chart.positions;
  const known = chartTimeKnown(chart);
  const natal = natalFromPositions(positions, chart, known);
  if (!chart || natal.sun == null) return null;
  if (checkbox) {
    checkbox.hidden = false;
    checkbox.disabled = false;
  }
  option.hidden = false;
  option.dataset.mode = 'saved';
  option.removeAttribute('role');
  byId('savedChartLabel').textContent = `Use saved chart · ${chart.name || date || 'latest chart'}`;
  if (date) byId('dob').value = date;
  const savedTime = chart.birthTime || chart.time || '';
  if (known && savedTime) byId('tob').value = savedTime;
  const zone = chart.tz || chart.timezone;
  const lat = Number(chart.lat);
  const lon = Number(chart.lon);
  if (zone && validTimeZone(zone)) {
    byId('tz').value = zone;
    const city = byId('natal-city');
    const note = byId('natal-zone');
    if (city) city.value = chart.place || chart.city || zone;
    if (note) {
      note.textContent = Number.isFinite(lat) && Number.isFinite(lon)
        ? `${zone} · ${lat.toFixed(2)}, ${lon.toFixed(2)}`
        : zone;
    }
    if (Number.isFinite(lat)) byId('natal-lat').value = String(lat);
    if (Number.isFinite(lon)) byId('natal-lon').value = String(lon);
  }
  function syncManualState() {
    const disabled = checkbox.checked;
    [byId('dob'), byId('tob'), byId('natal-city')].forEach((control) => { if (control) control.disabled = disabled; });
  }
  checkbox.addEventListener('change', syncManualState);
  syncManualState();
  return {
    natal,
    timeKnown: known,
    timeAccuracy: chart.timeAccuracy || (known ? 'exact' : 'unknown'),
    coordsKnown: Number.isFinite(lat) && Number.isFinite(lon),
    utcText: '',
    zone: validTimeZone(zone) ? zone : '',
    houseSystem: chart.houseSystem || 'whole',
    houseCusps: Array.isArray(chart.houses) ? chart.houses : null,
    planetHouses: chart.planetHouses || null,
    nodeMode: chart.nodeMode || 'mean',
    label: chart.name || date || 'Saved chart',
    birth: {
      dateText: date || '',
      timeText: known ? savedTime : '',
      timeAccuracy: chart.timeAccuracy || (known ? 'exact' : 'unknown'),
      houseSystem: chart.houseSystem || 'whole',
      place: chart.place || chart.city || '',
      zone: validTimeZone(zone) ? zone : '',
      utcText: '',
      noonReference: !known,
      coordsKnown: Number.isFinite(lat) && Number.isFinite(lon),
      source: 'saved chart',
    },
    chart,
  };
}

function withheldCopy(meta) {
  if (meta.timeAccuracy === 'approximate' && meta.coordsKnown) {
    return 'Birth time approximate. The chart is preserved at the entered time, but Rising, Midheaven and houses are provisional rather than exact.';
  }
  if (meta.timeKnown && meta.coordsKnown) return '';
  if (!meta.timeKnown) {
    return 'Birth time unknown. Noon in the chosen zone was used as a date reference, not a birth hour. The Moon is approximate (±7°). Rising sign, Midheaven and houses are withheld.';
  }
  return 'The hour is known, but this chart has no usable town coordinates, so the rising sign and houses are withheld rather than guessed.';
}

function renderReceipt(meta) {
  const host = byId('natalReceipt');
  const houseName = HOUSE_NAMES[meta.houseSystem] || meta.houseSystem || 'Whole Sign';
  const timeLabel = meta.timeAccuracy === 'approximate'
    ? `${meta.birth.timeText} · approximate`
    : meta.timeKnown ? `${meta.birth.timeText} · exact` : `Unknown · ${ASSUMED_HOUR} local used as a date reference, not a birth hour`;
  const angleLabel = !meta.timeKnown || !meta.coordsKnown
    ? 'Withheld.'
    : meta.timeAccuracy === 'approximate'
      ? 'Computed at the entered time · provisional.'
      : 'Computed from the exact hour and town.';
  const rows = [
    ['Date', meta.birth.dateText || '—'],
    ['Time', timeLabel],
    ['Place', meta.birth.place || '—'],
    ['Zone', meta.zone || '—'],
    ['Computed from', meta.utcText || 'Saved positions on this device'],
    ['House method', meta.timeKnown && meta.coordsKnown ? `${houseName}${meta.timeAccuracy === 'approximate' ? ' · provisional' : ''}` : 'Withheld.'],
    ['Angles', angleLabel],
  ];
  host.innerHTML = rows.map(([label, value]) => (
    `<div><span>${esc(label)}</span><p>${esc(value)}</p></div>`
  )).join('');
}

function renderChapter(chapter) {
  const lead = chapter.n === 7 ? '' : (chapter.lead || '');
  const serif = (chapter.serif || []).filter((line) => line && line !== lead);
  const textbook = [];
  const visible = [];
  const TEXTBOOK_PERSON = /\b(these individuals|natives of|the natives|the native|this native|this individual|people with this placement)\b/i;
  for (const line of serif) {
    if (chapter.n !== 7 && TEXTBOOK_PERSON.test(line)) textbook.push(line);
    else visible.push(line);
  }
  for (const line of chapter.textbook || []) {
    if (line && line !== lead) textbook.push(line);
  }
  let html = `<article class="ap-natal-ch" id="ch-${chapter.n}">`
    + `<p class="ap-natal-ch__n">Chapter ${chapter.n}</p>`
    + `<h2>${esc(chapter.title)}</h2>`;
  if (chapter.n === 7) {
    html += (chapter.serif || []).map((line) => `<p class="ap-natal-ch__serif ap-natal-ch__letter">${esc(line)}</p>`).join('');
    return html + '</article>';
  }
  if (lead) html += `<p class="ap-natal-ch__lead">${esc(lead)}</p>`;
  html += visible.map((line) => `<p class="ap-natal-ch__serif">${esc(line)}</p>`).join('');
  html += (chapter.mono || []).map((line) => `<p class="ap-natal-ch__mono">${esc(line)}</p>`).join('');
  if (textbook.length) {
    html += '<details class="ap-natal-ch__details">'
      + '<summary>More about this placement</summary>'
      + textbook.map((line) => `<p class="ap-natal-ch__serif">${esc(line)}</p>`).join('')
      + '</details>';
  }
  return html + '</article>';
}

function renderSyncBeat(meta) {
  const host = byId('natalChapters');
  if (!host || !window.APMirrorHour) return;
  const natalMatch = meta && meta.timeKnown && meta.birth && meta.birth.timeText
    ? APMirrorHour.detectFromClock(meta.birth.timeText)
    : (window.APMirrorHour.readNatal ? APMirrorHour.readNatal() : null);
  const liveMatch = APMirrorHour.readLive ? APMirrorHour.readLive() : null;
  const match = natalMatch || liveMatch;
  if (!match) return;
  const beat = APMirrorHour.sittingBeat(match, { source: natalMatch ? 'natal' : 'live' });
  if (!beat) return;
  const aside = document.createElement('aside');
  aside.className = 'ap-natal-sync';
  aside.id = 'natal-sync-beat';
  aside.innerHTML = `<p class="ap-natal-sync__n">Optional beat</p>`
    + `<h2>${esc(beat.title)}</h2>`
    + `<p class="ap-natal-sync__mono">${esc(beat.mono)}</p>`
    + `<p class="ap-natal-sync__serif">${esc(beat.serif)}</p>`
    + `<p class="ap-natal-sync__note">${esc(beat.honesty)}</p>`;
  const first = host.querySelector('#ch-1');
  if (first && first.nextSibling) host.insertBefore(aside, first.nextSibling);
  else if (first) first.after(aside);
  else host.appendChild(aside);
}

function renderReading(reading, meta) {
  const host = byId('natalChapters');
  host.innerHTML = reading.chapters.map(renderChapter).join('');
  renderSyncBeat(meta);
  byId('natalLegal').textContent = reading.legal || '';
  const withheld = withheldCopy(meta);
  const banner = byId('natalWithheld');
  banner.hidden = !withheld;
  banner.textContent = withheld;
  renderReceipt(meta);
  const precision = meta.timeAccuracy === 'approximate'
    ? 'Approximate birth time used; angles and houses are provisional.'
    : meta.timeKnown
      ? 'Exact birth time used.'
      : 'Birth time unknown — Moon approximate (±7°); angles and houses withheld.';
  byId('natalMeta').textContent = `${meta.label}. ${reading.wordCount} words. ${precision} ${reading.houseNote || ''}`;
  const observatoryLink = byId('natalObservatoryLink');
  if (observatoryLink && window.APSkyBridge && typeof APSkyBridge.buildLinkFromChart === 'function') {
    const bridgeChart = meta.chart || {
      birthDate: meta.birth.dateText,
      birthTime: meta.timeKnown ? meta.birth.timeText : '',
      tz: meta.zone,
    };
    const candidate = APSkyBridge.buildLinkFromChart(bridgeChart, { focus: 'earth' });
    const candidateHasBirthMoment = /(?:[?#&])m=/.test(String(candidate || ''));
    observatoryLink.href = candidateHasBirthMoment ? 'index.html#focus=earth' : candidate;
    if (candidateHasBirthMoment) observatoryLink.textContent = 'Open the Observatory';
  }
  byId('natalResult').hidden = false;
  try { byId('natalResult').focus({ preventScroll: true }); } catch (_) { byId('natalResult').focus(); }
}

function bindNatalCity() {
  const input = byId('natal-city');
  const tzEl = byId('tz');
  const latEl = byId('natal-lat');
  const lonEl = byId('natal-lon');
  const drop = byId('natal-city-drop');
  const note = byId('natal-zone');
  if (!input || !drop || !tzEl) return;
  const GEO = 'https://geocoding-api.open-meteo.com/v1/search';
  let seq = 0;
  let timer = null;
  function clearPlace(message) {
    tzEl.value = '';
    if (latEl) latEl.value = '';
    if (lonEl) lonEl.value = '';
    if (note) note.textContent = message;
  }
  function pick(city) {
    if (!validTimeZone(city.tz) || !Number.isFinite(city.lat) || !Number.isFinite(city.lon)) {
      clearPlace('That result has no usable zone. Pick another town — UTC and GMT are refused as birth zones.');
      drop.hidden = true;
      drop.innerHTML = '';
      return;
    }
    input.value = city.name + (city.admin ? ', ' + city.admin : '');
    tzEl.value = city.tz;
    if (latEl) latEl.value = String(city.lat);
    if (lonEl) lonEl.value = String(city.lon);
    if (note) note.textContent = city.tz + ' · ' + city.lat.toFixed(2) + ', ' + city.lon.toFixed(2);
    drop.hidden = true;
    drop.innerHTML = '';
  }
  function render(results) {
    drop.innerHTML = '';
    results.forEach((city) => {
      if (!validTimeZone(city.tz)) return;
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'ap-city-item';
      item.textContent = city.name + (city.admin ? ', ' + city.admin : '') + ' · ' + city.tz;
      item.addEventListener('click', () => pick(city));
      drop.appendChild(item);
    });
    drop.hidden = !drop.childNodes.length;
  }
  function search(q) {
    q = (q || '').trim();
    if (q.length < 2) { drop.hidden = true; drop.innerHTML = ''; return; }
    const my = ++seq;
    fetch(GEO + '?name=' + encodeURIComponent(q) + '&count=6&language=en&format=json')
      .then((r) => r.ok ? r.json() : { results: [] })
      .then((data) => {
        if (my !== seq) return;
        render((data.results || []).map((r) => ({
          name: r.name,
          admin: r.admin1 && r.admin1 !== r.name ? r.admin1 : '',
          lat: r.latitude,
          lon: r.longitude,
          tz: r.timezone || '',
        })));
      })
      .catch(() => { if (my === seq) drop.hidden = true; });
  }
  input.addEventListener('input', () => {
    clearPlace('Pick a town from the list so the minute uses that town’s real zone. UTC and GMT are refused — UK summer is not GMT.');
    clearTimeout(timer);
    timer = setTimeout(() => search(input.value), 250);
  });
  input.addEventListener('blur', () => setTimeout(() => { drop.hidden = true; }, 180));
}

async function init() {
  bindNatalCity();
  const status = byId('natalStatus');
  const [engine, base, deep] = await Promise.all([
    waitForEphemeris(),
    fetch('js/reading-templates.json?v=912').then((response) => {
      if (!response.ok) throw new Error('The reading language did not load.');
      return response.json();
    }),
    fetch('js/deep-templates.json?v=912').then((response) => {
      if (!response.ok) throw new Error('The deep-reading language did not load.');
      return response.json();
    }),
  ]);
  const handoff = getSittingHandoff();
  let handoffMeta = metaFromChartSnapshot(handoff, 'just-cast chart');
  const savedChart = getActiveChart();
  const savedMeta = seedSavedChart(savedChart);
  const form = byId('natalReadingForm');
  const submit = form.querySelector('[data-natal-submit]');
  if (submit) {
    submit.disabled = false;
    submit.setAttribute('aria-busy', 'false');
  }
  if (handoffMeta && seedHandoffForm(handoff)) {
    queueMicrotask(function () { form.requestSubmit(); });
  } else if (savedMeta) {
    const box = byId('useSavedChart');
    if (box) box.checked = true;
    queueMicrotask(function () { form.requestSubmit(); });
  }
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    try {
      const useSaved = byId('useSavedChart').checked && savedMeta;
      const meta = handoffMeta || (useSaved ? savedMeta : manualNatal(engine));
      handoffMeta = null;
      if (!meta.natal.sun) throw new Error('The chart could not be computed from that moment.');
      const sky = transitsNow(engine);
      const reading = buildDeepReading(meta.natal, base, deep, {
        birth: meta.birth || {},
        timeAccuracy: meta.timeAccuracy || (meta.timeKnown ? 'exact' : 'unknown'),
        houseSystem: meta.houseSystem || 'whole',
        houseCusps: meta.houseCusps || null,
        planetHouses: meta.planetHouses || null,
        transits: sky.transits,
        transitDateText: sky.transitDateText,
      });
      renderReading(reading, meta);
      status.textContent = 'Computed on this device. Birth date and time stayed here. Place search sent only the town name.';
    } catch (err) {
      status.textContent = err.message || 'The reading could not be built.';
    }
  });
  byId('natalPrint').addEventListener('click', () => window.print());
}

init().catch((err) => {
  const status = byId('natalStatus');
  if (status) status.textContent = err.message || 'The reading page failed to start.';
});
