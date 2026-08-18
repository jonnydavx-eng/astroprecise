/**
 * Progressive enhancement for lite index shell.
 * Chrome path (load+800ms): app.js + page bridge for nav / bottom tabs.
 * Rest path (scroll / load+2.5s): below-fold index-full slice + heavy assets.
 */
(function () {
  'use strict';
  if (!window.__apLiteShell) return;

  var chromeLoaded = false;
  var restLoaded = false;
  var CHROME_SCRIPTS = ['js/ap-page-bridge.js', 'js/app.js'];
  var CHROME_SHEETS = [
    ['css/ap-lite-chrome.css', 'ap-css-lite-chrome']
  ];
  var SHEETS = [
    ['css/main.css', 'ap-css-main'],
    ['css/orrery-visual.css', 'ap-css-orrery'],
    ['css/landing-gate.css', 'ap-css-gate'],
    ['css/index-home.css', 'ap-css-index'],
    ['css/fonts.css', 'ap-css-fonts']
  ];
  var DEFER_SCRIPTS = [
    'js/raf-core.js',
    'js/lazy-zodiac-cards.js',
    'js/starcatalog.js',
    'js/cosmos.js',
    'js/oracle.js',
    'js/profile.js',
    'js/personalization-engine.js',
    'js/journey.js',
    'js/sign-daily.js',
    'js/element-seals.js',
    'js/icons.js',
    /* home-sign-picker.js dropped from the lite home: the .home-sign-picker
       markup is now stripped in filterLiteInject() (belongs on horoscope/sign
       pages), so loading its script here would only fetch a guaranteed no-op. */
    'js/affiliate-social.js',
    'js/effects.js'
  ];

  function linkSheet(href, id) {
    if (document.getElementById(id)) return;
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = href;
    l.id = id;
    document.head.appendChild(l);
  }

  function filterLiteInject(html) {
    try {
      var doc = new DOMParser().parseFromString('<div id="ap-wrap">' + html + '</div>', 'text/html');
      var wrap = doc.getElementById('ap-wrap');
      if (!wrap) return html;
      /* Layout sort (2026 final pass): the lite shell already provides a clean,
         modern flow — HERO → COSMIC SNAPSHOT → OBSERVATORY (tools rail) →
         THREE STEPS → MANIFESTO. The injected index-full slice below the hero
         only needs to add the tail: FAQ → OFFERINGS → FOOTER. Everything else in
         the slice is either a DUPLICATE of the lite top (full how-it-works,
         features, tools bento, manifesto) or a long old-site essay that bloats
         the page and reads inconsistent with the new top:
           • #how-it-works / .features-section / .manifesto-section — duplicates of
             the lite shell's own steps + manifesto.
           • .tools-section — duplicates the lite Observatory rail (same links).
           • .home-sign-picker — a sign-selection widget that belongs on
             horoscope/sign pages, redundant on the home.
           • .cosmic-story-section + .philosophy-section — two long editorial
             essays; their substance (determinism, privacy, honesty, real
             astronomy) lives in full on why.html, which the manifesto links to.
         Stripping them leaves NO empty gap (the nodes are removed, not hidden),
         so the page reads tight with one even editorial rhythm. */
      wrap.querySelectorAll(
        '.features-section, #how-it-works, .manifesto-section, ' +
        '.tools-section, .home-sign-picker, .cosmic-story-section, .philosophy-section'
      ).forEach(function (el) {
        el.remove();
      });
      return wrap.innerHTML;
    } catch (e) {
      return html;
    }
  }

  function loadScripts(seq) {
    if (!seq.length) return;
    var src = seq.shift();
    var s = document.createElement('script');
    s.src = src;
    s.defer = true;
    if (src.indexOf('affiliate-social') >= 0) s.dataset.apAffiliateSocial = '1';
    s.onload = function () { loadScripts(seq); };
    document.body.appendChild(s);
  }

  function injectScript(src, next) {
    if (document.querySelector('script[src="' + src + '"]')) {
      if (next) next();
      return;
    }
    var s = document.createElement('script');
    s.src = src;
    s.onload = function () { if (next) next(); };
    document.body.appendChild(s);
  }

  function loadChromeScripts(seq, done) {
    if (!seq.length) {
      if (done) done();
      return;
    }
    injectScript(seq[0], function () { loadChromeScripts(seq.slice(1), done); });
  }

  function loadChrome() {
    if (chromeLoaded) return;
    chromeLoaded = true;
    CHROME_SHEETS.forEach(function (pair) { linkSheet(pair[0], pair[1]); });
    var chromeLink = document.getElementById('ap-css-lite-chrome');
    if (chromeLink) chromeLink.media = 'all';
    loadChromeScripts(CHROME_SCRIPTS, function () {
      var ph = document.querySelector('.ap-lite-bottom-placeholder');
      if (ph) ph.remove();
    });
  }

  function loadRest() {
    if (restLoaded) return;
    restLoaded = true;
    SHEETS.forEach(function (pair) { linkSheet(pair[0], pair[1]); });

    fetch('index-full.html', { credentials: 'same-origin' })
      .then(function (r) { return r.text(); })
      .then(function (html) {
        var marker = '<!-- ap-below-hero -->';
        var i = html.indexOf(marker);
        if (i < 0) return;
        var slice = html.slice(i + marker.length);
        var mainEnd = slice.indexOf('</main>');
        if (mainEnd < 0) return;
        var chunk = slice.slice(0, mainEnd);
        chunk = filterLiteInject(chunk);
        if (!document.querySelector('.ap-lite-footer')) {
          var footerStart = slice.indexOf('<footer class="site-footer"');
          var footerEnd = footerStart >= 0 ? slice.indexOf('</footer>', footerStart) : -1;
          if (footerStart >= 0 && footerEnd >= 0) {
            chunk += slice.slice(footerStart, footerEnd + 9);
          }
        }
        var host = document.getElementById('ap-lite-rest');
        if (!host) return;
        host.hidden = false;
        host.removeAttribute('aria-hidden');
        host.classList.add('ap-lite-rest--ready');
        host.innerHTML = chunk;
        loadScripts(DEFER_SCRIPTS.slice());
      })
      .catch(function () {});
  }

  if (window.__apSkipOrreryBoot && window.__apSkipOrreryBoot()) return;

  function preloadSheets() {
    SHEETS.forEach(function (pair) { linkSheet(pair[0], pair[1]); });
  }

  function schedule() {
    window.addEventListener('scroll', loadRest, { once: true, passive: true });
    window.addEventListener('pointerdown', loadRest, { once: true, passive: true });
    /* Below-fold home slice + affiliate — not required for chrome / monetization tabs */
    setTimeout(loadRest, 2500);
    setTimeout(loadRest, 15000);
    if (window.requestIdleCallback) requestIdleCallback(preloadSheets, { timeout: 5000 });
    else setTimeout(preloadSheets, 4000);
  }

  function onLoad() {
    setTimeout(loadChrome, 800);
    schedule();
  }

  if (document.readyState === 'complete') onLoad();
  else window.addEventListener('load', onLoad, { once: true });
})();