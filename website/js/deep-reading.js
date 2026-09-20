/*
 * Astro Precise — seven-chapter natal reading engine
 * ------------------------------------------------------------
 * Fills the last hollow product (Astrologer-Writer bench order). Pure logic:
 * give it natal longitudes + the two template libraries and it returns seven
 * chapters, each {title, mono:[], serif:[]} — mono are computed receipts,
 * serif is what the receipts earn. Honest degradations: no birth time -> no
 * Ascendant/houses (says so with dignity); no transits -> CH6 explains the
 * live edition. No dependencies; browser + Node.
 */
import { fmtDeg, fmtOrb, wholeSignHouse, separation } from './eclipse-reading.js?v=913';

const SIGNS_EL = ['fire','earth','air','water']; // Aries=fire, Taurus=earth, ...
const SIGNS_MODE = ['cardinal','fixed','mutable'];
const BODIES = ['sun','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto'];
const ASPECTS = { conjunction: 0, sextile: 60, square: 90, trine: 120, opposition: 180 };
const HOUSE_SYSTEM_LABELS = { whole: 'Whole Sign', equal: 'Equal', placidus: 'Placidus' };

const signIndex = (lon) => Math.floor((((lon % 360) + 360) % 360) / 30);
const houseSuffix = (h) => h === 1 ? 'st' : h === 2 ? 'nd' : h === 3 ? 'rd' : 'th';

/** Element + modality counts across the 10 classical bodies. */
export function chartBalance(natal) {
  const el = { fire: 0, earth: 0, air: 0, water: 0 };
  const mode = { cardinal: 0, fixed: 0, mutable: 0 };
  let n = 0;
  for (const b of BODIES) {
    const lon = natal[b];
    if (lon == null || Number.isNaN(lon)) continue;
    const si = signIndex(lon);
    el[SIGNS_EL[si % 4]]++; mode[SIGNS_MODE[si % 3]]++; n++;
  }
  const domEl = Object.entries(el).sort((a, b) => b[1] - a[1])[0];
  const domMode = Object.entries(mode).sort((a, b) => b[1] - a[1])[0];
  return { el, mode, n, domEl: domEl[0], domElCount: domEl[1], domMode: domMode[0], domModeCount: domMode[1] };
}

/** All natal-to-natal aspects within orb, tightest first. */
export function natalAspects(natal, orbs) {
  const out = [];
  for (let i = 0; i < BODIES.length; i++) {
    for (let j = i + 1; j < BODIES.length; j++) {
      const a = natal[BODIES[i]], b = natal[BODIES[j]];
      if (a == null || b == null || Number.isNaN(a) || Number.isNaN(b)) continue;
      const sep = separation(a, b);
      for (const [aspect, angle] of Object.entries(ASPECTS)) {
        const orb = Math.abs(sep - angle);
        if (orb <= orbs[aspect]) out.push({ a: BODIES[i], b: BODIES[j], aspect, orbDeg: orb });
      }
    }
  }
  return out.sort((x, y) => x.orbDeg - y.orbDeg);
}

/** Transit contacts: each transiting body vs every natal point, tightest first. */
export function transitContacts(transits, natal, orbs) {
  const out = [];
  for (const tb of BODIES) {
    const tlon = transits?.[tb];
    if (tlon == null || Number.isNaN(tlon)) continue;
    for (const nb of BODIES.concat(['asc', 'mc'])) {
      const nlon = natal[nb];
      if (nlon == null || Number.isNaN(nlon)) continue;
      const sep = separation(tlon, nlon);
      for (const [aspect, angle] of Object.entries(ASPECTS)) {
        const orb = Math.abs(sep - angle);
        if (orb <= Math.min(orbs[aspect], 3)) out.push({ transiting: tb, natal: nb, aspect, orbDeg: orb });
      }
    }
  }
  return out.sort((x, y) => x.orbDeg - y.orbDeg);
}

/**
 * The seven-chapter Deep Reading.
 * @param {object} natal      longitudes {sun..pluto, asc?, mc?}
 * @param {object} base       reading-templates.json (v2: signs, targets, orbsDeg, houseMeanings, legalLine)
 * @param {object} deep       deep-templates.json (AP-DEEP-1)
 * @param {object} opts       { birth: {dateText, timeText?, place?}, transits?: {sun..pluto}, transitDateText? }
 */
