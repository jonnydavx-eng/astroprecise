/**
 * STALE — not loaded by any HTML. Live contact is ap-eclipse-contact-v835.js.
 * Do not wire this file. Kept only so agents do not revive the old ecl-form path.
 *
 * Astro Precise — eclipse hub page controller (ES module)
 * Wires buildEclipseReading5 to a saved chart or a one-shot birth form.
 * Honesty: quiet charts set gateSale and are never sold an edition.
 */
import { buildEclipseReading5 } from './eclipse-reading.js';

// 20°02′ Leo — NASA GSFC Besselian greatest eclipse: 17:47:06 TDT = 17:45:51 UT = 18:46 BST
// (ΔT = 69.1 s, USNO/IERS 2026 prediction). An earlier comment here said "17:46 TD",
// which was the UT figure under the wrong label — see the long note in eclipse.html.
// The constant itself is unaffected: 69 s of solar motion is about 3 seconds of arc.
// Matches what eclipse.html computes live from js/ephemeris.js at that instant
// (140.0387); the old 140.133 read 20°08′ and disagreed with our own engine.
const ECLIPSE_LON = 140.039;
const BODIES = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function lonFrom(pos, key) {
  if (!pos) return null;
  const cap = key.charAt(0).toUpperCase() + key.slice(1);
  const aliases = {
    sun: ['sun', 'Sun'], moon: ['moon', 'Moon'], mercury: ['mercury', 'Mercury'],
    venus: ['venus', 'Venus'], mars: ['mars', 'Mars'], jupiter: ['jupiter', 'Jupiter'],
    saturn: ['saturn', 'Saturn'], uranus: ['uranus', 'Uranus'], neptune: ['neptune', 'Neptune'],
    pluto: ['pluto', 'Pluto'], asc: ['asc', 'Ascendant', 'ascendant'], mc: ['mc', 'Midheaven', 'midheaven'],
  };
  const keys = aliases[key] || [key, cap];
  for (const k of keys) {
    const p = pos[k];
    if (p == null) continue;
    if (typeof p === 'number' && !Number.isNaN(p)) return p;
    const lon = p.longitude ?? p.lon;
    if (lon != null && !Number.isNaN(Number(lon))) return Number(lon);
  }
  return null;
}

function natalFromPositions(positions, ascLon, mcLon) {
  const natal = {};
  for (const b of BODIES) {
    const lon = lonFrom(positions, b);
    if (lon != null) natal[b] = lon;
  }
  const asc = ascLon != null ? Number(ascLon) : lonFrom(positions, 'asc');
  const mc = mcLon != null ? Number(mcLon) : lonFrom(positions, 'mc');
  if (asc != null && !Number.isNaN(asc)) natal.asc = asc;
  if (mc != null && !Number.isNaN(mc)) natal.mc = mc;
  return natal;
}

function natalFromSavedChart(chart) {
  if (!chart) return null;
  const positions = chart.positions || {};
  const natal = natalFromPositions(positions, chart.ascendant, chart.mc ?? chart.midheaven);
  if (!Object.keys(natal).length) return null;
  return natal;
}

function computeNatalFromForm(form) {
  const E = window.AstroEphemeris;
  const P = window.AstroProfile;
  if (!E || !E.calculateNatalChart) throw new Error('Ephemeris not loaded');
  const date = form.date.value;
  const time = form.time.value || '12:00';
  const timeKnown = !!form.time.value;
  const lat = parseFloat(form.lat.value);
  const lon = parseFloat(form.lon.value);
  if (!date || Number.isNaN(lat) || Number.isNaN(lon)) throw new Error('Need date, latitude and longitude');
  if (P && P.buildChartData) {
    const built = P.buildChartData({
      name: 'Eclipse reading',
      date,
      time: timeKnown ? time : null,
      timeKnown,
      lat,
      lon,
      city: form.place.value || '',
      tz: form.tz.value || 'UTC',
    });
    if (!built) throw new Error('Could not compute chart');
    return {
      natal: natalFromSavedChart(built),
      label: [built.birthCity || form.place.value, built.birthDate].filter(Boolean).join(' · '),
      timeKnown,
    };
  }
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const raw = E.calculateNatalChart(y, m, d, hh || 12, mm || 0, lat, lon);
  const natal = natalFromPositions(raw.positions, timeKnown ? raw.ascendant : null, timeKnown ? raw.midheaven : null);
  return { natal, label: `${form.place.value || 'Custom'} · ${date}`, timeKnown };
}

function beatHtml(title, beat) {
  if (!beat) return '';
  let html = `<article class="ecl-beat ap-reveal">`;
  html += `<h3 class="ecl-beat__title">${esc(title)}</h3>`;
  if (beat.mono) html += `<p class="ecl-beat__mono mono">${esc(beat.mono)}</p>`;
  if (beat.serif) html += `<p class="ecl-beat__serif">${esc(beat.serif)}</p>`;
  if (beat.secondary) {
    if (beat.secondary.mono) html += `<p class="ecl-beat__mono mono">${esc(beat.secondary.mono)}</p>`;
    if (beat.secondary.serif) html += `<p class="ecl-beat__serif">${esc(beat.secondary.serif)}</p>`;
  }
  html += `</article>`;
  return html;
}

