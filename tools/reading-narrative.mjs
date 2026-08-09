/**
 * Rich narrative helpers for paid natal readings (Deep Reading / bundle).
 * Life-area layout mirrors horoscope.html (overview · love · career · health).
 */
import { fmt, ord, sents } from './fulfil-shared.mjs';
import {
  HOUSE_THEME, buildBirthSkyFacts, detectChartPatterns, synthesizeLifeAreas,
  planetsInHouse, houseCuspSign, nodeAxisNarrative,
} from './reading-data-bridge.mjs';

export const PRODUCT_LABELS = {
  'deep-reading': { short: 'The Deep Reading', tag: 'Personal Natal Reading' },
  'natal-poster-pdf': { short: 'Natal Chart Poster', tag: 'Print-at-Home Chart' },
  'reading-poster-bundle': { short: 'Deep Reading + Poster', tag: 'Reading & Chart Bundle' },
  'gift-reading-redeem': { short: 'The Deep Reading', tag: 'Gift Redemption' },
};

export function productLabel(product) {
  return PRODUCT_LABELS[product] || PRODUCT_LABELS['deep-reading'];
}

const MODE_BLURB = {
  Cardinal: 'you initiate, open chapters, and meet change at the threshold',
  Fixed: 'you sustain, deepen, and defend what has been built until it is truly yours',
  Mutable: 'you adapt, translate, and weave between worlds — flexibility is your craft',
};

const GENERIC_ASPECT = 'This planetary relationship adds texture and meaning to your chart.';
// The corpus returns a by-aspect-type `default` string for any pair it doesn't
// specifically cover. That text is honest but identical across every uncovered
// pair of the same type — three "Square" paragraphs would read verbatim-alike.
// Detect those defaults so the pair-specific fallback (which names both planets
// and the exact orb) takes over and no two aspect entries read the same.
const GENERIC_DEFAULTS = [
  GENERIC_ASPECT,
  'These two planetary principles operate with unusual intensity',
  'This harmonious trine (120°) indicates',
  // interpretations.js reworded the 60° default on 2026-08-09 ("A helpful angle (60°)").
  // Both spellings stay listed: miss the match and every uncovered 60° pair in a paid
  // reading falls back to the same corpus paragraph, which is the bug this guards.
  'This sextile (60°) represents an opportunity aspect',
  'A helpful angle (60°)',
  'This square (90°) creates productive tension',
  'This opposition (180°) represents a polarity',
];
function isGenericAspectText(text) {
  if (!text) return true;
  return GENERIC_DEFAULTS.some((g) => text.startsWith(g) || text === g);
}

/** Core principle of each body — standard significations, used to make every
 *  fallback aspect paragraph specific to the two bodies actually involved. */
const PLANET_PRINCIPLE = {
  Sun: 'your core will and identity', Moon: 'your emotional needs and instincts',
  Mercury: 'how you think and communicate', Venus: 'how you love and what you value',
  Mars: 'your drive and how you assert', Jupiter: 'where you expand and seek meaning',
  Saturn: 'your discipline and where you build', Uranus: 'your urge to break free and innovate',
  Neptune: 'your imagination and longing to dissolve', Pluto: 'your drive to transform through depth',
  Chiron: 'your core wound and the healing you offer', 'North Node': 'your growing edge',
};
const principleOf = (name) => PLANET_PRINCIPLE[name] || `${name}'s themes`;

