/*
 * Spectral field cards: one delegated pointer controller, no render loop and no
 * extra WebGL context. Touch stays flat; reduced motion and Save-Data stay still.
 */
(function () {
  'use strict';

  var CARD_SELECTOR = [
    'body.page-home .edition .item',
    'body.page-home .ap-edition-art figure',
    'body.page-home .ap-proof-ledger__inner > div',
    'body.page-shop .ap-product',
    'body.page-shop .ap-product-ledger > article',
    'body.page-shop .ap-shop-method li',
    'body.page-horoscope .sign-card',
    'body.page-horoscope .sign-reading-panel',
    'body.page-chart .big-three-card',
    'body.page-chart .pattern-card',
    'body.page-chart .ap-reading-card',
    'body.page-eclipse .ap-eclipse-guide__grid > article',
    'body.page-eclipse .ap-eclipse-geometry-plate',
    'body.page-eclipse .ap-eclipse-result'
  ].join(',');

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var saveData = !!(navigator.connection && navigator.connection.saveData);
  var motionAllowed = !reduce && !saveData;
  var revealObserver = null;
  var mutationObserver = null;
  var activeCard = null;
  var pendingPoint = null;
  var frame = 0;
  var cardOrder = 0;
  var CARD_TONES = ['brass', 'silver', 'brass', 'ember'];

  function reveal(card) {
    card.dataset.apCardReveal = 'ready';
    var delay = Number.parseInt(card.style.getPropertyValue('--ap-card-delay'), 10) || 0;
    window.setTimeout(function () {
      if (document.contains(card)) card.style.setProperty('--ap-card-delay', '0ms');
    }, delay + 520);
  }

  if (motionAllowed && 'IntersectionObserver' in window) {
    revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        reveal(entry.target);
        revealObserver.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -7% 0px', threshold: 0.08 });
  }

  function prepare(card) {
    if (!card || card.nodeType !== 1 || card.dataset.apMysticCard != null) return;
    card.dataset.apMysticCard = '';
    card.dataset.apCardTone = CARD_TONES[cardOrder % CARD_TONES.length];
    card.style.setProperty('--ap-card-delay', Math.min(cardOrder % 6, 5) * 45 + 'ms');
    cardOrder += 1;

    var sheen = document.createElement('span');
    sheen.className = 'ap-mystic-card__sheen';
    sheen.setAttribute('aria-hidden', 'true');
    card.appendChild(sheen);

    if (revealObserver) {
      card.dataset.apCardReveal = 'pending';
      revealObserver.observe(card);
    } else {
      reveal(card);
    }
  }

  function scan(root) {
    if (!root || root.nodeType !== 1 && root.nodeType !== 9) return;
    if (root.nodeType === 1 && root.matches(CARD_SELECTOR)) prepare(root);
    root.querySelectorAll(CARD_SELECTOR).forEach(prepare);
  }

  function reset(card) {
    if (!card) return;
    card.classList.remove('is-ap-card-active');
    card.style.setProperty('--ap-card-rx', '0deg');
    card.style.setProperty('--ap-card-ry', '0deg');
    card.style.setProperty('--ap-card-px', '50%');
    card.style.setProperty('--ap-card-py', '50%');
    if (activeCard === card) activeCard = null;
  }

  function paint() {
    frame = 0;
    if (!pendingPoint || !activeCard || !document.contains(activeCard)) return;
    var rect = activeCard.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    var x = Math.max(0, Math.min(1, (pendingPoint.x - rect.left) / rect.width));
    var y = Math.max(0, Math.min(1, (pendingPoint.y - rect.top) / rect.height));
    activeCard.style.setProperty('--ap-card-px', (x * 100).toFixed(2) + '%');
    activeCard.style.setProperty('--ap-card-py', (y * 100).toFixed(2) + '%');
    activeCard.style.setProperty('--ap-card-rx', ((0.5 - y) * 5).toFixed(2) + 'deg');
    activeCard.style.setProperty('--ap-card-ry', ((x - 0.5) * 6).toFixed(2) + 'deg');
  }

  function onPointerMove(event) {
    if (!motionAllowed || !finePointer || event.pointerType === 'touch') return;
    var card = event.target.closest && event.target.closest('[data-ap-mystic-card]');
    if (!card) return;
    if (activeCard && activeCard !== card) reset(activeCard);
    activeCard = card;
    activeCard.classList.add('is-ap-card-active');
    pendingPoint = { x: event.clientX, y: event.clientY };
    if (!frame) frame = requestAnimationFrame(paint);
  }

  function onPointerOut(event) {
    var card = event.target.closest && event.target.closest('[data-ap-mystic-card]');
    if (!card || card.contains(event.relatedTarget)) return;
    reset(card);
  }

  function onFocusIn(event) {
    var card = event.target.closest && event.target.closest('[data-ap-mystic-card]');
    if (card) card.classList.add('is-ap-card-active');
  }

  function onFocusOut(event) {
    var card = event.target.closest && event.target.closest('[data-ap-mystic-card]');
    if (card && !card.contains(event.relatedTarget)) reset(card);
  }

  function boot() {
    scan(document);
    document.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('pointerout', onPointerOut, { passive: true });
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    if ('MutationObserver' in window) {
      mutationObserver = new MutationObserver(function (records) {
        records.forEach(function (record) {
          record.addedNodes.forEach(function (node) { if (node.nodeType === 1) scan(node); });
        });
      });
      mutationObserver.observe(document.body, { childList: true, subtree: true });
    }
  }

  function stop() {
    if (frame) cancelAnimationFrame(frame);
    if (revealObserver) revealObserver.disconnect();
    if (mutationObserver) mutationObserver.disconnect();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
  window.addEventListener('pagehide', function (event) {
    // A bfcache page is suspended, not destroyed; keep observers alive so
    // dynamically generated Chart cards still receive the treatment on return.
    if (!event.persisted) stop();
  }, { once: true });
})();
