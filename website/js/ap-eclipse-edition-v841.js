import { isEntitlementReady, verifyLicense } from './gumroad-unlock.js?v=942';
import { fmtDeg, houseOrdinal } from './eclipse-reading.js?v=942';

export const ARTWORK_WIDTH = 2400;
export const ARTWORK_HEIGHT = 3000;
export const EDITION_PRODUCT = 'eclipse-edition';

const BEATS = [
  ['Anchor', 'anchor'],
  ['Contact', 'contact'],
  ['What it touches', 'governs'],
  ['Reflection', 'question'],
  ['Close', 'close'],
];

const PALETTES = [
  { brass: '#93A8BF', ember: '#FF8EA8', ink: '#040812', blue: '#8BA9FF' },
  { brass: '#C9D6E3', ember: '#A897FF', ink: '#07101E', blue: '#79C7F2' },
  { brass: '#A5BCFF', ember: '#6FD0B3', ink: '#040812', blue: '#A897FF' },
];

const GLYPHS = {
  sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂',
  jupiter: '♃', saturn: '♄', uranus: '♅', neptune: '♆', pluto: '♇',
  asc: 'Asc', mc: 'MC',
};

const SIGN_MARKS = ['AR', 'TA', 'GE', 'CN', 'LE', 'VI', 'LI', 'SC', 'SG', 'CP', 'AQ', 'PI'];
const SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
const BODY_LABELS = {
  sun: 'Sun', moon: 'Moon', mercury: 'Mercury', venus: 'Venus', mars: 'Mars',
  jupiter: 'Jupiter', saturn: 'Saturn', uranus: 'Uranus', neptune: 'Neptune', pluto: 'Pluto',
  asc: 'Ascendant', mc: 'Midheaven',
};

function normaliseLongitude(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return ((number % 360) + 360) % 360;
}

function fnv1a(value) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function beatText(beat) {
  if (!beat) return '';
  const secondary = beat.secondary
    ? `${beat.secondary.mono || ''} ${beat.secondary.serif || ''}`
    : '';
  return [beat.mono, beat.serif, secondary].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

function beatRecord(title, beat) {
  return {
    title,
    mono: beat && beat.mono ? String(beat.mono) : '',
    serif: beat && beat.serif ? String(beat.serif) : '',
    secondaryMono: beat && beat.secondary && beat.secondary.mono ? String(beat.secondary.mono) : '',
    secondarySerif: beat && beat.secondary && beat.secondary.serif ? String(beat.secondary.serif) : '',
    text: beatText(beat),
  };
}

export function buildEclipsePlateModel({ reading, natal, eclipseLongitude }) {
  if (!reading || reading.gateSale || reading.quiet) return null;
  const placements = Object.entries(natal || {})
    .map(([key, value]) => [key, normaliseLongitude(value)])
    .filter(([, value]) => value != null)
    .sort(([a], [b]) => a.localeCompare(b));
  if (!placements.length) throw new Error('A computed chart is required for the natal-wheel plate.');

  const eclipse = normaliseLongitude(eclipseLongitude);
  if (eclipse == null) throw new Error('A computed eclipse longitude is required.');
  const beats = BEATS.map(([title, key]) => beatRecord(title, reading[key]));
  if (beats.some((beat) => !beat.text)) throw new Error('The five-beat eclipse reading is incomplete.');

  const signature = [
    eclipse.toFixed(5),
    placements.map(([key, value]) => `${key}:${value.toFixed(5)}`).join('|'),
    reading.share || beatText(reading.contact),
  ].join('::');
  const seed = fnv1a(signature);
  const fingerprint = `AP26-${seed.toString(16).toUpperCase().padStart(8, '0')}`;
  const palette = PALETTES[seed % PALETTES.length];

  return Object.freeze({
    width: ARTWORK_WIDTH,
    height: ARTWORK_HEIGHT,
    seed,
    fingerprint,
    eclipseLongitude: eclipse,
    eclipseDegree: reading.eclipseDegree || fmtDeg(eclipse, SIGNS),
    contactTarget: reading.contactTarget || null,
    contactAspect: reading.contactAspect || null,
    contactLabel: reading.contactLabel || null,
    contactTheme: reading.contactTheme || null,
    contactOrb: reading.contactOrb || null,
    contactHouse: reading.contactHouse || null,
    contactHouseOrd: reading.contactHouseOrd || (reading.contactHouse ? houseOrdinal(reading.contactHouse) : null),
    houseMeaning: reading.houseMeaning || null,
    houseNote: reading.houseNote || null,
    contactMonoCore: reading.contactMonoCore || (beats[1] && beats[1].mono) || '',
    governsCore: reading.governsCore || (beats[2] && beats[2].serif) || '',
    governsHouseLine: reading.governsHouseLine || null,
    secondaryContacts: Array.isArray(reading.secondaryContacts) ? reading.secondaryContacts : [],
    anchorNoPlace: reading.anchorNoPlace || (beats[0] && beats[0].mono) || '',
    anchorSerif: reading.anchor && reading.anchor.serif ? reading.anchor.serif : '',
    placements: placements.map(([key, longitude]) => ({
      key,
      longitude,
      glyph: GLYPHS[key] || key,
      label: BODY_LABELS[key] || key,
      degree: fmtDeg(longitude, SIGNS),
    })),
    beats,
    share: String(reading.share || beatText(reading.contact)),
    legal: String(reading.legal || 'Astrology is offered for reflection, not prediction or advice.'),
    palette,
  });
}

function rng(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function drawWrapped(ctx, text, x, y, maxWidth, lineHeight, maxLines = 8) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  let line = '';
  let lineNo = 0;
  for (const word of words) {
    const trial = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(trial).width > maxWidth) {
      ctx.fillText(line, x, y + lineNo * lineHeight);
      line = word;
      lineNo += 1;
      if (lineNo >= maxLines) return y + lineNo * lineHeight;
    } else {
      line = trial;
    }
  }
  if (line && lineNo < maxLines) {
    ctx.fillText(line, x, y + lineNo * lineHeight);
    lineNo += 1;
  }
  return y + lineNo * lineHeight;
}

function drawHairlineCircle(ctx, x, y, radius, colour, alpha, width = 2) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function lonToAngle(longitude) {
  return Math.PI - (normaliseLongitude(longitude) * Math.PI / 180);
}

// Smallest share text: 11 CSS px when the image is shown 360 px wide
// (2400-wide plate: 74 units; 2000-wide disc: 62 units).
const PLATE_MIN_PX = 74;
const DISC_MIN_PX = 62;

// The plate letters only in the site's own faces (website/fonts, declared in css/fonts.css),
// so its text measures the same wherever it is drawn. The Sun is drawn, not typed: none of the
// site's fonts has U+2609. IBM Plex Mono ships at weight 400 only, so mono text is drawn at 400:
// a heavier weight would be faked in browsers and could pick up a locally installed face elsewhere.
const PLATE_SANS = '"Schibsted Grotesk", Arial, sans-serif';
const PLATE_GLYPHS = '"AstroGlyph", "Schibsted Grotesk", Arial, sans-serif';
const PLATE_MONO = '"IBM Plex Mono", ui-monospace, Consolas, monospace';
const PLATE_SERIF = '"Cormorant Garamond", Georgia, serif';
// Short angle marks on the wheel, so their discs stay close to planet size.
const WHEEL_MARKS = { asc: 'AC', mc: 'MC' };

// Wheel geometry of the 2400 × 3000 plate (canvas units, centre at x/y).
// A leader keeps this far from every disc but its own.
const LEADER_CLEAR = 2;
// Points closer than this (degrees) are laid out together as one cluster.
const CLUSTER_GAP = 12;
// Radial step between the rings a disc may sit on.
const TRACK_STEP = 13;
const ECLIPSE_DOT_R = 11;
// The eclipse line: drawn this wide from level with the contact's disc to just past the outer ring.
// Only the contact's disc may sit on it; every other disc keeps clear of it.
const ECLIPSE_LINE_W = 7;
const ECLIPSE_LINE_FROM = 18;
const SUN_RING_R = 20;
const SUN_RING_W = 6;
// Beam search over one cluster: partial layouts kept per step, and spots tried per layout.
const BEAM_WIDTH = 60;
const BEAM_BRANCH = 40;
// The layout gives up (and falls back to exact degrees) after this many disc checks, a few
// seconds at most; no real chart tried comes near it.
const WHEEL_WORK_BUDGET = 15e6;
const OUT_OF_BUDGET = new Error('wheel layout budget');
// Disc sizing, tightest last: mark size, ink-to-rim padding, disc-to-disc gap and leader
// clearance. A cluster that will not fit first gets tighter discs at the 74-unit floor; only if
// that fails too (seven or more points packed into one sign) do its marks shrink below the floor
// (68, then 62 units) rather than leave their sign. No real chart tried has needed that.
const WHEEL_TIERS = Object.freeze([
  { px: PLATE_MIN_PX, pad: 3, gap: 6, clear: LEADER_CLEAR },
  { px: PLATE_MIN_PX, pad: 1, gap: 3, clear: 1 },
  { px: 68, pad: 1, gap: 3, clear: 1 },
  { px: 62, pad: 1, gap: 3, clear: 1 },
]);

