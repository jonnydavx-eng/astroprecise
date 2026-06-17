/**
 * AstroPrecise — Reading format utilities
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

  function readingLead(text) {
    const lead = firstSentence(text);
    if (!lead) return '';
    return '<p class="ap-reading__lead">' + esc(lead) + '</p>';
  }

  function readingBody(text, opts) {
    opts = opts || {};
    const plain = stripTags(text);
    const lead = firstSentence(plain);
    let rest = plain;
    if (lead && plain.indexOf(lead) === 0) {
      rest = plain.slice(lead.length).trim();
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
    const leadHtml = opts.skipLead ? '' : readingLead(plain);
    const bodyHtml = readingBody(plain, opts);
    const icon = opts.icon || '';
    const featured = !!opts.featured;
    const collapsed = !!opts.collapsed;

    let inner = '';
    if (eyebrow) {
      inner += '<p class="ap-reading-card__eyebrow">' + esc(eyebrow) + '</p>';
    }
    inner += '<h4 class="ap-reading-card__title">' + esc(title) + '</h4>';
    if (leadHtml && !collapsed) inner += leadHtml;
    if (bodyHtml && !collapsed) inner += '<div class="ap-reading-card__body">' + bodyHtml + '</div>';

    if (collapsed && plain.length > 80) {
      inner += '<details class="ap-reading-details">';
      inner += '<summary class="ap-reading-details__summary">Continue reading</summary>';
      inner += '<div class="ap-reading-details__content">';
      if (!leadHtml) inner += readingLead(plain);
      inner += '<div class="ap-reading-card__body">' + readingBody(plain, opts) + '</div>';
      inner += '</div></details>';
    } else if (collapsed && plain) {
      inner += '<div class="ap-reading-card__body">' + readingBody(plain, opts) + '</div>';
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
      '<p class="ap-reading-hero__hint">About ' + mins + ' min · Lead lines summarise each section — expand for depth</p>' +
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
    if (!plain && !title) return '';

    let body = '';
    if (plain) {
      body += readingLead(plain);
      body += '<div class="ap-reading-card__body">' + readingBody(plain, { sentencesPerChunk: 2 }) + '</div>';
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
    const title = (opts.planet1 || '') + ' ' + (d.name || opts.aspect || '') + ' ' + (opts.planet2 || '');
    let body = '';
    if (plain) {
      body = readingLead(plain) +
        '<details class="ap-reading-details ap-reading-details--aspect">' +
        '<summary class="ap-reading-details__summary">What this means for you</summary>' +
        '<div class="ap-reading-details__content">' +
        '<div class="ap-reading-card__body">' + readingBody(plain) + '</div>' +
        '</div></details>';
    }
    return (
      '<article class="ap-reading-card ap-reading-card--aspect" style="--aspect-color:' + esc(d.color || 'var(--gold)') + '">' +
      '<div class="ap-reading-card__accent" aria-hidden="true"></div>' +
      '<div class="ap-reading-card__content">' +
      '<div class="ap-reading-card__head-row">' +
      '<span class="ap-reading-card__aspect-glyph" aria-hidden="true">' + esc(d.glyph || '·') + '</span>' +
      '<div><h4 class="ap-reading-card__title">' + esc(title.trim()) + '</h4>' +
      '<p class="ap-reading-card__meta">' + esc((opts.applying ? 'Applying' : 'Separating') + ' · ' + (opts.orb != null ? opts.orb.toFixed(1) + '° orb' : '')) + '</p></div>' +
      '</div>' + body +
      '</div></article>'
    );
  }

  window.ReadingFormat = {
    esc: esc,
    stripTags: stripTags,
    slugify: slugify,
    firstSentence: firstSentence,
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