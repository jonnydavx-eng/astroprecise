'use strict';

// =============================================================================
// THE LIVING OBSERVATORY — Phase 1: actionable planets ("navigate through the model")
//
// When a planet is focused in the 3D model, surface a small DOM panel that turns
// that body into a navigation launchpad: its live sign·degree + quick actions that
// deep-link the real pages (cast a chart, freeze this sky, today's reading, read
// the sign it's in, shop this sky).
//
// Additive + honest-hybrid: listens to the engine's existing `orrery-planet-focus`
// / `orrery-planet-select` events + `getBodyReadout(id)` — it NEVER touches the
// WebGL engine. Feature-detected; if the engine isn't live the deck + DOM nav are
// unchanged. The panel lives in the plinth band (never over the disc), is keyboard
// reachable, aria-live, and dismissible.
// =============================================================================

(function () {
  var panel, titleEl, subEl, actsEl;
  var lastId = null;

  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

  function readout(id) {
    try {
      if (window.Orrery3D && typeof window.Orrery3D.getBodyReadout === 'function') {
        return window.Orrery3D.getBodyReadout(id);
      }
    } catch (e) {}
    return null;
  }

  // Context-aware actions. `r` = getBodyReadout() → { name, sign, degreeWhole, label }.
  function actionsFor(id, r) {
    var acts = [
      { label: 'Cast a chart', hint: 'your natal wheel', href: 'chart.html' },
      { label: 'Freeze this sky', hint: 'a keepsake moment', href: 'moment.html' },
      { label: 'Today’s reading', hint: 'the daily sky', href: 'horoscope.html' },
    ];
    // The sign this body sits in right now — a real, live deep link.
    if (r && r.sign) {
      acts.push({ label: 'Read ' + r.sign, hint: r.name + ' is here now', href: String(r.sign).toLowerCase() + '.html' });
    } else {
      acts.push({ label: 'The Sky, live', hint: 'the instrument', href: 'ephemeris.html' });
    }
    acts.push({ label: 'Shop this sky', hint: 'poster · reading', href: 'shop.html' });
    return acts;
  }

  function show(id) {
    if (!panel || !id) return;
    lastId = id;
    var r = readout(id);
    var name = (r && r.name) || cap(id);
    titleEl.textContent = name;
    subEl.textContent = r ? (r.sign ? (r.sign + ' · ' + (r.degreeWhole != null ? r.degreeWhole + '°' : '') + (r.retro ? ' ℞' : '')) : (r.label || '')) : '';
    actsEl.textContent = '';
    actionsFor(id, r).forEach(function (a) {
      var link = document.createElement('a');
      link.className = 'ap-pa__act';
      link.href = a.href;
      var l = document.createElement('span'); l.className = 'ap-pa__act-label'; l.textContent = a.label;
      var h = document.createElement('span'); h.className = 'ap-pa__act-hint'; h.textContent = a.hint || '';
      link.appendChild(l); link.appendChild(h);
      actsEl.appendChild(link);
    });
    panel.hidden = false;
    // next frame so the slide-up transition runs
    requestAnimationFrame(function () { panel.classList.add('is-open'); });
  }

  function hide() {
    if (!panel) return;
    panel.classList.remove('is-open');
    lastId = null;
  }

  function build() {
    if (document.getElementById('ap-planet-actions')) return;
    panel = document.createElement('aside');
    panel.id = 'ap-planet-actions';
    panel.className = 'ap-pa';
    panel.hidden = true;
    panel.setAttribute('aria-label', 'Actions for the focused body');
    panel.innerHTML =
      '<div class="ap-pa__head">' +
        '<span class="ap-pa__eyebrow">Through the model</span>' +
        '<span class="ap-pa__title" id="ap-pa-title"></span>' +
        '<span class="ap-pa__sub" id="ap-pa-sub" aria-live="polite"></span>' +
        '<button type="button" class="ap-pa__close" id="ap-pa-close" aria-label="Close">×</button>' +
      '</div>' +
      '<div class="ap-pa__acts" id="ap-pa-acts"></div>';
    document.body.appendChild(panel);
    titleEl = panel.querySelector('#ap-pa-title');
    subEl = panel.querySelector('#ap-pa-sub');
    actsEl = panel.querySelector('#ap-pa-acts');
    panel.querySelector('#ap-pa-close').addEventListener('click', hide);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && panel.classList.contains('is-open')) hide(); });
  }

  function idFrom(e) { return e && e.detail && e.detail.id ? String(e.detail.id).toLowerCase() : null; }

  function wire() {
    build();
    document.addEventListener('orrery-planet-focus', function (e) { var id = idFrom(e); if (id) show(id); else hide(); });
    document.addEventListener('orrery-planet-select', function (e) { var id = idFrom(e); if (id) show(id); else hide(); });
    // The deck's own focus pills should also open the launchpad (belt + braces).
    var pills = document.querySelectorAll('[data-lite-planet]');
    for (var i = 0; i < pills.length; i++) {
      (function (btn) {
        btn.addEventListener('click', function () { show(btn.getAttribute('data-lite-planet')); });
      })(pills[i]);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();
})();