export function aspectProse(I, type, p1, p2, orb) {
  let text = '';
  try {
    if (I?.getAspectMeaning) text = I.getAspectMeaning(type, p1, p2) || '';
  } catch { /* skip */ }
  if (isGenericAspectText(text)) {
    const tight = orb <= 2 ? 'especially close in your chart' : orb <= 4 ? 'a clear signature in your wiring' : 'present but softer in expression';
    const hard = type === 'Square' || type === 'Opposition';
    const soft = type === 'Trine' || type === 'Sextile';
    const a = principleOf(p1);
    const b = principleOf(p2);
    // How far the angle sits from exact. Said in plain words, because "orb" is
    // trade jargon that tells a first-time reader nothing.
    const gap = `${orb.toFixed(1)}° off exact`;
    if (type === 'Conjunction') {
      text = `Here ${a} (${p1}) and ${b} (${p2}) speak as one voice — ${gap}, close enough that their themes merge and separating them in lived experience is almost impossible. What one wants, the other reinforces.`;
    } else if (soft) {
      text = `The easy angle between ${p1} and ${p2} (${gap}) is ${tight}: ${a} — and ${b} — have an open channel between them, a current you can lean on whenever you choose to engage it. Gifts like this grow when they are named and used, not left on autopilot.`;
    } else if (type === 'Opposition') {
      text = `${p1} opposite ${p2} (${gap}) is ${tight}: ${a} — and ${b} — sit at opposite ends of one axis, each of them pulling the other way. The work is holding both at once rather than swinging between them, or casting one pole onto other people.`;
    } else if (hard) {
      text = `${p1} square ${p2} (${gap}) is ${tight}: ${a} — and ${b} — keep crossing each other at an angle, and the friction is something both of them demand you resolve. The pressure is not punishment. It is where this chart builds muscle.`;
    } else {
      text = `${p1} and ${p2} sit ${gap} from ${plainAspect(type).toLowerCase()} — an ongoing conversation between ${a} and ${b}.`;
    }
  }
  return sents(text, hardAspect(type) ? 3 : 2);
}

function hardAspect(type) {
  return type === 'Square' || type === 'Opposition';
}

export function housePlacementLine(planetName, house, sign, hMeaning) {
  const hm = hMeaning(house);
  return `${planetName} in ${sign} occupies your ${ord(house)} house — the house of ${hm.keyword}. ${sents(hm.meaning, 1)}`;
}

export function modalityBars(mC) {
  return `<div class="balance">${['Cardinal', 'Fixed', 'Mutable'].map((m) =>
    `<div class="row"><span class="el">${m}</span><span class="track"><span class="fill" style="width:${Math.round(mC[m] / 7 * 100)}%"></span></span><span class="n">${mC[m]}</span></div>`).join('')}</div>`;
}

export function chartRulerNarrative(ruler, pos, rulerName, pInterp, hMeaning) {
  const r = pos[ruler];
  return `Because your Ascendant is ruled by <strong>${rulerName}</strong>, the whole chart routes through ${rulerName} at ${fmt(r.lon)} in ${r.sign} (${ord(r.house)} house — ${hMeaning(r.house).keyword}). ${sents(pInterp(rulerName, r.sign), 2)} This planet is your chart's conductor: when it is honoured, the rest of the orchestra follows.`;
}

export function mcCareerBlock(M, mcLon, sunSign, pInterp, hMeaning, sentsFn) {
  const hm = hMeaning(10);
  return `
  <h3>The top of your chart — ${M.sign} (${hm.keyword})</h3>
  <p>The very top of your chart sits at ${fmt(mcLon)} in ${M.sign}. This is your public face: the direction your life is seen to climb, and what people think you are for. Your <strong>Sun in ${sunSign}</strong> fuels that climb — ${sentsFn(pInterp('Sun', sunSign), 2)} ${sentsFn(hm.meaning, 1)}</p>`;
}

export function loveValuesBlock(pos, pInterp, hMeaning, sentsFn, PGL) {
  const vh = pos.venus.house;
  const mh = pos.mars.house;
  return `
  <h3>${PGL.venus} Venus in ${pos.venus.sign} — ${ord(vh)} House (${hMeaning(vh).keyword})</h3>
  <p>${housePlacementLine('Venus', vh, pos.venus.sign, hMeaning)} ${sentsFn(pInterp('Venus', pos.venus.sign), 2)}</p>
  <h3>${PGL.mars} Mars in ${pos.mars.sign} — ${ord(mh)} House (${hMeaning(mh).keyword})</h3>
  <p>${sentsFn(pInterp('Mars', pos.mars.sign), 2)} Together, Venus and Mars describe both what you are drawn toward and how you pursue it — affection in ${pos.venus.sign}, action in ${pos.mars.sign}${pos.venus.sign === pos.mars.sign ? ', fused in the same sign so desire and style speak one dialect' : ', two dialects that learn each other over time'}.</p>`;
}

