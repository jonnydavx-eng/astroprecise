/**
 * Astro Precise — Cinematic orrery v3 (UMD)
 * Cinema-style compressed orbits + engine still textures when available.
 * Visual target: img/marketing-system-cinema + img/engine/*.webp
 * initOrrery(id, opts) · [data-orrery-cinematic] auto-mount (skip data-manual-init)
 */
(function (global) {
  'use strict';

  var DEG = 180 / Math.PI;
  var RAD = Math.PI / 180;
  var BRASS = 0xc9a24a;
  var BRASS_B = 0xe0c06a;
  var VOID = 0x0c1016;

  // Compressed visual radii (NOT true AU) so the whole system reads like the cinema still
  // Engine stills are portrait product shots — only apply as sphere maps when they wrap cleanly.
  // Sun stays procedural (emissive); earth/jupiter/saturn/mars get engine maps; others solid PBR.
  var BODIES = [
    { id: 'sun', name: 'Sun', color: 0xffc46a, r: 1.55, metal: 0.05, rough: 0.4, e: 0xffaa44, ei: 1.85, orbit: 0 },
    { id: 'mercury', name: 'Mercury', color: 0xb5a898, r: 0.28, metal: 0.8, rough: 0.32, orbit: 2.4 },
    { id: 'venus', name: 'Venus', color: 0xe8c98a, r: 0.42, metal: 0.35, rough: 0.48, orbit: 3.5 },
    { id: 'earth', name: 'Earth', color: 0x3d8fd4, r: 0.48, metal: 0.22, rough: 0.45, orbit: 4.8, atmo: 0x6eb6ff, tex: 'img/engine/earth.webp' },
    { id: 'mars', name: 'Mars', color: 0xc45a3a, r: 0.36, metal: 0.32, rough: 0.55, orbit: 6.2, tex: 'img/engine/mars.webp' },
    { id: 'jupiter', name: 'Jupiter', color: 0xd4a86a, r: 0.95, metal: 0.18, rough: 0.52, orbit: 9.0, tex: 'img/engine/jupiter.webp' },
    { id: 'saturn', name: 'Saturn', color: 0xe0c98a, r: 0.82, metal: 0.2, rough: 0.48, orbit: 11.6, rings: true, tex: 'img/engine/saturn.webp' },
    { id: 'uranus', name: 'Uranus', color: 0x7ec8d4, r: 0.55, metal: 0.4, rough: 0.32, orbit: 13.8 },
    { id: 'neptune', name: 'Neptune', color: 0x3a6fd4, r: 0.52, metal: 0.42, rough: 0.32, orbit: 15.8 },
  ];

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }
  function jdNow() {
    return Date.now() / 86400000 + 2440587.5;
  }

  function bodyLonDeg(id, jd) {
    try {
      var E = global.AstroEphemeris;
      if (E && typeof E[id + 'Position'] === 'function') {
        var p = E[id + 'Position'](jd);
        if (p && typeof p.lon === 'number') return p.lon * DEG;
      }
    } catch (e) {}
    var rates = { mercury: 4.09, venus: 1.6, earth: 0.9856, mars: 0.524, jupiter: 0.083, saturn: 0.033, uranus: 0.012, neptune: 0.006, sun: 0 };
    var base = { mercury: 120, venus: 40, earth: 100, mars: 200, jupiter: 40, saturn: 320, uranus: 50, neptune: 300, sun: 0 };
    return ((base[id] || 0) + (rates[id] || 0) * (jd - 2451545.0)) % 360;
  }

  function makeStars(THREE, n) {
    var geo = new THREE.BufferGeometry();
    var pos = new Float32Array(n * 3);
    var col = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) {
      var r = 40 + Math.random() * 160;
      var th = Math.random() * Math.PI * 2;
      var ph = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      pos[i * 3 + 1] = r * Math.cos(ph);
      pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
      var w = 0.6 + Math.random() * 0.4;
      col[i * 3] = w;
      col[i * 3 + 1] = w * 0.95;
      col[i * 3 + 2] = w * 0.88;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        size: 0.35,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      })
    );
  }

  function makeGlow(THREE, hex) {
    var c = document.createElement('canvas');
    c.width = c.height = 128;
    var ctx = c.getContext('2d');
    var r = (hex >> 16) & 255,
      g = (hex >> 8) & 255,
      b = hex & 255;
    var grd = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(' + r + ',' + g + ',' + b + ',0.9)');
    grd.addColorStop(0.4, 'rgba(' + r + ',' + g + ',' + b + ',0.2)');
    grd.addColorStop(1, 'rgba(' + r + ',' + g + ',' + b + ',0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 128, 128);
    var mat = new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(c),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return new THREE.Sprite(mat);
  }

  function loadTexture(THREE, url, onLoad, onFail) {
    var loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    loader.load(
      url,
      function (tex) {
        if (tex.colorSpace !== undefined) tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 4;
        onLoad(tex);
      },
      undefined,
      function () {
        if (onFail) onFail();
      }
    );
  }

  function addPoster(el) {
    if (el.querySelector('.ap-orrery-poster')) return;
    var poster = document.createElement('div');
    poster.className = 'ap-orrery-poster';
    poster.setAttribute('aria-hidden', 'true');
    // Prefer cinema marketing still as visual target until WebGL paints
    poster.style.cssText =
      'position:absolute;inset:0;z-index:0;background:#0c1016 center/cover no-repeat;' +
      'background-image:url("img/marketing-system-cinema-silver.jpg"),url("img/marketing-system-cinema-silver.jpg"),url("img/engine/earth.webp");' +
      'opacity:1;transition:opacity .6s ease;pointer-events:none;';
    el.insertBefore(poster, el.firstChild);
    return poster;
  }

  function initOrrery(containerId, options) {
    options = options || {};
    var THREE = global.THREE;
    if (!THREE) {
      console.error('[orrery-cinematic] THREE missing');
      return null;
    }
    var el = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    if (!el) return null;
    if (el.__apCinematic && el.__apCinematic.dispose) {
      try {
        el.__apCinematic.dispose();
      } catch (e) {}
    }

    var reduceMotion = false;
    try {
      reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) {}

    el.classList.add('ap-orrery-host', 'ap-orrery-host--v3');
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', options.ariaLabel || 'Interactive solar system orrery');

    // Keep poster; remove previous canvas/frame only
    Array.prototype.slice.call(el.querySelectorAll('canvas, .ap-orrery-frame, .ap-orrery-caption')).forEach(function (n) {
      n.remove();
    });
    var poster = addPoster(el);

    var chromeFrame = document.createElement('div');
    chromeFrame.className = 'ap-orrery-frame';
    chromeFrame.setAttribute('aria-hidden', 'true');
    el.appendChild(chromeFrame);

    var w = Math.max(el.clientWidth || 640, 280);
    var h = Math.max(el.clientHeight || 0, options.minHeight ? parseInt(options.minHeight, 10) || 360 : 360);
    if (el.clientHeight < 200) {
      el.style.minHeight = (options.minHeight || 420) + 'px';
      h = Math.max(h, parseInt(options.minHeight, 10) || 420);
    }

    var scene = new THREE.Scene();
    scene.background = new THREE.Color(VOID);
    scene.fog = new THREE.FogExp2(VOID, 0.012);

    var camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 400);
    camera.position.set(0, 10, 22);

    var renderer = new THREE.WebGLRenderer({ antialias: !reduceMotion, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    renderer.setClearColor(VOID, 1);
    if (renderer.outputColorSpace !== undefined) renderer.outputColorSpace = THREE.SRGBColorSpace;
    if (renderer.toneMapping !== undefined) {
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.25;
    }
    renderer.domElement.style.cssText = 'position:relative;z-index:1;display:block;width:100%;height:100%;touch-action:none';
    renderer.domElement.setAttribute('tabindex', '0');
    el.appendChild(renderer.domElement);

    // Lighting: warm sun + cool rim (cinema still recipe)
    scene.add(new THREE.AmbientLight(0x2a3040, 0.55));
    scene.add(new THREE.HemisphereLight(0x9ec0ff, 0x1a1208, 0.35));
    var sunLight = new THREE.PointLight(0xffe2b0, 3.2, 80, 1.6);
    scene.add(sunLight);
    var key = new THREE.DirectionalLight(0xfff0d0, 0.85);
    key.position.set(12, 8, 10);
    scene.add(key);
    var rim = new THREE.DirectionalLight(0x6a9ae8, 0.45);
    rim.position.set(-14, 6, -10);
    scene.add(rim);

    scene.add(makeStars(THREE, reduceMotion ? 500 : 1200));

    var system = new THREE.Group();
    scene.add(system);

    // Soft ecliptic disc
    var disc = new THREE.Mesh(
      new THREE.RingGeometry(1.2, 17.5, 96),
      new THREE.MeshBasicMaterial({ color: BRASS, transparent: true, opacity: 0.04, side: THREE.DoubleSide, depthWrite: false })
    );
    disc.rotation.x = -Math.PI / 2;
    system.add(disc);

    var bodies = {};
    var painted = false;

    function hidePoster() {
      if (poster && !painted) {
        painted = true;
        poster.style.opacity = '0';
        setTimeout(function () {
          if (poster.parentNode) poster.style.display = 'none';
        }, 700);
      }
    }

    BODIES.forEach(function (m) {
      if (m.orbit > 0) {
        var curve = new THREE.EllipseCurve(0, 0, m.orbit, m.orbit, 0, Math.PI * 2, false, 0);
        var pts = curve.getPoints(96).map(function (p) {
          return new THREE.Vector3(p.x, 0, p.y);
        });
        system.add(
          new THREE.LineLoop(
            new THREE.BufferGeometry().setFromPoints(pts),
            new THREE.LineBasicMaterial({ color: BRASS, transparent: true, opacity: m.orbit < 7 ? 0.28 : 0.14 })
          )
        );
      }

      var g = new THREE.Group();
      var mat = new THREE.MeshStandardMaterial({
        color: m.color,
        metalness: m.metal,
        roughness: m.rough,
        emissive: m.e || 0x000000,
        emissiveIntensity: m.ei || 0,
      });
      var mesh = new THREE.Mesh(new THREE.SphereGeometry(m.r, 48, 36), mat);
      g.add(mesh);

      // Engine stills → sphere albedo (optional; solid colour always valid fallback)
      if (m.tex) {
        loadTexture(
          THREE,
          m.tex,
          function (tex) {
            tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
            mat.map = tex;
            mat.color.setHex(0xffffff);
            mat.needsUpdate = true;
          },
          function () {}
        );
      }

      if (m.atmo) {
        g.add(
          new THREE.Mesh(
            new THREE.SphereGeometry(m.r * 1.08, 32, 24),
            new THREE.MeshBasicMaterial({
              color: m.atmo,
              transparent: true,
              opacity: 0.2,
              side: THREE.BackSide,
              depthWrite: false,
            })
          )
        );
        g.add(
          new THREE.Mesh(
            new THREE.SphereGeometry(m.r * 1.16, 28, 20),
            new THREE.MeshBasicMaterial({
              color: m.atmo,
              transparent: true,
              opacity: 0.08,
              side: THREE.BackSide,
              depthWrite: false,
              blending: THREE.AdditiveBlending,
            })
          )
        );
      }

      if (m.rings) {
        // Brass instrument rings (cinema still language) around gas giant
        for (var ri = 0; ri < 3; ri++) {
          var inner = m.r * (1.35 + ri * 0.28);
          var outer = m.r * (1.55 + ri * 0.28);
          var ring = new THREE.Mesh(
            new THREE.RingGeometry(inner, outer, 96),
            new THREE.MeshStandardMaterial({
              color: ri === 1 ? BRASS_B : BRASS,
              metalness: 0.7,
              roughness: 0.35,
              side: THREE.DoubleSide,
              transparent: true,
              opacity: 0.55 - ri * 0.1,
              depthWrite: false,
            })
          );
          ring.rotation.x = Math.PI / 2.25;
          g.add(ring);
        }
      }

      if (m.id === 'sun') {
        var corona = makeGlow(THREE, 0xffc46a);
        corona.scale.set(7, 7, 1);
        g.add(corona);
        g.add(
          new THREE.Mesh(
            new THREE.SphereGeometry(m.r * 1.35, 32, 24),
            new THREE.MeshBasicMaterial({
              color: 0xffb050,
              transparent: true,
              opacity: 0.22,
              depthWrite: false,
              blending: THREE.AdditiveBlending,
            })
          )
        );
      } else {
        var pg = makeGlow(THREE, m.color);
        pg.scale.set(m.r * 2.8, m.r * 2.8, 1);
        pg.material.opacity = 0.4;
        g.add(pg);
      }

      // Brass orbital ring on Earth (marketing cinema cue)
      if (m.id === 'earth') {
        for (var er = 0; er < 2; er++) {
          var eRing = new THREE.Mesh(
            new THREE.TorusGeometry(m.r * (1.55 + er * 0.35), 0.025, 8, 96),
            new THREE.MeshStandardMaterial({ color: BRASS, metalness: 0.85, roughness: 0.28 })
          );
          eRing.rotation.x = Math.PI / 2.4 + er * 0.35;
          eRing.rotation.z = er * 0.5;
          g.add(eRing);
        }
      }

      system.add(g);
      bodies[m.id] = { meta: m, group: g, mesh: mesh };
    });

    var target = new THREE.Vector3(0, 0, 0);
    var sph = { theta: 0.35, phi: 1.05, radius: 24 };
    var sphGoal = { theta: sph.theta, phi: sph.phi, radius: sph.radius };
    var dragging = false,
      lastX = 0,
      lastY = 0,
      paused = false,
      disposed = false,
      raf = 0;

    function applyCam() {
      sph.theta += (sphGoal.theta - sph.theta) * 0.14;
      sph.phi += (sphGoal.phi - sph.phi) * 0.14;
      sph.radius += (sphGoal.radius - sph.radius) * 0.14;
      var s = Math.sin(sph.phi);
      camera.position.set(
        target.x + sph.radius * s * Math.sin(sph.theta),
        target.y + sph.radius * Math.cos(sph.phi),
        target.z + sph.radius * s * Math.cos(sph.theta)
      );
      camera.lookAt(target);
    }
    applyCam();

    function onDown(e) {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      try {
        renderer.domElement.setPointerCapture(e.pointerId);
      } catch (err) {}
    }
    function onMove(e) {
      if (!dragging) return;
      sphGoal.theta -= (e.clientX - lastX) * 0.006;
      sphGoal.phi = clamp(sphGoal.phi - (e.clientY - lastY) * 0.006, 0.2, Math.PI - 0.2);
      lastX = e.clientX;
      lastY = e.clientY;
    }
    function onUp() {
      dragging = false;
    }
    function onWheel(e) {
      e.preventDefault();
      sphGoal.radius = clamp(sphGoal.radius * (e.deltaY > 0 ? 1.08 : 0.92), 10, 48);
    }
    function onKey(e) {
      if (e.key === 'ArrowLeft') sphGoal.theta += 0.1;
      if (e.key === 'ArrowRight') sphGoal.theta -= 0.1;
      if (e.key === 'ArrowUp') sphGoal.phi = clamp(sphGoal.phi - 0.1, 0.2, Math.PI - 0.2);
      if (e.key === 'ArrowDown') sphGoal.phi = clamp(sphGoal.phi + 0.1, 0.2, Math.PI - 0.2);
    }

    renderer.domElement.addEventListener('pointerdown', onDown);
    renderer.domElement.addEventListener('pointermove', onMove);
    renderer.domElement.addEventListener('pointerup', onUp);
    renderer.domElement.addEventListener('pointercancel', onUp);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });
    renderer.domElement.addEventListener('keydown', onKey);

    function updateBodies(t) {
      var jd = jdNow();
      BODIES.forEach(function (m) {
        var b = bodies[m.id];
        if (!b) return;
        if (m.orbit === 0) {
          b.group.position.set(0, 0, 0);
          b.mesh.rotation.y = t * 0.08;
          return;
        }
        var lon = bodyLonDeg(m.id, jd) * RAD;
        b.group.position.set(m.orbit * Math.cos(lon), Math.sin(t * 0.15 + m.orbit) * 0.04, -m.orbit * Math.sin(lon));
        b.mesh.rotation.y = t * 0.3 + m.orbit;
      });
    }

    function onResize() {
      if (disposed) return;
      var nw = Math.max(el.clientWidth || w, 200);
      var nh = Math.max(el.clientHeight || h, 200);
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh, false);
    }
    global.addEventListener('resize', onResize);

    var t0 = performance.now();
    var frameCount = 0;
    function tick(now) {
      if (disposed) return;
      raf = requestAnimationFrame(tick);
      if (document.visibilityState === 'hidden') return;
      var t = (now - t0) * 0.001;
      if (!paused) {
        if (!reduceMotion) system.rotation.y = t * 0.012;
        updateBodies(t);
        if (!dragging && !reduceMotion && options.autoRotate !== false) sphGoal.theta += 0.0008;
      }
      applyCam();
      renderer.render(scene, camera);
      frameCount++;
      if (frameCount === 2) hidePoster();
    }
    raf = requestAnimationFrame(tick);

    var cap = document.createElement('div');
    cap.className = 'ap-orrery-caption';
    cap.textContent = 'Drag to turn · scroll zoom · arrow keys · cinema-scale orbits · VSOP87 longitudes when loaded';
    el.appendChild(cap);

    var api = {
      setPaused: function (v) {
        paused = !!v;
      },
      focusBody: function (id) {
        var b = bodies[id];
        if (!b) return;
        target.copy(b.group.position);
        sphGoal.radius = clamp(b.meta.orbit * 0.9 + 6, 12, 40);
      },
      dispose: function () {
        disposed = true;
        cancelAnimationFrame(raf);
        global.removeEventListener('resize', onResize);
        renderer.domElement.removeEventListener('pointerdown', onDown);
        renderer.domElement.removeEventListener('pointermove', onMove);
        renderer.domElement.removeEventListener('pointerup', onUp);
        renderer.domElement.removeEventListener('wheel', onWheel);
        renderer.domElement.removeEventListener('keydown', onKey);
        try {
          renderer.dispose();
        } catch (e) {}
        if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
        if (cap.parentNode) cap.parentNode.removeChild(cap);
        if (chromeFrame.parentNode) chromeFrame.parentNode.removeChild(chromeFrame);
        el.__apCinematic = null;
      },
    };
    el.__apCinematic = api;
    return api;
  }

  function autoMount() {
    document.querySelectorAll('[data-orrery-cinematic]').forEach(function (n, i) {
      if (n.hasAttribute('data-manual-init')) return;
      if (n.__apCinematic) return;
      if (!n.id) n.id = 'ap-orrery-' + i;
      initOrrery(n.id, { autoRotate: n.getAttribute('data-auto-rotate') !== '0' });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(autoMount, 80);
    });
  } else {
    setTimeout(autoMount, 80);
  }

  global.initOrrery = initOrrery;
  global.AstroPreciseCinematicOrrery = { initOrrery: initOrrery, autoMount: autoMount };
})(typeof window !== 'undefined' ? window : globalThis);
