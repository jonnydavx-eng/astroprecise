/**
 * AstroPrecise — "Your Cosmic Story" narrative generator.
 *
 * Weaves the rich per-placement interpretation corpus (window.AstroInterpretations)
 * into a flowing, second-person NARRATIVE — a story, not a report. Every sentence
 * of substance is drawn from the real chart (VSOP87 signs → the curated corpus);
 * only the connective framing is templated. Deterministic: same chart → same story.
 *
 *   window.CosmicStory.build({ name, sun, moon, rising, mercury, venus, mars,
 *                              saturn, northNode, element, modality, ruler })
 *     → HTML string (movements with Cinzel sub-headings + prose).
 *
 * Sign values are plain capitalised strings ("Aries"); getPlanetInterpretation is
 * case-insensitive, so callers may pass either casing.
 */
(function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function interp(planet, sign) {
    if (!sign) return '';
    var I = window.AstroInterpretations || window.Interpretations;
    if (I && typeof I.getPlanetInterpretation === 'function') {
      return I.getPlanetInterpretation(planet, sign) || '';
    }
    return '';
  }

  // A short, sign-keyed adjective so the connective prose feels chart-specific
  // without inventing astrology (purely tonal flavour from the element).
  var ELEMENT_OF = {
    Aries: 'fire', Leo: 'fire', Sagittarius: 'fire',
    Taurus: 'earth', Virgo: 'earth', Capricorn: 'earth',
    Gemini: 'air', Libra: 'air', Aquarius: 'air',
    Cancer: 'water', Scorpio: 'water', Pisces: 'water',
  };
  var ELEMENT_LINE = {
    Fire: 'You move through life as flame does — forward, warm, impatient with anything that will not catch light.',
    Earth: 'You move through life as earth does — deliberate, sensory, building things meant to outlast the season.',
    Air: 'You move through life as air does — quick, connective, forever turning experience into language and idea.',
    Water: 'You move through life as water does — feeling first, finding the level, shaped by everything you touch and shaping it back.',
  };

  function movement(heading, kicker, paras) {
    var body = paras.filter(Boolean).map(function (p) {
      return '<p class="cstory__p">' + p + '</p>';
    }).join('');
    if (!body) return '';
    return '<section class="cstory__mv">' +
      '<p class="cstory__kicker">' + esc(kicker) + '</p>' +
      '<h2 class="cstory__h">' + esc(heading) + '</h2>' +
      body + '</section>';
  }

  function build(d) {
    d = d || {};
    var name = (d.name && String(d.name).trim()) ? String(d.name).trim() : '';
    var you = name ? esc(name) : 'You';
    var movements = [];

    // 1 — The Sun: the spine of the story.
    if (d.sun) {
      movements.push(movement('Where your story begins', 'I · The Sun',
        [
          (name ? esc(name) + ', every' : 'Every') + ' chart has a spine, and yours is a <strong>' +
          esc(d.sun) + ' Sun</strong> — the light you were born to carry, the theme your life keeps returning to.',
          interp('Sun', d.sun),
        ]));
    }

    // 2 — The Moon: the inner tide.
    if (d.moon) {
      movements.push(movement('The tide beneath the surface', 'II · The Moon',
        [
          'Identity is only what shows. Beneath it moves your <strong>' + esc(d.moon) +
          ' Moon</strong> — the private weather of your inner life, the part of you that decides when you feel safe.',
          interp('Moon', d.moon),
        ]));
    }

    // 3 — The Rising: the threshold.
    if (d.rising) {
      var ruler = d.ruler ? (' Its ruler, <strong>' + esc(cap(d.ruler)) + '</strong>, quietly sets the tone of that first meeting.') : '';
      var tension = (d.sun && d.sun !== d.rising)
        ? ' Notice the gap: the world meets your ' + esc(d.rising) + ' edge before it ever reaches your ' + esc(d.sun) + ' core — that distance is where much of your story’s tension, and charm, lives.'
        : ' Here your inner and outer selves rhyme — what people meet is close to what you are.';
      movements.push(movement('The face you wear into the room', 'III · The Ascendant',
        [
          'Before anyone knows your ' + esc(d.sun || 'inner') + ' heart, they meet your <strong>' + esc(d.rising) +
          ' Rising</strong> — the threshold you greet the world across.' + ruler,
          interp('Ascendant', d.rising) || interp('Sun', d.rising),
          '<em>' + tension.trim() + '</em>',
        ]));
    }

    // 4 — Mind & heart: Mercury + Venus.
    var mh = [];
    if (d.mercury) mh.push('Your <strong>' + esc(d.mercury) + ' Mercury</strong> shapes how you think and speak. ' + interp('Mercury', d.mercury));
    if (d.venus) mh.push('Your <strong>' + esc(d.venus) + ' Venus</strong> shapes how you love and what you find beautiful. ' + interp('Venus', d.venus));
    if (mh.length) movements.push(movement('How you think, how you love', 'IV · Mercury & Venus', mh));

    // 5 — The element of you.
    if (d.element && ELEMENT_LINE[d.element]) {
      var modLine = d.modality ? (' And you carry it in a <strong>' + esc(d.modality) + '</strong> key — ' +
        ({ Cardinal: 'you start things, you set things in motion.', Fixed: 'you hold, you endure, you see things through.', Mutable: 'you adapt, you bend, you turn with the weather.' }[d.modality] || '') + '') : '';
      movements.push(movement('The element of you', 'V · Temperament',
        ['Across the whole chart one current runs strongest: <strong>' + esc(d.element) + '</strong>. ' +
          ELEMENT_LINE[d.element] + modLine]));
    }

    // 6 — Where the story is leading: North Node.
    if (d.northNode) {
      movements.push(movement('Where the story is leading', 'VI · The North Node',
        [
          'A story always points somewhere. Your <strong>' + esc(d.northNode) + ' North Node</strong> marks the direction your life keeps nudging you toward — unfamiliar at first, then unmistakably yours.',
          interp('NorthNode', d.northNode) || ('Growth, for you, means leaning into ' + esc(d.northNode) +
            ' qualities you weren’t handed at birth but are here to earn.'),
          '<em>This is not a fate written over you, ' + (name ? esc(name) : 'reader') +
          ' — it is the shape of you, read from the exact sky of your first breath. What you make of it is the part still being written.</em>',
        ]));
    }

    var body = movements.filter(Boolean).join('');
    if (!body) return '';
    return body;
  }

  function cap(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }

  window.CosmicStory = { build: build };
})();
