/**
 * The Minute Plate: the Paper & Night print layout, ported from the brand
 * pack's src/plate.py so the Print Pack sample, the shop specimen and the
 * paid-path plates can share one design.
 *
 *   Orrery      VSOP87D heliocentric longitudes at the birth minute, Earth
 *               turned to the lower third; planet discs are the repo's own
 *               engine stills (website/img/engine/*.webp). Orbits not to scale.
 *   Big three   Sun, Moon and Rising from buildChart.
 *   Proof wheel geocentric positions, houses and the AC/MC axes.
 *   SPECIMEN    a small corner mark, never diagonal (sample output only).
 *
 * Text is live SVG text in 'AP Serif' / 'AP Sans', which the print path maps to
 * the static instances in tools/print-fonts, so PDFs embed real TrueType
 * subsets (no Type3). Astrological glyphs are the brand's drawn 24-unit SVG
 * set (stroked paths, no font, no AI imagery).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { ROOT } from './fulfil-shared.mjs';

export const PAPER_NIGHT = Object.freeze({
  paper: '#F6F3EC', paper2: '#EDE8DD', card: '#FBF9F4', night: '#0E1116', night2: '#181C24', ink: '#0E1116',
  graphite: '#3A3F47', muted: '#5C6168', rule: '#D6D1C6', copper: '#B4693E', copperInk: '#8A4A24', starlight: '#F1E7CF',
});

// Drawn astro glyphs: 24×24 grid, stroked, round caps (brand pack src/brandlib.py GLYPHS).
export const GLYPHS = Object.freeze({
  sun: '<circle cx="12" cy="12" r="8.4"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>',
  moon: '<path d="M14.6 3.7A8.4 8.4 0 1 0 14.6 20.3A6.6 8.4 0 0 1 14.6 3.7Z"/>',
  mercury: '<path d="M8.3 2.6a3.7 3.4 0 0 0 7.4 0"/><circle cx="12" cy="10.2" r="4.1"/><path d="M12 14.3V22M8.7 18.5h6.6"/>',
  venus: '<circle cx="12" cy="8.4" r="5.4"/><path d="M12 13.8V22M8.4 18.2h7.2"/>',
  mars: '<circle cx="9.4" cy="14.6" r="5.6"/><path d="M13.4 10.6L20.4 3.6M14.6 3.6h5.8v5.8"/>',
  jupiter: '<path d="M4.4 7.6C4.4 3.4 11.4 3 11.4 7.6C11.4 11.4 7.2 13.6 4.4 16.4H19.8M16 3.2V21.6"/>',
  saturn: '<path d="M7.6 2.6V16M4.6 5.8h6M7.6 11.2C7.6 7.6 16.4 7.4 16.4 12.2C16.4 15.4 12.4 16.4 12.4 19.2C12.4 21.4 15.2 21.8 16.6 20.4"/>',
  uranus: '<path d="M5.6 3.6v9.2M18.4 3.6v9.2M5.6 8.2h12.8M12 3.6v12"/><circle cx="12" cy="18.6" r="2.6"/>',
  neptune: '<path d="M4.8 4.2C4.8 11.8 19.2 11.8 19.2 4.2M12 2.8V21.6M8.2 17.6h7.6M3.6 5.8L4.8 4.2L6.2 5.6M17.8 5.6L19.2 4.2L20.4 5.8M10.6 4.2L12 2.8L13.4 4.2"/>',
  pluto: '<path d="M6.2 3.2a5.8 5.8 0 0 0 11.6 0"/><circle cx="12" cy="4.4" r="2.3"/><path d="M12 11.6V21.8M8.4 17.6h7.2"/>',
  aries: '<path d="M12 21.2V9.2M12 9.2C12 5 9.6 3.2 7.2 3.4C4.4 3.6 3.4 6.6 4.4 8.6C5 9.8 6 10.2 6.8 10.2M12 9.2C12 5 14.4 3.2 16.8 3.4C19.6 3.6 20.6 6.6 19.6 8.6C19 9.8 18 10.2 17.2 10.2"/>',
  taurus: '<circle cx="12" cy="15.2" r="5.4"/><path d="M3.8 3.4C4.6 7.8 7.6 9.8 12 9.8S19.4 7.8 20.2 3.4"/>',
  gemini: '<path d="M4.6 3.8C9.4 5.4 14.6 5.4 19.4 3.8M4.6 20.2C9.4 18.6 14.6 18.6 19.4 20.2M9 5V19M15 5V19"/>',
  cancer: '<path d="M20.6 8.4C18 5.2 11.4 4.4 7.6 6.8"/><circle cx="7.4" cy="9.6" r="2.8"/><path d="M3.4 15.6C6 18.8 12.6 19.6 16.4 17.2"/><circle cx="16.6" cy="14.4" r="2.8"/>',
  leo: '<circle cx="6.8" cy="16.2" r="3"/><path d="M9.8 16.2C9.8 12.2 7.4 10 7.4 7.4A4.4 4.4 0 0 1 16.2 7.4C16.2 11.4 13.4 13.8 13.4 17.4C13.4 20.4 16.4 21.6 18.8 19.6"/>',
  virgo: '<path d="M3.4 6.6C4.8 6.6 5.6 7.4 5.6 9.2V18.4M5.6 9.4C5.6 6.2 10 6.2 10 9.4V18.4M10 9.4C10 6.2 14.4 6.2 14.4 9.4V16C14.4 18.6 15.6 20.6 17.8 21.2M14.4 13.6C16.4 11.6 20.2 11.6 20.4 14.6C20.6 17.6 17.4 19.4 14.4 18.2"/>',
  scorpio: '<path d="M3 6.6C4.4 6.6 5.2 7.4 5.2 9.2V17.6M5.2 9.4C5.2 6.2 9.4 6.2 9.4 9.4V17.6M9.4 9.4C9.4 6.2 13.6 6.2 13.6 9.4V16.4C13.6 18.2 14.8 19.4 16.6 19.4H20.6M18.2 16.8L20.8 19.4L18.2 22"/>',
  libra: '<path d="M3.6 19.6H20.4M3.6 15.4H8.4A4.4 4.4 0 1 1 15.6 15.4H20.4"/>',
  sagittarius: '<path d="M4.6 19.4L19.4 4.6M12 4.6H19.4V12M7 11.4L12.6 17"/>',
  capricorn: '<path d="M2.8 5.4L6.8 17L10.2 6C11.2 3 14.8 3.4 14.8 6.6V15.8C14.8 19.6 20.6 19.6 20.6 16C20.6 12.8 16.8 12 14.8 14.4"/>',
  aquarius: '<path d="M3 10.2L6 7.6L9 10.2L12 7.6L15 10.2L18 7.6L21 10.2M3 16.4L6 13.8L9 16.4L12 13.8L15 16.4L18 13.8L21 16.4"/>',
  pisces: '<path d="M6 3.6C10.2 8.2 10.2 15.8 6 20.4M18 3.6C13.8 8.2 13.8 15.8 18 20.4M5.4 12H18.6"/>',
});

const SIGN_KEYS = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
const SIGN_NAMES = SIGN_KEYS.map((s) => s[0].toUpperCase() + s.slice(1));
const ORRERY = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
const AU = { mercury: 0.387, venus: 0.723, earth: 1, mars: 1.524, jupiter: 5.2, saturn: 9.58, uranus: 19.2, neptune: 30.1 };
const DISC = { mercury: 0.030, venus: 0.040, earth: 0.062, mars: 0.034, jupiter: 0.072, saturn: 0.090, uranus: 0.046, neptune: 0.046 };
const f1 = (n) => Number(n).toFixed(1);
const f2 = (n) => Number(n).toFixed(2);
const xml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** Heliocentric VSOP87D longitudes (degrees) at the birth minute, from website/js/ephemeris.js. */
export function helioLongitudes(E, { y, mo, d, h, mi }) {
  const src = readFileSync(join(ROOT, 'website', 'js', 'ephemeris.js'), 'utf8');
  const priv = new Function('window', 'console', 'document', `${src}\n;return { vsopSpherical, VSOP87D };`)({}, console, undefined);
  const jd = E.julianDay(y, mo, d, h, mi, 0);
  const out = {};
  for (const b of ORRERY) out[b] = ((priv.vsopSpherical(b, jd).L * 180 / Math.PI) % 360 + 360) % 360;
  return out;
}

