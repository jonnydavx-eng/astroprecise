# =============================================================================
# DO NOT RUN AGAINST PRODUCTION PAGES WITHOUT REVIEW (2026-07-09)
# Previous runs injected UMD three.min.js site-wide and broke the homepage
# ES-module orrery (dual Three.js). My Sky is now a safe standalone page.
# Prefer manual integration via ap-nav-model + mysky.html only.
# =============================================================================
#Requires -Version 5.1
<#
.SYNOPSIS
  AstroPrecise — Enhanced 3D Orrery + My Sky dashboard + Cosmic Journey chrome installer

.DESCRIPTION
  Fully automated installer for:
    - website/js/vendor/three.min.js          (UMD Three.js for non-module pages)
    - website/js/orrery-enhanced.js           (initOrrery(containerId) API)
    - website/css/ap-cosmic-journey.css       (brass nav + journey progress bar)
    - website/js/ap-cosmic-journey.js         (injects journey bar + nav helpers)
    - website/mysky.html                     (central My Sky dashboard)
  Then patches major HTML pages to load the enhanced orrery, journey chrome,
  and My Sky links.

  Does NOT delete or overwrite orrery-webgl.js (production engine). Enhanced
  orrery is additive and uses live VSOP87 when window.AstroEphemeris is present.

.PARAMETER ProjectRoot
  Path to the AstroPrecise repo root (folder that contains website/).

.PARAMETER WebsiteDir
  Override website folder if non-standard. Defaults to $ProjectRoot\website.

.PARAMETER SkipThreeDownload
  If set, do not download three.min.js (use existing file only).

.EXAMPLE
  .\tools\install-enhanced-orrery-mysky.ps1
  .\tools\install-enhanced-orrery-mysky.ps1 -ProjectRoot "C:\Users\jonny\OneDrive\astroprecise"
#>

[CmdletBinding()]
param(
  # === CHANGE THIS if your clone lives elsewhere ===
  [string]$ProjectRoot = "C:\Users\jonny\OneDrive\astroprecise",
  [string]$WebsiteDir  = "",
  [switch]$SkipThreeDownload
)

$ErrorActionPreference = "Stop"
$ProgressPreference    = "SilentlyContinue"

# ---------------------------------------------------------------------------
# Resolve paths
# ---------------------------------------------------------------------------
if (-not $WebsiteDir) { $WebsiteDir = Join-Path $ProjectRoot "website" }
if (-not (Test-Path $WebsiteDir)) {
  throw "Website folder not found: $WebsiteDir`nSet -ProjectRoot to your AstroPrecise repo root."
}

$JsDir     = Join-Path $WebsiteDir "js"
$CssDir    = Join-Path $WebsiteDir "css"
$VendorDir = Join-Path $JsDir "vendor"
$ThreePath = Join-Path $VendorDir "three.min.js"
$Enhanced  = Join-Path $JsDir "orrery-enhanced.js"
$JourneyCss = Join-Path $CssDir "ap-cosmic-journey.css"
$JourneyJs  = Join-Path $JsDir "ap-cosmic-journey.js"
$MySky      = Join-Path $WebsiteDir "mysky.html"
$BackupDir  = Join-Path $ProjectRoot ("tools\_backup-enhanced-orrery-" + (Get-Date -Format "yyyyMMdd-HHmmss"))

function Write-Step([string]$msg) { Write-Host "[*]" $msg -ForegroundColor Cyan }
function Write-Ok([string]$msg)   { Write-Host "[OK]" $msg -ForegroundColor Green }
function Write-Warn([string]$msg) { Write-Host "[!!]" $msg -ForegroundColor Yellow }

New-Item -ItemType Directory -Force -Path $JsDir, $CssDir, $VendorDir, $BackupDir | Out-Null
Write-Step "ProjectRoot = $ProjectRoot"
Write-Step "WebsiteDir  = $WebsiteDir"
Write-Step "Backups     = $BackupDir"

# ---------------------------------------------------------------------------
# 1) three.min.js (UMD) — for pages that don't use import maps
# ---------------------------------------------------------------------------
if (-not $SkipThreeDownload) {
  if (-not (Test-Path $ThreePath) -or ((Get-Item $ThreePath).Length -lt 100000)) {
    Write-Step "Downloading Three.js r160 UMD (three.min.js)..."
    $urls = @(
      "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js",
      "https://unpkg.com/three@0.160.0/build/three.min.js"
    )
    $ok = $false
    foreach ($u in $urls) {
      try {
        Invoke-WebRequest -Uri $u -OutFile $ThreePath -UseBasicParsing -TimeoutSec 60
        if ((Get-Item $ThreePath).Length -gt 100000) { $ok = $true; break }
      } catch {
        Write-Warn "Download failed from $u — $($_.Exception.Message)"
      }
    }
    if (-not $ok) {
      Write-Warn "Could not download three.min.js. Place it manually at: $ThreePath"
    } else {
      Write-Ok "three.min.js ($([math]::Round((Get-Item $ThreePath).Length/1KB)) KB)"
    }
  } else {
    Write-Ok "three.min.js already present"
  }
}

# ---------------------------------------------------------------------------
# 2) orrery-enhanced.js — full Three scene + brass materials + trails + controls
# ---------------------------------------------------------------------------
Write-Step "Writing js/orrery-enhanced.js ..."
$orreryEnhanced = @'
/**
 * AstroPrecise — Enhanced Orrery (UMD)
 * initOrrery(containerId) → mounts a brass/PBR solar system into any page container.
 *
 * Uses window.THREE (from js/vendor/three.min.js).
 * Live positions: prefers window.AstroEphemeris / VSOP87 when available; else schematic.
 *
 * Controls: drag-to-orbit · Ctrl+scroll zoom · touch pan
 */
