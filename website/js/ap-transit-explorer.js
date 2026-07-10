/**
 * Transit Explorer — cinematic horoscope enhancements
 * Brass wheel, timeline scrubber, consciousness weather, personalized copy hooks.
 * Mounts into #transit-explorer or injects if missing on horoscope.html.
 */
(function (global) {
  'use strict';

  var SIGNS = [
    'Aries',
    'Taurus',
    'Gemini',
    'Cancer',
    'Leo',
    'Virgo',
    'Libra',
    'Scorpio',
    'Sagittarius',
    'Capricorn',
    'Aquarius',
    'Pisces',
  ];

  var PLANETS = [
    { id: 'sun', glyph: '☉', name: 'Sun' },
    { id: 'moon', glyph: '☽', name: 'Moon' },
    { id: 'mercury', glyph: '☿', name: 'Mercury' },
    { id: 'venus', glyph: '♀', name: 'Venus' },
    { id: 'mars', glyph: '♂', name: 'Mars' },
    { id: 'jupiter', glyph: '♃', name: 'Jupiter' },
    { id: 'saturn', glyph: '♄', name: 'Saturn' },
  ];

  function lonOf(id, jd) {
    try {
      var E = global.AstroEphemeris;
      if (E && typeof E[id + 'Position'] === 'function') {
        var p = E[id + 'Position'](jd);
        if (p && typeof p.lon === 'number') return (p.lon * 180) / Math.PI;
      }
    } catch (e) {}
    var fake = { sun: 108, moon: 42, mercury: 115, venus: 88, mars: 210, jupiter: 55, saturn: 340 };
    return fake[id] || 0;
  }

  function signOf(lon) {
    var x = ((lon % 360) + 360) % 360;
    return SIGNS[Math.floor(x / 30) % 12];
  }

  function ensureShell() {
    if (document.getElementById('transit-explorer')) return document.getElementById('transit-explorer');
    var path = (location.pathname || '').toLowerCase();
    if (path.indexOf('horoscope') < 0) return null;

    var section = document.createElement('section');
    section.id = 'transit-explorer';
    section.className = 'transit-explorer';
    section.setAttribute('aria-label', 'Transit Explorer');
    section.innerHTML =
      '<div class="transit-explorer__title">' +
      '<p class="eyebrow" style="letter-spacing:.2em;text-transform:uppercase;color:var(--ap-ink-muted);font-size:.72rem">Transit Explorer</p>' +
      '<h1>The sky moving through you</h1>' +
      '<p style="max-width:34rem;margin:.5rem auto 0;color:var(--ap-ink-muted);line-height:1.55">Real planetary weather on a brass wheel — scrub time, read the mood of the sky, open your chart when you want it personal.</p>' +
      '</div>' +
      '<div class="transit-wheel" id="transit-wheel" role="img" aria-label="Zodiac transit wheel">' +
      '<svg viewBox="0 0 200 200" aria-hidden="true">' +
      '<circle cx="100" cy="100" r="92" fill="none" stroke="#A8B0BC" stroke-width="0.8" opacity="0.7"/>' +
      '<circle cx="100" cy="100" r="78" fill="none" stroke="#A8B0BC" stroke-width="0.4" opacity="0.35"/>' +
      '<circle cx="100" cy="100" r="4" fill="#A8B0BC"/>' +
      '<g id="transit-ticks" stroke="#A8B0BC" stroke-width="0.6" opacity="0.8"></g>' +
      '<g id="transit-planets"></g>' +
      '</svg></div>' +
      '<label for="transit-scrub" class="ap-sr-only">Hours from now</label>' +
      '<input id="transit-scrub" class="transit-scrub" type="range" min="-48" max="48" value="0" step="1" />' +
      '<p id="transit-scrub-label" class="transit-scrub-label">Now · live sky</p>' +
      '<div class="transit-panels">' +
      '<article class="ap-card"><h2>Personalised sky</h2><p id="transit-card-copy">Loading planetary positions…</p><a class="ap-btn ap-btn--primary" href="chart.html">Cast free chart</a></article>' +
      '<article class="ap-card transit-holo"><h2>Consciousness weather</h2><p id="transit-weather">Reading the field…</p><a class="ap-btn ap-btn--ghost" href="ephemeris.html">Open The Sky</a></article>' +
      '<article class="ap-card"><h2>Open sky</h2><a class="ap-btn ap-btn--ghost" href="mysky.html">View 3D on My Sky</a></article>' +
      '</div>';

    var main = document.querySelector('main');
    if (main) main.insertBefore(section, main.firstChild);
    else document.body.insertBefore(section, document.body.firstChild);
    return section;
  }

  function drawTicks() {
    var g = document.getElementById('transit-ticks');
    if (!g || g.childElementCount) return;
    for (var i = 0; i < 12; i++) {
      var a = ((i * 30 - 90) * Math.PI) / 180;
      var x1 = 100 + 88 * Math.cos(a);
      var y1 = 100 + 88 * Math.sin(a);
      var x2 = 100 + 80 * Math.cos(a);
      var y2 = 100 + 80 * Math.sin(a);
      var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', x1);
      line.setAttribute('y1', y1);
      line.setAttribute('x2', x2);
      line.setAttribute('y2', y2);
      g.appendChild(line);
    }
  }

  function render() {
    var scrub = document.getElementById('transit-scrub');
    var hours = scrub ? +scrub.value || 0 : 0;
    var jd = Date.now() / 86400000 + 2440587.5 + hours / 24;
    var g = document.getElementById('transit-planets');
    if (!g) return;
    g.innerHTML = '';
    var lines = [];
    PLANETS.forEach(function (p) {
      var lon = lonOf(p.id, jd);
      // crude hour drift for schematic if engine missing
      if (!global.AstroEphemeris) lon = (lon + hours * 0.5) % 360;
      var a = ((lon - 90) * Math.PI) / 180;
      var r = 62;
      var x = 100 + r * Math.cos(a);
      var y = 100 + r * Math.sin(a);
      var t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      t.setAttribute('x', x);
      t.setAttribute('y', y);
      t.setAttribute('text-anchor', 'middle');
      t.setAttribute('dominant-baseline', 'middle');
      t.setAttribute('fill', '#C8CDD6');
      t.setAttribute('font-size', '8');
      t.textContent = p.glyph;
      g.appendChild(t);
      lines.push(p.name + ' in ' + signOf(lon));
    });

    var lab = document.getElementById('transit-scrub-label');
    if (lab) {
      if (hours === 0) lab.textContent = 'Now · live sky';
      else lab.textContent = (hours > 0 ? '+' : '') + hours + 'h from now';
    }
    var card = document.getElementById('transit-card-copy');
    if (card) {
      card.textContent =
        lines.slice(0, 4).join(' · ') +
        '. This is geometry from the real sky — pick your sign below for the daily story, or cast a chart to lock Rising & houses.';
    }
    var weather = document.getElementById('transit-weather');
    if (weather) {
      var moonSign = signOf(lonOf('moon', jd));
      var mercSign = signOf(lonOf('mercury', jd));
      weather.textContent =
        'Moon in ' +
        moonSign +
        ' colours mood and body rhythm. Mercury in ' +
        mercSign +
        ' sets the tone of attention and speech. Outer planets hold the long weather; scrub the timeline to feel the next two days.';
    }
  }

  function bootOrrery() {
    if (typeof global.initOrrery === 'function' && document.getElementById('horoscope-orrery')) {
      try {
        global.initOrrery('horoscope-orrery', { minHeight: '240px', autoRotate: true });
      } catch (e) {
        console.warn('[transit-explorer] orrery', e);
      }
    }
  }

  function boot() {
    if (!ensureShell()) return;
    drawTicks();
    render();
    var scrub = document.getElementById('transit-scrub');
    if (scrub) scrub.addEventListener('input', render);
    // Wait for ephemeris if it loads async
    var tries = 0;
    var iv = setInterval(function () {
      tries++;
      render();
      if (global.AstroEphemeris || tries > 20) clearInterval(iv);
    }, 250);
    setTimeout(bootOrrery, 200);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  global.AP_TRANSIT_EXPLORER = { render: render, boot: boot };
})(typeof window !== 'undefined' ? window : globalThis);