export function saturnChapter(pos, pInterp, hMeaning, sentsFn, PGL) {
  const k = 'saturn';
  return `
  <h3>${PGL[k]} Saturn in ${pos[k].sign} — ${ord(pos[k].house)} House (${hMeaning(pos[k].house).keyword})</h3>
  <p class="lede">Saturn is not the villain of the chart — it is the architect. Where it sits, mastery is slow, serious, and non-negotiable.</p>
  <p>${sentsFn(pInterp('Saturn', pos[k].sign), 3)} In the ${ord(pos[k].house)} house, this discipline lands in the territory of ${hMeaning(pos[k].house).keyword.toLowerCase()}: the life arena where patience earns authority.</p>`;
}

export function skyFactsBlock(pos, asc, mc, fmtFn, PGL, PNAME, BODIES) {
  const facts = buildBirthSkyFacts(pos, asc, mc, fmtFn, PGL, PNAME, BODIES);
  return `<p class="note" style="font-size:10pt;line-height:1.75;">Your birth sky at a glance — the same computed positions behind <em>horoscope.html</em>, <em>transits.html</em>, and <em>chart.html</em>:<br>${facts.join(' · ')}</p>`;
}

export function lifeAreasChapter(ctx) {
  const areas = synthesizeLifeAreas(ctx);
  return `
  <h1 style="font-size:20pt;">Four life territories<br>your chart maps.</h1>
  <p class="lede">Daily horoscopes on AstroPrecise translate the moving sky into love, career, and wellbeing themes. Your natal chart is the permanent map beneath that weather — the same house logic, written in depth for you alone.</p>
  <h2>Love &amp; connection</h2>
  <p>${areas.love}</p>
  <h2>Vocation &amp; public life</h2>
  <p>${areas.career}</p>
  <h2>Body, rhythm &amp; wellbeing</h2>
  <p>${areas.health}</p>
  <h2>Purpose &amp; growth edge</h2>
  <p>${areas.purpose}</p>
  <p class="note">${areas.challenges} Return to <strong>astroprecise.app/transits.html</strong> anytime to see how today's sky activates these natal themes.</p>`;
}

export function houseTourChapter(houses, pos, hMeaning, fmtFn, PGL, PNAME, BODIES) {
  let body = `
  <h1 style="font-size:20pt;">House by house —<br>where life happens.</h1>
  <p class="lede">Each house is a theatre of experience. Below: the sign on the cusp, any planets stationed there, and the life themes they activate — drawn from the same house dictionary used across the site.</p>
  <table class="placements"><tr><th>House</th><th>Cusp</th><th>Planets</th><th>Life theme</th></tr>`;
  for (let n = 1; n <= 12; n++) {
    const cusp = houseCuspSign(houses, n);
    const inmates = planetsInHouse(n, pos, BODIES);
    const pl = inmates.length
      ? inmates.map((k) => `${PGL[k]} ${PNAME[k]}`).join(', ')
      : '—';
    body += `<tr><td>${ord(n)}</td><td>${cusp}</td><td>${pl}</td><td>${HOUSE_THEME[n]}</td></tr>`;
  }
  body += '</table>';
  const hotspots = [1, 4, 7, 10].map((n) => {
    const inmates = planetsInHouse(n, pos, BODIES);
    if (!inmates.length) return '';
    const verb = inmates.length === 1 ? 'concentrates' : 'concentrate';
    return `<p><strong>${ord(n)} house (${houseCuspSign(houses, n)} cusp):</strong> ${inmates.map((k) => PNAME[k]).join(', ')} ${verb} energy in ${HOUSE_THEME[n]}. ${hMeaning(n).meaning ? sents(hMeaning(n).meaning, 1) : ''}</p>`;
  }).filter(Boolean).join('');
  body += hotspots || '<p>No angular house stellions — energy distributes across the wheel rather than clustering on the four cardinal doors.</p>';
  return body;
}

