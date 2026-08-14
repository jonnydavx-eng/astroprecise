/**
 * Astro Precise — Navigation IA (model-first, single source of truth).
 * Load before app.js: <script src="js/ap-nav-model.js"></script>
 *
 * OBSERVATORY STRUCTURE (2026-07-10 — the homepage IS the model):
 *   The living orrery is the product; index.html is the Observatory.
 *
 * Primary bar: Observatory · Chart · The Sky · Daily · Shop
 *   Observatory = the full-model homepage (index.html)
 *   Chart       = cast natal (chart.html)
 *   The Sky     = sky instrument / ephemeris (ephemeris.html)
 *   Daily       = horoscope (horoscope.html)
 *   Shop        = keepsakes
 *
 * Bottom tabs (4): Observatory · Chart · The Sky · Daily
 * More: My Sky hub, Moment, Cosmic Story, Library, Match, tools…
 *
 * Site spine: Observatory (see) → Chart (cast) → The Sky (instrument) → Keep → Daily → Shop
 * explore.html is the flagship Full 3D Observatory and opens the live model directly.
 */
'use strict';

(function () {
  var NAV_PRIMARY = [
    ['index.html', 'Observatory'],
    ['chart.html', 'Chart'],
    ['ephemeris.html', 'The Sky'],
    ['shop.html', 'Shop'],
  ];

  // Hub + keep + story + library first in More
  var NAV_MORE_EXPLORE = [
    ['eclipse.html', 'The Eclipse', { badge: '12 Aug' }],
    ['explore.html', 'Full 3D Observatory'],
    ['mysky.html', 'My Sky', { badge: 'Hub' }],
    ['moment.html', 'Moment', { badge: 'Keep' }],
    ['guides.html', 'Library'],
    ['compatibility.html', 'Compatibility', { badge: 'Match', dataNavPromoted: 'match' }],
    ['transits.html', 'Your Transits', { badge: 'Personal', dataNavPromoted: 'personal' }],
    ['profile.html', 'Profile'],
    ['charts.html', 'My Charts'],
  ];

  // Four tabs only — model + cast + sky + daily (distinct icons)
  var NAV_BOTTOM_TABS = [
    ['index.html', 'Observatory', 'star4'],
    ['chart.html', 'Chart', 'spiral'],
    ['ephemeris.html', 'The Sky', 'telescope'],
  ];

  var NAV_EXTRAS = [
    ['tonight.html', 'Tonight'], ['this-weeks-sky.html', 'This Week'],
    ['moonphase.html', 'Moon Phase'], ['retrograde.html', 'Retrograde'],
    ['catalogue.html', 'Lookbook'],
    ['solar-return.html', 'Solar Return'], ['saturn-return.html', 'Saturn Return'],
    ['synastry.html', 'Synastry'], ['what-is-my-rising-sign.html', 'Rising Sign'],
    ['lifepath.html', 'Life Path'],
    ['accuracy.html', 'Accuracy'],
    ['why.html', 'Why'],
  ];

  window.AP_NAV = {
    NAV_PRIMARY: NAV_PRIMARY,
    NAV_MORE_EXPLORE: NAV_MORE_EXPLORE,
    NAV_BOTTOM_TABS: NAV_BOTTOM_TABS,
    NAV_EXTRAS: NAV_EXTRAS,
    NAV_DRAWER_SECTIONS: [
      { label: 'Around the model', items: NAV_MORE_EXPLORE },
      { label: 'More tools', items: NAV_EXTRAS },
    ],
  };

  function staticHere() {
    return location.pathname.split('/').pop() || 'index.html';
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
    var desktop = header.querySelector('.navbar__nav');
    var mobile = header.querySelector('.navbar__mobile-menu');
    var toggle = header.querySelector('.navbar__toggle');
    var moreActive = NAV_MORE_EXPLORE.concat(NAV_EXTRAS).some(function (row) { return row[0] === here; });
    var groups = [
      { label: 'Around the model', items: NAV_MORE_EXPLORE },
      { label: 'More tools', items: NAV_EXTRAS }
    ];
    if (desktop) {
      var panel = groups.map(function (group) {
        return '<div class="navbar__more-group" role="group" aria-label="' + group.label + '"><p class="navbar__more-label">' + group.label + '</p>' + staticLinks(group.items, here, true) + '</div>';
      }).join('');
      desktop.innerHTML = staticLinks(NAV_PRIMARY, here, false)
        + '<div class="navbar__more" data-nav-more><button type="button" class="navbar__more-btn' + (moreActive ? ' active' : '') + '" aria-expanded="false" aria-controls="navbar-more-panel-static">More</button><div class="navbar__more-panel" id="navbar-more-panel-static" hidden>' + panel + '</div></div>';
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
      document.body.classList.toggle('nav-drawer-open', open);
      if (open) {
        closeMore();
        var first = mobile.querySelector('a');
        if (first) first.focus();
      }
    }
    if (toggle && mobile) {
      toggle.addEventListener('click', function () {
        setDrawer(toggle.getAttribute('aria-expanded') !== 'true');
      });
      mobile.addEventListener('click', function (event) {
        if (event.target.closest('a')) setDrawer(false);
      });
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

  function promoteLaunchStyles() {
    var link = document.querySelector('link[href*="ap-launch-unified-v832.css"]');
    if (link && document.head.lastElementChild !== link) document.head.appendChild(link);
  }

  function bootLaunchShell() {
    document.querySelectorAll('[data-ap-static-nav]').forEach(renderStaticHeader);
    // Deferred page boots append legacy styles at DOM ready. Move v832 after them.
    setTimeout(promoteLaunchStyles, 0);
    setTimeout(promoteLaunchStyles, 320);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootLaunchShell);
  else bootLaunchShell();
})();
