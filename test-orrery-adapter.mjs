/* Gate: flagship renderer and guided-journey ownership contract.
 * Observatory owns the one general <void-orrery>; Eclipse owns a separate
 * Sun–Moon–Earth renderer. Home, chart and keepsake routes need no WebGL model.
 */
import { readFileSync, existsSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { runInNewContext } from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), 'website');
const swIdentity = readFileSync(join(root, 'sw.js'), 'utf8');
const tipNum = (swIdentity.match(/const V = "ap-v(\d+)"/) || [])[1];
let bad = 0;
const fail = (message) => { console.log('FAIL ' + message); bad++; };
const ok = (message) => console.log('  ok ' + message);

const adapterPath = join(root, 'js', 'void-orrery-adapter.js');
const enginePath = join(root, 'js', 'orrery-webgl.js');
if (!existsSync(adapterPath)) { fail('js/void-orrery-adapter.js missing'); process.exit(1); }
if (!existsSync(enginePath)) { fail('js/orrery-webgl.js missing'); process.exit(1); }
const A = readFileSync(adapterPath, 'utf8');
const W = readFileSync(enginePath, 'utf8');
const skyTime = readFileSync(join(root, 'js', 'ap-sky-time.js'), 'utf8');
const observatoryControls = readFileSync(join(root, 'js', 'ap-observatory-controls-v835.js'), 'utf8');

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
if (!W.includes('const COOL_LUNAR_VOID = 0x040812')) {
  fail('Midnight Meridian void constant #040812 missing');
} else if (!W.includes('isLivingSkyHome() ? COOL_LUNAR_VOID')) {
  fail('living-sky fog must use Midnight Meridian void #040812');
} else {
  ok('living-sky fog uses Midnight Meridian void #040812');
}

/* House chrome: engine reads lunar tokens with fallbacks that work on Home.
 * Home loads ap-living-sky-v834.css (not ap-palette-2026), so --ap-lunar-void
 * may be missing; --ap-void / --ap-brass are instrument silver on that sheet. */
