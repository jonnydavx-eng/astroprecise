#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'https://astroprecise.app';

const JSON_LD_PAGES = {
  'chart.html': {
    name: 'AstroPrecise — Birth Chart Calculator',
    description: 'Free natal chart calculator — enter your birth date, time and place for a precise birth chart with Sun, Moon, Rising, houses and aspects. All calculations run privately in your browser.',
  },
  'horoscope.html': {
    name: 'AstroPrecise — Daily Horoscopes',
    description: 'Free daily horoscopes for all 12 zodiac signs, generated from real planetary positions using VSOP87 astronomy — private, in your browser.',
  },
  'compatibility.html': {
    name: 'AstroPrecise — Synastry & Compatibility',
    description: 'Compare two birth charts for synastry aspects, composite themes, and relationship compatibility — computed locally from precise astronomy.',
  },
  'transits.html': {
    name: 'AstroPrecise — Transit Calculator',
    description: 'See how current planetary transits aspect your natal chart — dated, orb-aware, and computed privately in your browser.',
  },
  'ephemeris.html': {
    name: 'AstroPrecise — The Instrument',
    description: 'A precision ephemeris and cosmic instrument — planetary hours, natal signature, field weather, and live sky data computed locally.',
  },
};

function injectRafCore(html) {
  if (html.includes('raf-core.js')) return html;
  return html.replace(
    /(\s*)<script src="js\/cosmos\.js"><\/script>/,
    '$1<script src="js/raf-core.js"></script>\n$1<script src="js/cosmos.js"></script>'
  );
}

function injectJsonLd(file, meta, html) {
  if (html.includes('"isAccessibleForFree": true') && html.includes(file.replace('.html', ''))) {
    // may already have partial ld+json — only add if no WebApplication for this page
  }
  const marker = '<link rel="stylesheet" href="css/main.css" />';
  if (!html.includes(marker)) return html;
  const block = `
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "${meta.name}",
    "url": "${BASE}/${file}",
    "applicationCategory": "LifestyleApplication",
    "operatingSystem": "Any (web browser)",
    "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
    "isAccessibleForFree": true,
    "description": "${meta.description}",
    "isPartOf": {
      "@type": "WebSite",
      "name": "AstroPrecise",
      "url": "${BASE}/"
    }
  }
  </script>`;
  if (html.includes(`"${BASE}/${file}"`) && html.includes('WebApplication')) return html;
  return html.replace(marker, block + '\n' + marker);
}

let rafCount = 0;
let ldCount = 0;

for (const file of readdirSync(ROOT).filter(f => f.endsWith('.html'))) {
  const path = join(ROOT, file);
  let html = readFileSync(path, 'utf8');
  const before = html;
  html = injectRafCore(html);
  if (JSON_LD_PAGES[file]) html = injectJsonLd(file, JSON_LD_PAGES[file], html);
  if (html !== before) {
    writeFileSync(path, html);
    if (html.includes('raf-core.js') && !before.includes('raf-core.js')) rafCount++;
    if (JSON_LD_PAGES[file] && html.includes('isAccessibleForFree')) ldCount++;
  }
}

console.log(`raf-core injected on ${rafCount} pages, JSON-LD on ${ldCount} pages`);