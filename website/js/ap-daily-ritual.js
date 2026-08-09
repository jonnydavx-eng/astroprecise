/* ============================================================================
 * ap-daily-ritual.js — retention layer for horoscope.html
 *
 * Makes the daily reading feel date-stamped, personal and alive:
 *   1. Stamps #today-date-display with the full local date.
 *   2. If a saved birth chart exists on this device (localStorage.ap_charts /
 *      ap_active_chart), renders a brass-bordered "YOUR SKY TODAY" card above
 *      the sign grid with the single tightest current transit-to-natal contact
 *      (moving Mercury..Saturn x natal Sun..Venus, aspects 0/60/90/120/180,
 *      orb <= 2.5 deg — the same pattern as the homepage transitHit block).
 *      Without a chart, renders a quiet invitation to cast one on the homepage.
 *   3. A return-hook line with the actual Moon travel since yesterday.
 *   4. A "WATCH TODAY'S SKY TURN" pill that spins the zodiac sphere via its
 *      public window.ZodiacSphere.spinToSign API — silently skipped when the
 *      sphere has not lazily loaded (no internal calls, no force-loading).
 *   5. A "KEEP TODAY'S SKY AS A CARD" pill linking to sky-card.html.
 *
 * Loaded deferred AFTER js/ephemeris.js, so window.AstroEphemeris exists.
 * Idempotent: double init does nothing. Never throws on corrupt localStorage.
 * ========================================================================== */
