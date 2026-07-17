/**
 * Classic-script bridge for Gumroad checkout (window.APGumroad).
 * Mirrors website/js/gumroad-unlock.js product map so shop pages without
 * type=module can ask "is unlock live?" without inventing permalinks.
 *
 * Owner: replace REPLACE_ME with real Gumroad product_permalink codes
 * (same values as GUMROAD_PRODUCTS in gumroad-unlock.js).
 */
(function (w) {
  'use strict';

  var PRODUCTS = {
    'eclipse-reading': { permalink: 'REPLACE_ME', price: '£2.99' },
    'eclipse-set':     { permalink: 'REPLACE_ME', price: '£6' },
    'full-reading':    { permalink: 'REPLACE_ME', price: '£12' },
    'plate':           { permalink: 'REPLACE_ME', price: '£14' },
    'sky-pass':        { permalink: 'REPLACE_ME', price: '£5' },
  };

  function isReady(slug) {
    var p = PRODUCTS[slug];
    return !!(p && p.permalink && p.permalink !== 'REPLACE_ME');
  }

  function openCheckout(slug) {
    var p = PRODUCTS[slug];
    if (!isReady(slug)) {
      if (typeof w.AP_openEmailCapture === 'function') {
        w.AP_openEmailCapture('shop_gumroad_' + slug);
        return false;
      }
      console.warn('[APGumroad] Permalink not set for', slug, '— checkout stays dormant.');
      return false;
    }
    w.location.href = 'https://gumroad.com/l/' + p.permalink + '?wanted=true';
    return true;
  }

  w.APGumroad = {
    products: PRODUCTS,
    isReady: isReady,
    openCheckout: openCheckout,
    anyLive: function () {
      return Object.keys(PRODUCTS).some(isReady);
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
