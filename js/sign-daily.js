/**
 * AstroPrecise sign-daily — daily horoscope for sign landing pages.
 * Delegates to HoroscopeEngine (transit-based) when ephemeris is loaded;
 * otherwise uses honest generic copy (no fabricated aspects).
 */
(function () {
  'use strict';

  var ZODIAC_SIGNS_ORDER = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];

  var FALLBACK_OVERVIEWS = {
    Aries: 'Today\'s Aries reading uses the live sky on our horoscope page — cast from real planetary positions, not a recycled column.',
    Taurus: 'Your Taurus outlook updates daily from the actual Moon and planet positions. Open the full horoscope for today\'s transit-based reading.',
    Gemini: 'Gemini\'s daily note is computed from the real sky. See the complete reading with love, career, and wellness sections on horoscope.html.',
    Cancer: 'Cancer\'s reading follows the Moon\'s true sign and phase today. The full transit-based forecast is on our horoscope page.',
    Leo: 'Leo\'s daily outlook is generated from live ephemeris data. Open horoscope.html for the professional solar-chart reading.',
    Virgo: 'Virgo\'s forecast reflects today\'s actual planetary weather. Visit the horoscope page for the complete computed reading.',
    Libra: 'Libra\'s daily reading is built from real transits — whole-sign solar chart from VSOP87 positions.',
    Scorpio: 'Scorpio\'s outlook uses the live sky today. See horoscope.html for Moon house, aspects, and sector guidance.',
    Sagittarius: 'Sagittarius\'s reading is transit-based, not generic filler. Open the horoscope page for today\'s full forecast.',
    Capricorn: 'Capricorn\'s daily note comes from computed planetary positions. The complete reading is on horoscope.html.',
    Aquarius: 'Aquarius\'s forecast uses the real sky at local noon. Full love, career, and wellness sections on our horoscope page.',
    Pisces: 'Pisces\'s reading follows actual lunar and planetary transits. Open horoscope.html for the professional daily forecast.',
  };

  function getDailyHoroscope(sign, date) {
    if (window.ContentService && typeof ContentService.getDailyReading === 'function') {
      var bank = ContentService.getDailyReading(sign, date);
      if (bank) return bank;
    }
    if (window.HoroscopeEngine && typeof HoroscopeEngine.getDailyHoroscope === 'function') {
      var live = HoroscopeEngine.getDailyHoroscope(sign, date);
      if (live) return live;
    }
    var day = date ? new Date(date) : new Date();
    var epochDay = Math.floor(day.getTime() / 86400000);
    var signIdx = ZODIAC_SIGNS_ORDER.indexOf(sign);
    var seed = epochDay + (signIdx >= 0 ? signIdx + 1 : 1);
    return {
      sign: sign,
      date: day.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      overview: FALLBACK_OVERVIEWS[sign] || FALLBACK_OVERVIEWS.Aries,
      love: 'Open horoscope.html for a transit-based love reading computed from today\'s Venus and Moon positions.',
      career: 'Open horoscope.html for career guidance from today\'s Mars, Saturn, and solar 10th-house transits.',
      health: 'Open horoscope.html for wellness notes tied to today\'s lunar phase and Moon house.',
      weekly: 'Weekly outlook available on horoscope.html — computed from the Moon\'s sign changes this week.',
      luckyNumber: (seed % 9) + 1,
      luckyColor: 'Celestial Gold',
      methodNote: 'Load ephemeris + horoscope-engine for live-sky readings on this page.',
    };
  }

  window.SignDaily = { getDailyHoroscope: getDailyHoroscope, ZODIAC_SIGNS_ORDER: ZODIAC_SIGNS_ORDER };
  window.Interpretations = window.Interpretations || {};
  if (!window.HoroscopeEngine) {
    window.Interpretations.getDailyHoroscope = getDailyHoroscope;
  }
})();