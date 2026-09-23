/**
 * Astro Precise — model sky deep-link builder (H1 contract).
 *
 * Public emitters → observatory.html#m=<UTC>&public=1&focus=<body>[&scale=N]
 * Live-now emitters → observatory.html#m=now&focus=<body>[&scale=N]
 * Receiver: js/ap-observatory-v834.js (hash + private session handoff).
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
     js/ap-observatory-v834.js. Same-tab, same-origin, never transmitted. */
  var STASH_KEY = 'ap-explore-moment';

  function isValidFocus(value) {
    return Object.prototype.hasOwnProperty.call(VALID_FOCUS, value);
  }

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

  function observatoryBase(value) {
    var raw = value != null ? String(value) : 'observatory.html';
    var hashAt = raw.indexOf('#');
    if (hashAt !== -1) raw = raw.slice(0, hashAt);
    var queryAt = raw.indexOf('?');
    var path = queryAt === -1 ? raw : raw.slice(0, queryAt);
    path = path.replace(/^\.\//, '').replace(/^\/+/, '');
    // This helper only targets the root Observatory. Schemes, protocol-relative
    // URLs, other origins and look-alike paths all collapse to that local route.
    if (path.toLowerCase() !== 'observatory.html') path = 'observatory.html';

    var kept = new URLSearchParams();
    if (queryAt !== -1) {
      try {
        var incoming = new URLSearchParams(raw.slice(queryAt + 1));
        incoming.forEach(function (valuePart, keyPart) {
          var key = String(keyPart || '').toLowerCase();
          if ((key === 'nosw' || key === 'lite') && String(valuePart) === '1' && !kept.has(key)) {
            kept.set(key, '1');
          }
        });
      } catch (e) { /* malformed query: fail closed to the local route */ }
    }
    var query = kept.toString();
    return 'observatory.html' + (query ? '?' + query : '');
  }

  /**
   * @param {{ m?: Date|string|'now', focus?: string, scale?: number|string, base?: string }} opts
   * @returns {string}
   */
  function buildSkyLink(opts) {
    opts = opts || {};
    var base = observatoryBase(opts.base);
    var parts = [];
    var m = normalizeMoment(opts.m != null ? opts.m : 'now');
    if (m == null) m = 'now';
    parts.push('m=' + encodeURIComponent(m));
    // A fixed instant is accepted by the Observatory only when the address
    // explicitly identifies it as a public astronomical event. Personal birth
    // minutes must use stashSkyLink() and never enter the visible address.
    if (m !== 'now') parts.push('public=1');
    if (opts.focus) {
      var f = String(opts.focus).toLowerCase();
      if (isValidFocus(f)) parts.push('focus=' + encodeURIComponent(f));
    }
    if (opts.scale != null && opts.scale !== '') {
      parts.push('scale=' + encodeURIComponent(String(opts.scale)));
    }
    return base + '#' + parts.join('&');
  }

  function privateSafeBase(value) {
    return observatoryBase(value);
  }

  /**
   * Address-safe destination for a personal moment. The moment itself is
   * deliberately not accepted here: only a validated public focus body and an
   * integer scale beat may survive in the fragment. Any fragment supplied on
   * `base` is discarded so a stale caller cannot smuggle an old `m=` value
   * through the fallback route.
   *
   * @param {{ focus?: string, scale?: number|string, base?: string }} opts
   * @returns {string}
   */
  function buildFocusLink(opts) {
    opts = opts || {};
    var base = privateSafeBase(opts.base);

    var parts = [];
    if (opts.focus) {
      var focus = String(opts.focus).toLowerCase();
      if (isValidFocus(focus)) parts.push('focus=' + encodeURIComponent(focus));
    }
    if (opts.scale != null && opts.scale !== '') {
      var scale = String(opts.scale);
      if (/^-?\d+$/.test(scale)) parts.push('scale=' + encodeURIComponent(scale));
    }
    return parts.length ? base + '#' + parts.join('&') : base;
  }

  /**
   * Same destination as buildSkyLink, for moments that are somebody's BIRTH
   * minute rather than a public astronomical event.
   *
   * A link like observatory.html#m=1994-03-14T09:12:00.000Z is a birth certificate
   * to the minute. It survives in the address bar, in a screenshot, in browser
   * history synced across that person's devices, and in whatever they paste it
   * into. So the moment travels in sessionStorage instead — same tab, same
   * origin, never transmitted, gone when the tab closes — and only the focus
   * body (a planet name, not personal) stays in the link.
   *
   * Where sessionStorage is unavailable (private mode, storage blocked), this
   * fails closed to an address-safe focus route. The model still opens, but it
   * cannot restore the private minute; privacy wins over that enhancement.
   *
   * @param {{ m?: Date|string|'now', focus?: string, scale?: number|string, base?: string }} opts
   * @returns {string}
   */
  function stashSkyLink(opts) {
    opts = opts || {};
    var m = normalizeMoment(opts.m != null ? opts.m : 'now');
    if (m == null) m = 'now';
    var focus = opts.focus ? String(opts.focus).toLowerCase() : null;
    if (focus && !isValidFocus(focus)) focus = null;
    var base = opts.base != null ? String(opts.base) : 'observatory.html';

    try {
      window.sessionStorage.setItem(STASH_KEY, JSON.stringify({
        m: m, focus: focus, scale: opts.scale != null && opts.scale !== '' ? String(opts.scale) : null,
        ts: Date.now()
      }));
    } catch (e) {
      return buildFocusLink(opts);
    }

    return buildFocusLink({ focus: focus, scale: opts.scale, base: base });
  }

  window.APDeepLink = {
    buildSkyLink: buildSkyLink,
    buildFocusLink: buildFocusLink,
    stashSkyLink: stashSkyLink,
    normalizeMoment: normalizeMoment,
    STASH_KEY: STASH_KEY
  };
})();
