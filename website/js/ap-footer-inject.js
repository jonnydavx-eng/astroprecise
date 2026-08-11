/**
 * AstroPrecise compact site footer.
 *
 * Replaces every historic sitemap/catalogue footer with one small, honest
 * navigation surface. Idempotent so pages may load it directly or via boot.
 */
(function apFooterInject() {
  'use strict';

  if (document.documentElement.dataset.apFooterBoot === '1') return;
  document.documentElement.dataset.apFooterBoot = '1';

  var SKIP_PAGES = /^(?:classic|offline|explore|redirect|embed)(?:\.html)?$/i;
  var page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  if (SKIP_PAGES.test(page)) return;

  var CORE_LINKS = [
    { href: 'index.html', label: 'Observatory' },
    { href: 'chart.html', label: 'Chart' },
    { href: 'horoscope.html', label: 'Daily' },
    { href: 'eclipse.html', label: 'Eclipse' },
    { href: 'shop.html', label: 'Shop' },
  ];
  var LEGAL_LINKS = [
    { href: 'privacy.html', label: 'Privacy' },
    { href: 'terms.html', label: 'Terms' },
    { href: 'refunds.html', label: 'Refunds' },
    { href: 'verify.html', label: 'Verify' },
    { href: 'contact.html', label: 'Contact' },
  ];

  function linksHtml(items) {
    return items.map(function (item) {
      var active = page === item.href.toLowerCase();
      return '<a href="' + item.href + '"' + (active ? ' aria-current="page"' : '') + '>' + item.label + '</a>';
    }).join('');
  }

  function footerHtml() {
    return ''
      + '<div class="ap-site-footer__inner">'
      +   '<div class="ap-site-footer__brand">'
      +     '<a class="ap-site-footer__wordmark" href="index.html" aria-label="AstroPrecise home">'
      +       '<img src="img/logo-mark.svg" width="28" height="28" alt="" decoding="async">'
      +       '<span>AstroPrecise</span>'
      +     '</a>'
      +     '<p>Live sky calculations and reflective astrology, without a hidden data trail. Birth details stay on this device; only place search calls Open-Meteo.</p>'
      +   '</div>'
      +   '<nav class="ap-site-footer__routes" aria-label="Core pages">' + linksHtml(CORE_LINKS) + '</nav>'
      +   '<nav class="ap-site-footer__legal" aria-label="Legal and verification">' + linksHtml(LEGAL_LINKS) + '</nav>'
      + '</div>'
      + '<div class="ap-site-footer__colophon">'
      +   '<span>&copy; ' + new Date().getFullYear() + ' AstroPrecise</span>'
      +   '<span>Live calculations · No account required · Planet imagery: <a href="https://www.solarsystemscope.com/textures/" target="_blank" rel="noopener noreferrer">Solar System Scope</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a></span>'
      + '</div>';
  }

  function mount() {
    var existing = document.querySelector('body > footer:not(.ap-lite-footer)');
    if (existing && existing.matches('.ap-site-footer[data-ap-footer-model="compact-v835"]')
        && existing.querySelector('.ap-site-footer__inner')) {
      // Authored launch footers are already complete at first paint. Replacing
      // their innerHTML at DOM ready caused an unnecessary visible shell swap.
      Array.prototype.forEach.call(existing.querySelectorAll('a[aria-current="page"]'), function (link) {
        link.removeAttribute('aria-current');
      });
      var active = existing.querySelector('a[href="' + page.replace(/"/g, '') + '"]');
      if (active) active.setAttribute('aria-current', 'page');
      document.dispatchEvent(new CustomEvent('ap:footer-injected'));
      return;
    }
    var footer = existing || document.createElement('footer');

    footer.className = 'ap-site-footer';
    footer.setAttribute('role', 'contentinfo');
    footer.setAttribute('data-ap-footer-model', 'compact-v835');
    footer.innerHTML = footerHtml();

    if (!existing) {
      var bottomNav = document.querySelector('body > nav.bottom-nav');
      if (bottomNav) document.body.insertBefore(footer, bottomNav);
      else document.body.appendChild(footer);
    }

    document.dispatchEvent(new CustomEvent('ap:footer-injected'));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
})();
