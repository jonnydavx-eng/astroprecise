/* ── Ten ──────────────────────────────────────────────────────
 * A frictionless place to think on paper for ten minutes a day.
 * Everything lives on this device. No network calls, ever.
 *
 * The non-UI core (storage, streak, day math, word analysis) is
 * deliberately framework-free so it can port to the Android app.
 * ────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  // ── Storage layer ──────────────────────────────────────────
  const KEYS = {
    settings: 'ten.settings',
    streak: 'ten.streak',
    entries: 'ten.entries',
  };

  const DEFAULT_SETTINGS = { durationMin: 10, mode: 'type', theme: '', reminderTime: '' };

  const Store = {
    read(key, fallback) {
      try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
      catch { return fallback; }
    },
    write(key, val) {
      try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* private mode / full */ }
    },
  };

  let settings = Object.assign({}, DEFAULT_SETTINGS, Store.read(KEYS.settings, {}));

  // ── Day math (local calendar day, not UTC) ─────────────────
  function dayKey(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  function todayKey() { return dayKey(new Date()); }
  function yesterdayKey() { const d = new Date(); d.setDate(d.getDate() - 1); return dayKey(d); }

  // ── Streak ─────────────────────────────────────────────────
  // A day counts once you complete a session. Consecutive days build
  // the streak; a gap resets it. Keeping or clearing is irrelevant.
  function getStreak() { return Store.read(KEYS.streak, { count: 0, lastDay: '' }); }

  function markSessionComplete() {
    const s = getStreak();
    const today = todayKey();
    if (s.lastDay === today) return s;            // already counted today
    if (s.lastDay === yesterdayKey()) s.count += 1; // unbroken
    else s.count = 1;                              // first day, or chain broke
    s.lastDay = today;
    Store.write(KEYS.streak, s);
    return s;
  }

  function streakIsCurrent() {
    const s = getStreak();
    return s.lastDay === todayKey() || s.lastDay === yesterdayKey();
  }
  function wroteToday() { return getStreak().lastDay === todayKey(); }

  // ── Entries ────────────────────────────────────────────────
  function getEntries() { return Store.read(KEYS.entries, []); }
  function saveEntry(entry) {
    const all = getEntries();
    all.push(entry);
    Store.write(KEYS.entries, all);
  }

  // ── Word analysis for the Quiet Review ─────────────────────
  const STOP = new Set(('a about all am an and any are as at be because been being but by can could did do does ' +
    'doing dont down for from get got had has have he her here hers him his how i if in into is it its ' +
    'just keep know like me more most my no not now of off on once only or other our out over own re ' +
    'said same she should so some such than that the their them then there these they this those to too ' +
    'up us very was we were what when where which while who why will with would you your youre what im ' +
    'really thing things feel feeling felt going gonna want need think thought really actually maybe ' +
    'even still much way one two also lot bit kind sort').split(' '));

  function recurringWords(entries, limit) {
    const counts = new Map();
    for (const e of entries) {
      if (!e.text) continue;
      const seen = new Set(); // count each word once per entry → "recurs across days"
      const words = e.text.toLowerCase().match(/[a-z']{3,}/g) || [];
      for (let w of words) {
        w = w.replace(/^'+|'+$/g, '');
        if (w.length < 3 || STOP.has(w)) continue;
        if (seen.has(w)) continue;
        seen.add(w);
        counts.set(w, (counts.get(w) || 0) + 1);
      }
    }
    return [...counts.entries()]
      .filter(([, c]) => c >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);
  }

  // ── DOM refs ───────────────────────────────────────────────
  const $ = (id) => document.getElementById(id);
  const home = $('home'), write = $('write');
  const pad = $('pad'), ink = $('ink'), timerEl = $('timer'), nudge = $('nudge');

  // ── Theme ──────────────────────────────────────────────────
  function applyTheme() {
    document.documentElement.setAttribute('data-theme', settings.theme || '');
  }

  // ── Screen routing ─────────────────────────────────────────
  function show(screen) {
    home.hidden = screen !== 'home';
    write.hidden = screen !== 'write';
    if (screen === 'home') refreshHome();
  }

  function refreshHome() {
    const s = getStreak();
    const current = streakIsCurrent() && s.count > 0;
    $('streak').hidden = !current;
    $('streakNum').textContent = s.count;
    $('streakLabel').textContent = s.count === 1 ? 'day' : 'day streak';
    $('todayDone').hidden = !wroteToday();
    $('beginBtn').textContent = wroteToday() ? 'Again' : 'Begin';
    $('reviewBtn').hidden = getEntries().length < 3;
  }

  // ── Session ────────────────────────────────────────────────
  let session = null;

  function startSession() {
    const mode = settings.mode;
    pad.hidden = mode !== 'type';
    ink.hidden = mode !== 'ink';
    pad.value = '';
    clearInk();

    session = {
      mode,
      remaining: settings.durationMin * 60,
      lastInput: Date.now(),
      nudged: false,
      tick: null,
      strokes: [],
    };

    renderTimer();
    show('write');
    if (mode === 'type') setTimeout(() => pad.focus(), 50);
    else setupInk();

    session.tick = setInterval(onTick, 1000);
  }

  function onTick() {
    if (!session) return;
    session.remaining -= 1;
    renderTimer();

    // gentle stall nudge after ~20s of no input (typing mode)
    if (session.mode === 'type' && !session.nudged) {
      const idle = (Date.now() - session.lastInput) / 1000;
      if (idle >= 20 && session.remaining < settings.durationMin * 60 - 5) {
        showNudge();
      }
    }
    if (session.remaining <= 0) endSession(false);
  }

  function renderTimer() {
    const r = Math.max(0, session ? session.remaining : 0);
    const m = Math.floor(r / 60), s = r % 60;
    timerEl.textContent = `${m}:${String(s).padStart(2, '0')}`;
    timerEl.classList.toggle('low', r <= 30);
  }

  function showNudge() {
    session.nudged = true;
    nudge.hidden = false;
    setTimeout(() => { nudge.hidden = true; }, 6000);
  }

  function noteInput() {
    if (!session) return;
    session.lastInput = Date.now();
    session.nudged = false;
    nudge.hidden = true;
  }

  // stopEarly: user pressed Stop — discard quietly, no streak, no prompt
  function endSession(stopEarly) {
    if (!session) return;
    clearInterval(session.tick);
    nudge.hidden = true;
    const finished = session;
    session = null;

    if (stopEarly) { show('home'); return; }

    playChime();
    if (navigator.vibrate) { try { navigator.vibrate(40); } catch {} }
    markSessionComplete();

    const hasText = finished.mode === 'type'
      ? pad.value.trim().length > 0
      : finished.strokes.length > 0;
    openAfter(finished, hasText);
  }

  // ── Keep / clear ───────────────────────────────────────────
  function openAfter(finished, hasText) {
    const modal = $('afterModal');
    $('afterSub').textContent = hasText
      ? "It's out of your head now. That was the whole point."
      : 'Even sitting with the blank counts. You showed up.';
    $('keepBtn').hidden = !hasText;
    modal.hidden = false;

    $('keepBtn').onclick = () => {
      const entry = {
        id: 't' + Date.now(),
        day: todayKey(),
        ts: new Date().toISOString(),
        mode: finished.mode,
      };
      if (finished.mode === 'type') entry.text = pad.value.trim();
      else entry.ink = ink.toDataURL('image/png');
      saveEntry(entry);
      modal.hidden = true;
      show('home');
    };
    $('clearBtn').onclick = () => {
      pad.value = '';
      clearInk();
      modal.hidden = true;
      show('home');
    };
  }

  // ── Soft chime (WebAudio, no asset) ────────────────────────
  function playChime() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      const now = ctx.currentTime;
      [528, 660].forEach((freq, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = freq;
        const t = now + i * 0.18;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.18, t + 0.04);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
        o.connect(g); g.connect(ctx.destination);
        o.start(t); o.stop(t + 1.9);
      });
      setTimeout(() => ctx.close().catch(() => {}), 2400);
    } catch { /* audio blocked — fine */ }
  }

  // ── Handwriting canvas ─────────────────────────────────────
  let inkCtx = null;
  function setupInk() {
    const dpr = window.devicePixelRatio || 1;
    const rect = ink.getBoundingClientRect();
    ink.width = rect.width * dpr;
    ink.height = rect.height * dpr;
    inkCtx = ink.getContext('2d');
    inkCtx.scale(dpr, dpr);
    const style = getComputedStyle(document.documentElement);
    inkCtx.strokeStyle = style.getPropertyValue('--fg').trim() || '#e7ddc7';
    inkCtx.lineWidth = 2.4;
    inkCtx.lineCap = 'round';
    inkCtx.lineJoin = 'round';
  }
  function clearInk() {
    if (inkCtx && ink.width) inkCtx.clearRect(0, 0, ink.width, ink.height);
  }
  let drawing = false;
  function inkPos(e) {
    const r = ink.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  ink.addEventListener('pointerdown', (e) => {
    if (!session || session.mode !== 'ink') return;
    drawing = true; ink.setPointerCapture(e.pointerId);
    const p = inkPos(e); inkCtx.beginPath(); inkCtx.moveTo(p.x, p.y);
    session.strokes.push(p); noteInput();
  });
  ink.addEventListener('pointermove', (e) => {
    if (!drawing) return;
    const p = inkPos(e); inkCtx.lineTo(p.x, p.y); inkCtx.stroke();
    session.strokes.push(p);
  });
  ink.addEventListener('pointerup', () => { drawing = false; });
  ink.addEventListener('pointercancel', () => { drawing = false; });

  // ── Export / wipe ──────────────────────────────────────────
  function exportEntries() {
    const data = { app: 'Ten', exported: new Date().toISOString(), entries: getEntries(), streak: getStreak() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `ten-export-${todayKey()}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function wipeAll() {
    if (!confirm('Erase every kept entry and your streak from this device? This cannot be undone.')) return;
    Store.write(KEYS.entries, []);
    Store.write(KEYS.streak, { count: 0, lastDay: '' });
    refreshSettings(); refreshHome();
  }

  // ── Quiet Review ───────────────────────────────────────────
  function openReview() {
    const typed = getEntries().filter((e) => e.text);
    const body = $('reviewBody');
    if (typed.length < 3) {
      body.innerHTML = '<p class="review-empty">Keep a few more entries and the patterns will surface here. ' +
        'The Review reads only what you chose to keep.</p>';
    } else {
      const words = recurringWords(typed, 24);
      if (!words.length) {
        body.innerHTML = '<p class="review-empty">No word has recurred across days yet. ' +
          'That itself is a kind of freedom — nothing is looping.</p>';
      } else {
        const max = words[0][1];
        const cloud = words.map(([w, c]) => {
          const size = 1 + (c / max) * 1.4; // 1rem … 2.4rem
          return `<span class="cloud-word" style="font-size:${size.toFixed(2)}rem" title="${c} days">${w}</span>`;
        }).join('');
        body.innerHTML = `<div class="cloud">${cloud}</div>` +
          `<p class="review-meta">From ${typed.length} kept ${typed.length === 1 ? 'entry' : 'entries'}. ` +
          `Bigger words returned on more days.</p>`;
      }
    }
    $('reviewModal').hidden = false;
  }

  // ── Settings UI ────────────────────────────────────────────
  function refreshSettings() {
    $('durSel').value = String(settings.durationMin);
    $('modeSel').value = settings.mode;
    $('themeSel').value = settings.theme;
    $('reminderTime').value = settings.reminderTime || '';
    $('entryCount').textContent = getEntries().length;
  }
  function persistSettings() { Store.write(KEYS.settings, settings); }

  function wireSettings() {
    $('durSel').onchange = (e) => { settings.durationMin = Number(e.target.value); persistSettings(); };
    $('modeSel').onchange = (e) => { settings.mode = e.target.value; persistSettings(); };
    $('themeSel').onchange = (e) => { settings.theme = e.target.value; persistSettings(); applyTheme(); };
    $('reminderTime').onchange = (e) => {
      settings.reminderTime = e.target.value; persistSettings();
      if (e.target.value) requestReminder();
    };
    $('exportBtn').onclick = exportEntries;
    $('wipeBtn').onclick = wipeAll;
    $('closeSettings').onclick = () => { $('settingsModal').hidden = true; refreshHome(); };
  }

  // ── Daily reminder (best-effort, honest) ───────────────────
  // No backend = no true push. We schedule a local notification for
  // the next occurrence while a tab/PWA can run. Honestly limited,
  // and the settings copy says so.
  let reminderTimer = null;
  function requestReminder() {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') return scheduleReminder();
    if (Notification.permission !== 'denied') {
      Notification.requestPermission().then((p) => { if (p === 'granted') scheduleReminder(); });
    }
  }
  function scheduleReminder() {
    if (reminderTimer) clearTimeout(reminderTimer);
    if (!settings.reminderTime) return;
    const [h, m] = settings.reminderTime.split(':').map(Number);
    const now = new Date();
    const next = new Date();
    next.setHours(h, m, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    const delay = next - now;
    if (delay > 0 && delay < 24 * 3600 * 1000) {
      reminderTimer = setTimeout(() => {
        if (!wroteToday() && Notification.permission === 'granted') {
          try { new Notification('Ten minutes.', { body: 'Empty your head onto the page. No one is reading.', icon: 'icons/icon.svg' }); } catch {}
        }
        scheduleReminder(); // re-arm for tomorrow
      }, delay);
    }
  }

  // ── Wire it all up ─────────────────────────────────────────
  function init() {
    applyTheme();
    home.hidden = false;
    refreshHome();

    $('beginBtn').onclick = startSession;
    $('quitBtn').onclick = () => endSession(true);
    $('doneBtn').onclick = () => endSession(false);
    pad.addEventListener('input', noteInput);

    $('settingsBtn').onclick = () => { refreshSettings(); $('settingsModal').hidden = false; };
    $('reviewBtn').onclick = openReview;
    $('closeReview').onclick = () => { $('reviewModal').hidden = true; };
    wireSettings();

    if (settings.reminderTime && 'Notification' in window && Notification.permission === 'granted') {
      scheduleReminder();
    }

    // Leaving mid-session shouldn't silently count or lose state oddly.
    window.addEventListener('beforeunload', (e) => {
      if (session) { e.preventDefault(); e.returnValue = ''; }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
