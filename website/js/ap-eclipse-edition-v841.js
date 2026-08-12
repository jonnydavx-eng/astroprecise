import { isCheckoutReady, openCheckout, verifyLicense } from './gumroad-unlock.js';

export const ARTWORK_WIDTH = 2400;
export const ARTWORK_HEIGHT = 3000;
export const EDITION_PRODUCT = 'eclipse-edition';

const BEATS = [
  ['Anchor', 'anchor'],
  ['Contact', 'contact'],
  ['What it touches', 'governs'],
  ['Reflection', 'question'],
  ['Close', 'close'],
];

const PALETTES = [
  { brass: '#d9b66f', ember: '#b95d34', ink: '#05070c', blue: '#486f8c' },
  { brass: '#c9c4ad', ember: '#8f5145', ink: '#04070d', blue: '#526d91' },
  { brass: '#e0bd78', ember: '#9c6846', ink: '#07060b', blue: '#415e78' },
];

function normaliseLongitude(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return ((number % 360) + 360) % 360;
}

function fnv1a(value) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function beatText(beat) {
  if (!beat) return '';
  const secondary = beat.secondary
    ? `${beat.secondary.mono || ''} ${beat.secondary.serif || ''}`
    : '';
  return [beat.mono, beat.serif, secondary].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

export function buildEclipsePlateModel({ reading, natal, eclipseLongitude }) {
  if (!reading || reading.gateSale || reading.quiet) return null;
  const placements = Object.entries(natal || {})
    .map(([key, value]) => [key, normaliseLongitude(value)])
    .filter(([, value]) => value != null)
    .sort(([a], [b]) => a.localeCompare(b));
  if (!placements.length) throw new Error('A computed chart is required for eclipse artwork.');

  const eclipse = normaliseLongitude(eclipseLongitude);
  if (eclipse == null) throw new Error('A computed eclipse longitude is required.');
  const beats = BEATS.map(([title, key]) => ({ title, text: beatText(reading[key]) }));
  if (beats.some((beat) => !beat.text)) throw new Error('The five-beat eclipse reading is incomplete.');

  const signature = [
    eclipse.toFixed(5),
    placements.map(([key, value]) => `${key}:${value.toFixed(5)}`).join('|'),
    reading.share || beatText(reading.contact),
  ].join('::');
  const seed = fnv1a(signature);
  const fingerprint = `AP26-${seed.toString(16).toUpperCase().padStart(8, '0')}`;
  const palette = PALETTES[seed % PALETTES.length];

  return Object.freeze({
    width: ARTWORK_WIDTH,
    height: ARTWORK_HEIGHT,
    seed,
    fingerprint,
    eclipseLongitude: eclipse,
    placements: placements.map(([key, longitude]) => ({ key, longitude })),
    beats,
    share: String(reading.share || beatText(reading.contact)),
    legal: String(reading.legal || 'Astrology is offered for reflection, not prediction or advice.'),
    palette,
  });
}

function rng(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function drawWrapped(ctx, text, x, y, maxWidth, lineHeight, maxLines = 8) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  let line = '';
  let lineNo = 0;
  for (const word of words) {
    const trial = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(trial).width > maxWidth) {
      ctx.fillText(line, x, y + lineNo * lineHeight);
      line = word;
      lineNo += 1;
      if (lineNo >= maxLines) return y + lineNo * lineHeight;
    } else {
      line = trial;
    }
  }
  if (line && lineNo < maxLines) {
    ctx.fillText(line, x, y + lineNo * lineHeight);
    lineNo += 1;
  }
  return y + lineNo * lineHeight;
}

