/* Gate: M2 <void-orrery> adapter contract.
 * The adapter (website/js/void-orrery-adapter.js) replaces js/orrery.js on every
 * <void-orrery> page. This test pins, at grep level and by direct evaluation:
 *   1. the exact public surface every consumer calls (flyTo/flyScale/setNatal/
 *      setJD/setLive/getJD/setEclipse/getEclipse/flight/lookUp/setObserver);
 *   2. the legacy event names + detail shapes (planetfocus {key,name,glyph},
 *      scalechange {level}) and the seven scale names EARTH…COSMOS;
 *   3. the fail-open ladder: ?engine=legacy, js/orrery.js legacy injection,
 *      js/orrery-loader.js boot path, js/orrery3d.js canvas fail-open;
 *   4. every page that used to load js/orrery.js now loads the adapter, and the
 *      three pages with a live <void-orrery> carry the three import map;
 *   5. window.VoidEphem is byte-compatible: the adapter's port is evaluated
 *      alongside legacy orrery.js and outputs are compared numerically.
 */
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const root = join(dirname(fileURLToPath(import.meta.url)), 'website');
let bad = 0;
const fail = (m) => { console.log('FAIL ' + m); bad++; };
const ok = (m) => console.log('  ok ' + m);

const adapterPath = join(root, 'js', 'void-orrery-adapter.js');
if (!existsSync(adapterPath)) { fail('js/void-orrery-adapter.js missing'); process.exit(1); }
const A = readFileSync(adapterPath, 'utf8');

