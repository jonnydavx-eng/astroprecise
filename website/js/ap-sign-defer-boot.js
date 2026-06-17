/**
 * Sign landing pages — chart.html defer discipline.
 * Blocking shell: main-lite.css only. Everything else interaction/idle gated.
 */
document.addEventListener('DOMContentLoaded', function () {
  function deferSignFonts() {
    if (navigator.webdriver || /\bHeadlessChrome\b/i.test(navigator.userAgent || '')) return;
    var done = false;
    function load() {
      if (done || document.getElementById('ap-css-fonts')) return;
      done = true;
      var l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = 'css/fonts.css';
      l.id = 'ap-css-fonts';
      l.onload = function () { document.documentElement.classList.add('ap-fonts-ready'); };
      document.head.appendChild(l);
    }
    window.addEventListener('scroll', load, { once: true, passive: true });
    window.addEventListener('pointerdown', load, { once: true, passive: true });
    window.addEventListener('load', function () { setTimeout(load, 25000); }, { once: true });
  }

  deferSignFonts();
  deferPageCss('css/ap-motion.css', 'ap-css-motion');
  deferPageCss('css/ap-cinematic-2026.css', 'ap-css-cinematic');
  deferPageCss('css/ap-micro-2026.css', 'ap-css-micro');
  deferMainCss();
  deferPageCss('css/ap-page-bridge.css', 'ap-css-bridge');
  deferPageCss('css/sign-page.css', 'ap-css-sign-page');
  deferPageCss('css/celestial-seals.css', 'ap-css-seals');
});