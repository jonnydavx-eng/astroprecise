/**
 * AstroPrecise — daily + monthly horoscope email subscription.
 * Uses the same deterministic sign+date model as getDailyHoroscope.
 * Dormant-honest: posts to AP_MON.emailUrl when set, else localStorage + mailto relay.
 */
(function () {
  'use strict';

  var SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

  var MONTHLY_THEMES = {
    Aries: 'This month ignites your pioneer spirit — Mars and the Sun favour bold initiatives, competitive wins, and leadership that does not wait for permission. Mid-month asks you to channel fire into one flagship goal rather than scattering across too many fronts.',
    Taurus: 'Venus colours the month with material and sensory focus — finances, comfort, and the slow-building projects you trust reward patience now. A relationship or creative investment deepens when you stop rushing the harvest.',
    Gemini: 'Mercury keeps your calendar full — conversations, short trips, and mental cross-pollination open doors that linear planning would miss. Guard against scatter by finishing one communication thread before starting the next.',
    Cancer: 'The Moon emphasises home, family, and emotional truth — nesting, repairing bonds, and honouring what you feel in your body matters more than external applause. Security you build inwardly radiates outward by month\'s end.',
    Leo: 'Solar energy spotlights your creative centre — perform, publish, romance, and lead with the warmth only Leo can supply. Recognition arrives when you risk being fully seen rather than polishing a smaller version of yourself.',
    Virgo: 'Mercury and earth discipline favour refinement — health routines, workflow upgrades, and the unglamorous fixes that make everything else possible. Perfectionism is useful only when it ships something real.',
    Libra: 'Venus harmonises partnerships, aesthetics, and justice — negotiations, design, and rebalancing give-and-take define the month. Choose fairness over pleasing; equilibrium follows honest scales.',
    Scorpio: 'Pluto deepens the plot — investigations, intimacy, and strategic power moves reward courage to look beneath the surface. What you release this month creates space for a transformation you have been circling for years.',
    Sagittarius: 'Jupiter expands horizons — travel, study, philosophy, and the kind of truth that sets you free are all activated. Say yes to the adventure that stretches your beliefs, not merely your itinerary.',
    Capricorn: 'Saturn structures ambition — career milestones, authority earned through competence, and long-horizon planning crystallise. Legacy thinking beats quick wins; build what will still stand next winter.',
    Aquarius: 'Uranus sparks innovation — community projects, technology, and humanitarian instincts align with your need to think differently. The idea that sounded eccentric in week one looks inevitable by week four.',
    Pisces: 'Neptune dissolves boundaries — creativity, spirituality, compassion, and dreamwork flow at unusual depth. Protect your sensitivity with ritual and rest so the mystical does not become merely overwhelming.',
  };

  var MONTHLY_FOCUS = {
    love: [
      'Romance favours honesty over performance — say what you mean and invite the same.',
      'Existing bonds deepen through shared ritual; new connections favour slow, sincere pacing.',
      'Vulnerability is magnetic this month; armour reads as distance to the people who matter.',
      'A conversation postponed since last season finally finds its hour — take it.',
      'Attraction sharpens where values align; charm alone will not carry the whole month.',
    ],
    career: [
      'Professional momentum builds when you finish what you started before chasing the next spark.',
      'A collaboration proposed now could define the quarter — vet partners, then commit cleanly.',
      'Visibility rewards substance: one excellent deliverable outweighs ten loud intentions.',
      'Negotiate early in the month; the same terms read harder under late-month pressure.',
      'Your reputation for reliability opens a door someone louder but less dependable cannot walk through.',
    ],
    wellness: [
      'Energy follows rhythm — consistent sleep and movement matter more than heroic one-off efforts.',
      'Emotional load shows up in the body; rest is not optional luxury but maintenance.',
      'Nutrition and hydration are boring medicine that actually works — dose up generously.',
      'Digital noise drains more than you admit; protect two hours of analog calm daily.',
      'A wellness habit adopted now, kept small, compounds into visible vitality by month\'s end.',
    ],
  };

  function signIndex(sign) {
    var i = SIGNS.indexOf(sign);
    return i >= 0 ? i : 0;
  }

  function getMonthlyHoroscope(sign, date) {
    if (window.ContentService && typeof ContentService.getMonthlyReading === 'function') {
      var bank = ContentService.getMonthlyReading(sign, date);
      if (bank) return bank;
    }
    if (window.HoroscopeEngine && typeof HoroscopeEngine.getMonthlyHoroscope === 'function') {
      var live = HoroscopeEngine.getMonthlyHoroscope(sign, date);
      if (live) return live;
    }
    var d = date ? new Date(date) : new Date();
    var monthKey = d.getFullYear() * 12 + d.getMonth();
    var idx = signIndex(sign);
    var seed = idx * 97 + monthKey * 31;

    return {
      sign: sign,
      month: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      overview: MONTHLY_THEMES[sign] || MONTHLY_THEMES.Aries,
      love: MONTHLY_FOCUS.love[seed % MONTHLY_FOCUS.love.length],
      career: MONTHLY_FOCUS.career[(seed + 1) % MONTHLY_FOCUS.career.length],
      health: MONTHLY_FOCUS.wellness[(seed + 2) % MONTHLY_FOCUS.wellness.length],
      luckyNumber: (seed % 9) + 1,
      luckyColor: ['Amethyst Purple', 'Celestial Gold', 'Midnight Blue', 'Emerald Green',
        'Ruby Red', 'Pearl White', 'Sapphire', 'Rose Gold', 'Obsidian Black'][seed % 9],
    };
  }

  window.HoroscopeSubscribe = {
    getMonthlyHoroscope: getMonthlyHoroscope,
    SIGNS: SIGNS,
    updatePreview: updatePreview,
    fillMonthlyPanel: fillMonthlyPanel,
  };

  window.Interpretations = window.Interpretations || {};
  if (!window.HoroscopeEngine) {
    window.Interpretations.getMonthlyHoroscope = getMonthlyHoroscope;
  }

  function isEmail(e) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e || '');
  }

  function signNameFromKey(key) {
    if (!key) return 'Aries';
    return key.charAt(0).toUpperCase() + key.slice(1);
  }

  function updatePreview(signKey) {
    var name = signNameFromKey(signKey);
    var Interp = window.Interpretations || {};
    var dailyFn = Interp.getDailyHoroscope;
    var monthlyFn = Interp.getMonthlyHoroscope || getMonthlyHoroscope;
    var now = new Date();

    var titleEl = document.getElementById('hs-preview-title');
    var dailyEl = document.getElementById('hs-preview-daily');
    var monthlyEl = document.getElementById('hs-preview-monthly');

    if (titleEl) titleEl.textContent = name + ' — preview';
    if (dailyEl && typeof dailyFn === 'function') {
      var daily = dailyFn(name, now);
      dailyEl.textContent = daily && daily.overview
        ? 'Daily (' + (daily.date || 'today') + '): ' + daily.overview
        : 'Daily reading unavailable.';
    }
    if (monthlyEl && typeof monthlyFn === 'function') {
      var monthly = monthlyFn(name, now);
      monthlyEl.textContent = monthly
        ? 'Monthly (' + monthly.month + '): ' + monthly.overview
        : '';
    }
  }

  function getUserSignKey() {
    try {
      if (window.AstroProfile && typeof AstroProfile.getCharts === 'function') {
        var charts = AstroProfile.getCharts();
        if (charts && charts.length) {
          var sun = charts[0].sunSign || (charts[0].positions && charts[0].positions.sun);
          if (sun) return String(sun.sign || sun).toLowerCase();
        }
      }
    } catch (e) { /* no profile */ }
    return null;
  }

  function bindCollapsible(toggleId, bodyId, chevronId) {
    var toggle = document.getElementById(toggleId);
    var body = document.getElementById(bodyId);
    var chevron = document.getElementById(chevronId);
    if (!toggle || !body) return;
    toggle.setAttribute('aria-expanded', 'false');
    body.classList.remove('is-open');
    body.setAttribute('aria-hidden', 'true');
    if (chevron) chevron.textContent = '▾';
    if (toggle._hsBound) toggle.removeEventListener('click', toggle._hsBound);
    toggle._hsBound = function () {
      var open = !body.classList.contains('is-open');
      body.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      body.setAttribute('aria-hidden', String(!open));
      if (chevron) chevron.textContent = open ? '▴' : '▾';
    };
    toggle.addEventListener('click', toggle._hsBound);
  }

  function fillMonthlyPanel(signKey) {
    var name = signNameFromKey(signKey);
    var monthly = getMonthlyHoroscope(name, new Date());
    var body = document.getElementById('srp-monthly-body');
    if (!body || !monthly) return;
    body.innerHTML = '<p style="font-size:0.68rem;letter-spacing:0.12em;text-transform:uppercase;color:var(--color-gold);margin-bottom:0.5rem;">'
      + monthly.month + '</p><p>' + monthly.overview + '</p>'
      + '<p style="margin-top:0.75rem;font-size:0.82rem;color:var(--silver);"><strong>Love:</strong> '
      + monthly.love + '</p><p style="margin-top:0.5rem;font-size:0.82rem;color:var(--silver);"><strong>Career:</strong> '
      + monthly.career + '</p><p style="margin-top:0.5rem;font-size:0.82rem;color:var(--silver);"><strong>Wellness:</strong> '
      + monthly.health + '</p>';
    bindCollapsible('srp-monthly-toggle', 'srp-monthly-body', 'srp-monthly-chevron');
  }

  function init() {
    var form = document.getElementById('hs-form');
    var signSelect = document.getElementById('hs-sign');
    if (!form) return;

    var saved = getUserSignKey();
    if (saved && signSelect) signSelect.value = saved;
    if (signSelect) {
      updatePreview(signSelect.value);
      signSelect.addEventListener('change', function () {
        updatePreview(signSelect.value);
      });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = (form.email && form.email.value || '').trim();
      if (!isEmail(email)) {
        if (window.AstroApp) AstroApp.showToast('Check your email', 'That address looks off.', 'warning');
        return;
      }
      var dailyOn = form.cadence_daily && form.cadence_daily.checked;
      var monthlyOn = form.cadence_monthly && form.cadence_monthly.checked;
      if (!dailyOn && !monthlyOn) {
        if (window.AstroApp) AstroApp.showToast('Pick a cadence', 'Choose daily, monthly, or both.', 'warning');
        return;
      }
      var signKey = signSelect ? signSelect.value : 'aries';
      var cadence = dailyOn && monthlyOn ? 'both' : (dailyOn ? 'daily' : 'monthly');
      var tags = [];
      if (dailyOn) tags.push('tag_horoscope_daily');
      if (monthlyOn) tags.push('tag_horoscope_monthly');

      var res = { sent: 'local' };
      if (window.AstroApp && typeof AstroApp.captureEmail === 'function') {
        res = AstroApp.captureEmail(email, {
          source: 'horoscope_subscribe',
          tag: tags.join(','),
          meta: { sunSign: signNameFromKey(signKey), cadence: cadence },
        });
      }

      var done = document.getElementById('hs-done');
      var copy = window.AP_COPY || {};
      if (done) {
        done.classList.add('is-visible');
        done.innerHTML = res.sent === 'provider'
          ? '<strong>You\'re subscribed.</strong> ' + (copy.confirmDoubleOptIn || 'Check your inbox to confirm.')
          : '<strong>Noted.</strong> ' + (copy.dormantSaved || 'Saved on this device until email delivery is live.');
      }
      form.classList.add('is-hidden');
      if (window.AstroApp) {
        AstroApp.showToast('Subscribed', 'Your ' + cadence + ' horoscope for ' + signNameFromKey(signKey) + ' is queued.', 'success');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();