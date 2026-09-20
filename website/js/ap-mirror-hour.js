/**
 * Astro Precise — on-device mirror-hour / repeating-minute helper.
 * window.APMirrorHour
 *
 * Detects folk clock patterns (11:11, 22:22, 00:00, 01:01 … 23:23, 02:22)
 * and returns short popular-culture lines. Entertainment and a pause only.
 * Not prophecy, not medical, not a house doctrine of "angel numbers".
 *
 * No network. Birth minutes stay on this device.
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.APMirrorHour = api;
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var HONESTY = 'Folk clock pattern — entertainment and a pause. Not predictive science. Astro Precise does not invent or own angel numbers.';
  var NATAL_KEY = 'ap-mirror-natal';
  var LIVE_KEY = 'ap-mirror-live';
  var DISMISS_KEY = 'ap-presence-dismissed';
  var DEBUG_STORE = 'ap-mirror-debug';

  var FOLK = {
    '1111': {
      title: 'Wake-up / wish minute',
      line: 'In popular culture 11:11 is a wake-up or wish pause — alignment, not a message from the sky.'
    },
    '1212': {
      title: 'Steady steps',
      line: 'Folk lists often read 12:12 as ordered progress — one balanced step, not a forecast.'
    },
    '000': {
      title: 'Reset pause',
      line: 'Double zero is commonly treated as a clean-slate pause — a breath, not a verdict.'
    },
    '111': {
      title: 'Fresh attention',
      line: 'Repeating 1s are often read as a fresh-start nudge — notice where your attention sits.'
    },
    '222': {
      title: 'Balance',
      line: 'Folk lists often read 222 as balance, patience, and partnership — a pause, not a promise.'
    },
    '333': {
      title: 'Expression',
      line: 'Popular readings of 333 point to voice and making — encouragement to speak, not a prediction.'
    },
    '444': {
      title: 'Ground',
      line: 'Folk lists often read 444 as steadiness and foundations — a grounding pause, not protection as fact.'
    },
    '555': {
      title: 'Change',
      line: 'Popular culture treats 555 as a change-and-loosen cue — symbolic, not a timetable.'
    },
    '666': {
      title: 'Rebalance',
      line: 'In this folk dictionary 666 is read as a nudge to rebalance care and worry — not an omen.'
    },
    '777': {
      title: 'Quiet insight',
      line: 'Folk lists often read 777 as a contemplative pause — insight as metaphor, not proof.'
    },
    '888': {
      title: 'Cycles',
      line: 'Popular readings of 888 talk about cycles and flow — not financial advice.'
    },
    '999': {
      title: 'Release',
      line: 'Folk lists often read 999 as a chapter-closing pause — completion as metaphor, not destiny.'
    }
  };

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function familyFromHour(h) {
    if (h === 0) return '000';
    if (h === 11) return '1111';
    if (h === 12) return '1212';
    if (h === 22) return '222';
    var digit = String(h % 10);
    if (digit === '0') return '000';
    return digit + digit + digit;
  }

  function familyFromRepeatDigit(d) {
    if (d === '0') return '000';
    return d + d + d;
  }

  function makeMatch(h, m, kind, family) {
    var hh = pad2(h);
    var mm = pad2(m);
    var folk = FOLK[family] || FOLK['111'];
    return {
      hour: h,
      minute: m,
      label: hh + ':' + mm,
      compact: hh + mm,
      kind: kind,
      family: family,
      title: folk.title,
      folk: folk.line,
      honesty: HONESTY
    };
  }

  function parseClock(input) {
    if (input == null) return null;
    if (input instanceof Date && !isNaN(input.getTime())) {
      return { hour: input.getHours(), minute: input.getMinutes() };
    }
    var text = String(input).trim();
    if (!text) return null;
    var match = text.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (!match) return null;
    var hour = Number(match[1]);
    var minute = Number(match[2]);
    if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
    return { hour: hour, minute: minute };
  }

  function detect(hour, minute) {
    if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
    var hh = pad2(hour);
    var mm = pad2(minute);

    if (hh === mm) {
      var kind = hour === 11 ? 'portal' : 'mirror';
      return makeMatch(hour, minute, kind, familyFromHour(hour));
    }

    if (mm[0] === mm[1] && mm[0] !== '0') {
      var digit = mm[0];
      var ones = hour % 10;
      var tens = Math.floor(hour / 10);
      if (ones === Number(digit) && (tens === 0 || tens === Number(digit))) {
        return makeMatch(hour, minute, 'repeat', familyFromRepeatDigit(digit));
      }
    }

    return null;
  }

  function detectFromClock(input) {
    var clock = parseClock(input);
    return clock ? detect(clock.hour, clock.minute) : null;
  }

  function parseOverrideToken(raw) {
    var token = String(raw || '').trim().toLowerCase();
    if (!token) return null;
    if (token === '1' || token === 'true' || token === 'presence' || token === 'now') {
      return { hour: 11, minute: 11 };
    }
    if (/^\d{4}$/.test(token)) {
      return parseClock(token.slice(0, 2) + ':' + token.slice(2));
    }
    return parseClock(token);
  }

  function readQuery(search) {
    var q = String(search == null
      ? (typeof location !== 'undefined' && location.search ? location.search : '')
      : search);
    if (!q) return {};
    var out = {};
    q.replace(/^\?/, '').split('&').forEach(function (part) {
      if (!part) return;
      var bits = part.split('=');
      var key = decodeURIComponent(bits[0] || '');
      var value = decodeURIComponent((bits.slice(1).join('=') || '').replace(/\+/g, ' '));
      out[key] = value;
    });
    return out;
  }

  function readStorage(key) {
    try {
      if (typeof sessionStorage === 'undefined') return '';
      return sessionStorage.getItem(key) || '';
    } catch (e) {
      return '';
    }
  }

  function writeStorage(key, value) {
    try {
      if (typeof sessionStorage === 'undefined') return false;
      if (value == null) sessionStorage.removeItem(key);
      else sessionStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  function readDebugOverride(search) {
    var query = readQuery(search);
    var fromQuery = parseOverrideToken(query['ap-mirror'] || query['ap-presence']);
    if (fromQuery) return fromQuery;
    try {
      if (typeof localStorage !== 'undefined') {
        var stored = parseOverrideToken(localStorage.getItem(DEBUG_STORE));
        if (stored) return stored;
      }
    } catch (e) { /* blocked */ }
    return null;
  }

  function nowDate(date) {
    return date instanceof Date && !isNaN(date.getTime()) ? date : new Date();
  }

  function detectNow(date, search) {
    var override = readDebugOverride(search);
    if (override) return detect(override.hour, override.minute);
    var instant = nowDate(date);
    return detect(instant.getHours(), instant.getMinutes());
  }

  function presenceForced(search) {
    var query = readQuery(search);
    if (query['ap-presence'] != null && query['ap-presence'] !== '0' && query['ap-presence'] !== 'false') {
      return true;
    }
    return Boolean(readDebugOverride(search));
  }

  function folkLine(match) {
    return match && match.folk ? match.folk : '';
  }

  function badgeCopy(match) {
    if (!match) return null;
    return {
      label: 'Your birth minute is a mirror hour',
      time: match.label,
      folk: match.folk,
      honesty: HONESTY
    };
  }

  function sittingBeat(match, opts) {
    opts = opts || {};
    if (!match) return null;
    var natal = opts.source === 'natal';
    var live = opts.source === 'live';
    var lead = natal
      ? 'When the numbers lined up'
      : live
        ? 'This minute rhymed on the clock'
        : 'When the numbers lined up';
    var mono = natal
      ? 'Birth clock ' + match.label + ' is a folk mirror pattern on this device.'
      : live
        ? 'Device clock ' + match.label + ' is a folk mirror pattern while you sit with the sky.'
        : 'Clock ' + match.label + ' is a folk mirror pattern.';
    return {
      title: lead,
      mono: mono,
      serif: match.folk + ' This is a short optional beat, not a chapter rewrite and not a destiny claim.',
      honesty: HONESTY
    };
  }

  function cardLabel(match, dateText) {
    if (!match) return '';
    var day = dateText ? String(dateText).slice(0, 10) : '';
    return day ? match.label + ' · ' + day : match.label;
  }

  function rememberNatal(match) {
    if (!match) {
      writeStorage(NATAL_KEY, null);
      return null;
    }
    writeStorage(NATAL_KEY, {
      label: match.label,
      family: match.family,
      kind: match.kind,
      folk: match.folk,
      ts: Date.now()
    });
    return match;
  }

  function rememberLive(match) {
    if (!match) {
      writeStorage(LIVE_KEY, null);
      return null;
    }
    writeStorage(LIVE_KEY, {
      label: match.label,
      family: match.family,
      kind: match.kind,
      folk: match.folk,
      ts: Date.now()
    });
    return match;
  }

  function revive(raw) {
    if (!raw) return null;
    try {
      var data = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (!data || !data.label) return null;
      if (data.ts && (Date.now() - Number(data.ts)) > 12 * 60 * 60 * 1000) return null;
      var clock = parseClock(data.label);
      return clock ? detect(clock.hour, clock.minute) : null;
    } catch (e) {
      return null;
    }
  }

  function readNatal() {
    return revive(readStorage(NATAL_KEY));
  }

  function readLive() {
    return revive(readStorage(LIVE_KEY));
  }

  function isDismissed(label) {
    try {
      if (typeof sessionStorage === 'undefined') return false;
      return sessionStorage.getItem(DISMISS_KEY) === String(label || '');
    } catch (e) {
      return false;
    }
  }

  function dismiss(label) {
    try {
      if (typeof sessionStorage === 'undefined') return;
      sessionStorage.setItem(DISMISS_KEY, String(label || ''));
    } catch (e) { /* blocked */ }
  }

  return {
    HONESTY: HONESTY,
    FOLK: FOLK,
    NATAL_KEY: NATAL_KEY,
    LIVE_KEY: LIVE_KEY,
    DISMISS_KEY: DISMISS_KEY,
    DEBUG_STORE: DEBUG_STORE,
    parseClock: parseClock,
    detect: detect,
    detectFromClock: detectFromClock,
    detectNow: detectNow,
    presenceForced: presenceForced,
    readDebugOverride: readDebugOverride,
    folkLine: folkLine,
    badgeCopy: badgeCopy,
    sittingBeat: sittingBeat,
    cardLabel: cardLabel,
    rememberNatal: rememberNatal,
    rememberLive: rememberLive,
    readNatal: readNatal,
    readLive: readLive,
    isDismissed: isDismissed,
    dismiss: dismiss
  };
});
