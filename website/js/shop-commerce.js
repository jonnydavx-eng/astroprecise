/**
 * AstroPrecise — Shop Commerce (window.AstroShop)
 * ─────────────────────────────────────────────────────────────────────────
 * A config-driven, privacy-clean shop for PERSONALISED-per-chart products
 * ("wear your sky") and digital readings. Ported from The Bigger Picture's
 * cart/shop architecture and re-themed for astrology.
 *
 * Catalogue + checkout config live in window.AP_MON.commerce (js/app.js).
 * Everything is ONE-TIME purchase, no subscriptions. The cart is real and
 * saved locally (key 'ap_cart'); nothing but a volunteered email ever leaves
 * the device, and NEVER any birth data. Checkout fulfils elsewhere
 * (hosted store / Etsy / Gelato / Gumroad), so the site never takes money —
 * GitHub-Pages-compliant, link-out only until configured.
 *
 * Checkout priority (honest fallback chain):
 *   1. product.fulfilUrl            — that product's own hosted listing
 *   2. checkout.externalStoreUrl    — whole-cart handoff to a hosted store
 *      / checkout.etsyUrl           — Etsy storefront
 *   3. checkout.paypalClientId      — on-site PayPal Buttons
 *   4. (none set) — DORMANT branded modal that invites email signup.
 *      Never a fake or broken checkout.
 */

'use strict';

