/**
 * AstroPrecise — Shop free chart wallpaper lead magnet (rung 0).
 * Email → list.astroprecise.app via AstroApp.captureEmail (AP_MON.emailUrl).
 * Wallpaper PNG is generated on chart.html only (no heavy engine on shop).
 * Birth date, if given, stays in localStorage — never posted to the list.
 */
(function () {
  'use strict';

  var CHARTS_KEY = 'ap_charts';
  var DATE_HINT_KEY = 'ap_shop_wallpaper_date';
  var UNLOCK_KEY = 'ap_wallpaper_unlock';

  function isEmail(e) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e || '');
  }

  function hasSavedChart() {
    try {
      if (window.AstroProfile && typeof AstroProfile.getCharts === 'function') {
        var list = AstroProfile.getCharts();
        return !!(list && list.length);
      }
      var raw = localStorage.getItem(CHARTS_KEY);
      if (!raw) return false;
      var charts = JSON.parse(raw);
      return Array.isArray(charts) && charts.length > 0;
    } catch (e) {
      return false;
    }
  }

  function confirmMsg(res, chartReady) {
    var copy = window.AP_COPY || {};
    if (chartReady) {
      return res.sent === 'provider'
        ? '<strong>You\u2019re on the list.</strong> <a href="chart.html#wallpaper-lead">Download your wallpaper now</a> \u2014 no checkout.'
        : '<strong>Noted.</strong> <a href="chart.html#wallpaper-lead">Download your wallpaper</a> on the Chart page.';
    }
    return res.sent === 'provider'
      ? '<strong>You\u2019re on the list.</strong> Open the Chart page to cast your sky and download your wallpaper.'
      : '<strong>Noted.</strong> ' + (copy.dormantSaved || 'Saved on this device. Open Chart to generate your free wallpaper.');
  }

  function revealReadyBanner() {
    var ready = document.getElementById('shop-wallpaper-ready');
    if (ready && hasSavedChart()) ready.hidden = false;
  }

  function init() {
    var form = document.getElementById('shop-wallpaper-form');
    if (!form || form._apWired) return;
    form._apWired = true;

    revealReadyBanner();

    var doneEl = document.getElementById('shop-wallpaper-done');
    var dateInput = form.birthDate;

    try {
      var hint = localStorage.getItem(DATE_HINT_KEY);
      if (hint && dateInput && !dateInput.value) dateInput.value = hint;
    } catch (e) {}

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var email = (form.email && form.email.value || '').trim();
      var birthDate = (dateInput && dateInput.value || '').trim();

      if (!isEmail(email)) {
        if (window.AstroApp) AstroApp.showToast('Check your email', 'That address looks off.', 'warning');
        else form.email && form.email.focus();
        return;
      }

      var res = { sent: 'local' };
      if (window.AstroApp && typeof AstroApp.captureEmail === 'function') {
        res = AstroApp.captureEmail(email, {
          source: 'shop_wallpaper_lead',
          tag: 'tag_shop_wallpaper_rung0',
          meta: { hasBirthDate: !!birthDate },
        });
      }

      if (birthDate) {
        try { localStorage.setItem(DATE_HINT_KEY, birthDate); } catch (e) {}
      }

      try { localStorage.setItem(UNLOCK_KEY, email); } catch (e) {}

      var chartReady = hasSavedChart();
      if (doneEl) {
        doneEl.hidden = false;
        doneEl.innerHTML = confirmMsg(res, chartReady);
      }
      form.classList.add('is-done');

      if (window.AstroApp) {
        AstroApp.showToast(
          'You\u2019re on the list',
          chartReady ? 'Tap through to download your wallpaper.' : 'Open Chart to cast your sky and download.',
          'success'
        );
      }

      if (!chartReady) {
        setTimeout(function () {
          location.href = 'chart.html';
        }, birthDate ? 900 : 1400);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();