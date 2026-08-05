/* ============================================================================
 * ap-sky-time.js — time-of-sky theming
 *
 * The site's mood follows the visitor's local time, subtly. One small module,
 * wired on index.html / horoscope.html / eclipse.html:
 *
 *   Dayparts (local hour):  NIGHT 22–5 · DAWN 5–8 · DAY 8–17 · DUSK 17–22
 *
 *   - Sets document.documentElement.dataset.skytime to the daypart.
 *   - Paints a fixed, pointer-events:none wash over the viewport (z-index 0,
 *     above page backgrounds, below chrome) tinted per daypart.
 *   - Gently shifts --ap-enchant-nebula / --ap-enchant-aurora alphas where the
 *     page's design system already consumes them (no-op where it does not).
 *   - Homepage hero only: a tiny "YOUR LOCAL SKY · <DAYPART>" chip under the
 *     sky-panel caption, when that caption exists. Skipped anywhere else.
 *
 * Pure event-driven: applies once at boot and re-evaluates on visibilitychange
 * (returning to the tab across a daypart boundary). Zero per-frame work.
 * ========================================================================== */
(function () {
  'use strict';
  if (window.__apSkyTimeBooted) return;
  window.__apSkyTimeBooted = true;

  var PARTS = {
    night: { label: 'NIGHT', wash: 'rgba(30,32,64,.14)',  nebula: 'rgba(100,90,180,.12)', aurora: 'rgba(255,90,31,.04)' },
    dawn:  { label: 'DAWN',  wash: 'rgba(255,170,80,.07)', nebula: 'rgba(216,180,106,.10)', aurora: 'rgba(255,140,60,.06)' },
    day:   { label: 'DAY',   wash: 'rgba(90,140,220,.06)', nebula: 'rgba(140,170,220,.06)', aurora: 'rgba(255,90,31,.04)' },
    dusk:  { label: 'DUSK',  wash: 'rgba(255,90,31,.09)',  nebula: 'rgba(255,120,60,.09)',  aurora: 'rgba(255,90,31,.07)' }
  };

  function daypart(h) {
    if (h >= 22 || h < 5) return 'night';
    if (h < 8) return 'dawn';
    if (h < 17) return 'day';
    return 'dusk';
  }

  function paintWash(cfg) {
    if (!document.body) return;
    var ov = document.getElementById('ap-skytime-wash');
    if (!ov) {
      ov = document.createElement('div');
      ov.id = 'ap-skytime-wash';
      ov.setAttribute('aria-hidden', 'true');
      ov.style.cssText =
        'position:fixed;top:0;left:0;right:0;bottom:0;' +
        'pointer-events:none;z-index:0;' +
        'background:var(--ap-skytime-wash, rgba(0,0,0,0));' +
        'transition:background 1.2s ease;';
      document.body.appendChild(ov);
    }
  }

  function paintChip(cfg) {
    /* homepage hero sky-panel caption only — elsewhere the host is absent */
    if (window.matchMedia && window.matchMedia('(max-width:860px)').matches) return;
    var host = document.querySelector('.sky-panel .sky-chip');
    if (!host || !host.parentNode) return;
    var chip = document.getElementById('ap-skytime-chip');
    if (!chip) {
      chip = document.createElement('div');
      chip.id = 'ap-skytime-chip';
      chip.className = 'sky-chip';
      chip.style.cssText = 'left:16px;top:54px;right:auto;';
      host.parentNode.appendChild(chip);
    }
    chip.textContent = 'YOUR LOCAL SKY · ' + cfg.label;
  }

  function apply() {
    try {
      var part = daypart(new Date().getHours());
      var cfg = PARTS[part];
      var root = document.documentElement;
      root.dataset.skytime = part;
      root.style.setProperty('--ap-skytime-wash', cfg.wash);
      root.style.setProperty('--ap-enchant-nebula', cfg.nebula);
      root.style.setProperty('--ap-enchant-aurora', cfg.aurora);
      paintWash(cfg);
      paintChip(cfg);
    } catch (e) { /* cosmetic layer — never break the page */ }
  }

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  }

  ready(apply);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) apply();
  });
})();
