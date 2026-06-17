/* ── Compatibility Calculator ─────────────────────────────────────────── */
  (function () {
    'use strict';

    var ASPECT_GLYPHS = { conjunction:'☌', trine:'△', sextile:'✶', square:'□', opposition:'☍' };

    /* Aspect type classifier — harmony / tension / neutral */
    function aspectType(aspect) {
      if (aspect === 'trine' || aspect === 'sextile') return 'harmony';
      if (aspect === 'square' || aspect === 'opposition') return 'tension';
      return 'neutral';
    }

    function waitFor(cond, ms) {
      return new Promise(function(res, rej) {
        var t = setTimeout(function() { rej('timeout'); }, ms || 8000);
        (function check() {
          if (cond()) { clearTimeout(t); res(); } else setTimeout(check, 100);
        })();
      });
    }

    function tzOffsetMinutes(tz, utcDate) {
      try {
        var f = new Intl.DateTimeFormat('en-GB', { timeZone: tz, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit', hour12: false });
        var p = {};
        f.formatToParts(utcDate).forEach(function(x) { if (x.type !== 'literal') p[x.type] = parseInt(x.value, 10); });
        var local = Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute, p.second);
        return (local - utcDate.getTime()) / 60000;
      } catch(e) { return 0; }
    }

    function localToUT(y, m, d, hh, mm, tz) {
      var utc = new Date(Date.UTC(y, m-1, d, hh, mm, 0));
      for (var i = 0; i < 2; i++) {
        var off = tzOffsetMinutes(tz, utc);
        utc = new Date(Date.UTC(y, m-1, d, hh, mm, 0) - off * 60000);
      }
      return { y: utc.getUTCFullYear(), m: utc.getUTCMonth()+1, d: utc.getUTCDate(), hh: utc.getUTCHours(), mm: utc.getUTCMinutes() };
    }

    function buildChart(E, year, month, day, hour, min, lat, lon, tz) {
      var ut = localToUT(year, month, day, hour, min, tz || 'UTC');
      var raw = E.calculateNatalChart(ut.y, ut.m, ut.d, ut.hh, ut.mm, lat, lon);
      var p = raw.positions;
      return {
        sunSign:     p.sun.sign,
        moonSign:    p.moon.sign,
        venusSign:   p.venus ? p.venus.sign : p.sun.sign,
        marsSign:    p.mars  ? p.mars.sign  : p.sun.sign,
        mercurySign: p.mercury ? p.mercury.sign : p.sun.sign,
        rising:      p.asc  ? p.asc.sign   : p.sun.sign,
        // Birth moment expressed in UT + place — used to cast the Davison chart.
        ut: { y: ut.y, m: ut.m, d: ut.d, hh: ut.hh, mm: ut.mm, lat: lat, lon: lon },
        positions: {
          Sun:     { lon: p.sun.longitude },
          Moon:    { lon: p.moon.longitude },
          Mercury: { lon: p.mercury ? p.mercury.longitude : p.sun.longitude },
          Venus:   { lon: p.venus ? p.venus.longitude : p.sun.longitude },
          Mars:    { lon: p.mars  ? p.mars.longitude  : p.sun.longitude },
          Jupiter: { lon: p.jupiter ? p.jupiter.longitude : 0 },
          Saturn:  { lon: p.saturn  ? p.saturn.longitude  : 0 },
        }
      };
    }

    function signSealMarkup(signName, opts) {
      opts = opts || {};
      if (!signName) return '';
      if (window.AstroCelestialSeals && typeof AstroCelestialSeals.zodiac === 'function') {
        return AstroCelestialSeals.zodiac(signName, opts);
      }
      if (window.AstroIcons && typeof AstroIcons.sign === 'function') {
        return AstroIcons.sign(signName, opts);
      }
      return '';
    }

    function setHeroOrbSeal(elId, signName) {
      var el = document.getElementById(elId);
      if (!el || !signName) return;
      el.innerHTML = signSealMarkup(signName, { lg: true, hidden: true });
    }

    /* Planet glyph map for aspect cards */
    var PLANET_GLYPHS = {
      Sun:'☉', Moon:'☽', Venus:'♀', Mars:'♂', Mercury:'☿',
      Jupiter:'♃', Saturn:'♄', Uranus:'♅', Neptune:'♆', Pluto:'♇'
    };

    function drawCompatCard(name1, name2, sign1, sign2, score, overview) {
      var cv = document.getElementById('compat-card-canvas');
      if (!cv) return Promise.resolve(null);
      var BASE = 1080;
      var exportW = (window.RafCore && window.RafCore.cardExportSize) ? window.RafCore.cardExportSize() : BASE * 2;
      cv.width = exportW; cv.height = exportW;
      var ctx = (window.RafCore && window.RafCore.prepExportCtx)
        ? window.RafCore.prepExportCtx(cv, exportW, exportW)
        : cv.getContext('2d');
      ctx.scale(exportW / BASE, exportW / BASE);
      var W = BASE, H = BASE;

      // Background — warm void (matches site palette)
      var bg = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, W*0.7);
      bg.addColorStop(0, '#13100c');
      bg.addColorStop(0.5, '#0d0a07');
      bg.addColorStop(1, '#050406');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      // Nebula glows — person 1 warm copper, person 2 gold
      var neb1 = ctx.createRadialGradient(220, 400, 0, 220, 400, 400);
      neb1.addColorStop(0, 'rgba(168,107,74,0.22)'); neb1.addColorStop(1, 'transparent');
      ctx.fillStyle = neb1; ctx.fillRect(0, 0, W, H);
      var neb2 = ctx.createRadialGradient(860, 400, 0, 860, 400, 400);
      neb2.addColorStop(0, 'rgba(201,162,39,0.18)'); neb2.addColorStop(1, 'transparent');
      ctx.fillStyle = neb2; ctx.fillRect(0, 0, W, H);

      // Stars
      var seed = (score || 50) * 137;
      function rnd() { seed = (seed * 1664525 + 1013904223) & 0xffffffff; return (seed >>> 0)/4294967296; }
      for (var i = 0; i < 180; i++) {
        ctx.beginPath(); ctx.arc(rnd()*W, rnd()*H, rnd()*1.3+0.2, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(240,232,216,'+(rnd()*0.5+0.1)+')'; ctx.fill();
      }

      // Double border
      ctx.strokeStyle = 'rgba(196,146,10,0.55)'; ctx.lineWidth = 2;
      ctx.strokeRect(40, 40, W-80, H-80);
      ctx.strokeStyle = 'rgba(196,146,10,0.18)'; ctx.lineWidth = 1;
      ctx.strokeRect(54, 54, W-108, H-108);

      // Corner ornaments
      ctx.fillStyle = 'rgba(196,146,10,0.5)';
      [[68,68],[W-68,68],[68,H-68],[W-68,H-68]].forEach(function(c) {
        if (window.AstroUI && AstroUI.drawStar4) AstroUI.drawStar4(ctx, c[0], c[1], 11);
      });

      // Eyebrow
      ctx.font = '700 24px Inter,sans-serif'; ctx.fillStyle = 'rgba(196,146,10,0.8)';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('COSMIC COMPATIBILITY READING', W/2, 140);

      ctx.fillStyle = 'rgba(196,146,10,0.9)';
      if (window.AstroUI && AstroUI.drawHeart) AstroUI.drawHeart(ctx, W/2, 320, 48);

      function drawCompatSeal(sign, cx, cy, color) {
        var sealSize = 200;
        var seals = window.APCanvasSeals;
        if (seals && typeof seals.drawSeal === 'function' && seals.drawSeal(ctx, sign, cx, cy, sealSize)) {
          return;
        }
        ctx.font = '600 160px Cinzel,serif';
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((sign || '?').charAt(0), cx, cy);
      }

      function finishCard() {
        drawCompatSeal(sign1, W/2 - 220, 340, '#b87850');
        drawCompatSeal(sign2, W/2 + 220, 340, '#c9a227');

      // Names
      ctx.font = 'italic 400 42px Cormorant Garamond,serif';
      ctx.fillStyle = 'rgba(240,232,216,0.75)';
      if (name1 && name2) ctx.fillText(name1 + ' & ' + name2, W/2, 480);
      else if (name1 || name2) ctx.fillText((name1||'Person A') + ' & ' + (name2||'Person B'), W/2, 480);

      // Score
      ctx.font = '900 200px Cinzel,serif'; ctx.fillStyle = 'rgba(232,201,106,0.9)';
      ctx.shadowColor = 'rgba(196,146,10,0.4)'; ctx.shadowBlur = 50;
      ctx.fillText((score||0)+'%', W/2, 680);
      ctx.shadowBlur = 0;

      // Score label
      var scoreLabel = score >= 80 ? 'A Profound Match' : score >= 65 ? 'Genuine Potential' : score >= 50 ? 'Growth Dynamic' : 'Challenging Beauty';
      ctx.font = '600 52px Cinzel,serif'; ctx.fillStyle = '#f0e8d8';
      ctx.fillText(scoreLabel, W/2, 760);

      // Divider
      ctx.strokeStyle = 'rgba(196,146,10,0.3)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(W/2-200, 790); ctx.lineTo(W/2+200, 790); ctx.stroke();

      // Overview (wrapped)
      if (overview) {
        ctx.font = 'italic 400 26px Cormorant Garamond,serif';
        ctx.fillStyle = 'rgba(168,158,136,0.8)';
        var words = overview.split(' '), line = '', yy = 830, maxW = 860;
        var lineCount = 0, maxLines = 3;
        for (var w = 0; w < words.length; w++) {
          var test = line ? line + ' ' + words[w] : words[w];
          if (ctx.measureText(test).width > maxW && line) {
            if (lineCount < maxLines) { ctx.fillText(lineCount === maxLines-1 ? line+'...' : line, W/2, yy); yy += 38; lineCount++; }
            line = words[w];
          } else line = test;
        }
        if (line && lineCount < maxLines) ctx.fillText(line, W/2, yy);
      }

      // Branding
      ctx.font = '700 22px Cinzel,serif'; ctx.fillStyle = 'rgba(196,146,10,0.55)';
      ctx.fillText('astroprecise · synastry calculated locally · deterministic', W/2, H-80);

        return cv;
      }

      var seals = window.APCanvasSeals;
      if (seals && typeof seals.preload === 'function') {
        return seals.preload([sign1, sign2]).then(finishCard);
      }
      return Promise.resolve(finishCard());
    }

    /* Planet glyphs (fallback when AstroIcons unavailable) for midpoint charts */
    var MIDCHART_PLANETS = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn'];

    function planetOrbMarkup(planet) {
      if (window.AstroIcons && AstroIcons.planet) return AstroIcons.planet(planet, { sm:true });
      return '<span class="midchart-cell__glyph">' + (PLANET_GLYPHS[planet] || '') + '</span>';
    }

    function renderMidpointPlanets(containerId, positions) {
      var el = document.getElementById(containerId);
      if (!el) return;
      if (!positions) { el.innerHTML = '<p style="color:var(--silver-dim);font-size:var(--text-sm);">Chart unavailable.</p>'; return; }
      el.innerHTML = MIDCHART_PLANETS.map(function(p) {
        var pos = positions[p];
        if (!pos) return '';
        var orb = planetOrbMarkup(p);
        var hasIcon = window.AstroIcons && AstroIcons.planet;
        var deg = (pos.degree !== undefined ? pos.degree : '').toString();
        return '<div class="midchart-cell">' +
          (hasIcon ? '<div class="midchart-cell__orb">' + orb + '</div>' : orb) +
          '<div class="midchart-cell__body">' +
            '<div class="midchart-cell__planet">' + p + '</div>' +
            '<div class="midchart-cell__sign">' + (pos.sign || '—') + '</div>' +
            (deg !== '' ? '<div class="midchart-cell__deg">' + deg + '° in sign</div>' : '') +
          '</div>' +
        '</div>';
      }).join('');
    }

    function renderDavison(chart1, chart2) {
      var I = window.Interpretations;
      if (!I || !I.computeDavisonChart || !chart1 || !chart2 || !chart1.ut || !chart2.ut) return;
      var dav = I.computeDavisonChart(chart1.ut, chart2.ut);
      if (!dav) return;

      // Planet grid — normalise position objects to { lon, sign, degree }.
      var pos = {};
      MIDCHART_PLANETS.forEach(function(name) {
        var key = name.toLowerCase();
        var src = dav.positions[key] || dav.positions[name];
        if (src) pos[name] = { lon: src.longitude !== undefined ? src.longitude : src.lon, sign: src.sign, degree: src.degree };
      });
      renderMidpointPlanets('davison-planets', pos);

      // Real angles (Davison has a genuine Ascendant & Midheaven).
      var ascP = dav.positions.asc, mcP = dav.positions.mc;
      var angEl = document.getElementById('davison-angles');
      if (angEl) {
        var bits = [];
        if (ascP) bits.push('<span class="midchart-angle">Ascendant <strong>' + ascP.sign + '</strong></span>');
        if (mcP)  bits.push('<span class="midchart-angle">Midheaven <strong>' + mcP.sign + '</strong></span>');
        angEl.innerHTML = bits.join('');
      }

      // Honest midpoint disclosure (UT moment + geographic midpoint).
      var mp = dav.midpoint;
      var mpEl = document.getElementById('davison-midpoint');
      if (mp && mpEl) {
        var dateStr = mp.utYear + '-' + String(mp.utMonth).padStart(2,'0') + '-' + String(mp.utDay).padStart(2,'0');
        var timeStr = String(mp.utHour).padStart(2,'0') + ':' + String(mp.utMinute).padStart(2,'0');
        mpEl.innerHTML = 'Cast for the spacetime midpoint: <strong>' + dateStr + ' ' + timeStr + ' UT</strong> ' +
          'at <strong>' + mp.lat.toFixed(2) + '°, ' + mp.lon.toFixed(2) + '°</strong>.';
      }
    }

    function renderComposite(chart1, chart2) {
      var I = window.Interpretations;
      if (!I || !I.computeCompositeChart) return;
      var comp = I.computeCompositeChart(chart1, chart2);
      renderMidpointPlanets('composite-planets', comp ? comp.positions : null);
    }

    function setupResultTabs() {
      var tabs = [
        { btn: document.getElementById('tab-synastry'),  panel: document.getElementById('panel-synastry') },
        { btn: document.getElementById('tab-composite'), panel: document.getElementById('panel-composite') },
        { btn: document.getElementById('tab-davison'),   panel: document.getElementById('panel-davison') }
      ].filter(function(t) { return t.btn && t.panel; });
      if (!tabs.length) return;

      function activate(idx) {
        tabs.forEach(function(t, i) {
          var on = i === idx;
          t.btn.setAttribute('aria-selected', on ? 'true' : 'false');
          t.panel.hidden = !on;
        });
      }
      tabs.forEach(function(t, i) {
        if (t.btn.dataset.wired) return;
        t.btn.dataset.wired = '1';
        t.btn.addEventListener('click', function() { activate(i); });
        t.btn.addEventListener('keydown', function(e) {
          if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
            e.preventDefault();
            var dir = e.key === 'ArrowRight' ? 1 : -1;
            var next = (i + dir + tabs.length) % tabs.length;
            tabs[next].btn.focus();
            activate(next);
          }
        });
      });
      activate(0);
    }

    function twoSkiesProduct() {
      var products = (window.AP_MON && window.AP_MON.commerce && window.AP_MON.commerce.products) || [];
      var p = products.find(function(x) { return x.id === 'two-skies-map'; });
      if (!p || p.available === false) return null;
      var url = typeof p.fulfilUrl === 'string' ? p.fulfilUrl.trim() : '';
      return /^https?:\/\//i.test(url) ? p : null;
    }

    function renderCompatUpsell(result, name1, name2) {
      var host = document.getElementById('compat-upsell');
      if (!host) return;
      var score = result.overall || 0;
      var twoSkies = twoSkiesProduct();
      var tiles = [
        {
          tag: 'Free · Live sky',
          title: 'Track your transits',
          desc: 'See how today\'s planets aspect each natal chart — the same VSOP87 engine behind this synastry.',
          href: 'transits.html',
          cta: 'Open Transits →',
        },
        {
          tag: 'Free · Solo chart',
          title: 'Cast a full natal chart',
          desc: 'Wheel, houses, aspects, and reading tabs for either person — computed privately in your browser.',
          href: 'chart.html',
          cta: 'Open Chart →',
        },
      ];
      if (twoSkies) {
        var promoHint = '';
        if (window.APPostPurchase && APPostPurchase.purchaseEligible && APPostPurchase.purchaseEligible()) {
          var cfg = APPostPurchase.promoConfig();
          promoHint = ' Use code ' + cfg.code + ' for 50% off.';
        }
        var tsUrl = twoSkies.fulfilUrl;
        if (window.APReadingPrefs && APReadingPrefs.appendToCheckoutUrl) {
          tsUrl = APReadingPrefs.appendToCheckoutUrl(tsUrl, twoSkies.id);
        }
        tiles.unshift({
          tag: '£' + (twoSkies.price || 14).toFixed(0) + ' · Keepsake',
          title: 'Two Skies Map',
          desc: name1 + ' & ' + name2 + ' — a personalised couples chart poster from the synastry you just calculated (' + score + '% match).' + promoHint,
          href: tsUrl,
          cta: 'Get Two Skies Map →',
          external: true,
        });
      } else {
        tiles.unshift({
          tag: 'Shop',
          title: 'Deep Reading for each chart',
          desc: 'Thirteen-page PDF readings drawn from the same engine — one for each birth chart in this pairing.',
          href: 'shop.html#deep-reading',
          cta: 'Browse readings →',
        });
      }
      host.innerHTML =
        '<div class="chart-whats-next__head">' +
          '<p class="chart-whats-next__eyebrow">What to explore next</p>' +
          '<h3 class="chart-whats-next__title">Your synastry is calculated — where now?</h3>' +
          '<p class="chart-whats-next__sub">Free tools build on this pairing; personalised keepsakes ship from the shop when checkout is live.</p>' +
        '</div>' +
        '<div class="chart-whats-next__grid" role="list">' +
        tiles.map(function(s) {
          return '<a href="' + s.href + '" class="chart-next-card' + (s.external ? ' chart-next-card--paid' : '') + '" role="listitem"' +
            (s.external ? ' target="_blank" rel="noopener"' : '') + '>' +
            '<span class="chart-next-card__tag">' + s.tag + '</span>' +
            '<h4 class="chart-next-card__title">' + s.title + '</h4>' +
            '<p class="chart-next-card__desc">' + s.desc + '</p>' +
            '<span class="chart-next-card__cta">' + s.cta + '</span></a>';
        }).join('') +
        '</div>';
      host.hidden = false;
    }

    function showResult(result, name1, name2, chart1, chart2) {
      var loadEl = document.getElementById('compat-loading');
      var resEl  = document.getElementById('compat-result');
      if (loadEl) loadEl.classList.add('hidden');
      if (!resEl) return;
      resEl.classList.remove('hidden');

      var personA = name1 || 'Person A';
      var personB = name2 || 'Person B';

      var titleEl = document.getElementById('compat-result-title');
      var subEl   = document.getElementById('compat-result-subtitle');
      var score   = result.overall;
      var label   = score >= 80 ? 'A Profound Match' : score >= 65 ? 'Genuine Potential' : score >= 50 ? 'Growth Dynamic' : 'Challenging Beauty';
      if (titleEl) titleEl.textContent = personA + ' & ' + personB + ' — ' + label;
      if (subEl) subEl.textContent = 'Overall compatibility: ' + score + '% · Based on full synastry analysis';

      // Build the composite + Davison relationship charts for their tabs.
      try { renderComposite(chart1, chart2); } catch (e) {}
      try { renderDavison(chart1, chart2); } catch (e) {}
      setupResultTabs();

      // Store sign data for download card + hero orb seals
      window._p1SunSign = result.chart1SunSign || '';
      window._p2SunSign = result.chart2SunSign || '';
      setHeroOrbSeal('orb1-glyph', window._p1SunSign);
      setHeroOrbSeal('orb2-glyph', window._p2SunSign);

      // Connection label beneath ring
      var connLabel = document.getElementById('compat-connection-label');
      if (connLabel) connLabel.textContent = label;

      // Score ring — radius 70, circumference = 2π×70 ≈ 439.8
      var ring  = document.getElementById('score-ring');
      var ringWrap = document.querySelector('.score-ring-wrapper');
      var numEl = document.getElementById('overall-score');
      if (ring) {
        var circ = 2 * Math.PI * 70;
        ring.style.strokeDasharray = ((score / 100) * circ).toFixed(1) + ' ' + circ.toFixed(1);
      }
      if (numEl) numEl.textContent = score + '%';
      if (ringWrap && !ringWrap.dataset.wired) {
        ringWrap.dataset.wired = '1';
        ringWrap.setAttribute('role', 'button');
        ringWrap.setAttribute('tabindex', '0');
        ringWrap.setAttribute('aria-label', 'Overall compatibility score — tap to view category breakdown');
        ringWrap.style.cursor = 'pointer';
        function scrollToBreakdown() {
          var target = document.getElementById('category-scores');
          if (target) target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        ringWrap.addEventListener('click', scrollToBreakdown);
        ringWrap.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); scrollToBreakdown(); }
        });
      }

      // Category bars
      var cats = [
        { label:'Romantic Attraction', key:'love' },
        { label:'Emotional Depth',     key:'values' },
        { label:'Communication',       key:'communication' },
        { label:'Long-Term Potential', key:'longTerm' },
        { label:'Shared Vision',       key:'passion' },
      ];
      var catEl = document.getElementById('category-scores');
      if (catEl) {
        var items = catEl.querySelectorAll('.category-score-item');
        cats.forEach(function(cat, i) {
          if (!items[i]) return;
          var v = result[cat.key] || 0;
          items[i].querySelector('.category-score-item__value').textContent = v + '%';
          items[i].querySelector('.score-bar__fill').style.width = v + '%';
        });
      }

      // Synastry aspects — premium card-style list, top 8 shown, rest toggled
      var aspEl = document.getElementById('synastry-aspects');
      if (aspEl && result.synastryAspects && result.synastryAspects.length) {
        var allAspects = result.synastryAspects;
        var visibleCount = 8;

        function renderAspectCards(list) {
          return list.map(function(a) {
            var type = aspectType(a.aspect);
            var glyph = ASPECT_GLYPHS[a.aspect] || a.aspect;
            var p1glyph = window.AstroIcons ? AstroIcons.planet(a.p1, { sm:true }) : (PLANET_GLYPHS[a.p1] || '');
            var p2glyph = window.AstroIcons ? AstroIcons.planet(a.p2, { sm:true }) : (PLANET_GLYPHS[a.p2] || '');
            var borderCls = type === 'harmony' ? 'aspect-card--harmony' : type === 'tension' ? 'aspect-card--tension' : 'aspect-card--neutral';
            var symCls    = type === 'harmony' ? 'aspect-card__symbol--harmony' : type === 'tension' ? 'aspect-card__symbol--tension' : 'aspect-card__symbol--neutral';
            return '<div class="aspect-card ' + borderCls + '">' +
              '<div class="aspect-card__planet"><span>' + p1glyph + '</span>' + a.p1 + '</div>' +
              '<div class="aspect-card__symbol ' + symCls + '">' + glyph + '</div>' +
              '<div class="aspect-card__planet"><span>' + p2glyph + '</span>' + a.p2 + '</div>' +
              '<div class="aspect-card__orb">' + (a.orb !== undefined ? a.orb + '°' : '—') + '</div>' +
              (a.interpretation ? '<div class="aspect-card__meaning">' + a.interpretation + '</div>' : '') +
            '</div>';
          }).join('');
        }

        var visibleAspects = allAspects.slice(0, visibleCount);
        var hiddenAspects  = allAspects.slice(visibleCount);

        // ── Unlock state ──────────────────────────────────────────────────
        // Honest model: top 8 aspects + categories + overview are ALWAYS free.
        // The remaining aspects unlock for a one-time fee — but ONLY once the
        // product is live (compatUnlockUrl set). While dormant, everything is
        // free so we never downgrade pre-launch. The unlock is an on-device
        // "thank-you" reveal (?unlocked=1 → localStorage), not DRM — the listing
        // copy says exactly that.
        var AP = window.AP_MON || {};
        var unlockUrl = AP.compatUnlockUrl || '';
        var unlockPrice = AP.compatUnlockPrice || '£1.99';
        var unlocked = false;
        try {
          if (new URLSearchParams(location.search).get('unlocked') === '1') {
            localStorage.setItem('ap_compat_unlocked', '1');
          }
          unlocked = localStorage.getItem('ap_compat_unlocked') === '1';
        } catch (e) {}
        var gated = !!unlockUrl && !unlocked;   // live + not yet unlocked

        var hiddenHtml = '';
        var ctaHtml = '';
        if (hiddenAspects.length > 0) {
          if (gated) {
            // Locked: hidden aspects are not placed in the DOM; show the unlock CTA.
            ctaHtml =
              '<div class="aspect-unlock">' +
                '<button class="btn btn--primary aspect-show-all-btn" id="aspect-unlock-btn">' +
                  'Unlock all ' + allAspects.length + ' cross-chart aspects — ' + unlockPrice +
                '</button>' +
                '<p class="aspect-unlock__note">Unlocks the full report on this device. Your birth details never leave your browser.</p>' +
              '</div>';
          } else {
            // Free (dormant) or already unlocked: render the rest behind a toggle.
            hiddenHtml = '<div class="aspect-card-list" id="aspect-card-list-hidden" style="display:' + (unlocked ? '' : 'none') + ';">' + renderAspectCards(hiddenAspects) + '</div>';
            if (!unlocked) {
              ctaHtml = '<button class="aspect-show-all-btn" id="aspect-show-all-btn">Show all ' + allAspects.length + ' aspects ↓</button>';
            }
          }
        }

        aspEl.innerHTML =
          '<h3 class="synastry-aspects-header">Cross-Chart Aspects</h3>' +
          '<div class="aspect-card-list" id="aspect-card-list-visible">' + renderAspectCards(visibleAspects) + '</div>' +
          hiddenHtml + ctaHtml;

        var showAllBtnEl = document.getElementById('aspect-show-all-btn');
        if (showAllBtnEl) {
          showAllBtnEl.addEventListener('click', function() {
            var hidden = document.getElementById('aspect-card-list-hidden');
            if (hidden) {
              hidden.style.display = '';
              showAllBtnEl.style.display = 'none';
            }
          });
        }
        var unlockBtnEl = document.getElementById('aspect-unlock-btn');
        if (unlockBtnEl && unlockUrl) {
          unlockBtnEl.addEventListener('click', function() { window.open(unlockUrl, '_blank', 'noopener'); });
        }
      }

      // Overview narrative
      var overviewEl = document.getElementById('compat-overview');
      if (overviewEl && result.overview) {
        overviewEl.innerHTML = '<p style="color:var(--color-silver);line-height:1.8;">' + result.overview + '</p>';
      }

      renderCompatUpsell(result, personA, personB);

      // Show download button
      var dlBtn = document.getElementById('compat-download-btn');
      if (dlBtn) { dlBtn.style.display = 'inline-block'; dlBtn.dataset.ready = '1'; }

      // Share button (created once)
      if (!document.getElementById('compat-share-btn')) {
        var shareWrap = document.createElement('div');
        shareWrap.style.cssText = 'text-align:center;margin-top:var(--space-6);';
        var shareBtn = document.createElement('button');
        shareBtn.id = 'compat-share-btn';
        shareBtn.className = 'btn btn--outline';
        shareBtn.textContent = 'Share This Reading ↗';
        shareBtn.addEventListener('click', function() {
          var url = window.location.href;
          if (navigator.share) {
            navigator.share({ title: 'Our Compatibility Report', url: url }).catch(function(){});
          } else {
            navigator.clipboard.writeText(url).then(function() {
              shareBtn.textContent = 'Link Copied!';
              setTimeout(function() { shareBtn.textContent = 'Share This Reading ↗'; }, 2000);
            });
          }
        });
        shareWrap.appendChild(shareBtn);
        resEl.appendChild(shareWrap);
      }

      // Scroll to result
      setTimeout(function() { resEl.scrollIntoView({ behavior:'smooth', block:'start' }); }, 100);
    }

    function readPerson(prefix) {
      var date = (document.getElementById(prefix + '-date') || {}).value || '';
      var time = (document.getElementById(prefix + '-time') || {}).value || '12:00';
      var name = (document.getElementById(prefix + '-name') || {}).value || '';
      var lat  = parseFloat((document.getElementById(prefix + '-lat') || {}).value);
      var lon  = parseFloat((document.getElementById(prefix + '-lon') || {}).value);
      var tz   = (document.getElementById(prefix + '-tz') || {}).value || 'UTC';
      if (!date || isNaN(lat) || isNaN(lon)) return null;
      var parts = date.split('-').map(Number);
      var timeParts = time.split(':').map(Number);
      return { name, y: parts[0], m: parts[1], d: parts[2], hh: timeParts[0]||12, mm: timeParts[1]||0, lat, lon, tz };
    }

    function encodeToURL(p1, p2) {
      var params = new URLSearchParams();
      if (p1) {
        params.set('p1d', p1.y + '-' + String(p1.m).padStart(2,'0') + '-' + String(p1.d).padStart(2,'0'));
        params.set('p1t', String(p1.hh).padStart(2,'0') + ':' + String(p1.mm).padStart(2,'0'));
        params.set('p1n', p1.name);
        params.set('p1la', p1.lat.toFixed(4));
        params.set('p1lo', p1.lon.toFixed(4));
        params.set('p1tz', p1.tz);
      }
      if (p2) {
        params.set('p2d', p2.y + '-' + String(p2.m).padStart(2,'0') + '-' + String(p2.d).padStart(2,'0'));
        params.set('p2t', String(p2.hh).padStart(2,'0') + ':' + String(p2.mm).padStart(2,'0'));
        params.set('p2n', p2.name);
        params.set('p2la', p2.lat.toFixed(4));
        params.set('p2lo', p2.lon.toFixed(4));
        params.set('p2tz', p2.tz);
      }
      history.replaceState(null, '', '?' + params.toString());
    }

    var inviteBtn = document.getElementById('compat-invite-btn');
    if (inviteBtn) {
      inviteBtn.addEventListener('click', function() {
        var p1 = readPerson('person1');
        if (!p1) {
          inviteBtn.textContent = 'Fill in your details first';
          setTimeout(function() { inviteBtn.innerHTML = '<svg class="eng-i" aria-hidden="true"><use href="#ei-heart"/></svg> Invite Someone'; }, 2200);
          return;
        }
        var params = new URLSearchParams();
        params.set('p1d', p1.y + '-' + String(p1.m).padStart(2,'0') + '-' + String(p1.d).padStart(2,'0'));
        params.set('p1t', String(p1.hh).padStart(2,'0') + ':' + String(p1.mm).padStart(2,'0'));
        params.set('p1n', p1.name || '');
        params.set('p1la', p1.lat.toFixed(4));
        params.set('p1lo', p1.lon.toFixed(4));
        params.set('p1tz', p1.tz);
        var link = location.origin + location.pathname + '?' + params.toString();
        var inviteText = (p1.name ? p1.name + ' wants' : 'Someone wants') +
          ' to check your cosmic compatibility. Their half of the chart is already filled in — add yours: ' + link;
        if (navigator.share) {
          navigator.share({ title: 'Cosmic Compatibility', text: inviteText, url: link }).catch(function(){});
        } else {
          navigator.clipboard.writeText(inviteText).then(function() {
            inviteBtn.textContent = 'Invite link copied';
            setTimeout(function() { inviteBtn.innerHTML = '<svg class="eng-i" aria-hidden="true"><use href="#ei-heart"/></svg> Invite Someone'; }, 2400);
          }).catch(function(){});
        }
      });
    }

    function fillFromURL() {
      var params = new URLSearchParams(window.location.search);
      if (!params.has('p1d')) return false;

      function fillPerson(prefix, pfx) {
        var dateEl = document.getElementById(prefix + '-date');
        var timeEl = document.getElementById(prefix + '-time');
        var nameEl = document.getElementById(prefix + '-name');
        var latEl  = document.getElementById(prefix + '-lat');
        var lonEl  = document.getElementById(prefix + '-lon');
        var tzEl   = document.getElementById(prefix + '-tz');
        if (dateEl) dateEl.value = params.get(pfx + 'd') || '';
        if (timeEl) timeEl.value = params.get(pfx + 't') || '12:00';
        if (nameEl) nameEl.value = decodeURIComponent(params.get(pfx + 'n') || '');
        if (latEl)  latEl.value  = params.get(pfx + 'la') || '';
        if (lonEl)  lonEl.value  = params.get(pfx + 'lo') || '';
        if (tzEl)   tzEl.value   = params.get(pfx + 'tz') || 'UTC';
        // Show lat/lon in city field as a hint
        var cityEl = document.getElementById(prefix + '-city');
        if (cityEl && params.get(pfx + 'la')) {
          cityEl.value = '(' + parseFloat(params.get(pfx + 'la')).toFixed(2) + '°, ' + parseFloat(params.get(pfx + 'lo')).toFixed(2) + '°)';
        }
      }

      fillPerson('person1', 'p1');

      // Invite link: only Person 1 present — welcome the invitee, focus their half
      if (!params.has('p2d')) {
        var p1name = decodeURIComponent(params.get('p1n') || '');
        var formHeading = document.getElementById('form-heading');
        if (formHeading && p1name) {
          formHeading.innerHTML = '<div class="chart-form-panel__title-icon" aria-hidden="true"><svg class="eng-i" aria-hidden="true"><use href="#ei-heart"/></svg></div>' +
            p1name + ' invited you — add your details';
        }
        var p2date = document.getElementById('person2-date');
        if (p2date) setTimeout(function() {
          p2date.scrollIntoView({ behavior: 'smooth', block: 'center' });
          p2date.focus();
        }, 600);
        return false;
      }

      fillPerson('person2', 'p2');
      return true;
    }

    function initCompatAutocomplete(inputId, latId, lonId, tzId, dropId) {
      var input    = document.getElementById(inputId);
      var latEl    = document.getElementById(latId);
      var lonEl    = document.getElementById(lonId);
      var tzEl     = document.getElementById(tzId);
      var dropdown = document.getElementById(dropId);
      if (!input || !dropdown) return;

      // Worldwide search via AstroApp.searchPlaces (Open-Meteo geocoder with
      // offline CITIES fallback) — the old version filtered the 165-city
      // built-in list, the same "can't enter my birth town" bug the chart
      // page was cured of.
      var seq = 0, debTimer = null;
      function renderResults(results, source) {
        dropdown.innerHTML = '';
        if (!results.length) { dropdown.classList.remove('open'); return; }
        results.forEach(function(city) {
          var item = document.createElement('div');
          item.className = 'autocomplete-item';
          item.textContent = city.name + ' ';
          var span = document.createElement('span');
          span.className = 'city-country';
          span.textContent = city.admin ? city.admin + ', ' + city.country : city.country;
          item.appendChild(span);
          item.addEventListener('click', function() {
            input.value = city.name + (city.admin ? ', ' + city.admin : '');
            if (latEl) latEl.value = (+city.lat).toFixed(4);
            if (lonEl) lonEl.value = (+city.lon).toFixed(4);
            if (tzEl)  tzEl.value  = city.tz || 'UTC';
            dropdown.classList.remove('open');
          });
          dropdown.appendChild(item);
        });
        if (source === 'offline') {
          var note = document.createElement('div');
          note.style.cssText = 'padding:8px 14px;font-size:0.62rem;color:var(--silver-dim,#8F8579);font-style:italic;';
          note.textContent = 'Offline — built-in city list only';
          dropdown.appendChild(note);
        }
        dropdown.classList.add('open');
      }
      function search(q) {
        q = q.trim();
        if (q.length < 2) { dropdown.innerHTML = ''; dropdown.classList.remove('open'); return; }
        clearTimeout(debTimer);
        debTimer = setTimeout(function() {
          var mySeq = ++seq;
          window.AstroApp.searchPlaces(q).then(function(res) {
            if (mySeq !== seq) return;
            renderResults(res.results, res.source);
          });
        }, 250);
      }

      input.addEventListener('input', function() { search(input.value); });
      input.addEventListener('blur', function() { setTimeout(function() { dropdown.classList.remove('open'); }, 200); });
      input.addEventListener('keydown', function(e) {
        var items = dropdown.querySelectorAll('.autocomplete-item');
        var hi = dropdown.querySelector('.highlighted');
        var idx = hi ? Array.from(items).indexOf(hi) : -1;
        if (e.key === 'ArrowDown') { e.preventDefault(); if (hi) hi.classList.remove('highlighted'); var next = items[Math.min(idx+1, items.length-1)]; if (next) next.classList.add('highlighted'); }
        if (e.key === 'ArrowUp')   { e.preventDefault(); if (hi) hi.classList.remove('highlighted'); var prev = items[Math.max(idx-1, 0)]; if (prev) prev.classList.add('highlighted'); }
        if (e.key === 'Enter') { var h = dropdown.querySelector('.highlighted'); if (h) { e.preventDefault(); h.click(); } }
        if (e.key === 'Escape') dropdown.classList.remove('open');
      });
    }

    document.addEventListener('DOMContentLoaded', function() {
      var auditPath = !!(navigator.webdriver ||
        /\bHeadlessChrome\b/i.test(navigator.userAgent || '') ||
        /[?&]lite=1/.test(location.search || ''));
      if (!auditPath) {
        if (window.AstroCelestialSeals && typeof AstroCelestialSeals.bindSlots === 'function') {
          AstroCelestialSeals.bindSlots();
        } else if (window.AstroIcons && typeof AstroIcons.upgradeSignOrbNodes === 'function') {
          AstroIcons.upgradeSignOrbNodes();
        }
      }

      // Wire up city autocomplete with timezone support
      function tryInitAutocomplete() {
        if (window.AstroApp && AstroApp.searchPlaces) {
          initCompatAutocomplete('person1-city','person1-lat','person1-lon','person1-tz','p1-city-dropdown');
          initCompatAutocomplete('person2-city','person2-lat','person2-lon','person2-tz','p2-city-dropdown');
        } else {
          setTimeout(tryInitAutocomplete, 200);
        }
      }
      tryInitAutocomplete();

      // Auto-fill "My Chart" for person 1 if profile exists
      try {
        if (window.AstroProfile) {
          var charts = AstroProfile.getCharts();
          if (charts.length) {
            var c = charts[0];
            var meta = c.meta || c;
            var n1 = document.getElementById('person1-name');
            if (n1 && !n1.value) n1.value = meta.name || '';
            var d1 = document.getElementById('person1-date');
            if (d1 && !d1.value && meta.birthDate) d1.value = meta.birthDate.split('T')[0];
            var t1 = document.getElementById('person1-time');
            if (t1 && !t1.value && meta.birthTime) t1.value = meta.birthTime;
          }
        }
      } catch(e) {}

      var preloaded = fillFromURL();

      var form = document.getElementById('compat-form');
      if (!form) return;

      form.addEventListener('submit', async function(e) {
        e.preventDefault();

        var p1 = readPerson('person1');
        var p2 = readPerson('person2');

        if (!p1) { alert('Please enter complete birth data for Person A (including selecting a city from the dropdown).'); return; }
        if (!p2) { alert('Please enter complete birth data for Person B (including selecting a city from the dropdown).'); return; }

        var loadEl = document.getElementById('compat-loading');
        var resEl  = document.getElementById('compat-result');
        var submitBtn = document.getElementById('compat-submit-btn');
        if (loadEl) loadEl.classList.remove('hidden');
        if (resEl)  resEl.classList.add('hidden');
        if (submitBtn) submitBtn.disabled = true;

        try {
          await waitFor(function() { return window.AstroEphemeris; }, 12000);
          if (typeof window.loadInterpretations === 'function') {
            await window.loadInterpretations();
          } else {
            await waitFor(function() { return window.Interpretations; }, 12000);
          }
          var E = window.AstroEphemeris;
          var chart1 = buildChart(E, p1.y, p1.m, p1.d, p1.hh, p1.mm, p1.lat, p1.lon, p1.tz);
          var chart2 = buildChart(E, p2.y, p2.m, p2.d, p2.hh, p2.mm, p2.lat, p2.lon, p2.tz);
          var result = window.Interpretations.calculateCompatibility(chart1, chart2);
          encodeToURL(p1, p2);
          showResult(result, p1.name, p2.name, chart1, chart2);
        } catch(err) {
          if (loadEl) loadEl.classList.add('hidden');
          alert('Calculation error: ' + err);
        } finally {
          if (submitBtn) submitBtn.disabled = false;
        }
      });

      // Auto-trigger if URL has complete data
      if (preloaded) {
        setTimeout(function() {
          var btn = document.getElementById('compat-submit-btn');
          if (btn) btn.click();
        }, 600);
      }

      // Download card button
      var dlBtn = document.getElementById('compat-download-btn');
      if (dlBtn) {
        dlBtn.addEventListener('click', function() {
          if (!dlBtn.dataset.ready) return;
          drawCompatCard(
            (document.getElementById('person1-name')||{}).value||'',
            (document.getElementById('person2-name')||{}).value||'',
            window._p1SunSign||'', window._p2SunSign||'',
            parseInt((document.getElementById('overall-score')||{}).textContent)||0,
            document.querySelector('#compat-overview p') ? document.querySelector('#compat-overview p').textContent : ''
          ).then(function(cv) {
            if (!cv) return;
            var a = document.createElement('a');
            a.download = 'compatibility-reading.png';
            a.href = cv.toDataURL('image/png');
            a.click();
          });
        });
      }
    });
  })();