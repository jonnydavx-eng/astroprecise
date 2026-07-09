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
 *   Shop     → shop.html  (keepsakes / PDFs — homepage float uses "Shop" not "Keep")
 * Site spine (product order): Cast → Sky → Keep → Daily → Reading → Shop
 * Primary bar keeps Chart · Sky · Daily · Readings · Library · Shop.
 * Moment (Keep) is first in More Explore so it is one tap from every page.
 * Mobile bottom tabs match spine: Chart · Sky · Daily · Shop.
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

  // Keep first — same product ladder as home instruments step 03
  var NAV_MORE_EXPLORE = [
    ['moment.html', 'Moment', { badge: 'Keep' }],
    ['compatibility.html', 'Compatibility', { badge: 'Match', dataNavPromoted: 'match' }],
    ['transits.html', 'Transits', { badge: 'Personal', dataNavPromoted: 'personal' }],
    ['profile.html', 'Profile'],
    ['charts.html', 'My Charts'],
  ];

  // Spine order (not Daily-before-Sky)
  var NAV_BOTTOM_TABS = [
    ['chart.html', 'Chart', 'spiral'],
    ['ephemeris.html', 'Sky', 'telescope'],
    ['horoscope.html', 'Daily', 'crescent'],
    ['shop.html', 'Shop', 'star4'],
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
