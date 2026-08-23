/**
 * AstroPrecise fulfilment — shared engine loader, chart helpers, HTML primitives.
 */
import { readFileSync, mkdirSync } from 'fs';
import { createHash, createHmac, timingSafeEqual } from 'crypto';
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

/** Astrological-symbol font stack for SVG glyph <text> — 'AstroGlyph' (self-hosted
 *  Noto Sans Symbols, from css/fonts.css) covers the zodiac/planet code points so
 *  they never fall back to tofu boxes or colour-emoji. Same fix chart-render.js uses. */
export const GLYPH_FONT = "'AstroGlyph', 'Noto Sans Symbols', serif";

export const STUDIO_PALETTE = Object.freeze({
  void: '#040812',
  raised: '#0A1424',
  paper: '#EEF4FA',
  silver: '#93A8BF',
  ion: '#8BA9FF',
  violet: '#A897FF',
  mint: '#6FD0B3',
  rose: '#FF8EA8',
  cyan: '#79C7F2',
});

export const PRINT_CSS = `
@page{size:A4;margin:0;}
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:'Cormorant Garamond',Georgia,serif;color:#EEF4FA;background:#040812;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
.page{width:210mm;height:297mm;padding:26mm 24mm;position:relative;background:radial-gradient(ellipse 120% 80% at 50% 0%,#0A1424 0%,#07101E 60%,#040812 100%);page-break-after:always;overflow:hidden;}
.page:last-child{page-break-after:auto;}
.eyebrow{font-family:'Cinzel',serif;font-size:8pt;letter-spacing:.34em;text-transform:uppercase;color:#8BA9FF;opacity:.95;}
h1{font-family:'Cinzel',serif;font-weight:600;letter-spacing:.1em;color:#EEF4FA;font-size:28pt;line-height:1.15;margin:6pt 0;}
h2{font-family:'Cinzel',serif;font-weight:600;letter-spacing:.12em;text-transform:uppercase;font-size:11pt;color:#8BA9FF;margin:18pt 0 8pt;}
h3{font-family:'Cinzel',serif;font-size:10.5pt;letter-spacing:.04em;color:#C9D6E3;margin:12pt 0 3pt;}
p{font-size:11.5pt;line-height:1.62;margin-bottom:8pt;text-wrap:pretty;color:#D7E2ED;}
.lede{font-size:13pt;line-height:1.6;color:#EEF4FA;font-style:italic;border-left:2px solid rgba(139,169,255,.52);padding-left:14pt;margin:14pt 0;}
.meta{font-family:'Cinzel',serif;font-size:9pt;letter-spacing:.2em;color:#93A8BF;margin-top:14pt;line-height:2;}
table{width:100%;border-collapse:collapse;font-size:10pt;margin:8pt 0;}
td,th{padding:4pt 6pt;border-bottom:1px solid rgba(147,168,191,.2);text-align:left;font-variant-numeric:tabular-nums;}
th{font-family:'Cinzel',serif;font-size:7.5pt;letter-spacing:.12em;text-transform:uppercase;color:#8BA9FF;}
.glyph{color:#C9D6E3;font-family:serif;font-size:12pt;}
.foot{position:absolute;bottom:12mm;left:24mm;right:24mm;display:flex;justify-content:space-between;font-family:'Cinzel',serif;font-size:7pt;letter-spacing:.16em;text-transform:uppercase;color:#93A8BF;border-top:1px solid rgba(147,168,191,.24);padding-top:6pt;}
.watermark{position:absolute;top:46%;left:50%;transform:translate(-50%,-50%) rotate(-24deg);font-family:'Cinzel',serif;font-size:60pt;letter-spacing:.2em;color:rgba(139,169,255,.08);white-space:nowrap;pointer-events:none;}
.big3{display:flex;gap:10pt;margin:14pt 0;}
.big3 .b{flex:1;border:1px solid rgba(147,168,191,.34);border-radius:8pt;padding:12pt;text-align:center;background:linear-gradient(160deg,rgba(139,169,255,.08),transparent);}
.big3 .g{font-size:24pt;color:#C9D6E3;font-family:serif;}
.big3 .lbl{font-family:'Cinzel',serif;font-size:7pt;letter-spacing:.18em;text-transform:uppercase;color:#93A8BF;margin-top:4pt;}
.big3 .v{font-size:12pt;color:#EEF4FA;margin-top:3pt;}
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
export const sha256 = (value) => createHash('sha256').update(value).digest('hex');

/**
 * Normalise a buyer-visible field before it reaches a template. The generator
 * still HTML-escapes at the point of use; this guard limits storage/log abuse
 * and rejects invisible control characters.
 */
export function cleanDisplayText(value, { label = 'value', max = 120, required = true } = {}) {
  const text = String(value ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
  if (required && !text) throw new Error(`${label} is required`);
  if (text.length > max) throw new Error(`${label} exceeds ${max} characters`);
  const hasControlCharacter = Array.from(text).some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  });
  if (hasControlCharacter) throw new Error(`${label} contains control characters`);
  return text;
}

function integer(value, label) {
  const n = Number(value);
  if (!Number.isInteger(n)) throw new Error(`${label} must be an integer`);
  return n;
}

function validCalendarDate(y, mo, d) {
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

function zonedParts(formatter, date) {
  const out = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== 'literal') out[part.type] = Number(part.value);
  }
  return { y: out.year, mo: out.month, d: out.day, h: out.hour, mi: out.minute };
}

/**
 * Resolve a civil clock reading through the IANA time-zone database. We find
 * all UTC instants that round-trip to the supplied wall time. This deliberately
 * fails on spring-forward gaps and requires an explicit offset for repeated
 * autumn times, instead of silently choosing the wrong hour.
 */
export function civilTimeToUtc({ y, mo, d, h, mi, tz, utcOffsetMinutes }) {
  const zone = cleanDisplayText(tz, { label: 'IANA time zone', max: 64 });
  let formatter;
  try {
    formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: zone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    });
    formatter.format(new Date(0));
  } catch {
    throw new Error(`Unsupported IANA time zone: ${zone}`);
  }

  const localStamp = Date.UTC(y, mo - 1, d, h, mi);
  const candidates = [];
  for (let delta = -14 * 60; delta <= 14 * 60; delta += 1) {
    const instant = new Date(localStamp + delta * 60_000);
    const p = zonedParts(formatter, instant);
    if (p.y === y && p.mo === mo && p.d === d && p.h === h && p.mi === mi) {
      candidates.push({ instant, offsetMinutes: Math.round((localStamp - instant.getTime()) / 60_000) });
    }
  }

  if (!candidates.length) {
    throw new Error(`Birth time ${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')} ${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')} does not exist in ${zone}`);
  }
  let chosen = candidates[0];
  if (candidates.length > 1) {
    // The browser chart exporter cannot yet select a DST fold occurrence. Fail
    // closed even when an offset was supplied so every delivered asset agrees.
    throw new Error(`Birth time is ambiguous in ${zone}; Studio orders at a repeated DST minute require manual clarification and are not currently accepted`);
  }
  const instant = chosen.instant;
  return {
    instant: instant.toISOString(),
    y: instant.getUTCFullYear(), mo: instant.getUTCMonth() + 1, d: instant.getUTCDate(),
    h: instant.getUTCHours(), mi: instant.getUTCMinutes(),
    tz: zone, offsetMinutes: chosen.offsetMinutes,
  };
}

/** Canonical launch schema for personalised Studio work: exact recorded time only. */
export function canonicalizeStudioOrder(input = {}) {
  const y = integer(input.y, 'birth year');
  const mo = integer(input.mo, 'birth month');
  const d = integer(input.d, 'birth day');
  const h = integer(input.h, 'birth hour');
  const mi = integer(input.mi, 'birth minute');
  const currentYear = new Date().getUTCFullYear();
  if (y < 1900 || y > currentYear) throw new Error(`birth year must be between 1900 and ${currentYear}`);
  if (mo < 1 || mo > 12 || !validCalendarDate(y, mo, d)) throw new Error('birth date is not a valid calendar date');
  if (h < 0 || h > 23 || mi < 0 || mi > 59) throw new Error('birth time must be a valid 24-hour clock time');
  const lat = Number(input.lat);
  const lon = Number(input.lon);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) throw new Error('latitude must be between -90 and 90');
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) throw new Error('longitude must be between -180 and 180');
  const timeAccuracy = cleanDisplayText(input.timeAccuracy || '', { label: 'timeAccuracy', max: 16 });
  if (timeAccuracy !== 'exact') {
    throw new Error('Studio launch products require timeAccuracy "exact"; approximate or unknown times are not accepted');
  }
  const name = cleanDisplayText(input.name || input.chart_name, { label: 'display name', max: 80 });
  const place = cleanDisplayText(input.place || input.birth_place, { label: 'birth place', max: 120 });
  const house = cleanDisplayText(input.house || 'placidus', { label: 'house system', max: 16 }).toLowerCase();
  if (house !== 'placidus') throw new Error('Studio launch products support only the Placidus house system');
  const zone = civilTimeToUtc({ y, mo, d, h, mi, tz: input.tz, utcOffsetMinutes: input.utcOffsetMinutes });
  if (Date.parse(zone.instant) > Date.now()) throw new Error('birth moment cannot be in the future');
  return {
    ...input,
    name,
    place,
    y, mo, d, h, mi, lat, lon,
    timeAccuracy,
    house,
    tz: zone.tz,
    utcOffsetMinutes: zone.offsetMinutes,
    utc: { y: zone.y, mo: zone.mo, d: zone.d, h: zone.h, mi: zone.mi, instant: zone.instant },
  };
}
/** First n complete sentences — never returns a dangling fragment.
 *  A period between digits (e.g. an orb "1.7°" or a decimal) is NOT a sentence
 *  boundary — mask it so "orb 0.0°" never splits into "orb 0. 0°". */
export const sents = (t, n = 2) => {
  if (!t) return '';
  const DOT = ''; // control-char sentinel — never appears in prose
  const masked = String(t).replace(/(\d)\.(\d)/g, `$1${DOT}$2`);
  const unmask = (str) => str.split(DOT).join('.');
  const m = masked.match(/[^.!?]+[.!?]+/g);
  if (m && m.length) return unmask(m.slice(0, n).join('').replace(/\s+/g, ' ').trim());
  const raw = masked.trim();
  if (!raw) return '';
  return unmask(/[.!?]$/.test(raw) ? raw : `${raw}.`);
}

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

/** Midnight Meridian 2026 element palette — no retired brass/orange. */
export const SIGN_ELEMENT = {
  Aries: 'fire', Leo: 'fire', Sagittarius: 'fire',
  Taurus: 'earth', Virgo: 'earth', Capricorn: 'earth',
  Gemini: 'air', Libra: 'air', Aquarius: 'air',
  Cancer: 'water', Scorpio: 'water', Pisces: 'water',
};
export const ELEMENT_FILL = {
  fire: 'rgba(255,142,168,.16)', earth: 'rgba(111,208,179,.15)',
  air: 'rgba(168,151,255,.16)', water: 'rgba(121,199,242,.16)',
};
export const ELEMENT_STROKE = {
  fire: STUDIO_PALETTE.rose, earth: STUDIO_PALETTE.mint,
  air: STUDIO_PALETTE.violet, water: STUDIO_PALETTE.cyan,
};
const ASPECT_COLORS = {
  Conjunction: STUDIO_PALETTE.ion,
  Trine: STUDIO_PALETTE.mint,
  Sextile: STUDIO_PALETTE.cyan,
  Square: STUDIO_PALETTE.rose,
  Opposition: STUDIO_PALETTE.violet,
};

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
      <stop offset="0%" stop-color="#101D30"/><stop offset="60%" stop-color="#07101E"/><stop offset="100%" stop-color="#040812"/>
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
    s += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#93A8BF" stroke-width=".65" opacity=".52"/>`;
    const [gx, gy] = pt(i * 30 + 15, (R + rSign) / 2);
    s += `<text x="${gx.toFixed(1)}" y="${gy.toFixed(1)}" font-size="${size * 0.034}" fill="${ELEMENT_STROKE[elem]}" text-anchor="middle" dominant-baseline="middle" alignment-baseline="middle" font-family="${GLYPH_FONT}">${SGL[i]}</text>`;
  }

  s += `<circle cx="${cx}" cy="${cy}" r="${rSign}" fill="none" stroke="#8BA9FF" stroke-width="1" opacity=".7"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="${rHouse}" fill="none" stroke="#93A8BF" stroke-width=".7" opacity=".42"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="${rAspect}" fill="none" stroke="#93A8BF" stroke-width=".5" opacity=".28"/>`;

  for (let i = 0; i < 12; i++) {
    const axis = [0, 3, 6, 9].includes(i);
    const [x1, y1] = pt(houses[i], rAspect);
    const [x2, y2] = pt(houses[i], rHouse);
    s += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${axis ? 'rgba(139,169,255,.92)' : 'rgba(147,168,191,.38)'}" stroke-width="${axis ? 1.5 : 0.65}"/>`;
    const mid = norm(houses[i] + (norm(houses[(i + 1) % 12] - houses[i]) / 2));
    const [nx, ny] = pt(mid, rHouse - size * 0.028);
    s += `<text x="${nx.toFixed(1)}" y="${ny.toFixed(1)}" font-size="${size * 0.018}" fill="#93A8BF" text-anchor="middle" dominant-baseline="middle" alignment-baseline="middle" font-family="sans-serif">${i + 1}</text>`;
  }

  aspects.forEach((asp) => {
    const [x1, y1] = pt(pos[asp.a].lon, rAspect);
    const [x2, y2] = pt(pos[asp.b].lon, rAspect);
    s += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${ASPECT_COLORS[asp.type] || '#888'}" stroke-width=".55" opacity=".45"/>`;
  });

  // Give close longitudes separate radial lanes so glyphs do not collide.
  const laneByBody = new Map();
  const placed = [];
  [...bodies].filter((k) => pos[k]).sort((a, b) => norm(pos[a].lon) - norm(pos[b].lon)).forEach((k) => {
    const used = new Set();
    for (const prior of placed) {
      let gap = Math.abs(norm(pos[k].lon) - norm(pos[prior].lon));
      gap = Math.min(gap, 360 - gap);
      if (gap < 7) used.add(laneByBody.get(prior));
    }
    let lane = 0;
    while (used.has(lane) && lane < 3) lane += 1;
    laneByBody.set(k, lane);
    placed.push(k);
  });

  bodies.forEach((k) => {
    if (!pos[k]) return;
    const lane = laneByBody.get(k) || 0;
    const planetRadius = rPlanet - lane * size * 0.037;
    const [px, py] = pt(pos[k].lon, planetRadius);
    const [tx, ty] = pt(pos[k].lon, rHouse - size * 0.005);
    s += `<line x1="${tx.toFixed(1)}" y1="${ty.toFixed(1)}" x2="${px.toFixed(1)}" y2="${py.toFixed(1)}" stroke="rgba(147,168,191,.46)" stroke-width=".45"/>`;
    s += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${size * 0.023}" fill="rgba(4,8,18,.94)" stroke="#8BA9FF" stroke-width=".8" filter="url(#${idPrefix}-glow)"/>`;
    s += `<text x="${px.toFixed(1)}" y="${py.toFixed(1)}" font-size="${size * 0.026}" fill="#EEF4FA" text-anchor="middle" dominant-baseline="middle" alignment-baseline="middle" font-family="${GLYPH_FONT}">${PGL[k]}</text>`;
  });

  const labelRadius = R - size * 0.018;
  const [ax, ay] = pt(asc, labelRadius);
  s += `<text x="${ax.toFixed(1)}" y="${ay.toFixed(1)}" font-size="${size * 0.018}" fill="#EEF4FA" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-weight="bold">ASC</text>`;
  const mcLon = mc ?? houses[9] ?? houses[10];
  if (mcLon != null) {
    const [mx, my] = pt(mcLon, labelRadius);
    s += `<text x="${mx.toFixed(1)}" y="${my.toFixed(1)}" font-size="${size * 0.018}" fill="#EEF4FA" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-weight="bold">MC</text>`;
  }
  s += `<circle cx="${cx}" cy="${cy}" r="3.5" fill="#8BA9FF" opacity=".95"/>`;

  return `<svg viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" role="img" aria-label="Natal chart wheel">${s}</svg>`;
}

