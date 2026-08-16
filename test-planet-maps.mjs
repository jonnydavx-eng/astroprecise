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
import { readFileSync, existsSync, readdirSync } from 'node:fs';

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

/** The library is uniform: every globe map ships 2048×1024 full, 1024×512 medium and
 *  512×256 small. Pinning the sizes rather than just the 2:1 ratio is deliberate — a map
 *  re-encoded at half resolution still passes a ratio check, and silently shrinking these
 *  files is a failure mode that has actually happened here. */
const TIER_PX = { full: [2048, 1024], md: [1024, 512], sm: [512, 256] };

/** Every map the engine can reach for: the named file plus the tiers it swaps in by
 *  suffix. Missing a tier is a silent black planet on a slow connection. */
function assertMapTiers(file, { equirect = true } = {}) {
  const stem = file.replace(/\.(jpg|png|webp)$/, '');
  const ext = file.slice(file.lastIndexOf('.'));
  const tiers = [
    [file, 'full'], [`${stem}.webp`, 'full'], [`${stem}_md.webp`, 'md'],
    [`${stem}_sm${ext}`, 'sm'], [`${stem}_sm.webp`, 'sm'],
  ];
  for (const [tier, step] of tiers) {
    assert.ok(existsSync(new URL(TEX + tier, import.meta.url)), `missing texture tier: ${tier}`);
    const { w, h } = dimensions(tier);
    assert.ok(w > 0 && h > 0, `${tier}: zero-sized image`);
    const problem = tierSizeError(tier, w, h, step, equirect);
    assert.equal(problem, null, problem || '');
  }
}

/** Returns a message when a tier is the wrong size, or null when it is fine. Split out so
 *  the shrink guard can be proven against fabricated dimensions — see the self-check at the
 *  end of this file. Never write a shrunk map into the repo to test this: the body maps are
 *  locked, other workers watch the tree, and a snapshot could capture the damage. */
function tierSizeError(tier, w, h, step, equirect) {
  const [ew, eh] = TIER_PX[step];
  if (equirect) {
    if (w !== h * 2) return `${tier}: equirectangular maps must be 2:1, got ${w}x${h}`;
    if (w !== ew || h !== eh) return `${tier} is ${w}x${h}, expected ${ew}x${eh} — has this map been shrunk?`;
    return null;
  }
  // Ring strips share the tier widths but keep their own aspect.
  if (w !== ew) return `${tier} is ${w} wide, expected ${ew} — has this map been shrunk?`;
  return null;
}

// ── Every body in the config points at a map that is really there ────────────────────
const texRefs = [...bodies.matchAll(/\btex:\s*'([^']+)'/g)].map((m) => m[1]);
assert.ok(texRefs.length >= 8, `expected at least the eight planets to declare a map, saw ${texRefs.length}`);
for (const file of texRefs) assertMapTiers(file);

// The Moon and the Earth overlays are not in BODIES but ship the same tier set, and the
// overlays stay Solar System Scope even when the body map under them is replaced. Check
// them explicitly so a shrink or a missing tier cannot slip through there either.
for (const file of ['moon.jpg', 'earth_clouds.jpg', 'earth_lights.png', 'earth_normal.jpg', 'earth_specular.jpg']) {
  assertMapTiers(file);
}

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
// Findings that cost real measurement to establish — losing them invites a repeat.
assert.ok(/duplicated prime meridian/i.test(iceNote),
  'ice-giant note must keep the duplicated-meridian finding (721 cols = 0-360 inclusive)');
assert.ok(/REFUSED/i.test(iceNote),
  'ice-giant note must record that the post-mask Neptune still recapture was refused');
// The Neptune mask edits an official product, so the rule and its bounds must stay stated,
// and the fact that Uranus is deliberately excluded must not quietly drift.
assert.ok(/all-bands-valid mask/i.test(iceNote),
  'ice-giant note must state the all-bands-valid rule used on Neptune');
assert.ok(/Uranus is NOT masked/i.test(iceNote),
  'ice-giant note must record that Uranus was deliberately left unmasked');
assert.ok(/Nothing is painted in|not filled/i.test(iceNote),
  'ice-giant note must state that invalid pixels were marked absent, not filled');
assert.ok(/all\s+three filters have data/i.test(credits),
  'credits must disclose the Neptune all-bands mask');

