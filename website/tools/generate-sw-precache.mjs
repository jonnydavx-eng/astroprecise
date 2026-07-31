#!/usr/bin/env node
/**
 * Regenerate sw.js PRECACHE from canonical file sets.
 * Run from website root:  node tools/generate-sw-precache.mjs
 *
 * Scans html / css / js plus static asset globs, dedupes, sorts, and
 * replaces the PRECACHE block between markers in sw.js. Bumps cache V.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { dirname, join, relative, posix } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SW_PATH = join(ROOT, 'sw.js');

const SIGN_KEYS = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
];

/** Root HTML shipped to users (exclude dev / redirect shells). */
const HTML_INCLUDE = new Set([
  './',
  ...[
    'index.html', 'index-full.html', 'index-lite.html', '404.html',
    'chart.html', 'chart-view.html', 'horoscope.html', 'compatibility.html', 'transits.html',
    'cosmic-story.html',
    'ephemeris.html', 'lifepath.html', 'shop.html', 'accuracy.html', 'why.html',
    'links.html', 'outreach.html', 'charts.html', 'retrograde.html', 'moonphase.html',
    'what-is-my-rising-sign.html', 'synastry.html', 'solar-return.html', 'saturn-return.html',
    'quiz.html', 'angel-numbers.html', 'tonight.html', 'this-weeks-sky.html', 'name-numerology.html',
    'guides.html', 'catalogue.html', 'explore.html', 'moment.html', 'mysky.html',
    'privacy.html', 'terms.html', 'profile.html', 'sample-reading.html',
    'offline.html', // sw.js fetch handler falls back to caches.match('./offline.html')
    ...SIGN_KEYS.map((k) => `${k}.html`),
    'manifest.json', 'robots.txt', 'sitemap.xml', 'llms.txt',
  ].map((f) => `./${f}`),
]);

/** JS omitted from precache (runtime import / optional heavy). */
const JS_EXCLUDE = new Set([
  'orrery-webgl.js',
  // Engine-only deps of orrery-webgl.js (OrbitLab sync, Phase 1.6) — the engine
  // itself is deliberately NOT precached, so its deps lazy-cache at runtime too.
  'orbitlab-bodies.js',
  'orbitlab-orbital-math.js',
  'gaia-sample.js',
  'gaia-sample-worker.js',
  'orrery3d.js',
  'ephemeris-lazy-modules.js',
  'interpretations.js',
  'ap-load-interpretations.js',
]);

/** Always include even if scan would miss them. */
const REQUIRED = [
  './css/sign-page.css',
  './js/ap-canvas-seals.js',
  './js/ap-zodiac-constants.js',
  './js/ap-page-boot.js',
  './js/sign-page-boot.js',
  './js/content-service.js',
  ...SIGN_KEYS.map((k) => `./${k}.html`),
];

function toPrecachePath(absPath) {
  const rel = relative(ROOT, absPath).split('\\').join('/');
  return `./${rel}`;
}

function listFiles(dir, filter) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...listFiles(full, filter));
    else if (!filter || filter(full, name)) out.push(full);
  }
  return out;
}

