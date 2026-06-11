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

