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
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

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
  const SUN_SIZE = 2.35;

  // Per-planet visual tuning (atmosphere rim + surface response)
  const PLANET_VIS = {
    mercury: { roughness: 0.94, metalness: 0.06, atmo: null, atmoS: 1.0 },
    venus:   { roughness: 0.88, metalness: 0.0,  atmo: 0xffc070, atmoS: 1.07 },
    earth:   { roughness: 0.78, metalness: 0.04, atmo: 0x3d8fff, atmoS: 1.025 },
    mars:    { roughness: 0.91, metalness: 0.0,  atmo: 0xff6644, atmoS: 1.05 },
    jupiter: { roughness: 0.72, metalness: 0.0,  atmo: 0xe8b060, atmoS: 1.14 },
    saturn:  { roughness: 0.76, metalness: 0.0,  atmo: 0xf0d8a8, atmoS: 1.10 },
    uranus:  { roughness: 0.82, metalness: 0.0,  atmo: 0x88d8f0, atmoS: 1.08 },
    neptune: { roughness: 0.80, metalness: 0.0,  atmo: 0x5088e8, atmoS: 1.09 },
  };

  // ── Module state ───────────────────────────────────────────────────────────
  let renderer, scene, camera, canvas, wrap;
  let raf = null, destroyed = false, running = true, inView = true;
  let texLoader;
  const meshes = {};          // id → THREE.Object3D (planet group)
  let earthCloud = null, moonGroup = null, moonMesh = null, sunMesh = null, sunGlow = [];
  const orbitLines = [];
  const labels = {};
  let starField = null;
  let sunMaterial = null, sunCoronaGroup = null, sunDirLight = null;

  let composer = null;
  let bloomPass = null;
  let perfTier = 'high';

  // ── HD Earth (shader-injected) state ──────────────────────────────────────
  let earthMat = null;        // hero surface MeshStandardMaterial (onBeforeCompile-patched)
  let earthAtmoMat = null;    // dedicated Rayleigh atmosphere shell material
  const ORIGIN = new THREE.Vector3();
  const _earthWorld = new THREE.Vector3();
  const _sunWorld = new THREE.Vector3();
  const _earthInv = new THREE.Matrix3();
  const earthUniforms = {
    uSunDir:      { value: new THREE.Vector3(1, 0, 0) }, // OBJECT-space (spinning textured surface)
    uSunDirWorld: { value: new THREE.Vector3(1, 0, 0) }, // WORLD-space (atmosphere shell, no spin)
    uNightInt:    { value: 1.6 },   // city-light master (tier-tuned at build, live-tunable)
    uTermSharp:   { value: 4.5 },   // terminator falloff hardness (single softener)
    uHasLights:   { value: 0.0 },   // 0 until earth_lights.png loads (no pre-load flash)
    uCloudShadow: { value: 0.0 },   // high-tier only: 1 when cloud tex present
    uCloudTex:    { value: null },  // high-tier cloud-shadow sampler
  };

  function getPerfTier() {
    return (window.RafCore && window.RafCore.tier)
      || ((navigator.hardwareConcurrency != null && navigator.hardwareConcurrency <= 4) ? 'low' : 'high');
  }

  function orreryDPR() {
    if (window.RafCore && window.RafCore.hdDPR) return window.RafCore.hdDPR(2.5);
    const real = window.devicePixelRatio || 1;
    if (perfTier === 'low') return Math.min(real, 1.25);
    if (perfTier === 'mid') return Math.min(real, 2);
    return Math.min(real, 2.5);
  }

  function sphereSegs(hero) {
    if (hero) return perfTier === 'high' ? 128 : perfTier === 'mid' ? 96 : 64;
    return perfTier === 'high' ? 72 : perfTier === 'mid' ? 56 : 40;
  }

  // time
  let baseNowMs = 0, baseJd = 0, dayOffset = 0, daysPerSec = 0;
  let scrollBias = 0;  // days offset from hero scroll position
  let scrollDriveLocked = false;  // manual scrub/speed disables scroll-drive until "Now"
  let lastT = 0, needRecompute = true;
  // drag-to-scrub: horizontal drag advances REAL time (planets walk to where they
  // truly are); a flick keeps time coasting with decay. scrubVel = days/event EMA.
  const SCRUB_SENS = 0.4;          // days of real time per px of horizontal drag
  let scrubVel = 0, flicking = false, onScrub = null;

  // camera orbit (spherical around target)
  let camRadius = 48, camAz = -0.6, camEl = 26 * D2R;  // tighter framing — inner system + Earth as the hero (was 82)
  const camTarget = new THREE.Vector3(0, 0, 0);
  let dragging = false, lastX = 0, lastY = 0, downX = 0, downY = 0, userTouched = 0;

  // intro — HD Earth close-up → pull back through the solar system (preloader + replay)
  let introActive = false, introStart = 0;
  let onIntroDone = null;
  const INTRO_MS = 7200;
  let texturesReady = false;
  let texturesReadyResolve = null;
  const texturesReadyPromise = new Promise((res) => { texturesReadyResolve = res; });

  // layer toggles (mirror canvas API)
  let showOrbits = true, showLabels = false, showAsteroids = false;
  let onPlanetClick = null;

  // scale levels 0–6 — zoom dial = space, scroll = time
  const SCALE_LEVELS = [
    { id: 0, name: 'Earth', hud: 'Earth close-up',
      camRadius: 4.5, camMin: 3, camMax: 8, camEl: 7 * D2R, camAz: -0.6, targetEarth: true,
      honesty: 'Positions live (VSOP87) · distances schematic' },
    { id: 1, name: 'Inner', hud: 'Inner solar system',
      camRadius: 22, camMin: 14, camMax: 38, camEl: 22 * D2R, camAz: -0.6, targetEarth: false,
      honesty: 'Positions live (VSOP87) · distances schematic' },
    { id: 2, name: 'System', hud: 'Full solar system',
      camRadius: 48, camMin: 32, camMax: 160, camEl: 26 * D2R, camAz: -0.6, targetEarth: false,
      honesty: 'Positions live (VSOP87) · distances schematic' },
    { id: 3, name: 'Oort', hud: 'Oort cloud',
      camRadius: 108, camMin: 78, camMax: 175, camEl: 20 * D2R, camAz: -0.45, targetEarth: false,
      honesty: 'Illustrative shell · not measured distances' },
    { id: 4, name: 'Stars', hud: 'Local stars',
      camRadius: 310, camMin: 200, camMax: 520, camEl: 24 * D2R, camAz: -0.5, targetEarth: false,
      honesty: 'Directions schematic · not true 3D distances' },
    { id: 5, name: 'Galaxy', hud: 'Milky Way',
      camRadius: 780, camMin: 520, camMax: 1200, camEl: 52 * D2R, camAz: -0.28, targetEarth: false,
      honesty: 'Illustrative spiral · Sun marked in the Orion arm' },
    { id: 6, name: 'Cosmos', hud: 'Deep field',
      camRadius: 1950, camMin: 1300, camMax: 3000, camEl: 58 * D2R, camAz: 0.05, targetEarth: false,
      honesty: 'Decorative galaxy sprites · not a measured survey' },
  ];
  let scaleLevel = 2;
  let scaleAnimActive = false, scaleAnimStart = 0;
  const scaleAnimFrom = { radius: 48, el: 26 * D2R, az: -0.6, tx: 0, ty: 0, tz: 0 };
  const scaleAnimTo = { radius: 48, el: 26 * D2R, az: -0.6, tx: 0, ty: 0, tz: 0 };
  const SCALE_ANIM_MS = 1000;

  // asteroid belt + Halley comet
  let asteroidPoints = null;
  let halleyGroup = null, halleyOrbit = null, halleyTail = null;
  let saturnRingMesh = null, saturnShadowBand = null;
  let eclipseDim = 0; // 0 = none, 1 = full eclipse dimming

  // Phase 3 galaxy layers (L3–L6)
  let galaxyGroup = null;
  let oortShell = null, localStarsGroup = null, milkyWayDisk = null, cosmicField = null;
  let galacticCore = null, galacticHalo = null;
  let sunMarker = null, solarDim = 1;

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

  function scalePreset(n) { return SCALE_LEVELS[Math.max(0, Math.min(6, n | 0))] || SCALE_LEVELS[2]; }

  function earthTargetVec(out) {
    if (meshes.earth) return out.copy(meshes.earth.position);
    return out.set(0, 0, 0);
  }

  function restartIntro() {
    scaleAnimActive = false;
    introActive = false;          // hold static until we actually begin (below)
    userTouched = performance.now();
    daysPerSec = 0;
    flicking = false;
    scaleLevel = 0;
    updateScaleVisuals(0);
    earthTargetVec(camTarget);
    camRadius = 2.35;
    camEl = 4 * D2R;
    camAz = -0.6;
    applyCamera();
    if (PRM) {
      applyScalePreset(2, false);
      if (onIntroDone) { const f = onIntroDone; onIntroDone = null; f(); }
      return;
    }
    // Smooth start: hold the static Earth close-up until the HD textures have loaded
    // (so the shader recompiles land on this held beat, not mid-animation), then fly
    // out. Capped at 1.5s so a slow connection never stalls the reveal.
    const begin = () => {
      if (destroyed || introActive || scaleLevel !== 0) return;
      introStart = performance.now();
      introActive = true;
    };
    if (texturesReady) { begin(); return; }
    needRecompute = true;
    texturesReadyPromise.then(begin);
    setTimeout(begin, 1500);
  }

  function settleFromIntro() {
    introActive = false;
    userTouched = performance.now();
    if (scaleLevel !== 2) applyScalePreset(2, true);
  }

  function preloadTextures() {
    const files = [];
    BODIES.forEach((b) => {
      if (b.tex) files.push(b.tex);
      if (b.ring) files.push(b.ring);
    });
    files.push('moon.jpg', 'earth_lights.png', 'earth_specular.jpg');
    if (perfTier !== 'low' && !PRM) files.push('earth_clouds.jpg', 'earth_normal.jpg');
    return Promise.all(files.map((f) => loadTex(f))).then(() => {
      texturesReady = true;
      refreshTextures();
      if (texturesReadyResolve) { texturesReadyResolve(); texturesReadyResolve = null; }
    }).catch(() => {
      texturesReady = true;
      if (texturesReadyResolve) { texturesReadyResolve(); texturesReadyResolve = null; }
    });
  }

  function applyScalePreset(preset, animate) {
    const p = scalePreset(typeof preset === 'number' ? preset : (preset.id != null ? preset.id : preset));
    const prevLevel = scaleLevel;
    scaleLevel = p.id;
    if (animate && !PRM) {
      scaleAnimFrom.radius = camRadius;
      scaleAnimFrom.el = camEl;
      scaleAnimFrom.az = camAz;
      if (scalePreset(prevLevel).targetEarth) earthTargetVec(camTarget);
      else camTarget.set(0, 0, 0);
      scaleAnimFrom.tx = camTarget.x; scaleAnimFrom.ty = camTarget.y; scaleAnimFrom.tz = camTarget.z;
      scaleAnimTo.radius = p.camRadius;
      scaleAnimTo.el = p.camEl;
      scaleAnimTo.az = p.camAz;
      if (p.targetEarth) {
        const ep = new THREE.Vector3();
        earthTargetVec(ep);
        scaleAnimTo.tx = ep.x; scaleAnimTo.ty = ep.y; scaleAnimTo.tz = ep.z;
      } else { scaleAnimTo.tx = 0; scaleAnimTo.ty = 0; scaleAnimTo.tz = 0; }
      scaleAnimActive = true;
      scaleAnimStart = performance.now();
      introActive = false;
    } else {
      camRadius = p.camRadius;
      camEl = p.camEl;
      camAz = p.camAz;
      if (p.targetEarth) earthTargetVec(camTarget);
      else camTarget.set(0, 0, 0);
      scaleAnimActive = false;
      applyCamera();
    }
    updateScaleHUD();
    updateScaleVisuals(scaleLevel);
    try {
      document.dispatchEvent(new CustomEvent('orrery-scale-change', { detail: { level: scaleLevel, preset: p } }));
    } catch (e) { /* optional */ }
  }

  function clampCamToLevel() {
    const p = scalePreset(scaleLevel);
    camRadius = Math.max(p.camMin, Math.min(p.camMax, camRadius));
  }

  function updateScaleHUD() {
    const p = scalePreset(scaleLevel);
    const scaleEl = document.getElementById('orrery-scale-label');
    if (scaleEl) scaleEl.textContent = p.hud;
    document.querySelectorAll('.orrery-scale-btn').forEach((btn) => {
      const lv = parseInt(btn.dataset.scale, 10);
      btn.classList.toggle('active', lv === scaleLevel);
      btn.setAttribute('aria-pressed', lv === scaleLevel ? 'true' : 'false');
    });
  }

  // Halley — illustrative high-eccentricity path; positions are schematic, not ephemeris
  const HALLEY = { periodY: 75.3, epochJd: 2446470.5, periR: 14.2, apoR: 28.5, inc: 0.42 };
  function halleyLon(jd) {
    const days = (jd - HALLEY.epochJd);
    const M = ((days / (HALLEY.periodY * 365.25)) % 1) * Math.PI * 2;
    return norm360((M / D2R) + 75);
  }
  function halleyScenePos(jd) {
    const lon = halleyLon(jd) * D2R;
    const t = (Math.sin(lon * 0.5) + 1) * 0.5;
    const r = HALLEY.periR + (HALLEY.apoR - HALLEY.periR) * t;
    const y = Math.sin(lon) * HALLEY.inc * r * 0.35;
    return new THREE.Vector3(r * Math.cos(lon), y, -r * Math.sin(lon));
  }

  function buildAsteroids() {
    const innerR = 13.5, outerR = 15.5;
    const count = perfTier === 'low' ? 48 : 72;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.08;
      const r = innerR + Math.random() * (outerR - innerR);
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 0.35;
      pos[i * 3 + 2] = -Math.sin(a) * r;
      const w = 0.45 + Math.random() * 0.35;
      col[i * 3] = 0.72 * w; col[i * 3 + 1] = 0.62 * w; col[i * 3 + 2] = 0.48 * w;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    asteroidPoints = new THREE.Points(g, new THREE.PointsMaterial({
      size: perfTier === 'high' ? 0.22 : 0.18, vertexColors: true, transparent: true,
      opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    asteroidPoints.visible = showAsteroids;
    scene.add(asteroidPoints);
  }

  function buildHalley() {
    halleyGroup = new THREE.Group();
    const orbitPts = [];
    for (let i = 0; i <= 120; i++) {
      const lon = (i / 120) * 360;
      const t = (Math.sin(lon * D2R * 0.5) + 1) * 0.5;
      const r = HALLEY.periR + (HALLEY.apoR - HALLEY.periR) * t;
      const lo = lon * D2R;
      orbitPts.push(r * Math.cos(lo), Math.sin(lo) * HALLEY.inc * r * 0.35, -r * Math.sin(lo));
    }
    const oGeo = new THREE.BufferGeometry();
    oGeo.setAttribute('position', new THREE.Float32BufferAttribute(orbitPts, 3));
    halleyOrbit = new THREE.Line(oGeo, new THREE.LineDashedMaterial({
      color: 0x9ec8e8, transparent: true, opacity: 0.35, dashSize: 0.8, gapSize: 0.5,
    }));
    halleyOrbit.computeLineDistances();
    halleyGroup.add(halleyOrbit);

    const nucleus = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xc8e8ff, transparent: true, opacity: 0.9 })
    );
    halleyGroup.add(nucleus);
    halleyGroup.userData.nucleus = nucleus;

    const tailTex = makeGlowTexture('rgba(180,220,255,0.55)', 'rgba(80,140,220,0.0)');
    halleyTail = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tailTex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.65,
    }));
    halleyTail.scale.set(4.5, 1.2, 1);
    halleyGroup.add(halleyTail);

    labels.halley = makeLabel('1P/Halley · illustrative');
    labels.halley.visible = false;
    halleyGroup.add(labels.halley);

    scene.add(halleyGroup);
  }

  function updateHalley(jd) {
    if (!halleyGroup) return;
    const p = halleyScenePos(jd);
    halleyGroup.userData.nucleus.position.copy(p);
    if (halleyTail) {
      halleyTail.position.copy(p);
      const sunDir = p.clone().negate().normalize();
      halleyTail.position.add(sunDir.multiplyScalar(1.8));
      halleyTail.material.opacity = 0.45 + 0.25 * Math.max(0, 1 - p.length() / HALLEY.apoR);
    }
    if (labels.halley) {
      labels.halley.visible = showLabels && scaleLevel >= 1;
      if (labels.halley.visible) {
        labels.halley.position.set(p.x, p.y + 0.9, p.z);
        const d = camera.position.distanceTo(labels.halley.position);
        const s = Math.max(0.04, d * 0.016);
        labels.halley.scale.set(s * labels.halley.userData.aspect, s, 1);
      }
    }
  }

  const LOCAL_STARS = [
    { name: 'Proxima Cen', dir: [0.78, -0.08, 0.62], dist: 58, color: 0xffe8c8 },
    { name: 'Alpha Cen', dir: [0.74, -0.12, 0.66], dist: 62, color: 0xfff0d8 },
    { name: 'Sirius', dir: [-0.42, -0.58, 0.70], dist: 78, color: 0xe8f4ff },
    { name: 'Vega', dir: [0.12, 0.82, 0.55], dist: 85, color: 0xf0f8ff },
    { name: 'Betelgeuse', dir: [-0.55, 0.18, 0.81], dist: 92, color: 0xffb890 },
    { name: 'Polaris', dir: [0.05, 0.96, 0.28], dist: 70, color: 0xfff8e8 },
    { name: 'Arcturus', dir: [-0.68, 0.52, 0.52], dist: 80, color: 0xffd8a0 },
    { name: 'Altair', dir: [0.38, 0.62, 0.68], dist: 74, color: 0xf8fcff },
  ];

  function galaxySpriteTexture(inner, outer, w, h) {
    const c = document.createElement('canvas');
    c.width = w || 256; c.height = h || 128;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(c.width / 2, c.height / 2, 0, c.width / 2, c.height / 2, c.width / 2);
    g.addColorStop(0, inner); g.addColorStop(0.45, outer); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);
    return new THREE.CanvasTexture(c);
  }

  function buildOortShell() {
    const innerR = 52, outerR = 68;
    const count = perfTier === 'low' ? 900 : perfTier === 'mid' ? 1400 : 2200;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const u = Math.random(), v = Math.random();
      const th = 2 * Math.PI * u, ph = Math.acos(2 * v - 1);
      const r = innerR + Math.random() * (outerR - innerR);
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      pos[i * 3 + 1] = r * Math.cos(ph) * 0.35;
      pos[i * 3 + 2] = -r * Math.sin(ph) * Math.sin(th);
      const w = 0.35 + Math.random() * 0.45;
      col[i * 3] = 0.72 * w; col[i * 3 + 1] = 0.68 * w; col[i * 3 + 2] = 0.88 * w;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    oortShell = new THREE.Points(g, new THREE.PointsMaterial({
      size: perfTier === 'high' ? 0.35 : 0.28, vertexColors: true, transparent: true,
      opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    oortShell.visible = false;
    galaxyGroup.add(oortShell);
  }

  function buildLocalStars() {
    localStarsGroup = new THREE.Group();
    LOCAL_STARS.forEach((s) => {
      const d = new THREE.Vector3(s.dir[0], s.dir[1], s.dir[2]).normalize().multiplyScalar(s.dist);
      const core = new THREE.Sprite(new THREE.SpriteMaterial({
        map: makeGlowTexture('rgba(255,245,220,0.95)', 'rgba(180,200,255,0.0)'),
        blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, color: s.color,
      }));
      core.scale.set(3.2, 3.2, 1);
      core.position.copy(d);
      localStarsGroup.add(core);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({
        map: makeGlowTexture('rgba(200,220,255,0.25)', 'rgba(80,120,200,0.0)'),
        blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.5,
      }));
      halo.scale.set(9, 9, 1);
      halo.position.copy(d);
      localStarsGroup.add(halo);
      const lab = makeLabel(s.name);
      lab.position.set(d.x, d.y + 2.2, d.z);
      lab.scale.set(0.55, 0.55, 1);
      localStarsGroup.add(lab);
    });
    const sysDot = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture('rgba(255,220,120,0.9)', 'rgba(255,160,40,0.0)'),
      blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
    }));
    sysDot.scale.set(2.4, 2.4, 1);
    sysDot.position.set(0, 0, 0);
    localStarsGroup.add(sysDot);
    const sysLab = makeLabel('Solar system');
    sysLab.position.set(0, 2.5, 0);
    sysLab.scale.set(0.5, 0.5, 1);
    localStarsGroup.add(sysLab);
    localStarsGroup.visible = false;
    galaxyGroup.add(localStarsGroup);
  }

  function buildMilkyWaySpiral() {
    const arms = 4;
    const count = perfTier === 'low' ? 6000 : perfTier === 'mid' ? 10000 : 16000;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const bulgeCount = Math.floor(count * 0.08);
    for (let i = 0; i < count; i++) {
      let x, y, z, r, g, b;
      if (i < bulgeCount) {
        const u = Math.random(), ang = Math.random() * Math.PI * 2;
        const rad = Math.pow(u, 0.55) * 42;
        x = Math.cos(ang) * rad;
        z = Math.sin(ang) * rad;
        y = (Math.random() - 0.5) * 8;
        r = 1.0; g = 0.88; b = 0.62;
      } else {
        const arm = Math.floor(Math.random() * arms);
        const t = Math.pow(Math.random(), 0.72);
        const angle = t * 5.8 * Math.PI + arm * (Math.PI * 2 / arms) + (Math.random() - 0.5) * 0.35;
        const rad = 48 + t * 520 + (Math.random() - 0.5) * 28;
        x = Math.cos(angle) * rad;
        z = Math.sin(angle) * rad;
        y = (Math.random() - 0.5) * (14 + t * 10) * (1 - t * 0.35);
        const warm = Math.random();
        r = 0.55 + warm * 0.4; g = 0.48 + warm * 0.35; b = 0.72 + (1 - warm) * 0.2;
      }
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
      const w = 0.45 + Math.random() * 0.55;
      col[i * 3] = r * w; col[i * 3 + 1] = g * w; col[i * 3 + 2] = b * w;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    milkyWayDisk = new THREE.Points(geo, new THREE.PointsMaterial({
      size: perfTier === 'high' ? 0.55 : 0.42, vertexColors: true, transparent: true,
      opacity: 0.82, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    milkyWayDisk.rotation.x = 62 * D2R;
    milkyWayDisk.visible = false;
    galaxyGroup.add(milkyWayDisk);

    sunMarker = new THREE.Group();
    const sunPos = new THREE.Vector3(118, 3.5, 52);
    const sm = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture('rgba(255,230,160,0.95)', 'rgba(255,180,60,0.0)'),
      blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
    }));
    sm.scale.set(5, 5, 1);
    sm.position.copy(sunPos);
    sunMarker.add(sm);
    const sl = makeLabel('Sun · Orion arm');
    sl.position.set(sunPos.x, sunPos.y + 4, sunPos.z);
    sl.scale.set(0.65, 0.65, 1);
    sunMarker.add(sl);
    sunMarker.visible = false;
    galaxyGroup.add(sunMarker);

    galacticCore = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture('rgba(255,240,210,0.55)', 'rgba(255,180,80,0.0)'),
      blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.72,
    }));
    galacticCore.scale.set(48, 48, 1);
    galacticCore.position.set(0, 2, 0);
    galacticCore.visible = false;
    galaxyGroup.add(galacticCore);

    galacticHalo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: galaxySpriteTexture('rgba(180,140,255,0.18)', 'rgba(60,40,120,0.0)', 512, 256),
      blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.42,
    }));
    galacticHalo.scale.set(920, 420, 1);
    galacticHalo.rotation.x = 62 * D2R;
    galacticHalo.visible = false;
    galaxyGroup.add(galacticHalo);
  }

  function buildCosmicField() {
    cosmicField = new THREE.Group();
    const count = perfTier === 'low' ? 5 : 9;
    for (let i = 0; i < count; i++) {
      const tex = galaxySpriteTexture(
        'rgba(220,200,255,0.35)', 'rgba(120,90,180,0.05)', 320, 180
      );
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: tex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.55,
      }));
      const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
      const r = 900 + Math.random() * 1400;
      sp.position.set(
        r * Math.sin(ph) * Math.cos(th),
        (Math.random() - 0.5) * 400,
        r * Math.sin(ph) * Math.sin(th)
      );
      const sc = 120 + Math.random() * 180;
      sp.scale.set(sc * (1.4 + Math.random() * 0.8), sc, 1);
      sp.material.rotation = Math.random() * Math.PI;
      sp.userData.drift = (Math.random() - 0.5) * 0.00008;
      cosmicField.add(sp);
    }
    const deepN = perfTier === 'low' ? 1200 : 2400;
    const dPos = new Float32Array(deepN * 3);
    const dCol = new Float32Array(deepN * 3);
    for (let i = 0; i < deepN; i++) {
      const r = 600 + Math.random() * 2200;
      const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
      dPos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      dPos[i * 3 + 1] = r * Math.cos(ph);
      dPos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
      const w = 0.2 + Math.random() * 0.5;
      dCol[i * 3] = 0.9 * w; dCol[i * 3 + 1] = 0.85 * w; dCol[i * 3 + 2] = 1.0 * w;
    }
    const dGeo = new THREE.BufferGeometry();
    dGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
    dGeo.setAttribute('color', new THREE.BufferAttribute(dCol, 3));
    const deep = new THREE.Points(dGeo, new THREE.PointsMaterial({
      size: 0.5, vertexColors: true, transparent: true, opacity: 0.35, depthWrite: false,
    }));
    cosmicField.add(deep);
    cosmicField.visible = false;
    galaxyGroup.add(cosmicField);
  }

  function buildGalaxyLayers() {
    galaxyGroup = new THREE.Group();
    scene.add(galaxyGroup);
    buildOortShell();
    buildLocalStars();
    buildMilkyWaySpiral();
    buildCosmicField();
  }

  function updateScaleVisuals(level) {
    const lv = level | 0;
    solarDim = lv <= 2 ? 1 : lv === 3 ? 0.55 : lv === 4 ? 0.12 : 0;
    const showSolar = solarDim > 0.02;
    const showPlanetLabels = showLabels && lv <= 2;
    BODIES.forEach((b) => {
      const g = meshes[b.id];
      if (!g) return;
      g.visible = showSolar;
      if (showSolar) {
        const s = lv <= 2 ? 1 : lv === 3 ? 0.45 : 0.15;
        g.scale.setScalar(s);
        const m = g.userData.mesh;
        if (m && m.material) {
          m.material.transparent = false;
          m.material.opacity = 1;
          m.material.depthWrite = true;
          m.material.needsUpdate = true;
        }
      }
    });
    if (sunMesh) {
      sunMesh.visible = showSolar;
      if (sunGlow.length && showSolar) {
        sunGlow.forEach((sp) => { sp.visible = lv <= 2; });
      }
      if (sunCoronaGroup) sunCoronaGroup.visible = showSolar && lv <= 2;
    }
    if (moonGroup) moonGroup.visible = showSolar && lv <= 1;
    if (earthCloud) earthCloud.visible = showSolar && lv <= 1;
    orbitLines.forEach((o) => { o.visible = showOrbits && lv <= 3; });
    if (asteroidPoints) asteroidPoints.visible = showAsteroids && lv <= 3;
    if (halleyGroup) halleyGroup.visible = lv <= 3;
    if (labels.halley) labels.halley.visible = showLabels && lv >= 1 && lv <= 3;
    Object.keys(labels).forEach((k) => {
      if (k === 'halley') return;
      if (labels[k]) labels[k].visible = showPlanetLabels;
    });

    if (oortShell) oortShell.visible = lv === 3;
    if (localStarsGroup) localStarsGroup.visible = lv === 4;
    if (milkyWayDisk) milkyWayDisk.visible = lv === 5;
    if (sunMarker) sunMarker.visible = lv === 5;
    if (galacticCore) galacticCore.visible = lv === 5;
    if (galacticHalo) galacticHalo.visible = lv >= 5;
    if (cosmicField) cosmicField.visible = lv === 6;

    if (starField && starField.material.uniforms) {
      starField.material.uniforms.uFade.value = lv >= 6 ? 0.28 : lv >= 5 ? 0.45 : 1;
    }

    if (bloomPass) {
      bloomPass.strength = lv >= 5 ? 0.42 : perfTier === 'mid' ? 0.2 : 0.3;
      bloomPass.threshold = lv >= 5 ? 0.82 : perfTier === 'mid' ? 0.93 : 0.9;
    }
    if (renderer) {
      renderer.toneMappingExposure = lv >= 5 ? 1.18 : perfTier === 'high' ? 1.08 : 1.02;
    }

    const chip = document.getElementById('orrery-honesty-chip');
    const p = scalePreset(lv);
    if (chip && p.honesty) chip.textContent = p.honesty;
  }

  function updateEclipseDim(jd) {
    try {
      const E = window.AstroEphemeris;
      const sunLon = E.sunPosition(jd).lon;
      const moonLon = E.moonPosition(jd).lon;
      let sep = Math.abs(((moonLon - sunLon + 540) % 360) - 180);
      if (sep > 180) sep = 360 - sep;
      // dim when Sun–Moon alignment is tight (solar eclipse geometry)
      eclipseDim = sep < 2.2 ? Math.pow(1 - sep / 2.2, 1.6) : 0;
    } catch (e) { eclipseDim = 0; }
  }

  function applyEclipseVisuals() {
    const k = 1 - eclipseDim * 0.72;
    sunGlow.forEach((sp, i) => {
      if (!sp.visible || !sp.material) return;
      const base = i === 0 ? 0.6 : i === 1 ? 0.3 : 0.15;
      sp.material.opacity = base * k;
    });
    if (sunMaterial && sunMaterial.uniforms) {
      sunMaterial.uniforms.uEclipse = sunMaterial.uniforms.uEclipse || { value: 0 };
      sunMaterial.uniforms.uEclipse.value = eclipseDim;
    }
  }

  function updateSaturnShadow(jd) {
    if (!saturnRingMesh || !saturnShadowBand || !sunMesh) return;
    const saturnPos = meshes.saturn.position;
    const sunPos = sunMesh.position;
    const lit = new THREE.Vector3().subVectors(sunPos, saturnPos).normalize();
    saturnShadowBand.position.copy(lit.clone().multiplyScalar(0.92 * 1.05));
    saturnShadowBand.lookAt(saturnPos);
    saturnShadowBand.visible = true;
    const ringOpacity = 0.92 - eclipseDim * 0.08;
    if (saturnRingMesh.material) saturnRingMesh.material.opacity = ringOpacity;
  }

  // ── Animated sun surface shader (limb darkening + granulation + fresnel corona) ─
  function makeSunShaderMaterial() {
    return new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uEclipse: { value: 0 } },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewDir;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vNormal = normalize(normalMatrix * normal);
          vViewDir = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        precision highp float;
        varying vec3 vNormal;
        varying vec3 vViewDir;
        uniform float uTime;
        uniform float uEclipse;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float noise(vec2 p) {
          vec2 i = floor(p); vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                     mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
        }
        void main() {
          vec3 n = normalize(vNormal);
          vec3 v = normalize(vViewDir);
          float facing = max(dot(n, v), 0.0);
          float limb = pow(facing, 0.28);
          float gran = noise(n.xy * 18.0 + uTime * 0.12) * 0.55
                     + noise(n.xy * 36.0 - uTime * 0.07) * 0.3
                     + noise(n.xy * 7.0 + uTime * 0.04) * 0.15;
          vec3 core = vec3(1.0, 0.98, 0.90);
          vec3 mid  = vec3(1.0, 0.78, 0.22);
          vec3 edge = vec3(0.95, 0.42, 0.04);
          vec3 col = mix(edge, mid, limb);
          col = mix(col, core, limb * limb + gran * 0.14);
          float rim = pow(1.0 - facing, 2.8);
          col += vec3(1.0, 0.82, 0.35) * rim * 0.42;
          col *= mix(1.0, 0.35, uEclipse);
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
  }

  function makeEarthNightTexture() {
    const s = perfTier === 'low' ? 768 : 1024, c = document.createElement('canvas'); c.width = c.height = s;
    const x = c.getContext('2d');
    x.fillStyle = '#000'; x.fillRect(0, 0, s, s);
    const land = [[0.22, 0.38, 0.18, 0.32], [0.48, 0.52, 0.22, 0.42], [0.62, 0.78, 0.28, 0.55],
                  [0.12, 0.35, 0.55, 0.72], [0.55, 0.72, 0.58, 0.78]];
    land.forEach((r) => {
      for (let i = 0; i < 420; i++) {
        const px = (r[0] + Math.random() * (r[2] - r[0])) * s;
        const py = (r[1] + Math.random() * (r[3] - r[1])) * s;
        const a = Math.random() * 0.85 + 0.15;
        x.globalAlpha = a;
        x.fillStyle = Math.random() > 0.6 ? '#ffe8a0' : '#ffc860';
        x.beginPath(); x.arc(px, py, Math.random() * 1.6 + 0.3, 0, 7); x.fill();
      }
    });
    x.globalAlpha = 1;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  // radial-gradient sprite used for the sun's glow / corona (fake bloom)
  function makeGlowTexture(inner, outer) {
    const s = perfTier === 'high' ? 512 : 256, c = document.createElement('canvas'); c.width = c.height = s;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, inner); g.addColorStop(0.35, outer); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, s, s);
    return new THREE.CanvasTexture(c);
  }

  // ── Scene construction ─────────────────────────────────────────────────────
  function tuneTexture(t) {
    if (!t || !renderer) return;
    const max = renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 1;
    t.anisotropy = max;
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.magFilter = THREE.LinearFilter;
  }

  function loadTex(file, srgb) {
    return new Promise((res) => {
      texLoader.load(TEX + file, (t) => {
        if (srgb !== false) t.colorSpace = THREE.SRGBColorSpace;
        tuneTexture(t);
        res(t);
      }, undefined, () => res(null));
    });
  }

  function buildStars() {
    const N = PRM ? 900 : (perfTier === 'high' ? 3200 : perfTier === 'mid' ? 2600 : 1800);
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), sizes = new Float32Array(N);
    const starTemps = [[1.0, 0.95, 0.88], [0.88, 0.92, 1.0], [1.0, 0.82, 0.62], [0.95, 0.88, 1.0]];
    for (let i = 0; i < N; i++) {
      const r = 240 + Math.random() * 340;
      const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      pos[i * 3 + 1] = r * Math.cos(ph);
      pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
      const temp = starTemps[Math.floor(Math.random() * starTemps.length)];
      const w = 0.55 + Math.random() * 0.45;
      col[i * 3] = temp[0] * w; col[i * 3 + 1] = temp[1] * w; col[i * 3 + 2] = temp[2] * w;
      sizes[i] = Math.random() < 0.06 ? 2.4 + Math.random() * 1.6 : 0.7 + Math.random() * 1.1;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, vertexColors: true,
      uniforms: { uTime: { value: 0 }, uFade: { value: 1 } },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        uniform float uTime;
        void main() {
          vColor = color;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          float tw = 0.85 + 0.15 * sin(uTime * 0.0015 + position.x * 0.04);
          gl_PointSize = size * tw * (280.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        varying vec3 vColor;
        uniform float uFade;
        void main() {
          vec2 uv = gl_PointCoord - 0.5;
          float d = length(uv);
          if (d > 0.5) discard;
          float core = smoothstep(0.5, 0.0, d);
          float halo = smoothstep(0.5, 0.12, d) * 0.35;
          gl_FragColor = vec4(vColor * (core + halo), core * uFade);
        }`,
    });
    starField = new THREE.Points(g, m); scene.add(starField);
  }

  function buildSunCorona() {
    sunCoronaGroup = new THREE.Group();
    const rayCount = PRM ? 6 : 12;
    for (let i = 0; i < rayCount; i++) {
      const c = document.createElement('canvas'); c.width = 64; c.height = 256;
      const x = c.getContext('2d');
      const g = x.createLinearGradient(32, 200, 32, 0);
      g.addColorStop(0, 'rgba(255,200,80,0)');
      g.addColorStop(0.35, 'rgba(255,190,70,0.35)');
      g.addColorStop(1, 'rgba(255,240,200,0.85)');
      x.fillStyle = g; x.fillRect(14, 0, 36, 256);
      const tex = new THREE.CanvasTexture(c);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: tex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.55,
      }));
      const ang = (i / rayCount) * Math.PI * 2;
      sp.position.set(Math.cos(ang) * SUN_SIZE * 0.2, Math.sin(ang) * SUN_SIZE * 0.15, 0);
      sp.scale.set(SUN_SIZE * 1.8, SUN_SIZE * 5.5, 1);
      sp.material.rotation = ang + Math.PI / 2;  // Sprite billboards to camera; roll must be on the material, not Object3D.rotation
      sunCoronaGroup.add(sp);
    }
    sunMesh.add(sunCoronaGroup);
  }

  function buildSun() {
    sunMaterial = makeSunShaderMaterial();
    const sunSegs = perfTier === 'high' ? 96 : perfTier === 'mid' ? 72 : 48;
    sunMesh = new THREE.Mesh(new THREE.SphereGeometry(SUN_SIZE, sunSegs, sunSegs), sunMaterial);
    scene.add(sunMesh);
    buildSunCorona();
    const layers = [
      { tex: makeGlowTexture('rgba(255,245,200,0.95)', 'rgba(255,190,70,0.55)'), scale: SUN_SIZE * 6.5 },
      { tex: makeGlowTexture('rgba(255,210,120,0.50)', 'rgba(230,130,35,0.16)'), scale: SUN_SIZE * 13 },
      { tex: makeGlowTexture('rgba(255,160,50,0.18)', 'rgba(200,80,10,0.04)'), scale: SUN_SIZE * 22 },
    ];
    layers.forEach((l) => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: l.tex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
      sp.scale.set(l.scale, l.scale, 1); sunMesh.add(sp); sunGlow.push(sp);
    });
    const light = new THREE.PointLight(0xfff0d0, 4.2, 0, 0);
    sunMesh.add(light);
    sunDirLight = new THREE.DirectionalLight(0xfff4e0, perfTier === 'high' ? 3.0 : 2.5);
    sunDirLight.position.set(0, 0, 0);
    scene.add(sunDirLight);
    scene.add(new THREE.HemisphereLight(0x3a4a68, 0x0a0806, perfTier === 'high' ? 0.32 : 0.26));
    scene.add(new THREE.AmbientLight(0x1a2030, perfTier === 'high' ? 0.1 : 0.12));
  }

  // Real bloom replaces the outer fake corona; keep a subtle inner halo on all tiers.
  function tuneSunGlowForComposer(tier) {
    // With real bloom active, retire the god-ray corona entirely — the soft glow layers
    // + UnrealBloom carry the sun's light, and the discrete rays only read as a hard
    // 12-spoke artifact over the bloom. (On low/PRM tiers the corona stays, now rotated right.)
    if (sunCoronaGroup && composer) {
      sunCoronaGroup.children.forEach((sp) => { sp.visible = false; });
    }
    if (!sunGlow.length) return;
    sunGlow.forEach((sp, i) => {
      if (!composer) return;
      if (tier === 'high' && i >= 1) { sp.visible = false; return; }
      sp.visible = true;
      const op = tier === 'mid' ? (i === 0 ? 0.6 : i === 1 ? 0.3 : 0.15) : (i === 0 ? 0.4 : 0);
      if (sp.material) sp.material.opacity = op;
    });
  }

  function atmosphereMaterial(colorHex, intensity) {
    const col = new THREE.Color(colorHex);
    return new THREE.ShaderMaterial({
      uniforms: { uColor: { value: col }, uIntensity: { value: intensity || 1.0 } },
      vertexShader: `varying vec3 vN; varying vec3 vV; void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform vec3 uColor; uniform float uIntensity; varying vec3 vN; varying vec3 vV;
        void main(){
          float fresnel = pow(1.0 - max(dot(vN, vV), 0.0), 3.2);
          float rim = pow(max(dot(vN, vV), 0.0), 0.5) * 0.15;
          float a = clamp((fresnel + rim) * uIntensity, 0.0, 1.0);
          gl_FragColor = vec4(uColor * (0.6 + fresnel * 0.8), a * 0.85);
        }`,
      blending: THREE.AdditiveBlending, side: THREE.BackSide, transparent: true, depthWrite: false,
    });
  }

  // ── HD Earth surface shader injection (terminator-gated city lights, ocean
  //    gloss, terrain normals). All GLSL is plain string data passed to
  //    .replace() on byte-verified r160 #include tokens; a missed token is a
  //    silent no-op (degrade, never throw). Called inside a try/catch. ─────────
  function injectEarth(shader) {
    shader.uniforms.uSunDir      = earthUniforms.uSunDir;
    shader.uniforms.uNightInt    = earthUniforms.uNightInt;
    shader.uniforms.uTermSharp   = earthUniforms.uTermSharp;
    shader.uniforms.uHasLights   = earthUniforms.uHasLights;
    shader.uniforms.uCloudShadow = earthUniforms.uCloudShadow;
    shader.uniforms.uCloudTex    = earthUniforms.uCloudTex;
    if (earthMat) earthMat.userData.shader = shader;

    // (A) VERTEX — carry the OBJECT-space geometric normal (tilt/camera-independent terminator)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\n varying vec3 vObjNormalE;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n vObjNormalE = normalize( normal );');

    // (B) FRAGMENT — uniform + varying declarations
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>',
        '#include <common>\n uniform vec3 uSunDir;\n uniform float uNightInt;\n uniform float uTermSharp;\n uniform float uHasLights;\n uniform float uCloudShadow;\n uniform sampler2D uCloudTex;\n varying vec3 vObjNormalE;');

    // (C) OCEAN-ONLY GLOSS — invert white-ocean spec mask into low roughness
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <roughnessmap_fragment>',
        'float roughnessFactor = roughness;\n #ifdef USE_ROUGHNESSMAP\n   vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );\n   float oceanMask = texelRoughness.g;\n   roughnessFactor = mix( 0.92, 0.16, oceanMask );\n #endif');

    // (D) DAY MAP + optional high-tier cloud shadow on the surface
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <map_fragment>',
        '#include <map_fragment>\n #ifdef USE_MAP\n   if ( uCloudShadow > 0.5 ) {\n     float cl = texture2D( uCloudTex, vMapUv ).g;\n     diffuseColor.rgb *= ( 1.0 - cl * 0.32 );\n   }\n #endif');

    // (E) TERMINATOR-GATED REAL CITY LIGHTS + warm dusk band (overwrite, never bleed onto day side)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <emissivemap_fragment>',
        '#ifdef USE_EMISSIVEMAP\n   vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );\n   float ndl = dot( normalize( vObjNormalE ), normalize( uSunDir ) );\n   float dayness = clamp( ndl * uTermSharp * 0.5 + 0.5, 0.0, 1.0 );\n   float nightMask = 1.0 - dayness;\n   vec3 cityCol = emissiveColor.rgb * vec3( 1.0, 0.90, 0.66 );\n   float duskBand = pow( clamp( 1.0 - abs( ndl ), 0.0, 1.0 ), 6.0 ) * smoothstep( -0.05, 0.30, ndl );\n   totalEmissiveRadiance = cityCol * nightMask * uNightInt * uHasLights + vec3( 0.55, 0.22, 0.08 ) * duskBand * 0.30;\n #endif');
  }

  // Dedicated Earth atmosphere: cyan-blue Rayleigh day-limb + terminator sunset band.
  // Uses WORLD-space sun dir + world normal (the shell shares the group tilt but does
  // NOT spin with the textured surface, so object-space would swim).
  function earthAtmosphereMaterial() {
    return new THREE.ShaderMaterial({
      uniforms: {
        uSunDir: earthUniforms.uSunDirWorld,            // shared world-space dir (by reference)
        uCamPos: { value: new THREE.Vector3() },
        uIntensity: { value: composer ? 0.5 : 0.8 }, // kept low so the rim stays a thin glow, not a bloomed halo
      },
      vertexShader: 'varying vec3 vWN; varying vec3 vWP;\n void main(){ vec4 wp = modelMatrix * vec4(position,1.0); vWP = wp.xyz; vWN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * wp; }',
      fragmentShader: 'uniform vec3 uSunDir; uniform vec3 uCamPos; uniform float uIntensity; varying vec3 vWN; varying vec3 vWP;\n void main(){\n   vec3 V = normalize(uCamPos - vWP);\n   vec3 N = normalize(vWN);\n   float fres = pow(1.0 - max(dot(N,V),0.0), 4.5);\n   float ndl = dot(N, normalize(uSunDir));\n   float dayMask = smoothstep(-0.2, 0.4, ndl);\n   float band = smoothstep(0.0, 0.3, 1.0 - abs(ndl));\n   vec3 rayleigh = vec3(0.20, 0.42, 0.9);\n   vec3 sunset   = vec3(0.9, 0.42, 0.16);\n   vec3 col = mix(rayleigh, sunset, band * 0.55);\n   float a = clamp(fres * dayMask * uIntensity, 0.0, 1.0);\n   gl_FragColor = vec4(col * (0.35 + fres * 0.4), a * 0.7);\n }',
      blending: THREE.AdditiveBlending, side: THREE.BackSide, transparent: true, depthWrite: false,
    });
  }

  function buildPlanets() {
    BODIES.forEach((b) => {
      const group = new THREE.Group();
      const vis = PLANET_VIS[b.id] || { roughness: 0.9, metalness: 0, atmo: null, atmoS: 1.0 };
      let mat;
      if (b.hero) {
        // HD Earth: single MeshStandardMaterial patched via onBeforeCompile (day map +
        // ocean gloss + terrain normal + terminator-gated city lights). emissive must be
        // a non-black carrier (emissiveMap multiplies) — the injected GLSL overwrites
        // totalEmissiveRadiance so the white never reaches the day side.
        mat = new THREE.MeshStandardMaterial({
          color: 0x14202c, roughness: 0.92, metalness: 0.0,
          emissive: 0xffffff, emissiveIntensity: 1.0, envMapIntensity: 0.30,
        });
        mat.onBeforeCompile = (shader) => { try { injectEarth(shader); } catch (e) { console.warn('[orrery] earth shader patch skipped', e); } };
        earthMat = mat;
        earthUniforms.uNightInt.value = perfTier === 'low' ? 1.85 : perfTier === 'mid' ? 1.45 : 1.6;
      } else {
        const clearcoat = (b.id === 'jupiter' || b.id === 'saturn' ? 0.22 : b.id === 'venus' ? 0.18 : 0);
        mat = new THREE.MeshPhysicalMaterial({
          color: b.color, roughness: vis.roughness, metalness: vis.metalness,
          clearcoat, clearcoatRoughness: 0.42,
          emissive: 0x000000, emissiveIntensity: 0,
          envMapIntensity: 0.18,
        });
      }
      const segs = sphereSegs(b.hero);
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(b.size, segs, segs), mat);
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
      // (hero Earth has its own priority-ordered HD swap-in in the b.hero block below)
      if (!b.hero) loadTex(b.tex).then((t) => { if (t) { mat.map = t; mat.color.set(0xffffff); mat.needsUpdate = true; } });

      if (vis.atmo) {
        let atmoMat;
        if (b.hero && perfTier !== 'low' && !PRM) {
          atmoMat = earthAtmosphereMaterial();
          earthAtmoMat = atmoMat;
        } else {
          atmoMat = atmosphereMaterial(vis.atmo, b.hero ? 1.35 : 0.85);
        }
        const atmo = new THREE.Mesh(new THREE.SphereGeometry(b.size * vis.atmoS, segs, segs), atmoMat);
        group.add(atmo);
      }

      if (b.hero) {
        // ── HD Earth texture swap-in: perceived-quality order, each guarded ──
        loadTex('earth.jpg').then((t) => { if (t && earthMat) { earthMat.map = t; earthMat.color.set(0xffffff); earthMat.needsUpdate = true; } });
        loadTex('earth_lights.png').then((t) => { if (t && earthMat) { earthMat.emissiveMap = t; earthUniforms.uHasLights.value = 1.0; earthMat.needsUpdate = true; } });
        loadTex('earth_specular.jpg', false).then((t) => { if (t && earthMat) { earthMat.roughnessMap = t; earthMat.needsUpdate = true; } });
        if (perfTier !== 'low' && !PRM) {
          loadTex('earth_normal.jpg', false).then((t) => { if (t && earthMat) { earthMat.normalMap = t; const ns = perfTier === 'high' ? 0.7 : 0.5; earthMat.normalScale = new THREE.Vector2(ns, ns); earthMat.needsUpdate = true; } });
        }
        // Clouds (high/mid only): a sun-LIT sphere so the night hemisphere self-darkens
        // instead of glowing white over the city lights.
        if (perfTier !== 'low' && !PRM) {
          earthCloud = new THREE.Mesh(
            new THREE.SphereGeometry(b.size * 1.015, segs, segs),
            new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.0, depthWrite: false, roughness: 1.0, metalness: 0.0 })
          );
          if (perfTier === 'high') {
            earthCloud.material.onBeforeCompile = (sh) => { try {
              sh.vertexShader = sh.vertexShader
                .replace('#include <common>', '#include <common>\n varying vec3 vCN; varying vec3 vCV;')
                .replace('#include <begin_vertex>', '#include <begin_vertex>\n vec4 _cmv = modelViewMatrix * vec4(position,1.0);\n vCN = normalize(normalMatrix * normal);\n vCV = normalize(-_cmv.xyz);');
              sh.fragmentShader = sh.fragmentShader
                .replace('#include <common>', '#include <common>\n varying vec3 vCN; varying vec3 vCV;')
                .replace('#include <opaque_fragment>', '#include <opaque_fragment>\n {\n   float fres = pow(1.0 - max(dot(normalize(vCN), normalize(vCV)), 0.0), 3.0);\n   gl_FragColor.a *= (0.85 + 0.5 * fres);\n   gl_FragColor.rgb += vec3(0.12) * fres;\n }');
            } catch (e) { console.warn('[orrery] cloud patch skipped', e); } };
          }
          group.add(earthCloud);
          loadTex('earth_clouds.jpg', false).then((t) => { if (t && earthCloud) { const m = earthCloud.material; m.alphaMap = t; m.map = t; m.opacity = 0.9; m.needsUpdate = true;
            if (perfTier === 'high') { earthUniforms.uCloudTex.value = t; earthUniforms.uCloudShadow.value = 1.0; if (earthMat) earthMat.needsUpdate = true; }
          } });
        } else { earthCloud = null; }
        // Moon
        moonGroup = new THREE.Group(); scene.add(moonGroup);
        const moonSegs = perfTier === 'high' ? 56 : perfTier === 'mid' ? 40 : 28;
        moonMesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.23, moonSegs, moonSegs),
          new THREE.MeshPhysicalMaterial({ color: 0xbfc2cc, roughness: 0.96, metalness: 0, clearcoat: 0.04, clearcoatRoughness: 0.6 })
        );
        moonGroup.add(moonMesh);
        loadTex('moon.jpg').then((t) => { if (t) { moonMesh.material.map = t; moonMesh.material.color.set(0xffffff); moonMesh.material.needsUpdate = true; } });
      }

      if (b.ring) {
        const inner = b.size * 1.35, outer = b.size * 2.35;
        const ringSegs = perfTier === 'high' ? 160 : perfTier === 'mid' ? 128 : 96;
        const ringGeo = new THREE.RingGeometry(inner, outer, ringSegs, 1);
        // remap UVs so the texture strip maps across the ring radius
        const pos = ringGeo.attributes.position, uv = ringGeo.attributes.uv, v3 = new THREE.Vector3();
        for (let i = 0; i < pos.count; i++) {
          v3.fromBufferAttribute(pos, i);
          const rr = (v3.length() - inner) / (outer - inner);
          uv.setXY(i, rr, 0.5);
        }
        const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({
          side: THREE.DoubleSide, transparent: true, opacity: 0.92, depthWrite: false,
          color: 0xf0e0c8, blending: THREE.NormalBlending,
        }));
        ring.rotation.x = Math.PI / 2; // lay flat, then group tilt gives the iconic angle
        group.add(ring);
        if (b.id === 'saturn') {
          saturnRingMesh = ring;
          saturnShadowBand = new THREE.Mesh(
            new THREE.PlaneGeometry(b.size * 1.6, b.size * 0.28),
            new THREE.MeshBasicMaterial({
              color: 0x0a0806, transparent: true, opacity: 0.42, depthWrite: false, side: THREE.DoubleSide,
            })
          );
          group.add(saturnShadowBand);
        }
        loadTex(b.ring).then((t) => { if (t) { ring.material.map = t; ring.material.needsUpdate = true; } });
      }

      // orbit ring line
      const oGeo = new THREE.BufferGeometry();
      const orbitSegs = 160, arr = new Float32Array((orbitSegs + 1) * 3);
      for (let i = 0; i <= orbitSegs; i++) {
        const a = (i / orbitSegs) * Math.PI * 2;
        arr[i * 3] = Math.cos(a) * b.R; arr[i * 3 + 1] = 0; arr[i * 3 + 2] = -Math.sin(a) * b.R;
      }
      oGeo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
      const oLine = new THREE.Line(oGeo, new THREE.LineBasicMaterial({
        color: b.hero ? 0xc9a227 : 0x8a7030, transparent: true, opacity: b.hero ? 0.42 : 0.14,
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
    const jd = baseJd + dayOffset + scrollBias;
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
    updateHalley(jd);
    updateEclipseDim(jd);
    updateSaturnShadow(jd);
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
    if (window.__orreryPreloaderOwns) inView = true;
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
        const jd = baseJd + dayOffset + scrollBias;
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

    // sun surface animation + corona drift
    if (sunMaterial && sunMaterial.uniforms) sunMaterial.uniforms.uTime.value = t * 0.001;
    if (starField && starField.material.uniforms) starField.material.uniforms.uTime.value = t;
    if (sunDirLight && sunMesh) sunDirLight.position.copy(sunMesh.position);

    // HD Earth: feed the sun direction to the surface shader (OBJECT-space, so the
    // terminator + city lights track the sun as the globe spins) and to the atmosphere
    // (WORLD-space, shell doesn't spin). Guarded; pure vector math, cannot throw.
    if (earthMat && earthMat.userData.shader && sunMesh && meshes.earth) {
      const em = meshes.earth.userData.mesh;
      em.updateWorldMatrix(true, false);
      _earthWorld.setFromMatrixPosition(em.matrixWorld);
      _sunWorld.copy(sunMesh.position).sub(_earthWorld).normalize();
      earthUniforms.uSunDirWorld.value.copy(_sunWorld);
      _earthInv.setFromMatrix4(em.matrixWorld).invert();
      earthUniforms.uSunDir.value.copy(_sunWorld).applyMatrix3(_earthInv).normalize();
    }
    if (earthAtmoMat) earthAtmoMat.uniforms.uCamPos.value.copy(camera.position);

    if (sunCoronaGroup && !PRM) sunCoronaGroup.rotation.z += dt * 0.06;

    if (milkyWayDisk && milkyWayDisk.visible && !PRM) milkyWayDisk.rotation.y += dt * 0.004;
    if (oortShell && oortShell.visible && !PRM) oortShell.rotation.y += dt * 0.003;
    if (cosmicField && cosmicField.visible && !PRM) {
      cosmicField.children.forEach((ch) => {
        if (ch.userData && ch.userData.drift) ch.material.rotation += ch.userData.drift;
      });
    }

    // intro spin: keep Earth + clouds turning during the held close-up so cities
    // ignite across the dusk line (the hook). ~2x normal so motion reads in 7.2s.
    if (introActive && !PRM && meshes.earth) {
      meshes.earth.userData.mesh.rotation.y += 0.55 * dt * 0.5;
      if (earthCloud) earthCloud.rotation.y += 0.55 * dt * 0.62;
    }

    // self-rotation (liveliness)
    if (!PRM && scaleLevel <= 2 && !introActive) {
      BODIES.forEach((b) => { meshes[b.id].userData.mesh.rotation.y += b.spin * dt * 0.25; });
      if (earthCloud) earthCloud.rotation.y += 0.55 * dt * 0.32;
      if (sunMesh) sunMesh.rotation.y += 0.04 * dt;
    }

    // scale-level camera transition (zoom dial)
    if (scaleAnimActive) {
      const p = Math.min(1, (t - scaleAnimStart) / SCALE_ANIM_MS), e = easeInOut(p);
      camRadius = scaleAnimFrom.radius + (scaleAnimTo.radius - scaleAnimFrom.radius) * e;
      camEl = scaleAnimFrom.el + (scaleAnimTo.el - scaleAnimFrom.el) * e;
      camAz = scaleAnimFrom.az + (scaleAnimTo.az - scaleAnimFrom.az) * e;
      camTarget.set(
        scaleAnimFrom.tx + (scaleAnimTo.tx - scaleAnimFrom.tx) * e,
        scaleAnimFrom.ty + (scaleAnimTo.ty - scaleAnimFrom.ty) * e,
        scaleAnimFrom.tz + (scaleAnimTo.tz - scaleAnimFrom.tz) * e
      );
      if (p >= 1) scaleAnimActive = false;
    } else if (scalePreset(scaleLevel).targetEarth && !introActive) {
      earthTargetVec(camTarget);
    }

    // intro: held Earth close-up on the terminator → Earth+Moon → full system (Earth-FIRST)
    if (introActive) {
      if (!meshes.earth) { introActive = false; }
      else {
        const p = Math.min(1, (t - introStart) / INTRO_MS);
        const earthPos = meshes.earth.position;
        const end = scalePreset(2);
        const baseAz = Math.atan2(earthPos.z, earthPos.x) * -1 - 0.15;
        if (p < 0.18) {                          // STAGE 0 — held close-up on the terminator
          camTarget.copy(earthPos); camRadius = 2.35; camEl = 4 * D2R; camAz = baseAz;
        } else if (p < 0.55) {                   // STAGE 1 — Earth → Earth + Moon
          const e = easeInOut((p - 0.18) / 0.37);
          camTarget.copy(earthPos);
          camRadius = 2.35 + (6.5 - 2.35) * e;
          camEl = (4 * D2R) + (12 * D2R - 4 * D2R) * e;
          camAz = baseAz;
        } else {                                 // STAGE 2 — Earth + Moon → full system
          const e = easeInOut((p - 0.55) / 0.45);
          camTarget.lerpVectors(earthPos, ORIGIN, e);
          camRadius = 6.5 + (end.camRadius - 6.5) * e;
          camEl = (12 * D2R) + (end.camEl - 12 * D2R) * e;
          camAz = baseAz * (1 - e) + end.camAz * e;
        }
        if (p >= 1) {
          introActive = false;
          scaleLevel = 2;
          userTouched = performance.now();
          updateScaleHUD();
          updateScaleVisuals(scaleLevel);
          if (onIntroDone) { const f = onIntroDone; onIntroDone = null; f(); }
        }
      }
    } else if (!dragging && !scaleAnimActive && !PRM && (t - userTouched) > 1200) {
      camAz += 0.05 * dt; // gentle auto-orbit kicks in fast so the model is never visually frozen
    }
    if (!introActive && !scaleAnimActive) clampCamToLevel();
    applyEclipseVisuals();
    applyCamera();

    // slow asteroid belt drift
    if (asteroidPoints && showAsteroids && !PRM) {
      asteroidPoints.rotation.y += dt * 0.012;
    }

    // labels follow planets, scale with distance, face camera
    BODIES.forEach((b) => {
      const lab = labels[b.id]; if (!lab) return;
      lab.visible = showLabels && !introActive && scaleLevel <= 2;
      if (lab.visible) {
        const m = meshes[b.id];
        lab.position.set(m.position.x, m.position.y + b.size + 0.9, m.position.z);
        const d = camera.position.distanceTo(lab.position);
        const s = Math.max(0.04, d * 0.018);
        lab.scale.set(s * lab.userData.aspect, s, 1);
      }
    });
    orbitLines.forEach((o) => { o.visible = showOrbits && scaleLevel <= 3; });

    if (composer) { composer.render(); } else { renderer.render(scene, camera); }
  }

  // ── UI date readout (mirrors canvas behaviour) ─────────────────────────────
  function updateDateUI() {
    const el = document.getElementById('orrery-date-display'); if (!el) return;
    const d = new Date(baseNowMs + (dayOffset + scrollBias) * 86400000);
    const str = d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    const tag = Math.abs(dayOffset + scrollBias) < 0.5 ? ' · now' : ((dayOffset + scrollBias) > 0 ? ` · +${Math.round(dayOffset + scrollBias)}d` : ` · ${Math.round(dayOffset + scrollBias)}d`);
    el.textContent = str + tag;

    try {
      const E = window.AstroEphemeris;
      const jd = baseJd + dayOffset + scrollBias;
      const sunLon = E.sunPosition(jd).lon;
      const moonLon = E.moonPosition(jd).lon;
      const phase = ((moonLon - sunLon) % 360 + 360) % 360;
      const PHASES = [
        [0,   'New Moon'],
        [45,  'Waxing Crescent'],
        [90,  'First Quarter'],
        [135, 'Waxing Gibbous'],
        [180, 'Full Moon'],
        [225, 'Waning Gibbous'],
        [270, 'Last Quarter'],
        [315, 'Waning Crescent'],
        [360, 'New Moon'],
      ];
      const phaseLabel = PHASES.find((_, i) => phase < PHASES[i + 1][0])?.[1] || 'New Moon';
      const moonEl = document.getElementById('orrery-moon-phase');
      if (moonEl) moonEl.textContent = phaseLabel;
    } catch (e) { /* moon phase is optional */ }
  }

  // ── Sizing / observers ─────────────────────────────────────────────────────
  function resize() {
    if (!renderer || !canvas) return;
    const w = canvas.clientWidth || 560;
    const h = canvas.clientHeight || w;
    const dpr = orreryDPR();
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    if (composer) composer.setSize(w, h);
    if (bloomPass) bloomPass.resolution.set(w, h);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }

  function forceResize() {
    resize();
    if (renderer && scene && camera) {
      applyCamera();
      if (composer) composer.render();
      else renderer.render(scene, camera);
    }
  }

  function refreshTextures() {
    if (!texLoader || !renderer) return;
    BODIES.forEach((b) => {
      const g = meshes[b.id];
      if (!g || !g.userData.mesh) return;
      const mat = g.userData.mesh.material;
      if (!mat) return;
      if (mat.map && mat.map.image) {
        tuneTexture(mat.map);
        mat.map.needsUpdate = true;
        mat.needsUpdate = true;
      } else if (b.tex) {
        loadTex(b.tex).then((t) => {
          if (t && mat) { mat.map = t; mat.color.set(0xffffff); mat.needsUpdate = true; }
        });
      }
    });
    if (moonMesh && moonMesh.material) {
      const mm = moonMesh.material;
      if (mm.map && mm.map.image) { tuneTexture(mm.map); mm.map.needsUpdate = true; mm.needsUpdate = true; }
      else loadTex('moon.jpg').then((t) => { if (t && mm) { mm.map = t; mm.color.set(0xffffff); mm.needsUpdate = true; } });
    }
    if (earthCloud && earthCloud.material && earthCloud.material.alphaMap) {
      earthCloud.material.alphaMap.needsUpdate = true;
      earthCloud.material.needsUpdate = true;
    }
  }

  // ── Pointer controls ───────────────────────────────────────────────────────
  function bindControls() {
    const onDown = (e) => { dragging = true; scrollDriveLocked = true; const p = pt(e); lastX = downX = p.x; lastY = downY = p.y; userTouched = performance.now(); introActive = false; daysPerSec = 0; flicking = false; scrubVel = 0; try { canvas.style.cursor = 'grabbing'; } catch (_) {} };
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
    const onWheel = (e) => {
      e.preventDefault();
      const p = scalePreset(scaleLevel);
      camRadius = Math.max(p.camMin, Math.min(p.camMax, camRadius * (1 + Math.sign(e.deltaY) * 0.08)));
      userTouched = performance.now();
      introActive = false;
      scaleAnimActive = false;
    };
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
    const jd = baseJd + dayOffset + scrollBias;
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
  let webglBooted = false;
  function _initWebGL(canvasEl) {
    if (!canvasEl) return;
    if (webglBooted && canvas === canvasEl) return;
    if (!window.AstroEphemeris) throw new Error('AstroEphemeris not loaded');
    canvas = canvasEl; wrap = canvas.parentElement;

    perfTier = getPerfTier();

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = perfTier === 'high' ? 1.08 : 1.02;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, 1, 0.05, 8000);
    texLoader = new THREE.TextureLoader();

    // Bloom composer — tiered via RafCore (low/PRM = off, mid = light, high = full)
    if (!PRM && perfTier !== 'low') {
      try {
        composer = new EffectComposer(renderer);
        composer.addPass(new RenderPass(scene, camera));
        const bloomStrength = perfTier === 'mid' ? 0.2 : 0.3;
        const bloomRadius = perfTier === 'mid' ? 0.36 : 0.44;
        const bloomThreshold = perfTier === 'mid' ? 0.93 : 0.9;
        bloomPass = new UnrealBloomPass(
          new THREE.Vector2(renderer.domElement.width, renderer.domElement.height),
          bloomStrength, bloomRadius, bloomThreshold
        );
        composer.addPass(bloomPass);
        composer.addPass(new OutputPass());
      } catch (e) {
        composer = null;
        console.warn('[orrery] post-processing unavailable:', e.message);
      }
    }

    const now = new Date();
    baseNowMs = now.getTime();
    baseJd = window.AstroEphemeris.julianDay(now.getFullYear(), now.getMonth() + 1, now.getDate(), now.getHours(), now.getMinutes(), 0);

    buildStars(); buildSun(); buildPlanets();
    buildAsteroids();
    // buildHalley();  // retired — the illustrative comet + its blue dashed orbit were
    //                    cool-blue clutter (off the warm palette). halleyGroup stays null;
    //                    updateHalley() and all visibility paths are null-guarded.
    buildGalaxyLayers();
    tuneSunGlowForComposer(perfTier);
    updatePositions();
    const preloaderMode = !!window.__orreryPreloaderOwns;
    if (preloaderMode) {
      scaleLevel = 0;
      introActive = false;
      updateScaleVisuals(0);
      earthTargetVec(camTarget);
      camRadius = 2.35;
      camEl = 4 * D2R;
      camAz = -0.6;
      scaleAnimActive = false;
      applyCamera();
    } else {
      scaleLevel = 2;
      applyScalePreset(2, false);
    }
    resize();
    preloadTextures();

    if (PRM) {
      introActive = false;
      camTarget.set(0, 0, 0);
      camRadius = 48;
      camEl = 26 * D2R;
      camAz = -0.6;
      applyCamera();
    }

    bindControls();
    if ('ResizeObserver' in window) { const ro = new ResizeObserver(resize); ro.observe(canvas); canvas._orreryRO = ro; }
    window.addEventListener('resize', resize);
    if ('IntersectionObserver' in window && !window.__orreryPreloaderOwns) {
      const io = new IntersectionObserver((ents) => { inView = ents[0].isIntersecting; }, { threshold: 0.01 });
      io.observe(canvas); canvas._orreryIO = io;
    } else {
      inView = true;
    }
    document.addEventListener('visibilitychange', () => { running = !document.hidden; });

    // Pre-compile shaders + warm the bloom composer NOW (while the preloader is still
    // static) so the first animated intro frame doesn't hitch on a heavy program link.
    try {
      if (renderer.compile) renderer.compile(scene, camera);
      if (composer) composer.render(); else renderer.render(scene, camera);
    } catch (e) { /* pre-warm is best-effort */ }

    lastT = 0; raf = requestAnimationFrame(frame);
    webglBooted = true;
  }

  function setSpeed(s) {
    // button values: 0 pause, 1 (1 day/s), 30 (30 day/s), 365 (~1 year/s)
    daysPerSec = Number(s) || 0;
    flicking = false;   // a speed button is a constant rate, not a decaying flick
    if (daysPerSec !== 0) { introActive = false; scrollDriveLocked = true; }
  }
  function getDate() { return new Date(baseNowMs + dayOffset * 86400000); }
  function setDate(date) {
    const E = window.AstroEphemeris;
    const jd = E.julianDay(date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes(), 0);
    jumpTo(jd);
    // "Now" reset passes real-time date — unlock scroll drive when within ~12h of live
    const nowJd = E.julianDay(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate(), new Date().getHours(), new Date().getMinutes(), 0);
    if (Math.abs(jd - nowJd) < 0.5) scrollDriveLocked = false;
  }
  function jumpTo(jd) { dayOffset = jd - baseJd; daysPerSec = 0; flicking = false; needRecompute = true; introActive = false; scrollDriveLocked = true; }
  function scrubDays(d) { dayOffset += Number(d) || 0; daysPerSec = 0; flicking = false; needRecompute = true; introActive = false; scrollDriveLocked = true; }
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
    setShowOrbits(b) { showOrbits = !!b; updateScaleVisuals(scaleLevel); },
    setShowLabels(b) { showLabels = !!b; updateScaleVisuals(scaleLevel); },
    setShowAsteroids(b) { showAsteroids = !!b; updateScaleVisuals(scaleLevel); },
    get onPlanetClick() { return onPlanetClick; },
    set onPlanetClick(fn) { onPlanetClick = fn; },
    startIntro: restartIntro,
    restartIntro,
    settleFromIntro,
    isIntroActive() { return introActive; },
    whenReady() { return texturesReady ? Promise.resolve() : texturesReadyPromise; },
    getScaleLevel() { return scaleLevel; },
    setScaleLevel(n) { applyScalePreset(n, true); },
    set onIntroDone(fn) { onIntroDone = fn; if (PRM && fn && !introActive) { onIntroDone = null; fn(); } },
    get onIntroDone() { return onIntroDone; },
    setScrollDrive(progress) {
      if (PRM || scrollDriveLocked) return;
      // scroll = time only; zoom dial owns camera space
      scrollBias = progress * 120;
      needRecompute = true;
    },
    resetScrollDrive() {
      scrollBias = 0;
      scrollDriveLocked = false;
      needRecompute = true;
    },
    forceResize,
    refreshTextures,
    captureFrame(opts) {
      if (!renderer || !canvas) return null;
      opts = opts || {};
      const mult = opts.scale || 2;
      const cssW = canvas.clientWidth || 560;
      const cssH = canvas.clientHeight || cssW;
      const exportDpr = Math.min(orreryDPR() * mult, 3);
      try {
        renderer.setPixelRatio(exportDpr);
        renderer.setSize(cssW, cssH, false);
        if (composer) composer.setSize(cssW, cssH);
        applyCamera();
        if (composer) composer.render();
        else renderer.render(scene, camera);
        const off = document.createElement('canvas');
        off.width = Math.round(cssW * exportDpr);
        off.height = Math.round(cssH * exportDpr);
        const octx = off.getContext('2d');
        octx.drawImage(canvas, 0, 0, off.width, off.height);
        return off;
      } finally {
        resize();
      }
    },
    isWebGL: true,
  };
})();
