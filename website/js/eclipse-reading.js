/*
 * AstroPrecise — five-beat engine for the £7 Your Eclipse Edition
 * --------------------------------------------------------------------------
 * Pure logic. Give it the computed eclipse longitude + the person's real natal
 * longitudes (from the on-device VSOP87 engine) + the templates JSON, and it
 * returns an honest reading: the closest real contact, its exact orb, a computed
 * line (mono) and a reflection line (warm serif). If the eclipse touches nothing,
 * it says so plainly — that empty-state is a feature, not a failure ("computed,
 * never fabricated").
 *
 * No dependencies. Works in the browser and in Node (tests).
 */

const ASPECT_ANGLE = { conjunction: 0, sextile: 60, square: 90, trine: 120, opposition: 180 };

/** Angular separation in [0,180]. */
export function separation(a, b) {
  let d = Math.abs(((a - b) % 360 + 360) % 360);
  return d > 180 ? 360 - d : d;
}

/** Format a decimal-degree orb as   d°mm′ . */
export function fmtOrb(orbDeg) {
  const total = Math.round(orbDeg * 60);      // arcminutes
  const d = Math.trunc(total / 60);
  const m = Math.abs(total % 60);
  return `${d}°${String(m).padStart(2, '0')}′`;
}

/**
 * Find the single closest aspect contact between the eclipse point and the chart.
 * @param {number} eclipseLon  ecliptic longitude of the eclipse (deg)
 * @param {object} natal       { sun, moon, ..., asc, mc } longitudes (deg)
 * @param {object} templates   the reading-templates.json object
 * @returns {null | {target, aspect, orbDeg}}  null = no contact within orb
 */
export function closestContact(eclipseLon, natal, templates) {
  const orbs = templates.orbsDeg;
  let best = null;
  for (const target of Object.keys(templates.targets)) {
    const lon = natal[target];
    if (lon == null || Number.isNaN(lon)) continue;      // e.g. no birth time -> no asc/mc
    const sep = separation(eclipseLon, lon);
    for (const [aspect, angle] of Object.entries(ASPECT_ANGLE)) {
      const orb = Math.abs(sep - angle);
      if (orb <= orbs[aspect] && (!best || orb < best.orbDeg)) {
        best = { target, aspect, orbDeg: orb };
      }
    }
  }
  return best;
}

/** Assemble the full reading object from a computed contact (or empty-state). */
export function buildReading(eclipseLon, natal, templates, opts = {}) {
  const t = templates;
  const contact = closestContact(eclipseLon, natal, t);

  const perseid = opts.dark
    ? {
        computed: t.perseid.computed
          .replace('{darkStart}', opts.dark.start).replace('{darkEnd}', opts.dark.end),
        reflection: t.perseid.reflection,
      }
    : null;

  if (!contact) {
    const maxOrb = Math.max(...Object.values(t.orbsDeg));
    return {
      contact: null,
      computedLine: t.emptyState.computed.replace('{maxOrb}', maxOrb),
      reflection: t.emptyState.reflection,
      perseid, legal: t.legalLine, quiet: true,
    };
  }

  const tg = t.targets[contact.target];
  const asp = t.aspects[contact.aspect];
  const orbText = fmtOrb(contact.orbDeg);
  const key = `${contact.target}|${contact.aspect}`;
  const reflection = t.overrides[key]
    || t.reflectionFrames[contact.aspect].replace('{theme}', tg.theme);

  return {
    contact,
    computedLine: `The eclipse point sits ${orbText} from your ${tg.label} (${asp.label}).`,
    reflection,
    perseid,
    legal: t.legalLine,
    shareLine: t.shareLine.replace('{orbText}', orbText).replace('{targetLabel}', tg.label),
    quiet: false,
  };
}

/* ============================================================================
 * v2 — THE FULL FIVE-BEAT READING (bench order: Astrologer-Writer, 17 Jul)
 * Beat 1 anchor · Beat 2 contact(+house, +secondaries) · Beat 3 governs ·
 * Beat 4 the question · Beat 5 honest close. Quiet orb-gate GATES THE SALE.
 * Houses: whole-sign from the Ascendant (honest, stated), only when asc known.
 * ==========================================================================*/

