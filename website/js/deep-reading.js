/*
 * Astro Precise — the £12 Deep Reading engine (seven chapters)
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
  const hasAsc = natal.asc != null && !Number.isNaN(natal.asc);
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
      ...present.map((b) => `${label(b)} — ${fmtDeg(natal[b], S)}${houseTxt(natal[b])}`),
    ],
    serif: [deep.chapters.ch1.serif],
  });

  // CH2 — the three lights
  const lights = { mono: [], serif: [] };
  for (const l of ['sun', 'moon']) {
    lights.mono.push(`${label(l)} — ${fmtDeg(natal[l], S)}${houseTxt(natal[l])}`);
    lights.serif.push(deep.chapters.ch2[l].replace('{theme}', `${S[signIndex(natal[l])]}: ${deep.signThemes[S[signIndex(natal[l])]]}`));
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
  chapters.push({
    n: 3, title: deep.chapters.ch3.title,
    mono: [
      `Elements — fire ${bal.el.fire} · earth ${bal.el.earth} · air ${bal.el.air} · water ${bal.el.water} (of ${bal.n} placements).`,
      `Modes — cardinal ${bal.mode.cardinal} · fixed ${bal.mode.fixed} · mutable ${bal.mode.mutable}.`,
    ],
    serif: [
      `${bal.domElCount} of your ${bal.n} placements sit in ${bal.domEl}. ${deep.elements[bal.domEl]}`,
      deep.modalities[bal.domMode],
    ],
  });

  // CH4 — where the weight falls (2-3 tightest natal aspects)
  const aspects = natalAspects(natal, orbs).slice(0, 3);
  chapters.push({
    n: 4, title: deep.chapters.ch4.title,
    mono: aspects.map((x) => `${label(x.a)} ${x.aspect} ${label(x.b)} — orb ${fmtOrb(x.orbDeg)}.`),
    serif: [deep.chapters.ch4.intro, ...aspects.map((x) =>
      deep.chapters.ch4.pairFrame
        .replace('{a}', label(x.a)).replace('{b}', label(x.b))
        .replace('{aspect}', x.aspect).replace('{orb}', fmtOrb(x.orbDeg))
        .replace('{aTheme}', theme(x.a)).replace('{verb}', deep.aspectVerbs[x.aspect]).replace('{bTheme}', theme(x.b)),
    )],
  });

  // CH5 — the long arcs
  const arcs = { mono: [], serif: [] };
  for (const p of ['saturn', 'uranus', 'neptune', 'pluto']) {
    if (natal[p] == null) continue;
    arcs.mono.push(`${label(p)} — ${fmtDeg(natal[p], S)}${houseTxt(natal[p])}`);
    arcs.serif.push(deep.chapters.ch5[p]
      .replace('{sign}', S[signIndex(natal[p])])
      .replace('{house}', (() => { const h = houseOf(natal[p]); return h ? `, ${h}${houseSuffix(h)} house` : ''; })()));
  }
  chapters.push({ n: 5, title: deep.chapters.ch5.title, ...arcs });

  // CH6 — this season's sky (live part; honest when absent)
  if (opts.transits) {
    const tc = transitContacts(opts.transits, natal, orbs).slice(0, 3);
    chapters.push({
      n: 6, title: deep.chapters.ch6.title,
      mono: tc.length
        ? tc.map((x) => `${opts.transitDateText || 'Today'}: transiting ${label(x.transiting)} ${x.aspect} your natal ${label(x.natal)} — within ${fmtOrb(x.orbDeg)}.`)
        : [`${opts.transitDateText || 'Today'}: no transiting body sits within 3° of your chart — a genuinely quiet sky.`],
      serif: [deep.chapters.ch6.intro],
    });
  } else {
    chapters.push({ n: 6, title: deep.chapters.ch6.title, mono: [], serif: [deep.chapters.ch6.noTransits] });
  }

  // CH7 — a letter to keep (serif only; personalised from computed facts)
  const tight = aspects[0];
  chapters.push({
    n: 7, title: deep.chapters.ch7.title, mono: [],
    serif: [deep.chapters.ch7.body
      .replace('{tightPair}', tight ? `${label(tight.a)} ${tight.aspect} ${label(tight.b)} (${fmtOrb(tight.orbDeg)})` : 'the quiet evenness of your placements')
      .replace('{domElement}', bal.domEl)
      .replace('{domElementLine}', deep.elements[bal.domEl])],
  });

  const wordCount = chapters.reduce((s, c) =>
    s + [...c.mono, ...c.serif].join(' ').split(/\s+/).filter(Boolean).length, 0);
  return { chapters, wordCount, legal: base.legalLine, houseNote: hasAsc ? base.houseSystemNote : null };
}
