/**
 * Bridges site instruments → paid reading prose.
 * HOUSE_THEME / life-area logic aligned with horoscope-engine.js;
 * chart patterns + analyzeChart payload for interpretations.js corpus.
 */
import { norm, sd, ord, sents } from './fulfil-shared.mjs';

/** Same themes as website/js/horoscope-engine.js — natal house context. */
export const HOUSE_THEME = {
  1: 'identity, vitality, and first impressions',
  2: 'money, values, and what you choose to keep',
  3: 'communication, errands, and nearby connections',
  4: 'home, roots, and private emotional life',
  5: 'romance, creativity, and wholehearted play',
  6: 'health routines, craft, and daily service',
  7: 'partnerships, contracts, and mirrored dynamics',
  8: 'shared resources, intimacy, and honest depth',
  9: 'travel, study, and the larger meaning',
  10: 'career visibility, reputation, and long aims',
  11: 'friends, community, and future-facing hopes',
  12: 'rest, reflection, and what works beneath the surface',
};

export const LOVE_NATAL = {
  5: 'Romance and creative chemistry are written into your chart — spontaneity and play are not luxuries but requirements.',
  7: 'Partnership is a primary classroom — contracts, mirrors, and honest negotiation shape your love story.',
  8: 'Intimacy runs deep — bonds transform through vulnerability, shared resources, and emotional honesty.',
  1: 'You attract through presence — confidence and self-definition are part of your love language.',
  4: 'Emotional safety at home underpins every outward relationship — nesting is not weakness.',
  11: 'Friendship and shared ideals colour love — community and aligned values matter as much as chemistry.',
};

export const CAREER_NATAL = {
  10: 'Public visibility and vocation are central themes — reputation is built through sustained competence.',
  6: 'Craft, systems, and daily service are your professional engine — refine the process and results follow.',
  3: 'Messages, writing, and local networks advance your aims — pitch while ideas are warm.',
  2: 'Income and self-worth are linked — pricing your work fairly is part of the career path.',
  9: 'Teaching, publishing, or horizons beyond the familiar open professional doors.',
  11: 'Collaboration and network intelligence shorten the path — the right ally changes the trajectory.',
};

export const HEALTH_NATAL = {
  6: 'Body-mind balance lives in routines — small daily habits compound into resilience.',
  1: 'Vitality responds to how boldly you inhabit your body — movement and self-assertion restore energy.',
  12: 'Rest, solitude, and nervous-system quiet are medicine — overstimulation drains you faster than others notice.',
  4: 'Emotional roots affect the body — home, family, and inner safety are physiological themes.',
  8: 'Stress lodges in the depths — catharsis, therapy, and honest release support long-term health.',
};

const SIGN_RULER = {
  Aries: 'Mars', Taurus: 'Venus', Gemini: 'Mercury', Cancer: 'Moon',
  Leo: 'Sun', Virgo: 'Mercury', Libra: 'Venus', Scorpio: 'Pluto',
  Sagittarius: 'Jupiter', Capricorn: 'Saturn', Aquarius: 'Saturn', Pisces: 'Jupiter',
};

const SIGN_OPPOSITE = {
  Aries: 'Libra', Taurus: 'Scorpio', Gemini: 'Sagittarius', Cancer: 'Capricorn',
  Leo: 'Aquarius', Virgo: 'Pisces', Libra: 'Aries', Scorpio: 'Taurus',
  Sagittarius: 'Gemini', Capricorn: 'Cancer', Aquarius: 'Leo', Pisces: 'Virgo',
};

/**
 * The lunar-nodal axis — real, standard astrological convention (not per-buyer
 * invention). The North Node names the growth direction; the South Node (always
 * the opposite sign) names the over-familiar comfort being released. Each entry
 * is curated corpus in the same class as interpretations.js's planet-in-sign
 * bank — this is the honest content that replaces the generic North-Node filler
 * (getPlanetInterpretation has no North-Node-in-sign entries, so it would
 * otherwise emit a hollow "blends its principle with the sign" line).
 */
