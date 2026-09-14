/**
 * Astro Precise — Client-side Adaptive Personalization Engine (2026)
 * Uses saved AstroProfile charts + prefs for returning-user copy on home and shop.
 * Privacy-first, idle-deferred. No server. No fake live stats. No merch art-library.
 * Home doors: chart.html. Shop keep-path after a saved chart: charts.html,
 * sky-card.html, deep-reading.html — never birth minutes in URLs.
 *
 * Loaded after profile.js (lite-shell-boot on home; shop.html loads this file).
 * Exposes: window.AstroPersonalization
 */
'use strict';

(function () {
  const hasProfile = () => !!(window.AstroProfile && typeof window.AstroProfile.getCharts === 'function');
  const ZODIAC_SIGNS = Object.freeze({
    aries: 'Aries', taurus: 'Taurus', gemini: 'Gemini', cancer: 'Cancer',
    leo: 'Leo', virgo: 'Virgo', libra: 'Libra', scorpio: 'Scorpio',
    sagittarius: 'Sagittarius', capricorn: 'Capricorn', aquarius: 'Aquarius',
    pisces: 'Pisces',
  });

  function canonicalSign(value) {
    return ZODIAC_SIGNS[String(value == null ? '' : value).trim().toLowerCase()] || '';
  }

  function hasBirthTime(chart) {
    return !!(chart && chart.timeKnown === true);
  }

  function getPrimaryChart() {
    if (!hasProfile()) return null;
    try {
      const list = AstroProfile.getCharts() || [];
      if (!list.length) return null;
      return list.slice().sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0))[0] || list[0];
    } catch (e) { return null; }
  }

  function getBig3(chart) {
    if (!chart) return '';
    const sun = canonicalSign(chart.sunSign || chart.sun);
    const timed = hasBirthTime(chart);
    const moon = timed ? canonicalSign(chart.moonSign || chart.moon) : '';
    const asc = timed ? canonicalSign(chart.risingSign || chart.asc || chart.ascendant) : '';
    const parts = [];
    if (sun) parts.push('Sun in ' + sun);
    if (moon) parts.push('Moon in ' + moon);
    if (asc) parts.push('Rising in ' + asc);
    return parts.join(' · ') || 'your saved chart';
  }

  function getName(chart) {
    return (chart && (chart.name || chart.chartName)) || 'your saved chart';
  }

  function prefersReduced() {
    try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
  }

  function personalizeHome() {
    const chart = getPrimaryChart();
    if (!chart) return false;

    const big3 = getBig3(chart);
    const name = getName(chart);
    const welcome = document.getElementById('personal-welcome');
    if (welcome) {
      const link = document.createElement('a');
      link.href = 'chart.html';
      link.className = 'hero-personal-link';
      link.textContent = 'Open your chart';
      welcome.replaceChildren(
        document.createTextNode(`Welcome back, ${name} — ${big3}. `),
        link
      );
      welcome.hidden = false;
      welcome.setAttribute('aria-label', `Personalized greeting using your saved chart: ${big3}`);
      if (!prefersReduced()) {
        welcome.classList.add('ap-rise-in', 'ap-micro-press');
      }
    }

    return true;
  }

  const SHOP_KEEP_HREFS = Object.freeze({
    charts: 'charts.html',
    skyCard: 'sky-card.html',
    sitting: 'deep-reading.html',
  });

  function keepLink(href, label) {
    const a = document.createElement('a');
    a.setAttribute('href', href);
    a.textContent = label;
    return a;
  }

  function personalizeShop() {
    const chart = getPrimaryChart();
    if (!chart) return false;

    const note = document.getElementById('shop-personal-note');
    if (!note) return false;

    note.replaceChildren(
      document.createTextNode('A chart is saved on this device. '),
      keepLink(SHOP_KEEP_HREFS.charts, 'plates kept on this device'),
      document.createTextNode(' · '),
      keepLink(SHOP_KEEP_HREFS.skyCard, 'Sky card'),
      document.createTextNode(' · '),
      keepLink(SHOP_KEEP_HREFS.sitting, 'Seven-chapter sitting'),
      document.createTextNode('. Birth minutes stay here, never in the link.')
    );
    note.hidden = false;
    note.setAttribute('aria-label', 'Keep path for the chart saved on this device');
    if (!prefersReduced()) note.classList.add('ap-rise-in', 'ap-micro-press');
    return true;
  }

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

    const reapply = () => {
      document.documentElement.dataset.apPersonalized = '';
      doneHome = false;
      doneShop = false;
      attempt(0);
    };

    window.addEventListener('storage', (e) => {
      if (e.key && (e.key === 'ap_charts' || e.key === 'ap_profile_v2')) reapply();
    });

    document.addEventListener('ap-chart-saved', reapply, { passive: true });
  }

  try { init(); } catch (e) { /* silent; never break page */ }

  window.AstroPersonalization = {
    getPrimaryChart,
    getBig3,
    getName,
    init,
    personalizeHome,
    personalizeShop,
  };
})();
