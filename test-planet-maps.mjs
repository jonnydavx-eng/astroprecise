/**
 * Planet-map provenance gate.
 *
 * Two things must stay true: every body the engine paints has a real map file on disk at
 * every tier it might ask for, and every one of those maps is credited to the source it
 * actually came from. The site's honesty rule makes a mis-credited map as much of a bug as
 * a missing one — Uranus and Neptune are Hubble OPAL, not Solar System Scope, and Pluto is
 * New Horizons.
 */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const bin = (path) => readFileSync(new URL(path, import.meta.url));
const TEX = './website/assets/textures/';

const bodies = read('./website/js/orbitlab-bodies.js');
const credits = read('./website/CREDITS.md');
const footer = read('./website/js/ap-footer-inject.js');
const iceNote = read(`${TEX}ice-giants-source.txt`);
const plutoNote = read(`${TEX}pluto-source.txt`);

/** Equirectangular maps must be 2:1 or they will stretch on a sphere. Read the real pixel
 *  dimensions out of the file headers rather than trusting the filename. */
function dimensions(file) {
  const b = bin(TEX + file);
  if (b[0] === 0xff && b[1] === 0xd8) {
    for (let i = 2; i < b.length - 9; ) {
      if (b[i] !== 0xff) { i += 1; continue; }
      const marker = b[i + 1];
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { w: b.readUInt16BE(i + 7), h: b.readUInt16BE(i + 5) };
      }
      if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd9)) { i += 2; continue; }
      i += 2 + b.readUInt16BE(i + 2);
    }
    throw new Error(`${file}: no JPEG frame header`);
  }
  if (b.toString('ascii', 1, 4) === 'PNG') {
    return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  }
  if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
    const chunk = b.toString('ascii', 12, 16);
    if (chunk === 'VP8 ') return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
    if (chunk === 'VP8L') {
      const bits = b.readUInt32LE(21);
      return { w: (bits & 0x3fff) + 1, h: ((bits >> 14) & 0x3fff) + 1 };
    }
    if (chunk === 'VP8X') return { w: (b.readUIntLE(24, 3) & 0xffffff) + 1, h: (b.readUIntLE(27, 3) & 0xffffff) + 1 };
    throw new Error(`${file}: unknown WebP chunk ${chunk}`);
  }
  throw new Error(`${file}: not a JPEG or WebP image`);
}

/** Every map the engine can reach for: the named file plus the tiers it swaps in by
 *  suffix. Missing a tier is a silent black planet on a slow connection. */
function assertMapTiers(file, { equirect = true } = {}) {
  const stem = file.replace(/\.(jpg|png|webp)$/, '');
  const ext = file.slice(file.lastIndexOf('.'));
  const tiers = [file, `${stem}.webp`, `${stem}_md.webp`, `${stem}_sm${ext}`, `${stem}_sm.webp`];
  for (const tier of tiers) {
    assert.ok(existsSync(new URL(TEX + tier, import.meta.url)), `missing texture tier: ${tier}`);
    const { w, h } = dimensions(tier);
    assert.ok(w > 0 && h > 0, `${tier}: zero-sized image`);
    if (equirect) {
      assert.equal(w, h * 2, `${tier}: equirectangular maps must be 2:1, got ${w}x${h}`);
    }
  }
}

// ── Every body in the config points at a map that is really there ────────────────────
const texRefs = [...bodies.matchAll(/\btex:\s*'([^']+)'/g)].map((m) => m[1]);
assert.ok(texRefs.length >= 8, `expected at least the eight planets to declare a map, saw ${texRefs.length}`);
for (const file of texRefs) assertMapTiers(file);

// Saturn's ring is a strip, not a globe map — it has tiers but no 2:1 rule.
const ringRefs = [...bodies.matchAll(/\bring:\s*'([^']+)'/g)].map((m) => m[1]);
assert.deepEqual(ringRefs, ['saturn_ring.png'], 'saturn is the only ringed body with a map');
assertMapTiers('saturn_ring.png', { equirect: false });

