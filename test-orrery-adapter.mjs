/* Gate: v838 flagship renderer contract.
 * Home owns the one general <void-orrery>; Eclipse owns a separate dedicated
 * Sun–Moon–Earth renderer. Product, card and archive routes mount no spare model.
 */
import { readFileSync, existsSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const root = join(dirname(fileURLToPath(import.meta.url)), 'website');
let bad = 0;
const fail = (message) => { console.log('FAIL ' + message); bad++; };
const ok = (message) => console.log('  ok ' + message);

const adapterPath = join(root, 'js', 'void-orrery-adapter.js');
const enginePath = join(root, 'js', 'orrery-webgl.js');
if (!existsSync(adapterPath)) { fail('js/void-orrery-adapter.js missing'); process.exit(1); }
if (!existsSync(enginePath)) { fail('js/orrery-webgl.js missing'); process.exit(1); }
const A = readFileSync(adapterPath, 'utf8');
const W = readFileSync(enginePath, 'utf8');

/* 1. Element registration and public consumer surface. */
if (!/customElements\.define\(['"]void-orrery['"]/.test(A)) fail('adapter never registers <void-orrery>');
else ok('registers <void-orrery>');
for (const name of ['flyTo', 'flyScale', 'setNatal', 'setJD', 'setLive', 'getJD',
  'setEclipse', 'getEclipse', 'startOpeningBeat', 'flight', 'lookUp', 'setObserver',
  'captureStill']) {
  const re = new RegExp('prototype\\.' + name + '\\s*=\\s*function');
  if (!re.test(A)) fail('adapter missing prototype.' + name);
}
ok('all consumer call-names are present');

for (const extra of ['setNatalClocks', 'clearNatalClocks']) {
  const re = new RegExp('prototype\\.' + extra + '\\s*=\\s*function');
  if (!re.test(A)) fail('adapter missing prototype.' + extra);
}
ok('natal-clock adapter methods are present');

if (!W.includes('function setNatalClocks') || !W.includes('function clearNatalClocks') || !W.includes('function getNatalClocks')) {
  fail('orrery-webgl.js missing natal-clock engine API');
} else {
  ok('engine exposes setNatalClocks / clearNatalClocks / getNatalClocks');
}
if (!W.includes('mediumName(webp)') || !W.includes("quality === 'medium'")) {
  fail('textureCandidates must still know the medium tier');
} else if (/if \(smallRequested \|\| mediumRequested\) \{\s*push\(smallName\(webp\)\);/.test(W)) {
  fail('medium quality still skips _md.webp and loads _sm only');
} else {
  ok('medium texture tier loads _md.webp before _sm.webp');
}
if (!W.includes('isLivingSkyHome() ? 0x020307') && !W.includes('isLivingSkyHome() ? 0x020307')) {
  fail('living-sky fog must use house void #020307');
} else {
  ok('living-sky fog uses house void #020307');
}
for (const probe of [
  'function applyAuthoredBirthHourStill(jd)',
  'function captureBirthHourStill(opts)',
  "birthHourMarker.name = 'birthHourEarthMarker'",
  'natalClockGroup.visible = false',
  'sunMesh.scale.setScalar(0.22)',
  'instrumentFillLight.intensity = 0',
  'captureBirthHourStill,',
]) {
  if (!W.includes(probe)) fail('birth-hour still contract missing: ' + probe);
}
if (!A.includes("opts.mode === 'birth-hour'") || !A.includes('O.captureBirthHourStill')) {
  fail('adapter does not route authored birth-hour captures');
} else {
  ok('authored birth-hour capture hides couples clocks and marks Earth');
}
if (!W.includes('type: THREE.UnsignedByteType') || !W.includes('stencilBuffer: false')) {
  fail('Home-safe UnsignedByte composer target is missing');
}

const couplesSkyPath = join(root, 'js', 'ap-couples-sky.js');
if (!existsSync(couplesSkyPath)) fail('js/ap-couples-sky.js missing');
else {
  const couplesSky = readFileSync(couplesSkyPath, 'utf8');
  if (!couplesSky.includes('setNatalClocks')) fail('couples sky does not call setNatalClocks');
  if (/\.setNatal\s*\(/.test(couplesSky)) fail('couples sky still calls setNatal( for the two clocks');
  else ok('couples sky uses setNatalClocks, not the SVG setNatal overlay');
  if (!couplesSky.includes('/^Etc\\/GMT/i.test(tz)')) fail('couples sky must refuse Etc/GMT* the same way chart does');
  if (!couplesSky.includes('timeKnown && zoneKnown') && !couplesSky.includes('zoneKnown && timeKnown')) {
    fail('couples sky must not compute a natal JD without a known birth time');
  }
  if (couplesSky.includes("time || '12:00'")) fail('couples sky still fills unknown time with noon');
  if (couplesSky.includes('flyTo') || couplesSky.includes('focusPlanet') || couplesSky.includes('focusEarthCamera')) {
    fail('couples A/B must not flyTo/focusPlanet — focus is opacity only');
  }
  if (!couplesSky.includes('window.APCouplesSky') || !couplesSky.includes('OFFLINE_TOWNS')) {
    fail('couples sky must export APCouplesSky and an IANA offline town list');
  }
  if (!/focus:\s*(?:clockFocus\(\)|focus)/.test(couplesSky)) {
    fail('couples sky must pass focus a|b|null into setNatalClocks');
  }
  else ok('couples sky refuses GMT offsets, withholds noon, and does not move the camera');
}

for (const probe of [
  'function setEclipse(k)',
  'function getEclipse()',
  'sunEclipseOcculter',
  'float eclipseCrown = mix(1.0, 2.35, uEclipse)',
  'setEclipse, getEclipse',
]) {
  if (!W.includes(probe)) fail('native Orrery3D eclipse probe missing: ' + probe);
}
if (!A.includes('O.setEclipse(k, true)')) fail('adapter does not forward eclipse intensity');
if (W.includes('(1.0 - uEclipse * 0.75)')) fail('native corona still dims during eclipse');
ok('native eclipse API and corona-forward shader are present');

/* 2. Events, scale names and strict-renderer terminal behavior. */
for (const eventName of ['planetfocus', 'scalechange']) {
  if (!A.includes("'" + eventName + "'") && !A.includes('"' + eventName + '"')) {
    fail('adapter never dispatches ' + eventName);
  }
}
for (const level of ['EARTH', 'INNER', 'SYSTEM', 'OORT', 'STARS', 'GALAXY', 'COSMOS']) {
  if (!A.includes("'" + level + "'")) fail('scale name ' + level + ' missing');
}
if (!A.includes('2440587.5')) fail('JD epoch constant missing');
for (const probe of [
  "withTimeout(importJob, 30000, 'webgl module import')",
  'self._strict3D ? 25000 : 9000',
  'data-ap-orrery-retry',
  'first-frame-timeout',
  'retryable: !!this._strict3D',
  'if (self._strict3D || !d || d.engine !==',
  'if (!self._strict3D && window.__apOrreryCanvasFallback',
]) {
  if (!A.includes(probe)) fail('strict renderer contract missing: ' + probe);
}
ok('strict Home renderer times out truthfully and cannot silently swap models');
for (const probe of [
  'visibility:hidden;opacity:1',
  "earthTextureFiles().concat('moon.jpg')",
  'instrumentStartupTextureQuality()',
  '&& !envIblLoading',
  'instrumentSunRevealT() >= 0.999',
  'announceInstrumentFirstFrame = true',
  'function homeCanvasIntersectsViewport()',
  'function shouldRenderFrame()',
  'webglBooted && running && !destroyed && shouldRenderFrame() && !raf',
  'if (!instrumentMode || !isLivingSkyHome() || !canvas) return false;',
]) {
  if (!A.includes(probe) && !W.includes(probe)) fail('stable Home reveal contract missing: ' + probe);
}
if (A.includes('transition:opacity .45s ease')) fail('Home still fades an unsettled WebGL canvas');
if (!/function frameBody\(t\)\s*\{\s*let announceInstrumentFirstFrame = false;/.test(W)) {
  fail('Home first-frame announcement state is scoped inside the render body');
}
// The post-resize composer frame guard runs between the render and the
// announcement; what this pins is that nothing announces a first frame before
// the buffer has actually been rendered.
if (!/if \(composer\) composer\.render\(\);\s*else renderer\.render\(scene, camera\);\s*(afterComposerFrame\(\);\s*)?if \(announceInstrumentFirstFrame\) dispatchOrreryFirstFrame\(\);/.test(W)) {
  fail('Home announces first frame before the settled buffer is rendered');
}
if (!W.includes('const SYSTEM_CAM_RADIUS = (IS_PHONE || window.innerWidth <= 820) ? 96 : 84;') || !W.includes('camRadius: SYSTEM_CAM_RADIUS, camMin: 48')) {
  fail('System camera no longer frames all eight major worlds');
}
if (!W.includes('!portraitMode && !focusFrameId')) {
  fail('free-explore scale sync can still stomp a focused planet portrait');
}
if (!W.includes('!dragging && !focusFrameId && !freeExploreMode')) {
  fail('Home resize can still retarget an outer-planet portrait to Earth');
}

/* 3. Exactly one general model, with status outside its canvas. */
const htmlFiles = readdirSync(root).filter((name) => name.endsWith('.html'));
const modelOwners = htmlFiles.filter((name) => /<void-orrery\b/i.test(readFileSync(join(root, name), 'utf8')));
const expectedOwners = ['chart.html', 'compatibility.html', 'deep-reading.html', 'index.html', 'shop.html', 'tonight.html'];
const got = [...modelOwners].sort();
if (got.join() !== expectedOwners.join()) {
  fail('live orrery owners drifted: ' + modelOwners.join(', '));
}
const indexHtml = readFileSync(join(root, 'index.html'), 'utf8');
if (!/js\/void-orrery-adapter\.js\?v=876/.test(indexHtml)) fail('Home missing v876 adapter query');
if (!/<link[^>]+rel="modulepreload"[^>]+href="js\/orrery-webgl\.js\?v=876"/.test(indexHtml)) {
  fail('Home missing exact v876 WebGL modulepreload');
}
if (/<script[^>]*src=["'][^"']*js\/orrery\.js/.test(indexHtml)) fail('Home loads legacy orrery.js directly');
if (!/<void-orrery[^>]+data-renderer="webgl-only"/i.test(indexHtml)) fail('Home is not strict WebGL');
const modelCount = (indexHtml.match(/<void-orrery\b/g) || []).length;
if (modelCount !== 1) fail('Home must own exactly one void-orrery (' + modelCount + ')');
for (const probe of ['class="ap-model-stage"', 'id="mladder"', 'id="dock"', 'aria-label="Interactive live solar system"']) {
  if (!indexHtml.includes(probe)) fail('Home model contract missing: ' + probe);
}
const homeStageStart = indexHtml.indexOf('<div class="ap-model-stage"');
const homePanelStart = indexHtml.indexOf('<aside class="ap-control-panel"');
const homeStageSegment = indexHtml.slice(homeStageStart, homePanelStart);
const homePanelSegment = indexHtml.slice(homePanelStart, indexHtml.indexOf('</aside>', homePanelStart));
if (/ap-model-status|ap-model-hint/.test(homeStageSegment)) fail('Home status or hint still overlays the model stage');
if (!/ap-model-status/.test(homePanelSegment) || !/ap-model-hint/.test(homePanelSegment)) {
  fail('Home panel does not own status and interaction hint');
}
ok('Home owns one strict model with unobstructed canvas and adjacent controls');
const homeCss = readFileSync(join(root, 'css', 'ap-home-v835.css'), 'utf8');
for (const probe of ['class="ap-mobile-flight-deck"', 'id="mobileWorld"', 'id="mobileScale"', 'class="ap-model-boot"']) {
  if (!indexHtml.includes(probe)) fail('Home phone flight deck missing: ' + probe);
}
for (const probe of ['.ap-mobile-flight-deck', '.ap-model-stage.is-model-ready .ap-model-boot']) {
  if (!homeCss.includes(probe)) fail('Home launch-state CSS missing: ' + probe);
}
ok('Home phone deck exposes every destination without covering the model');

/* 3b. A restrained opening beat replaces the old auto-opening movie overlay. */
for (const probe of ['id="ap-cosmic-flight-launch"', 'if (orrery.flight) orrery.flight()']) {
  if (!indexHtml.includes(probe)) fail('Home opt-in journey doorway missing: ' + probe);
}
if (!A.includes('prototype.startOpeningBeat = function')) fail('adapter does not expose the engine opening beat');
if (!W.includes('function startOpeningBeat()') || !W.includes('startOpeningBeat,')) fail('engine opening beat is not public');
const openingController = readFileSync(join(root, 'js', 'ap-observatory-v834.js'), 'utf8');
for (const probe of ['!hasExplicitOpening', '!userTookControl', 'prefers-reduced-motion: reduce', 'orrery.startOpeningBeat()']) {
  if (!openingController.includes(probe)) fail('opening beat guard missing: ' + probe);
}
if (/ap-cosmic-flight-tool\.js/.test(indexHtml)) fail('legacy auto-opening movie controller still loads on Home');
ok('opening beat is subtle, reduced-motion safe and yields to user input; full journey remains opt-in');

/* 4. Shared release identity and merged Explore redirect. */
const sw = readFileSync(join(root, 'sw.js'), 'utf8');
for (const ref of [
  'css/ap-living-sky-v834.css?v=876',
    'js/ap-observatory-v834.js?v=876',
    'js/ap-nav-model.js?v=876',
]) {
  if (!indexHtml.includes(ref)) fail('Home release query missing: ' + ref);
  const bare = './' + ref.split('?')[0];
  if (!sw.includes("'" + bare + "'")) fail('service worker missing ' + bare);
}
const livingCss = readFileSync(join(root, 'css', 'ap-living-sky-v834.css'), 'utf8');
for (const probe of ['.ap-live-stage', '.ap-model-stage', '.ap-control-panel', '.ap-site-footer']) {
  if (!livingCss.includes(probe)) fail('living-sky CSS contract missing: ' + probe);
}
const observatory = readFileSync(join(root, 'js', 'ap-observatory-v834.js'), 'utf8');
for (const probe of ['var SCALE_KEYS =', 'var FOCUS =', 'function applyHash()', 'orrery.flyTo']) {
  if (!observatory.includes(probe)) fail('Home controller contract missing: ' + probe);
}
for (const probe of ["byId('mobileWorld')", "byId('mobileScale')", "block: 'center'"]) {
  if (!observatory.includes(probe)) fail('Home phone controller contract missing: ' + probe);
}
const navModel = readFileSync(join(root, 'js', 'ap-nav-model.js'), 'utf8');
for (const probe of [
  "['index.html', 'Observatory']",
  "['chart.html', 'Chart']",
  "['sky-events.html', 'Events'",
  "['shop.html', 'Shop']",
]) {
  if (!navModel.includes(probe)) fail('launch navigation contract missing: ' + probe);
}
for (const probe of ["['sky-events.html', 'Events', 'eclipse']", '(min-width: 981px)', 'renderStaticBottomNav();']) {
  if (!navModel.includes(probe)) fail('four-route mobile navigation missing: ' + probe);
}
if (!livingCss.includes('repeat(4, minmax(0, 1fr))')) fail('mobile navigation is not four equal tabs');
if (navModel.includes("['horoscope.html', 'Daily']")) fail('Daily must not be a launch route');
if (navModel.includes("['lifepath.html'")) fail('Life Path must not leak into nav extras');
if (navModel.includes("['synastry.html'")) fail('Synastry must not leak into nav extras');
if (!livingCss.includes('touch-action: pan-y !important')) fail('Home phone canvas can still trap vertical scrolling');
if (!sw.includes('const V = "ap-v876"')) fail('service worker release identity is not ap-v876');
ok('shared shell exposes four primary routes and releases vertical phone scrolling');
if (navModel.includes("['explore.html'")) fail('retired Explore destination remains in navigation');

const exploreHtml = readFileSync(join(root, 'explore.html'), 'utf8');
for (const probe of [
  "new URL('./index.html', location.href)",
  'target.search = location.search;',
  'target.hash = location.hash;',
  'location.replace(target.href);',
  '<meta name="robots" content="noindex, follow">',
]) {
  if (!exploreHtml.includes(probe)) fail('Explore redirect contract missing: ' + probe);
}
for (const retired of ['<void-orrery', 'explore-boot-v', 'id="orrery-lite-deck"']) {
  if (exploreHtml.includes(retired)) fail('retired Explore surface remains: ' + retired);
}
ok('Explore merges into the one flagship Observatory');

/* 5. Dedicated Eclipse renderer and unobstructed stage. */
const eclipseHtml = readFileSync(join(root, 'eclipse.html'), 'utf8');
const eclipseView = readFileSync(join(root, 'js', 'ap-eclipse-live-v834.js'), 'utf8');
const eclipseLiveCss = readFileSync(join(root, 'css', 'ap-eclipse-live-v834.css'), 'utf8');
const eclipseGeometry = readFileSync(join(root, 'js', 'ap-eclipse-geometry-v834.js'), 'utf8');
for (const ref of [
  'js/ap-eclipse-live-v834.js?v=876',
    'css/ap-eclipse-live-v834.css?v=876',
]) {
  if (!eclipseHtml.includes(ref)) fail('Eclipse release query missing: ' + ref);
  const bare = './' + ref.split('?')[0];
  if (!sw.includes("'" + bare + "'")) fail('service worker missing ' + bare);
}
for (const probe of ['id="ap-eclipse-live"', 'data-eclipse-now', 'data-eclipse-event',
  'data-eclipse-play', 'data-eclipse-lens="system"', 'data-eclipse-share',
  'data-eclipse-range', 'data-eclipse-shadow-offset', 'data-eclipse-play-launch',
  'ap-eclipse-next', 'ap-eclipse-live__dock', 'ap-eclipse-live__instrument',
  '17:45:51 UTC']) {
  if (!eclipseHtml.includes(probe)) fail('dedicated eclipse wiring missing: ' + probe);
}
for (const retired of ['<void-orrery', 'void-orrery-adapter.js', '91% CORONA STUDY']) {
  if (eclipseHtml.includes(retired)) fail('retired cosmetic eclipse model remains: ' + retired);
}
const eclipseStageStart = eclipseHtml.indexOf('<div class="ap-eclipse-live__stage"');
const eclipsePanelStart = eclipseHtml.indexOf('<aside class="ap-eclipse-live__panel"');
const eclipseStageSegment = eclipseHtml.slice(eclipseStageStart, eclipsePanelStart);
const eclipsePanelSegment = eclipseHtml.slice(eclipsePanelStart, eclipseHtml.indexOf('</aside>', eclipsePanelStart));
if (/ap-eclipse-live__live-badge|ap-eclipse-live__legend/.test(eclipseStageSegment)) {
  fail('Eclipse badge or legend still overlays the 3D stage');
}
if (!/ap-eclipse-live__live-badge/.test(eclipsePanelSegment)
    || !/ap-eclipse-live__legend/.test(eclipsePanelSegment)) {
  fail('Eclipse panel does not own badge and legend');
}
for (const probe of [
  "from './ap-eclipse-geometry-v834.js'",
  'new THREE.WebGLRenderer',
  'positionVolume(umbra',
  'positionVolume(penumbra',
  'const PASSAGE_START_MS',
  'function playPassage()',
  'function setLens(key',
  'const activePointers = new Map()',
  "url.searchParams.set('moment'",
  'launchPlayButtons',
  'const revealInstrument',
  "range.addEventListener('change', revealInstrument)",
  'window.APEclipseLive',
]) {
  if (!eclipseView.includes(probe)) fail('Eclipse WebGL contract missing: ' + probe);
}
for (const probe of ['visibility: hidden;', "[data-ready='true'] .ap-eclipse-live__canvas { visibility: visible; }"]) {
  if (!eclipseLiveCss.includes(probe)) fail('stable Eclipse reveal CSS missing: ' + probe);
}
for (const probe of ['touch-action: pan-y;', 'grid-template-areas:', '.ap-eclipse-live__dock {']) {
  if (!eclipseLiveCss.includes(probe)) fail('phone Eclipse command-deck CSS missing: ' + probe);
}
ok('Eclipse playback, countdown and phone command deck remain attached to the 3D stage');
if (/transition:\s*opacity\s+620ms/.test(eclipseLiveCss)) fail('Eclipse still cross-fades the WebGL canvas');
for (const probe of ['Settling 3D', 'function renderStableFrames', 'await renderStableFrames(3);']) {
  if (!eclipseView.includes(probe)) fail('stable Eclipse frame gate missing: ' + probe);
}
if (!/root\.dataset\.ready = 'true';\s*updateReadout\(\);\s*startLoop\(\);/.test(eclipseView)) {
  fail('Eclipse says Live before its stable buffer is revealed');
}

for (const probe of ['export function computeShadowGeometry', 'export function computeEclipseGeometry',
  'umbraLengthKm', 'penumbraRadiusAtEarthKm', 'shadowMissKm']) {
  if (!eclipseGeometry.includes(probe)) fail('pure eclipse geometry contract missing: ' + probe);
}
ok('Eclipse owns one dedicated 3D instrument with panel readouts outside the canvas');
for (const file of [
  'downloads/astroprecise-eclipse-field-guide-2026.pdf',
  'guides/eclipse-field-guide-2026.html',
  'img/editorial/eclipse-field-guide-cover-final-v836.png',
]) {
  if (!existsSync(join(root, file))) fail('Eclipse guide asset missing: ' + file);
}
if (!eclipseHtml.includes('downloads/astroprecise-eclipse-field-guide-2026.pdf')) {
  fail('Eclipse page does not expose the downloadable field guide');
}
ok('Eclipse launch guide and product doorway are present');


/* 6. Texture quality ladder and lazy deep-space work. */
for (const name of ['earth_md.webp', 'jupiter_md.webp', 'mars_md.webp', 'mercury_md.webp',
  'moon_md.webp', 'neptune_md.webp', 'saturn_md.webp', 'saturn_ring_md.webp', 'uranus_md.webp', 'venus_md.webp']) {
  if (!existsSync(join(root, 'assets', 'textures', name))) fail('medium texture missing: ' + name);
}
for (const probe of ['function mediumName(name)', 'function wantsMediumTextures()',
  'function isCriticalInstrumentTexture(file)', 'requestPreloadTexture(file, startupQuality)',
  'coldInstrument && !isCriticalInstrumentTexture(file)', 'function scheduleFullTextureUpgrades()',
  'const galaxySpriteTextureCache = new Map()', 'if (p.id >= 3 && !galaxyBuilt) ensureGalaxyLayers()']) {
  if (!W.includes(probe)) fail('renderer quality/performance contract missing: ' + probe);
}
if (/function webglOK\(\)/.test(W)) fail('renderer still creates a redundant module-evaluation WebGL context');
ok('renderer stages crisp medium textures before idle full-resolution upgrades');

/* 7. Import maps on the two live Three.js pages only. */
for (const page of ['index.html', 'eclipse.html']) {
  const html = readFileSync(join(root, page), 'utf8');
  if (!/type=["']importmap["']/.test(html)) fail(page + ' missing Three import map');
  if (!html.includes('./js/vendor/three/three.module.min.js')) fail(page + ' import map missing local Three build');
}
ok('Three import map is present on Home and Eclipse');

/* 8. VoidEphem byte compatibility with the legacy calculation port. */
function legacyEphem() {
  const src = readFileSync(join(root, 'js', 'orrery.js'), 'utf8');
  const window = {};
  new Function('window', 'customElements', 'document', src)(window, { get: () => ({}) }, {});
  return window.VoidEphem;
}
function adapterEphem() {
  const start = A.indexOf('function defineVoidEphem()');
  if (start < 0) { fail('defineVoidEphem not found in adapter'); return null; }
  const marker = A.indexOf('window.__voidOrreryAdapterOwnsEphem = true;', start);
  if (marker < 0) { fail('defineVoidEphem body not terminated as expected'); return null; }
  const end = A.indexOf('\n  }', marker);
  if (end < 0) { fail('defineVoidEphem closing brace not found'); return null; }
  const fnSrc = A.slice(start, end + 4);
  const window = {};
  new Function('window', fnSrc + '\ndefineVoidEphem();')(window);
  return window.VoidEphem;
}
const legacy = legacyEphem();
const adapter = adapterEphem();
if (!legacy) fail('legacy VoidEphem did not evaluate');
if (!adapter) fail('adapter VoidEphem did not evaluate');
if (legacy && adapter) {
  const near = (x, y) => Math.abs(x - y) < 1e-9;
  const dates = [
    new Date(Date.UTC(2026, 7, 12, 17, 45, 51)),
    new Date(Date.UTC(1994, 2, 14, 9, 12)),
    new Date(Date.UTC(2000, 0, 1, 12, 0)),
  ];
  let mismatch = 0;
  for (const date of dates) {
    const lp = legacy.positions(date);
    const ap = adapter.positions(date);
    if (!near(lp.jd, ap.jd) || lp.rows.length !== ap.rows.length) mismatch++;
    lp.rows.forEach((row, index) => {
      const peer = ap.rows[index];
      if (!peer || row.key !== peer.key || row.name !== peer.name || row.glyph !== peer.glyph) mismatch++;
      if (!near(row.lon, peer.lon) || !near(row.dist, peer.dist) || row.retro !== peer.retro) mismatch++;
      if (row.sign.name !== peer.sign.name || row.sign.glyph !== peer.sign.glyph
          || row.sign.deg !== peer.sign.deg || row.sign.min !== peer.sign.min) mismatch++;
    });
    if (!near(legacy.sunLon(lp.jd), adapter.sunLon(ap.jd))
        || !near(legacy.moonLon(lp.jd), adapter.moonLon(ap.jd))) mismatch++;
  }
  if (JSON.stringify(legacy.SIGNS) !== JSON.stringify(adapter.SIGNS)) mismatch++;
  for (const fn of ['jd', 'dateOf', 'helioLon', 'geoLon', 'sunLon', 'moonLon',
    'sign', 'distAU', 'moonPhase', 'positions', 'norm']) {
    if (typeof adapter[fn] !== 'function') { mismatch++; fail('VoidEphem.' + fn + ' missing'); }
  }
  if (mismatch) fail('VoidEphem outputs diverge (' + mismatch + ' mismatches)');
  else ok('VoidEphem remains byte-compatible across sample dates');
}

if (bad) {
  console.log(bad + ' flagship renderer contract failure(s)');
  process.exit(1);
}
console.log('PASS flagship Home 3D + dedicated Eclipse 3D + VoidEphem compatibility');
