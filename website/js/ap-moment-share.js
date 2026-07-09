/**
 * Astro Precise — Moment share-card painter
 * Observatory 2026 tokens only (void #0C1016 + brass #C2A05E).
 * Builds square PNG keepsakes: zenith + light-cone story for any civil date.
 * Requires: LightCone, StarCatalog, AstroEphemeris (for JD helpers via caller).
 */
(function (global) {
  'use strict';

  var CARD_BASE = 1080;
  var BRASS = '#C2A05E';
  var BRASS_A55 = 'rgba(194, 160, 94, 0.55)';
  var BRASS_A22 = 'rgba(194, 160, 94, 0.22)';
  var BRASS_A30 = 'rgba(194, 160, 94, 0.30)';
  var PARCH = '#ECE6D8';
  var PARCH_DIM = '#BEB298';
  var PARCH_MUTED = '#A89C84';
  var VOID = '#0C1016';
  var GOLD_GLOW = 'rgba(194, 160, 94, 0.55)';

  function cardExportPx() {
    return (global.RafCore && global.RafCore.cardExportSize)
      ? global.RafCore.cardExportSize()
      : CARD_BASE * 2;
  }

  function cardBase(opts) {
    opts = opts || {};
    var CARD_W = cardExportPx();
    var CARD_H = CARD_W;
    var S = CARD_W / CARD_BASE;
    var nebX = opts.nebX == null ? CARD_BASE / 2 : opts.nebX;
    var nebY = opts.nebY == null ? 430 : opts.nebY;
    var nebR = opts.nebR == null ? 520 : opts.nebR;
    var stars = opts.stars == null ? 160 : opts.stars;
    var seed = opts.seed0 == null ? 137 : opts.seed0;
    var cv = document.createElement('canvas');
    var x = (global.RafCore && global.RafCore.prepExportCtx)
      ? global.RafCore.prepExportCtx(cv, CARD_W, CARD_H)
      : (cv.width = CARD_W, cv.height = CARD_H, cv.getContext('2d'));
    x.scale(S, S);

    x.fillStyle = VOID;
    x.fillRect(0, 0, CARD_BASE, CARD_BASE);
    var neb = x.createRadialGradient(nebX, nebY, 0, nebX, nebY, nebR);
    neb.addColorStop(0, 'rgba(110, 26, 38, 0.18)');
    neb.addColorStop(0.45, 'rgba(92, 74, 110, 0.10)');
    neb.addColorStop(1, 'transparent');
    x.fillStyle = neb;
    x.fillRect(0, 0, CARD_BASE, CARD_BASE);

    var rnd = function () {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (var i = 0; i < stars; i++) {
      x.fillStyle = 'rgba(236, 230, 216,' + (0.1 + rnd() * 0.5) + ')';
      x.beginPath();
      x.arc(rnd() * CARD_BASE, rnd() * CARD_BASE, rnd() * 1.6 + 0.3, 0, Math.PI * 2);
      x.fill();
    }

    x.strokeStyle = BRASS_A55;
    x.lineWidth = 2;
    x.strokeRect(46, 46, CARD_BASE - 92, CARD_BASE - 92);
    x.strokeStyle = BRASS_A22;
    x.strokeRect(58, 58, CARD_BASE - 116, CARD_BASE - 116);
    return { cv: cv, x: x, S: S, CARD_W: CARD_W };
  }

  function honestyBadge(x, cx, y, label) {
    x.font = '20px Georgia, "Times New Roman", serif';
    var padX = 26, dotGap = 16, dotR = 5;
    var tw = x.measureText(label).width;
    var w = tw + padX * 2 + dotGap + dotR * 2;
    var h = 42, left = cx - w / 2;
    x.beginPath();
    if (x.roundRect) x.roundRect(left, y - h / 2, w, h, h / 2);
    else x.rect(left, y - h / 2, w, h);
    x.fillStyle = 'rgba(12, 16, 22, 0.72)';
    x.fill();
    x.lineWidth = 1;
    x.strokeStyle = BRASS_A55;
    x.stroke();
    var dotX = left + padX;
    x.beginPath();
    x.arc(dotX, y, dotR, 0, Math.PI * 2);
    x.fillStyle = BRASS;
    x.fill();
    x.textAlign = 'left';
    x.fillStyle = '#EFE3C0';
    x.fillText(label, dotX + dotGap, y + 7);
    x.textAlign = 'center';
  }

  function wrapText(x, text, cx, y, maxW, lineH) {
    var words = String(text).split(/\s+/);
    var line = '', yy = y;
    for (var wi = 0; wi < words.length; wi++) {
      var w = words[wi];
      var test = line ? line + ' ' + w : w;
      if (x.measureText(test).width > maxW && line) {
        x.fillText(line, cx, yy);
        line = w;
        yy += lineH;
      } else line = test;
    }
    if (line) {
      x.fillText(line, cx, yy);
      yy += lineH;
    }
    return yy;
  }

  /** Cache engine stills (3D capture library) for card plates — no live WebGL. */
  var _plateCache = {};
  function plateSrcForKind(kind) {
    if (kind === 'met' || kind === 'wedding') return 'img/engine/earth-moon.webp';
    if (kind === 'memorial') return 'img/engine/saturn.webp';
    if (kind === 'birth') return 'img/engine/earth.webp';
    return 'img/engine/earth.webp';
  }
  function loadPlate(src) {
    if (!src) return Promise.resolve(null);
    if (_plateCache[src] && _plateCache[src].complete && _plateCache[src].naturalWidth) {
      return Promise.resolve(_plateCache[src]);
    }
    return new Promise(function (resolve) {
      var img = _plateCache[src] || new Image();
      _plateCache[src] = img;
      if (img.complete && img.naturalWidth) {
        resolve(img);
        return;
      }
      img.onload = function () { resolve(img); };
      img.onerror = function () { resolve(null); };
      if (!img.src) img.src = src;
    });
  }

  function drawEngineWindow(x, img, cx, cy, r) {
    if (!img || !img.naturalWidth) return;
    x.save();
    x.beginPath();
    x.arc(cx, cy, r, 0, Math.PI * 2);
    x.closePath();
    x.clip();
    // Cover-fit circle
    var iw = img.naturalWidth, ih = img.naturalHeight;
    var scale = Math.max((r * 2) / iw, (r * 2) / ih);
    var dw = iw * scale, dh = ih * scale;
    x.globalAlpha = 0.42;
    x.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
    x.globalAlpha = 1;
    // Soft void vignette so stars stay readable
    var vg = x.createRadialGradient(cx, cy, r * 0.35, cx, cy, r);
    vg.addColorStop(0, 'rgba(12,16,22,0)');
    vg.addColorStop(1, 'rgba(12,16,22,0.55)');
    x.fillStyle = vg;
    x.fillRect(cx - r, cy - r, r * 2, r * 2);
    x.restore();
  }

  /**
   * @param {object} moment
   *   title, subtitle, dateLabel, placeLabel, kind
   *   zenith: { star, sepDeg, zenithRa, zenithDec } from LightCone.zenithStar
   *   cone: { radiusLy } from LightCone.state (optional; future moments use age from date)
   *   seed0: number
   *   plateImage: optional HTMLImageElement (engine still)
   */
  function paintMomentCard(moment) {
    if (!moment || !moment.zenith || !moment.zenith.star) return null;
    var S = global.StarCatalog;
    var z = moment.zenith;
    var s = z.star;
    var seed0 = moment.seed0;
    if (seed0 == null) {
      seed0 = 0;
      var key = (moment.dateLabel || '') + (s.name || '');
      for (var ci = 0; ci < key.length; ci++) seed0 = (seed0 * 31 + key.charCodeAt(ci)) >>> 0;
      seed0 = (seed0 % 200000) + 50;
    }

    var base = cardBase({ nebY: 460, nebR: 480, seed0: seed0 });
    var x = base.x;
    var cx = CARD_BASE / 2;

    x.textAlign = 'center';
    x.fillStyle = BRASS;
    x.font = '26px Georgia, "Times New Roman", serif';
    x.fillText('M O M E N T', cx, 118);

    x.fillStyle = PARCH_MUTED;
    x.font = 'italic 28px Georgia, "Times New Roman", serif';
    x.fillText(moment.subtitle || 'The sky on the night it mattered', cx, 168);

    // Title / occasion
    x.fillStyle = PARCH;
    var title = (moment.title || s.name).toUpperCase();
    var nameSize = 72;
    x.font = 'bold ' + nameSize + 'px Georgia, "Times New Roman", serif';
    while (x.measureText(title).width > CARD_BASE - 180 && nameSize > 40) {
      nameSize -= 4;
      x.font = 'bold ' + nameSize + 'px Georgia, "Times New Roman", serif';
    }
    x.shadowColor = GOLD_GLOW;
    x.shadowBlur = 20;
    x.fillText(title, cx, 250);
    x.shadowBlur = 0;

    // Date + place
    x.fillStyle = PARCH_DIM;
    x.font = '28px Georgia, "Times New Roman", serif';
    var whenWhere = [moment.dateLabel, moment.placeLabel].filter(Boolean).join('  ·  ');
    if (whenWhere) x.fillText(whenWhere, cx, 302);

    // Zenith star name
    x.fillStyle = BRASS;
    x.font = '22px Georgia, "Times New Roman", serif';
    x.fillText('ZENITH STAR', cx, 360);

    x.fillStyle = PARCH;
    var starSize = 64;
    x.font = 'bold ' + starSize + 'px Georgia, "Times New Roman", serif';
    while (x.measureText(s.name.toUpperCase()).width > CARD_BASE - 200 && starSize > 36) {
      starSize -= 4;
      x.font = 'bold ' + starSize + 'px Georgia, "Times New Roman", serif';
    }
    x.shadowColor = GOLD_GLOW;
    x.shadowBlur = 18;
    x.fillText(s.name.toUpperCase(), cx, 430);
    x.shadowBlur = 0;

    // Star patch — engine photoreal window under catalogue stars (3D still library)
    var panelCy = 580, half = 160, span = 18;
    var plate = moment.plateImage || null;
    if (plate) drawEngineWindow(x, plate, cx, panelCy, half);

    if (S && S.STARS) {
      var wrapDeg = function (d) { return ((d + 540) % 360) - 180; };
      var panelStars = [];
      for (var si = 0; si < S.STARS.length; si++) {
        var st = S.STARS[si];
        var dRa = wrapDeg(st.ra - z.zenithRa) * Math.cos(z.zenithDec * Math.PI / 180);
        var dDec = st.dec - z.zenithDec;
        if (Math.abs(dRa) <= span && Math.abs(dDec) <= span) {
          panelStars.push({
            st: st,
            px: cx + (dRa / span) * half,
            py: panelCy - (dDec / span) * half
          });
        }
      }
      x.beginPath();
      x.arc(cx, panelCy, half, 0, Math.PI * 2);
      x.strokeStyle = 'rgba(194, 160, 94, 0.28)';
      x.lineWidth = 2;
      x.stroke();
      x.strokeStyle = BRASS_A30;
      x.beginPath();
      x.moveTo(cx - 14, panelCy); x.lineTo(cx + 14, panelCy);
      x.moveTo(cx, panelCy - 14); x.lineTo(cx, panelCy + 14);
      x.stroke();
      for (var pi = 0; pi < panelStars.length; pi++) {
        var p = panelStars[pi];
        var isHero = p.st === s;
        var r = Math.max(1.4, 4.0 - p.st.mag * 0.7);
        x.beginPath();
        x.arc(p.px, p.py, isHero ? Math.max(r, 5) : r, 0, Math.PI * 2);
        if (isHero) {
          x.fillStyle = 'rgba(216, 185, 120, 0.98)';
          x.shadowColor = GOLD_GLOW;
          x.shadowBlur = 14;
        } else {
          x.fillStyle = 'rgba(190, 178, 152, 0.72)';
          x.shadowBlur = 0;
        }
        x.fill();
        x.shadowBlur = 0;
      }
    }

    // Meta line
    x.fillStyle = '#EFE3C0';
    x.font = '26px Georgia, "Times New Roman", serif';
    var parts = [];
    if (s.con) parts.push(s.con);
    if (s.spectral) parts.push('type ' + s.spectral);
    parts.push('mag ' + s.mag);
    parts.push(s.ly + ' ly');
    x.fillText(parts.join('   ·   '), cx, 790);

    // Light-cone / age story
    x.fillStyle = PARCH_MUTED;
    x.font = '24px Georgia, "Times New Roman", serif';
    var story = moment.storyLine;
    if (!story && moment.cone && isFinite(moment.cone.radiusLy)) {
      var ly = moment.cone.radiusLy;
      story = ly < 0.01
        ? 'A new moment — light has barely left this night.'
        : ('Light has travelled about ' + (ly < 10 ? ly.toFixed(2) : Math.round(ly)) +
          ' light-years since this night.');
    }
    if (!story) {
      story = 'Nearest catalogue star to the zenith — ' +
        (isFinite(z.sepDeg) ? z.sepDeg.toFixed(1) + '° from exact overhead.' : 'computed from LST + latitude.');
    }
    wrapText(x, story, cx, 840, CARD_BASE - 200, 34);

    honestyBadge(x, cx, 960, 'computed · J2000 catalogue + LST · VSOP87');
    x.fillStyle = BRASS;
    x.font = '20px Georgia, "Times New Roman", serif';
    x.fillText('astroprecise · moment', cx, 1015);

    return base.cv;
  }

  function downloadCanvas(cv, filename) {
    if (!cv) return false;
    var a = document.createElement('a');
    a.download = filename || 'astroprecise-moment.png';
    a.href = cv.toDataURL('image/png');
    a.click();
    return true;
  }

  async function shareOrDownload(cv, filename) {
    if (!cv) return false;
    filename = filename || 'astroprecise-moment.png';
    try {
      if (navigator.share && navigator.canShare && cv.toBlob) {
        var blob = await new Promise(function (res) { cv.toBlob(res, 'image/png'); });
        if (blob) {
          var file = new File([blob], filename, { type: 'image/png' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: 'My Astro Precise Moment',
              text: 'The sky on a night that mattered — computed privately.'
            });
            return true;
          }
        }
      }
    } catch (e) { /* fall through to download */ }
    return downloadCanvas(cv, filename);
  }

  /** Async paint: preloads engine plate for kind, then paints. */
  function paintMomentCardAsync(moment) {
    var src = plateSrcForKind(moment && moment.kind);
    return loadPlate(src).then(function (img) {
      var m = Object.assign({}, moment || {}, { plateImage: img || moment.plateImage || null });
      return paintMomentCard(m);
    });
  }

  global.APMomentShare = {
    paintMomentCard: paintMomentCard,
    paintMomentCardAsync: paintMomentCardAsync,
    loadPlate: loadPlate,
    plateSrcForKind: plateSrcForKind,
    downloadCanvas: downloadCanvas,
    shareOrDownload: shareOrDownload,
    CARD_BASE: CARD_BASE
  };
})(typeof window !== 'undefined' ? window : globalThis);
