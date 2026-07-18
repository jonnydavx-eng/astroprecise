/**
 * AP Natal Sphere — unique chart instrument (not a flat content-farm wheel)
 * ---------------------------------------------------------------------------
 * Canvas 3D-projected celestial sphere: ecliptic ring, sign wedges, planet
 * nodes at true geocentric longitude, aspect chords as luminous arcs.
 * Inspired by Astrolog chart spheres + NASA Eyes instrument language.
 * Data: chart.positions from calculateNatalChart (same engine as the 2D wheel).
 *
 * Honesty: schematic sphere geometry · longitudes are Meeus/VSOP computed.
 * CTA: open birth sky in living model via APDeepLink / APSkyBridge when present.
 */
(function (w) {
  'use strict';

  var SIGNS = ['Ari','Tau','Gem','Can','Leo','Vir','Lib','Sco','Sag','Cap','Aqu','Pis'];
  var SIGNS_FULL = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
  var ORDER = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'];
  var GLYPH = { Sun:'☉', Moon:'☽', Mercury:'☿', Venus:'♀', Mars:'♂', Jupiter:'♃', Saturn:'♄', Uranus:'♅', Neptune:'♆', Pluto:'♇' };
  var ASPECTS = [
    { name: 'conjunction', angle: 0, orb: 8, color: 'rgba(233,237,242,0.55)' },
    { name: 'opposition', angle: 180, orb: 7, color: 'rgba(242,138,106,0.7)' },
    { name: 'trine', angle: 120, orb: 6, color: 'rgba(126,240,200,0.65)' },
    { name: 'square', angle: 90, orb: 6, color: 'rgba(242,138,106,0.55)' },
    { name: 'sextile', angle: 60, orb: 4, color: 'rgba(159,220,236,0.55)' }
  ];

  function lonOf(pos) {
    if (!pos) return null;
    if (typeof pos.lon === 'number' && isFinite(pos.lon)) return ((pos.lon % 360) + 360) % 360;
    if (typeof pos.longitude === 'number' && isFinite(pos.longitude)) return ((pos.longitude % 360) + 360) % 360;
    // chart-page style: sign + degree (degree is 0–30 within sign)
    if (pos.sign != null && pos.degree != null && isFinite(Number(pos.degree))) {
      var si = SIGNS_FULL.indexOf(pos.sign);
      if (si < 0) {
        // try lowercase / short
        var s = String(pos.sign);
        si = SIGNS_FULL.findIndex(function (n) { return n.toLowerCase() === s.toLowerCase(); });
      }
      if (si < 0) si = 0;
      return si * 30 + Number(pos.degree);
    }
    return null;
  }

  function sep(a, b) {
    var d = Math.abs(a - b) % 360;
    return d > 180 ? 360 - d : d;
  }

  function project(lonDeg, elev, R, cx, cy, tilt) {
    // ecliptic lon → 3D on sphere, camera slightly above
    var a = (lonDeg - 90) * Math.PI / 180; // ASC-ish at left when tilt default
    var el = elev * Math.PI / 180;
    var x = Math.cos(el) * Math.cos(a);
    var y = Math.sin(el);
    var z = Math.cos(el) * Math.sin(a);
    // rotate about X by tilt
    var cosT = Math.cos(tilt), sinT = Math.sin(tilt);
    var y2 = y * cosT - z * sinT;
    var z2 = y * sinT + z * cosT;
    var scale = R / (1.55 + z2 * 0.55);
    return { x: cx + x * scale, y: cy - y2 * scale, z: z2, s: scale };
  }

  function collectBodies(chart) {
    var pos = chart && chart.positions;
    if (!pos) return [];
    var out = [];
    ORDER.forEach(function (name) {
      var p = pos[name] || pos[name.toLowerCase()];
      var lon = lonOf(p);
      if (lon == null || !isFinite(lon)) return;
      out.push({ name: name, lon: lon, glyph: GLYPH[name] || '·', retro: !!(p && (p.retrograde || p.rx)) });
    });
    return out;
  }

  function collectAspects(bodies) {
    var list = [];
    for (var i = 0; i < bodies.length; i++) {
      for (var j = i + 1; j < bodies.length; j++) {
        var s = sep(bodies[i].lon, bodies[j].lon);
        for (var k = 0; k < ASPECTS.length; k++) {
          var A = ASPECTS[k];
          var orb = Math.abs(s - A.angle);
          if (orb <= A.orb) {
            list.push({ a: bodies[i], b: bodies[j], name: A.name, orb: orb, color: A.color, exact: s });
            break;
          }
        }
      }
    }
    list.sort(function (u, v) { return u.orb - v.orb; });
    return list.slice(0, 12);
  }

  function paint(canvas, chart, opts) {
    opts = opts || {};
    var dpr = Math.min(w.devicePixelRatio || 1, 2);
    var css = opts.size || Math.min(canvas.clientWidth || 420, 520);
    canvas.width = Math.round(css * dpr);
    canvas.height = Math.round(css * dpr);
    canvas.style.width = css + 'px';
    canvas.style.height = css + 'px';
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var W = css, H = css, cx = W / 2, cy = H / 2, R = W * 0.38;
    var tilt = opts.tilt != null ? opts.tilt : 0.55;
    var t = (opts.t || 0) * 0.00015;

    // void
    var g = ctx.createRadialGradient(cx, cy * 0.85, R * 0.1, cx, cy, R * 1.6);
    g.addColorStop(0, '#0c1722');
    g.addColorStop(0.55, '#070b12');
    g.addColorStop(1, '#030508');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // star dust
    ctx.fillStyle = 'rgba(233,237,242,0.35)';
    for (var i = 0; i < 80; i++) {
      var sx = (Math.sin(i * 12.9898 + t * 3) * 0.5 + 0.5) * W;
      var sy = (Math.cos(i * 78.233 + t * 2) * 0.5 + 0.5) * H;
      ctx.globalAlpha = 0.15 + (i % 5) * 0.08;
      ctx.fillRect(sx, sy, 1.2, 1.2);
    }
    ctx.globalAlpha = 1;

    // sign wedges on ecliptic belt
    for (var s = 0; s < 12; s++) {
      var a0 = s * 30, a1 = a0 + 30;
      ctx.beginPath();
      var steps = 8;
      for (var k = 0; k <= steps; k++) {
        var lon = a0 + (a1 - a0) * (k / steps);
        var p = project(lon + t * 40, 0, R, cx, cy, tilt);
        if (k === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
      for (k = steps; k >= 0; k--) {
        lon = a0 + (a1 - a0) * (k / steps);
        p = project(lon + t * 40, 8, R * 0.92, cx, cy, tilt);
        ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      ctx.fillStyle = s % 2 === 0 ? 'rgba(159,220,236,0.05)' : 'rgba(159,220,236,0.02)';
      ctx.fill();
      var mid = project(a0 + 15 + t * 40, 14, R * 0.88, cx, cy, tilt);
      if (mid.z > -0.2) {
        ctx.fillStyle = 'rgba(159,220,236,0.55)';
        ctx.font = '500 11px "IBM Plex Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(SIGNS[s], mid.x, mid.y);
      }
    }

    // ecliptic ring
    ctx.beginPath();
    for (i = 0; i <= 96; i++) {
      p = project(i * (360 / 96) + t * 40, 0, R, cx, cy, tilt);
      if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.strokeStyle = 'rgba(159,220,236,0.55)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // outer bezel
    ctx.beginPath();
    ctx.arc(cx, cy, R * 1.22, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(159,220,236,0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();

    var bodies = collectBodies(chart);
    var aspects = collectAspects(bodies);

    // aspects under planets
    aspects.forEach(function (A) {
      var pa = project(A.a.lon + t * 40, 2, R * 0.98, cx, cy, tilt);
      var pb = project(A.b.lon + t * 40, 2, R * 0.98, cx, cy, tilt);
      if (pa.z < -0.55 && pb.z < -0.55) return;
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.quadraticCurveTo(cx, cy, pb.x, pb.y);
      ctx.strokeStyle = A.color;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    });

    // planet nodes (sort by z for painter)
    var drawn = bodies.map(function (b) {
      var pr = project(b.lon + t * 40, 3, R * 1.02, cx, cy, tilt);
      return { b: b, p: pr };
    }).sort(function (u, v) { return u.p.z - v.p.z; });

    drawn.forEach(function (D) {
      var p = D.p, b = D.b;
      var r = 11 + Math.max(0, p.z) * 4;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r + 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(159,220,236,0.12)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = '#0a1018';
      ctx.fill();
      ctx.strokeStyle = 'rgba(233,237,242,0.75)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.fillStyle = '#e9edf2';
      ctx.font = '16px "Schibsted Grotesk", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.glyph, p.x, p.y + 1);
      ctx.fillStyle = 'rgba(159,220,236,0.85)';
      ctx.font = '500 9px "IBM Plex Mono", monospace';
      ctx.fillText(b.name.slice(0, 3).toUpperCase() + (b.retro ? ' ℞' : ''), p.x, p.y + r + 11);
    });

    // centre seal
    ctx.fillStyle = 'rgba(159,220,236,0.35)';
    ctx.font = '18px serif';
    ctx.textAlign = 'center';
    ctx.fillText('✶', cx, cy + 2);
    ctx.fillStyle = 'rgba(233,237,242,0.45)';
    ctx.font = '500 8px "IBM Plex Mono", monospace';
    ctx.fillText('NATAL SPHERE · GEO · ±1′', cx, cy + R * 1.35);

    return { bodies: bodies, aspects: aspects };
  }

  function mount(host, chart, opts) {
    opts = opts || {};
    if (!host || !chart) return null;
    host.classList.add('ap-natal-sphere');
    host.setAttribute('role', 'region');
    host.setAttribute('aria-label', 'Natal sphere — 3D ecliptic instrument from the same engine as the wheel. Schematic depth.');
    host.innerHTML = '';

    var head = document.createElement('div');
    head.className = 'ap-natal-sphere__head';
    head.innerHTML =
      '<span class="ap-natal-sphere__brand">NATAL SPHERE</span>' +
      '<span class="ap-natal-sphere__sub">3D ECLIPTIC INSTRUMENT · SAME ENGINE AS THE WHEEL · SCHEMATIC DEPTH</span>';

    var stage = document.createElement('div');
    stage.className = 'ap-natal-sphere__stage';
    var canvas = document.createElement('canvas');
    canvas.className = 'ap-natal-sphere__canvas';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Three-dimensional natal chart sphere showing planet positions on the ecliptic');
    stage.appendChild(canvas);

    var sr = document.createElement('p');
    sr.className = 'ap-natal-sphere__sr-only';
    sr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0';
    try {
      var bodies = collectBodies(chart) || [];
      sr.textContent = bodies.length
        ? ('Planet longitudes: ' + bodies.map(function (b) {
            return b.name + ' ' + (typeof b.lon === 'number' ? b.lon.toFixed(2) + '°' : '');
          }).join(', '))
        : 'Natal sphere loaded; longitudes drawn on canvas.';
    } catch (eSr) {
      sr.textContent = 'Natal sphere instrument loaded.';
    }
    stage.appendChild(sr);

    var side = document.createElement('div');
    side.className = 'ap-natal-sphere__side';
    var aspTitle = document.createElement('div');
    aspTitle.className = 'ap-natal-sphere__side-title';
    aspTitle.id = 'ap-natal-sphere-asp-title';
    aspTitle.textContent = 'TIGHTEST ASPECTS';
    side.appendChild(aspTitle);
    var aspList = document.createElement('ul');
    aspList.className = 'ap-natal-sphere__aspects';
    aspList.setAttribute('aria-labelledby', 'ap-natal-sphere-asp-title');
    aspList.style.listStyle = 'none';
    aspList.style.margin = '0';
    aspList.style.padding = '0';
    side.appendChild(aspList);

    var cta = document.createElement('div');
    cta.className = 'ap-natal-sphere__cta-row';
    var modelBtn = document.createElement('a');
    modelBtn.className = 'ap-natal-sphere__cta';
    modelBtn.textContent = 'SEE THIS SKY IN THE LIVING MODEL →';
    modelBtn.href = './index.html#cast';
    if (w.APSkyBridge && typeof w.APSkyBridge.buildLinkFromChart === 'function') {
      try {
        var link = w.APSkyBridge.buildLinkFromChart(chart, { focus: 'earth' });
        if (link) modelBtn.href = link;
      } catch (e) { /* keep fallback */ }
    } else if (w.APDeepLink && typeof w.APDeepLink.buildSkyLink === 'function') {
      try {
        modelBtn.href = w.APDeepLink.buildSkyLink({ m: 'birth', focus: 'earth' }) || modelBtn.href;
      } catch (e2) { /* keep */ }
    }
    cta.appendChild(modelBtn);

    var wrap = document.createElement('div');
    wrap.className = 'ap-natal-sphere__grid';
    wrap.appendChild(stage);
    wrap.appendChild(side);

    host.appendChild(head);
    host.appendChild(wrap);
    host.appendChild(cta);

    var prm = w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var t0 = performance.now();
    var raf = 0;
    function frame(now) {
      var meta = paint(canvas, chart, { t: prm ? 0 : (now - t0), size: Math.min(stage.clientWidth || 400, 480), tilt: 0.52 });
      if (meta && aspList.childNodes.length === 0) {
        meta.aspects.slice(0, 8).forEach(function (A) {
          var row = document.createElement('li');
          row.className = 'ap-natal-sphere__asp';
          row.innerHTML =
            '<span class="ap-natal-sphere__asp-pair">' + A.a.glyph + ' ' + A.a.name.slice(0, 3) +
            ' · ' + A.name + ' · ' + A.b.glyph + ' ' + A.b.name.slice(0, 3) + '</span>' +
            '<span class="ap-natal-sphere__asp-orb">orb ' + A.orb.toFixed(2) + '°</span>';
          aspList.appendChild(row);
        });
        if (!meta.aspects.length) {
          var emptyLi = document.createElement('li');
          emptyLi.className = 'ap-natal-sphere__asp';
          emptyLi.textContent = 'No major aspects within standard orbs in this sample.';
          aspList.appendChild(emptyLi);
        }
      }
      if (!prm) raf = requestAnimationFrame(frame);
    }
    frame(t0);
    if (prm) paint(canvas, chart, { t: 0, size: Math.min(stage.clientWidth || 400, 480) });

    return {
      destroy: function () { if (raf) cancelAnimationFrame(raf); },
      refresh: function (c) { mount(host, c || chart, opts); }
    };
  }

  w.APNatalSphere = { mount: mount, paint: paint, collectBodies: collectBodies };
})(typeof window !== 'undefined' ? window : globalThis);
