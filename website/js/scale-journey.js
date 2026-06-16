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
    document.querySelectorAll('.orrery-scale-btn').forEach(function (btn) {
      btn.classList.remove('journey-active');
      btn.disabled = false;
    });
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
      active = true;
      setJourneyChrome(true);
      showChapter(lv);
      document.querySelectorAll('.orrery-scale-btn').forEach(function (btn) {
        var on = parseInt(btn.dataset.scale, 10) === lv;
        btn.classList.toggle('journey-active', on);
        btn.disabled = true;
      });
    });

    document.addEventListener('orrery-journey-end', hideHud);

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