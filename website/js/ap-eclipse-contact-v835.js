import { buildEclipseReading5 } from './eclipse-reading.js';
import { loadEditionContext, mountEclipseEdition } from './ap-eclipse-edition-v841.js';

// NASA GSFC Besselian elements: greatest eclipse 17:45:51 UT.
const EVENT_UTC_MS = Date.UTC(2026, 7, 12, 17, 45, 51);
const TARGETS = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
const SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

const byId = (id) => document.getElementById(id);
const esc = (value) => String(value == null ? '' : value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function waitForEphemeris() {
  return new Promise((resolve, reject) => {
    const started = performance.now();
    (function check() {
      const engine = window.AstroEphemeris;
      if (engine && engine.julianDay && engine.sunPosition && engine.allPlanetPositions) return resolve(engine);
      if (performance.now() - started > 8000) return reject(new Error('The astronomical engine did not load.'));
      setTimeout(check, 40);
    })();
  });
}

function degreeText(longitude) {
  const norm = ((Number(longitude) % 360) + 360) % 360;
  const totalMinutes = Math.round(norm * 60) % (360 * 60);
  const sign = Math.floor(totalMinutes / (30 * 60));
  const withinSign = totalMinutes % (30 * 60);
  const degrees = Math.floor(withinSign / 60);
  const minutes = withinSign % 60;
  return `${degrees}°${String(minutes).padStart(2, '0')}′ ${SIGNS[sign]}`;
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
    if (key === 'moon' && !timeKnown) return;
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

function manualNatal(engine) {
  const dateValue = byId('dob').value;
  const timeValue = byId('tob').value;
  const zone = byId('tz').value;
  if (!dateValue) throw new Error('Enter a birth date or use a saved chart.');
  const [y, m, d] = dateValue.split('-').map(Number);
  const timeKnown = Boolean(timeValue);
  const [hh, mm] = (timeValue || '12:00').split(':').map(Number);
  const instant = civilToUTC(y, m, d, hh, mm, zone);
  const jd = engine.julianDay(
    instant.getUTCFullYear(), instant.getUTCMonth() + 1, instant.getUTCDate(),
    instant.getUTCHours(), instant.getUTCMinutes(), instant.getUTCSeconds(),
  );
  return {
    natal: natalFromPositions(engine.allPlanetPositions(jd), null, timeKnown),
    timeKnown,
    label: timeKnown ? `${dateValue} · ${timeValue} · ${zone}` : `${dateValue} · time unknown`,
    source: 'manual',
  };
}

function validTimeZone(zone) {
  if (!zone || typeof zone !== 'string' || zone.length > 80) return false;
  try { new Intl.DateTimeFormat('en-GB', { timeZone: zone }).format(new Date()); return true; }
  catch (_) { return false; }
}

function consumeChartHandoff() {
  try {
    const raw = sessionStorage.getItem('ap-eclipse-handoff');
    if (!raw) return null;
    sessionStorage.removeItem('ap-eclipse-handoff');
    const value = JSON.parse(raw);
    if (!value || typeof value !== 'object') return null;
    if (value.ts && Math.abs(Date.now() - Number(value.ts)) > 6 * 60 * 60 * 1000) return null;
    const dob = /^\d{4}-\d{2}-\d{2}$/.test(String(value.dob || '')) ? String(value.dob) : '';
    const tob = /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value.tob || '')) ? String(value.tob) : '';
    const tzname = validTimeZone(value.tzname) ? value.tzname : '';
    return dob ? { dob, tob, tzname } : null;
  } catch (_) {
    return null;
  }
}

function applyChartHandoff(handoff) {
  if (!handoff) return false;
  byId('dob').value = handoff.dob;
  byId('tob').value = handoff.tob;
  if (handoff.tzname) {
    const select = byId('tz');
    if (![...select.options].some((item) => item.value === handoff.tzname)) select.add(new Option(handoff.tzname, handoff.tzname));
    select.value = handoff.tzname;
  }
  const status = byId('eclipseContactStatus');
  if (status) status.textContent = 'Your just-cast birth moment carried here privately. Manual entry compares planets; use a saved full chart for angles.';
  return true;
}

function beatMarkup(number, title, beat) {
  if (!beat) return '';
  const secondary = beat.secondary
    ? `${beat.secondary.mono ? `<p class="ap-eclipse-result__mono">${esc(beat.secondary.mono)}</p>` : ''}${beat.secondary.serif ? `<p>${esc(beat.secondary.serif)}</p>` : ''}`
    : '';
  return `<li><span>${String(number).padStart(2, '0')}</span><div><strong>${esc(title)}</strong>${beat.mono ? `<p class="ap-eclipse-result__mono">${esc(beat.mono)}</p>` : ''}${beat.serif ? `<p>${esc(beat.serif)}</p>` : ''}${secondary}</div></li>`;
}

