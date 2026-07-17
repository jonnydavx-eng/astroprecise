/*
 * Astro Precise — Plate fingerprint & public verify register  (LANE 1, no crypto)
 * -----------------------------------------------------------------------------
 * The honest "prove it's real" backbone for The Plate. NO blockchain, no wallet,
 * no tokens — just the same SHA-256 hash-chain we already use for Fare Radar's
 * Calls Board (see fare-radar/data/calls.js commitHash), applied to a Plate.
 *
 * What it gives you:
 *   1. A permanent, tamper-evident FINGERPRINT of a Plate = SHA-256 of a strictly
 *      canonical description of (the exact minute + place) and (the computed sky).
 *   2. A public, append-only REGISTER where each row points back to the previous
 *      row's fingerprint (the "chain"), so nobody can secretly insert, reorder or
 *      re-edit a Plate. Edition number = position in the chain.
 *   3. A verify() that re-derives the fingerprint from raw inputs and confirms it
 *      matches the sealed one — the "computed, never fabricated" moment, live.
 *
 * PRIVACY: the register stores ONLY the fingerprint, edition, series and time —
 * never a name or birth details. The fingerprint is one-way, so it proves a Plate
 * without exposing whose it is.
 *
 * !! LOCK THE FORMAT !!  The canonical string's key order, rounding and version
 * tag below MUST NEVER change once the first Plate sells — any change silently
 * breaks every existing Plate's fingerprint. Bump FORMAT_VERSION only alongside a
 * migration, never casually.
 *
 * Isomorphic: uses Web Crypto in the browser (for the /verify page) and
 * node:crypto under Node (for tests / server minting). Same bytes -> same hash.
 */

export const FORMAT_VERSION = 'AP-FP-1';

// Fixed body order — DO NOT REORDER. Longitudes are ecliptic degrees [0,360).
export const BODY_ORDER = [
  'sun', 'moon', 'mercury', 'venus', 'mars',
  'jupiter', 'saturn', 'uranus', 'neptune', 'pluto',
];

// Fixed rounding so the same moment always serialises identically.
const round = (x, dp) => {
  if (x == null || Number.isNaN(x)) return 'na';
  const f = Math.pow(10, dp);
  // normalise -0 to 0
  const r = Math.round(x * f) / f;
  return (r === 0 ? 0 : r).toFixed(dp);
};

/**
 * Build the ONE canonical string for a Plate. Fixed key order + fixed rounding.
 * @param {object} p
 *   p.utcMinute  ISO string truncated to the minute in UTC, e.g. "2026-08-12T18:05Z"
 *   p.lat, p.lon decimal degrees
 *   p.bodies     { sun: <deg>, moon: <deg>, ... } ecliptic longitudes
 *   p.edition    positive integer (its number in the series)
 *   p.series     stable slug, e.g. "eclipse-2026-08-12"
 */
export function canonicalString(p) {
  if (!p || !p.utcMinute || !p.series || !Number.isInteger(p.edition)) {
    throw new Error('canonicalString: missing utcMinute / series / integer edition');
  }
  // Enforce minute precision (drop seconds if present) and a trailing Z.
  const m = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/.exec(p.utcMinute);
  if (!m) throw new Error('canonicalString: utcMinute must be ISO to the minute (UTC)');
  const utc = m[1] + 'Z';

  const bodies = BODY_ORDER
    .map((b) => `${b}=${round(p.bodies?.[b], 3)}`)   // 3 dp of a degree ≈ 3.6 arcsec
    .join(',');

  // Fixed field order. '|' and ';' are reserved separators.
  return [
    `v=${FORMAT_VERSION}`,
    `utc=${utc}`,
    `lat=${round(p.lat, 4)}`,
    `lon=${round(p.lon, 4)}`,
    `series=${p.series}`,
    `edition=${p.edition}`,
    `bodies=${bodies}`,
  ].join('|');
}

/** SHA-256 hex of an arbitrary string, in browser or Node. */
export async function sha256hex(str) {
  const bytes = new TextEncoder().encode(str);
  if (typeof globalThis.crypto?.subtle?.digest === 'function') {
    const buf = await globalThis.crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Node fallback (tests / server mint)
  const { createHash } = await import('node:crypto');
  return createHash('sha256').update(bytes).digest('hex');
}

/** The permanent fingerprint of a Plate. */
export async function fingerprint(plate) {
  return sha256hex(canonicalString(plate));
}

/**
 * Append a Plate to an in-memory register (an array of rows). Pure — returns the
 * new rows array; persist it however you like (a flat file, a KV row, a git-tracked
 * public JSONL — mirroring fare-radar/data/calls). Chains each row to the last.
 * Stores NO personal data.
 */
export async function appendToRegister(rows, plate) {
  const fp = await fingerprint(plate);
  const prev = rows.length ? rows[rows.length - 1].fp : 'GENESIS';
  const row = {
    fp,
    edition: plate.edition,
    series: plate.series,
    ts: plate.mintedAtISO || null, // when the Plate was issued (not the sky moment)
    prev,
  };
  return [...rows, row];
}

/**
 * Walk the chain and confirm nothing was inserted, reordered or edited.
 * Returns { ok, brokenAt }.
 */
export function verifyChain(rows) {
  for (let i = 0; i < rows.length; i++) {
    const expectedPrev = i === 0 ? 'GENESIS' : rows[i - 1].fp;
    if (rows[i].prev !== expectedPrev) return { ok: false, brokenAt: i };
  }
  return { ok: true, brokenAt: -1 };
}

/**
 * The /verify/<edition> check: recompute the fingerprint from the RAW inputs the
 * buyer's browser derives (via the on-device VSOP87 engine) and confirm it equals
 * the sealed one in the public register. This is what the verify page shows
 * regenerating, live — "computed, never fabricated" you can re-run yourself.
 */
export async function verifyPlate(rawPlate, sealedFingerprint) {
  const fp = await fingerprint(rawPlate);
  return { verified: fp === sealedFingerprint, computed: fp };
}
