/* ═══════════════════════════════════════════════════════════
   Astro Precise — Cosmic Archetype Quiz
   ----------------------------------------------------------------
   A playful 6-question quiz that maps your answers to one of ten
   cosmic archetypes, derived from an element + modality + dominant
   planetary "vibe". It is FOR FUN — a doorway, not a reading. The
   honest path to a real result is always casting your actual chart
   (chart.html), which the result card routes to first.

   Re-themed from The Bigger Picture's awakener.js (question flow,
   buckets, result card, share + localStorage, product recs).

   Architecture mirrors the rest of the site:
     • window.AstroQuiz (no build step, attaches to window)
     • Glass-orb archetype glyphs via window.AstroIcons
     • Monetisation routes are dormant-safe via window.AP_MON
   Determinism: same answers → same archetype, every time.
   ═══════════════════════════════════════════════════════════ */
'use strict';

const AstroQuiz = (() => {

  const STORAGE_KEY = 'ap_quiz_archetype';
  const SHARE_NAME  = 'Astro Precise';

  // ── Archetypes ─────────────────────────────────────────────
  // Each is keyed by an element + modality blend, with a representative
  // sign glyph (rendered as a glass orb) and a guiding planet. Answers
  // accumulate points across these ten buckets; the highest wins.
  const ARCHETYPES = [
    {
      id: 'pioneer', name: 'The Pioneer',
      element: 'fire', modality: 'Cardinal', sign: 'Aries', planet: 'Mars',
      tagline: 'Fire · Cardinal',
      blurb: 'You move first and ask later. Where others see a wall, you see a starting line. Bold, restless, and allergic to waiting, you carry the spark that gets things moving — the one who lights the match the rest of us warm our hands by.',
      strengths: ['Initiative', 'Courage', 'Raw momentum'],
      growth: 'Letting a fire burn slow enough to last.',
    },
    {
      id: 'sovereign', name: 'The Sovereign',
      element: 'fire', modality: 'Fixed', sign: 'Leo', planet: 'Sun',
      tagline: 'Fire · Fixed',
      blurb: 'You were built to be seen — and to make others feel seen in return. Warm, loyal and quietly magnetic, you hold the centre of the room without grasping for it. People orbit your generosity. Your gift is radiance; your work is to share the light, never to hoard it.',
      strengths: ['Warmth', 'Loyalty', 'Presence'],
      growth: 'Shining for others, not only at them.',
    },
    {
      id: 'alchemist', name: 'The Alchemist',
      element: 'fire', modality: 'Mutable', sign: 'Sagittarius', planet: 'Jupiter',
      tagline: 'Fire · Mutable',
      blurb: 'You turn every experience into meaning. A seeker by nature, you chase the horizon for the view, not the destination — collecting truths, philosophies and far-off places. Optimism is your fuel and freedom your oxygen. You remind everyone that the world is bigger than their fear of it.',
      strengths: ['Vision', 'Optimism', 'Wanderlust'],
      growth: 'Landing the wisdom you keep gathering.',
    },
    {
      id: 'builder', name: 'The Builder',
      element: 'earth', modality: 'Cardinal', sign: 'Capricorn', planet: 'Saturn',
      tagline: 'Earth · Cardinal',
      blurb: 'You play the long game and you play it to win. Patient, disciplined and quietly ambitious, you turn intentions into structures that outlast the mood that made them. While others chase the spark, you lay the foundation. Your legacy is built one deliberate stone at a time.',
      strengths: ['Discipline', 'Endurance', 'Strategy'],
      growth: 'Letting the summit be enough to rest on.',
    },
    {
      id: 'cultivator', name: 'The Cultivator',
      element: 'earth', modality: 'Fixed', sign: 'Taurus', planet: 'Venus',
      tagline: 'Earth · Fixed',
      blurb: 'You make the world more beautiful, more comfortable, more real. Sensual and steady, you trust what you can touch and savour what you have. You are the calm in the storm — the one who plants something and stays long enough to watch it bloom. Your peace is contagious.',
      strengths: ['Steadiness', 'Sensuality', 'Devotion'],
      growth: 'Bending before the wind asks you to break.',
    },
    {
      id: 'artisan', name: 'The Artisan',
      element: 'earth', modality: 'Mutable', sign: 'Virgo', planet: 'Mercury',
      tagline: 'Earth · Mutable',
      blurb: 'You see the detail everyone else misses, then quietly make it right. Precise, helpful and devoted to craft, you find the sacred in the small — a tidy system, a kind correction, a job done properly. The world runs smoother because you cared enough to refine it.',
      strengths: ['Precision', 'Service', 'Discernment'],
      growth: 'Calling "good enough" a kind of perfect too.',
    },
    {
      id: 'messenger', name: 'The Messenger',
      element: 'air', modality: 'Mutable', sign: 'Gemini', planet: 'Mercury',
      tagline: 'Air · Mutable',
      blurb: 'Ideas move through you like weather. Curious, quick and endlessly connective, you can talk to anyone and link anything to anything. You carry sparks between minds that would never have met. Your superpower is translation — turning the complicated into the human.',
      strengths: ['Curiosity', 'Wit', 'Adaptability'],
      growth: 'Going deep on the few, not wide on the all.',
    },
    {
      id: 'diplomat', name: 'The Diplomat',
      element: 'air', modality: 'Cardinal', sign: 'Libra', planet: 'Venus',
      tagline: 'Air · Cardinal',
      blurb: 'You feel the balance in every room and tilt it gently back toward harmony. Fair, charming and relational to the core, you build bridges where others draw lines. You see every side — sometimes all at once — and your grace is in choosing connection over being right.',
      strengths: ['Harmony', 'Fairness', 'Charm'],
      growth: 'Choosing yourself without losing the peace.',
    },
    {
      id: 'visionary', name: 'The Visionary',
      element: 'air', modality: 'Fixed', sign: 'Aquarius', planet: 'Uranus',
      tagline: 'Air · Fixed',
      blurb: 'You live a few years ahead of everyone else. Independent, inventive and unmistakably yourself, you care about the whole more than the crowd. You break the rule that needed breaking and dream the future the rest of us catch up to. Belonging, for you, is never the same as conforming.',
      strengths: ['Originality', 'Humanity', 'Independence'],
      growth: 'Letting people close to the future you see.',
    },
    {
      id: 'mystic', name: 'The Mystic',
      element: 'water', modality: 'Mutable', sign: 'Pisces', planet: 'Neptune',
      tagline: 'Water · Mutable',
      blurb: 'You feel the unseen current under everything. Dreamy, compassionate and porous to the world, you dissolve the line between yourself and others — for better and for deeper. Art, empathy and the spiritual are your native tongue. You remind us that mystery is not a problem to solve.',
      strengths: ['Empathy', 'Imagination', 'Compassion'],
      growth: 'Keeping a shore while you swim the deep.',
    },
    {
      id: 'guardian', name: 'The Guardian',
      element: 'water', modality: 'Cardinal', sign: 'Cancer', planet: 'Moon',
      tagline: 'Water · Cardinal',
      blurb: 'You make safety wherever you go. Tender, intuitive and fiercely protective, you read the emotional room before a word is spoken and you tend to what matters most — your people, your roots, your home. Your strength is soft and unshakeable: the tide that always returns.',
      strengths: ['Nurture', 'Intuition', 'Loyalty'],
      growth: 'Letting yourself be held in return.',
    },
    {
      id: 'sorcerer', name: 'The Sorcerer',
      element: 'water', modality: 'Fixed', sign: 'Scorpio', planet: 'Pluto',
      tagline: 'Water · Fixed',
      blurb: 'You go all the way down and come back transformed. Intense, perceptive and unafraid of the dark, you see through surfaces to the truth beneath. You feel deeply and commit completely. Where others flinch, you alchemise — turning crisis into power, and endings into beginnings.',
      strengths: ['Depth', 'Magnetism', 'Resilience'],
      growth: 'Trusting before you have read the whole room.',
    },
  ];

  // Quick lookup by element+modality for scoring weights.
  const byKey = {};
  ARCHETYPES.forEach(a => { byKey[a.element + ':' + a.modality] = a.id; });

  // ── Questions ──────────────────────────────────────────────
  // Each option grants points to elements and/or modalities, plus a
  // small direct nudge to a specific archetype. The winning archetype
  // is the one whose element + modality blend scores highest.
  // Scores are split into: el (element), mod (modality), pl (planet feel).
  const QUESTIONS = [
    {
      q: 'A free weekend lands in your lap. What actually happens?',
      options: [
        { text: 'I start something — a project, a trip, a plan only I can see yet', el: 'fire', mod: 'Cardinal' },
        { text: 'I get hands-on: cook, garden, make, build something real', el: 'earth', mod: 'Fixed' },
        { text: 'I meet people, swap ideas, fall down a dozen rabbit holes', el: 'air', mod: 'Mutable' },
        { text: 'I retreat into feeling — music, water, a long quiet dream', el: 'water', mod: 'Mutable' },
      ],
    },
    {
      q: 'When the group can\'t agree, you tend to be the one who…',
      options: [
        { text: 'Just decides and gets us moving', el: 'fire', mod: 'Cardinal' },
        { text: 'Holds steady and refuses to be rushed into nonsense', el: 'earth', mod: 'Fixed' },
        { text: 'Finds the words that let everyone feel heard', el: 'air', mod: 'Cardinal' },
        { text: 'Senses what people actually need underneath the argument', el: 'water', mod: 'Cardinal' },
      ],
    },
    {
      q: 'Which compliment would secretly mean the most?',
      options: [
        { text: '"You make things happen."', el: 'fire', mod: 'Cardinal' },
        { text: '"You\'re someone I can always rely on."', el: 'earth', mod: 'Fixed' },
        { text: '"Talking to you makes me think differently."', el: 'air', mod: 'Mutable' },
        { text: '"Being around you, I feel completely understood."', el: 'water', mod: 'Mutable' },
      ],
    },
    {
      q: 'Your relationship with change is best described as…',
      options: [
        { text: 'I love it — I\'m usually the one causing it', el: 'fire', mod: 'Mutable' },
        { text: 'I\'d rather build something that lasts than chase the new', el: 'earth', mod: 'Cardinal' },
        { text: 'I adapt instantly — I\'m water that finds the gap', el: 'air', mod: 'Mutable' },
        { text: 'I transform through it, even when it hurts', el: 'water', mod: 'Fixed' },
      ],
    },
    {
      q: 'Pick the night sky that calls to you.',
      options: [
        { text: 'A blazing comet tearing a bright line across the dark', el: 'fire', mod: 'Fixed' },
        { text: 'A steady, full harvest moon low and gold on the horizon', el: 'earth', mod: 'Mutable' },
        { text: 'A wide field of stars, each one a story to connect', el: 'air', mod: 'Fixed' },
        { text: 'The deep tide pulling beneath an unseen new moon', el: 'water', mod: 'Cardinal' },
      ],
    },
    {
      q: 'At your absolute best, what do you bring to the world?',
      options: [
        { text: 'The spark — courage, momentum, the first brave move', el: 'fire', mod: 'Cardinal' },
        { text: 'The foundation — beauty, patience, things that endure', el: 'earth', mod: 'Fixed' },
        { text: 'The connection — ideas, fairness, bridges between minds', el: 'air', mod: 'Cardinal' },
        { text: 'The depth — empathy, intuition, the truth beneath', el: 'water', mod: 'Fixed' },
      ],
    },
  ];

  // ── State ──────────────────────────────────────────────────
  let container = null;
  let step = 0;
  let elementScores = {};
  let modalityScores = {};
  let chosenArchetypeId = null;

  function reset() {
    step = 0;
    elementScores = { fire: 0, earth: 0, air: 0, water: 0 };
    modalityScores = { Cardinal: 0, Fixed: 0, Mutable: 0 };
    chosenArchetypeId = null;
  }

  // ── Escape helper (defensive — content is static, but keep it clean) ──
  function esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  // ── Resolve winning archetype from accumulated scores ──────
  function resolveArchetype() {
    let topEl = 'fire', topElScore = -1;
    for (const k of Object.keys(elementScores)) {
      if (elementScores[k] > topElScore) { topElScore = elementScores[k]; topEl = k; }
    }
    let topMod = 'Cardinal', topModScore = -1;
    for (const k of Object.keys(modalityScores)) {
      if (modalityScores[k] > topModScore) { topModScore = modalityScores[k]; topMod = k; }
    }
    // Exact element+modality match exists for all 12 combos.
    const id = byKey[topEl + ':' + topMod];
    return ARCHETYPES.find(a => a.id === id) || ARCHETYPES[0];
  }

  // ── Render: a single question ──────────────────────────────
  function renderQuestion() {
    clearMountBoot();
    container.classList.remove('aq-mount--result');
    if (step >= QUESTIONS.length) { showResult(); return; }
    const Q = QUESTIONS[step];
    const pct = Math.round((step / QUESTIONS.length) * 100);

    container.innerHTML = `
      <div class="aq-card">
        <div class="aq-progress-label">Question ${step + 1} of ${QUESTIONS.length}</div>
        <h2 class="aq-question">${esc(Q.q)}</h2>
        <div class="aq-options" role="group" aria-label="Answer choices">
          ${Q.options.map((opt, i) => `
            <button class="aq-option" data-index="${i}"
              data-element="${opt.el}">
              <span class="aq-option__dot" aria-hidden="true"></span>
              <span class="aq-option__text">${esc(opt.text)}</span>
            </button>
          `).join('')}
        </div>
        <div class="aq-progress" aria-hidden="true">
          <div class="aq-progress__fill" style="width:${pct}%"></div>
        </div>
      </div>
    `;

    container.querySelectorAll('.aq-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.index, 10);
        const opt = Q.options[idx];
        elementScores[opt.el] = (elementScores[opt.el] || 0) + 2;
        modalityScores[opt.mod] = (modalityScores[opt.mod] || 0) + 2;
        step++;
        renderQuestion();
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  // ── Build a monetisation-aware route block ─────────────────
  // Honest + dormant-safe: a real chart is always the primary CTA.
  // Deep Reading / product / email only light up when AP_MON has a URL;
  // otherwise they degrade to email-intent or quietly vanish (data-mon).
  function buildRoutes(arch) {
    const M = window.AP_MON || {};
    const isUrl = u => typeof u === 'string' && /^https?:\/\//i.test(u.trim());

    // Pick a product whose vibe matches: apparel for fire/air (expressive),
    // print for earth (lasting), reading for water (inner). Falls back safely.
    const commerce = (M.commerce && Array.isArray(M.commerce.products)) ? M.commerce.products : [];
    const prefByElement = {
      fire: 'sky-tee', air: 'sky-tee',
      earth: 'natal-poster', water: 'deep-reading',
    };
    const wantId = prefByElement[arch.element] || 'natal-poster';
    const product = commerce.find(p => p.id === wantId)
      || commerce.find(p => p.id === 'natal-poster')
      || commerce[0] || null;

    const rows = [];

    // 1) PRIMARY — cast the real chart (always live, internal link).
    rows.push(`
      <a class="aq-route aq-route--primary" href="chart.html">
        <span class="aq-route__icon" aria-hidden="true"><svg class="eng-i" aria-hidden="true"><use href="#ei-star4"/></svg></span>
        <span class="aq-route__body">
          <span class="aq-route__title">Cast your real birth chart</span>
          <span class="aq-route__sub">See your actual Sun, Moon &amp; Rising — computed from the real sky, free.</span>
        </span>
        <span class="aq-route__arrow" aria-hidden="true">→</span>
      </a>
    `);

    // 2) DEEP READING — dormant-safe. Live link if configured, else email-intent.
    if (isUrl(M.deepReadingUrl)) {
      rows.push(`
        <a class="aq-route" href="${esc(M.deepReadingUrl.trim())}" target="_blank" rel="noopener">
          <span class="aq-route__icon" aria-hidden="true">❧</span>
          <span class="aq-route__body">
            <span class="aq-route__title">Get your Deep Reading</span>
            <span class="aq-route__sub">A long-form written reading of your whole chart, yours to keep.</span>
          </span>
          <span class="aq-route__arrow" aria-hidden="true">→</span>
        </a>
      `);
    } else {
      rows.push(`
        <button class="aq-route" id="aq-deep-reading" type="button">
          <span class="aq-route__icon" aria-hidden="true">❧</span>
          <span class="aq-route__body">
            <span class="aq-route__title">Be first to read your Deep Reading</span>
            <span class="aq-route__sub">Long-form written readings open soon — get told when they do.</span>
          </span>
          <span class="aq-route__arrow" aria-hidden="true">→</span>
        </button>
      `);
    }

    // 3) PRODUCT — dormant-safe. Live "Buy" if the product has a fulfilUrl;
    // otherwise route to the shop page (real, pre-launch honest cart).
    if (product) {
      const live = isUrl(product.fulfilUrl);
      const href = live ? esc(product.fulfilUrl.trim()) : 'shop.html';
      const targetAttr = live ? ' target="_blank" rel="noopener"' : '';
      const priceTxt = (typeof product.price === 'number')
        ? '$' + product.price.toFixed(2) : '';
      rows.push(`
        <a class="aq-route" href="${href}"${targetAttr}>
          <span class="aq-route__icon" aria-hidden="true">◈</span>
          <span class="aq-route__body">
            <span class="aq-route__title">${esc(product.name)}${priceTxt ? ' · <span class="aq-route__price">' + priceTxt + '</span>' : ''}</span>
            <span class="aq-route__sub">${live ? 'A piece matched to your archetype — made from your own chart.' : 'A piece matched to your archetype — the shop opens soon.'}</span>
          </span>
          <span class="aq-route__arrow" aria-hidden="true">→</span>
        </a>
      `);
    }

    return rows.join('');
  }

  // ── Email capture (dormant-safe via AP_MON.emailUrl) ───────
  function buildEmailCapture() {
    return `
      <form class="aq-email" id="aq-email-form" novalidate>
        <label class="aq-email__label" for="aq-email-input">
          Want your archetype + 3 cosmic wallpapers? Drop your email.
        </label>
        <div class="aq-email__row">
          <input class="aq-email__input" id="aq-email-input" type="email"
            inputmode="email" autocomplete="email" placeholder="you@example.com"
            aria-label="Email address" />
          <button class="btn btn--gold btn--sm" type="submit">Send it</button>
        </div>
        <p class="aq-email__note" id="aq-email-note">
          Private by design — your email is saved on your device until a list is live.
        </p>
      </form>
    `;
  }

  function wireEmailCapture() {
    const form = container.querySelector('#aq-email-form');
    if (!form) return;
    const input = form.querySelector('#aq-email-input');
    const note = form.querySelector('#aq-email-note');
    const M = window.AP_MON || {};
    const isUrl = u => typeof u === 'string' && /^https?:\/\//i.test(u.trim());

    form.addEventListener('submit', e => {
      e.preventDefault();
      const val = (input.value || '').trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val)) {
        note.textContent = 'That email doesn\'t look right — mind checking it?';
        note.style.color = 'var(--color-danger, #ef4444)';
        input.focus();
        return;
      }
      if (isUrl(M.emailUrl)) {
        // A real list is configured — hand off via a hidden form POST.
        try {
          const f = document.createElement('form');
          f.method = 'POST';
          f.action = M.emailUrl.trim();
          f.target = '_blank';
          const inp = document.createElement('input');
          inp.type = 'hidden'; inp.name = 'email'; inp.value = val;
          f.appendChild(inp);
          document.body.appendChild(f);
          f.submit();
          f.remove();
        } catch (_) { /* fall through to local save */ }
      } else {
        // DORMANT — save intent locally only; nothing leaves the device.
        try {
          const queue = JSON.parse(localStorage.getItem('ap_email_intent') || '[]');
          queue.push({ email: val, source: 'quiz', archetype: chosenArchetypeId, at: Date.now() });
          localStorage.setItem('ap_email_intent', JSON.stringify(queue));
        } catch (_) { /* ignore storage failures */ }
      }
      note.textContent = 'Saved — you\'re on the list. Thank you.';
      note.style.color = 'var(--color-gold, #C9A227)';
      input.disabled = true;
      form.querySelector('button[type="submit"]').disabled = true;
    });
  }

  function clearMountBoot() {
    if (!container) return;
    container.classList.remove('is-booting', 'is-revealing');
  }

  function primeResultLayout() {
    if (!container) return;
    container.classList.add('aq-mount--result');
  }

  // ── Render: the result card ────────────────────────────────
  function showResult() {
    const arch = resolveArchetype();
    chosenArchetypeId = arch.id;
    primeResultLayout();

    // Persist (deterministic, shareable).
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        id: arch.id, name: arch.name, element: arch.element,
        modality: arch.modality, sign: arch.sign, planet: arch.planet,
        at: Date.now(),
      }));
    } catch (_) { /* storage may be unavailable */ }

    // Glass-orb glyph for the archetype's representative sign.
    const orb = (window.AstroIcons && window.AstroIcons.sign)
      ? window.AstroIcons.sign(arch.sign, { xl: true, label: arch.name })
      : `<span class="aq-orb-fallback eng-star-mark" style="color:var(--gold);"></span>`;

    const shareText = `My cosmic archetype is ${arch.name} (${arch.tagline}) — Discover yours at ${SHARE_NAME}`;

    clearMountBoot();
    container.innerHTML = `
      <div class="aq-result" data-element="${arch.element}">
        <div class="aq-result__eyebrow">Your Cosmic Archetype</div>
        <div class="aq-result__orb">${orb}</div>
        <h2 class="aq-result__name">${esc(arch.name)}</h2>
        <div class="aq-result__tagline">${esc(arch.tagline)} · guided by ${esc(arch.planet)}</div>
        <p class="aq-result__blurb">${esc(arch.blurb)}</p>

        <div class="aq-traits">
          <div class="aq-traits__block">
            <span class="aq-traits__label">Your gifts</span>
            <ul class="aq-traits__list">
              ${arch.strengths.map(s => `<li>${esc(s)}</li>`).join('')}
            </ul>
          </div>
          <div class="aq-traits__block">
            <span class="aq-traits__label">Your growing edge</span>
            <p class="aq-traits__edge">${esc(arch.growth)}</p>
          </div>
        </div>

        <div class="aq-disclaimer">
          This quiz is a doorway, not a reading. Your <em>real</em> archetype lives in
          your actual birth chart — cast it free below to see the true sky you were born under.
        </div>

        <div class="aq-routes">
          ${buildRoutes(arch)}
        </div>

        ${buildEmailCapture()}

        <div class="aq-share">
          <button class="btn btn--outline btn--sm" id="aq-share-btn" type="button">Share ↗</button>
          <button class="btn btn--outline btn--sm" id="aq-restart-btn" type="button">Take it again</button>
        </div>
      </div>
    `;

    // Wire deep-reading dormant fallback → focus the email capture.
    const drBtn = container.querySelector('#aq-deep-reading');
    if (drBtn) {
      drBtn.addEventListener('click', () => {
        const inp = container.querySelector('#aq-email-input');
        if (inp) { inp.focus(); inp.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
        if (window.AstroApp && AstroApp.showToast) {
          AstroApp.showToast('Almost there', 'Deep Readings open soon — leave your email to be first.', 'info');
        }
      });
    }

    wireEmailCapture();

    // Share — native share sheet, clipboard fallback.
    const shareBtn = container.querySelector('#aq-share-btn');
    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        const url = window.location.href.split('#')[0];
        if (navigator.share) {
          navigator.share({ title: arch.name + ' — ' + SHARE_NAME, text: shareText, url })
            .catch(() => {});
        } else if (navigator.clipboard) {
          navigator.clipboard.writeText(shareText + ' ' + url).then(() => {
            shareBtn.textContent = 'Copied!';
            setTimeout(() => { shareBtn.textContent = 'Share ↗'; }, 2000);
          }).catch(() => {});
        }
      });
    }

    // Restart.
    const restartBtn = container.querySelector('#aq-restart-btn');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => {
        reset();
        renderQuestion();
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }

    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function wireIntro(saved) {
    const startBtn = container.querySelector('#aq-start-btn');
    if (startBtn && !startBtn.dataset.wired) {
      startBtn.dataset.wired = '1';
      startBtn.addEventListener('click', () => {
        reset();
        renderQuestion();
      });
    }
    const resumeBtn = container.querySelector('#aq-resume-btn');
    if (resumeBtn && !resumeBtn.dataset.wired) {
      resumeBtn.dataset.wired = '1';
      resumeBtn.addEventListener('click', () => {
        const arch = ARCHETYPES.find(a => a.id === saved.id);
        if (arch) {
          reset();
          elementScores[arch.element] = 10;
          modalityScores[arch.modality] = 10;
          step = QUESTIONS.length;
          showResult();
        }
      });
    }
  }

  // ── Intro screen with optional "resume last result" ────────
  function renderIntro() {
    clearMountBoot();
    container.classList.remove('aq-mount--result');
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch (_) {}

    const existingIntro = container.querySelector('.aq-intro');
    if (existingIntro) {
      if (saved && saved.name && !container.querySelector('#aq-resume-btn')) {
        const resume = document.createElement('button');
        resume.className = 'aq-resume';
        resume.id = 'aq-resume-btn';
        resume.type = 'button';
        resume.innerHTML = 'Last time you were <strong>' + esc(saved.name) + '</strong> — view it again';
        existingIntro.appendChild(resume);
      }
      wireIntro(saved);
      return;
    }

    const resumeRow = (saved && saved.name) ? `
      <button class="aq-resume" id="aq-resume-btn" type="button">
        Last time you were <strong>${esc(saved.name)}</strong> — view it again
      </button>
    ` : '';

    container.innerHTML = `
      <div class="aq-card aq-intro">
        <div class="aq-intro__seal" aria-hidden="true"><span class="eng-star-mark" style="color:var(--gold);width:1.4em;height:1.4em;"></span></div>
        <h2 class="aq-intro__title">Which cosmic archetype are you?</h2>
        <p class="aq-intro__sub">
          Six questions. One archetype, drawn from the timeless language of element,
          modality and planet. It takes about ninety seconds — and points you toward
          your real chart at the end.
        </p>
        <button class="btn btn--primary btn--lg" id="aq-start-btn" type="button">Begin the quiz</button>
        ${resumeRow}
      </div>
    `;

    wireIntro(saved);
  }

  // ── Init ───────────────────────────────────────────────────
  function init(mountId) {
    container = document.getElementById(mountId || 'aq-mount');
    if (!container) return;
    reset();
    renderIntro();
  }

  return {
    init,
    ARCHETYPES,
    QUESTIONS,
    // Exposed for testing / reuse.
    _resolve: resolveArchetype,
  };
})();

window.AstroQuiz = AstroQuiz;

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('aq-mount')) {
    AstroQuiz.init('aq-mount');
  }
});
