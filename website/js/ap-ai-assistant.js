/**
 * Astro Precise — Optional AI assistant (privacy-first, opt-in).
 * Default: high-quality deterministic interpretations from on-device engine.
 * Optional: BYOK OpenAI-compatible API — data sent only on explicit user action.
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
      return {
        enabled: !!p.enabled,
        tone: TONES[p.tone] ? p.tone : 'gentle',
        endpoint: p.endpoint || 'https://api.openai.com/v1/chat/completions',
        model: p.model || 'gpt-4o-mini',
        apiKey: p.apiKey || '',
      };
    } catch (e) {
      return { enabled: false, tone: 'gentle', endpoint: '', model: 'gpt-4o-mini', apiKey: '' };
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

  function deterministicExplain(chart, tone) {
    if (!chartHasPlacements(chart)) {
      return 'Calculate or save a chart with planetary positions first.';
    }
    tone = tone || getPrefs().tone;
    var t = TONES[tone] || TONES.gentle;
    var I = window.AstroInterpretations;
    var parts = [];
    var sun = planet(chart, 'Sun');
    var moon = planet(chart, 'Moon');
    var rising = chart.risingSign;

    parts.push(t.prefix + ', here is a reading of ' + (chart.name || 'this chart') + ' — computed on your device with VSOP87 precision.\n');

    var sunSign = (sun && sun.sign) || chart.sunSign;
    if (sunSign) {
      var sunText = I && I.getPlanetInterpretation ? I.getPlanetInterpretation('Sun', sunSign) : '';
      parts.push('☉ Sun in ' + sunSign + (sunText ? '\n' + sunText.split('.')[0] + '.' : '') + '\n');
    }
    var moonSign = (moon && moon.sign) || chart.moonSign;
    if (moonSign) {
      var moonText = I && I.getPlanetInterpretation ? I.getPlanetInterpretation('Moon', moonSign) : '';
      parts.push('☽ Moon in ' + moonSign + (moonText ? '\n' + moonText.split('.')[0] + '.' : '') + '\n');
    }
    if (rising) {
      parts.push('↑ Rising in ' + rising + '\nThe Ascendant colours first impressions and the lens through which you meet the world.\n');
    }

    if (chart.aspects && chart.aspects.length && I && I.getAspectMeaning) {
      parts.push('Notable aspects:\n');
      chart.aspects.slice(0, 4).forEach(function (a) {
        var m = I.getAspectMeaning(a.aspect, a.planet1, a.planet2) ||
          (a.planet1 + ' ' + a.aspect + ' ' + a.planet2);
        parts.push('· ' + m + '\n');
      });
    }

    parts.push('\nThis interpretation draws from the site\'s curated placement library — not a live cloud model. Enable AI in settings for a deeper pass with your own API key.');
    return parts.join('\n').trim();
  }

  function deterministicAsk(chart, question) {
    if (!chartHasPlacements(chart)) {
      return 'Calculate a chart first — then ask about a specific placement.';
    }
    var q = (question || '').toLowerCase();
    var sun = signOf(chart, 'Sun');
    var moon = signOf(chart, 'Moon');
    if (/sun|identity|ego|purpose/.test(q) && sun) {
      return 'Your Sun in ' + sun + ' describes core identity and vitality — the sign the Sun occupied at your birth, accurate to roughly an arcminute (1800–2200 CE). For house-level nuance, ensure your birth time is as exact as you can make it.';
    }
    if (/moon|emotion|feel|inner/.test(q) && moon) {
      return 'Your Moon in ' + moon + ' speaks to emotional temperament and what helps you feel secure. It changes sign every ~2.5 days — yours is fixed to your birth moment.';
    }
    if (/rising|ascendant|first impression/.test(q) && chart.risingSign) {
      return 'Rising in ' + chart.risingSign + ' shapes how you meet the world. It depends on birth time and latitude — if your time is approximate, treat this as a working hypothesis.';
    }
    if (/career|work|vocation/.test(q)) {
      return 'Career signatures often involve the Midheaven, Saturn, and the 10th house — check the Houses tab for your computed cusps. MC accuracy requires a reliable birth time.';
    }
    if (/synastry|compat|relationship|partner|venus|mars/.test(q)) {
      if (chart.synastryAspects && chart.synastryAspects.length) {
        var top = chart.synastryAspects[0];
        var orb = top.orb != null ? ' (orb ' + Number(top.orb).toFixed(1) + '°)' : '';
        return 'Your synastry report shows ' + chart.synastryAspects.length + ' measured inter-chart aspects. Strongest contact: ' +
          (top.p1 || '?') + ' ' + (top.aspect || 'aspect') + ' ' + (top.p2 || '?') + orb + '. ' +
          'Partner sky: ' + (chart.partnerSun || '?') + ' Sun, ' + (chart.partnerMoon || '?') + ' Moon. ' +
          'Venus–Mars and Moon–Moon contacts often colour chemistry and emotional rhythm.';
      }
      return 'Relationship chemistry in synastry often shows through Sun–Moon, Venus–Mars, and Moon–Moon contacts. Run the full two-chart calculator for inter-aspects with real orbs — your saved chart (' + (sun || '?') + ' Sun, ' + (moon || '?') + ' Moon) is the starting point.';
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

  function systemPrompt(kind) {
    return 'You are Astro Precise, a sophisticated privacy-first astrology guide. ' +
      'Write with intellectual credibility — precise, warm, never gimmicky. ' +
      'Never claim arc-second accuracy or observatory certification. ' +
      'Use "roughly an arcminute (1800–2200 CE)" for precision claims. ' +
      'Never give a numeric compatibility score or percentage — describe measured aspects and their character instead. ' +
      'Task: ' + kind + '. Keep responses concise (under 220 words unless asked otherwise).';
  }

  function callAI(userPrompt, tone) {
    var prefs = getPrefs();
    if (!prefs.enabled || !prefs.apiKey) return Promise.reject(new Error('AI not configured'));

    var body = {
      model: prefs.model,
      messages: [
        { role: 'system', content: systemPrompt('natal chart insight') + ' Tone: ' + (TONES[tone] || TONES.gentle).label + '.' },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.65,
      max_tokens: 500,
    };

    return fetch(prefs.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + prefs.apiKey,
      },
      body: JSON.stringify(body),
    }).then(function (res) {
      if (!res.ok) throw new Error('AI request failed (' + res.status + ')');
      return res.json();
    }).then(function (json) {
      var text = json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content;
      if (!text) throw new Error('Empty AI response');
      return text.trim();
    });
  }

  function explainChart(chart, tone) {
    tone = tone || getPrefs().tone;
    var prefs = getPrefs();
    if (!prefs.enabled || !prefs.apiKey) {
      return Promise.resolve(deterministicExplain(chart, tone));
    }
    return callAI('Explain this natal chart:\n\n' + chartSummary(chart), tone)
      .catch(function () { return fellBack(deterministicExplain(chart, tone)); });
  }

  // Honesty: when the cloud call fails we answer deterministically — say so,
  // or the "AI on" badge would misattribute the text.
  function fellBack(text) {
    return text + '\n\n(Cloud AI was unreachable — this is the on-device deterministic reading.)';
  }

  function askChart(chart, question) {
    var prefs = getPrefs();
    if (!prefs.enabled || !prefs.apiKey) {
      return Promise.resolve(deterministicAsk(chart, question));
    }
    return callAI('Chart:\n' + chartSummary(chart) + '\n\nQuestion: ' + question, prefs.tone)
      .catch(function () { return fellBack(deterministicAsk(chart, question)); });
  }

  function dailyInsight(chart, reading) {
    var prefs = getPrefs();
    if (!prefs.enabled || !prefs.apiKey) {
      return Promise.resolve(deterministicDaily(chart, reading));
    }
    var extra = reading && reading.insight ? '\nToday headline: ' + reading.insight.headline : '';
    return callAI('Give a concise daily insight connecting today\'s transits to this natal chart:\n' + chartSummary(chart) + extra, prefs.tone)
      .catch(function () { return fellBack(deterministicDaily(chart, reading)); });
  }

  function shareSummary(chart) {
    var prefs = getPrefs();
    if (!prefs.enabled || !prefs.apiKey) {
      return Promise.resolve(deterministicShareSummary(chart));
    }
    return callAI('Write a single elegant sentence (max 35 words) for sharing this chart link. No hashtags.\n' + chartSummary(chart), prefs.tone)
      .catch(function () { return deterministicShareSummary(chart); });
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
      subtitle: 'Optional insight layer — off by default. Deterministic readings need no cloud; enable AI only if you add your own API key.',
      empty: 'Calculate or save a chart with planetary positions first — then tap Generate.',
      askPlaceholder: 'e.g. What does my Moon in Scorpio mean for relationships?',
    },
    'transits-ai-panel': {
      title: 'How transits touch your chart',
      subtitle: 'See how today\u2019s sky aspects your saved placements — computed on-device unless you enable optional cloud AI.',
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
      subtitle: 'Connect the live ephemeris to your natal chart — optional, privacy-first, on-device by default.',
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
      subtitle: 'Bridge this guide with your saved chart — optional, on-device by default.',
      empty: 'Build a synastry chart on the Match page, or save your natal chart to explore relationship themes here.',
      askPlaceholder: 'e.g. Which inter-aspects matter most for long-term commitment?',
    },
    'lifepath-ai-panel': {
      title: 'Your numbers, in context',
      subtitle: 'Pair Life Path themes with your saved birth chart — optional, on-device by default.',
      empty: 'Calculate your Life Path above, or save a natal chart to see how numerology and placements weave together.',
      askPlaceholder: 'e.g. How does a Life Path 7 pair with Scorpio rising?',
    },
    'profile-ai-panel': {
      title: 'Your cosmic dashboard',
      subtitle: 'Ask about saved charts and preferences — optional insight, privacy-first.',
      empty: 'Create your profile and save a chart first — then ask about placements, houses, or what to explore next.',
      askPlaceholder: 'e.g. What should I read next from my saved charts?',
    },
    'moonphase-ai-panel': {
      title: 'Tonight\u2019s Moon, explained',
      subtitle: 'Connect lunar phase to your natal chart — computed on-device unless you enable optional cloud AI.',
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
      container.innerHTML =
        '<div class="ap-ai-panel__head">' +
          '<div>' +
            '<h3 class="ap-ai-panel__title">' + esc(copy.title) + '</h3>' +
            '<p class="ap-ai-panel__sub">' + esc(copy.subtitle) + '</p>' +
          '</div>' +
          '<span class="ap-ai-panel__badge' + (prefs.enabled && prefs.apiKey ? '' : ' ap-ai-panel__badge--off') + '">' +
            (prefs.enabled && prefs.apiKey ? 'AI optional · on' : 'On-device · default') +
          '</span>' +
        '</div>' +
        '<div class="ap-ai-tabs" role="tablist">' +
          ['explain', 'ask', 'daily'].map(function (id) {
            var labels = { explain: 'Explain', ask: 'Ask', daily: 'Today' };
            return '<button type="button" class="ap-ai-tab" role="tab" data-tab="' + id + '" aria-selected="' + (activeTab === id) + '">' + labels[id] + '</button>';
          }).join('') +
        '</div>' +
        '<div class="ap-ai-tone-row">' +
          '<label for="ap-ai-tone">Tone</label>' +
          '<select id="ap-ai-tone" class="ap-ai-tone-select">' +
            Object.keys(TONES).map(function (k) {
              return '<option value="' + k + '"' + (prefs.tone === k ? ' selected' : '') + '>' + TONES[k].label + '</option>';
            }).join('') +
          '</select>' +
        '</div>' +
        '<div id="ap-ai-ask-row" hidden>' +
          '<input type="text" id="ap-ai-ask-input" class="ap-ai-ask-input" placeholder="' + esc(copy.askPlaceholder) + '" maxlength="280" />' +
        '</div>' +
        '<div id="ap-ai-output" class="ap-ai-output" aria-live="polite">Choose a tab and tap Generate — nothing is sent until you do.</div>' +
        '<div class="ap-ai-actions">' +
          '<button type="button" class="btn btn--primary" id="ap-ai-generate">Generate</button>' +
          '<button type="button" class="btn btn--outline" id="ap-ai-copy" hidden>Copy</button>' +
        '</div>' +
        '<details class="ap-ai-settings">' +
          '<summary>Optional cloud AI (bring your own key)</summary>' +
          '<div class="ap-ai-settings__grid">' +
            '<div><label><input type="checkbox" id="ap-ai-enabled"' + (prefs.enabled ? ' checked' : '') + '> Enable cloud AI</label></div>' +
            '<div><label>API endpoint</label><input type="text" id="ap-ai-endpoint" value="' + esc(prefs.endpoint) + '" autocomplete="off" /></div>' +
            '<div><label>Model</label><input type="text" id="ap-ai-model" value="' + esc(prefs.model) + '" autocomplete="off" /></div>' +
            '<div><label>API key (stored only on this device)</label><input type="password" id="ap-ai-key" value="' + esc(prefs.apiKey) + '" autocomplete="off" placeholder="sk-…" /></div>' +
          '</div>' +
        '</details>' +
        '<p class="ap-ai-privacy">Privacy: with AI enabled, tapping Generate sends your name, birth date, time, place and chart placements to the API endpoint you configured above (e.g. OpenAI) — nothing is sent until you tap. Core calculations always stay on your device. You can edit or delete AI output before sharing.</p>';
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

    function bindPanel() {
      container.querySelectorAll('.ap-ai-tab').forEach(function (btn) {
        btn.addEventListener('click', function () {
          activeTab = btn.getAttribute('data-tab');
          container.querySelectorAll('.ap-ai-tab').forEach(function (b) {
            b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
          });
          var askRow = document.getElementById('ap-ai-ask-row');
          if (askRow) askRow.hidden = activeTab !== 'ask';
        });
      });

      document.getElementById('ap-ai-enabled')?.addEventListener('change', function (e) {
        setPrefs({ enabled: e.target.checked });
        render();
      });
      document.getElementById('ap-ai-endpoint')?.addEventListener('change', function (e) {
        setPrefs({ endpoint: e.target.value.trim() });
      });
      document.getElementById('ap-ai-model')?.addEventListener('change', function (e) {
        setPrefs({ model: e.target.value.trim() });
      });
      document.getElementById('ap-ai-key')?.addEventListener('change', function (e) {
        setPrefs({ apiKey: e.target.value.trim() });
      });
      document.getElementById('ap-ai-tone')?.addEventListener('change', function (e) {
        setPrefs({ tone: e.target.value });
      });

      document.getElementById('ap-ai-generate')?.addEventListener('click', function () {
        var chart = getChart();
        if (!chartHasPlacements(chart)) {
          if (container.id === 'horoscope-ai-panel' && activeTab !== 'explain') {
            setOutput(horoscopeFallbackText());
            return;
          }
          setOutput(copy.empty);
          return;
        }
        var tone = (document.getElementById('ap-ai-tone') || {}).value || 'gentle';
        setOutput('', true);
        var p;
        if (activeTab === 'explain') p = explainChart(chart, tone);
        else if (activeTab === 'ask') {
          var q = (document.getElementById('ap-ai-ask-input') || {}).value || '';
          p = askChart(chart, q || 'What stands out in my chart?');
        } else {
          p = fetchDailyReading(chart).then(function (reading) {
            return dailyInsight(chart, reading);
          });
        }
        Promise.resolve(p).then(function (text) { setOutput(text); });
      });

      document.getElementById('ap-ai-copy')?.addEventListener('click', function () {
        var text = (document.getElementById('ap-ai-output') || {}).textContent || '';
        navigator.clipboard.writeText(text).then(function () {
          if (window.AstroApp) AstroApp.showToast('Copied', 'Insight copied to clipboard.', 'success');
        }).catch(function () {
          if (window.AstroApp) AstroApp.showToast('Copy failed', 'Select and copy the text manually.', 'warning');
        });
      });

      var askRow = document.getElementById('ap-ai-ask-row');
      if (askRow) askRow.hidden = activeTab !== 'ask';
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