#!/usr/bin/env node
/**
 * Faceless-shorts SAMPLE frames — local only, on the FICTIONAL sample chart.
 *
 *   node tools/sample-shorts.mjs [--out <dir>] [--quiet]
 *
 * Writes 1080x1920 PNG still frames (plus a storyboard, an ffmpeg-style
 * frames.txt per concept and a small animated GIF preview) for three short
 * video concepts. Nothing is uploaded, posted or scheduled: there is no social
 * API code here and no network use. ffmpeg is not installed on this machine,
 * so no video file is produced; the frames.txt lists are for a later, manual
 * assembly step once music/stock are licensed.
 *
 * Renderer: @napi-rs/canvas (already a devDependency) with the site's own
 * fonts from website/fonts. The wheel is the same geometry and palette as
 * natalWheelSvg in fulfil-shared.mjs, drawn with the 2D canvas API because
 * the canvas package's SVG rasteriser cannot see the registered glyph font.
 *
 * Default --out: C:\house\astro-samples\shorts on Windows, else
 * ./out/sample-shorts (both ignored by git).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, GlobalFonts, GifEncoder } from '@napi-rs/canvas';
import {
  ROOT, loadEngines, buildChart, fmt, parseArgs, norm, SIGNS, SGL, PGL, SIGN_ELEMENT, ELEMENT_FILL, ELEMENT_STROKE,
} from './fulfil-shared.mjs';
import { SAMPLE, computeAspects } from './sample-print-pack.mjs';

const ALLOWED_FLAGS = new Set(['out', 'quiet']);

export const W = 1080;
export const H = 1920;
export const FRAME_LABEL = 'Fictional sample chart';
export const DISCLAIMER = 'Astrology here is symbolic, for reflection and entertainment. It does not predict events or diagnose anyone. Fictional sample chart, not a real person.';
export const FORBIDDEN_CAPTION_WORDS = ['??', 'buy', 'checkout'];
export const PREVIEW_SCALE = 0.25;

// Safe margins for platform UI (title bars, captions, side buttons) on 9:16.
const SAFE = { top: 230, bottom: 330, side: 84 };
const INK = {
  void: '#0C1016', mid: '#121826', raised: '#1A2230',
  brass: '#C2A05E', bright: '#CDAE6A', vivid: '#D8B978', parchment: '#ECE6D8', soft: '#A89E88', label: '#F0A878',
};
const WHEEL = { ring: '#C9A227', axis: 'rgba(232,200,114,.85)', cusp: 'rgba(201,162,39,.32)', glyph: '#EFE3C0', hi: '#E8C872' };
const ASPECT_COLOURS = { Conjunction: '#E8C872', Trine: '#5fae8a', Sextile: '#5fae8a', Square: '#b06a6a', Opposition: '#c98e5a' };
const BODIES = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'chiron', 'northNode'];

// Same date and place as the print-pack sample, twelve hours later. March 1990
// in London was GMT, so clock time is Universal Time for both moments.
export const SAMPLE_LATER = Object.freeze({ ...SAMPLE, h: 18, mi: 30, time: '18:30 GMT' });

export function defaultShortsOut() {
  return process.platform === 'win32'
    ? 'C:\\house\\astro-samples\\shorts'
    : join(ROOT, 'out', 'sample-shorts');
}

// ── fonts ─────────────────────────────────────────────────────────────────────
const FONT_DIR = join(ROOT, 'website', 'fonts');
const FONT_FILES = [
  ['cinzel-normal-400.woff2', 'Cinzel'], ['cinzel-normal-600.woff2', 'Cinzel'],
  ['cormorant-garamond-normal-500.woff2', 'Cormorant Garamond'], ['cormorant-garamond-italic-400.woff2', 'Cormorant Garamond'],
  ['inter-normal-500.woff2', 'Inter'], ['inter-normal-600.woff2', 'Inter'],
  ['astro-glyphs.woff2', 'AstroGlyph'],
];
let fontsReady = false;
function registerFonts() {
  if (fontsReady) return;
  for (const [file, family] of FONT_FILES) {
    if (!GlobalFonts.registerFromPath(join(FONT_DIR, file), family)) throw new Error(`font did not register: ${file}`);
  }
  fontsReady = true;
}

// ── wheel (canvas port of natalWheelSvg) ──────────────────────────────────────
function drawWheel(ctx, { cx, cy, size, asc, mc, houses, pos, aspects }) {
  const R = size / 2 - 8;
  const rSign = R - size * 0.085;
  const rHouse = rSign - size * 0.11;
  const rPlanet = rHouse - size * 0.05;
  const rAspect = rPlanet - size * 0.02;
  // ASC at 9 o'clock, zodiac running anticlockwise, as on the site and the print plates.
  const ang = (lon) => (180 - (norm(lon) - asc)) * Math.PI / 180;
  const pt = (lon, r) => [cx + r * Math.cos(ang(lon)), cy - r * Math.sin(ang(lon))];
  const ringArc = (lon0, lon1, r0, r1) => {
    ctx.beginPath();
    ctx.arc(cx, cy, r0, -ang(lon0), -ang(lon1), false);
    ctx.arc(cx, cy, r1, -ang(lon1), -ang(lon0), true);
    ctx.closePath();
  };

  const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
  bg.addColorStop(0, '#13100C'); bg.addColorStop(0.6, '#0D0A07'); bg.addColorStop(1, '#050406');
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fillStyle = bg; ctx.fill();

  let seed = 0xA57E0E5E;
  const rand = () => { seed = Math.imul(seed ^ (seed >>> 16), 0x45D9F3B); seed = Math.imul(seed ^ (seed >>> 16), 0x45D9F3B); seed ^= seed >>> 16; return (seed >>> 0) / 0xFFFFFFFF; };
  for (let i = 0; i < 90; i++) {
    const r = rand() * R * 0.92, a = rand() * Math.PI * 2;
    const sr = rand() * 0.9 + 0.25, op = rand() * 0.35 + 0.12;
    ctx.beginPath(); ctx.arc(cx + r * Math.cos(a), cy + r * Math.sin(a), sr * 1.4, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${op.toFixed(2)})`; ctx.fill();
  }

  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let i = 0; i < 12; i++) {
    const elem = SIGN_ELEMENT[SIGNS[i]];
    ringArc(i * 30, i * 30 + 30, R, rSign);
    ctx.fillStyle = ELEMENT_FILL[elem]; ctx.fill();
    ctx.strokeStyle = ELEMENT_STROKE[elem]; ctx.lineWidth = 0.6; ctx.stroke();
    const [x1, y1] = pt(i * 30, rSign), [x2, y2] = pt(i * 30, R);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.strokeStyle = 'rgba(201,162,39,.45)'; ctx.lineWidth = 1; ctx.stroke();
    const [gx, gy] = pt(i * 30 + 15, (R + rSign) / 2);
    ctx.font = `${Math.round(size * 0.04)}px AstroGlyph`; ctx.fillStyle = ELEMENT_STROKE[elem];
    ctx.fillText(SGL[i], gx, gy);
  }

  for (const [r, op, lw] of [[rSign, .55, 1.5], [rHouse, .35, 1], [rAspect, .22, 0.8]]) {
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.strokeStyle = `rgba(201,162,39,${op})`; ctx.lineWidth = lw; ctx.stroke();
  }

  for (let i = 0; i < 12; i++) {
    const axis = [0, 3, 6, 9].includes(i);
    const [x1, y1] = pt(houses[i], rAspect), [x2, y2] = pt(houses[i], rHouse);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = axis ? WHEEL.axis : WHEEL.cusp; ctx.lineWidth = axis ? 2.2 : 1; ctx.stroke();
    const mid = norm(houses[i] + norm(houses[(i + 1) % 12] - houses[i]) / 2);
    const [nx, ny] = pt(mid, rHouse - size * 0.028);
    ctx.font = `500 ${Math.round(size * 0.02)}px Inter`; ctx.fillStyle = INK.soft; ctx.fillText(String(i + 1), nx, ny);
  }

  for (const asp of aspects) {
    const [x1, y1] = pt(pos[asp.a].lon, rAspect), [x2, y2] = pt(pos[asp.b].lon, rAspect);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = ASPECT_COLOURS[asp.type] || '#888'; ctx.globalAlpha = 0.45; ctx.lineWidth = 0.9; ctx.stroke(); ctx.globalAlpha = 1;
  }

  for (const k of BODIES) {
    if (!pos[k]) continue;
    const [px, py] = pt(pos[k].lon, rPlanet), [tx, ty] = pt(pos[k].lon, rHouse - size * 0.005);
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(px, py); ctx.strokeStyle = 'rgba(232,200,114,.35)'; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.beginPath(); ctx.arc(px, py, size * 0.024, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(8,6,5,.92)'; ctx.fill(); ctx.strokeStyle = WHEEL.ring; ctx.lineWidth = 1; ctx.stroke();
    drawGlyph(ctx, k, px, py, size * 0.03, WHEEL.glyph);
  }

  ctx.font = `600 ${Math.round(size * 0.024)}px Inter`; ctx.fillStyle = WHEEL.hi;
  const [ax, ay] = pt(asc, R + size * 0.032); ctx.fillText('ASC', ax, ay);
  const [mx, my] = pt(mc, R + size * 0.032); ctx.fillText('MC', mx, my);
  ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fillStyle = WHEEL.ring; ctx.fill();
}

// The subset glyph font (Noto Sans Symbols 2) carries every body except the
// Sun, so the Sun is drawn as its symbol: a circle with a central dot.
function drawGlyph(ctx, key, x, y, px, colour) {
  if (key === 'sun') {
    ctx.beginPath(); ctx.arc(x, y, px * 0.42, 0, Math.PI * 2); ctx.strokeStyle = colour; ctx.lineWidth = Math.max(1.2, px * 0.07); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, px * 0.09, 0, Math.PI * 2); ctx.fillStyle = colour; ctx.fill();
    return;
  }
  ctx.font = `${Math.round(px)}px AstroGlyph`; ctx.fillStyle = colour; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(PGL[key], x, y);
}

// Up arrow drawn with lines: neither web-font subset carries U+2191.
function drawRisingArrow(ctx, x, y, h, colour) {
  ctx.strokeStyle = colour; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x, y - h);
  ctx.moveTo(x - h * 0.55, y - h * 0.4); ctx.lineTo(x, y - h); ctx.lineTo(x + h * 0.55, y - h * 0.4); ctx.stroke();
}

// ── text helpers ──────────────────────────────────────────────────────────────
function wrap(ctx, text, maxWidth) {
  const lines = [];
  for (const para of String(text).split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      const probe = line ? `${line} ${word}` : word;
      if (ctx.measureText(probe).width > maxWidth && line) { lines.push(line); line = word; } else line = probe;
    }
    lines.push(line);
  }
  return lines;
}

function block(ctx, text, { x, y, maxWidth, font, colour, lineHeight, align = 'center' }) {
  ctx.font = font; ctx.fillStyle = colour; ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
  const lines = wrap(ctx, text, maxWidth);
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lineHeight));
  return y + lines.length * lineHeight;
}

function frameBase(ctx) {
  const g = ctx.createRadialGradient(W / 2, 0, 0, W / 2, 0, H * 0.9);
  g.addColorStop(0, INK.mid); g.addColorStop(0.55, INK.void); g.addColorStop(1, INK.void);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  let seed = 0x5EED1234;
  const rand = () => { seed = Math.imul(seed ^ (seed >>> 16), 0x45D9F3B); seed = Math.imul(seed ^ (seed >>> 16), 0x45D9F3B); seed ^= seed >>> 16; return (seed >>> 0) / 0xFFFFFFFF; };
  for (let i = 0; i < 140; i++) {
    ctx.beginPath(); ctx.arc(rand() * W, rand() * H, rand() * 1.3 + 0.4, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(236,230,216,${(rand() * 0.3 + 0.08).toFixed(2)})`; ctx.fill();
  }
  // Small fictional-sample label, inside the top safe margin.
  ctx.font = '400 26px Cinzel'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const label = FRAME_LABEL.toUpperCase();
  const tw = ctx.measureText(label).width + 48;
  ctx.strokeStyle = INK.label; ctx.lineWidth = 1.2; ctx.strokeRect(W / 2 - tw / 2, SAFE.top, tw, 50);
  ctx.fillStyle = INK.label; ctx.fillText(label, W / 2, SAFE.top + 26);
}

function bigThree(ctx, y, chart) {
  const items = [['sun', 'Sun', chart.pos.sun.lon], ['moon', 'Moon', chart.pos.moon.lon], ['asc', 'Rising', chart.asc]];
  const boxW = 280, gap = 24, x0 = (W - (boxW * 3 + gap * 2)) / 2;
  items.forEach(([key, name, lon], i) => {
    const x = x0 + i * (boxW + gap);
    ctx.strokeStyle = 'rgba(194,160,94,.35)'; ctx.lineWidth = 1.2; ctx.strokeRect(x, y, boxW, 190);
    if (key === 'asc') drawRisingArrow(ctx, x + boxW / 2, y + 52, 22, INK.vivid);
    else drawGlyph(ctx, key, x + boxW / 2, y + 52, 56, INK.vivid);
    ctx.font = '400 22px Cinzel'; ctx.fillStyle = INK.soft; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(name.toUpperCase(), x + boxW / 2, y + 108);
    ctx.font = '500 34px "Cormorant Garamond"'; ctx.fillStyle = INK.parchment; ctx.fillText(fmt(lon), x + boxW / 2, y + 150);
  });
  return y + 190;
}

// ── frame renderer ────────────────────────────────────────────────────────────
// A frame is { title?, caption, wheel?: chart, wheelSize?, big3?: chart, closing?: true, kicker? }.
function renderFrame(f) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  frameBase(ctx);
  const maxWidth = W - SAFE.side * 2;
  // Frames without a wheel or card are text only; start them lower so the
  // block sits in the middle of the safe area instead of hugging the label.
  const textOnly = !f.wheel && !f.big3;
  let y = SAFE.top + (f.closing ? 420 : textOnly ? 300 : 120);

  if (f.kicker) {
    ctx.font = '400 28px Cinzel'; ctx.fillStyle = INK.brass; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(f.kicker.toUpperCase(), W / 2, y); y += 56;
  }
  if (f.title) y = block(ctx, f.title, { x: W / 2, y: y + 40, maxWidth, font: '600 68px Cinzel', colour: INK.parchment, lineHeight: 86 }) + 30;

  if (f.wheel) {
    const size = f.wheelSize || 700;
    drawWheel(ctx, { cx: W / 2, cy: y + size / 2 + 20, size, asc: f.wheel.asc, mc: f.wheel.mc, houses: f.wheel.houses, pos: f.wheel.pos, aspects: computeAspects(f.wheel.pos) });
    y += size + 100;
    if (f.wheelCaption) {
      // Cormorant, not Cinzel: the Cinzel subset has no U+2032 (′) glyph.
      ctx.font = '500 34px "Cormorant Garamond"'; ctx.fillStyle = INK.soft; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.fillText(f.wheelCaption, W / 2, y); y += 40;
    }
  }
  if (f.big3) y = bigThree(ctx, y + 10, f.big3) + 50;

  const captionFont = f.closing ? 'italic 400 40px "Cormorant Garamond"' : '500 50px "Cormorant Garamond"';
  const captionLh = f.closing ? 52 : 64;
  if (textOnly && !f.closing) y += 60;
  y = block(ctx, f.caption, { x: W / 2, y: y + 20, maxWidth, font: captionFont, colour: f.closing ? INK.soft : INK.parchment, lineHeight: captionLh });

  if (f.closing) {
    ctx.font = '600 40px Cinzel'; ctx.fillStyle = INK.bright; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillText('ASTROPRECISE', W / 2, Math.min(y + 90, H - SAFE.bottom));
  }
  if (y > H - SAFE.bottom) throw new Error(`frame text runs into the bottom safe margin (${Math.round(y)} px): ${f.caption.slice(0, 40)}…`);
  return canvas;
}

// ── concepts ──────────────────────────────────────────────────────────────────
export function buildConcepts(chartA, chartB) {
  const a = chartA, b = chartB;
  const A = a.order, B = b.order;
  const ascChanged = a.A.sign !== b.A.sign;
  const closing = { caption: DISCLAIMER, closing: true, seconds: 4 };
  return [
    {
      id: '01-birth-time',
      title: 'What your birth time changes',
      frames: [
        { kicker: 'Short 1', title: 'Same day. Same city. Two birth times.', caption: `${A.date}, ${A.place}. Once at ${A.time}, once at ${B.time}.`, seconds: 3 },
        { kicker: A.time, wheel: a, wheelCaption: `Rising ${fmt(a.asc)}`, caption: `At ${A.time} the Ascendant is ${fmt(a.asc)}.`, seconds: 3.5 },
        { kicker: B.time, wheel: b, wheelCaption: `Rising ${fmt(b.asc)}`, caption: `At ${B.time} it is ${fmt(b.asc)}.${ascChanged ? ' A different rising sign.' : ''}`, seconds: 3.5 },
        { title: 'The Sun barely moves', caption: `Sun: ${fmt(a.pos.sun.lon)} and ${fmt(b.pos.sun.lon)}.\nMoon: ${fmt(a.pos.moon.lon)} and ${fmt(b.pos.moon.lon)}.\nThe Ascendant moved through ${Math.round(norm(b.asc - a.asc))} degrees of the zodiac.`, seconds: 5 },
        { title: 'Time sets the frame', caption: 'The birth time sets the Ascendant and the houses, the frame the planets sit in. Without a time, the planets are still known. The frame is not.', seconds: 5 },
        closing,
      ],
    },
    {
      id: '02-not-a-photograph',
      title: 'A natal wheel is not a photograph of the sky',
      frames: [
        { kicker: 'Short 2', title: 'A natal wheel is not a photograph of the sky', caption: 'It is a map, drawn from one place and one moment.', seconds: 3.5 },
        { wheel: a, caption: 'The circle is the ecliptic, the path the Sun traces through the year, seen from the birthplace.', seconds: 4 },
        { wheel: a, wheelSize: 620, caption: 'Left edge: the Ascendant, where the ecliptic meets the eastern horizon. Top: the Midheaven, where it crosses the meridian.', seconds: 5 },
        { title: 'Signs are slices, not star pictures', caption: 'The twelve signs are 30-degree divisions of the ecliptic, measured from the March equinox point. They are not the constellations with the same names.', seconds: 5 },
        { wheel: a, wheelSize: 560, caption: `Each body sits where it was along that path, computed from the recorded moment with the VSOP87 and ELP2000 series. Here: Sun ${fmt(a.pos.sun.lon)}, Moon ${fmt(a.pos.moon.lon)}.`, seconds: 5 },
        closing,
      ],
    },
    {
      id: '03-something-to-keep',
      title: 'From free chart to something you can keep',
      frames: [
        { kicker: 'Short 3', title: 'From a free chart to something you can keep', caption: 'Three things to type: a date, a time and a place.', seconds: 3.5 },
        { title: 'Computed in your browser', caption: 'The chart is worked out on your own device. Only the place you type goes to Open-Meteo, to find its coordinates and time zone. Your birth date and time are never sent.', seconds: 5 },
        { wheel: a, wheelSize: 600, big3: a, caption: 'Sun, Moon and Rising at a glance, with every placement on the wheel.', seconds: 4 },
        { title: 'Something to keep', caption: 'Keepsake editions are being prepared: a print plate and a phone wallpaper of the same sky. Nothing is on sale yet.', seconds: 4 },
        closing,
      ],
    },
  ];
}

export function captionProblems(text) {
  const t = String(text).toLowerCase();
  return FORBIDDEN_CAPTION_WORDS.filter((w) => t.includes(w));
}

// ── output writers ────────────────────────────────────────────────────────────
function storyboardMd(concepts, input) {
  const lines = [
    '# Faceless shorts — SAMPLE storyboard (fictional chart)', '',
    `Generated locally by tools/sample-shorts.mjs. Chart: "${input.name}", ${input.date}, ${input.place}, at ${input.time} and ${SAMPLE_LATER.time}. Not a real person.`, '',
    'Nothing here was posted, uploaded or scheduled. ffmpeg is not installed on this machine, so there is no video file; each concept has a frames.txt in ffmpeg concat format for a later manual assembly step.', '',
    '**Before any use:** music, voice-over and stock footage must be licensed. Fonts and engine licences are listed in LICENCES.md at the repository root. Every frame carries the "Fictional sample chart" label; the last frame of each short carries the reflection/entertainment disclaimer.', '',
    'No prices, no shop links, no calls to purchase. Nothing is on sale.', '',
  ];
  for (const c of concepts) {
    const total = c.frames.reduce((s, f) => s + f.seconds, 0);
    lines.push(`## ${c.id} — ${c.title}`, '', `Suggested length ${total.toFixed(1)} s. Frames 1080x1920 PNG in \`${c.id}/\`.`, '', '| # | Seconds | Caption |', '|---|---|---|');
    c.frames.forEach((f, i) => lines.push(`| ${i + 1} | ${f.seconds} | ${[f.title, f.caption].filter(Boolean).join(' — ').replace(/\n/g, ' ').replace(/\|/g, '/')} |`));
    lines.push('');
  }
  return lines.join('\n') + '\n';
}

function framesTxt(c) {
  const out = [`# ${c.id} — ${c.title}`, '# ffmpeg concat list (ffmpeg is NOT installed here; nothing was run). Licence music/stock before use.', '# example: ffmpeg -f concat -safe 0 -i frames.txt -vf "format=yuv420p" -r 30 out.mp4'];
  c.frames.forEach((f, i) => { out.push(`file '${c.id}-frame-${String(i + 1).padStart(2, '0')}.png'`, `duration ${f.seconds}`); });
  out.push(`file '${c.id}-frame-${String(c.frames.length).padStart(2, '0')}.png'`);
  return out.join('\n') + '\n';
}

function gifPreview(canvases, seconds) {
  const pw = Math.round(W * PREVIEW_SCALE), ph = Math.round(H * PREVIEW_SCALE);
  const enc = new GifEncoder(pw, ph, { repeat: 0, quality: 10 });
  const small = createCanvas(pw, ph);
  const ctx = small.getContext('2d');
  canvases.forEach((c, i) => {
    ctx.drawImage(c, 0, 0, pw, ph);
    const rgba = ctx.getImageData(0, 0, pw, ph).data;
    enc.addFrame(new Uint8Array(rgba.buffer, rgba.byteOffset, rgba.byteLength), pw, ph, { delay: Math.round(seconds[i] * 1000) });
  });
  return enc.finish();
}

// ── main ──────────────────────────────────────────────────────────────────────
export async function generateSampleShorts({ out = defaultShortsOut(), quiet = false } = {}) {
  const log = quiet ? () => {} : (...a) => console.log(...a);
  const outDir = resolve(out);
  mkdirSync(outDir, { recursive: true });
  registerFonts();

  const { E } = loadEngines();
  const chartA = buildChart({ ...SAMPLE }, E);
  const chartB = buildChart({ ...SAMPLE_LATER }, E);
  log(`${SAMPLE.name} (fictional) — ${SAMPLE.time}: ASC ${fmt(chartA.asc)} | ${SAMPLE_LATER.time}: ASC ${fmt(chartB.asc)}`);

  const concepts = buildConcepts(chartA, chartB);
  const manifest = {
    schema: 'astroprecise-sample-shorts-v1',
    sample: true,
    posted: false,
    label: FRAME_LABEL,
    generatedAt: new Date().toISOString(),
    input: { ...SAMPLE, secondTime: SAMPLE_LATER.time },
    engine: 'VSOP87/ELP2000 (website/js/ephemeris.js), Placidus houses',
    chart: {
      [SAMPLE.time]: { ascendant: fmt(chartA.asc), midheaven: fmt(chartA.mc), sun: fmt(chartA.pos.sun.lon), moon: fmt(chartA.pos.moon.lon) },
      [SAMPLE_LATER.time]: { ascendant: fmt(chartB.asc), midheaven: fmt(chartB.mc), sun: fmt(chartB.pos.sun.lon), moon: fmt(chartB.pos.moon.lon) },
    },
    frame: { width: W, height: H },
    concepts: [],
    licences: 'Music, voice-over and stock must be licensed before use. Fonts/engine: LICENCES.md at the repository root.',
  };

  for (const c of concepts) {
    const dir = join(outDir, c.id);
    mkdirSync(dir, { recursive: true });
    const canvases = [];
    const frames = [];
    c.frames.forEach((f, i) => {
      const text = [f.kicker, f.title, f.caption, f.wheelCaption].filter(Boolean).join(' ');
      const bad = captionProblems(text);
      if (bad.length) throw new Error(`${c.id} frame ${i + 1}: caption contains ${bad.join(', ')}`);
      const canvas = renderFrame(f);
      const file = `${c.id}-frame-${String(i + 1).padStart(2, '0')}.png`;
      writeFileSync(join(dir, file), canvas.toBuffer('image/png'));
      canvases.push(canvas);
      frames.push({ file: `${c.id}/${file}`, seconds: f.seconds, width: W, height: H, label: FRAME_LABEL, title: f.title || null, caption: f.caption, closing: !!f.closing });
    });
    writeFileSync(join(dir, 'frames.txt'), framesTxt(c));
    writeFileSync(join(dir, 'preview.gif'), gifPreview(canvases, c.frames.map((f) => f.seconds)));
    manifest.concepts.push({ id: c.id, title: c.title, frames, framesList: `${c.id}/frames.txt`, preview: `${c.id}/preview.gif` });
    log(`written: ${c.id} (${frames.length} frames + frames.txt + preview.gif)`);
  }

  writeFileSync(join(outDir, 'storyboard.md'), storyboardMd(concepts, SAMPLE));
  writeFileSync(join(outDir, 'sample-shorts-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  log(`sample shorts: ${outDir}`);
  return { outDir, manifest };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const A = parseArgs(process.argv.slice(2));
  const bad = Object.keys(A).filter((k) => k !== '_' && !ALLOWED_FLAGS.has(k));
  if (bad.length || A._.length) {
    console.error(`sample-shorts: unsupported argument(s) ${[...bad, ...A._].join(', ')}. This tool only renders the fictional sample; it takes --out and --quiet.`);
    process.exit(2);
  }
  generateSampleShorts({ out: typeof A.out === 'string' ? A.out : undefined, quiet: !!A.quiet })
    .catch((e) => { console.error('sample-shorts failed:', e.message); process.exit(1); });
}
