/**
 * Astro Precise — Client-side Adaptive Personalization Engine (2026)
 * Uses saved AstroProfile charts + prefs for dynamic hero, shop teasers,
 * "your transits" hints, and art recommendations without any server calls.
 * Privacy-first, runs entirely after profile is available (idle-deferred).
 * Aligns with cinematic/micro CSS; respects reduced-motion; a11y preserved.
 *
 * Loaded late via lite-shell-boot / shop-page-boot after profile.js.
 * Exposes: window.AstroPersonalization
 */
'use strict';

(function () {
  const hasProfile = () => !!(window.AstroProfile && typeof window.AstroProfile.getCharts === 'function');

  function getPrimaryChart() {
    if (!hasProfile()) return null;
    try {
      const list = AstroProfile.getCharts() || [];
      if (!list.length) return null;
      // Prefer most recently updated; fallback to first
      return list.slice().sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0))[0] || list[0];
    } catch (e) { return null; }
  }

  function getBig3(chart) {
    if (!chart) return '';
    const sun = chart.sunSign || chart.sun || '';
    const moon = chart.moonSign || chart.moon || '';
    const asc = chart.risingSign || chart.asc || chart.ascendant || '';
    const parts = [];
    if (sun) parts.push('☉ ' + sun);
    if (moon) parts.push('☽ ' + moon);
    if (asc) parts.push('↑ ' + asc);
    return parts.join(' · ') || 'your chart';
  }

  function getName(chart) {
    return (chart && (chart.name || chart.chartName)) || 'your saved chart';
  }

  function prefersReduced() {
    try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
  }

  // ── INDEX (home) hero personalization ─────────────────────────────────────
  function personalizeHome() {
    const chart = getPrimaryChart();
    if (!chart) return false;

    const big3 = getBig3(chart);
    const name = getName(chart);
    const welcome = document.getElementById('personal-welcome');
    if (welcome) {
      welcome.innerHTML = `Welcome back, ${esc(name)} — ${big3}. <a href="transits.html" class="hero-personal-link">See your transits</a>`;
      welcome.hidden = false;
      welcome.setAttribute('aria-label', `Personalized greeting using your saved chart: ${big3}`);
      if (!prefersReduced()) {
        welcome.classList.add('ap-rise-in', 'ap-micro-press');
      }
    }

    // Optional: lightly personalize the eyebrow for returning users (non-destructive)
    const eyebrow = document.querySelector('.hero__eyebrow');
    if (eyebrow && eyebrow.textContent.indexOf('Cosmic') !== -1) {
      eyebrow.textContent = 'Back to your blueprint';
    }

    // Enhance live-sky note with personal nudge (if chart present)
    const skyNote = document.querySelector('.live-sky-note');
    if (skyNote && !skyNote.dataset.personal) {
      skyNote.dataset.personal = '1';
      skyNote.textContent = 'Tap a planet · Personal transits from ' + big3.split(' · ')[0];
    }

    return true;
  }

  // ── SHOP teasers & hero personalization ───────────────────────────────────
  function personalizeShop() {
    const chart = getPrimaryChart();
    if (!chart) return false;

    const big3 = getBig3(chart);
    const name = getName(chart);
    const sun = chart.sunSign || chart.sun || '';

    // Hero eyebrow + added personal note
    const eyebrow = document.getElementById('shop-personal-eyebrow');
    if (eyebrow) {
      eyebrow.textContent = `Personalised for ${esc(name)} — ${big3}`;
    }

    const note = document.getElementById('shop-personal-note');
    if (note) {
      const sunHint = sun ? `Sun in ${esc(sun)}` : '';
      note.innerHTML = `Your ${sunHint ? sunHint + ' ' : ''}sky powers every piece. <a href="chart.html">Update chart</a>`;
      note.hidden = false;
      if (!prefersReduced()) note.classList.add('ap-rise-in', 'ap-micro-press');
    }

    // Lightly annotate the featured lede (no overwrite of important copy)
    const lede = document.querySelector('.shopc-featured__lede');
    if (lede && !lede.dataset.personalized) {
      lede.dataset.personalized = '1';
      const span = document.createElement('span');
      span.className = 'personal-note';
      span.textContent = ` Tailored to ${esc(name)}.`;
      // append safely
      if (lede.lastChild && lede.lastChild.nodeType === 3) {
        lede.appendChild(span);
      } else {
        lede.appendChild(span);
      }
    }

    // If art library present, it already calls recommend using saved chart — nudge it
    if (window.AP_ART && typeof AP_ART.recommend === 'function') {
      // no-op; library self-updates on its own render cycle. We just ensure profile visible.
    }

    return true;
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ── Generic entry point (called by boots + storage) ───────────────────────
  function init() {
    let doneHome = false;
    let doneShop = false;

    const attempt = (n = 0) => {
      if (!hasProfile()) {
        if (n < 12) setTimeout(() => attempt(n + 1), 160);
        return;
      }
      if (!doneHome && (document.querySelector('.hero') || document.body.classList.contains('page-home') || location.pathname === '/' || location.pathname.endsWith('index.html'))) {
        doneHome = personalizeHome();
      }
      if (!doneShop && document.body.classList.contains('page-shop')) {
        doneShop = personalizeShop();
      }
      // fire once for any downstream listeners (e.g. future components)
      if ((doneHome || doneShop) && !document.documentElement.dataset.apPersonalized) {
        document.documentElement.dataset.apPersonalized = '1';
        try {
          document.dispatchEvent(new CustomEvent('ap-personalization-applied', {
            detail: { chart: getPrimaryChart(), big3: getBig3(getPrimaryChart()) }
          }));
        } catch (e) {}
      }
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => attempt(0), { once: true });
    } else {
      attempt(0);
    }

    // React to chart saves in other tabs or same-session (chart.html save)
    window.addEventListener('storage', (e) => {
      if (e.key && (e.key === 'ap_charts' || e.key === 'ap_profile_v2')) {
        // reset flags and re-apply (cheap)
        document.documentElement.dataset.apPersonalized = '';
        attempt(0);
      }
    });

    // Also listen for explicit profile/chart events emitted elsewhere
    document.addEventListener('ap-chart-saved', () => attempt(0), { passive: true });
  }

  // Auto-boot
  try { init(); } catch (e) { /* silent; never break page */ }

  // Public surface for other scripts / debug
  window.AstroPersonalization = {
    getPrimaryChart,
    getBig3,
    getName,
    init,
    personalizeHome,
    personalizeShop,
  };
})();