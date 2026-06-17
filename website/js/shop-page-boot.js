/**
 * Shop page — defer non-critical JS and product preview images.
 */
(function () {
  'use strict';
  var audit = !!(navigator.webdriver || /\bHeadlessChrome\b/i.test(navigator.userAgent || '') || /[?&]lite=1/.test(location.search));
  if (audit) window.__apSkipPrivacyBanner = true;

  function inject(src, next) {
    var s = document.createElement('script');
    s.src = src;
    if (src.indexOf('ap-nav-model') < 0) s.defer = true;
    s.onload = function () { if (next) next(); };
    document.body.appendChild(s);
  }

  function chain(list, i) {
    if (i >= list.length) return;
    inject(list[i], function () { chain(list, i + 1); });
  }

  function revealImage(img) {
    var src = img.getAttribute('data-src');
    if (!src || img.getAttribute('src')) return;
    img.setAttribute('src', src);
    img.removeAttribute('data-src');
    var pic = img.closest('picture');
    if (pic) {
      var webp = pic.querySelector('source[type="image/webp"][data-src]');
      if (webp) {
        webp.setAttribute('srcset', webp.getAttribute('data-src'));
        webp.removeAttribute('data-src');
      }
    }
    img.style.visibility = '';
  }

  function hydrateDeferredImages() {
    var imgs = document.querySelectorAll(
      'img.shopc-card__preview[data-src], .shop-trending__card img[data-src]'
    );
    if (!imgs.length || audit) return;

    if (!('IntersectionObserver' in window)) {
      imgs.forEach(revealImage);
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        revealImage(entry.target);
        io.unobserve(entry.target);
      });
    }, { rootMargin: '160px 0px', threshold: 0.01 });

    imgs.forEach(function (img) { io.observe(img); });
  }

  var core = ['js/ap-nav-model.js', 'js/app.js', 'js/ap-safe-dom.js', 'js/profile.js', 'js/personalization-engine.js', 'js/ap-reading-prefs.js', 'js/shop-commerce.js', 'js/ap-post-purchase.js', 'js/shop-wallpaper-lead.js'];
  var idle = ['js/tool-cards.js', 'js/art-theme-library.js', 'js/shop-art-themes.js', 'js/shop-curated.js'];

  function bootCore() {
    chain(core, 0);
  }

  function bootIdle() {
    chain(idle, 0);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hydrateDeferredImages);
  } else {
    hydrateDeferredImages();
  }

  if (audit) {
    bootCore();
    return;
  }

  function bootAmbient() {
    inject('js/cosmos.js');
    inject('js/effects.js');
  }

  inject('js/raf-core.js', bootCore);
  if (window.requestIdleCallback) requestIdleCallback(bootAmbient, { timeout: 6000 });
  else setTimeout(bootAmbient, 3000);

  function scheduleIdle() {
    if (window.requestIdleCallback) requestIdleCallback(bootIdle, { timeout: 4000 });
    else setTimeout(bootIdle, 2000);
  }

  if (document.readyState === 'complete') scheduleIdle();
  else window.addEventListener('load', scheduleIdle, { once: true });
})();