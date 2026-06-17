/**
 * @deprecated — use element-seals.js (AstroElementSeals).
 * Thin shim for cached pages still loading this path.
 */
(function () {
  'use strict';
  if (window.AstroElementSeals) return;
  var s = document.createElement('script');
  s.src = 'js/element-seals.js';
  s.defer = true;
  document.head.appendChild(s);
})();