function renderReading(reading, meta, eclipseLongitude) {
  const result = byId('eclipseResult');
  byId('eclipseResultState').textContent = reading.gateSale ? 'Quiet chart · no direct contact' : 'Direct eclipse contact found';
  const beats = reading.gateSale
    ? [
        ['Anchor', reading.anchor],
        ['Contact', reading.contact],
        ['Close', reading.close],
      ]
    : [
        ['Anchor', reading.anchor],
        ['Contact', reading.contact],
      ];
  let visibleNumber = 0;
  byId('eclipseContactRows').innerHTML = beats.map(([title, beat]) => {
    if (!beat) return '';
    visibleNumber += 1;
    return beatMarkup(visibleNumber, title, beat);
  }).join('');
  const timeNote = meta.timeKnown
    ? 'The supplied birth time was used.'
    : 'Birth time was unknown, so Moon, Ascendant, Midheaven and house claims were withheld.';
  byId('eclipseResultNote').textContent = `${meta.label}. ${timeNote} Placements and distances are computed; the meaning is traditional reflection, not prediction.`;
  mountEclipseEdition(byId('eclipseEdition'), {
    reading,
    natal: meta.natal,
    eclipseLongitude,
    meta: { label: meta.label, timeKnown: meta.timeKnown, source: meta.source || null },
  });
  result.dataset.quiet = reading.gateSale ? 'true' : 'false';
  result.hidden = false;
  try { result.focus({ preventScroll: true }); } catch (_) { result.focus(); }
  result.scrollIntoView({
    behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    block: 'nearest',
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
  option.hidden = false;
  byId('savedChartLabel').textContent = `Use saved chart · ${chart.name || date || 'latest chart'}`;
  if (date) byId('dob').value = date;
  const savedTime = chart.birthTime || chart.time || '';
  if (known && savedTime) byId('tob').value = savedTime;
  const zone = chart.tz || chart.timezone;
  if (zone) {
    const select = byId('tz');
    if (![...select.options].some((item) => item.value === zone)) select.add(new Option(zone, zone));
    select.value = zone;
  }
  function syncManualState() {
    const disabled = checkbox.checked;
    [byId('dob'), byId('tob'), byId('tz')].forEach((control) => { control.disabled = disabled; });
  }
  checkbox.addEventListener('change', syncManualState);
  syncManualState();
  return { natal, timeKnown: known, label: chart.name || date || 'Saved chart', source: 'saved' };
}

async function init() {
  const birthDate = byId('dob');
  if (birthDate) {
    const today = new Date();
    birthDate.max = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0')].join('-');
  }
  const [engine, templates] = await Promise.all([
    waitForEphemeris(),
    fetch('js/reading-templates.json?v=854').then((response) => {
      if (!response.ok) throw new Error('The reading language did not load.');
      return response.json();
    }),
  ]);
  const eventJd = engine.julianDay(2026, 8, 12, 17, 45, 51);
  const eclipseLongitude = engine.sunPosition(eventJd).lon;
    byId('eclipsePoint').textContent = `Eclipse point · ${degreeText(eclipseLongitude)} · greatest 17:45:51 UTC (18:46 BST)`;

  const hasHandoff = applyChartHandoff(consumeChartHandoff());
  const savedMeta = hasHandoff ? null : seedSavedChart(getActiveChart());
  const form = byId('eclipseContactForm');
  const submitButton = form.querySelector('[data-eclipse-contact-submit]');
  if (submitButton) submitButton.disabled = false;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    try {
      const useSaved = savedMeta && byId('useSavedChart').checked;
      const meta = useSaved ? savedMeta : manualNatal(engine);
      if (!meta.natal || meta.natal.sun == null) throw new Error('The chart could not be computed from that moment.');
      const reading = buildEclipseReading5(eclipseLongitude, meta.natal, templates, {
        local: { date: '12 August 2026' },
        timed: meta.timeKnown,
        quietGateDeg: 5,
      });
      renderReading(reading, meta, eclipseLongitude);
    } catch (error) {
      const result = byId('eclipseResult');
      byId('eclipseResultState').textContent = 'Could not compute';
      byId('eclipseContactRows').innerHTML = '';
      byId('eclipseResultNote').textContent = error && error.message ? error.message : 'Check the birth details and try again.';
      const edition = byId('eclipseEdition');
      if (edition) {
        edition.hidden = true;
        edition.innerHTML = '';
      }
      result.hidden = false;
    }
  });

  const pending = loadEditionContext();
  if (pending && pending.reading && !pending.reading.gateSale) {
    const meta = pending.meta || { label: 'Saved eclipse contact', timeKnown: true, source: 'pending' };
    meta.natal = pending.natal;
    renderReading(pending.reading, meta, pending.eclipseLongitude);
  }
}

init().catch((error) => {
  console.error('[AstroPrecise eclipse contact]', error);
  const point = byId('eclipsePoint');
  if (point) point.textContent = 'Eclipse contact instrument unavailable';
  const status = byId('eclipseContactStatus');
  if (status) status.textContent = 'The contact calculator did not initialise. The live eclipse model and viewing guide still work; retry this calculator when the connection is stable.';
  const button = document.querySelector('[data-eclipse-contact-submit]');
  if (button) {
    button.disabled = false;
    button.type = 'button';
    button.textContent = 'Retry contact calculator';
    button.addEventListener('click', () => location.reload(), { once: true });
  }
});
