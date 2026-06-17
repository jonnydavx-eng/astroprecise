/**
 * AstroPrecise fulfilment — shared engine loader, chart helpers, HTML primitives.
 */
import { readFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const JS = join(ROOT, 'website', 'js');

export const SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
export const SGL = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
export const PGL = { sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂', jupiter: '♃', saturn: '♄', uranus: '♅', neptune: '♆', pluto: '♇', chiron: '⚷', northNode: '☊' };
export const PNAME = { sun: 'Sun', moon: 'Moon', mercury: 'Mercury', venus: 'Venus', mars: 'Mars', jupiter: 'Jupiter', saturn: 'Saturn', uranus: 'Uranus', neptune: 'Neptune', pluto: 'Pluto', chiron: 'Chiron', northNode: 'North Node' };
export const TRANSIT_PLANETS = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
export const SLOW_TRANSITS = ['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
export const ASPECT_DEFS = [
  { name: 'Conjunction', angle: 0, orb: 6, glyph: '☌' },
  { name: 'Sextile', angle: 60, orb: 4, glyph: '⚹' },
  { name: 'Square', angle: 90, orb: 5, glyph: '□' },
  { name: 'Trine', angle: 120, orb: 5, glyph: '△' },
  { name: 'Opposition', angle: 180, orb: 6, glyph: '☍' },
];
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Self-hosted fonts — paths resolve from website root (css/fonts.css). */
export const FONTS = `<link rel="stylesheet" href="css/fonts.css">`;

export const PRINT_CSS = `
@page{size:A4;margin:0;}
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:'Cormorant Garamond',Georgia,serif;color:#E8E0D0;background:#070608;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
.page{width:210mm;min-height:297mm;padding:26mm 24mm;position:relative;background:radial-gradient(ellipse 120% 80% at 50% 0%,#0F0B07 0%,#070608 60%,#040305 100%);page-break-after:always;overflow:hidden;}
.page:last-child{page-break-after:auto;}
.eyebrow{font-family:'Cinzel',serif;font-size:8pt;letter-spacing:.34em;text-transform:uppercase;color:#C9A227;opacity:.85;}
h1{font-family:'Cinzel',serif;font-weight:600;letter-spacing:.1em;color:#EFE3C0;font-size:28pt;line-height:1.15;margin:6pt 0;}
h2{font-family:'Cinzel',serif;font-weight:600;letter-spacing:.12em;text-transform:uppercase;font-size:11pt;color:#C9A227;margin:18pt 0 8pt;}
h3{font-family:'Cinzel',serif;font-size:10.5pt;letter-spacing:.04em;color:#E8C872;margin:12pt 0 3pt;}
p{font-size:11.5pt;line-height:1.62;margin-bottom:8pt;text-wrap:pretty;color:#DCD3C0;}
.lede{font-size:13pt;line-height:1.6;color:#E8E0D0;font-style:italic;border-left:2px solid rgba(201,162,39,.4);padding-left:14pt;margin:14pt 0;}
.meta{font-family:'Cinzel',serif;font-size:9pt;letter-spacing:.2em;color:#A89E88;margin-top:14pt;line-height:2;}
table{width:100%;border-collapse:collapse;font-size:10pt;margin:8pt 0;}
td,th{padding:4pt 6pt;border-bottom:1px solid rgba(201,162,39,.14);text-align:left;font-variant-numeric:tabular-nums;}
th{font-family:'Cinzel',serif;font-size:7.5pt;letter-spacing:.12em;text-transform:uppercase;color:#C9A227;}
.glyph{color:#E8C872;font-family:serif;font-size:12pt;}
.foot{position:absolute;bottom:12mm;left:24mm;right:24mm;display:flex;justify-content:space-between;font-family:'Cinzel',serif;font-size:7pt;letter-spacing:.16em;text-transform:uppercase;color:#5E5748;border-top:1px solid rgba(201,162,39,.15);padding-top:6pt;}
.watermark{position:absolute;top:46%;left:50%;transform:translate(-50%,-50%) rotate(-24deg);font-family:'Cinzel',serif;font-size:60pt;letter-spacing:.2em;color:rgba(201,162,39,.06);white-space:nowrap;pointer-events:none;}
.big3{display:flex;gap:10pt;margin:14pt 0;}
.big3 .b{flex:1;border:1px solid rgba(201,162,39,.3);border-radius:8pt;padding:12pt;text-align:center;background:linear-gradient(160deg,rgba(201,162,39,.06),transparent);}
.big3 .g{font-size:24pt;color:#E8C872;font-family:serif;}
.big3 .lbl{font-family:'Cinzel',serif;font-size:7pt;letter-spacing:.18em;text-transform:uppercase;color:#A89E88;margin-top:4pt;}
.big3 .v{font-size:12pt;color:#EFE3C0;margin-top:3pt;}
`;

let _engines = null;

export function loadEngines() {
  if (_engines) return _engines;
  const win = {};
  const load = (file) => new Function('window', 'console', 'document', readFileSync(join(JS, file), 'utf8'))(win, console, undefined);
  load('ephemeris.js');
  load('interpretations.js');
  load('oracle.js');
  _engines = {
    win,
    E: win.AstroEphemeris,
    I: win.AstroInterpretations || win.Interpretations || null,
    Oracle: win.AstroOracle || null,
  };
  return _engines;
}

export function parseArgs(argv) {
  const a = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t.startsWith('--')) {
      const k = t.slice(2);
      const n = argv[i + 1];
      if (n === undefined || n.startsWith('--')) a[k] = true;
      else { a[k] = n; i++; }
    } else a._.push(t);
  }
  return a;
}

export function defaultOutDir() {
  return process.env.TEMP
    ? process.env.TEMP.replace(/\\/g, '/') + '/ap-out'
    : 'C:/Users/jonny/AppData/Local/Temp/ap-out';
}

export function ensureOut(dir) {
  mkdirSync(dir, { recursive: true });
  return dir;
}

export const norm = (x) => ((x % 360) + 360) % 360;
export const sd = (l) => { const s = norm(l); return { sign: SIGNS[Math.floor(s / 30)], idx: Math.floor(s / 30), d: Math.floor(s % 30), m: Math.floor((s % 1) * 60) }; };
export const fmt = (l) => { const x = sd(l); return `${x.d}°${String(x.m).padStart(2, '0')}′ ${x.sign}`; };
export const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const slug = (name) => String(name || 'order').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'order';
/** First n complete sentences — never returns a dangling fragment. */
export const sents = (t, n = 2) => {
  if (!t) return '';
  const m = String(t).match(/[^.!?]+[.!?]+/g);
  if (m && m.length) return m.slice(0, n).join(' ').trim();
  const raw = String(t).trim();
  if (!raw) return '';
  return /[.!?]$/.test(raw) ? raw : `${raw}.`;
};

/** Truncate prose at sentence boundary within maxChars (paid fulfilment). */
export const trimProse = (t, maxChars = 200) => {
  if (!t) return '';
  const raw = String(t).trim();
  if (raw.length <= maxChars) return /[.!?]$/.test(raw) ? raw : `${raw}.`;
  const chunk = raw.slice(0, maxChars);
  const lastStop = Math.max(chunk.lastIndexOf('.'), chunk.lastIndexOf('!'), chunk.lastIndexOf('?'));
  if (lastStop > maxChars * 0.4) return chunk.slice(0, lastStop + 1).trim();
  const nextStop = raw.slice(maxChars).search(/[.!?]/);
  if (nextStop >= 0 && nextStop < 120) return raw.slice(0, maxChars + nextStop + 1).trim();
  return chunk.trim().replace(/\s+\S*$/, '') + '.';
};
export const ord = (n) => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };

