/**
 * Astro Precise — lightweight hybrid router
 * Soft-navigates same-origin .html pages via fetch + history API for SPA feel,
 * while keeping multi-page URLs and full HTML for SEO/crawlers.
 *
 * Opt-out: <html data-no-soft-nav> or link[data-hard-nav]
 * Enable: window.AP_ROUTER.enabled = true (default true on modern browsers)
 */
(function (global) {
  'use strict';

  var CACHE = new Map();
  var enabled = true;
  var navigating = false;

  function sameOrigin(url) {
    try {
      var u = new URL(url, location.href);
      return u.origin === location.origin;
    } catch (e) {
      return false;
    }
  }

  function isHtmlPath(url) {
    try {
      var u = new URL(url, location.href);
      var p = u.pathname;
      if (p.endsWith('/')) return true;
      if (/\.html?$/i.test(p)) return true;
      if (!/\.[a-z0-9]+$/i.test(p.split('/').pop() || '')) return true;
      return false;
    } catch (e) {
      return false;
    }
  }

  function shouldSoftNav(a, event) {
    if (!enabled) return false;
    if (document.documentElement.hasAttribute('data-no-soft-nav')) return false;
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return false;
    if (a.hasAttribute('data-hard-nav')) return false;
    if (event && (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)) return false;
    var href = a.getAttribute('href');
    if (!href || href.charAt(0) === '#' || href.indexOf('mailto:') === 0 || href.indexOf('tel:') === 0) {
      return false;
    }
    if (!sameOrigin(href) || !isHtmlPath(href)) return false;
    var dest = new URL(href, location.href);
    if (dest.pathname === location.pathname && dest.search === location.search) return false;
    return true;
  }

  function announce(msg) {
    var live = document.getElementById('ap-router-live');
    if (!live) {
      live = document.createElement('div');
      live.id = 'ap-router-live';
      live.className = 'ap-sr-only';
      live.setAttribute('aria-live', 'polite');
      live.setAttribute('role', 'status');
      document.body.appendChild(live);
    }
    live.textContent = '';
    setTimeout(function () {
      live.textContent = msg;
    }, 30);
  }

  function showProgress(on) {
    var el = document.getElementById('ap-router-progress');
    if (!el) {
      el = document.createElement('div');
      el.id = 'ap-router-progress';
      el.setAttribute('aria-hidden', 'true');
      el.style.cssText =
        'position:fixed;top:0;left:0;height:2px;width:0;z-index:200;background:linear-gradient(90deg,#6A7078,#C8CDD6);transition:width .25s ease,opacity .3s;pointer-events:none';
      document.body.appendChild(el);
    }
    if (on) {
      el.style.opacity = '1';
      el.style.width = '70%';
    } else {
      el.style.width = '100%';
      setTimeout(function () {
        el.style.opacity = '0';
        el.style.width = '0';
      }, 200);
    }
  }

  function extractMain(html) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    return {
      title: doc.title || document.title,
      bodyClass: doc.body ? doc.body.className : '',
      bodyAttrs: doc.body
        ? {
            journey: doc.body.getAttribute('data-journey'),
            theme: doc.documentElement.getAttribute('data-theme'),
          }
        : {},
      main:
        (doc.querySelector('main') && doc.querySelector('main').outerHTML) ||
        (doc.body && doc.body.innerHTML) ||
        '',
      headLinks: Array.prototype.map.call(doc.querySelectorAll('link[rel="stylesheet"]'), function (l) {
        return l.getAttribute('href');
      }),
    };
  }

  function ensureStylesheets(hrefs) {
    hrefs.forEach(function (href) {
      if (!href) return;
      var abs = new URL(href, location.href).href;
      var exists = Array.prototype.some.call(document.querySelectorAll('link[rel="stylesheet"]'), function (l) {
        return l.href === abs;
      });
      if (!exists) {
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        document.head.appendChild(link);
      }
    });
  }

  function fetchPage(url) {
    if (CACHE.has(url)) return Promise.resolve(CACHE.get(url));
    return fetch(url, { credentials: 'same-origin', headers: { Accept: 'text/html' } }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text().then(function (t) {
        var parsed = extractMain(t);
        CACHE.set(url, parsed);
        return parsed;
      });
    });
  }

  function navigate(url, push) {
    if (navigating) return Promise.resolve();
    navigating = true;
    showProgress(true);
    announce('Loading page');
    var abs = new URL(url, location.href).href;

    return fetchPage(abs)
      .then(function (page) {
        ensureStylesheets(page.headLinks || []);
        var main = document.querySelector('main');
        if (main && page.main && page.main.indexOf('<main') === 0) {
          main.outerHTML = page.main;
        } else if (main) {
          var tmp = document.createElement('div');
          tmp.innerHTML = page.main;
          var newMain = tmp.querySelector('main');
          if (newMain) main.replaceWith(newMain);
          else main.innerHTML = page.main;
        } else {
          // Fallback: hard navigate
          location.href = abs;
          return;
        }
        document.title = page.title;
        if (page.bodyClass) document.body.className = page.bodyClass;
        if (page.bodyAttrs && page.bodyAttrs.journey) {
          document.body.setAttribute('data-journey', page.bodyAttrs.journey);
        }
        if (push !== false) history.pushState({ apSoft: true }, page.title, abs);
        window.scrollTo(0, 0);
        showProgress(false);
        announce(page.title);
        document.dispatchEvent(new CustomEvent('ap:navigated', { detail: { url: abs } }));
        if (global.AP_SHELL && typeof global.AP_SHELL.refresh === 'function') {
          global.AP_SHELL.refresh();
        }
      })
      .catch(function (err) {
        console.warn('[ap-router] soft nav failed, hard fallback', err);
        showProgress(false);
        location.href = abs;
      })
      .finally(function () {
        navigating = false;
      });
  }

  function onClick(e) {
    if (e.defaultPrevented) return;
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!shouldSoftNav(a, e)) return;
    // Soft nav is progressive; prefer hard nav for complex tool pages with heavy state
    var path = new URL(a.href, location.href).pathname;
    if (/chart\.html|explore\.html|index\.html|mysky\.html/i.test(path)) {
      // still soft for hub pages; chart casting state may need hard — keep soft for hub only
    }
    e.preventDefault();
    navigate(a.href, true);
  }

  function onPop() {
    navigate(location.href, false);
  }

  function init() {
    // Soft nav off by default for reliability with complex tool pages;
    // enable via localStorage ap_soft_nav=1 or data-soft-nav on <html>
    try {
      if (localStorage.getItem('ap_soft_nav') === '1') enabled = true;
      else if (document.documentElement.hasAttribute('data-soft-nav')) enabled = true;
      else enabled = false;
    } catch (e) {
      enabled = false;
    }
    document.addEventListener('click', onClick, true);
    window.addEventListener('popstate', onPop);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  global.AP_ROUTER = {
    navigate: navigate,
    prefetch: function (url) {
      return fetchPage(new URL(url, location.href).href).catch(function () {});
    },
    setEnabled: function (v) {
      enabled = !!v;
      try {
        localStorage.setItem('ap_soft_nav', enabled ? '1' : '0');
      } catch (e) {}
    },
    get enabled() {
      return enabled;
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