/* ── 1. element registration + public surface ── */
if (!/customElements\.define\(['"]void-orrery['"]/.test(A)) fail('adapter never registers <void-orrery>');
else ok('registers <void-orrery>');
for (const name of ['flyTo', 'flyScale', 'setNatal', 'setJD', 'setLive', 'getJD',
  'setEclipse', 'getEclipse', 'flight', 'lookUp', 'setObserver']) {
  const re = new RegExp('prototype\\.' + name + '\\s*=\\s*function');
  if (!re.test(A)) fail(`adapter missing prototype.${name}`);
}
ok('all 11 consumer call-names present on the element prototype');

/* ── 2. events + scale names ── */
for (const ev of ['planetfocus', 'scalechange']) {
  if (!A.includes(`'${ev}'`) && !A.includes(`"${ev}"`)) fail(`adapter never dispatches ${ev}`);
}
for (const lv of ['EARTH', 'INNER', 'SYSTEM', 'OORT', 'STARS', 'GALAXY', 'COSMOS']) {
  if (!A.includes(`'${lv}'`)) fail(`scale name ${lv} missing`);
}
if (!A.includes('2440587.5')) fail('JD epoch constant 2440587.5 missing (jd/dateOf contract)');
ok('events, 7 scale names, JD epoch present');

/* ── 3. fallback ladder ── */
for (const probe of ['engine=legacy', 'orrery.js', 'orrery-loader.js', 'orrery3d.js',
  'window.VoidEphem', 'importmap', 'webgl2']) {
  if (!A.includes(probe)) fail(`fallback probe ${probe} missing`);
}
ok('legacy param, legacy/canvas fallbacks, VoidEphem, import map, WebGL2 probe present');

/* ── 4. page wiring ── */
const pages = ['index.html', 'deep-time.html', 'eclipse.html', 'sky-card.html', 'sky-events.html', 'natal-plate.html'];
for (const p of pages) {
  const html = readFileSync(join(root, p), 'utf8');
  if (!html.includes('js/void-orrery-adapter.js')) fail(`${p} does not load the adapter`);
  if (/<script[^>]*src=["'][^"']*js\/orrery\.js/.test(html)) fail(`${p} still loads js/orrery.js directly`);
}
ok('all six former orrery.js pages load the adapter');
for (const p of ['index.html', 'deep-time.html', 'eclipse.html']) {
  const html = readFileSync(join(root, p), 'utf8');
  if (!/type=["']importmap["']/.test(html)) fail(`${p} missing the three import map`);
  if (!html.includes('./js/vendor/three/three.module.min.js')) fail(`${p} import map missing local three build`);
}
ok('three import map on the three live-element pages');

/* ── 5. VoidEphem byte-compat: evaluate both, compare ── */
function legacyEphem() {
  const src = readFileSync(join(root, 'js', 'orrery.js'), 'utf8');
  const window = {};
  // line 3 `if (window.VoidEphem) return` is false; line 61 customElements guard returns early
  new Function('window', 'customElements', 'document', src)(window, { get: () => ({}) }, {});
  return window.VoidEphem;
}
function adapterEphem() {
  const a = A.indexOf('function defineVoidEphem()');
  if (a < 0) { fail('defineVoidEphem not found in adapter'); return null; }
  const b = A.indexOf('window.__voidOrreryAdapterOwnsEphem = true;', a);
  if (b < 0) { fail('defineVoidEphem body not terminated as expected'); return null; }
  const end = A.indexOf('\n  }', b);
  if (end < 0) { fail('defineVoidEphem closing brace not found'); return null; }
  const fnSrc = A.slice(a, end + 4);
  const window = {};
  new Function('window', fnSrc + '\ndefineVoidEphem();')(window);
  return window.VoidEphem;
}
const LE = legacyEphem();
const AE = adapterEphem();
if (!LE) fail('legacy VoidEphem did not evaluate');
if (!AE) fail('adapter VoidEphem did not evaluate');
if (LE && AE) {
  const near = (x, y) => Math.abs(x - y) < 1e-9;
  const dates = [new Date(Date.UTC(2026, 7, 12, 17, 46)), new Date(Date.UTC(1994, 2, 14, 9, 12)), new Date(Date.UTC(2000, 0, 1, 12, 0))];
  let cmpBad = 0;
  for (const d of dates) {
    const lp = LE.positions(d), ap = AE.positions(d);
    if (!near(lp.jd, ap.jd)) cmpBad++;
    if (lp.rows.length !== ap.rows.length) cmpBad++;
    lp.rows.forEach((r, i) => {
      const q = ap.rows[i];
      if (!q || r.key !== q.key || r.name !== q.name || r.glyph !== q.glyph) cmpBad++;
      if (!near(r.lon, q.lon) || !near(r.dist, q.dist) || r.retro !== q.retro) cmpBad++;
      if (r.sign.name !== q.sign.name || r.sign.glyph !== q.sign.glyph || r.sign.deg !== q.sign.deg || r.sign.min !== q.sign.min) cmpBad++;
    });
    const lm = lp.moon, am = ap.moon;
    if (lm.name !== am.name || !near(lm.age, am.age) || !near(lm.illum, am.illum) || !near(lm.daysToFull, am.daysToFull)) cmpBad++;
    if (!near(LE.sunLon(lp.jd), AE.sunLon(ap.jd)) || !near(LE.moonLon(lp.jd), AE.moonLon(ap.jd))) cmpBad++;
  }
  if (JSON.stringify(LE.SIGNS) !== JSON.stringify(AE.SIGNS)) { cmpBad++; fail('SIGNS glyph table differs (text-presentation selector byte drift?)'); }
  if (JSON.stringify(LE.PLANETS.map((p) => p.key)) !== JSON.stringify(AE.PLANETS.map((p) => p.key))) cmpBad++;
  for (const fn of ['jd', 'dateOf', 'helioLon', 'geoLon', 'sunLon', 'moonLon', 'sign', 'distAU', 'moonPhase', 'positions', 'norm']) {
    if (typeof AE[fn] !== 'function') { cmpBad++; fail(`VoidEphem.${fn} missing on adapter`); }
  }
  if (cmpBad) fail(`VoidEphem outputs diverge (${cmpBad} mismatches)`);
  else ok('VoidEphem byte-compatible across sample dates (positions, moon, signs, glyphs)');
}

if (bad) { console.log(`${bad} adapter contract failure(s)`); process.exit(1); }
console.log('PASS void-orrery adapter contract + VoidEphem byte-compat');
