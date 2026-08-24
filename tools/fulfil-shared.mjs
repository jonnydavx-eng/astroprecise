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

/** The launch catalogue is deliberately narrow. Gift mode changes the intent,
 * not the product identity; no legacy gift or voucher SKU may re-enter it. */
export const STUDIO_SKUS = Object.freeze([
  'natal-sky-print-pack',
  'personal-sky-keepsake',
  'whole-sky-edition',
]);
export const PURCHASE_INTENTS = Object.freeze(['self', 'gift']);
export const GIFT_OCCASIONS = Object.freeze(['birthday']);
export const GIFT_DELIVERY_TARGETS = Object.freeze(['recipient']);

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

export const GIFT_CONSENT_RECORDS = Object.freeze({
  earlyStartNoticeVersion: 'ap-early-start-v3-2026-08-24',
  earlyStartNoticeText: 'I expressly request AstroPrecise to begin this personalised service during my 14-day cancellation period. I understand that if I cancel after work has begun, I may have to pay an amount proportionate to the service supplied up to cancellation; and that if the service is fully performed within that period, I will lose my right to cancel once it is complete.',
  recipientProcessingNoticeVersion: 'ap-gift-recipient-processing-v2-2026-08-24',
  recipientProcessingNoticeText: 'I am the adult chart subject and personally entered my own exact birth and contact details. I have read the versioned AstroPrecise gift privacy notice shown before these fields. I request their narrow private use to create, check, deliver and support my commissioned digital artwork and reading. I can object or ask AstroPrecise to stop; the buyer receives no birth details or files unless I separately authorise a buyer copy.',
  recipientConfirmationMethod: 'recipient-self-entry-v1',
  recipientDisclosureWordingVersion: 'ap-gift-delivery-authorization-v2-2026-08-24',
  recipientDisclosureWordingText: 'Optional: I authorise AstroPrecise to send the buyer a private copy of my personalised commissioned files as well as delivering them to me. I can withdraw this permission at any time; withdrawal cannot recall a copy already sent but prevents later buyer copies or replacements.',
  buyerAttestationVersion: 'ap-gift-buyer-attestation-v2-2026-08-24',
  buyerAttestationText: 'I confirm that I have not entered, uploaded, forwarded or dictated the recipient\'s birth details. The adult recipient is present and personally completing and confirming those fields.',
  digitalSupplyNoticeVersion: 'ap-digital-supply-v2-2026-08-24',
  digitalSupplyNoticeText: 'I expressly consent to AstroPrecise supplying my commissioned digital files during my 14-day cancellation period. I understand that I lose the cancellation right for that digital content when supply begins. This does not affect my rights if the service or files are faulty, misdescribed or not supplied with reasonable care and skill.',
});
export const GIFT_CONSENT_HASHES = Object.freeze({
  earlyStartNoticeHash: sha256(GIFT_CONSENT_RECORDS.earlyStartNoticeText),
  recipientProcessingNoticeHash: sha256(GIFT_CONSENT_RECORDS.recipientProcessingNoticeText),
  recipientDisclosureWordingHash: sha256(GIFT_CONSENT_RECORDS.recipientDisclosureWordingText),
  buyerAttestationHash: sha256(GIFT_CONSENT_RECORDS.buyerAttestationText),
  digitalSupplyNoticeHash: sha256(GIFT_CONSENT_RECORDS.digitalSupplyNoticeText),
});
export const DURABLE_CONFIRMATION_VERSION = 'ap-durable-confirmation-bundle-v1-2026-08-24';

/** The only fixture permitted to bypass commissioned-work consent gates. Keep
 * this shared between orchestration and independent QA so a fictional label
 * can never smuggle real buyer/recipient data into a repository-local proof. */
export function assertExactFictionalStudioFixture(order = {}) {
  if (order.sampleMode !== 'fictional') return false;
  if (!/^FICTIONAL[-_]/i.test(String(order.orderId || ''))) throw new Error('fictional proof orderId must begin FICTIONAL-');
  const fixture = {
    product: 'whole-sky-edition',
    purchaseIntent: 'gift',
    email: 'buyer@example.test',
    name: 'Aurora Vale',
    place: 'Whitby, England',
    y: 1990, mo: 6, d: 14, h: 3, mi: 42,
    lat: 54.486, lon: -0.613, tz: 'Europe/London', timeAccuracy: 'exact', house: 'placidus',
    recipientDisplayName: 'Aurora Vale',
    giverDisplayName: 'Someone who loves you',
    occasion: 'birthday',
    giftMessage: 'May this new orbit bring you wonder, courage and a sky full of possibility.',
    recipientEmail: 'aurora@example.test',
  };
  for (const [field, value] of Object.entries(fixture)) {
    if (order[field] !== value) throw new Error(`fictional proof fixture mismatch: ${field}`);
  }
  if (order.recipientDeclaration?.typedName !== 'Aurora Vale' || order.recipientDeclaration?.confirmedAdult !== true || order.recipientDeclaration?.confirmedPersonalDataEntry !== true) {
    throw new Error('fictional proof fixture mismatch: recipientDeclaration');
  }
  return true;
}