(function (global) {
  "use strict";

  var RAD = Math.PI / 180;
  var DEG = 180 / Math.PI;
  var AU_SCALE = 12; // visual scale: 1 AU ≈ 12 world units
  var TRAIL_MAX = 180;

  var BODY_META = [
    { id: "sun",     name: "Sun",     color: 0xffc46a, r: 1.35, metal: 0.15, rough: 0.35, emissive: 0xffaa44, eInt: 1.4, a: 0 },
    { id: "mercury", name: "Mercury", color: 0xb0a090, r: 0.22, metal: 0.85, rough: 0.35, a: 0.39 },
    { id: "venus",   name: "Venus",   color: 0xe8c98a, r: 0.38, metal: 0.55, rough: 0.40, a: 0.72 },
    { id: "earth",   name: "Earth",   color: 0x4a8fd4, r: 0.42, metal: 0.35, rough: 0.45, a: 1.00, atmo: 0x6eb6ff },
    { id: "mars",    name: "Mars",    color: 0xc45a3a, r: 0.30, metal: 0.40, rough: 0.55, a: 1.52 },
    { id: "jupiter", name: "Jupiter", color: 0xd4a86a, r: 0.95, metal: 0.25, rough: 0.55, a: 5.20 },
    { id: "saturn",  name: "Saturn",  color: 0xe0c98a, r: 0.82, metal: 0.30, rough: 0.50, a: 9.58, rings: true },
    { id: "uranus",  name: "Uranus",  color: 0x7ec8d4, r: 0.55, metal: 0.45, rough: 0.35, a: 19.2 },
    { id: "neptune", name: "Neptune", color: 0x3a6fd4, r: 0.52, metal: 0.45, rough: 0.35, a: 30.1 }
  ];

  var BRASS = 0xc9a24a;
  var VOID  = 0x0c1016;

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function jdNow() {
    return Date.now() / 86400000 + 2440587.5;
  }

  /** Geocentric / heliocentric lon from engine if present; else slow schematic. */
  function bodyLonDeg(id, jd) {
    try {
      var E = global.AstroEphemeris || global.Ephemeris || null;
      if (E) {
        var fn = E[id + "Position"] || E[id] || null;
        if (typeof fn === "function") {
          var p = fn(jd);
          if (p && typeof p.lon === "number") return p.lon * DEG;
          if (typeof p === "number") return p * DEG;
        }
        if (E.planetPosition) {
          var q = E.planetPosition(id, jd);
          if (q && typeof q.lon === "number") return q.lon * (q.lon > Math.PI * 2 ? 1 : DEG);
        }
      }
    } catch (_) {}
    // schematic mean motion (deg/day-ish) for offline demo
    var rates = {
      mercury: 4.09, venus: 1.60, earth: 0.9856, mars: 0.524,
      jupiter: 0.083, saturn: 0.033, uranus: 0.012, neptune: 0.006, sun: 0
    };
    var base = { mercury: 120, venus: 40, earth: 100, mars: 200, jupiter: 40, saturn: 320, uranus: 50, neptune: 300, sun: 0 };
    var t = (jd - 2451545.0);
    return ((base[id] || 0) + (rates[id] || 0) * t) % 360;
  }

  function lonToPos(lonDeg, aAu, y) {
    var lo = lonDeg * RAD;
    var R = aAu * AU_SCALE;
    return { x: R * Math.cos(lo), y: y || 0, z: -R * Math.sin(lo) };
  }

  function makeBrassMaterial(THREE, hex, opts) {
    opts = opts || {};
    return new THREE.MeshStandardMaterial({
      color: hex,
      metalness: opts.metal != null ? opts.metal : 0.82,
      roughness: opts.rough != null ? opts.rough : 0.28,
      emissive: opts.emissive != null ? opts.emissive : 0x000000,
      emissiveIntensity: opts.eInt != null ? opts.eInt : 0,
      envMapIntensity: 1.1
    });
  }

  function makeStarfield(THREE, n) {
    var geo = new THREE.BufferGeometry();
    var pos = new Float32Array(n * 3);
    var col = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) {
      var r = 80 + Math.random() * 220;
      var th = Math.random() * Math.PI * 2;
      var ph = Math.acos(2 * Math.random() - 1);
      pos[i * 3]     = r * Math.sin(ph) * Math.cos(th);
      pos[i * 3 + 1] = r * Math.cos(ph);
      pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
      var w = 0.7 + Math.random() * 0.3;
      col[i * 3] = w; col[i * 3 + 1] = w * 0.95; col[i * 3 + 2] = w * 0.85;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    var mat = new THREE.PointsMaterial({
      size: 0.35, vertexColors: true, transparent: true, opacity: 0.9,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true
    });
    return new THREE.Points(geo, mat);
  }

  function makeNebula(THREE, n) {
    var geo = new THREE.BufferGeometry();
    var pos = new Float32Array(n * 3);
    var col = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) {
      var r = 25 + Math.random() * 90;
      var th = Math.random() * Math.PI * 2;
      var ph = (Math.random() - 0.5) * 0.9;
      pos[i * 3]     = r * Math.cos(th) * Math.cos(ph);
      pos[i * 3 + 1] = r * Math.sin(ph) * 0.45;
      pos[i * 3 + 2] = r * Math.sin(th) * Math.cos(ph);
      // brass / violet nebula mix
      if (Math.random() > 0.55) {
        col[i * 3] = 0.75; col[i * 3 + 1] = 0.55; col[i * 3 + 2] = 0.25;
      } else {
        col[i * 3] = 0.35; col[i * 3 + 1] = 0.25; col[i * 3 + 2] = 0.65;
      }
    }
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    var mat = new THREE.PointsMaterial({
      size: 2.2, vertexColors: true, transparent: true, opacity: 0.12,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true
    });
    return new THREE.Points(geo, mat);
  }

  function makeOrbitRing(THREE, aAu) {
    var R = aAu * AU_SCALE;
    var curve = new THREE.EllipseCurve(0, 0, R, R, 0, Math.PI * 2, false, 0);
    var pts = curve.getPoints(128).map(function (p) {
      return new THREE.Vector3(p.x, 0, p.y);
    });
    var geo = new THREE.BufferGeometry().setFromPoints(pts);
    var mat = new THREE.LineBasicMaterial({
      color: BRASS, transparent: true, opacity: 0.18
    });
    return new THREE.LineLoop(geo, mat);
  }

  function makeTrail(THREE) {
    var positions = new Float32Array(TRAIL_MAX * 3);
    var geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setDrawRange(0, 0);
    var mat = new THREE.LineBasicMaterial({
      color: BRASS, transparent: true, opacity: 0.45
    });
    return {
      line: new THREE.Line(geo, mat),
      positions: positions,
      geo: geo,
      count: 0,
      push: function (x, y, z) {
        if (this.count < TRAIL_MAX) {
          var i = this.count * 3;
          this.positions[i] = x; this.positions[i + 1] = y; this.positions[i + 2] = z;
          this.count++;
        } else {
          this.positions.copyWithin(0, 3);
          var j = (TRAIL_MAX - 1) * 3;
          this.positions[j] = x; this.positions[j + 1] = y; this.positions[j + 2] = z;
        }
        this.geo.attributes.position.needsUpdate = true;
        this.geo.setDrawRange(0, this.count);
      }
    };
  }

  /**
   * initOrrery(containerId, options?)
   * @returns {object|null} controller with dispose(), setPaused(), focusBody()
   */
  function initOrrery(containerId, options) {
    options = options || {};
    var THREE = global.THREE;
    if (!THREE) {
      console.error("[orrery-enhanced] THREE not found. Load js/vendor/three.min.js first.");
      return null;
    }
    var el = typeof containerId === "string"
      ? document.getElementById(containerId)
      : containerId;
    if (!el) {
      console.error("[orrery-enhanced] container not found:", containerId);
      return null;
    }

    // Clean previous mount
    if (el.__apEnhancedOrrery && el.__apEnhancedOrrery.dispose) {
      try { el.__apEnhancedOrrery.dispose(); } catch (_) {}
    }
    el.innerHTML = "";
    el.classList.add("ap-enhanced-orrery-host");
    el.style.position = el.style.position || "relative";
    el.style.overflow = "hidden";
    if (!el.style.minHeight) el.style.minHeight = options.minHeight || "320px";

    var w = el.clientWidth || 640;
    var h = el.clientHeight || 400;
    if (h < 200) h = options.height || 400;

    var scene = new THREE.Scene();
    scene.background = new THREE.Color(options.background != null ? options.background : VOID);
    scene.fog = new THREE.FogExp2(VOID, 0.006);

    var camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 800);
    camera.position.set(0, 18, 36);

    var renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: !!options.alpha,
      powerPreference: "high-performance"
    });
    renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace || THREE.sRGBEncoding;
    if (renderer.toneMapping !== undefined) {
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
    }
    el.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.touchAction = "none";
    renderer.domElement.setAttribute("aria-label", "Interactive 3D solar system orrery");

    // Lights
    var amb = new THREE.AmbientLight(0x2a3040, 0.45);
    scene.add(amb);
    var sunLight = new THREE.PointLight(0xffe0a8, 2.4, 200, 2);
    sunLight.position.set(0, 0, 0);
    scene.add(sunLight);
    var rim = new THREE.DirectionalLight(0x8ab4ff, 0.35);
    rim.position.set(-20, 12, -10);
    scene.add(rim);
    var brassFill = new THREE.DirectionalLight(BRASS, 0.25);
    brassFill.position.set(15, 8, 20);
    scene.add(brassFill);

    scene.add(makeStarfield(THREE, 1800));
    scene.add(makeNebula(THREE, 500));

    // Root group for slow system drift
    var system = new THREE.Group();
    scene.add(system);

    var bodies = {};
    var trails = {};
    BODY_META.forEach(function (m) {
      if (m.a > 0) system.add(makeOrbitRing(THREE, m.a));

      var g = new THREE.Group();
      g.name = m.id;
      var mat = makeBrassMaterial(THREE, m.color, {
        metal: m.metal, rough: m.rough, emissive: m.emissive || 0, eInt: m.eInt || 0
      });
      var mesh = new THREE.Mesh(new THREE.SphereGeometry(m.r, 32, 24), mat);
      g.add(mesh);

      if (m.atmo) {
        var atmo = new THREE.Mesh(
          new THREE.SphereGeometry(m.r * 1.08, 24, 16),
          new THREE.MeshBasicMaterial({
            color: m.atmo, transparent: true, opacity: 0.18,
            side: THREE.BackSide, depthWrite: false
          })
        );
        g.add(atmo);
      }
      if (m.rings) {
        var ringGeo = new THREE.RingGeometry(m.r * 1.3, m.r * 2.2, 64);
        var ringMat = new THREE.MeshStandardMaterial({
          color: 0xd4bc7a, metalness: 0.6, roughness: 0.45,
          side: THREE.DoubleSide, transparent: true, opacity: 0.75
        });
        var ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2.35;
        g.add(ring);
      }
      if (m.id === "sun") {
        var glow = new THREE.Mesh(
          new THREE.SphereGeometry(m.r * 1.55, 24, 16),
          new THREE.MeshBasicMaterial({
            color: 0xffb050, transparent: true, opacity: 0.18,
            depthWrite: false, blending: THREE.AdditiveBlending
          })
        );
        g.add(glow);
      }

      system.add(g);
      bodies[m.id] = { meta: m, group: g, mesh: mesh };
      if (m.a > 0) {
        var tr = makeTrail(THREE);
        system.add(tr.line);
        trails[m.id] = tr;
      }
    });

    // Camera pivot controls
    var target = new THREE.Vector3(0, 0, 0);
    var sph = { theta: 0.55, phi: 0.95, radius: 40 };
    var dragging = false;
    var lastX = 0, lastY = 0;
    var paused = false;
    var disposed = false;
    var raf = 0;
    var trailTick = 0;

    function applyCamera() {
      var sinPhi = Math.sin(sph.phi);
      camera.position.x = target.x + sph.radius * sinPhi * Math.sin(sph.theta);
      camera.position.y = target.y + sph.radius * Math.cos(sph.phi);
      camera.position.z = target.z + sph.radius * sinPhi * Math.cos(sph.theta);
      camera.lookAt(target);
    }
    applyCamera();

    function onPointerDown(e) {
      dragging = true;
      lastX = e.clientX; lastY = e.clientY;
      try { renderer.domElement.setPointerCapture(e.pointerId); } catch (_) {}
    }
    function onPointerMove(e) {
      if (!dragging) return;
      var dx = e.clientX - lastX;
      var dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      sph.theta -= dx * 0.005;
      sph.phi = clamp(sph.phi - dy * 0.005, 0.15, Math.PI - 0.15);
      applyCamera();
    }
    function onPointerUp(e) {
      dragging = false;
      try { renderer.domElement.releasePointerCapture(e.pointerId); } catch (_) {}
    }
    function onWheel(e) {
      // Ctrl+scroll zoom (also plain scroll for usability on trackpads)
      if (e.ctrlKey || options.scrollZoom !== false) {
        e.preventDefault();
        var factor = e.deltaY > 0 ? 1.08 : 0.92;
        sph.radius = clamp(sph.radius * factor, 8, 120);
        applyCamera();
      }
    }

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("pointercancel", onPointerUp);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });

    function updateBodies(t) {
      var jd = jdNow();
      BODY_META.forEach(function (m) {
        var b = bodies[m.id];
        if (!b) return;
        if (m.id === "sun") {
          b.group.position.set(0, 0, 0);
          b.mesh.rotation.y = t * 0.05;
          return;
        }
        var lon = bodyLonDeg(m.id, jd);
        var p = lonToPos(lon, m.a, Math.sin(t * 0.2 + m.a) * 0.08);
        b.group.position.set(p.x, p.y, p.z);
        b.mesh.rotation.y = t * 0.3 + m.a;
        if (trails[m.id] && (++trailTick % 2 === 0)) {
          trails[m.id].push(p.x, p.y, p.z);
        }
      });
    }

    function onResize() {
      if (disposed) return;
      var nw = el.clientWidth || w;
      var nh = el.clientHeight || h;
      if (nh < 160) nh = h;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh, false);
    }
    global.addEventListener("resize", onResize);

    var t0 = performance.now();
    function frame(now) {
      if (disposed) return;
      raf = requestAnimationFrame(frame);
      if (paused) {
        renderer.render(scene, camera);
        return;
      }
      var t = (now - t0) * 0.001;
      system.rotation.y = t * 0.015;
      updateBodies(t);
      // gentle auto-orbit when idle
      if (!dragging && options.autoRotate !== false) {
        sph.theta += 0.0008;
        applyCamera();
      }
      renderer.render(scene, camera);
    }
    raf = requestAnimationFrame(frame);

    // Caption
    var cap = document.createElement("div");
    cap.className = "ap-enhanced-orrery-caption";
    cap.innerHTML = "Drag to turn · Ctrl+scroll zoom · Positions live when VSOP87 engine is loaded";
    el.appendChild(cap);

    var api = {
      scene: scene,
      camera: camera,
      renderer: renderer,
      setPaused: function (v) { paused = !!v; },
      focusBody: function (id) {
        var b = bodies[id];
        if (!b) return;
        target.copy(b.group.position);
        sph.radius = clamp(b.meta.a * AU_SCALE * 0.8 + 6, 10, 80);
        applyCamera();
      },
      dispose: function () {
        disposed = true;
        cancelAnimationFrame(raf);
        global.removeEventListener("resize", onResize);
        renderer.domElement.removeEventListener("pointerdown", onPointerDown);
        renderer.domElement.removeEventListener("pointermove", onPointerMove);
        renderer.domElement.removeEventListener("pointerup", onPointerUp);
        renderer.domElement.removeEventListener("pointercancel", onPointerUp);
        renderer.domElement.removeEventListener("wheel", onWheel);
        try { renderer.dispose(); } catch (_) {}
        if (renderer.domElement && renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
        if (cap.parentNode) cap.parentNode.removeChild(cap);
        el.__apEnhancedOrrery = null;
      }
    };
    el.__apEnhancedOrrery = api;
    global.dispatchEvent(new CustomEvent("ap-orrery-enhanced-ready", { detail: api }));
    return api;
  }

  // Auto-mount any [data-orrery-enhanced] containers
  function autoMount() {
    var nodes = document.querySelectorAll("[data-orrery-enhanced]");
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (n.__apEnhancedOrrery) continue;
      var id = n.id || ("orrery-enhanced-" + i);
      if (!n.id) n.id = id;
      initOrrery(id, { autoRotate: n.getAttribute("data-auto-rotate") !== "0" });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(autoMount, 80);
    });
  } else {
    setTimeout(autoMount, 80);
  }

  global.initOrrery = initOrrery;
  global.AstroPreciseEnhancedOrrery = { initOrrery: initOrrery, autoMount: autoMount };
})(typeof window !== "undefined" ? window : globalThis);
'@

