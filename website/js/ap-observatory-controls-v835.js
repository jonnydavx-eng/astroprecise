/* AstroPrecise v858 — controls and the Observatory's dual evidence ledger. */
(function () {
  'use strict';

  var SCALES = [
    ['EARTH', 'Earth'], ['INNER', 'Inner'], ['SYSTEM', 'System'],
    ['OORT', 'Oort'], ['STARS', 'Stars'], ['GALAXY', 'Galaxy'], ['COSMOS', 'Cosmos'],
  ];
  var WORLDS = [
    ['', 'System', ''],
    ['sun', 'Sun', '#ffd76a'],
    ['mercury', 'Mercury', '#aaa39a'],
    ['venus', 'Venus', '#e3bd72'],
    ['earth', 'Earth', '#4d8fd1'],
    ['moon', 'Moon', '#c8cdd6'],
    ['mars', 'Mars', '#c65f3c'],
    ['jupiter', 'Jupiter', '#cf985a'],
    ['saturn', 'Saturn', '#dfc184'],
    ['uranus', 'Uranus', '#8fcfd0'],
    ['neptune', 'Neptune', '#526fd0'],
  ];
  var FACTS = {
    sun: 'The system’s light and 99.86% of its mass.',
    mercury: 'A world with an 88-day year and a 176-day solar day.',
    venus: 'Cloud-bright, furnace-hot and rotating backwards.',
    earth: 'Home—the viewpoint from which this instrument is read.',
    moon: 'Our moving tide-marker, receding about 3.8 cm each year.',
    mars: 'Iron-red, cold and home to the Solar System’s tallest volcano.',
    jupiter: 'The system’s largest planet, shaping thousands of smaller paths.',
    saturn: 'A gas giant encircled by an extraordinarily thin ring system.',
    uranus: 'An ice giant rotating almost on its side.',
    neptune: 'A blue ice giant with the fastest planetary winds measured.',
  };
  var MEANINGS = {
    sun: 'Traditionally associated with identity, vitality and conscious purpose.',
    mercury: 'Traditionally associated with language, learning and exchange.',
    venus: 'Traditionally associated with attraction, values and relationship.',
    earth: 'Astrology is read from Earth’s viewpoint. Earth is the observing frame, not usually a chart planet.',
    moon: 'Traditionally associated with instinct, memory and emotional rhythm.',
    mars: 'Traditionally associated with action, desire and assertion.',
    jupiter: 'Traditionally associated with growth, belief and widening horizons.',
    saturn: 'Traditionally associated with time, limits, responsibility and form.',
    uranus: 'Modern astrology associates Uranus with disruption, freedom and invention.',
    neptune: 'Modern astrology associates Neptune with imagination, ideals and dissolution.',
  };
  var SCALE_NOTES = {
    EARTH: 'Earth and its immediate sky.',
    INNER: 'The terrestrial planets and their paths.',
    SYSTEM: 'Every major world in one compressed, explorable view.',
    OORT: 'A schematic journey to the Solar System’s distant comet cloud.',
    STARS: 'The nearby stellar neighbourhood; positions are schematic.',
    GALAXY: 'A navigable Milky Way diagram, not a distance-true survey.',
    COSMOS: 'A deep-field visualisation at the instrument’s widest scale.',
  };
  var SCALE_MEANINGS = {
    EARTH: 'Astrological charts use Earth as their observing frame.',
    INNER: 'The personal planets are traditionally read as fast-moving functions of daily life.',
    SYSTEM: 'A chart reads angular relationships among these bodies from Earth; the language is symbolic, not scientific.',
    OORT: 'This outer scale is astronomical context. It has no standard natal-chart interpretation.',
    STARS: 'Fixed stars have historical traditions, but this schematic scale is presented here as astronomy only.',
    GALAXY: 'The Milky Way view supplies astronomical context, not a natal-chart claim.',
    COSMOS: 'The deep field is perspective and wonder, not a predictive astrology layer.',
  };
  var RANGE_START_MS = Date.UTC(1800, 0, 1);
  var RANGE_END_MS = Date.UTC(2200, 0, 1);

  function sliderValueFor(ms) {
    return Math.max(0, Math.min(1000, ((ms - RANGE_START_MS) / (RANGE_END_MS - RANGE_START_MS)) * 1000));
  }

  function millisForSlider(value) {
    return RANGE_START_MS + (Number(value) / 1000) * (RANGE_END_MS - RANGE_START_MS);
  }

  function byId(id) { return document.getElementById(id); }

  function buildButton(label, data, click) {
    var button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    Object.keys(data).forEach(function (key) { button.dataset[key] = data[key]; });
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', click);
    return button;
  }

  function boot() {
    var orrery = byId('orr');
    var scaleGroup = byId('mladder');
    var worldGroup = byId('dock');
    var telemetry = byId('telemetry');
    var meaning = byId('sky-meaning');
    var chartLink = byId('sky-chart-link');
    if (!orrery || !scaleGroup || !worldGroup) return;

    SCALES.forEach(function (scale) {
      var button = buildButton(scale[1], { lv: scale[0] }, function () {
        var accepted = orrery.flyScale && orrery.flyScale(scale[0]);
        if (!accepted) return;
        if (telemetry) telemetry.textContent = SCALE_NOTES[scale[0]];
        if (meaning) meaning.textContent = SCALE_MEANINGS[scale[0]];
        if (chartLink) chartLink.textContent = scale[0] === 'SYSTEM' || scale[0] === 'INNER'
          ? 'Find these positions in my chart'
          : 'Cast my chart from Earth';
      });
      scaleGroup.appendChild(button);
    });

    WORLDS.forEach(function (world) {
      var button = buildButton(world[1], { key: world[0], name: world[1] }, function () {
        var accepted = orrery.flyTo && orrery.flyTo(world[0]);
        if (!accepted) return;
      });
      button.setAttribute('aria-label', 'Fly to ' + world[1]);
      button.style.setProperty('--world-color', world[2] || '#d8b46a');
      button.innerHTML = '<span class="world-dot' + (world[0] ? '' : ' world-dot--system') + '" aria-hidden="true"></span><span>' + world[1] + '</span>';
      worldGroup.appendChild(button);
    });

    var scrub = byId('scrub');
    var scrubLabel = byId('scrubLabel');
    if (scrub) scrub.value = String(sliderValueFor(Date.now()));
    if (scrub) scrub.addEventListener('input', function () {
      var dateMs = millisForSlider(scrub.value);
      var jd = dateMs / 86400000 + 2440587.5;
      if (orrery.setJD) orrery.setJD(jd);
      if (scrubLabel) {
        scrubLabel.textContent = new Date(dateMs)
          .toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
          .toUpperCase();
      }
    });

    var nowButton = byId('nowBtn');
    if (nowButton) nowButton.addEventListener('click', function () {
      if (orrery.setLive) orrery.setLive();
      if (scrub) scrub.value = String(sliderValueFor(Date.now()));
      if (scrubLabel) scrubLabel.textContent = 'NOW';
    });

    function setControlsReady(ready) {
      var controls = scaleGroup.querySelectorAll('button');
      controls = Array.prototype.slice.call(controls).concat(
        Array.prototype.slice.call(worldGroup.querySelectorAll('button')),
        scrub ? [scrub] : [],
        nowButton ? [nowButton] : []
      );
      controls.forEach(function (control) {
        control.disabled = !ready;
        if (ready) control.removeAttribute('aria-disabled');
        else control.setAttribute('aria-disabled', 'true');
      });
    }

    setControlsReady(false);
    document.addEventListener('ap-orrery-ready', function () { setControlsReady(true); }, { once: true });
    document.addEventListener('ap-orrery-unavailable', function () { setControlsReady(false); }, { once: true });
    var stage = document.querySelector('.ap-model-stage');
    if (stage && stage.getAttribute('aria-busy') === 'false' && orrery.getAttribute('data-engine') === 'webgl') {
      setControlsReady(true);
    }

    orrery.addEventListener('planetfocus', function (event) {
      var detail = event.detail || {};
      var key = String(detail.key || '').toLowerCase();
      if (telemetry) telemetry.textContent = key && FACTS[key]
        ? FACTS[key]
        : 'Every major world is visible in one compressed, explorable view.';
      if (meaning) meaning.textContent = key && MEANINGS[key]
        ? MEANINGS[key]
        : SCALE_MEANINGS.SYSTEM;
      if (chartLink) chartLink.textContent = key
        ? 'Find ' + (detail.name || key) + ' in my chart'
        : 'Find these positions in my chart';
    });

    orrery.addEventListener('scalechange', function (event) {
      var raw = event.detail && event.detail.level;
      var key = String(raw == null ? 'SYSTEM' : raw).toUpperCase();
      if (/^\d+$/.test(key)) key = (SCALES[Math.max(0, Math.min(6, Number(key)))] || SCALES[2])[0];
      if (!SCALE_NOTES[key]) key = 'SYSTEM';
      if (telemetry) telemetry.textContent = SCALE_NOTES[key];
      if (meaning) meaning.textContent = SCALE_MEANINGS[key];
      if (chartLink) chartLink.textContent = key === 'SYSTEM' || key === 'INNER'
        ? 'Find these positions in my chart'
        : 'Cast my chart from Earth';
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
