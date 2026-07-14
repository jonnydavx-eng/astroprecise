/**
 * Astro Precise — Chart Save & Share
 * Local persistence feedback + clean shareable URLs (chart-view.html).
 */
'use strict';

window.APChartShare = (function () {
  var _chartGetter = null;
  var _inputGetter = null;
  var _shareDelegated = false;

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function slugify(name) {
    return (name || 'chart').replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'chart';
  }

  function isValidTimeZone(tz) {
    if (typeof tz !== 'string' || !tz.trim()) return false;
    try { new Intl.DateTimeFormat('en-US', { timeZone: tz }).format(); return true; }
    catch (e) { return false; }
  }

  function buildParams(chart, input) {
    var src = chart || {};
    var inp = input || {};
    return {
      n: src.name || inp.name || 'Shared Chart',
      d: src.birthDate || (inp.y && inp.m && inp.d
        ? inp.y + '-' + String(inp.m).padStart(2, '0') + '-' + String(inp.d).padStart(2, '0')
        : ''),
      t: (src.birthTime != null ? src.birthTime : (inp.timeKnown ? inp.hh + ':' + inp.mm : '')) || '',
      c: src.city || inp.city || '',
      lat: src.lat != null ? String(src.lat) : (inp.lat != null ? String(inp.lat) : ''),
      lon: src.lon != null ? String(src.lon) : (inp.lon != null ? String(inp.lon) : ''),
      tz: src.tz || inp.tz || '',
      hs: src.houseSystem || 'equal',
      a: src.timeAccuracy || inp.timeAccuracy || (src.timeKnown === true || inp.timeKnown ? 'exact' : 'unknown'),
    };
  }

  function buildShareUrl(chart, input, opts) {
    opts = opts || {};
    var p = buildParams(chart, input);
    if (!p.d || !p.lat || !isValidTimeZone(p.tz)) return null;
    var q = new URLSearchParams();
    Object.keys(p).forEach(function (k) {
      if (p[k] !== '' && p[k] != null) q.set(k, p[k]);
    });
    var base = opts.interactive !== false ? 'chart.html' : 'chart-view.html';
    var path = (location.pathname || '').replace(/[^/]+$/, base);
    if (!/\/chart/.test(path)) path = base;
    return location.origin + location.pathname.replace(/[^/]+$/, '') + base + '?' + q.toString();
  }

  function planetSign(chart, name) {
    if (!chart) return null;
    var p = chart.positions;
    if (p) {
      var pl = p[name] || p[name.toLowerCase()];
      if (pl && pl.sign) return pl.sign;
    }
    if (name === 'Sun' && chart.sunSign) return chart.sunSign;
    if (name === 'Moon' && chart.moonSign) return chart.moonSign;
    return null;
  }

  function bigThreeLine(chart) {
    if (!chart) return '';
    var sun = planetSign(chart, 'Sun');
    var moon = planetSign(chart, 'Moon');
    var rising = chart.risingSign || (chart.timeKnown === false || !chart.birthTime ? 'withheld · exact time needed' : '—');
    return (chart.name || 'Chart') + ': Sun ' + (sun || '—') + ' · Moon ' + (moon || '—') + ' · Rising ' + rising;
  }

  function ensureSaveConfirmation(container) {
    var el = document.getElementById('chart-save-confirmation');
    if (el) return el;
    if (!container) container = document.getElementById('result-actions-row');
    if (!container) return null;
    el = document.createElement('div');
    el.id = 'chart-save-confirmation';
    el.className = 'chart-save-confirmation';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.hidden = true;
    container.parentNode.insertBefore(el, container.nextSibling);
    return el;
  }

  function ensureShareStrip(container) {
    var el = document.getElementById('chart-share-strip');
    if (el) return el;
    if (!container) container = document.getElementById('result-actions-row');
    if (!container) return null;
    var wrap = container.parentNode;
    el = document.createElement('div');
    el.id = 'chart-share-strip';
    el.className = 'chart-share-strip';
    el.innerHTML =
      '<span class="chart-share-strip__label">Share link</span>' +
      '<span class="chart-share-strip__url" id="chart-share-url"></span>' +
      '<button type="button" class="btn btn--outline btn--sm" id="copy-link-btn">Copy link</button>' +
      '<a class="btn btn--ghost btn--sm" id="open-view-btn" href="#" target="_blank" rel="noopener">Open view</a>' +
      '<button type="button" class="btn btn--ghost btn--sm" id="ai-share-summary-btn">AI summary</button>' +
      '<p class="chart-share-strip__note" style="flex-basis:100%;margin:0.35rem 0 0;font-size:0.68rem;color:rgba(236,230,216,.55);">This link carries the birth details (name, date, time, place) so the chart can be recomputed — share it only with people you trust.</p>' +
      '<textarea id="chart-share-summary" class="ap-ai-ask-input" rows="2" hidden placeholder="Optional share blurb — edit before sending" style="width:100%;margin-top:0.5rem;font-size:0.8rem;"></textarea>';
    var confirm = document.getElementById('chart-save-confirmation');
    if (confirm && confirm.nextSibling) wrap.insertBefore(el, confirm.nextSibling);
    else wrap.appendChild(el);
    bindShareStripActions();
    return el;
  }

  function bindShareStripActions() {
    if (_shareDelegated) return;
    _shareDelegated = true;
    document.addEventListener('click', function (e) {
      var copyBtn = e.target.closest('#copy-link-btn');
      if (copyBtn && _chartGetter) {
        var chart = typeof _chartGetter === 'function' ? _chartGetter() : _chartGetter;
        var input = typeof _inputGetter === 'function' ? _inputGetter() : _inputGetter;
        var summary = (document.getElementById('chart-share-summary') || {}).value;
        if (summary && chart) {
          var url = buildShareUrl(chart, input, { interactive: false });
          var text = summary + '\n' + url;
          navigator.clipboard.writeText(text).then(function () {
            if (window.AstroApp) AstroApp.showToast('Copied', 'Summary + link copied.', 'success');
          });
          return;
        }
        copyShareLink(chart, input);
        return;
      }
      var aiBtn = e.target.closest('#ai-share-summary-btn');
      if (aiBtn && _chartGetter && window.APAIAssistant) {
        var chart2 = typeof _chartGetter === 'function' ? _chartGetter() : _chartGetter;
        if (!chart2) return;
        var ta = document.getElementById('chart-share-summary');
        if (!ta) return;
        ta.hidden = false;
        ta.value = 'Composing…';
        APAIAssistant.shareSummary(chart2).then(function (text) {
          ta.value = text;
          ta.focus();
        }).catch(function () {
          ta.value = '';
          if (window.AstroApp) AstroApp.showToast('Summary unavailable', 'Try again or write your own blurb.', 'warning');
        });
      }
    });
  }

  function showSaveConfirmation(chart) {
    var el = ensureSaveConfirmation();
    if (!el) return;
    el.hidden = false;
    el.innerHTML =
      '<span class="chart-save-confirmation__mark" aria-hidden="true">✦</span>' +
      '<span><strong>' + esc(chart.name || 'Chart') + '</strong> saved on this device — ' +
      '<a href="charts.html">My Charts</a> · <a href="profile.html">Profile</a></span>';
    setTimeout(function () {
      try { el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) {}
    }, 80);
  }

  function updateShareStrip(chart, input) {
    var url = buildShareUrl(chart, input, { interactive: false });
    var strip = ensureShareStrip();
    if (!strip || !url) return;
    var urlEl = document.getElementById('chart-share-url');
    var openBtn = document.getElementById('open-view-btn');
    if (urlEl) urlEl.textContent = url.replace(location.origin, '');
    if (openBtn) openBtn.href = url;
    strip.hidden = false;
  }

  function saveWithFeedback(chart, chartData) {
    if (!window.AstroProfile) return null;
    var saved = AstroProfile.saveChart(chartData);
    showSaveConfirmation(saved || chart);
    updateShareStrip(chart, null);
    if (window.AstroApp) {
      AstroApp.showToast('Saved',
        (saved && saved.name ? saved.name : 'Chart') + ' saved on this device.', 'success');
    }
    return saved;
  }

  function copyShareLink(chart, input) {
    var url = buildShareUrl(chart, input, { interactive: false });
    if (!url) {
      if (window.AstroApp) AstroApp.showToast('Share unavailable', 'Calculate a chart first.', 'warning');
      return Promise.resolve(false);
    }
    var text = bigThreeLine(chart) + '\n' + url;
    return navigator.clipboard.writeText(text).then(function () {
      if (window.AstroApp) AstroApp.showToast('Link copied', 'Beautiful share view ready to send.', 'success');
      updateShareStrip(chart, input);
      return true;
    }).catch(function () {
      if (window.AstroApp) AstroApp.showToast('Copy failed', 'Select and copy the link manually.', 'warning');
      return false;
    });
  }

  function wireCopyButton(chartGetter, inputGetter) {
    _chartGetter = chartGetter;
    _inputGetter = inputGetter;
    bindShareStripActions();
  }

  function restoreFromQuery(form, onReady) {
    var q = new URLSearchParams(location.search);
    if (!q.get('d') || !q.get('lat')) return false;
    var name = document.getElementById('name-input');
    var date = document.getElementById('date-input');
    var time = document.getElementById('time-input');
    var city = document.getElementById('city-input');
    var lat = document.getElementById('lat-input');
    var lon = document.getElementById('lon-input');
    var tz = document.getElementById('tz-input');
    if (name) name.value = q.get('n') || 'Shared Chart';
    if (date) date.value = q.get('d');
    if (time && q.get('t')) time.value = q.get('t');
    else if (time) time.value = '';
    if (city) city.value = q.get('c') || '';
    if (lat) lat.value = q.get('lat');
    if (lon) lon.value = q.get('lon');
    if (tz) tz.value = q.get('tz') || '';
    var hs = document.getElementById('house-system');
    if (hs && q.get('hs')) hs.value = q.get('hs');
    var accuracy = document.getElementById('time-accuracy-input');
    if (accuracy && /^(exact|approximate|unknown)$/.test(q.get('a') || '')) accuracy.value = q.get('a');
    if (typeof onReady === 'function') onReady(q);
    return true;
  }

  return {
    buildParams: buildParams,
    buildShareUrl: buildShareUrl,
    bigThreeLine: bigThreeLine,
    saveWithFeedback: saveWithFeedback,
    copyShareLink: copyShareLink,
    updateShareStrip: updateShareStrip,
    showSaveConfirmation: showSaveConfirmation,
    wireCopyButton: wireCopyButton,
    restoreFromQuery: restoreFromQuery,
    slugify: slugify,
  };
})();
