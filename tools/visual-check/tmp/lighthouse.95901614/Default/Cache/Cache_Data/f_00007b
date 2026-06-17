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
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const RadialBlurShader = {
  name: 'RadialBlurShader',
  uniforms: {
    tDiffuse: { value: null },
    uStrength: { value: 0 },
    uAspect: { value: 1 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: `
    precision highp float;
    uniform sampler2D tDiffuse;
    uniform float uStrength;
    uniform float uAspect;
    varying vec2 vUv;
    void main() {
      vec2 uv = vUv;
      vec2 c = uv - vec2(0.5, 0.46);
      c.x *= uAspect;
      float blurAmt = smoothstep(0.16, 0.58, length(c)) * uStrength;
      if (blurAmt < 0.002) {
        gl_FragColor = texture2D(tDiffuse, uv);
      } else {
        vec4 acc = vec4(0.0);
        float wsum = 0.0;
        vec2 dir = length(c) > 0.001 ? normalize(c) : vec2(0.0, 1.0);
        for (int i = -6; i <= 6; i++) {
          float fi = float(i);
          vec2 off = dir * fi * 0.0026 * blurAmt;
          float w = 1.0 - abs(fi) / 7.0;
          acc += texture2D(tDiffuse, uv + off) * w;
          wsum += w;
        }
        gl_FragColor = acc / max(wsum, 0.0001);
      }
    }`,
};

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
  // Gas giants: tiny atmo shells + low atmoI — large additive shells read as ugly "rings".
  const PLANET_VIS = {
    mercury: { roughness: 0.90, metalness: 0.08, atmo: null, atmoS: 1.0, atmoI: 0 },
    venus:   { roughness: 0.80, metalness: 0.0,  atmo: 0xffc878, atmoS: 1.038, atmoI: 0.44 },
    earth:   { roughness: 0.76, metalness: 0.04, atmo: 0x3d8fff, atmoS: 1.018, atmoI: 1.0 },
    mars:    { roughness: 0.86, metalness: 0.0,  atmo: 0xff5533, atmoS: 1.032, atmoI: 0.36 },
    jupiter: { roughness: 0.58, metalness: 0.0,  atmo: 0xe0a858, atmoS: 1.018, atmoI: 0.26 },
    saturn:  { roughness: 0.62, metalness: 0.0,  atmo: 0xf0d8a0, atmoS: 1.014, atmoI: 0.20 },
    uranus:  { roughness: 0.76, metalness: 0.0,  atmo: null, atmoS: 1.0, atmoI: 0 },
    neptune: { roughness: 0.74, metalness: 0.0,  atmo: null, atmoS: 1.0, atmoI: 0 },
  };

  // ── Module state ───────────────────────────────────────────────────────────
  let renderer, scene, camera, canvas, wrap;
  let raf = null, destroyed = false, running = true, inView = true;
  let preloaderFrameTick = 0;
  let texLoader;
  const meshes = {};          // id → THREE.Object3D (planet group)
  let earthCloud = null, moonGroup = null, moonMesh = null, sunMesh = null, sunGlow = [];
  const orbitLines = [];
  const labels = {};
  let starField = null;
  let sunMaterial = null, sunCoronaGroup = null, sunCoronaMesh = null, sunCoronaMat = null;
  let sunPromGroup = null, sunDirLight = null, sunDirLightTarget = null, hemiLight = null;

  let composer = null;
  let bloomPass = null;
  let radialBlurPass = null;
  let perfTier = 'high';
  let allPlanetsBuilt = false;
  let sunVisualsMinimal = false;
  let focusPlanetId = null;
  let focusPlanetUntil = 0;
  let focusBloomBase = 0.2;
  let sunFocusRing = null;
  let moonFocusRing = null;
  let focusOrbitsRestore = null;

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
    const pre = onPreloaderStage();
    const cap = pre
      ? (perfTier === 'low' ? 1 : perfTier === 'mid' ? 1.1 : 1.25)
      : (perfTier === 'low' ? 1.25 : perfTier === 'mid' ? 2 : 2.5);
    if (window.RafCore && window.RafCore.hdDPR) return window.RafCore.hdDPR(cap);
    const real = window.devicePixelRatio || 1;
    return Math.min(real, cap);
  }

  function sphereSegs(hero) {
    if (hero) {
      if (onPreloaderStage()) return perfTier === 'high' ? 80 : perfTier === 'mid' ? 64 : 48;
      return perfTier === 'high' ? 144 : perfTier === 'mid' ? 104 : 64;
    }
    if (onPreloaderStage()) return perfTier === 'high' ? 48 : 36;
    return perfTier === 'high' ? 80 : perfTier === 'mid' ? 64 : 40;
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
  let introBeginTimer = null;
  let onIntroDone = null;
  let preloaderIntroScheduled = false;
  let preloaderIntroFinished = false;
  let preloaderIntroWatchdog = null;
  let introStartedAt = 0;
  const INTRO_MS = 6800;
  const PRELOADER_INTRO_MS = 7500;
  const PRELOADER_SYSTEM_CAM_DESKTOP = 34;
  const PRELOADER_SYSTEM_CAM_MOBILE = 22;
  const PRELOADER_HOLD_SCALE_DESKTOP = 2;
  const PRELOADER_HOLD_SCALE_MOBILE = 1;

  function isPreloaderMobile() {
    try { return window.matchMedia('(max-width: 768px)').matches; } catch (e) { return false; }
  }

  function preloaderSystemCamRadius() {
    return isPreloaderMobile() ? PRELOADER_SYSTEM_CAM_MOBILE : PRELOADER_SYSTEM_CAM_DESKTOP;
  }

  function preloaderHoldScaleLevel() {
    return isPreloaderMobile() ? PRELOADER_HOLD_SCALE_MOBILE : PRELOADER_HOLD_SCALE_DESKTOP;
  }

  function introDurationMs() {
    return onPreloaderStage() ? PRELOADER_INTRO_MS : INTRO_MS;
  }

  function syncPreloaderIntroClass(active) {
    if (!window.__orreryPreloaderOwns || window.__apHeroEntered) return;
    try {
      document.body.classList.toggle('preloader-intro-playing', !!active);
    } catch (_) {}
  }

  function syncHeroReplayClass(active) {
    if (onPreloaderStage()) return;
    try {
      document.body.classList.toggle('orrery-replay-active', !!active);
      const vp = document.getElementById('orrery-viewport');
      if (vp) vp.classList.toggle('orrery-viewport--replay', !!active);
    } catch (_) {}
  }

  function syncPreloaderSystemClass(active) {
    if (!window.__orreryPreloaderOwns || window.__apHeroEntered) return;
    try {
      const pre = document.getElementById('preloader');
      if (pre) pre.classList.toggle('preloader--system-view', !!active);
    } catch (_) {}
  }
  const CAM_FOV_CLOSE = 33;
  const CAM_FOV_MID = 38;
  const CAM_FOV_WIDE = 45;
  let texturesReady = false;
  let texturesReadyResolve = null;
  const texturesReadyPromise = new Promise((res) => { texturesReadyResolve = res; });
  let earthMapReady = false;
  let earthMapReadyResolve = null;
  const earthMapReadyPromise = new Promise((res) => { earthMapReadyResolve = res; });

  function markEarthMapReady() {
    if (earthMapReady) return;
    earthMapReady = true;
    if (earthMapReadyResolve) { earthMapReadyResolve(); earthMapReadyResolve = null; }
  }

  // layer toggles (mirror canvas API)
  let showOrbits = false, showLabels = false, showAsteroids = false;
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
  const SCALE_ANIM_MS = 1400;
  const JOURNEY_HOLD_MS = 2800;
  let scaleAnimFromLevel = 2;
  let scaleAnimToLevel = 2;
  let journeyActive = false;
  let journeySteps = [];
  let journeyTarget = 2;
  let journeyHoldTimer = null;

  // asteroid belt + Halley comet
  let asteroidPoints = null;
  let halleyGroup = null, halleyOrbit = null, halleyTail = null;
  let saturnRingMesh = null, saturnShadowBand = null;
  let retroTick = 0;
  let eclipseDim = 0; // 0 = none, 1 = full eclipse dimming

  // Phase 3 galaxy layers (L3–L6)
  let galaxyGroup = null;
  let oortShell = null, localStarsGroup = null, catalogStarsGroup = null, milkyWayDisk = null, cosmicField = null;
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
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  const _projLabel = new THREE.Vector3();
  let domLabelLayer = null;
  const domLabelEls = {};
  let useDomLabels = false;

  function scalePreset(n) { return SCALE_LEVELS[Math.max(0, Math.min(6, n | 0))] || SCALE_LEVELS[0]; }

  function earthTargetVec(out) {
    if (meshes.earth) return out.copy(meshes.earth.position);
    return out.set(0, 0, 0);
  }

  const _toSun = new THREE.Vector3();
  const _camOff = new THREE.Vector3();
  const _side = new THREE.Vector3();
  const _WORLD_UP = new THREE.Vector3(0, 1, 0);

  // Place the camera on the terminator plane (perpendicular to sun→Earth) so the
  // day hemisphere faces the sun and the dusk line reads in frame — not orbital angle.
  function onPreloaderStage() {
    return !!(window.__orreryPreloaderOwns && !window.__apHeroEntered);
  }

  /** Default hero + enter-screen frame: lit Earth on the terminator — not wide system + labels. */
  function setDefaultEarthFrame() {
    scaleLevel = 0;
    scaleAnimActive = false;
    introActive = false;
    updateScaleVisuals(0);
    updateScaleHUD();
    needRecompute = true;
    updatePositions();
    setEarthTerminatorCamera(3.8, 9 * D2R);
    camera.fov = CAM_FOV_MID;
    camera.updateProjectionMatrix();
    if (radialBlurPass) radialBlurPass.uniforms.uStrength.value = 0;
    if (bloomPass && composer) {
      bloomPass.strength = perfTier === 'mid' ? 0.14 : 0.18;
      bloomPass.threshold = perfTier === 'mid' ? 0.88 : 0.84;
    }
    if (renderer) renderer.toneMappingExposure = perfTier === 'high' ? 1.14 : 1.10;
    tunePreloaderSunGlow(true);
    orbitLines.forEach((o) => { o.visible = showOrbits && scaleLevel <= 3; });
    syncSceneStarfield(0);
    applyCamera();
    updateDomLabels(0);
  }

  function recoverPreloaderIntro() {
    if (!onPreloaderStage() || preloaderIntroFinished) return;
    if (preloaderIntroWatchdog) { clearTimeout(preloaderIntroWatchdog); preloaderIntroWatchdog = null; }
    preloaderIntroScheduled = false;
    preloaderIntroFinished = true;
    introActive = false;
    syncPreloaderIntroClass(false);
    holdPreloaderSystemFrame();
    if (onIntroDone) { const f = onIntroDone; onIntroDone = null; f(); }
  }

  function holdPreloaderSystemFrame() {
    buildRemainingPlanets();
    preloaderIntroScheduled = false;
    const holdScale = preloaderHoldScaleLevel();
    scaleLevel = holdScale;
    scaleAnimActive = false;
    introActive = false;
    showOrbits = true;
    updateScaleHUD();
    needRecompute = true;
    updatePositions();
    updateScaleVisuals(holdScale);
    const end = scalePreset(holdScale);
    camTarget.set(0, 0, 0);
    camRadius = preloaderSystemCamRadius();
    camEl = isPreloaderMobile() ? 24 * D2R : end.camEl;
    camAz = end.camAz;
    camera.fov = isPreloaderMobile() ? CAM_FOV_CLOSE : CAM_FOV_MID;
    camera.updateProjectionMatrix();
    tuneSunGlowForComposer(perfTier);
    if (bloomPass && composer) {
      bloomPass.strength = perfTier === 'mid' ? 0.20 : 0.28;
      bloomPass.threshold = perfTier === 'mid' ? 0.90 : 0.86;
    }
    if (renderer) renderer.toneMappingExposure = perfTier === 'high' ? 1.10 : 1.06;
    if (radialBlurPass) radialBlurPass.uniforms.uStrength.value = 0;
    syncSceneStarfield(holdScale);
    syncCosmosBlend(holdScale);
    applyPreloaderEarthIsolation(1);
    applyCamera();
    updateDomLabels(1);
    syncPreloaderSystemClass(true);
    requestAnimationFrame(forceResize);
    updateIntroProgress(1);
    try {
      document.dispatchEvent(new CustomEvent('ap-preloader-ready'));
    } catch (e) { /* optional */ }
  }

  function finishIntro() {
    if (!introActive) return;
    if (preloaderIntroWatchdog) { clearTimeout(preloaderIntroWatchdog); preloaderIntroWatchdog = null; }
    introActive = false;
    syncPreloaderIntroClass(false);
    syncHeroReplayClass(false);
    updateScaleHUD();
    userTouched = performance.now();
    if (onPreloaderStage()) {
      preloaderIntroFinished = true;
      preloaderIntroScheduled = false;
      holdPreloaderSystemFrame();
    } else {
      settleToSystemHeroFrame(false);
    }
    if (onIntroDone) { const f = onIntroDone; onIntroDone = null; f(); }
  }

  function usesPageStarfield() {
    return !!document.getElementById('starfield-canvas');
  }

  function tunePreloaderSunGlow(minimal) {
    if (!sunGlow.length) return;
    sunGlow.forEach((sp, i) => {
      if (!sp.material) return;
      if (minimal) {
        sp.visible = false;
        sp.material.opacity = 0;
        return;
      }
      sp.visible = true;
    });
  }

  /** Preloader: Earth close-up early, then full solar system for the Enter screen. */
  function applyPreloaderEarthIsolation(introP) {
    if (!onPreloaderStage()) return;
    const systemReveal = preloaderIntroFinished || (introP != null && introP >= 0.42);
    if (systemReveal) {
      BODIES.forEach((b) => {
        const g = meshes[b.id];
        if (g) g.visible = true;
      });
      if (sunMesh) {
        sunMesh.visible = true;
        sunMesh.scale.setScalar(1);
      }
      if (sunCoronaGroup) sunCoronaGroup.visible = true;
      tuneSunGlowForComposer(perfTier);
      if (moonGroup) moonGroup.visible = false;
      if (earthCloud) earthCloud.visible = false;
      orbitLines.forEach((o) => { o.visible = showOrbits; });
      if (asteroidPoints) asteroidPoints.visible = false;
      if (halleyGroup) halleyGroup.visible = false;
      Object.keys(labels).forEach((k) => { if (labels[k]) labels[k].visible = false; });
      syncPreloaderSystemClass(true);
      return;
    }
    BODIES.forEach((b) => {
      const g = meshes[b.id];
      if (!g) return;
      g.visible = b.id === 'earth';
    });
    if (sunMesh) {
      sunMesh.visible = false;
      sunMesh.scale.setScalar(1);
    }
    if (sunCoronaGroup) sunCoronaGroup.visible = false;
    tunePreloaderSunGlow(true);
    if (moonGroup) moonGroup.visible = false;
    if (earthCloud) earthCloud.visible = true;
    orbitLines.forEach((o) => { o.visible = false; });
    if (asteroidPoints) asteroidPoints.visible = false;
    if (halleyGroup) halleyGroup.visible = false;
    Object.keys(labels).forEach((k) => { if (labels[k]) labels[k].visible = false; });
    syncPreloaderSystemClass(false);
  }

  function syncSceneStarfield(level) {
    if (!starField) return;
    const lv = level | 0;
    if (usesPageStarfield() && lv < 5) {
      starField.visible = false;
      return;
    }
    starField.visible = true;
    if (starField.material.uniforms) {
      starField.material.uniforms.uFade.value = lv >= 6 ? 0.28 : lv >= 5 ? 0.45 : 1;
    }
  }

  function setEarthTerminatorCamera(radius, elevRad) {
    if (!meshes.earth || !sunMesh) {
      earthTargetVec(camTarget);
      camRadius = radius;
      camEl = elevRad;
      return;
    }
    const earthPos = meshes.earth.position;
    camTarget.copy(earthPos);
    _toSun.copy(sunMesh.position).sub(earthPos);
    if (_toSun.lengthSq() < 1e-8) _toSun.set(-1, 0, 0);
    _toSun.normalize();
    _side.crossVectors(_WORLD_UP, _toSun);
    if (_side.lengthSq() < 1e-8) _side.set(0, 0, 1);
    _side.normalize();
    const ce = Math.cos(elevRad), se = Math.sin(elevRad);
    // Sun-side + lateral offset: day hemisphere lit toward camera, terminator arcs across the disc.
    _camOff.copy(_toSun).multiplyScalar(radius * 0.76 * ce);
    _camOff.addScaledVector(_side, radius * 0.48 * ce);
    _camOff.y += radius * se;
    camRadius = Math.max(radius, _camOff.length());
    camEl = Math.asin(Math.max(-1, Math.min(1, _camOff.y / camRadius)));
    const horiz = Math.cos(camEl) * camRadius;
    camAz = horiz > 1e-6 ? Math.atan2(_camOff.z, _camOff.x) : 0;
  }

  function syncCosmosBlend(level) {
    if (!window.CosmosEngine || typeof window.CosmosEngine.setOrreryBlend !== 'function') return;
    const lv = level | 0;
    let blend = 0;
    if (lv >= 5) blend = Math.min(1, 0.4 + (lv - 4) * 0.6);
    else if (lv >= 4) blend = (lv - 3) * 0.4;
    window.CosmosEngine.setOrreryBlend(blend);
  }

  /** Hero settle: full solar system in the shared deep-space starfield (no duplicate canvas stars). */
  function settleToSystemHeroFrame(animate) {
    introActive = false;
    const doAnimate = animate && !PRM;
    if (doAnimate) {
      applyScalePreset(2, true);
    } else {
      scaleAnimActive = false;
      applyScalePreset(2, false);
      camTarget.set(0, 0, 0);
      camera.fov = CAM_FOV_WIDE;
      camera.updateProjectionMatrix();
      applyCamera();
      updateDomLabels(1);
    }
    tuneSunGlowForComposer(perfTier);
    if (bloomPass && composer) {
      bloomPass.strength = perfTier === 'mid' ? 0.20 : 0.30;
      bloomPass.threshold = perfTier === 'mid' ? 0.90 : 0.86;
    }
    if (renderer) renderer.toneMappingExposure = perfTier === 'high' ? 1.10 : 1.06;
    if (radialBlurPass) radialBlurPass.uniforms.uStrength.value = 0;
    syncSceneStarfield(2);
    syncCosmosBlend(2);
  }

  function restartIntro() {
    if (introBeginTimer) { clearTimeout(introBeginTimer); introBeginTimer = null; }
    scaleAnimActive = false;
    introActive = false;
    introStart = 0;
    syncPreloaderIntroClass(false);
    userTouched = performance.now();
    daysPerSec = 0;
    flicking = false;
    scaleLevel = 0;
    updateScaleVisuals(0);
    needRecompute = true;
    updatePositions();
    setEarthTerminatorCamera(3.2, 6 * D2R);
    applyCamera();
    if (PRM) {
      syncPreloaderIntroClass(false);
      if (onPreloaderStage()) {
        preloaderIntroScheduled = false;
        preloaderIntroFinished = true;
        holdPreloaderSystemFrame();
      } else {
        applyScalePreset(2, false);
      }
      if (onIntroDone) { const f = onIntroDone; onIntroDone = null; f(); }
      return;
    }
    // Hold static Earth until HD map is ready (shader compile lands on this beat).
    const begin = () => {
      if (destroyed || introActive || scaleLevel !== 0) return;
      preloaderIntroScheduled = false;
      introStart = performance.now();
      introStartedAt = introStart;
      introActive = true;
      syncPreloaderIntroClass(true);
      syncHeroReplayClass(true);
    };
    if (earthMapReady) { begin(); return; }
    needRecompute = true;
    earthMapReadyPromise.then(begin);
    introBeginTimer = setTimeout(begin, 1200);
  }

  function ensureComposer() {
    if (composer || PRM || perfTier === 'low' || !renderer || !scene || !camera) return;
    try {
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      const bloomStrength = perfTier === 'mid' ? 0.22 : 0.34;
      const bloomRadius = perfTier === 'mid' ? 0.38 : 0.46;
      const bloomThreshold = perfTier === 'mid' ? 0.90 : 0.86;
      bloomPass = new UnrealBloomPass(
        new THREE.Vector2(renderer.domElement.width, renderer.domElement.height),
        bloomStrength, bloomRadius, bloomThreshold
      );
      composer.addPass(bloomPass);
      if (perfTier === 'high') {
        radialBlurPass = tryCreateRadialBlurPass(1);
        if (radialBlurPass) composer.addPass(radialBlurPass);
      }
      composer.addPass(new OutputPass());
      resize();
    } catch (e) {
      composer = null;
      bloomPass = null;
      radialBlurPass = null;
      console.warn('[orrery] post-processing deferred init failed:', e.message);
    }
  }

  function upgradeSunVisuals() {
    if (!sunVisualsMinimal || !sunMesh) return;
    sunVisualsMinimal = false;
    buildSunCoronaShell();
    buildSunCorona();
    const layers = [
      { tex: makeGlowTexture('rgba(255,252,235,0.95)', 'rgba(255,205,85,0.52)'), scale: SUN_SIZE * 6.2 },
      { tex: makeGlowTexture('rgba(255,218,125,0.48)', 'rgba(240,135,35,0.14)'), scale: SUN_SIZE * 12 },
      { tex: makeGlowTexture('rgba(255,175,55,0.16)', 'rgba(215,85,12,0.04)'), scale: SUN_SIZE * 19 },
    ];
    layers.forEach((l) => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: l.tex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
      sp.scale.set(l.scale, l.scale, 1);
      sp.userData.baseScale = l.scale;
      sunMesh.add(sp);
      sunGlow.push(sp);
    });
    tuneSunGlowForComposer(perfTier);
  }

  function buildRemainingPlanets() {
    if (allPlanetsBuilt) return;
    buildPlanets({ remainingOnly: true });
    allPlanetsBuilt = true;
    needRecompute = true;
  }

  function settleHeavyWork() {
    if (destroyed) return;
    buildRemainingPlanets();
    upgradeSunVisuals();
    ensureGalaxyLayers();
    if (!asteroidPoints) buildAsteroids();
    if (!starField && !usesPageStarfield()) buildStars();
    preloadDeferredTextures();
    needRecompute = true;
    updatePositions();
    updateScaleVisuals(scaleLevel);
    resize();
  }

  function settleFromIntro() {
    userTouched = performance.now();
    settleToSystemHeroFrame(true);
    resize();
    requestAnimationFrame(() => {
      if (destroyed) return;
      ensureComposer();
      resize();
    });
    if (window.requestIdleCallback) {
      requestIdleCallback(settleHeavyWork, { timeout: 2400 });
    } else {
      setTimeout(settleHeavyWork, 160);
    }
  }

  function skipIntro() {
    if (!introActive && !preloaderIntroScheduled && scaleLevel === 2 && !onPreloaderStage()) return;
    introActive = false;
    preloaderIntroScheduled = false;
    syncPreloaderIntroClass(false);
    syncHeroReplayClass(false);
    scaleAnimActive = false;
    daysPerSec = 0;
    flicking = false;
    updateScaleHUD();
    if (onPreloaderStage()) {
      preloaderIntroFinished = true;
      holdPreloaderSystemFrame();
    } else {
      settleToSystemHeroFrame(false);
    }
    userTouched = performance.now();
    if (onIntroDone) { const f = onIntroDone; onIntroDone = null; f(); }
  }

  function earthTextureFiles() {
    const files = ['earth.jpg', 'earth_lights.png', 'earth_specular.jpg'];
    if (perfTier !== 'low' && !PRM) files.push('earth_clouds.jpg', 'earth_normal.jpg');
    return files;
  }

  function deferredTextureFiles() {
    const files = [];
    BODIES.forEach((b) => {
      if (b.tex && b.id !== 'earth') files.push(b.tex);
      if (b.ring) files.push(b.ring);
    });
    files.push('moon.jpg');
    return files;
  }

  function preloadDeferredTextures() {
    const files = deferredTextureFiles();
    if (!files.length) return Promise.resolve();
    let chain = Promise.resolve();
    const gap = perfTier === 'low' ? 90 : perfTier === 'mid' ? 55 : 35;
    files.forEach((f) => {
      chain = chain.then(() => {
        if (destroyed) return;
        return loadTex(f);
      }).then(() => new Promise((res) => setTimeout(res, gap)));
    });
    return chain.then(() => { if (!destroyed) refreshTextures(); }).catch(() => {});
  }

  function preloadTextures() {
    if (onPreloaderStage()) {
      return Promise.all(earthTextureFiles().map((f) => loadTex(f))).then(() => {
        texturesReady = true;
        refreshTextures();
        if (texturesReadyResolve) { texturesReadyResolve(); texturesReadyResolve = null; }
      }).catch(() => {
        texturesReady = true;
        if (texturesReadyResolve) { texturesReadyResolve(); texturesReadyResolve = null; }
      });
    }
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

  function cancelScaleJourney(jumpToTarget) {
    journeyActive = false;
    journeySteps = [];
    if (journeyHoldTimer) {
      clearTimeout(journeyHoldTimer);
      journeyHoldTimer = null;
    }
    if (jumpToTarget) applyScalePreset(journeyTarget, true);
    try {
      document.dispatchEvent(new CustomEvent('orrery-journey-end', { detail: { level: scaleLevel, skipped: !!jumpToTarget } }));
    } catch (e) { /* optional */ }
  }

  function runJourneyLeg() {
    if (!journeyActive) return;
    if (!journeySteps.length) {
      journeyActive = false;
      try {
        document.dispatchEvent(new CustomEvent('orrery-journey-end', { detail: { level: scaleLevel } }));
      } catch (e) { /* optional */ }
      return;
    }
    const level = journeySteps.shift();
    applyScalePreset(level, true);
    try {
      document.dispatchEvent(new CustomEvent('orrery-journey-step', {
        detail: { level, remaining: journeySteps.length, target: journeyTarget },
      }));
    } catch (e) { /* optional */ }
    journeyHoldTimer = setTimeout(runJourneyLeg, SCALE_ANIM_MS + JOURNEY_HOLD_MS);
  }

  function startScaleJourney(target, opts) {
    opts = opts || {};
    const to = Math.max(0, Math.min(6, target | 0));
    if (journeyActive) cancelScaleJourney(false);

    const begin = function () {
      const from = scaleLevel;
      journeyTarget = to;
      daysPerSec = 0;
      flicking = false;

      if (opts.fullTour) {
        journeySteps = opts.direction === 'in'
          ? [6, 5, 4, 3, 2, 1, 0]
          : [0, 1, 2, 3, 4, 5, 6];
      } else if (from === to) {
        applyScalePreset(to, true);
        try {
          document.dispatchEvent(new CustomEvent('orrery-journey-step', { detail: { level: to, remaining: 0, target: to } }));
          setTimeout(function () {
            document.dispatchEvent(new CustomEvent('orrery-journey-end', { detail: { level: to } }));
          }, SCALE_ANIM_MS + 400);
        } catch (e) { /* optional */ }
        return;
      } else {
        journeySteps = [];
        const dir = to > from ? 1 : -1;
        for (let i = from + dir; dir > 0 ? i <= to : i >= to; i += dir) journeySteps.push(i);
      }

      if (!journeySteps.length) return;
      journeyActive = true;
      runJourneyLeg();
    };

    begin();
  }

  function applyScalePreset(preset, animate) {
    const p = scalePreset(typeof preset === 'number' ? preset : (preset.id != null ? preset.id : preset));
    const prevLevel = scaleLevel;
    scaleLevel = p.id;
    scaleAnimFromLevel = prevLevel;
    scaleAnimToLevel = p.id;
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
      if (p.targetEarth) {
        earthTargetVec(camTarget);
        setEarthTerminatorCamera(p.camRadius, p.camEl);
      } else {
        camRadius = p.camRadius;
        camEl = p.camEl;
        camAz = p.camAz;
        camTarget.set(0, 0, 0);
      }
      scaleAnimActive = false;
      camera.fov = p.targetEarth ? CAM_FOV_MID : (p.id <= 2 ? CAM_FOV_WIDE : CAM_FOV_WIDE);
      camera.updateProjectionMatrix();
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
      const preset = scalePreset(lv);
      btn.classList.toggle('active', lv === scaleLevel);
      btn.setAttribute('aria-pressed', lv === scaleLevel ? 'true' : 'false');
      if (preset.honesty) btn.title = preset.honesty;
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
      core.userData.baseOpa = 1;
      core.userData.twinkle = 0.4 + Math.random() * 0.6;
      localStarsGroup.add(core);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({
        map: makeGlowTexture('rgba(200,220,255,0.25)', 'rgba(80,120,200,0.0)'),
        blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.5,
      }));
      halo.scale.set(9, 9, 1);
      halo.position.copy(d);
      halo.userData.baseOpa = 0.5;
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
    const count = perfTier === 'low' ? 7000 : perfTier === 'mid' ? 12000 : 20000;
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
        r = 1.0; g = 0.94; b = 0.78;
      } else {
        const arm = Math.floor(Math.random() * arms);
        const t = Math.pow(Math.random(), 0.72);
        const angle = t * 5.8 * Math.PI + arm * (Math.PI * 2 / arms) + (Math.random() - 0.5) * 0.35;
        const rad = 48 + t * 520 + (Math.random() - 0.5) * 28;
        x = Math.cos(angle) * rad;
        z = Math.sin(angle) * rad;
        y = (Math.random() - 0.5) * (14 + t * 10) * (1 - t * 0.35);
        const dust = Math.random() < 0.12;
        if (dust) {
          r = 0.38; g = 0.32; b = 0.28;
        } else {
          const warm = Math.random();
          r = 0.62 + warm * 0.28; g = 0.72 + warm * 0.18; b = 0.92 + (1 - warm) * 0.06;
        }
      }
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
      const w = 0.45 + Math.random() * 0.55;
      col[i * 3] = r * w; col[i * 3 + 1] = g * w; col[i * 3 + 2] = b * w;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    milkyWayDisk = new THREE.Points(geo, new THREE.PointsMaterial({
      size: perfTier === 'high' ? 0.62 : 0.46, vertexColors: true, transparent: true,
      opacity: 0.86, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
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
      map: makeGlowTexture('rgba(255,248,230,0.52)', 'rgba(220,180,100,0.0)'),
      blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.68,
    }));
    galacticCore.scale.set(48, 48, 1);
    galacticCore.position.set(0, 2, 0);
    galacticCore.visible = false;
    galaxyGroup.add(galacticCore);

    galacticHalo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: galaxySpriteTexture('rgba(90,110,160,0.12)', 'rgba(20,30,60,0.0)', 1024, 512),
      blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.34,
    }));
    galacticHalo.scale.set(920, 420, 1);
    galacticHalo.rotation.x = 62 * D2R;
    galacticHalo.visible = false;
    galaxyGroup.add(galacticHalo);
  }

  function spectralClass(type) {
    if (!type) return 'G';
    const m = String(type).match(/([OBAFGKM]|D|L|T)/i);
    return m ? m[1].toUpperCase() : 'G';
  }

  function buildCatalogStars() {
    const SC = window.StarCatalog;
    if (!SC || !SC.STARS || !galaxyGroup || catalogStarsGroup) return;
    const starCap = perfTier === 'low' ? 48 : perfTier === 'mid' ? 96 : 140;
    const stars = SC.STARS.slice(0, starCap);
    const count = stars.length;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const specColors = {
      O: [0.6, 0.75, 1.0], B: [0.7, 0.85, 1.0], A: [0.88, 0.92, 1.0],
      F: [1.0, 0.98, 0.95], G: [1.0, 0.92, 0.72], K: [1.0, 0.82, 0.55],
      M: [1.0, 0.65, 0.45], L: [1.0, 0.5, 0.35], T: [1.0, 0.55, 0.4],
      D: [0.95, 0.95, 1.0],
    };
    stars.forEach((s, i) => {
      const ly = Math.min(s.ly || 16, 18);
      const r = 55 + ly * 3.2;
      const ra = (s.ra || 0) * D2R;
      const dec = (s.dec || 0) * D2R;
      pos[i * 3] = r * Math.cos(dec) * Math.cos(ra);
      pos[i * 3 + 1] = r * Math.sin(dec);
      pos[i * 3 + 2] = -r * Math.cos(dec) * Math.sin(ra);
      const sp = spectralClass(s.spectral);
      const c = specColors[sp] || specColors.G;
      const w = 0.5 + Math.min(1, Math.max(0, (6 - (s.mag || 6)) / 8));
      col[i * 3] = c[0] * w; col[i * 3 + 1] = c[1] * w; col[i * 3 + 2] = c[2] * w;
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    catalogStarsGroup = new THREE.Points(g, new THREE.PointsMaterial({
      size: perfTier === 'high' ? 0.72 : 0.54, vertexColors: true, transparent: true,
      opacity: 0.88, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
    }));
    catalogStarsGroup.visible = false;
    catalogStarsGroup.userData.baseOpa = 0.88;
    galaxyGroup.add(catalogStarsGroup);
  }

  function buildCosmicField() {
    cosmicField = new THREE.Group();
    const count = perfTier === 'low' ? 6 : 12;
    const palettes = [
      ['rgba(200,160,255,0.42)', 'rgba(90,50,160,0.06)'],
      ['rgba(255,210,160,0.32)', 'rgba(200,120,50,0.05)'],
      ['rgba(160,200,255,0.28)', 'rgba(60,100,200,0.05)'],
      ['rgba(255,180,220,0.3)', 'rgba(180,80,120,0.04)'],
    ];
    for (let i = 0; i < count; i++) {
      const pal = palettes[i % palettes.length];
      const tex = galaxySpriteTexture(pal[0], pal[1], 640, 360);
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
      sp.userData.baseOpa = 0.55;
      cosmicField.add(sp);
    }
    const deepN = perfTier === 'low' ? 1800 : perfTier === 'mid' ? 3200 : 4800;
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
      size: perfTier === 'high' ? 0.58 : 0.48, vertexColors: true, transparent: true,
      opacity: 0.38, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
    }));
    deep.userData.baseOpa = 0.38;
    cosmicField.add(deep);
    cosmicField.visible = false;
    galaxyGroup.add(cosmicField);
  }

  let galaxyBuilt = false;

  function buildGalaxyLayers() {
    if (galaxyBuilt || !scene) return;
    galaxyBuilt = true;
    galaxyGroup = new THREE.Group();
    scene.add(galaxyGroup);
    buildOortShell();
    buildLocalStars();
    buildCatalogStars();
    buildMilkyWaySpiral();
    buildCosmicField();
  }

  function ensureGalaxyLayers() {
    if (!galaxyBuilt) buildGalaxyLayers();
  }

  function scaleFade(z, center, width) {
    const d = Math.abs(z - center) / Math.max(width, 0.001);
    return Math.max(0, 1 - d);
  }

  function applyCinematicLighting(z) {
    const galaxyT = Math.max(0, Math.min(1, (z - 3.8) / 1.2));
    const earthT = Math.max(0, Math.min(1, (2.2 - z) / 2.2));
    if (scene && scene.fog) {
      scene.fog.density = 0.00045 + galaxyT * 0.00085;
      scene.fog.color.set(z >= 5.2 ? 0x04020c : z >= 4 ? 0x06041a : z >= 3 ? 0x050c18 : 0x050406);
    }
    if (renderer) {
      renderer.toneMappingExposure = 1.38 - galaxyT * 0.16 - (1 - earthT) * 0.08;
    }
    if (hemiLight) {
      hemiLight.color.setHex(galaxyT > 0.35 ? 0x8090b8 : 0x4a6088);
      hemiLight.intensity = (perfTier === 'high' ? 0.48 : 0.40) * (0.85 + earthT * 0.15);
    }
    if (bloomPass) {
      if (z < 0.6) {
        bloomPass.strength = perfTier === 'mid' ? 0.20 : 0.28;
        bloomPass.threshold = perfTier === 'mid' ? 0.84 : 0.78;
      } else {
        bloomPass.strength = z >= 4.8 ? 0.42 : perfTier === 'mid' ? 0.16 : 0.24;
        bloomPass.threshold = z >= 4.8 ? 0.82 : perfTier === 'mid' ? 0.95 : 0.93;
      }
    }
  }

  function updateScaleVisualsContinuous(z) {
    const lv = Math.round(z);
    solarDim = z <= 2 ? 1 : z <= 3.4 ? 0.55 + (3.4 - z) * 0.45 : z <= 4.4 ? 0.12 + (4.4 - z) * 0.43 : 0;
    const showSolar = solarDim > 0.02;
    const showPlanetLabels = showLabels && z <= 2.2;
    BODIES.forEach((b) => {
      const g = meshes[b.id];
      if (!g) return;
      g.visible = showSolar;
      if (showSolar) {
        const s = z <= 2 ? 1 : z <= 3 ? 0.45 + (3 - z) * 0.55 : 0.15;
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
      if (sunGlow.length && showSolar) sunGlow.forEach((sp) => { sp.visible = z <= 2.2; });
      if (sunCoronaGroup) sunCoronaGroup.visible = showSolar && z <= 2.2 && !composer;
      if (sunCoronaMesh) sunCoronaMesh.visible = showSolar && z <= 2.4;
    }
    if (moonGroup) moonGroup.visible = showSolar && z <= 1.2;
    if (earthCloud) earthCloud.visible = showSolar && z <= 1.2;
    orbitLines.forEach((o) => { o.visible = showOrbits && z <= 3.2; });
    if (asteroidPoints) asteroidPoints.visible = showAsteroids && z <= 3.2;
    if (halleyGroup) halleyGroup.visible = z <= 3.2;
    if (labels.halley) labels.halley.visible = showLabels && z >= 1 && z <= 3.2;
    Object.keys(labels).forEach((k) => {
      if (k === 'halley') return;
      if (labels[k]) labels[k].visible = showPlanetLabels;
    });

    const oortF = scaleFade(z, 3, 0.75);
    if (oortShell) {
      oortShell.visible = oortF > 0.02;
      if (oortShell.material) oortShell.material.opacity = 0.55 * oortF;
    }
    const starsF = scaleFade(z, 4, 0.75);
    if (localStarsGroup) {
      localStarsGroup.visible = starsF > 0.02;
      localStarsGroup.children.forEach((ch) => {
        if (ch.material) ch.material.opacity = (ch.userData.baseOpa ?? 1) * starsF;
      });
    }
    if (catalogStarsGroup) {
      const catF = scaleFade(z, 4, 0.9) * Math.min(1, scaleFade(z, 4.6, 0.5));
      catalogStarsGroup.visible = catF > 0.02;
      if (catalogStarsGroup.material) {
        catalogStarsGroup.material.opacity = (catalogStarsGroup.userData.baseOpa ?? 0.88) * catF;
      }
    }
    const galF = scaleFade(z, 5, 0.85);
    if (milkyWayDisk) {
      milkyWayDisk.visible = galF > 0.02;
      if (milkyWayDisk.material) milkyWayDisk.material.opacity = 0.86 * galF;
    }
    if (sunMarker) sunMarker.visible = galF > 0.35 && z < 5.8;
    if (galacticCore) {
      galacticCore.visible = galF > 0.25;
      if (galacticCore.material) galacticCore.material.opacity = 0.72 * galF;
    }
    if (galacticHalo) {
      const haloF = Math.max(galF, z >= 4.8 ? scaleFade(z, 5.4, 1.2) : 0);
      galacticHalo.visible = haloF > 0.02;
      if (galacticHalo.material) galacticHalo.material.opacity = 0.38 * haloF;
    }
    const cosF = scaleFade(z, 6, 1.1);
    if (cosmicField) {
      cosmicField.visible = cosF > 0.02;
      cosmicField.children.forEach((ch) => {
        if (!ch.material) return;
        const base = ch.userData.baseOpa ?? (ch.type === 'Points' ? 0.38 : 0.55);
        ch.material.opacity = base * Math.max(cosF, z >= 5.6 ? 0.55 : 0);
      });
    }

    applyCinematicLighting(z);
    syncSceneStarfield(lv);
    syncCosmosBlend(lv);

    if (onPreloaderStage()) applyPreloaderEarthIsolation(preloaderIntroFinished ? 1 : null);
    else if (sunGlow.length && z < 0.5) {
      sunGlow.forEach((sp, i) => {
        if (!sp.material) return;
        sp.visible = i === 0;
        sp.material.opacity = 0.18;
      });
    }

    const chip = document.getElementById('orrery-honesty-chip');
    const p = scalePreset(lv);
    if (chip) {
      if (eclipseDim > 0.45) chip.textContent = 'Eclipse geometry detected · positions live (VSOP87)';
      else if (p.honesty) chip.textContent = p.honesty;
    }
    const hint = document.querySelector('.orrery-hint');
    if (hint) {
      const hints = [
        'Drag to scrub time · scroll the page to advance the sky',
        'Inner system · tap a planet or sky pill to focus',
        'Full solar system · VSOP87 positions live',
        'Oort cloud scale · illustrative shell',
        'Local star directions · schematic layout',
        'Milky Way view · Sun marked in the Orion arm',
        'Deep field · decorative galaxy sprites',
      ];
      hint.textContent = hints[lv] || hints[2];
    }
  }

  function updateScaleVisuals(level) {
    updateScaleVisualsContinuous(level | 0);
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
    if (sunCoronaMat && sunCoronaMat.uniforms) {
      sunCoronaMat.uniforms.uEclipse.value = eclipseDim;
    }
  }

  function updateSaturnShadow(jd) {
    if (!saturnRingMesh || !sunMesh || !meshes.saturn) return;
    const saturnPos = meshes.saturn.position;
    const sunPos = sunMesh.position;
    const lit = new THREE.Vector3().subVectors(sunPos, saturnPos).normalize();
    const ringMat = saturnRingMesh.material;
    if (ringMat && ringMat.uniforms) {
      ringMat.uniforms.uSunDir.value.copy(lit);
      ringMat.uniforms.uOpacity.value = 0.9 - eclipseDim * 0.1;
    } else if (ringMat) ringMat.opacity = 0.9 - eclipseDim * 0.1;
    if (saturnShadowBand) {
      saturnShadowBand.position.copy(lit.clone().multiplyScalar(0.92 * 1.05));
      saturnShadowBand.lookAt(saturnPos);
      saturnShadowBand.visible = true;
      if (saturnShadowBand.material) saturnShadowBand.material.opacity = 0.34 + lit.y * 0.12;
    }
  }

  // Shared GLSL noise helpers — 3D FBM fireball (Sangil Lee / Altered Qualia pattern, tier-scaled).
  const SUN_NOISE_GLSL = `
    float sunHash(vec3 p) {
      p = fract(p * 0.3183099 + 0.17);
      p *= 17.0;
      return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
    }
    float sunNoise3(vec3 p) {
      vec3 i = floor(p);
      vec3 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float n000 = sunHash(i);
      float n100 = sunHash(i + vec3(1.0, 0.0, 0.0));
      float n010 = sunHash(i + vec3(0.0, 1.0, 0.0));
      float n110 = sunHash(i + vec3(1.0, 1.0, 0.0));
      float n001 = sunHash(i + vec3(0.0, 0.0, 1.0));
      float n101 = sunHash(i + vec3(1.0, 0.0, 1.0));
      float n011 = sunHash(i + vec3(0.0, 1.0, 1.0));
      float n111 = sunHash(i + vec3(1.0, 1.0, 1.0));
      float nx00 = mix(n000, n100, f.x);
      float nx10 = mix(n010, n110, f.x);
      float nx01 = mix(n001, n101, f.x);
      float nx11 = mix(n011, n111, f.x);
      float nxy0 = mix(nx00, nx10, f.y);
      float nxy1 = mix(nx01, nx11, f.y);
      return mix(nxy0, nxy1, f.z);
    }
    float sunFBM(vec3 p, float quality) {
      float v = 0.0;
      float a = 0.55;
      mat3 rot = mat3(
        0.86, 0.12, -0.49,
        -0.31, 0.94, 0.14,
        0.41, -0.32, 0.85
      );
      for (int i = 0; i < 5; i++) {
        float fi = float(i);
        float w = step(fi, 2.0 + quality);
        v += a * sunNoise3(p) * w;
        p = rot * p * 2.08 + vec3(1.4, 2.1, 0.9);
        a *= 0.52;
      }
      return v;
    }`;

  // ── Animated sun surface — turbulent photosphere + spots + faculae + flares ─
  function makeSunShaderMaterial(quality) {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uEclipse: { value: 0 },
        uQuality: { value: quality },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewDir;
        varying vec3 vSphere;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vNormal = normalize(normalMatrix * normal);
          vViewDir = normalize(-mv.xyz);
          vSphere = normalize(position);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        precision highp float;
        varying vec3 vNormal;
        varying vec3 vViewDir;
        varying vec3 vSphere;
        uniform float uTime;
        uniform float uEclipse;
        uniform float uQuality;
        ${SUN_NOISE_GLSL}
        void main() {
          vec3 n = normalize(vNormal);
          vec3 v = normalize(vViewDir);
          float mu = max(dot(n, v), 0.001);
          float limb = pow(mu, 0.24);
          float t = uTime;
          vec3 drift = vec3(sin(t * 0.32), cos(t * 0.26), sin(t * 0.21)) * 0.09;
          vec3 flow = vSphere + drift;
          vec3 warp = flow * 3.4 + vec3(t * 0.09, t * 0.055, -t * 0.065);
          float turb = sunFBM(warp, uQuality);
          float turb2 = sunFBM(warp * 1.75 + vec3(4.2, 2.6, 1.4), uQuality);
          float gran = turb * 0.62 + turb2 * 0.38;
          float spots = smoothstep(0.70, 0.90, sunNoise3(flow * 1.35 + vec3(2.1, 0.8, 1.6)));
          float spotMask = mix(1.0, 0.62, spots) * (0.82 + limb * 0.18);
          float fac = smoothstep(0.56, 0.92, gran) * smoothstep(0.12, 0.52, turb2);
          float flare = pow(max(0.0,
            sin(flow.x * 11.0 + t * 2.4) * sin(flow.y * 9.0 - t * 1.7) * sin(flow.z * 8.0 + t * 1.2)
          ), 5.0) * 0.32;
          vec3 core = vec3(1.0, 0.98, 0.90);
          vec3 mid = vec3(1.0, 0.76, 0.20);
          vec3 edge = vec3(0.94, 0.36, 0.04);
          vec3 col = mix(edge, mid, limb);
          col = mix(col, core, limb * limb * (0.82 + gran * 0.22));
          col *= spotMask;
          col += vec3(1.0, 0.88, 0.48) * fac * limb * 0.38;
          col += vec3(1.0, 0.58, 0.10) * flare * limb;
          float chromo = pow(1.0 - mu, 3.4);
          col += vec3(1.0, 0.40, 0.06) * chromo * (0.30 + gran * 0.14);
          float coronaHint = pow(1.0 - mu, 1.6);
          col += vec3(1.0, 0.52, 0.10) * coronaHint * 0.20;
          col *= mix(1.0, 0.26, uEclipse);
          col *= 1.65;
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
  }

  function makeSunCoronaShellMaterial(quality) {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uEclipse: { value: 0 },
        uQuality: { value: quality },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewDir;
        varying vec3 vSphere;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vNormal = normalize(normalMatrix * normal);
          vViewDir = normalize(-mv.xyz);
          vSphere = normalize(position);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        precision highp float;
        varying vec3 vNormal;
        varying vec3 vViewDir;
        varying vec3 vSphere;
        uniform float uTime;
        uniform float uEclipse;
        uniform float uQuality;
        ${SUN_NOISE_GLSL}
        void main() {
          vec3 n = normalize(vNormal);
          vec3 v = normalize(vViewDir);
          float facing = max(dot(n, v), 0.0);
          float fresnel = pow(1.0 - facing, 2.6);
          float t = uTime;
          float ang = atan(vSphere.y, vSphere.x);
          float rays = 0.0;
          for (int i = 0; i < 6; i++) {
            float fi = float(i);
            float w = step(fi, 2.0 + uQuality);
            rays += pow(max(0.0, sin(ang * (4.5 + fi * 1.2) + t * (0.35 + fi * 0.04))), 7.0) * 0.14 * w;
          }
          float turb = sunFBM(vSphere * 2.8 + vec3(t * 0.12, -t * 0.08, t * 0.05), uQuality);
          float a = fresnel * (0.48 + turb * 0.42 + rays) * (1.0 - uEclipse * 0.75);
          vec3 col = mix(vec3(1.0, 0.48, 0.06), vec3(1.0, 0.92, 0.58), turb);
          gl_FragColor = vec4(col * a * 1.5, clamp(a, 0.0, 0.92));
        }`,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
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
    const s = perfTier === 'high' ? 640 : 320, c = document.createElement('canvas'); c.width = c.height = s;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, inner);
    g.addColorStop(0.28, outer);
    g.addColorStop(0.62, 'rgba(255,180,60,0.05)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, s, s);
    x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < (perfTier === 'high' ? 18 : 10); i++) {
      const ang = (i / 18) * Math.PI * 2;
      const r = s * (0.08 + Math.random() * 0.22);
      const px = s / 2 + Math.cos(ang) * r;
      const py = s / 2 + Math.sin(ang) * r;
      const rg = x.createRadialGradient(px, py, 0, px, py, s * (0.06 + Math.random() * 0.08));
      rg.addColorStop(0, 'rgba(255,220,140,0.12)');
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = rg;
      x.beginPath();
      x.arc(px, py, s * 0.1, 0, Math.PI * 2);
      x.fill();
    }
    x.globalCompositeOperation = 'source-over';
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  // ── Scene construction ─────────────────────────────────────────────────────
  function capTextureSize(t, maxDim) {
    if (!t || !t.image || !maxDim) return;
    const img = t.image;
    const w = img.width || 0;
    const h = img.height || 0;
    if (!w || !h) return;
    const maxSide = Math.max(w, h);
    if (maxSide <= maxDim) return;
    const s = maxDim / maxSide;
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w * s));
    c.height = Math.max(1, Math.round(h * s));
    const x = c.getContext('2d');
    if (!x) return;
    x.drawImage(img, 0, 0, c.width, c.height);
    t.image = c;
    t.needsUpdate = true;
  }

  function tuneTexture(t) {
    if (!t || !renderer) return;
    const maxDim = perfTier === 'low' ? 1024 : perfTier === 'mid' ? 3072 : 4096;
    capTextureSize(t, onPreloaderStage() ? Math.min(maxDim, 2048) : maxDim);
    const max = renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 1;
    t.anisotropy = perfTier === 'low' ? Math.min(max, 4) : max;
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.magFilter = THREE.LinearFilter;
  }

  function textureCandidates(file) {
    const list = [];
    if (perfTier === 'low' || onPreloaderStage()) {
      const sm = file.replace(/\.(jpe?g|png)$/i, '_sm.$1');
      if (sm !== file) list.push(sm);
    }
    list.push(file);
    return list;
  }

  function loadTex(file, srgb) {
    const candidates = textureCandidates(file);
    return new Promise((res) => {
      let idx = 0;
      const tryNext = () => {
        if (idx >= candidates.length) return res(null);
        const f = candidates[idx++];
        texLoader.load(TEX + f, (t) => {
          if (srgb !== false) t.colorSpace = THREE.SRGBColorSpace;
          tuneTexture(t);
          res(t);
        }, undefined, tryNext);
      };
      tryNext();
    });
  }

  function ensureFocusRing(group, scaleMul) {
    if (group.userData.focusRing) return group.userData.focusRing;
    const tex = makeGlowTexture('rgba(255, 228, 160, 0.85)', 'rgba(201, 162, 39, 0.0)');
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
    }));
    const base = (scaleMul || 3.2);
    sp.scale.set(base, base, 1);
    sp.visible = false;
    sp.userData.baseScale = base;
    group.add(sp);
    group.userData.focusRing = sp;
    return sp;
  }

  function clearFocusHighlight() {
    focusPlanetId = null;
    focusPlanetUntil = 0;
    if (focusOrbitsRestore === false) {
      showOrbits = false;
      focusOrbitsRestore = null;
      updateScaleVisuals(scaleLevel);
    }
    BODIES.forEach((b) => {
      const g = meshes[b.id];
      if (g && g.userData.focusRing) g.userData.focusRing.visible = false;
    });
    if (sunFocusRing) sunFocusRing.visible = false;
    if (moonFocusRing) moonFocusRing.visible = false;
    if (bloomPass) bloomPass.strength = focusBloomBase;
  }

  function setFocusHighlight(id) {
    if (!id || PRM) return;
    focusPlanetId = id;
    focusPlanetUntil = performance.now() + 2800;
    if (bloomPass) focusBloomBase = bloomPass.strength;
    if (id !== 'earth' && id !== 'moon' && id !== 'sun' && !showOrbits) {
      focusOrbitsRestore = false;
      showOrbits = true;
      updateScaleVisuals(scaleLevel);
    }
    BODIES.forEach((b) => {
      const g = meshes[b.id];
      if (!g) return;
      const ring = ensureFocusRing(g, b.size * 3.8);
      ring.visible = b.id === id;
    });
    if (id === 'sun' && sunMesh) {
      sunFocusRing = sunFocusRing || ensureFocusRing(sunMesh, SUN_SIZE * 6.5);
      sunFocusRing.visible = true;
    } else if (sunFocusRing) {
      sunFocusRing.visible = false;
    }
    if (id === 'moon' && moonGroup) {
      moonFocusRing = moonFocusRing || ensureFocusRing(moonGroup, 1.4);
      moonFocusRing.visible = true;
    } else if (moonFocusRing) {
      moonFocusRing.visible = false;
    }
    try {
      document.dispatchEvent(new CustomEvent('orrery-planet-focus', { detail: { id } }));
    } catch (e) { /* optional */ }
  }

  function updateFocusHighlight(t) {
    if (!focusPlanetId || t >= focusPlanetUntil) {
      if (focusPlanetId) clearFocusHighlight();
      return;
    }
    const pulse = 0.72 + 0.28 * Math.sin(t * 0.009);
    const fade = Math.min(1, (focusPlanetUntil - t) / 2800);
    BODIES.forEach((b) => {
      if (b.id !== focusPlanetId) return;
      const g = meshes[b.id];
      const ring = g && g.userData.focusRing;
      if (ring) {
        const s = ring.userData.baseScale * (0.92 + pulse * 0.14);
        ring.scale.set(s, s, 1);
        if (ring.material) ring.material.opacity = 0.55 + pulse * 0.35 * fade;
      }
    });
    if (focusPlanetId === 'sun' && sunFocusRing) {
      const s = sunFocusRing.userData.baseScale * (0.94 + pulse * 0.1);
      sunFocusRing.scale.set(s, s, 1);
      if (sunFocusRing.material) sunFocusRing.material.opacity = 0.5 + pulse * 0.3 * fade;
    }
    if (focusPlanetId === 'moon' && moonFocusRing) {
      const s = moonFocusRing.userData.baseScale * (0.94 + pulse * 0.12);
      moonFocusRing.scale.set(s, s, 1);
      if (moonFocusRing.material) moonFocusRing.material.opacity = 0.5 + pulse * 0.32 * fade;
    }
    if (bloomPass && composer) {
      bloomPass.strength = focusBloomBase + pulse * 0.14 * fade;
    }
  }

  function buildStars() {
    if (onPreloaderStage() && usesPageStarfield()) return;
    const N = PRM ? 800 : (perfTier === 'high' ? 2600 : perfTier === 'mid' ? 2000 : 1500);
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

  function buildSunCoronaShell() {
    if (sunCoronaMesh || !sunMesh) return;
    const q = perfTier === 'high' ? 2.0 : perfTier === 'mid' ? 1.0 : 0.0;
    const segs = perfTier === 'high' ? 72 : perfTier === 'mid' ? 56 : 36;
    sunCoronaMat = makeSunCoronaShellMaterial(q);
    sunCoronaMesh = new THREE.Mesh(
      new THREE.SphereGeometry(SUN_SIZE * 1.16, segs, segs),
      sunCoronaMat
    );
    sunMesh.add(sunCoronaMesh);
  }

  function buildSunCorona() {
    if (sunCoronaGroup || !sunMesh) return;
    sunCoronaGroup = new THREE.Group();
    sunPromGroup = sunCoronaGroup;
    const rayCount = PRM ? 6 : (perfTier === 'high' ? 14 : 10);
    for (let i = 0; i < rayCount; i++) {
      const c = document.createElement('canvas'); c.width = 72; c.height = 288;
      const x = c.getContext('2d');
      const g = x.createLinearGradient(36, 240, 36, 0);
      g.addColorStop(0, 'rgba(255,180,60,0)');
      g.addColorStop(0.22, 'rgba(255,160,50,0.22)');
      g.addColorStop(0.55, 'rgba(255,210,90,0.48)');
      g.addColorStop(0.82, 'rgba(255,240,200,0.72)');
      g.addColorStop(1, 'rgba(255,252,240,0.92)');
      x.fillStyle = g;
      x.fillRect(12, 0, 48, 288);
      x.globalCompositeOperation = 'lighter';
      for (let j = 0; j < 6; j++) {
        const px = 18 + Math.random() * 36;
        x.fillStyle = 'rgba(255,220,120,0.18)';
        x.fillRect(px, 40 + Math.random() * 180, 2 + Math.random() * 3, 40 + Math.random() * 80);
      }
      x.globalCompositeOperation = 'source-over';
      const tex = new THREE.CanvasTexture(c);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: tex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.5,
      }));
      const ang = (i / rayCount) * Math.PI * 2;
      sp.position.set(Math.cos(ang) * SUN_SIZE * 0.18, Math.sin(ang) * SUN_SIZE * 0.14, 0);
      const hScale = SUN_SIZE * (4.8 + (i % 3) * 0.6);
      sp.scale.set(SUN_SIZE * 1.6, hScale, 1);
      sp.userData.baseScale = hScale;
      sp.userData.baseWidth = SUN_SIZE * 1.6;
      sp.material.rotation = ang + Math.PI / 2;
      sunCoronaGroup.add(sp);
    }
    sunMesh.add(sunCoronaGroup);
  }

  function buildSun(minimal) {
    const sunQ = perfTier === 'high' ? 2.0 : perfTier === 'mid' ? 1.0 : 0.0;
    sunMaterial = makeSunShaderMaterial(sunQ);
    const sunSegs = minimal
      ? (perfTier === 'high' ? 56 : 36)
      : (perfTier === 'high' ? 112 : perfTier === 'mid' ? 84 : 56);
    sunMesh = new THREE.Mesh(new THREE.SphereGeometry(SUN_SIZE, sunSegs, sunSegs), sunMaterial);
    scene.add(sunMesh);
    sunVisualsMinimal = !!minimal;
    if (!minimal) {
      buildSunCoronaShell();
      buildSunCorona();
      const layers = [
        { tex: makeGlowTexture('rgba(255,252,235,0.95)', 'rgba(255,205,85,0.52)'), scale: SUN_SIZE * 6.2 },
        { tex: makeGlowTexture('rgba(255,218,125,0.48)', 'rgba(240,135,35,0.14)'), scale: SUN_SIZE * 12 },
        { tex: makeGlowTexture('rgba(255,175,55,0.16)', 'rgba(215,85,12,0.04)'), scale: SUN_SIZE * 19 },
      ];
      layers.forEach((l) => {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: l.tex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
        sp.scale.set(l.scale, l.scale, 1);
        sp.userData.baseScale = l.scale;
        sunMesh.add(sp);
        sunGlow.push(sp);
      });
    }
    const light = new THREE.PointLight(0xfff4e0, perfTier === 'high' ? 6.0 : 5.4, 0, 1.45);
    sunMesh.add(light);
    sunDirLight = new THREE.DirectionalLight(0xfff8ec, perfTier === 'high' ? 3.6 : 3.0);
    sunDirLight.position.set(0, 0, 0);
    scene.add(sunDirLight);
    sunDirLightTarget = new THREE.Object3D();
    scene.add(sunDirLightTarget);
    sunDirLight.target = sunDirLightTarget;
    hemiLight = new THREE.HemisphereLight(0x7088a8, 0x1a1410, perfTier === 'high' ? 0.48 : 0.40);
    scene.add(hemiLight);
    scene.add(new THREE.AmbientLight(0x3a5068, perfTier === 'high' ? 0.20 : 0.16));
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
      uniforms: { uColor: { value: col }, uIntensity: { value: intensity || 0.45 } },
      vertexShader: `varying vec3 vN; varying vec3 vV; void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform vec3 uColor; uniform float uIntensity; varying vec3 vN; varying vec3 vV;
        void main(){
          float facing = max(dot(vN, vV), 0.0);
          float fresnel = pow(1.0 - facing, 5.8);
          float a = fresnel * uIntensity;
          vec3 col = uColor * (0.38 + fresnel * 0.62);
          gl_FragColor = vec4(col, clamp(a, 0.0, 0.65));
        }`,
      blending: THREE.AdditiveBlending, side: THREE.BackSide, transparent: true, depthWrite: false,
    });
  }

  function saturnRingMaterial() {
    return new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: null },
        uSunDir: { value: new THREE.Vector3(1, 0, 0) },
        uOpacity: { value: 0.9 },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorldNormal;
        void main() {
          vUv = uv;
          vWorldNormal = normalize(mat3(modelMatrix) * normal);
          vec4 wp = modelMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }`,
      fragmentShader: `
        uniform sampler2D uMap;
        uniform vec3 uSunDir;
        uniform float uOpacity;
        varying vec2 vUv;
        varying vec3 vWorldNormal;
        void main() {
          vec4 tex = texture2D(uMap, vUv);
          float density = tex.a > 0.02 ? tex.a : max(tex.r, max(tex.g, tex.b));
          if (density < 0.03) discard;
          vec3 base = tex.rgb;
          if (length(base) < 0.05) base = vec3(0.92, 0.86, 0.72);
          float lit = clamp(dot(vWorldNormal, normalize(uSunDir)) * 0.5 + 0.52, 0.36, 1.0);
          vec3 col = base * lit * vec3(1.04, 1.0, 0.94);
          float edgeFade = smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x);
          gl_FragColor = vec4(col, density * uOpacity * edgeFade);
        }`,
      transparent: true, side: THREE.DoubleSide, depthWrite: false,
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

  function buildPlanets(opts) {
    const earthOnly = !!(opts && opts.earthOnly);
    const remainingOnly = !!(opts && opts.remainingOnly);
    let bodies = BODIES;
    if (earthOnly) bodies = BODIES.filter((b) => b.id === 'earth');
    else if (remainingOnly) bodies = BODIES.filter((b) => b.id !== 'earth');
    bodies.forEach((b) => {
      if (meshes[b.id]) return;
      const group = new THREE.Group();
      const vis = PLANET_VIS[b.id] || { roughness: 0.9, metalness: 0, atmo: null, atmoS: 1.0 };
      let mat;
      if (b.hero) {
        // HD Earth: single MeshStandardMaterial patched via onBeforeCompile (day map +
        // ocean gloss + terrain normal + terminator-gated city lights). emissive must be
        // a non-black carrier (emissiveMap multiplies) — the injected GLSL overwrites
        // totalEmissiveRadiance so the white never reaches the day side.
        mat = new THREE.MeshStandardMaterial({
          color: 0x2a6cb0, roughness: 0.78, metalness: 0.0,
          emissive: 0xffffff, emissiveIntensity: 1.0, envMapIntensity: 0.48,
        });
        mat.onBeforeCompile = (shader) => { try { injectEarth(shader); } catch (e) { console.warn('[orrery] earth shader patch skipped', e); } };
        earthMat = mat;
        earthUniforms.uNightInt.value = perfTier === 'low' ? 1.85 : perfTier === 'mid' ? 1.45 : 1.6;
      } else {
        const isGiant = b.id === 'jupiter' || b.id === 'saturn' || b.id === 'uranus' || b.id === 'neptune';
        const clearcoat = (b.id === 'jupiter' ? 0.36 : b.id === 'saturn' ? 0.30 : b.id === 'venus' ? 0.20
          : (b.id === 'uranus' || b.id === 'neptune') ? 0.14 : 0);
        const giantGlow = b.id === 'jupiter' ? 0x2a1808 : b.id === 'saturn' ? 0x1e1608 : 0x000000;
        const giantEmissiveI = b.id === 'jupiter' ? 0.10 : b.id === 'saturn' ? 0.08
          : b.id === 'uranus' ? 0.05 : b.id === 'neptune' ? 0.05 : 0;
        const envI = isGiant ? 0.38 : (b.id === 'venus' ? 0.28 : 0.24);
        mat = new THREE.MeshPhysicalMaterial({
          color: b.color, roughness: vis.roughness, metalness: vis.metalness,
          clearcoat, clearcoatRoughness: isGiant ? 0.26 : 0.38,
          emissive: giantGlow, emissiveIntensity: giantEmissiveI,
          envMapIntensity: envI,
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
          const atmoI = vis.atmoI != null ? vis.atmoI : (b.hero ? 1.0 : 0.4);
          atmoMat = atmosphereMaterial(vis.atmo, atmoI);
        }
        const atmoSegs = Math.max(24, Math.floor(segs * 0.65));
        const atmo = new THREE.Mesh(new THREE.SphereGeometry(b.size * vis.atmoS, atmoSegs, atmoSegs), atmoMat);
        group.add(atmo);
      }

      if (b.hero) {
        // ── HD Earth texture swap-in: perceived-quality order, each guarded ──
        loadTex('earth.jpg').then((t) => {
          if (t && earthMat) { earthMat.map = t; earthMat.color.set(0xffffff); earthMat.needsUpdate = true; }
          markEarthMapReady();
        });
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
        const moonSegs = perfTier === 'high' ? 72 : perfTier === 'mid' ? 52 : 32;
        moonMesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.23, moonSegs, moonSegs),
          new THREE.MeshPhysicalMaterial({ color: 0xd8dce6, roughness: 0.88, metalness: 0, emissive: 0x888c98, emissiveIntensity: 0.35, clearcoat: 0.08, clearcoatRoughness: 0.5 })
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
        const ringMat = saturnRingMaterial();
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2; // lay flat, then group tilt gives the iconic angle
        group.add(ring);
        if (b.id === 'saturn') {
          saturnRingMesh = ring;
          saturnShadowBand = new THREE.Mesh(
            new THREE.PlaneGeometry(b.size * 1.5, b.size * 0.22),
            new THREE.MeshBasicMaterial({
              color: 0x0c0a08, transparent: true, opacity: 0.36, depthWrite: false, side: THREE.DoubleSide,
            })
          );
          group.add(saturnShadowBand);
        }
        loadTex(b.ring).then((t) => {
          if (t && ringMat.uniforms) {
            ringMat.uniforms.uMap.value = t;
            ringMat.needsUpdate = true;
          }
        });
        // Procedural ring fallback until texture loads
        const fb = document.createElement('canvas'); fb.width = 256; fb.height = 8;
        const fx = fb.getContext('2d');
        const rg = fx.createLinearGradient(0, 0, 256, 0);
        rg.addColorStop(0, 'rgba(0,0,0,0)');
        rg.addColorStop(0.12, 'rgba(210,190,155,0.85)');
        rg.addColorStop(0.38, 'rgba(235,220,190,0.95)');
        rg.addColorStop(0.52, 'rgba(60,50,40,0.7)');
        rg.addColorStop(0.68, 'rgba(220,205,175,0.9)');
        rg.addColorStop(0.88, 'rgba(180,165,140,0.75)');
        rg.addColorStop(1, 'rgba(0,0,0,0)');
        fx.fillStyle = rg; fx.fillRect(0, 0, 256, 8);
        const fbTex = new THREE.CanvasTexture(fb);
        fbTex.colorSpace = THREE.SRGBColorSpace;
        if (ringMat.uniforms) ringMat.uniforms.uMap.value = fbTex;
      }

      // orbit ring line
      const oGeo = new THREE.BufferGeometry();
      const orbitSegs = 160, arr = new Float32Array((orbitSegs + 1) * 3);
      for (let i = 0; i <= orbitSegs; i++) {
        const a = (i / orbitSegs) * Math.PI * 2;
        arr[i * 3] = Math.cos(a) * b.R; arr[i * 3 + 1] = 0; arr[i * 3 + 2] = -Math.sin(a) * b.R;
      }
      oGeo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
      const baseOp = b.hero ? 0.48 : 0.18;
      const oLine = new THREE.Line(oGeo, new THREE.LineBasicMaterial({
        color: b.hero ? 0xd4b84a : 0x9a8040, transparent: true, opacity: baseOp,
      }));
      oLine.userData = { baseOpacity: baseOp, hero: !!b.hero };
      scene.add(oLine); orbitLines.push(oLine);

      // name label (sprite, optional)
      labels[b.id] = makeLabel(b.name); labels[b.id].visible = false; scene.add(labels[b.id]);
    });
    if (!earthOnly) allPlanetsBuilt = true;
  }

  function makeLabel(text) {
    const pad = 8, font = 26, c = document.createElement('canvas'), x = c.getContext('2d');
    x.font = `600 ${font}px Cinzel, Inter, system-ui, sans-serif`;
    const w = Math.ceil(x.measureText(text).width) + pad * 2;
    c.width = w; c.height = font + pad * 2;
    x.font = `600 ${font}px Cinzel, Inter, system-ui, sans-serif`;
    x.fillStyle = 'rgba(240,232,216,0.95)'; x.textBaseline = 'middle'; x.textAlign = 'center';
    x.shadowColor = 'rgba(0,0,0,0.8)'; x.shadowBlur = 8;
    x.fillText(text, c.width / 2, c.height / 2);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthTest: false, depthWrite: false }));
    sp.scale.set(c.width / c.height * 1.1, 1.1, 1); sp.userData.aspect = c.width / c.height;
    return sp;
  }

  function ensureDomLabels() {
    domLabelLayer = document.getElementById('orrery-dom-labels');
    if (!domLabelLayer) { useDomLabels = false; return false; }
    if (!domLabelEls.earth) {
      BODIES.forEach((b) => {
        const el = document.createElement('span');
        el.className = 'orrery-dom-label' + (b.hero ? ' orrery-dom-label--hero' : '');
        el.dataset.planet = b.id;
        el.textContent = b.name;
        domLabelLayer.appendChild(el);
        domLabelEls[b.id] = el;
      });
    }
    useDomLabels = true;
    return true;
  }

  function introLabelAlpha(planetId, introP) {
    if (introP < 0.16) return planetId === 'earth' ? 1 : 0;
    if (introP < 0.52) return planetId === 'earth' ? 1 : 0;
    const t = easeOutCubic(Math.min(1, (introP - 0.52) / 0.48));
    const order = { mercury: 0.92, venus: 0.88, earth: 1, mars: 0.86, jupiter: 0.78, saturn: 0.72, uranus: 0.55, neptune: 0.5 };
    const gate = order[planetId] != null ? order[planetId] : 0.6;
    return Math.max(0, Math.min(1, (t - (1 - gate)) / gate));
  }

  function updateDomLabels(introP) {
    if (!ensureDomLabels() || !camera || !canvas) return;
    const canvasRect = canvas.getBoundingClientRect();
    const layerRect = domLabelLayer.getBoundingClientRect();
    if (!canvasRect.width || !canvasRect.height) return;
    const ox = canvasRect.left - layerRect.left;
    const oy = canvasRect.top - layerRect.top;
    const w = canvasRect.width;
    const h = canvasRect.height;

    BODIES.forEach((b) => {
      const el = domLabelEls[b.id];
      const m = meshes[b.id];
      if (!el || !m) return;

      let alpha = 0;
      if (onPreloaderStage()) {
        alpha = 0;
      } else if (introActive) {
        alpha = introLabelAlpha(b.id, introP);
      } else if (focusPlanetId === b.id && performance.now() < focusPlanetUntil) {
        alpha = 1;
      } else if (showLabels && scaleLevel <= 2) {
        alpha = 1;
      }

      if (alpha <= 0.02) {
        el.style.opacity = '0';
        return;
      }

      _projLabel.copy(m.position);
      _projLabel.y += b.size + 0.42;
      _projLabel.project(camera);
      if (_projLabel.z > 1) {
        el.style.opacity = '0';
        return;
      }

      const x = ox + (_projLabel.x * 0.5 + 0.5) * w;
      const y = oy + (-_projLabel.y * 0.5 + 0.5) * h;
      const depthFade = Math.max(0.35, 1 - Math.max(0, _projLabel.z) * 0.35);
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
      el.style.opacity = String(alpha * depthFade);
    });
  }

  function updateIntroProgress(introP) {
    const bar = document.getElementById('preloader-intro-progress');
    if (bar) bar.style.transform = `scaleX(${Math.max(0, Math.min(1, introP)).toFixed(3)})`;
    const phase = document.getElementById('preloader-phase');
    const scaleEl = document.getElementById('orrery-scale-label');
    if (phase) {
      if (onPreloaderStage()) {
        if (introP < 0.18) phase.textContent = 'Calibrating sky';
        else if (introP < 0.45) phase.textContent = 'Earth · live positions';
        else phase.textContent = 'Solar system aligned';
      } else if (introP < 0.18) phase.textContent = 'Earth';
      else if (introP < 0.55) phase.textContent = 'Inner system';
      else phase.textContent = 'Solar system';
    }
    if (scaleEl && introActive && !onPreloaderStage()) {
      if (introP < 0.18) scaleEl.textContent = 'Earth close-up';
      else if (introP < 0.55) scaleEl.textContent = 'Approaching inner system';
      else scaleEl.textContent = 'Opening the solar system';
    }
  }

  function applyIntroVisuals(p, t) {
    const p0 = onPreloaderStage() ? 0.18 : 0.18;
    if (p < p0) {
      camera.fov = CAM_FOV_CLOSE;
    } else if (onPreloaderStage() && p < 0.45) {
      const e = easeInOut((p - 0.18) / 0.27);
      camera.fov = CAM_FOV_CLOSE + (CAM_FOV_MID - CAM_FOV_CLOSE) * e;
    } else if (onPreloaderStage()) {
      const e = easeOutCubic((p - 0.45) / 0.55);
      camera.fov = CAM_FOV_MID + (CAM_FOV_WIDE - CAM_FOV_MID) * e;
    } else if (p < 0.55) {
      const e = easeInOut((p - 0.18) / 0.37);
      camera.fov = CAM_FOV_CLOSE + (CAM_FOV_MID - CAM_FOV_CLOSE) * e;
    } else {
      const e = easeOutCubic((p - 0.55) / 0.45);
      camera.fov = CAM_FOV_MID + (CAM_FOV_WIDE - CAM_FOV_MID) * e;
    }
    camera.updateProjectionMatrix();

    if (onPreloaderStage() && p >= 0.35 && !allPlanetsBuilt) buildRemainingPlanets();

    const orbitFade = onPreloaderStage()
      ? (p < 0.38 ? 0 : easeOutCubic(Math.min(1, (p - 0.38) / 0.45)))
      : (p < 0.40 ? 0 : easeOutCubic(Math.min(1, (p - 0.40) / 0.55)));
    orbitLines.forEach((o) => {
      const base = o.userData.baseOpacity || 0.14;
      o.visible = orbitFade > 0.02;
      if (o.material) o.material.opacity = base * orbitFade * (o.userData.hero ? 1.15 : 1);
    });

    syncSceneStarfield(onPreloaderStage() ? (p >= 0.42 ? 2 : 0) : 2);
    if (starField && starField.visible && starField.material.uniforms) {
      starField.material.uniforms.uFade.value = 0.72 + orbitFade * 0.28;
      if (!PRM) starField.rotation.y = p * 0.12;
    }

    if (sunMesh) {
      const pulse = (!onPreloaderStage() && p < 0.22) ? 1 + Math.sin(t * 0.0032) * 0.02 : 1;
      sunMesh.scale.setScalar(pulse);
    }

    if (onPreloaderStage()) {
      if (p >= 0.42) showOrbits = true;
      applyPreloaderEarthIsolation(p);
    }
    else if (sunGlow.length && p < 0.55) {
      sunGlow.forEach((sp, i) => {
        if (!sp.material) return;
        sp.visible = i === 0 || (i === 1 && perfTier === 'high');
        sp.material.opacity = i === 0 ? 0.22 : i === 1 ? 0.1 : 0.04;
      });
    }

    if (bloomPass) {
      bloomPass.radius = (perfTier === 'mid' ? 0.34 : 0.38) + orbitFade * 0.08;
      if (p < 0.55) {
        bloomPass.strength = perfTier === 'mid' ? 0.14 : 0.18;
        bloomPass.threshold = perfTier === 'mid' ? 0.88 : 0.84;
      }
    }

    if (renderer && p < 0.55) {
      renderer.toneMappingExposure = (perfTier === 'high' ? 1.12 : 1.08) + Math.min(p, 0.18) * 0.04;
    }

    if (radialBlurPass) {
      const dof = p < 0.55 ? (1 - p / 0.55) * 0.32 : 0;
      radialBlurPass.uniforms.uStrength.value = dof;
    }
  }

  // ── Per-frame position update from the ephemeris ───────────────────────────
  function updatePositions() {
    const jd = baseJd + dayOffset + scrollBias;
    BODIES.forEach((b) => {
      const g = meshes[b.id];
      if (!g) return;
      const ll = helioLonLat(b.id, jd);
      const p = scenePos(b.R, ll.lon, ll.lat);
      g.position.copy(p);
      g.userData.lon = ll.lon;
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
    // Wall-clock intro completion — tab hidden / throttled rAF must not stall Enter.
    if (introActive && introStart > 0 && meshes.earth) {
      if ((t - introStart) >= introDurationMs()) finishIntro();
    }
    if (!running || !inView) { lastT = t; return; }
    if (onPreloaderStage()) {
      preloaderFrameTick++;
      if (preloaderFrameTick % 2 !== 0) return;
    }
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

    // retrograde glow — throttled (ephemeris + sprite updates every 6 frames)
    retroTick++;
    if (retroTick % 6 === 0) {
      try {
        const E = window.AstroEphemeris;
        if (E && E.isRetrograde) {
          const jd = baseJd + dayOffset + scrollBias;
          const pulse = Math.sin(t * 0.002) * 0.15 + 1.0;
          BODIES.forEach((b) => {
            if (b.id === 'earth') return;
            const g = meshes[b.id];
            if (!g) return;
            const sprite = g.userData.retroSprite;
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
    }

    // sun surface animation + corona drift
    const sunT = t * 0.001;
    if (sunMaterial && sunMaterial.uniforms) sunMaterial.uniforms.uTime.value = sunT;
    if (sunCoronaMat && sunCoronaMat.uniforms) sunCoronaMat.uniforms.uTime.value = sunT;
    if (starField && starField.material.uniforms) starField.material.uniforms.uTime.value = t;
    if (sunDirLight && sunMesh) {
      sunDirLight.position.copy(sunMesh.position);
      if (sunDirLightTarget) {
        if (meshes.earth) sunDirLightTarget.position.copy(meshes.earth.position);
        else sunDirLightTarget.position.set(0, 0, 0);
      }
    }

    // HD Earth: feed sun direction every frame (shader ref may lag first compile).
    if (earthMat && sunMesh && meshes.earth) {
      const em = meshes.earth.userData.mesh;
      em.updateWorldMatrix(true, false);
      _earthWorld.setFromMatrixPosition(em.matrixWorld);
      _sunWorld.copy(sunMesh.position).sub(_earthWorld).normalize();
      earthUniforms.uSunDirWorld.value.copy(_sunWorld);
      _earthInv.setFromMatrix4(em.matrixWorld).invert();
      earthUniforms.uSunDir.value.copy(_sunWorld).applyMatrix3(_earthInv).normalize();
    }
    if (earthAtmoMat) earthAtmoMat.uniforms.uCamPos.value.copy(camera.position);

    if (sunCoronaGroup && !PRM) {
      sunCoronaGroup.rotation.z += dt * 0.08;
      sunCoronaGroup.rotation.y += dt * 0.025;
      const promPulse = 1 + Math.sin(t * 0.0022) * 0.06;
      sunCoronaGroup.children.forEach((sp, i) => {
        if (!sp.userData || sp.userData.baseScale == null) return;
        sp.scale.y = sp.userData.baseScale * promPulse * (1 + Math.sin(t * 0.0018 + i * 0.7) * 0.04);
        if (sp.material) sp.material.opacity = 0.42 + Math.sin(t * 0.0025 + i) * 0.08;
      });
    }
    if (sunGlow.length && !PRM && scaleLevel <= 2) {
      const corePulse = 1 + Math.sin(t * 0.0026) * 0.07;
      sunGlow.forEach((sp, i) => {
        if (!sp.visible || sp.userData.baseScale == null) return;
        const wobble = 1 + Math.sin(t * 0.002 + i * 1.1) * 0.035;
        sp.scale.set(sp.userData.baseScale * (i === 0 ? corePulse : wobble), sp.userData.baseScale * (i === 0 ? corePulse : wobble), 1);
      });
    }

    if (milkyWayDisk && milkyWayDisk.visible && !PRM) milkyWayDisk.rotation.y += dt * 0.0045;
    if (oortShell && oortShell.visible && !PRM) oortShell.rotation.y += dt * 0.0032;
    if (galacticCore && galacticCore.visible && !PRM && galacticCore.material && scaleLevel >= 5) {
      galacticCore.material.opacity = 0.64 + Math.sin(t * 0.0006) * 0.04;
      galacticCore.scale.setScalar(48 + Math.sin(t * 0.0005) * 1.2);
    }
    if (localStarsGroup && localStarsGroup.visible && !PRM && scaleLevel >= 4) {
      localStarsGroup.children.forEach((ch) => {
        if (!ch.material || ch.userData.baseOpa == null) return;
        const tw = ch.userData.twinkle || 1;
        ch.material.opacity = ch.userData.baseOpa * (0.94 + Math.sin(t * 0.001 * tw + tw * 4) * 0.05);
      });
    }
    if (catalogStarsGroup && catalogStarsGroup.visible && !PRM && catalogStarsGroup.material && scaleLevel >= 4) {
      const catBase = catalogStarsGroup.userData.baseOpa ?? 0.88;
      catalogStarsGroup.material.opacity = catBase * (0.96 + Math.sin(t * 0.0008) * 0.03);
    }
    if (cosmicField && cosmicField.visible && !PRM && scaleLevel >= 5) {
      cosmicField.children.forEach((ch) => {
        if (ch.userData && ch.userData.drift && ch.material) ch.material.rotation += ch.userData.drift;
        if (ch.userData && ch.userData.baseOpa != null && ch.material) {
          ch.material.opacity = ch.userData.baseOpa * (0.94 + Math.sin(t * 0.0005 + ch.id) * 0.04);
        }
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
      BODIES.forEach((b) => {
        const g = meshes[b.id];
        if (g && g.userData.mesh) g.userData.mesh.rotation.y += b.spin * dt * 0.25;
      });
      if (earthCloud) earthCloud.rotation.y += 0.55 * dt * 0.32;
      if (sunMesh) sunMesh.rotation.y += 0.04 * dt;
    }

    // Preloader hold: gentle system orbit while Enter awaits
    if (!PRM && onPreloaderStage() && !introActive && preloaderIntroFinished && !dragging) {
      BODIES.forEach((b) => {
        const g = meshes[b.id];
        if (g && g.userData.mesh) g.userData.mesh.rotation.y += b.spin * dt * 0.12;
      });
      if (sunMesh) sunMesh.rotation.y += 0.03 * dt;
      camAz += 0.028 * dt;
    }

    // scale-level camera transition (zoom dial) — cinematic crossfade + warp blur
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
      const zoomZ = scaleAnimFromLevel + (scaleAnimToLevel - scaleAnimFromLevel) * e;
      updateScaleVisualsContinuous(zoomZ);
      const fovFrom = scaleAnimFrom.radius < 12 ? CAM_FOV_CLOSE : (scaleAnimFromLevel >= 3 ? CAM_FOV_WIDE : CAM_FOV_MID);
      const fovTo = scaleAnimTo.radius < 12 ? CAM_FOV_CLOSE : (scaleAnimToLevel >= 3 ? CAM_FOV_WIDE : CAM_FOV_MID);
      camera.fov = fovFrom + (fovTo - fovFrom) * e;
      camera.updateProjectionMatrix();
      if (radialBlurPass) {
        radialBlurPass.uniforms.uStrength.value = Math.sin(p * Math.PI) * 0.22;
      }
      if (p >= 1) {
        if (radialBlurPass) radialBlurPass.uniforms.uStrength.value = 0;
        scaleAnimActive = false;
        if (scalePreset(scaleLevel).targetEarth) {
          const ep = scalePreset(scaleLevel);
          setEarthTerminatorCamera(ep.camRadius, ep.camEl);
        } else {
          const innerFocus = focusPlanetId && (focusPlanetId === 'mercury' || focusPlanetId === 'venus' || focusPlanetId === 'mars');
          camera.fov = innerFocus ? CAM_FOV_MID : (scaleLevel >= 2 ? CAM_FOV_WIDE : CAM_FOV_MID);
          camera.updateProjectionMatrix();
          updateDomLabels(1);
          updateScaleVisuals(scaleLevel);
        }
        if (focusPlanetId) forceResize();
      }
    } else if (scalePreset(scaleLevel).targetEarth && !introActive) {
      earthTargetVec(camTarget);
    }

    // intro: held Earth close-up on the terminator → Earth+Moon → full system (Earth-FIRST)
    if (introActive) {
      if (!meshes.earth || introStart <= 0) {
        introActive = false;
        syncPreloaderIntroClass(false);
        if (onPreloaderStage() && preloaderIntroScheduled && !preloaderIntroFinished) recoverPreloaderIntro();
      }
      else {
        const introMs = introDurationMs();
        const elapsed = t - introStart;
        const p = Math.min(1, elapsed / introMs);
        if (onPreloaderStage()) {
          if (p < 0.18) {
            setEarthTerminatorCamera(3.2, 6 * D2R);
          } else if (p < 0.45) {
            const e = easeInOut((p - 0.18) / 0.27);
            setEarthTerminatorCamera(3.2 + (6.5 - 3.2) * e, (6 * D2R) + (11 * D2R - 6 * D2R) * e);
          } else {
            const e = easeOutCubic((p - 0.45) / 0.55);
            const earthPos = meshes.earth.position;
            const end = scalePreset(2);
            setEarthTerminatorCamera(6.5, 11 * D2R);
            const termAz = camAz, termEl = camEl, termRad = camRadius;
            camTarget.lerpVectors(earthPos, ORIGIN, e);
            camRadius = termRad + (preloaderSystemCamRadius() - termRad) * e;
            camEl = termEl + (end.camEl - termEl) * e;
            camAz = termAz * (1 - e) + end.camAz * e;
          }
        } else if (p < 0.18) {
          setEarthTerminatorCamera(2.35, 4 * D2R);
        } else if (p < 0.55) {
          const e = easeInOut((p - 0.18) / 0.37);
          setEarthTerminatorCamera(2.35 + (6.5 - 2.35) * e, (4 * D2R) + (12 * D2R - 4 * D2R) * e);
        } else {                                 // STAGE 2 hero replay — Earth → system overview
          const e = easeOutCubic((p - 0.55) / 0.45);
          const earthPos = meshes.earth.position;
          const end = scalePreset(2);
          setEarthTerminatorCamera(6.5, 11 * D2R);
          const termAz = camAz, termEl = camEl, termRad = camRadius;
          camTarget.lerpVectors(earthPos, ORIGIN, e);
          camRadius = termRad + (end.camRadius - termRad) * e;
          camEl = termEl + (end.camEl - termEl) * e;
          camAz = termAz * (1 - e) + end.camAz * e;
        }
        if (bloomPass && composer) {
          if (p < 0.55) {
            bloomPass.strength = perfTier === 'mid' ? 0.14 : 0.18;
            bloomPass.threshold = perfTier === 'mid' ? 0.88 : 0.84;
          } else {
            const e2 = easeOutCubic((p - 0.55) / 0.45);
            bloomPass.strength = (perfTier === 'mid' ? 0.14 : 0.18) + e2 * 0.04;
            bloomPass.threshold = perfTier === 'mid' ? 0.88 - e2 * 0.04 : 0.84 - e2 * 0.04;
          }
        }
        if (renderer) {
          renderer.toneMappingExposure = (perfTier === 'high' ? 1.12 : 1.08) + Math.min(p, 0.55) * 0.06;
        }
        applyIntroVisuals(p, t);
        if (window.__orreryPreloaderOwns) updateIntroProgress(p);
        updateDomLabels(p);
        if (elapsed >= introMs) finishIntro();
      }
    } else if (!dragging && !scaleAnimActive && !PRM && !onPreloaderStage() && (t - userTouched) > 1200) {
      camAz += 0.05 * dt; // gentle auto-orbit kicks in fast so the model is never visually frozen
    }
    if (!introActive && !scaleAnimActive) clampCamToLevel();
    applyEclipseVisuals();
    applyCamera();

    // slow asteroid belt drift
    if (asteroidPoints && showAsteroids && !PRM) {
      asteroidPoints.rotation.y += dt * 0.012;
    }

    // DOM labels (preferred) or canvas sprites as fallback
    updateFocusHighlight(t);
    if (!introActive) updateDomLabels(1);
    BODIES.forEach((b) => {
      const lab = labels[b.id]; if (!lab) return;
      lab.visible = !useDomLabels && showLabels && !introActive && scaleLevel <= 2;
      if (lab.visible) {
        const m = meshes[b.id];
        if (!m) return;
        lab.position.set(m.position.x, m.position.y + b.size + 0.9, m.position.z);
        const d = camera.position.distanceTo(lab.position);
        const s = Math.max(0.04, d * 0.018);
        lab.scale.set(s * lab.userData.aspect, s, 1);
      }
    });
    if (onPreloaderStage()) {
      const ip = introActive ? Math.min(1, (t - introStart) / introDurationMs()) : null;
      applyPreloaderEarthIsolation(ip);
    } else {
      orbitLines.forEach((o) => { o.visible = showOrbits && scaleLevel <= 3; });
    }

    // Bloom composer tints transparent pixels dark — skip during preloader for one shared sky.
    if (composer && !onPreloaderStage()) composer.render();
    else renderer.render(scene, camera);
  }

  // ── UI date readout (mirrors canvas behaviour) ─────────────────────────────
  function updateDateUI() {
    const el = document.getElementById('orrery-date-display'); if (!el) return;
    const d = new Date(baseNowMs + (dayOffset + scrollBias) * 86400000);
    const str = d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    const off = dayOffset + scrollBias;
    const tag = Math.abs(off) < 0.5 ? ' · now' : (off > 0 ? ` · +${Math.round(off)}d` : ` · ${Math.round(off)}d`);
    el.textContent = str + tag;

    const scrub = document.getElementById('orrery-scrub');
    if (scrub && document.activeElement !== scrub) {
      const rounded = Math.round(off);
      if (parseInt(scrub.value, 10) !== rounded) scrub.value = String(rounded);
    }

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
      let phaseLabel = 'New Moon';
      for (let i = 0; i < PHASES.length - 1; i++) {
        if (phase >= PHASES[i][0] && phase < PHASES[i + 1][0]) { phaseLabel = PHASES[i][1]; break; }
      }
      const moonEl = document.getElementById('orrery-moon-phase');
      if (moonEl) moonEl.textContent = phaseLabel;
    } catch (e) { /* moon phase is optional */ }

    try {
      const jdTick = baseJd + dayOffset + scrollBias;
      document.dispatchEvent(new CustomEvent('ap-sky-tick', { detail: { jd: jdTick } }));
    } catch (e) { /* optional sync */ }
  }

  // ── Sizing / observers ─────────────────────────────────────────────────────
  function removeRadialBlurPass() {
    if (!composer || !radialBlurPass) return;
    const idx = composer.passes.indexOf(radialBlurPass);
    if (idx >= 0) composer.passes.splice(idx, 1);
    try { radialBlurPass.dispose(); } catch (e) { /* optional */ }
    radialBlurPass = null;
  }

  function tryCreateRadialBlurPass(aspect) {
    try {
      const pass = new ShaderPass(RadialBlurShader);
      pass.uniforms.uAspect.value = aspect || 1;
      pass.uniforms.uStrength.value = 0;
      return pass;
    } catch (e) {
      console.warn('[orrery] radial blur shader unavailable:', e.message);
      return null;
    }
  }

  function canvasBox() {
    const fallback = 560;
    const probe = (wrap && wrap.clientWidth > 0) ? wrap : canvas;
    if (window.RafCore && window.RafCore.canvasCssSize) {
      const box = window.RafCore.canvasCssSize(canvas, fallback);
      if (box.w > 1 && box.h > 1) return box;
      const wrapBox = wrap ? window.RafCore.canvasCssSize(wrap, fallback) : null;
      if (wrapBox && wrapBox.w > 1 && wrapBox.h > 1) return wrapBox;
    }
    const r = probe.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width) || probe.clientWidth || fallback);
    const h = Math.max(1, Math.round(r.height) || probe.clientHeight || w);
    return { w, h };
  }

  function resize() {
    if (!renderer || !canvas) return;
    const box = canvasBox();
    const w = box.w;
    const h = box.h;
    const dpr = orreryDPR();
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    if (composer) {
      composer.setPixelRatio(dpr);
      composer.setSize(w, h);
    }
    if (bloomPass) bloomPass.resolution.set(w, h);
    if (radialBlurPass) radialBlurPass.uniforms.uAspect.value = w / Math.max(h, 1);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }

  function forceResize() {
    resize();
    if (renderer && scene && camera) {
      applyCamera();
      if (composer && !onPreloaderStage()) composer.render();
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
    try {
      canvas.setAttribute('tabindex', '0');
      if (!canvas.getAttribute('aria-label')) {
        canvas.setAttribute('aria-label', 'The Living Orrery — drag to scrub time, arrow keys to step days, 0–6 for zoom scale');
      }
    } catch (_) {}
    const onKey = (e) => {
      if (onPreloaderStage() && introActive) return;
      const k = e.key;
      if (k === 'ArrowLeft') {
        scrubDays(-1);
        e.preventDefault();
      } else if (k === 'ArrowRight') {
        scrubDays(1);
        e.preventDefault();
      } else if (k === 'ArrowUp') {
        const p = scalePreset(scaleLevel);
        camRadius = Math.max(p.camMin, camRadius * 0.92);
        userTouched = performance.now();
        e.preventDefault();
      } else if (k === 'ArrowDown') {
        const p = scalePreset(scaleLevel);
        camRadius = Math.min(p.camMax, camRadius * 1.08);
        userTouched = performance.now();
        e.preventDefault();
      } else if (k >= '0' && k <= '6') {
        applyScalePreset(parseInt(k, 10), true);
        e.preventDefault();
      } else if (k === ' ' || k === 'Spacebar') {
        setSpeed(daysPerSec === 0 ? 1 : 0);
        e.preventDefault();
      }
    };
    canvas.addEventListener('keydown', onKey);
    canvas._orreryKeyHandler = onKey;
    const onDown = (e) => {
      if (onPreloaderStage() && introActive) return;
      dragging = true; scrollDriveLocked = true; const p = pt(e); lastX = downX = p.x; lastY = downY = p.y; userTouched = performance.now(); introActive = false; syncPreloaderIntroClass(false); daysPerSec = 0; flicking = false; scrubVel = 0; try { canvas.style.cursor = 'grabbing'; } catch (_) {}
    };
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
      if (onPreloaderStage() && introActive) return;
      const p = scalePreset(scaleLevel);
      camRadius = Math.max(p.camMin, Math.min(p.camMax, camRadius * (1 + Math.sign(e.deltaY) * 0.08)));
      userTouched = performance.now();
      introActive = false;
      syncPreloaderIntroClass(false);
      scaleAnimActive = false;
    };
    const onDbl = (e) => {
      if (onPreloaderStage() && introActive) return;
      const id = resolvePickId(pt(e));
      if (!id) return;
      e.preventDefault();
      focusPlanet(id);
    };
    canvas.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    canvas.addEventListener('dblclick', onDbl);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas._orreryHandlers = { onMove, onUp };
    canvas._orreryDblHandler = onDbl;
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
  function resolvePickId(p) {
    const r = canvas.getBoundingClientRect();
    ndc.x = (p.x / r.width) * 2 - 1; ndc.y = -(p.y / r.height) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
    const targets = BODIES.map((b) => meshes[b.id] && meshes[b.id].userData.mesh).filter(Boolean);
    if (sunMesh) targets.push(sunMesh);
    if (moonMesh) targets.push(moonMesh);
    const hit = raycaster.intersectObjects(targets, false)[0];
    if (!hit) return null;
    if (hit.object === sunMesh) return 'sun';
    if (hit.object === moonMesh) return 'moon';
    const b = BODIES.find((x) => meshes[x.id].userData.mesh === hit.object);
    return b ? b.id : null;
  }
  function pick(p) {
    const id = resolvePickId(p);
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
    const preloaderMode = !!window.__orreryPreloaderOwns;

    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !preloaderMode,
      alpha: true,
      premultipliedAlpha: true,
      powerPreference: preloaderMode ? 'default' : 'high-performance',
      preserveDrawingBuffer: !preloaderMode,
    });
    renderer.setClearColor(0x000000, 0);
    canvas.style.background = 'transparent';
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = perfTier === 'high' ? 1.14 : 1.08;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, 1, 0.05, 8000);
    texLoader = new THREE.TextureLoader();

    // Bloom composer — defer during preloader to cut GPU memory; built in settleFromIntro.
    if (!preloaderMode && !PRM && perfTier !== 'low') {
      ensureComposer();
    }

    const now = new Date();
    baseNowMs = now.getTime();
    baseJd = window.AstroEphemeris.julianDay(now.getFullYear(), now.getMonth() + 1, now.getDate(), now.getHours(), now.getMinutes(), 0);

    if (!preloaderMode && !usesPageStarfield()) buildStars();
    buildSun(preloaderMode);
    buildPlanets(preloaderMode ? { earthOnly: true } : undefined);
    if (!preloaderMode) {
      buildAsteroids();
      buildGalaxyLayers();
    }
    // buildHalley();  // retired — the illustrative comet + its blue dashed orbit were
    //                    cool-blue clutter (off the warm palette). halleyGroup stays null;
    //                    updateHalley() and all visibility paths are null-guarded.
    tuneSunGlowForComposer(perfTier);
    updatePositions();
    if (preloaderMode) {
      scaleLevel = 0;
      introActive = false;
      updateScaleVisuals(0);
      tunePreloaderSunGlow(true);
      setEarthTerminatorCamera(3.2, 6 * D2R);
      scaleAnimActive = false;
      applyIntroVisuals(0, 0);
      applyCamera();
    } else {
      settleToSystemHeroFrame(false);
    }
    resize();
    preloadTextures();

    if (PRM) {
      introActive = false;
      if (!preloaderMode) {
        setDefaultEarthFrame();
        updateScaleHUD();
      } else {
        camTarget.set(0, 0, 0);
        camRadius = 48;
        camEl = 26 * D2R;
        camAz = -0.6;
        applyCamera();
      }
    }

    ensureDomLabels();
    updateScaleHUD();
    bindControls();
    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(resize);
      ro.observe(canvas);
      if (wrap) ro.observe(wrap);
      canvas._orreryRO = ro;
    }
    window.addEventListener('resize', resize);
    if (window.visualViewport) {
      const vvRefit = () => requestAnimationFrame(resize);
      window.visualViewport.addEventListener('resize', vvRefit, { passive: true });
      window.visualViewport.addEventListener('scroll', vvRefit, { passive: true });
      canvas._orreryVV = vvRefit;
    }
    if ('IntersectionObserver' in window && !window.__orreryPreloaderOwns) {
      const io = new IntersectionObserver((ents) => { inView = ents[0].isIntersecting; }, { threshold: 0.01 });
      io.observe(canvas); canvas._orreryIO = io;
    } else {
      inView = true;
    }
    document.addEventListener('visibilitychange', () => { running = !document.hidden; });
    canvas.addEventListener('webglcontextlost', (e) => {
      try { e.preventDefault(); } catch (_) {}
      console.warn('[orrery] WebGL context lost — falling back to canvas orrery');
      fallbackToCanvas(canvas);
    }, false);

    // Pre-compile shaders + warm the bloom composer NOW (while the preloader is still
    // static) so the first animated intro frame doesn't hitch on a heavy program link.
    try {
      if (renderer.compile) renderer.compile(scene, camera);
      if (composer && !onPreloaderStage()) composer.render();
      else renderer.render(scene, camera);
    } catch (e) {
      if (composer && radialBlurPass) {
        console.warn('[orrery] radial blur broke composer — disabling pass:', e.message);
        removeRadialBlurPass();
        try { composer.render(); } catch (e2) {
          console.warn('[orrery] post-processing unavailable after radial blur removal:', e2.message);
          composer = null;
          bloomPass = null;
        }
      }
    }

    lastT = 0; raf = requestAnimationFrame(frame);
    webglBooted = true;
  }

  function setSpeed(s) {
    // button values: 0 pause, 1 (1 day/s), 30 (30 day/s), 365 (~1 year/s)
    daysPerSec = Number(s) || 0;
    flicking = false;   // a speed button is a constant rate, not a decaying flick
    if (daysPerSec !== 0) { introActive = false; scrollDriveLocked = true; }
    try {
      document.dispatchEvent(new CustomEvent('orrery-speed-change', { detail: { speed: daysPerSec } }));
    } catch (e) { /* optional */ }
  }
  function getDate() { return new Date(baseNowMs + (dayOffset + scrollBias) * 86400000); }
  function snapToNow() {
    const now = new Date();
    const E = window.AstroEphemeris;
    baseNowMs = now.getTime();
    baseJd = E.julianDay(now.getFullYear(), now.getMonth() + 1, now.getDate(), now.getHours(), now.getMinutes(), 0);
    dayOffset = 0;
    scrollBias = 0;
    scrollDriveLocked = false;
    daysPerSec = 0;
    flicking = false;
    needRecompute = true;
    introActive = false;
    syncHeroReplayClass(false);
    updateDateUI();
  }
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
  function getDayOffset() { return dayOffset + scrollBias; }
  function setTimelineDays(days) {
    dayOffset = Number(days) || 0;
    scrollBias = 0;
    scrollDriveLocked = true;
    daysPerSec = 0;
    flicking = false;
    needRecompute = true;
    introActive = false;
    syncHeroReplayClass(false);
    updateDateUI();
  }
  function focusPlanet(id) {
    if (!id || destroyed) return;
    id = String(id).toLowerCase();
    userTouched = performance.now();
    introActive = false;
    syncPreloaderIntroClass(false);
    syncHeroReplayClass(false);
    daysPerSec = 0;
    flicking = false;
    scrollDriveLocked = true;

    if (id === 'earth') {
      setFocusHighlight('earth');
      applyScalePreset(0, true);
      return;
    }

    if (!allPlanetsBuilt) {
      buildRemainingPlanets();
      needRecompute = true;
      updatePositions();
    }

    if (id === 'sun') {
      setFocusHighlight('sun');
      applyScalePreset(1, true);
      return;
    }

    if (id === 'moon') {
      setFocusHighlight('moon');
      applyScalePreset(0, true);
      return;
    }

    const body = BODIES.find((b) => b.id === id);
    const g = meshes[id];
    if (!body || !g) return;

    const inner = (id === 'mercury' || id === 'venus' || id === 'mars');
    const preset = scalePreset(inner ? 1 : 2);
    scaleLevel = preset.id;
    updateScaleHUD();
    updateScaleVisuals(scaleLevel);

    scaleAnimFrom.radius = camRadius;
    scaleAnimFrom.el = camEl;
    scaleAnimFrom.az = camAz;
    scaleAnimFrom.tx = camTarget.x;
    scaleAnimFrom.ty = camTarget.y;
    scaleAnimFrom.tz = camTarget.z;

    const pos = g.position;
    const orbitR = Math.hypot(pos.x, pos.z) || body.R;
    scaleAnimTo.radius = inner ? Math.max(body.size * 7.5, 12) : Math.max(orbitR * 0.44, preset.camRadius * 0.4);
    scaleAnimTo.el = inner ? 16 * D2R : preset.camEl;
    scaleAnimTo.az = Math.atan2(pos.z, pos.x);
    scaleAnimTo.tx = pos.x;
    scaleAnimTo.ty = pos.y;
    scaleAnimTo.tz = pos.z;

    setFocusHighlight(id);
    scaleAnimActive = true;
    scaleAnimStart = performance.now();
    camera.fov = inner ? CAM_FOV_MID : CAM_FOV_WIDE;
    camera.updateProjectionMatrix();
  }

  function destroy() {
    destroyed = true; if (raf) cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    if (canvas && canvas._orreryHandlers) { window.removeEventListener('pointermove', canvas._orreryHandlers.onMove); window.removeEventListener('pointerup', canvas._orreryHandlers.onUp); }
    if (canvas && canvas._orreryKeyHandler) canvas.removeEventListener('keydown', canvas._orreryKeyHandler);
    if (canvas && canvas._orreryDblHandler) canvas.removeEventListener('dblclick', canvas._orreryDblHandler);
    if (canvas && canvas._orreryRO) canvas._orreryRO.disconnect();
    if (canvas && canvas._orreryIO) canvas._orreryIO.disconnect();
    try { renderer && renderer.dispose(); } catch (e) {}
  }

  window.Orrery3D = {
    init, destroy, setSpeed, getDate, setDate, jumpTo, scrubDays, getDayOffset, setTimelineDays, snapToNow,
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
    startPreloaderIntro(fn) {
      if (onPreloaderStage()) {
        preloaderIntroScheduled = true;
        preloaderIntroFinished = false;
        if (preloaderIntroWatchdog) clearTimeout(preloaderIntroWatchdog);
        preloaderIntroWatchdog = setTimeout(() => {
          preloaderIntroWatchdog = null;
          if (!destroyed && onPreloaderStage() && !preloaderIntroFinished) recoverPreloaderIntro();
        }, introDurationMs() + 2500);
      }
      onIntroDone = fn || null;
      restartIntro();
    },
    skipIntro,
    settleFromIntro,
    isIntroActive() { return introActive; },
    isIntroPending() {
      return onPreloaderStage() && !preloaderIntroFinished
        && (preloaderIntroScheduled || introActive);
    },
    hasIntroCompleted() {
      return !onPreloaderStage() || preloaderIntroFinished;
    },
    getIntroStartedAt() { return introStartedAt; },
    getIntroDurationMs() { return introDurationMs(); },
    getIntroProgress() {
      if (preloaderIntroScheduled) return 0;
      if (introActive && introStart > 0) {
        return Math.min(1, (performance.now() - introStart) / introDurationMs());
      }
      return (onPreloaderStage() && !preloaderIntroFinished) ? 0 : 1;
    },
    whenReady() { return texturesReady ? Promise.resolve() : texturesReadyPromise; },
    whenEarthReady() { return earthMapReady ? Promise.resolve() : earthMapReadyPromise; },
    getScaleLevel() { return scaleLevel; },
    setScaleLevel(n) { applyScalePreset(n, true); },
    startScaleJourney,
    cancelScaleJourney,
    isJourneyActive() { return journeyActive; },
    focusPlanet,
    set onIntroDone(fn) {
      onIntroDone = fn;
      if (PRM && fn && !introActive && !preloaderIntroScheduled) { onIntroDone = null; fn(); }
    },
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
      const box = (window.RafCore && window.RafCore.canvasCssSize)
        ? window.RafCore.canvasCssSize(canvas, 560)
        : { w: canvas.clientWidth || 560, h: canvas.clientHeight || canvas.clientWidth || 560 };
      const cssW = box.w;
      const cssH = box.h;
      const exportDpr = Math.min(orreryDPR() * mult, 3);
      try {
        renderer.setPixelRatio(exportDpr);
        renderer.setSize(cssW, cssH, false);
        if (composer) {
          composer.setPixelRatio(exportDpr);
          composer.setSize(cssW, cssH);
        }
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