/** Engine stills as PNG data URIs (the repo's own NASA/USGS-based renders). */
export async function loadStills(px = 384) {
  const out = {};
  for (const b of ['sun', 'moon', ...ORRERY]) {
    const buf = await sharp(join(ROOT, 'website', 'img', 'engine', `${b}.webp`)).resize(px, px).png({ compressionLevel: 9 }).toBuffer();
    out[b] = `data:image/png;base64,${buf.toString('base64')}`;
  }
  return out;
}

function rng(seed) { // mulberry32
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export function glyph(name, x, y, size, color, sw = 1.5) {
  const s = size / 24;
  return `<g transform="translate(${f2(x)},${f2(y)}) scale(${(s).toFixed(4)})" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${GLYPHS[name].replace(/currentColor/g, color)}</g>`;
}

const SANS = "'AP Sans','Inter Print',Inter,sans-serif";
const SERIF = "'AP Serif','Instrument Serif Print','Instrument Serif',Georgia,serif";
function T(text, size, x, y, fill, { anchor = 'start', tracking = 0, weight = 400, family = SANS, italic = false, num = false } = {}) {
  const ls = tracking ? ` letter-spacing="${f2(tracking * size)}"` : '';
  // A tracked run ends with one extra letter-space; pull end-anchored text back by it.
  const dx = tracking && anchor === 'end' ? -tracking * size : tracking && anchor === 'middle' ? -tracking * size / 2 : 0;
  return `<text x="${f1(x + dx)}" y="${f1(y)}" font-family="${family}" font-size="${f2(size)}" font-weight="${weight}"${italic ? ' font-style="italic"' : ''}${num ? ' style="font-variant-numeric:tabular-nums"' : ''} fill="${fill}" text-anchor="${anchor}"${ls}>${xml(text)}</text>`;
}

export function specimenMark(xRight, y, size, color) {
  // Width of 'SPECIMEN' in Inter 600 with .24em tracking is about 6.6em.
  const w = size * 6.62;
  const pad = size * 0.7;
  const x0 = xRight - (w + 2 * pad);
  return `<g data-mark="specimen"><rect x="${f1(x0)}" y="${f1(y)}" width="${f1(w + 2 * pad)}" height="${f1(size * 2.1)}" fill="none" stroke="${color}" stroke-width="${f2(size * 0.09)}"/>${T('SPECIMEN', size, x0 + pad, y + size * 1.42, color, { tracking: 0.24, weight: 600 })}</g>`;
}

/** Brand mark, light variant without ticks (website/favicon.svg geometry). */
export function brandMark(cx, cy, S, c = PAPER_NIGHT) {
  const r = S * 0.5;
  const k = r / 21;
  const star = 'M41.45,18.92 C42.11,24.25 43.32,25.46 48.65,26.12 C43.32,26.78 42.11,27.99 41.45,33.32 C40.79,27.99 39.58,26.78 34.25,26.12 C39.58,25.46 40.79,24.25 41.45,18.92 Z';
  return `<g transform="translate(${f2(cx - 32 * k)},${f2(cy - 32 * k)}) scale(${k.toFixed(4)})"><path d="M32,11 A21,21 0 0,1 32,53 Z" fill="${c.night}"/><circle cx="32" cy="32" r="21" fill="none" stroke="${c.ink}" stroke-width="2.6"/><path d="${star}" fill="${c.copper}"/></g>`;
}

function orrery(cx, cy, R, { helio, moonLon, stills, light, c }) {
  const sky = light ? c.paper2 : c.night;
  const ink = light ? c.ink : c.paper;
  const star = light ? c.graphite : c.starlight;
  const out = [`<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(R)}" fill="${sky}"${light ? ` stroke="${c.rule}" stroke-width="${f2(R * 0.003)}"` : ''}/>`];
  const rand = rng(7);
  const nStars = light ? Math.round(R * 0.35) : Math.round(R * 0.9);
  for (let i = 0; i < nStars; i++) {
    const a = rand() * Math.PI * 2; const rr = R * Math.sqrt(rand()) * 0.97;
    out.push(`<circle cx="${f1(cx + rr * Math.cos(a))}" cy="${f1(cy + rr * Math.sin(a))}" r="${f2(rand() * R * 0.0022 + R * 0.0006)}" fill="${star}" opacity="${f2(rand() * (light ? 0.35 : 0.55) + 0.15)}"/>`);
  }
  const Le = helio.earth;
  const amax = Math.log(1 + 30.1 * 1.6);
  const rad = (au) => R * 0.12 + R * 0.72 * (Math.log(1 + au * 1.6) / amax);
  const phi = (L) => (L - Le - 90) * Math.PI / 180;
  const P = (L, r) => [cx + r * Math.cos(phi(L)), cy - r * Math.sin(phi(L))];
  out.push(`<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(R * 0.86)}" fill="none" stroke="${ink}" stroke-opacity=".22" stroke-width="${f2(R * 0.002)}"/>`);
  for (let i = 0; i < 12; i++) {
    const [x1, y1] = P(i * 30, R * 0.86); const [x2, y2] = P(i * 30, R * 0.95);
    out.push(`<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="${ink}" stroke-opacity=".28" stroke-width="${f2(R * 0.002)}"/>`);
    const [gx, gy] = P(i * 30 + 15, R * 0.905); const gs = R * 0.05;
    out.push(`<g opacity=".72">${glyph(SIGN_KEYS[i], gx - gs / 2, gy - gs / 2, gs, ink, 1.3)}</g>`);
  }
  for (let k = 0; k < 360; k++) {
    if (k % 30 === 0) continue;
    const [x1, y1] = P(k, R * 0.86); const [x2, y2] = P(k, R * (k % 5 ? 0.872 : 0.882));
    out.push(`<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="${ink}" stroke-opacity=".22" stroke-width="${f2(R * 0.0015)}"/>`);
  }
  for (const b of ORRERY) {
    out.push(`<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(rad(AU[b]))}" fill="none" stroke="${ink}" stroke-opacity="${b === 'earth' ? 0.5 : 0.2}" stroke-width="${f2(R * (b === 'earth' ? 0.0028 : 0.0018))}"/>`);
  }
  const sr = R * 0.075;
  out.push(`<image href="${stills.sun}" x="${f1(cx - sr)}" y="${f1(cy - sr)}" width="${f1(2 * sr)}" height="${f1(2 * sr)}"/>`);
  for (const b of ORRERY) {
    const [x, y] = P(helio[b], rad(AU[b])); const s = R * DISC[b];
    out.push(`<image href="${stills[b]}" x="${f1(x - s)}" y="${f1(y - s)}" width="${f1(2 * s)}" height="${f1(2 * s)}"/>`);
    if (b === 'earth') {
      const mr = s * 2.0; const ms = R * 0.018;
      const mx = x + mr * Math.cos(phi(moonLon)); const my = y - mr * Math.sin(phi(moonLon));
      out.push(`<image href="${stills.moon}" x="${f1(mx - ms)}" y="${f1(my - ms)}" width="${f1(2 * ms)}" height="${f1(2 * ms)}"/>`);
      out.push(`<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(s * 1.45)}" fill="none" stroke="${c.copper}" stroke-width="${f2(R * 0.003)}"/>`);
    }
  }
  const [ex, ey] = P(Le, rad(1)); const [tx, ty] = P(Le + 180, R * 0.86);
  out.push(`<line x1="${f1(ex)}" y1="${f1(ey - R * 0.07)}" x2="${f1(tx)}" y2="${f1(ty)}" stroke="${c.copper}" stroke-opacity=".55" stroke-dasharray="${f1(R * 0.006)} ${f1(R * 0.012)}" stroke-width="${f2(R * 0.0025)}"/>`);
  return out.join('');
}

function proofWheel(cx, cy, R, { pos, asc, mc, houses, c }) {
  const ink = c.ink; const muted = c.muted; const accent = c.copper;
  const out = [
    `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(R)}" fill="none" stroke="${ink}" stroke-width="${f2(R * 0.012)}"/>`,
    `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(R * 0.8)}" fill="none" stroke="${ink}" stroke-width="${f2(R * 0.008)}"/>`,
    `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(R * 0.42)}" fill="none" stroke="${muted}" stroke-opacity=".6" stroke-width="${f2(R * 0.006)}"/>`,
  ];
  const ang = (lon) => (180 - (((lon - asc) % 360) + 360) % 360) * Math.PI / 180;
  const P = (lon, r) => [cx + r * Math.cos(ang(lon)), cy - r * Math.sin(ang(lon))];
  for (let i = 0; i < 12; i++) {
    const [x1, y1] = P(i * 30, R * 0.8); const [x2, y2] = P(i * 30, R);
    out.push(`<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="${ink}" stroke-width="${f2(R * 0.008)}"/>`);
    const [gx, gy] = P(i * 30 + 15, R * 0.9); const gs = R * 0.13;
    out.push(glyph(SIGN_KEYS[i], gx - gs / 2, gy - gs / 2, gs, ink, 1.5));
  }
  for (const h of houses) {
    const [x1, y1] = P(h, R * 0.42); const [x2, y2] = P(h, R * 0.8);
    out.push(`<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="${muted}" stroke-opacity=".55" stroke-width="${f2(R * 0.005)}"/>`);
  }
  for (const lon of [asc, mc]) {
    const [x1, y1] = P(lon, R); const [x2, y2] = P(lon + 180, R);
    out.push(`<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="${accent}" stroke-width="${f2(R * 0.01)}"/>`);
  }
  const bodies = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
  const placed = [];
  for (const b of [...bodies].sort((p, q) => pos[p].lon - pos[q].lon)) {
    const lon = pos[b].lon; let disp = lon; let ring = 0.64;
    const close = placed.filter((p) => Math.abs((((lon - p[0] + 180) % 360) + 360) % 360 - 180) < 11);
    if (close.length && close[close.length - 1][1] === 0.64) ring = 0.5;
    else if (close.length) { ring = 0.64; disp = Math.max(lon, close[close.length - 1][0] + 6); }
    placed.push([disp, ring]);
    const [x1, y1] = P(lon, R * 0.8); const [x2, y2] = P(lon, R * 0.75);
    out.push(`<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="${ink}" stroke-width="${f2(R * 0.01)}"/>`);
    const [gx, gy] = P(disp, R * ring); const gs = R * 0.12;
    out.push(glyph(b, gx - gs / 2, gy - gs / 2, gs, ink, 1.6));
  }
  return out.join('');
}

const dm = (lon) => { const l = ((lon % 360) + 360) % 360; return [Math.floor(l / 30), Math.floor(l % 30), Math.floor((l % 1) * 60)]; };

function bigThree(x0, y0, colw, u, { pos, asc, c }, k = 1, dir = 'row') {
  const rows = [['sun', 'Sun', pos.sun.lon], ['moon', 'Moon', pos.moon.lon], [null, 'Rising', asc]];
  const out = [];
  rows.forEach(([g, lab, lon], i) => {
    const x = dir === 'row' ? x0 + i * colw : x0;
    const by = dir === 'row' ? y0 : y0 + i * colw;
    const [sgn, d, m] = dm(lon);
    if (g) out.push(glyph(g, x, by, 30 * u * k, c.ink, 1.5));
    else out.push(`<path d="M${f1(x + 15 * u * k)} ${f1(by + 28 * u * k)} V${f1(by + 4 * u * k)} M${f1(x + 5 * u * k)} ${f1(by + 14 * u * k)} L${f1(x + 15 * u * k)} ${f1(by + 3 * u * k)} L${f1(x + 25 * u * k)} ${f1(by + 14 * u * k)}" fill="none" stroke="${c.ink}" stroke-width="${f2(2.2 * u * k)}" stroke-linecap="round" stroke-linejoin="round"/>`);
    out.push(T(lab.toUpperCase(), 14 * u * k, x + 42 * u * k, by + 21 * u * k, c.muted, { tracking: 0.2, weight: 600 }));
    out.push(T(`${d}°${String(m).padStart(2, '0')}′`, 40 * u * k, x, by + 84 * u * k, c.ink, { weight: 500, num: true }));
    out.push(T(SIGN_NAMES[sgn], 20 * u * k, x, by + 114 * u * k, c.muted));
  });
  return out.join('');
}

/**
 * One plate as an SVG string. layout: print (A-series portrait), square, story,
 * wallpaper or bigthree. Logical width is 1200 units; height follows the aspect.
 */
export function minutePlateSvg({ W, H, layout = 'print', light = false, person, date, time, place, chart, helio, stills, specimen = true, sampleLabel = '', disclaimer = '' }) {
  const c = PAPER_NIGHT;
  const VW = 1200; const VH = Math.round(VW * H / W); const u = 1;
  const { pos, asc, mc, houses } = chart;
  const meta = `${date}  ·  ${time}  ·  ${place}`;
  const s = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VW} ${VH}" width="${f2(W)}" height="${f2(H)}" preserveAspectRatio="xMidYMid meet">`,
    `<rect width="${VW}" height="${VH}" fill="${c.paper}"/>`,
    `<rect x="40" y="40" width="${VW - 80}" height="${VH - 80}" fill="none" stroke="${c.rule}" stroke-width="2"/>`];
  const hy = layout === 'story' || layout === 'wallpaper' ? 150 : layout === 'print' ? 130 : 112;
  s.push(T('THE MINUTE PLATE', 18, 100, hy, c.muted, { tracking: 0.24, weight: 600 }));
  if (specimen) s.push(specimenMark(VW - 100, hy - 26, 15, c.copperInk));
  const orr = (cx, cy, R) => orrery(cx, cy, R, { helio, moonLon: pos.moon.lon, stills, light, c });
  const wheel = (cx, cy, R) => proofWheel(cx, cy, R, { pos, asc, mc, houses, c });
  const name = (y, size, x = VW / 2, anchor = 'middle') => T(person, size, x, y, c.ink, { anchor, family: SERIF, tracking: -0.015 });
  const footer = (yLine) => {
    s.push(`<line x1="100" y1="${yLine}" x2="${VW - 100}" y2="${yLine}" stroke="${c.rule}" stroke-width="2"/>`);
    s.push(brandMark(118, yLine + 50, 40, c));
    s.push(T('AstroPrecise', 30, 150, yLine + 60, c.ink, { family: SERIF, tracking: -0.012 }));
    s.push(T('Positions from our own engine, to about an arcminute.', 15, VW - 100, yLine + 48, c.muted, { anchor: 'end' }));
    s.push(T('Orbits not to scale. Fictional specimen chart.', 15, VW - 100, yLine + 72, c.muted, { anchor: 'end' }));
    if (sampleLabel) s.push(T(sampleLabel, 13, 100, VH - 58, c.copperInk, { tracking: 0.18, weight: 600 }));
    if (disclaimer) s.push(T(disclaimer, 13, VW - 100, VH - 58, c.muted, { anchor: 'end' }));
  };
  if (layout === 'print') {
    s.push(orr(VW / 2, 640, 440));
    s.push(name(1180, 74));
    s.push(T(meta, 22, VW / 2, 1230, c.muted, { anchor: 'middle' }));
    s.push(bigThree(100, 1300, 230, u, { pos, asc, c }));
    s.push(wheel(VW - 104 - 136, 1388, 136));
    footer(VH - 160);
  } else if (layout === 'square') {
    s.push(orr(400, 600, 330));
    s.push(name(250, 60, 790, 'start'));
    s.push(T(date, 20, 792, 292, c.muted));
    s.push(T(`${time}  ·  ${place}`, 20, 792, 318, c.muted));
    s.push(bigThree(792, 380, 165, u, { pos, asc, c }, 1, 'col'));
    footer(VH - 160);
  } else if (layout === 'story' || layout === 'wallpaper') {
    const wp = layout === 'wallpaper';
    s.push(orr(VW / 2, wp ? 990 : 760, wp ? 420 : 500));
    const ty = wp ? 1500 : 1390;
    s.push(name(ty, 84));
    s.push(T(meta, 24, VW / 2, ty + 56, c.muted, { anchor: 'middle' }));
    s.push(bigThree(150, ty + 120, 320, u, { pos, asc, c }, 1.15));
    if (!wp) s.push(wheel(VW / 2, ty + 420, 130));
    footer(VH - 160);
  } else if (layout === 'bigthree') {
    s.push(name(290, 80));
    s.push(T(meta, 22, VW / 2, 340, c.muted, { anchor: 'middle' }));
    s.push(bigThree(120, 420, 340, u, { pos, asc, c }, 1.6));
    s.push(wheel(VW / 2, 840, 150));
    footer(VH - 160);
  } else throw new Error(`unknown layout ${layout}`);
  s.push('</svg>');
  return s.join('');
}
