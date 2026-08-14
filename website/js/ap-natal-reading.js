import { buildDeepReading } from './deep-reading.js';

const TARGETS = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
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

function chartTimeKnown(chart) {
  if (!chart) return false;
  if (chart.timeKnown === true) return true;
  if (chart.timeKnown === false || chart.timeAccuracy === 'unknown') return false;
  return Boolean(chart.birthTime || chart.time);
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
  if (zone === 'UTC' || zone === 'GMT' || zone === 'Etc/UTC' || /^Etc\/GMT/i.test(zone)) return false;
  try { new Intl.DateTimeFormat('en-GB', { timeZone: zone }).format(new Date()); return true; }
  catch (_) { return false; }
}

function manualNatal(engine) {
  const dateValue = byId('dob').value;
  const timeValue = byId('tob').value;
  const zone = ((byId('tz') || {}).value || '').trim();
  if (!dateValue) throw new Error('Enter a birth date or use a saved chart.');
  if (!validTimeZone(zone)) throw new Error('Pick a birth place so the minute uses a real zone. UK summer is not GMT.');
  const [y, m, d] = dateValue.split('-').map(Number);
  const timeKnown = Boolean(timeValue);
  const [hh, mm] = (timeValue || '12:00').split(':').map(Number);
  const instant = civilToUTC(y, m, d, hh, mm, zone);
  if (!instant) throw new Error('Place needs a real timezone. UK summer is not treated as GMT.');
  const jd = engine.julianDay(
    instant.getUTCFullYear(), instant.getUTCMonth() + 1, instant.getUTCDate(),
    instant.getUTCHours(), instant.getUTCMinutes(), instant.getUTCSeconds(),
  );
  return {
    natal: natalFromPositions(engine.allPlanetPositions(jd), null, timeKnown),
    timeKnown,
    label: timeKnown ? `${dateValue} · ${timeValue} · ${zone}` : `${dateValue} · time unknown`,
    birth: {
      dateText: dateValue,
      timeText: timeKnown ? timeValue : '',
      place: ((byId('natal-city') || {}).value || '').trim(),
    },
  };
}

function seedSavedChart(chart) {
  const option = byId('savedChartOption');
  const checkbox = byId('useSavedChart');
  const date = chart && (chart.birthDate || chart.date);
  const positions = chart && chart.positions;
  const known = chartTimeKnown(chart);
  const natal = natalFromPositions(positions, chart, known);
  if (!chart || natal.sun == null) return null;
  option.hidden = false;
  byId('savedChartLabel').textContent = `Use saved chart · ${chart.name || date || 'latest chart'}`;
  if (date) byId('dob').value = date;
  const savedTime = chart.birthTime || chart.time || '';
  if (known && savedTime) byId('tob').value = savedTime;
  const zone = chart.tz || chart.timezone;
  if (zone && validTimeZone(zone)) {
    byId('tz').value = zone;
    const city = byId('natal-city');
    const note = byId('natal-zone');
    if (city) city.value = chart.place || chart.city || zone;
    if (note) note.textContent = zone;
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
    label: chart.name || date || 'Saved chart',
    birth: {
      dateText: date || '',
      timeText: known ? savedTime : '',
      place: chart.place || chart.city || '',
    },
  };
}

function renderReading(reading, meta) {
  const host = byId('natalChapters');
  host.innerHTML = reading.chapters.map((chapter) => (
    `<article class="ap-natal-ch" id="ch-${chapter.n}">`
    + `<p class="ap-natal-ch__n">Chapter ${chapter.n}</p>`
    + `<h2>${esc(chapter.title)}</h2>`
    + chapter.mono.map((line) => `<p class="ap-natal-ch__mono">${esc(line)}</p>`).join('')
    + chapter.serif.map((line) => `<p class="ap-natal-ch__serif">${esc(line)}</p>`).join('')
    + '</article>'
  )).join('');
  byId('natalLegal').textContent = reading.legal || '';
  byId('natalMeta').textContent = `${meta.label}. ${reading.wordCount} words. ${meta.timeKnown ? 'Birth time used.' : 'Birth time unknown — Moon approximate (±7°); angles and houses withheld.'} ${reading.houseNote || ''}`;
  byId('natalResult').hidden = false;
  byId('natalPrint').hidden = false;
  try { byId('natalResult').focus({ preventScroll: true }); } catch (_) { byId('natalResult').focus(); }
}

function bindNatalCity() {
  const input = byId('natal-city');
  const tzEl = byId('tz');
  const drop = byId('natal-city-drop');
  const note = byId('natal-zone');
  if (!input || !drop || !tzEl) return;
  const GEO = 'https://geocoding-api.open-meteo.com/v1/search';
  let seq = 0;
  let timer = null;
  function pick(city) {
    if (!validTimeZone(city.tz)) {
      tzEl.value = '';
      if (note) note.textContent = 'Pick a place for a real zone. UK summer is not GMT.';
      drop.hidden = true;
      drop.innerHTML = '';
      return;
    }
    input.value = city.name + (city.admin ? ', ' + city.admin : '');
    tzEl.value = city.tz;
    if (note) note.textContent = city.tz;
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
    tzEl.value = '';
    if (note) note.textContent = 'Pick a place for a real zone. UK summer is not GMT.';
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
    fetch('js/reading-templates.json?v=862').then((response) => {
      if (!response.ok) throw new Error('The reading language did not load.');
      return response.json();
    }),
    fetch('js/deep-templates.json?v=862').then((response) => {
      if (!response.ok) throw new Error('The deep-reading language did not load.');
      return response.json();
    }),
  ]);
  const savedMeta = seedSavedChart(getActiveChart());
  const form = byId('natalReadingForm');
  const submit = form.querySelector('[data-natal-submit]');
  if (submit) {
    submit.disabled = false;
    submit.setAttribute('aria-busy', 'false');
  }
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    try {
      const useSaved = byId('useSavedChart').checked && savedMeta;
      const meta = useSaved ? savedMeta : manualNatal(engine);
      if (!meta.natal.sun) throw new Error('The chart could not be computed from that moment.');
      const sky = transitsNow(engine);
      const reading = buildDeepReading(meta.natal, base, deep, {
        birth: meta.birth || {},
        transits: sky.transits,
        transitDateText: sky.transitDateText,
      });
      renderReading(reading, meta);
      status.textContent = 'Computed on this device. Nothing was uploaded.';
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
