/**
 * AstroPrecise — The Instrument (page controller)
 * Coordinates the light-cone, zenith star, echo dates, daimon, quantum draw,
 * consciousness weather, precession layer, and time travel sections.
 */

(function () {
  'use strict';

  if (!document.getElementById('sec-lightcone')) return;

  const E = () => window.AstroEphemeris;
  const STORE_KEY = 'ap_instrument_event';
  let event_ = null;   // { dt: ISO string, lat, lon, tz, city }

  // ── Event setup ───────────────────────────────────────────────────────────

  function loadEvent() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    // fall back to first saved profile chart
    try {
      const charts = window.AstroProfile ? AstroProfile.getCharts() : [];
      if (charts.length && charts[0].birthDate && charts[0].lat != null) {
        const c = charts[0];
        return {
          dt: c.birthDate + 'T' + (c.birthTime || '12:00'),
          lat: c.lat, lon: c.lon, tz: c.tz || '', city: c.city || '',
        };
      }
    } catch (e) {}
    return null;
  }

  function saveEvent(ev) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(ev)); } catch (e) {}
  }

  // local birth time → UTC Date via IANA tz
  function eventDateUTC(ev) {
    const [d, t] = ev.dt.split('T');
    const [y, m, dd] = d.split('-').map(Number);
    const [hh, mm] = t.split(':').map(Number);
    if (!ev.tz) return new Date(Date.UTC(y, m - 1, dd, hh, mm));
    let utc = new Date(Date.UTC(y, m - 1, dd, hh, mm));
    for (let i = 0; i < 2; i++) {
      try {
        const dtf = new Intl.DateTimeFormat('en-US', {
          timeZone: ev.tz, year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit', hour12: false,
        });
        const p = {};
        dtf.formatToParts(utc).forEach(x => { p[x.type] = x.value; });
        const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute);
        utc = new Date(Date.UTC(y, m - 1, dd, hh, mm) - (asUTC - utc.getTime()));
      } catch (e) { break; }
    }
    return utc;
  }

  function eventJd(ev) {
    const u = eventDateUTC(ev);
    return E().julianDay(u.getUTCFullYear(), u.getUTCMonth() + 1, u.getUTCDate(),
                         u.getUTCHours(), u.getUTCMinutes(), 0);
  }

  // mini natal chart (positions only) for echoes/daimon/oracle
  function natalFor(ev) {
    try {
      return E().calculateNatalChart(...(() => {
        const u = eventDateUTC(ev);
        return [u.getUTCFullYear(), u.getUTCMonth() + 1, u.getUTCDate(),
                u.getUTCHours(), u.getUTCMinutes(), ev.lat, ev.lon];
      })());
    } catch (e) { return null; }
  }

  // ── City autocomplete (self-contained) ────────────────────────────────────

  const cityIn = document.getElementById('ev-city');
  const cityDd = document.getElementById('ev-city-dd');
  let pickedCity = null;

  const escHtml = s => String(s).replace(/[&<>"']/g,
    ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));

  let citySeq = 0;
  const runCitySearch = window.AstroApp.debounce(q => {
    const mySeq = ++citySeq;
    window.AstroApp.searchPlaces(q).then(({ results, source }) => {
      if (mySeq !== citySeq) return;
      const hits = results.slice(0, 7);
      if (!hits.length) {
        cityDd.innerHTML = '<div class="autocomplete-note">No places matched — check the spelling, or try the nearest larger town.</div>';
        cityDd.hidden = false;
        return;
      }
      const note = source === 'offline'
        ? '<div class="autocomplete-note">Offline — built-in city list only</div>' : '';
      cityDd.innerHTML = hits.map((c, i) => {
        const region = c.admin ? `${c.admin}, ${c.country}` : c.country;
        return `<div class="autocomplete-option" data-i="${i}"><strong>${escHtml(c.name)}</strong>&nbsp;<span style="opacity:0.6">${escHtml(region)}</span></div>`;
      }).join('') + note;
      cityDd.hidden = false;
      cityDd.querySelectorAll('.autocomplete-option').forEach((el, i) => {
        el.addEventListener('mousedown', ev2 => {
          ev2.preventDefault();
          pickedCity = hits[i];
          cityIn.value = hits[i].admin
            ? `${hits[i].name}, ${hits[i].admin}`
            : `${hits[i].name}, ${hits[i].country}`;
          cityDd.hidden = true;
        });
      });
    });
  }, 250);

  cityIn.addEventListener('input', () => {
    pickedCity = null;
    const q = cityIn.value.trim();
    if (q.length < 2) { citySeq++; cityDd.hidden = true; return; }
    cityDd.innerHTML = '<div class="autocomplete-note">Searching the gazetteer…</div>';
    cityDd.hidden = false;
    runCitySearch(q);
  });
  cityIn.addEventListener('blur', () => setTimeout(() => { cityDd.hidden = true; }, 150));

  document.getElementById('ev-set').addEventListener('click', () => {
    const dt = document.getElementById('ev-datetime').value;
    if (!dt || !pickedCity) {
      document.getElementById('ev-status').textContent = 'Both the moment and the place are needed.';
      return;
    }
    event_ = { dt, lat: pickedCity.lat, lon: pickedCity.lon, tz: pickedCity.tz, city: pickedCity.name };
    saveEvent(event_);
    activate();
  });

  // Example event so first-time visitors see the instrument working immediately.
  // Sagan's birth: 9 Nov 1934, Brooklyn, New York — fitting for a page about real astronomy.
  const exampleBtn = document.getElementById('ev-example');
  if (exampleBtn) exampleBtn.addEventListener('click', () => {
    event_ = {
      dt: '1934-11-09T17:05', lat: 40.6782, lon: -73.9442,
      tz: 'America/New_York', city: 'Brooklyn, New York', example: true,
    };
    // persist only if the visitor has no real event saved
    if (!localStorage.getItem(STORE_KEY)) saveEvent(event_);
    activate();
    document.getElementById('ev-status').textContent =
      'Example — Carl Sagan, 9 Nov 1934, Brooklyn. Set your own event any time.';
  });

  // ── Section 1: Light-cone ─────────────────────────────────────────────────

  let lcTimer = null;

  function fmtNum(n, dp = 0) {
    return n.toLocaleString(undefined, { maximumFractionDigits: dp, minimumFractionDigits: dp });
  }

  function renderLightCone() {
    const birth = eventDateUTC(event_);
    window.LightCone.init(document.getElementById('lightcone-canvas'), birth);

    const readout = document.getElementById('lc-readout');
    const starsEl = document.getElementById('lc-stars');

    function tick() {
      const m = window.LightCone.milestones(birth);
      if (!m) return;
      const passing = m.passing
        ? ` It is currently passing <strong>${m.passing.name}</strong>${m.passing.con ? ' in ' + m.passing.con : ''} — ${m.passing.fact || 'a real star, catalogued and named'}.`
        : '';
      readout.innerHTML =
        `<p>The light of your first breath is now <span class="data-mono">${m.radiusLy.toFixed(7)}</span> light-years
        from Earth — a sphere <span class="data-mono">${fmtNum(m.radiusKm / 1e9)}</span> billion kilometres across,
        still widening at 299,792 km every second.${passing}</p>
        <p>Your existence has already reached <strong>${m.reached.length}</strong> catalogued star systems.` +
        (m.next ? ` The next is <strong>${m.next.name}</strong> (${m.next.ly} ly), which your light will touch in
        <span class="data-mono">${m.nextYears.toFixed(1)}</span> years.` : '') + `</p>`;
    }
    tick();
    if (lcTimer) clearInterval(lcTimer);
    lcTimer = setInterval(tick, 1000);

    // reached-stars chips (last 12)
    const m = window.LightCone.milestones(birth);
    if (m && m.reached.length) {
      const last = m.reached.slice(-12).reverse();
      starsEl.innerHTML =
        '<p class="instrument-eyebrow" style="margin-bottom:var(--space-3);">Most recently reached</p>' +
        '<div style="display:flex;flex-wrap:wrap;gap:var(--space-2);">' +
        last.map(s =>
          `<span title="${(s.fact || '').replace(/"/g, '&quot;')}" style="font-size:0.7rem;letter-spacing:0.08em;padding:5px 12px;border:1px solid rgba(201, 162, 39,0.3);border-radius:999px;color:var(--gold-pale);cursor:help;">
            ${s.name} · ${s.ly} ly</span>`).join('') + '</div>';
    }

    const cardBtn = document.getElementById('lc-card-btn');
    if (cardBtn && !cardBtn.dataset.wired) {
      cardBtn.dataset.wired = '1';
      cardBtn.addEventListener('click', () => {
        const cv = drawLightConeCard(birth);
        if (!cv) return;
        const a = document.createElement('a');
        a.download = 'my-light-cone.png';
        a.href = cv.toDataURL('image/png');
        a.click();
      });
    }
  }

  // 1080×1080 shareable card: the wavefront among real stars + the headline fact
  function drawLightConeCard(birth) {
    const m = window.LightCone.milestones(birth);
    const S = window.StarCatalog;
    if (!m || !S) return null;

    const BASE = 1080;
    const W = cardExportPx();
    const H = W;
    const cv = document.createElement('canvas');
    const x = (window.RafCore && window.RafCore.prepExportCtx)
      ? window.RafCore.prepExportCtx(cv, W, H)
      : (cv.width = W, cv.height = H, cv.getContext('2d'));
    x.scale(W / BASE, W / BASE);

    x.fillStyle = '#050406';
    x.fillRect(0, 0, BASE, BASE);
    const neb = x.createRadialGradient(BASE / 2, 430, 0, BASE / 2, 430, 520);
    neb.addColorStop(0, 'rgba(110, 26, 38, 0.22)');
    neb.addColorStop(1, 'transparent');
    x.fillStyle = neb; x.fillRect(0, 0, BASE, BASE);

    let seed = 137;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 160; i++) {
      x.fillStyle = `rgba(240,232,216,${0.1 + rnd() * 0.5})`;
      x.beginPath();
      x.arc(rnd() * BASE, rnd() * BASE, rnd() * 1.6 + 0.3, 0, Math.PI * 2);
      x.fill();
    }

    x.strokeStyle = 'rgba(201, 162, 39,0.55)';
    x.lineWidth = 2;
    x.strokeRect(46, 46, BASE - 92, BASE - 92);
    x.strokeStyle = 'rgba(201, 162, 39,0.22)';
    x.strokeRect(58, 58, BASE - 116, BASE - 116);

    // ── wavefront map (same log-radial mapping as the live canvas) ──
    const cx = BASE / 2, cy = 430, maxR = 330;
    const rOf = ly => 12 + (Math.log10(Math.max(ly, 0.1) / 0.1) / 4) * (maxR - 12);
    const waveR = rOf(m.radiusLy);

    [1, 10, 100, 1000].forEach(ly => {
      x.beginPath();
      x.arc(cx, cy, rOf(ly), 0, Math.PI * 2);
      x.strokeStyle = 'rgba(154,166,200,0.13)';
      x.lineWidth = 1;
      x.setLineDash([3, 7]);
      x.stroke();
      x.setLineDash([]);
    });

    const fill = x.createRadialGradient(cx, cy, 0, cx, cy, waveR);
    fill.addColorStop(0, 'rgba(201, 162, 39,0.14)');
    fill.addColorStop(1, 'rgba(91,127,199,0.03)');
    x.beginPath(); x.arc(cx, cy, waveR, 0, Math.PI * 2);
    x.fillStyle = fill; x.fill();

    for (const star of S.STARS) {
      if (star.ly > 1100) continue;
      const r = rOf(star.ly);
      const a = (star.ra - 90) * Math.PI / 180;
      const sx = cx + Math.cos(a) * r, sy = cy + Math.sin(a) * r;
      const reached = star.ly <= m.radiusLy;
      x.beginPath();
      x.arc(sx, sy, reached ? 3 : 1.8, 0, Math.PI * 2);
      x.fillStyle = reached ? 'rgba(232,201,106,0.95)' : 'rgba(154,166,200,0.3)';
      x.fill();
    }

    x.beginPath();
    x.arc(cx, cy, waveR, 0, Math.PI * 2);
    x.strokeStyle = 'rgba(232,201,106,0.9)';
    x.lineWidth = 2.4;
    x.shadowColor = 'rgba(201, 162, 39,0.9)';
    x.shadowBlur = 18;
    x.stroke();
    x.shadowBlur = 0;

    x.beginPath();
    x.arc(cx, cy, 4, 0, Math.PI * 2);
    x.fillStyle = '#f0e8d8';
    x.shadowColor = 'rgba(240,232,216,0.9)';
    x.shadowBlur = 12;
    x.fill();
    x.shadowBlur = 0;

    // ── text ──
    x.textAlign = 'center';
    x.fillStyle = '#C9A227';
    x.font = '26px "AstroGlyph", Georgia, serif';
    x.fillText('✦  T H E   L I G H T - C O N E  ✦', BASE / 2, 130);

    x.fillStyle = '#A89E88';
    x.font = '30px "AstroGlyph", Georgia, serif';
    x.fillText('The light of my first breath has reached', BASE / 2, 830);

    x.fillStyle = '#f0e8d8';
    x.font = 'bold 76px "AstroGlyph", Georgia, serif';
    x.fillText(`${m.reached.length} star systems`, BASE / 2, 920);

    x.fillStyle = '#A89E88';
    x.font = '28px "AstroGlyph", Georgia, serif';
    x.fillText(`and is now ${m.radiusLy.toFixed(2)} light-years from Earth — still travelling`, BASE / 2, 975);

    x.fillStyle = '#C9A227';
    x.font = '22px "AstroGlyph", Georgia, serif';
    x.fillText('astroprecise · the instrument', BASE / 2, 1010);

    return cv;
  }

  // ── Shared share-card scaffolding (HD export, 1080 design-space) ─────────
  const CARD_BASE = 1080;
  function cardExportPx() {
    return (window.RafCore && window.RafCore.cardExportSize) ? window.RafCore.cardExportSize() : CARD_BASE * 2;
  }

  // Deterministic LCG starfield + nebula + gold double border. Returns {cv,x,S}.
  function cardBase(opts) {
    opts = opts || {};
    const CARD_W = cardExportPx();
    const CARD_H = CARD_W;
    const S = CARD_W / CARD_BASE;
    const nebX = opts.nebX == null ? CARD_BASE / 2 : opts.nebX;
    const nebY = opts.nebY == null ? 430 : opts.nebY;
    const nebR = opts.nebR == null ? 520 : opts.nebR;
    const stars = opts.stars == null ? 160 : opts.stars;
    let seed = opts.seed0 == null ? 137 : opts.seed0;
    const cv = document.createElement('canvas');
    const x = (window.RafCore && window.RafCore.prepExportCtx)
      ? window.RafCore.prepExportCtx(cv, CARD_W, CARD_H)
      : (cv.width = CARD_W, cv.height = CARD_H, cv.getContext('2d'));
    x.scale(S, S);

    x.fillStyle = '#050406';
    x.fillRect(0, 0, CARD_BASE, CARD_BASE);
    const neb = x.createRadialGradient(nebX, nebY, 0, nebX, nebY, nebR);
    neb.addColorStop(0, 'rgba(110, 26, 38, 0.22)');
    neb.addColorStop(1, 'transparent');
    x.fillStyle = neb; x.fillRect(0, 0, CARD_BASE, CARD_BASE);

    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < stars; i++) {
      x.fillStyle = `rgba(240,232,216,${0.1 + rnd() * 0.5})`;
      x.beginPath();
      x.arc(rnd() * CARD_BASE, rnd() * CARD_BASE, rnd() * 1.6 + 0.3, 0, Math.PI * 2);
      x.fill();
    }

    x.strokeStyle = 'rgba(201, 162, 39,0.55)';
    x.lineWidth = 2;
    x.strokeRect(46, 46, CARD_BASE - 92, CARD_BASE - 92);
    x.strokeStyle = 'rgba(201, 162, 39,0.22)';
    x.strokeRect(58, 58, CARD_BASE - 116, CARD_BASE - 116);
    return { cv, x, S, CARD_W };
  }

  function cardHeader(x, text, y) {
    x.textAlign = 'center';
    x.fillStyle = '#C9A227';
    x.font = '26px "AstroGlyph", Georgia, serif';
    x.fillText(text, CARD_BASE / 2, y == null ? 130 : y);
  }

  function cardFooter(x, y) {
    x.textAlign = 'center';
    x.fillStyle = '#C9A227';
    x.font = '22px "AstroGlyph", Georgia, serif';
    x.fillText('astroprecise · the instrument', CARD_BASE / 2, y == null ? 1010 : y);
  }

  // Honesty/provenance pill: a dot + label. measured -> gold dot, else silver-blue.
  function honestyBadge(x, cx, y, label, measured) {
    x.font = '20px "AstroGlyph", Georgia, serif';
    const padX = 26, dotGap = 16, dotR = 5;
    const tw = x.measureText(label).width;
    const w = tw + padX * 2 + dotGap + dotR * 2;
    const h = 42, left = cx - w / 2;
    x.beginPath();
    if (x.roundRect) x.roundRect(left, y - h / 2, w, h, h / 2);
    else x.rect(left, y - h / 2, w, h);
    x.fillStyle = 'rgba(20, 16, 10,0.55)';
    x.fill();
    x.lineWidth = 1;
    x.strokeStyle = measured ? 'rgba(201, 162, 39,0.55)' : 'rgba(154,166,200,0.45)';
    x.stroke();
    const dotX = left + padX;
    x.beginPath();
    x.arc(dotX, y, dotR, 0, Math.PI * 2);
    x.fillStyle = measured ? '#C9A227' : '#A89E88';
    x.fill();
    x.textAlign = 'left';
    x.fillStyle = measured ? '#EFE3C0' : '#A89E88';
    x.fillText(label, dotX + dotGap, y + 7);
    x.textAlign = 'center';
  }

  function wrapText(x, text, cx, y, maxW, lineH) {
    const words = String(text).split(/\s+/);
    let line = '', yy = y;
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (x.measureText(test).width > maxW && line) {
        x.fillText(line, cx, yy); line = w; yy += lineH;
      } else line = test;
    }
    if (line) { x.fillText(line, cx, yy); yy += lineH; }
    return yy;
  }

  // Moon disc with a correct terminator for any phase. illum 0..1, waxing => lit
  // on the right limb. Confirmed against canvas arc/ellipse sweep semantics.
  function moonDisc(x, cx, cy, r, illum, waxing) {
    illum = Math.max(0, Math.min(1, illum));
    x.save();
    x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.closePath();
    x.fillStyle = '#11142a'; x.fill();
    x.clip();
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, 'rgba(240,232,216,0.97)');
    g.addColorStop(1, 'rgba(212,201,170,0.80)');
    const tw = r * (1 - 2 * illum);
    x.beginPath();
    x.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2, !waxing); // lit limb semicircle
    const anti = (illum < 0.5) ? waxing : !waxing;        // terminator bulge dir
    x.ellipse(cx, cy, Math.abs(tw), r, 0, Math.PI / 2, -Math.PI / 2, anti);
    x.closePath();
    x.fillStyle = g; x.fill();
    x.restore();
    x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2);
    x.strokeStyle = 'rgba(154,166,200,0.30)'; x.lineWidth = 1; x.stroke();
  }

  // 1080×1080: the named real star at the birth zenith, over a local star patch.
  function drawZenithCard() {
    const S = window.StarCatalog;
    if (!S || !event_) return null;
    const jd = eventJd(event_);
    const z = window.LightCone.zenithStar(jd, event_.lat, event_.lon);
    if (!z) return null;
    const s = z.star;

    const { cv, x } = cardBase({ nebY: 470, nebR: 460 });

    cardHeader(x, '✦  Z E N I T H   S T A R  ✦');

    x.fillStyle = '#A89E88';
    x.font = 'italic 30px "AstroGlyph", Georgia, serif';
    x.fillText('The star over my first breath', CARD_BASE / 2, 196);

    x.fillStyle = '#f0e8d8';
    let nameSize = 96;
    x.font = `bold ${nameSize}px "AstroGlyph", Georgia, serif`;
    while (x.measureText(s.name.toUpperCase()).width > CARD_BASE - 200 && nameSize > 48) {
      nameSize -= 4; x.font = `bold ${nameSize}px "AstroGlyph", Georgia, serif`;
    }
    x.textAlign = 'center';
    x.shadowColor = 'rgba(201, 162, 39,0.55)';
    x.shadowBlur = 24;
    x.fillText(s.name.toUpperCase(), CARD_BASE / 2, 296);
    x.shadowBlur = 0;

    // local star patch: real stars within ±18° of the zenith point
    const panelCy = 540, half = 200, span = 18;
    const wrapDeg = d => ((d + 540) % 360) - 180;
    const panelStars = [];
    for (const st of S.STARS) {
      const dRa = wrapDeg(st.ra - z.zenithRa) * Math.cos(z.zenithDec * Math.PI / 180);
      const dDec = st.dec - z.zenithDec;
      if (Math.abs(dRa) <= span && Math.abs(dDec) <= span) {
        panelStars.push({ st, px: CARD_BASE / 2 + (dRa / span) * half, py: panelCy - (dDec / span) * half });
      }
    }
    x.beginPath();
    x.arc(CARD_BASE / 2, panelCy, half, 0, Math.PI * 2);
    x.strokeStyle = 'rgba(154,166,200,0.12)';
    x.lineWidth = 1; x.stroke();
    x.strokeStyle = 'rgba(201, 162, 39,0.30)';
    x.beginPath();
    x.moveTo(CARD_BASE / 2 - 16, panelCy); x.lineTo(CARD_BASE / 2 + 16, panelCy);
    x.moveTo(CARD_BASE / 2, panelCy - 16); x.lineTo(CARD_BASE / 2, panelCy + 16);
    x.stroke();
    for (const p of panelStars) {
      const isHero = p.st === s;
      const r = Math.max(1.4, 4.2 - p.st.mag * 0.7);
      x.beginPath();
      x.arc(p.px, p.py, isHero ? Math.max(r, 5) : r, 0, Math.PI * 2);
      if (isHero) { x.fillStyle = 'rgba(232,201,106,0.98)'; x.shadowColor = 'rgba(201, 162, 39,0.9)'; x.shadowBlur = 16; }
      else { x.fillStyle = 'rgba(154,166,200,0.55)'; x.shadowBlur = 0; }
      x.fill(); x.shadowBlur = 0;
    }

    x.fillStyle = '#EFE3C0';
    x.font = '30px "AstroGlyph", Georgia, serif';
    const parts = [];
    if (s.con) parts.push(s.con);
    if (s.spectral) parts.push('type ' + s.spectral);
    parts.push('mag ' + s.mag);
    parts.push(s.ly + ' ly');
    x.fillText(parts.join('   ·   '), CARD_BASE / 2, 812);

    x.fillStyle = '#A89E88';
    x.font = '26px "AstroGlyph", Georgia, serif';
    wrapText(x,
      `Nearest catalogued star to the point directly overhead at my birth — ${z.sepDeg.toFixed(1)}° from the exact zenith.`,
      CARD_BASE / 2, 862, CARD_BASE - 220, 38);

    honestyBadge(x, CARD_BASE / 2, 952, 'computed · J2000 catalogue + LST', false);
    cardFooter(x);
    return cv;
  }

  // One-line transit highlight. Prefers the day's strongest oracle aspect.
  function transitHighlightLine(report) {
    try {
      if (window.AstroOracle && event_) {
        const natal = natalFor(event_);
        const ins = window.AstroOracle.getDailyInsight
          ? window.AstroOracle.getDailyInsight(natal, new Date()) : null;
        if (ins && ins.headline) return ins.headline;
      }
    } catch (e) {}
    const t = report.components.transits;
    if (t && t.basis && t.basis !== 'unavailable')
      return report.composite.label + ' — ' + report.composite.summary.split('.')[0] + '.';
    return null;
  }

  // 1080×1080: today's sky postcard. `report` = resolved FieldWeather.assemble(...).
  function drawDailySkyCard(report) {
    if (!report) return null;
    const c = report.components;
    const lunar = c.lunar, wind = c.solarWind, kp = c.kp;

    const { cv, x } = cardBase({ nebY: 380, nebR: 480 });
    cardHeader(x, '✦  D A I L Y   S K Y  ✦');

    const today = new Date(report.generatedAt);
    x.fillStyle = '#A89E88';
    x.font = 'italic 28px "AstroGlyph", Georgia, serif';
    x.textAlign = 'center';
    x.fillText(today.toLocaleDateString(undefined,
      { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }), CARD_BASE / 2, 190);

    // Moon disc (correct terminator for the phase)
    moonDisc(x, CARD_BASE / 2, 400, 130, lunar.illumination, lunar.waxing);

    x.fillStyle = '#f0e8d8';
    x.font = 'bold 54px "AstroGlyph", Georgia, serif';
    x.fillText(lunar.phaseName, CARD_BASE / 2, 622);
    x.fillStyle = '#EFE3C0';
    x.font = '30px "AstroGlyph", Georgia, serif';
    x.fillText(`${Math.round(lunar.illumination * 100)}% illuminated · ${lunar.waxing ? 'waxing' : 'waning'}`, CARD_BASE / 2, 668);

    const tHi = transitHighlightLine(report);
    if (tHi) {
      x.fillStyle = '#A89E88';
      x.font = '27px "AstroGlyph", Georgia, serif';
      wrapText(x, tHi, CARD_BASE / 2, 742, CARD_BASE - 240, 38);
    }

    let swLine, measured;
    if (wind && !wind.unavailable && isFinite(wind.speedKmS)) {
      swLine = `Solar wind ${Math.round(wind.speedKmS)} km/s`;
      if (kp && !kp.unavailable && isFinite(kp.kp)) swLine += ` · Kp ${kp.kp.toFixed(1)}`;
      measured = true;
    } else if (kp && !kp.unavailable && isFinite(kp.kp)) {
      swLine = `Geomagnetic Kp ${kp.kp.toFixed(1)} — ${kp.band ? kp.band.label : ''}`.trim();
      measured = true;
    } else {
      swLine = 'Live space-weather feed unreachable — not faked';
      measured = false;
    }
    x.fillStyle = measured ? '#EFE3C0' : '#A89E88';
    x.font = '30px "AstroGlyph", Georgia, serif';
    x.fillText(swLine, CARD_BASE / 2, 858);

    honestyBadge(x, CARD_BASE / 2, 942, measured ? 'measured · NOAA SWPC' : 'computed only · feed down', measured);
    cardFooter(x);
    return cv;
  }

  // Zenith card download — synchronous (catalogue + computed point only)
  function wireZenithCardBtn() {
    const btn = document.getElementById('zenith-card-btn');
    if (!btn || btn.dataset.wired) return;
    btn.dataset.wired = '1';
    btn.addEventListener('click', () => {
      const cv = drawZenithCard();
      if (!cv) { if (window.AstroApp) AstroApp.showToast('Unavailable', 'Set a birth event first.', 'error'); return; }
      const a = document.createElement('a');
      a.download = 'my-zenith-star.png';
      a.href = cv.toDataURL('image/png');
      a.click();
    });
  }

  // Daily Sky card download — async: pulls a fresh live space-weather snapshot
  function wireDailySkyCardBtn() {
    const btn = document.getElementById('dailysky-card-btn');
    if (!btn || btn.dataset.wired) return;
    btn.dataset.wired = '1';
    btn.addEventListener('click', async () => {
      const label = btn.textContent;
      btn.disabled = true; btn.textContent = 'Reading the live sky…';
      try {
        const natal = event_ ? natalFor(event_) : null;
        const report = await window.FieldWeather.assemble(natal, new Date());
        const cv = drawDailySkyCard(report);
        if (cv) {
          const a = document.createElement('a');
          a.download = 'daily-sky-' + new Date().toISOString().slice(0, 10) + '.png';
          a.href = cv.toDataURL('image/png');
          a.click();
        }
      } catch (e) {
        if (window.AstroApp) AstroApp.showToast('Could not build card', e.message || String(e), 'error');
      } finally {
        btn.disabled = false; btn.textContent = label;
      }
    });
  }

  // ── Section 2: Zenith star ────────────────────────────────────────────────

  function renderZenith() {
    const out = document.getElementById('zenith-out');
    const jd = eventJd(event_);
    const z = window.LightCone.zenithStar(jd, event_.lat, event_.lon);
    if (!z) { out.innerHTML = '<p class="grimoire">Catalog unavailable.</p>'; return; }
    const s = z.star;
    const birth = eventDateUTC(event_);
    const ageYears = (Date.now() - birth.getTime()) / (365.25 * 86400000);
    const lightNow = s.ly; // years for light leaving the star now to arrive
    const lifetimeNote = lightNow <= Math.max(0, 95 - ageYears)
      ? `Light leaving ${s.name} <em>tonight</em> will reach Earth in ${fmtNum(lightNow)} years — within a long human lifetime. Some of it may arrive while you are still here to see it.`
      : `Light leaving ${s.name} tonight will take ${fmtNum(lightNow)} years to arrive — it travels beyond your horizon, a message for whoever comes after.`;

    let tonight = '';
    try {
      const aa = window.StarCatalog.altAzNow(s, event_.lat, event_.lon, new Date());
      tonight = aa.alt > 0
        ? `Right now it stands <span class="data-mono">${aa.alt.toFixed(0)}°</span> above your horizon, bearing
           <span class="data-mono">${aa.az.toFixed(0)}°</span> (${compass(aa.az)}). You can go outside and find it.`
        : `Right now it is below your horizon (${aa.alt.toFixed(0)}°) — it will rise again; the sky turns every 23 h 56 m.`;
    } catch (e) {}

    out.innerHTML = `
      <div class="daimon-card">
        <p class="instrument-eyebrow">Your star</p>
        <p class="daimon-name">${s.name}</p>
        <p class="daimon-epithet">${s.bayer ? s.bayer + ' · ' : ''}${s.con || ''} · ${s.spectral || '—'} · magnitude ${s.mag}</p>
        <div style="margin-top:var(--space-5);" class="grimoire">
          <p>At your birth minute it sat ${z.sepDeg.toFixed(1)}° from your exact zenith
          (zenith: RA ${z.zenithRa.toFixed(1)}°, Dec ${z.zenithDec.toFixed(1)}°) —
          the nearest catalogued star to the point directly above your first breath.</p>
          <p>${s.fact ? s.fact + ' ' : ''}It is <span class="data-mono">${s.ly}</span> light-years away.
          The light it shed on the night you were born left its surface around
          <span class="data-mono">${Math.round(birth.getFullYear() - s.ly)}</span>.</p>
          <p>${lifetimeNote}</p>
          <p>${tonight}</p>
        </div>
      </div>`;
  }

  function compass(az) {
    const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
    return dirs[Math.round(az / 22.5) % 16];
  }

  // ── Section 3: Echo dates ─────────────────────────────────────────────────

  // The scan is deterministic per birth event + scan-start month, so cache it.
  const ECHO_CACHE_KEY = 'ap_echo_cache';

  function echoCacheId() {
    const monthStamp = new Date().toISOString().slice(0, 7);
    return `${event_.dt}|${event_.lat}|${event_.lon}|${monthStamp}`;
  }

  function loadEchoCache() {
    try {
      const c = JSON.parse(localStorage.getItem(ECHO_CACHE_KEY));
      if (c && c.id === echoCacheId()) {
        return c.echoes.map(e2 => ({ ...e2, date: new Date(e2.date) }));
      }
    } catch (e) {}
    return null;
  }

  function saveEchoCache(echoes) {
    try {
      localStorage.setItem(ECHO_CACHE_KEY, JSON.stringify({
        id: echoCacheId(),
        echoes: echoes.map(e2 => ({ ...e2, date: e2.date.toISOString() })),
      }));
    } catch (e) {}
  }

  document.getElementById('echo-scan').addEventListener('click', async () => {
    const btn = document.getElementById('echo-scan');
    const prog = document.getElementById('echo-progress');
    const pct = document.getElementById('echo-pct');
    const out = document.getElementById('echo-out');
    btn.disabled = true; prog.hidden = false; out.innerHTML = '';

    let echoes = loadEchoCache();
    if (!echoes) {
      const natal = natalFor(event_);
      echoes = await window.EchoDates.scan(natal, {
        years: 5, count: 5,
        onProgress: p => { pct.textContent = Math.round(p * 100) + '%'; },
      });
      saveEchoCache(echoes);
    }
    prog.hidden = true; btn.disabled = false;

    if (!echoes.length) { out.innerHTML = '<p class="grimoire">The scan found no clean resonances — rare, but the sky owes us nothing.</p>'; return; }
    out.innerHTML = echoes.map(e2 => `
      <div class="echo-window">
        <div>
          <div class="data-mono" style="font-size:1.05rem;">${e2.date.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</div>
          <div style="font-size:0.68rem;color:var(--silver-dim);letter-spacing:0.1em;margin-top:2px;">
            ${e2.chord.length ? 'In chord: ' + e2.chord.join(' · ') : 'broad resonance'}</div>
        </div>
        <div></div>
        <div style="text-align:right;">
          <div class="resonance-meter"><span style="width:${e2.resonance}%"></span></div>
          <div style="font-size:0.66rem;color:var(--gold-pale);margin-top:4px;letter-spacing:0.08em;">${e2.resonance}% resonance</div>
        </div>
      </div>`).join('') +
      `<p style="font-size:0.72rem;color:var(--silver-dim);margin-top:var(--space-3);">
        Resonance = weighted closeness of the seven classical planets to their natal longitudes.
        100% would be the birth moment itself; the outer planets guarantee it is never reached again.</p>`;
  });

  // ── Section 4: The Daimon ─────────────────────────────────────────────────

  function renderDaimonIdentity() {
    if (!window.Daimon) return;
    const natal = natalFor(event_);
    const d = window.Daimon.summon(natal);
    document.getElementById('daimon-identity').innerHTML = `
      <div class="daimon-card">
        <p class="instrument-eyebrow">Summoned from your chart</p>
        <p class="daimon-name">${d.name}</p>
        <p class="daimon-epithet">${d.epithet}</p>
        <p class="grimoire" style="margin-top:var(--space-4);font-size:1.05rem;">${d.temperament}</p>
      </div>`;
  }

  document.getElementById('daimon-read').addEventListener('click', () => {
    if (!window.Daimon) return;
    const btn = document.getElementById('daimon-read');
    const status = document.getElementById('daimon-status');
    btn.disabled = true; status.textContent = 'The daimon is reading the sky…';
    setTimeout(() => {
      try {
        const natal = natalFor(event_);
        const alive = document.getElementById('alive-text').value.trim() || null;
        const r = window.Daimon.compose(natal, { aliveText: alive, date: new Date() });
        const el = document.getElementById('daimon-reading');
        el.innerHTML =
          `<h3 style="font-family:var(--font-display);color:var(--gold-pale);letter-spacing:0.06em;margin-bottom:var(--space-4);">${r.title}</h3>` +
          r.sections.map(s => `<h4>${s.heading}</h4>` + s.paragraphs.map(p => `<p>${p}</p>`).join('')).join('') +
          `<div style="border:1px solid rgba(201, 162, 39,0.3);border-radius:var(--radius-lg);padding:var(--space-5);margin-top:var(--space-6);background:rgba(20, 16, 10,0.4);">
            <p class="instrument-eyebrow" style="margin-bottom:var(--space-2);">The question</p>
            <p style="font-style:italic;font-size:1.25rem;">${r.question}</p>
          </div>`;
        document.getElementById('daimon-answer-box').hidden = false;
        status.textContent = r.wordCount + ' words · composed from today\'s sky and your history';
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // Web Speech API — speak button if supported
        const speakWrap = document.getElementById('daimon-speak-wrap');
        if (speakWrap && window.speechSynthesis) {
          const plainText = [r.title,
            ...r.sections.flatMap(s => [s.heading, ...s.paragraphs]),
            r.question
          ].join('.\n');
          speakWrap.hidden = false;
          const speakBtn = document.getElementById('daimon-speak-btn');
          const stopBtn  = document.getElementById('daimon-stop-btn');
          speakBtn.onclick = () => {
            window.speechSynthesis.cancel();
            const utt = new SpeechSynthesisUtterance(plainText);
            utt.rate = 0.88; utt.pitch = 0.95;
            const voices = window.speechSynthesis.getVoices();
            const pref = voices.find(v => /female|samantha|serena|moira|tessa|fiona/i.test(v.name));
            if (pref) utt.voice = pref;
            utt.onend = () => { speakBtn.disabled = false; stopBtn.disabled = true; };
            speakBtn.disabled = true; stopBtn.disabled = false;
            window.speechSynthesis.speak(utt);
          };
          stopBtn.onclick = () => {
            window.speechSynthesis.cancel();
            speakBtn.disabled = false; stopBtn.disabled = true;
          };
          stopBtn.disabled = true;
        }
      } catch (err) {
        status.textContent = 'The daimon could not be reached: ' + (err.message || err);
      }
      btn.disabled = false;
    }, 600);
  });

  document.getElementById('daimon-answer-send').addEventListener('click', () => {
    const t = document.getElementById('daimon-answer').value.trim();
    if (!t || !window.Daimon) return;
    window.Daimon.answer(t);
    document.getElementById('daimon-answer').value = '';
    document.getElementById('daimon-answer-box').hidden = true;
    if (window.AstroApp) AstroApp.showToast('Received', 'The daimon will remember.', 'success');
  });

  // ── Section 5: Quantum draw ───────────────────────────────────────────────

  const SIGILS = (() => {
    const planets = [
      ['☉', 'Sun', 'what is central'], ['☽', 'Moon', 'what is felt'],
      ['☿', 'Mercury', 'what is said'], ['♀', 'Venus', 'what is loved'],
      ['♂', 'Mars', 'what is fought for'], ['♃', 'Jupiter', 'what is growing'],
      ['♄', 'Saturn', 'what is owed'], ['⚷', 'Chiron', 'what is healing'],
    ];
    const modes = [
      ['rising', 'is gathering strength — meet it early'],
      ['burning', 'is at full intensity — do not look away'],
      ['turning', 'is changing direction — release the old course'],
      ['hidden', 'works beneath the surface — trust what you cannot yet see'],
      ['weighed', 'asks for an honest accounting'],
      ['offered', 'arrives as a gift with a condition'],
      ['echoing', 'repeats until it is finally heard'],
      ['sealed', 'completes itself — let it close'],
    ];
    const out = [];
    for (const [g, p, theme] of planets)
      for (const [mode, line] of modes)
        out.push({ glyph: g, name: `${p} ${mode.charAt(0).toUpperCase() + mode.slice(1)}`, line: `${theme.charAt(0).toUpperCase() + theme.slice(1)} ${line}.` });
    return out;
  })();

  async function quantumByte() {
    // ANU QRNG — true vacuum-fluctuation randomness; CORS/key-limited, so fail soft
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 4000);
      const res = await fetch('https://qrng.anu.edu.au/API/jsonI.php?length=1&type=uint8', { signal: ctl.signal });
      clearTimeout(t);
      if (res.ok) {
        const j = await res.json();
        if (j && j.success && j.data && j.data.length) {
          return { byte: j.data[0], quantum: true };
        }
      }
    } catch (e) { /* fall through */ }
    const b = new Uint8Array(1);
    crypto.getRandomValues(b);
    return { byte: b[0], quantum: false };
  }

  document.getElementById('q-draw').addEventListener('click', async () => {
    const btn = document.getElementById('q-draw');
    btn.disabled = true;
    const { byte, quantum } = await quantumByte();
    const sig = SIGILS[byte % SIGILS.length];
    document.getElementById('q-sigil').textContent = sig.glyph;
    document.getElementById('q-name').textContent = sig.name;
    document.getElementById('q-line').textContent = sig.line;
    const prov = document.getElementById('q-prov');
    if (quantum) {
      prov.innerHTML = '<span class="src-measured">Collapsed from quantum vacuum fluctuation · ANU QRNG</span><br/><span style="color:var(--silver-dim)">The value did not exist until the moment you asked.</span>';
    } else {
      prov.innerHTML = '<span class="src-computed">Drawn from your device\'s hardware entropy</span><br/><span style="color:var(--silver-dim)">The quantum feed was unreachable — we tell you rather than pretend.</span>';
    }
    document.getElementById('q-out').hidden = false;
    btn.disabled = false;
  });

  // ── Section 6: Consciousness weather ──────────────────────────────────────

  // Tap-to-explain copy. Each ends by stating that (and by whom) the value is
  // measured — the honesty rule, in plain language.
  const CW_EXPLAIN = {
    kp: {
      title: 'The Kp index',
      body: 'Kp is a planet-wide pulse-check on Earth\'s magnetic field, scored 0 (glassy calm) to 9 (full geomagnetic storm). It rises when the solar wind shakes the magnetosphere hard enough to light auroras and nudge compasses. Treat it as the sea-state of the sky, not an omen.',
      src: 'Measured every 3 hours by a network of ground magnetometers, reported by NOAA SWPC.'
    },
    wind: {
      title: 'Solar wind speed',
      body: 'The Sun is always exhaling — a thin plasma streaming past Earth at roughly 300 to 800 kilometres every second. Faster wind hits the magnetosphere harder, so a rising number means a louder field. The sparkline is the last seven days of that breath.',
      src: 'Measured at the L1 point, a million miles sunward, by NOAA / NASA\'s DSCOVR spacecraft.'
    },
    bz: {
      title: 'The Bz component',
      body: 'Bz is the north–south tilt of the Sun\'s magnetic field as it arrives on the wind. When it points north it deflects; when it turns southward (negative) it latches onto Earth\'s field and pours energy in — the real trigger behind storms and aurora. Southward Bz is the door held open.',
      src: 'Measured at the L1 point by DSCOVR\'s magnetometer, reported by NOAA SWPC.'
    },
    flares: {
      title: 'Solar flares',
      body: 'A flare is a sudden flash of X-rays from the Sun, graded by letter — A, B, C, M, X — each step ten times brighter than the last. Big flares can ruffle radio and GPS within minutes of the light reaching us. We show the largest of the last day, and what\'s burning right now.',
      src: 'Measured continuously by the GOES satellites\' X-ray sensors, reported by NOAA SWPC.'
    },
    f107: {
      title: 'F10.7 solar flux',
      body: 'F10.7 is the Sun\'s brightness at a 10.7 cm radio wavelength, given in solar flux units — a steady, weather-proof gauge of how active the Sun is overall. It climbs and falls with the eleven-year sunspot cycle, a slow tide under the daily chop. Higher means a busier Sun.',
      src: 'Measured daily by the Dominion Radio Astrophysical Observatory, distributed by NOAA SWPC.'
    }
  };

  // Tiny inline-SVG sparkline path builder. Deterministic: same series ->
  // identical path string. Returns '' for <2 finite points.
  function sparkPath(series, w, h, pad) {
    pad = pad == null ? 1 : pad;
    const vals = (series || []).filter(function (v) { return isFinite(v); });
    if (vals.length < 2) return '';
    let min = Infinity, max = -Infinity;
    for (let i = 0; i < vals.length; i++) { if (vals[i] < min) min = vals[i]; if (vals[i] > max) max = vals[i]; }
    const span = (max - min) || 1;
    const innerW = w - pad * 2, innerH = h - pad * 2;
    let d = '';
    for (let i = 0; i < vals.length; i++) {
      const x = pad + (i / (vals.length - 1)) * innerW;
      const y = pad + (1 - (vals[i] - min) / span) * innerH; // invert: high = up
      d += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1) + ' ';
    }
    return d.trim();
  }

  // Zero baseline y for a series (for the Bz green-above/red-below split).
  function sparkZeroY(series, h, pad) {
    pad = pad == null ? 1 : pad;
    const vals = (series || []).filter(function (v) { return isFinite(v); });
    if (!vals.length) return null;
    let min = Infinity, max = -Infinity;
    for (let i = 0; i < vals.length; i++) { if (vals[i] < min) min = vals[i]; if (vals[i] > max) max = vals[i]; }
    const span = (max - min) || 1;
    return pad + (1 - (0 - min) / span) * (h - pad * 2);
  }

  function sparkline(series, cls) {
    const W = 96, H = 26;
    const d = sparkPath(series, W, H, 1);
    if (!d) return '<span class="cw-spark cw-spark--empty">no series</span>';
    const zeroY = sparkZeroY(series, H, 1);
    const baseline = (zeroY != null && zeroY > 0 && zeroY < H)
      ? '<line class="cw-spark__zero" x1="0" y1="' + zeroY.toFixed(1) + '" x2="' + W + '" y2="' + zeroY.toFixed(1) + '"/>'
      : '';
    return '<svg class="cw-spark ' + (cls || '') + '" viewBox="0 0 ' + W + ' ' + H +
      '" preserveAspectRatio="none" aria-hidden="true" focusable="false">' +
      baseline +
      '<path class="cw-spark__line" d="' + d + '" fill="none" vector-effect="non-scaling-stroke"/></svg>';
  }

  // Kp gauge: a 0-9 banded 180° arc with a needle.
  function kpGauge(kp) {
    const W = 150, H = 86, cx = 75, cy = 78, r = 62;
    function pt(frac) {
      const a = Math.PI - frac * Math.PI;
      return [cx + r * Math.cos(a), cy - r * Math.sin(a)];
    }
    function arc(f0, f1) {
      const a = pt(f0), b = pt(f1);
      return 'M' + a[0].toFixed(1) + ' ' + a[1].toFixed(1) +
             ' A' + r + ' ' + r + ' 0 0 1 ' + b[0].toFixed(1) + ' ' + b[1].toFixed(1);
    }
    const bands =
      '<path class="cw-gauge__band cw-gauge__band--quiet" d="' + arc(0, 3 / 9) + '" />' +
      '<path class="cw-gauge__band cw-gauge__band--unsettled" d="' + arc(3 / 9, 5 / 9) + '" />' +
      '<path class="cw-gauge__band cw-gauge__band--storm" d="' + arc(5 / 9, 1) + '" />';
    const frac = Math.max(0, Math.min(1, kp / 9));
    const tip = pt(frac);
    const needle = '<line class="cw-gauge__needle" x1="' + cx + '" y1="' + cy +
      '" x2="' + tip[0].toFixed(1) + '" y2="' + tip[1].toFixed(1) + '" />' +
      '<circle class="cw-gauge__hub" cx="' + cx + '" cy="' + cy + '" r="3.5" />';
    return '<svg class="cw-gauge" viewBox="0 0 ' + W + ' ' + H +
      '" role="img" aria-label="Kp index ' + kp.toFixed(1) + ' of 9">' +
      bands + needle +
      '<text class="cw-gauge__lo" x="13" y="84">0</text>' +
      '<text class="cw-gauge__hi" x="137" y="84">9</text>' +
      '<text class="cw-gauge__val" x="' + cx + '" y="58">' + kp.toFixed(1) + '</text></svg>';
  }

  function provClass(src, unavailable) {
    if (unavailable) return 'src-unavailable';
    return (src && src.indexOf('measured') !== -1) ? 'src-measured' : 'src-computed';
  }

  function info(key) {
    return '<button type="button" class="cw-info" data-explain="' + key +
      '" aria-label="Explain this measurement" aria-expanded="false">i</button>';
  }

  async function renderWeather() {
    const out = document.getElementById('weather-out');
    try {
      const natal = event_ ? natalFor(event_) : null;
      const w = await window.FieldWeather.assemble(natal, new Date());
      const c = w.components;

      const comp = w.composite;
      const scoreHtml = (comp.score == null)
        ? '<span style="font-size:1.4rem;">&mdash;</span>'
        : comp.score + '<span style="font-size:1rem;color:var(--silver-dim);">/100</span>';
      let html =
        '<div class="daimon-card" style="text-align:center;">' +
          '<p class="instrument-eyebrow">Composite field</p>' +
          '<p style="font-family:var(--font-display);font-size:2.4rem;color:var(--gold-pale);">' + scoreHtml + '</p>' +
          '<p class="daimon-epithet" style="font-size:1.2rem;">' + comp.label + '</p>' +
          '<p class="grimoire" style="font-size:1.05rem;max-width:520px;margin:var(--space-4) auto 0;">' + comp.summary + '</p>' +
          (comp.provenance ? '<p style="font-size:0.62rem;letter-spacing:0.12em;text-transform:uppercase;color:var(--silver-dim);margin-top:var(--space-3);">' + comp.provenance + '</p>' : '') +
        '</div>';

      html += '<div class="cw-grid">';

      // Kp gauge
      if (c.kp.unavailable) {
        html += cwTile('Geomagnetic', 'kp', '<p class="cw-unavail">Kp index unavailable — feed unreachable.</p>', c.kp.source, true);
      } else {
        html += cwTile('Geomagnetic', 'kp',
          kpGauge(c.kp.kp) +
          '<p class="cw-readout"><span class="cw-readout__big">Kp ' + c.kp.kp.toFixed(1) + '</span> &middot; ' + c.kp.band.label + '</p>' +
          '<p class="cw-note">' + c.kp.band.note + '</p>',
          c.kp.source);
      }

      // Solar wind speed + sparkline
      if (c.solarWind.unavailable) {
        html += cwTile('Solar wind', 'wind', '<p class="cw-unavail">Solar-wind plasma unavailable — feed unreachable.</p>', c.solarWind.source, true);
      } else {
        const dens = (isFinite(c.solarWind.density) && c.solarWind.density != null)
          ? ' &middot; ' + c.solarWind.density.toFixed(1) + ' p/cm³' : '';
        html += cwTile('Solar wind', 'wind',
          '<p class="cw-readout"><span class="cw-readout__big">' + Math.round(c.solarWind.speedKmS) +
            '</span><span class="cw-unit"> km/s</span>' + dens + '</p>' +
          '<div class="cw-spark-wrap">' + sparkline(c.solarWind.series, 'cw-spark--wind') +
            '<span class="cw-spark-cap">7-day speed</span></div>',
          c.solarWind.source);
      }

      // Bz indicator + sparkline
      if (c.bz.unavailable) {
        html += cwTile('Magnetic field (Bz)', 'bz', '<p class="cw-unavail">Interplanetary Bz unavailable — feed unreachable.</p>', c.bz.source, true);
      } else {
        const south = c.bz.bz < 0;
        const arrow = '<span class="cw-bz-arrow ' + (south ? 'cw-bz-arrow--south' : 'cw-bz-arrow--north') + '" aria-hidden="true">' +
          (south ? '↓' : '↑') + '</span>';
        const word = south ? '<span class="cw-bz-south">southward</span>' : '<span class="cw-bz-north">northward</span>';
        html += cwTile('Magnetic field (Bz)', 'bz',
          '<p class="cw-readout">' + arrow +
            '<span class="cw-readout__big">' + c.bz.bz.toFixed(1) + '</span><span class="cw-unit"> nT</span> &middot; ' + word + '</p>' +
          '<div class="cw-spark-wrap">' + sparkline(c.bz.series, 'cw-spark--bz') +
            '<span class="cw-spark-cap">7-day Bz</span></div>',
          c.bz.source);
      }

      // Flare badge
      if (c.flares.unavailable) {
        html += cwTile('Solar flares', 'flares', '<p class="cw-unavail">GOES X-ray flux unavailable — feed unreachable.</p>', c.flares.source, true);
      } else {
        const cls = (c.flares.max24h || 'A0')[0];
        html += cwTile('Solar flares', 'flares',
          '<p class="cw-readout"><span class="cw-flare-badge cw-flare-badge--' + cls + '">' + c.flares.max24h + '</span></p>' +
          '<p class="cw-note">Largest flare, last 24h. Now: ' + c.flares.current + '.</p>',
          c.flares.source);
      }

      // F10.7 chip
      if (c.f107.unavailable) {
        html += cwTile('Solar flux (F10.7)', 'f107', '<p class="cw-unavail">F10.7 flux unavailable — feed unreachable.</p>', c.f107.source, true);
      } else {
        html += cwTile('Solar flux (F10.7)', 'f107',
          '<p class="cw-readout"><span class="cw-chip">' + Math.round(c.f107.sfu) + ' <small>sfu</small></span></p>' +
          '<p class="cw-note">10.7 cm radio flux — the standard proxy for solar activity.</p>',
          c.f107.source);
      }

      html += '</div>'; // .cw-grid

      // Computed companions kept as honest field-rows
      html += '<div class="cw-rows">';
      html += row('Moon', c.lunar.phaseName + ' &middot; ' + Math.round(c.lunar.illumination * 100) + '% lit', c.lunar.source);
      html += row('Transits', c.transits.basis === 'natal' ? 'personal — weighed against your chart' : 'sky weather (set the event above to personalise)', c.transits.source);
      html += row('Schumann', 'unavailable', c.schumann.source, true);
      html += '</div>';

      // Aurora-at-your-latitude (only when an event/location is set)
      html += '<div id="cw-aurora" class="cw-aurora" hidden></div>';

      // Popover host (single, repositioned per tap)
      html += '<div id="cw-pop" class="cw-pop" role="dialog" aria-live="polite" hidden>' +
        '<button type="button" class="cw-pop__close" aria-label="Close">×</button>' +
        '<p class="cw-pop__title"></p><p class="cw-pop__body"></p>' +
        '<p class="cw-pop__src"></p></div>';

      out.innerHTML = html;
      wireExplainers(out);
      maybeRenderAurora();
    } catch (e) {
      out.innerHTML = '<p class="grimoire">The field instruments could not be read: ' + (e.message || e) + '</p>';
    }

    function row(label, value, src, unavailable) {
      const cls = unavailable ? 'src-unavailable' : (src.indexOf('measured') !== -1 ? 'src-measured' : 'src-computed');
      return '<div class="field-row">' +
        '<span class="field-row__label">' + label + '</span>' +
        '<span class="field-row__value">' + value + '</span>' +
        '<span class="field-row__src ' + cls + '">' + src + '</span></div>';
    }

    function cwTile(title, key, body, src, unavailable) {
      const pc = provClass(src, unavailable);
      return '<div class="cw-tile glass-card glass-card--flat">' +
        '<div class="cw-tile__head">' +
          '<span class="cw-tile__title">' + title + '</span>' + info(key) +
        '</div>' +
        '<div class="cw-tile__body">' + body + '</div>' +
        '<span class="field-row__src ' + pc + ' cw-tile__src">' + src + '</span></div>';
    }
  }

  // Aurora line: only when an event/location exists. Uses getAuroraAt on demand.
  async function maybeRenderAurora() {
    const host = document.getElementById('cw-aurora');
    if (!host) return;
    const loc = event_ && isFinite(event_.lat) && isFinite(event_.lon) ? event_ : null;
    if (!loc) return; // no event/location set — show nothing (honest: we don't know where you are)
    host.hidden = false;
    host.innerHTML = '<span class="cw-aurora__label">Aurora at your latitude</span>' +
      '<span class="cw-aurora__val">measuring…</span>';
    try {
      const a = await window.FieldWeather.getAuroraAt(loc.lat, loc.lon);
      const p = (a.probability == null) ? null : Math.round(a.probability);
      const valTxt = (p == null)
        ? 'outside the model grid'
        : p + '% chance of visible aurora overhead';
      host.innerHTML =
        '<span class="cw-aurora__label">Aurora at ' + loc.lat.toFixed(1) + '°, ' + loc.lon.toFixed(1) + '°</span>' +
        '<span class="cw-aurora__val">' + valTxt + '</span>' +
        '<span class="field-row__src src-measured cw-aurora__src">' + a.source + '</span>';
    } catch (e) {
      host.innerHTML =
        '<span class="cw-aurora__label">Aurora at your latitude</span>' +
        '<span class="cw-aurora__val">unavailable</span>' +
        '<span class="field-row__src src-unavailable cw-aurora__src">NOAA SWPC / OVATION (feed unreachable)</span>';
    }
  }

  // Tap-to-explain wiring. One shared popover, positioned under the tapped button.
  function wireExplainers(root) {
    const pop = root.querySelector('#cw-pop');
    if (!pop) return;
    const titleEl = pop.querySelector('.cw-pop__title');
    const bodyEl = pop.querySelector('.cw-pop__body');
    const srcEl = pop.querySelector('.cw-pop__src');
    let openBtn = null;

    function close() {
      pop.hidden = true;
      if (openBtn) { openBtn.setAttribute('aria-expanded', 'false'); openBtn = null; }
    }
    function open(btn) {
      const key = btn.getAttribute('data-explain');
      const e = CW_EXPLAIN[key];
      if (!e) return;
      titleEl.textContent = e.title;
      bodyEl.textContent = e.body;
      srcEl.textContent = e.src;
      pop.hidden = false;
      const br = btn.getBoundingClientRect();
      const hr = root.getBoundingClientRect();
      pop.style.top = (br.bottom - hr.top + 8) + 'px';
      let left = br.left - hr.left;
      const maxLeft = root.clientWidth - pop.offsetWidth - 8;
      if (left > maxLeft) left = maxLeft;
      if (left < 8) left = 8;
      pop.style.left = left + 'px';
      btn.setAttribute('aria-expanded', 'true');
      openBtn = btn;
    }

    root.querySelectorAll('.cw-info').forEach(function (btn) {
      btn.addEventListener('click', function (ev) {
        ev.stopPropagation();
        if (openBtn === btn) { close(); return; }
        open(btn);
      });
    });
    pop.querySelector('.cw-pop__close').addEventListener('click', close);
    pop.addEventListener('click', function (ev) { ev.stopPropagation(); });
    document.addEventListener('click', close);
    document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') close(); });
  }

  // ── Section 7: Precession layer ───────────────────────────────────────────

  const FRAME_TEXT = {
    tropical: 'The tropical zodiac is anchored to the seasons, not the stars: 0° Aries is defined as the northern spring equinox, wherever the constellations have drifted. It measures Earth\'s relationship to the Sun — a calendar of light. This is the frame Western astrology uses, and the frame everything else on this site uses by default.',
    sidereal: 'The sidereal zodiac stays with the stars. Because Earth\'s axis wobbles (one full circle every ~25,772 years), the two zodiacs have drifted about 24° apart since they agreed around 285 CE. Vedic astrology uses this frame. Notice: your Sun sign probably changes. Neither frame is wrong — they measure different things.',
    raw: 'The raw astronomical sky ignores zodiac bookkeeping entirely. The Sun\'s path crosses thirteen constellations of wildly unequal size — including Ophiuchus, which no zodiac admits — and the constellation boundaries are administrative lines drawn by the IAU in 1928. Astrology is a coordinate system laid over this sky, not a property of it. We think you can be trusted with that.',
  };

  function renderFrame(frame) {
    document.getElementById('frame-explain').textContent = FRAME_TEXT[frame];
    const tbl = document.getElementById('frame-table');
    if (frame === 'raw') { tbl.innerHTML = ''; return; }
    // ayanamsha (Lahiri): ~23.853° at J2000, drifting +50.29″/yr
    const now = new Date();
    const yearFrac = now.getFullYear() + now.getMonth() / 12;
    const ayan = 23.853 + (yearFrac - 2000) * (50.29 / 3600);
    const jd = E().julianDay(now.getFullYear(), now.getMonth() + 1, now.getDate(),
                             now.getHours(), now.getMinutes(), 0);
    const planets = [
      ['Sun', '☉', E().sunPosition(jd).lon], ['Moon', '☽', E().moonPosition(jd).lon],
      ['Mercury', '☿', E().mercuryPosition(jd).lon], ['Venus', '♀', E().venusPosition(jd).lon],
      ['Mars', '♂', E().marsPosition(jd).lon], ['Jupiter', '♃', E().jupiterPosition(jd).lon],
      ['Saturn', '♄', E().saturnPosition(jd).lon],
    ];
    tbl.innerHTML = planets.map(([name, glyph, lon]) => {
      const adj = frame === 'sidereal' ? ((lon - ayan) % 360 + 360) % 360 : lon;
      const sign = E().signOf(adj);
      const deg = Math.floor(adj % 30);
      return `<div class="field-row">
        <span class="field-row__label">${glyph} ${name}</span>
        <span class="field-row__value">${sign} ${deg}°</span>
        <span class="field-row__src src-computed">${frame}${frame === 'sidereal' ? ` · ayanāṁśa ${ayan.toFixed(2)}°` : ''}</span>
      </div>`;
    }).join('');
  }

  document.querySelectorAll('.precession-toggle .glow-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.precession-toggle .glow-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderFrame(btn.dataset.frame);
    });
  });

  // ── Section 8: Time travel ────────────────────────────────────────────────

  function initTimeTravel() {
    const canvas = document.getElementById('tt-canvas');
    if (window.Orrery3D && canvas) window.Orrery3D.init(canvas);

    document.getElementById('tt-go').addEventListener('click', () => {
      const v = document.getElementById('tt-datetime').value;
      if (!v) return;
      window.Orrery3D.goTo(new Date(v));
    });

    document.getElementById('tt-read').addEventListener('click', () => {
      const v = document.getElementById('tt-datetime').value;
      const date = v ? new Date(v) : new Date();
      try {
        const ins = window.AstroOracle.getDailyInsight(null, date);
        const dstr = date.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
        document.getElementById('tt-reading').innerHTML =
          `<h4>The sky over ${dstr}</h4>
           <p><strong>${ins.headline}.</strong> ${ins.body}</p>
           <p>${ins.transits.slice(0, 3).map(t => t.text).join(' ')}</p>
           <p style="font-size:0.95rem;color:var(--silver);">Keywords of that sky: ${ins.keywords.join(' · ')}.
           This reading describes the heavens themselves; set the event above and ask the daimon to weigh a moment against your chart.</p>`;
      } catch (e) {}
    });
  }

  // ── Natal signature (planets + Life Path) ─────────────────────────────────
  // Rendered here (not in an inline page script) so it uses the event's real
  // IANA timezone + birthplace via natalFor(), and runs for the example event.

  function renderNatalSignature() {
    const sig = document.getElementById('sec-natal-signature');
    const grid = document.getElementById('natal-sig-grid');
    if (!sig || !grid || !event_) return;

    const sumDigits = n => String(Math.abs(n)).split('').reduce((a, d) => a + parseInt(d, 10), 0);
    const reduce = n => { while (n > 9 && n !== 11 && n !== 22 && n !== 33) n = sumDigits(n); return n; };
    const LP_TITLES = { 1:'Pioneer',2:'Diplomat',3:'Creator',4:'Builder',5:'Explorer',6:'Nurturer',7:'Seeker',8:'Achiever',9:'Humanitarian',11:'Illuminator',22:'Master Builder',33:'Master Teacher' };

    // Life Path uses the civil birth DATE the visitor entered (timezone-independent).
    const [y, m, d] = event_.dt.split('T')[0].split('-').map(Number);
    const lp = reduce(reduce(m) + reduce(d) + reduce(sumDigits(y)));
    const title = LP_TITLES[lp] || '';

    const link = document.getElementById('natal-lifepath-link');
    if (link) {
      link.href = 'lifepath.html?date=' + event_.dt.split('T')[0];
      link.textContent = '✦ Life Path ' + lp + ' — ' + title + ' →';
    }

    const items = [];
    // Planets from the timezone- and location-correct natal chart.
    const raw = natalFor(event_);
    if (raw && raw.positions) {
      const PLANETS = [
        { k:'sun', g:'☉', n:'Sun' }, { k:'moon', g:'☽', n:'Moon' },
        { k:'mercury', g:'☿', n:'Mercury' }, { k:'venus', g:'♀', n:'Venus' },
        { k:'mars', g:'♂', n:'Mars' }, { k:'jupiter', g:'♃', n:'Jupiter' },
      ];
      PLANETS.forEach(p => {
        const pos = raw.positions[p.k];
        if (!pos) return;
        items.push(
          '<div class="sig-cell">' +
            '<span class="sig-cell__glyph">' + p.g + '</span>' +
            '<span class="sig-cell__label">' + p.n + '</span>' +
            '<span class="sig-cell__value">' + (pos.sign || '?') + ' ' + Math.floor(pos.degree || 0) + '°</span>' +
          '</div>'
        );
      });
    }
    items.push(
      '<div class="sig-cell" style="border-color:rgba(201, 162, 39,0.22);background:rgba(201, 162, 39,0.06);">' +
        '<span class="sig-cell__glyph" style="color:var(--gold);">✦</span>' +
        '<span class="sig-cell__label">Life Path</span>' +
        '<span class="sig-cell__value" style="color:var(--gold-pale);">' + lp + ' — ' + title + '</span>' +
      '</div>'
    );
    grid.innerHTML = items.join('');
    sig.removeAttribute('hidden');
  }

  // ── Activation ────────────────────────────────────────────────────────────

  function activate() {
    if (!event_) return;
    document.getElementById('ev-status').textContent =
      `Event set: ${event_.dt.replace('T', ' · ')} · ${event_.city}`;
    document.getElementById('ev-datetime').value = event_.dt;
    if (event_.city && !cityIn.value) cityIn.value = event_.city;
    ['sec-lightcone', 'sec-zenith', 'sec-echo', 'sec-daimon'].forEach(id => {
      document.getElementById(id).hidden = false;
    });
    renderLightCone();
    renderZenith();
    renderDaimonIdentity();
    renderNatalSignature();
    renderWeather();   // re-render personalised
  }

  function boot() {
    event_ = loadEvent();
    renderFrame('tropical');
    initTimeTravel();
    wireZenithCardBtn();
    wireDailySkyCardBtn();
    if (event_) activate();   // activate() renders the personalised weather
    else renderWeather();     // no event yet — show the generic sky weather
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

})();
