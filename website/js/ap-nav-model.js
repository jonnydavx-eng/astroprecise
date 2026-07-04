/**
 * Astro Precise — Navigation IA (single source of truth).
 * Load before app.js: <script src="js/ap-nav-model.js"></script>
 *
 * LOCKED UNIFIED VOCABULARY (same on every page — homepage, tool pages, sign pages):
 *   Chart · Sky · Daily · Readings · Library · Shop
 * Targets:
 *   Chart    → chart.html
 *   Sky      → ephemeris.html   (the "Sky" instrument; label is always "Sky")
 *   Daily    → horoscope.html
 *   Readings → cosmic-story.html (the FREE sample narrative reading)
 *   Library  → guides.html
 *   Shop     → shop.html
 * Secondary tools live in the "More" menu (NAV_EXTRAS), never in the primary bar.
 * Desktop: 6 primaries + More flyout. Mobile: 4 bottom tabs (Chart/Daily/Sky/Readings) + drawer.
 */
'use strict';

(function () {
  var NAV_PRIMARY = [
    ['chart.html', 'Chart'],
    ['ephemeris.html', 'Sky'],
    ['horoscope.html', 'Daily'],
    ['cosmic-story.html', 'Readings'],
    ['guides.html', 'Library'],
    ['shop.html', 'Shop'],
  ];

  // Secondary tools surfaced in the "More" flyout, grouped.
  var NAV_MORE_EXPLORE = [
    ['compatibility.html', 'Compatibility', { badge: 'Match', dataNavPromoted: 'match' }],
    ['transits.html', 'Transits', { badge: 'Personal', dataNavPromoted: 'personal' }],
    ['profile.html', 'Profile'],
    ['charts.html', 'My Charts'],
  ];

  var NAV_BOTTOM_TABS = [
    ['chart.html', 'Chart', 'spiral'],
    ['horoscope.html', 'Daily', 'crescent'],
    ['ephemeris.html', 'Sky', 'telescope'],
    ['cosmic-story.html', 'Readings', 'star4'],
  ];

  // Everything else — the tool sprawl — collapses here, into the "More" drawer/flyout.
  var NAV_EXTRAS = [
    ['catalogue.html', 'Lookbook'],
    ['moonphase.html', 'Moon Phase'], ['retrograde.html', 'Retrograde'],
    ['this-weeks-sky.html', "This Week's Sky"], ['tonight.html', "Tonight's Sky"],
    ['solar-return.html', 'Solar Return'], ['saturn-return.html', 'Saturn Return'],
    ['synastry.html', 'Synastry'], ['what-is-my-rising-sign.html', 'Rising Sign'],
    ['angel-numbers.html', 'Angel Numbers'], ['name-numerology.html', 'Name Numerology'],
    ['lifepath.html', 'Life Path'],
    ['quiz.html', 'Cosmic Quiz'], ['accuracy.html', 'Accuracy'],
    ['why.html', 'Why'], ['links.html', 'Links'],
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
