/**
 * Astro Precise — curated affiliate shelf tabs (shop.html)
 */
'use strict';

(function initShopCurated() {
  const TABS = [
    { id: 'books', label: 'Books', icon: 'book' },
    { id: 'crystals', label: 'Crystals', icon: 'gem' },
    { id: 'oracle', label: 'Oracle', icon: 'crescent' },
    { id: 'jewelry', label: 'Jewellery', icon: 'heart' },
    { id: 'prints', label: 'Prints', icon: 'map' },
  ];

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function icon(name) {
    return `<svg class="eng-i" aria-hidden="true"><use href="#ei-${name || 'star4'}"/></svg>`;
  }

  function bindTabs(root) {
    const tabs = root.querySelectorAll('[data-curated-tab]');
    const panels = root.querySelectorAll('[data-curated-panel]');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const id = tab.dataset.curatedTab;
        tabs.forEach(t => {
          const on = t.dataset.curatedTab === id;
          t.classList.toggle('active', on);
          t.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        panels.forEach(p => {
          const on = p.dataset.curatedPanel === id;
          p.classList.toggle('active', on);
          if (on) p.removeAttribute('hidden');
          else p.setAttribute('hidden', '');
        });
      });
    });
  }

  function bindStickyNav() {
    const links = document.querySelectorAll('.shop-sticky-nav [data-shop-section]');
    if (!links.length) return;
    const map = {};
    links.forEach(a => {
      const id = a.getAttribute('href');
      if (id && id.startsWith('#')) {
        const el = document.querySelector(id);
        if (el) map[id.slice(1)] = a;
      }
    });
    const obs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const id = entry.target.id;
        Object.values(map).forEach(l => l.classList.remove('active'));
        if (map[id]) map[id].classList.add('active');
      });
    }, { rootMargin: '-40% 0px -50% 0px', threshold: 0 });
    Object.keys(map).forEach(id => {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });
  }

  function init() {
    const bar = document.getElementById('shop-curated-tabs');
    const shelf = document.getElementById('shop-curated-shelf');
    if (!bar || !shelf) return;

    bar.setAttribute('role', 'tablist');
    bar.setAttribute('aria-label', 'Curated product categories');
    bar.innerHTML = TABS.map((t, i) =>
      `<button type="button" class="shop-curated-tab${i === 0 ? ' active' : ''}" role="tab"
        id="curated-tab-${t.id}"
        data-curated-tab="${t.id}" aria-selected="${i === 0 ? 'true' : 'false'}"
        aria-controls="curated-${t.id}">${icon(t.icon)} ${esc(t.label)}</button>`
    ).join('');

    shelf.querySelectorAll('[data-curated-panel]').forEach((panel, i) => {
      const pid = panel.dataset.curatedPanel;
      panel.id = `curated-${pid}`;
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', `curated-tab-${pid}`);
      panel.classList.toggle('active', i === 0);
      if (i === 0) panel.removeAttribute('hidden');
      else panel.setAttribute('hidden', '');
    });

    bindTabs(shelf.parentElement);
    bindStickyNav();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();