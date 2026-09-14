/**
 * AstroPrecise — noscript/first-paint footer for generated sign pages.
 * Must match ap-footer-inject.js compact four-route chrome.
 */

export const ZODIAC_SIGNS = [
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

const CORE = [
  { href: 'index.html', label: 'Observatory' },
  { href: 'chart.html', label: 'Chart' },
  { href: 'sky-events.html', label: 'Events' },
  { href: 'shop.html', label: 'Shop' },
];

const LEGAL = [
  { href: 'privacy.html', label: 'Privacy' },
  { href: 'terms.html', label: 'Terms' },
  { href: 'refunds.html', label: 'Refunds' },
  { href: 'verify.html', label: 'Verify' },
  { href: 'contact.html', label: 'Contact' },
];

function links(items) {
  return items.map((item) => `<a href="${item.href}">${item.label}</a>`).join('');
}

/** @deprecated kept for older scripts; the public footer is four-route compact. */
export function footerToolsColHtml() {
  return '';
}

export function footerNavHtml() {
  return '';
}

export function footerBrandColHtml() {
  return '';
}

export function footerLegalHtml() {
  return '';
}

export function footerInnerHtml() {
  return `
    <div class="ap-site-footer__inner">
      <div class="ap-site-footer__brand">
        <a class="ap-site-footer__wordmark" href="index.html" aria-label="AstroPrecise home"><img src="img/logo-mark.svg" width="28" height="28" alt=""><span>AstroPrecise</span></a>
        <p>The sky computes here. Town search sends only that name to Open-Meteo; birth date and time stay on this device.</p>
      </div>
      <nav class="ap-site-footer__routes" aria-label="Core pages">${links(CORE)}</nav>
      <nav class="ap-site-footer__legal" aria-label="Legal and verification">${links(LEGAL)}</nav>
    </div>
    <div class="ap-site-footer__colophon"><span>&copy; 2026 AstroPrecise</span><span>Astronomy computed locally</span></div>`;
}

export function footerBlockHtml() {
  return `  <footer class="ap-site-footer" role="contentinfo" data-ap-footer-model="compact-v835">
${footerInnerHtml()}
  </footer>`;
}
