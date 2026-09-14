/**
 * Astro Precise — Reading format utilities
 * Applies readability psychology: chunking, primacy lead, progressive disclosure,
 * optimal measure (~65ch), scannable hierarchy.
 */
(function () {
  'use strict';

  const esc = (window.AP_SAFE && window.AP_SAFE.esc)
    ? function (s) { return window.AP_SAFE.esc(s); }
    : function (s) {
      return String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    };

  function stripTags(html) {
    const d = document.createElement('div');
    d.innerHTML = html;
    return (d.textContent || d.innerText || '').trim();
  }

  function slugify(title) {
    return String(title || 'section')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /** First sentence — primacy hook (curiosity / orientation). */
  function firstSentence(text) {
    const plain = stripTags(text);
    if (!plain) return '';
    const m = plain.match(/^[\s\S]*?[.!?](?=\s|$)/);
    return (m ? m[0] : plain.slice(0, 160)).trim();
  }

  const TEXTBOOK_PERSON = /\b(these individuals|this individual|natives of|the natives|the native|this native|people with this placement)\b/i;
  const TEXTBOOK_VOICE = /\b(at the collective level|in a natal chart, the house position|marks a generation called|this placement|traditionally (?:read|associated)|in modern nodal astrology|the (?:first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth) house governs)\b/i;

  function isTextbookPerson(s) {
    const P = window.APPlainPlacement;
    if (P && typeof P.isTextbookPerson === 'function') return P.isTextbookPerson(s);
    return TEXTBOOK_PERSON.test(String(s || ''));
  }

  function isTextbookVoice(s) {
    const t = String(s || '');
    if (isTextbookPerson(t)) return true;
    const P = window.APPlainPlacement;
    if (P && typeof P.isTextbookVoice === 'function') return P.isTextbookVoice(t);
    return TEXTBOOK_VOICE.test(t);
  }

  function rewritePersonLead(s) {
    let t = String(s || '');
    t = t.replace(/\bthese individuals\b/gi, 'you');
    t = t.replace(/\bpeople with this placement\b/gi, 'you');
    t = t.replace(/\bnatives of(?: this sign)?\b/gi, 'you');
    t = t.replace(/\bthe natives\b/gi, 'you');
    t = t.replace(/\bthe native\b/gi, 'you');
    t = t.replace(/\bthis native\b/gi, 'you');
    t = t.replace(/\bthemselves\b/g, 'yourself');
    t = t.replace(/\bthemself\b/g, 'yourself');
    t = t.replace(/\bTheir\b/g, 'Your');
    t = t.replace(/\btheir\b/g, 'your');
    t = t.replace(/\bThey\b/g, 'You');
    t = t.replace(/\bthey\b/g, 'you');
    t = t.replace(/\byou is\b/g, 'you are');
    t = t.replace(/\byou loves\b/gi, 'you love');
    t = t.replace(/\byou seeks\b/gi, 'you seek');
    t = t.replace(/\byou occupies\b/gi, 'you occupy');
    t = t.replace(/\byou experiences\b/gi, 'you experience');
    t = t.replace(/\byou discovers\b/gi, 'you discover');
    t = t.replace(/\byou knows\b/gi, 'you know');
    t = t.replace(/\s+/g, ' ').trim();
    if (/^you\b/i.test(t)) t = 'You' + t.slice(3);
    return t;
  }

  /**
   * Visible card lead: you-voice. Textbook first sentences never paint.
   * Prefer a caller-supplied you-line, then APPlainPlacement, then a rewrite.
   */
  function looksLikeYouLead(s) {
    return /^(Your|Yours|You(?:'re|’re| are)?)\b/i.test(String(s || '').trim());
  }

  function paintedLead(plain, opts) {
    opts = opts || {};
    const P = window.APPlainPlacement;
    const supplied = stripTags(opts.lead || '');
    if (supplied && !isTextbookVoice(supplied)) return supplied;
    const first = firstSentence(plain);
    if (first && looksLikeYouLead(first) && !isTextbookVoice(first)) return first;
    if (P) {
      if (opts.title && typeof P.fromTitle === 'function') {
        const viaTitle = P.fromTitle(opts.title, opts.house);
        if (viaTitle) return viaTitle;
      }
      if (first && typeof P.fromPlain === 'function') {
        const viaPlain = P.fromPlain(first, opts.house);
        if (viaPlain) return viaPlain;
      }
      if (plain && typeof P.fromPlain === 'function') {
        const viaBody = P.fromPlain(plain, opts.house);
        if (viaBody) return viaBody;
      }
      if (opts.planet1 && opts.planet2 && typeof P.aspectLine === 'function') {
        const viaAspect = P.aspectLine(opts.planet1, opts.planet2, opts.aspect);
        if (viaAspect) return viaAspect;
      }
    }
    if (first && isTextbookPerson(first)) {
      const rewritten = rewritePersonLead(first);
      if (rewritten && looksLikeYouLead(rewritten) && !isTextbookPerson(rewritten)) return rewritten;
    }
    if (!first || isTextbookVoice(first)) return '';
    return first;
  }

  function keepSourceProse(you, origFirst, opts) {
    if (opts && opts.keepAll) return true;
    if (!you) return true;
    return you !== origFirst;
  }

  /** Split prose into digestible chunks (2–3 sentences) — reduces cognitive load. */
  function chunkSentences(text, maxPerChunk) {
    const plain = stripTags(text);
    if (!plain) return [];
    const max = maxPerChunk || 2;
    const sentences = plain.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [plain];
    const chunks = [];
    let buf = [];
    sentences.forEach(function (s) {
      const t = s.trim();
      if (!t) return;
      buf.push(t);
      if (buf.length >= max) {
        chunks.push(buf.join(' '));
        buf = [];
      }
    });
    if (buf.length) chunks.push(buf.join(' '));
    return chunks;
  }

  function estimateReadMin(text) {
    const words = stripTags(text).split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 200));
  }

  function readingLead(text, opts) {
    const lead = paintedLead(stripTags(text), opts || {});
    if (!lead) return '';
    return '<p class="ap-reading__lead">' + esc(lead) + '</p>';
  }

  function readingBody(text, opts) {
    opts = opts || {};
    const plain = stripTags(text);
    let rest = plain;
    if (!opts.keepAll) {
      const lead = firstSentence(plain);
      if (lead && plain.indexOf(lead) === 0) {
        rest = plain.slice(lead.length).trim();
      }
    }
    const chunks = chunkSentences(rest, opts.sentencesPerChunk || 2);
    if (!chunks.length) return '';
    return chunks.map(function (c) {
      return '<p class="ap-reading__p">' + esc(c) + '</p>';
    }).join('');
  }

  function readingCard(opts) {
    opts = opts || {};
    const title = opts.title || 'Reading';
    const id = opts.id || ('reading-' + slugify(title));
    const eyebrow = opts.eyebrow || '';
    const html = opts.html || opts.text || '';
    const plain = stripTags(html);
    const you = paintedLead(plain, opts);
    const origFirst = firstSentence(plain);
    const leadHtml = opts.skipLead ? '' : (you ? '<p class="ap-reading__lead">' + esc(you) + '</p>' : '');
    const bodyHtml = readingBody(plain, Object.assign({}, opts, { keepAll: keepSourceProse(you, origFirst, opts) }));
    const icon = opts.icon || '';
    const featured = !!opts.featured;
    const collapsed = !!opts.collapsed;

    let inner = '';
    if (eyebrow) {
      inner += '<p class="ap-reading-card__eyebrow">' + esc(eyebrow) + '</p>';
    }
    inner += '<h4 class="ap-reading-card__title">' + esc(title) + '</h4>';
    if (leadHtml) inner += leadHtml;
    if (bodyHtml && !collapsed) inner += '<div class="ap-reading-card__body">' + bodyHtml + '</div>';

    if (collapsed && bodyHtml && plain.length > 80) {
      inner += '<details class="ap-reading-details">';
      inner += '<summary class="ap-reading-details__summary">Continue reading</summary>';
      inner += '<div class="ap-reading-details__content">';
      inner += '<div class="ap-reading-card__body">' + bodyHtml + '</div>';
      inner += '</div></details>';
    } else if (collapsed && bodyHtml) {
      inner += '<div class="ap-reading-card__body">' + bodyHtml + '</div>';
    }

    return (
      '<article class="ap-reading-card' + (featured ? ' ap-reading-card--featured' : '') + '" id="' + esc(id) + '">' +
      (icon ? '<div class="ap-reading-card__icon" aria-hidden="true">' + icon + '</div>' : '') +
      '<div class="ap-reading-card__content">' + inner + '</div>' +
      '</article>'
    );
  }

  function readingHero(opts) {
    opts = opts || {};
    const name = opts.name || 'Your chart';
    const chips = (opts.chips || []).map(function (c) {
      return '<span class="ap-reading-chip">' + esc(c) + '</span>';
    }).join('');
    const mins = opts.readMin || 3;
    return (
      '<header class="ap-reading-hero">' +
      '<p class="ap-reading-hero__eyebrow">Personal reading</p>' +
      '<h3 class="ap-reading-hero__title">' + esc(name) + '</h3>' +
      (chips ? '<div class="ap-reading-hero__chips">' + chips + '</div>' : '') +
      '<p class="ap-reading-hero__hint">About ' + mins + ' min · First lines are you; the longer textbook waits under each heading</p>' +
      '</header>'
    );
  }

  function readingToc(items) {
    if (!items || !items.length) return '';
    const links = items.map(function (it) {
      const id = it.id || ('reading-' + slugify(it.title));
      return '<a class="ap-reading-toc__link" href="#' + esc(id) + '">' + esc(it.title) + '</a>';
    }).join('');
    return '<nav class="ap-reading-toc" aria-label="Jump to section">' + links + '</nav>';
  }

  function placementCard(opts) {
    opts = opts || {};
    const title = opts.title || '';
    const meta = opts.meta || '';
    const text = opts.text || '';
    const icon = opts.icon || '';
    const plain = stripTags(text);
    const you = paintedLead(plain, opts);
    if (!plain && !title && !you) return '';

    let body = '';
    if (you) {
      body += '<p class="ap-reading__lead">' + esc(you) + '</p>';
    }
    if (plain && (!you || plain !== you)) {
      const origFirst = firstSentence(plain);
      const more = readingBody(plain, {
        sentencesPerChunk: 2,
        keepAll: keepSourceProse(you, origFirst, opts)
      });
      if (more) {
        body += '<details class="ap-reading-details">' +
          '<summary class="ap-reading-details__summary">More about this placement</summary>' +
          '<div class="ap-reading-details__content"><div class="ap-reading-card__body">' + more + '</div></div>' +
          '</details>';
      }
    }

    return (
      '<article class="ap-reading-card ap-reading-card--placement">' +
      (icon ? '<div class="ap-reading-card__icon">' + icon + '</div>' : '') +
      '<div class="ap-reading-card__content">' +
      '<h4 class="ap-reading-card__title">' + esc(title) + '</h4>' +
      (meta ? '<p class="ap-reading-card__meta">' + esc(meta) + '</p>' : '') +
      body +
      '</div></article>'
    );
  }

  function aspectCard(opts) {
    const d = opts.display || {};
    const interp = opts.interpretation || '';
    const plain = stripTags(interp);
    const you = paintedLead(plain, opts);
    const title = (opts.planet1 || '') + ' ' + (d.name || opts.aspect || '') + ' ' + (opts.planet2 || '');
    const meta = opts.meta ||
      ('Computed angle' + (opts.orb != null ? ' · ' + opts.orb.toFixed(1) + '° off exact' : ''));
    let body = '';
    if (you) {
      body += '<p class="ap-reading__lead">' + esc(you) + '</p>';
    }
    if (plain && (!you || plain !== you)) {
      const origFirst = firstSentence(plain);
      body += '<details class="ap-reading-details ap-reading-details--aspect">' +
        '<summary class="ap-reading-details__summary">More about this conversation</summary>' +
        '<div class="ap-reading-details__content">' +
        '<div class="ap-reading-card__body">' + readingBody(plain, {
          keepAll: keepSourceProse(you, origFirst, opts)
        }) + '</div>' +
        '</div></details>';
    }
    return (
      '<article class="ap-reading-card ap-reading-card--aspect" style="--aspect-color:' + esc(d.color || 'var(--ap-ion, #8BA9FF)') + '">' +
      '<div class="ap-reading-card__accent" aria-hidden="true"></div>' +
      '<div class="ap-reading-card__content">' +
      '<div class="ap-reading-card__head-row">' +
      '<span class="ap-reading-card__aspect-glyph" aria-hidden="true">' + esc(d.glyph || '·') + '</span>' +
      '<div><h4 class="ap-reading-card__title">' + esc(title.trim()) + '</h4>' +
'<p class="ap-reading-card__meta">' + esc(meta) + '</p></div>' +
      '</div>' + body +
      '</div></article>'
    );
  }

  window.ReadingFormat = {
    esc: esc,
    stripTags: stripTags,
    slugify: slugify,
    firstSentence: firstSentence,
    paintedLead: paintedLead,
    isTextbookPerson: isTextbookPerson,
    isTextbookVoice: isTextbookVoice,
    chunkSentences: chunkSentences,
    estimateReadMin: estimateReadMin,
    card: readingCard,
    hero: readingHero,
    toc: readingToc,
    placement: placementCard,
    aspect: aspectCard,
    lead: readingLead,
    body: readingBody,
  };
})();
