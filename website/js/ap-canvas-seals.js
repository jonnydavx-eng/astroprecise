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

  function withAlpha(col, hexAlpha) {
    var a = String(hexAlpha || 'ff');
    var alpha = (parseInt(a, 16) / 255);
    if (!isFinite(alpha)) alpha = 1;
    var base = col || '#c9a227';
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
    withAlpha: withAlpha,
  };
})();