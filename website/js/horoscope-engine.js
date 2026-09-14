/**
 * Astro Precise — transit-based sun-sign horoscope engine.
 * Professional solar-chart readings from live VSOP87 positions (whole-sign houses).
 * Replaces generic/fictional aspect copy in interpretations.js / sign-daily.js.
 * Depends on: window.AstroEphemeris
 */
(function () {
  'use strict';

  if (typeof window.normalizeAngle !== 'function') {
    window.normalizeAngle = function (deg) { return ((deg % 360) + 360) % 360; };
  }

  var SIGNS = [
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
  ];

  var GLYPHS = {
    Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
    Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇',
  };

  var RULERS = {
    Aries: 'Mars', Taurus: 'Venus', Gemini: 'Mercury', Cancer: 'Moon',
    Leo: 'Sun', Virgo: 'Mercury', Libra: 'Venus', Scorpio: 'Pluto',
    Sagittarius: 'Jupiter', Capricorn: 'Saturn', Aquarius: 'Saturn', Pisces: 'Jupiter',
  };

  // `name` is the machine key (stable — other modules and the content bank key off
  // it). `verb`, `label` and `phrase` are the READER-FACING wordings and are the
  // only forms that may reach the page. Trade names never print: 60° is a helpful
  // angle, 90° presses, 120° flows.
  //   verb   — mid-sentence: "Transiting Venus <verb> your Leo Sun"
  //   label  — short tag beside the planet: "venus <label>"
  //   phrase — joins two bodies: "Venus <phrase> your Sun"
  var ASPECTS = [
    { name: 'conjunction', angle: 0, verb: 'meets', label: 'meeting', phrase: 'meeting', quality: 'blend' },
    { name: 'sextile', angle: 60, verb: 'sits at a helpful angle to', label: 'helpful angle', phrase: 'at a helpful angle to', quality: 'support' },
    { name: 'square', angle: 90, verb: 'presses', label: 'press', phrase: 'pressing', quality: 'friction' },
    { name: 'trine', angle: 120, verb: 'flows with', label: 'flow', phrase: 'flowing with', quality: 'flow' },
    { name: 'opposition', angle: 180, verb: 'opposes', label: 'opposition', phrase: 'opposite', quality: 'polarity' },
  ];

  var ORB = 3;

  var HOUSE_THEME = {
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

  var LOVE_BY_HOUSE = {
    5: 'Romance and creative chemistry run high — express affection directly and make room for spontaneity.',
    7: 'Partnership is in focus — clarity, fairness, and one honest conversation carry more weight than guessing.',
    8: 'Emotional honesty deepens bonds — vulnerability offered carefully can transform a static connection.',
    1: 'Your presence is the attraction — confidence without performance draws the right kind of attention.',
    4: 'Nesting and emotional safety matter — tenderness at home strengthens every outward relationship.',
    11: 'Friendship and shared ideals colour love — connection grows through community and aligned values.',
  };

  var CAREER_BY_HOUSE = {
    10: 'Professional visibility is activated — deliver one polished piece of work and let competence speak.',
    6: 'Systems and craft win — refine the process, finish the backlog, and improve one routine permanently.',
    3: 'Messages and meetings matter — pitch, write, negotiate, and follow up while ideas are still warm.',
    2: 'Income and value propositions are live — price your work fairly and back it with substance.',
    9: 'Teaching, publishing, or cross-border opportunities open — think bigger than this week\'s inbox.',
    11: 'Collaboration and network intelligence advance goals — the right ally shortens the path.',
  };

  var HEALTH_BY_PHASE = {
    waxing: 'Build energy gradually — consistent movement and nourishment compound through the week.',
    waning: 'Recovery and release are favoured — sleep, hydration, and fewer inputs restore clarity.',
    full: 'Peak vitality can tip into overstimulation — pace intensity and cool down deliberately tonight.',
    new: 'A quieter baseline suits the body — gentle movement and early rest reset the nervous system.',
  };

  var USE_BY_HOUSE = {
    1: 'Use one clean first impression — show up as you are, then stop.',
    2: 'Use the keep-or-spend choice you have already made in private.',
    3: 'Use a short message while the thought is still warm.',
    4: 'Use a quieter hour at home before you answer the room.',
    5: 'Use one honest creative or affectionate gesture.',
    6: 'Use a small repair in the daily routine.',
    7: 'Use one fair conversation instead of guessing.',
    8: 'Use a truthful sentence about what is shared.',
    9: 'Use the larger meaning of one task, not ten.',
    10: 'Use one finished piece of work as the proof.',
    11: 'Use a friend or ally instead of going it alone.',
    12: 'Use rest as work — protect a gap in the schedule.',
  };

  var LEAVE_BY_HOUSE = {
    1: 'Leave proving you are unbothered.',
    2: 'Leave a yes that costs more than it is worth.',
    3: 'Leave the third explanation.',
    4: 'Leave treating old weather as if it were this afternoon.',
    5: 'Leave performing fun you do not feel.',
    6: 'Leave heroic overtime as a personality.',
    7: 'Leave mind-reading a partner or counterpart.',
    8: 'Leave a secret that is really a stall.',
    9: 'Leave a grand plan that has no next hour.',
    10: 'Leave reputation management that is not the work.',
    11: 'Leave a group that is not a community.',
    12: 'Leave filling every quiet minute.',
  };

  function mod360(x) { return ((x % 360) + 360) % 360; }
  function signIndex(lon) { return Math.floor(mod360(lon) / 30); }
  function signName(lon) { return SIGNS[signIndex(lon)]; }
  function solarHouse(planetSignIdx, sunSignIdx) {
    return ((planetSignIdx - sunSignIdx + 12) % 12) + 1;
  }
  function jdAtLocalNoon(date) {
    var E = window.AstroEphemeris;
    return E.julianDay(date.getFullYear(), date.getMonth() + 1, date.getDate(), 12, 0, 0);
  }
  function localEpochDay(date) {
    return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
  }
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function pick(rng, arr) { return arr[Math.floor(rng() * arr.length) % arr.length]; }

  function moonPhase(jd) {
    var synodic = 29.53058867;
    var ref = 2451549.5;
    var p = ((jd - ref) % synodic + synodic) % synodic / synodic;
    var name;
    if (p < 0.03 || p > 0.97) name = 'New Moon';
    else if (p < 0.22) name = 'Waxing Crescent';
    else if (p < 0.28) name = 'First Quarter';
    else if (p < 0.47) name = 'Waxing Gibbous';
    else if (p < 0.53) name = 'Full Moon';
    else if (p < 0.72) name = 'Waning Gibbous';
    else if (p < 0.78) name = 'Last Quarter';
    else name = 'Waning Crescent';
    var waxing = p < 0.5;
    return { phase: p, name: name, waxing: waxing, bucket: p < 0.06 || p > 0.94 ? 'new' : p > 0.47 && p < 0.53 ? 'full' : waxing ? 'waxing' : 'waning' };
  }

  function getBody(jd, key) {
    var E = window.AstroEphemeris;
    var fn = E[key + 'Position'];
    if (typeof fn !== 'function') return null;
    try {
      var pos = fn(jd);
      if (!pos || typeof pos.lon !== 'number') return null;
      return {
        lon: mod360(pos.lon),
        sign: signName(pos.lon),
        signIdx: signIndex(pos.lon),
        retrograde: !!pos.retrograde,
        speed: typeof pos.speed === 'number' ? pos.speed : null,
      };
    } catch (e) { return null; }
  }

  function getPositions(jd) {
    var keys = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];
    var out = {};
    keys.forEach(function (k) {
      var b = getBody(jd, k);
      if (b) out[k] = b;
    });
    return out;
  }

  function findAspect(lon1, lon2) {
    var diff = Math.abs(((lon1 - lon2 + 180) % 360) - 180);
    for (var i = 0; i < ASPECTS.length; i++) {
      var a = ASPECTS[i];
      if (Math.abs(diff - a.angle) <= ORB) {
        return { aspect: a, orb: +(Math.abs(diff - a.angle)).toFixed(2) };
      }
    }
    return null;
  }

  function solarSunLon(sunSignIdx) { return sunSignIdx * 30 + 15; }

  function rankTransit(planet, hit) {
    var weight = { sun: 5, moon: 5, mercury: 4, venus: 4, mars: 4, jupiter: 3, saturn: 3 };
    var q = hit.aspect.quality === 'friction' || hit.aspect.quality === 'polarity' ? 1.2 : 1;
    return (weight[planet] || 2) * q;
  }

  function aspectSentence(planet, hit, targetLabel) {
    var g = GLYPHS[planet.charAt(0).toUpperCase() + planet.slice(1)] || '';
    var pName = planet.charAt(0).toUpperCase() + planet.slice(1);
    if (hit.aspect.quality === 'support' || hit.aspect.quality === 'flow') {
      return 'Transiting ' + pName + ' ' + hit.aspect.verb + ' your ' + targetLabel + ' — cooperative sky weather that eases effort in that area.';
    }
    if (hit.aspect.quality === 'friction') {
      return 'Transiting ' + pName + ' ' + hit.aspect.verb + ' your ' + targetLabel + ' — productive friction; adjust pace rather than forcing a clean win.';
    }
    if (hit.aspect.quality === 'polarity') {
      return 'Transiting ' + pName + ' ' + hit.aspect.verb + ' your ' + targetLabel + ' — awareness through contrast; balance your position with someone else\'s perspective.';
    }
    return 'Transiting ' + pName + ' ' + hit.aspect.verb + ' your ' + targetLabel + ' — concentrated focus; one theme dominates the day.';
  }

  function lifeArea(planetSignIdx, sunSignIdx) {
    return solarHouse(planetSignIdx, sunSignIdx);
  }

  function firstTheme(house) {
    var theme = HOUSE_THEME[house] || 'the day as it stands';
    return theme.split(',')[0];
  }

  function planetTitle(planet) {
    return planet.charAt(0).toUpperCase() + planet.slice(1);
  }

  function buildTodayScreen(sign, pos, moonHouse, phase, hits) {
    var area = firstTheme(moonHouse);
    var todayLine;
    if (hits.length) {
      var pName = planetTitle(hits[0].planet);
      var q = hits[0].hit.aspect.quality;
      if (q === 'friction') {
        todayLine = pName + ' presses the ' + sign + ' Sun — slow the yes around ' + area + '.';
      } else if (q === 'flow') {
        todayLine = pName + ' flows with the ' + sign + ' Sun — easier weather around ' + area + '.';
      } else if (q === 'support') {
        todayLine = pName + ' sits at a helpful angle to the ' + sign + ' Sun — easier weather around ' + area + '.';
      } else if (q === 'polarity') {
        todayLine = pName + ' faces the ' + sign + ' Sun — get a second view on ' + area + '.';
      } else {
        todayLine = pName + ' meets the ' + sign + ' Sun — today’s centre is ' + area + '.';
      }
    } else {
      todayLine = 'The Moon in ' + pos.moon.sign + ' puts the day on ' + area + '.';
    }

    var useThis = USE_BY_HOUSE[moonHouse] || USE_BY_HOUSE[6];
    var leaveThis = LEAVE_BY_HOUSE[moonHouse] || LEAVE_BY_HOUSE[12];
    if (pos.mercury && pos.mercury.retrograde) {
      leaveThis = 'Leave a send, booking, or assumption that cannot be unsent.';
    } else if (hits[0] && hits[0].hit.aspect.quality === 'friction') {
      leaveThis = 'Leave forcing a clean win; adjust the pace instead.';
    } else if (phase.bucket === 'full') {
      leaveThis = 'Leave stacking one more demand onto a full sky.';
    } else if (phase.bucket === 'new') {
      leaveThis = 'Leave filling the quiet with extra inputs.';
    }

    return { todayLine: todayLine, useThis: useThis, leaveThis: leaveThis };
  }

  function buildSkyFacts(pos, sunIdx, phase) {
    var facts = [];
    if (pos.moon) {
      facts.push('☽ Moon in ' + pos.moon.sign + ' (life area ' +
        lifeArea(pos.moon.signIdx, sunIdx) + ' from the Sun sign)');
    }
    if (phase) facts.push('Lunar phase: ' + phase.name);
    ['mercury', 'venus', 'mars', 'jupiter', 'saturn'].forEach(function (k) {
      if (!pos[k]) return;
      var h = lifeArea(pos[k].signIdx, sunIdx);
      var rx = pos[k].retrograde ? ' retrograde' : '';
      facts.push((GLYPHS[k.charAt(0).toUpperCase() + k.slice(1)] || '') + ' ' +
        k.charAt(0).toUpperCase() + k.slice(1) + ' in ' + pos[k].sign + rx +
        ' (life area ' + h + ' from the Sun sign)');
    });
    return facts;
  }

  function ordinal(n) {
    var s = ['th', 'st', 'nd', 'rd'];
    var v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  function getDailyHoroscope(sign, date) {
    var sunIdx = SIGNS.indexOf(sign);
    if (sunIdx === -1) return null;
    var day = date instanceof Date ? date : new Date(date);
    var E = window.AstroEphemeris;
    if (!E) return null;

    var jd = jdAtLocalNoon(day);
    var pos = getPositions(jd);
    if (!pos.moon) return null;

    var phase = moonPhase(jd);
    var moonHouse = solarHouse(pos.moon.signIdx, sunIdx);
    var sunLon = solarSunLon(sunIdx);
    var ruler = RULERS[sign];
    var rulerKey = ruler.toLowerCase();
    if (ruler === 'Sun') rulerKey = 'sun';
    if (ruler === 'Moon') rulerKey = 'moon';
    if (ruler === 'Pluto') rulerKey = 'pluto';

    var hits = [];
    var aspectBodies = ['moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];
    if (rulerKey === 'pluto') aspectBodies.push('pluto');
    aspectBodies.forEach(function (p) {
      if (!pos[p]) {
        if (p === 'pluto') {
          var pl = getBody(jd, 'pluto');
          if (pl) pos.pluto = pl;
        }
        if (!pos[p]) return;
      }
      var hit = findAspect(pos[p].lon, sunLon);
      if (hit) hits.push({ planet: p, hit: hit, rank: rankTransit(p, hit) });
    });
    hits.sort(function (a, b) { return b.rank - a.rank; });

    var mood = 58;
    hits.forEach(function (h) {
      if (h.hit.aspect.quality === 'support' || h.hit.aspect.quality === 'flow') mood += 5;
      if (h.hit.aspect.quality === 'friction' || h.hit.aspect.quality === 'polarity') mood -= 4;
      if (h.hit.aspect.quality === 'blend') mood += 2;
    });
    if (phase.bucket === 'full') mood += 3;
    if (phase.bucket === 'new') mood -= 2;
    mood = Math.max(12, Math.min(94, mood));

    var overviewParts = [];
    overviewParts.push(
      'The Moon in ' + pos.moon.sign + ' moves through your solar ' + ordinal(moonHouse) +
      ' house today, emphasising ' + HOUSE_THEME[moonHouse] + '. ' +
      'We are in a ' + phase.name + ' phase — ' +
      (phase.waxing
        ? 'energy builds toward expression and outward momentum.'
        : 'the sky favours editing, completion, and quieter integration.')
    );

    if (hits.length) {
      overviewParts.push(aspectSentence(hits[0].planet, hits[0].hit, sign + ' Sun'));
    }

    if (pos.mercury && pos.mercury.retrograde) {
      overviewParts.push('Mercury is retrograde in ' + pos.mercury.sign + ' — double-check messages, travel plans, and assumptions before committing.');
    }

    if (pos[rulerKey] && pos[rulerKey].signIdx === sunIdx) {
      overviewParts.push('Your ruler ' + ruler + ' is in ' + sign + ' today, concentrating the sign\'s native themes — act in character, not against it.');
    }

    var loveHouse = [5, 7, 8, 1, 4, 11].indexOf(moonHouse) >= 0 ? moonHouse
      : (pos.venus ? solarHouse(pos.venus.signIdx, sunIdx) : 7);
    var love = LOVE_BY_HOUSE[loveHouse] || LOVE_BY_HOUSE[7];
    if (pos.venus) {
      love += ' Venus in ' + pos.venus.sign + (pos.venus.retrograde ? ' (retrograde)' : '') +
        ' colours affection and aesthetics — lead with sincerity over spectacle.';
    }

    var careerHouse = [10, 6, 3, 2, 9, 11].indexOf(moonHouse) >= 0 ? moonHouse
      : (pos.saturn ? solarHouse(pos.saturn.signIdx, sunIdx) : 10);
    var career = CAREER_BY_HOUSE[careerHouse] || CAREER_BY_HOUSE[10];
    if (pos.mars) {
      career += ' Mars in ' + pos.mars.sign + (pos.mars.retrograde ? ' (retrograde)' : '') +
        ' sets the pace of effort — direct drive wisely, not impatiently.';
    }

    var health = HEALTH_BY_PHASE[phase.bucket] || HEALTH_BY_PHASE.waxing;
    health += ' The Moon\'s passage through your ' + ordinal(moonHouse) +
      ' house suggests tending ' + HOUSE_THEME[moonHouse] + ' supports body-mind balance.';

    var weekly = buildWeekly(sign, sunIdx, day);
    var seed = localEpochDay(day) + sunIdx * 31;
    var colors = ['Amethyst Purple', 'Celestial Gold', 'Midnight Blue', 'Emerald Green',
      'Ruby Red', 'Pearl White', 'Sapphire', 'Rose Gold', 'Obsidian Black'];
    var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var todayScreen = buildTodayScreen(sign, pos, moonHouse, phase, hits);

    return {
      sign: sign,
      date: day.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      overview: overviewParts.join(' '),
      todayLine: todayScreen.todayLine,
      useThis: todayScreen.useThis,
      leaveThis: todayScreen.leaveThis,
      love: love,
      career: career,
      health: health,
      weekly: weekly,
      luckyNumber: (seed % 9) + 1,
      luckyColor: colors[seed % colors.length],
      bestDay: days[(day.getDay() + (hits.length ? hits[0].planet.length : 3)) % 7],
      moodScore: mood,
      skyFacts: buildSkyFacts(pos, sunIdx, phase),
      // Honesty: calendar date at 12:00 UT, solar chart, reflection not fact.
      // A solar house is a life area counted from the Sun sign, not a room.
      // Birth-chart door is chart.html — not transits.html.
      methodNote: 'Positions calculated at 12:00 UT and read through a solar chart. A solar house is a life area counted from the Sun sign, not a room. Meaning is offered for reflection, not as fact. Planet positions from the VSOP87 model. For your full birth chart, see chart.html.',
      transits: hits.slice(0, 3).map(function (h) {
        return {
          planet: h.planet,
          aspect: h.hit.aspect.name,          // machine key — never printed raw
          aspectLabel: h.hit.aspect.label,    // short tag for the page
          aspectPhrase: h.hit.aspect.phrase,  // joins two bodies in a sentence
          orb: h.hit.orb,
          text: aspectSentence(h.planet, h.hit, sign + ' Sun'),
        };
      }),
    };
  }

  function buildWeekly(sign, sunIdx, startDate) {
    var themes = [];
    var E = window.AstroEphemeris;
    if (!E) return '';
    for (var i = 0; i < 7; i++) {
      var d = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i);
      var pos = getPositions(jdAtLocalNoon(d));
      if (pos.moon) {
        themes.push(pos.moon.sign);
      }
    }
    var unique = themes.filter(function (s, idx, arr) { return arr.indexOf(s) === idx; });
    var jd = jdAtLocalNoon(startDate);
    var pos0 = getPositions(jd);
    var lead = 'This week the Moon travels through ' + unique.slice(0, 4).join(', ') +
      (unique.length > 4 ? '…' : '') + ' relative to the sky.';
    if (pos0.jupiter) {
      lead += ' Jupiter in ' + pos0.jupiter.sign + ' (life area ' +
        solarHouse(pos0.jupiter.signIdx, sunIdx) + ' from the Sun sign) expands ' +
        HOUSE_THEME[solarHouse(pos0.jupiter.signIdx, sunIdx)] + '.';
    }
    if (pos0.saturn) {
      lead += ' Saturn in ' + pos0.saturn.sign + ' asks for patience in ' +
        HOUSE_THEME[solarHouse(pos0.saturn.signIdx, sunIdx)] + '.';
    }
    return lead + ' For your personal chart, open chart.html.';
  }

  function getMonthlyHoroscope(sign, date) {
    var sunIdx = SIGNS.indexOf(sign);
    if (sunIdx === -1) return null;
    var d = date instanceof Date ? date : new Date(date);
    var E = window.AstroEphemeris;
    if (!E) return null;

    var jd = jdAtLocalNoon(new Date(d.getFullYear(), d.getMonth(), 15));
    var pos = getPositions(jd);
    var seed = d.getFullYear() * 12 + d.getMonth() + sunIdx * 97;
    var rng = mulberry32(seed >>> 0);

    var overviewParts = [];
    if (pos.sun) {
      overviewParts.push('The Sun in ' + pos.sun.sign + ' this month spotlights ' +
        HOUSE_THEME[solarHouse(pos.sun.signIdx, sunIdx)] + ' for ' + sign + '.');
    }
    if (pos.jupiter) {
      overviewParts.push('Jupiter in ' + pos.jupiter.sign + ' grows opportunities around ' +
        HOUSE_THEME[solarHouse(pos.jupiter.signIdx, sunIdx)] + '.');
    }
    if (pos.saturn) {
      overviewParts.push('Saturn in ' + pos.saturn.sign + ' structures progress in ' +
        HOUSE_THEME[solarHouse(pos.saturn.signIdx, sunIdx)] + ' — discipline beats speed.');
    }
    if (pos.mercury && pos.mercury.retrograde) {
      overviewParts.push('Mercury retrograde this month rewards review, renegotiation, and careful wording.');
    }

    var lovePool = [
      'Relational clarity improves when you name needs early in the month rather than hoping they are inferred.',
      'Affection deepens through reliability and small rituals — consistency reads as devotion for ' + sign + '.',
      'Honest dialogue around boundaries strengthens trust; charm without follow-through falls flat.',
      'Vulnerability offered at the right pace magnetises the right people and repels performative interest.',
    ];
    var careerPool = [
      'Professional momentum favours finishing visible work before pitching the next idea.',
      'A collaboration proposed mid-month could define the quarter — vet fit, then commit cleanly.',
      'Reputation for reliability opens a door louder competitors cannot walk through.',
      'Negotiate scope and worth early; late-month pressure makes the same terms harder to land.',
    ];
    var wellnessPool = [
      'Rhythm beats intensity — sleep and movement on a schedule outperform heroic one-off efforts.',
      'Emotional load shows in the body; rest is maintenance, not indulgence.',
      'Reduce noise inputs; two hours of analog calm daily restores more than another late-night push.',
      'A modest habit adopted now compounds into visible vitality by month\'s end.',
    ];

    return {
      sign: sign,
      month: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      overview: overviewParts.join(' ') || ('Monthly outlook for ' + sign + ' follows the live sky — open horoscope.html for daily transits.'),
      love: pick(rng, lovePool),
      career: pick(rng, careerPool),
      health: pick(rng, wellnessPool),
      luckyNumber: (seed % 9) + 1,
      luckyColor: ['Amethyst Purple', 'Celestial Gold', 'Midnight Blue', 'Emerald Green',
        'Ruby Red', 'Pearl White', 'Sapphire', 'Rose Gold', 'Obsidian Black'][seed % 9],
      skyFacts: buildSkyFacts(pos, sunIdx, moonPhase(jd)),
      methodNote: 'Month outlook: planet positions computed for the middle of the month, with houses counted from your Sun sign. The daily reading is recomputed for its own date.',
    };
  }

  window.HoroscopeEngine = {
    getDailyHoroscope: getDailyHoroscope,
    getMonthlyHoroscope: getMonthlyHoroscope,
    SIGNS: SIGNS,
  };

  window.Interpretations = window.Interpretations || {};
  window.Interpretations.getDailyHoroscope = getDailyHoroscope;
  window.Interpretations.getMonthlyHoroscope = getMonthlyHoroscope;
})();