import * as THREE from 'three';
import {
  EVENT_MS,
  RANGE_START_MS,
  RANGE_END_MS,
  computeEclipseGeometry,
} from './ap-eclipse-geometry-v834.js';
const EARTH_POS = new THREE.Vector3(8, 0, 0);
const SUN_POS = new THREE.Vector3(-11, 0, 0);
const MOON_SCENE_DISTANCE = 5.5;
// NASA's published global eclipse window, replayed as real computed instants.
const PASSAGE_START_MS = Date.UTC(2026, 7, 12, 15, 34, 0);
const PASSAGE_END_MS = Date.UTC(2026, 7, 12, 20, 57, 0);
const PASSAGE_DURATION_MS = 14000;
const LENS_KEYS = new Set(['system', 'shadow', 'earth']);
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const Z_AXIS = new THREE.Vector3(0, 0, 1);
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const rad = (d) => d * Math.PI / 180;

function webglAvailable() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return false;
    const lose = gl.getExtension && gl.getExtension('WEBGL_lose_context');
    if (lose && lose.loseContext) lose.loseContext();
    return true;
  } catch (err) {
    return false;
  }
}

function waitForEphemeris(limit = 100) {
  return new Promise((resolve, reject) => {
    let tries = 0;
    const check = () => {
      const E = window.AstroEphemeris;
      if (E && E.julianDay && E.sunPosition && E.moonPosition) {
        resolve(E);
        return;
      }
      tries += 1;
      if (tries >= limit) {
        reject(new Error('Sun and Moon ephemeris did not load'));
        return;
      }
      setTimeout(check, 50);
    };
    check();
  });
}


function formatUtc(date) {
  return `${date.toISOString().slice(0, 16).replace('T', ' · ')} UTC`;
}

function formatDistance(km) {
  return km >= 1000000
    ? `${(km / 1000000).toFixed(2)}m km`
    : `${Math.round(km).toLocaleString('en-GB')} km`;
}

function makeSunMaterial(reducedMotion) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uMotion: { value: reducedMotion ? 0 : 1 } },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormalW;
      void main() {
        vUv = uv;
        vNormalW = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      precision highp float;
      uniform float uTime;
      uniform float uMotion;
      varying vec2 vUv;
      varying vec3 vNormalW;
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
      }
      void main() {
        float t = uTime * uMotion;
        vec2 p = vec2(vUv.x * 18.0 + t * 0.018, vUv.y * 9.0 - t * 0.011);
        float granule = noise(p) * 0.62 + noise(p * 2.7 + 4.3) * 0.24 + noise(p * 6.0) * 0.14;
        float limb = pow(clamp(abs(vNormalW.z), 0.0, 1.0), 0.32);
        vec3 amber = vec3(1.0, 0.29, 0.055);
        vec3 gold = vec3(1.0, 0.71, 0.26);
        vec3 cream = vec3(1.0, 0.93, 0.69);
        vec3 col = mix(amber, gold, smoothstep(0.22, 0.74, granule));
        col = mix(col, cream, smoothstep(0.67, 0.96, granule));
        col *= 0.72 + limb * 0.52;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}

function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(128, 128, 18, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,244,205,.78)');
  g.addColorStop(.18, 'rgba(255,158,54,.35)');
  g.addColorStop(.52, 'rgba(255,90,31,.11)');
  g.addColorStop(1, 'rgba(255,90,31,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function makeStars() {
  const random = seededRandom(120826);
  const count = 700;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const color = new THREE.Color();
  for (let i = 0; i < count; i += 1) {
    const radius = 42 + random() * 38;
    const theta = random() * Math.PI * 2;
    const y = (random() * 2 - 1) * 0.82;
    const planar = Math.sqrt(1 - y * y);
    positions[i * 3] = Math.cos(theta) * planar * radius;
    positions[i * 3 + 1] = y * radius;
    positions[i * 3 + 2] = Math.sin(theta) * planar * radius;
    color.setHSL(0.09 + random() * 0.08, 0.18 + random() * 0.18, 0.56 + random() * 0.34);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return new THREE.Points(geometry, new THREE.PointsMaterial({
    size: 0.055,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
  }));
}

function makeGuideLine(points, color, opacity, dashed = false) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = dashed
    ? new THREE.LineDashedMaterial({ color, transparent: true, opacity, dashSize: .24, gapSize: .18 })
    : new THREE.LineBasicMaterial({ color, transparent: true, opacity });
  const line = new THREE.Line(geometry, material);
  if (dashed) line.computeLineDistances();
  return line;
}

function makeVolumeGeometry(segments = 48) {
  const positions = new Float32Array((segments + 1) * 2 * 3);
  const indices = [];
  for (let i = 0; i < segments; i += 1) {
    const lower = i * 2;
    const upper = lower + 1;
    const nextLower = lower + 2;
    const nextUpper = lower + 3;
    indices.push(lower, nextLower, upper, nextLower, nextUpper, upper);
  }
  const geometry = new THREE.BufferGeometry();
  const attribute = new THREE.BufferAttribute(positions, 3);
  attribute.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('position', attribute);
  geometry.setIndex(indices);
  geometry.userData.segments = segments;
  return geometry;
}

