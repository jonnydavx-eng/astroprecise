/**
 * Rich narrative helpers for paid natal readings (Deep Reading / bundle).
 * Life-area layout mirrors horoscope.html (overview · love · career · health).
 */
import { fmt, ord, sents } from './fulfil-shared.mjs';
import {
  buildBirthSkyFacts,
  planetsInHouse, houseCuspSign,
} from './reading-data-bridge.mjs';

export const PRODUCT_LABELS = {
  'natal-sky-print-pack': { short: 'Natal Sky Print Pack', tag: 'Computed Home-Print Chart' },
  'personal-sky-keepsake': { short: 'Personal Sky Keepsake', tag: 'Designed Reflective Reading' },
  'whole-sky-edition': { short: 'Whole Sky Edition', tag: 'Reading, Chart & Observatory Still' },
  'deep-reading': { short: 'The Deep Reading', tag: 'Personal Natal Reading' },
  'natal-poster-pdf': { short: 'Natal Chart Poster', tag: 'Print-at-Home Chart' },
  'reading-poster-bundle': { short: 'Deep Reading + Poster', tag: 'Reading & Chart Bundle' },
  'gift-reading-redeem': { short: 'The Deep Reading', tag: 'Gift Redemption' },
};

export function productLabel(product) {
  return PRODUCT_LABELS[product] || PRODUCT_LABELS['deep-reading'];
}

const MODE_BLURB = {
  Cardinal: 'initiative, openings, and movement',
  Fixed: 'continuity, concentration, and sustained attention',
  Mutable: 'adaptation, translation, and changing perspective',
};

/** Core principle of each body — standard significations, used to make every
 *  fallback aspect paragraph specific to the two bodies actually involved. */
const PLANET_PRINCIPLE = {
  Sun: 'identity and creative focus', Moon: 'feeling and response',
  Mercury: 'language and exchange', Venus: 'values and relating',
  Mars: 'action and assertion', Jupiter: 'meaning and exploration',
  Saturn: 'structure and responsibility', Uranus: 'change and independence',
  Neptune: 'imagination and ideals', Pluto: 'transformation and power',
  Chiron: 'sensitivity and repair', 'North Node': 'development and direction',
};
const principleOf = (name) => PLANET_PRINCIPLE[name] || `${name}'s themes`;

export function aspectProse(_interpretations, type, p1, p2, orb) {
  const gap = `${orb.toFixed(1)}° off exact`;
  const article = /^[aeiou]/i.test(type) ? 'an' : 'a';
  const geometry = type === 'Conjunction'
    ? `places ${principleOf(p1)} beside ${principleOf(p2)}`
    : type === 'Opposition'
      ? `sets ${principleOf(p1)} and ${principleOf(p2)} across one axis`
      : type === 'Square'
        ? `sets ${principleOf(p1)} and ${principleOf(p2)} at a right angle`
        : `links ${principleOf(p1)} with ${principleOf(p2)}`;
  return `${p1} and ${p2} form ${article} ${type.toLowerCase()} (${gap}). Traditional astrology ${geometry} as a reflection prompt. The angle does not establish a trait, event, strength, difficulty, or outcome.`;
}

export function housePlacementLine(planetName, house, sign, hMeaning) {
  const hm = hMeaning(house);
  return `${planetName} in ${sign} falls in the ${ord(house)} house — a traditional lens on ${hm.keyword}. ${sents(hm.meaning, 1)}`;
}

export function modalityBars(mC) {
  return `<div class="balance">${['Cardinal', 'Fixed', 'Mutable'].map((m) =>
    `<div class="row"><span class="el">${m}</span><span class="track"><span class="fill" style="width:${Math.round(mC[m] / 7 * 100)}%"></span></span><span class="n">${mC[m]}</span></div>`).join('')}</div>`;
}

export function chartRulerNarrative(ruler, pos, rulerName, pInterp, hMeaning) {
  const r = pos[ruler];
  return `In traditional astrology, a ${r.sign} Ascendant gives <strong>${rulerName}</strong> particular interpretive emphasis. Here ${rulerName} is at ${fmt(r.lon)} in ${r.sign}, in the ${ord(r.house)} house of ${hMeaning(r.house).keyword}. ${sents(pInterp(rulerName, r.sign), 2)}`;
}

