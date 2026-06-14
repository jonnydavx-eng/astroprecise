/* ============================================================================
 * orrery-webgl.js — Photoreal WebGL solar system hero (Three.js, no build step)
 * ----------------------------------------------------------------------------
 * A recognisable heliocentric solar system with EARTH as the visual hero:
 * real planet textures, sun lighting + day/night terminator, blue-marble Earth
 * with clouds + atmosphere + orbiting Moon, Saturn's rings, a depth starfield,
 * and a cinematic "globe → full system" intro.
 *
 * Drop-in replacement for orrery3d.js: exposes the SAME window.Orrery3D API
 * (init/setSpeed/getDate/setDate/jumpTo/destroy/setShow*), so the existing
 * hero controls + timeline scrubber in index.html keep working unchanged.
 *
 * Positions are exact: reuses window.AstroEphemeris (VSOP87/ELP2000). Angular
 * positions are live and accurate; orbital radii are schematic (clean concentric
 * orbits) so the whole system reads clearly — the classic orrery convention.
 *
 * If WebGL is unavailable, transparently injects the canvas orrery3d.js fallback.
 * ==========================================================================*/

import * as THREE from 'three';

(function () {
  'use strict';

  // ── WebGL capability check → graceful fallback to the canvas orrery ────────
  function webglOK() {
    try {
      const c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext &&
        (c.getContext('webgl2') || c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch (e) { return false; }
  }

  if (!webglOK()) {
    // Fall back to the lightweight canvas version (it defines window.Orrery3D itself)
    const s = document.createElement('script');
    s.src = 'js/orrery3d.js';
    document.head.appendChild(s);
    return;
  }

  const PRM = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TEX = 'assets/textures/';
  const D2R = Math.PI / 180;

  // ── Body definitions: schematic orbit radius + display size + texture ──────
  // colour = fallback tint until the texture loads (and night-side ambient base)
  const BODIES = [
    { id: 'mercury', name: 'Mercury', R: 5.0,  size: 0.30, spin: 0.18, color: 0x9a8f86, tex: 'mercury.jpg' },
    { id: 'venus',   name: 'Venus',   R: 7.0,  size: 0.46, spin: 0.10, color: 0xc8a86a, tex: 'venus.jpg' },
    { id: 'earth',   name: 'Earth',   R: 9.5,  size: 0.85, spin: 0.55, color: 0x2a6cb0, tex: 'earth.jpg', hero: true },
    { id: 'mars',    name: 'Mars',    R: 12.5, size: 0.42, spin: 0.52, color: 0xb84a32, tex: 'mars.jpg' },
    { id: 'jupiter', name: 'Jupiter', R: 17.0, size: 1.25, spin: 1.20, color: 0xc7a06a, tex: 'jupiter.jpg' },
    { id: 'saturn',  name: 'Saturn',  R: 21.5, size: 1.05, spin: 1.05, color: 0xcdba8e, tex: 'saturn.jpg', ring: 'saturn_ring.png' },
    { id: 'uranus',  name: 'Uranus',  R: 25.5, size: 0.66, spin: 0.70, color: 0x9ed1e8, tex: 'uranus.jpg' },
    { id: 'neptune', name: 'Neptune', R: 29.0, size: 0.64, spin: 0.68, color: 0x6f9fd8, tex: 'neptune.jpg' },
  ];
  const SUN_SIZE = 2.0;

  // ── Module state ───────────────────────────────────────────────────────────
  let renderer, scene, camera, canvas, wrap;
  let raf = null, destroyed = false, running = true, inView = true;
  let texLoader;
  const meshes = {};          // id → THREE.Object3D (planet group)
  let earthCloud = null, moonGroup = null, moonMesh = null, sunMesh = null, sunGlow = [];
  const orbitLines = [];
  const labels = {};
  let starField = null;

  // time
  let baseNowMs = 0, baseJd = 0, dayOffset = 0, daysPerSec = 0;
  let lastT = 0, needRecompute = true;
  // drag-to-scrub: horizontal drag advances REAL time (planets walk to where they
  // truly are); a flick keeps time coasting with decay. scrubVel = days/event EMA.
  const SCRUB_SENS = 0.4;          // days of real time per px of horizontal drag
  let scrubVel = 0, flicking = false, onScrub = null;

  // camera orbit (spherical around target)
  let camRadius = 48, camAz = -0.6, camEl = 26 * D2R;  // tighter framing — inner system + Earth as the hero (was 82)
  const camTarget = new THREE.Vector3(0, 0, 0);
  let dragging = false, lastX = 0, lastY = 0, downX = 0, downY = 0, userTouched = 0;

  // intro
  let introActive = !PRM, introStart = 0;
  let onIntroDone = null;        // fired once when the intro pull-back settles (the loader uses it to reveal "Enter")
  const INTRO_MS = 4200;

  // layer toggles (mirror canvas API)
  let showOrbits = true, showLabels = false;
  let onPlanetClick = null;

  // ── Helpers ──────────────────────────────────────────────────────────────
  const norm360 = (d) => ((d % 360) + 360) % 360;
  function rect(lonDeg, latDeg, r) {
    const lo = lonDeg * D2R, la = latDeg * D2R;
    return { x: r * Math.cos(la) * Math.cos(lo), y: r * Math.cos(la) * Math.sin(lo), z: r * Math.sin(la) };
  }
  // Heliocentric ecliptic lon/lat for a body at julian day jd (helio = geo − sun)
  function helioLonLat(id, jd) {
    const E = window.AstroEphemeris;
    const sun = E.sunPosition(jd);
    if (id === 'earth') return { lon: norm360(sun.lon + 180), lat: 0 };
    const g = E[id + 'Position'](jd);
    const s = rect(sun.lon, 0, sun.distance);
    const gr = rect(g.lon, g.lat, g.distance);
    const h = { x: gr.x - s.x, y: gr.y - s.y, z: gr.z - s.z };
    const r = Math.hypot(h.x, h.y, h.z) || 1e-9;
    return { lon: norm360(Math.atan2(h.y, h.x) / D2R), lat: Math.asin(h.z / r) / D2R };
  }
  // scene position on the ecliptic plane (XZ), Y up; latitude gently flattened
  function scenePos(R, lonDeg, latDeg) {
    const lo = lonDeg * D2R;
    const y = R * Math.sin((latDeg || 0) * D2R) * 0.35;
    return new THREE.Vector3(R * Math.cos(lo), y, -R * Math.sin(lo));
  }
  const easeInOut = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  // ── Procedural sun texture (the download 403'd; this looks great + is tiny) ─
  function makeSunTexture() {
    const s = 512, c = document.createElement('canvas'); c.width = c.height = s;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(s / 2, s / 2, s * 0.05, s / 2, s / 2, s * 0.5);
    g.addColorStop(0, '#fff7e0'); g.addColorStop(0.45, '#ffd24a');
    g.addColorStop(0.8, '#f08a18'); g.addColorStop(1, '#b84e08');
    x.fillStyle = g; x.fillRect(0, 0, s, s);
    // granulation speckle
    for (let i = 0; i < 2600; i++) {
      const px = Math.random() * s, py = Math.random() * s, r = Math.random() * 2.2 + 0.4;
      x.globalAlpha = Math.random() * 0.10;
      x.fillStyle = Math.random() > 0.5 ? '#fff3c0' : '#c85a10';
      x.beginPath(); x.arc(px, py, r, 0, 7); x.fill();
    }
    x.globalAlpha = 1;
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  // radial-gradient sprite used for the sun's glow / corona (fake bloom)
  function makeGlowTexture(inner, outer) {
    const s = 256, c = document.createElement('canvas'); c.width = c.height = s;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, inner); g.addColorStop(0.35, outer); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, s, s);
    return new THREE.CanvasTexture(c);
  }

  // ── Scene construction ─────────────────────────────────────────────────────
  function loadTex(file, srgb) {
    return new Promise((res) => {
      texLoader.load(TEX + file, (t) => {
        if (srgb !== false) t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = renderer.capabilities.getMaxAnisotropy ? Math.min(8, renderer.capabilities.getMaxAnisotropy()) : 1;
        res(t);
      }, undefined, () => res(null));
    });
  }

  function buildStars() {
    const N = PRM ? 700 : 1700;
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const r = 260 + Math.random() * 320;
      const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      pos[i * 3 + 1] = r * Math.cos(ph);
      pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
      const w = 0.6 + Math.random() * 0.4, tint = Math.random();
      col[i * 3] = w; col[i * 3 + 1] = w * (0.9 + tint * 0.1); col[i * 3 + 2] = w * (0.95 + (1 - tint) * 0.05);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = new THREE.PointsMaterial({ size: 1.1, sizeAttenuation: true, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false });
    starField = new THREE.Points(g, m); scene.add(starField);
  }

  function buildSun() {
    sunMesh = new THREE.Mesh(
      new THREE.SphereGeometry(SUN_SIZE, 48, 48),
      new THREE.MeshBasicMaterial({ map: makeSunTexture() })
    );
    scene.add(sunMesh);
    // layered additive glow sprites (stand-in for bloom, zero dependencies)
    const layers = [
      { tex: makeGlowTexture('rgba(255,240,180,0.95)', 'rgba(255,180,60,0.5)'), scale: SUN_SIZE * 7 },
      { tex: makeGlowTexture('rgba(255,210,120,0.55)', 'rgba(230,140,40,0.18)'), scale: SUN_SIZE * 14 },
    ];
    layers.forEach((l) => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: l.tex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
      sp.scale.set(l.scale, l.scale, 1); scene.add(sp); sunGlow.push(sp);
    });
    // a bright point light at the sun drives the day/night terminator on planets
    const light = new THREE.PointLight(0xfff2d8, 3.2, 0, 0); // decay 0 → even illumination at all distances
    sunMesh.add(light);
    scene.add(new THREE.AmbientLight(0x2a3550, 0.22)); // faint fill so night sides aren't pure black
  }

  function atmosphereMaterial(colorHex) {
    return new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(colorHex) } },
      vertexShader: `varying vec3 vN; void main(){ vN = normalize(normalMatrix*normal); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 uColor; varying vec3 vN;
        void main(){ float i = pow(0.72 - dot(vN, vec3(0.0,0.0,1.0)), 3.0); i = clamp(i,0.0,1.0);
        gl_FragColor = vec4(uColor, 1.0) * i; }`,
      blending: THREE.AdditiveBlending, side: THREE.BackSide, transparent: true, depthWrite: false,
    });
  }

  function buildPlanets() {
    BODIES.forEach((b) => {
      const group = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({ color: b.color, roughness: 1.0, metalness: 0.0 });
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(b.size, b.hero ? 64 : 40, b.hero ? 64 : 40), mat);
      // axial tilt for character
      group.rotation.z = (b.id === 'uranus' ? 82 : b.id === 'saturn' ? 26.7 : b.id === 'earth' ? 23.4 : 6) * D2R;
      group.add(mesh);
      meshes[b.id] = group;
      group.userData = { b, mesh, mat };
      scene.add(group);

      // retrograde glow halo — warm red sprite, hidden until isRetrograde fires
      const retroTex = makeGlowTexture('rgba(255,70,20,0.7)', 'rgba(200,40,0,0.0)');
      const retroSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: retroTex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
      const retroBaseScale = b.size * 3.5;
      retroSprite.scale.set(retroBaseScale, retroBaseScale, 1);
      retroSprite.visible = false;
      retroSprite.userData.baseScale = retroBaseScale;
      group.add(retroSprite);
      group.userData.retroSprite = retroSprite;

      // textures load async; swap in when ready (no blank-hero blocking)
      loadTex(b.tex).then((t) => { if (t) { mat.map = t; mat.color.set(0xffffff); mat.needsUpdate = true; } });

      if (b.hero) {
        // clouds
        earthCloud = new THREE.Mesh(
          new THREE.SphereGeometry(b.size * 1.012, 64, 64),
          new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false, roughness: 1, metalness: 0 })
        );
        group.add(earthCloud);
        loadTex('earth_clouds.jpg', false).then((t) => { if (t) { const m = earthCloud.material; m.alphaMap = t; m.needsUpdate = true; } });
        // atmosphere rim glow
        const atmo = new THREE.Mesh(new THREE.SphereGeometry(b.size * 1.16, 64, 64), atmosphereMaterial(0x5aa6ff));
        group.add(atmo);
        // Moon
        moonGroup = new THREE.Group(); scene.add(moonGroup);
        moonMesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.23, 32, 32),
          new THREE.MeshStandardMaterial({ color: 0xbfc2cc, roughness: 1, metalness: 0 })
        );
        moonGroup.add(moonMesh);
        loadTex('moon.jpg').then((t) => { if (t) { moonMesh.material.map = t; moonMesh.material.color.set(0xffffff); moonMesh.material.needsUpdate = true; } });
      }

      if (b.ring) {
        const inner = b.size * 1.35, outer = b.size * 2.35;
        const ringGeo = new THREE.RingGeometry(inner, outer, 96, 1);
        // remap UVs so the texture strip maps across the ring radius
        const pos = ringGeo.attributes.position, uv = ringGeo.attributes.uv, v3 = new THREE.Vector3();
        for (let i = 0; i < pos.count; i++) {
          v3.fromBufferAttribute(pos, i);
          const rr = (v3.length() - inner) / (outer - inner);
          uv.setXY(i, rr, 0.5);
        }
        const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, transparent: true, opacity: 0.95, depthWrite: false }));
        ring.rotation.x = Math.PI / 2; // lay flat, then group tilt gives the iconic angle
        group.add(ring);
        loadTex(b.ring).then((t) => { if (t) { ring.material.map = t; ring.material.needsUpdate = true; } });
      }

      // orbit ring line
      const oGeo = new THREE.BufferGeometry();
      const segs = 160, arr = new Float32Array((segs + 1) * 3);
      for (let i = 0; i <= segs; i++) {
        const a = (i / segs) * Math.PI * 2;
        arr[i * 3] = Math.cos(a) * b.R; arr[i * 3 + 1] = 0; arr[i * 3 + 2] = -Math.sin(a) * b.R;
      }
      oGeo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
      const oLine = new THREE.Line(oGeo, new THREE.LineBasicMaterial({
        color: b.hero ? 0x6aa6ff : 0xc4920a, transparent: true, opacity: b.hero ? 0.34 : 0.16,
      }));
      scene.add(oLine); orbitLines.push(oLine);

      // name label (sprite, optional)
      labels[b.id] = makeLabel(b.name); labels[b.id].visible = false; scene.add(labels[b.id]);
    });
  }

  function makeLabel(text) {
    const pad = 8, font = 26, c = document.createElement('canvas'), x = c.getContext('2d');
    x.font = `600 ${font}px Inter, system-ui, sans-serif`;
    const w = Math.ceil(x.measureText(text).width) + pad * 2;
    c.width = w; c.height = font + pad * 2;
    x.font = `600 ${font}px Inter, system-ui, sans-serif`;
    x.fillStyle = 'rgba(232,224,208,0.92)'; x.textBaseline = 'middle'; x.textAlign = 'center';
    x.shadowColor = 'rgba(0,0,0,0.7)'; x.shadowBlur = 6;
    x.fillText(text, c.width / 2, c.height / 2);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthTest: false, depthWrite: false }));
    sp.scale.set(c.width / c.height * 1.1, 1.1, 1); sp.userData.aspect = c.width / c.height;
    return sp;
  }

  // ── Per-frame position update from the ephemeris ───────────────────────────
  function updatePositions() {
    const jd = baseJd + dayOffset;
    BODIES.forEach((b) => {
      const ll = helioLonLat(b.id, jd);
      const p = scenePos(b.R, ll.lon, ll.lat);
      meshes[b.id].position.copy(p);
      meshes[b.id].userData.lon = ll.lon;
    });
    // Moon around Earth
    try {
      const E = window.AstroEphemeris, m = E.moonPosition(jd);
      const earthPos = meshes.earth.position;
      const dir = rect(m.lon, m.lat, 1);
      moonGroup.position.set(earthPos.x + dir.x * 1.7, earthPos.y + dir.z * 0.6, earthPos.z - dir.y * 1.7);
    } catch (e) { /* moon optional */ }
  }

  // ── Camera ─────────────────────────────────────────────────────────────────
  function applyCamera() {
    const ce = Math.cos(camEl), se = Math.sin(camEl);
    camera.position.set(
      camTarget.x + camRadius * ce * Math.cos(camAz),
      camTarget.y + camRadius * se,
      camTarget.z + camRadius * ce * Math.sin(camAz)
    );
    camera.lookAt(camTarget);
  }

  // ── Animation loop ─────────────────────────────────────────────────────────
  function frame(t) {
    if (destroyed) return;
    raf = requestAnimationFrame(frame);
    try { frameBody(t); }
    catch (err) { console.warn('[orrery] render error — falling back to canvas orrery:', err); fallbackToCanvas(canvas); }
  }
  function frameBody(t) {
    if (!running || !inView) { lastT = t; return; }
    const dt = Math.min(0.05, (t - (lastT || t)) / 1000); lastT = t;

    // flick momentum — time coasts after a drag-release, decaying to rest
    if (flicking) {
      daysPerSec *= Math.pow(0.12, dt);
      if (Math.abs(daysPerSec) < 0.5) { daysPerSec = 0; flicking = false; }
    }
    // advance time
    if (daysPerSec !== 0) { dayOffset += daysPerSec * dt; needRecompute = true; }
    if (needRecompute) {
      updatePositions(); needRecompute = false; updateDateUI();
      if (onScrub) { try { onScrub(baseJd + dayOffset); } catch (e) {} }
    }

    // retrograde glow: update visibility + pulse breathing animation each frame
    try {
      const E = window.AstroEphemeris;
      if (E && E.isRetrograde) {
        const jd = baseJd + dayOffset;
        const pulse = Math.sin(t * 0.002) * 0.15 + 1.0;
        BODIES.forEach((b) => {
          if (b.id === 'earth') return;
          const sprite = meshes[b.id].userData.retroSprite;
          if (!sprite) return;
          let isRetro = false;
          try { isRetro = !!E.isRetrograde(b.id, jd); } catch (e) {}
          sprite.visible = isRetro;
          if (isRetro) {
            const s = sprite.userData.baseScale * pulse;
            sprite.scale.set(s, s, 1);
          }
        });
      }
    } catch (e) { /* retrograde glow is optional */ }

    // self-rotation (liveliness)
    if (!PRM) {
      BODIES.forEach((b) => { meshes[b.id].userData.mesh.rotation.y += b.spin * dt * 0.25; });
      if (earthCloud) earthCloud.rotation.y += 0.55 * dt * 0.32;
      if (sunMesh) sunMesh.rotation.y += 0.04 * dt;
    }

    // intro: globe → full system
    if (introActive) {
      const p = Math.min(1, (t - introStart) / INTRO_MS), e = easeInOut(p);
      const earthPos = meshes.earth.position;
      camTarget.lerpVectors(earthPos, new THREE.Vector3(0, 0, 0), e);
      camRadius = 3.0 + (48 - 3.0) * e;
      camEl = (7 * D2R) + (26 * D2R - 7 * D2R) * e;
      camAz = (Math.atan2(earthPos.z, earthPos.x) * -1 - 0.2) * (1 - e) + (-0.6) * e;
      if (p >= 1) { introActive = false; if (onIntroDone) { const f = onIntroDone; onIntroDone = null; f(); } }
    } else if (!dragging && !PRM && (t - userTouched) > 1200) {
      camAz += 0.05 * dt; // gentle auto-orbit kicks in fast so the model is never visually frozen
    }
    applyCamera();

    // labels follow planets, scale with distance, face camera
    BODIES.forEach((b) => {
      const lab = labels[b.id]; if (!lab) return;
      lab.visible = showLabels && !introActive;
      if (lab.visible) {
        const m = meshes[b.id];
        lab.position.set(m.position.x, m.position.y + b.size + 0.9, m.position.z);
        const d = camera.position.distanceTo(lab.position);
        const s = Math.max(0.04, d * 0.018);
        lab.scale.set(s * lab.userData.aspect, s, 1);
      }
    });
    orbitLines.forEach((o) => { o.visible = showOrbits; });

    renderer.render(scene, camera);
  }

  // ── UI date readout (mirrors canvas behaviour) ─────────────────────────────
  function updateDateUI() {
    const el = document.getElementById('orrery-date-display'); if (!el) return;
    const d = new Date(baseNowMs + dayOffset * 86400000);
    const str = d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    const tag = Math.abs(dayOffset) < 0.5 ? ' · now' : (dayOffset > 0 ? ` · +${Math.round(dayOffset)}d` : ` · ${Math.round(dayOffset)}d`);
    el.textContent = str + tag;

    try {
      const E = window.AstroEphemeris;
      const jd = baseJd + dayOffset;
      const sunLon = E.sunPosition(jd).lon;
      const moonLon = E.moonPosition(jd).lon;
      const phase = ((moonLon - sunLon) % 360 + 360) % 360;
      const PHASES = [
        [0,   '● New'],
        [45,  '◑ Crescent'],
        [90,  '◑ Quarter'],
        [135, '◕ Gibbous'],
        [180, '○ Full'],
        [225, '◕ Gibbous'],
        [270, '◐ Quarter'],
        [315, '◐ Crescent'],
        [360, '● New'],
      ];
      const phaseLabel = PHASES.find((_, i) => phase < PHASES[i + 1][0])?.[1] || '● New';
      const moonEl = document.getElementById('orrery-moon-phase');
      if (moonEl) moonEl.textContent = phaseLabel;
    } catch (e) { /* moon phase is optional */ }
  }

  // ── Sizing / observers ─────────────────────────────────────────────────────
  function resize() {
    if (!renderer) return;
    const w = canvas.clientWidth || 560, h = canvas.clientHeight || 560;
    const dpr = (window.RafCore && window.RafCore.capDPR)
      ? window.RafCore.capDPR(2)
      : Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }

  // ── Pointer controls ───────────────────────────────────────────────────────
  function bindControls() {
    const onDown = (e) => { dragging = true; const p = pt(e); lastX = downX = p.x; lastY = downY = p.y; userTouched = performance.now(); introActive = false; daysPerSec = 0; flicking = false; scrubVel = 0; try { canvas.style.cursor = 'grabbing'; } catch (_) {} };
    const onMove = (e) => {
      if (!dragging) return; const p = pt(e);
      const dx = p.x - lastX, dy = p.y - lastY;
      // Horizontal drag SCRUBS REAL TIME — the planets walk to their true dated
      // positions (not a camera spin). Vertical drag tilts the view.
      if (dx) { const dd = dx * SCRUB_SENS; dayOffset += dd; needRecompute = true; scrubVel = scrubVel * 0.6 + dd * 0.4; }
      camEl += dy * 0.008; camEl = Math.max(-1.3, Math.min(1.45, camEl)); lastX = p.x; lastY = p.y; userTouched = performance.now();
    };
    const onUp = (e) => {
      if (dragging) {
        const p = pt(e);
        if (Math.hypot(p.x - downX, p.y - downY) < 5) { pick(p); }
        else if (!PRM && Math.abs(scrubVel) > 0.05) { daysPerSec = Math.max(-365, Math.min(365, scrubVel * 40)); flicking = true; }  // flick → time coasts
      }
      dragging = false; scrubVel = 0; try { canvas.style.cursor = 'grab'; } catch (_) {}
    };
    const onWheel = (e) => { e.preventDefault(); camRadius = Math.max(5, Math.min(160, camRadius * (1 + Math.sign(e.deltaY) * 0.08))); userTouched = performance.now(); introActive = false; };
    canvas.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas._orreryHandlers = { onMove, onUp };
  }
  function pt(e) { const r = canvas.getBoundingClientRect(); return { x: (e.clientX || 0) - r.left, y: (e.clientY || 0) - r.top }; }
  const raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const CAP = { sun: 'Sun', moon: 'Moon', mercury: 'Mercury', venus: 'Venus', earth: 'Earth', mars: 'Mars', jupiter: 'Jupiter', saturn: 'Saturn', uranus: 'Uranus', neptune: 'Neptune' };
  // Geocentric ecliptic longitude (the astrological sign as seen from Earth) — not the helio display angle
  function geoLonOf(id, jd) {
    const E = window.AstroEphemeris; if (!E) return null;
    try {
      if (id === 'sun') return E.sunPosition(jd).lon;
      if (id === 'moon') return E.moonPosition(jd).lon;
      if (id === 'earth') return null; // Earth has no geocentric sign
      return E[id + 'Position'](jd).lon;
    } catch (e) { return null; }
  }
  function pick(p) {
    const r = canvas.getBoundingClientRect();
    ndc.x = (p.x / r.width) * 2 - 1; ndc.y = -(p.y / r.height) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
    const targets = BODIES.map((b) => meshes[b.id].userData.mesh);
    if (sunMesh) targets.push(sunMesh);
    if (moonMesh) targets.push(moonMesh);
    const hit = raycaster.intersectObjects(targets, false)[0];
    if (!hit) return;
    let id = null;
    if (hit.object === sunMesh) id = 'sun';
    else if (hit.object === moonMesh) id = 'moon';
    else { const b = BODIES.find((x) => meshes[x.id].userData.mesh === hit.object); if (b) id = b.id; }
    if (!id) return;
    const jd = baseJd + dayOffset;
    const lon = geoLonOf(id, jd);
    let retro = false;
    try {
      const E = window.AstroEphemeris;
      if (E && E.isRetrograde && id !== 'sun' && id !== 'moon' && id !== 'earth') retro = !!E.isRetrograde(id, jd);
    } catch (e) { /* optional */ }
    const detail = { name: CAP[id] || id, id, longitude: (lon == null ? undefined : lon), retro };
    document.dispatchEvent(new CustomEvent('orrery-planet-click', { detail }));
    if (typeof onPlanetClick === 'function') onPlanetClick(id);
  }

  // ── Fallback: drop to the canvas orrery if anything goes wrong at runtime ──
  let fellBack = false;
  function fallbackToCanvas(canvasEl) {
    if (fellBack) return; fellBack = true;
    try { destroyed = true; if (raf) cancelAnimationFrame(raf); } catch (e) {}
    try {
      // A canvas that has held a WebGL context can't return a 2D context — swap in a fresh one
      const fresh = canvasEl.cloneNode(false);
      if (canvasEl.parentNode) canvasEl.parentNode.replaceChild(fresh, canvasEl);
      try { delete window.Orrery3D; } catch (e) { window.Orrery3D = undefined; }
      const s = document.createElement('script');
      s.src = 'js/orrery3d.js';
      s.onload = () => { try { window.Orrery3D.init(fresh); if (window.Orrery3D.setSpeed) window.Orrery3D.setSpeed(0); } catch (e) {} };
      document.head.appendChild(s);
    } catch (e) { /* nothing more we can do */ }
  }

  // ── Public API (matches orrery3d.js) ───────────────────────────────────────
  function init(canvasEl) {
    try { _initWebGL(canvasEl); }
    catch (err) { console.warn('[orrery] WebGL init failed — falling back to canvas orrery:', err); fallbackToCanvas(canvasEl); }
  }
  function _initWebGL(canvasEl) {
    if (!canvasEl || !window.AstroEphemeris) return;
    canvas = canvasEl; wrap = canvas.parentElement;

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
    renderer.setClearColor(0x000000, 0);
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, 1, 0.05, 2000);
    texLoader = new THREE.TextureLoader();

    const now = new Date();
    baseNowMs = now.getTime();
    baseJd = window.AstroEphemeris.julianDay(now.getFullYear(), now.getMonth() + 1, now.getDate(), now.getHours(), now.getMinutes(), 0);

    buildStars(); buildSun(); buildPlanets();
    updatePositions();
    resize();

    introStart = performance.now();
    if (PRM) { introActive = false; camTarget.set(0, 0, 0); camRadius = 48; camEl = 26 * D2R; camAz = -0.6; applyCamera(); }

    bindControls();
    if ('ResizeObserver' in window) { const ro = new ResizeObserver(resize); ro.observe(canvas); canvas._orreryRO = ro; }
    window.addEventListener('resize', resize);
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((ents) => { inView = ents[0].isIntersecting; }, { threshold: 0.01 });
      io.observe(canvas); canvas._orreryIO = io;
    }
    document.addEventListener('visibilitychange', () => { running = !document.hidden; });

    lastT = 0; raf = requestAnimationFrame(frame);
  }

  function setSpeed(s) {
    // button values: 0 pause, 1 (1 day/s), 30 (30 day/s), 365 (~1 year/s)
    daysPerSec = Number(s) || 0;
    flicking = false;   // a speed button is a constant rate, not a decaying flick
    if (daysPerSec !== 0) introActive = false;
  }
  function getDate() { return new Date(baseNowMs + dayOffset * 86400000); }
  function setDate(date) {
    const E = window.AstroEphemeris;
    const jd = E.julianDay(date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes(), 0);
    jumpTo(jd);
  }
  function jumpTo(jd) { dayOffset = jd - baseJd; daysPerSec = 0; flicking = false; needRecompute = true; introActive = false; }
  function scrubDays(d) { dayOffset += Number(d) || 0; daysPerSec = 0; flicking = false; needRecompute = true; introActive = false; }
  function destroy() {
    destroyed = true; if (raf) cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    if (canvas && canvas._orreryHandlers) { window.removeEventListener('pointermove', canvas._orreryHandlers.onMove); window.removeEventListener('pointerup', canvas._orreryHandlers.onUp); }
    if (canvas && canvas._orreryRO) canvas._orreryRO.disconnect();
    if (canvas && canvas._orreryIO) canvas._orreryIO.disconnect();
    try { renderer && renderer.dispose(); } catch (e) {}
  }

  window.Orrery3D = {
    init, destroy, setSpeed, getDate, setDate, jumpTo, scrubDays,
    goTo: setDate,
    get onScrub() { return onScrub; },
    set onScrub(fn) { onScrub = (typeof fn === 'function') ? fn : null; },
    nowJd: () => baseJd + dayOffset,
    getPlanets: () => BODIES.map((b) => ({ ...b, lon: meshes[b.id] && meshes[b.id].userData.lon })),
    setBodies: () => {},
    setShowAspects: () => {},
    setShowParticles: () => {},
    triggerShootingStar: () => {},
    setShowOrbits(b) { showOrbits = !!b; },
    setShowLabels(b) { showLabels = !!b; },
    setShowAsteroids() {},
    get onPlanetClick() { return onPlanetClick; },
    set onPlanetClick(fn) { onPlanetClick = fn; },
    restartIntro() {
      introStart = performance.now(); introActive = !PRM;
      if (PRM && onIntroDone) { const f = onIntroDone; onIntroDone = null; f(); } // reduced-motion: settle instantly
    },
    set onIntroDone(fn) { onIntroDone = fn; if (PRM && fn && !introActive) { onIntroDone = null; fn(); } },
    get onIntroDone() { return onIntroDone; },
    isWebGL: true,
  };
})();
