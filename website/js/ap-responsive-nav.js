/* Shared Observatory / Chart responsive navigation.
   Internal pages already use AstroApp's renderer; this small bridge gives the
   standalone Observatory masthead the same model and four fixed mobile tabs. */
(function () {
  'use strict';
  var model = window.AP_NAV || {};
  var primary = model.NAV_PRIMARY || [
    ['index.html', 'Observatory'], ['chart.html', 'Chart'],
    ['ephemeris.html', 'The Sky'], ['horoscope.html', 'Daily'], ['shop.html', 'Shop'],
  ];
  var tabs = model.NAV_BOTTOM_TABS || [
    ['index.html', 'Observatory', 'star4'], ['chart.html', 'Chart', 'spiral'],
    ['ephemeris.html', 'The Sky', 'telescope'], ['horoscope.html', 'Daily', 'crescent'],
  ];
  var here = (location.pathname.split('/').pop() || 'index.html');
  function navLink(row) {
    var a = document.createElement('a');
    a.href = row[0];
    a.textContent = row[1];
    if (here === row[0]) {
      a.setAttribute('aria-current', 'page');
    }
    return a;
  }
  function mount() {
    var custom = document.querySelector('.masthead .contents-nav');
    if (custom) {
      custom.innerHTML = '';
      primary.forEach(function (row) {
        var li = document.createElement('li');
        li.appendChild(navLink(row));
        custom.appendChild(li);
      });
    }
    if (document.querySelector('.bottom-nav') || !document.querySelector('.masthead')) return;
    var nav = document.createElement('nav');
    nav.className = 'bottom-nav';
    nav.setAttribute('aria-label', 'Mobile tab bar');
    var shell = document.createElement('div');
    shell.className = 'bottom-nav__shell';
    var list = document.createElement('div');
    list.className = 'bottom-nav__tabs';
    tabs.forEach(function (row) {
      var a = navLink(row);
      a.className = 'bottom-nav__item' + (here === row[0] ? ' is-active' : '');
      var icon = document.createElement('span');
      icon.className = 'bottom-nav__icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = row[2] === 'crescent' ? '☾' : row[2] === 'telescope' ? '⌾' : row[2] === 'spiral' ? '◎' : '✦';
      var label = document.createElement('span');
      label.className = 'bottom-nav__label';
      label.textContent = row[1];
      a.textContent = '';
      a.appendChild(icon);
      a.appendChild(label);
      list.appendChild(a);
    });
    shell.appendChild(list);
    nav.appendChild(shell);
    document.body.appendChild(nav);
    var setHeight = function () {
      document.documentElement.style.setProperty('--bottom-nav-h', nav.offsetHeight + 'px');
    };
    requestAnimationFrame(setHeight);
    if (window.ResizeObserver) new ResizeObserver(setHeight).observe(nav);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
})();
