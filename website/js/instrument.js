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

  cityIn.addEventListener('input', () => {
    pickedCity = null;
    const q = cityIn.value.trim().toLowerCase();
    if (q.length < 2 || !E()) { cityDd.hidden = true; return; }
    const hits = E().CITIES.filter(c => c.name.toLowerCase().includes(q)).slice(0, 7);
    if (!hits.length) { cityDd.hidden = true; return; }
    cityDd.innerHTML = hits.map((c, i) =>
      `<div class="autocomplete-option" data-i="${i}"><strong>${c.name}</strong>&nbsp;<span style="opacity:0.6">${c.country}</span></div>`).join('');
    cityDd.hidden = false;
    cityDd.querySelectorAll('.autocomplete-option').forEach((el, i) => {
      el.addEventListener('mousedown', ev2 => {
        ev2.preventDefault();
        pickedCity = hits[i];
        cityIn.value = `${hits[i].name}, ${hits[i].country}`;
        cityDd.hidden = true;
      });
    });
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
          `<span title="${(s.fact || '').replace(/"/g, '&quot;')}" style="font-size:0.7rem;letter-spacing:0.08em;padding:5px 12px;border:1px solid rgba(212,175,55,0.3);border-radius:999px;color:var(--gold-pale);cursor:help;">
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

    const W = 1080, H = 1080;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');

    x.fillStyle = '#06060f';
    x.fillRect(0, 0, W, H);
    const neb = x.createRadialGradient(W / 2, 430, 0, W / 2, 430, 520);
    neb.addColorStop(0, 'rgba(123, 44, 191, 0.22)');
    neb.addColorStop(1, 'transparent');
    x.fillStyle = neb; x.fillRect(0, 0, W, H);

    let seed = 137;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 160; i++) {
      x.fillStyle = `rgba(240,232,216,${0.1 + rnd() * 0.5})`;
      x.beginPath();
      x.arc(rnd() * W, rnd() * H, rnd() * 1.6 + 0.3, 0, Math.PI * 2);
      x.fill();
    }

    x.strokeStyle = 'rgba(212,175,55,0.55)';
    x.lineWidth = 2;
    x.strokeRect(46, 46, W - 92, H - 92);
    x.strokeStyle = 'rgba(212,175,55,0.22)';
    x.strokeRect(58, 58, W - 116, H - 116);

    // ── wavefront map (same log-radial mapping as the live canvas) ──
    const cx = W / 2, cy = 430, maxR = 330;
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
    fill.addColorStop(0, 'rgba(212,175,55,0.14)');
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
    x.shadowColor = 'rgba(212,175,55,0.9)';
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
    x.fillStyle = '#D4AF37';
    x.font = '26px Georgia, serif';
    x.fillText('✦  T H E   L I G H T - C O N E  ✦', W / 2, 130);

    x.fillStyle = '#9aa6c8';
    x.font = '30px Georgia, serif';
    x.fillText('The light of my first breath has reached', W / 2, 830);

    x.fillStyle = '#f0e8d8';
    x.font = 'bold 76px Georgia, serif';
    x.fillText(`${m.reached.length} star systems`, W / 2, 920);

    x.fillStyle = '#9aa6c8';
    x.font = '28px Georgia, serif';
    x.fillText(`and is now ${m.radiusLy.toFixed(2)} light-years from Earth — still travelling`, W / 2, 975);

    x.fillStyle = '#D4AF37';
    x.font = '22px Georgia, serif';
    x.fillText('astroprecise · the instrument', W / 2, 1010);

    return cv;
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
          `<div style="border:1px solid rgba(212,175,55,0.3);border-radius:var(--radius-lg);padding:var(--space-5);margin-top:var(--space-6);background:rgba(17,26,54,0.4);">
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

  async function renderWeather() {
    const out = document.getElementById('weather-out');
    try {
      const natal = event_ ? natalFor(event_) : null;
      const w = await window.FieldWeather.assemble(natal, new Date());
      const c = w.components;
      const rows = [];
      rows.push(row('Geomagnetic', c.kp.unavailable ? 'unavailable' :
        `Kp ${c.kp.kp.toFixed(1)} — ${c.kp.band.label}`, c.kp.source, c.kp.unavailable));
      rows.push(row('Solar wind', c.solarWind.unavailable ? 'unavailable' :
        `${Math.round(c.solarWind.speedKmS)} km/s`, c.solarWind.source, c.solarWind.unavailable));
      rows.push(row('Moon', `${c.lunar.phaseName} · ${Math.round(c.lunar.illumination * 100)}% lit`, c.lunar.source));
      rows.push(row('Transits', c.transits.basis === 'natal' ? 'personal — weighed against your chart' : 'sky weather (set the event above to personalise)', c.transits.source));
      rows.push(row('Schumann', 'unavailable', c.schumann.source, true));

      out.innerHTML = `
        <div class="daimon-card" style="text-align:center;">
          <p class="instrument-eyebrow">Composite field</p>
          <p style="font-family:var(--font-display);font-size:2.4rem;color:var(--gold-pale);">${w.composite.score}<span style="font-size:1rem;color:var(--silver-dim);">/100</span></p>
          <p class="daimon-epithet" style="font-size:1.2rem;">${w.composite.label}</p>
          <p class="grimoire" style="font-size:1.05rem;max-width:520px;margin:var(--space-4) auto 0;">${w.composite.summary}</p>
        </div>
        ${rows.join('')}`;
    } catch (e) {
      out.innerHTML = '<p class="grimoire">The field instruments could not be read: ' + (e.message || e) + '</p>';
    }

    function row(label, value, src, unavailable) {
      const cls = unavailable ? 'src-unavailable' : (src.includes('measured') ? 'src-measured' : 'src-computed');
      return `<div class="field-row">
        <span class="field-row__label">${label}</span>
        <span class="field-row__value">${value}</span>
        <span class="field-row__src ${cls}">${src}</span>
      </div>`;
    }
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
    renderWeather();   // re-render personalised
  }

  function boot() {
    event_ = loadEvent();
    renderWeather();
    renderFrame('tropical');
    initTimeTravel();
    if (event_) activate();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

})();
