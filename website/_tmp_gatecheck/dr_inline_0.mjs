
import { buildDeepReading } from './js/deep-reading.js';
const E = window.AstroEphemeris;
const $ = (id) => document.getElementById(id);

const natalOf = (jd) => {
  const P = E.allPlanetPositions(jd), out = {};
  for (const [k, v] of Object.entries(P)) out[k.toLowerCase()] = v.lon;
  return out;
};

/** Prefer a saved chart on this device; else published sample (14 Mar 1994 Manchester). */
function resolveNatal() {
  const sample = {
    natal: natalOf(E.julianDay(1994, 3, 14, 9, 12, 0)),
    birth: { dateText: '14 March 1994', timeText: '09:12', place: 'Manchester' },
    label: 'PUBLISHED SAMPLE CHART',
  };
  try {
    const charts = JSON.parse(localStorage.getItem('ap_charts') || '[]');
    if (!charts.length) return sample;
    const activeId = localStorage.getItem('ap_active_chart');
    const c = charts.find((x) => x && x.id === activeId) || charts[0];
    if (!c || !c.positions) return sample;
    const natal = {};
    for (const [k, p] of Object.entries(c.positions)) {
      if (!p) continue;
      const lon = typeof p.lon === 'number' ? p.lon
        : (typeof p.longitude === 'number' ? p.longitude
          : (typeof p === 'number' ? p : null));
      if (typeof lon === 'number' && isFinite(lon)) natal[k.toLowerCase()] = lon;
    }
    if (natal.sun == null) return sample;
    return {
      natal,
      birth: {
        dateText: c.birthDate || c.date || 'Saved chart',
        timeText: c.birthTime || c.time || '',
        place: c.city || c.place || 'on this device',
      },
      label: 'FROM YOUR SAVED CHART ON THIS DEVICE',
    };
  } catch (e) {
    return sample;
  }
}

const resolved = resolveNatal();
const now = new Date();
const transits = natalOf(E.julianDay(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), 0));

// ——— LICENSE GATE (mirrors eclipse.html) ———
// The £12 Full Birth-Chart Reading stays locked until a Gumroad license key for
// 'full-reading' verifies, a ?license= return param verifies, or a previous
// unlock is found on this device. While Gumroad permalinks are REPLACE_ME the
// gate degrades to the dormant "email me when available" form — no fake checkout.
let gumroadMod = null;
async function loadGumroadUnlock() {
  if (!gumroadMod) gumroadMod = await import('./js/gumroad-unlock.js');
  return gumroadMod;
}
function storedUnlock() {
  try { return localStorage.getItem('ap_full_reading_unlocked') === '1'; } catch (e) { return false; }
}
function rememberUnlock() {
  try { localStorage.setItem('ap_full_reading_unlocked', '1'); } catch (e) {}
}
function setStatus(msg) {
  const el = $('licMsg');
  if (el) el.textContent = msg;
}

let lastReading = null;
let lastNoteExtra = '';

function renderUnlocked() {
  const r = lastReading;
  const today = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();
  $('chapters').innerHTML = r.chapters.map((c) => `
    <div class="chapter">
      <div class="head"><span class="num">CH ${String(c.n).padStart(2, '0')}</span><span class="title">${c.title}</span></div>
      ${c.mono.length ? `<div class="receipt">${c.mono.map((m) => `<div>${m}</div>`).join('')}</div>` : ''}
      ${c.n === 7
        ? `<div class="letter"><div class="mono" style="font-size:8.5px;letter-spacing:.24em;color:rgba(159,220,236,.7);margin-bottom:16px">KEPT FOR RE-READING · ${today}</div>${c.serif.map((s) => `<p class="serif" style="margin:0 0 14px">${s}</p>`).join('')}<div class="serif" style="font-size:17px;color:rgba(233,237,242,.65);margin:22px 0 0">— written from your sky alone</div></div>`
        : c.serif.map((s) => `<p class="serif">${s}</p>`).join('')}
    </div>`).join('');
  $('unlockBox').innerHTML = '';
  $('notes').innerHTML = `${String(lastNoteExtra).toUpperCase()}<br>${r.legal.toUpperCase()}`;
}

function renderLockedShell() {
  const r = lastReading;
  $('chapters').innerHTML = r.chapters.map((c) => `
    <div class="chapter">
      <div class="head"><span class="num">CH ${String(c.n).padStart(2, '0')}</span><span class="title">${c.title}</span></div>
      <div class="mono" style="font-size:9px;letter-spacing:.18em;color:var(--faint)">LOCKED — THIS CHAPTER IS ALREADY WRITTEN ON THIS DEVICE · UNLOCKS WITH YOUR £12 LICENSE</div>
    </div>`).join('');
  $('notes').innerHTML = r.legal.toUpperCase();
  $('unlockBox').innerHTML = `
    <div class="card">
      <div class="lbl">THE FULL READING — £12 · UNLOCK THE SEVEN CHAPTERS ABOVE</div>
      <p style="margin:0 0 16px;font-size:15.5px;line-height:1.65;color:var(--dim)">The titles are real — the chapters under them are already computed on this device, never uploaded. Payment on Gumroad issues your license key; paste it below and the reading unlocks in place, on any device, any time.</p>
      <a class="btn" id="buyBtn" href="./shop.html#deep-reading" style="display:none">UNLOCK THE FULL READING — £12</a>
      <form id="notifyForm" style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:0">
        <input id="notifyEmail" type="email" required placeholder="you@example.com" aria-label="Email for checkout-open alert" style="flex:1;min-width:200px">
        <button class="btn" type="submit">NOTIFY ME — £12 WHEN CHECKOUT OPENS</button>
      </form>
      <div class="mono" id="buyNote" style="font-size:10px;letter-spacing:.16em;color:var(--faint);margin-top:10px">KEEPSAKE PDF + LIVE CH6 · GUMROAD WHEN LIVE · NO FAKE CHECKOUT</div>
      <details id="licDetails" style="margin-top:16px">
        <summary class="mono" style="font-size:9px;letter-spacing:.18em;color:var(--faint);cursor:pointer">ALREADY BOUGHT? ENTER YOUR LICENSE KEY</summary>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px">
          <input id="licKey" placeholder="XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX" style="flex:1;min-width:220px" aria-label="Gumroad license key">
          <button class="btn ghost" id="licBtn" type="button">UNLOCK</button>
        </div>
        <div class="mono" id="licMsg" style="font-size:9px;letter-spacing:.16em;color:var(--faint);margin-top:8px"></div>
      </details>
    </div>`;
  bindUnlockForms();
  upgradeBuyBtn();
}

