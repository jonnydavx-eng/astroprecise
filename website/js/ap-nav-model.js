/**
 * AstroPrecise — Navigation IA (single source of truth).
 * Load before app.js: <script src="js/ap-nav-model.js"></script>
 * Desktop: 5 primaries + More flyout. Mobile: 4 bottom tabs (Home/Chart/Daily/Sky) + drawer.
 */
'use strict';

(function () {
  var NAV_PRIMARY = [
    ['index.html', 'Home'],
    ['chart.html', 'Chart'],
    ['horoscope.html', 'Daily'],
    ['compatibility.html', 'Match'],
    ['ephemeris.html', 'Sky'],
  ];

  var NAV_MORE_EXPLORE = [
    ['transits.html', 'Transits', { badge: 'Personal', dataNavPromoted: 'personal' }],
    ['compatibility.html', 'Compatibility', { badge: 'Match', dataNavPromoted: 'match' }],
    ['charts.html', 'My Charts'],
    ['lifepath.html', 'Life Path'],
    ['shop.html', 'Shop'],
    ['why.html', 'Why'],
  ];

  var NAV_BOTTOM_TABS = [
    ['index.html', 'Home', 'star4'],
    ['chart.html', 'Chart', 'spiral'],
    ['horoscope.html', 'Daily', 'crescent'],
    ['ephemeris.html', 'Sky', 'telescope'],
  ];

  var NAV_EXTRAS = [
    ['accuracy.html', 'Accuracy'], ['charts.html', 'My Charts'], ['quiz.html', 'Cosmic Quiz'],
    ['tonight.html', "Tonight's Sky"], ['moonphase.html', 'Moon Phase'], ['retrograde.html', 'Retrograde'],
    ['angel-numbers.html', 'Angel Numbers'], ['name-numerology.html', 'Name Numerology'],
    ['what-is-my-rising-sign.html', 'Rising Sign'], ['synastry.html', 'Synastry'],
    ['solar-return.html', 'Solar Return'], ['saturn-return.html', 'Saturn Return'],
    ['links.html', 'Links'],
  ];

  window.AP_NAV = {
    NAV_PRIMARY: NAV_PRIMARY,
    NAV_MORE_EXPLORE: NAV_MORE_EXPLORE,
    NAV_BOTTOM_TABS: NAV_BOTTOM_TABS,
    NAV_EXTRAS: NAV_EXTRAS,
    NAV_DRAWER_SECTIONS: [
      { label: 'Explore', items: NAV_MORE_EXPLORE },
      { label: 'Tools', items: NAV_EXTRAS },
    ],
  };
})();