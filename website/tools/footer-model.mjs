/**
 * AstroPrecise — archive-page fallback footer.
 * Used by generated sign pages when JavaScript cannot mount the compact footer.
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

/** Keep the fallback chrome on the same four-route Act 1 spine as ap-footer-inject.js. */
const FOOTER_TOOLS = [
  { href: 'index.html', label: 'Observatory', icon: '<span aria-hidden="true">✦</span>' },
  { href: 'chart.html', label: 'Chart', icon: '<span aria-hidden="true">⊙</span>' },
  { href: 'sky-events.html', label: 'Events', icon: '<span aria-hidden="true">☽</span>' },
  { href: 'shop.html', label: 'Shop', icon: '<span aria-hidden="true">★</span>' },
];

export function footerToolsColHtml() {
  const items = FOOTER_TOOLS.map((t) =>
    `            <li><a href="${t.href}">${t.icon} ${t.label}</a></li>`
  ).join('\n');
  return `
        <div class="footer-nav-col" role="group" aria-label="Tools navigation">
          <h2 class="footer-nav-col__title">Tools</h2>
          <ul>
${items}
          </ul>
        </div>`;
}

export function footerDailyColHtml() {
  const items = ZODIAC_SIGNS.map((s) =>
    `            <li><a href="horoscope.html?sign=${s.key}">${s.name} today</a></li>`
  ).join('\n');
  return `
        <div class="footer-nav-col" role="group" aria-label="Daily horoscope readings">
          <h2 class="footer-nav-col__title">Daily readings</h2>
          <ul>
${items}
            <li><a href="horoscope.html">All signs →</a></li>
          </ul>
        </div>`;
}

export function footerSignGuidesColHtml() {
  const items = ZODIAC_SIGNS.map((s) =>
    `            <li><a href="${s.key}.html">${s.name} profile</a></li>`
  ).join('\n');
  return `
        <div class="footer-nav-col" role="group" aria-label="Zodiac sign guides">
          <h2 class="footer-nav-col__title">Sign guides</h2>
          <ul>
${items}
          </ul>
        </div>`;
}

/** One compact route column; archive discovery stays in page content, not global chrome. */
export function footerNavHtml() {
  return footerToolsColHtml();
}

export function footerBrandColHtml() {
  const seals = ZODIAC_SIGNS.map((s) =>
    `            <span data-celestial-seal="zodiac:${s.key}" data-seal-sm></span>`
  ).join('\n');
  return `
        <div class="footer-brand-col">
          <a href="index.html" class="footer-brand__logo" aria-label="AstroPrecise home">
            <span class="footer-brand__logo-mark" aria-hidden="true"><img src="img/logo-mark.svg" alt="" width="28" height="28" decoding="async" /></span>
            <span class="footer-brand__logo-text">AstroPrecise</span>
          </a>
          <p class="footer-brand__tagline">
            A precision instrument wearing the skin of an astrology site.
            Real astronomy, read in the old language.
          </p>
          <p>
            <span class="footer-brand__badge">
              <span aria-hidden="true">⊙</span> Computed locally &middot; VSOP87 + ELP2000
            </span>
          </p>
          <div class="footer-zodiac-strip" aria-hidden="true">
${seals}
          </div>
        </div>`;
}

export function footerLegalHtml() {
  return `
      <div class="footer-legal">
        <p>&copy; 2026 AstroPrecise &middot; Astronomy computed locally &middot; No accounts required</p>
        <p style="font-size:0.6rem;color:var(--silver-dark);">Built with VSOP87 &amp; ELP2000 astronomical algorithms</p>
      </div>`;
}

export function footerInnerHtml() {
  return `
      <div class="footer-inner" data-ap-footer-model="1">
${footerBrandColHtml()}
${footerNavHtml()}
      </div>`;
}

export function footerBlockHtml({ footerClass = 'footer' } = {}) {
  return `  <footer class="${footerClass}" role="contentinfo">
    <div class="container">
${footerInnerHtml()}
${footerLegalHtml()}
    </div>
  </footer>`;
}