/**
 * Astro Precise — sitewide engine 3D visuals (stills only)
 * SAFE STRUCTURE RULES:
 *  - Never inject into [hidden] / display:none ancestors
 *  - Always append as last child of <main> (after real page content)
 *  - One block per page
 *  - No Three.js
 */
(function (global) {
  'use strict';

  var V = String(window.AP_ASSET_V || '771');
  var CINEMA = {
    webp: 'img/marketing-system-cinema-silver.jpg',
    jpg: 'img/marketing-system-cinema-silver.jpg',
    alt: 'Cinematic solar system from Astro Precise',
  };

  var BODIES = [
    { id: 'sun', label: 'Sun', src: 'img/engine/sun.webp', href: 'leo.html' },
    { id: 'mercury', label: 'Mercury', src: 'img/engine/mercury.webp', href: 'gemini.html' },
    { id: 'venus', label: 'Venus', src: 'img/engine/venus.webp', href: 'taurus.html' },
    { id: 'earth', label: 'Earth', src: 'img/engine/earth.webp', href: 'index.html#heroChapter' },
    { id: 'moon', label: 'Moon', src: 'img/engine/moon.webp', href: 'moonphase.html' },
    { id: 'mars', label: 'Mars', src: 'img/engine/mars.webp', href: 'aries.html' },
    { id: 'jupiter', label: 'Jupiter', src: 'img/engine/jupiter.webp', href: 'sagittarius.html' },
    { id: 'saturn', label: 'Saturn', src: 'img/engine/saturn.webp', href: 'capricorn.html' },
    { id: 'uranus', label: 'Uranus', src: 'img/engine/uranus.webp', href: 'aquarius.html' },
    { id: 'neptune', label: 'Neptune', src: 'img/engine/neptune.webp', href: 'pisces.html' },
  ];

  function ensureCss() {
    if (document.getElementById('ap-css-engine-visuals')) return;
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'css/ap-engine-visuals.css?v=' + V;
    l.id = 'ap-css-engine-visuals';
    document.head.appendChild(l);
  }

  function isVisible(el) {
    if (!el || el.hidden || el.getAttribute('hidden') !== null) return false;
    var cur = el;
    while (cur && cur !== document.documentElement) {
      if (cur.hidden || cur.getAttribute('hidden') !== null) return false;
      var s = global.getComputedStyle(cur);
      if (s.display === 'none' || s.visibility === 'hidden') return false;
      cur = cur.parentElement;
    }
    return true;
  }

  function cinemaHtml() {
    return (
      '<figure class="ap-ev-cinema">' +
      '<picture>' +
      '<source type="image/webp" srcset="' +
      CINEMA.webp +
      '" />' +
      '<img src="' +
      CINEMA.jpg +
      '" width="1200" height="675" alt="' +
      CINEMA.alt +
      '" loading="lazy" decoding="async" />' +
      '</picture>' +
      '<figcaption class="ap-ev-cinema__cap">Same 3D engine as the homepage hero</figcaption>' +
      '</figure>'
    );
  }

  function railHtml() {
    var items = BODIES.map(function (b) {
      return (
        '<li><a class="ap-ev-card" href="' +
        b.href +
        '">' +
        '<img src="' +
        b.src +
        '" width="256" height="256" alt="' +
        b.label +
        ' from the Astro Precise 3D engine" loading="lazy" decoding="async" />' +
        '<figcaption>' +
        b.label +
        '</figcaption></a></li>'
      );
    }).join('');
    return '<ul class="ap-ev-rail ap-ev-rail--10" role="list">' + items + '</ul>';
  }

  function toolsHtml() {
    /* Model-orbit tools — every page gets the same product ladder around the orrery */
    return (
      '<nav class="ap-ev-tools" aria-label="Tools around the living model">' +
      '<a class="ap-ev-tools__chip ap-ev-tools__chip--primary" href="index.html">Observatory</a>' +
      '<a class="ap-ev-tools__chip" href="chart.html">Cast chart</a>' +
      '<a class="ap-ev-tools__chip" href="ephemeris.html">Sky instrument</a>' +
      '<a class="ap-ev-tools__chip" href="horoscope.html">Daily</a>' +
      '<a class="ap-ev-tools__chip" href="mysky.html">My Sky hub</a>' +
      '</nav>'
    );
  }

  function actionsHtml() {
    return (
      '<div class="ap-ev__actions">' +
      '<a class="ap-ev__btn ap-ev__btn--primary" href="index.html#lead">Open the live 3D sky</a>' +
      '<a class="ap-ev__btn ap-ev__btn--ghost" href="chart.html">Cast your chart</a>' +
      '<a class="ap-ev__btn ap-ev__btn--ghost" href="mysky.html">My Sky</a>' +
      '</div>'
    );
  }

  function buildBlock(mode) {
    mode = mode || 'compact';
    /* tools = chips only (Explore already has live 3D — no second cinema stack) */
    var showCinema = mode === 'full' || mode === 'cinema';
    var showRail = mode !== 'cinema' && mode !== 'tools';
    var showActions = mode !== 'tools';
    var el = document.createElement('section');
    el.className =
      'ap-ev ap-ev--footer' +
      (mode === 'compact' || mode === 'rail' || mode === 'tools' ? ' ap-ev--compact' : '') +
      (mode === 'tools' ? ' ap-ev--tools-only' : '');
    el.id = 'ap-engine-visuals';
    el.setAttribute('aria-labelledby', 'ap-ev-heading');
    el.setAttribute('data-engine-visuals-mounted', '1');

    var head =
      '<header class="ap-ev__head">' +
      '<p class="ap-ev__eyebrow">Living model</p>' +
      '<h2 id="ap-ev-heading" class="ap-ev__title">' +
      (mode === 'tools' ? 'Continue around the sky' : 'Tools around the sky') +
      '</h2>' +
      (mode === 'full' || mode === 'cinema'
        ? '<p class="ap-ev__lede">Same 3D engine as the homepage. Drag the orrery on <a href="index.html#lead">Live Sky</a> · cast on <a href="chart.html">Chart</a>.</p>'
        /* Provenance line must survive in the modes that actually ship
           (modeForPage only returns tools/compact since v680). */
        : '<p class="ap-ev__lede ap-ev__lede--provenance">Same 3D engine as the homepage hero.</p>') +
      '</header>';

    el.innerHTML =
      head +
      toolsHtml() +
      (showCinema ? cinemaHtml() : '') +
      (showRail ? railHtml() : '') +
      (showActions ? actionsHtml() : '');
    return el;
  }

  function pageKey() {
    return ((location.pathname || '').split('/').pop() || 'index.html').toLowerCase();
  }

  function shouldSkip() {
    var body = document.body;
    if (!body) return true;
    if (body.classList.contains('ap-award-511')) return true;
    /* My Sky already is the hub map — no second tools strip */
    if (body.classList.contains('ap-mysky-page')) return true;
    var key = pageKey();
    if (/^(privacy|terms|404|offline|phone|audit|index-classic|index-ephemeris|auth-redirect|sample-reading)/.test(key)) {
      // sample-reading is a print-like document — keep clean
      return true;
    }
    return false;
  }

  function modeForPage() {
    var key = pageKey();
    /* v680: primary product pages get chips only — never a cinema/planet-rail
       wall that buries Shop products, Sky tonight, or Cast form. */
    if (
      key === 'explore.html' ||
      key === 'chart.html' ||
      key === 'horoscope.html' ||
      key === 'moment.html' ||
      key === 'ephemeris.html' ||
      key === 'shop.html' ||
      key === 'catalogue.html'
    ) {
      return 'tools';
    }
    /* Sign guides + secondary tools: chips only (no 850px rail) */
    if (/^(aries|taurus|gemini|cancer|leo|virgo|libra|scorpio|sagittarius|capricorn|aquarius|pisces)\.html$/.test(key)) {
      return 'tools';
    }
    if (key === 'transits.html' || key === 'compatibility.html' || key === 'quiz.html') {
      return 'tools';
    }
    return 'compact';
  }

  function getMain() {
    return document.querySelector('main#main-content, main, #main-content, #main');
  }

  function cleanOldMounts() {
    document.querySelectorAll('[data-engine-visuals-mounted], #ap-engine-visuals, [data-engine-visuals]').forEach(function (n) {
      if (n.id === 'ap-engine-visuals' || n.classList.contains('ap-ev')) {
        n.remove();
        return;
      }
      if (n.hasAttribute('data-engine-visuals') && !isVisible(n)) {
        n.remove();
        return;
      }
      if (n.hasAttribute('data-engine-visuals')) {
        n.innerHTML = '';
        n.removeAttribute('data-engine-visuals-mounted');
      }
    });
  }

  /**
   * Place tools early on key pages (screenshot audit: tools only at footer = buried).
   * Never inside forms or hidden ancestors.
   */
  function findEarlySlot() {
    var key = pageKey();
    var sel = null;
    if (key === 'horoscope.html') {
      /* After sign picker so tools sit under the grid, not above the reading */
      sel =
        document.querySelector('#sign-picker-primary') ||
        document.querySelector('.sphere-hero');
    } else if (key === 'chart.html') {
      /* AFTER the whole cast layout (form + result column) — never between hero
         and form (user audit: form was buried under planet rail at top 243) */
      sel =
        document.querySelector('.chart-layout') ||
        document.querySelector('#chart-form-wrapper') ||
        document.querySelector('.chart-hero');
    } else if (key === 'explore.html') {
      sel = document.querySelector('#explore-stage');
    } else if (key === 'ephemeris.html') {
      /* After Tonight strip — not between hero and sky content (v680: was 859px rail) */
      sel =
        document.querySelector('#sky-tonight') ||
        document.querySelector('#sky-jump-nav') ||
        document.querySelector('.instrument-hero');
    } else if (key === 'shop.html' || key === 'catalogue.html') {
      /* After product grid — never cinema wall before “See the pieces” (v680) */
      sel =
        document.querySelector('#shopc-featured') ||
        document.querySelector('.shop-live-section') ||
        document.querySelector('.shop-hero');
    } else if (key === 'moment.html') {
      /* After form plate — not under tall lifestyle hero (v681 form-first) */
      sel =
        document.querySelector('.mom-studio') ||
        document.querySelector('#mom-form-title') ||
        document.querySelector('.mom-hero, .moment-hero, main > section, main > header');
    }
    if (!sel || !isVisible(sel)) return null;
    return sel;
  }

  /** Only append as last element of main — never mid-form, never inside hidden nodes */
  function appendToMainEnd(block) {
    var main = getMain();
    if (!main || !isVisible(main)) return false;
    cleanOldMounts();
    if (document.getElementById('ap-engine-visuals')) return true;

    var early = findEarlySlot();
    if (early && early.parentNode) {
      block.classList.add('ap-ev--early');
      if (early.nextSibling) {
        early.parentNode.insertBefore(block, early.nextSibling);
      } else {
        early.parentNode.appendChild(block);
      }
      return true;
    }
    main.appendChild(block);
    return true;
  }

  function autoInject() {
    if (shouldSkip()) return;
    if (document.getElementById('ap-engine-visuals')) return;
    var block = buildBlock(modeForPage());
    appendToMainEnd(block);
  }

  function mountVisiblePlaceholders() {
    document.querySelectorAll('[data-engine-visuals]').forEach(function (node) {
      if (!isVisible(node)) {
        // Do not mount into hidden slots — remove the bad marker so autoInject can run
        node.removeAttribute('data-engine-visuals');
        return;
      }
      if (node.querySelector('#ap-engine-visuals, .ap-ev')) return;
      var mode = node.getAttribute('data-engine-visuals') || 'compact';
      node.innerHTML = '';
      node.appendChild(buildBlock(mode));
    });
  }

  function boot() {
    ensureCss();
    // Clean known-bad chart slot pattern (hidden parent)
    document.querySelectorAll('[data-engine-visuals]').forEach(function (node) {
      if (!isVisible(node)) node.remove();
    });
    mountVisiblePlaceholders();
    if (!document.getElementById('ap-engine-visuals')) {
      autoInject();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(boot, 50);
    });
  } else {
    setTimeout(boot, 50);
  }

  global.AP_ENGINE_VISUALS = { boot: boot, buildBlock: buildBlock, BODIES: BODIES };
})(typeof window !== 'undefined' ? window : globalThis);
