/**
 * Astro Precise sign-daily — daily horoscope for sign landing pages.
 * Delegates to HoroscopeEngine (transit-based) when ephemeris is loaded;
 * otherwise uses honest generic copy (no fabricated aspects).
 */
(function () {
  'use strict';

  var ZODIAC_SIGNS_ORDER = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];

  var FALLBACK_OVERVIEWS = {
    Aries: 'Today\'s Aries reading is computed from planetary positions in your browser. Open today\'s reading for the one-screen view.',
    Taurus: 'Your Taurus outlook updates from the computed Moon and planet positions. Open today\'s reading for the full transit-based note.',
    Gemini: 'Gemini\'s daily note is computed from the real sky. See today\'s reading for people, work, and pace.',
    Cancer: 'Cancer\'s reading follows the Moon\'s computed sign and phase today. The one-screen view is on the horoscope page.',
    Leo: 'Leo\'s daily outlook is generated from computed planetary positions. Open today\'s reading for the solar-chart note.',
    Virgo: 'Virgo\'s note reflects today\'s computed planetary weather. Visit the horoscope page for the one-screen reading.',
    Libra: 'Libra\'s daily reading is built from computed transits — whole-sign solar chart from VSOP87 positions.',
    Scorpio: 'Scorpio\'s outlook uses today\'s computed sky. See the horoscope page for Moon house, aspects, and sector guidance.',
    Sagittarius: 'Sagittarius\'s reading is transit-based, not generic filler. Open today\'s reading for the one-screen view.',
    Capricorn: 'Capricorn\'s daily note comes from computed planetary positions. The one-screen reading is on the horoscope page.',
    Aquarius: 'Aquarius\'s note uses the computed sky. People, work, and pace sections are on the horoscope page.',
    Pisces: 'Pisces\'s reading follows computed lunar and planetary transits. Open today\'s reading for the one-screen view.',
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
      methodNote: 'The live-sky engine has not loaded on this page — open horoscope.html for the computed reading.',
    };
  }

  window.SignDaily = { getDailyHoroscope: getDailyHoroscope, ZODIAC_SIGNS_ORDER: ZODIAC_SIGNS_ORDER };
  window.Interpretations = window.Interpretations || {};
  if (!window.HoroscopeEngine) {
    window.Interpretations.getDailyHoroscope = getDailyHoroscope;
  }
})();