async function attemptUnlock(key) {
  if (!key) return;
  // Dormant checkout: license API cannot verify until Gumroad permalinks exist
  try {
    const mod = await loadGumroadUnlock();
    if (!mod.isCheckoutReady('full-reading')) {
      setStatus('CHECKOUT NOT LIVE YET — LICENSE VERIFY WAITS FOR GUMROAD PERMALINKS. USE NOTIFY ME ABOVE.');
      return;
    }
  } catch (e0) { /* continue to verify */ }
  setStatus('CHECKING WITH GUMROAD…');
  try {
    const { verifyLicense } = await loadGumroadUnlock();
    const res = await verifyLicense('full-reading', key);
    if (res.valid) { rememberUnlock(); setStatus('UNLOCKED — PERMANENT ON THIS DEVICE'); renderUnlocked(); }
    else setStatus('KEY NOT RECOGNISED — CHECK YOUR GUMROAD RECEIPT');
  } catch (e) { setStatus('COULD NOT REACH GUMROAD — TRY AGAIN'); }
}

function bindUnlockForms() {
  $('licBtn')?.addEventListener('click', () => { attemptUnlock(($('licKey') || {}).value.trim()); });
  // Dormant-checkout capture: notify form → subscribe worker (+ same-device backstop)
  $('notifyForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const em = $('notifyEmail').value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return;
    try {
      const body = new FormData();
      body.append('email', em);
      body.append('tags', 'checkout-full-reading');
      fetch('https://list.astroprecise.app/subscribe', { method: 'POST', mode: 'no-cors', body });
    } catch (err) {}
    try {
      const prev = JSON.parse(localStorage.getItem('ap_email_intent') || '[]');
      prev.push({ email: em, savedAt: Date.now(), source: 'checkout-full-reading' });
      localStorage.setItem('ap_email_intent', JSON.stringify(prev.slice(-50)));
    } catch (err) {}
    $('notifyForm').innerHTML = '<div class="mono" style="font-size:11px;letter-spacing:.14em;color:var(--good);padding:12px 0">✦ WE\'LL EMAIL YOU THE INSTANT £12 UNLOCK GOES LIVE</div>';
  });
}

// Buy button: flips from inline notify-form to live Gumroad checkout the moment a real permalink exists
async function upgradeBuyBtn() {
  try {
    const mod = await loadGumroadUnlock();
    if (!mod.isCheckoutReady('full-reading')) return;
    const permalink = (mod.GUMROAD_PRODUCTS['full-reading'] || {}).permalink;
    const b = $('buyBtn'), f = $('notifyForm');
    if (f) f.style.display = 'none';
    if (b) {
      b.style.display = '';
      if (permalink) b.href = `https://gumroad.com/l/${permalink}?wanted=true`;
    }
    const note = $('buyNote');
    if (note) note.textContent = 'KEEPSAKE PDF + LIVE CH6 · INSTANT UNLOCK · PAYMENT ON GUMROAD, READING COMPUTED HERE';
  } catch (e) { /* dormant state stays */ }
}

Promise.all([
  fetch('./js/reading-templates.json').then((r) => r.json()),
  fetch('./js/deep-templates.json').then((r) => r.json())
]).then(([base, deep]) => {
  const r = buildDeepReading(resolved.natal, base, deep, {
    birth: resolved.birth,
    transits,
    transitDateText: now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  });
  lastReading = r;
  lastNoteExtra = resolved.label.indexOf('SAVED') >= 0
    ? 'BUILT FROM YOUR SAVED CHART ON THIS DEVICE — SAMPLE MODE UNTIL YOU COMMISSION.'
    : (r.houseNote || 'SAMPLE USES THE TEN BODIES; RISING/HOUSES APPEAR WHEN A BIRTH PLACE IS GIVEN AT COMMISSION.');
  $('wordLine').textContent = `≈ ${r.wordCount} WORDS · ${resolved.label} · CH6 LIVE TRANSITS · CHECKABLE ON THE MODEL`;
  if (storedUnlock()) {
    renderUnlocked();
  } else {
    renderLockedShell();
    // on return from Gumroad with ?license=KEY
    const lic = new URLSearchParams(location.search).get('license');
    if (lic) {
      $('licDetails')?.setAttribute('open', '');
      setTimeout(() => { if ($('licKey')) $('licKey').value = lic; attemptUnlock(lic); }, 600);
    }
  }
}).catch((e) => {
  $('chapters').innerHTML = `<div class="mono" style="font-size:10px;letter-spacing:.2em;color:#e6a15c;padding:30px 0">ENGINE FAILED TO LOAD — ${String(e).slice(0, 80)}</div>`;
});
