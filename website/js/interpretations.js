/**
 * AstroPrecise — Astrological Interpretations
 * Deterministic text generation for planets, signs, houses, and aspects.
 */

'use strict';

window.Interpretations = (() => {

  // ── Daily Horoscope Content ───────────────────────────────────────────────
  const DAILY_OVERVIEWS = {
    Aries: [
      "The fiery Aries energy is amplified today as Mars, your ruling planet, forms a dynamic trine with the Moon. Your natural leadership qualities shine brilliantly, and colleagues or friends look to you for direction. Channel this potent drive into projects that require courage and initiative. Avoid impulsive decisions after 6 PM when Mercury's square may cloud judgment.",
      "Today brings a surge of vitality and creative fire to your chart. The Sun's current position highlights your natural talent for blazing trails where others fear to tread. A long-standing professional challenge finds its resolution through your characteristic boldness. Trust your instincts in financial matters — your gut feeling is sharper than any spreadsheet.",
      "Venus moves into a harmonious position relative to your natal Sun, softening your edges and making you exceptionally magnetic. Relationships that have felt strained recently begin to ease, and new connections form quickly and easily. Use this favorable influence to have conversations you've been postponing. Your directness, tempered with genuine warmth today, lands beautifully.",
    ],
    Taurus: [
      "Venus, your ruling planet, casts a luminous light across your house of values and resources today. Financial matters that have been unclear suddenly resolve with elegant simplicity. Your patient approach — often misread as stubbornness — proves itself wise yet again. Indulge your senses this evening; beauty and pleasure are not luxuries but necessities for your soul.",
      "The Taurus Moon amplifies your natural receptivity to the physical world. You notice subtle things others miss: the quality of light, the nuance in a tone of voice, the potential in an overlooked opportunity. Trust these perceptions. A creative project benefits enormously from your steady, committed attention. Someone close needs your grounding presence.",
      "Saturn's current transit through your chart is building lasting structures in your life, even when progress feels slow. Today, a tangible result of months of quiet effort becomes visible. Security — financial, emotional, physical — is the theme this week, and you handle it with characteristic thoroughness. Rest when you need to; endurance requires renewal.",
    ],
    Gemini: [
      "Mercury, your ruling planet, is in its element today — fast-moving, witty, and connecting the dots between disparate ideas with lightning speed. A communication breakthrough arrives, possibly through an unexpected message or conversation. Your ability to see multiple perspectives simultaneously turns a complex situation into a solvable puzzle. Write down your best ideas before noon.",
      "The Gemini duality is your greatest asset today as you navigate a situation requiring both analytical thinking and social grace. The information you've been gathering crystallizes into a coherent picture. Share your perspective freely — your insights spark valuable discussion. Socially, this is one of your most charming days of the month.",
      "Curiosity leads you somewhere extraordinary today. A chance conversation, an article you stumble across, or a podcast you half-listen to contains a piece of information that shifts your thinking significantly. Follow every thread. Your mind is a precision instrument right now, capable of processing complexity with unusual ease and delight.",
    ],
    Cancer: [
      "The Moon, your ruling luminary, is in a powerful position today, heightening your already formidable intuitive abilities. Trust what you feel in your body about a situation — your instincts are delivering accurate information. Home and family matters take precedence, and a nourishing domestic experience renews your emotional reserves. Protect your energy from draining interactions.",
      "Emotional currents run deep today, and your sensitivity is a gift rather than a burden. You perceive what's unsaid in conversations, what's hidden beneath the surface of situations, and what someone truly needs beyond what they're asking for. This empathic clarity lets you offer exactly the right support. Your own needs deserve the same compassionate attention.",
      "Cancer energy at its highest expression is fierce protection combined with unconditional nurturing, and you embody this today. A family or home situation that has needed your steady love and clear boundaries finds resolution. New moon energy supports planting seeds of intention around security and belonging. What home means to you is evolving — allow the new definition to form.",
    ],
    Leo: [
      "The Sun illuminates your natural magnetism today, and every room you enter feels your warmth before you say a word. Creative endeavors are especially blessed — pour yourself into an artistic or expressive project with zero restraint. Recognition that you've been quietly hoping for may arrive through an unexpected channel. Generosity towards others magnifies your own good fortune.",
      "Your Leo fire burns clean and bright today, giving you both the confidence to take center stage and the warmth to bring others along for the journey. Leadership opportunities arise, and you handle them with the rare combination of authority and grace that makes people genuinely want to follow. Let yourself be fully seen — the world benefits from your full brightness.",
      "Creative inspiration flows in abundance today, and your challenge is channeling it rather than containing it. A performance, presentation, or creative debut goes exceptionally well — audiences respond to your authentic self-expression with enthusiasm. Romance is activated; single Leos attract admirers effortlessly. Couples experience a revival of playful, joyful connection.",
    ],
    Virgo: [
      "Mercury's analytical power combines with your inherent discernment today, making you exceptionally skilled at solving problems that have baffled others. Your attention to detail catches something critical that would otherwise be missed. Health matters benefit from practical adjustments you make this week — small, consistent changes compound into significant improvements. Imperfection is not failure; it's information.",
      "Your service orientation is your superpower today, but remember to direct some of that careful attention toward yourself. The precision you bring to your work produces results that surprise even your high standards. A technical or analytical challenge that seemed intractable yields to your systematic approach. Celebrate this quietly — your modesty is genuine, not performance.",
      "Virgo's earth energy grounds you beautifully today amid circumstances that might unsettle others. Your practical wisdom is sought and valued. A health or wellness protocol you've been researching finally becomes clear — trust the detailed analysis you've done. Relationships benefit from your capacity for helpful, specific support rather than vague reassurance.",
    ],
    Libra: [
      "Venus graces your sign with exceptional social and aesthetic gifts today. Beauty in all its forms — art, relationship, justice, symmetry — calls to you with unusual insistence. A negotiation or mediation you've been handling with characteristic diplomatic skill reaches a fair resolution. Your ability to see every side of an issue makes you invaluable right now.",
      "The Libra quest for balance takes on added dimension today as a decision you've been weighing clarifies. Both options have genuine merit — your task is choosing the one that aligns with your deepest values rather than merely pleasing others. Relationship harmony is your natural gift; extend that same gracious consideration to your relationship with yourself.",
      "Your social world is unusually rich today, with stimulating encounters and meaningful connections. An introduction made now could develop into a significant professional partnership or friendship over the coming months. Creative collaboration is particularly fruitful — your ability to blend your vision with another's produces something neither could achieve alone. Beauty is an important need, not a vanity.",
    ],
    Scorpio: [
      "Pluto, your modern ruler, is orchestrating a deep transformation in your chart right now — and today a layer of that shift becomes conscious. You understand something about yourself or a situation with startling clarity. Your legendary investigative instincts solve a mystery that's been occupying your attention. Intimacy — emotional, intellectual, physical — is what you crave and what nourishes you most deeply.",
      "Scorpio intensity is at full power today, giving you access to perceptions and insights that bypass the ordinary thinking mind entirely. You know things you cannot explain how you know. Trust this. A financial or resource matter benefits from your strategic thinking — you see moves ahead that others don't. Power dynamics in relationships shift in your favor.",
      "The regenerative power of Scorpio energy is yours to wield today. Something that seemed lost or ending reveals itself as a transformation in progress. Your capacity for emotional depth and your refusal to accept surface-level answers lead you to the kind of truth that changes everything. Vulnerability that you offer to a trusted person is received with the respect it deserves.",
    ],
    Sagittarius: [
      "Jupiter's expansive energy lifts your natural optimism to exceptional heights today, and your vision for the future seems both vivid and attainable. Travel, study, philosophy, or any pursuit that broadens your horizons is especially blessed. Share your enthusiasm freely — your belief in possibility is genuinely contagious and inspires those around you to aim higher.",
      "The archer's arrow finds its mark today with satisfying precision. A goal you set months ago achieves a significant milestone. Your instinct to always reach for a larger truth, a wider perspective, a more adventurous path leads you toward exactly the right opportunity right now. Someone you meet on a journey — literal or intellectual — opens an important door.",
      "Sagittarian freedom-loving energy peaks today, making confinement of any kind particularly irksome. Choose environments and conversations that stimulate your endless curiosity. A philosophical question that's been tickling your mind all week suddenly resolves itself into an insight worth recording. Teaching, publishing, or sharing your worldview reaches an enthusiastic audience.",
    ],
    Capricorn: [
      "Saturn's disciplined energy aligns perfectly with your ambitious nature today, and your long-term projects receive tangible, visible progress. Authority figures and institutions respond to your competence with respect and recognition. Your mastery of patience and strategy pays dividends that others, who took shortcuts, cannot access. Legacy — what you're building that will last — motivates every choice.",
      "The Capricorn mountain-climber is at a particularly advantageous elevation today. The view is excellent, the path ahead is clear, and you have the stamina for the distance remaining. A professional achievement that validates years of dedicated work arrives, perhaps quietly, in an ordinary moment. Let yourself feel the satisfaction — you've earned it.",
      "Your practical wisdom is a stabilizing force for everyone around you today. Financial matters that require careful, strategic thinking respond excellently to your thoroughness. Relationships deepen through your demonstrated reliability — consistency in action is your language of love. Allow yourself to receive the appreciation that others extend genuinely to you.",
    ],
    Aquarius: [
      "Uranus, your ruling planet, sparks sudden innovative insights today that could genuinely change your direction in remarkable ways. Your naturally unconventional thinking produces a breakthrough that more conventional minds missed entirely. Community, friendship, and collective vision align beautifully — a group effort produces results that exceed what any individual could achieve. The future you're imagining is closer than it appears.",
      "Aquarian originality is your greatest asset today, and the world needs exactly the particular shade of your unusual perspective. A humanitarian or community-focused project gains momentum through your involvement. Technology, science, or social innovation is a productive arena. Don't dilute your vision to make it more palatable — its edge is what makes it valuable.",
      "Your capacity for objective analysis cuts through emotional fog today, helping you and others see a complicated situation clearly. Friendships take on special depth — an existing friend reveals a side of themselves that surprises and delights you, while a new connection forms with startling speed over shared values. Freedom and belonging are not opposites; today you experience both simultaneously.",
    ],
    Pisces: [
      "Neptune, your ruling planet, deepens your already profound intuition today to near-mystical levels. Creative, spiritual, and compassionate endeavors flourish under this influence. Trust the images and impressions that arise in your quieter moments — they contain important information. A dream or daydream this week carries a message worth decoding. Your sensitivity is not a weakness but a form of genius.",
      "The Pisces ocean of emotion and imagination is magnificently productive today. Creative work that emerges from your inner world resonates with others at a level beyond ordinary communication. Healing — offering it or receiving it — is the central theme. Your instinctive understanding of suffering and your refusal to abandon compassion even when it costs you is your greatest spiritual achievement.",
      "Spiritual themes are prominent today as Jupiter in your chart opens doors to wisdom and meaning that you've been seeking. A meditation, artistic experience, or conversation with someone who truly sees you delivers a moment of genuine transcendence. Service to others comes naturally and fills rather than depletes you when done from genuine love rather than guilt.",
    ],
  };

  const WEEKLY_THEMES = {
    Aries:       "This week accelerates your professional trajectory. Mars forms supportive angles with Jupiter, widening your sphere of influence. A bold move mid-week pays dividends by Friday.",
    Taurus:      "Financial clarity arrives this week as Venus stations direct. A long-term investment decision becomes obvious. Weekend brings deeply pleasurable domestic experiences.",
    Gemini:      "Communications are your superpower this week. Presentations, negotiations, and creative pitches all go exceptionally well. A short trip or intellectual adventure reinvigorates your perspective.",
    Cancer:      "Family and home matters are highlighted with healing energy this week. A long-standing emotional pattern releases its grip, creating space for new joy. Trust your instincts in all decisions.",
    Leo:         "Your creativity and charisma are at a quarterly peak. A romantic or artistic opportunity arrives that deserves your full, enthusiastic engagement. Visibility works powerfully in your favor.",
    Virgo:       "A practical project you've been working on methodically reaches a satisfying completion. Your attention to detail is recognized and rewarded. Health improvements from consistent habits become clearly visible.",
    Libra:       "Relationship harmony deepens this week through honest, graceful communication. A partnership — personal or professional — reaches a new level of understanding and cooperation. Your aesthetic gifts are in demand.",
    Scorpio:     "Powerful transformational energy continues this week. Resources — financial, emotional, personal power — are the focus. Strategic patience now positions you excellently for next month's opportunities.",
    Sagittarius: "Expansion is the theme — new horizons, bigger thinking, international or cross-cultural connections. A teacher, course, or philosophical framework unlocks important personal growth. Adventure beckons.",
    Capricorn:   "Professional recognition arrives, potentially through an unexpected channel. Your reputation has been building quietly and now speaks for itself. A leadership responsibility feels heavy but ultimately suits you perfectly.",
    Aquarius:    "Community and collaboration produce breakthroughs this week. Your innovative ideas find receptive audiences. Technology or social systems thinking solves a problem you've been wrestling with.",
    Pisces:      "Intuition and creativity flow at peak intensity this week. Artistic work, healing modalities, and spiritual practice all yield extraordinary results. Boundaries protect your energy for what matters most.",
  };

  // ── Planet in Sign Interpretations ───────────────────────────────────────
  const PLANET_IN_SIGN = {
    Sun: {
      Aries: "The Sun in Aries infuses your core identity with bold, pioneering energy. You are fundamentally a trailblazer — someone who initiates rather than waits. Your self-expression is direct, enthusiastic, and refreshingly authentic. The Aries life lesson is to develop patience alongside courage, and to consider impact alongside intention.",
      Taurus: "The Sun in Taurus grounds your identity in the physical world and the realm of the senses. Security, beauty, and sustained value are the pillars of your self-expression. Your reliability is legendary among those who know you well. The Taurus growth edge involves releasing attachment to comfort when growth requires movement.",
      Gemini: "The Sun in Gemini makes you fundamentally a communicator, a connector, and a perpetual student of life's infinite variety. Your identity is expressed through language, learning, and the dynamic exchange of ideas. The world is more interesting because of your insatiable curiosity. The Gemini path involves choosing depth alongside breadth.",
      Cancer: "The Sun in Cancer makes home, family, and emotional safety the foundation of your identity. Your nurturing instinct is a defining quality — you create belonging wherever you go. Deep feelings are not a complication but a vital intelligence. The Cancer growth path involves offering yourself the same fierce protection you give others.",
      Leo: "The Sun rules Leo, and here your life-force shines at full brilliant wattage. Self-expression, creativity, and the desire to contribute something meaningful are central to who you are. Your generosity and warmth are genuine. The Leo path involves discovering that your worth is not contingent on performance or applause.",
      Virgo: "The Sun in Virgo makes discernment, service, and the pursuit of excellence central to your identity. You express yourself through usefulness — through solving, improving, healing, and refining. Your critical eye sees what others miss. The Virgo path involves extending the grace you offer others to yourself.",
      Libra: "The Sun in Libra makes relationship, harmony, and justice the central theater of your self-discovery. You see yourself most clearly in the mirror of relationship. Beauty and balance are genuine needs, not superficialities. The Libra path involves making clear decisions without waiting for universal agreement.",
      Scorpio: "The Sun in Scorpio places transformation, depth, and authentic power at the center of your identity. You are drawn to what is hidden, what is real beneath the surface, what endures. Intensity is your natural register. The Scorpio path involves learning that vulnerability shared with worthy people is a form of power, not its surrender.",
      Sagittarius: "The Sun in Sagittarius makes the search for meaning, wisdom, and ever-expanding horizons your defining drive. Freedom — to explore, to question, to believe according to your own inquiry — is not negotiable. Your optimism is a genuine spiritual gift. The Sagittarius path involves commitment to the journey without endlessly postponing arrival.",
      Capricorn: "The Sun in Capricorn places achievement, integrity, and long-term vision at the core of your identity. You understand that lasting things are built slowly and that real authority comes from demonstrated mastery, not proclamation. The Capricorn path involves allowing yourself to feel proud and joyful, not only productive.",
      Aquarius: "The Sun in Aquarius makes original thinking, humanitarian values, and the vision of a better future central to who you are. You are fundamentally a reformer — someone who sees what could be and works systematically toward it. The Aquarius path involves honoring personal emotions alongside universal ideals.",
      Pisces: "The Sun in Pisces places compassion, imagination, and spiritual sensitivity at the center of your being. You inhabit multiple worlds simultaneously and move through life with a porousness that allows profound empathy. Your creative and intuitive gifts are extraordinary. The Pisces path involves developing discernment to match your depth.",
    },

    Moon: {
      Aries: "Your Moon in Aries means your emotional needs are met through action, independence, and the opportunity to lead. You need to feel that you are moving forward. Emotional security comes from your own courage.",
      Taurus: "Your Moon in Taurus creates a deep need for stability, sensory pleasure, and emotional consistency. You feel most secure when your material world is ordered and beautiful.",
      Gemini: "Moon in Gemini means your emotional life is expressed through communication and understood through analysis. You need mental stimulation to feel secure and process feelings through conversation.",
      Cancer: "The Moon rules Cancer — here it is at full power, making your emotional world rich, complex, and deeply attuned to others. You feel everything, and this empathy is your greatest gift.",
      Leo: "Moon in Leo means you need to feel special, seen, and celebrated. Your emotional well-being depends on creative expression and the experience of bringing joy and warmth to others.",
      Virgo: "Moon in Virgo means you find emotional comfort through being useful, creating order, and caring for the health and functioning of those you love.",
      Libra: "Moon in Libra means harmony and partnership are essential to your emotional well-being. Discord feels genuinely distressing. You process feelings best through honest, calm conversation.",
      Scorpio: "Moon in Scorpio gives you emotional depth that few can match. You feel with extraordinary intensity and need relationships of profound trust and authenticity.",
      Sagittarius: "Moon in Sagittarius means freedom and philosophical understanding are emotional needs, not luxuries. Feeling trapped or intellectually stifled provokes genuine distress.",
      Capricorn: "Moon in Capricorn means you find emotional security through achievement, responsibility, and demonstrated competence. You may struggle to ask for comfort; receiving is as important as giving.",
      Aquarius: "Moon in Aquarius means you process emotions somewhat intellectually and need friends who accept your unconventional feeling-style. Community and shared ideals nourish you.",
      Pisces: "Moon in Pisces gives you one of the most empathic, intuitive emotional natures in the zodiac. You absorb feelings from your environment and need regular time in solitude to replenish.",
    },
  };

  // ── House Interpretations ─────────────────────────────────────────────────
  const HOUSE_MEANINGS = [
    { number: 1,  name: 'First House',   keyword: 'Identity & Appearance',    meaning: 'The First House governs your outer personality, physical appearance, and the mask you present to the world. Planets here are prominently visible in your life expression.' },
    { number: 2,  name: 'Second House',  keyword: 'Resources & Values',       meaning: 'The Second House rules your personal finances, possessions, and the values that guide your material choices. It shows how you earn and what you truly value beyond money.' },
    { number: 3,  name: 'Third House',   keyword: 'Communication & Mind',      meaning: 'The Third House governs how you think, speak, and process immediate experiences. It rules siblings, local travel, and the exchange of information in your daily life.' },
    { number: 4,  name: 'Fourth House',  keyword: 'Home & Roots',             meaning: 'The Fourth House represents your home, family of origin, ancestral patterns, and the private emotional foundation that supports your outer life.' },
    { number: 5,  name: 'Fifth House',   keyword: 'Creativity & Romance',     meaning: 'The Fifth House is the house of joy — creative expression, romance, children, play, and all forms of pleasurable self-expression. It shows how you love and create.' },
    { number: 6,  name: 'Sixth House',   keyword: 'Health & Service',         meaning: 'The Sixth House governs your daily routines, health practices, work environment, and attitude toward service. It shows how you maintain your body and contribute to ordinary life.' },
    { number: 7,  name: 'Seventh House', keyword: 'Partnership & Others',     meaning: 'The Seventh House is the primary house of partnership — marriage, committed relationships, and significant one-on-one connections. It also shows what qualities you project onto others.' },
    { number: 8,  name: 'Eighth House',  keyword: 'Transformation & Depth',   meaning: 'The Eighth House governs shared resources, sexuality, death, and profound transformation. It rules what is hidden beneath the surface — power, inheritance, and the process of deep change.' },
    { number: 9,  name: 'Ninth House',   keyword: 'Philosophy & Expansion',   meaning: 'The Ninth House rules higher education, philosophy, long-distance travel, and spiritual seeking. It represents your quest for meaning and the belief systems that shape your worldview.' },
    { number: 10, name: 'Tenth House',   keyword: 'Career & Public Life',     meaning: 'The Tenth House is the highest point of the chart, governing career, public reputation, authority, and your contribution to society. It shows the mountain you are climbing.' },
    { number: 11, name: 'Eleventh House',keyword: 'Community & Vision',       meaning: 'The Eleventh House governs friendships, social groups, collective ideals, and your vision for the future. It shows your relationship to community and your hopes and dreams.' },
    { number: 12, name: 'Twelfth House', keyword: 'Soul & Hidden Depths',     meaning: 'The Twelfth House rules the unconscious, spiritual retreat, hidden enemies, and undoing. It is the house of what is hidden from the self, and contains both your greatest vulnerabilities and your deepest spiritual gifts.' },
  ];

  // ── Aspect Interpretations ────────────────────────────────────────────────
  const ASPECT_MEANINGS = {
    Conjunction: {
      'Sun-Moon': 'A New Moon natally — your conscious will and instinctive emotional nature are deeply fused, creating powerful focus and consistency. You are what you feel, and you feel what you are.',
      'Sun-Venus': 'Your identity is deeply intertwined with beauty, love, and aesthetic experience. You are charming, relationship-oriented, and naturally artistic.',
      'Sun-Mars': 'Vitality, drive, and ambition are concentrated in your core identity. You are energetic, competitive (with yourself most of all), and direct in your pursuit of goals.',
      'Sun-Jupiter': 'An aspect of natural luck, expansion, and philosophical depth. You tend to attract opportunity and maintain an optimism that becomes self-fulfilling.',
      'Sun-Saturn': 'Your identity is shaped by responsibility, discipline, and a serious relationship to achievement. Growth feels earned — and that makes it more meaningful.',
      'Moon-Venus': 'Emotional and aesthetic harmony characterize this placement. You have refined emotional intelligence, genuine warmth, and a talent for creating beauty in your personal environment.',
      'Moon-Mars': 'Emotional intensity and reactive instincts combine. You feel deeply and react quickly. Learning to pause between stimulus and response is a lifelong — and very rewarding — practice.',
      'Venus-Mars': 'The principle of attraction meets the principle of desire. Your romantic and sexual nature is powerful, magnetic, and creative. Passion is central to your aliveness.',
      default: 'These two planetary principles operate with unusual intensity and fusion in your chart, blending their qualities into a single concentrated expression.'
    },
    Trine: {
      default: 'This harmonious trine (120°) indicates that these two planetary energies flow together naturally and supportively. The gifts this aspect offers can become so comfortable they\'re taken for granted — consciously engaging them unlocks their extraordinary potential.'
    },
    Sextile: {
      default: 'This sextile (60°) represents an opportunity aspect — these planetary forces can work well together when actively engaged. Unlike trines, sextiles require some conscious effort to activate but reward that effort generously.'
    },
    Square: {
      default: 'This square (90°) creates productive tension between these planetary forces. The friction generates energy, motivation, and ultimately, mastery — once the conflict is worked through consciously. Many of history\'s greatest achievers have chart full of squares.'
    },
    Opposition: {
      default: 'This opposition (180°) represents a polarity requiring integration. You may experience this as an inner tug-of-war, or project one pole onto other people. The path forward is holding both energies simultaneously rather than alternating between them.'
    },
  };

  // ── Retrograde Periods ────────────────────────────────────────────────────
  const RETROGRADE_SCHEDULE = [
    { planet: 'Mercury', start: '2025-03-15', end: '2025-04-07',  sign: 'Aries',    effect: 'Communication breakdowns, travel delays, and technology glitches are most likely. Review, revise, and revisit — but hold off on signing contracts or launching new projects.' },
    { planet: 'Mercury', start: '2025-07-18', end: '2025-08-11',  sign: 'Leo',      effect: 'Creative projects and communications need careful review. Creative blocks clear when you revisit earlier abandoned ideas.' },
    { planet: 'Mercury', start: '2025-11-09', end: '2025-11-29',  sign: 'Scorpio',  effect: 'Deep truths surface. Hidden information comes to light. Important revelations arrive through dreams and subtle channels.' },
    { planet: 'Venus',   start: '2025-03-01', end: '2025-04-12',  sign: 'Aries',    effect: 'Relationships and finances enter a reassessment period. Past loves and financial issues resurface for final resolution.' },
    { planet: 'Mars',    start: '2024-12-06', end: '2025-02-23',  sign: 'Cancer/Leo', effect: 'Energy levels and motivation fluctuate. Anger and frustration may internalize. Physical activity needs adjustment to avoid injury.' },
    { planet: 'Jupiter', start: '2025-11-11', end: '2026-03-11',  sign: 'Gemini',   effect: 'Expansion turns inward. Philosophy, higher learning, and spiritual growth are rewarded. External opportunities may slow.' },
    { planet: 'Saturn',  start: '2025-07-13', end: '2025-11-28',  sign: 'Aries',    effect: 'Responsibilities and limitations feel more pressing. Karma comes due. Patient, disciplined work on foundations is most productive.' },
  ];

  // ── Upcoming Eclipses ─────────────────────────────────────────────────────
  const ECLIPSE_SCHEDULE = [
    { type: 'Solar',  date: '2025-03-29', sign: 'Aries',   degree: '9°',  saros: 149, meaning: 'New beginnings in areas ruled by Aries — initiative, identity, courage. A powerful seed-planting eclipse that activates long-term goals set around this degree.' },
    { type: 'Lunar',  date: '2025-04-13', sign: 'Libra',   degree: '23°', saros: 132, meaning: 'Relationship patterns come to a culmination point. Partnerships — personal and professional — are highlighted for completion or renewal.' },
    { type: 'Solar',  date: '2025-09-21', sign: 'Virgo',   degree: '29°', saros: 143, meaning: 'A critical degree eclipse activating healing, service, and practical matters. What needs to be released before the next chapter can begin?' },
    { type: 'Lunar',  date: '2025-10-07', sign: 'Aries',   degree: '14°', saros: 118, meaning: 'Emotional culmination around independence, courage, and self-assertion. What have you outgrown? What boldness is ready to emerge?' },
    { type: 'Solar',  date: '2026-02-17', sign: 'Aquarius',degree: '28°', saros: 130, meaning: 'Community, innovation, and social vision receive fresh activation. Revolutionary ideas whose time has finally come find fertile ground.' },
  ];

  // ── Public Methods ────────────────────────────────────────────────────────

  function getDailyHoroscope(sign, date) {
    const Eph    = window.Ephemeris;
    const day    = date ? new Date(date) : new Date();
    const epochDay = Math.floor(day.getTime() / 86400000);
    const signObj  = Eph ? Eph.ZODIAC_SIGNS.find(s => s.name === sign) : { name: sign };

    const overviews = DAILY_OVERVIEWS[sign] || DAILY_OVERVIEWS.Aries;
    const idx       = Math.abs((signObj ? ZODIAC_SIGNS_ORDER.indexOf(sign) : 0) * 31 + epochDay) % overviews.length;

    // Generate lucky number and color
    const seed      = epochDay + (signObj ? ZODIAC_SIGNS_ORDER.indexOf(sign) + 1 : 1);
    const luckyNum  = (seed % 9) + 1;
    const colors    = ['Amethyst Purple', 'Celestial Gold', 'Midnight Blue', 'Emerald Green', 'Ruby Red', 'Pearl White', 'Sapphire', 'Rose Gold', 'Obsidian Black', 'Copper', 'Lavender', 'Turquoise'];
    const luckyColor= colors[seed % colors.length];

    const loveTexts = [
      "Venus smiles on your relationships today. Open your heart to both giving and receiving affection. A meaningful conversation deepens an existing bond.",
      "Romantic energy is electric today. Single? A chance meeting could be significant. Partnered? Plan something special and spontaneous.",
      "Emotional honesty in your closest relationship creates unexpected closeness. What you've been afraid to say is exactly what's needed.",
    ];
    const careerTexts = [
      "Your professional instincts are sharp today. Trust your read of the situation and act decisively on the opportunity in front of you.",
      "Collaboration is highly favored. A team effort produces results that surpass what you could achieve individually. Delegate with confidence.",
      "A long-term career move you've been considering becomes clearer. The timing aligns — preparation meets opportunity right now.",
    ];
    const healthTexts = [
      "Movement and vitality are highlighted. Honor your body's signals — both its energy and its need for rest. A new wellness habit takes root today.",
      "Mental clarity follows physical activity today. A walk, swim, or yoga session unlocks insights that no amount of desk-thinking could produce.",
      "Sleep quality significantly affects your energy this week. Protect your evening routine; what you do before bed shapes tomorrow's performance.",
    ];

    return {
      sign,
      date:       day.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      overview:   overviews[idx % overviews.length],
      love:       loveTexts[seed % loveTexts.length],
      career:     careerTexts[(seed + 1) % careerTexts.length],
      health:     healthTexts[(seed + 2) % healthTexts.length],
      weekly:     WEEKLY_THEMES[sign] || '',
      luckyNumber: luckyNum,
      luckyColor,
    };
  }

  const ZODIAC_SIGNS_ORDER = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];

  function getPlanetInterpretation(planet, sign) {
    return (PLANET_IN_SIGN[planet] && PLANET_IN_SIGN[planet][sign])
      || `${planet} in ${sign} blends ${planet}'s core principle with ${sign}'s qualities, creating a unique expression that colors this area of your chart.`;
  }

  function getHouseMeaning(number) {
    return HOUSE_MEANINGS.find(h => h.number === number) || HOUSE_MEANINGS[0];
  }

  function getAspectMeaning(aspectType, p1, p2) {
    const key   = `${p1}-${p2}`;
    const group = ASPECT_MEANINGS[aspectType];
    if (!group) return 'This planetary relationship adds texture and meaning to your chart.';
    return group[key] || group[`${p2}-${p1}`] || group.default;
  }

  function getRetrogradePeriods() { return RETROGRADE_SCHEDULE; }
  function getEclipseSchedule()   { return ECLIPSE_SCHEDULE; }

  function getBestMatches(sign) {
    const Eph  = window.Ephemeris;
    if (!Eph) return [];

    return ZODIAC_SIGNS_ORDER
      .filter(s => s !== sign)
      .map(s => ({ sign: s, ...Eph.getCompatibilityScore(sign, s) }))
      .sort((a, b) => b.overall - a.overall)
      .slice(0, 3);
  }

  // ── analyzeChart ─────────────────────────────────────────────────────────
  function analyzeChart(chart) {
    if (!chart || !chart.positions) return { personality:'', love:'', career:'', challenges:'', lifePurpose:'', keyPlacements:[] };
    const E = window.AstroEphemeris;
    const signOf = lon => E ? E.signName(lon) : '?';

    const sun  = signOf(chart.positions.Sun?.lon  || 0);
    const moon = signOf(chart.positions.Moon?.lon || 0);
    const asc  = chart.risingSign || signOf(chart.asc || 0);
    const mc   = signOf(chart.positions.MC?.lon || chart.mc || 0);
    const venus= signOf(chart.positions.Venus?.lon || 0);
    const saturn=signOf(chart.positions.Saturn?.lon|| 0);
    const node = signOf(chart.positions.NNode?.lon || 0);

    const personality = `With your Sun in ${sun}, Moon in ${moon}, and ${asc} Rising, you embody a unique fusion of ${sun} vitality, ${moon} emotional instincts, and ${asc} outward presentation. Your core identity is shaped by ${sun} themes — ${getPlanetInterpretation('Sun', sun)?.slice(0,120)||'personal power and self-expression'}. ` +
      `Emotionally, your ${moon} Moon gives you a ${moon === 'Cancer' || moon === 'Pisces' || moon === 'Scorpio' ? 'deep, intuitive' : moon === 'Aries' || moon === 'Leo' || moon === 'Sagittarius' ? 'fiery, spontaneous' : 'thoughtful, measured'} inner world. ` +
      `Others experience you first through your ${asc} Ascendant — ${moon === asc ? 'your inner and outer selves are notably aligned' : 'which can sometimes feel at odds with your deeper ${sun} Sun nature, creating the interesting complexity that makes you so compelling'}.`;

    const love = `Venus in ${venus} describes how you love and what you find beautiful. ${getPlanetInterpretation('Venus', venus)?.slice(0,200)||'You seek harmony and connection in relationships'}. ` +
      `Your ${asc} Rising shapes your approach to partnership — you attract partners who complement your ${asc} energy. ${chart.planetHouses?.Venus ? `Venus occupies your ${ordinal(chart.planetHouses.Venus)} house, emphasizing ${getHouseMeaning(chart.planetHouses.Venus)?.slice(0,80)||'relationship themes'}` : ''}.`;

    const career = `Your Midheaven in ${mc} points to public recognition through ${mc} themes. ${getPlanetInterpretation('Sun', mc)?.slice(0,120)||'leadership and self-expression'}. ` +
      `Saturn in ${saturn} describes your relationship with discipline, authority, and long-term achievement: ${getPlanetInterpretation('Saturn', saturn)?.slice(0,150)||'structured growth over time'}. ` +
      `The chart ruler (${chart.chartRuler || '?'}) adds its distinctive flavor to how you pursue your calling.`;

    const challenges = `Saturn in ${saturn} marks your primary growth edge — areas where resistance becomes wisdom. ${getPlanetInterpretation('Saturn', saturn)?.slice(0,160)||'Discipline and structure are your teachers'}. ` +
      `${chart.aspects?.filter(a => a.aspect === 'square' || a.aspect === 'opposition').slice(0,2).map(a => `The ${a.aspect} between your ${a.planet1} and ${a.planet2} (${a.orb.toFixed(1)}° orb) creates productive tension that demands integration.`).join(' ')||'Your chart shows a balance of challenge and support.'}`;

    const lifePurpose = `Your North Node in ${node} points toward your soul's evolutionary direction — moving toward ${node} qualities that may feel unfamiliar but deeply fulfilling. ` +
      `With your Sun in ${sun} and rising ${asc}, your purpose is expressed through ${sun} themes channeled through a ${asc} lens. ` +
      `The combination of your nodal axis and solar purpose suggests a life path centered on ${['authenticity','service','connection','transformation','wisdom','creativity'][Math.floor((chart.asc||0)/60) % 6]}.`;

    const keyPlacements = [
      `Sun in ${sun} (${ordinal(chart.planetHouses?.Sun||1)} house) — core identity and life force`,
      `Moon in ${moon} (${ordinal(chart.planetHouses?.Moon||1)} house) — emotional foundation`,
      `${asc} Rising — outward personality and life approach`,
      `Venus in ${venus} — love nature and aesthetic values`,
      `MC in ${mc} — career direction and public role`,
    ];

    return { personality, love, career, challenges, lifePurpose, keyPlacements };
  }

  function ordinal(n) {
    const s = ['th','st','nd','rd'];
    const v = n % 100;
    return n + (s[(v-20)%10]||s[v]||s[0]);
  }

  // ── calculateCompatibility ────────────────────────────────────────────────
  function calculateCompatibility(chart1, chart2) {
    if (!chart1 || !chart2) return { overall:50, love:50, communication:50, values:50, longTerm:50, passion:50, synastryAspects:[], overview:'' };
    const E = window.AstroEphemeris;
    const signOf = lon => E ? E.signName(lon) : '?';

    // Element compatibility matrix
    const elemCompat = {fire:{fire:80,air:85,earth:55,water:60}, earth:{earth:80,water:85,fire:55,air:60},
                        air:{air:80,fire:85,water:55,earth:60},  water:{water:80,earth:85,air:55,fire:60}};
    const elemOf = sign => ({Aries:'fire',Leo:'fire',Sagittarius:'fire',Taurus:'earth',Virgo:'earth',Capricorn:'earth',
                              Gemini:'air',Libra:'air',Aquarius:'air',Cancer:'water',Scorpio:'water',Pisces:'water'})[sign]||'fire';

    const sun1=signOf(chart1.positions?.Sun?.lon||0), sun2=signOf(chart2.positions?.Sun?.lon||0);
    const moon1=signOf(chart1.positions?.Moon?.lon||0), moon2=signOf(chart2.positions?.Moon?.lon||0);
    const venus1=signOf(chart1.positions?.Venus?.lon||0), venus2=signOf(chart2.positions?.Venus?.lon||0);
    const mars1=signOf(chart1.positions?.Mars?.lon||0), mars2=signOf(chart2.positions?.Mars?.lon||0);

    const base = elemCompat[elemOf(sun1)]?.[elemOf(sun2)] || 65;
    const moonScore  = elemCompat[elemOf(moon1)]?.[elemOf(moon2)] || 65;
    const venusScore = elemCompat[elemOf(venus1)]?.[elemOf(venus2)] || 65;
    const passionScore = (elemCompat[elemOf(venus1)]?.[elemOf(mars2)] || 65 +
                          elemCompat[elemOf(venus2)]?.[elemOf(mars1)] || 65) / 2;

    // Synastry aspects (simplified: major aspects between key planets)
    const synastryAspects = [];
    const p1list = ['Sun','Moon','Venus','Mars','Jupiter','Saturn'];
    const p2list = ['Sun','Moon','Venus','Mars','Jupiter','Saturn'];
    for (const p1 of p1list) {
      for (const p2 of p2list) {
        if (!chart1.positions?.[p1] || !chart2.positions?.[p2]) continue;
        const diff = Math.abs(((chart1.positions[p1].lon - chart2.positions[p2].lon) % 360 + 360) % 360);
        const norm = diff > 180 ? 360 - diff : diff;
        for (const {name, angle, orb} of (E?.ASPECT_DEFS||[])) {
          if (Math.abs(norm - angle) <= orb) {
            synastryAspects.push({
              p1, p2, aspect: name, orb: Math.abs(norm-angle).toFixed(1),
              interpretation: getAspectMeaning ? getAspectMeaning(`${p1}${p2}`, name)||`${p1}-${p2} ${name}: a ${name==='trine'||name==='sextile'?'harmonious':'dynamic'} connection in your composite energy.` : `${p1} ${name} ${p2}`
            });
            break;
          }
        }
      }
    }

    const jitter = (seed, range) => Math.floor(((Math.sin(seed)*0.5+0.5)) * range) - range/2;
    const seed = (sun1.charCodeAt(0)||65) * 7 + (sun2.charCodeAt(0)||65) * 13;
    const overall = Math.min(97, Math.max(20, Math.round((base + moonScore + venusScore) / 3 + jitter(seed, 10))));

    return {
      overall,
      love:          Math.min(97, Math.max(20, Math.round(venusScore + jitter(seed+1, 15)))),
      communication: Math.min(97, Math.max(20, Math.round(base + jitter(seed+2, 20)))),
      values:        Math.min(97, Math.max(20, Math.round(moonScore + jitter(seed+3, 15)))),
      longTerm:      Math.min(97, Math.max(20, Math.round((base+moonScore)/2 + jitter(seed+4, 10)))),
      passion:       Math.min(97, Math.max(20, Math.round(passionScore + jitter(seed+5, 20)))),
      synastryAspects,
      overview: `${sun1} Sun and ${sun2} Sun create a ${overall>=70?'naturally harmonious':'complex but growth-oriented'} dynamic. Your elemental natures ${elemOf(sun1)===elemOf(sun2)?'share the same element, creating natural understanding':'come from different elements, offering complementary strengths'}. The Moon in ${moon1} and Moon in ${moon2} ${elemOf(moon1)===elemOf(moon2)?'speak the same emotional language':'must learn each other\'s emotional dialects — a rewarding journey'}.`
    };
  }

  // ── getTransitAspects ─────────────────────────────────────────────────────
  function getTransitAspects(natalChart, transitPositions) {
    if (!natalChart || !transitPositions) return [];
    const E = window.AstroEphemeris;
    const aspects = [];
    const transitPlanets = ['Jupiter','Saturn','Uranus','Neptune','Pluto','Sun','Moon','Mercury','Venus','Mars'];
    const natalPlanets   = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','ASC','MC'];

    const TRANSIT_INTERPS = {
      'Jupiter_Sun_trine':    'Jupiter trine natal Sun: A period of exceptional luck, confidence, and expansion. Opportunities flow naturally toward you. Growth, recognition, and abundance are themes. Say yes to what aligns with your authentic path.',
      'Jupiter_Sun_conjunction': 'Jupiter conjunct natal Sun: A landmark year of growth and positive energy. Your confidence expands, opportunities multiply, and life rewards bold moves. Health and vitality are strong.',
      'Saturn_Sun_square':    'Saturn square natal Sun: A challenging test of your identity and will. Obstacles reveal where you need to strengthen. This friction, while uncomfortable, builds lasting character and capability.',
      'Saturn_Sun_conjunction':'Saturn conjunct natal Sun: A significant life restructuring period. Responsibilities increase, but so does your capacity for them. What you build now lasts. Seriousness and discipline yield long-term reward.',
      'Pluto_Sun_conjunction':'Pluto conjunct natal Sun: A profound transformation of identity. Old structures of self fall away to reveal deeper authenticity. This is one of the most powerful transits in astrology — regenerative and intense.',
      'Uranus_Sun_opposition':'Uranus opposition natal Sun: Unexpected disruptions to your life direction push you toward authentic freedom. Resistance intensifies the disruption; flexibility and openness ease the transition.',
      'Neptune_Sun_trine':    'Neptune trine natal Sun: Spiritual sensitivity, creative inspiration, and compassion are heightened. Your intuition is especially reliable. Artistic or healing work thrives under this gentle, ethereal influence.',
      'Jupiter_Moon_trine':   'Jupiter trine natal Moon: Emotional contentment, domestic harmony, and nurturing connections are highlighted. Family matters go smoothly. Your emotional generosity is both genuine and magnetic right now.',
      'Saturn_Moon_square':   'Saturn square natal Moon: Emotional responsibilities feel heavy. Old emotional patterns surface for examination. The work of this transit builds emotional maturity and authentic self-sufficiency.',
      'Pluto_Moon_conjunction':'Pluto conjunct natal Moon: Deep emotional transformation. Old wounds and unconscious patterns surface with intensity. The process is challenging but results in profound emotional depth and resilience.',
    };

    for (const tp of transitPlanets) {
      if (!transitPositions[tp]) continue;
      for (const np of natalPlanets) {
        if (!natalChart.positions?.[np]) continue;
        const diff = Math.abs(((transitPositions[tp].lon - natalChart.positions[np].lon) % 360 + 360) % 360);
        const norm = diff > 180 ? 360-diff : diff;
        for (const {name, angle, orb} of (E?.ASPECT_DEFS || [])) {
          const actualOrb = Math.abs(norm - angle);
          if (actualOrb <= orb) {
            const key = `${tp}_${np}_${name}`;
            const interp = TRANSIT_INTERPS[key] || `Transiting ${tp} forms a ${name} to your natal ${np} (${actualOrb.toFixed(1)}° orb). This ${name==='trine'||name==='sextile'?'harmonious':'dynamic'} transit activates ${np} themes in your chart, bringing ${name==='conjunction'?'intensification':name==='trine'?'ease and flow':name==='square'?'productive tension':'transformative energy'} to this area of life.`;
            aspects.push({
              transitPlanet: tp, natalPlanet: np, aspect: name,
              orb: actualOrb, strength: actualOrb < 2 ? 'major' : 'minor',
              interpretation: interp,
            });
            break;
          }
        }
      }
    }
    return aspects.sort((a,b) => a.orb - b.orb);
  }

  return {
    getDailyHoroscope,
    getPlanetInterpretation,
    getHouseMeaning,
    getAspectMeaning,
    getRetrogradePeriods,
    getEclipseSchedule,
    getBestMatches,
    analyzeChart,
    calculateCompatibility,
    getTransitAspects,
    ZODIAC_SIGNS_ORDER,
  };
})();