function renderReading(host, reading, meta) {
  const quiet = !!reading.gateSale;
  let html = `<div class="ecl-reading" data-quiet="${quiet ? '1' : '0'}">`;
  html += `<p class="ecl-reading__meta mono">${esc(meta.label || '')}${meta.timeKnown === false ? ' · birth time unknown (no houses)' : ''}</p>`;
  if (quiet) {
    html += `<div class="ecl-reading__gate warn" role="status">`;
    // "within the honest orb gate" was both jargon and, alongside a receipt that
    // may name a contact 0°25′ away, untrue. The gate is about DIRECT contacts.
    html += `<strong>A quiet one — so there is no paid edition to sell you.</strong>`;
    html += `<p>This eclipse makes no direct contact with your placements. That&rsquo;s a real answer, not a smaller one. Keep the free result and the field guide.</p>`;
    html += `</div>`;
  }
  html += beatHtml('1 · Anchor', reading.anchor);
  html += beatHtml('2 · Contact', reading.contact);
  if (quiet) html += beatHtml('3 · Close', reading.close);
  if (reading.houseNote) html += `<p class="note">${esc(reading.houseNote)}</p>`;
  if (reading.legal) html += `<p class="note">${esc(reading.legal)}</p>`;
  if (reading.wordCount) html += `<p class="mono ecl-reading__wc">${reading.wordCount} words · computed in your browser</p>`;

  html += `<div class="ecl-reading__cta">`;
  if (quiet) {
    html += `<a class="cta ghost" href="downloads/astroprecise-eclipse-field-guide-2026.pdf" download>Download the free field guide</a>`;
  } else {
    html += `<a class="cta" href="eclipse.html#contact">Open Your Eclipse Edition — £7</a>`;
  }
  html += `</div></div>`;
  host.innerHTML = html;
  host.hidden = false;
}

async function run() {
  const form = document.getElementById('ecl-form');
  const out = document.getElementById('ecl-out');
  const status = document.getElementById('ecl-status');
  if (!form || !out) return;

  const templates = await fetch('js/reading-templates.json').then((r) => {
    if (!r.ok) throw new Error('Templates missing');
    return r.json();
  });

  const saved = window.AstroProfile && AstroProfile.getActiveChart && AstroProfile.getActiveChart();
  if (saved) {
    const note = document.getElementById('ecl-saved-note');
    if (note) {
      note.hidden = false;
      note.textContent = `Using saved chart: ${saved.name || 'Untitled'} (${saved.birthDate || saved.date || '—'})`;
    }
    if (saved.birthDate || saved.date) form.date.value = saved.birthDate || saved.date;
    if (saved.birthTime || saved.time) form.time.value = saved.birthTime || saved.time;
    if (saved.lat != null) form.lat.value = saved.lat;
    if (saved.lon != null) form.lon.value = saved.lon;
    if (saved.birthCity || saved.city) form.place.value = saved.birthCity || saved.city;
    if (saved.tz) form.tz.value = saved.tz;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (status) status.textContent = 'Computing…';
    try {
      let natal;
      let label;
      let timeKnown = true;
      const useSaved = form.useSaved && form.useSaved.checked && saved;
      if (useSaved) {
        natal = natalFromSavedChart(saved);
        if (!natal || natal.sun == null) {
          // Recompute from birth data if packed positions lack longitudes
          const rebuilt = computeNatalFromForm({
            date: { value: saved.birthDate || saved.date },
            time: { value: saved.birthTime || saved.time || '' },
            lat: { value: String(saved.lat) },
            lon: { value: String(saved.lon) },
            place: { value: saved.birthCity || saved.city || '' },
            tz: { value: saved.tz || 'UTC' },
          });
          natal = rebuilt.natal;
          label = rebuilt.label;
          timeKnown = rebuilt.timeKnown;
        } else {
          label = `${saved.name || 'Saved'} · ${saved.birthDate || saved.date || ''}`;
          timeKnown = saved.timeKnown !== false && !!(saved.birthTime || saved.time);
        }
      } else {
        const rebuilt = computeNatalFromForm(form);
        natal = rebuilt.natal;
        label = rebuilt.label;
        timeKnown = rebuilt.timeKnown;
      }
      if (!natal || natal.sun == null) throw new Error('Need at least a Sun longitude — check date and place');

      const reading = buildEclipseReading5(ECLIPSE_LON, natal, templates, {
        local: {
          date: '12 August 2026',
          place: form.place.value || (saved && (saved.birthCity || saved.city)) || 'your sky',
          coveragePct: '88–96%',
          peakLocal: 'UK maximum ≈ 19:12 BST in London (19:05 Edinburgh, 19:16 Truro)',
        },
        dark: { start: 'after midnight', end: 'dawn', rate: 100 },
        quietGateDeg: 5,
      });
      renderReading(out, reading, { label, timeKnown });
      if (status) {
        status.textContent = reading.gateSale
          ? 'Quiet chart — sale gated (honest).'
          : 'Reading ready — computed on this device.';
      }
    } catch (err) {
      console.error(err);
      out.innerHTML = `<p class="warn">${esc(err.message || String(err))}</p>`;
      out.hidden = false;
      if (status) status.textContent = 'Could not compute.';
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { run().catch(console.error); });
} else {
  run().catch(console.error);
}
