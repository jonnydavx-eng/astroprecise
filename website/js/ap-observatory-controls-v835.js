/* AstroPrecise v835 — lean controls for the one live Observatory model. */
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
    ['pluto', 'Pluto', '#aa99c5'],
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
    pluto: 'A small, complex world at the familiar system’s far edge.',
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
    if (!orrery || !scaleGroup || !worldGroup) return;

    SCALES.forEach(function (scale) {
      var button = buildButton(scale[1], { lv: scale[0] }, function () {
        if (orrery.flyScale) orrery.flyScale(scale[0]);
        if (telemetry) telemetry.textContent = SCALE_NOTES[scale[0]];
      });
      scaleGroup.appendChild(button);
    });

    WORLDS.forEach(function (world) {
      var button = buildButton(world[1], { key: world[0], name: world[1] }, function () {
        if (orrery.flyTo) orrery.flyTo(world[0]);
      });
      button.setAttribute('aria-label', 'Fly to ' + world[1]);
      button.style.setProperty('--world-color', world[2] || '#d8b46a');
      button.innerHTML = '<span class="world-dot' + (world[0] ? '' : ' world-dot--system') + '" aria-hidden="true"></span><span>' + world[1] + '</span>';
      worldGroup.appendChild(button);
    });

    var scrub = byId('scrub');
    var scrubLabel = byId('scrubLabel');
    if (scrub) scrub.addEventListener('input', function () {
      var year = 1800 + Number(scrub.value) * 0.4;
      var jd = 2451545 + (year - 2000) * 365.25;
      if (orrery.setJD) orrery.setJD(jd);
      if (scrubLabel) {
        scrubLabel.textContent = new Date((jd - 2440587.5) * 86400000)
          .toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
          .toUpperCase();
      }
    });

    var nowButton = byId('nowBtn');
    if (nowButton) nowButton.addEventListener('click', function () {
      if (orrery.setLive) orrery.setLive();
      if (scrub) scrub.value = '566';
      if (scrubLabel) scrubLabel.textContent = 'NOW';
    });

    orrery.addEventListener('planetfocus', function (event) {
      var detail = event.detail || {};
      if (!telemetry) return;
      telemetry.textContent = detail.key && FACTS[detail.key]
        ? FACTS[detail.key]
        : 'Every major world is visible. Choose a destination or change spatial scale.';
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
