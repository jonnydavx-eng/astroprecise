(() => {
  'use strict';
  const input = document.getElementById('tool-search');
  const list = document.querySelector('.tool-directory');
  if (!input || !list) return;
  const rows = [...list.querySelectorAll('[data-tool]')];
  const buttons = [...document.querySelectorAll('[data-filter]')];
  const count = document.getElementById('tool-count');
  const empty = document.getElementById('tool-empty');
  let category = 'all';
  const normalize = value => value.toLocaleLowerCase('en-GB').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').trim();
  function update() {
    const words = normalize(input.value).split(/\s+/).filter(Boolean);
    let visible = 0;
    rows.forEach(row => {
      const matches = (category === 'all' || row.dataset.category === category) && words.every(word => normalize(row.dataset.search).includes(word));
      row.hidden = !matches;
      if (matches) visible += 1;
    });
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === category)));
    count.textContent = visible + (visible === 1 ? ' tool or guide' : ' tools and guides');
    empty.hidden = visible !== 0;
  }
  input.addEventListener('input', update);
  buttons.forEach(button => button.addEventListener('click', () => { category = button.dataset.filter; update(); }));
  document.querySelector('[data-reset-filter]')?.addEventListener('click', () => { category = 'all'; input.value = ''; update(); input.focus(); });
  document.querySelector('[data-directory-controls]').hidden = false;
  update();
})();