/** Which artefacts each live SKU should emit. */
export const SKU_DELIVER = {
  'natal-sky-print-pack': { reading: false, poster: true },
  'personal-sky-keepsake': { reading: true, poster: true },
  'whole-sky-edition': { reading: true, poster: true },
  'deep-reading': { reading: true, poster: false },
  'natal-poster-pdf': { reading: false, poster: true },
  'reading-poster-bundle': { reading: true, poster: true },
  'gift-reading-redeem': { reading: true, poster: false },
};

export function deliverablesForProduct(product) {
  return SKU_DELIVER[product] || { reading: true, poster: true };
}

/** Enforce the service-start timing recorded for a commissioned order. */
export function assertWorkMayStart(order = {}, now = Date.now()) {
  const contractAt = Date.parse(order.contractAt);
  if (!Number.isFinite(contractAt)) throw new Error('contractAt is required before commissioned work starts');
  if (contractAt > now) throw new Error('contractAt cannot be in the future');
  if (order.earlyStartConsent === true) {
    const recorded = Date.parse(order.earlyStartConsentRecordedAt);
    if (!Number.isFinite(recorded)) throw new Error('earlyStartConsentRecordedAt is required when earlyStartConsent is true');
    if (recorded < contractAt) throw new Error('early-start consent cannot pre-date the contract');
    if (recorded > now) throw new Error('early-start consent cannot be in the future');
    return;
  }
  const waitUntil = contractAt + 14 * 24 * 60 * 60 * 1000;
  if (now < waitUntil) throw new Error('14-day cancellation period has not ended and early-start consent was not given');
}

