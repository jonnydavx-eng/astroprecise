/**
 * Classic-script bridge for Gumroad checkout (window.APGumroad).
 * v841 — product_id verification, dormant checkout, single eclipse edition.
 *
 * Owner: replace REPLACE_ME with a real Gumroad product_id.
 * License API verify step uses product_id, not permalink.
 */
(function (w) {
  'use strict';

  var PRODUCTS = {
    'eclipse-edition': { productId: 'REPLACE_ME', price: '£7' },
  };

  function resolveSlug(slug) {
    return slug;
  }

  function isReady(slug) {
    var key = resolveSlug(slug);
    var p = PRODUCTS[key] || PRODUCTS[slug];
    return !!(p && p.productId && p.productId !== 'REPLACE_ME' && String(p.productId).indexOf('REPLACE') < 0);
  }

  function openCheckout(slug) {
    var key = resolveSlug(slug);
    var p = PRODUCTS[key] || PRODUCTS[slug];
    if (!isReady(slug)) {
      if (typeof w.AP_openEmailCapture === 'function') {
        w.AP_openEmailCapture('shop_gumroad_' + slug);
        return false;
      }
      console.warn('[APGumroad] productId not set for', slug, '— checkout stays dormant.');
      return false;
    }
    w.location.href = 'https://gumroad.com/l/' + p.productId + '?wanted=true';
    return true;
  }

  /**
   * Verify a Gumroad license via the License API using product_id.
   * Rejects refunded, disputed and chargebacked purchases.
   * @param {string} licenseKey
   * @param {string} slug
   * @returns {Promise<{valid: boolean, reason?: string}>}
   */
  function verifyLicense(licenseKey, slug) {
    var key = resolveSlug(slug);
    var p = PRODUCTS[key] || PRODUCTS[slug];
    if (!p || !p.productId || p.productId === 'REPLACE_ME') {
      return Promise.resolve({ valid: false, reason: 'Product not configured.' });
    }
    if (!licenseKey || typeof licenseKey !== 'string' || licenseKey.length < 8) {
      return Promise.resolve({ valid: false, reason: 'Invalid license key.' });
    }
    return fetch('https://api.gumroad.com/v2/licenses/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'product_id=' + encodeURIComponent(p.productId) + '&license_key=' + encodeURIComponent(licenseKey),
    })
      .then(function (resp) { return resp.json(); })
      .then(function (data) {
        if (!data || !data.success) {
          return { valid: false, reason: data && data.message ? data.message : 'License verification failed.' };
        }
        var purchase = data.purchase || {};
        // Reject refunded, disputed or chargebacked purchases
        if (purchase.refunded) return { valid: false, reason: 'Purchase was refunded.' };
        if (purchase.disputed) return { valid: false, reason: 'Purchase was disputed.' };
        if (purchase.chargebacked) return { valid: false, reason: 'Purchase was chargebacked.' };
        return { valid: true };
      })
      .catch(function () {
        return { valid: false, reason: 'License verification request failed.' };
      });
  }

  w.APGumroad = {
    products: PRODUCTS,
    isReady: isReady,
    openCheckout: openCheckout,
    verifyLicense: verifyLicense,
    anyLive: function () {
      return Object.keys(PRODUCTS).some(isReady);
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);