import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'website');
const p = join(root, 'shop.html');
let text = readFileSync(p, 'utf8');

const cats = {
  'shop-card--books': 'cat-books.jpg',
  'shop-card--crystals': 'cat-crystals.jpg',
  'shop-card--oracle': 'cat-oracle.jpg',
  'shop-card--jewelry': 'cat-jewelry.jpg',
  'shop-card--prints': 'cat-prints.jpg',
};

for (const [cls, img] of Object.entries(cats)) {
  const re = new RegExp(
    `(<div class="shop-card ${cls}">[\\s\\S]*?<div class="shop-card__img"[^>]*>)\\s*<span class="shop-card__img-glyph">[\\s\\S]*?</span>\\s*(</div>)`,
    'g'
  );
  const before = text;
  text = text.replace(
    re,
    `$1<img src="img/shop/${img}" alt="" width="1600" height="1000" loading="lazy" decoding="async" />$2`
  );
  console.log(cls, before !== text ? 'updated' : 'no match');
}

const old = `    <!-- CURATED AFFILIATE SHELF -->
    <section class="section" id="shop-curated">
      <div class="container">
        <p class="shop-section-title"><svg class="eng-i" aria-hidden="true"><use href="#ei-book"/></svg> Curated picks we actually use</p>
        <p class="shop-affiliate-intro">Books, decks, and objects that complement the practice — honest affiliate links, disclosed below. Our own personalised pieces live above.</p>
        <div class="disclosure-banner" role="note">
          <strong>Affiliate disclosure</strong> — Some links earn AstroPrecise a small commission at no extra cost to you. We only recommend things we'd use ourselves. Casting your chart stays free.
        </div>
      </div>
    </section>

    <!-- BOOKS -->
    <section class="section" id="books">
      <div class="container">
        <p class="shop-section-title">☿ Essential Reading</p>
        <div class="shop-grid">`;

const neu = `    <!-- CURATED AFFILIATE SHELF (tabbed) -->
    <section class="section" id="shop-curated">
      <div class="container">
        <header class="shop-curated-head">
          <p class="shop-section-title" style="justify-content:center;"><svg class="eng-i" aria-hidden="true"><use href="#ei-book"/></svg> Curated picks we actually use</p>
          <p class="shop-curated-intro">Books, decks, crystals, and objects that complement the practice — honest affiliate links, disclosed below. Our own personalised pieces live above.</p>
        </header>
        <div class="disclosure-banner" role="note">
          <strong>Affiliate disclosure</strong> — Some links earn AstroPrecise a small commission at no extra cost to you. We only recommend things we'd use ourselves. Casting your chart stays free.
        </div>
        <div class="shop-curated-tabs" id="shop-curated-tabs"></div>
        <div id="shop-curated-shelf">
        <div class="shop-curated-panel active" data-curated-panel="books">
        <div class="shop-grid">`;

if (text.includes(old)) {
  text = text.replace(old, neu);
  console.log('curated header merged');
} else {
  console.warn('curated header pattern not found');
}

const pairs = [
  [`        </div>
      </div>
    </section>

    <!-- CRYSTALS -->
    <section class="section" id="crystals">
      <div class="container">
        <p class="shop-section-title">⊕ Crystals &amp; Stones</p>
        <div class="shop-grid">`,
   `        </div>
        </div>
        <div class="shop-curated-panel" data-curated-panel="crystals">
        <div class="shop-grid">`],
  [`        </div>
      </div>
    </section>

    <!-- ORACLE CARDS -->
    <section class="section" id="oracle-cards">
      <div class="container">
        <p class="shop-section-title">☽ Oracle &amp; Tarot Decks</p>
        <div class="shop-grid">`,
   `        </div>
        </div>
        <div class="shop-curated-panel" data-curated-panel="oracle">
        <div class="shop-grid">`],
  [`        </div>
      </div>
    </section>

    <!-- JEWELRY -->
    <section class="section" id="jewelry">
      <div class="container">
        <p class="shop-section-title">⊙ Jewellery &amp; Accessories</p>
        <div class="shop-grid">`,
   `        </div>
        </div>
        <div class="shop-curated-panel" data-curated-panel="jewelry">
        <div class="shop-grid">`],
  [`        </div>
      </div>
    </section>

    <!-- ART PRINTS -->
    <section class="section" id="prints">
      <div class="container">
        <p class="shop-section-title">◈ Art Prints &amp; Journals</p>
        <div class="shop-grid">`,
   `        </div>
        </div>
        <div class="shop-curated-panel" data-curated-panel="prints">
        <div class="shop-grid">`],
  [`        </div>
      </div>
    </section>

    <!-- SUGGEST AN ITEM -->`,
   `        </div>
        </div>
        </div>
      </div>
    </section>

    <!-- SUGGEST AN ITEM -->`],
];

for (const [a, b] of pairs) {
  if (text.includes(a)) text = text.replace(a, b);
  else console.warn('missing block');
}

text = text.replace(
  `    <section class="section">
      <div class="container" style="max-width:680px;">
        <div class="lp-number-hero" style="padding:var(--space-8);">`,
  `    <section class="section">
      <div class="container shop-contribute">
        <div class="shop-contribute__panel">`
);

writeFileSync(p, text, 'utf8');
console.log('saved', p);