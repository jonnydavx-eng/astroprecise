/* AstroPrecise Daily: truthful local date stamp for the 12:00 UT solar-chart reading. */
(function () {
  'use strict';
  if (window.__apDailyRitualBooted) return;
  window.__apDailyRitualBooted = true;

  function stampDate() {
    var target = document.getElementById('today-date-display');
    if (!target) return;
    var date = new Date().toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    target.textContent = date.replace(/,/g, '').toUpperCase()
      + ' · POSITIONS CALCULATED AT 12:00 UT · SOLAR-CHART READING';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', stampDate, { once: true });
  } else {
    stampDate();
  }
})();