if (!W.includes("houseTokenHex(['--ap-lunar-void', '--ap-void', '--ap-void-deep']")) {
  fail('cool lunar void must fall through --ap-lunar-void → --ap-void → --ap-void-deep');
}
if (!W.includes('const HOUSE_ION = 0x8BA9FF') || !W.includes('const HOUSE_ION_HOVER = 0xA5BCFF')
    || !W.includes('const HOUSE_VIOLET = 0xA897FF') || !W.includes('const HOUSE_SILVER = 0x93A8BF')
    || !W.includes('const HOUSE_SILVER_BRIGHT = 0xC9D6E3') || !W.includes('const HOUSE_EMBER = HOUSE_VIOLET')) {
  fail('Midnight Meridian ion / violet / instrument-silver constants missing');
}
if (!W.includes("houseTokenHex(['--ap-silver', '--ap-brass'], HOUSE_SILVER)")
    || !W.includes("houseTokenHex(['--ap-violet', '--ap-ember', '--ap-ion'], NATAL_CLOCK_B)")) {
  fail('natal clocks / chrome must prefer the modern silver / violet tokens with legacy fallbacks');
}
for (const retired of ['0xC2A05E', '0xD8B46A', '0xCDAE6A', '0xD8B978', '0xB86B4A', '#d8b46a', '#D8B46A', '#C2A05E']) {
  if (W.includes(retired)) fail('engine chrome still hardcodes retired engraved brass ' + retired);
}
if (W.includes('vec3(1.02, 1.005, 0.982)')) {
  fail('finish grade still tints highlights engraved brass');
}
if (!W.includes('vec3(0.988, 1.004, 1.018)') || !W.includes('instrument-silver highlights')) {
  fail('finish grade must tint highlights instrument silver');
}
if (W.includes('vec3(0.72, 0.58, 0.22)') || W.includes('vec3(0.98, 0.84, 0.42)')) {
  fail('orbit rails still paint engraved-gold mid/bright stops');
}
if (!W.includes('vec3(0.576, 0.659, 0.749)') || !W.includes('vec3(0.788, 0.839, 0.890)')) {
  fail('orbit rails must paint instrument silver #93A8BF / #C9D6E3');
}
ok('WebGL chrome paint reads house tokens and has no retired engraved-brass hexes');
if (!W.includes('new THREE.PointLight(0xf2f7ff') || !W.includes('new THREE.DirectionalLight(0xeef4ff')) {
  fail('Earth/planet lighting must use neutral #F2F7FF / #EEF4FF sunlight');
}
if (W.includes('vec3( 0.55, 0.22, 0.08 )') || W.includes('vec3( 0.95, 0.38, 0.10 ) * duskBand')) {
  fail('Earth shader still contains a broad artificial orange surface/emissive dusk wash');
}
if (!W.includes('vec3 cityCol = emissiveColor.rgb * vec3( 1.0, 0.68, 0.32 )')
    || !W.includes('totalEmissiveRadiance = cityCol * nightMask')) {
  fail('real warm city-light pinpoints must remain texture-gated on Earth\'s night side');
}
if (!W.includes('float termBand = pow(clamp(1.0 - abs(ndl) * 18.0')
    || !W.includes('vec3 indigo   = vec3(0.35, 0.30, 0.96)')
    || !W.includes('vec3 rose     = vec3(0.78, 0.36, 0.52)')) {
  fail('Earth atmosphere must be cyan/indigo with a razor-thin rose terminator');
}
ok('Earth keeps real surface/city colour under neutral light and a narrow cool atmosphere');
for (const retired of ['rgba(216,180,106', 'rgba(255,100,40', '#ff6428', '#d8b46a']) {
  if (A.includes(retired) || skyTime.includes(retired) || observatoryControls.includes(retired)) {
    fail('runtime UI still contains retired orange/brass accent ' + retired);
  }
}
if (!A.includes('rgba(139,169,255,.14)') || !A.includes('rgba(168,151,255,.10)')
    || !A.includes('color:#a5bcff') || !A.includes("fill:rgba(168,151,255,.92)")) {
  fail('adapter poster and natal overlay must use ion / hover / violet accents');
}
if (!skyTime.includes("dawn:  { label: 'DAWN',  nebula: 'rgba(139,169,255,.055)', aurora: 'rgba(168,151,255,.050)' }")
    || !skyTime.includes("dusk:  { label: 'DUSK',  nebula: 'rgba(168,151,255,.050)', aurora: 'rgba(139,169,255,.050)' }")) {
  fail('local sky dayparts must stay within the cool ion/violet palette');
}
if (!observatoryControls.includes("world[2] || '#8BA9FF'")) {
  fail('System control must use ion blue while preserving individual planet colours');
}
ok('adapter poster, daypart ambience and System control use Midnight Meridian accents');
if (!W.includes('function fitEarthTerminatorFrame(') ||
    !W.includes('const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * aspect)') ||
    !W.includes('fitEarthTerminatorFrame(0.78, 6 * D2R, fitOptions)') ||
    !W.includes('const earthScale = meshes.earth.scale') ||
    !W.includes('_camOff.normalize().multiplyScalar(radius)') ||
    !W.includes('applyEarthLimbHold,')) {
  fail('Earth limb hold must solve a public, aspect-aware complete-globe frame');
}
const earthFitStart = W.indexOf('function fitEarthTerminatorFrame(');
const earthFitEnd = W.indexOf('function syncEarthSittingBodyVisibility', earthFitStart);
const earthFitBody = earthFitStart >= 0 && earthFitEnd > earthFitStart
  ? W.slice(earthFitStart, earthFitEnd)
  : '';