/** 139.84 -> "19°50′ Leo" */
export function fmtDeg(lon, signs) {
  const norm = ((lon % 360) + 360) % 360;
  const totalMinutes = Math.round(norm * 60) % (360 * 60);
  const si = Math.floor(totalMinutes / (30 * 60));
  const withinSign = totalMinutes % (30 * 60);
  const degrees = Math.floor(withinSign / 60);
  const minutes = withinSign % 60;
  return `${degrees}°${String(minutes).padStart(2, '0')}′ ${signs[si]}`;
}

/** Whole-sign house of a point given the Ascendant longitude (1..12), or null. */
export function wholeSignHouse(pointLon, ascLon) {
  if (ascLon == null || Number.isNaN(ascLon)) return null;
  const ps = Math.floor((((pointLon % 360) + 360) % 360) / 30);
  const as = Math.floor((((ascLon % 360) + 360) % 360) / 30);
  return ((ps - as + 12) % 12) + 1;
}

/** 1 → 1st, 2 → 2nd, 3 → 3rd, 11 → 11th. */
export function houseOrdinal(n) {
  const house = Number(n);
  if (!Number.isInteger(house) || house < 1) return String(n);
  const j = house % 10;
  const k = house % 100;
  if (k >= 11 && k <= 13) return `${house}th`;
  if (j === 1) return `${house}st`;
  if (j === 2) return `${house}nd`;
  if (j === 3) return `${house}rd`;
  return `${house}th`;
}

function contactSerifFromAspect(asp) {
  const note = String(asp && asp.note ? asp.note : '').trim();
  if (!note) return 'A traditional contact, held as reflection, not as a forecast.';
  return `${note.charAt(0).toUpperCase()}${note.slice(1)}. Held as reflection, not as a forecast.`;
}

/** All aspect contacts within orb, sorted tightest first. */
export function allContacts(eclipseLon, natal, templates) {
  const ASPECTS = { conjunction: 0, sextile: 60, square: 90, trine: 120, opposition: 180 };
  const out = [];
  for (const target of Object.keys(templates.targets)) {
    const lon = natal[target];
    if (lon == null || Number.isNaN(lon)) continue;
    const sep = separation(eclipseLon, lon);
    for (const [aspect, angle] of Object.entries(ASPECTS)) {
      const orb = Math.abs(sep - angle);
      if (orb <= t_orb(templates, aspect)) out.push({ target, aspect, orbDeg: orb, lon });
    }
  }
  return out.sort((a, b) => a.orbDeg - b.orbDeg);
}
const t_orb = (t, aspect) => t.orbsDeg[aspect];

/**
 * The full five-beat £7 Eclipse Edition reading.
 * @param {number} eclipseLon  ecliptic longitude of the eclipse
 * @param {object} natal       longitudes {sun..pluto, asc?, mc?}
 * @param {object} templates   reading-templates.json (v2)
 * @param {object} opts        { local: {date, place, coveragePct, peakLocal},
 *                               dark: {start,end,rate}, quietGateDeg (default 5) }
 * @returns beats {anchor, contact, governs, question, close} each {mono?, serif?},
 *          plus {quiet, gateSale, share, legal, houseNote?, wordCount}
 */
/* Eclipse craft (audit fix, 17 Jul): only HARD aspects — conjunction, opposition,
 * square — in tight orb make an eclipse "yours" and open the sale. Soft aspects
 * (sextile/trine) are background: they may appear as secondaries but never carry
 * the night, and a chart with only soft touches is told the truth: quiet. */
const HARD = { conjunction: 6, opposition: 5, square: 5 }; // per-aspect sale gates (deg)