export function mcCareerBlock(M, mcLon, sunSign, pInterp, hMeaning, sentsFn) {
  const hm = hMeaning(10);
  return `
  <h2 class="reading-subhead">The top of your chart — ${M.sign} (${hm.keyword})</h2>
  <p>The top of the chart sits at ${fmt(mcLon)} in ${M.sign}. Traditional astrology uses this point as a lens on public role and visibility, not as a career forecast. The <strong>Sun in ${sunSign}</strong> adds an identity symbol to that reading. ${sentsFn(pInterp('Sun', sunSign), 2)} ${sentsFn(hm.meaning, 1)}</p>`;
}

export function loveValuesBlock(pos, pInterp, hMeaning, sentsFn, PGL) {
  const vh = pos.venus.house;
  const mh = pos.mars.house;
  return `
  <h2 class="reading-subhead">${PGL.venus} Venus in ${pos.venus.sign} — ${ord(vh)} House (${hMeaning(vh).keyword})</h2>
  <p>${housePlacementLine('Venus', vh, pos.venus.sign, hMeaning)} ${sentsFn(pInterp('Venus', pos.venus.sign), 2)}</p>
  <h2 class="reading-subhead">${PGL.mars} Mars in ${pos.mars.sign} — ${ord(mh)} House (${hMeaning(mh).keyword})</h2>
  <p>${sentsFn(pInterp('Mars', pos.mars.sign), 2)} Read together, Venus and Mars offer two symbolic prompts: values through ${pos.venus.sign}, and action through ${pos.mars.sign}. They do not assess a relationship, attraction, or behaviour.</p>`;
}

export function saturnChapter(pos, pInterp, hMeaning, sentsFn, PGL) {
  const k = 'saturn';
  return `
  <h2 class="reading-subhead">${PGL[k]} Saturn in ${pos[k].sign} — ${ord(pos[k].house)} House (${hMeaning(pos[k].house).keyword})</h2>
  <p class="lede">Astrologers use Saturn as a symbol of structure, limits, time, and responsibility.</p>
  <p>${sentsFn(pInterp('Saturn', pos[k].sign), 3)} Its ${ord(pos[k].house)}-house position places that symbolic prompt alongside ${hMeaning(pos[k].house).keyword.toLowerCase()}.</p>`;
}

export function skyFactsBlock(pos, asc, mc, fmtFn, PGL, PNAME, BODIES) {
  const facts = buildBirthSkyFacts(pos, asc, mc, fmtFn, PGL, PNAME, BODIES);
  return `<p class="note" style="font-size:10pt;line-height:1.75;">Your birth sky at a glance — the same computed positions behind <em>horoscope.html</em>, <em>transits.html</em>, and <em>chart.html</em>:<br>${facts.join(' · ')}</p>`;
}

export function lifeAreasChapter(ctx, topics = ['love', 'career', 'health', 'purpose']) {
  const { pos, mcSign, hMeaning, pInterp, sentsFn } = ctx;
  const blocks = {
    love: ['Values &amp; connection', `Venus in ${pos.venus.sign}, in the ${ord(pos.venus.house)} house of ${hMeaning(pos.venus.house).keyword}, is a traditional prompt about values and relating. ${sentsFn(pInterp('Venus', pos.venus.sign), 2)} It is not a compatibility or relationship assessment.`],
    career: ['Vocation &amp; public life', `The top of the chart in ${mcSign} and Saturn in ${pos.saturn.sign}, in the ${ord(pos.saturn.house)} house, provide symbols for considering public contribution, structure, and long-range effort. They do not predict occupation, status, income, or success.`],
    health: ['Daily rhythm &amp; wellbeing', `The Moon in ${pos.moon.sign} and Mars in ${pos.mars.sign} can be used as prompts to notice feelings, pace, and daily routines. This symbolic reading makes no claim about health, physiology, diagnosis, or treatment; use qualified professional advice for those matters.`],
    purpose: ['Meaning &amp; direction', `The North Node in ${pos.northNode.sign}, in the ${ord(pos.northNode.house)} house, and Jupiter in ${pos.jupiter.sign} are traditional prompts about direction, learning, and meaning. They do not state a destiny, moral duty, guaranteed opportunity, or outcome.`],
  };
  return `
  <h1 style="font-size:20pt;">Four reflective&nbsp;<br>lenses.</h1>
  <p class="lede">The natal chart is a symbolic map beneath the moving sky. These themes are prompts for reflection, not predictions or advice.</p>
  ${topics.filter((topic) => blocks[topic]).map((topic) => `<h2>${blocks[topic][0]}</h2><p>${blocks[topic][1]}</p>`).join('')}
  ${topics.includes('purpose') ? '<p class="note">A chart can support questions; it cannot establish facts about a person or decide what should happen next.</p>' : ''}`;
}

