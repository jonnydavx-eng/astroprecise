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

  const CART_KEY = 'ap_cart';

  // ── Config access ──────────────────────────────────────────────────────
  const cfg        = () => (window.AP_MON && window.AP_MON.commerce) || {};
  const products   = () => cfg().products || [];
  const collections = () => cfg().collections || {};
  const checkout   = () => cfg().checkout || {};
  const isUrl      = u => typeof u === 'string' && /^https?:\/\//i.test(u.trim());

  function productById(id) { return products().find(p => p.id === id) || null; }

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
    const bits = [c.sunSign && `☉ ${c.sunSign}`, c.moonSign && `☽ ${c.moonSign}`, c.risingSign && `↑ ${c.risingSign}`]
      .filter(Boolean);
    return bits.join('   ·   ');
  }

  // The note shown on a personalised product: if a chart is saved we name it;
  // otherwise we honestly say one will be needed. We do NOT try to call the
  // chart-page share-image painter — it is closure-private to chart-page.js and
  // not reachable here — so we describe the personalisation rather than fake it.
  function personalNote(p) {
    if (!p || !p.personalized) return '';
    const c = savedChart();
    if (c) {
      return `
        <div class="shopc-personal">
          <div class="shopc-personal__head">${icon('star4')} Made from your chart</div>
          <p class="shopc-personal__chart">${c.name ? c.name + ' — ' : ''}${chartLabel(c) || 'your saved chart'}</p>
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
      document.querySelectorAll('[data-cart-count]').forEach(el => {
        el.textContent = count;
        el.style.display = count > 0 ? '' : 'none';
      });

      const itemsEl = document.getElementById('shopc-cart-items');
      const totalEl = document.getElementById('shopc-cart-total');
      if (totalEl) totalEl.textContent = `£${this.total().toFixed(2)}`;
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
                <button class="shopc-qty" data-qty-dec="${i.key}" aria-label="Decrease quantity">−</button>
                <span class="shopc-qty__n">${i.qty}</span>
                <button class="shopc-qty" data-qty-inc="${i.key}" aria-label="Increase quantity">+</button>
                <span class="shopc-cart__price">£${(i.price * i.qty).toFixed(2)}</span>
              </div>
            </div>
            <button class="shopc-cart__remove" data-remove-key="${i.key}" aria-label="Remove ${esc(i.name)}">×</button>
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
      drawer && drawer.classList.add('open');
      ov && ov.classList.add('open');
      this.render();
    }
    close() {
      const drawer = document.getElementById('shopc-cart');
      const ov = document.getElementById('shopc-cart-overlay');
      drawer && drawer.classList.remove('open');
      ov && ov.classList.remove('open');
    }

    // ── CHECKOUT (priority chain) ──────────────────────────────────────────
    checkoutNow() {
      if (this.items.length === 0) return;
      const co = checkout();

      // 2. Whole-cart handoff to a hosted store / Etsy (per-item fulfilUrl is
      //    handled inline on each card's "Buy Now" — here we settle the cart).
      if (isUrl(co.externalStoreUrl)) {
        window.open(co.externalStoreUrl, '_blank', 'noopener');
        return;
      }
      if (isUrl(co.etsyUrl)) {
        window.open(co.etsyUrl, '_blank', 'noopener');
        return;
      }

      // 3. On-site PayPal Buttons — HARD-DISABLED. GitHub Pages ToS prohibits
      //    capturing payment on the github.io domain. Checkout must always link
      //    OUT (externalStoreUrl / etsyUrl above, or a per-item Lemon Squeezy
      //    fulfilUrl). Do NOT re-enable paypalCheckout() while hosted on Pages.
      // if (co.paypalClientId) { this.paypalCheckout(); return; }

      // 4. DORMANT — honest pre-launch modal + email invite.
      this.dormantModal();
    }

    dormantModal() {
      const n = this.count();
      const anyPersonal = this.items.some(i => i.personalized);
      modal({
        title: 'The shop opens soon',
        body: `
          <p>Your cart is saved on this device — <strong>${n} item${n === 1 ? '' : 's'} · £${this.total().toFixed(2)}</strong>.</p>
          <p class="shopc-modal__note">Checkout goes live with the first drop. ${anyPersonal ? 'Every personalised piece is generated from your own chart — your birth details never leave your device. ' : ''}Leave your email and we'll tell you the moment the doors open.</p>
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
            ${this.items.map(i => `<div class="shopc-checkout__row"><span>${esc(i.name)}${i.variant ? ' (' + esc(i.variant) + ')' : ''} × ${i.qty}</span><span>£${(i.price * i.qty).toFixed(2)}</span></div>`).join('')}
            <div class="shopc-checkout__row shopc-checkout__total"><span>Total</span><span>£${itemTotal.toFixed(2)}</span></div>
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
              title: 'Order received ✦',
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

  function renderFilters() {
    const bar = document.getElementById('shopc-filters');
    if (!bar) return;
    const cols = collections();
    // Only show a collection chip if it has at least one fulfillable product.
    const counts = {};
    products().filter(p => p.available !== false).forEach(p => { counts[p.collection] = (counts[p.collection] || 0) + 1; });
    const chips = [['all', 'All']].concat(Object.entries(cols).filter(([k]) => counts[k] > 0).map(([k, c]) => [k, c.name]));
    bar.innerHTML = chips.map(([key, label]) =>
      `<button class="shopc-chip ${key === activeCollection ? 'active' : ''}" data-collection="${key}">${esc(label)}</button>`
    ).join('');
    bar.querySelectorAll('.shopc-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        activeCollection = chip.dataset.collection;
        bar.querySelectorAll('.shopc-chip').forEach(c => c.classList.toggle('active', c.dataset.collection === activeCollection));
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

  function renderGrid() {
    const grid = document.getElementById('shopc-grid');
    if (!grid) return;
    const all = products();
    if (!all.length) {
      grid.innerHTML = `<p class="shopc-empty">The collection is being prepared. Check back soon.</p>`;
      return;
    }
    const cols = collections();
    // Honesty: never show a price / cart for a product we can't fulfil.
    // Mark unbuildable SKUs `available:false` in AP_MON.commerce.products.
    const sellable = all.filter(p => p.available !== false);
    const list = activeCollection === 'all' ? sellable : sellable.filter(p => p.collection === activeCollection);

    grid.innerHTML = list.map(p => {
      const colName = cols[p.collection] ? cols[p.collection].name : '';
      const live = isUrl(p.fulfilUrl);
      const cta = live
        ? `<a class="btn btn--primary shopc-card__cta" href="${esc(p.fulfilUrl)}" target="_blank" rel="noopener">Buy Now</a>`
        : `<button class="btn btn--outline shopc-card__cta" data-quickview="${p.id}">View Piece</button>`;
      return `
        <article class="shopc-card" data-product-id="${p.id}">
          <div class="shopc-card__art" role="button" tabindex="0" data-quickview="${p.id}" aria-label="Quick view ${esc(p.name)}">
            <span class="shopc-card__glyph">${icon(p.icon)}</span>
            ${p.badge ? `<span class="shopc-card__badge">${esc(p.badge)}</span>` : ''}
            ${p.personalized ? `<span class="shopc-card__personal" title="Generated from your chart">${icon('star4')} Your chart</span>` : ''}
          </div>
          <div class="shopc-card__body">
            <div class="shopc-card__kicker">${esc(colName)}${p.type ? ' · ' + (TYPE_LABEL[p.type] || '') : ''}</div>
            <div class="shopc-card__top">
              <h3 class="shopc-card__name">${esc(p.name)}</h3>
              ${live
                ? `<span class="shopc-card__price">£${p.price.toFixed(2)}</span>`
                : `<span class="shopc-card__price shopc-card__price--soon">Coming soon</span>`}
            </div>
            <p class="shopc-card__blurb">${esc(p.blurb)}</p>
            ${cta}
          </div>
        </article>`;
    }).join('');

    grid.querySelectorAll('[data-quickview]').forEach(el => {
      const open = () => openQuickView(el.dataset.quickview);
      el.addEventListener('click', e => { e.stopPropagation(); open(); });
      if (el.tagName !== 'BUTTON' && el.tagName !== 'A') {
        el.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
        });
      }
    });
  }

  function openQuickView(id) {
    const p = productById(id);
    if (!p || p.available === false) return;   // honesty: never price/cart an unfulfillable SKU
    const cols = collections();
    const colName = cols[p.collection] ? cols[p.collection].name : '';
    const live = isUrl(p.fulfilUrl);

    modal({
      title: p.name,
      body: `
        <div class="shopc-qv">
          <div class="shopc-qv__art">${icon(p.icon)}</div>
          <div class="shopc-qv__kicker">${esc(colName)}${p.type ? ' · ' + (TYPE_LABEL[p.type] || '') : ''}</div>
          ${live
            ? `<div class="shopc-qv__price">£${p.price.toFixed(2)}</div>`
            : `<div class="shopc-qv__price shopc-qv__price--soon">Coming soon</div>`}
          <p class="shopc-qv__blurb">${esc(p.blurb)}</p>
          ${p.giftNote ? giftNoteHtml() : personalNote(p)}
        </div>`,
      actions: live
        ? [
            { label: 'Buy Now', primary: true, href: p.fulfilUrl, external: true },
            { label: 'Add to Cart', onClick: () => cart.add(p) },
          ]
        : [
            { label: 'Keep Browsing', primary: true },
          ],
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // MODAL (self-contained, glass aesthetic; created on demand)
  // ═══════════════════════════════════════════════════════════════════════
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
    const actsEl = el.querySelector('.shopc-modal__actions');
    actsEl.innerHTML = '';
    actions.forEach(a => {
      const node = document.createElement(a.href ? 'a' : 'button');
      node.className = `btn ${a.primary ? 'btn--primary' : 'btn--outline'}`;
      node.textContent = a.label;
      if (a.href) {
        node.href = a.href;
        if (a.external) { node.target = '_blank'; node.rel = 'noopener'; }
      }
      node.addEventListener('click', () => {
        if (!a.keepOpen) closeModal();
        if (a.onClick) a.onClick();
      });
      actsEl.appendChild(node);
    });
    el.classList.add('open');
    document.body.style.overflow = 'hidden';
    if (typeof onMount === 'function') onMount(el);
  }

  function closeModal() {
    const el = document.getElementById('shopc-modal');
    if (!el) return;
    el.classList.remove('open');
    document.body.style.overflow = '';
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
        toast('Noted ✦ we will tell you when the shop opens.');
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Helpers
  // ═══════════════════════════════════════════════════════════════════════
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function toast(msg) {
    if (window.AstroApp && window.AstroApp.showToast) { window.AstroApp.showToast(msg, '', 'success'); return; }
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
    const list = products().filter(p => p.available !== false);   // don't advertise unfulfillable SKUs to crawlers
    if (!list.length) return;
    const s = document.createElement('script');
    s.type = 'application/ld+json';
    s.id = 'shopc-catalog-ld';
    s.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'AstroPrecise — Wear Your Sky',
      itemListElement: list.map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'Product',
          name: p.name,
          description: p.blurb,
          offers: {
            '@type': 'Offer',
            price: p.price.toFixed(2),
            priceCurrency: (checkout().currency || 'GBP'),
            availability: 'https://schema.org/PreOrder',
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
  }

  // ── Init ────────────────────────────────────────────────────────────────
  function init() {
    cart = new Cart();
    renderFilters();
    renderGrid();
    bindCartChrome();
    cart.render();
    injectCatalogSchema();
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
    addToCart: (id, opts) => { const p = productById(id); if (p) cart.add(p, opts); },
    productById,
  };
})();
