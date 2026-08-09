/**
 * Astro Precise — Chart Insight assistant (free, private, on-device).
 * Point-and-click: preset questions + Explain + Today, answered from the real
 * chart via the on-device interpretation engine. No cloud, no API key, nothing
 * sent to a server. (A BYOK cloud path was retired 2026-07-05 per owner request.)
 */
'use strict';

window.APAIAssistant = (function () {
  var PREFS_KEY = 'ap_ai_prefs_v1';

  var TONES = {
    gentle:   { label: 'Gentle', prefix: 'With warmth and patience' },
    direct:   { label: 'Direct', prefix: 'Clearly and without padding' },
    career:   { label: 'Career', prefix: 'With professional focus' },
    growth:   { label: 'Growth', prefix: 'With developmental curiosity' },
    romantic: { label: 'Romantic', prefix: 'With relational sensitivity' },
  };

  function getPrefs() {
    try {
      var p = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
      return { tone: TONES[p.tone] ? p.tone : 'gentle' };
    } catch (e) {
      return { tone: 'gentle' };
    }
  }

  function setPrefs(partial) {
    var next = Object.assign({}, getPrefs(), partial || {});
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(next)); } catch (e) {}
    return next;
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function planet(chart, name) {
    var p = chart && chart.positions;
    if (!p) return null;
    return p[name] || p[name.toLowerCase()] ||
      p[name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()];
  }

  function signOf(chart, name) {
    var p = planet(chart, name);
    if (p && p.sign) return p.sign;
    var low = name.toLowerCase();
    if (low === 'sun' && chart.sunSign) return chart.sunSign;
    if (low === 'moon' && chart.moonSign) return chart.moonSign;
    return null;
  }

  function chartHasPlacements(chart) {
    if (!chart) return false;
    if (chart.positions && Object.keys(chart.positions).length) return true;
    return !!(chart.sunSign || chart.moonSign);
  }

  function chartSummary(chart) {
    if (!chart || !chart.positions) return '';
    var lines = [];
    lines.push('Name: ' + (chart.name || 'Chart'));
    lines.push('Birth: ' + (chart.birthDate || '') + (chart.birthTime ? ' at ' + chart.birthTime : ' (time unknown)'));
    lines.push('Place: ' + (chart.city || ''));
    lines.push('Rising: ' + (chart.risingSign || 'unknown'));
    Object.keys(chart.positions).forEach(function (k) {
      var p = chart.positions[k];
      if (p && p.sign) lines.push(k + ': ' + p.sign + (p.degree != null ? ' ' + Math.floor(p.degree) + '°' : ''));
    });
    if (chart.aspects && chart.aspects.length) {
      lines.push('Key aspects: ' + chart.aspects.slice(0, 5).map(function (a) {
        return a.planet1 + ' ' + a.aspect + ' ' + a.planet2;
      }).join('; '));
    }
    return lines.join('\n');
  }

  // ── Real interpretation tables (so aspects/planets read as genuine meaning,
  //    not the old "adds texture and meaning" filler). All on-device. ──────────
  var PLANET_THEME = {
    Sun: 'your core identity and vitality', Moon: 'your emotional world and sense of safety',
    Mercury: 'how you think and communicate', Venus: 'how you love and what you find beautiful',
    Mars: 'your drive and how you assert yourself', Jupiter: 'where you grow and find meaning',
    Saturn: 'where you build structure and maturity', Uranus: 'where you break patterns and seek freedom',
    Neptune: 'your imagination and dreams', Pluto: 'where you transform and reclaim power',
    Ascendant: 'how you meet the world', Midheaven: 'your public path and calling',
  };
  var ASPECT_QUALITY = {
    conjunction: 'fuse and amplify each other', sextile: 'open up easy opportunities together',
    square: 'create a productive tension that pushes you to grow', trine: 'work together with natural ease',
    opposition: 'pull in opposite directions, asking you for balance', quincunx: 'ask for constant small adjustments',
  };
  // What gets PRINTED where the machine key would otherwise land. The keys are
  // matched against engine data; the values are the only part a reader sees.
  var ASPECT_PLAIN = {
    conjunction: 'meets', sextile: 'sits at a helpful angle to',
    square: 'squares', trine: 'trines',
    opposition: 'opposes', quincunx: 'sits awkwardly to',
  };
  // The two chart angles, in the reader's words rather than the trade's.
  var POINT_DISPLAY = { Midheaven: 'the top of your chart', Ascendant: 'your Rising' };
  // Short labels keep the aspect lines crisp (the long PLANET_THEME reads run-on).
  var PLANET_SHORT = {
    Sun: 'your identity', Moon: 'your emotions', Mercury: 'your mind', Venus: 'your love nature',
    Mars: 'your drive', Jupiter: 'your growth', Saturn: 'your discipline', Uranus: 'your independence',
    Neptune: 'your imagination', Pluto: 'your power', Ascendant: 'your outer self', Midheaven: 'your calling',
  };
  function titleCase(s){ s=String(s||''); return s.charAt(0).toUpperCase()+s.slice(1).toLowerCase(); }
  function aspectLine(a) {
    var p1 = titleCase(a.planet1 || a.p1), p2 = titleCase(a.planet2 || a.p2);
    var asp = String(a.aspect || '').toLowerCase();
    var s1 = PLANET_SHORT[p1], s2 = PLANET_SHORT[p2], q = ASPECT_QUALITY[asp];
    var head = (POINT_DISPLAY[p1] || p1) + ' ' + (ASPECT_PLAIN[asp] || 'contacts') + ' ' + (POINT_DISPLAY[p2] || p2);
    if (s1 && s2 && q) return head + ' — ' + s1 + ' and ' + s2 + ' ' + q + '.';
    if (s1 && s2) return head + ' — ' + s1 + ' and ' + s2 + ' are closely linked in your chart.';
    return head + '.';
  }

  function deterministicExplain(chart, tone) {
    if (!chartHasPlacements(chart)) {
      return 'Calculate or save a chart with planetary positions first.';
    }
    tone = tone || getPrefs().tone;
    var t = TONES[tone] || TONES.gentle;
    var I = window.AstroInterpretations;
    var parts = [];
    var rising = chart.risingSign;

    parts.push(t.prefix + ', here is a reading of ' + (chart.name || 'this chart') + ' — computed on your device with VSOP87 precision.\n');

    // The Big Three + the personal planets, each with a real one-line meaning.
    [['Sun','☉'],['Moon','☽'],['Mercury','☿'],['Venus','♀'],['Mars','♂']].forEach(function (row) {
      var key = row[0], glyph = row[1];
      var sign = signOf(chart, key);
      if (!sign) return;
      var txt = I && I.getPlanetInterpretation ? I.getPlanetInterpretation(key, sign) : '';
      var line = txt ? txt.split('.')[0] + '.' : (titleCase(key) + ' in ' + sign + ' shapes ' + (PLANET_THEME[key] || 'this part of you') + '.');
      parts.push(glyph + ' ' + titleCase(key) + ' in ' + sign + '\n' + line + '\n');
    });
    if (rising) {
      parts.push('↑ Rising in ' + rising + '\nThe Ascendant colours first impressions and the lens through which you meet the world.\n');
    }

    if (chart.aspects && chart.aspects.length) {
      parts.push('The strongest conversations in your chart:\n');
      chart.aspects.slice(0, 4).forEach(function (a) { parts.push('· ' + aspectLine(a) + '\n'); });
    }

    parts.push('\nEvery line here is computed from your real placements on your device — private, and free.');
    return parts.join('\n').trim();
  }

  function planetAnswer(chart, key, extra) {
    var sign = signOf(chart, key);
    if (!sign) return null;
    var I = window.AstroInterpretations;
    var txt = I && I.getPlanetInterpretation ? I.getPlanetInterpretation(key, sign) : '';
    var lead = titleCase(key) + ' in ' + sign + ' shapes ' + (PLANET_THEME[key] || 'this part of you') + '.';
    return lead + (txt ? ' ' + txt.split('.').slice(0, 2).join('.') + '.' : '') + (extra ? ' ' + extra : '');
  }

  function deterministicAsk(chart, question) {
    if (!chartHasPlacements(chart)) {
      return 'Calculate a chart first — then ask about a specific placement.';
    }
    var q = (question || '').toLowerCase();
    var sun = signOf(chart, 'Sun');
    var moon = signOf(chart, 'Moon');
    if (/sun|identity|ego|purpose|who am i|core/.test(q) && sun) {
      return planetAnswer(chart, 'Sun', 'This is the sign the Sun occupied at your birth, placed to within about a sixtieth of a degree (1800–2200 CE).');
    }
    if (/moon|emotion|feel|inner|mood|secure/.test(q) && moon) {
      return planetAnswer(chart, 'Moon', 'The Moon moves quickly, so this placement is very personal to your birth moment.');
    }
    if (/venus|love|romance|attract|beauty|relationship style/.test(q)) {
      return planetAnswer(chart, 'Venus') || 'Venus (how you love) needs a full chart — cast one to see its sign.';
    }
    if (/mars|drive|energy|anger|assert|motivat|sex/.test(q)) {
      return planetAnswer(chart, 'Mars') || 'Mars (your drive) needs a full chart — cast one to see its sign.';
    }
    if (/mercury|think|mind|communicat|talk|learn/.test(q)) {
      return planetAnswer(chart, 'Mercury') || 'Mercury (your mind) needs a full chart — cast one to see its sign.';
    }
    if (/jupiter|grow|luck|expand|meaning|opportunit/.test(q)) {
      return planetAnswer(chart, 'Jupiter') || 'Jupiter (where you grow) shows up best with a full birth chart.';
    }
    if (/saturn|challeng|discipline|struggle|hard|lesson|fear/.test(q)) {
      return planetAnswer(chart, 'Saturn') || 'Saturn (your growth edges) shows up best with a full birth chart.';
    }
    if (/strength|good at|gift|best/.test(q)) {
      var flow = (chart.aspects || []).filter(function (a) { return /trine|sextile/.test(String(a.aspect).toLowerCase()); }).slice(0, 2);
      if (flow.length) return 'Your natural gifts show in the easy aspects: ' + flow.map(function (a) { return aspectLine(a); }).join(' ');
      return 'Your ' + (sun || '?') + ' Sun and ' + (moon || '?') + ' Moon are the anchors of your strengths — cast a timed chart to surface the easy angles that name them precisely.';
    }
    if (/challenge|weakness|work on|difficult|tension/.test(q)) {
      var hard = (chart.aspects || []).filter(function (a) { return /square|opposition/.test(String(a.aspect).toLowerCase()); }).slice(0, 2);
      if (hard.length) return 'Your growth edges show in the tense aspects: ' + hard.map(function (a) { return aspectLine(a); }).join(' ');
      return 'Growth edges usually show in square and opposition aspects — cast a timed chart and they’ll appear here named precisely.';
    }
    if (/today|now|transit|happening/.test(q)) {
      return 'For today’s sky against your chart, open the “Today” tab above — it reads the live transits to your ' + (sun || '?') + ' Sun and ' + (moon || '?') + ' Moon.';
    }
    if (/rising|ascendant|first impression|come across|appear/.test(q) && chart.risingSign) {
      return 'Rising in ' + chart.risingSign + ' shapes how you meet the world — first impressions and the lens others see first. It depends on birth time and latitude, so if your time is approximate, treat this as a working hypothesis.';
    }
    if (/career|work|vocation|job|purpose/.test(q)) {
      return 'Career signatures involve the top of your chart, Saturn, and the 10th house — check the Houses tab on the Chart page for your computed cusps. A reliable birth time makes these accurate.';
    }
    if (/synastry|compat|relationship|partner|venus|mars/.test(q)) {
      if (chart.synastryAspects && chart.synastryAspects.length) {
        var top = chart.synastryAspects[0];
        var orb = top.orb != null ? ' (' + Number(top.orb).toFixed(1) + '° off exact)' : '';
        var topAsp = ASPECT_PLAIN[String(top.aspect || '').toLowerCase()] || 'is in contact with';
        return 'Your synastry report shows ' + chart.synastryAspects.length + ' measured inter-chart aspects. Strongest contact: ' +
          (top.p1 || '?') + ' ' + topAsp + ' ' + (top.p2 || '?') + orb + '. ' +
          'Partner sky: ' + (chart.partnerSun || '?') + ' Sun, ' + (chart.partnerMoon || '?') + ' Moon. ' +
          'Venus–Mars and Moon–Moon contacts often colour chemistry and emotional rhythm.';
      }
      return 'Relationship chemistry in synastry often shows through Sun–Moon, Venus–Mars, and Moon–Moon contacts. Run the full two-chart calculator for the inter-chart angles, each measured to a tenth of a degree — your saved chart (' + (sun || '?') + ' Sun, ' + (moon || '?') + ' Moon) is the starting point.';
    }
    return 'Based on your saved chart (' + (sun || '?') + ' Sun, ' + (moon || '?') + ' Moon, ' + (chart.risingSign || '?') + ' Rising): ask about a specific placement (Sun, Moon, Rising, Venus, etc.) for a focused answer. Enable optional AI for open-ended questions.';
  }

  function deterministicDaily(chart, reading) {
    var name = chart.name || 'you';
    if (reading && reading.insight) {
      return 'For ' + name + ' today: ' + (reading.insight.headline || '') +
        (reading.insight.body ? '\n\n' + reading.insight.body : '') +
        '\n\nComputed from live transits to your natal chart — not a generic sun-sign column.';
    }
    if (reading && reading.aspects && reading.aspects.length) {
      var top = reading.aspects[0];
      return 'Today\'s strongest contact for ' + name + ': transiting ' + top.transit + ' ' + top.aspect.toLowerCase() + ' your natal ' + top.natal + '. Watch how that theme shows up in the hours ahead.';
    }
    return 'Save a full birth chart to see how today\'s sky aspects your unique placements.';
  }

  function deterministicShareSummary(chart) {
    var sun = signOf(chart, 'Sun') || chart.sunSign || '—';
    var moon = signOf(chart, 'Moon') || chart.moonSign || '—';
    var rising = chart.risingSign || chart.rising || '—';
    return (chart.name || 'A birth chart') + ' — Sun in ' + sun + ', Moon in ' + moon + ', Rising ' + rising +
      '. Cast with astronomical precision on Astro Precise; computed privately on device.';
  }

  // On-device only (the cloud/BYOK path is retired for now — this is the free,
  // private, deterministic reader). Kept promise-based so callers are unchanged.
  function explainChart(chart, tone) {
    return Promise.resolve(deterministicExplain(chart, tone || getPrefs().tone));
  }
  function askChart(chart, question) {
    return Promise.resolve(deterministicAsk(chart, question));
  }
  function dailyInsight(chart, reading) {
    return Promise.resolve(deterministicDaily(chart, reading));
  }
  function shareSummary(chart) {
    return Promise.resolve(deterministicShareSummary(chart));
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      if (document.querySelector('script[src="' + src + '"]')) {
        resolve();
        return;
      }
      var s = document.createElement('script');
      s.src = src;
      s.defer = true;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('Failed to load ' + src)); };
      document.body.appendChild(s);
    });
  }

  function positionsHaveLons(positions) {
    if (!positions) return false;
    var n = 0;
    Object.keys(positions).forEach(function (k) {
      var p = positions[k];
      if (p && (typeof p.lon === 'number' || typeof p.longitude === 'number')) n++;
    });
    return n >= 2;
  }

  /** Lazy-load daily transit engine; prefer in-memory chart when it has positions. */
  function fetchDailyReading(forChart) {
    if (forChart && forChart.positions && positionsHaveLons(forChart.positions)) {
      return loadScript('js/oracle.js').then(function () {
        var reading = { insight: null, aspects: [], hasChart: true };
        if (window.AstroOracle && typeof AstroOracle.getDailyInsight === 'function') {
          try { reading.insight = AstroOracle.getDailyInsight(forChart.positions); } catch (e) {}
        }
        return reading;
      }).catch(function () { return null; });
    }
    return new Promise(function (resolve) {
      function build() {
        if (window.DailyTransit && typeof DailyTransit.buildReading === 'function') {
          try { DailyTransit.buildReading(); } catch (e) {}
        }
        resolve(window.DailyTransit && DailyTransit.getReading ? DailyTransit.getReading() : null);
      }
      if (window.DailyTransit && typeof DailyTransit.buildReading === 'function') {
        build();
        return;
      }
      loadScript('js/oracle.js')
        .then(function () { return loadScript('js/daily-transit.js'); })
        .then(build)
        .catch(function () { resolve(null); });
    });
  }

  var PAGE_PRESETS = {
    'chart-ai-panel': {
      title: 'Understand your chart',
      subtitle: 'Plain-language insight from your chart — computed on your device, always free.',
      empty: 'Calculate or save a chart with planetary positions first — then tap Generate.',
      askPlaceholder: 'e.g. What does my Moon in Scorpio mean for relationships?',
    },
    'transits-ai-panel': {
      title: 'How transits touch your chart',
      subtitle: 'See how today\u2019s sky aspects your saved placements — computed on your device, always free.',
      empty: 'Save a birth chart first, then return here for transit-aware insight. Cast one on the Chart page.',
      askPlaceholder: 'e.g. What should I watch for when Saturn squares my Moon?',
    },
    'horoscope-ai-panel': {
      title: 'Your sky, in plain language',
      subtitle: 'Bridge daily horoscope themes with your saved chart — or explore by sun sign until you cast.',
      empty: 'Cast and save your chart for personalised insight, or pick a sign on this page and ask about its themes.',
      askPlaceholder: 'e.g. How does today\u2019s sky speak to my Leo Sun?',
    },
    'ephemeris-ai-panel': {
      title: 'Tonight\u2019s sky, explained',
      subtitle: 'Connect tonight’s live sky to your birth chart — computed on your device, private.',
      empty: 'Save a chart to compare tonight\u2019s planetary positions with your birth sky.',
      askPlaceholder: 'e.g. What does tonight\u2019s Moon phase mean for my chart?',
    },
    'cosmic-story-ai-panel': {
      title: 'Go deeper on your story',
      subtitle: 'Ask about the narrative above — placements, aspects, and themes drawn from your VSOP87 chart.',
      empty: 'Cast your chart to unlock story-aware answers, or read the sample above first.',
      askPlaceholder: 'e.g. What is the central tension in my chart story?',
    },
    'compatibility-ai-panel': {
      title: 'Understand your match',
      subtitle: 'Ask about chemistry, friction, and synastry themes — grounded in your saved chart until you run a full two-chart report.',
      empty: 'Enter both birth charts above for a full synastry read — or save your chart first for placement-level questions.',
      askPlaceholder: 'e.g. What does Venus square Mars mean in synastry?',
    },
    'synastry-ai-panel': {
      title: 'Read your synastry',
      subtitle: 'Bridge this guide with your saved chart — computed on your device.',
      empty: 'Build a synastry chart on the Match page, or save your natal chart to explore relationship themes here.',
      askPlaceholder: 'e.g. Which inter-aspects matter most for long-term commitment?',
    },
    'lifepath-ai-panel': {
      title: 'Your numbers, in context',
      subtitle: 'Pair Life Path themes with your saved birth chart — computed on your device.',
      empty: 'Calculate your Life Path above, or save a natal chart to see how numerology and placements weave together.',
      askPlaceholder: 'e.g. How does a Life Path 7 pair with Scorpio rising?',
    },
    'profile-ai-panel': {
      title: 'Your cosmic dashboard',
      subtitle: 'Ask about saved charts and preferences — computed on your device, private.',
      empty: 'Create your profile and save a chart first — then ask about placements, houses, or what to explore next.',
      askPlaceholder: 'e.g. What should I read next from my saved charts?',
    },
    'moonphase-ai-panel': {
      title: 'Tonight\u2019s Moon, explained',
      subtitle: 'Connect lunar phase to your natal chart — computed on your device, always free.',
      empty: 'Pick a date above, or save a birth chart to compare tonight\u2019s Moon with your natal placements.',
      askPlaceholder: 'e.g. What does a waxing gibbous Moon mean for my chart?',
    },
  };

  function panelPreset(container, options) {
    var key = (options && options.pageKey) || (container && container.id) || 'chart-ai-panel';
    var base = PAGE_PRESETS[key] || PAGE_PRESETS['chart-ai-panel'];
    return {
      title: (options && options.title) || base.title,
      subtitle: (options && options.subtitle) || base.subtitle,
      empty: (options && options.empty) || base.empty,
      askPlaceholder: (options && options.askPlaceholder) || base.askPlaceholder,
    };
  }

  function horoscopeFallbackText() {
    var sign = null;
    if (window.APPersonalMemory && typeof APPersonalMemory.getLastSign === 'function') {
      sign = APPersonalMemory.getLastSign();
    }
    if (!sign) {
      var params = new URLSearchParams(location.search);
      sign = params.get('sign');
    }
    if (sign) {
      var nice = sign.charAt(0).toUpperCase() + sign.slice(1);
      return 'Exploring ' + nice + ' today — cast and save your full chart for transit-level nuance beyond sun-sign themes.';
    }
    return panelPreset({ pageKey: 'horoscope-ai-panel' }).empty;
  }

  // Pre-clickable questions per page. Each string is worded to hit the
  // deterministicAsk router so a tap returns a real, chart-specific answer.
  var DEFAULT_QUESTIONS = [
    'How do I come across?', "What's my emotional style?", 'How do I love?',
    'What drives me?', 'What are my strengths?', 'What should I work on?',
  ];
  var PRESET_QUESTIONS = {
    'chart-ai-panel': DEFAULT_QUESTIONS,
    'profile-ai-panel': DEFAULT_QUESTIONS,
    'horoscope-ai-panel': ["What's today's sky for me?", 'How does today touch my Sun?', "What's my emotional style?", 'What are my strengths?'],
    'transits-ai-panel': ["What's hitting my chart now?", 'What should I watch for?', 'How do I love?', 'What drives me?'],
    'ephemeris-ai-panel': ["What's tonight's sky mean for me?", "What's my emotional style?", 'How do I come across?'],
    'moonphase-ai-panel': ["What's my emotional style?", "What's today's sky for me?", 'What are my strengths?'],
    'compatibility-ai-panel': ["What's our chemistry?", 'How do I love?', 'What drives me?', 'Where might we clash?'],
    'synastry-ai-panel': ['How do I love?', 'What drives me?', "What's my emotional style?"],
    'cosmic-story-ai-panel': ["What's my core identity?", "What's my emotional style?", 'What are my strengths?', 'What should I work on?'],
    'lifepath-ai-panel': ["What's my core identity?", 'What are my strengths?', 'How do I come across?'],
  };
  function questionsFor(key) { return PRESET_QUESTIONS[key] || DEFAULT_QUESTIONS; }

  function mountPanel(container, chartGetter, options) {
    if (!container) return;
    if (container.dataset.apAiMounted) {
      container._apAiChartGetter = chartGetter;
      return;
    }
    container.dataset.apAiMounted = '1';
    container._apAiChartGetter = chartGetter;
    var prefs = getPrefs();
    var activeTab = 'explain';
    var copy = panelPreset(container, options);

    function getChart() {
      var g = container._apAiChartGetter || chartGetter;
      return typeof g === 'function' ? g() : g;
    }

    function render() {
      prefs = getPrefs();
      copy = panelPreset(container, options);
      container.hidden = false;
      container.className = 'ap-ai-panel ap-reveal-smooth';
      var qs = questionsFor((options && options.pageKey) || container.id);
      container.innerHTML =
        '<div class="ap-ai-panel__head">' +
          '<div>' +
            '<h3 class="ap-ai-panel__title">' + esc(copy.title) + '</h3>' +
            '<p class="ap-ai-panel__sub">' + esc(copy.subtitle) + '</p>' +
          '</div>' +
          '<span class="ap-ai-panel__badge ap-ai-panel__badge--off">Computed on your device</span>' +
        '</div>' +
        // Point-and-click: a primary "explain", a "today" shortcut, then the
        // page-relevant preset questions. Each returns a real chart-based answer.
        '<div class="ap-ai-quick">' +
          '<button type="button" class="ap-ai-chip ap-ai-chip--primary" data-action="explain">✦ Explain my chart</button>' +
          '<button type="button" class="ap-ai-chip" data-action="today">Today for me</button>' +
          qs.map(function (q) { return '<button type="button" class="ap-ai-chip" data-q="' + esc(q) + '">' + esc(q) + '</button>'; }).join('') +
        '</div>' +
        '<div class="ap-ai-ownq">' +
          '<input type="text" id="ap-ai-ask-input" class="ap-ai-ask-input" placeholder="' + esc(copy.askPlaceholder) + '" maxlength="280" />' +
          '<button type="button" class="btn btn--outline btn--sm" id="ap-ai-ask-btn">Ask</button>' +
        '</div>' +
        '<div class="ap-ai-tone-row">' +
          '<label for="ap-ai-tone">Tone</label>' +
          '<select id="ap-ai-tone" class="ap-ai-tone-select">' +
            Object.keys(TONES).map(function (k) {
              return '<option value="' + k + '"' + (prefs.tone === k ? ' selected' : '') + '>' + TONES[k].label + '</option>';
            }).join('') +
          '</select>' +
        '</div>' +
        '<div id="ap-ai-output" class="ap-ai-output" aria-live="polite">Tap a question above — your answer is computed from your real chart, right here on your device.</div>' +
        '<div class="ap-ai-actions">' +
          '<button type="button" class="btn btn--outline" id="ap-ai-copy" hidden>Copy</button>' +
        '</div>' +
        '<p class="ap-ai-privacy">Free &middot; computed on your device &mdash; this reading never leaves your browser.</p>';
      bindPanel();
    }

    function setOutput(text, loading) {
      var out = document.getElementById('ap-ai-output');
      var copy = document.getElementById('ap-ai-copy');
      if (!out) return;
      if (loading) {
        out.className = 'ap-ai-output ap-ai-output--loading';
        out.innerHTML = '<span class="ap-loading-dots" aria-hidden="true"><span></span><span></span><span></span></span> Composing…';
        if (copy) copy.hidden = true;
        return;
      }
      out.className = 'ap-ai-output';
      out.textContent = text || '';
      if (copy) copy.hidden = !text;
    }

    function runInsight(kind, question) {
      var chart = getChart();
      if (!chartHasPlacements(chart)) {
        if (container.id === 'horoscope-ai-panel' && kind !== 'explain') { setOutput(horoscopeFallbackText()); return; }
        setOutput(copy.empty);
        return;
      }
      var tone = (document.getElementById('ap-ai-tone') || {}).value || 'gentle';
      setOutput('', true);
      var p;
      if (kind === 'explain') p = explainChart(chart, tone);
      else if (kind === 'today') p = fetchDailyReading(chart).then(function (reading) { return dailyInsight(chart, reading); });
      else p = askChart(chart, question || 'What stands out in my chart?');
      Promise.resolve(p).then(function (text) { setOutput(text); });
    }

    function bindPanel() {
      container.querySelectorAll('.ap-ai-chip').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var act = btn.getAttribute('data-action');
          if (act === 'explain') runInsight('explain');
          else if (act === 'today') runInsight('today');
          else runInsight('ask', btn.getAttribute('data-q'));
        });
      });
      var askInput = document.getElementById('ap-ai-ask-input');
      function askOwn() { var q = (askInput && askInput.value || '').trim(); if (q) runInsight('ask', q); }
      document.getElementById('ap-ai-ask-btn')?.addEventListener('click', askOwn);
      if (askInput) askInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); askOwn(); } });
      document.getElementById('ap-ai-tone')?.addEventListener('change', function (e) { setPrefs({ tone: e.target.value }); });
      document.getElementById('ap-ai-copy')?.addEventListener('click', function () {
        var text = (document.getElementById('ap-ai-output') || {}).textContent || '';
        navigator.clipboard.writeText(text).then(function () {
          if (window.AstroApp) AstroApp.showToast('Copied', 'Insight copied to clipboard.', 'success');
        }).catch(function () {
          if (window.AstroApp) AstroApp.showToast('Copy failed', 'Select and copy the text manually.', 'warning');
        });
      });
    }

    render();
  }

  function activeChartGetter() {
    if (window.APDailyBridge) {
      if (typeof APDailyBridge.buildChartFromSaved === 'function') {
        var saved = APDailyBridge.savedChart ? APDailyBridge.savedChart() : null;
        if (saved) {
          var built = APDailyBridge.buildChartFromSaved(saved);
          if (built) return built;
          return saved;
        }
      } else if (APDailyBridge.savedChart) {
        return APDailyBridge.savedChart();
      }
    }
    if (window.AstroProfile && typeof AstroProfile.getActiveChart === 'function') {
      return AstroProfile.getActiveChart();
    }
    return null;
  }

  function compatPositionsFrom(c1) {
    var raw = (c1 && c1.positions) || {};
    var signs = {
      Sun: c1.sunSign,
      Moon: c1.moonSign,
      Mercury: c1.mercurySign,
      Venus: c1.venusSign,
      Mars: c1.marsSign,
    };
    var out = {};
    ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'].forEach(function (k) {
      var r = raw[k];
      var sign = (r && r.sign) || signs[k] || null;
      if (r || sign) {
        out[k] = { lon: r && r.lon, sign: sign, degree: r && r.degree };
      }
    });
    return out;
  }

  function compatibilityChartGetter() {
    var last = window._compatLastResult;
    if (last && last.chart1) {
      return {
        name: last.name1 || 'Person A',
        sunSign: last.chart1.sunSign,
        moonSign: last.chart1.moonSign,
        risingSign: last.chart1.rising,
        positions: compatPositionsFrom(last.chart1),
        synastryAspects: last.result ? last.result.synastryAspects : null,
        partnerSun: last.chart2 ? last.chart2.sunSign : null,
        partnerMoon: last.chart2 ? last.chart2.moonSign : null,
      };
    }
    return activeChartGetter();
  }

  function ephemerisChartGetter() {
    var saved = activeChartGetter();
    if (saved && chartHasPlacements(saved)) return saved;
    if (window.APInstrument && typeof APInstrument.chartForAI === 'function') {
      var inst = APInstrument.chartForAI();
      if (inst && chartHasPlacements(inst)) return inst;
    }
    return saved;
  }

  var PANEL_GETTERS = {
    'compatibility-ai-panel': compatibilityChartGetter,
    'ephemeris-ai-panel': ephemerisChartGetter,
  };

  var AUTO_PANEL_IDS = [
    'transits-ai-panel',
    'horoscope-ai-panel',
    'ephemeris-ai-panel',
    'cosmic-story-ai-panel',
    'compatibility-ai-panel',
    'synastry-ai-panel',
    'lifepath-ai-panel',
    'profile-ai-panel',
    'moonphase-ai-panel',
  ];

  function autoMountPagePanels() {
    AUTO_PANEL_IDS.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      var getter = PANEL_GETTERS[id] || activeChartGetter;
      mountPanel(el, getter, { pageKey: id });
    });
  }

  function bootAutoMount() {
    if (!AUTO_PANEL_IDS.some(function (id) { return document.getElementById(id); })) {
      return;
    }
    autoMountPagePanels();
    if (window.APDailyBridge) return;
    var tries = 0;
    var timer = setInterval(function () {
      tries += 1;
      if (window.APDailyBridge || tries > 30) {
        clearInterval(timer);
        autoMountPagePanels();
      }
    }, 100);
  }

  document.addEventListener('ap-instrument-activated', function () {
    var el = document.getElementById('ephemeris-ai-panel');
    if (el && el.dataset.apAiMounted) {
      el._apAiChartGetter = ephemerisChartGetter;
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootAutoMount);
  } else {
    bootAutoMount();
  }

  return {
    TONES: TONES,
    getPrefs: getPrefs,
    setPrefs: setPrefs,
    chartSummary: chartSummary,
    explainChart: explainChart,
    askChart: askChart,
    dailyInsight: dailyInsight,
    shareSummary: shareSummary,
    fetchDailyReading: fetchDailyReading,
    deterministicExplain: deterministicExplain,
    deterministicShareSummary: deterministicShareSummary,
    mountPanel: mountPanel,
    activeChartGetter: activeChartGetter,
    autoMountPagePanels: autoMountPagePanels,
  };
})();