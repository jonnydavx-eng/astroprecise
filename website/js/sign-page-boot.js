/**
 * Astro Precise sign landing pages — lightweight boot (content-service + sign-daily only).
 * Replaces inline daily-reading IIFE and heavy ephemeris/cosmos stack on sign pages.
 */
(function () {
  'use strict';

  function pageSign() {
    var fromBody = document.body && document.body.getAttribute('data-sign');
    if (fromBody) return fromBody;
    var slug = (location.pathname || '').split('/').pop().replace(/\.html$/i, '').toLowerCase();
    if (window.AP_ZODIAC && typeof AP_ZODIAC.signByKey === 'function') {
      var sign = AP_ZODIAC.signByKey(slug);
      if (sign) return sign.name;
    }
    return 'Aries';
  }

  function paint(d) {
    var el = document.getElementById('today-reading');
    if (!el || !d) return;
    el.innerHTML =
      '<div class="card" style="padding:var(--space-8);">' +
      '<p class="daily-reading__overview">' + d.overview + '</p>' +
      '<div class="daily-reading__grid">' +
      '<div class="daily-reading__tile"><span class="daily-reading__tile-label">Love</span><p class="daily-reading__tile-text">' + d.love + '</p></div>' +
      '<div class="daily-reading__tile"><span class="daily-reading__tile-label">Career</span><p class="daily-reading__tile-text">' + d.career + '</p></div>' +
      '<div class="daily-reading__tile"><span class="daily-reading__tile-label">Wellness</span><p class="daily-reading__tile-text">' + d.health + '</p></div>' +
      '</div>' +
      '<div class="daily-reading__meta">' +
      '<span>Lucky Number <strong>' + d.luckyNumber + '</strong></span>' +
      '<span>Lucky Color <strong>' + d.luckyColor + '</strong></span>' +
      '</div>' +
      '<p class="daily-reading__note">Deterministic for this date — refresh tomorrow for a new reading</p>' +
      '</div>';
    el.classList.remove('is-loading');
  }

  function resolveDaily(sign, date) {
    if (window.ContentService && typeof ContentService.resolveDailyHoroscope === 'function') {
      return ContentService.resolveDailyHoroscope(sign, date);
    }
    if (window.SignDaily && typeof SignDaily.getDailyHoroscope === 'function') {
      return SignDaily.getDailyHoroscope(sign, date);
    }
    if (window.Interpretations && typeof Interpretations.getDailyHoroscope === 'function') {
      return Interpretations.getDailyHoroscope(sign, date);
    }
    return null;
  }

  function render() {
    var sign = pageSign();
    var dateEl = document.getElementById('today-date');
    if (dateEl) {
      dateEl.textContent = new Date().toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      });
    }

    var ready = window.ContentService || window.SignDaily ||
      (window.Interpretations && Interpretations.getDailyHoroscope);
    if (!ready) {
      window.setTimeout(render, 200);
      return;
    }

    var run = function () {
      paint(resolveDaily(sign, new Date()));
    };

    if (window.ContentService && typeof ContentService.ensureDaily === 'function') {
      ContentService.ensureDaily(new Date()).then(run).catch(run);
    } else {
      run();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();