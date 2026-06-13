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

  // ─── Zodiac data ───────────────────────────────────────────────────────────
  const ZODIAC_SIGNS = [
    'Aries','Taurus','Gemini','Cancer','Leo','Virgo',
    'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'
  ];

  const ZODIAC_GLYPHS = {
    Aries:'♈', Taurus:'♉', Gemini:'♊', Cancer:'♋',
    Leo:'♌',   Virgo:'♍',  Libra:'♎',  Scorpio:'♏',
    Sagittarius:'♐', Capricorn:'♑', Aquarius:'♒', Pisces:'♓'
  };

  // Element fill colors per spec (30% opacity applied via fill-opacity)
  const ELEMENT_FILL = {
    fire:  '#FF6B35',
    earth: '#2D7A4F',
    air:   '#4A9EBF',
    water: '#3D5A99'
  };

  // Text/stroke accent per element
  const ELEMENT_TEXT = {
    fire:  '#FF9966',
    earth: '#66CC88',
    air:   '#88CCEE',
    water: '#88AADD'
  };

  const SIGN_ELEMENT = {
    Aries:'fire',  Leo:'fire',  Sagittarius:'fire',
    Taurus:'earth', Virgo:'earth', Capricorn:'earth',
    Gemini:'air',   Libra:'air',   Aquarius:'air',
    Cancer:'water', Scorpio:'water', Pisces:'water'
  };

  // ─── Planet data ───────────────────────────────────────────────────────────
  const PLANET_GLYPHS = {
    Sun:'☉',      Moon:'☽',      Mercury:'☿',  Venus:'♀',
    Mars:'♂',     Jupiter:'♃',   Saturn:'♄',   Uranus:'♅',
    Neptune:'♆',  Pluto:'♇',     Chiron:'⚷',   NorthNode:'☊',
    SouthNode:'☋', Ascendant:'AC', Midheaven:'MC'
  };

  const PLANET_COLORS = {
    Sun:'#FFD700',      Moon:'#C8D8E8',    Mercury:'#B8CCD8', Venus:'#FFB6C1',
    Mars:'#FF6644',     Jupiter:'#FFB347', Saturn:'#C8A86B',  Uranus:'#88DDFF',
    Neptune:'#8899FF',  Pluto:'#CC88AA',   Chiron:'#AABB99',  NorthNode:'#DDCC88',
    SouthNode:'#BBAA77', Ascendant:'#FFFFFF', Midheaven:'#FFFFFF'
  };

  const PLANET_ORDER = [
    'Sun','Moon','Mercury','Venus','Mars',
    'Jupiter','Saturn','Uranus','Neptune','Pluto',
    'Chiron','NorthNode','SouthNode'
  ];

  // ─── Aspect styling (per spec) ─────────────────────────────────────────────
  // Major aspects: exact color, width, optional dash
  const ASPECT_STYLE = {
    Conjunction:     { color:'#FFFFFF', width:1,   dash:null  },
    Opposition:      { color:'#EF4444', width:1.5, dash:null  },
    Trine:           { color:'#60A5FA', width:1.5, dash:null  },
    Square:          { color:'#F97316', width:1.5, dash:null  },
    Sextile:         { color:'#4ADE80', width:1,   dash:null  },
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
    [[0,   '#16162E', 1],
     [0.6, '#0D0D22', 1],
     [1,   '#06060F', 1]
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

    svg.appendChild(defs);
  }

  // ─── Background + star field ──────────────────────────────────────────────
  function drawBackground(svg) {
    // Dark background circle
    svg.appendChild(el('circle', {
      cx: CX, cy: CY, r: R_ZODIAC_OUT,
      fill: '#080814'
    }));

    // Subtle star dots (deterministic LCG so they're always the same)
    let seed = 0xDEADBEEF;
    function rand() {
      seed = Math.imul(seed ^ (seed >>> 16), 0x45D9F3B);
      seed = Math.imul(seed ^ (seed >>> 16), 0x45D9F3B);
      seed ^= seed >>> 16;
      return (seed >>> 0) / 0xFFFFFFFF;
    }
    for (let i = 0; i < 120; i++) {
      let sx, sy;
      for (let t = 0; t < 8; t++) {
        sx = CX - R_ZODIAC_OUT + rand() * R_ZODIAC_OUT * 2;
        sy = CY - R_ZODIAC_OUT + rand() * R_ZODIAC_OUT * 2;
        const d2 = (sx - CX) ** 2 + (sy - CY) ** 2;
        if (d2 < R_ZODIAC_OUT * R_ZODIAC_OUT) break;
      }
      const sr  = rand() * 1.1 + 0.2;
      const op  = (rand() * 0.4 + 0.15).toFixed(2);
      svg.appendChild(el('circle', {
        cx: sx.toFixed(1), cy: sy.toFixed(1),
        r: sr.toFixed(2), fill: '#FFFFFF', opacity: op
      }));
    }
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
        stroke: '#B8943A',
        'stroke-width': '0.6'
      }));

      // Zodiac glyph centered in segment
      const midAng = lonToAngle(midLon, ascLon);
      const gp     = polar(CX, CY, R_GLYPH, midAng);
      const glyph  = el('text', {
        x: gp.x.toFixed(2), y: gp.y.toFixed(2),
        'text-anchor': 'middle', 'dominant-baseline': 'central',
        fill: txtClr,
        'font-size': '15',
        'font-family': 'serif, "Apple Color Emoji", "Segoe UI Emoji", system-ui',
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
        stroke: '#C8A84B',
        'stroke-width': isSignCusp ? '1.4' : isMajor ? '0.9' : '0.5',
        opacity: isSignCusp ? '0.9' : '0.7'
      }));
    }

    // Outer border circle
    g.appendChild(el('circle', {
      cx: CX, cy: CY, r: R_ZODIAC_OUT,
      fill: 'none', stroke: '#C8A84B', 'stroke-width': '2',
      filter: `url(#${idPrefix}rglow)`
    }));

    // Inner border of zodiac ring
    g.appendChild(el('circle', {
      cx: CX, cy: CY, r: R_ZODIAC_IN,
      fill: 'none', stroke: '#C8A84B', 'stroke-width': '1'
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
        stroke: isAngle ? '#C8A84B' : '#4A4838',
        'stroke-width': isAngle ? '2' : '0.8',
        opacity: isAngle ? '1' : '0.75'
      }));

      // AC/DC/MC/IC labels inside the zodiac ring near the cusp
      if (ANGLE_LABELS[h]) {
        const labelR = R_ZODIAC_IN - 14;
        const lp = polar(CX, CY, labelR, visualAng);
        const lbl = el('text', {
          x: lp.x.toFixed(2), y: lp.y.toFixed(2),
          'text-anchor': 'middle', 'dominant-baseline': 'central',
          fill: '#C8A84B',
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
        'text-anchor': 'middle', 'dominant-baseline': 'central',
        fill: '#778899',
        'font-size': '10',
        'font-family': 'system-ui, sans-serif',
        opacity: '0.9'
      });
      hnum.textContent = String(h + 1);
      g.appendChild(hnum);
    }

    svg.appendChild(g);
  }

  // ─── Aspect lines ─────────────────────────────────────────────────────────
  function drawAspectLines(svg, aspects, positions, ascLon) {
    if (!aspects || aspects.length === 0) return;
    const g = el('g', { class: 'aspect-lines' });

    for (const asp of aspects) {
      const pos1 = positions[asp.planet1];
      const pos2 = positions[asp.planet2];
      if (!pos1 || !pos2) continue;

      const style   = ASPECT_STYLE[asp.aspect]   || ASPECT_STYLE.Quincunx;
      const opacity = ASPECT_OPACITY[asp.aspect]  || 0.35;

      const a1 = lonToAngle(pos1.lon, ascLon);
      const a2 = lonToAngle(pos2.lon, ascLon);
      const p1 = polar(CX, CY, R_ASPECT, a1);
      const p2 = polar(CX, CY, R_ASPECT, a2);

      const attrs = {
        x1: p1.x.toFixed(2), y1: p1.y.toFixed(2),
        x2: p2.x.toFixed(2), y2: p2.y.toFixed(2),
        stroke: style.color,
        'stroke-width': style.width,
        opacity: opacity.toFixed(2)
      };
      if (style.dash) attrs['stroke-dasharray'] = style.dash;

      g.appendChild(el('line', attrs));
    }

    svg.appendChild(g);
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
      const txt = el('text', {
        x: gp.x.toFixed(2), y: gp.y.toFixed(2),
        'text-anchor': 'middle', 'dominant-baseline': 'central',
        fill: pColor,
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
          'text-anchor': 'middle', 'dominant-baseline': 'central',
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
          'text-anchor': 'middle', 'dominant-baseline': 'central',
          fill: '#8899AA',
          'font-size': '7',
          'font-family': 'system-ui, sans-serif'
        });
        dl.textContent = `${degNum}°${String(minNum).padStart(2,'0')}'`;
        g.appendChild(dl);
      }
    }

    svg.appendChild(g);
  }

  // ─── Center circle with label ─────────────────────────────────────────────
  function drawCenter(svg, label, idPrefix) {
    svg.appendChild(el('circle', {
      cx: CX, cy: CY, r: R_CENTER_FILL,
      fill: `url(#${idPrefix}cgrad)`,
      stroke: '#2A2A4A', 'stroke-width': '1.5'
    }));

    const displayName = (label || 'Natal Chart').slice(0, 22);
    const lbl = el('text', {
      x: CX, y: CY,
      'text-anchor': 'middle', 'dominant-baseline': 'central',
      fill: '#C8A84B',
      'font-size': displayName.length > 14 ? '10' : '12',
      'font-family': 'system-ui, sans-serif',
      'font-weight': '600',
      opacity: '0.9'
    });
    lbl.textContent = displayName;
    svg.appendChild(lbl);

    svg.appendChild(el('circle', {
      cx: CX, cy: CY, r: R_CORE_DOT,
      fill: '#C8A84B', opacity: '0.85'
    }));
  }

  // ─── Planet table (HTML, below the SVG) ──────────────────────────────────
  function buildPlanetTable(positions, houses) {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'margin-top:14px;overflow-x:auto;font-family:system-ui,sans-serif';

    const tbl = document.createElement('table');
    tbl.style.cssText = [
      'width:100%', 'border-collapse:collapse', 'font-size:12px',
      'background:#0A0A1E', 'color:#CCDDE8', 'border:1px solid #1E1E3A'
    ].join(';');

    // Header row
    const thead = document.createElement('thead');
    const hr    = document.createElement('tr');
    hr.style.cssText = 'background:#111130;border-bottom:2px solid #C8A84B';
    ['', 'Planet', '', 'Sign', "Degree°Min'", 'House', 'Rx'].forEach(hdr => {
      const th = document.createElement('th');
      th.style.cssText = 'padding:6px 9px;text-align:left;color:#C8A84B;font-weight:700;font-size:11px;letter-spacing:0.08em;white-space:nowrap';
      th.textContent = hdr;
      hr.appendChild(th);
    });
    thead.appendChild(hr);
    tbl.appendChild(thead);

    const tbody = document.createElement('tbody');
    let row = 0;
    for (const name of PLANET_ORDER) {
      const pos = positions[name];
      if (!pos) continue;

      const tr = document.createElement('tr');
      tr.style.background   = row % 2 === 0 ? '#0A0A1E' : '#0F0F26';
      tr.style.borderBottom = '1px solid #1E1E3A';

      const _dv      = pos.degree !== undefined ? pos.degree : (((pos.lon % 30) + 30) % 30);
      const degNum   = Math.floor(_dv);
      const minNum   = Math.floor((_dv - degNum) * 60);
      const signName = pos.sign || ZODIAC_SIGNS[Math.floor(normLon(pos.lon) / 30)];
      const elemClr  = ELEMENT_TEXT[SIGN_ELEMENT[signName]] || '#AABBCC';
      const houseNum = houses ? getPlanetHouse(pos.lon, houses) : '—';
      const pColor   = PLANET_COLORS[name] || '#CCCCCC';

      const cells = [
        `<span style="font-size:17px;font-family:serif;color:${pColor}">${PLANET_GLYPHS[name] || ''}</span>`,
        `<span style="color:#DDEEFF">${name}</span>`,
        `<span style="font-size:15px;font-family:serif;color:${elemClr}">${ZODIAC_GLYPHS[signName] || ''}</span>`,
        `<span style="color:${elemClr}">${signName}</span>`,
        `<span style="color:#D0E8FF;font-variant-numeric:tabular-nums">${degNum}°${String(minNum).padStart(2,'0')}'</span>`,
        `<span style="color:#C8A84B;font-weight:600">${houseNum}</span>`,
        pos.retrograde ? `<span style="color:#FF9977;font-family:serif;font-size:13px">℞</span>` : ''
      ];

      for (const html of cells) {
        const td = document.createElement('td');
        td.style.padding = '5px 9px';
        td.innerHTML = html;
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
      row++;
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
    wrap.style.cssText = 'margin-top:12px;display:flex;flex-wrap:wrap;gap:18px;font-family:system-ui,sans-serif;font-size:12px;color:#AABBCC';

    // Aspect legend
    const aDiv = document.createElement('div');
    aDiv.style.cssText = 'flex:1;min-width:180px';
    aDiv.innerHTML = '<div style="color:#C8A84B;font-weight:700;margin-bottom:5px;letter-spacing:0.08em;font-size:11px">ASPECTS</div>';
    [
      ['Conjunction','☌','#FFFFFF'],['Opposition','☍','#EF4444'],
      ['Trine','△','#60A5FA'],['Square','□','#F97316'],
      ['Sextile','⚹','#4ADE80'],['Minor','- -','#6B7280']
    ].forEach(([n, s, c]) => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:5px;margin-bottom:2px';
      row.innerHTML = `<span style="color:${c};font-size:14px;font-family:serif;width:16px;text-align:center">${s}</span><span>${n}</span>`;
      aDiv.appendChild(row);
    });
    wrap.appendChild(aDiv);

    // Element legend
    const eDiv = document.createElement('div');
    eDiv.style.cssText = 'flex:1;min-width:160px';
    eDiv.innerHTML = '<div style="color:#C8A84B;font-weight:700;margin-bottom:5px;letter-spacing:0.08em;font-size:11px">ELEMENTS</div>';
    [
      ['Fire', '#FF6B35','♈♌♐'],['Earth','#2D7A4F','♉♍♑'],
      ['Air',  '#4A9EBF','♊♎♒'],['Water','#3D5A99','♋♏♓']
    ].forEach(([n, c, s]) => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:2px';
      row.innerHTML = `<span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${c};opacity:0.9;flex-shrink:0"></span><span style="color:${c};font-weight:600">${n}</span><span style="font-family:serif;font-size:12px">${s}</span>`;
      eDiv.appendChild(row);
    });
    wrap.appendChild(eDiv);

    // Chart info (optional)
    if (dominant || chartRuler) {
      const iDiv = document.createElement('div');
      iDiv.style.cssText = 'flex:1;min-width:150px';
      iDiv.innerHTML = '<div style="color:#C8A84B;font-weight:700;margin-bottom:5px;letter-spacing:0.08em;font-size:11px">CHART INFO</div>';
      if (dominant) {
        if (dominant.element)  iDiv.innerHTML += `<div style="margin-bottom:3px">Element: <strong style="color:#DDEEFF">${dominant.element}</strong></div>`;
        if (dominant.modality) iDiv.innerHTML += `<div style="margin-bottom:3px">Modality: <strong style="color:#DDEEFF">${dominant.modality}</strong></div>`;
      }
      if (chartRuler) {
        const rc = PLANET_COLORS[chartRuler] || '#CCC';
        const rg = PLANET_GLYPHS[chartRuler] || '';
        iDiv.innerHTML += `<div>Ruler: <span style="color:${rc};font-size:15px;font-family:serif">${rg}</span> <strong style="color:#DDEEFF">${chartRuler}</strong></div>`;
      }
      wrap.appendChild(iDiv);
    }

    return wrap;
  }

  // ─── Title bar ────────────────────────────────────────────────────────────
  function buildTitleBar(title, subtitle) {
    const bar = document.createElement('div');
    bar.style.cssText = 'text-align:center;padding:8px 4px 4px;font-family:system-ui,sans-serif';
    if (title) {
      const h = document.createElement('div');
      h.style.cssText = 'color:#C8A84B;font-size:15px;font-weight:700;letter-spacing:0.12em';
      h.textContent = title.toUpperCase();
      bar.appendChild(h);
    }
    if (subtitle) {
      const s = document.createElement('div');
      s.style.cssText = 'color:#6A7A8A;font-size:11px;margin-top:2px;letter-spacing:0.05em';
      s.textContent = subtitle;
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
      style: 'display:block;max-width:100%'
    });
  }

  // ─── Get/reset container ──────────────────────────────────────────────────
  function getContainer(containerId) {
    const c = document.getElementById(containerId);
    if (!c) { console.error(`AstroChartRender: #${containerId} not found`); return null; }
    c.innerHTML    = '';
    c.style.background   = '#06060F';
    c.style.borderRadius = '10px';
    c.style.padding      = '14px';
    c.style.boxSizing    = 'border-box';
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
    const container = getContainer(containerId);
    if (!container) return;

    const positions = chartData.positions || {};
    const houses    = chartData.houses    || Array.from({ length: 12 }, (_, i) => i * 30);
    const aspects   = chartData.aspects   || [];
    const showAsp   = opts.showAspects !== false;
    const showDeg   = opts.showDegrees !== false;

    const ascLon = normLon(
      positions.Ascendant ? positions.Ascendant.lon : houses[0]
    );

    const prefix = nextPrefix();

    // Optional title bar
    const title    = opts.title    || chartData.name  || null;
    const subtitle = opts.subtitle || null;
    if (title || subtitle) container.appendChild(buildTitleBar(title, subtitle));

    // SVG wheel
    const svg = createSVG();
    buildDefs(svg, prefix);
    drawBackground(svg);
    drawZodiacWheel(svg, ascLon, prefix);
    drawHouseWheel(svg, houses, ascLon, prefix);
    if (showAsp) drawAspectLines(svg, aspects, positions, ascLon);
    drawPlanets(svg, positions, ascLon, prefix, { showDegrees: showDeg });
    drawCenter(svg, chartData.name || 'Natal Chart', prefix);

    container.appendChild(svg);

    // Planet table
    container.appendChild(buildPlanetTable(positions, houses));

    // Aspect + element legend
    container.appendChild(buildLegend(chartData.dominant, chartData.chartRuler));
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

    container.appendChild(buildTitleBar(
      opts.title    || 'Synastry Chart',
      opts.subtitle || `${name1} ♥ ${name2}`
    ));

    const svg = createSVG();
    buildDefs(svg, prefix);
    drawBackground(svg);
    drawZodiacWheel(svg, ascLon, prefix);
    drawHouseWheel(svg, houses1, ascLon, prefix);
    if (showAsp) drawAspectLines(svg, chart1.synastryAspects || aspects, pos1, ascLon);

    // Person 1: inner ring at standard radius
    drawPlanets(svg, pos1, ascLon, prefix, {
      ringRadius:  R_PLANET,
      dotRadius:   R_PLANET_DOT,
      fontSize:    '13',
      groupId:     'p1-planets',
      showDegrees: showDeg
    });

    // Person 2: outer ring between planet ring and zodiac inner edge
    drawPlanets(svg, pos2, ascLon, prefix, {
      ringRadius:    R_PLANET + 22,
      dotRadius:     R_PLANET + 28,
      fontSize:      '12',
      groupId:       'p2-planets',
      colorOverride: '#88DDFF',
      showDegrees:   false
    });

    drawCenter(svg, `${name1} / ${name2}`, prefix);
    container.appendChild(svg);

    // Color key
    const keyRow = document.createElement('div');
    keyRow.style.cssText = 'display:flex;gap:20px;margin:10px 4px 0;font-family:system-ui,sans-serif;font-size:12px';
    keyRow.innerHTML =
      `<span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#FFD700;vertical-align:middle;margin-right:4px"></span><span style="color:#FFD700;font-weight:600">${name1}</span></span>` +
      `<span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#88DDFF;vertical-align:middle;margin-right:4px"></span><span style="color:#88DDFF;font-weight:600">${name2}</span></span>`;
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
    tables.appendChild(makeTableBlock(name2, '#88DDFF', pos2, houses2));
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
    drawBackground(svg);
    drawZodiacWheel(svg, ascLon, prefix);
    drawHouseWheel(svg, houses, ascLon, prefix);
    if (showAsp) drawAspectLines(svg, natalChart.transitAspects || aspects, natalPos, ascLon);

    // Natal planets (inner ring, default colors)
    drawPlanets(svg, natalPos, ascLon, prefix, {
      ringRadius:  R_PLANET,
      dotRadius:   R_PLANET_DOT,
      fontSize:    '13',
      groupId:     'natal-planets',
      showDegrees: showDeg
    });

    // Transit planets (outer ring, lime/teal to distinguish)
    drawPlanets(svg, tPos, ascLon, prefix, {
      ringRadius:    R_PLANET + 22,
      dotRadius:     R_PLANET + 28,
      fontSize:      '12',
      groupId:       'transit-planets',
      colorOverride: '#AAFFBB',
      showDegrees:   false
    });

    drawCenter(svg, natalChart.name || 'Natal Chart', prefix);
    container.appendChild(svg);

    // Color key
    const keyRow = document.createElement('div');
    keyRow.style.cssText = 'display:flex;gap:20px;margin:10px 4px 0;font-family:system-ui,sans-serif;font-size:12px';
    keyRow.innerHTML =
      '<span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#FFD700;vertical-align:middle;margin-right:4px"></span><span style="color:#FFD700;font-weight:600">Natal</span></span>' +
      '<span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#AAFFBB;vertical-align:middle;margin-right:4px"></span><span style="color:#AAFFBB;font-weight:600">Transits</span></span>';
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
    tables.appendChild(makeBlock('TRANSIT PLANETS', '#AAFFBB', tPos,
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
