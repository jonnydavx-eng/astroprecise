/**
 * AstroPrecise — guided scale journeys triggered by the orrery zoom dial.
 */
(function () {
  'use strict';

  var CH = window.ScaleJourneyChapters || [];
  var byLevel = {};
  CH.forEach(function (c) { byLevel[c.level] = c; });

  var els = {};
  var active = false;

  function $(id) { return document.getElementById(id); }

  function chapter(lv) {
    return byLevel[lv] || null;
  }

  function showChapter(lv) {
    var ch = chapter(lv);
    if (!els.hud || !ch) return;
    els.hud.hidden = false;
    els.viewport && els.viewport.classList.add('orrery-journey-active');
    if (els.tagline) els.tagline.textContent = ch.tagline;
    if (els.title) els.title.textContent = ch.title;
    if (els.narrative) els.narrative.textContent = ch.narrative;
    if (els.fact) els.fact.textContent = ch.fact;
    if (els.pitch) els.pitch.textContent = ch.pitch;
    if (els.progress) {
      var pct = Math.round((lv / 6) * 100);
      els.progress.style.width = pct + '%';
    }
    if (els.detail) {
      els.detail.hidden = true;
      els.detail.classList.remove('is-open');
    }
    if (els.more) {
      els.more.hidden = false;
      els.more.setAttribute('aria-expanded', 'false');
      els.more.textContent = window.matchMedia && window.matchMedia('(max-width: 720px)').matches ? 'Notes' : 'Scene notes';
    }
  }

  function setJourneyChrome(on) {
    var pause = $('orrery-vp-pause');
    if (pause) pause.hidden = !on;
    var inward = $('orrery-vp-inward');
    if (inward) inward.disabled = !!on;
    var tour = $('orrery-full-tour');
    if (tour) {
      tour.disabled = !!on;
      if (!on) tour.textContent = '✦ Cosmic Journey';
      else if (tour.textContent.indexOf('progress') < 0) tour.textContent = 'Journey in progress…';
    }
  }

  function hideHud() {
    if (els.hud) els.hud.hidden = true;
    if (els.viewport) els.viewport.classList.remove('orrery-journey-active');
    active = false;
    setJourneyChrome(false);
    var startJourney = $('orrery-start-journey');
    if (startJourney) startJourney.textContent = 'Start your journey here';
    document.querySelectorAll('.orrery-scale-btn').forEach(function (btn) {
      btn.classList.remove('journey-active');
      btn.disabled = false;
    });
  }

  function syncVpLayerBtn(vpBtn, on) {
    if (!vpBtn) return;
    vpBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    vpBtn.classList.toggle('active', !!on);
  }

  function syncVpFocusScale(lv) {
    var earth = $('orrery-vp-earth');
    var system = $('orrery-vp-system');
    var inner = $('orrery-vp-inner');
    if (earth) earth.classList.toggle('active', lv === 0);
    if (system) system.classList.toggle('active', lv === 2);
    if (inner) inner.classList.toggle('active', lv === 1);
  }

  function syncVpDetailBtn() {
    var btn = $('orrery-vp-detail');
    var O = window.Orrery3D;
    if (!btn || !O || typeof O.getDetailLighting !== 'function') return;
    var active = O.getDetailLighting();
    var mode = typeof O.getDetailLightingMode === 'function' ? O.getDetailLightingMode() : 'auto';
    syncVpLayerBtn(btn, active);
    btn.textContent = active ? 'Detail' : 'Glow';
    btn.title = mode === 'auto'
      ? 'Auto detail lighting (tap to force cinematic glow)'
      : (mode === 'on' ? 'Detail lighting forced on' : 'Cinematic glow forced on');
  }

  function wireVpPlanetFocus() {
    document.querySelectorAll('.orrery-vp-btn[data-planet]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var O = window.Orrery3D;
        var id = btn.dataset.planet;
        if (!O || !id || typeof O.focusPlanet !== 'function') return;
        if (O.isJourneyActive && O.isJourneyActive()) O.cancelScaleJourney(false);
        O.focusPlanet(id);
      });
    });
  }

  function wireVpLayerToggle(vpId, layer, setter) {
    var vpBtn = $(vpId);
    if (!vpBtn) return;
    var deckBtn = document.querySelector('.orrery-toggle[data-layer="' + layer + '"]');

    vpBtn.addEventListener('click', function () {
      if (deckBtn) {
        deckBtn.click();
        syncVpLayerBtn(vpBtn, deckBtn.getAttribute('aria-pressed') === 'true');
        return;
      }
      var O = window.Orrery3D;
      if (!O || typeof O[setter] !== 'function') return;
      var on = vpBtn.getAttribute('aria-pressed') !== 'true';
      O[setter](on);
      syncVpLayerBtn(vpBtn, on);
    });

    if (deckBtn) {
      deckBtn.addEventListener('click', function () {
        syncVpLayerBtn(vpBtn, deckBtn.getAttribute('aria-pressed') === 'true');
      });
    }
  }

  function bind() {
    els.hud = $('orrery-journey-hud');
    els.viewport = $('orrery-viewport');
    els.tagline = $('journey-tagline');
    els.title = $('journey-title');
    els.narrative = $('journey-narrative');
    els.fact = $('journey-fact');
    els.pitch = $('journey-pitch');
    els.progress = $('journey-progress-fill');
    els.skip = $('journey-skip');
    els.more = $('journey-more');
    els.detail = $('journey-detail');

    if (els.more && els.detail) {
      els.more.addEventListener('click', function () {
        var open = els.detail.hidden;
        els.detail.hidden = !open;
        els.detail.classList.toggle('is-open', open);
        els.more.setAttribute('aria-expanded', open ? 'true' : 'false');
        var notesLbl = window.matchMedia && window.matchMedia('(max-width: 720px)').matches ? 'Notes' : 'Scene notes';
        els.more.textContent = open ? 'Hide' : notesLbl;
      });
    }

    if (els.skip) {
      els.skip.addEventListener('click', function () {
        var O = window.Orrery3D;
        if (O && typeof O.cancelScaleJourney === 'function') O.cancelScaleJourney(true);
        else hideHud();
      });
    }

    document.addEventListener('orrery-journey-step', function (e) {
      var lv = e.detail && e.detail.level;
      if (lv == null) return;
      var preloader = !!(e.detail && e.detail.preloader) ||
        (window.__orreryPreloaderOwns && !window.__apHeroEntered);
      if (preloader) return;
      active = true;
      if (!preloader) setJourneyChrome(true);
      showChapter(lv);
      if (els.hud) els.hud.hidden = false;
      if (els.viewport) els.viewport.classList.add('orrery-journey-active');
      if (els.skip) els.skip.hidden = !!preloader;
      if (els.more) els.more.hidden = !!preloader;
      if (els.detail && preloader) {
        els.detail.hidden = true;
        els.detail.classList.remove('is-open');
      }
      if (els.narrative && preloader) els.narrative.textContent = '';
      if (els.fact && preloader) els.fact.textContent = '';
      if (els.pitch && preloader) els.pitch.textContent = '';
      if (!preloader) {
        document.querySelectorAll('.orrery-scale-btn').forEach(function (btn) {
          var on = parseInt(btn.dataset.scale, 10) === lv;
          btn.classList.toggle('journey-active', on);
          btn.disabled = true;
        });
      }
    });

    document.addEventListener('orrery-journey-end', function (e) {
      if (window.__orreryPreloaderOwns && !window.__apHeroEntered) {
        if (els.hud) els.hud.hidden = true;
        if (els.viewport) els.viewport.classList.remove('orrery-journey-active');
        active = false;
        return;
      }
      hideHud();
    });

    var startJourney = $('orrery-start-journey');
    if (startJourney) {
      startJourney.addEventListener('click', function () {
        var O = window.Orrery3D;
        if (!O || typeof O.startScaleJourney !== 'function') return;
        setJourneyChrome(true);
        startJourney.textContent = 'Journey in progress…';
        O.startScaleJourney(0, { fullTour: true, direction: 'in' });
      });
    }

    var tour = $('orrery-full-tour');
    if (tour) {
      tour.addEventListener('click', function () {
        var O = window.Orrery3D;
        if (!O || typeof O.startScaleJourney !== 'function') return;
        setJourneyChrome(true);
        tour.textContent = 'Journey in progress…';
        O.startScaleJourney(6, { fullTour: true, direction: 'out' });
      });
    }

    var vpEarth = $('orrery-vp-earth');
    if (vpEarth) {
      vpEarth.addEventListener('click', function () {
        var O = window.Orrery3D;
        if (!O) return;
        if (O.isJourneyActive && O.isJourneyActive()) O.cancelScaleJourney(true);
        if (typeof O.setScaleLevel === 'function') O.setScaleLevel(0);
      });
    }

    var vpSystem = $('orrery-vp-system');
    if (vpSystem) {
      vpSystem.addEventListener('click', function () {
        var O = window.Orrery3D;
        if (!O) return;
        if (O.isJourneyActive && O.isJourneyActive()) O.cancelScaleJourney(true);
        if (typeof O.setScaleLevel === 'function') O.setScaleLevel(2);
      });
    }

    var vpInner = $('orrery-vp-inner');
    if (vpInner) {
      vpInner.addEventListener('click', function () {
        var O = window.Orrery3D;
        if (!O) return;
        if (O.isJourneyActive && O.isJourneyActive()) O.cancelScaleJourney(true);
        if (typeof O.setScaleLevel === 'function') O.setScaleLevel(1);
      });
    }

    wireVpPlanetFocus();

    wireVpLayerToggle('orrery-vp-orbits', 'orbits', 'setShowOrbits');
    wireVpLayerToggle('orrery-vp-labels', 'labels', 'setShowLabels');

    var vpDetail = $('orrery-vp-detail');
    if (vpDetail) {
      vpDetail.addEventListener('click', function () {
        var O = window.Orrery3D;
        if (!O || typeof O.setDetailLighting !== 'function') return;
        var mode = typeof O.getDetailLightingMode === 'function' ? O.getDetailLightingMode() : 'auto';
        if (mode === 'auto') O.setDetailLighting('off');
        else if (mode === 'off') O.setDetailLighting('on');
        else O.setDetailLighting('auto');
        syncVpDetailBtn();
      });
      document.addEventListener('orrery-detail-lighting', syncVpDetailBtn);
      document.addEventListener('orrery-scale-change', function (e) {
        var lv = e && e.detail ? e.detail.level : null;
        if (lv != null) syncVpFocusScale(lv);
        syncVpDetailBtn();
      });
      document.addEventListener('orrery-planet-focus', syncVpDetailBtn);
      syncVpDetailBtn();
    }

    var vpCapture = $('orrery-vp-capture');
    if (vpCapture) {
      vpCapture.addEventListener('click', function () {
        var cap = $('orrery-capture');
        if (cap) {
          cap.click();
          return;
        }
        var O = window.Orrery3D;
        if (!O || typeof O.captureFrame !== 'function') return;
        var off = O.captureFrame({ scale: 2 });
        if (!off) return;
        try {
          off.toBlob(function (blob) {
            if (!blob) return;
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = 'astroprecise-sky.png';
            a.click();
            URL.revokeObjectURL(url);
          }, 'image/png');
        } catch (e) { /* ignore */ }
      });
    }

    var vpNow = $('orrery-vp-now');
    if (vpNow) {
      vpNow.addEventListener('click', function () {
        var reset = $('orrery-reset');
        if (reset) {
          reset.click();
          return;
        }
        var O = window.Orrery3D;
        if (O && typeof O.snapToNow === 'function') O.snapToNow();
      });
    }

    var vpSun = $('orrery-vp-sun');
    if (vpSun) {
      vpSun.addEventListener('click', function () {
        var O = window.Orrery3D;
        if (!O || typeof O.focusPlanet !== 'function') return;
        if (O.isJourneyActive && O.isJourneyActive()) O.cancelScaleJourney(false);
        O.focusPlanet('sun');
      });
    }

    var vpMoon = $('orrery-vp-moon');
    if (vpMoon) {
      vpMoon.addEventListener('click', function () {
        var O = window.Orrery3D;
        if (!O || typeof O.focusPlanet !== 'function') return;
        if (O.isJourneyActive && O.isJourneyActive()) O.cancelScaleJourney(false);
        O.focusPlanet('moon');
      });
    }

    var vpInward = $('orrery-vp-inward');
    if (vpInward) {
      vpInward.addEventListener('click', function () {
        var O = window.Orrery3D;
        if (!O || typeof O.startScaleJourney !== 'function') return;
        setJourneyChrome(true);
        O.startScaleJourney(0, { fullTour: true, direction: 'in' });
      });
    }

    var vpPause = $('orrery-vp-pause');
    if (vpPause) {
      vpPause.addEventListener('click', function () {
        var O = window.Orrery3D;
        if (O && typeof O.cancelScaleJourney === 'function') O.cancelScaleJourney(true);
        else hideHud();
      });
    }
  }

  window.ScaleJourney = {
    start: function (targetLevel) {
      var O = window.Orrery3D;
      if (!O || typeof O.startScaleJourney !== 'function') {
        if (typeof O.setScaleLevel === 'function') O.setScaleLevel(targetLevel);
        return;
      }
      O.startScaleJourney(targetLevel);
    },
    chapter: chapter,
    isActive: function () { return active; },
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})();