function confirmationFileName(value, label) {
  const file = cleanDisplayText(value, { label, max: 128 });
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(file) || file === '.' || file === '..') throw new Error(`${label} must be a safe private filename`);
  return file;
}

export function giftRecipientConfirmationEvidenceHash({
  orderId, product, recipientEmail, recipientBirthInputHash,
  typedName, recipientConfirmedAt, recipientPrivacyNoticeVersion, recipientPrivacyNoticeHash,
} = {}) {
  const privacyVersion = cleanDisplayText(recipientPrivacyNoticeVersion, { label: 'recipientPrivacyNoticeVersion', max: 96 });
  const privacyHash = String(recipientPrivacyNoticeHash || '').toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(privacyHash)) throw new Error('recipientPrivacyNoticeHash must be a SHA-256 hash');
  const birthInputHash = String(recipientBirthInputHash || '').toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(birthInputHash)) throw new Error('recipientBirthInputHash must be a SHA-256 hash');
  const sku = cleanDisplayText(product, { label: 'product', max: 64 });
  if (!STUDIO_SKUS.includes(sku)) throw new Error('recipient confirmation product is not an approved Studio SKU');
  return sha256(JSON.stringify({
    orderId: cleanDisplayText(orderId, { label: 'orderId', max: 128 }),
    product: sku,
    recipientEmail: canonicalEmail(recipientEmail, 'recipientEmail'),
    recipientBirthInputHash: birthInputHash,
    typedName: cleanGiftText(typedName, { label: 'recipientDeclaration.typedName', max: 80 }),
    confirmedAdult: true,
    confirmedPersonalDataEntry: true,
    recipientConfirmedAt: canonicalIso(recipientConfirmedAt, 'recipientConfirmedAt', { required: true }),
    recipientProcessingNoticeVersion: GIFT_CONSENT_RECORDS.recipientProcessingNoticeVersion,
    recipientProcessingNoticeHash: GIFT_CONSENT_HASHES.recipientProcessingNoticeHash,
    recipientConfirmationMethod: GIFT_CONSENT_RECORDS.recipientConfirmationMethod,
    recipientPrivacyNoticeVersion: privacyVersion,
    recipientPrivacyNoticeHash: privacyHash,
  }));
}

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

/** Plain-text gift fields are intentionally lossy: markup and control
 * characters are removed before length validation and storage. */
export function cleanGiftText(value, { label = 'value', max = 120, required = true } = {}) {
  const withoutMarkup = String(value ?? '')
    .normalize('NFC')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[<>]/g, ' ');
  const text = Array.from(withoutMarkup, (character) => {
    const code = character.codePointAt(0);
    return code <= 31 || (code >= 127 && code <= 159) ? ' ' : character;
  }).join('')
    .replace(/\s+/g, ' ')
    .trim();
  if (required && !text) throw new Error(`${label} is required`);
  if (text.length > max) throw new Error(`${label} exceeds ${max} characters`);
  return text;
}

export function canonicalEmail(value, label = 'email') {
  const email = String(value ?? '').normalize('NFC').trim().toLowerCase();
  if (!email || email.length > 254 || !/^[^\s@<>()[\]{}]+@[^\s@<>()[\]{}]+\.[^\s@<>()[\]{}]+$/.test(email)) {
    throw new Error(`${label} must be a valid email address`);
  }
  return email;
}

function canonicalIso(value, label, { required = false, now = Date.now() } = {}) {
  if (value == null || value === '') {
    if (required) throw new Error(`${label} is required`);
    return null;
  }
  const time = Date.parse(value);
  if (!Number.isFinite(time)) throw new Error(`${label} must be an ISO date`);
  if (time > now + 5 * 60_000) throw new Error(`${label} cannot be in the future`);
  return new Date(time).toISOString();
}