// Expose under both names
window.AstroInterpretations = window.Interpretations;


// ── SECTION 4: calculateCompatibility function ────────────────────────────
function calculateCompatibility(chart1, chart2) {
  // Returns: {overall, love, communication, values, longTerm, passion, synastryAspects[], overview}
  // All scores 0-100
  if (!chart1 || !chart2) {
    return { overall:50, love:50, communication:50, values:50, longTerm:50, passion:50, synastryAspects:[], overview:'Insufficient chart data.' };
  }

  const ELEMENT_MAP = {
    Aries:'fire', Leo:'fire', Sagittarius:'fire',
    Taurus:'earth', Virgo:'earth', Capricorn:'earth',
    Gemini:'air', Libra:'air', Aquarius:'air',
    Cancer:'water', Scorpio:'water', Pisces:'water'
  };

  const MODALITY_MAP = {
    Aries:'cardinal', Cancer:'cardinal', Libra:'cardinal', Capricorn:'cardinal',
    Taurus:'fixed', Leo:'fixed', Scorpio:'fixed', Aquarius:'fixed',
    Gemini:'mutable', Virgo:'mutable', Sagittarius:'mutable', Pisces:'mutable'
  };

  // Element compatibility base scores
  const ELEMENT_COMPAT = {
    'fire_air':88, 'air_fire':88,
    'earth_water':87, 'water_earth':87,
    'fire_fire':75, 'earth_earth':78,
    'air_air':74, 'water_water':76,
    'fire_earth':57, 'earth_fire':57,
    'fire_water':52, 'water_fire':52,
    'air_water':58, 'water_air':58,
    'earth_air':62, 'air_earth':62
  };

  function getElementScore(sign1, sign2) {
    const e1 = ELEMENT_MAP[sign1] || 'fire';
    const e2 = ELEMENT_MAP[sign2] || 'fire';
    return ELEMENT_COMPAT[`${e1}_${e2}`] || 65;
  }

  function getModalityBonus(sign1, sign2) {
    const m1 = MODALITY_MAP[sign1];
    const m2 = MODALITY_MAP[sign2];
    if (m1 === m2) return -3;  // same modality can be competitive
    if ((m1 === 'cardinal' && m2 === 'mutable') || (m1 === 'mutable' && m2 === 'cardinal')) return 4;
    if ((m1 === 'fixed' && m2 === 'mutable') || (m1 === 'mutable' && m2 === 'fixed')) return 5;
    return 2;
  }

  const sign1 = chart1.sunSign || 'Aries';
  const sign2 = chart2.sunSign || 'Aries';
  const moon1 = chart1.moonSign || sign1;
  const moon2 = chart2.moonSign || sign2;
  const venus1 = chart1.venusSign || sign1;
  const venus2 = chart2.venusSign || sign2;
  const mars1 = chart1.marsSign || sign1;
  const mars2 = chart2.marsSign || sign2;
  const mercury1 = chart1.mercurySign || sign1;
  const mercury2 = chart2.mercurySign || sign2;
  const rising1 = chart1.rising || sign1;
  const rising2 = chart2.rising || sign2;

  // Sun-Sun compatibility (35% weight)
  const sunScore = getElementScore(sign1, sign2) + getModalityBonus(sign1, sign2);

  // Moon-Moon compatibility (30% weight)
  let moonScore = getElementScore(moon1, moon2);
  if (moon1 === moon2) moonScore += 15;
  else if (ELEMENT_MAP[moon1] === ELEMENT_MAP[moon2]) moonScore += 10;
  else moonScore += getModalityBonus(moon1, moon2);

  // Venus compatibility (20% weight)
  let venusScore = getElementScore(venus1, venus2);
  if (venus1 === venus2) venusScore += 12;
  // Venus-Mars cross-compatibility bonus
  const venusMars12 = getElementScore(venus1, mars2);
  const venusMars21 = getElementScore(venus2, mars1);
  const passionBase = Math.round((venusMars12 + venusMars21) / 2);

  // Communication (Mercury)
  const mercuryScore = getElementScore(mercury1, mercury2) + getModalityBonus(mercury1, mercury2);

  // Rising compatibility
  const risingScore = getElementScore(rising1, rising2);

  // Weighted overall
  const rawOverall = (sunScore * 0.35) + (moonScore * 0.30) + (venusScore * 0.20) + (mercuryScore * 0.15);

  // Deterministic variance based on sign combination
  const seedStr = sign1 + sign2 + moon1 + moon2;
  let hashSeed = 0;
  for (let i = 0; i < seedStr.length; i++) hashSeed = (hashSeed * 31 + seedStr.charCodeAt(i)) >>> 0;
  const variance = ((hashSeed % 11) - 5);

  function clamp(v) { return Math.min(97, Math.max(20, Math.round(v))); }

  const overall      = clamp(rawOverall + variance);
  const love         = clamp((venusScore + getElementScore(venus1, mars2) + getElementScore(venus2, mars1)) / 3 + variance * 0.8);
  const communication= clamp(mercuryScore + getElementScore(sign1, sign2) * 0.3 + variance);
  const values       = clamp((moonScore + getElementScore(sign1, sign2)) / 2 + variance * 0.5);
  const longTerm     = clamp((sunScore * 0.4 + moonScore * 0.4 + risingScore * 0.2) + variance * 0.7);
  const passion      = clamp(passionBase + venusScore * 0.3 + variance * 1.2);

  // Synastry aspects
  const synastryAspects = [];
  const ASPECT_DEFS = [
    {name:'conjunction', angle:0, orb:8},
    {name:'sextile', angle:60, orb:4},
    {name:'square', angle:90, orb:6},
    {name:'trine', angle:120, orb:6},
    {name:'opposition', angle:180, orb:8}
  ];

  const SIGN_DEGREES = {
    Aries:0, Taurus:30, Gemini:60, Cancer:90, Leo:120, Virgo:150,
    Libra:180, Scorpio:210, Sagittarius:240, Capricorn:270, Aquarius:300, Pisces:330
  };

  const p1Placements = {
    Sun: chart1.sunSign, Moon: chart1.moonSign, Venus: chart1.venusSign,
    Mars: chart1.marsSign, Mercury: chart1.mercurySign
  };
  const p2Placements = {
    Sun: chart2.sunSign, Moon: chart2.moonSign, Venus: chart2.venusSign,
    Mars: chart2.marsSign, Mercury: chart2.mercurySign
  };

  const SYNASTRY_INTERPS = {
    'Sun_trine_Sun': 'Your solar energies harmonize naturally — you share a fundamental orientation toward life that makes cooperation feel effortless.',
    'Sun_opposition_Sun': 'Your solar energies are opposite but complementary — you can balance and complete each other when you recognize the polarity as a gift.',
    'Sun_square_Sun': 'Your solar energies create productive friction — you challenge each other to grow beyond your individual comfort zones.',
    'Sun_conjunction_Sun': 'Identical solar energies create strong recognition and shared purpose, though you may lack the polarity that keeps relationships dynamic.',
    'Moon_trine_Moon': 'Your emotional natures harmonize beautifully — you instinctively understand each other\'s feelings and needs.',
    'Moon_conjunction_Moon': 'Your emotional natures are almost identical — deep mutual understanding and extraordinary emotional attunement characterize your bond.',
    'Moon_opposition_Moon': 'Your emotional needs are complementary opposites — each of you provides what the other instinctively seeks.',
    'Moon_square_Moon': 'Your emotional needs create tension that requires conscious work — but this work deepens both of you significantly.',
    'Venus_trine_Venus': 'Your aesthetic sensibilities and love natures harmonize naturally — shared pleasures, beauty, and affectionate styles align beautifully.',
    'Venus_conjunction_Venus': 'Your values and love natures are closely aligned — you want the same things from love and express affection in similar ways.',
    'Venus_trine_Mars': 'Attraction and love flow easily between you — the spark between your Venus and Mars creates natural romantic chemistry.',
    'Venus_opposition_Mars': 'Powerful magnetic attraction characterizes your bond — the polarity between your Venus and Mars creates intense romantic and sexual energy.',
    'Venus_square_Mars': 'Passionate tension and creative conflict characterize your romantic connection — the square produces heat that can be either productive or consuming.',
    'Sun_trine_Moon': 'A harmonious connection between will and feeling — one person\'s solar confidence supports the other\'s emotional needs naturally.',
    'Sun_conjunction_Moon': 'A deeply personal connection — one person\'s solar identity resonates profoundly with the other\'s emotional nature.',
    'Mercury_trine_Mercury': 'Effortless communication and intellectual understanding — you think similarly and find each other\'s minds naturally engaging.',
    'Mercury_sextile_Mercury': 'Good communication and complementary thinking styles create productive intellectual exchange.',
    'Mercury_square_Mercury': 'Your communication styles create friction that, when worked through, produces much clearer and more honest exchange.',
    'default': 'This planetary connection between your charts adds a layer of interaction that both challenges and enriches your connection.'
  };

  for (const [p1name, p1sign] of Object.entries(p1Placements)) {
    for (const [p2name, p2sign] of Object.entries(p2Placements)) {
      if (!p1sign || !p2sign) continue;
      const deg1 = SIGN_DEGREES[p1sign] + 15;  // use midpoint of sign
      const deg2 = SIGN_DEGREES[p2sign] + 15;
      const rawDiff = Math.abs(deg1 - deg2);
      const diff = rawDiff > 180 ? 360 - rawDiff : rawDiff;

      for (const {name, angle, orb} of ASPECT_DEFS) {
        const orbActual = Math.abs(diff - angle);
        if (orbActual <= orb) {
          const key = `${p1name}_${name}_${p2name}`;
          const reverseKey = `${p2name}_${name}_${p1name}`;
          const interp = SYNASTRY_INTERPS[key] || SYNASTRY_INTERPS[reverseKey] || SYNASTRY_INTERPS['default'];
          synastryAspects.push({
            planet1: p1name, planet2: p2name, aspect: name,
            orb: orbActual.toFixed(1),
            harmony: name === 'trine' || name === 'sextile' || name === 'conjunction' ? 'harmonious' : 'dynamic',
            interpretation: `${p1name} ${name} ${p2name}: ${interp}`
          });
          break;
        }
      }
    }
  }

  const COMPAT_NARRATIVES = {
    'fire_air': 'Your fire-air combination creates natural inspiration and excitement — you fan each other\'s flames and keep the energy intellectually alive.',
    'earth_water': 'Your earth-water bond creates natural nourishment — you provide practical grounding for each other\'s emotional depth.',
    'fire_fire': 'Two fire signs create passionate intensity and mutual inspiration, but you must ensure you don\'t compete for the spotlight.',
    'earth_earth': 'Two earth signs create lasting stability and shared practical values — your bond is built to endure through consistent, quiet loyalty.',
    'air_air': 'Two air signs create a richly intellectual bond full of stimulating conversation, though you may both need help staying emotionally grounded.',
    'water_water': 'Two water signs create profound emotional attunement and deep intuitive understanding — your bond runs beneath the surface.',
    'fire_earth': 'Fire and earth create a complementary tension — one provides spark, the other provides substance, and learning each other\'s pace is the key.',
    'fire_water': 'Fire and water create passionate but challenging chemistry — your natures are fundamentally different in ways that both attract and frustrate.',
    'air_water': 'Air and water create an interesting tension between thought and feeling — you each offer what the other sometimes lacks.',
    'earth_air': 'Earth and air combine practical intelligence with conceptual insight — you work well together when you respect each other\'s different orientations.'
  };

  const elem1 = ELEMENT_MAP[sign1] || 'fire';
  const elem2 = ELEMENT_MAP[sign2] || 'fire';
  const narrativeKey = `${elem1}_${elem2}`;
  const baseNarrative = COMPAT_NARRATIVES[narrativeKey] || COMPAT_NARRATIVES[`${elem2}_${elem1}`] || 'Your combination creates a unique dynamic with both complementary gifts and growth-inducing challenges.';

  const moonNarrative = moon1 === moon2
    ? `Your Moon signs are identical — you share an almost telepathic emotional understanding.`
    : ELEMENT_MAP[moon1] === ELEMENT_MAP[moon2]
    ? `Your Moon signs share the same element, giving you natural emotional attunement despite individual differences.`
    : `Your Moon signs come from different elements, meaning you will need to learn each other\'s emotional languages — a rewarding journey.`;

  const overview = `${sign1} and ${sign2} — ${baseNarrative} ${moonNarrative} Overall compatibility of ${overall}% reflects both your natural resonance and the specific growth opportunities this pairing offers. ${overall >= 80 ? 'This is a highly compatible combination with natural ease and mutual understanding.' : overall >= 65 ? 'This combination has genuine potential that develops through mutual understanding and respect.' : 'This combination requires conscious effort and genuine appreciation of your differences, but these differences can be your greatest teachers.'}`;

  return { overall, love, communication, values, longTerm, passion, synastryAspects, overview };
}

