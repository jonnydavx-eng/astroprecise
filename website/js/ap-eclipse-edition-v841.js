import { isCheckoutReady, openCheckout, verifyLicense } from './gumroad-unlock.js';
import { fmtDeg, houseOrdinal } from './eclipse-reading.js';

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
  { brass: '#d9b66f', ember: '#b95d34', ink: '#05070c', blue: '#486f8c' },
  { brass: '#c9c4ad', ember: '#8f5145', ink: '#04070d', blue: '#526d91' },
  { brass: '#e0bd78', ember: '#9c6846', ink: '#07060b', blue: '#415e78' },
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
  if (!placements.length) throw new Error('A computed chart is required for eclipse artwork.');

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

export function renderEclipseArtwork(model, canvas = document.createElement('canvas')) {
  if (!model) throw new Error('A direct eclipse-contact model is required.');
  canvas.width = model.width;
  canvas.height = model.height;
  canvas.dataset.editionFingerprint = model.fingerprint;
  const ctx = canvas.getContext('2d');
  const random = rng(model.seed);
  const { brass, ember, ink, blue } = model.palette;

  const background = ctx.createLinearGradient(0, 0, model.width, model.height);
  background.addColorStop(0, '#020308');
  background.addColorStop(0.42, ink);
  background.addColorStop(1, '#0a1018');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, model.width, model.height);

  for (let i = 0; i < 480; i += 1) {
    const x = random() * model.width;
    const y = random() * model.height * 0.62;
    const radius = 0.6 + random() * 2.2;
    ctx.globalAlpha = 0.14 + random() * 0.55;
    ctx.fillStyle = random() > 0.86 ? brass : '#e9edf4';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    if (random() > 0.97 && radius > 1.8) {
      ctx.globalAlpha = 0.22;
      ctx.strokeStyle = '#e9edf4';
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
  corona.addColorStop(0, 'rgba(245,220,157,.98)');
  corona.addColorStop(0.22, 'rgba(217,182,111,.42)');
  corona.addColorStop(1, 'rgba(217,182,111,0)');
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
    ctx.strokeStyle = i % 8 === 0 ? brass : '#efe2bd';
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
  sunFill.addColorStop(0, '#f3e2b0');
  sunFill.addColorStop(0.55, '#d9b66f');
  sunFill.addColorStop(1, '#8a5a28');
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

  const wheelX = model.width * 0.5;
  const wheelY = 1760;
  const outerR = 690;
  const innerR = 248;
  const planetR = 520;
  const tickInner = 640;
  const tickOuter = 678;

  const wheelWash = ctx.createRadialGradient(wheelX, wheelY, innerR, wheelX, wheelY, outerR + 40);
  wheelWash.addColorStop(0, 'rgba(8,12,20,.55)');
  wheelWash.addColorStop(1, 'rgba(8,12,20,0)');
  ctx.fillStyle = wheelWash;
  ctx.beginPath();
  ctx.arc(wheelX, wheelY, outerR + 48, 0, Math.PI * 2);
  ctx.fill();

  drawHairlineCircle(ctx, wheelX, wheelY, outerR, brass, 0.78, 3);
  drawHairlineCircle(ctx, wheelX, wheelY, tickInner, blue, 0.42, 2);
  drawHairlineCircle(ctx, wheelX, wheelY, planetR, brass, 0.28, 1.5);
  drawHairlineCircle(ctx, wheelX, wheelY, innerR, brass, 0.55, 2);

  ctx.save();
  ctx.translate(wheelX, wheelY);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let sign = 0; sign < 12; sign += 1) {
    const cusp = lonToAngle(sign * 30);
    ctx.strokeStyle = brass;
    ctx.globalAlpha = sign % 3 === 0 ? 0.7 : 0.28;
    ctx.lineWidth = sign % 3 === 0 ? 3 : 1.5;
    ctx.beginPath();
    ctx.moveTo(Math.cos(cusp) * tickInner, Math.sin(cusp) * tickInner);
    ctx.lineTo(Math.cos(cusp) * tickOuter, Math.sin(cusp) * tickOuter);
    ctx.stroke();
    const mid = lonToAngle(sign * 30 + 15);
    const labelR = 708;
    ctx.globalAlpha = 0.82;
    ctx.fillStyle = brass;
    ctx.font = '600 22px ui-monospace, Consolas, monospace';
    ctx.fillText(SIGN_MARKS[sign], Math.cos(mid) * labelR, Math.sin(mid) * labelR);
  }

  const eclipseAngle = lonToAngle(model.eclipseLongitude);
  ctx.strokeStyle = ember;
  ctx.globalAlpha = 0.95;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(Math.cos(eclipseAngle) * (innerR + 18), Math.sin(eclipseAngle) * (innerR + 18));
  ctx.lineTo(Math.cos(eclipseAngle) * (outerR + 18), Math.sin(eclipseAngle) * (outerR + 18));
  ctx.stroke();
  ctx.fillStyle = ember;
  ctx.beginPath();
  ctx.arc(Math.cos(eclipseAngle) * planetR, Math.sin(eclipseAngle) * planetR, 11, 0, Math.PI * 2);
  ctx.fill();

  model.placements.forEach((placement) => {
    const angle = lonToAngle(placement.longitude);
    const x = Math.cos(angle) * planetR;
    const y = Math.sin(angle) * planetR;
    const isContact = model.contactTarget && placement.key === model.contactTarget;
    const glyph = GLYPHS[placement.key] || placement.key.slice(0, 2).toUpperCase();
    ctx.globalAlpha = 1;
    ctx.fillStyle = isContact ? ember : ink;
    ctx.beginPath();
    ctx.arc(x, y, isContact ? 34 : 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = isContact ? brass : brass;
    ctx.lineWidth = isContact ? 3 : 1.5;
    ctx.globalAlpha = isContact ? 1 : 0.85;
    ctx.stroke();
    ctx.fillStyle = isContact ? '#f6efe0' : brass;
    ctx.font = isContact
      ? '700 26px "Schibsted Grotesk", Arial, sans-serif'
      : '600 22px "Schibsted Grotesk", Arial, sans-serif';
    ctx.fillText(glyph, x, y + 1);
  });
  ctx.restore();
  ctx.globalAlpha = 1;

  ctx.fillStyle = brass;
  ctx.font = '600 28px "Schibsted Grotesk", Arial, sans-serif';
  ctx.letterSpacing = '8px';
  ctx.fillText('ASTROPRECISE  /  12 AUGUST 2026', 150, 168);
  ctx.letterSpacing = '0px';
  ctx.fillStyle = '#f0ece3';
  ctx.font = '600 64px "Cormorant Garamond", Georgia, serif';
  ctx.fillText('Your natal wheel at this eclipse.', 150, 248);

  ctx.fillStyle = 'rgba(217,182,111,.78)';
  ctx.font = '600 26px ui-monospace, Consolas, monospace';
  ctx.fillText(`${model.fingerprint}  /  ${model.eclipseLongitude.toFixed(3)}°`, 150, model.height - 210);
  ctx.fillStyle = '#d7d9df';
  ctx.font = '500 32px "Schibsted Grotesk", Arial, sans-serif';
  drawWrapped(ctx, model.share, 150, model.height - 155, 2100, 42, 2);
  ctx.fillStyle = 'rgba(220,222,228,.55)';
  ctx.font = '400 20px "Schibsted Grotesk", Arial, sans-serif';
  ctx.fillText('Computed on your device · reflective astrology, not prediction or advice', 150, model.height - 72);
  return canvas;
}

export function renderEclipseDisc(model, canvas = document.createElement('canvas')) {
  canvas.width = 2000;
  canvas.height = 1100;
  const ctx = canvas.getContext('2d');
  const random = rng(model.seed);
  const { brass, ember, ink } = model.palette;
  ctx.fillStyle = ink;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < 180; i += 1) {
    ctx.globalAlpha = 0.12 + random() * 0.5;
    ctx.fillStyle = random() > 0.85 ? brass : '#e9edf4';
    ctx.beginPath();
    ctx.arc(random() * canvas.width, random() * canvas.height, 0.6 + random() * 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  const cx = canvas.width * 0.5;
  const cy = canvas.height * 0.52;
  const radius = 310;
  const moonShift = ((model.seed % 7) - 3) * 8;
  const corona = ctx.createRadialGradient(cx, cy, radius * 0.7, cx, cy, radius * 2.1);
  corona.addColorStop(0, 'rgba(245,220,157,.98)');
  corona.addColorStop(0.24, 'rgba(217,182,111,.4)');
  corona.addColorStop(1, 'rgba(217,182,111,0)');
  ctx.fillStyle = corona;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 2.1, 0, Math.PI * 2);
  ctx.fill();
  const sunFill = ctx.createRadialGradient(cx, cy, 20, cx, cy, radius);
  sunFill.addColorStop(0, '#f3e2b0');
  sunFill.addColorStop(0.55, '#d9b66f');
  sunFill.addColorStop(1, '#8a5a28');
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
  ctx.fillStyle = brass;
  ctx.font = '600 28px "Schibsted Grotesk", Arial, sans-serif';
  ctx.fillText('12 AUGUST 2026  ·  GREATEST 17:45:51 UTC  ·  ' + (model.eclipseDegree || `${model.eclipseLongitude.toFixed(3)}°`), 64, 64);
  ctx.fillStyle = ember;
  ctx.font = '600 22px ui-monospace, Consolas, monospace';
  ctx.fillText(model.fingerprint, 64, canvas.height - 48);
  return canvas;
}

export function renderAspectFigure(model, canvas = document.createElement('canvas')) {
  canvas.width = 2000;
  canvas.height = 1200;
  const ctx = canvas.getContext('2d');
  const { brass, ember, ink, blue } = model.palette;
  ctx.fillStyle = ink;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const cx = 720;
  const cy = 600;
  const radius = 420;
  drawHairlineCircle(ctx, cx, cy, radius, brass, 0.7, 3);
  drawHairlineCircle(ctx, cx, cy, radius * 0.72, blue, 0.35, 1.5);
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
    ctx.font = '600 20px ui-monospace, Consolas, monospace';
    ctx.fillText(SIGN_MARKS[sign], Math.cos(mid) * (radius + 36), Math.sin(mid) * (radius + 36));
  }
  const eclipseAngle = lonToAngle(model.eclipseLongitude);
  const contact = (model.placements || []).find((row) => row.key === model.contactTarget);
  ctx.strokeStyle = ember;
  ctx.globalAlpha = 0.95;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(eclipseAngle) * radius, Math.sin(eclipseAngle) * radius);
  ctx.stroke();
  ctx.fillStyle = ember;
  ctx.beginPath();
  ctx.arc(Math.cos(eclipseAngle) * radius, Math.sin(eclipseAngle) * radius, 14, 0, Math.PI * 2);
  ctx.fill();
  if (contact) {
    const contactAngle = lonToAngle(contact.longitude);
    ctx.strokeStyle = brass;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(contactAngle) * radius * 0.78, Math.sin(contactAngle) * radius * 0.78);
    ctx.stroke();
    ctx.fillStyle = ember;
    ctx.beginPath();
    ctx.arc(Math.cos(contactAngle) * radius * 0.78, Math.sin(contactAngle) * radius * 0.78, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f6efe0';
    ctx.font = '700 24px "Schibsted Grotesk", Arial, sans-serif';
    ctx.fillText(contact.glyph || GLYPHS[contact.key] || '', Math.cos(contactAngle) * radius * 0.78, Math.sin(contactAngle) * radius * 0.78 + 1);
  }
  ctx.restore();
  ctx.globalAlpha = 1;
  ctx.fillStyle = brass;
  ctx.font = '600 22px "Schibsted Grotesk", Arial, sans-serif';
  ctx.fillText('CONTACT GEOMETRY', 1280, 160);
  ctx.fillStyle = '#f0ece3';
  ctx.font = '600 42px "Cormorant Garamond", Georgia, serif';
  const headline = [
    model.contactLabel || 'Natal point',
    model.contactAspect || 'contact',
    model.contactOrb || '',
  ].filter(Boolean).join(' · ');
  const lines = [];
  const words = headline.split(' ');
  let line = '';
  ctx.font = '600 36px "Cormorant Garamond", Georgia, serif';
  words.forEach((word) => {
    const trial = line ? `${line} ${word}` : word;
    if (ctx.measureText(trial).width > 640) {
      lines.push(line);
      line = word;
    } else line = trial;
  });
  if (line) lines.push(line);
  lines.forEach((text, index) => ctx.fillText(text, 1280, 230 + index * 48));
  ctx.fillStyle = '#d7d9df';
  ctx.font = '400 24px "Schibsted Grotesk", Arial, sans-serif';
  let y = 230 + lines.length * 48 + 36;
  const notes = [
    `Eclipse at ${model.eclipseDegree || `${model.eclipseLongitude.toFixed(3)}°`}`,
    contact ? `Your ${contact.label} at ${contact.degree}` : '',
    model.contactHouse ? `Whole-sign house ${model.contactHouse}` : '',
    'Hard aspects only: conjunction, opposition, square.',
  ].filter(Boolean);
  notes.forEach((note) => {
    ctx.fillText(note, 1280, y);
    y += 42;
  });
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
    ctx.fillStyle = isContact ? '#f6efe0' : brass;
    ctx.font = isContact
      ? '700 26px "Schibsted Grotesk", Arial, sans-serif'
      : '600 22px "Schibsted Grotesk", Arial, sans-serif';
    ctx.fillText(placement.glyph || GLYPHS[placement.key] || '', x, y + 1);
  });
  ctx.restore();
  ctx.fillStyle = brass;
  ctx.font = '600 24px "Schibsted Grotesk", Arial, sans-serif';
  ctx.fillText('NATAL WHEEL  ·  ECLIPSE DEGREE MARKED', 64, 56);
  ctx.fillStyle = ember;
  ctx.font = '600 20px ui-monospace, Consolas, monospace';
  ctx.fillText(model.fingerprint, 64, canvas.height - 48);
  return canvas;
}

