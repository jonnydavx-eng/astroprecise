import { readFileSync, writeFileSync } from 'fs';

function read(p) { return readFileSync(p, 'utf8'); }
function write(p, s) { writeFileSync(p, s, 'utf8'); console.log('wrote', p); }

// --- ap-nav-model.js ---
{
  let s = read('website/js/ap-nav-model.js');
  s = s.replace(
    "    ['synastry.html', 'Synastry'], ['what-is-my-rising-sign.html', 'Rising Sign'],\n    ['lifepath.html', 'Life Path'],\n",
    "    ['what-is-my-rising-sign.html', 'Rising Sign'],\n"
  );
  s = s.replace(
    'return /^(?:index|chart|horoscope|shop|sky-events|eclipse|privacy|terms|refunds|verify|contact|sample-reading|natal-plate)\\.html$/i.test(staticHere());',
    'return /^(?:index|chart|shop|sky-events|eclipse|privacy|terms|refunds|verify|contact|sample-reading|natal-plate)\\.html$/i.test(staticHere());'
  );
  s = s.replace(/five-route launch shell/g, 'four-route launch shell');
  s = s.replace(/Five-route mobile spine/g, 'Four-route mobile spine');
  write('website/js/ap-nav-model.js', s);
}

// --- app.js fallback extras (one-line unhook, matches AP_NAV) ---
{
  let s = read('website/js/app.js');
  s = s.replace(
    "    ['synastry.html', 'Synastry'], ['what-is-my-rising-sign.html', 'Rising Sign'],\n    ['lifepath.html', 'Life Path'],\n",
    "    ['what-is-my-rising-sign.html', 'Rising Sign'],\n"
  );
  write('website/js/app.js', s);
}

// --- living-sky 4-tab grid ---
{
  let s = read('website/css/ap-living-sky-v834.css');
  s = s.replace('grid-template-columns: repeat(5, minmax(0, 1fr)) !important;', 'grid-template-columns: repeat(4, minmax(0, 1fr)) !important;');
  write('website/css/ap-living-sky-v834.css', s);
}

// --- build.mjs skip backups ---
{
  let s = read('tools/build.mjs');
  s = s.replace(
    "      if (name.includes('.pre-shell') || name.includes('.pre-redirect')) continue",
    "      if (name.includes('.pre-shell') || name.includes('.pre-redirect') || name.includes('.pre-guard-bak') || /\\.bak(?:$|\\.)/.test(name)) continue"
  );
  write('tools/build.mjs', s);
}

// --- compatibility noscript: drop Daily (Events already present) ---
{
  let s = read('website/compatibility.html');
  s = s.replace('\n            <a href="horoscope.html" class="navbar__link">Daily</a>', '');
  write('website/compatibility.html', s);
}

// --- sitemap: drop retired rooms ---
{
  let s = read('website/sitemap.xml');
  const drop = [
    'horoscope.html', 'synastry.html', 'lifepath.html', 'angel-numbers.html',
    'name-numerology.html', 'quiz.html',
    'aries.html', 'taurus.html', 'gemini.html', 'cancer.html', 'leo.html', 'virgo.html',
    'libra.html', 'scorpio.html', 'sagittarius.html', 'capricorn.html', 'aquarius.html', 'pisces.html',
  ];
  for (const page of drop) {
    const re = new RegExp(`\\s*<url>\\s*<loc>https://astroprecise\\.app/${page.replace('.', '\\.')}</loc>[\\s\\S]*?</url>`, 'g');
    const next = s.replace(re, '');
    if (next === s) console.log('sitemap miss', page);
    s = next;
  }
  write('website/sitemap.xml', s);
}

function stripDailyReadings(html) {
  return html.replace(/\s*<div class="footer-nav-col" role="group" aria-label="Daily horoscope readings">[\s\S]*?<\/div>(?=\s*<div class="footer-nav-col")/, '');
}
function stripSignGuides(html) {
  return html.replace(/\s*<div class="footer-nav-col" role="group" aria-label="Zodiac sign guides">[\s\S]*?<\/div>/, '');
}
function swapFooterDailyLifePath(html) {
  html = html.replace(
    /<li><a href="horoscope\.html"><span aria-hidden="true">☽<\/span> Daily<\/a><\/li>/g,
    '<li><a href="sky-events.html"><span aria-hidden="true">☽</span> Events</a></li>'
  );
  html = html.replace(
    /\s*<li><a href="lifepath\.html"><svg class="eng-i" aria-hidden="true"><use href="#ei-gem"\/><\/svg> Life Path<\/a><\/li>/g,
    ''
  );
  return html;
}
function swapNoscriptDaily(html) {
  // Pages that already have Events keep a single Events link.
  if (/<a href="sky-events\.html" class="navbar__link">Events<\/a>/.test(html)) {
    return html.replace(/<a href="horoscope\.html" class="navbar__link">Daily<\/a>/g, '');
  }
  return html.replace(/<a href="horoscope\.html" class="navbar__link">Daily<\/a>/g, '<a href="sky-events.html" class="navbar__link">Events</a>');
}

const footerPages = [
  'website/accuracy.html',
  'website/charts.html',
  'website/ephemeris.html',
  'website/guides.html',
  'website/profile.html',
  'website/transits.html',
  'website/moonphase.html',
  'website/retrograde.html',
  'website/saturn-return.html',
  'website/this-weeks-sky.html',
  'website/solar-return.html',
  'website/why.html',
  'website/what-is-my-rising-sign.html',
];
for (const p of footerPages) {
  let s = read(p);
  const before = s;
  s = swapNoscriptDaily(s);
  s = swapFooterDailyLifePath(s);
  s = stripDailyReadings(s);
  s = stripSignGuides(s);
  if (s === before) console.log('no footer change', p);
  write(p, s);
}

// --- ephemeris body unhooks ---
{
  let s = read('website/ephemeris.html');
  s = s.replace('<a href="horoscope.html" class="sky-tools-row__link">Daily horoscope</a>\n              ', '');
  s = s.replace('<a href="horoscope.html" class="sky-jump-nav__link">Daily</a>', '<a href="sky-events.html" class="sky-jump-nav__link">Events</a>');
  s = s.replace(/\s*<a id="natal-lifepath-link" href="lifepath\.html" class="glow-btn sky-natal-links__btn">Life Path &rarr;<\/a>/, '');
  write('website/ephemeris.html', s);
}

// --- links.html ---
{
  let s = read('website/links.html');
  s = s.replace('Mission Control for your sky &mdash; genuinely accurate, computed privately. &#10022;', 'Genuinely accurate astrology, computed privately. &#10022;');
  s = s.replace(/\s*<a class="lib-link" href="horoscope\.html">[\s\S]*?<\/a>/, '');
  write('website/links.html', s);
}

console.log('batch 1 done');