// The stills tool must keep refusing to overwrite a good still with an opaque-void capture.
{
  const tool = read('./tools/make-engine-stills.mjs');
  assert.ok(/REFUSED/.test(tool) && /transparen/i.test(tool),
    'stills tool must refuse captures whose void is not transparent');
}

// ── Pluto is the real New Horizons colour mosaic, credited as such ───────────────────
assertMapTiers('pluto.jpg');
assert.ok(/pluto:\s*\{/.test(bodies), 'pluto rotation model must stay on this tree');
const planetArray = /export const BODIES = \[([\s\S]*?)\n\];/.exec(bodies);
assert.ok(planetArray, 'could not find the BODIES array');
assert.equal(planetArray[1].includes('pluto'), false,
  'pluto must stay out of BODIES — that array builds the eight-planet scene');
assert.equal((planetArray[1].match(/\bid:/g) || []).length, 8, 'BODIES must hold exactly the eight planets');
assert.ok(credits.includes('New Horizons'), 'credits must name New Horizons for Pluto');
assert.ok(/Johns Hopkins APL|JHUAPL/.test(credits) && /SwRI/.test(credits), 'credits must carry the NASA/JHUAPL/SwRI line');
assert.ok(plutoNote.includes('science.nasa.gov'), 'pluto note must cite the NASA source URL');
assert.ok(/polar night|winter darkness|unobserved/.test(plutoNote), 'pluto note must explain the unimaged southern cap');

// ── No map is credited to a source it did not come from ─────────────────────────────
const sssStart = credits.indexOf('**Solar System Scope**');
const sssEnd = credits.indexOf('**Attribution requirement:**');
assert.ok(sssStart >= 0 && sssEnd > sssStart, 'credits must keep a distinct Solar System Scope section');
const sssSection = [credits.slice(sssStart, sssEnd)];
for (const body of ['uranus', 'neptune', 'pluto']) {
  assert.equal(new RegExp(`\\b${body}\\b`, 'i').test(sssSection[0]), false,
    `${body} must not be attributed to Solar System Scope`);
}
/**
 * Forward guard, so a real map can never sit under the wrong credit.
 *
 * Maps arrive in batches, each with a `*-source.txt` note beside it. The moment such a
 * note exists for a body, crediting that body to Solar System Scope becomes false — which
 * is exactly how the ice-giant credit went stale and had to be fixed. Keyed on the note
 * filename rather than its prose, because notes mention other bodies in passing (the
 * ice-giant note says Uranus's south is "turned away from Earth", which a content scan
 * would read as an Earth claim).
 *
 * Word boundaries matter here and are deliberate: `\bearth\b` does not match
 * `earth_clouds`/`earth_lights`/`earth_normal`/`earth_specular`, and `\bsaturn\b` does not
 * match `saturn_ring`. Those overlays and the ring stay Solar System Scope even when the
 * body map underneath them does not.
 */
const NOTE_BODIES = {
  'ice-giants-source.txt': ['uranus', 'neptune'],
  'pluto-source.txt': ['pluto'],
  'gas-giants-source.txt': ['jupiter', 'saturn'],
  'nasa-rocky-source.txt': ['mercury', 'venus', 'earth', 'moon', 'mars'],
};
for (const note of readdirSync(new URL(TEX, import.meta.url)).filter((f) => f.endsWith('-source.txt'))) {
  const bodies = NOTE_BODIES[note];
  assert.ok(bodies, `unknown provenance note ${note} — add it to NOTE_BODIES so the bodies it covers `
    + 'are checked against the Solar System Scope credit');
  const noteText = read(TEX + note);
  assert.ok(/OPAL|Hubble|NASA|USGS|New Horizons/i.test(noteText),
    `${note} must name the programme or archive its maps came from`);
  assert.ok(/DOI|dx\.doi\.org|10\.\d{4,}|https?:\/\//i.test(noteText),
    `${note} must cite a resolvable source URL or identifier`);
  for (const body of bodies) {
    assert.equal(new RegExp(`\\b${body}\\b`, 'i').test(sssSection[0]), false,
      `${body} has a provenance note (${note}) — it must not still be credited to Solar System Scope`);
  }
}

// Every map on disk has to be traceable to a named source in CREDITS.md.
for (const file of [...texRefs, ...ringRefs, 'pluto.jpg', 'moon.jpg']) {
  const stem = file.replace(/\.(jpg|png|webp)$/, '');
  assert.ok(credits.toLowerCase().includes(stem), `CREDITS.md does not account for ${stem}`);
}

// ── The visible credit line matches the files actually shipped ───────────────────────
assert.ok(footer.includes('Solar System Scope') && footer.includes('creativecommons.org/licenses/by/4.0'),
  'footer must keep the CC BY 4.0 credit the licence requires');
assert.ok(footer.includes('OPAL'), 'footer must credit Hubble OPAL for the ice giants');
assert.ok(/NASA\/JHUAPL\/SwRI/.test(footer), 'footer must credit NASA/JHUAPL/SwRI for Pluto');

// ── The engine stills library must not contain an invented body ─────────────────────
// Pluto's still used to be a hand-painted procedural disc, because no real Pluto map
// existed. It does now, so a painted stand-in is no longer defensible.
const stills = JSON.parse(read('./website/img/engine/manifest.json'));
const plutoStill = stills.stills.find((s) => s.id === 'pluto');
assert.ok(plutoStill, 'engine stills manifest must list pluto');
assert.equal(plutoStill.generated, false, 'the pluto still must not be a generated disc');
assert.notEqual(plutoStill.mapSphere, true, 'pluto still is an engine portrait on this tree, not a no-mesh map-sphere');
assert.match(plutoStill.note || '', /not painted/, 'the pluto still must record that the unobserved region was left alone');
for (const still of stills.stills) {
  assert.notEqual(still.generated, true, `${still.id} still is marked generated — nothing in this library may be invented`);
}
const plutoStillFile = new URL('./website/img/engine/pluto.webp', import.meta.url);
assert.ok(existsSync(plutoStillFile), 'the pluto still must exist on disk');
{
  const b = bin('./website/img/engine/pluto.webp');
  assert.equal(b.toString('ascii', 8, 12), 'WEBP', 'the pluto still must be a webp');
  const w = (b.readUIntLE(24, 3) & 0xffffff) + 1;
  const h = (b.readUIntLE(27, 3) & 0xffffff) + 1;
  assert.equal(`${w}x${h}`, '1024x1024', `the pluto still must be 1024 square, got ${w}x${h}`);
}

// The generator must not carry the old invented-disc code path any more.
const stillsTool = read('./tools/make-engine-stills.mjs');
assert.equal(/makePlutoStill/.test(stillsTool), false, 'the invented Pluto disc generator must be gone');
assert.equal(/bright plain lower-centre/.test(stillsTool), false, 'the invented Pluto "heart" blob must be gone');
assert.ok(/PLUTO/.test(stillsTool) && /New Horizons/.test(stillsTool),
  'stills tool must keep Pluto as a real engine portrait from the New Horizons map');

// ── Precache must not point at a texture that does not exist ────────────────────────
const sw = read('./website/sw.js');
for (const [, file] of sw.matchAll(/\.\/assets\/textures\/([^']+)'/g)) {
  assert.ok(existsSync(new URL(TEX + file, import.meta.url)), `sw.js precaches a missing texture: ${file}`);
}

// ── Self-check: the shrink guard, proven without touching a single map file ──────────
// The body maps are locked and other workers watch this tree, so the guard is exercised
// against fabricated dimensions instead of by re-encoding a real map.
assert.equal(tierSizeError('x.jpg', 2048, 1024, 'full', true), null, 'a correct full tier must pass');
assert.equal(tierSizeError('x_md.webp', 1024, 512, 'md', true), null, 'a correct medium tier must pass');
assert.equal(tierSizeError('x_sm.webp', 512, 256, 'sm', true), null, 'a correct small tier must pass');
assert.match(tierSizeError('x.jpg', 1024, 512, 'full', true) || '', /has this map been shrunk\?/,
  'a half-size full tier must be caught even though it is still 2:1');
assert.match(tierSizeError('x_md.webp', 512, 256, 'md', true) || '', /has this map been shrunk\?/,
  'a half-size medium tier must be caught');
assert.equal(tierSizeError('ring_md.webp', 1024, 63, 'md', false), null, 'a correct medium ring strip must pass');
assert.match(tierSizeError('ring_md.webp', 512, 31, 'md', false) || '', /has this map been shrunk\?/,
  'a shrunk ring strip must be caught on width');
assert.match(tierSizeError('x.jpg', 2048, 900, 'full', true) || '', /must be 2:1/,
  'a non-2:1 map must still be caught');
assert.equal(tierSizeError('ring.png', 2048, 125, 'full', false), null, 'a correct ring strip must pass');

console.log('PASS planet maps present at every tier and credited to their real sources');