export function renderHouseFigure(model, canvas = document.createElement('canvas')) {
  const asc = (model.placements || []).find((row) => row.key === 'asc');
  if (!asc || !model.contactHouse) {
    canvas.width = 1;
    canvas.height = 1;
    return canvas;
  }
  canvas.width = 2000;
  canvas.height = 1100;
  const ctx = canvas.getContext('2d');
  const { brass, ember, ink, blue } = model.palette;
  ctx.fillStyle = ink;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const cx = 720;
  const cy = 560;
  const radius = 420;
  ctx.save();
  ctx.translate(cx, cy);
  for (let house = 1; house <= 12; house += 1) {
    const start = lonToAngle(asc.longitude + (house - 1) * 30);
    const end = lonToAngle(asc.longitude + house * 30);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, start, end, true);
    ctx.closePath();
    ctx.fillStyle = house === Number(model.contactHouse) ? 'rgba(185,93,52,.42)' : 'rgba(72,111,140,.08)';
    ctx.fill();
    ctx.strokeStyle = brass;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    const mid = lonToAngle(asc.longitude + (house - 1) * 30 + 15);
    ctx.globalAlpha = house === Number(model.contactHouse) ? 1 : 0.7;
    ctx.fillStyle = house === Number(model.contactHouse) ? ember : brass;
    ctx.font = '600 22px ui-monospace, Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(house), Math.cos(mid) * radius * 0.62, Math.sin(mid) * radius * 0.62);
  }
  ctx.restore();
  ctx.fillStyle = brass;
  ctx.font = '600 22px "Schibsted Grotesk", Arial, sans-serif';
  ctx.fillText('WHOLE-SIGN HOUSES', 1280, 180);
  ctx.fillStyle = '#f0ece3';
  ctx.font = '600 36px "Cormorant Garamond", Georgia, serif';
  ctx.fillText(`${houseOrdinal(model.contactHouse)} house`, 1280, 240);
  ctx.fillStyle = '#d7d9df';
  ctx.font = '400 24px "Schibsted Grotesk", Arial, sans-serif';
  ctx.fillText(model.houseMeaning || 'House counted from the Ascendant.', 1280, 300);
  ctx.fillStyle = blue;
  ctx.font = '400 20px "Schibsted Grotesk", Arial, sans-serif';
  ctx.fillText('Houses appear only because a birth time was given.', 1280, 360);
  return canvas;
}