window.AstroShop = (() => {

  const esc = (window.AP_SAFE && window.AP_SAFE.esc)
    ? s => window.AP_SAFE.esc(s)
    : s => String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const CART_KEY = 'ap_cart';

  // ── Focus-trap helper (shared by cart drawer + quick-view modal) ─────────
  // Keeps Tab/Shift+Tab cycling inside `container` while a dialog is open, and
  // marks the rest of the page inert so screen-reader + keyboard users can't
  // wander out. Returns a release() that restores everything.
  const FOCUSABLE_SEL = [
    'a[href]', 'button:not([disabled])', 'input:not([disabled])',
    'select:not([disabled])', 'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');

  function focusableWithin(container) {
    if (!container) return [];
    return Array.prototype.filter.call(
      container.querySelectorAll(FOCUSABLE_SEL),
      el => el.offsetParent !== null || el.getClientRects().length > 0
    );
  }

  // Page chrome that should become inert while a dialog is open. Excludes the
  // dialogs + cart chrome themselves so focus can still move within them.
  function pageChromeRoots(except) {
    const roots = [
      document.querySelector('.site-header'),
      document.getElementById('main-content'),
      document.querySelector('.site-footer'),
      document.querySelector('footer'),
    ];
    const cart = document.getElementById('shopc-cart');
    const toggle = document.querySelector('.shopc-cart-toggle');
    if (except !== cart && cart) roots.push(cart);
    if (toggle) roots.push(toggle);
    return roots.filter((el, i, a) => el && el !== except && a.indexOf(el) === i);
  }

  function setChromeInert(except, on) {
    pageChromeRoots(except).forEach(el => {
      if (on) {
        try { el.inert = true; } catch (e) {}
        el.setAttribute('aria-hidden', 'true');
      } else {
        try { el.inert = false; } catch (e) {}
        el.removeAttribute('aria-hidden');
      }
    });
  }

  function trapFocus(container, opts = {}) {
    if (!container) return () => {};
    const prevFocus = opts.returnTo || document.activeElement;
    setChromeInert(container, true);

    const initial = opts.initialFocus
      || focusableWithin(container)[0]
      || container;
    try { initial.focus(); } catch (e) {}

    function onKeydown(e) {
      if (e.key !== 'Tab') return;
      // If a quick-view modal is open on top of THIS container (e.g. the cart
      // drawer launches the checkout modal), let the modal's own trap own Tab.
      const modalEl = document.getElementById('shopc-modal');
      if (modalEl && modalEl.classList.contains('open') && !modalEl.contains(container)) return;
      const items = focusableWithin(container);
      if (!items.length) { e.preventDefault(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey) {
        if (active === first || !container.contains(active)) {
          e.preventDefault(); last.focus();
        }
      } else if (active === last || !container.contains(active)) {
        e.preventDefault(); first.focus();
      }
    }
    document.addEventListener('keydown', onKeydown, true);

    return function release() {
      document.removeEventListener('keydown', onKeydown, true);
      setChromeInert(container, false);
      if (prevFocus && typeof prevFocus.focus === 'function') {
        try { prevFocus.focus(); } catch (e) {}
      }
    };
  }

  // ── Config access ──────────────────────────────────────────────────────
  const cfg        = () => (window.AP_MON && window.AP_MON.commerce) || {};
  const products   = () => cfg().products || [];
  const collections = () => cfg().collections || {};
  const checkout   = () => cfg().checkout || {};
  const isUrl      = u => typeof u === 'string' && /^https?:\/\//i.test(u.trim());

  const CURRENCY_SYM = { GBP: '£', USD: '$', EUR: '€' };
  function formatPrice(n) {
    const code = String(checkout().currency || 'GBP').toUpperCase();
    const sym = CURRENCY_SYM[code] || (code + ' ');
    return `${sym}${Number(n).toFixed(2)}`;
  }

  function productById(id) { return products().find(p => p.id === id) || null; }
  function isLive(p) { return !!(p && isUrl(p.fulfilUrl)); }

  // JSON-LD ItemAvailability — must match UI buy/dormant gate (isLive / isUrl(fulfilUrl)).
  // Buy buttons, featured CTAs, and cart checkout all use isLive(p); schema must not
  // advertise InStock when the UI would show Coming soon or hide the SKU.
  const SCHEMA_AVAIL = {
    InStock:    'https://schema.org/InStock',
    OnlineOnly: 'https://schema.org/OnlineOnly',
    PreOrder:   'https://schema.org/PreOrder',
    OutOfStock: 'https://schema.org/OutOfStock',
  };
  function schemaAvailability(p) {
    if (!p || p.available === false) return SCHEMA_AVAIL.OutOfStock;
    if (!isLive(p)) return SCHEMA_AVAIL.PreOrder;
    const override = p.schemaAvailability && SCHEMA_AVAIL[p.schemaAvailability];
    if (override) return override;
    return p.type === 'digital' ? SCHEMA_AVAIL.OnlineOnly : SCHEMA_AVAIL.InStock;
  }
  function sortProducts(list) {
    return list.slice().sort((a, b) => {
      const la = isLive(a) ? 0 : 1;
      const lb = isLive(b) ? 0 : 1;
      if (la !== lb) return la - lb;
      const fa = a.featured ? 0 : 1;
      const fb = b.featured ? 0 : 1;
      if (fa !== fb) return fa - fb;
      return (b.price || 0) - (a.price || 0);
    });
  }

  // ── Icons ──────────────────────────────────────────────────────────────
  // Re-use the site's engraved icon system (#ei-* symbols injected by app.js).
  function icon(name, cls) {
    return `<svg class="eng-i ${cls || ''}" aria-hidden="true"><use href="#ei-${name || 'star4'}"/></svg>`;
  }

  // ── Type labels ─────────────────────────────────────────────────────────
  const TYPE_LABEL = {
    digital:   'Digital',
    print:     'Print',
    apparel:   'Apparel',
    accessory: 'Accessory',
  };

  // ── Saved-chart preview (personalised products) ──────────────────────────
  // Reads only what's already in localStorage via the public AstroProfile API.
  // Never sends birth data anywhere — used purely to reassure the visitor that
  // a personalised piece will be drawn from THEIR sky.
  function savedChart() {
    try {
      const list = window.AstroProfile && AstroProfile.getCharts ? AstroProfile.getCharts() : [];
      return (list && list.length) ? list[0] : null;
    } catch (e) { return null; }
  }

  function chartLabel(c) {
    if (!c) return '';
    const bits = [
      c.sunSign && `☉ ${esc(c.sunSign)}`,
      c.moonSign && `☽ ${esc(c.moonSign)}`,
      c.risingSign && `↑ ${esc(c.risingSign)}`,
    ].filter(Boolean);
    return bits.join('   ·   ');
  }

  // ── Dynamic mini-chart preview (simplified from saved profile; falls back to seals)
  // Uses AstroChartRender.renderNatalChart(wheelOnly) when the module is present (lazy),
  // otherwise a compact Big-Three seal strip from the saved chart (no extra deps).
  // This powers jewellery + other personalised cards with live "your sky" visual.
  function miniChartPreviewHtml(p) {
    if (!p || !p.personalized) return '';
    const c = savedChart();
    if (!c) return '';
    const seals = (sign) => {
      if (!sign) return '';
      const Z = (window.AP_ZODIAC && window.AP_ZODIAC.SIGN_SLUG) || {};
      const slug = Z[sign] || sign.toLowerCase().replace(/\s+/g,'');
      return `<img src="assets/images/seals/zodiac/${slug}.svg" alt="${esc(sign)}" width="22" height="22" loading="lazy" />`;
    };
    const big3 = `
      <span class="shop-mini-seal" title="Sun">${seals(c.sunSign)}<small>☉</small></span>
      <span class="shop-mini-seal" title="Moon">${seals(c.moonSign)}<small>☽</small></span>
      <span class="shop-mini-seal" title="Rising">${seals(c.risingSign)}<small>↑</small></span>
    `;
    // Container for optional full render (chart-render driven mini wheel)
    return `
      <div class="shop-mini-chart-preview" data-product="${esc(p.id)}" data-has-chart="1">
        <div class="shop-mini-chart__big3">${big3}</div>
        <div class="shop-mini-chart__wheel" data-mini-wheel="${esc(p.id)}" aria-hidden="true"></div>
        <span class="shop-mini-chart__label">Live preview from your saved chart</span>
      </div>`;
  }

  // After grid render, optionally hydrate a true mini wheel via existing chart-render.js
  function hydrateMiniChartPreviews() {
    const wheels = document.querySelectorAll('[data-mini-wheel]');
    if (!wheels.length) return;
    const chart = savedChart();
    if (!chart || !chart.positions) return; // needs full data from AstroEphemeris shape
    if (!window.AstroChartRender || typeof AstroChartRender.renderNatalChart !== 'function') {
      // Not loaded on this page (perf); simplified seals above are sufficient for shop.
      return;
    }
    wheels.forEach(w => {
      const pid = w.dataset.miniWheel;
      // unique id per card to avoid collision with main chart page
      const tmpId = 'shop-mini-' + pid + '-' + Math.random().toString(36).slice(2);
      w.id = tmpId;
      try {
        AstroChartRender.renderNatalChart(
          { positions: chart.positions, houses: chart.houses || [], aspects: chart.aspects || [], name: chart.name },
          tmpId,
          { wheelOnly: true }
        );
        w.style.width = '72px';
        w.style.height = '72px';
      } catch (e) { /* keep seals fallback */ }
    });
  }

  // The note shown on a personalised product: if a chart is saved we name it;
  // otherwise we honestly say one will be needed. We do NOT try to call the
  // chart-page share-image painter — it is closure-private to chart-page.js and
  // not reachable here — so we describe the personalisation rather than fake it.
  function personalNote(p) {
    if (!p || !p.personalized) return '';
    const c = savedChart();
    if (c) {
      const mini = miniChartPreviewHtml(p);
      return `
        <div class="shopc-personal">
          <div class="shopc-personal__head">${icon('star4')} Made from your chart</div>
          <p class="shopc-personal__chart">${c.name ? esc(c.name) + ' — ' : ''}${chartLabel(c) || 'your saved chart'}</p>
          ${mini}
          <p class="shopc-personal__note">This piece is generated from your saved birth chart. Your birth details never leave this device — only the finished art is produced when you order.</p>
        </div>`;
    }
    return `
      <div class="shopc-personal shopc-personal--empty">
        <div class="shopc-personal__head">${icon('star4')} Made from your chart</div>
        <p class="shopc-personal__note">Each one is generated from your own birth chart. <a href="chart.html">Calculate &amp; save your chart</a> first and we'll build this from your exact sky — your birth details never leave your device.</p>
      </div>`;
  }

  // Gift affordance: shown only for products flagged giftNote:true. Collects
  // NOTHING on-site — it explains that the gift note and the recipient's birth
  // details are taken at the external checkout, keeping birth data off this site.
  function giftNoteHtml() {
    return `
      <div class="shopc-personal shopc-gift">
        <div class="shopc-personal__head">${icon('heart')} A gift for someone else</div>
        <p class="shopc-personal__note">At checkout you'll add your gift message and choose a delivery date. We send a PDF gift voucher — the recipient redeems it by email and gives us <em>their own</em> birth details, so no birth data is ever entered here. Their sky, their privacy.</p>
      </div>`;
  }

  function bundlePerksHtml(p) {
    if (!p || !p.bundlePerks || !p.bundlePerks.length) return '';
    const items = p.bundlePerks.map(perk =>
      `<li class="shopc-perks__item">${icon('star4')} ${esc(perk)}</li>`
    ).join('');
    return `
      <ul class="shopc-perks" aria-label="Bundle includes">
        ${items}
      </ul>`;
  }

  function readingPrefsHtml(p) {
    if (!p || !p.personalized) return '';
    if (!window.APReadingPrefs || typeof APReadingPrefs.prefsFormHtml !== 'function') return '';
    return APReadingPrefs.prefsFormHtml();
  }

  function checkoutHref(p) {
    if (!p || !isUrl(p.fulfilUrl)) return '';
    let url = p.fulfilUrl;
    if (window.APReadingPrefs && APReadingPrefs.appendToCheckoutUrl) {
      url = APReadingPrefs.appendToCheckoutUrl(url, p.id);
    }
    if (window.APPostPurchase && APPostPurchase.markPurchase) {
      /* purchase intent recorded on click via wireCheckoutTracking */
    }
    return url;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // CART — localStorage-backed, mirrors the TBP Cart but re-themed.
  // ═══════════════════════════════════════════════════════════════════════
  class Cart {
    constructor() {
      this.items = this.load();
    }

    load() {
      try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
      catch (e) { return []; }
    }
    save() {
      try { localStorage.setItem(CART_KEY, JSON.stringify(this.items)); } catch (e) {}
    }

    total() { return this.items.reduce((s, i) => s + i.price * i.qty, 0); }
    count() { return this.items.reduce((s, i) => s + i.qty, 0); }

    add(product, opts = {}) {
      if (!product || product.available === false) return;
      if (!isLive(product)) {
        toast('Coming soon', `${product.name} isn\u2019t live yet \u2014 we\u2019ll notify you when checkout opens.`, 'info', 5000);
        return;
      }
      const variant = opts.variant || '';
      const key = `${product.id}${variant ? '-' + variant : ''}`;
      const existing = this.items.find(i => i.key === key);
      if (existing) {
        existing.qty += 1;
      } else {
        this.items.push({
          key,
          id:           product.id,
          name:         product.name,
          price:        product.price,
          type:         product.type,
          variant,
          personalized: !!product.personalized,
          qty:          1,
        });
      }
      this.save();
      this.render();
      flashAddButton(opts.sourceBtn);
      toast(`${product.name}${variant ? ' (' + variant + ')' : ''} added to cart`);
    }

    remove(key) {
      this.items = this.items.filter(i => i.key !== key);
      this.save();
      this.render();
    }

    setQty(key, qty) {
      const it = this.items.find(i => i.key === key);
      if (!it) return;
      it.qty = Math.max(1, qty | 0);
      this.save();
      this.render();
    }

    clear() {
      this.items = [];
      this.save();
      this.render();
    }

    // ── Cart drawer rendering ──────────────────────────────────────────────
    render() {
      const count = this.count();
      const increased = count > (this._lastCount == null ? 0 : this._lastCount);
      document.querySelectorAll('[data-cart-count]').forEach(el => {
        el.textContent = count;
        el.style.display = count > 0 ? '' : 'none';
        // Re-trigger the bump animation when the count goes up (remove → reflow
        // → re-add so the keyframe restarts even on consecutive adds).
        if (increased) {
          el.classList.remove('is-bumped');
          void el.offsetWidth;
          el.classList.add('is-bumped');
        }
      });
      this._lastCount = count;

      // a11y: the numeric badge is aria-hidden, so name the FAB itself with the
      // live item count — screen-reader users otherwise get only "Open cart".
      document.querySelectorAll('.shopc-cart-toggle[data-cart-toggle]').forEach(fab => {
        fab.setAttribute('aria-label', count > 0
          ? `Open cart, ${count} item${count === 1 ? '' : 's'}`
          : 'Open cart');
      });

      const itemsEl = document.getElementById('shopc-cart-items');
      const totalEl = document.getElementById('shopc-cart-total');
      if (totalEl) totalEl.textContent = formatPrice(this.total());
      if (!itemsEl) return;

      if (this.items.length === 0) {
        itemsEl.innerHTML = `<div class="shopc-cart__empty">${icon('orb')}<p>Your cart is empty.</p><small>Find a piece made from your sky.</small></div>`;
        return;
      }

      itemsEl.innerHTML = this.items.map(i => {
        const p = productById(i.id);
        return `
          <div class="shopc-cart__item">
            <div class="shopc-cart__icon">${icon(p ? p.icon : 'star4')}</div>
            <div class="shopc-cart__info">
              <div class="shopc-cart__name">${esc(i.name)}</div>
              <div class="shopc-cart__meta">${i.personalized ? 'From your chart · ' : ''}${TYPE_LABEL[i.type] || ''}${i.variant ? ' · ' + esc(i.variant) : ''}</div>
              <div class="shopc-cart__qtyrow">
                <button class="shopc-qty" data-qty-dec="${esc(i.key)}" aria-label="Decrease quantity">−</button>
                <span class="shopc-qty__n">${i.qty}</span>
                <button class="shopc-qty" data-qty-inc="${esc(i.key)}" aria-label="Increase quantity">+</button>
                <span class="shopc-cart__price">${formatPrice(i.price * i.qty)}</span>
              </div>
            </div>
            <button class="shopc-cart__remove" data-remove-key="${esc(i.key)}" aria-label="Remove ${esc(i.name)}">×</button>
          </div>`;
      }).join('');
    }

    toggle() {
      const drawer = document.getElementById('shopc-cart');
      if (!drawer) return;
      drawer.classList.contains('open') ? this.close() : this.open();
    }
    open() {
      const drawer = document.getElementById('shopc-cart');
      const ov = document.getElementById('shopc-cart-overlay');
      if (!drawer) return;
      drawer.classList.add('open');
      ov && ov.classList.add('open');
      this.render();
      // a11y: remember opener, trap focus, move it to the close button.
      this._opener = document.activeElement;
      const closeBtn = drawer.querySelector('[data-cart-close]');
      this._release = trapFocus(drawer, { initialFocus: closeBtn, returnTo: this._opener });
    }
    close() {
      const drawer = document.getElementById('shopc-cart');
      const ov = document.getElementById('shopc-cart-overlay');
      drawer && drawer.classList.remove('open');
      ov && ov.classList.remove('open');
      if (this._release) { this._release(); this._release = null; }
    }

    // ── CHECKOUT (priority chain) ──────────────────────────────────────────
    checkoutNow() {
      if (this.items.length === 0) return;
      const co = checkout();
      const liveItems = this.items.filter(i => {
        const p = productById(i.id);
        return p && isLive(p);
      });
      const dormantItems = this.items.filter(i => !liveItems.includes(i));

      if (liveItems.length === 1 && dormantItems.length === 0) {
        const p = productById(liveItems[0].id);
        if (p) {
          if (window.APPostPurchase && APPostPurchase.markPurchase) APPostPurchase.markPurchase(p.id);
          window.open(checkoutHref(p), '_blank', 'noopener');
        }
        return;
      }
      if (liveItems.length > 0) {
        this.liveCheckoutModal(liveItems, dormantItems);
        return;
      }

      if (isUrl(co.externalStoreUrl)) {
        window.open(co.externalStoreUrl, '_blank', 'noopener');
        return;
      }
      if (isUrl(co.etsyUrl)) {
        window.open(co.etsyUrl, '_blank', 'noopener');
        return;
      }

      this.dormantModal();
    }

    liveCheckoutModal(liveItems, dormantItems) {
      const rows = liveItems.map(i => {
        const p = productById(i.id);
        const url = p ? checkoutHref(p) : '';
        return `<div class="shopc-checkout__row"><span>${esc(i.name)} × ${i.qty}</span><span>${formatPrice(i.price * i.qty)}</span></div>
          ${url ? `<p class="shopc-modal__note" style="margin:-2px 0 10px;"><a href="${esc(url)}" target="_blank" rel="noopener" data-ap-product="${esc(i.id)}">Secure checkout →</a></p>` : ''}`;
      }).join('');
      const dormantNote = dormantItems.length
        ? `<p class="shopc-modal__note" style="color:var(--oxblood,#b04a52);">${dormantItems.length} coming-soon item${dormantItems.length === 1 ? '' : 's'} in your cart — checkout those when they launch.</p>`
        : '';
      modal({
        title: 'Complete your order',
        body: `
          <div class="shopc-checkout">${rows}
            <div class="shopc-checkout__row shopc-checkout__total"><span>Live items</span><span>${formatPrice(liveItems.reduce((s, i) => s + i.price * i.qty, 0))}</span></div>
          </div>
          <p class="shopc-modal__note">Each live piece checks out securely on Lemon Squeezy — birth details are collected there, never on this site. Personalised PDFs are generated from your chart after purchase.</p>
          ${dormantNote}`,
        actions: liveItems.map(i => {
          const p = productById(i.id);
          return p && isLive(p)
            ? { label: `Buy ${i.name.split('—')[0].trim()}`, primary: true, href: checkoutHref(p), external: true, productId: p.id }
            : null;
        }).filter(Boolean).slice(0, 3),
      });
    }

    dormantModal() {
      const n = this.count();
      const anyPersonal = this.items.some(i => i.personalized);
      modal({
        title: 'Coming soon',
        body: `
          <p>Your cart is saved on this device — <strong>${n} item${n === 1 ? '' : 's'} · ${formatPrice(this.total())}</strong>.</p>
          <p class="shopc-modal__note">These pieces aren't live yet. ${anyPersonal ? 'Every personalised piece is generated from your own chart — your birth details never leave your device. ' : ''}Leave your email and we'll tell you when they launch.</p>
          ${emailInviteHtml()}
        `,
        actions: [
          { label: 'Keep my cart', primary: true },
        ],
        onMount: bindEmailInvite,
      });
    }

    // PayPal Buttons in a modal (active once checkout.paypalClientId is set).
    async paypalCheckout() {
      const co = checkout();
      const currency = co.currency || 'GBP';
      const itemTotal = this.total();
      const items = this.items.map(i => ({
        name: `${i.name}${i.variant ? ' (' + i.variant + ')' : ''}`,
        quantity: String(i.qty),
        unit_amount: { value: i.price.toFixed(2), currency_code: currency },
      }));

      modal({
        title: 'Checkout',
        body: `
          <div class="shopc-checkout">
            ${this.items.map(i => `<div class="shopc-checkout__row"><span>${esc(i.name)}${i.variant ? ' (' + esc(i.variant) + ')' : ''} × ${i.qty}</span><span>${formatPrice(i.price * i.qty)}</span></div>`).join('')}
            <div class="shopc-checkout__row shopc-checkout__total"><span>Total</span><span>${formatPrice(itemTotal)}</span></div>
          </div>
          <p class="shopc-modal__note">Personalised pieces are produced from your saved chart after purchase. Your birth details never leave your device.</p>
          <div id="shopc-paypal"><p class="shopc-modal__note">Loading secure checkout…</p></div>`,
        actions: [],
      });

      try {
        const paypal = await loadPayPal(co.paypalClientId, currency);
        const host = document.getElementById('shopc-paypal');
        if (!host) return;
        host.innerHTML = '';
        paypal.Buttons({
          style: { color: 'gold', shape: 'rect', label: 'pay', height: 45 },
          createOrder: (data, actions) => actions.order.create({
            purchase_units: [{
              description: 'AstroPrecise — order',
              amount: {
                value: itemTotal.toFixed(2),
                currency_code: currency,
                breakdown: { item_total: { value: itemTotal.toFixed(2), currency_code: currency } },
              },
              items,
            }],
          }),
          onApprove: (data, actions) => actions.order.capture().then(details => {
            this.clear();
            this.close();
            modal({
              title: 'Order received',
              body: `<p>Thank you${details && details.payer && details.payer.name ? ', ' + esc(details.payer.name.given_name) : ''}.</p>
                     <p>Order <strong>${details && details.id ? esc(details.id) : ''}</strong> is confirmed. Personalised pieces are generated from your saved chart and a receipt is on its way to your inbox.</p>`,
              actions: [{ label: 'Done', primary: true }],
            });
          }),
          onError: () => toast('Checkout hit a snag — nothing was charged. Try again.'),
        }).render('#shopc-paypal');
      } catch (e) {
        const host = document.getElementById('shopc-paypal');
        if (host) host.innerHTML = '<p class="shopc-modal__note" style="color:var(--oxblood,#b04a52)">Could not load checkout. Check your connection and try again.</p>';
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // GRID + QUICK VIEW
  // ═══════════════════════════════════════════════════════════════════════
  let activeCollection = 'all';
  // True once renderGrid has done a full innerHTML render (replacing the baked
  // static cards). Until then the 'all' view keeps the static cards and only
  // wires handlers; a filter change still triggers a full re-render.
  let gridJsRendered = false;

  const PREVIEW_FALLBACK = {
    digital:   'img/shop/product-deep-reading.jpg',
    print:     'img/shop/product-poster-pdf.jpg',
    apparel:   'img/shop/hero-banner.jpg',
    accessory: 'img/shop/cat-jewelry.jpg',
  };

  function cardArt(p) {
    const src = p.previewImage || PREVIEW_FALLBACK[p.type] || '';
    if (src) {
      const bust = src.includes('?') ? src : `${src}?v=151`;
      return `<img class="shopc-card__preview" src="${esc(bust)}" alt="" width="1600" height="900" loading="lazy" decoding="async" />`;
    }
    return `<span class="shopc-card__glyph">${icon(p.icon)}</span>`;
  }

  function priceHtml(p) {
    const live = isLive(p);
    if (!live) return `<span class="shopc-card__price shopc-card__price--soon">Coming soon</span>`;
    if (p.anchorWas && p.anchorWas > p.price) {
      return `<span class="shopc-card__price"><s class="shopc-card__was">${formatPrice(p.anchorWas)}</s> ${formatPrice(p.price)}</span>`;
    }
    return `<span class="shopc-card__price">${formatPrice(p.price)}</span>`;
  }

  function featuredCard(p, opts = {}) {
    const live = isLive(p);
    const hero = !!opts.hero;
    const cols = collections();
    const colName = cols[p.collection] ? cols[p.collection].name : '';
    const cta = live
      ? `<a class="btn btn--primary shopc-featured__cta" href="${esc(checkoutHref(p))}" target="_blank" rel="noopener" data-ap-product="${esc(p.id)}">Get yours — ${formatPrice(p.price)}</a>`
      : `<button class="btn btn--outline shopc-featured__cta" data-quickview="${p.id}">Preview piece</button>`;
    const sample = p.sampleUrl
      ? `<a class="shopc-featured__sample" href="${esc(p.sampleUrl)}" target="_blank" rel="noopener">See sample layout →</a>`
      : '';
    const save = (p.anchorWas && p.anchorWas > p.price)
      ? `<span class="shopc-featured__save">Save ${formatPrice(p.anchorWas - p.price)}</span>`
      : '';
    return `
      <article class="shopc-featured__card ${hero ? 'shopc-featured__card--hero' : ''}" data-product-id="${p.id}">
        <button type="button" class="shopc-featured__visual" data-quickview="${p.id}">
          <span class="sr-only">Quick view ${esc(p.name)}</span>
          ${cardArt(p)}
          ${p.badge ? `<span class="shopc-card__badge${hero ? '' : ' shopc-card__badge--quiet'}">${esc(p.badge)}</span>` : ''}
          ${save}
        </button>
        <div class="shopc-featured__copy">
          <p class="shopc-featured__kicker">${esc(colName)} · ${live ? 'Available now' : 'Coming soon'}</p>
          <h3 class="shopc-featured__name">${esc(p.name)}</h3>
          ${p.marketingLine ? `<p class="shopc-featured__hook">${esc(p.marketingLine)}</p>` : ''}
          ${bundlePerksHtml(p)}
          <p class="shopc-featured__blurb">${esc(p.blurb)}</p>
          <div class="shopc-featured__foot">
            ${priceHtml(p)}
            <div class="shopc-featured__actions">
              ${cta}
              ${live ? `<button class="btn btn--outline shopc-featured__cart" data-add-cart="${p.id}">Add to cart</button>` : ''}
            </div>
          </div>
          ${sample}
        </div>
      </article>`;
  }

  const FEATURED_ORDER = ['deep-reading', 'reading-poster-bundle', 'natal-poster-pdf'];

  function renderFeatured() {
    const host = document.getElementById('shopc-featured');
    if (!host) return;

    // Static HTML in shop.html paints instantly — only wire interactivity.
    if (host.querySelector('.shopc-featured__grid')) {
      bindFeatured(host);
      renderPersonalBanner();
      return;
    }

    const featured = FEATURED_ORDER
      .map(id => productById(id))
      .filter(p => p && p.available !== false && isLive(p));
    if (!featured.length) {
      host.innerHTML = '';
      host.hidden = true;
      return;
    }
    host.hidden = false;
    const bundle = featured.find(p => p.id === 'reading-poster-bundle');
    const others = featured.filter(p => p.id !== 'reading-poster-bundle');
    host.innerHTML = `<div class="container">
      <div class="shopc-featured__intro">
        <h2 class="shop-section-title"><svg class="eng-i" aria-hidden="true"><use href="#ei-star4"/></svg> Available now — ${products().filter(p => p.available !== false && isLive(p)).length} live pieces</h2>
        <p class="shopc-featured__lede">Every SKU is personalised from <strong>your</strong> birth chart — PDFs in 24–48h, prints &amp; apparel made to order. Secure Lemon Squeezy checkout.</p>
      </div>
      <div class="shopc-featured__grid shopc-featured__grid--equal">
        ${others[0] ? featuredCard(others[0]) : ''}
        ${bundle ? featuredCard(bundle, { hero: true }) : ''}
        ${others[1] ? featuredCard(others[1]) : ''}
      </div>
      <ul class="shopc-trust">
        <li class="shopc-trust__item">${icon('gem')} Museum-grade 250gsm prints</li>
        <li class="shopc-trust__item">${icon('star4')} VSOP87 + ELP2000 engine</li>
        <li class="shopc-trust__item">${icon('orb')} Secure Lemon Squeezy checkout</li>
        <li class="shopc-trust__item">${icon('map')} PDFs in 24–48 hours</li>
        <li class="shopc-trust__item">${icon('heart')} Birth data never on this site</li>
      </ul>
    </div>`;
    bindFeatured(host);
    renderPersonalBanner();
  }

  // Single source of truth for the user-facing "live pieces" count.
  // Counts products that are buyable RIGHT NOW (available && isLive, i.e.
  // fulfilUrl set) — the same gate the buy buttons / cart / schema use — and
  // writes it into every [data-live-count] element in the page. The static
  // HTML ships the correct literal (13) as a no-JS fallback; this keeps it from
  // drifting when products go live or a fulfilUrl is added/removed in AP_MON.
  function liveProductCount() {
    return products().filter(p => p.available !== false && isLive(p)).length;
  }
  function updateLiveCounts() {
    const nodes = document.querySelectorAll('[data-live-count]');
    if (!nodes.length) return;
    const n = liveProductCount();
    if (!n) return; // never blank the fallback if config failed to load
    nodes.forEach(el => { el.textContent = String(n); });
  }

  function renderPersonalBanner() {
    const el = document.getElementById('shopc-personal');
    if (!el) return;
    const c = savedChart();
    if (c) {
      el.innerHTML = `
        <div class="shopc-personal">
          <div class="shopc-personal__head">${icon('star4')} Your chart is ready</div>
          <p class="shopc-personal__chart">${c.name ? esc(c.name) + ' — ' : ''}${chartLabel(c) || 'saved chart'}</p>
          <p class="shopc-personal__note">Every live product below is generated from this chart after purchase. Your birth details stay on this device.</p>
        </div>`;
    } else {
      el.innerHTML = `
        <div class="shopc-personal shopc-personal--empty">
          <div class="shopc-personal__head">${icon('star4')} Start with your sky</div>
          <p class="shopc-personal__note"><a href="chart.html">Cast &amp; save your birth chart</a> first — personalised pieces are built from your exact placements, and nothing leaves your browser until checkout.</p>
        </div>`;
    }
  }

  function bindFeatured(host) {
    host.querySelectorAll('[data-quickview]').forEach(el => {
      const open = () => openQuickView(el.dataset.quickview);
      el.addEventListener('click', e => { e.stopPropagation(); open(); });
      if (el.tagName !== 'BUTTON' && el.tagName !== 'A') {
        el.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
        });
      }
    });
    host.querySelectorAll('[data-add-cart]').forEach(el => {
      el.addEventListener('click', () => {
        const p = productById(el.dataset.addCart);
        if (p) cart.add(p, { sourceBtn: el });
      });
    });
  }

  function renderFilters() {
    const bar = document.getElementById('shopc-filters');
    if (!bar) return;
    const cols = collections();
    // Only show a collection chip if it has at least one fulfillable (live) product.
    // A collection of coming-soon placeholders only (e.g. Jewellery) stays hidden so
    // chips never dead-end on unbuyable SKUs.
    const counts = {};
    products().filter(p => p.available !== false && isLive(p)).forEach(p => { counts[p.collection] = (counts[p.collection] || 0) + 1; });
    const chips = [['all', 'All']].concat(Object.entries(cols).filter(([k]) => counts[k] > 0).map(([k, c]) => [k, c.name]));
    bar.innerHTML = chips.map(([key, label]) =>
      `<button type="button" class="shopc-chip ${key === activeCollection ? ' active' : ''}" data-collection="${key}" aria-pressed="${key === activeCollection ? 'true' : 'false'}">${esc(label)}</button>`
    ).join('');
    bar.querySelectorAll('.shopc-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        activeCollection = chip.dataset.collection;
        bar.querySelectorAll('.shopc-chip').forEach(c => {
          const on = c.dataset.collection === activeCollection;
          c.classList.toggle('active', on);
          c.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        renderStory();
        renderGrid();
      });
    });
    renderStory();
  }

  function renderStory() {
    const el = document.getElementById('shopc-story');
    if (!el) return;
    const cols = collections();
    el.textContent = activeCollection === 'all'
      ? 'Every piece is made from your own birth chart — your sun, your moon, the exact sky of your first breath.'
      : (cols[activeCollection] && cols[activeCollection].story) || '';
  }

  // Wire the delegated quickview + add-cart click handlers onto whatever
  // `.shopc-card` elements currently live in the grid. Used both after a full
  // innerHTML render and on the keep-static fast path (baked cards).
  function wireGridHandlers(grid) {
    grid.querySelectorAll('[data-quickview]').forEach(el => {
      const open = () => openQuickView(el.dataset.quickview);
      el.addEventListener('click', e => { e.stopPropagation(); open(); });
      if (el.tagName !== 'BUTTON' && el.tagName !== 'A') {
        el.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
        });
      }
    });

    grid.querySelectorAll('[data-add-cart]').forEach(el => {
      el.addEventListener('click', e => {
        e.stopPropagation();
        const p = productById(el.dataset.addCart);
        if (p) cart.add(p, { sourceBtn: el });
      });
    });
  }

  function renderGrid() {
    gridHydrated = true;
    const grid = document.getElementById('shopc-grid');
    if (!grid) return;

    // Keep-static fast path: the 'all' view ships baked `.shopc-card--live`
    // cards that are already purchasable on first paint. If they haven't been
    // replaced by a JS render yet, don't rebuild innerHTML — just wire the
    // delegated handlers on the existing cards and return. A later filter
    // change still runs the full re-render below (gridJsRendered flips true
    // whenever an innerHTML render runs).
    if (activeCollection === 'all' && !gridJsRendered && grid.querySelector('.shopc-card--live')) {
      wireGridHandlers(grid);
      try { hydrateMiniChartPreviews(); } catch (_) {}
      return;
    }

    const all = products();
    if (!all.length) {
      grid.innerHTML = `<p class="shopc-empty">The collection is being prepared. Check back soon.</p>`;
      return;
    }
    const cols = collections();
    // Honesty: never show a price / cart for a product we can't fulfil.
    // Mark unbuildable SKUs `available:false` in AP_MON.commerce.products.
    const sellable = sortProducts(all.filter(p => p.available !== false));
    const list = activeCollection === 'all' ? sellable : sellable.filter(p => p.collection === activeCollection);
    const liveList = list.filter(p => isLive(p) && !(activeCollection === 'all' && p.featured));
    const soonList = list.filter(p => !isLive(p));

    const renderCard = p => {
      const colName = cols[p.collection] ? cols[p.collection].name : '';
      const live = isLive(p);
      const cta = live
        ? `<div class="shopc-card__actions"><a class="btn btn--primary shopc-card__cta" href="${esc(checkoutHref(p))}" target="_blank" rel="noopener" data-ap-product="${esc(p.id)}">Buy now</a><button type="button" class="btn btn--outline shopc-card__addcart" data-add-cart="${p.id}">Add to cart</button></div>`
        : `<button class="btn btn--outline shopc-card__cta" data-quickview="${p.id}">Notify me</button>`;
      const hook = p.marketingLine ? `<p class="shopc-card__hook">${esc(p.marketingLine)}</p>` : '';
      return `
        <article class="shopc-card ${live ? 'shopc-card--live' : 'shopc-card--soon'}" data-product-id="${p.id}">
          <button type="button" class="shopc-card__art" data-quickview="${p.id}">
            <span class="sr-only">Quick view ${esc(p.name)}</span>
            ${cardArt(p)}
            ${p.badge ? `<span class="shopc-card__badge shopc-card__badge--quiet">${esc(p.badge)}</span>` : ''}
            ${p.personalized ? `<span class="shopc-card__personal" title="Generated from your chart">${icon('star4')} Your chart</span>` : ''}
          </button>
          <div class="shopc-card__body">
            <div class="shopc-card__kicker">${esc(colName)}${p.type ? ' · ' + (TYPE_LABEL[p.type] || '') : ''}${live ? ' · Live' : ''}</div>
            <div class="shopc-card__top">
              <h4 class="shopc-card__name">${esc(p.name)}</h4>
              ${priceHtml(p)}
            </div>
            ${hook}
            ${(p.personalized && (p.type === 'accessory' || p.collection === 'jewellery')) ? miniChartPreviewHtml(p) : ''}
            <p class="shopc-card__blurb">${esc(p.blurb)}</p>
            ${cta}
          </div>
        </article>`;
    };

    const sections = [];
    if (liveList.length) {
      sections.push(`<h3 class="shopc-subhead">More live pieces</h3>${liveList.map(renderCard).join('')}`);
    }
    if (soonList.length) {
      sections.push(`<h3 class="shopc-subhead shopc-subhead--soon">On the loom — coming soon</h3>${soonList.map(renderCard).join('')}`);
    }
    grid.innerHTML = sections.length ? sections.join('') : `<p class="shopc-empty">Nothing in this collection yet. Try another filter.</p>`;
    gridJsRendered = true;

    // Stagger the freshly rendered cards in on a filter change. This branch is
    // only reached on a full re-render (the keep-static first-paint path
    // returns earlier), so the baked first-paint cards never get the primitive.
    // The .ap-stagger-in rule is reduced-motion gated in ap-motion.css.
    grid.classList.add('ap-stagger-in');

    wireGridHandlers(grid);

    // Dynamic mini-chart previews (seals + optional chart-render wheelOnly for saved profiles)
    try { hydrateMiniChartPreviews(); } catch (_) {}
  }

  function openQuickView(id) {
    const p = productById(id);
    if (!p || p.available === false) return;   // honesty: never price/cart an unfulfillable SKU
    const cols = collections();
    const colName = cols[p.collection] ? cols[p.collection].name : '';
    const live = isLive(p);
    const preview = p.previewImage
      ? `<img class="shopc-qv__preview" src="${esc(p.previewImage)}" alt="" />`
      : `<div class="shopc-qv__art">${icon(p.icon)}</div>`;
    const sample = p.sampleUrl
      ? `<p class="shopc-modal__note"><a href="${esc(p.sampleUrl)}" target="_blank" rel="noopener">Open sample layout →</a></p>`
      : '';
    const priceBlock = live
      ? (p.anchorWas && p.anchorWas > p.price
        ? `<div class="shopc-qv__price"><s>${formatPrice(p.anchorWas)}</s> ${formatPrice(p.price)}</div>`
        : `<div class="shopc-qv__price">${formatPrice(p.price)}</div>`)
      : `<div class="shopc-qv__price shopc-qv__price--soon">Coming soon</div>`;

    modal({
      title: p.name,
      body: `
        <div class="shopc-qv">
          ${preview}
          <div class="shopc-qv__kicker">${esc(colName)}${p.type ? ' · ' + (TYPE_LABEL[p.type] || '') : ''}</div>
          ${priceBlock}
          ${p.marketingLine ? `<p class="shopc-qv__hook">${esc(p.marketingLine)}</p>` : ''}
          ${bundlePerksHtml(p)}
          <p class="shopc-qv__blurb">${esc(p.blurb)}</p>
          ${sample}
          ${p.personalized ? readingPrefsHtml(p) : ''}
          ${p.giftNote ? giftNoteHtml() : personalNote(p)}
        </div>`,
      actions: live
        ? [
            { label: 'Buy now', primary: true, href: checkoutHref(p), external: true, productId: p.id },
            { label: 'Add to cart', onClick: () => cart.add(p) },
          ]
        : [
            { label: 'Keep browsing', primary: true },
            { label: 'Notify me', onClick: () => modal({
              title: 'Tell me when it launches',
              body: `<p class="shopc-modal__note">We'll email you when <strong>${esc(p.name)}</strong> goes live. No checkout spam.</p>${emailInviteHtml()}`,
              actions: [{ label: 'Done', primary: true }],
              onMount: bindEmailInvite,
            }) },
          ],
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // MODAL (self-contained, glass aesthetic; created on demand)
  // ═══════════════════════════════════════════════════════════════════════
  let modalRelease = null;   // focus-trap release() for the open quick-view modal
  let modalTrigger = null;   // element that opened the modal (focus returns here)

  function ensureModal() {
    let el = document.getElementById('shopc-modal');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'shopc-modal';
    el.className = 'shopc-modal-backdrop';
    el.innerHTML = `
      <div class="shopc-modal" role="dialog" aria-modal="true" aria-labelledby="shopc-modal-title">
        <button class="shopc-modal__close" data-modal-close aria-label="Close">×</button>
        <h2 class="shopc-modal__title" id="shopc-modal-title"></h2>
        <div class="shopc-modal__body"></div>
        <div class="shopc-modal__actions"></div>
      </div>`;
    document.body.appendChild(el);
    el.addEventListener('click', e => { if (e.target === el) closeModal(); });
    el.querySelector('[data-modal-close]').addEventListener('click', closeModal);
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && el.classList.contains('open')) closeModal();
    });
    return el;
  }

  function modal({ title, body, actions = [], onMount }) {
    const el = ensureModal();
    el.querySelector('.shopc-modal__title').textContent = title || '';
    el.querySelector('.shopc-modal__body').innerHTML = body || '';
    // Re-hydrate any mini previews that were injected into qv body (e.g. jewellery)
    try { hydrateMiniChartPreviews(); } catch (_) {}
    const actsEl = el.querySelector('.shopc-modal__actions');
    actsEl.innerHTML = '';
    actions.forEach(a => {
      const node = document.createElement(a.href ? 'a' : 'button');
      node.className = `btn ${a.primary ? 'btn--primary' : 'btn--outline'}`;
      node.textContent = a.label;
      if (a.href) {
        node.href = a.href;
        if (a.external) { node.target = '_blank'; node.rel = 'noopener'; }
        if (a.productId) node.dataset.apProduct = a.productId;
      }
      node.addEventListener('click', () => {
        if (a.productId && window.APPostPurchase && APPostPurchase.markPurchase) {
          APPostPurchase.markPurchase(a.productId);
        }
        if (!a.keepOpen) closeModal();
        if (a.onClick) a.onClick();
      });
      actsEl.appendChild(node);
    });
    el.classList.add('open');
    document.body.style.overflow = 'hidden';
    if (typeof onMount === 'function') onMount(el);
    const prefsRoot = el.querySelector('#ap-reading-prefs');
    if (prefsRoot && window.APReadingPrefs && APReadingPrefs.bindForm) {
      APReadingPrefs.bindForm(prefsRoot);
    }
    // a11y: trap focus inside the dialog and restore it to the trigger on close.
    // Capture the trigger only on the FIRST open of a chain (a modal action that
    // opens another modal keeps the original opener so focus lands sensibly).
    if (!modalRelease) modalTrigger = document.activeElement;
    const panel = el.querySelector('.shopc-modal');
    const closeBtn = el.querySelector('[data-modal-close]');
    if (modalRelease) modalRelease();
    modalRelease = trapFocus(panel || el, { initialFocus: closeBtn, returnTo: modalTrigger });
  }

  function closeModal() {
    const el = document.getElementById('shopc-modal');
    if (!el) return;
    el.classList.remove('open');
    document.body.style.overflow = '';
    if (modalRelease) { modalRelease(); modalRelease = null; modalTrigger = null; }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // EMAIL INVITE (pre-launch waitlist) — privacy-clean
  // ─────────────────────────────────────────────────────────────────────
  // Honours AP_MON.emailUrl: when set, POSTs to the hosted newsletter
  // endpoint; when empty, stores intent in localStorage only (no data leaves
  // the device). Only a volunteered email ever travels — never birth data.
  // ═══════════════════════════════════════════════════════════════════════
  function emailInviteHtml() {
    return `
      <form id="shopc-email-form" class="shopc-email">
        <input type="email" name="email" required placeholder="you@example.com" aria-label="Email address" class="shopc-email__input">
        <button type="submit" class="btn btn--primary shopc-email__btn">Notify me</button>
      </form>
      <p class="shopc-email__priv">Only your email is stored${isUrl((window.AP_MON || {}).emailUrl) ? '' : ' — on this device, until the shop opens'}. Never your birth data.</p>`;
  }

  function bindEmailInvite() {
    const form = document.getElementById('shopc-email-form');
    if (!form) return;
    const action = (window.AP_MON || {}).emailUrl;
    if (isUrl(action)) {
      form.action = action;
      form.method = 'post';
      form.target = '_blank';
      form.addEventListener('submit', () => {
        toast('You are on the list — we will be in touch.');
      });
    } else {
      form.addEventListener('submit', e => {
        e.preventDefault();
        const email = (form.querySelector('input[type="email"]') || {}).value;
        if (!email || !email.trim()) return;
        try {
          const list = JSON.parse(localStorage.getItem('ap_shop_waitlist') || '[]');
          if (!list.includes(email.trim())) list.push(email.trim());
          localStorage.setItem('ap_shop_waitlist', JSON.stringify(list));
        } catch (err) {}
        form.reset();
        toast('Noted we will tell you when the shop opens.');
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Helpers
  // ═══════════════════════════════════════════════════════════════════════
  // In-place "Added ✓" feedback on the clicked add-to-cart button (~1.2s),
  // then restore its original label. Re-entrant-safe: a rapid second click
  // restarts the timer without losing the true original label.
  function flashAddButton(btn) {
    if (!btn || btn.classList.contains('is-added')) {
      if (btn && btn._addedTimer) {
        clearTimeout(btn._addedTimer);
        btn._addedTimer = setTimeout(() => restoreAddButton(btn), 1200);
      }
      return;
    }
    btn._addedLabel = btn.textContent;
    btn.classList.add('is-added');
    btn.setAttribute('aria-label', 'Added to cart');
    btn.textContent = 'Added ✓';
    btn._addedTimer = setTimeout(() => restoreAddButton(btn), 1200);
  }
  function restoreAddButton(btn) {
    if (!btn) return;
    btn.classList.remove('is-added');
    btn.removeAttribute('aria-label');
    if (btn._addedLabel != null) btn.textContent = btn._addedLabel;
    btn._addedTimer = null;
  }

  function toast(msg, body = '', type = 'success', duration) {
    if (window.AstroApp && window.AstroApp.showToast) { window.AstroApp.showToast(msg, body, type, duration); return; }
    // minimal fallback
    const t = document.createElement('div');
    t.className = 'shopc-toast';
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('is-visible'));
    setTimeout(() => { t.classList.remove('is-visible'); setTimeout(() => t.remove(), 400); }, 3000);
  }

  // PayPal SDK loader (once, on demand)
  let paypalLoading = null;
  function loadPayPal(clientId, currency) {
    if (window.paypal) return Promise.resolve(window.paypal);
    if (!paypalLoading) {
      paypalLoading = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=${encodeURIComponent(currency)}&intent=capture`;
        s.onload = () => resolve(window.paypal);
        s.onerror = () => { paypalLoading = null; reject(new Error('PayPal SDK failed to load')); };
        document.head.appendChild(s);
      });
    }
    return paypalLoading;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Catalog structured data (SEO) — one ItemList, generated from config.
  // ═══════════════════════════════════════════════════════════════════════
  function injectCatalogSchema() {
    if (document.getElementById('shopc-catalog-ld')) return;
    const list = sortProducts(products().filter(p => p.available !== false));
    if (!list.length) return;
    const s = document.createElement('script');
    s.type = 'application/ld+json';
    s.id = 'shopc-catalog-ld';
    s.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'AstroPrecise — Personalised Chart Products',
      itemListElement: list.map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'Product',
          name: p.name,
          description: p.blurb,
          brand: { '@type': 'Brand', name: 'AstroPrecise' },
          image: p.previewImage ? new URL(p.previewImage, location.href).href : undefined,
          offers: {
            '@type': 'Offer',
            price: p.price.toFixed(2),
            priceCurrency: (checkout().currency || 'GBP'),
            availability: schemaAvailability(p),
            url: isLive(p) ? p.fulfilUrl : undefined,
            seller: { '@type': 'Organization', name: 'AstroPrecise' }
          },
        },
      })),
    });
    document.head.appendChild(s);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Cart drawer chrome + global wiring
  // ═══════════════════════════════════════════════════════════════════════
  let cart;

  function bindCartChrome() {
    const drawer = document.getElementById('shopc-cart');
    if (!drawer) return;

    document.querySelectorAll('[data-cart-toggle]').forEach(el =>
      el.addEventListener('click', () => cart.toggle()));

    const ov = document.getElementById('shopc-cart-overlay');
    ov && ov.addEventListener('click', () => cart.close());
    drawer.querySelectorAll('[data-cart-close]').forEach(el =>
      el.addEventListener('click', () => cart.close()));

    const itemsEl = document.getElementById('shopc-cart-items');
    itemsEl && itemsEl.addEventListener('click', e => {
      const rm = e.target.closest('[data-remove-key]');
      if (rm) { cart.remove(rm.dataset.removeKey); return; }
      const dec = e.target.closest('[data-qty-dec]');
      if (dec) { const it = cart.items.find(i => i.key === dec.dataset.qtyDec); if (it) cart.setQty(it.key, it.qty - 1); return; }
      const inc = e.target.closest('[data-qty-inc]');
      if (inc) { const it = cart.items.find(i => i.key === inc.dataset.qtyInc); if (it) cart.setQty(it.key, it.qty + 1); return; }
    });

    const checkoutBtn = document.getElementById('shopc-checkout-btn');
    checkoutBtn && checkoutBtn.addEventListener('click', () => cart.checkoutNow());

    // Escape closes the cart drawer when it's open. The quick-view modal has
    // its own Escape handler (ensureModal); this is the parallel one for the
    // cart so keyboard users can dismiss either dialog the same way.
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && drawer.classList.contains('open')) cart.close();
    });
  }

  // ── Init ────────────────────────────────────────────────────────────────
  let gridHydrated = false;

  function deferRenderGrid() {
    const grid = document.getElementById('shopc-grid');
    if (!grid) return;

    // With baked static cards the first render is just cheap handler-wiring
    // (the keep-static fast path in renderGrid), so there's nothing expensive
    // to defer — wire it synchronously on init. The full re-render still
    // happens on filter clicks. The gridHydrated guard keeps this one-shot.
    if (gridHydrated) return;
    gridHydrated = true;
    renderGrid();
  }

  function init() {
    cart = new Cart();
    updateLiveCounts();
    renderFeatured();
    renderFilters();
    deferRenderGrid();
    bindCartChrome();
    cart.render();
    injectCatalogSchema();
    if (window.APPostPurchase) {
      APPostPurchase.wireCheckoutTracking();
      setTimeout(() => APPostPurchase.maybeShowPromo(), 600);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Public API
  return {
    init,
    get cart() { return cart; },
    openQuickView,
    showModal: modal,
    addToCart: (id, opts) => { const p = productById(id); if (p) cart.add(p, opts); },
    productById,
    checkoutHref,
  };
})();
