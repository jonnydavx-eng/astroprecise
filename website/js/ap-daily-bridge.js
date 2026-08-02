/**
 * Astro Precise — Daily & transit experience bridge.
 * Connects collective daily readings to the user's saved natal chart.
 */
'use strict';

window.APDailyBridge = (function () {
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function buildChartFromSaved(chart) {
    if (!chart) return null;
    if (window.AstroProfile && typeof AstroProfile.buildChartData === 'function') {
      if (chart.birthDate || chart.date) {
        var lat = parseFloat(chart.lat);
        var lon = parseFloat(chart.lon);
        if (isFinite(lat) && isFinite(lon)) {
          try {
            var full = AstroProfile.buildChartData({
              name: chart.name,
              date: chart.birthDate || chart.date,
              time: chart.birthTime || chart.time,
              lat: lat,
              lon: lon,
              city: chart.birthCity || chart.city,
              tz: chart.tz,
              houseSystem: chart.houseSystem,
            });
            if (full && full.positions) return full;
          } catch (e) {}
        }
      }
    }
    if (window.AstroProfile && typeof AstroProfile.hydrateChartFromSaved === 'function') {
      var hydrated = AstroProfile.hydrateChartFromSaved(chart);
      if (hydrated) return hydrated;
    }
    return null;
  }

  function savedChart() {
    try {
      var charts = JSON.parse(localStorage.getItem('ap_charts') || '[]');
      if (!charts.length) return null;
      var activeId = localStorage.getItem('ap_active_chart');
      if (activeId) {
        var found = charts.filter(function (c) { return String(c.id) === String(activeId); })[0];
        if (found) return found;
      }
      return charts[0];
    } catch (e) { return null; }
  }

  function renderSkeleton(target) {
    if (!target) return;
    target.innerHTML =
      '<div class="ap-sky-bridge ap-skeleton" style="min-height:120px;padding:1.5rem;" aria-busy="true">' +
        '<span class="ap-loading-dots"><span></span><span></span><span></span></span> Reading your sky…' +
      '</div>';
  }

  function mountHoroscopeBridge() {
    var host = document.getElementById('ap-horoscope-sky-bridge');
    if (!host) {
      var anchor = document.querySelector('.sphere-controls')
        || document.getElementById('sphere-wrap')
        || document.getElementById('ecliptic-dial-section')
        || document.querySelector('.horoscope-dial-section');
      if (!anchor || !anchor.parentNode) return;
      host = document.createElement('div');
      host.id = 'ap-horoscope-sky-bridge';
      anchor.insertAdjacentElement('afterend', host);
    }

    var chart = savedChart();
    if (!chart) {
      host.innerHTML =
        '<div class="ap-sky-bridge ap-reveal-smooth">' +
          '<p class="ap-sky-bridge__eyebrow">Personal layer</p>' +
          '<h2 class="ap-sky-bridge__title">Today\'s collective sky — yours is deeper</h2>' +
          '<p style="font-size:0.88rem;color:var(--ap-text-secondary,#ddd3bf);margin:0;line-height:1.6;">' +
            'The reading below uses today\'s real transits. Save your birth chart to see which contacts hit <em>your</em> Sun, Moon, and Rising — not a generic sign column.' +
          '</p>' +
          '<div class="ap-sky-bridge__actions">' +
            '<a href="chart.html" class="btn btn--primary btn--sm">Cast your chart</a>' +
            '<a href="transits.html" class="btn btn--outline btn--sm">Personal transits</a>' +
          '</div>' +
        '</div>';
      return;
    }

    var name = chart.name || 'Your chart';
    var sun = chart.sunSign || (chart.positions && chart.positions.Sun && chart.positions.Sun.sign) || '—';
    var moon = chart.moonSign || (chart.positions && chart.positions.Moon && chart.positions.Moon.sign) || '—';
    var rising = chart.risingSign || chart.asc || '—';

    host.innerHTML =
      '<div class="ap-sky-bridge ap-reveal-smooth ap-glow-hover">' +
        '<p class="ap-sky-bridge__eyebrow">✦ ' + esc(name) + ' · saved on this device</p>' +
        '<h2 class="ap-sky-bridge__title">How today\'s sky meets your chart</h2>' +
        '<div class="ap-sky-bridge__compare">' +
          '<div class="ap-sky-bridge__col"><span>Collective reading</span>Sign you\'re exploring</div>' +
          '<div class="ap-sky-bridge__arrow" aria-hidden="true">↔</div>' +
          '<div class="ap-sky-bridge__col"><span>Your natal chart</span>☉ ' + esc(sun) + ' · ☽ ' + esc(moon) + ' · ↑ ' + esc(rising) + '</div>' +
        '</div>' +
        '<p style="font-size:0.84rem;color:var(--ap-text-secondary,#ddd3bf);margin:0;line-height:1.55;">' +
          'Transit chords on the dial highlight contacts between today\'s planets and your saved placements. Open Transits for the full personal forecast.' +
        '</p>' +
        '<div class="ap-sky-bridge__actions">' +
          '<a href="transits.html" class="btn btn--primary btn--sm">Your transits today</a>' +
          '<a href="chart.html" class="btn btn--outline btn--sm">Open chart</a>' +
          '<button type="button" class="btn btn--ghost btn--sm" id="ap-bridge-ai-daily">Smart insight</button>' +
        '</div>' +
        '<div id="ap-bridge-ai-out" class="ap-ai-output" style="margin-top:0.75rem;display:none;" aria-live="polite"></div>' +
      '</div>';

    document.getElementById('ap-bridge-ai-daily')?.addEventListener('click', function () {
      var out = document.getElementById('ap-bridge-ai-out');
      if (!out || !window.APAIAssistant) return;
      out.style.display = 'block';
      out.className = 'ap-ai-output ap-ai-output--loading';
      out.innerHTML = '<span class="ap-loading-dots"><span></span><span></span><span></span></span> Composing…';
      var fullChart = buildChartFromSaved(chart);
      var readingP = window.APAIAssistant && APAIAssistant.fetchDailyReading
        ? APAIAssistant.fetchDailyReading(fullChart || chart)
        : Promise.resolve(window.DailyTransit && DailyTransit.getReading ? DailyTransit.getReading() : null);
      readingP.then(function (reading) {
        return APAIAssistant.dailyInsight(fullChart || chart, reading);
      }).then(function (text) {
        out.className = 'ap-ai-output ap-reveal-smooth';
        out.textContent = text;
      }).catch(function () {
        out.className = 'ap-ai-output';
        out.textContent = 'Could not compose insight. Try again or open Transits.';
      });
    });
  }

  function enhanceDailyTransitCard() {
    var card = document.querySelector('#daily-transit-card .dt-card');
    if (!card || card.querySelector('.dt-bridge-footer')) return;

    var footer = document.createElement('div');
    footer.className = 'dt-bridge-footer';
    footer.style.cssText = 'margin-top:1.25rem;padding-top:1rem;border-top:1px solid rgba(216,180,106,0.12);display:flex;flex-wrap:wrap;gap:0.5rem;';
    footer.innerHTML =
      '<a href="horoscope.html" class="btn btn--outline btn--sm">Daily dial</a>' +
      '<a href="ephemeris.html" class="btn btn--outline btn--sm">Live sky</a>' +
      '<a href="chart.html" class="btn btn--ghost btn--sm">Edit chart</a>';
    card.appendChild(footer);
  }

  function patchDailyTransitMount() {
    if (!window.DailyTransit || DailyTransit._bridgePatched) return;
    var orig = DailyTransit.mount;
    if (typeof orig !== 'function') return;
    DailyTransit.mount = function (target) {
      var el = target || document.getElementById('daily-transit-card');
      if (el) renderSkeleton(el);
      var result = orig.apply(this, arguments);
      setTimeout(function () {
        enhanceDailyTransitCard();
      }, 50);
      return result;
    };
    DailyTransit._bridgePatched = true;
  }

  function init() {
    patchDailyTransitMount();
    if (document.body.classList.contains('page-horoscope') || /horoscope\.html/.test(location.pathname)) {
      mountHoroscopeBridge();
    }
    var card = document.getElementById('daily-transit-card');
    if (card) {
      if (card.querySelector('.dt-card')) enhanceDailyTransitCard();
      else if (window.DailyTransit && typeof DailyTransit.mount === 'function' && !card.children.length) {
        DailyTransit.mount(card);
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return {
    savedChart: savedChart,
    buildChartFromSaved: buildChartFromSaved,
    mountHoroscopeBridge: mountHoroscopeBridge,
    enhanceDailyTransitCard: enhanceDailyTransitCard,
    init: init,
  };
})();