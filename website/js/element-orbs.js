/**
 * AstroPrecise — animated elemental scene chips (fire / earth / air / water / all).
 * Pairs with AstroIcons glass orbs + CSS in index.html (.ap-el-scene*).
 */
(function () {
  'use strict';

  var TRI = {
    fire:  '<polygon points="12,4 20,18 4,18" fill="currentColor"/>',
    earth: '<polygon points="12,20 4,6 20,6" fill="currentColor"/><line x1="3" y1="13" x2="21" y2="13" stroke="currentColor" stroke-width="1.8"/>',
    air:   '<polygon points="12,4 20,18 4,18" fill="currentColor"/><line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" stroke-width="1.8"/>',
    water: '<polygon points="12,20 4,6 20,6" fill="currentColor"/>',
    all:   '<circle cx="12" cy="12" r="3.2" fill="currentColor"/><circle cx="6" cy="8" r="2" fill="currentColor" opacity="0.75"/><circle cx="18" cy="8" r="2" fill="currentColor" opacity="0.75"/><circle cx="6" cy="17" r="2" fill="currentColor" opacity="0.75"/><circle cx="18" cy="17" r="2" fill="currentColor" opacity="0.75"/>',
  };

  var LABELS = { fire: 'Fire', earth: 'Earth', air: 'Air', water: 'Water', all: 'All signs' };

  function scene(element, opts) {
    opts = opts || {};
    var el = String(element || 'all').toLowerCase();
    if (!TRI[el]) el = 'all';
    var sm = opts.sm ? ' ap-el-scene--sm' : '';
    var anim = opts.static ? '' : ' ap-el-scene--live';
    var label = opts.label || LABELS[el] || el;
    var variant = el === 'all' ? 'all' : el;
    var orbCls = el === 'all' ? 'ap-orb--sun' : ('ap-orb--' + el);

    var sparks = '';
    if (el === 'fire' && !opts.static) {
      sparks = '<span class="ap-el-scene__spark ap-el-scene__spark--1"></span>'
        + '<span class="ap-el-scene__spark ap-el-scene__spark--2"></span>';
    } else if (el === 'water' && !opts.static) {
      sparks = '<span class="ap-el-scene__ripple"></span><span class="ap-el-scene__ripple ap-el-scene__ripple--2"></span>';
    } else if (el === 'air' && !opts.static) {
      sparks = '<span class="ap-el-scene__drift ap-el-scene__drift--1"></span>'
        + '<span class="ap-el-scene__drift ap-el-scene__drift--2"></span>';
    } else if (el === 'earth' && !opts.static) {
      sparks = '<span class="ap-el-scene__grain"></span>';
    } else if (el === 'all' && !opts.static) {
      sparks = '<span class="ap-el-scene__ring" aria-hidden="true"></span>';
    }

    var svg = '<svg class="ap-el-scene__tri" viewBox="0 0 24 24" aria-hidden="true">' + TRI[el] + '</svg>';

    return '<span class="ap-el-scene ap-el-scene--' + variant + sm + anim + '" role="img" aria-label="' + label + ' element">'
      + sparks
      + '<span class="ap-orb ' + orbCls + ' ap-orb--sm ap-el-scene__core">' + svg + '</span>'
      + '</span>';
  }

  window.AstroElementOrbs = { scene: scene, LABELS: LABELS };
})();