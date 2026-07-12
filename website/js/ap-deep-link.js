/**
 * Astro Precise — model sky deep-link builder (H1 contract).
 *
 * Emitters sitewide → explore.html#m=<UTC|now>&focus=<body>[&scale=N]
 * Receiver: js/explore-boot.js (parseModelHash / resolveMomentDate).
 *
 * Deep links are UTC by contract: bare "1990-06-14T12:00" becomes Z-suffixed
 * so every visitor sees the same sky instant.
 */
(function () {
  'use strict';

  var VALID_FOCUS = {
    earth: 1, sun: 1, moon: 1, mercury: 1, venus: 1, mars: 1,
    jupiter: 1, saturn: 1, uranus: 1, neptune: 1, pluto: 1
  };

  /** @param {Date|string|'now'|null|undefined} m */
  function normalizeMoment(m) {
    if (m == null || m === '' || m === 'now') return 'now';
    if (m instanceof Date) {
      if (isNaN(m.getTime())) return null;
      return m.toISOString();
    }
    var s = String(m);
    if (/^\d{4}-\d{2}-\d{2}T[\d:.]+$/.test(s)) s += 'Z';
    var d = new Date(s);
    if (isNaN(d.getTime())) return null;
    return d.toISOString();
  }

  /**
   * @param {{ m?: Date|string|'now', focus?: string, scale?: number|string, base?: string }} opts
   * @returns {string}
   */
  function buildSkyLink(opts) {
    opts = opts || {};
    var base = opts.base != null ? String(opts.base) : 'explore.html';
    var parts = [];
    var m = normalizeMoment(opts.m != null ? opts.m : 'now');
    if (m == null) m = 'now';
    parts.push('m=' + encodeURIComponent(m));
    if (opts.focus) {
      var f = String(opts.focus).toLowerCase();
      if (VALID_FOCUS[f]) parts.push('focus=' + encodeURIComponent(f));
    }
    if (opts.scale != null && opts.scale !== '') {
      parts.push('scale=' + encodeURIComponent(String(opts.scale)));
    }
    return base + '#' + parts.join('&');
  }

  window.APDeepLink = { buildSkyLink: buildSkyLink, normalizeMoment: normalizeMoment };
})();
