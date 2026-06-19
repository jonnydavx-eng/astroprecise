/**
 * AstroPrecise — Shop Art Style Library UI (expansion packs + colour themes)
 */
'use strict';

(function initShopArtThemes() {
  const ROOT_ID = 'shop-art-library';

  function icon(name) {
    return `<svg class="eng-i" aria-hidden="true"><use href="#ei-${name || 'star4'}"/></svg>`;
  }

  function renderPackTabs(packs, activeId) {
    const all = `<button type="button" class="ap-art-pack${activeId === 'all' ? ' active' : ''}" role="tab" id="ap-art-pack-all" data-art-pack="all" aria-controls="ap-art-theme-panel" aria-selected="${activeId === 'all' ? 'true' : 'false'}">All styles</button>`;
    const tabs = packs.map(p =>
      `<button type="button" class="ap-art-pack${p.id === activeId ? ' active' : ''}" role="tab" id="ap-art-pack-${p.id}" data-art-pack="${p.id}" aria-controls="ap-art-theme-panel" aria-selected="${p.id === activeId ? 'true' : 'false'}">${icon(p.icon)} ${AP_ART.esc(p.name)}</button>`
    ).join('');
    return `<div class="ap-art-packs" role="tablist" aria-label="Art expansion packs">${all}${tabs}</div>`;
  }

  function renderThemeCard(theme, selectedId, recommendedId) {
    const sel = theme.id === selectedId;
    const rec = theme.id === recommendedId;
    return `<button type="button" class="ap-art-card${sel ? ' ap-art-card--selected' : ''}" data-art-theme="${theme.id}" aria-pressed="${sel ? 'true' : 'false'}" aria-label="${AP_ART.esc(theme.name)} — ${AP_ART.esc(theme.tagline)}">
      <span class="ap-art-card__preview">${AP_ART.previewSvg(theme.id, 100)}</span>
      <span class="ap-art-card__swatches">${AP_ART.swatchHtml(theme)}</span>
      <span class="ap-art-card__name">${AP_ART.esc(theme.name)}</span>
      <span class="ap-art-card__tag">${AP_ART.esc(theme.tagline)}</span>
      ${rec ? '<span class="ap-art-card__badge">Recommended</span>' : ''}
      ${sel ? '<span class="ap-art-card__badge ap-art-card__badge--sel">Selected</span>' : ''}
    </button>`;
  }

  function renderLibrary(root, packId) {
    const packs = AP_ART.packs();
    const pack = packs.find(p => p.id === packId);
    const themes = AP_ART.themesForPack(packId);
    const chart = AP_ART.savedChart();
    const recommendedId = AP_ART.recommend(chart, packId === 'all' ? null : packId);
    const selected = AP_ART.getSelected();

    const lede = pack
      ? AP_ART.esc(pack.lede)
      : 'Browse every colour theme — natal, sun sign, horoscope, life path, couples, and tailored masculine &amp; feminine palettes.';

    const chartNote = chart && chart.sunSign
      ? `<p class="ap-art-library__chart-note">${icon('star4')} Your saved chart: <strong>${AP_ART.esc(chart.name || 'My chart')}</strong> — Sun in ${AP_ART.esc(chart.sunSign)}. We highlight styles that suit your sky.</p>`
      : `<p class="ap-art-library__chart-note">${icon('map')} <a href="chart.html">Cast &amp; save your chart</a> first — we'll recommend sun-sign palettes automatically.</p>`;

    root.innerHTML = `
      <header class="ap-art-library__head">
        <h2 class="shop-section-title">${icon('orb')} Art Style Library</h2>
        <p class="ap-art-library__lede">${lede}</p>
        ${chartNote}
      </header>
      ${renderPackTabs(packs, packId)}
      <div class="ap-art-grid" id="ap-art-theme-panel" role="tabpanel" aria-labelledby="ap-art-pack-${AP_ART.esc(packId)}" tabindex="0">${themes.map(t => renderThemeCard(t, selected.id, recommendedId)).join('')}</div>
      <div class="ap-art-library__foot">
        <p class="ap-art-library__selected" id="ap-art-selected-label">
          Selected: <strong>${AP_ART.esc((AP_ART.themeById(selected.id) || {}).name || selected.id)}</strong>
          — tell us this name in the Typeform after checkout, or we'll use your sun-sign default.
        </p>
        <p class="ap-art-library__note">Every theme applies to posters, PDFs, readings, apparel &amp; couples prints. Fulfilment honours your choice within 24–48h.</p>
      </div>`;

    bindCards(root, packId);
  }

  function bindCards(root, packId) {
    root.querySelectorAll('[data-art-theme]').forEach(card => {
      const pick = () => {
        const id = card.dataset.artTheme;
        AP_ART.setSelected(id);
        renderLibrary(root, packId);
        const label = root.querySelector('#ap-art-selected-label');
        if (label) {
          const t = AP_ART.themeById(id);
          label.innerHTML = `Selected: <strong>${AP_ART.esc(t ? t.name : id)}</strong> — saved on this device. Mention <em>${AP_ART.esc(id)}</em> in checkout notes.`;
        }
      };
      card.addEventListener('click', pick);
    });

    root.querySelectorAll('[data-art-pack]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.artPack;
        root.querySelectorAll('[data-art-pack]').forEach(b => {
          const on = b.dataset.artPack === id;
          b.classList.toggle('active', on);
          b.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        renderLibrary(root, id);
      });
    });
  }

  function runInit() {
    const root = document.getElementById(ROOT_ID);
    if (!root || !window.AP_ART) return;

    AP_ART.load().then(() => {
      const hash = (location.hash || '').replace('#', '');
      const packFromHash = hash.startsWith('art-') ? hash.slice(4) : 'all';
      const valid = packFromHash === 'all' || AP_ART.packs().some(p => p.id === packFromHash);
      renderLibrary(root, valid ? packFromHash : 'all');
    });
  }

  function scheduleInit() {
    const section = document.getElementById('art-library');
    const hash = (location.hash || '').replace(/^#/, '');
    if (hash === 'art-library' || (hash && hash.startsWith('art-'))) {
      runInit();
      return;
    }
    if (!section || !('IntersectionObserver' in window)) {
      runInit();
      return;
    }
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      runInit();
    };
    const io = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) {
        io.disconnect();
        start();
      }
    }, { rootMargin: '0px 0px 240px 0px', threshold: 0 });
    io.observe(section);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleInit);
  } else {
    scheduleInit();
  }
})();