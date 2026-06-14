/**
 * AstroPrecise — AstroJourney
 * Cosmic life journey engine: life chapters, planetary returns, personal year,
 * milestones, and recommendations derived from a birth date.
 * Self-contained vanilla JS, no dependencies.
 */

window.AstroJourney = (function () {
  'use strict';

  // ── Astronomical constants ────────────────────────────────────────────────────

  const SATURN_PERIOD  = 29.457;   // years
  const JUPITER_PERIOD = 11.862;   // years
  const NODE_PERIOD    = 18.613;   // years (mean nodal regression cycle)

  // Active window (±years) around an exact return
  const SATURN_WINDOW  = 2.5;
  const JUPITER_WINDOW = 1.5;
  const NODE_WINDOW    = 1.2;

  // ── Life chapter definitions ──────────────────────────────────────────────────

  const CHAPTERS = [
    {
      id: 'youth',
      name: 'The Dreaming',
      ageRange: [0, 12],
      theme: 'The pure unformed self learns it exists',
      planet: 'Moon',
      glyph: '☽',
      icon: '<svg class="eng-i" aria-hidden="true"><use href="#ei-crescent"/></svg>',
      narrative: 'The world pours in without filter. You are all instinct and wonder, shaped by the hands that hold you and the stories told around you. Identity has not yet been chosen — it is absorbed, felt, known in the body before the mind has words for it.',
      invitation: 'What did you love before anyone told you what to love?',
    },
    {
      id: 'adolescence',
      name: 'The Awakening',
      ageRange: [12, 24],
      theme: 'Individuation — discovering where you end and others begin',
      planet: 'Sun',
      glyph: '☉',
      icon: '<svg class="eng-i" aria-hidden="true"><use href="#ei-sunhigh"/></svg>',
      narrative: 'The chrysalis phase: everything that was comfortable cracks open. Ideals collide with reality, the self is tested by belonging and rejection, and the first real questions of purpose begin to echo through you. The fire you discover here — however buried — is the one you will tend for the rest of your life.',
      invitation: 'Where did you first feel truly yourself?',
    },
    {
      id: 'threshold1',
      name: 'The First Threshold',
      ageRange: [24, 28],
      theme: 'The scaffolding of adult life is assembled or questioned',
      planet: 'Mars',
      glyph: '♂',
      icon: '<svg class="eng-i" aria-hidden="true"><use href="#ei-flame"/></svg>',
      narrative: 'You have left the protected territory and stand in the open. The choices made here — vocation, partnership, city, conviction — carry unusual weight because they are the first ones made purely in your own name. Not every door chosen is the right one; that is exactly the point.',
      invitation: 'Which door are you standing in front of that only you can open?',
    },
    {
      id: 'saturn1',
      name: 'The First Calling',
      ageRange: [28, 35],
      theme: 'Identity stripped bare and rebuilt in your own image',
      planet: 'Saturn',
      glyph: '♄',
      icon: '⊕',
      narrative: 'Saturn returns and asks for your credentials. Structures that were inherited rather than chosen begin to show their cracks. The path of least resistance is no longer available — only the path that is true. Those who meet this chapter with courage emerge knowing precisely what they are made of.',
      invitation: 'What are you building that will still matter in twenty years?',
    },
    {
      id: 'expansion',
      name: 'The Expansion',
      ageRange: [35, 42],
      theme: 'Power recognized, domain extended, limits tested',
      planet: 'Jupiter',
      glyph: '♃',
      icon: '<svg class="eng-i" aria-hidden="true"><use href="#ei-star4"/></svg>',
      narrative: 'Having survived the first reckoning, you grow into the space your courage cleared. Ambition finds its right shape, relationships deepen into genuine partnership, and the world begins to respond to you as the authority you have become. The danger is expansion without reflection — reaching without feeling.',
      invitation: 'Where is abundance asking you to grow beyond your comfort?',
    },
    {
      id: 'uranus-opp',
      name: 'The Opposition',
      ageRange: [40, 47],
      theme: 'Uranus opposes its natal position — the great disruption',
      planet: 'Uranus',
      glyph: '♅',
      icon: '<svg class="eng-i" aria-hidden="true"><use href="#ei-flame"/></svg>',
      narrative: 'Across the zodiac from where it was at your birth, Uranus sends its lightning bolt of authenticity. What you have suppressed begins to press toward the surface with urgent force. This is not a crisis of age but a crisis of aliveness — the self demanding to be known before more time is spent being unknown.',
      invitation: 'What truth about yourself have you been too cautious to live?',
    },
    {
      id: 'chiron',
      name: 'The Healing',
      ageRange: [48, 54],
      theme: 'Chiron returns — the wound becomes the gift',
      planet: 'Chiron',
      glyph: '⚷',
      icon: '<svg class="eng-i" aria-hidden="true"><use href="#ei-spiral"/></svg>',
      narrative: 'The wound you have carried longest — the one you thought disqualified you — is now revealed as your deepest credential. Chiron’s return asks you to stop managing the wound and begin transforming it. The alchemical process is neither painless nor overnight, but what is forged here can heal others.',
      invitation: 'How might the thing you have hidden become the thing that sets you free?',
    },
    {
      id: 'saturn2',
      name: 'The Mastery',
      ageRange: [58, 65],
      theme: 'Second Saturn Return — authority fully claimed',
      planet: 'Saturn',
      glyph: '♄',
      icon: '⊕',
      narrative: 'Saturn returns again, and this time it is not testing you — it is honoring you. The structures you built at 29 have either stood the test or taught their lessons. There is now a quiet authority that needs no performance. What remains after this threshold is what was always essentially you.',
      invitation: 'What legacy are you ready to commit to fully?',
    },
    {
      id: 'elder',
      name: 'The Transmission',
      ageRange: [65, 84],
      theme: 'Elder wisdom in active service',
      planet: 'Neptune',
      glyph: '♆',
      icon: '<svg class="eng-i" aria-hidden="true"><use href="#ei-trident"/></svg>',
      narrative: 'The ego has done its work and need not drive as hard. Vision expands; what seemed urgent becomes clear in its proportion. This is the chapter of genuine transmission — passing forward what was hard-won, contributing the view from the long vantage, and discovering that presence itself becomes the gift.',
      invitation: 'Who needs the map you had to draw yourself?',
    },
    {
      id: 'completion',
      name: 'The Return',
      ageRange: [84, Infinity],
      theme: 'Uranus return — completion of the great cycle',
      planet: 'Uranus',
      glyph: '♅',
      icon: '∞',
      narrative: 'Uranus completes its first full revolution since your birth. The circle closes not as an ending but as an arrival. The self that entered the world arrives back at the beginning with everything it gathered — lighter for what was released, richer for what was kept. This is the rare territory of genuine completion.',
      invitation: 'What does it feel like to have truly lived?',
    },
  ];

  // ── Personal year data ────────────────────────────────────────────────────────

  const PERSONAL_YEARS = {
    1: {
      name: 'New Beginnings',
      theme: 'Plant seeds, launch initiatives',
      quality: 'Initiative · Courage · Origination',
      affirmation: 'I begin. Every great thing starts with one step taken alone.',
      monthlyFocus: [
        'Clarify your vision and write it down',
        'Take the first action, however small',
        'Break from habits that no longer fit',
        'Assert your individuality without apology',
        'Network with intention — new allies appear',
        'Mid-year review: are you building what you intended?',
        'Deepen commitment to the path chosen',
        'Remove what distracts from the primary goal',
        'Consolidate early gains into stable ground',
        'Communicate your direction to those who matter',
        'Prepare the soil for next year\'s partnerships',
        'Rest and integrate before the cycle accelerates',
      ],
    },
    2: {
      name: 'Patience & Partnership',
      theme: 'Build relationships, wait and listen',
      quality: 'Receptivity · Cooperation · Sensitivity',
      affirmation: 'I receive. The river does not rush; it arrives.',
      monthlyFocus: [
        'Identify the relationship that most needs tending',
        'Practice listening more than speaking',
        'Small gestures of care accumulate into trust',
        'Resist the urge to force outcomes — timing is working',
        'A collaboration proposed now may bear fruit in a 1 year',
        'Mid-year: have you allowed yourself to receive?',
        'Address a conflict with diplomacy rather than force',
        'Support another\'s dream; yours is being seeded',
        'Retreat and restore — sensitivity needs rest',
        'Express gratitude for what was quietly received',
        'Begin collecting what you\'ll need for next year',
        'Complete what was left unfinished in January',
      ],
    },
    3: {
      name: 'Creative Expression',
      theme: 'Communicate, create, socialise',
      quality: 'Joy · Creativity · Self-Expression',
      affirmation: 'I create. The world is richer for what only I can bring.',
      monthlyFocus: [
        'Launch or restart a creative project',
        'Socialise beyond your usual circle',
        'Write, paint, sing, speak — expression in any form',
        'Share your work before it feels fully ready',
        'Collaboration with another creative mind is favored',
        'Mid-year: what have you created that surprised you?',
        'Resist scattered energy — focus amplifies joy',
        'Teach something you know; teaching deepens mastery',
        'Celebrate small wins publicly',
        'Say yes to the invitation that feels slightly too large',
        'Begin winding down social commitments for the 4 year ahead',
        'Document what this creative season produced',
      ],
    },
    4: {
      name: 'Foundation & Work',
      theme: 'Build structures, discipline rewarded',
      quality: 'Discipline · Integrity · Craft',
      affirmation: 'I build. What I construct with care will outlast me.',
      monthlyFocus: [
        'Audit your systems: what is inefficient or missing?',
        'Establish the routine that will carry the year',
        'Health and body deserve sustained attention now',
        'A financial plan made in spring holds through autumn',
        'Slow, methodical progress compounds quietly',
        'Mid-year: are the foundations solid?',
        'Address what has been avoided — 4 years reward honesty',
        'Delegate what is not essential to your core work',
        'Review commitments: which serve the structure you\'re building?',
        'Rest is not earned — it is part of the discipline',
        'Prepare for the 5 year\'s disruption by finishing what matters',
        'Gratitude for the invisible scaffolding you\'ve built',
      ],
    },
    5: {
      name: 'Change & Freedom',
      theme: 'Midpoint, disruption and liberation',
      quality: 'Adventure · Flexibility · Liberation',
      affirmation: 'I change. What I release opens space for what I\'m becoming.',
      monthlyFocus: [
        'Expect the unexpected and stay fluid',
        'An opportunity arrives sideways — recognize it',
        'Travel, even if only to a new neighborhood',
        'Release a commitment that has become a cage',
        'New information rewrites an old assumption',
        'Mid-year: what have you freed yourself from?',
        'The instability is productive — do not prematurely stabilize',
        'Body needs freedom too: move, stretch, play',
        'A person you meet this month could shift your trajectory',
        'Experiment without requiring results yet',
        'Begin selecting what to carry into the 6 year',
        'Reflect on how you have grown more agile',
      ],
    },
    6: {
      name: 'Love & Responsibility',
      theme: 'Home, family, service',
      quality: 'Nurturing · Beauty · Responsibility',
      affirmation: 'I love. Service given freely multiplies what I hold.',
      monthlyFocus: [
        'Home environment deserves beautification and care',
        'A relationship asks for deeper commitment or honest closure',
        'Community service offered now returns tenfold',
        'Family dynamics rise to the surface — meet them with grace',
        'Creative work in service of others is especially favored',
        'Mid-year: are you giving from fullness or depletion?',
        'A disagreement in a close relationship needs resolution',
        'Health and self-care are a form of responsibility to others',
        'Teach, mentor, or support someone younger',
        'Beauty is not trivial — surround yourself with what uplifts',
        'Celebrate the love that has grown steadily',
        'Close the year by expressing what you feel',
      ],
    },
    7: {
      name: 'Introspection & Wisdom',
      theme: 'Retreat, study, inner life',
      quality: 'Depth · Analysis · Spiritual inquiry',
      affirmation: 'I know. Stillness is not empty — it is everything I have not yet heard.',
      monthlyFocus: [
        'Begin or deepen a contemplative practice',
        'Study something that has always called to you',
        'Solitude is not loneliness — protect it',
        'Dreams and intuitions carry unusual clarity',
        'A question posed this month may take years to answer fully',
        'Mid-year: what have you discovered in the silence?',
        'Avoid major external commitments — the work is internal',
        'Nature and water are restorative',
        'Write privately: the 7 year rewards honest self-examination',
        'A teacher, book, or idea arrives with perfect timing',
        'Begin preparing for the 8 year\'s demand for action',
        'Integrate: what wisdom do you carry out of this year?',
      ],
    },
    8: {
      name: 'Power & Manifestation',
      theme: 'Harvest season, ambition bears fruit',
      quality: 'Ambition · Authority · Material mastery',
      affirmation: 'I manifest. What I have built is now visible.',
      monthlyFocus: [
        'Step into authority without apology',
        'Financial matters deserve direct, strategic attention',
        'Ask for what you want — the 8 year rewards boldness',
        'Leadership is offered or assumed: accept it consciously',
        'A project begun in a 1 year may now reach completion',
        'Mid-year: are you playing at the level you are capable of?',
        'Boundaries protect power — enforce them with clarity',
        'Recognize and reward others who contributed to your harvest',
        'Avoid overextension: power consolidated is power multiplied',
        'Philanthropy and generosity amplify the cycle',
        'Begin closing accounts — financial, relational, emotional',
        'Gratitude for what was built, earned, and received',
      ],
    },
    9: {
      name: 'Completion & Release',
      theme: 'Close the cycle, release what\'s done',
      quality: 'Compassion · Completion · Universal love',
      affirmation: 'I release. What I let go of makes room for everything that is coming.',
      monthlyFocus: [
        'Audit what no longer belongs in the next cycle',
        'Forgiveness — of self and others — is the work',
        'Give away what you have held but no longer need',
        'Completion is a gift: finish what you started',
        'A chapter closes; let it close with dignity',
        'Mid-year: what are you still carrying that you could put down?',
        'Creative projects reach their natural ending',
        'Service to others completes what service to self began',
        'Travel or retreat creates perspective on the cycle ending',
        'Express gratitude for every experience, pleasant and difficult',
        'Clear physical space for the 1 year\'s new beginning',
        'Rest deeply: you have completed a full cycle. You are ready.',
      ],
    },
  };

  // ── Utility functions ─────────────────────────────────────────────────────────

  function parseDateStr(dateStr) {
    // Support 'YYYY-MM-DD' or Date objects
    if (dateStr instanceof Date) return dateStr;
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function msToYears(ms) {
    return ms / (365.25 * 24 * 3600 * 1000);
  }

  function reduceToSingle(n) {
    while (n > 9 && n !== 11 && n !== 22 && n !== 33) {
      n = String(n).split('').reduce((a, d) => a + Number(d), 0);
    }
    return n;
  }

  function sumDigits(n) {
    return String(n).split('').reduce((a, d) => a + Number(d), 0);
  }

  // ── 1. getAge ─────────────────────────────────────────────────────────────────

  function getAge(birthDateStr, referenceDate) {
    const ref   = referenceDate instanceof Date ? referenceDate : new Date();
    const birth = parseDateStr(birthDateStr);
    return msToYears(ref - birth);
  }

  // ── 2. getLifeChapter ────────────────────────────────────────────────────────

  function getLifeChapter(age) {
    for (const chapter of CHAPTERS) {
      const [lo, hi] = chapter.ageRange;
      if (age >= lo && age < hi) {
        const progress = hi === Infinity ? null : (age - lo) / (hi - lo);
        return { ...chapter, progress };
      }
    }
    return { ...CHAPTERS[CHAPTERS.length - 1], progress: null };
  }

  // ── 3. getSaturnReturn ───────────────────────────────────────────────────────

  const SATURN_MEANINGS = [
    {
      label: 'First Saturn Return',
      meaning: 'The first Saturn Return is the great initiation of adulthood — the moment the universe stops accepting rehearsal. Everything you built on borrowed assumptions is brought to account. Career, relationship, identity: each faces a fundamental question about whether it is truly yours or simply inherited. The pressure is real, the invitation is magnificent.',
      challenge: 'Which structures in your life were built by others\' expectations rather than your own deepest values?',
      gift: 'Authentic authority. After the first return, you know who you are in a way that cannot be argued away.',
    },
    {
      label: 'Second Saturn Return',
      meaning: 'By the second return, Saturn is not testing — it is consolidating. Sixty years of living have produced real wisdom, real scars, and real accomplishment. This transit asks you to claim your elder authority and to release any remaining performance of who you were supposed to be. What remains is distilled essence.',
      challenge: 'What are you still performing for an audience that no longer needs the performance?',
      gift: 'Earned sovereignty. The freedom that only comes from having genuinely arrived at yourself.',
    },
    {
      label: 'Third Saturn Return',
      meaning: 'The third Saturn Return arrives around 88 and is the seal on a life’s work. Few experience it consciously, which makes those who do among the rarest of human testimonies. Saturn here completes its threefold initiation — child, adult, elder — and the quality of presence available is genuinely luminous.',
      challenge: 'What remains to be forgiven, expressed, or released before the circle completes?',
      gift: 'Completion. The ineffable quiet of a full life integrated.',
    },
  ];

  function getSaturnReturn(birthDateStr, today) {
    today = today instanceof Date ? today : new Date();
    const ageNow = getAge(birthDateStr, today);

    // Which return are we nearest to or past?
    let returnNumber = 1;
    let exactAge     = SATURN_PERIOD;

    // Find which return window we are in or nearest to
    for (let n = 1; n <= 3; n++) {
      const exact = SATURN_PERIOD * n;
      if (ageNow < exact + SATURN_WINDOW) {
        returnNumber = n;
        exactAge     = exact;
        break;
      }
      if (n === 3) {
        returnNumber = 3;
        exactAge     = SATURN_PERIOD * 3;
      }
    }

    const diff = exactAge - ageNow;  // positive = future, negative = past
    const meta = SATURN_MEANINGS[returnNumber - 1];

    let status, yearsUntil, progress;
    if (diff > SATURN_WINDOW) {
      status     = 'upcoming';
      yearsUntil = diff;
      progress   = null;
    } else if (diff < -SATURN_WINDOW) {
      status     = 'past';
      yearsUntil = null;
      progress   = 1;
    } else {
      status   = 'active';
      // progress 0 at entry, 1 at exit
      progress = (diff + SATURN_WINDOW) / (SATURN_WINDOW * 2);
      progress = Math.max(0, Math.min(1, 1 - progress));  // 0 = just entering, 1 = just leaving
      yearsUntil = diff > 0 ? diff : 0;
    }

    return {
      returnNumber,
      label: meta.label,
      status,
      yearsUntil: yearsUntil !== null ? Math.round(yearsUntil * 10) / 10 : null,
      progress:   progress !== null   ? Math.round(progress * 100) / 100  : null,
      meaning:    meta.meaning,
      challenge:  meta.challenge,
      gift:       meta.gift,
    };
  }

  // ── 4. getJupiterCycle ───────────────────────────────────────────────────────

  const JUPITER_PHASES = [
    { id: 'seed',       label: 'Seed Phase',       range: [0, 2],    theme: 'Plant intentions; expansive new chapters open.' },
    { id: 'growth',     label: 'Growth Phase',     range: [2, 6],    theme: 'Development accelerates; opportunity multiplies.' },
    { id: 'harvest',    label: 'Harvest Phase',    range: [6, 10],   theme: 'Reap what was cultivated; recognition arrives.' },
    { id: 'completion', label: 'Completion Phase', range: [10, 11.862], theme: 'Close accounts; prepare ground for the next cycle.' },
  ];

  function getJupiterCycle(birthDateStr, today) {
    today = today instanceof Date ? today : new Date();
    const ageNow     = getAge(birthDateStr, today);
    const cyclesSince = ageNow / JUPITER_PERIOD;
    const returnNum  = Math.floor(cyclesSince);        // completed returns
    const yearInCycle = (cyclesSince % 1) * JUPITER_PERIOD;  // 0 – 11.862
    const yearsUntilNext = JUPITER_PERIOD - yearInCycle;

    // Phase
    let phase = JUPITER_PHASES[JUPITER_PHASES.length - 1];
    for (const p of JUPITER_PHASES) {
      if (yearInCycle >= p.range[0] && yearInCycle < p.range[1]) {
        phase = p;
        break;
      }
    }

    const exactReturnAge = JUPITER_PERIOD * (returnNum + 1);
    const diff = exactReturnAge - ageNow;
    const returnStatus = diff <= JUPITER_WINDOW
      ? (diff < 0 ? 'past' : 'active')
      : 'upcoming';

    return {
      returnNumber:   returnNum + 1,
      label:          `Jupiter Return ${returnNum + 1}`,
      yearInCycle:    Math.round(yearInCycle * 10) / 10,
      yearsUntilNext: Math.round(yearsUntilNext * 10) / 10,
      returnStatus,
      phase:          phase.id,
      phaseLabel:     phase.label,
      phaseTheme:     phase.theme,
    };
  }

  // ── 5. getNodeCycle ──────────────────────────────────────────────────────────

  const NODE_THEMES = [
    'Beginnings and belonging — identity seeks its tribe',
    'Partnership and mirroring — learning through relationship',
    'Purpose and vocation — the calling clarifies',
    'Completion and legacy — what you leave behind',
  ];

  function getNodeCycle(birthDateStr, today) {
    today = today instanceof Date ? today : new Date();
    const ageNow     = getAge(birthDateStr, today);
    const cyclesSince = ageNow / NODE_PERIOD;
    const cycleNum   = Math.floor(cyclesSince) + 1;
    const yearInCycle = (cyclesSince % 1) * NODE_PERIOD;
    const halfReturn  = NODE_PERIOD / 2;  // ~9.3 years
    const yearsToHalf = halfReturn - yearInCycle;
    const yearsToFull = NODE_PERIOD - yearInCycle;

    // Nodal axis theme — shifts each cycle
    const themeIndex = (cycleNum - 1) % NODE_THEMES.length;
    const nodalTheme = NODE_THEMES[themeIndex];

    // Half-return status
    const nearHalf  = Math.abs(yearInCycle - halfReturn);
    const halfStatus = nearHalf <= NODE_WINDOW
      ? 'active'
      : (yearInCycle < halfReturn ? 'upcoming' : 'past');

    const fullStatus = yearInCycle >= NODE_PERIOD - NODE_WINDOW
      ? 'active'
      : 'upcoming';

    return {
      cycleNumber:      cycleNum,
      yearInCycle:      Math.round(yearInCycle * 10) / 10,
      yearsToHalfReturn: Math.round(Math.max(0, yearsToHalf) * 10) / 10,
      yearsToFullReturn: Math.round(Math.max(0, yearsToFull) * 10) / 10,
      halfReturnStatus: halfStatus,
      fullReturnStatus: fullStatus,
      nodalTheme,
    };
  }

  // ── 6. getPersonalYear ───────────────────────────────────────────────────────

  function getPersonalYear(birthMonth, birthDay, year) {
    year = year || new Date().getFullYear();
    const raw    = birthMonth + birthDay + sumDigits(year) + sumDigits(Math.floor(year / 100));
    const pyNum  = reduceToSingle(sumDigits(raw));
    const data   = PERSONAL_YEARS[pyNum] || PERSONAL_YEARS[1];

    return {
      number:       pyNum,
      name:         data.name,
      theme:        data.theme,
      quality:      data.quality,
      affirmation:  data.affirmation,
      monthlyFocus: data.monthlyFocus,
    };
  }

  // ── 7. getCosmicSeason ───────────────────────────────────────────────────────

  const TRANSIT_THEMES = [
    'January brings crystalline clarity — Saturn favors deliberate beginnings.',
    'February opens receptive channels — the invisible work is valued now.',
    'March stirs forward momentum — ideas that lingered find their footing.',
    'April grounds the visionary — practical steps build the dream.',
    'May expands horizons — what seemed unreachable is now within reach.',
    'June calls for integration — consolidate before the summer surge.',
    'July deepens internal knowing — the quiet voice speaks most clearly.',
    'August amplifies creative expression — bold gestures find their audience.',
    'September invites honest review — what has been built is now assessed.',
    'October intensifies transformation — release accelerates new forms.',
    'November reveals hidden patterns — what was underground surfaces.',
    'December completes and prepares — the cycle honors what was lived.',
  ];

  function getCosmicSeason(birthDateStr, today) {
    today = today instanceof Date ? today : new Date();
    const birth  = parseDateStr(birthDateStr);
    const ageNow = getAge(birthDateStr, today);
    const month  = today.getMonth();  // 0-indexed

    const chapter  = getLifeChapter(ageNow);
    const saturn   = getSaturnReturn(birthDateStr, today);
    const jupiter  = getJupiterCycle(birthDateStr, today);
    const nodes    = getNodeCycle(birthDateStr, today);
    const pyear    = getPersonalYear(birth.getMonth() + 1, birth.getDate(), today.getFullYear());
    const milestones = getMilestones(birthDateStr);

    const transitTheme = TRANSIT_THEMES[month];

    // Next milestone: first future milestone by time
    const future = milestones.filter(m => m.isFuture);
    future.sort((a, b) => a.age - b.age);
    const nextMilestone = future.length
      ? { ...future[0], yearsUntil: Math.round((future[0].age - ageNow) * 10) / 10 }
      : null;

    // Active transits
    const activeTransits = [];
    if (saturn.status === 'active')   activeTransits.push({ label: saturn.label,   glyph: '♄', body: saturn.meaning.slice(0, 120) + '…' });
    if (jupiter.returnStatus === 'active') activeTransits.push({ label: jupiter.label, glyph: '♃', body: jupiter.phaseTheme });
    if (nodes.halfReturnStatus === 'active') activeTransits.push({ label: 'Nodal Half-Return', glyph: '☊', body: nodes.nodalTheme });

    return {
      ageNow:           Math.round(ageNow * 10) / 10,
      chapter,
      saturn,
      jupiter,
      nodes,
      personalYear:     pyear,
      currentTransitTheme: transitTheme,
      nextMilestone,
      activeTransits,
    };
  }

  // ── 8. getMilestones ────────────────────────────────────────────────────────

  const MILESTONE_DEFS = [
    { age: 12,          label: '1st Jupiter Return',      planet: 'Jupiter', glyph: '♃', description: 'The first great expansion: new freedom, bigger world, the call to adventure. Identity broadens beyond the family.' },
    { age: 18.613,      label: '1st Nodal Return',        planet: 'Node',    glyph: '☊', description: 'The South Node returns to its natal position. A reckoning with destiny: first glimpse of your true path.' },
    { age: 21,          label: 'Uranus Square',           planet: 'Uranus',  glyph: '♅', description: 'Uranus squares its birth position. The urge for radical independence peaks — disruption of inherited authority.' },
    { age: 24,          label: '2nd Jupiter Return',      planet: 'Jupiter', glyph: '♃', description: 'A new 12-year Jupiter cycle begins. Expansion into adult vocation and worldview.' },
    { age: 29.457,      label: '1st Saturn Return',       planet: 'Saturn',  glyph: '♄', description: 'The great initiation. Everything built on borrowed assumption is tested. Authentic adulthood begins.' },
    { age: 36,          label: '3rd Jupiter Return',      planet: 'Jupiter', glyph: '♃', description: 'Ambition reaches its most expansive form. Opportunities multiply if the previous cycle was honored.' },
    { age: 37.226,      label: '2nd Nodal Return',        planet: 'Node',    glyph: '☊', description: 'A second reckoning with destiny. The life path question returns with greater urgency and clarity.' },
    { age: 41.8,        label: 'Uranus Opposition',       planet: 'Uranus',  glyph: '♅', description: 'Uranus opposes its natal position — the heart of the so-called midlife transit. Authenticity or rupture.' },
    { age: 47.7,        label: '4th Jupiter Return',      planet: 'Jupiter', glyph: '♃', description: 'Harvest of a life lived with intention. Recognition, legacy, and the question of what truly matters.' },
    { age: 49.5,        label: 'Chiron Return',           planet: 'Chiron',  glyph: '⚷', description: 'The wounded healer returns. The deepest wound surfaces — and with it, the gift that only you can give.' },
    { age: 55.839,      label: '3rd Nodal Return',        planet: 'Node',    glyph: '☊', description: 'The third nodal return asks: have you lived the life that was yours to live?' },
    { age: 58.914,      label: '2nd Saturn Return',       planet: 'Saturn',  glyph: '♄', description: 'Saturn returns as elder. Authority is claimed, not tested. The distilled self emerges.' },
    { age: 59.31,       label: '5th Jupiter Return',      planet: 'Jupiter', glyph: '♃', description: 'Elder wisdom meets expanded possibility. The world widens again from a new vantage.' },
    { age: 63,          label: 'Uranus Trine (closing)',  planet: 'Uranus',  glyph: '♅', description: 'Uranus trines its natal position. The revolutionary self finds its right relationship with society.' },
    { age: 71.1,        label: '6th Jupiter Return',      planet: 'Jupiter', glyph: '♃', description: 'Generosity without condition. The Jupiter cycle at this stage asks for unconditional expansion.' },
    { age: 74.452,      label: '4th Nodal Return',        planet: 'Node',    glyph: '☊', description: 'The final nodal reckoning for most lives. What has been lived; what remains to be released.' },
    { age: 83.5,        label: '7th Jupiter Return',      planet: 'Jupiter', glyph: '♃', description: 'The rare 7th return — a luminous marker of a life richly inhabited.' },
    { age: 84,          label: 'Uranus Return',           planet: 'Uranus',  glyph: '♅', description: 'Uranus completes its first full revolution since birth. The great circle closes. Completion.' },
    { age: 88.371,      label: '3rd Saturn Return',       planet: 'Saturn',  glyph: '♄', description: 'The final Saturn initiation. Very few experience this consciously; those who do are luminous elders.' },
  ];

  function getMilestones(birthDateStr) {
    const birth  = parseDateStr(birthDateStr);
    const today  = new Date();
    const ageNow = getAge(birthDateStr, today);

    return MILESTONE_DEFS.map(def => {
      const year = birth.getFullYear() + def.age;
      const isPast   = def.age < ageNow - 1.5;
      const isActive = !isPast && Math.abs(def.age - ageNow) <= 1.5;
      const isFuture = !isPast && !isActive;

      return {
        age:         Math.round(def.age * 10) / 10,
        year:        Math.round(year),
        label:       def.label,
        planet:      def.planet,
        glyph:       def.glyph,
        description: def.description,
        isPast,
        isActive,
        isFuture,
      };
    });
  }

  // ── 9. getRecommendations ────────────────────────────────────────────────────

  function getRecommendations(profileData) {
    profileData = profileData || {};
    const { charts, lifePath, age, personalYear } = profileData;
    const today = new Date();
    const recs = [];

    // Saturn return urgency
    if (age != null) {
      const birthYear = today.getFullYear() - Math.floor(age);
      // Approximate birthdate for Saturn check
      const approxBirth = `${birthYear}-06-15`;
      try {
        const saturn = getSaturnReturn(approxBirth, today);
        if (saturn.status === 'upcoming' && saturn.yearsUntil != null && saturn.yearsUntil < 5) {
          recs.push({
            tool:     'transits',
            href:     'transits.html',
            headline: `Your ${saturn.label} begins in ${saturn.yearsUntil} years`,
            body:     'Now is the time to understand what Saturn is asking of you. Preparation transforms pressure into power.',
            urgency:  saturn.yearsUntil < 2 ? 'high' : 'medium',
            icon:     '♄',
          });
        } else if (saturn.status === 'active') {
          recs.push({
            tool:     'transits',
            href:     'transits.html',
            headline: `You are in your ${saturn.label} now`,
            body:     'This is one of the most significant transits of your life. Understanding it changes everything.',
            urgency:  'high',
            icon:     '♄',
          });
        }
      } catch (e) { /* graceful — approximate birth may error */ }
    }

    // Birth chart recommendation
    if (!charts || charts.length === 0) {
      recs.push({
        tool:     'chart',
        href:     'chart.html',
        headline: 'Your birth chart is the foundation of everything',
        body:     'Calculate your natal chart to unlock personalised readings, transits, and compatibility.',
        urgency:  'high',
        icon:     '☉',
      });
    }

    // Personal year approaching peak or pivot
    if (personalYear) {
      const py = typeof personalYear === 'number' ? personalYear : (personalYear.number || null);
      if (py === 1) {
        recs.push({
          tool:     'ephemeris',
          href:     'ephemeris.html',
          headline: 'Personal Year 1 — the slate is clean',
          body:     'New beginnings are cosmically supported. Use the Instrument to find the ideal dates for launching initiatives.',
          urgency:  'medium',
          icon:     '☉',
        });
      } else if (py === 9) {
        recs.push({
          tool:     'transits',
          href:     'transits.html',
          headline: 'Personal Year 9 — completion season',
          body:     'What you release now determines what enters next year. Transits show you where Saturn and Jupiter support the letting go.',
          urgency:  'medium',
          icon:     '♄',
        });
      } else if (py === 5) {
        recs.push({
          tool:     'compatibility',
          href:     'compatibility.html',
          headline: 'Personal Year 5 — relationships shift',
          body:     'Change years restructure connections. Synastry charts reveal what is evolving in your closest bonds.',
          urgency:  'medium',
          icon:     '♀',
        });
      }
    }

    // Horoscope always relevant
    recs.push({
      tool:     'horoscope',
      href:     'horoscope.html',
      headline: 'Your daily cosmic weather',
      body:     'The stars speak daily. Check your horoscope to align your energy with the moment.',
      urgency:  'low',
      icon:     '<svg class="eng-i" aria-hidden="true"><use href="#ei-star4"/></svg>',
    });

    // Ephemeris for all
    recs.push({
      tool:     'ephemeris',
      href:     'ephemeris.html',
      headline: 'The Instrument awaits',
      body:     'Explore your light cone, zenith star, and echo dates — the deepest layer of your cosmic signature.',
      urgency:  'low',
      icon:     '⊕',
    });

    return recs;
  }

  // ── Public API ────────────────────────────────────────────────────────────────

  return {
    getAge,
    getLifeChapter,
    getSaturnReturn,
    getJupiterCycle,
    getNodeCycle,
    getPersonalYear,
    getCosmicSeason,
    getMilestones,
    getRecommendations,
    // Expose data for external use
    CHAPTERS,
    PERSONAL_YEARS,
  };

})();