export function parseDob(dob) {
  if (!dob) return null;
  if (typeof dob === 'string') {
    const iso = dob.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return { y: +iso[1], mo: +iso[2], d: +iso[3], date: `${iso[3]}/${iso[2]}/${iso[1]}` };
    const slash = dob.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/);
    if (slash) return { y: +slash[3], mo: +slash[2], d: +slash[1], date: `${slash[1]} ${MONTHS[+slash[2] - 1]} ${slash[3]}` };
  }
  if (typeof dob === 'object' && dob.year) {
    return { y: +dob.year, mo: +dob.month, d: +dob.day, date: `${dob.day} ${MONTHS[+dob.month - 1]} ${dob.year}` };
  }
  return null;
}

export function parseBirthTime(raw) {
  const t = String(raw || '').trim().toLowerCase();
  if (!t || t === 'unknown' || t === 'unk' || t === 'n/a') return { h: 12, mi: 0, unknown: true, label: '12:00 (solar chart — time unknown)' };
  const m = t.match(/(\d{1,2})[:.](\d{2})/);
  if (m) return { h: +m[1], mi: +m[2], unknown: false, label: `${m[1].padStart(2, '0')}:${m[2]}` };
  const hOnly = t.match(/^(\d{1,2})$/);
  if (hOnly) return { h: +hOnly[1], mi: 0, unknown: false, label: `${hOnly[1].padStart(2, '0')}:00` };
  return { h: 12, mi: 0, unknown: true, label: t };
}

