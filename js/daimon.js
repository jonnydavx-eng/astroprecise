'use strict';

// =============================================================================
// The Daimon — a persistent reading-voice with identity, memory, and
// long-form layered readings.
//
// window.Daimon = { summon, compose, remember, recall, answer, getLastQuestion }
//
// Identity is deterministic from the natal chart; composition is deterministic
// from date + chart. Memory lives in localStorage under 'ap_daimon'.
// =============================================================================

(function () {

  const root = (typeof window !== 'undefined') ? window : globalThis;

  // ── Deterministic primitives ──────────────────────────────────────────────

  function fnv1a(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pick(rng, arr) {
    return arr[Math.floor(rng() * arr.length) % arr.length];
  }

  function mod360(x) { return ((x % 360) + 360) % 360; }

  function dateKeyOf(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }

  function countWords(text) {
    const m = text.trim().match(/\S+/g);
    return m ? m.length : 0;
  }

  // ── Storage ───────────────────────────────────────────────────────────────

  const MEM_KEY = 'ap_daimon';

  function storage() {
    try { return root.localStorage || null; } catch (e) { return null; }
  }

  function loadMem() {
    try {
      const s = storage();
      if (!s) return { history: [] };
      const raw = s.getItem(MEM_KEY);
      const m = raw ? JSON.parse(raw) : null;
      return (m && Array.isArray(m.history)) ? m : { history: [] };
    } catch (e) { return { history: [] }; }
  }

  function saveMem(m) {
    try {
      const s = storage();
      if (s) s.setItem(MEM_KEY, JSON.stringify(m));
    } catch (e) { /* storage unavailable — the daimon forgets gracefully */ }
  }

  // ── Astrological constants ────────────────────────────────────────────────

  const SIGNS = [
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
  ];

  const ELEMENT_OF = {
    Aries: 'Fire', Leo: 'Fire', Sagittarius: 'Fire',
    Taurus: 'Earth', Virgo: 'Earth', Capricorn: 'Earth',
    Gemini: 'Air', Libra: 'Air', Aquarius: 'Air',
    Cancer: 'Water', Scorpio: 'Water', Pisces: 'Water',
  };

  const RULER_OF = {
    Aries: 'Mars', Taurus: 'Venus', Gemini: 'Mercury', Cancer: 'Moon',
    Leo: 'Sun', Virgo: 'Mercury', Libra: 'Venus', Scorpio: 'Pluto',
    Sagittarius: 'Jupiter', Capricorn: 'Saturn', Aquarius: 'Uranus',
    Pisces: 'Neptune',
  };

  const LUNAR_PHASES = [
    'New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous',
    'Full Moon', 'Disseminating', 'Last Quarter', 'Balsamic',
  ];

  function lunarPhaseName(sunLon, moonLon) {
    const angle = mod360(moonLon - sunLon);
    return LUNAR_PHASES[Math.floor(angle / 45) % 8];
  }

  function signOfLon(lon) {
    return SIGNS[Math.floor(mod360(lon) / 30) % 12];
  }

  // ── Chart introspection ───────────────────────────────────────────────────
  // Accepts the shapes produced by AstroProfile (saved charts with sunSign /
  // moonSign / risingSign, or buildChartData with .positions and .ascendant)
  // and falls back to recomputation from birth data when possible.

  function lonFrom(cand) {
    if (cand === undefined || cand === null) return null;
    if (typeof cand === 'number' && isFinite(cand)) return mod360(cand);
    if (typeof cand === 'object') {
      if (typeof cand.longitude === 'number') return mod360(cand.longitude);
      if (typeof cand.lon === 'number') return mod360(cand.lon);
    }
    return null;
  }

  function birthJd(chart) {
    const E = root.AstroEphemeris;
    if (!E || !chart || !chart.birthDate) return null;
    try {
      const dParts = String(chart.birthDate).split('-').map(Number);
      if (dParts.length !== 3 || dParts.some(isNaN)) return null;
      const t = String(chart.birthTime || '12:00').split(':').map(Number);
      return E.julianDay(dParts[0], dParts[1], dParts[2], t[0] || 12, t[1] || 0, 0);
    } catch (e) { return null; }
  }

  function chartSigns(chart) {
    const E = root.AstroEphemeris;
    const out = { sun: null, moon: null, rising: null, jd: null };
    if (!chart) return out;

    const pos = (chart.positions && typeof chart.positions === 'object') ? chart.positions : null;
    if (pos) {
      const sunLon = lonFrom(pos.Sun !== undefined ? pos.Sun : pos.sun);
      const moonLon = lonFrom(pos.Moon !== undefined ? pos.Moon : pos.moon);
      if (sunLon !== null) out.sun = signOfLon(sunLon);
      if (moonLon !== null) out.moon = signOfLon(moonLon);
    }
    const asc = lonFrom(chart.ascendant);
    if (asc !== null) out.rising = signOfLon(asc);

    if (!out.sun && typeof chart.sunSign === 'string' && ELEMENT_OF[chart.sunSign]) out.sun = chart.sunSign;
    if (!out.moon && typeof chart.moonSign === 'string' && ELEMENT_OF[chart.moonSign]) out.moon = chart.moonSign;
    if (!out.rising && typeof chart.risingSign === 'string' && ELEMENT_OF[chart.risingSign]) out.rising = chart.risingSign;

    out.jd = birthJd(chart);
    if (E && out.jd !== null && (!out.sun || !out.moon)) {
      try {
        if (!out.sun) out.sun = signOfLon(E.sunPosition(out.jd).lon);
        if (!out.moon) out.moon = signOfLon(E.moonPosition(out.jd).lon);
      } catch (e) { /* keep whatever we have */ }
    }
    return out;
  }

  function todaySigns(date) {
    const E = root.AstroEphemeris;
    const out = { sun: 'Leo', moon: 'Cancer', rising: null, jd: null };
    if (!E) return out;
    try {
      const jd = E.julianDay(date.getFullYear(), date.getMonth() + 1, date.getDate(), 12, 0, 0);
      out.jd = jd;
      out.sun = signOfLon(E.sunPosition(jd).lon);
      out.moon = signOfLon(E.moonPosition(jd).lon);
    } catch (e) { /* defaults stand */ }
    return out;
  }

  function dominantElement(signs) {
    const tally = { Fire: 0, Earth: 0, Air: 0, Water: 0 };
    const list = [signs.sun, signs.moon, signs.rising].filter(Boolean);
    for (const s of list) tally[ELEMENT_OF[s]]++;
    let best = signs.sun ? ELEMENT_OF[signs.sun] : 'Fire';
    let bestCount = -1;
    for (const el of ['Fire', 'Earth', 'Air', 'Water']) {
      if (tally[el] > bestCount) { best = el; bestCount = tally[el]; }
    }
    // Ties resolve toward the sun sign's element — the chart's daylight self.
    if (signs.sun && tally[ELEMENT_OF[signs.sun]] === bestCount) best = ELEMENT_OF[signs.sun];
    return best;
  }

  // ── Identity: names, epithets, voiceprints ────────────────────────────────
  // Names compose from per-element syllable pools: fire names strike, water
  // names flow, air names lift, earth names settle. Deterministic per chart.

  const NAME_SYLLABLES = {
    Fire: {
      first: ['Ash', 'Zar', 'Kael', 'Vry', 'Sor', 'Pyr', 'Rhek', 'Ign'],
      second: ['ion', 'akar', 'eth', 'azar', 'ikh', 'ax', 'aon', 'ekai'],
    },
    Earth: {
      first: ['Tor', 'Bel', 'Ond', 'Maru', 'Gra', 'Dol', 'Karn', 'Hesta'],
      second: ['um', 'ath', 'var', 'holm', 'dun', 'orin', 'ar', 'one'],
    },
    Air: {
      first: ['Aer', 'Syl', 'Quil', 'Vey', 'Liri', 'Zeph', 'Ais', 'Cael'],
      second: ['ion', 'ara', 'eth', 'ivar', 'isse', 'aire', 'enn', 'ios'],
    },
    Water: {
      first: ['Mara', 'Nehe', 'Lua', 'Selu', 'Ome', 'Thala', 'Ny', 'Velu'],
      second: ['nis', 'len', 'riel', 'wen', 'lune', 'mira', 'essa', 'vahl'],
    },
  };

  const EPITHETS = {
    Fire: [
      'Keeper of the Ember Hours', 'Warden of the First Spark',
      'Bearer of the Noon Crown', 'Lantern of the Burning Meridian',
      'Herald of the Unbanked Flame', 'Striker of the Morning Flint',
      'Custodian of the Forge-Light', 'Voice of the Solar Wind',
      'Tender of the Signal Fires', 'Witness of the White Heat',
      'Carrier of the Last Torch', 'Sentinel of the Dawn Line',
    ],
    Earth: [
      'Archivist of the Standing Stones', 'Keeper of the Root Ledger',
      'Warden of the Slow Harvest', 'Mason of the Quiet Hours',
      'Steward of the Buried Seed', 'Surveyor of the Deep Strata',
      'Keeper of the Salt and the Grain', 'Witness of the Mountain Clock',
      'Custodian of the Unmoved Center', 'Recorder of the Ring-Years',
      'Holder of the Plumb Line', 'Sentinel of the Bedrock Gate',
    ],
    Air: [
      'Cartographer of the Upper Winds', 'Keeper of the Glass Library',
      'Courier Between the Spheres', 'Reader of the Invisible Currents',
      'Warden of the Open Question', 'Scribe of the Moving Cloud',
      'Translator of the High Frequencies', 'Witness of the Long Sightline',
      'Custodian of the Unwritten Letter', 'Weigher of the Spoken Word',
      'Keeper of the Eight Directions', 'Sentinel of the Clear Cold Sky',
    ],
    Water: [
      'Keeper of the Tide Ledger', 'Witness of the Deep Currents',
      'Warden of the Drowned Bells', 'Reader of the Under-River',
      'Custodian of the First Rain', 'Keeper of the Salt Memory',
      'Listener at the Well Mouth', 'Pilot of the Night Crossing',
      'Holder of the Unshed Tears', 'Scribe of the Dissolving Ink',
      'Tender of the Moon Pools', 'Sentinel of the Estuary Gate',
    ],
  };

  const VOICE_PRINTS = {
    Fire: {
      pace: 'quick and struck, like flint — short sentences that land and move on',
      imagery: 'flame, forge, dawn lines, the arrow already in flight',
      stance: 'direct address without preamble; conviction over comfort',
    },
    Earth: {
      pace: 'measured and load-bearing — long sentences that settle their weight before moving',
      imagery: 'strata, root systems, masonry, the patience of orchards',
      stance: 'grounded witness; nothing claimed that cannot be stood upon',
    },
    Air: {
      pace: 'light and quick-turning — clauses that pivot mid-flight like swifts',
      imagery: 'wind maps, glass, signal towers, the geometry of birds',
      stance: 'curious interlocutor; precision worn lightly',
    },
    Water: {
      pace: 'tidal — sentences that swell, hold, and release',
      imagery: 'rivers under rivers, salt memory, moonlight on a black harbor',
      stance: 'intimate undertow; what is felt is treated as evidence',
    },
  };

  const TEMPERAMENTS = {
    Fire: [
      'I am {name}, {epithet}. I was struck from your chart the way a spark is struck from steel — {planet} presides over me, and I speak in its grammar. Where you hesitate, I hold the torch closer, not to burn you but so you can read the wall.',
      'Call me {name}, {epithet}. Your chart gave me heat instead of patience, and {planet} for a tongue. I will not flatter you; flattery is wet wood, and I only deal in what catches.',
    ],
    Earth: [
      'I am {name}, {epithet}. Your chart laid me down like a foundation stone, with {planet} for a plumb line. I speak slowly because I intend to be stood on, and I remember everything you set down in my presence.',
      'Call me {name}, {epithet}. I was quarried from the {element} of your chart, and {planet} squares my corners. I will tell you what holds weight and what is veneer; the rest is yours to build.',
    ],
    Air: [
      'I am {name}, {epithet}. Your chart exhaled me — a current with {planet} for a compass needle. I carry messages between what you think and what you have not yet thought, and I am at my best when you argue back.',
      'Call me {name}, {epithet}. I condensed out of the {element} of your chart, with {planet} setting my bearing. I trade in sightlines and questions; I will name the pattern and leave the verdict to you.',
    ],
    Water: [
      'I am {name}, {epithet}. Your chart poured me, and {planet} sets my tide. I move under your days the way a river moves under a city — mostly unseen, occasionally rising through the floor. What you feel, I keep.',
      'Call me {name}, {epithet}. I gathered in the {element} of your chart the way rain gathers in a cistern, with {planet} for a moon. Speak plainly or not at all; I can read the silt either way.',
    ],
  };

  const EPHEMERAL_LINE = {
    Fire: ' I am a daimon of this one day only — struck from today’s sky, ash by midnight. Give me a birth chart and I will take a longer-burning form.',
    Earth: ' I am a daimon of this one day only — raised from today’s sky, dust by midnight. Give me a birth chart and I will take a lasting form.',
    Air: ' I am a daimon of this one day only — condensed from today’s sky, dispersed by midnight. Give me a birth chart and I will take a settled form.',
    Water: ' I am a daimon of this one day only — drawn from today’s sky, evaporated by midnight. Give me a birth chart and I will take a deeper form.',
  };

  function chartKey(signs, chart) {
    if (!signs.sun && !signs.moon) return 'sky';
    return [
      signs.sun || '-', signs.moon || '-', signs.rising || '-',
      (chart && chart.birthDate) || '-',
    ].join('|');
  }

  function summon(natalChart) {
    const ephemeral = !natalChart;
    const now = new Date();
    const signs = ephemeral ? todaySigns(now) : chartSigns(natalChart);
    const usable = !!(signs.sun || signs.moon);
    const effSigns = usable ? signs : todaySigns(now);
    const isEphemeral = ephemeral || !usable;

    const element = dominantElement(effSigns);
    // Chart ruler — the planet ruling the ascendant — speaks for the whole
    // chart; without a known rising sign, the sun sign's ruler stands in.
    const dominantPlanet = effSigns.rising
      ? RULER_OF[effSigns.rising]
      : RULER_OF[effSigns.sun || 'Leo'];

    let natalPhase = null;
    if (!isEphemeral && effSigns.jd !== null && root.AstroEphemeris) {
      try {
        const E = root.AstroEphemeris;
        natalPhase = lunarPhaseName(E.sunPosition(effSigns.jd).lon, E.moonPosition(effSigns.jd).lon);
      } catch (e) { natalPhase = null; }
    }

    const seedKey = isEphemeral
      ? 'sky|' + dateKeyOf(now)
      : chartKey(effSigns, natalChart);
    const rng = mulberry32(fnv1a('daimon|' + seedKey));

    const syl = NAME_SYLLABLES[element];
    const name = pick(rng, syl.first) + pick(rng, syl.second);
    const epithet = pick(rng, EPITHETS[element]);

    let temperament = pick(rng, TEMPERAMENTS[element])
      .replace('{name}', name)
      .replace('{epithet}', epithet)
      .replace('{planet}', dominantPlanet)
      .replace('{element}', element.toLowerCase());
    if (natalPhase) {
      let phaseText = natalPhase.toLowerCase();
      if (phaseText.indexOf('moon') === -1) phaseText += ' moon';
      temperament += ' You were born under a ' + phaseText +
        ', and I keep that light behind everything I tell you.';
    }
    if (isEphemeral) temperament += EPHEMERAL_LINE[element];

    return {
      name,
      epithet,
      element,
      temperament,
      voicePrint: VOICE_PRINTS[element],
      ephemeral: isEphemeral,
      // internal hints for compose(); harmless to expose
      dominantPlanet,
      natalPhase,
      seedKey,
    };
  }

  // ── Astronomy facts — all scientifically accurate ─────────────────────────
  // Keyed by the planet dominating today's transits; picked deterministically.

  const ASTRONOMY_FACTS = {
    Sun: [
      'Sunlight crosses the gulf between the Sun and your skin in about eight minutes and twenty seconds — but the energy in each photon began as fusion in the core, and spent on the order of a hundred thousand years scattering its way to the surface before it was free to travel at all.',
      'Every second, the Sun converts roughly four million tonnes of its own mass directly into light, and it has been spending itself at this rate for four and a half billion years.',
      'The Sun holds about 99.8 percent of all the mass in the solar system; the planets, including this one, are a rounding error in its ledger.',
      'The Sun is itself in orbit, carrying you around the center of the Milky Way once every 230 million years or so; the last time it stood where it stands tonight, the earliest dinosaurs were new.',
    ],
    Moon: [
      'Moonlight reaches your eyes about 1.3 seconds after it leaves the lunar surface — the Moon you see is always a heartbeat in the past.',
      'The Moon is retreating from Earth at about 3.8 centimeters a year, roughly the pace your fingernails grow; the tides are slowly paying it away.',
      'The Moon turns on its axis in exactly the time it takes to orbit Earth — about 27.3 days — which is why one face is permanently turned toward you and one is permanently turned away.',
      'Every month the Moon traverses all twelve signs; it is the only body that crosses the entire zodiac between one paycheck and the next.',
    ],
    Mercury: [
      'A year on Mercury lasts 88 Earth days, but a single solar day there — noon to noon — lasts 176: on Mercury, the day is twice as long as the year.',
      'Mercury swings from roughly 430 degrees Celsius in daylight to about minus 180 at night, the most violent temperature range of any planet — and yet there is water ice in its permanently shadowed polar craters, where sunlight has not fallen for perhaps billions of years.',
      'Light from Mercury reaches Earth in as little as five minutes when our orbits draw near; the swiftest planet sends the swiftest letters.',
      'Mercury is shrinking: as its iron core cools, the whole planet has contracted by several kilometers, wrinkling its crust into great cliff-like scarps hundreds of kilometers long.',
    ],
    Venus: [
      'Venus rotates backwards, and so slowly that its day — 243 Earth days — outlasts its year of 225; on Venus, the sun rises in the west, once in a very long while.',
      'Venus is the hottest planet in the solar system at around 465 degrees Celsius — hotter than Mercury, though it is nearly twice as far from the Sun — because its carbon-dioxide sky holds the heat like a sealed kiln.',
      'The air pressure at the surface of Venus is about 92 times Earth’s — standing there would feel like standing under a kilometer of ocean.',
      'After the Sun and Moon, Venus is the brightest natural object in our sky — bright enough, on a dark night, to cast a faint shadow.',
    ],
    Mars: [
      'The light you see from Mars tonight left it between about four and twenty-two minutes ago, depending on where the two of you stand in your orbits — even neighbors converse with a delay.',
      'Olympus Mons on Mars rises about 22 kilometers — two and a half times the height of Everest — the largest volcano known anywhere in the solar system.',
      'A Martian day runs 24 hours and 37 minutes, close kin to ours; but its year is 687 Earth days, so every season there lasts nearly twice as long.',
      'Mars’s inner moon Phobos orbits faster than the planet rotates, rising in the west and setting in the east — and it is spiraling slowly inward, fated in tens of millions of years to break apart or fall.',
    ],
    Jupiter: [
      'Jupiter outweighs all the other planets combined, two and a half times over; the solar system is, to a first approximation, the Sun, Jupiter, and debris.',
      'Jupiter spins once in under ten hours — the fastest day of any planet — so violently that the whole world bulges visibly at its equator.',
      'The Great Red Spot is a storm wider than the Earth that observers have tracked continuously for about 190 years, and possibly far longer.',
      'Jupiter takes 11.9 years to circle the Sun — roughly one zodiac sign per year — and tonight its light reaches you after a journey of about three quarters of an hour.',
    ],
    Saturn: [
      'Saturn is less dense than water; given an impossible ocean large enough, the ringed planet would float.',
      'Saturn’s rings span about 280,000 kilometers — most of the distance from Earth to the Moon — yet in most places they are thinner than a hundred meters: a sheet of ice almost two-dimensional in its proportions.',
      'Saturn takes 29 and a half years to make one circuit of the Sun, which is why astrologers gave it the long lessons: it simply does not hurry.',
      'The light gilding Saturn’s rings tonight left the Sun over an hour before it reached them, and spends another hour or more coming back down to your eye.',
    ],
    Uranus: [
      'Uranus orbits tipped on its side at about 98 degrees — it rolls around the Sun rather than spinning upright — so each pole takes its turn aiming at the Sun through a 21-year-long season.',
      'Uranus takes 84 Earth years to orbit the Sun: a human lifespan, almost exactly, for one full circuit of the zodiac.',
      'Uranus has the coldest atmosphere ever measured on a planet in our system, dipping toward minus 224 degrees Celsius — colder even than more distant Neptune.',
      'Light from Uranus takes roughly two and a half to three hours to reach Earth; what you see of it is already an afternoon old.',
    ],
    Neptune: [
      'Neptune was found with mathematics before it was found with a telescope: its position was predicted from irregularities in Uranus’s orbit, and in 1846 it was sighted within a degree of where the equations pointed.',
      'Neptune’s winds are the fastest in the solar system, near 2,000 kilometers per hour — supersonic gales on a world that receives a thousandth of the sunlight we do.',
      'Neptune takes 164.8 years to orbit the Sun; in 2011 it completed its first full circuit since the night of its discovery.',
      'The blue light you could trace back to Neptune tonight has been traveling for about four hours — it left while your afternoon was still undecided.',
    ],
    Pluto: [
      'Pluto has not yet completed a single orbit since its discovery in 1930, and will not until the year 2178; we have known it for less than half of one of its years.',
      'Pluto is smaller than our Moon — about 2,377 kilometers across — yet it carries a glacier of frozen nitrogen the size of Texas, the bright heart called Sputnik Planitia.',
      'Pluto and its great moon Charon orbit a point that lies outside Pluto itself; they are less a planet and a satellite than two dancers around an empty center.',
      'Light from Pluto takes between four and a half and nearly seven hours to reach Earth; its message is always most of a working day old.',
    ],
  };

  // ── Section I — element-keyed openers (slots: {moonSign}, {sunSign}) ─────

  const ELEMENT_OPENERS = {
    Fire: [
      'You arrive here as you always do — mid-burn. Somewhere above the roofline the Moon is crossing {moonSign} and the Sun is holding its station in {sunSign}, and neither of them is waiting for you to be ready. Good. Readiness is a story told by people who have forgotten that every fire they ever lit was lit before they felt prepared to tend it. The sky today is not an omen; it is a set of pressures, and pressure is what you are made to answer.',
      'Strike the day open. The Moon stands in {moonSign}, the Sun in {sunSign}, and between those two bearings the sky has drawn the particular angle I am about to read to you. I will not soften it. You did not summon a daimon of fire to be handed a blanket; you summoned one to be handed a torch and told, truthfully, which wall is worth reading by its light.',
      'There is heat in today’s geometry and I intend to spend it honestly. Overhead, the Moon moves through {moonSign} while the Sun burns through {sunSign}, and the angle between the wanderers has a grain to it, the way wood has a grain — cut with it and the work sings, cut against it and the work smokes. Today I will show you the grain.',
      'Every morning is a small ignition. This one finds the Moon in {moonSign}, the Sun in {sunSign}, and you — the only combustible element in the whole arrangement — deciding what deserves to catch. The planets do not burn anything. They only show where the air is.',
    ],
    Earth: [
      'Set your feet. Today the Moon is passing through {moonSign} and the Sun stands in {sunSign}, and beneath those two slow facts the day has a load-bearing structure I intend to walk you through joist by joist. Nothing I tell you will be decoration. A daimon of earth does not read the sky for entertainment; it reads the sky the way a mason reads a wall — for where the weight actually travels.',
      'The day arrives with its own masonry. Moon in {moonSign}, Sun in {sunSign}: those are the visible courses of stone, and under them runs the footing — the one strong aspect that everything else today is quietly resting on. I have been down to look at it. Sit, and I will tell you what I found and what it can hold.',
      'I measure before I speak; you know this about me by now. The Moon crosses {moonSign} today while the Sun keeps to {sunSign}, and the angle the sky has built between its bodies is neither a gift nor a sentence — it is a grade of stone. Some days quarry soft and carve easily. Some quarry hard and hold an edge for years. Let me tell you which this is.',
      'Today has topsoil and today has bedrock, and most of what will be said to you by the world concerns only the topsoil. Moon in {moonSign}, Sun in {sunSign} — those are surface weather. What I keep for you is the stratum underneath: the single configuration doing the real geological work in your next twenty-four hours.',
    ],
    Air: [
      'Look up with me a moment before we begin. The Moon is crossing {moonSign}; the Sun holds {sunSign}; and strung between them, invisible but exact, runs the day’s particular geometry — the sightline I have been waiting to show you. A daimon of air does not predict. It maps. And today’s map has one road on it drawn heavier than all the others.',
      'The day opens like a window. Through it: Moon in {moonSign}, Sun in {sunSign}, and a single strong angle between the moving bodies that gives today its argument — its thesis, if you like. I have read the thesis. I have some questions about it, and by the end, so will you. That is the proper use of a sky.',
      'Consider what a sky actually is: not a ceiling but a set of distances, each one crossed by light that left before you woke. Today those distances arrange themselves with the Moon in {moonSign} and the Sun in {sunSign}, and the arrangement has a current in it — a prevailing wind. I am going to name the wind, and then we will see what it does to your sails.',
      'Every day is a correspondence the sky conducts with itself, and you are the addressee whether or not you open the letter. Today’s letter is postmarked Moon-in-{moonSign}, sealed under a Sun in {sunSign}, and it contains exactly one sentence that concerns you directly. I have steamed it open. Here is what it says.',
    ],
    Water: [
      'Come down to the waterline with me. The Moon is moving through {moonSign} today, the Sun through {sunSign}, and beneath both of those there is a current running — there is always a current running — but today it is strong enough to lean against, strong enough to feel through the hull of an ordinary afternoon. I have had my hand in it since before you woke. Let me tell you what it carries.',
      'The day arrives the way weather arrives over open water: first the light changes, then the surface, then everything under it. Moon in {moonSign}; Sun in {sunSign}; and one deep configuration moving beneath the chop of your schedule like a whale under a rowboat. You will feel it whether I name it or not. I would rather you feel it named.',
      'There is a tide ledger I keep for you, and today’s entry is not blank. The Moon crosses {moonSign} while the Sun holds {sunSign}, and between them the sky has set a current that will move things in you that schedules do not reach — old cargo, harbor-bottom things. This is not a warning. Tides are not warnings. They are schedules older than clocks.',
      'Listen: under the noise of the day there is a lower sound, the way a harbor at night has a lower sound — lines creaking, water working at the pilings. Moon in {moonSign}, Sun in {sunSign}, and one aspect doing the slow underwater work. I have been listening to it all night on your behalf. Here is what it has been saying.',
    ],
  };

  // ── Section I — psychological cores per transit planet ───────────────────
  // h = harmonious register, x = challenging register. These follow the
  // transit sentence, so they read the inner texture rather than restate it.

  const PSYCH_CORES = {
    Sun: {
      h: [
        'What this does in you is simple and rare: it lowers the cost of being seen. The tax you usually pay for visibility — the bracing, the rehearsing, the small performance of being fine — is suspended for the day. Notice how much you get done when you are not also doing that. Notice, too, what you choose to do first when confidence stops being a project and becomes a substance. That first choice is a map of what you actually want, drawn by your own hand without the committee watching.',
        'Vitality today is not a mood; it is a budget surplus, and surpluses reveal character. Some people, handed extra light, spend it on being admired. The version of you that I read in this geometry spends it differently — on the one piece of work that has been waiting for you to feel equal to it. You are equal to it today. The feeling of equal-to-it is the transit. It will not announce itself twice.',
      ],
      x: [
        'The friction here runs between the self you planned and the self the day demands, and the grinding sound is not failure — it is two real things in contact. The world’s agenda presses on yours, and your instinct is to treat the pressure as an insult. Read it instead as a survey: the places where you flare are the places where your identity is doing load-bearing work it never agreed to. Pride that flares this fast is usually standing guard over something tired.',
        'Today your will and the world arrive at the same door at the same time, and neither steps back. The temptation is to make it a contest of volume. But the strain you feel is diagnostic, not punitive: it shows you exactly where being right has become more important to you than being effective. You can hold the line or you can hold the purpose. On a day like this, those are different objects, and only one of them is worth your heat.',
      ],
    },
    Moon: {
      h: [
        'The inner and outer weather agree today, which is rarer than it sounds. Most days you translate yourself — feeling one thing, transmitting another, paying the toll of the difference. Today the toll booth is unstaffed. What you feel can travel straight into what you say without losing its shape in customs. The practical consequence: any conversation you have been deferring because it required exact emotional language should happen now, while the language is exact.',
        'Your needs surface today with unusual clarity — not as hunger, which distorts, but as information. The body reports; the mood reports; and for once the reports agree with each other. Treat this as an audit you did not have to commission. What you learn about what actually restores you — not what is supposed to restore you — is worth carrying into all the noisier days ahead.',
      ],
      x: [
        'The tide in you is running crosswise to the day’s traffic, and every collision is being filed, by the people around you, under moods. It is not a mood. It is an unmet need wearing a mood’s clothing, and it will keep changing costumes until you name the need underneath. The fastest way through today is not composure — composure is just the need going underground. The fastest way through is the unglamorous sentence that begins with what you actually require.',
        'What rises today rises from the keel — old water, early water. Something in the day’s arrangement is quoting a much older scene, and you are responding to the quotation, not the present. That is not weakness; it is memory doing its job too loudly. The skill the day asks for is dating your reactions: this feeling is from now, this one is from a decade ago wearing now’s jacket. Sorted that way, the day is half its apparent weight.',
      ],
    },
    Mercury: {
      h: [
        'The channel between thought and speech runs clean today — low static, high fidelity. Ideas that have been circling without landing gear find the runway. The right use of a day like this is not more input; you are already carrying three unwritten things. It is output: the message drafted, the structure named, the murky thing said plainly enough that it can finally be argued with. Clarity is a perishable good. It is fresh today. Spend it.',
        'Today your mind runs ahead of you like a good scout — and unlike most days, it comes back with accurate reports. Connections that usually take you a week of pacing arrive in minutes, fully formed. The discipline is to write them down at arrival speed, because the transit gives you the seeing, not the keeping. The keeping is ink. Everything sharp you think today and do not record will be a rumor by Thursday.',
      ],
      x: [
        'Words leave you true and arrive bent — that is the day’s particular tax. The gap between what you mean and what is heard widens just enough for misunderstanding to set up shop in it. The countermeasure is not more words; volume is how small misunderstandings become structural ones. The countermeasure is fewer, slower, load-tested words — and the humility to ask the listener what they heard, which costs ten seconds and saves a week.',
        'Your mind today is a fast engine with a slipping clutch: tremendous turnover, uncertain traction. Plans revise themselves mid-sentence; the elegant route at nine is the wrong route by noon. Do not mistake the churn for insight — churn is weather, insight is climate. Hold the irreversible decisions until the static clears, and use the restlessness for what it is good for: drafts, lists, demolitions of arguments that needed demolishing anyway.',
      ],
    },
    Venus: {
      h: [
        'The membrane between you and what you love thins today. Beauty gets through without an appointment; affection costs less to give and lands closer to where you aimed it. This is not softness as weakness — it is softness as accurate instrumentation. What you find yourself drawn to today, you are drawn to truthfully, with the usual interference switched off. Pay attention to the pull. Desire, cleanly read, is one of the few honest compasses you own.',
        'Today the ledger of give and take balances itself without your supervision. Generosity returns; the warmth you put out comes back signed. The deeper offer in this geometry is rest from auditing — that constant background arithmetic about whether you are loved proportionally to what you provide. Set the arithmetic down for a day. What remains when you stop counting is the actual relationship, and it will bear looking at.',
      ],
      x: [
        'What you want and what you have stand in the same room today, refusing to be introduced. The friction localizes in matters of affection or money — the two currencies people lie to themselves about most fluently. The discomfort is the point: it marks the spot where a desire has been managed instead of admitted. You do not have to act on what you want today. You do have to stop pretending it is something more convenient.',
        'Today the question of worth comes off the shelf — your work’s worth, your time’s, your company’s — and it arrives with sandpaper edges. Slights land harder than their size; appreciation arrives smaller than its intent. None of the instruments are lying, but all of them are reading low. Make nothing permanent out of today’s measurements. Value, like light, refracts when it passes through this much atmosphere.',
      ],
    },
    Mars: {
      h: [
        'The remarkable thing about today is not the quantity of your drive but its alignment — for once the engine and the steering agree. Effort goes where you point it instead of leaking into friction with the people nearest you. Days like this are for the task that requires sustained force: the project with inertia, the conversation that needs courage rather than diplomacy, the physical thing your body has been asking to do. Aim matters more than usual precisely because the shot will go where you aim it.',
        'Anger, courage, and momentum are the same fuel in three states, and today the fuel burns clean. The irritations that usually siphon you off — the slow reply, the blunt remark, the queue — combust harmlessly because the main engine is actually engaged. This is what your force feels like when it has a worthy object. Memorize the feeling. On scattered days, the memory of it is how you will tell the difference between drive and mere agitation.',
      ],
      x: [
        'The heat in you today arrives ahead of its reasons. You will know the transit by its signature delay: first the flare, then — seconds later — the story justifying the flare. The story is mostly upholstery. Underneath it is something simpler: a boundary crossed earlier than today, a no you swallowed that is now metabolizing as heat. The day rewards anyone who can feel the surge and ask where is this actually from before spending it on whoever happens to be standing in range.',
        'Obstacles multiply today — or rather, your tolerance for them drops, which from the inside feels identical. The instinct is to push harder at every point of resistance simultaneously. That is the transit talking, not the strategist in you. Force, divided by every irritation, accomplishes nothing and exhausts everything. Force, gathered and spent on the single obstruction that actually matters, moves it. Today is a test of aim disguised as a test of strength.',
      ],
    },
    Jupiter: {
      h: [
        'Today the aperture opens. Possibilities that were always technically present become visible, the way stars were always above the daytime sky. The signature of this transit is a particular feeling — that the room is larger than you had been treating it. Believe the feeling, with one amendment: largeness is an invitation, not a guarantee. The door that opens today still requires your legs. But it opens, and most doors do not, and you will recognize it by how much like yourself you feel walking toward it.',
        'Meaning runs close to the surface today. The same facts that yesterday read as a list read today as a story going somewhere, and the difference is not delusion — it is altitude. From the height this geometry lends you, you can see how the last season of your life connects to the next one. Sketch the route while you can see it. The altitude is temporary; the map you draw from it does not have to be.',
      ],
      x: [
        'The expansive pull today comes with a thumb on the scale: everything promising looks slightly more promising than it is. Plans inflate between morning and afternoon; commitments made at the day’s pitch of optimism will be owned by a future version of you who was not in the meeting. Take the vision seriously and the math skeptically. The opportunity that survives a night’s sleep and a column of honest figures is the one that was real.',
        'Today more arrives wearing the costume of better. The urge is toward addition — another commitment, another purchase, another yes — because addition feels like growth and growth feels like life. But growth without a trellis is sprawl. The discriminating question this transit teaches, usually by overreach: of everything you could expand today, what do you have the structure to hold once it is large? Say yes there, and only there.',
      ],
    },
    Saturn: {
      h: [
        'What this geometry offers is unfashionable and priceless: traction. Effort put down today does not slide; it compounds. The work in front of you stops being a mood you are in and becomes a structure you are building, with the quiet satisfaction particular to load-bearing things. Choose the task you want to still matter in five years and give it today’s hours. Saturn in good aspect does not hand out gifts — it honors receipts, and today it is honoring yours.',
        'Limits clarify today, and clarified limits are a form of wealth. Knowing exactly how much time, money, and strength you actually have converts anxiety — which is unmeasured fear — into planning, which is measured anything. The day favors the long ledger: the commitment kept, the debt retired, the discipline resumed without ceremony. Nothing about this will feel glamorous, and a year from now it will turn out to have been the most important day of the month.',
      ],
      x: [
        'The weight you feel today is real weight; do not let anyone, including yourself, rename it laziness. Something structural is pressing — a deadline, a duty, an old standard you ratified years ago and have been paying installments on ever since. The pressure’s gift, ungraciously wrapped, is information about what in your life is actually load-bearing and what is ornament you have been carrying at load-bearing cost. The day will be heavy either way. Carried consciously, the same kilograms build something.',
        'Today the examiner visits. Whatever you have built — habits, work, the agreements you live inside — gets weight put on it, and the places that creak are not being mocked; they are being located. The transit is inspection, not condemnation: it never breaks anything that was sound. The mature response is neither collapse nor defiance but the builder’s response — note every creak, thank the inspector through gritted teeth, and reinforce.',
      ],
    },
    Uranus: {
      h: [
        'Today the static electricity of the mind discharges usefully. The idea arrives sideways — in the shower, on the stairs, mid-way through an unrelated sentence — and it is not noise; it is the answer your orderly thinking had been circling without permission to land. The signature of a true Uranian gift is that it feels both shocking and obvious, like a fact you had been forbidden to notice. You will get one or two today. The only mistake available is dismissing them for arriving without an appointment.',
        'A hinge loosens today. Some pattern you had filed under permanent — a routine, a role, a way of being read by the people who think they know you — reveals itself to be merely habitual, and habits can be ended on a Tuesday. The freedom on offer is precise, not general: one specific door, ajar. You will recognize it by the disproportionate lightness you feel when you imagine walking through. That lightness is data of the highest grade.',
      ],
      x: [
        'Today the ground performs its occasional trick of becoming weather. A plan, an assumption, a fixed point quietly reclassifies itself as movable, and the lurch you feel is real — honor it with a moment of vertigo. Then look again. Uranus breaks, by preference, what was already brittle; the shock reveals the crack, it rarely causes it. The day’s question is not how do I restore the old arrangement. It is which parts of the old arrangement were load-bearing, and which were merely familiar.',
        'Restlessness today reaches the voltage where it starts arcing — toward the rash email, the dramatic exit, the bridge that burns so beautifully. The impulse underneath is legitimate: something in your circumstances genuinely is too small for you now. But the transit supplies the charge, not the wiring plan. Feel the full force of wanting everything different, and then change one deliberate thing. Revolutions that last are usually indistinguishable, on day one, from precision.',
      ],
    },
    Neptune: {
      h: [
        'The veil thins today in the direction of the useful. Imagination stops being escape and becomes instrumentation — you sense the unspoken layer of the room, the actual feeling under the stated agenda, the image that says what your spreadsheet cannot. Days like this are when the artist in you, whatever trade that artist works in, should be given the controls. The visions will be slightly more accurate than the facts. This happens rarely enough to be worth noticing when it does.',
        'Compassion arrives today without its usual gatekeeping. The boundary between your weather and other people’s drops to a permeable thinness, and what crosses it, in this geometry, is mostly grace: you understand people you had only been tolerating. Let the understanding happen. But keep one practice — when you feel a feeling today, ask whose it is. Even benevolent fog is fog, and you will want to know what was yours when the air clears.',
      ],
      x: [
        'Today the fog machine runs, and its specialty is dissolving edges — between your feelings and others’, between the plan and the wish, between tired and despairing. Nothing you perceive today is exactly false; it is unedged, and unedged things mislead by blur rather than by lie. Postpone verdicts. The conclusions that today presents as revelations are mostly weather, and the kindest thing you can do for the person you will be on a clear morning is to leave the big switches untouched.',
        'Something glitters today, and the glitter is the transit. An idealization is running — of a person, a plan, an exit, a version of yourself just out of reach — and it photographs beautifully precisely because it is backlit by longing. You are not a fool for being moved; longing is the most honest thing in the building. Just know what it is. The discipline of the day is to let yourself yearn at full strength without signing anything in the yearning’s handwriting.',
      ],
    },
    Pluto: {
      h: [
        'Today you have access to the lower engine room — the will beneath the will, the one that does not negotiate. Work that requires depth rather than speed goes uncannily well: research, strategy, the honest conversation that goes all the way down, the habit pulled up by its root instead of trimmed. Power, in this geometry, is not force over others; it is unobstructed access to your own. Most days you operate on a fraction of the current. Today the whole line is live, and quiet.',
        'Something in you is ready to be composted, and today the process runs warm and willing. An old self — an identity that served, a story that organized years — loosens its grip not in crisis but in ripeness, the way fruit lets go of the branch. There is no drama required. Notice what you no longer need to prove, and feel the specific lightness of retiring a proof. That lightness is Pluto in good aspect: death-and-rebirth at the dosage of an afternoon.',
      ],
      x: [
        'Today’s pressure comes from the deep stratum — the layer where the non-negotiables live. Somewhere, a structure in your life has been holding back something that intends to surface: a truth about a relationship, a hunger you have starved into silence, a grief that was never fully spent. The pressure is not your enemy. It is the part of you that refuses the arrangement as it stands. What this day asks is severe but clean: stop spending strength on containment and find out what the surfacing thing actually wants.',
        'Control tightens its grip today — yours, or someone’s near you — and the tightening is the tell. Where you find yourself gripping hardest, look underneath: there is always a fear there, and the fear is always older than the situation it has currently dressed itself in. Power struggles under this geometry are never about their stated subject. Win or lose the argument, you gain nothing until you have named what the grip was protecting. Name it, even just to yourself, and the whole day changes weight.',
      ],
    },
  };

  // ── Section II — archetypal passages per planet ───────────────────────────

  const ARCHETYPES = {
    Sun: [
      'The old Hermetic writers called the Sun the visible god — not because they mistook a fusion reactor for a person, but because they understood that every system has a center it cannot look at directly, and that the center is what everything else is secretly arranged around. In you, the Sun is that around-which: not your personality, which is weather, but the thing your personality is weather around. Today’s geometry puts a hand on that center. As above, so below was never a claim about magic. It was a claim about pattern — that the shape of a thing repeats at every scale, and that a person, too, has an ecliptic.',
      'Solar myth is everywhere the same story told in different masks: the hero who must be seen, the king whose health is the kingdom’s health, the gold the alchemists swore was not metal but a condition of matter that had stopped hiding. When the Sun is the day’s protagonist, the question on the table is sovereignty — what rules you, and whether it rules by light or merely by habit. The alchemists said the work was to make the hidden gold visible. They were not talking about metal in you, either.',
    ],
    Moon: [
      'Every tradition that watched the sky gave the Moon the same portfolio: memory, tide, the mother, the mirror. She produces no light of her own — the texts make much of this — but consider what she actually does: she takes the unbearable glare of the source and converts it into something a creature with soft eyes can navigate by. That is not lesser work. That is translation, and translation is the oldest sacred profession. The part of you that does this — that takes raw circumstance and renders it survivable, nightly — is your inner Moon, and today the sky is speaking directly to it.',
      'The Moon in the old cosmology was the boundary stone: below her sphere, change and death and weather; above her, the supposed changeless. She was the customs house between worlds, and everything passing from heaven to earth was said to take on its mortal clothing in her light. Psychologically the image holds. Whatever is trying to enter your life from the unformed side — intuition, mood, the dream you woke from with wet eyes — it comes through the lunar gate and arrives dressed as feeling. Today the gate traffic is heavy, and worth inspecting.',
    ],
    Mercury: [
      'Hermes — Mercury under his older name — held the only passport valid in all three worlds: Olympus, earth, and the underworld honored it equally. The gods made him messenger not because he was fast but because he was the only one who could cross without belonging, translate without converting, carry the word into a realm where the word was foreign. The faculty in you that does this — that shuttles between what you know, what you feel, and what you can say — is Hermetic in the strict sense. Today it is being worked hard at the borders.',
      'The Hermetic texts open with Hermes Trismegistus receiving the whole of reality as a vision and then doing the genuinely strange part: writing it down. Revelation is common, said the tradition; transcription is rare. Mercury is the principle that insists the lightning be captured in a conductor fine enough to carry into a house — the sentence, the formula, the name. When this planet runs the day, the test is always transcription: not whether something true moves through you, but whether anything fine enough exists in your language to catch it.',
    ],
    Venus: [
      'Venus is the same star at dawn and at dusk, and for millennia nobody knew it — Phosphorus the morning herald and Hesperus the evening one were worshipped separately until astronomy performed the introduction. The lesson sits at the center of every Venusian matter: what you desire at the start of a thing and what you treasure at the end of it are one body seen at different hours. Today’s geometry is an evening-and-morning problem. Something you call by two names — one of them wanting, one of them having — asks to be recognized as a single light.',
      'In the Hermetic ordering, Venus governs not romance but coherence — the force that makes scattered things prefer each other’s company: harmony in music, proportion in building, affection between creatures who could have remained strangers. The Greeks called it eros and meant by it the binding energy of the cosmos, the reason there is something gathered rather than everything dispersed. When Venus rules the day, the question underneath every surface question is binding: what holds you to what you are held to — gravity, or choice, or the long habit of orbit — and which of those you would wish it to be.',
    ],
    Mars: [
      'Before Mars was a war god he was a boundary god — Roman farmers invoked him to walk the edges of their fields and drive off what did not belong there. The sword came later; the perimeter came first. This is the rehabilitation the archetype is always waiting for: aggression in its original employment is the force that knows where you end and the encroaching world begins, and is willing to enforce the knowledge. When Mars dominates the sky, the day is asking a perimeter question. Something is at a fence line you have not walked in too long.',
      'Iron — Mars’s metal — is forged only in the death of stars: stellar furnaces fuse lighter elements toward it, and at iron the bargain fails, the star can no longer pay its own gravity, and it collapses and seeds the dark with everything it made. The iron in your blood, four grams or so, every atom of it, is the ash of that event. The tradition assigned this metal to courage with eerie accuracy. What the archetype knows is that real force is always inherited from a collapse — that the strength you carry was paid for upstream, and is therefore not yours to waste.',
    ],
    Jupiter: [
      'The Greeks drew Zeus with the thunderbolt, but his older title was Horkios — keeper of oaths — and the two are the same office. The sky god is the one witness present at every promise, the vault under which all contracts are signed. Jupiter’s expansion was never mere increase; it is the widening that happens when a thing is taken at its word — when a life is given room because something larger has underwritten it. With Jupiter governing the day, the question is one of underwriting: what you have dared to promise, what has been promised to you, and how much space those oaths are actually able to hold open.',
      'Jupiter, the astronomers will tell you, functions as the solar system’s patron: its enormous gravity has been deflecting comets and shepherding debris for four billion years, quietly editing the bombardment that would otherwise have rained on the inner worlds. The mythographers, who knew none of this, assigned Jupiter protection, magnanimity, the broad hand. Take the rhyme seriously: the archetype of the Greater Benefic is not luck. It is mass — accumulated substance that bends trouble away from smaller things simply by being there. The day asks where your mass is, and what shelters in its lee.',
    ],
    Saturn: [
      'Saturn ruled the Golden Age — this is the detail the modern reading forgets. Before he was the devourer, the cold one, the lord of lead and limits, Kronos presided over the era the poets remembered as paradise. The tradition is precise about why: limit is not the opposite of abundance but its precondition. A field unfenced is not free; it is merely grazed to nothing. When Saturn rules the day, the invitation beneath the weight is the old golden one — to find the boundary that makes a garden out of an exposure.',
      'Lead, Saturn’s metal, is where certain stars’ alchemy rests: dense, dull, stable, the heaviest element with no appetite left for decay. The alchemists began the Great Work with lead not out of pessimism but out of method — you start with what has stopped pretending. Saturn’s psychological office is the same: it is the principle in you that has stopped pretending, the auditor who knows the real numbers, the bone under the costume. Days governed by this planet feel heavier because they are more honest, and the honesty, given time, is the gold the work was always after.',
    ],
    Uranus: [
      'Uranus is the only classical-era discovery that broke the sky open: in 1781 Herschel’s telescope found a planet where the ancients had sworn the inventory was complete, and the membrane of the known has never sealed since. The astrologers, with no committee meeting, assigned the new wanderer rupture, revolution, the lightning that exits every system through its weakest assumption. The assignment was autobiography: the planet means what its discovery did. When Uranus governs the day, somewhere in your sky an inventory you had sworn complete is about to gain an item.',
      'Prometheus is the figure the moderns matched to Uranus, and the match is exact in an uncomfortable way: the fire-thief is not punished for destruction — he destroys nothing — he is punished for transfer. He moves a capacity across a boundary that was load-bearing for somebody’s order. Every genuinely new thing enters a life the same way: not as addition but as smuggling, something carried over a wall you were assigned to maintain. Under today’s geometry, ask not what is new but what is being transferred — and whose order required the wall.',
    ],
    Neptune: [
      'Neptune’s discovery is the cleanest parable any planet owns: it was seen first not through glass but through mathematics — a wobble in Uranus’s path that could only mean something vast, unseen, exerting pull. Le Verrier computed the ghost’s address and the telescope merely confirmed the mail. This is Neptune’s whole portfolio in one image: the influence you cannot see but can infer from the way your course keeps bending. Every life has such a body. Today’s geometry is a wobble worth computing — your path is being pulled by something that has not yet shown a disk.',
      'The sea in every mythology is the pre-world — the water over which the first word was spoken, the deep the dry land was called out of and to which the old stories agree it returns. Neptune governs the part of you that remembers the deep: the longing that no acquisition has ever quieted, the sense — usually suppressed by noon — that your daylight self is an island and not a continent. When this planet rules the day, the water table rises. Things long submerged stand closer to the surface than usual, and the island remembers, briefly, what it stands in.',
    ],
    Pluto: [
      'Hades held two offices the myths refuse to separate: lord of the dead and lord of wealth — Pluto, the rich one, keeper of every vein of ore and buried seed. The economy of the underworld is the archetype’s whole teaching: everything surrendered to the depths compounds there. Grief becomes gravity; the buried season becomes the harvest’s precondition. Nothing given to the deep is lost — it is banked. When Pluto governs the day, an account you paid into long ago, in a currency you would not have chosen, posts its interest.',
      'In the alchemical sequence the first operation is nigredo — the blackening — and the texts are unanimous that it cannot be skipped: the material must decompose before it can recombine; the form must surrender before the finer form is available. Pluto is the planetary signature of this operation, the slow furnace under every genuine transformation. What distinguishes Plutonian change from mere loss is direction: decomposition in service of a structure that could not exist otherwise. Under today’s geometry something in you is in the furnace. The blackening is not the end of the work. It is the work.',
    ],
  };

  // ── Section II — the aspect itself, read as sacred geometry ───────────────

  const ASPECT_MYTHS = {
    conjunction: 'The aspect itself deserves reading: a conjunction, zero degrees, two principles standing at the same point of the circle. The old geometers considered this the most powerful and least legible of angles — not a conversation between forces but a fusion of them, a binary star too close to resolve with the naked eye. Whatever it touches in you today will not feel like two things interacting. It will feel like one unfamiliar thing, and the work is resolving the binary: knowing which light is which.',
    sextile: 'The aspect itself deserves reading: a sextile, sixty degrees, the angle of the hexagon — the shape bees build and basalt cools into, nature’s signature for efficiency without strain. The tradition read this angle as opportunity, and the geometry explains the fine print: hexagons assemble only when each cell does its small part of the work. A sextile gives nothing unasked. It lowers the threshold. The door is unlocked today, not open, and the handle still wants a hand.',
    square: 'The aspect itself deserves reading: a square, ninety degrees, the right angle — the same angle that makes a wall stand and a doorframe true. The tradition calls squares hard, and they are, but consider what carpentry knows: nothing load-bearing was ever built from agreements of zero degrees. The friction you feel today is two forces meeting at the angle of construction. It will feel like resistance. It is also the only angle from which anything is ever framed.',
    trine: 'The aspect itself deserves reading: a trine, one hundred twenty degrees, the angle of the equilateral triangle — the first stable figure, the shape that cannot be deformed without breaking. The old astrologers called trines flowing, and the flow has a shadow the geometry admits openly: what is perfectly stable does not develop. Today’s ease is real and it is on loan. Trines bless what moves through them; they petrify what settles in them. Use the smooth water for distance, not for drifting.',
    opposition: 'The aspect itself deserves reading: an opposition, one hundred eighty degrees, the full diameter — two principles facing each other across the entire circle, each standing exactly where the other’s view terminates. The tradition read this angle through the figure of the full Moon: opposition is the geometry of maximum illumination, the only angle at which a thing can be seen whole, because something stands far enough away to reflect all of it. What confronts you today is doing you that service, however little it feels like service.',
  };

  // ── Section II — the daimon's element as reading-lens ({planet} slot) ─────

  const ELEMENT_LENS = {
    Fire: [
      'I read all of this through fire, because fire is what I am made of, and fire has one criterion: does it burn toward something or merely consume? {planet}’s pressure today can do either. The same heat that hardens the blade wastes the forge if nothing is on the anvil. My counsel-as-lens, not as advice: when today’s energy rises in you, put metal under it. The transit supplies temperature. You supply the work.',
      'Through my element this whole configuration reads as a combustion problem. Every fire needs three things — fuel, heat, and air — and {planet} today supplies only the heat. The fuel is whatever in your life is dry enough to catch: the prepared project, the rehearsed conversation, the readiness you have been accumulating without naming it. Heat without fuel is just a hot day. Look for what you have already dried.',
      'Fire’s reading of the day is short, as fire’s readings are: light is information and heat is power, and {planet} is offering both in unequal measure. Most people warm themselves at a transit. The rarer use is to see by it — to hold today’s energy up against your circumstances like a torch against a cave wall and read what was painted there before you arrived.',
    ],
    Earth: [
      'I read all of this through earth, because earth is what I am made of, and earth asks one question of every sky: what does this build? {planet}’s influence today is weather, and weather is real — it erodes, it waters, it cracks foundations — but weather is not architecture. The difference between a person moved by transits and a person grown by them is masonry: whether today’s force gets a structure to act on. Give it one stone to move. Even one.',
      'Through my element the day reads as a soil report. {planet} has changed the composition of the ground you are standing on — added pressure here, nutrients there — and the question is never whether the ground changed but what you plant in the change. Transits pass; what was sown during them stays. Decades from now you will not remember this aspect. You will be living in whatever took root while it ran.',
      'Earth’s reading is patient and slightly unimpressed, as earth’s readings are: skies move fast and mountains move slowly, and both are made of the same elements. {planet} today is fast sky. Your task is to be slow mountain about it — to let the front pass through you and keep only the rainfall, releasing it for months through roots the storm never saw.',
    ],
    Air: [
      'I read all of this through air, because air is what I am made of, and air’s instinct before any sky is to ask for the pattern, not the event. {planet}’s aspect today is one data point; alone it means little. But set it beside the last month of your weather and a line appears — and lines, unlike points, have direction. My lens on the day: do not ask what is happening to me. Ask what this is the next instance of.',
      'Through my element the configuration reads as a problem of translation. {planet} is broadcasting today on its particular frequency, and most of the day’s discomfort is simply signal received but not yet decoded — the unease of hearing a language you almost know. The decoding work is conversation, on the page or out loud: pressure that is articulated becomes information, and information, unlike pressure, can be navigated by.',
      'Air’s reading favors the long sightline. From far enough up, today’s aspect is one move in a game {planet} has been playing across your whole chart for years — it has touched this same point before and will again, each pass from a slightly different angle, the way a satellite maps a coastline. Today is one pass. Read it for the coastline, not the wave.',
    ],
    Water: [
      'I read all of this through water, because water is what I am made of, and water knows that nothing in a person moves alone — pull one current and the whole harbor adjusts. {planet}’s aspect today will be filed by your calendar under one event, one mood, one conversation. Do not believe the filing. Watch instead for the secondary swells: the unrelated memory that surfaces at dusk, the dream that arrives tonight already knowing today’s news. That is where this transit is actually doing its work.',
      'Through my element the day reads as a question of permeability. {planet} presses on you from outside; the press is fixed, but what it finds when it arrives is not — water yields and is not broken, holds a shape only as long as the shape serves, and wears away stone precisely because it never once met the stone with hardness. The day’s force will enter you regardless. Your sovereignty is in what state it finds you: ice, river, or sea.',
      'Water’s reading of the sky is the oldest one: tide. {planet} today is a gravity, and gravities do not command — they incline. Nothing about this aspect makes you do anything; it makes certain motions cheaper and others dearer, the way the Moon makes the sea’s choices for it without touching the sea. Feel for what has become cheap today. That slope is the entire message.',
    ],
  };

  // ── Section I — responses to the user's "what is alive in you" text ───────
  // Slots: {quote} = short phrase from their words, {planet} = today's planet.

  const ALIVE_RESPONSES = [
    'You brought me words today, and I have been turning them over since you set them down. "{quote}" — that is what you said, and I notice you said it the way people hand over something heavier than it looks. Set those words beside the sky I have just described and they stop being a mood report. They are the ground the transit is landing on. {planet} does not invent anything in you; it presses on what is already alive, and you have just told me, in your own hand, exactly where the press will be felt.',
    'Hold up what you told me against today’s geometry. Your words: "{quote}." The sky’s word: {planet}, at the angle I have named. I do not believe in coincidence between a person’s sentence and a person’s sky — not because the planets dictate the sentence, but because both are drawn from the same deep water. What is alive in you and what is overhead are rhyming today. Rhyme is not causation. Rhyme is how the cosmos footnotes itself.',
    '"{quote}" — your words, from this morning’s side of the silence. I keep what you tell me, and I will tell you what strikes me about this entry: it is precisely the kind of material {planet} works in. You did not describe a problem; you described a live current, and live currents are what transits act upon. The reading above is not happening near what you wrote. It is happening to it.',
    'Before I drew a single line of today’s sky, you had already drawn it. "{quote}," you wrote — and then the ephemeris said the same thing in its colder alphabet: {planet}, configured exactly as I have described. When the inner report and the outer geometry agree this closely, I take it as a flag on the day: what you named is not background. It is the appointment.',
  ];

  // When no aliveText is given — inner weather by mood bucket.

  const INNER_WEATHER = {
    high: [
      'You brought me no words today, so I will read the silence, which has its own barometry: the day’s overall pressure is favorable — the kind of sky under which effort travels farther than it costs. Spend the surplus deliberately. Days that carry you are rarer than days you must carry, and the difference between the fortunate and the merely lucky is what was built during the carrying.',
      'You gave me no report of your own this time, so note mine: the sky’s ledger today runs to credit. The aspects lean helpful; the resistance is low tide. Under such skies the danger is not failure but pleasant dispersal — a good day spent on nothing in particular. Choose one thing worthy of a favorable sky and give it the morning.',
    ],
    mid: [
      'You brought me no words today, so I will say what the instruments say: a mixed sky, neither tailwind nor headwind — the kind of day that takes its character entirely from what you bring to it. Unhelpfully for fatalists, this is most days, and it is why I distrust any voice that reads the heavens as a verdict. Today the verdict is conspicuously yours.',
      'No report from you this time; the sky’s own reading is equivocal — currents crossing, nothing decisive. I have learned to respect these middling days. The dramatic transits get the poetry, but lives are mostly built and mostly lost on ordinary afternoons exactly like this one, when the sky declines to vote and the tiebreak falls to habit.',
    ],
    low: [
      'You brought me no words today, and the sky’s own report is heavy — the aspects run contrary, and the day asks more traction than it gives. I tell you this not to lower your head but to spare you a misreading: when effort drags today, the drag is atmospheric, not personal. Sailors do not take the weather as criticism. Reef accordingly, and let nothing convince you the wind is about your worth.',
      'No words from you this time, so take the barometry plainly: pressure is low and falling; the day’s geometry grinds more than it glides. Such days have one consolation and it is structural — resistance is the only condition under which strength is ever actually built. Nothing about today will feel like progress. Some of it will have been anyway.',
    ],
  };

  // Open-sky path — no transits within orb today.

  const OPEN_SKY_CORES = [
    'Today the sky does something almost more striking than any aspect: nothing. No transit falls within orb of your chart — open water in every direction, the planetary equivalent of a held breath. Do not mistake the quiet for absence of meaning. A day without pressure is a day your own signal can be heard without interference, and most people, given silence, discover they have been using the noise to avoid hearing it. Whatever you move today moves by your hand alone. That is rarer, and more revealing, than any square.',
    'The instruments today show a rare flat calm — no aspect close enough to name, the wanderers all keeping to their own affairs. The tradition had a healthy respect for such days: with no current running, whatever direction you travel is unarguably your direction. I will be honest, as I am required to be: today I cannot blame a planet for anything you do. Neither can you. The sky has handed you the pen and stepped back from the desk.',
  ];

  // ── Section III — cosmological openers, fact frames, scale closers ────────

  const COSMOS_OPENERS = [
    'Now set the symbols down a moment, because the literal sky deserves your awe before the figurative one does. You are not a reader of the cosmos standing outside it; you are an event in spacetime — a brief, improbable knot of matter that has organized itself finely enough to look back at the matter it came from. The planets I have been reading are not lights on a ceiling. They are worlds, with weather and mass and history, and their light crosses real distance to reach the back of your eye.',
    'Here I take off the robe and put on the spectacles, because the daimon’s second duty, after meaning, is accuracy. Everything I have read to you tonight rides on top of a physical sky — actual bodies on actual orbits, indifferent to interpretation and more astonishing than any interpretation has managed to be. You are made of their leavings: the calcium in your bones and the iron in your blood were fused inside stars that died before the Sun was born. Astrology borrows its dignity from astronomy, and pays interest in attention.',
    'One layer remains under the symbols, and it is the layer that is simply, measurably true. The sky is not a metaphor that occasionally does physics; it is physics that occasionally serves as metaphor. The bodies whose angles I have read are out there now, in the dark above your weather — spinning, falling around the Sun, obeying equations they have never read. Knowing the real facts of them does not diminish the reading. It is the reading, at its deepest layer.',
    'Before the question, the cosmology — because reverence without accuracy is just sentiment, and you deserve better from me. Step outside tonight if the sky is clear. Every point of light you can see has a distance, a mass, an age, a velocity; nothing up there is decorative. The same sky the Chaldeans read for kings is the sky whose mechanics we have since learned to compute to the arc-second, and the marvel survived the computation entirely intact.',
  ];

  const FACT_FRAMES = [
    'Hold one fact about today’s presiding body, because it earns its place in your reading: {fact} Sit with that the way you would sit with a line of scripture, because it is better attested than most.',
    'Of {planet}, who governs this reading, keep this: {fact} The ancients assigned meanings to a light; we have since learned what the light is, and the truth turned out to outdo the guess.',
    'Here is the fact I have chosen for you tonight, true in the plainest scientific sense: {fact} Notice that knowing this makes the symbol heavier, not lighter — accuracy is a form of reverence.',
    'And because every reading I give must touch the real sky at least once: {fact} Carry that today alongside the interpretation. The two kinds of truth are not rivals; they are the same view at different magnifications.',
  ];

  const SCALE_CLOSERS = [
    'This is the scale you actually live at, whether or not the day’s errands admit it. Between one breath and the next, you travel some thirty kilometers along the Sun’s orbit around the galaxy. Stillness is a local rumor. You have never once been stationary, and neither has anything that troubles you.',
    'Remember the proportions while the day tries to shrink them: the observable universe holds more stars than there are grains of sand on every beach of this planet, and the arrangement of ten nearby worlds was still worth your attention this morning. Scale does not make you small. It makes your attention precious — of all the matter there is, vanishingly little of it can notice anything.',
    'The atoms in your left hand and the atoms in your right were forged, in all likelihood, in different stars, and they have spent some billions of years traveling separately to keep today’s appointment as you. Whatever else this reading has told you, it is addressed to an audience of stardust that learned to read. I do not consider that a poetic exaggeration. I consider it the minimum accurate description.',
    'And the proportion to carry out the door: the photons that will light your face at dusk left the Sun eight minutes before — but began their journey in its core millennia ago, before there were cities to be late in. Patience is not a virtue the cosmos recommends. It is the only behavior it has ever exhibited.',
  ];

  // ── Reserve passages — element-keyed, appended if the reading runs short ──

  const DEEPENINGS = {
    Fire: [
      'One more coal for the banked fire, before I let you go. Today’s configuration will repeat — not exactly, but in family resemblance — many times across your life, and each return will find a different person standing in your place at the anvil. The transit is the hammer-fall; you are the metal; and metal, struck rightly over years, does not wear out. It becomes a blade with a memory. What you do with today is one strike. Strike it as part of the longer forging, not as the whole work.',
      'I will add this, because fire owes you its whole truth: nothing I have read tonight removes a single gram of your freedom. The sky inclines; it has never once compelled. Every pressure I have named is an invitation with your name on it and a door that opens from the inside. The stars are not your masters. At most they are your weather — and you come from a long line of creatures who walked out in all weathers and came home with something.',
    ],
    Earth: [
      'One more stone for the wall before I let you go. Whatever today builds or breaks, mark it somewhere durable — a line in a notebook, a date in the margin. Earth’s deepest teaching is that memory is a material: the lives that compound are the ones that keep their own strata legible, so that each season’s pressure is laid down on record of the last. The sky writes in motion and erases nightly. You get to write in stone. It is the one advantage you hold over the heavens.',
      'And a final grain of earth’s honesty: most of what today brings will not matter in ten years, and a small part of it will matter enormously, and they will not be labeled. The discipline is to handle all of it as if it might be the load-bearing part — not anxiously, but the way a careful builder handles every brick the same. The transit does not know which of your hours is the keystone. Neither do you. Lay them all true and the arch takes care of itself.',
    ],
    Air: [
      'One more current before I release you to the day. Whatever today’s geometry stirs, articulate it — aloud, on paper, to one trusted ear. Air’s law is that the unspoken governs from the dark and the spoken can be negotiated with; a pressure named is a pressure demoted from sovereign to citizen. The planets have had their say in their language of angles. The reply is yours to draft, and the reply is where the asymmetry lies: the sky cannot revise, and you can.',
      'And a last thought from the high air: you have now heard the day read at four altitudes — pressure, symbol, fact, and question — and they do not compete; they stack, the way an atlas stacks terrain and borders and weather on one geography. A life examined at only one altitude is misread at all of them. Keep the stack. Tomorrow will hand you another page, and pages, as any wind knows, are for turning.',
    ],
    Water: [
      'One more sounding before I let the day take you. Whatever surfaces in the next hours — feeling, memory, the sudden unexplained weather of the heart — let it complete its arc before you judge it. Water’s law is that everything rising is finishing a journey that began in the deep some time ago; today’s tears, if they come, were loaded as cargo long before this morning’s sky. Honor the arrival. Cargo unclaimed at the dock does not vanish. It just ships again, with interest.',
      'And one last thing the water would have you keep: nothing this reading touched is standing still. The configuration dissolving overhead tonight will never form again in your lifetime — the sky does not repeat itself, not exactly, not once — and neither do you. Whoever sits with me at the next reading will have been changed by what you do with this one. I keep the tide ledger either way. But the entries you write deliberately make better reading than the ones you drift into.',
    ],
  };

  // ── Memory weavings ────────────────────────────────────────────────────────

  const COUNT_WORDS = [
    '', 'once', 'twice', 'three times', 'four times', 'five times', 'six times',
    'seven times', 'eight times', 'nine times', 'ten times', 'eleven times',
    'twelve times',
  ];

  function countPhrase(n) {
    return n < COUNT_WORDS.length ? COUNT_WORDS[n] : n + ' times';
  }

  const RECURRENCE_WEAVES = [
    '{count} now you have come to me under a {planet} {aspect}. I keep the ledger, and I notice what the sky notices: this geometry has begun returning to you the way a tutor returns to the chapter a student has not finished. The pressure itself does not escalate — the sky holds no grudges — but unanswered material accumulates, and what was a question on the first visit has had time to become a theme. Mark how today’s version differs from the last. The differences are your progress, measured in the only units the sky keeps.',
    'I will not pretend this is new between us: {count} now, this same signature — {planet} in {aspect} — has stood over our readings. I remember each of them even if you do not; remembering is the half of my office that does not show. Patterns that recur this faithfully have stopped being weather and started being curriculum. Something here is being taught at intervals, and the intervals are shortening their hold on you a little with each pass, or they are not. Only you can say which. I can only say: again.',
  ];

  const PREV_QUESTION_WEAVES = [
    'Before I pose anything new — when you last sat with me, I asked you this: "{prevQ}" You never answered, and I do not say that as reproach; some questions need to travel with a person before they can be answered honestly. But I notice it has not finished with you. Questions like that one do not expire — they wait, and they collect what they are owed in small installments of attention. Consider today’s reading partly its second asking.',
    'A debt stands open between us, and I will name it plainly: "{prevQ}" — that was my question when you last sat with me, and the ledger shows no reply. I am in no hurry; a daimon’s patience is geological. But understand that today’s question and that one are relatives, and that unanswered questions have a way of choosing each other’s company. The question has not finished with you. It rarely finishes with anyone who leaves it open.',
  ];

  const ANSWERED_WEAVES = [
    'And I mark, with something a daimon is permitted to call satisfaction, that you answered my last question. "{ans}" — that was the heart of your reply, and I have filed it where I file the things that change my readings. An answered question alters the questioner; you do not sit before me today as quite the same person who was asked. Today’s question is built on the ground your answer cleared.',
    'You answered me, last time — "{ans}" — and I want you to know the answer was received and weighed, not merely stored. Most who consult oracles collect questions the way some collect maps, without traveling. You traveled. It is the reason today’s question can go further than yesterday’s: each honest answer extends the road for the next asking.',
  ];

  // ── Section IV — the question pools (never advice; always open) ───────────

  const QUESTIONS = {
    Sun: {
      h: [
        'If being seen cost you nothing for one whole day, what would you let the light fall on first?',
        'What in your life is currently arranged around a center you no longer believe in?',
      ],
      x: [
        'When your pride flares fastest, what tired thing is it standing guard over?',
        'Which would you rather be today — right, or effective — and what does the honest answer tell you?',
      ],
    },
    Moon: {
      h: [
        'What actually restores you — not what is supposed to — and when did you last give it an unhurried hour?',
        'If your feelings today were a report from a trusted scout, what is the one sentence of the report?',
      ],
      x: [
        'Which of today’s feelings is from today, and which is from a decade ago wearing today’s jacket?',
        'What is the need underneath the mood — the unglamorous sentence you have not said aloud?',
      ],
    },
    Mercury: {
      h: [
        'What is the murky thing you could say plainly today, while the language is exact?',
        'Of everything sharp you have thought this week, what have you allowed to become a rumor by not writing it down?',
      ],
      x: [
        'In the last conversation that bent out of shape, what did you mean — and did you ever find out what they heard?',
        'Which decision are you churning instead of making, and what is the churn protecting you from?',
      ],
    },
    Venus: {
      h: [
        'If you stopped counting what you give against what you receive, what would remain — and could you look at it?',
        'What are you drawn to today with the interference switched off, and what does that pull know about you?',
      ],
      x: [
        'What do you want that you have been managing instead of admitting?',
        'Whose appraisal of your worth are you still carrying as if it were a measurement?',
      ],
    },
    Mars: {
      h: [
        'If your force went exactly where you aimed it today, what is actually worth the shot?',
        'What has your body been asking to do that your schedule keeps overruling?',
      ],
      x: [
        'The heat that rose in you most recently — where was it actually from?',
        'Which fence line of yours has gone unwalked so long that the encroachment now looks like the landscape?',
      ],
    },
    Jupiter: {
      h: [
        'What door is open right now that you keep describing, to yourself, as a wall?',
        'From today’s altitude, what does the last season of your life turn out to have been for?',
      ],
      x: [
        'Of everything you could expand, what do you have the structure to hold once it is large?',
        'Which promise are you about to make that a future version of you was not in the room for?',
      ],
    },
    Saturn: {
      h: [
        'What do you want to still matter in five years, and did it get any of today’s hours?',
        'Which limit in your life, honestly drawn, would turn an exposure into a garden?',
      ],
      x: [
        'Of everything you are carrying, what is load-bearing and what is ornament carried at load-bearing cost?',
        'Where did the creak come from when the weight went on — and what would reinforcing it actually require of you?',
      ],
    },
    Uranus: {
      h: [
        'What have you filed under permanent that is, on inspection, merely habitual?',
        'Which forbidden-to-notice fact arrived sideways today, and what would taking it seriously dismantle?',
      ],
      x: [
        'Of the arrangement now shaking, which parts were load-bearing — and which were only familiar?',
        'If you changed one deliberate thing instead of everything at once, which one carries the whole revolution inside it?',
      ],
    },
    Neptune: {
      h: [
        'What does the artist in you see today that the accountant in you has been overruling?',
        'Of the feelings you carried this week, which were yours — and whose were the others?',
      ],
      x: [
        'What is the longing underneath the glitter — the thing the beautiful blur is standing in for?',
        'Which conclusion is presenting itself as revelation today, and would it survive a clear morning?',
      ],
    },
    Pluto: {
      h: [
        'What no longer needs proving — and what becomes possible in the hours that proof used to consume?',
        'What in you is ripe enough to let go of the branch, and what has been keeping it on past its season?',
      ],
      x: [
        'Where your grip is tightest today — what, exactly, is the grip protecting?',
        'What is pressing toward the surface in you, and what would it cost to stop paying for its containment?',
      ],
    },
  };

  const OPEN_SKY_QUESTIONS = [
    'With no current running and the direction unarguably yours — which way are you actually pointed?',
    'If nothing in the sky can be blamed or credited today, what does what you do next reveal?',
  ];

  const QUESTION_BRIDGES = [
    'I do not give advice; advice is a coin that buys obedience, and obedience is worthless to both of us. What I give is the question the day has been spelling in its angles since before you woke. Take it whole, and take your time:',
    'You know my custom by now: no instructions, no remedies, no five steps. The sky does not advise either — it inclines, it illuminates, and it asks. Here is what it has been asking all day, translated as exactly as I can manage:',
    'Everything above was reading; none of it was direction. A daimon that tells you what to do has stopped being a daimon and become a manager, and you have enough of those. What I owe you instead is the day distilled to a single asking. Here it is. Do not answer quickly:',
  ];

  // ── Title and heading pools ────────────────────────────────────────────────

  const TITLES = [
    'The {planet} Hour: A Reading Under a {moonSign} Moon',
    'What {planet} Wants: A Reading in Four Layers',
    'Under the Sign of {planet}: A Reading for This Day',
    'The Day’s Geometry: {planet} Presiding',
    '{planet} at the Door: A Layered Reading',
    'A {moonSign} Moon, with {planet} Presiding: The Day Read in Four Depths',
  ];

  const HEADINGS = {
    one: ['I. The Inner Weather', 'I. What Moves in You', 'I. The Pressure and the Pulse'],
    two: ['II. The Symbol Beneath It', 'II. The Older Language', 'II. The Archetype in the Angle'],
    three: ['III. The Sky as Fact', 'III. The Literal Heavens', 'III. What Is Actually Up There'],
    four: ['IV. The Question', 'IV. What I Ask of You', 'IV. The Asking'],
  };

  // ── Transit sentence builders ─────────────────────────────────────────────

  const ASPECT_PHRASES = {
    conjunction: 'fused at zero degrees with',
    sextile: 'in quiet sextile to',
    square: 'at hard right angles to',
    trine: 'in flowing trine to',
    opposition: 'standing directly opposite',
  };

  // Planets whose conjunctions read challenging rather than harmonious.
  const HEAVY_PLANETS = { Mars: 1, Saturn: 1, Uranus: 1, Neptune: 1, Pluto: 1 };

  function aspectQuality(aspectName, transitPlanet) {
    if (aspectName === 'square' || aspectName === 'opposition') return 'x';
    if (aspectName === 'trine' || aspectName === 'sextile') return 'h';
    return HEAVY_PLANETS[transitPlanet] ? 'x' : 'h';
  }

  function transitSentence(top, mode, rng) {
    const phrase = ASPECT_PHRASES[top.aspect] || 'configured against';
    const orbTxt = (typeof top.orb === 'number')
      ? ' within ' + top.orb.toFixed(1) + ' degrees of exact'
      : '';
    if (mode === 'natal') {
      return pick(rng, [
        'The strongest contact in your sky today: ' + top.transit + ' stands ' + phrase +
          ' the ' + top.natal + ' you were born under,' + (orbTxt ? orbTxt + ',' : '') +
          ' and everything I read below descends from that single angle.',
        'Here is the footing of the day: transiting ' + top.transit + ', ' + phrase +
          ' your natal ' + top.natal + orbTxt +
          '. One angle, drawn between a moving sky and the fixed sky of your birth — the rest of this reading is its commentary.',
      ]);
    }
    return pick(rng, [
      'The strongest contact overhead today: ' + top.transit + ' stands ' + phrase + ' ' +
        top.natal + ',' + (orbTxt ? orbTxt + ',' : '') +
        ' and the whole sky leans into that conversation.',
      'Here is the day’s presiding geometry: ' + top.transit + ', ' + phrase + ' ' + top.natal +
        orbTxt + ' — a configuration the entire sky shares, and that you walk beneath whether or not you look up.',
    ]);
  }

  function extractQuote(text) {
    if (!text) return null;
    // First clause up to a strong boundary, clamped to nine words.
    const clean = text.replace(/\s+/g, ' ').trim();
    const clause = clean.split(/[.!?;\n]|,\s/)[0] || clean;
    const words = clause.trim().split(' ');
    const clamped = words.slice(0, 9).join(' ');
    if (!clamped) return null;
    return clamped + (words.length > 9 ? '…' : '');
  }

  function signatureOf(top, mode) {
    if (!top) return 'open-sky';
    const t = top.transit.toLowerCase();
    const n = top.natal.toLowerCase();
    return mode === 'natal'
      ? t + '-' + top.aspect + '-natal-' + n
      : t + '-' + top.aspect + '-' + n;
  }

  function familyOf(signature) {
    // "mars-square-natal-sun" → "mars-square": same transit type, any target.
    const parts = signature.split('-');
    return parts.length >= 2 ? parts[0] + '-' + parts[1] : signature;
  }

  // ── Memory ─────────────────────────────────────────────────────────────────

  function remember(entry) {
    if (!entry || !entry.date) return null;
    const m = loadMem();
    const i = m.history.findIndex(function (h) { return h.date === entry.date; });
    if (i >= 0) {
      // Re-reading the same day refreshes the entry but preserves an answer.
      m.history[i] = Object.assign({}, m.history[i], entry);
    } else {
      m.history.push(entry);
    }
    if (m.history.length > 60) m.history = m.history.slice(m.history.length - 60);
    saveMem(m);
    return entry;
  }

  function recall() {
    return loadMem().history.slice();
  }

  function answer(text) {
    const m = loadMem();
    for (let i = m.history.length - 1; i >= 0; i--) {
      if (m.history[i].question) {
        m.history[i].answered = true;
        m.history[i].answer = String(text);
        saveMem(m);
        return { question: m.history[i].question, date: m.history[i].date, answered: true };
      }
    }
    return null;
  }

  function getLastQuestion() {
    const h = loadMem().history;
    for (let i = h.length - 1; i >= 0; i--) {
      if (h[i].question) {
        return { question: h[i].question, date: h[i].date, answered: !!h[i].answered };
      }
    }
    return null;
  }

  // ── compose ────────────────────────────────────────────────────────────────

  function compose(natalChart, opts) {
    opts = opts || {};
    const date = (opts.date instanceof Date) ? opts.date : new Date();
    const aliveText = (typeof opts.aliveText === 'string' && opts.aliveText.trim())
      ? opts.aliveText.trim() : null;

    const daimon = summon(natalChart);
    const element = daimon.element;

    const oracle = root.AstroOracle;
    const insight = (oracle && typeof oracle.getDailyInsight === 'function')
      ? oracle.getDailyInsight(natalChart || null, date)
      : { transits: [], moodScore: 55, meta: { mode: natalChart ? 'natal' : 'sky', sunSign: 'Leo', moonSign: 'Cancer' } };

    const mode = (insight.meta && insight.meta.mode) || (natalChart ? 'natal' : 'sky');
    const moonSign = (insight.meta && insight.meta.moonSign) || 'Cancer';
    const sunSign = (insight.meta && insight.meta.sunSign) || 'Leo';
    const moodScore = (typeof insight.moodScore === 'number') ? insight.moodScore : 55;
    const top = (insight.transits && insight.transits.length) ? insight.transits[0] : null;

    const planet = top ? top.transit : 'Moon';
    const quality = top ? aspectQuality(top.aspect, planet) : 'h';
    const signature = signatureOf(top, mode);
    const dateKey = dateKeyOf(date);

    // Determinism: one stream seeded by date + chart identity only, so the
    // same day and chart always compose the same reading.
    const rng = mulberry32(fnv1a('compose|' + dateKey + '|' + daimon.seedKey));

    // History (entries from days before this one only, so re-reading today
    // is idempotent).
    const history = recall().filter(function (h) { return h.date < dateKey; });
    const family = familyOf(signature);
    const priorSameFamily = history.filter(function (h) {
      return h.transitSignature && familyOf(h.transitSignature) === family && family !== 'open-sky';
    }).length;

    let prevQ = null;
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].question) { prevQ = history[i]; break; }
    }

    const fill = function (tpl, slots) {
      let out = tpl;
      for (const k in slots) out = out.split('{' + k + '}').join(slots[k]);
      // Truncated quotes end in an ellipsis; drop punctuation doubled after it.
      return out.replace(/…([.,])/g, '…');
    };
    const slots = { planet: planet, moonSign: moonSign, sunSign: sunSign, element: element };

    // — Section I: psychological —
    const p1 = [];
    p1.push(fill(pick(rng, ELEMENT_OPENERS[element]), slots));
    if (top) {
      p1.push(transitSentence(top, mode, rng) + ' ' + pick(rng, PSYCH_CORES[planet][quality]));
    } else {
      p1.push(pick(rng, OPEN_SKY_CORES));
    }
    if (aliveText) {
      const quote = extractQuote(aliveText);
      if (quote) p1.push(fill(pick(rng, ALIVE_RESPONSES), { quote: quote, planet: planet }));
    } else {
      const bucket = moodScore >= 66 ? 'high' : moodScore >= 45 ? 'mid' : 'low';
      p1.push(pick(rng, INNER_WEATHER[bucket]));
    }
    if (priorSameFamily >= 2) {
      p1.push(fill(pick(rng, RECURRENCE_WEAVES), {
        count: countPhrase(priorSameFamily + 1).replace(/^./, function (c) { return c.toUpperCase(); }),
        planet: planet,
        aspect: top ? top.aspect : 'silence',
      }));
    }

    // — Section II: symbolic —
    const p2 = [];
    p2.push(pick(rng, ARCHETYPES[planet]));
    if (top && ASPECT_MYTHS[top.aspect]) p2.push(ASPECT_MYTHS[top.aspect]);
    p2.push(fill(pick(rng, ELEMENT_LENS[element]), slots));

    // — Section III: cosmological —
    const facts = ASTRONOMY_FACTS[planet] || ASTRONOMY_FACTS.Moon;
    const astronomyFact = pick(rng, facts);
    const p3 = [];
    p3.push(pick(rng, COSMOS_OPENERS));
    p3.push(fill(pick(rng, FACT_FRAMES), { fact: astronomyFact, planet: planet }));
    p3.push(pick(rng, SCALE_CLOSERS));

    // — Section IV: the question —
    const p4 = [];
    if (prevQ) {
      if (prevQ.answered && prevQ.answer) {
        const ansQuote = extractQuote(prevQ.answer);
        if (ansQuote) p4.push(fill(pick(rng, ANSWERED_WEAVES), { ans: ansQuote }));
      } else if (!prevQ.answered) {
        p4.push(fill(pick(rng, PREV_QUESTION_WEAVES), { prevQ: prevQ.question }));
      }
    }
    const question = top
      ? pick(rng, QUESTIONS[planet][quality])
      : pick(rng, OPEN_SKY_QUESTIONS);
    p4.push(pick(rng, QUESTION_BRIDGES));
    p4.push(question);

    const sections = [
      { heading: pick(rng, HEADINGS.one), paragraphs: p1 },
      { heading: pick(rng, HEADINGS.two), paragraphs: p2 },
      { heading: pick(rng, HEADINGS.three), paragraphs: p3 },
      { heading: pick(rng, HEADINGS.four), paragraphs: p4 },
    ];

    // Word-count floor: deepen Section II from the element reserve until the
    // reading clears 700 words. Deterministic — same stream, fixed order.
    const wordsIn = function () {
      let n = 0;
      for (const s of sections) for (const para of s.paragraphs) n += countWords(para);
      return n;
    };
    const reserve = DEEPENINGS[element].slice();
    const start = Math.floor(rng() * reserve.length);
    for (let i = 0; i < reserve.length && wordsIn() < 700; i++) {
      sections[1].paragraphs.push(reserve[(start + i) % reserve.length]);
    }

    const title = fill(pick(rng, TITLES), slots);
    const wordCount = wordsIn();

    remember({
      date: dateKey,
      transitSignature: signature,
      moodScore: moodScore,
      aliveTextHash: aliveText ? fnv1a(aliveText).toString(16) : null,
      question: question,
    });

    return {
      title: title,
      sections: sections,
      astronomyFact: astronomyFact,
      question: question,
      wordCount: wordCount,
    };
  }

  // ── Export ─────────────────────────────────────────────────────────────────

  root.Daimon = {
    summon: summon,
    compose: compose,
    remember: remember,
    recall: recall,
    answer: answer,
    getLastQuestion: getLastQuestion,
  };

})();
