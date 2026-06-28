/**
 * AstroPrecise — Main Application Orchestrator
 * Wires together ephemeris, rendering, interpretations, and profile modules.
 */

'use strict';

const AstroApp = (() => {

  // ── State ─────────────────────────────────────────────────────────────────
  let _currentChart = null;
  let _toast_queue  = [];

  // ── Init ──────────────────────────────────────────────────────────────────

  function injectSkipLink() {
    if (document.getElementById('skip-to-content') || !document.getElementById('main-content')) return;
    var a = document.createElement('a');
    a.id = 'skip-to-content';
    a.className = 'skip-link';
    a.href = '#main-content';
    a.textContent = 'Skip to content';
    document.body.insertBefore(a, document.body.firstChild);
  }

  function init() {
    // Preload the astrological symbol font (AstroGlyph) so canvas-drawn glyphs
    // (orrery, zodiac ring, share cards) never paint in the fallback colour-emoji
    // font on Android — and force a redraw once it's ready.
    if (document.fonts && document.fonts.load) {
      try { document.fonts.load("16px 'AstroGlyph'").then(function () { window.dispatchEvent(new Event('astroglyph-ready')); }); } catch (e) {}
    }
    injectSkipLink();
    renderNav();        // canonical site nav on every page — single source of truth
    injectTopProfile(); // Profile tab — top-right on every page
    initNavbar();
    initToastContainer();
    initScrollAnimations();
    initModalHandlers();

    // Load preferences
    if (window.AstroProfile) {
      const prefs = AstroProfile.getPrefs();
      document.documentElement.dataset.houseSystem = prefs.houseSystem;
    }

    if (window.ApPageBridge && typeof ApPageBridge.init === 'function') {
      ApPageBridge.init();
    }
  }

  // ── Navbar ────────────────────────────────────────────────────────────────

  function closeNavDrawer() {
    const toggle = document.querySelector('.navbar__toggle');
    const mobile = document.querySelector('.navbar__mobile-menu');
    if (!mobile || !mobile.classList.contains('open')) return;
    mobile.classList.remove('open');
    if (toggle) {
      toggle.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }
    mobile.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('nav-drawer-open');
    if (!document.querySelector('.modal-backdrop.open')) {
      document.body.style.overflow = '';
    }
  }

  function initNavbar() {
    const navbar = document.querySelector('.navbar');
    const toggle = document.querySelector('.navbar__toggle');
    const mobile = document.querySelector('.navbar__mobile-menu');

    if (navbar) {
      const applyScrolled = () => navbar.classList.toggle('scrolled', window.scrollY > 20);
      if (window.RafCore) {
        window.RafCore.onScroll(applyScrolled);
      } else {
        window.addEventListener('scroll', applyScrolled, { passive: true });
        applyScrolled();
      }
    }

    if (toggle && mobile) {
      toggle.addEventListener('click', () => {
        closeMoreMenus();
        const isOpen = mobile.classList.toggle('open');
        toggle.classList.toggle('open', isOpen);
        toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        mobile.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
        document.body.classList.toggle('nav-drawer-open', isOpen);
        document.body.style.overflow = isOpen ? 'hidden' : '';
      });

      mobile.addEventListener('click', (e) => {
        if (e.target.closest('a.navbar__link') || e.target.closest('.ap-nav-updates-mobile')) {
          closeNavDrawer();
        }
      });

      document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape' || !mobile.classList.contains('open')) return;
        closeNavDrawer();
        toggle.focus();
      });

      document.addEventListener('click', (e) => {
        if (!mobile.classList.contains('open')) return;
        const inner = document.querySelector('.navbar__inner');
        if (inner && !inner.contains(e.target) && !mobile.contains(e.target)) {
          closeNavDrawer();
        }
      });
    }
  }

  // ── Navigation IA — js/ap-nav-model.js (window.AP_NAV) is canonical ─────
  const _apNav = (typeof window !== 'undefined' && window.AP_NAV) || {};
  const NAV_PRIMARY = _apNav.NAV_PRIMARY || [
    ['index.html', 'Home'],
    ['chart.html', 'Chart'],
    ['horoscope.html', 'Daily'],
    ['compatibility.html', 'Match'],
    ['ephemeris.html', 'Sky'],
  ];
  const NAV_MORE_EXPLORE = _apNav.NAV_MORE_EXPLORE || [
    ['compatibility.html', 'Compatibility', { badge: 'Match', dataNavPromoted: 'match' }],
    ['lifepath.html', 'Life Path'],
    ['transits.html', 'Transits'],
    ['why.html', 'Why'],
    ['shop.html', 'Shop'],
  ];
  const NAV_EXTRAS = _apNav.NAV_EXTRAS || [
    ['accuracy.html', 'Accuracy'], ['charts.html', 'My Charts'], ['quiz.html', 'Cosmic Quiz'],
    ['tonight.html', "Tonight's Sky"], ['moonphase.html', 'Moon Phase'], ['retrograde.html', 'Retrograde'],
    ['angel-numbers.html', 'Angel Numbers'], ['name-numerology.html', 'Name Numerology'],
    ['what-is-my-rising-sign.html', 'Rising Sign'], ['synastry.html', 'Synastry'],
    ['solar-return.html', 'Solar Return'], ['saturn-return.html', 'Saturn Return'],
    ['links.html', 'Links'],
  ];
  const NAV_BOTTOM_TABS = _apNav.NAV_BOTTOM_TABS || [
    ['index.html', 'Home', 'star4'],
    ['chart.html', 'Chart', 'spiral'],
    ['horoscope.html', 'Daily', 'crescent'],
    ['ephemeris.html', 'Sky', 'telescope'],
  ];
  const NAV_DRAWER_SECTIONS = _apNav.NAV_DRAWER_SECTIONS || [
    { label: 'Explore', items: NAV_MORE_EXPLORE },
    { label: 'Tools', items: NAV_EXTRAS },
  ];
  // Legacy aliases for any code that still reads these
  const NAV_CORE = NAV_PRIMARY.concat(NAV_MORE_EXPLORE);
  const NAV_BOTTOM_ICONS = Object.fromEntries(NAV_BOTTOM_TABS.map(function (r) { return [r[0], r[2]]; }));
  const NAV_BOTTOM_LABELS = Object.fromEntries(NAV_BOTTOM_TABS.map(function (r) { return [r[0], r[1]]; }));
  const NAV_BOTTOM_EXTRAS = [];

  function parseNavRow(row) {
    return {
      href: row[0],
      label: row[1],
      meta: row[2] && typeof row[2] === 'object' ? row[2] : {},
    };
  }

  function navLinkHtml(pairs, here, drawer) {
    return pairs.map(function (row) {
      var item = parseNavRow(row);
      var href = item.href;
      var label = item.label;
      var meta = item.meta;
      var active = here === href;
      var cls = 'navbar__link' + (active ? ' active' : '') + (drawer ? ' navbar__link--drawer' : '');
      var attrs = ' href="' + href + '" class="' + cls + '"';
      if (active) attrs += ' aria-current="page"';
      if (meta.dataNavPromoted) attrs += ' data-nav-promoted="' + meta.dataNavPromoted + '"';
      var inner = label;
      if (meta.badge) {
        inner += '<span class="navbar__nav-badge" aria-hidden="true">' + meta.badge + '</span>';
      }
      return '<a' + attrs + '>' + inner + '</a>';
    }).join('');
  }

  function navItemsForDrawerSection(sec) {
    if (sec.label !== 'Explore') return sec.items;
    var inPrimary = {};
    NAV_PRIMARY.forEach(function (r) { inPrimary[r[0]] = true; });
    return sec.items.filter(function (r) { return !inPrimary[r[0]]; });
  }

  function morePageActive(here) {
    var primaryHrefs = NAV_PRIMARY.map(function (r) { return r[0]; });
    if (primaryHrefs.indexOf(here) !== -1) return false;
    return NAV_MORE_EXPLORE.some(function (r) { return r[0] === here; })
      || NAV_EXTRAS.some(function (r) { return r[0] === here; });
  }

  function renderMoreMenu(here) {
    var active = morePageActive(here);
    var groups = NAV_DRAWER_SECTIONS.map(function (sec) {
      return '<div class="navbar__more-group" role="group" aria-label="' + sec.label + '">'
        + '<p class="navbar__more-label">' + sec.label + '</p>'
        + navLinkHtml(sec.items, here, true)
        + '</div>';
    }).join('');
    return '<div class="navbar__more" data-nav-more>'
      + '<button type="button" class="navbar__more-btn' + (active ? ' active' : '') + '"'
      + ' aria-expanded="false" aria-haspopup="true" aria-controls="navbar-more-panel"'
      + ' aria-label="More — includes Match compatibility">More</button>'
      + '<div class="navbar__more-panel" id="navbar-more-panel" role="group" aria-label="More tools and pages" hidden>' + groups + '</div>'
      + '</div>';
  }

  function resetMorePanel(panel) {
    if (!panel) return;
    panel.classList.remove('is-fixed');
    panel.style.position = '';
    panel.style.top = '';
    panel.style.right = '';
    panel.style.left = '';
    panel.style.minWidth = '';
    panel.style.maxHeight = '';
  }

  function positionMorePanel(btn, panel) {
    if (!btn || !panel) return;
    var rect = btn.getBoundingClientRect();
    var gap = 8;
    var maxH = Math.min(window.innerHeight * 0.7, 480);
    panel.classList.add('is-fixed');
    panel.style.position = 'fixed';
    panel.style.top = Math.round(rect.bottom + gap) + 'px';
    panel.style.left = 'auto';
    panel.style.right = Math.max(8, Math.round(window.innerWidth - rect.right)) + 'px';
    panel.style.minWidth = Math.max(220, Math.round(rect.width)) + 'px';
    panel.style.maxHeight = maxH + 'px';
    var panelRect = panel.getBoundingClientRect();
    if (panelRect.bottom > window.innerHeight - 8) {
      var lift = panelRect.bottom - window.innerHeight + 8;
      panel.style.top = Math.max(rect.bottom + gap, Math.round(rect.bottom + gap - lift)) + 'px';
    }
    if (panelRect.left < 8) {
      panel.style.left = '8px';
      panel.style.right = 'auto';
    }
  }

  var moreMenuTrap = null;
  var moreMenuTrapBtn = null;

  function clearMoreMenuTrap() {
    if (moreMenuTrap) {
      document.removeEventListener('keydown', moreMenuTrap);
      moreMenuTrap = null;
    }
    moreMenuTrapBtn = null;
  }

  function wireMoreMenuTrap(wrap, btn, panel) {
    clearMoreMenuTrap();
    var links = Array.prototype.slice.call(panel.querySelectorAll('a[href]'));
    if (!links.length) return;
    moreMenuTrapBtn = btn;
    links[0].focus();
    moreMenuTrap = function (e) {
      if (!wrap.classList.contains('is-open')) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        closeMoreMenus();
        if (moreMenuTrapBtn) moreMenuTrapBtn.focus();
        return;
      }
      if (e.key !== 'Tab') return;
      var nodes = [btn].concat(links);
      var first = nodes[0];
      var last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', moreMenuTrap);
  }

  function closeMoreMenus() {
    var returnBtn = moreMenuTrapBtn;
    clearMoreMenuTrap();
    document.querySelectorAll('[data-nav-more]').forEach(function (wrap) {
      var btn = wrap.querySelector('.navbar__more-btn');
      var panel = wrap.querySelector('.navbar__more-panel');
      if (!btn || !panel) return;
      btn.setAttribute('aria-expanded', 'false');
      panel.hidden = true;
      wrap.classList.remove('is-open');
      resetMorePanel(panel);
    });
    if (returnBtn && document.contains(returnBtn)) returnBtn.focus();
  }

  function initMoreMenu() {
    document.querySelectorAll('[data-nav-more]').forEach(function (wrap) {
      if (wrap.dataset.moreWired) return;
      wrap.dataset.moreWired = '1';
      var btn = wrap.querySelector('.navbar__more-btn');
      var panel = wrap.querySelector('.navbar__more-panel');
      if (!btn || !panel) return;
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var open = !wrap.classList.contains('is-open');
        closeMoreMenus();
        if (open) {
          wrap.classList.add('is-open');
          btn.setAttribute('aria-expanded', 'true');
          panel.hidden = false;
          positionMorePanel(btn, panel);
          wireMoreMenuTrap(wrap, btn, panel);
        }
      });
      panel.querySelectorAll('a').forEach(function (a) {
        a.addEventListener('click', closeMoreMenus);
      });
    });
    if (!document.documentElement.dataset.moreGlobalWired) {
      document.documentElement.dataset.moreGlobalWired = '1';
      document.addEventListener('click', function (e) {
        if (!e.target.closest('[data-nav-more]')) closeMoreMenus();
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && document.querySelector('[data-nav-more].is-open')) closeMoreMenus();
      });
      var repositionOpenMore = function () {
        document.querySelectorAll('[data-nav-more].is-open').forEach(function (wrap) {
          var btn = wrap.querySelector('.navbar__more-btn');
          var panel = wrap.querySelector('.navbar__more-panel');
          if (btn && panel && !panel.hidden) positionMorePanel(btn, panel);
        });
      };
      window.addEventListener('resize', repositionOpenMore);
      window.addEventListener('scroll', repositionOpenMore, { passive: true });
    }
  }

  function renderDrawer(here) {
    var html = '<p class="navbar__drawer-heading">Main</p>'
      + navLinkHtml(NAV_PRIMARY, here, true);
    NAV_DRAWER_SECTIONS.forEach(function (sec) {
      var items = navItemsForDrawerSection(sec);
      if (!items.length) return;
      html += '<hr class="navbar__drawer-divider" aria-hidden="true">'
        + '<p class="navbar__drawer-heading">' + sec.label + '</p>'
        + navLinkHtml(items, here, true);
    });
    html += '<hr class="navbar__drawer-divider" aria-hidden="true">'
      + '<p class="navbar__drawer-heading">Account</p>'
      + navLinkHtml([['profile.html', 'Profile']], here, true)
      + '<button type="button" class="navbar__link ap-nav-updates-mobile" data-ap-open-email="mobile_menu">'
      + '\u2726 Get updates</button>';
    return html;
  }

  function renderNav() {
    var here = location.pathname.split('/').pop() || 'index.html';
    var desktop = document.querySelector('.navbar__nav');
    var mobile = document.querySelector('.navbar__mobile-menu');
    if (desktop) {
      if (!desktop.querySelector('.navbar__link')) {
        desktop.innerHTML = navLinkHtml(NAV_PRIMARY, here, false) + renderMoreMenu(here);
      } else {
        desktop.querySelectorAll('.navbar__link[href]').forEach(function (a) {
          var href = (a.getAttribute('href') || '').split('/').pop();
          var on = href === here;
          a.classList.toggle('active', on);
          if (on) a.setAttribute('aria-current', 'page');
          else a.removeAttribute('aria-current');
        });
        var moreBtn = desktop.querySelector('.navbar__more-btn');
        if (moreBtn) moreBtn.classList.toggle('active', morePageActive(here));
        var morePanel = desktop.querySelector('.navbar__more-panel');
        if (morePanel && !morePanel.querySelector('.navbar__more-group')) {
          morePanel.innerHTML = NAV_DRAWER_SECTIONS.map(function (sec) {
            return '<div class="navbar__more-group" role="group" aria-label="' + sec.label + '">'
              + '<p class="navbar__more-label">' + sec.label + '</p>'
              + navLinkHtml(sec.items, here, true)
              + '</div>';
          }).join('');
        }
      }
      initMoreMenu();
    }
    if (mobile) mobile.innerHTML = renderDrawer(here);
  }

  /** Right rail: profile + hamburger — keeps center nav from overlapping. */
  function cleanupNavEnd() {
    var inner = document.querySelector('.navbar__inner');
    if (!inner) return;
    inner.querySelectorAll('.ap-nav-email-cluster, .ap-nav-email-cluster__copy').forEach(function (el) {
      el.remove();
    });
    var profiles = inner.querySelectorAll('.navbar__profile-top');
    for (var i = 1; i < profiles.length; i++) profiles[i].remove();
  }

  function ensureNavEnd() {
    var inner = document.querySelector('.navbar__inner');
    if (!inner) return null;
    cleanupNavEnd();
    var end = inner.querySelector('.navbar__end');
    var toggle = inner.querySelector('.navbar__toggle');
    if (!end) {
      end = document.createElement('div');
      end.className = 'navbar__end';
      inner.appendChild(end);
    }
    if (toggle && !end.contains(toggle)) end.appendChild(toggle);
    inner.querySelectorAll('.navbar__profile-top').forEach(function (el) {
      if (!end.contains(el)) {
        var tgl = end.querySelector('.navbar__toggle');
        if (tgl) end.insertBefore(el, tgl);
        else end.appendChild(el);
      }
    });
    return end;
  }

  /** Profile as a top-bar tab on every page (not in the bottom nav). */
  function injectTopProfile() {
    if (document.querySelector('.navbar__profile-top')) return;
    var inner = document.querySelector('.navbar__inner');
    if (!inner) return;
    var end = ensureNavEnd();
    var here = location.pathname.split('/').pop() || 'index.html';
    inner.querySelectorAll('a[href="profile.html"]').forEach(function (el) {
      if (!el.classList.contains('navbar__profile-top')) el.remove();
    });
    var a = document.createElement('a');
    a.href = 'profile.html';
    a.className = 'navbar__profile-top';
    a.setAttribute('aria-label', 'My Profile');
    if (here === 'profile.html') { a.classList.add('is-active'); a.setAttribute('aria-current', 'page'); }
    a.innerHTML = '<svg class="eng-i navbar__profile-top__icon" aria-hidden="true"><use href="#ei-gem"/></svg>';
    var toggle = end && end.querySelector('.navbar__toggle');
    if (end) {
      if (toggle) end.insertBefore(a, toggle);
      else end.appendChild(a);
    } else {
      inner.appendChild(a);
    }
  }

  // ── Toast Notifications ───────────────────────────────────────────────────

  function initToastContainer() {
    if (!document.querySelector('.toast-container')) {
      const tc = document.createElement('div');
      tc.className = 'toast-container';
      document.body.appendChild(tc);
    }
  }

  const EI = (id) => `<svg class="eng-i" aria-hidden="true"><use href="#ei-${id}"/></svg>`;

  const escToast = (window.AP_SAFE && window.AP_SAFE.esc)
    ? s => window.AP_SAFE.esc(s)
    : s => String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  function showToast(title, message, type = 'info', duration = 4000) {
    const icons = {
      success: EI('check'),
      error: EI('close'),
      warning: EI('warn'),
      info: EI('star4'),
    };
    const tc    = document.querySelector('.toast-container');
    if (!tc) return;

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `
      <span class="toast__icon">${icons[type] || EI('star4')}</span>
      <div class="toast__body">
        <div class="toast__title">${escToast(title)}</div>
        ${message ? `<div class="toast__message">${escToast(message)}</div>` : ''}
      </div>
      <button class="toast__close" aria-label="Close">${EI('close')}</button>
    `;

    tc.appendChild(toast);

    const close = () => {
      toast.classList.add('hiding');
      setTimeout(() => toast.remove(), 300);
    };

    toast.querySelector('.toast__close').addEventListener('click', close);
    if (duration > 0) setTimeout(close, duration);

    return toast;
  }

  // ── Loading Overlay ───────────────────────────────────────────────────────

  function showLoading(message = 'Calculating your cosmic blueprint…') {
    let overlay = document.getElementById('ap-loading');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'ap-loading';
      overlay.className = 'loading-overlay';
      overlay.innerHTML = `
        <div class="spinner">
          <div class="spinner__ring spinner__ring--outer"></div>
          <div class="spinner__ring spinner__ring--mid"></div>
          <div class="spinner__ring spinner__ring--inner"></div>
          <div class="spinner__center"></div>
        </div>
        <p class="loading-overlay__text">${message}</p>
      `;
      document.body.appendChild(overlay);
    } else {
      overlay.querySelector('.loading-overlay__text').textContent = message;
      overlay.classList.remove('hidden');
    }
  }

  function hideLoading() {
    const overlay = document.getElementById('ap-loading');
    if (overlay) {
      overlay.classList.add('hidden');
      setTimeout(() => overlay.remove(), 400);
    }
  }

  // ── Modal ─────────────────────────────────────────────────────────────────

  function initModalHandlers() {
    document.addEventListener('click', e => {
      const backdrop = e.target.closest('.modal-backdrop');
      if (backdrop && e.target === backdrop) closeModal(backdrop.id);

      const trigger = e.target.closest('[data-modal-open]');
      if (trigger) openModal(trigger.dataset.modalOpen);

      const closer = e.target.closest('[data-modal-close]');
      if (closer) {
        const modal = closer.closest('.modal-backdrop');
        if (modal) closeModal(modal.id);
      }
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        const open = document.querySelector('.modal-backdrop.open');
        if (open) closeModal(open.id);
      }
    });
  }

  function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.add('open');
      modal.style.display = 'flex';
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.remove('open');
      modal.style.display = 'none';
      modal.setAttribute('aria-hidden', 'true');
      const drawerOpen = document.querySelector('.navbar__mobile-menu.open');
      if (!drawerOpen) document.body.style.overflow = '';
    }
  }

  // ── Tabs ──────────────────────────────────────────────────────────────────

  function initTabs(container) {
    const triggers = container.querySelectorAll('.tabs__trigger');
    const panels   = container.querySelectorAll('.tabs__panel');

    triggers.forEach(trigger => {
      trigger.addEventListener('click', () => {
        const target = trigger.dataset.tab;

        triggers.forEach(t => { t.setAttribute('aria-selected', 'false'); });
        panels.forEach(p => { p.setAttribute('aria-hidden', 'true'); });

        trigger.setAttribute('aria-selected', 'true');
        const panel = container.querySelector(`#tab-${target}`);
        if (panel) panel.setAttribute('aria-hidden', 'false');
      });
    });

    // Activate first tab
    if (triggers[0]) triggers[0].click();
  }

  // ── Score Bars ────────────────────────────────────────────────────────────

  function animateScoreBars(container) {
    const bars = (container || document).querySelectorAll('.score-bar__fill');
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const fill  = entry.target;
          const value = fill.dataset.value || '0';
          fill.style.width = value + '%';
          observer.unobserve(fill);
        }
      });
    }, { threshold: 0.2 });

    bars.forEach(b => observer.observe(b));
  }

  function animateCircularProgress(el) {
    if (!el) return;
    const fill  = el.querySelector('.circular-progress__fill');
    const num   = el.querySelector('.circular-progress__number');
    if (!fill) return;

    const target    = parseFloat(fill.dataset.value) || 0;
    const circumference = 440;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        const offset = circumference - (target / 100) * circumference;
        fill.style.strokeDashoffset = offset;
        if (num) {
          let current = 0;
          const step = target / 60;
          const timer = setInterval(() => {
            current = Math.min(current + step, target);
            num.textContent = Math.round(current) + '%';
            if (current >= target) clearInterval(timer);
          }, 16);
        }
        observer.unobserve(el);
      }
    }, { threshold: 0.3 });
    observer.observe(el);
  }

  // ── Scroll Animations ─────────────────────────────────────────────────────

  function initScrollAnimations() {
    const animatable = document.querySelectorAll('.card, .zodiac-card, .step, .testimonial-card, .transit-item');
    const observer   = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    animatable.forEach(el => observer.observe(el));
  }

  // ── Chart Form Helpers ────────────────────────────────────────────────────

  // City autocomplete using a static dataset of major cities
  const CITIES = [
    { name: 'New York',      country: 'US', lat: 40.7128,  lon: -74.0060  },
    { name: 'Los Angeles',   country: 'US', lat: 34.0522,  lon: -118.2437 },
    { name: 'Chicago',       country: 'US', lat: 41.8781,  lon: -87.6298  },
    { name: 'Houston',       country: 'US', lat: 29.7604,  lon: -95.3698  },
    { name: 'Phoenix',       country: 'US', lat: 33.4484,  lon: -112.0740 },
    { name: 'London',        country: 'UK', lat: 51.5074,  lon: -0.1278   },
    { name: 'Paris',         country: 'FR', lat: 48.8566,  lon: 2.3522    },
    { name: 'Berlin',        country: 'DE', lat: 52.5200,  lon: 13.4050   },
    { name: 'Tokyo',         country: 'JP', lat: 35.6762,  lon: 139.6503  },
    { name: 'Sydney',        country: 'AU', lat: -33.8688, lon: 151.2093  },
    { name: 'Mumbai',        country: 'IN', lat: 19.0760,  lon: 72.8777   },
    { name: 'São Paulo',     country: 'BR', lat: -23.5505, lon: -46.6333  },
    { name: 'Mexico City',   country: 'MX', lat: 19.4326,  lon: -99.1332  },
    { name: 'Cairo',         country: 'EG', lat: 30.0444,  lon: 31.2357   },
    { name: 'Toronto',       country: 'CA', lat: 43.6532,  lon: -79.3832  },
    { name: 'Madrid',        country: 'ES', lat: 40.4168,  lon: -3.7038   },
    { name: 'Rome',          country: 'IT', lat: 41.9028,  lon: 12.4964   },
    { name: 'Moscow',        country: 'RU', lat: 55.7558,  lon: 37.6173   },
    { name: 'Istanbul',      country: 'TR', lat: 41.0082,  lon: 28.9784   },
    { name: 'Dubai',         country: 'AE', lat: 25.2048,  lon: 55.2708   },
    { name: 'Singapore',     country: 'SG', lat: 1.3521,   lon: 103.8198  },
    { name: 'Seoul',         country: 'KR', lat: 37.5665,  lon: 126.9780  },
    { name: 'Bangkok',       country: 'TH', lat: 13.7563,  lon: 100.5018  },
    { name: 'Buenos Aires',  country: 'AR', lat: -34.6037, lon: -58.3816  },
    { name: 'Lagos',         country: 'NG', lat: 6.5244,   lon: 3.3792    },
    { name: 'Johannesburg',  country: 'ZA', lat: -26.2041, lon: 28.0473   },
    { name: 'Amsterdam',     country: 'NL', lat: 52.3676,  lon: 4.9041    },
    { name: 'Vienna',        country: 'AT', lat: 48.2082,  lon: 16.3738   },
    { name: 'Athens',        country: 'GR', lat: 37.9838,  lon: 23.7275   },
    { name: 'Stockholm',     country: 'SE', lat: 59.3293,  lon: 18.0686   },
    { name: 'Copenhagen',    country: 'DK', lat: 55.6761,  lon: 12.5683   },
    { name: 'Warsaw',        country: 'PL', lat: 52.2297,  lon: 21.0122   },
    { name: 'Prague',        country: 'CZ', lat: 50.0755,  lon: 14.4378   },
    { name: 'Lisbon',        country: 'PT', lat: 38.7223,  lon: -9.1393   },
    { name: 'Barcelona',     country: 'ES', lat: 41.3851,  lon: 2.1734    },
    { name: 'Vancouver',     country: 'CA', lat: 49.2827,  lon: -123.1207 },
    { name: 'Melbourne',     country: 'AU', lat: -37.8136, lon: 144.9631  },
    { name: 'Nairobi',       country: 'KE', lat: -1.2921,  lon: 36.8219   },
    { name: 'Cape Town',     country: 'ZA', lat: -33.9249, lon: 18.4241   },
    { name: 'Casablanca',    country: 'MA', lat: 33.5731,  lon: -7.5898   },
    { name: 'Beirut',        country: 'LB', lat: 33.8886,  lon: 35.4955   },
    { name: 'Tel Aviv',      country: 'IL', lat: 32.0853,  lon: 34.7818   },
    { name: 'Karachi',       country: 'PK', lat: 24.8607,  lon: 67.0011   },
    { name: 'Dhaka',         country: 'BD', lat: 23.8103,  lon: 90.4125   },
    { name: 'Manila',        country: 'PH', lat: 14.5995,  lon: 120.9842  },
    { name: 'Jakarta',       country: 'ID', lat: -6.2088,  lon: 106.8456  },
    { name: 'Kuala Lumpur',  country: 'MY', lat: 3.1390,   lon: 101.6869  },
    { name: 'Ho Chi Minh City', country: 'VN', lat: 10.8231, lon: 106.6297 },
    { name: 'Beijing',       country: 'CN', lat: 39.9042,  lon: 116.4074  },
    { name: 'Shanghai',      country: 'CN', lat: 31.2304,  lon: 121.4737  },
    { name: 'San Francisco', country: 'US', lat: 37.7749,  lon: -122.4194 },
    { name: 'Seattle',       country: 'US', lat: 47.6062,  lon: -122.3321 },
    { name: 'Miami',         country: 'US', lat: 25.7617,  lon: -80.1918  },
    { name: 'Boston',        country: 'US', lat: 42.3601,  lon: -71.0589  },
    { name: 'Austin',        country: 'US', lat: 30.2672,  lon: -97.7431  },
    { name: 'Denver',        country: 'US', lat: 39.7392,  lon: -104.9903 },
  ];

  // ── Worldwide place search ────────────────────────────────────────────────
  // Live geocoding via Open-Meteo (GeoNames data — any town or village on
  // Earth), falling back to the built-in city lists when the network is
  // unreachable. Only the typed place query is sent; never the birth moment.

  const GEO_URL = 'https://geocoding-api.open-meteo.com/v1/search';
  const geoCache = new Map();

  function offlinePlaceMatches(q) {
    const list = (window.AstroEphemeris && window.AstroEphemeris.CITIES) || CITIES;
    const starts = [], contains = [];
    for (const c of list) {
      const n = c.name.toLowerCase();
      if (n.startsWith(q)) starts.push(c);
      else if (n.includes(q)) contains.push(c);
    }
    return starts.concat(contains).slice(0, 8).map(c => ({
      name: c.name, admin: '', country: c.country,
      lat: c.lat, lon: c.lon, tz: c.tz || null,
    }));
  }

  async function searchPlaces(query) {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return { results: [], source: 'live' };
    if (geoCache.has(q)) return geoCache.get(q);
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 6000);
      const res = await fetch(
        `${GEO_URL}?name=${encodeURIComponent(q)}&count=8&language=en&format=json`,
        { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`geocoder HTTP ${res.status}`);
      const data = await res.json();
      const results = (data.results || []).map(r => ({
        name: r.name,
        admin: r.admin1 && r.admin1 !== r.name ? r.admin1 : '',
        country: r.country_code || r.country || '',
        lat: r.latitude,
        lon: r.longitude,
        tz: r.timezone || null,
      }));
      const out = { results, source: 'live' };
      geoCache.set(q, out);
      return out;
    } catch (e) {
      return { results: offlinePlaceMatches(q), source: 'offline' };
    }
  }

  function debounce(fn, wait) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  function initCityAutocomplete(inputEl, latEl, lonEl, dropdown) {
    if (!inputEl || !dropdown) return;
    let seq = 0;

    const run = debounce(query => {
      const mySeq = ++seq;
      searchPlaces(query).then(({ results }) => {
        if (mySeq !== seq) return;
        dropdown.innerHTML = '';
        if (results.length === 0) { dropdown.classList.remove('open'); return; }

        results.forEach(city => {
          const item = document.createElement('div');
          item.className = 'autocomplete-item';
          item.setAttribute('role', 'option');
          const region = city.admin ? `${city.admin}, ${city.country}` : city.country;
          item.textContent = city.name + ' ';
          const span = document.createElement('span');
          span.className = 'city-country';
          span.textContent = region;
          item.appendChild(span);
          item.addEventListener('click', () => {
            inputEl.value = city.name;
            if (latEl) latEl.value = city.lat;
            if (lonEl) lonEl.value = city.lon;
            if (city.tz) inputEl.dataset.tz = city.tz;
            dropdown.classList.remove('open');
            inputEl.dispatchEvent(new CustomEvent('citySelected', { detail: city }));
          });
          dropdown.appendChild(item);
        });

        dropdown.classList.add('open');
      });
    }, 250);

    inputEl.addEventListener('input', () => {
      // Editing the text invalidates any previously-picked place — clear the
      // resolved coordinates/timezone so a submit can't reuse stale values for
      // a city the visitor has since retyped (matches chart-page.js).
      if (latEl) latEl.value = '';
      if (lonEl) lonEl.value = '';
      delete inputEl.dataset.tz;
      if (inputEl.value.trim().length < 2) { seq++; dropdown.classList.remove('open'); return; }
      run(inputEl.value);
    });
    inputEl.addEventListener('blur', () => setTimeout(() => dropdown.classList.remove('open'), 200));

    // Keyboard navigation
    inputEl.addEventListener('keydown', e => {
      const items = [...dropdown.querySelectorAll('.autocomplete-item')];
      const hi    = dropdown.querySelector('.highlighted');
      const idx   = hi ? items.indexOf(hi) : -1;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        hi?.classList.remove('highlighted');
        items[Math.min(idx + 1, items.length - 1)]?.classList.add('highlighted');
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        hi?.classList.remove('highlighted');
        items[Math.max(idx - 1, 0)]?.classList.add('highlighted');
      } else if (e.key === 'Enter' && hi) {
        e.preventDefault();
        hi.click();
      } else if (e.key === 'Escape') {
        dropdown.classList.remove('open');
      }
    });
  }

  // ── Timezone Detection ────────────────────────────────────────────────────

  function detectTimezone() {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  // ── Planet Table Builder ──────────────────────────────────────────────────

  function buildPlanetTable(positions, container) {
    if (!positions || !container) return;

    const rows = Object.values(positions).map(p => `
      <tr>
        <td>${p.symbol} ${p.name}</td>
        <td>${p.signSymbol || ''} ${p.sign}</td>
        <td>${p.degree}°</td>
        <td>${p.retrograde ? '<span class="planet-card__retrograde">℞ Rx</span>' : '—'}</td>
        <td><span class="badge badge--${p.element || 'purple'}">${p.element || ''}</span></td>
      </tr>
    `).join('');

    container.innerHTML = `
      <table class="data-table">
        <thead>
          <tr><th>Planet</th><th>Sign</th><th>Degree</th><th>Motion</th><th>Element</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  // ── Horoscope Card Builder ────────────────────────────────────────────────

  function buildHoroscopeCard(sign, date, container) {
    if (!container) return;
    const Interp = window.Interpretations;
    if (!Interp) return;

    const data = Interp.getDailyHoroscope(sign, date);
    container.innerHTML = `
      <div class="card card--gold">
        <div class="flex-between mb-4">
          <h3 class="text-gold">${sign}</h3>
          <span class="tag tag--gold">${data.date}</span>
        </div>
        <p style="line-height:1.8; margin-bottom:var(--space-4)">${data.overview}</p>
        <div class="grid-3 gap-4" style="margin-bottom:var(--space-4)">
          <div class="card" style="padding:var(--space-4)">
            <div class="text-gold" style="font-size:1.2rem;margin-bottom:var(--space-2)"><svg class="eng-i" aria-hidden="true"><use href="#ei-heart"/></svg></div>
            <strong class="text-white" style="display:block;font-size:var(--text-xs);text-transform:uppercase;letter-spacing:.08em;margin-bottom:var(--space-2)">Love</strong>
            <p style="font-size:var(--text-sm);color:var(--color-silver-dim)">${data.love}</p>
          </div>
          <div class="card" style="padding:var(--space-4)">
            <div class="text-gold" style="font-size:1.2rem;margin-bottom:var(--space-2)">${EI('gear')}</div>
            <strong class="text-white" style="display:block;font-size:var(--text-xs);text-transform:uppercase;letter-spacing:.08em;margin-bottom:var(--space-2)">Career</strong>
            <p style="font-size:var(--text-sm);color:var(--color-silver-dim)">${data.career}</p>
          </div>
          <div class="card" style="padding:var(--space-4)">
            <div class="text-gold" style="font-size:1.2rem;margin-bottom:var(--space-2)">${EI('leaf')}</div>
            <strong class="text-white" style="display:block;font-size:var(--text-xs);text-transform:uppercase;letter-spacing:.08em;margin-bottom:var(--space-2)">Health</strong>
            <p style="font-size:var(--text-sm);color:var(--color-silver-dim)">${data.health}</p>
          </div>
        </div>
        <div class="flex gap-4" style="font-size:var(--text-sm)">
          <span>Lucky Number: <strong class="text-gold">${data.luckyNumber}</strong></span>
          <span>Lucky Color: <strong class="text-gold">${data.luckyColor}</strong></span>
        </div>
      </div>
    `;
  }

  return {
    NAV_PRIMARY,
    NAV_CORE,
    NAV_EXTRAS,
    NAV_BOTTOM_TABS,
    NAV_BOTTOM_EXTRAS,
    NAV_BOTTOM_ICONS,
    NAV_BOTTOM_LABELS,
    init,
    showToast,
    showLoading,
    hideLoading,
    openModal,
    closeModal,
    ensureNavEnd,
    cleanupNavEnd,
    closeNavDrawer,
    initTabs,
    animateScoreBars,
    animateCircularProgress,
    initCityAutocomplete,
    searchPlaces,
    debounce,
    detectTimezone,
    buildPlanetTable,
    buildHoroscopeCard,
    CITIES,
  };
})();

window.AstroApp = AstroApp;

// ═══ ENGRAVED ICON SYSTEM ════════════════════════════════════════════════
// Hairline single-colour icons replacing platform colour-emoji, so every
// symbol on the site is drawn in the same engraved hand. stroke:currentColor
// means they inherit gold/silver from their context automatically.
(function injectEngravedIcons() {
  const I = {
    pin: '<path d="M12 21c-4-5.3-6-8.4-6-11a6 6 0 1 1 12 0c0 2.6-2 5.7-6 11Z"/><circle cx="12" cy="10" r="2.2"/>',
    crescent: '<path d="M14.5 3.5a9 9 0 1 0 6.2 11.8A7.2 7.2 0 0 1 14.5 3.5Z"/>',
    sunrise: '<path d="M4 17h16M7 13.5a5 5 0 0 1 10 0M12 8V4.5M9.6 6.4 12 4l2.4 2.4"/>',
    sunhigh: '<circle cx="12" cy="12" r="3.4"/><path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M18 6l-1.6 1.6M7.6 16.4 6 18"/>',
    sunset: '<path d="M4 17h16M7 13.5a5 5 0 0 1 10 0M12 4v3.5M9.6 6.1 12 8.5l2.4-2.4"/>',
    planet: '<circle cx="12" cy="12" r="4.2"/><path d="M4.5 14.8C2.6 13.9 1.6 12.9 2 12c.6-1.4 4.6-1.6 9.4-.4M19.5 9.2c1.9.9 2.9 1.9 2.5 2.8-.6 1.4-4.6 1.6-9.4.4" transform="rotate(-18 12 12)"/>',
    house: '<path d="M4 11.5 12 5l8 6.5M6.5 10v8.5h11V10M10.5 18.5v-5h3v5"/>',
    gem: '<path d="M7 4h10l3.5 5L12 20 3.5 9 7 4ZM3.5 9h17M9.5 9 12 19.5 14.5 9M7 4l2.5 5M17 4l-2.5 5"/>',
    spiral: '<path d="M12 12a1.6 1.6 0 1 0 1.6 1.6A3.6 3.6 0 1 0 10 9.4 6 6 0 1 1 6.4 15 8.6 8.6 0 1 0 12 3.4"/>',
    orb: '<circle cx="12" cy="10.5" r="6.3"/><path d="M8.5 19h7M9.8 16.5h4.4M8.8 8.2a3.6 3.6 0 0 1 3-1.8"/>',
    calendar: '<rect x="4" y="5.5" width="16" height="15" rx="2"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
    lock: '<rect x="6" y="11" width="12" height="9" rx="2"/><path d="M9 11V8a3 3 0 0 1 6 0v3"/>',
    mail: '<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M3.5 7 12 13l8.5-6"/>',
    gear: '<circle cx="12" cy="12" r="3.1"/><path d="M12 4.2v2.1M12 17.7v2.1M4.2 12h2.1M17.7 12h2.1M6.5 6.5 8 8M16 16l1.5 1.5M17.5 6.5 16 8M8 16l-1.5 1.5"/>',
    infinity: '<path d="M6 12c0-2.1 1.5-3.4 2.9-3.4 2.7 0 4.5 6.8 7.2 6.8 1.4 0 2.9-1.3 2.9-3.4s-1.5-3.4-2.9-3.4c-2.7 0-4.5 6.8-7.2 6.8C7.5 15.4 6 14.1 6 12Z"/>',
    chat: '<path d="M4.5 6.5h15v9.5h-10l-5 4v-13.5Z" stroke-linejoin="round"/>',
    star4: '<path d="M12 3.5 13.7 10l6.5 2-6.5 2L12 20.5 10.3 14l-6.5-2 6.5-2L12 3.5Z"/>',
    eye: '<path d="M2.8 12S6.2 6.8 12 6.8 21.2 12 21.2 12 18 17.2 12 17.2 2.8 12 2.8 12Z"/><circle cx="12" cy="12" r="2.6"/>',
    flame: '<path d="M12 3.2c.9 3.1-3.2 4.7-3.2 8.2a4.7 4.7 0 0 0 9.4.4c.3-3.6-4.2-5.3-6.2-8.6Z"/><path d="M12 20.8a3 3 0 0 1-1.6-5.4"/>',
    wind: '<path d="M3 9.5h10.5a2.3 2.3 0 1 0-2.3-2.3M3 13.5h14.5a2.3 2.3 0 1 1-2.3 2.3M3 17.5h7"/>',
    wave: '<path d="M3 10.5c2-3 4-3 6 0s4 3 6 0 4-3 6 0M3 15.5c2-3 4-3 6 0s4 3 6 0 4-3 6 0"/>',
    leaf: '<path d="M19 4.5c-8 0-13 4-13 10.5 0 2 .4 3.4 1 5 5 .6 13-3 12-15.5Z"/><path d="M7 19.5C9 12.5 13 8.5 18 5.5"/>',
    heart: '<path d="M12 19.8s-7.3-4.6-9-8.7A5 5 0 0 1 12 7a5 5 0 0 1 9 4.1c-1.7 4.1-9 8.7-9 8.7Z"/>',
    book: '<path d="M5 4.5h6.5V19H7a2 2 0 0 1-2-2V4.5ZM19 4.5h-6.5V19H17a2 2 0 0 0 2-2V4.5ZM11.5 4.5v14.5"/>',
    books: '<path d="M4 19.5V5h3.5v14.5M9 19.5V7.5h3.5v12M14.5 18.8 17 6.5l3.4.8-2.5 12.3"/><path d="M3 19.5h18"/>',
    telescope: '<path d="m4.5 13.5 11-6.4 2.2 3.8-11 6.4zM15.5 7.1 18 4.5l2.8 4.8-3.1 1.4M9 17.5l-2.2 3.3M11.5 16.8l1.7 4"/>',
    map: '<path d="m3.5 6 5.5-2 6 2 5.5-2v14l-5.5 2-6-2-5.5 2V6ZM9 4v14M15 6v14"/>',
    journal: '<rect x="6" y="4" width="13" height="16.5" rx="2"/><path d="M9.5 4v16.5M12.5 8.5h3.5M12.5 12h3.5"/>',
    rings: '<circle cx="9.2" cy="12" r="5"/><circle cx="14.8" cy="12" r="5"/>',
    trident: '<path d="M12 21V6M12 6a4 4 0 0 0 4-4M12 6a4 4 0 0 1-4-4M6.5 9.5a5.5 5.5 0 0 0 11 0M9.5 21h5"/>',
    warn: '<path d="M12 4 2.8 19.5h18.4L12 4ZM12 10v4.2M12 16.8v.4"/>',
    check: '<path d="M5.5 12.5 10 17l8.5-9"/>',
    close: '<path d="M7.5 7.5 16.5 16.5M16.5 7.5 7.5 16.5"/>',
    moon0: '<circle cx="12" cy="12" r="7.6"/>',
    moon1: '<circle cx="12" cy="12" r="7.6"/><path d="M12 4.4a7.6 7.6 0 0 1 0 15.2A10.4 10.4 0 0 0 12 4.4Z" fill="currentColor" stroke="none" opacity=".8"/>',
    moon2: '<circle cx="12" cy="12" r="7.6"/><path d="M12 4.4a7.6 7.6 0 0 1 0 15.2Z" fill="currentColor" stroke="none" opacity=".8"/>',
    moon3: '<circle cx="12" cy="12" r="7.6"/><path d="M12 4.4a7.6 7.6 0 0 1 0 15.2A10.4 10.4 0 0 1 12 4.4Z" fill="currentColor" stroke="none" opacity=".8"/>',
    moon4: '<circle cx="12" cy="12" r="7.6" fill="currentColor" opacity=".85"/><circle cx="12" cy="12" r="7.6"/>',
    moon5: '<circle cx="12" cy="12" r="7.6"/><path d="M12 4.4a7.6 7.6 0 0 0 0 15.2A10.4 10.4 0 0 0 12 4.4Z" fill="currentColor" stroke="none" opacity=".8"/>',
    moon6: '<circle cx="12" cy="12" r="7.6"/><path d="M12 4.4a7.6 7.6 0 0 0 0 15.2Z" fill="currentColor" stroke="none" opacity=".8"/>',
    moon7: '<circle cx="12" cy="12" r="7.6"/><path d="M12 4.4a7.6 7.6 0 0 0 0 15.2A10.4 10.4 0 0 1 12 4.4Z" fill="currentColor" stroke="none" opacity=".8"/>',
  };
  const sym = Object.entries(I).map(([k, p]) =>
    `<symbol id="ei-${k}" viewBox="0 0 24 24">${p}</symbol>`).join('');
  const holder = document.createElement('div');
  holder.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;';
  holder.setAttribute('aria-hidden', 'true');
  holder.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg">${sym}</svg>`;
  document.body.insertBefore(holder, document.body.firstChild);
  const st = document.createElement('style');
  st.textContent = `.eng-i{width:1em;height:1em;display:inline-block;vertical-align:-0.12em;
    fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;}`;
  document.head.appendChild(st);
})();

