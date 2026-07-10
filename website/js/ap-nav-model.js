/**
 * Astro Precise — Navigation IA (model-first, single source of truth).
 * Load before app.js: <script src="js/ap-nav-model.js"></script>
 *
 * MODEL-CENTERED STRUCTURE (2026-07-09 jet rebuild):
 *   The living orrery is the product. Tabs orbit it.
 *
 * Primary bar: Explore · Chart · Sky · Daily · Shop
 *   Explore = full-viewport 3D (explore.html)
 *   Chart   = cast natal (chart.html)
 *   Sky     = sky instrument / ephemeris (ephemeris.html)
 *   Daily   = horoscope (horoscope.html)
 *   Shop    = keepsakes
 *
 * Bottom tabs (4): Explore · Chart · Sky · Daily
 * More: My Sky hub, Moment, Readings, Library, Match, tools…
 *
 * Site spine: Explore (see) → Chart (cast) → Sky (instrument) → Keep → Daily → Shop
 */
'use strict';

(function () {
  var NAV_PRIMARY = [
    ['explore.html', 'Explore'],
    ['chart.html', 'Chart'],
    ['ephemeris.html', 'Sky'],
    ['horoscope.html', 'Daily'],
    ['shop.html', 'Shop'],
  ];

  // Hub + keep + story + library first in More
  var NAV_MORE_EXPLORE = [
    ['mysky.html', 'My Sky', { badge: 'Hub' }],
    ['moment.html', 'Moment', { badge: 'Keep' }],
    ['cosmic-story.html', 'Readings'],
    ['guides.html', 'Library'],
    ['compatibility.html', 'Compatibility', { badge: 'Match', dataNavPromoted: 'match' }],
    ['transits.html', 'Transits', { badge: 'Personal', dataNavPromoted: 'personal' }],
    ['profile.html', 'Profile'],
    ['charts.html', 'My Charts'],
  ];

  // Four tabs only — model + cast + sky + daily (distinct icons)
  var NAV_BOTTOM_TABS = [
    ['explore.html', 'Explore', 'star4'],
    ['chart.html', 'Chart', 'spiral'],
    ['ephemeris.html', 'Sky', 'telescope'],
    ['horoscope.html', 'Daily', 'crescent'],
  ];

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
      { label: 'Around the model', items: NAV_MORE_EXPLORE },
      { label: 'More tools', items: NAV_EXTRAS },
    ],
  };
})();