export function geocodePlace(place, cities) {
  const q = String(place || '').toLowerCase().replace(/[,]/g, ' ');
  if (!q) return null;
  let best = null;
  let bestScore = 0;
  for (const c of cities || []) {
    const name = c.name.toLowerCase();
    let score = 0;
    if (q.includes(name)) score = name.length + 10;
    else if (name.split(' ').some((w) => w.length > 3 && q.includes(w))) score = 5;
    if (score > bestScore) { bestScore = score; best = c; }
  }
  if (!best) return null;
  return { lat: best.lat, lon: best.lon, tz: best.tz, city: best.name, country: best.country };
}

export function enrichOrder(order, E) {
  const out = { ...order };
  const dob = parseDob(order.dob || order.birthDate);
  if (dob) {
    out.y = out.y ?? dob.y;
    out.mo = out.mo ?? dob.mo;
    out.d = out.d ?? dob.d;
    out.date = out.date || dob.date;
  }
  const bt = parseBirthTime(order.time || order.birth_time || order.birthTime);
  out.h = out.h ?? bt.h;
  out.mi = out.mi ?? bt.mi;
  out.time = out.time || bt.label;
  out.timeUnknown = bt.unknown;
  out.name = out.name || order.chart_name || order.chartName || 'Chart';
  out.place = out.place || order.birth_place || order.birthPlace || '';
  if ((out.lat == null || out.lon == null) && out.place) {
    const geo = geocodePlace(out.place, E.CITIES);
    if (geo) {
      out.lat = geo.lat;
      out.lon = geo.lon;
      out.tz = geo.tz;
      if (!out.place.includes(geo.city)) out.place = `${geo.city}, ${geo.country}`;
    }
  }
  out.house = out.house || 'placidus';
  return out;
}

export function buildChart(order, E) {
  const o = enrichOrder(order, E);
  if (![o.y, o.mo, o.d, o.h, o.mi, o.lat, o.lon].every((x) => Number.isFinite(x))) {
    throw new Error('Order missing birth data — need y/mo/d/h/mi/lat/lon (or birth_place for geocode)');
  }
  const c = E.calculateNatalChart(o.y, o.mo, o.d, o.h, o.mi, o.lat, o.lon, o.house);
  const houses = c.houses;
  const houseOf = (lon) => {
    lon = norm(lon);
    for (let i = 0; i < 12; i++) {
      const a = houses[i], b = houses[(i + 1) % 12];
      const span = norm(b - a) || 30;
      if (norm(lon - a) < span) return i + 1;
    }
    return 1;
  };
  const bodies = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'chiron', 'northNode'];
  const pos = {};
  bodies.forEach((k) => {
    const p = c.positions[k];
    pos[k] = { lon: p.longitude, ...sd(p.longitude), house: houseOf(p.longitude), retro: p.retrograde };
  });
  return { order: o, chart: c, pos, asc: c.ascendant, mc: c.midheaven, A: sd(c.ascendant), M: sd(c.midheaven), houses };
}

