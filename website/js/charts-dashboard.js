/**
 * AstroPrecise — Saved Charts Dashboard ("My Charts")
 * ----------------------------------------------------------------------------
 * Renders every chart saved via window.AstroProfile (localStorage `ap_charts`)
 * as a glass card showing name, birth date + place and the Big Three (Sun /
 * Moon / Rising) using AstroIcons sign orbs. Per-card actions: View, Rename,
 * Delete, and "Set as today's chart".
 *
 * HONESTY + DETERMINISM (website/CLAUDE.md): this page never fabricates chart
 * data — it only reads/writes what AstroProfile already stores. The Big Three
 * shown come straight from the saved record (re-derivable via
 * AstroProfile.buildChartData from the stored birth data).
 *
 * Requires: profile.js (window.AstroProfile), icons.js (window.AstroIcons).
 * Optional: app.js (window.AstroApp.showToast) for nicer toasts.
 * ==========================================================================*/
(function () {
  'use strict';

  if (!document.getElementById('charts-dashboard')) return;

  var ACTIVE_KEY = 'ap_active_chart';

  var P = window.AstroProfile || null;
  var I = window.AstroIcons || null;

  // ── small helpers ─────────────────────────────────────────────────────────

  function $(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
    });
  }

  function toast(title, message, type) {
    if (window.AstroApp && typeof window.AstroApp.showToast === 'function') {
      window.AstroApp.showToast(title, message, type || 'info');
    }
  }

  // localStorage active-chart id (read by the daily-transit reading).
  function getActiveId() {
    try { return localStorage.getItem(ACTIVE_KEY) || null; } catch (e) { return null; }
  }
  function setActiveId(id) {
    try { localStorage.setItem(ACTIVE_KEY, id); return true; } catch (e) { return false; }
  }
  function clearActiveIfMatches(id) {
    try { if (localStorage.getItem(ACTIVE_KEY) === id) localStorage.removeItem(ACTIVE_KEY); } catch (e) {}
  }

  // ── chart data access ──────────────────────────────────────────────────────

  function getCharts() {
    if (P && typeof P.getCharts === 'function') {
      try { return P.getCharts() || []; } catch (e) { return []; }
    }
    return [];
  }

  // A chart row stores city under `birthCity` (chart.html save path) but older
  // rows / the migrate code reference `city` too — accept either.
  function placeOf(c) { return c.birthCity || c.city || ''; }

  function signOrb(sign, opts) {
    if (I && typeof I.sign === 'function' && sign) return I.sign(sign, opts);
    return '<span class="ap-orb ap-orb--art ap-orb--air' + (opts && opts.sm ? ' ap-orb--sm' : '') +
      '" aria-hidden="true"><img class="ap-orb__img" src="assets/images/seals/elements/all.svg" alt="" loading="lazy" decoding="async" width="96" height="112" /></span>';
  }

  // ── date / place formatting ────────────────────────────────────────────────

  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  function fmtBirthDate(iso) {
    if (!iso) return 'Date unknown';
    var parts = String(iso).split('-');
    if (parts.length !== 3) return esc(iso);
    var y = +parts[0], m = +parts[1], d = +parts[2];
    if (!isFinite(y) || !isFinite(m) || !isFinite(d) || m < 1 || m > 12) return esc(iso);
    return MONTHS[m - 1] + ' ' + d + ', ' + y;
  }

  function fmtBirthLine(c) {
    var line = fmtBirthDate(c.birthDate);
    if (c.birthTime) line += ' · ' + esc(c.birthTime);
    else line += ' · time unknown';
    var place = placeOf(c);
    if (place) line += ' · ' + esc(place);
    return line;
  }

  // ── View action — build a chart.html link from stored birth data ───────────
  // chart.html restoreFromURL() reads: n, d, t, c, lat, lon, tz (NOT an id).
  function viewUrl(c) {
    var q = new URLSearchParams();
    q.set('n', c.name || 'Saved Chart');
    q.set('d', c.birthDate || '');
    q.set('t', c.birthTime || '');
    q.set('c', placeOf(c));
    if (c.lat != null && c.lat !== '') q.set('lat', c.lat);
    if (c.lon != null && c.lon !== '') q.set('lon', c.lon);
    if (c.tz) q.set('tz', c.tz);
    return 'chart.html?' + q.toString();
  }

  // ── card rendering ─────────────────────────────────────────────────────────

  function bigThreeCell(label, sign) {
    return '' +
      '<div class="mc-big3__cell">' +
        '<span class="mc-big3__orb">' + signOrb(sign, { sm: true }) + '</span>' +
        '<span class="mc-big3__meta">' +
          '<span class="mc-big3__label">' + label + '</span>' +
          '<span class="mc-big3__sign">' + (sign ? esc(sign) : '—') + '</span>' +
        '</span>' +
      '</div>';
  }

  function cardHtml(c, isActive) {
    var initial = (c.name && c.name.trim()) ? c.name.trim().charAt(0).toUpperCase() : '★';
    var activeBadge = isActive
      ? '<span class="mc-card__active" title="Used for your daily transit reading">Today’s chart</span>'
      : '';
    return '' +
      '<article class="glass-card mc-card' + (isActive ? ' mc-card--active' : '') + '" data-id="' + esc(c.id) + '">' +
        '<header class="mc-card__head">' +
          '<span class="mc-card__avatar" aria-hidden="true">' + esc(initial) + '</span>' +
          '<div class="mc-card__id">' +
            '<h3 class="mc-card__name">' + esc(c.name || 'Untitled Chart') + '</h3>' +
            '<p class="mc-card__birth">' + fmtBirthLine(c) + '</p>' +
          '</div>' +
          activeBadge +
        '</header>' +

        '<div class="mc-big3" role="group" aria-label="Big Three">' +
          bigThreeCell('Sun', c.sunSign) +
          bigThreeCell('Moon', c.moonSign) +
          bigThreeCell('Rising', c.risingSign) +
        '</div>' +

        '<div class="mc-card__actions">' +
          '<a class="btn btn--gold btn--sm" href="' + esc(viewUrl(c)) + '">View</a>' +
          '<button type="button" class="btn btn--outline btn--sm" data-act="rename">Rename</button>' +
          '<button type="button" class="btn btn--ghost btn--sm" data-act="active"' +
            (isActive ? ' disabled aria-disabled="true"' : '') + '>' +
            (isActive ? 'Active today' : 'Set as today’s') +
          '</button>' +
          '<button type="button" class="btn btn--danger btn--sm" data-act="delete">Delete</button>' +
        '</div>' +
      '</article>';
  }

  // GENUINE empty state — only rendered once we've actually read storage and
  // found no saved charts. Copy states the truth ("No saved charts yet"); it is
  // never shown as a loading placeholder. Two real, working CTAs.
  function emptyHtml() {
    return '' +
      '<div class="app-empty-state" data-mc-state="empty">' +
        '<span class="app-empty-state__seal eng-star-mark" aria-hidden="true"></span>' +
        '<h2 class="app-empty-state__title">No saved charts yet</h2>' +
        '<p class="app-empty-state__sub">Cast your first birth chart to start your collection. ' +
          'Saved charts power your daily transit reading and let you revisit any chart in one tap.</p>' +
        '<div class="app-empty-state__actions">' +
          '<a class="btn btn--primary btn--lg" href="chart.html">Cast your first chart</a>' +
          '<a class="btn btn--outline btn--lg" href="horoscope.html">Read today’s horoscope</a>' +
        '</div>' +
      '</div>';
  }

  // ── header stat (count) ─────────────────────────────────────────────────────

  function renderStat(charts) {
    var el = $('charts-stat');
    if (!el) return;
    var n = charts.length;
    if (!n) { el.textContent = ''; el.hidden = true; return; }
    el.hidden = false;
    el.innerHTML = '<span class="mc-stat__num">' + n + '</span> ' +
      (n === 1 ? 'chart saved' : 'charts saved');
  }

  // ── render loop ─────────────────────────────────────────────────────────────

  function render() {
    var grid = $('charts-grid');
    if (!grid) return;

    // We have now finished reading storage — the transient LOADING state is over.
    grid.setAttribute('aria-busy', 'false');

    if (!P) {
      grid.classList.remove('mc-grid--cards');
      grid.innerHTML = '' +
        '<div class="app-empty-state" data-mc-state="unavailable">' +
          '<span class="app-empty-state__seal eng-star-mark" aria-hidden="true"></span>' +
          '<h2 class="app-empty-state__title">Storage unavailable</h2>' +
          '<p class="app-empty-state__sub">Your saved charts could not be read in this browser — ' +
            'private storage may be disabled. You can still cast a new chart.</p>' +
          '<div class="app-empty-state__actions">' +
            '<a class="btn btn--primary btn--lg" href="chart.html">Go to the Chart calculator</a>' +
          '</div>' +
        '</div>';
      renderStat([]);
      return;
    }

    var charts = getCharts();
    renderStat(charts);

    // Genuinely EMPTY — storage read OK, but no charts saved. Truthful copy.
    if (!charts.length) {
      grid.classList.remove('mc-grid--cards');
      grid.innerHTML = emptyHtml();
      return;
    }

    var activeId = getActiveId();
    grid.classList.add('mc-grid--cards');
    grid.innerHTML = charts.map(function (c) {
      return cardHtml(c, !!activeId && c.id === activeId);
    }).join('');
  }

  // ── actions ─────────────────────────────────────────────────────────────────

  function findCard(target) {
    var el = target;
    while (el && el !== document && !(el.classList && el.classList.contains('mc-card'))) el = el.parentNode;
    return (el && el.classList && el.classList.contains('mc-card')) ? el : null;
  }

  function doRename(id) {
    var c = (typeof P.getChart === 'function') ? P.getChart(id) : null;
    if (!c) return;
    var next = window.prompt('Rename this chart:', c.name || '');
    if (next == null) return;            // cancelled
    next = next.trim();
    if (!next || next === c.name) return;
    // saveChart merges by id (profile.js): pass id + new name to update in place.
    try {
      P.saveChart({ id: id, name: next });
      toast('Renamed', 'Chart is now “' + next + '”.', 'success');
    } catch (e) {
      toast('Rename failed', 'Could not save the new name.', 'error');
    }
    render();
  }

  function doDelete(id) {
    var c = (typeof P.getChart === 'function') ? P.getChart(id) : null;
    var label = (c && c.name) ? '“' + c.name + '”' : 'this chart';
    if (!window.confirm('Delete ' + label + '? This cannot be undone.')) return;
    try {
      if (typeof P.deleteChart === 'function') P.deleteChart(id);
      clearActiveIfMatches(id);
      toast('Deleted', 'The chart has been removed.', 'success');
    } catch (e) {
      toast('Delete failed', 'Could not remove the chart.', 'error');
    }
    render();
  }

  function doSetActive(id) {
    var c = (typeof P.getChart === 'function') ? P.getChart(id) : null;
    if (!setActiveId(id)) {
      toast('Could not set', 'Storage is unavailable in this browser.', 'error');
      return;
    }
    toast('Today’s chart set',
      ((c && c.name) ? c.name + ' is ' : 'This chart is ') + 'now your daily reading.', 'success');
    render();
  }

  function onClick(ev) {
    var btn = ev.target.closest ? ev.target.closest('[data-act]') : null;
    if (!btn) return;
    var card = findCard(btn);
    if (!card) return;
    var id = card.getAttribute('data-id');
    if (!id) return;
    var act = btn.getAttribute('data-act');
    if (act === 'rename') doRename(id);
    else if (act === 'delete') doDelete(id);
    else if (act === 'active') doSetActive(id);
  }

  // ── init ─────────────────────────────────────────────────────────────────────

  function init() {
    var grid = $('charts-grid');
    if (grid) grid.addEventListener('click', onClick);
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.ChartsDashboard = {
    render: render,
    getActiveId: getActiveId,
    setActiveId: setActiveId,
    ACTIVE_KEY: ACTIVE_KEY,
  };
})();