if (!W.includes('const earthFitCache = {') || !W.includes('function invalidateEarthFitCache()')
    || !W.includes('const fitOptions = { refit: true, aspect: fittedAspect }')) {
  fail('Earth limb fit must cache its solve and refit from resize-owned aspect data');
}
if (earthFitBody.includes('getBoundingClientRect()')) {
  fail('idle Earth limb fit still forces a DOM layout read');
}
if (!earthFitBody.includes('if (camera.fov !== CAM_FOV_CLOSE)')
    || !earthFitBody.includes('setEarthTerminatorCamera(earthFitCache.distance, elevRad)')) {
  fail('Earth hold must reuse projection/distance while retaining live sun-relative direction');
}
if (!W.includes('syncEarthSittingBodyVisibility') || !W.includes("const sitting = focusFrameId === 'earth'")) {
  fail('Earth sitting must hide outer worlds that peek in wide bands');
}
if (!W.includes("const earthStart = selectedPlanetId === 'earth'") || !A.includes('O.applyEarthLimbHold()')) {
  fail('Earth-start must snap limb + earth-only texture gate');
}
if (W.includes('setEarthTerminatorCamera(2.18, 6 * D2R)') ||
    W.includes('setEarthTerminatorCamera(2.8, 6 * D2R)') ||
    W.includes('setEarthTerminatorCamera(2.05, 6 * D2R)')) {
  fail('Earth limb hold still uses a fixed crop-prone camera radius');
}
if (!W.includes('function clampCamElevation(el)') || !W.includes('const CAM_EL_DRAG_MIN')) {
  fail('drag elevation clamp missing');
} else {
  ok('drag elevation clamp keeps the view above the ecliptic');
}
for (const probe of [
  'function applyAuthoredBirthHourStill(jd)',
  'function captureBirthHourStill(opts)',
  "birthHourMarker.name = 'birthHourEarthMarker'",
  'natalClockGroup.visible = false',
  'sunMesh.scale.setScalar(0.22)',
  'instrumentFillLight.intensity = 0',
  'captureBirthHourStill,',
  "ctx.fillText('EARTH'",
  'birthHourMarker.scale.set(16.5, 8.25, 1)',
]) {
  if (!W.includes(probe)) fail('birth-hour still contract missing: ' + probe);
}
if (!A.includes("opts.mode === 'birth-hour'") || !A.includes('O.captureBirthHourStill')) {
  fail('adapter does not route authored birth-hour captures');
} else {
  ok('authored birth-hour capture hides couples clocks and marks Earth');
}

/* Observatory still capture remains separate from the lightweight chart →
 * story → keepsake journey. Both must carry personal context locally. */
