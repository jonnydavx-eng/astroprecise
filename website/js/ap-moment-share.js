/**
 * Astro Precise — Moment share-card painter
 * Paper & Night tokens (css/ap-tokens.css): paper ground, ink type, one copper
 * accent, AP Serif (Instrument Serif) + AP Sans (Inter). The only dark area is
 * the night disc that holds the zenith star patch.
 * Builds square PNG keepsakes: zenith + light-cone story for any civil date.
 * Requires: LightCone, StarCatalog, AstroEphemeris (for JD helpers via caller).
 */
(function (global) {
  'use strict';

  var CARD_BASE = 1080;
  /* Canvas cannot read CSS custom properties: the tokens are repeated here. */
  var PAPER = '#F6F3EC';
  var CARD = '#FBF9F4';
  var RULE = '#D6D1C6';
  var INK = '#0E1116';
  var GRAPHITE = '#3A3F47';
  var MUTED = '#5C6168';
  var COPPER = '#B4693E';
  var COPPER_INK = '#8A4A24';
  var NIGHT = '#0E1116';
  var STARLIGHT = '#F1E7CF';
  var NIGHT_COPPER = '#E2A27A';
  var SERIF = '"AP Serif", "Instrument Serif", "Times New Roman", serif';
  var SANS = '"AP Sans", Inter, system-ui, -apple-system, "Segoe UI", sans-serif';
  /* Seen about 360 CSS px wide on a phone: 1 unit is a third of a px there.
     Nothing on the card is set under 20 units (about 6.7 px at 360). */
  var MOMENT_MIN_PX = 20;

  function cardExportPx() {
    return (global.RafCore && global.RafCore.cardExportSize)
      ? global.RafCore.cardExportSize()
      : CARD_BASE * 2;
  }

  function cardFontsReady() {
    if (typeof document === 'undefined' || !document.fonts || !document.fonts.load) return Promise.resolve();
    var loads = Promise.all([
      document.fonts.load('400 84px ' + SERIF),
      document.fonts.load('italic 400 34px ' + SERIF),
      document.fonts.load('400 26px ' + SANS),
      document.fonts.load('600 22px ' + SANS),
    ]).catch(function () {});
    return Promise.race([loads, new Promise(function (resolve) { setTimeout(resolve, 2500); })]);
  }

  function cardBase() {
    var CARD_W = cardExportPx();
    var CARD_H = CARD_W;
    var S = CARD_W / CARD_BASE;
    var cv = document.createElement('canvas');
    var x = (global.RafCore && global.RafCore.prepExportCtx)
      ? global.RafCore.prepExportCtx(cv, CARD_W, CARD_H)
      : (cv.width = CARD_W, cv.height = CARD_H, cv.getContext('2d'));
    x.scale(S, S);

    x.fillStyle = PAPER;
    x.fillRect(0, 0, CARD_BASE, CARD_BASE);
    x.strokeStyle = RULE;
    x.lineWidth = 2;
    x.strokeRect(46, 46, CARD_BASE - 92, CARD_BASE - 92);
    x.lineWidth = 1;
    x.strokeRect(58.5, 58.5, CARD_BASE - 117, CARD_BASE - 117);
    return { cv: cv, x: x, S: S, CARD_W: CARD_W };
  }

  function tracked(x, px) {
    if ('letterSpacing' in x) x.letterSpacing = px + 'px';
  }

  function honestyBadge(x, cx, y, label) {
    x.font = '500 22px ' + SANS;
    var padX = 26, dotGap = 16, dotR = 5;
    var tw = x.measureText(label).width;
    var w = tw + padX * 2 + dotGap + dotR * 2;
    var h = 44, left = cx - w / 2;
    x.beginPath();
    if (x.roundRect) x.roundRect(left, y - h / 2, w, h, h / 2);
    else x.rect(left, y - h / 2, w, h);
    x.fillStyle = CARD;
    x.fill();
    x.lineWidth = 1.5;
    x.strokeStyle = RULE;
    x.stroke();
    var dotX = left + padX;
    x.beginPath();
    x.arc(dotX, y, dotR, 0, Math.PI * 2);
    x.fillStyle = COPPER;
    x.fill();
    x.textAlign = 'left';
    x.fillStyle = INK;
    x.fillText(label, dotX + dotGap, y + 8);
    x.textAlign = 'center';
  }

  function splitLines(x, text, maxW) {
    var words = String(text).split(/\s+/).filter(Boolean);
    var lines = [];
    var line = '';
    for (var wi = 0; wi < words.length; wi++) {
      var test = line ? line + ' ' + words[wi] : words[wi];
      if (x.measureText(test).width > maxW && line) {
        lines.push(line);
        line = words[wi];
      } else line = test;
    }
    if (line) lines.push(line);
    return lines;
  }

  function wrapText(x, text, cx, y, maxW, lineH) {
    var lines = splitLines(x, text, maxW);
    for (var i = 0; i < lines.length; i++) x.fillText(lines[i], cx, y + i * lineH);
    return y + lines.length * lineH;
  }

  function star4(x, cx, cy, r) {
    var w = r * 0.22;
    x.beginPath();
    x.moveTo(cx, cy - r);
    x.bezierCurveTo(cx + w * 0.35, cy - w, cx + w, cy - w * 0.35, cx + r, cy);
    x.bezierCurveTo(cx + w, cy + w * 0.35, cx + w * 0.35, cy + w, cx, cy + r);
    x.bezierCurveTo(cx - w * 0.35, cy + w, cx - w, cy + w * 0.35, cx - r, cy);
    x.bezierCurveTo(cx - w, cy - w * 0.35, cx - w * 0.35, cy - w, cx, cy - r);
    x.closePath();
    x.fill();
  }

  // The AstroPrecise mark: half paper, half night disc with a copper four-point star.
  function drawMark(x, cx, cy, size) {
    var r = size * 0.4;
    x.fillStyle = PAPER;
    x.beginPath(); x.arc(cx, cy, r, Math.PI / 2, Math.PI * 1.5); x.fill();
    x.fillStyle = NIGHT;
    x.beginPath(); x.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2); x.fill();
    x.strokeStyle = NIGHT;
    x.lineWidth = size * 0.04;
    x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.stroke();
    x.fillStyle = COPPER;
    star4(x, cx + r * 0.42, cy - r * 0.26, r * 0.3);
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

  /** Night disc: the engine still under the star patch, framed in hairlines.
      The disc is the one dark area on the card (Paper & Night rule). */
  function drawNightDisc(x, img, cx, cy, r) {
    x.save();
    x.beginPath();
    x.arc(cx, cy, r, 0, Math.PI * 2);
    x.closePath();
    x.fillStyle = NIGHT;
    x.fill();
    x.clip();
    if (img && img.naturalWidth) {
      var iw = img.naturalWidth, ih = img.naturalHeight;
      var scale = Math.max((r * 2) / iw, (r * 2) / ih);
      var dw = iw * scale, dh = ih * scale;
      x.globalAlpha = 0.5;
      x.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
      x.globalAlpha = 1;
      var vg = x.createRadialGradient(cx, cy, r * 0.35, cx, cy, r);
      vg.addColorStop(0, 'rgba(14,17,22,0)');
      vg.addColorStop(1, 'rgba(14,17,22,0.6)');
      x.fillStyle = vg;
      x.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
    x.restore();

    x.beginPath();
    x.arc(cx, cy, r, 0, Math.PI * 2);
    x.strokeStyle = GRAPHITE;
    x.lineWidth = 2;
    x.stroke();
    x.beginPath();
    x.arc(cx, cy, r + 10, 0, Math.PI * 2);
    x.strokeStyle = RULE;
    x.lineWidth = 1.5;
    x.stroke();
    // Copper registration ticks at the four diagonals of the outer ring.
    x.strokeStyle = COPPER;
    x.lineWidth = 2;
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (dir) {
      var ang = Math.atan2(dir[1], dir[0]);
      var c = Math.cos(ang), sn = Math.sin(ang);
      x.beginPath();
      x.moveTo(cx + c * (r + 4), cy + sn * (r + 4));
      x.lineTo(cx + c * (r + 18), cy + sn * (r + 18));
      x.stroke();
    });
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

    var base = cardBase();
    var x = base.x;
    var cx = CARD_BASE / 2;
    void seed0; // kept for callers; the paper ground has no seeded starfield

    x.textAlign = 'center';
    x.textBaseline = 'alphabetic';
    x.fillStyle = COPPER_INK;
    x.font = '600 26px ' + SANS;
    tracked(x, 8);
    x.fillText('MOMENT', cx, 118);
    tracked(x, 0);

    x.fillStyle = GRAPHITE;
    x.font = 'italic 400 34px ' + SERIF;
    x.fillText(moment.subtitle || 'The sky on the night it mattered', cx, 168);

    // Title / occasion
    x.fillStyle = INK;
    var title = moment.title || s.name;
    var nameSize = 84;
    x.font = '400 ' + nameSize + 'px ' + SERIF;
    while (x.measureText(title).width > CARD_BASE - 180 && nameSize > 44) {
      nameSize -= 4;
      x.font = '400 ' + nameSize + 'px ' + SERIF;
    }
    x.fillText(title, cx, 252);

    // Date + place
    x.fillStyle = GRAPHITE;
    x.font = '500 28px ' + SANS;
    var whenWhere = [moment.dateLabel, moment.placeLabel].filter(Boolean).join('  ·  ');
    if (whenWhere) x.fillText(whenWhere, cx, 302);

    // Zenith star name
    x.fillStyle = COPPER_INK;
    x.font = '600 22px ' + SANS;
    tracked(x, 4);
    x.fillText('ZENITH STAR', cx, 356);
    tracked(x, 0);

    x.fillStyle = INK;
    var starSize = 64;
    x.font = '400 ' + starSize + 'px ' + SERIF;
    while (x.measureText(s.name).width > CARD_BASE - 200 && starSize > 36) {
      starSize -= 4;
      x.font = '400 ' + starSize + 'px ' + SERIF;
    }
    x.fillText(s.name, cx, 420);

    // Star patch on the night disc (engine still under catalogue stars)
    var panelCy = 600, half = 148, span = 18;
    drawNightDisc(x, moment.plateImage || null, cx, panelCy, half);

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
      x.strokeStyle = 'rgba(241, 231, 207, 0.4)';
      x.lineWidth = 1.5;
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
        x.fillStyle = isHero ? NIGHT_COPPER : STARLIGHT;
        x.fill();
        if (isHero) {
          x.beginPath();
          x.arc(p.px, p.py, Math.max(r, 5) + 7, 0, Math.PI * 2);
          x.strokeStyle = NIGHT_COPPER;
          x.lineWidth = 1.5;
          x.stroke();
        }
      }
    }

    // Meta line
    x.fillStyle = INK;
    x.font = '500 26px ' + SANS;
    var parts = [];
    if (s.con) parts.push(s.con);
    if (s.spectral) parts.push('type ' + s.spectral);
    parts.push('mag ' + s.mag);
    parts.push(s.ly + ' ly');
    x.fillText(parts.join('   ·   '), cx, 806);

    // Light-cone / age story: two lines at most, stepping the size down to fit.
    x.fillStyle = GRAPHITE;
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
    var storyPx = 26;
    x.font = '400 ' + storyPx + 'px ' + SANS;
    while (splitLines(x, story, CARD_BASE - 200).length > 2 && storyPx > MOMENT_MIN_PX) {
      storyPx -= 1;
      x.font = '400 ' + storyPx + 'px ' + SANS;
    }
    wrapText(x, story, cx, 852, CARD_BASE - 200, Math.round(storyPx * 1.36));

    honestyBadge(x, cx, 930, 'computed · J2000 catalogue + LST · VSOP87');
    x.fillStyle = MUTED;
    x.font = '400 20px ' + SANS;
    x.fillText('stars = catalogue · plate = 3D orrery still · free PNG ≠ paid pack', cx, 980);
    x.font = '400 28px ' + SERIF;
    var wm = 'AstroPrecise · moment';
    var wmW = x.measureText(wm).width;
    drawMark(x, cx - wmW / 2 - 6, 1001, 30);
    x.fillStyle = INK;
    x.textAlign = 'left';
    x.fillText(wm, cx - wmW / 2 + 16, 1011);
    x.textAlign = 'center';

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

  async function shareOrDownload(cv, filename, opts) {
    if (!cv) return false;
    filename = filename || 'astroprecise-moment.png';
    opts = opts || {};
    var shareText = opts.text || 'The sky on a night that mattered — computed privately.';
    if (opts.url && !/\bhttps?:\/\//.test(shareText)) {
      try {
        shareText += ' ' + new URL(opts.url, (typeof location !== 'undefined' ? location.href : 'https://astroprecise.app/')).href;
      } catch (eUrl) { /* optional */ }
    }
    try {
      if (navigator.share && navigator.canShare && cv.toBlob) {
        var blob = await new Promise(function (res) { cv.toBlob(res, 'image/png'); });
        if (blob) {
          var file = new File([blob], filename, { type: 'image/png' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: opts.title || 'My Astro Precise Moment',
              text: shareText
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
    return Promise.all([loadPlate(src), cardFontsReady()]).then(function (loaded) {
      var img = loaded[0];
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
    CARD_BASE: CARD_BASE,
    MOMENT_MIN_PX: MOMENT_MIN_PX
  };
})(typeof window !== 'undefined' ? window : globalThis);