export function natalLongitudes(pos) {
  const out = {};
  for (const [k, v] of Object.entries(pos)) {
    const name = PNAME[k] || k;
    if (v && Number.isFinite(v.lon)) out[name] = v.lon;
  }
  return out;
}

export function angDiff(a, b) { return ((a - b) % 360 + 540) % 360 - 180; }

export function jdToUTCDate(jd) {
  const z = Math.floor(jd + 0.5);
  const f = jd + 0.5 - z;
  let A = z;
  if (z >= 2299161) {
    const a = Math.floor((z - 1867216.25) / 36524.25);
    A = z + 1 + a - Math.floor(a / 4);
  }
  const B = A + 1524;
  const C = Math.floor((B - 122.1) / 365.25);
  const D = Math.floor(365.25 * C);
  const Eg = Math.floor((B - D) / 30.6001);
  const dayFrac = B - D - Math.floor(30.6001 * Eg) + f;
  const day = Math.floor(dayFrac);
  const month = Eg < 14 ? Eg - 1 : Eg - 13;
  const year = month > 2 ? C - 4716 : C - 4715;
  let hourFrac = (dayFrac - day) * 24;
  let hour = Math.floor(hourFrac);
  let minute = Math.round((hourFrac - hour) * 60);
  if (minute === 60) { minute = 0; hour += 1; }
  return { year, month, day, hour, minute };
}

export function nextSolarReturn(E, by, bm, bd, bhh, bmm, fromDate = new Date()) {
  const jdNatal = E.julianDay(by, bm, bd, bhh || 0, bmm || 0, 0);
  const natalSunLon = E.sunPosition(jdNatal).lon;
  const sunLonAt = (jd) => E.sunPosition(jd).lon;
  let year = fromDate.getUTCFullYear();
  const birthdayThisYear = Date.UTC(year, bm - 1, bd);
  if (birthdayThisYear < Date.UTC(fromDate.getUTCFullYear(), fromDate.getUTCMonth(), fromDate.getUTCDate())) year += 1;
  let lo = E.julianDay(year, bm, bd, 0, 0, 0) - 6;
  let hi = lo + 12;
  let dLo = angDiff(sunLonAt(lo), natalSunLon);
  if (Math.sign(dLo) === Math.sign(angDiff(sunLonAt(hi), natalSunLon))) lo -= 4;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const dMid = angDiff(sunLonAt(mid), natalSunLon);
    if (Math.sign(dMid) === Math.sign(dLo)) { lo = mid; dLo = dMid; }
    else hi = mid;
  }
  const jd = (lo + hi) / 2;
  const lon = sunLonAt(jd);
  return { jd, date: jdToUTCDate(jd), sunLon: lon, sign: E.signOf(lon), degree: E.degreeInSign(lon), natalSunLon };
}

export function getTransitLongitudes(E, jd) {
  const out = {};
  if (typeof E.allPlanetPositions === 'function') {
    const all = E.allPlanetPositions(jd);
    for (const name of TRANSIT_PLANETS) {
      const p = all[name];
      const lon = p && typeof p.lon === 'number' ? p.lon : (typeof p === 'number' ? p : null);
      if (lon != null) out[name] = norm(lon);
    }
    return out;
  }
  for (const name of TRANSIT_PLANETS) {
    const fn = E[name.toLowerCase() + 'Position'];
    if (typeof fn === 'function') {
      try { out[name] = norm(fn(jd).lon); } catch { /* skip */ }
    }
  }
  return out;
}