function drawHairlineCircle(ctx, x, y, radius, colour, alpha, width = 2) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export function renderEclipseArtwork(model, canvas = document.createElement('canvas')) {
  if (!model) throw new Error('A direct eclipse-contact model is required.');
  canvas.width = model.width;
  canvas.height = model.height;
  canvas.dataset.editionFingerprint = model.fingerprint;
  const ctx = canvas.getContext('2d');
  const random = rng(model.seed);
  const { brass, ember, ink, blue } = model.palette;

  const background = ctx.createLinearGradient(0, 0, model.width, model.height);
  background.addColorStop(0, '#020308');
  background.addColorStop(0.48, ink);
  background.addColorStop(1, '#0c1118');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, model.width, model.height);

  for (let i = 0; i < 620; i += 1) {
    const x = random() * model.width;
    const y = random() * model.height * 0.72;
    const radius = 0.7 + random() * 2.6;
    ctx.globalAlpha = 0.16 + random() * 0.58;
    ctx.fillStyle = random() > 0.84 ? brass : '#e9edf4';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  const cx = model.width * 0.5;
  const cy = 850;
  const eclipseRadius = 370;
  const corona = ctx.createRadialGradient(cx, cy, eclipseRadius * 0.72, cx, cy, eclipseRadius * 1.72);
  corona.addColorStop(0, 'rgba(245,220,157,.96)');
  corona.addColorStop(0.28, 'rgba(217,182,111,.38)');
  corona.addColorStop(1, 'rgba(217,182,111,0)');
  ctx.fillStyle = corona;
  ctx.beginPath();
  ctx.arc(cx, cy, eclipseRadius * 1.72, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((model.seed % 360) * Math.PI / 180);
  for (let i = 0; i < 42; i += 1) {
    const angle = (i / 42) * Math.PI * 2 + (random() - 0.5) * 0.055;
    const inner = eclipseRadius * (1.02 + random() * 0.04);
    const outer = eclipseRadius * (1.18 + random() * 0.44);
    ctx.strokeStyle = i % 7 === 0 ? brass : '#efe2bd';
    ctx.globalAlpha = 0.12 + random() * 0.28;
    ctx.lineWidth = 2 + random() * 5;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
    ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
    ctx.stroke();
  }
  ctx.restore();
  ctx.globalAlpha = 1;

  const moon = ctx.createRadialGradient(cx - 100, cy - 120, 25, cx, cy, eclipseRadius);
  moon.addColorStop(0, '#171c25');
  moon.addColorStop(0.62, '#07090e');
  moon.addColorStop(1, '#010205');
  ctx.fillStyle = moon;
  ctx.beginPath();
  ctx.arc(cx, cy, eclipseRadius, 0, Math.PI * 2);
  ctx.fill();
  drawHairlineCircle(ctx, cx, cy, eclipseRadius + 6, brass, 0.92, 4);
  drawHairlineCircle(ctx, cx, cy, 560, blue, 0.5, 3);
  drawHairlineCircle(ctx, cx, cy, 650, brass, 0.28, 2);

  ctx.save();
  ctx.translate(cx, cy);
  for (let sign = 0; sign < 12; sign += 1) {
    const angle = sign * Math.PI / 6 - Math.PI / 2;
    const inner = 635;
    const outer = sign % 3 === 0 ? 684 : 666;
    ctx.strokeStyle = brass;
    ctx.globalAlpha = sign % 3 === 0 ? 0.62 : 0.3;
    ctx.lineWidth = sign % 3 === 0 ? 3 : 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
    ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
    ctx.stroke();
  }

  const eclipseAngle = model.eclipseLongitude * Math.PI / 180 - Math.PI / 2;
  ctx.strokeStyle = ember;
  ctx.globalAlpha = 0.92;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(Math.cos(eclipseAngle) * 420, Math.sin(eclipseAngle) * 420);
  ctx.lineTo(Math.cos(eclipseAngle) * 705, Math.sin(eclipseAngle) * 705);
  ctx.stroke();
  ctx.restore();
  ctx.globalAlpha = 1;

  ctx.fillStyle = brass;
  ctx.font = '600 34px "Schibsted Grotesk", Arial, sans-serif';
  ctx.letterSpacing = '9px';
  ctx.fillText('ASTROPRECISE / ECLIPSE EDITION', 150, 170);
  ctx.fillStyle = '#f0ece3';
  ctx.font = '600 112px "Cormorant Garamond", Georgia, serif';
  ctx.fillText('Your eclipse, precisely.', 150, 1760);

  ctx.fillStyle = '#d7d9df';
  ctx.font = '500 39px "Schibsted Grotesk", Arial, sans-serif';
  const summaryBottom = drawWrapped(ctx, model.share, 150, 1860, 1780, 57, 4);

  ctx.strokeStyle = 'rgba(217,182,111,.42)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(150, summaryBottom + 54);
  ctx.lineTo(model.width - 150, summaryBottom + 54);
  ctx.stroke();

  let beatY = summaryBottom + 145;
  model.beats.forEach((beat, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = 150 + column * 1080;
    const y = beatY + row * 255;
    ctx.fillStyle = brass;
    ctx.font = '700 25px "Schibsted Grotesk", Arial, sans-serif';
    ctx.fillText(`0${index + 1} / ${beat.title.toUpperCase()}`, x, y);
    ctx.fillStyle = '#c6c8cf';
    ctx.font = '400 28px "Schibsted Grotesk", Arial, sans-serif';
    drawWrapped(ctx, beat.text, x, y + 54, 950, 40, 4);
  });

  ctx.fillStyle = 'rgba(217,182,111,.78)';
  ctx.font = '600 26px ui-monospace, Consolas, monospace';
  ctx.fillText(`${model.fingerprint} / 12 AUG 2026 / ${model.eclipseLongitude.toFixed(3)}°`, 150, model.height - 170);
  ctx.fillStyle = 'rgba(220,222,228,.58)';
  ctx.font = '400 22px "Schibsted Grotesk", Arial, sans-serif';
  ctx.fillText('Computed on your device · reflective astrology, not prediction or advice', 150, model.height - 105);
  return canvas;
}

function canvasBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('The artwork could not be exported.'));
    }, 'image/png');
  });
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fullReadingHtml(model) {
  return model.beats.map((beat, index) => `
    <section><small>0${index + 1} / ${escapeHtml(beat.title)}</small><p>${escapeHtml(beat.text)}</p></section>`).join('');
}

