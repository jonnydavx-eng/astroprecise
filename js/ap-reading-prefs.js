/**
 * Astro Precise — Premium reading / deliverable preferences (local only).
 * Tone, dedication, house system — appended to checkout URLs as Lemon Squeezy custom fields.
 */
(function () {
  'use strict';

  var KEY = 'ap_reading_prefs';
  var DEFAULTS = {
    readingTone: 'poetic',
    dedication: '',
    houseSystem: '',
    filenameStyle: 'named',
  };

  function get() {
    try {
      var stored = JSON.parse(localStorage.getItem(KEY) || '{}');
      var merged = Object.assign({}, DEFAULTS, stored);
      if (!merged.houseSystem && window.AstroProfile && AstroProfile.getPrefs) {
        var prof = AstroProfile.getPrefs();
        if (prof && prof.houseSystem) merged.houseSystem = prof.houseSystem;
      }
      return merged;
    } catch (e) {
      return Object.assign({}, DEFAULTS);
    }
  }

  function save(updates) {
    var next = Object.assign({}, get(), updates || {});
    if (typeof next.dedication === 'string') next.dedication = next.dedication.slice(0, 120);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch (e) {}
    return next;
  }

  function escAttr(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }

  function toneLabel(tone) {
    return tone === 'direct' ? 'Direct & concise' : 'Poetic & observatory';
  }

  function previewLine(prefs, chart) {
    var bits = [toneLabel(prefs.readingTone)];
    if (prefs.houseSystem) bits.push(prefs.houseSystem + ' houses');
    if (prefs.dedication) bits.push('dedication included');
    if (chart && chart.name && prefs.filenameStyle === 'named') {
      bits.push('PDF named for ' + String(chart.name).split(/\s+/)[0]);
    }
    return bits.join(' · ');
  }

  function prefsFormHtml() {
    var p = get();
    return ''
      + '<div class="ap-reading-prefs" id="ap-reading-prefs">'
      + '  <p class="ap-reading-prefs__eyebrow">Make it yours</p>'
      + '  <div class="ap-reading-prefs__row">'
      + '    <label class="ap-reading-prefs__field">'
      + '      <span class="ap-reading-prefs__label">Reading tone</span>'
      + '      <select name="readingTone" class="ap-reading-prefs__select" aria-label="Reading tone">'
      + '        <option value="poetic"' + (p.readingTone === 'poetic' ? ' selected' : '') + '>Poetic — observatory voice</option>'
      + '        <option value="direct"' + (p.readingTone === 'direct' ? ' selected' : '') + '>Direct — plain language</option>'
      + '      </select>'
      + '    </label>'
      + '    <label class="ap-reading-prefs__field">'
      + '      <span class="ap-reading-prefs__label">House system</span>'
      + '      <select name="houseSystem" class="ap-reading-prefs__select" aria-label="House system for deliverables">'
      + '        <option value="Placidus"' + (p.houseSystem === 'Placidus' ? ' selected' : '') + '>Placidus</option>'
      + '        <option value="Whole Sign"' + (p.houseSystem === 'Whole Sign' ? ' selected' : '') + '>Whole Sign</option>'
      + '        <option value="Equal"' + (p.houseSystem === 'Equal' ? ' selected' : '') + '>Equal</option>'
      + '        <option value="Koch"' + (p.houseSystem === 'Koch' ? ' selected' : '') + '>Koch</option>'
      + '      </select>'
      + '    </label>'
      + '  </div>'
      + '  <label class="ap-reading-prefs__field ap-reading-prefs__field--full">'
      + '    <span class="ap-reading-prefs__label">Dedication line <span class="ap-reading-prefs__opt">(optional)</span></span>'
      + '    <input type="text" name="dedication" class="ap-reading-prefs__input" maxlength="120" '
      + '      placeholder="For Maya, on her Saturn return" value="' + escAttr(p.dedication) + '" aria-label="Optional dedication for PDF cover">'
      + '  </label>'
      + '  <p class="ap-reading-prefs__preview" id="ap-reading-prefs-preview" aria-live="polite"></p>'
      + '  <p class="ap-reading-prefs__note">Saved on this device only — passed to checkout as production notes. Birth data never leaves your browser until you order.</p>'
      + '</div>';
  }

  function bindForm(root) {
    if (!root || root._apPrefsWired) return;
    root._apPrefsWired = true;
    var preview = root.querySelector('#ap-reading-prefs-preview')
      || document.getElementById('ap-reading-prefs-preview');

    function refreshPreview() {
      if (!preview) return;
      var chart = null;
      try {
        if (window.AstroProfile && AstroProfile.getCharts) {
          var list = AstroProfile.getCharts();
          chart = list && list.length ? list[0] : null;
        }
      } catch (e) {}
      preview.textContent = previewLine(get(), chart);
    }

    function persist() {
      var tone = root.querySelector('[name="readingTone"]');
      var house = root.querySelector('[name="houseSystem"]');
      var ded = root.querySelector('[name="dedication"]');
      save({
        readingTone: tone ? tone.value : 'poetic',
        houseSystem: house ? house.value : '',
        dedication: ded ? ded.value.trim() : '',
      });
      if (window.AstroProfile && AstroProfile.savePrefs && house) {
        AstroProfile.savePrefs({ houseSystem: house.value });
      }
      refreshPreview();
    }

    root.querySelectorAll('select, input').forEach(function (el) {
      el.addEventListener('change', persist);
      el.addEventListener('input', persist);
    });
    refreshPreview();
  }

  function appendToCheckoutUrl(url, productId) {
    if (!url || !/^https?:\/\//i.test(url)) return url;
    var p = get();
    var u = new URL(url);
    var custom = function (k, v) {
      if (v) u.searchParams.set('checkout[custom][' + k + ']', String(v).slice(0, 200));
    };
    custom('reading_tone', p.readingTone);
    custom('house_system', p.houseSystem);
    custom('dedication', p.dedication);
    if (productId) custom('product_sku', productId);
    try {
      if (window.AstroProfile && AstroProfile.getCharts) {
        var c = AstroProfile.getCharts()[0];
        if (c && c.name) custom('chart_name', c.name);
      }
    } catch (e) {}
    return u.toString();
  }

  window.APReadingPrefs = {
    get: get,
    save: save,
    prefsFormHtml: prefsFormHtml,
    bindForm: bindForm,
    previewLine: previewLine,
    appendToCheckoutUrl: appendToCheckoutUrl,
  };
})();