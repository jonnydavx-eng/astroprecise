(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let chart = null;
  let svgText = '';
  let busy = false;
  let assets = null;
  try {
    const raw = sessionStorage.getItem('ap-next-sky') || sessionStorage.getItem('ap-next-reading');
    if (raw) chart = JSON.parse(raw);
    if (!chart) {
      const rows = JSON.parse(localStorage.getItem('ap_charts') || '[]');
      const active = localStorage.getItem('ap_active_chart');
      if (Array.isArray(rows)) chart = rows.find(c => String(c.id) === active) || rows[0];
    }
  } catch (_) { /* A missing chart shows the empty state. */ }
  if (!chart || !chart.positions) {
    $('keepsake-empty').hidden = false;
    $('keepsake-work').hidden = true;
    return;
  }
  const positions = chart.positions;
  const bodies = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];

  function sign(name) {
    return chart.uncertainty?.signRanges?.[name.toLowerCase()]?.join(' / ') || positions[name]?.sign || positions[name.toLowerCase()]?.sign || 'Time needed';
  }

  function keepsakeMirror(row, includeBirth) {
    if (!includeBirth || row.timeKnown !== true || row.timeAccuracy !== 'exact' || !window.APMirrorHour) return null;
    return window.APMirrorHour.detectFromClock(row.birthTime);
  }

  function titleLines(label) {
    const words = String(label).split(/\s+/).filter(Boolean);
    const lines = [];
    let line = '';
    function take(word) {
      if (word.length > 18) {
        if (line) { lines.push(line); line = ''; }
        const bits = word.split('-');
        if (bits.length > 1) {
          bits.forEach((bit, i) => take(i < bits.length - 1 ? bit + '-' : bit));
          return;
        }
        for (let i = 0; i < word.length; i += 18) lines.push(word.slice(i, i + 18));
        return;
      }
      const next = line ? line + ' ' + word : word;
      if (next.length > 18 && line) { lines.push(line); line = word; }
      else line = next;
    }
    words.forEach(take);
    if (line) lines.push(line);
    return lines.slice(0, 4);
  }

  function b64(buf) {
    const bytes = new Uint8Array(buf);
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + 0x8000, bytes.length)));
    return btoa(s);
  }

  async function loadAssets() {
    if (assets) return assets;
    const [serif, sans, glyph, limb] = await Promise.all([
      fetch('fonts/instrument-serif-latin-400.woff2').then(r => r.arrayBuffer()),
      fetch('fonts/instrument-sans-latin-400.woff2').then(r => r.arrayBuffer()),
      fetch('fonts/astro-glyphs.woff2').then(r => r.arrayBuffer()),
      fetch('img/engine/studio/earth-limb.webp').then(r => r.arrayBuffer())
    ]);
    assets = {
      serif: b64(serif),
      sans: b64(sans),
      glyph: b64(glyph),
      limb: 'data:image/webp;base64,' + b64(limb)
    };
    return assets;
  }

  function stars() {
    const data = window.APBrightStars;
    if (!data || !data.rows) return '';
    let out = '';
    const rows = data.rows;
    for (let i = 0; i < rows.length; i += 4) {
      const mag = rows[i + 2] / 100;
      if (mag > 3.1) continue;
      const ra = rows[i] / 100;
      const dec = rows[i + 1] / 100;
      const x = 160 + ((ra + 180) / 360) * 880;
      const y = 500 + ((80 - dec) / 140) * 820;
      const dx = x - 600;
      const dy = y - 900;
      if (dx * dx + dy * dy < 250 * 250) continue;
      if (y < 480 || y > 1340) continue;
      const fade = (mag + 1.46) / 4.6;
      const arm = (1.7 - fade * 0.9).toFixed(2);
      const op = Math.max(0.18, 0.62 - fade * 0.35).toFixed(2);
      out += `<path d="M${x.toFixed(1)} ${y.toFixed(1)} m ${-arm} 0 h ${arm * 2} m ${-arm} ${-arm} v ${arm * 2}" stroke="#f4efe6" stroke-opacity="${op}" stroke-width="0.7"/>`;
    }
    return out;
  }

  function render(pack) {
    const label = ($('keepsake-name').value.trim() || 'My birth sky').slice(0, 80);
    const show = $('include-birth').checked;
    const lines = titleLines(label);
    const titleSize = lines.length > 3 ? 34 : lines.length > 2 ? 42 : lines.some(line => line.length > 16) ? 50 : 62;
    let title = '';
    lines.forEach((line, i) => {
      title += `<text x="84" y="${168 + i * (titleSize + 6)}" fill="#f4efe6" font-size="${titleSize}" font-family="Instrument Serif">${esc(line)}</text>`;
    });
    const cx = 600;
    const cy = 900;
    const R = 188;
    const glyphs = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
    let wheel = '';
    glyphs.forEach((g, i) => {
      const a = (i * 30 + 15 - 90) * Math.PI / 180;
      const x = cx + (R + 26) * Math.cos(a);
      const y = cy + (R + 26) * Math.sin(a);
      wheel += `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="18" text-anchor="middle" dominant-baseline="middle" fill="#d9d3c6" font-family="AstroGlyph">${g}</text>`;
    });
    const placed = [];
    bodies.forEach(name => {
      const p = positions[name] || positions[name.toLowerCase()];
      if (!p || (!chart.timeKnown && name === 'Moon')) return;
      const lon = Number(p.longitude ?? p.lon);
      if (!Number.isFinite(lon)) return;
      placed.push({ name, lon, sign: p.sign || sign(name) });
    });
    const left = [];
    const right = [];
    placed.forEach(p => {
      const a = (p.lon - 90) * Math.PI / 180;
      p.x = cx + R * Math.cos(a);
      p.y = cy + R * Math.sin(a);
      (Math.cos(a) < 0 ? left : right).push(p);
    });
    function column(list, side) {
      if (!list.length) return '';
      list.sort((a, b) => a.lon - b.lon);
      const gap = 54;
      const minY = 520;
      const maxY = 1288;
      const block = (list.length - 1) * gap;
      const mid = list.reduce((sum, p) => sum + p.y, 0) / list.length;
      let top = mid - block / 2;
      if (top < minY) top = minY;
      if (top + block > maxY) top = maxY - block;
      const goingUp = list.length > 1 && list[list.length - 1].y <= list[0].y;
      const rail = side === 'left' ? 330 : 870;
      const nameX = side === 'left' ? 292 : 908;
      const anchor = side === 'left' ? 'end' : 'start';
      let out = '';
      list.forEach((p, i) => {
        const labelY = goingUp ? top + block - i * gap : top + i * gap;
        const dx = p.x - cx;
        const dy = p.y - cy;
        const len = Math.hypot(dx, dy) || 1;
        const sx = cx + dx / len * (R + 44);
        const sy = cy + dy / len * (R + 44);
        const join = side === 'left' ? nameX + 8 : nameX - 8;
        out += `<polyline fill="none" stroke="#e7dcc8" stroke-opacity=".5" stroke-width="1" points="${p.x.toFixed(1)},${p.y.toFixed(1)} ${sx.toFixed(1)},${sy.toFixed(1)} ${rail},${sy.toFixed(1)} ${rail},${labelY.toFixed(1)} ${join},${labelY.toFixed(1)}"/>`;
        out += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${p.name === 'Sun' ? 6.5 : 4.2}" fill="#f4efe6"/>`;
        out += `<text x="${nameX}" y="${(labelY - 6).toFixed(1)}" text-anchor="${anchor}" fill="#f4efe6" font-family="Instrument Serif" font-size="22">${esc(p.name)}</text>`;
        out += `<text x="${nameX}" y="${(labelY + 16).toFixed(1)}" text-anchor="${anchor}" fill="#d9d3c6" font-family="Instrument Sans" font-size="14">${esc(p.sign)} ${(p.lon % 30).toFixed(0)}°</text>`;
      });
      return out;
    }
    const markers = column(left, 'left') + column(right, 'right');
    const sub = show ? [chart.birthDate, chart.timeKnown ? chart.birthTime + ' local' : 'Time unknown', chart.birthCity].filter(Boolean).join(' · ') : 'Birth date, time and place are hidden on this card.';
    const mirror = keepsakeMirror(chart, show);
    const mirrorLine = mirror ? `<text x="84" y="1460" fill="#efe6d6" font-size="15" font-family="Instrument Sans">${esc(mirror.label + ' · ' + mirror.title + ' · folk clock pattern, not a prediction')}</text>` : '';
    const limb = pack ? `<g clip-path="url(#bandclip)"><image href="${pack.limb}" x="520" y="-70" width="820" height="615" preserveAspectRatio="xMidYMid slice" opacity="0.92"/></g><rect width="1200" height="460" fill="url(#bandfade)"/>` : '<rect width="1200" height="460" fill="#070b10"/>';
    const fontCss = pack ? `<style><![CDATA[@font-face{font-family:"Instrument Serif";src:url(data:font/woff2;base64,${pack.serif}) format("woff2");font-weight:400;font-style:normal}@font-face{font-family:"Instrument Sans";src:url(data:font/woff2;base64,${pack.sans}) format("woff2");font-weight:400;font-style:normal}@font-face{font-family:AstroGlyph;src:url(data:font/woff2;base64,${pack.glyph}) format("woff2");font-weight:400;font-style:normal}]]></style>` : '';
    svgText = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1600" viewBox="0 0 1200 1600">${fontCss}<defs><clipPath id="bandclip"><rect width="1200" height="460"/></clipPath><linearGradient id="bandfade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#070b10"/><stop offset="0.46" stop-color="#070b10"/><stop offset="0.78" stop-color="#070b10" stop-opacity="0"/></linearGradient></defs><rect width="1200" height="1600" fill="#070b10"/>${limb}<text x="84" y="92" fill="#efe6d6" font-size="13" letter-spacing="3.2" font-family="Instrument Sans">ASTROPRECISE</text>${title}${stars()}<circle cx="${cx}" cy="${cy}" r="${R + 52}" fill="none" stroke="#e7dcc8" stroke-opacity=".16"/><circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#e7dcc8" stroke-opacity=".55"/>${wheel}${markers}<text x="84" y="1388" fill="#efe6d6" font-size="18" font-family="Instrument Sans">${esc(sub.slice(0, 92))}</text><text x="84" y="1424" fill="#efe6d6" font-size="15" font-family="Instrument Sans">${chart.timeKnown ? (chart.timeAccuracy === 'approximate' ? 'Approximate birth time. Rising and angles are provisional.' : 'Computed tropical positions. Schematic artwork, not a sky photograph.') : 'Time unknown. Moon marker and angles are omitted.'}</text>${mirrorLine}<text x="84" y="1508" fill="#efe6d6" font-size="16" font-family="Instrument Sans">Sun ${esc(sign('Sun'))} · Moon ${esc(sign('Moon'))} · Rising ${esc(chart.timeKnown ? chart.risingSign || 'Unrecorded' : 'Time needed')}</text><text x="84" y="1552" fill="#efe6d6" font-size="14" font-family="Instrument Sans">Astrology is a symbolic tradition. Your story is your own.</text></svg>`;
    $('sky-poster').innerHTML = svgText;
    $('poster-status').textContent = show ? 'Birth details are visible on this image.' : 'Birth date, time and place are hidden from the image.';
  }

  async function png() {
    const pack = await loadAssets();
    render(pack);
    if (document.fonts && document.fonts.load) {
      await document.fonts.load('400 62px "Instrument Serif"');
      await document.fonts.load('400 16px "Instrument Sans"');
      await document.fonts.load('400 18px AstroGlyph');
    }
    const blob = new Blob([svgText], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 1600;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw Error('Canvas unavailable');
      ctx.drawImage(image, 0, 0);
      return await new Promise((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(Error('Image unavailable')), 'image/png'));
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function action(save) {
    if (busy) return;
    busy = true;
    $('download-poster').disabled = true;
    $('save-poster').disabled = true;
    try {
      const blob = await png();
      if (save) {
        const result = await APKeepLibrary.put({ kind: 'sky-card', blob, caption: $('keepsake-name').value.trim() || 'My birth sky', schematic: true });
        if (!result) throw Error('storage');
        $('keep-status').textContent = 'Saved in your artwork library on this device.';
      } else {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'my-birth-sky.png';
        link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
        $('keep-status').textContent = 'Your PNG is ready. Use your browser’s download controls to keep it.';
      }
    } catch (_) {
      $('keep-status').textContent = save ? 'This browser could not save the image. Try Download PNG instead.' : 'The image could not be created. Please try again in a current browser.';
    } finally {
      busy = false;
      $('download-poster').disabled = false;
      $('save-poster').disabled = false;
    }
  }

  $('keepsake-name').addEventListener('input', () => render(assets));
  $('include-birth').addEventListener('change', () => render(assets));
  $('download-poster').addEventListener('click', () => action(false));
  $('save-poster').addEventListener('click', () => action(true));
  render(null);
  loadAssets().then(pack => render(pack)).catch(() => { /* The card still draws if the limb file is missing. */ });
})();