export function houseTourChapter(houses, pos, hMeaning, fmtFn, PGL, PNAME, BODIES, fromHouse = 1, toHouse = 12) {
  let body = `
  <h1 style="font-size:20pt;">House by house —&nbsp;<br>where life happens.</h1>
  <p class="lede">Houses ${fromHouse}–${toHouse}: sign on the cusp, bodies placed there, and the traditional life themes associated with that area.</p>
  <table class="placements"><tr><th>House</th><th>Cusp</th><th>Planets</th><th>Life theme</th></tr>`;
  for (let n = fromHouse; n <= toHouse; n++) {
    const cusp = houseCuspSign(houses, n);
    const inmates = planetsInHouse(n, pos, BODIES);
    const pl = inmates.length
      ? inmates.map((k) => `${PGL[k]} ${PNAME[k]}`).join(', ')
      : '—';
    body += `<tr><td>${ord(n)}</td><td>${cusp}</td><td>${pl}</td><td>${hMeaning(n).keyword}</td></tr>`;
  }
  body += '</table>';
  const hotspots = [1, 4, 7, 10].filter((n) => n >= fromHouse && n <= toHouse).map((n) => {
    const inmates = planetsInHouse(n, pos, BODIES);
    if (!inmates.length) return '';
    const verb = inmates.length === 1 ? 'concentrates' : 'concentrate';
    return `<p><strong>${ord(n)} house (${houseCuspSign(houses, n)} cusp):</strong> ${inmates.map((k) => PNAME[k]).join(', ')} ${verb} the chart's geometric emphasis around ${hMeaning(n).keyword}. ${hMeaning(n).meaning ? sents(hMeaning(n).meaning, 1) : ''}</p>`;
  }).filter(Boolean).join('');
  if (hotspots) body += hotspots;
  return body;
}

export function planetDossiersChapter(pos, pInterp, hMeaning, sentsFn, PGL, PNAME, BODIES, { heading = 'Every body in your sky.', intro = true } = {}) {
  let body = `
  <h1 style="font-size:20pt;">${heading}</h1>
  ${intro ? '<p class="lede">Twelve placements, twelve symbolic voices — each with sign, house, and, where relevant, retrograde motion.</p>' : ''}`;
  BODIES.forEach((k) => {
    const rx = pos[k].retro ? ' <span class="r">℞ retrograde</span>' : '';
    body += `<h2 class="reading-subhead">${PGL[k]} ${PNAME[k]} — ${fmt(pos[k].lon)} · ${ord(pos[k].house)} house${rx}</h2>`;
    if (k === 'northNode') {
      // No North-Node-in-sign entry exists in the corpus; compose honestly from
      // the real nodal axis (North Node ↔ opposite South Node) instead of the
      // generic filler line getPlanetInterpretation would otherwise return.
      body += `<p>${housePlacementLine('The North Node', pos[k].house, pos[k].sign, hMeaning)} `;
      body += 'It is traditionally read as a symbolic prompt about development, not as destiny or a required life path.</p>';
      return;
    }
    body += `<p>${housePlacementLine(PNAME[k], pos[k].house, pos[k].sign, hMeaning)} ${sentsFn(pInterp(PNAME[k], pos[k].sign), 2)}`;
    if (pos[k].retro) {
      body += ` Astrologers often use retrograde motion as a prompt to review or reconsider ${PNAME[k]}'s themes; it does not establish an inner state.`;
    }
    body += '</p>';
  });
  return body;
}

