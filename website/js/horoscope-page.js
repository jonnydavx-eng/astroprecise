/**
 * AstroPrecise Daily v835
 * One twelve-sign ledger, one selected reading, one evidence ledger.
 * No dial, sphere, saved-sign retention, luck scores, or hidden personal layer.
 * luckyNumber / luckyColor may exist on the engine object; this page never paints them.
 */
(function () {
  'use strict';

  const SIGN_KEYS = [
    'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
    'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
  ];
  const FALLBACK_SIGNS = {
    aries:       { name: 'Aries', dates: 'Mar 21 – Apr 19', element: 'fire' },
    taurus:      { name: 'Taurus', dates: 'Apr 20 – May 20', element: 'earth' },
    gemini:      { name: 'Gemini', dates: 'May 21 – Jun 20', element: 'air' },
    cancer:      { name: 'Cancer', dates: 'Jun 21 – Jul 22', element: 'water' },
    leo:         { name: 'Leo', dates: 'Jul 23 – Aug 22', element: 'fire' },
    virgo:       { name: 'Virgo', dates: 'Aug 23 – Sep 22', element: 'earth' },
    libra:       { name: 'Libra', dates: 'Sep 23 – Oct 22', element: 'air' },
    scorpio:     { name: 'Scorpio', dates: 'Oct 23 – Nov 21', element: 'water' },
    sagittarius: { name: 'Sagittarius', dates: 'Nov 22 – Dec 21', element: 'fire' },
    capricorn:   { name: 'Capricorn', dates: 'Dec 22 – Jan 19', element: 'earth' },
    aquarius:    { name: 'Aquarius', dates: 'Jan 20 – Feb 18', element: 'air' },
    pisces:      { name: 'Pisces', dates: 'Feb 19 – Mar 20', element: 'water' },
  };
  const SIGNS = (function () {
    const source = window.AP_ZODIAC && Array.isArray(AP_ZODIAC.SIGNS) ? AP_ZODIAC.SIGNS : null;
    if (!source) return FALLBACK_SIGNS;
    return source.reduce(function (map, sign) {
      map[sign.key] = { name: sign.name, dates: sign.dates, element: sign.element };
      return map;
    }, {});
  })();
  const RULERS = {
    aries: 'Mars', taurus: 'Venus', gemini: 'Mercury', cancer: 'Moon',
    leo: 'Sun', virgo: 'Mercury', libra: 'Venus', scorpio: 'Pluto',
    sagittarius: 'Jupiter', capricorn: 'Saturn', aquarius: 'Uranus', pisces: 'Neptune',
  };
  const PHASE_NAMES = [
    'New Moon', 'Waxing crescent', 'First quarter', 'Waxing gibbous',
    'Full Moon', 'Waning gibbous', 'Last quarter', 'Waning crescent',
  ];

  let currentOpenSign = null;
  let enginePromise = null;
  let selectionToken = 0;

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      const existing = Array.from(document.scripts).find(function (script) {
        return script.getAttribute('src') === src || script.src.endsWith('/' + src);
      });
      if (existing) {
        if (existing.dataset.apLoaded === 'true' || existing.readyState === 'complete') resolve();
        else {
          existing.addEventListener('load', resolve, { once: true });
          existing.addEventListener('error', reject, { once: true });
        }
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.defer = true;
      script.addEventListener('load', function () {
        script.dataset.apLoaded = 'true';
        resolve();
      }, { once: true });
      script.addEventListener('error', reject, { once: true });
      document.body.appendChild(script);
    });
  }

  function ensureDailyEngine() {
    if (window.AstroEphemeris && window.Interpretations && typeof Interpretations.getDailyHoroscope === 'function') {
      return Promise.resolve();
    }
    if (enginePromise) return enginePromise;
    enginePromise = Promise.resolve()
      .then(function () {
        return window.AstroEphemeris ? null : loadScript('js/ephemeris.js');
      })
      .then(function () {
        return window.HoroscopeEngine ? null : loadScript('js/horoscope-engine.js');
      })
      .then(function () {
        if (!window.AstroEphemeris || !window.Interpretations || typeof Interpretations.getDailyHoroscope !== 'function') {
          throw new Error('Daily calculation engine unavailable');
        }
      })
      .catch(function (error) {
        enginePromise = null;
        throw error;
      });
    return enginePromise;
  }

  function setStatus(message, isError) {
    const status = document.getElementById('daily-reading-status');
    if (!status) return;
    status.textContent = message || '';
    status.classList.toggle('is-error', !!isError);
  }

  function showToast(title, message) {
    if (window.AstroApp && typeof AstroApp.showToast === 'function') {
      AstroApp.showToast(title, message, 'info');
      return;
    }
    const host = document.getElementById('toast-container');
    if (!host) return;
    const toast = document.createElement('div');
    toast.className = 'toast toast--fallback';
    toast.textContent = title + ' · ' + message;
    host.appendChild(toast);
    window.setTimeout(function () { toast.remove(); }, 3600);
  }

  function setPanelLocked(panel, locked) {
    if (!panel) return;
    if ('inert' in panel) panel.inert = locked;
    if (locked) panel.setAttribute('inert', '');
    else panel.removeAttribute('inert');
  }

  function dateAtNoonUt(date) {
    const day = date || new Date();
    return AstroEphemeris.julianDay(day.getFullYear(), day.getMonth() + 1, day.getDate(), 12, 0, 0);
  }

  function moonPhaseAtNoon(date) {
    const jd = dateAtNoonUt(date);
    const moon = AstroEphemeris.moonPosition(jd);
    const sun = AstroEphemeris.sunPosition(jd);
    const fraction = ((((moon.lon - sun.lon) % 360) + 360) % 360) / 360;
    return {
      fraction: fraction,
      index: Math.round(fraction * 8) % 8,
      illumination: Math.round((1 - Math.cos(2 * Math.PI * fraction)) * 50),
    };
  }

  function drawMoonPhase(phase) {
    const canvas = document.getElementById('srp-moon-canvas');
    if (!canvas) return;
    const context = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(width, height) * 0.35;
    context.clearRect(0, 0, width, height);
    context.fillStyle = '#181C24';
    context.beginPath();
    context.arc(cx, cy, radius + 6, 0, Math.PI * 2);
    context.fill();
    context.save();
    context.beginPath();
    context.arc(cx, cy, radius, 0, Math.PI * 2);
    context.clip();
    context.fillStyle = '#0E1116';
    context.fillRect(0, 0, width, height);
    context.fillStyle = '#F1E7CF';
    context.beginPath();
    if (phase.fraction < 0.5) {
      context.arc(cx, cy, radius, -Math.PI / 2, Math.PI / 2);
      const ellipse = radius * Math.cos(Math.PI * (1 - 2 * phase.fraction));
      context.ellipse(cx, cy, Math.abs(ellipse), radius, 0, Math.PI / 2, -Math.PI / 2, phase.fraction < 0.25);
    } else {
      context.arc(cx, cy, radius, Math.PI / 2, -Math.PI / 2);
      const ellipse = radius * Math.cos(Math.PI * (2 * phase.fraction - 1));
      context.ellipse(cx, cy, Math.abs(ellipse), radius, 0, -Math.PI / 2, Math.PI / 2, phase.fraction > 0.75);
    }
    context.closePath();
    context.fill();
    context.restore();
    context.strokeStyle = 'rgba(180,105,62,.72)';
    context.lineWidth = 1.5;
    context.beginPath();
    context.arc(cx, cy, radius + 2, 0, Math.PI * 2);
    context.stroke();
  }

  function syncSignButtons(activeKey) {
    document.querySelectorAll('.sign-card').forEach(function (card) {
      const active = card.dataset.sign === activeKey;
      card.classList.toggle('is-active', active);
      card.setAttribute('aria-pressed', active ? 'true' : 'false');
      card.removeAttribute('aria-busy');
    });
  }

  function updateReadingUrl(signKey) {
    const next = new URL(window.location.pathname, window.location.origin);
    ['nosw', 'lite'].forEach(function (key) {
      if (new URLSearchParams(window.location.search).get(key) === '1') next.searchParams.set(key, '1');
    });
    if (signKey) next.searchParams.set('sign', signKey);
    history.replaceState(null, '', next.pathname + next.search);
  }

  function paintMethodNote(methodNote) {
    const methodEl = document.getElementById('srp-method-note');
    if (!methodEl) return;
    methodEl.textContent = '';
    const note = String(methodNote || '')
      .replace(/\s*For your full birth chart, see (?:chart\.html|transits\.html|mysky\.html|ephemeris\.html)\.?\s*$/i, '')
      .trim();
    if (note) methodEl.appendChild(document.createTextNode(note + ' '));
    const methodLink = document.createElement('a');
    methodLink.href = 'chart.html';
    methodLink.textContent = 'Open your birth chart.';
    methodEl.appendChild(methodLink);
  }

  function paintSkyLecture(el, text, summary) {
    if (!el) return;
    const plain = String(text || '').trim();
    el.textContent = '';
    if (!plain) return;
    const details = document.createElement('details');
    details.className = 'ap-reading-details';
    const sum = document.createElement('summary');
    sum.className = 'ap-reading-details__summary';
    sum.textContent = summary;
    const body = document.createElement('p');
    body.textContent = plain;
    details.appendChild(sum);
    details.appendChild(body);
    el.appendChild(details);
  }

  function renderReading(signKey) {
    const info = SIGNS[signKey];
    const panel = document.getElementById('sign-reading-panel');
    const data = window.Interpretations && Interpretations.getDailyHoroscope(info.name, new Date());
    if (!panel || !data) throw new Error('No daily reading returned');

    const seal = document.getElementById('srp-sign-seal');
    const ruler = RULERS[signKey] || '';
    if (seal && seal.tagName === 'IMG') {
      seal.src = 'assets/images/seals/zodiac/' + signKey + '.svg';
      seal.alt = info.name + ' engraved zodiac seal';
    } else if (seal && window.APGlyphs) {
      // Paper & Night: the brand stroke glyph, not the retired seal art.
      seal.innerHTML = window.APGlyphs.sign(signKey, { lg: true });
      seal.setAttribute('aria-label', info.name);
    }
    document.getElementById('srp-sign-name').textContent = info.name;
    document.getElementById('srp-date').textContent = info.dates + ' · ' + new Date().toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
    document.getElementById('srp-element-text').textContent = info.element.charAt(0).toUpperCase() + info.element.slice(1) + ' sign';
    document.getElementById('srp-ruler-line').textContent = 'Ruler · ' + ruler;
    const guide = document.getElementById('srp-guide-link');
    guide.href = signKey + '.html';
    guide.textContent = 'Full ' + info.name + ' guide →';
    const todayLine = document.getElementById('srp-today-line');
    const useThis = document.getElementById('srp-use-this');
    const leaveThis = document.getElementById('srp-leave-this');
    if (todayLine) todayLine.textContent = data.todayLine || '';
    if (useThis) useThis.textContent = data.useThis || '';
    if (leaveThis) leaveThis.textContent = data.leaveThis || '';
    const overviewEl = document.getElementById('srp-overview');
    if (overviewEl) {
      if (data.todayLine && data.overview) {
        paintSkyLecture(overviewEl, data.overview, 'More about today’s sky');
      } else {
        overviewEl.textContent = data.overview || '';
      }
    }
    document.getElementById('srp-love').textContent = data.love || '';
    document.getElementById('srp-career').textContent = data.career || '';
    document.getElementById('srp-health').textContent = data.health || '';
    document.getElementById('srp-sky-facts').textContent = data.skyFacts && data.skyFacts.length
      ? 'Computed sky · ' + data.skyFacts.join(' · ')
      : '';
    paintMethodNote(data.methodNote);

    const phase = moonPhaseAtNoon(new Date());
    drawMoonPhase(phase);
    document.getElementById('srp-moon-label').textContent = PHASE_NAMES[phase.index] + ' · ' + phase.illumination + '% lit at 12:00 UT';

    currentOpenSign = signKey;
    panel.dataset.element = info.element;
    panel.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');
    setPanelLocked(panel, false);
    syncSignButtons(signKey);
    updateReadingUrl(signKey);
    setStatus('');
    updateEvidenceLedger();

    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.setTimeout(function () {
      panel.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    }, reduce ? 0 : 60);
  }

  function selectSign(signKey) {
    if (!SIGNS[signKey]) return;
    const token = ++selectionToken;
    document.querySelectorAll('.sign-card').forEach(function (button) {
      button.removeAttribute('aria-busy');
    });
    const card = document.querySelector('.sign-card[data-sign="' + signKey + '"]');
    if (card) card.setAttribute('aria-busy', 'true');
    setStatus('Calculating ' + SIGNS[signKey].name + ' at 12:00 UT…');
    ensureDailyEngine()
      .then(function () {
        if (token !== selectionToken) return;
        renderReading(signKey);
      })
      .catch(function () {
        if (token !== selectionToken) return;
        syncSignButtons(currentOpenSign);
        setStatus('The daily calculation did not load. Refresh once and try again.', true);
      });
  }

  function closeReading() {
    selectionToken += 1;
    const previousSign = currentOpenSign;
    currentOpenSign = null;
    const panel = document.getElementById('sign-reading-panel');
    if (panel) {
      panel.classList.remove('is-open');
      panel.setAttribute('aria-hidden', 'true');
      panel.removeAttribute('data-element');
      setPanelLocked(panel, true);
    }
    syncSignButtons(null);
    updateReadingUrl(null);
    setStatus('');
    const previousCard = previousSign && document.querySelector('.sign-card[data-sign="' + previousSign + '"]');
    if (previousCard) previousCard.focus();
  }

  function updateEvidenceLedger() {
    if (!window.AstroEphemeris) return;
    const day = new Date();
    const jd = dateAtNoonUt(day);
    const positions = AstroEphemeris.allPlanetPositions(jd) || {};
    const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
    [
      ['Sun', 'ap-sky-sun'], ['Moon', 'ap-sky-moon'], ['Mercury', 'ap-sky-mercury'],
      ['Venus', 'ap-sky-venus'], ['Mars', 'ap-sky-mars'], ['Jupiter', 'ap-sky-jupiter'], ['Saturn', 'ap-sky-saturn'],
    ].forEach(function (entry) {
      const target = document.getElementById(entry[1]);
      if (!target) return;
      const position = positions[entry[0]];
      const lon = position && Number(position.lon);
      if (!Number.isFinite(lon)) {
        target.textContent = 'Position unavailable';
        return;
      }
      const normalized = ((lon % 360) + 360) % 360;
      let signIndex = Math.floor(normalized / 30);
      let degree = Math.round((normalized - signIndex * 30) * 10) / 10;
      if (degree >= 30) {
        signIndex = (signIndex + 1) % signs.length;
        degree = 0;
      }
      const sign = signs[signIndex] || 'Aries';
      target.textContent = sign + ' ' + degree.toFixed(1) + '°' + (position.retrograde ? ' · retrograde' : '');
    });
  }

  function wrapText(context, text, x, y, maxWidth, lineHeight, maxLines) {
    const words = String(text || '').split(/\s+/);
    let line = '';
    let row = 0;
    for (let index = 0; index < words.length; index += 1) {
      const trial = line ? line + ' ' + words[index] : words[index];
      if (context.measureText(trial).width <= maxWidth || !line) {
        line = trial;
        continue;
      }
      context.fillText(line, x, y + row * lineHeight);
      row += 1;
      line = words[index];
      if (row === maxLines - 1) {
        const rest = [line].concat(words.slice(index + 1)).join(' ');
        let clipped = rest;
        while (clipped.length && context.measureText(clipped + '…').width > maxWidth) clipped = clipped.slice(0, -1);
        context.fillText(clipped.trim() + '…', x, y + row * lineHeight);
        return;
      }
    }
    if (line) context.fillText(line, x, y + row * lineHeight);
  }

  // Share card (2C step 10): the Paper & Night look of the light OG cards, square for posts.
  // Paper ground, ink type in Instrument Serif and Inter (the repo's AP Serif / AP Sans faces),
  // one copper accent, the hand-drawn brand glyph. No star field, no dark ground.
  const CARD = {
    paper: '#F6F3EC', card: '#FBF9F4', rule: '#D6D1C6', ink: '#0E1116', graphite: '#3A3F47',
    muted: '#5C6168', copper: '#B4693E', copperInk: '#8A4A24', night: '#0E1116',
  };
  const CARD_SERIF = '"AP Serif", "Instrument Serif", Georgia, "Times New Roman", serif';
  const CARD_SANS = '"AP Sans", Inter, system-ui, -apple-system, "Segoe UI", sans-serif';

  function countLines(context, text, font, maxWidth, maxLines) {
    context.font = font;
    const words = String(text || '').split(/\s+/).filter(Boolean);
    if (!words.length) return 0;
    let line = '';
    let rows = 1;
    for (let index = 0; index < words.length; index += 1) {
      const trial = line ? line + ' ' + words[index] : words[index];
      if (context.measureText(trial).width <= maxWidth || !line) { line = trial; continue; }
      rows += 1;
      line = words[index];
    }
    return Math.min(rows, maxLines);
  }

  function cardFontsReady() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    const loads = Promise.all([
      document.fonts.load('400 104px ' + CARD_SERIF),
      document.fonts.load('600 18px ' + CARD_SANS),
      document.fonts.load('400 24px ' + CARD_SANS),
    ]).catch(function () {});
    return Promise.race([loads, new Promise(function (resolve) { window.setTimeout(resolve, 2500); })]);
  }

  function tracked(context, px) {
    if ('letterSpacing' in context) context.letterSpacing = px + 'px';
  }

  function cardGlyph(signKey) {
    return new Promise(function (resolve) {
      const markup = window.APGlyphs && window.APGlyphs.image ? window.APGlyphs.image(signKey, CARD.ink) : '';
      if (!markup) { resolve(null); return; }
      const image = new Image();
      image.addEventListener('load', function () { resolve(image); }, { once: true });
      image.addEventListener('error', function () { resolve(null); }, { once: true });
      image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(markup);
    });
  }

  function star4(context, cx, cy, r) {
    const w = r * 0.22;
    context.beginPath();
    context.moveTo(cx, cy - r);
    context.bezierCurveTo(cx + w * 0.35, cy - w, cx + w, cy - w * 0.35, cx + r, cy);
    context.bezierCurveTo(cx + w, cy + w * 0.35, cx + w * 0.35, cy + w, cx, cy + r);
    context.bezierCurveTo(cx - w * 0.35, cy + w, cx - w, cy + w * 0.35, cx - r, cy);
    context.bezierCurveTo(cx - w, cy - w * 0.35, cx - w * 0.35, cy - w, cx, cy - r);
    context.closePath();
    context.fill();
  }

  // The AstroPrecise mark: half paper, half night disc with a copper four-point star.
  function drawMark(context, cx, cy, size) {
    const r = size * 0.4;
    context.fillStyle = CARD.paper;
    context.beginPath(); context.arc(cx, cy, r, Math.PI / 2, Math.PI * 1.5); context.fill();
    context.fillStyle = CARD.night;
    context.beginPath(); context.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2); context.fill();
    context.strokeStyle = CARD.night;
    context.lineWidth = size * 0.04;
    context.beginPath(); context.arc(cx, cy, r, 0, Math.PI * 2); context.stroke();
    context.fillStyle = CARD.copper;
    star4(context, cx + r * 0.42, cy - r * 0.26, r * 0.3);
  }

  // The sign on its zodiac ring, as on the sign OG cards: the sign's own tick in copper.
  function drawSignDisc(context, signKey, glyph, cx, cy, r) {
    context.fillStyle = CARD.card;
    context.strokeStyle = CARD.rule;
    context.lineWidth = 2;
    context.beginPath(); context.arc(cx, cy, r, 0, Math.PI * 2); context.fill(); context.stroke();
    const index = SIGN_KEYS.indexOf(signKey);
    context.lineCap = 'round';
    for (let k = 0; k < 12; k += 1) {
      const angle = (-90 - k * 30) * Math.PI / 180;
      const on = k === index;
      const r0 = on ? r - 18 : r - 10;
      const r1 = on ? r : r - 2;
      context.strokeStyle = on ? CARD.copper : CARD.graphite;
      context.lineWidth = on ? 3 : 1.4;
      context.beginPath();
      context.moveTo(cx + r0 * Math.cos(angle), cy + r0 * Math.sin(angle));
      context.lineTo(cx + r1 * Math.cos(angle), cy + r1 * Math.sin(angle));
      context.stroke();
    }
    if (glyph) context.drawImage(glyph, cx - r * 0.5, cy - r * 0.5, r, r);
  }

  async function buildDailyCard(signKey) {
    const info = SIGNS[signKey];
    const data = Interpretations.getDailyHoroscope(info.name, new Date());
    const size = 1080;
    const exportSize = window.RafCore && RafCore.cardExportSize ? RafCore.cardExportSize() : size * 2;
    const canvas = document.createElement('canvas');
    const context = window.RafCore && RafCore.prepExportCtx
      ? RafCore.prepExportCtx(canvas, exportSize, exportSize)
      : (canvas.width = exportSize, canvas.height = exportSize, canvas.getContext('2d'));
    const [glyph] = await Promise.all([cardGlyph(signKey), cardFontsReady()]);
    context.scale(exportSize / size, exportSize / size);

    context.fillStyle = CARD.paper;
    context.fillRect(0, 0, size, size);
    context.strokeStyle = CARD.rule;
    context.lineWidth = 2;
    context.strokeRect(28, 28, size - 56, size - 56);

    const phase = moonPhaseAtNoon(new Date());
    context.textBaseline = 'alphabetic';
    context.textAlign = 'left';
    context.fillStyle = CARD.copperInk;
    context.font = '600 18px ' + CARD_SANS;
    tracked(context, 3.2);
    context.fillText('DAILY READING · ' + String(SIGN_KEYS.indexOf(signKey) + 1).padStart(2, '0') + ' / 12', 84, 108);
    context.textAlign = 'right';
    context.fillStyle = CARD.ink;
    context.fillText(PHASE_NAMES[phase.index].toUpperCase(), 996, 108);
    tracked(context, 0);
    context.fillStyle = CARD.muted;
    context.font = '400 18px ' + CARD_SANS;
    context.fillText(phase.illumination + '% lit at 12:00 UT', 996, 138);

    drawSignDisc(context, signKey, glyph, 540, 262, 104);

    context.textAlign = 'center';
    context.fillStyle = CARD.ink;
    context.font = '400 104px ' + CARD_SERIF;
    tracked(context, -1.5);
    context.fillText(info.name, 540, 476);
    context.fillStyle = CARD.muted;
    context.font = '500 18px ' + CARD_SANS;
    tracked(context, 3.2);
    context.fillText((new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) + ' · ' + info.dates).toUpperCase(), 540, 518);
    tracked(context, 0);

    // The reading block (today's line, Use this, Leave this) sits centred between the date and
    // the footer rule, whatever the number of wrapped lines.
    const todayText = data.todayLine || data.overview || '';
    const todayFont = '400 40px ' + CARD_SERIF;
    const noteFont = '400 24px ' + CARD_SANS;
    const todayRows = countLines(context, todayText, todayFont, 820, 3);
    const useRows = countLines(context, data.useThis || '', noteFont, 800, 2);
    const leaveRows = countLines(context, data.leaveThis || '', noteFont, 800, 2);
    const blockHeight = todayRows * 48 + 56 + (34 + useRows * 32) + 40 + (34 + leaveRows * 32);
    let y = Math.round(548 + Math.max(0, (930 - 548 - blockHeight) / 2)) + 36;
    context.fillStyle = CARD.ink;
    context.font = todayFont;
    wrapText(context, todayText, 540, y, 820, 48, 3);
    y += (todayRows - 1) * 48 + 76;
    [['USE THIS', data.useThis || '', useRows], ['LEAVE THIS', data.leaveThis || '', leaveRows]].forEach(function (note) {
      context.fillStyle = CARD.copperInk;
      context.font = '600 16px ' + CARD_SANS;
      tracked(context, 3);
      context.fillText(note[0], 540, y);
      tracked(context, 0);
      context.fillStyle = CARD.graphite;
      context.font = noteFont;
      wrapText(context, note[1], 540, y + 34, 800, 32, 2);
      y += 34 + note[2] * 32 + 40;
    });

    context.fillStyle = CARD.rule;
    context.fillRect(84, 948, 912, 2);
    drawMark(context, 104, 990, 40);
    context.textAlign = 'left';
    context.fillStyle = CARD.ink;
    context.font = '400 30px ' + CARD_SERIF;
    context.fillText('AstroPrecise', 134, 1000);
    context.textAlign = 'right';
    context.fillStyle = CARD.muted;
    context.font = '400 18px ' + CARD_SANS;
    context.fillText('astroprecise.app', 996, 998);
    context.textAlign = 'center';
    context.font = '400 15px ' + CARD_SANS;
    context.fillText('Astrological interpretation for reflection and entertainment · positions calculated at 12:00 UT', 540, 1036);
    return canvas;
  }

  function canvasToBlob(canvas) {
    return new Promise(function (resolve) {
      if (canvas.toBlob) canvas.toBlob(resolve, 'image/png');
      else {
        const binary = atob(canvas.toDataURL('image/png').split(',')[1]);
        const bytes = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
        resolve(new Blob([bytes], { type: 'image/png' }));
      }
    });
  }

  async function downloadCard() {
    if (!currentOpenSign) {
      showToast('Choose a sign', 'Open a reading before downloading its card.');
      return;
    }
    const button = document.getElementById('srp-card-btn');
    if (button.dataset.busy) return;
    button.dataset.busy = 'true';
    button.disabled = true;
    button.textContent = 'Rendering card…';
    try {
      await ensureDailyEngine();
      const canvas = await buildDailyCard(currentOpenSign);
      const blob = await canvasToBlob(canvas);
      if (!blob) throw new Error('Card blob unavailable');
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.download = currentOpenSign + '-daily-' + new Date().toISOString().slice(0, 10) + '.png';
      anchor.href = url;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      button.textContent = 'Card saved';
    } catch (error) {
      button.textContent = 'Download card';
      showToast('Card unavailable', 'The image could not be rendered just now.');
    } finally {
      delete button.dataset.busy;
      button.disabled = false;
      window.setTimeout(function () { button.textContent = 'Download card'; }, 1800);
    }
  }

  async function shareReading() {
    if (!currentOpenSign) {
      showToast('Choose a sign', 'Open a reading before sharing it.');
      return;
    }
    const info = SIGNS[currentOpenSign];
    const data = Interpretations.getDailyHoroscope(info.name, new Date());
    const url = new URL(window.location.pathname, window.location.origin);
    url.searchParams.set('sign', currentOpenSign);
    const overview = String(data.todayLine || data.overview || '').trim();
    const sentenceMatch = overview.match(/^.*?[.!?](?:\s|$)/);
    const firstSentence = sentenceMatch ? sentenceMatch[0].trim() : overview;
    const text = info.name + ' · ' + new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }) + '. ' +
      firstSentence + ' Astrological interpretation from positions calculated at 12:00 UT.';
    try {
      if (navigator.share) await navigator.share({ title: info.name + ' daily reading', text: text, url: url.href });
      else if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text + ' ' + url.href);
        showToast('Copied', 'The reading link is ready to paste.');
      } else showToast('Share unavailable', 'Copy the page address from your browser.');
    } catch (error) {
      if (!error || error.name !== 'AbortError') showToast('Share unavailable', 'Copy the page address from your browser.');
    }
  }

  function boot() {
    document.querySelectorAll('.sign-card').forEach(function (card) {
      card.addEventListener('click', function () { selectSign(card.dataset.sign); });
    });
    document.getElementById('srp-close-btn')?.addEventListener('click', closeReading);
    document.getElementById('srp-card-btn')?.addEventListener('click', downloadCard);
    document.getElementById('srp-share-btn')?.addEventListener('click', shareReading);

    const ledger = document.getElementById('ap-daily-weather');
    ledger?.addEventListener('toggle', function () {
      if (!ledger.open) return;
      ensureDailyEngine().then(updateEvidenceLedger).catch(function () {
        document.querySelectorAll('#computed-sky-ledger dd').forEach(function (cell) {
          cell.textContent = 'Calculation unavailable';
        });
      });
    });

    const signParam = new URLSearchParams(window.location.search).get('sign');
    if (signParam && SIGNS[signParam]) selectSign(signParam);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
