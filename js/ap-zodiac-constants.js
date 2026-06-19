/**
 * AstroPrecise — single source of truth for the 12 zodiac signs.
 * Seal art uses lowercase `key` (slug), not Unicode emoji.
 */
(function () {
  'use strict';

  var SIGNS = [
    { key: 'aries',       name: 'Aries',       element: 'fire',  dates: 'Mar 21 – Apr 19', lon: 0 },
    { key: 'taurus',      name: 'Taurus',      element: 'earth', dates: 'Apr 20 – May 20', lon: 30 },
    { key: 'gemini',      name: 'Gemini',      element: 'air',   dates: 'May 21 – Jun 20', lon: 60 },
    { key: 'cancer',      name: 'Cancer',      element: 'water', dates: 'Jun 21 – Jul 22', lon: 90 },
    { key: 'leo',         name: 'Leo',         element: 'fire',  dates: 'Jul 23 – Aug 22', lon: 120 },
    { key: 'virgo',       name: 'Virgo',       element: 'earth', dates: 'Aug 23 – Sep 22', lon: 150 },
    { key: 'libra',       name: 'Libra',       element: 'air',   dates: 'Sep 23 – Oct 22', lon: 180 },
    { key: 'scorpio',     name: 'Scorpio',     element: 'water', dates: 'Oct 23 – Nov 21', lon: 210 },
    { key: 'sagittarius', name: 'Sagittarius', element: 'fire',  dates: 'Nov 22 – Dec 21', lon: 240 },
    { key: 'capricorn',   name: 'Capricorn',   element: 'earth', dates: 'Dec 22 – Jan 19', lon: 270 },
    { key: 'aquarius',    name: 'Aquarius',    element: 'air',   dates: 'Jan 20 – Feb 18', lon: 300 },
    { key: 'pisces',      name: 'Pisces',      element: 'water', dates: 'Feb 19 – Mar 20', lon: 330 },
  ];

  /** Legacy Unicode glyphs — for orb upgrade / canvas only; prefer `key` for seals. */
  var SIGN_GLYPH = {
    Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋', Leo: '♌', Virgo: '♍',
    Libra: '♎', Scorpio: '♏', Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓',
  };

  var SIGN_ORDER = SIGNS.map(function (s) { return s.name; });

  var SIGN_GLYPH_BY_INDEX = SIGNS.map(function (s) { return SIGN_GLYPH[s.name]; });

  var SIGN_SLUG = {};
  var SIGN_ELEMENT = {};
  var SIGN_NAMES_BY_KEY = {};
  var BY_KEY = {};
  var BY_NAME = {};

  SIGNS.forEach(function (s) {
    SIGN_SLUG[s.name] = s.key;
    SIGN_ELEMENT[s.name] = s.element;
    SIGN_NAMES_BY_KEY[s.key] = s.name;
    BY_KEY[s.key] = s;
    BY_NAME[s.name] = s;
  });

  function normKey(v) {
    return String(v || '').toLowerCase().trim();
  }

  function signByKey(key) {
    return BY_KEY[normKey(key)] || null;
  }

  function signByName(name) {
    return BY_NAME[String(name || '').trim()] || null;
  }

  function signIndex(keyOrName) {
    var s = signByKey(keyOrName) || signByName(keyOrName);
    return s ? SIGNS.indexOf(s) : -1;
  }

  /** Seal slug for illustrated zodiac art (`assets/images/seals/zodiac/{key}.svg`). */
  function glyphKey(keyOrName) {
    var s = signByKey(keyOrName) || signByName(keyOrName);
    return s ? s.key : normKey(keyOrName) || 'aries';
  }

  window.AP_ZODIAC = {
    SIGNS: SIGNS,
    SIGN_ORDER: SIGN_ORDER,
    SIGN_GLYPH: SIGN_GLYPH,
    SIGN_GLYPH_BY_INDEX: SIGN_GLYPH_BY_INDEX,
    SIGN_SLUG: SIGN_SLUG,
    SIGN_ELEMENT: SIGN_ELEMENT,
    SIGN_NAMES_BY_KEY: SIGN_NAMES_BY_KEY,
    signByKey: signByKey,
    signByName: signByName,
    signIndex: signIndex,
    glyphKey: glyphKey,
  };
})();