Set-Content -Path $Enhanced -Value $orreryEnhanced -Encoding UTF8
Write-Ok "Wrote $Enhanced"

# ---------------------------------------------------------------------------
# 3) Cosmic Journey CSS + JS
# ---------------------------------------------------------------------------
Write-Step "Writing Cosmic Journey CSS + JS ..."
$journeyCssContent = @'
/* AstroPrecise — Cosmic Journey chrome (brass nav + progress) */
:root {
  --ap-journey-brass: #c9a24a;
  --ap-journey-brass-dim: #8a6f32;
  --ap-journey-void: #0c1016;
  --ap-journey-ink: #e8e2d4;
  --ap-journey-muted: #9a927f;
}

.ap-cosmic-journey {
  position: sticky;
  top: 0;
  z-index: 80;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.65rem 1rem;
  padding: 0.45rem 1rem;
  background: linear-gradient(180deg, rgba(12,16,22,0.96), rgba(12,16,22,0.88));
  border-bottom: 1px solid rgba(201,162,74,0.28);
  backdrop-filter: blur(10px);
  font-family: "Inter", system-ui, sans-serif;
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ap-journey-muted);
}

.ap-cosmic-journey__label {
  color: var(--ap-journey-brass);
  font-weight: 600;
  white-space: nowrap;
}

