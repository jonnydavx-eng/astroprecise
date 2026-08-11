/* ============================================================================
 * ap-sky-time.js — time-of-sky theming
 *
 * The site's mood follows the visitor's local time, subtly. One small module,
 * wired on index.html / horoscope.html / eclipse.html:
 *
 *   Dayparts (local hour):  NIGHT 22–5 · DAWN 5–8 · DAY 8–17 · DUSK 17–22
 *
 *   - Sets document.documentElement.dataset.skytime to the daypart.
 *   - Sets the shared sky-period token consumed by the authored shell. There is
 *     no injected viewport overlay: every route keeps the same launch palette.
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
    night: { label: 'NIGHT', nebula: 'rgba(185,200,220,.035)', aurora: 'rgba(216,180,106,.035)' },
    dawn:  { label: 'DAWN',  nebula: 'rgba(216,180,106,.055)', aurora: 'rgba(255,100,40,.055)' },
    day:   { label: 'DAY',   nebula: 'rgba(185,200,220,.035)', aurora: 'rgba(216,180,106,.035)' },
    dusk:  { label: 'DUSK',  nebula: 'rgba(216,180,106,.05)', aurora: 'rgba(255,100,40,.05)' }
  };

  function daypart(h) {
    if (h >= 22 || h < 5) return 'night';
    if (h < 8) return 'dawn';
    if (h < 17) return 'day';
    return 'dusk';
  }

  function removeLegacyWash() {
    var ov = document.getElementById('ap-skytime-wash');
    if (ov) ov.remove();
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
      if (document.body) document.body.dataset.skyPeriod = part;
      root.style.setProperty('--ap-enchant-nebula', cfg.nebula);
      root.style.setProperty('--ap-enchant-aurora', cfg.aurora);
      removeLegacyWash();
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
