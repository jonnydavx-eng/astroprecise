/**
 * Astro Precise — engraved hex celestial seals (hand-drawn commissioned style).
 * Replaces glossy circular orbs with observatory instrument plates.
 */
(function () {
  'use strict';

  var PATHS = {
    zodiac: 'assets/images/seals/zodiac/',
    planet: 'assets/images/seals/planets/',
    instrument: 'assets/images/seals/instruments/',
    element: 'assets/images/seals/elements/',
  };

  var Z = window.AP_ZODIAC;
  var SIGN_NAMES = (Z && Z.SIGN_NAMES_BY_KEY) || {
    aries: 'Aries', taurus: 'Taurus', gemini: 'Gemini', cancer: 'Cancer',
    leo: 'Leo', virgo: 'Virgo', libra: 'Libra', scorpio: 'Scorpio',
    sagittarius: 'Sagittarius', capricorn: 'Capricorn', aquarius: 'Aquarius', pisces: 'Pisces',
  };

  var SIGN_ELEMENT = (Z && Z.SIGN_ELEMENT) || {
    Aries: 'fire', Leo: 'fire', Sagittarius: 'fire',
    Taurus: 'earth', Virgo: 'earth', Capricorn: 'earth',
    Gemini: 'air', Libra: 'air', Aquarius: 'air',
    Cancer: 'water', Scorpio: 'water', Pisces: 'water',
  };

  function sizeClass(opts) {
    opts = opts || {};
    if (opts.xl) return ' ap-seal--xl';
    if (opts.lg) return ' ap-seal--lg';
    if (opts.sm) return ' ap-seal--sm';
    return ' ap-seal--md';
  }

  function sealHtml(kind, slug, label, opts) {
    opts = opts || {};
    var base = PATHS[kind] || PATHS.planet;
    var cls = 'ap-seal ap-seal--' + kind + ' ap-seal--' + slug + sizeClass(opts);
    if (opts.class) cls += ' ' + opts.class;
    if (opts.live) cls += ' ap-seal--live';
    var title = opts.label || label || slug;
    var hidden = opts.hidden || opts['aria-hidden'];
    var a11y = hidden
      ? ' aria-hidden="true"'
      : ' role="img" aria-label="' + String(title).replace(/"/g, '&quot;') + '"';
    var alt = hidden ? '' : String(title).replace(/"/g, '&quot;');
    var loading = opts.eager ? 'eager' : 'lazy';
    return '<span class="' + cls + '"' + a11y + '>'
      + '<span class="ap-seal__plate">'
      + '<img class="ap-seal__art" src="' + base + slug + '.svg" alt="' + alt + '"'
      + ' width="96" height="112" loading="' + loading + '" decoding="async" />'
      + '</span></span>';
  }

  function zodiac(sign, opts) {
    var slug = (Z && Z.glyphKey(sign)) || String(sign || '').toLowerCase();
    if (!SIGN_NAMES[slug]) slug = 'aries';
    return sealHtml('zodiac', slug, SIGN_NAMES[slug] + ' zodiac', opts);
  }

  function planet(name, opts) {
    var slug = String(name || 'sun').toLowerCase();
    var label = slug.charAt(0).toUpperCase() + slug.slice(1);
    return sealHtml('planet', slug, label + ' planet', opts);
  }

  function instrument(id, opts) {
    var slug = String(id || 'chart').toLowerCase();
    return sealHtml('instrument', slug, slug + ' instrument', opts);
  }

  function bindSlots() {
    document.querySelectorAll('[data-celestial-seal]').forEach(function (el) {
      if (el.querySelector('.ap-seal')) return;
      var raw = el.getAttribute('data-celestial-seal');
      if (!raw) return;
      var parts = raw.split(':');
      var kind = parts[0] || 'instrument';
      var slug = parts[1] || 'chart';
      var fn = kind === 'zodiac' ? zodiac : kind === 'planet' ? planet : instrument;
      el.innerHTML = fn(slug, {
        sm: el.hasAttribute('data-seal-sm'),
        lg: el.hasAttribute('data-seal-lg'),
        hidden: el.getAttribute('aria-hidden') === 'true',
      });
    });

    document.querySelectorAll('.tool-card[data-instrument]').forEach(function (card) {
      var icon = card.querySelector('.tool-card__icon');
      var id = card.getAttribute('data-instrument');
      if (!icon || !id || icon.querySelector('.ap-seal')) return;
      icon.innerHTML = instrument(id, { lg: true, hidden: true });
    });

    document.querySelectorAll('.ap-lite-rail__tile[data-instrument]').forEach(function (tile) {
      var slot = tile.querySelector('.ap-lite-rail__seal');
      var id = tile.getAttribute('data-instrument');
      if (!slot || !id || slot.querySelector('.ap-seal')) return;
      slot.innerHTML = instrument(id, { sm: true, hidden: true });
    });

    document.querySelectorAll('.concept-pill[data-instrument]').forEach(function (pill) {
      var slot = pill.querySelector('.concept-pill__icon');
      var id = pill.getAttribute('data-instrument');
      if (!slot || !id || slot.querySelector('.ap-seal')) return;
      slot.innerHTML = instrument(id, { sm: true, hidden: true });
    });

    document.querySelectorAll('.home-sign-card[data-sign]').forEach(function (card) {
      var slot = card.querySelector('.home-sign-card__seal[data-celestial-seal]');
      if (slot) return;
      if (card.querySelector('.home-sign-card__seal .ap-seal')) return;
      var sign = card.getAttribute('data-sign');
      if (!sign) return;
      var wrap = document.createElement('span');
      wrap.className = 'home-sign-card__seal';
      wrap.setAttribute('data-celestial-seal', 'zodiac:' + sign);
      wrap.setAttribute('data-seal-lg', '');
      wrap.setAttribute('aria-hidden', 'true');
      wrap.innerHTML = zodiac(sign, { lg: true, hidden: true });
      card.insertBefore(wrap, card.firstChild);
    });

    document.querySelectorAll('.sign-card[data-sign] .sign-card__glyph').forEach(function (el) {
      if (el.querySelector('.ap-seal') || el.hasAttribute('data-celestial-seal')) return;
      var card = el.closest('.sign-card');
      var sign = card && card.getAttribute('data-sign');
      if (!sign) return;
      el.className = 'sign-card__glyph sign-card__seal';
      el.setAttribute('data-celestial-seal', 'zodiac:' + sign);
      el.setAttribute('data-seal-lg', '');
      el.innerHTML = zodiac(sign, { lg: true, hidden: true });
    });

    document.querySelectorAll('.ap-guide-link[data-sign]').forEach(function (link) {
      if (link.querySelector('.ap-seal')) return;
      var sign = link.getAttribute('data-sign');
      if (!sign) return;
      var label = link.textContent.replace(/^[\s\S]*?(?=[A-Za-z])/, '').trim() || sign;
      var slot = document.createElement('span');
      slot.className = 'ap-guide-link__seal';
      slot.setAttribute('aria-hidden', 'true');
      slot.innerHTML = zodiac(sign, { sm: true, hidden: true });
      link.textContent = '';
      link.appendChild(slot);
      link.appendChild(document.createTextNode(' ' + label));
    });

    document.querySelectorAll('.footer-zodiac-strip [data-celestial-seal]').forEach(function (el) {
      if (el.querySelector('.ap-seal')) return;
      var raw = el.getAttribute('data-celestial-seal');
      if (!raw || raw.indexOf('zodiac:') !== 0) return;
      el.innerHTML = zodiac(raw.split(':')[1], { sm: true, hidden: true });
    });
  }

  function boot() {
    bindSlots();
  }

  window.AstroCelestialSeals = {
    zodiac: zodiac,
    planet: planet,
    instrument: instrument,
    sealHtml: sealHtml,
    bindSlots: bindSlots,
    SIGN_ELEMENT: SIGN_ELEMENT,
    SIGN_NAMES: SIGN_NAMES,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();