export const NODE_AXIS = {
  Aries: 'grow through plain desire, decisive action, and healthy self-interest — releasing the Libra South Node\'s habit of deference, endless weighing, and defining yourself through others\' approval. The lesson is to want something openly and move on it before consensus arrives.',
  Taurus: 'grow through steady self-worth, simple security, and owning what is genuinely yours — releasing the Scorpio South Node\'s pull toward crisis, entanglement, and borrowing intensity from other people\'s depths. The lesson is that enough, held calmly, is its own power.',
  Gemini: 'grow through curiosity, close listening, and the humble gathering of facts — releasing the Sagittarius South Node\'s reflex to already know, to preach the big picture before checking the small one. The lesson is that the right question outranks the confident answer.',
  Cancer: 'grow through emotional honesty, belonging, and letting yourself be cared for — releasing the Capricorn South Node\'s armor of control, over-responsibility, and achievement as a substitute for feeling. The lesson is that needing people is not weakness but the point.',
  Leo: 'grow through wholehearted creative courage, warmth, and being seen as an individual — releasing the Aquarius South Node\'s retreat into the group, the abstract, and cool detachment. The lesson is to risk the personal spotlight your gifts have earned.',
  Virgo: 'grow through practical service, useful craft, and attention to the doable next step — releasing the Pisces South Node\'s drift, escapism, and waiting to be rescued. The lesson is that devotion becomes real only when it takes concrete form.',
  Libra: 'grow through partnership, fairness, and genuine consideration of the other — releasing the Aries South Node\'s go-it-alone impulse and reflex to win. The lesson is that some things can only be built by two, at the pace of two.',
  Scorpio: 'grow through depth, honest intimacy, and the willingness to be transformed — releasing the Taurus South Node\'s attachment to comfort, possessions, and the unexamined status quo. The lesson is to let what is finished actually end.',
  Sagittarius: 'grow through faith, first-hand experience, and the larger meaning — releasing the Gemini South Node\'s scattered data-gathering and second-hand cleverness. The lesson is to commit to a truth and live it, not merely to collect more information.',
  Capricorn: 'grow through mature responsibility, structure, and stepping into visible authority — releasing the Cancer South Node\'s retreat into old comforts and the safety of the familiar. The lesson is to become the reliable adult you keep looking for.',
  Aquarius: 'grow through contribution, equality, and serving a circle wider than yourself — releasing the Leo South Node\'s need for the spotlight and personal applause. The lesson is that the future is built with others, and your gift matters most given away.',
  Pisces: 'grow through trust, compassion, and surrender to something larger than the plan — releasing the Virgo South Node\'s over-analysis, worry, and the belief that more control will finally make it safe. The lesson is to let go where effort has stopped helping.',
};

/** Honest North-Node-axis prose: real growth direction + the opposite South Node. */
export function nodeAxisNarrative(nnSign) {
  const grow = NODE_AXIS[nnSign];
  const south = SIGN_OPPOSITE[nnSign];
  if (!grow) return '';
  return { south, text: `With the North Node in ${nnSign}, the direction of growth is to ${grow}` };
}

export function planetsInHouse(houseNum, pos, bodies) {
  return bodies.filter((k) => pos[k].house === houseNum).map((k) => k);
}

export function buildBirthSkyFacts(pos, asc, mc, fmt, PGL, PNAME, bodies) {
  const facts = [];
  facts.push(`${PGL.sun} Sun ${fmt(pos.sun.lon)} · ${ord(pos.sun.house)} house`);
  facts.push(`${PGL.moon} Moon ${fmt(pos.moon.lon)} · ${ord(pos.moon.house)} house`);
  facts.push(`↑ Ascendant ${fmt(asc)}`);
  facts.push(`MC ${fmt(mc)}`);
  bodies.filter((k) => !['sun', 'moon'].includes(k)).forEach((k) => {
    const rx = pos[k].retro ? ' ℞' : '';
    facts.push(`${PGL[k]} ${PNAME[k]} ${fmt(pos[k].lon)}${rx}`);
  });
  return facts;
}

export function buildAnalyzePayload({ pos, asc, mc, ruler, aspects, BODIES, PNAME }) {
  const planetHouses = {};
  BODIES.forEach((k) => { planetHouses[PNAME[k]] = pos[k].house; });
  const positions = {};
  BODIES.forEach((k) => {
    positions[PNAME[k]] = { lon: pos[k].lon };
  });
  positions.MC = { lon: mc };
  positions.NNode = { lon: pos.northNode.lon };
  return {
    positions,
    asc,
    mc,
    risingSign: sd(asc).sign,
    chartRuler: PNAME[ruler] || ruler,
    planetHouses,
    aspects: aspects.slice(0, 12).map((a) => ({
      aspect: a.type.toLowerCase(),
      planet1: PNAME[a.a],
      planet2: PNAME[a.b],
      orb: a.orb,
    })),
  };
}

function aspectBetween(lon1, lon2, target, orb) {
  let d = Math.abs(norm(lon1) - norm(lon2));
  if (d > 180) d = 360 - d;
  return Math.abs(d - target) <= orb;
}

