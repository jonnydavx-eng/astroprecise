/**
 * AstroPrecise — Angel Numbers & Synchronicity Clock
 * window.AngelNumbers
 *
 * A deterministic numerology reference for repeating / mirror numbers, plus a
 * live clock that detects mirror & repeating times (11:11, 12:12, 2:22, 3:33…)
 * and fuses the moment with:
 *   • the active Chaldean PLANETARY HOUR (reused from window.AstroOracle when
 *     present, with a self-contained fallback so this file works standalone)
 *   • the time's numerology (digit-sum reduction of HHMM)
 *
 * HONESTY: every meaning is framed as "the numerology of repeating numbers — a
 * mirror for reflection." No predictive, medical, or financial claims. All
 * numerology is deterministic: the same input always yields the same output.
 *
 * No network calls. Nothing leaves the browser.
 */
(function () {
  'use strict';

  // ── Deterministic numerology ──────────────────────────────────────────────
  // Digit-sum reduction. Master numbers 11, 22, 33 are preserved (not reduced).

  function sumDigits(n) {
    return String(Math.abs(n)).split('').reduce(function (a, d) {
      var v = parseInt(d, 10);
      return a + (isNaN(v) ? 0 : v);
    }, 0);
  }

  function reduce(n, keepMasters) {
    n = Math.abs(parseInt(n, 10) || 0);
    while (n > 9) {
      if (keepMasters && (n === 11 || n === 22 || n === 33)) break;
      n = sumDigits(n);
    }
    return n;
  }

  // Reduce a string of digits (e.g. "1111" or "1212") to its root, masters kept.
  function rootOf(digitStr) {
    var clean = String(digitStr).replace(/\D/g, '');
    if (!clean) return null;
    return reduce(sumDigits(clean), true);
  }

  // ── Planetary hour (Chaldean) — reuse oracle, else self-contained fallback ──

  var CHALDEAN = ['Saturn', 'Jupiter', 'Mars', 'Sun', 'Venus', 'Mercury', 'Moon'];
  var DAY_RULERS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn']; // index = Date.getDay()
  var PLANET_GLYPH = {
    Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂', Jupiter: '♃', Saturn: '♄'
  };
  var HOUR_MEANINGS = {
    Sun: 'Hour of sovereignty — a moment that favours visibility, leadership, and stepping forward.',
    Moon: 'Hour of tides — a moment that favours rest, intuition, home, and feeling.',
    Mercury: 'Hour of the messenger — a moment that favours words, study, and clear communication.',
    Venus: 'Hour of grace — a moment that favours love, beauty, and harmony.',
    Mars: 'Hour of the blade — a moment that favours courage, effort, and cutting away what is finished.',
    Jupiter: 'Hour of expansion — a moment that favours generosity, faith, and thinking big.',
    Saturn: 'Hour of the threshold — a moment that favours boundaries, endings, and patient work.'
  };

  function sunriseSunsetUTC(y, m, d, lat, lon) {
    var N = Math.floor((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 0)) / 86400000);
    var decl = -23.44 * Math.cos((2 * Math.PI * (N + 10)) / 365.25);
    var latR = (lat * Math.PI) / 180;
    var declR = (decl * Math.PI) / 180;
    var cosH = (Math.sin((-0.833 * Math.PI) / 180) - Math.sin(latR) * Math.sin(declR)) /
      (Math.cos(latR) * Math.cos(declR));
    cosH = Math.max(-1, Math.min(1, cosH));
    var H = (Math.acos(cosH) * 180) / Math.PI;
    var solarNoonUTC = 12 - lon / 15;
    var base = Date.UTC(y, m - 1, d);
    return {
      sunrise: new Date(base + (solarNoonUTC - H / 15) * 3600000),
      sunset: new Date(base + (solarNoonUTC + H / 15) * 3600000)
    };
  }

  function planetaryHourFallback(date, lat, lon) {
    date = date instanceof Date ? date : new Date();
    lat = (lat === undefined || lat === null) ? 51.5 : +lat;
    lon = (lon === undefined || lon === null) ? 0 : +lon;

    var today = sunriseSunsetUTC(date.getFullYear(), date.getMonth() + 1, date.getDate(), lat, lon);
    var baseDate, segStart, segEnd, idxOffset;

    if (date < today.sunrise) {
      var prev = new Date(date.getTime() - 86400000);
      var prevTimes = sunriseSunsetUTC(prev.getFullYear(), prev.getMonth() + 1, prev.getDate(), lat, lon);
      baseDate = prev; segStart = prevTimes.sunset; segEnd = today.sunrise; idxOffset = 12;
    } else if (date < today.sunset) {
      baseDate = date; segStart = today.sunrise; segEnd = today.sunset; idxOffset = 0;
    } else {
      var next = new Date(date.getTime() + 86400000);
      var nextTimes = sunriseSunsetUTC(next.getFullYear(), next.getMonth() + 1, next.getDate(), lat, lon);
      baseDate = date; segStart = today.sunset; segEnd = nextTimes.sunrise; idxOffset = 12;
    }

    var hourLen = (segEnd.getTime() - segStart.getTime()) / 12;
    var idx = Math.floor((date.getTime() - segStart.getTime()) / hourLen);
    idx = Math.max(0, Math.min(11, idx));

    var dayRuler = DAY_RULERS[baseDate.getDay()];
    var startIdx = CHALDEAN.indexOf(dayRuler);
    var ruler = CHALDEAN[(startIdx + idxOffset + idx) % 7];

    return {
      ruler: ruler,
      glyph: PLANET_GLYPH[ruler],
      meaning: HOUR_MEANINGS[ruler],
      endsAt: new Date(segStart.getTime() + (idx + 1) * hourLen)
    };
  }

  // Prefer the shared oracle implementation when it has loaded; normalise the
  // shape (oracle returns {ruler, glyph, meaning, endsAt}). Defaults to London.
  function getPlanetaryHour(date, lat, lon) {
    if (window.AstroOracle && typeof window.AstroOracle.getPlanetaryHour === 'function') {
      try {
        var r = window.AstroOracle.getPlanetaryHour(date, (lat == null ? 51.5 : lat), (lon == null ? 0 : lon));
        if (r) {
          var ruler = r.ruler || r.planet;
          return {
            ruler: ruler,
            glyph: r.glyph || PLANET_GLYPH[ruler] || '⏱',
            meaning: r.meaning || HOUR_MEANINGS[ruler] || '',
            endsAt: r.endsAt || null
          };
        }
      } catch (e) { /* fall through to local fallback */ }
    }
    return planetaryHourFallback(date, lat, lon);
  }

  // ── Repeating-number reference data ───────────────────────────────────────
  // Strictly framed as numerology reflection. Each entry has a deterministic
  // root number, theme keywords, a reflective meaning, a "reflection prompt",
  // and an SEO answer for the FAQPage JSON-LD.

  var NUMBERS = {
    '111': {
      title: 'New Beginnings & Focus', root: 1, element: 'fire', color: '#c4920a',
      keywords: ['Initiative', 'Alignment', 'Fresh Start', 'Intention'],
      meaning: 'In numerology, 1 is the number of beginnings, will, and self-direction. Seeing 111 is often read as a nudge to notice what you were just thinking — and to point that attention somewhere worthy. It is a mirror for fresh starts and singular focus, not a forecast.',
      reflection: 'What did your mind land on a moment ago — and is it where you want your energy to flow?',
      faq: 'In numerology, 111 amplifies the meaning of 1: beginnings, initiative, and focused intention. Many people treat 111 as a reminder to be deliberate about their current train of thought. It is a reflective prompt, not a prediction.'
    },
    '222': {
      title: 'Balance & Patience', root: 2, element: 'water', color: '#9aa6c8',
      keywords: ['Harmony', 'Trust', 'Partnership', 'Patience'],
      meaning: 'The number 2 carries cooperation, balance, and the space between things. 222 is commonly read as a cue to trust the slow work of alignment — to keep faith with what is still forming beneath the surface and to value partnership over force.',
      reflection: 'Where in your life would patience serve you better than pressure right now?',
      faq: 'In numerology, 222 doubles and triples the qualities of 2 — balance, cooperation, and trust in timing. It is often interpreted as a reminder to stay patient and seek harmony. Treat it as a mirror for reflection, not a guarantee.'
    },
    '333': {
      title: 'Expression & Creativity', root: 3, element: 'air', color: '#c08858',
      keywords: ['Creativity', 'Voice', 'Joy', 'Communication'],
      meaning: 'Three is the number of creative expression and communication. 333 is widely read as encouragement to create, speak, and share — to let an idea out rather than keep it tidy and unspoken. A mirror for self-expression.',
      reflection: 'What have you been holding back from saying, making, or sharing?',
      faq: 'In numerology, 333 magnifies 3: creativity, communication, and joyful self-expression. People often read it as a prompt to create or speak up. It is a reflective symbol, not a predictive sign.'
    },
    '444': {
      title: 'Structure & Stability', root: 4, element: 'earth', color: '#0e5c3a',
      keywords: ['Foundation', 'Order', 'Steadiness', 'Discipline'],
      meaning: 'Four is the number of foundations and form. 444 is often read as a steadying mirror — a reminder that the groundwork matters, that consistency compounds, and that solid structure makes everything else possible.',
      reflection: 'Which foundation in your life would reward a little more care this week?',
      faq: 'In numerology, 444 emphasises 4: stability, structure, and disciplined effort. Many treat it as a reassuring reminder that their foundations are sound. It is a mirror for reflection, not a prediction.'
    },
    '555': {
      title: 'Change & Movement', root: 5, element: 'air', color: '#5b7fc7',
      keywords: ['Change', 'Freedom', 'Movement', 'Adaptation'],
      meaning: 'Five is the number of change, freedom, and the senses. 555 is commonly read as a mirror for transition — a cue to loosen your grip on the familiar and stay adaptable as something shifts.',
      reflection: 'What change are you resisting that might actually be an opening?',
      faq: 'In numerology, 555 intensifies 5: change, freedom, and movement. It is often interpreted as a sign that transition is underway and adaptability helps. Treat it as a reflective prompt rather than a forecast.'
    },
    '666': {
      title: 'Recentring & Balance', root: 6, element: 'earth', color: '#b04a52',
      keywords: ['Care', 'Home', 'Responsibility', 'Re-balance'],
      meaning: 'Despite its pop-culture baggage, in numerology 6 is the number of care, home, and responsibility. 666 is best read as a gentle mirror to recentre — to check whether you have over-given, over-worried, or drifted from what matters, and to restore balance.',
      reflection: 'Have you been pouring out more than you have been taking in?',
      faq: 'In numerology, 666 is not sinister — 6 is the number of care, home, and responsibility. 666 is commonly read as a nudge to rebalance and return to what matters. It is a reflective symbol, not a warning or prediction.'
    },
    '777': {
      title: 'Reflection & Wisdom', root: 7, element: 'water', color: '#2a4a94',
      keywords: ['Insight', 'Solitude', 'Learning', 'Depth'],
      meaning: 'Seven is the number of inner work, study, and quiet insight. 777 is often read as a mirror for the contemplative — a cue to trust what you are learning and to make room for stillness.',
      reflection: 'What is the quiet insight you keep noticing but have not acted on?',
      faq: 'In numerology, 777 deepens 7: introspection, wisdom, and learning. People often read it as affirmation of their inner path. It is a reflective prompt, not a predictive sign.'
    },
    '888': {
      title: 'Flow & Reciprocity', root: 8, element: 'earth', color: '#6e1a26',
      keywords: ['Flow', 'Balance', 'Effort', 'Cycles'],
      meaning: 'Eight is the number of cycles, effort, and material balance — the figure that flows back into itself. 888 is commonly read as a mirror for reciprocity: what you put out and what returns, kept in honest balance. (Numerology is reflective; it is not financial advice.)',
      reflection: 'Where could you bring your effort and your rest into better balance?',
      faq: 'In numerology, 888 amplifies 8: cycles, balance, and effort. It is often read as a symbol of reciprocity and steady flow. It is a reflective prompt only — never financial advice or a prediction.'
    },
    '999': {
      title: 'Completion & Release', root: 9, element: 'fire', color: '#c4920a',
      keywords: ['Completion', 'Release', 'Closure', 'Wisdom'],
      meaning: 'Nine is the number of completion and the close of a cycle. 999 is widely read as a mirror for endings — an invitation to release what is finished so the next chapter has room to arrive.',
      reflection: 'What are you ready to let reach its natural ending?',
      faq: 'In numerology, 999 emphasises 9: completion, release, and closure. Many read it as a sign a chapter is ending. It is a reflective symbol, not a prediction.'
    },
    '000': {
      title: 'Stillness & Potential', root: 9, element: 'void', color: '#9aa6c8',
      keywords: ['Wholeness', 'Reset', 'Openness', 'Stillness'],
      meaning: 'Zero is the circle of wholeness and unformed potential — the pause before the next thing. 000 is often read as a mirror for the threshold moment: a clean slate, a breath, an open field. (000 reduces to 0; reflectively it is paired with the completing energy of 9.)',
      reflection: 'If this were a genuinely fresh start, what would you do first?',
      faq: 'In numerology, 000 represents wholeness, potential, and a reset point — the circle of zero. It is commonly read as a clean-slate moment. It is a reflective prompt, not a prediction.'
    },
    '1111': {
      title: 'Awareness & Alignment', root: 4, element: 'air', color: '#e8c96a',
      keywords: ['Awareness', 'Synchronicity', 'Intention', 'Awakening'],
      meaning: 'Perhaps the most-noticed sequence of all, 1111 stacks four 1s — beginnings multiplied. It is most often read as a "wake-up" mirror: a moment to become aware of your attention and intentions. Reduced, its digits sum to 4 — awareness given structure.',
      reflection: 'In this exact moment, what is occupying your attention — and is it worthy of it?',
      faq: '1111 is the most commonly noticed angel number. In numerology it stacks the 1 (beginnings, intention) four times and is read as a "wake-up" prompt to notice your thoughts. Its digits reduce to 4 (structure). It is a reflective symbol, not a prediction.'
    },
    '1212': {
      title: 'Steps & Progression', root: 6, element: 'earth', color: '#c8b07a',
      keywords: ['Progress', 'Steps', 'Growth', 'Order'],
      meaning: '1212 alternates the beginning (1) with the partnership and balance of (2), like steps climbed in sequence. It is commonly read as a mirror for steady progression — moving in the right order, one balanced step at a time. Its digits reduce to 6 — care woven through progress.',
      reflection: 'What is the next small, ordered step rather than the whole staircase?',
      faq: 'In numerology, 1212 alternates 1 (beginnings) and 2 (balance), often read as a symbol of steady, ordered progress. Its digits reduce to 6. It is a reflective prompt, not a forecast.'
    }
  };

  // Display order for the reference grid.
  var ORDER = ['111', '222', '333', '444', '555', '666', '777', '888', '999', '000', '1111', '1212'];

  // ── Mirror / repeating time detection ─────────────────────────────────────
  // Reads HH:MM (24h). Returns the matched repeating-number key + a label, or
  // null. Mirror times like 12:21 / 13:31 are recognised as "mirror" moments.

  function pad2(n) { return String(n).padStart(2, '0'); }

  // Map a detected HH:MM to a reference number key when it lines up with one of
  // the canonical sequences (e.g. 11:11 → 1111, 12:12 → 1212, 03:33 → 333).
  function matchTime(h, m) {
    var hh = pad2(h);
    var mm = pad2(m);
    var compact = hh + mm; // e.g. "1111", "0333", "1212"

    // Exact canonical sequences first.
    if (compact === '1111') return { key: '1111', label: '11:11', kind: 'portal' };
    if (compact === '1212') return { key: '1212', label: '12:12', kind: 'mirror' };
    if (hh === '00' && mm === '00') return { key: '000', label: '00:00', kind: 'reset' };

    // Triple-minute against a repeated hour digit: H:NN where minutes repeat
    // and equal a single-digit triple (e.g. 02:22 → 222, 03:33 → 333, 11:11 handled above).
    if (mm[0] === mm[1]) {
      var md = mm[0];
      // hour is a single value 1-9 matching the minute digit → 1:11, 2:22 … 9:99(invalid)
      var hourNum = parseInt(hh, 10);
      if (md !== '0' && String(hourNum) === md && (md + md + md) in NUMBERS) {
        return { key: md + md + md, label: hourNum + ':' + mm, kind: 'repeat' };
      }
      // 11:11-style already covered; also surface generic xx:yy mirrors below.
    }

    // Mirror times: digits read the same forwards and backwards, e.g.
    // 12:21, 13:31, 21:12, 05:50→no… we require true palindrome of HHMM.
    if (compact === compact.split('').reverse().join('') && hh !== mm) {
      return { key: null, label: hh + ':' + mm, kind: 'mirror' };
    }

    // Repeated-pair mirror where hour digits equal minute digits, e.g. 13:13, 20:20.
    if (hh === mm && hh !== '00') {
      return { key: null, label: hh + ':' + mm, kind: 'mirror' };
    }

    return null;
  }

  // Build the fused live reading for a given moment.
  function readMoment(date, lat, lon) {
    date = date instanceof Date ? date : new Date();
    var h = date.getHours();
    var m = date.getMinutes();
    var match = matchTime(h, m);

    var compact = pad2(h) + pad2(m);
    var timeRoot = rootOf(compact); // numerology of the time itself
    var ph = getPlanetaryHour(date, lat, lon);

    var ref = match && match.key ? NUMBERS[match.key] : null;

    return {
      isMoment: !!match,
      kind: match ? match.kind : null,
      label: match ? match.label : (pad2(h) + ':' + pad2(m)),
      key: match ? match.key : null,
      reference: ref,
      timeRoot: timeRoot,
      timeRootMeaning: rootMeaning(timeRoot),
      planetaryHour: ph
    };
  }

  // Short reflective meaning for a reduced root digit (deterministic).
  var ROOT_MEANINGS = {
    1: 'beginnings and focus',
    2: 'balance and partnership',
    3: 'expression and creativity',
    4: 'structure and steadiness',
    5: 'change and movement',
    6: 'care and responsibility',
    7: 'reflection and insight',
    8: 'cycles and reciprocity',
    9: 'completion and release',
    11: 'heightened intuition (master 11)',
    22: 'grounded vision (master 22)',
    33: 'compassionate service (master 33)',
    0: 'stillness and open potential'
  };
  function rootMeaning(n) { return ROOT_MEANINGS[n] || 'reflection'; }

  // ── Public API ────────────────────────────────────────────────────────────
  window.AngelNumbers = {
    NUMBERS: NUMBERS,
    ORDER: ORDER,
    reduce: reduce,
    rootOf: rootOf,
    sumDigits: sumDigits,
    rootMeaning: rootMeaning,
    matchTime: matchTime,
    readMoment: readMoment,
    getPlanetaryHour: getPlanetaryHour
  };
})();
