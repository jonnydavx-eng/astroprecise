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

// Finish pass (always the last pass before OutputPass): a hash-based ordered dither
// that kills banding in the near-black void gradients, a wide soft vignette, and a
// whisper of a grade (teal-leaning shadows → brass-leaning highlights). STATIC by
// design — no time uniform, so nothing shimmers or crawls frame to frame.
const FinishShader = {
  name: 'FinishShader',
  uniforms: {
    tDiffuse: { value: null },
    uVignette: { value: 0.15 },
    uGrade: { value: 1.0 },
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
    uniform float uVignette;
    uniform float uGrade;
    varying vec2 vUv;
    void main() {
      vec4 tex = texture2D(tDiffuse, vUv);
      vec3 col = tex.rgb;
      float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
      // (a) static screen-space hash dither, darks only. We run BEFORE OutputPass
      // (linear light, pre-ACES): the ACES toe compresses dark steps ~4×, so
      // 0.66/255 linear lands at ~±1.5 display steps in the void gradients; the
      // smoothstep fades it out by the midtones so planet discs stay noise-free.
      float h = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
      col += (h - 0.5) * (0.66 / 255.0) * (1.0 - smoothstep(0.02, 0.30, lum));
      // (b) wide soft vignette — anchors the frame without darkening the hero
      float vig = 1.0 - uVignette * smoothstep(0.35, 0.85, length(vUv - 0.5));
      // (c) whisper grade: teal-leaning shadows → brass-leaning highlights (±2%)
      vec3 tint = mix(vec3(0.985, 1.005, 1.02), vec3(1.02, 1.005, 0.982), smoothstep(0.05, 0.6, lum));
      col *= mix(vec3(vig), tint * vig, uGrade);
      gl_FragColor = vec4(col, tex.a);
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

  function isAwardMode() {
    return !!(document.body && document.body.classList.contains('ap-award-511'));
  }

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
    mercury: { roughness: 0.82, metalness: 0.0,  atmo: 0x9a9088, atmoS: 1.02, atmoI: 0.14, rim: 0x6a8090 },
    venus:   { roughness: 0.72, metalness: 0.0,  atmo: 0xffc878, atmoS: 1.038, atmoI: 0.48, rim: 0xffa060 },
    earth:   { roughness: 0.76, metalness: 0.04, atmo: 0x3d8fff, atmoS: 1.018, atmoI: 1.0, rim: 0x5090d8 },
    mars:    { roughness: 0.78, metalness: 0.02, atmo: 0xff5533, atmoS: 1.032, atmoI: 0.42, rim: 0xc06040 },
    jupiter: { roughness: 0.86, metalness: 0.0,  atmo: 0xe0a858, atmoS: 1.018, atmoI: 0.30, rim: 0xd09050 },
    saturn:  { roughness: 0.86, metalness: 0.0,  atmo: 0xf0d8a0, atmoS: 1.014, atmoI: 0.24, rim: 0xc8a868 },
    uranus:  { roughness: 0.68, metalness: 0.0,  atmo: 0x7ec8e8, atmoS: 1.022, atmoI: 0.26, rim: 0x68b8d8 },
    neptune: { roughness: 0.66, metalness: 0.0,  atmo: 0x5a8fd8, atmoS: 1.022, atmoI: 0.28, rim: 0x4888c8 },
  };

  // ── Module state ───────────────────────────────────────────────────────────
  let renderer, scene, camera, canvas, wrap;
  let raf = null, destroyed = false, running = true, inView = true;

  let texLoader;
  const meshes = {};          // id → THREE.Object3D (planet group)
  let earthCloud = null, moonGroup = null, moonMesh = null, moonCraterGroup = null, moonHaloMesh = null;
  let earthOrbitGroup = null, earthDebrisPoints = null, leoOrbitRing = null, geoOrbitRing = null;
  const leoCraft = [];
  let sunMesh = null, sunGlow = [];
  const orbitLines = [];
  const labels = {};
  let starField = null;
  let starFieldFar = null;   // v577: second, more distant Points shell — its smaller
                            // angular shift under the idle-breathe camera gives real
                            // depth parallax against the near starField shell.
  let milkyWayBand = null;  // v577: faint great-circle band of points (a whisper of the
                            // galactic plane) visible at hero/system scales.
  let sunMaterial = null, sunCoronaGroup = null, sunCoronaMesh = null, sunCoronaMat = null;
  let sunPromGroup = null, sunPointLight = null, sunDirLight = null, sunDirLightTarget = null, hemiLight = null;
  let detailLightingUser = null; // null = auto, true = force detail, false = force cinematic glow

  let composer = null;
  let bloomPass = null;
  let radialBlurPass = null;
  let finishPass = null;      // static dither + vignette + whisper grade (last before OutputPass)
  let perfTier = 'high';
  let allPlanetsBuilt = false;
  let sunVisualsMinimal = false;
  let focusPlanetId = null;
  let focusPlanetUntil = 0;
  let focusFrameId = null;      // v576: persists past the 2.8s highlight — camera framing ownership
  let moonFrameActive = false;  // v576: Earth+Moon shared frame from focusPlanet('moon')
  // ── Aspect view (focusAspect) — HONEST geocentric ecliptic zodiac ring ─────────
  // The 3D scene's orbit radii are visually COMPRESSED, so an angle between two scene
  // bodies is geometrically false. focusAspect instead draws an Earth-centred zodiac
  // ring where each marker sits at the body's TRUE geocentric ecliptic longitude, and
  // draws the aspect chord between those two ring markers only. The subtended angle is
  // therefore the real aspect angle. See updateAspectView / buildAspectView below.
  let aspectGroup = null;       // THREE.Group holding ring + ticks + markers + chord + labels
  let aspectActive = false;
  let aspectUntil = 0;          // auto-retire time (parallels focusPlanetUntil)
  let aspectStart = 0;          // for the gentle fade-in
  let aspectData = null;        // { idA, idB, aLon, bLon, angle, aspect, ringR, sprites... }
  const ASPECT_RING_R = 6.4;    // ring radius in scene units — reads clearly around Earth
  // Framing hold targets so the idle-breathe logic keeps the ring in view (not the
  // tight Earth terminator frame). Set by frameAspectCamera; read in the idle branch.
  let aspectFrameRadius = ASPECT_RING_R * 3.1;
  const aspectFrameEl = 58 * (Math.PI / 180);
  const aspectFrameAz = -0.6;
  // ── Portrait mode (v581) ─────────────────────────────────────────────────────
  // Additive, reversible still-capture mode used ONLY by the graphics-overhaul
  // capture harness (never the normal homepage boot). While portraitMode is on,
  // the per-frame updaters are guarded so they cannot re-show distractors, re-set
  // fog, or drift the camera off the framed planet. exitPortrait() restores state.
  let portraitMode = false;
  let portraitId = null;              // currently framed body id (or 'earthmoon')
  let portraitSun = false;            // capture-only: frame the SUN itself (light source) as a golden hero disc
  let portraitMoonOnly = false;       // capture-only: frame the MOON alone (Cancer's ruler) as a lit gibbous disc
  let portraitRestore = null;         // snapshot for a clean, non-destructive exit
  let portraitAtmoBase = null;        // per-body atmosphere-intensity baseline (restore)
  let moonFrameAzBase = 0;
  let focusBloomBase = 0.2;
  let sunFocusRing = null;
  let moonFocusRing = null;
  let focusOrbitsRestore = null;
  let dragMode = 'scrub';
  let pinchStartDist = 0;
  let pinchStartRadius = 48;
  const activePointers = new Map();

  // ── HD Earth (shader-injected) state ──────────────────────────────────────
  let earthMat = null;        // hero surface MeshStandardMaterial (onBeforeCompile-patched)
  let earthAtmoMat = null;    // dedicated Rayleigh atmosphere shell material (inner)
  let earthAtmoMatOuter = null; // second, softer scatter shell (sunset wrap past the terminator)
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
    try {
      if (window.RafCore && window.RafCore.tier) return window.RafCore.tier;
      if (navigator.deviceMemory != null && navigator.deviceMemory <= 4) return 'low';
      if (navigator.hardwareConcurrency != null && navigator.hardwareConcurrency <= 4) return 'low';
      if (navigator.deviceMemory != null && navigator.deviceMemory <= 6) return 'mid';
      if (navigator.hardwareConcurrency != null && navigator.hardwareConcurrency <= 6) return 'mid';
    } catch (e) { /* fall through */ }
    return 'high';
  }

  function orreryDPR() {
    const pre = onPreloaderStage();
    const cap = pre
      ? (perfTier === 'low' ? 1 : perfTier === 'mid' ? 1.1 : 1.6)
      : (perfTier === 'low' ? 1.25 : perfTier === 'mid' ? 2 : 2.5);
    if (window.RafCore && window.RafCore.hdDPR) return window.RafCore.hdDPR(cap);
    const real = window.devicePixelRatio || 1;
    return Math.min(real, cap);
  }

  function sphereSegs(hero) {
    if (hero) {
      if (onPreloaderStage()) return perfTier === 'high' ? 112 : perfTier === 'mid' ? 64 : 48;
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
  let preloaderCosmicJourney = false;
  let cosmicFlightToolActive = false;
  let lastCosmicFlightChapterLevel = '';
  let scaleAnimDurationMs = 1400;
  const INTRO_MS = 6800;
  const PRELOADER_COSMIC_MS_DESKTOP = 26000;
  const PRELOADER_COSMIC_MS_MOBILE = 19000;
  const PRELOADER_COSMIC_HOLD_FRAC = 0.11;
  const PRELOADER_COSMIC_LAND_FRAC = 0.14;
  const COSMIC_DESCENT_KEYS = [
    { t: 0.00, z: 1.00 },
    { t: 0.08, z: 0.985 },
    { t: 0.16, z: 0.925 },
    { t: 0.24, z: 0.78 },
    { t: 0.36, z: 0.64 },
    { t: 0.44, z: 0.55 },
    { t: 0.48, z: 0.50 },
    { t: 0.58, z: 0.38 },
    { t: 0.68, z: 0.26 },
    { t: 0.78, z: 0.16 },
    { t: 0.88, z: 0.08 },
    { t: 0.96, z: 0.02 },
    { t: 1.00, z: 0.00 },
  ];
  const PRELOADER_CHAPTERS = [
    { t: 0.00, title: 'The deep field', sub: 'Light left its stars long before anyone asked your name.' },
    { t: 0.10, title: 'Stardust lineage', sub: 'Every atom in you was forged in a crucible like this one.' },
    { t: 0.22, title: 'Galactic drift', sub: 'The Milky Way turns — slow as precession, old as the myths.' },
    { t: 0.36, title: 'The living ecliptic', sub: 'Along this belt the zodiac degrees have moved for millennia.' },
    { t: 0.50, title: 'Transpersonal tides', sub: 'Neptune, Uranus, Pluto — slow giants that reshape whole generations.' },
    { t: 0.62, title: 'Gas-giant thrones', sub: 'Jupiter expands what Saturn tests; Saturn times what Jupiter promises.' },
    { t: 0.74, title: 'Personal sky', sub: 'Sun, Moon, Mercury, Venus, Mars — the voices in your daily chart.' },
    { t: 0.84, title: 'Blue marble', sub: 'A thin blue atmosphere and a silver Moon.' },
    { t: 0.93, title: 'Your meridian', sub: 'The eastern horizon at your coordinates — where your rising sign breaks.' },
  ];
  let preloaderChapterKey = '';
  // Story narration is OPT-IN. Default = silent cinematic fly-in (honest neutral
  // labels). The poetic PRELOADER_CHAPTERS only show when the user enables it.
  let narrateJourney = false;
  try { narrateJourney = (localStorage.getItem('ap_narrate_journey') === '1'); } catch (e) {}
  if (PRM) narrateJourney = false;
  let lastIntroP = 0;
  const PRELOADER_SYSTEM_CAM_DESKTOP = 28;
  const PRELOADER_SYSTEM_CAM_MOBILE = 19;
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

  function preloaderCosmicOpenZ() {
    return 6;
  }

  function preloaderCosmicDescentZ(descentP, openZ) {
    const dp = Math.max(0, Math.min(1, descentP));
    let i = 0;
    while (i < COSMIC_DESCENT_KEYS.length - 2 && COSMIC_DESCENT_KEYS[i + 1].t < dp) i++;
    const a = COSMIC_DESCENT_KEYS[i];
    const b = COSMIC_DESCENT_KEYS[i + 1];
    const span = b.t - a.t || 1;
    const seg = easeInOut((dp - a.t) / span);
    const zNorm = a.z + (b.z - a.z) * seg;
    return openZ * zNorm;
  }

  function preloaderCosmicDurationMs() {
    return isPreloaderMobile() ? PRELOADER_COSMIC_MS_MOBILE : PRELOADER_COSMIC_MS_DESKTOP;
  }

  function introDurationMs() {
    return onPreloaderStage() ? preloaderCosmicDurationMs() : INTRO_MS;
  }

  function syncPreloaderCosmicClass(active) {
    try {
      const pre = document.getElementById('preloader');
      if (pre) pre.classList.toggle('preloader--cosmic', !!active);
    } catch (_) {}
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
    if (meshes.earth) meshes.earth.visible = true;
    try { document.dispatchEvent(new CustomEvent('ap-earth-texture-ready')); } catch (_) {}
    if (earthMapReadyResolve) { earthMapReadyResolve(); earthMapReadyResolve = null; }
  }

  function syncPreloaderWarpClass(active) {
    try {
      const pre = document.getElementById('preloader');
      if (pre) pre.classList.toggle('preloader--warp', !!active);
    } catch (_) {}
  }

  function preloaderChapterForProgress(introP) {
    let ch = PRELOADER_CHAPTERS[0];
    for (let i = 0; i < PRELOADER_CHAPTERS.length; i++) {
      if (introP >= PRELOADER_CHAPTERS[i].t) ch = PRELOADER_CHAPTERS[i];
    }
    return ch;
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
      // OrbitLab 2026-07-05 port: oblique gallery view (36°) — the barred spiral reads as
      // a galaxy portrait instead of a flat top-down disk.
      camRadius: 680, camMin: 460, camMax: 1080, camEl: 36 * D2R, camAz: 0.72, targetEarth: false,
      honesty: 'Gaia-style barred spiral · 4 arms · Sun on Orion–Cygnus spur (~26 kly)' },
    { id: 6, name: 'Cosmos', hud: 'Deep field',
      camRadius: 1950, camMin: 1300, camMax: 3000, camEl: 58 * D2R, camAz: 0.05, targetEarth: false,
      honesty: 'Decorative galaxy sprites · not a measured survey' },
  ];
  let scaleLevel = 2;
  let masterclassZoom = 2;
  let masterclassMode = false;
  let spaceFlightMode = false;
  let spaceFlightToolActive = false;
  let masterclassIntroActive = false;
  let masterclassIntroStart = 0;
  const SPACE_FLIGHT_MS = 54000;
  const SPACE_FLIGHT_TO = 5;
  let scaleAnimActive = false, scaleAnimStart = 0;
  const scaleAnimFrom = { radius: 48, el: 26 * D2R, az: -0.6, tx: 0, ty: 0, tz: 0 };
  const scaleAnimTo = { radius: 48, el: 26 * D2R, az: -0.6, tx: 0, ty: 0, tz: 0 };
  const SCALE_ANIM_MS = 1400;
  const JOURNEY_HOLD_MS = 2800;
  scaleAnimDurationMs = SCALE_ANIM_MS;
  let scaleAnimFromLevel = 2;
  let scaleAnimToLevel = 2;
  let journeyActive = false;
  let journeySteps = [];
  let journeyTarget = 2;
  let journeyHoldTimer = null;

  // asteroid belt + Halley comet
  let asteroidPoints = null;
  let halleyGroup = null, halleyOrbit = null, halleyTail = null;
  let preloaderComets = null;
  let saturnRingMesh = null, saturnShadowBand = null;
  let retroTick = 0;
  let eclipseDim = 0; // 0 = none, 1 = full eclipse dimming

  // Phase 3 galaxy layers (L3–L6)
  // OrbitLab 2026-07-05 port: Gaia-style barred spiral — the galaxy-shape components live
  // in milkyWayGroup (shared galactic tilt); Oort/local/catalog/cosmic stay ecliptic-aligned.
  const GALACTIC_TILT_X = 62.87 * D2R;
  let galaxyGroup = null, milkyWayGroup = null;
  let oortShell = null, localStarsGroup = null, catalogStarsGroup = null, milkyWayDisk = null, cosmicField = null;
  let milkyWayBulge = null, milkyWayDust = null, milkyWayHII = null, milkyWayArmRibbons = null, milkyWaySatellites = null;
  let galacticCore = null, galacticCoreRing = null, galacticBar = null, galacticHalo = null, galacticHaloDisk = null;
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

  function lerpScale(a, b, t) {
    return {
      camRadius: a.camRadius + (b.camRadius - a.camRadius) * t,
      camEl: a.camEl + (b.camEl - a.camEl) * t,
      camAz: a.camAz + (b.camAz - a.camAz) * t,
      targetEarth: t < 0.5 ? a.targetEarth : b.targetEarth,
    };
  }

  function spaceFlightZoomAt(p) {
    const hold = 0.22, toInner = 0.40, toSystem = 0.60;
    if (p < hold) return 0;
    if (p < toInner) return easeInOut((p - hold) / (toInner - hold));
    if (p < toSystem) return 1 + easeInOut((p - toInner) / (toSystem - toInner)) * 1.12;
    return 2.12 + easeInOut((p - toSystem) / (1 - toSystem)) * (SPACE_FLIGHT_TO - 2.12);
  }

  function applySpacePalette(z) {
    if (!spaceFlightMode || !renderer) return;
    const earthT = Math.max(0, Math.min(1, (1.6 - z) / 1.6));
    const galaxyT = Math.max(0, Math.min(1, (z - 3.8) / 1.2));
    const sky = earthT > 0.5 ? 0x03050c : 0x010108;
    renderer.setClearColor(sky, 1);
    if (scene.fog && !portraitMode) {
      scene.fog.color.setHex(sky);
      scene.fog.density = 0.00045 + galaxyT * 0.0007;
    }
    renderer.toneMappingExposure = 1.38 - galaxyT * 0.14 - (1 - earthT) * 0.06;
    if (hemiLight) {
      hemiLight.intensity = 0.22 + earthT * 0.18;
      hemiLight.color.setHex(galaxyT > 0.4 ? 0x7080a0 : 0x4a6088);
      hemiLight.groundColor.setHex(0x020408);
    }

    if (bloomPass) {
      bloomPass.strength = 0.08 + earthT * 0.32;
      bloomPass.threshold = 0.96 - earthT * 0.08;
      bloomPass.radius = 0.28 + earthT * 0.16;
    }
  }

  function setMasterclassZoom(z, animate, silent) {
    masterclassZoom = Math.max(0, Math.min(6, z));
    const i0 = Math.floor(masterclassZoom);
    const i1 = Math.min(6, i0 + 1);
    const frac = masterclassZoom - i0;
    const p0 = scalePreset(i0);
    const p1 = scalePreset(i1);
    const e = easeInOut(frac);
    const blend = lerpScale(p0, p1, e);

    if (animate && !PRM) {
      scaleAnimFrom.radius = camRadius;
      scaleAnimFrom.el = camEl;
      scaleAnimFrom.az = camAz;
      scaleAnimFrom.tx = camTarget.x;
      scaleAnimFrom.ty = camTarget.y;
      scaleAnimFrom.tz = camTarget.z;
      scaleAnimTo.radius = blend.camRadius;
      scaleAnimTo.el = blend.camEl;
      scaleAnimTo.az = blend.camAz;
      if (blend.targetEarth) {
        const ep = new THREE.Vector3();
        earthTargetVec(ep);
        scaleAnimTo.tx = ep.x; scaleAnimTo.ty = ep.y; scaleAnimTo.tz = ep.z;
      } else { scaleAnimTo.tx = 0; scaleAnimTo.ty = 0; scaleAnimTo.tz = 0; }
      scaleAnimActive = true;
      scaleAnimStart = performance.now();
      scaleAnimFromLevel = scaleLevel;
      scaleAnimToLevel = Math.round(masterclassZoom);
    } else {
      camRadius = blend.camRadius;
      camEl = blend.camEl;
      camAz = blend.camAz;
      if (blend.targetEarth) earthTargetVec(camTarget);
      else camTarget.set(0, 0, 0);
      scaleAnimActive = false;
      applyCamera();
    }

    scaleLevel = Math.round(masterclassZoom);
    if (!silent) updateScaleHUD();
    updateScaleVisualsContinuous(masterclassZoom);
    if (spaceFlightMode) applySpacePalette(masterclassZoom);
  }

  function finishSpaceFlightTool() {
    masterclassIntroActive = false;
    spaceFlightMode = false;
    spaceFlightToolActive = false;
    masterclassMode = false;
    lastCosmicFlightChapterLevel = '';
    try {
      document.dispatchEvent(new CustomEvent('orrery-journey-end', {
        detail: { level: Math.round(masterclassZoom), spaceFlight: true, outbound: true },
      }));
    } catch (e) { /* optional */ }
  }

  function cancelSpaceFlight(jumpToGalaxy) {
    if (!spaceFlightToolActive && !masterclassIntroActive) return;
    masterclassIntroActive = false;
    spaceFlightMode = false;
    spaceFlightToolActive = false;
    masterclassMode = false;
    lastCosmicFlightChapterLevel = '';
    if (jumpToGalaxy) setMasterclassZoom(SPACE_FLIGHT_TO, true);
    else setMasterclassZoom(scaleLevel, false);
    try {
      document.dispatchEvent(new CustomEvent('orrery-journey-end', {
        detail: { level: scaleLevel, skipped: !!jumpToGalaxy, spaceFlight: true, outbound: true },
      }));
    } catch (e) { /* optional */ }
  }

  function startSpaceFlight(opts) {
    opts = opts || {};
    if (PRM) return;
    if (opts.narrate != null) {
      narrateJourney = !!opts.narrate;
      try { localStorage.setItem('ap_narrate_journey', narrateJourney ? '1' : '0'); } catch (e) {}
    }
    if (journeyActive) cancelScaleJourney(false);
    if (preloaderCosmicJourney) cancelCosmicFlight(false);
    spaceFlightMode = true;
    spaceFlightToolActive = true;
    masterclassMode = true;
    masterclassIntroActive = true;
    masterclassIntroStart = performance.now();
    introActive = false;
    preloaderCosmicJourney = false;
    cosmicFlightToolActive = false;
    daysPerSec = 0;
    flicking = false;
    showLabels = false;
    showOrbits = false;
    lastCosmicFlightChapterLevel = '';
    ensureGalaxyLayers();
    buildRemainingPlanets();
    setMasterclassZoom(0, false, true);
    earthTargetVec(camTarget);
    camRadius = 2.85;
    camEl = 12 * D2R;
    camAz = -0.38;
    applyCamera();
    applySpacePalette(0);
    requestAnimationFrame(forceResize);
  }

  function tickSpaceFlightTool(t, dt) {
    const dur = SPACE_FLIGHT_MS;
    const p = Math.min(1, (t - masterclassIntroStart) / dur);
    const z = spaceFlightZoomAt(p);
    setMasterclassZoom(z, false, true);
    camAz += 0.018 * dt;
    const chLv = Math.max(0, Math.min(6, Math.round(z)));
    const stepKey = chLv + '|sf|' + Math.floor(p * 50);
    const sfDetail = { level: chLv, spaceFlight: true, outbound: true, progress: p };
    if (narrateJourney) sfDetail.narrate = true;
    if (stepKey !== lastCosmicFlightChapterLevel) {
      lastCosmicFlightChapterLevel = stepKey;
      try {
        document.dispatchEvent(new CustomEvent('orrery-journey-step', { detail: sfDetail }));
      } catch (e) { /* optional */ }
    } else {
      try {
        document.dispatchEvent(new CustomEvent('orrery-journey-progress', { detail: { progress: p, spaceFlight: true } }));
      } catch (e) { /* optional */ }
    }
    if (p >= 1) finishSpaceFlightTool();
  }

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
    focusFrameId = null;
    moonFrameActive = false;
    updateScaleVisuals(0);
    updateScaleHUD();
    needRecompute = true;
    updatePositions();
    setEarthTerminatorCamera(3.8, 9 * D2R);
    camera.fov = CAM_FOV_MID;
    camera.updateProjectionMatrix();
    if (radialBlurPass) radialBlurPass.uniforms.uStrength.value = 0;
    if (bloomPass && composer) {
      bloomPass.strength = perfTier === 'mid' ? 0.18 : 0.23;
      bloomPass.threshold = perfTier === 'mid' ? 0.86 : 0.82;
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
    preloaderCosmicJourney = false;
    preloaderIntroScheduled = false;
    preloaderIntroFinished = true;
    introActive = false;
    disposePreloaderComets();
    syncPreloaderIntroClass(false);
    syncPreloaderCosmicClass(false);
    holdPreloaderEarthFrame();
    if (onIntroDone) { const f = onIntroDone; onIntroDone = null; f(); }
  }

  function holdPreloaderEarthFrame() {
    preloaderIntroScheduled = false;
    preloaderIntroFinished = true;
    introActive = false;
    scaleAnimActive = false;
    showOrbits = true;
    updateScaleHUD();
    setDefaultEarthFrame();
    syncPreloaderSystemClass(false);
    syncPreloaderCosmicClass(true);
    applyPreloaderEarthIsolation(0);
    try {
      const pre = document.getElementById('preloader');
      if (pre) pre.classList.remove('preloader--system-view');
      const phase = document.getElementById('preloader-phase');
      if (phase) phase.textContent = 'Your horizon';
      const phaseSub = document.getElementById('preloader-phase-sub');
      if (phaseSub) phaseSub.textContent = 'Eastern sky, precise coordinates — your rising sign waits below.';
    } catch (_) {}
    requestAnimationFrame(forceResize);
    setTimeout(forceResize, 120);
    setTimeout(forceResize, 400);
    updateIntroProgress(1);
    try {
      document.dispatchEvent(new CustomEvent('ap-preloader-ready'));
    } catch (e) { /* optional */ }
  }

  function finishPreloaderCosmicJourney() {
    if (preloaderIntroWatchdog) { clearTimeout(preloaderIntroWatchdog); preloaderIntroWatchdog = null; }
    disposePreloaderComets();
    syncPreloaderWarpClass(false);
    scaleAnimDurationMs = SCALE_ANIM_MS;
    introActive = false;
    syncPreloaderIntroClass(false);
    const toolFlight = cosmicFlightToolActive;
    if (toolFlight) {
      cosmicFlightToolActive = false;
      lastCosmicFlightChapterLevel = '';
      setDefaultEarthFrame();
      try {
        document.dispatchEvent(new CustomEvent('orrery-journey-end', { detail: { level: 0, cosmicFlight: true } }));
      } catch (e) { /* optional */ }
    } else {
      preloaderIntroFinished = true;
      preloaderIntroScheduled = false;
      holdPreloaderEarthFrame();
      try {
        document.dispatchEvent(new CustomEvent('orrery-journey-end', { detail: { level: 0, preloader: true } }));
      } catch (e) { /* optional */ }
      if (onIntroDone) { const f = onIntroDone; onIntroDone = null; f(); }
    }
    preloaderCosmicJourney = false;
  }

  function cancelCosmicFlight(jumpToEarth) {
    if (spaceFlightToolActive) cancelSpaceFlight(false);
    if (!preloaderCosmicJourney && !cosmicFlightToolActive) return;
    if (preloaderIntroWatchdog) { clearTimeout(preloaderIntroWatchdog); preloaderIntroWatchdog = null; }
    disposePreloaderComets();
    syncPreloaderWarpClass(false);
    preloaderCosmicJourney = false;
    introActive = false;
    cosmicFlightToolActive = false;
    lastCosmicFlightChapterLevel = '';
    scaleAnimDurationMs = SCALE_ANIM_MS;
    syncPreloaderIntroClass(false);
    if (jumpToEarth) setDefaultEarthFrame();
    else settleToSystemHeroFrame(false);
    try {
      document.dispatchEvent(new CustomEvent('orrery-journey-end', {
        detail: { level: scaleLevel, skipped: !!jumpToEarth, cosmicFlight: true },
      }));
    } catch (e) { /* optional */ }
  }

  function interpolatePreloaderCosmicCamera(z, t) {
    const zc = Math.max(0, Math.min(6, z));
    const zLo = Math.floor(zc);
    const zHi = Math.min(6, zLo + 1);
    const seg = zHi > zLo ? (zc - zLo) / (zHi - zLo) : 0;
    const a = scalePreset(zLo);
    const b = scalePreset(zHi);
    camRadius = a.camRadius + (b.camRadius - a.camRadius) * seg;
    camEl = a.camEl + (b.camEl - a.camEl) * seg;
    camAz = a.camAz + (b.camAz - a.camAz) * seg;
    if (zc < 1.25 && meshes.earth) {
      const earthT = Math.max(0, Math.min(1, (1.25 - zc) / 1.25));
      earthTargetVec(_earthWorld);
      camTarget.lerpVectors(ORIGIN, _earthWorld, earthT);
    } else {
      camTarget.set(0, 0, 0);
      if (zc >= 3.2 && zc <= 5.8 && t) {
        const driftMul = (zc - 3) / 2.6;
        const drift = Math.sin(t * 0.00062) * 30 * driftMul;
        const lift = Math.cos(t * 0.00052 + 0.6) * 14 * driftMul;
        camTarget.x += drift;
        camTarget.y += lift;
        camTarget.z += Math.sin(t * 0.00044 + 1.2) * 20 * driftMul;
        camAz += Math.sin(t * 0.00030 + 0.4) * 0.0003 * driftMul;
      }
    }
    const fovA = a.camRadius < 12 ? CAM_FOV_CLOSE : (zLo >= 3 ? CAM_FOV_WIDE : CAM_FOV_MID);
    const fovB = b.camRadius < 12 ? CAM_FOV_CLOSE : (zHi >= 3 ? CAM_FOV_WIDE : CAM_FOV_MID);
    let fov = fovA + (fovB - fovA) * seg;
    if (zc >= 3.4 && zc <= 5.6) fov += 9 * Math.sin((zc - 3.4) / 2.2 * Math.PI);
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }

  function tickPreloaderCosmicJourney(t) {
    const dur = preloaderCosmicDurationMs();
    const elapsed = t - introStart;
    const p = Math.min(1, elapsed / dur);
    const openZ = preloaderCosmicOpenZ();
    let z;
    if (p < PRELOADER_COSMIC_HOLD_FRAC) {
      z = openZ;
    } else {
      const descentP = (p - PRELOADER_COSMIC_HOLD_FRAC) / (1 - PRELOADER_COSMIC_HOLD_FRAC);
      z = preloaderCosmicDescentZ(descentP, openZ);
    }

    scaleAnimActive = false;
    const lv = Math.round(z);
    if (lv !== scaleLevel) {
      scaleLevel = lv;
      updateScaleHUD();
    } else {
      scaleLevel = lv;
    }
    updateScaleVisualsContinuous(z);
    syncCosmosBlend(z);

    try {
      const pre = document.getElementById('preloader');
      if (pre) pre.classList.toggle('preloader--earth-land', p >= 1 - PRELOADER_COSMIC_LAND_FRAC);
    } catch (_) {}

    if (p >= 1 - PRELOADER_COSMIC_LAND_FRAC) {
      const landE = easeInOut((p - (1 - PRELOADER_COSMIC_LAND_FRAC)) / PRELOADER_COSMIC_LAND_FRAC);
      interpolatePreloaderCosmicCamera(z, t);
      const fromRad = camRadius;
      const fromEl = camEl;
      const fromAz = camAz;
      const fromTx = camTarget.x;
      const fromTy = camTarget.y;
      const fromTz = camTarget.z;
      const fromFov = camera.fov;
      setEarthTerminatorCamera(3.8, 9 * D2R);
      camRadius = fromRad + (camRadius - fromRad) * landE;
      camEl = fromEl + (camEl - fromEl) * landE;
      camAz = fromAz + (camAz - fromAz) * landE;
      camTarget.set(
        fromTx + (camTarget.x - fromTx) * landE,
        fromTy + (camTarget.y - fromTy) * landE,
        fromTz + (camTarget.z - fromTz) * landE
      );
      camera.fov = fromFov + (CAM_FOV_MID - fromFov) * landE;
      camera.updateProjectionMatrix();
    } else {
      interpolatePreloaderCosmicCamera(z, t);
    }

    const inLand = p >= 1 - PRELOADER_COSMIC_LAND_FRAC;
    const warpBand = z >= 3.2 && z <= 5.6 && !inLand;
    if (radialBlurPass && warpBand) {
      const warpT = Math.max(0, Math.min(1, (5.6 - z) / 2.4));
      radialBlurPass.uniforms.uStrength.value = Math.sin(warpT * Math.PI) * 0.28;
      syncPreloaderWarpClass(true);
    } else {
      if (radialBlurPass) radialBlurPass.uniforms.uStrength.value = 0;
      syncPreloaderWarpClass(false);
    }
    if (warpBand && renderer) {
      const warpT = Math.max(0, Math.min(1, (5.6 - z) / 2.4));
      renderer.toneMappingExposure = (perfTier === 'high' ? 1.18 : 1.14) + Math.sin(warpT * Math.PI) * 0.06;
    } else if (renderer && inLand) {
      renderer.toneMappingExposure = perfTier === 'high' ? 1.14 : 1.10;
    }
    if (bloomPass && composer && warpBand) {
      const warpT = Math.max(0, Math.min(1, (5.6 - z) / 2.4));
      bloomPass.strength = (perfTier === 'mid' ? 0.28 : 0.40) + Math.sin(warpT * Math.PI) * 0.12;
      bloomPass.threshold = perfTier === 'mid' ? 0.78 : 0.74;
    }

    if (z <= 3.2 && !allPlanetsBuilt) buildRemainingPlanets();
    updatePreloaderComets(p, z, t);
    updateIntroProgress(p);
    if (cosmicFlightToolActive) {
      const chLv = Math.max(0, Math.min(6, Math.round(z)));
      const descentP = p < PRELOADER_COSMIC_HOLD_FRAC
        ? 0
        : (p - PRELOADER_COSMIC_HOLD_FRAC) / (1 - PRELOADER_COSMIC_HOLD_FRAC);
      const detail = { level: chLv, cosmicFlight: true, progress: p };
      let narrKey = '';
      if (narrateJourney) {
        const ch = preloaderChapterForProgress(descentP);
        detail.narrate = true;
        detail.title = ch.title;
        detail.subtitle = ch.sub;
        narrKey = ch.title;
      }
      const stepKey = chLv + '|' + narrKey;
      if (stepKey !== lastCosmicFlightChapterLevel) {
        lastCosmicFlightChapterLevel = stepKey;
        try {
          document.dispatchEvent(new CustomEvent('orrery-journey-step', { detail }));
        } catch (e) { /* optional */ }
      } else {
        try {
          document.dispatchEvent(new CustomEvent('orrery-journey-progress', { detail: { progress: p, cosmicFlight: true } }));
        } catch (e) { /* optional */ }
      }
    }
    if (elapsed >= dur) finishPreloaderCosmicJourney();
  }

  function beginCosmicJourney(opts) {
    opts = opts || {};
    if (destroyed) return;
    if (journeyActive) cancelScaleJourney(false);
    if (preloaderIntroWatchdog) clearTimeout(preloaderIntroWatchdog);
    const watchdogMs = preloaderCosmicDurationMs() + 3000;
    preloaderIntroWatchdog = setTimeout(() => {
      preloaderIntroWatchdog = null;
      if (!destroyed && preloaderCosmicJourney) {
        if (opts.tool) cancelCosmicFlight(true);
        else if (onPreloaderStage() && !preloaderIntroFinished) recoverPreloaderIntro();
      }
    }, watchdogMs);

    cosmicFlightToolActive = !!opts.tool;
    lastCosmicFlightChapterLevel = '';
    preloaderCosmicJourney = true;
    preloaderChapterKey = '';
    preloaderIntroScheduled = false;
    introActive = true;
    introStart = performance.now();
    introStartedAt = introStart;
    syncPreloaderIntroClass(true);
    if (!opts.tool) syncPreloaderCosmicClass(true);
    syncHeroReplayClass(false);
    daysPerSec = 0;
    flicking = false;

    ensureGalaxyLayers();
    buildRemainingPlanets();
    buildPreloaderComets();
    needRecompute = true;
    updatePositions();

    const openZ = preloaderCosmicOpenZ();
    scaleLevel = Math.round(openZ);
    scaleAnimActive = false;
    updateScaleVisualsContinuous(openZ);
    interpolatePreloaderCosmicCamera(openZ, introStart);
    syncCosmosBlend(openZ);
    applyCamera();

    if (perfTier !== 'low' && !PRM) {
      requestAnimationFrame(function () {
        if (!destroyed && preloaderCosmicJourney) ensureComposer();
      });
    }

    updateIntroProgress(0);
    requestAnimationFrame(forceResize);
    setTimeout(forceResize, 80);
    setTimeout(forceResize, 160);
    setTimeout(forceResize, 320);
    setTimeout(forceResize, 640);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', forceResize, { passive: true, once: true });
    }
  }

  function startCosmicFlight(opts) {
    opts = opts || {};
    if (spaceFlightToolActive) cancelSpaceFlight(false);
    if (PRM) {
      try {
        document.dispatchEvent(new CustomEvent('orrery-journey-end', { detail: { level: 0, cosmicFlight: true, reducedMotion: true } }));
      } catch (e) { /* optional */ }
      return;
    }
    if (opts.narrate != null) {
      narrateJourney = !!opts.narrate;
      try { localStorage.setItem('ap_narrate_journey', narrateJourney ? '1' : '0'); } catch (e) {}
    }
    beginCosmicJourney({ tool: true });
  }

  function startPreloaderCosmicJourney() {
    if (destroyed || !onPreloaderStage()) return;
    beginCosmicJourney({ preloader: true });
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
      holdPreloaderEarthFrame();
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
        sp.userData.baseOpa = 0;
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
      g.visible = b.id === 'earth' && earthMapReady;
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
      if (starFieldFar) starFieldFar.visible = false;
      if (milkyWayBand) milkyWayBand.visible = false;
      return;
    }
    starField.visible = true;
    if (starField.material.uniforms) {
      starField.material.uniforms.uFade.value = lv >= 6 ? 0.28 : lv >= 5 ? 0.45 : 1;
      // v576: lift point size at Earth/Inner scales — stars present, never competing with the copy rail
      if (starField.material.uniforms.uSizeMul) {
        starField.material.uniforms.uSizeMul.value = lv <= 1 ? 1.35 : 1;
      }
    }
    // v577: the far parallax shell + faint milky-way band track the near shell's gating.
    // The band carries an extra fade so it always stays a whisper behind the stars.
    const nearFade = lv >= 6 ? 0.28 : lv >= 5 ? 0.45 : 1;
    if (starFieldFar) {
      starFieldFar.visible = true;
      if (starFieldFar.material.uniforms) {
        starFieldFar.material.uniforms.uFade.value = nearFade;
        starFieldFar.material.uniforms.uSizeMul.value = (lv <= 1 ? 0.95 : 0.72);
      }
    }
    if (milkyWayBand) {
      milkyWayBand.visible = true;
      if (milkyWayBand.material.uniforms) {
        milkyWayBand.material.uniforms.uFade.value = nearFade * 0.7;
        milkyWayBand.material.uniforms.uSizeMul.value = (lv <= 1 ? 1.3 : 1.15);
      }
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

  /* v576: Earth+Moon shared frame — camera target rides between the two bodies,
     base azimuth ~43° off the Earth→Moon axis so they sit side by side in shot.
     The off-axis side is chosen SUNWARD so the pair shows lit faces and the sun
     stays behind the camera instead of blowing out the middle of the frame. */
  function syncMoonFrameTarget() {
    if (!moonGroup || !meshes.earth) return;
    const ep = meshes.earth.position, mp = moonGroup.position;
    camTarget.set(
      ep.x + (mp.x - ep.x) * 0.66,
      ep.y + (mp.y - ep.y) * 0.66,
      ep.z + (mp.z - ep.z) * 0.66
    );
    const azEM = Math.atan2(mp.z - ep.z, mp.x - ep.x);
    let side = 0.75;
    if (sunMesh) {
      let d = Math.atan2(sunMesh.position.z - ep.z, sunMesh.position.x - ep.x) - azEM;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      side = d >= 0 ? 0.75 : -0.75;
    }
    moonFrameAzBase = azEM + side;
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
    focusFrameId = null;
    moonFrameActive = false;
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
        holdPreloaderEarthFrame();
      } else {
        applyScalePreset(2, false);
      }
      if (onIntroDone) { const f = onIntroDone; onIntroDone = null; f(); }
      return;
    }
    if (onPreloaderStage()) {
      const beginCosmic = () => {
        if (destroyed || preloaderIntroFinished) return;
        startPreloaderCosmicJourney();
      };
      if (earthMapReady) { beginCosmic(); return; }
      needRecompute = true;
      earthMapReadyPromise.then(beginCosmic);
      introBeginTimer = setTimeout(beginCosmic, 800);
      return;
    }
    const begin = () => {
      if (destroyed || introActive) return;
      if (scaleLevel !== 0) return;
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
      // Static finish pass (dither + vignette + whisper grade) — the ONE extra
      // fullscreen pass, always last before OutputPass. The low tier never gets a
      // composer at all (early return above), so it is skipped there for free.
      finishPass = tryCreateFinishPass();
      if (finishPass) composer.addPass(finishPass);
      composer.addPass(new OutputPass());
      resize();
    } catch (e) {
      composer = null;
      bloomPass = null;
      radialBlurPass = null;
      finishPass = null;
      console.warn('[orrery] post-processing deferred init failed:', e.message);
    }
  }

  function upgradeSunVisuals() {
    if (!sunVisualsMinimal || !sunMesh) return;
    sunVisualsMinimal = false;
    buildSunCoronaShell();
    buildSunCorona();
    // v576: on the award homepage the inner halo uses brass-family stops so the
    // resting sun glow sits in the ENGRAVED BRASS palette (other pages unchanged).
    const layers = [
      { tex: isAwardMode()
          ? makeGlowTexture('rgba(236,214,164,0.9)', 'rgba(194,160,94,0.4)')
          : makeGlowTexture('rgba(255,252,235,0.95)', 'rgba(255,205,85,0.52)'), scale: SUN_SIZE * 6.2 },
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
    scaleAnimDurationMs = SCALE_ANIM_MS;
    syncPreloaderCosmicClass(false);
    setDefaultEarthFrame();
    applyCamera();
    resize();
    requestAnimationFrame(() => {
      if (destroyed) return;
      ensureComposer();
      resize();
      requestAnimationFrame(() => { if (!destroyed) resize(); });
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
      preloaderCosmicJourney = false;
      preloaderIntroFinished = true;
      syncPreloaderCosmicClass(false);
      holdPreloaderEarthFrame();
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
        // #6: the outward "Earth → deep field" tour now eases BACK to the System
        // rest (…,6,2) instead of leaving the viewer stranded at the Cosmos deep
        // field when narration ends. The inward tour already rests at Earth (0).
        journeySteps = opts.direction === 'in'
          ? [6, 5, 4, 3, 2, 1, 0]
          : [0, 1, 2, 3, 4, 5, 6, 2];
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
    focusFrameId = null;      // v576: any scale change releases camera framing ownership
    moonFrameActive = false;
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
    if (moonFrameActive) {
      // v576: Earth+Moon frame sits closer than the Earth preset's camMin
      camRadius = Math.max(2.2, Math.min(8, camRadius));
      return;
    }
    if (focusFrameId) {
      // v576: planet portraits park well inside the level's camMin — don't shove
      // the camera back out to a distant speck once the focus anim lands
      camRadius = Math.max(3.5, Math.min(p.camMax, camRadius));
      return;
    }
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

  function makeMoonBumpTexture() {
    const s = 512;
    const c = document.createElement('canvas');
    c.width = s;
    c.height = s;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#7a7a84';
    ctx.fillRect(0, 0, s, s);
    for (let m = 0; m < 7; m++) {
      const x = Math.random() * s;
      const y = Math.random() * s;
      const rad = 36 + Math.random() * 90;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, '#4a4a54');
      g.addColorStop(0.55, '#62626c');
      g.addColorStop(1, 'rgba(122,122,132,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, rad, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 220; i++) {
      const x = Math.random() * s;
      const y = Math.random() * s;
      const rad = 1.5 + Math.random() * 14;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, '#2e2e36');
      g.addColorStop(0.35, '#555560');
      g.addColorStop(0.7, '#8a8a94');
      g.addColorStop(1, 'rgba(138,138,148,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, rad, 0, Math.PI * 2);
      ctx.fill();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  function addMoonSurfaceCrater(moonMeshRef, moonRadius) {
    if (!moonMeshRef || moonCraterGroup) return;
    moonCraterGroup = new THREE.Group();
    const craterCount = perfTier === 'low' ? 8 : perfTier === 'mid' ? 14 : 22;
    const craterMat = new THREE.MeshStandardMaterial({
      color: 0x3a3a44, roughness: 0.95, metalness: 0.02, transparent: true, opacity: 0.55, depthWrite: false,
    });
    for (let i = 0; i < craterCount; i++) {
      const phi = Math.acos(1 - 2 * Math.random());
      const theta = Math.random() * Math.PI * 2;
      const r = moonRadius * (0.92 + Math.random() * 0.06);
      const rad = moonRadius * (0.04 + Math.random() * 0.11);
      const dish = new THREE.Mesh(new THREE.SphereGeometry(rad, 8, 6), craterMat);
      dish.scale.set(1, 0.22 + Math.random() * 0.18, 1);
      dish.position.set(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta)
      );
      dish.lookAt(0, 0, 0);
      moonCraterGroup.add(dish);
    }
    moonMeshRef.add(moonCraterGroup);
  }

  function buildEarthOrbitTraffic() {
    if (earthOrbitGroup) return;
    earthOrbitGroup = new THREE.Group();
    scene.add(earthOrbitGroup);

    const craftSpecs = [
      { kind: 'iss', r: 0.98, inc: 0.52, speed: 5.8, color: 0xc8d0e0 },
      { kind: 'hubble', r: 1.03, inc: 0.38, speed: 4.6, color: 0xa8b8d8 },
      { kind: 'starlink', r: 1.01, inc: 0.62, speed: 6.4, color: 0x90a0b8 },
      { kind: 'starlink', r: 1.02, inc: 0.58, speed: 6.1, color: 0x8898b0 },
      { kind: 'comm', r: 1.08, inc: 0.44, speed: 3.2, color: 0xb0c0d8 },
      { kind: 'gps', r: 1.34, inc: 0.22, speed: 1.4, color: 0xd4b85a },
      { kind: 'gps', r: 1.36, inc: 0.24, speed: 1.35, color: 0xd4b85a },
      { kind: 'gps', r: 1.33, inc: 0.20, speed: 1.42, color: 0xd4b85a },
      { kind: 'gps', r: 1.35, inc: 0.26, speed: 1.38, color: 0xd4b85a },
    ];

    craftSpecs.forEach((spec, idx) => {
      const g = new THREE.Group();
      let body;
      if (spec.kind === 'iss') {
        body = new THREE.Mesh(
          new THREE.BoxGeometry(0.028, 0.012, 0.042),
          new THREE.MeshStandardMaterial({ color: spec.color, metalness: 0.55, roughness: 0.35, emissive: 0x223044, emissiveIntensity: 0.35 })
        );
        const truss = new THREE.Mesh(
          new THREE.BoxGeometry(0.062, 0.006, 0.006),
          new THREE.MeshStandardMaterial({ color: 0x8a98a8, metalness: 0.65, roughness: 0.28 })
        );
        const panelL = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.004, 0.018), new THREE.MeshStandardMaterial({ color: 0x1a2840, metalness: 0.2, roughness: 0.5, emissive: 0x0a1428, emissiveIntensity: 0.2 }));
        panelL.position.x = -0.038;
        const panelR = panelL.clone();
        panelR.position.x = 0.038;
        const navBlink = new THREE.Mesh(
          new THREE.SphereGeometry(0.004, 6, 6),
          new THREE.MeshBasicMaterial({ color: 0xff6040, transparent: true, opacity: 0.85, depthWrite: false })
        );
        navBlink.position.set(0.022, 0.008, 0.018);
        navBlink.userData.blink = true;
        g.add(body, truss, panelL, panelR, navBlink);
      } else if (spec.kind === 'comm') {
        body = new THREE.Mesh(
          new THREE.BoxGeometry(0.016, 0.016, 0.022),
          new THREE.MeshStandardMaterial({ color: spec.color, metalness: 0.48, roughness: 0.38, emissive: 0x182838, emissiveIntensity: 0.28 })
        );
        const dish = new THREE.Mesh(
          new THREE.CylinderGeometry(0.012, 0.014, 0.004, 12),
          new THREE.MeshStandardMaterial({ color: 0xd8e0f0, metalness: 0.72, roughness: 0.22, emissive: 0x304060, emissiveIntensity: 0.35 })
        );
        dish.rotation.x = Math.PI / 2;
        dish.position.z = 0.014;
        const boom = new THREE.Mesh(
          new THREE.CylinderGeometry(0.002, 0.002, 0.018, 6),
          new THREE.MeshStandardMaterial({ color: 0x708090, metalness: 0.55, roughness: 0.35 })
        );
        boom.rotation.z = Math.PI / 2;
        boom.position.x = 0.012;
        g.add(body, dish, boom);
      } else if (spec.kind === 'hubble') {
        body = new THREE.Mesh(
          new THREE.CylinderGeometry(0.009, 0.011, 0.034, 10),
          new THREE.MeshStandardMaterial({ color: spec.color, metalness: 0.45, roughness: 0.4 })
        );
        body.rotation.z = Math.PI / 2;
        g.add(body);
      } else if (spec.kind === 'starlink') {
        for (let s = 0; s < 5; s++) {
          const dot = new THREE.Mesh(
            new THREE.BoxGeometry(0.008, 0.008, 0.014),
            new THREE.MeshStandardMaterial({ color: spec.color, metalness: 0.3, roughness: 0.55 })
          );
          dot.position.x = (s - 2) * 0.011;
          g.add(dot);
        }
      } else {
        body = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.014, 0),
          new THREE.MeshStandardMaterial({ color: spec.color, metalness: 0.5, roughness: 0.35, emissive: 0x3a3010, emissiveIntensity: 0.25 })
        );
        g.add(body);
      }
      g.userData = {
        orbitR: spec.r, inc: spec.inc, speed: spec.speed,
        phase: (idx / craftSpecs.length) * Math.PI * 2 + Math.random() * 0.4,
        tumble: Math.random() * Math.PI * 2,
      };
      earthOrbitGroup.add(g);
      leoCraft.push(g);
    });

    const debrisCount = perfTier === 'low' ? 32 : perfTier === 'mid' ? 56 : 88;
    const pos = new Float32Array(debrisCount * 3);
    const col = new Float32Array(debrisCount * 3);
    const sizes = new Float32Array(debrisCount);
    for (let i = 0; i < debrisCount; i++) {
      const shell = 0.93 + Math.random() * 0.14;
      const ang = Math.random() * Math.PI * 2;
      const inc = (Math.random() - 0.5) * 1.1;
      pos[i * 3] = shell * Math.cos(ang);
      pos[i * 3 + 1] = shell * Math.sin(ang) * Math.sin(inc);
      pos[i * 3 + 2] = shell * Math.sin(ang) * Math.cos(inc);
      const w = 0.35 + Math.random() * 0.55;
      col[i * 3] = 0.62 * w;
      col[i * 3 + 1] = 0.58 * w;
      col[i * 3 + 2] = 0.52 * w;
      sizes[i] = 0.35 + Math.random() * 0.85;
    }
    const dGeo = new THREE.BufferGeometry();
    dGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    dGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    dGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    earthDebrisPoints = new THREE.Points(dGeo, new THREE.PointsMaterial({
      size: perfTier === 'high' ? 0.11 : 0.09,
      vertexColors: true,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      sizeAttenuation: true,
    }));
    earthOrbitGroup.add(earthDebrisPoints);

    function orbitRingPoints(radius, segments, inc) {
      const pts = [];
      for (let i = 0; i <= segments; i++) {
        const ang = (i / segments) * Math.PI * 2;
        pts.push(
          radius * Math.cos(ang),
          radius * Math.sin(ang) * Math.sin(inc) * 0.85,
          radius * Math.sin(ang) * Math.cos(inc)
        );
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      return new THREE.Line(geo, new THREE.LineBasicMaterial({
        color: 0xc9a227, transparent: true, opacity: 0.14, depthWrite: false,
      }));
    }
    leoOrbitRing = orbitRingPoints(0.99, 96, 0.52);
    geoOrbitRing = orbitRingPoints(1.345, 72, 0.22);
    earthOrbitGroup.add(leoOrbitRing, geoOrbitRing);
    earthOrbitGroup.visible = false;
  }

  function updateEarthOrbitTraffic(t, dt) {
    if (!earthOrbitGroup || !earthOrbitGroup.visible || PRM) return;
    const glint = 0.55 + Math.sin(t * 0.0038) * 0.25;
    leoCraft.forEach((craft) => {
      const u = craft.userData;
      const ang = u.phase + t * 0.001 * u.speed;
      const r = u.orbitR;
      const inc = u.inc;
      craft.position.set(
        r * Math.cos(ang),
        r * Math.sin(ang) * Math.sin(inc) * 0.85,
        r * Math.sin(ang) * Math.cos(inc)
      );
      craft.rotation.y = ang + u.tumble;
      craft.rotation.x = Math.sin(t * 0.0012 + u.tumble) * 0.35;
      craft.rotation.z = Math.cos(t * 0.0009 + u.tumble) * 0.22;
      craft.traverse((ch) => {
        if (!ch.material || !ch.material.emissive) return;
        if (ch.userData.blink) {
          ch.material.opacity = 0.35 + Math.abs(Math.sin(t * 0.006 + u.phase)) * 0.65;
        } else if (ch.material.emissiveIntensity != null) {
          ch.material.emissiveIntensity = (ch.userData.baseEmissiveI ?? ch.material.emissiveIntensity) * glint;
        }
      });
    });
    if (earthDebrisPoints) {
      earthDebrisPoints.rotation.y += dt * 0.42;
      earthDebrisPoints.rotation.x += dt * 0.08;
      if (earthDebrisPoints.material) {
        earthDebrisPoints.material.opacity = 0.58 + Math.sin(t * 0.0022) * 0.12;
      }
    }
    if (leoOrbitRing && leoOrbitRing.material) {
      leoOrbitRing.material.opacity = 0.08 + glint * 0.1;
    }
    if (geoOrbitRing && geoOrbitRing.material) {
      geoOrbitRing.material.opacity = 0.06 + glint * 0.08;
    }
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

  // Lightweight decorative comet fly-bys during preloader cosmic descent (z ~ 5.5 → 2.5)
  const _preloaderCometPathA = new THREE.Vector3();
  const _preloaderCometPathB = new THREE.Vector3();
  const _preloaderCometDir = new THREE.Vector3();

  function preloaderCometCount() {
    return (isPreloaderMobile() || perfTier === 'low') ? 3 : 6;
  }

  function makePreloaderCometTailTexture() {
    const w = perfTier === 'high' ? 256 : 128;
    const h = perfTier === 'high' ? 48 : 24;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const x = c.getContext('2d');
    const g = x.createLinearGradient(0, h * 0.5, w, h * 0.5);
    g.addColorStop(0, 'rgba(255,248,228,0.92)');
    g.addColorStop(0.12, 'rgba(255,218,150,0.62)');
    g.addColorStop(0.42, 'rgba(255,175,85,0.22)');
    g.addColorStop(1, 'rgba(255,130,45,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, w, h);
    x.globalCompositeOperation = 'destination-out';
    const vg = x.createLinearGradient(0, 0, 0, h);
    vg.addColorStop(0, 'rgba(0,0,0,0.55)');
    vg.addColorStop(0.5, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.55)');
    x.fillStyle = vg;
    x.fillRect(0, 0, w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  function disposePreloaderComets() {
    if (!preloaderComets) return;
    const shared = preloaderComets.userData;
    scene.remove(preloaderComets);
    preloaderComets.traverse((ch) => {
      if (ch.material) ch.material.dispose();
    });
    if (shared && shared.nucleusTex) shared.nucleusTex.dispose();
    if (shared && shared.tailTex) shared.tailTex.dispose();
    preloaderComets = null;
  }

  function buildPreloaderComets() {
    disposePreloaderComets();
    if (!scene) return;

    const specs = [
      { delay: 0.00, span: 0.34, zLo: 2.2, zHi: 5.6, from: [780, 160, -360], to: [-220, -40, 620], tail: 58, width: 8.2, tint: 0xfff4dc },
      { delay: 0.10, span: 0.36, zLo: 2.2, zHi: 5.4, from: [-680, 280, 480], to: [340, 30, -820], tail: 52, width: 7.4, tint: 0xffecd0 },
      { delay: 0.18, span: 0.32, zLo: 2.2, zHi: 5.1, from: [180, -240, 880], to: [-600, 100, -160], tail: 48, width: 6.8, tint: 0xfff0d8 },
      { delay: 0.26, span: 0.34, zLo: 2.2, zHi: 4.8, from: [-380, 420, -720], to: [500, -80, 380], tail: 50, width: 7.0, tint: 0xffe8c8 },
      { delay: 0.34, span: 0.30, zLo: 2.2, zHi: 4.5, from: [620, -120, 540], to: [-480, 200, -640], tail: 46, width: 6.6, tint: 0xfff8e8 },
      { delay: 0.42, span: 0.28, zLo: 2.2, zHi: 4.2, from: [-220, 360, 760], to: [680, -60, -420], tail: 44, width: 6.4, tint: 0xffe0b8 },
    ];
    const count = preloaderCometCount();

    preloaderComets = new THREE.Group();
    preloaderComets.name = 'preloaderComets';
    preloaderComets.visible = false;
    preloaderComets.userData = {
      nucleusTex: makeGlowTexture('rgba(255,248,235,0.95)', 'rgba(255,195,110,0.0)'),
      tailTex: makePreloaderCometTailTexture(),
    };

    const nucSize = perfTier === 'high' ? 11 : perfTier === 'mid' ? 9 : 7.5;

    for (let i = 0; i < count; i++) {
      const spec = specs[i];
      const cg = new THREE.Group();
      cg.visible = false;

      const tail = new THREE.Sprite(new THREE.SpriteMaterial({
        map: preloaderComets.userData.tailTex,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
        opacity: 0.55,
        color: spec.tint,
      }));
      tail.scale.set(spec.tail, spec.width, 1);
      tail.center.set(0.08, 0.5, 0);
      cg.add(tail);

      const nucleus = new THREE.Sprite(new THREE.SpriteMaterial({
        map: preloaderComets.userData.nucleusTex,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
        opacity: 0.85,
        color: spec.tint,
      }));
      nucleus.scale.set(nucSize, nucSize, 1);
      cg.add(nucleus);

      cg.userData = {
        zLo: spec.zLo,
        zHi: spec.zHi,
        delay: spec.delay,
        span: spec.span,
        pathStart: _preloaderCometPathA.set(spec.from[0], spec.from[1], spec.from[2]).clone(),
        pathEnd: _preloaderCometPathB.set(spec.to[0], spec.to[1], spec.to[2]).clone(),
        tail,
        nucleus,
        tailScale: spec.tail,
        tailWidth: spec.width,
        tailOffset: spec.tail * 0.42,
      };

      preloaderComets.add(cg);
    }

    scene.add(preloaderComets);
  }

  function updatePreloaderComets(p, z, t) {
    if (!preloaderComets || !preloaderCosmicJourney) return;

    let anyVisible = false;
    preloaderComets.children.forEach((cg) => {
      const ud = cg.userData;
      const inZ = z <= ud.zHi && z >= ud.zLo;
      if (!inZ) {
        cg.visible = false;
        return;
      }

      const zProg = (ud.zHi - z) / (ud.zHi - ud.zLo);
      const flyT = Math.max(0, Math.min(1, (zProg - ud.delay) / ud.span));
      if (flyT <= 0 || flyT >= 1) {
        cg.visible = false;
        return;
      }

      anyVisible = true;
      cg.visible = true;
      const e = easeOutCubic(flyT);
      cg.position.lerpVectors(ud.pathStart, ud.pathEnd, e);

      _preloaderCometDir.copy(ud.pathEnd).sub(ud.pathStart).normalize();
      ud.nucleus.position.set(0, 0, 0);
      ud.tail.position.copy(_preloaderCometDir).multiplyScalar(-ud.tailOffset);

      const peak = Math.sin(flyT * Math.PI);
      const twinkle = 0.92 + Math.sin(t * 0.004 + p * 6 + ud.delay * 12) * 0.08;
      const opa = (0.32 + peak * 0.58) * twinkle;
      ud.nucleus.material.opacity = opa;
      ud.tail.material.opacity = opa * 0.72;
      const tailStretch = 0.75 + peak * 0.35;
      ud.tail.scale.set(ud.tailScale * tailStretch, ud.tailWidth * (0.85 + peak * 0.2), 1);
    });

    preloaderComets.visible = anyVisible;
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
    // OrbitLab 2026-07-05 port: five more bright anchors for the local-stars scale
    { name: 'Rigel', dir: [-0.62, -0.42, 0.66], dist: 96, color: 0xe8f0ff },
    { name: 'Deneb', dir: [0.22, 0.88, 0.42], dist: 98, color: 0xf0f8ff },
    { name: 'Spica', dir: [-0.48, -0.72, 0.50], dist: 82, color: 0xe0ecff },
    { name: 'Antares', dir: [-0.58, -0.22, 0.78], dist: 88, color: 0xffa888 },
    { name: 'Fomalhaut', dir: [0.52, -0.68, 0.52], dist: 76, color: 0xfff8e8 },
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

  // Shared soft round-dot map for every galaxy point cloud. Without a map,
  // PointsMaterial renders naked square gl.POINTS — the "blocky staircase" defect.
  // Same soft-disc falloff idea as the starfield shader (makeStarPointsMaterial).
  let _galaxyDotTex = null;
  function galaxySoftDotTexture() {
    if (_galaxyDotTex) return _galaxyDotTex;
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.65)');
    g.addColorStop(0.7, 'rgba(255,255,255,0.16)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    _galaxyDotTex = new THREE.CanvasTexture(c);
    return _galaxyDotTex;
  }

  // OrbitLab 2026-07-05 port — Gaia DR3 / ESA 2025 barred-spiral model:
  // 4 major arms, inclined bar, Orion spur.
  const MILKY_R0 = 44;
  const MILKY_PITCH = 12.8 * D2R;
  const MILKY_BAR_ANG = 32 * D2R;
  const MILKY_ARMS = [
    { phase: 0.55, name: 'Sagittarius–Carina' },
    { phase: 2.12, name: 'Scutum–Centaurus' },
    { phase: 3.68, name: 'Norma' },
    { phase: 5.24, name: 'Perseus' },
  ];
  const SUN_GALACTIC_R = 132;
  const SUN_ARM_PHASE = 0.55;

  function milkySpiralTheta(armPhase, radius) {
    return armPhase + Math.log(Math.max(radius, MILKY_R0) / MILKY_R0) / Math.tan(MILKY_PITCH);
  }

  function milkySpiralXY(armPhase, radius, scatter) {
    const th = milkySpiralTheta(armPhase, radius) + (scatter || 0);
    return { x: Math.cos(th) * radius, z: Math.sin(th) * radius, th };
  }

  function galaxyBarTexture() {
    const c = document.createElement('canvas');
    c.width = 640; c.height = 72;
    const x = c.getContext('2d');
    const along = x.createLinearGradient(0, 36, 640, 36);
    along.addColorStop(0, 'rgba(200,150,90,0)');
    along.addColorStop(0.12, 'rgba(255,210,150,0.42)');
    along.addColorStop(0.5, 'rgba(255,245,215,0.58)');
    along.addColorStop(0.88, 'rgba(255,210,150,0.42)');
    along.addColorStop(1, 'rgba(200,150,90,0)');
    x.fillStyle = along;
    x.fillRect(0, 0, 640, 72);
    x.globalCompositeOperation = 'destination-in';
    const across = x.createLinearGradient(320, 0, 320, 72);
    across.addColorStop(0, 'rgba(255,255,255,0)');
    across.addColorStop(0.28, 'rgba(255,255,255,1)');
    across.addColorStop(0.72, 'rgba(255,255,255,1)');
    across.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = across;
    x.fillRect(0, 0, 640, 72);
    return new THREE.CanvasTexture(c);
  }

  function galaxyArmRibbonTexture(hue) {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 64;
    const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 32, 256, 32);
    const inner = hue === 'blue'
      ? 'rgba(140,190,255,0.55)' : hue === 'pink'
        ? 'rgba(255,180,220,0.42)' : 'rgba(255,220,170,0.48)';
    const outer = hue === 'blue'
      ? 'rgba(60,100,180,0.08)' : hue === 'pink'
        ? 'rgba(180,90,140,0.06)' : 'rgba(180,140,80,0.06)';
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.2, outer);
    g.addColorStop(0.5, inner);
    g.addColorStop(0.8, outer);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 256, 64);
    // Soften the long edges too — without a cross-axis falloff the ribbons render
    // as hard-edged rectangles ("brush stroke" smears) instead of soft arm glow.
    x.globalCompositeOperation = 'destination-in';
    const v = x.createLinearGradient(0, 0, 0, 64);
    v.addColorStop(0, 'rgba(255,255,255,0)');
    v.addColorStop(0.5, 'rgba(255,255,255,1)');
    v.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = v;
    x.fillRect(0, 0, 256, 64);
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
      map: galaxySoftDotTexture(), size: perfTier === 'high' ? 0.42 : 0.34,
      vertexColors: true, transparent: true,
      opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
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
        blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
        color: s.color, fog: false,
      }));
      core.scale.set(3.2, 3.2, 1);
      core.position.copy(d);
      core.userData.baseOpa = 1;
      core.userData.twinkle = 0.4 + Math.random() * 0.6;
      localStarsGroup.add(core);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({
        map: makeGlowTexture('rgba(200,220,255,0.25)', 'rgba(80,120,200,0.0)'),
        blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
        opacity: 0.5, fog: false,
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
      blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false,
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

  // OrbitLab 2026-07-05 port — Gaia/VFX Milky Way rebuild: multi-layer barred spiral
  // (disk/bulge/bar point clouds, dust lanes, HII sprites, arm-glow ribbons, LMC/SMC,
  // core ring + edge-on halo disk). Everything galaxy-shaped goes into milkyWayGroup
  // so the galactic tilt is shared and the ecliptic-aligned layers stay upright.
  function buildMilkyWaySpiral() {
    // Denser + finer than the OrbitLab source: small soft points reading as
    // continuous star dust (the upstream build used fewer, larger, square points).
    const diskCount = perfTier === 'low' ? 28000 : perfTier === 'mid' ? 54000 : 88000;
    const bulgeCount = perfTier === 'low' ? 3200 : perfTier === 'mid' ? 5800 : 9500;
    const dustCount = perfTier === 'low' ? 4200 : perfTier === 'mid' ? 8200 : 14000;
    const barCount = perfTier === 'low' ? 1800 : perfTier === 'mid' ? 3200 : 5200;

    function fillDiskPoints(count, bulge, bar) {
      const pos = new Float32Array(count * 3);
      const col = new Float32Array(count * 3);
      let idx = 0;
      for (let i = 0; i < bulge; i++, idx++) {
        const u = Math.random(), ang = Math.random() * Math.PI * 2;
        const rad = Math.pow(u, 0.42) * 42;
        const yScale = 0.55 + Math.random() * 0.85;
        pos[idx * 3] = Math.cos(ang) * rad;
        pos[idx * 3 + 1] = (Math.random() - 0.5) * 14 * yScale;
        pos[idx * 3 + 2] = Math.sin(ang) * rad;
        const w = 0.5 + Math.random() * 0.5;
        col[idx * 3] = 1.0 * w; col[idx * 3 + 1] = 0.9 * w; col[idx * 3 + 2] = 0.68 * w;
      }
      for (let i = 0; i < bar; i++, idx++) {
        const along = (Math.random() - 0.5) * 86;
        const across = (Math.random() - 0.5) * 12;
        pos[idx * 3] = along * Math.cos(MILKY_BAR_ANG) - across * Math.sin(MILKY_BAR_ANG);
        pos[idx * 3 + 1] = (Math.random() - 0.5) * 6;
        pos[idx * 3 + 2] = along * Math.sin(MILKY_BAR_ANG) + across * Math.cos(MILKY_BAR_ANG);
        const w = 0.48 + Math.random() * 0.52;
        col[idx * 3] = 1.0 * w; col[idx * 3 + 1] = 0.86 * w; col[idx * 3 + 2] = 0.58 * w;
      }
      while (idx < count) {
        const arm = MILKY_ARMS[Math.floor(Math.random() * MILKY_ARMS.length)];
        const t = Math.pow(Math.random(), 0.62);
        // Triangular jitter both radially and across the arm — the upstream
        // uniform narrow scatter left points marching in single-file "staircase"
        // chains along the spiral instead of reading as diffuse dust.
        const rad = MILKY_R0 + t * 560 + (Math.random() + Math.random() - 1) * 26;
        const armScatter = (Math.random() + Math.random() - 1) * (0.10 + t * 0.16);
        const p = milkySpiralXY(arm.phase, rad, armScatter);
        const diskH = (8 + t * 16) * (1 - t * 0.35);
        const y = (Math.random() - 0.5) * diskH;
        const interarm = Math.abs(armScatter) > 0.06;
        const young = t < 0.52 && Math.random() < (interarm ? 0.12 : 0.42);
        const dustLane = interarm && Math.random() < 0.22;
        let r, g, b;
        if (dustLane) {
          r = 0.28; g = 0.24; b = 0.2;
        } else if (young) {
          const wv = Math.random();
          r = 0.52 + wv * 0.22; g = 0.76 + wv * 0.16; b = 0.98;
        } else {
          const warm = Math.random();
          r = 0.64 + warm * 0.24; g = 0.7 + warm * 0.18; b = 0.88 + (1 - warm) * 0.1;
        }
        pos[idx * 3] = p.x; pos[idx * 3 + 1] = y; pos[idx * 3 + 2] = p.z;
        const w = 0.38 + Math.random() * 0.62;
        col[idx * 3] = r * w; col[idx * 3 + 1] = g * w; col[idx * 3 + 2] = b * w;
        idx++;
      }
      return { pos, col };
    }

    const bulgeOnly = fillDiskPoints(bulgeCount, bulgeCount, 0);
    milkyWayBulge = new THREE.Points(
      new THREE.BufferGeometry()
        .setAttribute('position', new THREE.BufferAttribute(bulgeOnly.pos, 3))
        .setAttribute('color', new THREE.BufferAttribute(bulgeOnly.col, 3)),
      new THREE.PointsMaterial({
        map: galaxySoftDotTexture(), size: perfTier === 'high' ? 0.66 : 0.52,
        vertexColors: true, transparent: true,
        opacity: 0.92, depthWrite: false, blending: THREE.AdditiveBlending,
        sizeAttenuation: true, fog: false,
      })
    );
    milkyWayBulge.visible = false;
    milkyWayGroup.add(milkyWayBulge);

    const disk = fillDiskPoints(diskCount, 0, barCount);
    milkyWayDisk = new THREE.Points(
      new THREE.BufferGeometry()
        .setAttribute('position', new THREE.BufferAttribute(disk.pos, 3))
        .setAttribute('color', new THREE.BufferAttribute(disk.col, 3)),
      new THREE.PointsMaterial({
        map: galaxySoftDotTexture(),
        size: perfTier === 'high' ? 0.55 : perfTier === 'mid' ? 0.45 : 0.38,
        vertexColors: true, transparent: true, opacity: 0.9,
        depthWrite: false, blending: THREE.AdditiveBlending,
        sizeAttenuation: true, fog: false,
      })
    );
    milkyWayDisk.visible = false;
    milkyWayGroup.add(milkyWayDisk);

    const dPos = new Float32Array(dustCount * 3);
    const dCol = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      const arm = MILKY_ARMS[Math.floor(Math.random() * MILKY_ARMS.length)];
      const t = 0.12 + Math.random() * 0.82;
      // Jittered lane: the upstream two fixed angular offsets made the dust march
      // in discrete parallel chains of dark squares ("staircase streaks").
      const rad = MILKY_R0 + t * 520 + (Math.random() + Math.random() - 1) * 22;
      const laneOffset = (Math.random() < 0.5 ? -1 : 1) * (0.06 + (Math.random() + Math.random()) * 0.07);
      const p = milkySpiralXY(arm.phase, rad, laneOffset);
      dPos[i * 3] = p.x;
      dPos[i * 3 + 1] = (Math.random() - 0.5) * (5 + t * 7);
      dPos[i * 3 + 2] = p.z;
      const w = 0.35 + Math.random() * 0.45;
      dCol[i * 3] = 0.18 * w; dCol[i * 3 + 1] = 0.14 * w; dCol[i * 3 + 2] = 0.12 * w;
    }
    // Dust MODULATES (soft, translucent smoke over the bright disk) — never an
    // opaque dark occluder over the page void.
    milkyWayDust = new THREE.Points(
      new THREE.BufferGeometry()
        .setAttribute('position', new THREE.BufferAttribute(dPos, 3))
        .setAttribute('color', new THREE.BufferAttribute(dCol, 3)),
      new THREE.PointsMaterial({
        map: galaxySoftDotTexture(), size: perfTier === 'high' ? 1.7 : 1.3,
        vertexColors: true, transparent: true,
        opacity: 0.18, depthWrite: false, blending: THREE.NormalBlending,
        sizeAttenuation: true, fog: false,
      })
    );
    milkyWayDust.visible = false;
    milkyWayGroup.add(milkyWayDust);

    // HII knots: small round nebula glows on the arms. The upstream build reused
    // the RIBBON texture here (hard-edged rectangles, screen-space rotated) which
    // rendered as huge crossing smears.
    milkyWayHII = new THREE.Group();
    const hiiN = perfTier === 'low' ? 48 : perfTier === 'mid' ? 88 : 140;
    const hiiTexBlue = galaxySpriteTexture('rgba(150,195,255,0.5)', 'rgba(70,110,190,0.05)', 128, 128);
    const hiiTexPink = galaxySpriteTexture('rgba(255,190,225,0.5)', 'rgba(180,90,140,0.05)', 128, 128);
    for (let i = 0; i < hiiN; i++) {
      const arm = MILKY_ARMS[i % MILKY_ARMS.length];
      const t = 0.08 + Math.random() * 0.58;
      const rad = MILKY_R0 + t * 380 + Math.random() * 24;
      const p = milkySpiralXY(arm.phase, rad, (Math.random() - 0.5) * 0.05);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: Math.random() < 0.35 ? hiiTexPink : hiiTexBlue,
        blending: THREE.AdditiveBlending, transparent: true,
        depthWrite: false, opacity: 0.26 + Math.random() * 0.24, fog: false,
      }));
      const sc = 7 + Math.random() * 13;
      sp.scale.set(sc, sc, 1);
      sp.position.set(p.x, (Math.random() - 0.5) * 5, p.z);
      sp.userData.baseOpa = sp.material.opacity;
      sp.userData.tw = 0.5 + Math.random();
      milkyWayHII.add(sp);
    }
    milkyWayHII.visible = false;
    milkyWayGroup.add(milkyWayHII);

    // Arm-glow plates. These were billboarded Sprites with a screen-space rotation
    // guess — from the oblique gallery camera they smeared ACROSS the disk as giant
    // crossing rectangles. Flat planes lying IN the galactic plane co-rotate with
    // the group, so the glow always hugs the spiral from any camera angle.
    milkyWayArmRibbons = new THREE.Group();
    const ribbonPerArm = perfTier === 'low' ? 5 : perfTier === 'mid' ? 8 : 12;
    MILKY_ARMS.forEach((arm, ai) => {
      const hue = ai % 2 === 0 ? 'gold' : 'blue';
      const tex = galaxyArmRibbonTexture(hue);
      for (let ri = 0; ri < ribbonPerArm; ri++) {
        const t = 0.18 + (ri / ribbonPerArm) * 0.78;
        const rad = MILKY_R0 + t * 500;
        const p = milkySpiralXY(arm.phase, rad, 0);
        const len = 55 + t * 90;
        const mesh = new THREE.Mesh(
          new THREE.PlaneGeometry(len, len * 0.3),
          new THREE.MeshBasicMaterial({
            map: tex, blending: THREE.AdditiveBlending, transparent: true,
            depthWrite: false, opacity: 0.14 + t * 0.12,
            side: THREE.DoubleSide, fog: false,
          })
        );
        // log-spiral tangent in the XZ plane is (th + 90° − pitch)
        mesh.rotation.order = 'YXZ';
        mesh.rotation.y = -(p.th + Math.PI / 2 - MILKY_PITCH);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(p.x, 0, p.z);
        mesh.userData.baseOpa = mesh.material.opacity;
        milkyWayArmRibbons.add(mesh);
      }
    });
    milkyWayArmRibbons.visible = false;
    milkyWayGroup.add(milkyWayArmRibbons);

    milkyWaySatellites = new THREE.Group();
    [
      { name: 'LMC', pos: [-210, -48, 430], sc: 28, col: 'rgba(255,210,170,0.35)' },
      { name: 'SMC', pos: [-178, -62, 405], sc: 16, col: 'rgba(200,210,255,0.28)' },
    ].forEach((sat) => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: galaxySpriteTexture(sat.col, 'rgba(40,50,80,0.04)', 256, 256),
        blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
        opacity: 0.65, fog: false,
      }));
      sp.scale.set(sat.sc, sat.sc * 0.85, 1);
      sp.position.set(sat.pos[0], sat.pos[1], sat.pos[2]);
      sp.userData.baseOpa = 0.65;
      milkyWaySatellites.add(sp);
      const lab = makeLabel(sat.name);
      lab.position.set(sat.pos[0], sat.pos[1] + sat.sc * 0.35, sat.pos[2]);
      lab.scale.set(0.45, 0.45, 1);
      milkyWaySatellites.add(lab);
    });
    milkyWaySatellites.visible = false;
    milkyWayGroup.add(milkyWaySatellites);

    sunMarker = new THREE.Group();
    const sunP = milkySpiralXY(SUN_ARM_PHASE + 0.14, SUN_GALACTIC_R, 0.06);
    const sunPos = new THREE.Vector3(sunP.x, 2.8, sunP.z);
    const sm = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture('rgba(255,230,160,0.95)', 'rgba(255,180,60,0.0)'),
      blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false,
    }));
    sm.scale.set(5.5, 5.5, 1);
    sm.position.copy(sunPos);
    sunMarker.add(sm);
    const sl = makeLabel('Sun · Orion–Cygnus spur');
    sl.position.set(sunPos.x, sunPos.y + 4.5, sunPos.z);
    sl.scale.set(0.68, 0.68, 1);
    sunMarker.add(sl);
    sunMarker.visible = false;
    milkyWayGroup.add(sunMarker);

    galacticCore = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture('rgba(255,252,235,0.72)', 'rgba(255,210,130,0.0)'),
      blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
      opacity: 0.82, fog: false,
    }));
    galacticCore.scale.set(62, 62, 1);
    galacticCore.position.set(0, 1.8, 0);
    galacticCore.visible = false;
    milkyWayGroup.add(galacticCore);

    galacticCoreRing = new THREE.Sprite(new THREE.SpriteMaterial({
      map: galaxySpriteTexture('rgba(255,220,160,0.22)', 'rgba(180,120,60,0.0)', 512, 512),
      blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
      opacity: 0.48, fog: false,
    }));
    galacticCoreRing.scale.set(118, 118, 1);
    galacticCoreRing.position.set(0, 1.2, 0);
    galacticCoreRing.visible = false;
    milkyWayGroup.add(galacticCoreRing);

    // The bar was a billboarded Sprite whose Object3D rotation.z is a NO-OP for
    // sprites — it drew as a misaligned screen-space streak. A flat plane lying
    // in the disk plane co-rotates with the point bar correctly.
    galacticBar = new THREE.Mesh(
      new THREE.PlaneGeometry(128, 30),
      new THREE.MeshBasicMaterial({
        map: galaxyBarTexture(),
        blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
        opacity: 0.58, side: THREE.DoubleSide, fog: false,
      })
    );
    galacticBar.rotation.order = 'YXZ';
    galacticBar.rotation.y = -MILKY_BAR_ANG;
    galacticBar.rotation.x = -Math.PI / 2;
    galacticBar.position.set(0, 0.6, 0);
    galacticBar.visible = false;
    milkyWayGroup.add(galacticBar);

    galacticHalo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: galaxySpriteTexture('rgba(90,120,200,0.16)', 'rgba(25,35,70,0.0)', 1024, 512),
      blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
      opacity: 0.38, fog: false,
    }));
    galacticHalo.scale.set(1120, 320, 1);
    galacticHalo.visible = false;
    milkyWayGroup.add(galacticHalo);

    // In-plane ambient disk sheen (was a Sprite with an ignored rotation.x that
    // rendered as an arbitrary horizontal streak). Ties the arms together softly.
    galacticHaloDisk = new THREE.Mesh(
      new THREE.PlaneGeometry(1150, 1150),
      new THREE.MeshBasicMaterial({
        map: galaxySpriteTexture('rgba(120,140,190,0.10)', 'rgba(40,55,95,0.03)', 512, 512),
        blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
        opacity: 0.26, side: THREE.DoubleSide, fog: false,
      })
    );
    galacticHaloDisk.rotation.x = -Math.PI / 2;
    galacticHaloDisk.visible = false;
    milkyWayGroup.add(galacticHaloDisk);
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
      map: galaxySoftDotTexture(), size: perfTier === 'high' ? 0.72 : 0.54,
      vertexColors: true, transparent: true,
      opacity: 0.88, depthWrite: false, blending: THREE.AdditiveBlending,
      sizeAttenuation: true, fog: false,
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
        map: tex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
        opacity: 0.55, fog: false,
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
      map: galaxySoftDotTexture(), size: perfTier === 'high' ? 0.58 : 0.48,
      vertexColors: true, transparent: true,
      opacity: 0.38, depthWrite: false, blending: THREE.AdditiveBlending,
      sizeAttenuation: true, fog: false,
    }));
    deep.userData.baseOpa = 0.38;
    cosmicField.add(deep);
    cosmicField.visible = false;
    galaxyGroup.add(cosmicField);
  }

  let galaxyBuilt = false;
  let milkySpiralBuilt = false;

  // OrbitLab 2026-07-05 port: the ~100k-point spiral build is deferred to idle time so it
  // never blocks first paint. When the homepage preloader owns the orrery the galaxy is
  // visible immediately, so build synchronously there (matches the old site behavior).
  function scheduleMilkyWaySpiral() {
    if (milkySpiralBuilt || !milkyWayGroup || destroyed) return;
    const run = () => {
      if (milkySpiralBuilt || !milkyWayGroup || destroyed) return;
      milkySpiralBuilt = true;
      try { buildMilkyWaySpiral(); } catch (e) { console.warn('[orrery] milky spiral deferred build failed:', e); }
    };
    if (window.__orreryPreloaderOwns) { run(); return; }
    const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 60));
    idle(run, { timeout: 1200 });
  }

  function buildGalaxyLayers() {
    if (galaxyBuilt || !scene) return;
    galaxyBuilt = true;
    galaxyGroup = new THREE.Group();
    scene.add(galaxyGroup);
    milkyWayGroup = new THREE.Group();
    milkyWayGroup.rotation.x = GALACTIC_TILT_X;
    milkyWayGroup.rotation.z = 25 * D2R;
    galaxyGroup.add(milkyWayGroup);
    buildOortShell();
    buildLocalStars();
    buildCatalogStars();
    buildCosmicField();
    scheduleMilkyWaySpiral();
  }

  function ensureGalaxyLayers() {
    if (!galaxyBuilt) buildGalaxyLayers();
  }

  function scaleFade(z, center, width) {
    const d = Math.abs(z - center) / Math.max(width, 0.001);
    return Math.max(0, 1 - d);
  }

  function wantsDetailLighting() {
    if (detailLightingUser !== null) return detailLightingUser;
    if (scaleLevel >= 3) return false;
    if (focusPlanetId === 'sun') return false;
    if (focusPlanetId || focusFrameId) return true; // v576: detail lighting persists while parked at a focused body
    return scaleLevel <= 1;
  }

  function syncPlanetShaderDetail(detail) {
    const wash = detail ? 0.03 : 0.11;
    const rim = detail ? 0.04 : 0.08;
    BODIES.forEach((b) => {
      const g = meshes[b.id];
      const sh = g && g.userData.mat && g.userData.mat.userData.planetShader;
      if (sh && sh.uniforms.uLightWash) {
        sh.uniforms.uLightWash.value = wash;
        sh.uniforms.uRimMul.value = rim;
      }
    });
    if (moonMesh && moonMesh.material && moonMesh.material.userData.planetShader) {
      const sh = moonMesh.material.userData.planetShader;
      if (sh.uniforms.uLightWash) {
        sh.uniforms.uLightWash.value = wash;
        sh.uniforms.uRimMul.value = rim;
      }
    }
  }

  function syncSunGlowProfile(detail) {
    if (!sunGlow.length || !composer) return;
    const tier = perfTier;
    // v576: while parked at an outer-planet portrait, pull the glare down ~60%
    // so Saturn reads as a textured ringed portrait, not a speck against sun glow.
    const outerFocus = focusFrameId && /^(jupiter|saturn|uranus|neptune)$/.test(focusFrameId);
    sunGlow.forEach((sp, i) => {
      if (!sp.material) return;
      if (detail) {
        sp.visible = i === 0;
        sp.material.opacity = i === 0 ? (outerFocus ? 0.07 : 0.18) : 0;
      } else if (tier === 'high' && i >= 1) {
        sp.visible = false;
      } else {
        sp.visible = true;
        sp.material.opacity = tier === 'mid'
          ? (i === 0 ? 0.38 : i === 1 ? 0.18 : 0.08)
          : (i === 0 ? 0.28 : 0);
      }
      sp.userData.baseOpa = sp.material.opacity;
    });
  }

  function syncDetailLighting() {
    const detail = wantsDetailLighting();
    syncSunGlowProfile(detail);
    syncPlanetShaderDetail(detail);
    if (sunPointLight) {
      sunPointLight.intensity = detail ? 2.2 : (perfTier === 'high' ? 4.3 : 3.6);
    }
    if (sunDirLight) {
      sunDirLight.intensity = detail ? 1.7 : (perfTier === 'high' ? 2.7 : 2.25);
    }
    return detail;
  }

  function applyCinematicLighting(z) {
    if (spaceFlightMode) {
      applySpacePalette(z);
      return;
    }
    const galaxyT = Math.max(0, Math.min(1, (z - 3.8) / 1.2));
    const earthT = Math.max(0, Math.min(1, (2.2 - z) / 2.2));
    const detail = syncDetailLighting();
    if (scene && scene.fog && !portraitMode) {
      scene.fog.density = 0.00045 + galaxyT * 0.00085;
      if (isAwardMode()) {
        scene.fog.color.set(z >= 5.2 ? 0x0c1016 : z >= 4 ? 0x121826 : z >= 3 ? 0x1a2230 : 0x0c1016);
      } else {
        scene.fog.color.set(z >= 5.2 ? 0x04020c : z >= 4 ? 0x06041a : z >= 3 ? 0x050c18 : 0x050406);
      }
    }
    if (renderer) {
      let exp = 1.32 - galaxyT * 0.16 - (1 - earthT) * 0.08;
      if (detail) exp -= 0.12;
      renderer.toneMappingExposure = exp;
    }
    if (hemiLight) {
      if (isAwardMode()) {
        // v576: at close (Earth) scales, drop the ambient fill so the night limb
        // falls off to darkness instead of glowing eggshell; cooler tint up close.
        hemiLight.color.setHex(galaxyT > 0.35 ? 0x8a9ab8 : (earthT > 0.55 ? 0x46586e : 0x5a6a88));
        hemiLight.intensity = (perfTier === 'high' ? 0.52 : 0.44) * (0.88 + earthT * 0.14) * (1 - earthT * 0.45);
      } else {
        hemiLight.color.setHex(galaxyT > 0.35 ? 0x8090b8 : 0x4a6088);
        hemiLight.intensity = (perfTier === 'high' ? 0.48 : 0.40) * (0.85 + earthT * 0.15);
      }
    }
    if (bloomPass) {
      if (detail && z <= 2.4) {
        bloomPass.strength = perfTier === 'mid' ? 0.05 : 0.08;
        bloomPass.threshold = perfTier === 'mid' ? 0.97 : 0.96;
      } else if (z < 0.6) {
        bloomPass.strength = perfTier === 'mid' ? 0.14 : 0.20;
        bloomPass.threshold = perfTier === 'mid' ? 0.90 : 0.86;
      } else {
        bloomPass.strength = z >= 4.8 ? 0.42 : perfTier === 'mid' ? 0.14 : 0.20;
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
        let s = z <= 2 ? 1 : z <= 3 ? 0.45 + (3 - z) * 0.55 : 0.15;
        if (preloaderCosmicJourney && z >= 1.4 && z <= 2.6) {
          s *= 1.06 + Math.sin((2.6 - z) * 1.8) * 0.04;
        }
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
    const earthDetailZ = preloaderCosmicJourney ? 1.52 : 1.2;
    if (moonGroup) moonGroup.visible = showSolar && z <= earthDetailZ;
    if (earthCloud) earthCloud.visible = showSolar && z <= earthDetailZ;
    if (earthOrbitGroup) {
      earthOrbitGroup.visible = showSolar && z <= earthDetailZ;
      if (earthOrbitGroup.visible && preloaderCosmicJourney) {
        const nearEarth = Math.max(0, (earthDetailZ - z) / earthDetailZ);
        earthOrbitGroup.scale.setScalar(1 + nearEarth * 0.42);
      } else {
        earthOrbitGroup.scale.setScalar(1);
      }
    }
    if (moonHaloMesh && moonGroup && moonGroup.visible) {
      moonHaloMesh.material.opacity = 0.04 + Math.max(0, (earthDetailZ - z) / earthDetailZ) * 0.08;
    }
    orbitLines.forEach((o) => {
      o.visible = (showOrbits || (spaceFlightMode && z >= 0.85 && z <= 2.65)) && z <= 3.2;
    });
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
        const rush = preloaderCosmicJourney && z >= 3.5 && z <= 5.5 ? 1.35 : 1;
        catalogStarsGroup.material.opacity = (catalogStarsGroup.userData.baseOpa ?? 0.88) * catF * rush;
        catalogStarsGroup.material.size = (perfTier === 'high' ? 0.72 : 0.54) * (rush > 1 ? 1.22 : 1);
      }
    }
    const galF = scaleFade(z, 5, 0.85);
    const galDeep = scaleFade(z, 5.2, 1.1);
    // Deep-field linger: the spiral used to fade to ZERO by COSMOS scale, leaving
    // the whole (opaque, CSS-masked) canvas an empty black frame — the "black blob".
    // Keep a dim Milky Way portrait alive at the centre of the deep field instead.
    const galHold = Math.max(galF, scaleFade(z, 6.4, 2.4) * 0.38);
    // OrbitLab 2026-07-05 port: fade wiring for the multi-layer barred spiral
    if (milkyWayBulge) {
      milkyWayBulge.visible = galHold > 0.02;
      if (milkyWayBulge.material) milkyWayBulge.material.opacity = 0.9 * galHold;
    }
    if (milkyWayDisk) {
      milkyWayDisk.visible = galHold > 0.02;
      if (milkyWayDisk.material) milkyWayDisk.material.opacity = 0.88 * galHold;
    }
    if (milkyWayDust) {
      milkyWayDust.visible = galF > 0.12;
      if (milkyWayDust.material) milkyWayDust.material.opacity = 0.18 * galF;
    }
    if (milkyWayArmRibbons) {
      milkyWayArmRibbons.visible = galHold > 0.1;
      milkyWayArmRibbons.children.forEach((ch) => {
        if (!ch.material) return;
        ch.material.opacity = (ch.userData.baseOpa ?? 0.2) * galHold;
      });
    }
    if (milkyWayHII) {
      milkyWayHII.visible = galF > 0.22;
      milkyWayHII.children.forEach((ch) => {
        if (!ch.material) return;
        ch.material.opacity = (ch.userData.baseOpa ?? 0.6) * galF;
      });
    }
    if (milkyWaySatellites) {
      milkyWaySatellites.visible = galDeep > 0.28;
      milkyWaySatellites.children.forEach((ch) => {
        if (!ch.material) return;
        ch.material.opacity = (ch.userData.baseOpa ?? 0.6) * galDeep;
      });
    }
    if (sunMarker) sunMarker.visible = galF > 0.35 && z < 5.8;
    if (galacticCore) {
      galacticCore.visible = galHold > 0.12;
      if (galacticCore.material) galacticCore.material.opacity = 0.78 * galHold;
    }
    if (galacticCoreRing) {
      galacticCoreRing.visible = galHold > 0.15;
      if (galacticCoreRing.material) galacticCoreRing.material.opacity = 0.46 * galHold;
    }
    if (galacticBar) {
      galacticBar.visible = galHold > 0.18;
      if (galacticBar.material) galacticBar.material.opacity = 0.58 * galHold;
    }
    if (galacticHalo) {
      const haloF = Math.max(galF, z >= 4.8 ? scaleFade(z, 5.4, 1.2) : 0);
      galacticHalo.visible = haloF > 0.02;
      if (galacticHalo.material) galacticHalo.material.opacity = 0.36 * haloF;
    }
    if (galacticHaloDisk) {
      const haloF = Math.max(galF, z >= 4.8 ? scaleFade(z, 5.4, 1.2) : 0);
      galacticHaloDisk.visible = haloF > 0.08;
      if (galacticHaloDisk.material) galacticHaloDisk.material.opacity = 0.3 * haloF;
    }
    const cosF = scaleFade(z, 6, 1.1);
    if (cosmicField) {
      cosmicField.visible = cosF > 0.02;
      cosmicField.children.forEach((ch) => {
        if (!ch.material) return;
        const base = ch.userData.baseOpa ?? (ch.type === 'Points' ? 0.38 : 0.55);
        const deepBoost = preloaderCosmicJourney && ch.type === 'Points' && z >= 5 ? 1.25 : 1;
        ch.material.opacity = base * Math.max(cosF, z >= 5.6 ? 0.55 : 0) * deepBoost;
        if (ch.type === 'Points' && preloaderCosmicJourney && z >= 5) {
          ch.material.size = (perfTier === 'high' ? 0.58 : isPreloaderMobile() ? 0.62 : 0.48);
        }
      });
    }

    applyCinematicLighting(z);
    syncSceneStarfield(lv);
    syncCosmosBlend(lv);

    if (onPreloaderStage() && !preloaderCosmicJourney) {
      applyPreloaderEarthIsolation(preloaderIntroFinished ? 1 : null);
    }
    else if (sunGlow.length && z < 0.5) {
      sunGlow.forEach((sp, i) => {
        if (!sp.material) return;
        sp.visible = i === 0;
        sp.material.opacity = 0.12; // v576: quieter resting halo (was 0.18)
        sp.userData.baseOpa = sp.material.opacity;
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
        'Drag to scrub time · Shift+drag to orbit · scroll or pinch to zoom',
        'Inner system · double-tap a planet to focus · Detail lighting on',
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
      // v576: respect the tuned per-sprite base (detail/rest/focus profiles) —
      // this ran every frame with hardcoded 0.6/0.3/0.15, stomping every profile.
      const base = sp.userData.baseOpa != null
        ? sp.userData.baseOpa
        : (i === 0 ? 0.6 : i === 1 ? 0.3 : 0.15);
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
      // Feed the globe's world centre + radius so the ring shader can cast the
      // planet's shadow across the rings (view-independent → survives portrait
      // capture, unlike the old flat shadow-band plane below).
      ringMat.uniforms.uPlanetC.value.copy(saturnPos);
      const sb = meshes.saturn.userData && meshes.saturn.userData.b;
      if (sb && ringMat.uniforms.uPlanetR) ringMat.uniforms.uPlanetR.value = sb.size;
    } else if (ringMat) ringMat.opacity = 0.9 - eclipseDim * 0.1;
    // The globe shadow is now cast physically inside the ring shader (uPlanetC/uPlanetR
    // above), which renders correctly from every angle — including the portrait capture.
    // The old flat shadow-band plane only approximated it (and mis-projected as grey
    // rectangles on the disc, so it was hidden in portraits anyway); it's retired here to
    // avoid a double shadow. Kept allocated but permanently hidden for a minimal diff.
    if (saturnShadowBand) saturnShadowBand.visible = false;
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
    }
    // 3D cellular (Worley F1) on a unit sphere direction — returns distance to the
    // nearest feature point. Low near a cell CENTRE, high on the LANES between cells:
    // this is what carves the discrete SDO/HMI granule network (bright cores, dark
    // inter-granular lanes) instead of the old cloudy fBm mottle. Time-warped by a
    // slow drift vector so cells churn honestly, never shimmer.
    vec3 sunHash3(vec3 p) {
      p = vec3(dot(p, vec3(127.1, 311.7, 74.7)),
               dot(p, vec3(269.5, 183.3, 246.1)),
               dot(p, vec3(113.5, 271.9, 124.6)));
      return fract(sin(p) * 43758.5453123);
    }
    float sunCellF1(vec3 p, vec3 jitter) {
      vec3 ip = floor(p);
      vec3 fp = fract(p);
      float f1 = 1.0;
      for (int x = -1; x <= 1; x++)
      for (int y = -1; y <= 1; y++)
      for (int z = -1; z <= 1; z++) {
        vec3 g = vec3(float(x), float(y), float(z));
        vec3 o = sunHash3(ip + g) * 0.5 + 0.5 * jitter;
        vec3 d = g + o - fp;
        f1 = min(f1, dot(d, d));
      }
      return sqrt(f1);
    }`;

  // ── Animated sun surface — turbulent photosphere + spots + faculae + flares ─
  function makeSunShaderMaterial(quality) {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uTimeSlow: { value: 0 },  // supergranulation + prominence-rise clock (sunT*0.22)
        uTimeFast: { value: 0 },  // granule-churn clock (sunT*1.6) — cells shimmer-free
        uEclipse: { value: 0 },
        uQuality: { value: quality },
        uGain: { value: 1.0 },  // capture-only: portrait mode drops this to keep the
                                // no-bloom still a GOLDEN disc, not a blown-out white one
        uGran: { value: 1.0 },  // granulation-contrast gamma. Portrait raises it so the
                                // photosphere mottle stays crisp after the gain drop
                                // (a flat gain cut alone washes the granulation flat).
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
        uniform float uTimeSlow;
        uniform float uTimeFast;
        uniform float uEclipse;
        uniform float uQuality;
        uniform float uGain;
        uniform float uGran;
        ${SUN_NOISE_GLSL}
        void main() {
          vec3 n = normalize(vNormal);
          vec3 v = normalize(vViewDir);
          float mu = max(dot(n, v), 0.001);
          float limb = pow(mu, 0.24);
          // Physical limb darkening: the photosphere is HOTTEST at disc centre
          // (mu=1) and dims toward the limb, where the line of sight grazes cooler
          // high photosphere. pow(mu,0.6) is the classic visual-band profile;
          // remapped to 0.58..1.0 so the disc reads centre-hot / limb-dim without
          // going black at the rim. This is a brightness multiplier, applied at the
          // end — SEPARATE from the edge-to-core colour ramp above (which the flat
          // pow(mu,0.24) limb term still drives), so the fix is additive and the
          // former inverted read (dull centre, hot rim) is corrected.
          float ld = 0.52 + 0.48 * pow(mu, 0.62);
          float t = uTime;
          vec3 drift = vec3(sin(t * 0.32), cos(t * 0.26), sin(t * 0.21)) * 0.09;
          vec3 flow = vSphere + drift;
          vec3 warp = flow * 3.4 + vec3(t * 0.09, t * 0.055, -t * 0.065);
          float turb = sunFBM(warp, uQuality);
          float turb2 = sunFBM(warp * 1.75 + vec3(4.2, 2.6, 1.4), uQuality);
          float gran = turb * 0.62 + turb2 * 0.38;
          // Expand granulation contrast around its mid value. uGran is 1.0 in the
          // live hero (no change) and >1 under portrait capture, restoring the crisp
          // photosphere mottle the no-bloom gain drop would otherwise flatten.
          gran = clamp(0.5 + (gran - 0.5) * uGran, 0.0, 1.0);
          // ── DISCRETE GRANULATION CELLS + DARK INTER-GRANULAR LANES (P0) ──────────
          // The old cloudy fBm mottle → a real convection network: a Worley cell field
          // in OBJECT space (vSphere, camera-stable) gives bright granule cores with
          // dark lanes between them, exactly the SDO/HMI intensitygram signature.
          // Two clocks: uTimeFast churns the fine cells (boil), uTimeSlow drifts the
          // low-frequency SUPERGRANULATION envelope beneath them — different honest
          // rates so the surface evolves without ever shimmering.
          vec3 cellDrift = vec3(sin(uTimeSlow*0.7), cos(uTimeSlow*0.55), sin(uTimeSlow*0.4)) * 0.06;
          // ORGANIC granulation, not a lattice. Three tricks turn the clean Worley grid
          // into a real SDO/HMI photosphere:
          //  (a) DOMAIN WARP — displace the sample point by low-freq sunFBM before the
          //      cellular lookup, so lanes go SINUOUS and cells become irregular polygons
          //      instead of a honeycomb.
          //  (b) SPATIALLY VARYING CELL SIZE — modulate the Worley frequency by a
          //      low-freq noise so some patches have big cells, some small (real
          //      granulation has a size distribution) — kills single-scale uniformity.
          //  (c) IRREGULAR CORES — break core brightness with a little fBm so cores are
          //      mottled, not uniform round dots.
          vec3 baseP = vSphere + cellDrift;
          // (a) domain warp — a vector warp from independent fBm channels
          vec3 warpN = vec3(
            sunFBM(baseP * 4.3 + vec3(11.2, 3.1, 7.4), uQuality),
            sunFBM(baseP * 4.3 + vec3(1.7, 19.6, 5.2), uQuality),
            sunFBM(baseP * 4.3 + vec3(8.9, 2.4, 14.7), uQuality)
          ) - 0.5;
          vec3 cellP = baseP + warpN * 0.42;               // sinuous displacement
          // (b) size variation — freq wobbles ~11..17 across the disc (lower dominant
          //     scale than before → fewer, larger, more varied cells; less "dotty")
          float sizeVar = sunNoise3(baseP * 2.1 + vec3(4.0, 9.0, 2.0));
          float cellFreq = mix(11.0, 17.0, sizeVar);
          float jit = 0.12;   // small jitter amplitude → churn, never strobe
          float f1 = sunCellF1(cellP * cellFreq, vec3(sin(uTimeFast*0.5), cos(uTimeFast*0.42), sin(uTimeFast*0.31)) * jit);
          // A second, coarser warped tier = mesogranule clumping (breaks any grid feel).
          float f1b = sunCellF1((cellP + warpN * 0.25) * (cellFreq * 0.46) + vec3(3.1, 1.7, 5.2), vec3(0.0));
          // Network position: 0 at bright cores → 1 on the dark inter-granular lanes.
          // Wide smoothstep bands so cell borders transition SOFTLY (no hard flip); the
          // contrast is a touch lower than before so it reads mottled, not sequined.
          float laneW = step(0.5, uQuality);              // full lanes on mid/high only
          float lane = smoothstep(0.24, 0.78, f1);         // fine lanes (soft, organic)
          float mlane = smoothstep(0.22, 0.70, f1b);       // meso lanes
          float netDark = clamp(lane * 0.78 + mlane * 0.30, 0.0, 1.0); // 0=core,1=lane
          netDark *= (0.55 + 0.45 * laneW);                // gentler on low tier
          // (c) irregular cores — mottle the core brightness with fine fBm so cores
          //     aren't identical dots (only bites where netDark is low, i.e. in cores).
          float coreMottle = sunFBM(baseP * 26.0 + vec3(2.0, 5.0, 8.0), uQuality) - 0.5;
          // Brightness modulation: cores ~1.05 (hot upflow), lanes ~0.82 (cool sink) —
          // slightly softened range so the network is present but not a hard mesh.
          float granBright = mix(1.05, 0.82, netDark) + coreMottle * 0.07 * (1.0 - netDark);
          // Supergranulation: very-low-freq brightness swell driven by the slow clock.
          float superg = 0.5 + 0.5 * sunNoise3(vSphere * 3.6 + vec3(uTimeSlow * 0.5));
          granBright *= (0.97 + 0.06 * superg);
          // granNet carries the multiplicative brightness; netDark drives the WARM
          // temperature shift applied to col below (lanes cooler/redder, cores golden).
          float granNet = granBright;
          float spots = smoothstep(0.70, 0.90, sunNoise3(flow * 1.35 + vec3(2.1, 0.8, 1.6)));
          float spotMask = mix(1.0, 0.62, spots) * (0.82 + limb * 0.18);
          float fac = smoothstep(0.56, 0.92, gran) * smoothstep(0.12, 0.52, turb2);
          float flare = pow(max(0.0,
            sin(flow.x * 11.0 + t * 2.4) * sin(flow.y * 9.0 - t * 1.7) * sin(flow.z * 8.0 + t * 1.2)
          ), 5.0) * 0.32;
          // Warm G2V ramp: a hot golden core (not pure white), amber mid, deep-orange
          // limb. The former near-white core read ashen once the granulation network
          // exposed it; pulling the core toward warm gold keeps the star hot-LOOKING.
          vec3 core = vec3(1.0, 0.93, 0.72);
          vec3 mid = vec3(1.0, 0.74, 0.24);
          vec3 edge = vec3(0.95, 0.40, 0.06);
          vec3 col = mix(edge, mid, limb);
          col = mix(col, core, limb * limb * (0.82 + gran * 0.22));
          col *= spotMask;
          col += vec3(1.0, 0.88, 0.48) * fac * limb * 0.38;
          col += vec3(1.0, 0.58, 0.10) * flare * limb;
          float chromo = pow(1.0 - mu, 3.4);
          // ── CHROMOSPHERE SPICULES (P1) ──────────────────────────────────────────
          // Break the warm limb rim into fine radial "burning-prairie" structure. A
          // HIGH-FREQUENCY angular fBM (sampled in vSphere so it's camera-stable),
          // crept by the slow clock, confined to the pow(1-mu,3.4) limb band ONLY —
          // it never touches the disc body. Modulates the rim brightness, giving the
          // spiky chromosphere edge without any disc shimmer.
          float spic = sunFBM(vSphere * 34.0 + vec3(uTimeSlow * 0.6, -uTimeSlow * 0.4, uTimeSlow * 0.3), uQuality);
          float spicMod = mix(1.0, 0.55 + 0.95 * spic, step(1.0, uQuality));
          col += vec3(1.0, 0.40, 0.06) * chromo * (0.22 + gran * 0.12) * spicMod;
          float coronaHint = pow(1.0 - mu, 1.6);
          col += vec3(1.0, 0.52, 0.10) * coronaHint * 0.13;
          // Fold the discrete granulation network into the disc BEFORE limb darkening.
          // Confined to the disc body: it eases off toward the limb (smoothstep on mu)
          // so edge-on cells don't fight the chromosphere/spicule rim.
          float granFace = smoothstep(0.12, 0.55, mu);
          // (1) Brightness: cores brighten, lanes darken — the HMI intensitygram signal.
          col *= mix(1.0, granNet, granFace);
          // (2) TEMPERATURE: keep the star HOT and GOLDEN, not ashen-grey. Cores get a
          // faint golden lift; lanes shift toward deep orange (cooler sinking plasma).
          // This restores the G2V colour the pure-brightness network washed toward grey.
          float netDarkFace = netDark * granFace;
          col = mix(col, col * vec3(1.05, 0.97, 0.72), netDarkFace * 0.9);   // lanes → warm/deep
          col += vec3(0.10, 0.06, 0.015) * (1.0 - smoothstep(0.10, 0.42, f1)) * granFace; // core gold glow
          // Physical limb darkening (centre-hot / limb-dim). Applied AFTER the thin
          // chromosphere/corona rim tints so the very edge keeps a faint warm halo,
          // but the disc body no longer reads brighter at the rim than at centre.
          col *= ld;
          col *= mix(1.0, 0.26, uEclipse);
          col *= 1.78 * uGain;
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
  }

  function makeSunCoronaShellMaterial(quality) {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uTimeSlow: { value: 0 },  // prominence rise/settle clock (sunT*0.22)
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
        uniform float uTimeSlow;
        uniform float uEclipse;
        uniform float uQuality;
        ${SUN_NOISE_GLSL}
        void main() {
          vec3 n = normalize(vNormal);
          vec3 v = normalize(vViewDir);
          float facing = max(dot(n, v), 0.0);
          // Corona radial profile. A raw fresnel peaks at 1.0 exactly on the shell
          // silhouette → a hard "soap-bubble" edge. Instead build a BAND that rises off
          // the disc limb and FADES to zero BEFORE the silhouette, so the corona melts
          // into transparency with no hard sphere outline. rim = 1-facing (0 at disc
          // centre → 1 at silhouette); fade kills the last sliver at extreme grazing.
          float rim = 1.0 - facing;
          // Broad corona glow across the grazing annulus (exp 1.4 fills it), then a
          // GENTLE outer roll-off (not a cliff) so the halo melts into transparency
          // instead of ending on a hard soap-bubble silhouette. The disc mesh occludes
          // the inner shell, so this paints the visible outer corona.
          float fade = 1.0 - smoothstep(0.94, 1.0, rim);    // soft roll-off, more reach
          float fresnel = pow(rim, 1.2) * (0.5 + 0.5 * fade);  // fuller, further-reaching crown
          float t = uTime;
          float ang = atan(vSphere.y, vSphere.x);
          // SCREEN angle around the limb (camera-stable): the view-space normal's
          // in-plane direction is the on-screen radial, so atan(n.y,n.x) is the clock
          // position of this fragment on the limb REGARDLESS of mesh orientation. This
          // anchors prominences to the visible edge so they always read in the still.
          float sAng = atan(n.y, n.x);
          bool rich = uQuality > 0.5;   // desktop mid/high get streamers+prominences

          // ── WHITE-LIGHT STREAMER FILAMENTS (P0) ────────────────────────────────
          // Replace the 6 hard sin-lobe spokes with domain-warped fBM wisps that
          // reach RADIALLY outward. Trick: feed the noise an ANISOTROPIC coordinate —
          // fine detail around the limb (angular) but STRETCHED along the radial
          // (near-constant) axis — so filaments elongate away from the disc like real
          // K-corona streamers rather than tiling into blobs. Crept slowly by uTime.
          float w1 = sunFBM(vSphere * 3.1 + vec3(t * 0.05, -t * 0.04, t * 0.03), uQuality);
          // Domain warp the sample position by a lower-freq field → sinuous streamers.
          vec3 sp = vSphere + vec3(w1, w1, w1) * 0.35;
          // Angular-rich / radial-smooth: multiply the tangential components hard,
          // leave the dominant axis soft so structure stretches outward.
          float streamers = sunFBM(sp * vec3(7.5, 7.5, 2.2) + vec3(-t * 0.03, t * 0.02, 0.0), uQuality);
          streamers = pow(max(0.0, streamers), 1.7) * (rich ? 1.0 : 0.35);
          // Retain a couple of soft broad lobes for large-scale corona shape (gentle,
          // not the old hard spokes) so the halo isn't uniformly ringed.
          float lobes = 0.0;
          for (int i = 0; i < 3; i++) {
            float fi = float(i);
            float w = step(fi, 1.0 + uQuality);
            lobes += pow(max(0.0, sin(ang * (2.0 + fi) + t * (0.12 + fi * 0.03) + fi * 2.1)), 3.0) * 0.10 * w;
          }

          // ── LIMB PROMINENCE ARCS (P0) ──────────────────────────────────────────
          // 3 warm bright lobes anchored at FIXED sphere angles just off the limb.
          // Each rises and settles over ~20-40s via a slow sine on uTimeSlow, so they
          // breathe. Localised in angle (narrow gaussian) and in radius (hug the rim
          // via fresnel) → clear arcing eruptions, not a uniform glow.
          float prom = 0.0;
          if (rich) {
            // Anchor angles on the SCREEN limb (radians) + phase offsets for breathing.
            // Placed around the visible edge (upper-left, right, lower) so they always
            // sit in-frame; a slow uTimeSlow drift makes them migrate gently.
            vec3 pang = vec3(2.3, 0.2, -1.6);
            vec3 pph  = vec3(0.0, 2.1, 4.2);
            for (int i = 0; i < 3; i++) {
              float a0 = pang[i] + uTimeSlow * 0.05;   // slow migration around the limb
              float dA = sAng - a0;
              dA = atan(sin(dA), cos(dA));            // wrap to -pi..pi
              float lobe = exp(-dA * dA * 10.0);       // angular lobe (arc-like spread)
              // Strong constant presence + breathing on top. Floor 0.6 keeps all three
              // arcs clearly VISIBLE regardless of the (real-time-seeded) capture phase,
              // so the deterministic still always shows eruptions; breathing (never to 0)
              // adds slow life in the live hero without any strobe.
              float rise = 0.6 + 0.4 * (0.5 + 0.5 * sin(uTimeSlow * 0.9 + pph[i]));
              // fine internal filamentation so the arc isn't a flat blob
              float fil = 0.7 + 0.4 * sunFBM(vSphere * 15.0 + vec3(uTimeSlow * 0.5 + float(i) * 3.0), uQuality);
              prom += lobe * rise * fil;
            }
            prom = clamp(prom, 0.0, 1.4);
          }

          float turb = sunFBM(vSphere * 2.8 + vec3(t * 0.12, -t * 0.08, t * 0.05), uQuality);
          // Streamers modulate the halo: bright wisps where the streamer field is high,
          // dim lanes between them (contrast-stretched so the corona is STRUCTURED, not
          // a uniform ring). Broad lobes give large-scale shape; turb softens.
          // Streamers modulate the halo more strongly now (×1.2) so bright wisps clearly
          // reach outward against dimmer gaps — a STRUCTURED crown, not a smooth ring.
          float structure = streamers * 1.2 + lobes + turb * 0.30;
          // Corona ALPHA (opacity) — raised so the golden crown has real PRESENCE against
          // the transparent void (it had faded to almost nothing). Higher floor + structure.
          float a = fresnel * (0.85 + structure * 1.25) * (1.0 - uEclipse * 0.75);
          // Prominences live in the VISIBLE outer annulus (the inner shell is occluded by
          // the opaque disc), distinguished from the golden streamers by high local alpha,
          // narrow angle, and H-alpha pink-red — discrete eruptions arcing off the limb.
          float promBand = pow(rim, 0.9) * fade;
          float promA = prom * promBand * (1.0 - uEclipse * 0.75);
          a += promA * 3.0;                                  // arcs stand off the limb
          a = clamp(a, 0.0, 0.96);
          // COLOUR — keep it SATURATED gold (do not over-drive to white). A colour-
          // preserving brightness keeps the streamers golden; prominences get both a red
          // hue AND a brightness lift so they read as warm arcs, not just tinted haze.
          vec3 col = mix(vec3(1.0, 0.58, 0.16), vec3(1.0, 0.82, 0.46), turb);
          col = mix(col, vec3(1.0, 0.88, 0.66), clamp(streamers * 0.8, 0.0, 1.0));
          // Prominences WIN locally: where an arc sits (promDom high) the gold streamer
          // colour is replaced by warm H-alpha pink-red AND brightened, so the additive
          // gold no longer swallows them. Dominance keys off the arc strength directly.
          float promDom = clamp(promA * 3.2, 0.0, 1.0);
          col = mix(col, vec3(1.0, 0.34, 0.20), promDom);
          col += vec3(0.35, 0.06, 0.02) * promDom;           // warm brightness lift on arcs
          gl_FragColor = vec4(col * 1.08, a);
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
    const systemView = scaleLevel <= 2 && !onPreloaderStage();
    const maxDim = perfTier === 'low' ? 2048 : perfTier === 'mid' ? 3072 : 4096;
    const cap = onPreloaderStage() ? Math.min(maxDim, 2048) : (systemView ? maxDim : Math.min(maxDim, 2048));
    capTextureSize(t, cap);
    const max = renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 1;
    t.anisotropy = perfTier === 'low' ? Math.min(max, 4) : max;
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.magFilter = THREE.LinearFilter;
  }

  // ── Mobile texture tier (v582) ─────────────────────────────────────────────
  // True on genuinely constrained clients so the heavy planet maps stream in at
  // 512px (_sm) instead of full 2048px. Covers the low/mid perfTier AND phones
  // that report a "high" tier (many mid-range Androids do) but present a
  // coarse pointer + narrow viewport — those still can't afford ~2.8MB of maps.
  function wantsSmallTextures() {
    if (perfTier === 'low' || perfTier === 'mid') return true;
    try {
      const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
      const narrow = window.matchMedia && window.matchMedia('(max-width: 820px)').matches;
      if (coarse && narrow) return true;                       // touch phone/tablet
      if ((window.innerWidth || 9999) <= 560) return true;     // very narrow viewport
    } catch (e) { /* fall through */ }
    return false;
  }

  // Logical texture names in this file use .jpg/.png; on disk they are WebP
  // (converted for weight — earth_lights PNG→WebP is a ~6.5× cut). Map to .webp
  // and keep the original extension only as a last-ditch fallback.
  function toWebp(name) { return name.replace(/\.(jpe?g|png)$/i, '.webp'); }
  function smallName(name) { return name.replace(/\.(webp|jpe?g|png)$/i, '_sm.$1'); }

  function textureCandidates(file) {
    const list = [];
    const webp = toWebp(file);
    // During the preloader ALL tiers use the small map so the Earth-ready handshake
    // (which releases the fly-in) fires fast; full-res maps swap in after, on the
    // interactive orrery. (Loading-safety: never block the preloader on a big texture.)
    // On constrained clients (low/mid tier or coarse+narrow) we KEEP the small map
    // as the interactive texture too — that's the mobile texture diet.
    if (wantsSmallTextures() || onPreloaderStage()) {
      list.push(smallName(webp));                              // e.g. mercury_sm.webp
    }
    list.push(webp);                                           // e.g. mercury.webp
    // Legacy fallbacks (only hit if a .webp is ever missing) — never 404 to black.
    if (wantsSmallTextures() || onPreloaderStage()) {
      const smLegacy = smallName(file);
      if (smLegacy !== file) list.push(smLegacy);
    }
    if (file !== webp) list.push(file);
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
    if (bloomPass && composer && !wantsDetailLighting()) {
      bloomPass.strength = focusBloomBase + pulse * 0.14 * fade;
    }
  }

  // Shared star-point ShaderMaterial factory (near shell, far shell, milky-way band all
  // use the same twinkle + soft-disc program so nothing shimmers differently).
  function makeStarPointsMaterial() {
    return new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, vertexColors: true,
      uniforms: { uTime: { value: 0 }, uFade: { value: 1 }, uSizeMul: { value: 1 }, uTwinkle: { value: 1 } },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        uniform float uTime;
        uniform float uSizeMul;
        uniform float uTwinkle;
        void main() {
          vColor = color;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          // uTwinkle=1 → stars scintillate; uTwinkle=0 → steady (dust bands must NOT
          // scintillate — out-of-phase size flicker across a dense band reads as a glitch).
          float tw = mix(1.0, 0.85 + 0.15 * sin(uTime * 0.0015 + position.x * 0.04), uTwinkle);
          gl_PointSize = size * tw * uSizeMul * (280.0 / -mv.z);
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
  }

  function buildStars() {
    if (onPreloaderStage() && usesPageStarfield()) return;
    const N = PRM ? 800 : (perfTier === 'high' ? 3400 : perfTier === 'mid' ? 2400 : 1600);
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), sizes = new Float32Array(N);
    const starTemps = [[1.0, 0.95, 0.88], [0.88, 0.92, 1.0], [1.0, 0.82, 0.62], [0.95, 0.88, 1.0]];
    for (let i = 0; i < N; i++) {
      const r = 240 + Math.random() * 340;
      const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      pos[i * 3 + 1] = r * Math.cos(ph);
      pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
      const temp = starTemps[Math.floor(Math.random() * starTemps.length)];
      const w = 0.72 + Math.random() * 0.28; // v576: floor lifted 0.55→0.72 — Earth no longer floats in starless felt
      col[i * 3] = temp[0] * w; col[i * 3 + 1] = temp[1] * w; col[i * 3 + 2] = temp[2] * w;
      sizes[i] = Math.random() < 0.09 ? 2.6 + Math.random() * 1.8 : 0.7 + Math.random() * 1.1;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    starField = new THREE.Points(g, makeStarPointsMaterial()); scene.add(starField);

    // v577 — SECOND, MORE DISTANT SHELL for depth parallax. All the near stars sat on
    // one r=240–580 shell, so the idle-breathe camera swing shifted them rigidly with
    // zero relative motion → the hero read flat. A shell ~2× further out shifts by a
    // smaller angle under the same camera translation, so the two layers slide past
    // each other and the scene gains real depth. Fainter + smaller so it reads as
    // background dust, never competing with the near field. Count is tier-gated (low
    // mobile gets a cheap version) and PRM keeps it minimal.
    const NF = PRM ? 300 : (perfTier === 'high' ? 1700 : perfTier === 'mid' ? 1100 : 650);
    const fp = new Float32Array(NF * 3), fc = new Float32Array(NF * 3), fs = new Float32Array(NF);
    for (let i = 0; i < NF; i++) {
      const r = 620 + Math.random() * 520;   // 620–1140: well beyond the near shell
      const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
      fp[i * 3] = r * Math.sin(ph) * Math.cos(th);
      fp[i * 3 + 1] = r * Math.cos(ph);
      fp[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
      const temp = starTemps[Math.floor(Math.random() * starTemps.length)];
      const w = 0.42 + Math.random() * 0.22; // dimmer than the near shell (0.72–1.0)
      fc[i * 3] = temp[0] * w; fc[i * 3 + 1] = temp[1] * w; fc[i * 3 + 2] = temp[2] * w;
      fs[i] = 0.5 + Math.random() * 0.7;     // uniformly small — distant pinpricks
    }
    const gf = new THREE.BufferGeometry();
    gf.setAttribute('position', new THREE.BufferAttribute(fp, 3));
    gf.setAttribute('color', new THREE.BufferAttribute(fc, 3));
    gf.setAttribute('size', new THREE.BufferAttribute(fs, 1));
    const mf = makeStarPointsMaterial();
    mf.uniforms.uSizeMul.value = 0.72;       // extra small so the far shell recedes
    starFieldFar = new THREE.Points(gf, mf); scene.add(starFieldFar);

    // v577 — FAINT MILKY-WAY BAND: a denser great-circle scatter of small points on a
    // shell between the two star fields, concentrated toward a tilted galactic plane so
    // it reads as a soft diffuse band across the sky, not a uniform sprinkle. Whisper
    // faint (well below the near stars) so it never competes with the orrery bodies.
    const NB = PRM ? 260 : (perfTier === 'high' ? 1400 : perfTier === 'mid' ? 900 : 480);
    const bp = new Float32Array(NB * 3), bc = new Float32Array(NB * 3), bs = new Float32Array(NB);
    const bandTilt = 27 * D2R;               // galactic-plane tilt vs the ecliptic-ish frame
    const ct = Math.cos(bandTilt), st = Math.sin(bandTilt);
    for (let i = 0; i < NB; i++) {
      const r = 560 + Math.random() * 120;   // between near (≤580) and far (≥620) shells
      const lon = Math.random() * Math.PI * 2;
      // Latitude clustered tightly around the band centre (gaussian-ish via averaged
      // uniforms) so the ring has a soft thickness, not a razor line.
      const lat = ((Math.random() + Math.random() + Math.random()) / 3 - 0.5) * 0.44;
      let x = r * Math.cos(lat) * Math.cos(lon);
      let y = r * Math.sin(lat);
      let z = r * Math.cos(lat) * Math.sin(lon);
      // tilt the band around the X axis
      const y2 = y * ct - z * st, z2 = y * st + z * ct;
      bp[i * 3] = x; bp[i * 3 + 1] = y2; bp[i * 3 + 2] = z2;
      // Cool ivory dust with a faint warm core scatter.
      const warm = Math.random() < 0.3;
      const w = 0.16 + Math.random() * 0.12; // FAR below the near stars → a whisper
      bc[i * 3] = (warm ? 1.0 : 0.86) * w;
      bc[i * 3 + 1] = (warm ? 0.94 : 0.9) * w;
      bc[i * 3 + 2] = (warm ? 0.82 : 1.0) * w;
      bs[i] = 0.5 + Math.random() * 0.5;
    }
    const gb = new THREE.BufferGeometry();
    gb.setAttribute('position', new THREE.BufferAttribute(bp, 3));
    gb.setAttribute('color', new THREE.BufferAttribute(bc, 3));
    gb.setAttribute('size', new THREE.BufferAttribute(bs, 1));
    const mb = makeStarPointsMaterial();
    mb.uniforms.uSizeMul.value = 1.15;       // slightly bigger soft dust motes
    mb.uniforms.uTwinkle.value = 0;          // steady dust — no scintillation shimmer
    milkyWayBand = new THREE.Points(gb, mb); scene.add(milkyWayBand);
  }

  function buildSunCoronaShell() {
    if (sunCoronaMesh || !sunMesh) return;
    const q = perfTier === 'high' ? 2.0 : perfTier === 'mid' ? 1.0 : 0.0;
    const segs = perfTier === 'high' ? 72 : perfTier === 'mid' ? 56 : 36;
    sunCoronaMat = makeSunCoronaShellMaterial(q);
    sunCoronaMesh = new THREE.Mesh(
      // Wider shell (1.16 → 1.5) so white-light streamers + limb prominences have room
      // to arc OUTWARD from the limb instead of reading as a thin ring hugging the disc.
      new THREE.SphereGeometry(SUN_SIZE * 1.5, segs, segs),
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
    const sunQ = perfTier === 'high' ? 2.0 : perfTier === 'mid' ? 1.55 : 0.0;
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
        { tex: isAwardMode()
            ? makeGlowTexture('rgba(236,214,164,0.85)', 'rgba(194,160,94,0.32)') // v576 brass halo
            : makeGlowTexture('rgba(255,252,235,0.88)', 'rgba(255,205,85,0.38)'), scale: SUN_SIZE * 4.6 },
        { tex: makeGlowTexture('rgba(255,218,125,0.36)', 'rgba(240,135,35,0.10)'), scale: SUN_SIZE * 8.2 },
        { tex: makeGlowTexture('rgba(255,175,55,0.12)', 'rgba(215,85,12,0.03)'), scale: SUN_SIZE * 13.5 },
      ];
      layers.forEach((l) => {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: l.tex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
        sp.scale.set(l.scale, l.scale, 1);
        sp.userData.baseScale = l.scale;
        sunMesh.add(sp);
        sunGlow.push(sp);
      });
    }
    sunPointLight = new THREE.PointLight(0xfff4e0, perfTier === 'high' ? 4.3 : 3.6, 0, 1.55);
    sunMesh.add(sunPointLight);
    sunDirLight = new THREE.DirectionalLight(0xfff8ec, perfTier === 'high' ? 2.7 : 2.25);
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
      const op = tier === 'mid' ? (i === 0 ? 0.38 : i === 1 ? 0.18 : 0.08) : (i === 0 ? 0.28 : 0);
      if (sp.material) { sp.material.opacity = op; sp.userData.baseOpa = op; }
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
        uSunDir: { value: new THREE.Vector3(1, 0, 0) },  // world-space sun dir (set by updateSaturnShadow)
        uOpacity: { value: 0.9 },
        uPlanetC: { value: new THREE.Vector3(0, 0, 0) },  // world-space globe centre
        uPlanetR: { value: 1.0 },                          // world-space globe radius (for the cast shadow)
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorldNormal;
        varying vec3 vWorldPos;
        void main() {
          vUv = uv;
          vWorldNormal = normalize(mat3(modelMatrix) * normal);
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }`,
      fragmentShader: `
        uniform sampler2D uMap;
        uniform vec3 uSunDir;
        uniform float uOpacity;
        uniform vec3 uPlanetC;
        uniform float uPlanetR;
        varying vec2 vUv;
        varying vec3 vWorldNormal;
        varying vec3 vWorldPos;
        void main() {
          vec4 tex = texture2D(uMap, vUv);
          float density = tex.a > 0.02 ? tex.a : max(tex.r, max(tex.g, tex.b));
          if (density < 0.03) discard;
          vec3 base = tex.rgb;
          if (length(base) < 0.05) base = vec3(0.92, 0.86, 0.72);
          vec3 sun = normalize(uSunDir);
          float lit = clamp(dot(vWorldNormal, sun) * 0.5 + 0.52, 0.36, 1.0);
          // (b) Sun-side backscatter: ring ice brightens where the view ray is roughly
          // sun-aligned (forward/back scatter through the icy particles). Gentle, keyed
          // to how sun-aligned this fragment's view ray is.
          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          float backscatter = pow(clamp(dot(viewDir, sun) * 0.5 + 0.5, 0.0, 1.0), 2.0);
          float scatterGain = 1.0 + backscatter * 0.26;
          vec3 col = base * lit * scatterGain;
          // (c) Tame the inner-ring bloom clip: the brightest ring texels (inner B-ring)
          // read near paper-white. A soft top-end rolloff (Reinhard-ish) preserves the
          // brightness ORDER while holding the peak well below 1.0, so the bright inner
          // ring stays luminous ICE, not a blown white halo.
          col = col / (1.0 + max(vec3(0.0), col - 0.62) * 1.35);
          // (a) Warm brass/sand tint — applied AFTER the tone-map so the top-end rolloff
          // (which pulls bright near-white texels back toward neutral) can't wash the
          // warmth out. A luminance-preserving channel scale nudges the whole ring into
          // the tan/sand family (photoreal Cassini rings are faintly tan-brown, not vinyl
          // grey) while the texture's own light/dark banding still reads the Cassini
          // division. Subtle — sand, not stylised brass.
          col *= vec3(1.10, 1.005, 0.855);
          // (d) Cast the GLOBE's shadow across the rings — the detail that sells Saturn.
          // Project this ring fragment back along the sun ray: if that ray passes through
          // the planet sphere before reaching the sun, the fragment sits in the globe's
          // shadow. Physically correct and view-independent, so it renders in the portrait
          // capture too (unlike the old flat shadow-plane, which mis-projected and had to
          // be hidden). Penumbra widened so the shadow reads as a soft band, not a razor.
          vec3 rel = vWorldPos - uPlanetC;
          float b = dot(rel, sun);
          float perp2 = dot(rel, rel) - b * b;      // squared distance from the sun-ray axis
          float perp = sqrt(max(perp2, 0.0));
          // In shadow only on the far side of the globe from the sun (b < 0) and within a
          // slightly-widened cross-section (penumbra + the ring's own thickness).
          float core = 1.0 - smoothstep(uPlanetR * 0.80, uPlanetR * 1.35, perp);
          float shadow = core * smoothstep(0.04, -0.08 * uPlanetR, b);
          // Deep but not pure-black: the umbra reads as a distinct dark cut across the
          // bright inner ring (the detail that sells a photoreal Saturn), while a hint of
          // ambient skylight keeps it from looking like a hole punched in the rings.
          col *= 1.0 - shadow * 0.88;
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
  // Parametrized so ONE shader drives BOTH limb shells (bright inner Rayleigh rim +
  // faint outer scatter veil with a warm sunset wrap past the terminator). uEdge
  // normalizes the BackSide horizon depth for the shell's scale so the glow peaks at
  // the planet limb and FADES to the shell edge — the previous 1-max(dot(N,V),0)
  // fresnel was ~1 across the whole visible rim, which is exactly why the limb read
  // as a flat whiteish line instead of a soft blue gradient.
  function earthAtmosphereMaterial(opts) {
    opts = opts || {};
    return new THREE.ShaderMaterial({
      uniforms: {
        uSunDir: earthUniforms.uSunDirWorld,            // shared world-space dir (by reference)
        uCamPos: { value: new THREE.Vector3() },
        uIntensity: { value: opts.intensity != null ? opts.intensity : 0.9 },
        uEdge:    { value: opts.edge    != null ? opts.edge    : 5.3 },  // 1/horizon-depth for the shell scale (1.018 → ~5.3, 1.045 → ~3.4)
        uFalloff: { value: opts.falloff != null ? opts.falloff : 1.5 },  // glow profile exponent — higher hugs the limb tighter
        uWrap:    { value: opts.wrap    != null ? opts.wrap    : 0.0 },  // 0 = inner Rayleigh shell, 1 = outer veil w/ sunset wrap
      },
      vertexShader: 'varying vec3 vWN; varying vec3 vWP;\n void main(){ vec4 wp = modelMatrix * vec4(position,1.0); vWP = wp.xyz; vWN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * wp; }',
      fragmentShader: 'uniform vec3 uSunDir; uniform vec3 uCamPos; uniform float uIntensity; uniform float uEdge; uniform float uFalloff; uniform float uWrap; varying vec3 vWN; varying vec3 vWP;\n void main(){\n   vec3 V = normalize(uCamPos - vWP);\n   vec3 N = normalize(vWN);\n   float fres = pow(clamp(-dot(N,V) * uEdge, 0.0, 1.0), uFalloff);\n   float ndl = dot(N, normalize(uSunDir));\n   float dayMask = smoothstep(-0.2 - uWrap * 0.15, 0.4, ndl);\n   float band = smoothstep(0.0, 0.3 + uWrap * 0.2, 1.0 - abs(ndl));\n   /* sunset only reads when the terminator is viewed side-on (hero rest frame);\n      from a sun-aligned lens (portrait stills) the WHOLE limb sits near ndl=0 and\n      an ungated band paints the rim pink-white — full-disc Earth reads BLUE. */\n   float termView = 1.0 - smoothstep(0.5, 0.85, clamp(dot(normalize(uSunDir), V), 0.0, 1.0));\n   vec3 rayleigh = vec3(0.10, 0.32, 0.95);\n   vec3 sunset   = vec3(0.95, 0.42, 0.14);\n   vec3 col = mix(rayleigh, sunset, band * (0.55 + uWrap * 0.35) * termView);\n   float a = clamp(fres * dayMask * uIntensity, 0.0, 1.0);\n   gl_FragColor = vec4(col * (0.35 + fres * 0.55), a * 0.7);\n }',
      blending: THREE.AdditiveBlending, side: THREE.BackSide, transparent: true, depthWrite: false,
    });
  }

  function makeOrbitRingMaterial(hero) {
    return new THREE.ShaderMaterial({
      uniforms: {
        uOpacity: { value: hero ? 0.58 : 0.34 },
        uTime: { value: 0 },
        uHero: { value: hero ? 1.0 : 0.0 },
      },
      vertexShader: `
        varying vec2 vUv;
        varying float vDepth;
        void main() {
          vUv = uv;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vDepth = -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        precision highp float;
        varying vec2 vUv;
        varying float vDepth;
        uniform float uOpacity;
        uniform float uTime;
        uniform float uHero;
        void main() {
          float angle = vUv.x * 6.2831853;
          float majorTick = pow(max(0.0, cos(angle * 8.0)), 12.0);
          float minorTick = pow(max(0.0, cos(angle * 24.0)), 20.0);
          float microTick = pow(max(0.0, cos(angle * 48.0)), 28.0);
          float ringProfile = smoothstep(0.0, 0.18, vUv.y) * smoothstep(1.0, 0.82, vUv.y);
          float baseGlow = ringProfile * 0.38;
          float engraved = ringProfile * (0.28 + majorTick * 0.58 + minorTick * 0.18 + microTick * 0.06);
          vec3 darkGold = vec3(0.38, 0.28, 0.08);
          vec3 midGold  = vec3(0.72, 0.58, 0.22);
          vec3 brightGold = vec3(0.98, 0.84, 0.42);
          vec3 col = mix(darkGold, midGold, baseGlow + engraved * 0.4);
          col = mix(col, brightGold, engraved + uHero * 0.14);
          float pulse = 0.92 + 0.08 * sin(uTime * 1.4 + angle * 2.5);
          float depthFade = smoothstep(480.0, 24.0, vDepth);
          float alpha = (baseGlow * 0.55 + engraved) * uOpacity * depthFade * pulse;
          if (alpha < 0.008) discard;
          gl_FragColor = vec4(col, alpha);
        }`,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
  }

  function injectPlanetSunLighting(shader, rimHex) {
    const rim = new THREE.Color(rimHex || 0x6088b0);
    shader.uniforms.uSunDir = { value: new THREE.Vector3(1, 0, 0) };
    shader.uniforms.uRimTint = { value: rim };
    shader.uniforms.uLightWash = { value: 0.11 };
    shader.uniforms.uRimMul = { value: 0.08 };
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>',
        '#include <common>\n uniform vec3 uSunDir;\n uniform vec3 uRimTint;\n uniform float uLightWash;\n uniform float uRimMul;')
      .replace('#include <output_fragment>',
        `#include <output_fragment>
        {
          // v576: 'normal' is VIEW-space here — bring the world-space sun dir into
          // view space, else the wash terminator rotates with the camera.
          float ndl = dot(normalize(normal), normalize((viewMatrix * vec4(uSunDir, 0.0)).xyz));
          float day = smoothstep(-0.14, 0.62, ndl);
          float twilight = smoothstep(-0.35, 0.08, ndl);
          float rim = pow(1.0 - max(ndl, 0.0), 2.6);
          gl_FragColor.rgb += uRimTint * rim * uRimMul * (1.0 + twilight * 0.35);
          gl_FragColor.rgb *= 0.88 + day * 0.16;
          gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb * vec3(1.05, 1.02, 0.96), day * uLightWash);
          gl_FragColor.rgb = mix(gl_FragColor.rgb * 0.78, gl_FragColor.rgb, twilight);
        }`);
  }

  function updatePlanetSunLighting() {
    if (!sunMesh || scaleLevel > 2) return;
    BODIES.forEach((b) => {
      const g = meshes[b.id];
      if (!g || !g.visible) return;
      _toSun.copy(sunMesh.position).sub(g.position);
      if (_toSun.lengthSq() < 1e-6) _toSun.set(1, 0, 0);
      else _toSun.normalize();
      const mat = g.userData.mat;
      if (mat && mat.userData.planetShader && mat.userData.planetShader.uniforms.uSunDir) {
        mat.userData.planetShader.uniforms.uSunDir.value.copy(_toSun);
      }
    });
    if (moonMesh && moonGroup && moonGroup.visible) {
      _toSun.copy(sunMesh.position).sub(moonGroup.position).normalize();
      const mm = moonMesh.material;
      if (mm && mm.userData.planetShader && mm.userData.planetShader.uniforms.uSunDir) {
        mm.userData.planetShader.uniforms.uSunDir.value.copy(_toSun);
      }
    }
  }

  function setOrbitLineOpacity(o, mult) {
    if (!o || !o.material) return;
    const base = o.userData.baseOpacity || 0.3;
    const val = base * mult * (o.userData.hero ? 1.12 : 1);
    if (o.material.uniforms && o.material.uniforms.uOpacity) {
      o.material.uniforms.uOpacity.value = val;
    } else if (o.material.opacity !== undefined) {
      o.material.opacity = val;
    }
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
          color: 0x1a4a78, roughness: 0.78, metalness: 0.0,
          emissive: 0x0a1420, emissiveIntensity: 0.0, envMapIntensity: 0.48,
        });
        mat.onBeforeCompile = (shader) => { try { injectEarth(shader); } catch (e) { console.warn('[orrery] earth shader patch skipped', e); } };
        earthMat = mat;
        earthUniforms.uNightInt.value = perfTier === 'low' ? 1.85 : perfTier === 'mid' ? 1.45 : 1.6;
      } else {
        const isGiant = b.id === 'jupiter' || b.id === 'saturn' || b.id === 'uranus' || b.id === 'neptune';
        // Gas-giant cloud tops are matte — no clearcoat lacquer on jupiter/saturn
        // (the coat lobe read as a centered plastic blob no base roughness can kill);
        // venus keeps its thick-haze sheen, the ice giants keep a whisper.
        const clearcoat = (b.id === 'venus' ? 0.20
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
        const rimHex = vis.rim || b.color;
        mat.onBeforeCompile = (shader) => {
          try {
            injectPlanetSunLighting(shader, rimHex);
            mat.userData.planetShader = shader;
          } catch (e) { console.warn('[orrery] planet lighting patch skipped', e); }
        };
        mat.customProgramCacheKey = () => `planet-sun-${b.id}`;
      }
      const segs = sphereSegs(b.hero);
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(b.size, segs, segs), mat);
      // axial tilt for character
      group.rotation.z = (b.id === 'uranus' ? 82 : b.id === 'saturn' ? 26.7 : b.id === 'earth' ? 23.4 : 6) * D2R;
      group.add(mesh);
      meshes[b.id] = group;
      group.userData = { b, mesh, mat };
      if (b.hero) group.visible = false;
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
          atmoMat = earthAtmosphereMaterial({ intensity: 0.9, edge: 5.3, falloff: 1.5, wrap: 0.0 });
          earthAtmoMat = atmoMat;
        } else {
          const atmoI = vis.atmoI != null ? vis.atmoI : (b.hero ? 1.0 : 0.4);
          atmoMat = atmosphereMaterial(vis.atmo, atmoI);
        }
        const atmoSegs = Math.max(24, Math.floor(segs * 0.65));
        const atmo = new THREE.Mesh(new THREE.SphereGeometry(b.size * vis.atmoS, atmoSegs, atmoSegs), atmoMat);
        group.add(atmo);
        group.userData.atmo = atmo;   // handle so portrait mode can soften the rim
        // Second Earth shell: a faint outer scatter veil (SAME shader, different
        // uniforms) that carries a warm sunset wrap just past the terminator.
        // Gated exactly like the dedicated inner shell (never on low tier / PRM).
        if (b.hero && atmoMat === earthAtmoMat) {
          const atmo2 = new THREE.Mesh(
            new THREE.SphereGeometry(b.size * 1.045, atmoSegs, atmoSegs),
            earthAtmosphereMaterial({ intensity: 0.15, edge: 3.4, falloff: 1.3, wrap: 1.0 })
          );
          earthAtmoMatOuter = atmo2.material;
          group.add(atmo2);
          group.userData.atmoOuter = atmo2;   // portrait soften handle (outer veil)
        }
      }

      if (b.hero) {
        // ── HD Earth texture swap-in: perceived-quality order, each guarded ──
        loadTex('earth.jpg').then((t) => {
          if (t && earthMat) {
            earthMat.map = t;
            earthMat.color.set(0xffffff);
            earthMat.needsUpdate = true;
          }
          markEarthMapReady();
        });
        loadTex('earth_lights.png').then((t) => {
          if (t && earthMat) {
            earthMat.emissiveMap = t;
            earthMat.emissive.set(0xffffff);
            earthMat.emissiveIntensity = perfTier === 'low' ? 1.85 : perfTier === 'mid' ? 1.45 : 1.6;
            earthUniforms.uHasLights.value = 1.0;
            earthMat.needsUpdate = true;
          }
        });
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
            // v576: gate cloud brightness by sun direction — the shell must not stay
            // lit on the night side (the lavender "eggshell" limb ring). uSunW shares
            // earthUniforms.uSunDirWorld by reference (fed every frame).
            earthCloud.material.onBeforeCompile = (sh) => { try {
              sh.uniforms.uSunW = earthUniforms.uSunDirWorld;
              sh.vertexShader = sh.vertexShader
                .replace('#include <common>', '#include <common>\n varying vec3 vCN; varying vec3 vCV; varying vec3 vCW;')
                .replace('#include <begin_vertex>', '#include <begin_vertex>\n vec4 _cmv = modelViewMatrix * vec4(position,1.0);\n vCN = normalize(normalMatrix * normal);\n vCV = normalize(-_cmv.xyz);\n vCW = normalize(mat3(modelMatrix) * normal);');
              sh.fragmentShader = sh.fragmentShader
                .replace('#include <common>', '#include <common>\n uniform vec3 uSunW; varying vec3 vCN; varying vec3 vCV; varying vec3 vCW;')
                .replace('#include <opaque_fragment>', '#include <opaque_fragment>\n {\n   float fres = pow(1.0 - max(dot(normalize(vCN), normalize(vCV)), 0.0), 3.0);\n   float dayM = smoothstep(-0.25, 0.1, dot(normalize(vCW), normalize(uSunW)));\n   gl_FragColor.a *= (0.85 + 0.5 * fres) * mix(0.04, 1.0, dayM);\n   gl_FragColor.rgb += vec3(0.12) * fres * dayM;\n }');
            } catch (e) { console.warn('[orrery] cloud patch skipped', e); } };
          }
          group.add(earthCloud);
          loadTex('earth_clouds.jpg', false).then((t) => { if (t && earthCloud) { const m = earthCloud.material; m.alphaMap = t; m.map = t; m.opacity = 0.9; m.needsUpdate = true;
            if (perfTier === 'high') { earthUniforms.uCloudTex.value = t; earthUniforms.uCloudShadow.value = 1.0; if (earthMat) earthMat.needsUpdate = true; }
          } });
        } else { earthCloud = null; }
        // Moon — detailed regolith, craters, thin exosphere halo
        moonGroup = new THREE.Group(); scene.add(moonGroup);
        const moonSegs = perfTier === 'high' ? 96 : perfTier === 'mid' ? 64 : 40;
        const moonRad = 0.26;
        const moonMat = new THREE.MeshPhysicalMaterial({
          color: 0xd8dce6, roughness: 0.92, metalness: 0.03,
          emissive: 0x707888, emissiveIntensity: 0.22,
          clearcoat: 0.06, clearcoatRoughness: 0.55, envMapIntensity: 0.14,
        });
        moonMat.onBeforeCompile = (shader) => {
          try {
            injectPlanetSunLighting(shader, 0x98a8b8);
            moonMat.userData.planetShader = shader;
          } catch (e) { console.warn('[orrery] moon lighting patch skipped', e); }
        };
        moonMat.customProgramCacheKey = () => 'moon-sun';
        moonMesh = new THREE.Mesh(new THREE.SphereGeometry(moonRad, moonSegs, moonSegs), moonMat);
        moonGroup.add(moonMesh);
        const moonBump = makeMoonBumpTexture();
        moonMat.bumpMap = moonBump;
        moonMat.bumpScale = perfTier === 'high' ? 0.045 : 0.032;
        moonMat.needsUpdate = true;
        addMoonSurfaceCrater(moonMesh, moonRad);
        if (perfTier !== 'low' && !PRM) {
          moonHaloMesh = new THREE.Mesh(
            new THREE.SphereGeometry(moonRad * 1.06, 32, 32),
            new THREE.MeshBasicMaterial({
              color: 0x8898b0, transparent: true, opacity: 0.06,
              side: THREE.BackSide, depthWrite: false, blending: THREE.AdditiveBlending,
            })
          );
          moonGroup.add(moonHaloMesh);
        }
        loadTex('moon.jpg').then((t) => {
          if (t && moonMesh) {
            moonMesh.material.map = t;
            moonMesh.material.color.set(0xffffff);
            moonMesh.material.needsUpdate = true;
          }
        });
        if (window.__apShowOrbitTraffic) buildEarthOrbitTraffic();
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

      // engraved gold orbit ring (shader band with tick marks)
      const ringWidth = b.hero ? 0.032 : 0.022;
      const inner = Math.max(0.01, b.R - ringWidth * 0.5);
      const outer = b.R + ringWidth * 0.5;
      const orbitSegs = perfTier === 'high' ? 256 : perfTier === 'mid' ? 192 : 128;
      const oGeo = new THREE.RingGeometry(inner, outer, orbitSegs, 1);
      const baseOp = b.hero ? 0.58 : 0.34;
      const oMat = makeOrbitRingMaterial(!!b.hero);
      oMat.uniforms.uOpacity.value = baseOp;
      const oLine = new THREE.Mesh(oGeo, oMat);
      oLine.rotation.x = -Math.PI / 2;
      oLine.renderOrder = -2;
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
    // Cosmic-flight tool: hide DOM labels entirely. The fullscreen cinematic zoom
    // reuses this intro label path, whose intro-tuned alphas + projection desync
    // from the bodies across Oort/Stars/Cosmos (labels strewn over empty space and
    // the Sun). Hiding them keeps the flight clean; the intro/journey still label.
    if (cosmicFlightToolActive || spaceFlightToolActive) {
      BODIES.forEach((b) => { const el = domLabelEls[b.id]; if (el) el.style.opacity = '0'; });
      return;
    }
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
      } else if (focusFrameId && focusFrameId !== 'aspect') {
        // Single-body focus frame (planet/moon portrait): label ONLY the framed
        // body. Otherwise every planet's label lights up (scale 1–2 branch below)
        // and the off-screen ones overprint the Sun / scene during the portrait.
        alpha = (focusFrameId === b.id) ? 1 : 0;
      } else if (focusPlanetId === b.id && performance.now() < focusPlanetUntil) {
        alpha = 1;
      } else if (showLabels && scaleLevel >= 1 && scaleLevel <= 2) {
        // v576: labels live at INNER/SYSTEM scales — the Earth rest frame stays clean
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

  function pulsePreloaderChapter(phase, phaseSub) {
    [phase, phaseSub].forEach(function (el) {
      if (!el) return;
      el.classList.remove('apl-intro-phase--enter');
      void el.offsetWidth;
      el.classList.add('apl-intro-phase--enter');
    });
  }

  function updateIntroProgress(introP) {
    lastIntroP = introP;
    const bar = document.getElementById('preloader-intro-progress');
    if (bar) bar.style.transform = `scaleX(${Math.max(0, Math.min(1, introP)).toFixed(3)})`;
    const phase = document.getElementById('preloader-phase');
    const phaseSub = document.getElementById('preloader-phase-sub');
    const scaleEl = document.getElementById('orrery-scale-label');
    if (phase) {
      if (onPreloaderStage()) {
        if (preloaderCosmicJourney && narrateJourney) {
          const descentP = introP < PRELOADER_COSMIC_HOLD_FRAC
            ? 0
            : (introP - PRELOADER_COSMIC_HOLD_FRAC) / (1 - PRELOADER_COSMIC_HOLD_FRAC);
          const ch = preloaderChapterForProgress(descentP);
          const chKey = ch.title + '|' + ch.sub;
          if (chKey !== preloaderChapterKey) {
            preloaderChapterKey = chKey;
            pulsePreloaderChapter(phase, phaseSub);
          }
          phase.textContent = ch.title;
          if (phaseSub) phaseSub.textContent = ch.sub;
        } else if (introP < 0.18) {
          phase.textContent = 'Calibrating sky';
          if (phaseSub) phaseSub.textContent = 'VSOP87 ephemeris warming in your browser.';
        } else if (introP < 0.45) {
          phase.textContent = 'Live positions';
          if (phaseSub) phaseSub.textContent = 'Planets placed to the minute — not a stock illustration.';
        } else {
          phase.textContent = 'System aligned';
          if (phaseSub) phaseSub.textContent = 'The engraved orrery is ready for your coordinates.';
        }
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

    if (onPreloaderStage() && p >= 0.42 && !allPlanetsBuilt) buildRemainingPlanets();

    const orbitFade = onPreloaderStage()
      ? (p < 0.38 ? 0 : easeOutCubic(Math.min(1, (p - 0.38) / 0.45)))
      : (p < 0.40 ? 0 : easeOutCubic(Math.min(1, (p - 0.40) / 0.55)));
    orbitLines.forEach((o) => {
      o.visible = orbitFade > 0.02;
      setOrbitLineOpacity(o, orbitFade);
    });

    syncSceneStarfield(onPreloaderStage() ? (p >= 0.42 ? 2 : 0) : 2);
    if (starField && starField.visible && starField.material.uniforms) {
      starField.material.uniforms.uFade.value = 0.72 + orbitFade * 0.28;
      if (!PRM) starField.rotation.y = p * 0.12;
    }
    // v577: the far shell + band rotate SLOWER than the near shell, so on top of the
    // camera-translation parallax the layers also differentially rotate — cheap extra depth.
    if (starFieldFar && starFieldFar.visible && starFieldFar.material.uniforms) {
      starFieldFar.material.uniforms.uFade.value = 0.55 + orbitFade * 0.28;
      if (!PRM) starFieldFar.rotation.y = p * 0.06;
    }
    if (milkyWayBand && milkyWayBand.visible && milkyWayBand.material.uniforms) {
      milkyWayBand.material.uniforms.uFade.value = (0.4 + orbitFade * 0.24) * 0.7;
      if (!PRM) milkyWayBand.rotation.y = p * 0.04;
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
        sp.userData.baseOpa = sp.material.opacity;
      });
    }

    if (bloomPass) {
      bloomPass.radius = (perfTier === 'mid' ? 0.34 : 0.38) + orbitFade * 0.08;
      if (p < 0.55) {
        bloomPass.strength = perfTier === 'mid' ? 0.14 : 0.18;
        bloomPass.threshold = perfTier === 'mid' ? 0.88 : 0.84;
      }
    }

    if (renderer && onPreloaderStage()) {
      if (p < 0.2) {
        renderer.toneMappingExposure = perfTier === 'high' ? 1.34 : 1.26;
      } else if (p < 0.55) {
        const e = (p - 0.2) / 0.35;
        renderer.toneMappingExposure = (perfTier === 'high' ? 1.16 : 1.10) + e * 0.06;
      }
    } else if (renderer && p < 0.55) {
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
    if (earthOrbitGroup && meshes.earth) {
      earthOrbitGroup.position.copy(meshes.earth.position);
    }
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
    try { frameBody(t); }
    catch (err) { console.warn('[orrery] render error — falling back to canvas orrery:', err); fallbackToCanvas(canvas); }
    // OrbitLab 2026-07-05 port: only reschedule while running && inView — the IO and
    // visibilitychange handlers re-arm the loop, so a parked orrery costs zero rAF.
    if (!destroyed && running && inView) raf = requestAnimationFrame(frame);
    else raf = null;
  }
  function frameBody(t) {
    if (window.__orreryPreloaderOwns) inView = true;
    // Wall-clock intro completion — tab hidden / throttled rAF must not stall Enter.
    if (introActive && !preloaderCosmicJourney && introStart > 0 && meshes.earth) {
      if ((t - introStart) >= introDurationMs()) finishIntro();
    }
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

    // sun surface animation + corona drift. Three honest clocks, all in the calm
    // slow-drift band (eye-comfort — never strobe): uTime = base churn, uTimeFast =
    // granule boil (still gentle), uTimeSlow = supergranulation + prominence rise.
    // PRM scales every rate toward ~0 so reduced-motion users get a near-static star.
    const sunT = t * 0.001;
    const sunRate = PRM ? 0.06 : 1.0;   // reduced-motion: freeze the surface to a crawl
    const sunTSlow = sunT * 0.22 * sunRate;
    // Granule churn must CREEP, not boil — real granulation turns over on a minutes
    // timescale. A modest fast rate keeps the surface visibly alive without any per-cell
    // strobe/pop (eye-comfort). 0.45 tuned so adjacent frames barely differ.
    const sunTFast = sunT * 0.45 * sunRate;
    if (sunMaterial && sunMaterial.uniforms) {
      sunMaterial.uniforms.uTime.value = sunT * sunRate;
      if (sunMaterial.uniforms.uTimeSlow) sunMaterial.uniforms.uTimeSlow.value = sunTSlow;
      if (sunMaterial.uniforms.uTimeFast) sunMaterial.uniforms.uTimeFast.value = sunTFast;
    }
    if (sunCoronaMat && sunCoronaMat.uniforms) {
      sunCoronaMat.uniforms.uTime.value = sunT * sunRate;
      if (sunCoronaMat.uniforms.uTimeSlow) sunCoronaMat.uniforms.uTimeSlow.value = sunTSlow;
    }
    if (starField && starField.material.uniforms) starField.material.uniforms.uTime.value = t;
    if (starFieldFar && starFieldFar.material.uniforms) starFieldFar.material.uniforms.uTime.value = t;
    if (milkyWayBand && milkyWayBand.material.uniforms) milkyWayBand.material.uniforms.uTime.value = t;
    if (sunDirLight && sunMesh) {
      sunDirLight.position.copy(sunMesh.position);
      if (sunDirLightTarget) {
        // v576: while a planet portrait is framed, the key light must aim at THAT
        // body — aiming at Earth lit the wrong hemisphere of far-side planets.
        const focusBody = focusFrameId && focusFrameId !== 'moon' && meshes[focusFrameId];
        if (focusBody) sunDirLightTarget.position.copy(focusBody.position);
        else if (meshes.earth) sunDirLightTarget.position.copy(meshes.earth.position);
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
    if (earthAtmoMatOuter) earthAtmoMatOuter.uniforms.uCamPos.value.copy(camera.position);
    updatePlanetSunLighting();
    if (scaleLevel <= 2 && orbitLines.length) {
      orbitLines.forEach((o) => {
        if (o.material && o.material.uniforms && o.material.uniforms.uTime) {
          o.material.uniforms.uTime.value = sunT;
        }
      });
    }

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

    const preloaderGalSwirl = preloaderCosmicJourney && introActive;
    let galSwirlMul = 1;
    if (preloaderGalSwirl && introStart) {
      const elapsed = performance.now() - introStart;
      const dur = preloaderCosmicDurationMs();
      const p = Math.min(1, elapsed / dur);
      const descentP = p < PRELOADER_COSMIC_HOLD_FRAC
        ? 0
        : (p - PRELOADER_COSMIC_HOLD_FRAC) / (1 - PRELOADER_COSMIC_HOLD_FRAC);
      galSwirlMul = descentP < 0.28 ? 10.5 - descentP * 8 : Math.max(3.2, 10.5 - descentP * 12);
    }
    // OrbitLab 2026-07-05 port: differential arm rotation — bulge/disk/dust/ribbons/HII
    // spin at slightly different rates so the spiral shears like a real disk. All drifts
    // are slow (minutes-scale periods); no strobe/flicker.
    if (milkyWayGroup && scaleLevel >= 5 && !PRM) {
      milkyWayGroup.rotation.y += dt * 0.0014 * galSwirlMul;
      milkyWayGroup.rotation.x = GALACTIC_TILT_X + Math.sin(t * 0.000028) * 0.008;
    }
    if (milkyWayBulge && milkyWayBulge.visible && !PRM) {
      milkyWayBulge.rotation.y += dt * 0.0028 * galSwirlMul;
    }
    if (milkyWayDisk && milkyWayDisk.visible && !PRM) {
      const armSpin = scaleLevel >= 5 ? 0.0036 : 0.0052;
      milkyWayDisk.rotation.y += dt * armSpin * galSwirlMul;
      if (preloaderGalSwirl) milkyWayDisk.rotation.z += dt * 0.0018 * galSwirlMul;
    }
    if (milkyWayDust && milkyWayDust.visible && !PRM) {
      milkyWayDust.rotation.y += dt * 0.0024 * galSwirlMul;
    }
    if (milkyWayArmRibbons && milkyWayArmRibbons.visible && !PRM) {
      milkyWayArmRibbons.rotation.y += dt * 0.0031 * galSwirlMul;
    }
    if (milkyWayHII && milkyWayHII.visible && !PRM) {
      milkyWayHII.rotation.y += dt * 0.0038 * galSwirlMul;
      milkyWayHII.children.forEach((ch) => {
        if (!ch.material || ch.userData.baseOpa == null) return;
        const tw = ch.userData.tw || 1;
        ch.material.opacity = ch.userData.baseOpa * (0.88 + Math.sin(t * 0.0012 * tw + tw * 3) * 0.1);
      });
    }
    if (oortShell && oortShell.visible && !PRM) oortShell.rotation.y += dt * 0.0032;
    if (galacticCore && galacticCore.visible && !PRM && galacticCore.material) {
      if (preloaderGalSwirl) {
        galacticCore.rotation.y += dt * 0.024 * galSwirlMul;
        galacticCore.rotation.z += dt * 0.016 * galSwirlMul;
      }
      if (scaleLevel >= 5 || preloaderGalSwirl) {
        // dim at the COSMOS level so the linger fade in updateScaleVisuals holds
        const coreHold = scaleLevel >= 6 ? 0.4 : 1;
        galacticCore.material.opacity = (0.72 + Math.sin(t * 0.0006) * 0.05) * coreHold;
        galacticCore.scale.setScalar(54 + Math.sin(t * 0.0005) * 1.4);
      }
    }
    if (galacticCoreRing && galacticCoreRing.visible && !PRM && scaleLevel >= 5 && galacticCoreRing.material) {
      galacticCoreRing.rotation.z += dt * 0.0016;
      galacticCoreRing.material.opacity = (0.42 + Math.sin(t * 0.0005) * 0.05) * (scaleLevel >= 6 ? 0.4 : 1);
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
    if (galacticBar && galacticBar.visible && !PRM && scaleLevel >= 5 && galacticBar.material) {
      galacticBar.material.opacity = (0.58 + Math.sin(t * 0.00045) * 0.04) * (scaleLevel >= 6 ? 0.4 : 1);
    }
    if (galacticHalo && galacticHalo.visible && !PRM) {
      if (preloaderGalSwirl) galacticHalo.rotation.z += dt * 0.008 * galSwirlMul;
      if (scaleLevel >= 5 && galacticHalo.material) {
        galacticHalo.material.opacity = 0.34 + Math.sin(t * 0.0004) * 0.06;
        galacticHalo.rotation.y += dt * 0.0009;
      }
    }
    if (galacticHaloDisk && galacticHaloDisk.visible && !PRM && scaleLevel >= 5 && galacticHaloDisk.material) {
      galacticHaloDisk.material.opacity = 0.28 + Math.sin(t * 0.00035) * 0.04;
    }
    if (cosmicField && cosmicField.visible && !PRM && (scaleLevel >= 5 || preloaderGalSwirl)) {
      if (preloaderGalSwirl) {
        cosmicField.rotation.y += dt * 0.012 * galSwirlMul;
        cosmicField.rotation.x += dt * 0.004 * galSwirlMul;
      }
      cosmicField.children.forEach((ch) => {
        if (ch.userData && ch.userData.drift && ch.material) {
          ch.material.rotation += ch.userData.drift * galSwirlMul;
        }
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
        if (g && g.userData.mesh) g.userData.mesh.rotation.y += b.spin * dt * 0.16;
      });
      if (earthCloud) earthCloud.rotation.y += 0.55 * dt * 0.20;
      if (moonMesh && moonGroup && moonGroup.visible) moonMesh.rotation.y += 0.012 * dt;
      if (sunMesh) sunMesh.rotation.y += 0.04 * dt;
    }
    updateEarthOrbitTraffic(t, dt);

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
      const p = Math.min(1, (t - scaleAnimStart) / scaleAnimDurationMs), e = easeInOut(p);
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
      const fovTo = moonFrameActive ? CAM_FOV_CLOSE
        : focusFrameId ? CAM_FOV_MID // v576: planet-focus portraits animate to the mid FOV
        : (scaleAnimTo.radius < 12 ? CAM_FOV_CLOSE : (scaleAnimToLevel >= 3 ? CAM_FOV_WIDE : CAM_FOV_MID));
      camera.fov = fovFrom + (fovTo - fovFrom) * e;
      camera.updateProjectionMatrix();
      if (radialBlurPass) {
        radialBlurPass.uniforms.uStrength.value = Math.sin(p * Math.PI) * 0.22;
      }
      if (p >= 1) {
        if (radialBlurPass) radialBlurPass.uniforms.uStrength.value = 0;
        scaleAnimActive = false;
        if (focusFrameId === 'aspect' && aspectActive) {
          // Land on the top-down zodiac-ring framing — no Earth-terminator snap.
          if (aspectData && aspectData.centre) camTarget.copy(aspectData.centre);
          camera.fov = CAM_FOV_MID;
          camera.updateProjectionMatrix();
          updateScaleVisuals(scaleLevel);
        } else if (moonFrameActive) {
          // v576: land on the Earth+Moon composition — no terminator snap
          syncMoonFrameTarget();
          camera.fov = CAM_FOV_CLOSE;
          camera.updateProjectionMatrix();
          updateDomLabels(1);
          updateScaleVisuals(scaleLevel);
        } else if (scalePreset(scaleLevel).targetEarth) {
          const ep = scalePreset(scaleLevel);
          setEarthTerminatorCamera(ep.camRadius, ep.camEl);
        } else {
          // v576: any focused planet lands on the portrait FOV, not the wide system FOV
          camera.fov = focusFrameId ? CAM_FOV_MID : (scaleLevel >= 2 ? CAM_FOV_WIDE : CAM_FOV_MID);
          camera.updateProjectionMatrix();
          updateDomLabels(1);
          updateScaleVisuals(scaleLevel);
        }
        if (focusPlanetId) forceResize();
      }
    } else if (moonFrameActive && !introActive && !portraitMode) {
      syncMoonFrameTarget();
    } else if (scalePreset(scaleLevel).targetEarth && !introActive && !portraitMode) {
      // portrait mode owns camTarget (may be a far planet); the scaleLevel-0 preset
      // otherwise snaps the target back to Earth every frame.
      earthTargetVec(camTarget);
    }

    if (masterclassIntroActive && spaceFlightMode && spaceFlightToolActive) {
      tickSpaceFlightTool(t, dt);
      if (!PRM && meshes.earth && masterclassZoom < 0.95) {
        const g = meshes.earth.userData.mesh;
        if (g) g.rotation.y += 0.42 * dt;
      }
    }

    if (introActive && preloaderCosmicJourney && introStart > 0) {
      tickPreloaderCosmicJourney(t);
      camAz += 0.018 * dt;
      if (bloomPass && composer && (onPreloaderStage() || cosmicFlightToolActive)) {
        bloomPass.strength = perfTier === 'mid' ? 0.22 : 0.28;
        bloomPass.threshold = perfTier === 'mid' ? 0.82 : 0.78;
      }
      if (renderer && (onPreloaderStage() || cosmicFlightToolActive)) {
        renderer.toneMappingExposure = (perfTier === 'high' ? 1.18 : 1.12) + Math.sin(t * 0.00035) * 0.02;
      }
    }

    // Hero replay intro: Earth close-up → system (not used on cosmic preloader)
    if (introActive && !preloaderCosmicJourney) {
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
            setEarthTerminatorCamera(2.75, 7 * D2R);
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
        if (!onPreloaderStage() && renderer) {
          renderer.toneMappingExposure = (perfTier === 'high' ? 1.12 : 1.08) + Math.min(p, 0.55) * 0.06;
        }
        applyIntroVisuals(p, t);
        if (window.__orreryPreloaderOwns) updateIntroProgress(p);
        updateDomLabels(p);
        if (elapsed >= introMs) finishIntro();
      }
    } else if (!portraitMode && !dragging && !scaleAnimActive && !PRM && !onPreloaderStage() && !masterclassIntroActive && (t - userTouched) > 1200) {
      if (focusFrameId === 'aspect' && aspectActive) {
        // Hold the top-down aspect framing with a whisper of az breathing so the
        // zodiac ring + both markers stay readable (don't snap back to Earth's terminator).
        camRadius += (aspectFrameRadius - camRadius) * Math.min(1, dt * 1.4);
        const wantAz = aspectFrameAz + Math.sin(t * 0.00012) * 0.12;
        let dAz = wantAz - camAz; dAz = Math.atan2(Math.sin(dAz), Math.cos(dAz));
        camAz += dAz * Math.min(1, dt * 1.4);
        camEl += (aspectFrameEl - camEl) * Math.min(1, dt * 1.4);
        if (aspectData && aspectData.centre) camTarget.copy(aspectData.centre);
      } else if (scaleLevel === 0 && !moonFrameActive && scalePreset(0).targetEarth && meshes.earth && sunMesh) {
        // v576: bounded idle — breathe around the terminator money-shot instead of
        // orbiting off it into the dark hemisphere. Eases back after user drags.
        const prevAz = camAz, prevEl = camEl, keepRadius = camRadius;
        setEarthTerminatorCamera(scalePreset(0).camRadius, scalePreset(0).camEl);
        const azTerm = camAz, elTerm = camEl;
        camRadius = keepRadius; // never fight user zoom
        const wantAz = azTerm + Math.sin(t * 0.00016) * 0.22;
        const wantEl = elTerm + Math.cos(t * 0.00013) * 0.02;
        const k = Math.min(1, dt * 1.6);
        let dAz = wantAz - prevAz;
        dAz = Math.atan2(Math.sin(dAz), Math.cos(dAz));
        camAz = prevAz + dAz * k;
        camEl = prevEl + (wantEl - prevEl) * k;
      } else if (moonFrameActive) {
        // hold the Earth+Moon composition with the same gentle breathing
        const wantAz = moonFrameAzBase + Math.sin(t * 0.00016) * 0.1;
        let dAz = wantAz - camAz;
        dAz = Math.atan2(Math.sin(dAz), Math.cos(dAz));
        camAz += dAz * Math.min(1, dt * 1.6);
      } else {
        camAz += 0.05 * dt; // gentle auto-orbit kicks in fast so the model is never visually frozen
      }
    }
    if (!portraitMode && !introActive && !scaleAnimActive && !masterclassMode && !masterclassIntroActive
        && !(focusFrameId === 'aspect' && aspectActive)) clampCamToLevel();
    applyEclipseVisuals();

    // Portrait mode (capture harness only): re-assert the framed camera + the
    // hidden-distractor state every frame so nothing the per-frame updaters touched
    // can leak back into the still. Feed the framed body's sun direction directly
    // (updatePlanetSunLighting bails above scaleLevel 2), then render + return early.
    if (portraitMode) {
      applyPortraitState();
      applyCamera();
      if (composer) composer.render();
      else renderer.render(scene, camera);
      return;
    }

    applyCamera();

    // slow asteroid belt drift
    if (asteroidPoints && showAsteroids && !PRM) {
      asteroidPoints.rotation.y += dt * 0.012;
    }

    // DOM labels (preferred) or canvas sprites as fallback
    updateFocusHighlight(t);
    updateAspectView(t);
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
    if (onPreloaderStage() && !preloaderCosmicJourney) {
      const ip = introActive ? Math.min(1, (t - introStart) / introDurationMs()) : null;
      applyPreloaderEarthIsolation(ip);
    } else if (!onPreloaderStage()) {
      orbitLines.forEach((o) => { o.visible = showOrbits && scaleLevel <= 3; });
    }

    if (composer) composer.render();
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

  function tryCreateFinishPass() {
    try {
      return new ShaderPass(FinishShader);
    } catch (e) {
      console.warn('[orrery] finish shader unavailable:', e.message);
      return null;
    }
  }

  function canvasBox() {
    if (cosmicFlightToolActive || spaceFlightToolActive) {
      try {
        const stage = document.getElementById('ap-cosmic-flight-stage');
        if (stage) {
          const r = stage.getBoundingClientRect();
          const w = Math.round(r.width);
          const h = Math.round(r.height);
          if (w > 1 && h > 1) return { w, h };
        }
        const vv = window.visualViewport;
        const w = Math.round(vv?.width || window.innerWidth || 390);
        const h = Math.round(vv?.height || window.innerHeight || 844);
        if (w > 1 && h > 1) return { w, h };
      } catch (_) {}
    }
    if (preloaderCosmicJourney && onPreloaderStage()) {
      try {
        const pre = document.getElementById('preloader');
        if (pre && pre.classList.contains('preloader--cosmic')
            && !pre.classList.contains('aligned') && !pre.classList.contains('preloader--earth-land')) {
          const vv = window.visualViewport;
          const w = Math.round(vv?.width || window.innerWidth || 390);
          const h = Math.round(vv?.height || window.innerHeight || 844);
          if (w > 1 && h > 1) return { w, h };
        }
      } catch (_) {}
    }
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

  function pointerClientXY(e) {
    return { x: e.clientX || 0, y: e.clientY || 0 };
  }

  function pinchDistance() {
    const pts = [...activePointers.values()];
    if (pts.length < 2) return 0;
    return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
  }

  function zoomCamRadius(factor) {
    const p = scalePreset(scaleLevel);
    camRadius = Math.max(p.camMin, Math.min(p.camMax, camRadius * factor));
    userTouched = performance.now();
    introActive = false;
    syncPreloaderIntroClass(false);
    scaleAnimActive = false;
  }

  // ── Pointer controls ───────────────────────────────────────────────────────
  function bindControls() {
    try {
      canvas.setAttribute('tabindex', '0');
      // The canvas ships aria-hidden="true" as a decorative fallback; once this
      // engine makes it a focusable, labeled instrument, clear that flag so it
      // isn't an aria-hidden focusable element (axe: aria-hidden-focus).
      canvas.removeAttribute('aria-hidden');
      if (!canvas.getAttribute('aria-label')) {
        canvas.setAttribute('aria-label', 'The Living Orrery — drag to scrub time, Shift+drag to orbit, scroll or pinch to zoom, double-click a planet to focus');
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
      } else if (k === 'ArrowUp' || k === '+' || k === '=') {
        zoomCamRadius(0.92);
        e.preventDefault();
      } else if (k === 'ArrowDown' || k === '-' || k === '_') {
        zoomCamRadius(1.08);
        e.preventDefault();
      } else if (k >= '0' && k <= '6') {
        applyScalePreset(parseInt(k, 10), true);
        e.preventDefault();
      } else if (k === ' ' || k === 'Spacebar') {
        setSpeed(daysPerSec === 0 ? 1 : 0);
        e.preventDefault();
      } else if (k === 'd' || k === 'D') {
        const mode = detailLightingUser === null ? 'on' : detailLightingUser ? 'off' : 'auto';
        setDetailLighting(mode);
        e.preventDefault();
      }
    };
    canvas.addEventListener('keydown', onKey);
    canvas._orreryKeyHandler = onKey;
    const onDown = (e) => {
      if (onPreloaderStage() && introActive) return;
      // Aspect view auto-retires on the next user pointer interaction (like the
      // focusPlanet timed highlight). Dispose visuals; the drag below takes the camera.
      if (aspectActive) {
        aspectActive = false; aspectUntil = 0;
        disposeAspectView(); clearFocusHighlight();
        if (focusFrameId === 'aspect') focusFrameId = null;
        try { delete window.__apLastAspect; } catch (_) {}
      }
      try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
      activePointers.set(e.pointerId, pointerClientXY(e));
      if (activePointers.size >= 2) {
        dragging = false;
        pinchStartDist = pinchDistance();
        pinchStartRadius = camRadius;
        scrollDriveLocked = true;
        daysPerSec = 0;
        flicking = false;
        scrubVel = 0;
        return;
      }
      dragging = true;
      scrollDriveLocked = true;
      dragMode = (e.shiftKey || e.button === 2) ? 'orbit' : 'scrub';
      const p = pt(e);
      lastX = downX = p.x;
      lastY = downY = p.y;
      userTouched = performance.now();
      introActive = false;
      syncPreloaderIntroClass(false);
      daysPerSec = 0;
      flicking = false;
      scrubVel = 0;
      try { canvas.style.cursor = dragMode === 'orbit' ? 'move' : 'grabbing'; } catch (_) {}
    };
    const onMove = (e) => {
      if (!activePointers.has(e.pointerId)) return;
      activePointers.set(e.pointerId, pointerClientXY(e));
      if (activePointers.size >= 2 && pinchStartDist > 0) {
        const dist = pinchDistance();
        if (dist > 0) {
          const ratio = pinchStartDist / dist;
          const p = scalePreset(scaleLevel);
          camRadius = Math.max(p.camMin, Math.min(p.camMax, pinchStartRadius * ratio));
          userTouched = performance.now();
          scaleAnimActive = false;
        }
        return;
      }
      if (!dragging) return;
      const p = pt(e);
      const dx = p.x - lastX;
      const dy = p.y - lastY;
      if (dragMode === 'orbit') {
        camAz -= dx * 0.014;
        camEl += dy * 0.008;
        camEl = Math.max(-1.3, Math.min(1.45, camEl));
      } else {
        // Horizontal drag SCRUBS REAL TIME — planets walk to dated positions.
        if (dx) {
          const dd = dx * SCRUB_SENS;
          dayOffset += dd;
          needRecompute = true;
          scrubVel = scrubVel * 0.6 + dd * 0.4;
        }
        camEl += dy * 0.008;
        camEl = Math.max(-1.3, Math.min(1.45, camEl));
      }
      lastX = p.x;
      lastY = p.y;
      userTouched = performance.now();
    };
    const onUp = (e) => {
      activePointers.delete(e.pointerId);
      try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
      if (activePointers.size >= 2) {
        pinchStartDist = pinchDistance();
        pinchStartRadius = camRadius;
        return;
      }
      if (activePointers.size === 1) {
        pinchStartDist = 0;
        return;
      }
      pinchStartDist = 0;
      if (dragging) {
        const p = pt(e);
        if (dragMode === 'scrub' && Math.hypot(p.x - downX, p.y - downY) < 5) { pick(p); }
        else if (dragMode === 'scrub' && !PRM && Math.abs(scrubVel) > 0.05) {
          daysPerSec = Math.max(-365, Math.min(365, scrubVel * 40));
          flicking = true;
        }
      }
      dragging = false;
      scrubVel = 0;
      try { canvas.style.cursor = 'grab'; } catch (_) {}
    };
    const onWheel = (e) => {
      // In the full-viewport homepage hero a bare wheel must scroll the page;
      // ctrl/cmd+wheel (trackpad pinch reports ctrlKey) zooms. Elsewhere
      // (ephemeris instrument) the boxed canvas keeps plain-wheel zoom.
      const heroCtx = !!(canvas.closest && canvas.closest('#apAwardOrreryWrap'));
      if (heroCtx && !e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      if (onPreloaderStage() && introActive) return;
      zoomCamRadius(1 + Math.sign(e.deltaY) * 0.08);
    };
    const onDbl = (e) => {
      if (onPreloaderStage() && introActive) return;
      const id = resolvePickId(pt(e));
      if (!id) return;
      e.preventDefault();
      focusPlanet(id);
    };
    const onCtx = (e) => {
      if (onPreloaderStage() && introActive) return;
      e.preventDefault();
      dragMode = 'orbit';
    };
    canvas.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    canvas.addEventListener('dblclick', onDbl);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('contextmenu', onCtx);
    canvas._orreryHandlers = { onMove, onUp };
    canvas._orreryDblHandler = onDbl;
    canvas._orreryCtxHandler = onCtx;
  }

  function setDetailLighting(mode) {
    if (mode === 'auto' || mode == null) detailLightingUser = null;
    else if (mode === 'on' || mode === true) detailLightingUser = true;
    else detailLightingUser = false;
    updateScaleVisuals(scaleLevel);
    try {
      document.dispatchEvent(new CustomEvent('orrery-detail-lighting', {
        detail: {
          mode: detailLightingUser === null ? 'auto' : detailLightingUser ? 'on' : 'off',
          active: wantsDetailLighting(),
        },
      }));
    } catch (_) {}
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
    if (window.__orreryPreloaderOwns && !window.__apHeroEntered) {
      console.warn('[orrery] preloader owns canvas — skipping canvas fallback');
      return;
    }
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
    scene.fog = new THREE.FogExp2(isAwardMode() ? 0x0c1016 : 0x050406, 0.00045);
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
    } else if (perfTier !== 'low') {
      ensureGalaxyLayers();
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
      const io = new IntersectionObserver((ents) => {
        const was = inView;
        inView = ents[0].isIntersecting;
        // OrbitLab 2026-07-05 port: wake the parked frame loop when scrolled back in
        if (!was && inView && !destroyed && running && !raf) raf = requestAnimationFrame(frame);
      }, { threshold: 0.01 });
      io.observe(canvas); canvas._orreryIO = io;
    } else {
      inView = true;
    }
    document.addEventListener('visibilitychange', () => {
      running = !document.hidden;
      if (running && inView && !destroyed && !raf) raf = requestAnimationFrame(frame);
    });
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
          finishPass = null;
        }
      }
    }

    lastT = 0; raf = requestAnimationFrame(frame);
    webglBooted = true;
    // v576: the 2D engine announces its first frame; the WebGL engine now does too,
    // so the loader can cross-fade the poster→HD handoff deterministically.
    try { document.dispatchEvent(new Event('ap-orrery-first-frame')); } catch (e) { /* optional */ }
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

  // ── Portrait mode (v581) — clean, transparent single-body stills ─────────────
  // The whole graphics overhaul (sign heroes, product art, icons) depends on this
  // producing premium, lit, distractor-free planet portraits with a genuinely
  // transparent void. It is ADDITIVE and REVERSIBLE and is called ONLY by the
  // capture harness — the normal homepage boot never touches it.

  const _portTarget = new THREE.Vector3();
  const _portToSun = new THREE.Vector3();
  const _portSide = new THREE.Vector3();
  const _portUp = new THREE.Vector3(0, 1, 0);
  const _portOff = new THREE.Vector3();

  // Hide every object that is not the framed body (+ its own rings/atmosphere/clouds).
  // Re-run every frame while portraitMode is on so per-frame updaters can't leak
  // distractors back into the still.
  function applyPortraitHiding() {
    const keepMoon = portraitId === 'earthmoon';
    const earthFrame = (portraitId === 'earth' || keepMoon) && !portraitMoonOnly;
    // Planets: only the framed body (Earth for the earthmoon frame) stays visible.
    // For the SUN portrait, EVERY planet is hidden — the sun disc is the whole shot.
    // For the MOON-only portrait, every planet (incl. Earth) is hidden — Moon only.
    BODIES.forEach((b) => {
      const g = meshes[b.id];
      if (!g) return;
      const isTarget = (portraitSun || portraitMoonOnly) ? false : (earthFrame ? (b.id === 'earth') : (b.id === portraitId));
      g.visible = isTarget;
      if (isTarget) g.scale.setScalar(1);
      // clear any lingering focus/selection ring on every body
      if (g.userData && g.userData.focusRing) g.userData.focusRing.visible = false;
    });
    // Sun + its glare stack. Capture-only SUN portrait keeps the disc + a controlled
    // inner glow so it reads as a premium golden star (not a blown-out white disc);
    // the discrete god-ray corona + the widest halo layers stay OFF (they read as
    // spokes / opaque haze that would fog the transparent corners).
    if (sunMesh) sunMesh.visible = portraitSun;
    sunGlow.forEach((sp, i) => { if (sp) sp.visible = portraitSun && i === 0; });
    if (sunCoronaGroup) sunCoronaGroup.visible = false;
    if (sunCoronaMesh) sunCoronaMesh.visible = portraitSun;
    if (sunPromGroup) sunPromGroup.visible = false;
    if (sunMarker) sunMarker.visible = false;
    if (sunFocusRing) sunFocusRing.visible = false;
    if (moonFocusRing) moonFocusRing.visible = false;
    // Orbit lines, asteroid belt, comet
    orbitLines.forEach((o) => { if (o) o.visible = false; });
    if (asteroidPoints) asteroidPoints.visible = false;
    if (halleyGroup) halleyGroup.visible = false;
    // Labels (canvas sprites) — DOM labels handled via updateDomLabels(0)
    Object.keys(labels).forEach((k) => { if (labels[k]) labels[k].visible = false; });
    // Deep-space / starfield / galaxy layers
    if (starField) starField.visible = false;
    if (starFieldFar) starFieldFar.visible = false;
    if (milkyWayBand) milkyWayBand.visible = false;
    if (oortShell) oortShell.visible = false;
    if (localStarsGroup) localStarsGroup.visible = false;
    if (catalogStarsGroup) catalogStarsGroup.visible = false;
    if (milkyWayBulge) milkyWayBulge.visible = false;
    if (milkyWayDisk) milkyWayDisk.visible = false;
    if (milkyWayDust) milkyWayDust.visible = false;
    if (milkyWayHII) milkyWayHII.visible = false;
    if (milkyWayArmRibbons) milkyWayArmRibbons.visible = false;
    if (milkyWaySatellites) milkyWaySatellites.visible = false;
    if (galacticCore) galacticCore.visible = false;
    if (galacticCoreRing) galacticCoreRing.visible = false;
    if (galacticBar) galacticBar.visible = false;
    if (galacticHalo) galacticHalo.visible = false;
    if (galacticHaloDisk) galacticHaloDisk.visible = false;
    if (cosmicField) cosmicField.visible = false;
    // Earth extras
    if (earthCloud) earthCloud.visible = earthFrame;   // keep clouds for Earth portraits
    if (moonGroup) moonGroup.visible = keepMoon || portraitMoonOnly;  // earthmoon frame OR moon-only portrait
    if (earthOrbitGroup) earthOrbitGroup.visible = false;
    if (leoOrbitRing) leoOrbitRing.visible = false;
    if (geoOrbitRing) geoOrbitRing.visible = false;
    if (moonHaloMesh) moonHaloMesh.visible = keepMoon;  // halo only in the composed frame, not the clean moon disc
    // Portrait stills rely on the real moon.jpg texture; the low-poly crater DISH
    // overlays stick out as jagged silhouettes at the rim + float as dark blobs
    // (depthWrite:false), so hide them in ANY portrait moon frame (moon-only OR the
    // composed earthmoon). The live hero (not portraitMode) keeps them.
    if (moonCraterGroup) moonCraterGroup.visible = !(portraitMoonOnly || keepMoon);
    // Retrograde glow sprites (rebuilt onto planet groups)
    BODIES.forEach((b) => {
      const g = meshes[b.id];
      const sprite = g && g.userData && g.userData.retroSprite;
      if (sprite) sprite.visible = false;
    });
  }

  // Point the framed body's shader sun-direction at the sun manually. The normal
  // updatePlanetSunLighting() bails above scaleLevel 2 and skips hidden bodies, so
  // portrait mode (sun hidden) must drive the lit hemisphere itself.
  function applyPortraitSunLighting() {
    const ids = portraitId === 'earthmoon' ? ['earth'] : [portraitId];
    ids.forEach((pid) => {
      const g = meshes[pid];
      if (!g) return;
      // Sun sits at the scene origin; lit hemisphere faces the origin.
      _portToSun.copy(g.position).multiplyScalar(-1);
      if (_portToSun.lengthSq() < 1e-6) _portToSun.set(1, 0, 0);
      else _portToSun.normalize();
      const mat = g.userData && g.userData.mat;
      if (mat && mat.userData && mat.userData.planetShader && mat.userData.planetShader.uniforms.uSunDir) {
        mat.userData.planetShader.uniforms.uSunDir.value.copy(_portToSun);
      }
    });
    // HD Earth uses world/object sun-dir uniforms fed elsewhere; feed them here too.
    if ((portraitId === 'earth' || portraitId === 'earthmoon') && earthMat && meshes.earth) {
      const em = meshes.earth.userData.mesh;
      em.updateWorldMatrix(true, false);
      _earthWorld.setFromMatrixPosition(em.matrixWorld);
      _sunWorld.copy(ORIGIN).sub(_earthWorld).normalize();
      earthUniforms.uSunDirWorld.value.copy(_sunWorld);
      _earthInv.setFromMatrix4(em.matrixWorld).invert();
      earthUniforms.uSunDir.value.copy(_sunWorld).applyMatrix3(_earthInv).normalize();
      if (earthAtmoMat) earthAtmoMat.uniforms.uCamPos.value.copy(camera.position);
      if (earthAtmoMatOuter) earthAtmoMatOuter.uniforms.uCamPos.value.copy(camera.position);
    }
  }

  // Compute the portrait camera: place the lens on the SUN-LIT side of the planet
  // (offset toward the sun from the planet) with a small lateral + elevation nudge
  // for a lit, slightly-tilted 3/4 face. Sizes camRadius so the body fills the
  // requested fraction of the vertical FOV.
  function computePortraitCamera(pid, fillFrac) {
    if (pid === 'earthmoon') {
      // Reuse the Earth+Moon composition framing.
      if (moonGroup && meshes.earth) {
        syncMoonFrameTarget();          // sets camTarget + moonFrameAzBase (sunward side)
        camAz = moonFrameAzBase;
        camEl = 8 * D2R;
        camRadius = 3.0;
        camera.fov = CAM_FOV_CLOSE;
        camera.updateProjectionMatrix();
        return;
      }
      pid = 'earth';
    }
    const g = meshes[pid];
    if (!g) return;
    const body = g.userData.b;
    _portTarget.copy(g.position);
    camTarget.copy(_portTarget);

    // Direction from the planet toward the sun (origin).
    _portToSun.copy(_portTarget).multiplyScalar(-1);
    if (_portToSun.lengthSq() < 1e-8) _portToSun.set(-1, 0, 0);
    _portToSun.normalize();
    // Lateral axis for the 3/4 offset.
    _portSide.crossVectors(_portUp, _portToSun);
    if (_portSide.lengthSq() < 1e-8) _portSide.set(0, 0, 1);
    _portSide.normalize();

    // Fit distance: half-height of the body should span fillFrac of the frame.
    const fov = (CAM_FOV_MID || 42) * D2R;
    const radius = body.size;
    const fit = radius / Math.max(0.05, Math.min(0.95, fillFrac)) / Math.tan(fov / 2);
    const dist = Math.max(radius * 3.2, fit);

    // Sun-side camera offset: mostly toward the sun, nudged laterally + up so the
    // lit hemisphere faces the lens with a gentle terminator and a 3/4 tilt.
    const el = 14 * D2R;
    const ce = Math.cos(el), se = Math.sin(el);
    _portOff.copy(_portToSun).multiplyScalar(0.90 * ce);
    _portOff.addScaledVector(_portSide, 0.42 * ce);
    _portOff.y += se;
    _portOff.normalize().multiplyScalar(dist);

    camRadius = _portOff.length();
    camEl = Math.asin(Math.max(-1, Math.min(1, _portOff.y / camRadius)));
    const horiz = Math.cos(camEl) * camRadius;
    camAz = horiz > 1e-6 ? Math.atan2(_portOff.z, _portOff.x) : 0;
    camera.fov = CAM_FOV_MID;
    camera.updateProjectionMatrix();
  }

  // Capture-only: frame the MOON alone on its sun-lit side (lit gibbous face toward
  // the lens) with a small 3/4 tilt, fitted so the disc fills fillFrac of the frame.
  function computePortraitCameraMoon(fillFrac) {
    if (!moonGroup) return;
    const moonRad = 0.26;
    _portTarget.copy(moonGroup.position);
    camTarget.copy(_portTarget);
    _portToSun.copy(_portTarget).multiplyScalar(-1);
    if (_portToSun.lengthSq() < 1e-8) _portToSun.set(-1, 0, 0);
    _portToSun.normalize();
    _portSide.crossVectors(_portUp, _portToSun);
    if (_portSide.lengthSq() < 1e-8) _portSide.set(0, 0, 1);
    _portSide.normalize();
    const fov = (CAM_FOV_MID || 42) * D2R;
    const ff = Math.max(0.05, Math.min(0.95, fillFrac));
    const fit = moonRad / ff / Math.tan(fov / 2);
    const dist = Math.max(moonRad * 3.2, fit);
    const el = 12 * D2R;
    const ce = Math.cos(el), se = Math.sin(el);
    _portOff.copy(_portToSun).multiplyScalar(0.92 * ce);
    _portOff.addScaledVector(_portSide, 0.36 * ce);
    _portOff.y += se;
    _portOff.normalize().multiplyScalar(dist);
    camRadius = _portOff.length();
    camEl = Math.asin(Math.max(-1, Math.min(1, _portOff.y / camRadius)));
    const horiz = Math.cos(camEl) * camRadius;
    camAz = horiz > 1e-6 ? Math.atan2(_portOff.z, _portOff.x) : 0;
    camera.fov = CAM_FOV_MID;
    camera.updateProjectionMatrix();
  }

  // Capture-only: frame the SUN. It lives at the scene origin and is self-lit, so
  // just sit the lens straight in front of it (small elevation for a hero tilt) and
  // fit the distance so the glowing disc fills fillFrac of the frame. The inner glow
  // sprite extends ~2× the disc, so fillFrac ~0.44 keeps the corners transparent.
  function computePortraitCameraSun(fillFrac) {
    camTarget.set(0, 0, 0);
    const fov = (CAM_FOV_MID || 42) * D2R;
    const radius = SUN_SIZE;
    const ff = Math.max(0.05, Math.min(0.95, fillFrac));
    const fit = radius / ff / Math.tan(fov / 2);
    camRadius = Math.max(radius * 3.0, fit);
    camEl = 6 * D2R;
    camAz = 0;
    camera.fov = CAM_FOV_MID;
    camera.updateProjectionMatrix();
  }

  // Aim the real key lights at the framed body so its SUN-FACING hemisphere is the
  // lit one. The directional light otherwise targets Earth (its default focus), so
  // a far planet like Mars/Saturn gets lit from the wrong side and reads as a dark
  // silhouette with only a rim sliver — the exact lit-face bug.
  function applyPortraitLighting() {
    const pid = portraitId === 'earthmoon' ? 'earth' : portraitId;
    const g = meshes[pid];
    if (!g) return;
    // Sun sits at the scene origin; keep the sun mesh + point light there.
    if (sunMesh) sunMesh.position.set(0, 0, 0);
    if (sunDirLight) sunDirLight.position.set(0, 0, 0);
    if (sunDirLightTarget) {
      sunDirLightTarget.position.copy(g.position);
      sunDirLightTarget.updateMatrixWorld();
    }
    // Favour the DIRECTIONAL key (even, hotspot-free) over the point light, whose
    // tight specular blows a distracting white glare into the middle of the disc.
    if (sunPointLight) sunPointLight.intensity = 0.9;
    if (sunDirLight) sunDirLight.intensity = perfTier === 'high' ? 3.0 : 2.6;
    if (hemiLight) hemiLight.intensity = perfTier === 'high' ? 0.30 : 0.26;
    // Soften the atmosphere fresnel rim (a hard bright outline reads as a sticker
    // edge in a print-grade still). Earth's dedicated Rayleigh shells get their own
    // gentler ratio below (their new hero-rest base is brighter by design).
    if (pid !== 'earth' && g.userData && g.userData.atmo) {
      const am = g.userData.atmo.material;
      if (am && am.uniforms && am.uniforms.uIntensity) {
        if (portraitAtmoBase == null) portraitAtmoBase = {};
        if (portraitAtmoBase[pid] == null) portraitAtmoBase[pid] = am.uniforms.uIntensity.value;
        am.uniforms.uIntensity.value = portraitAtmoBase[pid] * 0.4;
      }
    }
    // Earth two-shell soften: portrait renders WITHOUT the bloom composer, so the
    // 0.9 / 0.15 hero-rest intensities read hot in a raw still — damp both shells
    // relative to the new base (restored via portraitAtmoBase in exitPortrait).
    if (pid === 'earth') {
      if (portraitAtmoBase == null) portraitAtmoBase = {};
      if (earthAtmoMat && earthAtmoMat.uniforms.uIntensity && portraitAtmoBase.earth == null) {
        portraitAtmoBase.earth = earthAtmoMat.uniforms.uIntensity.value;
        earthAtmoMat.uniforms.uIntensity.value = portraitAtmoBase.earth * 0.72;
      }
      if (earthAtmoMatOuter && earthAtmoMatOuter.uniforms.uIntensity && portraitAtmoBase.earthOuter == null) {
        portraitAtmoBase.earthOuter = earthAtmoMatOuter.uniforms.uIntensity.value;
        earthAtmoMatOuter.uniforms.uIntensity.value = portraitAtmoBase.earthOuter * 0.72;
      }
    }
    // Hide Saturn's ring-shadow band (it mis-projects as grey rectangles on the disc).
    if (saturnShadowBand) saturnShadowBand.visible = false;
  }

  // Re-assert framing + hiding + lit-face every frame while portrait mode is on.
  function applyPortraitState() {
    if (scene && scene.fog) scene.fog.density = 0;
    applyPortraitHiding();
    // keep DOM labels off
    try { updateDomLabels(0); } catch (e) {}
    if (portraitSun) { applyPortraitSunSelf(); return; }
    if (portraitMoonOnly) { applyPortraitMoonSelf(); return; }
    applyPortraitLighting();
    applyPortraitSunLighting();
  }

  // Capture-only: light the MOON alone for its portrait. Point its shader sun-dir at
  // the sun (origin) and aim the real key light at the moon so the lit gibbous
  // hemisphere faces the lens instead of reading as a silhouette.
  function applyPortraitMoonSelf() {
    if (!moonGroup || !moonMesh) return;
    _portToSun.copy(moonGroup.position).multiplyScalar(-1);
    if (_portToSun.lengthSq() < 1e-6) _portToSun.set(1, 0, 0); else _portToSun.normalize();
    const mm = moonMesh.material;
    if (mm && mm.userData && mm.userData.planetShader && mm.userData.planetShader.uniforms.uSunDir) {
      mm.userData.planetShader.uniforms.uSunDir.value.copy(_portToSun);
    }
    if (sunDirLight) { sunDirLight.position.set(0, 0, 0); sunDirLight.intensity = perfTier === 'high' ? 3.0 : 2.6; }
    if (sunDirLightTarget) { sunDirLightTarget.position.copy(moonGroup.position); sunDirLightTarget.updateMatrixWorld(); }
    if (sunPointLight) sunPointLight.intensity = 0.9;
    if (hemiLight) hemiLight.intensity = perfTier === 'high' ? 0.22 : 0.18;
  }

  // Capture-only: dress the sun itself for its hero portrait. It is the light source,
  // so it needs no external key — just keep its shader time animating and its inner
  // glow tuned so the disc looks like a living golden star, not a flat sticker.
  function applyPortraitSunSelf() {
    if (sunMesh) sunMesh.position.set(0, 0, 0);
    // Without the bloom composer the disc's own 1.78× gain clips to pure white. Drop
    // the gain so the surface keeps its golden granulation + limb falloff, reading as
    // a premium star rather than a blown white sticker. The physical limb-darkening
    // term (ld, centre=1.0 → limb≈0.58) now does the heavy lifting for shape, so the
    // gain can sit a touch higher (0.52) — a hot centre without clipping — while uGran
    // expands the granulation contrast that the flat gain cut used to wash out.
    if (sunMaterial && sunMaterial.uniforms && sunMaterial.uniforms.uGain) {
      sunMaterial.uniforms.uGain.value = 0.56;
    }
    if (sunMaterial && sunMaterial.uniforms && sunMaterial.uniforms.uGran) {
      // 1.9 over-hardened the organic granulation into a sequined lattice in the
      // no-bloom still; 1.5 keeps the mottle crisp but ORGANIC (photographic, not a mesh).
      sunMaterial.uniforms.uGran.value = 1.5;
    }
    // The one visible inner glow sprite carries the soft golden corona halo.
    if (sunGlow[0] && sunGlow[0].material) {
      sunGlow[0].material.opacity = 0.5;
    }
  }

  /**
   * enterPortrait(id, opts) — freeze the engine on a clean, lit, transparent-void
   * single-body still. Capture-harness ONLY. Additive + reversible via exitPortrait().
   * @param {string} id  'mercury'…'neptune' | 'earth'
   * @param {object} [opts] { date?:Date|string, radiusMul?:number,
   *                          frame?:'portrait'|'earthmoon', fillFrac?:number }
   */
  function enterPortrait(id, opts) {
    if (!id || destroyed || !renderer) return false;
    opts = opts || {};
    id = String(id).toLowerCase();
    const isSun = id === 'sun' || opts.frame === 'sun';
    const isMoonOnly = (id === 'moon' && opts.frame !== 'earthmoon') || opts.frame === 'moon';
    const frame = opts.frame === 'earthmoon' ? 'earthmoon'
      : isSun ? 'sun'
      : isMoonOnly ? 'moon'
      : 'portrait';
    const pid = frame === 'earthmoon' ? 'earthmoon'
      : isSun ? 'sun'
      : isMoonOnly ? 'moon'
      : id;

    // Snapshot for a non-destructive exit.
    if (!portraitMode) {
      portraitRestore = {
        scaleLevel, camRadius, camAz, camEl,
        camTarget: camTarget.clone(),
        fov: camera.fov,
        showOrbits, showLabels, showAsteroids,
        fogDensity: (scene && scene.fog) ? scene.fog.density : null,
        dayOffset, daysPerSec,
        focusPlanetId, focusFrameId, moonFrameActive,
        running,
      };
    }

    // Build all planets so the target exists (esp. outer bodies).
    if (!allPlanetsBuilt) { buildRemainingPlanets(); }
    // SUN portrait needs the full corona shell + glow layers (they arrive lazily
    // via upgradeSunVisuals in the normal settle path); force them up now so the
    // capture isn't a bare minimal disc.
    if (isSun) { try { upgradeSunVisuals(); } catch (e) {} }
    // Optional deterministic date, then recompute positions.
    if (opts.date != null) {
      try {
        const d = opts.date instanceof Date ? opts.date : new Date(opts.date);
        if (!isNaN(+d)) setDate(d);
      } catch (e) {}
    }
    daysPerSec = 0; flicking = false;
    needRecompute = true;
    updatePositions();

    // Clear any transient selection ring + release focus/scale ownership.
    clearFocusHighlight();
    focusPlanetId = null;
    focusFrameId = null;
    moonFrameActive = false;
    scaleAnimActive = false;
    introActive = false;

    portraitMode = true;
    portraitId = pid;
    portraitSun = isSun;
    portraitMoonOnly = isMoonOnly;
    // Portrait sits at the close scale so detail lighting + textures are hero-grade.
    scaleLevel = 0;
    showOrbits = false; showLabels = false; showAsteroids = false;
    if (scene && scene.fog) scene.fog.density = 0;
    // Fill fraction: ~0.70 default (68–75%); radiusMul lets the harness fine-tune.
    let fillFrac = typeof opts.fillFrac === 'number' ? opts.fillFrac : 0.70;
    if (typeof opts.radiusMul === 'number' && opts.radiusMul > 0) fillFrac /= opts.radiusMul;

    if (isSun) computePortraitCameraSun(fillFrac);
    else if (isMoonOnly) computePortraitCameraMoon(fillFrac);
    else computePortraitCamera(pid, fillFrac);
    applyPortraitState();
    applyCamera();
    // Render straight through the renderer (no composer) so the still is transparent.
    renderer.render(scene, camera);
    return true;
  }

  /** exitPortrait() — restore the pre-portrait engine state (reversible). */
  function exitPortrait() {
    if (!portraitMode) return false;
    portraitMode = false;
    portraitSun = false;
    portraitMoonOnly = false;
    // Restore the live-hero sun brightness (portrait dropped it for a no-bloom still).
    if (sunMaterial && sunMaterial.uniforms && sunMaterial.uniforms.uGain) {
      sunMaterial.uniforms.uGain.value = 1.0;
    }
    if (sunMaterial && sunMaterial.uniforms && sunMaterial.uniforms.uGran) {
      sunMaterial.uniforms.uGran.value = 1.0;
    }
    const r = portraitRestore;
    portraitId = null;
    portraitRestore = null;
    // Restore any atmosphere-rim intensities the portrait dampened.
    if (portraitAtmoBase) {
      // Earth's outer veil is keyed separately (there is no meshes['earthOuter']).
      if (portraitAtmoBase.earthOuter != null && earthAtmoMatOuter && earthAtmoMatOuter.uniforms.uIntensity) {
        earthAtmoMatOuter.uniforms.uIntensity.value = portraitAtmoBase.earthOuter;
        delete portraitAtmoBase.earthOuter;
      }
      Object.keys(portraitAtmoBase).forEach((pid) => {
        const g = meshes[pid];
        const am = g && g.userData && g.userData.atmo && g.userData.atmo.material;
        if (am && am.uniforms && am.uniforms.uIntensity && portraitAtmoBase[pid] != null) {
          am.uniforms.uIntensity.value = portraitAtmoBase[pid];
        }
      });
      portraitAtmoBase = null;
    }
    // Saturn's ring shadow is now cast in the ring shader (view-independent), so the
    // retired flat shadow-band plane stays hidden on exit — nothing to restore.
    if (saturnShadowBand) saturnShadowBand.visible = false;
    if (r) {
      scaleLevel = r.scaleLevel;
      showOrbits = r.showOrbits;
      showLabels = r.showLabels;
      showAsteroids = r.showAsteroids;
      focusPlanetId = r.focusPlanetId;
      focusFrameId = r.focusFrameId;
      moonFrameActive = r.moonFrameActive;
      if (scene && scene.fog && r.fogDensity != null) scene.fog.density = r.fogDensity;
      camTarget.copy(r.camTarget);
      camRadius = r.camRadius; camAz = r.camAz; camEl = r.camEl;
      camera.fov = r.fov; camera.updateProjectionMatrix();
    }
    // Rebuild the normal scene visibility + lighting for the restored scale.
    needRecompute = true;
    updatePositions();
    updateScaleVisuals(scaleLevel);
    applyCamera();
    return true;
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
    focusFrameId = null;
    moonFrameActive = false;

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
      // v576: a REAL Moon frame — Earth and Moon share the shot (was: Earth preset reused, no Moon in sight)
      setFocusHighlight('moon');
      if (!moonGroup || !meshes.earth) { applyScalePreset(0, true); return; }
      const prevLevel = scaleLevel;
      scaleLevel = 0;
      scaleAnimFromLevel = prevLevel;
      scaleAnimToLevel = 0;
      updateScaleHUD();
      updateScaleVisuals(0);

      scaleAnimFrom.radius = camRadius;
      scaleAnimFrom.el = camEl;
      scaleAnimFrom.az = camAz;
      scaleAnimFrom.tx = camTarget.x;
      scaleAnimFrom.ty = camTarget.y;
      scaleAnimFrom.tz = camTarget.z;

      syncMoonFrameTarget(); // computes camTarget + sunward moonFrameAzBase (anim overwrites camTarget next frame)
      scaleAnimTo.radius = 2.6;
      scaleAnimTo.el = 8 * D2R;
      let azD = moonFrameAzBase - scaleAnimFrom.az;
      azD = Math.atan2(Math.sin(azD), Math.cos(azD));
      scaleAnimTo.az = scaleAnimFrom.az + azD; // shortest swing to the frame
      scaleAnimTo.tx = camTarget.x;
      scaleAnimTo.ty = camTarget.y;
      scaleAnimTo.tz = camTarget.z;

      focusFrameId = 'moon';
      moonFrameActive = true;
      scaleAnimActive = true;
      scaleAnimStart = performance.now();
      camera.fov = CAM_FOV_CLOSE;
      camera.updateProjectionMatrix();
      return;
    }

    const body = BODIES.find((b) => b.id === id);
    const g = meshes[id];
    if (!body || !g) return;

    const inner = (id === 'mercury' || id === 'venus' || id === 'mars');
    const preset = scalePreset(inner ? 1 : 2);
    scaleAnimFromLevel = scaleLevel;
    scaleLevel = preset.id;
    scaleAnimToLevel = preset.id;
    updateScaleHUD();
    updateScaleVisuals(scaleLevel);
    // #7: focusPlanet changes the scale level, so fire the same event applyScalePreset
    // does — otherwise the loader's mobile stepper label goes stale (updateScaleHUD
    // only syncs the .orrery-scale-btn strip, not the stepper).
    try {
      document.dispatchEvent(new CustomEvent('orrery-scale-change', { detail: { level: scaleLevel, preset: preset } }));
    } catch (e) { /* optional */ }

    scaleAnimFrom.radius = camRadius;
    scaleAnimFrom.el = camEl;
    scaleAnimFrom.az = camAz;
    scaleAnimFrom.tx = camTarget.x;
    scaleAnimFrom.ty = camTarget.y;
    scaleAnimFrom.tz = camTarget.z;

    const pos = g.position;
    // v576: outer bodies get a textured PORTRAIT (camera close to the body),
    // not a distant speck framed against the sun glare (was orbitR * 0.44).
    // Camera sits SUNWARD of the planet (az + π, nudged off-axis for modelling
    // shadow) so the lit hemisphere faces the lens and the sun stays behind it.
    scaleAnimTo.radius = inner ? Math.max(body.size * 7.5, 12) : Math.max(body.size * 9, 8);
    scaleAnimTo.el = inner ? 16 * D2R : 14 * D2R;
    // Camera SUNWARD of the body (az + π, nudged −0.35 off-axis for a terminator)
    // so the LIT hemisphere faces the lens and the Sun stays behind the camera.
    // (Inner planets used to omit this flip → they framed their unlit night side
    // against the Sun glare, a black speck eclipsing the disc. Now unified.)
    const azWant = Math.atan2(pos.z, pos.x) + Math.PI - 0.35;
    let azD = azWant - camAz;
    azD = Math.atan2(Math.sin(azD), Math.cos(azD));
    scaleAnimTo.az = camAz + azD; // shortest swing
    scaleAnimTo.tx = pos.x;
    scaleAnimTo.ty = pos.y;
    scaleAnimTo.tz = pos.z;

    setFocusHighlight(id);
    focusFrameId = id;
    scaleAnimActive = true;
    scaleAnimStart = performance.now();
    camera.fov = CAM_FOV_MID;
    camera.updateProjectionMatrix();
  }

  // ── Aspect view: the HONEST geocentric ecliptic zodiac ring ──────────────────
  // Honesty caption shown under the ring, verbatim. Solar charts append a note that
  // the "your Sun" marker is an ASSUMED sign-midpoint, not a true position.
  const ASPECT_CAPTION = 'angles true (geocentric) · distances schematic';
  const SIGN_ABBR = ['Ar', 'Ta', 'Ge', 'Cn', 'Le', 'Vi', 'Li', 'Sc', 'Sg', 'Cp', 'Aq', 'Pi'];

  // The julian day focusAspect uses — the SAME one the daily reading / date UI uses:
  // baseJd + dayOffset + scrollBias (current scene time). Kept in one place so the
  // headless geometry assertion can reproduce the exact jd.
  function currentAspectJd() { return baseJd + dayOffset + scrollBias; }

  // True aspect separation in [0,180] from two ecliptic longitudes (degrees).
  function angularSeparation(lonA, lonB) {
    let d = Math.abs(lonA - lonB) % 360;
    if (d > 180) d = 360 - d;
    return d;
  }

  // Small engraved-brass canvas-texture label sprite (mirrors makeLabel's styling but
  // parameterised for size/colour so the aspect layer reads on the ring). Returns a
  // THREE.Sprite; caller sets .position + .scale via userData.aspectRatio.
  function makeAspectLabel(text, opts) {
    opts = opts || {};
    const font = opts.font || 30;
    const col = opts.color || 'rgba(236,230,216,0.96)';   // parchment
    const pad = 10;
    const c = document.createElement('canvas');
    const x = c.getContext('2d');
    x.font = `600 ${font}px Cinzel, Inter, system-ui, sans-serif`;
    const w = Math.ceil(x.measureText(text).width) + pad * 2;
    c.width = w; c.height = font + pad * 2;
    x.font = `600 ${font}px Cinzel, Inter, system-ui, sans-serif`;
    x.fillStyle = col; x.textBaseline = 'middle'; x.textAlign = 'center';
    x.shadowColor = 'rgba(0,0,0,0.85)'; x.shadowBlur = 10;
    x.fillText(text, c.width / 2, c.height / 2);
    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, opacity: 0 }));
    const aspectRatio = c.width / c.height;
    sp.userData.aspectRatio = aspectRatio;
    sp.userData.baseH = opts.baseH || 0.9;
    sp.scale.set(sp.userData.baseH * aspectRatio, sp.userData.baseH, 1);
    return sp;
  }

  // A small glowing marker disc (a Sprite) placed on the ring at a body's longitude.
  function makeAspectMarker(hex, size) {
    const S = 64, c = document.createElement('canvas'); c.width = S; c.height = S;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(S / 2, S / 2, 1, S / 2, S / 2, S / 2);
    const col = '#' + hex.toString(16).padStart(6, '0');
    grad.addColorStop(0, col);
    grad.addColorStop(0.42, col);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad; g.beginPath(); g.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2); g.fill();
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthTest: false, depthWrite: false, opacity: 0 }));
    const s = size || 0.9;
    sp.userData.baseS = s;
    sp.scale.set(s, s, 1);
    return sp;
  }

  // Dispose the aspect group and every geometry/material/texture it owns, then detach.
  function disposeAspectView() {
    if (!aspectGroup) return;
    scene.remove(aspectGroup);
    aspectGroup.traverse((o) => {
      if (o.geometry) { try { o.geometry.dispose(); } catch (e) {} }
      const m = o.material;
      if (m) {
        const mats = Array.isArray(m) ? m : [m];
        mats.forEach((mm) => {
          if (mm.map) { try { mm.map.dispose(); } catch (e) {} }
          try { mm.dispose(); } catch (e) {}
        });
      }
    });
    aspectGroup = null;
    aspectData = null;
  }

  // Build the Earth-centred zodiac ring + two true-longitude markers + the aspect chord
  // + engraved labels + honesty caption. Everything lives under aspectGroup, centred on
  // Earth's CURRENT scene position (the ring rides with Earth's tiny hero motion).
  //
  // GEOMETRY HONESTY: marker positions come ONLY from geocentric ecliptic longitude
  // (aLon, bLon) via scenePos(R,lon,0). The chord is drawn between those two ring
  // markers, so the angle it subtends at Earth IS angularSeparation(aLon,bLon).
  function buildAspectView(idA, idB, aLon, bLon, angle, aspect, bLabel, solar, natal) {
    disposeAspectView();
    const R = ASPECT_RING_R;
    const grp = new THREE.Group();
    grp.renderOrder = 20;

    // Ring centre = Earth's scene position (Earth-centred ecliptic). Falls back to origin.
    const centre = new THREE.Vector3();
    earthTargetVec(centre);
    grp.position.copy(centre);

    const brass = 0xC2A05E;

    // 1) The 360° zodiac circle — brass hairline, low opacity.
    const ringPts = [];
    for (let d = 0; d <= 360; d += 2) ringPts.push(scenePos(R, d, 0));
    const ringGeo = new THREE.BufferGeometry().setFromPoints(ringPts);
    const ringMat = new THREE.LineBasicMaterial({ color: brass, transparent: true, opacity: 0, depthTest: false, depthWrite: false });
    const ring = new THREE.Line(ringGeo, ringMat);
    ring.userData.baseOpacity = 0.34;
    grp.add(ring);

    // 2) Twelve sign-boundary ticks (every 30°) as short radial segments.
    const tickPts = [];
    for (let s = 0; s < 12; s++) {
      const lon = s * 30;
      tickPts.push(scenePos(R * 0.955, lon, 0));
      tickPts.push(scenePos(R * 1.045, lon, 0));
    }
    const tickGeo = new THREE.BufferGeometry().setFromPoints(tickPts);
    const tickMat = new THREE.LineBasicMaterial({ color: brass, transparent: true, opacity: 0, depthTest: false, depthWrite: false });
    const ticks = new THREE.LineSegments(tickGeo, tickMat);
    ticks.userData.baseOpacity = 0.5;
    grp.add(ticks);

    // 3) Sign abbreviations at each sign's midpoint (engraved, faint).
    const signSprites = [];
    for (let s = 0; s < 12; s++) {
      const lon = s * 30 + 15;
      const lab = makeAspectLabel(SIGN_ABBR[s], { font: 22, baseH: 0.62, color: 'rgba(194,160,94,0.9)' });
      lab.position.copy(scenePos(R * 1.14, lon, 0));
      lab.userData.baseOpacity = 0.62;
      grp.add(lab); signSprites.push(lab);
    }

    // 4) The aspect chord — a straight brass line between the two true-longitude markers.
    const mA = scenePos(R, aLon, 0);
    const mB = scenePos(R, bLon, 0);
    const chordGeo = new THREE.BufferGeometry().setFromPoints([mA, mB]);
    const chordMat = new THREE.LineBasicMaterial({ color: 0xCDAE6A, transparent: true, opacity: 0, depthTest: false, depthWrite: false });
    const chord = new THREE.Line(chordGeo, chordMat);
    chord.userData.baseOpacity = 0.85;
    grp.add(chord);

    // 4b) A faint arc hugging the ring between the two markers (shows the swept angle).
    const arcPts = [];
    // sweep the SHORT way from aLon toward bLon across `angle` degrees
    let delta = ((bLon - aLon) % 360 + 360) % 360;
    if (delta > 180) delta -= 360;        // signed shortest sweep, |delta| === angle
    const steps = Math.max(2, Math.round(Math.abs(delta)));
    for (let i = 0; i <= steps; i++) {
      const lon = aLon + delta * (i / steps);
      arcPts.push(scenePos(R * 1.0, lon, 0));
    }
    const arcGeo = new THREE.BufferGeometry().setFromPoints(arcPts);
    const arcMat = new THREE.LineBasicMaterial({ color: 0xD8B978, transparent: true, opacity: 0, depthTest: false, depthWrite: false });
    const arc = new THREE.Line(arcGeo, arcMat);
    arc.userData.baseOpacity = 0.7;
    grp.add(arc);

    // 5) The two body markers at their TRUE longitudes.
    const markerA = makeAspectMarker(0xCDAE6A, 0.95);
    markerA.position.copy(mA);
    markerA.userData.baseOpacity = 1;
    grp.add(markerA);
    const markerB = makeAspectMarker(solar ? 0x9ED1E8 : 0xECE6D8, 0.85);
    markerB.position.copy(mB);
    markerB.userData.baseOpacity = 1;
    grp.add(markerB);

    // 6) Engraved labels: planet names by their markers.
    const nameA = (CAP[idA] || idA);
    const labA = makeAspectLabel(nameA, { font: 30, baseH: 0.95 });
    labA.position.copy(scenePos(R * 0.8, aLon, 0));
    labA.userData.baseOpacity = 0.98;
    grp.add(labA);

    const nameB = bLabel || (CAP[idB] || idB) + (solar ? ' · solar chart' : '');
    const labB = makeAspectLabel(nameB, { font: 26, baseH: 0.82, color: solar ? 'rgba(158,209,232,0.96)' : 'rgba(236,230,216,0.96)' });
    labB.position.copy(scenePos(R * 0.8, bLon, 0));
    labB.userData.baseOpacity = 0.96;
    grp.add(labB);

    // 7) The aspect + REAL computed angle, centred on the chord midpoint.
    const aspName = aspect ? (aspect.charAt(0).toUpperCase() + aspect.slice(1)) : 'separation';
    const angLabel = makeAspectLabel(`${aspName} · ${Math.round(angle)}°`, { font: 32, baseH: 1.05, color: 'rgba(216,185,120,0.98)' });
    const mid = mA.clone().add(mB).multiplyScalar(0.5);
    angLabel.position.copy(mid);
    angLabel.userData.baseOpacity = 1;
    grp.add(angLabel);

    // 8) The honesty caption, engraved BELOW the ring (south point, pushed out + down).
    const capText = ASPECT_CAPTION
      + (solar ? '  ·  (solar chart: Sun = assumed sign-midpoint)'
        : natal ? '  ·  (natal: position computed from your saved chart)' : '');
    const cap = makeAspectLabel(capText, { font: 22, baseH: 0.66, color: 'rgba(236,230,216,0.82)' });
    cap.position.copy(scenePos(R * 1.3, 270, 0));
    cap.position.y -= 0.4;
    cap.userData.baseOpacity = 0.85;
    grp.add(cap);

    scene.add(grp);
    aspectGroup = grp;
    aspectData = { idA, idB, aLon, bLon, angle, aspect, ringR: R, centre };
    return grp;
  }

  // Per-frame driver: gentle fade-in, slow marker pulse, keep the group centred on
  // Earth, sprite-scale the labels for legibility, and auto-retire after ~9s. Called
  // from frameBody alongside updateFocusHighlight. All motion is SLOW (eye-comfort).
  function updateAspectView(t) {
    if (!aspectActive || !aspectGroup) return;
    if (t >= aspectUntil) { clearAspect(); return; }
    // fade-in over 900ms, fade-out over the last 900ms
    const inA = Math.min(1, (t - aspectStart) / 900);
    const outA = Math.min(1, (aspectUntil - t) / 900);
    const alpha = Math.max(0, Math.min(inA, outA));
    // keep the ring centred on Earth as it drifts in the hero rest frame
    if (aspectData && aspectData.centre) {
      earthTargetVec(aspectData.centre);
      aspectGroup.position.copy(aspectData.centre);
    }
    const pulse = 0.72 + 0.28 * Math.sin(t * 0.0016);   // slow, calm
    aspectGroup.traverse((o) => {
      if (!o.material) return;
      const base = o.userData.baseOpacity;
      if (base == null) return;
      // markers pulse gently; everything else is steady
      const isMarker = o.isSprite && o.userData.baseS != null;
      const mul = isMarker ? (0.78 + pulse * 0.22) : 1;
      o.material.opacity = base * alpha * mul;
      if (isMarker) {
        const s = o.userData.baseS * (0.96 + pulse * 0.08);
        o.scale.set(s, s, 1);
      }
    });
    // label sprites: scale with camera distance so text stays readable (like makeLabel)
    if (camera) {
      aspectGroup.traverse((o) => {
        if (!o.isSprite || o.userData.aspectRatio == null) return;
        const wp = new THREE.Vector3(); o.getWorldPosition(wp);
        const d = camera.position.distanceTo(wp);
        const h = Math.max(0.5, d * 0.03) * o.userData.baseH;
        o.scale.set(h * o.userData.aspectRatio, h, 1);
      });
    }
  }

  // Frame a gentle top-down-ish view where the whole zodiac ring + both markers read.
  // Reuses the scale-animation machinery (no jump). Targets Earth; pulls the camera out
  // to comfortably contain ASPECT_RING_R and lifts elevation to look onto the ecliptic.
  function frameAspectCamera() {
    userTouched = performance.now();
    introActive = false;
    syncPreloaderIntroClass(false);
    syncHeroReplayClass(false);
    daysPerSec = 0;
    flicking = false;
    scrollDriveLocked = true;
    focusFrameId = 'aspect';   // owns camera framing; released on clearAspect / scale change
    moonFrameActive = false;

    const prevLevel = scaleLevel;
    scaleLevel = 0;
    scaleAnimFromLevel = prevLevel;
    scaleAnimToLevel = 0;
    updateScaleHUD();
    updateScaleVisuals(0);

    scaleAnimFrom.radius = camRadius;
    scaleAnimFrom.el = camEl;
    scaleAnimFrom.az = camAz;
    scaleAnimFrom.tx = camTarget.x; scaleAnimFrom.ty = camTarget.y; scaleAnimFrom.tz = camTarget.z;

    const ep = new THREE.Vector3(); earthTargetVec(ep);
    scaleAnimTo.tx = ep.x; scaleAnimTo.ty = ep.y; scaleAnimTo.tz = ep.z;
    scaleAnimTo.radius = ASPECT_RING_R * 3.1;   // contain the ring + caption
    scaleAnimTo.el = 58 * D2R;                    // look down onto the ecliptic plane
    let azD = (-0.6) - camAz;
    azD = Math.atan2(Math.sin(azD), Math.cos(azD));
    scaleAnimTo.az = camAz + azD;
    scaleAnimActive = true;
    scaleAnimStart = performance.now();
    camera.fov = CAM_FOV_MID;
    camera.updateProjectionMatrix();
  }

  // PUBLIC: focusAspect — draw a named transit HONESTLY on the geocentric zodiac ring.
  function focusAspect(idA, idB, opts) {
    try {
      opts = opts || {};
      idA = String(idA || '').toLowerCase();
      idB = String(idB || 'sun').toLowerCase();
      const E = window.AstroEphemeris;
      // Degrade gracefully: no ephemeris → fall back to the timed focus highlight.
      if (!E || destroyed || !scene) {
        try { if (idA) focusPlanet(idA); } catch (e) {}
        return false;
      }
      if (!allPlanetsBuilt) {
        try { buildRemainingPlanets(); needRecompute = true; updatePositions(); } catch (e) {}
      }

      const jd = currentAspectJd();
      // TRUE geocentric ecliptic longitude of the transiting body (never a scene angle).
      const aLon = norm360(geoLonOf(idA, jd));
      // idB marker: an explicit bLon (a solar-chart sign-midpoint or a natal
      // chart's REAL computed longitude) overrides the true geocentric longitude of idB.
      let bLon;
      const solar = opts.natalMode === 'solar';
      const natal = opts.natalMode === 'natal';
      const bOverride = typeof opts.bLon === 'number' && isFinite(opts.bLon);
      if (bOverride) {
        bLon = norm360(opts.bLon);
      } else {
        const raw = geoLonOf(idB, jd);
        bLon = raw == null ? 0 : norm360(raw);
      }
      // The REAL computed separation, rounded to whole degrees for the engraved label
      // and the verification stash (astrologers quote transits to the degree). The raw
      // float is preserved as angleRaw for anyone who wants sub-degree precision.
      const angleRaw = angularSeparation(aLon, bLon);
      const angle = Math.round(angleRaw);

      buildAspectView(idA, idB, aLon, bLon, angle, opts.aspect, opts.bLabel, solar, natal);
      setFocusHighlight(idA);           // brass ring on the transiting body...
      // ...and a parallel brass ring on idB — but ONLY when the marker really is
      // idB's live geocentric position. When bLon is overridden (solar midpoint
      // or natal chart point) the live mesh is NOT the aspect partner, so
      // ringing it would be dishonest.
      if (!bOverride && meshes[idB]) {
        const g2 = meshes[idB];
        const ring2 = ensureFocusRing(g2, (BODIES.find((b) => b.id === idB) || { size: 0.6 }).size * 3.8);
        ring2.visible = true;
        g2.userData._aspectRing = ring2;
      } else if ((idB === 'sun') && !bOverride && sunMesh) {
        sunFocusRing = sunFocusRing || ensureFocusRing(sunMesh, SUN_SIZE * 6.5);
        sunFocusRing.visible = true;
      }

      aspectActive = true;
      aspectStart = performance.now();
      aspectUntil = aspectStart + 9000;    // auto-retire ~9s (parallels focusPlanet)
      frameAspectCamera();

      // Verification hook — stash the values actually placed on the ring.
      window.__apLastAspect = {
        idA, idB, aLon, bLon, angle, angleRaw, aspect: opts.aspect || null, jd,
        bLabel: opts.bLabel || null, natalMode: opts.natalMode || null,
      };
      return true;
    } catch (err) {
      console.warn('[orrery] focusAspect failed — degrading to focusPlanet:', err);
      try { disposeAspectView(); if (idA) focusPlanet(idA); } catch (e) {}
      return false;
    }
  }

  // PUBLIC: clearAspect — retire the ring/markers/caption + brass rings, return to hero.
  function clearAspect() {
    if (!aspectActive && !aspectGroup) return;
    aspectActive = false;
    aspectUntil = 0;
    disposeAspectView();
    clearFocusHighlight();
    // release framing ownership and ease back to the hero rest frame
    if (focusFrameId === 'aspect') focusFrameId = null;
    if (!destroyed && scene) {
      try { applyScalePreset(0, true); } catch (e) {}
    }
    delete window.__apLastAspect;
  }

  function destroy() {
    destroyed = true; if (raf) cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    if (canvas && canvas._orreryHandlers) { window.removeEventListener('pointermove', canvas._orreryHandlers.onMove); window.removeEventListener('pointerup', canvas._orreryHandlers.onUp); }
    if (canvas && canvas._orreryKeyHandler) canvas.removeEventListener('keydown', canvas._orreryKeyHandler);
    if (canvas && canvas._orreryDblHandler) canvas.removeEventListener('dblclick', canvas._orreryDblHandler);
    if (canvas && canvas._orreryCtxHandler) canvas.removeEventListener('contextmenu', canvas._orreryCtxHandler);
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
    setDetailLighting,
    getDetailLighting() { return wantsDetailLighting(); },
    getDetailLightingMode() {
      return detailLightingUser === null ? 'auto' : detailLightingUser ? 'on' : 'off';
    },
    get onPlanetClick() { return onPlanetClick; },
    set onPlanetClick(fn) { onPlanetClick = fn; },
    startIntro: restartIntro,
    restartIntro,
    clearPreloaderCosmic() {
      preloaderCosmicJourney = false;
      disposePreloaderComets();
      syncPreloaderCosmicClass(false);
      try {
        const pre = document.getElementById('preloader');
        if (pre) pre.classList.remove('preloader--earth-land');
      } catch (_) {}
    },
    startPreloaderIntro(fn) {
      if (onPreloaderStage()) {
        preloaderIntroScheduled = true;
        preloaderIntroFinished = false;
      }
      onIntroDone = fn || null;
      restartIntro();
    },
    skipIntro,
    settleFromIntro,
    setNarrate(on) {
      narrateJourney = !!on && !PRM;
      try { localStorage.setItem('ap_narrate_journey', narrateJourney ? '1' : '0'); } catch (e) {}
      try { updateIntroProgress(lastIntroP); } catch (e) {}
      try { const pre = document.getElementById('preloader'); if (pre) pre.classList.toggle('preloader--narrate', narrateJourney); } catch (e) {}
    },
    isIntroActive() { return introActive || preloaderCosmicJourney; },
    isIntroPending() {
      return onPreloaderStage() && !preloaderIntroFinished
        && (preloaderIntroScheduled || introActive || preloaderCosmicJourney);
    },
    hasIntroCompleted() {
      return !onPreloaderStage() || preloaderIntroFinished;
    },
    getIntroStartedAt() { return introStartedAt; },
    getIntroDurationMs() { return introDurationMs(); },
    getIntroProgress() {
      if (preloaderIntroScheduled) return 0;
      if ((introActive || preloaderCosmicJourney) && introStart > 0) {
        const dur = onPreloaderStage() ? preloaderCosmicDurationMs() : introDurationMs();
        return Math.min(1, (performance.now() - introStart) / dur);
      }
      return (onPreloaderStage() && !preloaderIntroFinished) ? 0 : 1;
    },
    whenReady() { return texturesReady ? Promise.resolve() : texturesReadyPromise; },
    whenEarthReady() { return earthMapReady ? Promise.resolve() : earthMapReadyPromise; },
    getScaleLevel() { return scaleLevel; },
    setScaleLevel(n) { applyScalePreset(n, true); },
    startScaleJourney,
    cancelScaleJourney,
    startCosmicFlight,
    cancelCosmicFlight,
    startSpaceFlight,
    cancelSpaceFlight,
    isCosmicFlightActive() { return cosmicFlightToolActive; },
    isSpaceFlightActive() { return spaceFlightToolActive; },
    isJourneyActive() { return journeyActive || preloaderCosmicJourney || masterclassIntroActive; },
    focusPlanet,
    focusAspect,
    clearAspect,
    enterPortrait,
    exitPortrait,
    isPortraitMode() { return portraitMode; },
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
        applyCamera();
        // Portrait stills must be TRUE-transparent for compositing behind engraved
        // frames. The bloom/OutputPass composer bakes a constant background alpha
        // (~92) across the frame, so portrait mode renders straight through the
        // renderer (setClearColor 0,0 + premultiplied alpha → genuine alpha-0 void).
        if (composer && !portraitMode) {
          composer.setPixelRatio(exportDpr);
          composer.setSize(cssW, cssH);
          composer.render();
        } else {
          renderer.render(scene, camera);
        }
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