function updateVolumeGeometry(geometry, length, nearRadius, farRadius) {
  const positions = geometry.attributes.position.array;
  const segments = geometry.userData.segments || 48;
  for (let i = 0; i <= segments; i += 1) {
    const angle = i / segments * Math.PI * 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const offset = i * 6;
    positions[offset] = cos * nearRadius;
    positions[offset + 1] = -length * .5;
    positions[offset + 2] = sin * nearRadius;
    positions[offset + 3] = cos * farRadius;
    positions[offset + 4] = length * .5;
    positions[offset + 5] = sin * farRadius;
  }
  geometry.attributes.position.needsUpdate = true;
  geometry.computeBoundingSphere();
}

async function mount(root, E) {
  const canvas = root.querySelector('.ap-eclipse-live__canvas');
  const stage = root.querySelector('.ap-eclipse-live__stage');
  const fallback = root.querySelector('.ap-eclipse-live__fallback');
  const range = root.querySelector('[data-eclipse-range]');
  const nowButton = root.querySelector('[data-eclipse-now]');
  const eventButton = root.querySelector('[data-eclipse-event]');
  const playButton = root.querySelector('[data-eclipse-play]');
  const launchPlayButtons = Array.from(document.querySelectorAll('[data-eclipse-play-launch]'));
  const shareButton = root.querySelector('[data-eclipse-share]');
  const shareStatusEl = root.querySelector('[data-eclipse-share-status]');
  const lensButtons = Array.from(root.querySelectorAll('[data-eclipse-lens]'));
  const modeEl = root.querySelector('[data-eclipse-mode]');
  const statusEl = root.querySelector('[data-eclipse-status]');
  const timeEl = root.querySelector('[data-eclipse-time]');
  const rangeTimeEl = root.querySelector('[data-eclipse-range-time]');
  const sepEl = root.querySelector('[data-eclipse-separation]');
  const moonDistanceEl = root.querySelector('[data-eclipse-moon-distance]');
  const shadowEl = root.querySelector('[data-eclipse-shadow-offset]');
  const ratioEl = root.querySelector('[data-eclipse-ratio]');
  const badgeEl = root.querySelector('[data-eclipse-badge]');
  const labelEls = {
    sun: root.querySelector('[data-eclipse-label="sun"]'),
    moon: root.querySelector('[data-eclipse-label="moon"]'),
    earth: root.querySelector('[data-eclipse-label="earth"]'),
  };

  if (!canvas || !stage || !range || !nowButton || !eventButton || !playButton || lensButtons.length !== 3) {
    throw new Error('Eclipse instrument controls are incomplete');
  }
  const instrumentControls = [range, nowButton, eventButton, playButton, shareButton, ...lensButtons, ...launchPlayButtons]
    .filter(Boolean);
  instrumentControls.forEach((control) => { control.disabled = true; });
  const reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const constrainedRender = (navigator.deviceMemory && navigator.deviceMemory <= 4)
    || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
  const interactionFrameMs = constrainedRender ? 30 : 16;
  const revealInstrument = () => {
    if (!window.matchMedia || !window.matchMedia('(max-width: 900px)').matches) return;
    requestAnimationFrame(() => stage.scrollIntoView({ block: 'start', behavior: reducedMotion ? 'auto' : 'smooth' }));
  };
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.16;
  renderer.setClearColor(0x030407, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, .05, 220);
  const cameraTarget = new THREE.Vector3(0, 0, 0);
  let mode = 'live';
  let displayDate = new Date();
  let state = null;
  let inView = true;
  let raf = 0;
  let lastFrameAt = 0;
  let loopRunning = false;
  let liveTimer = 0;
  let travelFrame = 0;
  let travelToken = 0;
  let passageFrame = 0;
  let passageToken = 0;
  let shareStatusTimer = 0;
  let failed = false;
  let disposed = false;
  let cameraRadius = 25;
  let cameraAzimuth = .2;
  let cameraElevation = .29;
  let cameraFrame = 0;
  let activeLens = 'system';
  const applyCamera = () => {
    const c = Math.cos(cameraElevation);
    camera.position.set(
      cameraTarget.x + Math.cos(cameraAzimuth) * c * cameraRadius,
      cameraTarget.y + Math.sin(cameraElevation) * cameraRadius,
      cameraTarget.z + Math.sin(cameraAzimuth) * c * cameraRadius
    );
    camera.lookAt(cameraTarget);
  };
  applyCamera();

  scene.add(makeStars());
  scene.add(new THREE.HemisphereLight(0x8193b3, 0x09070a, .82));
  const sunlight = new THREE.PointLight(0xffd19a, 44, 70, 1.65);
  sunlight.position.copy(SUN_POS);
  scene.add(sunlight);

  const sunMaterial = makeSunMaterial(reducedMotion);
  const sun = new THREE.Mesh(new THREE.SphereGeometry(2.25, 96, 96), sunMaterial);
  sun.position.copy(SUN_POS);
  scene.add(sun);
  const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture(),
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    opacity: .78,
  }));
  sunGlow.scale.set(8.8, 8.8, 1);
  sun.add(sunGlow);

  const textureLoader = new THREE.TextureLoader();
  const maxAnisotropy = renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 1;
  const prepareTexture = (texture, srgb = true) => {
    texture.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    texture.anisotropy = Math.min(maxAnisotropy, 8);
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    return texture;
  };
  const loadTexture = (url, srgb = true, fallbackUrl = '') => new Promise((resolve) => {
    const attempt = (candidate, mayFallback) => {
      textureLoader.load(candidate, (texture) => resolve(prepareTexture(texture, srgb)), undefined, () => {
        if (mayFallback && fallbackUrl) attempt(fallbackUrl, false);
        else resolve(null);
      });
    };
    attempt(url, true);
  });

  const earthMaterial = new THREE.MeshStandardMaterial({
    color: 0x346a94,
    roughness: .78,
    metalness: .02,
  });
  const earth = new THREE.Mesh(new THREE.SphereGeometry(1.06, 96, 96), earthMaterial);
  earth.position.copy(EARTH_POS);
  scene.add(earth);
  const earthMapReady = loadTexture('./assets/textures/earth.webp', true, './assets/textures/earth_sm.webp').then((texture) => {
    if (!texture) return;
    if (disposed || failed) { texture.dispose(); return; }
    earthMaterial.map = texture;
    earthMaterial.color.set(0xffffff);
    earthMaterial.needsUpdate = true;
  });
  const earthReliefReady = loadTexture('./assets/textures/earth_normal.webp', false, './assets/textures/earth_normal_sm.webp').then((texture) => {
    if (!texture) return;
    if (disposed || failed) { texture.dispose(); return; }
    earthMaterial.normalMap = texture;
    earthMaterial.normalScale = new THREE.Vector2(.52, .52);
    earthMaterial.needsUpdate = true;
  });
  const earthAtmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(1.095, 64, 64),
    new THREE.MeshBasicMaterial({
      color: 0x6aa8dc,
      transparent: true,
      opacity: .17,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  earth.add(earthAtmosphere);
  const cloudsMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    roughness: 1,
  });
  const clouds = new THREE.Mesh(new THREE.SphereGeometry(1.075, 72, 72), cloudsMaterial);
  earth.add(clouds);
  const cloudMapReady = loadTexture('./assets/textures/earth_clouds.webp', true, './assets/textures/earth_clouds_sm.webp').then((texture) => {
    if (!texture) return;
    if (disposed || failed) { texture.dispose(); return; }
    cloudsMaterial.map = texture;
    cloudsMaterial.alphaMap = texture;
    cloudsMaterial.opacity = .68;
    cloudsMaterial.needsUpdate = true;
  });

  const moonMaterial = new THREE.MeshStandardMaterial({
    color: 0xc8c6c2,
    roughness: .96,
    metalness: 0,
  });
  const moon = new THREE.Mesh(new THREE.SphereGeometry(.48, 80, 80), moonMaterial);
  scene.add(moon);
  const moonMapReady = loadTexture('./assets/textures/moon.webp', true, './assets/textures/moon_sm.webp').then((texture) => {
    if (!texture) return;
    if (disposed || failed) { texture.dispose(); return; }
    const bumpTexture = texture.clone();
    bumpTexture.colorSpace = THREE.NoColorSpace;
    bumpTexture.needsUpdate = true;
    moonMaterial.map = texture;
    moonMaterial.bumpMap = bumpTexture;
    moonMaterial.bumpScale = .022;
    moonMaterial.color.set(0xffffff);
    moonMaterial.needsUpdate = true;
  });

  function lensPose(key) {
    if (key === 'earth') {
      return { target: EARTH_POS.clone(), radius: 5.3, azimuth: .78, elevation: .24 };
    }
    if (key === 'shadow') {
      return {
        target: new THREE.Vector3().lerpVectors(moon.position, EARTH_POS, .58),
        radius: 9.4,
        azimuth: .34,
        elevation: .25,
      };
    }
    return { target: new THREE.Vector3(0, 0, 0), radius: 25, azimuth: .2, elevation: .29 };
  }

  function syncLensControls() {
    root.dataset.view = activeLens;
    lensButtons.forEach((button) => {
      button.setAttribute('aria-pressed', button.dataset.eclipseLens === activeLens ? 'true' : 'false');
    });
  }

  function clampCameraRadius(value) {
    if (activeLens === 'earth') return clamp(value, 3.4, 12);
    if (activeLens === 'shadow') return clamp(value, 6.2, 20);
    return clamp(value, 16, 38);
  }
  function cancelCameraTravel() {
    if (cameraFrame) cancelAnimationFrame(cameraFrame);
    cameraFrame = 0;
  }

  function setLens(key, animate = true) {
    if (!LENS_KEYS.has(key) || failed || disposed) return;
    cancelCameraTravel();
    activeLens = key;
    syncLensControls();
    const next = lensPose(key);
    if (!animate || reducedMotion) {
      cameraTarget.copy(next.target);
      cameraRadius = next.radius;
      cameraAzimuth = next.azimuth;
      cameraElevation = next.elevation;
      applyCamera();
      render();
      return;
    }
    const fromTarget = cameraTarget.clone();
    const fromRadius = cameraRadius;
    const fromAzimuth = cameraAzimuth;
    const fromElevation = cameraElevation;
    const startedAt = performance.now();
    const step = (now) => {
      if (failed || disposed) return;
      const progress = clamp((now - startedAt) / 820, 0, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      cameraTarget.lerpVectors(fromTarget, next.target, eased);
      cameraRadius = fromRadius + (next.radius - fromRadius) * eased;
      cameraAzimuth = fromAzimuth + (next.azimuth - fromAzimuth) * eased;
      cameraElevation = fromElevation + (next.elevation - fromElevation) * eased;
      applyCamera();
      render(now);
      if (progress < 1) cameraFrame = requestAnimationFrame(step);
      else cameraFrame = 0;
    };
    cameraFrame = requestAnimationFrame(step);
  }

  lensButtons.forEach((button) => {
    button.addEventListener('click', () => {
      setLens(button.dataset.eclipseLens);
      revealInstrument();
    });
  });

  const moonOrbit = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(Array.from({ length: 128 }, (_, i) => {
      const a = i / 128 * Math.PI * 2;
      return new THREE.Vector3(
        EARTH_POS.x + Math.cos(a) * MOON_SCENE_DISTANCE,
        Math.sin(a) * .28,
        Math.sin(a) * MOON_SCENE_DISTANCE
      );
    })),
    new THREE.LineBasicMaterial({ color: 0xd8b46a, transparent: true, opacity: .12 })
  );
  scene.add(moonOrbit);
  scene.add(makeGuideLine([SUN_POS.clone(), EARTH_POS.clone()], 0xd8b46a, .16, true));

  const umbra = new THREE.Mesh(
    makeVolumeGeometry(48),
    new THREE.MeshBasicMaterial({
      color: 0x26384f,
      transparent: true,
      opacity: .28,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  const penumbra = new THREE.Mesh(
    makeVolumeGeometry(48),
    new THREE.MeshBasicMaterial({
      color: 0xd8b46a,
      transparent: true,
      opacity: .08,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  scene.add(penumbra, umbra);
  const shadowAxis = makeGuideLine([new THREE.Vector3(), new THREE.Vector3(1, 0, 0)], 0xb9c8dc, .48, true);
  scene.add(shadowAxis);
  const shadowIntercept = new THREE.Group();
  const shadowInterceptCore = new THREE.Mesh(
    new THREE.CircleGeometry(.10, 48),
    new THREE.MeshBasicMaterial({
      color: 0xff6428,
      transparent: true,
      opacity: .46,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  const shadowInterceptRing = new THREE.Mesh(
    new THREE.RingGeometry(.145, .205, 64),
    new THREE.MeshBasicMaterial({
      color: 0xf2ecdf,
      transparent: true,
      opacity: .72,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  shadowIntercept.add(shadowInterceptCore, shadowInterceptRing);
  shadowIntercept.visible = false;
  scene.add(shadowIntercept);

  function showUnavailable(err) {
    if (failed) return;
    failed = true;
    stopLoop();
    root.dataset.failed = 'true';
    root.removeAttribute('data-ready');
    instrumentControls.forEach((control) => { control.disabled = true; });
    if (fallback) {
      fallback.hidden = false;
      fallback.innerHTML = '<div><strong>Live eclipse geometry is unavailable on this device.</strong><br><span>Use the computed diagram below; the times and safety guidance remain available.</span></div>';
    }
    console.warn('[eclipse-live]', err && err.message ? err.message : err || 'renderer stopped');
    dispose();
  }

  function positionVolume(mesh, origin, direction, length, nearRadius, farRadius) {
    updateVolumeGeometry(mesh.geometry, length, nearRadius, farRadius);
    mesh.position.copy(origin).addScaledVector(direction, length * .5);
    mesh.quaternion.setFromUnitVectors(Y_AXIS, direction);
  }

  function computeGeometry(date) {
    const computed = computeEclipseGeometry(E, date);
    const moonDirection = new THREE.Vector3(
      -Math.cos(rad(computed.deltaLatDeg)) * Math.cos(rad(computed.deltaLonDeg)),
      Math.sin(rad(computed.deltaLatDeg)),
      Math.cos(rad(computed.deltaLatDeg)) * Math.sin(rad(computed.deltaLonDeg))
    ).normalize();
    moon.position.copy(EARTH_POS).addScaledVector(moonDirection, MOON_SCENE_DISTANCE);
    moon.lookAt(EARTH_POS);
    moon.rotateY(Math.PI * .5);
    if (!cameraFrame && activeLens === 'shadow') {
      cameraTarget.lerpVectors(moon.position, EARTH_POS, .58);
      applyCamera();
    }

    const lightAxisScene = moon.position.clone().sub(SUN_POS).normalize();
    const sceneUmbraLength = clamp(MOON_SCENE_DISTANCE * computed.umbraLengthKm / computed.moonDistanceKm, 3.8, 7.2);
    const scenePenumbraLength = MOON_SCENE_DISTANCE * 1.38;
    const scenePenumbraRadius = clamp(.72 + computed.penumbraRadiusAtEarthKm / 6371 * .72, .9, 1.75);
    positionVolume(umbra, moon.position, lightAxisScene, sceneUmbraLength, .45, .012);
    positionVolume(penumbra, moon.position, lightAxisScene, scenePenumbraLength, .52, scenePenumbraRadius);
    shadowAxis.geometry.setFromPoints([
      moon.position.clone(),
      moon.position.clone().addScaledVector(lightAxisScene, scenePenumbraLength + .8),
    ]);
    shadowAxis.computeLineDistances();

    // Mark the real geometric intercept only when the umbral axis reaches the
    // Earth sphere. This is an alignment marker, never a claimed ground-track map.
    shadowIntercept.visible = !!computed.umbraHits;
    if (shadowIntercept.visible) {
      const axisToEarth = EARTH_POS.clone().sub(moon.position).dot(lightAxisScene);
      const axisAtEarth = moon.position.clone().addScaledVector(lightAxisScene, axisToEarth);
      const lateral = axisAtEarth.clone().sub(EARTH_POS);
      const earthRadius = 1.06;
      const lateralSq = Math.min(lateral.lengthSq(), earthRadius * earthRadius * .985);
      const entryDepth = Math.sqrt(Math.max(.001, earthRadius * earthRadius - lateralSq));
      shadowIntercept.position.copy(axisAtEarth).addScaledVector(lightAxisScene, -entryDepth * 1.008);
      shadowIntercept.quaternion.setFromUnitVectors(Z_AXIS, lightAxisScene);
    }

    const gmst = E.greenwichSiderealTime ? E.greenwichSiderealTime(computed.jd) : (computed.jd * 360.985647) % 360;
    earth.rotation.y = rad(gmst + 90);
    clouds.rotation.y = rad(gmst + 93);
    return computed;
  }

  function statusFor(next) {
    if (next.umbraHits) return 'The umbra reaches Earth. Totality exists along a narrow track.';
    if (next.penumbraHits) return 'The penumbra reaches Earth. A partial eclipse is underway.';
    return next.date.getTime() < EVENT_MS
      ? 'The Moon’s shadow is closing on Earth.'
      : 'The Moon’s shadow has moved beyond Earth.';
  }

  function updateReadout() {
    if (!state) return;
    root.dataset.mode = mode === 'live' ? 'live' : 'event';
    root.dataset.separation = state.separationDeg.toFixed(4);
    root.dataset.shadowOffsetKm = Math.round(state.shadowMissKm);
    root.dataset.umbraHits = state.umbraHits ? 'true' : 'false';
    const modeLabel = mode === 'live' ? 'Live geocentric alignment'
      : mode === 'greatest' ? 'Greatest eclipse replay'
        : mode === 'passage' ? 'Shadow passage replay'
          : 'Timeline view';
    if (modeEl) modeEl.textContent = modeLabel;
    if (statusEl) statusEl.textContent = statusFor(state);
    if (timeEl) timeEl.textContent = `${formatUtc(state.date)} · Meeus Sun/Moon geometry`;
    if (rangeTimeEl) rangeTimeEl.textContent = formatUtc(state.date).replace(' · ', ' ');
    if (range) range.setAttribute('aria-valuetext', formatUtc(state.date));
    if (sepEl) sepEl.textContent = `${state.separationDeg.toFixed(3)}°`;
    if (moonDistanceEl) moonDistanceEl.textContent = formatDistance(state.moonDistanceKm);
    if (shadowEl) shadowEl.textContent = state.umbraHits ? 'Umbra intersects Earth' : formatDistance(state.shadowMissKm);
    if (ratioEl) ratioEl.textContent = `${state.apparentRatio.toFixed(3)}×`;
    if (badgeEl) {
      const badgeMode = root.dataset.ready === 'true'
        ? (mode === 'live' ? 'Live now' : 'Computed replay')
        : 'Settling 3D';
      badgeEl.textContent = `${badgeMode} · ${formatUtc(state.date)}`;
    }
    if (nowButton) nowButton.setAttribute('aria-pressed', mode === 'live' ? 'true' : 'false');
    if (eventButton) eventButton.setAttribute('aria-pressed', mode === 'greatest' ? 'true' : 'false');
    const playing = mode === 'passage';
    playButton.setAttribute('aria-pressed', playing ? 'true' : 'false');
    playButton.textContent = playing ? 'Pause shadow' : 'Play shadow';
    launchPlayButtons.forEach((button) => {
      button.setAttribute('aria-pressed', playing ? 'true' : 'false');
      button.textContent = playing ? 'Pause the 3D shadow' : 'Play the 3D shadow';
    });
  }

  function setDisplayDate(date, nextMode) {
    if (failed || disposed) return;
    displayDate = new Date(date);
    mode = nextMode;
    state = computeGeometry(displayDate);
    const rangeValue = clamp(Math.round((displayDate.getTime() - RANGE_START_MS) / 60000), 0, Number(range.max));
    range.value = String(rangeValue);
    updateReadout();
    render();
  }

  function cancelTravel() {
    travelToken += 1;
    if (travelFrame) cancelAnimationFrame(travelFrame);
    travelFrame = 0;
  }

  function travelToDate(date, nextMode) {
    const targetMs = new Date(date).getTime();
    if (!Number.isFinite(targetMs) || failed || disposed) return;
    cancelTravel();
    cancelPassage();
    if (reducedMotion) {
      setDisplayDate(new Date(targetMs), nextMode);
      return;
    }
    const fromMs = displayDate.getTime();
    const token = travelToken;
    const startedAt = performance.now();
    const duration = 760;
    let lastPaintAt = 0;
    const step = (now) => {
      if (token !== travelToken || failed || disposed) return;
      const progress = clamp((now - startedAt) / duration, 0, 1);
      // Smooth cubic time travel: every intermediate frame is still a real,
      // computed instant rather than an invented spatial tween.
      const eased = progress < .5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      if (progress >= 1 || now - lastPaintAt >= interactionFrameMs) {
        lastPaintAt = now;
        setDisplayDate(new Date(fromMs + (targetMs - fromMs) * eased), nextMode);
      }
      if (progress < 1) travelFrame = requestAnimationFrame(step);
      else travelFrame = 0;
    };
    travelFrame = requestAnimationFrame(step);
  }

  function cancelPassage() {
    passageToken += 1;
    if (passageFrame) cancelAnimationFrame(passageFrame);
    passageFrame = 0;
    if (mode === 'passage') {
      mode = 'timeline';
      updateReadout();
    }
  }

  function playPassage() {
    revealInstrument();
    if (passageFrame) {
      cancelPassage();
      return;
    }
    cancelTravel();
    if (reducedMotion) {
      setGreatest();
      return;
    }
    const token = ++passageToken;
    const startedAt = performance.now();
    let lastPaintAt = 0;
    mode = 'passage';
    updateReadout();
    setLens('shadow');
    const step = (now) => {
      if (token !== passageToken || failed || disposed) return;
      const progress = clamp((now - startedAt) / PASSAGE_DURATION_MS, 0, 1);
      if (progress >= 1 || now - lastPaintAt >= interactionFrameMs) {
        lastPaintAt = now;
        const moment = PASSAGE_START_MS + (PASSAGE_END_MS - PASSAGE_START_MS) * progress;
        setDisplayDate(new Date(moment), 'passage');
      }
      if (progress < 1) {
        passageFrame = requestAnimationFrame(step);
      } else {
        passageFrame = 0;
        setDisplayDate(new Date(PASSAGE_END_MS), 'timeline');
      }
    };
    passageFrame = requestAnimationFrame(step);
  }

  function setLive() {
    cancelPassage();
    setDisplayDate(new Date(), 'live');
  }
  function setGreatest() {
    cancelPassage();
    setDisplayDate(new Date(EVENT_MS), 'greatest');
  }

  range.min = '0';
  range.max = String(Math.round((RANGE_END_MS - RANGE_START_MS) / 60000));
  range.step = '1';
  let rangeFrame = 0;
  let pendingRangeMs = RANGE_START_MS;
  range.addEventListener('input', () => {
    cancelTravel();
    cancelPassage();
    pendingRangeMs = RANGE_START_MS + Number(range.value) * 60000;
    if (rangeFrame) return;
    rangeFrame = requestAnimationFrame(() => {
      rangeFrame = 0;
      setDisplayDate(new Date(pendingRangeMs), 'timeline');
    });
  });
  nowButton.addEventListener('click', () => {
    travelToDate(new Date(), 'live');
    revealInstrument();
  });
  eventButton.addEventListener('click', () => {
    travelToDate(new Date(EVENT_MS), 'greatest');
    revealInstrument();
  });
  playButton.addEventListener('click', playPassage);
  launchPlayButtons.forEach((button) => button.addEventListener('click', playPassage));
  range.addEventListener('change', revealInstrument);

  function setShareStatus(message) {
    if (!shareStatusEl) return;
    shareStatusEl.textContent = message;
    if (shareStatusTimer) clearTimeout(shareStatusTimer);
    shareStatusTimer = setTimeout(() => { shareStatusEl.textContent = ''; }, 4200);
  }

  async function shareMoment() {
    if (!state) return;
    const url = new URL(window.location.href);
    url.searchParams.delete('nosw');
    url.searchParams.set('moment', displayDate.toISOString());
    url.searchParams.set('lens', activeLens);
    url.hash = 'ap-eclipse-live';
    const title = 'The 12 August 2026 eclipse in 3D';
    const text = `Explore the computed Sun-Moon-Earth alignment at ${formatUtc(displayDate)}.`;
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url: url.toString() });
        setShareStatus('Moment shared');
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url.toString());
        setShareStatus('Link copied');
      } else {
        throw new Error('Clipboard unavailable');
      }
    } catch (err) {
      if (err && err.name === 'AbortError') return;
      setShareStatus('Could not share');
    }
  }

  if (shareButton) shareButton.addEventListener('click', shareMoment);

  function resize() {
    if (failed || disposed) return;
    const rect = stage.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    const phone = window.matchMedia && window.matchMedia('(max-width: 760px)').matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, phone && constrainedRender ? 1.5 : 2));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    render();
  }

  function updateLabels() {
    const rect = stage.getBoundingClientRect();
    const pairs = [['sun', sun], ['moon', moon], ['earth', earth]];
    pairs.forEach(([key, body]) => {
      const label = labelEls[key];
      if (!label) return;
      const p = body.position.clone().project(camera);
      const visible = p.z > -1 && p.z < 1 && Math.abs(p.x) <= 1.08 && Math.abs(p.y) <= 1.08;
      label.style.left = `${(p.x * .5 + .5) * rect.width}px`;
      label.style.top = `${(-p.y * .5 + .5) * rect.height}px`;
      label.hidden = !visible;
    });
  }

  function render(time = performance.now()) {
    if (!inView || failed || disposed) return;
    try {
      if (!reducedMotion) sunMaterial.uniforms.uTime.value = time * .001;
      if (shadowIntercept.visible) {
        const pulse = reducedMotion ? 1 : 1 + Math.sin(time * .004) * .08;
        shadowIntercept.scale.setScalar(pulse);
      }
      renderer.render(scene, camera);
      updateLabels();
    } catch (err) {
      showUnavailable(err);
    }
  }

  function renderStableFrames(count = 3) {
    return new Promise((resolve) => {
      let remaining = count;
      const step = (time) => {
        if (failed || disposed) { resolve(); return; }
        render(time);
        remaining -= 1;
        if (remaining > 0) requestAnimationFrame(step);
        else resolve();
      };
      requestAnimationFrame(step);
    });
  }

  let eventRenderFrame = 0;
  function scheduleRender() {
    if (loopRunning || eventRenderFrame || failed || disposed) return;
    eventRenderFrame = requestAnimationFrame((time) => {
      eventRenderFrame = 0;
      render(time);
    });
  }

  function frame(time) {
    if (!loopRunning) return;
    const frameMs = dragging ? interactionFrameMs : 33;
    if (time - lastFrameAt >= frameMs) {
      lastFrameAt = time;
      render(time);
    }
    raf = requestAnimationFrame(frame);
  }

  function startLoop() {
    if (failed || disposed || reducedMotion || loopRunning || document.hidden || !inView) return;
    loopRunning = true;
    raf = requestAnimationFrame(frame);
  }

  function stopLoop() {
    loopRunning = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let pinchDistance = 0;
  const activePointers = new Map();
  const distanceBetweenPointers = () => {
    const points = Array.from(activePointers.values());
    if (points.length < 2) return 0;
    return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
  };
  canvas.addEventListener('pointerdown', (event) => {
    cancelCameraTravel();
    activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (activePointers.size === 1) {
      dragging = true;
      lastX = event.clientX;
      lastY = event.clientY;
    } else {
      dragging = false;
      pinchDistance = distanceBetweenPointers();
    }
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!activePointers.has(event.pointerId)) return;
    activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (activePointers.size >= 2) {
      const nextDistance = distanceBetweenPointers();
      if (pinchDistance > 0 && nextDistance > 0) {
        cameraRadius = clampCameraRadius(cameraRadius * pinchDistance / nextDistance);
        applyCamera();
        scheduleRender();
      }
      pinchDistance = nextDistance;
      return;
    }
    if (!dragging) return;
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;
    cameraAzimuth -= dx * .006;
    cameraElevation = clamp(cameraElevation + dy * .0045, -.18, 1.05);
    applyCamera();
    scheduleRender();
  });
  const stopDrag = (event) => {
    activePointers.delete(event.pointerId);
    pinchDistance = 0;
    if (activePointers.size === 1) {
      const remaining = activePointers.values().next().value;
      dragging = true;
      lastX = remaining.x;
      lastY = remaining.y;
    } else dragging = false;
    try { canvas.releasePointerCapture(event.pointerId); } catch (err) { /* already released */ }
  };
  canvas.addEventListener('pointerup', stopDrag);
  canvas.addEventListener('pointercancel', stopDrag);
  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    cancelCameraTravel();
    cameraRadius = clampCameraRadius(cameraRadius * Math.exp(event.deltaY * .001));
    applyCamera();
    scheduleRender();
  }, { passive: false });
  canvas.addEventListener('keydown', (event) => {
    const key = event.key;
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', '_'].includes(key)) return;
    event.preventDefault();
    cancelCameraTravel();
    if (key === 'ArrowLeft') cameraAzimuth += .09;
    if (key === 'ArrowRight') cameraAzimuth -= .09;
    if (key === 'ArrowUp') cameraElevation = clamp(cameraElevation - .07, -.18, 1.05);
    if (key === 'ArrowDown') cameraElevation = clamp(cameraElevation + .07, -.18, 1.05);
    if (key === '+' || key === '=') cameraRadius = clampCameraRadius(cameraRadius * .9);
    if (key === '-' || key === '_') cameraRadius = clampCameraRadius(cameraRadius * 1.1);
    applyCamera();
    scheduleRender();
  });
  canvas.addEventListener('webglcontextlost', (event) => {
    try { event.preventDefault(); } catch (err) { /* context already gone */ }
    showUnavailable(new Error('WebGL context was lost'));
  }, false);

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(stage);
  const intersectionObserver = new IntersectionObserver((entries) => {
    inView = entries[0] ? entries[0].isIntersecting : true;
    if (inView) {
      render();
      startLoop();
    } else {
      stopLoop();
    }
  }, { rootMargin: '120px' });
  intersectionObserver.observe(root);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopLoop();
    else {
      render();
      startLoop();
    }
  });

  window.addEventListener('pagehide', (event) => {
    if (event.persisted) stopLoop();
    else dispose();
  });
  window.addEventListener('pageshow', (event) => {
    if (!event.persisted || failed || disposed || root.dataset.ready !== 'true') return;
    resize();
    if (mode === 'live') setLive();
    startLoop();
  });

  // Do not reveal a flat placeholder model or a half-composited WebGL frame.
  // Surfaces settle first, then three complete hidden frames warm the renderer;
  // only that stable buffer is made visible and allowed to say Live now.
  await Promise.allSettled([earthMapReady, earthReliefReady, cloudMapReady, moonMapReady]);
  if (failed || disposed) return;
  const sharedParams = new URLSearchParams(window.location.search);
  const sharedMoment = sharedParams.get('moment');
  const sharedMs = sharedMoment ? new Date(sharedMoment).getTime() : NaN;
  const sharedLens = sharedParams.get('lens');
  if (Number.isFinite(sharedMs) && sharedMs >= RANGE_START_MS && sharedMs <= RANGE_END_MS) {
    setDisplayDate(new Date(sharedMs), 'timeline');
  } else setLive();
  setLens(LENS_KEYS.has(sharedLens) ? sharedLens : 'system', false);
  resize();
  await renderStableFrames(3);
  if (failed || disposed) return;
  if (fallback) fallback.hidden = true;
  root.removeAttribute('data-failed');
  root.dataset.ready = 'true';
  updateReadout();
  startLoop();
  instrumentControls.forEach((control) => { control.disabled = false; });
  window.APEclipseLive = {
    setLive,
    setGreatest,
    playPassage,
    setLens,
    setDate: (value) => setDisplayDate(new Date(value), 'timeline'),
    getState: () => state && { ...state, date: new Date(state.date), mode, lens: activeLens },
  };
  document.dispatchEvent(new CustomEvent('ap-eclipse-live-ready', { detail: { state } }));

  liveTimer = setInterval(() => {
    if (mode === 'live' && !travelFrame) setLive();
  }, 30000);

  function dispose() {
    if (disposed) return;
    disposed = true;
    stopLoop();
    if (liveTimer) clearInterval(liveTimer);
    liveTimer = 0;
    cancelTravel();
    cancelPassage();
    cancelCameraTravel();
    if (shareStatusTimer) clearTimeout(shareStatusTimer);
    if (rangeFrame) cancelAnimationFrame(rangeFrame);
    rangeFrame = 0;
    if (eventRenderFrame) cancelAnimationFrame(eventRenderFrame);
    eventRenderFrame = 0;
    resizeObserver.disconnect();
    intersectionObserver.disconnect();
    scene.traverse((object) => {
      if (object.geometry && object.geometry.dispose) object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.filter(Boolean).forEach((material) => {
        Object.keys(material).forEach((key) => {
          const value = material[key];
          if (value && value.isTexture && value.dispose) value.dispose();
        });
        if (material.dispose) material.dispose();
      });
    });
    renderer.dispose();
    if (window.APEclipseLive && window.APEclipseLive.getState) delete window.APEclipseLive;
  }

}

async function boot() {
  const root = document.getElementById('ap-eclipse-live');
  if (!root) return;
  const fallback = root.querySelector('.ap-eclipse-live__fallback');
  try {
    if (!webglAvailable()) throw new Error('WebGL unavailable');
    const E = await waitForEphemeris();
    await mount(root, E);
  } catch (err) {
    root.dataset.failed = 'true';
    if (fallback) {
      fallback.hidden = false;
      fallback.innerHTML = '<div><strong>Live eclipse geometry is unavailable on this device.</strong><br><span>Use the computed diagram below; the times and safety guidance remain available.</span></div>';
    }
    console.warn('[eclipse-live]', err.message || err);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