/** Canonical adapter receipt body. The HMAC signature itself is kept outside it. */
export function canonicalPaymentEvidence(payment = {}) {
  const verifiedAt = Date.parse(payment.verifiedAt);
  return {
    provider: payment.provider,
    adapterReceiptId: String(payment.adapterReceiptId || '').trim(),
    transactionId: String(payment.transactionId || '').trim(),
    orderId: payment.orderId,
    productSku: payment.productSku,
    currency: payment.currency,
    amountMinor: payment.amountMinor,
    status: payment.status,
    refunded: payment.refunded,
    buyerEmail: String(payment.buyerEmail || '').trim().toLowerCase(),
    verifiedAt: Number.isFinite(verifiedAt) ? new Date(verifiedAt).toISOString() : null,
    verifiedBy: String(payment.verifiedBy || '').trim(),
    verificationMethod: payment.verificationMethod,
  };
}

/**
 * Validate a seller-authenticated adapter receipt before an unwatermarked file
 * can be created. A hand-written dashboard note cannot satisfy this boundary.
 */
export function verifyPaymentEvidence(order = {}, payment = {}, product = {}, {
  adapterSecret = process.env.AP_PAYMENT_ADAPTER_SECRET,
} = {}) {
  const errors = [];
  const expectedMinor = Number(product.priceGbp) * 100;
  const orderEmail = String(order.email || '').trim().toLowerCase();
  const paymentEmail = String(payment.buyerEmail || '').trim().toLowerCase();
  if (payment.provider !== 'gumroad') errors.push('provider must be gumroad');
  if (payment.verificationMethod !== 'gumroad-authenticated-adapter-v1') errors.push('verificationMethod must be gumroad-authenticated-adapter-v1');
  if (!String(payment.adapterReceiptId || '').trim()) errors.push('adapterReceiptId is required');
  if (payment.status !== 'paid-in-full') errors.push('status must be paid-in-full');
  if (payment.refunded !== false) errors.push('refunded must be false');
  if (!payment.transactionId || !String(payment.transactionId).trim()) errors.push('transactionId is required');
  if (!payment.verifiedBy || !String(payment.verifiedBy).trim()) errors.push('verifiedBy is required');
  const verifiedAt = Date.parse(payment.verifiedAt);
  if (!Number.isFinite(verifiedAt)) errors.push('verifiedAt must be an ISO date');
  if (Number.isFinite(verifiedAt) && verifiedAt > Date.now() + 5 * 60_000) errors.push('verifiedAt cannot be in the future');
  if (payment.orderId !== order.orderId) errors.push('payment orderId does not match order');
  if (payment.productSku !== order.product || payment.productSku !== product.sku) errors.push('payment SKU does not match order/catalogue');
  if (payment.currency !== product.currency || payment.currency !== 'GBP') errors.push('payment currency does not match GBP catalogue price');
  if (!Number.isInteger(payment.amountMinor) || payment.amountMinor !== expectedMinor) errors.push('payment total does not match catalogue price');
  if (!orderEmail || paymentEmail !== orderEmail) errors.push('payment buyer email does not match order email');
  if (!/^[a-f0-9]{64,}$/i.test(String(adapterSecret || ''))) errors.push('authenticated adapter secret is unavailable');
  if (!/^[a-f0-9]{64}$/i.test(String(payment.adapterSignature || ''))) errors.push('adapterSignature must be a SHA-256 HMAC');
  if (errors.length) return { ok: false, errors };
  const canonical = JSON.stringify(canonicalPaymentEvidence(payment));
  const expectedSignature = createHmac('sha256', Buffer.from(String(adapterSecret), 'hex')).update(canonical).digest();
  const receivedSignature = Buffer.from(String(payment.adapterSignature), 'hex');
  if (receivedSignature.length !== expectedSignature.length || !timingSafeEqual(receivedSignature, expectedSignature)) {
    return { ok: false, errors: ['adapterSignature does not authenticate this payment receipt'] };
  }
  return { ok: true, errors: [], evidenceHash: sha256(canonical), canonical: JSON.parse(canonical) };
}

