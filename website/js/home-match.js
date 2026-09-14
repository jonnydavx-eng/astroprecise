/* ═══════════════════════════════════════════════════════════════════════════
 * home-match.js — Homepage "Couples" tool (#matchChapter)
 *
 * HONEST two-sign taste that funnels to the real synastry calculator.
 *  • Quick sketch: pick two signs → the ELEMENT pattern between them, computed
 *    locally from a small element-narrative table. Explicitly labelled a
 *    Sun-sign SKETCH — NOT synastry, and with NO percentage. (The full engine
 *    is 424KB, so we do NOT load it just for a sketch.)
 *  • Upgrade: a CTA to the real two-chart synastry on compatibility.html, which
 *    measures the actual aspects between two whole charts. If the visitor has a
 *    saved chart, Person A is handed over in same-tab sessionStorage; the URL
 *    remains clean and storage failure simply means no prefill.
 *
 * Lazy-boots on scroll. No app.js globals (the homepage doesn't load app.js).
 * ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var root = document.getElementById('match-tool-root');
  if (!root) return;

  var SIGNS = [
    ['Aries', '♈', 'fire'], ['Taurus', '♉', 'earth'], ['Gemini', '♊', 'air'],
    ['Cancer', '♋', 'water'], ['Leo', '♌', 'fire'], ['Virgo', '♍', 'earth'],
    ['Libra', '♎', 'air'], ['Scorpio', '♏', 'water'], ['Sagittarius', '♐', 'fire'],
    ['Capricorn', '♑', 'earth'], ['Aquarius', '♒', 'air'], ['Pisces', '♓', 'water']
  ];
  var ELEM = {}; var GLYPH = {};
  SIGNS.forEach(function (s) { ELEM[s[0]] = s[2]; GLYPH[s[0]] = s[1]; });

  // Element-pair narratives (symmetric). Sign-level, honest — NOT aspect synastry.
  var NARR = {
    fire_fire: 'Two fire signs — passionate and mutually inspiring, as long as neither competes for the spotlight.',
    earth_earth: 'Two earth signs — steady, loyal, and built to last through quiet consistency.',
    air_air: 'Two air signs — endlessly conversational and idea-rich; staying grounded is the shared work.',
    water_water: 'Two water signs — deep, intuitive attunement that runs beneath the surface.',
    fire_air: 'Fire and air — a natural spark; you fan each other’s flames and keep the energy alive.',
    earth_water: 'Earth and water — natural nourishment; steady ground meets emotional depth.',
    fire_earth: 'Fire and earth — spark meets substance; learning each other’s pace is the key.',
    fire_water: 'Fire and water — passionate but different by nature; attraction and friction both run high.',
    air_water: 'Air and water — thought meets feeling; each offers what the other sometimes lacks.',
    earth_air: 'Earth and air — practical meets conceptual; respect the different orientations and you build well.'
  };
  function narrative(a, b) {
    var e1 = ELEM[a], e2 = ELEM[b];
    return NARR[e1 + '_' + e2] || NARR[e2 + '_' + e1] || 'A unique blend of complementary gifts and growth-inducing differences.';
  }
  function tone(a, b) {
    var e1 = ELEM[a], e2 = ELEM[b];
    if (e1 === e2) return { label: 'Kindred Element', cls: 'harmony' };
    if ((e1 === 'fire' && e2 === 'air') || (e1 === 'air' && e2 === 'fire') ||
        (e1 === 'earth' && e2 === 'water') || (e1 === 'water' && e2 === 'earth')) {
      return { label: 'Easy Flow', cls: 'harmony' };
    }
    return { label: 'Different Tempos', cls: 'neutral' };
  }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
  }); }

  function savedChart() {
    try {
      var raw = JSON.parse(localStorage.getItem('ap_charts') || '[]');
      if (Array.isArray(raw) && raw.length) return raw[0];
    } catch (e) {}
    return null;
  }
  function savedSunSign() {
    var c = savedChart();
    if (c && c.sunSign) return c.sunSign;
    try { var p = JSON.parse(localStorage.getItem('ap_natal_pins') || 'null'); if (p && p.sunSign) return p.sunSign; } catch (e) {}
    return null;
  }
  // Same-tab handoff to the full calculator. A birth date/time/place must never
  // be serialized into a URL, browser history, referrer or pasted link.
  function fullSynastryHref() {
    var c = savedChart();
    if (c && /^\d{4}-\d{2}-\d{2}$/.test(String(c.birthDate || ''))) {
      try {
        sessionStorage.setItem('ap-compat-pair', JSON.stringify({
          version: 1,
          a: {
            date: String(c.birthDate),
            time: /^\d{1,2}:\d{2}$/.test(String(c.birthTime || '')) ? String(c.birthTime) : '',
            name: String(c.name || '').slice(0, 80),
            tz: String(c.tz || '').slice(0, 80),
            city: String(c.birthCity || c.city || '').slice(0, 120)
          },
          b: null
        }));
      } catch (e) {
        // Privacy fails closed when storage is blocked: open a blank comparison.
      }
    }
    return 'compatibility.html';
  }

  function injectCss() {
    if (document.getElementById('home-match-css')) return;
    var css =
      '.home-match__picks{display:flex;flex-wrap:wrap;gap:1rem;justify-content:center;align-items:flex-end;margin:0 auto var(--sp-5);max-width:560px}' +
      '.home-match__field{display:flex;flex-direction:column;gap:.35rem;min-width:180px;flex:1}' +
      '.home-match__field label{font:600 .68rem/1 var(--font-mono,monospace);letter-spacing:.14em;text-transform:uppercase;color:var(--ap-ion,#8BA9FF)}' +
      '.home-match__field select{appearance:none;-webkit-appearance:none;background:rgba(16,29,48,.76);color:var(--ap-paper,#EEF4FA);border:1px solid rgba(139,169,255,.34);border-radius:10px;padding:.6rem .8rem;font:500 .95rem/1 var(--font-ui,Inter),sans-serif;cursor:pointer}' +
      '.home-match__field select:focus{outline:2px solid rgba(165,188,255,.68);outline-offset:1px}' +
      '.home-match__amp{font-family:var(--font-serif,serif);color:var(--ap-violet,#A897FF);font-size:1.4rem;padding-bottom:.5rem}' +
      '.home-match__card{max-width:560px;margin:0 auto;background:rgba(16,29,48,.76);border:1px solid rgba(139,169,255,.24);border-radius:16px;padding:clamp(1.2rem,3vw,1.9rem);text-align:center}' +
      '.home-match__orbs{display:flex;align-items:center;justify-content:center;gap:1rem;margin-bottom:.7rem}' +
      '.home-match__orb{font-family:"AstroGlyph",serif;font-variant-emoji:text;font-size:1.9rem;line-height:1;width:56px;height:56px;display:inline-flex;align-items:center;justify-content:center;border-radius:50%;border:1px solid rgba(139,169,255,.46)}' +
      '.home-match__orb--fire{color:var(--ap-danger,#FF8EA8)}.home-match__orb--earth{color:var(--ap-proof,#6FD0B3)}.home-match__orb--air{color:var(--ap-paper-bright,#C9D6E3)}.home-match__orb--water{color:var(--ap-cyan,#79C7F2)}' +
      '.home-match__tone{display:inline-block;font:600 .72rem/1 var(--font-mono,monospace);letter-spacing:.12em;text-transform:uppercase;padding:.32rem .7rem;border-radius:999px;margin-bottom:.6rem}' +
      '.home-match__tone--harmony{color:var(--ap-proof,#6FD0B3);background:rgba(111,208,179,.14);border:1px solid rgba(111,208,179,.38)}' +
      '.home-match__tone--neutral{color:var(--ap-violet,#A897FF);background:rgba(168,151,255,.13);border:1px solid rgba(168,151,255,.38)}' +
      '.home-match__title{font:600 1.35rem/1.2 var(--font-serif,serif);color:var(--ap-paper,#EEF4FA);margin:.1rem 0 .5rem}' +
      '.home-match__narr{color:rgba(201,214,227,.94);line-height:1.65;margin:0 auto 1rem;max-width:44ch}' +
      '.home-match__note{font-size:.78rem;color:rgba(147,168,191,.86);line-height:1.55;border-top:1px solid rgba(139,169,255,.2);padding-top:.8rem;margin:0 0 1.1rem}' +
      '.home-match__cta-row{display:flex;flex-wrap:wrap;gap:.6rem;justify-content:center}' +
      '.home-match__prompt{text-align:center;color:rgba(147,168,191,.9);font-size:.9rem;margin:.4rem 0 0}';
    var st = document.createElement('style'); st.id = 'home-match-css'; st.textContent = css;
    document.head.appendChild(st);
  }

  function options(selected) {
    return '<option value="" disabled' + (selected ? '' : ' selected') + '>Choose a sign…</option>' +
      SIGNS.map(function (s) {
        return '<option value="' + s[0] + '"' + (s[0] === selected ? ' selected' : '') + '>' + s[0] + '</option>';
      }).join('');
  }

  function renderSketch(a, b, slot) {
    var t = tone(a, b);
    slot.innerHTML =
      '<div class="home-match__card" role="group" aria-label="Sun-sign sketch for ' + esc(a) + ' and ' + esc(b) + '">' +
        '<div class="home-match__orbs">' +
          '<span class="home-match__orb home-match__orb--' + ELEM[a] + '" aria-hidden="true">' + GLYPH[a] + '</span>' +
          '<span class="home-match__orb home-match__orb--' + ELEM[b] + '" aria-hidden="true">' + GLYPH[b] + '</span>' +
        '</div>' +
        '<span class="home-match__tone home-match__tone--' + t.cls + '">' + t.label + '</span>' +
        '<h3 class="home-match__title">' + esc(a) + ' &amp; ' + esc(b) + '</h3>' +
        '<p class="home-match__narr">' + narrative(a, b) + '</p>' +
        '<p class="home-match__note">A <strong>Sun-sign sketch</strong> — the general element pattern between two signs, with no compatibility percentage (there isn’t an honest one to give). Real compatibility is the measured aspects between two whole birth charts.</p>' +
        '<div class="home-match__cta-row">' +
          '<a class="btn-press" href="' + fullSynastryHref() + '">See the real synastry between two full charts &rarr;</a>' +
        '</div>' +
      '</div>';
  }

  var booted = false;
  function boot() {
    if (booted) return; booted = true;
    injectCss();
    var mine = savedSunSign();
    root.innerHTML =
      '<div class="home-match__picks">' +
        '<div class="home-match__field"><label for="hm-a">You</label><select id="hm-a">' + options(mine) + '</select></div>' +
        '<span class="home-match__amp" aria-hidden="true">&amp;</span>' +
        '<div class="home-match__field"><label for="hm-b">Them</label><select id="hm-b">' + options(null) + '</select></div>' +
      '</div>' +
      '<div id="match-sketch-slot"><p class="home-match__prompt">Pick two signs for a quick element sketch.</p></div>';

    var selA = document.getElementById('hm-a');
    var selB = document.getElementById('hm-b');
    var slot = document.getElementById('match-sketch-slot');
    function update() {
      if (selA.value && selB.value) renderSketch(selA.value, selB.value, slot);
    }
    selA.addEventListener('change', update);
    selB.addEventListener('change', update);
    update();
  }

  // Lazy boot with a timed fallback (boot() is idempotent via `booted`) so the
  // tool can never stay blank if the observer callback is starved.
  var section = document.getElementById('matchChapter') || root;
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { io.disconnect(); boot(); } });
    }, { rootMargin: '200px' });
    io.observe(section);
    setTimeout(boot, 10000);
  } else {
    boot();
  }
})();
