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
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const rad = (d) => d * Math.PI / 180;

function webglAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
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

function mount(root, E) {
  const canvas = root.querySelector('.ap-eclipse-live__canvas');
  const stage = root.querySelector('.ap-eclipse-live__stage');
  const fallback = root.querySelector('.ap-eclipse-live__fallback');
  const range = root.querySelector('[data-eclipse-range]');
  const nowButton = root.querySelector('[data-eclipse-now]');
  const eventButton = root.querySelector('[data-eclipse-event]');
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

  if (!canvas || !stage) return;
  const reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.setClearColor(0x030407, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, .05, 220);
  const cameraTarget = new THREE.Vector3(0, 0, 0);
  let cameraRadius = 25;
  let cameraAzimuth = .2;
  let cameraElevation = .29;
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
  scene.add(new THREE.HemisphereLight(0x77829a, 0x09070a, .72));
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
  const prepareTexture = (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(maxAnisotropy, 8);
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    return texture;
  };

  const earthMaterial = new THREE.MeshStandardMaterial({
    color: 0x346a94,
    roughness: .78,
    metalness: .02,
  });
  const earth = new THREE.Mesh(new THREE.SphereGeometry(1.06, 96, 96), earthMaterial);
  earth.position.copy(EARTH_POS);
  scene.add(earth);
  textureLoader.load('./assets/textures/earth.webp', (texture) => {
    earthMaterial.map = prepareTexture(texture);
    earthMaterial.color.set(0xffffff);
    earthMaterial.needsUpdate = true;
  });
  const earthAtmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(1.095, 64, 64),
    new THREE.MeshBasicMaterial({
      color: 0x6aa8dc,
      transparent: true,
      opacity: .12,
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
  textureLoader.load('./assets/textures/earth_clouds.webp', (texture) => {
    prepareTexture(texture);
    cloudsMaterial.map = texture;
    cloudsMaterial.alphaMap = texture;
    cloudsMaterial.opacity = .62;
    cloudsMaterial.needsUpdate = true;
  });

  const moonMaterial = new THREE.MeshStandardMaterial({
    color: 0xc8c6c2,
    roughness: .96,
    metalness: 0,
  });
  const moon = new THREE.Mesh(new THREE.SphereGeometry(.48, 80, 80), moonMaterial);
  scene.add(moon);
  textureLoader.load('./assets/textures/moon.webp', (texture) => {
    moonMaterial.map = prepareTexture(texture);
    moonMaterial.color.set(0xffffff);
    moonMaterial.needsUpdate = true;
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
    new THREE.CylinderGeometry(.01, .46, 5, 48, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0x26384f,
      transparent: true,
      opacity: .28,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  const penumbra = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, .52, 7, 48, 1, true),
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

  let mode = 'live';
  let displayDate = new Date();
  let state = null;
  let inView = true;
  let raf = 0;
  let lastFrameAt = 0;
  let loopRunning = false;

  function positionVolume(mesh, origin, direction, length, nearRadius, farRadius) {
    if (mesh.geometry) mesh.geometry.dispose();
    mesh.geometry = new THREE.CylinderGeometry(farRadius, nearRadius, length, 48, 1, true);
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
    if (modeEl) modeEl.textContent = mode === 'live' ? 'Live geocentric alignment' : mode === 'greatest' ? 'Greatest eclipse replay' : 'Timeline view';
    if (statusEl) statusEl.textContent = statusFor(state);
    if (timeEl) timeEl.textContent = `${formatUtc(state.date)} · Meeus Sun/Moon geometry`;
    if (rangeTimeEl) rangeTimeEl.textContent = formatUtc(state.date).replace(' · ', ' ');
    if (sepEl) sepEl.textContent = `${state.separationDeg.toFixed(3)}°`;
    if (moonDistanceEl) moonDistanceEl.textContent = formatDistance(state.moonDistanceKm);
    if (shadowEl) shadowEl.textContent = state.umbraHits ? 'Umbra intersects Earth' : formatDistance(state.shadowMissKm);
    if (ratioEl) ratioEl.textContent = `${state.apparentRatio.toFixed(3)}×`;
    if (badgeEl) badgeEl.textContent = mode === 'live' ? `Live now · ${formatUtc(state.date)}` : `Computed replay · ${formatUtc(state.date)}`;
    if (nowButton) nowButton.setAttribute('aria-pressed', mode === 'live' ? 'true' : 'false');
    if (eventButton) eventButton.setAttribute('aria-pressed', mode === 'greatest' ? 'true' : 'false');
  }

  function setDisplayDate(date, nextMode) {
    displayDate = new Date(date);
    mode = nextMode;
    state = computeGeometry(displayDate);
    const rangeValue = clamp(Math.round((displayDate.getTime() - RANGE_START_MS) / 60000), 0, Number(range.max));
    range.value = String(rangeValue);
    updateReadout();
    render();
  }

  function setLive() { setDisplayDate(new Date(), 'live'); }
  function setGreatest() { setDisplayDate(new Date(EVENT_MS), 'greatest'); }

  range.min = '0';
  range.max = String(Math.round((RANGE_END_MS - RANGE_START_MS) / 60000));
  range.step = '1';
  range.addEventListener('input', () => {
    setDisplayDate(new Date(RANGE_START_MS + Number(range.value) * 60000), 'timeline');
  });
  nowButton.addEventListener('click', setLive);
  eventButton.addEventListener('click', setGreatest);

  function resize() {
    const rect = stage.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    const phone = window.matchMedia && window.matchMedia('(max-width: 760px)').matches;
    const constrained = (navigator.deviceMemory && navigator.deviceMemory <= 4)
      || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, phone && constrained ? 1.5 : 2));
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

  function render(time = 0) {
    if (!inView) return;
    if (!reducedMotion) sunMaterial.uniforms.uTime.value = time * .001;
    renderer.render(scene, camera);
    updateLabels();
  }

  function frame(time) {
    if (!loopRunning) return;
    if (time - lastFrameAt >= 33) {
      lastFrameAt = time;
      render(time);
    }
    raf = requestAnimationFrame(frame);
  }

  function startLoop() {
    if (reducedMotion || loopRunning || document.hidden || !inView) return;
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
  canvas.addEventListener('pointerdown', (event) => {
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;
    cameraAzimuth -= dx * .006;
    cameraElevation = clamp(cameraElevation + dy * .0045, -.18, 1.05);
    applyCamera();
    render();
  });
  const stopDrag = (event) => {
    dragging = false;
    try { canvas.releasePointerCapture(event.pointerId); } catch (err) { /* already released */ }
  };
  canvas.addEventListener('pointerup', stopDrag);
  canvas.addEventListener('pointercancel', stopDrag);
  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    cameraRadius = clamp(cameraRadius * Math.exp(event.deltaY * .001), 16, 38);
    applyCamera();
    render();
  }, { passive: false });
  canvas.addEventListener('keydown', (event) => {
    const key = event.key;
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', '_'].includes(key)) return;
    event.preventDefault();
    if (key === 'ArrowLeft') cameraAzimuth += .09;
    if (key === 'ArrowRight') cameraAzimuth -= .09;
    if (key === 'ArrowUp') cameraElevation = clamp(cameraElevation - .07, -.18, 1.05);
    if (key === 'ArrowDown') cameraElevation = clamp(cameraElevation + .07, -.18, 1.05);
    if (key === '+' || key === '=') cameraRadius = clamp(cameraRadius * .9, 16, 38);
    if (key === '-' || key === '_') cameraRadius = clamp(cameraRadius * 1.1, 16, 38);
    applyCamera();
    render();
  });

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

  setLive();
  resize();
  startLoop();
  if (fallback) fallback.hidden = true;
  root.dataset.ready = 'true';
  window.APEclipseLive = {
    setLive,
    setGreatest,
    setDate: (value) => setDisplayDate(new Date(value), 'timeline'),
    getState: () => state && { ...state, date: new Date(state.date) },
  };
  document.dispatchEvent(new CustomEvent('ap-eclipse-live-ready', { detail: { state } }));

  const liveTimer = setInterval(() => {
    if (mode === 'live') setLive();
  }, 30000);

  function dispose() {
    stopLoop();
    clearInterval(liveTimer);
    resizeObserver.disconnect();
    intersectionObserver.disconnect();
    renderer.dispose();
  }

  window.addEventListener('pagehide', (event) => {
    if (event.persisted) stopLoop();
    else dispose();
  });
  window.addEventListener('pageshow', (event) => {
    if (!event.persisted) return;
    resize();
    if (mode === 'live') setLive();
    startLoop();
  });
}

async function boot() {
  const root = document.getElementById('ap-eclipse-live');
  if (!root) return;
  const fallback = root.querySelector('.ap-eclipse-live__fallback');
  try {
    if (!webglAvailable()) throw new Error('WebGL unavailable');
    const E = await waitForEphemeris();
    mount(root, E);
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
