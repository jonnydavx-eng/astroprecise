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

const GLYPHS = {
  sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂',
  jupiter: '♃', saturn: '♄', uranus: '♅', neptune: '♆', pluto: '♇',
  asc: 'Asc', mc: 'MC',
};

const SIGN_MARKS = ['AR', 'TA', 'GE', 'CN', 'LE', 'VI', 'LI', 'SC', 'SG', 'CP', 'AQ', 'PI'];

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

function beatRecord(title, beat) {
  return {
    title,
    mono: beat && beat.mono ? String(beat.mono) : '',
    serif: beat && beat.serif ? String(beat.serif) : '',
    secondaryMono: beat && beat.secondary && beat.secondary.mono ? String(beat.secondary.mono) : '',
    secondarySerif: beat && beat.secondary && beat.secondary.serif ? String(beat.secondary.serif) : '',
    text: beatText(beat),
  };
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
  const beats = BEATS.map(([title, key]) => beatRecord(title, reading[key]));
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
    contactTarget: reading.contactTarget || null,
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

function lonToAngle(longitude) {
  return Math.PI - (normaliseLongitude(longitude) * Math.PI / 180);
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
  background.addColorStop(0.42, ink);
  background.addColorStop(1, '#0a1018');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, model.width, model.height);

  for (let i = 0; i < 480; i += 1) {
    const x = random() * model.width;
    const y = random() * model.height * 0.62;
    const radius = 0.6 + random() * 2.2;
    ctx.globalAlpha = 0.14 + random() * 0.55;
    ctx.fillStyle = random() > 0.86 ? brass : '#e9edf4';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    if (random() > 0.97 && radius > 1.8) {
      ctx.globalAlpha = 0.22;
      ctx.strokeStyle = '#e9edf4';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - 9, y);
      ctx.lineTo(x + 9, y);
      ctx.moveTo(x, y - 9);
      ctx.lineTo(x, y + 9);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;

  const ringX = model.width * 0.5;
  const ringY = 780;
  const eclipseRadius = 248;
  const moonShift = ((model.seed % 7) - 3) * 7;
  const corona = ctx.createRadialGradient(ringX, ringY, eclipseRadius * 0.7, ringX, ringY, eclipseRadius * 2.05);
  corona.addColorStop(0, 'rgba(245,220,157,.98)');
  corona.addColorStop(0.22, 'rgba(217,182,111,.42)');
  corona.addColorStop(1, 'rgba(217,182,111,0)');
  ctx.fillStyle = corona;
  ctx.beginPath();
  ctx.arc(ringX, ringY, eclipseRadius * 2.05, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(ringX, ringY);
  ctx.rotate((model.seed % 360) * Math.PI / 180);
  for (let i = 0; i < 56; i += 1) {
    const angle = (i / 56) * Math.PI * 2 + (random() - 0.5) * 0.05;
    const inner = eclipseRadius * (1.01 + random() * 0.03);
    const outer = eclipseRadius * (1.22 + random() * 0.55);
    ctx.strokeStyle = i % 8 === 0 ? brass : '#efe2bd';
    ctx.globalAlpha = 0.1 + random() * 0.32;
    ctx.lineWidth = 1.5 + random() * 4.5;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
    ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
    ctx.stroke();
  }
  ctx.restore();
  ctx.globalAlpha = 1;

  const sunFill = ctx.createRadialGradient(ringX, ringY, 20, ringX, ringY, eclipseRadius);
  sunFill.addColorStop(0, '#f3e2b0');
  sunFill.addColorStop(0.55, '#d9b66f');
  sunFill.addColorStop(1, '#8a5a28');
  ctx.fillStyle = sunFill;
  ctx.beginPath();
  ctx.arc(ringX, ringY, eclipseRadius, 0, Math.PI * 2);
  ctx.fill();

  const moon = ctx.createRadialGradient(ringX - 80 + moonShift, ringY - 90, 18, ringX + moonShift, ringY, eclipseRadius);
  moon.addColorStop(0, '#1a202b');
  moon.addColorStop(0.58, '#07090e');
  moon.addColorStop(1, '#010205');
  ctx.fillStyle = moon;
  ctx.beginPath();
  ctx.arc(ringX + moonShift, ringY, eclipseRadius - 6, 0, Math.PI * 2);
  ctx.fill();
  drawHairlineCircle(ctx, ringX, ringY, eclipseRadius + 8, brass, 0.88, 3);

  const wheelX = model.width * 0.5;
  const wheelY = 1760;
  const outerR = 690;
  const innerR = 248;
  const planetR = 520;
  const tickInner = 640;
  const tickOuter = 678;

  const wheelWash = ctx.createRadialGradient(wheelX, wheelY, innerR, wheelX, wheelY, outerR + 40);
  wheelWash.addColorStop(0, 'rgba(8,12,20,.55)');
  wheelWash.addColorStop(1, 'rgba(8,12,20,0)');
  ctx.fillStyle = wheelWash;
  ctx.beginPath();
  ctx.arc(wheelX, wheelY, outerR + 48, 0, Math.PI * 2);
  ctx.fill();

  drawHairlineCircle(ctx, wheelX, wheelY, outerR, brass, 0.78, 3);
  drawHairlineCircle(ctx, wheelX, wheelY, tickInner, blue, 0.42, 2);
  drawHairlineCircle(ctx, wheelX, wheelY, planetR, brass, 0.28, 1.5);
  drawHairlineCircle(ctx, wheelX, wheelY, innerR, brass, 0.55, 2);

  ctx.save();
  ctx.translate(wheelX, wheelY);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let sign = 0; sign < 12; sign += 1) {
    const cusp = lonToAngle(sign * 30);
    ctx.strokeStyle = brass;
    ctx.globalAlpha = sign % 3 === 0 ? 0.7 : 0.28;
    ctx.lineWidth = sign % 3 === 0 ? 3 : 1.5;
    ctx.beginPath();
    ctx.moveTo(Math.cos(cusp) * tickInner, Math.sin(cusp) * tickInner);
    ctx.lineTo(Math.cos(cusp) * tickOuter, Math.sin(cusp) * tickOuter);
    ctx.stroke();
    const mid = lonToAngle(sign * 30 + 15);
    const labelR = 708;
    ctx.globalAlpha = 0.82;
    ctx.fillStyle = brass;
    ctx.font = '600 22px ui-monospace, Consolas, monospace';
    ctx.fillText(SIGN_MARKS[sign], Math.cos(mid) * labelR, Math.sin(mid) * labelR);
  }

  const eclipseAngle = lonToAngle(model.eclipseLongitude);
  ctx.strokeStyle = ember;
  ctx.globalAlpha = 0.95;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(Math.cos(eclipseAngle) * (innerR + 18), Math.sin(eclipseAngle) * (innerR + 18));
  ctx.lineTo(Math.cos(eclipseAngle) * (outerR + 18), Math.sin(eclipseAngle) * (outerR + 18));
  ctx.stroke();
  ctx.fillStyle = ember;
  ctx.beginPath();
  ctx.arc(Math.cos(eclipseAngle) * planetR, Math.sin(eclipseAngle) * planetR, 11, 0, Math.PI * 2);
  ctx.fill();

  model.placements.forEach((placement) => {
    const angle = lonToAngle(placement.longitude);
    const x = Math.cos(angle) * planetR;
    const y = Math.sin(angle) * planetR;
    const isContact = model.contactTarget && placement.key === model.contactTarget;
    const glyph = GLYPHS[placement.key] || placement.key.slice(0, 2).toUpperCase();
    ctx.globalAlpha = 1;
    ctx.fillStyle = isContact ? ember : ink;
    ctx.beginPath();
    ctx.arc(x, y, isContact ? 34 : 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = isContact ? brass : brass;
    ctx.lineWidth = isContact ? 3 : 1.5;
    ctx.globalAlpha = isContact ? 1 : 0.85;
    ctx.stroke();
    ctx.fillStyle = isContact ? '#f6efe0' : brass;
    ctx.font = isContact
      ? '700 26px "Schibsted Grotesk", Arial, sans-serif'
      : '600 22px "Schibsted Grotesk", Arial, sans-serif';
    ctx.fillText(glyph, x, y + 1);
  });
  ctx.restore();
  ctx.globalAlpha = 1;

  ctx.fillStyle = brass;
  ctx.font = '600 28px "Schibsted Grotesk", Arial, sans-serif';
  ctx.letterSpacing = '8px';
  ctx.fillText('ASTROPRECISE  /  12 AUGUST 2026', 150, 168);
  ctx.letterSpacing = '0px';
  ctx.fillStyle = '#f0ece3';
  ctx.font = '600 64px "Cormorant Garamond", Georgia, serif';
  ctx.fillText('Your natal wheel at this eclipse.', 150, 248);

  ctx.fillStyle = 'rgba(217,182,111,.78)';
  ctx.font = '600 26px ui-monospace, Consolas, monospace';
  ctx.fillText(`${model.fingerprint}  /  ${model.eclipseLongitude.toFixed(3)}°`, 150, model.height - 210);
  ctx.fillStyle = '#d7d9df';
  ctx.font = '500 32px "Schibsted Grotesk", Arial, sans-serif';
  drawWrapped(ctx, model.share, 150, model.height - 155, 2100, 42, 2);
  ctx.fillStyle = 'rgba(220,222,228,.55)';
  ctx.font = '400 20px "Schibsted Grotesk", Arial, sans-serif';
  ctx.fillText('Computed on your device · reflective astrology, not prediction or advice', 150, model.height - 72);
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

function beatSectionHtml(beat, index) {
  const parts = [];
  if (beat.mono) parts.push(`<p class="ap-eclipse-edition__mono">${escapeHtml(beat.mono)}</p>`);
  if (beat.serif) parts.push(`<p class="ap-eclipse-edition__serif">${escapeHtml(beat.serif)}</p>`);
  if (beat.secondaryMono) parts.push(`<p class="ap-eclipse-edition__mono">${escapeHtml(beat.secondaryMono)}</p>`);
  if (beat.secondarySerif) parts.push(`<p class="ap-eclipse-edition__serif ap-eclipse-edition__secondary">${escapeHtml(beat.secondarySerif)}</p>`);
  if (!parts.length && beat.text) parts.push(`<p>${escapeHtml(beat.text)}</p>`);
  return `<section><small>0${index + 1} / ${escapeHtml(beat.title)}</small>${parts.join('')}</section>`;
}

function fullReadingHtml(model) {
  return model.beats.map((beat, index) => beatSectionHtml(beat, index)).join('');
}

function openPrintView(model, canvas) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return false;
  const artwork = canvas.toDataURL('image/png');
  printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Your Eclipse Edition ${escapeHtml(model.fingerprint)}</title><style>
    @page{size:A4;margin:14mm}*{box-sizing:border-box}body{margin:0;background:#fff;color:#12151b;font:16px/1.55 Georgia,serif}header{border-bottom:1px solid #b99b60;margin-bottom:22px;padding-bottom:14px}h1{font-size:38px;margin:0}small{font:700 10px/1.3 Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#765c2b}img{display:block;width:100%;height:auto;page-break-after:always}section{break-inside:avoid;border-top:1px solid #d7d0c1;padding:16px 0}.ap-eclipse-edition__mono{margin:7px 0 0;font:12px/1.55 ui-monospace,Consolas,monospace;color:#333}.ap-eclipse-edition__serif{margin:8px 0 0;font:italic 17px/1.55 Georgia,serif}footer{border-top:1px solid #d7d0c1;margin-top:24px;padding-top:12px;font-size:11px;color:#666}@media print{button{display:none}}</style></head><body>
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
    <figure class="ap-eclipse-edition__art"><div data-edition-canvas></div><figcaption>Unique 2400 × 3000 natal-wheel plate from this computed chart contact. No birth details are printed into the file.</figcaption></figure>
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

const EDITION_PENDING_KEY = 'ap-eclipse-edition-pending';

/** Persist a computed contact so Gumroad checkout return can unlock without re-casting. */
export function rememberEditionContext(context) {
  if (!context || !context.reading || context.reading.gateSale || context.reading.quiet) return false;
  try {
    sessionStorage.setItem(EDITION_PENDING_KEY, JSON.stringify({
      at: Date.now(),
      reading: context.reading,
      natal: context.natal,
      eclipseLongitude: context.eclipseLongitude,
      meta: context.meta || null,
    }));
    return true;
  } catch (_) {
    return false;
  }
}

/** Load a pending edition context saved before checkout (same tab/session only). */
export function loadEditionContext({ maxAgeMs = 6 * 60 * 60 * 1000 } = {}) {
  try {
    const raw = sessionStorage.getItem(EDITION_PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.reading || !parsed.natal || parsed.eclipseLongitude == null) return null;
    if (parsed.reading.gateSale || parsed.reading.quiet) return null;
    if (maxAgeMs && parsed.at && (Date.now() - Number(parsed.at)) > maxAgeMs) return null;
    return parsed;
  } catch (_) {
    return null;
  }
}

export function clearEditionContext() {
  try { sessionStorage.removeItem(EDITION_PENDING_KEY); } catch (_) {}
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
  rememberEditionContext(context);
  host.innerHTML = `
    <div class="ap-eclipse-edition__head"><span>Your Eclipse Edition</span><strong>£7 · instant</strong></div>
    <h3>Keep this contact as reading and art.</h3>
    <p>Five authored beats plus unique 2400 × 3000 natal-wheel artwork, generated here from this computed contact. Download a PNG or open print / save-as-PDF. No manual review and no birth data leaves this browser.</p>
    <ul><li>Five-beat personalised contact reading</li><li>Unique high-resolution eclipse artwork</li><li>PNG download + print / save-as-PDF</li><li>Licence unlock via Gumroad View content</li></ul>
    ${ready ? `
      <div class="ap-eclipse-edition__actions"><button type="button" data-edition-buy>Buy Your Eclipse Edition — £7</button></div>
      <form class="ap-eclipse-edition__license" data-edition-license-form>
        <label><span>Already purchased? Paste the licence key from Gumroad View content</span><input type="password" minlength="8" required autocomplete="off" data-edition-license></label>
        <button type="submit">Unlock on this device</button>
      </form>
      <p class="ap-eclipse-edition__status" data-edition-status role="status">Pay on Gumroad → open <strong>View content</strong> → copy the licence key → return here and paste. This contact stays in this browser tab.</p>` : `
      <p class="ap-eclipse-edition__status" role="status"><strong>Checkout is closed.</strong> The public link and product ID are not both configured, so nothing can take payment. Your free contact result above remains available.</p>`}`;

  if (!ready) return { state: 'dormant', model };
  const status = host.querySelector('[data-edition-status]');
  host.querySelector('[data-edition-buy]').addEventListener('click', () => {
    rememberEditionContext(context);
    openCheckout(EDITION_PRODUCT);
  });
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
        status.textContent = result.reason
          || 'That licence could not be verified or is no longer eligible.';
        button.disabled = false;
        return;
      }
      clearEditionContext();
      renderUnlocked(host, model);
    } catch (_) {
      status.textContent = 'Licence verification is temporarily unavailable. Nothing has been charged here; try again shortly.';
      button.disabled = false;
    }
  });
  return { state: 'locked', model };
}