export function planetDossiersChapter(pos, pInterp, hMeaning, sentsFn, PGL, PNAME, BODIES) {
  let body = `
  <h1 style="font-size:20pt;">Every body<br>in your sky.</h1>
  <p class="lede">Twelve placements, twelve voices — each with sign, house, and (where relevant) retrograde motion. This is the instrument panel behind every AstroPrecise reading.</p>`;
  BODIES.forEach((k) => {
    const rx = pos[k].retro ? ' <span class="r">℞ retrograde</span>' : '';
    body += `<h3>${PGL[k]} ${PNAME[k]} — ${fmt(pos[k].lon)} · ${ord(pos[k].house)} house${rx}</h3>`;
    if (k === 'northNode') {
      // No North-Node-in-sign entry exists in the corpus; compose honestly from
      // the real nodal axis (North Node ↔ opposite South Node) instead of the
      // generic filler line getPlanetInterpretation would otherwise return.
      const axis = nodeAxisNarrative(pos[k].sign);
      body += `<p>${housePlacementLine('The North Node', pos[k].house, pos[k].sign, hMeaning)} `;
      body += axis ? `${axis.text} Its opposite point, the South Node in ${axis.south}, marks the well-worn strengths you already carry — safe to lean on, but no longer where the growth is.</p>`
        : 'It marks the direction of growth your chart keeps pointing toward.</p>';
      return;
    }
    body += `<p>${housePlacementLine(PNAME[k], pos[k].house, pos[k].sign, hMeaning)} ${sentsFn(pInterp(PNAME[k], pos[k].sign), 3)}`;
    if (pos[k].retro) {
      body += ` Retrograde motion turns ${PNAME[k]}'s expression inward — you metabolise this planet's themes privately before showing them outwardly.`;
    }
    body += '</p>';
  });
  return body;
}

export function chartPatternsChapter(patterns, ctx = null) {
  // ctx (optional): { pos, hMeaning, pInterp, sentsFn, ord: ordFn, PNAME }
  // enriches each pattern with the real sign/house depth behind it, so this page
  // is substantive rather than a one-line note on a mostly-empty sheet.
  const closing = `<p class="note">Patterns are read on top of the individual placements, never instead of them — where a configuration exists, it tells you which themes the rest of the chart keeps circling back to. Where one is absent, it simply means the energy is distributed rather than concentrated; neither is better, only different weather to live inside.</p>`;
  if (!patterns.length) {
    return `<h1 style="font-size:20pt;">Chart patterns.</h1>
      <p class="lede">Some charts fire a single loud configuration; others spread their weight evenly. Yours is the second kind.</p>
      <p>No one shape dominates your chart: no three-or-more planets piled into a single sign, no closed loop of easy angles, no locked engine of tension. That is not a lack. It means your story is told across several placements of roughly equal voice, rather than routed through one overriding theme. Read the planet-by-planet and angle chapters as a chorus rather than a single lead line.</p>
      ${closing}`;
  }
  const enrich = ctx && ctx.pos && ctx.hMeaning;
  let body = `<h1 style="font-size:20pt;">Patterns the sky repeats.</h1><p class="lede">Beyond individual placements, geometry links planets into recurring life themes — the configurations your chart returns to again and again.</p>`;
  patterns.forEach((p) => {
    if (p.type === 'stellium') {
      body += `<h3>${p.sign} stellium</h3><p>${p.planets.join(', ')} gather in ${p.sign} — a concentrated signature the way a horoscope's "dominant transit" would feel, except this is permanent in your natal map. Where this much weight collects in one sign, that sign's lessons stop being optional: they become the spine the rest of the chart hangs from.</p>`;
      if (enrich) {
        const key = p.planets[0] === 'Sun' ? 'Sun' : p.planets[0];
        const signProse = ctx.sentsFn(ctx.pInterp(key, p.sign), 2);
        const houses = [...new Set(p.planets.map((nm) => {
          const bk = Object.keys(ctx.PNAME).find((k) => ctx.PNAME[k] === nm);
          return bk && ctx.pos[bk] ? ctx.pos[bk].house : null;
        }).filter(Boolean))].sort((a, b) => a - b);
        if (signProse) body += `<p>${p.sign}'s character, worn by so many of your planets at once: ${signProse}</p>`;
        if (houses.length) {
          const hhs = houses.map((n) => `the ${ctx.ord(n)} (${ctx.hMeaning(n).keyword.toLowerCase()})`).join(houses.length > 1 ? ', ' : '');
          body += `<p>The cluster falls across ${houses.length > 1 ? 'houses' : 'the house'} of ${hhs} — so this ${p.sign} theme plays out most visibly in ${houses.length > 1 ? 'those areas of life' : 'that area of life'}.</p>`;
        }
      }
    } else if (p.type === 'grandTrine') {
      body += `<h3>A closed loop of ease</h3><p>${p.planets.join(', ')} — ${p.note}</p>`;
    } else if (p.type === 'tSquare') {
      body += `<h3>T-square</h3><p>${p.note}</p>`;
    } else if (p.type === 'mutualReception') {
      body += `<h3>Mutual reception</h3><p>${p.pairs.join('; ')} — each planet guests in the other's sign, trading strengths like allies covering each other's blind spots.</p>`;
    }
  });
  body += closing;
  return body;
}