// Helm lock: Uranus rings stay off. No ring map, no ring config, no ring credit.
assert.equal(existsSync(new URL(`${TEX}uranus_ring.png`, import.meta.url)), false, 'uranus ring texture must not exist');
assert.equal(existsSync(new URL(`${TEX}uranus_ring.webp`, import.meta.url)), false, 'uranus ring texture must not exist');
assert.equal(/uranus[^\n]*\bring:/i.test(bodies), false, 'uranus must not declare a ring');
assert.equal(/uranus[^.\n]*ring/i.test(credits), false, 'credits must not claim a uranus ring map');

// ── Ice giants are the real Hubble OPAL maps, credited as such ───────────────────────
for (const body of ['uranus', 'neptune']) assertMapTiers(`${body}.jpg`);
assert.ok(credits.includes('OPAL'), 'credits must name the OPAL programme for the ice giants');
assert.ok(credits.includes('10.17909/T9G593'), 'credits must carry the OPAL data DOI');
assert.ok(credits.includes('GO13937'), 'credits must carry the OPAL attribution string');
assert.ok(iceNote.includes('archive.stsci.edu/hlsps/opal'), 'ice-giant note must cite the archive URL it fetched');
// The note's coverage claims are load-bearing honesty, not decoration.
assert.ok(/NOT full-latitude/.test(iceNote), 'ice-giant note must not claim Neptune is full-latitude');
assert.ok(/not paint|NOT painted/i.test(iceNote), 'ice-giant note must record that unobserved regions were left alone');

// ── Pluto is the real New Horizons colour mosaic, credited as such ───────────────────
assertMapTiers('pluto.jpg');
assert.ok(/DWARF_BODIES/.test(bodies), 'pluto config must live in DWARF_BODIES');
const planetArray = /export const BODIES = \[([\s\S]*?)\n\];/.exec(bodies);
assert.ok(planetArray, 'could not find the BODIES array');
assert.equal(planetArray[1].includes('pluto'), false,
  'pluto must stay out of BODIES — that array builds the eight-planet scene');
assert.equal((planetArray[1].match(/\bid:/g) || []).length, 8, 'BODIES must hold exactly the eight planets');
assert.ok(credits.includes('New Horizons'), 'credits must name New Horizons for Pluto');
assert.ok(/Johns Hopkins APL/.test(credits) && /SwRI/.test(credits), 'credits must carry the NASA/JHUAPL/SwRI line');
assert.ok(plutoNote.includes('science.nasa.gov'), 'pluto note must cite the NASA source URL');
assert.ok(/md5/i.test(plutoNote), 'pluto note must record the source checksum');
assert.ok(/polar night/.test(plutoNote), 'pluto note must explain the unimaged southern cap');

// ── No map is credited to a source it did not come from ─────────────────────────────
const sssSection = /### Solar System Scope[\s\S]*?(?=\n### )/.exec(credits);
assert.ok(sssSection, 'credits must keep a distinct Solar System Scope section');
for (const body of ['uranus', 'neptune', 'pluto']) {
  assert.equal(new RegExp(`\\b${body}\\b`, 'i').test(sssSection[0]), false,
    `${body} must not be attributed to Solar System Scope`);
}
// Every map on disk has to be traceable to a named source in CREDITS.md.
for (const file of [...texRefs, ...ringRefs, 'pluto.jpg', 'moon.jpg']) {
  const stem = file.replace(/\.(jpg|png|webp)$/, '');
  assert.ok(credits.includes(stem), `CREDITS.md does not account for ${stem}`);
}

// ── The visible credit line matches the files actually shipped ───────────────────────
assert.ok(footer.includes('Solar System Scope') && footer.includes('creativecommons.org/licenses/by/4.0'),
  'footer must keep the CC BY 4.0 credit the licence requires');
assert.ok(footer.includes('OPAL'), 'footer must credit Hubble OPAL for the ice giants');
assert.ok(/NASA\/JHUAPL\/SwRI/.test(footer), 'footer must credit NASA/JHUAPL/SwRI for Pluto');

// ── Precache must not point at a texture that does not exist ────────────────────────
const sw = read('./website/sw.js');
for (const [, file] of sw.matchAll(/\.\/assets\/textures\/([^']+)'/g)) {
  assert.ok(existsSync(new URL(TEX + file, import.meta.url)), `sw.js precaches a missing texture: ${file}`);
}

console.log('PASS planet maps present at every tier and credited to their real sources');