export function isPaidOrder(order = {}, {
  capability = process.env.AP_FULFILMENT_CAPABILITY,
  privateFulfilment = process.env.AP_PRIVATE_FULFILMENT === '1',
  checkoutVerified = false,
} = {}) {
  const auth = order.fulfilmentAuthorization;
  const token = String(capability || '');
  return !!(
    checkoutVerified === true &&
    privateFulfilment && /^[a-f0-9]{64}$/i.test(token) &&
    auth && auth.state === 'paid-in-full' &&
    /^[a-f0-9]{64}$/i.test(String(auth.paymentEvidenceHash || '')) &&
    /^[a-f0-9]{64}$/i.test(String(auth.renderCapabilityHash || '')) &&
    sha256(token) === String(auth.renderCapabilityHash).toLowerCase() &&
    order.orderId && String(order.orderId).trim()
  );
}

/** JSON comment embedded in paid HTML for audit + re-verification. */
export function paidMetaBlock(order, chartMeta = {}) {
  const meta = {
    product: order.product || 'unknown',
    orderRefHash: order.orderId ? sha256(String(order.orderId)).slice(0, 16) : null,
    engine: 'VSOP87/ELP2000',
    houseSystem: order.house || 'placidus',
    generated: order.generatedAt || null,
    ...chartMeta,
  };
  const safeJson = JSON.stringify(meta)
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('--', '\\u002d\\u002d');
  return `<!-- ap-paid-meta:${safeJson} -->`;
}