.ap-cosmic-journey__track {
  flex: 1 1 160px;
  height: 4px;
  border-radius: 99px;
  background: rgba(201,162,74,0.12);
  overflow: hidden;
  min-width: 120px;
}

.ap-cosmic-journey__fill {
  height: 100%;
  width: 0%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--ap-journey-brass-dim), var(--ap-journey-brass));
  box-shadow: 0 0 12px rgba(201,162,74,0.45);
  transition: width 0.45s ease;
}

.ap-cosmic-journey__steps {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 0.55rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

.ap-cosmic-journey__steps a {
  color: inherit;
  text-decoration: none;
  padding: 0.2rem 0.45rem;
  border-radius: 99px;
  border: 1px solid transparent;
  transition: color 0.2s, border-color 0.2s, background 0.2s;
}
.ap-cosmic-journey__steps a:hover,
.ap-cosmic-journey__steps a.is-active {
  color: var(--ap-journey-brass);
  border-color: rgba(201,162,74,0.35);
  background: rgba(201,162,74,0.08);
}
.ap-cosmic-journey__steps a.is-done {
  color: var(--ap-journey-ink);
}

.ap-brass-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  justify-content: center;
  margin: 0.75rem 0 1.25rem;
}
.ap-brass-tabs a {
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  text-decoration: none;
  color: var(--ap-journey-muted);
  padding: 0.45rem 0.85rem;
  border: 1px solid rgba(201,162,74,0.22);
  border-radius: 999px;
  background: rgba(12,16,22,0.5);
}
.ap-brass-tabs a:hover,
.ap-brass-tabs a.is-active {
  color: var(--ap-journey-brass);
  border-color: rgba(201,162,74,0.55);
  box-shadow: 0 0 0 1px rgba(201,162,74,0.12), 0 0 24px rgba(201,162,74,0.08);
}