export const PLATE_WHEEL = Object.freeze({
  x: ARTWORK_WIDTH / 2,
  y: 1760,
  outerR: 704,
  tickInner: 598,
  tickOuter: 692,
  // Sign marks sit in the zodiac ring, clear of every marker.
  signLabelR: 652,
  innerR: 130,
  // Exact-degree tick on the inner circle, then a leader from its tip to the marker's disc.
  degreeTick: 24,
  leaderStart: 156,
  gap: 6,
});

const sectorOf = (longitude) => Math.floor(normaliseLongitude(longitude) / 30);

function inkOf(ctx, text, fallbackPx) {
  const m = ctx.measureText(text);
  const fin = (v, d) => (Number.isFinite(v) ? v : d);
  return {
    left: fin(m.actualBoundingBoxLeft, m.width / 2),
    right: fin(m.actualBoundingBoxRight, m.width / 2),
    up: fin(m.actualBoundingBoxAscent, fallbackPx * 0.4),
    down: fin(m.actualBoundingBoxDescent, fallbackPx * 0.4),
  };
}

// How far a mark's drawn pixels reach from the centre of its ink box: rendered once on a
// scratch canvas, then cached. Without a scratch canvas it falls back to the box's half diagonal.
const INK_REACH = new Map();
function scratchCanvas(ctx, width, height) {
  try {
    if (typeof OffscreenCanvas === 'function') return new OffscreenCanvas(width, height);
    if (typeof document !== 'undefined' && document.createElement) {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      return canvas;
    }
    const Canvas = ctx.canvas && ctx.canvas.constructor;
    return Canvas ? new Canvas(width, height) : null;
  } catch {
    return null;
  }
}
function inkReach(ctx, text, font, ink) {
  const key = `${font}|${text}`;
  if (INK_REACH.has(key)) return INK_REACH.get(key);
  const pad = 6;
  const width = Math.ceil(ink.left + ink.right) + pad * 2;
  const height = Math.ceil(ink.up + ink.down) + pad * 2;
  let reach = Math.hypot((ink.left + ink.right) / 2, (ink.up + ink.down) / 2);
  const scratch = scratchCanvas(ctx, width, height);
  const sctx = scratch && scratch.getContext('2d');
  if (sctx && sctx.getImageData) {
    sctx.font = font;
    sctx.textAlign = 'center';
    sctx.textBaseline = 'middle';
    sctx.fillStyle = '#000';
    sctx.fillText(text, pad + ink.left, pad + ink.up);
    const cx = pad + (ink.left + ink.right) / 2;
    const cy = pad + (ink.up + ink.down) / 2;
    const data = sctx.getImageData(0, 0, width, height).data;
    let far = 0;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (data[(y * width + x) * 4 + 3] === 0) continue;
        far = Math.max(far, Math.hypot(x + 0.5 - cx, y + 0.5 - cy) + 0.71);
      }
    }
    if (far > 0) reach = far;
  }
  INK_REACH.set(key, reach);
  return reach;
}