export function buildDeepReading(natal, base, deep, opts = {}) {
  const S = base.signs;
  const orbs = base.orbsDeg;
  const B = opts.birth || {};
  const timeAccuracy = opts.timeAccuracy || B.timeAccuracy || (B.timeText ? 'exact' : 'unknown');
  const timed = timeAccuracy !== 'unknown' && !!B.timeText;
  const hasAsc = natal.asc != null && !Number.isNaN(natal.asc);
  const houseSystem = opts.houseSystem || B.houseSystem || 'whole';
  const houseCusps = Array.isArray(opts.houseCusps) && opts.houseCusps.length === 12 ? opts.houseCusps : null;
  const suppliedHouses = opts.planetHouses || {};
  const fmtDegCoarse = (lon) => { // whole degrees only, for the untimed Moon
    const norm = ((lon % 360) + 360) % 360, si = Math.floor(norm / 30);
    return `${Math.round(norm - si * 30)}° ${S[si]}`;
  };
  const suppliedHouse = (body) => {
    if (!body) return null;
    const title = body.charAt(0).toUpperCase() + body.slice(1);
    const value = Number(suppliedHouses[body] ?? suppliedHouses[title]);
    return Number.isInteger(value) && value >= 1 && value <= 12 ? value : null;
  };
  const cuspHouse = (lon) => {
    if (!houseCusps) return null;
    for (let i = 0; i < 12; i += 1) {
      const a = Number(houseCusps[i]);
      const b = Number(houseCusps[(i + 1) % 12]);
      if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
      const span = ((b - a) % 360 + 360) % 360 || 30;
      const off = ((lon - a) % 360 + 360) % 360;
      if (off < span) return i + 1;
    }
    return null;
  };
  const houseOf = (lon, body) => {
    if (!hasAsc) return null;
    return suppliedHouse(body) || cuspHouse(lon) || wholeSignHouse(lon, natal.asc);
  };
  const houseTxt = (lon, body) => {
    const h = houseOf(lon, body);
    return h ? `, ${h}${houseSuffix(h)} house` : '';
  };
  const label = (b) => base.targets[b]?.label || b;
  const theme = (b) => base.targets[b]?.theme || b;
  const TEXTBOOK_PERSON = /\b(these individuals|natives of|the natives|the native|this native|this individual|people with this placement)\b/i;
  const TEXTBOOK_WALL = /\b(at the collective level|in a natal chart, the house position|marks a generation called)\b/i;
  const looksYouLead = (s) => /^(Your|You|You're|Yours)\b/i.test(String(s || '').trim());
  const isTextbookLine = (s) => TEXTBOOK_PERSON.test(s) || TEXTBOOK_WALL.test(s);
  const placementYou = (body) => {
    const lon = natal[body];
    if (lon == null || Number.isNaN(lon)) return '';
    const sign = S[signIndex(lon)];
    const what = (deep.planetWhat && deep.planetWhat[body]) || theme(body);
    const how = (deep.signHow && deep.signHow[sign]) || deep.signThemes[sign] || '';
    const h = timed && hasAsc ? houseOf(lon, body) : null;
    const where = h && deep.houseWhere && deep.houseWhere[String(h)];
    let line = `Your ${label(body)} is ${what} — in ${sign} that looks like ${how}.`;
    if (where) line += ` It lives in ${where}.`;
    return line;
  };
  const chapter = (n, title, parts) => ({
    n,
    title,
    lead: parts.lead || '',
    mono: parts.mono || [],
    serif: parts.serif || [],
    textbook: parts.textbook || [],
  });
  const chapters = [];

  // CH1 — the frame
  const present = BODIES.filter((b) => natal[b] != null && !Number.isNaN(natal[b]));
  const frameLines = [
    `Born ${B.dateText || '[date]'}${B.timeText ? ', ' + B.timeText : ' (time unknown — noon local used as a date reference, not a birth hour)'}${B.place ? ', ' + B.place : ''}.`,
  ];
  if (B.zone) frameLines.push(`Zone ${B.zone}${B.utcText ? ' · computed from ' + B.utcText : ''}.`);
  else if (B.utcText) frameLines.push(`Computed from ${B.utcText}.`);
  if (timeAccuracy === 'approximate') frameLines.push('Birth time marked approximate — angles and houses are provisional at the entered time.');
  if (!timed && deep.chapters.ch1.noonNote) frameLines.push(deep.chapters.ch1.noonNote);
  if (timed && B.coordsKnown === false && deep.chapters.ch1.noCoordsNote) frameLines.push(deep.chapters.ch1.noCoordsNote);
  const sunLead = placementYou('sun');
  const ch1LeadTpl = !timed
    ? (deep.chapters.ch1.leadNoTime || '{sunLead} Your Moon precision, rising sign and houses wait for a birth time. Noon is a date reference, not your hour.')
    : (!hasAsc
      ? (deep.chapters.ch1.leadNoAngles || '{sunLead} Your rising sign and houses wait for a usable town rather than being guessed.')
      : (deep.chapters.ch1.lead || '{sunLead}'));
  chapters.push(chapter(1, deep.chapters.ch1.title, {
    lead: ch1LeadTpl.replace('{sunLead}', sunLead),
    mono: [
      ...frameLines,
      ...present.map((b) => (b === 'moon' && !timed)
        ? `${label(b)} — near ${fmtDegCoarse(natal[b])} ${deep.chapters.ch1.moonApproxNote || '(approximate)'}`
        : `${label(b)} — ${fmtDeg(natal[b], S)}${houseTxt(natal[b], b)}`),
    ],
    serif: [timed ? deep.chapters.ch1.serif : (deep.chapters.ch1.serifNoTime || deep.chapters.ch1.serif)],
  }));

  // CH2 — the three lights
  const lights = { mono: [], serif: [] };
  for (const l of ['sun', 'moon']) {
    const themeTxt = `${S[signIndex(natal[l])]}: ${deep.signThemes[S[signIndex(natal[l])]]}`;
    if (l === 'moon' && !timed) {
      lights.mono.push(`${label(l)} — near ${fmtDegCoarse(natal[l])} (approximate: birth time unknown)`);
      const within = (((natal[l] % 360) + 360) % 360) % 30;
      const si = signIndex(natal[l]);
      const boundary = within < 7 ? (deep.chapters.ch2.moonBoundary || '').replace('{otherSign}', S[(si + 11) % 12])
        : within > 23 ? (deep.chapters.ch2.moonBoundary || '').replace('{otherSign}', S[(si + 1) % 12]) : '';
      lights.serif.push((deep.chapters.ch2.moonNoTime || deep.chapters.ch2.moon)
        .replace('{theme}', themeTxt).replace('{boundary}', boundary));
    } else {
      lights.mono.push(`${label(l)} — ${fmtDeg(natal[l], S)}${houseTxt(natal[l], l)}`);
      lights.serif.push(deep.chapters.ch2[l].replace('{theme}', themeTxt));
    }
  }
  if (hasAsc) {
    lights.mono.push(`Ascendant — ${fmtDeg(natal.asc, S)}`);
    lights.serif.push(deep.chapters.ch2.asc.replace('{theme}', `${S[signIndex(natal.asc)]}: ${deep.signThemes[S[signIndex(natal.asc)]]}`));
  } else {
    lights.serif.push(deep.chapters.ch2.noAsc);
  }
  chapters.push(chapter(2, deep.chapters.ch2.title, {
    lead: lights.serif[0] || placementYou('sun'),
    mono: lights.mono,
    serif: lights.serif.slice(1),
  }));

  // CH3 — the shape (computed counts, honestly quoted)
  const bal = chartBalance(natal);
  const ch3Lead = (deep.chapters.ch3.lead || 'You carry more {element} than anything else in this sky.')
    .replace('{element}', bal.domEl);
  const ch3Serif = [
    `${bal.domElCount} of your ${bal.n} placements sit in ${bal.domEl}. ${deep.elements[bal.domEl]}`,
    deep.modalities[bal.domMode],
  ];
  // A missing element is the most individual feature of a chart — read it first-class.
  if (deep.elementAbsent) {
    for (const el of ['fire', 'earth', 'air', 'water']) {
      if (bal.el[el] === 0 && deep.elementAbsent[el]) { ch3Serif.push(deep.elementAbsent[el]); break; }
    }
  }
  chapters.push(chapter(3, deep.chapters.ch3.title, {
    lead: ch3Lead,
    mono: [
      `Elements — fire ${bal.el.fire} · earth ${bal.el.earth} · air ${bal.el.air} · water ${bal.el.water} (of ${bal.n} placements).`,
      `Modes — cardinal ${bal.mode.cardinal} · fixed ${bal.mode.fixed} · mutable ${bal.mode.mutable}.`,
    ],
    serif: ch3Serif,
  }));

  // CH4 — where the weight falls (2-3 tightest natal aspects).
  // Untimed birth: the Moon is excluded from tight-orb claims — and we say why.
  const aspects = natalAspects(natal, orbs)
    .filter((x) => timed || (x.a !== 'moon' && x.b !== 'moon')).slice(0, 3);
  const ch4Closer = (x) => (deep.ch4Closers && deep.ch4Closers[x.aspect])
    ? ' ' + deep.ch4Closers[x.aspect] : ' Neither wins; the conversation is the point.';
  // x.aspect is the machine key ('sextile', 'trine', …). It is never printed:
  // the reader gets what the angle DOES, from deep-templates.json aspectNames.
  const aspectPlain = (key) => (deep.aspectNames && deep.aspectNames[key]) || 'in contact';
  const ch4Serif = [deep.chapters.ch4.intro, ...aspects.map((x) =>
    deep.chapters.ch4.pairFrame
      .replace('{a}', label(x.a)).replace('{b}', label(x.b))
      .replace('{aspect}', aspectPlain(x.aspect)).replace('{orb}', fmtOrb(x.orbDeg))
      .replace('{aTheme}', theme(x.a)).replace('{verb}', deep.aspectVerbs[x.aspect]).replace('{bTheme}', theme(x.b))
      .replace(' Neither wins; the conversation is the point.', ch4Closer(x)),
  )];
  if (!timed && deep.chapters.ch4.noMoonNote) ch4Serif.push(deep.chapters.ch4.noMoonNote);
  chapters.push(chapter(4, deep.chapters.ch4.title, {
    lead: deep.chapters.ch4.intro,
    mono: aspects.map((x) => `${label(x.a)} — ${label(x.b)} · ${aspectPlain(x.aspect)} · ${fmtOrb(x.orbDeg)} off exact.`),
    serif: ch4Serif.filter((line) => line && line !== deep.chapters.ch4.intro),
  }));

  // CH5 — the long arcs
  const arcs = { mono: [], serif: [], textbook: [] };
  let ch5Lead = '';
  for (const p of ['saturn', 'uranus', 'neptune', 'pluto']) {
    if (natal[p] == null) continue;
    const sName = S[signIndex(natal[p])];
    const hClause = (() => { const h = houseOf(natal[p], p); return h ? `, ${h}${houseSuffix(h)} house` : ''; })();
    arcs.mono.push(`${label(p)} — ${fmtDeg(natal[p], S)}${houseTxt(natal[p], p)}`);
    const generic = deep.chapters.ch5[p].replace('{sign}', sName).replace('{house}', hClause);
    const signLine = deep.ch5Signs && deep.ch5Signs[p] && deep.ch5Signs[p][sName.toLowerCase()];
    if (!ch5Lead) ch5Lead = placementYou(p);
    const houseTail = hClause ? ` In your chart it sits in the ${hClause.replace(', ', '')}.` : '';
    if (p !== 'saturn' && signLine) {
      arcs.serif.push(generic);
      arcs.textbook.push(signLine + houseTail);
    } else if (signLine) {
      arcs.serif.push(signLine + houseTail);
    } else {
      arcs.serif.push(generic);
    }
  }
  // Stellium check: 3+ of the 10 bodies stacked in one sign is a defining signature.
  if (deep.stelliumNote) {
    const perSign = {};
    for (const b of ['sun','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto']) {
      if (natal[b] == null || Number.isNaN(natal[b])) continue;
      const si = signIndex(natal[b]); (perSign[si] = perSign[si] || []).push(b);
    }
    const stack = Object.entries(perSign).sort((a, b2) => b2[1].length - a[1].length)[0];
    if (stack && stack[1].length >= 3) {
      const si = Number(stack[0]);
      const h = houseOf(si * 30 + 15);
      arcs.serif.push(deep.stelliumNote
        .replace('{count}', String(stack[1].length))
        .replace('{sign}', S[si])
        .replace('{houseClause}', h ? ` in your ${h}${houseSuffix(h)} house` : ''));
    }
  }
  chapters.push(chapter(5, deep.chapters.ch5.title, { lead: ch5Lead, ...arcs }));

  // CH6 — this season's sky (live part; honest when absent)
  if (opts.transits) {
    const tc = transitContacts(opts.transits, natal, orbs)
      .filter((x) => timed || x.natal !== 'moon').slice(0, 3);
    // Per-transit meaning (audit fix: numbers must never end in silence).
    const ch6Serif = [deep.chapters.ch6.intro];
    if (deep.ch6Transits) {
      const T6 = deep.ch6Transits;
      for (const x of tc) {
        const arc = T6.planetArcs && T6.planetArcs[x.transiting];
        if (!arc || !T6.frame) continue;
        ch6Serif.push(T6.frame
          .replace('{planet}', label(x.transiting)).replace('{planetArc}', arc)
          .replace('{aspectVerb}', (T6.aspectVerbs && T6.aspectVerbs[x.aspect]) || x.aspect)
          .replace('{target}', label(x.natal))
          .replace('{targetTheme}', theme(x.natal)));
      }
    }
    chapters.push(chapter(6, deep.chapters.ch6.title, {
      lead: deep.chapters.ch6.intro,
      mono: tc.length
        ? tc.map((x) => `${opts.transitDateText || 'Today'}: transiting ${label(x.transiting)} ${aspectPlain(x.aspect)} your natal ${label(x.natal)} — within ${fmtOrb(x.orbDeg)}.`)
        : [`${opts.transitDateText || 'Today'}: no transiting body sits within 3° of your chart — a genuinely quiet sky.`],
      serif: ch6Serif.filter((line) => line && line !== deep.chapters.ch6.intro),
    }));
  } else {
    chapters.push(chapter(6, deep.chapters.ch6.title, {
      lead: deep.chapters.ch6.noTransits,
      mono: [],
      serif: [],
    }));
  }

  // CH7 — a letter to keep (serif only; personalised from computed facts)
  const tight = aspects[0];
  const sunTheme = `${S[signIndex(natal.sun)]}: ${deep.signThemes[S[signIndex(natal.sun)]]}`;
  const ascNote = hasAsc
    ? (deep.chapters.ch7.ascNote || deep.chapters.ch2.asc)
      .replace('{theme}', `${S[signIndex(natal.asc)]}: ${deep.signThemes[S[signIndex(natal.asc)]]}`)
    : (deep.chapters.ch7.noAscNote || deep.chapters.ch2.noAsc);
  chapters.push(chapter(7, deep.chapters.ch7.title, {
    lead: '',
    mono: [],
    serif: [deep.chapters.ch7.body
      .replace('{sunTheme}', sunTheme)
      .replace('{tightPair}', tight ? `${label(tight.a)} ${tight.aspect} ${label(tight.b)} (${fmtOrb(tight.orbDeg)})` : 'the quiet evenness of my placements')
      .replace('{domElement}', bal.domEl)
      .replace('{domElementLine}', '')
      .replace('{ascNote}', ascNote)],
  }));

  for (const ch of chapters) {
    if (ch.n === 7) continue;
    const kept = [];
    for (const line of ch.serif) {
      if (isTextbookLine(line) && !looksYouLead(line)) ch.textbook.push(line);
      else kept.push(line);
    }
    ch.serif = kept;
  }

  const wordCount = chapters.reduce((s, c) =>
    s + [c.lead, ...c.mono, ...c.serif, ...(c.textbook || [])].filter(Boolean).join(' ').split(/\s+/).filter(Boolean).length, 0);
  const methodLabel = HOUSE_SYSTEM_LABELS[houseSystem] || houseSystem;
  const houseNote = hasAsc
    ? `${methodLabel} houses${timeAccuracy === 'approximate' ? ' · provisional because the birth time is approximate' : ''}. House placements were carried from the computed chart without changing method.`
    : null;
  return { chapters, wordCount, legal: base.legalLine, houseNote };
}