/** What each angle DOES, in the reader's words. The trade names (sextile, trine)
 *  tell a first-time reader nothing, so they never appear in a heading, a table
 *  cell or a link — only the behaviour does. */
const ASPECT_PLAIN = {
  Conjunction: 'Fused',
  Opposition: 'Pulling apart',
  Square: 'Under friction',
  Trine: 'Easy flow',
  Sextile: 'Quietly supportive',
};
export const plainAspect = (type) => ASPECT_PLAIN[type] || type;

export function aspectsChapter(aspects, I, PNAME, PGL, limit = 10) {
  const top = aspects.slice(0, limit);
  let body = `
  <p>These are the angles your planets make to one another — the wiring beneath temperament. Closest first: the smaller the gap from an exact angle, the louder it tends to run.</p>
  <table><tr><th>Bodies</th><th>What it does</th><th>Off exact</th></tr>
  ${top.map((a) => `<tr><td><span class="glyph">${PGL[a.a]}</span> ${PNAME[a.a]} &nbsp;${a.gl}&nbsp; <span class="glyph">${PGL[a.b]}</span> ${PNAME[a.b]}</td><td>${plainAspect(a.type)}</td><td>${a.orb.toFixed(1)}°</td></tr>`).join('')}
  </table>`;
  top.forEach((a, i) => {
    const prose = aspectProse(I, a.type, PNAME[a.a], PNAME[a.b], a.orb);
    body += `<h3>${i + 1}. ${PNAME[a.a]} and ${PNAME[a.b]} — ${plainAspect(a.type).toLowerCase()}</h3><p>${prose}</p>`;
  });
  body += `<p class="note">An easy angle is a gift to spend on purpose — it will never force itself on you. A tense one is an engine: pressure applied exactly where this chart is built to grow muscle. Neither is good or bad luck; they are different kinds of work.</p>`;
  return body;
}

export function placementTable(BODIES, pos, PGL, PNAME, fmtFn, asc, mc) {
  const rows = BODIES.map((k) => {
    const retro = pos[k].retro ? ' <span class="r">℞</span>' : '';
    return `<tr><td><span class="glyph">${PGL[k]}</span> ${PNAME[k]}</td><td>${fmtFn(pos[k].lon)}</td><td>${ord(pos[k].house)}</td><td>${pos[k].sign}${retro}</td></tr>`;
  }).join('');
  return `
  <table class="placements">
    <tr><th>Body</th><th>Position</th><th>House</th><th>Sign</th></tr>
    ${rows}
    <tr><td><span class="glyph">↑</span> Ascendant</td><td>${fmtFn(asc)}</td><td>1</td><td>—</td></tr>
    <tr><td><span class="glyph">MC</span> Top of the chart</td><td>${fmtFn(mc)}</td><td>10</td><td>—</td></tr>
  </table>`;
}

