/**
 * Draw engraved zodiac seal SVGs on Canvas2D (share cards, PDF exports).
 * DOM pickers use celestial-seals.js; this module is export/canvas only.
 */
(function () {
  'use strict';

  var BASE_ZODIAC = 'assets/images/seals/zodiac/';
  var BASE_PLANET = 'assets/images/seals/planets/';
  var cache = Object.create(null);

  var PLANET_SLUG = {
    Sun: 'sun', Moon: 'moon', Mercury: 'mercury', Venus: 'venus', Mars: 'mars',
    Jupiter: 'jupiter', Saturn: 'saturn', Uranus: 'uranus', Neptune: 'neptune', Pluto: 'pluto',
    Earth: 'earth'
  };

  function slugFor(sign) {
    if (window.AP_ZODIAC && typeof AP_ZODIAC.glyphKey === 'function') {
      return AP_ZODIAC.glyphKey(sign);
    }
    return String(sign || 'aries').toLowerCase();
  }

  function loadSeal(sign) {
    var slug = slugFor(sign);
    var key = 'z:' + slug;
    if (cache[key] instanceof HTMLImageElement) {
      return Promise.resolve(cache[key]);
    }
    if (cache[key] && typeof cache[key].then === 'function') {
      return cache[key];
    }
    cache[key] = new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () {
        cache[key] = img;
        resolve(img);
      };
      img.onerror = function () {
        cache[key] = null;
        resolve(null);
      };
      img.src = BASE_ZODIAC + slug + '.svg';
    });
    return cache[key];
  }

  function loadPlanetSeal(planetName) {
    var slug = PLANET_SLUG[planetName] || String(planetName || '').toLowerCase();
    var key = 'p:' + slug;
    if (cache[key] instanceof HTMLImageElement) {
      return Promise.resolve(cache[key]);
    }
    if (cache[key] && typeof cache[key].then === 'function') {
      return cache[key];
    }
    cache[key] = new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () {
        cache[key] = img;
        resolve(img);
      };
      img.onerror = function () {
        cache[key] = null;
        resolve(null);
      };
      img.src = BASE_PLANET + slug + '.svg';
    });
    return cache[key];
  }

  function drawPlanetSeal(ctx, planetName, cx, cy, size) {
    var slug = PLANET_SLUG[planetName] || String(planetName || '').toLowerCase();
    var key = 'p:' + slug;
    var img = cache[key];
    if (!img || !img.complete || !img.naturalWidth) {
      loadPlanetSeal(planetName);
      return false;
    }
    var w = size * 1.05;
    var h = size * 1.05;
    ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
    return true;
  }

  function preloadPlanets(names) {
    var list = names || Object.keys(PLANET_SLUG);
    return Promise.all(list.map(loadPlanetSeal));
  }

  function preload(signs) {
    var list = signs || [];
    if (window.AP_ZODIAC && AP_ZODIAC.SIGNS && !list.length) {
      list = AP_ZODIAC.SIGNS.map(function (s) { return s.name; });
    }
    return Promise.all(list.map(loadSeal));
  }

  function ready(sign) {
    var slug = slugFor(sign);
    var img = cache['z:' + slug];
    return !!(img && img.complete && img.naturalWidth);
  }

  function drawSeal(ctx, sign, cx, cy, size) {
    var slug = slugFor(sign);
    var img = cache['z:' + slug];
    if (!img || !img.complete || !img.naturalWidth) {
      loadSeal(sign);
      return false;
    }
    var w = size * 1.08;
    var h = size * 1.26;
    ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
    return true;
  }

  function withAlpha(col, hexAlpha) {
    var a = String(hexAlpha || 'ff');
    var alpha = (parseInt(a, 16) / 255);
    if (!isFinite(alpha)) alpha = 1;
    var base = col || '#C2A05E';
    if (/^#[0-9a-f]{3,8}$/i.test(base)) {
      var h = base.slice(1);
      if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      return 'rgba(' +
        parseInt(h.slice(0, 2), 16) + ',' +
        parseInt(h.slice(2, 4), 16) + ',' +
        parseInt(h.slice(4, 6), 16) + ',' + alpha.toFixed(3) + ')';
    }
    var rgb = base.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
    if (rgb) {
      return 'rgba(' + rgb[1] + ',' + rgb[2] + ',' + rgb[3] + ',' + alpha.toFixed(3) + ')';
    }
    return base;
  }

  function drawSealPlate(ctx, sign, cx, cy, r, elemCol) {
    var grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r);
    grad.addColorStop(0, 'rgba(255,255,255,0.18)');
    grad.addColorStop(0.4, withAlpha(elemCol, 'cc'));
    grad.addColorStop(1, withAlpha(elemCol, '33'));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(194,160,94,0.55)';
    ctx.lineWidth = Math.max(1, r * 0.06);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    return drawSeal(ctx, sign, cx, cy, r * 1.65);
  }

  window.APCanvasSeals = {
    slugFor: slugFor,
    loadSeal: loadSeal,
    loadPlanetSeal: loadPlanetSeal,
    preload: preload,
    preloadPlanets: preloadPlanets,
    ready: ready,
    drawSeal: drawSeal,
    drawPlanetSeal: drawPlanetSeal,
    drawSealPlate: drawSealPlate,
    withAlpha: withAlpha,
  };
})();