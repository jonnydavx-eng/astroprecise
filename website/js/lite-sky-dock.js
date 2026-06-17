/**
 * Live sky dock — shared by lite index shell and index-full.html hero.
 * Populates #live-sky-strip from VSOP87; syncs via ap-sky-tick from orrery scrub.
 */
(function () {
  'use strict';

  var Z = window.AP_ZODIAC;
  var SIGN_NAMES = (Z && Z.SIGN_ORDER) || [
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
  ];
  var SIGN_ABBR = ['Ari', 'Tau', 'Gem', 'Can', 'Leo', 'Vir', 'Lib', 'Sco', 'Sag', 'Cap', 'Aqu', 'Pis'];

  var PLANET_DEF = [
    { id: 'sun', label: 'Sun', glyph: '☉', color: '#f0c040' },
    { id: 'moon', label: 'Moon', glyph: '☽', color: '#d0d8e8' },
    { id: 'mercury', label: 'Mercury', glyph: '☿', color: '#9a9090' },
    { id: 'venus', label: 'Venus', glyph: '♀', color: '#c8b07a' },
    { id: 'mars', label: 'Mars', glyph: '♂', color: '#b84232' },
    { id: 'jupiter', label: 'Jupiter', glyph: '♃', color: '#c08858' },
    { id: 'saturn', label: 'Saturn', glyph: '♄', color: '#c8b48a' },
    { id: 'uranus', label: 'Uranus', glyph: '♅', color: '#7de8e8' },
    { id: 'neptune', label: 'Neptune', glyph: '♆', color: '#4469f5' }
  ];

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  function waitFor(condition, timeout, interval) {
    return new Promise(function (resolve, reject) {
      var t = setTimeout(function () { reject(new Error('timeout')); }, timeout || 8000);
      var i = setInterval(function () {
        if (condition()) {
          clearTimeout(t);
          clearInterval(i);
          resolve();
        }
      }, interval || 80);
    });
  }

  function lonToDisplay(lon) {
    lon = ((lon % 360) + 360) % 360;
    var signIdx = Math.floor(lon / 30);
    var deg = lon - signIdx * 30;
    var degStr = Math.floor(deg) + '°' + Math.floor((deg % 1) * 60).toString().padStart(2, '0') + '′';
    return { signIdx: signIdx, degStr: degStr };
  }

  function skyPlanetArt(p) {
    if (window.AstroIcons && window.AstroIcons.planet) {
      return '<span class="sky-pill__seal">' + window.AstroIcons.planet(p.label, { sm: true, eager: true, label: p.label }) + '</span>';
    }
    return '<span class="sky-pill__glyph" style="color:' + p.color + '" aria-hidden="true">' + p.glyph + '</span>';
  }

  function skySignArt(signIdx) {
    if (window.AstroIcons && window.AstroIcons.sign) {
      return window.AstroIcons.sign(SIGN_NAMES[signIdx], { sm: true, eager: true, label: SIGN_NAMES[signIdx] }) + ' ';
    }
    return (SIGN_ABBR[signIdx] || '') + ' ';
  }

  function liveSkyLonRetro(planetId, jd, E) {
    var lon = 0;
    var retro = false;
    try {
      switch (planetId) {
        case 'sun': lon = E.sunPosition(jd).lon; break;
        case 'moon': lon = E.moonPosition(jd).lon; break;
        case 'mercury': lon = E.mercuryPosition(jd).lon; retro = E.isRetrograde('mercury', jd); break;
        case 'venus': lon = E.venusPosition(jd).lon; retro = E.isRetrograde('venus', jd); break;
        case 'mars': lon = E.marsPosition(jd).lon; retro = E.isRetrograde('mars', jd); break;
        case 'jupiter': lon = E.jupiterPosition(jd).lon; retro = E.isRetrograde('jupiter', jd); break;
        case 'saturn': lon = E.saturnPosition(jd).lon; retro = E.isRetrograde('saturn', jd); break;
        case 'uranus': lon = E.uranusPosition(jd).lon; retro = E.isRetrograde('uranus', jd); break;
        case 'neptune': lon = E.neptunePosition(jd).lon; retro = E.isRetrograde('neptune', jd); break;
      }
    } catch (err) { /* ephemeris edge */ }
    return { lon: lon, retro: retro };
  }

  function focusSkyPill(planetId) {
    var strip = document.getElementById('live-sky-strip');
    if (!strip) return;
    strip.querySelectorAll('.sky-pill[data-planet]').forEach(function (pill) {
      var on = !!planetId && pill.dataset.planet === planetId;
      pill.classList.toggle('sky-pill--focus', on);
      pill.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function refreshLiveSkyStrip(jd) {
    var strip = document.getElementById('live-sky-strip');
    var E = window.AstroEphemeris;
    if (!strip || !E || !strip.querySelector('.sky-pill[data-planet]')) return;
    strip.querySelectorAll('.sky-pill[data-planet]').forEach(function (btn) {
      var id = btn.dataset.planet;
      var lr = liveSkyLonRetro(id, jd, E);
      var disp = lonToDisplay(lr.lon);
      btn.dataset.lon = String(lr.lon);
      btn.dataset.retro = lr.retro ? '1' : '0';
      btn.classList.toggle('sky-pill--retro', lr.retro);
      var def = PLANET_DEF.find(function (p) { return p.id === id; }) || { label: id };
      var retroSpan = btn.querySelector('.sky-pill__retro');
      if (lr.retro && !retroSpan) {
        var nameEl = btn.querySelector('.sky-pill__name');
        if (nameEl) nameEl.insertAdjacentHTML('beforeend', '<span class="sky-pill__retro" aria-label="retrograde"> ℞</span>');
      } else if (!lr.retro && retroSpan) {
        retroSpan.remove();
      }
      var placeEl = btn.querySelector('.sky-pill__placement');
      if (placeEl) placeEl.innerHTML = skySignArt(disp.signIdx) + SIGN_NAMES[disp.signIdx];
      var degEl = btn.querySelector('.sky-pill__degree');
      if (degEl) degEl.textContent = disp.degStr;
      btn.setAttribute('aria-label', def.label + ' in ' + SIGN_NAMES[disp.signIdx] + ' at ' + disp.degStr + (lr.retro ? ' retrograde' : '') + ' — tap for detail');
    });
  }

  function bindSkyPillEvents(strip) {
    strip.querySelectorAll('.sky-pill[data-planet]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var planetId = btn.dataset.planet;
        var def = PLANET_DEF.find(function (p) { return p.id === planetId; }) || {};
        var lonVal = parseFloat(btn.dataset.lon);
        var retro = btn.dataset.retro === '1';
        focusSkyPill(planetId);
        if (window.LiteOrrery && typeof LiteOrrery.focusPlanet === 'function') {
          LiteOrrery.focusPlanet(planetId);
        }
        var orreryHost = document.querySelector('.hero__orrery-wrap') || document.getElementById('orrery-canvas');
        if (orreryHost) orreryHost.scrollIntoView({ behavior: 'smooth', block: 'center' });
        document.dispatchEvent(new CustomEvent('orrery-planet-click', {
          detail: {
            id: planetId,
            name: def.label || planetId,
            longitude: isFinite(lonVal) ? lonVal : null,
            retro: retro
          }
        }));
      });
      btn.addEventListener('dblclick', function (e) {
        e.preventDefault();
        var planetId = btn.dataset.planet;
        focusSkyPill(planetId);
        if (window.Orrery3D && typeof Orrery3D.focusPlanet === 'function') {
          Orrery3D.focusPlanet(planetId);
        }
      });
    });
  }

  window.refreshLiveSkyStrip = refreshLiveSkyStrip;
  window.HomeSkyDock = { refresh: refreshLiveSkyStrip, focusPill: focusSkyPill };

  document.addEventListener('ap-sky-tick', function (e) {
    if (!e || !e.detail || e.detail.jd == null) return;
    refreshLiveSkyStrip(e.detail.jd);
  });

  document.addEventListener('orrery-planet-focus', function (e) {
    if (e && e.detail && e.detail.id) focusSkyPill(e.detail.id);
  });

  setInterval(function () {
    if (document.visibilityState !== 'visible') return;
    var off = null;
    if (window.Orrery3D && typeof Orrery3D.getDayOffset === 'function') off = Orrery3D.getDayOffset();
    else if (window.LiteOrrery && typeof LiteOrrery.getDayOffset === 'function') off = LiteOrrery.getDayOffset();
    if (off == null || Math.abs(off) > 0.5) return;
    var E = window.AstroEphemeris;
    if (!E) return;
    var now = new Date();
    var jd = E.julianDay(now.getFullYear(), now.getMonth() + 1, now.getDate(), now.getHours(), now.getMinutes(), 0);
    refreshLiveSkyStrip(jd);
  }, 60000);

  ready(function () {
    var strip = document.getElementById('live-sky-strip');
    if (!strip) return;

    (async function () {
      try {
        await waitFor(function () {
          return window.AstroEphemeris && window.AstroEphemeris.julianDay;
        }, 12000);
        try {
          await waitFor(function () {
            return window.AstroIcons && window.AstroIcons.planet && window.AstroIcons.sign;
          }, 3000);
        } catch (e) { /* glyph fallback */ }
      } catch (err) {
        strip.innerHTML = '<span class="sky-dock-fallback">Ephemeris unavailable</span>';
        return;
      }

      var E = window.AstroEphemeris;
      var now = new Date();
      var jd = E.julianDay(
        now.getFullYear(), now.getMonth() + 1, now.getDate(),
        now.getHours(), now.getMinutes(), 0
      );

      var html = '';
      for (var pi = 0; pi < PLANET_DEF.length; pi++) {
        var p = PLANET_DEF[pi];
        var lr = liveSkyLonRetro(p.id, jd, E);
        var disp = lonToDisplay(lr.lon);
        var retroHtml = lr.retro ? '<span class="sky-pill__retro" aria-label="retrograde"> ℞</span>' : '';

        html += '<button type="button" class="sky-pill' + (lr.retro ? ' sky-pill--retro' : '') + '"'
          + ' data-planet="' + p.id + '" data-lon="' + lr.lon + '" data-retro="' + (lr.retro ? '1' : '0') + '"'
          + ' aria-pressed="false"'
          + ' aria-label="' + p.label + ' in ' + SIGN_NAMES[disp.signIdx] + ' at ' + disp.degStr + (lr.retro ? ' retrograde' : '') + ' — tap for detail">'
          + skyPlanetArt(p)
          + '<div class="sky-pill__info">'
          + '<span class="sky-pill__name">' + p.label + retroHtml + '</span>'
          + '<span class="sky-pill__placement">' + skySignArt(disp.signIdx) + SIGN_NAMES[disp.signIdx] + '</span>'
          + '<span class="sky-pill__degree">' + disp.degStr + '</span>'
          + '</div>'
          + '</button>';
      }
      strip.innerHTML = html;

      var stamp = document.getElementById('live-sky-stamp');
      if (stamp) {
        stamp.textContent = 'Updated ' + now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
          + ' · ' + now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      }

      bindSkyPillEvents(strip);
      document.dispatchEvent(new CustomEvent('ap-alignment-lock', { detail: { jd: jd } }));
    })();
  });

  document.addEventListener('ap-alignment-lock', function () {
    var logo = document.querySelector('.lite-poster-logo');
    if (logo && !logo.classList.contains('ap-alignment-lock--pulse')) {
      logo.classList.add('ap-alignment-lock--pulse');
    }
    var strip = document.getElementById('live-sky-strip');
    if (strip && !strip.classList.contains('ap-alignment-lock--pulse')) {
      strip.classList.add('ap-alignment-lock--pulse');
      window.setTimeout(function () {
        strip.classList.remove('ap-alignment-lock--pulse');
      }, 1500);
    }
  });
})();