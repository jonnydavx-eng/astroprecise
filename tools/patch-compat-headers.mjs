import fs from 'fs';

const path = 'website/compatibility.html';
let html = fs.readFileSync(path, 'utf8');

const signs = [
  ['Aries', 'Ari', '♈'], ['Taurus', 'Tau', '♉'], ['Gemini', 'Gem', '♊'], ['Cancer', 'Can', '♋'],
  ['Leo', 'Leo', '♌'], ['Virgo', 'Vir', '♍'], ['Libra', 'Lib', '♎'], ['Scorpio', 'Sco', '♏'],
  ['Sagittarius', 'Sag', '♐'], ['Capricorn', 'Cap', '♑'], ['Aquarius', 'Aqu', '♒'], ['Pisces', 'Pis', '♓'],
];

for (const [name, abbr, glyph] of signs) {
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const oldCol = new RegExp(
    `<th scope="col" data-sign-orb="${esc(name)}"><span class="sr-only">${esc(name)}</span><abbr title="${esc(name)}" aria-hidden="true">${esc(glyph)}</abbr> <span class="compat-sign-abbr" aria-hidden="true">${esc(abbr)}</span></th>`,
    'g',
  );
  const newCol = `<th scope="col" aria-label="${name}" data-sign-orb="${name}"><abbr title="${name}" aria-hidden="true">${glyph}</abbr> <span class="compat-sign-abbr">${abbr}</span></th>`;
  html = html.replace(oldCol, newCol);

  const oldRow = new RegExp(
    `<th scope="row" data-sign-orb="${esc(name)}"><span class="sr-only">${esc(name)}</span><abbr title="${esc(name)}" aria-hidden="true">${esc(glyph)}</abbr> <span class="compat-sign-abbr" aria-hidden="true">${esc(abbr)}</span></th>`,
    'g',
  );
  const newRow = `<th scope="row" aria-label="${name}" data-sign-orb="${name}"><abbr title="${name}" aria-hidden="true">${glyph}</abbr> <span class="compat-sign-abbr">${abbr}</span></th>`;
  html = html.replace(oldRow, newRow);
}

html = html.replace(
  '<th scope="col" style="background:transparent;border:none;"><span class="sr-only">Row sign</span><span class="compat-sign-abbr" aria-hidden="true">Sign</span></th>',
  '<th scope="col" aria-label="Sign" style="background:transparent;border:none;"><span class="compat-sign-abbr">Sign</span></th>',
);

fs.writeFileSync(path, html);
console.log('compat matrix headers patched');