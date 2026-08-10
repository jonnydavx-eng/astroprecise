/**
 * Astro Precise — Personal Sky bridge (Stage 2–3).
 * Chart/moment → index.html deep link + optional home orrery handoff.
 * Uses APDeepLink.buildSkyLink() for the H1 #m= contract.
 */
(function () {
  'use strict';

  var PLANET_FOCUS = {
    Sun: 'sun', Moon: 'moon', Mercury: 'mercury', Venus: 'venus',
    Mars: 'mars', Jupiter: 'jupiter', Saturn: 'saturn',
    Uranus: 'uranus', Neptune: 'neptune', Pluto: 'pluto'
  };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function tzOffsetMinutes(tz, utcDate) {
    if (!tz || tz === 'UTC') return 0;
    try {
      var fmt = new Intl.DateTimeFormat('en-US', {
        timeZone: tz, timeZoneName: 'shortOffset',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false
      });
      var parts = fmt.formatToParts(utcDate);
      var off = '';
      parts.forEach(function (p) {
        if (p.type === 'timeZoneName') off = p.value;
      });
      var m = off.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
      if (!m) return 0;
      var sign = m[1] === '-' ? -1 : 1;
      return sign * (parseInt(m[2], 10) * 60 + parseInt(m[3] || '0', 10));
    } catch (e) {
      return 0;
    }
  }

  function localToUT(y, m, d, hh, mm, tz) {
    var utc = new Date(Date.UTC(y, m - 1, d, hh, mm, 0));
    for (var i = 0; i < 2; i++) {
      var off = tzOffsetMinutes(tz, utc);
      utc = new Date(Date.UTC(y, m - 1, d, hh, mm, 0) - off * 60000);
    }
    return utc;
  }

  /**
   * Birth moment as UTC ISO for explore #m= receiver.
   * Date-only → UTC noon (same discipline as ap-scale-ladder).
   * @param {object} chart
   * @returns {string|null}
   */
  function chartMomentIso(chart) {
    if (!chart || !chart.birthDate) return null;
    var parts = String(chart.birthDate).split('-').map(Number);
    if (parts.length < 3 || !parts[0]) return null;
    var y = parts[0], mo = parts[1], d = parts[2];
    var hh = 12, mm = 0;
    var hasTime = chart.birthTime && /^\d{1,2}:\d{2}/.test(String(chart.birthTime));
    if (hasTime) {
      var t = String(chart.birthTime).split(':');
      hh = parseInt(t[0], 10);
      mm = parseInt(t[1], 10);
      var utc = localToUT(y, mo, d, hh, mm, chart.tz || 'UTC');
      return utc.toISOString();
    }
    return new Date(Date.UTC(y, mo - 1, d, 12, 0, 0)).toISOString();
  }

  /** @param {string} dateVal YYYY-MM-DD */
  function dateOnlyMomentIso(dateVal) {
    if (!dateVal || !/^\d{4}-\d{2}-\d{2}$/.test(dateVal)) return null;
    var p = dateVal.split('-').map(Number);
    return new Date(Date.UTC(p[0], p[1] - 1, p[2], 12, 0, 0)).toISOString();
  }

  /**
   * @param {object} chart
   * @param {{ focus?: string, scale?: number|string, base?: string }} [opts]
   * @returns {string}
   */
  function buildLinkFromChart(chart, opts) {
    opts = opts || {};
    var m = chartMomentIso(chart) || 'now';
    // stashSkyLink, not buildSkyLink: this moment is a birth minute. It goes to
    // index.html in sessionStorage, so the link the visitor can see, copy and
    // paste carries only the focus body. Falls back to the fragment builder on
    // an old cached ap-deep-link.js or where storage is blocked.
    if (window.APDeepLink && window.APDeepLink.stashSkyLink) {
      return window.APDeepLink.stashSkyLink({
        m: m,
        focus: opts.focus || 'earth',
        scale: opts.scale,
        base: opts.base
      });
    }
    if (window.APDeepLink && window.APDeepLink.buildSkyLink) {
      return window.APDeepLink.buildSkyLink({
        m: m,
        focus: opts.focus || 'earth',
        scale: opts.scale,
        base: opts.base
      });
    }
    return 'index.html#m=' + encodeURIComponent(m) + '&focus=earth';
  }

  /**
   * @param {string} dateVal YYYY-MM-DD
   * @param {{ focus?: string }} [opts]
   * @returns {string}
   */
  function buildLinkFromDate(dateVal, opts) {
    opts = opts || {};
    var m = dateOnlyMomentIso(dateVal) || 'now';
    // Date-only, but it is still a BIRTH date — same channel as the full chart.
    if (window.APDeepLink && window.APDeepLink.stashSkyLink) {
      return window.APDeepLink.stashSkyLink({ m: m, focus: opts.focus || 'earth' });
    }
    if (window.APDeepLink && window.APDeepLink.buildSkyLink) {
      return window.APDeepLink.buildSkyLink({ m: m, focus: opts.focus || 'earth' });
    }
    return 'index.html#m=' + encodeURIComponent(m) + '&focus=earth';
  }

  function isHomeOrreryLive() {
    return document.documentElement.classList.contains('orrery-full') &&
      window.Orrery3D && typeof Orrery3D.setDate === 'function';
  }

  /**
   * Chart/moment → model handoff. Drives home orrery when live; always emits ap-sky-ready.
   * @param {object} chart
   * @param {{ focus?: string, driveHome?: boolean }} [opts]
   * @returns {{ m: string, link: string }|null}
   */
  function showPersonalSky(chart, opts) {
    opts = opts || {};
    var iso = chartMomentIso(chart);
    if (!iso) return null;
    var link = buildLinkFromChart(chart, { focus: opts.focus || 'earth' });
    var dt = new Date(iso);

    if (opts.driveHome !== false && isHomeOrreryLive()) {
      try {
        var eng = window.Orrery3D;
        if (typeof eng.isJourneyActive === 'function' && eng.isJourneyActive() &&
            typeof eng.cancelScaleJourney === 'function') {
          eng.cancelScaleJourney(false);
        }
        if (typeof eng.setScaleLevel === 'function') {
          var lv = 0;
          try { lv = eng.getScaleLevel() | 0; } catch (e) {}
          if (lv !== 0) eng.setScaleLevel(0, true);
        }
        eng.setDate(dt);
      } catch (e2) { /* engine optional */ }
    }

    try {
      document.dispatchEvent(new CustomEvent('ap-sky-ready', {
        bubbles: true,
        detail: { chart: chart, m: iso, link: link, focus: opts.focus || 'earth' }
      }));
    } catch (e3) { /* optional */ }

    return { m: iso, link: link };
  }

  /**
   * Post-cast CTA on chart.html — "See your sky in the model".
   * @param {object} chart
   */
  function mountChartModelCta(chart) {
    var host = document.getElementById('ap-chart-sky-bridge');
    if (!host) {
      var anchor = document.querySelector('.chart-keepsake-band') ||
        document.getElementById('chart-whats-next');
      if (!anchor || !anchor.parentNode) return;
      host = document.createElement('section');
      host.id = 'ap-chart-sky-bridge';
      host.className = 'ap-chart-sky-bridge';
      host.setAttribute('aria-label', 'See your birth sky in the 3D model');
      anchor.parentNode.insertBefore(host, anchor.nextSibling);
    }
    if (!chart) { host.hidden = true; return; }

    var link = buildLinkFromChart(chart, { focus: 'earth' });
    // Naming a chart is optional, and most people skip it — so most of the time
    // the name here was never typed by anybody. It is a label the app filled in:
    // chart.html's readForm() uses "Birth Chart", index.html's quick cast uses
    // "Home cast", and this function's own old default was the literal string
    // "Your". The possessive below turned those into "See Birth's sky",
    // "See Home's sky" and "See Your's sky in the 3D model". None of them is a
    // person, so none of them gets to be one. Match the WHOLE label, not the
    // first word, or a real "Birth" (it is a surname) would be swallowed too.
    var raw = String(chart.name || '').replace(/^\s*sample:\s*/i, '').trim();
    var GENERATED = /^(your|birth chart|home cast|untitled|my chart|new chart)$/i;
    var first = GENERATED.test(raw) ? '' : (raw.split(/\s+/)[0] || '');
    var title = first
      ? 'See ' + esc(first) + '’s sky in the 3D model'
      : 'See your sky in the 3D model';
    var when = chart.birthDate +
      (chart.birthTime ? ' · ' + chart.birthTime : ' · UTC noon (time unknown)');

    host.innerHTML =
      '<div class="ap-sky-bridge ap-reveal-smooth ap-glow-hover">' +
        '<p class="ap-sky-bridge__eyebrow">01 · Model</p>' +
        '<h2 class="ap-sky-bridge__title">' + title + '</h2>' +
        '<p style="font-size:0.88rem;color:var(--ap-text-secondary,#ddd3bf);margin:0;line-height:1.6;">' +
          esc(when) + ' · the planets where they actually stood that minute, in the full 3D model, with Earth held still at the centre.' +
        '</p>' +
        '<div class="ap-sky-bridge__actions">' +
          '<a href="' + esc(link) + '" class="btn btn--primary btn--sm" data-ap-model-link="chart-cast">See your sky in the model</a>' +
          '<a href="moment.html" class="btn btn--outline btn--sm">Freeze as Moment</a>' +
        '</div>' +
      '</div>';
    host.hidden = false;
  }

  /**
   * Home hero birth-date → optional explore deep link (non-blocking, mobile-safe).
   * @param {string} dateVal YYYY-MM-DD
   */
  /** @param {string} planetName e.g. "Venus" */
  function planetFocusSlug(planetName) {
    return PLANET_FOCUS[planetName] || null;
  }

  /**
   * Emit ap-sky-ready for moment freeze / share closure (no home orrery drive).
   * @param {object} moment from moment-page computeMoment()
   * @returns {{ m: string, link: string }|null}
   */
  function emitMomentSkyReady(moment) {
    if (!moment || !moment.utc) return null;
    var iso = moment.utc.toISOString ? moment.utc.toISOString() : String(moment.utc);
    var link = (window.APDeepLink && window.APDeepLink.buildSkyLink)
      ? window.APDeepLink.buildSkyLink({ m: iso, focus: 'earth' })
      : 'index.html#m=' + encodeURIComponent(iso) + '&focus=earth';
    try {
      document.dispatchEvent(new CustomEvent('ap-sky-ready', {
        bubbles: true,
        detail: {
          moment: moment,
          m: iso,
          link: link,
          focus: 'earth',
          source: 'moment-freeze'
        }
      }));
    } catch (e) { /* optional */ }
    return { m: iso, link: link };
  }

  /**
   * Chart wheel planet tap → explore with birth m + body focus.
   * @param {object} chart
   * @param {Element|string} wheelContainer
   */
  function mountChartPlanetDoorway(chart, wheelContainer) {
    if (!chart) return;
    var wheel = typeof wheelContainer === 'string'
      ? document.getElementById(wheelContainer) : wheelContainer;
    if (!wheel) return;
    var svg = wheel.querySelector('svg.ap-chart-svg') || wheel.querySelector('svg');
    if (!svg) return;

    svg.querySelectorAll('.planet-glyph').forEach(function (g) {
      var name = g.getAttribute('data-planet');
      var focus = planetFocusSlug(name);
      if (!focus) return;

      g.classList.add('planet-glyph--doorway');
      g.setAttribute('data-sky-doorway', focus);
      g.setAttribute('role', 'link');
      g.setAttribute('tabindex', '0');
      g.setAttribute('aria-label', 'See ' + name + ' in the 3D model at your birth sky');

      if (g._apDoorwayGo) {
        g.removeEventListener('click', g._apDoorwayGo);
        g.removeEventListener('keydown', g._apDoorwayGo);
      }
      g._apDoorwayGo = function (e) {
        if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
        if (e.type === 'keydown') e.preventDefault();
        var link = buildLinkFromChart(chart, { focus: focus });
        try {
          document.dispatchEvent(new CustomEvent('ap-sky-ready', {
            bubbles: true,
            detail: {
              chart: chart,
              m: chartMomentIso(chart),
              link: link,
              focus: focus,
              source: 'chart-wheel'
            }
          }));
        } catch (e2) { /* optional */ }
        window.location.href = link;
      };
      g.addEventListener('click', g._apDoorwayGo);
      g.addEventListener('keydown', g._apDoorwayGo);
    });

    var sub = document.querySelector('.chart-wheel-sublabel');
    if (sub && !sub.dataset.doorwayHint) {
      sub.dataset.doorwayHint = '1';
      sub.textContent = sub.textContent + ' · Tap a planet for the 3D model';
    }
  }

  function mountHomeSkyLink(dateVal) {
    var form = document.getElementById('hero-chart-form');
    if (!form) return;
    var linkEl = document.getElementById('ap-home-sky-link');
    if (!dateVal || !/^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
      if (linkEl) linkEl.hidden = true;
      return;
    }
    if (!linkEl) {
      linkEl = document.createElement('a');
      linkEl.id = 'ap-home-sky-link';
      linkEl.className = 'ap-home-sky-link';
      var chip = document.getElementById('ap-birth-sky-chip');
      if (chip && chip.parentNode === form) {
        chip.insertAdjacentElement('afterend', linkEl);
      } else {
        form.appendChild(linkEl);
      }
    }
    linkEl.href = buildLinkFromDate(dateVal, { focus: 'earth' });
    linkEl.textContent = 'See this sky in the full model →';
    linkEl.setAttribute('data-ap-model-link', 'home-birth');
    linkEl.hidden = false;
  }

  window.APSkyBridge = {
    chartMomentIso: chartMomentIso,
    dateOnlyMomentIso: dateOnlyMomentIso,
    planetFocusSlug: planetFocusSlug,
    buildLinkFromChart: buildLinkFromChart,
    buildLinkFromDate: buildLinkFromDate,
    showPersonalSky: showPersonalSky,
    emitMomentSkyReady: emitMomentSkyReady,
    mountChartModelCta: mountChartModelCta,
    mountChartPlanetDoorway: mountChartPlanetDoorway,
    mountHomeSkyLink: mountHomeSkyLink
  };
})();
