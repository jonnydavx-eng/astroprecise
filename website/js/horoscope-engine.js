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

  var ASPECTS = [
    { name: 'conjunction', angle: 0, verb: 'conjoins', quality: 'blend' },
    { name: 'sextile', angle: 60, verb: 'sextiles', quality: 'support' },
    { name: 'square', angle: 90, verb: 'squares', quality: 'friction' },
    { name: 'trine', angle: 120, verb: 'trines', quality: 'flow' },
    { name: 'opposition', angle: 180, verb: 'opposes', quality: 'polarity' },
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

  function buildSkyFacts(pos, sunIdx, phase) {
    var facts = [];
    if (pos.moon) {
      facts.push('☽ Moon in ' + pos.moon.sign + ' (your solar ' + ordinal(solarHouse(pos.moon.signIdx, sunIdx)) + ' house)');
    }
    if (phase) facts.push('Lunar phase: ' + phase.name);
    ['mercury', 'venus', 'mars', 'jupiter', 'saturn'].forEach(function (k) {
      if (!pos[k]) return;
      var h = solarHouse(pos[k].signIdx, sunIdx);
      var rx = pos[k].retrograde ? ' retrograde' : '';
      facts.push((GLYPHS[k.charAt(0).toUpperCase() + k.slice(1)] || '') + ' ' +
        k.charAt(0).toUpperCase() + k.slice(1) + ' in ' + pos[k].sign + rx +
        ' (solar house ' + h + ')');
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
    var rng = mulberry32(seed >>> 0);
    var colors = ['Amethyst Purple', 'Celestial Gold', 'Midnight Blue', 'Emerald Green',
      'Ruby Red', 'Pearl White', 'Sapphire', 'Rose Gold', 'Obsidian Black'];
    var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return {
      sign: sign,
      date: day.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      overview: overviewParts.join(' '),
      love: love,
      career: career,
      health: health,
      weekly: weekly,
      luckyNumber: (seed % 9) + 1,
      luckyColor: colors[seed % colors.length],
      bestDay: days[(day.getDay() + (hits.length ? hits[0].planet.length : 3)) % 7],
      moodScore: mood,
      skyFacts: buildSkyFacts(pos, sunIdx, phase),
      methodNote: 'Solar-chart horoscope: whole-sign houses from your Sun sign, computed from VSOP87 ephemeris at local noon. For your full natal chart see transits.html.',
      transits: hits.slice(0, 3).map(function (h) {
        return {
          planet: h.planet,
          aspect: h.hit.aspect.name,
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
      lead += ' Jupiter in ' + pos0.jupiter.sign + ' (your solar house ' +
        solarHouse(pos0.jupiter.signIdx, sunIdx) + ') expands ' +
        HOUSE_THEME[solarHouse(pos0.jupiter.signIdx, sunIdx)] + '.';
    }
    if (pos0.saturn) {
      lead += ' Saturn in ' + pos0.saturn.sign + ' asks for patience in ' +
        HOUSE_THEME[solarHouse(pos0.saturn.signIdx, sunIdx)] + '.';
    }
    return lead + ' For your personal chart, open transits.html.';
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
      methodNote: 'Month scaffold from mid-month ephemeris + solar houses; daily email uses getDailyHoroscope per send date.',
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