export function chartPatternsChapter(patterns, ctx = null) {
  // ctx (optional): { pos, hMeaning, pInterp, sentsFn, ord: ordFn, PNAME }
  // enriches each pattern with the real sign/house depth behind it, so this page
  // is substantive rather than a one-line note on a mostly-empty sheet.
  const closing = `<p class="note">Patterns describe measured relationships between chart positions. Any interpretation remains symbolic: presence or absence does not rank a person, fix a trait, or forecast an outcome.</p>`;
  if (!patterns.length) {
    return `<h1 style="font-size:20pt;">Chart patterns.</h1>
      <p class="lede">No selected multi-planet configuration met this edition's stated geometric thresholds.</p>
      <p>The chart still contains the measured positions and individual aspects listed elsewhere. The absence of a named pattern is descriptive only; it carries no positive or negative judgement.</p>
      ${closing}`;
  }
  const enrich = ctx && ctx.pos && ctx.hMeaning;
  let body = `<h1 style="font-size:20pt;">Patterns in the geometry.</h1><p class="lede">Beyond individual placements, selected geometric relationships can be grouped under traditional pattern names.</p>`;
  patterns.forEach((p) => {
    if (p.type === 'stellium') {
      body += `<h2 class="reading-subhead">${p.sign} stellium</h2><p>${p.planets.join(', ')} share ${p.sign}, meeting this edition's three-or-more-body threshold. Traditional astrology treats the grouping as concentrated symbolic emphasis; it is not a fixed trait or compulsory lesson.</p>`;
      if (enrich) {
        const key = p.planets[0] === 'Sun' ? 'Sun' : p.planets[0];
        const signProse = ctx.sentsFn(ctx.pInterp(key, p.sign), 2);
        const houses = [...new Set(p.planets.map((nm) => {
          const bk = Object.keys(ctx.PNAME).find((k) => ctx.PNAME[k] === nm);
          return bk && ctx.pos[bk] ? ctx.pos[bk].house : null;
        }).filter(Boolean))].sort((a, b) => a - b);
        if (signProse) body += `<p>A bounded reflection prompt for ${p.sign}: ${signProse}</p>`;
        if (houses.length) {
          const hhs = houses.map((n) => `the ${ctx.ord(n)} (${ctx.hMeaning(n).keyword.toLowerCase()})`).join(houses.length > 1 ? ', ' : '');
          body += `<p>The cluster falls across ${houses.length > 1 ? 'houses' : 'the house'} of ${hhs}. Those locations identify the traditional life-area labels used for reflection, not observed facts.</p>`;
        }
      }
    } else if (p.type === 'grandTrine') {
      body += `<h2 class="reading-subhead">A closed loop of trines</h2><p>${p.planets.join(', ')} form the measured trine links used for this pattern label. Traditional interpretations sometimes associate this geometry with ease; no talent or outcome is inferred here.</p>`;
    } else if (p.type === 'tSquare') {
      body += `<h2 class="reading-subhead">T-square</h2><p>The measured opposition and square links meet this edition's T-square threshold. The name describes geometry; it does not establish conflict, ambition, pressure, or a remedy.</p>`;
    } else if (p.type === 'mutualReception') {
      body += `<h2 class="reading-subhead">Mutual reception</h2><p>${p.pairs.join('; ')}. Traditional rulership tables call this a mutual reception; no behavioural claim follows from the label.</p>`;
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

export function aspectsChapter(aspects, I, PNAME, PGL, limit = 10, offset = 0) {
  const top = aspects.slice(offset, offset + limit);
  let body = `
  <p>These are geometric angles between chart positions. Traditional astrology reads smaller gaps from an exact angle as stronger symbolic emphasis.</p>
  <table><tr><th>Bodies</th><th>What it does</th><th>Off exact</th></tr>
  ${top.map((a) => `<tr><td><span class="glyph">${PGL[a.a]}</span> ${PNAME[a.a]} &nbsp;${a.gl}&nbsp; <span class="glyph">${PGL[a.b]}</span> ${PNAME[a.b]}</td><td>${plainAspect(a.type)}</td><td>${a.orb.toFixed(1)}°</td></tr>`).join('')}
  </table>`;
  top.forEach((a, i) => {
    const prose = aspectProse(I, a.type, PNAME[a.a], PNAME[a.b], a.orb);
    body += `<h2 class="reading-subhead">${offset + i + 1}. ${PNAME[a.a]} and ${PNAME[a.b]} — ${plainAspect(a.type).toLowerCase()}</h2><p>${prose}</p>`;
  });
  body += `<p class="note">These interpretations are reflective prompts. No angle guarantees an event, outcome, strength or difficulty.</p>`;
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
  const timeNote = `<p>House cusps use <strong>Placidus</strong> for the latitude of ${PERSON.place}. The civil clock reading was converted from <strong>${order.tz}</strong> to <strong>${order.utcLabel}</strong> before calculation. AstroPrecise does not infer or rectify an unknown birth time.</p>`;
  return `
  <p class="eyebrow">How This Reading Was Made</p>
  <h1 style="font-size:22pt;">Measured sky,&nbsp;<br>not invented copy.</h1>
  <p class="lede">Planetary positions in this document are computed from the VSOP87 and ELP2000 models for ${PERSON.date} at ${PERSON.time} in ${PERSON.place}. Interpretive passages come from AstroPrecise's curated astrology corpus and are assembled from those placements.</p>
  <h2 class="reading-subhead">Your free instruments</h2>
  <p>This reading deepens what you can explore free on the site: your <strong>birth chart wheel</strong>, your <strong>daily horoscope</strong> read against your Sun sign, the <strong>live sky</strong> moving over your birth chart, <strong>compatibility</strong> between two charts, and the <strong>raw sky tables</strong> if you would rather see the numbers themselves. They are all in the menu at astroprecise.app. The PDF is the keepsake; the site stays your living observatory.</p>
  ${timeNote}
  <h2 class="reading-subhead">What astrology is — here</h2>
  <p>This is a traditional symbolic practice, not a scientific personality assessment or fortune-telling. It does not diagnose, prescribe, or guarantee outcomes.</p>
  <h2 class="reading-subhead">How to use it</h2>
  <p>Use each passage as an optional question. Keep what is useful, set aside what is not, and never substitute a symbolic reading for evidence or qualified advice.</p>
  <p class="reading-disclaimer">For reflection and entertainment · Not medical, financial, legal or other professional advice · astroprecise.app/accuracy.html</p>`;
}

const artForSign = (sign) => (/^[AEIOU]/i.test(String(sign)) ? 'an' : 'a');

export function closingChapter(name, sunSign, moonSign, ascSign, domEl, domMode, domLineTail) {
  const reflections = [
    `Where might the ${sunSign} Sun symbolism offer a useful question about identity or creative focus?`,
    `What associations arise when considering the ${moonSign} Moon as a symbol of feeling and response?`,
    `How might ${ascSign} rising be used as a prompt about first impressions, without treating it as a fixed trait?`,
  ];
  return `
  <h2>Three questions to carry</h2>
  <ul class="questions">${reflections.map((q) => `<li>${q}</li>`).join('')}</ul>
  <p>${name}, the chart count emphasises <strong>${domEl[0].toLowerCase()}</strong> symbolism — ${domLineTail.replace(/^a |^an /, '')} — with a <strong>${domMode[0].toLowerCase()}</strong> classification associated with ${MODE_BLURB[domMode[0]]}. In traditional terms, ${artForSign(sunSign)} ${sunSign} Sun, ${artForSign(moonSign)} ${moonSign} Moon, and ${ascSign} rising provide three optional lenses for reflection.</p>
  <p class="lede" style="margin-top:16pt;">This is not prediction. It is orientation — a map of the sky you were born under, drawn honestly. What you build on it is yours. Thank you for trusting AstroPrecise with your birth moment.</p>
  <p class="reading-support">Questions about your files? Use the private Gumroad order conversation · astroprecise.app</p>`;
}
