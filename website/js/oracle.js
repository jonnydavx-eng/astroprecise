'use strict';

/**
 * AstroPrecise — The Oracle
 * Deterministic personal astrology engine: daily insights, void-of-course Moon,
 * Chaldean planetary hours, and a seeded question oracle.
 *
 * No network calls. All text is generated deterministically from the date,
 * the sky (via window.AstroEphemeris), and the user's natal chart if provided.
 *
 * Depends on: website/js/ephemeris.js (window.AstroEphemeris)
 */

// Compatibility shim: ephemeris.js planet functions reference a global
// normalizeAngle() that no script defines. Provide it (only if missing) so
// AstroEphemeris.mercuryPosition()...plutoPosition() work as documented.
if (typeof window.normalizeAngle !== 'function') {
  window.normalizeAngle = function (deg) { return ((deg % 360) + 360) % 360; };
}

window.AstroOracle = (() => {

  // ── Constants ──────────────────────────────────────────────────────────────

  const PLANETS = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];

  const GLYPHS = {
    Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
    Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇',
  };

  const SIGN_NAMES = [
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
  ];

  const ASPECTS = [
    { name: 'conjunction', angle: 0 },
    { name: 'sextile', angle: 60 },
    { name: 'square', angle: 90 },
    { name: 'trine', angle: 120 },
    { name: 'opposition', angle: 180 },
  ];

  const ORB = 3;

  const ASPECT_VERBS = {
    conjunction: 'conjoins', sextile: 'sextiles', square: 'squares',
    trine: 'trines', opposition: 'opposes',
  };

  // quality keys: c = conjunction, h = harmonious (sextile/trine), x = challenging (square/opposition)
  const ASPECT_QUALITY = {
    conjunction: 'c', sextile: 'h', trine: 'h', square: 'x', opposition: 'x',
  };

  const QUALITY_BASE = { conjunction: 2, sextile: 6, trine: 9, square: -8, opposition: -6 };

  const PLANET_WEIGHT = {
    Sun: 5, Moon: 5, Mercury: 4, Venus: 4, Mars: 4,
    Jupiter: 3, Saturn: 3, Uranus: 2, Neptune: 2, Pluto: 2,
  };

  const BENEFICS = { Venus: true, Jupiter: true };
  const MALEFICS = { Mars: true, Saturn: true, Pluto: true };

  // ── Deterministic randomness ───────────────────────────────────────────────

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

  function mod360(x) {
    return ((x % 360) + 360) % 360;
  }

  // Local calendar day index — "same day for the user" semantics.
  function localEpochDay(date) {
    return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
  }

  function ephemerisReady() {
    const E = window.AstroEphemeris;
    return !!(E && typeof E.julianDay === 'function' && typeof E.planetLongitude === 'function');
  }

  function jdAtLocalNoon(date) {
    if (!ephemerisReady()) return null;
    const E = window.AstroEphemeris;
    return E.julianDay(date.getFullYear(), date.getMonth() + 1, date.getDate(), 12, 0, 0);
  }

  function jdAtMoment(date) {
    if (!ephemerisReady()) return null;
    const E = window.AstroEphemeris;
    return E.julianDay(
      date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(),
      date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds()
    );
  }

  // ── Natal chart normalization ──────────────────────────────────────────────
  // Accepts the output of AstroEphemeris.calculateNatalChart ({positions:{sun:{longitude}}}),
  // allPlanetPositions ({Sun:{lon}}), saved AstroProfile charts, or a bare longitude map.

  function extractNatalLongitudes(chart) {
    if (!chart) return null;
    const src = (chart.positions && typeof chart.positions === 'object') ? chart.positions : chart;
    const out = {};
    for (const p of PLANETS) {
      const cand = (src[p] !== undefined) ? src[p] : src[p.toLowerCase()];
      if (cand === undefined || cand === null) continue;
      let lonVal = null;
      if (typeof cand === 'number') lonVal = cand;
      else if (typeof cand === 'object') {
        if (typeof cand.longitude === 'number') lonVal = cand.longitude;
        else if (typeof cand.lon === 'number') lonVal = cand.lon;
      }
      if (lonVal !== null && isFinite(lonVal)) out[p] = mod360(lonVal);
    }
    return Object.keys(out).length >= 2 ? out : null;
  }

  // ── Content: transit-to-natal pair texts ──────────────────────────────────
  // PAIR_TEXTS[transit][natal] = { c, h, x }

  const PAIR_TEXTS = {
    Sun: {
      Sun: {
        c: "The Sun returns to the exact degree of your birth — a solar return. The year resets here; what you begin now carries your signature all the way through it.",
        h: "Today's Sun feeds your natal Sun a clean current of vitality. Confidence comes without forcing, and being visible costs less than usual.",
        x: "Today's Sun squares off with your natal Sun, and the world's agenda grinds against your own. Don't mistake friction for failure — it's a checkpoint, not a verdict.",
      },
      Moon: {
        c: "The Sun crosses your natal Moon, dragging the private into daylight. Feelings you've kept in soft focus become impossible to ignore — let them be seen.",
        h: "The Sun warms your natal Moon from a friendly angle. Inner and outer life agree for once; use the truce to say what you actually need.",
        x: "The Sun presses hard on your natal Moon. What you want and what you feel are arguing — neither is wrong, but only one can drive.",
      },
      Mercury: {
        c: "The Sun lights up your natal Mercury. Your mind runs hot and articulate today — write it down before the glare fades.",
        h: "Solar fire meets your natal Mercury kindly. Words land, plans clarify, and the email you've been avoiding takes four minutes.",
        x: "The Sun strains against your natal Mercury. You may feel unheard or over-explained today. Say less, mean more.",
      },
      Venus: {
        c: "The Sun conjoins your natal Venus, and your charm stops being subtle. Beauty, affection, and money all want your attention — choose deliberately.",
        h: "The Sun flatters your natal Venus. Connection comes easily; let yourself be appreciated without auditing it.",
        x: "The Sun aggravates your natal Venus. Wanting to be liked and needing to be honest pull in different directions. Pick honest.",
      },
      Mars: {
        c: "The Sun ignites your natal Mars. The engine is hot — point it at something worth burning fuel for, or it will pick a target itself.",
        h: "The Sun backs your natal Mars with steady power. Effort converts to result at an unusually fair exchange rate today.",
        x: "The Sun clashes with your natal Mars. Irritation arrives fast and slightly ahead of the facts. Count to ten; then decide if it's still worth the fight.",
      },
      Jupiter: {
        c: "The Sun meets your natal Jupiter and everything looks possible. Most of it is — just not all at once.",
        h: "The Sun harmonizes with your natal Jupiter. Luck favors the visible today: show up, ask big, say yes.",
        x: "The Sun squares your natal Jupiter, inflating confidence past the load-bearing point. Enthusiasm is not a plan.",
      },
      Saturn: {
        c: "The Sun crosses your natal Saturn — an annual audit of your commitments. What's solid holds. What isn't, you already know about.",
        h: "The Sun steadies against your natal Saturn. Discipline feels less like punishment and more like architecture today.",
        x: "The Sun grinds against your natal Saturn, and authority — yours or someone else's — feels heavy. Do the duty in front of you; skip the self-sentencing.",
      },
      Uranus: {
        c: "The Sun strikes your natal Uranus and the urge to upend something respectable gets loud. Disrupt on purpose, not on impulse.",
        h: "The Sun aligns with your natal Uranus. The unconventional choice is also the correct one today — rare alignment, use it.",
        x: "The Sun crosses your natal Uranus the hard way. Restlessness spikes; before you break something, check whether it's the cage or just the routine.",
      },
      Neptune: {
        c: "The Sun dissolves into your natal Neptune. The boundary between vision and fog is thin today — create, don't sign.",
        h: "The Sun softly lights your natal Neptune. Imagination is load-bearing today: daydreams arrive with usable blueprints.",
        x: "The Sun blurs against your natal Neptune. Glamour and fatigue both distort. Verify before you believe — especially the flattering version.",
      },
      Pluto: {
        c: "The Sun meets your natal Pluto and the X-ray switches on. Today you see what's underneath things — including yourself. Look anyway.",
        h: "The Sun empowers your natal Pluto. Quiet influence beats loud force today; you can move things without raising your voice.",
        x: "The Sun confronts your natal Pluto. Power struggles surface fast — control what's yours to control and release the rest before it costs you.",
      },
    },
    Moon: {
      Sun: {
        c: "The Moon crosses your natal Sun, syncing mood to identity for a few hours. You feel unusually like yourself — act while it lasts.",
        h: "The Moon flows with your natal Sun. Emotional weather is fair; small kindnesses compound today.",
        x: "The Moon snags on your natal Sun. The mood and the mission disagree this afternoon — let the mood vote, not veto.",
      },
      Moon: {
        c: "The Moon returns to its birth degree — your lunar return. The emotional month resets; notice what your body asks for first.",
        h: "The Moon supports your natal Moon. Feelings move through cleanly today instead of pooling. Let them.",
        x: "The Moon works an awkward angle to your natal Moon. You're tender without an obvious reason. The reason doesn't have to be obvious to be real.",
      },
      Mercury: {
        c: "The Moon touches your natal Mercury and thoughts arrive pre-soaked in feeling. Good for poetry and honest texts; risky for contracts.",
        h: "The Moon eases your natal Mercury. The right words show up on time today — especially the gentle ones.",
        x: "The Moon frays your natal Mercury. You'll want to reply instantly and emotionally. Draft now, send later.",
      },
      Venus: {
        c: "The Moon meets your natal Venus and the heart's appetite wakes. Comfort, beauty, affection — feed it something real, not just something fast.",
        h: "The Moon graces your natal Venus. Affection flows at low cost and high yield. Tell someone what they mean to you.",
        x: "The Moon rubs against your natal Venus. Wanting comfort and wanting connection get tangled. Name the actual need before reaching.",
      },
      Mars: {
        c: "The Moon lands on your natal Mars and feelings arrive with fists clenched. The energy is honest — the first target usually isn't.",
        h: "The Moon channels your natal Mars cleanly. Emotional fuel converts to action without the usual smoke.",
        x: "The Moon scrapes your natal Mars. Small irritations carry suspicious voltage today. Move your body before you move your mouth.",
      },
      Jupiter: {
        c: "The Moon meets your natal Jupiter and the heart upsizes everything. Generosity is the right instinct; just check the receipt.",
        h: "The Moon expands through your natal Jupiter. Optimism is cheap and accurate today — borrow against it.",
        x: "The Moon overreaches toward your natal Jupiter. Emotional appetite exceeds capacity for a few hours. More isn't the cure.",
      },
      Saturn: {
        c: "The Moon crosses your natal Saturn and the air gets formal. Old rules about deserving comfort resurface — they're due for review.",
        h: "The Moon steadies on your natal Saturn. Feelings hold their shape today; it's a good window for hard conversations handled gently.",
        x: "The Moon presses your natal Saturn. Loneliness exaggerates this afternoon. It's weather, not architecture.",
      },
      Uranus: {
        c: "The Moon jolts your natal Uranus. Moods swing electric and sudden — surf, don't anchor.",
        h: "The Moon frees your natal Uranus. Break the small routine; the detour is the point today.",
        x: "The Moon trips your natal Uranus. You'll itch to flip the table over something minor. Note the impulse; flip nothing before evening.",
      },
      Neptune: {
        c: "The Moon melts into your natal Neptune. The membrane between you and everyone else thins — beautiful for art, expensive for boundaries.",
        h: "The Moon attunes to your natal Neptune. Intuition runs unusually clean; the hunch deserves a hearing.",
        x: "The Moon fogs your natal Neptune. Self-pity and compassion wear the same coat today. Check the label.",
      },
      Pluto: {
        c: "The Moon plumbs your natal Pluto. Old feelings surface with the silt — let them pass through your hands, not back into storage.",
        h: "The Moon deepens through your natal Pluto. Emotional honesty pays double today, especially with yourself.",
        x: "The Moon drags against your natal Pluto. The urge to control how you feel — or how someone feels about you — tightens. Loosen your grip first.",
      },
    },
    Mercury: {
      Sun: {
        c: "Mercury crosses your natal Sun, putting language to identity. Today you can explain yourself — to others, and more importantly to you.",
        h: "Mercury befriends your natal Sun. Speak up: your voice and your purpose are on the same page.",
        x: "Mercury cuts across your natal Sun. Being misquoted — or misquoting yourself — is the hazard. Slow the sentence down.",
      },
      Moon: {
        c: "Mercury meets your natal Moon and feelings get a vocabulary. Use it before it scatters.",
        h: "Mercury translates your natal Moon fluently. A conversation about feelings actually works today. Schedule it.",
        x: "Mercury needles your natal Moon. The smart remark and the kind one diverge — you'll be tempted by the smart one.",
      },
      Mercury: {
        c: "Mercury returns to its natal degree, and your mind speaks its native dialect. Plans made today fit your actual brain.",
        h: "Mercury supports your natal Mercury. Mental traffic flows; double the errands, halve the friction.",
        x: "Mercury crosses its natal place at a hard angle. Wires cross, names slip, files vanish. Triple-check, then laugh.",
      },
      Venus: {
        c: "Mercury conjoins your natal Venus and language turns to velvet. Compliments, negotiations, apologies — all land softer today.",
        h: "Mercury sweetens your natal Venus. Say the charming thing; today it's also the true thing.",
        x: "Mercury scratches your natal Venus. Tact and honesty squabble. Aim for honest, delivered slowly.",
      },
      Mars: {
        c: "Mercury hits your natal Mars and words pick up velocity. Brilliant for debate, dicey for diplomacy.",
        h: "Mercury sharpens your natal Mars. Decisions cut clean today — make the ones you've been circling.",
        x: "Mercury duels your natal Mars. Arguments feel winnable and aren't worth winning. Save the blade for the actual problem.",
      },
      Jupiter: {
        c: "Mercury meets your natal Jupiter and every idea grows a sequel. Capture them all; edit tomorrow.",
        h: "Mercury opens your natal Jupiter. The big-picture conversation goes well today — pitch, publish, ask.",
        x: "Mercury overpromises to your natal Jupiter. The plan sounds better than it measures. Get the numbers.",
      },
      Saturn: {
        c: "Mercury crosses your natal Saturn. Thought turns structural — perfect for the plan that needs bones, heavy for small talk.",
        h: "Mercury respects your natal Saturn. Words carry weight today; commitments spoken now tend to hold.",
        x: "Mercury stalls against your natal Saturn. The inner critic edits in real time. Write badly on purpose; fix it later.",
      },
      Uranus: {
        c: "Mercury strikes your natal Uranus and the idea arrives fully formed at an inconvenient time. Write it down anyway.",
        h: "Mercury electrifies your natal Uranus. The lateral solution is sitting in plain sight today.",
        x: "Mercury short-circuits your natal Uranus. Brilliant and scattered share a desk this afternoon. One tab at a time.",
      },
      Neptune: {
        c: "Mercury dissolves into your natal Neptune. Metaphor is your first language today — just don't sign anything written in it.",
        h: "Mercury channels your natal Neptune. Imagination and articulation cooperate; make the art, draft the vision.",
        x: "Mercury fogs against your natal Neptune. Details slip their leashes. Confirm times, reread everything, assume nothing.",
      },
      Pluto: {
        c: "Mercury meets your natal Pluto and conversation goes subterranean. You'll hear what people mean, not what they say.",
        h: "Mercury deepens your natal Pluto. Research, therapy, strategy — anything that digs rewards you today.",
        x: "Mercury probes your natal Pluto the hard way. Verbal chess, loaded questions, the urge to win the subtext. Step out of the game.",
      },
    },
    Venus: {
      Sun: {
        c: "Venus crosses your natal Sun and you're easier to love — including by yourself. Receive without negotiating.",
        h: "Venus graces your natal Sun. Charm is on the house today; spend it on something that matters.",
        x: "Venus frets your natal Sun. Approval and authenticity bid against each other. Authenticity is the better long position.",
      },
      Moon: {
        c: "Venus meets your natal Moon and tenderness becomes the day's currency. Pay it inward first.",
        h: "Venus soothes your natal Moon. Comfort arrives in proportion to how much you let it. Let it.",
        x: "Venus unsettles your natal Moon. Indulgence promises what only rest can deliver. Choose the nap over the purchase.",
      },
      Mercury: {
        c: "Venus conjoins your natal Mercury, and affection finds words. Write the message you keep almost sending.",
        h: "Venus tunes your natal Mercury. Conversations turn warm without trying — a good day to repair small rifts.",
        x: "Venus complicates your natal Mercury. Sweet words may be padding something. Read for content, not melody.",
      },
      Venus: {
        c: "Venus returns to its natal degree — your Venus return. What you love, value, and find beautiful resets its budget for the cycle ahead.",
        h: "Venus supports your natal Venus. Pleasure is efficient today: small delights deliver full-size returns.",
        x: "Venus crosses its natal place awkwardly. Wanting feels itchy and unspecific. Don't shop while the signal's scrambled.",
      },
      Mars: {
        c: "Venus meets your natal Mars and desire gets a clear signature. Attraction, creation, pursuit — the magnetism is real today.",
        h: "Venus harmonizes your natal Mars. Want and act agree; flirtation, art, and asking all carry favorable odds.",
        x: "Venus teases your natal Mars. Desire and timing miss each other by minutes all day. Patience is the actual move.",
      },
      Jupiter: {
        c: "Venus conjoins your natal Jupiter — the sky's two benefics shake hands over your chart. Enjoy generously; this is the good stuff.",
        h: "Venus expands your natal Jupiter. Abundance behaves today: gratitude in, opportunity out.",
        x: "Venus overindulges your natal Jupiter. Everything delicious is on sale. Your future self requests moderation, politely.",
      },
      Saturn: {
        c: "Venus crosses your natal Saturn. Love gets practical — devotion measured in actions, not declarations. That's not cold; that's load-bearing.",
        h: "Venus steadies your natal Saturn. Relationships strengthen through small kept promises today.",
        x: "Venus chafes your natal Saturn. You may feel unchosen or under-thanked. The deficit is in the moment, not in you.",
      },
      Uranus: {
        c: "Venus strikes your natal Uranus and attraction goes off-script. The unlikely person, the strange beauty — notice what actually pulls you.",
        h: "Venus refreshes your natal Uranus. Novelty and affection mix well today; surprise someone, including yourself.",
        x: "Venus disrupts your natal Uranus. Restlessness masquerades as falling out of love with everything. Wait a day before redecorating your life.",
      },
      Neptune: {
        c: "Venus dissolves into your natal Neptune. Romance, art, and longing blur gorgeously — enjoy the watercolor, postpone the appraisal.",
        h: "Venus enchants your natal Neptune. Beauty hits deeper than usual; make something or memorize something.",
        x: "Venus glamours your natal Neptune. The fantasy fits suspiciously well. Adore freely, idealize cautiously, transfer no funds.",
      },
      Pluto: {
        c: "Venus meets your natal Pluto and affection turns to intensity. Wanting deeply isn't the problem — gripping is.",
        h: "Venus empowers your natal Pluto. Intimacy deepens where honesty leads today; go first.",
        x: "Venus strains against your natal Pluto. Jealousy and scarcity tell elaborate stories. Audit them before acting.",
      },
    },
    Mars: {
      Sun: {
        c: "Mars crosses your natal Sun and hands you the keys to your own engine. Drive something worthy — idle, and it'll redline anyway.",
        h: "Mars energizes your natal Sun. Stamina, nerve, follow-through: today carries all three. Start the hard thing.",
        x: "Mars squares off with your natal Sun. Tempers ignite near questions of respect. Defend the boundary, skip the war.",
      },
      Moon: {
        c: "Mars lands on your natal Moon and emotions arrive armored. Underneath the heat is usually a need — find it before you fire.",
        h: "Mars motivates your natal Moon. Emotional energy converts to motion; clean the house, run the miles, have the talk.",
        x: "Mars inflames your natal Moon. You're quicker to wound and be wounded today. Hunger and tiredness are force multipliers — manage both.",
      },
      Mercury: {
        c: "Mars conjoins your natal Mercury and the mind sharpens to a point. Cutting insight or cutting remark — same blade, your choice of target.",
        h: "Mars accelerates your natal Mercury. Decisive thinking, fast execution, zero dithering. Burn the to-do list down.",
        x: "Mars argues with your natal Mercury. Every hill looks worth dying on. Almost none are.",
      },
      Venus: {
        c: "Mars meets your natal Venus and pursuit becomes the theme. Desire is direct today — directness is charming when it's honest.",
        h: "Mars vitalizes your natal Venus. Passion and pleasure cooperate; make the move you've been rehearsing.",
        x: "Mars pressures your natal Venus. Impatience bruises affection if you let it. Slow is smooth; smooth is romantic.",
      },
      Mars: {
        c: "Mars returns to its natal degree — your Mars return. The two-year cycle of will and want restarts. Choose this cycle's fight consciously.",
        h: "Mars reinforces your natal Mars. Raw capability peaks today; aim it at the heaviest object on your list.",
        x: "Mars crosses its natal place at a hard angle. Friction without a cause goes looking for one. Give it a workout instead of a victim.",
      },
      Jupiter: {
        c: "Mars conjoins your natal Jupiter and conviction doubles. Magnificent for launching; check that the runway exists.",
        h: "Mars amplifies your natal Jupiter. Bold action meets good timing — the calculated risk calculates favorably.",
        x: "Mars overextends your natal Jupiter. The reach exceeds the grasp by a wider margin than it appears. Scale the leap to the legs.",
      },
      Saturn: {
        c: "Mars grinds against your natal Saturn — gas and brake at once. Frustration is the cost of building something that lasts. Pay it slowly.",
        h: "Mars disciplines through your natal Saturn. Endurance work pays today: the long grind, the strict form, the patient rep.",
        x: "Mars fights your natal Saturn and walls win. Forcing it breaks the tool. Redirect to what actually moves.",
      },
      Uranus: {
        c: "Mars strikes your natal Uranus — volatile, brilliant, accident-adjacent. Move fast around ideas and slow around machinery.",
        h: "Mars liberates your natal Uranus. Courage and originality sync; the bold experiment runs today.",
        x: "Mars trips your natal Uranus. The fuse is short and the spark is random. Drive carefully, speak deliberately, sign nothing in anger.",
      },
      Neptune: {
        c: "Mars dissolves into your natal Neptune. Effort goes soft-focus — perfect for inspired work, useless for deadlines. Budget accordingly.",
        h: "Mars channels your natal Neptune. Acting on intuition works today; the side door is open.",
        x: "Mars deceives against your natal Neptune. Energy leaks through vague commitments and unnamed resentments. Name them; the leak seals.",
      },
      Pluto: {
        c: "Mars meets your natal Pluto and the will goes nuclear. Immense power for transformation — and for scorched earth. Choose the demolition site carefully.",
        h: "Mars empowers your natal Pluto. Obstacles that survived everything else move today. Push the big one.",
        x: "Mars provokes your natal Pluto. Control contests turn primal fast. The strongest move available is declining the duel.",
      },
    },
  };

  // Fallback themes for slow transiting planets (Jupiter through Pluto).
  const OUTER_THEME = {
    Jupiter: {
      c: "A season of expansion opens here — more room, more meaning, more appetite.",
      h: "Growth comes through this channel now with unusual ease; say yes a size larger than usual.",
      x: "Expansion presses against this part of your chart — promise carefully, because everything inflates.",
    },
    Saturn: {
      c: "Saturn is restructuring this territory — slower, harder, and ultimately load-bearing.",
      h: "Saturn lends this part of your life quiet architecture; what you commit to now compounds.",
      x: "Saturn tests this ground with weight and delay. The test is passable; the shortcut is not.",
    },
    Uranus: {
      c: "Uranus is rewiring this circuit — expect the unexpected to be oddly accurate.",
      h: "Change arrives here as liberation rather than rupture; experiment while the window is open.",
      x: "Uranus rattles this area until the brittle parts show. Flexibility is the survival trait.",
    },
    Neptune: {
      c: "Neptune is dissolving the outline here — confusing for plans, fertile for dreams.",
      h: "Inspiration seeps into this region of your life; trust the images before the explanations.",
      x: "Neptune fogs this terrain; idealize less, verify more, and keep your feet findable.",
    },
    Pluto: {
      c: "Pluto is composting this part of the chart — endings feed beginnings here for a long while.",
      h: "Deep, durable transformation works through this channel now; cooperate with it.",
      x: "Pluto applies pressure here until what's false collapses. Let it; the foundation is what survives.",
    },
  };

  const NATAL_FOCUS = {
    Sun: "It targets your core sense of self.",
    Moon: "It works on your emotional foundations.",
    Mercury: "It moves through your mind and voice.",
    Venus: "It touches what and how you love.",
    Mars: "It reshapes how you fight and pursue.",
    Jupiter: "It revises what you believe is possible.",
    Saturn: "It renegotiates your commitments and limits.",
    Uranus: "It loosens your relationship to freedom itself.",
    Neptune: "It tunes your access to the invisible.",
    Pluto: "It excavates your relationship to power.",
  };

  // ── Content: sky-weather (sun-sign mode) texts ─────────────────────────────

  const PLANET_THEMES = {
    Sun: 'vitality and visibility', Moon: 'mood and instinct', Mercury: 'thought and conversation',
    Venus: 'affection and value', Mars: 'drive and desire', Jupiter: 'growth and confidence',
    Saturn: 'structure and duty', Uranus: 'change and freedom', Neptune: 'dreams and intuition',
    Pluto: 'depth and power',
  };

  const SKY_TEMPLATES = {
    c: [
      "{a} and {b} merge overhead, fusing {ta} with {tb}. The collective current runs strong here — ride it consciously rather than being carried.",
      "{a} conjoins {b} in today's sky: {ta} and {tb} speak with one voice. Listen for what they announce in your own life.",
      "{a} sits with {b} today, concentrating {ta} and {tb} into a single signal. Whatever this stirs in you, it's worth a second look.",
    ],
    h: [
      "{a} flows with {b} today, letting {ta} and {tb} cooperate. Doors in this direction open with less push than usual.",
      "A friendly angle between {a} and {b} blends {ta} with {tb}. Use the ease — it's real, and it's temporary.",
      "{a} supports {b} overhead: {ta} feeds {tb} instead of fighting it. Small efforts in this territory return large.",
    ],
    x: [
      "{a} grinds against {b} today, setting {ta} at odds with {tb}. The tension is productive if you refuse to pick a premature winner.",
      "A hard angle between {a} and {b} puts {ta} and {tb} in negotiation. Expect friction in this department — it's sharpening, not breaking.",
      "{a} confronts {b} in the sky: {ta} versus {tb}. Don't resolve the standoff with haste; resolve it with honesty.",
    ],
  };

  // ── Content: headlines, openers, moon lines, closers ───────────────────────

  const HEADLINES = [
    "The {moon} Moon Has Notes for You",
    "Today Leans Toward {kw}",
    "{kw} Is the Assignment",
    "Let {planet} Set the Tempo",
    "A Day Written in {kw}",
    "The Sky Votes {kw}",
    "{moon} Moon, Open Channel",
    "Small Moves, {kw} Energy",
    "{planet} Is Loud Today — Answer It",
    "Under a {moon} Moon, {kw} Wins",
    "Proceed as if {kw} Were Guaranteed",
    "The Quiet Pull of {kw}",
    "Today Rewards {kw} Over Speed",
    "{kw}, but Make It Deliberate",
  ];

  const OPENERS = {
    high: [
      "The sky is doing you a favor today.",
      "Today runs downhill in the good way.",
      "Conditions are favorable — quietly, but measurably.",
    ],
    mid: [
      "Today is mixed weather: usable, if you dress for it.",
      "Nothing dramatic overhead — which makes it a fine day for deliberate moves.",
      "The sky is neutral today; your choices carry the casting vote.",
    ],
    low: [
      "Today has friction baked in — useful friction, if you let it sharpen instead of scrape.",
      "The sky asks more than it gives today. Pace accordingly.",
      "Heavy weather overhead. Lower the sail, keep the heading.",
    ],
  };

  const MOON_LINES = {
    Aries: "With the Moon in Aries, feelings move first and explain later — give them somewhere to run.",
    Taurus: "With the Moon in Taurus, the body sets the agenda: feed it well and decisions improve on their own.",
    Gemini: "With the Moon in Gemini, the mood wants conversation — talk it through and watch it lighten.",
    Cancer: "With the Moon in Cancer, the tide runs high and close to shore; protect your soft hours.",
    Leo: "With the Moon in Leo, the heart wants an audience — let yourself be seen feeling something.",
    Virgo: "With the Moon in Virgo, tidying one small corner calms the entire interior. Start there.",
    Libra: "With the Moon in Libra, equilibrium is the craving — one honest conversation rebalances more than three avoided ones.",
    Scorpio: "With the Moon in Scorpio, feelings run deep and undeclared; what you won't say still steers, so say it to yourself at least.",
    Sagittarius: "With the Moon in Sagittarius, the mood needs a horizon — open a window, a map, or a question.",
    Capricorn: "With the Moon in Capricorn, feelings file reports instead of poems; honor the duty, then clock out.",
    Aquarius: "With the Moon in Aquarius, a little distance from your own drama is available today — use the observation deck.",
    Pisces: "With the Moon in Pisces, the membrane is thin; you're picking up signals from everywhere, so filter before you forward.",
  };

  const CLOSERS = [
    "End the day with one honest sentence in your notes; future you is listening.",
    "Whatever else happens, keep one promise to yourself before midnight.",
    "Let the day be measured by what you tended, not what you finished.",
    "The stars set the weather; you still choose the route.",
    "Move at the speed of integrity — it's faster than it looks.",
    "What you practice today, you become slightly more of tomorrow. Choose the rep.",
    "Drink water, touch ground, tell the truth once. The rest is detail.",
    "Tomorrow inherits today's smallest decisions. Make two of them kind.",
  ];

  // ── Content: power / caution / keywords ────────────────────────────────────

  const AREA_BY_PLANET = {
    Sun: 'Identity', Moon: 'Emotional Life', Mercury: 'Communication', Venus: 'Love & Money',
    Mars: 'Drive & Desire', Jupiter: 'Growth', Saturn: 'Discipline', Uranus: 'Freedom',
    Neptune: 'Imagination', Pluto: 'Power',
  };

  const POWER_TEXTS = {
    Sun: [
      "Lead with visible confidence — rooms reorganize around your certainty today.",
      "Your presence does extra work today; show up in person where it counts.",
    ],
    Moon: [
      "Your read on the emotional undercurrent is dead accurate — trust it in real time.",
      "Care is your superpower today; tending something gently moves it further than force would.",
    ],
    Mercury: [
      "Words are your sharpest tool today — the message, the pitch, the well-timed question.",
      "Your thinking is fast and clean; decisions made before dusk hold up.",
    ],
    Venus: [
      "Charm and diplomacy open doors force can't — negotiate, reconcile, beautify.",
      "What you appreciate appreciates; gratitude is strategy today.",
    ],
    Mars: [
      "Raw momentum favors you — start the thing that needs nerve.",
      "Your follow-through is ironclad today; finish what others abandon.",
    ],
    Jupiter: [
      "Think a size bigger; today the larger ask gets the better answer.",
      "Generosity returns with interest today — give first.",
    ],
    Saturn: [
      "Structure is your edge — plan, commit, and let consistency compound.",
      "Your patience outlasts the problem today; steady pressure wins.",
    ],
    Uranus: [
      "The unconventional approach is the effective one — break your own pattern on purpose.",
      "Your originality reads as leadership today; show the weird idea.",
    ],
    Neptune: [
      "Imagination is functional today — vision first, logistics after.",
      "Your compassion reads situations others misread; lead with it.",
    ],
    Pluto: [
      "Focused intensity moves immovable things today — pick one target.",
      "You can see beneath the surface today; use the depth, not the dirt.",
    ],
  };

  const CAUTION_TEXTS = {
    Sun: [
      "Pride picks expensive fights today — defend the work, not the ego.",
      "Don't confuse being seen with being right; check the mirror's lighting.",
    ],
    Moon: [
      "Moods are weather, not forecasts — don't sign anything during a squall.",
      "You're absorbing other people's static; ground yourself before you respond.",
    ],
    Mercury: [
      "The clever reply costs more than it earns today — sit on the send button.",
      "Details are slippery; confirm the time, the name, the number.",
    ],
    Venus: [
      "Comfort-spending and approval-seeking are both hungry today; feed neither on credit.",
      "Being liked is not the same as being loved — don't trade the second for the first.",
    ],
    Mars: [
      "Impatience is the saboteur today — speed kills accuracy after noon.",
      "The fight that's available isn't the fight that matters; conserve ammunition.",
    ],
    Jupiter: [
      "Optimism is rounding up today — check the actual numbers before leaping.",
      "Overcommitment wears a friendly face; count your open promises first.",
    ],
    Saturn: [
      "The inner critic is over-billing you today — audit its invoice.",
      "Heaviness isn't proof of importance; put down what isn't yours to carry.",
    ],
    Uranus: [
      "The urge to torch the routine is loud — change one variable, not all of them.",
      "Impulse wears the costume of liberation today; wait one hour before the dramatic exit.",
    ],
    Neptune: [
      "The fog flatters — verify the facts beneath the feeling before committing.",
      "Escape hatches multiply today; make sure the one you take leads somewhere.",
    ],
    Pluto: [
      "Control is the trap today — grip looser and you'll lose less.",
      "Obsession narrows the field of view; step back until the whole board is visible.",
    ],
  };

  const KEYWORDS = {
    Sun: { h: ['radiant', 'confident', 'vital'], x: ['proud', 'glaring', 'defensive'] },
    Moon: { h: ['attuned', 'nourished', 'intuitive'], x: ['tender', 'moody', 'absorbing'] },
    Mercury: { h: ['articulate', 'curious', 'nimble'], x: ['scattered', 'sharp-tongued', 'overthinking'] },
    Venus: { h: ['magnetic', 'tender', 'gracious'], x: ['indulgent', 'approval-seeking', 'wistful'] },
    Mars: { h: ['decisive', 'energized', 'brave'], x: ['impatient', 'combative', 'restless'] },
    Jupiter: { h: ['expansive', 'generous', 'lucky'], x: ['overextended', 'excessive', 'overpromising'] },
    Saturn: { h: ['grounded', 'disciplined', 'steadfast'], x: ['heavy', 'self-critical', 'rigid'] },
    Uranus: { h: ['original', 'liberated', 'electric'], x: ['erratic', 'rebellious', 'jumpy'] },
    Neptune: { h: ['inspired', 'compassionate', 'dreamlike'], x: ['foggy', 'escapist', 'porous'] },
    Pluto: { h: ['powerful', 'transformative', 'focused'], x: ['obsessive', 'controlling', 'intense'] },
  };

  const GENERAL_KEYWORDS = ['deliberate', 'patient', 'curious', 'honest', 'grounded', 'open'];

  // ── Aspect computation ─────────────────────────────────────────────────────

  function angularSeparation(a, b) {
    let d = Math.abs(mod360(a) - mod360(b));
    if (d > 180) d = 360 - d;
    return d;
  }

  function classifyAspect(sep) {
    for (const asp of ASPECTS) {
      const orb = Math.abs(sep - asp.angle);
      if (orb <= ORB) return { name: asp.name, orb: +orb.toFixed(2) };
    }
    return null;
  }

  function aspectMoodScore(t, n, aspectName, orb) {
    let base = QUALITY_BASE[aspectName];
    if (aspectName === 'conjunction') {
      if (BENEFICS[t] || BENEFICS[n]) base += 4;
      if (MALEFICS[t] || MALEFICS[n]) base -= 3;
    }
    const weight = ((PLANET_WEIGHT[t] + PLANET_WEIGHT[n]) / 8) * (1 - orb / (ORB + 1));
    return base * weight;
  }

  function aspectRank(t, n, aspectName, orb) {
    return Math.abs(QUALITY_BASE[aspectName]) * ((PLANET_WEIGHT[t] + PLANET_WEIGHT[n]) / 8) * (1 - orb / (ORB + 1)) +
      (aspectName === 'conjunction' ? 4 : 0);
  }

  function natalAspectText(t, n, quality) {
    if (PAIR_TEXTS[t] && PAIR_TEXTS[t][n]) return PAIR_TEXTS[t][n][quality];
    const theme = OUTER_THEME[t] ? OUTER_THEME[t][quality] : "A slow current moves through this part of your chart.";
    return `Transiting ${t} works on your natal ${n}. ${theme} ${NATAL_FOCUS[n] || ''}`.trim();
  }

  function skyAspectText(t, n, quality, day) {
    const templates = SKY_TEMPLATES[quality];
    const idx = fnv1a(t + '|' + n + '|' + day) % templates.length;
    return templates[idx]
      .replace('{a}', t).replace('{b}', n)
      .replace('{ta}', PLANET_THEMES[t]).replace('{tb}', PLANET_THEMES[n]);
  }

  function findNatalAspects(transits, natal, day) {
    const found = [];
    for (const t of PLANETS) {
      if (transits[t] === undefined) continue;
      for (const n of Object.keys(natal)) {
        const sep = angularSeparation(transits[t], natal[n]);
        const hit = classifyAspect(sep);
        if (!hit) continue;
        const quality = ASPECT_QUALITY[hit.name];
        found.push({
          transit: t,
          natal: n,
          aspect: hit.name,
          orb: hit.orb,
          quality,
          mood: aspectMoodScore(t, n, hit.name, hit.orb),
          rank: aspectRank(t, n, hit.name, hit.orb),
          text: natalAspectText(t, n, quality),
        });
      }
    }
    return found;
  }

  function findSkyAspects(transits, day) {
    const found = [];
    for (let i = 0; i < PLANETS.length; i++) {
      for (let j = i + 1; j < PLANETS.length; j++) {
        const t = PLANETS[i], n = PLANETS[j];
        if (transits[t] === undefined || transits[n] === undefined) continue;
        const sep = angularSeparation(transits[t], transits[n]);
        const hit = classifyAspect(sep);
        if (!hit) continue;
        const quality = ASPECT_QUALITY[hit.name];
        found.push({
          transit: t,
          natal: n,
          aspect: hit.name,
          orb: hit.orb,
          quality,
          mood: aspectMoodScore(t, n, hit.name, hit.orb),
          rank: aspectRank(t, n, hit.name, hit.orb),
          text: skyAspectText(t, n, quality, day),
        });
      }
    }
    return found;
  }

  // ── 1. getDailyInsight ─────────────────────────────────────────────────────

  // Transiting longitudes for all ten bodies, with a fallback path so a
  // failure in any single VSOP87 routine cannot take down the whole insight.
  function getTransitLongitudes(jd) {
    const E = window.AstroEphemeris;
    const out = {};
    for (const p of PLANETS) {
      let lon = null;
      const fn = E[p.toLowerCase() + 'Position'];
      if (typeof fn === 'function') {
        try {
          const pos = fn(jd);
          if (pos && typeof pos.lon === 'number') lon = pos.lon;
        } catch (e) { lon = null; }
      }
      if (lon === null || !isFinite(lon)) {
        try { lon = E.planetLongitude(p.toLowerCase(), jd); } catch (e) { lon = null; }
      }
      if (lon !== null && isFinite(lon)) out[p] = mod360(lon);
    }
    return out;
  }

  function getDailyInsight(natalChart, date) {
    date = date instanceof Date ? date : new Date();
    if (!ephemerisReady()) {
      return {
        headline: 'Sky note',
        body: 'Transit themes update as the live sky shifts.',
        power: { area: 'Spirit', text: 'Open weather — the direction is yours to supply.' },
        caution: { area: 'Pace', text: 'Wait for the engine before acting on tight timing.' },
        transits: [],
        moodScore: 55,
        keywords: ['patience', 'clarity', 'pace'],
        meta: {
          mode: natalChart ? 'natal' : 'sky',
          sunSign: null,
          moonSign: null,
          date: new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString().slice(0, 10),
        },
      };
    }
    const jd = jdAtLocalNoon(date);
    const day = localEpochDay(date);

    const transits = getTransitLongitudes(jd);

    const natal = extractNatalLongitudes(natalChart);
    const mode = natal ? 'natal' : 'sky';

    const chartSeed = natal
      ? (Math.floor((natal.Sun || 0) * 100) ^ Math.floor((natal.Moon || 0) * 10))
      : 0;
    const rng = mulberry32(((Math.imul(day, 73856093) ^ Math.imul(chartSeed, 19349663)) ^ 0x9e3779b9) >>> 0);

    const aspects = (natal ? findNatalAspects(transits, natal, day) : findSkyAspects(transits, day))
      .sort((a, b) => b.rank - a.rank);

    const moonSign = SIGN_NAMES[Math.floor((transits.Moon || 0) / 30)];
    const sunSign = SIGN_NAMES[Math.floor((transits.Sun || 0) / 30)];

    // Mood score
    let moodTotal = 0;
    for (const a of aspects) moodTotal += a.mood;
    const moodScore = Math.max(3, Math.min(98, Math.round(55 + moodTotal + (rng() * 12 - 6))));

    // Power & caution from the strongest harmonious / challenging contacts
    const harmonious = aspects.filter(a => a.quality === 'h' || (a.quality === 'c' && a.mood >= 0));
    const challenging = aspects.filter(a => a.quality === 'x' || (a.quality === 'c' && a.mood < 0));

    const powerPlanet = harmonious.length
      ? harmonious[0].natal
      : pick(rng, ['Venus', 'Jupiter', 'Sun', 'Moon']);
    const cautionPlanet = challenging.length
      ? (mode === 'natal' ? challenging[0].natal : challenging[0].transit)
      : pick(rng, ['Saturn', 'Mars', 'Neptune', 'Mercury']);

    const power = {
      area: AREA_BY_PLANET[powerPlanet] || 'Spirit',
      text: pick(rng, POWER_TEXTS[powerPlanet] || POWER_TEXTS.Sun),
    };
    const caution = {
      area: AREA_BY_PLANET[cautionPlanet] || 'Pace',
      text: pick(rng, CAUTION_TEXTS[cautionPlanet] || CAUTION_TEXTS.Saturn),
    };

    // Keywords — three distinct words drawn from the day's dominant contacts
    const kwPool = [];
    if (harmonious.length) kwPool.push(pick(rng, KEYWORDS[harmonious[0].transit].h));
    if (challenging.length) kwPool.push(pick(rng, KEYWORDS[challenging[0].transit].x));
    if (aspects.length) kwPool.push(pick(rng, KEYWORDS[aspects[0].natal in KEYWORDS ? aspects[0].natal : aspects[0].transit][aspects[0].quality === 'x' ? 'x' : 'h']));
    const keywords = [];
    for (const k of kwPool) if (k && keywords.indexOf(k) === -1) keywords.push(k);
    while (keywords.length < 3) {
      const k = pick(rng, GENERAL_KEYWORDS);
      if (keywords.indexOf(k) === -1) keywords.push(k);
    }
    keywords.length = 3;

    // Headline
    const kwTitle = keywords[0].charAt(0).toUpperCase() + keywords[0].slice(1);
    const topPlanet = aspects.length ? aspects[0].transit : 'the Moon';
    const headline = pick(rng, HEADLINES)
      .replace('{kw}', kwTitle)
      .replace('{moon}', moonSign)
      .replace('{planet}', topPlanet === 'the Moon' ? 'the Moon' : topPlanet);

    // Body
    const bucket = moodScore >= 66 ? 'high' : moodScore >= 45 ? 'mid' : 'low';
    const bodyParts = [pick(rng, OPENERS[bucket])];
    if (aspects.length) {
      bodyParts.push(aspects[0].text);
      if (aspects.length > 1 && aspects[1].quality !== aspects[0].quality) bodyParts.push(aspects[1].text);
    } else {
      bodyParts.push(mode === 'natal'
        ? "No exact transits touch your chart today — a rare patch of open sky. Days like this don't push you anywhere, which means the direction is entirely yours to supply."
        : "The planets keep to themselves today — no tight aspects overhead. Open weather: whatever you start now starts clean.");
    }
    bodyParts.push(MOON_LINES[moonSign]);
    bodyParts.push(pick(rng, CLOSERS));
    const body = bodyParts.join(' ');

    // Transit list for the UI
    const transitList = aspects.slice(0, 5).map(a => ({
      transit: a.transit,
      natal: a.natal,
      aspect: a.aspect,
      orb: a.orb,
      text: a.text,
    }));

    return {
      headline,
      body,
      power,
      caution,
      transits: transitList,
      moodScore,
      keywords,
      meta: {
        mode,
        sunSign,
        moonSign,
        date: new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString().slice(0, 10),
      },
    };
  }

  // ── 2. getVoidOfCourseMoon ─────────────────────────────────────────────────
  // Approximation: time until the Moon leaves its current sign, found by
  // iterating against the Moon's measured speed (~13.176°/day mean).

  function getVoidOfCourseMoon(date) {
    date = date instanceof Date ? date : new Date();
    const E = window.AstroEphemeris;
    const jd0 = jdAtMoment(date);
    const lon0 = mod360(E.moonPosition(jd0).lon);
    const signIndex = Math.floor(lon0 / 30);
    const boundary = (signIndex + 1) * 30;

    let jd = jd0;
    for (let i = 0; i < 10; i++) {
      const lon = mod360(E.moonPosition(jd).lon);
      let diff = ((boundary - lon) % 360 + 540) % 360 - 180; // signed degrees to boundary
      if (Math.abs(diff) < 0.0005) break;
      // Measured lunar speed (deg/day) around this moment
      const lonAhead = mod360(E.moonPosition(jd + 0.05).lon);
      let step = ((lonAhead - lon) % 360 + 540) % 360 - 180;
      const speed = Math.abs(step) > 1e-6 ? step / 0.05 : 13.176;
      jd += diff / speed;
    }

    const hoursRemaining = Math.max(0, (jd - jd0) * 24);
    return {
      sign: SIGN_NAMES[signIndex],
      degree: +(lon0 - signIndex * 30).toFixed(2),
      nextSign: SIGN_NAMES[(signIndex + 1) % 12],
      exitsSignAt: new Date(date.getTime() + hoursRemaining * 3600000),
      hoursRemaining: +hoursRemaining.toFixed(2),
    };
  }

  // ── 3. getPlanetaryHour ────────────────────────────────────────────────────
  // Classic Chaldean planetary hours with sunrise/sunset approximated from
  // the standard solar declination formula.

  const CHALDEAN = ['Saturn', 'Jupiter', 'Mars', 'Sun', 'Venus', 'Mercury', 'Moon'];
  const DAY_RULERS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn']; // index = Date.getDay()

  const HOUR_MEANINGS = {
    Sun: "Hour of sovereignty — act where you want to be seen; favorable for leadership, launches, and asking for recognition.",
    Moon: "Hour of tides — tend the home, the body, and the feelings; favorable for rest, intuition, and domestic matters.",
    Mercury: "Hour of the messenger — write, negotiate, study, send; favorable for contracts, errands, and clever solutions.",
    Venus: "Hour of grace — favorable for love, beauty, diplomacy, and anything that should end in harmony.",
    Mars: "Hour of the blade — favorable for exertion, courage, and cutting away what is finished; unfavorable for picking fights.",
    Jupiter: "Hour of expansion — favorable for asking big, generous agreements, teaching, and acts of faith.",
    Saturn: "Hour of the threshold — favorable for endings, boundaries, long-term plans, and disciplined solitary work.",
  };

  function sunriseSunsetUTC(y, m, d, lat, lon) {
    const N = Math.floor((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 0)) / 86400000);
    const decl = -23.44 * Math.cos((2 * Math.PI * (N + 10)) / 365.25);
    const latR = (lat * Math.PI) / 180;
    const declR = (decl * Math.PI) / 180;
    let cosH = (Math.sin((-0.833 * Math.PI) / 180) - Math.sin(latR) * Math.sin(declR)) /
      (Math.cos(latR) * Math.cos(declR));
    cosH = Math.max(-1, Math.min(1, cosH)); // clamp for polar day/night
    const H = (Math.acos(cosH) * 180) / Math.PI; // degrees of hour angle
    const solarNoonUTC = 12 - lon / 15;
    const base = Date.UTC(y, m - 1, d);
    return {
      sunrise: new Date(base + (solarNoonUTC - H / 15) * 3600000),
      sunset: new Date(base + (solarNoonUTC + H / 15) * 3600000),
    };
  }

  function getPlanetaryHour(date, lat, lon) {
    date = date instanceof Date ? date : new Date();
    lat = (lat === undefined || lat === null) ? 0 : +lat;
    lon = (lon === undefined || lon === null) ? 0 : +lon;

    const today = sunriseSunsetUTC(date.getFullYear(), date.getMonth() + 1, date.getDate(), lat, lon);

    let baseDate, segStart, segEnd, idxOffset;
    if (date < today.sunrise) {
      // Still the previous planetary day's night
      const prev = new Date(date.getTime() - 86400000);
      const prevTimes = sunriseSunsetUTC(prev.getFullYear(), prev.getMonth() + 1, prev.getDate(), lat, lon);
      baseDate = prev;
      segStart = prevTimes.sunset;
      segEnd = today.sunrise;
      idxOffset = 12;
    } else if (date < today.sunset) {
      baseDate = date;
      segStart = today.sunrise;
      segEnd = today.sunset;
      idxOffset = 0;
    } else {
      const next = new Date(date.getTime() + 86400000);
      const nextTimes = sunriseSunsetUTC(next.getFullYear(), next.getMonth() + 1, next.getDate(), lat, lon);
      baseDate = date;
      segStart = today.sunset;
      segEnd = nextTimes.sunrise;
      idxOffset = 12;
    }

    const hourLen = (segEnd.getTime() - segStart.getTime()) / 12;
    let idx = Math.floor((date.getTime() - segStart.getTime()) / hourLen);
    idx = Math.max(0, Math.min(11, idx));

    const dayRuler = DAY_RULERS[baseDate.getDay()];
    const startIdx = CHALDEAN.indexOf(dayRuler);
    const ruler = CHALDEAN[(startIdx + idxOffset + idx) % 7];

    return {
      ruler,
      glyph: GLYPHS[ruler],
      meaning: HOUR_MEANINGS[ruler],
      endsAt: new Date(segStart.getTime() + (idx + 1) * hourLen),
    };
  }

  // ── 4. askOracle ───────────────────────────────────────────────────────────
  // Deterministic tarot-like oracle: hash(question) + today's epoch day [+ seed].
  // Same question on the same day always returns the same answer.

  const ORACLE_OPENINGS = [
    "The question carries more weight than it pretends to.",
    "You already know part of this answer; here is the rest.",
    "The oracle turns the question over like a river stone.",
    "Some questions arrive early; this one arrives exactly on time.",
    "What you ask aloud has been asking you for weeks.",
    "The wheel turns, and it stops without apology.",
    "The stars do not flatter, which is why they are worth consulting.",
    "Quiet the second question hiding behind this one.",
    "An answer exists; whether it comforts is another matter.",
    "The pattern was already in motion before you asked.",
    "You bring the oracle a knot; it hands you the loose end.",
    "Tonight's sky leans close to hear this one.",
    "The question is a door pretending to be a wall.",
    "Asked at another hour, this would mean something else. It was asked now.",
  ];

  const ORACLE_INSIGHTS = [
    "What looks like delay is alignment doing its slow work.",
    "The obstacle is made mostly of an old decision you can revisit.",
    "Two paths feel different but lead through the same lesson; the choice is about pace, not destination.",
    "Something is ending well — grief and relief are allowed in the same room.",
    "The thing you are protecting no longer needs protection; it needs air.",
    "A yes lives inside this, but it is wearing a condition.",
    "The timing favors preparation now and action at the next turning.",
    "You are not behind; you are in the part of the story where the roots grow.",
    "What was hidden is not lost — it is composting into something usable.",
    "The other person's silence is about their weather, not your worth.",
    "The risk is real, but smaller than the cost of standing still.",
    "There is a version of this you haven't considered because it is too simple.",
    "Your instinct flagged this correctly the first time; the doubt arrived later and uninvited.",
    "The door is not locked; it is heavy. Those feel identical from a distance.",
    "What you call confusion is two desires negotiating; let them finish.",
    "The pattern repeats because it is still teaching; this round can be the last if you take notes.",
    "Help is available but will not volunteer; it waits to be asked plainly.",
    "The situation is more moveable than it looks — pressure at the small hinge, not the big door.",
  ];

  const ORACLE_GUIDANCE = [
    "Move slowly, but move.",
    "Speak the plain sentence you have been decorating.",
    "Do the next kind, concrete thing and let the rest reorganize around it.",
    "Wait three days; if it still calls, answer it.",
    "Trade certainty for honesty and the path shortens.",
    "Tend your own ground first; the answer grows better in tended soil.",
    "Ask the direct question of the person who can actually answer it.",
    "Release the version of the plan that requires perfect conditions.",
    "Write it down tonight; the page will hold what the mind keeps dropping.",
    "Choose the option you would defend out loud, not the one easiest to hide.",
    "Begin smaller than feels impressive; finish larger than feels possible.",
    "Let the no be clean so the next yes can be too.",
    "Keep the appointment with yourself before keeping any other.",
    "Act once, observe twice, and adjust without ceremony.",
  ];

  function askOracle(question, seed) {
    const q = String(question === undefined || question === null ? '' : question)
      .trim().toLowerCase().replace(/\s+/g, ' ');
    const day = localEpochDay(new Date());
    let h = fnv1a(q) ^ Math.imul(day, 2654435761);
    if (seed !== undefined && seed !== null) {
      h ^= (typeof seed === 'number') ? (seed | 0) : fnv1a(String(seed));
    }
    const rng = mulberry32(h >>> 0);

    const opening = pick(rng, ORACLE_OPENINGS);
    const insight = pick(rng, ORACLE_INSIGHTS);
    const guidance = pick(rng, ORACLE_GUIDANCE);

    return {
      answer: `${opening} ${insight} ${guidance}`,
      opening,
      insight,
      guidance,
    };
  }

  // ── Export ─────────────────────────────────────────────────────────────────

  return {
    getDailyInsight,
    getVoidOfCourseMoon,
    getPlanetaryHour,
    askOracle,
    // Convenience constants for UI wiring
    PLANETS,
    GLYPHS,
  };
})();
