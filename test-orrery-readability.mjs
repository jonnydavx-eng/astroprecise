// Guard for the 2B overview fixes (static source checks; the visuals are covered by screenshots).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const gl = readFileSync(new URL('./website/js/orrery-webgl.js', import.meta.url), 'utf8');
const obs = readFileSync(new URL('./website/js/ap-observatory-v834.js', import.meta.url), 'utf8');
assert.match(gl, /const fillI = portraitLit \? 0 : /, 'overview fill light must be on outside planet portraits');
assert.match(gl, /instrumentFillLight\.intensity \+= \(goal - instrumentFillLight\.intensity\)/, 'fill must ease every frame, not only on zoom changes');
assert.match(gl, /function layoutSpriteLabels\(\)/, 'planet tags must be laid out in screen space');
assert.match(gl, /layoutSpriteLabels\(\);/, 'label layout must run each frame');
assert.match(gl, /ring\.renderOrder = 2;[\s\S]{0,40}ringLo\.renderOrder = 2;/, 'Saturn ring faces need a fixed draw order');
assert.match(gl, /labels\[b\.id\]\.renderOrder = 10;/, 'planet tags draw after the rings');
assert.match(obs, /FOCUS\[focusKey\] \+ ' close-up'/, 'a world close-up must not keep the EARTH scale label');
console.log('PASS orrery readability guards');
