/**
 * Plain placement lines for the chart tabs.
 * Planet is what. Sign is how. House is where in life.
 * Second person. One picture. Not a forecast.
 * Unknown time never paints Moon precision, Rising, or houses out loud.
 */
(function (w) {
  'use strict';

  var WHAT = {
    Sun: 'how you shine',
    Moon: 'what you need',
    Mercury: 'how you think and speak',
    Venus: 'what you love and value',
    Mars: 'how you act',
    Jupiter: 'where you look for room to grow',
    Saturn: 'the long work you actually keep',
    Uranus: 'where you refuse the given order',
    Neptune: 'what you long for before you can prove it',
    Pluto: 'what slowly transforms and does not go back',
    Chiron: 'the tender skill that came from a bruise',
    Lilith: 'the part of you that will not be sanded down',
    'North Node': 'the direction you grow toward',
    'South Node': 'the skill you already have',
    Ascendant: 'how you meet the world',
    Midheaven: 'the work in the world people can see'
  };

  var HOW = {
    Aries: 'a first move — you start while other people are still circling',
    Taurus: 'something you can hold — you trust what lasts',
    Gemini: 'talking it through until the room gets smaller',
    Cancer: 'protecting what feels like home, even in a borrowed kitchen',
    Leo: 'being seen doing the thing, not waiting to be invited',
    Virgo: 'making it useful and exact, then quietly handing it over',
    Libra: 'finding the fair arrangement before anyone has to raise their voice',
    Scorpio: 'all-in, or not at all',
    Sagittarius: 'going farther for a meaning you can stand on',
    Capricorn: 'building something that still stands at the end of the year',
    Aquarius: 'changing the rule so more people can breathe',
    Pisces: 'feeling the room before anyone names the weather'
  };

  var HOUSE = {
    1: 'how you meet the world',
    2: 'what you own and value',
    3: 'words, siblings and short roads',
    4: 'home and where you come from',
    5: 'what you make, play at and love out loud',
    6: 'work, habits and health',
    7: 'partners and one-to-one bonds',
    8: 'what is shared, owed and transformed',
    9: 'belief, study and long roads',
    10: 'work in the world and reputation',
    11: 'friends, allies and the future',
    12: 'rest, retreat and the unseen'
  };

  var HOUSE_NAME = {
    first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6,
    seventh: 7, eighth: 8, ninth: 9, tenth: 10, eleventh: 11, twelfth: 12
  };

  var VERB = {
    conjunction: 'sits with',
    opposition: 'faces',
    square: 'presses',
    trine: 'flows with',
    sextile: 'opens a door for',
    quincunx: 'asks a sideways adjustment of',
    inconjunct: 'asks a sideways adjustment of',
    semisextile: 'quietly nudges',
    sesquiquadrate: 'keeps a low friction with',
    quintile: 'sparks a creative edge with'
  };

  var BODY_RE = 'Sun|Moon|Mercury|Venus|Mars|Jupiter|Saturn|Uranus|Neptune|Pluto|Chiron|Lilith|North Node|South Node|Ascendant|Midheaven';
  var SIGN_RE = 'Aries|Taurus|Gemini|Cancer|Leo|Virgo|Libra|Scorpio|Sagittarius|Capricorn|Aquarius|Pisces';
  var PLACE_RE = new RegExp('(' + BODY_RE + ')\\s+in\\s+(' + SIGN_RE + ')\\b', 'i');
  var HOUSE_TITLE_RE = /^House\s+(\d+)\b/i;
  var HOUSE_PLAIN_RE = /\b(?:the\s+)?(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth|\d+)(?:st|nd|rd|th)?\s+house\b/i;
  var TEXTBOOK_PERSON = /\b(these individuals|this individual|natives of|the natives|the native|this native|people with this placement)\b/i;
  var TEXTBOOK_VOICE = /\b(at the collective level|in a natal chart, the house position|marks a generation called|this placement|traditionally (?:read|associated)|in modern nodal astrology|the (?:first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth) house governs)\b/i;

  function titleCase(s) {
    s = String(s || '').replace(/\s+/g, ' ').trim();
    if (/^north\s*node$/i.test(s) || s === 'NorthNode') return 'North Node';
    if (/^south\s*node$/i.test(s) || s === 'SouthNode') return 'South Node';
    if (!s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function isTextbookPerson(s) {
    return TEXTBOOK_PERSON.test(String(s || ''));
  }

  function isTextbookVoice(s) {
    var t = String(s || '');
    return isTextbookPerson(t) || TEXTBOOK_VOICE.test(t);
  }

  function hasBirthTime(chart) {
    return !!(chart && chart.timeKnown === true);
  }

  function houseNumber(value) {
    var n = parseInt(value, 10);
    return (n >= 1 && n <= 12) ? n : 0;
  }

  function fromPlain(text, house) {
    var plain = String(text || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!plain) return '';
    var place = plain.match(PLACE_RE);
    if (place) return line(place[1], place[2], house);
    var named = plain.match(HOUSE_PLAIN_RE);
    if (named) {
      var raw = String(named[1] || '').toLowerCase();
      return houseLine(HOUSE_NAME[raw] || raw);
    }
    return '';
  }

  function fromTitle(title, house) {
    var t = String(title || '').replace(/\s+/g, ' ').trim();
    if (!t) return '';
    var h = t.match(HOUSE_TITLE_RE);
    if (h) return houseLine(h[1]);
    return fromPlain(t, house);
  }

  function line(planet, sign, house) {
    var p = titleCase(planet);
    var how = HOW[titleCase(sign)];
    var what = WHAT[p];
    if (!what || !how) return '';
    var out = 'Your ' + p + ' is ' + what + ' — in ' + titleCase(sign) + ' that looks like ' + how + '.';
    var h = houseNumber(house);
    if (h && HOUSE[h]) out += ' It lives in ' + HOUSE[h] + '.';
    return out;
  }

  function houseLine(number) {
    var h = houseNumber(number);
    if (!HOUSE[h]) return '';
    return 'House ' + h + ' is ' + HOUSE[h] + '. Planets here colour that life area; they do not predict it.';
  }

  function aspectLine(p1, p2, type) {
    var a = titleCase(p1);
    var b = titleCase(p2);
    var verb = VERB[String(type || '').toLowerCase()] || 'meets';
    if (!a || !b) return '';
    return 'Your ' + a + ' ' + verb + ' your ' + b + ' — two parts of you in the same room. Neither wins; the conversation is the point.';
  }

  function overview(chart) {
    if (!chart || !chart.positions) return '';
    var timed = hasBirthTime(chart);
    var bits = [];
    var sun = chart.positions.Sun;
    var sunHouse = timed && chart.planetHouses ? chart.planetHouses.Sun : null;
    if (sun && sun.sign) bits.push(line('Sun', sun.sign, sunHouse));
    if (timed) {
      var moon = chart.positions.Moon;
      var moonHouse = chart.planetHouses ? chart.planetHouses.Moon : null;
      if (moon && moon.sign) bits.push(line('Moon', moon.sign, moonHouse));
      if (chart.risingSign) {
        bits.push('Your rising is how you meet the world — in ' + chart.risingSign + ' that looks like ' + (HOW[chart.risingSign] || 'a first impression you did not rehearse') + '.');
      }
    } else {
      bits.push('Your Moon, rising and houses wait for a birth time. Noon is a date reference, not your hour.');
    }
    return bits.filter(Boolean).join(' ');
  }

  w.APPlainPlacement = {
    line: line,
    houseLine: houseLine,
    aspectLine: aspectLine,
    overview: overview,
    fromPlain: fromPlain,
    fromTitle: fromTitle,
    isTextbookPerson: isTextbookPerson,
    isTextbookVoice: isTextbookVoice,
    hasBirthTime: hasBirthTime,
    WHAT: WHAT,
    HOW: HOW,
    HOUSE: HOUSE
  };
})(typeof window !== 'undefined' ? window : globalThis);