/** Engraved UI helpers — SVG chrome + canvas ornaments (no unicode decoration). */
window.AstroUI = (() => {
  function icon(name, cls) {
    const c = cls ? ' eng-i ' + cls : ' eng-i';
    return `<svg class="${c.trim()}" aria-hidden="true"><use href="#ei-${name || 'star4'}"/></svg>`;
  }
  function drawStar4(ctx, x, y, r) {
    const s = r / 12;
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.moveTo(0, -8.5 * s);
    ctx.lineTo(1.7 * s, -2 * s);
    ctx.lineTo(8 * s, 0);
    ctx.lineTo(1.7 * s, 2 * s);
    ctx.lineTo(0, 8.5 * s);
    ctx.lineTo(-1.7 * s, 2 * s);
    ctx.lineTo(-8 * s, 0);
    ctx.lineTo(-1.7 * s, -2 * s);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  function drawHeart(ctx, x, y, r) {
    const s = r / 12;
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.moveTo(0, 7.8 * s);
    ctx.bezierCurveTo(-7.3 * s, 3.2 * s, -9 * s, -0.7 * s, -3 * s, -5 * s);
    ctx.bezierCurveTo(0, -7 * s, 3 * s, -5 * s, 3 * s, -5 * s);
    ctx.bezierCurveTo(3 * s, -5 * s, 6 * s, -7 * s, 9 * s, -5 * s);
    ctx.bezierCurveTo(15 * s, -0.7 * s, 13.3 * s, 3.2 * s, 0, 7.8 * s);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  return { icon, drawStar4, drawHeart };
})();

// ═══ UNIVERSAL LEGAL FOOTER LINKS ════════════════════════════════════════
// The footer markup varies across pages (and the generated sign pages), so
// rather than hand-edit each one, ensure a consistent Privacy · Terms line
// exists once per page. Idempotent; skips the legal pages themselves.
(function injectLegalLinks() {
  const here = (location.pathname.split('/').pop() || 'index.html');
  if (here === 'privacy.html' || here === 'terms.html') return;
  function place() {
    if (document.querySelector('.ap-legal-links')) return;
    const host = document.querySelector('.footer-legal')
      || document.querySelector('footer .container')
      || document.querySelector('footer');
    if (!host) return;
    const p = document.createElement('p');
    p.className = 'ap-legal-links';
    p.innerHTML = '<a href="privacy.html">Privacy</a>'
      + ' <span class="ap-footer-sep" aria-hidden="true">&middot;</span> '
      + '<a href="terms.html">Terms</a>'
      + ' <span class="ap-footer-sep" aria-hidden="true">&middot;</span> '
      + '<a href="https://www.solarsystemscope.com/textures/" target="_blank" rel="noopener noreferrer">Planet textures &copy; Solar System Scope</a>'
      + ' <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer" class="ap-legal-links__cc">CC&nbsp;BY&nbsp;4.0</a>';
    host.appendChild(p);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', place);
  else place();
})();

// ═══ UNIVERSAL "ACCURACY" NAV LINK ═══════════════════════════════════════
// Nav markup is hardcoded per page; rather than edit ~25 files, inject the
// Accuracy link into both the desktop and mobile nav lists once, here.
(function injectExtraNav() {
  // Secondary tools go in the MOBILE menu only (it scrolls) — keep the desktop
  // top-bar lean at its hardcoded core. Footer guide-links cover desktop discovery.
  var EXTRAS = [
    { href: 'charts.html', label: 'My Charts' },
    { href: 'quiz.html', label: 'Cosmic Quiz' },
    { href: 'tonight.html', label: "Tonight's Sky" },
    { href: 'moonphase.html', label: 'Moon Phase' },
    { href: 'retrograde.html', label: 'Retrograde' },
    { href: 'angel-numbers.html', label: 'Angel Numbers' },
    { href: 'name-numerology.html', label: 'Name Numerology' },
    { href: 'what-is-my-rising-sign.html', label: 'Rising Sign' },
    { href: 'synastry.html', label: 'Synastry' },
    { href: 'solar-return.html', label: 'Solar Return' },
    { href: 'accuracy.html', label: 'Accuracy' },
  ];
  function place() {
    // Superseded by renderNav() (the single source of truth in init()), which now
    // injects these secondary tools into the mobile menu itself. Kept as a no-op.
    return;
    var lists = document.querySelectorAll('.navbar__mobile-menu');
    if (!lists.length) return;
    var here = (location.pathname.split('/').pop() || 'index.html');
    lists.forEach(function (list) {
      var anchor = list.querySelector('a[href="shop.html"]'); // insert before Shop, in order
      EXTRAS.forEach(function (x) {
        if (list.querySelector('a[href="' + x.href + '"]')) return;
        var a = document.createElement('a');
        a.className = 'navbar__link' + (here === x.href ? ' active' : '');
        a.href = x.href;
        a.textContent = x.label;
        if (here === x.href) a.setAttribute('aria-current', 'page');
        if (anchor) list.insertBefore(a, anchor); else list.appendChild(a);
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', place);
  else place();
})();

// ═══ FOOTER GUIDE / TOOL LINKS (site-wide internal links for SEO) ════════
(function injectGuideLinks() {
  function place() {
    if (document.querySelector('.ap-guide-links')) return;
    var host = document.querySelector('footer .container') || document.querySelector('footer');
    if (!host) return;
    var links = [
      ['what-is-my-rising-sign.html', 'Rising sign'],
      ['quiz.html', 'Cosmic archetype quiz'],
      ['tonight.html', 'Tonight’s sky'],
      ['moonphase.html', 'Moon phase'],
      ['retrograde.html', 'Mercury retrograde'],
      ['angel-numbers.html', 'Angel numbers'],
      ['name-numerology.html', 'Name numerology'],
      ['synastry.html', 'Synastry'],
      ['solar-return.html', 'Solar return'],
      ['charts.html', 'My charts'],
      ['accuracy.html', 'How it’s accurate'],
    ];
    var p = document.createElement('p');
    p.className = 'ap-guide-links';
    p.innerHTML = 'Guides &amp; tools: ' + links.map(function (l) {
      return '<a href="' + l[0] + '">' + l[1] + '</a>';
    }).join(' <span class="ap-footer-sep" aria-hidden="true">&middot;</span> ');
    host.appendChild(p);

    // Family of sites — dormant-safe: only links the siblings whose URLs are set in AP_MON.family
    var fam = (window.AP_MON && window.AP_MON.family) || {};
    var famLinks = [];
    if (fam.biggerPicture) famLinks.push('<a href="' + fam.biggerPicture + '" target="_blank" rel="noopener">The Bigger Picture</a>');
    if (fam.backInTime) famLinks.push('<a href="' + fam.backInTime + '" target="_blank" rel="noopener">Back In Time</a>');
    if (famLinks.length) {
      var fp = document.createElement('p');
      fp.className = 'ap-family-links';
      fp.innerHTML = 'A small family of sites — <strong>AstroPrecise</strong> <span class="ap-footer-sep" aria-hidden="true">&middot;</span> '
        + famLinks.join(' <span class="ap-footer-sep" aria-hidden="true">&middot;</span> ');
      host.appendChild(fp);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', place);
  else place();
})();

// ═══ SOCIAL LINKS — dormant-by-default, single config (honesty: only render set handles) ═══
// Paste a full profile URL to switch each channel on; empty = hidden (no dead links).
// Used by the footer social row AND by links.html (the link-in-bio page).
window.AP_SOCIAL = window.AP_SOCIAL || {
  handle:    '@astroprecise',
  tiktok:    '',  // https://www.tiktok.com/@astroprecise
  instagram: '',  // https://www.instagram.com/astroprecise
  pinterest: '',  // https://www.pinterest.com/astroprecise
  reddit:    '',  // https://www.reddit.com/user/astroprecise
  youtube:   '',  // https://www.youtube.com/@astroprecise
  x:         '',  // https://x.com/astroprecise
  threads:   '',  // https://www.threads.net/@astroprecise
  facebook:  '',  // https://www.facebook.com/astroprecise
  linkedin:  '',  // https://www.linkedin.com/company/astroprecise
  bluesky:   '',  // https://bsky.app/profile/astroprecise.bsky.social
};
// Footer icon row + affiliate ads: js/affiliate-social.js (auto-loaded below).

// ═══════════════════════════════════════════════════════════════════════
// MONETISATION — provider-agnostic, dormant-by-default, link-out only.
// GitHub Pages forbids SELLING on the site, but permits donation/crowdfunding
// links, and outbound links to storefronts hosted elsewhere are fine. So every
// avenue here is an external link (tips, hosted product pages, newsletter,
// affiliate). Nothing renders until you paste a real URL below — so a visitor
// never sees a broken or fake checkout.  ◆ EDIT THIS BLOCK TO GO LIVE ◆
// ═══════════════════════════════════════════════════════════════════════
window.AP_MON = Object.assign({
  family: { biggerPicture: '', backInTime: '' },  // sibling sites — footer "family of sites" links (dormant until set)
  tipUrl:       'https://ko-fi.com/astroprecise',   // tips/support — Ko-fi (0% on tips). LIVE 2026-06-14.
  reportUrl:    'https://astroprecise.lemonsqueezy.com/checkout/custom/26df35e8-84a8-4cb3-b4d0-7142c67b2a67?signature=25e108b98182e113f0045cc9c16fdf883cf2460b0fb5ab6b7af8ce7cecfd88ec',   // premium written natal report — hosted product (Gumroad / Ko-fi Shop / Lemon Squeezy)
  posterUrl:    'https://astroprecise.lemonsqueezy.com/checkout/custom/42029e1a-1d9c-401d-be71-ab517e3da594?signature=fdafb9c0f633768be80c55b56786ca47f2d63920ca0fed8709ab41e83c78ad8a',   // printable / print-on-demand chart poster — hosted store (Gumroad / Etsy / Gelato store)
  giftUrl:      'https://astroprecise.lemonsqueezy.com/checkout/custom/2fd63e38-78d6-4096-b0b5-db3ae68a8287?signature=05153867779b0dba4aba5b1e2349cc3af3252c65c047a9e906a366d3bf158f15',   // gift a reading — hosted product
  newsletterUrl:'https://list.astroprecise.app/subscribe',   // LIVE — CF Worker + KV (ap-subscribe)
  affiliateTag: '',   // Amazon Associates tag — auto-appended to amazon.* links site-wide (e.g. astroprecise-21)
  // Editorial affiliate picks — disclosed ad strip before footer on key pages (js/affiliate-social.js).
  affiliate: {
    adsEnabled: true,
    amazonTag: '',   // alias for affiliateTag; either field works
    pages: [
      'index.html', 'index-full.html', 'chart.html', 'horoscope.html',
      'compatibility.html', 'transits.html', 'lifepath.html',
      'shop.html', 'ephemeris.html', 'tonight.html',
    ],
    picks: [
      {
        id: 'woolfolk',
        title: "The Only Astrology Book You'll Ever Need",
        blurb: 'The single best intro — sun, moon, rising, houses, and synastry in one volume.',
        url: 'https://www.amazon.co.uk/s?k=The+Only+Astrology+Book+You+ll+Ever+Need+Woolfolk',
        source: 'Amazon',
        price: '~£14',
        tag: 'Book',
      },
      {
        id: 'inner-sky',
        title: 'The Inner Sky',
        blurb: 'Steven Forrest on the sky as psychological mirror — pairs with a deep chart reading.',
        url: 'https://www.amazon.co.uk/s?k=The+Inner+Sky+Steven+Forrest',
        source: 'Amazon',
        price: '~£16',
        tag: 'Advanced',
      },
      {
        id: 'moonology-oracle',
        title: 'Moonology Oracle Cards',
        blurb: '44-card lunar oracle — elegant companion to AstroPrecise moon phase data.',
        url: 'https://www.amazon.co.uk/s?k=Moonology+Oracle+Cards+Yasmin+Boland',
        source: 'Amazon',
        price: '~£16',
        tag: 'Oracle',
      },
      {
        id: 'astrology-bible',
        title: 'The Astrology Bible',
        blurb: 'Judy Hall’s illustrated reference — signs, planets, and aspects at a glance.',
        url: 'https://www.amazon.co.uk/s?k=The+Astrology+Bible+Judy+Hall',
        source: 'Amazon',
        price: '~£12',
        tag: 'Reference',
      },
      {
        id: 'planets-in-transit',
        title: 'Planets in Transit',
        blurb: 'Robert Hand’s transit classic — the desk companion for our transits tool.',
        url: 'https://www.amazon.co.uk/s?k=Planets+in+Transit+Robert+Hand',
        source: 'Amazon',
        price: '~£22',
        tag: 'Transits',
      },
    ],
  },
  // Deep Reading purchase link — the chart-page teaser's CTA points here when set.
  // Same rule as the rest: a hosted product page (Gumroad / Ko-fi Shop / Lemon
  // Squeezy). Empty '' = DORMANT: the teaser button falls back to email capture,
  // never a fake checkout.
  deepReadingUrl: 'https://astroprecise.lemonsqueezy.com/checkout/custom/26df35e8-84a8-4cb3-b4d0-7142c67b2a67?signature=25e108b98182e113f0045cc9c16fdf883cf2460b0fb5ab6b7af8ce7cecfd88ec',
  // Price shown on the chart-page Deep Reading CTA — e.g. '£29'. Blank = no price
  // displayed (honesty: never show a price until the product is live and it matches
  // the storefront listing exactly).
  deepReadingPrice: '£12',
  // Compatibility "Full Synastry" unlock — the compatibility page keeps the top 8
  // cross-chart aspects + category scores + overview FREE; the rest unlock here.
  // Hosted checkout (Lemon Squeezy) that redirects back to compatibility.html?unlocked=1.
  // Empty '' = DORMANT: everything stays free (no downgrade pre-launch). When set,
  // the "Show all aspects" toggle becomes an "Unlock — <price>" button.
  compatUnlockUrl: '',
  compatUnlockPrice: '£1.99',   // shown on the unlock button only when compatUnlockUrl is set
  // Saturn Return reading + PDF unlock. Dormant ('') = the full reading shows FREE
  // (no pre-launch downgrade); the finder DATES are always free. Set this to a
  // hosted checkout (Lemon Squeezy) that redirects to saturn-return.html?unlocked=1.
  saturnReturnUrl: '',
  saturnReturnPrice: '£0.19',
  // Email-list signup ENDPOINT (a hosted newsletter form-action, e.g. Buttondown
  // https://buttondown.email/api/emails/embed-subscribe/<user>, or a Mailchimp
  // post URL). Empty '' = DORMANT: the chart-page email form saves intent in
  // localStorage only — no data leaves the device. When set, the form POSTs here.
  emailUrl: 'https://list.astroprecise.app/subscribe',
  ownerEmail: 'hello@astroprecise.app',   // fallback relay + owner notifications from worker

  // ═══════════════════════════════════════════════════════════════════════
  // COMMERCE — the "wear your sky" shop (config-driven, dormant by default).
  // ─────────────────────────────────────────────────────────────────────
  // Read by js/shop-commerce.js (window.AstroShop). The whole catalogue is
  // PERSONALISED-per-chart, ONE-TIME purchases — no subscriptions. Every
  // product fulfils elsewhere (hosted store / Etsy / Gelato / Gumroad), so
  // the site itself never takes money — Pages-compliant, link-out only.
  //
  // GO-LIVE: paste a URL into ONE of these and the matching path lights up.
  // Checkout priority (per item, highest first):
  //   1. product.fulfilUrl   — that product's own hosted listing ("Buy Now")
  //   2. checkout.externalStoreUrl / checkout.etsyUrl — whole-cart handoff
  //   3. checkout.paypalClientId — on-site PayPal Buttons (advanced)
  //   4. (none set) — DORMANT branded modal + email-signup invite
  // While every field below is '' the shop stays in honest pre-launch mode:
  // the cart is real and saved locally, but checkout invites you to be told
  // when the doors open — it never shows a fake or broken checkout.
  commerce: {
    // ── POST-PURCHASE PROMOS ─────────────────────────────────────────────
    promos: {
      twoSkies: {
        code: 'TWOSKIES50',
        percent: 50,
        productId: 'two-skies-map',
        expiresDays: 30,
      },
    },

    // ── CHECKOUT — how the cart actually fulfils ──────────────────────────
    checkout: {
      paypalClientId:   '',   // PayPal REST Client ID → on-site Buttons (developer.paypal.com)
      currency:         'GBP',
      externalStoreUrl: '',   // whole-cart handoff to a hosted store (Shopify / Gelato pop-up)
      etsyUrl:          '',    // Etsy storefront ("Browse on Etsy" path)
    },

    // ── COLLECTIONS — the architecture of the sky ─────────────────────────
    // Every piece belongs to one collection. Re-themed from TBP's tree to
    // the chart: what you were born under, what you wear, what you keep.
    collections: {
      wearYourSky: {
        name: 'Wear Your Sky',
        story: 'Your exact birth sky, rendered for the body. Each piece is generated from your own chart — no two are alike.',
      },
      onYourWall: {
        name: 'On Your Wall',
        story: 'The map of the moment you arrived, printed to keep. Archive paper, your real placements, museum-grade.',
      },
      theReading: {
        name: 'The Reading',
        story: 'Words for your chart alone. Deep written readings and personalised guidance, delivered to you.',
      },
      gifts: {
        name: 'Gifts',
        story: 'A chart made for someone else — their exact sky, delivered with a note from you. Recipient birth details and your gift message are collected privately at checkout, never on this site.',
      },
      jewellery: {
        name: 'Jewellery',
        story: 'Wearable sky talismans — pendants, bars and medallions engraved from your exact natal chart. Personalised accessories you can carry every day.',
      },
    },

    // ── PRODUCTS ──────────────────────────────────────────────────────────
    // type: 'digital' | 'print' | 'apparel' | 'accessory'
    // personalized: true  → art/text is generated from the buyer's own chart
    // fulfilUrl: ''       → DORMANT (no per-product link yet); '' keeps it honest
    products: [
      {
        id:           'natal-poster',
        available:    true,
        name:         'Your Natal Sky — Art Poster',
        type:         'print',
        collection:   'onYourWall',
        price:        20.00,
        personalized: true,
        badge:        'Made to order',
        marketingLine:'Fine-art print of the sky at your first breath.',
        previewImage: 'img/shop/product-natal-poster.jpg',
        blurb:        'Your full birth chart as a fine-art print — the exact planetary geometry of your first breath, drawn in engraved gold on void black. 250gsm museum-grade matte, made to order. Foil and framed options at checkout.',
        icon:         'map',
        fulfilUrl:    'https://astroprecise.lemonsqueezy.com/checkout/custom/b96ab7e6-5b60-463f-a447-2829c65d1948?signature=aaba0330319df3dabc194a375ea7f37b3da70655687fae87c9b686b84d7882a7',
      },
      {
        id:           'sky-tee',
        available:    true,
        name:         'Your Sky — Tee',
        type:         'apparel',
        collection:   'wearYourSky',
        price:        18.00,
        personalized: true,
        badge:        'Made to order',
        marketingLine:'Constellations from your birth night — wearable chart.',
        previewImage: 'img/shop/product-sky-tee.jpg',
        blurb:        'The constellations overhead at your birth, printed across heavyweight cotton. Your sun, moon and rising marked in gold thread — a chart you can wear.',
        icon:         'star4',
        fulfilUrl:    'https://astroprecise.lemonsqueezy.com/checkout/custom/bc99eaab-fe40-4336-84be-4986169b7d4f?signature=7f07cebec6e274b3898992547b0816503b90a83554ca3311ff372714b5dc05c9',
      },
      {
        id:           'sky-hoodie',
        available:    true,
        name:         'Your Sky — Heavyweight Hoodie',
        type:         'apparel',
        collection:   'wearYourSky',
        price:        32.00,
        personalized: true,
        badge:        null,
        marketingLine:'Your natal canopy across the back — 350gsm fleece.',
        previewImage: 'img/shop/product-sky-hoodie.jpg',
        blurb:        'Your natal canopy across the back in fine line-work; your big-three glyphs at the cuff. Premium 350 gsm fleece, printed to order from your chart.',
        icon:         'crescent',
        fulfilUrl:    'https://astroprecise.lemonsqueezy.com/checkout/custom/e4433127-c65b-481d-8cb9-9b1d5f95006e?signature=82e68c110830134e1d7a986f3ab12414233529ba426f61e01eaf9deaec5f6caa',
      },
      {
        id:           'big-three-print',
        available:    true,
        name:         'Big Three — Mini Print',
        type:         'print',
        collection:   'onYourWall',
        price:        10.00,
        personalized: true,
        badge:        null,
        marketingLine:'Sun, Moon, Rising — the chart distilled to its spine.',
        previewImage: 'img/shop/product-big-three.jpg',
        blurb:        'Sun, Moon and Rising — your three load-bearing placements set as a clean typographic print. The chart distilled to its spine.',
        icon:         'sunhigh',
        fulfilUrl:    'https://astroprecise.lemonsqueezy.com/checkout/custom/293d41b4-95b2-49b8-a5dd-933ba8bac28d?signature=ae2e0280080783aee3858dae9dacaa67047fb9043c0f62f96fe2e84409103353',
      },
      {
        id:           'constellation-mug',
        available:    true,
        name:         'Your Star Map — Mug',
        type:         'accessory',
        collection:   'wearYourSky',
        price:        9.00,
        personalized: true,
        badge:        null,
        marketingLine:'Your birth sky on matte ceramic — morning ritual.',
        previewImage: 'img/shop/product-mug.jpg',
        blurb:        'The sky over your birthplace wrapped around matte ceramic, your sun-sign glyph at the rim. The first synchronicity of every morning.',
        icon:         'orb',
        fulfilUrl:    'https://astroprecise.lemonsqueezy.com/checkout/custom/1f278c11-0c09-4ea8-9d90-4eec2a168287?signature=c36479767c244cd7173a7a6a218d7aadaabd3bf7c71e4b7450d9a9c1c3270346',
      },
      {
        id:           'cosmic-story',
        available:    true,
        featured:     true,
        name:         'Your Cosmic Story — Personalised Narrative',
        type:         'digital',
        collection:   'theReading',
        price:        14.00,
        personalized: true,
        badge:        'Written for you',
        marketingLine:'The story of you — told through the exact sky of your first breath.',
        previewImage: 'img/shop/product-cosmic-story.svg',
        blurb:        'Not a report — a story. Your birth chart retold as a flowing personal narrative: the arc of your Sun, Moon and rising sign, the tensions and gifts written into your aspects, and where your planets are quietly leading you. Drawn entirely from your real VSOP87 chart and written for you alone — a keepsake PDF to read and return to.',
        icon:         'book',
      },
      {
        id:           'deep-reading',
        available:    true,
        featured:     true,
        name:         'Deep Natal Reading — Digital',
        type:         'digital',
        collection:   'theReading',
        price:        12.00,
        personalized: true,
        badge:        'Instant PDF',
        marketingLine:'The words your chart has been waiting for — written for you alone.',
        previewImage: 'img/shop/product-deep-reading.jpg',
        sampleUrl:    'sample-reading.html',
        blurb:        'Thirteen pages from the same engine as your free chart — every planet, all twelve houses, love/career/wellbeing chapters, chart patterns, and ten tightest aspects. Typeset as a beautifully set PDF, yours to keep forever.',
        icon:         'book',
        fulfilUrl:    'https://astroprecise.lemonsqueezy.com/checkout/custom/26df35e8-84a8-4cb3-b4d0-7142c67b2a67?signature=25e108b98182e113f0045cc9c16fdf883cf2460b0fb5ab6b7af8ce7cecfd88ec',
      },
      {
        id:           'year-ahead',
        available:    true,
        name:         'Your Year Ahead — Transit Report',
        type:         'digital',
        collection:   'theReading',
        price:        16.00,
        personalized: true,
        badge:        'Instant PDF',
        marketingLine:'Twelve months of transits — your personal sky forecast.',
        previewImage: 'img/shop/product-year-ahead.svg',
        blurb:        'Every major transit to your natal chart for the next twelve months, dated and interpreted — an honest forecast drawn from your own placements, not a generic horoscope.',
        icon:         'calendar',
        fulfilUrl:    'https://astroprecise.lemonsqueezy.com/checkout/custom/473b0829-db32-4bf7-a275-7d706b31cded?signature=1b06bda8eba8a32013da2c2643d1c555e88f8deca10bad16bcb9354971283785',
      },
      {
        id:           'natal-poster-pdf',
        available:    true,
        featured:     true,
        name:         'Your Natal Sky — Print-at-Home PDF',
        type:         'digital',
        collection:   'onYourWall',
        price:        6.00,
        personalized: true,
        badge:        'Instant PDF',
        marketingLine:'Your exact sky, ready to print tonight.',
        previewImage: 'img/shop/product-poster-pdf.jpg',
        blurb:        'Your full birth chart as a print-ready PDF — the exact planetary geometry of your first breath, set on void black. Print it at home or at any print shop, any size. Delivered as a PDF, yours to keep.',
        icon:         'map',
        fulfilUrl:    'https://astroprecise.lemonsqueezy.com/checkout/custom/42029e1a-1d9c-401d-be71-ab517e3da594?signature=fdafb9c0f633768be80c55b56786ca47f2d63920ca0fed8709ab41e83c78ad8a',
      },
      {
        id:           'reading-poster-bundle',
        available:    true,
        featured:     true,
        name:         'Deep Reading + Poster — Bundle',
        type:         'digital',
        collection:   'theReading',
        price:        16.00,
        anchorWas:    18.00,
        personalized: true,
        badge:        'Best value',
        marketingLine:'Reading, poster, free wallpaper & a Two Skies offer — save £2.',
        previewImage: 'img/shop/product-bundle.jpg',
        sampleUrl:    'sample-reading.html',
        blurb:        'Your long-form Deep Natal Reading and print-at-home natal poster, generated together from one chart. Includes free chart wallpaper (email unlock) and a 50% code for Two Skies after purchase. Future bundles will pair readings with Observatory Disc or Seal Medallion jewellery.',
        bundlePerks:  ['Free chart wallpaper', '50% off Two Skies map', 'Two PDFs · save £2', 'Jewellery cross-sell placeholders live in catalogue'],
        icon:         'book',
        fulfilUrl:    'https://astroprecise.lemonsqueezy.com/checkout/custom/2c503a60-c01e-4694-9a56-c179f9a8a4b7?signature=818268afc134daac9ba3ed051e5eb2d8a5b10c4ac392dc2a45afb4782bd4ec3f',
      },
      {
        id:           'solar-return',
        available:    true,
        name:         'Solar Return — Your Birthday Year',
        type:         'digital',
        collection:   'theReading',
        price:        14.00,
        personalized: true,
        badge:        'Instant PDF',
        marketingLine:'Your birthday sky — the annual ritual, no subscription.',
        previewImage: 'img/shop/product-solar-return.jpg',
        blurb:        'Your solar-return chart for this birthday — the sky at the exact moment the Sun returns to its natal degree, read as the theme of your coming year. An annual ritual, no subscription. Delivered as a PDF.',
        icon:         'sunhigh',
        fulfilUrl:    'https://astroprecise.lemonsqueezy.com/checkout/custom/d81bce29-044a-46e4-83ef-f1350c016fc1?signature=7f8f3aa74c633df77621fedb90186a251ab1cae0b76af1dbb1e0034ad4203723',
      },
      {
        id:           'gift-reading',
        available:    true,
        name:         'Gift a Reading',
        type:         'digital',
        collection:   'gifts',
        price:        15.00,
        personalized: true,
        giftNote:     true,
        badge:        null,
        marketingLine:'A Deep Reading for someone you love — voucher + your note.',
        previewImage: 'img/shop/product-gift-reading.jpg',
        blurb:        'A Deep Natal Reading for someone you love — sent as a PDF gift voucher with a redemption code. They redeem by email and give us their own birth details; we generate the reading and deliver it with your note. Choose a delivery date at checkout.',
        icon:         'heart',
        fulfilUrl:    'https://astroprecise.lemonsqueezy.com/checkout/custom/2fd63e38-78d6-4096-b0b5-db3ae68a8287?signature=05153867779b0dba4aba5b1e2349cc3af3252c65c047a9e906a366d3bf158f15',
      },
      {
        id:           'gift-box-whole-sky',
        available:    true,
        name:         'The Whole Sky — Gift Box',
        type:         'print',
        collection:   'gifts',
        price:        35.00,
        personalized: true,
        giftNote:     true,
        badge:        'Gift',
        marketingLine:'Reading PDF + foil print + gift card — the complete sky.',
        previewImage: 'img/shop/product-gift-box.jpg',
        blurb:        'The complete gift: a Deep Natal Reading PDF plus an A4 foil natal print, shipped, with a personalised gift card carrying your note. They redeem the reading by email with their own birth details — their sky, never our server. Choose a delivery date at checkout, for less than the two bought separately.',
        icon:         'star4',
        fulfilUrl:    'https://astroprecise.lemonsqueezy.com/checkout/custom/0c1e9679-cde4-45b3-8e64-bf4137efa236?signature=fe0c7290321dec98d7d726bee69ed6e2152cf9f9a4acc8b3ccfe9dce5dcbedba',
      },
      {
        id:           'two-skies-map',
        available:    true,
        name:         'Two Skies — Couples Star Map',
        type:         'print',
        collection:   'gifts',
        price:        24.00,
        personalized: true,
        giftNote:     true,
        badge:        'Couples',
        marketingLine:'Two birth charts, one print — the anniversary keepsake.',
        previewImage: 'img/shop/product-two-skies.jpg',
        blurb:        'Two birth charts, one print — your sky and theirs, set side by side on void black. A proven anniversary and wedding keepsake. 250gsm museum-grade matte; framed option at checkout.',
        icon:         'crescent',
        fulfilUrl:    'https://astroprecise.lemonsqueezy.com/checkout/custom/8015c283-98cd-4ed8-9d9b-d145a63a79a3?signature=02880ea1f9ade3063340fb4dd727ab151d3611c7797d6a9062a63851ee0501b7',
      },
      // ── JEWELLERY COLLECTION (new accessories, POD placeholders) ───────────
      // Audience-refined (deep research 2026-06): Gen Z gifting (affordable meaningful), women 18-35 everyday/self (dainty + emotional), existing chart users.
      // Diffs vs competitors: full VSOP87 chart data (not sun-sign generic), integrated with readings/posters. POD: ShineOn/OwnPrint/AnywherePOD or Etsy manual + custom upload for engraving.
      {
        id:           'observatory-disc-pendant',
        available:    true,
        name:         'Observatory Disc Pendant',
        type:         'accessory',
        collection:   'jewellery',
        price:        29.00,
        personalized: true,
        badge:        'Made to order',
        marketingLine:'Your full natal wheel, engraved on a wearable disc.',
        previewImage: 'img/shop/cat-jewelry.jpg',
        blurb:        'Solid brass or sterling disc pendant with the complete natal chart wheel micro-engraved from your exact birth data. Planets positioned precisely as at the moment you were born — 25mm on 45cm chain. For women 18-35 who want their sky close every day, or as a standout Gen Z gift that actually means something. POD fulfilment.',
        icon:         'orb',
        fulfilUrl:    '', // placeholder — set real POD URL (ShineOn / OwnPrint / Etsy custom / Gelato) when live
      },
      {
        id:           'constellation-bar',
        available:    true,
        name:         'Constellation Bar',
        type:         'accessory',
        collection:   'jewellery',
        price:        24.00,
        personalized: true,
        badge:        null,
        marketingLine:'Minimal bar with your birth constellations in line.',
        previewImage: 'img/shop/cat-jewelry.jpg',
        blurb:        'Slim horizontal bar (pendant or cuff) showing the constellation lines of your Sun + Moon + Rising. Subtle everyday chart jewellery for layering. Perfect for the 18-35 woman who loves dainty cosmic details without shouting her sign — or gift to your astro bestie.',
        icon:         'star4',
        fulfilUrl:    '', // placeholder — set real POD URL when live
      },
      {
        id:           'big-three-glyph',
        available:    true,
        name:         'Big Three Glyph',
        type:         'accessory',
        collection:   'jewellery',
        price:        19.00,
        personalized: true,
        badge:        null,
        marketingLine:'Sun · Moon · Rising charms on a fine chain.',
        previewImage: 'img/shop/cat-jewelry.jpg',
        blurb:        'Three small engraved charms — your Sun, Moon and Rising glyphs — on a delicate 40cm chain. The spine of your chart, worn close to the heart. Entry price for Gen Z gifting and women 18-35 self-purchase; meaningful without the generic zodiac mass-market feel. Differentiator: exact from your saved chart, not a stock Aries stamp.',
        icon:         'gem',
        fulfilUrl:    '', // placeholder — set real POD URL when live
      },
      {
        id:           'seal-medallion',
        available:    true,
        name:         'Seal Medallion',
        type:         'accessory',
        collection:   'jewellery',
        price:        35.00,
        personalized: true,
        badge:        'Made to order',
        marketingLine:'Hex seal medallion of your chart\'s dominant signature.',
        previewImage: 'img/shop/cat-jewelry.jpg',
        blurb:        'Large 32mm hex medallion bearing your dominant element seal and Big Three glyphs. Reversible; engraved on observatory-grade brass. A true talisman for power users and milestone gifting. Premium tier vs No.13-style luxe — yours is computed from real VSOP87 positions, not artistic interpretation.',
        icon:         'heart',
        fulfilUrl:    '', // placeholder — set real POD URL when live
      },
    ],
  },
}, window.AP_MON || {});

(function monetisation() {
  const M = window.AP_MON;
  const isUrl = u => typeof u === 'string' && /^https?:\/\//i.test(u.trim());
  const keyToUrl = k => M[k + 'Url'];

  function wire() {
    // Buttons/links opt in with data-mon="report|poster|gift|newsletter|tip".
    // mode: data-mon-mode="hide" (default — vanish until configured) or "dormant"
    // (stay visible but disabled with a gentle "coming soon").
    document.querySelectorAll('[data-mon]').forEach(el => {
      const url = keyToUrl(el.dataset.mon);
      const mode = el.dataset.monMode || 'hide';
      if (isUrl(url)) {
        if (el.tagName === 'A') { el.href = url; el.target = '_blank'; el.rel = 'noopener'; }
        else el.addEventListener('click', () => window.open(url, '_blank', 'noopener'));
        el.removeAttribute('aria-disabled');
        el.style.removeProperty('display');
      } else if (mode === 'dormant') {
        el.setAttribute('aria-disabled', 'true');
        el.style.opacity = '0.55'; el.style.cursor = 'default';
        el.addEventListener('click', e => { e.preventDefault();
          if (window.AstroApp) AstroApp.showToast('Coming soon', 'This offering isn’t open yet.', 'info'); });
      } else {
        el.style.display = 'none'; // honest: no link, no clutter
      }
    });

    // Footer support line — appears the moment a tip URL is configured.
    if (isUrl(M.tipUrl) && !document.querySelector('.ap-support-link')) {
      const host = document.querySelector('.ap-legal-links') || document.querySelector('.footer-legal')
        || document.querySelector('footer .container') || document.querySelector('footer');
      if (host) {
        const a = document.createElement('a');
        a.className = 'ap-support-link';
        a.href = M.tipUrl; a.target = '_blank'; a.rel = 'noopener';
        a.innerHTML = '<svg class="eng-i" aria-hidden="true"><use href="#ei-heart"/></svg> Support the free chart';
        a.style.cssText = 'display:inline-block;margin-top:8px;font-family:Inter,system-ui,sans-serif;'
          + 'font-size:0.62rem;letter-spacing:0.14em;text-transform:uppercase;color:var(--gold,#C9A227);text-decoration:none;';
        host.appendChild(document.createElement('br'));
        host.appendChild(a);
      }
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();
})();

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => AstroApp.init());
else AstroApp.init();

if ('serviceWorker' in navigator && !navigator.webdriver) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

/* Horizon: privacy banner (first visit) + offline-ready pill */
(function () {
  const ACK_KEY = 'ap_privacy_ack';

  function showPrivacyBanner() {
    var ua = navigator.userAgent || '';
    if (window.__apSkipPrivacyBanner || navigator.webdriver || /\bHeadlessChrome\b/i.test(ua) ||
        /[?&]lite=1/.test(location.search || '') ||
        (typeof window.chrome === 'undefined' && /Chrome/i.test(ua))) return;
    if (localStorage.getItem(ACK_KEY)) return;
    function mountBanner() {
    const b = document.createElement('div');
    b.className = 'privacy-banner';
    b.setAttribute('role', 'region');
    b.setAttribute('aria-label', 'Privacy notice');
    b.innerHTML =
      '<span class="privacy-banner__text"><strong>Everything happens in your hands.</strong> ' +
      'Charts and readings compute in your browser. Only place-name searches query a geocoder ' +
      '(Open-Meteo) — your birth moment and readings never leave your device.</span>' +
      '<button class="privacy-banner__close" type="button">Understood</button>';
    document.body.appendChild(b);
    b.querySelector('.privacy-banner__close').addEventListener('click', () => {
      b.classList.add('is-hidden');
      try { localStorage.setItem(ACK_KEY, '1'); } catch (e) {}
      setTimeout(() => b.remove(), 600);
    });
    }
    if (document.body.classList.contains('page-home') && document.getElementById('preloader')) {
      window.addEventListener('ap-hero-enter', function () {
        setTimeout(mountBanner, 1200);
      }, { once: true });
      return;
    }
    if (document.body.classList.contains('page-shop')) {
      setTimeout(mountBanner, 30000);
      return;
    }
    if (document.body.classList.contains('page-chart')) {
      setTimeout(mountBanner, 45000);
      return;
    }
    if (document.body.classList.contains('page-horoscope')) {
      window.addEventListener('pointerdown', mountBanner, { once: true, passive: true });
      window.addEventListener('load', function () { setTimeout(mountBanner, 35000); }, { once: true });
      return;
    }
    if (document.body.classList.contains('page-compat')) {
      window.addEventListener('pointerdown', mountBanner, { once: true, passive: true });
      window.addEventListener('load', function () { setTimeout(mountBanner, 35000); }, { once: true });
      return;
    }
    mountBanner();
  }

  function showOfflinePill() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.ready.then(() => {
      if (!navigator.serviceWorker.controller) return;
      const p = document.createElement('div');
      p.className = 'offline-ready-pill';
      p.setAttribute('role', 'status');
      p.setAttribute('aria-live', 'polite');
      p.textContent = 'Works offline';
      document.body.appendChild(p);
      requestAnimationFrame(() => p.classList.add('is-visible'));
      setTimeout(() => { p.classList.remove('is-visible'); setTimeout(() => p.remove(), 600); }, 5000);
    }).catch(() => {});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { showPrivacyBanner(); showOfflinePill(); });
  } else {
    showPrivacyBanner();
    showOfflinePill();
  }
})();

/* Horizon: scroll-reveal entrances + mobile bottom nav */
(function () {
  function initReveal() {
    if (!window.IntersectionObserver) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (document.body.classList.contains('page-horoscope')) return;
    const candidates = document.querySelectorAll(
      '.feature-card, .planet-weather-card, .sign-card, .reading-card, ' +
      '.transit-item, .element-compat-card, .category-score-item, .moon-card, .manifesto'
    );
    if (!candidates.length) return;
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        e.target.classList.add('revealed');
        obs.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -36px 0px' });
    candidates.forEach((el, i) => {
      if (el.getBoundingClientRect().top < window.innerHeight) return;
      el.classList.add('reveal-init');
      el.style.transitionDelay = (i % 4) * 60 + 'ms';
      obs.observe(el);
    });
  }

  function initBottomNav() {
    if (document.querySelector('.bottom-nav')) return;
    if (!document.querySelector('.navbar')) return;
    const here = (location.pathname.split('/').pop() || 'index.html');
    const tabs = (window.AstroApp && AstroApp.NAV_BOTTOM_TABS) || [];
    const nav = document.createElement('nav');
    nav.className = 'bottom-nav';
    nav.setAttribute('aria-label', 'Mobile tab bar');
    const ei = (id) => '<svg class="eng-i" aria-hidden="true"><use href="#ei-' + id + '"/></svg>';
    const itemHtml = (row) => {
      const href = row[0];
      const label = row[1];
      const icon = row[2] || 'star4';
      return '<a href="' + href + '" class="bottom-nav__item' + (here === href ? ' is-active' : '') + '"'
        + (here === href ? ' aria-current="page"' : '') + '>'
        + '<span class="bottom-nav__icon" aria-hidden="true">' + ei(icon) + '</span>'
        + '<span class="bottom-nav__label">' + label + '</span></a>';
    };
    nav.innerHTML =
      '<div class="bottom-nav__shell">'
      + '<div class="bottom-nav__tabs">' + tabs.map(itemHtml).join('') + '</div>'
      + '<div class="bottom-nav__pinned">'
      + '<button type="button" class="bottom-nav__item bottom-nav__item--updates" data-ap-open-email="bottom_nav" aria-label="Sign up for email updates">'
      + '<span class="bottom-nav__icon" aria-hidden="true">' + ei('mail') + '</span>'
      + '<span class="bottom-nav__label">Updates</span>'
      + '</button></div></div>';
    document.body.appendChild(nav);
    requestAnimationFrame(function () {
      var h = nav.offsetHeight;
      if (h > 0) document.documentElement.style.setProperty('--bottom-nav-h', h + 'px');
    });
    if ('ResizeObserver' in window) {
      var ro = new ResizeObserver(function () {
        var h = nav.offsetHeight;
        if (h > 0) document.documentElement.style.setProperty('--bottom-nav-h', h + 'px');
      });
      ro.observe(nav);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { initReveal(); initBottomNav(); });
  } else {
    initReveal();
    initBottomNav();
  }
})();

/* Corner solar system: real heliocentric longitudes via VSOP87.
   Orbital periods scaled so Mercury = 14 s CSS animation.
   Saturn, Uranus and Neptune appended dynamically with proper radii. */
(function () {
  const PLANETS = [
    { id: 'mercury', period: 87.969 },
    { id: 'venus',   period: 224.701 },
    { id: 'earth',   period: 365.256 },
    { id: 'mars',    period: 686.980 },
    { id: 'jupiter', period: 4332.589 },
  ];
  const OUTER = [
    { id: 'saturn',  period: 10759.22,  r: 360,  cls: 'css-planet--saturn' },
    { id: 'uranus',  period: 30688.5,   r: 415,  cls: 'css-planet--uranus' },
    { id: 'neptune', period: 60182.0,   r: 460,  cls: 'css-planet--neptune' },
  ];
  const S = 14 / 87.969; // seconds-per-day scale: Mercury = 14 s

  function helioLon(E, id, jd) {
    const sun = E.sunPosition(jd);
    const sx = sun.distance * Math.cos(sun.lon * Math.PI / 180);
    const sy = sun.distance * Math.sin(sun.lon * Math.PI / 180);
    let hx, hy;
    if (id === 'earth') {
      hx = -sx; hy = -sy;
    } else {
      const g = E[id + 'Position'](jd);
      hx = g.distance * Math.cos(g.lon * Math.PI / 180) - sx;
      hy = g.distance * Math.sin(g.lon * Math.PI / 180) - sy;
    }
    return ((Math.atan2(hy, hx) * 180 / Math.PI) + 360) % 360;
  }

  function applyPhase(orbit, lon, dur) {
    orbit.style.animationDuration  = dur + 's';
    orbit.style.animationDirection = 'reverse';
    orbit.style.animationDelay     = -(((360 - lon) / 360) * dur) + 's';
  }

  function init() {
    const E = window.AstroEphemeris;
    if (!E || typeof E.julianDay !== 'function' || typeof E.sunPosition !== 'function') {
      setTimeout(init, 400);
      return;
    }
    const systems = document.querySelectorAll('.cosmos-solar-system');
    if (!systems.length) return;

    const now = new Date();
    const jd  = E.julianDay(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate(),
                             now.getUTCHours(), now.getUTCMinutes(), 0);

    systems.forEach(sys => {
      // Update inner planets already in the HTML
      sys.querySelectorAll('.css-orbit').forEach((orbit, i) => {
        const p = PLANETS[i];
        if (!p) return;
        try { applyPhase(orbit, helioLon(E, p.id, jd), p.period * S); } catch (_) {}
      });

      // Append outer planets if not already done
      OUTER.forEach(op => {
        const marker = 'css-orbit--' + op.id + '-live';
        if (sys.querySelector('.' + marker)) return;
        let lon;
        try { lon = helioLon(E, op.id, jd); } catch (_) { return; }
        const dur    = op.period * S;
        const d      = op.r * 2;
        const orbit  = document.createElement('div');
        orbit.className = 'css-orbit ' + marker;
        orbit.style.cssText = `--r:${op.r}px;width:${d}px;height:${d}px;`;
        applyPhase(orbit, lon, dur);
        orbit.innerHTML = `<div class="css-planet ${op.cls}"></div>`;
        sys.appendChild(orbit);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

// ═══════════════════════════════════════════════════════════════════════
// EMAIL CAPTURE / SUBSCRIBERS — one honest engine, dormant-by-default.
// The "subscriber database" is a hosted provider (Kit / Buttondown / MailerLite)
// the site POSTs to via AP_MON.newsletterUrl. Until that's set, sign-ups are
// relayed to the owner by mailto (AP_MON.ownerEmail) AND saved on-device — so an
// early sign-up is never silently lost. Only the email is ever sent; birth data
// never leaves the device. Adds a site-wide footer signup, "Cosmic Weather
// Premium" waitlist wiring, and an owner CSV export (AstroApp.exportIntents()).
// ═══════════════════════════════════════════════════════════════════════
(function emailEngine() {
  var M = window.AP_MON = window.AP_MON || {};
  if (typeof M.waitlistUrl === 'undefined') M.waitlistUrl = '';   // separate list/tag for the premium waitlist
  if (typeof M.ownerEmail  === 'undefined') M.ownerEmail  = '';   // mailto relay target before a provider is live
  // emailUrl and newsletterUrl are aliases — set EITHER, get both.
  var liveUrl = (M.newsletterUrl && String(M.newsletterUrl).trim()) || (M.emailUrl && String(M.emailUrl).trim()) || '';
  M.newsletterUrl = M.emailUrl = liveUrl;

  window.AP_COPY = window.AP_COPY || {
    privacyMicro: 'Only your email is sent — birth data never leaves your device. Unsubscribe anytime.',
    confirmLive: 'You\u2019re on the list. We\u2019ll email when wallpapers, readings or cosmic weather go live.',
    confirmDoubleOptIn: 'You\u2019re on the list \u2014 cosmic weather updates will land in your inbox. (Only your email was sent; birth data stayed on your device.)',
    dormantSaved: 'Sign-up isn\u2019t live yet, so nothing left your browser. The moment it opens, you\u2019ll be first.',
    eyebrow: 'More coming soon',
    bannerTitle: 'Sign up \u2014 be first when we ship',
    bannerSub: 'One email list for everything launching next. No spam, no birth data uploaded \u2014 just your address.',
    heroTitle: 'Get updates before anyone else',
    heroSub: 'Wallpapers, written readings, cosmic weather & shop drops \u2014 we\u2019ll only write when something real ships.',
    stickyTitle: 'Updates coming soon \u2014 join the list',
    navTeaser: 'Wallpapers \u00b7 deep readings \u00b7 cosmic weather \u00b7 shop drops',
    modalTitle: 'What\u2019s landing in your inbox',
    modalSub: 'Join once. We\u2019ll email you when each of these goes live \u2014 early access before the public site.',
    btnLabel: '\u2726 Get updates',
    btnShort: 'Join list',
    comingPerks: [
      'Chart wallpaper \u2014 your exact birth sky as a phone & desktop background',
      'Personal cosmic weather \u2014 transits to your chart, in plain English',
      'Deep reading previews \u2014 written natal reports before the shop opens',
      'Daily & monthly horoscopes \u2014 same real-sky engine as the site, in your inbox',
      'Shop early access \u2014 wear-your-sky prints, posters & gift readings first',
      'New tools first \u2014 retrograde alerts, synastry unlocks & more as we build them'
    ]
  };

  var isUrl = function (u) { return typeof u === 'string' && /^https?:\/\//i.test((u || '').trim()); };
  var isEmail = function (e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e || ''); };

  // Honest 3-tier capture: configured provider POST → owner mailto relay → localStorage.
  function captureEmail(email, opts) {
    opts = opts || {};
    var Mn = window.AP_MON || {};
    var endpoint = (opts.list === 'waitlist' && isUrl(Mn.waitlistUrl)) ? Mn.waitlistUrl.trim()
                 : (isUrl(Mn.newsletterUrl) ? Mn.newsletterUrl.trim() : '');
    if (endpoint) {
      try {
        var body = new FormData();
        body.append('email', email);
        if (opts.tag) body.append('tags', opts.tag);
        fetch(endpoint, { method: 'POST', mode: 'no-cors', body: body });
      } catch (e) {}
    } else if (Mn.ownerEmail && isEmail(Mn.ownerEmail)) {
      try {
        var subj = encodeURIComponent('AstroPrecise sign-up' + (opts.list ? ' — ' + opts.list : ''));
        var bdy = encodeURIComponent('New subscriber: ' + email + (opts.source ? '\nSource: ' + opts.source : ''));
        var a = document.createElement('a');
        a.href = 'mailto:' + Mn.ownerEmail + '?subject=' + subj + '&body=' + bdy;
        a.style.display = 'none'; document.body.appendChild(a); a.click(); document.body.removeChild(a);
      } catch (e) {}
    }
    // Always also save same-device intent (owner backstop / offline convenience, capped).
    try {
      var key = 'ap_email_intent';
      var prev = JSON.parse(localStorage.getItem(key) || '[]');
      prev.push(Object.assign({ email: email, savedAt: Date.now(), source: opts.source || null }, opts.meta || {}));
      localStorage.setItem(key, JSON.stringify(prev.slice(-50)));
    } catch (e) {}
    return { sent: endpoint ? 'provider' : (Mn.ownerEmail ? 'mailto' : 'local') };
  }

  // Owner utility: download captured local intents as CSV (run AstroApp.exportIntents() or visit #export-intents).
  function exportIntents() {
    var rows; try { rows = JSON.parse(localStorage.getItem('ap_email_intent') || '[]'); } catch (e) { rows = []; }
    if (!rows.length) return '';
    var cols = ['email', 'source', 'sunSign', 'forName', 'savedAt'];
    var csv = [cols.join(',')].concat(rows.map(function (r) {
      return cols.map(function (c) {
        return JSON.stringify(c === 'savedAt' && r[c] ? new Date(r[c]).toISOString() : (r[c] == null ? '' : r[c]));
      }).join(',');
    })).join('\n');
    try {
      var blob = new Blob([csv], { type: 'text/csv' });
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = 'ap-email-intents.csv'; a.click(); URL.revokeObjectURL(a.href);
    } catch (e) {}
    return csv;
  }

  if (window.AstroApp) { window.AstroApp.captureEmail = captureEmail; window.AstroApp.exportIntents = exportIntents; }
  if (location.hash === '#export-intents') setTimeout(exportIntents, 400);

  var SIGNS = ['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces'];
  function pageSlug() { return (location.pathname.split('/').pop() || 'index.html').toLowerCase(); }
  function isSignPage() { var p = pageSlug().replace('.html',''); return SIGNS.indexOf(p) >= 0; }

  function perksHtml(compact) {
    var perks = (window.AP_COPY || {}).comingPerks || [];
    if (!perks.length) return '';
    var cls = 'ap-email-cta__perks' + (compact ? ' ap-email-cta__perks--compact' : '');
    return '<ul class="' + cls + '">' + perks.map(function (p) {
      return '<li>' + p + '</li>';
    }).join('') + '</ul>';
  }

  function pageEmailCopy() {
    var c = window.AP_COPY, p = pageSlug();
    if (p === 'horoscope.html') {
      return { eyebrow: 'Free in your inbox', title: 'Daily horoscopes + what\u2019s coming next', sub: 'Your sign\u2019s daily & monthly reading, plus first access to wallpapers, deep readings & the shop.', source: 'banner_horoscope', tag: 'tag_horoscope_banner', showPerks: true };
    }
    if (isSignPage()) {
      var sign = p.replace('.html','');
      sign = sign.charAt(0).toUpperCase() + sign.slice(1);
      return { eyebrow: c.eyebrow, title: sign + ' updates in your inbox', sub: 'Daily ' + sign + ' reading, cosmic weather for your chart, wallpapers & deep readings as they launch.', source: 'banner_sign', tag: 'tag_sign_' + sign.toLowerCase(), showPerks: true };
    }
    if (p === 'index.html' || p === '') {
      return { eyebrow: c.eyebrow, title: c.bannerTitle, sub: c.bannerSub, source: 'banner_home', tag: 'tag_banner_home', showPerks: true };
    }
    if (p === 'shop.html') {
      return { eyebrow: 'Free wallpaper', title: 'Your sky as a lock-screen PNG', sub: 'Free chart wallpaper on the Chart page \u2014 join the list for cosmic weather, deep-reading previews & shop drops. Paid pieces from \u00a36.', source: 'banner_shop', tag: 'tag_shop_live', showPerks: true };
    }
    return { eyebrow: c.eyebrow, title: c.bannerTitle, sub: c.bannerSub, source: 'banner_tool', tag: 'tag_banner_tool', showPerks: true };
  }

  function closeEmailModal() {
    if (window.AstroApp && typeof AstroApp.closeModal === 'function') {
      AstroApp.closeModal('ap-email-modal');
      return;
    }
    resetEmailModalState();
  }

  function openEmailSignup(source) {
    if (document.body.classList.contains('preloader-active')) return;
    if (window.AstroApp && typeof AstroApp.closeNavDrawer === 'function') AstroApp.closeNavDrawer();
    if (!document.getElementById('ap-email-modal')) injectEmailModal();
    var modal = document.getElementById('ap-email-modal');
    if (modal) modal.dataset.source = source || 'modal';
    if (window.AstroApp && typeof AstroApp.openModal === 'function') AstroApp.openModal('ap-email-modal');
    else if (modal) {
      modal.classList.add('open');
      modal.style.display = 'flex';
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }
  }

  function confirmHtml(res) {
    var c = window.AP_COPY;
    return res.sent === 'provider'
      ? '<strong>' + (c.confirmLive || c.confirmDoubleOptIn) + '</strong>'
      : '<strong>Noted.</strong> ' + c.dormantSaved;
  }

  function wireEmailForm(form, opts) {
    if (!form || form._apWired) return;
    form._apWired = true;
    opts = opts || {};
    var msg = form.querySelector('.ap-email-cta__msg, .ap-footer-signup__msg');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = (form.email && form.email.value || '').trim();
      if (!isEmail(email)) {
        if (window.AstroApp) AstroApp.showToast('Check your email', 'That address looks off.', 'warning');
        return;
      }
      var res = captureEmail(email, {
        source: opts.source || 'email_cta',
        tag: opts.tag || 'tag_email_cta',
        meta: opts.meta || null
      });
      if (msg) msg.innerHTML = confirmHtml(res);
      form.classList.add('is-done');
      if (form.classList.contains('ap-email-cta__form--sticky')) {
        var sticky = form.closest('.ap-email-cta--sticky');
        if (sticky) setTimeout(function () { sticky.classList.remove('is-visible'); document.body.classList.remove('has-email-sticky'); }, 3200);
      }
      if (window.AstroApp) AstroApp.showToast('You\u2019re on the list', 'We\u2019ll email when there\u2019s something new.', 'success');
    });
  }

  function buildEmailCTA(variant, copy, opts) {
    copy = copy || pageEmailCopy();
    opts = opts || {};
    var c = window.AP_COPY;
    var btn = variant === 'sticky' ? c.btnShort : c.btnLabel;
    var el = document.createElement(variant === 'banner' ? 'section' : 'div');
    el.className = 'ap-email-cta ap-email-cta--' + variant + (opts.extraClass ? ' ' + opts.extraClass : '');
    if (variant === 'banner') {
      el.id = 'ap-email-banner';
      el.setAttribute('role', 'region');
      el.setAttribute('aria-labelledby', 'ap-email-banner-title');
    } else if (variant === 'sticky') {
      el.setAttribute('role', 'region');
      el.setAttribute('aria-label', 'Email updates — sticky bar');
    }
    var inner = variant === 'hero'
      ? '<div class="container ap-email-cta__inner">'
      : (variant === 'sticky'
        ? '<div class="ap-email-cta__inner">'
        : '<div class="container ap-email-cta__inner">');
    if (variant === 'sticky') {
      inner += '<button type="button" class="ap-email-cta__close" aria-label="Dismiss signup bar">\u00d7</button>';
    }
    inner += '<div class="ap-email-cta__copy">';
    if (variant !== 'sticky') inner += '<p class="ap-email-cta__eyebrow">' + (copy.eyebrow || c.eyebrow) + '</p>';
    inner += '<p class="ap-email-cta__title"' + (variant === 'banner' ? ' id="ap-email-banner-title"' : '') + '>' + (copy.title || c.bannerTitle) + '</p>';
    if (variant !== 'sticky') inner += '<p class="ap-email-cta__sub">' + (copy.sub || c.bannerSub) + '</p>';
    if ((variant === 'banner' || variant === 'hero') && copy.showPerks) inner += perksHtml(variant === 'hero');
    inner += '</div>';
    inner += '<form class="ap-email-cta__form' + (variant === 'sticky' ? ' ap-email-cta__form--sticky' : '') + '" novalidate>'
      + '<div class="ap-email-cta__fields">'
      + '<input class="ap-email-cta__input" type="email" name="email" required placeholder="you@example.com" autocomplete="email" aria-label="Your email address">'
      + '<button type="submit" class="ap-email-cta__btn">' + btn + '</button>'
      + '</div>'
      + '<p class="ap-email-cta__msg" role="status" aria-live="polite"></p>'
      + '<p class="ap-email-cta__hint">' + c.privacyMicro + '</p>'
      + '</form></div>';
    el.innerHTML = inner;
    wireEmailForm(el.querySelector('form'), { source: copy.source, tag: copy.tag });
    if (variant === 'sticky') {
      el.querySelector('.ap-email-cta__close').addEventListener('click', function () {
        try { localStorage.setItem('ap_email_sticky_dismiss', String(Date.now())); } catch (e) {}
        el.classList.remove('is-visible');
        document.body.classList.remove('has-email-sticky');
      });
    }
    return el;
  }

  function scrollToEmailCTA(e) {
    if (e) e.preventDefault();
    var target = document.getElementById('ap-email-banner')
      || document.getElementById('horoscope-subscribe')
      || document.getElementById('email-capture')
      || document.querySelector('.ap-email-cta--hero');
    if (target) {
      if (target.id === 'email-capture') target.hidden = false;
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    openEmailSignup('scroll_fallback');
  }

  function injectEmailModal() {
    if (document.getElementById('ap-email-modal')) return;
    var c = window.AP_COPY;
    var wrap = document.createElement('div');
    wrap.id = 'ap-email-modal';
    wrap.className = 'modal-backdrop ap-email-modal-backdrop';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-labelledby', 'ap-email-modal-title');
    wrap.setAttribute('aria-modal', 'true');
    wrap.setAttribute('aria-hidden', 'true');
    wrap.style.display = 'none';
    wrap.innerHTML =
      '<div class="modal ap-email-modal">'
      + '<div class="modal__header">'
      + '<h2 class="modal__title" id="ap-email-modal-title">' + c.modalTitle + '</h2>'
      + '<button type="button" class="modal__close" id="ap-email-modal-close" data-modal-close aria-label="Close">\u00d7</button>'
      + '</div>'
      + '<div class="modal__body">'
      + '<p class="ap-email-modal__sub">' + c.modalSub + '</p>'
      + perksHtml(false)
      + '<form class="ap-email-cta__form ap-email-modal__form" id="ap-email-modal-form" novalidate>'
      + '<div class="ap-email-cta__fields">'
      + '<input class="ap-email-cta__input" type="email" name="email" required placeholder="you@example.com" autocomplete="email" aria-label="Your email address">'
      + '<button type="submit" class="ap-email-cta__btn">' + c.btnLabel + '</button>'
      + '</div>'
      + '<p class="ap-email-cta__msg" role="status" aria-live="polite"></p>'
      + '<p class="ap-email-cta__hint">' + c.privacyMicro + '</p>'
      + '</form></div></div>';
    document.body.appendChild(wrap);
    wireEmailForm(wrap.querySelector('form'), { source: 'email_modal', tag: 'tag_email_modal' });
    var closeBtn = wrap.querySelector('#ap-email-modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        closeEmailModal();
      });
    }
    wrap.addEventListener('click', function (ev) {
      if (ev.target === wrap) closeEmailModal();
    });
    wrap.querySelector('form').addEventListener('submit', function () {
      setTimeout(closeEmailModal, 2400);
    }, true);
  }

  function resetEmailModalState() {
    var modal = document.getElementById('ap-email-modal');
    if (!modal) return;
    modal.classList.remove('open');
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function wireEmailOpenDelegation() {
    if (document.documentElement.dataset.apEmailOpenWired) return;
    document.documentElement.dataset.apEmailOpenWired = '1';
    document.addEventListener('click', function (e) {
      var t = e.target.closest('[data-ap-open-email]');
      if (!t) return;
      e.preventDefault();
      openEmailSignup(t.getAttribute('data-ap-open-email') || 'nav');
    });
  }

  function injectNavCTA() {
    if (window.AstroApp && typeof AstroApp.cleanupNavEnd === 'function') AstroApp.cleanupNavEnd();
    wireEmailOpenDelegation();
  }

  function injectBannerCTA() {
    var existing = document.querySelector('.ap-email-cta--banner');
    if (existing) {
      var form = existing.querySelector('form');
      if (form && !form._apWired) {
        var copy = pageEmailCopy();
        wireEmailForm(form, { source: copy.source, tag: copy.tag });
      }
      return;
    }
    if (document.getElementById('email-capture')) return;
    if (document.getElementById('horoscope-subscribe')) return;
    var banner = buildEmailCTA('banner', pageEmailCopy());
    var slot = document.getElementById('ap-email-banner-slot');
    if (slot) {
      slot.replaceWith(banner);
      return;
    }
    var footer = document.querySelector('footer.footer, footer.site-footer, footer[role="contentinfo"]');
    if (!footer || !footer.parentNode) return;
    footer.parentNode.insertBefore(banner, footer);
  }

  function injectHeroCTA() {
    // Homepage: optional email is on the intro preloader (bottom panel — orrery stays clear).
  }

  function injectStickyCTA() {
    if (document.querySelector('.ap-email-cta--sticky')) return;
    if (document.body.classList.contains('preloader-active')) {
      window.addEventListener('ap-hero-enter', injectStickyCTA, { once: true });
      return;
    }
    if (window.matchMedia && window.matchMedia('(max-width: 768px)').matches) return;
    try {
      var dismissed = parseInt(localStorage.getItem('ap_email_sticky_dismiss') || '0', 10);
      if (dismissed && (Date.now() - dismissed) < 7 * 86400000) return;
    } catch (e) {}
    var sticky = buildEmailCTA('sticky', {
      title: window.AP_COPY.stickyTitle,
      source: 'sticky_bar',
      tag: 'tag_sticky'
    });
    document.body.appendChild(sticky);
    var show = function () {
      if (sticky.classList.contains('is-visible')) return;
      sticky.classList.add('is-visible');
      document.body.classList.add('has-email-sticky');
    };
    var delayMs = document.body.classList.contains('page-home') ? 22000 : 6000;
    setTimeout(show, delayMs);
    var unsubScroll = null;
    var onScroll = function () {
      if (window.scrollY > 480) {
        show();
        if (unsubScroll) unsubScroll();
        else window.removeEventListener('scroll', onScroll);
      }
    };
    if (window.RafCore) unsubScroll = window.RafCore.onScroll(onScroll);
    else window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // ── Compact footer reminder (banner pages get a one-liner; others get mini form) ──
  function injectFooterSignup() {
    if (document.querySelector('.ap-footer-signup')) return;
    if (document.getElementById('email-capture')) return;
    var host = document.querySelector('footer .container, footer .footer__grid, footer');
    if (!host) return;
    var hasBanner = !!document.getElementById('ap-email-banner');
    var wrap = document.createElement('div');
    wrap.className = 'ap-footer-signup ap-footer-signup--compact';
    if (hasBanner) {
      wrap.innerHTML = '<p style="font-size:0.72rem;color:var(--silver-dim,#8891AA);margin:0;">'
        + '<a href="#ap-email-banner" class="ap-footer-signup__link" style="color:var(--gold,#C9A227);text-decoration:none;font-weight:600;">\u2726 Join the update list</a>'
        + ' \u2014 cosmic weather & new features coming soon.</p>';
      wrap.querySelector('a').addEventListener('click', scrollToEmailCTA);
    } else {
      wrap.innerHTML =
        '<p class="ap-email-cta__eyebrow" style="margin-bottom:6px;">' + window.AP_COPY.eyebrow + '</p>'
        + '<form class="ap-email-cta__form ap-footer-signup__form" novalidate>'
        + '<div class="ap-email-cta__fields" style="justify-content:center;">'
        + '<input class="ap-email-cta__input" type="email" name="email" required placeholder="you@example.com" autocomplete="email" aria-label="Your email address">'
        + '<button type="submit" class="ap-email-cta__btn">' + window.AP_COPY.btnShort + '</button>'
        + '</div><p class="ap-email-cta__msg ap-footer-signup__msg" role="status" aria-live="polite"></p>'
        + '<p class="ap-email-cta__hint">' + window.AP_COPY.privacyMicro + '</p></form>';
      wireEmailForm(wrap.querySelector('form'), { source: 'footer', tag: 'tag_footer' });
    }
    host.insertBefore(wrap, host.firstChild);
  }

  // ── "Cosmic Weather Premium" waitlist forms (validate the future subscription) ──
  function wireWaitlist() {
    document.querySelectorAll('.cw-waitlist__form').forEach(function (f) {
      if (f._wired) return; f._wired = true;
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var email = f.email.value.trim();
        if (!isEmail(email)) { if (window.AstroApp) AstroApp.showToast('Check your email', 'That looks off.', 'warning'); return; }
        var res = captureEmail(email, { list: 'waitlist', source: 'waitlist', tag: 'tag_waitlist' });
        var box = f.closest('.cw-waitlist');
        if (box) box.innerHTML = '<p class="cw-waitlist__eyebrow" style="font-size:0.58rem;letter-spacing:0.2em;text-transform:uppercase;color:var(--silver-dim,#8891AA);margin:0 0 0.3rem;">You’re on the waitlist.</p><p style="font-family:\'Cormorant Garamond\',serif;font-size:0.98rem;color:var(--silver,#C8D0E8);margin:0;">'
          + (res.sent === 'provider' ? 'Check your inbox to confirm. We’ll only ever email you if this becomes real.'
                                     : 'Saved — nothing was sent or charged. If enough of you want it, we’ll build it.') + '</p>';
      });
    });
  }

  function boot() {
    resetEmailModalState();
    function injectModalWhenReady() {
      if (document.body.classList.contains('preloader-active')) return;
      injectEmailModal();
      resetEmailModalState();
    }
    window.addEventListener('ap-hero-enter', injectModalWhenReady, { once: true });
    if (window.__apHeroEntered && !document.body.classList.contains('preloader-active')) {
      injectModalWhenReady();
    }
    window.addEventListener('pageshow', function (ev) {
      if (ev.persisted) resetEmailModalState();
    });
    injectNavCTA();
    injectHeroCTA();
    injectBannerCTA();
    injectFooterSignup();
    injectStickyCTA();
    wireWaitlist();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

// Footer social icons + affiliate ads (all pages that load app.js).
(function loadAffiliateSocial() {
  if (document.querySelector('script[data-ap-affiliate-social]')) return;
  var s = document.createElement('script');
  s.src = 'js/affiliate-social.js';
  s.dataset.apAffiliateSocial = '1';
  s.defer = true;
  document.head.appendChild(s);
})();

// Nav hover/touch prefetch (chart, horoscope, shop).
(function loadNavPrefetch() {
  if (document.querySelector('script[data-ap-nav-prefetch], script[src*="ap-nav-prefetch"]')) return;
  var s = document.createElement('script');
  s.src = 'js/ap-nav-prefetch.js';
  s.dataset.apNavPrefetch = '1';
  s.defer = true;
  document.head.appendChild(s);
})();

// Unified footer nav model (Daily readings + Sign guides split).
(function loadFooterInject() {
  if (document.querySelector('script[data-ap-footer-inject], script[src*="ap-footer-inject"]')) return;
  var s = document.createElement('script');
  s.src = 'js/ap-footer-inject.js';
  s.dataset.apFooterInject = '1';
  s.defer = true;
  document.head.appendChild(s);
})();
