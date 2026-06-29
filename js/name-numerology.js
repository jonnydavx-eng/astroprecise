/* ===========================================================================
 * name-numerology.js — window.NameNumerology
 * ---------------------------------------------------------------------------
 * Pythagorean name numerology engine for Astro Precise.
 *
 *   Expression / Destiny  — all letters of the full name
 *   Soul Urge / Heart's Desire — vowels only
 *   Personality           — consonants only
 *   Life Path (optional)  — from a birth date (Y, M, D)
 *
 * Master numbers 11, 22 and 33 are preserved (never reduced to a single digit)
 * at every level where they appear, in keeping with standard Pythagorean
 * practice. Every reduction step is recorded so the page can render a fully
 * transparent, honest breakdown of the arithmetic.
 *
 * HONESTY + DETERMINISM: this is pure arithmetic. The same name and date always
 * yield the same numbers and the same reading text. No randomness, no clocks,
 * no network. All computation happens in the browser.
 *
 * Works in the browser (attaches to window.NameNumerology) and under Node
 * (module.exports) for numeric validation.
 * ========================================================================= */
(function (root) {
  'use strict';

  /* ── Pythagorean letter → value map (A=1 … I=9, J=1 … R=9, S=1 … Z=8) ──── */
  var PYTHAGOREAN = {
    A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, I: 9,
    J: 1, K: 2, L: 3, M: 4, N: 5, O: 6, P: 7, Q: 8, R: 9,
    S: 1, T: 2, U: 3, V: 4, W: 5, X: 6, Y: 7, Z: 8
  };

  /* Y is treated as a vowel only when it carries the vowel sound — i.e. when no
   * other vowel is adjacent within the same name-part. For deterministic,
   * defensible behaviour we use the common simplified rule: Y is a CONSONANT by
   * default (matching the bulk of online calculators), and we expose the letter
   * classification so the breakdown is fully transparent either way. */
  var VOWELS = { A: true, E: true, I: true, O: true, U: true };

  var MASTER = { 11: true, 22: true, 33: true };

  /* ── Core reduction with full step tracing ─────────────────────────────── */

  function digitSum(n) {
    n = Math.abs(n);
    var s = 0;
    while (n > 0) { s += n % 10; n = Math.floor(n / 10); }
    return s;
  }

  /* Reduce a number to a single digit, preserving master numbers 11/22/33.
   * Returns { value, steps } where steps is an array of the intermediate totals
   * (excluding the starting value) so the UI can show "38 → 11" etc. */
  function reduce(n) {
    var steps = [];
    var current = n;
    while (current > 9 && !MASTER[current]) {
      current = digitSum(current);
      steps.push(current);
    }
    return { value: current, steps: steps, isMaster: !!MASTER[current] };
  }

  function isLetter(ch) {
    return Object.prototype.hasOwnProperty.call(PYTHAGOREAN, ch);
  }

  function isVowel(ch) {
    return !!VOWELS[ch];
  }

  /* Normalise a name to A–Z uppercase, stripping accents and non-letters but
   * keeping the original for display. Returns array of letter objects. */
  function letters(name) {
    var normalised = String(name == null ? '' : name)
      .normalize ? String(name == null ? '' : name).normalize('NFD').replace(/[̀-ͯ]/g, '')
                 : String(name == null ? '' : name);
    var out = [];
    var upper = normalised.toUpperCase();
    for (var i = 0; i < upper.length; i++) {
      var ch = upper[i];
      if (isLetter(ch)) {
        out.push({ letter: ch, value: PYTHAGOREAN[ch], vowel: isVowel(ch) });
      }
    }
    return out;
  }

  /* Compute one named number from a filtered letter list.
   * Returns null when there are no qualifying letters. */
  function computeFromLetters(list) {
    if (!list.length) return null;
    var total = 0;
    var detail = [];
    for (var i = 0; i < list.length; i++) {
      total += list[i].value;
      detail.push({ letter: list[i].letter, value: list[i].value });
    }
    var r = reduce(total);
    return {
      total: total,
      value: r.value,
      isMaster: r.isMaster,
      steps: r.steps,
      letters: detail
    };
  }

  /* ── Public: compute the three name numbers from a full name ───────────── */
  function fromName(name) {
    var all = letters(name);
    var vowels = all.filter(function (l) { return l.vowel; });
    var consonants = all.filter(function (l) { return !l.vowel; });

    return {
      name: String(name == null ? '' : name).trim(),
      cleaned: all.map(function (l) { return l.letter; }).join(''),
      hasLetters: all.length > 0,
      expression: computeFromLetters(all),
      soulUrge: computeFromLetters(vowels),
      personality: computeFromLetters(consonants),
      breakdown: all
    };
  }

  /* ── Public: optional Life Path from a birth date ──────────────────────── */
  /* Accepts (year, month, day) integers OR an ISO 'YYYY-MM-DD' string. */
  function fromBirthDate(year, month, day) {
    var y, m, d;
    if (typeof year === 'string' && month === undefined) {
      var parts = year.split('-');
      y = parseInt(parts[0], 10);
      m = parseInt(parts[1], 10);
      d = parseInt(parts[2], 10);
    } else {
      y = parseInt(year, 10);
      m = parseInt(month, 10);
      d = parseInt(day, 10);
    }
    if (!isFinite(y) || !isFinite(m) || !isFinite(d)) return null;
    if (m < 1 || m > 12 || d < 1 || d > 31) return null;

    var rm = reduce(m);
    var rd = reduce(d);
    var ry = reduce(y);
    var sum = rm.value + rd.value + ry.value;
    var rl = reduce(sum);

    return {
      year: y, month: m, day: d,
      monthReduced: rm,
      dayReduced: rd,
      yearReduced: ry,
      componentSum: sum,
      value: rl.value,
      isMaster: rl.isMaster,
      steps: rl.steps
    };
  }

  /* ── Public: compute everything at once ────────────────────────────────── */
  function calculate(name, birth) {
    var result = fromName(name);
    result.lifePath = null;
    if (birth) {
      if (typeof birth === 'string') {
        result.lifePath = fromBirthDate(birth);
      } else if (typeof birth === 'object') {
        result.lifePath = fromBirthDate(birth.year, birth.month, birth.day);
      }
    }
    return result;
  }

  /* =====================================================================
   * NUMBER MEANINGS — deterministic interpretation text.
   * Each entry frames the number from three angles so the SAME number can be
   * described correctly whether it surfaced as Expression, Soul Urge or
   * Personality. This keeps readings honest and context-appropriate.
   * =================================================================== */
  var MEANINGS = {
    1: {
      title: 'The Leader', keyword: 'Independence',
      essence: 'origination, drive, and the will to stand alone',
      expression: 'Your talents are pioneering ones. You are built to initiate — to take the first step where others wait for permission. Original thinking, decisiveness, and self-reliance are your natural instruments.',
      soulUrge: 'Deep down you long to lead and to be recognised as your own person. You crave independence and the freedom to act on your own vision without asking.',
      personality: 'You come across as confident, capable, and self-directed — someone who can be trusted to take charge. Others sense a quiet authority before you say a word.'
    },
    2: {
      title: 'The Peacemaker', keyword: 'Harmony',
      essence: 'cooperation, sensitivity, and the gift of bringing people together',
      expression: 'Your gifts are relational. You work best in partnership, reading the unspoken currents between people and weaving them into balance. Patience and tact are your craft.',
      soulUrge: 'What your heart wants most is connection, peace, and a sense of belonging. You are fulfilled when those around you are at ease and the room is in harmony.',
      personality: 'You appear gentle, warm, and approachable — the person others confide in. People feel safer in your presence.'
    },
    3: {
      title: 'The Communicator', keyword: 'Expression',
      essence: 'creativity, joy, and the art of self-expression',
      expression: 'Your talent is expressive — words, images, performance, charm. You are designed to lift others through beauty and inspired communication, turning feeling into form.',
      soulUrge: 'Your inner desire is to create and to be seen creating — to pour your imagination into the world and feel it land. Joy is not a luxury for you; it is a need.',
      personality: 'You come across as bright, sociable, and magnetic. People remember your warmth and your way with a phrase.'
    },
    4: {
      title: 'The Builder', keyword: 'Stability',
      essence: 'discipline, structure, and the mastery of form',
      expression: 'Your talents are practical and enduring. You build things that last — systems, foundations, reliable order. Method and follow-through are your signature.',
      soulUrge: 'At heart you crave security, order, and a life that holds together. You are fulfilled by honest work and the solid ground beneath a thing well made.',
      personality: 'You appear dependable, grounded, and serious about your commitments. People trust you with what matters.'
    },
    5: {
      title: 'The Adventurer', keyword: 'Freedom',
      essence: 'change, curiosity, and the love of liberty',
      expression: 'Your gifts are versatile and dynamic. You adapt, explore, and thrive on variety. You are built to experience widely and translate that range into resourcefulness.',
      soulUrge: 'Your heart longs for freedom and movement — new horizons, new sensations, the open road. Confinement is the one thing your spirit cannot abide.',
      personality: 'You come across as lively, curious, and quick — someone who brings energy and possibility into a room.'
    },
    6: {
      title: 'The Nurturer', keyword: 'Responsibility',
      essence: 'love, service, and the care of home and community',
      expression: 'Your talents are caring ones. You heal, counsel, and create harmony for others. Responsibility sits naturally on your shoulders and an eye for beauty refines all you touch.',
      soulUrge: 'What your heart wants is to love and be loved, to protect, and to make a beautiful home for the people who matter. Service is your form of devotion.',
      personality: 'You appear warm, responsible, and reassuring — the steady one others lean on. People sense they are safe in your care.'
    },
    7: {
      title: 'The Seeker', keyword: 'Wisdom',
      essence: 'analysis, introspection, and the pursuit of inner truth',
      expression: 'Your gifts are analytical and contemplative. You research, refine, and seek the hidden pattern beneath the surface. Depth, not speed, is your measure.',
      soulUrge: 'Your inner longing is for understanding and meaning — to know the truth of things and to have the solitude in which to find it.',
      personality: 'You come across as reserved, thoughtful, and a touch mysterious — someone with hidden depths people want to understand.'
    },
    8: {
      title: 'The Achiever', keyword: 'Power',
      essence: 'ambition, authority, and the mastery of the material world',
      expression: 'Your talents are executive. You organise, lead, and turn vision into results at scale. You understand power and abundance and how to wield both responsibly.',
      soulUrge: 'Your heart desires achievement, recognition, and the freedom that mastery of the material world provides. You are driven to build something substantial.',
      personality: 'You appear capable, authoritative, and successful — someone who commands respect and gets things done.'
    },
    9: {
      title: 'The Humanitarian', keyword: 'Compassion',
      essence: 'universal love, generosity, and the vibration of completion',
      expression: 'Your gifts are broad and humane. You serve causes larger than yourself, blending creativity with genuine compassion for the whole of humanity.',
      soulUrge: 'What your heart most wants is to give — to heal the world in some sweeping, selfless way, and to leave it better than you found it.',
      personality: 'You come across as gracious, worldly, and warm — someone with a wide embrace and a generous spirit.'
    },
    11: {
      title: 'The Illuminator', keyword: 'Intuition', master: true,
      essence: 'a Master Number — heightened intuition and inspired vision',
      expression: 'Your talents operate on a heightened frequency: intuitive, inspirational, visionary. You are a channel for insight that arrives ahead of logic — a born illuminator who must learn to ground the gift.',
      soulUrge: 'Your soul longs for spiritual truth and to inspire others toward it. You feel called to a purpose larger than the everyday, even when the world seems unready.',
      personality: 'You radiate a sensitive, charismatic, almost otherworldly presence. People feel something unusual and luminous about you.'
    },
    22: {
      title: 'The Master Builder', keyword: 'Manifestation', master: true,
      essence: 'a Master Number — visionary scope joined to practical mastery',
      expression: 'Your talents fuse the 11\'s vision with the 4\'s discipline: you can build dreams into lasting reality at a scale few attempt. The Master Builder turns ideals into institutions.',
      soulUrge: 'Your heart desires to accomplish something of enduring, world-serving significance — not for glory, but because you can see what is possible and feel bound to realise it.',
      personality: 'You appear capable, grounded, and quietly formidable — someone whose calm conceals an extraordinary capacity.'
    },
    33: {
      title: 'The Master Teacher', keyword: 'Devotion', master: true,
      essence: 'a Master Number — unconditional love in the service of others',
      expression: 'Your gifts express the highest vibration of nurturing: healing, teaching, and uplifting through unconditional love. The Master Teacher leads by lived example, not instruction.',
      soulUrge: 'Your soul longs to heal and uplift humanity through love freely given. You feel everything deeply and are called to transmute that sensitivity into service.',
      personality: 'You radiate warmth, compassion, and a selfless devotion that others find profoundly reassuring.'
    }
  };

  function meaning(value) {
    return MEANINGS[value] || null;
  }

  /* ── Export ────────────────────────────────────────────────────────────── */
  var API = {
    PYTHAGOREAN: PYTHAGOREAN,
    VOWELS: VOWELS,
    MEANINGS: MEANINGS,
    digitSum: digitSum,
    reduce: reduce,
    isVowel: isVowel,
    isLetter: isLetter,
    letters: letters,
    fromName: fromName,
    fromBirthDate: fromBirthDate,
    calculate: calculate,
    meaning: meaning
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
  }
  root.NameNumerology = API;

})(typeof window !== 'undefined' ? window : this);
