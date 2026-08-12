#!/usr/bin/env node
/**
 * Regenerate the AstroPrecise launch shell and advance the shared cache version.
 *
 * Run once, from website/:
 *   node tools/generate-sw-precache.mjs
 *
 * The service worker caches only the Home/Eclipse/offline shell at install time.
 * Every other same-origin asset is cached on first use by sw.js. This keeps an
 * update atomic without downloading the historical long tail beside the 3D view.
 */

import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SW_PATH = join(ROOT, 'sw.js');
const ASSET_VERSION_PATH = join(ROOT, 'js', 'ap-asset-v.js');

// These documents form the launch-day offline shell. Other routes remain
// network-first for navigation and become available offline after their first use.
const SHELL_DOCUMENTS = [
  './index.html',
  './eclipse.html',
  './offline.html',
];

// Pages whose explicit ?v= values must never point beyond sw.js. Assets carry
// their own release tips (for example chart v837 beside launch v842), so older
// values are intentional. A future value is unsafe because the active worker
// would not own that release yet.
const RELEASE_PAGES = [
  './index.html',
  './eclipse.html',
  './chart.html',
  './horoscope.html',
  './shop.html',
  './privacy.html',
  './terms.html',
  './refunds.html',
  './verify.html',
  './contact.html',
  './sample-reading.html',
  './natal-plate.html',
];

// Runtime references that cannot be derived safely from markup. The Eclipse
// contact module imports the engine relative to itself and fetches the JSON from
// the document root; both are part of the launch experience.
const REQUIRED_TRANSITIVE = [
  './js/eclipse-reading.js',
  './js/reading-templates.json',
  // The opt-in cosmic flight injects these classic scripts by string at click
  // time, so the static import walker cannot discover them. They are small and
  // make the same-model journey available after an offline refresh.
  './js/scale-journey-chapters.js',
  './js/scale-journey.js',
  './css/ap-footer-v835.css',
  // Home imports this through a release-version expression, which the static
  // import walker cannot discover. Adding the module lets the walker include
  // its Three post-processing and orbital-math dependencies.
  './js/orrery-webgl.js',
  // Compact texture fallbacks make both 3D instruments usable after an offline
  // refresh without forcing full-resolution maps into the install transaction.
  './assets/textures/earth_sm.webp',
  './assets/textures/earth_clouds_sm.webp',
  './assets/textures/earth_lights_sm.webp',
  './assets/textures/earth_normal_sm.webp',
  './assets/textures/earth_specular_sm.webp',
  './assets/textures/jupiter_sm.webp',
  './assets/textures/mars_sm.webp',
  './assets/textures/mercury_sm.webp',
  './assets/textures/moon_sm.webp',
  './assets/textures/neptune_sm.webp',
  './assets/textures/saturn_sm.webp',
  './assets/textures/saturn_ring_sm.webp',
  './assets/textures/uranus_sm.webp',
  './assets/textures/venus_sm.webp',
  './img/orrery/env_nebula_cool_sm.webp',
];

// Editorial/product artwork appears on the launch pages but is not required to
// boot either WebGL instrument. Keep it runtime-cached so installation remains
// atomic and fast; the free guide PDF also remains an explicit user download.
const RUNTIME_ONLY = new Set([
  './img/editorial/eclipse-edition-art-v841.png',
  './img/editorial/eclipse-field-guide-cover-final-v836.png',
]);

const MAX_SHELL_ENTRIES = 80;
const MAX_SHELL_BYTES = 3_000_000;

// Mirrors the import maps authored in index.html and eclipse.html. Bare ESM
// specifiers are not relative URLs, so resolving them here is required before
// walking the Eclipse renderer's static dependency graph.
const BARE_IMPORTS = new Map([
  ['three', './js/vendor/three/three.module.min.js'],
]);
const BARE_IMPORT_PREFIXES = [
  ['three/addons/', './js/vendor/three/jsm/'],
];