function assertAdultBirthDate(y, mo, d, now = new Date()) {
  let age = now.getUTCFullYear() - y;
  const beforeBirthday = now.getUTCMonth() + 1 < mo || (now.getUTCMonth() + 1 === mo && now.getUTCDate() < d);
  if (beforeBirthday) age -= 1;
  if (age < 18) throw new Error('gift recipient must be at least 18 years old');
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
    throw new Error('Selected IANA time zone is unsupported');
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
    throw new Error('Birth time does not exist in the selected timezone; clarify privately');
  }
  let chosen = candidates[0];
  if (candidates.length > 1) {
    // The browser chart exporter cannot yet select a DST fold occurrence. Fail
    // closed even when an offset was supplied so every delivered asset agrees.
    throw new Error('Birth time is ambiguous in the selected timezone; Studio orders at a repeated DST minute require private clarification and are not currently accepted');
  }
  const instant = chosen.instant;
  return {
    instant: instant.toISOString(),
    y: instant.getUTCFullYear(), mo: instant.getUTCMonth() + 1, d: instant.getUTCDate(),
    h: instant.getUTCHours(), mi: instant.getUTCMinutes(),
    tz: zone, offsetMinutes: chosen.offsetMinutes,
  };
}

/** Bind the exact accepted chart inputs without exposing them in a confirmation
 * digest. The digest is replay-resistant only within the recorded order; the
 * future platform adapter must still authenticate the recipient actor. */
