/**
 * Astro Precise — Unified export suite
 * PNG · PDF (print-friendly multi-page via browser print / canvas PDF fallback) ·
 * JSON · Wallpaper · AR-ready (glTF-lite JSON + USDZ-style companion manifest)
 *
 * Usage:
 *   AP_EXPORT.exportAll(chartLike, { formats: ['png','json','wallpaper'] })
 *   AP_EXPORT.downloadPng(canvasOrDataUrl, filename)
 *   AP_EXPORT.exportChartJson(chart)
 *   AP_EXPORT.exportWallpaper(chart)
 *   AP_EXPORT.exportPdfPlate(chart)
 *   AP_EXPORT.exportArReady(chart)
 *   AP_EXPORT.mountToolbar(containerEl, getChartFn)
 */
(function (global) {
  'use strict';

  function slug(s) {
    return String(s || 'astro-precise')
      .toLowerCase()
      .replace(/[^\w]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48);
  }

  function toast(title, msg, kind) {
    if (global.AstroApp && typeof global.AstroApp.showToast === 'function') {
      global.AstroApp.showToast(title, msg, kind || 'info');
    } else {
      try {
        console.info('[export]', title, msg);
      } catch (e) {}
    }
  }

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(url);
      a.remove();
    }, 1500);
  }

  function downloadDataUrl(dataUrl, filename) {
    var a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function downloadText(text, filename, mime) {
    downloadBlob(new Blob([text], { type: mime || 'text/plain;charset=utf-8' }), filename);
  }

  /** Read chart from common global sources if not passed */
  function resolveChart(chart) {
    if (chart) return chart;
    try {
      if (global.currentChart) return global.currentChart;
      if (global.AP_LAST_CHART) return global.AP_LAST_CHART;
      var raw = localStorage.getItem('ap_saved_chart') || localStorage.getItem('astroprecise_chart');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  }

  function chartName(chart) {
    return (chart && (chart.name || chart.label || chart.subject)) || 'Birth Chart';
  }

  // ---------- PNG ----------
  function downloadPng(source, filename) {
    filename = filename || 'astro-precise.png';
    if (!source) {
      toast('Export', 'Nothing to export as PNG yet.', 'error');
      return Promise.resolve(false);
    }
    if (typeof source === 'string' && source.indexOf('data:image') === 0) {
      downloadDataUrl(source, filename);
      toast('PNG ready', 'Image downloaded.', 'success');
      return Promise.resolve(true);
    }
    if (source instanceof HTMLCanvasElement) {
      try {
        var url = source.toDataURL('image/png');
        downloadDataUrl(url, filename);
        toast('PNG ready', 'Canvas exported.', 'success');
        return Promise.resolve(true);
      } catch (e) {
        toast('PNG failed', 'Canvas may be tainted (cross-origin).', 'error');
        return Promise.resolve(false);
      }
    }
    return Promise.resolve(false);
  }

  /**
   * Build a keepsake plate canvas from chart data (works without chart-page).
   */
  function renderKeepsakeCanvas(chart, opts) {
    opts = opts || {};
    var W = opts.width || 1080;
    var H = opts.height || 1350;
    var cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    var ctx = cv.getContext('2d');
    // void
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0c1016');
    g.addColorStop(1, '#151c28');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // brass frame
    ctx.strokeStyle = 'rgba(201,162,74,0.55)';
    ctx.lineWidth = 3;
    ctx.strokeRect(36, 36, W - 72, H - 72);
    ctx.strokeStyle = 'rgba(201,162,74,0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(48, 48, W - 96, H - 96);

    ctx.fillStyle = '#A8B0BC';
    ctx.font = '500 28px Cinzel, Times New Roman, serif';
    ctx.textAlign = 'center';
    ctx.fillText('ASTRO PRECISE', W / 2, 100);

    ctx.fillStyle = '#e8e2d4';
    ctx.font = '500 48px Cinzel, Times New Roman, serif';
    ctx.fillText(chartName(chart), W / 2, 170);

    ctx.fillStyle = '#8B919C';
    ctx.font = '16px Inter, system-ui, sans-serif';
    var sub = [];
    if (chart && chart.date) sub.push(String(chart.date));
    if (chart && chart.time) sub.push(String(chart.time));
    if (chart && (chart.city || chart.place)) sub.push(String(chart.city || chart.place));
    ctx.fillText(sub.join(' · ') || 'Natal keepsake · on-device engine', W / 2, 210);

    // Big three if present
    var y = 300;
    var big = chart && (chart.bigThree || chart.planets || chart.points);
    function line(label, value) {
      ctx.fillStyle = '#A8B0BC';
      ctx.font = '600 18px Inter, system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(label, 120, y);
      ctx.fillStyle = '#e8e2d4';
      ctx.font = '400 18px Inter, system-ui, sans-serif';
      ctx.fillText(String(value || '—'), 280, y);
      y += 40;
    }

    if (chart) {
      if (chart.sunSign || (chart.sun && chart.sun.sign)) line('Sun', chart.sunSign || chart.sun.sign);
      if (chart.moonSign || (chart.moon && chart.moon.sign)) line('Moon', chart.moonSign || chart.moon.sign);
      if (chart.risingSign || chart.ascSign || (chart.asc && chart.asc.sign))
        line('Rising', chart.risingSign || chart.ascSign || (chart.asc && chart.asc.sign));
    }

    // honesty footer
    ctx.fillStyle = '#6b6558';
    ctx.font = '12px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      'Free PNG plate · VSOP87 when cast on-device · not a paid print · astroprecise.app',
      W / 2,
      H - 70
    );

    return cv;
  }

  function exportPngPlate(chart, opts) {
    chart = resolveChart(chart);
    if (!chart) {
      toast('Cast first', 'Create a chart before exporting PNG.', 'info');
      return Promise.resolve(false);
    }
    // Prefer live chart wheel canvas if present
    var live =
      document.querySelector('#chart-wheel canvas, .chart-wheel canvas, canvas.chart-export, #export-canvas') ||
      null;
    var name = slug(chartName(chart)) + '-keepsake.png';
    if (live && live.width > 40) return downloadPng(live, name);
    var cv = renderKeepsakeCanvas(chart, opts);
    return downloadPng(cv, name);
  }

  // ---------- Wallpaper ----------
  function exportWallpaper(chart, opts) {
    chart = resolveChart(chart);
    opts = opts || {};
    // If chart-page already exposes exportShareImage, prefer it
    if (typeof global.exportShareImage === 'function' && chart) {
      try {
        global.exportShareImage(chart, 'wallpaper', { forceDownload: true });
        toast('Wallpaper', 'Download started.', 'success');
        return Promise.resolve(true);
      } catch (e) {}
    }
    var W = opts.width || 1440;
    var H = opts.height || 2560;
    var cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    var ctx = cv.getContext('2d');
    var g = ctx.createRadialGradient(W / 2, H * 0.35, 40, W / 2, H * 0.4, H * 0.7);
    g.addColorStop(0, '#1a2433');
    g.addColorStop(0.45, '#0c1016');
    g.addColorStop(1, '#07090d');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // stars
    for (var i = 0; i < 400; i++) {
      var x = Math.random() * W;
      var y = Math.random() * H;
      var r = Math.random() * 1.6;
      ctx.fillStyle = 'rgba(232,226,212,' + (0.2 + Math.random() * 0.7) + ')';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#A8B0BC';
    ctx.textAlign = 'center';
    ctx.font = '500 42px Cinzel, serif';
    ctx.fillText(chart ? chartName(chart) : 'Astro Precise', W / 2, H * 0.72);
    ctx.fillStyle = '#8B919C';
    ctx.font = '18px Inter, sans-serif';
    ctx.fillText('Your sky · private wallpaper · astroprecise.app', W / 2, H * 0.72 + 48);
    return downloadPng(cv, slug(chart ? chartName(chart) : 'sky') + '-wallpaper.png');
  }

  // ---------- JSON ----------
  function exportChartJson(chart) {
    chart = resolveChart(chart);
    if (!chart) {
      toast('Cast first', 'No chart data in memory to export.', 'info');
      return false;
    }
    var payload = {
      format: 'astroprecise.chart.v1',
      exportedAt: new Date().toISOString(),
      app: 'https://astroprecise.app',
      honesty: 'Computed on-device when cast; JSON is your data export, not a third-party reading.',
      chart: chart,
    };
    downloadText(
      JSON.stringify(payload, null, 2),
      slug(chartName(chart)) + '-natal-chart.json',
      'application/json'
    );
    toast('JSON exported', 'Chart data downloaded.', 'success');
    return true;
  }

  // ---------- PDF (print plate via iframe / new window) ----------
  function exportPdfPlate(chart) {
    chart = resolveChart(chart);
    var cv = renderKeepsakeCanvas(chart || { name: 'Sky Plate' }, { width: 1080, height: 1350 });
    var dataUrl = cv.toDataURL('image/png');
    var w = global.open('', '_blank', 'noopener,noreferrer,width=900,height=1100');
    if (!w) {
      // fallback: download PNG and instruct
      downloadDataUrl(dataUrl, slug(chartName(chart)) + '-print-plate.png');
      toast('PDF blocked', 'Popup blocked — downloaded PNG plate instead. Print to PDF from any viewer.', 'info');
      return false;
    }
    w.document.write(
      '<!doctype html><html><head><title>Print plate — Astro Precise</title>' +
        '<style>@page{margin:12mm}body{margin:0;background:#0c1016;display:grid;place-items:center;min-height:100vh}' +
        'img{max-width:100%;height:auto;box-shadow:0 0 0 1px rgba(201,162,74,.35)}' +
        '@media print{body{background:#fff}img{box-shadow:none}}</style></head><body>' +
        '<img src="' +
        dataUrl +
        '" alt="Natal keepsake plate" />' +
        '<script>setTimeout(function(){window.print()},400)</script>' +
        '</body></html>'
    );
    w.document.close();
    toast('Print / PDF', 'Use the print dialog → Save as PDF.', 'success');
    return true;
  }

  // ---------- AR-ready (portable scene JSON + companion manifest) ----------
  /**
   * AR-ready export: JSON scene description consumable by future native viewers /
   * Reality Composer style pipelines. Not a binary .usdz (requires server/native tooling).
   */
  function exportArReady(chart) {
    chart = resolveChart(chart);
    var planets = [];
    var src = (chart && (chart.planets || chart.bodies || chart.points)) || null;
    if (Array.isArray(src)) {
      src.forEach(function (p, i) {
        planets.push({
          id: p.id || p.name || 'body-' + i,
          name: p.name || p.id || 'Body',
          lon: p.lon != null ? p.lon : p.longitude,
          lat: p.lat != null ? p.lat : 0,
          sign: p.sign || null,
        });
      });
    } else if (src && typeof src === 'object') {
      Object.keys(src).forEach(function (k) {
        var p = src[k] || {};
        planets.push({
          id: k,
          name: p.name || k,
          lon: p.lon != null ? p.lon : p.longitude,
          lat: p.lat != null ? p.lat : 0,
          sign: p.sign || null,
        });
      });
    } else {
      // schematic nine-body ring for empty export
      ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'].forEach(
        function (n, i) {
          planets.push({ id: n.toLowerCase(), name: n, lon: i * 40, lat: 0, sign: null });
        }
      );
    }

    var scene = {
      format: 'astroprecise.ar-scene.v1',
      exportedAt: new Date().toISOString(),
      title: chartName(chart),
      coordinateSystem: 'ecliptic-longitude-degrees',
      units: 'schematic-AU-visual',
      note:
        'AR-ready portable scene. Import into a native AR viewer pipeline to produce .usdz/.glb. Positions schematic unless full chart planet list present.',
      anchor: { type: 'horizontal-plane', scale: 0.15 },
      materials: {
        brass: { metalness: 0.82, roughness: 0.28, baseColor: '#A8B0BC' },
        void: { baseColor: '#0c1016' },
      },
      bodies: planets.map(function (p, i) {
        var lon = ((Number(p.lon) || i * 30) * Math.PI) / 180;
        var R = 0.4 + (i % 9) * 0.12;
        return {
          id: p.id,
          name: p.name,
          sign: p.sign,
          position: [R * Math.cos(lon), 0, -R * Math.sin(lon)],
          radius: 0.03 + (i === 0 ? 0.04 : 0),
          material: i === 0 ? 'brass' : 'brass',
        };
      }),
      companion: {
        usdz: null,
        glb: null,
        status: 'json-only-until-native-pipeline',
      },
    };

    downloadText(
      JSON.stringify(scene, null, 2),
      slug(chartName(chart)) + '-ar-ready.json',
      'application/json'
    );
    // also drop a short README sidecar as .txt
    downloadText(
      [
        'Astro Precise AR-ready export',
        '----------------------------',
        'File: *-ar-ready.json',
        'Use: import into Reality Composer / model pipeline to bake USDZ/GLB.',
        'This free export is portable scene data, not a finished App Clip / USDZ binary.',
        'Site: https://astroprecise.app',
      ].join('\n'),
      slug(chartName(chart)) + '-ar-ready-README.txt',
      'text/plain'
    );
    toast('AR-ready', 'Scene JSON + readme downloaded.', 'success');
    return true;
  }

  // ---------- Toolbar UI ----------
  function mountToolbar(container, getChartFn) {
    if (!container) return null;
    if (container.querySelector('.ap-export-toolbar')) return container.querySelector('.ap-export-toolbar');

    var bar = document.createElement('div');
    bar.className = 'ap-export-toolbar';
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', 'Export options');
    bar.innerHTML =
      '<span class="ap-export-toolbar__label">Export</span>' +
      '<button type="button" data-fmt="png" class="ap-btn ap-btn--ghost">PNG</button>' +
      '<button type="button" data-fmt="pdf" class="ap-btn ap-btn--ghost">PDF</button>' +
      '<button type="button" data-fmt="json" class="ap-btn ap-btn--ghost">JSON</button>' +
      '<button type="button" data-fmt="wallpaper" class="ap-btn ap-btn--ghost">Wallpaper</button>' +
      '<button type="button" data-fmt="ar" class="ap-btn ap-btn--ghost">AR-ready</button>';

    bar.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-fmt]');
      if (!btn) return;
      var chart = typeof getChartFn === 'function' ? getChartFn() : resolveChart();
      var fmt = btn.getAttribute('data-fmt');
      if (fmt === 'png') exportPngPlate(chart);
      else if (fmt === 'pdf') exportPdfPlate(chart);
      else if (fmt === 'json') exportChartJson(chart);
      else if (fmt === 'wallpaper') exportWallpaper(chart);
      else if (fmt === 'ar') exportArReady(chart);
    });

    container.appendChild(bar);
    return bar;
  }

  function autoMount() {
    var hosts = document.querySelectorAll('[data-export-toolbar]');
    hosts.forEach(function (el) {
      mountToolbar(el, function () {
        return resolveChart();
      });
    });
    // Chart page: mount near export actions if marker present
    var chartHost =
      document.getElementById('ap-export-suite-host') ||
      document.querySelector('.chart-export-actions, #export-actions, .export-row');
    if (chartHost && !chartHost.querySelector('.ap-export-toolbar')) {
      mountToolbar(chartHost, function () {
        return resolveChart(global.currentChart);
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', autoMount);
  else setTimeout(autoMount, 0);

  global.AP_EXPORT = {
    downloadPng: downloadPng,
    downloadBlob: downloadBlob,
    exportPngPlate: exportPngPlate,
    exportWallpaper: exportWallpaper,
    exportChartJson: exportChartJson,
    exportPdfPlate: exportPdfPlate,
    exportArReady: exportArReady,
    mountToolbar: mountToolbar,
    resolveChart: resolveChart,
    renderKeepsakeCanvas: renderKeepsakeCanvas,
  };
})(typeof window !== 'undefined' ? window : globalThis);
