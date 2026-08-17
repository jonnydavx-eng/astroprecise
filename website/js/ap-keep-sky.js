/* Keep this sky — one local PNG. No account or product gate.
 *
 * Chart / home birth-hour path: Keep → void-orrery.captureStill({mode:'birth-hour',jd})
 * → Orrery3D.captureBirthHourStill → applyAuthoredBirthHourStill(jd).
 * Do not rebuild that camera here. Couples Keep stays current-view (no birth-hour).
 *
 * Saved PNG is Surface A: SCHEMATIC stamp + honesty caption. Never label the file live.
 */
(function () {
  'use strict';

  var birthContext = null;
  var SURFACE_A = 'SCHEMATIC';

  function filename(context) {
    var date = context && /^\d{4}-\d{2}-\d{2}$/.test(context.birthDate || '')
      ? context.birthDate
      : '';
    return date ? 'astroprecise-' + date + '.png' : 'astroprecise-sky.png';
  }

  function utcMinute(jd) {
    if (!Number.isFinite(Number(jd))) return '';
    try {
      return new Date((Number(jd) - 2440587.5) * 86400000)
        .toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
    } catch (_) {
      return '';
    }
  }

  function caption(context) {
    if (!context) return 'Cast the chart to prepare its whole-system birth-hour frame.';
    var place = String(context.place || '').trim() || 'Place not supplied';
    var date = String(context.birthDate || '').trim() || 'Date not supplied';
    if (context.timeKnown === true && context.birthTime) {
      var accuracy = context.timeAccuracy === 'approximate' ? 'approximate ' : '';
      var zone = context.timezone ? ' (' + context.timezone + ')' : '';
      var utc = utcMinute(context.jd);
      return 'Authored whole-system camera \u00b7 ' + date + ' \u00b7 ' + accuracy +
        context.birthTime + ' local' + zone + ' \u00b7 ' + place +
        (utc ? ' \u00b7 computed at ' + utc : '') + ' \u00b7 Earth marked as home.';
    }
    return 'Authored whole-system camera \u00b7 ' + date + ' \u00b7 ' + place +
      ' \u00b7 birth time unknown. Positions use a 12:00 UTC date reference; no precise Earth-facing hemisphere is claimed. Earth is marked as home.';
  }

  function wrapLines(ctx, text, maxWidth) {
    var words = String(text || '').split(/\s+/).filter(Boolean);
    var lines = [];
    var line = '';
    for (var i = 0; i < words.length; i++) {
      var next = line ? line + ' ' + words[i] : words[i];
      if (line && ctx.measureText(next).width > maxWidth) {
        lines.push(line);
        line = words[i];
      } else {
        line = next;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  /* Surface A still: SCHEMATIC honesty + caption on the file. No live label. */
  function stampSurfaceA(canvas, context) {
    if (!canvas || !canvas.getContext) return canvas;
    var ctx = canvas.getContext('2d');
    if (!ctx) return canvas;
    var w = canvas.width;
    var h = canvas.height;
    if (!(w > 8 && h > 8)) return canvas;

    var pad = Math.max(10, Math.round(w * 0.018));
    var labelSize = Math.max(11, Math.round(w * 0.016));
    var bodySize = Math.max(10, Math.round(w * 0.013));
    var band = Math.max(48, Math.round(h * 0.11));
    var y0 = h - band;

    ctx.save();
    ctx.fillStyle = 'rgba(12, 16, 22, 0.78)';
    ctx.fillRect(0, y0, w, band);

    ctx.textBaseline = 'top';
    ctx.fillStyle = '#A8B0BC';
    ctx.font = '600 ' + labelSize + 'px "IBM Plex Mono", ui-monospace, monospace';
    ctx.fillText(SURFACE_A, pad, y0 + pad * 0.55);

    var body = context
      ? caption(context)
      : 'Observatory still \u00b7 current view \u00b7 schematic stamp only.';
    ctx.fillStyle = '#ECE6D8';
    ctx.font = '500 ' + bodySize + 'px "IBM Plex Mono", ui-monospace, monospace';
    var lines = wrapLines(ctx, body, w - pad * 2);
    var lineH = bodySize * 1.35;
    var maxLines = Math.max(1, Math.floor((band - pad * 1.6 - labelSize) / lineH));
    var drawn = lines.slice(0, maxLines);
    var textY = y0 + pad * 0.55 + labelSize + Math.round(pad * 0.35);
    for (var i = 0; i < drawn.length; i++) {
      ctx.fillText(drawn[i], pad, textY + i * lineH);
    }
    ctx.restore();
    return canvas;
  }

  function setBirthContext(detail) {
    var btn = document.getElementById('keep-sky');
    if (!btn || btn.dataset.keepMode !== 'birth-hour') return;
    var note = document.getElementById('keep-sky-caption');
    var valid = detail && Number.isFinite(Number(detail.jd)) &&
      /^\d{4}-\d{2}-\d{2}$/.test(String(detail.birthDate || ''));
    birthContext = valid ? {
      jd: Number(detail.jd),
      birthDate: String(detail.birthDate),
      birthTime: detail.birthTime ? String(detail.birthTime) : null,
      timeKnown: detail.timeKnown === true,
      timeAccuracy: detail.timeAccuracy ? String(detail.timeAccuracy) : '',
      place: detail.place ? String(detail.place) : '',
      timezone: detail.timezone ? String(detail.timezone) : ''
    } : null;
    btn.disabled = !birthContext;
    btn.setAttribute('aria-disabled', birthContext ? 'false' : 'true');
    if (note) note.textContent = caption(birthContext);
  }

  function keep() {
    var orr = document.getElementById('orr');
    var btn = document.getElementById('keep-sky');
    if (!orr || typeof orr.captureStill !== 'function') {
      if (btn) btn.textContent = 'Sky not ready';
      return;
    }
    var birthMode = btn && btn.dataset.keepMode === 'birth-hour';
    if (birthMode && !birthContext) {
      if (btn) btn.textContent = 'Cast chart first';
      return;
    }
    // Trigger wire: birth Julian day → existing authored still (no camera rebuild).
    var still = orr.captureStill(birthMode ? {
      mode: 'birth-hour',
      jd: birthContext.jd,
      timeKnown: birthContext.timeKnown
    } : {});
    if (!still || !still.toBlob) {
      if (btn) btn.textContent = 'Could not keep this sky';
      return;
    }
    stampSurfaceA(still, birthMode ? birthContext : null);
    still.toBlob(function (blob) {
      if (!blob) return;
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = filename(birthMode ? birthContext : null);
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
      if (btn) {
        var old = btn.textContent;
        btn.textContent = 'Saved on this device';
        setTimeout(function () { btn.textContent = old; }, 1800);
      }
    }, 'image/png');
  }

  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.getElementById('keep-sky');
    if (!btn) return;
    btn.addEventListener('click', keep);
    if (btn.dataset.keepMode === 'birth-hour') setBirthContext(null);
  });
  document.addEventListener('ap-keep-sky-context', function (event) {
    setBirthContext(event && event.detail);
  });

  window.APKeepSky = {
    filename: filename,
    caption: caption,
    stampSurfaceA: stampSurfaceA,
    SURFACE_A: SURFACE_A
  };
})();