export function giftRecipientBirthInputHash(input = {}) {
  const y = integer(input.y, 'birth year');
  const mo = integer(input.mo, 'birth month');
  const d = integer(input.d, 'birth day');
  const h = integer(input.h, 'birth hour');
  const mi = integer(input.mi, 'birth minute');
  const lat = Number(input.lat);
  const lon = Number(input.lon);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) throw new Error('latitude must be between -90 and 90');
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) throw new Error('longitude must be between -180 and 180');
  const zone = civilTimeToUtc({ y, mo, d, h, mi, tz: input.tz, utcOffsetMinutes: input.utcOffsetMinutes });
  return sha256(JSON.stringify({
    name: cleanGiftText(input.name || input.chart_name, { label: 'display name', max: 80 }),
    place: cleanDisplayText(input.place || input.birth_place, { label: 'birth place', max: 120 }),
    y, mo, d, h, mi, lat, lon,
    timeAccuracy: cleanDisplayText(input.timeAccuracy || '', { label: 'timeAccuracy', max: 16 }),
    house: cleanDisplayText(input.house || 'placidus', { label: 'house system', max: 16 }).toLowerCase(),
    tz: zone.tz,
    utcOffsetMinutes: zone.offsetMinutes,
    utcInstant: zone.instant,
  }));
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
  const product = cleanDisplayText(input.product || '', { label: 'product', max: 64, required: false });
  if (product && !STUDIO_SKUS.includes(product)) throw new Error(`Unsupported launch SKU: ${product}`);
  const purchaseIntent = cleanDisplayText(input.purchaseIntent || 'self', { label: 'purchaseIntent', max: 16 });
  if (!PURCHASE_INTENTS.includes(purchaseIntent)) throw new Error('purchaseIntent must be self or gift');
  const orderId = cleanDisplayText(input.orderId || '', { label: 'orderId', max: 128, required: false });
  const email = input.email == null || input.email === '' ? undefined : canonicalEmail(input.email, 'buyer email');
  const contractAt = canonicalIso(input.contractAt, 'contractAt');
  const buyerDurableConfirmationSentAt = canonicalIso(input.buyerDurableConfirmationSentAt, 'buyerDurableConfirmationSentAt');
  const buyerDurableConfirmationHash = input.buyerDurableConfirmationHash == null || input.buyerDurableConfirmationHash === ''
    ? null : String(input.buyerDurableConfirmationHash).toLowerCase();
  const buyerDurableConfirmationVersion = input.buyerDurableConfirmationVersion == null || input.buyerDurableConfirmationVersion === ''
    ? null : cleanDisplayText(input.buyerDurableConfirmationVersion, { label: 'buyerDurableConfirmationVersion', max: 96 });
  const buyerDurableConfirmationFile = input.buyerDurableConfirmationFile == null || input.buyerDurableConfirmationFile === ''
    ? null : confirmationFileName(input.buyerDurableConfirmationFile, 'buyerDurableConfirmationFile');
  if (buyerDurableConfirmationHash != null && !/^[a-f0-9]{64}$/.test(buyerDurableConfirmationHash)) throw new Error('buyerDurableConfirmationHash must be a SHA-256 hash');
  if ([buyerDurableConfirmationSentAt, buyerDurableConfirmationHash, buyerDurableConfirmationVersion, buyerDurableConfirmationFile].filter((value) => value != null).length > 0 &&
      [buyerDurableConfirmationSentAt, buyerDurableConfirmationHash, buyerDurableConfirmationVersion, buyerDurableConfirmationFile].some((value) => value == null)) {
    throw new Error('buyer durable confirmation timestamp, version, filename and hash must be recorded together');
  }
  if (buyerDurableConfirmationVersion != null && buyerDurableConfirmationVersion !== DURABLE_CONFIRMATION_VERSION) throw new Error('buyer durable confirmation version is not approved');
  const earlyStartConsent = input.earlyStartConsent === true;
  const earlyStartConsentRecordedAt = canonicalIso(input.earlyStartConsentRecordedAt, 'earlyStartConsentRecordedAt', { required: earlyStartConsent });
  const digitalSupplyConsent = input.digitalSupplyConsent === true;
  const digitalSupplyConsentRecordedAt = canonicalIso(input.digitalSupplyConsentRecordedAt, 'digitalSupplyConsentRecordedAt', { required: digitalSupplyConsent });
  const generatedAt = canonicalIso(input.generatedAt, 'generatedAt');
  const canonical = {
    schema: 'astroprecise-studio-order-v901',
    ...(orderId ? { orderId } : {}),
    ...(product ? { product } : {}),
    ...(email ? { email } : {}),
    ...(input.sampleMode === 'fictional' ? { sampleMode: 'fictional' } : {}),
    purchaseIntent,
    name,
    place,
    y, mo, d, h, mi, lat, lon,
    timeAccuracy,
    house,
    tz: zone.tz,
    utcOffsetMinutes: zone.offsetMinutes,
    utc: { y: zone.y, mo: zone.mo, d: zone.d, h: zone.h, mi: zone.mi, instant: zone.instant },
    ...(contractAt ? { contractAt } : {}),
    ...(buyerDurableConfirmationSentAt ? { buyerDurableConfirmationSentAt, buyerDurableConfirmationVersion, buyerDurableConfirmationFile, buyerDurableConfirmationHash } : {}),
    earlyStartConsent,
    earlyStartConsentRecordedAt,
    ...(earlyStartConsent ? {
      earlyStartConsentActor: 'buyer',
      earlyStartNoticeVersion: GIFT_CONSENT_RECORDS.earlyStartNoticeVersion,
      earlyStartNoticeHash: GIFT_CONSENT_HASHES.earlyStartNoticeHash,
    } : {}),
    digitalSupplyConsent,
    digitalSupplyConsentRecordedAt,
    ...(digitalSupplyConsent ? { digitalSupplyConsentActor: 'buyer' } : {}),
    ...(input.digitalSupplyNoticeVersion ? { digitalSupplyNoticeVersion: cleanDisplayText(input.digitalSupplyNoticeVersion, { label: 'digitalSupplyNoticeVersion', max: 80 }) } : {}),
    ...(input.digitalSupplyNoticeHash ? { digitalSupplyNoticeHash: cleanDisplayText(input.digitalSupplyNoticeHash, { label: 'digitalSupplyNoticeHash', max: 64 }).toLowerCase() } : {}),
    ...(generatedAt ? { generatedAt } : {}),
  };

  if (earlyStartConsent) {
    if (!contractAt) throw new Error('contractAt is required when earlyStartConsent is true');
    if (input.earlyStartConsentActor !== 'buyer') throw new Error('early-start consent actor must be buyer');
    if (input.earlyStartNoticeVersion !== GIFT_CONSENT_RECORDS.earlyStartNoticeVersion) throw new Error('early-start notice version is not approved');
    if (String(input.earlyStartNoticeHash || '').toLowerCase() !== GIFT_CONSENT_HASHES.earlyStartNoticeHash) throw new Error('early-start notice hash is not approved');
    if (Date.parse(earlyStartConsentRecordedAt) < Date.parse(contractAt)) throw new Error('early-start consent cannot pre-date the contract');
  } else if (input.earlyStartConsentRecordedAt != null || input.earlyStartConsentActor != null || input.earlyStartNoticeVersion != null || input.earlyStartNoticeHash != null) {
    throw new Error('unticked earlyStartConsent must not carry a consent timestamp, actor or wording record');
  }

  if (digitalSupplyConsent) {
    if (!contractAt) throw new Error('contractAt is required when digitalSupplyConsent is true');
    if (input.digitalSupplyConsentActor !== 'buyer') throw new Error('digital-supply consent actor must be buyer');
    if (input.digitalSupplyNoticeVersion !== GIFT_CONSENT_RECORDS.digitalSupplyNoticeVersion) throw new Error('digital-supply notice version is not approved');
    if (String(input.digitalSupplyNoticeHash || '').toLowerCase() !== GIFT_CONSENT_HASHES.digitalSupplyNoticeHash) throw new Error('digital-supply notice hash is not approved');
    if (Date.parse(digitalSupplyConsentRecordedAt) < Date.parse(contractAt)) throw new Error('digital-supply consent cannot pre-date the contract');
  } else if (input.digitalSupplyConsentRecordedAt != null || input.digitalSupplyConsentActor != null || input.digitalSupplyNoticeVersion != null || input.digitalSupplyNoticeHash != null) {
    throw new Error('unticked digitalSupplyConsent must not carry a consent timestamp, actor or wording record');
  }

  if (input.fulfilmentAuthorization != null) {
    const authorization = input.fulfilmentAuthorization;
    if (!authorization || typeof authorization !== 'object' || Array.isArray(authorization)) throw new Error('fulfilmentAuthorization must be an object');
    const paymentEvidenceHash = String(authorization.paymentEvidenceHash || '').toLowerCase();
    const renderCapabilityHash = String(authorization.renderCapabilityHash || '').toLowerCase();
    if (authorization.state !== 'paid-in-full' || !/^[a-f0-9]{64}$/.test(paymentEvidenceHash) || !/^[a-f0-9]{64}$/.test(renderCapabilityHash)) {
      throw new Error('fulfilmentAuthorization is invalid');
    }
    canonical.fulfilmentAuthorization = { state: 'paid-in-full', paymentEvidenceHash, renderCapabilityHash };
  }

  if (purchaseIntent === 'gift') {
    if (!Object.hasOwn(input, 'earlyStartConsent')) throw new Error('gift order must record buyer earlyStartConsent');
    if (!contractAt) throw new Error('gift order requires contractAt');
    if (!Object.hasOwn(input, 'digitalSupplyConsent')) throw new Error('gift order must record buyer digitalSupplyConsent');
    if (!email) throw new Error('gift order requires a valid buyer email');
    if (!orderId || !product) throw new Error('gift order requires an orderId and product before recipient confirmation');
    assertAdultBirthDate(y, mo, d);

    const recipientDisplayName = cleanGiftText(input.recipientDisplayName, { label: 'recipientDisplayName', max: 80 });
    const giverDisplayName = cleanGiftText(input.giverDisplayName, { label: 'giverDisplayName', max: 80 });
    if (recipientDisplayName.localeCompare(name, undefined, { sensitivity: 'base' }) !== 0) {
      throw new Error('recipientDisplayName must match the chart display name');
    }
    const occasion = cleanDisplayText(input.occasion || '', { label: 'occasion', max: 24 });
    if (!GIFT_OCCASIONS.includes(occasion)) throw new Error('launch gift occasion must be birthday');
    const giftMessage = cleanGiftText(input.giftMessage, { label: 'giftMessage', max: 240, required: false });
    const recipientEmail = canonicalEmail(input.recipientEmail, 'recipientEmail');
    const recipientBirthInputHash = giftRecipientBirthInputHash({ name, place, y, mo, d, h, mi, lat, lon, tz: zone.tz, utcOffsetMinutes: zone.offsetMinutes, timeAccuracy, house });
    if (input.recipientBirthInputHash != null && String(input.recipientBirthInputHash).toLowerCase() !== recipientBirthInputHash) {
      throw new Error('recipientBirthInputHash does not bind the accepted birth inputs');
    }
    const declaration = input.recipientDeclaration;
    if (!declaration || typeof declaration !== 'object' || Array.isArray(declaration)) throw new Error('recipientDeclaration is required');
    const typedName = cleanGiftText(declaration.typedName, { label: 'recipientDeclaration.typedName', max: 80 });
    if (declaration.confirmedAdult !== true || declaration.confirmedPersonalDataEntry !== true) {
      throw new Error('recipientDeclaration must confirm adult status and personal data entry');
    }
    const recipientConfirmedAt = canonicalIso(input.recipientConfirmedAt, 'recipientConfirmedAt', { required: true });
    if (input.recipientProcessingNoticeVersion !== GIFT_CONSENT_RECORDS.recipientProcessingNoticeVersion) throw new Error('recipient processing notice version is not approved');
    if (String(input.recipientProcessingNoticeHash || '').toLowerCase() !== GIFT_CONSENT_HASHES.recipientProcessingNoticeHash) throw new Error('recipient processing notice hash is not approved');
    if (input.recipientConfirmationMethod !== GIFT_CONSENT_RECORDS.recipientConfirmationMethod) throw new Error('recipient confirmation method is not approved');
    const recipientPrivacyNoticeVersion = cleanDisplayText(input.recipientPrivacyNoticeVersion, { label: 'recipientPrivacyNoticeVersion', max: 96 });
    const recipientPrivacyNoticeHash = String(input.recipientPrivacyNoticeHash || '').toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(recipientPrivacyNoticeHash)) throw new Error('recipientPrivacyNoticeHash must be a SHA-256 hash');
    const expectedConfirmationEvidenceHash = giftRecipientConfirmationEvidenceHash({
      orderId, product, recipientEmail, recipientBirthInputHash,
      typedName, recipientConfirmedAt, recipientPrivacyNoticeVersion, recipientPrivacyNoticeHash,
    });
    if (String(input.recipientConfirmationEvidenceHash || '').toLowerCase() !== expectedConfirmationEvidenceHash) throw new Error('recipient confirmation evidence hash does not bind the declaration record');
    if (input.buyerAttestation !== true) throw new Error('buyerAttestation must be true for a gift order');
    if (input.buyerAttestationVersion !== GIFT_CONSENT_RECORDS.buyerAttestationVersion) throw new Error('buyer attestation version is not approved');
    if (String(input.buyerAttestationHash || '').toLowerCase() !== GIFT_CONSENT_HASHES.buyerAttestationHash) throw new Error('buyer attestation hash is not approved');
    if (input.buyerAttestationActor !== 'buyer') throw new Error('buyer attestation actor must be buyer');
    const buyerAttestationRecordedAt = canonicalIso(input.buyerAttestationRecordedAt, 'buyerAttestationRecordedAt', { required: true });
    if (Date.parse(buyerAttestationRecordedAt) < Date.parse(contractAt) || Date.parse(buyerAttestationRecordedAt) < Date.parse(recipientConfirmedAt)) {
      throw new Error('buyer attestation must be recorded after the contract and recipient confirmation');
    }
    const deliveryTo = cleanDisplayText(input.deliveryTo || '', { label: 'deliveryTo', max: 48 });
    if (!GIFT_DELIVERY_TARGETS.includes(deliveryTo)) throw new Error('deliveryTo is not an approved gift delivery target');
    if (input.recipientDisclosureWordingVersion !== GIFT_CONSENT_RECORDS.recipientDisclosureWordingVersion) throw new Error('recipient disclosure wording version is not approved');
    if (String(input.recipientDisclosureWordingHash || '').toLowerCase() !== GIFT_CONSENT_HASHES.recipientDisclosureWordingHash) throw new Error('recipient disclosure wording hash is not approved');
    const recipientDisclosureAuthorized = input.recipientDisclosureAuthorized === true;
    const recipientDisclosureAuthorizedAt = canonicalIso(input.recipientDisclosureAuthorizedAt, 'recipientDisclosureAuthorizedAt', { required: recipientDisclosureAuthorized });
    const recipientDisclosureAuthorizedBy = input.recipientDisclosureAuthorizedBy == null ? null : cleanDisplayText(input.recipientDisclosureAuthorizedBy, { label: 'recipientDisclosureAuthorizedBy', max: 24 });
    if (recipientDisclosureAuthorized && recipientDisclosureAuthorizedBy !== 'recipient') throw new Error('buyer-copy authorization must be given by the recipient');
    if (recipientDisclosureAuthorized && Date.parse(recipientDisclosureAuthorizedAt) < Date.parse(recipientConfirmedAt)) {
      throw new Error('buyer-copy authorization cannot pre-date recipient confirmation');
    }
    if (!recipientDisclosureAuthorized && (recipientDisclosureAuthorizedAt != null || recipientDisclosureAuthorizedBy != null)) {
      throw new Error('unticked buyer-copy authorization must not carry a timestamp or actor');
    }
    const recipientDisclosureWithdrawnAt = canonicalIso(input.recipientDisclosureWithdrawnAt, 'recipientDisclosureWithdrawnAt');
    const recipientDisclosureWithdrawnBy = input.recipientDisclosureWithdrawnBy == null ? null : cleanDisplayText(input.recipientDisclosureWithdrawnBy, { label: 'recipientDisclosureWithdrawnBy', max: 24 });
    if (recipientDisclosureWithdrawnAt != null) {
      if (!recipientDisclosureAuthorized || recipientDisclosureWithdrawnBy !== 'recipient') throw new Error('buyer-copy withdrawal requires a prior recipient authorization and recipient actor');
      if (Date.parse(recipientDisclosureWithdrawnAt) < Date.parse(recipientDisclosureAuthorizedAt)) throw new Error('buyer-copy withdrawal cannot pre-date authorization');
    } else if (recipientDisclosureWithdrawnBy != null) {
      throw new Error('buyer-copy withdrawal actor requires a withdrawal timestamp');
    }
    const recipientDisclosureState = !recipientDisclosureAuthorized
      ? 'not-authorized'
      : recipientDisclosureWithdrawnAt == null ? 'authorized' : 'withdrawn';
    const recipientDisclosureActive = recipientDisclosureState === 'authorized';
    const recipientDurableConfirmationSentAt = canonicalIso(input.recipientDurableConfirmationSentAt, 'recipientDurableConfirmationSentAt');
    const recipientDurableConfirmationHash = input.recipientDurableConfirmationHash == null || input.recipientDurableConfirmationHash === ''
      ? null : String(input.recipientDurableConfirmationHash).toLowerCase();
    const recipientDurableConfirmationVersion = input.recipientDurableConfirmationVersion == null || input.recipientDurableConfirmationVersion === ''
      ? null : cleanDisplayText(input.recipientDurableConfirmationVersion, { label: 'recipientDurableConfirmationVersion', max: 96 });
    const recipientDurableConfirmationFile = input.recipientDurableConfirmationFile == null || input.recipientDurableConfirmationFile === ''
      ? null : confirmationFileName(input.recipientDurableConfirmationFile, 'recipientDurableConfirmationFile');
    if (recipientDurableConfirmationHash != null && !/^[a-f0-9]{64}$/.test(recipientDurableConfirmationHash)) throw new Error('recipientDurableConfirmationHash must be a SHA-256 hash');
    if ([recipientDurableConfirmationSentAt, recipientDurableConfirmationHash, recipientDurableConfirmationVersion, recipientDurableConfirmationFile].filter((value) => value != null).length > 0 &&
        [recipientDurableConfirmationSentAt, recipientDurableConfirmationHash, recipientDurableConfirmationVersion, recipientDurableConfirmationFile].some((value) => value == null)) {
      throw new Error('recipient durable confirmation timestamp, version, filename and hash must be recorded together');
    }
    if (recipientDurableConfirmationVersion != null && recipientDurableConfirmationVersion !== DURABLE_CONFIRMATION_VERSION) throw new Error('recipient durable confirmation version is not approved');

    Object.assign(canonical, {
      recipientDisplayName,
      giverDisplayName,
      occasion,
      giftMessage,
      recipientEmail,
      recipientDeclaration: { typedName, confirmedAdult: true, confirmedPersonalDataEntry: true },
      recipientConfirmedAt,
      recipientProcessingNoticeVersion: GIFT_CONSENT_RECORDS.recipientProcessingNoticeVersion,
      recipientProcessingNoticeHash: GIFT_CONSENT_HASHES.recipientProcessingNoticeHash,
      recipientConfirmationMethod: GIFT_CONSENT_RECORDS.recipientConfirmationMethod,
      recipientPrivacyNoticeVersion,
      recipientPrivacyNoticeHash,
      recipientBirthInputHash,
      recipientConfirmationEvidenceHash: expectedConfirmationEvidenceHash,
      buyerAttestation: true,
      buyerAttestationVersion: GIFT_CONSENT_RECORDS.buyerAttestationVersion,
      buyerAttestationHash: GIFT_CONSENT_HASHES.buyerAttestationHash,
      buyerAttestationActor: 'buyer',
      buyerAttestationRecordedAt,
      deliveryTo,
      recipientDisclosureAuthorized,
      recipientDisclosureAuthorizedAt,
      recipientDisclosureAuthorizedBy,
      recipientDisclosureWithdrawnAt,
      recipientDisclosureWithdrawnBy,
      recipientDisclosureState,
      recipientDisclosureActive,
      recipientDisclosureWordingVersion: GIFT_CONSENT_RECORDS.recipientDisclosureWordingVersion,
      recipientDisclosureWordingHash: GIFT_CONSENT_HASHES.recipientDisclosureWordingHash,
      ...(recipientDurableConfirmationSentAt ? { recipientDurableConfirmationSentAt, recipientDurableConfirmationVersion, recipientDurableConfirmationFile, recipientDurableConfirmationHash } : {}),
      ...(digitalSupplyConsent ? {
        digitalSupplyNoticeVersion: GIFT_CONSENT_RECORDS.digitalSupplyNoticeVersion,
        digitalSupplyNoticeHash: GIFT_CONSENT_HASHES.digitalSupplyNoticeHash,
      } : {}),
    });
  }

  return canonical;
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
};

