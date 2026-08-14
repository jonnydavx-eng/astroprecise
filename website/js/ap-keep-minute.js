/**
 * Keep path — carries a birth minute already entered on this page to the sky
 * card, without ever putting it in a link.
 *
 * Same law as the chart → eclipse handoff: sessionStorage is one tab, one
 * origin, never transmitted, and gone when the tab closes. A birth moment in a
 * query string would land in access logs, in the Referer of everything the next
 * page loads, and in the visitor's own synced history.
 *
 * If storage is blocked, or nothing has been typed yet, the link still works —
 * sky-card.html then falls back to a locally saved chart, or asks for the
 * minute. Nothing here is required to use the free pages.
 */
(function () {
  'use strict';

  var KEY = 'ap-sky-card-handoff';

  /* One field set per page that can already hold a birth minute. Chart and the
     natal reading resolve a real zone and coordinates from the gazetteer, so
     their handoff is complete; the homepage coupon holds text only, and the sky
     card says so instead of pretending the town is a location. */
  var FIELD_SETS = [
    { date: 'dob', time: 'tob', zone: 'tz', place: 'natal-city' },
    { date: 'date-input', time: 'time-input', zone: 'tz-input', place: 'city-input', lat: 'lat-input', lon: 'lon-input' },
    { date: 'f-date', time: 'f-time', place: 'f-place' },
  ];

  function value(id) {
    if (!id) return '';
    var el = document.getElementById(id);
    return el && typeof el.value === 'string' ? el.value.trim() : '';
  }

  function collect() {
    for (var i = 0; i < FIELD_SETS.length; i += 1) {
      var set = FIELD_SETS[i];
      var date = value(set.date);
      if (!date) continue;
      return {
        date: date,
        time: value(set.time),
        zone: value(set.zone),
        place: value(set.place),
        lat: value(set.lat),
        lon: value(set.lon),
      };
    }
    return null;
  }

  function carry() {
    var minute = collect();
    if (!minute) return;
    try { sessionStorage.setItem(KEY, JSON.stringify(minute)); } catch (e) { /* blocked: the link still works */ }
  }

  function bind() {
    document.querySelectorAll('a[data-ap-keep-minute]').forEach(function (link) {
      link.addEventListener('click', carry);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