function fileFor(relPath) {
  if (relPath === './') return join(ROOT, 'index.html');
  return join(ROOT, ...relPath.replace(/^\.\//, '').split('/'));
}

function assertFile(relPath, context = 'launch shell') {
  const abs = fileFor(relPath);
  if (!existsSync(abs) || !statSync(abs).isFile()) {
    throw new Error(`${context}: missing file ${relPath}`);
  }
  return abs;
}

function localPath(rawRef, fromRel, resolveBareImports = false) {
  if (!rawRef) return null;
  let ref = String(rawRef).trim();
  if (!ref || /^(?:data:|blob:|https?:|mailto:|tel:|javascript:|#)/i.test(ref)) return null;

  ref = ref.split(/[?#]/, 1)[0].trim();
  if (!ref) return null;
  if (ref === '/') return './';

  if (resolveBareImports && !ref.startsWith('.') && !ref.startsWith('/')) {
    if (BARE_IMPORTS.has(ref)) return BARE_IMPORTS.get(ref);
    const mapped = BARE_IMPORT_PREFIXES.find(([prefix]) => ref.startsWith(prefix));
    if (mapped) return `${mapped[1]}${ref.slice(mapped[0].length)}`;
    throw new Error(`unmapped bare module specifier ${ref} from ${fromRel}`);
  }

  let rel;
  if (ref.startsWith('/')) {
    rel = ref.replace(/^\/+/, '');
  } else {
    const from = fromRel.replace(/^\.\//, '');
    rel = posix.normalize(posix.join(posix.dirname(from), ref.replace(/\\/g, '/')));
  }

  if (!rel || rel === '.') return './';
  if (rel === '..' || rel.startsWith('../') || posix.isAbsolute(rel)) {
    throw new Error(`launch shell reference escapes website/: ${rawRef} from ${fromRel}`);
  }
  return `./${rel.replace(/^\.\//, '')}`;
}

function tagAssetRefs(html) {
  const refs = [];
  const tags = html.match(/<(?:script|link|img|source|video)\b[^>]*>/gi) || [];
  for (const tag of tags) {
    for (const match of tag.matchAll(/\b(?:src|href|poster)\s*=\s*(["'])(.*?)\1/gi)) {
      refs.push(match[2]);
    }
    for (const match of tag.matchAll(/\bsrcset\s*=\s*(["'])(.*?)\1/gi)) {
      if (/^\s*data:/i.test(match[2])) continue;
      for (const candidate of match[2].split(',')) {
        const ref = candidate.trim().split(/\s+/, 1)[0];
        if (ref) refs.push(ref);
      }
    }
  }
  return refs;
}

function cssAssetRefs(css) {
  const refs = [];
  for (const match of css.matchAll(/url\(\s*(["']?)(.*?)\1\s*\)/gi)) refs.push(match[2]);
  for (const match of css.matchAll(/@import\s+(?:url\(\s*)?(["'])(.*?)\1/gi)) refs.push(match[2]);
  return refs;
}

function inlineStyleRefs(html) {
  const refs = [];
  for (const match of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) {
    refs.push(...cssAssetRefs(match[1]));
  }
  return refs;
}

function jsImportRefs(js) {
  const refs = [];
  for (const match of js.matchAll(/\bimport\s*\(\s*(["'])(.*?)\1\s*\)/g)) refs.push(match[2]);
  for (const match of js.matchAll(/\b(?:import|export)\s+(?:[^"']*?\s+from\s+)?(["'])(.*?)\1/g)) refs.push(match[2]);
  return refs;
}

function collectLaunchShell() {
  const entries = new Set(['./', ...SHELL_DOCUMENTS, ...REQUIRED_TRANSITIVE]);
  const queue = [...SHELL_DOCUMENTS, ...REQUIRED_TRANSITIVE];
  const scanned = new Set();

  while (queue.length) {
    const rel = queue.shift();
    if (scanned.has(rel)) continue;
    scanned.add(rel);

    const abs = assertFile(rel);
    const extension = posix.extname(rel).toLowerCase();
    if (!['.html', '.css', '.js'].includes(extension)) continue;

    const source = readFileSync(abs, 'utf8');
    const rawRefs = extension === '.html'
      ? [...tagAssetRefs(source), ...inlineStyleRefs(source)]
      : extension === '.css'
        ? cssAssetRefs(source)
        : jsImportRefs(source);

    for (const rawRef of rawRefs) {
      const child = localPath(rawRef, rel, extension === '.js');
      if (!child) continue;
      assertFile(child, `reference from ${rel}`);
      if (RUNTIME_ONLY.has(child)) continue;
      if (!entries.has(child)) entries.add(child);
      if (/\.(?:html|css|js)$/i.test(child) && !scanned.has(child)) queue.push(child);
    }
  }

  const sorted = [...entries].sort((a, b) => {
    if (a === './') return -1;
    if (b === './') return 1;
    return a.localeCompare(b);
  });

  let bytes = 0;
  for (const rel of sorted) bytes += statSync(assertFile(rel)).size;
  if (sorted.length > MAX_SHELL_ENTRIES || bytes > MAX_SHELL_BYTES) {
    throw new Error(
      `launch shell budget exceeded: ${sorted.length}/${MAX_SHELL_ENTRIES} entries, ` +
      `${bytes}/${MAX_SHELL_BYTES} bytes. Keep large/optional media on demand.`,
    );
  }

  return { entries: sorted, bytes };
}

function bumpVersion(swText) {
  const match = swText.match(/const V = ["']ap-v(\d+)["']/);
  if (!match) throw new Error('sw.js: could not parse const V');
  const version = String(Number.parseInt(match[1], 10) + 1);
  return {
    version,
    text: swText.replace(/const V = ["']ap-v\d+["']/, `const V = "ap-v${version}"`),
  };
}

function formatPrecache(entries) {
  return [
    '/* PRECACHE_BEGIN — generated by tools/generate-sw-precache.mjs */',
    "const PRECACHE_MODE = 'launch-shell';",
    'const PRECACHE = [',
    ...entries.map((entry) => `  '${entry}',`),
    '];',
    '/* PRECACHE_END */',
  ].join('\n');
}

function replacePrecache(swText, block) {
  const markers = /\/\* PRECACHE_BEGIN[\s\S]*?\/\* PRECACHE_END \*\//;
  if (!markers.test(swText)) throw new Error('sw.js: no generated PRECACHE marker block found');
  return swText.replace(markers, block);
}

function replaceAssetVersion(assetText, version) {
  const pattern = /(AP_ASSET_V\s*=\s*['"])(\d+)(['"])/g;
  const matches = [...assetText.matchAll(pattern)];
  if (matches.length !== 1) {
    throw new Error(`ap-asset-v.js: expected one AP_ASSET_V literal, found ${matches.length}`);
  }
  return assetText.replace(pattern, (_, prefix, _oldVersion, suffix) => `${prefix}${version}${suffix}`);
}

function assertReleaseQueries(version) {
  const conflicts = [];
  const target = Number.parseInt(version, 10);
  for (const page of RELEASE_PAGES) {
    const html = readFileSync(assertFile(page, 'release route'), 'utf8');
    for (const ref of tagAssetRefs(html)) {
      if (!/\.(?:css|js)(?:[?#]|$)/i.test(ref)) continue;
      const match = ref.match(/[?&]v=(\d+)(?:[&#]|$)/i);
      if (match && Number.parseInt(match[1], 10) > target) conflicts.push(`${page}: ${ref}`);
    }
  }
  if (conflicts.length) {
    throw new Error(
      `explicit route asset version(s) are newer than worker ${version}:\n${conflicts.join('\n')}`,
    );
  }
}

function assertWorkerShape(swText, version) {
  const end = swText.indexOf('/* PRECACHE_END */');
  if (end < 0) throw new Error('sw.js: PRECACHE_END marker missing after generation');
  const tail = swText.slice(end);
  const required = ['CORE', 'canonicalAssetKey'];
  const missing = required.filter(
    (id) => !new RegExp(`(?:^|\\n)\\s*(?:const|function)\\s+${id}\\b`).test(tail),
  );
  if (missing.length) {
    throw new Error(
      `sw.js would lose required definition(s): ${missing.join(', ')}. ` +
      'Definitions must remain below PRECACHE_END.',
    );
  }
  if (!swText.includes("const PRECACHE_MODE = 'launch-shell';")) {
    throw new Error('sw.js: generated launch-shell mode marker missing');
  }
  if (!swText.includes(`const V = "ap-v${version}"`)) {
    throw new Error(`sw.js: generated cache version is not ap-v${version}`);
  }
}

function writeBothOrRestore(originalSw, nextSw, originalAsset, nextAsset) {
  try {
    writeFileSync(ASSET_VERSION_PATH, nextAsset, 'utf8');
    writeFileSync(SW_PATH, nextSw, 'utf8');
    if (readFileSync(ASSET_VERSION_PATH, 'utf8') !== nextAsset || readFileSync(SW_PATH, 'utf8') !== nextSw) {
      throw new Error('post-write verification failed');
    }
  } catch (error) {
    try { writeFileSync(ASSET_VERSION_PATH, originalAsset, 'utf8'); } catch (_) {}
    try { writeFileSync(SW_PATH, originalSw, 'utf8'); } catch (_) {}
    throw error;
  }
}

function main() {
  const originalSw = readFileSync(SW_PATH, 'utf8');
  const originalAsset = readFileSync(ASSET_VERSION_PATH, 'utf8');
  const shell = collectLaunchShell();
  const bumped = bumpVersion(originalSw);

  assertReleaseQueries(bumped.version);
  const nextSw = replacePrecache(bumped.text, formatPrecache(shell.entries));
  const nextAsset = replaceAssetVersion(originalAsset, bumped.version);
  assertWorkerShape(nextSw, bumped.version);

  writeBothOrRestore(originalSw, nextSw, originalAsset, nextAsset);
  console.log(
    `sw.js + js/ap-asset-v.js updated — ap-v${bumped.version}, ` +
    `${shell.entries.length} launch-shell entries, ${shell.bytes} bytes`,
  );
}

main();
