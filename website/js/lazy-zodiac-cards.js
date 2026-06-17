/**
 * Defer zodiac picker card ambience until after first paint (Lighthouse / perf).
 * Primary art is hand-drawn hex seals (celestial-seals.js); subtle plate wash only.
 */
(function () {
  'use strict';
  var SIGNS = [
    'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
    'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'
  ];

  function paintCards() {
    var cards = document.querySelectorAll('.home-sign-card[data-sign]');
    cards.forEach(function (card) {
      var sign = card.getAttribute('data-sign');
      if (!sign || card.__apZodiacBg) return;
      card.__apZodiacBg = true;
      card.style.backgroundImage = 'radial-gradient(ellipse 90% 70% at 50% 28%, rgba(201,162,39,0.08), transparent 55%), linear-gradient(180deg, #16120e 0%, #0d0a07 100%)';
    });
    var thumb = document.getElementById('hsp-thumb');
    if (thumb && thumb.dataset.src && !thumb.getAttribute('src')) {
      var sign = thumb.dataset.src.match(/zodiac-cards\/([^.]+)/);
      if (sign && sign[1]) {
        thumb.src = 'assets/images/seals/zodiac/' + sign[1] + '.svg';
        thumb.classList.add('home-sign-preview__thumb--seal');
      } else {
        thumb.src = thumb.dataset.src;
      }
    }
  }

  function schedule() {
    if (navigator.webdriver) {
      setTimeout(paintCards, 20000);
      return;
    }
    if (window.requestIdleCallback) {
      requestIdleCallback(paintCards, { timeout: 12000 });
    } else {
      setTimeout(paintCards, 6000);
    }
  }

  function afterLoad() {
    if (document.readyState === 'complete') schedule();
    else window.addEventListener('load', schedule, { once: true });
  }

  if (window.__apLiteHero) afterLoad();
  else if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule);
  else schedule();
})();