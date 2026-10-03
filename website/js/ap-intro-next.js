(function () {
  'use strict';
  var EXAMPLE = new Date('1990-01-15T10:30:00Z');
  var BODIES = [
    ['Sun', 118],
    ['Moon', 96],
    ['Mercury', 78],
    ['Venus', 64],
    ['Mars', 52],
    ['Jupiter', 40],
    ['Saturn', 30]
  ];

  function boot() {
    var E = window.AstroEphemeris;
    var svg = document.getElementById('limb-orbits');
    var pause = document.getElementById('demo-pause');
    var retry = document.getElementById('demo-retry');
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var stage = 0;
    var timer = null;
    var paused = reduced;
    var failed = false;
    var fmt = new Intl.DateTimeFormat('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC'
    });

    function set(id, text) {
      var el = document.getElementById(id);
      if (el) el.textContent = text;
    }

    function sep(a, b) {
      var d = Math.abs(a - b) % 360;
      return d > 180 ? 360 - d : d;
    }

    function place(date) {
      if (!E || !svg) return null;
      var jd = date.getTime() / 86400000 + 2440587.5;
      var positions = E.allPlanetPositions(jd);
      BODIES.forEach(function (row) {
        var name = row[0];
        var radius = row[1];
        var lon = positions[name] && positions[name].lon;
        var node = document.getElementById('intro-' + name);
        if (!node || !Number.isFinite(lon)) return;
        var a = (lon - 90) * Math.PI / 180;
        var x = 200 + radius * Math.cos(a);
        var y = 210 + radius * 0.62 * Math.sin(a);
        node.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ')');
      });
      return positions;
    }

    function drawOrbits() {
      if (!svg || svg.dataset.ready) return;
      var rings = '';
      BODIES.forEach(function (row) {
        rings += '<ellipse class="orbit-ring" cx="200" cy="210" rx="' + row[1] + '" ry="' + (row[1] * 0.62) + '" stroke-width="1.15"/>';
      });
      BODIES.forEach(function (row) {
        rings += '<g class="body-point" id="intro-' + row[0] + '"><circle r="' + (row[0] === 'Sun' ? 3.2 : 2.2) + '" fill="#f4efe6"/></g>';
      });
      svg.innerHTML = rings;
      svg.dataset.ready = '1';
    }

    function show(n) {
      stage = n;
      var positions = null;
      failed = false;
      set('demo-status', '');
      if (retry) retry.hidden = true;
      try {
        drawOrbits();
        positions = place(n === 0 ? new Date() : EXAMPLE);
        if (!positions) throw new Error('engine');
      } catch (err) {
        failed = true;
        set('demo-kicker', 'The picture stays');
        set('demo-detail', 'Planet positions did not load. This is still a model picture of Earth, not your sky.');
        set('demo-status', 'You can reveal your birth sky now, or try the positions again.');
        if (retry) retry.hidden = false;
        if (pause) pause.hidden = true;
        return;
      }
      var sun = E.signOf(positions.Sun.lon);
      var moon = E.signOf(positions.Moon.lon);
      var saturn = E.signOf(positions.Saturn.lon);
      var sunMoon = sep(positions.Sun.lon, positions.Moon.lon);
      if (n === 0) {
        set('demo-kicker', 'The sky right now');
        set('demo-detail', 'Computed on this device · ' + fmt.format(new Date()) + ' UTC. The Earth picture does not move with it.');
      } else if (n === 1) {
        set('demo-kicker', 'A labelled rewind');
        set('demo-detail', 'From now to an example birth · 15 Jan 1990 · 10:30 UTC · London clock, treated as UTC. Illustrative scale. Not your chart.');
      } else if (n === 2) {
        set('demo-kicker', 'More than a Sun sign');
        set('demo-detail', 'Example only. Sun in ' + sun + '. Moon in ' + moon + ', ' + sunMoon.toFixed(0) + '° from the Sun. Saturn in ' + saturn + '. Your own signs come after you enter a birth.');
      } else {
        set('demo-kicker', 'What you do next');
        set('demo-detail', 'Enter a date, a place, and a time if you know it. Then the main signs, one relationship, and a story you can keep. Nothing on this screen is for sale.');
      }
      if (pause) {
        pause.hidden = false;
        if (reduced) {
          pause.textContent = n === 3 ? 'Replay stills' : 'Next still';
          pause.setAttribute('aria-label', n === 3 ? 'Replay the still sequence' : 'Show the next still');
        } else if (n === 3) {
          pause.textContent = 'Replay';
          pause.setAttribute('aria-label', 'Replay the sky sequence');
        } else {
          pause.textContent = paused ? 'Play' : 'Pause';
          pause.setAttribute('aria-label', paused ? 'Play the sky sequence' : 'Pause the sky sequence');
        }
      }
      clearTimeout(timer);
      if (!paused && !reduced && n < 3) timer = setTimeout(function () { show(n + 1); }, 5000);
    }

    drawOrbits();
    var started = Date.now();
    function attempt() {
      if (!window.AstroEphemeris) {
        if (Date.now() - started < 2500) {
          set('demo-status', 'Positions are still calculating on this device. The picture and the reveal stay available.');
          timer = setTimeout(attempt, 200);
          return;
        }
      }
      show(0);
    }
    if (pause) {
      pause.addEventListener('click', function () {
        if (failed) return;
        if (reduced || stage === 3) {
          show(stage === 3 ? 0 : stage + 1);
          return;
        }
        paused = !paused;
        clearTimeout(timer);
        pause.textContent = paused ? 'Play' : 'Pause';
        pause.setAttribute('aria-label', paused ? 'Play the sky sequence' : 'Pause the sky sequence');
        if (!paused) timer = setTimeout(function () { show(Math.min(stage + 1, 3)); }, 5000);
      });
    }
    if (retry) retry.addEventListener('click', function () { paused = reduced; show(stage); });
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden || reduced || failed) return;
      clearTimeout(timer);
      paused = true;
      if (pause && stage < 3) {
        pause.textContent = 'Play';
        pause.setAttribute('aria-label', 'Play the sky sequence');
      }
    });
    window.APIntroDemo = {
      go: function (n) { paused = true; clearTimeout(timer); show(n); },
      stage: function () { return stage; }
    };
    attempt();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
