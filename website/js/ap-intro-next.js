(function () {
  'use strict';
  var EXAMPLE = new Date('1990-01-15T10:30:00Z');
  var DEMO = '15 Jan 1990';
  var BODIES = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];
  var AU = { Mercury: 0.387, Venus: 0.723, Moon: 1, Mars: 1.524, Jupiter: 5.203, Saturn: 9.537 };
  var CX = 200;
  var CY = 214;

  function boot() {
    var svg = document.getElementById('limb-orbits');
    var pause = document.getElementById('demo-pause');
    var retry = document.getElementById('demo-retry');
    var reveal = document.querySelector('.limb-reveal');
    var thumb = document.getElementById('keepsake-thumb');
    var rim = document.getElementById('limb-rim');
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var stage = 0;
    var timers = [];
    var paused = reduced;
    var running = false;
    var thumbSeen = false;
    var mode = 'longitude';
    var lons = {};
    var t0 = 0;

    function set(id, text) {
      var el = document.getElementById(id);
      if (!el) return;
      el.textContent = text || '';
      el.hidden = !text;
    }

    function logRadius(name) {
      if (name === 'Sun') return 0;
      var au = AU[name] || 1;
      var t = (Math.log(au) - Math.log(AU.Mercury)) / (Math.log(AU.Saturn) - Math.log(AU.Mercury));
      return 36 + t * 112;
    }

    function radius(name) {
      return mode === 'log' ? logRadius(name) : 116;
    }

    function xy(lon, rad) {
      var a = (lon - 90) * Math.PI / 180;
      var ry = rad === 0 ? 0 : rad * 0.62;
      return { x: CX + rad * Math.cos(a), y: CY + ry * Math.sin(a) };
    }

    function short(from, to) {
      return ((to - from + 540) % 360) - 180;
    }

    function positions(date) {
      var E = window.AstroEphemeris;
      if (!E || typeof E.allPlanetPositions !== 'function') return null;
      var jd = date.getTime() / 86400000 + 2440587.5;
      var raw = E.allPlanetPositions(jd);
      var out = {};
      BODIES.forEach(function (name) {
        var lon = raw[name] && raw[name].lon;
        if (Number.isFinite(lon)) out[name] = lon;
      });
      return Object.keys(out).length === BODIES.length ? out : null;
    }

    function draw(nextMode) {
      mode = nextMode;
      if (!svg) return;
      var rings = '';
      if (mode === 'log') {
        BODIES.forEach(function (name) {
          if (name === 'Sun') return;
          var rad = logRadius(name);
          rings += '<ellipse class="orbit-ring" cx="' + CX + '" cy="' + CY + '" rx="' + rad.toFixed(1) + '" ry="' + (rad * 0.62).toFixed(1) + '"/>';
        });
      } else {
        rings += '<ellipse class="orbit-ring" cx="' + CX + '" cy="' + CY + '" rx="116" ry="72"/>';
      }
      BODIES.forEach(function (name) {
        var p = xy(lons[name] || 0, radius(name));
        var r = name === 'Sun' ? 5.5 : 3.6;
        rings += '<circle class="body-point" id="intro-' + name + '" r="' + r + '" cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '"/>';
      });
      svg.innerHTML = rings;
    }

    function place(name, lon) {
      lons[name] = lon;
      var node = document.getElementById('intro-' + name);
      if (!node) return;
      var p = xy(lon, radius(name));
      node.setAttribute('cx', p.x.toFixed(1));
      node.setAttribute('cy', p.y.toFixed(1));
    }

    function travel(name, to, delay) {
      var from = lons[name];
      var delta = short(from, to);
      var node = document.getElementById('intro-' + name);
      if (!node || !Number.isFinite(from)) return;
      if (reduced || Math.abs(delta) < 0.4) {
        place(name, to);
        return;
      }
      var frames = [];
      var steps = 8;
      for (var s = 0; s <= steps; s++) {
        var p = xy(from + delta * (s / steps), radius(name));
        frames.push({ cx: p.x, cy: p.y, offset: s / steps });
      }
      var anim = node.animate(frames, {
        duration: 1200,
        delay: delay,
        easing: 'cubic-bezier(.22,.8,.24,1)',
        fill: 'forwards'
      });
      anim.onfinish = function () { place(name, to); };
      lons[name] = to;
    }

    function shiftRim() {
      if (!rim || reduced || typeof rim.animate !== 'function') return;
      rim.animate([
        { opacity: 0.3 },
        { opacity: 0.78 }
      ], { duration: 1200, easing: 'ease-in-out', fill: 'forwards' });
    }

    function clearTimers() {
      timers.forEach(clearTimeout);
      timers = [];
    }

    function later(fn, ms) {
      timers.push(setTimeout(fn, ms));
    }

    function note(kind) {
      var trace = document.getElementById('trace-note');
      if (kind === 'log') {
        if (trace) trace.textContent = 'Log-radius side view · Mercury near, Saturn far · demo';
      } else if (trace) {
        trace.textContent = 'Longitude, not distance';
      }
    }

    function showNow() {
      stage = 0;
      var now = positions(new Date());
      if (!now) return false;
      note('longitude');
      draw('longitude');
      BODIES.forEach(function (name) { place(name, now[name]); });
      set('demo-kicker', '');
      set('demo-detail', '');
      set('demo-status', '');
      if (thumb) thumb.hidden = true;
      return true;
    }

    function showRewind() {
      stage = 1;
      var now = positions(new Date());
      var demo = positions(EXAMPLE);
      if (!now || !demo) return false;
      note('longitude');
      if (mode !== 'longitude') draw('longitude');
      BODIES.forEach(function (name) { place(name, now[name]); });
      set('demo-kicker', 'Rewinding to ' + DEMO + ' · demo');
      set('demo-detail', '10:30 in London. January is GMT, the same instant as 10:30 UTC.');
      shiftRim();
      BODIES.forEach(function (name, i) { travel(name, demo[name], i * 80); });
      return true;
    }

    function showRelation() {
      stage = 2;
      var demo = positions(EXAMPLE);
      if (!demo) return false;
      var E = window.AstroEphemeris;
      BODIES.forEach(function (name) { lons[name] = demo[name]; });
      var from = {};
      BODIES.forEach(function (name) { from[name] = xy(demo[name], mode === 'log' ? logRadius(name) : 116); });
      draw('log');
      note('log');
      BODIES.forEach(function (name, i) {
        var node = document.getElementById('intro-' + name);
        var end = xy(demo[name], logRadius(name));
        if (!node) return;
        if (reduced) {
          node.setAttribute('cx', end.x.toFixed(1));
          node.setAttribute('cy', end.y.toFixed(1));
          return;
        }
        node.setAttribute('cx', from[name].x.toFixed(1));
        node.setAttribute('cy', from[name].y.toFixed(1));
        node.animate([
          { cx: from[name].x, cy: from[name].y },
          { cx: end.x, cy: end.y }
        ], { duration: 640, delay: i * 40, easing: 'cubic-bezier(.22,.8,.24,1)', fill: 'forwards' });
      });
      var sun = E.signOf(demo.Sun);
      var moon = E.signOf(demo.Moon);
      var saturn = E.signOf(demo.Saturn);
      var gap = Math.abs(demo.Sun - demo.Moon) % 360;
      if (gap > 180) gap = 360 - gap;
      set('demo-kicker', 'More than a Sun sign · demo');
      set('demo-detail', 'Sun in ' + sun + '. Moon in ' + moon + ', ' + gap.toFixed(0) + '° apart. Saturn in ' + saturn + '.');
      return true;
    }

    function showKeep() {
      stage = 3;
      if (thumbSeen) return true;
      set('demo-kicker', 'Something to keep · demo');
      set('demo-detail', 'A card like this, after you enter a birth. Not your chart, and nothing here is for sale.');
      if (!thumb) return true;
      thumb.hidden = false;
      thumbSeen = true;
      if (!reduced && typeof thumb.animate === 'function') {
        thumb.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 700, easing: 'ease-out', fill: 'forwards' });
      }
      return true;
    }

    function dropThumb() {
      thumbSeen = true;
      if (thumb) thumb.remove();
    }

    function arm() {
      clearTimers();
      if (paused || reduced) return;
      var elapsed = performance.now() - t0;
      if (elapsed < 250) later(showRewind, 250 - elapsed);
      if (elapsed < 3900) later(showRelation, 3900 - elapsed);
      if (elapsed < 14300) later(showKeep, 14300 - elapsed);
    }

    function labelPause() {
      if (!pause) return;
      pause.hidden = false;
      if (reduced) {
        pause.textContent = stage >= 3 ? 'Replay stills' : 'Next still';
        pause.setAttribute('aria-label', stage >= 3 ? 'Replay the still sequence' : 'Show the next still');
        return;
      }
      if (stage >= 3 && !paused) {
        pause.textContent = 'Replay';
        pause.setAttribute('aria-label', 'Replay the sky sequence');
        return;
      }
      pause.textContent = paused ? 'Play' : 'Pause';
      pause.setAttribute('aria-label', paused ? 'Play the sky sequence' : 'Pause the sky sequence');
    }

    function still() {
      running = false;
      clearTimers();
      set('demo-kicker', 'The picture stays');
      set('demo-detail', 'Planet positions are not on this page yet. This is a composed model of Earth, not your sky.');
      set('demo-status', 'Reveal your birth sky whenever you are ready, or try the positions again.');
      if (retry) retry.hidden = false;
      if (pause) pause.hidden = true;
    }

    function start() {
      if (!showNow()) {
        still();
        return;
      }
      running = true;
      if (retry) retry.hidden = true;
      t0 = performance.now();
      labelPause();
      if (!reduced) arm();
      window.APIntroDemo.ready = true;
      window.APIntroDemo.t0 = t0;
    }

    function go(n) {
      paused = true;
      clearTimers();
      document.getAnimations().forEach(function (anim) {
        if (anim.effect && anim.effect.target && svg && svg.contains(anim.effect.target)) anim.cancel();
      });
      if (n <= 0) showNow();
      else if (n === 1) showRewind();
      else if (n === 2) showRelation();
      else showKeep();
      labelPause();
    }

    paintStars();
    if (reveal) reveal.addEventListener('pointerdown', dropThumb);
    if (pause) {
      pause.addEventListener('click', function () {
        if (!running) return;
        if (reduced) {
          go(stage >= 3 ? 0 : stage + 1);
          paused = true;
          return;
        }
        if (stage >= 3) {
          paused = false;
          go(0);
          paused = false;
          t0 = performance.now();
          arm();
          labelPause();
          return;
        }
        paused = !paused;
        clearTimers();
        document.getAnimations().forEach(function (anim) { paused ? anim.pause() : anim.play(); });
        if (!paused) arm();
        labelPause();
      });
    }
    if (retry) {
      retry.addEventListener('click', function () {
        if (showNow()) {
          running = true;
          retry.hidden = true;
          set('demo-status', '');
          t0 = performance.now();
          paused = reduced;
          labelPause();
          if (!reduced) arm();
        } else still();
      });
    }
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden || reduced || !running) return;
      paused = true;
      clearTimers();
      document.getAnimations().forEach(function (anim) { anim.pause(); });
      labelPause();
    });
    window.addEventListener('resize', paintStars);
    window.APIntroDemo = {
      go: go,
      stage: function () { return stage; },
      elapsed: function () { return t0 ? performance.now() - t0 : 0; },
      ready: false,
      t0: 0
    };
    if (window.AstroEphemeris) start();
    else {
      still();
      var wait = setInterval(function () {
        if (!window.AstroEphemeris) return;
        clearInterval(wait);
        start();
      }, 400);
    }
  }

  function paintStars() {
    var layers = [
      ['stars-far', 170, 0.45, 0.8, 0.72],
      ['stars-mid', 72, 0.75, 1.15, 0.86],
      ['stars-near', 28, 1.05, 1.55, 0.95]
    ];
    layers.forEach(function (layer) {
      var canvas = document.getElementById(layer[0]);
      if (!canvas) return;
      var rect = canvas.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var w = Math.max(1, Math.round(rect.width * dpr));
      var h = Math.max(1, Math.round(rect.height * dpr));
      if (w < 2 || h < 2) return;
      if (canvas.dataset.w === String(w) && canvas.dataset.h === String(h)) return;
      canvas.width = w;
      canvas.height = h;
      var ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);
      var seed = layer[1] * 9973;
      function rnd() {
        seed = (seed * 48271) % 2147483647;
        return seed / 2147483647;
      }
      for (var i = 0; i < layer[1]; i++) {
        ctx.fillStyle = 'rgba(244,239,230,' + (layer[4] * (0.45 + rnd() * 0.55)).toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(rnd() * w, rnd() * h, (layer[2] + rnd() * (layer[3] - layer[2])) * dpr, 0, 6.2832);
        ctx.fill();
      }
      canvas.dataset.w = String(w);
      canvas.dataset.h = String(h);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
