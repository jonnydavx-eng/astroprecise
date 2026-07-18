/* ═══════════════════════════════════════════════════════════════════════════
 * home-daily.js — Homepage "Daily Sky" tool (#dailyChapter)
 *
 * HONEST daily-engagement tool. Two states, mirroring daily-transit.js loadNatal():
 *  • No saved chart → a Sun-sign PREVIEW, computed from today's REAL VSOP87
 *    transits (SignDaily/HoroscopeEngine — a solar-chart, not a natal reading),
 *    explicitly labelled a preview, with a CTA to cast the full chart.
 *  • Saved chart    → auto-personalised via DailyTransit.mount(#daily-transit-card)
 *    (real transit-to-natal), greeting by name and naming the driving transit.
 *
 * Lazy-boots on scroll (IntersectionObserver) so the hero/orrery paint stays fast.
 * Assumes NO app.js globals (the homepage doesn't load app.js). Reuses
 * window.__loadEphemeris (ap-home-bootstrap.js).
 * ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  // Keep in sync with website/sw.js tip / js/ap-asset-v.js AP_ASSET_V
  var V = (typeof window !== 'undefined' && window.AP_ASSET_V) ? String(window.AP_ASSET_V) : '771';
  var root = document.getElementById('daily-tool-root');
  if (!root) return;

  var SIGNS = [
    ['Aries', '♈', 'fire'], ['Taurus', '♉', 'earth'], ['Gemini', '♊', 'air'],
    ['Cancer', '♋', 'water'], ['Leo', '♌', 'fire'], ['Virgo', '♍', 'earth'],
    ['Libra', '♎', 'air'], ['Scorpio', '♏', 'water'], ['Sagittarius', '♐', 'fire'],
    ['Capricorn', '♑', 'earth'], ['Aquarius', '♒', 'air'], ['Pisces', '♓', 'water']
  ];

  // ── tiny sequential script loader ─────────────────────────────────────────
  var _loaded = {};
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var base = src.split('?')[0];
      if (_loaded[base]) return resolve();
      var already = Array.prototype.some.call(document.scripts, function (s) {
        return s.src && s.src.indexOf(base) !== -1;
      });
      if (already) { _loaded[base] = true; return resolve(); }
      var el = document.createElement('script');
      el.src = src; el.defer = true;
      el.onload = function () { _loaded[base] = true; resolve(); };
      el.onerror = function () { reject(new Error('load fail ' + src)); };
      document.head.appendChild(el);
    });
  }
  function loadSeq(list) {
    return list.reduce(function (p, s) { return p.then(function () { return loadScript(s); }); }, Promise.resolve());
  }

  // ── saved-chart detection (localStorage, no profile.js needed) ────────────
  function savedChartState() {
    try {
      var raw = JSON.parse(localStorage.getItem('ap_charts') || '[]');
      if (Array.isArray(raw) && raw.length) return 'full';
      var pins = JSON.parse(localStorage.getItem('ap_natal_pins') || 'null');
      if (pins && pins.points && pins.points.sun != null) return 'pins';
    } catch (e) {}
    return 'none';
  }
  function savedSunSign() {
    try {
      var pins = JSON.parse(localStorage.getItem('ap_natal_pins') || 'null');
      if (pins && pins.sunSign) return pins.sunSign;
      var raw = JSON.parse(localStorage.getItem('ap_charts') || '[]');
      if (raw && raw.length && raw[0].sunSign) return raw[0].sunSign;
    } catch (e) {}
    return null;
  }

  function todayStamp() {
    var d = new Date();
    return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
  }); }

  // ── scoped styles (self-injecting, tokens only) ───────────────────────────
  function injectCss() {
    if (document.getElementById('home-daily-css')) return;
    var css =
      '.home-daily__signs{display:flex;flex-wrap:wrap;gap:.4rem;justify-content:center;margin:0 auto var(--sp-5);max-width:640px}' +
      '.home-daily__sign{display:inline-flex;align-items:center;gap:.4rem;padding:.42rem .7rem;border:1px solid rgba(168,176,188,.28);border-radius:999px;background:rgba(26,34,48,.5);color:var(--ink,#E8EBF0);font:600 .82rem/1 var(--font-ui,Inter),sans-serif;cursor:pointer;transition:border-color .2s,background .2s,transform .15s}' +
      '.home-daily__sign:hover{border-color:rgba(205,174,106,.7);transform:translateY(-1px)}' +
      '.home-daily__sign[aria-pressed="true"]{border-color:var(--brass-bright,#7EC8E8);background:rgba(168,176,188,.16);box-shadow:0 0 0 1px rgba(205,174,106,.4) inset}' +
      '.home-daily__glyph{font-family:"AstroGlyph",serif;font-variant-emoji:text;font-size:1.05em;line-height:1;color:var(--brass-bright,#7EC8E8)}' +
      '.home-daily__sign--fire .home-daily__glyph{color:#D89A72}.home-daily__sign--earth .home-daily__glyph{color:#9CB27E}' +
      '.home-daily__sign--air .home-daily__glyph{color:#B8C0CC}.home-daily__sign--water .home-daily__glyph{color:#8FB8B6}' +
      '.home-daily__card{max-width:640px;margin:0 auto;background:rgba(18,24,38,.66);border:1px solid rgba(168,176,188,.22);border-radius:16px;padding:clamp(1.2rem,3vw,2rem);text-align:left}' +
      '.home-daily__eyebrow{font:600 .72rem/1.3 var(--font-mono,monospace);letter-spacing:.14em;text-transform:uppercase;color:var(--brass,#A8B0BC);margin:0 0 .5rem}' +
      '.home-daily__title{font:600 1.5rem/1.2 var(--font-serif,serif);color:var(--ink,#E8EBF0);margin:0 0 .35rem}' +
      '.home-daily__overview{color:rgba(236,230,216,.9);line-height:1.65;margin:.4rem 0 1rem}' +
      '.home-daily__transits{list-style:none;margin:0 0 1rem;padding:0;display:flex;flex-direction:column;gap:.45rem}' +
      '.home-daily__transit{display:flex;gap:.55rem;align-items:baseline;font-size:.86rem;color:rgba(236,230,216,.82);line-height:1.5}' +
      '.home-daily__transit b{color:var(--brass-bright,#7EC8E8);font-weight:600;white-space:nowrap}' +
      '.home-daily__gauge{height:8px;border-radius:6px;background:rgba(255,255,255,.08);overflow:hidden;margin:.2rem 0 .3rem}' +
      '.home-daily__gauge span{display:block;height:100%;background:linear-gradient(90deg,var(--brass,#A8B0BC),var(--brass-bright,#7EC8E8))}' +
      '.home-daily__gauge-row{display:flex;justify-content:space-between;font:600 .68rem/1 var(--font-mono,monospace);letter-spacing:.1em;text-transform:uppercase;color:var(--brass,#A8B0BC);margin-bottom:1rem}' +
      '.home-daily__facts{font-size:.76rem;color:rgba(236,230,216,.6);line-height:1.55;margin:.2rem 0 1rem}' +
      '.home-daily__note{font-size:.78rem;color:rgba(236,230,216,.68);line-height:1.55;border-left:2px solid rgba(168,176,188,.4);padding-left:.7rem;margin:0 0 1.1rem}' +
      '.home-daily__cta-row{display:flex;flex-wrap:wrap;gap:.6rem;align-items:center}' +
      '.home-daily__return{font-size:.74rem;color:rgba(236,230,216,.55);margin:1rem 0 0;font-style:italic}' +
      '.home-daily__save-hint{font-size:.76rem;color:rgba(205,174,106,.75);line-height:1.5;margin:.8rem 0 0}' +
      '.home-daily__sky-btn{display:inline-flex;align-items:center;gap:.45em;margin:0 0 1rem;padding:.5rem .9rem;border:1px solid rgba(168,176,188,.4);border-radius:10px;background:rgba(26,34,48,.5);color:var(--brass-bright,#7EC8E8);font:600 .82rem/1 var(--font-ui,Inter),sans-serif;cursor:pointer;transition:border-color .2s,background .2s,transform .15s}' +
      '.home-daily__sky-btn:hover{border-color:var(--brass-vivid,#C8CDD6);background:rgba(168,176,188,.14);transform:translateY(-1px)}' +
      '.home-daily__sky-btn span{color:var(--brass,#A8B0BC)}' +
      '.home-daily__save-view{position:fixed;left:50%;bottom:1.1rem;transform:translateX(-50%);z-index:80;margin:0;background:rgba(18,24,38,.92);box-shadow:0 6px 18px rgba(0,0,0,.45)}' +
      '.home-daily__save-view:hover{transform:translateX(-50%) translateY(-1px)}' +
      '.home-daily__prompt{color:rgba(236,230,216,.7);text-align:center;margin:.2rem 0 0;font-size:.9rem}';
    var st = document.createElement('style');
    st.id = 'home-daily-css';
    st.textContent = css;
    document.head.appendChild(st);
  }

  // ── PREVIEW (no saved chart): Sun-sign transit weather ────────────────────
  function getReading(sign) {
    var today = new Date();
    try {
      if (window.ContentService && ContentService.resolveDailyHoroscope) {
        var pre = ContentService.preloadDaily ? ContentService.preloadDaily(today) : Promise.resolve();
        return Promise.resolve(pre).then(function () {
          return ContentService.resolveDailyHoroscope(sign, today);
        }).catch(function () { return fallback(sign, today); });
      }
      if (window.SignDaily && SignDaily.getDailyHoroscope) return Promise.resolve(SignDaily.getDailyHoroscope(sign, today));
      if (window.HoroscopeEngine && HoroscopeEngine.getDailyHoroscope) return Promise.resolve(HoroscopeEngine.getDailyHoroscope(sign, today));
    } catch (e) {}
    return Promise.resolve(fallback(sign, today));
  }
  function fallback(sign) {
    return { sign: sign, overview: 'Today’s reading is computed from the live sky — open the Daily page for the full transit-based reading.', transits: [], skyFacts: [], moodScore: null };
  }

  function transitLine(t) {
    if (!t) return '';
    if (t.text) {
      // "Moon square your Sun" style prefix if planet/aspect present
      if (t.planet && t.aspect) return '<b>' + esc(t.planet) + ' ' + esc(t.aspect) + '</b> ' + esc(t.text);
      return esc(t.text);
    }
    if (t.planet && t.aspect) return '<b>' + esc(t.planet) + ' ' + esc(t.aspect) + '</b>' + (t.orb != null ? ' <span style="opacity:.6">' + esc(t.orb) + '°</span>' : '');
    return '';
  }

  var BODY_IDS = { sun:1, moon:1, mercury:1, venus:1, mars:1, jupiter:1, saturn:1, uranus:1, neptune:1, pluto:1 };

  function renderReading(sign, r) {
    var mood = (r && typeof r.moodScore === 'number') ? Math.max(0, Math.min(100, r.moodScore)) : null;
    var transits = (r && r.transits ? r.transits : []).slice(0, 3).map(function (t) {
      return '<li class="home-daily__transit">' + transitLine(t) + '</li>';
    }).filter(function (x) { return x.indexOf('<li') === 0 && x.length > 40; });
    var facts = (r && r.skyFacts ? r.skyFacts : []).slice(0, 4).join(' · ');

    // "Show me in the sky" — swings the hero orrery to the strongest transit and
    // draws it on a true-geocentric zodiac ring (focusAspect). The pairing is the
    // transiting planet ↔ the solar-chart Sun point (honest for a Sun-sign preview).
    var top = (r && r.transits && r.transits[0]) ? r.transits[0] : null;
    var skyBody = top && top.planet ? String(top.planet).toLowerCase() : null;
    var skyAspect = top && top.aspect ? String(top.aspect).toLowerCase() : '';
    var skyName = skyBody ? skyBody.charAt(0).toUpperCase() + skyBody.slice(1) : '';
    // Solar-chart "your Sun" point = the sign midpoint (15° of the sign). This is
    // the assumed Sun the daily reading aspects; focusAspect places it as an
    // honest, explicitly-labelled solar-chart tick, not the real Sun.
    var signIdx = -1;
    for (var _si = 0; _si < SIGNS.length; _si++) { if (SIGNS[_si][0] === sign) { signIdx = _si; break; } }
    var bLon = signIdx >= 0 ? (signIdx * 30 + 15) : '';
    var skyBtn = (skyBody && BODY_IDS[skyBody] && skyBody !== 'sun' && bLon !== '')
      ? '<button type="button" class="home-daily__sky-btn" data-sky-planet="' + esc(skyBody) + '" data-sky-aspect="' + esc(skyAspect) + '" data-sky-blon="' + bLon + '">' +
          '<span aria-hidden="true">✦</span> Show ' + esc(skyName) + ' ' + esc(skyAspect) + ' your Sun in the sky' +
        '</button>'
      : '';

    return '' +
      '<div class="home-daily__card" role="group" aria-label="Today’s preview reading for ' + esc(sign) + '">' +
        '<p class="home-daily__eyebrow">' + esc(todayStamp()) + ' · <span class="ap-badge">Preview · solar-chart</span></p>' +
        '<h3 class="home-daily__title">Today’s sky for ' + esc(sign) + '</h3>' +
        (r && r.overview ? '<p class="home-daily__overview">' + esc(r.overview) + '</p>' : '') +
        (transits.length ? '<ul class="home-daily__transits">' + transits.join('') + '</ul>' : '') +
        skyBtn +
        (mood != null ? '<div class="home-daily__gauge-row"><span>Today’s energy</span><span>' + mood + ' / 100</span></div>' +
          '<div class="home-daily__gauge"><span style="width:' + mood + '%"></span></div>' : '') +
        (facts ? '<p class="home-daily__facts">' + esc(facts) + '</p>' : '') +
        '<p class="home-daily__note">This is today’s transit weather for <strong>everyone</strong> born under ' + esc(sign) +
          ' — a real solar-chart reading, not a full natal one. Your own Moon, Rising and houses make your sky different.</p>' +
        '<div class="home-daily__cta-row">' +
          '<a class="btn-press" href="chart.html">See how today lands on <em>your</em> chart &rarr;</a>' +
          '<a class="btn-quiet" href="horoscope.html">All twelve signs</a>' +
        '</div>' +
        '<p class="home-daily__save-hint">Cast your chart once and this card becomes <em>yours</em> — read against your own placements, saved in your browser, no account.</p>' +
        '<p class="home-daily__return" id="daily-return-cue">The sky moves — a new reading is computed for each calendar day. Check back tomorrow.</p>' +
      '</div>';
  }

  function buildPreviewUI(preselect) {
    injectCss();
    var strip = SIGNS.map(function (s) {
      return '<button type="button" class="home-daily__sign home-daily__sign--' + s[2] + '" data-sign="' + s[0] + '" aria-pressed="false">' +
        '<span class="home-daily__glyph" aria-hidden="true">' + s[1] + '</span>' + s[0] + '</button>';
    }).join('');
    root.innerHTML =
      '<div class="home-daily__signs" role="group" aria-label="Choose your sign for today’s reading">' + strip + '</div>' +
      '<div id="daily-reading-slot"><p class="home-daily__prompt">Pick your sign for today’s reading.</p></div>';

    var slot = document.getElementById('daily-reading-slot');
    var btns = root.querySelectorAll('.home-daily__sign');
    function pick(sign) {
      Array.prototype.forEach.call(btns, function (b) { b.setAttribute('aria-pressed', b.dataset.sign === sign ? 'true' : 'false'); });
      try { localStorage.setItem('ap_home_sign', sign); } catch (e) {}
      slot.innerHTML = '<p class="home-daily__prompt">Reading today’s sky…</p>';
      getReading(sign).then(function (r) {
        slot.innerHTML = renderReading(sign, r);
        fillTomorrow(sign);
        var sb = slot.querySelector('.home-daily__sky-btn');
        if (sb) sb.addEventListener('click', function () {
          showInSky(sb.getAttribute('data-sky-planet'), sb.getAttribute('data-sky-aspect'), parseFloat(sb.getAttribute('data-sky-blon')));
        });
      });
    }
    Array.prototype.forEach.call(btns, function (b) {
      b.addEventListener('click', function () { pick(b.dataset.sign); });
    });
    if (preselect) pick(preselect);
  }

  // "Tomorrow:" teaser — names tomorrow's strongest transit for the chosen
  // sign (the engine genuinely computes it, so the tease is honest). Cheapest
  // return-visit cue on the site.
  function fillTomorrow(sign) {
    try {
      var el = document.getElementById('daily-return-cue');
      if (!el || !window.HoroscopeEngine || !HoroscopeEngine.getDailyHoroscope) return;
      var t = new Date(); t.setDate(t.getDate() + 1);
      var r = HoroscopeEngine.getDailyHoroscope(sign, t);
      var top = r && r.transits && r.transits[0];
      if (top && top.planet && top.aspect) {
        // Solar-chart transits aspect the sign's Sun point, so "your Sun" is accurate.
        var p = String(top.planet); p = p.charAt(0).toUpperCase() + p.slice(1);
        el.textContent = 'Tomorrow: ' + p + ' ' + top.aspect + ' your Sun — the reading recomputes at midnight. Check back.';
      }
    } catch (e) {}
  }

  // ── "Show me in the sky" — scroll to the hero, promote the full WebGL
  // orrery, then draw the transit on a true-geocentric zodiac ring via
  // focusAspect. Graceful degrade: while focusAspect is unavailable (engine
  // still loading, or 2D fallback) it focuses the transiting planet so the
  // button is never dead. The honest geometry (angles true, distances
  // schematic) lives in the engine's focusAspect overlay + caption.
  //
  // `extra` (optional) lets the personalised natal card reuse this flow:
  //   { natalMode: 'natal', bLabel: 'your Moon · natal' } — bLon must then be
  //   the saved chart's REAL computed longitude, never a sign midpoint.
  function showInSky(planet, aspect, bLon, extra) {
    if (!planet) return;
    var hero = document.getElementById('heroChapter');
    if (hero) { try { hero.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) { hero.scrollIntoView(); } }
    if (window.__requestFullOrrery) {
      try { window.__requestFullOrrery({ urgent: true, showLoading: false }).catch(function () {}); } catch (e) {}
    }
    var opts = {
      aspect: aspect,
      natalMode: (extra && extra.natalMode) || 'solar',
      bLabel: (extra && extra.bLabel) || 'your Sun · solar chart'
    };
    if (typeof bLon === 'number' && !isNaN(bLon)) opts.bLon = bLon;
    var didFallback = false;
    (function poll(n) {
      var O = window.Orrery3D;
      if (O && typeof O.focusAspect === 'function') {
        var ok = false;
        try { ok = O.focusAspect(planet, 'sun', opts) === true; } catch (e) {}
        if (ok) showSaveViewBtn();
        return;
      }
      if (!didFallback && O && typeof O.focusPlanet === 'function') {
        didFallback = true;
        try { O.focusPlanet(planet); } catch (e) {}
      }
      if (n < 50) setTimeout(function () { poll(n + 1); }, 150);
    })(0);
  }

  // Shared with daily-transit.js (both load on index): the personalised card
  // reuses this exact scroll → promote → focusAspect flow for natal aspects,
  // and ensureCss() gives it the .home-daily__sky-btn styling.
  window.APShowInSky = { show: showInSky, ensureCss: injectCss };

  // ── "Save this view" — while the aspect ring is on screen, offer a one-click
  // PNG export of the engine's frame. The engine draws the honesty caption and
  // aspect label IN-SCENE, so the capture is self-labelling — no extra
  // annotation needed. Feature-detected: skipped entirely on the 2D fallback.
  function removeSaveViewBtn() {
    var b = document.getElementById('ap-save-sky-view');
    if (b) { if (b._apWatch) clearInterval(b._apWatch); b.remove(); }
  }
  function showSaveViewBtn() {
    var O = window.Orrery3D;
    if (!O || O.isWebGL !== true || typeof O.captureFrame !== 'function') return;
    injectCss();
    removeSaveViewBtn();
    var b = document.createElement('button');
    b.type = 'button';
    b.id = 'ap-save-sky-view';
    b.className = 'home-daily__sky-btn home-daily__save-view';
    b.innerHTML = '<span aria-hidden="true">✧</span> Save this view';
    b.addEventListener('click', function () {
      try {
        var cnv = O.captureFrame({ scale: 2 });
        if (!cnv) return;
        var url = cnv.toDataURL('image/png');
        var d = new Date();
        var name = 'astroprecise-sky-' + d.getFullYear() + '-' +
          ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2) + '.png';
        window.__apLastCapture = { bytes: url.length, name: name }; // verification hook
        var a = document.createElement('a');
        a.href = url; a.download = name;
        document.body.appendChild(a); a.click(); a.remove();
      } catch (e) {}
    });
    document.body.appendChild(b);
    // Visible ONLY while the aspect view is active (the engine auto-retires the
    // ring after ~9s, deleting window.__apLastAspect — we track that hook).
    b._apWatch = setInterval(function () {
      if (!window.__apLastAspect) removeSaveViewBtn();
    }, 400);
  }

  // ── PERSONALISED (saved chart): real transit-to-natal card ────────────────
  function buildPersonalisedUI() {
    // daily-transit.js auto-mounts into #daily-transit-card and self-injects CSS.
    root.innerHTML = '<div id="daily-transit-card"></div>';
    return window.__loadEphemeris().then(function () {
      return loadSeq([
        'js/profile.js?v=' + V,
        'js/oracle.js?v=' + V,
        'js/daily-transit.js?v=' + V
      ]);
    }).then(function () {
      try {
        if (window.DailyTransit && DailyTransit.mount) DailyTransit.mount(document.getElementById('daily-transit-card'));
      } catch (e) {}
    });
  }

  // ── boot ──────────────────────────────────────────────────────────────────
  var booted = false;
  function boot() {
    if (booted) return; booted = true;
    var state = savedChartState();
    if (state === 'full' || state === 'pins') {
      buildPersonalisedUI().catch(function () {
        // fall back to preview if the personal path fails to load
        loadPreviewDeps().then(function () { buildPreviewUI(savedSunSign() || getRemembered()); });
      });
    } else {
      loadPreviewDeps().then(function () { buildPreviewUI(savedSunSign() || getRemembered()); });
    }
  }
  function getRemembered() { try { return localStorage.getItem('ap_home_sign'); } catch (e) { return null; } }
  function loadPreviewDeps() {
    return window.__loadEphemeris().then(function () {
      return loadSeq([
        'js/content-service.js?v=' + V,
        'js/ap-zodiac-constants.js?v=' + V,
        'js/horoscope-engine.js?v=' + V,
        'js/sign-daily.js?v=' + V
      ]);
    }).catch(function () { return null; });
  }

  // Live-upgrade: casting a chart on chart.html flips preview → personalised.
  function onChartSaved() {
    if (savedChartState() !== 'none') { booted = false; boot(); }
  }
  window.addEventListener('storage', function (e) {
    if (e && (e.key === 'ap_charts' || e.key === 'ap_natal_pins')) onChartSaved();
  });
  window.addEventListener('ap-chart-saved', onChartSaved);

  // Lazy boot on scroll — with a timed fallback so the tool can never stay
  // blank if the observer callback is starved (seen under heavy WebGL load).
  // boot() is idempotent via the `booted` flag, so belt-and-braces is safe.
  var section = document.getElementById('dailyChapter') || root;
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { io.disconnect(); boot(); } });
    }, { rootMargin: '200px' });
    io.observe(section);
    setTimeout(boot, 8000);
  } else {
    boot();
  }
})();