// Ink boxes of the twelve sign marks (relative to the wheel centre), measured with the font
// they are drawn in. No marker disc may touch them.
export function signLabelBoxes(ctx, geometry = PLATE_WHEEL) {
  ctx.font = `400 ${PLATE_MIN_PX}px ${PLATE_MONO}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  return SIGN_MARKS.map((text, sign) => {
    const mid = lonToAngle(sign * 30 + 15);
    const x = Math.cos(mid) * geometry.signLabelR;
    const y = Math.sin(mid) * geometry.signLabelR;
    const ink = inkOf(ctx, text, PLATE_MIN_PX);
    return { text, x, y, x0: x - ink.left, x1: x + ink.right, y0: y - ink.up, y1: y + ink.down };
  });
}

function segmentCircleDistance(ax, ay, bx, by, cx, cy) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 ? Math.max(0, Math.min(1, ((cx - ax) * dx + (cy - ay) * dy) / len2)) : 0;
  return Math.hypot(ax + t * dx - cx, ay + t * dy - cy);
}

function segmentsCross(a, b) {
  const cross = (ox, oy, px, py, qx, qy) => (px - ox) * (qy - oy) - (py - oy) * (qx - ox);
  const d1 = cross(a.x0, a.y0, a.x1, a.y1, b.x0, b.y0);
  const d2 = cross(a.x0, a.y0, a.x1, a.y1, b.x1, b.y1);
  const d3 = cross(b.x0, b.y0, b.x1, b.y1, a.x0, a.y0);
  const d4 = cross(b.x0, b.y0, b.x1, b.y1, a.x1, a.y1);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

function rectCircleDistance(box, x, y) {
  const nx = Math.max(box.x0, Math.min(x, box.x1));
  const ny = Math.max(box.y0, Math.min(y, box.y1));
  return Math.hypot(nx - x, ny - y);
}

// Place the eclipse plate's wheel markers. Every disc is just big enough for its mark's drawn
// ink at the 74-unit floor. Each point is tried at its exact degree on every ring from the outer
// to the inner one first; only then is it fanned along the ring, half a degree at a time, and its
// disc centre never leaves its own sign. A spot is taken only if its disc clears every other disc
// and every sign mark, its leader (exact-degree tick → disc) passes under no other disc, and no
// two leaders cross, so crowded points fan out in degree order. Points are laid out cluster by
// cluster round the wheel (see solve below). `x`/`y` are relative to the wheel centre;
// `longitude` stays exact and `delta` is the fan-out in degrees.
// Where the drawn eclipse line starts (radius from the wheel centre): level with the contact's
// disc centre once that is placed, otherwise just outside the hub.
function eclipseLineStart(g, contact) {
  const hub = g.innerR + ECLIPSE_LINE_FROM;
  return contact ? Math.max(hub, Math.hypot(contact.x, contact.y)) : hub;
}

export function layoutWheelMarkers(ctx, model, geometry = PLATE_WHEEL) {
  const g = { ...PLATE_WHEEL, ...geometry };
  const obstacles = signLabelBoxes(ctx, g);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.letterSpacing = '0px';
  // A mark's font, ink offset and disc radius at one text size. The disc is sized to the mark's
  // real ink (not its box) plus `pad`, so crowded wheels still fit.
  const sized = (row, px, pad) => {
    const font = WHEEL_MARKS[row.key] ? `400 ${px}px ${PLATE_MONO}` : `${row.isContact ? 700 : 600} ${px}px ${PLATE_GLYPHS}`;
    // The drawn Sun is a ring of radius SUN_RING_R stroked SUN_RING_W wide.
    let reach = SUN_RING_R + SUN_RING_W / 2;
    let dx = 0;
    let dy = 0;
    if (!row.isSun) {
      ctx.font = font;
      const ink = inkOf(ctx, row.text, px);
      dx = -(ink.right - ink.left) / 2;
      dy = -(ink.down - ink.up) / 2;
      reach = inkReach(ctx, row.text, font, ink);
    }
    const r = Math.ceil(Math.max(row.isContact ? 30 : 26, reach + pad + (row.isContact ? 2 : 0)));
    const { spots, ...rest } = row;
    return { ...rest, px, font, dx, dy, r };
  };
  const rows = (model.placements || []).map((placement) => {
    const isContact = Boolean(model.contactTarget && placement.key === model.contactTarget);
    const isSun = placement.key === 'sun';
    const text = isSun ? '' : WHEEL_MARKS[placement.key] || GLYPHS[placement.key] || placement.key.slice(0, 2).toUpperCase();
    return sized(
      {
        key: placement.key,
        longitude: normaliseLongitude(placement.longitude),
        sign: sectorOf(placement.longitude),
        isContact,
        isSun,
        text,
      },
      WHEEL_TIERS[0].px,
      WHEEL_TIERS[0].pad,
    );
  });
  if (!rows.length) return [];
  // Every disc may sit anywhere from just inside the sign ring down to just above the degree
  // ticks, in TRACK_STEP rings; the outermost planet ring is drawn as a hairline.
  const clear = Math.min(...obstacles.map((b) => rectCircleDistance(b, 0, 0)));
  const rPlanet = Math.max(...rows.filter((row) => !WHEEL_MARKS[row.key]).map((row) => row.r), 26);
  const outerTrack = Math.floor(clear - g.gap - rPlanet);
  const radiiOf = (row) => {
    const list = [];
    for (let t = Math.floor(clear - g.gap - row.r); t - row.r >= g.leaderStart + g.gap; t -= TRACK_STEP) list.push(t);
    return list;
  };
  // The eclipse line runs out along the eclipse degree from level with the contact's disc (or
  // from the hub while the contact is not yet placed) to just past the outer ring. Only the
  // contact's own disc may sit on it; every other disc keeps clear of it.
  const eclipseAngle = Number.isFinite(model.eclipseLongitude) ? lonToAngle(model.eclipseLongitude) : null;
  const eclipseLineFor = (around) => {
    if (eclipseAngle === null) return null;
    const contact = around.find((p) => p.isContact);
    const from = eclipseLineStart(g, contact);
    return {
      x0: Math.cos(eclipseAngle) * from,
      y0: Math.sin(eclipseAngle) * from,
      x1: Math.cos(eclipseAngle) * (g.outerR + ECLIPSE_LINE_FROM),
      y1: Math.sin(eclipseAngle) * (g.outerR + ECLIPSE_LINE_FROM),
    };
  };
  const leaderOf = (row, spot) => {
    const ta = lonToAngle(row.longitude);
    const x0 = Math.cos(ta) * g.leaderStart;
    const y0 = Math.sin(ta) * g.leaderStart;
    const vx = spot.x - x0;
    const vy = spot.y - y0;
    const len = Math.hypot(vx, vy) || 1;
    return { x0, y0, x1: spot.x - (vx / len) * row.r, y1: spot.y - (vy / len) * row.r };
  };
  // Spots for one point, nearest first: its exact degree on each track (outer to inner), then
  // half a degree either way on each track, and so on, never past its own sign's edges.
  const candidates = (row) => {
    if (row.spots) return row.spots;
    // (Each sized copy of a row gets its own list, since the radii depend on the disc size.)
    const radii = radiiOf(row);
    const list = [];
    const lo = row.sign * 30;
    const hi = lo + 30;
    for (let s = 0; s <= 60; s += 1) {
      for (const delta of s ? [s / 2, -s / 2] : [0]) {
        const lon = row.longitude + delta;
        if (s && (lon < lo || lon >= hi)) continue;
        const a = lonToAngle(lon);
        for (const track of radii) list.push({ x: Math.cos(a) * track, y: Math.sin(a) * track, track, delta });
      }
    }
    row.spots = list;
    return list;
  };
  let work = 0;
  const fits = (row, spot, placed, eclipseLine) => {
    work += 1 + placed.length;
    if (work > WHEEL_WORK_BUDGET) throw OUT_OF_BUDGET;
    if (obstacles.some((b) => rectCircleDistance(b, spot.x, spot.y) < row.r + g.gap)) return false;
    if (eclipseLine && !row.isContact) {
      const clearance = (row.clear ?? LEADER_CLEAR) + ECLIPSE_LINE_W / 2;
      if (segmentCircleDistance(eclipseLine.x0, eclipseLine.y0, eclipseLine.x1, eclipseLine.y1, spot.x, spot.y) < row.r + clearance) return false;
    }
    const leader = leaderOf(row, spot);
    for (const p of placed) {
      const gap = Math.min(p.gap ?? g.gap, row.gap ?? g.gap);
      const clearance = Math.min(p.clear ?? LEADER_CLEAR, row.clear ?? LEADER_CLEAR);
      if (Math.hypot(p.x - spot.x, p.y - spot.y) < p.r + row.r + gap) return false;
      if (segmentCircleDistance(leader.x0, leader.y0, leader.x1, leader.y1, p.x, p.y) < p.r + clearance) return false;
      if (segmentCircleDistance(p.leader.x0, p.leader.y0, p.leader.x1, p.leader.y1, spot.x, spot.y) < row.r + clearance) return false;
      if (segmentsCross(leader, p.leader)) return false;
    }
    return true;
  };

  // Walk round the wheel in degree order, starting after the widest empty gap, and split the
  // points into clusters (runs closer than CLUSTER_GAP degrees). Each cluster fans out from one
  // anchor point: points after it may not sit before the previous disc, points before it may not
  // sit after the next one, so the discs keep the points' degree order and no leaders cross.
  const byDegree = rows.slice().sort((a, b) => a.longitude - b.longitude);
  let start = 0;
  let widest = -1;
  byDegree.forEach((row, i) => {
    const prev = byDegree[(i - 1 + byDegree.length) % byDegree.length];
    const gapDeg = (row.longitude - prev.longitude + 360) % 360 || 360;
    if (gapDeg > widest) {
      widest = gapDeg;
      start = i;
    }
  });
  const order = byDegree.slice(start).concat(byDegree.slice(0, start));
  const origin = order[0].longitude;
  const clusters = [];
  order.forEach((row) => {
    row.along = (row.longitude - origin + 360) % 360;
    const last = clusters.length ? clusters[clusters.length - 1] : null;
    if (last && row.along - last[last.length - 1].along < CLUSTER_GAP) last.push(row);
    else clusters.push([row]);
  });

  const placed = [];
  // Anchors to try: the contact first if the cluster holds it, otherwise middle-out.
  const anchorsOf = (cluster) => {
    const contact = cluster.findIndex((row) => row.isContact);
    const mid = contact >= 0 ? contact : Math.floor((cluster.length - 1) / 2);
    const list = [mid];
    for (let k = 1; list.length < cluster.length; k += 1) {
      if (mid + k < cluster.length) list.push(mid + k);
      if (mid - k >= 0) list.push(mid - k);
    }
    return list;
  };
  // Beam search over one cluster: place its points one at a time (anchor, then outwards), keep
  // the best few partial layouts at each step, scored by how far the fan has spread so far.
  const layoutCluster = (cluster) => {
    const solutions = [];
    for (const anchor of anchorsOf(cluster)) {
      const sequence = [anchor];
      for (let i = anchor + 1; i < cluster.length; i += 1) sequence.push(i);
      for (let i = anchor - 1; i >= 0; i -= 1) sequence.push(i);
      let beam = [{ items: [], after: -Infinity, before: Infinity, cost: 0 }];
      for (const index of sequence) {
        const row = cluster[index];
        const next = [];
        for (const state of beam) {
          const around = placed.concat(state.items);
          const eclipseLine = eclipseLineFor(around);
          let taken = 0;
          // At most two radii per angle, so the beam keeps a spread of angles.
          const perDelta = new Map();
          for (const spot of candidates(row)) {
            if ((perDelta.get(spot.delta) || 0) >= 2) continue;
            const along = row.along + spot.delta;
            if (index > anchor && along < state.after - 1e-9) continue;
            if (index < anchor && along > state.before + 1e-9) continue;
            if (!fits(row, spot, around, eclipseLine)) continue;
            const after = index >= anchor ? along : state.after;
            const before = index <= anchor ? along : state.before;
            const spread = (index === anchor ? 0 : Math.abs(along - row.along)) + Math.abs(spot.delta);
            next.push({
              items: state.items.concat({ ...row, ...spot, leader: leaderOf(row, spot) }),
              after,
              before,
              cost: state.cost + spread,
            });
            taken += 1;
            if (taken >= BEAM_BRANCH) break;
            perDelta.set(spot.delta, (perDelta.get(spot.delta) || 0) + 1);
          }
        }
        next.sort((p, q) => p.cost - q.cost);
        beam = next.slice(0, BEAM_WIDTH);
        if (!beam.length) break;
      }
      for (const state of beam) if (state.items.length === cluster.length) solutions.push(state);
      if (solutions.length) break;
    }
    return solutions.sort((p, q) => p.cost - q.cost);
  };
  // A cluster that will not fit is tried again with tighter discs, then smaller marks
  // (WHEEL_TIERS), before it is merged with the cluster before it and the pair is laid out afresh.
  const tierCache = new Map();
  const atTier = (row, t) => {
    if (t === 0) return row;
    const key = `${row.key}|${t}`;
    if (!tierCache.has(key)) {
      const tier = WHEEL_TIERS[t];
      tierCache.set(key, { ...sized(row, tier.px, tier.pad), gap: tier.gap, clear: tier.clear, tier: t });
    }
    return tierCache.get(key);
  };
  const solve = () => {
    const done = [];
    for (let c = 0; c < clusters.length; c += 1) {
      let cluster = clusters[c];
      for (;;) {
        let best = null;
        for (let t = 0; t < WHEEL_TIERS.length && !best; t += 1) [best] = layoutCluster(cluster.map((row) => atTier(row, t)));
        if (best) {
          placed.push(...best.items);
          done.push({ cluster, count: best.items.length });
          break;
        }
        if (!done.length) return false;
        const prev = done.pop();
        placed.length -= prev.count;
        cluster = prev.cluster.concat(cluster);
      }
    }
    return true;
  };
  let solved = false;
  try {
    solved = solve();
  } catch (error) {
    if (error !== OUT_OF_BUDGET) throw error;
  }
  if (!solved) {
    // No layout within the search budget: exact degrees on the outer track. Only synthetic charts
    // with nine points in one sign have needed this; no real chart tried has.
    placed.length = 0;
    for (const row of order) {
      const a = lonToAngle(row.longitude);
      const spot = { x: Math.cos(a) * outerTrack, y: Math.sin(a) * outerTrack, track: outerTrack, delta: 0 };
      placed.push({ ...row, ...spot, leader: leaderOf(row, spot), fallback: true });
    }
  }
  placed.outerTrack = outerTrack;
  placed.work = work;
  return placed;
}

export function renderEclipseArtwork(model, canvas = document.createElement('canvas')) {
  if (!model) throw new Error('A direct eclipse-contact model is required.');
  canvas.width = model.width;
  canvas.height = model.height;
  canvas.dataset.editionFingerprint = model.fingerprint;
  const ctx = canvas.getContext('2d');
  const random = rng(model.seed);
  const { brass, ember, ink, blue } = model.palette;

  const background = ctx.createLinearGradient(0, 0, model.width, model.height);
  background.addColorStop(0, '#040812');
  background.addColorStop(0.42, ink);
  background.addColorStop(1, '#101D30');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, model.width, model.height);

  for (let i = 0; i < 480; i += 1) {
    const x = random() * model.width;
    const y = random() * model.height * 0.62;
    const radius = 0.6 + random() * 2.2;
    ctx.globalAlpha = 0.14 + random() * 0.55;
    ctx.fillStyle = random() > 0.86 ? brass : '#EEF4FA';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    if (random() > 0.97 && radius > 1.8) {
      ctx.globalAlpha = 0.22;
      ctx.strokeStyle = '#EEF4FA';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - 9, y);
      ctx.lineTo(x + 9, y);
      ctx.moveTo(x, y - 9);
      ctx.lineTo(x, y + 9);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;

  const ringX = model.width * 0.5;
  const ringY = 780;
  const eclipseRadius = 248;
  const moonShift = ((model.seed % 7) - 3) * 7;
  const corona = ctx.createRadialGradient(ringX, ringY, eclipseRadius * 0.7, ringX, ringY, eclipseRadius * 2.05);
  corona.addColorStop(0, 'rgba(245,220,157,.98)'); // palette-physical: Sun corona
  corona.addColorStop(0.22, 'rgba(217,182,111,.42)'); // palette-physical: Sun corona
  corona.addColorStop(1, 'rgba(217,182,111,0)'); // palette-physical: Sun corona
  ctx.fillStyle = corona;
  ctx.beginPath();
  ctx.arc(ringX, ringY, eclipseRadius * 2.05, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(ringX, ringY);
  ctx.rotate((model.seed % 360) * Math.PI / 180);
  for (let i = 0; i < 56; i += 1) {
    const angle = (i / 56) * Math.PI * 2 + (random() - 0.5) * 0.05;
    const inner = eclipseRadius * (1.01 + random() * 0.03);
    const outer = eclipseRadius * (1.22 + random() * 0.55);
    ctx.strokeStyle = i % 8 === 0 ? '#d9b66f' : '#efe2bd'; // palette-physical: solar corona
    ctx.globalAlpha = 0.1 + random() * 0.32;
    ctx.lineWidth = 1.5 + random() * 4.5;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
    ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
    ctx.stroke();
  }
  ctx.restore();
  ctx.globalAlpha = 1;

  const sunFill = ctx.createRadialGradient(ringX, ringY, 20, ringX, ringY, eclipseRadius);
  sunFill.addColorStop(0, '#f3e2b0'); // palette-physical: Sun surface
  sunFill.addColorStop(0.55, '#d9b66f'); // palette-physical: Sun surface
  sunFill.addColorStop(1, '#8a5a28'); // palette-physical: Sun surface
  ctx.fillStyle = sunFill;
  ctx.beginPath();
  ctx.arc(ringX, ringY, eclipseRadius, 0, Math.PI * 2);
  ctx.fill();

  const moon = ctx.createRadialGradient(ringX - 80 + moonShift, ringY - 90, 18, ringX + moonShift, ringY, eclipseRadius);
  moon.addColorStop(0, '#1a202b');
  moon.addColorStop(0.58, '#07090e');
  moon.addColorStop(1, '#010205');
  ctx.fillStyle = moon;
  ctx.beginPath();
  ctx.arc(ringX + moonShift, ringY, eclipseRadius - 6, 0, Math.PI * 2);
  ctx.fill();
  drawHairlineCircle(ctx, ringX, ringY, eclipseRadius + 8, brass, 0.88, 3);

  const g = PLATE_WHEEL;
  const wheelX = g.x;
  const wheelY = g.y;
  const { outerR, innerR, tickInner, tickOuter } = g;

  const wheelWash = ctx.createRadialGradient(wheelX, wheelY, innerR, wheelX, wheelY, outerR + 40);
  wheelWash.addColorStop(0, 'rgba(7,16,30,.55)');
  wheelWash.addColorStop(1, 'rgba(7,16,30,0)');
  ctx.fillStyle = wheelWash;
  ctx.beginPath();
  ctx.arc(wheelX, wheelY, outerR + 48, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(wheelX, wheelY);
  // Markers first (layout only): the planet ring is drawn at the outer track.
  const markers = layoutWheelMarkers(ctx, model, g);
  const planetR = markers.outerTrack || 470;
  ctx.restore();

  drawHairlineCircle(ctx, wheelX, wheelY, outerR, brass, 0.78, 3);
  drawHairlineCircle(ctx, wheelX, wheelY, tickInner, blue, 0.42, 2);
  drawHairlineCircle(ctx, wheelX, wheelY, planetR, brass, 0.28, 1.5);
  drawHairlineCircle(ctx, wheelX, wheelY, innerR, brass, 0.55, 2);

  ctx.save();
  ctx.translate(wheelX, wheelY);
  for (let sign = 0; sign < 12; sign += 1) {
    const cusp = lonToAngle(sign * 30);
    ctx.strokeStyle = brass;
    ctx.globalAlpha = sign % 3 === 0 ? 0.7 : 0.28;
    ctx.lineWidth = sign % 3 === 0 ? 3 : 1.5;
    ctx.beginPath();
    ctx.moveTo(Math.cos(cusp) * tickInner, Math.sin(cusp) * tickInner);
    ctx.lineTo(Math.cos(cusp) * tickOuter, Math.sin(cusp) * tickOuter);
    ctx.stroke();
  }
  // Sign marks sit in the zodiac ring, between the cusp ticks, at the share floor.
  ctx.globalAlpha = 0.82;
  ctx.fillStyle = brass;
  signLabelBoxes(ctx, g).forEach((label) => ctx.fillText(label.text, label.x, label.y));

  const eclipseAngle = lonToAngle(model.eclipseLongitude);
  ctx.strokeStyle = ember;
  ctx.globalAlpha = 0.95;
  ctx.lineWidth = ECLIPSE_LINE_W;
  ctx.beginPath();
  // Drawn beneath the discs, from level with the contact's disc out past the ring; the layout
  // keeps every other disc clear of it.
  const lineFrom = eclipseLineStart(g, markers.find((m) => m.isContact));
  ctx.moveTo(Math.cos(eclipseAngle) * lineFrom, Math.sin(eclipseAngle) * lineFrom);
  ctx.lineTo(Math.cos(eclipseAngle) * (outerR + ECLIPSE_LINE_FROM), Math.sin(eclipseAngle) * (outerR + ECLIPSE_LINE_FROM));
  ctx.stroke();
  ctx.fillStyle = ember;
  ctx.beginPath();
  ctx.arc(Math.cos(eclipseAngle) * (outerR + ECLIPSE_LINE_FROM), Math.sin(eclipseAngle) * (outerR + ECLIPSE_LINE_FROM), ECLIPSE_DOT_R, 0, Math.PI * 2);
  ctx.fill();

  // Every point keeps a tick at its exact degree on the inner circle, and a leader from the tip
  // of that tick to its disc (straight out when the disc sits at the exact degree).
  markers.forEach((m) => {
    const ta = lonToAngle(m.longitude);
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = m.isContact ? ember : brass;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(Math.cos(ta) * innerR, Math.sin(ta) * innerR);
    ctx.lineTo(Math.cos(ta) * (innerR + g.degreeTick), Math.sin(ta) * (innerR + g.degreeTick));
    ctx.stroke();
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(m.leader.x0, m.leader.y0);
    ctx.lineTo(m.leader.x1, m.leader.y1);
    ctx.stroke();
  });
  markers.forEach((m) => {
    ctx.globalAlpha = 1;
    ctx.fillStyle = m.isContact ? ember : ink;
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = brass;
    ctx.lineWidth = m.isContact ? 3 : 1.5;
    ctx.globalAlpha = m.isContact ? 1 : 0.85;
    ctx.stroke();
    ctx.globalAlpha = 1;
    const markColour = m.isContact ? '#EEF4FA' : brass;
    if (m.isSun) {
      // The Sun's mark (a ring with a centre dot), drawn so it looks the same everywhere.
      ctx.strokeStyle = markColour;
      ctx.lineWidth = SUN_RING_W;
      ctx.beginPath();
      ctx.arc(m.x, m.y, SUN_RING_R, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = markColour;
      ctx.beginPath();
      ctx.arc(m.x, m.y, 5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = markColour;
      ctx.font = m.font;
      ctx.fillText(m.text, m.x + m.dx, m.y + m.dy);
    }
  });
  ctx.restore();
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  ctx.fillStyle = brass;
  ctx.font = `600 ${PLATE_MIN_PX}px ${PLATE_SANS}`;
  ctx.letterSpacing = '4px';
  ctx.fillText('ASTROPRECISE  /  12 AUGUST 2026', 150, 200);
  ctx.letterSpacing = '0px';
  ctx.fillStyle = '#EEF4FA';
  ctx.font = `600 112px ${PLATE_SERIF}`;
  drawWrapped(ctx, 'Your natal wheel at this eclipse.', 150, 330, 2100, 120, 2);

  ctx.fillStyle = 'rgba(165,188,255,.82)';
  ctx.font = `400 ${PLATE_MIN_PX}px ${PLATE_MONO}`;
  ctx.fillText(`${model.fingerprint}  /  ${model.eclipseLongitude.toFixed(3)}°`, 150, model.height - 440);
  ctx.fillStyle = '#C9D6E3';
  ctx.font = `500 ${PLATE_MIN_PX}px ${PLATE_SANS}`;
  drawWrapped(ctx, model.share, 150, model.height - 350, 2100, 86, 2);
  ctx.fillStyle = 'rgba(147,168,191,.62)';
  ctx.font = `400 ${PLATE_MIN_PX}px ${PLATE_SANS}`;
  drawWrapped(ctx, 'Computed on your device · reflective astrology, not prediction or advice', 150, model.height - 170, 2100, 84, 2);
  return canvas;
}

export function renderEclipseDisc(model, canvas = document.createElement('canvas'), { captions = true, portrait = false } = {}) {
  canvas.width = 2000;
  canvas.height = portrait ? 2828 : 1100;
  const ctx = canvas.getContext('2d');
  const random = rng(model.seed);
  const { brass, ember, ink } = model.palette;
  ctx.fillStyle = ink;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < (portrait ? 320 : 180); i += 1) {
    ctx.globalAlpha = 0.12 + random() * 0.5;
    ctx.fillStyle = random() > 0.85 ? brass : '#EEF4FA';
    ctx.beginPath();
    ctx.arc(random() * canvas.width, random() * canvas.height, 0.6 + random() * 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  const cx = canvas.width * 0.5;
  const cy = portrait ? canvas.height * 0.4 : canvas.height * 0.52;
  const radius = portrait ? 430 : 310;
  const moonShift = ((model.seed % 7) - 3) * 8;
  const corona = ctx.createRadialGradient(cx, cy, radius * 0.7, cx, cy, radius * 2.1);
  corona.addColorStop(0, 'rgba(245,220,157,.98)'); // palette-physical: Sun corona
  corona.addColorStop(0.24, 'rgba(217,182,111,.4)'); // palette-physical: Sun corona
  corona.addColorStop(1, 'rgba(217,182,111,0)'); // palette-physical: Sun corona
  ctx.fillStyle = corona;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 2.1, 0, Math.PI * 2);
  ctx.fill();
  const sunFill = ctx.createRadialGradient(cx, cy, 20, cx, cy, radius);
  sunFill.addColorStop(0, '#f3e2b0'); // palette-physical: Sun surface
  sunFill.addColorStop(0.55, '#d9b66f'); // palette-physical: Sun surface
  sunFill.addColorStop(1, '#8a5a28'); // palette-physical: Sun surface
  ctx.fillStyle = sunFill;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  const moon = ctx.createRadialGradient(cx - 80 + moonShift, cy - 90, 18, cx + moonShift, cy, radius);
  moon.addColorStop(0, '#1a202b');
  moon.addColorStop(0.58, '#07090e');
  moon.addColorStop(1, '#010205');
  ctx.fillStyle = moon;
  ctx.beginPath();
  ctx.arc(cx + moonShift, cy, radius - 6, 0, Math.PI * 2);
  ctx.fill();
  drawHairlineCircle(ctx, cx, cy, radius + 8, brass, 0.88, 3);
  if (portrait) {
    const fade = ctx.createLinearGradient(0, canvas.height * 0.58, 0, canvas.height);
    fade.addColorStop(0, 'rgba(4,8,18,0)');
    fade.addColorStop(1, 'rgba(4,8,18,.94)');
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  if (captions) {
    ctx.fillStyle = brass;
    ctx.font = `600 ${DISC_MIN_PX}px ${PLATE_SANS}`;
    drawWrapped(ctx, '12 AUGUST 2026  ·  GREATEST 17:45:51 UTC  ·  ' + (model.eclipseDegree || `${model.eclipseLongitude.toFixed(3)}°`), 64, 96, canvas.width - 128, 72, 2);
    ctx.fillStyle = ember;
    ctx.font = `400 ${DISC_MIN_PX}px ${PLATE_MONO}`;
    ctx.fillText(model.fingerprint, 64, canvas.height - 48);
  }
  return canvas;
}

export function renderAspectFigure(model, canvas = document.createElement('canvas'), { captions = false } = {}) {
  canvas.width = 1600;
  canvas.height = 2400;
  const ctx = canvas.getContext('2d');
  const { brass, ember, ink, blue } = model.palette;
  ctx.fillStyle = ink;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const cx = canvas.width * 0.5;
  const cy = canvas.height * 0.5;
  const radius = 680;
  drawHairlineCircle(ctx, cx, cy, radius, brass, 0.7, 3);
  drawHairlineCircle(ctx, cx, cy, radius * 0.78, blue, 0.35, 1.5);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let sign = 0; sign < 12; sign += 1) {
    const cusp = lonToAngle(sign * 30);
    ctx.strokeStyle = brass;
    ctx.globalAlpha = sign % 3 === 0 ? 0.7 : 0.25;
    ctx.lineWidth = sign % 3 === 0 ? 3 : 1.5;
    ctx.beginPath();
    ctx.moveTo(Math.cos(cusp) * radius * 0.92, Math.sin(cusp) * radius * 0.92);
    ctx.lineTo(Math.cos(cusp) * radius, Math.sin(cusp) * radius);
    ctx.stroke();
    const mid = lonToAngle(sign * 30 + 15);
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = brass;
    ctx.font = '600 22px ui-monospace, Consolas, monospace';
    ctx.fillText(SIGN_MARKS[sign], Math.cos(mid) * (radius + 40), Math.sin(mid) * (radius + 40));
  }
  const eclipseAngle = lonToAngle(model.eclipseLongitude);
  const contact = (model.placements || []).find((row) => row.key === model.contactTarget);
  const aspect = model.contactAspect || 'conjunction';
  const orbRad = (6 * Math.PI) / 180;
  ctx.fillStyle = 'rgba(255,142,168,.18)';
  ctx.beginPath();
  ctx.moveTo(Math.cos(eclipseAngle - orbRad) * radius, Math.sin(eclipseAngle - orbRad) * radius);
  ctx.arc(0, 0, radius, eclipseAngle - orbRad, eclipseAngle + orbRad, false);
  ctx.lineTo(Math.cos(eclipseAngle + orbRad) * (radius * 0.72), Math.sin(eclipseAngle + orbRad) * (radius * 0.72));
  ctx.arc(0, 0, radius * 0.72, eclipseAngle + orbRad, eclipseAngle - orbRad, true);
  ctx.closePath();
  ctx.fill();
  if (aspect === 'opposition' && contact) {
    const contactAngle = lonToAngle(contact.longitude);
    ctx.strokeStyle = ember;
    ctx.globalAlpha = 0.95;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(Math.cos(eclipseAngle) * radius, Math.sin(eclipseAngle) * radius);
    ctx.lineTo(Math.cos(contactAngle) * radius, Math.sin(contactAngle) * radius);
    ctx.stroke();
  } else if (aspect === 'square' && contact) {
    const contactAngle = lonToAngle(contact.longitude);
    ctx.strokeStyle = ember;
    ctx.globalAlpha = 0.95;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(Math.cos(eclipseAngle) * radius, Math.sin(eclipseAngle) * radius);
    ctx.lineTo(0, 0);
    ctx.lineTo(Math.cos(contactAngle) * radius * 0.78, Math.sin(contactAngle) * radius * 0.78);
    ctx.stroke();
    ctx.strokeStyle = brass;
    ctx.lineWidth = 2;
    const mark = 48;
    ctx.beginPath();
    ctx.moveTo(Math.cos(eclipseAngle) * mark, Math.sin(eclipseAngle) * mark);
    ctx.lineTo(Math.cos(eclipseAngle) * mark + Math.cos(contactAngle) * mark, Math.sin(eclipseAngle) * mark + Math.sin(contactAngle) * mark);
    ctx.lineTo(Math.cos(contactAngle) * mark, Math.sin(contactAngle) * mark);
    ctx.stroke();
  } else {
    ctx.strokeStyle = ember;
    ctx.globalAlpha = 0.95;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(0, 0, radius, eclipseAngle - 0.04, eclipseAngle + 0.04);
    ctx.stroke();
    if (contact) {
      const contactAngle = lonToAngle(contact.longitude);
      ctx.strokeStyle = brass;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.78, contactAngle - 0.05, contactAngle + 0.05);
      ctx.stroke();
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(contactAngle) * (radius * 0.78 - 18), Math.sin(contactAngle) * (radius * 0.78 - 18));
      ctx.lineTo(Math.cos(eclipseAngle) * (radius - 18), Math.sin(eclipseAngle) * (radius - 18));
      ctx.stroke();
    }
  }
  ctx.fillStyle = ember;
  ctx.beginPath();
  ctx.arc(Math.cos(eclipseAngle) * radius, Math.sin(eclipseAngle) * radius, 14, 0, Math.PI * 2);
  ctx.fill();
  if (contact) {
    const contactAngle = lonToAngle(contact.longitude);
    const cr = aspect === 'conjunction' ? radius * 0.78 : radius * 0.78;
    ctx.fillStyle = ember;
    ctx.beginPath();
    ctx.arc(Math.cos(contactAngle) * cr, Math.sin(contactAngle) * cr, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#EEF4FA';
    ctx.font = '700 26px "Schibsted Grotesk", Arial, sans-serif';
    ctx.fillText(contact.glyph || GLYPHS[contact.key] || '', Math.cos(contactAngle) * cr, Math.sin(contactAngle) * cr + 1);
  }
  ctx.restore();
  if (captions && model.contactOrb) {
    ctx.fillStyle = brass;
    ctx.font = '600 28px ui-monospace, Consolas, monospace';
    ctx.fillText(model.contactOrb, 64, canvas.height - 48);
  }
  return canvas;
}

export function renderNatalWheelFigure(model, canvas = document.createElement('canvas')) {
  canvas.width = 2000;
  canvas.height = 2000;
  const ctx = canvas.getContext('2d');
  const { brass, ember, ink, blue } = model.palette;
  ctx.fillStyle = ink;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const cx = canvas.width * 0.5;
  const cy = canvas.height * 0.52;
  const outerR = 780;
  const innerR = 220;
  const planetR = 560;
  drawHairlineCircle(ctx, cx, cy, outerR, brass, 0.78, 3);
  drawHairlineCircle(ctx, cx, cy, planetR, brass, 0.28, 1.5);
  drawHairlineCircle(ctx, cx, cy, innerR, brass, 0.55, 2);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let sign = 0; sign < 12; sign += 1) {
    const cusp = lonToAngle(sign * 30);
    ctx.strokeStyle = brass;
    ctx.globalAlpha = sign % 3 === 0 ? 0.7 : 0.28;
    ctx.lineWidth = sign % 3 === 0 ? 3 : 1.5;
    ctx.beginPath();
    ctx.moveTo(Math.cos(cusp) * (outerR - 48), Math.sin(cusp) * (outerR - 48));
    ctx.lineTo(Math.cos(cusp) * outerR, Math.sin(cusp) * outerR);
    ctx.stroke();
    const mid = lonToAngle(sign * 30 + 15);
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = brass;
    ctx.font = '600 22px ui-monospace, Consolas, monospace';
    ctx.fillText(SIGN_MARKS[sign], Math.cos(mid) * (outerR + 36), Math.sin(mid) * (outerR + 36));
  }
  const eclipseAngle = lonToAngle(model.eclipseLongitude);
  ctx.strokeStyle = ember;
  ctx.globalAlpha = 0.95;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(Math.cos(eclipseAngle) * (innerR + 12), Math.sin(eclipseAngle) * (innerR + 12));
  ctx.lineTo(Math.cos(eclipseAngle) * (outerR + 12), Math.sin(eclipseAngle) * (outerR + 12));
  ctx.stroke();
  (model.placements || []).forEach((placement) => {
    const angle = lonToAngle(placement.longitude);
    const x = Math.cos(angle) * planetR;
    const y = Math.sin(angle) * planetR;
    const isContact = model.contactTarget && placement.key === model.contactTarget;
    ctx.globalAlpha = 1;
    ctx.fillStyle = isContact ? ember : ink;
    ctx.beginPath();
    ctx.arc(x, y, isContact ? 36 : 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = brass;
    ctx.lineWidth = isContact ? 3 : 1.5;
    ctx.stroke();
    ctx.fillStyle = isContact ? '#EEF4FA' : brass;
    ctx.font = isContact
      ? '700 26px "Schibsted Grotesk", Arial, sans-serif'
      : '600 22px "Schibsted Grotesk", Arial, sans-serif';
    ctx.fillText(placement.glyph || GLYPHS[placement.key] || '', x, y + 1);
  });
  ctx.restore();
  return canvas;
}

export function renderHouseFigure(model, canvas = document.createElement('canvas')) {
  const asc = (model.placements || []).find((row) => row.key === 'asc');
  if (!asc || !model.contactHouse) {
    canvas.width = 1;
    canvas.height = 1;
    return canvas;
  }
  canvas.width = 1600;
  canvas.height = 2400;
  const ctx = canvas.getContext('2d');
  const { brass, ember, ink } = model.palette;
  ctx.fillStyle = ink;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const cx = canvas.width * 0.5;
  const cy = canvas.height * 0.5;
  const radius = 680;
  ctx.save();
  ctx.translate(cx, cy);
  for (let house = 1; house <= 12; house += 1) {
    const start = lonToAngle(asc.longitude + (house - 1) * 30);
    const end = lonToAngle(asc.longitude + house * 30);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, start, end, true);
    ctx.closePath();
    ctx.fillStyle = house === Number(model.contactHouse) ? 'rgba(255,142,168,.42)' : 'rgba(139,169,255,.09)';
    ctx.fill();
    ctx.strokeStyle = brass;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    const mid = lonToAngle(asc.longitude + (house - 1) * 30 + 15);
    ctx.globalAlpha = house === Number(model.contactHouse) ? 1 : 0.7;
    ctx.fillStyle = house === Number(model.contactHouse) ? ember : brass;
    ctx.font = '600 28px ui-monospace, Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(house), Math.cos(mid) * radius * 0.62, Math.sin(mid) * radius * 0.62);
  }
  ctx.restore();
  return canvas;
}

export function renderEclipsePrintAssets(model) {
  const housesCanvas = renderHouseFigure(model);
  return {
    disc: renderEclipseDisc(model, undefined, { captions: false, portrait: true }).toDataURL('image/png'),
    aspect: renderAspectFigure(model).toDataURL('image/png'),
    wheel: renderNatalWheelFigure(model).toDataURL('image/png'),
    houses: housesCanvas.width > 1 ? housesCanvas.toDataURL('image/png') : '',
  };
}

function canvasBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('The artwork could not be exported.'));
    }, 'image/png');
  });
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function beatSectionHtml(beat, index) {
  const parts = [];
  if (beat.mono) parts.push(`<p class="ap-eclipse-edition__mono">${escapeHtml(beat.mono)}</p>`);
  if (beat.serif) parts.push(`<p class="ap-eclipse-edition__serif">${escapeHtml(beat.serif)}</p>`);
  if (beat.secondaryMono) parts.push(`<p class="ap-eclipse-edition__mono">${escapeHtml(beat.secondaryMono)}</p>`);
  if (beat.secondarySerif) parts.push(`<p class="ap-eclipse-edition__serif ap-eclipse-edition__secondary">${escapeHtml(beat.secondarySerif)}</p>`);
  if (!parts.length && beat.text) parts.push(`<p>${escapeHtml(beat.text)}</p>`);
  return `<section class="beat"><small>0${index + 1} / ${escapeHtml(beat.title)}</small>${parts.join('')}</section>`;
}

function fullReadingHtml(model) {
  return model.beats.map((beat, index) => beatSectionHtml(beat, index)).join('');
}

function placementTableHtml(model) {
  const rows = (model.placements || []).map((row) => {
    const mark = row.key === model.contactTarget ? ' class="is-contact"' : '';
    return `<tr${mark}><th>${escapeHtml(row.glyph || '')} ${escapeHtml(row.label || row.key)}</th><td>${escapeHtml(row.degree || '')}</td></tr>`;
  }).join('');
  return `<table class="placements"><caption>Natal longitudes used for this plate</caption><thead><tr><th>Point</th><th>Ecliptic position</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function printFontCss(fontBase) {
  if (!fontBase) return '';
  const u = (file) => new URL(file, fontBase).href;
  return `@font-face{font-family:'Cormorant Garamond';font-weight:600;font-style:normal;src:url('${u('fonts/cormorant-garamond-normal-600.woff2')}') format('woff2')}
@font-face{font-family:'Cormorant Garamond';font-weight:400;font-style:italic;src:url('${u('fonts/cormorant-garamond-italic-400.woff2')}') format('woff2')}
@font-face{font-family:'IBM Plex Mono';font-weight:400;src:url('${u('fonts/ibm-plex-mono-normal-400.woff2')}') format('woff2')}
@font-face{font-family:'Schibsted Grotesk';font-weight:600;src:url('${u('fonts/schibsted-grotesk-latin-var.woff2')}') format('woff2')}`;
}

export function cleanGeometrySvg(svg) {
  return String(svg || '')
    .replace(/<text[^>]*>[^<]*CENTRES 33px[^<]*<\/text>/g, '')
    .replace(/The Moon covers most of your Sun\./g, 'A deep partial from London — not totality.')
    .replace(/<text[^>]*>ECLIPSE POINT[^<]*<\/text>/g, '');
}

function secondaryBlockHtml(model) {
  const rows = model.secondaryContacts || [];
  if (!rows.length) return '';
  const items = rows.map((row) => {
    const note = String(row.note || '').replace(/^./, (ch) => ch.toUpperCase());
    return `<p class="fact">${escapeHtml(note)}. ${escapeHtml(row.label)} is read here as ${escapeHtml(row.theme)} (${escapeHtml(row.aspectLabel)}, ${escapeHtml(row.orbText)}).</p>`;
  }).join('');
  const glance = model.beats[1] && model.beats[1].secondarySerif
    ? `<p class="reflect">${escapeHtml(model.beats[1].secondarySerif)}</p>`
    : '';
  return `${items}${glance}`;
}

function beatsLetterHtml(model) {
  return (model.beats || []).map((beat, index) => {
    const serif = beat.serif || '';
    const mono = index === 0 ? (model.anchorNoPlace || beat.mono || '') : (beat.mono || '');
    if (!serif && !mono) return '';
    return `<article class="letter-beat"><small>0${index + 1} · ${escapeHtml(beat.title || '')}</small>`
      + (mono ? `<p class="fact">${escapeHtml(mono)}</p>` : '')
      + (serif ? `<p class="reflect">${escapeHtml(serif)}</p>` : '')
      + '</article>';
  }).join('');
}

export function buildEclipsePrintDocument(model, images = {}, { printOnLoad = true, demo = false, fontBase = '' } = {}) {
  const disc = images.disc || '';
  const aspect = images.aspect || '';
  const wheel = images.wheel || '';
  const houses = images.houses || '';
  const geometry = images.geometry || '';
  const fp = escapeHtml(model.fingerprint);
  const contactLabel = escapeHtml(model.contactLabel || 'Natal point');
  const contactAspect = escapeHtml(model.contactAspect || 'contact');
  const contactOrb = escapeHtml(model.contactOrb || '');
  const eclipseDegree = escapeHtml(model.eclipseDegree || `${model.eclipseLongitude.toFixed(3)}°`);
  const question = escapeHtml((model.beats[3] && model.beats[3].serif) || '');
  const houseTitle = model.contactHouseOrd
    ? `${escapeHtml(model.contactHouseOrd)} house`
    : 'The question';
  const houseFact = model.contactHouseOrd
    ? `${escapeHtml(model.houseMeaning || '')}${model.houseNote ? ` · ${escapeHtml(model.houseNote)}` : ''}`
    : 'No birth time was given, so houses are not claimed.';
  return `<!doctype html><html><head><meta charset="utf-8"><title>Your Eclipse Edition ${fp}</title>
<style>
${printFontCss(fontBase)}
@page{size:A4;margin:0}
*{box-sizing:border-box}
html,body{margin:0;background:#040812;color:#EEF4FA}
.edition{print-color-adjust:exact;-webkit-print-color-adjust:exact}
.sheet{box-sizing:border-box;width:210mm;height:297mm;padding:14mm 14mm 18mm;page-break-after:always;break-after:page;overflow:hidden;position:relative;background:#040812}
.sheet:last-child{page-break-after:auto;break-after:auto}
.sheet--bleed{padding:0}
.sheet--stack .plate{margin:0 0 6mm}
.sheet--stack .plate img{height:108mm;width:100%;object-fit:contain;object-position:center top}
.plate--seal{position:absolute;right:14mm;bottom:22mm;width:42mm}
.plate--seal img{height:42mm;width:42mm;object-fit:cover;border:.25pt solid #8BA9FF}
.plate img{display:block;width:100%;height:auto;border:.25pt solid #93A8BF;background:#040812}
.plate--cover img{height:297mm;width:210mm;object-fit:cover;border:0}
.plate--wheel img{width:148mm;margin:0 auto 4mm}
.letter-beat{margin:0 0 4.2mm;padding-bottom:3.2mm;border-bottom:.25pt solid rgba(147,168,191,.3)}
.letter-beat:last-of-type{border-bottom:0}
.letter-beat small{display:block;margin:0 0 1.4mm;font:700 8pt/1.3 "Schibsted Grotesk",Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#A5BCFF}
.letter-beat .fact{margin:0 0 1.2mm;font-size:8.2pt}
.letter-beat .reflect{margin:0;font-size:12.2pt;line-height:1.38}
.overlay{position:absolute;left:14mm;right:14mm;bottom:16mm}
.brand{font:600 9pt/1.3 "Schibsted Grotesk",Arial,sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#A5BCFF;margin:0 0 6mm}
.display{font:600 32pt/1.05 "Cormorant Garamond",Georgia,serif;margin:0 0 5mm;color:#EEF4FA}
.display--cover{font-size:36pt}
.fact{font:9.5pt/1.45 "IBM Plex Mono",ui-monospace,monospace;color:#A5BCFF;margin:0 0 4mm}
.fact--caption{color:#C9D6E3}
.reflect{font:italic 13.5pt/1.45 "Cormorant Garamond",Georgia,serif;color:#EEF4FA;margin:0 0 5mm}
.reflect--lead{font-size:16.5pt}
.running{position:absolute;left:14mm;right:14mm;bottom:8mm;font:8pt/1.3 "IBM Plex Mono",ui-monospace,monospace;color:#93A8BF;letter-spacing:.04em}
.demo{position:absolute;top:10mm;left:14mm;right:14mm;font:700 8pt/1.3 "Schibsted Grotesk",Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#A5BCFF;border:.25pt solid #8BA9FF;padding:2mm 3mm}
.legal{font:8pt/1.4 "Schibsted Grotesk",Arial,sans-serif;color:#C9D6E3;border-top:.25pt solid #93A8BF;padding-top:4mm;margin-top:8mm;max-width:132mm}
.sheet[data-page="6"]{padding-bottom:26mm}
table.placements{width:100%;border-collapse:collapse;font:9pt/1.4 "IBM Plex Mono",ui-monospace,monospace;color:#EEF4FA;margin:4mm 0}
table.placements caption{caption-side:top;text-align:left;font:600 8pt/1.3 "Schibsted Grotesk",Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#A5BCFF;padding-bottom:3mm}
table.placements th,table.placements td{text-align:left;padding:1.6mm 2mm;border-bottom:.25pt solid rgba(147,168,191,.38);vertical-align:top}
tr.is-contact th,tr.is-contact td{box-shadow:inset 3pt 0 0 #FF8EA8;font-weight:700}
@media print{button{display:none}}
</style></head><body class="edition">
<section class="sheet sheet--bleed" data-page="1">
  ${demo ? '<p class="demo">Demo natal — Sun placed on the eclipse degree. Not a personal chart.</p>' : ''}
  <figure class="plate plate--cover"><img src="${disc}" alt=""></figure>
  <div class="overlay">
    <p class="brand">AstroPrecise · Your Eclipse Edition</p>
    <h1 class="display display--cover">${contactLabel} · ${contactAspect}</h1>
    <p class="fact">${contactOrb} from natal ${contactLabel} · eclipse ${eclipseDegree} · 12 August 2026</p>
    ${model.governsCore ? `<p class="reflect">${escapeHtml(model.governsCore)}</p>` : ''}
    <p class="fact">${fp}</p>
  </div>
</section>
<section class="sheet" data-page="2">
  <h1 class="display">The Moon crossed the Sun.</h1>
  <p class="fact">${escapeHtml(model.anchorNoPlace || (model.beats[0] && model.beats[0].mono) || '')}</p>
  ${geometry ? `<figure class="plate"><img src="${geometry}" alt="London schematic of the 12 August 2026 eclipse, magnitude 0.91"></figure>` : ''}
  <p class="fact fact--caption">Greatest 17:45:51 UTC. London schematic: about 19:13 BST, magnitude 0.91, about 90% of the solar disc. Distances compressed. Not a ground-track. Not your local sky unless you were there. Eclipse point as computed: ${eclipseDegree}.</p>
  <p class="running">ASTROPRECISE · 12 AUG 2026 · ${fp} · 2 / 6</p>
</section>
<section class="sheet sheet--stack" data-page="3">
  ${aspect ? `<figure class="plate"><img src="${aspect}" alt="Contact geometry between the eclipse and the natal point"></figure>` : ''}
  <div class="copy">
    <h1 class="display">${contactLabel}</h1>
    <p class="reflect">${escapeHtml((model.beats[1] && model.beats[1].serif) || '')}</p>
    <p class="fact">${escapeHtml(model.contactMonoCore || '')}</p>
    ${model.contactTheme ? `<p class="fact">In the tradition we use, ${contactLabel} is ${escapeHtml(model.contactTheme)}.</p>` : ''}
    <p class="reflect">${escapeHtml(model.governsCore || '')}</p>
  </div>
  <p class="running">ASTROPRECISE · 12 AUG 2026 · ${fp} · 3 / 6</p>
</section>
<section class="sheet ${houses ? 'sheet--stack' : ''}" data-page="4">
  ${houses ? `<figure class="plate"><img src="${houses}" alt="Whole-sign houses with the contacted house marked"></figure>` : ''}
  <div class="copy">
    <h1 class="display">${houseTitle}</h1>
    <p class="fact">${houseFact}</p>
    <p class="reflect reflect--lead">${question}</p>
    ${secondaryBlockHtml(model)}
  </div>
  <p class="running">ASTROPRECISE · 12 AUG 2026 · ${fp} · 4 / 6</p>
</section>
<section class="sheet" data-page="5">
  <h1 class="display">Longitudes used for this plate.</h1>
  ${wheel ? `<figure class="plate plate--wheel"><img src="${wheel}" alt="Natal wheel with the eclipse degree marked"></figure>` : ''}
  ${placementTableHtml(model)}
  <p class="fact fact--caption">Highlighted row is the contacted point. Degrees are ecliptic longitude. Birth date, time and place are not printed.</p>
  <p class="running">ASTROPRECISE · 12 AUG 2026 · ${fp} · 5 / 6</p>
</section>
<section class="sheet" data-page="6">
  <p class="brand">The keepable letter</p>
  <h1 class="display">Five beats, one night.</h1>
  ${beatsLetterHtml(model)}
  <footer class="legal">${escapeHtml(model.legal)} · Computed on this device. No birth date, time or place is in this file. Fingerprint ${fp}. Only conjunction, opposition and square within orb carry the reading.</footer>
  <p class="running">ASTROPRECISE · 12 AUG 2026 · ${fp} · 6 / 6</p>
</section>
${printOnLoad ? `<script>addEventListener('load',()=>setTimeout(()=>print(),250),{once:true})</script>` : ''}
</body></html>`;
}

async function loadGeometryDataUrl() {
  try {
    const response = await fetch(new URL('img/eclipse-geometry.svg', document.baseURI));
    if (!response.ok) return '';
    const text = cleanGeometrySvg(await response.text());
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(text)}`;
  } catch (_) {
    return '';
  }
}

async function openPrintView(model) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return false;
  const images = renderEclipsePrintAssets(model);
  images.geometry = await loadGeometryDataUrl();
  const fontBase = document.baseURI;
  printWindow.document.write(buildEclipsePrintDocument(model, images, { printOnLoad: true, fontBase }));
  printWindow.document.close();
  return true;
}

function renderUnlocked(host, model) {
  host.dataset.paidState = 'unlocked';
  host.innerHTML = `
    <div class="ap-eclipse-edition__unlocked">
      <div class="ap-eclipse-edition__keep">
        <div class="ap-eclipse-edition__head"><span>Edition unlocked</span><strong>${escapeHtml(model.fingerprint)}</strong></div>
        <h3>Your five-beat eclipse edition</h3>
        <p>The booklet is the keepable object. The plate is the picture of the same contact. Nothing here was uploaded.</p>
        <div class="ap-eclipse-edition__reading">${fullReadingHtml(model)}</div>
        <div class="ap-eclipse-edition__actions"><button type="button" data-edition-print>Print / save as PDF</button><button type="button" data-edition-download>Download PNG plate</button></div>
        <p class="ap-eclipse-edition__status" data-edition-status role="status">Ready on this device.</p>
      </div>
      <figure class="ap-eclipse-edition__art"><div data-edition-canvas></div><figcaption>Unique 2400 × 3000 natal-wheel plate from this computed chart contact. No birth details are printed into the file.</figcaption></figure>
    </div>`;

  const canvas = renderEclipseArtwork(model);
  canvas.setAttribute('aria-label', 'Personalised natal-wheel plate');
  host.querySelector('[data-edition-canvas]').appendChild(canvas);
  const status = host.querySelector('[data-edition-status]');

  host.querySelector('[data-edition-download]').addEventListener('click', async () => {
    try {
      status.textContent = 'Preparing the high-resolution PNG…';
      const blob = await canvasBlob(canvas);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `astroprecise-eclipse-edition-${model.fingerprint.toLowerCase()}.png`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      status.textContent = 'PNG downloaded.';
    } catch (error) {
      status.textContent = error.message || 'The PNG could not be downloaded.';
    }
  });

  host.querySelector('[data-edition-print]').addEventListener('click', async () => {
    status.textContent = 'Preparing the booklet…';
    const opened = await openPrintView(model);
    status.textContent = opened
      ? 'Print view opened. Choose Save as PDF in the print dialog.'
      : 'Allow pop-ups for this click, then try Print / save as PDF again.';
  });
}

const EDITION_PENDING_KEY = 'ap-eclipse-edition-pending';
const EDITION_UNLOCKED_KEY = 'ap-eclipse-edition-unlocked';

function loadUnlockedFingerprints() {
  try {
    const parsed = JSON.parse(localStorage.getItem(EDITION_UNLOCKED_KEY) || 'null');
    return Array.isArray(parsed && parsed.fingerprints) ? parsed.fingerprints : [];
  } catch (_) {
    return [];
  }
}

function rememberUnlockedFingerprint(fingerprint) {
  if (!fingerprint) return;
  try {
    const fingerprints = loadUnlockedFingerprints().filter((value) => value !== fingerprint);
    fingerprints.push(fingerprint);
    localStorage.setItem(EDITION_UNLOCKED_KEY, JSON.stringify({
      at: Date.now(),
      fingerprints: fingerprints.slice(-20),
    }));
  } catch (_) {}
}

function isFingerprintUnlocked(fingerprint) {
  return Boolean(fingerprint && loadUnlockedFingerprints().includes(fingerprint));
}

/** Persist a computed contact so Gumroad checkout return can unlock without re-casting. */
export function rememberEditionContext(context) {
  if (!context || !context.reading || context.reading.gateSale || context.reading.quiet) return false;
  try {
    sessionStorage.setItem(EDITION_PENDING_KEY, JSON.stringify({
      at: Date.now(),
      reading: context.reading,
      natal: context.natal,
      eclipseLongitude: context.eclipseLongitude,
      meta: context.meta || null,
    }));
    return true;
  } catch (_) {
    return false;
  }
}

/** Load a pending edition context saved before checkout (same tab/session only). */
export function loadEditionContext({ maxAgeMs = 6 * 60 * 60 * 1000 } = {}) {
  try {
    const raw = sessionStorage.getItem(EDITION_PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.reading || !parsed.natal || parsed.eclipseLongitude == null) return null;
    if (parsed.reading.gateSale || parsed.reading.quiet) return null;
    if (maxAgeMs && parsed.at && (Date.now() - Number(parsed.at)) > maxAgeMs) return null;
    return parsed;
  } catch (_) {
    return null;
  }
}

export function clearEditionContext() {
  try { sessionStorage.removeItem(EDITION_PENDING_KEY); } catch (_) {}
}

export function mountEclipseEdition(host, context) {
  if (!host) return { state: 'missing-host' };
  const { reading, natal, eclipseLongitude } = context || {};
  host.hidden = false;

  if (!reading || reading.gateSale || reading.quiet) {
    host.dataset.paidState = 'quiet';
    host.innerHTML = `
      <div class="ap-eclipse-edition__quiet"><span>Quiet chart</span><h3>Keep the free result.</h3><p>No tight conjunction, opposition or square was found, so there is no paid edition to sell you.</p></div>`;
    return { state: 'quiet' };
  }

  const model = buildEclipsePlateModel({ reading, natal, eclipseLongitude });
  if (isFingerprintUnlocked(model.fingerprint)) {
    renderUnlocked(host, model);
    return { state: 'unlocked', model };
  }
  const recoverable = isEntitlementReady(EDITION_PRODUCT);
  host.dataset.paidState = recoverable ? 'archive' : 'dormant';
  rememberEditionContext(context);
  host.innerHTML = `
    <div class="ap-eclipse-edition__head"><span>12 August edition</span><strong>Archive</strong></div>
    <h3>Already purchased? Restore your edition.</h3>
    <p>This event edition is closed to new purchases. Existing buyers can still restore the five-beat reading, print booklet and unique high-resolution natal-wheel plate (2400 × 3000) on this device. Birth data remains in this browser.</p>
    ${recoverable ? `
      <form class="ap-eclipse-edition__license" data-edition-license-form>
        <label><span>Paste the licence key from your Gumroad receipt or View content</span><input type="password" minlength="8" required autocomplete="off" data-edition-license></label>
        <button type="submit">Restore on this device</button>
      </form>
      <p class="ap-eclipse-edition__status" data-edition-status role="status">No checkout is offered. Licence recovery is retained for people who purchased before the eclipse.</p>` : `
      <p class="ap-eclipse-edition__status" role="status"><strong>Checkout is closed.</strong> Licence recovery is temporarily unavailable. Your free contact result above remains available.</p>`}`;

  if (!recoverable) return { state: 'dormant', model };
  const status = host.querySelector('[data-edition-status]');
  host.querySelector('[data-edition-license-form]').addEventListener('submit', async (event) => {
    event.preventDefault();
    const input = host.querySelector('[data-edition-license]');
    const button = event.currentTarget.querySelector('button');
    button.disabled = true;
    status.textContent = 'Checking the licence with Gumroad…';
    try {
      const result = await verifyLicense(EDITION_PRODUCT, input.value.trim(), { incrementUses: true });
      if (!result.valid) {
        status.textContent = result.reason
          || 'That licence could not be verified or is no longer eligible.';
        button.disabled = false;
        return;
      }
      input.value = '';
      rememberUnlockedFingerprint(model.fingerprint);
      clearEditionContext();
      renderUnlocked(host, model);
    } catch (_) {
      status.textContent = 'Licence verification is temporarily unavailable. Nothing has been charged here; try again shortly.';
      button.disabled = false;
    }
  });
  return { state: 'archive', model };
}