const keepSkyPath = join(root, 'js', 'ap-keep-sky.js');
const homeKeepPath = join(root, 'js', 'ap-home-keep.js');
const chartPagePath = join(root, 'js', 'ap-chart-next.js');
const chartHtmlPath = join(root, 'chart.html');
if (!existsSync(keepSkyPath)) fail('js/ap-keep-sky.js missing');
else {
  const keepSky = readFileSync(keepSkyPath, 'utf8');
  const homeKeep = existsSync(homeKeepPath) ? readFileSync(homeKeepPath, 'utf8') : '';
  const chartPage = existsSync(chartPagePath) ? readFileSync(chartPagePath, 'utf8') : '';
  const chartHtml = existsSync(chartHtmlPath) ? readFileSync(chartHtmlPath, 'utf8') : '';
  const indexKeepHtml = readFileSync(join(root, 'observatory.html'), 'utf8');
  if (!keepSky.includes("mode: 'birth-hour'") || !keepSky.includes('birthContext.jd')) {
    fail('Keep path does not pass birth-hour jd into captureStill');
  }
  if (!keepSky.includes('stampSurfaceA') || !keepSky.includes("SURFACE_A = 'SCHEMATIC'")) {
    fail('Keep PNG must stamp Surface A SCHEMATIC (never a live badge)');
  }
  if (/['"]LIVE['"]|LIVE ·|LIVE badge/.test(keepSky)) {
    fail('Keep path must never label a still with a LIVE badge');
  }
  if (!chartPage.includes("sessionStorage.setItem('ap-next-reading',JSON.stringify(currentResult.data))")
      || !chartPage.includes("location.href='deep-reading.html'")) {
    fail('chart must carry the computed chart privately into the reading');
  }
  if (!chartHtml.includes('id="read-my-sky"') || !chartHtml.includes('ap-chart-next.js?v=' + tipNum)) {
    fail('chart.html must expose the guided reading action on the release tip');
  }
  if (!indexKeepHtml.includes('id="keep-sky"') || !indexKeepHtml.includes('data-keep-mode="birth-hour"')) {
    fail('Observatory must retain the birth-hour still capture control');
  }
  if (!indexKeepHtml.includes('ap-keep-sky.js?v=' + tipNum) || !indexKeepHtml.includes('ap-keep-sky.css?v=' + tipNum)) {
    fail('Observatory must load ap-keep-sky.js + ap-keep-sky.css on the release tip');
  }
  if (!indexKeepHtml.includes('ap-home-keep.js?v=' + tipNum)) {
    fail('Observatory must load ap-home-keep.js to publish birth-hour context');
  }
  if (!indexKeepHtml.includes('ap-reading-room') || !/ap-home-reading\.js\?v=\d+/.test(indexKeepHtml)) {
    fail('Observatory must retain its reading-room controller');
  }
  if (!indexKeepHtml.includes('start-radius="210"') || indexKeepHtml.includes('start-focus="earth"')) {
    fail('Observatory must open on the System overview');
  }
  if (!homeKeep.includes('ap-sky-ready') || !homeKeep.includes('ap-keep-sky-context')) {
    fail('ap-home-keep must listen for ap-sky-ready and dispatch ap-keep-sky-context');
  }
  if (!homeKeep.includes('timeKnown') || homeKeep.includes("12:00") || homeKeep.includes("'noon'")) {
    fail('home Keep must not invent noon when the birth minute is unknown');
  }
  if (!W.includes('if (!applyAuthoredBirthHourStill(jd)) return null;')) {
    fail('captureBirthHourStill must call applyAuthoredBirthHourStill(jd)');
  }
  const storyHtml = readFileSync(join(root, 'deep-reading.html'), 'utf8');
  const story = readFileSync(join(root, 'js', 'ap-reading-next.js'), 'utf8');
  const cardHtml = readFileSync(join(root, 'sky-card.html'), 'utf8');
  if (!storyHtml.includes('id="keep-my-sky"') || !story.includes("sessionStorage.setItem('ap-next-sky',JSON.stringify(chart))")
      || !story.includes("location.href='sky-card.html'")) {
    fail('reading must carry the computed chart privately into its keepsake');
  }
  if (!cardHtml.includes('ap-keepsake-next.js?v=' + tipNum)) fail('keepsake must load the current lightweight card controller');
  ok('Observatory capture retains its SCHEMATIC stamp; chart → story → keepsake uses private handoffs');
}
if (!W.includes('type: THREE.UnsignedByteType') || !W.includes('stencilBuffer: false')) {
  fail('Home-safe UnsignedByte composer target is missing');
}
if (!W.includes('function applyComposerSamples') || !W.includes('if (!composerSafeTarget)')) {
  fail('Home-safe composer must attach MSAA before the empty-frame guard strips it');
}
if (W.includes("hardwareConcurrency <= 4) return 'low'")) {
  fail('4-core laptops still forced onto the low/DPR-1.25 path');
}
if (W.includes("if (window.RafCore && window.RafCore.tier) return window.RafCore.tier")) {
  fail('instrument still inherits RafCore.tier and can skip the composer on 4-core hosts');
}
if (W.includes("perfTier !== 'high' || IS_PHONE || dataSavingRequested()) return")) {
  fail('full texture upgrades still high-desktop-only');
}
if (!W.includes('Math.max(real, 1.5)') || !W.includes('getVisualQuality()')) {
  fail('desktop DPR floor or getVisualQuality introspection missing');
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
if (!W.includes('const SYSTEM_CAM_RADIUS = (IS_PHONE || window.innerWidth <= 820) ? 100 : 96;') || !W.includes('camRadius: SYSTEM_CAM_RADIUS, camMin: 48')) {
  fail('System camera no longer frames all eight major worlds');
}
if (!W.includes('!portraitMode && !focusFrameId')) {
  fail('free-explore scale sync can still stomp a focused planet portrait');
}
if (!W.includes("(!focusFrameId || focusFrameId === 'earth')")
    || !W.includes('function homeEarthResizeMode()')
    || !W.includes("return 'intro'")
    || !W.includes("return 'earth-exit'")
    || !W.includes('if (homeEarthExit) camRadius = completeEarthRadiusFloor(camRadius)')) {
  fail('Home resize can still retarget an outer-planet portrait to Earth');
}

/* 3. Exactly one general model, with status outside its canvas. */
const htmlFiles = readdirSync(root).filter((name) => name.endsWith('.html'));
const modelOwners = htmlFiles.filter((name) => /<void-orrery\b/i.test(readFileSync(join(root, name), 'utf8')));
const expectedOwners = ['observatory.html'];
const got = [...modelOwners].sort();
if (got.join() !== expectedOwners.join()) {
  fail('live orrery owners drifted: ' + modelOwners.join(', '));
}
const indexHtml = readFileSync(join(root, 'observatory.html'), 'utf8');
const guidedHomeHtml = readFileSync(join(root, 'index.html'), 'utf8');
if (/<void-orrery\b|(?:void-orrery-adapter|orrery-webgl)\.js/.test(guidedHomeHtml)) {
  fail('guided home must not boot or preload the optional WebGL Observatory');
}
if (!guidedHomeHtml.includes('href="chart.html"') || !guidedHomeHtml.includes('js/ap-intro-next.js?v=' + tipNum)) {
  fail('guided home must demonstrate the sky and provide its chart entry point');
}
if (!tipNum) fail('service worker has no ap-vNNNN identity');
if (!new RegExp('js/void-orrery-adapter\\.js\\?v=' + tipNum).test(indexHtml)) {
  fail('Home adapter query must match service worker ap-v' + tipNum);
}
if (/<link[^>]+rel="modulepreload"[^>]+href="js\/orrery-webgl\.js/i.test(indexHtml)) {
  fail('Home must not let the 524 KB WebGL modulepreload delay its text LCP');
}
if (/<script[^>]*src=["'][^"']*js\/orrery\.js/.test(indexHtml)) fail('Home loads legacy orrery.js directly');
if (!/<void-orrery[^>]+data-renderer="webgl-only"/i.test(indexHtml)) fail('Home is not strict WebGL');
const modelCount = (indexHtml.match(/<void-orrery\b/g) || []).length;
if (modelCount !== 1) fail('Home must own exactly one void-orrery (' + modelCount + ')');
for (const probe of ['class="ap-model-stage"', 'id="mladder"', 'id="dock"', 'aria-label="Solar system as computed now"']) {
  if (!indexHtml.includes(probe)) fail('Home model contract missing: ' + probe);
}
const observatoryJs = readFileSync(join(root, 'js', 'ap-observatory-v834.js'), 'utf8');
const honestyStart = observatoryJs.indexOf('    function syncStageHonesty(kind)');
const honestyEnd = observatoryJs.indexOf('    function updateClock(', honestyStart);
if (honestyStart < 0 || honestyEnd <= honestyStart) {
  fail('Surface C stage honesty controller is missing');
} else {
  for (const [selectedView, timeMode, kind, expected] of [
    ['Solar system', 'current', 'live', 'Live Solar system now'],
    ['Earth', 'current', 'live', 'Live Earth now'],
    ['Solar system', 'current', 'computed', 'Solar system as computed now'],
    ['Earth', 'birth', 'computed', 'Earth · selected birth view'],
    ['Solar system', 'selected', 'computed', 'Solar system at selected moment'],
    ['Earth', 'birth', 'unavailable', 'Live sky unavailable'],
  ]) {
    let label;
    try {
      runInNewContext(observatoryJs.slice(honestyStart, honestyEnd) + '\nsyncStageHonesty(kind);', {
        selectedView, timeMode, kind,
        stage: { setAttribute(name, value) { if (name === 'aria-label') label = value; } },
      });
      if (label !== expected) fail(`Surface C stage label: expected ${expected}, got ${label}`);
    } catch (error) {
      fail('Surface C stage label failed: ' + error.message);
    }
  }
}
if (!observatoryJs.includes("html.classList.contains('orrery-full') && html.classList.contains('ap-model-revealed')")) {
  fail('Surface C Live promotion must require orrery-full and ap-model-revealed');
}
const homeStageStart = indexHtml.indexOf('<div class="ap-model-stage"');
const homePanelStart = indexHtml.indexOf('<aside class="ap-control-panel"');
const homeStageSegment = indexHtml.slice(homeStageStart, homePanelStart);
const homePanelSegment = indexHtml.slice(homePanelStart, indexHtml.indexOf('</aside>', homePanelStart));
if (/ap-model-status|ap-model-hint/.test(homeStageSegment)) fail('Home status or hint still overlays the model stage');
if (!/ap-model-status/.test(homePanelSegment) || !/ap-model-hint/.test(homePanelSegment)) {
  fail('Home panel does not own status and interaction hint');
}
ok('Observatory owns one strict model with unobstructed canvas and adjacent controls');
const homeCss = readFileSync(join(root, 'css', 'ap-home-v835.css'), 'utf8');
for (const probe of ['class="ap-mobile-flight-deck"', 'id="mobileWorld"', 'id="mobileScale"', 'class="ap-model-boot"']) {
  if (!indexHtml.includes(probe)) fail('Home phone flight deck missing: ' + probe);
}
for (const probe of ['.ap-mobile-flight-deck', '.ap-model-stage.is-model-ready .ap-model-boot']) {
  if (!homeCss.includes(probe)) fail('Home launch-state CSS missing: ' + probe);
}
ok('Observatory phone deck exposes every destination without covering the model');

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

/* 4. Optional models share the release identity; the guided journey owns the
 * offline shell, and Explore is a useful directory rather than a redirect. */
const sw = readFileSync(join(root, 'sw.js'), 'utf8');
for (const ref of [
  'css/ap-living-sky-v834.css?v=' + tipNum,
    'js/ap-observatory-v834.js?v=' + tipNum,
    'js/ap-nav-model.js?v=' + tipNum,
]) {
  if (!indexHtml.includes(ref)) fail('Home release query missing: ' + ref);
  const bare = './' + ref.split('?')[0];
  if (!existsSync(join(root, bare))) fail('Observatory release asset missing ' + bare);
}
const precacheBlock = sw.slice(sw.indexOf('const PRECACHE = ['), sw.indexOf('/* PRECACHE_END */'));
for (const file of ['index.html', 'chart.html', 'deep-reading.html', 'sky-card.html',
  'js/ap-next.js', 'js/ap-intro-next.js', 'js/ap-chart-next.js', 'js/ap-reading-next.js',
  'js/ap-keepsake-next.js', 'js/ephemeris.js', 'js/reading-templates.json', 'js/deep-templates.json',
  'css/ap-next.css', 'css/ap-intro-next.css', 'css/ap-chart-next.css', 'css/ap-reading-next.css']) {
  if (!precacheBlock.includes("'./" + file + "'")) fail('guided offline shell missing ' + file);
}
for (const optional of ['observatory.html', 'eclipse.html', 'js/orrery-webgl.js', 'js/vendor/three/three.module.min.js']) {
  if (precacheBlock.includes("'./" + optional + "'")) fail('optional model still delays core offline install: ' + optional);
}
const livingCss = readFileSync(join(root, 'css', 'ap-living-sky-v834.css'), 'utf8');
for (const probe of ['.ap-live-stage', '.ap-model-stage', '.ap-control-panel', '.ap-site-footer']) {
  if (!livingCss.includes(probe)) fail('living-sky CSS contract missing: ' + probe);
}
if (!livingCss.includes('--ap-void: #040812') || !livingCss.includes('--ap-silver: #93A8BF')
    || !livingCss.includes('--ap-silver-bright: #C9D6E3') || !livingCss.includes('--ap-ion: #8BA9FF')
    || !livingCss.includes('--ap-violet: #A897FF') || !livingCss.includes('--ap-brass: var(--ap-silver)')
    || !livingCss.includes('--ap-ember: var(--ap-ion)')) {
  fail('Home living-sky must publish Midnight Meridian void + silver + ion legacy aliases');
}
if (livingCss.includes('--ap-brass: #C2A05E') || livingCss.includes('--ap-brass: #D8B46A')) {
  fail('Home living-sky remapped --ap-brass back to engraved brass');
}
const observatory = readFileSync(join(root, 'js', 'ap-observatory-v834.js'), 'utf8');
for (const probe of ['var SCALE_KEYS =', 'var FOCUS =', 'function applyHash()', 'orrery.flyTo']) {
  if (!observatory.includes(probe)) fail('Home controller contract missing: ' + probe);
}
for (const probe of ["byId('mobileWorld')", "byId('mobileScale')", "block: 'center'"]) {
  if (!observatory.includes(probe)) fail('Home phone controller contract missing: ' + probe);
}
const navModel = readFileSync(join(root, 'js', 'ap-nav-model.js'), 'utf8');
const sharedShell = readFileSync(join(root, 'js', 'ap-next.js'), 'utf8');
const sharedRows = sharedShell.match(/const rows=([^\r\n]+);/);
try {
  const routes = sharedRows && runInNewContext('(' + sharedRows[1] + ').map(row => row.slice(0, 2))');
  if (JSON.stringify(routes) !== JSON.stringify([
    ['index.html', 'Today'], ['chart.html', 'Birth chart'], ['explore.html', 'Explore'], ['charts.html', 'Saved'],
  ])) fail('new shared shell and retained navigation disagree about the four primary routes');
} catch (error) {
  fail('shared navigation model could not be checked: ' + error.message);
}
for (const probe of [
  "['index.html', 'Today']",
  "['chart.html', 'Birth chart']",
  "['explore.html', 'Explore']",
  "['charts.html', 'Saved']",
]) {
  if (!navModel.includes(probe)) fail('launch navigation contract missing: ' + probe);
}
for (const probe of ["['explore.html', 'Explore', 'eclipse']", '(min-width: 981px)', 'renderStaticBottomNav();']) {
  if (!navModel.includes(probe)) fail('four-route mobile navigation missing: ' + probe);
}
if (!livingCss.includes('repeat(4, minmax(0, 1fr))')) fail('mobile navigation is not four equal tabs');
if (navModel.includes("['horoscope.html', 'Daily']")) fail('Daily must not be a launch route');
if (navModel.includes("['lifepath.html'")) fail('Life Path must not leak into nav extras');
if (navModel.includes("['synastry.html'")) fail('Synastry must not leak into nav extras');
if (!livingCss.includes('touch-action: pan-y !important')) fail('Home phone canvas can still trap vertical scrolling');
if (!sw.includes('const V = "ap-v' + tipNum + '"')) fail('service worker release identity drifted from Home tip ap-v' + tipNum);
ok('shared shell exposes four primary routes and releases vertical phone scrolling');
const exploreHtml = readFileSync(join(root, 'explore.html'), 'utf8');
for (const probe of [
  'href="observatory.html"',
  'id="tool-search"',
  'data-filter="sky"',
  'data-tool',
  'js/ap-discover-next.js',
  '<meta name="referrer" content="no-referrer">',
]) {
  if (!exploreHtml.includes(probe)) fail('Explore directory contract missing: ' + probe);
}
if (/location\.replace\(|http-equiv=["']refresh/.test(exploreHtml)) fail('Explore must not redirect away from its tool directory');
for (const unsafeForward of ['target.search = location.search;', 'target.hash = location.hash;']) {
  if (exploreHtml.includes(unsafeForward)) fail('Explore forwards an unsanitized address component: ' + unsafeForward);
}
for (const retired of ['<void-orrery', 'explore-boot-v', 'id="orrery-lite-deck"']) {
  if (exploreHtml.includes(retired)) fail('retired Explore surface remains: ' + retired);
}
ok('Explore exposes the optional Observatory through a searchable tool directory');

const deepLinkBuilder = readFileSync(join(root, 'js', 'ap-deep-link.js'), 'utf8');
if (!deepLinkBuilder.includes("if (m !== 'now') parts.push('public=1')")) {
  fail('public-moment privacy migration missing: fixed emitters must mark public=1');
}
for (const probe of ['publicMarkers.length === 1', "publicMarkers[0].key === 'public'", 'history.replaceState']) {
  if (!observatory.includes(probe)) fail('public-moment privacy migration missing: ' + probe);
}
if (!indexHtml.includes('Fixed public sky moments carry public=1 from v900 onward')) {
  fail('Home does not scrub legacy fixed moments before loading assets');
}
ok('fixed public events are marked; ambiguous historical moments fail closed');

/* 5. Dedicated Eclipse renderer and unobstructed stage. */
const eclipseHtml = readFileSync(join(root, 'eclipse.html'), 'utf8');
const eclipseView = readFileSync(join(root, 'js', 'ap-eclipse-live-v834.js'), 'utf8');
const eclipseLiveCss = readFileSync(join(root, 'css', 'ap-eclipse-live-v834.css'), 'utf8');
const eclipseGeometry = readFileSync(join(root, 'js', 'ap-eclipse-geometry-v834.js'), 'utf8');
for (const ref of [
  'js/ap-eclipse-live-v834.js?v=' + tipNum,
    'css/ap-eclipse-live-v834.css?v=' + tipNum,
]) {
  if (!eclipseHtml.includes(ref)) fail('Eclipse release query missing: ' + ref);
  const bare = './' + ref.split('?')[0];
  if (!existsSync(join(root, bare))) fail('Eclipse release asset missing ' + bare);
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
const eclipsePanelStart = eclipseHtml.indexOf('<div class="ap-eclipse-live__panel"');
const eclipseStageSegment = eclipseHtml.slice(eclipseStageStart, eclipsePanelStart);
const eclipsePanelSegment = eclipseHtml.slice(eclipsePanelStart, eclipseHtml.indexOf('</section>', eclipsePanelStart));
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
  'const galaxySpriteTextureCache = new Map()', 'if (p.id >= 3 && !galaxyBuilt) ensureGalaxyLayers()',
  'function nextTextureUploadFrame(generation, expectedRenderer)',
  'async function prewarmEarthTextureBatch(records, generation, expectedRenderer)',
  'expectedRenderer.initTexture(record.texture)',
  'function attachEarthTextureBatch(records, generation, expectedRenderer)',
  'stageEarthTextureBatch(earthSpecs)',
  '.then(waitForEarthTextureAttachment)']) {
  if (!W.includes(probe)) fail('renderer quality/performance contract missing: ' + probe);
}
if (!W.includes("{ file: 'earth.jpg', srgb: true }")
    || !W.includes("{ file: 'earth_lights.png', srgb: true }")
    || !W.includes("{ file: 'earth_specular.jpg', srgb: false }")
    || !W.includes("{ file: 'earth_clouds.jpg', srgb: false }")
    || !W.includes("{ file: 'earth_normal.jpg', srgb: false }")) {
  fail('staged Earth batch must retain geography, lights, specular, clouds and normal maps');
}
const earthFileListStart = W.indexOf('function earthTextureFiles()');
const earthFileListEnd = W.indexOf('function requestPreloadTexture', earthFileListStart);
const earthFileListBody = earthFileListStart >= 0 && earthFileListEnd > earthFileListStart
  ? W.slice(earthFileListStart, earthFileListEnd)
  : '';
if (!earthFileListBody.includes("'earth_clouds.jpg'")
    || !earthFileListBody.includes("'earth_normal.jpg'")
    || earthFileListBody.includes('perfTier') || earthFileListBody.includes('PRM')) {
  fail('reduced-motion/low-tier Earth texture plan must still contain all five physical maps');
}
const earthSpecsStart = W.indexOf('const earthSpecs = [');
const earthSpecsEnd = W.indexOf('stageEarthTextureBatch(earthSpecs)', earthSpecsStart);
const earthSpecsBody = earthSpecsStart >= 0 && earthSpecsEnd > earthSpecsStart
  ? W.slice(earthSpecsStart, earthSpecsEnd)
  : '';
if (earthSpecsBody.includes("perfTier !== 'low'") || earthSpecsBody.includes('!PRM')) {
  fail('Earth GPU warmup still removes physical maps for reduced-motion/low-tier visitors');
}
if (/function webglOK\(\)/.test(W)) fail('renderer still creates a redundant module-evaluation WebGL context');
ok('renderer stages one Earth GPU upload per frame before atomic reveal and idle full-resolution upgrades');

/* 7. Import maps on the two live Three.js pages only. */
for (const page of ['observatory.html', 'eclipse.html']) {
  const html = readFileSync(join(root, page), 'utf8');
  if (!/type=["']importmap["']/.test(html)) fail(page + ' missing Three import map');
  if (!html.includes('./js/vendor/three/three.module.min.js')) fail(page + ' import map missing local Three build');
}
ok('Three import map is present on Observatory and Eclipse');

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
console.log('PASS optional Observatory 3D + guided offline journey + dedicated Eclipse 3D + VoidEphem compatibility');
