/**
 * Homepage — interactive zodiac sign card picker + daily reading preview.
 * Depends: sign-daily.js, element-orbs.js, icons.js (AstroElementOrbs / AstroIcons).
 */
(function () {
  'use strict';

  var SIGNS = {
    aries:       { name: 'Aries',       dates: 'Mar 21 – Apr 19', element: 'fire' },
    taurus:      { name: 'Taurus',      dates: 'Apr 20 – May 20', element: 'earth' },
    gemini:      { name: 'Gemini',      dates: 'May 21 – Jun 20', element: 'air' },
    cancer:      { name: 'Cancer',      dates: 'Jun 21 – Jul 22', element: 'water' },
    leo:         { name: 'Leo',         dates: 'Jul 23 – Aug 22', element: 'fire' },
    virgo:       { name: 'Virgo',       dates: 'Aug 23 – Sep 22', element: 'earth' },
    libra:       { name: 'Libra',       dates: 'Sep 23 – Oct 22', element: 'air' },
    scorpio:     { name: 'Scorpio',     dates: 'Oct 23 – Nov 21', element: 'water' },
    sagittarius: { name: 'Sagittarius', dates: 'Nov 22 – Dec 21', element: 'fire' },
    capricorn:   { name: 'Capricorn',   dates: 'Dec 22 – Jan 19', element: 'earth' },
    aquarius:    { name: 'Aquarius',    dates: 'Jan 20 – Feb 18', element: 'air' },
    pisces:      { name: 'Pisces',      dates: 'Feb 19 – Mar 20', element: 'water' },
  };

  var ELEMENT_LABELS = { fire: 'Fire', earth: 'Earth', air: 'Air', water: 'Water' };

  function elementScene(el, opts) {
    if (window.AstroElementOrbs && typeof AstroElementOrbs.scene === 'function') {
      return AstroElementOrbs.scene(el, opts);
    }
    if (window.AstroIcons && typeof AstroIcons.element === 'function') {
      return AstroIcons.element(el, opts);
    }
    return '';
  }

  function getUserSign() {
    try {
      if (window.AstroProfile) {
        var charts = AstroProfile.getCharts();
        if (charts.length) {
          var sun = charts[0].sunSign || (charts[0].positions && charts[0].positions.sun);
          if (sun) return String(sun.sign || sun).toLowerCase();
        }
      }
    } catch (e) {}
    return null;
  }

  function getDaily(signKey) {
    var info = SIGNS[signKey];
    if (!info || !window.Interpretations || typeof Interpretations.getDailyHoroscope !== 'function') return null;
    return Interpretations.getDailyHoroscope(info.name, new Date());
  }

  function wireFilterOrbs(filters) {
    filters.forEach(function (btn) {
      var slot = btn.querySelector('.home-sign-filter__orb');
      var key = btn.dataset.filter || 'all';
      if (slot) slot.innerHTML = elementScene(key, { sm: true });
    });
  }

  function wireCardElementOrbs(cards) {
    cards.forEach(function (card) {
      var el = card.dataset.element;
      if (!el || card.querySelector('.home-sign-card__el-orb')) return;
      var span = document.createElement('span');
      span.className = 'home-sign-card__el-orb';
      span.setAttribute('aria-hidden', 'true');
      span.innerHTML = elementScene(el, { sm: true, static: true });
      card.appendChild(span);
    });
  }

  function setPickerAmbience(section, filterKey) {
    if (!section) return;
    if (!filterKey || filterKey === 'all') {
      section.setAttribute('data-active-element', 'all');
    } else {
      section.setAttribute('data-active-element', filterKey);
    }
  }

  function init() {
    var section = document.getElementById('home-sign-picker');
    var grid = document.getElementById('home-sign-grid');
    var preview = document.getElementById('home-sign-preview');
    if (!grid) return;

    var cards = grid.querySelectorAll('.home-sign-card');
    var filters = document.querySelectorAll('.home-sign-filter');
    var activeKey = null;

    wireFilterOrbs(filters);
    wireCardElementOrbs(cards);
    setPickerAmbience(section, 'all');

    function setActive(signKey) {
      activeKey = signKey;
      cards.forEach(function (card) {
        var on = card.dataset.sign === signKey;
        card.classList.toggle('is-active', on);
        card.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      try { sessionStorage.setItem('ap_home_sign', signKey); } catch (e) {}

      if (!preview || !signKey || !SIGNS[signKey]) {
        if (preview) preview.hidden = true;
        return;
      }

      var info = SIGNS[signKey];
      var data = getDaily(signKey) || {};

      var thumb = document.getElementById('hsp-thumb');
      var nameEl = document.getElementById('hsp-name');
      var dateEl = document.getElementById('hsp-date');
      var elEl = document.getElementById('hsp-element');
      var overview = document.getElementById('hsp-overview');
      var fullLink = document.getElementById('hsp-full');
      var guideLink = document.getElementById('hsp-guide');

      if (thumb) {
        thumb.src = 'assets/images/zodiac-cards/' + signKey + '.jpg';
        thumb.alt = info.name + ' zodiac card';
      }
      if (nameEl) nameEl.textContent = info.name;
      if (dateEl) {
        dateEl.textContent = info.dates + ' · ' + new Date().toLocaleDateString(undefined, {
          day: 'numeric', month: 'long', year: 'numeric',
        });
      }
      if (elEl) {
        elEl.innerHTML = elementScene(info.element, { sm: true })
          + '<span class="home-sign-preview__element-label">' + (ELEMENT_LABELS[info.element] || '') + '</span>';
      }
      if (overview) overview.textContent = data.overview || 'Select a sign to read today\'s sky.';
      if (fullLink) fullLink.href = 'horoscope.html?sign=' + signKey;
      if (guideLink) guideLink.href = signKey + '.html';

      preview.hidden = false;
      preview.dataset.element = info.element;
    }

    function applyFilter(element) {
      var key = element || 'all';
      cards.forEach(function (card, i) {
        var show = key === 'all' || card.dataset.element === key;
        card.classList.toggle('is-filtered-out', !show);
        card.setAttribute('aria-hidden', show ? 'false' : 'true');
        if (show) card.style.animationDelay = (i * 35) + 'ms';
      });
      filters.forEach(function (btn) {
        var on = btn.dataset.filter === key;
        btn.classList.toggle('is-active', on);
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      setPickerAmbience(section, key);
      grid.classList.remove('is-filtering');
      void grid.offsetWidth;
      grid.classList.add('is-filtering');
      window.setTimeout(function () { grid.classList.remove('is-filtering'); }, 480);
    }

    cards.forEach(function (card) {
      card.addEventListener('click', function () {
        var key = card.dataset.sign;
        if (!key) return;
        if (card.classList.contains('is-active')) {
          window.location.href = 'horoscope.html?sign=' + key;
          return;
        }
        setActive(key);
        if (preview) {
          preview.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });
    });

    filters.forEach(function (btn) {
      btn.addEventListener('click', function () {
        applyFilter(btn.dataset.filter || 'all');
      });
    });

    var userSign = getUserSign();
    if (userSign && SIGNS[userSign]) {
      var userCard = grid.querySelector('[data-sign="' + userSign + '"]');
      if (userCard && !userCard.querySelector('.home-sign-card__badge')) {
        var badge = document.createElement('span');
        badge.className = 'home-sign-card__badge';
        badge.textContent = 'Your sign';
        userCard.appendChild(badge);
      }
    }

    var initial = null;
    try {
      var params = new URLSearchParams(window.location.search);
      if (params.get('sign') && SIGNS[params.get('sign')]) initial = params.get('sign');
    } catch (e) {}
    if (!initial) {
      try { initial = sessionStorage.getItem('ap_home_sign'); } catch (e) {}
    }
    if (!initial || !SIGNS[initial]) initial = userSign;
    if (initial && SIGNS[initial]) setActive(initial);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();