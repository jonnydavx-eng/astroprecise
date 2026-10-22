// Guard for the 2B overview fixes. The label layout is tested as behaviour
// (the pure helper is pulled out of orrery-webgl.js and run on synthetic
// boxes); the lighting and draw-order checks stay static because they need a
// GPU, and the visuals are covered by screenshots.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const gl = readFileSync(new URL('./website/js/orrery-webgl.js', import.meta.url), 'utf8');
const obs = readFileSync(new URL('./website/js/ap-observatory-v834.js', import.meta.url), 'utf8');

// ── label layout: behaviour ────────────────────────────────────────────────
const m = gl.match(/export function apLayoutLabelBoxes\(items, n, W, H, placed\) \{[\s\S]*?\n\}\n/);
assert.ok(m, 'apLayoutLabelBoxes must exist as a top-level pure helper');
const layout = new Function(`${m[0].replace(/^export /, '')}; return apLayoutLabelBoxes;`)();
const box = (id, x, y, w = 60, h = 14) => ({ id, x, y, w, h, cx: 0, cy: 0, show: false });
const run = (items, W = 390, H = 600) => { layout(items, items.length, W, H, []); return items; };
const inside = (it, W = 390, H = 600) => it.cx - it.w / 2 >= 4 - 1e-9 && it.cx + it.w / 2 <= W - 4 + 1e-9 && it.cy - it.h / 2 >= 4 - 1e-9 && it.cy + it.h / 2 <= H - 4 + 1e-9;

// Neptune at the right edge of a 390 px phone is pulled inside; so is a tag at the top.
let [nep] = run([box('neptune', 388, 300, 80)]);
assert.ok(nep.show && inside(nep), 'edge tag is kept inside the canvas horizontally');
let [top] = run([box('jupiter', 200, 1)]);
assert.ok(top.show && inside(top), 'edge tag is kept inside the canvas vertically');

// Venus on top of Earth steps below it instead of overlapping; Earth stays put.
let [earth, venus] = run([box('earth', 200, 300), box('venus', 205, 302)]);
assert.ok(earth.show && earth.cx === 200 && earth.cy === 300, 'first (Earth) tag keeps its place');
assert.ok(venus.show && venus.cy >= earth.cy + (earth.h + venus.h) / 2, 'colliding tag is stepped clear');

// A tag that cannot be cleared is hidden; next frame, once apart, it shows again.
const crowded = [box('a', 200, 590), box('b', 200, 590)];
run(crowded);
assert.ok(crowded[0].show && !crowded[1].show, 'unresolvable collision hides the lower-priority tag');
crowded[1].x = 60; crowded[1].y = 100;
run(crowded);
assert.ok(crowded[1].show && inside(crowded[1]), 'a collision-hidden tag reappears when the worlds separate');

// Wider than the canvas: hidden, never left clipped.
let [huge] = run([box('sun', 195, 300, 500)]);
assert.ok(!huge.show, 'oversized tag is hidden rather than clipped');