export function detectChartPatterns(aspects, pos, PNAME) {
  const patterns = [];
  const stelliBodies = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'chiron'];
  const bySign = {};
  stelliBodies.forEach((k) => {
    (bySign[pos[k].sign] = bySign[pos[k].sign] || []).push(k);
  });
  const stellium = Object.entries(bySign).find(([, ks]) => ks.length >= 3);
  if (stellium) {
    patterns.push({
      type: 'stellium',
      sign: stellium[0],
      planets: stellium[1].map((k) => PNAME[k]),
    });
  }

  const trines = aspects.filter((a) => a.type === 'Trine' && a.orb <= 4);
  if (trines.length >= 3) {
    const bodies = new Set();
    trines.slice(0, 4).forEach((t) => { bodies.add(t.a); bodies.add(t.b); });
    if (bodies.size >= 3) {
      patterns.push({
        type: 'grandTrine',
        planets: [...bodies].map((k) => PNAME[k]),
        note: 'Three or more flowing trines link planets in a closed circuit — talent that must be deliberately spent or it becomes complacency.',
      });
    }
  }

  const squares = aspects.filter((a) => a.type === 'Square' && a.orb <= 3);
  const oppositions = aspects.filter((a) => a.type === 'Opposition' && a.orb <= 3);
  if (squares.length >= 2 && oppositions.length >= 1) {
    patterns.push({
      type: 'tSquare',
      note: 'Hard aspects form a T-square — a classic engine of ambition. The empty leg (the sign opposite the focal planet) is where relief and integration are found.',
    });
  }

  const receptions = [];
  [['mercury', 'venus'], ['mars', 'venus'], ['sun', 'moon'], ['jupiter', 'saturn']].forEach(([a, b]) => {
    const ra = SIGN_RULER[pos[a].sign];
    const rb = SIGN_RULER[pos[b].sign];
    if (ra === PNAME[b] && rb === PNAME[a]) {
      receptions.push(`${PNAME[a]} in ${pos[a].sign} ↔ ${PNAME[b]} in ${pos[b].sign}`);
    }
  });
  if (receptions.length) {
    patterns.push({ type: 'mutualReception', pairs: receptions });
  }

  return patterns;
}

export function synthesizeLifeAreas({ pos, ascSign, mcSign, I, analyzePayload, hMeaning, pInterp, sentsFn }) {
  let personality = '';
  let love = '';
  let career = '';
  let challenges = '';
  let lifePurpose = '';

  if (I?.analyzeChart) {
    try {
      const a = I.analyzeChart(analyzePayload);
      personality = a.personality || '';
      love = a.love || '';
      career = a.career || '';
      challenges = a.challenges || '';
      lifePurpose = a.lifePurpose || '';
    } catch {
      /* fall through to natal synthesis */
    }
  }

  const venusH = pos.venus.house;
  const marsH = pos.mars.house;
  const moonH = pos.moon.house;
  const saturnH = pos.saturn.house;
  const mcH = 10;

  if (!love) {
    love = `${LOVE_NATAL[venusH] || LOVE_NATAL[7]} Venus in ${pos.venus.sign} (${ord(venusH)} house — ${hMeaning(venusH).keyword}) shapes how you give and receive affection. ${sentsFn(pInterp('Venus', pos.venus.sign), 2)} Mars in ${pos.mars.sign} (${ord(marsH)} house) sets pursuit style: ${sentsFn(pInterp('Mars', pos.mars.sign), 1)}`;
  }

  if (!career) {
    career = `${CAREER_NATAL[mcH] || CAREER_NATAL[10]} Midheaven in ${mcSign} directs public reputation. Saturn in ${pos.saturn.sign} (${ord(saturnH)} house) describes the long apprenticeship: ${sentsFn(pInterp('Saturn', pos.saturn.sign), 2)}`;
  }

  const health = `${HEALTH_NATAL[pos.mars.house] || HEALTH_NATAL[6]} Moon in ${pos.moon.sign} (${ord(moonH)} house) links emotion to the body — ${HOUSE_THEME[moonH]}. Mars in ${pos.mars.sign}${pos.mars.retro ? ' retrograde' : ''} sets your energy signature: ${pos.mars.retro ? 'drive turns inward; pace yourself deliberately' : 'direct action restores equilibrium when feelings stagnate'}.`;

  const purpose = lifePurpose || `North Node in ${pos.northNode.sign} (${ord(pos.northNode.house)} house) points toward ${HOUSE_THEME[pos.northNode.house]} as a growth edge. Jupiter in ${pos.jupiter.sign} (${ord(pos.jupiter.house)} house) marks where expansion feels fated when you say yes.`;

  return {
    personality: personality || `With ${ascSign} rising, ${pos.sun.sign} Sun, and ${pos.moon.sign} Moon, your temperament blends ${HOUSE_THEME[pos.sun.house]}, ${HOUSE_THEME[pos.moon.house]}, and ${HOUSE_THEME[1]} — the same data pillars that power AstroPrecise's daily horoscope and transit tools, here written for your full natal map.`,
    love,
    career,
    health,
    purpose,
    challenges: challenges || `Your tightest hard aspects mark where the chart refuses to let you sleepwalk — integration there becomes maturity.`,
  };
}

export function houseCuspSign(houses, n) {
  return sd(houses[n - 1]).sign;
}