function collectCanonical() {
  const paths = new Set(HTML_INCLUDE);

  for (const f of listFiles(join(ROOT, 'css'), (_, name) => name.endsWith('.css'))) {
    paths.add(toPrecachePath(f));
  }

  for (const f of listFiles(join(ROOT, 'js'), (_, name) => name.endsWith('.js') && !JS_EXCLUDE.has(name))) {
    paths.add(toPrecachePath(f));
  }

  for (const rel of REQUIRED) paths.add(rel);

  if (existsSync(join(ROOT, 'js', 'ap-nav-model.js'))) {
    paths.add('./js/ap-nav-model.js');
  }

  // Static asset canonical sets
  const staticDirs = [
    join(ROOT, 'fonts'),
    join(ROOT, 'data'),
    join(ROOT, 'assets', 'textures'),
    join(ROOT, 'assets', 'images', 'orbs', 'planets'),
    join(ROOT, 'assets', 'images', 'seals'),
    join(ROOT, 'assets', 'images', 'zodiac-cards'),
    join(ROOT, 'img'),
    join(ROOT, 'img', 'shop'),
  ];

  // Keep the precache install shell lean:
  //  - img/engine/* — large photoreal stills, only on the pages that show them
  //  - img/design-targets/* — design-reference mockups, referenced by no page
  //  - assets/textures/*.{jpg,png} — the LEGACY raster maps, superseded by .webp
  //    (the engine loads .webp; the .jpg/.png stay on disk only as a runtime
  //    fallback). Precaching both formats would double the texture payload.
  // These lazy-cache at runtime instead.
  const PRECACHE_EXCLUDE = /(^|\/)img\/(engine|design-targets)\/|(^|\/)assets\/textures\/[^/]+\.(jpe?g|png)$|(^|\/)[^/]*\.bak(?:[-.][^/]*)?$/i;

  // Content-bank windowing (2026-07-10): the bank is now a rolling ~188-day
  // set (today−7 … today+180, refreshed weekly by
  // .github/workflows/refresh-content-bank.yml) — precaching ALL of it would
  // push ~4.5 MB / ~200 extra entries through every SW install. Precache only
  // what the next fortnight of visits can actually hit:
  //   manifest.json + core/* + current & next monthly + daily today−1…today+14
  // (UTC window, matching the builder's UTC date keys). Everything outside
  // the window backfills on demand via the sw.js runtime cache-first path
  // ("return cached || networkFetch" + cache.put on 200 responses).
  const DAY_MS = 86400000;
  const nowU = new Date();
  const todayUTC = Date.UTC(nowU.getUTCFullYear(), nowU.getUTCMonth(), nowU.getUTCDate());
  const bankDailyWindow = new Set();
  for (let i = -1; i <= 14; i++) {
    bankDailyWindow.add(new Date(todayUTC + i * DAY_MS).toISOString().slice(0, 10));
  }
  const bankMonthlyWindow = new Set();
  for (let k = 0; k <= 1; k++) {
    const d = new Date(Date.UTC(nowU.getUTCFullYear(), nowU.getUTCMonth() + k, 1));
    bankMonthlyWindow.add(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  function contentBankAllowed(rel) {
    const m = rel.match(/^\.\/data\/content-bank\/(.+)$/);
    if (!m) return true; // not a content-bank path — no windowing
    const sub = m[1];
    if (sub === 'manifest.json' || sub.startsWith('core/')) return true;
    const daily = sub.match(/^daily\/(\d{4}-\d{2}-\d{2})\.json$/);
    if (daily) return bankDailyWindow.has(daily[1]);
    const monthly = sub.match(/^monthly\/(\d{4}-\d{2})\.json$/);
    if (monthly) return bankMonthlyWindow.has(monthly[1]);
    return false; // unknown bank file — runtime-cache only
  }
  const RETIRED_OG = new Set([
    './img/og-banner-improved.jpg',
    './img/og-banner-v576.jpg',
    './img/og-banner-v576.webp',
  ]);

  /** Skip legacy raster when WebP (or SVG for shop products) is the shipped format. */
  function skipLegacyRaster(absPath) {
    const rel = toPrecachePath(absPath);
    if (/(^|\/)\.[^/]*\.bak(?:[-.][^/]*)?\.(?:jpe?g|png|webp|gif)$/i.test(rel) || /(^|\/)[^/]*\.bak(?:[-.][^/]*)?$/i.test(rel)) return true;
    if (RETIRED_OG.has(rel)) return true;
    if (!/\.(jpe?g|png)$/i.test(rel)) return false;
    const base = absPath.replace(/\.(jpe?g|png)$/i, '');
    if (existsSync(`${base}.webp`)) return true;
    if (/\/img\/shop\/product-/.test(rel) && existsSync(`${base}.svg`)) return true;
    return false;
  }

  for (const dir of staticDirs) {
    for (const f of listFiles(dir)) {
      const rel = toPrecachePath(f);
      if (PRECACHE_EXCLUDE.test(rel)) continue;
      if (!contentBankAllowed(rel)) continue;
      if (skipLegacyRaster(f)) continue;
      if (/\.(woff2|json|jpg|jpeg|png|svg|webp)$/i.test(rel)) paths.add(rel);
    }
  }

  return [...paths].sort((a, b) => a.localeCompare(b));
}

function bumpVersion(swText) {
  const m = swText.match(/const V = ["'](ap-v\d+)["']/);
  if (!m) throw new Error('sw.js: could not parse const V');
  const n = parseInt(m[1].replace('ap-v', ''), 10);
  const next = `ap-v${n + 1}`;
  return swText.replace(/const V = ["']ap-v\d+["']/, `const V = "${next}"`);
}

function formatPrecache(entries) {
  const lines = entries.map((e) => `  '${e}',`);
  return [
    '/* PRECACHE_BEGIN — generated by tools/generate-sw-precache.mjs */',
    'const PRECACHE = [',
    ...lines,
    '];',
    '/* PRECACHE_END */',
  ].join('\n');
}

function replacePrecache(swText, block) {
  const re = /\/\* PRECACHE_BEGIN[\s\S]*?\/\* PRECACHE_END \*\//;
  if (re.test(swText)) return swText.replace(re, block);

  const legacy = /const PRECACHE = \[[\s\S]*?\];/;
  if (!legacy.test(swText)) throw new Error('sw.js: no PRECACHE block found');
  return swText.replace(legacy, block);
}

function main() {
  const entries = collectCanonical();
  let sw = readFileSync(SW_PATH, 'utf8');
  sw = bumpVersion(sw);
  const ver = sw.match(/const V = ["']ap-v(\d+)["']/)?.[1];
  if (ver) {
    const assetPath = join(ROOT, 'js', 'ap-asset-v.js');
    if (existsSync(assetPath)) {
      const asset = readFileSync(assetPath, 'utf8');
      writeFileSync(assetPath, asset.replace(/AP_ASSET_V\s*=\s*['"]\d+['"]/, `AP_ASSET_V = '${ver}'`), 'utf8');
    }
  }
  sw = replacePrecache(sw, formatPrecache(entries));

  // GUARD added 2026-07-31 (Claude @ BOOK-T1H4NJ753R). On 2026-07-20 this generator
  // silently deleted CORE, OPTIONAL and canonicalAssetKey because they had been written
  // INSIDE the PRECACHE markers, which replacePrecache() overwrites wholesale. The live
  // service worker then referenced three identifiers that no longer existed: install()
  // threw, the fetch handler crashed, offline mode died, and returning visitors were
  // pinned to a July worker. Every test stayed green because nothing lints sw.js.
  // Fail loudly rather than ship that again. Definitions now live BELOW the end marker.
  const REQUIRED = ['CORE', 'OPTIONAL', 'canonicalAssetKey'];
  const missing = REQUIRED.filter(
    (id) => !new RegExp(`(?:^|\\n)\\s*(?:const|function)\\s+${id}\\b`).test(sw),
  );
  if (missing.length) {
    throw new Error(
      `sw.js would lose required definition(s): ${missing.join(', ')}. ` +
        'They must be declared BELOW the PRECACHE_END marker — anything between the ' +
        'markers is regenerated and destroyed. See git show be871d1^:website/sw.js.',
    );
  }

  writeFileSync(SW_PATH, sw, 'utf8');

  const versionLabel = sw.match(/const V = ["'](ap-v\d+)["']/)?.[1] ?? '?';
  console.log(`sw.js updated — ${versionLabel}, ${entries.length} precache entries`);
}

main();
