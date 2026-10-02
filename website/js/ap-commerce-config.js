/* Paid tier and Payment Link slots.
   PAID_TIER_ENABLED must stay false until checkout is deliberately opened.
   PAYMENT_LINKS stay empty strings. Do not paste live Stripe keys or Payment Link URLs. */
(function (global) {
  'use strict';
  var PAID_TIER_ENABLED = false;
  var PAYMENT_LINKS = {
    'clean-sky-card': '',
    'seven-chapter-sitting': '',
    'next-month-note': ''
  };
  global.APCommerce = Object.freeze({
    PAID_TIER_ENABLED: PAID_TIER_ENABLED,
    PAYMENT_LINKS: Object.freeze(PAYMENT_LINKS),
    checkoutOpen: function (sku) {
      var link = PAYMENT_LINKS[sku];
      return PAID_TIER_ENABLED === true && typeof link === 'string' && link.length > 0;
    }
  });
})(window);
