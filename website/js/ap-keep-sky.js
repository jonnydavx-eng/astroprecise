/* Keep this sky — one local PNG. No account or product gate. */
(function () {
  'use strict';

  var birthContext = null;

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
      return 'Authored whole-system camera · ' + date + ' · ' + accuracy +
        context.birthTime + ' local' + zone + ' · ' + place +
        (utc ? ' · computed at ' + utc : '') + ' · Earth marked as home.';
    }
    var referenceZone = context.timezone ? ' (' + context.timezone + ')' : '';
    var referenceUtc = utcMinute(context.jd);
    return 'Authored whole-system camera · ' + date + ' · ' + place +
      ' · birth time unknown. Positions use a 12:00 local date reference' + referenceZone +
      (referenceUtc ? ', computed at ' + referenceUtc : '') +
      '; no precise Earth-facing hemisphere is claimed. Earth is marked as home.';
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
    var still = orr.captureStill(birthMode ? {
      mode: 'birth-hour',
      jd: birthContext.jd,
      timeKnown: birthContext.timeKnown
    } : {});
    if (!still || !still.toBlob) {
      if (btn) btn.textContent = 'Could not keep this sky';
      return;
    }
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
    caption: caption
  };
})();
