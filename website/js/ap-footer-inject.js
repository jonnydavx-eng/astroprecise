/**
 * AstroPrecise — inject or upgrade to unified footer-nav model.
 * Idempotent: skips when [data-ap-footer-model] is already present.
 * Replaces legacy .footer__links / .footer__grid / .footer-nav blocks when detected.
 * Mirrors tools/footer-model.mjs (keep in sync).
 */
(function apFooterInject() {
  'use strict';

  var ZODIAC_SIGNS = [
    { key: 'aries', name: 'Aries' },
    { key: 'taurus', name: 'Taurus' },
    { key: 'gemini', name: 'Gemini' },
    { key: 'cancer', name: 'Cancer' },
    { key: 'leo', name: 'Leo' },
    { key: 'virgo', name: 'Virgo' },
    { key: 'libra', name: 'Libra' },
    { key: 'scorpio', name: 'Scorpio' },
    { key: 'sagittarius', name: 'Sagittarius' },
    { key: 'capricorn', name: 'Capricorn' },
    { key: 'aquarius', name: 'Aquarius' },
    { key: 'pisces', name: 'Pisces' },
  ];

  var FOOTER_TOOLS = [
    { href: 'chart.html', label: 'Birth Chart', icon: '<span aria-hidden="true">⊙</span>' },
    { href: 'horoscope.html', label: 'Daily', icon: '<span aria-hidden="true">☽</span>' },
    { href: 'lifepath.html', label: 'Life Path', icon: '<svg class="eng-i" aria-hidden="true"><use href="#ei-gem"/></svg>' },
    { href: 'compatibility.html', label: 'Match', icon: '<svg class="eng-i" aria-hidden="true"><use href="#ei-heart"/></svg>' },
    { href: 'transits.html', label: 'Transits', icon: '<span aria-hidden="true">☿</span>' },
    { href: 'ephemeris.html', label: 'Sky', icon: '<span aria-hidden="true">⬡</span>' },
  ];

  var PRESERVE_SELECTORS = [
    '.ap-guide-links',
    '.ap-legal-links',
    '.ap-footer-signup',
    '.ap-family-links',
    '.ap-affiliate-row',
  ];

  function hasFooterModel() {
    return !!document.querySelector('footer [data-ap-footer-model="1"]');
  }

  function findFooter() {
    return document.querySelector(
      'footer.footer, footer.site-footer, footer[role="contentinfo"]:not(.ap-lite-footer)'
    );
  }

  /** Legacy minimal footers that should be upgraded to the full nav grid. */
  function needsFooterUpgrade() {
    if (hasFooterModel()) return false;
    var footer = findFooter();
    if (!footer) return false;
    if (footer.classList.contains('ap-lite-footer')) return false;
    return !!(
      footer.querySelector('.footer__links') ||
      footer.querySelector('.footer__grid') ||
      footer.querySelector('.footer-nav') ||
      footer.querySelector('.footer-inner:not([data-ap-footer-model])') ||
      !footer.querySelector('.footer-nav-col')
    );
  }

  function toolsColHtml() {
    return ''
      + '<div class="footer-nav-col" role="group" aria-label="Tools navigation">'
      + '<h2 class="footer-nav-col__title">Tools</h2><ul>'
      + FOOTER_TOOLS.map(function (t) {
        return '<li><a href="' + t.href + '">' + t.icon + ' ' + t.label + '</a></li>';
      }).join('')
      + '</ul></div>';
  }

  function dailyColHtml() {
    return ''
      + '<div class="footer-nav-col" role="group" aria-label="Daily horoscope readings">'
      + '<h2 class="footer-nav-col__title">Daily readings</h2><ul>'
      + ZODIAC_SIGNS.map(function (s) {
        return '<li><a href="horoscope.html?sign=' + s.key + '">' + s.name + ' today</a></li>';
      }).join('')
      + '<li><a href="horoscope.html">All signs →</a></li>'
      + '</ul></div>';
  }

  function signGuidesColHtml() {
    return ''
      + '<div class="footer-nav-col" role="group" aria-label="Zodiac sign guides">'
      + '<h2 class="footer-nav-col__title">Sign guides</h2><ul>'
      + ZODIAC_SIGNS.map(function (s) {
        return '<li><a href="' + s.key + '.html">' + s.name + ' profile</a></li>';
      }).join('')
      + '</ul></div>';
  }

  function brandColHtml() {
    var seals = ZODIAC_SIGNS.map(function (s) {
      return '<span data-celestial-seal="zodiac:' + s.key + '" data-seal-sm></span>';
    }).join('');
    return ''
      + '<div class="footer-brand-col">'
      + '<a href="index.html" class="footer-brand__logo" aria-label="AstroPrecise home">'
      + '<span class="footer-brand__logo-mark" aria-hidden="true"><img src="img/logo-mark.svg" alt="" width="28" height="28" decoding="async" /></span>'
      + '<span class="footer-brand__logo-text">AstroPrecise</span></a>'
      + '<p class="footer-brand__tagline">A precision instrument wearing the skin of an astrology site. '
      + 'Real astronomy, read in the old language.</p>'
      + '<p><span class="footer-brand__badge"><span aria-hidden="true">⊙</span> Computed locally &middot; VSOP87 + ELP2000</span></p>'
      + '<div class="footer-zodiac-strip" aria-hidden="true">' + seals + '</div>'
      + '</div>';
  }

  function legalHtml() {
    return ''
      + '<div class="footer-legal">'
      + '<p>&copy; 2026 AstroPrecise &middot; All calculations run locally in your browser &middot; No data collected &middot; No accounts required</p>'
      + '<p style="font-size:0.6rem;color:var(--silver-dark);">Built with VSOP87 &amp; ELP2000 astronomical algorithms</p>'
      + '</div>';
  }

  function footerInnerHtml() {
    return ''
      + '<div class="footer-inner" data-ap-footer-model="1">'
      + brandColHtml()
      + toolsColHtml()
      + dailyColHtml()
      + signGuidesColHtml()
      + '</div>';
  }

  function inject() {
    if (!needsFooterUpgrade()) return;

    var footer = findFooter();
    if (!footer) return;

    var container = footer.querySelector('.container');
    if (!container) return;

    var preserved = [];
    PRESERVE_SELECTORS.forEach(function (sel) {
      var el = container.querySelector(sel);
      if (el) preserved.push(el);
    });

    Array.from(container.children).forEach(function (child) {
      if (preserved.indexOf(child) === -1) child.remove();
    });

    var mount = document.createElement('div');
    mount.innerHTML = footerInnerHtml() + legalHtml();
    var nodes = Array.from(mount.childNodes);
    var insertBefore = preserved[0] || null;
    nodes.forEach(function (node) {
      container.insertBefore(node, insertBefore);
    });

    if (window.AstroCelestialSeals && typeof AstroCelestialSeals.bindSlots === 'function') {
      AstroCelestialSeals.bindSlots();
    }

    document.dispatchEvent(new CustomEvent('ap:footer-injected'));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();