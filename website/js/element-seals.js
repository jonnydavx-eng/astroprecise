/**
 * Astro Precise — engraved hex element seals (fire / earth / air / water / all).
 * Replaces circular element orbs with observatory instrument plates.
 */
(function () {
  'use strict';

  var SEAL_PATH = 'assets/images/seals/elements/';
  var LABELS = { fire: 'Fire', earth: 'Earth', air: 'Air', water: 'Water', all: 'All signs' };

  function sealClasses(el, opts) {
    opts = opts || {};
    var cls = 'ap-el-seal ap-el-seal--' + el;
    if (opts.sm) cls += ' ap-el-seal--sm';
    else if (opts.lg) cls += ' ap-el-seal--lg';
    else cls += ' ap-el-seal--md';
    if (opts.live && !opts.static) cls += ' ap-el-seal--live';
    if (opts.class) cls += ' ' + opts.class;
    return cls;
  }

  function seal(element, opts) {
    opts = opts || {};
    var el = String(element || 'all').toLowerCase();
    if (!LABELS[el]) el = 'all';
    var label = opts.label || LABELS[el] || el;
    var loading = opts.eager ? 'eager' : 'lazy';
    var hidden = opts.hidden || opts['aria-hidden'];
    var a11y = hidden
      ? ' aria-hidden="true"'
      : ' role="img" aria-label="' + String(label).replace(/"/g, '&quot;') + ' element"';
    var alt = hidden ? '' : String(label + ' element').replace(/"/g, '&quot;');

    return '<span class="' + sealClasses(el, opts) + '"' + a11y + '>'
      + '<span class="ap-el-seal__plate">'
      + '<img class="ap-el-seal__art" src="' + SEAL_PATH + el + '.svg"'
      + ' alt="' + alt + '" width="96" height="112"'
      + ' loading="' + loading + '" decoding="async" />'
      + '</span></span>';
  }

  function bindSiteSlots() {
    document.querySelectorAll('[data-element-seal]').forEach(function (slot) {
      var el = slot.getAttribute('data-element-seal');
      if (!el) return;
      slot.innerHTML = seal(el, { sm: slot.hasAttribute('data-seal-sm'), static: true, hidden: slot.getAttribute('aria-hidden') === 'true' });
    });
    document.querySelectorAll('.sign-card[data-element]').forEach(function (card) {
      if (card.querySelector('.sign-card__el-seal')) return;
      var el = card.getAttribute('data-element');
      if (!el) return;
      var wrap = document.createElement('span');
      wrap.className = 'sign-card__el-seal';
      wrap.setAttribute('aria-hidden', 'true');
      wrap.innerHTML = seal(el, { sm: true, static: true, hidden: true });
      card.appendChild(wrap);
    });
    document.querySelectorAll('.sign-card__element-badge[data-element]').forEach(function (badge) {
      var el = badge.getAttribute('data-element');
      if (!el || badge.querySelector('.ap-el-seal')) return;
      var label = badge.textContent.trim();
      badge.innerHTML = seal(el, { sm: true, static: true }) + '<span class="sign-card__element-label">' + label + '</span>';
    });
  }

  function boot() {
    bindSiteSlots();
  }

  window.AstroElementSeals = { seal: seal, LABELS: LABELS, bindSiteSlots: bindSiteSlots };
  /** @deprecated use AstroElementSeals.seal */
  window.AstroElementOrbs = {
    scene: function (element, opts) {
      return seal(element, Object.assign({ live: true }, opts || {}));
    },
    LABELS: LABELS,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();