// ── SECTION 5: getTransitAspects function ────────────────────────────────
function getTransitAspects(natalChart, transitPositions) {
  if (!natalChart || !transitPositions) return [];

  const TRANSIT_INTERPRETATIONS = {
    // JUPITER TRANSITS
    'Jupiter_Sun': "Jupiter transiting your natal Sun activates a significant period of growth, opportunity, and expanding confidence. Your sense of identity expands, and you tend to attract recognition, opportunity, and good fortune almost effortlessly during this period. Use this window to take bold steps toward your most meaningful goals — Jupiter's benefic energy amplifies whatever you put genuine effort into.",
    'Jupiter_Moon': "Jupiter transiting your natal Moon brings emotional expansion, increased warmth, and a period of genuine contentment. Family relationships tend to improve, domestic life flourishes, and your emotional generosity attracts people and situations that nourish you. This is an excellent time for anything related to home, family, or emotional healing.",
    'Jupiter_Mercury': "Jupiter transiting your natal Mercury expands your mental horizons significantly — thinking becomes more philosophical, communications are persuasive and well-received, and learning opportunities arrive in abundance. This is an excellent time for writing, publishing, study, travel, and any communication-heavy professional endeavors.",
    'Jupiter_Venus': "Jupiter transiting your natal Venus is one of the most fortunate love and financial transits available — your charm and magnetism expand, romantic opportunities multiply, and financial abundance tends to follow your increased confidence. Relationships deepen and new connections form with unusual ease and genuine warmth.",
    'Jupiter_Mars': "Jupiter transiting your natal Mars amplifies your energy, courage, and drive to an exceptional degree. Ambitious projects receive the sustained energy they require, physical vitality is high, and the confidence to act boldly on your best instincts is readily available. This is an excellent time for launching new initiatives and pursuing long-deferred goals.",
    'Jupiter_Jupiter': "Jupiter returning to its natal position — the Jupiter Return — marks a significant milestone of approximately twelve years. This is a major period of life expansion, philosophical renewal, and the beginning of a new twelve-year cycle of growth. Review what you have learned and accomplished, and set intentions for the new cycle with genuine ambition.",
    'Jupiter_Saturn': "Jupiter transiting your natal Saturn brings a welcome period of optimism and opportunity to areas where you have been working hard with discipline and patience. Long-standing efforts begin to pay off, and the structures you have been building receive the recognition and expansion that your sustained effort deserves. Balance expansion with the Saturnian wisdom of sustainable growth.",

    // SATURN TRANSITS
    'Saturn_Sun': "Saturn transiting your natal Sun is a significant period of testing, restructuring, and the building of genuine authority. You may feel that the world demands more from you than usual, that obstacles are more numerous, and that your usual confidence requires more effort to sustain. This transit, however difficult, builds the specific capabilities that your next level of development requires — what you construct now will last.",
    'Saturn_Moon': "Saturn transiting your natal Moon creates a period of emotional sobriety, increased responsibility, and the challenge of balancing your own needs with the demands of others. Emotional patterns from the past surface for examination and revision. This transit builds emotional maturity and the capacity for deeply committed, responsible relationships — the work is real, and so are the results.",
    'Saturn_Mercury': "Saturn transiting your natal Mercury demands precision, sustained mental focus, and the discipline to develop genuine expertise rather than broad knowledge. Communication slows down, but what you do communicate carries more weight and authority. This is an excellent transit for writing a book, mastering a technical skill, or developing an area of genuine intellectual depth.",
    'Saturn_Venus': "Saturn transiting your natal Venus brings a period of testing in relationships and finances — you may experience greater seriousness, responsibility, or limitation in these areas. The relationships that survive this transit are the ones built on genuine mutual respect and shared values rather than convenience or attraction alone. Financial discipline practiced now produces excellent long-term results.",
    'Saturn_Mars': "Saturn transiting your natal Mars creates a period of significant friction between your drive to act and the demands for patience, preparation, and strategic delay. Your energy may feel blocked or frustrating, but this restraint is building the capacity for disciplined, precisely timed action that impulsive Mars energy alone cannot achieve. Mastery of this transit is the difference between force and power.",
    'Saturn_Jupiter': "Saturn transiting your natal Jupiter brings your optimistic visions into contact with practical reality — this is the transit that separates workable ideas from wish-fulfillment. Projects that have real substance are refined and strengthened; those built on unrealistic assumptions require honest revision. The result of this disciplined engagement with your vision is a more achievable, more durable version of your dreams.",
    'Saturn_Saturn': "The Saturn opposition (around age 44) and Saturn Return (around ages 29 and 58) are among the most significant transits in the astrological calendar. These are periods of major life reassessment, restructuring of identity and purpose, and the confrontation with questions about whether your current life reflects your genuine values and authentic ambitions. What you build now — in integrity and genuine commitment — is what lasts.",

    // URANUS TRANSITS
    'Uranus_Sun': "Uranus transiting your natal Sun brings a period of radical change in your sense of identity and life direction — the authentic self that has been compressed or unexpressed in your current life structure now demands freedom and genuine expression. Disruptions to your established path are not disasters but liberations, even when they feel destabilizing. Flexibility, openness, and genuine self-honesty are your best navigational tools.",
    'Uranus_Moon': "Uranus transiting your natal Moon creates sudden and often unexpected shifts in your emotional landscape, domestic situation, or relationship to family. What you feel, what you need, and how you define home and belonging may shift dramatically. Your emotional independence and the freedom to be authentically yourself in your most intimate relationships becomes a non-negotiable priority.",
    'Uranus_Mercury': "Uranus transiting your natal Mercury produces sudden intellectual breakthroughs, radical shifts in how you think, and the arrival of unconventional ideas that disrupt your previous mental frameworks. Genius-level insights are available, but so is mental erraticism — ground your most inspired thinking before acting on it. Technology, science, and innovative communication are especially activated.",
    'Uranus_Venus': "Uranus transiting your natal Venus brings sudden and unexpected changes in your love life, financial situation, or aesthetic values. Relationships that no longer serve your authentic freedom may end abruptly; new connections form with electric suddenness and genuine originality. Your values are undergoing a radical update, and this process is ultimately liberating even when it feels destabilizing.",
    'Uranus_Mars': "Uranus transiting your natal Mars creates explosive bursts of energy, sudden changes in direction, and the restless need for freedom and originality in how you pursue your goals. You may feel an urgent need to break free from any situation that feels confining or inauthentic. Channel this revolutionary energy into genuine innovation rather than mere disruption.",
    'Uranus_Jupiter': "Uranus transiting your natal Jupiter brings sudden, unexpected opportunities for major expansion — breakthroughs in business, education, philosophical understanding, or geographical movement arrive with surprising speed. This is an exceptionally inventive period where your most original ideas receive genuine support. Stay alert and agile, as the opportunities may not announce themselves in advance.",
    'Uranus_Saturn': "Uranus transiting your natal Saturn creates a fundamental tension between your established structures and the revolutionary forces of change. Rigid systems, outdated rules, and structures maintained by habit rather than genuine value come under pressure. This transit invites you to distinguish between structures worth preserving and those that have outlived their purpose — liberating in the long run, though potentially disruptive in the process.",

    // NEPTUNE TRANSITS
    'Neptune_Sun': "Neptune transiting your natal Sun is one of the most spiritually significant and potentially confusing transits in the astrological lexicon. Your sense of ego and personal identity becomes more fluid, permeable, and spiritually open — which can be experienced as profound inspiration and heightened compassion, or as confusion, disillusionment, and loss of direction. Spiritual practice, creative work, and honest self-examination are essential navigational tools.",
    'Neptune_Moon': "Neptune transiting your natal Moon heightens your intuition, empathy, and psychic sensitivity to extraordinary levels, while also creating vulnerability to emotional confusion, boundary dissolution, and the projection of your own feelings onto others. Dreams are vivid and often prophetically relevant. Spiritual and creative work flourish under this influence, while practical matters may feel unusually difficult to navigate clearly.",
    'Neptune_Mercury': "Neptune transiting your natal Mercury creates a period of heightened creative and intuitive thinking alongside potential confusion about facts, schedules, and practical details. Your imagination is exceptional and your poetic, symbolic, and spiritual thinking is at its most productive. Poetry, music, visionary writing, and any work requiring access to the unconscious mind is strongly supported. Ground yourself in practical details to avoid significant errors.",
    'Neptune_Venus': "Neptune transiting your natal Venus brings a period of idealized, spiritualized, and sometimes confused love experiences. Romantic relationships may seem magical and otherworldly, or may involve illusion, deception, or the painful collision of an ideal with reality. Creative and artistic work, however, is genuinely inspired. The transit's gift is expanded compassion, spiritual love, and the dissolution of barriers between self and other.",
    'Neptune_Mars': "Neptune transiting your natal Mars gradually dissolves the clarity and directness of your drive — you may find that your usual confidence in action gives way to confusion about what you want, passive-aggressive patterns, or the spiritual aspiration to act from selfless motives rather than ego-driven desire. This transit produces spiritual warriors and inspired artists when its subtler gifts are engaged consciously.",
    'Neptune_Jupiter': "Neptune transiting your natal Jupiter creates a period of spiritual expansion, mystical seeking, and the desire for transcendence and ultimate meaning. This can be a profoundly inspiring period of religious or spiritual development, creative vision, and compassionate service. The shadow of this transit is spiritual grandiosity, impractical idealism, or the flight into fantasy as a substitute for genuine development.",
    'Neptune_Saturn': "Neptune transiting your natal Saturn gently dissolves the rigid structures and limiting beliefs that Saturn has solidified in your life. Responsibilities that no longer serve your genuine purpose fade away, rigid self-definitions become more fluid, and the spiritual dimensions of your practical life become increasingly visible. This transit invites you to rebuild your structures on genuinely spiritual and compassionate foundations.",

    // PLUTO TRANSITS
    'Pluto_Sun': "Pluto transiting your natal Sun is one of the most profound transformations available to a human life — the entire structure of your identity is dismantled at a level deeper than ego, rebuilt, and ultimately regenerated into something more authentic, more powerful, and more aligned with your soul's genuine purpose. This transit is intense, often feels like a death of the self you were, and is among the most significant of the major life events astrology maps.",
    'Pluto_Moon': "Pluto transiting your natal Moon brings the most profound emotional transformation available — unconscious patterns, ancestral wounds, deeply buried emotional material, and the foundations of your psychological security all come into the light of Plutonian truth. The process is intense, sometimes overwhelming, but ultimately regenerative — you emerge with an emotional depth, resilience, and authenticity that cannot be acquired any other way.",
    'Pluto_Mercury': "Pluto transiting your natal Mercury transforms your thinking at the most fundamental level — you begin to perceive the hidden structures beneath surface realities, to think in terms of power and depth rather than surface information, and to communicate with a penetrating intensity that others find both illuminating and occasionally uncomfortable. This transit produces profound researchers, investigative journalists, depth psychologists, and transformative writers.",
    'Pluto_Venus': "Pluto transiting your natal Venus brings profound transformation to your experience of love, beauty, money, and your fundamental values. Relationships that were maintained by comfort, habit, or fear rather than genuine love do not survive this transit. What remains — or what is created new within this window — is deeply authentic, soulfully connected, and more truly aligned with who you are becoming.",
    'Pluto_Mars': "Pluto transiting your natal Mars creates the most intense transformation of your drive, your relationship to power, and your relationship to desire. You may experience this as overwhelming compulsion, as the confrontation with your own shadow aggression, or as the gradual emergence of a deeper, more sustainable form of personal power than the reactive, ego-driven Mars energy that preceded it. Athletes, transformers, and regenerators are made in this crucible.",
    'Pluto_Jupiter': "Pluto transiting your natal Jupiter brings profound transformation to your beliefs, your philosophy, your relationship to abundance, and your understanding of what constitutes genuine growth and expansion. Religious or philosophical convictions are tested to their core; what survives is genuine wisdom rather than inherited assumption. The philosophical framework you build through this process is genuinely transformative for everyone it touches.",
    'Pluto_Saturn': "Pluto transiting your natal Saturn is a generational transit that dismantles and rebuilds the fundamental structures of your life — the systems of authority, discipline, and long-term commitment that Saturn governs are subjected to Plutonian transformation at the deepest level. What is genuinely essential in your life structures survives and is strengthened; what is maintained by fear, habit, or outdated authority dissolves to make room for structures of genuine power and integrity."
  };

  const ASPECT_DEFS = [
    {name:'conjunction', angle:0, orb:8},
    {name:'sextile', angle:60, orb:4},
    {name:'square', angle:90, orb:6},
    {name:'trine', angle:120, orb:6},
    {name:'opposition', angle:180, orb:8}
  ];

  const PLANET_DEGREES = {
    Aries:0, Taurus:30, Gemini:60, Cancer:90, Leo:120, Virgo:150,
    Libra:180, Scorpio:210, Sagittarius:240, Capricorn:270, Aquarius:300, Pisces:330
  };

  const transitPlanets = ['Jupiter','Saturn','Uranus','Neptune','Pluto'];
  const natalPlanets   = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn'];

  function getSignDeg(sign) {
    return (PLANET_DEGREES[sign] || 0) + 15;
  }

  function getTransitDeg(tPlanet) {
    if (transitPositions[tPlanet]) {
      if (typeof transitPositions[tPlanet] === 'number') return transitPositions[tPlanet];
      if (transitPositions[tPlanet].lon !== undefined) return transitPositions[tPlanet].lon;
      if (transitPositions[tPlanet].sign) return getSignDeg(transitPositions[tPlanet].sign);
    }
    return null;
  }

  function getNatalDeg(nPlanet) {
    if (natalChart.positions && natalChart.positions[nPlanet]) {
      const p = natalChart.positions[nPlanet];
      if (typeof p === 'number') return p;
      if (p.lon !== undefined) return p.lon;
    }
    // Fallback to sign-based
    const signKey = nPlanet.toLowerCase() + 'Sign';
    const fallbackSign = natalChart[signKey] || natalChart.sunSign;
    return fallbackSign ? getSignDeg(fallbackSign) : null;
  }

  const aspects = [];

  for (const tp of transitPlanets) {
    const tDeg = getTransitDeg(tp);
    if (tDeg === null) continue;

    for (const np of natalPlanets) {
      const nDeg = getNatalDeg(np);
      if (nDeg === null) continue;

      const rawDiff = Math.abs(tDeg - nDeg) % 360;
      const diff = rawDiff > 180 ? 360 - rawDiff : rawDiff;

      for (const {name, angle, orb} of ASPECT_DEFS) {
        const orbActual = Math.abs(diff - angle);
        if (orbActual <= orb) {
          const interpKey = `${tp}_${np}`;
          const baseInterp = TRANSIT_INTERPRETATIONS[interpKey] ||
            `Transiting ${tp} forms a ${name} to your natal ${np}, activating themes of ${np}-related life areas with ${tp}'s particular quality of transformation. This ${orbActual < 2 ? 'exact' : orbActual < 4 ? 'close' : 'applying'} aspect carries ${name === 'conjunction' ? 'intensified focus and new beginnings' : name === 'trine' ? 'harmonious flow and natural opportunity' : name === 'sextile' ? 'cooperative potential awaiting your engagement' : name === 'square' ? 'productive friction demanding growth and adjustment' : 'awareness through polarity and the integration of opposites'} in its energy.`;

          const aspectQuality = name === 'trine' || name === 'sextile' ? 'harmonious' : name === 'conjunction' ? 'intensifying' : 'dynamic';

          aspects.push({
            transitPlanet: tp,
            natalPlanet: np,
            aspect: name,
            orb: orbActual,
            strength: orbActual < 2 ? 'exact' : orbActual < 5 ? 'close' : 'wide',
            quality: aspectQuality,
            interpretation: baseInterp
          });
          break;
        }
      }
    }
  }

  return aspects.sort((a, b) => a.orb - b.orb);
}

// Merge global helpers into the main export (overriding IIFE versions with fuller implementations)
window.AstroInterpretations = Object.assign({}, window.Interpretations, {
  calculateCompatibility,
  getTransitAspects,
});
