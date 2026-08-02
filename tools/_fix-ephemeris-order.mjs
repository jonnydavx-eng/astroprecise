/* Fix: ensure js/ephemeris.js is loaded NON-deferred before the first
 * classic inline script that touches window.AstroEphemeris.
 * - Removes any existing ephemeris.js tag (deferred or later sync).
 * - Inserts a sync tag immediately before the first offending inline script.
 * - Reuses the page's own path style (./js/ vs js/).
 * Run from repo root: node tools/_fix-ephemeris-order.mjs
 */
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'website');
const files = readdirSync(root).filter(f => f.endsWith('.html'));

for (const f of files) {
  let html = readFileSync(join(root, f), 'utf8');
  const tagRe = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let m, ephTag = null, firstBadInline = -1;
  while ((m = tagRe.exec(html))) {
    const attrs = m[1] || '', body = m[2] || '';
    const src = (attrs.match(/src=["']([^"']+)["']/) || [])[1] || '';
    const isModule = /type=["']module["']/.test(attrs);
    const isJson = /application\/ld\+json/.test(attrs);
    const isDeferred = /\bdefer\b/.test(attrs) || isModule;
    if (src && /ephemeris\.js/.test(src) && !ephTag) {
      ephTag = { start: m.index, end: tagRe.lastIndex, src, deferred: isDeferred };
      if (!isDeferred) break; // already sync before anything — page is fine unless an inline came earlier
    }
    if (!src && !isJson && !isModule && /AstroEphemeris/.test(body) && !ephTag) {
      firstBadInline = m.index;
      break;
    }
    if (!src && !isJson && !isModule && /AstroEphemeris/.test(body) && ephTag && ephTag.deferred) {
      firstBadInline = m.index;
      break;
    }
  }
  if (firstBadInline === -1) continue;

  // Determine path style from existing tag or neighbours
  let ephSrc = ephTag ? ephTag.src : null;
  if (!ephSrc) {
    const anySrc = html.match(/<script src=["']([^"']*js\/)[^"']+["']/) || html.match(/<link[^>]+href=["']([^"']*js\/)/);
    ephSrc = anySrc && anySrc[1].startsWith('./') ? './js/ephemeris.js' : 'js/ephemeris.js';
  }
  // Remove existing ephemeris tag (re-scan since we mutate)
  if (ephTag) {
    html = html.slice(0, ephTag.start) + html.slice(ephTag.end);
    firstBadInline = html.search(/<script>(?![\s\S]*?<\/script>)/); // recompute below properly
    const re2 = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
    let mm;
    while ((mm = re2.exec(html))) {
      const a = mm[1] || '', b = mm[2] || '';
      if (!/src=/.test(a) && !/type=["']module["']/.test(a) && !/application\/ld\+json/.test(a) && /AstroEphemeris/.test(b)) { firstBadInline = mm.index; break; }
    }
  }
  const indent = (html.slice(0, firstBadInline).match(/([ \t]*)<script\b[^>]*>?[^<]*$/) || [])[1] || '';
  const insert = `${indent}<script src="${ephSrc}"></script>\n`;
  html = html.slice(0, firstBadInline) + insert + html.slice(firstBadInline);
  writeFileSync(join(root, f), html);
  console.log(`FIXED ${f} — sync ${ephSrc} before first AstroEphemeris inline (was: ${ephTag ? (ephTag.deferred ? 'deferred' : 'later sync') : 'none'})`);
}
console.log('done');
