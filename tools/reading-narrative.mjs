/**
 * Rich narrative helpers for paid natal readings (Deep Reading / bundle).
 * Life-area layout mirrors horoscope.html (overview · love · career · health).
 */
import { fmt, ord, sents } from './fulfil-shared.mjs';
import {
  HOUSE_THEME, buildBirthSkyFacts, detectChartPatterns, synthesizeLifeAreas,
  planetsInHouse, houseCuspSign,
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

export function aspectProse(I, type, p1, p2, orb) {
  let text = '';
  try {
    if (I?.getAspectMeaning) text = I.getAspectMeaning(type, p1, p2) || '';
  } catch { /* skip */ }
  if (!text || text === GENERIC_ASPECT) {
    const tight = orb <= 2 ? 'especially close in your chart' : orb <= 4 ? 'a clear signature in your wiring' : 'present but softer in expression';
    const hard = type === 'Square' || type === 'Opposition';
    const soft = type === 'Trine' || type === 'Sextile';
    if (type === 'Conjunction') {
      text = `${p1} and ${p2} speak as one voice here (orb ${orb.toFixed(1)}°) — their themes merge so completely that separating them in lived experience is almost impossible. What one planet wants, the other reinforces.`;
    } else if (soft) {
      text = `${p1} ${type.toLowerCase()} ${p2} (orb ${orb.toFixed(1)}°) is ${tight}: a cooperative current you can lean on when you choose to engage it. Gifts like this grow when named and used, not when left on autopilot.`;
    } else if (hard) {
      text = `${p1} ${type.toLowerCase()} ${p2} (orb ${orb.toFixed(1)}°) is ${tight}: productive friction between two parts of you that both demand a seat at the table. The pressure is not punishment — it is how this chart builds muscle.`;
    } else {
      text = `${p1} and ${p2} form a ${type.toLowerCase()} (orb ${orb.toFixed(1)}°) — a recurring conversation between two principles in your chart.`;
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
  <h3>MC · Midheaven in ${M.sign} — ${hm.keyword}</h3>
  <p>Your Midheaven at ${fmt(mcLon)} is the chart's public apex — the direction your life is seen to climb. Your <strong>Sun in ${sunSign}</strong> fuels that climb — ${sentsFn(pInterp('Sun', sunSign), 2)} ${sentsFn(hm.meaning, 1)}</p>`;
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
  return `<p class="note" style="font-size:10pt;line-height:1.75;">Your birth sky at a glance — the same ephemeris data behind <em>horoscope.html</em>, <em>transits.html</em>, and <em>chart.html</em>:<br>${facts.join(' · ')}</p>`;
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
    return `<p><strong>${ord(n)} house (${houseCuspSign(houses, n)} cusp):</strong> ${inmates.map((k) => PNAME[k]).join(', ')} concentrate energy in ${HOUSE_THEME[n]}. ${hMeaning(n).meaning ? sents(hMeaning(n).meaning, 1) : ''}</p>`;
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
    body += `<p>${housePlacementLine(PNAME[k], pos[k].house, pos[k].sign, hMeaning)} ${sentsFn(pInterp(PNAME[k], pos[k].sign), 3)}`;
    if (pos[k].retro) {
      body += ` Retrograde motion turns ${PNAME[k]}'s expression inward — you metabolise this planet's themes privately before showing them outwardly.`;
    }
    body += '</p>';
  });
  return body;
}

export function chartPatternsChapter(patterns) {
  if (!patterns.length) {
    return `<h1 style="font-size:20pt;">Chart patterns</h1><p>No major stellium, grand trine, or T-square dominates — your chart distributes its weight across multiple stories rather than one loud configuration.</p>`;
  }
  let body = `<h1 style="font-size:20pt;">Patterns the sky repeats.</h1><p class="lede">Beyond individual placements, geometry links planets into recurring life themes.</p>`;
  patterns.forEach((p) => {
    if (p.type === 'stellium') {
      body += `<h3>${p.sign} stellium</h3><p>${p.planets.join(', ')} gather in ${p.sign} — a concentrated signature the way a horoscope's "dominant transit" would feel, except this is permanent in your natal map.</p>`;
    } else if (p.type === 'grandTrine') {
      body += `<h3>Grand trine</h3><p>${p.planets.join(', ')} — ${p.note}</p>`;
    } else if (p.type === 'tSquare') {
      body += `<h3>T-square</h3><p>${p.note}</p>`;
    } else if (p.type === 'mutualReception') {
      body += `<h3>Mutual reception</h3><p>${p.pairs.join('; ')} — each planet guests in the other's sign, trading strengths like allies covering each other's blind spots.</p>`;
    }
  });
  return body;
}

export function aspectsChapter(aspects, I, PNAME, PGL, limit = 10) {
  const top = aspects.slice(0, limit);
  let body = `
  <p>Aspects are the angles planets make to one another — the wiring beneath temperament. Yours, listed by exactness:</p>
  <table><tr><th>Bodies</th><th>Aspect</th><th>Orb</th></tr>
  ${top.map((a) => `<tr><td><span class="glyph">${PGL[a.a]}</span> ${PNAME[a.a]} &nbsp;${a.gl}&nbsp; <span class="glyph">${PGL[a.b]}</span> ${PNAME[a.b]}</td><td>${a.type}</td><td>${a.orb.toFixed(1)}°</td></tr>`).join('')}
  </table>`;
  top.forEach((a, i) => {
    const prose = aspectProse(I, a.type, PNAME[a.a], PNAME[a.b], a.orb);
    body += `<h3>${i + 1}. ${PNAME[a.a]} ${a.type.toLowerCase()} ${PNAME[a.b]}</h3><p>${prose}</p>`;
  });
  body += `<p class="note">A flowing aspect (trine, sextile) is a gift to spend consciously. A hard one (square, opposition) is an engine — pressure applied where strength is meant to grow.</p>`;
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
    <tr><td><span class="glyph">MC</span> Midheaven</td><td>${fmtFn(mc)}</td><td>10</td><td>—</td></tr>
  </table>`;
}

export function methodologyPage(PERSON, order) {
  const timeNote = order.timeUnknown
    ? `<p class="note"><strong>Birth time note:</strong> Your time was approximate or unknown. We cast a solar chart (noon local) for sign placements; houses, Ascendant, and Midheaven are illustrative only. For a full angular chart, a birth certificate time transforms this reading.</p>`
    : `<p>House cusps use <strong>Placidus</strong> for the latitude of ${PERSON.place}. Ascendant and Midheaven are computed for the exact minute supplied.</p>`;
  return `
  <p class="eyebrow">How This Reading Was Made</p>
  <h1 style="font-size:22pt;">Measured sky,<br>not invented copy.</h1>
  <p class="lede">Every longitude in this document is computed from planetary theory (VSOP87 for the planets, ELP2000 for the Moon) for ${PERSON.date} at ${PERSON.time} above ${PERSON.place}. Interpretations are drawn from AstroPrecise's curated corpus — the same <code>interpretations.js</code> engine behind chart analysis, compatibility, and horoscope copy — stitched to <em>your</em> placements, not a generic sign column.</p>
  <h3>Your free instruments</h3>
  <p>This reading deepens what you can explore free on the site: <strong>chart.html</strong> (your wheel), <strong>horoscope.html</strong> (daily sky against your Sun sign), <strong>transits.html</strong> (live weather on your natal map), <strong>compatibility.html</strong> (synastry), and <strong>ephemeris.html</strong> (raw positions). The PDF is the keptake; the site stays your living observatory.</p>
  ${timeNote}
  <h3>What astrology is — here</h3>
  <p>This is symbolic pattern recognition, not fortune-telling. The chart describes qualities of time at your first breath: temperament, motivation, recurring themes. It does not diagnose, prescribe, or guarantee outcomes.</p>
  <h3>How to use it</h3>
  <p>Read for resonance, not verdict. Highlight what lands true; sit with what irritates — friction often marks growth edges. Return after major life chapters; the sky map stays the same, but you read it with wiser eyes.</p>
  <p style="font-size:9.5pt;color:#A89E88;margin-top:14pt;">Entertainment purposes only · Not medical, financial, or legal advice · astroprecise.app/accuracy.html</p>`;
}

export function closingChapter(name, sunSign, moonSign, ascSign, domEl, domMode, domLineTail) {
  const reflections = [
    `Where does your ${sunSign} Sun already lead — even when you doubt yourself?`,
    `What does your ${moonSign} Moon need to feel safe enough to soften?`,
    `How does ${ascSign} rising show up in first impressions — and is that the doorway you want?`,
  ];
  return `
  <h2>Three questions to carry</h2>
  <ul class="questions">${reflections.map((q) => `<li>${q}</li>`).join('')}</ul>
  <p>${name}, your chart is led by <strong>${domEl[0].toLowerCase()}</strong> — ${domLineTail.replace(/^a |^an /, '')} — with a <strong>${domMode[0].toLowerCase()}</strong> rhythm: ${MODE_BLURB[domMode[0]]}. Carried on a ${sunSign} Sun, a ${moonSign} Moon, and ${ascSign} rising, it asks you to bring what you privately understand into a form the world can meet.</p>
  <p class="lede" style="margin-top:16pt;">This is not prediction. It is orientation — a map of the sky you were born under, drawn honestly. What you build on it is yours. Thank you for trusting AstroPrecise with your birth moment.</p>
  <p style="font-size:9pt;color:#5E5748;text-align:center;margin-top:12pt;">Questions about your reading? Reply to your delivery email · astroprecise.app</p>`;
}