export function deliverablesForProduct(product) {
  if (!STUDIO_SKUS.includes(product) || !SKU_DELIVER[product]) throw new Error(`Unsupported launch SKU: ${product || '(missing)'}`);
  return SKU_DELIVER[product];
}

/** Enforce the service-start timing recorded for a commissioned order. */
export function assertWorkMayStart(order = {}, now = Date.now()) {
  const contractAt = Date.parse(order.contractAt);
  if (!Number.isFinite(contractAt)) throw new Error('contractAt is required before commissioned work starts');
  if (contractAt > now) throw new Error('contractAt cannot be in the future');
  const buyerConfirmationAt = Date.parse(order.buyerDurableConfirmationSentAt);
  if (!Number.isFinite(buyerConfirmationAt) || order.buyerDurableConfirmationVersion !== DURABLE_CONFIRMATION_VERSION ||
      !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(String(order.buyerDurableConfirmationFile || '')) ||
      !/^[a-f0-9]{64}$/i.test(String(order.buyerDurableConfirmationHash || ''))) {
    throw new Error('immutable buyer durable confirmation must be sent and hashed before commissioned work starts');
  }
  if (buyerConfirmationAt < contractAt || buyerConfirmationAt > now) throw new Error('buyer durable confirmation timestamp is outside the permitted contract-to-work window');
  for (const [label, value] of [
    ['early-start choice', order.earlyStartConsent === true ? order.earlyStartConsentRecordedAt : null],
    ['digital-supply choice', order.digitalSupplyConsent === true ? order.digitalSupplyConsentRecordedAt : null],
  ]) {
    const choiceAt = value == null ? null : Date.parse(value);
    if (choiceAt != null && (!Number.isFinite(choiceAt) || buyerConfirmationAt < choiceAt)) throw new Error(`buyer durable confirmation must follow the recorded ${label}`);
  }
  if (order.purchaseIntent === 'gift') {
    const recipientConfirmationAt = Date.parse(order.recipientDurableConfirmationSentAt);
    if (!Number.isFinite(recipientConfirmationAt) || order.recipientDurableConfirmationVersion !== DURABLE_CONFIRMATION_VERSION ||
        !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(String(order.recipientDurableConfirmationFile || '')) ||
        !/^[a-f0-9]{64}$/i.test(String(order.recipientDurableConfirmationHash || ''))) {
      throw new Error('immutable recipient durable confirmation must be sent and hashed before gift work starts');
    }
    const recipientConfirmedAt = Date.parse(order.recipientConfirmedAt);
    const buyerAttestationAt = Date.parse(order.buyerAttestationRecordedAt);
    if (recipientConfirmationAt < contractAt || recipientConfirmationAt < recipientConfirmedAt || recipientConfirmationAt > now) {
      throw new Error('recipient durable confirmation timestamp is outside the permitted confirmation-to-work window');
    }
    if (buyerConfirmationAt < buyerAttestationAt) throw new Error('buyer durable confirmation must follow the recorded gift attestation');
    const disclosureAt = order.recipientDisclosureAuthorized === true ? Date.parse(order.recipientDisclosureAuthorizedAt) : null;
    if (disclosureAt != null && (!Number.isFinite(disclosureAt) || recipientConfirmationAt < disclosureAt)) {
      throw new Error('recipient durable confirmation must follow the recorded buyer-copy choice');
    }
  }
  if (order.earlyStartConsent === true) {
    const recorded = Date.parse(order.earlyStartConsentRecordedAt);
    if (!Number.isFinite(recorded)) throw new Error('earlyStartConsentRecordedAt is required when earlyStartConsent is true');
    if (recorded < contractAt) throw new Error('early-start consent cannot pre-date the contract');
    if (recorded > now) throw new Error('early-start consent cannot be in the future');
    if (order.earlyStartConsentActor !== 'buyer') throw new Error('early-start consent actor must be buyer');
    if (order.earlyStartNoticeVersion !== GIFT_CONSENT_RECORDS.earlyStartNoticeVersion || String(order.earlyStartNoticeHash || '').toLowerCase() !== GIFT_CONSENT_HASHES.earlyStartNoticeHash) {
      throw new Error('early-start consent wording record is not approved');
    }
    return;
  }
  const waitUntil = contractAt + 14 * 24 * 60 * 60 * 1000;
  if (now < waitUntil) throw new Error('14-day cancellation period has not ended and early-start consent was not given');
}

