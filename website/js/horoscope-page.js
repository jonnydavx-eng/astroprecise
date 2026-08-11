/**
 * AstroPrecise Daily v835
 * One twelve-sign ledger, one selected reading, one evidence ledger.
 * No dial, sphere, saved-sign retention, luck scores, or hidden personal layer.
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
    context.fillStyle = '#0d121b';
    context.beginPath();
    context.arc(cx, cy, radius + 6, 0, Math.PI * 2);
    context.fill();
    context.save();
    context.beginPath();
    context.arc(cx, cy, radius, 0, Math.PI * 2);
    context.clip();
    context.fillStyle = '#020307';
    context.fillRect(0, 0, width, height);
    context.fillStyle = '#f2ecdf';
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
    context.strokeStyle = 'rgba(216,180,106,.7)';
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
    const next = new URL(window.location.href);
    if (signKey) next.searchParams.set('sign', signKey);
    else next.searchParams.delete('sign');
    next.hash = '';
    history.replaceState(null, '', next.pathname + next.search);
  }

  function renderReading(signKey) {
    const info = SIGNS[signKey];
    const panel = document.getElementById('sign-reading-panel');
    const data = window.Interpretations && Interpretations.getDailyHoroscope(info.name, new Date());
    if (!panel || !data) throw new Error('No daily reading returned');

    const seal = document.getElementById('srp-sign-seal');
    const ruler = RULERS[signKey] || '';
    if (seal) {
      seal.src = 'assets/images/seals/zodiac/' + signKey + '.svg';
      seal.alt = info.name + ' engraved zodiac seal';
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
    document.getElementById('srp-overview').textContent = data.overview || '';
    document.getElementById('srp-love').textContent = data.love || '';
    document.getElementById('srp-career').textContent = data.career || '';
    document.getElementById('srp-health').textContent = data.health || '';
    document.getElementById('srp-sky-facts').textContent = data.skyFacts && data.skyFacts.length
      ? 'Computed sky · ' + data.skyFacts.join(' · ')
      : '';
    document.getElementById('srp-method-note').textContent = data.methodNote || '';

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

  function deterministicRandom(seed) {
    let value = seed >>> 0;
    return function () {
      value += 0x6D2B79F5;
      let mixed = value;
      mixed = Math.imul(mixed ^ mixed >>> 15, mixed | 1);
      mixed ^= mixed + Math.imul(mixed ^ mixed >>> 7, mixed | 61);
      return ((mixed ^ mixed >>> 14) >>> 0) / 4294967296;
    };
  }

  function buildDailyCard(signKey) {
    const info = SIGNS[signKey];
    const data = Interpretations.getDailyHoroscope(info.name, new Date());
    const size = 1080;
    const exportSize = window.RafCore && RafCore.cardExportSize ? RafCore.cardExportSize() : size * 2;
    const canvas = document.createElement('canvas');
    const context = window.RafCore && RafCore.prepExportCtx
      ? RafCore.prepExportCtx(canvas, exportSize, exportSize)
      : (canvas.width = exportSize, canvas.height = exportSize, canvas.getContext('2d'));
    context.scale(exportSize / size, exportSize / size);

    context.fillStyle = '#020307';
    context.fillRect(0, 0, size, size);
    context.strokeStyle = 'rgba(216,180,106,.09)';
    context.lineWidth = 1;
    for (let line = 72; line < size; line += 78) {
      context.beginPath(); context.moveTo(line, 40); context.lineTo(line, 1040); context.stroke();
      context.beginPath(); context.moveTo(40, line); context.lineTo(1040, line); context.stroke();
    }
    const random = deterministicRandom(Math.floor(Date.now() / 86400000) * 17 + SIGN_KEYS.indexOf(signKey));
    for (let star = 0; star < 100; star += 1) {
      context.fillStyle = 'rgba(185,200,220,' + (0.12 + random() * 0.45).toFixed(2) + ')';
      context.beginPath();
      context.arc(50 + random() * 980, 50 + random() * 980, 0.4 + random() * 1.2, 0, Math.PI * 2);
      context.fill();
    }
    context.strokeStyle = '#d8b46a';
    context.lineWidth = 2;
    context.strokeRect(40, 40, 1000, 1000);
    context.strokeStyle = 'rgba(216,180,106,.35)';
    context.lineWidth = 1;
    context.strokeRect(54, 54, 972, 972);
    context.fillStyle = '#ff6428';
    context.fillRect(40, 40, 178, 5);

    const phase = moonPhaseAtNoon(new Date());
    context.textAlign = 'right';
    context.fillStyle = '#d8b46a';
    context.font = '600 19px "IBM Plex Mono", monospace';
    context.fillText(PHASE_NAMES[phase.index].toUpperCase(), 960, 104);
    context.fillStyle = '#b9c8dc';
    context.font = '16px "IBM Plex Mono", monospace';
    context.fillText(phase.illumination + '% LIT · 12:00 UT', 960, 134);

    context.textAlign = 'center';
    context.fillStyle = '#ff6428';
    context.font = '600 18px "IBM Plex Mono", monospace';
    context.fillText('DAILY / ' + String(SIGN_KEYS.indexOf(signKey) + 1).padStart(2, '0') + ' / 12', 540, 130);

    return new Promise(function (resolve) {
      const seal = new Image();
      function finish(image) {
        if (image) context.drawImage(image, 445, 154, 190, 222);
        context.fillStyle = '#f2ecdf';
        context.font = '500 82px "Cormorant Garamond", Georgia, serif';
        context.fillText(info.name, 540, 458);
        context.fillStyle = '#d8b46a';
        context.font = '600 18px "IBM Plex Mono", monospace';
        context.fillText(new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase(), 540, 502);
        context.fillStyle = '#b9c8dc';
        context.font = '500 30px "Cormorant Garamond", Georgia, serif';
        wrapText(context, data.overview || '', 540, 580, 780, 44, 6);
        context.fillStyle = 'rgba(216,180,106,.42)';
        context.fillRect(150, 870, 780, 1);
        context.fillStyle = '#b9c8dc';
        context.font = '16px "IBM Plex Mono", monospace';
        context.fillText('ASTROLOGICAL INTERPRETATION · REFLECTION & ENTERTAINMENT', 540, 914);
        context.fillStyle = '#d8b46a';
        context.font = '600 19px "IBM Plex Mono", monospace';
        context.fillText('POSITIONS CALCULATED AT 12:00 UT · ASTROPRECISE.APP', 540, 1000);
        resolve(canvas);
      }
      seal.addEventListener('load', function () { finish(seal); }, { once: true });
      seal.addEventListener('error', function () { finish(null); }, { once: true });
      seal.src = 'assets/images/seals/zodiac/' + signKey + '.svg';
    });
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
    const url = new URL(window.location.href);
    url.searchParams.set('sign', currentOpenSign);
    const overview = String(data.overview || '').trim();
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