export function methodologyPage(PERSON, order) {
  const timeNote = order.timeUnknown
    ? `<p class="note"><strong>Birth time note:</strong> Your time was approximate or unknown. We cast a solar chart (noon local) for sign placements; the houses, your rising sign and the top of your chart are illustrative only. Those three need a real birth time, so a time from your birth certificate would transform this reading.</p>`
    : `<p>House cusps use <strong>Placidus</strong> for the latitude of ${PERSON.place}. Your rising sign and the top of your chart are worked out for the exact minute you gave us — we do not round it to the nearest hour.</p>`;
  return `
  <p class="eyebrow">How This Reading Was Made</p>
  <h1 style="font-size:22pt;">Measured sky,<br>not invented copy.</h1>
  <p class="lede">Every longitude in this document is computed from planetary theory (VSOP87 for the planets, ELP2000 for the Moon) for ${PERSON.date} at ${PERSON.time} above ${PERSON.place}. Interpretations are drawn from AstroPrecise's curated corpus — the same <code>interpretations.js</code> engine behind chart analysis, compatibility, and horoscope copy — stitched to <em>your</em> placements, not a generic sign column.</p>
  <h3>Your free instruments</h3>
  <p>This reading deepens what you can explore free on the site: your <strong>birth chart wheel</strong>, your <strong>daily horoscope</strong> read against your Sun sign, the <strong>live sky</strong> moving over your birth chart, <strong>compatibility</strong> between two charts, and the <strong>raw sky tables</strong> if you would rather see the numbers themselves. They are all in the menu at astroprecise.app. The PDF is the keepsake; the site stays your living observatory.</p>
  ${timeNote}
  <h3>What astrology is — here</h3>
  <p>This is symbolic pattern recognition, not fortune-telling. The chart describes qualities of time at your first breath: temperament, motivation, recurring themes. It does not diagnose, prescribe, or guarantee outcomes.</p>
  <h3>How to use it</h3>
  <p>Read for resonance, not verdict. Highlight what lands true; sit with what irritates — friction often marks growth edges. Return after major life chapters; the sky map stays the same, but you read it with wiser eyes.</p>
  <p style="font-size:9.5pt;color:#A89E88;margin-top:14pt;">Entertainment purposes only · Not medical, financial, or legal advice · astroprecise.app/accuracy.html</p>`;
}

const artForSign = (sign) => (/^[AEIOU]/i.test(String(sign)) ? 'an' : 'a');

export function closingChapter(name, sunSign, moonSign, ascSign, domEl, domMode, domLineTail) {
  const reflections = [
    `Where does your ${sunSign} Sun already lead — even when you doubt yourself?`,
    `What does your ${moonSign} Moon need to feel safe enough to soften?`,
    `How does ${ascSign} rising show up in first impressions — and is that the doorway you want?`,
  ];
  return `
  <h2>Three questions to carry</h2>
  <ul class="questions">${reflections.map((q) => `<li>${q}</li>`).join('')}</ul>
  <p>${name}, your chart is led by <strong>${domEl[0].toLowerCase()}</strong> — ${domLineTail.replace(/^a |^an /, '')} — with a <strong>${domMode[0].toLowerCase()}</strong> rhythm: ${MODE_BLURB[domMode[0]]}. Carried on ${artForSign(sunSign)} ${sunSign} Sun, ${artForSign(moonSign)} ${moonSign} Moon, and ${ascSign} rising, it asks you to bring what you privately understand into a form the world can meet.</p>
  <p class="lede" style="margin-top:16pt;">This is not prediction. It is orientation — a map of the sky you were born under, drawn honestly. What you build on it is yours. Thank you for trusting AstroPrecise with your birth moment.</p>
  <p style="font-size:9pt;color:#5E5748;text-align:center;margin-top:12pt;">Questions about your reading? Reply to your delivery email · astroprecise.app</p>`;
}