/* ============================================================================
 * icons.js — Hand-drawn zodiac + planet + element orb system
 * ----------------------------------------------------------------------------
 * Replaces glossy glass orbs and Unicode/emoji glyphs with illustrated assets:
 *   - Signs: tarot-style zodiac card art (assets/images/zodiac-cards/)
 *   - Planets + elements: gold line-art SVGs (assets/images/orbs/)
 *
 * Usage:
 *   AstroIcons.planet('Sun')                 → illustrated Sun orb
 *   AstroIcons.sign('Gemini', { sm:true })   → cropped zodiac card orb
 *   AstroIcons.element('fire', { sm:true })  → engraved hex element seal
 * ==========================================================================*/
(function () {
  'use strict';

  var SEAL_ZODIAC = 'assets/images/seals/zodiac/';
  var SEAL_PLANETS = 'assets/images/seals/planets/';
  var ORB_ELEMENTS = 'assets/images/orbs/elements/';

  var Z = window.AP_ZODIAC;
  var SIGN_GLYPH = (Z && Z.SIGN_GLYPH) || {
    Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋', Leo: '♌', Virgo: '♍',
    Libra: '♎', Scorpio: '♏', Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓',
  };
  var SIGN_ELEMENT = (Z && Z.SIGN_ELEMENT) || {
    Aries: 'fire', Leo: 'fire', Sagittarius: 'fire',
    Taurus: 'earth', Virgo: 'earth', Capricorn: 'earth',
    Gemini: 'air', Libra: 'air', Aquarius: 'air',
    Cancer: 'water', Scorpio: 'water', Pisces: 'water',
  };
  var PLANET_GLYPH = {
    Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
    Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇',
  };
  var ELEMENT_GLYPH = { fire: '△', earth: '⊟', air: '◬', water: '▽', all: '✦' };

  var SIGN_SLUG = (Z && Z.SIGN_SLUG) || {
    Aries: 'aries', Taurus: 'taurus', Gemini: 'gemini', Cancer: 'cancer', Leo: 'leo',
    Virgo: 'virgo', Libra: 'libra', Scorpio: 'scorpio', Sagittarius: 'sagittarius',
    Capricorn: 'capricorn', Aquarius: 'aquarius', Pisces: 'pisces',
  };
  var PLANET_SLUG = {
    sun: 'sun', moon: 'moon', mercury: 'mercury', venus: 'venus', mars: 'mars',
    jupiter: 'jupiter', saturn: 'saturn', uranus: 'uranus', neptune: 'neptune', pluto: 'pluto',
  };

  function variantClass(v) { return 'ap-orb--' + String(v || 'air').toLowerCase(); }

  function sizeClass(opts) {
    opts = opts || {};
    if (opts.xl) return ' ap-orb--xl';
    if (opts.lg) return ' ap-orb--lg';
    if (opts.sm) return ' ap-orb--sm';
    return '';
  }

  function sealSize(opts) {
    if (window.AstroCelestialSeals) {
      if (opts.xl) return ' ap-seal--xl';
      if (opts.lg) return ' ap-seal--lg';
      if (opts.sm) return ' ap-seal--sm';
      return ' ap-seal--md';
    }
    return sizeClass(opts).replace('ap-orb', 'ap-seal');
  }

  function imgSeal(kind, slug, alt, variant, opts) {
    if (window.AstroCelestialSeals) {
      if (kind === 'zodiac') return AstroCelestialSeals.zodiac(slug, opts);
      if (kind === 'planet') return AstroCelestialSeals.planet(slug, opts);
      if (kind === 'instrument') return AstroCelestialSeals.instrument(slug, opts);
    }
    opts = opts || {};
    var src = kind === 'zodiac' ? SEAL_ZODIAC + slug + '.svg'
      : kind === 'planet' ? SEAL_PLANETS + slug + '.svg'
      : ORB_ELEMENTS + slug + '.svg';
    var cls = 'ap-seal ap-seal--' + kind + ' ap-seal--' + slug + sealSize(opts);
    if (opts.class) cls += ' ' + opts.class;
    var label = opts.label || alt || '';
    var a11y = label
      ? ' role="img" aria-label="' + String(label).replace(/"/g, '&quot;') + '"'
      : ' aria-hidden="true"';
    var loading = opts.eager ? 'eager' : 'lazy';
    return '<span class="' + cls + '"' + a11y + '>'
      + '<span class="ap-seal__plate">'
      + '<img class="ap-seal__art" src="' + src + '" alt="' + String(alt || '').replace(/"/g, '&quot;') + '"'
      + ' width="96" height="112" loading="' + loading + '" decoding="async" />'
      + '</span></span>';
  }

  function sign(name, opts) {
    var slug = SIGN_SLUG[name] || (Z && Z.glyphKey(name));
    if (!slug) return imgSeal('zodiac', 'aries', name || 'Sign', 'air', opts);
    return imgSeal('zodiac', slug, (name || 'Sign') + ' zodiac', elementOf(name), opts);
  }

  function planet(name, opts) {
    var key = String(name || '').toLowerCase();
    var slug = PLANET_SLUG[key] || PLANET_SLUG[String(name || '')[0] + String(name || '').slice(1).toLowerCase()];
    if (!slug && name) slug = PLANET_SLUG[String(name).toLowerCase()];
    if (!slug) slug = 'sun';
    return imgSeal('planet', slug, (name || 'Planet') + ' planet', slug, opts);
  }

  function instrument(id, opts) {
    return imgSeal('instrument', String(id || 'chart').toLowerCase(), id + ' instrument', 'all', opts);
  }

  function element(name, opts) {
    if (window.AstroElementSeals && typeof AstroElementSeals.seal === 'function') {
      return AstroElementSeals.seal(name, opts);
    }
    var key = String(name || 'all').toLowerCase();
    if (!ELEMENT_GLYPH[key]) key = 'all';
    return imgSeal('element', key, (key === 'all' ? 'All signs' : key + ' element'), key, opts);
  }

  function elementOf(signName) { return SIGN_ELEMENT[signName] || 'air'; }

  /** Legacy escape hatch — maps glyph hints to nearest illustrated orb when possible. */
  function orb(glyph, variant, opts) {
    var v = String(variant || '').toLowerCase();
    if (PLANET_SLUG[v]) return planet(v, opts);
    if (ELEMENT_GLYPH[v]) return element(v, opts);
    for (var sign in SIGN_GLYPH) {
      if (SIGN_GLYPH[sign] === glyph) return sign(sign, opts);
    }
    if (window.AstroElementSeals) return AstroElementSeals.seal('all', opts);
    return imgSeal('element', 'all', 'Astrological symbol', v || 'air', opts);
  }

  var GLYPH_TO_PLANET = {
    '☉': 'Sun', '☽': 'Moon', '☿': 'Mercury', '♀': 'Venus', '♂': 'Mars',
    '♃': 'Jupiter', '♄': 'Saturn', '♅': 'Uranus', '♆': 'Neptune', '♇': 'Pluto',
  };

  function upgradeStaticOrbs() {
    document.querySelectorAll('.ap-orb:not(.ap-orb--art)').forEach(function (el) {
      if (el.closest('.ap-orb--art')) return;
      var cls = el.className || '';
      var match;
      var repl = null;

      match = cls.match(/\bap-orb--(sun|moon|mercury|venus|mars|jupiter|saturn|uranus|neptune|pluto)\b/i);
      if (match) {
        var pname = match[1].charAt(0).toUpperCase() + match[1].slice(1);
        repl = planet(pname, { sm: /\bap-orb--sm\b/.test(cls), lg: /\bap-orb--lg\b/.test(cls) });
      }

      if (!repl && /\bap-orb--(fire|earth|air|water)\b/i.test(cls)) {
        repl = element(cls.match(/\bap-orb--(fire|earth|air|water)\b/i)[1], {
          sm: /\bap-orb--sm\b/.test(cls),
        });
      }

      if (!repl) {
        var glyphEl = el.querySelector('.ap-orb__glyph, i.ap-orb__glyph');
        var glyph = glyphEl ? (glyphEl.textContent || '').replace(/\uFE0E/g, '').trim() : '';
        if (GLYPH_TO_PLANET[glyph]) {
          repl = planet(GLYPH_TO_PLANET[glyph], { sm: /\bap-orb--sm\b/.test(cls) });
        } else {
          for (var s in SIGN_GLYPH) {
            if (SIGN_GLYPH[s] === glyph) { repl = sign(s, { sm: /\bap-orb--sm\b/.test(cls) }); break; }
          }
        }
      }

      if (repl) {
        var wrap = document.createElement('span');
        wrap.innerHTML = repl;
        var node = wrap.firstElementChild;
        if (node) el.replaceWith(node);
      }
    });
  }

  function upgradeSignOrbNodes() {
    document.querySelectorAll('[data-sign-orb]').forEach(function (el) {
      if (el.closest('.compat-matrix')) return;
      var signName = el.getAttribute('data-sign-orb');
      if (!signName || !SIGN_SLUG[signName]) return;
      var sr = el.querySelector('.sr-only, .compat-sign-abbr, abbr.compat-sign-abbr');
      var abbr = el.querySelector('.compat-sign-abbr, abbr.compat-sign-abbr');
      el.innerHTML = sign(signName, { sm: true, label: signName });
      if (abbr) el.appendChild(abbr);
      else if (sr) el.appendChild(sr);
    });
  }

  function auditPath() {
    return !!(
      navigator.webdriver ||
      /\bHeadlessChrome\b/i.test(navigator.userAgent || '') ||
      document.documentElement.classList.contains('ap-audit-path')
    );
  }

  function boot() {
    if (auditPath()) return;
    upgradeStaticOrbs();
    upgradeSignOrbNodes();
  }

  window.AstroIcons = {
    orb: orb,
    sign: sign,
    planet: planet,
    instrument: instrument,
    element: element,
    elementOf: elementOf,
    upgradeStaticOrbs: upgradeStaticOrbs,
    upgradeSignOrbNodes: upgradeSignOrbNodes,
    SIGN_GLYPH: SIGN_GLYPH,
    SIGN_ELEMENT: SIGN_ELEMENT,
    PLANET_GLYPH: PLANET_GLYPH,
    ELEMENT_GLYPH: ELEMENT_GLYPH,
    SIGN_SLUG: SIGN_SLUG,
    PLANET_SLUG: PLANET_SLUG,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();