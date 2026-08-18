/**
 * Astro Precise — Post-purchase perks (Two Skies 50% code after any purchase).
 */
(function () {
  'use strict';

  var PURCHASE_KEY = 'ap_last_purchase';
  var SHOWN_KEY = 'ap_promo_twoskies_shown';

  function promoConfig() {
    var commerce = (window.AP_MON && window.AP_MON.commerce) || {};
    return commerce.promos && commerce.promos.twoSkies
      ? commerce.promos.twoSkies
      : { code: 'TWOSKIES50', percent: 50, productId: 'two-skies-map', expiresDays: 30 };
  }

  function twoSkiesProduct() {
    var products = ((window.AP_MON && window.AP_MON.commerce) || {}).products || [];
    return products.find(function (p) { return p.id === 'two-skies-map'; }) || null;
  }

  function markPurchase(productId) {
    try {
      localStorage.setItem(PURCHASE_KEY, JSON.stringify({
        productId: productId || 'unknown',
        at: Date.now(),
      }));
    } catch (e) {}
  }

  function purchaseEligible() {
    try {
      var raw = localStorage.getItem(PURCHASE_KEY);
      if (!raw) return false;
      var rec = JSON.parse(raw);
      var cfg = promoConfig();
      var maxAge = (cfg.expiresDays || 30) * 86400000;
      return rec && rec.at && (Date.now() - rec.at) < maxAge;
    } catch (e) {
      return false;
    }
  }

  function promoShown() {
    try { return !!localStorage.getItem(SHOWN_KEY); } catch (e) { return false; }
  }

  function markPromoShown() {
    try { localStorage.setItem(SHOWN_KEY, '1'); } catch (e) {}
  }

  function discountedPrice(base, percent) {
    return Math.max(0, base * (1 - (percent || 50) / 100));
  }

  function promoModalHtml() {
    var cfg = promoConfig();
    var product = twoSkiesProduct();
    var price = product ? product.price : 24;
    var sale = discountedPrice(price, cfg.percent);
    var sym = '£';
    return ''
      + '<div class="ap-promo-modal">'
      + '  <p class="ap-promo-modal__eyebrow">Thank you for your order</p>'
      + '  <h3 class="ap-promo-modal__title">Half price on <em>Two Skies</em></h3>'
      + '  <p class="ap-promo-modal__sub">Your couples star map — two birth charts, one print — '
      + sym + sale.toFixed(0) + ' with your code (was ' + sym + price.toFixed(0) + ').</p>'
      + '  <div class="ap-promo-modal__code" role="group" aria-label="Discount code">'
      + '    <code id="ap-promo-code">' + cfg.code + '</code>'
      + '    <button type="button" class="btn btn--outline ap-promo-modal__copy" id="ap-promo-copy">Copy code</button>'
      + '  </div>'
      + '  <p class="ap-promo-modal__note">The discounted amount is pre-filled on PayPal — just add <em>Two Skies</em> and your code to the payment note. Valid ' + (cfg.expiresDays || 30) + ' days from your purchase.</p>'
      + '</div>';
  }

  function showPromoModal(onDone) {
    if (!window.AstroShop || typeof AstroShop.showModal !== 'function') {
      if (typeof onDone === 'function') onDone();
      return;
    }
    var product = twoSkiesProduct();
    var cfg = promoConfig();
    markPromoShown();

    // PayPal direct (2026-07-02): no coupon engine, so the discount is granted
    // as a pre-filled PayPal.Me amount link at the reduced price. Requires
    // AP_MON.paypal.me — without it we only ever offer the full-price link.
    var checkoutUrl = '';
    var discounted = false;
    var paypalMe = (window.AP_MON && AP_MON.paypal && AP_MON.paypal.me) || '';
    if (paypalMe && product) {
      var sale = discountedPrice(product.price, cfg.percent);
      checkoutUrl = paypalMe.replace(/\/+$/, '') + '/' + sale.toFixed(2) + 'GBP';
      discounted = true;
    } else if (product && product.fulfilUrl && !/lemonsqueezy\.com/i.test(product.fulfilUrl)) {
      checkoutUrl = product.fulfilUrl;
    }

    AstroShop.showModal({
      title: 'Your Two Skies offer',
      body: promoModalHtml(),
      actions: checkoutUrl ? [
        { label: discounted ? 'Get Two Skies — ' + cfg.percent + '% off' : 'Get Two Skies', primary: true, href: checkoutUrl, external: true, productId: 'two-skies-map' },
        { label: 'Maybe later', onClick: onDone },
      ] : [
        { label: 'Browse shop', primary: true, href: 'shop.html#two-skies-map' },
        { label: 'Close', onClick: onDone },
      ],
      onMount: function () {
        var copyBtn = document.getElementById('ap-promo-copy');
        var codeEl = document.getElementById('ap-promo-code');
        if (copyBtn && codeEl) {
          copyBtn.addEventListener('click', function () {
            var code = codeEl.textContent || cfg.code;
            if (navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(code).then(function () {
                if (window.AstroApp) AstroApp.showToast('Copied', cfg.code + ' ready for checkout.', 'success');
              });
            } else if (window.AstroApp) {
              AstroApp.showToast('Your code', code, 'info');
            }
          });
        }
      },
    });
  }

  function maybeShowPromo() {
    if (!purchaseEligible() || promoShown()) return;
    // Honesty: never promise a discount we cannot grant. The PayPal-direct
    // discount needs AP_MON.paypal.me (pre-filled reduced-amount link).
    if (!(window.AP_MON && AP_MON.paypal && AP_MON.paypal.me)) return;
    if (/[?&]thanks=1/.test(location.search)) {
      showPromoModal();
      return;
    }
    if (document.body.classList.contains('page-shop')) {
      setTimeout(function () { showPromoModal(); }, 800);
    }
  }

  var checkoutWired = false;

  function wireCheckoutTracking() {
    if (checkoutWired) return;
    checkoutWired = true;
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[data-ap-product], a[href*="paypal.com"], a[href*="paypal.me"]');
      if (!a) return;
      var card = a.closest('[data-product-id]');
      var id = card ? card.getAttribute('data-product-id') : '';
      if (!id && a.dataset.apProduct) id = a.dataset.apProduct;
      markPurchase(id || 'checkout');
    }, true);
  }

  function buildCheckoutUrl(baseUrl, productId) {
    var url = baseUrl;
    if (window.APReadingPrefs && APReadingPrefs.appendToCheckoutUrl) {
      url = APReadingPrefs.appendToCheckoutUrl(url, productId);
    }
    return url;
  }

  window.APPostPurchase = {
    markPurchase: markPurchase,
    maybeShowPromo: maybeShowPromo,
    showPromoModal: showPromoModal,
    wireCheckoutTracking: wireCheckoutTracking,
    buildCheckoutUrl: buildCheckoutUrl,
    purchaseEligible: purchaseEligible,
    promoConfig: promoConfig,
  };
})();