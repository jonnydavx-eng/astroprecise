/**
 * Honest checkout helpers — never navigate to gumroad.com/l/REPLACE_ME
 * ---------------------------------------------------------------------------
 * v841 — Uses product_id from APGumroad bridge. Single eclipse edition.
 * Upgrades dead product links to Notify-me / email capture / shop anchors.
 * Works with APGumroad bridge when present; falls back safely.
 */
(function (w) {
  'use strict';

  function isDeadPermalink(href) {
    if (!href) return true;
    return /REPLACE_ME|gumroad\.com\/l\/REPLACE/i.test(href);
  }

  function isReady(slug) {
    if (w.APGumroad && typeof w.APGumroad.isReady === 'function') {
      return w.APGumroad.isReady(slug);
    }
    return false;
  }

  /**
   * @param {HTMLElement|string} elOrSel
   * @param {{ slug: string, notifyLabel?: string, shopHash?: string }} opts
   */
  function hardenButton(elOrSel, opts) {
    opts = opts || {};
    var el = typeof elOrSel === 'string' ? document.querySelector(elOrSel) : elOrSel;
    if (!el) return;
    var slug = opts.slug || '';
    var ready = slug && isReady(slug);

    if (ready && w.APGumroad && typeof w.APGumroad.openCheckout === 'function') {
      el.addEventListener('click', function (ev) {
        ev.preventDefault();
        w.APGumroad.openCheckout(slug);
      });
      return;
    }

    // Dormant-honest: no fake Gumroad URL
    if (el.tagName === 'A') {
      var hash = opts.shopHash || ('shop.html#' + (slug || 'featured'));
      if (!/^https?:/i.test(hash) && hash.indexOf('shop.html') === 0) {
        el.setAttribute('href', hash.indexOf('./') === 0 ? hash : './' + hash.replace(/^\//, ''));
      } else if (isDeadPermalink(el.getAttribute('href'))) {
        el.setAttribute('href', './shop.html' + (slug ? '#' + slug : ''));
      }
    }
    var label = opts.notifyLabel || 'NOTIFY ME WHEN CHECKOUT OPENS';
    if (el.childNodes.length === 1 && el.textContent && /£|UNLOCK|COMMISSION|BUY/i.test(el.textContent)) {
      el.textContent = label;
    }
    el.classList.add('ap-checkout-dormant');
    el.setAttribute('data-checkout', 'dormant');
    el.addEventListener('click', function (ev) {
      if (ready) return;
      // Prefer site email capture if present
      if (typeof w.AP_openEmailCapture === 'function') {
        ev.preventDefault();
        w.AP_openEmailCapture('checkout_' + (slug || 'unknown'));
        return;
      }
      // Allow navigation to shop notify anchors
      if (el.tagName === 'A' && /shop\.html/i.test(el.getAttribute('href') || '')) return;
      ev.preventDefault();
    });
  }

  function hardenAllDeadGumroad() {
    document.querySelectorAll('a[href*="gumroad.com/l/"]').forEach(function (a) {
      if (!isDeadPermalink(a.getAttribute('href'))) return;
      var slug = 'eclipse-edition';
      var h = (a.getAttribute('href') || '').toUpperCase();
      var t = (a.textContent || '').toUpperCase();
      if (/ECLIPSE/i.test(h) || /ECLIPSE/i.test(t)) slug = 'eclipse-edition';
      hardenButton(a, { slug: slug, shopHash: 'shop.html#eclipse-edition' });
    });
    // seller_id forms
    document.querySelectorAll('input[name="seller_id"][value*="REPLACE"]').forEach(function (inp) {
      var form = inp.closest('form');
      if (!form) return;
      form.addEventListener('submit', function (ev) {
        ev.preventDefault();
        if (typeof w.AP_openEmailCapture === 'function') {
          w.AP_openEmailCapture('eclipse_dawn_list');
        } else {
          alert('Checkout list not configured yet — follow Astro Precise on the shop page to be notified.');
        }
      });
      var btn = form.querySelector('button[type="submit"]');
      if (btn) btn.textContent = 'NOTIFY ME — LIST OPENS SOON';
    });
  }

  w.APCheckoutHonest = {
    hardenButton: hardenButton,
    hardenAllDeadGumroad: hardenAllDeadGumroad,
    isDeadPermalink: isDeadPermalink
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hardenAllDeadGumroad, { once: true });
  } else {
    hardenAllDeadGumroad();
  }
})(typeof window !== 'undefined' ? window : globalThis);