/**
 * Draw engraved zodiac seal SVGs on Canvas2D (share cards, PDF exports).
 * DOM pickers use celestial-seals.js; this module is export/canvas only.
 */
(function () {
  'use strict';

  var BASE = 'assets/images/seals/zodiac/';
  var cache = Object.create(null);

  function slugFor(sign) {
    if (window.AP_ZODIAC && typeof AP_ZODIAC.glyphKey === 'function') {
      return AP_ZODIAC.glyphKey(sign);
    }
    return String(sign || 'aries').toLowerCase();
  }

  function loadSeal(sign) {
    var slug = slugFor(sign);
    if (cache[slug] instanceof HTMLImageElement) {
      return Promise.resolve(cache[slug]);
    }
    if (cache[slug] && typeof cache[slug].then === 'function') {
      return cache[slug];
    }
    cache[slug] = new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () {
        cache[slug] = img;
        resolve(img);
      };
      img.onerror = function () {
        cache[slug] = null;
        resolve(null);
      };
      img.src = BASE + slug + '.svg';
    });
    return cache[slug];
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
    var img = cache[slug];
    return !!(img && img.complete && img.naturalWidth);
  }

  function drawSeal(ctx, sign, cx, cy, size) {
    var slug = slugFor(sign);
    var img = cache[slug];
    if (!img || !img.complete || !img.naturalWidth) {
      loadSeal(sign);
      return false;
    }
    var w = size * 1.08;
    var h = size * 1.26;
    ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
    return true;
  }

  function drawSealPlate(ctx, sign, cx, cy, r, elemCol) {
    var grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r);
    grad.addColorStop(0, 'rgba(255,255,255,0.18)');
    grad.addColorStop(0.4, (elemCol || '#c9a227') + 'cc');
    grad.addColorStop(1, (elemCol || '#c9a227') + '33');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(196,146,10,0.55)';
    ctx.lineWidth = Math.max(1, r * 0.06);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    return drawSeal(ctx, sign, cx, cy, r * 1.65);
  }

  window.APCanvasSeals = {
    slugFor: slugFor,
    loadSeal: loadSeal,
    preload: preload,
    ready: ready,
    drawSeal: drawSeal,
    drawSealPlate: drawSealPlate,
  };
})();