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
    Aries: 'Today’s Aries note is a general symbolic reflection. It is not a promise about health, money, or what will happen.',
    Taurus: 'Today’s Taurus note is a general symbolic reflection. It is not a promise about health, money, or what will happen.',
    Gemini: 'Today’s Gemini note is a general symbolic reflection. It is not a promise about health, money, or what will happen.',
    Cancer: 'Today’s Cancer note is a general symbolic reflection. It is not a promise about health, money, or what will happen.',
    Leo: 'Today’s Leo note is a general symbolic reflection. It is not a promise about health, money, or what will happen.',
    Virgo: 'Today’s Virgo note is a general symbolic reflection. It is not a promise about health, money, or what will happen.',
    Libra: 'Today’s Libra note is a general symbolic reflection. It is not a promise about health, money, or what will happen.',
    Scorpio: 'Today’s Scorpio note is a general symbolic reflection. It is not a promise about health, money, or what will happen.',
    Sagittarius: 'Today’s Sagittarius note is a general symbolic reflection. It is not a promise about health, money, or what will happen.',
    Capricorn: 'Today’s Capricorn note is a general symbolic reflection. It is not a promise about health, money, or what will happen.',
    Aquarius: 'Today’s Aquarius note is a general symbolic reflection. It is not a promise about health, money, or what will happen.',
    Pisces: 'Today’s Pisces note is a general symbolic reflection. It is not a promise about health, money, or what will happen.',
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