export function renderEclipsePrintAssets(model) {
  const housesCanvas = renderHouseFigure(model);
  return {
    plate: renderEclipseArtwork(model).toDataURL('image/png'),
    disc: renderEclipseDisc(model).toDataURL('image/png'),
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

function personalLetterHtml(model) {
  const houseBit = model.contactHouseOrd
    ? ` Counted whole-sign from your Ascendant, that point sits in your ${model.contactHouseOrd} house${model.houseMeaning ? ` — ${model.houseMeaning}` : ''}.`
    : ' No birth time was given, so houses are not claimed.';
  const themeBit = model.contactTheme ? ` Tradition reads that point as ${model.contactTheme}.` : '';
  return `<p class="letter">This booklet is built from your computed chart. On 12 August 2026 the eclipse sat at ${escapeHtml(model.eclipseDegree || `${model.eclipseLongitude.toFixed(3)}°`)}. It made a ${escapeHtml(model.contactAspect || 'hard aspect')} to your natal ${escapeHtml(model.contactLabel || 'point')} (${escapeHtml(model.contactOrb || 'exact')}).${escapeHtml(themeBit)}${escapeHtml(houseBit)} The five beats that follow keep fact in the narrow type and reflection in the italic. Nothing here is a prediction.</p>`;
}

function receiptTableHtml(model) {
  const rows = [
    ['Fingerprint', model.fingerprint],
    ['Eclipse', model.eclipseDegree || `${model.eclipseLongitude.toFixed(3)}°`],
    ['Contact', [model.contactLabel, model.contactAspect, model.contactOrb].filter(Boolean).join(' · ')],
    ['House', model.contactHouseOrd ? `${model.contactHouseOrd}${model.houseMeaning ? ` — ${model.houseMeaning}` : ''}` : 'Not claimed — no birth time'],
  ];
  return `<table class="placements"><caption>This chart’s eclipse receipt</caption><tbody>${
    rows.map(([k, v]) => `<tr><th>${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`).join('')
  }</tbody></table>`;
}

export function buildEclipsePrintDocument(model, images = {}, { printOnLoad = true, demo = false } = {}) {
  const plate = images.plate || '';
  const disc = images.disc || '';
  const aspect = images.aspect || '';
  const wheel = images.wheel || '';
  const houses = images.houses || '';
  const geometry = images.geometry || '';
  const houseLine = model.contactHouseOrd
    ? `The contacted point sits in your ${model.contactHouseOrd} house, counted whole-sign from the Ascendant.`
    : 'No birth time was available for houses, so none are claimed.';
  return `<!doctype html><html><head><meta charset="utf-8"><title>Your Eclipse Edition ${escapeHtml(model.fingerprint)}</title>
<style>
@page{size:A4;margin:12mm}
*{box-sizing:border-box}
body{margin:0;background:#f4efe4;color:#16141a;font:16px/1.55 Georgia,serif}
.page{page-break-after:always;padding:0 0 8mm}
.page:last-child{page-break-after:auto}
.kicker{font:700 10px/1.3 Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#7a5c28;margin:0 0 8px}
h1{font:600 34px/1.05 Georgia,serif;margin:0 0 10px}
h2{font:600 26px/1.1 Georgia,serif;margin:0 0 12px}
p{margin:0 0 10px}
.letter{font:18px/1.6 Georgia,serif;color:#1c1914}
.demo{font:700 11px/1.4 Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#7a5c28;border:1px solid #d7c7a1;padding:8px 10px;margin:0 0 14px}
.mono,.ap-eclipse-edition__mono{font:12px/1.55 ui-monospace,Consolas,monospace;color:#333;margin:7px 0 0}
.serif,.ap-eclipse-edition__serif{font:italic 17px/1.55 Georgia,serif;color:#1c1914;margin:8px 0 0}
.ap-eclipse-edition__secondary{opacity:.88}
.hero img,.figure img{display:block;width:100%;height:auto;border:1px solid #d7c7a1;background:#05070c}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start}
section.beat{border-top:1px solid #d7c7a1;padding:14px 0}
section.beat small{font:700 10px/1.3 Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#7a5c28;display:block;margin:0 0 6px}
table.placements{width:100%;border-collapse:collapse;font:13px/1.45 Arial,sans-serif;margin:12px 0}
table.placements th,table.placements td{text-align:left;padding:7px 8px;border-bottom:1px solid #e2d6bc;vertical-align:top}
table.placements caption{caption-side:top;text-align:left;font:700 10px/1.3 Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#7a5c28;padding-bottom:8px}
table.placements tr.is-contact th,table.placements tr.is-contact td{background:#f3e6cc;font-weight:700}
.note{font:12px/1.5 Arial,sans-serif;color:#5c564c}
footer.legal{border-top:1px solid #d7c7a1;margin-top:18px;padding-top:10px;font:11px/1.5 Arial,sans-serif;color:#666}
@media print{button{display:none} body{background:#fff}}
</style></head><body>
<article class="page">
  ${demo ? '<p class="demo">Demo natal — Sun placed on the eclipse degree. Not a personal chart.</p>' : ''}
  <p class="kicker">AstroPrecise · Your Eclipse Edition · 12 August 2026</p>
  <h1>${escapeHtml(model.fingerprint)}</h1>
  <p class="serif">${escapeHtml(model.share)}</p>
  ${personalLetterHtml(model)}
  <figure class="hero"><img src="${plate}" alt="Personalised natal-wheel eclipse plate"></figure>
</article>
<article class="page">
  <p class="kicker">The event</p>
  <h2>The Moon crossed the Sun.</h2>
  ${beatSectionHtml(model.beats[0], 0)}
  <div class="grid">
    <figure class="figure"><img src="${disc}" alt="Diamond-ring eclipse disc for 12 August 2026"></figure>
    <div>
      <p class="note">Greatest eclipse 17:45:51 UTC. Totality crossed northern Russia, Greenland, Iceland, Spain and a corner of Portugal. The UK and Ireland saw a deep partial. This page is the keepable record of that geometry against your chart — not a live forecast.</p>
      <p class="mono">Eclipse longitude ${escapeHtml(model.eclipseDegree || `${model.eclipseLongitude.toFixed(3)}°`)}</p>
      ${receiptTableHtml(model)}
    </div>
  </div>
  ${geometry ? `<figure class="figure" style="margin-top:16px"><img src="${geometry}" alt="Schematic computed geometry of the 12 August 2026 eclipse"></figure>
  <p class="note">Computed schematic for a deep partial from London (magnitude 0.91). Distances compressed. This is not a ground-track map and not your local sky unless you were there.</p>` : ''}
</article>
<article class="page">
  <p class="kicker">The contact</p>
  <h2>${escapeHtml(model.contactLabel || 'Your chart')} · ${escapeHtml(model.contactAspect || 'hard aspect')} · ${escapeHtml(model.contactOrb || '')}</h2>
  <figure class="figure"><img src="${aspect}" alt="Contact geometry between the eclipse and the natal point"></figure>
  ${beatSectionHtml(model.beats[1], 1)}
  <p class="note">${escapeHtml(houseLine)}</p>
</article>
<article class="page">
  <p class="kicker">What it touches</p>
  ${beatSectionHtml(model.beats[2], 2)}
  ${beatSectionHtml(model.beats[3], 3)}
  ${houses ? `<figure class="figure"><img src="${houses}" alt="Whole-sign houses with the contacted house marked"></figure>` : ''}
  ${model.houseNote ? `<p class="note">${escapeHtml(model.houseNote)}</p>` : ''}
</article>
<article class="page">
  <p class="kicker">Your natal wheel</p>
  <h2>Every plotted point used for this plate.</h2>
  ${wheel ? `<figure class="figure"><img src="${wheel}" alt="Natal wheel with the eclipse degree marked"></figure>` : ''}
  ${placementTableHtml(model)}
  <p class="note">Highlighted row is the contacted point. Degrees are ecliptic longitude. Birth date, time and place are not printed.</p>
</article>
<article class="page">
  <p class="kicker">Close</p>
  ${beatSectionHtml(model.beats[4], 4)}
  ${personalLetterHtml(model)}
  <footer class="legal">${escapeHtml(model.legal)} · Computed on your device. No birth date, time or place is printed into this file. Fingerprint ${escapeHtml(model.fingerprint)}.</footer>
</article>
${printOnLoad ? `<script>addEventListener('load',()=>setTimeout(()=>print(),250),{once:true})<\/script>` : ''}
</body></html>`;
}

async function loadGeometryDataUrl() {
  try {
    const response = await fetch(new URL('img/eclipse-geometry.svg', document.baseURI));
    if (!response.ok) return '';
    const text = await response.text();
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(text)}`;
  } catch (_) {
    return '';
  }
}

async function openPrintView(model, canvas) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return false;
  const images = renderEclipsePrintAssets(model);
  if (canvas && canvas.toDataURL) images.plate = canvas.toDataURL('image/png');
  images.geometry = await loadGeometryDataUrl();
  printWindow.document.write(buildEclipsePrintDocument(model, images, { printOnLoad: true }));
  printWindow.document.close();
  return true;
}

function renderUnlocked(host, model) {
  host.dataset.paidState = 'unlocked';
  host.innerHTML = `
    <div class="ap-eclipse-edition__head"><span>Edition unlocked</span><strong>${escapeHtml(model.fingerprint)}</strong></div>
    <h3>Your five-beat eclipse edition</h3>
    <div class="ap-eclipse-edition__reading">${fullReadingHtml(model)}</div>
    <figure class="ap-eclipse-edition__art"><div data-edition-canvas></div><figcaption>Unique 2400 × 3000 natal-wheel plate from this computed chart contact. No birth details are printed into the file.</figcaption></figure>
    <div class="ap-eclipse-edition__actions"><button type="button" data-edition-download>Download PNG</button><button type="button" data-edition-print>Print / save as PDF</button></div>
    <p class="ap-eclipse-edition__status" data-edition-status role="status">Ready on this device.</p>`;

  const canvas = renderEclipseArtwork(model);
  canvas.setAttribute('aria-label', 'Personalised eclipse artwork');
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
    const opened = await openPrintView(model, canvas);
    status.textContent = opened
      ? 'Print view opened. Choose Save as PDF in the print dialog.'
      : 'Allow pop-ups for this click, then try Print / save as PDF again.';
  });
}

const EDITION_PENDING_KEY = 'ap-eclipse-edition-pending';

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
  const ready = isCheckoutReady(EDITION_PRODUCT);
  host.dataset.paidState = ready ? 'locked' : 'dormant';
  rememberEditionContext(context);
  host.innerHTML = `
    <div class="ap-eclipse-edition__head"><span>Your Eclipse Edition</span><strong>£7 · instant</strong></div>
    <h3>Keep this contact as reading and art.</h3>
    <p>Five authored beats, a keepable multi-page booklet (print / save as PDF), and unique 2400 × 3000 natal-wheel artwork, generated here from this computed contact. No manual review and no birth data leaves this browser.</p>
    <ul><li>Five-beat personalised contact reading</li><li>Unique high-resolution eclipse artwork</li><li>PNG download + print / save-as-PDF booklet</li><li>Licence unlock via Gumroad View content</li></ul>
    ${ready ? `
      <div class="ap-eclipse-edition__actions"><button type="button" data-edition-buy>Buy Your Eclipse Edition — £7</button></div>
      <form class="ap-eclipse-edition__license" data-edition-license-form>
        <label><span>Already purchased? Paste the licence key from Gumroad View content</span><input type="password" minlength="8" required autocomplete="off" data-edition-license></label>
        <button type="submit">Unlock on this device</button>
      </form>
      <p class="ap-eclipse-edition__status" data-edition-status role="status">Pay on Gumroad → open <strong>View content</strong> → copy the licence key → return here and paste. This contact stays in this browser tab.</p>` : `
      <p class="ap-eclipse-edition__status" role="status"><strong>Checkout is closed.</strong> The public link and product ID are not both configured, so nothing can take payment. Your free contact result above remains available.</p>`}`;

  if (!ready) return { state: 'dormant', model };
  const status = host.querySelector('[data-edition-status]');
  host.querySelector('[data-edition-buy]').addEventListener('click', () => {
    rememberEditionContext(context);
    openCheckout(EDITION_PRODUCT);
  });
  host.querySelector('[data-edition-license-form]').addEventListener('submit', async (event) => {
    event.preventDefault();
    const input = host.querySelector('[data-edition-license]');
    const button = event.currentTarget.querySelector('button');
    button.disabled = true;
    status.textContent = 'Checking the licence with Gumroad…';
    try {
      const result = await verifyLicense(EDITION_PRODUCT, input.value.trim(), { incrementUses: true });
      input.value = '';
      if (!result.valid) {
        status.textContent = result.reason
          || 'That licence could not be verified or is no longer eligible.';
        button.disabled = false;
        return;
      }
      clearEditionContext();
      renderUnlocked(host, model);
    } catch (_) {
      status.textContent = 'Licence verification is temporarily unavailable. Nothing has been charged here; try again shortly.';
      button.disabled = false;
    }
  });
  return { state: 'locked', model };
}
