/**
 * AstroPrecise — Saturn Return finder
 * Free: computes the exact date(s) of your 1st/2nd/3rd Saturn return from the
 * real sky (transiting Saturn back to its natal ecliptic longitude — genuine
 * VSOP87, no fakery). Paid (dormant until AP_MON.saturnReturnUrl is set):
 * the full personalised reading + an instant printable PDF keepsake.
 *
 * Depends on window.AstroEphemeris. Self-contained reading text (no 424KB
 * interpretations.js dependency). Honesty: dates are exact astronomy; the
 * reading is reflective interpretation, never prediction.
 */
(function () {
  'use strict';

  var SAT_PERIOD = 29.4571;            // mean years between Saturn returns
  var SIGN_GLYPHS = {
    Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋',
    Leo: '♌', Virgo: '♍', Libra: '♎', Scorpio: '♏',
    Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓'
  };

  // What the return asks you to build maturity in, per natal Saturn sign.
  var SATURN_IN_SIGN = {
    Aries: 'With Saturn in Aries, the return matures your relationship with <strong>courage and selfhood</strong>. The lesson is to lead from earned confidence rather than raw impulse — to learn that real initiative means finishing what you start, and that patience is a kind of bravery.',
    Taurus: 'With Saturn in Taurus, the return tests your sense of <strong>security and self-worth</strong>. You are asked to build something solid and lasting from the ground up — to stop measuring your value by what you have, and start rooting it in what you can reliably do.',
    Gemini: 'With Saturn in Gemini, the return matures your <strong>voice and your mind</strong>. The pull is to stop scattering across a hundred curiosities and commit to a real depth of knowledge — to say fewer, truer things, and to be believed.',
    Cancer: 'With Saturn in Cancer, the return reworks your sense of <strong>home and emotional security</strong>. You are learning to become your own source of safety — to build a foundation, set a boundary around your inner life, and stop waiting to be looked after.',
    Leo: 'With Saturn in Leo, the return matures your <strong>creative authority</strong>. Recognition stops arriving for charm alone; it now has to be earned through disciplined craft. The reward is a confidence that no longer needs the applause to stay lit.',
    Virgo: 'With Saturn in Virgo, the return tempers your drive toward <strong>mastery and usefulness</strong>. The lesson is to turn skill into genuine competence, to choose the work that matters over the work that merely keeps you busy, and to forgive the imperfection in it.',
    Libra: 'With Saturn in Libra (Saturn is exalted here), the return matures <strong>relationship and commitment</strong>. You learn what real partnership costs — its compromises, its fairness, its weight — and which bonds are built to carry it.',
    Scorpio: 'With Saturn in Scorpio, the return forces a reckoning with <strong>power, intimacy and what you have buried</strong>. The work is to face the truth you have avoided and rebuild on it — to trade control for genuine depth.',
    Sagittarius: 'With Saturn in Sagittarius, the return grounds your <strong>beliefs and your sense of meaning</strong>. Loose ideals are asked to become a lived philosophy — something you actually stand on, not just something you say.',
    Capricorn: 'With Saturn in Capricorn — its own sign — this is the most defining of returns. It matures your relationship with <strong>ambition, structure and authority</strong> itself. The task is unambiguous: to stop seeking permission and become your own authority.',
    Aquarius: 'With Saturn in Aquarius, the return matures your <strong>vision and your place in the collective</strong>. Independence has to become contribution — the lesson is to build something real for a world larger than yourself.',
    Pisces: 'With Saturn in Pisces, the return teaches you where to <strong>hold and where to dissolve</strong>. You are learning to give a dream a structure it can survive in, and to set the boundaries that protect your compassion from becoming escape.'
  };

  var PHASES = [
    ['The Approach', 'In the months before the first exact pass, the cracks begin to show. Whatever was built on sand — a role, a relationship, a story about yourself — starts to wobble. This is review, not punishment: Saturn is asking what is actually load-bearing.'],
    ['The Reckoning', 'Across the exact passes, the decisive work happens. Commitments are made or released; the structure of your life is tested against the truth. If Saturn retrogrades back over the point, the lesson is revisited until it is genuinely learned — not a setback, a second reading.'],
    ['The Consolidation', 'As Saturn moves on, the reward of honest work arrives: a steadier, more self-authored life. What you kept, you now actually own. What you let go of stops costing you. You step into the next chapter built on rock instead of hope.']
  ];

  // ── astronomy ──────────────────────────────────────────────────────────────
  function eph() { return window.AstroEphemeris; }
  function angDiff(a, b) { var d = a - b; while (d > 180) d -= 360; while (d < -180) d += 360; return d; }
  function jdToDate(jd) { return new Date((jd - 2440587.5) * 86400000); }
  function satLonAt(jd) { return eph().planetLongitude('saturn', jd); }
  var DFMT = function (dt) {
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(dt);
  };

  // all exact natal-longitude crossings within ±halfDays of a centre JD (1 or 3)
  function crossingsNear(centerJd, L0, halfDays) {
    var lo = centerJd - halfDays, hi = centerJd + halfDays, step = 6, hits = [];
    var prevJd = lo, prevD = angDiff(satLonAt(lo), L0);
    for (var jd = lo + step; jd <= hi; jd += step) {
      var d = angDiff(satLonAt(jd), L0);
      var pd = prevD === 0 ? 1e-6 : prevD;
      if (Math.sign(d) !== Math.sign(pd) && Math.abs(d) < 30 && Math.abs(pd) < 30) {
        var a = prevJd, b = jd, da = pd;
        for (var i = 0; i < 60; i++) {
          var m = (a + b) / 2, dm = angDiff(satLonAt(m), L0);
          if (Math.sign(dm) === Math.sign(da)) { a = m; da = dm; } else { b = m; }
        }
        hits.push((a + b) / 2);
      }
      prevJd = jd; prevD = d;
    }
    return hits;
  }

  function computeReturns(by, bm, bd, bhh, bmm) {
    var E = eph(); if (!E) return null;
    var jd0 = E.julianDay(by, bm, bd, bhh || 0, bmm || 0, 0);
    var L0 = satLonAt(jd0);
    var out = [];
    for (var n = 1; n <= 3; n++) {
      var center = jd0 + n * SAT_PERIOD * 365.25;
      var hits = crossingsNear(center, L0, 380);
      if (!hits.length) hits = [center];
      var peak = hits[Math.floor(hits.length / 2)];
      out.push({
        n: n,
        exactJds: hits,
        exactDates: hits.map(jdToDate),
        peakJd: peak,
        peakDate: jdToDate(peak),
        ageAtPeak: Math.round((peak - jd0) / 365.25),
        passes: hits.length
      });
    }
    return { jd0: jd0, natalLon: L0, natalSign: E.signOf(L0), natalDeg: E.degreeInSign(L0), returns: out };
  }

  function nowJd() { return 2440587.5 + Date.now() / 86400000; }
  function relevantIndex(data) {
    var nj = nowJd();
    for (var i = 0; i < data.returns.length; i++) {
      var r = data.returns[i];
      if (r.exactJds[r.exactJds.length - 1] >= nj - 45) return i; // ongoing / upcoming
    }
    return data.returns.length - 1; // all past
  }

  // ── formatting ──────────────────────────────────────────────────────────────
  function degStr(deg) {
    var d = Math.floor(deg), m = Math.round((deg - d) * 60);
    if (m === 60) { m = 0; d += 1; }
    return d + '°' + String(m).padStart(2, '0') + '′';
  }
  var ORD = ['', 'First', 'Second', 'Third'];
  function passesLine(r) {
    if (r.passes === 1) return 'one exact pass on <strong>' + DFMT(r.exactDates[0]) + '</strong>';
    return r.passes + ' exact passes (Saturn retrogrades back over the point): <strong>' +
      r.exactDates.map(DFMT).join('</strong>, <strong>') + '</strong>';
  }

  // ── reading (HTML body, shared by on-page + PDF) ─────────────────────────────
  function readingBody(data, idx, name) {
    var r = data.returns[idx];
    var sign = data.natalSign;
    var lesson = SATURN_IN_SIGN[sign] || '';
    var window_ = r.exactDates.length > 1
      ? DFMT(r.exactDates[0]) + ' – ' + DFMT(r.exactDates[r.exactDates.length - 1])
      : DFMT(r.exactDates[0]);
    var who = name ? (name + ', your') : 'Your';
    var html = '';
    html += '<p class="sat-lead">' + who + ' <strong>' + ORD[r.n] + ' Saturn Return</strong> centres on <strong>' +
      DFMT(r.peakDate) + '</strong>, around age <strong>' + r.ageAtPeak + '</strong>. ' +
      'Natal Saturn sits at ' + (SIGN_GLYPHS[sign] || '') + ' <strong>' + sign + ' ' + degStr(data.natalDeg) +
      '</strong> — the place the planet now returns to for the first time since you were born.</p>';
    html += '<div class="sat-orn"><span>WHAT IT MATURES</span></div>';
    html += '<p>' + lesson + '</p>';
    html += '<div class="sat-orn"><span>THE THREE PHASES</span></div>';
    html += '<p>This return is not a single day but a passage of roughly nine to fourteen months — here, <strong>' +
      window_ + '</strong> (' + passesLine(r) + ').</p>';
    PHASES.forEach(function (p) {
      html += '<p><strong>' + p[0] + '.</strong> ' + p[1] + '</p>';
    });
    html += '<div class="sat-orn"><span>YOUR THREE RETURNS</span></div>';
    html += '<ul class="sat-list">' + data.returns.map(function (x) {
      var cur = x.n === r.n ? ' <em>(this one)</em>' : '';
      return '<li><strong>' + ORD[x.n] + '</strong> &middot; age ~' + x.ageAtPeak + cur + ' &middot; ' +
        x.exactDates.map(DFMT).join(', ') + '</li>';
    }).join('') + '</ul>';
    html += '<p class="sat-note">The dates above are exact astronomy, computed from the real sky for your birth moment. ' +
      'The reading is a reflective interpretation of a well-known astrological passage — a lens for the period, not a prediction.</p>';
    return html;
  }

  // ── premium PDF (self-contained doc opened in a new tab to print/save) ───────
  function pdfDoc(data, idx, name) {
    var r = data.returns[idx];
    var title = (name ? name + ' — ' : '') + ORD[r.n] + ' Saturn Return';
    var css =
      '@page{size:A4;margin:0}' +
      'body{margin:0;background:#0D0A07;color:#E8E0D0;font-family:"Cormorant Garamond",Georgia,serif;}' +
      '.page{position:relative;width:210mm;min-height:296mm;box-sizing:border-box;padding:26mm 24mm;background:#0D0A07;}' +
      '.page::before{content:"";position:absolute;inset:8mm;border:1px solid rgba(201,162,39,.42);pointer-events:none}' +
      '.page::after{content:"";position:absolute;inset:9.4mm;border:1px solid rgba(201,162,39,.15);pointer-events:none}' +
      '.seal{text-align:center;color:#C9A227;font-size:20pt;margin:0 0 6pt}' +
      '.eyebrow{text-align:center;font-family:"Cinzel",serif;font-size:8pt;letter-spacing:.42em;text-transform:uppercase;color:#A89E88;margin:0 0 14pt}' +
      'h1{font-family:"Cinzel",serif;font-size:26pt;line-height:1.12;text-align:center;color:#EFE3C0;margin:0 0 4pt;font-weight:700}' +
      '.glyph{text-align:center;font-size:30pt;color:#C9A227;margin:6pt 0 2pt}' +
      'p{font-size:11.5pt;line-height:1.62;margin:0 0 9pt}' +
      '.sat-lead{font-size:12.5pt}' +
      '.sat-lead::first-letter,p.dropcap::first-letter{font-family:"Cinzel",serif;font-size:32pt;line-height:.78;float:left;padding:3pt 7pt 0 0;color:#E8C872}' +
      'strong{color:#EFE3C0;font-weight:600}em{color:#C9A227}' +
      '.sat-orn{display:flex;align-items:center;gap:10pt;color:#C9A227;margin:15pt 0}' +
      '.sat-orn::before,.sat-orn::after{content:"";flex:1;height:1px;background:linear-gradient(90deg,transparent,rgba(201,162,39,.5),transparent)}' +
      '.sat-orn span{font-size:8.5pt;letter-spacing:.34em}' +
      '.sat-list{list-style:none;padding:0;margin:6pt 0}.sat-list li{font-size:10.5pt;padding:4pt 0;border-bottom:1px solid rgba(201,162,39,.14)}' +
      '.sat-note{font-size:9pt;color:#A89E88;font-style:italic;margin-top:14pt}' +
      '.foot{position:absolute;left:24mm;right:24mm;bottom:12mm;display:flex;justify-content:space-between;font-family:"Cinzel",serif;font-size:7pt;letter-spacing:.2em;text-transform:uppercase;color:#8C8678}';
    var body = readingBody(data, idx, name).replace('class="sat-lead"', 'class="sat-lead dropcap"');
    return '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
      '<title>' + title + '</title>' +
      '<link rel="stylesheet" href="css/fonts.css">' +
      '<style>' + css + '</style></head><body><div class="page">' +
      '<div class="seal"><span class="eng-star-mark" style="color:var(--gold);width:1.2em;height:1.2em;"></span></div>' +
      '<p class="eyebrow">AstroPrecise · The Saturn Return</p>' +
      '<h1>The Return of<br>Saturn</h1>' +
      '<div class="glyph">♄</div>' +
      body +
      '<div class="foot"><span>AstroPrecise</span><span>Computed from the real sky</span></div>' +
      '</div></body></html>';
  }

  function openPdf(data, idx, name) {
    var w = window.open('', '_blank');
    if (!w) {
      if (window.AstroApp && AstroApp.showToast) AstroApp.showToast('Pop-up blocked', 'Allow pop-ups, then tap Download again.', 'warning');
      return;
    }
    w.document.open();
    w.document.write(pdfDoc(data, idx, name));
    w.document.close();
    var go = function () { try { w.focus(); w.print(); } catch (e) {} };
    // give the page a beat to load the font + lay out before printing
    if (w.document.readyState === 'complete') setTimeout(go, 400);
    else w.onload = function () { setTimeout(go, 400); };
  }

  // ── page controller ──────────────────────────────────────────────────────────
  function init() {
    var form = document.getElementById('sat-form');
    if (!form) return;
    var out = document.getElementById('sat-result');
    var datesEl = document.getElementById('sat-dates');
    var readingEl = document.getElementById('sat-reading');
    var errEl = document.getElementById('sat-error');

    function fail(msg) { if (errEl) { errEl.textContent = msg; errEl.style.display = 'block'; } }

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (errEl) errEl.style.display = 'none';
      var date = document.getElementById('sat-date').value;
      var time = (document.getElementById('sat-time').value) || '12:00';
      var name = (document.getElementById('sat-name').value || '').trim().slice(0, 40);
      if (!date) { fail('Please enter your birth date.'); return; }
      if (!window.AstroEphemeris) { fail('The astronomy engine is still loading — try again in a moment.'); return; }
      var dp = date.split('-').map(Number), tp = time.split(':').map(Number);
      var y = dp[0], m = dp[1], d = dp[2], hh = tp[0], mm = tp[1];
      if (![y, m, d, hh, mm].every(isFinite)) { fail('That birth date or time looks malformed.'); return; }

      var data;
      try { data = computeReturns(y, m, d, hh, mm); } catch (e) { data = null; }
      if (!data) { fail('Could not compute the return. Please check your birth date and try again.'); return; }

      var idx = relevantIndex(data);
      out.classList.add('is-shown');

      // FREE: natal Saturn + the three return dates (the finder)
      datesEl.innerHTML =
        '<p class="sat-natal">Natal Saturn at ' + (SIGN_GLYPHS[data.natalSign] || '') + ' <strong>' +
          data.natalSign + ' ' + degStr(data.natalDeg) + '</strong></p>' +
        '<div class="sat-cards">' + data.returns.map(function (r) {
          var cur = r.n === idx + 1 ? ' sat-card--now' : '';
          return '<div class="sat-card' + cur + '">' +
            '<p class="sat-card__n">' + ORD[r.n] + ' Return</p>' +
            '<p class="sat-card__date">' + DFMT(r.peakDate) + '</p>' +
            '<p class="sat-card__age">around age ' + r.ageAtPeak + (r.passes > 1 ? ' · ' + r.passes + ' passes' : '') + '</p>' +
            (r.n === idx + 1 ? '<span class="sat-card__tag">your current return</span>' : '') +
            '</div>';
        }).join('') + '</div>';

      // PAID: the reading + PDF (dormant => free; gated => 49p button; unlocked => shown)
      renderReading(data, idx, name, readingEl);
      out.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function renderReading(data, idx, name, el) {
    var AP = window.AP_MON || {};
    var url = AP.saturnReturnUrl || '';
    var price = AP.saturnReturnPrice || '£0.49';
    var unlocked = false;
    try {
      if (new URLSearchParams(location.search).get('unlocked') === '1') localStorage.setItem('ap_saturn_unlocked', '1');
      unlocked = localStorage.getItem('ap_saturn_unlocked') === '1';
    } catch (e) {}
    var gated = !!url && !unlocked;

    if (gated) {
      el.innerHTML =
        '<div class="sat-unlock glass-card engraved">' +
          '<p class="sat-unlock__eyebrow">The full reading</p>' +
          '<p class="sat-unlock__teaser">Your dates are above, free. Unlock the complete personalised Saturn Return reading — what it matures, the three phases, and a printable keepsake PDF.</p>' +
          '<button class="btn btn--primary" id="sat-unlock-btn">Unlock the reading + PDF — ' + price + '</button>' +
          '<p class="sat-unlock__note">A one-time ' + price + '. Unlocks on this device. Your birth details never leave your browser.</p>' +
        '</div>';
      var b = document.getElementById('sat-unlock-btn');
      if (b) b.addEventListener('click', function () { window.open(url, '_blank', 'noopener'); });
      return;
    }

    // dormant (no URL) OR unlocked → show the reading + PDF
    el.innerHTML =
      '<div class="sat-reading glass-card engraved">' +
        '<h2 class="sat-reading__title">Your Saturn Return Reading</h2>' +
        readingBody(data, idx, name) +
        '<div class="sat-reading__actions">' +
          '<button class="btn btn--primary" id="sat-pdf-btn">Download your reading (PDF)</button>' +
          '<a class="btn btn--secondary" href="chart.html">Cast your full chart →</a>' +
        '</div>' +
      '</div>';
    var pb = document.getElementById('sat-pdf-btn');
    if (pb) pb.addEventListener('click', function () { openPdf(data, idx, name); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
