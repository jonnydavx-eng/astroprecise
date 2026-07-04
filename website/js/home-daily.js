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

  var V = '620';
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
      '.home-daily__sign{display:inline-flex;align-items:center;gap:.4rem;padding:.42rem .7rem;border:1px solid rgba(194,160,94,.28);border-radius:999px;background:rgba(26,34,48,.5);color:var(--ink,#ECE6D8);font:600 .82rem/1 var(--font-ui,Inter),sans-serif;cursor:pointer;transition:border-color .2s,background .2s,transform .15s}' +
      '.home-daily__sign:hover{border-color:rgba(205,174,106,.7);transform:translateY(-1px)}' +
      '.home-daily__sign[aria-pressed="true"]{border-color:var(--brass-bright,#CDAE6A);background:rgba(194,160,94,.16);box-shadow:0 0 0 1px rgba(205,174,106,.4) inset}' +
      '.home-daily__glyph{font-family:"AstroGlyph",serif;font-variant-emoji:text;font-size:1.05em;line-height:1;color:var(--brass-bright,#CDAE6A)}' +
      '.home-daily__sign--fire .home-daily__glyph{color:#D89A72}.home-daily__sign--earth .home-daily__glyph{color:#9CB27E}' +
      '.home-daily__sign--air .home-daily__glyph{color:#B8C0CC}.home-daily__sign--water .home-daily__glyph{color:#8FB8B6}' +
      '.home-daily__card{max-width:640px;margin:0 auto;background:rgba(18,24,38,.66);border:1px solid rgba(194,160,94,.22);border-radius:16px;padding:clamp(1.2rem,3vw,2rem);text-align:left}' +
      '.home-daily__eyebrow{font:600 .72rem/1.3 var(--font-mono,monospace);letter-spacing:.14em;text-transform:uppercase;color:var(--brass,#C2A05E);margin:0 0 .5rem}' +
      '.home-daily__title{font:600 1.5rem/1.2 var(--font-serif,serif);color:var(--ink,#ECE6D8);margin:0 0 .35rem}' +
      '.home-daily__overview{color:rgba(236,230,216,.9);line-height:1.65;margin:.4rem 0 1rem}' +
      '.home-daily__transits{list-style:none;margin:0 0 1rem;padding:0;display:flex;flex-direction:column;gap:.45rem}' +
      '.home-daily__transit{display:flex;gap:.55rem;align-items:baseline;font-size:.86rem;color:rgba(236,230,216,.82);line-height:1.5}' +
      '.home-daily__transit b{color:var(--brass-bright,#CDAE6A);font-weight:600;white-space:nowrap}' +
      '.home-daily__gauge{height:8px;border-radius:6px;background:rgba(255,255,255,.08);overflow:hidden;margin:.2rem 0 .3rem}' +
      '.home-daily__gauge span{display:block;height:100%;background:linear-gradient(90deg,var(--brass,#C2A05E),var(--brass-bright,#CDAE6A))}' +
      '.home-daily__gauge-row{display:flex;justify-content:space-between;font:600 .68rem/1 var(--font-mono,monospace);letter-spacing:.1em;text-transform:uppercase;color:var(--brass,#C2A05E);margin-bottom:1rem}' +
      '.home-daily__facts{font-size:.76rem;color:rgba(236,230,216,.6);line-height:1.55;margin:.2rem 0 1rem}' +
      '.home-daily__note{font-size:.78rem;color:rgba(236,230,216,.68);line-height:1.55;border-left:2px solid rgba(194,160,94,.4);padding-left:.7rem;margin:0 0 1.1rem}' +
      '.home-daily__cta-row{display:flex;flex-wrap:wrap;gap:.6rem;align-items:center}' +
      '.home-daily__return{font-size:.74rem;color:rgba(236,230,216,.55);margin:1rem 0 0;font-style:italic}' +
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

  function renderReading(sign, r) {
    var mood = (r && typeof r.moodScore === 'number') ? Math.max(0, Math.min(100, r.moodScore)) : null;
    var transits = (r && r.transits ? r.transits : []).slice(0, 3).map(function (t) {
      return '<li class="home-daily__transit">' + transitLine(t) + '</li>';
    }).filter(function (x) { return x.indexOf('<li') === 0 && x.length > 40; });
    var facts = (r && r.skyFacts ? r.skyFacts : []).slice(0, 4).join(' · ');

    return '' +
      '<div class="home-daily__card" role="group" aria-label="Today’s preview reading for ' + esc(sign) + '">' +
        '<p class="home-daily__eyebrow">' + esc(todayStamp()) + ' · <span class="ap-badge">Preview · solar-chart</span></p>' +
        '<h3 class="home-daily__title">Today’s sky for ' + esc(sign) + '</h3>' +
        (r && r.overview ? '<p class="home-daily__overview">' + esc(r.overview) + '</p>' : '') +
        (transits.length ? '<ul class="home-daily__transits">' + transits.join('') + '</ul>' : '') +
        (mood != null ? '<div class="home-daily__gauge-row"><span>Today’s energy</span><span>' + mood + ' / 100</span></div>' +
          '<div class="home-daily__gauge"><span style="width:' + mood + '%"></span></div>' : '') +
        (facts ? '<p class="home-daily__facts">' + esc(facts) + '</p>' : '') +
        '<p class="home-daily__note">This is today’s transit weather for <strong>everyone</strong> born under ' + esc(sign) +
          ' — a real solar-chart reading, not a full natal one. Your own Moon, Rising and houses make your sky different.</p>' +
        '<div class="home-daily__cta-row">' +
          '<a class="btn-press" href="chart.html">See how today lands on <em>your</em> chart &rarr;</a>' +
          '<a class="btn-quiet" href="horoscope.html">All twelve signs</a>' +
        '</div>' +
        '<p class="home-daily__return">The sky moves — a new reading is computed for each calendar day. Check back tomorrow.</p>' +
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
      getReading(sign).then(function (r) { slot.innerHTML = renderReading(sign, r); });
    }
    Array.prototype.forEach.call(btns, function (b) {
      b.addEventListener('click', function () { pick(b.dataset.sign); });
    });
    if (preselect) pick(preselect);
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

  // Lazy boot on scroll.
  var section = document.getElementById('dailyChapter') || root;
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { io.disconnect(); boot(); } });
    }, { rootMargin: '200px' });
    io.observe(section);
  } else {
    boot();
  }
})();
