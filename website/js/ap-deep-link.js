/**
 * Astro Precise — model sky deep-link builder (H1 contract).
 *
 * Emitters sitewide → index.html#m=<UTC|now>&focus=<body>[&scale=N]
 * Receiver: js/ap-observatory-v833.js (hash + private session handoff).
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

  /* Handoff channel for personal moments — read and consumed by
     js/ap-observatory-v833.js. Same-tab, same-origin, never transmitted. */
  var STASH_KEY = 'ap-explore-moment';

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
    var base = opts.base != null ? String(opts.base) : 'index.html';
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

  /**
   * Same destination as buildSkyLink, for moments that are somebody's BIRTH
   * minute rather than a public astronomical event.
   *
   * A link like index.html#m=1994-03-14T09:12:00.000Z is a birth certificate
   * to the minute. It survives in the address bar, in a screenshot, in browser
   * history synced across that person's devices, and in whatever they paste it
   * into. So the moment travels in sessionStorage instead — same tab, same
   * origin, never transmitted, gone when the tab closes — and only the focus
   * body (a planet name, not personal) stays in the link.
   *
   * Where sessionStorage is unavailable (private mode, storage blocked) this
   * falls back to the full fragment link, because a broken feature is worse
   * than a fragment and a fragment is still never sent to a server.
   *
   * @param {{ m?: Date|string|'now', focus?: string, scale?: number|string, base?: string }} opts
   * @returns {string}
   */
  function stashSkyLink(opts) {
    opts = opts || {};
    var m = normalizeMoment(opts.m != null ? opts.m : 'now');
    if (m == null) m = 'now';
    var focus = opts.focus ? String(opts.focus).toLowerCase() : null;
    if (focus && !VALID_FOCUS[focus]) focus = null;
    var base = opts.base != null ? String(opts.base) : 'index.html';

    try {
      window.sessionStorage.setItem(STASH_KEY, JSON.stringify({
        m: m, focus: focus, scale: opts.scale != null && opts.scale !== '' ? String(opts.scale) : null,
        ts: Date.now()
      }));
    } catch (e) {
      return buildSkyLink(opts);
    }

    var parts = [];
    if (focus) parts.push('focus=' + encodeURIComponent(focus));
    if (opts.scale != null && opts.scale !== '') parts.push('scale=' + encodeURIComponent(String(opts.scale)));
    return parts.length ? base + '#' + parts.join('&') : base;
  }

  window.APDeepLink = {
    buildSkyLink: buildSkyLink,
    stashSkyLink: stashSkyLink,
    normalizeMoment: normalizeMoment,
    STASH_KEY: STASH_KEY
  };
})();
