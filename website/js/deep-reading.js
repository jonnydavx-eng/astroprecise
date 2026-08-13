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
import { fmtDeg, fmtOrb, wholeSignHouse, separation } from './eclipse-reading.js';

const SIGNS_EL = ['fire','earth','air','water']; // Aries=fire, Taurus=earth, ...
const SIGNS_MODE = ['cardinal','fixed','mutable'];
const BODIES = ['sun','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto'];
const ASPECTS = { conjunction: 0, sextile: 60, square: 90, trine: 120, opposition: 180 };

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
  const timed = !!B.timeText; // no birth time -> the Moon (±7°/half-day) is held honestly loose
  const hasAsc = natal.asc != null && !Number.isNaN(natal.asc);
  const fmtDegCoarse = (lon) => { // whole degrees only, for the untimed Moon
    const norm = ((lon % 360) + 360) % 360, si = Math.floor(norm / 30);
    return `${Math.round(norm - si * 30)}° ${S[si]}`;
  };
  const houseOf = (lon) => hasAsc ? wholeSignHouse(lon, natal.asc) : null;
  const houseTxt = (lon) => {
    const h = houseOf(lon);
    return h ? `, ${h}${houseSuffix(h)} house` : '';
  };
  const label = (b) => base.targets[b]?.label || b;
  const theme = (b) => base.targets[b]?.theme || b;
  const chapters = [];

  // CH1 — the frame
  const present = BODIES.filter((b) => natal[b] != null && !Number.isNaN(natal[b]));
  chapters.push({
    n: 1, title: deep.chapters.ch1.title,
    mono: [
      `Born ${B.dateText || '[date]'}${B.timeText ? ', ' + B.timeText : ' (time unknown)'}${B.place ? ', ' + B.place : ''}.`,
      ...present.map((b) => (b === 'moon' && !timed)
        ? `${label(b)} — near ${fmtDegCoarse(natal[b])} ${deep.chapters.ch1.moonApproxNote || '(approximate)'}`
        : `${label(b)} — ${fmtDeg(natal[b], S)}${houseTxt(natal[b])}`),
    ],
    serif: [timed ? deep.chapters.ch1.serif : (deep.chapters.ch1.serifNoTime || deep.chapters.ch1.serif)],
  });

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
      lights.mono.push(`${label(l)} — ${fmtDeg(natal[l], S)}${houseTxt(natal[l])}`);
      lights.serif.push(deep.chapters.ch2[l].replace('{theme}', themeTxt));
    }
  }
  if (hasAsc) {
    lights.mono.push(`Ascendant — ${fmtDeg(natal.asc, S)}`);
    lights.serif.push(deep.chapters.ch2.asc.replace('{theme}', `${S[signIndex(natal.asc)]}: ${deep.signThemes[S[signIndex(natal.asc)]]}`));
  } else {
    lights.serif.push(deep.chapters.ch2.noAsc);
  }
  chapters.push({ n: 2, title: deep.chapters.ch2.title, ...lights });

  // CH3 — the shape (computed counts, honestly quoted)
  const bal = chartBalance(natal);
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
  chapters.push({
    n: 3, title: deep.chapters.ch3.title,
    mono: [
      `Elements — fire ${bal.el.fire} · earth ${bal.el.earth} · air ${bal.el.air} · water ${bal.el.water} (of ${bal.n} placements).`,
      `Modes — cardinal ${bal.mode.cardinal} · fixed ${bal.mode.fixed} · mutable ${bal.mode.mutable}.`,
    ],
    serif: ch3Serif,
  });

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
  chapters.push({
    n: 4, title: deep.chapters.ch4.title,
    mono: aspects.map((x) => `${label(x.a)} — ${label(x.b)} · ${aspectPlain(x.aspect)} · ${fmtOrb(x.orbDeg)} off exact.`),
    serif: ch4Serif,
  });

  // CH5 — the long arcs
  const arcs = { mono: [], serif: [] };
  for (const p of ['saturn', 'uranus', 'neptune', 'pluto']) {
    if (natal[p] == null) continue;
    const sName = S[signIndex(natal[p])];
    const hClause = (() => { const h = houseOf(natal[p]); return h ? `, ${h}${houseSuffix(h)} house` : ''; })();
    arcs.mono.push(`${label(p)} — ${fmtDeg(natal[p], S)}${houseTxt(natal[p])}`);
    // Sign-specific line when the library has one (audit fix: no placement-blind boilerplate).
    const signLine = deep.ch5Signs && deep.ch5Signs[p] && deep.ch5Signs[p][sName.toLowerCase()];
    arcs.serif.push(signLine
      ? signLine + (hClause ? ` In your chart it sits in the ${hClause.replace(', ', '')}.` : '')
      : deep.chapters.ch5[p].replace('{sign}', sName).replace('{house}', hClause));
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
  chapters.push({ n: 5, title: deep.chapters.ch5.title, ...arcs });

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
    chapters.push({
      n: 6, title: deep.chapters.ch6.title,
      mono: tc.length
        ? tc.map((x) => `${opts.transitDateText || 'Today'}: transiting ${label(x.transiting)} ${x.aspect} your natal ${label(x.natal)} — within ${fmtOrb(x.orbDeg)}.`)
        : [`${opts.transitDateText || 'Today'}: no transiting body sits within 3° of your chart — a genuinely quiet sky.`],
      serif: ch6Serif,
    });
  } else {
    chapters.push({ n: 6, title: deep.chapters.ch6.title, mono: [], serif: [deep.chapters.ch6.noTransits] });
  }

  // CH7 — a letter to keep (serif only; personalised from computed facts)
  const tight = aspects[0];
  const sunTheme = `${S[signIndex(natal.sun)]}: ${deep.signThemes[S[signIndex(natal.sun)]]}`;
  const ascNote = hasAsc
    ? (deep.chapters.ch7.ascNote || deep.chapters.ch2.asc)
      .replace('{theme}', `${S[signIndex(natal.asc)]}: ${deep.signThemes[S[signIndex(natal.asc)]]}`)
    : (deep.chapters.ch7.noAscNote || deep.chapters.ch2.noAsc);
  chapters.push({
    n: 7, title: deep.chapters.ch7.title, mono: [],
    serif: [deep.chapters.ch7.body
      .replace('{sunTheme}', sunTheme)
      .replace('{tightPair}', tight ? `${label(tight.a)} ${tight.aspect} ${label(tight.b)} (${fmtOrb(tight.orbDeg)})` : 'the quiet evenness of your placements')
      .replace('{domElement}', bal.domEl)
      .replace('{domElementLine}', deep.elements[bal.domEl])
      .replace('{ascNote}', ascNote)],
  });

  const wordCount = chapters.reduce((s, c) =>
    s + [...c.mono, ...c.serif].join(' ').split(/\s+/).filter(Boolean).length, 0);
  return { chapters, wordCount, legal: base.legalLine, houseNote: hasAsc ? base.houseSystemNote : null };
}