function openPrintView(model, canvas) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return false;
  const artwork = canvas.toDataURL('image/png');
  printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Your Eclipse Edition ${escapeHtml(model.fingerprint)}</title><style>
    @page{size:A4;margin:14mm}*{box-sizing:border-box}body{margin:0;background:#fff;color:#12151b;font:16px/1.55 Georgia,serif}header{border-bottom:1px solid #b99b60;margin-bottom:22px;padding-bottom:14px}h1{font-size:38px;margin:0}small{font:700 10px/1.3 Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#765c2b}img{display:block;width:100%;height:auto;page-break-after:always}section{break-inside:avoid;border-top:1px solid #d7d0c1;padding:16px 0}section p{margin:7px 0 0}footer{border-top:1px solid #d7d0c1;margin-top:24px;padding-top:12px;font-size:11px;color:#666}@media print{button{display:none}}</style></head><body>
    <header><small>AstroPrecise / 12 August 2026</small><h1>Your Eclipse Edition</h1><p>${escapeHtml(model.fingerprint)}</p></header>
    <img src="${artwork}" alt="Personalised eclipse artwork">
    ${fullReadingHtml(model)}
    <footer>${escapeHtml(model.legal)} · Computed on your device. Use the browser print dialog to save this view as PDF.</footer>
    <script>addEventListener('load',()=>setTimeout(()=>print(),250),{once:true})<\/script></body></html>`);
  printWindow.document.close();
  return true;
}

function renderUnlocked(host, model) {
  host.dataset.paidState = 'unlocked';
  host.innerHTML = `
    <div class="ap-eclipse-edition__head"><span>Edition unlocked</span><strong>${escapeHtml(model.fingerprint)}</strong></div>
    <h3>Your five-beat eclipse edition</h3>
    <div class="ap-eclipse-edition__reading">${fullReadingHtml(model)}</div>
    <figure class="ap-eclipse-edition__art"><div data-edition-canvas></div><figcaption>Unique 2400 × 3000 artwork derived from this computed chart contact. No birth details are printed into the file.</figcaption></figure>
    <div class="ap-eclipse-edition__actions"><button type="button" data-edition-download>Download PNG</button><button type="button" data-edition-print>Print / save as PDF</button></div>
    <p class="ap-eclipse-edition__status" data-edition-status role="status">Ready on this device.</p>`;

  const canvas = renderEclipseArtwork(model);
  canvas.setAttribute('aria-label', 'Personalised eclipse artwork');
  host.querySelector('[data-edition-canvas]').appendChild(canvas);
  const status = host.querySelector('[data-edition-status]');

  host.querySelector('[data-edition-download]').addEventListener('click', async () => {
    try {
      status.textContent = 'Preparing the high-resolution PNG…';
      const blob = await canvasBlob(canvas);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `astroprecise-eclipse-edition-${model.fingerprint.toLowerCase()}.png`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      status.textContent = 'PNG downloaded.';
    } catch (error) {
      status.textContent = error.message || 'The PNG could not be downloaded.';
    }
  });

  host.querySelector('[data-edition-print]').addEventListener('click', () => {
    status.textContent = openPrintView(model, canvas)
      ? 'Print view opened. Choose Save as PDF in the print dialog.'
      : 'Allow pop-ups for this click, then try Print / save as PDF again.';
  });
}

export function mountEclipseEdition(host, context) {
  if (!host) return { state: 'missing-host' };
  const { reading, natal, eclipseLongitude } = context || {};
  host.hidden = false;

  if (!reading || reading.gateSale || reading.quiet) {
    host.dataset.paidState = 'quiet';
    host.innerHTML = `
      <div class="ap-eclipse-edition__quiet"><span>Quiet chart</span><h3>Keep the free result.</h3><p>No tight conjunction, opposition or square was found, so there is no paid edition to sell you.</p></div>`;
    return { state: 'quiet' };
  }

  const model = buildEclipsePlateModel({ reading, natal, eclipseLongitude });
  const ready = isCheckoutReady(EDITION_PRODUCT);
  host.dataset.paidState = ready ? 'locked' : 'dormant';
  host.innerHTML = `
    <div class="ap-eclipse-edition__head"><span>Your Eclipse Edition</span><strong>£7 · instant</strong></div>
    <h3>Unlock all five beats and your unique eclipse artwork.</h3>
    <p>The full reading and 2400 × 3000 artwork are generated here from this computed contact. Download a PNG or open a clean print/save-as-PDF view. No manual review and no birth data leaves this browser.</p>
    <ul><li>Five-beat personalised contact reading</li><li>Unique high-resolution eclipse artwork</li><li>PNG download + print/save-as-PDF view</li></ul>
    ${ready ? `
      <div class="ap-eclipse-edition__actions"><button type="button" data-edition-buy>Buy Your Eclipse Edition — £7</button></div>
      <form class="ap-eclipse-edition__license" data-edition-license-form>
        <label><span>Already purchased? Enter the Gumroad licence key</span><input type="password" minlength="8" required autocomplete="off" data-edition-license></label>
        <p>After payment, Gumroad shows your licence key. Copy it, return here, paste it above, then choose <strong>View content</strong>.</p>
        <button type="submit">View content</button>
      </form>
      <p class="ap-eclipse-edition__status" data-edition-status role="status">Checkout and licence verification are ready.</p>` : `
      <p class="ap-eclipse-edition__status" role="status"><strong>Checkout is live.</strong> Buy securely through Gumroad, then paste the licence key here to unlock the reading and artwork. Your free contact result above remains available.</p>`}`;

  if (!ready) return { state: 'dormant', model };
  const status = host.querySelector('[data-edition-status]');
  host.querySelector('[data-edition-buy]').addEventListener('click', () => openCheckout(EDITION_PRODUCT));
  host.querySelector('[data-edition-license-form]').addEventListener('submit', async (event) => {
    event.preventDefault();
    const input = host.querySelector('[data-edition-license]');
    const button = event.currentTarget.querySelector('button');
    button.disabled = true;
    status.textContent = 'Checking the licence with Gumroad…';
    try {
      const result = await verifyLicense(EDITION_PRODUCT, input.value.trim(), { incrementUses: true });
      input.value = '';
      if (!result.valid) {
        status.textContent = 'That licence could not be verified or is no longer eligible.';
        button.disabled = false;
        return;
      }
      renderUnlocked(host, model);
    } catch (_) {
      status.textContent = 'Licence verification is temporarily unavailable. Nothing has been charged here; try again shortly.';
      button.disabled = false;
    }
  });
  return { state: 'locked', model };
}
