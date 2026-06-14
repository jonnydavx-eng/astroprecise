/* ============================================================================
 * icons.js — Glossy glass-gradient zodiac + planet icon system
 * ----------------------------------------------------------------------------
 * Replaces the flat unicode glyphs (which render like emoji and vary per device)
 * with dimensional "glass orb" chips: a colour-graded glossy disc with a soft
 * top highlight, inner bevel and drop shadow, and the astrological symbol on top.
 *
 * The symbol itself stays the real Unicode glyph (always correct), but it sits
 * inside fully custom, themeable chrome — so the look is consistent everywhere
 * and reads as a crafted 3D icon, not a system character.
 *
 * Usage:
 *   AstroIcons.planet('Sun')                 → glossy gold Sun orb
 *   AstroIcons.sign('Gemini', { sm:true })   → small glossy air-element orb
 *   AstroIcons.orb('☿', 'mercury', { lg:1 }) → low-level escape hatch
 * Styling lives in css/main.css (.ap-orb*).
 * ==========================================================================*/
(function () {
  'use strict';

  const SIGN_GLYPH = {
    Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋', Leo: '♌', Virgo: '♍',
    Libra: '♎', Scorpio: '♏', Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓',
  };
  const SIGN_ELEMENT = {
    Aries: 'fire', Leo: 'fire', Sagittarius: 'fire',
    Taurus: 'earth', Virgo: 'earth', Capricorn: 'earth',
    Gemini: 'air', Libra: 'air', Aquarius: 'air',
    Cancer: 'water', Scorpio: 'water', Pisces: 'water',
  };
  const PLANET_GLYPH = {
    Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
    Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇',
  };

  function variantClass(v) { return 'ap-orb--' + String(v || 'air').toLowerCase(); }

  function orb(glyph, variant, opts) {
    opts = opts || {};
    let cls = 'ap-orb ' + variantClass(variant);
    if (opts.sm) cls += ' ap-orb--sm';
    if (opts.lg) cls += ' ap-orb--lg';
    if (opts.xl) cls += ' ap-orb--xl';
    if (opts.class) cls += ' ' + opts.class;
    const label = opts.label ? ' aria-label="' + opts.label + '" role="img"' : ' aria-hidden="true"';
    return '<span class="' + cls + '"' + label + '><i class="ap-orb__glyph">' + glyph + '︎</i></span>';
  }

  function elementOf(signName) { return SIGN_ELEMENT[signName] || 'air'; }

  function sign(name, opts) {
    return orb(SIGN_GLYPH[name] || '?', elementOf(name), opts);
  }
  function planet(name, opts) {
    const key = String(name || '').toLowerCase();
    return orb(PLANET_GLYPH[name] || PLANET_GLYPH[name && name[0].toUpperCase() + name.slice(1)] || '?', key, opts);
  }

  window.AstroIcons = {
    orb, sign, planet, elementOf,
    SIGN_GLYPH, SIGN_ELEMENT, PLANET_GLYPH,
  };
})();