/** Enforce the separate digital-content supply choice before a completed final
 * can be generated or dispatched during the cancellation period. */
export function assertDigitalSupplyMayBegin(order = {}, now = Date.now()) {
  const contractAt = Date.parse(order.contractAt);
  if (!Number.isFinite(contractAt)) throw new Error('contractAt is required before digital supply begins');
  if (contractAt > now) throw new Error('contractAt cannot be in the future');
  if (order.digitalSupplyConsent === true) {
    const recorded = Date.parse(order.digitalSupplyConsentRecordedAt);
    if (!Number.isFinite(recorded)) throw new Error('digitalSupplyConsentRecordedAt is required when digitalSupplyConsent is true');
    if (recorded < contractAt) throw new Error('digital-supply consent cannot pre-date the contract');
    if (recorded > now) throw new Error('digital-supply consent cannot be in the future');
    if (order.digitalSupplyConsentActor !== 'buyer') throw new Error('digital-supply consent actor must be buyer');
    if (order.digitalSupplyNoticeVersion !== GIFT_CONSENT_RECORDS.digitalSupplyNoticeVersion || String(order.digitalSupplyNoticeHash || '').toLowerCase() !== GIFT_CONSENT_HASHES.digitalSupplyNoticeHash) {
      throw new Error('digital-supply consent wording record is not approved');
    }
    return;
  }
  const waitUntil = contractAt + 14 * 24 * 60 * 60 * 1000;
  if (now < waitUntil) throw new Error('14-day cancellation period has not ended and digital-supply consent was not given');
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
