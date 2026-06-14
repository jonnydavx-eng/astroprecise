/**
 * AstroPrecise Content Service — static JSON "backend" for GitHub Pages.
 * Pre-generated bank: /data/content-bank/
 * Live ephemeris (HoroscopeEngine) remains the fallback when bank misses a date.
 */
(function () {
  'use strict';

  var BASE = 'data/content-bank';
  var SIGNS = [
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
  ];

  var cache = {
    manifest: null,
    daily: Object.create(null),
    monthly: Object.create(null),
    core: Object.create(null),
    inflight: Object.create(null),
  };

  function isoDate(d) {
    var x = d instanceof Date ? d : new Date(d);
    return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
  }

  function monthKey(d) {
    var x = d instanceof Date ? d : new Date(d);
    return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0');
  }

  function fetchJson(path) {
    if (cache.inflight[path]) return cache.inflight[path];
    cache.inflight[path] = fetch(path, { cache: 'default' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .finally(function () { delete cache.inflight[path]; });
    return cache.inflight[path];
  }

  function getManifest() {
    if (cache.manifest) return Promise.resolve(cache.manifest);
    return fetchJson(BASE + '/manifest.json').then(function (m) {
      cache.manifest = m;
      return m;
    });
  }

  function preloadDaily(date) {
    var iso = isoDate(date || new Date());
    if (cache.daily[iso]) return Promise.resolve(cache.daily[iso]);
    return fetchJson(BASE + '/daily/' + iso + '.json')
      .then(function (j) { cache.daily[iso] = j; return j; })
      .catch(function () { return null; });
  }

  function preloadMonthly(date) {
    var key = monthKey(date || new Date());
    if (cache.monthly[key]) return Promise.resolve(cache.monthly[key]);
    return fetchJson(BASE + '/monthly/' + key + '.json')
      .then(function (j) { cache.monthly[key] = j; return j; })
      .catch(function () { return null; });
  }

  function loadCore(name) {
    if (cache.core[name]) return Promise.resolve(cache.core[name]);
    return fetchJson(BASE + '/core/' + name)
      .then(function (j) { cache.core[name] = j; return j; })
      .catch(function () { return null; });
  }

  function ensureDaily(date) {
    return Promise.all([getManifest().catch(function () { return null; }), preloadDaily(date)]);
  }

  function getDailyReading(sign, date) {
    var iso = isoDate(date || new Date());
    var pack = cache.daily[iso];
    if (pack && pack.readings && pack.readings[sign]) return pack.readings[sign];
    return null;
  }

  function getMonthlyReading(sign, date) {
    var key = monthKey(date || new Date());
    var pack = cache.monthly[key];
    if (pack && pack.readings && pack.readings[sign]) return pack.readings[sign];
    return null;
  }

  function getPlanetText(planet, sign) {
    var corpus = cache.core['planet-in-sign.json'];
    if (!corpus) return null;
    return (corpus[planet] && corpus[planet][sign]) || null;
  }

  function getRisingText(sign) {
    var corpus = cache.core['rising-by-sign.json'];
    return corpus ? corpus[sign] : null;
  }

  function getHouse(number) {
    var houses = cache.core['houses.json'];
    if (!houses) return null;
    return houses.find(function (h) { return h.number === number; }) || null;
  }

  /** Compose natal snippets from bank + live Interpretations fallback */
  function composeNatalPlacements(chart) {
    var E = window.AstroEphemeris;
    var I = window.Interpretations;
    if (!chart || !chart.positions || !E) return [];

    function signOf(lon) {
      return SIGNS[Math.floor(((lon % 360) + 360) % 360 / 30)];
    }

    var bodies = [
      ['Sun', chart.positions.Sun],
      ['Moon', chart.positions.Moon],
      ['Mercury', chart.positions.Mercury],
      ['Venus', chart.positions.Venus],
      ['Mars', chart.positions.Mars],
      ['Jupiter', chart.positions.Jupiter],
      ['Saturn', chart.positions.Saturn],
    ];

    return bodies.filter(function (row) { return row[1] && typeof row[1].lon === 'number'; })
      .map(function (row) {
        var planet = row[0];
        var sign = signOf(row[1].lon);
        var text = getPlanetText(planet, sign);
        if (!text && I && I.getPlanetInterpretation) {
          text = I.getPlanetInterpretation(planet, sign);
        }
        var houseNum = chart.planetHouses && chart.planetHouses[planet];
        var house = houseNum ? getHouse(houseNum) : null;
        return {
          planet: planet,
          sign: sign,
          house: houseNum || null,
          text: text,
          houseKeyword: house ? house.keyword : null,
        };
      });
  }

  function composeDeepReadingOutline(chart) {
    var sections = cache.core['deep-reading-sections.json'] || {};
    var placements = composeNatalPlacements(chart);
    var rising = chart.risingSign || null;
    return {
      intro: sections.bigThree || '',
      rising: rising ? (getRisingText(rising) || '') : '',
      placements: placements,
      sectionBlurbs: {
        love: sections.love || '',
        career: sections.career || '',
        challenges: sections.challenges || '',
        purpose: sections.purpose || '',
      },
    };
  }

  /** Unified daily: bank → HoroscopeEngine → SignDaily fallback */
  function resolveDailyHoroscope(sign, date) {
    var bank = getDailyReading(sign, date);
    if (bank) return bank;
    if (window.HoroscopeEngine && HoroscopeEngine.getDailyHoroscope) {
      return HoroscopeEngine.getDailyHoroscope(sign, date);
    }
    if (window.SignDaily && SignDaily.getDailyHoroscope) {
      return SignDaily.getDailyHoroscope(sign, date);
    }
    return null;
  }

  function resolveMonthlyHoroscope(sign, date) {
    var bank = getMonthlyReading(sign, date);
    if (bank) return bank;
    if (window.HoroscopeEngine && HoroscopeEngine.getMonthlyHoroscope) {
      return HoroscopeEngine.getMonthlyHoroscope(sign, date);
    }
    return null;
  }

  function preloadCore() {
    return Promise.all([
      loadCore('planet-in-sign.json'),
      loadCore('houses.json'),
      loadCore('rising-by-sign.json'),
      loadCore('deep-reading-sections.json'),
    ]);
  }

  window.ContentService = {
    BASE: BASE,
    SIGNS: SIGNS,
    getManifest: getManifest,
    preloadDaily: preloadDaily,
    preloadMonthly: preloadMonthly,
    preloadCore: preloadCore,
    ensureDaily: ensureDaily,
    getDailyReading: getDailyReading,
    getMonthlyReading: getMonthlyReading,
    getPlanetText: getPlanetText,
    getRisingText: getRisingText,
    getHouse: getHouse,
    composeNatalPlacements: composeNatalPlacements,
    composeDeepReadingOutline: composeDeepReadingOutline,
    resolveDailyHoroscope: resolveDailyHoroscope,
    resolveMonthlyHoroscope: resolveMonthlyHoroscope,
    _cache: cache,
  };
})();