export function buildEclipseReading5(eclipseLon, natal, templates, opts = {}) {
  const t = templates;
  const signs = t.signs;
  const L = opts.local || {};
  // Defensive receipt: a bare number for coverage gains its % sign.
  if (L.coveragePct != null && /^[~≈\s]*\d+(\.\d+)?\s*$/.test(String(L.coveragePct))) {
    L.coveragePct = String(L.coveragePct).trim() + '%';
  }
  const gate = opts.quietGateDeg ?? 5;

  // BEAT 1 — the anchor (always renders; the receipt for the whole piece)
  const eclipseDeg = fmtDeg(eclipseLon, signs);
  const anchorMono = (L.place
    ? t.anchor.computed.replace('{date}', L.date || '12 August 2026').replace('{peakLocal}', L.peakLocal || '')
        .replace('{place}', L.place).replace('{coveragePct}', L.coveragePct || '')
    : t.anchor.computedNoPlace.replace('{date}', L.date || '12 August 2026'))
    .replace('{eclipseDeg}', eclipseDeg).replace(/\s+,/g, ',').replace(/,\s*,/g, ',').replace(/\s{2,}/g, ' ');

  // Birth time known? (asc present, or told explicitly). Without it the Moon is
  // only placeable to ±7°, so we bar the
  // untimed Moon from headlining, from secondaries, and from any tight-orb claim.
  const timed = opts.timed != null ? opts.timed : (natal.asc != null && !Number.isNaN(natal.asc));
  const allC = allContacts(eclipseLon, natal, t);
  const moonExcluded = !timed && allC.some((c) => c.target === 'moon');
  const contacts = timed ? allC : allC.filter((c) => c.target !== 'moon');
  // Primary = tightest HARD contact within its per-aspect sale gate.
  const hardContacts = contacts.filter((c) => HARD[c.aspect] != null && c.orbDeg <= Math.min(HARD[c.aspect], gate + (c.aspect === 'conjunction' ? 1 : 0)));
  const closest = hardContacts[0] || null;
  const nearestAny = contacts[0] || null;

  // BEAT 5 — honest close (always renders)
  const closeMono = opts.dark
    ? t.close.computedPerseids.replace('{rate}', String(opts.dark.rate ?? 100))
        .replace('{darkStart}', opts.dark.start).replace('{darkEnd}', opts.dark.end)
    : t.close.computedNoPerseids;
  const close = { mono: closeMono, serif: t.close.serif };

  // QUIET GATE — the empty state that GATES THE SALE (Skeptic rule).
  // No hard aspect in tight orb = quiet, even if soft touches exist: in eclipse
  // tradition a soft contact is background, and we say so rather than sell it.
  //
  // The receipt line used to open with emptyState.computed — "sits more than 5°
  // from EVERY placement in your chart" — and then, in the very next sentence,
  // named a contact 0°25′ away. Both statements were printed together and one of
  // them had to be false. The gate is about HARD contacts only (see HARD above),
  // so soft ones legitimately sit inside it; the sentence now says exactly that,
  // and the soft touch that follows no longer contradicts the line above it.
  if (!closest) {
    const es = t.emptyState;
    const nearest = nearestAny
      ? ((HARD[nearestAny.aspect] == null && nearestAny.orbDeg <= 3)
          ? es.nearestSoft
              .replace('{frame}', t.aspects[nearestAny.aspect].frame)
              .replace('{targetLabel}', t.targets[nearestAny.target].label)
              .replace('{orbText}', fmtOrb(nearestAny.orbDeg))
          : es.nearestWide
              .replace('{targetLabel}', t.targets[nearestAny.target].label)
              .replace('{orbText}', fmtOrb(nearestAny.orbDeg)))
      : '';
    const moonNote = moonExcluded
      ? ' (Your Moon needs a birth time we don’t have to place exactly, so we’ve left it out rather than quote it falsely.)'
      : '';
    const headline = (es.computedNoHard || es.computed).replace('{maxOrb}', String(gate));
    const reading = {
      quiet: true, gateSale: true,
      anchor: { mono: anchorMono, serif: t.anchor.serif },
      contact: { mono: headline + nearest + moonNote, serif: es.reflection },
      governs: null, question: null, close,
      legal: t.legalLine,
    };
    reading.wordCount = countWords(reading);
    return reading;
  }

  // BEAT 2 — the closest contact (+ house, + up to 2 secondaries within 3°)
  const tg = t.targets[closest.target];
  const asp = t.aspects[closest.aspect];
  const orbText = fmtOrb(closest.orbDeg);
  const house = wholeSignHouse(closest.lon, natal.asc);
  const contactMonoCore = `This eclipse falls ${orbText} from your natal ${tg.label} (${fmtDeg(closest.lon, signs)}) — ${asp.label}.`;
  let contactMono = contactMonoCore;
  if (house) contactMono += ` ${tg.label} sits in your ${houseOrdinal(house)} house (whole-sign).`;
  const secondaries = contacts.filter((c) => c !== closest && c.orbDeg <= 3).slice(0, 2);
  const secondaryContacts = secondaries.map((c) => ({
    target: c.target,
    aspect: c.aspect,
    orbText: fmtOrb(c.orbDeg),
    label: t.targets[c.target].label,
    theme: t.targets[c.target].theme,
    note: t.aspects[c.aspect].note,
    aspectLabel: t.aspects[c.aspect].label,
  }));
  const secondary = secondaries.length
    ? { mono: t.secondary.computed.replace('{list}', secondaries.map((c) =>
        t.secondary.item.replace('{aspectLabel}', t.aspects[c.aspect].label)
          .replace('{targetLabel}', t.targets[c.target].label).replace('{orbText}', fmtOrb(c.orbDeg))).join('; ')),
        serif: t.secondary.serif }
    : null;

  // BEAT 3 — what that place governs
  const key = `${closest.target}|${closest.aspect}`;
  const governsCore = t.overrides[key] || t.reflectionFrames[closest.aspect].replace('{theme}', tg.theme);
  let governsSerif = governsCore;
  let governsHouseLine = null;
  if (house && t.houseMeanings[String(house)]) {
    governsHouseLine = t.governsHouse
      .replace('{houseOrd}', houseOrdinal(house))
      .replace('{houseNum}', String(house))
      .replace('{houseMeaning}', t.houseMeanings[String(house)]);
    governsSerif += governsHouseLine;
  }

  const anchorNoPlace = t.anchor.computedNoPlace
    .replace('{date}', L.date || '12 August 2026')
    .replace('{eclipseDeg}', eclipseDeg)
    .replace(/\s+,/g, ',').replace(/,\s*,/g, ',').replace(/\s{2,}/g, ' ');

  // BEAT 4 — the question
  const question = { serif: t.questions[closest.target] || t.questions.sun };

  const reading = {
    quiet: false, gateSale: false,
    anchor: { mono: anchorMono, serif: t.anchor.serif },
    contact: { mono: contactMono, serif: contactSerifFromAspect(asp), secondary },
    governs: { serif: governsSerif },
    question, close,
    contactTarget: closest.target,
    contactAspect: closest.aspect,
    contactLabel: tg.label,
    contactTheme: tg.theme,
    contactOrb: orbText,
    contactHouse: house,
    contactHouseOrd: house ? houseOrdinal(house) : null,
    houseMeaning: house && t.houseMeanings[String(house)] ? t.houseMeanings[String(house)] : null,
    eclipseDegree: eclipseDeg,
    contactMonoCore,
    governsCore,
    governsHouseLine,
    secondaryContacts,
    anchorNoPlace,
    share: t.shareLine.replace('{orbText}', orbText).replace('{targetLabel}', tg.label),
    legal: t.legalLine,
    houseNote: house ? t.houseSystemNote : null,
  };
  reading.wordCount = countWords(reading);
  return reading;
}

function countWords(r) {
  let s = '';
  for (const k of ['anchor', 'contact', 'governs', 'question', 'close']) {
    const b = r[k]; if (!b) continue;
    s += ' ' + (b.mono || '') + ' ' + (b.serif || '');
    if (b.secondary) s += ' ' + (b.secondary.mono || '') + ' ' + (b.secondary.serif || '');
  }
  return s.trim().split(/\s+/).filter(Boolean).length;
}
