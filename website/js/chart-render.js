/**
 * AstroPrecise — SVG Natal Chart Renderer
 * chart-render.js
 *
 * Exports: window.AstroChartRender = { renderNatalChart, renderCompatibilityChart, renderTransitChart }
 *
 * chartData shape (from AstroEphemeris):
 *   {
 *     positions: { Sun: { lon, degree, minute, sign, retrograde }, Moon: …, … },
 *     houses:    [lon0, lon1, …, lon11],   // cusp longitudes, 0 = ASC
 *     aspects:   [{ planet1, planet2, aspect, orb }, …],
 *     name:      string,                   // person name (optional)
 *     dominant:  { element, modality },    // optional
 *     chartRuler: string                   // optional planet name
 *   }
 */

(function () {
  'use strict';

  // ─── SVG namespace ─────────────────────────────────────────────────────────
  const SVG_NS = 'http://www.w3.org/2000/svg';

  // ─── Geometry constants (spec: viewBox 0 0 600 600) ───────────────────────
  const VB_W = 600;
  const VB_H = 600;
  const CX   = 300;   // center x
  const CY   = 300;   // center y

  // Ring radii (per spec)
  const R_ZODIAC_OUT  = 280;   // outer edge of zodiac ring
  const R_ZODIAC_IN   = 240;   // inner edge of zodiac ring
  const R_GLYPH       = 257;   // zodiac-sign glyph midpoint (between 240-280)
  const R_PLANET      = 210;   // planet glyph placement circle
  const R_PLANET_DOT  = 218;   // small dot at exact planet position
  const R_HOUSE_OUT   = 240;   // house lines start at inner zodiac edge
  const R_HOUSE_IN    = 80;    // house lines end at inner circle
  const R_HOUSE_NUM   = 155;   // house number labels
  const R_ASPECT      = 76;    // aspect line endpoints (inside r=80 center)
  const R_INNER       = 80;    // center circle radius
  const R_CENTER_FILL = 78;    // filled center disc
  const R_CORE_DOT    = 5;     // small golden center dot
  const R_BEZEL_OUT   = 296;   // outer instrument bezel
  const R_BEZEL_TICK  = 288;   // degree ring outside zodiac

  const SEAL_BASE = 'assets/images/seals/';
  const Z = window.AP_ZODIAC;
  const SIGN_SLUG = (Z && Z.SIGN_SLUG) || {
    Aries:'aries', Taurus:'taurus', Gemini:'gemini', Cancer:'cancer',
    Leo:'leo', Virgo:'virgo', Libra:'libra', Scorpio:'scorpio',
    Sagittarius:'sagittarius', Capricorn:'capricorn', Aquarius:'aquarius', Pisces:'pisces'
  };
  const PLANET_SLUG = {
    Sun:'sun', Moon:'moon', Mercury:'mercury', Venus:'venus', Mars:'mars',
    Jupiter:'jupiter', Saturn:'saturn', Uranus:'uranus', Neptune:'neptune', Pluto:'pluto'
  };
  const SIGN_ABBR = {
    Aries:'AR', Taurus:'TA', Gemini:'GE', Cancer:'CN', Leo:'LE', Virgo:'VI',
    Libra:'LI', Scorpio:'SC', Sagittarius:'SG', Capricorn:'CP', Aquarius:'AQ', Pisces:'PI'
  };

  // Warm observatory tokens (shop / main.css parity — no cool navy)
  const WARM = {
    void:      '#050406',
    plate:     '#13100C',
    gold:      '#C9A227',
    goldDim:   '#A8841E',
    parchment: '#E8E0D0',
    silver:    '#A89E88',
    silverDim: '#7E7565',
    hairline:  'rgba(201,162,39,0.22)',
    mauve:     '#6E1A26',
    synastry:  '#B87898',
    transit:   '#9DB88A'
  };

  // ─── Zodiac data (AP_ZODIAC) ───────────────────────────────────────────────
  const ZODIAC_SIGNS = (Z && Z.SIGN_ORDER) || [
    'Aries','Taurus','Gemini','Cancer','Leo','Virgo',
    'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'
  ];

  // Element fill colors — warm observatory palette, kept distinguishable.
  // (Air/water were cool cyan/blue; remapped to warm lilac / muted teal.)
  const ELEMENT_FILL = {
    fire:  '#D85A2C',   /* warm ember */
    earth: '#5E7A3A',   /* warm olive */
    air:   '#A78BBA',   /* warm lilac */
    water: '#3F7D76'    /* muted observatory teal */
  };

  // Text/stroke accent per element (lighter)
  const ELEMENT_TEXT = {
    fire:  '#F0A878',
    earth: '#A8C07A',
    air:   '#C6AEDA',
    water: '#7FB8B0'
  };

  const SIGN_ELEMENT = (Z && Z.SIGN_ELEMENT) || {
    Aries:'fire',  Leo:'fire',  Sagittarius:'fire',
    Taurus:'earth', Virgo:'earth', Capricorn:'earth',
    Gemini:'air',   Libra:'air',   Aquarius:'air',
    Cancer:'water', Scorpio:'water', Pisces:'water'
  };

  function zodiacSealImg(signName, w, h) {
    const slug = SIGN_SLUG[signName];
    if (!slug) return '';
    const width = w || 18;
    const height = h || 21;
    return `<img class="ap-pt-seal" src="${SEAL_BASE}zodiac/${slug}.svg" alt="" width="${width}" height="${height}" loading="lazy" decoding="async" aria-hidden="true" />`;
  }

  function planetSealImg(name, w, h) {
    const slug = PLANET_SLUG[name];
    const width = w || 18;
    const height = h || 21;
    if (slug) {
      return `<img class="ap-pt-seal ap-pt-seal--planet" src="${SEAL_BASE}planets/${slug}.svg" alt="" width="${width}" height="${height}" loading="lazy" decoding="async" aria-hidden="true" />`;
    }
    const glyph = PLANET_GLYPHS[name];
    if (!glyph) return '';
    const pColor = PLANET_COLORS[name] || WARM.silver;
    return `<span class="ap-pt-glyph" style="color:${pColor}">${glyph}</span>`;
  }

  function elementSealCluster(elementKey) {
    return ZODIAC_SIGNS
      .filter(s => SIGN_ELEMENT[s] === elementKey)
      .map(s => zodiacSealImg(s, 14, 16))
      .join('');
  }

  // ─── Planet data ───────────────────────────────────────────────────────────
  const PLANET_GLYPHS = {
    Sun:'☉︎',      Moon:'☽︎',      Mercury:'☿︎',  Venus:'♀︎',
    Mars:'♂︎',     Jupiter:'♃︎',   Saturn:'♄︎',   Uranus:'♅︎',
    Neptune:'♆︎',  Pluto:'♇︎',     Chiron:'⚷︎',   Lilith:'⚸︎',
    NorthNode:'☊︎', SouthNode:'☋︎', Ascendant:'AC', Midheaven:'MC'
  };

  // Warm palette — Moon/Mercury warmed off cool silver; Uranus/Neptune off
  // electric cyan/blue to warm lavender/violet.
  const PLANET_COLORS = {
    Sun:'#FFD700',      Moon:'#D2CBB8',    Mercury:'#BFB39A', Venus:'#FFB6C1',
    Mars:'#FF6644',     Jupiter:'#FFB347', Saturn:'#C8A86B',  Uranus:'#B89AD0',
    Neptune:'#7E6BB0',  Pluto:'#CC88AA',   Chiron:'#AEB389',  Lilith:'#9A6FB0',
    NorthNode:'#DDCC88', SouthNode:'#BBAA77', Ascendant:'#FFFFFF', Midheaven:'#FFFFFF'
  };

  const PLANET_ORDER = [
    'Sun','Moon','Mercury','Venus','Mars',
    'Jupiter','Saturn','Uranus','Neptune','Pluto',
    'Chiron','Lilith','NorthNode','SouthNode'
  ];

  // ─── Aspect styling (per spec) ─────────────────────────────────────────────
  // Stroke hierarchy reads importance at a glance:
  //   majors (Conjunction/Opposition/Trine/Square) ~1.8 · Sextile ~1.2 · minors ~0.6.
  // Colours unchanged (already warm/on-brand); opacity cascade lives in
  // ASPECT_OPACITY below (majors ~0.75–0.85, minors ~0.38–0.45).
  const ASPECT_STYLE = {
    Conjunction:     { color:'#FFFFFF', width:1.8, dash:null  },
    Opposition:      { color:'#E0514A', width:1.8, dash:null  },
    Trine:           { color:'#5FA39A', width:1.8, dash:null  },   /* warm teal (was sky blue) */
    Square:          { color:'#F97316', width:1.8, dash:null  },
    Sextile:         { color:'#9DB36A', width:1.2, dash:null  },   /* warm sage (was bright green) */
    // Minor aspects — gray dashed, deliberately recessive
    Quincunx:        { color:'#6B7280', width:0.6, dash:'3,3' },
    SemiSquare:      { color:'#6B7280', width:0.6, dash:'3,3' },
    Semisextile:     { color:'#6B7280', width:0.6, dash:'3,3' },
    Sesquiquadrate:  { color:'#6B7280', width:0.6, dash:'3,3' },
    Quintile:        { color:'#6B7280', width:0.6, dash:'3,3' },
    BiQuintile:      { color:'#6B7280', width:0.6, dash:'3,3' }
  };

  const ASPECT_OPACITY = {
    Conjunction:0.85, Opposition:0.80, Trine:0.75, Square:0.75, Sextile:0.70,
    Quincunx:0.45,    SemiSquare:0.40, Semisextile:0.38,
    Sesquiquadrate:0.40, Quintile:0.38, BiQuintile:0.38
  };

  // ─── Utility: create SVG element ──────────────────────────────────────────
  function el(tag, attrs) {
    const node = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      node.setAttribute(k, String(v));
    }
    return node;
  }

  // ─── Utility: polar coordinates ──────────────────────────────────────────
  // SVG angle: 0° = top (12 o'clock), increases clockwise.
  function polar(cx, cy, r, angleDeg) {
    const rad = (angleDeg - 90) * Math.PI / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  // ─── Utility: colour math (hex → lighter / darker shade) ─────────────────
  function _hex2rgb(hex) {
    let h = String(hex || '#888888').replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const n = parseInt(h, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  function _rgb2hex(r, g, b) {
    const c = v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
    return '#' + c(r) + c(g) + c(b);
  }
  // amt > 0 lightens toward white, amt < 0 darkens toward black
  function shade(hex, amt) {
    const { r, g, b } = _hex2rgb(hex);
    if (amt >= 0) {
      return _rgb2hex(r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt);
    }
    const k = 1 + amt;
    return _rgb2hex(r * k, g * k, b * k);
  }

  // ─── Glass disc (glossy orb chip) behind a glyph ─────────────────────────
  // Appends, into parentG, a radial-gradient-filled disc + white top highlight,
  // matching the .ap-orb glass look but rendered natively in SVG. The per-colour
  // radialGradient is created once into the SVG <defs> (deduped by colour+prefix).
  // `svg` is passed explicitly because parentG may not yet be attached when called.
  function sealImage(parentG, href, cx, cy, w, h, opacity) {
    const g = el('g', {
      class: 'ap-chart-seal',
      transform: `translate(${(cx - w / 2).toFixed(2)} ${(cy - h / 2).toFixed(2)})`
    });
    g.appendChild(el('image', {
      href,
      x: 0, y: 0,
      width: w.toFixed(1), height: h.toFixed(1),
      opacity: (opacity != null ? opacity : 0.94).toFixed(2),
      preserveAspectRatio: 'xMidYMid meet'
    }));
    parentG.appendChild(g);
  }

  function glassDisc(svg, parentG, cx, cy, r, hexColor, idPrefix) {
    let gradId = null;
    if (svg) {
      let defs = svg.querySelector('defs');
      if (!defs) { defs = el('defs'); svg.insertBefore(defs, svg.firstChild); }
      const key = (idPrefix || '') + 'orb_' + String(hexColor || '#888').replace('#', '');
      gradId = key;
      if (!defs.querySelector('#' + gradId)) {
        const rg = el('radialGradient', { id: gradId, cx: '32%', cy: '24%', r: '78%' });
        [[0,   shade(hexColor, 0.55)],
         [0.32, shade(hexColor, 0.22)],
         [0.7,  hexColor],
         [1,    shade(hexColor, -0.42)]
        ].forEach(([o, c]) => {
          rg.appendChild(el('stop', { offset: (o * 100) + '%', 'stop-color': c }));
        });
        defs.appendChild(rg);
      }
    }
    // Base glass disc
    parentG.appendChild(el('circle', {
      cx: cx.toFixed(2), cy: cy.toFixed(2), r: r.toFixed(2),
      fill: gradId ? `url(#${gradId})` : hexColor,
      stroke: 'rgba(255,255,255,0.28)', 'stroke-width': '0.5'
    }));
    // Tight convex glass catch (specular peak) + a fainter micro rim-catch above it
    parentG.appendChild(el('ellipse', {
      cx: cx.toFixed(2), cy: (cy - r * 0.42).toFixed(2),
      rx: (r * 0.55).toFixed(2), ry: (r * 0.18).toFixed(2),
      fill: 'rgba(255,255,255,0.28)'
    }));
    parentG.appendChild(el('ellipse', {
      cx: cx.toFixed(2), cy: (cy - r * 0.50).toFixed(2),
      rx: (r * 0.35).toFixed(2), ry: (r * 0.15).toFixed(2),
      fill: 'rgba(255,255,255,0.12)'
    }));
  }

  // ─── Utility: ecliptic longitude → SVG visual angle ──────────────────────
  // Traditional natal wheel: ASC is at the 9 o'clock (left) position = 180°.
  // Degrees increase counter-clockwise on the wheel (east = up).
  // visual_angle = 180 - (eclLon - ascLon)  (mod 360)
  function lonToAngle(eclLon, ascLon) {
    let a = 180 - (eclLon - ascLon);
    return ((a % 360) + 360) % 360;
  }

  // ─── Utility: normalise longitude 0..360 ─────────────────────────────────
  function normLon(v) { return ((v % 360) + 360) % 360; }

  // ─── Utility: angular distance from → to (0..360 CCW) ───────────────────
  function arcFrom(from, to) { return ((to - from) % 360 + 360) % 360; }

  // ─── Utility: build annular sector path ──────────────────────────────────
  // Draws a filled wedge between rInner and rOuter, from startAng to endAng (CW).
  function sectorPath(cx, cy, rOuter, rInner, startAng, endAng) {
    const o1 = polar(cx, cy, rOuter, startAng);
    const o2 = polar(cx, cy, rOuter, endAng);
    const i2 = polar(cx, cy, rInner, endAng);
    const i1 = polar(cx, cy, rInner, startAng);
    const cw    = ((endAng - startAng) + 360) % 360;
    const large = cw > 180 ? 1 : 0;
    return [
      `M ${o1.x.toFixed(3)} ${o1.y.toFixed(3)}`,
      `A ${rOuter} ${rOuter} 0 ${large} 1 ${o2.x.toFixed(3)} ${o2.y.toFixed(3)}`,
      `L ${i2.x.toFixed(3)} ${i2.y.toFixed(3)}`,
      `A ${rInner} ${rInner} 0 ${large} 0 ${i1.x.toFixed(3)} ${i1.y.toFixed(3)}`,
      'Z'
    ].join(' ');
  }

  // ─── SVG <defs> ───────────────────────────────────────────────────────────
  function buildDefs(svg, idPrefix) {
    const defs = el('defs');

    // Radial gradient: deep space center fill
    const rg = el('radialGradient', { id: idPrefix + 'cgrad', cx:'50%', cy:'50%', r:'50%' });
    [[0,   '#13100C', 1],
     [0.6, '#0D0A07', 1],
     [1,   '#050406', 1]
    ].forEach(([o, c, op]) => {
      rg.appendChild(el('stop', { offset: o * 100 + '%', 'stop-color': c, 'stop-opacity': op }));
    });
    defs.appendChild(rg);

    // Planet glow filter
    const flt = el('filter', { id: idPrefix + 'pglow', x:'-50%', y:'-50%', width:'200%', height:'200%' });
    const blur = el('feGaussianBlur', { stdDeviation:'2', result:'blur' });
    const merge = el('feMerge');
    merge.appendChild(el('feMergeNode', { in:'blur' }));
    merge.appendChild(el('feMergeNode', { in:'SourceGraphic' }));
    flt.appendChild(blur);
    flt.appendChild(merge);
    defs.appendChild(flt);

    // Soft gold ring glow
    const flt2 = el('filter', { id: idPrefix + 'rglow', x:'-15%', y:'-15%', width:'130%', height:'130%' });
    const blur2 = el('feGaussianBlur', { stdDeviation:'1.2', result:'b' });
    const mg2 = el('feMerge');
    mg2.appendChild(el('feMergeNode', { in:'b' }));
    mg2.appendChild(el('feMergeNode', { in:'SourceGraphic' }));
    flt2.appendChild(blur2);
    flt2.appendChild(mg2);
    defs.appendChild(flt2);

    // Nebula wash behind the wheel (warm void → oxblood rim)
    const neb = el('radialGradient', { id: idPrefix + 'nebula', cx: '50%', cy: '48%', r: '58%' });
    [[0,   WARM.plate, 0.95],
     [0.55, WARM.void,  1],
     [0.88, '#1a100c', 0.6],
     [1,   WARM.mauve, 0.12]
    ].forEach(([o, c, op]) => {
      neb.appendChild(el('stop', { offset: (o * 100) + '%', 'stop-color': c, 'stop-opacity': op }));
    });
    defs.appendChild(neb);

    // Engraved outer ring gradient
    const ringG = el('linearGradient', { id: idPrefix + 'ringG', x1: '0%', y1: '0%', x2: '100%', y2: '100%' });
    [[0, '#EFE3C0'], [0.45, WARM.gold], [1, WARM.goldDim]].forEach(([o, c]) => {
      ringG.appendChild(el('stop', { offset: (o * 100) + '%', 'stop-color': c }));
    });
    defs.appendChild(ringG);

    // Aspect line soft glow
    const aspGlow = el('filter', { id: idPrefix + 'aglow', x: '-20%', y: '-20%', width: '140%', height: '140%' });
    const ab = el('feGaussianBlur', { stdDeviation: '1.4', result: 'ab' });
    const am = el('feMerge');
    am.appendChild(el('feMergeNode', { in: 'ab' }));
    am.appendChild(el('feMergeNode', { in: 'SourceGraphic' }));
    aspGlow.appendChild(ab);
    aspGlow.appendChild(am);
    defs.appendChild(aspGlow);

    // Per-element zodiac sector washes
    ['fire', 'earth', 'air', 'water'].forEach((elem) => {
      const sg = el('radialGradient', { id: idPrefix + 'seg_' + elem, cx: '50%', cy: '42%', r: '72%' });
      const base = ELEMENT_FILL[elem];
      [[0, shade(base, 0.35), 0.55],
       [0.55, base, 0.38],
       [1, shade(base, -0.35), 0.22]
      ].forEach(([o, c, op]) => {
        sg.appendChild(el('stop', { offset: (o * 100) + '%', 'stop-color': c, 'stop-opacity': op }));
      });
      defs.appendChild(sg);
    });

    svg.appendChild(defs);
  }

  function drawInstrumentBezel(svg, ascLon, idPrefix) {
    const g = el('g', { class: 'ap-instrument-bezel' });

    g.appendChild(el('circle', {
      cx: CX, cy: CY, r: R_BEZEL_OUT,
      fill: 'none', stroke: `url(#${idPrefix}ringG)`, 'stroke-width': '1.4',
      opacity: '0.55', filter: `url(#${idPrefix}rglow)`
    }));
    g.appendChild(el('circle', {
      cx: CX, cy: CY, r: R_BEZEL_OUT - 5,
      fill: 'none', stroke: WARM.goldDim, 'stroke-width': '0.45', opacity: '0.28'
    }));

    for (let deg = 0; deg < 360; deg += 5) {
      const isMajor = deg % 10 === 0;
      const tickAng = lonToAngle(deg, ascLon);
      const p1 = polar(CX, CY, R_BEZEL_OUT - 1, tickAng);
      const p2 = polar(CX, CY, R_BEZEL_TICK - (isMajor ? 7 : 4), tickAng);
      g.appendChild(el('line', {
        x1: p1.x.toFixed(2), y1: p1.y.toFixed(2),
        x2: p2.x.toFixed(2), y2: p2.y.toFixed(2),
        stroke: WARM.gold, 'stroke-width': isMajor ? '0.75' : '0.4',
        opacity: isMajor ? '0.55' : '0.28'
      }));
    }

    // Cardinal compass roses (AC left · MC top · DC right · IC bottom)
    [180, 270, 0, 90].forEach((ang) => {
      const p = polar(CX, CY, R_BEZEL_TICK - 10, ang);
      const rose = el('g', { transform: `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})` });
      rose.appendChild(el('circle', { cx: 0, cy: 0, r: 4.5, fill: 'none', stroke: WARM.gold, 'stroke-width': '0.5', opacity: '0.45' }));
      rose.appendChild(el('line', { x1: -5, y1: 0, x2: 5, y2: 0, stroke: WARM.gold, 'stroke-width': '0.4', opacity: '0.4' }));
      rose.appendChild(el('line', { x1: 0, y1: -5, x2: 0, y2: 5, stroke: WARM.gold, 'stroke-width': '0.4', opacity: '0.4' }));
      g.appendChild(rose);
    });

    svg.appendChild(g);
  }

  // ─── Schematic orbital tracks (decorative ecliptic rings — NOT WebGL orrery) ─
  // Honest: ring radii are fixed/schematic for depth; only ASC–DSC lines use real longitudes.
  function drawOrbitalSchematic(svg, ascLon, idPrefix) {
    const g = el('g', { class: 'ap-orbital-tracks' });
    const schematic = [
      { r: 195, op: 0.14, dash: '2,6' },
      { r: 178, op: 0.1,  dash: '1,7' },
      { r: 162, op: 0.08, dash: '1,8' }
    ];
    schematic.forEach((track, i) => {
      g.appendChild(el('circle', {
        cx: CX, cy: CY, r: track.r,
        fill: 'none',
        stroke: WARM.gold,
        'stroke-width': '0.55',
        'stroke-dasharray': track.dash,
        opacity: track.op.toFixed(2),
        class: i === 0 ? 'ap-orbital-track ap-orbital-track--pulse' : 'ap-orbital-track'
      }));
    });
    // Ecliptic horizon emphasis at ASC–DSC
    const ascAng = lonToAngle(ascLon, ascLon);
    const dscAng = lonToAngle(ascLon + 180, ascLon);
    [ascAng, dscAng].forEach(ang => {
      const p1 = polar(CX, CY, R_HOUSE_IN + 4, ang);
      const p2 = polar(CX, CY, R_ZODIAC_IN - 6, ang);
      g.appendChild(el('line', {
        x1: p1.x.toFixed(2), y1: p1.y.toFixed(2),
        x2: p2.x.toFixed(2), y2: p2.y.toFixed(2),
        stroke: WARM.gold,
        'stroke-width': '0.8',
        opacity: '0.35',
        'stroke-dasharray': '4,5'
      }));
    });
    svg.appendChild(g);
  }

  // ─── Background + star field ──────────────────────────────────────────────
  function drawBackground(svg, idPrefix) {
    svg.appendChild(el('circle', {
      cx: CX, cy: CY, r: R_ZODIAC_OUT + 4,
      fill: `url(#${idPrefix}nebula)`
    }));

    let seed = 0xDEADBEEF;
    function rand() {
      seed = Math.imul(seed ^ (seed >>> 16), 0x45D9F3B);
      seed = Math.imul(seed ^ (seed >>> 16), 0x45D9F3B);
      seed ^= seed >>> 16;
      return (seed >>> 0) / 0xFFFFFFFF;
    }
    const starG = el('g', { class: 'ap-chart-stars', opacity: '0.88' });
    for (let i = 0; i < 280; i++) {
      let sx, sy;
      for (let t = 0; t < 8; t++) {
        sx = CX - R_ZODIAC_OUT + rand() * R_ZODIAC_OUT * 2;
        sy = CY - R_ZODIAC_OUT + rand() * R_ZODIAC_OUT * 2;
        const d2 = (sx - CX) ** 2 + (sy - CY) ** 2;
        if (d2 < R_ZODIAC_OUT * R_ZODIAC_OUT) break;
      }
      const sr  = rand() * 1.2 + 0.15;
      const op  = (rand() * 0.55 + 0.12).toFixed(2);
      const tint = rand() > 0.92 ? WARM.gold : '#FFFFFF';
      starG.appendChild(el('circle', {
        cx: sx.toFixed(1), cy: sy.toFixed(1),
        r: sr.toFixed(2), fill: tint, opacity: op
      }));
    }
    svg.appendChild(starG);

    // Sacred geometry — square + hex hint
    const sq = R_ZODIAC_OUT * 0.42;
    svg.appendChild(el('rect', {
      x: (CX - sq).toFixed(1), y: (CY - sq).toFixed(1),
      width: (sq * 2).toFixed(1), height: (sq * 2).toFixed(1),
      fill: 'none', stroke: WARM.gold, 'stroke-width': '0.35',
      opacity: '0.07', transform: `rotate(45 ${CX} ${CY})`
    }));
    const hexR = R_INNER + 14;
    const hexPts = [];
    for (let i = 0; i < 6; i++) {
      const a = (60 * i - 90) * Math.PI / 180;
      hexPts.push(`${(CX + hexR * Math.cos(a)).toFixed(1)},${(CY + hexR * Math.sin(a)).toFixed(1)}`);
    }
    svg.appendChild(el('polygon', {
      points: hexPts.join(' '),
      fill: 'none', stroke: WARM.gold, 'stroke-width': '0.4',
      opacity: '0.12'
    }));
  }

  // ─── Zodiac wheel ─────────────────────────────────────────────────────────
  function drawZodiacWheel(svg, ascLon, idPrefix) {
    const g = el('g', { class: 'zodiac-wheel' });

    for (let i = 0; i < 12; i++) {
      const sign    = ZODIAC_SIGNS[i];
      const elem    = SIGN_ELEMENT[sign];
      const fillClr = ELEMENT_FILL[elem];
      const txtClr  = ELEMENT_TEXT[elem];

      // Each sign spans 30° of ecliptic starting at i*30
      const startLon = i * 30;
      const endLon   = startLon + 30;
      const midLon   = startLon + 15;

      // Convert to SVG visual angles
      const startAng = lonToAngle(startLon, ascLon);
      const endAng   = lonToAngle(endLon,   ascLon);

      const d = sectorPath(CX, CY, R_ZODIAC_OUT, R_ZODIAC_IN, startAng, endAng);
      g.appendChild(el('path', {
        d,
        fill: `url(#${idPrefix}seg_${elem})`,
        stroke: shade(WARM.gold, i % 2 ? 0.1 : 0),
        'stroke-width': '0.65',
        opacity: '0.92'
      }));

      const midAng = lonToAngle(midLon, ascLon);
      const gp     = polar(CX, CY, R_GLYPH, midAng);
      const slug = SIGN_SLUG[sign];
      if (slug) {
        sealImage(g, SEAL_BASE + 'zodiac/' + slug + '.svg', gp.x, gp.y, 30, 34, 0.96);
      }

      // Sign abbreviation. Raised 6.5 → 11 viewBox units so it stays legible
      // when the wheel scales down (≈6.6px at a 360px-rendered wheel, vs the
      // old ~3.9px). Nudged slightly inward so the larger glyph sits clear of
      // the degree ring.
      const abbrP = polar(CX, CY, R_ZODIAC_OUT - 18, midAng);
      const abbr = el('text', {
        x: abbrP.x.toFixed(2), y: abbrP.y.toFixed(2),
        'text-anchor': 'middle', 'dominant-baseline': 'middle', 'alignment-baseline': 'middle',
        fill: WARM.parchment, 'font-size': '11',
        'font-family': 'var(--font-display, "Cinzel", serif), system-ui, sans-serif',
        'letter-spacing': '0.1em', opacity: '0.62', 'font-weight': '600'
      });
      abbr.textContent = SIGN_ABBR[sign] || '';
      g.appendChild(abbr);
    }

    // Degree tick marks: every 5° (minor) and every 10° (major)
    for (let deg = 0; deg < 360; deg += 5) {
      const isMajor    = deg % 10 === 0;
      const isSignCusp = deg % 30 === 0;
      const tOuter     = R_ZODIAC_OUT - 1;
      const tInner     = isSignCusp ? R_ZODIAC_OUT - 11 : isMajor ? R_ZODIAC_OUT - 8 : R_ZODIAC_OUT - 5;
      const tickAng    = lonToAngle(deg, ascLon);
      const tp1 = polar(CX, CY, tOuter, tickAng);
      const tp2 = polar(CX, CY, tInner, tickAng);
      // Intentional 3-step cascade: sign cusp (boldest) → 10° major → 5° minor
      // (faintest). Opacity now steps with the width so the hierarchy reads as
      // one deliberate gradient rather than two near-identical tiers.
      g.appendChild(el('line', {
        x1: tp1.x.toFixed(2), y1: tp1.y.toFixed(2),
        x2: tp2.x.toFixed(2), y2: tp2.y.toFixed(2),
        stroke: '#C9A227',
        'stroke-width': isSignCusp ? '1.4' : isMajor ? '0.9' : '0.5',
        opacity: isSignCusp ? '0.9' : isMajor ? '0.62' : '0.4'
      }));
    }

    // Outer border circle (engraved gold gradient)
    g.appendChild(el('circle', {
      cx: CX, cy: CY, r: R_ZODIAC_OUT,
      fill: 'none', stroke: `url(#${idPrefix}ringG)`, 'stroke-width': '2.2',
      filter: `url(#${idPrefix}rglow)`
    }));

    // Faint gold echo ring just OUTSIDE the zodiac band — a thin engraved
    // hairline that reinforces the observatory-instrument read without crowding
    // the bezel ticks (which sit further out, ~288).
    g.appendChild(el('circle', {
      cx: CX, cy: CY, r: R_ZODIAC_OUT + 3,
      fill: 'none', stroke: WARM.goldDim, 'stroke-width': '0.5', opacity: '0.3'
    }));
    // Soft depth lip — a faint dark ring just outside the band so it lifts off the void
    g.appendChild(el('circle', {
      cx: CX, cy: CY, r: R_ZODIAC_OUT + 8,
      fill: 'none', stroke: WARM.void, 'stroke-width': '2.4', 'stroke-opacity': '0.35', opacity: '0.45'
    }));

    // Inner border of zodiac ring
    g.appendChild(el('circle', {
      cx: CX, cy: CY, r: R_ZODIAC_IN,
      fill: 'none', stroke: '#C9A227', 'stroke-width': '1'
    }));

    svg.appendChild(g);
  }

  // ─── House wheel ──────────────────────────────────────────────────────────
  function drawHouseWheel(svg, houses, ascLon, idPrefix) {
    const g = el('g', { class: 'house-wheel' });

    // Background disc (inner area)
    g.appendChild(el('circle', {
      cx: CX, cy: CY, r: R_HOUSE_OUT,
      fill: `url(#${idPrefix}cgrad)`,
      stroke: '#555540', 'stroke-width': '0.5'
    }));

    const ANGLE_LABELS = { 0:'AC', 3:'IC', 6:'DC', 9:'MC' };

    for (let h = 0; h < 12; h++) {
      const cuspLonPre = normLon(houses[h]);
      const nextLonPre = normLon(houses[(h + 1) % 12]);
      const startAngPre = lonToAngle(cuspLonPre, ascLon);
      const endAngPre = lonToAngle(nextLonPre, ascLon);
      if (h % 2 === 0) {
        const hd = sectorPath(CX, CY, R_HOUSE_OUT - 2, R_HOUSE_IN + 4, startAngPre, endAngPre);
        g.appendChild(el('path', {
          d: hd,
          fill: WARM.plate,
          'fill-opacity': '0.22',
          stroke: 'none'
        }));
      }
    }

    for (let h = 0; h < 12; h++) {
      const cuspLon   = normLon(houses[h]);
      const nextLon   = normLon(houses[(h + 1) % 12]);
      const visualAng = lonToAngle(cuspLon, ascLon);
      const isAngle   = h === 0 || h === 3 || h === 6 || h === 9;

      // House cusp line: R_HOUSE_IN → R_HOUSE_OUT
      const p1 = polar(CX, CY, R_HOUSE_IN,  visualAng);
      const p2 = polar(CX, CY, R_HOUSE_OUT, visualAng);
      g.appendChild(el('line', {
        x1: p1.x.toFixed(2), y1: p1.y.toFixed(2),
        x2: p2.x.toFixed(2), y2: p2.y.toFixed(2),
        stroke: isAngle ? '#C9A227' : '#4A4838',
        'stroke-width': isAngle ? '2' : '0.8',
        opacity: isAngle ? '1' : '0.75'
      }));

      // AC/DC/MC/IC labels inside the zodiac ring near the cusp
      if (ANGLE_LABELS[h]) {
        const labelR = R_ZODIAC_IN - 14;
        const lp = polar(CX, CY, labelR, visualAng);
        const lbl = el('text', {
          x: lp.x.toFixed(2), y: lp.y.toFixed(2),
          'text-anchor': 'middle', 'dominant-baseline': 'middle', 'alignment-baseline': 'middle',
          fill: '#C9A227',
          // 9 → 13 units (≈7.8px @360) — angle labels (AC/DC/MC/IC) are
          // navigational anchors, so they must stay readable on phones.
          'font-size': '13',
          'font-family': 'system-ui, sans-serif',
          'font-weight': '700',
          'letter-spacing': '0.5'
        });
        lbl.textContent = ANGLE_LABELS[h];
        g.appendChild(lbl);
      }

      // House number: midpoint between this cusp and the next
      const span  = arcFrom(cuspLon, nextLon);
      const midLon = normLon(cuspLon + span / 2);
      const midAng = lonToAngle(midLon, ascLon);
      const np     = polar(CX, CY, R_HOUSE_NUM, midAng);
      const hnum = el('text', {
        x: np.x.toFixed(2), y: np.y.toFixed(2),
        'text-anchor': 'middle', 'dominant-baseline': 'middle', 'alignment-baseline': 'middle',
        fill: WARM.silver,
        // 10 → 15 units (≈9px @360) — the smallest house labels were the worst
        // offenders at mobile sizes; this is the legibility floor.
        'font-size': '15',
        'font-family': 'system-ui, sans-serif',
        'font-weight': '600',
        opacity: '0.85'
      });
      hnum.textContent = String(h + 1);
      g.appendChild(hnum);
    }

    svg.appendChild(g);
  }

  // ─── Aspect lines ─────────────────────────────────────────────────────────
  function aspectKey(asp) {
    const p1 = asp.planet1 || asp.p1 || '';
    const p2 = asp.planet2 || asp.p2 || '';
    const type = (asp.aspect || asp.type || '').toLowerCase();
    return `${p1}-${p2}-${type}`;
  }

  // ─── Shared wheel highlight ───────────────────────────────────────────────
  // One function drives every highlight, whether triggered from the wheel itself
  // or from a linked table row. It (a) emphasises the matching aspect line(s),
  // (b) dims the rest, (c) lights the two planet glyph groups, and (d) emits a
  // CustomEvent so any linked table can mirror the state. Re-encoding only — it
  // reads keys already on the DOM, never recomputes a number.
  function highlightOnWheel(svg, opts) {
    const o = opts || {};
    const lines = svg.querySelectorAll('.aspect-line');
    const glyphs = svg.querySelectorAll('.planet-glyph');
    const planetSet = o.planets ? new Set(o.planets.filter(Boolean)) : null;
    const hasFocus = !!(o.aspectKey || (planetSet && planetSet.size));

    lines.forEach(l => {
      const match = o.aspectKey && l.getAttribute('data-aspect-key') === o.aspectKey;
      l.classList.toggle('is-highlight', !!match);
      l.classList.toggle('is-dimmed', hasFocus && !match);
    });
    glyphs.forEach(gn => {
      const on = planetSet && planetSet.has(gn.getAttribute('data-planet'));
      gn.classList.toggle('is-active', !!on);
      gn.classList.toggle('is-dimmed', hasFocus && planetSet ? !on : false);
    });
  }

  function clearWheelHighlight(svg) {
    svg.querySelectorAll('.aspect-line').forEach(l => l.classList.remove('is-highlight', 'is-dimmed'));
    svg.querySelectorAll('.planet-glyph').forEach(g => g.classList.remove('is-active', 'is-dimmed'));
  }

  // Lightweight styled popover (aspect name + orb + one-line plain meaning).
  // The native <title> stays in the DOM as the no-JS / screen-reader fallback;
  // this is additive chrome only.
  const ASPECT_MEANING = {
    conjunction:   'two forces fused — they act as one',
    opposition:    'a tug-of-war seeking balance',
    trine:         'an easy, flowing talent',
    square:        'friction that drives growth',
    sextile:       'an opportunity if you reach for it',
    quincunx:      'an awkward adjustment between unlike parts',
    semisquare:    'a minor irritation, a nudge to act',
    sesquiquadrate:'simmering tension that asks for release',
    semisextile:   'a quiet, growing connection',
    quintile:      'a creative, idiosyncratic gift',
    biquintile:    'a subtle creative undercurrent'
  };
  let _apPopover = null;
  function ensurePopover() {
    if (_apPopover && document.body.contains(_apPopover)) return _apPopover;
    const p = document.createElement('div');
    p.className = 'ap-aspect-popover';
    p.setAttribute('role', 'tooltip');
    p.setAttribute('aria-hidden', 'true');
    p.hidden = true;
    document.body.appendChild(p);
    _apPopover = p;
    return p;
  }
  function showPopover(line) {
    const p = ensurePopover();
    const p1 = line.getAttribute('data-planet1') || '';
    const p2 = line.getAttribute('data-planet2') || '';
    const name = line.getAttribute('data-aspect-name') || '';
    const orb = line.getAttribute('data-aspect-orb') || '';
    const meaning = ASPECT_MEANING[name] || '';
    const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
    // Built with textContent nodes (no innerHTML) — names come from chart data.
    p.replaceChildren();
    const h = document.createElement('span');
    h.className = 'ap-aspect-popover__title';
    h.textContent = `${p1} ${cap(name)} ${p2}`;
    p.appendChild(h);
    if (orb) {
      const o = document.createElement('span');
      o.className = 'ap-aspect-popover__orb';
      o.textContent = `${orb}° orb`;
      p.appendChild(o);
    }
    if (meaning) {
      const m = document.createElement('span');
      m.className = 'ap-aspect-popover__meaning';
      m.textContent = meaning;
      p.appendChild(m);
    }
    p.hidden = false;
    p.setAttribute('aria-hidden', 'false');
    const r = line.getBoundingClientRect();
    const px = r.left + r.width / 2 + window.scrollX;
    const py = r.top + window.scrollY;
    p.style.left = px + 'px';
    p.style.top = py + 'px';
  }
  function hidePopover() {
    if (!_apPopover) return;
    _apPopover.hidden = true;
    _apPopover.setAttribute('aria-hidden', 'true');
  }

  function wireAspectHover(svg) {
    const lines = svg.querySelectorAll('.aspect-line');
    if (!lines.length) return;
    const focusLine = (line) => {
      highlightOnWheel(svg, {
        aspectKey: line.getAttribute('data-aspect-key'),
        planets: [line.getAttribute('data-planet1'), line.getAttribute('data-planet2')]
      });
      svg.dispatchEvent(new CustomEvent('ap:wheel-highlight', {
        bubbles: true,
        detail: {
          aspectKey: line.getAttribute('data-aspect-key'),
          planets: [line.getAttribute('data-planet1'), line.getAttribute('data-planet2')]
        }
      }));
    };
    const reset = () => {
      clearWheelHighlight(svg);
      hidePopover();
      svg.dispatchEvent(new CustomEvent('ap:wheel-clear', { bubbles: true }));
    };
    lines.forEach(line => {
      line.addEventListener('mouseenter', () => { focusLine(line); showPopover(line); });
      line.addEventListener('mouseleave', reset);
      // Keyboard a11y preserved: focus/blur drive the same highlight (popover too).
      line.addEventListener('focus', () => { focusLine(line); showPopover(line); });
      line.addEventListener('blur', reset);
    });
  }

  function drawAspectLines(svg, aspects, positions, ascLon, idPrefix) {
    if (!aspects || aspects.length === 0) return;
    const g = el('g', { class: 'aspect-lines' });

    for (const asp of aspects) {
      const p1name = asp.planet1 || asp.p1;
      const p2name = asp.planet2 || asp.p2;
      const pos1 = positions[p1name];
      const pos2 = positions[p2name];
      if (!pos1 || !pos2) continue;

      const aspectName = (asp.aspect || asp.type || '').toLowerCase();
      const styleKey = aspectName.charAt(0).toUpperCase() + aspectName.slice(1);
      const style   = ASPECT_STYLE[styleKey] || ASPECT_STYLE[aspectName] || ASPECT_STYLE.Quincunx;
      const opacity = ASPECT_OPACITY[styleKey] || ASPECT_OPACITY[aspectName] || 0.35;

      const a1 = lonToAngle(pos1.lon, ascLon);
      const a2 = lonToAngle(pos2.lon, ascLon);
      const pt1 = polar(CX, CY, R_ASPECT, a1);
      const pt2 = polar(CX, CY, R_ASPECT, a2);
      const len = Math.hypot(pt2.x - pt1.x, pt2.y - pt1.y);

      const orbStr = asp.orb !== undefined
        ? (typeof asp.orb === 'number' ? asp.orb.toFixed(1) : String(asp.orb))
        : '';
      const orbTxt = orbStr ? ` (${orbStr}°)` : '';
      const title = el('title');
      title.textContent = `${p1name} ${aspectName} ${p2name}${orbTxt}`;

      const isMajor = ['Conjunction', 'Opposition', 'Trine', 'Square', 'Sextile'].includes(styleKey);
      const attrs = {
        class: 'aspect-line aspect-line--draw',
        x1: pt1.x.toFixed(2), y1: pt1.y.toFixed(2),
        x2: pt2.x.toFixed(2), y2: pt2.y.toFixed(2),
        stroke: style.color,
        // ASPECT_STYLE.width is now the final, intentional weight (1.8/1.2/0.6) —
        // no extra bump; the soft glow filter below already lifts the majors.
        'stroke-width': style.width,
        opacity: opacity.toFixed(2),
        'data-aspect-key': aspectKey(asp),
        // The two endpoints + name/orb let the shared highlighter light up the
        // matching planet glyphs and build the popover — purely re-encoded from
        // the same asp object that drew the line (no value recomputation).
        'data-planet1': p1name,
        'data-planet2': p2name,
        'data-aspect-name': aspectName,
        'data-aspect-orb': orbStr,
        tabindex: '0',
        role: 'graphics-symbol',
        'aria-label': title.textContent
      };
      if (isMajor && idPrefix) attrs.filter = `url(#${idPrefix}aglow)`;
      if (style.dash) attrs['stroke-dasharray'] = style.dash;

      const line = el('line', attrs);
      line.style.setProperty('--aspect-len', len.toFixed(1));
      line.style.setProperty('--aspect-op', opacity.toFixed(2));
      // Draw-on via dashoffset only for SOLID (major) aspects. Minor aspects
      // carry a real dash pattern (set above); overriding their dasharray with
      // the line length would render them solid and kill the minor/major
      // distinction — so they keep their dash and simply fade in.
      if (!style.dash) {
        line.style.strokeDasharray = String(len);
        line.style.strokeDashoffset = String(len);
      }
      line.appendChild(title);
      g.appendChild(line);
    }

    svg.appendChild(g);
    wireAspectHover(svg);
  }

  // ─── Collision avoidance for planet glyphs ────────────────────────────────
  // If two planets are within 8° of each other on the wheel,
  // nudge their display angles apart until they no longer overlap.
  function separateAngles(entries, threshold, passes) {
    const sorted = entries.slice().sort((a, b) => a.angle - b.angle);
    for (let p = 0; p < (passes || 4); p++) {
      for (let i = 0; i < sorted.length; i++) {
        const j    = (i + 1) % sorted.length;
        const diff = ((sorted[j].angle - sorted[i].angle) + 360) % 360;
        if (diff < threshold) {
          const push = (threshold - diff) / 2 + 0.3;
          sorted[i].angle = ((sorted[i].angle - push) + 360) % 360;
          sorted[j].angle = ((sorted[j].angle + push) + 360) % 360;
        }
      }
    }
    const out = {};
    for (const e of sorted) out[e.name] = e.angle;
    return out;
  }

  // ─── Planet glyphs ────────────────────────────────────────────────────────
  // options: { colorOverride, ringRadius, dotRadius, fontSize, groupId, showDegrees, compact, idPrefix }
  // `compact` (set on small screens) drops the tiny degree-minute micro-labels —
  // they are illegible below ~14 viewBox units and the exact figure already
  // lives in the planets table; the wheel keeps the dot + glyph.
  function drawPlanets(svg, positions, ascLon, idPrefix, options) {
    const opts    = options || {};
    const rPlanet = opts.ringRadius  || R_PLANET;
    const rDot    = opts.dotRadius   || R_PLANET_DOT;
    const fSize   = opts.fontSize    || '14';
    const gId     = opts.groupId     || 'planet-glyphs';
    const compact = opts.compact === true;
    const showDeg = opts.showDegrees !== false && !compact;

    const g = el('g', { class: gId });

    // Collect visual angles
    const entries = [];
    for (const name of PLANET_ORDER) {
      if (!positions[name]) continue;
      const ang = lonToAngle(positions[name].lon, ascLon);
      entries.push({ name, angle: ang });
    }

    // Resolve collisions (8° threshold)
    const resolved = separateAngles(entries, 8, 5);

    for (const name of PLANET_ORDER) {
      const pos = positions[name];
      if (!pos) continue;

      const glyph = PLANET_GLYPHS[name];
      if (!glyph) continue;

      const pColor  = opts.colorOverride || PLANET_COLORS[name] || '#CCCCCC';
      const trueAng = lonToAngle(pos.lon, ascLon);
      const dispAng = resolved[name];

      // Per-planet group so a table-row hover can highlight all of this planet's
      // marks (spoke + dot + glyph + ℞ + degree) as one unit. data-planet keys
      // the bidirectional wheel↔table link (see wireGlyphHighlight).
      const pg = el('g', { class: 'planet-glyph', 'data-planet': name });
      g.appendChild(pg);

      // Thin spoke from inner zodiac edge to dot
      const spokeOut = polar(CX, CY, R_ZODIAC_IN - 1, trueAng);
      const spokeIn  = polar(CX, CY, rDot + 6,         trueAng);
      pg.appendChild(el('line', {
        x1: spokeOut.x.toFixed(2), y1: spokeOut.y.toFixed(2),
        x2: spokeIn.x.toFixed(2),  y2: spokeIn.y.toFixed(2),
        stroke: pColor, 'stroke-width': '0.5', opacity: '0.4'
      }));

      // Small color-coded dot at the exact ecliptic position
      const dotPt = polar(CX, CY, rDot, trueAng);
      pg.appendChild(el('circle', {
        class: 'planet-glyph__dot',
        cx: dotPt.x.toFixed(2), cy: dotPt.y.toFixed(2),
        r: '2.5', fill: pColor, opacity: '0.95'
      }));

      // Planet glyph at collision-resolved position
      const gp  = polar(CX, CY, rPlanet, dispAng);
      const pSlug = PLANET_SLUG[name];
      if (pSlug && !opts.colorOverride) {
        sealImage(pg, SEAL_BASE + 'planets/' + pSlug + '.svg', gp.x, gp.y, 22, 26, 0.98);
      } else {
        glassDisc(svg, pg, gp.x, gp.y, 11, pColor, idPrefix);
        const txt = el('text', {
          x: gp.x.toFixed(2), y: gp.y.toFixed(2),
          'text-anchor': 'middle', 'dominant-baseline': 'middle', 'alignment-baseline': 'middle',
          fill: '#ffffff',
          'font-size': fSize,
          'font-family': 'serif, "Apple Color Emoji", "Segoe UI Emoji", system-ui',
          'font-weight': 'bold',
          filter: `url(#${idPrefix}pglow)`
        });
        txt.textContent = glyph;
        pg.appendChild(txt);
      }

      // Retrograde symbol ℞ as superscript after the glyph. 8 → 11 units
      // (≈6.6px @360) so the retrograde state is actually readable on the wheel.
      if (pos.retrograde) {
        const orp  = polar(CX, CY, rPlanet + 13, dispAng);
        const rTxt = el('text', {
          x: orp.x.toFixed(2), y: orp.y.toFixed(2),
          'text-anchor': 'middle', 'dominant-baseline': 'middle', 'alignment-baseline': 'middle',
          fill: '#FF9977',
          'font-size': '11',
          'font-family': 'serif, system-ui',
          'font-weight': '600',
          opacity: '0.95'
        });
        rTxt.textContent = '℞';
        pg.appendChild(rTxt);
      }

      // Degree label (just inside the planet ring). Desktop only (gated by
      // `compact` via showDeg above): 7 → 9 units so it's not anemic where it
      // does render. On mobile the exact figure lives in the planets table.
      if (showDeg) {
        const _dv    = pos.degree !== undefined ? pos.degree : (((pos.lon % 30) + 30) % 30);
        const degNum = Math.floor(_dv);
        const minNum = Math.floor((_dv - degNum) * 60);
        const dlr    = rPlanet - 17;
        const dp     = polar(CX, CY, dlr, dispAng);
        const dl = el('text', {
          x: dp.x.toFixed(2), y: dp.y.toFixed(2),
          'text-anchor': 'middle', 'dominant-baseline': 'middle', 'alignment-baseline': 'middle',
          fill: WARM.silver,
          'font-size': '9',
          'font-family': 'var(--font-mono, "IBM Plex Mono", ui-monospace, monospace)',
          'font-variant-numeric': 'tabular-nums', opacity: '0.85'
        });
        dl.textContent = `${degNum}°${String(minNum).padStart(2,'0')}'`;
        pg.appendChild(dl);
      }
    }

    svg.appendChild(g);
  }

  // ─── Truncate a display name on a word boundary with a real ellipsis ───────
  // Presentation-only (the name is a label, not a computed value). Keeps whole
  // words where it can, falls back to a hard cut for a single long token.
  function ellipsizeName(label, max) {
    const s = String(label || 'Natal Chart').trim();
    if (s.length <= max) return s;
    const cut = s.slice(0, max - 1);
    const sp = cut.lastIndexOf(' ');
    const base = (sp > max * 0.5 ? cut.slice(0, sp) : cut).replace(/[\s.,;:]+$/, '');
    return base + '…';
  }

  // ─── Center circle with label ─────────────────────────────────────────────
  function drawCenter(svg, label, idPrefix) {
    // Faint dashed guide ring (unchanged)
    svg.appendChild(el('circle', {
      cx: CX, cy: CY, r: R_INNER + 14,
      fill: 'none', stroke: WARM.gold, 'stroke-width': '0.45', opacity: '0.14',
      'stroke-dasharray': '3 6'
    }));
    svg.appendChild(el('circle', {
      cx: CX, cy: CY, r: R_INNER + 6,
      fill: 'none', stroke: WARM.gold, 'stroke-width': '0.75', opacity: '0.32',
      filter: `url(#${idPrefix}rglow)`
    }));
    // Filled disc
    svg.appendChild(el('circle', {
      cx: CX, cy: CY, r: R_CENTER_FILL,
      fill: `url(#${idPrefix}cgrad)`,
      stroke: WARM.gold, 'stroke-width': '1.4', opacity: '0.98'
    }));
    // Double-stroke engraved gold border: a brighter outer hairline + a recessed
    // inner line, echoing an instrument bezel rather than one flat ring.
    svg.appendChild(el('circle', {
      cx: CX, cy: CY, r: R_CENTER_FILL - 2.5,
      fill: 'none', stroke: shade(WARM.gold, 0.35), 'stroke-width': '0.6', opacity: '0.55'
    }));
    svg.appendChild(el('circle', {
      cx: CX, cy: CY, r: R_CENTER_FILL - 5,
      fill: 'none', stroke: WARM.goldDim, 'stroke-width': '0.4', opacity: '0.35'
    }));

    // Name — larger, ellipsised on a word boundary. Sizes raised so the
    // person's name reads clearly when the wheel scales down on mobile.
    const displayName = ellipsizeName(label, 20);
    const nameSize = displayName.length > 16 ? 11 : displayName.length > 11 ? 13 : 15;
    const lbl = el('text', {
      x: CX, y: CY - 5,
      'text-anchor': 'middle', 'dominant-baseline': 'middle', 'alignment-baseline': 'middle',
      fill: WARM.parchment,
      'font-size': String(nameSize),
      'font-family': 'var(--font-display, "Cinzel", serif), system-ui, sans-serif',
      'font-weight': '600',
      opacity: '0.96'
    });
    lbl.textContent = displayName;
    svg.appendChild(lbl);

    const sub = el('text', {
      x: CX, y: CY + 13,
      'text-anchor': 'middle', 'dominant-baseline': 'middle', 'alignment-baseline': 'middle',
      fill: WARM.gold,
      // 6.5 → 9 units (≈5.4px @360) — small caps stay readable.
      'font-size': '9',
      'font-family': 'system-ui, sans-serif',
      'font-weight': '600',
      'letter-spacing': '0.2em',
      opacity: '0.78'
    });
    sub.textContent = 'NATAL WHEEL';
    svg.appendChild(sub);

    svg.appendChild(el('circle', {
      cx: CX, cy: CY, r: R_CORE_DOT,
      fill: WARM.gold, opacity: '0.9',
      filter: `url(#${idPrefix}pglow)`
    }));
  }

  // ─── Planet table (HTML, below the SVG) ──────────────────────────────────
  function buildPlanetTable(positions, houses) {
    const wrap = document.createElement('div');
    wrap.className = 'ap-chart-table-wrap';

    const tbl = document.createElement('table');
    tbl.className = 'ap-chart-table';

    const thead = document.createElement('thead');
    const hr    = document.createElement('tr');
    [
      { visible: 'Sym', label: 'Planet symbol' },
      'Planet',
      { visible: 'Sym', label: 'Sign symbol' },
      'Sign',
      "Degree°Min'",
      'House',
      'Rx'
    ].forEach(hdr => {
      const th = document.createElement('th');
      if (typeof hdr === 'string') {
        th.textContent = hdr;
      } else {
        th.innerHTML = '<span class="sr-only">' + hdr.label + '</span><span aria-hidden="true">' + hdr.visible + '</span>';
      }
      hr.appendChild(th);
    });
    thead.appendChild(hr);
    tbl.appendChild(thead);

    const tbody = document.createElement('tbody');
    for (const name of PLANET_ORDER) {
      const pos = positions[name];
      if (!pos) continue;

      const tr = document.createElement('tr');
      const _dv      = pos.degree !== undefined ? pos.degree : (((pos.lon % 30) + 30) % 30);
      const degNum   = Math.floor(_dv);
      const minNum   = Math.floor((_dv - degNum) * 60);
      const signName = pos.sign || ZODIAC_SIGNS[Math.floor(normLon(pos.lon) / 30)];
      const elemKey  = SIGN_ELEMENT[signName] || '';
      const elemClr  = ELEMENT_TEXT[elemKey] || WARM.silver;
      const houseNum = houses ? getPlanetHouse(pos.lon, houses) : '—';

      // Row carries its element so CSS can tint the left edge via --ap-element-*,
      // and data-planet links it to the wheel glyph (see linkWheelAndTables).
      tr.setAttribute('data-planet', name);
      if (elemKey) {
        tr.className = 'ap-pt-row ap-pt-row--' + elemKey;
        tr.style.setProperty('--row-elem', 'var(--ap-element-' + elemKey + ', ' + elemClr + ')');
      }

      const cells = [
        `<span class="ap-pt-seal-wrap">${planetSealImg(name, 18, 21)}</span>`,
        `<span class="ap-pt-name">${name}</span>`,
        `<span class="ap-pt-seal-wrap">${zodiacSealImg(signName)}</span>`,
        `<span class="ap-pt-sign" style="color:${elemClr}">${signName}</span>`,
        `<span class="ap-pt-deg">${degNum}°${String(minNum).padStart(2,'0')}'</span>`,
        `<span class="ap-pt-house">${houseNum}</span>`,
        pos.retrograde ? `<span class="ap-pt-rx" title="Retrograde">℞ Rx</span>` : ''
      ];

      for (const html of cells) {
        const td = document.createElement('td');
        td.innerHTML = html;
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    tbl.appendChild(tbody);
    wrap.appendChild(tbl);
    return wrap;
  }

  // ─── Determine which house a planet falls in ─────────────────────────────
  function getPlanetHouse(lon, houses) {
    lon = normLon(lon);
    for (let h = 0; h < 12; h++) {
      const start = normLon(houses[h]);
      const end   = normLon(houses[(h + 1) % 12]);
      if (inArcRange(lon, start, end)) return h + 1;
    }
    return 1;
  }

  function inArcRange(lon, start, end) {
    lon = normLon(lon); start = normLon(start); end = normLon(end);
    if (start <= end) return lon >= start && lon < end;
    return lon >= start || lon < end;
  }

  // ─── Legend bar ───────────────────────────────────────────────────────────
  function buildLegend(dominant, chartRuler) {
    const wrap = document.createElement('div');
    wrap.className = 'ap-chart-legend';

    const aDiv = document.createElement('div');
    aDiv.className = 'ap-chart-legend__block';
    aDiv.innerHTML = '<div class="ap-chart-legend__title">Aspects</div>';
    [
      ['Conjunction','☌','#FFFFFF'],['Opposition','☍','#EF4444'],
      ['Trine','△','#5fa39a'],['Square','□','#F97316'],
      ['Sextile','⚹','#9db36a'],['Minor','- -','#6B7280']
    ].forEach(([n, s, c]) => {
      const row = document.createElement('div');
      row.className = 'ap-chart-legend__row';
      row.innerHTML = `<span style="color:${c};font-size:14px;font-family:serif;width:16px;text-align:center">${s}</span><span>${n}</span>`;
      aDiv.appendChild(row);
    });
    wrap.appendChild(aDiv);

    const eDiv = document.createElement('div');
    eDiv.className = 'ap-chart-legend__block';
    eDiv.innerHTML = '<div class="ap-chart-legend__title">Elements</div>';
    [
      ['Fire',  ELEMENT_FILL.fire,  'fire'],
      ['Earth', ELEMENT_FILL.earth, 'earth'],
      ['Air',   ELEMENT_FILL.air,   'air'],
      ['Water', ELEMENT_FILL.water, 'water']
    ].forEach(([n, c, elemKey]) => {
      const row = document.createElement('div');
      row.className = 'ap-chart-legend__row';
      row.innerHTML = `<span class="ap-chart-legend__dot" style="background:${c}"></span><span style="color:${ELEMENT_TEXT[elemKey] || c};font-weight:600">${n}</span><span class="ap-chart-legend__seals">${elementSealCluster(elemKey)}</span>`;
      eDiv.appendChild(row);
    });
    wrap.appendChild(eDiv);

    if (dominant || chartRuler) {
      const iDiv = document.createElement('div');
      iDiv.className = 'ap-chart-legend__block';
      iDiv.innerHTML = '<div class="ap-chart-legend__title">Chart info</div>';
      if (dominant) {
        if (dominant.element)  iDiv.innerHTML += `<div style="margin-bottom:3px">Element: <strong style="color:${WARM.parchment}">${dominant.element}</strong></div>`;
        if (dominant.modality) iDiv.innerHTML += `<div style="margin-bottom:3px">Modality: <strong style="color:${WARM.parchment}">${dominant.modality}</strong></div>`;
      }
      if (chartRuler) {
        const rc = PLANET_COLORS[chartRuler] || WARM.silver;
        const rg = PLANET_GLYPHS[chartRuler] || '';
        iDiv.innerHTML += `<div>Ruler: <span style="color:${rc};font-size:15px;font-family:serif">${rg}</span> <strong style="color:${WARM.parchment}">${chartRuler}</strong></div>`;
      }
      wrap.appendChild(iDiv);
    }

    return wrap;
  }

  // ─── Title bar ────────────────────────────────────────────────────────────
  function buildTitleBar(title, subtitle, subtitleHtml) {
    const bar = document.createElement('div');
    bar.className = 'ap-chart-title';
    if (title) {
      const h = document.createElement('div');
      h.className = 'ap-chart-title__main';
      h.textContent = title.toUpperCase();
      bar.appendChild(h);
    }
    if (subtitle || subtitleHtml) {
      const s = document.createElement('div');
      s.className = 'ap-chart-title__sub';
      if (subtitleHtml) s.innerHTML = subtitleHtml;
      else s.textContent = subtitle;
      bar.appendChild(s);
    }
    return bar;
  }

  // ─── Create the root SVG element ──────────────────────────────────────────
  function createSVG() {
    return el('svg', {
      class: 'ap-chart-svg',
      viewBox: `0 0 ${VB_W} ${VB_H}`,
      width: '100%', height: '100%',
      xmlns: SVG_NS,
      style: 'display:block;max-width:100%;shape-rendering:geometricPrecision;text-rendering:geometricPrecision'
    });
  }

  // ─── Get/reset container ──────────────────────────────────────────────────
  function getContainer(containerId, wheelOnly) {
    const c = document.getElementById(containerId);
    if (!c) { console.error(`AstroChartRender: #${containerId} not found`); return null; }
    c.replaceChildren();
    c.className = wheelOnly ? 'ap-chart-render natal-wheel-mount' : 'ap-chart-render ap-chart-render--full';
    c.style.background = wheelOnly ? 'transparent' : '';
    c.style.borderRadius = wheelOnly ? '0' : '10px';
    c.style.padding = wheelOnly ? '0' : '14px';
    c.style.boxSizing = 'border-box';
    return c;
  }

  // ─── Unique id prefix per chart (avoids filter-id collisions) ────────────
  let _chartSeq = 0;
  function nextPrefix() { return 'arc' + (++_chartSeq) + '_'; }

  // ═══════════════════════════════════════════════════════════════════════════
  // renderNatalChart
  // ═══════════════════════════════════════════════════════════════════════════
  /**
   * Renders a full natal chart into the element with the given containerId.
   *
   * @param {object} chartData   - { positions, houses, aspects, name, dominant, chartRuler }
   * @param {string} containerId - id of the DOM element to render into
   * @param {object} [options]   - { showAspects, showDegrees, title, subtitle }
   */
  function renderNatalChart(chartData, containerId, options) {
    const opts      = options || {};
    const wheelOnly = opts.wheelOnly === true;
    const container = getContainer(containerId, wheelOnly);
    if (!container) return;

    const positions = chartData.positions || {};
    const houses    = chartData.houses    || Array.from({ length: 12 }, (_, i) => i * 30);
    const aspects   = chartData.aspects   || [];
    const showAsp   = opts.showAspects !== false;
    const showDeg   = opts.showDegrees !== false;
    const showTable = opts.showTable !== false && !wheelOnly;
    const showLeg   = opts.showLegend !== false && !wheelOnly;
    // Compact = drop the wheel's tiny degree-minute micro-labels on small
    // screens (they'd render illegibly when the 600u viewBox is scaled to ~340px;
    // the exact figures remain in the planets table). Caller may force either way.
    const compact   = opts.compact != null
      ? !!opts.compact
      : (typeof window !== 'undefined' && typeof window.matchMedia === 'function'
          && window.matchMedia('(max-width: 600px)').matches);

    const ascLon = normLon(
      positions.Ascendant ? positions.Ascendant.lon : houses[0]
    );

    const prefix = nextPrefix();

    const title    = opts.title    || (wheelOnly ? null : chartData.name) || null;
    const subtitle = opts.subtitle || null;
    if (title || subtitle) container.appendChild(buildTitleBar(title, subtitle));

    const svg = createSVG();
    buildDefs(svg, prefix);
    drawBackground(svg, prefix);
    drawInstrumentBezel(svg, ascLon, prefix);
    drawOrbitalSchematic(svg, ascLon, prefix);
    drawZodiacWheel(svg, ascLon, prefix);
    drawHouseWheel(svg, houses, ascLon, prefix);
    if (showAsp) drawAspectLines(svg, aspects, positions, ascLon, prefix);
    drawPlanets(svg, positions, ascLon, prefix, { showDegrees: showDeg, compact });
    drawCenter(svg, chartData.name || 'Natal Chart', prefix);

    container.appendChild(svg);

    if (showTable) container.appendChild(buildPlanetTable(positions, houses));
    if (showLeg) container.appendChild(buildLegend(chartData.dominant, chartData.chartRuler));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // renderCompatibilityChart  (Synastry)
  // Two overlapping wheels: person 1 inner, person 2 outer
  // ═══════════════════════════════════════════════════════════════════════════
  /**
   * @param {object} chart1      - chartData for person 1 (inner wheel)
   * @param {object} chart2      - chartData for person 2 (outer wheel)
   * @param {string} containerId
   * @param {object} [options]   - { name1, name2, showAspects, showDegrees, title, subtitle }
   */
  function renderCompatibilityChart(chart1, chart2, containerId, options) {
    const opts      = options || {};
    const container = getContainer(containerId);
    if (!container) return;

    const pos1    = chart1.positions || {};
    const pos2    = chart2.positions || {};
    const houses1 = chart1.houses    || Array.from({ length: 12 }, (_, i) => i * 30);
    const houses2 = chart2.houses    || Array.from({ length: 12 }, (_, i) => i * 30);
    const aspects = chart1.aspects   || [];
    const showAsp = opts.showAspects !== false;
    const showDeg = opts.showDegrees !== false;

    const ascLon = normLon(pos1.Ascendant ? pos1.Ascendant.lon : houses1[0]);

    const name1 = opts.name1 || chart1.name || 'Person 1';
    const name2 = opts.name2 || chart2.name || 'Person 2';

    const prefix = nextPrefix();

    const escHtml = (str) => String(str).replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
    container.appendChild(buildTitleBar(
      opts.title    || 'Synastry Chart',
      opts.subtitle || null,
      opts.subtitle ? null : `${escHtml(name1)} <svg class="eng-i" aria-hidden="true"><use href="#ei-heart"/></svg> ${escHtml(name2)}`
    ));

    const svg = createSVG();
    buildDefs(svg, prefix);
    drawBackground(svg, prefix);
    drawInstrumentBezel(svg, ascLon, prefix);
    drawOrbitalSchematic(svg, ascLon, prefix);
    drawZodiacWheel(svg, ascLon, prefix);
    drawHouseWheel(svg, houses1, ascLon, prefix);
    if (showAsp) drawAspectLines(svg, chart1.synastryAspects || aspects, pos1, ascLon, prefix);

    drawPlanets(svg, pos1, ascLon, prefix, {
      ringRadius:  R_PLANET,
      dotRadius:   R_PLANET_DOT,
      fontSize:    '13',
      groupId:     'p1-planets',
      showDegrees: showDeg
    });

    drawPlanets(svg, pos2, ascLon, prefix, {
      ringRadius:    R_PLANET + 22,
      dotRadius:     R_PLANET + 28,
      fontSize:      '12',
      groupId:       'p2-planets',
      colorOverride: WARM.synastry,
      showDegrees:   false
    });

    drawCenter(svg, `${name1} / ${name2}`, prefix);
    container.appendChild(svg);

    // Color key
    const keyRow = document.createElement('div');
    keyRow.style.cssText = 'display:flex;gap:20px;margin:10px 4px 0;font-family:system-ui,sans-serif;font-size:12px';
    keyRow.innerHTML =
      `<span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#FFD700;vertical-align:middle;margin-right:4px"></span><span style="color:#FFD700;font-weight:600">${name1}</span></span>` +
      `<span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${WARM.synastry};vertical-align:middle;margin-right:4px"></span><span style="color:${WARM.synastry};font-weight:600">${name2}</span></span>`;
    container.appendChild(keyRow);

    // Side-by-side planet tables
    const tables = document.createElement('div');
    tables.style.cssText = 'display:flex;flex-wrap:wrap;gap:12px;margin-top:10px';

    const makeTableBlock = (lbl, color, pos, hses) => {
      const div = document.createElement('div');
      div.style.cssText = 'flex:1;min-width:260px';
      const ttl = document.createElement('div');
      ttl.style.cssText = `color:${color};font-family:system-ui,sans-serif;font-size:11px;font-weight:700;margin-bottom:4px;letter-spacing:0.08em`;
      ttl.textContent = lbl.toUpperCase();
      div.appendChild(ttl);
      div.appendChild(buildPlanetTable(pos, hses));
      return div;
    };

    tables.appendChild(makeTableBlock(name1, '#FFD700', pos1, houses1));
    tables.appendChild(makeTableBlock(name2, WARM.synastry, pos2, houses2));
    container.appendChild(tables);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // renderTransitChart
  // Natal chart inner, transits outer ring
  // ═══════════════════════════════════════════════════════════════════════════
  /**
   * @param {object} natalChart       - natal chartData (inner wheel)
   * @param {object} transitPositions - chartData object OR bare { PlanetName: { lon, … }, … } map
   * @param {string} containerId
   * @param {object} [options]        - { showAspects, showDegrees, title, subtitle }
   */
  function renderTransitChart(natalChart, transitPositions, containerId, options) {
    const opts      = options || {};
    const container = getContainer(containerId);
    if (!container) return;

    const natalPos = natalChart.positions || {};
    // Accept either a chartData wrapper or a bare positions map
    const tPos     = (transitPositions && transitPositions.positions)
      ? transitPositions.positions
      : (transitPositions || {});
    const houses   = natalChart.houses  || Array.from({ length: 12 }, (_, i) => i * 30);
    const aspects  = natalChart.aspects || [];
    const showAsp  = opts.showAspects !== false;
    const showDeg  = opts.showDegrees !== false;

    const ascLon = normLon(natalPos.Ascendant ? natalPos.Ascendant.lon : houses[0]);

    const prefix = nextPrefix();

    container.appendChild(buildTitleBar(
      opts.title    || 'Transit Chart',
      opts.subtitle || 'Natal + Current Transits'
    ));

    const svg = createSVG();
    buildDefs(svg, prefix);
    drawBackground(svg, prefix);
    drawInstrumentBezel(svg, ascLon, prefix);
    drawOrbitalSchematic(svg, ascLon, prefix);
    drawZodiacWheel(svg, ascLon, prefix);
    drawHouseWheel(svg, houses, ascLon, prefix);
    if (showAsp) drawAspectLines(svg, natalChart.transitAspects || aspects, natalPos, ascLon, prefix);

    drawPlanets(svg, natalPos, ascLon, prefix, {
      ringRadius:  R_PLANET,
      dotRadius:   R_PLANET_DOT,
      fontSize:    '13',
      groupId:     'natal-planets',
      showDegrees: showDeg
    });

    drawPlanets(svg, tPos, ascLon, prefix, {
      ringRadius:    R_PLANET + 22,
      dotRadius:     R_PLANET + 28,
      fontSize:      '12',
      groupId:       'transit-planets',
      colorOverride: WARM.transit,
      showDegrees:   false
    });

    drawCenter(svg, natalChart.name || 'Natal Chart', prefix);
    container.appendChild(svg);

    // Color key
    const keyRow = document.createElement('div');
    keyRow.style.cssText = 'display:flex;gap:20px;margin:10px 4px 0;font-family:system-ui,sans-serif;font-size:12px';
    keyRow.innerHTML =
      '<span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#FFD700;vertical-align:middle;margin-right:4px"></span><span style="color:#FFD700;font-weight:600">Natal</span></span>' +
      `<span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${WARM.transit};vertical-align:middle;margin-right:4px"></span><span style="color:${WARM.transit};font-weight:600">Transits</span></span>`;
    container.appendChild(keyRow);

    // Side-by-side planet tables
    const tables = document.createElement('div');
    tables.style.cssText = 'display:flex;flex-wrap:wrap;gap:12px;margin-top:10px';

    const makeBlock = (lbl, color, pos, hses) => {
      const div = document.createElement('div');
      div.style.cssText = 'flex:1;min-width:260px';
      const t = document.createElement('div');
      t.style.cssText = `color:${color};font-family:system-ui,sans-serif;font-size:11px;font-weight:700;margin-bottom:4px;letter-spacing:0.08em`;
      t.textContent = lbl;
      div.appendChild(t);
      div.appendChild(buildPlanetTable(pos, hses));
      return div;
    };

    tables.appendChild(makeBlock('NATAL PLANETS',   '#FFD700', natalPos, houses));
    tables.appendChild(makeBlock('TRANSIT PLANETS', WARM.transit, tPos,
      (transitPositions && transitPositions.houses) || houses));
    container.appendChild(tables);

    container.appendChild(buildLegend(natalChart.dominant, natalChart.chartRuler));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BIDIRECTIONAL WHEEL ↔ TABLE LINKING
  // ----------------------------------------------------------------------------
  // Called by the page after both the wheel and the detail tables exist. Wiring
  // is symmetric:
  //   • hover/focus a wheel aspect → highlight its table row + both planet rows
  //     (handled wheel-side; this listens for the emitted event to touch tables)
  //   • hover/focus a table aspect/planet row → highlight the wheel line + glyphs
  // All linking is keyed on data-aspect-key (identical string both sides) and
  // data-planet. It re-encodes existing values; it changes no number.
  // ═══════════════════════════════════════════════════════════════════════════
  function linkWheelAndTables(wheelContainer, tablesRoot) {
    const wheel = typeof wheelContainer === 'string'
      ? document.getElementById(wheelContainer) : wheelContainer;
    const tables = typeof tablesRoot === 'string'
      ? document.getElementById(tablesRoot) : (tablesRoot || document);
    if (!wheel) return;
    const svg = wheel.querySelector('svg.ap-chart-svg') || wheel.querySelector('svg');
    if (!svg) return;

    const aspectRows = () => tables.querySelectorAll('[data-aspect-key]');
    const planetRows = () => tables.querySelectorAll('[data-planet]');

    const setRows = (sel, attr, values) => {
      const want = values ? new Set(values.filter(Boolean)) : null;
      sel.forEach(node => {
        const v = node.getAttribute(attr);
        const on = want ? want.has(v) : false;
        node.classList.toggle('is-linked-active', on);
      });
    };

    const clearRows = () => {
      aspectRows().forEach(n => n.classList.remove('is-linked-active'));
      planetRows().forEach(n => n.classList.remove('is-linked-active'));
    };

    // ── wheel → tables ──
    svg.addEventListener('ap:wheel-highlight', (ev) => {
      const d = ev.detail || {};
      setRows(aspectRows(), 'data-aspect-key', d.aspectKey ? [d.aspectKey] : []);
      setRows(planetRows(), 'data-planet', d.planets || []);
    });
    svg.addEventListener('ap:wheel-clear', clearRows);

    // ── tables → wheel ──
    const wireRow = (node) => {
      const aspectKey = node.getAttribute('data-aspect-key');
      const planet = node.getAttribute('data-planet');
      const enter = () => {
        // Recover the two planets of an aspect row from the matching wheel line
        // so we can also light the glyphs (no string-splitting on names).
        let planets = planet ? [planet] : [];
        if (aspectKey) {
          const line = svg.querySelector(`.aspect-line[data-aspect-key="${CSS.escape(aspectKey)}"]`);
          if (line) planets = [line.getAttribute('data-planet1'), line.getAttribute('data-planet2')];
        }
        highlightOnWheel(svg, { aspectKey: aspectKey || null, planets });
        // Mirror onto the sibling rows (both planet rows for an aspect, etc.)
        setRows(aspectRows(), 'data-aspect-key', aspectKey ? [aspectKey] : []);
        setRows(planetRows(), 'data-planet', planets);
      };
      const leave = () => { clearWheelHighlight(svg); clearRows(); };
      node.addEventListener('mouseenter', enter);
      node.addEventListener('mouseleave', leave);
      node.addEventListener('focusin', enter);
      node.addEventListener('focusout', leave);
    };
    aspectRows().forEach(wireRow);
    planetRows().forEach(wireRow);
  }

  // ─── Public API ───────────────────────────────────────────────────────────
  window.AstroChartRender = {
    renderNatalChart,
    renderCompatibilityChart,
    renderTransitChart,
    linkWheelAndTables
  };

})();
