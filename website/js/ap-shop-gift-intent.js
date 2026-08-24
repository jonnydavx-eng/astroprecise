(function () {
  'use strict';

  var STORAGE_KEY = 'ap-shop-intent-v1';
  var VALID_INTENTS = ['self', 'gift'];
  var group = document.querySelector('#shop-intent [role="radiogroup"]');
  if (!group) return;

  var buttons = Array.prototype.slice.call(group.querySelectorAll('[data-shop-intent]'));
  var heroButtons = Array.prototype.slice.call(document.querySelectorAll('[data-shop-hero-intent]'));
  if (buttons.length !== VALID_INTENTS.length) return;

  function isValid(intent) {
    return VALID_INTENTS.indexOf(intent) !== -1;
  }

  function readIntent() {
    try {
      var stored = window.sessionStorage.getItem(STORAGE_KEY);
      return isValid(stored) ? stored : 'self';
    } catch (error) {
      return 'self';
    }
  }

  function rememberIntent(intent) {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, intent);
    } catch (error) {
      // The choice still works when storage is unavailable.
    }
  }

  function setHidden(selector, hidden) {
    Array.prototype.forEach.call(document.querySelectorAll(selector), function (node) {
      node.hidden = hidden;
    });
  }

  function applyIntent(intent, focusSelected) {
    if (!isValid(intent)) intent = 'self';

    buttons.forEach(function (button) {
      var selected = button.getAttribute('data-shop-intent') === intent;
      button.setAttribute('aria-checked', selected ? 'true' : 'false');
      button.tabIndex = selected ? 0 : -1;
      if (selected && focusSelected) button.focus();
    });

    heroButtons.forEach(function (button) {
      button.setAttribute('aria-pressed', button.getAttribute('data-shop-hero-intent') === intent ? 'true' : 'false');
    });

    setHidden('[data-self-copy]', intent !== 'self');
    setHidden('[data-gift-copy]', intent !== 'gift');
    setHidden('[data-self-label]', intent !== 'self');
    setHidden('[data-gift-label]', intent !== 'gift');
    document.documentElement.setAttribute('data-shop-intent', intent);
    rememberIntent(intent);
  }

  buttons.forEach(function (button, index) {
    button.addEventListener('click', function () {
      applyIntent(button.getAttribute('data-shop-intent'), false);
    });

    button.addEventListener('keydown', function (event) {
      var nextIndex = null;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (index + 1) % buttons.length;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (index - 1 + buttons.length) % buttons.length;
      if (event.key === 'Home') nextIndex = 0;
      if (event.key === 'End') nextIndex = buttons.length - 1;
      if (nextIndex === null) return;

      event.preventDefault();
      applyIntent(buttons[nextIndex].getAttribute('data-shop-intent'), true);
    });
  });

  heroButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      var intent = button.getAttribute('data-shop-hero-intent');
      if (!isValid(intent)) return;
      applyIntent(intent, true);
      document.getElementById('shop-intent').scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'start'
      });
    });
  });

  applyIntent(readIntent(), false);
})();