export function scanTransitAspects(transits, natal, { slowOnly = false } = {}) {
  const hits = [];
  const tNames = slowOnly ? SLOW_TRANSITS : TRANSIT_PLANETS;
  for (const tName of tNames) {
    const tLon = transits[tName];
    if (tLon == null) continue;
    for (const [nName, nLon] of Object.entries(natal)) {
      let diff = Math.abs(norm(tLon - nLon));
      if (diff > 180) diff = 360 - diff;
      for (const a of ASPECT_DEFS) {
        const orb = Math.abs(diff - a.angle);
        if (orb <= a.orb) {
          const weight = 1 + (TRANSIT_PLANETS.indexOf(tName) / TRANSIT_PLANETS.length);
          hits.push({ transit: tName, natal: nName, aspect: a.name, glyph: a.glyph, orb, score: (a.orb - orb + 0.01) * weight, date: null });
          break;
        }
      }
    }
  }
  hits.sort((a, b) => b.score - a.score);
  return hits;
}

/** Sample weekly across N months; dedupe by transit-natal-aspect peak. */
export function scanYearTransits(E, natal, start = new Date(), months = 12) {
  const events = [];
  const seen = new Set();
  const end = new Date(start);
  end.setMonth(end.getMonth() + months);
  for (let d = new Date(start); d < end; d.setDate(d.getDate() + 7)) {
    const jd = E.julianDay(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), 12, 0, 0);
    const transits = getTransitLongitudes(E, jd);
    const hits = scanTransitAspects(transits, natal, { slowOnly: true }).slice(0, 4);
    for (const h of hits) {
      const key = `${h.transit}-${h.aspect}-${h.natal}`;
      if (seen.has(key)) continue;
      seen.add(key);
      events.push({ ...h, date: d.toISOString().slice(0, 10), month: MONTHS[d.getUTCMonth()] + ' ' + d.getUTCFullYear() });
    }
  }
  events.sort((a, b) => a.date.localeCompare(b.date));
  return events;
}