(function () {
  'use strict';
  if (window.__apDailyRitualBooted) return;
  window.__apDailyRitualBooted = true;

  var SIGN_KEYS = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
  var GLYPH = { Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂', Jupiter: '♃', Saturn: '♄' };
  // These strings are printed straight into the card, so they are the reader's
  // words, not the trade's: 60° is "at a helpful angle to", never "SEXTILE".
  var ASPECTS = [[0, 'CONJUNCT'], [60, 'AT A HELPFUL ANGLE TO'], [90, 'SQUARES'], [120, 'TRINES'], [180, 'OPPOSES']];
  var MOVING = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];
  var NATAL = ['Sun', 'Moon', 'Mercury', 'Venus'];
  var ORB = 2.5;

  var MONO = 'var(--font-mono, ui-monospace, monospace)';

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  }

  function lsGet(k) {
    try { return window.localStorage.getItem(k); } catch (e) { return null; }
  }

  function activeChart() {
    try {
      var id = lsGet('ap_active_chart');
      if (!id) return null;
      var list = JSON.parse(lsGet('ap_charts') || '[]');
      if (!Array.isArray(list)) return null;
      for (var i = 0; i < list.length; i++) {
        var c = list[i];
        if (c && c.id === id && c.positions && typeof c.positions === 'object') return c;
      }
      return null;
    } catch (e) { return null; }
  }

  function jdNow(offsetDays) {
    var E = window.AstroEphemeris;
    if (!E) return null;
    var n = new Date();
    return E.julianDay(n.getUTCFullYear(), n.getUTCMonth() + 1, n.getUTCDate(), n.getUTCHours(), n.getUTCMinutes(), 0) + (offsetDays || 0);
  }

  function skyPositions(jd) {
    var E = window.AstroEphemeris;
    if (!E || jd == null) return null;
    try { return E.allPlanetPositions(jd) || null; } catch (e) { return null; }
  }

  function tightestTransit(chart) {
    if (!chart || !chart.positions) return null;
    var P = skyPositions(jdNow(0));
    if (!P) return null;
    var best = null;
    for (var m = 0; m < MOVING.length; m++) {
      var mv = MOVING[m], pl = P[mv];
      if (!pl || typeof pl.lon !== 'number' || !isFinite(pl.lon)) continue;
      for (var n = 0; n < NATAL.length; n++) {
        var nt = NATAL[n], np = chart.positions[nt];
        if (!np || typeof np.lon !== 'number' || !isFinite(np.lon)) continue;
        var sep = Math.abs(((pl.lon - np.lon + 540) % 360) - 180);
        for (var a = 0; a < ASPECTS.length; a++) {
          var orb = Math.abs(sep - ASPECTS[a][0]);
          if (orb <= ORB && (!best || orb < best.orb)) {
            best = { moving: mv, natal: nt, aspect: ASPECTS[a][1], orb: orb };
          }
        }
      }
    }
    return best;
  }

  function moonTravelSinceYesterday() {
    var jd = jdNow(0);
    var a = skyPositions(jd), b = skyPositions(jd == null ? null : jd - 1);
    if (!a || !b || !a.Moon || !b.Moon) return null;
    var d = ((a.Moon.lon - b.Moon.lon + 540) % 360) - 180;
    return isFinite(d) ? Math.abs(d) : null;
  }

  function el(tag, style, text) {
    var n = document.createElement(tag);
    if (style) n.setAttribute('style', style);
    if (text != null) n.textContent = text;
    return n;
  }

  /* ── 1 · date stamp ─────────────────────────────────────────────────────── */
  function stampDate() {
    var elDate = document.getElementById('today-date-display');
    if (!elDate) return;
    try {
      var s = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      elDate.textContent = s.replace(/,/g, '').toUpperCase() + ' · YOUR SKY TODAY';
    } catch (e) { /* keep the server's default text */ }
  }

  /* ── 4 · watch-it affordance ────────────────────────────────────────────── */
  function watchSkyTurn() {
    try {
      if (!window.ZodiacSphere || typeof window.ZodiacSphere.spinToSign !== 'function') return; // skip silently
      var key = null;
      var idx = parseInt(lsGet('ap-horoscope-sign'), 10);
      if (isFinite(idx) && idx >= 0 && idx < 12) key = SIGN_KEYS[idx];
      if (!key) {
        var P = skyPositions(jdNow(0));
        if (P && P.Moon && typeof P.Moon.lon === 'number' && isFinite(P.Moon.lon)) {
          key = SIGN_KEYS[Math.floor((((P.Moon.lon % 360) + 360) % 360) / 30)];
        }
      }
      if (!key) return;
      window.ZodiacSphere.spinToSign(key, { duration: 900 });
    } catch (e) { /* affordance only — never break the page */ }
  }

  /* ── 2/3/5 · personal block + return hook + pills ───────────────────────── */
  function buildBlock() {
    if (document.getElementById('ap-daily-ritual')) return; // idempotent
    var anchor = document.getElementById('sign-picker-primary');
    if (!anchor || !anchor.parentNode) return;

    var wrap = el('section', 'margin:0 0 var(--space-5,2rem);max-width:620px;');
    wrap.id = 'ap-daily-ritual';
    wrap.setAttribute('role', 'region');
    wrap.setAttribute('aria-label', 'Your sky today');

    var chart = activeChart();

    if (chart) {
      /* brass-bordered personal card */
      var card = el('div',
        'border:1px solid rgba(216,180,106,.30);border-radius:14px;' +
        'padding:16px 18px 14px;' +
        'background:linear-gradient(158deg, rgba(242,236,223,.04), rgba(242,236,223,.02));' +
        'box-shadow:inset 0 1px 0 rgba(242,236,223,.06);');
      card.appendChild(el('p',
        'font-family:' + MONO + ';font-size:9.5px;letter-spacing:.22em;' +
        'color:#d8b46a;margin:0 0 8px;text-transform:uppercase;',
        'Your sky today'));

      var hit = tightestTransit(chart);
      var line = el('p',
        'font-family:' + MONO + ';font-size:12px;letter-spacing:.1em;line-height:1.7;' +
        'color:#f2ecdf;margin:0;text-transform:uppercase;');
      if (hit) {
        var g = el('span', 'color:#d8b46a;margin-right:8px;', GLYPH[hit.moving] || '✦');
        line.appendChild(g);
        line.appendChild(document.createTextNode(
          hit.moving.toUpperCase() + ' ' + hit.aspect + ' YOUR ' + hit.natal.toUpperCase() +
          ' — WITHIN ' + hit.orb.toFixed(1) + '°'));
      } else {
        line.textContent = 'A quiet sky on your chart today — no tight transits within 2.5°';
      }
      card.appendChild(line);
      card.appendChild(el('p',
        'font-family:' + MONO + ';font-size:8.5px;letter-spacing:.16em;' +
        'color:rgba(242,236,223,.56);margin:9px 0 0;text-transform:uppercase;',
        'Computed from your saved chart on this device'));
      wrap.appendChild(card);
    } else {
      /* quiet invitation to cast a free chart */
      var invite = el('p',
        'font-size:13.5px;line-height:1.65;color:var(--silver-dim, rgba(242,236,223,.74));' +
        'margin:0 0 var(--space-3,1rem);');
      invite.appendChild(document.createTextNode('Save your free chart on the homepage and this space reads YOUR sky, not just your sign’s '));
      var go = el('a', 'color:#ff7a45;text-decoration:none;', '→');
      go.href = './#cast';
      invite.appendChild(go);
      wrap.appendChild(invite);
    }

    /* 3 · return hook — the actual Moon travel since this time yesterday */
    var delta = moonTravelSinceYesterday();
    var deg = delta == null ? '~13' : '~' + Math.round(delta);
    wrap.appendChild(el('p',
      'font-size:12.5px;line-height:1.65;color:var(--silver-dim, rgba(242,236,223,.74));' +
      'margin:var(--space-3,1rem) 0 0;',
      'The Moon has moved ' + deg + '° since this time yesterday — the sky never repeats. Come back tomorrow.'));

    /* 4 + 5 · pill row */
    var pillStyle =
      'display:inline-block;font-family:' + MONO + ';font-size:9px;letter-spacing:.18em;' +
      'color:#d8b46a;background:transparent;border:1px solid rgba(216,180,106,.45);' +
      'border-radius:100px;padding:8px 16px;cursor:pointer;text-decoration:none;' +
      'text-transform:uppercase;';
    var row = el('div', 'display:flex;gap:10px;flex-wrap:wrap;margin-top:var(--space-3,1rem);');
    var watch = el('button', pillStyle, 'Watch today’s sky turn');
    watch.type = 'button';
    watch.addEventListener('click', watchSkyTurn);
    var keep = el('a', pillStyle, 'Keep today’s sky as a card →');
    keep.href = './sky-card.html';
    row.appendChild(watch);
    row.appendChild(keep);
    wrap.appendChild(row);

    anchor.parentNode.insertBefore(wrap, anchor);
  }

  ready(function () {
    try { stampDate(); } catch (e) {}
    try { buildBlock(); } catch (e) {}
  });
})();
