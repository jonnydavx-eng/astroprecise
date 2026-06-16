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

  // ─── Zodiac data ───────────────────────────────────────────────────────────
  const ZODIAC_SIGNS = [
    'Aries','Taurus','Gemini','Cancer','Leo','Virgo',
    'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'
  ];

  const ZODIAC_GLYPHS = {
    Aries:'♈︎', Taurus:'♉︎', Gemini:'♊︎', Cancer:'♋︎',
    Leo:'♌︎',   Virgo:'♍︎',  Libra:'♎︎',  Scorpio:'♏︎',
    Sagittarius:'♐︎', Capricorn:'♑︎', Aquarius:'♒︎', Pisces:'♓︎'
  };

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

  const SIGN_ELEMENT = {
    Aries:'fire',  Leo:'fire',  Sagittarius:'fire',
    Taurus:'earth', Virgo:'earth', Capricorn:'earth',
    Gemini:'air',   Libra:'air',   Aquarius:'air',
    Cancer:'water', Scorpio:'water', Pisces:'water'
  };

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
  // Major aspects: exact color, width, optional dash
  const ASPECT_STYLE = {
    Conjunction:     { color:'#FFFFFF', width:1,   dash:null  },
    Opposition:      { color:'#E0514A', width:1.5, dash:null  },
    Trine:           { color:'#5FA39A', width:1.5, dash:null  },   /* warm teal (was sky blue) */
    Square:          { color:'#F97316', width:1.5, dash:null  },
    Sextile:         { color:'#9DB36A', width:1,   dash:null  },   /* warm sage (was bright green) */
    // Minor aspects — gray dashed
    Quincunx:        { color:'#6B7280', width:0.5, dash:'3,3' },
    SemiSquare:      { color:'#6B7280', width:0.5, dash:'3,3' },
    Semisextile:     { color:'#6B7280', width:0.5, dash:'3,3' },
    Sesquiquadrate:  { color:'#6B7280', width:0.5, dash:'3,3' },
    Quintile:        { color:'#6B7280', width:0.5, dash:'3,3' },
    BiQuintile:      { color:'#6B7280', width:0.5, dash:'3,3' }
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
    // Soft white top highlight
    parentG.appendChild(el('ellipse', {
      cx: cx.toFixed(2), cy: (cy - r * 0.34).toFixed(2),
      rx: (r * 0.55).toFixed(2), ry: (r * 0.32).toFixed(2),
      fill: 'rgba(255,255,255,0.40)'
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

    svg.appendChild(defs);
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
    const starG = el('g', { class: 'ap-chart-stars', opacity: '0.85' });
    for (let i = 0; i < 180; i++) {
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

    // Faint engraved square (sacred-geo hint)
    const sq = R_ZODIAC_OUT * 0.42;
    svg.appendChild(el('rect', {
      x: (CX - sq).toFixed(1), y: (CY - sq).toFixed(1),
      width: (sq * 2).toFixed(1), height: (sq * 2).toFixed(1),
      fill: 'none', stroke: WARM.gold, 'stroke-width': '0.35',
      opacity: '0.06', transform: `rotate(45 ${CX} ${CY})`
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
        fill: fillClr,
        'fill-opacity': '0.30',
        stroke: '#C9A227',
        'stroke-width': '0.6'
      }));

      // Zodiac glyph centered in segment
      const midAng = lonToAngle(midLon, ascLon);
      const gp     = polar(CX, CY, R_GLYPH, midAng);
      // Glass orb chip behind the glyph (element colour, brightened)
      glassDisc(svg, g, gp.x, gp.y, 12, shade(fillClr, 0.18), idPrefix);
      const glyph  = el('text', {
        x: gp.x.toFixed(2), y: gp.y.toFixed(2),
        'text-anchor': 'middle', 'dominant-baseline': 'middle', 'alignment-baseline': 'middle',
        fill: '#ffffff',
        'font-size': '15',
        'font-family': '"AstroGlyph", "Noto Sans Symbols", serif',
        'font-weight': 'bold',
        filter: `url(#${idPrefix}rglow)`
      });
      glyph.textContent = ZODIAC_GLYPHS[sign];
      g.appendChild(glyph);
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
      g.appendChild(el('line', {
        x1: tp1.x.toFixed(2), y1: tp1.y.toFixed(2),
        x2: tp2.x.toFixed(2), y2: tp2.y.toFixed(2),
        stroke: '#C9A227',
        'stroke-width': isSignCusp ? '1.4' : isMajor ? '0.9' : '0.5',
        opacity: isSignCusp ? '0.9' : '0.7'
      }));
    }

    // Outer border circle (engraved gold gradient)
    g.appendChild(el('circle', {
      cx: CX, cy: CY, r: R_ZODIAC_OUT,
      fill: 'none', stroke: `url(#${idPrefix}ringG)`, 'stroke-width': '2.2',
      filter: `url(#${idPrefix}rglow)`
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
          'font-size': '9',
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
        fill: WARM.silverDim,
        'font-size': '10',
        'font-family': 'system-ui, sans-serif',
        opacity: '0.92'
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

  function wireAspectHover(svg) {
    const lines = svg.querySelectorAll('.aspect-line');
    if (!lines.length) return;
    const reset = () => lines.forEach(l => l.classList.remove('is-highlight', 'is-dimmed'));
    lines.forEach(line => {
      line.addEventListener('mouseenter', () => {
        lines.forEach(l => {
          l.classList.toggle('is-highlight', l === line);
          l.classList.toggle('is-dimmed', l !== line);
        });
      });
      line.addEventListener('mouseleave', reset);
      line.addEventListener('focus', () => {
        lines.forEach(l => {
          l.classList.toggle('is-highlight', l === line);
          l.classList.toggle('is-dimmed', l !== line);
        });
      });
      line.addEventListener('blur', reset);
    });
  }

  function drawAspectLines(svg, aspects, positions, ascLon) {
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

      const orbTxt = asp.orb !== undefined ? ` (${typeof asp.orb === 'number' ? asp.orb.toFixed(1) : asp.orb}°)` : '';
      const title = el('title');
      title.textContent = `${p1name} ${aspectName} ${p2name}${orbTxt}`;

      const attrs = {
        class: 'aspect-line aspect-line--draw',
        x1: pt1.x.toFixed(2), y1: pt1.y.toFixed(2),
        x2: pt2.x.toFixed(2), y2: pt2.y.toFixed(2),
        stroke: style.color,
        'stroke-width': style.width,
        opacity: opacity.toFixed(2),
        'data-aspect-key': aspectKey(asp),
        tabindex: '0',
        role: 'graphics-symbol',
        'aria-label': title.textContent
      };
      if (style.dash) attrs['stroke-dasharray'] = style.dash;

      const line = el('line', attrs);
      line.style.setProperty('--aspect-len', len.toFixed(1));
      line.style.setProperty('--aspect-op', opacity.toFixed(2));
      line.style.strokeDasharray = String(len);
      line.style.strokeDashoffset = String(len);
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
  // options: { colorOverride, ringRadius, dotRadius, fontSize, groupId, showDegrees, idPrefix }
  function drawPlanets(svg, positions, ascLon, idPrefix, options) {
    const opts    = options || {};
    const rPlanet = opts.ringRadius  || R_PLANET;
    const rDot    = opts.dotRadius   || R_PLANET_DOT;
    const fSize   = opts.fontSize    || '14';
    const gId     = opts.groupId     || 'planet-glyphs';
    const showDeg = opts.showDegrees !== false;

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

      // Thin spoke from inner zodiac edge to dot
      const spokeOut = polar(CX, CY, R_ZODIAC_IN - 1, trueAng);
      const spokeIn  = polar(CX, CY, rDot + 6,         trueAng);
      g.appendChild(el('line', {
        x1: spokeOut.x.toFixed(2), y1: spokeOut.y.toFixed(2),
        x2: spokeIn.x.toFixed(2),  y2: spokeIn.y.toFixed(2),
        stroke: pColor, 'stroke-width': '0.5', opacity: '0.4'
      }));

      // Small color-coded dot at the exact ecliptic position
      const dotPt = polar(CX, CY, rDot, trueAng);
      g.appendChild(el('circle', {
        cx: dotPt.x.toFixed(2), cy: dotPt.y.toFixed(2),
        r: '2.5', fill: pColor, opacity: '0.95'
      }));

      // Planet glyph at collision-resolved position
      const gp  = polar(CX, CY, rPlanet, dispAng);
      // Glass orb chip behind the planet glyph (planet colour)
      glassDisc(svg, g, gp.x, gp.y, 10, pColor, idPrefix);
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
      g.appendChild(txt);

      // Retrograde symbol ℞ as superscript after the glyph
      if (pos.retrograde) {
        const orp  = polar(CX, CY, rPlanet + 12, dispAng);
        const rTxt = el('text', {
          x: orp.x.toFixed(2), y: orp.y.toFixed(2),
          'text-anchor': 'middle', 'dominant-baseline': 'middle', 'alignment-baseline': 'middle',
          fill: '#FF9977',
          'font-size': '8',
          'font-family': 'serif, system-ui',
          opacity: '0.95'
        });
        rTxt.textContent = '℞';
        g.appendChild(rTxt);
      }

      // Degree label (tiny, just inside the planet ring)
      if (showDeg) {
        const _dv    = pos.degree !== undefined ? pos.degree : (((pos.lon % 30) + 30) % 30);
        const degNum = Math.floor(_dv);
        const minNum = Math.floor((_dv - degNum) * 60);
        const dlr    = rPlanet - 16;
        const dp     = polar(CX, CY, dlr, dispAng);
        const dl = el('text', {
          x: dp.x.toFixed(2), y: dp.y.toFixed(2),
          'text-anchor': 'middle', 'dominant-baseline': 'middle', 'alignment-baseline': 'middle',
          fill: WARM.silverDim,
          'font-size': '7',
          'font-family': 'var(--font-mono, "IBM Plex Mono", ui-monospace, monospace)',
          'font-variant-numeric': 'tabular-nums'
        });
        dl.textContent = `${degNum}°${String(minNum).padStart(2,'0')}'`;
        g.appendChild(dl);
      }
    }

    svg.appendChild(g);
  }

  // ─── Center circle with label ─────────────────────────────────────────────
  function drawCenter(svg, label, idPrefix) {
    // Engraved medallion rings
    svg.appendChild(el('circle', {
      cx: CX, cy: CY, r: R_INNER + 6,
      fill: 'none', stroke: WARM.gold, 'stroke-width': '0.6', opacity: '0.22'
    }));
    svg.appendChild(el('circle', {
      cx: CX, cy: CY, r: R_CENTER_FILL,
      fill: `url(#${idPrefix}cgrad)`,
      stroke: WARM.goldDim, 'stroke-width': '1.2', opacity: '0.95'
    }));

    const displayName = (label || 'Natal Chart').slice(0, 22);
    const lbl = el('text', {
      x: CX, y: CY - 4,
      'text-anchor': 'middle', 'dominant-baseline': 'middle', 'alignment-baseline': 'middle',
      fill: WARM.parchment,
      'font-size': displayName.length > 14 ? '9' : '11',
      'font-family': 'var(--font-display, "Cinzel", serif), system-ui, sans-serif',
      'font-weight': '600',
      opacity: '0.95'
    });
    lbl.textContent = displayName;
    svg.appendChild(lbl);

    const sub = el('text', {
      x: CX, y: CY + 12,
      'text-anchor': 'middle', 'dominant-baseline': 'middle', 'alignment-baseline': 'middle',
      fill: WARM.gold,
      'font-size': '6.5',
      'font-family': 'system-ui, sans-serif',
      'letter-spacing': '0.18em',
      opacity: '0.75'
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
      const elemClr  = ELEMENT_TEXT[SIGN_ELEMENT[signName]] || WARM.silver;
      const houseNum = houses ? getPlanetHouse(pos.lon, houses) : '—';
      const pColor   = PLANET_COLORS[name] || WARM.silver;

      const cells = [
        `<span class="ap-pt-glyph" style="color:${pColor}">${PLANET_GLYPHS[name] || ''}</span>`,
        `<span class="ap-pt-name">${name}</span>`,
        `<span class="ap-pt-glyph" style="color:${elemClr}">${ZODIAC_GLYPHS[signName] || ''}</span>`,
        `<span style="color:${elemClr}">${signName}</span>`,
        `<span class="ap-pt-deg">${degNum}°${String(minNum).padStart(2,'0')}'</span>`,
        `<span class="ap-pt-house">${houseNum}</span>`,
        pos.retrograde ? `<span class="ap-pt-rx">℞</span>` : ''
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
      ['Fire',  ELEMENT_FILL.fire,  '♈♌♐'],
      ['Earth', ELEMENT_FILL.earth, '♉♍♑'],
      ['Air',   ELEMENT_FILL.air,   '♊♎♒'],
      ['Water', ELEMENT_FILL.water, '♋♏♓']
    ].forEach(([n, c, s]) => {
      const row = document.createElement('div');
      row.className = 'ap-chart-legend__row';
      row.innerHTML = `<span class="ap-chart-legend__dot" style="background:${c}"></span><span style="color:${ELEMENT_TEXT[n.toLowerCase()] || ELEMENT_TEXT[SIGN_ELEMENT[n]] || c};font-weight:600">${n}</span><span style="font-family:serif;font-size:12px">${s}</span>`;
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
    c.innerHTML = '';
    c.className = wheelOnly ? 'ap-chart-render' : 'ap-chart-render ap-chart-render--full';
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
    drawOrbitalSchematic(svg, ascLon, prefix);
    drawZodiacWheel(svg, ascLon, prefix);
    drawHouseWheel(svg, houses, ascLon, prefix);
    if (showAsp) drawAspectLines(svg, aspects, positions, ascLon);
    drawPlanets(svg, positions, ascLon, prefix, { showDegrees: showDeg });
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
    drawOrbitalSchematic(svg, ascLon, prefix);
    drawZodiacWheel(svg, ascLon, prefix);
    drawHouseWheel(svg, houses1, ascLon, prefix);
    if (showAsp) drawAspectLines(svg, chart1.synastryAspects || aspects, pos1, ascLon);

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
    drawOrbitalSchematic(svg, ascLon, prefix);
    drawZodiacWheel(svg, ascLon, prefix);
    drawHouseWheel(svg, houses, ascLon, prefix);
    if (showAsp) drawAspectLines(svg, natalChart.transitAspects || aspects, natalPos, ascLon);

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

  // ─── Public API ───────────────────────────────────────────────────────────
  window.AstroChartRender = {
    renderNatalChart,
    renderCompatibilityChart,
    renderTransitChart
  };

})();