.ap-enhanced-orrery-host {
  width: 100%;
  min-height: 320px;
  border-radius: 16px;
  border: 1px solid rgba(201,162,74,0.22);
  background: radial-gradient(ellipse at 50% 40%, #141a24 0%, #0c1016 70%);
  box-shadow: inset 0 0 60px rgba(0,0,0,0.45), 0 12px 40px rgba(0,0,0,0.35);
}
.ap-enhanced-orrery-caption {
  position: absolute;
  left: 0; right: 0; bottom: 0;
  padding: 0.4rem 0.75rem;
  font-size: 0.68rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(232,226,212,0.55);
  background: linear-gradient(transparent, rgba(12,16,22,0.85));
  pointer-events: none;
  text-align: center;
}

/* My Sky dashboard */
.mysky-page { background: var(--ap-journey-void); color: var(--ap-journey-ink); min-height: 100vh; }
.mysky-header {
  text-align: center;
  padding: 2.5rem 1.25rem 1rem;
  border-bottom: 1px solid rgba(201,162,74,0.2);
}
.mysky-header h1 {
  font-family: "Cinzel", "Times New Roman", serif;
  font-weight: 500;
  font-size: clamp(1.8rem, 4vw, 2.6rem);
  color: var(--ap-journey-brass);
  margin: 0.35rem 0 0.5rem;
  letter-spacing: 0.06em;
}
.mysky-header .eyebrow {
  font-size: 0.7rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--ap-journey-muted);
}
.mysky-grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 1.25rem;
  max-width: 1180px;
  margin: 0 auto;
  padding: 1.25rem;
}
@media (max-width: 900px) {
  .mysky-grid { grid-template-columns: 1fr; }
}
.mysky-card {
  background: rgba(18,22,30,0.9);
  border: 1px solid rgba(201,162,74,0.2);
  border-radius: 14px;
  padding: 1.1rem 1.2rem;
}
.mysky-card h2 {
  font-family: "Cinzel", serif;
  font-size: 1.05rem;
  font-weight: 500;
  color: var(--ap-journey-brass);
  margin: 0 0 0.65rem;
  letter-spacing: 0.04em;
}
.mysky-card p { color: var(--ap-journey-muted); line-height: 1.55; margin: 0 0 0.75rem; font-size: 0.95rem; }
.mysky-card .cta {
  display: inline-block;
  margin-top: 0.35rem;
  padding: 0.5rem 1rem;
  border-radius: 999px;
  background: linear-gradient(135deg, #b8923e, #e0c06a);
  color: #1a1408;
  text-decoration: none;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.mysky-orrery-wrap { min-height: 420px; }
.mysky-side { display: flex; flex-direction: column; gap: 1rem; }

/* Transit Explorer (horoscope redesign hooks) */
.transit-explorer {
  max-width: 1100px;
  margin: 0 auto;
  padding: 1.5rem 1.25rem 3rem;
}
.transit-explorer__hero {
  text-align: center;
  margin-bottom: 1.5rem;
}
.transit-explorer__hero h1 {
  font-family: "Cinzel", serif;
  color: var(--ap-journey-brass);
  font-weight: 500;
  font-size: clamp(1.8rem, 4vw, 2.5rem);
}
.transit-wheel-shell {
  position: relative;
  max-width: 520px;
  margin: 0 auto 1.5rem;
  aspect-ratio: 1;
  border-radius: 50%;
  border: 2px solid rgba(201,162,74,0.45);
  box-shadow: 0 0 0 8px rgba(201,162,74,0.06), inset 0 0 80px rgba(201,162,74,0.05);
  background:
    radial-gradient(circle at 50% 50%, rgba(201,162,74,0.08), transparent 55%),
    #0e131b;
  display: grid;
  place-items: center;
}
.transit-wheel-shell svg { width: 92%; height: 92%; }
.transit-scrub {
  width: min(520px, 100%);
  margin: 0.5rem auto 1.5rem;
  display: block;
  accent-color: var(--ap-journey-brass);
}
.transit-panels {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
}
'@
Set-Content -Path $JourneyCss -Value $journeyCssContent -Encoding UTF8

$journeyJsContent = @'
/**
 * Cosmic Journey progress bar + brass tab helper.
 * Injects sticky journey chrome and marks the active step from body[data-journey] or path.
 */
(function () {
  "use strict";

  var STEPS = [
    { id: "cast",   label: "Cast",   href: "chart.html",     progress: 16 },
    { id: "sky",    label: "Sky",    href: "ephemeris.html", progress: 33 },
    { id: "keep",   label: "Keep",   href: "moment.html",    progress: 50 },
    { id: "daily",  label: "Daily",  href: "horoscope.html", progress: 66 },
    { id: "mysky",  label: "My Sky", href: "mysky.html",     progress: 83 },
    { id: "shop",   label: "Shop",   href: "shop.html",      progress: 100 }
  ];

  function currentStepId() {
    var d = document.body && document.body.getAttribute("data-journey");
    if (d) return d;
    var path = (location.pathname || "").split("/").pop() || "index.html";
    path = path.toLowerCase();
    if (path === "" || path === "index.html") return "cast";
    if (path.indexOf("chart") >= 0) return "cast";
    if (path.indexOf("ephemeris") >= 0 || path.indexOf("explore") >= 0) return "sky";
    if (path.indexOf("moment") >= 0) return "keep";
    if (path.indexOf("horoscope") >= 0) return "daily";
    if (path.indexOf("mysky") >= 0) return "mysky";
    if (path.indexOf("shop") >= 0) return "shop";
    return "cast";
  }

  function injectJourney() {
    if (document.getElementById("ap-cosmic-journey")) return;
    if (document.body && document.body.hasAttribute("data-no-journey")) return;

    var stepId = currentStepId();
    var step = STEPS.find(function (s) { return s.id === stepId; }) || STEPS[0];
    var nav = document.createElement("nav");
    nav.id = "ap-cosmic-journey";
    nav.className = "ap-cosmic-journey";
    nav.setAttribute("aria-label", "Cosmic journey progress");

    var label = document.createElement("span");
    label.className = "ap-cosmic-journey__label";
    label.textContent = "Cosmic Journey";
    nav.appendChild(label);

    var track = document.createElement("div");
    track.className = "ap-cosmic-journey__track";
    track.setAttribute("role", "progressbar");
    track.setAttribute("aria-valuemin", "0");
    track.setAttribute("aria-valuemax", "100");
    track.setAttribute("aria-valuenow", String(step.progress));
    var fill = document.createElement("div");
    fill.className = "ap-cosmic-journey__fill";
    fill.style.width = step.progress + "%";
    track.appendChild(fill);
    nav.appendChild(track);

    var ul = document.createElement("ul");
    ul.className = "ap-cosmic-journey__steps";
    var reached = true;
    STEPS.forEach(function (s) {
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = s.href;
      a.textContent = s.label;
      if (s.id === stepId) {
        a.className = "is-active";
        a.setAttribute("aria-current", "page");
        reached = false;
      } else if (reached) {
        a.className = "is-done";
      }
      li.appendChild(a);
      ul.appendChild(li);
    });
    nav.appendChild(ul);

    // Prefer after skip-link / before masthead
    var header = document.querySelector(".site-header, header.masthead, #masthead, body > header");
    if (header && header.parentNode) {
      header.parentNode.insertBefore(nav, header);
    } else if (document.body) {
      document.body.insertBefore(nav, document.body.firstChild);
    }
  }

  function ensureMySkyNavLink() {
    var selectors = [
      "nav a[href='shop.html']",
      ".site-nav a[href='shop.html']",
      "#primary-nav a[href='shop.html']"
    ];
    var shop = null;
    for (var i = 0; i < selectors.length && !shop; i++) {
      shop = document.querySelector(selectors[i]);
    }
    if (!shop || document.querySelector("a[href='mysky.html']")) return;
    var a = document.createElement("a");
    a.href = "mysky.html";
    a.textContent = "My Sky";
    a.className = shop.className || "";
    shop.parentNode.insertBefore(a, shop);
  }

  function boot() {
    injectJourney();
    ensureMySkyNavLink();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
'@
Set-Content -Path $JourneyJs -Value $journeyJsContent -Encoding UTF8
Write-Ok "Journey CSS/JS written"

# ---------------------------------------------------------------------------
# 4) mysky.html
# ---------------------------------------------------------------------------
Write-Step "Writing mysky.html ..."
$myskyHtml = @'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>My Sky — Your Cosmic Dashboard | Astro Precise</title>
  <meta name="description" content="My Sky: your charts, Moments, daily sky, and live 3D orrery in one brass observatory dashboard." />
  <link rel="icon" href="img/favicon.svg" type="image/svg+xml" />
  <link rel="stylesheet" href="css/ap-cosmic-journey.css" />
  <style>
    body.mysky-page { margin: 0; font-family: Inter, system-ui, sans-serif; }
    .mysky-topnav {
      display: flex; justify-content: space-between; align-items: center;
      padding: 0.85rem 1.25rem; border-bottom: 1px solid rgba(201,162,74,0.2);
    }
    .mysky-topnav a.brand {
      color: #c9a24a; text-decoration: none; font-family: Cinzel, serif;
      letter-spacing: 0.08em; font-size: 1rem;
    }
    .mysky-topnav .links { display: flex; gap: 0.85rem; flex-wrap: wrap; }
    .mysky-topnav .links a {
      color: #9a927f; text-decoration: none; font-size: 0.72rem;
      letter-spacing: 0.12em; text-transform: uppercase;
    }
    .mysky-topnav .links a:hover { color: #c9a24a; }
  </style>
  <script src="js/vendor/three.min.js"></script>
  <script src="js/orrery-enhanced.js"></script>
  <script src="js/ap-cosmic-journey.js" defer></script>
</head>
<body class="mysky-page" data-journey="mysky">
  <div class="mysky-topnav">
    <a class="brand" href="index.html">✦ Astro Precise</a>
    <div class="links">
      <a href="chart.html">Chart</a>
      <a href="ephemeris.html">Sky</a>
      <a href="moment.html">Moment</a>
      <a href="horoscope.html">Daily</a>
      <a href="mysky.html" aria-current="page">My Sky</a>
      <a href="shop.html">Shop</a>
    </div>
  </div>

  <header class="mysky-header">
    <div class="eyebrow">Observatory · Private on your device</div>
    <h1>My Sky</h1>
    <p style="max-width:36rem;margin:0.5rem auto 0;color:#9a927f;line-height:1.55">
      One dashboard for the sky you cast, the nights you keep, and the weather of today.
    </p>
    <nav class="ap-brass-tabs" aria-label="My Sky sections">
      <a href="#orrery" class="is-active">Orrery</a>
      <a href="#charts">Charts</a>
      <a href="#moments">Moments</a>
      <a href="#daily">Horoscope</a>
    </nav>
  </header>

  <main class="mysky-grid">
    <section id="orrery" class="mysky-card">
      <h2>Live solar system</h2>
      <p>Drag to turn · Ctrl+scroll to zoom. Positions use the VSOP87 engine when loaded.</p>
      <div id="mysky-orrery" class="mysky-orrery-wrap ap-enhanced-orrery-host" data-orrery-enhanced></div>
    </section>

    <aside class="mysky-side">
      <section id="charts" class="mysky-card">
        <h2>Saved charts</h2>
        <p>Cast a natal chart once — it stays on this device for Daily and Sky layers.</p>
        <a class="cta" href="chart.html">Cast free chart</a>
      </section>
      <section id="moments" class="mysky-card">
        <h2>Moments</h2>
        <p>Freeze any night that mattered — birth, wedding, first date — as a private card.</p>
        <a class="cta" href="moment.html">Open Moment</a>
      </section>
      <section id="daily" class="mysky-card">
        <h2>Today’s sky</h2>
        <p>Transit Explorer: real planetary weather, not a generic Sun-sign column.</p>
        <a class="cta" href="horoscope.html">Transit Explorer</a>
      </section>
      <section class="mysky-card">
        <h2>Go deeper</h2>
        <p>When you want the full story of your chart as a reading or plate.</p>
        <a class="cta" href="shop.html#deep-reading">Deep Reading</a>
      </section>
    </aside>
  </main>

  <script>
    document.addEventListener("DOMContentLoaded", function () {
      if (window.initOrrery) {
        initOrrery("mysky-orrery", { minHeight: "420px", autoRotate: true });
      }
    });
  </script>
</body>
</html>
'@
Set-Content -Path $MySky -Value $myskyHtml -Encoding UTF8
Write-Ok "Wrote mysky.html"

# ---------------------------------------------------------------------------
# 5) Patch helpers
# ---------------------------------------------------------------------------
function Backup-File([string]$path) {
  if (-not (Test-Path $path)) { return }
  $rel = $path.Substring($WebsiteDir.Length).TrimStart('\','/')
  $dest = Join-Path $BackupDir ($rel -replace '[\\/]', '__')
  Copy-Item -LiteralPath $path -Destination $dest -Force
}

function Ensure-HeadAsset {
  param(
    [string]$HtmlPath,
    [string]$Marker,          # unique snippet to detect presence
    [string]$InsertHtml,      # full tag(s) to insert before </head>
    [string]$BeforePattern = "</head>"
  )
  if (-not (Test-Path $HtmlPath)) { Write-Warn "Skip missing $HtmlPath"; return }
  $raw = Get-Content -LiteralPath $HtmlPath -Raw -Encoding UTF8
  if ($raw -match [regex]::Escape($Marker)) {
    Write-Host "  · already has $Marker" -ForegroundColor DarkGray
    return
  }
  Backup-File $HtmlPath
  if ($raw -notmatch [regex]::Escape($BeforePattern)) {
    Write-Warn "No $BeforePattern in $HtmlPath — appending assets before end of file"
    $raw = $raw + "`r`n" + $InsertHtml + "`r`n"
  } else {
    $raw = [regex]::Replace($raw, [regex]::Escape($BeforePattern), ($InsertHtml + "`r`n" + $BeforePattern), 1)
  }
  Set-Content -LiteralPath $HtmlPath -Value $raw -Encoding UTF8 -NoNewline
  Write-Ok "Patched head: $(Split-Path $HtmlPath -Leaf)"
}

function Ensure-BodyAttr {
  param([string]$HtmlPath, [string]$JourneyId)
  if (-not (Test-Path $HtmlPath)) { return }
  $raw = Get-Content -LiteralPath $HtmlPath -Raw -Encoding UTF8
  if ($raw -match 'data-journey=') { return }
  Backup-File $HtmlPath
  $raw2 = [regex]::Replace($raw, '<body([^>]*)>', {
    param($m)
    $attrs = $m.Groups[1].Value
    if ($attrs -match 'data-journey=') { return $m.Value }
    return "<body$attrs data-journey=`"$JourneyId`">"
  }, 1)
  if ($raw2 -ne $raw) {
    Set-Content -LiteralPath $HtmlPath -Value $raw2 -Encoding UTF8 -NoNewline
    Write-Ok "data-journey=$JourneyId on $(Split-Path $HtmlPath -Leaf)"
  }
}

function Ensure-SnippetOnce {
  param(
    [string]$HtmlPath,
    [string]$MarkerRegex,
    [string]$InsertHtml,
    [string]$AnchorRegex,   # insert AFTER first match of this
    [string]$Mode = "After" # After | Before | ReplaceMatch
  )
  if (-not (Test-Path $HtmlPath)) { return $false }
  $raw = Get-Content -LiteralPath $HtmlPath -Raw -Encoding UTF8
  if ($raw -match $MarkerRegex) { return $false }
  Backup-File $HtmlPath
  if ($Mode -eq "ReplaceMatch" -and $raw -match $AnchorRegex) {
    $raw = [regex]::Replace($raw, $AnchorRegex, $InsertHtml, 1)
  } elseif ($Mode -eq "Before" -and $raw -match $AnchorRegex) {
    $raw = [regex]::Replace($raw, $AnchorRegex, ($InsertHtml + '$0'), 1)
  } elseif ($raw -match $AnchorRegex) {
    $raw = [regex]::Replace($raw, $AnchorRegex, ('$0' + $InsertHtml), 1)
  } else {
    # fallback: before </body>
    if ($raw -match "</body>") {
      $raw = [regex]::Replace($raw, "</body>", ($InsertHtml + "`r`n</body>"), 1)
    } else {
      $raw += "`r`n$InsertHtml"
    }
  }
  Set-Content -LiteralPath $HtmlPath -Value $raw -Encoding UTF8 -NoNewline
  return $true
}

$HeadBundle = @"
  <!-- Enhanced Orrery + Cosmic Journey (auto-installed) -->
  <link rel="stylesheet" href="css/ap-cosmic-journey.css" />
  <script src="js/vendor/three.min.js"></script>
  <script src="js/orrery-enhanced.js"></script>
  <script src="js/ap-cosmic-journey.js" defer></script>
"@

$MajorPages = @(
  "index.html", "horoscope.html", "explore.html", "chart.html",
  "moment.html", "ephemeris.html", "mysky.html", "shop.html",
  "compatibility.html", "transits.html", "aries.html"
)

Write-Step "Injecting scripts/styles into major HTML heads..."
foreach ($page in $MajorPages) {
  $p = Join-Path $WebsiteDir $page
  Ensure-HeadAsset -HtmlPath $p -Marker "orrery-enhanced.js" -InsertHtml $HeadBundle
}

# Journey step attributes
Ensure-BodyAttr (Join-Path $WebsiteDir "index.html")     "cast"
Ensure-BodyAttr (Join-Path $WebsiteDir "chart.html")     "cast"
Ensure-BodyAttr (Join-Path $WebsiteDir "ephemeris.html") "sky"
Ensure-BodyAttr (Join-Path $WebsiteDir "explore.html")   "sky"
Ensure-BodyAttr (Join-Path $WebsiteDir "moment.html")    "keep"
Ensure-BodyAttr (Join-Path $WebsiteDir "horoscope.html") "daily"
Ensure-BodyAttr (Join-Path $WebsiteDir "mysky.html")     "mysky"
Ensure-BodyAttr (Join-Path $WebsiteDir "shop.html")      "shop"

# ---------------------------------------------------------------------------
# 6) index.html — hero enhanced mount + My Sky link
# ---------------------------------------------------------------------------
Write-Step "Updating index.html hero mount + My Sky link..."
$indexPath = Join-Path $WebsiteDir "index.html"
if (Test-Path $indexPath) {
  $idx = Get-Content -LiteralPath $indexPath -Raw -Encoding UTF8
  Backup-File $indexPath

  # Prefer mounting into existing orrery host if present
  $heroMount = @'

<!-- Enhanced orrery mount (auto) — coexists with legacy loader -->
<div id="ap-enhanced-hero-orrery" class="ap-enhanced-orrery-host" data-orrery-enhanced style="min-height:min(52vh,520px);margin:1rem 0"></div>
<script>
(function(){
  function bootHeroOrrery(){
    if (!window.initOrrery) return;
    var host = document.getElementById("ap-enhanced-hero-orrery");
    if (!host) return;
    // If legacy full orrery canvas already fills hero, keep enhanced as secondary preview under instruments
    initOrrery("ap-enhanced-hero-orrery", { minHeight: "420px", autoRotate: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function(){ setTimeout(bootHeroOrrery, 200); });
  else setTimeout(bootHeroOrrery, 200);
})();
</script>
'@

  if ($idx -notmatch "ap-enhanced-hero-orrery") {
    if ($idx -match "</main>") {
      $idx = [regex]::Replace($idx, "</main>", ($heroMount + "`r`n</main>"), 1)
    } else {
      $idx = [regex]::Replace($idx, "</body>", ($heroMount + "`r`n</body>"), 1)
    }
  }

  if ($idx -notmatch 'href="mysky\.html"') {
    if ($idx -match 'href="shop\.html"') {
      $idx = [regex]::Replace(
        $idx,
        '(<a[^>]*href="shop\.html"[^>]*>)',
        '<a href="mysky.html">My Sky</a>$1',
        1
      )
    }
  }

  Set-Content -LiteralPath $indexPath -Value $idx -Encoding UTF8 -NoNewline
  Write-Ok "index.html updated"
}

# ---------------------------------------------------------------------------
# 7) horoscope.html — Transit Explorer redesign block (non-destructive inject)
# ---------------------------------------------------------------------------
Write-Step "Injecting Transit Explorer shell into horoscope.html..."
$horoPath = Join-Path $WebsiteDir "horoscope.html"
if (Test-Path $horoPath) {
  Backup-File $horoPath
  $horo = Get-Content -LiteralPath $horoPath -Raw -Encoding UTF8

  $transitBlock = @'

<!-- ===== Transit Explorer (auto-installed shell) ===== -->
<section id="transit-explorer" class="transit-explorer" aria-label="Transit Explorer">
  <div class="transit-explorer__hero">
    <p class="eyebrow" style="letter-spacing:.2em;text-transform:uppercase;color:#9a927f;font-size:.72rem">Transit Explorer</p>
    <h1>The sky moving through you</h1>
    <p style="max-width:34rem;margin:.5rem auto 0;color:#9a927f;line-height:1.55">
      A brass zodiac wheel of today’s real transits — scrub time, read the weather of consciousness, keep what matters.
    </p>
  </div>

  <div class="transit-wheel-shell" id="transit-wheel" aria-hidden="false">
    <svg viewBox="0 0 200 200" role="img" aria-label="Brass zodiac wheel">
      <circle cx="100" cy="100" r="92" fill="none" stroke="#c9a24a" stroke-width="0.8" opacity="0.7"/>
      <circle cx="100" cy="100" r="78" fill="none" stroke="#c9a24a" stroke-width="0.4" opacity="0.35"/>
      <circle cx="100" cy="100" r="4" fill="#c9a24a"/>
      <!-- 12 ticks -->
      <g stroke="#c9a24a" stroke-width="0.7" opacity="0.85">
        <line x1="100" y1="10" x2="100" y2="18"/><line x1="100" y1="182" x2="100" y2="190"/>
        <line x1="10" y1="100" x2="18" y2="100"/><line x1="182" y1="100" x2="190" y2="100"/>
        <line x1="35.3" y1="35.3" x2="41" y2="41"/><line x1="159" y1="159" x2="164.7" y2="164.7"/>
        <line x1="164.7" y1="35.3" x2="159" y2="41"/><line x1="41" y1="159" x2="35.3" y2="164.7"/>
      </g>
      <text x="100" y="28" text-anchor="middle" fill="#c9a24a" font-size="5" font-family="Cinzel, serif">ARIES</text>
      <text x="100" y="178" text-anchor="middle" fill="#c9a24a" font-size="5" font-family="Cinzel, serif">LIBRA</text>
      <text x="28" y="102" text-anchor="middle" fill="#c9a24a" font-size="5" font-family="Cinzel, serif">CAN</text>
      <text x="172" y="102" text-anchor="middle" fill="#c9a24a" font-size="5" font-family="Cinzel, serif">CAP</text>
      <g id="transit-wheel-planets"></g>
    </svg>
  </div>

  <label for="transit-scrub" class="sr-only" style="position:absolute;left:-9999px">Timeline scrubber</label>
  <input id="transit-scrub" class="transit-scrub" type="range" min="-48" max="48" value="0" step="1"
         aria-valuetext="Now" />
  <p id="transit-scrub-label" style="text-align:center;color:#9a927f;font-size:.8rem;margin:-.75rem 0 1.25rem">Now · live sky</p>

  <div class="transit-panels">
    <article class="mysky-card">
      <h2>Personalised cards</h2>
      <p id="transit-card-copy">Pick your sign below for a reading computed from where the planets really are — not a column written weeks ahead.</p>
      <a class="cta" href="chart.html">Sharpen with your chart</a>
    </article>
    <article class="mysky-card">
      <h2>Consciousness weather</h2>
      <p id="transit-weather">Moon, Mercury, and the outer weather of attention. Scroll the timeline to feel the next 48 hours.</p>
      <a class="cta" href="ephemeris.html">Open The Sky</a>
    </article>
    <article class="mysky-card">
      <h2>3D sky</h2>
      <div id="horoscope-orrery" class="ap-enhanced-orrery-host" style="min-height:240px" data-orrery-enhanced></div>
    </article>
  </div>
</section>
<script>
(function(){
  function placePlanets(){
    var g = document.getElementById("transit-wheel-planets");
    if (!g) return;
    var bodies = [
      { id:"sun", glyph:"☉", lon:100 },
      { id:"moon", glyph:"☽", lon:40 },
      { id:"mercury", glyph:"☿", lon:110 },
      { id:"venus", glyph:"♀", lon:80 },
      { id:"mars", glyph:"♂", lon:200 },
      { id:"jupiter", glyph:"♃", lon:50 },
      { id:"saturn", glyph:"♄", lon:330 }
    ];
    try {
      if (window.AstroEphemeris) {
        var jd = Date.now()/86400000 + 2440587.5;
        bodies.forEach(function(b){
          var fn = window.AstroEphemeris[b.id + "Position"];
          if (typeof fn === "function") {
            var p = fn(jd);
            if (p && typeof p.lon === "number") b.lon = p.lon * 180 / Math.PI;
          }
        });
      }
    } catch(e) {}
    var scrub = document.getElementById("transit-scrub");
    var hours = scrub ? (+scrub.value || 0) : 0;
    g.innerHTML = "";
    bodies.forEach(function(b, i){
      var lon = (b.lon + hours * 0.5) * Math.PI / 180;
      var r = 62;
      var x = 100 + r * Math.cos(lon);
      var y = 100 - r * Math.sin(lon);
      var t = document.createElementNS("http://www.w3.org/2000/svg", "text");
      t.setAttribute("x", x); t.setAttribute("y", y);
      t.setAttribute("text-anchor", "middle");
      t.setAttribute("dominant-baseline", "middle");
      t.setAttribute("fill", "#e0c06a");
      t.setAttribute("font-size", "7");
      t.textContent = b.glyph;
      g.appendChild(t);
    });
    var lab = document.getElementById("transit-scrub-label");
    if (lab) {
      if (hours === 0) lab.textContent = "Now · live sky";
      else if (hours > 0) lab.textContent = "+" + hours + "h from now";
      else lab.textContent = hours + "h from now";
    }
  }
  document.addEventListener("DOMContentLoaded", function(){
    placePlanets();
    var scrub = document.getElementById("transit-scrub");
    if (scrub) scrub.addEventListener("input", placePlanets);
    if (window.initOrrery) {
      try { initOrrery("horoscope-orrery", { minHeight: "240px" }); } catch(e) {}
    }
  });
})();
</script>
<!-- ===== /Transit Explorer ===== -->
'@

  if ($horo -notmatch 'id="transit-explorer"') {
    if ($horo -match '<main[^>]*>') {
      $horo = [regex]::Replace($horo, '(<main[^>]*>)', ('$1' + $transitBlock), 1)
    } else {
      $horo = [regex]::Replace($horo, "</body>", ($transitBlock + "`r`n</body>"), 1)
    }
    Set-Content -LiteralPath $horoPath -Value $horo -Encoding UTF8 -NoNewline
    Write-Ok "horoscope.html Transit Explorer injected"
  } else {
    Write-Host "  · Transit Explorer already present" -ForegroundColor DarkGray
  }
}

# ---------------------------------------------------------------------------
# 8) explore / chart / moment / ephemeris — enhanced orrery mounts
# ---------------------------------------------------------------------------
Write-Step "Adding enhanced orrery mounts to journey pages..."
$mountPages = @{
  "explore.html"   = "explore-enhanced-orrery"
  "chart.html"     = "chart-enhanced-orrery"
  "moment.html"    = "moment-enhanced-orrery"
  "ephemeris.html" = "ephemeris-enhanced-orrery"
}
foreach ($kv in $mountPages.GetEnumerator()) {
  $p = Join-Path $WebsiteDir $kv.Key
  if (-not (Test-Path $p)) { Write-Warn "Missing $($kv.Key)"; continue }
  $id = $kv.Value
  $block = @"

<section class="mysky-card" id="$id-section" style="max-width:960px;margin:1.5rem auto;padding:1rem">
  <h2 style="font-family:Cinzel,serif;color:#c9a24a;font-weight:500">Enhanced orrery</h2>
  <p style="color:#9a927f">Part of your Cosmic Journey — <a href="mysky.html" style="color:#c9a24a">open My Sky</a>.</p>
  <div id="$id" class="ap-enhanced-orrery-host" data-orrery-enhanced style="min-height:320px"></div>
</section>
<script>document.addEventListener("DOMContentLoaded",function(){if(window.initOrrery)try{initOrrery("$id",{minHeight:"320px"})}catch(e){}});</script>
"@
  $raw = Get-Content -LiteralPath $p -Raw -Encoding UTF8
  if ($raw -match [regex]::Escape($id)) {
    Write-Host "  · $($kv.Key) already has mount" -ForegroundColor DarkGray
    continue
  }
  Backup-File $p
  if ($raw -match "</main>") {
    $raw = [regex]::Replace($raw, "</main>", ($block + "`r`n</main>"), 1)
  } else {
    $raw = [regex]::Replace($raw, "</body>", ($block + "`r`n</body>"), 1)
  }
  Set-Content -LiteralPath $p -Value $raw -Encoding UTF8 -NoNewline
  Write-Ok "Mount on $($kv.Key)"
}

# ---------------------------------------------------------------------------
# 9) sitemap hint (optional soft add)
# ---------------------------------------------------------------------------
$sitemap = Join-Path $WebsiteDir "sitemap.xml"
if (Test-Path $sitemap) {
  $sm = Get-Content -LiteralPath $sitemap -Raw -Encoding UTF8
  if ($sm -notmatch "mysky\.html") {
    Backup-File $sitemap
    $entry = @"

  <url>
    <loc>https://astroprecise.app/mysky.html</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
"@
    if ($sm -match "</urlset>") {
      $sm = $sm -replace "</urlset>", ($entry + "`r`n</urlset>")
      Set-Content -LiteralPath $sitemap -Value $sm -Encoding UTF8 -NoNewline
      Write-Ok "sitemap.xml + mysky.html"
    }
  }
}

# ---------------------------------------------------------------------------
# 10) Bump SW if present (optional soft touch)
# ---------------------------------------------------------------------------
$sw = Join-Path $WebsiteDir "sw.js"
if (Test-Path $sw) {
  $swRaw = Get-Content -LiteralPath $sw -Raw -Encoding UTF8
  if ($swRaw -match 'const V = "ap-v(\d+)"') {
    $n = [int]$Matches[1] + 1
    Backup-File $sw
    $swRaw2 = $swRaw -replace 'const V = "ap-v\d+"', "const V = `"ap-v$n`""
    # ensure new assets in precache if list is plain
    foreach ($asset in @("./mysky.html","./js/orrery-enhanced.js","./js/ap-cosmic-journey.js","./css/ap-cosmic-journey.css","./js/vendor/three.min.js")) {
      if ($swRaw2 -notmatch [regex]::Escape($asset)) {
        $swRaw2 = $swRaw2 -replace "(const PRECACHE = \[\r?\n)", "`$1  '$asset',`r`n"
      }
    }
    Set-Content -LiteralPath $sw -Value $swRaw2 -Encoding UTF8 -NoNewline
    Write-Ok "sw.js bumped to ap-v$n (+ precache entries if list style matched)"
  } else {
    Write-Warn "Could not auto-bump sw.js version — bump manually after testing"
  }
}

# ---------------------------------------------------------------------------
# DONE — instructions
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host " INSTALL COMPLETE" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "TEST LOCALLY" -ForegroundColor Cyan
Write-Host "  cd `"$WebsiteDir`""
Write-Host "  python -m http.server 8000"
Write-Host "  Open http://localhost:8000/mysky.html"
Write-Host "  Open http://localhost:8000/index.html"
Write-Host "  Open http://localhost:8000/horoscope.html  (Transit Explorer)"
Write-Host "  Drag orrery · Ctrl+scroll zoom"
Write-Host ""
Write-Host "WHAT CHANGED" -ForegroundColor Cyan
Write-Host "  NEW  website/js/orrery-enhanced.js     initOrrery(containerId)"
Write-Host "  NEW  website/js/vendor/three.min.js   (downloaded if missing)"
Write-Host "  NEW  website/css/ap-cosmic-journey.css"
Write-Host "  NEW  website/js/ap-cosmic-journey.js  journey bar + My Sky nav"
Write-Host "  NEW  website/mysky.html               central dashboard"
Write-Host "  PATCH index, horoscope, explore, chart, moment, ephemeris,"
Write-Host "        shop, + other major heads with three + enhanced + journey"
Write-Host "  PATCH sitemap.xml + sw.js version (best-effort)"
Write-Host "  BACKUP $BackupDir"
Write-Host ""
Write-Host "MANUAL STEPS YOU MAY STILL WANT" -ForegroundColor Yellow
Write-Host "  1. Hard-refresh browser / unregister old service worker."
Write-Host "  2. If three.min.js failed to download, place r160 UMD at:"
Write-Host "       $ThreePath"
Write-Host "  3. Production hero still uses orrery-webgl.js via orrery-loader."
Write-Host "     Enhanced mount is additive — remove legacy hero only after visual QA."
Write-Host "  4. Re-run tools/generate-sw-precache.mjs (if you use it) then bump SW."
Write-Host "  5. Align ?v= cache busters on CSS/JS links if you pin versions in HTML."
Write-Host "  6. Optional CSS tweaks: .ap-enhanced-orrery-host min-height per page;"
Write-Host "     hide duplicate journey bar if masthead already has spine nav."
Write-Host "  7. Commit + push website/** when satisfied for GitHub Pages deploy."
Write-Host "  8. Prefer port 8790 on this machine (atlas) over 8000 if 8000 conflicts:"
Write-Host "       npx --yes serve `"$WebsiteDir`" -l 8790"
Write-Host ""
Write-Host "API" -ForegroundColor Cyan
Write-Host "  initOrrery('my-div-id', { minHeight:'400px', autoRotate:true })"
Write-Host "  // or mark any div: <div id='x' data-orrery-enhanced></div>"
Write-Host ""

