/**
 * Astro Precise sign-daily — daily horoscope for sign landing pages.
 * Delegates to HoroscopeEngine (transit-based) when ephemeris is loaded;
 * otherwise uses honest generic copy (no fabricated aspects).
 * Lucky number, lucky colour, and wellness fields are never returned.
 */
(function () {
  'use strict';

  var ZODIAC_SIGNS_ORDER = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
  var CLAIM_KEYS = ['health', 'wellness', 'luckyNumber', 'luckyColor', 'luckyColorHex'];

  var FALLBACK_OVERVIEWS = {
    Aries: 'Today’s Aries note is a symbol, computed from planetary positions in your browser. It is not a promise about health, money, or what will happen.',
    Taurus: 'Your Taurus note is a symbol from the computed Moon and planet positions. It is not a promise about health, money, or what will happen.',
    Gemini: 'Gemini’s daily note is a symbol from the computed sky. It is not a promise about health, money, or what will happen.',
    Cancer: 'Cancer’s note follows the Moon’s computed sign and phase today, as a symbol. It is not a promise about health, money, or what will happen.',
    Leo: 'Leo’s daily note is a symbol from computed planetary positions. It is not a promise about health, money, or what will happen.',
    Virgo: 'Virgo’s note reflects today’s computed planetary weather, as a symbol. It is not a promise about health, money, or what will happen.',
    Libra: 'Libra’s daily note is a symbol from computed transits — a whole-sign solar chart from VSOP87 positions. It is not a promise about what will happen.',
    Scorpio: 'Scorpio’s note uses today’s computed sky as a symbol. It is not a promise about health, money, or what will happen.',
    Sagittarius: 'Sagittarius’s note is transit-based, not generic filler, and it stays symbolic. It is not a promise about what will happen.',
    Capricorn: 'Capricorn’s daily note comes from computed planetary positions, as a symbol. It is not a promise about health, money, or what will happen.',
    Aquarius: 'Aquarius’s note uses the computed sky as a symbol. It is not a promise about health, money, or what will happen.',
    Pisces: 'Pisces’s note follows computed lunar and planetary transits, as a symbol. It is not a promise about what will happen.',
  };

  function withoutClaims(reading) {
    if (!reading || typeof reading !== 'object') return reading;
    var copy = {};
    Object.keys(reading).forEach(function (key) {
      if (CLAIM_KEYS.indexOf(key) === -1) copy[key] = reading[key];
    });
    return copy;
  }

  function getDailyHoroscope(sign, date) {
    if (window.ContentService && typeof ContentService.getDailyReading === 'function') {
      var bank = ContentService.getDailyReading(sign, date);
      if (bank) return withoutClaims(bank);
    }
    if (window.HoroscopeEngine && typeof HoroscopeEngine.getDailyHoroscope === 'function') {
      var live = HoroscopeEngine.getDailyHoroscope(sign, date);
      if (live) return withoutClaims(live);
    }
    var day = date ? new Date(date) : new Date();
    return {
      sign: sign,
      date: day.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      overview: FALLBACK_OVERVIEWS[sign] || FALLBACK_OVERVIEWS.Aries,
      love: 'A symbolic note for people, in the tradition of Venus and the Moon. Open the horoscope page for the computed sky. It is not a promise about a relationship.',
      career: 'A symbolic note for work, in the tradition of Mars and Saturn. Open the horoscope page for the computed sky. It is not a promise about money or a result.',
      weekly: 'A weekly symbolic note is on the horoscope page, from the Moon’s sign changes. It is not a forecast of what will happen.',
      methodNote: 'The live-sky engine has not loaded on this page. Open the horoscope page for the computed reading. This note is symbolic.',
    };
  }

  window.SignDaily = { getDailyHoroscope: getDailyHoroscope, ZODIAC_SIGNS_ORDER: ZODIAC_SIGNS_ORDER };
  window.Interpretations = window.Interpretations || {};
  if (!window.HoroscopeEngine) {
    window.Interpretations.getDailyHoroscope = getDailyHoroscope;
  }
})();