export function htmlDoc(title, css, body, watermark = '') {
  const wm = watermark ? `<div class="watermark">${esc(watermark)}</div>` : '';
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>${FONTS}<style>${css}</style></head><body>${body.replace(/\{\{WM\}\}/g, wm)}</body></html>`;
}

export function voucherCode(orderId) {
  const base = String(orderId || 'GIFT').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return 'AP-' + (base.slice(-8) || 'GIFT').padStart(8, '0');
}

/** Element palette — matches website/js/chart-render.js (warm observatory). */
export const SIGN_ELEMENT = {
  Aries: 'fire', Leo: 'fire', Sagittarius: 'fire',
  Taurus: 'earth', Virgo: 'earth', Capricorn: 'earth',
  Gemini: 'air', Libra: 'air', Aquarius: 'air',
  Cancer: 'water', Scorpio: 'water', Pisces: 'water',
};
export const ELEMENT_FILL = {
  fire: 'rgba(216,90,44,.22)', earth: 'rgba(94,122,58,.22)',
  air: 'rgba(167,139,186,.2)', water: 'rgba(63,125,118,.22)',
};
export const ELEMENT_STROKE = {
  fire: '#F0A878', earth: '#A8C07A', air: '#C6AEDA', water: '#7FB8B0',
};
const ASPECT_COLORS = { Conjunction: '#E8C872', Trine: '#5fae8a', Sextile: '#5fae8a', Square: '#b06a6a', Opposition: '#c98e5a' };

/**
 * Premium natal wheel SVG — same geometry as chart-render (ASC at 9 o'clock).
 * Used by all paid PDF/HTML deliverables for visual consistency.
 */
export function natalWheelSvg({
  size,
  asc,
  houses,
  pos,
  aspects = [],
  mc = null,
  bodies = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'chiron', 'northNode'],
  idPrefix = 'apw',
}) {
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 8;
  const rSign = R - size * 0.085;
  const rHouse = rSign - size * 0.11;
  const rPlanet = rHouse - size * 0.05;
  const rAspect = rPlanet - size * 0.02;
  const ang = (lon) => (180 - (norm(lon) - asc)) * Math.PI / 180;
  const pt = (lon, r) => [cx + r * Math.cos(ang(lon)), cy - r * Math.sin(ang(lon))];
  const arc = (lon0, lon1, r0, r1) => {
    const [x1, y1] = pt(lon0, r0);
    const [x2, y2] = pt(lon1, r0);
    const [x3, y3] = pt(lon1, r1);
    const [x4, y4] = pt(lon0, r1);
    const span = ((lon1 - lon0) % 360 + 360) % 360;
    const large = span > 180 ? 1 : 0;
    return `M${x1.toFixed(1)},${y1.toFixed(1)} A${r0},${r0} 0 ${large},1 ${x2.toFixed(1)},${y2.toFixed(1)} L${x3.toFixed(1)},${y3.toFixed(1)} A${r1},${r1} 0 ${large},0 ${x4.toFixed(1)},${y4.toFixed(1)} Z`;
  };

  let s = `<defs>
    <radialGradient id="${idPrefix}-bg" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#13100C"/><stop offset="60%" stop-color="#0D0A07"/><stop offset="100%" stop-color="#050406"/>
    </radialGradient>
    <filter id="${idPrefix}-glow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="1.8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>`;

  s += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#${idPrefix}-bg)"/>`;

  let seed = 0xA57E0E5E;
  const rand = () => { seed = Math.imul(seed ^ (seed >>> 16), 0x45D9F3B); seed = Math.imul(seed ^ (seed >>> 16), 0x45D9F3B); seed ^= seed >>> 16; return (seed >>> 0) / 0xFFFFFFFF; };
  for (let i = 0; i < 90; i++) {
    const r = rand() * R * 0.92;
    const a = rand() * Math.PI * 2;
    const sx = cx + r * Math.cos(a);
    const sy = cy + r * Math.sin(a);
    s += `<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="${(rand() * 0.9 + 0.25).toFixed(2)}" fill="#fff" opacity="${(rand() * 0.35 + 0.12).toFixed(2)}"/>`;
  }

  for (let i = 0; i < 12; i++) {
    const sign = SIGNS[i];
    const elem = SIGN_ELEMENT[sign];
    s += `<path d="${arc(i * 30, i * 30 + 30, R, rSign)}" fill="${ELEMENT_FILL[elem]}" stroke="${ELEMENT_STROKE[elem]}" stroke-width=".4" opacity=".85"/>`;
    const [x1, y1] = pt(i * 30, rSign);
    const [x2, y2] = pt(i * 30, R);
    s += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#C9A227" stroke-width=".65" opacity=".45"/>`;
    const [gx, gy] = pt(i * 30 + 15, (R + rSign) / 2);
    s += `<text x="${gx.toFixed(1)}" y="${gy.toFixed(1)}" font-size="${size * 0.034}" fill="${ELEMENT_STROKE[elem]}" text-anchor="middle" dominant-baseline="middle" alignment-baseline="middle" font-family="serif">${SGL[i]}</text>`;
  }

  s += `<circle cx="${cx}" cy="${cy}" r="${rSign}" fill="none" stroke="#C9A227" stroke-width="1" opacity=".55"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="${rHouse}" fill="none" stroke="#C9A227" stroke-width=".7" opacity=".35"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="${rAspect}" fill="none" stroke="#C9A227" stroke-width=".5" opacity=".22"/>`;

  for (let i = 0; i < 12; i++) {
    const axis = [0, 3, 6, 9].includes(i);
    const [x1, y1] = pt(houses[i], rAspect);
    const [x2, y2] = pt(houses[i], rHouse);
    s += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${axis ? 'rgba(232,200,114,.85)' : 'rgba(201,162,39,.32)'}" stroke-width="${axis ? 1.5 : 0.65}"/>`;
    const mid = norm(houses[i] + (norm(houses[(i + 1) % 12] - houses[i]) / 2));
    const [nx, ny] = pt(mid, rHouse - size * 0.028);
    s += `<text x="${nx.toFixed(1)}" y="${ny.toFixed(1)}" font-size="${size * 0.018}" fill="#A89E88" text-anchor="middle" dominant-baseline="middle" alignment-baseline="middle" font-family="sans-serif">${i + 1}</text>`;
  }

  aspects.forEach((asp) => {
    const [x1, y1] = pt(pos[asp.a].lon, rAspect);
    const [x2, y2] = pt(pos[asp.b].lon, rAspect);
    s += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${ASPECT_COLORS[asp.type] || '#888'}" stroke-width=".55" opacity=".45"/>`;
  });

  bodies.forEach((k) => {
    if (!pos[k]) return;
    const [px, py] = pt(pos[k].lon, rPlanet);
    const [tx, ty] = pt(pos[k].lon, rHouse - size * 0.005);
    s += `<line x1="${tx.toFixed(1)}" y1="${ty.toFixed(1)}" x2="${px.toFixed(1)}" y2="${py.toFixed(1)}" stroke="rgba(232,200,114,.35)" stroke-width=".45"/>`;
    s += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${size * 0.024}" fill="rgba(8,6,5,.92)" stroke="#C9A227" stroke-width=".7" filter="url(#${idPrefix}-glow)"/>`;
    s += `<text x="${px.toFixed(1)}" y="${py.toFixed(1)}" font-size="${size * 0.027}" fill="#EFE3C0" text-anchor="middle" dominant-baseline="middle" alignment-baseline="middle" font-family="serif">${PGL[k]}</text>`;
  });

  const [ax, ay] = pt(asc, R + size * 0.02);
  s += `<text x="${ax.toFixed(1)}" y="${ay.toFixed(1)}" font-size="${size * 0.02}" fill="#E8C872" text-anchor="middle" font-family="sans-serif" font-weight="bold">ASC</text>`;
  const mcLon = mc ?? houses[9] ?? houses[10];
  if (mcLon != null) {
    const [mx, my] = pt(mcLon, R + size * 0.02);
    s += `<text x="${mx.toFixed(1)}" y="${my.toFixed(1)}" font-size="${size * 0.02}" fill="#E8C872" text-anchor="middle" font-family="sans-serif" font-weight="bold">MC</text>`;
  }
  s += `<circle cx="${cx}" cy="${cy}" r="3.5" fill="#C9A227" opacity=".9"/>`;

  return `<svg viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" role="img" aria-label="Natal chart wheel">${s}</svg>`;
}

/** Which artefacts each live SKU should emit. */
export const SKU_DELIVER = {
  'deep-reading': { reading: true, poster: false },
  'natal-poster-pdf': { reading: false, poster: true },
  'reading-poster-bundle': { reading: true, poster: true },
  'gift-reading-redeem': { reading: true, poster: false },
};

export function deliverablesForProduct(product) {
  return SKU_DELIVER[product] || { reading: true, poster: true };
}

export function isPaidOrder(order = {}) {
  return !!(order.orderId && String(order.orderId).trim());
}

/** JSON comment embedded in paid HTML for audit + re-verification. */
export function paidMetaBlock(order, chartMeta = {}) {
  const meta = {
    product: order.product || 'unknown',
    orderId: order.orderId || null,
    engine: 'VSOP87/ELP2000',
    houseSystem: order.house || 'placidus',
    generated: new Date().toISOString(),
    ...chartMeta,
  };
  return `<!-- ap-paid-meta:${JSON.stringify(meta)} -->`;
}