/**
 * Astro Precise — Navigation IA (model-first, single source of truth).
 * Load before app.js: <script src="js/ap-nav-model.js"></script>
 *
 * OBSERVATORY STRUCTURE (2026-07-10 — the homepage IS the model):
 *   The living orrery is the product; index.html is the Observatory.
 *
 * Primary bar: Observatory · Chart · The Sky · Daily · Shop
 *   Observatory = the full-model homepage (index.html)
 *   Chart       = cast natal (chart.html)
 *   The Sky     = sky instrument / ephemeris (ephemeris.html)
 *   Daily       = horoscope (horoscope.html)
 *   Shop        = keepsakes
 *
 * Bottom tabs (4): Observatory · Chart · The Sky · Daily
 * More: My Sky hub, Moment, Cosmic Story, Library, Match, tools…
 *
 * Site spine: Observatory (see) → Chart (cast) → The Sky (instrument) → Keep → Daily → Shop
 * explore.html is the flagship Sky Explorer: direct model links bypass its Observatory threshold.
 */
'use strict';

(function () {
  var NAV_PRIMARY = [
    ['index.html', 'Observatory'],
    ['chart.html', 'Chart'],
    ['ephemeris.html', 'The Sky'],
    ['horoscope.html', 'Daily'],
    ['shop.html', 'Shop'],
  ];

  // Hub + keep + story + library first in More
  var NAV_MORE_EXPLORE = [
    ['eclipse.html', 'The Eclipse', { badge: '12 Aug' }],
    ['explore.html', 'Sky Explorer', { badge: 'Live' }],
    ['mysky.html', 'My Sky', { badge: 'Hub' }],
    ['moment.html', 'Moment', { badge: 'Keep' }],
    ['cosmic-story.html', 'Cosmic Story'],
    ['guides.html', 'Library'],
    ['compatibility.html', 'Compatibility', { badge: 'Match', dataNavPromoted: 'match' }],
    ['transits.html', 'Your Transits', { badge: 'Personal', dataNavPromoted: 'personal' }],
    ['profile.html', 'Profile'],
    ['charts.html', 'My Charts'],
  ];

  // Four tabs only — model + cast + sky + daily (distinct icons)
  var NAV_BOTTOM_TABS = [
    ['index.html', 'Observatory', 'star4'],
    ['chart.html', 'Chart', 'spiral'],
    ['ephemeris.html', 'The Sky', 'telescope'],
    ['horoscope.html', 'Daily', 'crescent'],
  ];

  var NAV_EXTRAS = [
    ['tonight.html', 'Tonight'], ['this-weeks-sky.html', 'This Week'],
    ['moonphase.html', 'Moon Phase'], ['retrograde.html', 'Retrograde'],
    ['catalogue.html', 'Lookbook'],
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
