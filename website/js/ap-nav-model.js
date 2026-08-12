/**
 * Astro Precise — Navigation IA (model-first, single source of truth).
 * Load before app.js: <script src="js/ap-nav-model.js"></script>
 *
 * OBSERVATORY STRUCTURE (2026-07-10 — the homepage IS the model):
 *   The living orrery is the product; index.html is the Observatory.
 *
 * Launch bar: Observatory · Chart · Daily · Eclipse · Shop.
 * The historical tools remain directly addressable, but they never leak into
 * the five-route launch shell or reintroduce a second "Explore" entrance.
 *
 * Mobile launch tabs: Sky · Chart · Daily · Eclipse · Shop.
 *
 * Site spine: Observatory (see) → Chart (cast) → Daily (return) → Eclipse (event) → Shop (keep)
 * index.html is the single live Observatory; Explore is an action inside that scene, not another route.
 */
'use strict';

(function () {
  var NAV_PRIMARY = [
    ['index.html', 'Observatory'],
    ['chart.html', 'Chart'],
    ['horoscope.html', 'Daily'],
    ['eclipse.html', 'Eclipse', { badge: 'Replay' }],
    ['shop.html', 'Shop'],
  ];

  // Historical direct routes, exposed only on archive pages.
  var NAV_MORE_EXPLORE = [
    ['ephemeris.html', 'Sky tools'],
    ['mysky.html', 'My Sky', { badge: 'Hub' }],
    ['moment.html', 'Moment', { badge: 'Keep' }],
    ['cosmic-story.html', 'Cosmic Story'],
    ['guides.html', 'Library'],
    ['compatibility.html', 'Compatibility', { badge: 'Match', dataNavPromoted: 'match' }],
    ['transits.html', 'Your Transits', { badge: 'Personal', dataNavPromoted: 'personal' }],
    ['profile.html', 'Profile'],
    ['charts.html', 'My Charts'],
  ];

  // Five-route mobile spine. The authored header remains the desktop navigation.
  var NAV_BOTTOM_TABS = [
    ['index.html', 'Sky', 'star4'],
    ['chart.html', 'Chart', 'spiral'],
    ['horoscope.html', 'Daily', 'crescent'],
    ['eclipse.html', 'Eclipse', 'eclipse'],
    ['shop.html', 'Shop', 'sparkles'],
  ];

  // Inline paths keep the four primary icons identical on every route. Several
  // legacy pages carry only part of the old SVG sprite, so <use> could render a
  // blank tab depending on which page created the bar.
  var BOTTOM_ICON_PATHS = {
    star4: '<path fill="currentColor" d="M12 3.5 13.7 10l6.5 2-6.5 2L12 20.5 10.3 14l-6.5-2 6.5-2L12 3.5Z"/>',
    spiral: '<path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" d="M12 4c4.7 0 8 3.05 8 7.1 0 4.8-4.15 8.4-8.95 8.4C7.1 19.5 4 16.9 4 13.55c0-3.05 2.45-5.45 5.5-5.45 2.55 0 4.5 1.65 4.5 3.75 0 1.7-1.35 3-3 3-1.3 0-2.35-.8-2.35-1.85"/>',
    crescent: '<path fill="currentColor" d="M14.5 3.5a9 9 0 1 0 6.2 11.8A7.2 7.2 0 0 1 14.5 3.5Z"/>',
    eclipse: '<circle cx="12" cy="12" r="7.3" fill="none" stroke="currentColor" stroke-width="1.55"/><path fill="currentColor" d="M14.9 5.3a7.25 7.25 0 0 0 0 13.4 6.05 6.05 0 0 1 0-13.4Z"/>',
    sparkles: '<path fill="currentColor" d="M8 3.5 9.2 8l4.3 1.2-4.3 1.3L8 15l-1.2-4.5-4.3-1.3L6.8 8 8 3.5Zm8.5 6 1 3.2 3 1-3 1-1 3.3-1-3.3-3-1 3-1 1-3.2Z"/>',
  };

  var NAV_EXTRAS = [
    ['tonight.html', 'Tonight'], ['this-weeks-sky.html', 'This Week'],
    ['moonphase.html', 'Moon Phase'], ['retrograde.html', 'Retrograde'],
    ['solar-return.html', 'Solar Return'], ['saturn-return.html', 'Saturn Return'],
    ['synastry.html', 'Synastry'], ['what-is-my-rising-sign.html', 'Rising Sign'],
    ['angel-numbers.html', 'Angel Numbers'], ['name-numerology.html', 'Name Numerology'],
    ['lifepath.html', 'Life Path'],
    ['quiz.html', 'Cosmic Quiz'], ['accuracy.html', 'Accuracy'],
    ['why.html', 'Why'], ['links.html', 'Links'],
  ];

  window.AP_NAV = {
    NAV_PRIMARY: NAV_PRIMARY,
    NAV_MORE_EXPLORE: NAV_MORE_EXPLORE,
    NAV_BOTTOM_TABS: NAV_BOTTOM_TABS,
    NAV_EXTRAS: NAV_EXTRAS,
    NAV_DRAWER_SECTIONS: [
      { label: 'Your astrology', items: NAV_MORE_EXPLORE },
      { label: 'More tools', items: NAV_EXTRAS },
    ],
  };

  function staticHere() {
    return location.pathname.split('/').pop() || 'index.html';
  }

  function isLaunchRoute() {
    return /^(?:index|chart|horoscope|shop|eclipse|privacy|terms|refunds|verify|contact|sample-reading|natal-plate)\.html$/i.test(staticHere());
  }

  function staticLink(row, here, drawer) {
    var href = row[0], label = row[1], meta = row[2] || {};
    var active = href === here;
    var cls = 'navbar__link' + (active ? ' active' : '') + (drawer ? ' navbar__link--drawer' : '');
    var html = '<a href="' + href + '" class="' + cls + '"' + (active ? ' aria-current="page"' : '') + '>' + label;
    if (meta.badge) html += ' <span class="navbar__nav-badge" aria-hidden="true">' + meta.badge + '</span>';
    return html + '</a>';
  }

  function staticLinks(rows, here, drawer) {
    return rows.map(function (row) { return staticLink(row, here, drawer); }).join('');
  }

  function renderStaticHeader(header) {
    if (!header || header.dataset.apStaticNavReady) return;
    header.dataset.apStaticNavReady = '1';
    var here = staticHere();
    var launch = isLaunchRoute();
    var desktop = header.querySelector('.navbar__nav');
    var mobile = header.querySelector('.navbar__mobile-menu');
    var toggle = header.querySelector('.navbar__toggle');
    var moreActive = NAV_MORE_EXPLORE.concat(NAV_EXTRAS).some(function (row) { return row[0] === here; });
    var groups = launch ? [] : [
      { label: 'Your astrology', items: NAV_MORE_EXPLORE },
      { label: 'More tools', items: NAV_EXTRAS }
    ];
    if (desktop) {
      var panel = groups.map(function (group) {
        return '<div class="navbar__more-group" role="group" aria-label="' + group.label + '"><p class="navbar__more-label">' + group.label + '</p>' + staticLinks(group.items, here, true) + '</div>';
      }).join('');
      desktop.innerHTML = staticLinks(NAV_PRIMARY, here, false)
        + (groups.length ? '<div class="navbar__more" data-nav-more><button type="button" class="navbar__more-btn' + (moreActive ? ' active' : '') + '" aria-expanded="false" aria-controls="navbar-more-panel-static">More</button><div class="navbar__more-panel" id="navbar-more-panel-static" hidden>' + panel + '</div></div>' : '');
    }
    if (mobile) {
      var drawer = '<p class="navbar__drawer-heading">Main</p>' + staticLinks(NAV_PRIMARY, here, true);
      groups.forEach(function (group) {
        drawer += '<hr class="navbar__drawer-divider"><p class="navbar__drawer-heading">' + group.label + '</p>' + staticLinks(group.items, here, true);
      });
      mobile.innerHTML = drawer;
    }

    var more = header.querySelector('[data-nav-more]');
    var moreButton = more && more.querySelector('.navbar__more-btn');
    var morePanel = more && more.querySelector('.navbar__more-panel');
    function closeMore() {
      if (!moreButton || !morePanel) return;
      moreButton.setAttribute('aria-expanded', 'false');
      morePanel.hidden = true;
    }
    if (moreButton && morePanel) {
      moreButton.addEventListener('click', function (event) {
        event.stopPropagation();
        var open = morePanel.hidden;
        morePanel.hidden = !open;
        moreButton.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }
    function setDrawer(open) {
      if (!toggle || !mobile) return;
      mobile.classList.toggle('open', open);
      mobile.setAttribute('aria-hidden', open ? 'false' : 'true');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
      if (open) mobile.setAttribute('aria-modal', 'true'); else mobile.removeAttribute('aria-modal');
      document.body.classList.toggle('nav-drawer-open', open);
      if (open) {
        closeMore();
        var first = mobile.querySelector('a');
        if (first) first.focus();
      }
    }
    if (toggle && mobile) {
      setDrawer(false);
      toggle.addEventListener('click', function () {
        setDrawer(toggle.getAttribute('aria-expanded') !== 'true');
      });
      mobile.addEventListener('click', function (event) {
        if (event.target.closest('a')) setDrawer(false);
      });
      var desktopBreakpoint = window.matchMedia && window.matchMedia('(min-width: 981px)');
      if (desktopBreakpoint) {
        var closeAtBreakpoint = function () { setDrawer(false); };
        if (desktopBreakpoint.addEventListener) desktopBreakpoint.addEventListener('change', closeAtBreakpoint);
        else if (desktopBreakpoint.addListener) desktopBreakpoint.addListener(closeAtBreakpoint);
      }
      window.addEventListener('pageshow', function () { setDrawer(false); });
    }
    document.addEventListener('click', function (event) {
      if (more && !more.contains(event.target)) closeMore();
    });
    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape') return;
      closeMore();
      setDrawer(false);
      if (toggle) toggle.focus();
    });
  }

  function staticBottomIcon(name) {
    var path = BOTTOM_ICON_PATHS[name] || BOTTOM_ICON_PATHS.star4;
    return '<svg class="eng-i bottom-nav__svg" viewBox="0 0 24 24" focusable="false" aria-hidden="true">' + path + '</svg>';
  }

  function renderStaticBottomNav() {
    if (!document.body) return;
    var nav = document.querySelector('.bottom-nav');
    if (!nav) {
      nav = document.createElement('nav');
      nav.className = 'bottom-nav';
      document.body.appendChild(nav);
    }
    if (nav.dataset.apStaticBottomNavReady) return;

    var here = staticHere();
    nav.dataset.apStaticBottomNavReady = '1';
    nav.setAttribute('aria-label', 'Primary mobile navigation');
    nav.innerHTML = '<div class="bottom-nav__shell"><div class="bottom-nav__tabs">' + NAV_BOTTOM_TABS.map(function (row) {
      var active = here === row[0];
      return '<a href="' + row[0] + '" class="bottom-nav__item' + (active ? ' is-active' : '') + '"' + (active ? ' aria-current="page"' : '') + '>'
        + '<span class="bottom-nav__icon" aria-hidden="true">' + staticBottomIcon(row[2]) + '</span>'
        + '<span class="bottom-nav__label">' + row[1] + '</span></a>';
    }).join('') + '</div></div>';

    function syncHeight() {
      var height = nav.offsetHeight;
      if (height > 0) document.documentElement.style.setProperty('--bottom-nav-h', height + 'px');
    }
    requestAnimationFrame(syncHeight);
    if ('ResizeObserver' in window) new ResizeObserver(syncHeight).observe(nav);
  }

  function promoteLivingSkyStyles() {
    var link = document.querySelector('link[href*="ap-living-sky-v834.css"]');
    if (link && document.head.lastElementChild !== link) document.head.appendChild(link);
  }

  function bootLivingSkyShell() {
    document.querySelectorAll('[data-ap-static-nav]').forEach(renderStaticHeader);
    if (isLaunchRoute()) {
      // Keep route CSS order stable while adding one thumb-reachable site spine.
      renderStaticBottomNav();
      return;
    }
    renderStaticBottomNav();
    // Archive routes still load deferred legacy sheets; keep the shared shell last there.
    setTimeout(promoteLivingSkyStyles, 0);
    setTimeout(promoteLivingSkyStyles, 320);
    setTimeout(promoteLivingSkyStyles, 1200);
    window.addEventListener('load', promoteLivingSkyStyles, { once: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootLivingSkyShell);
  else bootLivingSkyShell();
})();
