/**
 * Astro Precise — Safe DOM utilities (XSS defense)
 *
 * esc(s)       — HTML-entity escape for &, <, >, ", '
 * setText(el)  — textContent (preferred for plain strings)
 * setHtml(el)  — innerHTML for trusted static templates only
 *
 * Dynamic data in templates MUST use esc() first:
 *   AP_SAFE.setHtml(el, '<p class="greet">Hello, ' + AP_SAFE.esc(name) + '</p>');
 */
(function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function setText(el, s) {
    if (el) el.textContent = s == null ? '' : String(s);
  }

  /** Trusted static markup only — escape user/config strings with esc() before interpolating. */
  function setHtml(el, trustedTemplate) {
    if (el) el.innerHTML = trustedTemplate;
  }

  window.AP_SAFE = { esc: esc, setText: setText, setHtml: setHtml };
})();