// The per-frame path reuses pooled records and refreshes the camera first.
assert.match(gl, /const labelItems = \[\];/, 'label records are pooled');
assert.match(gl, /function layoutSpriteLabels\(\) \{[\s\S]{0,400}camera\.updateMatrixWorld\(\);/, 'camera matrices refresh before project()');
assert.match(gl, /applyMatrix4\(camera\.matrixWorldInverse\)\.z/, 'sprite size uses camera-space depth');
assert.match(gl, /if \(!useDomLabels && showLabels && !introActive && scaleLevel <= 2\) layoutSpriteLabels\(\);/, 'label layout runs each frame');
assert.match(gl, /lab\.visible = !useDomLabels && showLabels && !introActive && scaleLevel <= 2;[\s\S]{0,1600}layoutSpriteLabels\(\);/, 'base visibility is restored before every layout');

// ── fill light ─────────────────────────────────────────────────────────────
const fill = gl.match(/const fillI = portraitLit \? 0 : \(perfTier === 'high' \? ([\d.]+) : ([\d.]+)\) \* \(0\.75 \+ outerT \* 0\.25\);/);
assert.ok(fill && Number(fill[1]) >= 1 && Number(fill[2]) >= 1, 'overview fill is bright enough to read against physical lights');
assert.match(gl, /instrumentFillGoal = fillI;/, 'the zoom path stores the overview fill goal');
assert.equal((gl.match(/^\s+instrumentFillGoal = /gm) || []).length, 1, 'nothing else overwrites the stored overview goal');
assert.match(gl, /const fillOff = instrumentPortraitBodyId\(\) \|\| \(birthHourMarker && birthHourMarker\.visible\);/, 'portraits and the birth-hour still suppress the fill without clearing it');
assert.match(gl, /instrumentFillLight\.intensity \+= \(goal - instrumentFillLight\.intensity\) \* fillK/, 'fill eases every frame');

// ── draw order ─────────────────────────────────────────────────────────────
// Ringed world: ring faces (2) -> depth-only ring (3) -> atmosphere shell (4).
// The shell's pale limb line used to draw over the near ring where it crosses
// the globe (Edge/D3D11 on the Mini GPU, 2B shots); the depth-only ring hides it.
const ringBlock = gl.slice(gl.indexOf('if (b.ring) {'), gl.indexOf('loadTex(b.ring)'));
assert.ok(ringBlock.length > 200, 'ring build block found');
assert.match(ringBlock, /ring\.renderOrder = 2;[\s\S]{0,40}ringLo\.renderOrder = 2;/, 'both ring faces share one draw slot (depth-sorted between themselves)');
const ringMatSrc = gl.slice(gl.indexOf('function saturnRingMaterial()'), gl.indexOf('function injectEarth('));
assert.match(ringMatSrc, /transparent: true, side: THREE\.DoubleSide, depthWrite: false/, 'ring faces still blend (no depth write), so the two faces both show');
const depthMesh = ringBlock.match(/const ringDepth = new THREE\.Mesh\(ringGeo, new THREE\.ShaderMaterial\(\{([\s\S]*?)\}\)\);/);
assert.ok(depthMesh, 'a depth-only copy of the ring exists');
assert.match(depthMesh[1], /uniforms: ringMat\.uniforms\b/, 'depth ring shares the ring uniforms (texture swap reaches it)');
assert.match(depthMesh[1], /fragmentShader: ringMat\.fragmentShader/, 'depth ring uses the ring discard, so the Cassini gap stays open');
assert.match(depthMesh[1], /depthWrite: true/, 'depth ring writes depth');
assert.match(depthMesh[1], /colorWrite: false/, 'depth ring draws no colour');
const order = (re) => { const m = ringBlock.match(re); return m ? Number(m[1]) : NaN; };
const oFaces = order(/\bring\.renderOrder = (\d+);/);
const oDepth = order(/ringDepth\.renderOrder = (\d+);/);
const oAtmo = order(/group\.userData\.atmo\.renderOrder = (\d+);/);
assert.ok(oFaces < oDepth && oDepth < oAtmo, `ring faces < depth ring < atmosphere (got ${oFaces}, ${oDepth}, ${oAtmo})`);
assert.equal((gl.match(/userData\.atmo\.renderOrder\s*=/g) || []).length, 1, 'nothing else reorders the shell');
assert.match(ringBlock, /group\.add\(ringDepth\)/, 'depth ring is added with the planet group (moves and hides with Saturn)');
const atmoSrc = gl.slice(gl.indexOf('function atmosphereMaterial('), gl.indexOf('function saturnRingMaterial()'));
assert.doesNotMatch(atmoSrc, /depthTest:\s*false/, 'the shell depth-tests, so the near ring can hide it');
assert.match(gl, /labels\[b\.id\]\.renderOrder = 10;/, 'planet tags draw after the rings');

// ── observatory status ─────────────────────────────────────────────────────
const close = obs.match(/if \(idx === 0 && focusKey && focusKey !== 'earth' && FOCUS\[focusKey\]\) \{([\s\S]*?)return;\s*\}/);
assert.ok(close, 'a world close-up has its own scale branch');
assert.match(close[1], /FOCUS\[focusKey\] \+ ' close-up'/, 'status names the world, not EARTH');
assert.match(close[1], /setPressed\(scaleGroup, function \(\) \{ return false; \}\);/, 'no desktop rung stays pressed');
assert.match(close[1], /mobileScale\.selectedIndex = -1;/, 'the phone picker does not keep showing EARTH');
console.log('PASS orrery readability guards');
