/*
 * Spectral field cards: one delegated pointer controller, no render loop and no
 * extra WebGL context. Touch stays flat; reduced motion and Save-Data stay still.
 */
(function () {
  'use strict';

  var CARD_SELECTOR = [
    'body.page-home .ap-edition-art figure',
    'body.page-shop .ap-shop-leads .ap-product',
    'body.page-horoscope .reading-card',
    'body.page-chart .big-three-card',
    'body.page-chart .pattern-card',
    'body.page-eclipse .ap-eclipse-geometry-plate',
    'body.page-eclipse #eclipseContactRows > li'
  ].join(',');

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var saveData = !!(navigator.connection && navigator.connection.saveData);
  var motionAllowed = !reduce && !saveData;
  var mutationObserver = null;
  var activeCard = null;
  var pendingPoint = null;
  var frame = 0;
  function toneFor(card) {
    if (card.closest('.page-eclipse') || card.classList.contains('ap-product--eclipse')) return 'ember';
    if (card.closest('.page-chart') || card.closest('.page-horoscope')) return 'silver';
    return 'brass';
  }

  function prepare(card) {
    if (!card || card.nodeType !== 1 || card.dataset.apMysticCard != null) return;
    card.dataset.apMysticCard = '';
    card.dataset.apCardTone = toneFor(card);

    // Optical foil belongs to imagery, never over reading copy. Compact result
    // cards receive depth only; editorial/product figures receive the light field.
    var visual = card.matches('.ap-card-art, .ap-product__image')
      ? card
      : card.querySelector('.ap-card-art, .ap-product__image');
    if (visual) {
      visual.dataset.apCardVisual = '';
      var sheen = document.createElement('span');
      sheen.className = 'ap-mystic-card__sheen';
      sheen.setAttribute('aria-hidden', 'true');
      visual.appendChild(sheen);
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
    if (!pendingPoint || !activeCard) return;
    if (!document.contains(activeCard)) {
      activeCard = null;
      pendingPoint = null;
      return;
    }
    var rect = activeCard.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    var x = Math.max(0, Math.min(1, (pendingPoint.x - rect.left) / rect.width));
    var y = Math.max(0, Math.min(1, (pendingPoint.y - rect.top) / rect.height));
    activeCard.style.setProperty('--ap-card-px', (x * 100).toFixed(2) + '%');
    activeCard.style.setProperty('--ap-card-py', (y * 100).toFixed(2) + '%');
    activeCard.style.setProperty('--ap-card-rx', ((0.5 - y) * 4).toFixed(2) + 'deg');
    activeCard.style.setProperty('--ap-card-ry', ((x - 0.5) * 4.8).toFixed(2) + 'deg');
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
    if (!motionAllowed || !finePointer) return;
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
    frame = 0;
    pendingPoint = null;
    reset(activeCard);
    if (mutationObserver) mutationObserver.disconnect();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
  window.addEventListener('pagehide', function (event) {
    if (event.persisted) {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      pendingPoint = null;
      reset(activeCard);
      return;
    }
    stop();
  });
  window.addEventListener('pageshow', function (event) {
    if (event.persisted && motionAllowed && finePointer) scan(document);
  });
})();
