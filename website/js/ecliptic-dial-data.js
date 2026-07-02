'use strict';

/**
 * EclipticDialData — shared planet positions, legend, and sky headline for the
 * Daily ecliptic dial. Used by the live canvas path and the audit SVG poster.
 */
(function () {
  var SIGNS = (function () {
    var Z = window.AP_ZODIAC;
    if (Z && Z.SIGNS) return Z.SIGNS.map(function (s) { return s.name; });
    return ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
      'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  })();

  var PLANETS = [
    { key: 'sun',     sym: '☉', col: '#c9a227', name: 'Sun' },
    { key: 'moon',    sym: '☽', col: '#C8D0E8', name: 'Moon' },
    { key: 'mercury', sym: '☿', col: '#3f7d76', name: 'Mercury' },
    { key: 'venus',   sym: '♀', col: '#C77DFF', name: 'Venus' },
    { key: 'mars',    sym: '♂', col: '#e05848', name: 'Mars' },
    { key: 'jupiter', sym: '♃', col: '#E8A050', name: 'Jupiter' },
    { key: 'saturn',  sym: '♄', col: '#A0B898', name: 'Saturn' },
  ];

  var planetLons = {};
  var planetPoll = null;
  var onPlanetsUpdated = null;
  var ready = false;
  var dialReadyFired = false;

  function lonToSign(lon) {
    var idx = Math.floor((((lon % 360) + 360) % 360) / 30);
    return SIGNS[idx] || '';
  }

  function degInSign(lon) {
    return Math.floor(((lon % 30) + 30) % 30);
  }

  function notify() {
    updateLegend();
    if (typeof onPlanetsUpdated === 'function') onPlanetsUpdated(planetLons);
    if (!dialReadyFired && planetLons.sun != null) {
      dialReadyFired = true;
      try { document.dispatchEvent(new CustomEvent('ap-horoscope-dial-ready')); } catch (e) { /* */ }
    }
  }

  function updateEclipticHeadline() {
    var el = document.getElementById('ecliptic-sky-headline');
    if (!el || planetLons.sun == null) return;
    var parts = ['☉ ' + degInSign(planetLons.sun) + '° ' + lonToSign(planetLons.sun)];
    if (planetLons.moon != null) {
      parts.push('☽ ' + degInSign(planetLons.moon) + '° ' + lonToSign(planetLons.moon));
    }
    el.textContent = parts.join(' · ');
  }

  function updateLegend() {
    var legend = document.getElementById('planet-legend');
    if (legend) {
      legend.querySelectorAll('.pl-dot').forEach(function (el) {
        var label = (el.getAttribute('aria-label') || '').replace(/ position$/i, '');
        var pl = PLANETS.find(function (p) { return p.name === label; });
        if (!pl || planetLons[pl.key] == null) return;
        el.textContent = pl.sym + ' ' + degInSign(planetLons[pl.key]) + '° ' + lonToSign(planetLons[pl.key]);
        el.style.setProperty('--c', pl.col);
      });
    }
    updateEclipticHeadline();
  }

  function updateLegendComputing() {
    var legend = document.getElementById('planet-legend');
    if (legend) {
      legend.querySelectorAll('.pl-dot').forEach(function (el) {
        var label = (el.getAttribute('aria-label') || '').replace(/ position$/i, '');
        var pl = PLANETS.find(function (p) { return p.name === label; });
        if (!pl) return;
        el.textContent = pl.sym + ' …';
      });
    }
    var headline = document.getElementById('ecliptic-sky-headline');
    if (headline) headline.textContent = 'Computing today\'s sky…';
  }

  function approxPlanets() {
    var now = new Date();
    var start = new Date(now.getFullYear(), 0, 0);
    var doy = (now - start) / 86400000;
    var yr = now.getFullYear() + (now.getMonth() + 1) / 12;
    planetLons.sun = (doy / 365.25) * 360;
    var jd = 367 * now.getUTCFullYear() -
      Math.floor(7 * (now.getUTCFullYear() + Math.floor((now.getUTCMonth() + 1 + 9) / 12)) / 4) +
      Math.floor(275 * (now.getUTCMonth() + 1) / 9) + now.getUTCDate() + 1721013.5;
    var syn = 29.53058867;
    var ph = ((jd - 2451549.5) % syn + syn) % syn / syn;
    planetLons.moon = (planetLons.sun + ph * 360) % 360;
    planetLons.mercury = (planetLons.sun + 50 * Math.sin(yr * 2.1)) % 360;
    planetLons.venus = (planetLons.sun + 30 * Math.sin(yr * 1.6 + 1)) % 360;
    planetLons.mars = (planetLons.sun + 120 + 20 * Math.sin(yr * 0.9)) % 360;
    planetLons.jupiter = (30 * yr + 80) % 360;
    planetLons.saturn = (12 * yr + 200) % 360;
    notify();
    return true;
  }

  function fetchPlanets() {
    var E = window.AstroEphemeris;
    if (!E) return false;
    try {
      var now = new Date();
      var jd = E.julianDay(now.getFullYear(), now.getMonth() + 1, now.getDate(),
        now.getUTCHours(), now.getUTCMinutes(), 0);
      var mod = function (l) { return ((l % 360) + 360) % 360; };
      PLANETS.forEach(function (pl) {
        try {
          var lon;
          if (pl.key === 'sun') lon = E.sunPosition(jd).lon;
          else if (pl.key === 'moon') lon = E.moonPosition(jd).lon;
          else lon = E.planetLongitude(pl.key, jd);
          planetLons[pl.key] = mod(lon);
        } catch (e) { /* skip */ }
      });
      notify();
      return true;
    } catch (e) {
      return false;
    }
  }

  function startPlanetPoll() {
    if (planetPoll) return;
    approxPlanets();
    planetPoll = window.setInterval(function () {
      if (!fetchPlanets()) approxPlanets();
    }, 60000);
    if (!fetchPlanets()) {
      window.setTimeout(function () {
        if (!fetchPlanets()) approxPlanets();
      }, 600);
    }
  }

  function init(opts) {
    opts = opts || {};
    if (typeof opts.onPlanetsUpdated === 'function') {
      var cb = opts.onPlanetsUpdated;
      if (onPlanetsUpdated) {
        var prev = onPlanetsUpdated;
        onPlanetsUpdated = function (lons) { prev(lons); cb(lons); };
      } else {
        onPlanetsUpdated = cb;
      }
    }
    if (ready) {
      refreshPlanets();
      return;
    }
    startPlanetPoll();
    ready = true;
  }

  function refreshPlanets() {
    return fetchPlanets() || approxPlanets();
  }

  function syncLegendLons(lons) {
    if (!lons) return;
    Object.keys(lons).forEach(function (k) {
      if (lons[k] != null) planetLons[k] = lons[k];
    });
    updateLegend();
  }

  window.EclipticDialData = {
    init: init,
    refreshPlanets: refreshPlanets,
    syncLegendLons: syncLegendLons,
    getPlanetLons: function () { return Object.assign({}, planetLons); },
    updateLegend: updateLegend,
    PLANETS: PLANETS,
  };
})();